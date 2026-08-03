class PurchaseRequisitionRepository {
  async listRequisitions(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('PurchaseRequisitionRepository.listRequisitions nao implementado.');
  }

  async findRequisitionById(_id: number, _transaction?: any): Promise<any | null> {
    throw new Error('PurchaseRequisitionRepository.findRequisitionById nao implementado.');
  }

  /**
   * Busca uma requisicao (sem includes) com lock pessimista (`FOR UPDATE`) e
   * seus itens tambem travados, para uso em conversoes/transicoes que nao
   * podem sofrer condicao de corrida (ex.: conversao em pedido de compra).
   *
   * @abstract
   * @param id - Id da requisicao.
   * @param transaction - Transacao Sequelize ativa (obrigatoria para o lock).
   * @returns Requisicao "crua" com `items` (array simples) anexado, ou `null`.
   */
  async findRequisitionByIdForUpdate(_id: number, _transaction: any): Promise<any | null> {
    throw new Error('PurchaseRequisitionRepository.findRequisitionByIdForUpdate nao implementado.');
  }

  async createRequisition(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.createRequisition nao implementado.');
  }

  async createRequisitionItem(_data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.createRequisitionItem nao implementado.');
  }

  async updateRequisition(_id: number, _data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.updateRequisition nao implementado.');
  }

  /**
   * Atualiza o status de um item de requisicao especifico.
   *
   * @abstract
   * @param id - Id do item de requisicao (`purchase_requisition_items.id`).
   * @param data - Campos a atualizar (ex.: `{ status: 'ordered' }`).
   * @param transaction - Transacao Sequelize ativa.
   */
  async updateRequisitionItem(_id: number, _data: Record<string, any>, _transaction?: any): Promise<any> {
    throw new Error('PurchaseRequisitionRepository.updateRequisitionItem nao implementado.');
  }
}

export = PurchaseRequisitionRepository;

