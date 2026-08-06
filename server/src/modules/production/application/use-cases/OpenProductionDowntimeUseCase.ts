/**
 * Use case: abrir uma parada de máquina/centro de trabalho (downtime).
 *
 * @module modules/production/application/use-cases/OpenProductionDowntimeUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../../errors';
import { sequelize } from '../../../../config/database';
const { WorkCenter, ProductionOrder }: any = require('../../../../models/index');

const VALID_REASONS = ['setup', 'manutencao_corretiva', 'manutencao_preventiva', 'falta_material', 'falta_operador', 'qualidade', 'outros'];

interface OpenProductionDowntimeInput {
  work_center_id: number;
  production_order_id?: number | null;
  reason: string;
  notes?: string | null;
  started_at?: string;
  created_by: number;
}

class OpenProductionDowntimeUseCase extends UseCase<OpenProductionDowntimeInput, Promise<any>> {
  private readonly downtimeRepository: any;

  /** @param downtimeRepository - Repositório de paradas. */
  public constructor(downtimeRepository: any) {
    super();
    this.downtimeRepository = downtimeRepository;
  }

  /**
   * Abre uma parada (`finished_at = null`) para um centro de trabalho,
   * opcionalmente vinculada a uma OP.
   *
   * @param input - Dados da parada.
   * @returns Parada criada, com associações.
   * @throws {ValidationError} Se `work_center_id`/`reason` forem inválidos.
   * @throws {NotFoundError} Se o centro de trabalho (ou a OP informada) não existir.
   * @throws {BusinessRuleError} Se o centro já tiver uma parada aberta (422, didático).
   */
  public async execute(input: OpenProductionDowntimeInput): Promise<any> {
    if (!Number.isInteger(input.work_center_id) || input.work_center_id <= 0) {
      throw new ValidationError('work_center_id deve ser um inteiro positivo');
    }
    if (!VALID_REASONS.includes(input.reason)) {
      throw new ValidationError(`reason invalido. Valores aceitos: ${VALID_REASONS.join(', ')}`);
    }

    const t = await sequelize.transaction();
    try {
      const workCenter = await WorkCenter.findByPk(input.work_center_id, { transaction: t });
      if (!workCenter) throw new NotFoundError('Centro de trabalho nao encontrado');

      if (input.production_order_id) {
        const order = await ProductionOrder.findByPk(input.production_order_id, { transaction: t });
        if (!order) throw new NotFoundError('Ordem de producao nao encontrada');
      }

      // Bloqueio de 2ª parada aberta simultânea no mesmo centro (422 didático).
      // A checagem aqui roda dentro da transação (findOpenByWorkCenter usa
      // FOR UPDATE quando `t` é passado); o índice parcial único de
      // `production_downtimes` (migration 20260806-000060) é a rede de
      // segurança final contra corrida entre transações concorrentes.
      const open = await this.downtimeRepository.findOpenByWorkCenter(input.work_center_id, t);
      if (open) {
        throw new BusinessRuleError(
          `Centro de trabalho "${workCenter.code}" ja possui uma parada aberta (#${open.id}, iniciada em ${new Date(open.started_at).toLocaleString('pt-BR')}). Encerre-a antes de abrir uma nova.`,
        );
      }

      const downtime = await this.downtimeRepository.create({
        work_center_id: input.work_center_id,
        production_order_id: input.production_order_id ?? null,
        reason: input.reason,
        notes: input.notes ?? null,
        started_at: input.started_at ? new Date(input.started_at) : new Date(),
        finished_at: null,
        created_by: input.created_by,
      }, t);

      await t.commit();
      return this.downtimeRepository.findById(downtime.id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = OpenProductionDowntimeUseCase;
