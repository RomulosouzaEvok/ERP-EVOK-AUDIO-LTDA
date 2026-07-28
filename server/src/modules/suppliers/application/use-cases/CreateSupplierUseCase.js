const UseCase = require('../../../../shared/application/UseCase');
const Validators = require('../../../../utils/validators');
const { ValidationError, ConflictError } = require('../../../../errors');
const SupplierEntity = require('../../domain/entities/SupplierEntity');

/**
 * Cria um fornecedor, cobrindo o fluxo do endpoint `POST /api/suppliers`.
 *
 * A `SupplierEntity` valida apenas a FORMA da entrada (`company_name` e
 * `cnpj` obrigatórios), exatamente como o controller legado
 * `server/src/controllers/supplierController.js#create`. A validação do
 * dígito verificador do CNPJ reutiliza `Validators.validateDocument`
 * (`server/src/utils/validators.js`), sem duplicar a lógica.
 */
class CreateSupplierUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  constructor(suppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.company_name
   * @param {string} input.cnpj
   * @param {string} [input.trade_name]
   * @param {string} [input.ie]
   * @param {string} [input.phone]
   * @param {string} [input.email]
   * @param {string} [input.address]
   * @param {string} [input.contact_name]
   * @param {string} [input.contact_phone]
   * @param {string} [input.payment_terms]
   * @param {number} [input.delivery_time]
   * @param {string} [input.notes]
   * @returns {Promise<Object>} Fornecedor criado.
   * @throws {ValidationError} Se `company_name`/`cnpj` estiverem ausentes ou o CNPJ for inválido.
   * @throws {ConflictError} Com mensagem `'CNPJ já cadastrado'` se o CNPJ já existir (`SequelizeUniqueConstraintError`).
   */
  async execute(input) {
    const entity = new SupplierEntity(input);

    const docValidation = Validators.validateDocument(entity.cnpj);
    if (!docValidation.valid) {
      throw new ValidationError(`CNPJ inválido: ${docValidation.error}`);
    }

    const cleanedCNPJ = entity.cnpj.replace(/[^\d]/g, '');

    try {
      return await this.suppliersRepository.create({
        company_name: entity.company_name,
        trade_name: entity.trade_name,
        cnpj: cleanedCNPJ,
        ie: entity.ie,
        phone: entity.phone,
        email: entity.email,
        contact_name: entity.contact_name,
        contact_phone: entity.contact_phone,
        payment_terms: entity.payment_terms,
        delivery_time: entity.delivery_time,
        rating: 3,
        status: 'active',
        notes: entity.notes
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CNPJ já cadastrado');
      }
      throw error;
    }
  }
}

module.exports = CreateSupplierUseCase;
