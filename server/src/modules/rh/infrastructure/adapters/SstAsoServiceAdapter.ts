/**
 * Adapter de `SstAsoService` — chama `GetAsoStatusUseCase` de
 * `modules/sst/` diretamente (import de use case, não HTTP interno; nunca
 * lê o model `SstAso` diretamente aqui, nem `cid`/laudo clínico). Usado
 * **apenas** por `RequestAsoUseCase` (admissão/demissão) para exibir um
 * status informativo no momento da solicitação — nunca pelo gate real de
 * conclusão (que depende de `HrEmployeeDocument`, ver `hasValidAso`).
 *
 * @module modules/rh/infrastructure/adapters/SstAsoServiceAdapter
 */
import SstAsoService from '../../application/services/SstAsoService';

const SequelizeAsoRepository = require('../../../sst/infrastructure/sequelize/SequelizeAsoRepository');
const GetAsoStatusUseCase = require('../../../sst/application/use-cases/aso/GetAsoStatusUseCase');

class SstAsoServiceAdapter extends SstAsoService {
  public async getStatus(employeeId: number): Promise<{ status: string; tipo_ultimo_aso: string | null; vencimento: string | null } | null> {
    const asoRepository = new SequelizeAsoRepository();
    const useCase = new GetAsoStatusUseCase(asoRepository);
    const result = await useCase.execute({ employeeId });
    if (!result) return null;
    return { status: result.status, tipo_ultimo_aso: result.tipo_ultimo_aso, vencimento: result.vencimento };
  }
}

export = SstAsoServiceAdapter;
