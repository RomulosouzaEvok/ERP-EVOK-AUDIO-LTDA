/**
 * Mapper de saída do recurso ItSoftwareLicenseDetail/ItLicenseSeat (P3).
 * Aplica o mascaramento de `license_key` por padrão (BR-TI-014/RNF-TI-01)
 * — só o use case `RevealLicenseKeyUseCase` expõe o valor em claro.
 *
 * @module modules/ti/infrastructure/mappers/LicenseMapper
 */

function plain(row: any): any {
  return row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
}

/** Mascara `license_key`, mostrando apenas os 4 primeiros caracteres. */
export function maskLicenseKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return '****';
  return `${key.slice(0, 4)}${'*'.repeat(Math.max(key.length - 4, 4))}`;
}

function statusDerivado(licenseExpiresAt: string | null): 'active' | 'expired' | 'expiring' | 'unknown' {
  if (!licenseExpiresAt) return 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  if (licenseExpiresAt < today) return 'expired';
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  if (licenseExpiresAt <= in30.toISOString().slice(0, 10)) return 'expiring';
  return 'active';
}

/** Converte uma instância `ItSoftwareLicenseDetail` (com `asset` incluído) para o DTO de resposta, com `license_key` mascarada. */
export function toLicenseDTO(row: any, seatsAllocated?: number): Record<string, unknown> {
  const p = plain(row);
  const asset = p.asset ?? {};
  return {
    asset_id: p.asset_id,
    name: asset.name,
    vendor: p.vendor,
    license_type: p.license_type,
    seats: p.seats,
    seats_allocated: seatsAllocated,
    cost: p.cost,
    billing_cycle: p.billing_cycle,
    license_key_masked: maskLicenseKey(p.license_key),
    renewal_date: p.renewal_date,
    license_expires_at: asset.license_expires_at ?? null,
    status_derivado: statusDerivado(asset.license_expires_at ?? null),
  };
}

/** Converte uma instância `ItLicenseSeat` para o DTO de resposta. */
export function toSeatDTO(row: any): Record<string, unknown> {
  const p = plain(row);
  return {
    id: p.id,
    employee: p.employee ? { id: p.employee.id, name: p.employee.name } : { id: p.employee_id },
    assigned_at: p.assigned_at,
    revoked_at: p.revoked_at,
  };
}
