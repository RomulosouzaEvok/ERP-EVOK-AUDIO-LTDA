/**
 * Motor de cálculo tributário simplificado (ICMS/IPI/PIS/COFINS + CFOP)
 * usado para montar o payload de emissão de NF-e de venda.
 *
 * ⚠️ SIMPLIFICAÇÃO IMPORTANTE: este cálculo usa alíquotas padrão por
 * estado/regime, sem considerar Substituição Tributária (ST), benefícios
 * fiscais, convênios ICMS específicos, redução de base de cálculo, DIFAL
 * para consumidor final não contribuinte, ou alíquotas diferenciadas por
 * NCM. É um ponto de partida funcional, NÃO substitui a validação de um
 * contador/tributarista antes de emitir NF-e com valor fiscal real em
 * produção. Documentado em `docs/tributario/`.
 *
 * @module modules/fiscal/domain/services/TaxCalculationService
 */

export interface TaxCalcCompany {
  state: string;
  crt: '1' | '2' | '3';
}

export interface TaxCalcClient {
  state: string | null;
  tax_regime?: string | null;
  ind_ie?: '1' | '2' | '9' | null;
}

export interface TaxCalcItemInput {
  product_type: 'finished' | 'semi_finished' | 'component' | 'raw_material';
  ncm?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface TaxCalcItemResult {
  cfop: string;
  icms_cst: string;
  icms_aliquot: number;
  icms_base: number;
  icms_value: number;
  ipi_cst: string;
  ipi_aliquot: number;
  ipi_value: number;
  pis_cst: string;
  pis_aliquot: number;
  pis_value: number;
  cofins_cst: string;
  cofins_aliquot: number;
  cofins_value: number;
}

// Alíquotas internas de ICMS por UF (padrão geral, simplificado — muitos
// produtos têm alíquotas diferenciadas por NCM/convênio que este calculo
// não cobre).
const ICMS_INTERNAL_RATE: Record<string, number> = {
  AC: 19, AL: 19, AP: 18, AM: 20, BA: 19, CE: 20, DF: 20, ES: 17, GO: 19,
  MA: 20, MT: 17, MS: 17, MG: 18, PA: 19, PB: 20, PR: 19, PE: 20.5, PI: 21,
  RJ: 20, RN: 18, RO: 19.5, RR: 20, RS: 17, SC: 17, SP: 18, SE: 19, TO: 20,
};

// Estados do Sul/Sudeste (exceto ES) — usados na regra de alíquota
// interestadual padrão (Resolução do Senado 22/1989 e 13/2012).
const SOUTH_SOUTHEAST_EXCEPT_ES = new Set(['SP', 'RJ', 'MG', 'PR', 'SC', 'RS']);

/**
 * Calcula a alíquota interestadual padrão de ICMS entre duas UFs, conforme
 * a regra geral (7% ou 12%) — não considera produtos importados (4%).
 */
function interstateIcmsRate(originState: string, destState: string): number {
  if (SOUTH_SOUTHEAST_EXCEPT_ES.has(originState)) {
    return SOUTH_SOUTHEAST_EXCEPT_ES.has(destState) ? 12 : 7;
  }
  return 12;
}

export class TaxCalculationService {
  /**
   * Calcula o CFOP e os tributos (ICMS, IPI, PIS, COFINS) de um item de
   * venda, dado o estado/regime do emitente (empresa) e do destinatário
   * (cliente).
   *
   * @param company - Dados fiscais do emitente.
   * @param client - Dados fiscais do destinatário.
   * @param item - Item da venda (produto + quantidade/valor).
   * @returns Tributos calculados para o item.
   */
  static calculateItem(company: TaxCalcCompany, client: TaxCalcClient, item: TaxCalcItemInput): TaxCalcItemResult {
    const isInterstate = Boolean(client.state) && client.state !== company.state;
    const isOwnProduction = item.product_type === 'finished' || item.product_type === 'semi_finished';

    // CFOP: producao propria (51xx/61xx) vs revenda de mercadoria (51xx/61xx
    // com codigo de revenda) — simplificado para os dois casos mais comuns.
    const cfop = isOwnProduction
      ? (isInterstate ? '6101' : '5101')
      : (isInterstate ? '6102' : '5102');

    const icmsBase = item.total_price;
    let icmsAliquot: number;
    let icmsCst: string;

    if (company.crt === '1') {
      // Simples Nacional: ICMS recolhido via DAS (Simples), CSOSN informativo,
      // sem destaque de ICMS proprio na NF-e (regra geral).
      icmsCst = '102'; // CSOSN 102 = tributada pelo Simples Nacional sem permissao de credito
      icmsAliquot = 0;
    } else if (client.ind_ie === '2') {
      // Cliente isento de ICMS (raro em B2B, mais comum em ST) — sem destaque.
      icmsCst = '40';
      icmsAliquot = 0;
    } else {
      icmsCst = '00';
      icmsAliquot = isInterstate
        ? interstateIcmsRate(company.state, client.state as string)
        : (ICMS_INTERNAL_RATE[company.state] ?? 18);
    }

    const icmsValue = Math.round(icmsBase * (icmsAliquot / 100) * 100) / 100;

    // IPI: sem alíquota por NCM cadastrada no catalogo hoje — assume nao
    // tributado (NT) por padrao. Configurar alíquota por NCM é trabalho
    // futuro (tabela TIPI completa).
    const ipiCst = '53';
    const ipiAliquot = 0;
    const ipiValue = 0;

    // PIS/COFINS: incidem sobre o faturamento do EMITENTE (nao do cliente),
    // conforme o regime tributario da propria empresa.
    let pisAliquot = 0;
    let cofinsAliquot = 0;
    let pisCst = '99';
    let cofinsCst = '99';

    if (company.crt === '1') {
      // Simples Nacional: PIS/COFINS embutidos no DAS, sem destaque proprio.
      pisCst = '99';
      cofinsCst = '99';
    } else if (company.crt === '2') {
      // Lucro Presumido (cumulativo)
      pisAliquot = 0.65;
      cofinsAliquot = 3.00;
      pisCst = '01';
      cofinsCst = '01';
    } else {
      // Lucro Real (nao-cumulativo, simplificado sem apuracao de creditos)
      pisAliquot = 1.65;
      cofinsAliquot = 7.60;
      pisCst = '01';
      cofinsCst = '01';
    }

    const pisValue = Math.round(item.total_price * (pisAliquot / 100) * 100) / 100;
    const cofinsValue = Math.round(item.total_price * (cofinsAliquot / 100) * 100) / 100;

    return {
      cfop,
      icms_cst: icmsCst,
      icms_aliquot: icmsAliquot,
      icms_base: icmsBase,
      icms_value: icmsValue,
      ipi_cst: ipiCst,
      ipi_aliquot: ipiAliquot,
      ipi_value: ipiValue,
      pis_cst: pisCst,
      pis_aliquot: pisAliquot,
      pis_value: pisValue,
      cofins_cst: cofinsCst,
      cofins_aliquot: cofinsAliquot,
      cofins_value: cofinsValue,
    };
  }
}

export default TaxCalculationService;
module.exports = TaxCalculationService;
module.exports.TaxCalculationService = TaxCalculationService;
module.exports.default = TaxCalculationService;
