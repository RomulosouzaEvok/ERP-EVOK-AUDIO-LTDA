/**
 * Implementação Sequelize da política configurável de alçada
 * (FIND-ERP-005 / Falha 1).
 *
 * `replaceAll` é intencionalmente "substituição do conjunto": a política é
 * um conjunto de faixas que só faz sentido íntegro (faixas contíguas, sem
 * buraco). Editar linha a linha permitiria estados intermediários em que
 * uma faixa some e um contrato passa a não exigir alçada nenhuma — o mesmo
 * tipo de fail-open que originou o finding. O estado anterior inteiro vai
 * para `jur_approval_threshold_history`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeApprovalThresholdRepository
 */

import ApprovalThresholdRepository from '../../domain/repositories/ApprovalThresholdRepository';
import type { ApprovalThresholdRule } from '../../domain/approvalPolicy';

const { JurApprovalThreshold, JurApprovalThresholdHistory, sequelize }: any = require('../../../../models/index');

function toRule(row: any): ApprovalThresholdRule {
  const plain = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    contract_type: plain.contract_type,
    min_value: plain.min_value,
    max_value: plain.max_value,
    required_roles: Array.isArray(plain.required_roles) ? plain.required_roles : [],
    required_level: plain.required_level,
    active: plain.active,
    valid_from: plain.valid_from ?? null,
    valid_to: plain.valid_to ?? null,
  };
}

class SequelizeApprovalThresholdRepository extends ApprovalThresholdRepository {
  public async listAll(): Promise<ApprovalThresholdRule[]> {
    const rows = await JurApprovalThreshold.findAll({ order: [['contract_type', 'ASC'], ['min_value', 'ASC']] });
    return rows.map(toRule);
  }

  public async replaceAll(
    rules: ApprovalThresholdRule[],
    meta: { changedBy: number | null; reason?: string | null },
  ): Promise<ApprovalThresholdRule[]> {
    const previous = await this.listAll();

    return sequelize.transaction(async (transaction: any) => {
      await JurApprovalThreshold.destroy({ where: {}, transaction });
      const created = await JurApprovalThreshold.bulkCreate(
        rules.map((rule) => ({
          contract_type: rule.contract_type,
          min_value: rule.min_value,
          max_value: rule.max_value,
          required_roles: rule.required_roles,
          required_level: rule.required_level,
          active: rule.active,
          valid_from: rule.valid_from ?? null,
          valid_to: rule.valid_to ?? null,
          created_by: meta.changedBy,
        })),
        { transaction },
      );

      await JurApprovalThresholdHistory.create({
        threshold_id: null,
        action: 'replace',
        previous_values: { rules: previous },
        new_values: { rules: created.map(toRule) },
        changed_by: meta.changedBy,
        change_reason: meta.reason ?? null,
        changed_at: new Date(),
      }, { transaction });

      return created.map(toRule);
    });
  }

  public async listHistory(limit = 50): Promise<any[]> {
    return JurApprovalThresholdHistory.findAll({ order: [['changed_at', 'DESC']], limit });
  }
}

export = SequelizeApprovalThresholdRepository;
