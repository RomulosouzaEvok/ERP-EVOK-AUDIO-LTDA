/**
 * 🔒 Segregação de campo por **interseção de módulos** para os dois dados
 * de altíssima sensibilidade do Bloco 6 RH (RNF-RH-01, RF-RH-072).
 *
 * ## Decisão normativa do dono do produto (2026-08-09) — fecha o achado 10
 *
 * `docs/business/BLOCO_6_RH_AUDITORIA.md` achado 10 e
 * `docs/business/BLOCO_6_RH_API.md` §0/§21-4 deixaram em aberto o conflito
 * de o nível `rh:approve` significar duas coisas não relacionadas
 * (autorizar ação de alto impacto × ler dado sensível). O dono do produto
 * escolheu a **Opção C** recomendada pelo `AuditorIntegrador`:
 *
 * 1. `rh:approve` fica **exclusivamente** para as 2 ações de alto impacto
 *    (concluir demissão — RF-RH-022; decidir rescisão de contrato de
 *    experiência — RF-RH-016). Isso é aplicado no `router`, não aqui.
 * 2. Os 2 campos sensíveis usam **interseção de módulos** (AND, nunca OR —
 *    `authorizeAnyModule` é composição OR e por isso não serve):
 *    - `hr_absences.cid` (dado de saúde, LGPD art. 5º II) exige módulo `rh`
 *      **E** módulo `sst` (a SST é quem já trata ASO/CAT/atestado no ERP).
 *    - `hr_payroll_import_items.bruto`/`.liquido` (dado financeiro
 *      individual) exige módulo `rh` **E** módulo `financeiro`.
 * 3. Falta de interseção **omite o campo** do retorno (mesma técnica de
 *    `employeeSensitiveFields.ts`) — **nunca** 403 na rota inteira, para
 *    não esconder do RH o restante de um registro que é legitimamente
 *    dele (UC-71 E2).
 * 4. `role === 'admin'` vê tudo (mesmo curto-circuito de `authorizeModule`).
 *
 * ## Estado de implementação (passada P0)
 *
 * `Absence` (RF-RH-044 a 049) e `PayrollImportBatch`/`Item` (RF-RH-070 a
 * 073) são **P1** e não foram implementados nesta passada — não há, ainda,
 * nenhum use case que chame estas funções. Elas existem desde já porque a
 * decisão de RBAC acima é normativa e não deve ser re-decidida (nem
 * re-interpretada) pela próxima passada: quando os endpoints do Grupo 7 e
 * do Grupo 13 forem construídos, basta consumi-las. São puras e testadas
 * (`tests/unit/rh-sensitive-fields.test.ts`).
 *
 * @module modules/rh/domain/services/rhSensitiveFields
 */

/** Contexto mínimo do requisitante (`req.user`, populado por `authenticate`). */
export interface RhRequestingUserContext {
  role?: string;
  permissions?: Partial<Record<string, string>>;
}

/** Campo de dado de saúde de `hr_absences` (RNF-RH-01). */
export const ABSENCE_SENSITIVE_FIELDS: readonly string[] = ['cid'];

/** Campos de dado financeiro individual de `hr_payroll_import_items` (RF-RH-072). */
export const PAYROLL_IMPORT_ITEM_SENSITIVE_FIELDS: readonly string[] = ['bruto', 'liquido'];

/**
 * Interseção genérica de módulos: exige TODOS os módulos informados
 * (qualquer nível, `operate` ou `approve`), com `admin` como curto-circuito.
 *
 * @param user - Contexto do usuário autenticado.
 * @param moduleKeys - Módulos exigidos SIMULTANEAMENTE.
 * @returns `true` se o usuário tem todos os módulos (ou é `admin`).
 */
export function hasAllModules(user: RhRequestingUserContext | undefined | null, moduleKeys: readonly string[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return moduleKeys.every((key) => Boolean(user.permissions?.[key]));
}

/**
 * RNF-RH-01 — pode ver `Absence.cid`? Exige `rh` **E** `sst`.
 *
 * @param user - Contexto do usuário autenticado.
 * @returns `true` se o CID pode ser incluído na resposta.
 */
export function canViewAbsenceCid(user: RhRequestingUserContext | undefined | null): boolean {
  return hasAllModules(user, ['rh', 'sst']);
}

/**
 * RF-RH-072 — pode ver `PayrollImportItem.bruto`/`.liquido`? Exige `rh`
 * **E** `financeiro`. `custo_total`/`department_id`/`cost_center_id`
 * permanecem visíveis a qualquer `rh` (RF-RH-073 — agregação por centro de
 * custo é segura), por isso NÃO entram na lista de campos removidos.
 *
 * @param user - Contexto do usuário autenticado.
 * @returns `true` se os valores individuais de folha podem ser incluídos na resposta.
 */
export function canViewPayrollIndividualValues(user: RhRequestingUserContext | undefined | null): boolean {
  return hasAllModules(user, ['rh', 'financeiro']);
}

/**
 * Remove uma lista de campos de um registro (objeto simples ou instância
 * Sequelize) quando o requisitante não tem a interseção exigida. Não muta o
 * objeto original.
 *
 * @param record - Registro (ou `null`/`undefined`).
 * @param fields - Campos a omitir quando `canView` for `false`.
 * @param canView - Resultado de `canViewAbsenceCid`/`canViewPayrollIndividualValues`.
 * @returns Objeto plano, sem os campos sensíveis quando `canView` é `false`.
 */
export function omitSensitiveFields<T extends Record<string, any> | null | undefined>(
  record: T,
  fields: readonly string[],
  canView: boolean,
): Record<string, any> | null {
  if (!record) return null;
  const plain: Record<string, any> =
    typeof (record as any).toJSON === 'function' ? (record as any).toJSON() : { ...record };
  if (canView) return plain;
  for (const field of fields) delete plain[field];
  return plain;
}

/**
 * Sanitiza um registro de `hr_absences` (RNF-RH-01, UC-71 E2).
 *
 * @param absence - Registro de afastamento.
 * @param user - Contexto do usuário autenticado.
 * @returns Registro plano, sem `cid` quando faltar a interseção `rh` + `sst`.
 */
export function sanitizeAbsence<T extends Record<string, any> | null | undefined>(
  absence: T,
  user: RhRequestingUserContext | undefined | null,
): Record<string, any> | null {
  return omitSensitiveFields(absence, ABSENCE_SENSITIVE_FIELDS, canViewAbsenceCid(user));
}

/**
 * Sanitiza um registro de `hr_payroll_import_items` (RF-RH-072/073).
 *
 * @param item - Item de importação de folha.
 * @param user - Contexto do usuário autenticado.
 * @returns Registro plano, sem `bruto`/`liquido` quando faltar a interseção `rh` + `financeiro`.
 */
export function sanitizePayrollImportItem<T extends Record<string, any> | null | undefined>(
  item: T,
  user: RhRequestingUserContext | undefined | null,
): Record<string, any> | null {
  return omitSensitiveFields(item, PAYROLL_IMPORT_ITEM_SENSITIVE_FIELDS, canViewPayrollIndividualValues(user));
}
