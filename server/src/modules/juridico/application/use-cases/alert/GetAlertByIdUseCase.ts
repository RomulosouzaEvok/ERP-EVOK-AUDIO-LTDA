/**
 * `GET /api/jur/alerts/:id` — detalhe (inclui vínculo com a origem —
 * contrato/prazo/procuração/PI/solicitação, §8.1).
 *
 * @module modules/juridico/application/use-cases/alert/GetAlertByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import { NotFoundError } from '../../../../../errors';

class GetAlertByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LegalAlertRepository;

  public constructor(repository: LegalAlertRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Alerta não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const alert = await this.repository.findById(id);
    if (!alert) throw new NotFoundError(`Alerta ${id} não encontrado.`);
    return alert;
  }
}

export = GetAlertByIdUseCase;
