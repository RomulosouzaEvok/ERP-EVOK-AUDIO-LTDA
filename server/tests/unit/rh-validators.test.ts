/**
 * Guarda de literais de ENUM do módulo RH — cruza **cada** `z.enum([...])`
 * de `presentation/validators/rhEnums.ts` contra o `Sequelize.ENUM(...)`
 * lido diretamente do arquivo de migration que cria a coluna.
 *
 * ## Por que este teste existe
 *
 * Armadilha real e recorrente deste projeto (ver `HANDOFF_CODEX.md`,
 * entradas de 2026-08-09 sobre Jurídico e TI): um literal de enum errado
 * **passa pelo typecheck e por toda a suíte** — o `where`/`create` do
 * Sequelize é `any` e os testes de use case usam repositório mockado — e só
 * explode em produção como `invalid input value for enum ...`, um 500 que o
 * `errorHandler` não mapeia para 400. Comparar o validador com a migration
 * por leitura de arquivo é a única checagem que pega isso sem banco.
 *
 * Também protege contra a divergência inversa: alguém alterar o ENUM na
 * migration (ainda não aplicada) e esquecer o validador.
 *
 * @module tests/unit/rh-validators
 */

import fs from 'fs';
import path from 'path';
import {
  admissionStatusEnum, asoResultEnum, contractTypeEnum, contractStatusEnum,
  terminationTypeEnum, noticeModalityEnum, terminationStatusEnum,
  documentTypeEnum, documentOriginEnum, accrualStatusEnum, scheduleStatusEnum,
  employeeWorkRegimeEnum, employeeShiftEnum,
} from '../../src/modules/rh/presentation/validators/rhEnums';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const EMPLOYEE_MODEL = path.resolve(__dirname, '../../src/models/Employee.ts');

/**
 * Extrai os literais de `ENUM(...)` declarado logo após `columnName:` no
 * arquivo informado. Funciona tanto para `Sequelize.ENUM` (migration)
 * quanto para `DataTypes.ENUM` (model).
 */
