/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: comercial-financeiro. Alvo C do lote de caracterização.
 *
 * Comportamento congelado: os valores de ICMS interno e IPI que
 * `TaxCalculationService.calculateItem` PRODUZ HOJE — não os valores que
 * `docs/tributario/02-ICMS_ESTADOS.md` documenta. Os dois divergem em 19 das
 * 27 UFs (ICMS interno) e em 100% dos itens (IPI, sempre 0% no código,
 * contra 10-15% documentado para o NCM 8518 — o produto principal da
 * fábrica). Nenhum dos dois lados deste arquivo é declarado "correto"; o
 * teste apenas fixa o que o código faz, para que uma mudança futura de
 * alíquota seja uma decisão de negócio deliberada, não um efeito colateral
 * silencioso de refactor.
 *
 * A suíte existente (`tests/unit/tax-calculation-service.test.ts`) cobre
 * SOMENTE a UF SP (que coincide com o documento) e nunca afirma
 * explicitamente `ipi_aliquot`/`ipi_value` — os 19 casos divergentes e o
 * bloco de IPI ficam sem nenhuma asserção. Este arquivo NÃO duplica os
 * casos já cobertos (SP, CFOP, PIS/COFINS por CRT, ICMS-isento) — cobre só
 * o que hoje é lacuna.
 *
 * Âncoras:
 *   - BR-FIS-001 (CRITICAL/CONFIRMED) — ICMS interno diverge em 19/27 UFs
 *   - BR-FIS-003 (CRITICAL/CONFIRMED) — IPI 0% no código × 10-15% documentado (NCM 8518)
 *   - server/src/modules/fiscal/domain/services/TaxCalculationService.ts:55-59 (tabela ICMS_INTERNAL_RATE)
 *   - server/src/modules/fiscal/domain/services/TaxCalculationService.ts:101-117 (aplicação do ICMS interno + fallback 18%)
 *   - server/src/modules/fiscal/domain/services/TaxCalculationService.ts:119-124 (IPI fixo 0%, CST 53)
 *   - docs/tributario/02-ICMS_ESTADOS.md:9-35 (tabela documentada de ICMS por UF)
 *   - docs/tributario/02-ICMS_ESTADOS.md:71-85 (tabela documentada de IPI por NCM, cap. 8518)
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 *
 * @group unit
 * @ticket ERP-LEGACY-001-passo30
 */

import TaxCalculationService = require('../../src/modules/fiscal/domain/services/TaxCalculationService');

// Item de venda de referência: produto próprio (finished), NCM do capítulo
// 8518 (alto-falantes — produto principal da fábrica), R$ 100,00 (base
// simples para tornar o percentual == o valor em reais).
const baseItem = {
  product_type: 'finished' as const,
  ncm: '85182100',
  quantity: 1,
  unit_price: 100,
  total_price: 100,
};

const company = { state: 'SP', crt: '3' as const };

describe('PASSO 30 — ICMS interno por UF: código produz valor diferente do documentado em 19/27 UFs (BR-FIS-001)', () => {
  it('SP: código e documento CONFEREM (18%) — caso de controle, já coberto por tax-calculation-service.test.ts, repetido aqui só como baseline da tabela', () => {
    const result = TaxCalculationService.calculateItem(company, { state: 'SP', ind_ie: '1' }, baseItem);
    expect(result.icms_aliquot).toBe(18);
    expect(result.icms_value).toBe(18);
  });

  it('RJ: documento diz 18%, código aplica 20% — código tributa 2 pontos A MAIS (não testado em nenhum outro arquivo)', () => {
    // Emitente TAMBÉM em RJ (não SP->RJ) para medir a alíquota INTERNA do
    // RJ — a interestadual SP->RJ (12%) já tem cobertura em
    // tax-calculation-service.test.ts e não é o que este teste mede.
    const result = TaxCalculationService.calculateItem({ state: 'RJ', crt: '3' }, { state: 'RJ', ind_ie: '1' }, baseItem);
    expect(result.cfop).toBe('5101'); // operação interna (mesma UF), produção própria
    expect(result.icms_aliquot).toBe(20);
    expect(result.icms_value).toBe(20);
  });

  it('BA: documento diz 18%, código aplica 19% — divergência de 1 ponto A MAIS', () => {
    const result = TaxCalculationService.calculateItem({ state: 'BA', crt: '3' }, { state: 'BA', ind_ie: '1' }, baseItem);
    expect(result.icms_aliquot).toBe(19);
    expect(result.icms_value).toBe(19);
  });

  it('RS: documento diz 18%, código aplica 17% — único sentido em que o código tributa MENOS que o documento', () => {
    const result = TaxCalculationService.calculateItem({ state: 'RS', crt: '3' }, { state: 'RS', ind_ie: '1' }, baseItem);
    expect(result.icms_aliquot).toBe(17);
    expect(result.icms_value).toBe(17);
  });

  it('UF desconhecida/inválida cai no fallback silencioso de 18% (TaxCalculationService.ts:114, `?? 18`), sem erro nem log', () => {
    // Nenhuma das 27 UFs reais está ausente de ICMS_INTERNAL_RATE — este
    // caso só ocorre por typo/dado inválido vindo do cadastro da empresa
    // (`CompanyFiscalConfig.state`). O código não valida a UF antes de
    // indexar a tabela; qualquer chave ausente vira 18% silenciosamente.
    const result = TaxCalculationService.calculateItem({ state: 'XX', crt: '3' }, { state: 'XX', ind_ie: '1' }, baseItem);
    expect(result.icms_aliquot).toBe(18);
  });
});

describe('PASSO 30 — IPI: código sempre 0%, documento exige 10-15% para o NCM 8518 (BR-FIS-003)', () => {
  it('NCM 8518 (produto principal — alto-falante): ipi_aliquot=0, ipi_value=0, ipi_cst=53 (não tributado), independente do NCM informado', () => {
    const result = TaxCalculationService.calculateItem(company, { state: 'SP', ind_ie: '1' }, baseItem);
    expect(result.ipi_aliquot).toBe(0);
    expect(result.ipi_value).toBe(0);
    expect(result.ipi_cst).toBe('53');
  });

  it('NCM 8518.40.00 (amplificadores — 15% documentado): código também zera, porque calculateItem NÃO lê `item.ncm` para IPI em nenhum ponto', () => {
    const result = TaxCalculationService.calculateItem(company, { state: 'SP', ind_ie: '1' }, {
      ...baseItem,
      ncm: '85184000',
      total_price: 1000,
      unit_price: 1000,
    });
    // Documentado: R$ 150,00 de IPI (15% de R$ 1.000,00). Código produz R$ 0,00.
    expect(result.ipi_aliquot).toBe(0);
    expect(result.ipi_value).toBe(0);
  });

  it('regime Simples Nacional (CRT=1) não muda o IPI — já era 0% e continua 0%, mas por caminho de código diferente do ICMS zerado por CRT', () => {
    const result = TaxCalculationService.calculateItem({ state: 'SP', crt: '1' }, { state: 'SP', ind_ie: '1' }, baseItem);
    expect(result.ipi_aliquot).toBe(0);
    expect(result.icms_aliquot).toBe(0); // zerado pelo bloco CRT==='1', motivo distinto do IPI
  });
});
