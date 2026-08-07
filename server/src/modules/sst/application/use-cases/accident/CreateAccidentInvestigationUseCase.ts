/**
 * Use case: abrir a InvestigacaoAcidente (RF-SST-026, UC-46). Cada item de
 * `acoes_corretivas` (opcional, mas recomendado) gera um `AcaoCorretiva`
 * com `origem: 'investigacao_acidente'`.
 *
 * @module modules/sst/application/use-cases/accident/CreateAccidentInvestigationUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { NotFoundError, ConflictError } from '../../../../../errors';

const { sequelize } = require('../../../../../config/database');

interface CreateAccidentInvestigationInput {
  accidentId: string | number;
  body: {
    participantes?: number[];
    causas?: string[];
    evidencias?: string[];
    acoes_corretivas?: Array<{ descricao: string; responsavel_id: number; prazo: string }>;
  };
  createdBy: number;
}

class CreateAccidentInvestigationUseCase extends UseCase<CreateAccidentInvestigationInput, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /**
   * @throws {NotFoundError} Se o acidente não existir (404).
   * @throws {ConflictError} Se o acidente já tiver investigação (409 — `acidente_id` é UNIQUE).
   */
  public async execute({ accidentId, body, createdBy }: CreateAccidentInvestigationInput): Promise<any> {
    const acidente = await this.accidentRepository.findAccidentById(accidentId);
    if (!acidente) throw new NotFoundError('Acidente não encontrado.');

    const existente = await this.accidentRepository.findInvestigationByAccidentId(acidente.id);
    if (existente) throw new ConflictError('Este acidente já possui uma investigação.');

    const t = await sequelize.transaction();
    try {
      const investigacao = await this.accidentRepository.createInvestigation({
        acidente_id: acidente.id,
        causas_identificadas: (body.causas ?? []).join(' | ') || null,
        participantes: (body.participantes ?? []).join(', ') || null,
        evidencias_urls: (body.evidencias ?? []).join(' | ') || null,
        created_by: createdBy
      }, t);

      const acoesCriadas: any[] = [];
      for (const acao of body.acoes_corretivas ?? []) {
        const criada = await this.accidentRepository.createCorrectiveAction({
          origem_tipo: 'investigacao_acidente',
          origem_id: investigacao.id,
          descricao: acao.descricao,
          responsavel_id: acao.responsavel_id,
          prazo: acao.prazo,
          status: 'aberta',
          created_by: createdBy
        }, t);
        acoesCriadas.push({ id: criada.id, descricao: criada.descricao, responsavel_id: criada.responsavel_id, prazo: criada.prazo, status: criada.status });
      }

      await t.commit();
      return {
        id: investigacao.id,
        acidente_id: investigacao.acidente_id,
        causas_identificadas: investigacao.causas_identificadas,
        participantes: investigacao.participantes,
        evidencias_urls: investigacao.evidencias_urls,
        acoes_corretivas: acoesCriadas
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateAccidentInvestigationUseCase;
