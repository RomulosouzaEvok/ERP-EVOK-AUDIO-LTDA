import LgpdManualTaskRepository from '../../domain/repositories/LgpdManualTaskRepository';

const { JurLgpdManualTask }: any = require('../../../../models/index');

class SequelizeLgpdManualTaskRepository extends LgpdManualTaskRepository {
  public async create(data: Record<string, unknown>): Promise<any> {
    return JurLgpdManualTask.create(data);
  }
}

export = SequelizeLgpdManualTaskRepository;
