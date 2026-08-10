/**
 * `POST /api/rh/termination-processes` — RF-RH-017/019, §6.1 do contrato de
 * API, UC-70.
 *
 * `payment_deadline` (Art. 477 §6º CLT) é coluna GERADA pelo banco a partir
 * de `termination_date` — nunca gravado pela aplicação (ver
 * `terminationRules.calculatePaymentDeadline`, usado aqui apenas para
 * compor `suggested_payment_deadline` na resposta, sem gravar).
 *
 * @module modules/rh/application/use-cases/termination/CreateTerminationProcessUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError, ConflictError } from '../../../../../errors';
import TerminationProcessRepository from '../../../domain/repositories/TerminationProcessRepository';
import {
  calculateCompletedYearsOfService,
  calculateNoticePeriodDays,
  calculatePaymentDeadline,
} from '../../../domain/services/terminationRules';

const TERMINATION_TYPES = ['pedido', 'sem_justa_causa', 'justa_causa', 'termino_experiencia', 'acordo'];
const NOTICE_MODALITIES = ['trabalhado', 'indenizado'];

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface CreateTerminationProcessInput {
  employee_id: number;
  termination_type: string;
  notice_date: string;
  notice_modality: string;
  termination_date?: string | null;
  hireDate?: string | null; // Para sugerir aviso prévio proporcional (Lei 12.506/2011) — resolvido pelo controller via Employee.hire_date.
  createdBy: number;
}

class CreateTerminationProcessUseCase extends UseCase<CreateTerminationProcessInput, any> {
  private readonly repository: TerminationProcessRepository;

  public constructor(repository: TerminationProcessRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes; enum inválido (400).
   * @throws {ConflictError} Já existe `TerminationProcess` aberto para o funcionário (409).
   */
  public async execute(input: CreateTerminationProcessInput): Promise<any> {
    if (!input.employee_id || !input.termination_type || !input.notice_date) {
      throw new ValidationError('employee_id, termination_type e notice_date são obrigatórios.');
    }
    if (!TERMINATION_TYPES.includes(input.termination_type)) {
      throw new ValidationError(`termination_type deve ser um de: ${TERMINATION_TYPES.join(', ')}.`);
    }
    if (!NOTICE_MODALITIES.includes(input.notice_modality)) {
      throw new ValidationError(`notice_modality deve ser um de: ${NOTICE_MODALITIES.join(', ')}.`);
    }

    const existingOpen = await this.repository.findOpenByEmployeeId(input.employee_id);
    if (existingOpen) {
      throw new ConflictError('Já existe um processo de demissão em aberto para este funcionário.');
    }

    const record = await this.repository.create({
      employee_id: input.employee_id,
      termination_type: input.termination_type,
      notice_date: input.notice_date,
      notice_modality: input.notice_modality,
      termination_date: input.termination_date ?? null,
      status: 'aberto',
      created_by: input.createdBy,
    });

    let suggestedNoticeDays: number | null = null;
    let suggestedPaymentDeadline: string | null = null;
    if (input.hireDate) {
      // Aniversário de calendário, NÃO divisão por 365,25 — ver a correção
      // de bug documentada em `calculateCompletedYearsOfService`
      // (Lei 12.506/2011, parágrafo único).
      const completedYears = calculateCompletedYearsOfService(input.hireDate, input.notice_date);
      suggestedNoticeDays = calculateNoticePeriodDays(completedYears);
    }
    if (input.termination_date) {
      suggestedPaymentDeadline = calculatePaymentDeadline(input.termination_date);
    }

    const plain = typeof record?.toJSON === 'function' ? record.toJSON() : record;
    return { ...plain, suggested_notice_days: suggestedNoticeDays, suggested_payment_deadline: suggestedPaymentDeadline };
  }
}

export = CreateTerminationProcessUseCase;
