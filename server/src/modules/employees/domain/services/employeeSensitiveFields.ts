/**
 * 🔒 Segregação de campos sensíveis de `Employee` (BR-RH-020, LGPD arts.
 * 5º/6º/46).
 *
 * `GET /api/employees` e `GET /api/employees/:id` continuam acessíveis a
 * qualquer usuário autenticado (mantido para não quebrar consumidores
 * legítimos que só precisam de nome/departamento/cargo — ex.:
 * `ShopFloorPage` (seletor de operador) e `useMyDepartment` (resolução de
 * departamento do usuário logado)). O que muda é o **conteúdo** da
 * resposta: campos financeiros/pessoais sensíveis só são incluídos quando o
 * requisitante tem acesso completo (ver {@link hasFullEmployeeAccess}).
 *
 * @module modules/employees/domain/services/employeeSensitiveFields
 */

/** Papéis de usuário e mapa de permissões mínimos necessários para decidir a visibilidade. */
export interface RequestingUserContext {
  role?: string;
  permissions?: Partial<Record<string, string>>;
}

/**
 * Campos de `Employee` considerados dados pessoais sensíveis para fins de
 * LGPD (remuneração, documentos, dados bancários, endereço e telefone
 * pessoal) — sinalizados com 🔒 em
 * `docs/business/briefs/BRIEF_RH_2026-08-06.md` (BR-RH-020).
 *
 * `pcd` — ADICIONADO no BLOCO 6 RH (RF-RH-067, migration
 * `20260808-000011`). Achado 11 da auditoria cruzada
 * (`docs/business/BLOCO_6_RH_AUDITORIA.md`): sem esta adição, a condição de
 * PCD de qualquer funcionário ficaria visível a todo autenticado via
 * `GET /api/employees` assim que a coluna existisse — dado de saúde
 * (LGPD art. 5º II), mais restrito que a maioria dos campos já protegidos
 * nesta lista.
 */
export const SENSITIVE_EMPLOYEE_FIELDS: readonly string[] = [
  'cpf',
  'rg',
  'pis_pasep',
  'ctps',
  'salary',
  'salary_type',
  'bank_name',
  'bank_agency',
  'bank_account',
  'bank_account_type',
  'pix_key',
  'address',
  'phone',
  'pcd',
];

/**
 * Decide se o usuário requisitante pode ver os campos sensíveis de RH.
 *
 * Regra (BR-RH-020): `role === 'admin'` sempre vê os dados completos
 * (mesmo curto-circuito de `authorizeModule`, ver
 * `server/src/middlewares/auth.ts`); qualquer outro usuário só vê se o seu
 * perfil de acesso (`AccessProfile`) tiver o módulo `rh` atribuído, em
 * qualquer nível (`operate` ou `approve`) — não há distinção de nível
 * gestor/operador para este dado, apenas "tem acesso a RH" ou "não tem".
 *
 * @param user - Contexto do usuário autenticado (`req.user`, populado por `authenticate`).
 * @returns `true` se o usuário pode ver salário, CPF, dados bancários etc.
 */
export function hasFullEmployeeAccess(user: RequestingUserContext | undefined | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Boolean(user.permissions?.rh);
}

/**
 * Remove os campos sensíveis de um registro de `Employee` (objeto simples
 * ou instância Sequelize) quando o requisitante não tem acesso completo.
 * Não muta o objeto original.
 *
 * @param employee - Registro de funcionário (ou `null`/`undefined`).
 * @param canViewSensitive - Resultado de {@link hasFullEmployeeAccess} para o requisitante.
 * @returns Objeto plano sem os campos sensíveis quando `canViewSensitive` é `false`; caso contrário, uma cópia plana com todos os campos.
 */
export function sanitizeEmployee<T extends Record<string, any> | null | undefined>(
  employee: T,
  canViewSensitive: boolean,
): Record<string, any> | null {
  if (!employee) return null;

  const plain: Record<string, any> =
    typeof (employee as any).toJSON === 'function' ? (employee as any).toJSON() : { ...employee };

  if (canViewSensitive) return plain;

  for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
    delete plain[field];
  }
  return plain;
}

/**
 * Aplica {@link sanitizeEmployee} a uma lista de funcionários.
 *
 * @param employees - Lista de registros de funcionário.
 * @param canViewSensitive - Resultado de {@link hasFullEmployeeAccess} para o requisitante.
 * @returns Lista de objetos planos sanitizados.
 */
export function sanitizeEmployeeList<T extends Record<string, any>>(
  employees: T[],
  canViewSensitive: boolean,
): Record<string, any>[] {
  return employees.map((employee) => sanitizeEmployee(employee, canViewSensitive) as Record<string, any>);
}
