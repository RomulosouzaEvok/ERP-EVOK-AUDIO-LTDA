/**
 * `GET /api/jur/lgpd/data-subject-requests/pending-critical` — dashboard:
 * pendências vencidas ou a vencer (D-5/D-1) — nunca oculta mesmo após
 * vencer (E2/RNF-JUR-05).
 *
 * @module modules/juridico/application/use-cases/lgpd/PendingCriticalDataSubjectRequestsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LgpdRequestRepository from '../../../domain/repositories/LgpdRequestRepository';

class PendingCriticalDataSubjectRequestsUseCase extends UseCase<void, any[]> {
  private readonly repository: LgpdRequestRepository;

  public constructor(repository: LgpdRequestRepository) {
    super();
    this.repository = repository;
  }

  public async execute(): Promise<any[]> {
    const rows = await this.repository.listPendingCritical();
    const today = new Date().toISOString().slice(0, 10);

    return rows.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      const diasRestantes = Math.ceil((new Date(json.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      return { ...json, dias_restantes: diasRestantes, vencido: diasRestantes < 0 };
    });
  }
}

export = PendingCriticalDataSubjectRequestsUseCase;
