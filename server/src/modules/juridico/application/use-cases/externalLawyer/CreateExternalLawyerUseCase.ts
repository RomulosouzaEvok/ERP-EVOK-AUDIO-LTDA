/**
 * `POST /api/jur/external-lawyers` — cadastra advogado externo (RF-JUR-013).
 *
 * @module modules/juridico/application/use-cases/externalLawyer/CreateExternalLawyerUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ExternalLawyerRepository from '../../../domain/repositories/ExternalLawyerRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { CreateExternalLawyerInput } from '../../../domain/entities/LegalCaseTypes';

class CreateExternalLawyerUseCase extends UseCase<CreateExternalLawyerInput, any> {
  private readonly repository: ExternalLawyerRepository;

  public constructor(repository: ExternalLawyerRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `full_name`/`oab_number` ausentes (400).
   * @throws {NotFoundError} `supplier_id` informado não existe (404).
   */
  public async execute(input: CreateExternalLawyerInput): Promise<any> {
    if (!input.full_name || !input.oab_number) {
      throw new ValidationError('full_name e oab_number são obrigatórios.');
    }
    if (input.supplier_id) {
      const { Supplier } = require('../../../../../models/index');
      const exists = await Supplier.findByPk(input.supplier_id);
      if (!exists) throw new NotFoundError(`Fornecedor ${input.supplier_id} não encontrado.`);
    }

    return this.repository.create({
      full_name: input.full_name,
      oab_number: input.oab_number,
      law_firm: input.law_firm ?? null,
      document: input.document ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      specialty: input.specialty ?? null,
      fee_terms: input.fee_terms ?? null,
      supplier_id: input.supplier_id ?? null,
      active: true,
    });
  }
}

export = CreateExternalLawyerUseCase;
