import TaxCalculationService = require('../../src/modules/fiscal/domain/services/TaxCalculationService');

describe('TaxCalculationService', () => {
  const item = { product_type: 'finished' as const, ncm: '85182100', quantity: 1, unit_price: 100, total_price: 100 };

  it('usa CFOP 5101 para producao propria dentro do mesmo estado', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'SP', ind_ie: '1' },
      item
    );
    expect(result.cfop).toBe('5101');
    expect(result.icms_aliquot).toBe(18);
    expect(result.icms_cst).toBe('00');
  });

  it('usa CFOP 6101 e regra interestadual (Sul/Sudeste -> Sul/Sudeste = 12%) para producao propria', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'RJ', ind_ie: '1' },
      item
    );
    expect(result.cfop).toBe('6101');
    expect(result.icms_aliquot).toBe(12);
  });

  it('usa aliquota interestadual de 7% de Sul/Sudeste para Nordeste/Norte/Centro-Oeste/ES', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'BA', ind_ie: '1' },
      item
    );
    expect(result.icms_aliquot).toBe(7);
  });

  it('usa CFOP de revenda (5102/6102) para produto nao proprio (componente/materia-prima)', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'SP', ind_ie: '1' },
      { ...item, product_type: 'component' }
    );
    expect(result.cfop).toBe('5102');
  });

  it('Simples Nacional (CRT=1) usa CSOSN sem destaque de ICMS proprio', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '1' },
      { state: 'SP', ind_ie: '1' },
      item
    );
    expect(result.icms_cst).toBe('102');
    expect(result.icms_aliquot).toBe(0);
    expect(result.pis_aliquot).toBe(0);
    expect(result.cofins_aliquot).toBe(0);
  });

  it('Lucro Presumido (CRT=2) aplica PIS 0.65% e COFINS 3.00%', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '2' },
      { state: 'SP', ind_ie: '1' },
      item
    );
    expect(result.pis_aliquot).toBe(0.65);
    expect(result.cofins_aliquot).toBe(3.00);
    expect(result.pis_value).toBe(0.65);
    expect(result.cofins_value).toBe(3.00);
  });

  it('Lucro Real (CRT=3) aplica PIS 1.65% e COFINS 7.60%', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'SP', ind_ie: '1' },
      item
    );
    expect(result.pis_aliquot).toBe(1.65);
    expect(result.cofins_aliquot).toBe(7.60);
  });

  it('cliente isento de ICMS (ind_ie=2) nao tem destaque de ICMS proprio', () => {
    const result = TaxCalculationService.calculateItem(
      { state: 'SP', crt: '3' },
      { state: 'SP', ind_ie: '2' },
      item
    );
    expect(result.icms_cst).toBe('40');
    expect(result.icms_aliquot).toBe(0);
  });
});
