import type { Request, Response, NextFunction } from 'express';
import type { CsvColumn } from '../../infrastructure/export/csvExporter';

import SequelizeReportsRepository = require('../../infrastructure/sequelize/SequelizeReportsRepository');
import GetSalesReportUseCase = require('../../application/use-cases/GetSalesReportUseCase');
import GetInventoryReportUseCase = require('../../application/use-cases/GetInventoryReportUseCase');
import GetCustomersReportUseCase = require('../../application/use-cases/GetCustomersReportUseCase');
import GetCashFlowReportUseCase = require('../../application/use-cases/GetCashFlowReportUseCase');
import GetProductionReportUseCase = require('../../application/use-cases/GetProductionReportUseCase');
import GetPurchasingReportUseCase = require('../../application/use-cases/GetPurchasingReportUseCase');
import GetCostVarianceReportUseCase = require('../../application/use-cases/GetCostVarianceReportUseCase');
const { toCsv } = require('../../infrastructure/export/csvExporter');
const { toPdf } = require('../../infrastructure/export/pdfExporter');

/**
 * Controller enxuto do módulo `reports`. Interpreta `req`, delega toda a
 * regra de negócio aos use cases da camada de aplicação e devolve o
 * relatório em `json` (formato/contrato preservado 1:1 do controller
 * anterior, `server/src/controllers/reportController.ts`, quando
 * `?format` é omitido), `csv` ou `pdf` (F.export — novo, aditivo) conforme
 * o parâmetro de query `?format=json|csv|pdf`.
 */
const reportsRepository = new SequelizeReportsRepository();

/** Formatos de resposta aceitos pelos endpoints exportáveis (sales/inventory/customers/cash-flow). */
type ReportFormat = 'json' | 'csv' | 'pdf';

/** Shape mínimo comum aos relatórios que suportam exportação csv/pdf (`respondReport`). */
interface ExportableReport {
  report_type: string;
  generated_at: Date;
  summary?: Record<string, unknown>;
  details?: unknown[];
}

/**
 * Responde o relatório no formato pedido (`json` por padrão).
 *
 * @param res - Response.
 * @param format - `'json' | 'csv' | 'pdf'`.
 * @param filename - Nome do arquivo (sem extensão) para csv/pdf.
 * @param report - Objeto do relatório (`{ report_type, generated_at, summary, details? }`).
 * @param columns - Colunas para csv/pdf.
 * @returns Promise<void>.
 */
async function respondReport<T>(
  res: Response,
  format: ReportFormat,
  filename: string,
  report: ExportableReport,
  columns: CsvColumn<T>[],
): Promise<void> {
  const rows = (report.details ?? [report.summary]) as T[];

  if (format === 'csv') {
    const csv = toCsv(rows, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(`﻿${csv}`); // BOM: Excel abre acentos corretamente.
    return;
  }

  if (format === 'pdf') {
    const summaryEntries = Object.fromEntries(
      Object.entries(report.summary || {}).map(([key, value]) => [key, typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value)])
    );
    const pdfBuffer = await toPdf(filenameToTitle(filename), summaryEntries, rows, columns);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(pdfBuffer);
    return;
  }

  res.json({ success: true, data: report });
}

/**
 * Traduz o nome de arquivo do relatório para um título legível (usado no PDF).
 *
 * @param filename - Nome do arquivo (sem extensão), ex.: `'relatorio-vendas'`.
 * @returns Título do relatório, ou o próprio `filename` se não mapeado.
 */
function filenameToTitle(filename: string): string {
  const titles: Record<string, string> = {
    'relatorio-vendas': 'Relatório de Vendas',
    'relatorio-estoque': 'Relatório de Estoque',
    'relatorio-clientes': 'Relatório de Clientes',
    'relatorio-fluxo-caixa': 'Relatório de Fluxo de Caixa'
  };
  return titles[filename] || filename;
}

/** `GET /api/reports/sales?format=json|csv|pdf`. */
exports.sales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, customer_id, format = 'json' } = req.query as {
      start_date?: string;
      end_date?: string;
      customer_id?: string;
      format?: ReportFormat;
    };
    const useCase = new GetSalesReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date, customer_id });

    await respondReport(res, format, 'relatorio-vendas', report, [
      { header: 'ID', accessor: (row: any) => row.id },
      { header: 'Data', accessor: (row: any) => new Date(row.createdAt).toLocaleString('pt-BR') },
      { header: 'Cliente', accessor: (row: any) => row.customer?.name ?? row.customer_id },
      { header: 'Status', accessor: (row: any) => row.status },
      { header: 'Total', accessor: (row: any) => Number(row.total_amount).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/inventory?format=json|csv|pdf`. */
exports.inventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.query as { format?: ReportFormat };
    const useCase = new GetInventoryReportUseCase(reportsRepository);
    const report = await useCase.execute();

    await respondReport(res, format, 'relatorio-estoque', report, [
      { header: 'Código', accessor: (row: any) => row.code },
      { header: 'Nome', accessor: (row: any) => row.name },
      { header: 'Categoria', accessor: (row: any) => row.category?.name ?? '' },
      { header: 'Quantidade', accessor: (row: any) => Number(row.quantity) },
      { header: 'Custo unitário', accessor: (row: any) => Number(row.cost_price).toFixed(2) },
      { header: 'Valor total', accessor: (row: any) => (Number(row.cost_price) * Number(row.quantity)).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/customers?format=json|csv|pdf`. */
exports.customers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.query as { format?: ReportFormat };
    const useCase = new GetCustomersReportUseCase(reportsRepository);
    const report = await useCase.execute();

    await respondReport(res, format, 'relatorio-clientes', report, [
      { header: 'ID', accessor: (row: any) => row.id },
      { header: 'Nome', accessor: (row: any) => row.name },
      { header: 'CPF/CNPJ', accessor: (row: any) => row.cpf_cnpj },
      { header: 'Telefone', accessor: (row: any) => row.phone ?? '' },
      { header: 'E-mail', accessor: (row: any) => row.email ?? '' }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/cash-flow?format=json|csv|pdf`. */
exports.cashFlow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query as {
      start_date?: string;
      end_date?: string;
      format?: ReportFormat;
    };
    const useCase = new GetCashFlowReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date });

    await respondReport(res, format, 'relatorio-fluxo-caixa', report, [
      { header: 'Total vendas', accessor: (row: any) => Number(row.total_sales).toFixed(2) },
      { header: 'Total compras', accessor: (row: any) => Number(row.total_purchases).toFixed(2) },
      { header: 'Saldo', accessor: (row: any) => Number(row.balance).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/production?start_date&end_date` — relatório de manufatura (json). */
exports.production = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
    const useCase = new GetProductionReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date });
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};

/** `GET /api/reports/purchasing?start_date&end_date` — compras por fornecedor (json). */
exports.purchasing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
    const useCase = new GetPurchasingReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date });
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};

/** `GET /api/reports/cost-variance?start_date&end_date` — variação de custo padrão x real (json). */
exports.costVariance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
    const useCase = new GetCostVarianceReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date });
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};
