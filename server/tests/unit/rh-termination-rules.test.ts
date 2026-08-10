import {
  calculatePaymentDeadline,
  calculateNoticePeriodDays,
  calculateCompletedYearsOfService,
} from '../../src/modules/rh/domain/services/terminationRules';

describe('rh/terminationRules — Art. 477 §6º, CLT (prazo de 10 dias corridos)', () => {
  it('calcula o prazo a partir da data de término do contrato', () => {
    expect(calculatePaymentDeadline('2026-08-10')).toBe('2026-08-20');
  });
  it('conta dias corridos (inclui fim de semana)', () => {
    // 2026-08-28 é sexta-feira; +10 dias corridos cai em 2026-09-07 (segunda).
    expect(calculatePaymentDeadline('2026-08-28')).toBe('2026-09-07');
  });
});

describe('rh/terminationRules — Lei 12.506/2011 (aviso prévio proporcional)', () => {
  it('concede 30 dias para até 1 ano de casa', () => {
    expect(calculateNoticePeriodDays(0)).toBe(30);
    expect(calculateNoticePeriodDays(1)).toBe(33);
  });
  it('acrescenta 3 dias por ano completo', () => {
    expect(calculateNoticePeriodDays(5)).toBe(45);
  });
  it('limita o total a 90 dias (máximo de 60 dias adicionais)', () => {
    expect(calculateNoticePeriodDays(20)).toBe(90);
    expect(calculateNoticePeriodDays(100)).toBe(90);
  });
  it('conta o ano completo NO aniversário redondo (regressão do bug de 365,25)', () => {
    // 2016-08-10 → 2026-08-10 são 3652 dias; a divisão por 365,25 dava 9 anos
    // (57 dias de aviso) em vez de 10 anos (60 dias) — Lei 12.506/2011.
    expect(calculateCompletedYearsOfService('2016-08-10', '2026-08-10')).toBe(10);
    expect(calculateNoticePeriodDays(calculateCompletedYearsOfService('2016-08-10', '2026-08-10'))).toBe(60);
  });

  it('não conta o ano quando falta um dia para o aniversário', () => {
    expect(calculateCompletedYearsOfService('2016-08-10', '2026-08-09')).toBe(9);
  });

  it('não conta o ano quando o mês de referência é anterior ao da admissão', () => {
    expect(calculateCompletedYearsOfService('2016-08-10', '2026-07-31')).toBe(9);
  });

  it('nunca devolve anos negativos (data de referência anterior à admissão)', () => {
    expect(calculateCompletedYearsOfService('2026-08-10', '2020-01-01')).toBe(0);
  });

  it('rejeita anos negativos', () => {
    expect(() => calculateNoticePeriodDays(-1)).toThrow();
  });
});
