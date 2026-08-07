/**
 * Use case: consulta de estabilidade de um funcionário (RF-SST-031,
 * exceção de leitura `sst`|`rh`, UC-48). Consumido pelo fluxo de
 * desligamento do RH — **não bloqueia** o desligamento; apenas informa.
 *
 * @module modules/sst/application/use-cases/cipa/GetStabilityUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { toStabilityDTO } from '../../../infrastructure/mappers/CipaMapper';

interface GetStabilityInput {
  employeeId: string | number;
}

class GetStabilityUseCase extends UseCase<GetStabilityInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  public async execute({ employeeId }: GetStabilityInput): Promise<any> {
    const membro = await this.cipaRepository.findActiveMembershipByEmployee(Number(employeeId));
    return toStabilityDTO(Number(employeeId), membro);
  }
}

export = GetStabilityUseCase;
