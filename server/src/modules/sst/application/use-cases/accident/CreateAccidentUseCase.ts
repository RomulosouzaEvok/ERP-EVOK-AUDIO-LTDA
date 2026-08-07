/**
 * Use case: registrar um acidente de trabalho (UC-46, RF-SST-022/023).
 *
 * Diferente de EntregaEPI, o acidente NÃO tem uma fase de rascunho exposta
 * pela API (`BLOCO_1_SST_API.md` §3: "Registra o acidente (imutável a
 * partir daqui)") — este use case já cria o registro com `confirmado =
 * true`, ativando a trava de imutabilidade do trigger
 * `sst_lock_acidente` imediatamente. `dias_perdidos`/`houve_cat`
 * continuam editáveis depois via `POST /:id/complements`.
 *
 * @module modules/sst/application/use-cases/accident/CreateAccidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { ValidationError } from '../../../../../errors';
import { fromAccidentInput, toAccidentDTO } from '../../../infrastructure/mappers/AccidentMapper';

const { sequelize } = require('../../../../../config/database');

const TIPOS = ['tipico', 'trajeto', 'doenca_ocupacional'];
const GRAVIDADES = ['sem_afastamento', 'com_afastamento', 'incapacidade_permanente', 'obito'];

interface CreateAccidentInput {
  body: Record<string, any>;
  registradoPor: number;
}

class CreateAccidentUseCase extends UseCase<CreateAccidentInput, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /** @throws {ValidationError} Campos obrigatórios ausentes ou enum inválido (400). */
  public async execute({ body, registradoPor }: CreateAccidentInput): Promise<any> {
    const { employee_id, data_hora, tipo, gravidade, local_setor, descricao } = body;
    if (!employee_id || !data_hora || !tipo || !gravidade || !local_setor || !descricao) {
      throw new ValidationError('employee_id, data_hora, tipo, gravidade, local_setor e descricao são obrigatórios.');
    }
    if (!TIPOS.includes(tipo)) throw new ValidationError(`tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.`);
    if (!GRAVIDADES.includes(gravidade)) throw new ValidationError(`gravidade inválida. Valores aceitos: ${GRAVIDADES.join(', ')}.`);

    const t = await sequelize.transaction();
    try {
      const acidente = await this.accidentRepository.createAccident({
        ...fromAccidentInput(body),
        confirmado: true,
        confirmado_em: new Date(),
        registrado_por: registradoPor
      }, t);

      const testemunhas: number[] = Array.isArray(body.testemunhas) ? body.testemunhas : [];
      await this.accidentRepository.createWitnesses(acidente.id, testemunhas, t);

      await t.commit();
      const full = await this.accidentRepository.findAccidentById(acidente.id);
      return toAccidentDTO(full);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateAccidentUseCase;
