/**
 * Use case: atualizar uma não conformidade existente.
 *
 * @module modules/nonConformities/application/use-cases/UpdateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { sequelize } from '../../../../config/database';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applySupplierReturn } = require('../services/SupplierReturnHandler');

const ALLOWED_FIELDS = [
  'description',
  'severity',
  'origin',
  'quantity_affected',
  'immediate_action',
  'root_cause',
  'corrective_action',
  'status',
  'responsible_id',
  'closed_by'
];
const RETURN_TO_SUPPLIER_ACTION = 'return_supplier';

interface UpdateNonConformityInput {
  id: number | string;
  body: Record<string, unknown>;
  closedBy: number;
}

class UpdateNonConformityUseCase extends UseCase<UpdateNonConformityInput, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * @param input - Id da não conformidade, campos a atualizar e id do usuário autenticado.
   * @returns Não conformidade atualizada.
   * @throws {NotFoundError} Se o registro não existir.
   *
   * @remarks
   * Fechar a RNC com `status = 'closed'` e `effectiveness_result = 'effective'`
   * NÃO desbloqueia automaticamente nenhum lote vinculado (`LotControl` em
   * `status = 'blocked'`). A liberação do lote pós-tratativa é sempre uma
   * decisão manual e explícita de qualidade, feita via
   * `POST /api/inventory/lots/:id/release` (que aceita `blocked -> available`
   * além de `quarantine -> available`).
   *
   * Devolução ao fornecedor (Bloco B, docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md):
   * quando o PATCH/PUT MUDA `immediate_action` para `'return_supplier'`
   * (transição, não valor já vigente — evita reestornar estoque/reabrir
   * status do ativo a cada PUT subsequente na mesma RNC), a atualização e
   * `SupplierReturnHandler.applySupplierReturn` rodam na MESMA transação.
   */
  public async execute({ id, body, closedBy }: UpdateNonConformityInput): Promise<any> {
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.status === 'closed') {
      updateData.closed_by = closedBy;
      updateData.closed_at = new Date();
    }

    const current = await this.nonConformitiesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Não conformidade não encontrada');
    }

    const triggersSupplierReturn =
      updateData.immediate_action === RETURN_TO_SUPPLIER_ACTION &&
      current.immediate_action !== RETURN_TO_SUPPLIER_ACTION;

    if (!triggersSupplierReturn) {
      const updated = await this.nonConformitiesRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundError('Não conformidade não encontrada');
      }
      return this.nonConformitiesRepository.findById(id);
    }

    const t = await sequelize.transaction();
    try {
      const updated = await this.nonConformitiesRepository.update(id, updateData, t);
      if (!updated) {
        throw new NotFoundError('Não conformidade não encontrada');
      }

      await applySupplierReturn({
        nonConformityId: current.id,
        purchaseItemId: current.purchase_item_id,
        assetId: current.asset_id,
        quantityAffected: (updateData.quantity_affected as number | undefined) ?? current.quantity_affected,
        userId: closedBy
      }, t);

      await t.commit();
      return this.nonConformitiesRepository.findById(id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = UpdateNonConformityUseCase;
