/**
 * Elegibilidade de aprovador de `ItAccessRequest` (grant/change),
 * `docs/business/BLOCO_2_TI_API.md` §4.1 (resolvido pela auditoria
 * cruzada): `ti:approve` OU gestor do `department_id` via
 * `departments.manager_id → employees.user_id`. Nenhuma migração de
 * schema nova — reutiliza FKs já existentes.
 *
 * @module modules/ti/domain/services/approverEligibilityService
 */

const { Department, Employee }: any = require('../../../../models/index');

interface Input {
  approverUserId: number;
  approverRole: string;
  approverHasTiApprove: boolean;
  departmentId: number;
}

/**
 * @param input - Dados do aprovador e do departamento-alvo da solicitação.
 * @returns `true` se o aprovador é `role=admin`, tem `ti:approve`, ou é o
 *   gestor (`employees.user_id`) do `departments.manager_id` do
 *   departamento da solicitação.
 */
export async function isEligibleApprover(input: Input): Promise<boolean> {
  if (input.approverRole === 'admin') return true;
  if (input.approverHasTiApprove) return true;

  const department = await Department.findByPk(input.departmentId);
  if (!department || !department.manager_id) return false;

  const manager = await Employee.findByPk(department.manager_id);
  if (!manager || !manager.user_id) return false;

  return manager.user_id === input.approverUserId;
}
