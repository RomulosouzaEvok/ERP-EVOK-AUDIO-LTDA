/**
 * Use case: registrar devolução de um EPI reutilizável já confirmado.
 * Não reabre nem edita a entrega original — cria um sub-registro em
 * `sst_devolucoes_epi` (insert-only).
 *
 * @module modules/sst/application/use-cases/epi/ReturnEpiDeliveryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';

interface ReturnEpiDeliveryInput {
  id: string | number;
  body: { data_devolucao?: string; condicao?: string };
  registradoPor: number;
}

class ReturnEpiDeliveryUseCase extends UseCase<ReturnEpiDeliveryInput, any> {
  private readonly epiRepository: EpiRepository;

  public constructor(epiRepository: EpiRepository) {
    super();
    this.epiRepository = epiRepository;
  }

  /**
   * @param input - `{ id, body: { data_devolucao, condicao }, registradoPor }`.
   * @throws {ValidationError} Se `data_devolucao`/`condicao` ausentes (400).
   * @throws {NotFoundError} Se a entrega não existir (404).
   * @throws {BusinessRuleError} Se a entrega não estiver confirmada (422).
   */
  public async execute({ id, body, registradoPor }: ReturnEpiDeliveryInput): Promise<any> {
    if (!body.data_devolucao || !body.condicao) {
      throw new ValidationError('data_devolucao e condicao são obrigatórios.');
    }

    const entrega = await this.epiRepository.findEntregaById(id);
    if (!entrega) throw new NotFoundError('Entrega de EPI não encontrada.');
    if (!entrega.confirmada) {
      throw new BusinessRuleError('Só é possível registrar devolução de uma entrega confirmada.');
    }

    const devolucao = await this.epiRepository.createDevolucao({
      entrega_epi_id: entrega.id,
      data_devolucao: body.data_devolucao,
      condicao: body.condicao,
      registrado_por: registradoPor
    });

    return { id: devolucao.id, entrega_epi_id: devolucao.entrega_epi_id, data_devolucao: devolucao.data_devolucao, condicao: devolucao.condicao };
  }
}

export = ReturnEpiDeliveryUseCase;
