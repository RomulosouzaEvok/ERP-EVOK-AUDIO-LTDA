/**
 * 📨 Helpers de resposta HTTP padronizada.
 *
 * Toda resposta de sucesso da API segue o envelope:
 * `{ success: true, data, ...meta }`
 *
 * Erros não são tratados aqui: use `next(error)` com as classes de
 * `server/src/errors` e deixe o `errorHandler` global montar a resposta.
 *
 * @module shared/presentation/httpResponse
 */

import { Response } from 'express';

/**
 * Responde 200 OK com o envelope padrão de sucesso.
 *
 * @param res - Resposta Express.
 * @param data - Dados a retornar no campo `data`.
 * @param meta - Campos extras a mesclar no corpo (ex.: `{ pagination: {...} }`).
 * @returns A própria resposta Express para encadeamento.
 */
export function ok<T>(res: Response, data: T, meta: Record<string, unknown> = {}): Response {
  return res.status(200).json({ success: true, data, ...meta });
}

/**
 * Responde 201 Created com o envelope padrão de sucesso.
 *
 * @param res - Resposta Express.
 * @param data - Recurso criado a retornar no campo `data`.
 * @returns A própria resposta Express.
 */
export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data });
}

/**
 * Responde 204 No Content (sem corpo).
 *
 * @param res - Resposta Express.
 * @returns A própria resposta Express.
 */
export function noContent(res: Response): Response {
  return res.status(204).send();
}
