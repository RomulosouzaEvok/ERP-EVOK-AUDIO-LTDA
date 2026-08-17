/**
 * `GET /api/jur/lgpd/incidents/pending-critical` - painel de incidentes
 * vencidos ou a vencer.
 *
 * @module modules/juridico/application/use-cases/lgpd/PendingCriticalIncidentsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdIncidentRepository from '../../../domain/repositories/LgpdIncidentRepository';

class PendingCriticalIncidentsUseCase extends UseCase<void, any[]> {
  private readonly repository: LgpdIncidentRepository;

  public constructor(repository: LgpdIncidentRepository) {
    super();
    this.repository = repository;
  }

  public async execute(): Promise<any[]> {
    const rows = await this.repository.listPendingCritical();
    const now = new Date().getTime();

    return rows.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      const dueAt = new Date(json.assessment_due_at).getTime();
      const horasRestantes = Math.ceil((dueAt - now) / (1000 * 60 * 60));
      return { ...json, horas_restantes: horasRestantes, vencido: horasRestantes < 0 };
    });
  }
}

export = PendingCriticalIncidentsUseCase;
