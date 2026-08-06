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
 * Decisao deliberada (documentada em `docs/governance/HANDOFF_CODEX.md`): a entrada de
 * estoque reutiliza a infraestrutura ja testada de `InventoryService.receive`
 * (incrementa `Product.quantity` legado e cria `InventoryMovement`) e de
 * `CostingService.registerWeightedAverageCost` (atualiza `Product.cost_price`
 * por media ponderada), no mesmo padrao ja usado por
 * `ReceivePurchaseItemsUseCase`/`AwardRfqUseCase` — inclusive a mesma
 * exigencia de que exista um `Product` legado com `code = items.codigo`
 * (dual-system Product/Item ja documentado no projeto). O
 * `reference_type`/`source_type` gravados sao `'purchase'` (nao existe um
 * valor dedicado `'import'` nos ENUMs `inventory_movements.reference_type`/
 * `product_cost_ledgers.source_type`, e criar um exigiria alterar duas
 * tabelas de alto trafego compartilhadas por todo o ERP — fora do
 * territorio exclusivo deste modulo); a rastreabilidade fica preservada via
 * `reference_id`/`source_id` apontando para o `import_processes.id` e via
 * `description`/`notes` mencionando o numero do processo.
 *
 * NAO gera Conta a Pagar automaticamente: `AccountPayable` nao tem suporte
 * a moeda estrangeira e o UC-19 nao pede esse gatilho — fica registrado
 * como melhoria futura em `docs/governance/TODO.md`.
 *
 * @module modules/comex/application/use-cases/ReceiveImportProcessUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import ItemRepository from '../../../items/domain/repositories/ItemRepository';
import { recalculateImportProcessTaxes } from './recalculateImportProcessTaxes';

const InventoryService = require('../../../../services/inventoryService');
const CostingService = require('../../../../services/costingService');

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

    for (const item of recalculatedItems) {
      const itemId = String(item.item_id);
      const product = productByItemId.get(itemId);
      const quantity = parseFloat(item.quantity);
      const nationalizedUnitCost = parseFloat(item.nationalized_unit_cost || 0);

      const { product: receivedProduct } = await InventoryService.receive(product.id, quantity, input.userId, input.transaction, {
        description: `Nacionalizacao processo de importacao ${importProcess.process_number}`,
        referenceId: importProcess.id,
        referenceType: 'purchase',
      });

      await CostingService.registerWeightedAverageCost({
        product: receivedProduct,
        quantity,
        unitCost: nationalizedUnitCost,
        sourceType: 'purchase',
        sourceId: importProcess.id,
        userId: input.userId,
        notes: `Custo nacionalizado - processo de importacao ${importProcess.process_number}`,
      }, input.transaction);
    }

    await this.comexRepository.updateImportProcess(input.id, {
      status: 'received',
      received_at: new Date().toISOString().slice(0, 10),
    }, input.transaction);

    return this.comexRepository.findImportProcessById(input.id, input.transaction);
  }
}

export = ReceiveImportProcessUseCase;
