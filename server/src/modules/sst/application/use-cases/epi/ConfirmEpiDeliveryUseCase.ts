/**
 * Use case: confirmar uma EntregaEPI (RF-SST-005/007, BR-SST-001/002).
 *
 * Efeitos, todos na MESMA transação (`BLOCO_1_SST_API.md` §1.3):
 * 1. Revalida o CA do TipoEPI (ainda não vencido na data corrente — E1).
 * 2. Valida evidência de recebimento presente (E2).
 * 3. Se o TipoEPI tiver `item_id`, dispara saída de estoque via
 *    `InventoryMovementService.registerOutbound` (reaproveita o use case
 *    real de `/api/inventory/movements`, sem controle de saldo paralelo).
 * 4. Marca `confirmada = true` + `confirmada_em` — a partir daqui a linha é
 *    imutável por trigger Postgres (`sst_lock_entrega_epi`).
 *
 * @module modules/sst/application/use-cases/epi/ConfirmEpiDeliveryUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import EpiRepository from '../../../domain/repositories/EpiRepository';
import type { InventoryMovementService } from '../../../application/services/InventoryMovementService';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toEntregaDTO } from '../../../infrastructure/mappers/EpiMapper';

const { sequelize } = require('../../../../../config/database');

interface ConfirmEpiDeliveryInput {
  id: string | number;
  confirmedBy: number;
}

class ConfirmEpiDeliveryUseCase extends UseCase<ConfirmEpiDeliveryInput, any> {
  private readonly epiRepository: EpiRepository;
  private readonly inventoryMovementService: InventoryMovementService;

  /**
   * @param epiRepository - Repositório do cluster EPI.
   * @param inventoryMovementService - Adapter de movimentação de estoque (baixo acoplamento com `inventory`).
   */
  public constructor(epiRepository: EpiRepository, inventoryMovementService: InventoryMovementService) {
    super();
    this.epiRepository = epiRepository;
    this.inventoryMovementService = inventoryMovementService;
  }

  /**
   * @param input - `{ id, confirmedBy }` (`confirmedBy` sempre `req.user.id`, nunca do body).
   * @throws {NotFoundError} Se a entrega não existir (404).
   * @throws {ValidationError} Se já estiver confirmada — idempotência negativa (400).
   * @throws {BusinessRuleError} Se o CA estiver vencido (E1) ou a evidência ausente (E2) (422).
   */
  public async execute({ id, confirmedBy }: ConfirmEpiDeliveryInput): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const entrega = await this.epiRepository.findEntregaById(id, t);
      if (!entrega) throw new NotFoundError('Entrega de EPI não encontrada.');
      if (entrega.confirmada) {
        throw new ValidationError('Entrega já está confirmada — não é possível reconfirmar.');
      }

      const tipo = entrega.tipoEpi ?? (await this.epiRepository.findTipoById(entrega.tipo_epi_id));
      if (new Date(tipo.ca_validade) < new Date()) {
        throw new BusinessRuleError('CA do Tipo de EPI está vencido — confirmação bloqueada (BR-SST-001, E1).', { ca_validade: tipo.ca_validade });
      }
      if (!entrega.evidencia_tipo) {
        throw new BusinessRuleError('Evidência de recebimento ausente — confirmação bloqueada (BR-SST-002, E2).');
      }

      let inventoryMovementId: number | null = null;
      if (tipo.item_id) {
        const result = await this.inventoryMovementService.registerOutbound({
          item_id: tipo.item_id,
          quantity: Number(entrega.quantidade),
          reason: 'entrega_epi',
          reference_type: 'sst_epi_delivery',
          reference_id: entrega.id,
          userId: confirmedBy,
          transaction: t
        });
        inventoryMovementId = result.movement.id;
      }

      const updated = await this.epiRepository.confirmEntrega(id, {
        confirmada: true,
        confirmada_em: new Date(),
        inventory_movement_id: inventoryMovementId
      }, t);

      await t.commit();

      const withTipo = await this.epiRepository.findEntregaById(updated.id);
      return toEntregaDTO(withTipo);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = ConfirmEpiDeliveryUseCase;
