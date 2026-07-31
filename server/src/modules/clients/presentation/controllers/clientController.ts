/**
 * Controller HTTP do modulo clients.
 *
 * @module modules/clients/presentation/controllers/clientController
 */

import type { Request, Response, NextFunction } from 'express';
import SequelizeClientsRepository = require('../../infrastructure/sequelize/SequelizeClientsRepository');
import ListClientsUseCase = require('../../application/use-cases/ListClientsUseCase');
import GetClientByIdUseCase = require('../../application/use-cases/GetClientByIdUseCase');
import CreateClientUseCase = require('../../application/use-cases/CreateClientUseCase');
import UpdateClientUseCase = require('../../application/use-cases/UpdateClientUseCase');
import DeactivateClientUseCase = require('../../application/use-cases/DeactivateClientUseCase');
const { createClientSchema, updateClientSchema, handleZodError }: any = require('../validators/clientValidators');

const clientsRepository = new SequelizeClientsRepository();

/** `GET /api/clients` — lista clientes com busca/filtro e paginacao. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 10, search, status } = req.query as any;
    const useCase = new ListClientsUseCase(clientsRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      search, status, page: parseInt(String(page), 10), limit: parseInt(String(limit), 10)
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: p, limit: l, totalPages }
    });
  } catch (error) {
    next(error);
  }
}

/** `GET /api/clients/:id` — busca um cliente pelo id. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new GetClientByIdUseCase(clientsRepository);
    const client = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

/** `POST /api/clients` — cria um novo cliente. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateClientUseCase(clientsRepository);
    const client = await useCase.execute(parsed.data);

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

/** `PUT /api/clients/:id` — atualiza um cliente existente. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new UpdateClientUseCase(clientsRepository);
    const client = await useCase.execute({ id: Number(req.params.id), body: parsed.data });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

/** `DELETE /api/clients/:id` — inativa (soft delete) um cliente. @param req - Request. @param res - Response. @param next - Next. @returns Promise<void>. */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const useCase = new DeactivateClientUseCase(clientsRepository);
    const result = await useCase.execute({ id: Number(req.params.id) });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

