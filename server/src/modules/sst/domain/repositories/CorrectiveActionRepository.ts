/**
 * Contrato do repositório de Ações Corretivas (recurso único e polimórfico,
 * multi-origem: investigação de acidente, inspeção de segurança, reunião
 * CIPA e PGR).
 *
 * @module modules/sst/domain/repositories/CorrectiveActionRepository
 */

class CorrectiveActionRepository {
  public async findAndCount(filters: Record<string, unknown>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CorrectiveActionRepository.findAndCount não implementado.');
  }
  public async findById(id: number | string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CorrectiveActionRepository.findById não implementado.');
  }
  public async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CorrectiveActionRepository.create não implementado.');
  }
  public async update(id: number | string, data: Record<string, unknown>, transaction?: unknown): Promise<any> { // eslint-disable-line @typescript-eslint/no-unused-vars
    throw new Error('CorrectiveActionRepository.update não implementado.');
  }
}

export = CorrectiveActionRepository;
