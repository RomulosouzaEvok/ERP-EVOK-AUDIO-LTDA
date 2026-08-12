/**
 * Adapter de `TrainingMatrixService` — chama `ListTrainingMatrixUseCase` de
 * `modules/sst/` diretamente (import de use case, não HTTP interno), mesmo
 * padrão já usado por `SstAsoServiceAdapter` para a ponte RH→SST. Nunca lê o
 * model `SstMatrizTreinamento` diretamente aqui.
 *
 * `nr_code` do RH é texto livre; `sst_matriz_treinamento.norma` é ENUM
 * fechado — um `nr_code` fora do enum faz o Postgres rejeitar o filtro com
 * `invalid input value for enum` (SQLSTATE `22P02`). Esse erro específico é
 * tratado como "norma não cadastrada na matriz" (mesmo resultado de uma
 * busca vazia); qualquer OUTRO erro (ex.: banco fora do ar) sobe normalmente
 * — não deve ser confundido com "sem correspondência".
 *
 * @module modules/rh/infrastructure/adapters/TrainingMatrixServiceAdapter
 */
import TrainingMatrixService from '../../application/services/TrainingMatrixService';

const SequelizeTrainingRepository = require('../../../sst/infrastructure/sequelize/SequelizeTrainingRepository');
const ListTrainingMatrixUseCase = require('../../../sst/application/use-cases/training/ListTrainingMatrixUseCase');

/** SQLSTATE do Postgres para valor de ENUM inválido ("invalid input value for enum ..."). */
const INVALID_ENUM_SQLSTATE = '22P02';

function isInvalidEnumError(error: any): boolean {
  return error?.parent?.code === INVALID_ENUM_SQLSTATE || error?.original?.code === INVALID_ENUM_SQLSTATE;
}

class TrainingMatrixServiceAdapter extends TrainingMatrixService {
  public async findValidityByNrCode(nrCode: string): Promise<{ periodicidade_meses: number | null } | null> {
    const trainingRepository = new SequelizeTrainingRepository();
    const useCase = new ListTrainingMatrixUseCase(trainingRepository);

    let rows: any[];
    try {
      const result = await useCase.execute({ norma: nrCode, page: '1', limit: '200' });
      rows = result.rows;
    } catch (error) {
      if (isInvalidEnumError(error)) return null;
      throw error;
    }

    const activeRows = rows.filter((row: any) => row.active !== false);
    if (activeRows.length === 0) return null;

    const definedValues = activeRows
      .map((row: any) => row.periodicidade_meses)
      .filter((value: any): value is number => value !== null && value !== undefined);

    return { periodicidade_meses: definedValues.length > 0 ? Math.min(...definedValues) : null };
  }
}

export = TrainingMatrixServiceAdapter;
