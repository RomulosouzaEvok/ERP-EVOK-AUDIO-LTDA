import type { Transaction } from 'sequelize';

/**
 * Contrato de repositório do módulo Tesouraria (subárea TES do departamento
 * Financeiro): Contas Bancárias, Operações Financeiras (empréstimos,
 * aplicações, financiamentos, leasing) e a Posição de Caixa (relatório
 * derivado, sem tabela própria).
 *
 * A camada de aplicação (use cases) depende apenas desta interface, nunca de
 * uma implementação concreta (Sequelize) — mantém a regra de negócio
 * independente do ORM/banco.
 *
 * @module modules/treasury/domain/repositories/TreasuryRepository
 */
class TreasuryRepository {
  // ---- Contas Bancárias ----

  /** Lista contas bancárias, com filtros opcionais de `account_type`/`active`. */
  async listBankAccounts(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('TreasuryRepository.listBankAccounts não implementado.');
  }

  /** Busca uma conta bancária pelo id. */
  async findBankAccountById(_id: number): Promise<any | null> {
    throw new Error('TreasuryRepository.findBankAccountById não implementado.');
  }

  /** Busca uma conta bancária pela combinação agência + número (única). */
  async findBankAccountByAgencyAndNumber(_agency: string, _accountNumber: string): Promise<any | null> {
    throw new Error('TreasuryRepository.findBankAccountByAgencyAndNumber não implementado.');
  }

  /** Cria uma conta bancária. */
  async createBankAccount(_data: Record<string, unknown>): Promise<any> {
    throw new Error('TreasuryRepository.createBankAccount não implementado.');
  }

  /** Atualiza campos de uma conta bancária existente. */
  async updateBankAccount(_id: number, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('TreasuryRepository.updateBankAccount não implementado.');
  }

  /** Lista TODAS as contas bancárias ativas (sem paginação), usada pela Posição de Caixa. */
  async listActiveBankAccountsForCashPosition(): Promise<any[]> {
    throw new Error('TreasuryRepository.listActiveBankAccountsForCashPosition não implementado.');
  }

  // ---- Operações Financeiras ----

  /** Lista operações financeiras paginadas, com filtros opcionais de `status`/`operation_type`. */
  async listOperations(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('TreasuryRepository.listOperations não implementado.');
  }

  /** Busca uma operação financeira pelo id. */
  async findOperationById(_id: number): Promise<any | null> {
    throw new Error('TreasuryRepository.findOperationById não implementado.');
  }

  /**
   * Busca uma operação financeira "crua" com lock pessimista
   * (`SELECT ... FOR UPDATE`), usada nas transições de status
   * (`settle`/`cancel`) para evitar condição de corrida.
   */
  async findOperationByIdForUpdate(_id: number, _transaction: Transaction): Promise<any | null> {
    throw new Error('TreasuryRepository.findOperationByIdForUpdate não implementado.');
  }

  /** Busca uma operação financeira pelo número de contrato (único). */
  async findOperationByContractNumber(_contractNumber: string): Promise<any | null> {
    throw new Error('TreasuryRepository.findOperationByContractNumber não implementado.');
  }

  /** Cria uma operação financeira. */
  async createOperation(_data: Record<string, unknown>): Promise<any> {
    throw new Error('TreasuryRepository.createOperation não implementado.');
  }

  /** Atualiza campos de uma operação financeira existente. */
  async updateOperation(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any | null> {
    throw new Error('TreasuryRepository.updateOperation não implementado.');
  }

  // ---- Posição de Caixa (relatório derivado) ----

  /**
   * Agrega os títulos EM ABERTO de contas a pagar/receber (mesmo critério de
   * `FinancialRepository.getOpenTitlesForProjection`, sem reimplementar:
   * `payment_date IS NULL` e `status != 'canceled'`), retornando os totais
   * já vencidos e a vencer nos próximos 7 dias.
   */
  async getOpenPayablesAndReceivablesSummary(): Promise<{
    totalReceivable: number; totalPayable: number;
    overdueReceivable: number; overduePayable: number;
  }> {
    throw new Error('TreasuryRepository.getOpenPayablesAndReceivablesSummary não implementado.');
  }
}

export = TreasuryRepository;
