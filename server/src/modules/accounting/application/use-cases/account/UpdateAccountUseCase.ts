/**
 * Caso de uso: atualização de uma conta do Plano de Contas, cobrindo o fluxo
 * do endpoint `PUT /api/accounting/accounts/:id`.
 *
 * Deliberadamente NÃO permite alterar `code`/`parent_id`/`account_level`
 * (mudaria a posição na árvore, arriscando ciclos/inconsistência com contas
 * filhas já existentes) — apenas `name`, `account_type`, `accept_entries` e
 * `active`.
 *
 * @module modules/accounting/application/use-cases/account/UpdateAccountUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type UpdateAccountInput = {
  id: number;
  name?: string;
  account_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';
  accept_entries?: boolean;
  active?: boolean;
};

class UpdateAccountUseCase extends UseCase<UpdateAccountInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * @throws {NotFoundError} Se a conta não existir.
   * @throws {BusinessRuleError} Se tentar ligar `accept_entries=true` em uma conta que já tem contas filhas (continuaria sintética por natureza).
   */
  async execute({ id, ...rest }: UpdateAccountInput) {
    const current = await this.accountingRepository.findAccountById(id);
    if (!current) {
      throw new NotFoundError('Conta do plano de contas não encontrada.');
    }

    if (rest.accept_entries === true) {
      const { rows: children } = await this.accountingRepository.listAccounts({ parent_id: id }, { limit: 1, offset: 0 });
      if (children.length > 0) {
        throw new BusinessRuleError('Esta conta possui contas filhas (é sintética) — não pode aceitar lançamento direto.');
      }
    }

    return this.accountingRepository.updateAccount(id, rest);
  }
}

export = UpdateAccountUseCase;
