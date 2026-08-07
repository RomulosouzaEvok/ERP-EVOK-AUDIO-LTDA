/**
 * Interface de serviço para criação de `AccountPayable` a partir do módulo
 * `juridico` (RF-JUR-018 — custos de processo — e A2 de UC-53 — acordo com
 * parcelamento), sem import direto do model/módulo Financeiro. Implementada
 * por `AccountPayableServiceAdapter`.
 *
 * @module modules/juridico/application/services/AccountPayableService
 */

interface CreatePayableData {
  description: string;
  amount: number | string;
  due_date: string;
  category?: string;
  legal_case_id: number;
  legal_expense_type?: 'expense' | 'judicial_deposit';
}

class AccountPayableService {
  public async create(_data: CreatePayableData): Promise<any> {
    throw new Error('AccountPayableService.create não implementado.');
  }

  /**
   * Lista contas a pagar vinculadas a processo jurídico — alimenta
   * `GET /api/jur/reports/financeiro` (§8.2), sem Sequelize direto de
   * `AccountPayable` no módulo `juridico`.
   */
  public async listByLegalCase(): Promise<any[]> {
    throw new Error('AccountPayableService.listByLegalCase não implementado.');
  }
}

export = AccountPayableService;
