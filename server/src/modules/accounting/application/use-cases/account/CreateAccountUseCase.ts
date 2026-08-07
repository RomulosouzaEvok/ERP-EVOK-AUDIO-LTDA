/**
 * Caso de uso: criação de uma conta do Plano de Contas, cobrindo o fluxo do
 * endpoint `POST /api/accounting/accounts`.
 *
 * @module modules/accounting/application/use-cases/account/CreateAccountUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { ConflictError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type CreateAccountInput = {
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';
  accept_entries?: boolean;
  active?: boolean;
};

class CreateAccountUseCase extends UseCase<CreateAccountInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  /**
   * `account_level` e `parent_id` são derivados automaticamente do `code`
   * (ex.: `"1.1.1"` → nível 3, pai `"1.1"`), nunca informados pelo chamador —
   * evita inconsistência entre o código e a posição na árvore.
   *
   * @throws {ConflictError} Se já existir conta com o mesmo `code`.
   * @throws {NotFoundError} Se o código indicar um pai (`"1.1.1"` → pai `"1.1"`) que não existe no plano.
   * @throws {BusinessRuleError} Se o pai resolvido não aceitar ter contas filhas (já é conta "folha" com `accept_entries = true` E JÁ tiver lançamentos — validação leve: apenas alerta de forma, ver nota).
   */
  async execute(input: CreateAccountInput) {
    const existing = await this.accountingRepository.findAccountByCode(input.code);
    if (existing) {
      throw new ConflictError(`Já existe uma conta com o código "${input.code}".`);
    }

    const segments = input.code.split('.');
    const accountLevel = segments.length;
    let parentId: number | null = null;

    if (accountLevel > 1) {
      const parentCode = segments.slice(0, -1).join('.');
      const parent = await this.accountingRepository.findAccountByCode(parentCode);
      if (!parent) {
        throw new NotFoundError(`Conta pai "${parentCode}" (derivada do código "${input.code}") não encontrada no plano de contas.`);
      }
      if (parent.accept_entries) {
        throw new BusinessRuleError(`A conta pai "${parentCode}" aceita lançamento direto (accept_entries=true) — desative accept_entries nela antes de criar contas filhas, para não misturar lançamento em conta sintética e em conta folha.`);
      }
      parentId = parent.id;
    }

    return this.accountingRepository.createAccount({
      code: input.code,
      name: input.name,
      account_type: input.account_type,
      account_level: accountLevel,
      parent_id: parentId,
      accept_entries: input.accept_entries ?? true,
      active: input.active ?? true,
    });
  }
}

export = CreateAccountUseCase;
