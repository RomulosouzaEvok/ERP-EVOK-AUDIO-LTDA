/**
 * Adapter de `UserLookupService` — lê `User` (model Sequelize real),
 * isolando o resto do módulo `marketing` de um import direto.
 *
 * @module modules/marketing/infrastructure/adapters/UserLookupServiceAdapter
 */

import UserLookupService from '../../application/services/UserLookupService';

const { User } = require('../../../../models/index');

class UserLookupServiceAdapter extends UserLookupService {
  public async findActiveById(id: number): Promise<any | null> {
    const user = await User.findByPk(id);
    if (!user || user.active === false) return null;
    return user;
  }
}

export = UserLookupServiceAdapter;
