import type { Transaction } from 'sequelize';

/**
 * Contrato do repositorio de Importacao/COMEX (UC-19).
 *
 * A camada de aplicacao (use cases) depende apenas desta interface, nunca
 * de uma implementacao concreta (Sequelize) — mantem a regra de negocio
 * independente do ORM/banco.
 *
 * @module modules/comex/domain/repositories/ComexRepository
 */
class ComexRepository {
  /** Lista processos de importacao com filtros e paginacao. */
  async listImportProcesses(_filters: Record<string, any>, _pagination: Record<string, any>): Promise<{ rows: any[]; count: number }> {
    throw new Error('ComexRepository.listImportProcesses nao implementado.');
  }

  /** Busca um processo de importacao pelo id, com itens/fornecedor/criador carregados. */
  async findImportProcessById(_id: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('ComexRepository.findImportProcessById nao implementado.');
  }

  /**
   * Busca um processo "cru" (sem includes) com lock pessimista, para
   * transicoes de status que nao podem sofrer condicao de corrida
   * (acompanhamento, cancelamento, recebimento).
   */
  async findImportProcessByIdForUpdate(_id: number, _transaction: Transaction): Promise<any | null> {
    throw new Error('ComexRepository.findImportProcessByIdForUpdate nao implementado.');
  }

  /** Conta processos de importacao ja criados no ano informado (numero sequencial `IMP-<ano>-XXXX`). */
  async countImportProcessesInYear(_year: number, _transaction?: Transaction): Promise<number> {
    throw new Error('ComexRepository.countImportProcessesInYear nao implementado.');
  }

  /** Cria o cabecalho de um processo de importacao. */
  async createImportProcess(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('ComexRepository.createImportProcess nao implementado.');
  }

  /** Atualiza campos do cabecalho de um processo de importacao. */
  async updateImportProcess(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('ComexRepository.updateImportProcess nao implementado.');
  }

  /** Cria um item de processo de importacao. */
  async createImportProcessItem(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('ComexRepository.createImportProcessItem nao implementado.');
  }

  /** Lista os itens (crus) de um processo de importacao, com lock pessimista opcional. */
  async findImportProcessItems(_importProcessId: number, _transaction?: Transaction, _forUpdate?: boolean): Promise<any[]> {
    throw new Error('ComexRepository.findImportProcessItems nao implementado.');
  }

  /** Atualiza um item de processo de importacao (usado para persistir os tributos/custo calculados). */
  async updateImportProcessItem(_id: number, _data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('ComexRepository.updateImportProcessItem nao implementado.');
  }

  /** Busca um fornecedor pelo id (validacao de existencia na criacao do processo). */
  async findSupplierById(_id: number, _transaction?: Transaction): Promise<any | null> {
    throw new Error('ComexRepository.findSupplierById nao implementado.');
  }

  /**
   * Busca um lote (`LotControl`) com lock pessimista, para consolidar uma
   * segunda entrada no mesmo lote (gap G14).
   *
   * Leitura/escrita cross-module pontual — `LotControl` pertence ao modulo de
   * estoque —, exatamente pelo mesmo motivo ja aceito em
   * `PurchaseRepository.findLotForReceipt`: a entrada de material importado
   * passa pelo MESMO caminho do recebimento de compra
   * (`materialReceiptService.receiveMaterialIntoQuarantine`), que exige este
   * par de metodos como gateway de lote.
   *
   * @param _where - `{ product_id, lot_number }`.
   */
  async findLotForReceipt(_where: Record<string, unknown>, _transaction: Transaction): Promise<any | null> {
    throw new Error('ComexRepository.findLotForReceipt nao implementado.');
  }

  /** Cria um lote (`LotControl`) para a entrada de material importado (gap G14 — mesmo raciocinio de {@link findLotForReceipt}). */
  async createLot(_data: Record<string, unknown>, _transaction: Transaction): Promise<any> {
    throw new Error('ComexRepository.createLot nao implementado.');
  }

  // --- G11-COMEX: gate de aprovacao da diretoria (decisao D-G, 2026-08-10) --

  /**
   * Lista as aprovacoes de diretoria ja registradas para um processo,
   * ordenadas por `approved_at`. Usada pelo gate do embarque e pelo
   * endpoint de leitura da situacao da alcada.
   */
  async listImportProcessApprovals(_importProcessId: number | string, _transaction?: Transaction): Promise<any[]> {
    throw new Error('ComexRepository.listImportProcessApprovals nao implementado.');
  }

  /** Busca a aprovacao de um papel especifico num processo (checagem de duplicidade antes de gravar). */
  async findImportProcessApprovalByRole(_importProcessId: number | string, _approverRole: string, _transaction?: Transaction): Promise<any | null> {
    throw new Error('ComexRepository.findImportProcessApprovalByRole nao implementado.');
  }

  /** Grava uma aprovacao de diretoria (`approver_user_id` sempre vindo do JWT). */
  async createImportProcessApproval(_data: Record<string, unknown>, _transaction?: Transaction): Promise<any> {
    throw new Error('ComexRepository.createImportProcessApproval nao implementado.');
  }
}

export = ComexRepository;
