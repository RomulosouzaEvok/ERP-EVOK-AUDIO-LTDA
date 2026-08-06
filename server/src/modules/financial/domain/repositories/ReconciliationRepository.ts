import type { Transaction } from 'sequelize';

/**
 * Formato estrutural do contrato `ReconciliationRepository`, usado pelos
 * use cases da Conciliação Bancária v1 (importação OFX) para tipar a
 * dependência sem acoplar à classe concreta (nominal) — qualquer objeto
 * com esta forma (ex.: `SequelizeReconciliationRepository`) satisfaz o tipo.
 */
export interface IReconciliationRepository {
  createStatement(data: Record<string, any>, transaction: Transaction): Promise<any>;
  findStatementById(id: number | string): Promise<any>;
  listStatements(pagination: { limit?: number; offset?: number }): Promise<{ rows: any[]; count: number }>;

  /** Retorna o subconjunto de `fitids` que já existe em `bank_statement_entries` (qualquer statement) — dedup na reimportação. */
  findExistingFitids(fitids: string[]): Promise<Set<string>>;
  bulkCreateEntries(entries: Array<Record<string, any>>, transaction: Transaction): Promise<any[]>;

  listEntriesByStatement(statementId: number | string, filters: { status?: string }): Promise<any[]>;
  listPendingEntriesByStatement(statementId: number | string): Promise<any[]>;

  findEntryById(id: number | string): Promise<any>;
  findEntryByIdForUpdate(id: number | string, transaction: Transaction): Promise<any>;
  updateEntry(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;

  findPayableByIdForUpdate(id: number | string, transaction: Transaction): Promise<any>;
  findReceivableByIdForUpdate(id: number | string, transaction: Transaction): Promise<any>;
  /** Aplica a baixa (pagamento) de uma conta a pagar dentro da transação da conciliação. */
  updatePayablePayment(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;
  /** Aplica a baixa (recebimento) de uma conta a receber dentro da transação da conciliação. */
  updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;

  /** Contas a pagar em aberto com vencimento dentro de `[dueDateFrom, dueDateTo]` — universo de candidatos de sugestão de match. */
  listOpenPayablesByDueDateRange(dueDateFrom: string, dueDateTo: string): Promise<any[]>;
  /** Contas a receber em aberto com vencimento dentro de `[dueDateFrom, dueDateTo]` — universo de candidatos de sugestão de match. */
  listOpenReceivablesByDueDateRange(dueDateFrom: string, dueDateTo: string): Promise<any[]>;
}

/**
 * Interface (contrato) de repositório da Conciliação Bancária v1
 * (importação OFX, módulo `financial`).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class ReconciliationRepository {
  async createStatement(data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.createStatement não implementado.');
  }

  async findStatementById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findStatementById não implementado.');
  }

  async listStatements(pagination: { limit?: number; offset?: number }) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.listStatements não implementado.');
  }

  async findExistingFitids(fitids: string[]) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findExistingFitids não implementado.');
  }

  async bulkCreateEntries(entries: Array<Record<string, any>>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.bulkCreateEntries não implementado.');
  }

  async listEntriesByStatement(statementId: number | string, filters: { status?: string }) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.listEntriesByStatement não implementado.');
  }

  async listPendingEntriesByStatement(statementId: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.listPendingEntriesByStatement não implementado.');
  }

  async findEntryById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findEntryById não implementado.');
  }

  async findEntryByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findEntryByIdForUpdate não implementado.');
  }

  async updateEntry(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.updateEntry não implementado.');
  }

  async findPayableByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findPayableByIdForUpdate não implementado.');
  }

  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.findReceivableByIdForUpdate não implementado.');
  }

  async updatePayablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.updatePayablePayment não implementado.');
  }

  async updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.updateReceivablePayment não implementado.');
  }

  async listOpenPayablesByDueDateRange(dueDateFrom: string, dueDateTo: string) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.listOpenPayablesByDueDateRange não implementado.');
  }

  async listOpenReceivablesByDueDateRange(dueDateFrom: string, dueDateTo: string) { // eslint-disable-line no-unused-vars
    throw new Error('ReconciliationRepository.listOpenReceivablesByDueDateRange não implementado.');
  }
}

module.exports = ReconciliationRepository;
