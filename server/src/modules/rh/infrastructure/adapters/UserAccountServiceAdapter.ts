/**
 * Adapter de `UserAccountService` — desativa `User.active` na conclusão da
 * demissão (RF-RH-022), sempre dentro da transação do chamador.
 *
 * @module modules/rh/infrastructure/adapters/UserAccountServiceAdapter
 */
import UserAccountService from '../../application/services/UserAccountService';

const { User }: any = require('../../../../models/index');

class UserAccountServiceAdapter extends UserAccountService {
  public async deactivate(userId: number, transaction?: unknown): Promise<void> {
    await User.update({ active: false }, { where: { id: userId }, transaction: transaction as any });
  }
}

export = UserAccountServiceAdapter;
