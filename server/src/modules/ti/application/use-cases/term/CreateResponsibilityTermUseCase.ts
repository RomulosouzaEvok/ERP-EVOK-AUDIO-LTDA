/**
 * `POST /api/ti/responsibility-terms` — registra entrega de equipamento
 * (UC-50, RF-TI-017 a 019). Cria o termo `active` e atualiza
 * `Asset.responsible_id`/`location` na MESMA transação (RF-TI-018).
 *
 * @module modules/ti/application/use-cases/term/CreateResponsibilityTermUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ResponsibilityTermRepository from '../../../domain/repositories/ResponsibilityTermRepository';
import AssetLookupService from '../../../application/services/AssetLookupService';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from '../../../../../errors';
import type { CreateResponsibilityTermInput } from '../../../domain/entities/TermTypes';
import { toTermDTO } from '../../../infrastructure/mappers/TermMapper';

const { sequelize } = require('../../../../../config/database');

class CreateResponsibilityTermUseCase extends UseCase<CreateResponsibilityTermInput, any> {
  private readonly repository: ResponsibilityTermRepository;
  private readonly assetLookupService: AssetLookupService;

  public constructor(repository: ResponsibilityTermRepository, assetLookupService: AssetLookupService) {
    super();
    this.repository = repository;
    this.assetLookupService = assetLookupService;
  }

  /**
   * @throws {ValidationError} `asset_id`/`employee_id` ausentes, asset não é `asset_type='it'`, ou aceite físico sem upload (E3/UC-50).
   * @throws {NotFoundError} `asset_id`/`employee_id` não existem.
   * @throws {ConflictError} Já existe termo `active` para o asset (E1/BR-TI-010).
   */
  public async execute(input: CreateResponsibilityTermInput): Promise<any> {
    if (!input.asset_id || !input.employee_id) throw new ValidationError('asset_id e employee_id são obrigatórios.');
    if (input.acceptance_type === 'physical_signature' && !input.signed_document_path) {
      throw new BusinessRuleError('O upload do termo assinado é obrigatório quando acceptance_type="physical_signature".');
    }

    const asset = await this.assetLookupService.findById(input.asset_id);
    if (!asset) throw new NotFoundError(`Ativo ${input.asset_id} não encontrado.`);
    if (asset.asset_type !== 'it') {
      throw new ValidationError(`O ativo ${input.asset_id} não é do tipo "it" (equipamento de TI) — não é possível gerar termo de responsabilidade sobre ele.`);
    }

    const activeTerm = await this.repository.findActiveByAsset(input.asset_id);
    if (activeTerm) {
      throw new ConflictError(
        `Já existe um termo de responsabilidade ativo para este equipamento (funcionário #${activeTerm.employee_id}, desde ${new Date(activeTerm.delivered_at).toLocaleDateString('pt-BR')}). Registre a devolução do termo vigente antes de uma nova entrega.`,
      );
    }

    const sequence = (await this.repository.countAll()) + 1;
    const termNumber = `TERM-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

    const t = await sequelize.transaction();
    try {
      const created = await this.repository.create({
        term_number: termNumber,
        asset_id: input.asset_id,
        employee_id: input.employee_id,
        delivered_at: new Date(),
        delivered_by: input.deliveredBy,
        condition_on_delivery: input.condition_on_delivery ?? null,
        accessories: input.accessories ?? null,
        acceptance_type: input.acceptance_type,
        signed_document_path: input.signed_document_path ?? null,
        status: 'active',
      }, t);

      await this.assetLookupService.updateResponsible(input.asset_id, { responsible_id: input.employee_id }, t);
      await t.commit();

      return toTermDTO(await this.repository.findById(created.id));
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateResponsibilityTermUseCase;
