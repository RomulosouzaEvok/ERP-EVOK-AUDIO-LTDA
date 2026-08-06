/**
 * Caso de uso para registrar o acompanhamento de um processo de importacao
 * (UC-19, passo 5: "Registra acompanhamento (embarque, chegada,
 * desembaraco)").
 *
 * Cada evento avanca o processo sequencialmente:
 * `draft -> shipped -> arrived -> customs_cleared`. Nao aceita pular etapas
 * nem retroceder (ex.: registrar "chegada" antes de "embarque"). Se o
 * payload trouxer dados monetarios (cambio/frete/seguro/despesas), o
 * cabecalho e atualizado e os tributos/custo nacionalizado de todos os
 * itens sao recalculados na mesma transacao (ver
 * {@link recalculateImportProcessTaxes}).
 *
 * @module modules/comex/application/use-cases/RegisterImportTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import { recalculateImportProcessTaxes } from './recalculateImportProcessTaxes';

type TrackingEvent = 'shipped' | 'arrived' | 'customs_cleared';

/** Proxima etapa esperada, por status atual do processo. */
const NEXT_STATUS_BY_CURRENT: Record<string, TrackingEvent> = {
  draft: 'shipped',
  shipped: 'arrived',
  arrived: 'customs_cleared',
};

/** Coluna de data correspondente a cada evento de acompanhamento. */
const DATE_FIELD_BY_EVENT: Record<TrackingEvent, string> = {
  shipped: 'shipped_at',
  arrived: 'arrived_at',
  customs_cleared: 'customs_cleared_at',
};

interface RegisterImportTrackingInput {
  id: number;
  event: TrackingEvent;
  event_date?: string;
  exchange_rate?: number;
  freight_value?: number;
  insurance_value?: number;
  other_expenses_value?: number;
  notes?: string;
  transaction: any;
}

class RegisterImportTrackingUseCase extends UseCase<RegisterImportTrackingInput, any> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  /**
   * @param input - Id do processo, evento a registrar, data opcional do evento, dados monetarios opcionais e a transacao ativa.
   * @returns O processo atualizado, com itens recalculados (se dados monetarios foram informados).
   * @throws {NotFoundError} Se o processo nao existir.
   * @throws {BusinessRuleError} Se o evento informado nao for a proxima etapa esperada a partir do status atual (422).
   */
  public async execute(input: RegisterImportTrackingInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessByIdForUpdate(input.id, input.transaction);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }

    const expectedEvent = NEXT_STATUS_BY_CURRENT[importProcess.status];
    if (!expectedEvent || expectedEvent !== input.event) {
      throw new BusinessRuleError(
        `Nao e possivel registrar o evento "${input.event}" a partir do status atual "${importProcess.status}".`,
        { current_status: importProcess.status, expected_event: expectedEvent ?? null },
      );
    }

    const hasMonetaryUpdate = [input.exchange_rate, input.freight_value, input.insurance_value, input.other_expenses_value]
      .some((value) => value !== undefined);

    const updateData: Record<string, unknown> = {
      status: input.event,
      [DATE_FIELD_BY_EVENT[input.event]]: input.event_date ?? new Date().toISOString().slice(0, 10),
    };
    if (input.exchange_rate !== undefined) updateData.exchange_rate = input.exchange_rate;
    if (input.freight_value !== undefined) updateData.freight_value = input.freight_value;
    if (input.insurance_value !== undefined) updateData.insurance_value = input.insurance_value;
    if (input.other_expenses_value !== undefined) updateData.other_expenses_value = input.other_expenses_value;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedProcess = await this.comexRepository.updateImportProcess(input.id, updateData, input.transaction);

    if (hasMonetaryUpdate) {
      await recalculateImportProcessTaxes(this.comexRepository, updatedProcess, input.transaction);
    }

    return this.comexRepository.findImportProcessById(input.id, input.transaction);
  }
}

export = RegisterImportTrackingUseCase;
