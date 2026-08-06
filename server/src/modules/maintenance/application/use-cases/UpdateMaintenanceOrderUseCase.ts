/**
 * Use case: atualizar uma ordem de manutenção existente.
 *
 * @module modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
import { sequelize } from '../../../../config/database';

const ALLOWED_FIELDS = [
  'description',
  'diagnosis',
  'solution',
  'parts_used',
  'cost',
  'status',
  'priority',
  'maintenance_type',
  'technician_id',
  'start_date',
  'completion_date',
  'notes'
];

interface UpdateMaintenanceOrderInput {
  id: number | string;
  body: Record<string, unknown>;
}

class UpdateMaintenanceOrderUseCase extends UseCase<UpdateMaintenanceOrderInput, any> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Id da ordem e campos a atualizar (apenas os permitidos).
   * @returns Ordem de manutenção atualizada.
   * @throws {NotFoundError} Se a ordem não existir.
   *
   * Sincronização `Asset.status` (gatilho escolhido — ver
   * `docs/HANDOFF_CODEX.md`): a criação da OM (`CreateMaintenanceOrderUseCase`)
   * sempre nasce com `status: 'open'` (aguardando início), então ela não é o
   * gatilho correto para tirar o ativo de operação. O gatilho real é a
   * transição para `in_progress` aqui neste use case — é quando o técnico
   * efetivamente começa o serviço no ativo. Da mesma forma, a conclusão
   * (`status: 'completed'`) tenta devolver o ativo para `active`, mas apenas
   * se não houver nenhuma outra OM aberta para o mesmo ativo e se o ativo não
   * tiver sido baixado (`decommissioned`/`lost`/`returned_to_supplier`)
   * durante a manutenção (ver `MaintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders`).
   * O cancelamento (`status: 'canceled'`) segue o mesmo caminho em
   * `CancelMaintenanceOrderUseCase`.
   */
  public async execute({ id, body }: UpdateMaintenanceOrderInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.status === 'in_progress' && !updateData.start_date) updateData.start_date = new Date();
    if (body.status === 'completed' && !updateData.completion_date) updateData.completion_date = new Date();

    const t = await sequelize.transaction();
    try {
      const order = await this.maintenanceRepository.findByIdForUpdate(id, t);
      if (!order) {
        throw new NotFoundError('Ordem de manutenção não encontrada');
      }

      await this.maintenanceRepository.update(id, updateData, t);

      if (updateData.status === 'in_progress') {
        await this.maintenanceRepository.markAssetInMaintenance(order.asset_id, t);
      } else if (updateData.status === 'completed') {
        await this.maintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders(order.asset_id, id, t);
      }

      await t.commit();
      return this.maintenanceRepository.findById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = UpdateMaintenanceOrderUseCase;
