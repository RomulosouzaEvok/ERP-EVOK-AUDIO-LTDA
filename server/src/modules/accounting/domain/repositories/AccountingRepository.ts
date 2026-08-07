import type { Transaction } from 'sequelize';

/**
 * Contrato de repositório do módulo Contabilidade (subárea CONT do
 * departamento Financeiro): Plano de Contas, Lançamentos Contábeis (partida
 * dobrada) e o relatório de Balancete (dado derivado, sem tabela própria).
 *
 * A camada de aplicação (use cases) depende apenas desta interface, nunca de
 * uma implementação concreta (Sequelize) — mantém a regra de negócio
 * independente do ORM/banco.
 *
 * @module modules/accounting/domain/repositories/AccountingRepository
 */
class AccountingRepository {
  // ---- Plano de Contas ----

  /** Lista contas do plano, com filtros opcionais de `account_type`/`active`. */
  async listAccounts(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('AccountingRepository.listAccounts não implementado.');
  }

  /** Busca uma conta pelo id. */
  async findAccountById(_id: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('AccountingRepository.findAccountById não implementado.');
  }

  /** Busca uma conta pelo código (único). */
  async findAccountByCode(_code: string): Promise<any | null> {
    throw new Error('AccountingRepository.findAccountByCode não implementado.');
  }

  /** Cria uma conta do plano. */
  async createAccount(_data: Record<string, unknown>): Promise<any> {
    throw new Error('AccountingRepository.createAccount não implementado.');
  }

  /** Atualiza campos de uma conta existente. */
  async updateAccount(_id: number, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('AccountingRepository.updateAccount não implementado.');
  }

  // ---- Lançamentos Contábeis ----

  /** Conta quantos lançamentos já existem (para o número sequencial `LC-XXXXXX`). */
  async countEntries(_transaction?: Transaction): Promise<number> {
    throw new Error('AccountingRepository.countEntries não implementado.');
  }

  /** Lista lançamentos paginados, com filtros opcionais de `status`/`entry_type`/período. */
  async listEntries(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('AccountingRepository.listEntries não implementado.');
  }

  /** Busca um lançamento por id, com itens (+ conta/centro de custo) carregados. */
  async findEntryById(_id: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('AccountingRepository.findEntryById não implementado.');
  }

  /**
   * Busca um lançamento "cru" (sem includes) com lock pessimista
   * (`SELECT ... FOR UPDATE`), usado nas transições de status
   * (`post`/`reverse`) para evitar condição de corrida.
   */
  async findEntryByIdForUpdate(_id: number, _transaction: Transaction): Promise<any | null> {
    throw new Error('AccountingRepository.findEntryByIdForUpdate não implementado.');
  }

  /** Cria o cabeçalho de um lançamento. */
  async createEntry(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('AccountingRepository.createEntry não implementado.');
  }

  /** Atualiza campos do cabeçalho de um lançamento. */
  async updateEntry(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('AccountingRepository.updateEntry não implementado.');
  }

  /** Cria um item (linha de débito/crédito) de um lançamento. */
  async createEntryItem(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('AccountingRepository.createEntryItem não implementado.');
  }

  /** Lista os itens (crus) de um lançamento. */
  async findEntryItems(_entryId: number, _transaction?: Transaction): Promise<any[]> {
    throw new Error('AccountingRepository.findEntryItems não implementado.');
  }

  /** Remove todos os itens de um lançamento (usado ao substituir os itens de um rascunho). */
  async deleteEntryItems(_entryId: number, _transaction: Transaction): Promise<void> {
    throw new Error('AccountingRepository.deleteEntryItems não implementado.');
  }

  // ---- Balancete (relatório derivado) ----

  /**
   * Agrega `accounting_entry_items` de lançamentos `posted` por conta,
   * separando saldo anterior (antes do 1º dia de `year`/`month`) de
   * movimento do mês (`debit_movement`/`credit_movement`).
   */
  async getTrialBalanceRows(_year: number, _month: number): Promise<Array<{
    account_id: number; code: string; name: string; account_type: string;
    previous_debit: number; previous_credit: number; debit_movement: number; credit_movement: number;
  }>> {
    throw new Error('AccountingRepository.getTrialBalanceRows não implementado.');
  }
}

export = AccountingRepository;
