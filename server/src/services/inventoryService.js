/**
 * 📦 Service: InventoryService
 *
 * Ponto único de alteração de `Product.quantity`. Concentra toda a lógica
 * de baixa/entrada/ajuste/reserva de estoque para eliminar condições de
 * corrida (race conditions) entre operações concorrentes (ex.: duas vendas
 * simultâneas do mesmo produto).
 *
 * @module services/inventoryService
 *
 * @description
 * Regras de negócio aplicadas por este serviço:
 * 1. **Lock pessimista**: toda leitura de `Product` feita aqui usa
 *    `lock: transaction.LOCK.UPDATE` (equivalente a `SELECT ... FOR UPDATE`
 *    no MySQL/InnoDB), impedindo que duas transações concorrentes leiam o
 *    mesmo saldo "stale" e gerem estoque negativo.
 * 2. **Transação obrigatória**: nenhuma função aqui abre sua própria
 *    transação — a transação é sempre criada e commitada/revertida pelo
 *    controller/service chamador (`sequelize.transaction()`), garantindo
 *    que a baixa/entrada de estoque e o registro do `InventoryMovement`
 *    (e quaisquer outras escritas relacionadas, como itens de pedido)
 *    sejam atômicos.
 * 3. **`increment`/`decrement` em vez de `sequelize.literal`**: embora
 *    `sequelize.literal('quantity - X')` também gere SQL atômico no nível
 *    da instrução, ele não participa do lock pessimista já obtido pela
 *    leitura anterior e dificulta centralizar validação de negócio (estoque
 *    mínimo negativo, motivo do ajuste, etc.). Usar a instância travada +
 *    `increment`/`decrement` deixa a leitura e a escrita presas à mesma
 *    linha bloqueada, dentro da mesma transação.
 * 4. **Reserva de estoque (`reserve`/`releaseReservation`)**: o model
 *    `Product` ainda não possui a coluna `reserved_quantity` (isso está
 *    planejado para a Prioridade 5 do TODO.md — evolução de schema). Por
 *    isso, estas duas funções são "no-op defensivo" por enquanto: validam
 *    entrada e disponibilidade de estoque livre, mas não persistem reserva
 *    nenhuma. Quando a coluna existir, basta implementar o incremento real
 *    aqui, sem tocar nos chamadores.
 */

const { Product, InventoryMovement } = require('../models/index');

/**
 * Garante que uma quantidade seja um número finito e estritamente positivo.
 *
 * @param {*} quantity - Valor recebido do chamador (pode ser string, number, etc.)
 * @param {string} [fieldName='quantity'] - Nome do campo para a mensagem de erro
 * @returns {number} Quantidade convertida para `number`
 * @throws {Error} Com `statusCode: 400` se a quantidade não for um número finito > 0
 */
function assertPositiveQuantity(quantity, fieldName = 'quantity') {
  const qty = typeof quantity === 'number' ? quantity : parseFloat(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw Object.assign(
      new Error(`${fieldName} deve ser um número maior que zero`),
      { statusCode: 400 }
    );
  }
  return qty;
}

/**
 * Busca um produto travando a linha para escrita (`SELECT ... FOR UPDATE`)
 * dentro da transação informada. Deve ser usado por toda operação deste
 * serviço que for ler e depois escrever `quantity`.
 *
 * @param {number} productId - ID do produto
 * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
 * @returns {Promise<import('sequelize').Model>} Instância do `Product` travada
 * @throws {Error} Com `statusCode: 404` se o produto não existir
 * @throws {Error} Com `statusCode: 400` se `transaction` não for informada
 */
async function lockProduct(productId, transaction) {
  if (!transaction) {
    throw Object.assign(
      new Error('InventoryService: transaction é obrigatória para operações de estoque'),
      { statusCode: 500 }
    );
  }
  const product = await Product.findByPk(productId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!product) {
    throw Object.assign(new Error(`Produto ID ${productId} não encontrado`), { statusCode: 404 });
  }
  return product;
}

