/**
 * Busca uma cotacao (RFQ) pelo id, com itens/fornecedores/cotacoes
 * carregados, cobrindo o endpoint `GET /api/rfqs/:id`.
 *
 * @module modules/rfq/application/use-cases/GetRfqByIdUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import RfqRepository from '../../domain/repositories/RfqRepository';

interface GetRfqByIdInput {
  id: number;
}

class GetRfqByIdUseCase extends UseCase<GetRfqByIdInput, any> {
  private readonly rfqRepository: RfqRepository;

  public constructor(rfqRepository: RfqRepository) {
    super();
    this.rfqRepository = rfqRepository;
  }

  public async execute({ id }: GetRfqByIdInput): Promise<any> {
    const rfq = await this.rfqRepository.findRfqById(id);
    if (!rfq) {
      throw new NotFoundError('Cotacao (RFQ) nao encontrada.');
    }
    return rfq;
  }
}

export = GetRfqByIdUseCase;
