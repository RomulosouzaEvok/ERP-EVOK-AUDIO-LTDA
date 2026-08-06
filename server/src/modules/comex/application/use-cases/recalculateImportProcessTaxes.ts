/**
 * Helper compartilhado: recalcula e persiste os tributos/custo nacionalizado
 * de todos os itens de um processo de importacao, a partir dos dados atuais
 * do cabecalho (cambio, frete, seguro, outras despesas) e das aliquotas
 * ja gravadas em cada item.
 *
 * Usado por `RegisterImportTrackingUseCase` (quando o acompanhamento altera
 * dados monetarios do processo) e por `ReceiveImportProcessUseCase` (sempre,
 * imediatamente antes de dar entrada em estoque, para garantir que o custo
 * nacionalizado aplicado reflita os dados mais recentes do processo).
 *
 * @module modules/comex/application/use-cases/recalculateImportProcessTaxes
 */

import type ComexRepository from '../../domain/repositories/ComexRepository';
import { calculateImportProcessTaxes } from './importTaxCalculator';

/**
 * @param comexRepository - Repositorio de Importacao/COMEX.
 * @param importProcess - Processo (cabecalho) ja carregado, com os dados monetarios atuais.
 * @param transaction - Transacao Sequelize ativa.
 * @returns Os itens do processo, ja atualizados com os valores recalculados.
 */
export async function recalculateImportProcessTaxes(
  comexRepository: ComexRepository,
  importProcess: { id: number; exchange_rate: number; freight_value: number; insurance_value: number; other_expenses_value: number },
  transaction: any,
): Promise<any[]> {
  const items = await comexRepository.findImportProcessItems(importProcess.id, transaction, true);

  const calculations = calculateImportProcessTaxes(
    {
      exchange_rate: parseFloat(String(importProcess.exchange_rate)),
      freight_value: parseFloat(String(importProcess.freight_value)),
      insurance_value: parseFloat(String(importProcess.insurance_value)),
      other_expenses_value: parseFloat(String(importProcess.other_expenses_value)),
    },
    items.map((item: any) => ({
      id: item.id,
      quantity: parseFloat(item.quantity),
      fob_unit_price: parseFloat(item.fob_unit_price),
      ii_rate: parseFloat(item.ii_rate),
      ipi_rate: parseFloat(item.ipi_rate),
      pis_rate: parseFloat(item.pis_rate),
      cofins_rate: parseFloat(item.cofins_rate),
      icms_rate: parseFloat(item.icms_rate),
    })),
  );

  for (const calculation of calculations) {
    await comexRepository.updateImportProcessItem(calculation.id as number, {
      customs_value: calculation.customs_value,
      ii_value: calculation.ii_value,
      ipi_value: calculation.ipi_value,
      pis_value: calculation.pis_value,
      cofins_value: calculation.cofins_value,
      icms_value: calculation.icms_value,
      nationalized_unit_cost: calculation.nationalized_unit_cost,
    }, transaction);
  }

  return comexRepository.findImportProcessItems(importProcess.id, transaction);
}
