const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, ConflictError } = require('../../../../errors');

/** Campos aceitos pelo `PUT /api/clients/:id`, idêntico ao controller legado. */
const ALLOWED_FIELDS = [
  'name', 'phone', 'email', 'notes', 'tax_regime', 'ie', 'im', 'status',
  'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'
];

/**
 * Atualiza um cliente existente, cobrindo o fluxo do endpoint
 * `PUT /api/clients/:id`.
 */
class UpdateClientUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ClientsRepository')} clientsRepository
   */
  constructor(clientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Object} input.body - `req.body` bruto; apenas os campos em `ALLOWED_FIELDS` são considerados.
   * @returns {Promise<Object>} Cliente atualizado.
   * @throws {NotFoundError} Com mensagem `'Cliente não encontrado'` se o id não existir.
   * @throws {ConflictError} Com mensagem `'CPF/CNPJ já cadastrado'` se houver violação de unicidade (`SequelizeUniqueConstraintError`).
   */
  async execute({ id, body }) {
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    let updated;
    try {
      updated = await this.clientsRepository.update(id, updateData);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      throw error;
    }

    if (!updated) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return this.clientsRepository.findById(id);
  }
}

module.exports = UpdateClientUseCase;
