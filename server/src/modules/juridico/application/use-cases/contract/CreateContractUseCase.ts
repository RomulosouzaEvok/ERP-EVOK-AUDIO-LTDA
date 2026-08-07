/**
 * `POST /api/jur/contracts` — cria um contrato em `draft` (UC-52, RF-JUR-001).
 *
 * @module modules/juridico/application/use-cases/contract/CreateContractUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../../../../errors';
import type { CreateContractInput } from '../../../domain/entities/ContractTypes';

class CreateContractUseCase extends UseCase<CreateContractInput, any> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  /**
   * Valida contraparte polimórfica mutuamente exclusiva (§2.1 da API — o
   * `CHECK` de banco é a segunda camada, esta é a validação de aplicação
   * obrigatória independentemente do banco).
   *
   * @throws {ValidationError} `type`, `object` ou `counterparty_type` ausentes (400).
   * @throws {BusinessRuleError} Contraparte não respeita a exclusividade mútua (422).
   * @throws {NotFoundError} `supplier_id`/`client_id`/`employee_id` informado não existe (404).
   */
  public async execute(input: CreateContractInput): Promise<any> {
    if (!input.type || !input.object || !input.counterparty_type) {
      throw new ValidationError('type, object e counterparty_type são obrigatórios.');
    }

    this.validateCounterparty(input);

    if (input.supplier_id) {
      const { Supplier } = require('../../../../../models/index');
      const exists = await Supplier.findByPk(input.supplier_id);
      if (!exists) throw new NotFoundError(`Fornecedor ${input.supplier_id} não encontrado.`);
    }
    if (input.client_id) {
      const { Client } = require('../../../../../models/index');
      const exists = await Client.findByPk(input.client_id);
      if (!exists) throw new NotFoundError(`Cliente ${input.client_id} não encontrado.`);
    }
    if (input.employee_id) {
      const { Employee } = require('../../../../../models/index');
      const exists = await Employee.findByPk(input.employee_id);
      if (!exists) throw new NotFoundError(`Funcionário ${input.employee_id} não encontrado.`);
    }

    const year = new Date().getFullYear();
    const sequence = (await this.repository.countByYear(year)) + 1;
    const contractNumber = `CT-${year}-${String(sequence).padStart(4, '0')}`;

    const created = await this.repository.create({
      contract_number: contractNumber,
      contract_type: input.type,
      object: input.object,
      counterparty_type: input.counterparty_type,
      supplier_id: input.supplier_id ?? null,
      client_id: input.client_id ?? null,
      employee_id: input.employee_id ?? null,
      counterparty_name: input.counterparty_name ?? null,
      counterparty_doc: input.counterparty_doc ?? null,
      value: input.value ?? null,
      currency: input.currency ?? 'BRL',
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      renewal_auto: input.renewal_auto ?? false,
      notice_days: input.notice_days ?? null,
      adjustment_index: input.adjustment_index ?? 'none',
      adjustment_base_date: input.adjustment_base_date ?? null,
      alert_advance_days: input.alert_advance_days ?? 60,
      status: 'draft',
      created_by: input.createdBy,
    });

    return this.repository.findById(created.id);
  }

  private validateCounterparty(input: CreateContractInput): void {
    const groups = {
      supplier: Boolean(input.supplier_id),
      client: Boolean(input.client_id),
      employee: Boolean(input.employee_id),
      other: Boolean(input.counterparty_name && input.counterparty_doc),
    };

    const filledCount = Object.values(groups).filter(Boolean).length;
    if (filledCount !== 1 || !groups[input.counterparty_type]) {
      throw new BusinessRuleError(
        'A contraparte deve ser exatamente uma: fornecedor, cliente, funcionário ou nome/documento avulso, coerente com counterparty_type.',
        { field: 'counterparty_type', rule: 'BR-JUR-001' },
      );
    }
  }
}

export = CreateContractUseCase;
