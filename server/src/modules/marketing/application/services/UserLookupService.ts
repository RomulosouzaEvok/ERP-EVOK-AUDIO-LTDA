/**
 * Interface de serviço para consulta de `User` (ativo) a partir do módulo
 * `marketing` (RF-MKT-012/015, handoff Marketing → Vendas), sem import
 * direto do model — mesmo precedente de `AssetLookupService`
 * (`modules/ti/application/services/`). Implementada por
 * `UserLookupServiceAdapter`.
 *
 * @module modules/marketing/application/services/UserLookupService
 */

class UserLookupService {
  /**
   * @param _id - Id do usuário.
   * @returns Usuário ativo ou `null` se não existir/estiver inativo.
   * @abstract
   */
  public async findActiveById(_id: number): Promise<any | null> {
    throw new Error('UserLookupService.findActiveById não implementado.');
  }
}

export = UserLookupService;
