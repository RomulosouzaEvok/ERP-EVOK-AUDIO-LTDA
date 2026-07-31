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
import { ValidationError, NotFoundError } from '../../../../errors';
import MobileInventoryRepository from '../../domain/repositories/MobileInventoryRepository';

const InventoryService: any = require('../../../../services/inventoryService');

interface ScanItemInput {
  product_code?: string;
  quantity?: number | string;
  type?: string;
  description?: string;
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
    const { product_code, quantity, type, description, userId, transaction } = input;

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

    const product = await this.mobileInventoryRepository.findProductByCode(product_code);
    if (!product) {
      throw new NotFoundError('Produto não encontrado');
    }
    if (type === 'out' && product.quantity < qty) {
      throw new ValidationError(`Estoque insuficiente. Disponível: ${product.quantity}`);
    }

    const movement = await InventoryService.adjust(
      product.id,
      type,
      qty,
      userId,
      description || `Scan mobile ${type}`,
      transaction
    );

    return {
      product: { id: product.id, name: product.name, code: product.code },
      movement,
      new_quantity: movement.quantityAfter
    };
  }
}

export = ScanItemUseCase;
