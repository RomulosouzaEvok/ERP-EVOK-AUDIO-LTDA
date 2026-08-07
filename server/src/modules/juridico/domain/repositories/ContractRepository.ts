/**
 * Contrato do repositório de `JurContract`/`JurContractDocument`/
 * `JurContractSignatory`/`JurContractAddendum` (UC-52).
 *
 * @module modules/juridico/domain/repositories/ContractRepository
 */

class ContractRepository {
  public async findAndCount(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('ContractRepository.findAndCount não implementado.');
  }
  public async findById(_id: number | string): Promise<any | null> {
    throw new Error('ContractRepository.findById não implementado.');
  }
  public async countByYear(_year: number): Promise<number> {
    throw new Error('ContractRepository.countByYear não implementado.');
  }
  public async create(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractRepository.create não implementado.');
  }
  public async update(_id: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('ContractRepository.update não implementado.');
  }

  // ---- documentos ----
  public async addDocument(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractRepository.addDocument não implementado.');
  }
  public async listDocuments(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractRepository.listDocuments não implementado.');
  }
  public async countDocuments(_contractId: number | string): Promise<number> {
    throw new Error('ContractRepository.countDocuments não implementado.');
  }
  public async hasSignedDocument(_contractId: number | string): Promise<boolean> {
    throw new Error('ContractRepository.hasSignedDocument não implementado.');
  }

  // ---- signatários ----
  public async addSignatory(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractRepository.addSignatory não implementado.');
  }
  public async listSignatories(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractRepository.listSignatories não implementado.');
  }
  public async countPartySignatories(_contractId: number | string): Promise<number> {
    throw new Error('ContractRepository.countPartySignatories não implementado.');
  }

  // ---- aditivos ----
  public async addAddendum(_data: Record<string, unknown>): Promise<any> {
    throw new Error('ContractRepository.addAddendum não implementado.');
  }
  public async listAddendums(_contractId: number | string): Promise<any[]> {
    throw new Error('ContractRepository.listAddendums não implementado.');
  }
  public async countAddendums(_contractId: number | string): Promise<number> {
    throw new Error('ContractRepository.countAddendums não implementado.');
  }
}

export = ContractRepository;
