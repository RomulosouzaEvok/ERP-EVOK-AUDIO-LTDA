/**
 * Adapter de `AccessProfileExecutionService` — delega às operações RBAC
 * REAIS já auditadas do módulo `users`
 * (`AssignAccessProfileUseCase`/`DeactivateUserUseCase`/`CreateUserUseCase`
 * via `SequelizeUsersRepository`), nunca duplica `AuditLog`
 * (RF-TI-036/BR-TI-013). Chamada de aplicação direta (mesma camada de
 * negócio, sem HTTP loopback) — mesmo padrão documentado em
 * `docs/business/BLOCO_2_TI_API.md` §4.
 *
 * @module modules/ti/infrastructure/adapters/AccessProfileExecutionServiceAdapter
 */

import type { Request } from 'express';
import AccessProfileExecutionService from '../../application/services/AccessProfileExecutionService';
import { BusinessRuleError } from '../../../../errors';

const SequelizeUsersRepository = require('../../../users/infrastructure/sequelize/SequelizeUsersRepository');
const AssignAccessProfileUseCase = require('../../../users/application/use-cases/AssignAccessProfileUseCase');
const DeactivateUserUseCase = require('../../../users/application/use-cases/DeactivateUserUseCase');
const CreateUserUseCase = require('../../../users/application/use-cases/CreateUserUseCase');
const crypto = require('crypto');

const { Employee }: any = require('../../../../models/index');

class AccessProfileExecutionServiceAdapter extends AccessProfileExecutionService {
  private readonly usersRepository = new SequelizeUsersRepository();

  public async provisionAccess({ employeeId, profileId, corporateEmail, req }: { employeeId: number; profileId: number | null; corporateEmail?: string | null; req: Request }): Promise<{ userId: number }> {
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      throw new BusinessRuleError(`Funcionário ${employeeId} não encontrado para provisionamento de acesso.`);
    }

    let userId: number = employee.user_id;
    if (!userId) {
      const email = corporateEmail || employee.email;
      if (!email) {
        throw new BusinessRuleError(
          'Não é possível criar o usuário: informe um e-mail corporativo na solicitação de acesso (campo corporate_email) ou cadastre um e-mail no funcionário.',
        );
      }
      const temporaryPassword = crypto.randomBytes(9).toString('base64');
      const user = await new CreateUserUseCase(this.usersRepository).execute({
        name: employee.name,
        email,
        password: temporaryPassword,
        role: 'operator',
        req,
      });
      userId = user.id;
      await Employee.update({ user_id: userId }, { where: { id: employeeId } });
    }

    if (profileId) {
      await new AssignAccessProfileUseCase(this.usersRepository).execute({ id: userId, accessProfileId: profileId, req });
    }

    return { userId };
  }

  public async deactivateUser({ employeeId, req }: { employeeId: number; req: Request }): Promise<{ userId: number | null }> {
    const employee = await Employee.findByPk(employeeId);
    if (!employee || !employee.user_id) {
      return { userId: null };
    }

    const currentUserId = (req as any).user?.id;
    await new DeactivateUserUseCase(this.usersRepository).execute({ id: employee.user_id, currentUserId, req });
    return { userId: employee.user_id };
  }
}

export = AccessProfileExecutionServiceAdapter;
