/**
 * Adapter de `AccountPayableService` — cria `AccountPayable` via o
 * repositório real do módulo Financeiro (`server/src/modules/financial/`),
 * nunca `AccountPayable.create()` direto do módulo `facilities`
 * (RF-FAC-034/058), mesmo padrão de `AccountPayableServiceAdapter` do
 * módulo `juridico`.
 *
 * @module modules/facilities/infrastructure/adapters/AccountPayableServiceAdapter
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
    cost_center_id?: number | null;
  }): Promise<any> {
    return financialRepository.createPayable({
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      category: data.category ?? 'Frota',
      status: 'pending',
      cost_center_id: data.cost_center_id ?? null,
    });
  }
}

export = AccountPayableServiceAdapter;
