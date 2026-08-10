/**
 * `PUT /api/rh/employee-documents/:id` — atualiza `valid_until`/substitui arquivo (nova versão).
 * @module modules/rh/application/use-cases/employeeDocument/UpdateEmployeeDocumentUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';

class UpdateEmployeeDocumentUseCase extends UseCase<{ id: number | string; valid_until?: string | null; file_path?: string; fitness_result?: string | null }, any> {
  private readonly repository: EmployeeDocumentRepository;

  public constructor(repository: EmployeeDocumentRepository) {
    super();
    this.repository = repository;
  }

  public async execute(input: { id: number | string; valid_until?: string | null; file_path?: string; fitness_result?: string | null }): Promise<any> {
    const updateData: Record<string, unknown> = {};
    if (input.valid_until !== undefined) updateData.valid_until = input.valid_until;
    if (input.file_path !== undefined) updateData.file_path = input.file_path;
    if (input.fitness_result !== undefined) updateData.aptitude_result = input.fitness_result;

    const updated = await this.repository.update(input.id, updateData);
    if (!updated) throw new NotFoundError('Documento não encontrado.');
    return updated;
  }
}

export = UpdateEmployeeDocumentUseCase;
