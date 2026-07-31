/**
 * Use case: auditar consistência de vendas (recebíveis incompletos, vendas sem itens).
 *
 * @module modules/intelligentAuditor/application/use-cases/AuditSalesUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import IntelligentAuditorRepository from '../../domain/repositories/IntelligentAuditorRepository';

class AuditSalesUseCase extends UseCase<void, any> {
  private readonly intelligentAuditorRepository: IntelligentAuditorRepository;

  /** @param intelligentAuditorRepository - Repositorio do auditor inteligente. */
  public constructor(intelligentAuditorRepository: IntelligentAuditorRepository) {
    super();
    this.intelligentAuditorRepository = intelligentAuditorRepository;
  }

  /** @returns Indicadores de consistência de vendas. */
  public async execute(): Promise<any> {
    return this.intelligentAuditorRepository.auditSales();
  }
}

export = AuditSalesUseCase;
