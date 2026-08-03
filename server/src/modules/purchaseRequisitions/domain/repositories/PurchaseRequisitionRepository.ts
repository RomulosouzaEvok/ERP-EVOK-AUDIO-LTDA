class PurchaseRequisitionRepository {
  async listRequisitions(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('PurchaseRequisitionRepository.listRequisitions nao implementado.');
  }

  async findRequisitionById(_id: number, _transaction?: any): Promise<any | null> {
    throw new Error('PurchaseRequisitionRepository.findRequisitionById nao implementado.');
  }

  async createRequisition(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.createRequisition nao implementado.');
  }

  async createRequisitionItem(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.createRequisitionItem nao implementado.');
  }
}

export = PurchaseRequisitionRepository;

