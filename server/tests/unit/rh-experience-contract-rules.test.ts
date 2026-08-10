import {
  validateMaxDuration,
  validateSingleExtension,
  MAX_EXPERIENCE_CONTRACT_DAYS,
} from '../../src/modules/rh/domain/services/experienceContractRules';

describe('rh/experienceContractRules — Art. 445, parágrafo único, CLT (máximo 90 dias)', () => {
  it('aceita duração de exatamente 90 dias', () => {
    expect(() => validateMaxDuration('2026-01-01', '2026-04-01')).not.toThrow();
  });
  it('rejeita duração acima de 90 dias', () => {
    expect(() => validateMaxDuration('2026-01-01', '2026-04-15')).toThrow(/EXPERIENCE_CONTRACT_EXCEEDS_90_DAYS/);
  });
  it('rejeita data de fim anterior/igual à de início', () => {
    expect(() => validateMaxDuration('2026-01-01', '2026-01-01')).toThrow(/EXPERIENCE_CONTRACT_INVALID_RANGE/);
  });
  it('expõe a constante de 90 dias', () => {
    expect(MAX_EXPERIENCE_CONTRACT_DAYS).toBe(90);
  });
});

describe('rh/experienceContractRules — Art. 451, CLT (uma única prorrogação)', () => {
  it('aceita a primeira prorrogação (period_2_end_date ainda nulo)', () => {
    expect(() => validateSingleExtension(null)).not.toThrow();
    expect(() => validateSingleExtension(undefined)).not.toThrow();
  });
  it('rejeita a segunda prorrogação', () => {
    expect(() => validateSingleExtension('2026-03-01')).toThrow(/SECOND_EXTENSION_REJECTED/);
  });
});
