/**
 * Testes da segregação por **interseção de módulos** (RNF-RH-01,
 * RF-RH-072) — decisão normativa do dono do produto que fecha o achado 10
 * da auditoria cruzada (`rh:approve` não é reaproveitado como nível de
 * leitura de dado sensível).
 *
 * @module tests/unit/rh-sensitive-fields
 */

import {
  canViewAbsenceCid,
  canViewPayrollIndividualValues,
  sanitizeAbsence,
  sanitizePayrollImportItem,
} from '../../src/modules/rh/domain/services/rhSensitiveFields';

const absence = { id: 1, employee_id: 501, type: 'auxilio_doenca_inss', start_date: '2026-08-01', cid: 'M54.5' };
const payrollItem = { id: 2, employee_id: 501, bruto: '5000.00', encargos: '1500.00', liquido: '3800.00', custo_total: '6500.00', cost_center_id: 7 };

describe('rhSensitiveFields — Absence.cid exige interseção rh + sst (RNF-RH-01)', () => {
  it('omite cid para quem tem só rh', () => {
    const user = { role: 'user', permissions: { rh: 'approve' } };
    expect(canViewAbsenceCid(user)).toBe(false);
    expect(sanitizeAbsence(absence, user)).not.toHaveProperty('cid');
  });

  it('omite cid para quem tem só sst', () => {
    const user = { role: 'user', permissions: { sst: 'approve' } };
    expect(sanitizeAbsence(absence, user)).not.toHaveProperty('cid');
  });

  it('mostra cid para quem tem rh E sst', () => {
    const user = { role: 'user', permissions: { rh: 'operate', sst: 'operate' } };
    expect(canViewAbsenceCid(user)).toBe(true);
    expect(sanitizeAbsence(absence, user)).toMatchObject({ cid: 'M54.5' });
  });

  it('admin vê tudo (curto-circuito, igual a authorizeModule)', () => {
    expect(sanitizeAbsence(absence, { role: 'admin' })).toMatchObject({ cid: 'M54.5' });
  });

  it('nunca 403: o restante do registro continua visível sem a interseção (UC-71 E2)', () => {
    const sanitized = sanitizeAbsence(absence, { role: 'user', permissions: { rh: 'operate' } });
    expect(sanitized).toMatchObject({ id: 1, employee_id: 501, type: 'auxilio_doenca_inss' });
  });

  it('não muta o registro original', () => {
    sanitizeAbsence(absence, { role: 'user', permissions: { rh: 'operate' } });
    expect(absence.cid).toBe('M54.5');
  });

  it('usuário ausente/sem perfil não vê o campo', () => {
    expect(canViewAbsenceCid(undefined)).toBe(false);
    expect(canViewAbsenceCid({ role: 'user' })).toBe(false);
  });
});

describe('rhSensitiveFields — PayrollImportItem.bruto/liquido exige interseção rh + financeiro (RF-RH-072)', () => {
  it('omite bruto/liquido para quem tem só rh, preservando os agregáveis (RF-RH-073)', () => {
    const user = { role: 'user', permissions: { rh: 'approve' } };
    const sanitized = sanitizePayrollImportItem(payrollItem, user) as Record<string, any>;

    expect(sanitized).not.toHaveProperty('bruto');
    expect(sanitized).not.toHaveProperty('liquido');
    expect(sanitized).toMatchObject({ custo_total: '6500.00', cost_center_id: 7, encargos: '1500.00' });
  });

  it('omite para quem tem só financeiro', () => {
    const sanitized = sanitizePayrollImportItem(payrollItem, { role: 'user', permissions: { financeiro: 'operate' } });
    expect(sanitized).not.toHaveProperty('bruto');
  });

  it('mostra para quem tem rh E financeiro', () => {
    const user = { role: 'user', permissions: { rh: 'operate', financeiro: 'operate' } };
    expect(canViewPayrollIndividualValues(user)).toBe(true);
    expect(sanitizePayrollImportItem(payrollItem, user)).toMatchObject({ bruto: '5000.00', liquido: '3800.00' });
  });

  it('admin vê tudo', () => {
    expect(sanitizePayrollImportItem(payrollItem, { role: 'admin' })).toMatchObject({ bruto: '5000.00' });
  });

  it('rh:approve sozinho NÃO destrava dado sensível — a decisão do dono do produto separa os dois significados', () => {
    expect(canViewPayrollIndividualValues({ role: 'user', permissions: { rh: 'approve' } })).toBe(false);
    expect(canViewAbsenceCid({ role: 'user', permissions: { rh: 'approve' } })).toBe(false);
  });
});
