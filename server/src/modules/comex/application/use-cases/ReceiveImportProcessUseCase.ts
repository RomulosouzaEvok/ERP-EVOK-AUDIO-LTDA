/**
 * Caso de uso para dar entrada em estoque de um processo de importacao ja
 * desembaracado (UC-19, passo 6: "Apos recebimento, da entrada no estoque
 * com custo nacionalizado").
 *
 * Antes de dar entrada, recalcula os tributos/custo nacionalizado de todos
 * os itens (ver {@link recalculateImportProcessTaxes}), para garantir que o
 * custo aplicado reflita os dados mais recentes do processo (cambio,
 * frete, seguro, despesas), mesmo que o ultimo acompanhamento nao tenha
 * trazido atualizacao monetaria.
 *
 * ## Gap G14 — a importacao entrava fora do padrao de rastreabilidade
 *
 * Ate 2026-08-09 esta entrada era uma versao DEGRADADA do recebimento de
 * compra: mexia em `products.quantity` e no custo medio, mas **nao criava
 * lote, nao passava por quarentena e nao fazia o dual-write de deposito**.
 * Na pratica, insumo importado entrava no estoque sem rastreabilidade por
 * lote e sem gate de qualidade — e podia ser consumido pela producao sem
 * nunca ter sido liberado por ninguem, enquanto o mesmo insumo comprado no
 * Brasil ficava retido em quarentena.
 *
 * A correcao NAO duplicou a logica do recebimento de compra: os dois
 * caminhos passaram a chamar `materialReceiptService.receiveMaterialIntoQuarantine`,
 * que executa a sequencia unica (estoque -> deposito -> lote em quarentena ->
 * custo real). Ver o cabecalho daquele modulo para a tabela do "antes".
 *
 * ## Deposito de destino
 *
 * Sempre `INSUMOS`. O endpoint de recebimento de importacao nao tem corpo
 * (`POST .../:id/receive` sem body) e nao foi ampliado aqui de proposito —
 * importacao neste ERP e de materia-prima/componente. Se um dia entrar
 * produto acabado importado para revenda, o caminho e acrescentar
 * `warehouse_code` ao validator, exatamente como ja existe em
 * `ReceivePurchaseItemsUseCase`.
 *
 * ## Numero do lote
 *
 * Gerado como `<numero do processo>-ITEM<id do item>-R001` (ex.:
 * `IMP-2026-0001-ITEM10-R001`). O par (processo, item) e unico no banco,
 * entao o numero nunca colide com o indice unico `(product_id, lot_number)`
 * de `lot_controls`. Nao ha campo de "lote do fornecedor" no processo de
 * importacao — quando existir, ele deve prevalecer sobre o gerado, igual ao
 * `lot_number` opcional do recebimento de compra.
 *
 * ## Rastro da origem (`reference_type`)
 *
 * Grava `'import'` em `inventory_movements.reference_type` e em
 * `product_cost_ledgers.source_type`, com `reference_id`/`source_id`
 * apontando para `import_processes.id`. Ate 2026-08-09 gravava `'purchase'`
 * por falta de valor no ENUM, o que era **dado factualmente errado**: quem
 * auditasse a movimentacao pelo par (`reference_type`, `reference_id`) cairia
 * num pedido de compra alheio, de id coincidente. O valor novo entra pela
 * migration `20260809-000027` (ver nota de deploy no arquivo dela).
 *
 * ## Pendencia declarada (ligada ao G13, Onda 3)
 *
 * NAO gera Conta a Pagar dos tributos de importacao. Isso nao e esquecimento:
 * o momento de reconhecimento do passivo e a decisao em aberto do **G13**
 * (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`, Onda 3), que
 * vale para compra nacional e importacao ao mesmo tempo — implementar aqui
 * uma regra propria criaria um segundo padrao contabil dentro do mesmo ERP,
 * que teria de ser desfeito depois. Some-se a isso que `AccountPayable` nao
 * suporta moeda estrangeira e que os tributos de importacao tem recolhimentos
 * com fatos geradores e vencimentos distintos entre si (II/IPI/PIS/COFINS no
 * desembaraco, ICMS conforme a UF).
 *
 * @module modules/comex/application/use-cases/ReceiveImportProcessUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import { recalculateImportProcessTaxes } from './recalculateImportProcessTaxes';

const WarehouseStockService = require('../../../../services/warehouseStockService');
const MaterialReceiptService = require('../../../../services/materialReceiptService');

/** Deposito de destino do material importado (ver secao "Deposito de destino"). */
const IMPORT_WAREHOUSE_CODE = 'INSUMOS';

/**
 * Origem gravada no rastro de estoque/custo. Valor do ENUM
 * `enum_inventory_movements_reference_type` / `enum_product_cost_ledgers_source_type`
 * adicionado pela migration `20260809-000027` — conferido contra ela.
 */
