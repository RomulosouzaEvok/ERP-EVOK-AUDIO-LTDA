/**
 * Use case: registrar uma movimentação de estoque via scanner mobile
 * (entrada/saída de um único item).
 *
 * A lógica transacional (lock pessimista, validação de estoque disponível,
 * persistência atômica do `InventoryMovement`) permanece 100% em
 * `server/src/services/inventoryService.ts` (`InventoryService.adjust`),
 * conforme já reutilizado pelo módulo `inventory`
 * (`CreateInventoryMovementUseCase`) — não duplicada aqui.
 *
 * @module modules/mobileInventory/application/use-cases/ScanItemUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError, NotFoundError, ConflictError } from '../../../../errors';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

const InventoryService: any = require('../../../../services/inventoryService');

// UUID v1-v5 (mesma validação usada nos schemas zod das rotas irmãs).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ScanItemInput {
  product_code?: string;
  quantity?: number | string;
  type?: string;
  description?: string;
  // FIND-ERP-001 (GRUPO B, superfície-irmã, mesma causa-raiz de
  // `POST /api/inventory/movements`) — Q2 (APR-2026-020 handoff): opcional
  // por enquanto (consumidor externo ainda não envia esta chave). Se
  // informado, aplica idempotência (índice único); ausente, comportamento
  // igual ao anterior a esta remediação.
  operation_id?: string;
  userId: number;
  transaction: unknown;
}

class ScanItemUseCase extends UseCase<ScanItemInput, any> {
  private readonly mobileInventoryRepository: MobileInventoryRepository;

  /** @param mobileInventoryRepository - Repositorio de inventário mobile. */
  public constructor(mobileInventoryRepository: MobileInventoryRepository) {
    super();
    this.mobileInventoryRepository = mobileInventoryRepository;
  }

  /**
   * @param input - Dados do scan (product_code, quantity e type obrigatórios), id do usuário e transação ativa.
   * @returns Produto, movimentação registrada e nova quantidade em estoque.
   * @throws {ValidationError} Se dados obrigatórios estiverem ausentes/inválidos.
   * @throws {NotFoundError} Se o produto não existir.
   * @throws {ValidationError} Se o estoque for insuficiente para saída (`type='out'`).
   */
  public async execute(input: ScanItemInput): Promise<any> {
    const { product_code, quantity, type, description, operation_id, userId, transaction } = input;

    if (!product_code || quantity === undefined || !type) {
      throw new ValidationError('Código do produto, quantidade e tipo são obrigatórios');
    }
    const qty = parseInt(String(quantity), 10);
    if (qty <= 0) {
      throw new ValidationError('Quantidade deve ser maior que zero');
    }
    if (!['in', 'out'].includes(type)) {
      throw new ValidationError('Tipo deve ser in ou out');
    }
    if (operation_id !== undefined && operation_id !== null && !UUID_RE.test(String(operation_id))) {
      throw new ValidationError('operation_id deve ser um UUID válido');
    }
    const normalizedOperationId = operation_id?.trim() || null;

    const product = await this.mobileInventoryRepository.findProductByCode(product_code);
    if (!product) {
      throw new NotFoundError('Produto não encontrado');
    }
    if (type === 'out' && product.quantity < qty) {
      throw new ValidationError(`Estoque insuficiente. Disponível: ${product.quantity}`);
    }

    let movement: any;
    try {
      movement = await InventoryService.adjust(
        product.id,
        type,
        qty,
        userId,
        description || `Scan mobile ${type}`,
        transaction,
        undefined,
        undefined,
        normalizedOperationId
      );
    } catch (error: any) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('Este scan já foi aplicado.');
      }
      throw error;
    }

    return {
      product: { id: product.id, name: product.name, code: product.code },
      movement,
      new_quantity: movement.quantityAfter
    };
  }
}

export = ScanItemUseCase;
