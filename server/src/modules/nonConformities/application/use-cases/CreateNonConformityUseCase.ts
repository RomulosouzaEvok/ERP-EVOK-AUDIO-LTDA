/**
 * Use case: registrar uma nova não conformidade.
 *
 * @module modules/nonConformities/application/use-cases/CreateNonConformityUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import NonConformitiesRepository from '../../domain/repositories/NonConformitiesRepository';
import { sequelize } from '../../../../config/database';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LotControl } = require('../../../../models/index');

const BLOCKABLE_STATUSES = ['available', 'quarantine', 'reserved'];

interface CreateNonConformityInput {
  product_id?: number;
  production_order_id?: number;
  supplier_id?: number;
  description?: string;
  severity?: string;
  origin?: string;
  defect_type?: string;
  quantity_affected?: number;
  immediate_action?: string;
  lot_number?: string;
  reportedBy: number;
}

class CreateNonConformityUseCase extends UseCase<CreateNonConformityInput, any> {
  private readonly nonConformitiesRepository: NonConformitiesRepository;

  /** @param nonConformitiesRepository - Repositorio de não conformidades. */
  public constructor(nonConformitiesRepository: NonConformitiesRepository) {
    super();
    this.nonConformitiesRepository = nonConformitiesRepository;
  }

  /**
   * Cria a RNC e, quando o payload referenciar um lote existente
   * (`lot_number` + `product_id`), bloqueia o lote na MESMA transação
   * (rastreabilidade: qualidade fecha o loop impedindo consumo/expedição de
   * material sob investigação). Se o lote não for encontrado, a RNC ainda
   * assim é criada normalmente — ela pode referenciar um lote externo (ex.:
   * lote de um sistema legado ou de terceiros).
   *
   * @param input - Dados da não conformidade (description obrigatória) e id do usuário autenticado.
   * @returns Não conformidade criada.
   * @throws {ValidationError} Se `description` estiver ausente.
   */
  public async execute(input: CreateNonConformityInput): Promise<any> {
    const {
      product_id,
      production_order_id,
      supplier_id,
      description,
      severity,
      origin,
      defect_type,
      quantity_affected,
      immediate_action,
      lot_number,
      reportedBy
    } = input;

    if (!description) {
      throw new ValidationError('Descrição é obrigatória');
    }

    const t = await sequelize.transaction();
    try {
      const nonConformity = await this.nonConformitiesRepository.create({
        // nc_number segue o mesmo padrao de numeracao de RQ/PO do sistema.
        nc_number: `NC-${Date.now()}`,
        product_id,
        production_order_id,
        supplier_id,
        description,
        // Defaults validos conforme os ENUMs do modelo NonConformity.
        severity: severity || 'minor',
        origin: origin || 'in_process',
        defect_type: defect_type || 'other',
        quantity_affected,
        immediate_action,
        lot_number,
        reported_by: reportedBy,
        status: 'open'
      }, t);

      if (lot_number && product_id) {
        const lot = await LotControl.findOne({
          where: { product_id, lot_number: String(lot_number).trim() },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (lot && BLOCKABLE_STATUSES.includes(lot.status)) {
          await lot.update({
            status: 'blocked',
            notes: `${lot.notes ? `${lot.notes} | ` : ''}Bloqueado pela RNC #${nonConformity.id}`
          }, { transaction: t });
        }
        // Lote não encontrado (ou já em status terminal, ex.: 'consumed'):
        // segue sem erro — a RNC pode referenciar um lote externo.
      }

      await t.commit();
      return nonConformity;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateNonConformityUseCase;
