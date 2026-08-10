/**
 * Use case: atualizar cliente.
 *
 * @module modules/clients/application/use-cases/UpdateClientUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ConflictError } from '../../../../errors';
import ClientsRepository from '../../domain/repositories/ClientsRepository';

/**
 * Campos aceitos pelo `PUT /api/clients/:id`.
 *
 * `cnae` entrou em 2026-08-10 pela decisão D-I do dono ("sim, mas opcional"):
 * quem cadastrou o cliente sem CNAE precisa poder completá-lo depois, e quem
 * cadastrou uma pessoa física precisa poder deixá-lo vazio para sempre.
 */
const ALLOWED_FIELDS = [
  'name', 'phone', 'email', 'notes', 'tax_regime', 'ie', 'im', 'cnae', 'status',
  'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'
];

interface UpdateClientInput {
  id: number;
  body: Record<string, any>;
}

class UpdateClientUseCase extends UseCase<UpdateClientInput, any> {
  private readonly clientsRepository: ClientsRepository;

  /** @param clientsRepository - Repositorio de clientes. */
  public constructor(clientsRepository: ClientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param input - Id do cliente e corpo bruto da requisicao.
   * @returns Cliente atualizado.
   * @throws {NotFoundError} Se o id nao existir.
   * @throws {ConflictError} Se houver violacao de unicidade de CPF/CNPJ.
   */
  public async execute({ id, body }: UpdateClientInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    let updated: number;
    try {
      updated = await this.clientsRepository.update(id, updateData);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      throw error;
    }

    if (!updated) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return this.clientsRepository.findById(id);
  }
}

export = UpdateClientUseCase;
