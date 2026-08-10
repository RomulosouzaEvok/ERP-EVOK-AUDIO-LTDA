import type { Transaction } from 'sequelize';

const QualityRepository = require('../../domain/repositories/QualityRepository');
// ⚠️ `QualityInspection` é carregado DIRETO do arquivo do model, e não de
// `models/index.ts`, porque aquele arquivo está sob edição concorrente de
// outros agentes nesta rodada e não pôde ser tocado. `sequelize.define` já
// registra a tabela na instância, então tudo funciona — o que falta são as
// ASSOCIAÇÕES (`belongsTo` de lote/inspetor/RNC). Por isso nenhuma consulta
// deste repositório usa `include`; ela devolveria erro de alias inexistente.
// Registro em `models/index.ts` pendente, reportado em `docs/governance/TODO.md`.
const QualityInspection = require('../../../../models/QualityInspection');
const { LotControl } = require('../../../../models/index');

/**
 * Implementação Sequelize/PostgreSQL do contrato `QualityRepository` (G7).
 *
 * @module modules/quality/infrastructure/sequelize/SequelizeQualityRepository
 */
class SequelizeQualityRepository extends QualityRepository {
  /** @inheritdoc */
  async findLotById(id: number | string) {
    return LotControl.findByPk(id);
  }

  /** @inheritdoc */
  async createInspection(data: Record<string, unknown>, transaction?: Transaction) {
    return QualityInspection.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  async updateInspection(id: number | string, data: Record<string, unknown>) {
    const inspection = await QualityInspection.findByPk(id);
    if (!inspection) return null;
    return inspection.update(data);
  }

  /** @inheritdoc */
  async findInspectionById(id: number | string) {
    return QualityInspection.findByPk(id);
  }

  /**
   * @inheritdoc
   *
   * A ordenação `inspected_at DESC, id DESC` é o que dá sentido à regra "a
   * inspeção mais recente manda" (ver `decideLotRelease`). O desempate por
   * `id` existe porque duas inspeções podem ter o mesmo `inspected_at` (o
   * default é `CURRENT_TIMESTAMP`, e o inspetor pode informar a data) — sem
   * ele, uma reprovação registrada logo após uma aprovação no mesmo instante
   * poderia ser ignorada.
   */
  async findLatestInspectionForLot(lotId: number | string, transaction?: Transaction) {
    return QualityInspection.findOne({
      where: { lot_id: lotId },
      order: [['inspected_at', 'DESC'], ['id', 'DESC']],
      ...(transaction ? { transaction } : {}),
    });
  }

  /** @inheritdoc */
  async listInspections(where: Record<string, unknown> = {}, pagination: any = {}) {
    const { count, rows } = await QualityInspection.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['inspected_at', 'DESC'], ['id', 'DESC']],
    });
    return { rows, count };
  }
}

module.exports = SequelizeQualityRepository;
