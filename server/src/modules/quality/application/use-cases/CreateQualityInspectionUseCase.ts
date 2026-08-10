/**
 * Use case: registrar uma inspeção de qualidade sobre um lote (G7).
 *
 * @module modules/quality/application/use-cases/CreateQualityInspectionUseCase
 *
 * Cobre `POST /api/quality/inspections`. É o registro que a decisão D-H do
 * dono (2026-08-10) pediu: **critério, resultado, responsável e vínculo ao
 * lote** — o formato mínimo que a ISO 9001:2015 §8.6 exige para a evidência
 * de liberação.
 *
 * ## O que este caso de uso NÃO faz (de propósito)
 *
 * **Não libera o lote.** Inspecionar e liberar são atos distintos, e a §8.6
 * fala em rastreabilidade de *quem autorizou a liberação* — que pode não ser
 * o inspetor. A liberação continua em `POST /api/inventory/lots/:id/release`,
 * agora com o gate de que a inspeção mais recente tenha aprovado.
 *
 * **Não decide Ac/Re por amostragem.** Não há AQL nem nível de inspeção
 * parametrizado: são decisão da Engenharia da Qualidade e o dono não a tomou
 * (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, §Decisão 5
 * item (c) — o próprio documento marca os valores de AQL como
 * `[NÃO CONFIRMADO NA FONTE]`). `sampling_plan`/`sample_size`/`lot_size` são
 * evidência textual do que foi aplicado. O veredito é do inspetor.
 *
 * ## Integração com o que já existe (G8 e G10, commit `0d5812e`)
 *
 * Reprovação **não** reimplementa bloqueio de lote nem abertura de RNC: ela
 * chama `CreateNonConformityUseCase`, exatamente como `CreateAcousticTestUseCase`
 * passou a fazer no G8. Esse caso de uso já bloqueia o lote referenciado
 * (`quarantine|available|reserved -> blocked`), já herda o fornecedor do
 * lote, já recalcula `suppliers.quality_score` e já grava o aviso do G10
 * quando não consegue conter material nenhum. Duplicar isso aqui criaria uma
 * segunda verdade sobre o mesmo evento.
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../errors';
import QualityRepository = require('../../domain/repositories/QualityRepository');
import {
  INSPECTION_STAGES,
  INSPECTION_VERDICTS,
  QUALITY_INSPECTION_RULE,
} from '../../domain/constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreateNonConformityUseCase = require('../../../nonConformities/application/use-cases/CreateNonConformityUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SequelizeNonConformitiesRepository = require('../../../nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository');

/** Tamanho mínimo do critério de aceitação — evita "ok" como evidência de auditoria. */
const MIN_ACCEPTANCE_CRITERIA_LENGTH = 3;

/** Tamanho mínimo da justificativa de concessão (ISO 9001 §8.7). */
const MIN_CONCESSION_JUSTIFICATION_LENGTH = 10;

interface CreateQualityInspectionInput {
  lot_id?: number | string;
  stage?: string;
  acceptance_criteria?: string;
  sampling_plan?: string;
  lot_size?: number | string;
  sample_size?: number | string;
  defects_found?: number | string;
  verdict?: string;
  concession_justification?: string;
  notes?: string;
  /** Sempre do JWT (`req.user.id`) — nunca do body. Anti-spoofing é regra P0. */
  inspectorId: number;
}

class CreateQualityInspectionUseCase extends UseCase<CreateQualityInspectionInput, any> {
  private readonly qualityRepository: QualityRepository;

  /** @param qualityRepository - Repositório de qualidade. */
  public constructor(qualityRepository: QualityRepository) {
    super();
    this.qualityRepository = qualityRepository;
  }

