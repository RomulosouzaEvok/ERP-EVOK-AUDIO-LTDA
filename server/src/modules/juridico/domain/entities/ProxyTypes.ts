/**
 * DTOs de entrada/saída do cluster Procuração (`JurProxy` — UC-55,
 * `docs/business/BLOCO_3_JUR_API.md` §5).
 *
 * @module modules/juridico/domain/entities/ProxyTypes
 */

export type ProxyForm = 'public' | 'private';
export type PowerTag = 'ad_judicia' | 'ad_negotia' | 'banking' | 'other';
export type ProxyStatus = 'active' | 'revoked' | 'expired';

export interface CreateProxyInput {
  grantor?: string;
  grantee_name: string;
  grantee_employee_id?: number | null;
  grantee_external_lawyer_id?: number | null;
  powers_text: string;
  powers_tags?: PowerTag[];
  form: ProxyForm;
  issue_date: string;
  expiration_date?: string | null;
  alert_advance_days?: number;
  createdBy: number;
}

export interface RevokeProxyInput {
  id: number;
  revocation_date?: string | null;
  communication_record: string;
}

export interface ListProxiesInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
}
