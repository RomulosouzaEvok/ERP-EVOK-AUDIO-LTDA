/**
 * Use case: criar fornecedor.
 *
 * @module modules/suppliers/application/use-cases/CreateSupplierUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
const Validators: any = require('../../../../utils/validators');
import { ValidationError, ConflictError } from '../../../../errors';
import SupplierEntity from '../../domain/entities/SupplierEntity';
import SuppliersRepository from '../../domain/repositories/SuppliersRepository';

class CreateSupplierUseCase extends UseCase<Record<string, any>, any> {
  private readonly suppliersRepository: SuppliersRepository;

  /** @param suppliersRepository - Repositorio de fornecedores. */
  public constructor(suppliersRepository: SuppliersRepository) {
    super();
    this.suppliersRepository = suppliersRepository;
  }

  /**
   * @param input - Dados do fornecedor a criar.
   * @returns Fornecedor criado.
   * @throws {ValidationError} Se `company_name`/`cnpj` estiverem ausentes ou o CNPJ for invalido.
   * @throws {ConflictError} Com mensagem `'CNPJ já cadastrado'` se o CNPJ ja existir.
   */
  public async execute(input: Record<string, any>): Promise<any> {
    const entity = new SupplierEntity(input as any);

    const docValidation = Validators.validateDocument(entity.cnpj);
    if (!docValidation.valid) {
      throw new ValidationError(`CNPJ inválido: ${docValidation.error}`);
    }

    const cleanedCNPJ = entity.cnpj.replace(/[^\d]/g, '');

    try {
      return await this.suppliersRepository.create({
        company_name: entity.company_name,
        trade_name: entity.trade_name,
        cnpj: cleanedCNPJ,
        ie: entity.ie,
        phone: entity.phone,
        email: entity.email,
        contact_name: entity.contact_name,
        contact_phone: entity.contact_phone,
        payment_terms: entity.payment_terms,
        delivery_time: entity.delivery_time,
        rating: 3,
        status: 'active',
        notes: entity.notes
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('CNPJ já cadastrado');
      }
      throw error;
    }
  }
}

export = CreateSupplierUseCase;
