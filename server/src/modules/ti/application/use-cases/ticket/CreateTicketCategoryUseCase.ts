/**
 * `POST /api/ti/ticket-categories` — cria categoria de chamado (RF-TI-001).
 *
 * @module modules/ti/application/use-cases/ticket/CreateTicketCategoryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TicketRepository from '../../../domain/repositories/TicketRepository';
import { ValidationError, ConflictError } from '../../../../../errors';
import { toCategoryDTO } from '../../../infrastructure/mappers/TicketMapper';

interface Input {
  name: string;
  description?: string;
  default_priority?: string;
  active?: boolean;
}

class CreateTicketCategoryUseCase extends UseCase<Input, any> {
  private readonly repository: TicketRepository;

  public constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  /**
   * @throws {ValidationError} `name` ausente (400).
   * @throws {ConflictError} `name` já cadastrado em categoria ativa (409).
   */
  public async execute({ name, description, default_priority, active }: Input): Promise<any> {
    if (!name) throw new ValidationError('name é obrigatório.');

    const existing = await this.repository.findCategoryByName(name);
    if (existing && existing.active) {
      throw new ConflictError(`Já existe uma categoria ativa chamada "${name}".`);
    }

    const created = await this.repository.createCategory({
      name,
      description: description ?? null,
      default_priority: default_priority ?? 'medium',
      active: active ?? true,
    });
    return toCategoryDTO(created);
  }
}

export = CreateTicketCategoryUseCase;
