/**
 * Caso de uso: criação de material de divulgação (metadados — o arquivo em
 * si é enviado depois via `POST /api/marketing/materials/:id/file`),
 * cobrindo o fluxo do endpoint `POST /api/marketing/materials`.
 *
 * RF-MKT-039: todo material nasce `approved=false` — `createMaterialSchema`
 * já não aceita `approved` no payload (chave desconhecida rejeitada pelo
 * Zod `.strict()`), este use case reforça a regra em profundidade (defesa
 * contra qualquer chamada direta que bypasse o validador).
 *
 * @module modules/marketing/application/use-cases/material/CreateMaterialUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import MaterialRepository from '../../../domain/repositories/MaterialRepository';

type CreateMaterialInput = Record<string, any>;

class CreateMaterialUseCase extends UseCase<CreateMaterialInput, any> {
  private readonly materialRepository: MaterialRepository;

  constructor(materialRepository: MaterialRepository) {
    super();
    this.materialRepository = materialRepository;
  }

  async execute(input: CreateMaterialInput) {
    return this.materialRepository.createMaterial({ ...input, approved: false, approved_by: null, approved_at: null });
  }
}

export = CreateMaterialUseCase;
