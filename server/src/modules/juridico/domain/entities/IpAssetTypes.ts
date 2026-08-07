/**
 * DTOs de entrada/saída do cluster Propriedade Intelectual
 * (`JurIntellectualProperty`/`JurIpContractLink` — RF-JUR-031 a 034,
 * `docs/business/BLOCO_3_JUR_API.md` §6).
 *
 * @module modules/juridico/domain/entities/IpAssetTypes
 */

export type IpType = 'trademark' | 'patent' | 'utility_model' | 'industrial_design' | 'copyright' | 'trade_secret';
export type IpStatus = 'filed' | 'granted' | 'active' | 'expired' | 'abandoned';

export interface CreateIpAssetInput {
  type: IpType;
  /**
   * Não existe no contrato de API original (`BLOCO_3_JUR_API.md` §6.1) —
   * a coluna `title` do schema (`jur_intellectual_property.title`,
   * NOT NULL) é preenchida por reconciliação: usa `title` se informado,
   * senão deriva de `description` truncada a 200 caracteres. Decisão desta
   * passada, documentada no handoff.
   */
  title?: string;
  registration_number?: string | null;
  description?: string | null;
  holding_area?: string | null;
  filing_date?: string | null;
  grant_date?: string | null;
  expiration_date?: string | null;
  next_annuity_date?: string | null;
  status?: IpStatus;
  responsible_user_id: number;
  attachment_url?: string | null;
}

export interface UpdateIpAssetInput {
  id: number;
  [key: string]: unknown;
}

export interface ListIpAssetsInput {
  filters: Record<string, unknown>;
  page: number;
  limit: number;
  isAdmin: boolean;
}

export interface LinkIpContractInput {
  ipId: number;
  contract_id: number;
  link_description?: string | null;
}