class InventoryService {
  /**
   * Reserva estoque para um produto (ex.: pedido de venda ainda não
   * confirmado, separação para produção).
   *
   * ATENÇÃO (dívida técnica planejada): o schema atual de `Product` não
   * possui a coluna `reserved_quantity` (ver TODO.md, Prioridade 5). Esta
   * função já valida negócio e trava a linha do produto, mas por ora não
   * persiste reserva nenhuma — apenas garante que existe estoque livre
   * suficiente no momento da chamada. Quando a coluna for adicionada,
   * troque o `return` final por um `product.increment('reserved_quantity', ...)`.
   *
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a reservar (deve ser > 0)
   * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
   * @returns {Promise<import('sequelize').Model>} Produto travado (não persiste reserva ainda)
   * @throws {Error} `statusCode: 404` se produto não existe
   * @throws {Error} `statusCode: 400` se quantidade inválida ou estoque insuficiente
   */
  static async reserve(productId, quantity, transaction) {
    const qty = assertPositiveQuantity(quantity, 'quantity');
    const product = await lockProduct(productId, transaction);

    if (product.quantity < qty) {
      throw Object.assign(
        new Error(`Estoque insuficiente para reservar ${product.name}. Disponível: ${product.quantity}`),
        { statusCode: 400 }
      );
    }

    // reserved_quantity ainda não existe no schema (Prioridade 5 do TODO.md).
    // Nenhuma escrita é feita aqui até a coluna ser criada.
    return product;
  }

  /**
   * Libera uma reserva de estoque previamente feita por `reserve`.
   *
   * ATENÇÃO (dívida técnica planejada): mesmo cenário de `reserve` — sem a
   * coluna `reserved_quantity` no schema, esta função apenas valida entrada
   * e retorna o produto travado, sem persistir nada. Ver TODO.md Prioridade 5.
   *
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a liberar da reserva (deve ser > 0)
   * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
   * @returns {Promise<import('sequelize').Model>} Produto travado (não altera reserva ainda)
   * @throws {Error} `statusCode: 404` se produto não existe
   * @throws {Error} `statusCode: 400` se quantidade inválida
   */
  static async releaseReservation(productId, quantity, transaction) {
    assertPositiveQuantity(quantity, 'quantity');
    const product = await lockProduct(productId, transaction);
    return product;
  }

