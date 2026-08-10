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
 * ## G11-COMEX — gate da diretoria no embarque (decisao D-G, 2026-08-10)
 *
 * O evento `shipped` (transicao `draft -> shipped`) so passa se a diretoria
 * ja tiver aprovado o processo (`import_process_approvals`). E o unico ponto
 * do ciclo em que ainda da para desistir sem custo afundado. Alem disso, a
 * MESMA requisicao que consome a aprovacao nao pode alterar os valores
 * aprovados — ver {@link MONETARY_FIELDS_FROZEN_ON_SHIPMENT} e
 * `../../domain/constants`.
 *
 * @module modules/comex/application/use-cases/RegisterImportTrackingUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import { recalculateImportProcessTaxes } from './recalculateImportProcessTaxes';
import {
  IMPORT_APPROVAL_GATE_EVENT,
  IMPORT_APPROVAL_RULE,
  MONETARY_FIELDS_FROZEN_ON_SHIPMENT,
  requiredImportApproverRoles,
} from '../../domain/constants';

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
   * @throws {BusinessRuleError} Se o evento informado nao for a proxima etapa esperada a partir do status atual (422); ou, no embarque, se a aprovacao da diretoria estiver pendente ou o payload tentar alterar valores ja aprovados (`details.rule = 'G11-COMEX'`).
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

    // G11-COMEX: gate ANTES de qualquer escrita — nada e gravado (nem o
    // status, nem o recalculo de tributos) sem a diretoria.
    if (input.event === IMPORT_APPROVAL_GATE_EVENT) {
      await this.assertDirectorateApproval(importProcess, input.transaction);
      this.assertApprovedValuesUnchanged(input, hasMonetaryUpdate);
    }

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

  /**
   * G11-COMEX — exige que todos os papeis de alcada de um processo de
   * importacao ja tenham aprovado antes do embarque (decisao D-G do dono do
   * produto em 2026-08-10).
   *
   * Nao ha faixa de valor: importacao e sempre da diretoria, coerente com o
   * G11 de compras (`purchases/domain/constants.ts`), onde origem
   * `import` exige `diretor` em qualquer valor.
   *
   * @param importProcess - Processo ja carregado com lock na transacao.
   * @param transaction - Transacao ativa (a leitura das aprovacoes precisa enxergar o mesmo snapshot do lock).
   * @throws {BusinessRuleError} 422 com `details.rule = 'G11-COMEX'` se faltar alguma aprovacao.
   */
  private async assertDirectorateApproval(importProcess: any, transaction: any): Promise<void> {
    const required = requiredImportApproverRoles();
    const approvals = (await this.comexRepository.listImportProcessApprovals(importProcess.id, transaction)) || [];
    const approvedRoles = new Set(approvals.map((approval: any) => approval.approver_role));
    const missing = required.filter((role: string) => !approvedRoles.has(role));

    if (missing.length > 0) {
      throw new BusinessRuleError(
        `Aprovacao da diretoria pendente: processo de importacao exige aprovacao em qualquer valor antes do embarque. Registre a aprovacao em POST /api/comex/import-processes/${importProcess.id}/approve antes de registrar o embarque.`,
        { rule: IMPORT_APPROVAL_RULE, required_roles: required, missing_roles: missing },
      );
    }
  }

  /**
   * G11-COMEX — impede que a mesma requisicao que consome a aprovacao altere
   * os valores aprovados (cambio, frete, seguro, despesas).
   *
   * Sem isto o gate seria decorativo: `POST /:id/tracking` e o UNICO caminho
   * de escrita capaz de mexer no cabecalho monetario (nao existe `PUT /:id`
   * neste modulo e os itens sao imutaveis desde a criacao), entao daria para
   * aprovar um processo de R$ 50 mil e embarcar um de R$ 1 milhao na mesma
   * chamada. E o equivalente do congelamento de
   * `supplier_id`/`freight_value`/`origin` apos `approved` no G11.
   *
   * Vale SOMENTE no evento `shipped`: `arrived`/`customs_cleared` continuam
   * aceitando dados monetarios (despesas aduaneiras reais so aparecem
   * depois, e sao posteriores ao compromisso). Se o cambio precisar mudar
   * antes de embarcar, o caminho e cancelar e recriar o processo — mesma
   * regra que ja vale hoje para fornecedor e itens, que tambem nao tem
   * endpoint de edicao.
   *
   * @param input - Payload recebido no acompanhamento.
   * @param hasMonetaryUpdate - Se o payload traz ao menos um campo monetario.
   * @throws {BusinessRuleError} 422 com `details.rule = 'G11-COMEX'` se houver tentativa de alteracao.
   */
  private assertApprovedValuesUnchanged(input: RegisterImportTrackingInput, hasMonetaryUpdate: boolean): void {
    if (!hasMonetaryUpdate) return;

    const attempted = MONETARY_FIELDS_FROZEN_ON_SHIPMENT.filter(
      (field) => (input as unknown as Record<string, unknown>)[field] !== undefined,
    );

    throw new BusinessRuleError(
      `Valores aprovados pela diretoria nao podem ser alterados no embarque (${attempted.join(', ')}). Registre o embarque sem dados monetarios, ou cancele e recrie o processo para reapresenta-lo a diretoria.`,
      { rule: IMPORT_APPROVAL_RULE, frozen_fields: attempted },
    );
  }
}

export = RegisterImportTrackingUseCase;
