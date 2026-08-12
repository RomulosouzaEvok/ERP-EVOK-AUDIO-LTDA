/**
 * Tipos do `EmployeeDirectoryService`, extraídos para arquivo próprio.
 *
 * Motivo (armadilha ESM+CJS já documentada em
 * `docs/business/BLOCO_6_RH_API.md` §2): `EmployeeDirectoryService.ts` usa
 * `export =` (convenção do projeto para classes/serviços), e o TypeScript
 * proíbe `export =` conviver com qualquer outro `export` no mesmo arquivo —
 * foi exatamente esse erro que quebrou o typecheck na passada 1 deste bloco.
 *
 * @module modules/rh/application/services/EmployeeDirectoryTypes
 */

/** Dados mínimos de criação de funcionário na conclusão da admissão (RF-RH-009, §4.3 do contrato de API). */
export interface CreateEmployeeFromAdmissionData {
  name: string;
  cpf: string;
  department_id: number;
  job_position_id: number | null;
  salary: number;
  hire_date: string;
  work_regime: string;
  shift: string;
}

/** Funcionário ativo com cargo — insumo do relatório "quem não pode operar" (RF-RH-058). */
export interface ActiveEmployeeWithJobPosition {
  id: number;
  name: string;
  department_id: number | null;
  job_position_id: number | null;
}
