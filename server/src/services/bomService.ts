/**
 * 🧠 Service: BomService
 *
 * Motor de negócio para gestão de Estrutura de Produto (BOM).
 * Contém toda a lógica de explosão de BOM, cálculo de custos,
 * verificação de disponibilidade e geração de necessidades para o MRP.
 *
 * @module services/bomService
 *
 * @description
 * Este serviço implementa as regras de negócio complexas para:
 * 1. **Explosão de BOM**: Dado um produto e quantidade, lista todos os componentes necessários
 * 2. **Cálculo de Custo**: Calcula o custo total do produto baseado na BOM + perdas
 * 3. **Verificação de Disponibilidade**: Checa se há estoque suficiente dos componentes
 * 4. **Versões e Revisões**: Gerencia histórico de alterações de engenharia
 *
 * **Princípios SOLID aplicados:**
 * - SRP: Responsabilidade única de calcular/motrar BOM
 * - DIP: Depende de abstrações (models) não de implementações concretas
 * - OCP: Extensível via estratégias de cálculo de custo
 */

import type { Transaction } from 'sequelize';

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { BillOfMaterial, BillOfMaterialItem, Product } = require('../models/index');
const { roundQuantity } = require('../shared/utils/decimal');
// G7 (achado colateral): desconta do saldo de PLANEJAMENTO o material retido
// em quarentena/bloqueio — ver o cabeçalho de `quarantineBalanceService`.
const QuarantineBalanceService = require('./quarantineBalanceService');

const VALID_COMPONENT_TYPES = new Set(['raw_material', 'component', 'semi_finished', 'packaging', 'consumable', 'other']);

/**
 * `Product.product_type` (`finished`, `raw_material`, `component`, ...) e
 * `BillOfMaterialItem.component_type` são enums distintos e incompatíveis
 * (`finished` não existe em `component_type`). Usar o `product_type` do
 * componente como fallback só é seguro quando o valor também é um
 * `component_type` válido; caso contrário cai no default genérico
 * `'component'` em vez de deixar o INSERT quebrar com erro de enum.
 *
 * @param {string} productType - `product_type` do produto usado como componente.
 * @returns {string} Um `component_type` válido.
 */
function mapProductTypeToComponentType(productType: string): string {
  return VALID_COMPONENT_TYPES.has(productType) ? productType : 'component';
}

/** Item de entrada para {@link BomService.createBOM} (um componente da nova BOM). */
interface BomCreateItemInput {
  component_product_id: number | string;
  quantity: number | string;
  unit?: string;
  bom_level?: number;
  sequence_order?: number;
  component_type?: string;
  scrap_percentage?: number | string;
  notes?: string;
  alternative_product_id?: number | string | null;
  is_critical?: boolean;
  /**
   * G18 — como a explosao trata este componente quando ele tem BOM propria.
   *
   * `false` (padrao) = subconjunto **estocavel**: a explosao para nele e a OP
   * do pai reserva/consome/custeia a peca pronta. `true` = subconjunto
   * **fantasma**: a explosao desce e o pai consome os filhos dele.
   * Ver {@link BomService.explodeBOM}.
   */
  is_phantom?: boolean;
}

/** Payload de entrada para {@link BomService.createBOM}. */
interface BomCreateData {
  product_id: number | string;
  created_by?: number | string;
  items: BomCreateItemInput[];
  revision?: string;
  revision_notes?: string;
  notes?: string;
}

class BomService {

  // ======================================================================
  // CONSTANTES DE NEGÓCIO
  // ======================================================================

  static MAX_BOM_DEPTH = 10; // Profundidade máxima da árvore de BOM (evita loops infinitos)
  static UNITS_MAP = {
    'un': 'unidade',
    'g': 'gramas',
    'kg': 'quilogramas',
    'm': 'metros',
    'cm': 'centímetros',
    'l': 'litros',
    'ml': 'mililitros',
    'm2': 'metros quadrados'
  };

