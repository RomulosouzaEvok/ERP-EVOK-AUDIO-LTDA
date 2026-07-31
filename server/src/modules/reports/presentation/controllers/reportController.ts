const SequelizeReportsRepository = require('../../infrastructure/sequelize/SequelizeReportsRepository');
const GetSalesReportUseCase = require('../../application/use-cases/GetSalesReportUseCase');
const GetInventoryReportUseCase = require('../../application/use-cases/GetInventoryReportUseCase');
const GetCustomersReportUseCase = require('../../application/use-cases/GetCustomersReportUseCase');
const GetCashFlowReportUseCase = require('../../application/use-cases/GetCashFlowReportUseCase');
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

/**
 * Responde o relatório no formato pedido (`json` por padrão).
 *
 * @param {import('express').Response} res
 * @param {string} format - `'json' | 'csv' | 'pdf'`.
 * @param {string} filename - Nome do arquivo (sem extensão) para csv/pdf.
 * @param {Object} report - Objeto do relatório (`{ report_type, generated_at, summary, details? }`).
 * @param {Array<{header:string, accessor:Function}>} columns - Colunas para csv/pdf.
 * @returns {Promise<void>}
 */
async function respondReport(res, format, filename, report, columns) {
  const rows = report.details ?? [report.summary];

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
 * @param {string} filename
 * @returns {string}
 */
function filenameToTitle(filename) {
  const titles = {
    'relatorio-vendas': 'Relatório de Vendas',
    'relatorio-estoque': 'Relatório de Estoque',
    'relatorio-clientes': 'Relatório de Clientes',
    'relatorio-fluxo-caixa': 'Relatório de Fluxo de Caixa'
  };
  return titles[filename] || filename;
}

/** `GET /api/reports/sales?format=json|csv|pdf`. */
exports.sales = async (req, res, next) => {
  try {
    const { start_date, end_date, customer_id, format = 'json' } = req.query;
    const useCase = new GetSalesReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date, customer_id });

    await respondReport(res, format, 'relatorio-vendas', report, [
      { header: 'ID', accessor: (row) => row.id },
      { header: 'Data', accessor: (row) => new Date(row.createdAt).toLocaleString('pt-BR') },
      { header: 'Cliente', accessor: (row) => row.customer?.name ?? row.customer_id },
      { header: 'Status', accessor: (row) => row.status },
      { header: 'Total', accessor: (row) => Number(row.total_amount).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/inventory?format=json|csv|pdf`. */
exports.inventory = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const useCase = new GetInventoryReportUseCase(reportsRepository);
    const report = await useCase.execute();

    await respondReport(res, format, 'relatorio-estoque', report, [
      { header: 'Código', accessor: (row) => row.code },
      { header: 'Nome', accessor: (row) => row.name },
      { header: 'Categoria', accessor: (row) => row.category?.name ?? '' },
      { header: 'Quantidade', accessor: (row) => Number(row.quantity) },
      { header: 'Custo unitário', accessor: (row) => Number(row.cost_price).toFixed(2) },
      { header: 'Valor total', accessor: (row) => (Number(row.cost_price) * Number(row.quantity)).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/customers?format=json|csv|pdf`. */
exports.customers = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const useCase = new GetCustomersReportUseCase(reportsRepository);
    const report = await useCase.execute();

    await respondReport(res, format, 'relatorio-clientes', report, [
      { header: 'ID', accessor: (row) => row.id },
      { header: 'Nome', accessor: (row) => row.name },
      { header: 'CPF/CNPJ', accessor: (row) => row.cpf_cnpj },
      { header: 'Telefone', accessor: (row) => row.phone ?? '' },
      { header: 'E-mail', accessor: (row) => row.email ?? '' }
    ]);
  } catch (error) { next(error); }
};

/** `GET /api/reports/cash-flow?format=json|csv|pdf`. */
exports.cashFlow = async (req, res, next) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;
    const useCase = new GetCashFlowReportUseCase(reportsRepository);
    const report = await useCase.execute({ start_date, end_date });

    await respondReport(res, format, 'relatorio-fluxo-caixa', report, [
      { header: 'Total vendas', accessor: (row) => Number(row.total_sales).toFixed(2) },
      { header: 'Total compras', accessor: (row) => Number(row.total_purchases).toFixed(2) },
      { header: 'Saldo', accessor: (row) => Number(row.balance).toFixed(2) }
    ]);
  } catch (error) { next(error); }
};
