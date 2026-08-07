/**
 * Use case: emitir CAT tipo `reabertura` vinculada ao mesmo acidente
 * (RF-SST-024). Reabertura = SEMPRE uma nova linha, nunca edição da CAT
 * original (imutabilidade por desenho).
 *
 * @module modules/sst/application/use-cases/accident/ReopenCatUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { NotFoundError } from '../../../../../errors';
import { calcularPrazoLimiteCat } from '../../../domain/services/legalDeadlineService';
import { toCatDTO } from '../../../infrastructure/mappers/AccidentMapper';

const { sequelize } = require('../../../../../config/database');

interface ReopenCatInput {
  catId: string | number;
  emitenteId: number;
}

class ReopenCatUseCase extends UseCase<ReopenCatInput, any> {
  private readonly accidentRepository: AccidentRepository;
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(accidentRepository: AccidentRepository, esocialEventRepository: EsocialEventRepository) {
    super();
    this.accidentRepository = accidentRepository;
    this.esocialEventRepository = esocialEventRepository;
  }

  /** @throws {NotFoundError} Se a CAT original não existir (404). */
  public async execute({ catId, emitenteId }: ReopenCatInput): Promise<any> {
    const original = await this.accidentRepository.findCatById(catId);
    if (!original) throw new NotFoundError('CAT não encontrada.');

    const acidente = await this.accidentRepository.findAccidentById(original.acidente_id);
    const prazoLimite = calcularPrazoLimiteCat(new Date(), acidente.gravidade);

    const t = await sequelize.transaction();
    try {
      const cat = await this.accidentRepository.createCat({
        acidente_id: original.acidente_id,
        tipo: 'reabertura',
        data_emissao: new Date().toISOString().slice(0, 10),
        prazo_limite: prazoLimite,
        emitente_id: emitenteId,
        status_esocial_s2210: 'pendente'
      }, t);

      await this.esocialEventRepository.create({
        tipo: 'S-2210',
        origem_tipo: 'cat',
        origem_id: cat.id,
        prazo_legal: prazoLimite,
        status: 'pendente'
      }, t);

      await t.commit();
      return toCatDTO(cat);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = ReopenCatUseCase;
