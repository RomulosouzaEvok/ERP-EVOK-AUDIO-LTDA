import UseCase from '../../../../shared/application/UseCase';
import InventoryCountRepository = require('../../domain/repositories/InventoryCountRepository');

const { NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');
const { sequelize } = require('../../../../config/database');

/**
 * Inicia uma contagem de inventário (transição `draft` → `counting`),
 * cobrindo `POST /api/inventory-counts/:id/start`.
 *
 * Também resolve a atribuição da contagem ao funcionário que está
 * iniciando (`assigned_to`):
 * - Se a contagem estiver no "pool" (`assigned_to IS NULL`), este use case
 *   faz o CLAIM atômico: `assigned_to` passa a ser o usuário logado.
 * - Se já estiver atribuída a OUTRO usuário, rejeita com `ConflictError`
 *   (409) — "Esta contagem já foi atribuída a outro funcionário."
 * - Se já estiver atribuída ao PRÓPRIO usuário, segue normalmente
 *   (idempotente).
 *
 * A trava é feita com lock pessimista (`SELECT ... FOR UPDATE`, mesmo
 * padrão de `ApproveInventoryCountUseCase`/`RejectInventoryCountUseCase`)
 * dentro de uma transação: uma segunda requisição concorrente tentando
 * "pegar" a MESMA contagem do pool espera aqui até a primeira
 * commitar/rollback e então lê `assigned_to` já preenchido — só uma delas
 * vence a corrida.
 */
class StartInventoryCountUseCase extends UseCase {
  private readonly inventoryCountRepository: InventoryCountRepository;

  /** @param inventoryCountRepository - Repositório de contagens de inventário. */
  constructor(inventoryCountRepository: InventoryCountRepository) {
    super();
    this.inventoryCountRepository = inventoryCountRepository;
  }

  /**
   * @param input - `{ id, userId }`. `userId` é o funcionário que está
   *   iniciando a contagem (dono do claim, resolvido do JWT no controller).
   * @returns {Promise<Object>} A contagem atualizada (com itens).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `draft`.
   * @throws {ConflictError} Se a contagem já estiver atribuída a OUTRO funcionário.
   */
  async execute({ id, userId }: { id: number | string; userId: number }) {
    const t = await sequelize.transaction();
    try {
      const before = await this.inventoryCountRepository.findRawByIdForUpdate(id, t);
      if (!before) {
        throw new NotFoundError('Contagem de inventário não encontrada');
      }
      if (before.status !== 'draft') {
        throw new BusinessRuleError(`Apenas contagens em status 'draft' podem ser iniciadas. Status atual: '${before.status}'.`);
      }
      if (before.assigned_to && Number(before.assigned_to) !== Number(userId)) {
        throw new ConflictError('Esta contagem já foi atribuída a outro funcionário.');
      }

      const updateData: Record<string, unknown> = { status: 'counting', started_at: new Date() };
      if (!before.assigned_to) {
        // Claim atômico: contagem estava no pool, passa a ser deste usuário.
        updateData.assigned_to = userId;
      }

      await this.inventoryCountRepository.update(id, updateData, t);
      await t.commit();

      return this.inventoryCountRepository.findById(id);
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  }
}

export = StartInventoryCountUseCase;


