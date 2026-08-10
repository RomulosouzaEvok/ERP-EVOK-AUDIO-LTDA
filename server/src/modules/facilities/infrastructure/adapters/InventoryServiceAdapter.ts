/**
 * Adapter de `InventoryService` — baixa consumo de insumo predial via
 * `CreateInventoryMovementUseCase` do módulo `inventory` (tipo `'out'`),
 * nunca escrita direta em `Item`/`InventoryMovement` a partir do módulo
 * `facilities` (D-3, RF-FAC-042/051).
 *
 * ⚠️ **A rastreabilidade por `reference_type`/`reference_id` prometida na
 * versão anterior deste comentário NÃO acontece hoje** (achado P1-04 da
 * auditoria de consistência da cadeia do produto, 2026-08-10). Dois motivos:
 *
 * 1. `CreateInventoryMovementUseCase` recebe `reference_id`/`reference_type`
 *    mas os **descarta** — delega a `InventoryService.adjust`, que não aceita
 *    esses parâmetros e força `reference_type = 'adjustment'` com
 *    `reference_id` nulo;
 * 2. mesmo se chegassem ao banco, `'facility_maintenance_ticket'` e
 *    `'facility_cleaning_execution'` **não existem** no ENUM
 *    `enum_inventory_movements_reference_type`
 *    (`sale|purchase|production|adjustment|transfer|sst_epi_delivery|import`),
 *    e o INSERT seria recusado pelo Postgres.
 *
 * A única pista da origem do consumo que sobrevive hoje é o texto livre em
 * `inventory_movements.description`, montado abaixo. Ver
 * `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`
 * (achados P0-01 e P1-04) antes de confiar nesses campos para auditoria.
 *
 * @module modules/facilities/infrastructure/adapters/InventoryServiceAdapter
 */

import InventoryService from '../../application/services/InventoryService';

const CreateInventoryMovementUseCase = require('../../../inventory/application/use-cases/CreateInventoryMovementUseCase');

class InventoryServiceAdapter extends InventoryService {
  public async registerConsumption(input: {
    item_id: string;
    quantity: number;
    userId: number;
    referenceType: 'facility_maintenance_ticket' | 'facility_cleaning_execution';
    referenceId: number;
    transaction: unknown;
  }): Promise<any> {
    const useCase = new CreateInventoryMovementUseCase();
    return useCase.execute({
      item_id: input.item_id,
      type: 'out',
      quantity: input.quantity,
      description: `Consumo interno — Facilities (${input.referenceType} #${input.referenceId})`,
      reference_id: input.referenceId,
      reference_type: input.referenceType,
      warehouse_code: 'INSUMOS',
      userId: input.userId,
      transaction: input.transaction as any,
    });
  }
}

export = InventoryServiceAdapter;
