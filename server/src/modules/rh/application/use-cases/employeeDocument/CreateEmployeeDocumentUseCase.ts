/**
 * `POST /api/rh/employee-documents` — RF-RH-027/028 (multipart, reaproveita
 * Multer já existente no projeto — o controller resolve `file_path`).
 *
 * Para `doc_type` iniciado em `aso_`: apenas aptidão (`fitness_result`) e
 * `valid_until` são aceitos — nunca conteúdo clínico (RF-RH-028, LGPD art.
 * 5º II).
 *
 * @module modules/rh/application/use-cases/employeeDocument/CreateEmployeeDocumentUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';

const DOC_TYPES = [
  'rg', 'cpf', 'ctps',
  'aso_admissional', 'aso_periodico', 'aso_retorno', 'aso_mudanca_risco', 'aso_demissional',
  'contrato', 'certificado', 'outro',
];
const FITNESS_RESULTS = ['apto', 'inapto', 'apto_com_restricao'];

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface CreateEmployeeDocumentInput {
  employee_id: number;
  doc_type: string;
  file_path: string;
  valid_until?: string | null;
  fitness_result?: string | null;
  origin?: 'rh' | 'sst';
  uploadedBy: number;
}

class CreateEmployeeDocumentUseCase extends UseCase<CreateEmployeeDocumentInput, any> {
  private readonly repository: EmployeeDocumentRepository;

  public constructor(repository: EmployeeDocumentRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} `employee_id`/`doc_type`/`file_path` ausentes; `doc_type` fora do enum (400). */
  public async execute(input: CreateEmployeeDocumentInput): Promise<any> {
    if (!input.employee_id || !input.doc_type || !input.file_path) {
      throw new ValidationError('employee_id, doc_type e file (arquivo) são obrigatórios.');
    }
    if (!DOC_TYPES.includes(input.doc_type)) {
      throw new ValidationError(`doc_type deve ser um de: ${DOC_TYPES.join(', ')}.`);
    }
    if (input.fitness_result && !FITNESS_RESULTS.includes(input.fitness_result)) {
      throw new ValidationError(`fitness_result deve ser um de: ${FITNESS_RESULTS.join(', ')}.`);
    }

    return this.repository.create({
      employee_id: input.employee_id,
      doc_type: input.doc_type,
      file_path: input.file_path,
      valid_until: input.valid_until ?? null,
      aptitude_result: input.fitness_result ?? null,
      origin: input.origin ?? 'rh',
      uploaded_by: input.uploadedBy,
    });
  }
}

export = CreateEmployeeDocumentUseCase;
