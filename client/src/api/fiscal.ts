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

/**
 * Configuração fiscal do emitente (singleton, `id=1`), usada na emissão de
 * NF-e acima. `GET`/`PUT /api/fiscal/config` exigem `authorize('admin')` no
 * backend (dado sensível: CNPJ, IE, série de NF-e) — não há nível de módulo
 * (`AccessModuleKey`) próprio para este recurso.
 */

export type FiscalCrt = '1' | '2' | '3';
export type FiscalNfeEnvironment = 'homologacao' | 'producao';
export type FiscalNfeProvider = 'mock' | 'focus_nfe' | 'enotas';

export interface CompanyFiscalConfig {
  id: number;
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  ie: string | null;
  im: string | null;
  crt: FiscalCrt;
  cnae: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  city_ibge_code: string | null;
  state: string | null;
  nfe_series: number;
  nfe_next_number: number;
  nfe_environment: FiscalNfeEnvironment;
  nfe_provider: FiscalNfeProvider;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * `GET /api/fiscal/config` — retorna a configuração fiscal da empresa, ou
 * `null` se ainda não foi cadastrada (primeiro acesso — a tela deve tratar
 * isso como "criar", não como erro).
 */
export async function getCompanyFiscalConfig() {
  const { data } = await httpClient.get<ItemResponse<CompanyFiscalConfig | null>>('/api/fiscal/config');
  return data.data;
}

export interface UpsertCompanyFiscalConfigInput {
  legal_name: string;
  trade_name?: string;
  cnpj: string;
  ie?: string;
  im?: string;
  crt: FiscalCrt;
  cnae?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  city_ibge_code?: string;
  state?: string;
  nfe_series?: number;
  nfe_environment?: FiscalNfeEnvironment;
  nfe_provider?: FiscalNfeProvider;
}

/**
 * `PUT /api/fiscal/config` — cria (se ainda não existir) ou atualiza a
 * configuração fiscal da empresa (singleton, `id=1`). `nfe_next_number`
 * nunca é aceito aqui — é controlado exclusivamente pela emissão de NF-e,
 * para evitar reuso acidental de numeração.
 *
 * @throws {AxiosError} 400 `VALIDATION_ERROR` (schema `.strict()` — campo
 *   extra ou tipo inválido).
 */
export async function upsertCompanyFiscalConfig(input: UpsertCompanyFiscalConfigInput) {
  const { data } = await httpClient.put<ItemResponse<CompanyFiscalConfig>>('/api/fiscal/config', input);
  return data.data;
}
