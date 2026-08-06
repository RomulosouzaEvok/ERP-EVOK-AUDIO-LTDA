/**
 * Calculadora de tributos de importacao (UC-19, passo 4: "Sistema calcula
 * tributos de importacao (II, IPI, PIS, COFINS, ICMS)") e do custo unitario
 * nacionalizado final (UC-19, passo 6).
 *
 * Decisao deliberada (documentada em `docs/HANDOFF_CODEX.md`): as aliquotas
 * de II/IPI/PIS/COFINS/ICMS sao informadas manualmente pelo Analista de
 * Comex por item (`ImportProcessItem.*_rate`) — NAO ha integracao com
 * Siscomex/tabela NCM para resolve-las automaticamente, pois o UC-19 nao
 * pede essa integracao. Este modulo apenas aplica a formula sobre as
 * aliquotas informadas.
 *
 * Formula (simplificada, mas seguindo a pratica fiscal padrao brasileira):
 * - `valor_aduaneiro` (base) = FOB do item em BRL + frete/seguro do
 *   processo, rateados entre os itens proporcionalmente ao FOB de cada um.
 * - `II` = valor_aduaneiro × aliquota_ii
 * - `IPI` = (valor_aduaneiro + II) × aliquota_ipi
 * - `PIS`/`COFINS` = valor_aduaneiro × aliquota (base simplificada — a
 *   formula fiscal real do PIS/COFINS-Importacao usa uma base propria mais
 *   complexa; simplificado aqui deliberadamente, sem pretensao de engine de
 *   compliance fiscal certificada).
 * - `ICMS` = calculado "por dentro" (gross-up) sobre
 *   (valor_aduaneiro + II + IPI + PIS + COFINS + despesas aduaneiras
 *   rateadas), pratica padrao de importacao no Brasil.
 * - `custo_unitario_nacionalizado` = (valor_aduaneiro + todos os tributos +
 *   despesas aduaneiras rateadas) / quantidade.
 *
 * @module modules/comex/application/use-cases/importTaxCalculator
 */

import { roundQuantity } from '../../../../shared/utils/decimal';

export interface ImportTaxCalculatorHeaderInput {
  exchange_rate: number;
  freight_value: number;
  insurance_value: number;
  other_expenses_value: number;
}

export interface ImportTaxCalculatorItemInput {
  id: number | string;
  quantity: number;
  fob_unit_price: number;
  ii_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
  icms_rate: number;
}

export interface ImportTaxCalculatorItemResult {
  id: number | string;
  fob_total_brl: number;
  customs_value: number;
  ii_value: number;
  ipi_value: number;
  pis_value: number;
  cofins_value: number;
  icms_value: number;
  total_landed_cost: number;
  nationalized_unit_cost: number;
}

/** Converte uma aliquota percentual (ex.: 60) para fracao (0.6). */
function toFraction(ratePercent: number): number {
  return (ratePercent || 0) / 100;
}

/**
 * Calcula os tributos e o custo unitario nacionalizado de cada item de um
 * processo de importacao.
 *
 * @param header - Dados monetarios do cabecalho (cambio, frete, seguro, outras despesas).
 * @param items - Itens do processo (quantidade, FOB unitario, aliquotas).
 * @returns Um resultado por item, na mesma ordem de `items`.
 */
export function calculateImportProcessTaxes(
  header: ImportTaxCalculatorHeaderInput,
  items: ImportTaxCalculatorItemInput[],
): ImportTaxCalculatorItemResult[] {
  const fobTotalsBrl = items.map((item) => item.quantity * item.fob_unit_price * header.exchange_rate);
  const grandTotalFobBrl = fobTotalsBrl.reduce((sum, value) => sum + value, 0);

  return items.map((item, index) => {
    const fobTotalBrl = fobTotalsBrl[index];
    const ratio = grandTotalFobBrl > 0 ? fobTotalBrl / grandTotalFobBrl : 0;

    const freightShare = header.freight_value * ratio;
    const insuranceShare = header.insurance_value * ratio;
    const otherExpensesShare = header.other_expenses_value * ratio;

    const customsValue = fobTotalBrl + freightShare + insuranceShare;

    const iiValue = customsValue * toFraction(item.ii_rate);
    const ipiValue = (customsValue + iiValue) * toFraction(item.ipi_rate);
    const pisValue = customsValue * toFraction(item.pis_rate);
    const cofinsValue = customsValue * toFraction(item.cofins_rate);

    const icmsFraction = toFraction(item.icms_rate);
    const icmsBasePreGrossUp = customsValue + iiValue + ipiValue + pisValue + cofinsValue + otherExpensesShare;
    const icmsValue = icmsFraction > 0 && icmsFraction < 1
      ? (icmsBasePreGrossUp / (1 - icmsFraction)) * icmsFraction
      : 0;

    const totalLandedCost = customsValue + iiValue + ipiValue + pisValue + cofinsValue + icmsValue + otherExpensesShare;
    const nationalizedUnitCost = item.quantity > 0 ? totalLandedCost / item.quantity : 0;

    return {
      id: item.id,
      fob_total_brl: roundQuantity(fobTotalBrl),
      customs_value: roundQuantity(customsValue),
      ii_value: roundQuantity(iiValue),
      ipi_value: roundQuantity(ipiValue),
      pis_value: roundQuantity(pisValue),
      cofins_value: roundQuantity(cofinsValue),
      icms_value: roundQuantity(icmsValue),
      total_landed_cost: roundQuantity(totalLandedCost),
      nationalized_unit_cost: roundQuantity(nationalizedUnitCost),
    };
  });
}
