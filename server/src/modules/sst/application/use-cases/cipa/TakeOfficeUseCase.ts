/**
 * Use case: registrar a posse de um MembroCIPA — bloqueado sem
 * TreinamentoSST tipo `CIPA` válido (E2/BR-SST-024, RF-SST-033, UC-48).
 *
 * @module modules/sst/application/use-cases/cipa/TakeOfficeUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toMemberDTO } from '../../../infrastructure/mappers/CipaMapper';

interface TakeOfficeInput {
  memberId: string | number;
}

class TakeOfficeUseCase extends UseCase<TakeOfficeInput, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  /**
   * @throws {NotFoundError} Membro não encontrado (404).
   * @throws {BusinessRuleError} Sem `TreinamentoSST` tipo `CIPA` registrado (422/BR-SST-024).
   */
  public async execute({ memberId }: TakeOfficeInput): Promise<any> {
    const membro = await this.cipaRepository.findMemberById(memberId);
    if (!membro) throw new NotFoundError('Membro de CIPA não encontrado.');

    const treinamento = await this.cipaRepository.findValidCipaTraining(membro.employee_id);
    if (!treinamento) {
      throw new BusinessRuleError('Posse bloqueada: funcionário sem TreinamentoSST tipo CIPA válido registrado (BR-SST-024).');
    }

    const atualizado = await this.cipaRepository.updateMember(memberId, {
      treinamento_cipa_id: treinamento.id,
      posse_confirmada_em: new Date()
    });
    return toMemberDTO(atualizado);
  }
}

export = TakeOfficeUseCase;
