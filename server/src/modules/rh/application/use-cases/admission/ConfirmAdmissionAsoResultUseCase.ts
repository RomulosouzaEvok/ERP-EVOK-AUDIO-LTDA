/**
 * `PATCH /api/rh/admission-processes/:id/aso-confirmation` — RF-RH-008/030.
 *
 * ⚠️ Endpoint ADICIONADO nesta implementação, fora do que
 * `docs/business/BLOCO_6_RH_API.md` §4 documentava explicitamente: o
 * contrato de API descreve o gate de conclusão da admissão como dependente
 * de `hr_admission_processes.aso_result`/`aso_confirmed_at`/`aso_valid_until`
 * (snapshot direto, ver comentário da migration `20260808-000015`), mas
 * NENHUM endpoint do contrato grava esses 3 campos — só existem
 * `POST .../request-aso` (muda o status para `aso_pendente`) e
 * `POST .../checklist` (documentos gerais, não ASO). Sem este endpoint, o
 * gate de `ConcludeAdmissionProcessUseCase` nunca poderia ser satisfeito.
 * Reportado no HANDOFF_CODEX como gap real do contrato de API (não
 * detectado pela auditoria cruzada, que verificou rastreabilidade
 * RF→tabela→endpoint, mas não o ciclo de vida completo de gravação de cada
 * campo).
 *
 * @module modules/rh/application/use-cases/admission/ConfirmAdmissionAsoResultUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import AdmissionProcessRepository from '../../../domain/repositories/AdmissionProcessRepository';

const VALID_RESULTS = ['apto', 'inapto', 'apto_com_restricao'];

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface ConfirmAdmissionAsoResultInput {
  id: number | string;
  aso_result: 'apto' | 'inapto' | 'apto_com_restricao';
  aso_valid_until?: string | null;
}

class ConfirmAdmissionAsoResultUseCase extends UseCase<ConfirmAdmissionAsoResultInput, any> {
  private readonly repository: AdmissionProcessRepository;

  public constructor(repository: AdmissionProcessRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `aso_result` fora do enum (400).
   * @throws {NotFoundError} Processo não existe (404).
   * @throws {BusinessRuleError} Processo já `concluida`/`cancelada` (422).
   */
  public async execute({ id, aso_result, aso_valid_until }: ConfirmAdmissionAsoResultInput): Promise<any> {
    if (!VALID_RESULTS.includes(aso_result)) {
      throw new ValidationError(`aso_result deve ser um de: ${VALID_RESULTS.join(', ')}.`);
    }
    const process = await this.repository.findById(id);
    if (!process) throw new NotFoundError('Processo de admissão não encontrado.');
    if (['concluida', 'cancelada'].includes(process.status)) {
      throw new BusinessRuleError('Processo de admissão já está concluído/cancelado.');
    }

    return this.repository.update(id, {
      aso_result,
      aso_confirmed_at: new Date(),
      aso_valid_until: aso_valid_until ?? null,
    });
  }
}

export = ConfirmAdmissionAsoResultUseCase;
