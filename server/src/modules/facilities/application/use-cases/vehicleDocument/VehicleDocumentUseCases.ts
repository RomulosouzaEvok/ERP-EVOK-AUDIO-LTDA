/**
 * Casos de uso de Documento de Veículo com Vencimento (RF-FAC-007 a 010),
 * cobrindo `GET/POST /api/facilities/vehicles/:assetId/documents`,
 * `POST .../documents/:docId/renew` e `.../release`.
 *
 * @module modules/facilities/application/use-cases/vehicleDocument/VehicleDocumentUseCases
 */

import UseCase from '../../../../../shared/application/UseCase';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../../../errors';
import VehicleDocumentRepository from '../../../domain/repositories/VehicleDocumentRepository';
import VehicleRepository from '../../../domain/repositories/VehicleRepository';

/** `GET /api/facilities/vehicles/:assetId/documents` — lista documentos de um veículo. */
export class ListVehicleDocumentsUseCase extends UseCase<{ assetId: number }, any[]> {
  constructor(private readonly documentRepository: VehicleDocumentRepository, private readonly vehicleRepository: VehicleRepository) {
    super();
  }

  async execute({ assetId }: { assetId: number }) {
    const vehicle = await this.vehicleRepository.findVehicleByAssetId(assetId);
    if (!vehicle) throw new NotFoundError('Veículo não encontrado.');
    return this.documentRepository.listByAsset(assetId);
  }
}

/** `POST /api/facilities/vehicles/:assetId/documents` — cadastra documento com vencimento. */
export class CreateVehicleDocumentUseCase extends UseCase<Record<string, any>, any> {
  constructor(private readonly documentRepository: VehicleDocumentRepository, private readonly vehicleRepository: VehicleRepository) {
    super();
  }

  /**
   * @throws {ValidationError} Se `doc_type` ausente, ou `valid_until` ausente sem `has_expiration:false`.
   * @throws {NotFoundError} Se `assetId` não corresponder a veículo cadastrado.
   */
  async execute(input: Record<string, any>) {
    const { asset_id, doc_type, valid_until, has_expiration } = input;
    if (!doc_type) throw new ValidationError('doc_type é obrigatório.');
    if (doc_type !== 'outro' && !valid_until) throw new ValidationError('valid_until é obrigatório, salvo doc_type=outro sem vencimento (has_expiration:false).');
    if (doc_type === 'outro' && !valid_until && has_expiration !== false) {
      throw new ValidationError('Para doc_type=outro sem vencimento, informe has_expiration:false explicitamente.');
    }

    const vehicle = await this.vehicleRepository.findVehicleByAssetId(asset_id);
    if (!vehicle) throw new NotFoundError('Veículo não encontrado.');

    return this.documentRepository.create({
      asset_id,
      doc_type,
      reference: input.reference ?? null,
      issuer: input.issuer ?? null,
      valid_until: valid_until ?? null,
      cost: input.cost ?? null,
      file_path: input.file_path ?? null,
      status: 'vigente',
      notes: input.notes ?? null,
    });
  }
}

/** `POST /api/facilities/vehicles/:assetId/documents/:docId/renew` — marca `renovado`, cria novo `vigente`. */
export class RenewVehicleDocumentUseCase extends UseCase<{ docId: number; valid_until: string; cost?: number; file_path?: string; reference?: string }, any> {
  constructor(private readonly documentRepository: VehicleDocumentRepository) {
    super();
  }

  async execute(input: { docId: number; valid_until: string; cost?: number; file_path?: string; reference?: string }) {
    const document = await this.documentRepository.findById(input.docId);
    if (!document) throw new NotFoundError('Documento não encontrado.');
    if (!input.valid_until) throw new ValidationError('valid_until é obrigatório para renovação.');

    await this.documentRepository.update(document.id, { status: 'renovado' });

    return this.documentRepository.create({
      asset_id: document.asset_id,
      doc_type: document.doc_type,
      reference: input.reference ?? document.reference,
      issuer: document.issuer,
      valid_until: input.valid_until,
      cost: input.cost ?? null,
      file_path: input.file_path ?? null,
      status: 'vigente',
    });
  }
}

/** `POST /api/facilities/vehicles/:assetId/documents/:docId/release` — libera saída com doc vencido (nível approve). */
export class ReleaseVehicleDocumentUseCase extends UseCase<{ docId: number; release_reason: string; releasedBy: number }, any> {
  constructor(private readonly documentRepository: VehicleDocumentRepository) {
    super();
  }

  /**
   * @throws {ValidationError} Se `release_reason` ausente.
   * @throws {BusinessRuleError} Se o documento não for `doc_type='seguro'` ou não estiver vencido.
   */
  async execute(input: { docId: number; release_reason: string; releasedBy: number }) {
    if (!input.release_reason) throw new ValidationError('release_reason é obrigatório.');

    const document = await this.documentRepository.findById(input.docId);
    if (!document) throw new NotFoundError('Documento não encontrado.');

    const isExpired = document.valid_until && new Date(document.valid_until) < new Date();
    if (document.doc_type !== 'seguro' || (document.status !== 'vencido' && !isExpired)) {
      throw new BusinessRuleError('Documento informado não é seguro vencido — nada a liberar.');
    }

    return this.documentRepository.update(document.id, {
      status: 'vencido',
      released_by: input.releasedBy,
      released_at: new Date(),
      notes: input.release_reason,
    });
  }
}
