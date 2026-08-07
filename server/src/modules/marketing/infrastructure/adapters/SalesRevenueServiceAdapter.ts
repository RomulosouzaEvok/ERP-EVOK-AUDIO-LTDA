/**
 * Adapter de `SalesRevenueService` — agregação read-only contra o model
 * `Sale` (papel de infraestrutura, não de domínio; diferente dos use cases
 * do módulo, pode usar Sequelize diretamente aqui). Usa `customer_id`
 * (coluna real de `Sale` — `client_id` NÃO existe, correção da auditoria
 * cruzada `AuditorIntegrador`, `docs/business/BLOCO_5_MKT_AUDITORIA.md`
 * achado 5) e `sales.created_at` como data de referência da janela de
 * atribuição (RF-MKT-010) — `Sale` não tem campo de faturamento dedicado
 * hoje (confirmado na auditoria).
 *
 * @module modules/marketing/infrastructure/adapters/SalesRevenueServiceAdapter
 */

import { Op } from 'sequelize';
import SalesRevenueService from '../../application/services/SalesRevenueService';
import { ATTRIBUTED_REVENUE_SALE_STATUSES } from '../../domain/constants';

const { Sale } = require('../../../../models/index');

class SalesRevenueServiceAdapter extends SalesRevenueService {
  /** @inheritdoc */
  public async getAttributedRevenue(clientIds: number[], sinceDate: Date, untilDate: Date = new Date()): Promise<string> {
    if (!clientIds.length) return '0.00';

    const result = await Sale.sum('total_amount', {
      where: {
        customer_id: { [Op.in]: clientIds },
        status: { [Op.in]: ATTRIBUTED_REVENUE_SALE_STATUSES as unknown as string[] },
        created_at: { [Op.gte]: sinceDate, [Op.lte]: untilDate },
      },
    });

    return Number(result || 0).toFixed(2);
  }
}

export = SalesRevenueServiceAdapter;
