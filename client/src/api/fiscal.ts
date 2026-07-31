import { httpClient } from './httpClient';
import type { ItemResponse } from './types';
import type { Sale } from './sales';

export type NfeStatus = 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled';

/** `POST /api/sales/:id/nfe` — emite a NF-e de uma venda `confirmed`. */
export async function issueSaleNfe(saleId: number) {
  const { data } = await httpClient.post<ItemResponse<Sale>>(`/api/sales/${saleId}/nfe`);
  return data.data;
}

/** `GET /api/sales/:id/nfe` — consulta/reconcilia o status atual da NF-e da venda. */
export async function getSaleNfeStatus(saleId: number) {
  const { data } = await httpClient.get<ItemResponse<Sale>>(`/api/sales/${saleId}/nfe`);
  return data.data;
}

/** `POST /api/sales/:id/nfe/cancel` — cancela a NF-e autorizada (somente admin). */
export async function cancelSaleNfe(saleId: number, reason: string) {
  const { data } = await httpClient.post<ItemResponse<Sale>>(`/api/sales/${saleId}/nfe/cancel`, { reason });
  return data.data;
}
