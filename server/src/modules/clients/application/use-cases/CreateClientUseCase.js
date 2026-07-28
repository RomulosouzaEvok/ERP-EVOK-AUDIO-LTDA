const UseCase = require('../../../../shared/application/UseCase');
const Validators = require('../../../../utils/validators');
const { ValidationError, ConflictError } = require('../../../../errors');
const ClientEntity = require('../../domain/entities/ClientEntity');

/**
 * Cria um cliente, cobrindo o fluxo do endpoint `POST /api/clients`.
 *
 * A `ClientEntity` valida apenas a FORMA da entrada (`name` e `cpf_cnpj`
 * obrigatórios), exatamente como o controller legado
 * `server/src/controllers/clientController.js#create`. A validação do
 * dígito verificador do CPF/CNPJ reutiliza `Validators.validateDocument`
 * (`server/src/utils/validators.js`), sem duplicar a lógica.
 */
class CreateClientUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/ClientsRepository')} clientsRepository
   */
  constructor(clientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param {Object} input
   * @param {string} input.name
   * @param {string} input.cpf_cnpj
   * @param {string} [input.phone]
   * @param {string} [input.email]
   * @param {string} [input.address] - Aceito por compatibilidade com o controller legado; sem coluna correspondente no model `Client` (ignorado na persistência, mesmo comportamento legado).
   * @param {string} [input.notes]
   * @param {string} [input.tax_regime]
   * @param {string} [input.ie]
   * @param {string} [input.im]
   * @param {string} [input.cep]
   * @param {string} [input.street]
   * @param {string} [input.number]
   * @param {string} [input.complement]
   * @param {string} [input.neighborhood]
   * @param {string} [input.city]
   * @param {string} [input.state]
   * @returns {Promise<Object>} Cliente criado.
   * @throws {ValidationError} Se `name`/`cpf_cnpj` estiverem ausentes ou o documento for inválido.
   * @throws {ConflictError} Com mensagem `'CPF/CNPJ já cadastrado'` se o documento já existir (`SequelizeUniqueConstraintError`).
   */
  async execute(input) {
    const entity = new ClientEntity(input);

    const docValidation = Validators.validateDocument(entity.cpf_cnpj);
    if (!docValidation.valid) {
      throw new ValidationError(`Documento inválido: ${docValidation.error}`);
    }

    const cleanedDoc = entity.cpf_cnpj.replace(/[^\d]/g, '');

    try {
      return await this.clientsRepository.create({
        name: entity.name,
        cpf_cnpj: cleanedDoc,
        phone: entity.phone,
        email: entity.email,
        cep: entity.cep,
        street: entity.street,
        number: entity.number,
        complement: entity.complement,
        neighborhood: entity.neighborhood,
        city: entity.city,
        state: entity.state,
        notes: entity.notes,
        tax_regime: entity.tax_regime,
        ie: entity.ie,
        im: entity.im,
        status: 'active'
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      throw error;
    }
  }
}

module.exports = CreateClientUseCase;
