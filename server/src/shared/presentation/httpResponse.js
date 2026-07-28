/**
 * Helpers de resposta HTTP para padronizar o envelope JSON usado em toda a API:
 * `{ success: true, data, ...meta }` para sucesso.
 *
 * Erros não são tratados aqui: use `next(error)` com as classes de
 * `server/src/errors` e deixe o `errorHandler` global montar a resposta de erro.
 */

/**
 * Responde 200 OK com o envelope padrão de sucesso.
 *
 * @param {import('express').Response} res - Resposta Express.
 * @param {*} data - Dados a retornar no campo `data`.
 * @param {Object} [meta] - Campos extras a mesclar no corpo da resposta (ex.: `{ pagination: {...} }`).
 * @returns {import('express').Response} A própria resposta Express (para encadeamento, se necessário).
 */
function ok(res, data, meta = {}) {
  return res.status(200).json({ success: true, data, ...meta });
}

/**
 * Responde 201 Created com o envelope padrão de sucesso.
 *
 * @param {import('express').Response} res - Resposta Express.
 * @param {*} data - Recurso criado a retornar no campo `data`.
 * @returns {import('express').Response} A própria resposta Express.
 */
function created(res, data) {
  return res.status(201).json({ success: true, data });
}

/**
 * Responde 204 No Content (sem corpo).
 *
 * @param {import('express').Response} res - Resposta Express.
 * @returns {import('express').Response} A própria resposta Express.
 */
function noContent(res) {
  return res.status(204).send();
}

module.exports = { ok, created, noContent };
