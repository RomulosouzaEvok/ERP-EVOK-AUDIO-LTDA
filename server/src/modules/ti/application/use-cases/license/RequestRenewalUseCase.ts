/**
 * `POST /api/ti/licenses/:assetId/request-renewal` — gera Requisição de
 * Compra (renovação com custo) via `PurchaseRequisitionService`
 * (RF-TI-030/BR-TI-015, `ti:approve`).
 *
 * @module modules/ti/application/use-cases/license/RequestRenewalUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import PurchaseRequisitionService from '../../../application/services/PurchaseRequisitionService';
import { NotFoundError, ValidationError } from '../../../../../errors';
import type { RequestRenewalInput } from '../../../domain/entities/LicenseTypes';

class RequestRenewalUseCase extends UseCase<RequestRenewalInput, { purchase_requisition_id: number }> {
  private readonly repository: LicenseRepository;
  private readonly purchaseRequisitionService: PurchaseRequisitionService;

  public constructor(repository: LicenseRepository, purchaseRequisitionService: PurchaseRequisitionService) {
    super();
    this.repository = repository;
    this.purchaseRequisitionService = purchaseRequisitionService;
  }

  /**
   * @throws {ValidationError} `estimated_cost`/`justification` ausentes.
   * @throws {NotFoundError} Licença não encontrada.
   */
  public async execute({ assetId, estimated_cost, justification, requesterId }: RequestRenewalInput): Promise<{ purchase_requisition_id: number }> {
    if (!estimated_cost || !justification) throw new ValidationError('estimated_cost e justification são obrigatórios.');

    const detail = await this.repository.findByAssetId(assetId);
    if (!detail) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);

    const requisition = await this.purchaseRequisitionService.createRenewalRequisition({
      assetId,
      assetName: detail.asset?.name ?? String(assetId),
      estimatedCost: estimated_cost,
      justification,
      requesterId,
    });

    return { purchase_requisition_id: requisition.id };
  }
}

export = RequestRenewalUseCase;
