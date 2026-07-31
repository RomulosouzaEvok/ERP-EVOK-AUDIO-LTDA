/**
 * Use case: buscar log de auditoria por id.
 *
 * @module modules/auditLogs/application/use-cases/GetAuditLogByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import AuditLogsRepository from '../../domain/repositories/AuditLogsRepository';

class GetAuditLogByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly auditLogsRepository: AuditLogsRepository;

  /** @param auditLogsRepository - Repositorio de logs de auditoria. */
  public constructor(auditLogsRepository: AuditLogsRepository) {
    super();
    this.auditLogsRepository = auditLogsRepository;
  }

  /**
   * @param input - Id do log de auditoria.
   * @returns Log de auditoria encontrado.
   * @throws {NotFoundError} Se o registro nao existir.
   */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const log = await this.auditLogsRepository.findById(id);
    if (!log) {
      throw new NotFoundError('Registro de auditoria não encontrado');
    }
    return log;
  }
}

export = GetAuditLogByIdUseCase;
