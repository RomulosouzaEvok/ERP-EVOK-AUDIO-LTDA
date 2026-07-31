/**
 * Use case: auditar compras paradas (pending/approved há mais de 30 dias).
 *
 * @module modules/intelligentAuditor/application/use-cases/AuditPurchasesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import IntelligentAuditorRepository from '../../domain/repositories/IntelligentAuditorRepository';

class AuditPurchasesUseCase extends UseCase<void, any> {
  private readonly intelligentAuditorRepository: IntelligentAuditorRepository;

  /** @param intelligentAuditorRepository - Repositorio do auditor inteligente. */
  public constructor(intelligentAuditorRepository: IntelligentAuditorRepository) {
    super();
    this.intelligentAuditorRepository = intelligentAuditorRepository;
  }

  /** @returns Total e detalhes das compras paradas há mais de 30 dias. */
  public async execute(): Promise<any> {
    return this.intelligentAuditorRepository.auditPurchases();
  }
}

export = AuditPurchasesUseCase;