const IMPORT_REFERENCE_TYPE = 'import';

interface ReceiveImportProcessInput {
  id: number;
  userId: number;
  transaction: any;
}

class ReceiveImportProcessUseCase extends UseCase<ReceiveImportProcessInput, any> {
  private readonly comexRepository: ComexRepository;
  private readonly itemRepository: ItemRepository;

  public constructor(comexRepository: ComexRepository, itemRepository: ItemRepository) {
    super();
    this.comexRepository = comexRepository;
    this.itemRepository = itemRepository;
  }

  /**
   * @param input - Id do processo, id do usuario logado e a transacao ativa.
   * @returns O processo recebido, com itens atualizados (custo nacionalizado final).
   * @throws {NotFoundError} Se o processo nao existir.
   * @throws {BusinessRuleError} Se o processo nao estiver `customs_cleared` (422), ou se algum item nao tiver produto legado correspondente (`items.codigo` sem `products.code`).
   */
  public async execute(input: ReceiveImportProcessInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessByIdForUpdate(input.id, input.transaction);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }

    if (importProcess.status !== 'customs_cleared') {
      throw new BusinessRuleError(
        `Processo precisa estar desembaracado ("customs_cleared") para dar entrada em estoque (status atual: ${importProcess.status}).`,
        { current_status: importProcess.status },
      );
    }

    const recalculatedItems = await recalculateImportProcessTaxes(this.comexRepository, importProcess, input.transaction);

    // Resolve product_id legado (products.code = items.codigo) para cada item.
    const missingItemIds: string[] = [];
    const productByItemId = new Map<string, any>();
    for (const item of recalculatedItems) {
      const itemId = String(item.item_id);
      if (productByItemId.has(itemId)) continue;

      const product = await this.itemRepository.findLegacyProductByItemId(itemId);
      if (!product) {
        missingItemIds.push(itemId);
        continue;
      }
      productByItemId.set(itemId, product);
    }
    if (missingItemIds.length > 0) {
      throw new BusinessRuleError(
        `Cadastre o produto correspondente para os itens ausentes em products: ${missingItemIds.join(', ')}.`,
        { missing_item_ids: missingItemIds },
      );
    }

    // Deposito resolvido UMA vez para todo o processo (mesmo padrao do
    // recebimento de compra).
    const warehouse = await WarehouseStockService.getWarehouseByCode(IMPORT_WAREHOUSE_CODE, input.transaction);

    // Data de entrada do lote: o desembaraco e o fato que libera a mercadoria
    // para o estoque; sem ele (processo antigo sem data), cai para hoje.
    const receivedAt = importProcess.customs_cleared_at || new Date();

    for (const item of recalculatedItems) {
      const itemId = String(item.item_id);
      const product = productByItemId.get(itemId);
      const quantity = parseFloat(item.quantity);
      const nationalizedUnitCost = parseFloat(item.nationalized_unit_cost || 0);

      const lotNumber = MaterialReceiptService.buildGeneratedLotNumber(importProcess.process_number, item.id, 1);

      // G14: MESMA funcao usada por ReceivePurchaseItemsUseCase — estoque +
      // dual-write de deposito + lote nascendo em QUARENTENA (bloqueado para
      // consumo ate a inspecao de recebimento liberar) + custo nacionalizado.
      await MaterialReceiptService.receiveMaterialIntoQuarantine({
        productId: product.id,
        quantity,
        unitCost: nationalizedUnitCost,
        userId: input.userId,
        warehouseId: warehouse.id,
        lotNumber,
        // `purchase_id` fica NULL neste caminho (nao ha pedido de compra
        // nacional por tras), entao a chave de busca do lote e o par que o
        // indice unico de `lot_controls` ja garante.
        lotLookup: { product_id: product.id, lot_number: lotNumber },
        lotOwnership: { supplier_id: importProcess.supplier_id, purchase_id: null },
        lotDates: { receivedAt },
        defaultLotNotes: `Importacao ${importProcess.process_number} (custo nacionalizado)`,
        movement: {
          description: `Nacionalizacao processo de importacao ${importProcess.process_number}`,
          referenceId: importProcess.id,
          referenceType: IMPORT_REFERENCE_TYPE,
        },
        costing: {
          sourceType: IMPORT_REFERENCE_TYPE,
          sourceId: importProcess.id,
          notes: `Custo nacionalizado - processo de importacao ${importProcess.process_number}`,
        },
        lotGateway: this.comexRepository,
        transaction: input.transaction,
      });
    }

    await this.comexRepository.updateImportProcess(input.id, {
      status: 'received',
      received_at: new Date().toISOString().slice(0, 10),
    }, input.transaction);

    return this.comexRepository.findImportProcessById(input.id, input.transaction);
  }
}

export = ReceiveImportProcessUseCase;