  /**
   * Consome (baixa) estoque de um produto — usado em vendas, consumo de
   * componentes em ordens de produção, saídas manuais, etc.
   *
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a dar baixa (deve ser > 0)
   * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
   * @param {Object} [movementData] - Dados extras para o registro de `InventoryMovement`
   * @param {number} movementData.user_id - ID do usuário responsável pela movimentação
   * @param {string} [movementData.description] - Descrição da movimentação
   * @param {number} [movementData.reference_id] - ID da entidade de origem (venda, OP, etc.)
   * @param {'sale'|'purchase'|'production'|'adjustment'|'transfer'} [movementData.reference_type] - Tipo de origem
   * @param {number} [movementData.unit_cost] - Custo unitário no momento da baixa
   * @returns {Promise<{ product: import('sequelize').Model, movement: import('sequelize').Model }>}
   * @throws {Error} `statusCode: 404` se produto não existe
   * @throws {Error} `statusCode: 400` se quantidade inválida ou estoque insuficiente
   */
  static async consume(productId, quantity, transaction, movementData = {}) {
    const qty = assertPositiveQuantity(quantity, 'quantity');
    const product = await lockProduct(productId, transaction);

    if (product.quantity < qty) {
      throw Object.assign(
        new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}, solicitado: ${qty}`),
        { statusCode: 409 }
      );
    }

    await product.decrement('quantity', { by: qty, transaction });
    await product.reload({ transaction });

    const movement = await InventoryMovement.create({
      product_id: productId,
      user_id: movementData.user_id,
      type: 'out',
      quantity: qty,
      unit_cost: movementData.unit_cost || 0,
      description: movementData.description || null,
      reference_id: movementData.reference_id || null,
      reference_type: movementData.reference_type || null
    }, { transaction });

    return { product, movement };
  }

  /**
   * Recebe (dá entrada em) estoque de um produto — usado em recebimento de
   * compras, produção concluída, devoluções, etc.
   *
   * @param {number} productId - ID do produto
   * @param {number} quantity - Quantidade a somar ao estoque (deve ser > 0)
   * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
   * @param {Object} [movementData] - Dados extras para o registro de `InventoryMovement`
   * @param {number} movementData.user_id - ID do usuário responsável pela movimentação
   * @param {string} [movementData.description] - Descrição da movimentação
   * @param {number} [movementData.reference_id] - ID da entidade de origem (compra, OP, etc.)
   * @param {'sale'|'purchase'|'production'|'adjustment'|'transfer'} [movementData.reference_type] - Tipo de origem
   * @param {number} [movementData.unit_cost] - Custo unitário no momento da entrada
   * @returns {Promise<{ product: import('sequelize').Model, movement: import('sequelize').Model }>}
   * @throws {Error} `statusCode: 404` se produto não existe
   * @throws {Error} `statusCode: 400` se quantidade inválida
   */
  static async receive(productId, quantity, transaction, movementData = {}) {
    const qty = assertPositiveQuantity(quantity, 'quantity');
    const product = await lockProduct(productId, transaction);

    await product.increment('quantity', { by: qty, transaction });
    await product.reload({ transaction });

    const movement = await InventoryMovement.create({
      product_id: productId,
      user_id: movementData.user_id,
      type: 'in',
      quantity: qty,
      unit_cost: movementData.unit_cost || 0,
      description: movementData.description || null,
      reference_id: movementData.reference_id || null,
      reference_type: movementData.reference_type || null
    }, { transaction });

    return { product, movement };
  }

  /**
   * Ajusta estoque manualmente (entrada, saída ou ajuste de inventário),
   * usado por telas de movimentação manual/mobile onde o operador escolhe
   * explicitamente o tipo de movimento.
   *
   * @param {number} productId - ID do produto
   * @param {'in'|'out'|'adjustment'} type - Tipo de movimentação. `'adjustment'` é tratado
   *   como entrada (soma) por convenção — reflete correção de inventário para mais.
   *   Para correções para menos, use `type: 'out'`.
   * @param {number} quantity - Quantidade movimentada (deve ser > 0)
   * @param {string} reason - Motivo/descrição da movimentação (auditoria)
   * @param {import('sequelize').Transaction} transaction - Transação Sequelize ativa
   * @param {Object} [movementData] - Dados extras para o registro de `InventoryMovement`
   * @param {number} movementData.user_id - ID do usuário responsável pela movimentação
   * @param {number} [movementData.reference_id] - ID da entidade de origem
   * @param {'sale'|'purchase'|'production'|'adjustment'|'transfer'} [movementData.reference_type] - Tipo de origem
   * @returns {Promise<{ product: import('sequelize').Model, movement: import('sequelize').Model }>}
   * @throws {Error} `statusCode: 400` se `type` for inválido, quantidade inválida ou estoque insuficiente para saída
   * @throws {Error} `statusCode: 404` se produto não existe
   */
  static async adjust(productId, type, quantity, reason, transaction, movementData = {}) {
    if (!['in', 'out', 'adjustment'].includes(type)) {
      throw Object.assign(
        new Error(`Tipo de movimentação inválido: '${type}'. Use 'in', 'out' ou 'adjustment'`),
        { statusCode: 400 }
      );
    }

    const baseMovementData = {
      user_id: movementData.user_id,
      description: reason,
      reference_id: movementData.reference_id || null,
      reference_type: movementData.reference_type || 'adjustment'
    };

    if (type === 'out') {
      const { product, movement } = await this.consume(productId, quantity, transaction, baseMovementData);
      return { product, movement };
    }

    // 'in' e 'adjustment' são tratados como entrada de estoque, mas o
    // registro de InventoryMovement preserva o `type` original para
    // auditoria correta (ex.: distinguir entrada de compra de correção manual).
    const qty = assertPositiveQuantity(quantity, 'quantity');
    const product = await lockProduct(productId, transaction);

    await product.increment('quantity', { by: qty, transaction });
    await product.reload({ transaction });

    const movement = await InventoryMovement.create({
      product_id: productId,
      user_id: baseMovementData.user_id,
      type,
      quantity: qty,
      description: baseMovementData.description,
      reference_id: baseMovementData.reference_id,
      reference_type: baseMovementData.reference_type
    }, { transaction });

    return { product, movement };
  }
}

module.exports = InventoryService;
