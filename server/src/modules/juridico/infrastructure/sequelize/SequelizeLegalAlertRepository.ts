/**
 * Implementação Sequelize do repositório de `JurLegalAlert`.
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeLegalAlertRepository
 */

import LegalAlertRepository from '../../domain/repositories/LegalAlertRepository';

const { JurLegalAlert }: any = require('../../../../models/index');

class SequelizeLegalAlertRepository extends LegalAlertRepository {
  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLegalAlert.create(data);
  }
}

export = SequelizeLegalAlertRepository;
