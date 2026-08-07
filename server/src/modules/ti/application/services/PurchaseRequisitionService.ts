/**
 * Interface de serviço para criação de Requisição de Compra a partir da
 * renovação de licença (RF-TI-030/BR-TI-015) — TI nunca compra fora do
 * fluxo de suprimentos. Implementada por `PurchaseRequisitionServiceAdapter`,
 * que delega 100% da regra de negócio ao módulo real
 * `/api/purchase-requisitions`.
 *
 * @module modules/ti/application/services/PurchaseRequisitionService
 */

class PurchaseRequisitionService {
  public async createRenewalRequisition(_input: { assetId: number; assetName: string; estimatedCost: number; justification: string; requesterId: number }): Promise<{ id: number }> {
    throw new Error('PurchaseRequisitionService.createRenewalRequisition não implementado.');
  }
}

export = PurchaseRequisitionService;
