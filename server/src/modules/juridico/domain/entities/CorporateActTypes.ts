/**
 * DTOs de entrada/saída do cluster Ato Societário (`JurCorporateAct`,
 * RF-JUR-030, correção do dono do produto em 2026-08-08).
 *
 * Extraído em arquivo próprio (somente `export interface`/`export type`)
 * para evitar a armadilha ESM+CJS no mesmo arquivo — mesma convenção de
 * `ContractTypes.ts`/`ProxyTypes.ts`.
 *
 * @module modules/juridico/domain/entities/CorporateActTypes
 */

export type CorporateActType = 'general_assembly' | 'partners_meeting' | 'bylaw_amendment' | 'board_resolution' | 'other';
export type CorporateActStatus = 'draft' | 'registered';

export interface CreateCorporateActInput {
  act_type: CorporateActType;
  title: string;
  description?: string | null;
  act_date: string;
  registration_protocol?: string | null;
  registered_at?: string | null;
  document_file_path?: string | null;
  createdBy: number;
}

export interface ListCorporateActsInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}

export interface UpdateCorporateActInput {
  id: number;
  act_type?: CorporateActType;
  title?: string;
  description?: string | null;
  act_date?: string;
  registration_protocol?: string | null;
  registered_at?: string | null;
  document_file_path?: string | null;
}
