/**
 * Use case: atualizar uma não conformidade existente.
 *
 * @module modules/nonConformities/application/use-cases/UpdateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { sequelize } from '../../../../config/database';
import { CLOSED_STATUS, buildClosureFields } from '../../domain/closure';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applySupplierReturn } = require('../services/SupplierReturnHandler');

/**
 * Campos que o PUT aceita do corpo da requisicao.
 *
 * `closed_by` foi REMOVIDO desta lista em 2026-08-10: ele identifica QUEM
 * encerrou a RNC e por isso vem sempre do JWT (`closedBy`, resolvido no
 * controller a partir de `req.user.id`), nunca do body — mesmo padrao
 * anti-spoofing de identidade da remediacao 3.1 (2026-08-02). Enquanto
 * estava aqui, qualquer usuario podia atribuir o encerramento a outra
 * pessoa mandando `closed_by` no payload.
 */
const ALLOWED_FIELDS = [
  'description',
  'severity',
  'origin',
  'quantity_affected',
  'immediate_action',
  'root_cause',
  'corrective_action',
  'status',
  'responsible_id'
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
    if (body.status === CLOSED_STATUS) {
      // `closed_date`, NAO `closed_at`. A coluna real de `non_conformities` e
      // `closed_date DATE` — `closed_at` nao existe, e o Sequelize DESCARTA em
      // silencio uma chave que nao e atributo do model: o UPDATE saia sem ela,
      // a API respondia 200 e toda RNC fechada ficava sem data de fechamento
      // (ISO 9001 §8.7/§10.2 exigem a data de encerramento; sem ela nao ha como
      // medir tempo de tratativa nem provar tempestividade em auditoria).
      // Ver `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §3.
      Object.assign(updateData, buildClosureFields(closedBy));
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
