/**
 * `POST /api/ti/licenses/:assetId/reveal-key` — retorna `license_key` em
 * claro (RF-TI-027/BR-TI-014/RNF-TI-01). Todo acesso gera log de LEITURA
 * (não apenas escrita), via `logAction` fire-and-forget no controller.
 *
 * @module modules/ti/application/use-cases/license/RevealLicenseKeyUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import LicenseRepository from '../../../domain/repositories/LicenseRepository';
import { NotFoundError, ForbiddenError } from '../../../../../errors';

interface Input {
  assetId: number;
  requesterHasTiModule: boolean;
  requesterIsAdmin: boolean;
}

class RevealLicenseKeyUseCase extends UseCase<Input, { license_key: string | null }> {
  private readonly repository: LicenseRepository;

  public constructor(repository: LicenseRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ForbiddenError} Usuário sem módulo `ti` e `role !== 'admin'` (BR-TI-014).
   * @throws {NotFoundError} Licença não encontrada.
   */
  public async execute({ assetId, requesterHasTiModule, requesterIsAdmin }: Input): Promise<{ license_key: string | null }> {
    if (!requesterHasTiModule && !requesterIsAdmin) {
      throw new ForbiddenError('Apenas usuários com o módulo TI ou administradores podem visualizar a chave de licença em claro.');
    }

    const detail = await this.repository.findByAssetId(assetId);
    if (!detail) throw new NotFoundError(`Licença do ativo ${assetId} não encontrada.`);

    return { license_key: detail.license_key ?? null };
  }
}

export = RevealLicenseKeyUseCase;
