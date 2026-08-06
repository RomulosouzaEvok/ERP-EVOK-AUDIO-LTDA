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
 * - Se já estiver atribuída a OUTRO usuário e quem está iniciando NÃO for
 *   `admin`, rejeita com `ConflictError` (409) — "Esta contagem já foi
 *   atribuída a outro funcionário."
 * - Se já estiver atribuída a OUTRO usuário e quem está iniciando FOR
 *   `admin`, permite o override (achado de auditoria 2026-08-06, item 1b —
 *   sem isso, uma contagem atribuída a um funcionário que saiu de férias/foi
 *   desligado ficava presa em `draft` para sempre, só remediável com UPDATE
 *   manual no banco): a contagem passa a ser do admin (mesmo efeito de um
 *   `ReassignInventoryCountUseCase` seguido de start, em uma única chamada).
 *   O controller registra esse caso em auditoria com `oldValues`/`newValues`
 *   diferenciados (ver `inventoryCountController.start`).
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
   * @param input - `{ id, userId, role }`. `userId` é o funcionário que está
   *   iniciando a contagem (dono do claim, resolvido do JWT no controller).
   *   `role` é o `role` do usuário logado (`'admin'|'operator'|'financial'`,
   *   também resolvido do JWT no controller) — usado apenas para liberar o
   *   override de admin descrito acima; opcional por compatibilidade
   *   retroativa (ausente = tratado como não-admin).
   * @returns {Promise<{ count: Object, adminOverride: boolean, previousAssignedTo: number|null }>}
   *   `adminOverride` é `true` quando um `admin` assumiu uma contagem
   *   atribuída a outro funcionário; `previousAssignedTo` é o `assigned_to`
   *   anterior à chamada (para o controller montar `oldValues` na auditoria).
   * @throws {NotFoundError} Se a contagem não existir.
   * @throws {BusinessRuleError} Se a contagem não estiver em status `draft`.
   * @throws {ConflictError} Se a contagem já estiver atribuída a OUTRO funcionário e quem está iniciando não for `admin`.
   */
  async execute({ id, userId, role }: { id: number | string; userId: number; role?: string }) {
    const t = await sequelize.transaction();
    try {
      const before = await this.inventoryCountRepository.findRawByIdForUpdate(id, t);
      if (!before) {
        throw new NotFoundError('Contagem de inventário não encontrada');
      }
      if (before.status !== 'draft') {
        throw new BusinessRuleError(`Apenas contagens em status 'draft' podem ser iniciadas. Status atual: '${before.status}'.`);
      }

      const assignedToOther = Boolean(before.assigned_to) && Number(before.assigned_to) !== Number(userId);
      let adminOverride = false;
      if (assignedToOther) {
        if (role !== 'admin') {
          throw new ConflictError('Esta contagem já foi atribuída a outro funcionário.');
        }
        // Curto-circuito de admin (achado de auditoria 2026-08-06, item 1b):
        // admin pode assumir uma contagem presa com outro responsável.
        adminOverride = true;
      }

      const updateData: Record<string, unknown> = { status: 'counting', started_at: new Date() };
      if (!before.assigned_to || adminOverride) {
        // Claim atômico (pool) OU reatribuição via override de admin.
        updateData.assigned_to = userId;
      }

      await this.inventoryCountRepository.update(id, updateData, t);
      await t.commit();

      const count = await this.inventoryCountRepository.findById(id);
      return { count, adminOverride, previousAssignedTo: before.assigned_to ?? null };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  }
}

export = StartInventoryCountUseCase;


