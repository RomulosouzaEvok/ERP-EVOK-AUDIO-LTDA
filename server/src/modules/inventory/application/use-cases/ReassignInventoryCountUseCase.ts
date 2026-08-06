import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const { NotFoundError, BusinessRuleError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');

/** Status em que uma contagem ainda pode ser reatribuída. */
const REASSIGNABLE_STATUSES = ['draft', 'counting'];

/**
 * Reatribui uma contagem de inventário a outro funcionário (ou devolve ao
 * "pool"), cobrindo `PUT /api/inventory-counts/:id/reassign`.
 *
 * Achado de auditoria 2026-08-06 (item 1a): antes deste use case, uma
 * contagem atribuída (`assigned_to`) a um funcionário que saísse de
 * férias/fosse desligado ficava presa em `draft` para sempre — só
 * `StartInventoryCountUseCase` conseguia alterar `assigned_to` (via claim
 * do pool) e ele rejeita explicitamente iniciar uma contagem já atribuída a
 * OUTRO usuário (a menos que quem inicie seja `admin`, ver
 * `StartInventoryCountUseCase`). O único remédio anterior era um `UPDATE`
 * manual direto no banco. Este use case é a via oficial e auditada para
 * reatribuir/desatribuir sem depender de acesso direto ao banco.
 *
 * Só é permitido em `draft` ou `counting` — depois de `pending_approval`
 * (contagem já enviada para aprovação) reatribuir o responsável não faz
 * mais sentido de negócio (quem contou já contou; o fluxo daqui em diante é
 * aprovação/rejeição por um gestor, não mais execução por um funcionário).
 *
 * `assigned_to: null` devolve a contagem ao "pool" (qualquer funcionário
 * autorizado pode "pegá-la" via `POST /:id/start`).
 */
class ReassignInventoryCountUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param input - `{ id, assigned_to }`. `assigned_to` é `null`/`undefined`
   *   para devolver a contagem ao pool, ou o id de um usuário ativo para
   *   atribuí-la a ele.
   * @returns {Promise<{ count: Object, previousAssignedTo: number|null }>}
   *   `previousAssignedTo` é o `assigned_to` anterior à chamada (para o
   *   controller montar `oldValues` na auditoria).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `draft` ou `counting`, ou se `assigned_to` for informado e não corresponder a um usuário ativo (422 em ambos os casos).
   */
  async execute({ id, assigned_to }: { id: number | string; assigned_to?: number | null }) {
    const normalizedAssignedTo = (assigned_to === undefined || assigned_to === null) ? null : Number(assigned_to);

    const t = await sequelize.transaction();
    try {
      const before = await this.inventoryCountRepository.findRawByIdForUpdate(id, t);
      if (!before) {
        throw new NotFoundError('Contagem de inventário não encontrada');
      }

      if (!REASSIGNABLE_STATUSES.includes(before.status)) {
        throw new BusinessRuleError(
          `Apenas contagens em status 'draft' ou 'counting' podem ser reatribuídas. Status atual: '${before.status}'.`,
          { current_status: before.status, allowed_statuses: REASSIGNABLE_STATUSES }
        );
      }

      if (normalizedAssignedTo !== null) {
        // Mesma validação de existência/atividade de `CreateInventoryCountUseCase`
        // (ver JSDoc de `InventoryCountRepository.findActiveUserById`).
        const targetUser = await this.inventoryCountRepository.findActiveUserById(normalizedAssignedTo, t);
        if (!targetUser) {
          throw new BusinessRuleError(
            `Usuário de destino (assigned_to=${normalizedAssignedTo}) não encontrado ou inativo. Verifique o id informado.`,
            { field: 'assigned_to', value: normalizedAssignedTo }
          );
        }
      }

      await this.inventoryCountRepository.update(id, { assigned_to: normalizedAssignedTo }, t);
      await t.commit();

      const count = await this.inventoryCountRepository.findById(id);
      return { count, previousAssignedTo: before.assigned_to ?? null };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  }
}

export = ReassignInventoryCountUseCase;
