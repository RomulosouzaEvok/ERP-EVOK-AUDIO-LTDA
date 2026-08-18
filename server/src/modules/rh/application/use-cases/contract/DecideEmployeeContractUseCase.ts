/**
 * `PATCH /api/rh/employee-contracts/:id/decision` — RF-RH-016, §5.2 do
 * contrato de API, UC-68.
 *
 * `decision='rescindir'` exige nível `rh:approve` (checado na rota, não
 * aqui) e cria `HrTerminationProcess` com
 * `termination_type='termino_experiencia'` (UC-68 A1/UC-70 A1).
 *
 * @module modules/rh/application/use-cases/contract/DecideEmployeeContractUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import EmployeeContractRepository from '../../../domain/repositories/EmployeeContractRepository';
import CreateTerminationProcessUseCase from '../termination/CreateTerminationProcessUseCase';
import ExtendEmployeeContractUseCase from './ExtendEmployeeContractUseCase';

const DECISIONS = ['prorrogar', 'efetivar', 'rescindir'];

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` e o
// transpilador CJS/ESM do runtime (tsx/esbuild) quebra em tempo de EXECUÇÃO
// se um `export =` convive com qualquer outro `export` — inclusive um
// `export interface`, que o `tsc --noEmit` e o Jest (ts-jest, CJS) aceitam
// sem reclamar. Ver `docs/business/BLOCO_6_RH_API.md` §2 e o HANDOFF.
interface DecideEmployeeContractInput {
  id: number | string;
  decision: 'prorrogar' | 'efetivar' | 'rescindir';
  period_2_end_date?: string;
  termination_reason?: string;
  notice_modality?: 'trabalhado' | 'indenizado';
  createdBy: number;
}

class DecideEmployeeContractUseCase extends UseCase<DecideEmployeeContractInput, any> {
  private readonly repository: EmployeeContractRepository;
  private readonly createTerminationProcessUseCase: CreateTerminationProcessUseCase;
  private readonly extendEmployeeContractUseCase: ExtendEmployeeContractUseCase;
  private readonly runInTransaction: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>;

  public constructor(
    repository: EmployeeContractRepository,
    createTerminationProcessUseCase: CreateTerminationProcessUseCase,
    extendEmployeeContractUseCase: ExtendEmployeeContractUseCase,
    runInTransaction?: <T>(fn: (transaction: unknown) => Promise<T>) => Promise<T>,
  ) {
    super();
    this.repository = repository;
    this.createTerminationProcessUseCase = createTerminationProcessUseCase;
    this.extendEmployeeContractUseCase = extendEmployeeContractUseCase;
    this.runInTransaction = runInTransaction ?? (async (fn) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { sequelize } = require('../../../../../config/database');
      return sequelize.transaction(fn);
    });
  }

  /**
   * @throws {ValidationError} `decision` fora do enum (400).
   * @throws {NotFoundError} Contrato não existe (404).
   * @throws {BusinessRuleError} Contrato não está em `ativo`/`prorrogado`; regras de prorrogação (422).
   */
  public async execute(input: DecideEmployeeContractInput): Promise<any> {
    if (!DECISIONS.includes(input.decision)) {
      throw new ValidationError(`decision deve ser um de: ${DECISIONS.join(', ')}.`);
    }
    const contract = await this.repository.findById(input.id);
    if (!contract) throw new NotFoundError('Contrato de experiência não encontrado.');
    if (!['ativo', 'prorrogado'].includes(contract.status)) {
      throw new BusinessRuleError('Contrato não está em status ativo/prorrogado.', { rule: 'RF-RH-016' });
    }

    if (input.decision === 'prorrogar') {
      if (!input.period_2_end_date) throw new ValidationError('period_2_end_date é obrigatório para decision=prorrogar.');
      return this.extendEmployeeContractUseCase.execute({ id: input.id, period_2_end_date: input.period_2_end_date });
    }

    if (input.decision === 'efetivar') {
      // Duas escritas (fechar o de experiência + abrir o indeterminado)
      // envelopadas em UMA transação: sem ela, uma falha na segunda
      // deixaria o funcionário com o contrato de experiência marcado
      // `efetivado` e NENHUM contrato vigente — estado inconsistente e
      // legalmente indefensável (RNF-RH-04, CLAUDE.md §"Transações").
      return this.runInTransaction(async (transaction) => {
        await this.repository.update(input.id, { status: 'efetivado' }, transaction);
        // RF-RH-013 — registro histórico imutável: efetivação cria um NOVO
        // `HrEmployeeContract` (type=indeterminado), nunca sobrescreve o de experiência.
        return this.repository.create({
          employee_id: contract.employee_id,
          type: 'indeterminado',
          start_date: new Date().toISOString().slice(0, 10),
          status: 'ativo',
          created_by: input.createdBy,
        }, transaction);
      });
    }

    // decision === 'rescindir' — o contrato permanece ativo/prorrogado até
    // o `HrTerminationProcess` ser efetivamente concluído (RF-RH-022); esta
    // decisão apenas ABRE o processo formal (UC-68 A1/UC-70 A1), evitando
    // marcar o contrato como encerrado antes das travas de ASO
    // demissional/checklist de ativos serem cumpridas.
    if (!input.termination_reason?.trim() || !input.notice_modality) {
      throw new ValidationError('termination_reason e notice_modality são obrigatórios para decision=rescindir.');
    }
    return this.createTerminationProcessUseCase.execute({
      employee_id: contract.employee_id,
      termination_type: 'termino_experiencia',
      notice_date: new Date().toISOString().slice(0, 10),
      // APR-2026-057/P14: os contratos de experiência da Evok têm cláusula
      // assecuratória (art. 481 CLT); aplica-se aviso prévio normal escolhido
      // pelo RH (trabalhado ou indenizado), não a indenização do art. 479.
      notice_modality: input.notice_modality,
      termination_reason: input.termination_reason.trim(),
      termination_date: null,
      createdBy: input.createdBy,
    });
  }
}

export = DecideEmployeeContractUseCase;
