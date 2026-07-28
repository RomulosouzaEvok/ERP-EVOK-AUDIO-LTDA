const SequelizeClientsRepository = require('../../infrastructure/sequelize/SequelizeClientsRepository');
const ListClientsUseCase = require('../../application/use-cases/ListClientsUseCase');
const GetClientByIdUseCase = require('../../application/use-cases/GetClientByIdUseCase');
const CreateClientUseCase = require('../../application/use-cases/CreateClientUseCase');
const UpdateClientUseCase = require('../../application/use-cases/UpdateClientUseCase');
const DeactivateClientUseCase = require('../../application/use-cases/DeactivateClientUseCase');

/**
 * Controller enxuto do módulo `clients`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve sempre o
 * envelope padrão `{ success: true, data }`, mantendo exatamente o mesmo
 * formato JSON e os mesmos 5 endpoints do controller legado
 * (`server/src/controllers/clientController.js`), que permanece no
 * repositório apenas como referência histórica e não está mais registrado
 * em nenhuma rota ativa (ver `server/src/modules/clients/README.md`).
 */
const clientsRepository = new SequelizeClientsRepository();

/**
 * `GET /api/clients` — lista clientes com busca/filtro e paginação.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const useCase = new ListClientsUseCase(clientsRepository);
    const { rows, count, page: p, limit: l, totalPages } = await useCase.execute({
      search, status, page: parseInt(page), limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: p, limit: l, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * `GET /api/clients/:id` — busca um cliente pelo id.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.getById = async (req, res, next) => {
  try {
    const useCase = new GetClientByIdUseCase(clientsRepository);
    const client = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * `POST /api/clients` — cria um novo cliente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.create = async (req, res, next) => {
  try {
    const {
      name, cpf_cnpj, phone, email, address, notes, tax_regime, ie, im,
      city, state, cep, street, number, complement, neighborhood
    } = req.body;

    const useCase = new CreateClientUseCase(clientsRepository);
    const client = await useCase.execute({
      name, cpf_cnpj, phone, email, address, notes, tax_regime, ie, im,
      city, state, cep, street, number, complement, neighborhood
    });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * `PUT /api/clients/:id` — atualiza um cliente existente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.update = async (req, res, next) => {
  try {
    const useCase = new UpdateClientUseCase(clientsRepository);
    const client = await useCase.execute({ id: req.params.id, body: req.body });
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

/**
 * `DELETE /api/clients/:id` — inativa (soft delete) um cliente.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.remove = async (req, res, next) => {
  try {
    const useCase = new DeactivateClientUseCase(clientsRepository);
    const result = await useCase.execute({ id: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
