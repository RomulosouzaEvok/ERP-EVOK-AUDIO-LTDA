/**
 * Use case: criar/homologar um TipoEPI (RF-SST-001/003, BR-SST-001).
 *
 * @module modules/sst/application/use-cases/epi/CreateEpiTypeUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { ValidationError, NotFoundError, ConflictError } from '../../../../../errors';
import { fromTipoEpiInput, toTipoEpiDTO } from '../../../infrastructure/mappers/EpiMapper';

interface CreateEpiTypeInput {
  body: Record<string, any>;
  createdBy: number;
}

class CreateEpiTypeUseCase extends UseCase<CreateEpiTypeInput, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - Payload (inglês) do TipoEPI + id do usuário autenticado.
   * @returns TipoEPI criado (DTO em inglês).
   * @throws {ValidationError} Se `nome`, `ca_numero` ou `ca_validade` ausentes (400).
   * @throws {NotFoundError} Se `item_id` informado não existir em `items` (404).
   * @throws {ConflictError} Se `ca_numero` já estiver cadastrado em outro TipoEPI ativo (409).
   */
  public async execute({ body, createdBy }: CreateEpiTypeInput): Promise<any> {
    if (!body.nome || !body.ca_numero || !body.ca_validade) {
      throw new ValidationError('nome, ca_numero e ca_validade são obrigatórios (BR-SST-001).');
    }

    if (body.item_id) {
      const item = await this.epiRepository.findItemById(body.item_id);
      if (!item) throw new NotFoundError('Item informado não existe.');
    }

    const existing = await this.epiRepository.findTipoActiveByCa(body.ca_numero);
    if (existing) {
      throw new ConflictError('Já existe um Tipo de EPI ativo com este CA.');
    }

    const data = fromTipoEpiInput(body);
    data.created_by = createdBy;
    const tipo = await this.epiRepository.createTipo(data);
    return toTipoEpiDTO(tipo);
  }
}

export = CreateEpiTypeUseCase;