  /**
   * @param input - Dados da inspeção. `inspectorId` vem do JWT.
   * @returns Inspeção criada (com `non_conformity_id` preenchido quando reprovada).
   * @throws {ValidationError} Campo obrigatório ausente/inválido.
   *   `details: { rule: 'G7', field, ... }`.
   * @throws {NotFoundError} Se o lote não existir.
   */
  public async execute(input: CreateQualityInspectionInput): Promise<any> {
    const lotId = input.lot_id;
    if (lotId === undefined || lotId === null || String(lotId).trim() === '') {
      throw new ValidationError('lot_id é obrigatório: toda inspeção é sobre um lote.', {
        rule: QUALITY_INSPECTION_RULE,
        field: 'lot_id',
      });
    }

    const stage = input.stage ?? 'incoming';
    if (!(INSPECTION_STAGES as readonly string[]).includes(stage)) {
      throw new ValidationError(`stage inválido: '${stage}'.`, {
        rule: QUALITY_INSPECTION_RULE,
        field: 'stage',
        allowed_values: INSPECTION_STAGES,
      });
    }

    const verdict = String(input.verdict ?? '');
    if (!(INSPECTION_VERDICTS as readonly string[]).includes(verdict)) {
      throw new ValidationError(`verdict inválido: '${verdict}'.`, {
        rule: QUALITY_INSPECTION_RULE,
        field: 'verdict',
        allowed_values: INSPECTION_VERDICTS,
      });
    }

    // ISO 9001 §8.6: a evidência retida tem que incluir o CRITÉRIO de
    // aceitação contra o qual o lote foi verificado. Sem isso o registro
    // volta a ser o "campo de observação livre" que o G7 existe para
    // eliminar.
    const acceptanceCriteria = String(input.acceptance_criteria ?? '').trim();
    if (acceptanceCriteria.length < MIN_ACCEPTANCE_CRITERIA_LENGTH) {
      throw new ValidationError(
        `acceptance_criteria é obrigatório (mínimo ${MIN_ACCEPTANCE_CRITERIA_LENGTH} caracteres): a ISO 9001 8.6 exige evidência do critério de aceitação aplicado.`,
        { rule: QUALITY_INSPECTION_RULE, field: 'acceptance_criteria', min_length: MIN_ACCEPTANCE_CRITERIA_LENGTH }
      );
    }

    // ISO 9001 §8.7: aceitação sob concessão é decisão registrada e
    // justificada — nunca um "release com observação".
    const concessionJustification = String(input.concession_justification ?? '').trim();
    if (verdict === 'approved_under_concession' && concessionJustification.length < MIN_CONCESSION_JUSTIFICATION_LENGTH) {
      throw new ValidationError(
        `concession_justification é obrigatório (mínimo ${MIN_CONCESSION_JUSTIFICATION_LENGTH} caracteres) na aceitação sob concessão (ISO 9001 8.7).`,
        { rule: QUALITY_INSPECTION_RULE, field: 'concession_justification', min_length: MIN_CONCESSION_JUSTIFICATION_LENGTH }
      );
    }

    const defectsFound = this.parseNonNegativeInteger(input.defects_found, 'defects_found');
    const sampleSize = this.parseOptionalNumber(input.sample_size, 'sample_size');
    const declaredLotSize = this.parseOptionalNumber(input.lot_size, 'lot_size');

    const lot = await this.qualityRepository.findLotById(lotId);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.', { rule: QUALITY_INSPECTION_RULE, lot_id: lotId });
    }

    const inspection = await this.qualityRepository.createInspection({
      // Mesma convenção de numeração de `NC-${Date.now()}` (RNC) já em uso.
      inspection_number: `INSP-${Date.now()}`,
      lot_id: lot.id,
      stage,
      acceptance_criteria: acceptanceCriteria,
      sampling_plan: input.sampling_plan ? String(input.sampling_plan).trim() : null,
      // Quando o inspetor não informa o tamanho do lote, o valor recebido do
      // próprio lote é a melhor evidência disponível — e é o número real.
      lot_size: declaredLotSize ?? this.parseOptionalNumber(lot.quantity_initial, 'lot_size') ?? null,
      sample_size: sampleSize ?? null,
      defects_found: defectsFound,
      verdict,
      concession_justification: verdict === 'approved_under_concession' ? concessionJustification : null,
      inspector_id: input.inspectorId,
      inspected_at: new Date(),
      notes: input.notes ? String(input.notes).trim() : null,
    });

