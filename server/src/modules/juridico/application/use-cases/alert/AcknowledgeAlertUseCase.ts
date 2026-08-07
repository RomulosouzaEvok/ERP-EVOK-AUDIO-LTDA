/**
 * `POST /api/jur/alerts/:id/acknowledge` — marca como lido/tratado. NUNCA
 * desativa (§4.5): `jur_legal_alerts` deliberadamente NÃO tem coluna
 * `disabled`/`muted`/`active` — esta é a única transição de escrita que
 * este endpoint permite, para qualquer origem, inclusive
 * `origin_type='legal_case_deadline'` com `is_fatal=true` (RNF-JUR-04).
 *
 * @module modules/juridico/application/use-cases/alert/AcknowledgeAlertUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LegalAlertRepository from '../../../domain/repositories/LegalAlertRepository';
import { NotFoundError } from '../../../../../errors';

class AcknowledgeAlertUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: LegalAlertRepository;

  public constructor(repository: LegalAlertRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Alerta não encontrado (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const alert = await this.repository.findById(id);
    if (!alert) throw new NotFoundError(`Alerta ${id} não encontrado.`);

    return this.repository.update(id, { status: 'acknowledged', acknowledged_at: new Date() });
  }
}

export = AcknowledgeAlertUseCase;
