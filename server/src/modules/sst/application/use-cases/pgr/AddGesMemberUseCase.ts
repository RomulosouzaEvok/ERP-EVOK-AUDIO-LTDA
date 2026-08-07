/**
 * Use case: vincular um `employee_id` a um GES (RF-SST-040). Gera
 * automaticamente um `EventoESocialSST` tipo `S-2240` pendente — origem do
 * evento, sem trigger (decisão arquitetural do projeto).
 *
 * @module modules/sst/application/use-cases/pgr/AddGesMemberUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import PgrRepository from '../../../domain/repositories/PgrRepository';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { NotFoundError, ValidationError } from '../../../../../errors';
import { toGesMemberDTO } from '../../../infrastructure/mappers/PgrMapper';

interface AddGesMemberInput {
  gesId: string | number;
  body: { employee_id: number; inicio_exposicao?: string };
}

class AddGesMemberUseCase extends UseCase<AddGesMemberInput, any> {
  private readonly pgrRepository: PgrRepository;
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(pgrRepository: PgrRepository, esocialEventRepository: EsocialEventRepository) {
    super();
    this.pgrRepository = pgrRepository;
    this.esocialEventRepository = esocialEventRepository;
  }

  /**
   * @throws {ValidationError} `employee_id` ausente (400).
   * @throws {NotFoundError} GES não encontrado (404).
   */
  public async execute({ gesId, body }: AddGesMemberInput): Promise<any> {
    if (!body.employee_id) throw new ValidationError('employee_id é obrigatório.');
    const ges = await this.pgrRepository.findGesById(gesId);
    if (!ges) throw new NotFoundError('GES não encontrado.');

    const vinculo = await this.pgrRepository.createGesMember({
      ges_id: ges.id,
      employee_id: body.employee_id,
      inicio_exposicao: body.inicio_exposicao ?? new Date().toISOString().slice(0, 10)
    });

    const evento = await this.esocialEventRepository.create({
      tipo: 'S-2240',
      origem_tipo: 'ges_funcionario',
      origem_id: vinculo.id,
      status: 'pendente'
    });

    return { ...toGesMemberDTO(vinculo), esocial_event: evento };
  }
}

export = AddGesMemberUseCase;
