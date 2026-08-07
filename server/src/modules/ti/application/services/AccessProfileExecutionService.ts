/**
 * Interface de serviço para execução de `ItAccessRequest` (grant/change/
 * revoke) delegando às operações RBAC REAIS já existentes
 * (`PUT /api/users/:id/access-profile`, desativação de usuário) — nunca
 * duplica lógica de autorização (RF-TI-036/BR-TI-013). Implementada por
 * `AccessProfileExecutionServiceAdapter`.
 *
 * @module modules/ti/application/services/AccessProfileExecutionService
 */

import type { Request } from 'express';

class AccessProfileExecutionService {
  /** Cria usuário (se `employee.user_id` ainda não existir) e/ou vincula o perfil de acesso solicitado. */
  public async provisionAccess(_input: { employeeId: number; profileId: number | null; corporateEmail?: string | null; req: Request }): Promise<{ userId: number }> {
    throw new Error('AccessProfileExecutionService.provisionAccess não implementado.');
  }
  /** Desativa (soft delete `active=false`) o usuário vinculado ao funcionário, se existir. */
  public async deactivateUser(_input: { employeeId: number; req: Request }): Promise<{ userId: number | null }> {
    throw new Error('AccessProfileExecutionService.deactivateUser não implementado.');
  }
}

export = AccessProfileExecutionService;
