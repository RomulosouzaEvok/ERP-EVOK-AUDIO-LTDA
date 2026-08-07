/**
 * Use case: registrar reunião (ordinária/extraordinária) da CIPA com ata
 * obrigatória para ordinárias (BR-SST-023, RF-SST-032). `acoes_corretivas`
 * opcionais no payload geram `SstAcaoCorretiva` com `origem: 'reuniao_cipa'`
 * (RF-SST-034).
 *
 * @module modules/sst/application/use-cases/cipa/CreateMeetingUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import { fromMeetingInput, toMeetingDTO } from '../../../infrastructure/mappers/CipaMapper';

const TIPOS = ['ordinaria', 'extraordinaria'];

interface CreateMeetingInput {
  body: Record<string, any>;
  createdBy: number;
}

class CreateMeetingUseCase extends UseCase<CreateMeetingInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes, `tipo` inválido, ou ata ausente em reunião `ordinaria` (400/BR-SST-023).
   * @throws {NotFoundError} Mandato não encontrado (404).
   */
  public async execute({ body, createdBy }: CreateMeetingInput): Promise<any> {
    const mandateId = body.mandate_id ?? body.mandato_id;
    if (!mandateId || !body.data || !body.tipo) throw new ValidationError('mandate_id, data e tipo são obrigatórios.');
    if (!TIPOS.includes(body.tipo)) throw new ValidationError(`tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.`);
    if (body.tipo === 'ordinaria' && !body.ata_texto && !body.ata_arquivo_url) {
      throw new ValidationError('Reunião ordinária exige ata_texto ou ata_arquivo_url (BR-SST-023).');
    }

    const mandato = await this.cipaRepository.findMandateById(mandateId);
    if (!mandato) throw new NotFoundError('Mandato de CIPA não encontrado.');

    const reuniao = await this.cipaRepository.createMeeting({ ...fromMeetingInput(body), created_by: createdBy });

    const acoesCriadas: any[] = [];
    for (const acao of body.acoes_corretivas ?? []) {
      const criada = await this.cipaRepository.createCorrectiveAction({
        origem_tipo: 'reuniao_cipa',
        origem_id: reuniao.id,
        descricao: acao.descricao,
        responsavel_id: acao.responsavel_id,
        prazo: acao.prazo,
        status: 'aberta',
        created_by: createdBy
      });
      acoesCriadas.push({ id: criada.id, descricao: criada.descricao });
    }

    return { ...toMeetingDTO(reuniao), acoes_corretivas: acoesCriadas };
  }
}

export = CreateMeetingUseCase;
