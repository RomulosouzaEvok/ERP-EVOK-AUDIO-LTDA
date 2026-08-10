const UseCase = require('../../../../shared/application/UseCase');
const { NotFoundError, BusinessRuleError } = require('../../../../errors');
import type { IBOMRepository } from '../../domain/repositories/BOMRepository';

/** Campos gerais da BOM que podem ser alterados via `PUT /:id`. */
const ALLOWED_FIELDS = ['revision', 'revision_notes', 'notes', 'status'];

/**
 * Campos de conteúdo de engenharia. Alterá-los muda o que a BOM *diz*, e por
 * isso são congelados assim que a estrutura passa a valer (ver regra
 * `G1-BOM-ATIVA-IMUTAVEL`). `status` fica de fora de propósito: transição de
 * ciclo de vida não é alteração de conteúdo.
 */
const ENGINEERING_FIELDS = ['revision', 'revision_notes', 'notes'];

/**
 * Transições de status permitidas a partir de uma BOM já vigente. Uma
 * estrutura ativa pode ser aposentada (`inactive`) ou rebaixada por uma
 * revisão nova (`superseded`) — o que ela não pode é voltar a `draft`, que
 * reescreveria a história do que a produção consumiu.
 */
const ACTIVE_ALLOWED_TRANSITIONS = ['active', 'inactive', 'superseded'];

/**
 * Atualiza campos gerais de uma BOM (não os itens — para alterar itens,
 * criar uma nova revisão via `CreateBOMUseCase`), cobrindo
 * `PUT /api/engineering/bom/:id`.
 *
 * ## Controle de alteração de engenharia (G1 — ISO 9001 §8.5.6)
 *
 * Até 2026-08-10 este caminho era um `UPDATE` cru: dava para reescrever a
 * revisão de uma BOM já vigente, ressuscitar uma BOM `superseded` e —
 * o pior — marcar `status: 'active'` numa segunda BOM do mesmo produto. Com
 * duas ativas, `BillOfMaterial.findOne({ status: 'active' })` passa a
 * devolver **uma BOM arbitrária**, e planejamento e consumo podem pegar
 * revisões diferentes do mesmo produto. É o gap G1 reaparecendo por dentro
 * do módulo que deveria fechá-lo.
 *
 * Agora vale o mesmo ciclo que o G5 aplicou ao roteiro de manufatura:
 *
 * - BOM `active` é **imutável** no conteúdo; mudança exige nova revisão
 *   (`POST /api/engineering/bom`), que já clona e rebaixa a anterior;
 * - BOM `superseded` é **intocável**: ela sustenta o consumo e o custo das
 *   OPs que já rodaram com ela;
 * - ativar uma BOM rebaixa a ativa anterior do mesmo produto **na mesma
 *   transação** — nunca duas ativas, nunca zero.
 */
class UpdateBOMUseCase extends UseCase {
  private bomRepository: IBOMRepository;

  /** @param {IBOMRepository} bomRepository */
  constructor(bomRepository: IBOMRepository) {
    super();
    this.bomRepository = bomRepository;
  }

  /**
   * @param {Object} input
   * @param {number} input.id - Id da BOM.
   * @param {Object} input.data - Campos a atualizar (subconjunto de `ALLOWED_FIELDS`).
   * @returns {Promise<{ before: Object, updateData: Object, bom: Object, supersededIds: number[] }>}
   * @throws {NotFoundError} Se a BOM não existir.
   * @throws {BusinessRuleError} `G1-BOM-SUPERSEDED-IMUTAVEL` ao tentar alterar
   *   uma BOM já rebaixada; `G1-BOM-ATIVA-IMUTAVEL` ao tentar alterar conteúdo
   *   de engenharia de uma BOM vigente; `G1-BOM-STATUS-INVALIDO` numa
   *   transição de status não permitida a partir de `active`.
   */
  async execute({ id, data }: { id: number; data: Record<string, unknown> }) {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const before = await this.bomRepository.findRawById(id);
    if (!before) {
      throw new NotFoundError('BOM não encontrada');
    }

    this.assertChangeIsAllowed(before, updateData);

    const isActivation = updateData.status === 'active' && before.status !== 'active';
    let supersededIds: number[] = [];

    if (isActivation) {
      const { updated, supersededIds: superseded } = await this.bomRepository.activateExclusively(
        Number(before.id),
        Number(before.product_id),
        this.withoutStatus(updateData),
      );
      if (!updated) {
        throw new NotFoundError('BOM não encontrada');
      }
      supersededIds = superseded ?? [];
    } else {
      const updated = await this.bomRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundError('BOM não encontrada');
      }
    }

    const bom = await this.bomRepository.findById(id);

    return { before, updateData, bom, supersededIds };
  }

  /**
   * Aplica o controle de alteração de engenharia sobre a BOM alvo.
   *
   * @param {Object} before - Estado atual da BOM.
   * @param {Object} updateData - Campos pedidos na alteração.
   * @returns {void}
   * @throws {BusinessRuleError} Quando a alteração fere o ciclo de revisão.
   */
  private assertChangeIsAllowed(before: any, updateData: Record<string, unknown>): void {
    if (before.status === 'superseded') {
      throw new BusinessRuleError(
        `A BOM #${before.id} foi substituída por uma revisão mais nova e não pode mais ser alterada. `
        + 'Ela continua registrando o que as ordens de produção já consumiram e custearam com ela — '
        + 'mexer nela reescreveria a história da fábrica. Altere a revisão vigente do produto.',
        { rule: 'G1-BOM-SUPERSEDED-IMUTAVEL', bomId: before.id, productId: before.product_id },
      );
    }

    if (before.status !== 'active') return;

    const touchedEngineeringFields = ENGINEERING_FIELDS.filter(
      (field) => updateData[field] !== undefined && updateData[field] !== before[field],
    );
    if (touchedEngineeringFields.length > 0) {
      throw new BusinessRuleError(
        `A BOM #${before.id} está vigente (revisão ${before.revision}) e é imutável. `
        + 'Para mudar a estrutura, crie uma nova revisão (POST /api/engineering/bom): a revisão nova entra '
        + 'como vigente e esta vira histórico, com os componentes intactos.',
        {
          rule: 'G1-BOM-ATIVA-IMUTAVEL',
          bomId: before.id,
          productId: before.product_id,
          revision: before.revision,
          fields: touchedEngineeringFields,
        },
      );
    }

    if (updateData.status !== undefined && !ACTIVE_ALLOWED_TRANSITIONS.includes(String(updateData.status))) {
      throw new BusinessRuleError(
        `A BOM #${before.id} está vigente e não pode voltar para "${updateData.status}". `
        + 'De vigente ela só pode ser aposentada (inactive) ou substituída por uma revisão nova (superseded).',
        {
          rule: 'G1-BOM-STATUS-INVALIDO',
          bomId: before.id,
          from: before.status,
          to: updateData.status,
          allowed: ACTIVE_ALLOWED_TRANSITIONS,
        },
      );
    }
  }

  /**
   * Remove `status` do payload — na ativação exclusiva quem grava o status é
   * o repositório, dentro da transação que rebaixa a BOM anterior.
   *
   * @param {Object} updateData - Campos pedidos na alteração.
   * @returns {Object} Cópia sem `status`.
   */
  private withoutStatus(updateData: Record<string, unknown>): Record<string, unknown> {
    const { status, ...rest } = updateData;
    void status;
    return rest;
  }
}

module.exports = UpdateBOMUseCase;
