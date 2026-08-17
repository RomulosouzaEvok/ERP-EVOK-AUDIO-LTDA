import LgpdDpoDesignationRepository from '../../domain/repositories/LgpdDpoDesignationRepository';

const { JurLgpdDpoDesignation }: any = require('../../../../models/index');

class SequelizeLgpdDpoDesignationRepository extends LgpdDpoDesignationRepository {
  public async findActive(): Promise<any | null> {
    return JurLgpdDpoDesignation.findOne({
      where: { status: 'active' },
      order: [['effective_from', 'DESC']],
    });
  }
}

export = SequelizeLgpdDpoDesignationRepository;