    if (verdict !== 'rejected') {
      return inspection;
    }

    // Reprovação: delega bloqueio de lote + RNC ao caminho já existente
    // (G8/G10). Risco residual herdado e conhecido, idêntico ao de
    // `CreateAcousticTestUseCase`: `CreateNonConformityUseCase` abre
    // transação PRÓPRIA, então a inspeção já está gravada quando a RNC nasce.
    // Se a RNC falhar, fica uma inspeção reprovada sem RNC e a resposta é
    // 500 — o que NÃO abre o gate de liberação (reprovada continua
    // reprovada), então a falha é conservadora. Fechar isso exige aquele caso
    // de uso aceitar transação externa, o que afeta todos os seus chamadores.
    const nonConformitiesRepository = new SequelizeNonConformitiesRepository();
    const createNonConformityUseCase = new CreateNonConformityUseCase(nonConformitiesRepository);

    const nonConformity = await createNonConformityUseCase.execute({
      product_id: lot.product_id,
      lot_number: lot.lot_number,
      supplier_id: lot.supplier_id ?? undefined,
      description: `Reprovacao na inspecao ${inspection.inspection_number} (estagio ${stage}) do lote ${lot.lot_number}: criterio "${acceptanceCriteria}"; defeitos encontrados=${defectsFound}${sampleSize !== null ? ` em amostra de ${sampleSize}` : ''}.`,
      severity: 'major',
      // Conferido literal a literal contra o ENUM `non_conformities.origin`
      // do model `NonConformity` (`incoming | in_process | final | audit |
      // customer_complaint | supplier`): os 3 valores de
      // `quality_inspections.stage` são um SUBCONJUNTO exato dele, então o
      // repasse direto é seguro. Enum errado aqui passaria por typecheck e
      // por toda a suíte (o `where`/`create` do Sequelize é `any` e os testes
      // usam repositório mockado) e só explodiria como 500 do Postgres.
      origin: stage,
      defect_type: 'other',
      quantity_affected: defectsFound,
      reportedBy: input.inspectorId,
    });

    const updated = await this.qualityRepository.updateInspection(inspection.id, {
      non_conformity_id: nonConformity.id,
    });

    return updated ?? inspection;
  }

  /**
   * Converte um contador de defeitos em inteiro não negativo.
   *
   * @param value - Valor recebido no payload.
   * @param field - Nome do campo, usado no `details` do erro.
   * @returns Inteiro >= 0 (0 quando ausente).
   * @throws {ValidationError} Se não for numérico ou for negativo. `details: { rule: 'G7', field }`.
   */
  private parseNonNegativeInteger(value: unknown, field: string): number {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      throw new ValidationError(`${field} deve ser um inteiro maior ou igual a zero.`, {
        rule: QUALITY_INSPECTION_RULE,
        field,
      });
    }
    return parsed;
  }

  /**
   * Converte um campo numérico opcional (tamanhos de lote/amostra).
   *
   * @param value - Valor recebido no payload.
   * @param field - Nome do campo, usado no `details` do erro.
   * @returns Número > = 0, ou `null` quando ausente.
   * @throws {ValidationError} Se não for numérico ou for negativo. `details: { rule: 'G7', field }`.
   */
  private parseOptionalNumber(value: unknown, field: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ValidationError(`${field} deve ser um número maior ou igual a zero.`, {
        rule: QUALITY_INSPECTION_RULE,
        field,
      });
    }
    return parsed;
  }
}

export = CreateQualityInspectionUseCase;
