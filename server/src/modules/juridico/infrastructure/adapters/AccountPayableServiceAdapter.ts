/**
 * Adapter de `AccountPayableService` — cria `AccountPayable` via o
 * repositório real do módulo Financeiro (`server/src/modules/financial/`),
 * nunca `AccountPayable.create()` direto do módulo `juridico` (RF-JUR-018).
 *
 * @module modules/juridico/infrastructure/adapters/AccountPayableServiceAdapter
 */

import AccountPayableService from '../../application/services/AccountPayableService';

const SequelizeFinancialRepository = require('../../../financial/infrastructure/sequelize/SequelizeFinancialRepository');

const financialRepository = new SequelizeFinancialRepository();

class AccountPayableServiceAdapter extends AccountPayableService {
  public async create(data: {
    description: string;
    amount: number | string;
    due_date: string;
    category?: string;
    legal_case_id: number;
    legal_expense_type?: 'expense' | 'judicial_deposit';
  }): Promise<any> {
    return financialRepository.createPayable({
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      category: data.category ?? 'Jurídico',
      status: 'pending',
      legal_case_id: data.legal_case_id,
      legal_expense_type: data.legal_expense_type ?? null,
    });
  }

  /** @inheritdoc */
  public async listByLegalCase(): Promise<any[]> {
    return financialRepository.listPayablesByLegalCase();
  }
}

export = AccountPayableServiceAdapter;
