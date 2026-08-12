/**
 * Testes das regras de domínio puras (sem I/O) das 3 sub-áreas novas do
 * Bloco 6 RH: Afastamentos (RF-RH-044 a 049), Benefícios (RF-RH-050 a 054)
 * e Treinamentos (RF-RH-055 a 059).
 *
 * @module tests/unit/rh-block6-extension-rules
 */

import {
  calculateDefaultExpectedEndDate,
  shouldWarnMissingCid,
  durationInDays,
  requiresReturnAso,
  MATERNITY_LEAVE_DEFAULT_DAYS,
  MATERNITY_LEAVE_EXTENDED_DAYS,
  PATERNITY_LEAVE_DEFAULT_DAYS,
} from '../../src/modules/rh/domain/services/absenceRules';
import { validateVtDiscountLimit, validateDependentsAllowed } from '../../src/modules/rh/domain/services/benefitRules';
import { calculateValidUntil, normativeWarning, isTrainingExpired } from '../../src/modules/rh/domain/services/trainingRules';
import { shouldZeroAccrualPeriod } from '../../src/modules/rh/domain/services/vacationRules';

describe('absenceRules — RF-RH-046 (defaults de expected_end_date)', () => {
  it('maternidade default: 120 dias corridos (Art. 392, CLT)', () => {
    const end = calculateDefaultExpectedEndDate('maternidade', '2026-08-01', false);
    const expected = new Date('2026-08-01T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() + MATERNITY_LEAVE_DEFAULT_DAYS);
    expect(end).toBe(expected.toISOString().slice(0, 10));
  });

  it('maternidade com Empresa Cidadã: 180 dias corridos', () => {
    const end = calculateDefaultExpectedEndDate('maternidade', '2026-08-01', true);
    const expected = new Date('2026-08-01T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() + MATERNITY_LEAVE_EXTENDED_DAYS);
    expect(end).toBe(expected.toISOString().slice(0, 10));
  });

  it('paternidade default: 5 dias corridos (ADCT art. 10 §1º)', () => {
    const end = calculateDefaultExpectedEndDate('paternidade', '2026-08-01');
    const expected = new Date('2026-08-01T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() + PATERNITY_LEAVE_DEFAULT_DAYS);
    expect(end).toBe(expected.toISOString().slice(0, 10));
  });

  it('tipos sem default retornam null (RH informa manualmente)', () => {
    expect(calculateDefaultExpectedEndDate('doenca_ate_15d', '2026-08-01')).toBeNull();
    expect(calculateDefaultExpectedEndDate('auxilio_doenca_inss', '2026-08-01')).toBeNull();
  });
});

describe('absenceRules — RF-RH-044 (warning de CID ausente)', () => {
  it('avisa quando CID ausente em tipo que normalmente tem CID', () => {
    expect(shouldWarnMissingCid('doenca_ate_15d', undefined)).toBe(true);
    expect(shouldWarnMissingCid('auxilio_doenca_inss', null)).toBe(true);
  });

  it('não avisa quando CID informado', () => {
    expect(shouldWarnMissingCid('doenca_ate_15d', 'M54.5')).toBe(false);
  });

  it('não avisa para maternidade/paternidade mesmo sem CID', () => {
    expect(shouldWarnMissingCid('maternidade', undefined)).toBe(false);
    expect(shouldWarnMissingCid('paternidade', undefined)).toBe(false);
  });
});

describe('absenceRules — RF-RH-048 (gate de ASO de retorno > 30 dias)', () => {
  it('duração de 31 dias corridos exige ASO de retorno', () => {
    expect(durationInDays('2026-08-01', '2026-08-31')).toBe(31);
    expect(requiresReturnAso('2026-08-01', '2026-08-31')).toBe(true);
  });

  it('duração de exatamente 30 dias NÃO exige ASO de retorno', () => {
    expect(durationInDays('2026-08-01', '2026-08-30')).toBe(30);
    expect(requiresReturnAso('2026-08-01', '2026-08-30')).toBe(false);
  });
});

describe('vacationRules.shouldZeroAccrualPeriod — RF-RH-041/049 (Art. 133, IV, CLT)', () => {
  it('zera com acumulado > 182 dias (>6 meses)', () => {
    expect(shouldZeroAccrualPeriod(183)).toBe(true);
  });

  it('não zera com acumulado <= 182 dias', () => {
    expect(shouldZeroAccrualPeriod(182)).toBe(false);
    expect(shouldZeroAccrualPeriod(90)).toBe(false);
  });
});

describe('benefitRules — RF-RH-052 (limite de 6% de VT sobre salário)', () => {
  it('aceita desconto até 6% do salário', () => {
    expect(() => validateVtDiscountLimit(180, 3000)).not.toThrow();
  });

  it('rejeita desconto acima de 6% do salário com VT_DISCOUNT_LIMIT_EXCEEDED', () => {
    expect(() => validateVtDiscountLimit(200, 3000)).toThrow('VT_DISCOUNT_LIMIT_EXCEEDED');
  });
});

describe('benefitRules — RF-RH-052 (dependents restrito a saúde/odonto)', () => {
  it('aceita dependents para saúde/odonto', () => {
    expect(() => validateDependentsAllowed('saude', [{ name: 'Filho' }])).not.toThrow();
    expect(() => validateDependentsAllowed('odonto', [{ name: 'Filho' }])).not.toThrow();
  });

  it('rejeita dependents para outras categorias com DEPENDENTS_NOT_ALLOWED', () => {
    expect(() => validateDependentsAllowed('vt', [{ name: 'Filho' }])).toThrow('DEPENDENTS_NOT_ALLOWED');
  });

  it('não rejeita quando dependents ausente, para qualquer categoria', () => {
    expect(() => validateDependentsAllowed('vt', undefined)).not.toThrow();
    expect(() => validateDependentsAllowed('vt', null)).not.toThrow();
  });
});

describe('trainingRules.calculateValidUntil — RF-RH-057', () => {
  it('soma validity_months a completed_at', () => {
    expect(calculateValidUntil('2026-08-01', 24)).toBe('2028-08-01');
  });

  it('satura no fim do mês de destino (31/01 + 1 mês → 28/02, ano não bissexto)', () => {
    expect(calculateValidUntil('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('retorna null quando validity_months é null (sem vencimento)', () => {
    expect(calculateValidUntil('2026-08-01', null)).toBeNull();
    expect(calculateValidUntil('2026-08-01', undefined)).toBeNull();
  });
});

describe('trainingRules — RF-RH-059 (warning normativo)', () => {
  it('gera warning para curso normativo', () => {
    expect(normativeWarning(true)).toMatch(/SST/);
  });

  it('não gera warning para curso não-normativo', () => {
    expect(normativeWarning(false)).toBeNull();
  });
});

describe('trainingRules.isTrainingExpired — RF-RH-058', () => {
  it('vencido quando valid_until é anterior a hoje', () => {
    expect(isTrainingExpired('2026-01-01', '2026-08-12')).toBe(true);
  });

  it('não vencido quando valid_until é futuro', () => {
    expect(isTrainingExpired('2027-01-01', '2026-08-12')).toBe(false);
  });

  it('nunca vencido quando valid_until é null (sem vencimento)', () => {
    expect(isTrainingExpired(null, '2026-08-12')).toBe(false);
  });
});
