import {
  calculateEntitledDays,
  calculateConcessiveEnd,
  validateFractionSizes,
  validateNoStartBeforeWeeklyRest,
  validateAbonoLimit,
  validateAbonoDeadline,
  isConcessiveExpired,
  shouldZeroAccrualPeriod,
} from '../../src/modules/rh/domain/services/vacationRules';

describe('rh/vacationRules — Art. 130 CLT (dias de férias por faltas)', () => {
  it('concede 30 dias com até 5 faltas injustificadas', () => {
    expect(calculateEntitledDays(0)).toBe(30);
    expect(calculateEntitledDays(5)).toBe(30);
  });
  it('concede 24 dias com 6 a 14 faltas', () => {
    expect(calculateEntitledDays(6)).toBe(24);
    expect(calculateEntitledDays(14)).toBe(24);
  });
  it('concede 18 dias com 15 a 23 faltas', () => {
    expect(calculateEntitledDays(15)).toBe(18);
    expect(calculateEntitledDays(23)).toBe(18);
  });
  it('concede 12 dias com 24 a 32 faltas', () => {
    expect(calculateEntitledDays(24)).toBe(12);
    expect(calculateEntitledDays(32)).toBe(12);
  });
  it('concede 0 dias com mais de 32 faltas (Art. 133, II, CLT)', () => {
    expect(calculateEntitledDays(33)).toBe(0);
    expect(calculateEntitledDays(100)).toBe(0);
  });
  it('rejeita faltas negativas', () => {
    expect(() => calculateEntitledDays(-1)).toThrow();
  });
});

describe('rh/vacationRules — Art. 134 caput CLT (período concessivo)', () => {
  it('calcula fim do concessivo como 12 meses após fim do aquisitivo', () => {
    expect(calculateConcessiveEnd('2026-01-15')).toBe('2027-01-15');
  });

  it('satura 29/02 em 28/02, como o PostgreSQL (regressão do CHECK da migration 20260808-000018)', () => {
    // `date '2028-02-29' + interval '1 year'` = 2029-02-28 no Postgres. A
    // implementação anterior (setUTCFullYear) devolvia 2029-03-01 e
    // violaria `ck_hr_vacation_accrual_periods_period_end` em runtime.
    expect(calculateConcessiveEnd('2028-02-29')).toBe('2029-02-28');
  });

  it('preserva 28/02 e 01/03 sem deslocamento', () => {
    expect(calculateConcessiveEnd('2027-02-28')).toBe('2028-02-28');
    expect(calculateConcessiveEnd('2027-03-01')).toBe('2028-03-01');
  });

  it('preserva o último dia dos demais meses (31/01, 31/12)', () => {
    expect(calculateConcessiveEnd('2026-01-31')).toBe('2027-01-31');
    expect(calculateConcessiveEnd('2026-12-31')).toBe('2027-12-31');
  });
});

describe('rh/vacationRules — Art. 134 §1º CLT (fracionamento)', () => {
  it('aceita fração única de qualquer tamanho', () => {
    expect(() => validateFractionSizes([{ days: 30 }])).not.toThrow();
  });
  it('aceita 3 frações quando uma tem >=14 dias e as demais >=5', () => {
    expect(() => validateFractionSizes([{ days: 14 }, { days: 10 }, { days: 6 }])).not.toThrow();
  });
  it('rejeita mais de 3 frações', () => {
    expect(() => validateFractionSizes([{ days: 14 }, { days: 6 }, { days: 5 }, { days: 5 }])).toThrow(/MAX_FRACTIONS_REACHED/);
  });
  it('rejeita quando nenhuma fração tem >=14 dias', () => {
    expect(() => validateFractionSizes([{ days: 10 }, { days: 10 }, { days: 10 }])).toThrow(/INVALID_FRACTION_SIZE/);
  });
  it('rejeita quando alguma fração tem menos de 5 dias', () => {
    expect(() => validateFractionSizes([{ days: 20 }, { days: 4 }])).toThrow(/INVALID_FRACTION_SIZE/);
  });
});

describe('rh/vacationRules — Art. 134 §2º CLT (vedação de início antes de DSR)', () => {
  it('rejeita início em sexta-feira (2 dias antes de domingo)', () => {
    // 2026-08-14 é uma sexta-feira.
    expect(() => validateNoStartBeforeWeeklyRest('2026-08-14')).toThrow(/VACATION_START_BEFORE_WEEKLY_REST/);
  });
  it('rejeita início em sábado (1 dia antes de domingo)', () => {
    expect(() => validateNoStartBeforeWeeklyRest('2026-08-15')).toThrow(/VACATION_START_BEFORE_WEEKLY_REST/);
  });
  it('aceita início em segunda-feira', () => {
    expect(() => validateNoStartBeforeWeeklyRest('2026-08-17')).not.toThrow();
  });
});

describe('rh/vacationRules — Art. 143 CLT (abono pecuniário)', () => {
  it('aceita abono de até 1/3 dos dias do período', () => {
    expect(() => validateAbonoLimit(10, 30)).not.toThrow();
  });
  it('rejeita abono acima de 1/3 dos dias do período', () => {
    expect(() => validateAbonoLimit(11, 30)).toThrow(/ABONO_LIMIT_EXCEEDED/);
  });
  it('aceita requerimento feito exatamente 15 dias antes do fim do aquisitivo', () => {
    expect(() => validateAbonoDeadline('2026-01-01', '2026-01-16')).not.toThrow();
  });
  it('rejeita requerimento feito a menos de 15 dias do fim do aquisitivo', () => {
    expect(() => validateAbonoDeadline('2026-01-10', '2026-01-16')).toThrow(/ABONO_DEADLINE_EXPIRED/);
  });
});

describe('rh/vacationRules — Art. 137 CLT (dobra do período concessivo)', () => {
  it('detecta concessivo vencido sem gozo integral', () => {
    const today = new Date('2027-02-01T00:00:00Z');
    expect(isConcessiveExpired('2027-01-15', 'em_curso', today)).toBe(true);
  });
  it('não considera vencido antes do prazo', () => {
    const today = new Date('2026-12-01T00:00:00Z');
    expect(isConcessiveExpired('2027-01-15', 'em_curso', today)).toBe(false);
  });
  it('não considera vencido se já gozado', () => {
    const today = new Date('2027-02-01T00:00:00Z');
    expect(isConcessiveExpired('2027-01-15', 'gozado', today)).toBe(false);
  });
});

describe('rh/vacationRules — Art. 133, IV, CLT (zeramento por afastamento previdenciário)', () => {
  it('zera com mais de 6 meses acumulados de afastamento INSS', () => {
    expect(shouldZeroAccrualPeriod(183)).toBe(true);
  });
  it('não zera com 6 meses ou menos', () => {
    expect(shouldZeroAccrualPeriod(180)).toBe(false);
  });
});
