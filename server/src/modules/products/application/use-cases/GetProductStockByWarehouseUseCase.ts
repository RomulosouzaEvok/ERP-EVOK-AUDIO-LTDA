const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');
import type { IProductRepository } from '../../domain/repositories/ProductRepository';

/**
 * Use case: saldo de UM produto específico, detalhado por depósito
 * (Bloco 4, docs/governance/TODO.md — pendência
 * `GET /api/products/:id/stock-by-warehouse`).
 *
 * Complementa `GET /api/inventory/warehouse-stock?product_id=` (que cobre o
 * mesmo caso de uso via query param, listando pares produto×depósito com
 * paginação) com uma rota aninhada dedicada, mais natural para a tela de
 * detalhe de um produto.
 *
 * DECISÃO DE PRODUTO (documentada aqui e em `docs/arquitetura/API.md`): a resposta
 * inclui TODOS os depósitos ativos, mesmo aqueles em que o produto não tem
 * nenhuma linha em `ProductWarehouseStock` (saldo tratado como `0`) — ao
 * contrário do backfill (que só cria linha para saldo > 0). Isso favorece a
 * UI (ex.: tela de transferência precisa mostrar os 3 depósitos disponíveis
 * como origem/destino, mesmo que o saldo atual em algum deles seja zero),
 * em vez de forçar o frontend a cruzar a lista de depósitos com a lista de
 * saldos para descobrir os que estão faltando.
 *
 * @module modules/products/application/use-cases/GetProductStockByWarehouseUseCase
 */
class GetProductStockByWarehouseUseCase extends UseCase {
  private productRepository: IProductRepository;

  /**
   * @param {IProductRepository} productRepository
   */
  constructor(productRepository: IProductRepository) {
    super();
    this.productRepository = productRepository;
  }

  /**
   * @param {Object} input
   * @param {number|string} input.id - ID do produto.
   * @returns {Promise<{ product: Object, warehouses: Array<{ warehouse_id: number, warehouse_code: string, warehouse_name: string, quantity: number }> }>}
   *   Produto (resumido) e saldo em cada depósito ativo (0 quando não houver linha).
   * @throws {NotFoundError} Se o produto não existir.
   */
  async execute({ id }: { id: number | string }) {
    const product = await this.productRepository.findById(id, { withCategory: false });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const warehouses = await this.productRepository.getWarehouseStockSummary(product.id);

    return {
      product: { id: product.id, code: product.code, name: product.name, quantity: product.quantity },
      warehouses,
    };
  }
}

module.exports = GetProductStockByWarehouseUseCase;
