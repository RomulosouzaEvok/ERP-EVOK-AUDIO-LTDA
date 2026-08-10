/**
 * Use case: liberar um lote (`LotControl`) para consumo.
 *
 * @module modules/inventory/application/use-cases/ReleaseLotUseCase
 *
 * Cobre `POST /api/inventory/lots/:id/release`. Aceita as transições:
 * - `quarantine` -> `available`: liberação pós-inspeção de recebimento;
 * - `blocked` -> `available`: liberação manual pós-tratativa de RNC (o
 *   fechamento da RNC como `effective` NÃO desbloqueia automaticamente o
 *   lote — a decisão de liberar é sempre manual, via este endpoint).
 *
 * ## G7 — a liberação deixou de ser um clique (2026-08-10)
 *
 * Até esta data, liberar era um POST com um campo `notes` livre: nenhum
 * inspetor identificado, nenhum critério de aceitação, nenhum resultado. A
 * decisão D-H do dono (a empresa pretende se certificar ISO 9001) tornou o
 * registro de inspeção uma pré-condição, para atender:
 *
 * - **ISO 9001:2015 §8.6** — "a liberação não deve prosseguir até que os
 *   arranjos planejados tenham sido satisfatoriamente concluídos"; reter
 *   informação documentada da liberação, incluindo evidência de conformidade
 *   com os critérios de aceitação **e rastreabilidade a quem autorizou**;
 * - **§8.7** — controle de saída não conforme (a aceitação sob concessão é
 *   um veredito próprio, com justificativa, e não um "release com
 *   observação").
 *
 * ⚠️ Texto integral da ISO 9001 é paywalled; as cláusulas são citadas por
 * número e assunto conforme
 * `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5.
 *
 * Em termos de código: a regra ("a inspeção mais recente do lote precisa ter
 * aprovado") mora em `decideLotRelease`, no domínio do módulo `quality`, e o
 * acesso ao registro vem de um **gateway injetado** — não de um import do
 * model de qualidade. Mesmo motivo do `lotGateway` de
 * `services/materialReceiptService.ts`: o gate fica testável com mock e o
 * módulo de estoque não abre uma segunda porta de acesso ao ORM de outro
 * domínio.
 */

import UseCase from '../../../../shared/application/UseCase';
import InventoryRepository = require('../../domain/repositories/InventoryRepository');
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { decideLotRelease, QUALITY_INSPECTION_RULE } from '../../../quality/domain/constants';

const RELEASABLE_STATUSES = ['quarantine', 'blocked'];

/**
 * Porta mínima de leitura do registro de inspeção exigida pelo gate.
 * `SequelizeQualityRepository` satisfaz esta forma estruturalmente.
 */
interface QualityInspectionGateway {
  findLatestInspectionForLot(lotId: number | string): Promise<any | null>;
}

interface ReleaseLotInput {
  id: number | string;
  notes?: string;
  /**
   * Usuário que AUTORIZA a liberação — sempre `req.user.id` (JWT), nunca do
   * body. É o dado que a ISO 9001 §8.6 chama de "pessoa que autorizou a
   * liberação"; aceitar isso do cliente esvaziaria o requisito.
   */
  releasedBy: number;
}

class ReleaseLotUseCase extends UseCase<ReleaseLotInput, any> {
  private readonly inventoryRepository: InventoryRepository;
  private readonly qualityGateway: QualityInspectionGateway;

  /**
   * @param inventoryRepository - Repositório de estoque.
   * @param qualityGateway - Leitura do registro de inspeção (G7). Obrigatório
   *   de propósito: um parâmetro opcional criaria um caminho silencioso em
   *   que o gate simplesmente não roda, que é exatamente o bug que este
   *   caso de uso passou a existir para fechar.
   */
  constructor(inventoryRepository: InventoryRepository, qualityGateway: QualityInspectionGateway) {
    super();
    this.inventoryRepository = inventoryRepository;
    this.qualityGateway = qualityGateway;
  }

  /**
   * @param input - Id do lote, observação opcional e id de quem autoriza (JWT).
   * @returns Lote atualizado (`status = 'available'`), já com
   *   `release_inspection_id`, `released_by` e `released_at` preenchidos.
   * @throws {NotFoundError} Se o lote não existir.
   * @throws {BusinessRuleError} Se o lote não estiver em `quarantine` nem `blocked`.
   *   `details: { rule: 'G7', lot_id, current_status, allowed_statuses }`.
   * @throws {BusinessRuleError} Se o gate de qualidade recusar (G7).
   *   `details: { rule: 'G7', lot_id, reason, inspection_id, inspection_verdict }`,
   *   com `reason` em `no_inspection | last_inspection_rejected`.
   *   **Nada é gravado neste caminho** — a checagem acontece integralmente
   *   antes do único `update` do método.
   */
  public async execute({ id, notes, releasedBy }: ReleaseLotInput): Promise<any> {
    const lot = await this.inventoryRepository.findLotById(id);
    if (!lot) {
      throw new NotFoundError('Lote não encontrado.');
    }
    if (!RELEASABLE_STATUSES.includes(lot.status)) {
      throw new BusinessRuleError(
        `Apenas lotes em 'quarantine' ou 'blocked' podem ser liberados. Status atual: '${lot.status}'.`,
        {
          rule: QUALITY_INSPECTION_RULE,
          lot_id: lot.id,
          current_status: lot.status,
          allowed_statuses: RELEASABLE_STATUSES
        }
      );
    }

    // Gate de qualidade (G7). Roda ANTES de qualquer escrita: se recusar, o
    // lote permanece byte a byte como estava — nem status, nem notes, nem os
    // campos de liberação são tocados.
    const latestInspection = await this.qualityGateway.findLatestInspectionForLot(lot.id);
    const decision = decideLotRelease(latestInspection);

    if (!decision.allowed) {
      const message = decision.reason === 'no_inspection'
        ? `Lote ${lot.lot_number} não tem inspeção de qualidade registrada. Registre a inspeção em POST /api/quality/inspections antes de liberar (ISO 9001 8.6).`
        : `A inspeção mais recente do lote ${lot.lot_number} reprovou o material (inspeção #${decision.inspectionId}). Trate a não conformidade e registre uma NOVA inspeção aprovada antes de liberar (ISO 9001 8.7).`;

      throw new BusinessRuleError(message, {
        rule: QUALITY_INSPECTION_RULE,
        lot_id: lot.id,
        lot_number: lot.lot_number,
        current_status: lot.status,
        reason: decision.reason,
        inspection_id: decision.inspectionId,
        inspection_verdict: decision.verdict,
      });
    }

    const releaseNote = notes ? String(notes).trim() : '';
    await lot.update({
      status: 'available',
      release_inspection_id: decision.inspectionId,
      released_by: releasedBy,
      released_at: new Date(),
      notes: releaseNote
        ? `${lot.notes ? `${lot.notes} | ` : ''}Liberado: ${releaseNote}`
        : lot.notes
    });

    return lot;
  }
}

export = ReleaseLotUseCase;
