/**
 * Use case: lançar complemento de `dias_perdidos`/`houve_cat` de um
 * acidente já confirmado (RNF-SST-01, BR-SST-017) — trilha de auditoria em
 * `sst_acidente_complementos` + atualização controlada da coluna
 * consolidada em `sst_acidentes`, na MESMA transação.
 *
 * @module modules/sst/application/use-cases/accident/CreateAccidentComplementUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import { toAccidentDTO } from '../../../infrastructure/mappers/AccidentMapper';

const { sequelize } = require('../../../../../config/database');

const CAMPOS = ['dias_perdidos', 'houve_cat'];

interface CreateAccidentComplementInput {
  accidentId: string | number;
  body: { campo?: string; valor?: unknown; motivo?: string };
  registradoPor: number;
}

class CreateAccidentComplementUseCase extends UseCase<CreateAccidentComplementInput, any> {
  private readonly accidentRepository: AccidentRepository;

  public constructor(accidentRepository: AccidentRepository) {
    super();
    this.accidentRepository = accidentRepository;
  }

  /**
   * @throws {ValidationError} Se `campo`/`valor`/`motivo` ausentes ou `campo` inválido (400).
   * @throws {NotFoundError} Se o acidente não existir (404).
   */
  public async execute({ accidentId, body, registradoPor }: CreateAccidentComplementInput): Promise<any> {
    const { campo, valor, motivo } = body;
    if (!campo || valor === undefined || valor === null || !motivo) {
      throw new ValidationError('campo, valor e motivo são obrigatórios.');
    }
    if (!CAMPOS.includes(campo)) {
      throw new ValidationError(`campo inválido. Valores aceitos: ${CAMPOS.join(', ')}.`);
    }

    const t = await sequelize.transaction();
    try {
      const acidente = await this.accidentRepository.findAccidentById(accidentId, t);
      if (!acidente) throw new NotFoundError('Acidente não encontrado.');

      const valorAnterior = String(acidente[campo]);
      const valorNovo = String(valor);

      await this.accidentRepository.createComplement({
        acidente_id: acidente.id,
        campo,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        motivo,
        registrado_por: registradoPor
      }, t);

      await this.accidentRepository.updateAccidentConsolidated(acidente.id, { [campo]: valor }, t);

      await t.commit();
      const full = await this.accidentRepository.findAccidentById(accidentId);
      return toAccidentDTO(full);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateAccidentComplementUseCase;
