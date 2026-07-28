const { ValidationError } = require('../../../../errors');

/**
 * Validação manual leve de entrada para o módulo de produtos. Não usa
 * bibliotecas de schema (Zod/Joi) — isso é planejado para a Fase 8 do TODO.
 *
 * Estes validadores checam apenas presença/tipo básico dos campos que já
 * eram exigidos pelo controller legado; as regras de negócio mais ricas
 * (unicidade, preço vs custo, etc.) permanecem na entidade/use cases.
 */

/**
 * Valida o corpo de `POST /api/products/movements`.
 *
 * @param {Object} body - `req.body`.
 * @returns {void}
 * @throws {ValidationError} Se `type` não for `in`/`out` ou `quantity` não for numérica.
 */
function validateMovementBody(body) {
  const { type, quantity } = body || {};
  if (type !== undefined && !['in', 'out'].includes(type)) {
    throw new ValidationError('Tipo de movimentação deve ser "in" ou "out".');
  }
  if (quantity !== undefined && Number.isNaN(Number(quantity))) {
    throw new ValidationError('Quantidade deve ser numérica.');
  }
}

module.exports = { validateMovementBody };