  // ======================================================================
  // MÉTODOS PRINCIPAIS DA BOM
  // ======================================================================

  /**
   * Cria uma nova BOM para um produto, com seus itens componentes.
   * 
   * @param {Object} bomData - Dados da BOM
   * @param {number} bomData.product_id - ID do produto acabado
   * @param {number} bomData.created_by - ID do usuário criador
   * @param {Array<Object>} bomData.items - Lista de itens componentes
   * @param {string} [bomData.revision] - Revisão da BOM (default: '00')
   * @param {string} [bomData.notes] - Observações técnicas
   * @returns {Promise<Object>} BOM completa com itens e custos calculados
   * 
   * @throws {Error} Se produto não existe
   * @throws {Error} Se items está vazio
   * @throws {Error} Se produto não é do tipo 'finished'
   * @throws {Error} Se componente não existe
   * 
   * @example
   * await BomService.createBOM({
   *   product_id: 1,
   *   created_by: 1,
   *   revision: '01',
   *   notes: 'Substituído imã por Neodímio',
   *   items: [
   *     { component_product_id: 10, quantity: 1, unit: 'un', bom_level: 1, component_type: 'component' },
   *     { component_product_id: 11, quantity: 1, unit: 'un', bom_level: 1 }
   *   ]
   * });
   */
  static async createBOM(bomData: BomCreateData) {
    const { product_id, created_by, items, revision, revision_notes, notes } = bomData;

    // Validações de negócio
    const product = await Product.findByPk(product_id);
    if (!product) {
      throw Object.assign(new Error(`Produto ID ${product_id} não encontrado`), { statusCode: 404 });
    }
    if (product.product_type !== 'finished') {
      throw Object.assign(
        new Error(`BOM só pode ser criada para produtos acabados (product_type='finished'). '${product.name}' é '${product.product_type}'`),
        { statusCode: 400 }
      );
    }
    if (!items || items.length === 0) {
      throw Object.assign(new Error('BOM deve ter pelo menos um item componente'), { statusCode: 400 });
    }

    // Valida se todos os componentes existem
    for (const item of items) {
      // G1: auto-referência direta (produto componente de si mesmo) é ciclo
      // de profundidade 1. `explodeBOM` já barrava isso, mas só na hora de
      // explodir — ou seja, a BOM entrava no banco e só quebrava depois, na
      // liberação/conclusão da OP. Barrar na escrita é mais barato e evita
      // que o produto fique com uma estrutura vigente inexplodível (que,
      // depois do G2, é produto que não conclui OP).
      if (String(item.component_product_id) === String(product_id)) {
        throw Object.assign(
          new Error(
            `O produto "${product.name}" não pode ser componente da própria estrutura. `
            + 'Isso é um ciclo: explodir a BOM entraria em recursão infinita.',
          ),
          { statusCode: 422, rule: 'G1-BOM-AUTO-REF' },
        );
      }

      const component = await Product.findByPk(item.component_product_id);
      if (!component) {
        throw Object.assign(new Error(`Componente ID ${item.component_product_id} não encontrado`), { statusCode: 404 });
      }
    }

    const newRevision = revision || '00';

    // G1 (ISO 9001 §8.5.6): a revisão identifica a versão da estrutura. Duas
    // revisões com o mesmo rótulo tornam impossível dizer contra qual delas
    // uma OP rodou — que é justamente o registro que a norma exige.
    const duplicatedRevision = await BillOfMaterial.findOne({
      where: { product_id, revision: newRevision, status: { [Op.ne]: 'inactive' } }
    });
    if (duplicatedRevision) {
      throw Object.assign(
        new Error(
          `Já existe a revisão "${newRevision}" da estrutura de "${product.name}" (BOM #${duplicatedRevision.id}). `
          + 'Informe uma revisão nova para a alteração de engenharia — é ela que identifica, depois, contra qual '
          + 'versão da estrutura cada ordem de produção rodou.',
        ),
        { statusCode: 409, rule: 'G1-BOM-REV-DUP' },
      );
    }

    // Cria BOM com os itens em transação.
    //
    // G1: o `superseded` da revisão anterior mora DENTRO da transação. Antes
    // ele rodava solto, antes dela: se a criação falhasse depois (componente
    // inválido, erro de enum, queda de conexão), o produto ficava com ZERO
    // BOM ativa — e, depois do G2, produto sem BOM ativa não conclui OP. Um
    // cadastro malsucedido derrubava a produção de um produto que estava
    // funcionando.
    const result = await sequelize.transaction(async (transaction: Transaction) => {
      await BillOfMaterial.update(
        { status: 'superseded' },
        { where: { product_id, status: 'active' }, transaction }
      );

      const bom = await BillOfMaterial.create({
        product_id,
        revision: newRevision,
        revision_notes: revision_notes || null,
        notes: notes || null,
        status: 'active',
        created_by,
        total_components: items.length
      }, { transaction });

      // Cria os itens
      const bomItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const component = await Product.findByPk(item.component_product_id, { transaction });
        
        const unitCost = parseFloat(component.cost_price || 0);
        const quantity = parseFloat(String(item.quantity)) || 1;
        const scrapPct = parseFloat(String(item.scrap_percentage)) || 0;
        const quantityWithScrap = quantity * (1 + scrapPct / 100);
        const totalCost = unitCost * quantityWithScrap;

        const bomItem = await BillOfMaterialItem.create({
          bom_id: bom.id,
          component_product_id: item.component_product_id,
          quantity,
          unit: item.unit || 'un',
          bom_level: item.bom_level || 1,
          sequence_order: item.sequence_order || i,
          component_type: item.component_type || mapProductTypeToComponentType(component.product_type),
          scrap_percentage: scrapPct,
          unit_cost: unitCost,
          total_cost: totalCost,
          notes: item.notes || null,
          alternative_product_id: item.alternative_product_id || null,
          is_critical: item.is_critical || false,
          // G18: sem valor informado, o componente e tratado como PECA
          // (estocavel). `false` explicito e nao `null`: a coluna e
          // `NOT NULL DEFAULT false`, e `null` explicito ANULA o default do
          // Postgres — classe de defeito catalogada em
          // docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md.
          is_phantom: item.is_phantom === true
        }, { transaction });

        bomItems.push(bomItem);
      }

      // Atualiza cache de custo total da BOM
      const totalCost = bomItems.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
      await bom.update({ total_cost: totalCost, total_components: bomItems.length }, { transaction });

      return { bom, items: bomItems };
    });

