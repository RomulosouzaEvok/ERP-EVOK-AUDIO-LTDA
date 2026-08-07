/**
 * DTOs de entrada do recurso ItSoftwareLicenseDetail/ItLicenseSeat (P3).
 *
 * @module modules/ti/domain/entities/LicenseTypes
 */

export type LicenseType = 'perpetual' | 'subscription' | 'free';
export type BillingCycle = 'one_time' | 'monthly' | 'yearly';

export interface CreateLicenseDetailInput {
  asset_id: number;
  license_type: LicenseType;
  vendor?: string;
  seats?: number;
  license_key?: string;
  cost?: number;
  billing_cycle?: BillingCycle;
  renewal_date?: string;
}

export interface UpdateLicenseDetailInput {
  assetId: number;
  vendor?: string;
  seats?: number;
  license_key?: string;
  cost?: number;
  billing_cycle?: BillingCycle;
  renewal_date?: string;
}

export interface AllocateSeatInput {
  assetId: number;
  employee_id: number;
}

export interface RequestRenewalInput {
  assetId: number;
  estimated_cost: number;
  justification: string;
  requesterId: number;
}
