/**
 * Contrato do repositório do cluster Treinamentos de Segurança (NRs).
 *
 * @module modules/sst/domain/repositories/TrainingRepository
 */

class TrainingRepository {
  public async findMatrixAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.findMatrixAndCount não implementado.');
  }
  public async findMatrixById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.findMatrixById não implementado.');
  }
  public async createMatrixItem(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.createMatrixItem não implementado.');
  }
  public async updateMatrixItem(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.updateMatrixItem não implementado.');
  }

  public async findMatrixByPositionAndNorma(position: string, norma: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.findMatrixByPositionAndNorma não implementado.');
  }
  public async findTrainingsAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.findTrainingsAndCount não implementado.');
  }
  public async createTraining(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('TrainingRepository.createTraining não implementado.');
  }
  public async findBlocklist(): Promise<any[]> {
    throw new Error('TrainingRepository.findBlocklist não implementado.');
  }
}

export = TrainingRepository;
