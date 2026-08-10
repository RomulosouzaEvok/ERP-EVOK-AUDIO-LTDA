/**
 * `POST /api/rh/admission-processes` — cria `AdmissionProcess` (RF-RH-007).
 * @module modules/rh/application/use-cases/admission/CreateAdmissionProcessUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

const CHECKLIST_MAP: Record<string, string> = {
  rg: 'checklist_rg',
  cpf: 'checklist_cpf',
  ctps_digital: 'checklist_ctps',
  pis: 'checklist_pis',
  comprovante_residencia: 'checklist_proof_of_address',
  foto: 'checklist_photo',
};

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface CreateAdmissionProcessInput {
  candidate_id?: number | null;
  job_vacancy_id?: number | null;
  candidate_name: string;
  candidate_cpf?: string | null;
  department_id: number;
  job_position_id?: number | null;
  planned_start_date: string;
  required_documents?: string[];
  createdBy: number;
}

class CreateAdmissionProcessUseCase extends UseCase<CreateAdmissionProcessInput, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `candidate_name`/`department_id`/`planned_start_date` ausentes (400). */
  public async execute(input: CreateAdmissionProcessInput): Promise<any> {
    if (!input.candidate_name || !input.department_id || !input.planned_start_date) {
      throw new ValidationError('candidate_name, department_id e planned_start_date são obrigatórios.');
    }

    const checklistFlags: Record<string, boolean> = {};
    for (const key of Object.values(CHECKLIST_MAP)) checklistFlags[key] = false;
    // O checklist inicial (`required_documents`) apenas declara QUAIS itens
    // são exigidos neste processo — nenhum item nasce marcado como recebido
    // (RF-RH-007); a confirmação de recebimento é feita via
    // `POST .../checklist` (UpdateAdmissionChecklistUseCase).

    return this.repository.create({
      candidate_id: input.candidate_id ?? null,
      job_vacancy_id: input.job_vacancy_id ?? null,
      candidate_name: input.candidate_name,
      candidate_cpf: input.candidate_cpf ?? null,
      department_id: input.department_id,
      job_position_id: input.job_position_id ?? null,
      planned_start_date: input.planned_start_date,
      ...checklistFlags,
      status: 'documentos_pendentes',
      created_by: input.createdBy,
    });
  }
}

export = CreateAdmissionProcessUseCase;
