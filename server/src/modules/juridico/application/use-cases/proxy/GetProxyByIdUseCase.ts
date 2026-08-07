/**
 * `GET /api/jur/proxies/:id` — detalhe. Verifica expiração ao acessar
 * (E2/RF-JUR-029) — `status` calculado/gravado no primeiro `GET` após
 * `expiration_date`, mesmo padrão de `Proxy.status` de SST/`ItSoftwareLicense`.
 *
 * @module modules/juridico/application/use-cases/proxy/GetProxyByIdUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ProxyRepository from '../../../domain/repositories/ProxyRepository';
import { NotFoundError } from '../../../../../errors';

class GetProxyByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: ProxyRepository;

  public constructor(repository: ProxyRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {NotFoundError} Procuração não encontrada (404). */
  public async execute({ id }: { id: number | string }): Promise<any> {
    const proxy = await this.repository.findById(id);
    if (!proxy) throw new NotFoundError(`Procuração ${id} não encontrada.`);

    const today = new Date().toISOString().slice(0, 10);
    if (proxy.status === 'active' && proxy.expiration_date && proxy.expiration_date < today) {
      return this.repository.update(id, { status: 'expired' });
    }
    return proxy;
  }
}

export = GetProxyByIdUseCase;
