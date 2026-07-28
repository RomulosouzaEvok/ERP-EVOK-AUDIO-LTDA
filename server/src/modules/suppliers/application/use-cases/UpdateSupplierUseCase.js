const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError } = require('../../../../errors');

/** Campos aceitos pelo `PUT /api/suppliers/:id`, idêntico ao controller legado. */
const ALLOWED_FIELDS = [
  'company_name', 'trade_name', 'ie', 'phone', 'email',
  'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
  'contact_name', 'contact_phone', 'payment_terms', 'delivery_time', 'rating', 'notes'
];

/**
 * Atualiza um fornecedor existente, cobrindo o fluxo do endpoint
 * `PUT /api/suppliers/:id`.
 */
class UpdateSupplierUseCase extends UseCase {
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
   * @param {Object} input.body - `req.body` bruto; apenas os campos em `ALLOWED_FIELDS` são considerados.
   * @returns {Promise<Object>} Fornecedor atualizado.
   * @throws {NotFoundError} Com mensagem `'Fornecedor não encontrado'` se o id não existir.
   */
  async execute({ id, body }) {
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const updated = await this.suppliersRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundError('Fornecedor não encontrado');
    }

    return this.suppliersRepository.findById(id);
  }
}

module.exports = UpdateSupplierUseCase;
