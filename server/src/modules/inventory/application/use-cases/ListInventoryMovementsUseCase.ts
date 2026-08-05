import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');

/** Filtros e paginação aceitos por `ListInventoryMovementsUseCase.execute`. */
interface ListInventoryMovementsInput {
  product_id?: number;
  /** Filtro dual-read (novo, PREFERIDO) — repassado a `listMovements`. */
  item_id?: string;
  type?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  /** Filtra movimentações de um depósito específico (Bloco 4, UC-42). */
  warehouse_id?: number;
  limit: number;
  offset: number;
  page: number;
}

/** Resultado paginado de `ListInventoryMovementsUseCase.execute`. */
interface ListInventoryMovementsOutput {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Lista movimentações de estoque com filtros e paginação.
 */
class ListInventoryMovementsUseCase extends UseCase<ListInventoryMovementsInput, ListInventoryMovementsOutput> {
  private readonly inventoryRepository: InventoryRepository;

  /** @param inventoryRepository - Repositório de estoque. */
  constructor(inventoryRepository: InventoryRepository) {
    super();
    this.inventoryRepository = inventoryRepository;
  }

  /**
   * @param input - Filtros e paginação.
   * @returns Movimentações paginadas.
   */
  async execute({ product_id, item_id, type, start_date, end_date, warehouse_id, limit, offset, page }: ListInventoryMovementsInput): Promise<ListInventoryMovementsOutput> {
    const { rows, count } = await this.inventoryRepository.listMovements(
      { product_id, item_id, type, start_date, end_date, warehouse_id },
      { limit, offset }
    );
    return { rows, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListInventoryMovementsUseCase;

