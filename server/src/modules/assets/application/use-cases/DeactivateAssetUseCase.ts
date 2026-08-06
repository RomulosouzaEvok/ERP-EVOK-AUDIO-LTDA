/**
 * Use case: inativar (soft delete) um ativo.
 *
 * @module modules/assets/application/use-cases/DeactivateAssetUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import AssetsRepository from '../../domain/repositories/AssetsRepository';

class DeactivateAssetUseCase extends UseCase<{ id: number | string }, { message: string }> {
  private readonly assetsRepository: AssetsRepository;

  /** @param assetsRepository - Repositorio de ativos. */
  public constructor(assetsRepository: AssetsRepository) {
    super();
    this.assetsRepository = assetsRepository;
  }

  /**
   * @param input - Id do ativo.
   * @returns Mensagem de confirmação.
   * @throws {NotFoundError} Se o ativo não existir.
   */
  public async execute({ id }: { id: number | string }): Promise<{ message: string }> {
    // NOTA (auditoria 2026-08-06): o valor anterior aqui era 'inactive', que
    // NUNCA existiu no ENUM `enum_assets_status` do Postgres (nem em
    // server/models/Asset.ts, nem em nenhuma migration — ver
    // server/migrations/20260805-000006-add-asset-status-returned-to-supplier.cjs
    // para o histórico de valores adicionados ao enum). Todo UPDATE com
    // status='inactive' era rejeitado pelo Postgres com
    // "invalid input value for enum enum_assets_status", fazendo
    // DELETE /api/assets/:id retornar 500 em produção sempre que chamado.
    // 'decommissioned' ("Baixado" no frontend, client/src/pages/patrimonio/
    // AssetsPage.tsx) é o valor de enum correto para "ativo desativado/baixado".
    const updated = await this.assetsRepository.update(id, { status: 'decommissioned' });
    if (!updated) {
      throw new NotFoundError('Ativo não encontrado');
    }
    return { message: 'Ativo inativado' };
  }
}

export = DeactivateAssetUseCase;
