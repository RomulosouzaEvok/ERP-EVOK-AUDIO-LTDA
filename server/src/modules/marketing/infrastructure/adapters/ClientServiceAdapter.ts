/**
 * Adapter de `ClientService` — reaproveita o módulo `clients` real
 * (`ClientsRepository`/`CreateClientUseCase`), nunca `Client.create()`
 * direto nem SQL próprio no módulo Marketing (isolamento entre módulos,
 * CLAUDE.md — mesmo precedente de `MaintenanceOrderServiceAdapter`,
 * `modules/ti/infrastructure/adapters/`).
 *
 * @module modules/marketing/infrastructure/adapters/ClientServiceAdapter
 */

import ClientService from '../../application/services/ClientService';

const ClientsRepository = require('../../../clients/domain/repositories/ClientsRepository');
const SequelizeClientsRepository = require('../../../clients/infrastructure/sequelize/SequelizeClientsRepository');
const CreateClientUseCase = require('../../../clients/application/use-cases/CreateClientUseCase');
const Validators = require('../../../../utils/validators');

class ClientServiceAdapter extends ClientService {
  private readonly clientsRepository: InstanceType<typeof ClientsRepository>;

  public constructor() {
    super();
    this.clientsRepository = new SequelizeClientsRepository();
  }

  /** @inheritdoc */
  public async findById(id: number): Promise<any | null> {
    return this.clientsRepository.findById(id);
  }

  /** @inheritdoc */
  public async search(query: { name?: string; cpf_cnpj?: string; phone?: string; email?: string }): Promise<any[]> {
    const search = query.cpf_cnpj || query.name || query.email || query.phone;
    if (!search) return [];

    const sanitized = Validators.sanitizeSearch(String(search));
    const { rows } = await this.clientsRepository.list({ limit: 20, offset: 0, search: sanitized });
    return rows;
  }

  /** @inheritdoc — reaproveita `CreateClientUseCase` (valida documento, converte `ConflictError` de CPF/CNPJ duplicado). */
  public async create(data: Record<string, unknown>, transaction?: unknown): Promise<any> {
    const useCase = new CreateClientUseCase(this.clientsRepository);
    return useCase.execute(data, transaction);
  }
}

export = ClientServiceAdapter;
