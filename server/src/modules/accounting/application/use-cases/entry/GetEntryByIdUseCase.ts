/**
 * Caso de uso: busca de um lançamento contábil por id (com itens
 * carregados), cobrindo o fluxo do endpoint `GET /api/accounting/entries/:id`.
 *
 * @module modules/accounting/application/use-cases/entry/GetEntryByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AccountingRepository from '../../../domain/repositories/AccountingRepository';

type GetEntryByIdInput = { id: number };

class GetEntryByIdUseCase extends UseCase<GetEntryByIdInput, any> {
  private readonly accountingRepository: AccountingRepository;

  constructor(accountingRepository: AccountingRepository) {
    super();
    this.accountingRepository = accountingRepository;
  }

  async execute({ id }: GetEntryByIdInput) {
    const entry = await this.accountingRepository.findEntryById(id);
    if (!entry) {
      throw new NotFoundError('Lançamento contábil não encontrado.');
    }
    return entry;
  }
}

export = GetEntryByIdUseCase;
