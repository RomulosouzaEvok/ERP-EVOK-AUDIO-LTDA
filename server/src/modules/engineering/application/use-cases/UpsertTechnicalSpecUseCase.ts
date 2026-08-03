/**
 * Caso de uso: criacao ou atualizacao (upsert) da ficha tecnica
 * (especificacao Thiele-Small) de um item.
 *
 * @module modules/engineering/application/use-cases/UpsertTechnicalSpecUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import EngineeringRepository from '../../domain/repositories/EngineeringRepository';

type UpsertTechnicalSpecInput = {
  itemId: string;
  familia_tecnica?: string;
  atributos: Record<string, unknown>;
};

class UpsertTechnicalSpecUseCase extends UseCase<UpsertTechnicalSpecInput, any> {
  private readonly engineeringRepository: EngineeringRepository;

  constructor(engineeringRepository: EngineeringRepository) {
    super();
    this.engineeringRepository = engineeringRepository;
  }

  /**
   * @param input - `{ itemId, familia_tecnica?, atributos }`.
   * @returns Especificacao tecnica persistida.
   * @throws {NotFoundError} Se o item nao existir.
   */
  async execute({ itemId, familia_tecnica, atributos }: UpsertTechnicalSpecInput): Promise<any> {
    const item = await this.engineeringRepository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    const existing = await this.engineeringRepository.findTechnicalSpecByItemId(itemId);

    return this.engineeringRepository.upsertTechnicalSpec(itemId, {
      familia_tecnica: familia_tecnica ?? existing?.familia_tecnica ?? 'ALTO_FALANTE',
      atributos,
    });
  }
}

export = UpsertTechnicalSpecUseCase;
