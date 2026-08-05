/**
 * Caso de uso para atualizar campos cadastrais de um item industrial.
 *
 * Escopo inicial restrito ao opt-in de conversao automatica do MRP
 * (`conversao_automatica`) — roadmap pos-Go-Live item 3
 * (`docs/LEVANTAMENTO_ERP_2026-08-02.md`). Demais campos aceitos pelo
 * `updateItemSchema` (ver `itemValidators.ts`) sao propagados sem filtro
 * adicional; apenas os campos presentes no payload sao alterados.
 *
 * @module modules/items/application/use-cases/UpdateItemUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ItemRepository from '../../domain/repositories/ItemRepository';

interface UpdateItemInput {
  itemId: string;
  data: Record<string, any>;
}

/**
 * Atualiza um item existente com os campos informados (partial update).
 */
class UpdateItemUseCase extends UseCase<UpdateItemInput, any> {
  private readonly itemRepository: ItemRepository;

  public constructor(itemRepository: ItemRepository) {
    super();
    this.itemRepository = itemRepository;
  }

  /**
   * Executa a atualizacao parcial do item.
   *
   * @param input.itemId - Id (UUID) do item a atualizar.
   * @param input.data - Campos validados a atualizar (apenas os presentes sao alterados).
   * @returns Item atualizado.
   * @throws NotFoundError se o item nao existir.
   */
  public async execute(input: UpdateItemInput): Promise<any> {
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new NotFoundError('Item nao encontrado.');
    }

    return this.itemRepository.update(input.itemId, input.data);
  }
}

export = UpdateItemUseCase;
