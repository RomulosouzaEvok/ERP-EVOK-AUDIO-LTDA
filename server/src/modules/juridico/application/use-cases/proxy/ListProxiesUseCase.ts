/**
 * `GET /api/jur/proxies` — lista procurações. Default (`status` não
 * informado) exclui `revoked`/`expired` das telas de "vigentes" (E1/E2 do
 * UC-55). Expiração automática (E2, RF-JUR-029) é verificada em memória ao
 * listar/acessar — nunca uma rota própria.
 *
 * @module modules/juridico/application/use-cases/proxy/ListProxiesUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ProxyRepository from '../../../domain/repositories/ProxyRepository';
import type { ListProxiesInput } from '../../../domain/entities/ProxyTypes';

class ListProxiesUseCase extends UseCase<ListProxiesInput, any> {
  private readonly repository: ProxyRepository;

  public constructor(repository: ProxyRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ filters, page, limit }: ListProxiesInput): Promise<any> {
    const offset = (page - 1) * limit;
    const { count, rows } = await this.repository.findAndCount(filters, { limit, offset });

    const today = new Date().toISOString().slice(0, 10);
    const resolvedRows = await Promise.all(rows.map(async (proxy: any) => {
      if (proxy.status === 'active' && proxy.expiration_date && proxy.expiration_date < today) {
        return this.repository.update(proxy.id, { status: 'expired' });
      }
      return proxy;
    }));

    return { rows: resolvedRows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListProxiesUseCase;
