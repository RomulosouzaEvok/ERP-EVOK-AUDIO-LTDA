/**
 * `POST /api/jur/lgpd/incidents/:id/close` — encerra incidente (nível
 * `approve`) — bloqueado sem decisão registrada (E4 do UC-56, BR-JUR-042),
 * refletindo o `CHECK` de banco `ck_jur_lgpd_incidents_closed_requires_decision`.
 *
 * @module modules/juridico/application/use-cases/lgpd/CloseIncidentUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import type { CloseIncidentInput } from '../../../domain/entities/LgpdTypes';

class CloseIncidentUseCase extends UseCase<CloseIncidentInput, any> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {NotFoundError} Incidente não encontrado (404).
   * @throws {BusinessRuleError} Sem `POST .../decision` registrado previamente (422, E4/BR-JUR-042).
   */
  public async execute(input: CloseIncidentInput): Promise<any> {
    const incident = await this.repository.findById(input.id);
    if (!incident) throw new NotFoundError(`Incidente ${input.id} não encontrado.`);

    if (!incident.communication_decision || !incident.communication_justification) {
      throw new BusinessRuleError(
        'Não é possível encerrar o incidente sem uma decisão registrada sobre comunicação à ANPD/titulares.',
        { rule: 'BR-JUR-042' },
      );
    }

    return this.repository.update(input.id, { status: 'closed', closed_at: new Date() });
  }
}

export = CloseIncidentUseCase;
