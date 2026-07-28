const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ValidationError } = require('../../../../errors');

/**
 * Inativa (soft delete via `status='inactive'`) um fornecedor, cobrindo o
 * fluxo de `DELETE /api/suppliers/:id`.
 *
 * Migrado 1:1 do controller legado
 * `server/src/controllers/supplierController.js#remove`: bloqueia a
 * inativação caso o fornecedor possua pedidos de compra pendentes
 * (status `pending`/`approved`/`sent`/`partial`).
 */
class DeactivateSupplierUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  constructor(suppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @returns {Promise<{ message: string }>}
   * @throws {ValidationError} Com mensagem `'Fornecedor possui N pedido(s) de compra pendente(s).'` se houver compras pendentes.
   * @throws {NotFoundError} Com mensagem `'Fornecedor não encontrado'` se o id não existir.
   */
  async execute({ id }) {
    const pendingPurchases = await this.suppliersRepository.countPendingPurchases(id);
    if (pendingPurchases > 0) {
      throw new ValidationError(`Fornecedor possui ${pendingPurchases} pedido(s) de compra pendente(s).`);
    }

    const updated = await this.suppliersRepository.update(id, { status: 'inactive' });
    if (!updated) {
      throw new NotFoundError('Fornecedor não encontrado');
    }

    return { message: 'Fornecedor inativado com sucesso' };
  }
}

module.exports = DeactivateSupplierUseCase;
