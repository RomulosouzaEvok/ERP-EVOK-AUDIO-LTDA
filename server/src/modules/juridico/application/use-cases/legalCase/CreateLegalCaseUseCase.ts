/**
 * `POST /api/jur/legal-cases` — cadastra processo judicial/administrativo
 * (RF-JUR-012). Parte contrária: no máximo UMA das 3 FKs opcionais
 * preenchida (CHECK de banco reforça), ou `opposing_party_name` livre.
 *
 * @module modules/juridico/application/use-cases/legalCase/CreateLegalCaseUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalCaseRepository from '../../../domain/repositories/LegalCaseRepository';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from '../../../../../errors';
import type { CreateLegalCaseInput } from '../../../domain/entities/LegalCaseTypes';

class CreateLegalCaseUseCase extends UseCase<CreateLegalCaseInput, any> {
  private readonly repository: LegalCaseRepository;

  public constructor(repository: LegalCaseRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes (400).
   * @throws {ConflictError} `case_number_cnj` já cadastrado (409).
   * @throws {NotFoundError} FK informada não existe (404).
   * @throws {BusinessRuleError} Mais de uma FK de parte contrária preenchida (422).
   */
  public async execute(input: CreateLegalCaseInput): Promise<any> {
    if (!input.case_number_cnj || !input.type || !input.role || !input.internal_responsible_user_id) {
      throw new ValidationError('case_number_cnj, type, role e internal_responsible_user_id são obrigatórios.');
    }

    const existing = await this.repository.findByCaseNumber(input.case_number_cnj);
    if (existing) throw new ConflictError(`Processo ${input.case_number_cnj} já cadastrado.`);

    const opposingFilled = [input.opposing_party_employee_id, input.opposing_party_supplier_id, input.opposing_party_client_id].filter(Boolean).length;
    if (opposingFilled > 1) {
      throw new BusinessRuleError('No máximo uma FK de parte contrária pode ser informada (funcionário XOR fornecedor XOR cliente).');
    }

    if (input.opposing_party_employee_id) {
      const { Employee } = require('../../../../../models/index');
      if (!(await Employee.findByPk(input.opposing_party_employee_id))) throw new NotFoundError(`Funcionário ${input.opposing_party_employee_id} não encontrado.`);
    }
    if (input.opposing_party_supplier_id) {
      const { Supplier } = require('../../../../../models/index');
      if (!(await Supplier.findByPk(input.opposing_party_supplier_id))) throw new NotFoundError(`Fornecedor ${input.opposing_party_supplier_id} não encontrado.`);
    }
    if (input.opposing_party_client_id) {
      const { Client } = require('../../../../../models/index');
      if (!(await Client.findByPk(input.opposing_party_client_id))) throw new NotFoundError(`Cliente ${input.opposing_party_client_id} não encontrado.`);
    }
    if (input.external_lawyer_id) {
      const { JurExternalLawyer } = require('../../../../../models/index');
      if (!(await JurExternalLawyer.findByPk(input.external_lawyer_id))) throw new NotFoundError(`Advogado externo ${input.external_lawyer_id} não encontrado.`);
    }

    const opposingPartyName = input.opposing_party_name
      ?? (await this.resolveOpposingPartyName(input));

    const created = await this.repository.create({
      case_number: input.case_number_cnj,
      case_type: input.type,
      case_role: this.mapRole(input.role),
      opposing_party_name: opposingPartyName ?? 'Não identificado',
      opposing_party_employee_id: input.opposing_party_employee_id ?? null,
      opposing_party_supplier_id: input.opposing_party_supplier_id ?? null,
      opposing_party_client_id: input.opposing_party_client_id ?? null,
      court: input.court ?? null,
      external_lawyer_id: input.external_lawyer_id ?? null,
      claim_value: input.claim_value ?? null,
      internal_responsible_user_id: input.internal_responsible_user_id,
      status: 'active',
      created_by: input.createdBy,
    });

    return this.repository.findById(created.id);
  }

  /** Mapeia `role` (contrato de API, pt/en tolerante) para `case_role` do banco. */
  private mapRole(role: string): 'plaintiff' | 'defendant' | 'third_party' {
    const map: Record<string, 'plaintiff' | 'defendant' | 'third_party'> = {
      autor: 'plaintiff', plaintiff: 'plaintiff',
      reu: 'defendant', réu: 'defendant', defendant: 'defendant',
      terceiro: 'third_party', third_party: 'third_party',
    };
    return map[role] ?? 'defendant';
  }

  private async resolveOpposingPartyName(input: CreateLegalCaseInput): Promise<string | null> {
    if (input.opposing_party_employee_id) {
      const { Employee } = require('../../../../../models/index');
      const employee = await Employee.findByPk(input.opposing_party_employee_id);
      return employee?.name ?? null;
    }
    if (input.opposing_party_supplier_id) {
      const { Supplier } = require('../../../../../models/index');
      const supplier = await Supplier.findByPk(input.opposing_party_supplier_id);
      return supplier?.name ?? null;
    }
    if (input.opposing_party_client_id) {
      const { Client } = require('../../../../../models/index');
      const client = await Client.findByPk(input.opposing_party_client_id);
      return client?.name ?? null;
    }
    return null;
  }
}

export = CreateLegalCaseUseCase;
