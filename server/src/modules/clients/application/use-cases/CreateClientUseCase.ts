/**
 * Use case: criar cliente.
 *
 * @module modules/clients/application/use-cases/CreateClientUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
const Validators: any = require('../../../../utils/validators');
import { ValidationError, ConflictError } from '../../../../errors';
import ClientEntity from '../../domain/entities/ClientEntity';
import ClientsRepository from '../../domain/repositories/ClientsRepository';

class CreateClientUseCase extends UseCase<Record<string, any>, any> {
  private readonly clientsRepository: ClientsRepository;

  /** @param clientsRepository - Repositorio de clientes. */
  public constructor(clientsRepository: ClientsRepository) {
    super();
    this.clientsRepository = clientsRepository;
  }

  /**
   * @param input - Dados do cliente a criar.
   * @returns Cliente criado.
   * @throws {ValidationError} Se `name`/`cpf_cnpj` estiverem ausentes ou o documento for invalido.
   * @throws {ConflictError} Com mensagem `'CPF/CNPJ já cadastrado'` se o documento ja existir.
   */
  public async execute(input: Record<string, any>): Promise<any> {
    const entity = new ClientEntity(input as any);

    const docValidation = Validators.validateDocument(entity.cpf_cnpj);
    if (!docValidation.valid) {
      throw new ValidationError(`Documento inválido: ${docValidation.error}`);
    }

    const cleanedDoc = entity.cpf_cnpj.replace(/[^\d]/g, '');

    try {
      return await this.clientsRepository.create({
        name: entity.name,
        cpf_cnpj: cleanedDoc,
        phone: entity.phone,
        email: entity.email,
        cep: entity.cep,
        street: entity.street,
        number: entity.number,
        complement: entity.complement,
        neighborhood: entity.neighborhood,
        city: entity.city,
        state: entity.state,
        notes: entity.notes,
        tax_regime: entity.tax_regime,
        ie: entity.ie,
        im: entity.im,
        status: 'active'
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      throw error;
    }
  }
}

export = CreateClientUseCase;
