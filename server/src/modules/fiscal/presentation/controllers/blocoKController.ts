import type { Request, Response, NextFunction } from 'express';

const SequelizeFiscalRepository = require('../../infrastructure/sequelize/SequelizeFiscalRepository');
const GetBlocoKPreviewUseCase = require('../../application/use-cases/GetBlocoKPreviewUseCase');
const { blocoKPreviewQuerySchema, handleZodError } = require('../validators/blocoKValidators');
const { toCsv } = require('../../../reports/infrastructure/export/csvExporter');

const fiscalRepository = new SequelizeFiscalRepository();

function flattenBlocoKRows(preview: any): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const row of preview.k200 ?? []) {
    rows.push({
      section: 'K200',
      record: 'stock',
      is_reference_only: preview.is_reference_only ?? false,
      disclaimer: preview.disclaimer ?? '',
      product_code: row.product_code,
      product_name: row.product_name,
      unit: row.unit,
      quantity_global: row.quantity_global,
      quantity_by_warehouse: row.quantity_by_warehouse,
      quantity_available_in_lots: row.quantity_available_in_lots,
      lots_count: row.lots_count,
    });
  }

  for (const row of preview.k230 ?? []) {
    rows.push({
      section: 'K230',
      record: 'production',
      is_reference_only: preview.is_reference_only ?? false,
      disclaimer: preview.disclaimer ?? '',
      order_number: row.order_number,
      product_code: row.product_code,
      product_name: row.product_name,
      planned_quantity: row.planned_quantity,
      quantity_produced: row.quantity_produced,
      quantity_scrapped: row.quantity_scrapped,
      status: row.status,
      completion_date: row.completion_date,
      production_route_id: row.production_route_id,
    });
  }

  for (const row of preview.k235 ?? []) {
    rows.push({
      section: 'K235',
      record: 'consumption',
      is_reference_only: preview.is_reference_only ?? false,
      disclaimer: preview.disclaimer ?? '',
      order_number: row.order_number,
      product_code: row.product_code,
      product_name: row.product_name,
      lot_number: row.lot_number,
      quantity_consumed: row.quantity_consumed,
      consumed_at: row.consumed_at,
      user_id: row.user_id,
    });
  }

  for (const row of preview.k280 ?? []) {
    rows.push({
      section: 'K280',
      record: 'adjustment',
      is_reference_only: preview.is_reference_only ?? false,
      disclaimer: preview.disclaimer ?? '',
      ...row,
    });
  }

  return rows;
}

exports.getBlocoKPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = blocoKPreviewQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(parsed.error);

    const useCase = new GetBlocoKPreviewUseCase(fiscalRepository);
    const preview = await useCase.execute({
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
    });

    if (parsed.data.format === 'csv') {
      const csv = toCsv(flattenBlocoKRows(preview), [
        { header: 'is_reference_only', accessor: (row: any) => row.is_reference_only },
        { header: 'disclaimer', accessor: (row: any) => row.disclaimer ?? '' },
        { header: 'Seccao', accessor: (row: any) => row.section },
        { header: 'Registro', accessor: (row: any) => row.record },
        { header: 'Pedido/OP', accessor: (row: any) => row.order_number ?? '' },
        { header: 'Codigo', accessor: (row: any) => row.product_code ?? '' },
        { header: 'Produto', accessor: (row: any) => row.product_name ?? '' },
        { header: 'Unidade', accessor: (row: any) => row.unit ?? '' },
        { header: 'Quantidade global', accessor: (row: any) => row.quantity_global ?? '' },
        { header: 'Quantidade por deposito', accessor: (row: any) => row.quantity_by_warehouse ?? '' },
        { header: 'Quantidade disponivel em lotes', accessor: (row: any) => row.quantity_available_in_lots ?? '' },
        { header: 'Lotes', accessor: (row: any) => row.lots_count ?? '' },
        { header: 'Quantidade produzida', accessor: (row: any) => row.quantity_produced ?? '' },
        { header: 'Quantidade refugada', accessor: (row: any) => row.quantity_scrapped ?? '' },
        { header: 'Quantidade consumida', accessor: (row: any) => row.quantity_consumed ?? '' },
        { header: 'Lote', accessor: (row: any) => row.lot_number ?? '' },
        { header: 'Data de conclusao', accessor: (row: any) => row.completion_date ?? '' },
        { header: 'Data do consumo', accessor: (row: any) => row.consumed_at ?? '' },
        { header: 'Status', accessor: (row: any) => row.status ?? '' },
        { header: 'Roteiro OP', accessor: (row: any) => row.production_route_id ?? '' },
        { header: 'Usuario', accessor: (row: any) => row.user_id ?? '' },
      ]);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="bloco-k-preview.csv"');
      res.send(`\ufeff${csv}`);
      return;
    }

    res.json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};

exports.flattenBlocoKRows = flattenBlocoKRows;
