import type { Transaction } from 'sequelize';

/**
 * Contrato do repositorio de Cotacao/RFQ multi-fornecedor.
 *
 * A camada de aplicacao (use cases) depende apenas desta interface, nunca
 * de uma implementacao concreta (Sequelize) — mantem a regra de negocio
 * independente do ORM/banco.
 *
 * @module modules/rfq/domain/repositories/RfqRepository
 */
class RfqRepository {
  /** Lista cotacoes com filtros e paginacao. */
  async listRfqs(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('RfqRepository.listRfqs nao implementado.');
  }

  /** Busca uma cotacao pelo id, com itens/fornecedores/cotacoes carregados. */
  async findRfqById(_id: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('RfqRepository.findRfqById nao implementado.');
  }

  /**
   * Busca uma cotacao "crua" (sem includes) com lock pessimista, para
   * transicoes de status que nao podem sofrer condicao de corrida
   * (convite de fornecedor, registro de cotacao, adjudicacao).
   */
  async findRfqByIdForUpdate(_id: number, _transaction: Transaction): Promise<any | null> {
    throw new Error('RfqRepository.findRfqByIdForUpdate nao implementado.');
  }

  /** Conta cotacoes ja criadas no ano informado (para o numero sequencial `RFQ-<ano>-XXXX`). */
  async countRfqsInYear(_year: number, _transaction?: Transaction): Promise<number> {
    throw new Error('RfqRepository.countRfqsInYear nao implementado.');
  }

  /** Cria o cabecalho de uma cotacao. */
  async createRfq(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.createRfq nao implementado.');
  }

  /** Atualiza campos do cabecalho de uma cotacao (ex.: status). */
  async updateRfq(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.updateRfq nao implementado.');
  }

  /** Cria um item de cotacao. */
  async createRfqItem(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.createRfqItem nao implementado.');
  }

  /** Lista os itens (crus) de uma cotacao. */
  async findRfqItems(_rfqId: number, _transaction?: Transaction): Promise<any[]> {
    throw new Error('RfqRepository.findRfqItems nao implementado.');
  }

  /** Atualiza um item de cotacao (usado na adjudicacao, para congelar o vencedor). */
  async updateRfqItem(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.updateRfqItem nao implementado.');
  }

  /** Busca um vinculo (fornecedor convidado) pelo par (rfq_id, supplier_id). */
  async findRfqSupplier(_rfqId: number, _supplierId: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('RfqRepository.findRfqSupplier nao implementado.');
  }

  /** Lista os fornecedores convidados de uma cotacao. */
  async findRfqSuppliers(_rfqId: number, _transaction?: Transaction): Promise<any[]> {
    throw new Error('RfqRepository.findRfqSuppliers nao implementado.');
  }

  /** Convida (cria o vinculo) um fornecedor para cotar. */
  async createRfqSupplier(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.createRfqSupplier nao implementado.');
  }

  /** Atualiza o status de um vinculo fornecedor x cotacao (ex.: `responded`). */
  async updateRfqSupplier(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.updateRfqSupplier nao implementado.');
  }

  /** Busca uma cotacao de preco existente pelo par (rfq_item_id, supplier_id) — usado no upsert. */
  async findRfqQuote(_rfqItemId: number, _supplierId: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('RfqRepository.findRfqQuote nao implementado.');
  }

  /** Cria uma resposta de cotacao (item x fornecedor). */
  async createRfqQuote(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.createRfqQuote nao implementado.');
  }

  /** Atualiza uma resposta de cotacao existente (upsert). */
  async updateRfqQuote(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('RfqRepository.updateRfqQuote nao implementado.');
  }

  /** Lista todas as cotacoes de preco (`rfq_quotes`) dos itens de uma RFQ, com fornecedor incluido. */
  async findQuotesByRfqId(_rfqId: number, _transaction?: Transaction): Promise<any[]> {
    throw new Error('RfqRepository.findQuotesByRfqId nao implementado.');
  }

  /**
   * Busca os itens de uma requisicao de compra (leitura cross-module
   * pontual — `PurchaseRequisitionItem` pertence ao modulo
   * `purchaseRequisitions`; usado apenas para puxar os itens automaticamente
   * quando uma RFQ nasce de uma requisicao).
   */
  async findRequisitionWithItems(_requisitionId: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('RfqRepository.findRequisitionWithItems nao implementado.');
  }
}

export = RfqRepository;
