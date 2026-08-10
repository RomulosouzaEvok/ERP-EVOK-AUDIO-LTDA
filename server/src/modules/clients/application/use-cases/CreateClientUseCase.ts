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
   * @param transaction - Transação Sequelize opcional — usada por
   * `modules/marketing/.../ConvertLeadUseCase` (RF-MKT-002) para criar o
   * `Client` e atualizar o `MarketingLead` na mesma transação de banco.
   * @returns Cliente criado.
   * @throws {ValidationError} Se `name`/`cpf_cnpj` estiverem ausentes ou o documento for invalido.
   * @throws {ConflictError} Com mensagem `'CPF/CNPJ já cadastrado'` se o documento ja existir.
   */
  public async execute(input: Record<string, any>, transaction?: unknown): Promise<any> {
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
        // `phone`, `email` e `notes` sao `NOT NULL DEFAULT ''` no banco e
        // `allowNull: false, defaultValue: ''` no model `Client` — sao
        // strings vazias por ausencia, nao NULL. `ClientEntity` normaliza
        // campo ausente para `null` (`props.phone ?? null`), e passar esse
        // `null` explicito ANULA o DEFAULT do Postgres e estoura
        // `null value in column "phone" violates not-null constraint`.
        // Segunda camada do BUG-02 (a primeira, `cnae NOT NULL`, era drift
        // de schema e saiu na migration 20260810-000028): aqui quem estava
        // errado era o codigo, nao o schema — por isso a correcao e no use
        // case e nao um DROP NOT NULL. As demais colunas abaixo sao
        // legitimamente nullable e continuam podendo receber `null`.
        phone: entity.phone ?? '',
        email: entity.email ?? '',
        cep: entity.cep,
        street: entity.street,
        number: entity.number,
        complement: entity.complement,
        neighborhood: entity.neighborhood,
        city: entity.city,
        state: entity.state,
        notes: entity.notes ?? '',
        tax_regime: entity.tax_regime,
        ie: entity.ie,
        im: entity.im,
        status: 'active'
      }, transaction);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CPF/CNPJ já cadastrado');
      }
      throw error;
    }
  }
}

export = CreateClientUseCase;
