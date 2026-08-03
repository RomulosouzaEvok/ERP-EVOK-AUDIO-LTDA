import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';
import type { PurchaseRequisition } from './purchaseRequisitions';

export type MrpDemandOrigin = 'MANUAL' | 'PEDIDO_VENDA' | 'PREVISAO' | 'ORDEM_PRODUCAO';

export interface MrpDemandInput {
  item_id: string;
  quantidade: number;
  data_necessidade: string;
  origem: MrpDemandOrigin;
}

export interface PlanMrpInput {
  demands: MrpDemandInput[];
}

export type PlannedOrderStatus = string;

/** Ordem planejada gerada pelo MRP — necessidade líquida contra estoque real. */
export interface PlannedOrder {
  id: number;
  item: { id: string; codigo: string; descricao: string };
  origem: MrpDemandOrigin;
  necessidade_bruta: string | number;
  estoque_disponivel: string | number;
  necessidade_liquida: string | number;
  quantidade_planejada: string | number;
  data_necessidade: string;
  data_liberacao: string;
  status: PlannedOrderStatus;
}

/** `POST /api/mrp/plan` — roda o MRP contra o estoque real e cria ordens planejadas. */
export async function planMrp(input: PlanMrpInput) {
  const { data } = await httpClient.post<ItemResponse<PlannedOrder[]>>('/api/mrp/plan', input);
  return data.data;
}

/** `GET /api/mrp/planned-orders` — lista as ordens planejadas geradas pelo MRP. */
export async function listPlannedOrders() {
  const { data } = await httpClient.get<ListResponse<PlannedOrder> | ItemResponse<PlannedOrder[]>>(
    '/api/mrp/planned-orders',
  );
  return data.data;
}

/** Status de ordem planejada que permite conversão em requisição de compra. */
export const CONVERTIBLE_PLANNED_ORDER_STATUSES = ['RASCUNHO', 'APROVADA'] as const;

export interface ConvertPlannedOrdersInput {
  planned_order_ids: string[];
  notes?: string;
}

export interface ConvertPlannedOrdersResult {
  requisition: PurchaseRequisition;
  converted_ids: string[];
}

/**
 * `POST /api/mrp/planned-orders/convert` — converte ordens planejadas (RASCUNHO/APROVADA)
 * em uma Requisição de Compra, origem obrigatória da cadeia de suprimentos.
 */
export async function convertPlannedOrders(input: ConvertPlannedOrdersInput) {
  const { data } = await httpClient.post<ItemResponse<ConvertPlannedOrdersResult>>(
    '/api/mrp/planned-orders/convert',
    input,
  );
  return data.data;
}
