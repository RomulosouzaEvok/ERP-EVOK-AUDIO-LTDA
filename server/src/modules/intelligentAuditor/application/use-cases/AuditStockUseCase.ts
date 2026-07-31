/**
 * Use case: auditar consistência de estoque (estoque negativo e produtos sem movimentação).
 *
 * @module modules/intelligentAuditor/application/use-cases/AuditStockUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import IntelligentAuditorRepository from '../../domain/repositories/IntelligentAuditorRepository';

class AuditStockUseCase extends UseCase<void, any> {
  private readonly intelligentAuditorRepository: IntelligentAuditorRepository;

  /** @param intelligentAuditorRepository - Repositorio do auditor inteligente. */
  public constructor(intelligentAuditorRepository: IntelligentAuditorRepository) {
    super();
    this.intelligentAuditorRepository = intelligentAuditorRepository;
  }

  /** @returns Estoque negativo, produtos sem movimentação e resumo da auditoria. */
  public async execute(): Promise<any> {
    return this.intelligentAuditorRepository.auditStock();
  }
}

export = AuditStockUseCase;
