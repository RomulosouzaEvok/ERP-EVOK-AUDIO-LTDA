import LgpdRetentionPolicyRepository from '../../domain/repositories/LgpdRetentionPolicyRepository';

const { JurLgpdRetentionPolicy }: any = require('../../../../models/index');

class SequelizeLgpdRetentionPolicyRepository extends LgpdRetentionPolicyRepository {
  public async findActiveById(id: number | string): Promise<any | null> {
    return JurLgpdRetentionPolicy.findOne({
      where: { id, status: 'active', auto_delete_enabled: false },
    });
  }
}

export = SequelizeLgpdRetentionPolicyRepository;
