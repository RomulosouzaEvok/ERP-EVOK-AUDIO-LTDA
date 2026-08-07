/**
 * Caso de uso: atualização de uma operação financeira, cobrindo o fluxo do
 * endpoint `PUT /api/treasury/financial-operations/:id`. Só permite edição
 * enquanto a operação estiver `active` — `settled`/`canceled` são estados
 * finais imutáveis (mesmo padrão de `AccountingEntry`: histórico exige
 * auditoria).
 *
 * @module modules/treasury/application/use-cases/operation/UpdateOperationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

type UpdateOperationInput = {
  id: number;
  operation_type?: 'loan' | 'investment' | 'financing' | 'leasing';
  institution?: string;
  contract_number?: string;
  amount?: number;
  interest_rate?: number | null;
  start_date?: string;
  end_date?: string | null;
  guarantee_type?: 'aval' | 'fianca' | 'alienacao' | 'recebiveis' | 'none';
  notes?: string | null;
};

class UpdateOperationUseCase extends UseCase<UpdateOperationInput, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  /**
   * @throws {NotFoundError} Se a operação não existir.
   * @throws {BusinessRuleError} Se a operação não estiver `active`, ou se `end_date` resultante for anterior a `start_date` resultante.
   * @throws {ConflictError} Se o novo `contract_number` já pertencer a outra operação.
   */
  async execute({ id, ...data }: UpdateOperationInput) {
    const operation = await this.treasuryRepository.findOperationById(id);
    if (!operation) {
      throw new NotFoundError(`Operação financeira ${id} não encontrada.`);
    }
    if (operation.status !== 'active') {
      throw new BusinessRuleError(`Operação "${operation.contract_number}" está "${operation.status}" — apenas operações ativas podem ser editadas.`);
    }

    if (data.contract_number && data.contract_number !== operation.contract_number) {
      const existing = await this.treasuryRepository.findOperationByContractNumber(data.contract_number);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Já existe uma operação financeira com o contrato "${data.contract_number}".`);
      }
    }

    const resultingStartDate = data.start_date ?? operation.start_date;
    const resultingEndDate = data.end_date === undefined ? operation.end_date : data.end_date;
    if (resultingEndDate && new Date(resultingEndDate) < new Date(resultingStartDate)) {
      throw new BusinessRuleError('end_date não pode ser anterior a start_date.');
    }

    return this.treasuryRepository.updateOperation(id, data);
  }
}

export = UpdateOperationUseCase;
