/**
 * Use case: status enxuto de aptidão de um funcionário (RF-SST-021),
 * consumido pelo RH no gate de admissão/retorno. NUNCA inclui dado
 * clínico (restricoes/medico_examinador/arquivo_url) — apenas o
 * suficiente para o gate.
 *
 * @module modules/sst/application/use-cases/aso/GetAsoStatusUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';

class GetAsoStatusUseCase extends UseCase<{ employeeId: number | string }, any> {
  private readonly asoRepository: AsoRepository;

  public constructor(asoRepository: AsoRepository) {
    super();
    this.asoRepository = asoRepository;
  }

  public async execute({ employeeId }: { employeeId: number | string }): Promise<any> {
    const aso = await this.asoRepository.findLatestAsoByEmployee(Number(employeeId));
    if (!aso) {
      return { employee_id: Number(employeeId), status: 'pendente', tipo_ultimo_aso: null, data_ultimo_aso: null, vencimento: null };
    }
    return {
      employee_id: Number(employeeId),
      status: aso.resultado,
      tipo_ultimo_aso: aso.tipo,
      data_ultimo_aso: aso.data_realizacao,
      vencimento: aso.data_vencimento
    };
  }
}

export = GetAsoStatusUseCase;
