/**
 * `POST /api/jur/proxies/:id/revoke` — revoga procuração (nível `approve`,
 * RF-JUR-028). Efeito imediato: `status: "revoked"` deixa de aparecer em
 * `GET /api/jur/proxies?status=active` sem lag admissível (E1, Código Civil
 * art. 682, I).
 *
 * @module modules/juridico/application/use-cases/proxy/RevokeProxyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ProxyRepository from '../../../domain/repositories/ProxyRepository';
import { ValidationError, NotFoundError } from '../../../../../errors';
import type { RevokeProxyInput } from '../../../domain/entities/ProxyTypes';

class RevokeProxyUseCase extends UseCase<RevokeProxyInput, any> {
  private readonly repository: ProxyRepository;

  public constructor(repository: ProxyRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `communication_record` ausente (400, RF-JUR-028).
   * @throws {NotFoundError} Procuração não encontrada (404).
   */
  public async execute(input: RevokeProxyInput): Promise<any> {
    if (!input.communication_record) {
      throw new ValidationError('communication_record é obrigatório.');
    }

    const proxy = await this.repository.findById(input.id);
    if (!proxy) throw new NotFoundError(`Procuração ${input.id} não encontrada.`);

    return this.repository.update(input.id, {
      status: 'revoked',
      revoked_at: input.revocation_date ? new Date(input.revocation_date) : new Date(),
      revocation_communication: input.communication_record,
    });
  }
}

export = RevokeProxyUseCase;
