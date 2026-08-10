/**
 * Enums Zod do módulo RH — **fonte única** dos literais aceitos nos
 * payloads, conferidos **um a um** contra o `Sequelize.ENUM(...)` das
 * migrations que criam cada coluna.
 *
 * Motivo de existir um arquivo só para isto (armadilha real deste projeto,
 * já documentada em `docs/governance/HANDOFF_CODEX.md`, entrada
 * "2026-08-09 — Correção de robustez: valida enums do módulo TI"): um
 * literal de enum errado **passa pelo typecheck e por 1200+ testes** (o
 * `where` do Sequelize é `any` e os testes usam repositório mockado) e só
 * explode em runtime como `invalid input value for enum ...` — um 500 que
 * o `errorHandler` não mapeia para 400. Centralizar os literais aqui torna
 * a conferência com a migration um passo único e auditável, em vez de
 * espalhado por 5 validators.
 *
 * | Enum | Migration de origem | Coluna |
 * |---|---|---|
 * | `admissionStatusEnum` | `20260808-000015` | `hr_admission_processes.status` |
 * | `asoResultEnum` | `20260808-000015` / `-000016` / `-000017` | `aso_result` / `aptitude_result` |
 * | `contractTypeEnum` | `20260808-000014` | `hr_employee_contracts.type` |
 * | `contractStatusEnum` | `20260808-000014` | `hr_employee_contracts.status` |
 * | `terminationTypeEnum` | `20260808-000016` | `hr_termination_processes.termination_type` |
 * | `noticeModalityEnum` | `20260808-000016` | `hr_termination_processes.notice_modality` |
 * | `terminationStatusEnum` | `20260808-000016` | `hr_termination_processes.status` |
 * | `documentTypeEnum` | `20260808-000017` | `hr_employee_documents.doc_type` |
 * | `documentOriginEnum` | `20260808-000017` | `hr_employee_documents.origin` |
 * | `accrualStatusEnum` | `20260808-000018` | `hr_vacation_accrual_periods.status` |
 * | `scheduleStatusEnum` | `20260808-000019` | `hr_vacation_schedules.status` |
 * | `employeeWorkRegimeEnum` | `src/models/Employee.ts` (já em produção) | `employees.work_regime` |
 * | `employeeShiftEnum` | `src/models/Employee.ts` (já em produção) | `employees.shift` |
 *
 * @module modules/rh/presentation/validators/rhEnums
 */

import { z } from 'zod';

export const admissionStatusEnum = z.enum(['documentos_pendentes', 'aso_pendente', 'aguardando_esocial', 'concluida', 'cancelada']);
export const asoResultEnum = z.enum(['apto', 'inapto', 'apto_com_restricao']);
export const contractTypeEnum = z.enum(['indeterminado', 'experiencia', 'aprendiz', 'estagio']);
export const contractStatusEnum = z.enum(['ativo', 'prorrogado', 'efetivado', 'indeterminado_automatico', 'rescindido']);
export const terminationTypeEnum = z.enum(['pedido', 'sem_justa_causa', 'justa_causa', 'termino_experiencia', 'acordo']);
export const noticeModalityEnum = z.enum(['trabalhado', 'indenizado']);
export const terminationStatusEnum = z.enum(['aberto', 'aguardando_aso', 'aguardando_trct', 'concluido', 'cancelado']);
export const documentTypeEnum = z.enum([
  'rg', 'cpf', 'ctps',
  'aso_admissional', 'aso_periodico', 'aso_retorno', 'aso_mudanca_risco', 'aso_demissional',
  'contrato', 'certificado', 'outro',
]);
export const documentOriginEnum = z.enum(['rh', 'sst']);
export const accrualStatusEnum = z.enum(['em_curso', 'programado', 'gozado', 'vencido_dobra', 'zerado']);
export const scheduleStatusEnum = z.enum(['planejado', 'confirmado', 'em_gozo', 'concluido', 'cancelado']);

/**
 * ⚠️ `employees.work_regime` **NÃO** aceita `'experiencia'`. O exemplo de
 * payload de §4.3 do contrato de API (`"work_regime": "experiencia"`) está
 * errado: experiência é TIPO DE CONTRATO (`contractTypeEnum`), não regime
 * de trabalho. Gravá-lo produziria `invalid input value for enum
 * enum_employees_work_regime` em runtime.
 */
export const employeeWorkRegimeEnum = z.enum(['clt', 'pj', 'estagiario', 'aprendiz']);
export const employeeShiftEnum = z.enum(['morning', 'afternoon', 'night', 'commercial', 'rotating']);

/** Data no formato `YYYY-MM-DD` (`DATEONLY` em todas as tabelas `hr_*`). */
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.');
