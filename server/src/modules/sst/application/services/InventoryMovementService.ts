/**
 * Interface de baixo acoplamento para o módulo SST disparar movimentações
 * de estoque sem importar Sequelize/Model do módulo `inventory`
 * diretamente (regra transversal de `docs/business/BLOCO_1_SST_API.md`).
 *
 * @module modules/sst/application/services/InventoryMovementService
 */

import type { Transaction } from 'sequelize';

/** Parâmetros de uma saída de estoque disparada pelo módulo SST (ex.: confirmação de EntregaEPI). */
export interface RegisterOutboundInput {
  /** Id (UUID) do `Item` de estoque vinculado ao TipoEPI. */
  item_id: string;
  quantity: number;
  reason: string;
  reference_type: string;
  reference_id: number;
  userId: number;
  transaction: Transaction;
}

/** Resultado de uma movimentação de estoque registrada. */
export interface RegisterOutboundResult {
  movement: { id: number };
}

/** Contrato que os use cases do módulo SST usam para movimentar estoque. */
export interface InventoryMovementService {
  registerOutbound(input: RegisterOutboundInput): Promise<RegisterOutboundResult>;
}

export default InventoryMovementService;
