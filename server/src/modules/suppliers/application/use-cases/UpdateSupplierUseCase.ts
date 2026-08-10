import type SuppliersRepository = require('../../domain/repositories/SuppliersRepository');

const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');

/**
 * Campos aceitos pelo `PUT /api/suppliers/:id` (idêntico ao controller
 * anterior + `is_foreign`, G11).
 */
const ALLOWED_FIELDS = [
  'company_name', 'trade_name', 'ie', 'phone', 'email',
  'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
  'contact_name', 'contact_phone', 'payment_terms', 'delivery_time', 'rating', 'notes',
  'is_foreign'
];

/**
 * Atualiza um fornecedor existente, cobrindo o fluxo do endpoint
 * `PUT /api/suppliers/:id`.
 */
class UpdateSupplierUseCase extends UseCase {
  /**
   * @param {import('../../domain/repositories/SuppliersRepository')} suppliersRepository
   */
  private suppliersRepository: SuppliersRepository;

  constructor(suppliersRepository: SuppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id
   * @param {Object} input.body - `req.body` bruto; apenas os campos em `ALLOWED_FIELDS` são considerados.
   * @returns {Promise<Object>} Fornecedor atualizado.
   * @throws {NotFoundError} Com mensagem `'Fornecedor não encontrado'` se o id não existir.
   * @throws {BusinessRuleError} G11 — tentativa de desmarcar `is_foreign` (estrangeiro → nacional) pela API.
   */
  async execute({ id, body }: { id: number | string; body: Record<string, unknown> }) {
    const updateData: any = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const supplierId = Number(id);

    // G11 — `is_foreign` é escalation-only pela API: marcar um fornecedor
    // como estrangeiro (correção de cadastro) é livre; DESMARCAR não, porque
    // seria a forma mais silenciosa de tirar todos os pedidos daquele
    // fornecedor da alçada obrigatória da diretoria. Reverter exige ação
    // administrativa direta no banco, com trilha própria.
    if (updateData.is_foreign === false) {
      const current = await this.suppliersRepository.findById(supplierId);
      if (!current) {
        throw new NotFoundError('Fornecedor não encontrado');
      }
      if (current.is_foreign === true) {
        throw new BusinessRuleError(
          'Fornecedor marcado como estrangeiro não pode ser convertido em nacional pela API — todo pedido de compra dele exige aprovação da diretoria (G11).',
          { rule: 'G11' },
        );
      }
    }
    const updated = await this.suppliersRepository.update(supplierId, updateData);
    if (!updated) {
      throw new NotFoundError('Fornecedor não encontrado');
    }

    return this.suppliersRepository.findById(supplierId);
  }
}

module.exports = UpdateSupplierUseCase;