function readEnumLiterals(filePath: string, columnName: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Uma mesma chave aparece mais de uma vez no arquivo (ex.: `shift:` na
  // interface de tipos de `Employee.ts` E na definição do model). Só serve
  // a ocorrência cujo `.ENUM(` vem logo em seguida — daí a janela curta.
  const LOOKAHEAD = 140;
  for (const match of content.matchAll(new RegExp(`\\b${columnName}:`, 'g'))) {
    const start = match.index ?? 0;
    const window = content.slice(start, start + LOOKAHEAD);
    const relativeEnumIndex = window.indexOf('.ENUM(');
    if (relativeEnumIndex < 0) continue;

    const openParen = start + relativeEnumIndex + '.ENUM('.length;
    const closeParen = content.indexOf(')', openParen);
    const inside = content.slice(openParen, closeParen);
    return Array.from(inside.matchAll(/'([^']+)'/g)).map((literal) => literal[1]);
  }

  throw new Error(`ENUM da coluna "${columnName}" não encontrado em ${path.basename(filePath)}.`);
}

function migration(fileName: string): string {
  return path.join(MIGRATIONS_DIR, fileName);
}

const ADMISSION = migration('20260808-000015-create-hr-admission-processes.cjs');
const TERMINATION = migration('20260808-000016-create-hr-termination-processes.cjs');
const CONTRACT = migration('20260808-000014-create-hr-employee-contracts.cjs');
const DOCUMENT = migration('20260808-000017-create-hr-employee-documents.cjs');
const ACCRUAL = migration('20260808-000018-create-hr-vacation-accrual-periods.cjs');
const SCHEDULE = migration('20260808-000019-create-hr-vacation-schedules.cjs');

const CASES: Array<[string, { options: readonly string[] }, string, string]> = [
  ['hr_admission_processes.status', admissionStatusEnum, ADMISSION, 'status'],
  ['hr_admission_processes.aso_result', asoResultEnum, ADMISSION, 'aso_result'],
  ['hr_employee_contracts.type', contractTypeEnum, CONTRACT, 'type'],
  ['hr_employee_contracts.status', contractStatusEnum, CONTRACT, 'status'],
  ['hr_termination_processes.termination_type', terminationTypeEnum, TERMINATION, 'termination_type'],
  ['hr_termination_processes.notice_modality', noticeModalityEnum, TERMINATION, 'notice_modality'],
  ['hr_termination_processes.status', terminationStatusEnum, TERMINATION, 'status'],
  ['hr_employee_documents.doc_type', documentTypeEnum, DOCUMENT, 'doc_type'],
  ['hr_employee_documents.origin', documentOriginEnum, DOCUMENT, 'origin'],
  ['hr_employee_documents.aptitude_result', asoResultEnum, DOCUMENT, 'aptitude_result'],
  ['hr_vacation_accrual_periods.status', accrualStatusEnum, ACCRUAL, 'status'],
  ['hr_vacation_schedules.status', scheduleStatusEnum, SCHEDULE, 'status'],
  ['employees.work_regime', employeeWorkRegimeEnum, EMPLOYEE_MODEL, 'work_regime'],
  ['employees.shift', employeeShiftEnum, EMPLOYEE_MODEL, 'shift'],
];

describe('rhEnums — todo literal do validador existe no ENUM real da coluna', () => {
  it.each(CASES)('%s', (_label, zodEnum, filePath, columnName) => {
    expect([...zodEnum.options].sort()).toEqual(readEnumLiterals(filePath, columnName).sort());
  });
});

describe('rhEnums — armadilhas específicas conhecidas', () => {
  it('employees.work_regime NÃO aceita "experiencia" (exemplo errado de §4.3 do contrato de API)', () => {
    expect(employeeWorkRegimeEnum.options).not.toContain('experiencia');
    expect(contractTypeEnum.options).toContain('experiencia');
  });

  it('hr_termination_processes.status usa "concluido"/"cancelado" (masculino), diferente de admissão', () => {
    expect(terminationStatusEnum.options).toContain('concluido');
    expect(admissionStatusEnum.options).toContain('concluida');
  });
});

describe('Validators do módulo RH — .strict() e regras de payload', () => {
  const {
    createAdmissionProcessSchema, concludeAdmissionSchema, cancelAdmissionSchema,
  } = require('../../src/modules/rh/presentation/validators/admissionValidators');
  const { decideContractSchema } = require('../../src/modules/rh/presentation/validators/employeeContractValidators');
  const { createTerminationSchema } = require('../../src/modules/rh/presentation/validators/terminationValidators');
  const { createEmployeeDocumentSchema } = require('../../src/modules/rh/presentation/validators/employeeDocumentValidators');
  const { createVacationScheduleSchema, reviseVacationScheduleSchema } = require('../../src/modules/rh/presentation/validators/vacationValidators');

  it('rejeita created_by no body (anti-spoofing P0 — identidade vem do JWT)', () => {
    const result = createAdmissionProcessSchema.safeParse({
      candidate_name: 'João', department_id: 3, planned_start_date: '2026-09-01', created_by: 999,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita payment_deadline no body (coluna GERADA pelo banco, Art. 477 §6º CLT)', () => {
    const result = createTerminationSchema.safeParse({
      employee_id: 501, termination_type: 'pedido', notice_date: '2026-08-10',
      notice_modality: 'trabalhado', payment_deadline: '2026-08-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita campo de conteúdo clínico em documento aso_* (RF-RH-028, LGPD art. 5º II)', () => {
    const result = createEmployeeDocumentSchema.safeParse({
      employee_id: 501, doc_type: 'aso_retorno', fitness_result: 'apto', diagnostico: 'lombalgia',
    });
    expect(result.success).toBe(false);
  });

  it('exige fitness_result em documento aso_* (RF-RH-028)', () => {
    expect(createEmployeeDocumentSchema.safeParse({ employee_id: 501, doc_type: 'aso_demissional' }).success).toBe(false);
    expect(createEmployeeDocumentSchema.safeParse({ employee_id: 501, doc_type: 'aso_demissional', fitness_result: 'apto' }).success).toBe(true);
  });

  it('exige period_1_end_date quando contract_type=experiencia (Art. 445 § único, CLT)', () => {
    const base = { employee: { name: 'João', cpf: '52998224725', hire_date: '2026-09-01' } };
    expect(concludeAdmissionSchema.safeParse({ ...base, contract_type: 'experiencia' }).success).toBe(false);
    expect(concludeAdmissionSchema.safeParse({ ...base, contract_type: 'experiencia', period_1_end_date: '2026-10-30' }).success).toBe(true);
    expect(concludeAdmissionSchema.safeParse({ ...base, contract_type: 'indeterminado' }).success).toBe(true);
  });

  it('exige period_2_end_date quando decision=prorrogar', () => {
    expect(decideContractSchema.safeParse({ decision: 'prorrogar' }).success).toBe(false);
    expect(decideContractSchema.safeParse({ decision: 'prorrogar', period_2_end_date: '2026-10-30' }).success).toBe(true);
    expect(decideContractSchema.safeParse({ decision: 'efetivar' }).success).toBe(true);
  });

  it('exige abono_days quando abono=true (Art. 143, caput, CLT)', () => {
    const base = { accrual_period_id: 88, start_date: '2026-12-07', days: 20 };
    expect(createVacationScheduleSchema.safeParse({ ...base, abono: true }).success).toBe(false);
    expect(createVacationScheduleSchema.safeParse({ ...base, abono: true, abono_days: 10 }).success).toBe(true);
  });

  it('exige reason na revisão de programação de férias (RF-RH-040)', () => {
    expect(reviseVacationScheduleSchema.safeParse({ start_date: '2026-12-07', days: 20 }).success).toBe(false);
    expect(reviseVacationScheduleSchema.safeParse({ reason: 'remarcado', start_date: '2026-12-07', days: 20 }).success).toBe(true);
  });

  it('exige reason no cancelamento de admissão (RF-RH-012 — nunca exclusão física)', () => {
    expect(cancelAdmissionSchema.safeParse({}).success).toBe(false);
    expect(cancelAdmissionSchema.safeParse({ reason: 'Candidato desistiu.' }).success).toBe(true);
  });

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    const result = createTerminationSchema.safeParse({
      employee_id: 501, termination_type: 'pedido', notice_date: '10/08/2026', notice_modality: 'trabalhado',
    });
    expect(result.success).toBe(false);
  });
});
