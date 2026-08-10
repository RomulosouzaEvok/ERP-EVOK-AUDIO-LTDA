/**
 * `GET /api/rh/employee-documents/:id` — nunca inclui laudo clínico (RF-RH-028).
 * @module modules/rh/application/use-cases/employeeDocument/GetEmployeeDocumentByIdUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import EmployeeDocumentRepository from '../../../domain/repositories/EmployeeDocumentRepository';

class GetEmployeeDocumentByIdUseCase extends UseCase<{ id: number | string }, any> {
  private readonly repository: EmployeeDocumentRepository;

  public constructor(repository: EmployeeDocumentRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ id }: { id: number | string }): Promise<any> {
    const document = await this.repository.findById(id);
    if (!document) throw new NotFoundError('Documento não encontrado.');
    return document;
  }
}

export = GetEmployeeDocumentByIdUseCase;