    return result;
  }

  /**
   * Explode a BOM e devolve a lista plana do que a produção precisa
   * efetivamente **consumir** para fabricar a quantidade pedida.
   *
   * ## Até onde a explosão desce (G18, 2026-08-10)
   *
   * A explosão **não** desce automaticamente em todo componente que tenha
   * estrutura própria. Quem manda é `is_phantom`, na linha da BOM do pai:
   *
   * - `is_phantom = false` (padrão) — **subconjunto estocável**: a explosão
   *   para nele. O componente entra na lista como peça, com o custo dele, e
   *   a OP do pai reserva, consome e custeia a peça pronta. É o caso do
   *   **REPARO** da Evok (conjunto móvel vendido no balcão e também montado
   *   dentro do alto-falante): ele tem saldo, preço e NF-e próprios, então
   *   produzir um alto-falante tem de **baixar o estoque de reparo**.
   * - `is_phantom = true` — **subconjunto fantasma**: a explosão desce e o
   *   pai consome os filhos. Serve para agrupamento de engenharia que não
   *   existe fisicamente e nunca tem saldo.
   *
   * Consequência prática: `total_cost` de um pai com subconjunto estocável
   * usa o `cost_price` do subconjunto (que já carrega material +
   * mão-de-obra + overhead da OP dele), e **não** a soma das matérias-primas
   * dele. Não há dupla contagem — o subconjunto entra uma vez, como peça.
   *
   * Esta explosão é a mesma que governa reserva na liberação da OP
   * (`reserveMaterials`), consumo/baixa de lote e custeio na conclusão
   * (`ChangeProductionOrderStatusUseCase`). Mudar a regra aqui muda os três.
   *
   * ## A visão de engenharia (multinível) continua existindo
   *
   * `options.throughSubassemblies = true` força a descida em TODO componente
   * com estrutura própria, inclusive os estocáveis. É a lista "indentada"
   * clássica: serve para ver a árvore inteira (o alto-falante até cone,
   * bobina, aranha e suspensão) e para custeio a partir de matéria-prima.
   * **Não é o que a produção consome** — a OP usa sempre o padrão (`false`),
   * senão o estoque de reparo nunca seria baixado.
   *
   * @param {number} productId - ID do produto acabado
   * @param {number} quantity - Quantidade desejada
   * @param {Object} [options] - Opções de explosão
   * @param {number} [options.maxDepth=10] - Profundidade máxima
   * @param {boolean} [options.includeCost=true] - Se deve incluir custos
   * @param {boolean} [options.throughSubassemblies=false] - Visão de engenharia:
   *   desce também nos subconjuntos estocáveis (`is_phantom = false`)
   * @returns {Promise<Object>} BOM explodida (`components` traz `is_subassembly`
   *   e `sub_bom_id` para distinguir peça simples de subconjunto estocável)
   *
   * @example
   * // Para produzir 1000 alto-falantes 12":
   * await BomService.explodeBOM(1, 1000);
   * // Retorna: { totalComponents: [...], summary: { ... } }
   */
  static async explodeBOM(productId: number | string, quantity: number, options: any = {}) {
    const maxDepth = options.maxDepth || this.MAX_BOM_DEPTH;
    const includeCost = options.includeCost !== false;
    // G18: visão de engenharia (multinível). Só `true` explícito liga —
    // qualquer outro valor mantém a explosão de PRODUÇÃO, que é a que
    // reserva, consome e custeia.
    const throughSubassemblies = options.throughSubassemblies === true;

    // Busca a BOM ativa do produto
    const bom = await BillOfMaterial.findOne({
      where: { product_id: productId, status: 'active' },
      include: [{
        model: BillOfMaterialItem,
        as: 'items',
        order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
      }]
    });

    if (!bom) {
      throw Object.assign(
        new Error(`Produto ID ${productId} não possui BOM ativa. Crie uma BOM primeiro.`),
        { statusCode: 404 }
      );
    }

    const componentMap = new Map<string, Record<string, any>>();
    const errors: string[] = [];
    let totalCost = 0;

    // Caminho de ancestrais (ids de produto) da recursão atual, usado para
    // detectar ciclo real na BOM (ex.: A depende de B que depende de A),
    // e não apenas estourar a profundidade máxima silenciosamente.
    const ancestorPath = new Set([productId]);

    // Função recursiva para explodir BOM
    const explodeLevel = async (items: any[], level: number, parentQty: number) => {
      if (level > maxDepth) {
        throw Object.assign(
          new Error(`Profundidade máxima (${maxDepth}) excedida ao explodir a BOM do produto ID ${productId}. Possível ciclo não detectado pela checagem de ancestrais.`),
          { statusCode: 422 }
        );
      }

      for (const item of items) {
        const totalQty = parseFloat(item.quantity) * parentQty;
        const scrapMultiplier = 1 + (parseFloat(item.scrap_percentage || 0) / 100);
        const netQty = roundQuantity(totalQty * scrapMultiplier);

        const component = await Product.findByPk(item.component_product_id);
        if (!component) {
          errors.push(`Componente ID ${item.component_product_id} não encontrado`);
          continue;
        }

        if (ancestorPath.has(item.component_product_id)) {
          throw Object.assign(
            new Error(`Ciclo detectado na BOM: o componente "${component.name}" (ID ${item.component_product_id}) é ancestral de si mesmo na árvore de estrutura do produto ID ${productId}.`),
            { statusCode: 422 }
          );
        }

        // Verifica se este componente tem sua própria BOM (subconjunto)
        const subBOM = await BillOfMaterial.findOne({
          where: { product_id: item.component_product_id, status: 'active' }
        });

        // G18 — subconjunto ESTOCÁVEL x subconjunto FANTASMA.
        //
        // Ter BOM própria NÃO basta para decidir se a explosão desce. Quem
        // decide é a linha da BOM do pai (`is_phantom`):
        //
        // | `is_phantom` | Significado | O que a OP do pai faz |
        // |---|---|---|
        // | `false` (padrão) | subconjunto **estocável** (tem saldo próprio, é vendido e/ou produzido por OP própria) | reserva, consome e custeia a **peça pronta** |
        // | `true` | subconjunto **fantasma** (agrupamento de engenharia, não existe fisicamente) | desce e consome os **filhos** dele |
        //
        // Antes disso a descida era incondicional, e o efeito real na fábrica
        // era grave: o REPARO (conjunto móvel que a Evok vende no balcão E
        // monta no alto-falante) era atravessado, a OP do alto-falante
        // consumia cone/bobina/aranha/suspensão direto, o **estoque de reparo
        // nunca era baixado** e o custo do alto-falante perdia a mão-de-obra e
        // o overhead da OP do reparo.
        const explodeIntoSubBom = subBOM && (item.is_phantom === true || throughSubassemblies);

        if (item.is_phantom === true && !subBOM) {
          // Cadastro contraditório: marcado como fantasma, mas não há o que
          // explodir. Vira folha (comportamento seguro) e o problema aparece
          // no `errors` da resposta em vez de sumir.
          errors.push(
            `Componente "${component.name}" (ID ${item.component_product_id}) está marcado como fantasma `
            + 'na estrutura, mas não tem BOM ativa própria para explodir. Foi tratado como peça.'
          );
        }

        if (explodeIntoSubBom) {
          // Componente fantasma com sub-BOM → explodir recursivamente
          const subItems = await BillOfMaterialItem.findAll({
            where: { bom_id: subBOM.id },
            order: [['bom_level', 'ASC'], ['sequence_order', 'ASC']]
          });
          ancestorPath.add(item.component_product_id);
          try {
            await explodeLevel(subItems, level + 1, netQty);
          } finally {
            ancestorPath.delete(item.component_product_id);
          }
        } else {
          // Componente folha (matéria-prima ou componente simples)
          const key = `${item.component_product_id}`;
          if (componentMap.has(key)) {
            // Seguro: acabamos de confirmar a existência da chave com `.has(key)` acima.
            const existing = componentMap.get(key)!;
            existing.quantity += netQty;
            existing.total_cost = existing.quantity * existing.unit_cost;
          } else {
            const unitCost = includeCost ? parseFloat(component.cost_price || 0) : 0;
            const itemCost = unitCost * netQty;
            totalCost += itemCost;

            componentMap.set(key, {
              component_id: component.id,
              component_name: component.name,
              component_code: component.code,
              component_type: item.component_type || component.product_type,
              unit: item.unit,
              quantity: netQty,
              unit_cost: unitCost,
              total_cost: itemCost,
              scrap_percentage: parseFloat(item.scrap_percentage || 0),
              stock_available: parseFloat(component.quantity || 0),
              stock_minimum: parseFloat(component.min_quantity || 0),
              is_critical: item.is_critical,
              // G18: expõe para quem lê a explosão (tela, OP, custeio) que
              // este componente é um subconjunto ESTOCÁVEL — tem estrutura
              // própria, mas foi consumido como peça pronta. Sem isso, um
              // reparo e um parafuso ficam indistinguíveis na resposta.
              is_subassembly: !!subBOM,
              sub_bom_id: subBOM ? subBOM.id : null,
              bom_level: level,
              notes: item.notes
            });
          }
        }
      }
    };

    // Inicia a explosão a partir dos itens de nível 1
    await explodeLevel(bom.items, 1, quantity);

    const components = Array.from(componentMap.values());

    // G7 (achado colateral) — a quarentena deixa de ser decorativa aqui.
    // `stock_available` vinha de `products.quantity`, que já inclui o
    // material recebido e AINDA NÃO INSPECIONADO (o recebimento incrementa o
    // saldo e cria o lote em `quarantine` no mesmo passo). Resultado: a
    // criação/liberação de OP aprovava contra material que o FEFO da
    // produção — que só consome lote `available` — nunca conseguiria
    // consumir, e a falha só aparecia lá na frente, na conclusão da OP.
    // Agora o número desconta o que está retido em quarentena/bloqueio, e o
    // bruto continua exposto em `stock_physical` para a tela poder explicar
    // a diferença ao usuário em vez de só recusar.
    const withheldByProduct = await QuarantineBalanceService.sumWithheldByProduct(
      components.map((component: any) => component.component_id)
    );
    for (const component of components) {
      const withheld = withheldByProduct.get(Number(component.component_id)) ?? 0;
      component.stock_physical = component.stock_available;
      component.stock_quality_withheld = withheld;
      component.stock_available = QuarantineBalanceService.planningQuantity(component.stock_physical, withheld);
    }

    const totalComponents = components.length;
    const totalQuantityNeeded = roundQuantity(components.reduce((sum, c) => sum + c.quantity, 0));

    return {
      bom_id: bom.id,
      product_id: productId,
      product_name: (await Product.findByPk(productId))?.name || 'N/A',
      requested_quantity: quantity,
      // G18: diz ao leitor QUAL das duas visões ele recebeu. Sem isso, um
      // custo de R$ 58,50 (matéria-prima) e um de R$ 62,10 (com o reparo já
      // custeado) são indistinguíveis na resposta.
      exploded_through_subassemblies: throughSubassemblies,
      total_cost: totalCost,
      total_components: totalComponents,
      total_quantity: totalQuantityNeeded,
      errors: errors.length > 0 ? errors : undefined,
      components,
      summary: {
        by_type: this._groupBy(components, 'component_type'),
        low_stock_items: components.filter(c => c.stock_available < c.quantity),
        critical_items: components.filter(c => c.is_critical)
      }
    };
  }

  /**
   * Calcula o custo total de um produto baseado na BOM ativa.
   * 
   @param {number} productId - ID do produto acabado
   * @param {number} [quantity=1] - Quantidade para calcular (default: 1 = custo unitário)
   * @returns {Promise<Object>} Detalhamento do custo
   * 
   * @example
   * await BomService.calculateCost(1);
   * // Retorna: { total_cost: 85.50, items: [...], summary: { materials: 75.00, labor: 10.50 } }
   */
  static async calculateCost(productId: number | string, quantity = 1) {
    const explosion = await this.explodeBOM(productId, quantity, { includeCost: true });

    const byType: Record<string, number> = {
      raw_material: 0,
      component: 0,
      semi_finished: 0,
      packaging: 0,
      consumable: 0,
      other: 0
    };

    explosion.components.forEach((c: any) => {
      const type: string = c.component_type || 'other';
      if (byType[type] !== undefined) {
        byType[type] += c.total_cost;
      } else {
        byType.other += c.total_cost;
      }
    });

    return {
      product_id: explosion.product_id,
      product_name: explosion.product_name,
      quantity,
      unit_cost: quantity > 0 ? explosion.total_cost / quantity : 0,
      total_cost: explosion.total_cost,
      cost_breakdown: byType,
      components: explosion.components
    };
  }

  /**
   * Verifica se há estoque suficiente para produzir uma determinada quantidade.
   * 
   * @param {number} productId - ID do produto acabado
   * @param {number} quantity - Quantidade desejada
   * @returns {Promise<Object>} Status de disponibilidade com detalhes
   * 
   * @example
   * await BomService.checkAvailability(1, 500);
   * // Retorna: { available: false, missing_items: [...], can_produce: 320 }
   */
  static async checkAvailability(productId: number | string, quantity: number) {
    const explosion = await this.explodeBOM(productId, quantity, { includeCost: false });

    const missingItems: Record<string, any>[] = [];
    let maxPossible = Infinity;

    explosion.components.forEach((comp: any) => {
      const needed = comp.quantity;
      const available = comp.stock_available;
      
      if (available < needed) {
        missingItems.push({
          component_id: comp.component_id,
          component_name: comp.component_name,
          component_code: comp.component_code,
          needed,
          available,
          deficit: needed - available,
          suggestion: `Comprar ${(needed - available).toFixed(2)} ${comp.unit}`
        });

        // Calcula o máximo que pode ser produzido baseado neste item
        const possible = Math.floor(available / (comp.quantity / quantity));
        if (possible < maxPossible) {
          maxPossible = possible;
        }
      }
    });

    return {
      product_id: explosion.product_id,
      product_name: explosion.product_name,
      requested_quantity: quantity,
      available: missingItems.length === 0,
      max_possible_quantity: maxPossible === Infinity ? quantity : maxPossible,
      total_components_checked: explosion.total_components,
      missing_items: missingItems,
      low_stock_items: explosion.components.filter(c => c.stock_available < c.stock_minimum * quantity)
    };
  }

  // ======================================================================
  // MÉTODOS AUXILIARES
  // ======================================================================

  /**
   * Agrupa um array por uma chave.
   * @private
   */
  static _groupBy(array: any[], key: string) {
    const result: Record<string, number> = {};
    array.forEach((item) => {
      const value = item[key] || 'unknown';
      if (!result[value]) result[value] = 0;
      result[value]++;
    });
    return result;
  }

  /**
   * Obtém a árvore hierárquica completa de uma BOM para visualização.
   * 
   * @param {number} bomId - ID da BOM
   * @returns {Promise<Object>} Árvore estruturada com níveis
   */
  static async getBOMTree(bomId: number | string) {
    const bom = await BillOfMaterial.findByPk(bomId, {
      include: [{
        model: BillOfMaterialItem,
        as: 'items',
        include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'code', 'product_type'] }]
      }]
    });

    if (!bom) {
      throw Object.assign(new Error(`BOM ID ${bomId} não encontrada`), { statusCode: 404 });
    }

    // Constrói árvore hierárquica. Protegida contra ciclo/profundidade
    // excessiva em `parent_item_id` (mesma defesa de `explodeBOM`) — sem
    // isso, um dado corrompido (ex.: item apontando para um descendente
    // dele mesmo) causaria recursão infinita e derrubaria o processo.
    const visitedItemIds = new Set<number>();
    const buildTree = (parentId = null, depth = 0) => {
      if (depth > this.MAX_BOM_DEPTH) {
        throw Object.assign(new Error(`Árvore da BOM ${bomId} excede a profundidade máxima permitida (${this.MAX_BOM_DEPTH}) — possível ciclo em parent_item_id.`), { statusCode: 422 });
      }

      const children = bom.items
        .filter((item: any) => item.parent_item_id === parentId)
        .sort((a: any, b: any) => a.sequence_order - b.sequence_order);

      return children.map((item: any) => {
        if (visitedItemIds.has(item.id)) {
          throw Object.assign(new Error(`Ciclo detectado na árvore da BOM ${bomId} no item #${item.id}.`), { statusCode: 422 });
        }
        visitedItemIds.add(item.id);

        return {
          id: item.id,
          component: item.componentProduct ?
            { id: item.componentProduct.id, name: item.componentProduct.name, code: item.componentProduct.code, type: item.componentProduct.product_type }
            : { id: item.component_product_id },
          quantity: item.quantity,
          unit: item.unit,
          level: item.bom_level,
          scrap: item.scrap_percentage,
          cost: item.total_cost,
          notes: item.notes,
          children: buildTree(item.id, depth + 1)
        };
      });
    };

    return {
      bom,
      tree: buildTree(null)
    };
  }
}

module.exports = BomService;




