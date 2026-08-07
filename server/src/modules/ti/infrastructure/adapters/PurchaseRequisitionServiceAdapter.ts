/**
 * Adapter de `PurchaseRequisitionService` — delega 100% da regra de
 * negócio de requisição ao módulo real `/api/purchase-requisitions`
 * (`CreatePurchaseRequisitionUseCase`), sem duplicar validação
 * (BR-TI-015, CLAUDE.md §7 — Requisição de Compra como origem única da
 * cadeia de suprimentos). A renovação de licença não referencia
 * `item_id` (não é material de estoque) — nasce sem itens, apenas com a
 * justificativa/asset referenciados em `notes`.
 *
 * @module modules/ti/infrastructure/adapters/PurchaseRequisitionServiceAdapter
 */

import PurchaseRequisitionService from '../../application/services/PurchaseRequisitionService';

const SequelizePurchaseRequisitionRepository = require('../../../purchaseRequisitions/infrastructure/sequelize/SequelizePurchaseRequisitionRepository');
const SequelizeItemRepository = require('../../../items/infrastructure/sequelize/SequelizeItemRepository');
const CreatePurchaseRequisitionUseCase = require('../../../purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase');

class PurchaseRequisitionServiceAdapter extends PurchaseRequisitionService {
  private readonly requisitionRepository = new SequelizePurchaseRequisitionRepository();
  private readonly itemRepository = new SequelizeItemRepository();

  public async createRenewalRequisition(input: { assetId: number; assetName: string; estimatedCost: number; justification: string; requesterId: number }): Promise<{ id: number }> {
    const useCase = new CreatePurchaseRequisitionUseCase(this.requisitionRepository, this.itemRepository);
    const requisition = await useCase.execute({
      requester_id: input.requesterId,
      origin: 'manual',
      priority: 'normal',
      notes: `Renovação de licença de TI — ativo #${input.assetId} (${input.assetName}). Custo estimado: ${input.estimatedCost}. Justificativa: ${input.justification}`,
      items: [],
    });
    return { id: requisition.id };
  }
}

export = PurchaseRequisitionServiceAdapter;
