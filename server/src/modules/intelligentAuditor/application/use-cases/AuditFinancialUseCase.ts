/**
 * Use case: auditar consistência financeira (contas vencidas e totais por status).
 *
 * @module modules/intelligentAuditor/application/use-cases/AuditFinancialUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import IntelligentAuditorRepository from '../../domain/repositories/IntelligentAuditorRepository';

class AuditFinancialUseCase extends UseCase<void, any> {
  private readonly intelligentAuditorRepository: IntelligentAuditorRepository;

  /** @param intelligentAuditorRepository - Repositorio do auditor inteligente. */
  public constructor(intelligentAuditorRepository: IntelligentAuditorRepository) {
    super();
    this.intelligentAuditorRepository = intelligentAuditorRepository;
  }

  /** @returns Indicadores financeiros (contas vencidas e totais agrupados por status). */
  public async execute(): Promise<any> {
    return this.intelligentAuditorRepository.auditFinancial();
  }
}

export = AuditFinancialUseCase;
