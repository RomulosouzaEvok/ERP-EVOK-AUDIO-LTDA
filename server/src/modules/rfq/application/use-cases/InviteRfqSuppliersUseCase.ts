/**
 * Caso de uso para convidar fornecedores a cotar uma RFQ.
 *
 * Transiciona a cotacao `draft -> sent` no primeiro convite (idempotente:
 * convidar novamente enquanto `sent`/`quoted` nao muda o status). Convites
 * repetidos ao mesmo fornecedor sao ignorados silenciosamente (nao gera erro
 * nem duplicata), permitindo o botao "Convidar" do frontend reenviar a lista
 * completa de sugestoes sem se preocupar com o que ja foi convidado.
 *
 * @module modules/rfq/application/use-cases/InviteRfqSuppliersUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import RfqRepository from '../../domain/repositories/RfqRepository';

/** Status que ainda aceitam novos convites de fornecedor. */
const INVITABLE_STATUSES = ['draft', 'sent', 'quoted'];

interface ItemSupplierRepositoryLike {
  findSupplierById(supplierId: number): Promise<any | null>;
}

interface InviteRfqSuppliersInput {
  id: number;
  supplier_ids: number[];
  transaction: any;
}

class InviteRfqSuppliersUseCase extends UseCase<InviteRfqSuppliersInput, any> {
  private readonly rfqRepository: RfqRepository;
  private readonly itemSupplierRepository: ItemSupplierRepositoryLike;

  public constructor(rfqRepository: RfqRepository, itemSupplierRepository: ItemSupplierRepositoryLike) {
    super();
    this.rfqRepository = rfqRepository;
    this.itemSupplierRepository = itemSupplierRepository;
  }

  /**
   * @param input - Id da RFQ, lista de `supplier_id` a convidar e a transacao ativa.
   * @returns A RFQ atualizada, com a lista de fornecedores convidados carregada.
   * @throws {NotFoundError} Se a RFQ nao existir, ou se algum `supplier_id` nao existir.
   * @throws {BusinessRuleError} Se a RFQ estiver `awarded`/`cancelled` (422).
   */
  public async execute(input: InviteRfqSuppliersInput): Promise<any> {
    const rfq = await this.rfqRepository.findRfqByIdForUpdate(input.id, input.transaction);
    if (!rfq) {
      throw new NotFoundError('Cotacao (RFQ) nao encontrada.');
    }

    if (!INVITABLE_STATUSES.includes(rfq.status)) {
      throw new BusinessRuleError(
        `Nao e possivel convidar fornecedores para uma cotacao com status "${rfq.status}".`,
        { current_status: rfq.status },
      );
    }

    const missingSuppliers: number[] = [];
    for (const supplierId of input.supplier_ids) {
      const supplier = await this.itemSupplierRepository.findSupplierById(supplierId);
      if (!supplier) {
        missingSuppliers.push(supplierId);
      }
    }
    if (missingSuppliers.length > 0) {
      throw new NotFoundError(`Fornecedor(es) nao encontrado(s): ${missingSuppliers.join(', ')}.`);
    }

    for (const supplierId of input.supplier_ids) {
      const existing = await this.rfqRepository.findRfqSupplier(input.id, supplierId, input.transaction);
      if (!existing) {
        await this.rfqRepository.createRfqSupplier({
          rfq_id: input.id,
          supplier_id: supplierId,
          status: 'invited',
        }, input.transaction);
      }
    }

    if (rfq.status === 'draft') {
      await this.rfqRepository.updateRfq(input.id, { status: 'sent' }, input.transaction);
    }

    return this.rfqRepository.findRfqById(input.id, input.transaction);
  }
}

export = InviteRfqSuppliersUseCase;
