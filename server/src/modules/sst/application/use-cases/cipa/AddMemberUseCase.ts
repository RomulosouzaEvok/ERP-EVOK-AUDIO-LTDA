/**
 * Use case: adicionar MembroCIPA (eleito/designado) a um mandato
 * (RF-SST-030/031, BR-SST-021/022, UC-48).
 *
 * `fim_estabilidade` é calculado uma única vez na criação
 * (`mandato.data_fim + 1 ano`) e persistido — decisão fechada, nunca
 * recalculado por leitura (`BLOCO_1_SST_MODELO_DADOS.md` §6).
 *
 * @module modules/sst/application/use-cases/cipa/AddMemberUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../../../../errors';
import { fromMemberInput, toMemberDTO } from '../../../infrastructure/mappers/CipaMapper';

const ORIGENS = ['eleito', 'designado'];
const PAPEIS = ['presidente', 'vice_presidente', 'secretario', 'titular', 'suplente'];
const MAX_MANDATOS_CONSECUTIVOS_ELEITO = 2;

interface AddMemberInput {
  mandateId: string | number;
  body: Record<string, any>;
}

/** Soma 1 ano a uma data (YYYY-MM-DD), retornando string YYYY-MM-DD. */
function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

class AddMemberUseCase extends UseCase<AddMemberInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes ou enum inválido (400).
   * @throws {NotFoundError} Mandato não encontrado (404).
   * @throws {BusinessRuleError} `employee_id` já cumpriu 2 mandatos consecutivos como eleito (422/BR-SST-021).
   */
  public async execute({ mandateId, body }: AddMemberInput): Promise<any> {
    const { employee_id, origem, papel } = body;
    if (!employee_id || !origem || !papel) throw new ValidationError('employee_id, origem e papel são obrigatórios.');
    if (!ORIGENS.includes(origem)) throw new ValidationError(`origem inválida. Valores aceitos: ${ORIGENS.join(', ')}.`);
    if (!PAPEIS.includes(papel)) throw new ValidationError(`papel inválido. Valores aceitos: ${PAPEIS.join(', ')}.`);

    const mandato = await this.cipaRepository.findMandateById(mandateId);
    if (!mandato) throw new NotFoundError('Mandato de CIPA não encontrado.');

    if (origem === 'eleito') {
      const consecutivos = await this.cipaRepository.countConsecutiveElectedTerms(employee_id);
      if (consecutivos >= MAX_MANDATOS_CONSECUTIVOS_ELEITO) {
        throw new BusinessRuleError('Funcionário já cumpriu 2 mandatos consecutivos como eleito (BR-SST-021).');
      }
    }

    const data: Record<string, unknown> = { mandato_id: mandato.id, ...fromMemberInput(body) };
    if (origem === 'eleito') {
      data.estabilidade_fim = addOneYear(mandato.data_fim);
    }

    const membro = await this.cipaRepository.createMember(data);
    return toMemberDTO(membro);
  }
}

export = AddMemberUseCase;
