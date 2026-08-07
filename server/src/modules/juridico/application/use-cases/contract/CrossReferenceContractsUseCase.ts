/**
 * `GET /api/jur/contracts/by-supplier/:supplierId`,
 * `.../by-client/:clientId`, `.../by-employee/:employeeId` — fichas
 * cruzadas (RF-JUR-045), leitura pura, sem duplicar dado. Consumido pela
 * ficha de fornecedor/cliente/funcionário nos respectivos módulos
 * (Compras/Vendas/RH).
 *
 * @module modules/juridico/application/use-cases/contract/CrossReferenceContractsUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';

type CrossReferenceType = 'supplier' | 'client' | 'employee';

interface CrossReferenceInput {
  type: CrossReferenceType;
  id: number | string;
}

class CrossReferenceContractsUseCase extends UseCase<CrossReferenceInput, any[]> {
  private readonly repository: ContractRepository;

  public constructor(repository: ContractRepository) {
    super();
    this.repository = repository;
  }

  public async execute({ type, id }: CrossReferenceInput): Promise<any[]> {
    if (type === 'supplier') return this.repository.listBySupplier(id);
    if (type === 'client') return this.repository.listByClient(id);
    return this.repository.listByEmployee(id);
  }
}

export = CrossReferenceContractsUseCase;
