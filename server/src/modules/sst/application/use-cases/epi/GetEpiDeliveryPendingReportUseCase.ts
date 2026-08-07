/**
 * Use case: relatório de pendência crítica de EPI (RF-SST-008) — ativos em
 * função/setor da MatrizEPI sem EntregaEPI confirmada vigente.
 *
 * @module modules/sst/application/use-cases/epi/GetEpiDeliveryPendingReportUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { toTipoEpiDTO } from '../../../infrastructure/mappers/EpiMapper';

class GetEpiDeliveryPendingReportUseCase extends UseCase<void, any[]> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /** @returns Lista de pendências (funcionário × TipoEPI exigido sem entrega vigente). */
  public async execute(): Promise<any[]> {
    const pendencias = await this.epiRepository.findMatrizAtivaSemEntregaVigente();
    return pendencias.map((p: any) => ({
      employee_id: p.employee.id,
      employee_name: p.employee.name,
      department: p.employee.department ? { id: p.employee.department.id, name: p.employee.department.name } : null,
      position: p.employee.position,
      epi_type: toTipoEpiDTO(p.matriz.tipoEpi)
    }));
  }
}

export = GetEpiDeliveryPendingReportUseCase;
