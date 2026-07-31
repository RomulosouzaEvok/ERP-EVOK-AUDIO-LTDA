/**
 * Exportador PDF genérico para relatórios, usando `pdfkit`.
 *
 * @module modules/reports/infrastructure/export/pdfExporter
 */

import PDFDocument from 'pdfkit';
import type { CsvColumn } from './csvExporter';

/**
 * Gera um PDF simples com título, data de geração, um bloco de resumo
 * (chave/valor) e uma tabela com as colunas fornecidas, para as linhas de
 * detalhe do relatório.
 *
 * @param title - Título do relatório (ex.: "Relatório de Vendas").
 * @param summary - Pares chave/valor exibidos no topo do PDF.
 * @param rows - Linhas de detalhe (mesmas usadas no CSV).
 * @param columns - Definição de colunas da tabela de detalhe.
 * @returns Promise resolvida com o buffer do PDF gerado.
 */
export function toPdf<T>(
  title: string,
  summary: Record<string, string | number>,
  rows: T[],
  columns: CsvColumn<T>[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'left' });
    doc.fontSize(9).fillColor('#666').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveDown(1);

    doc.fontSize(11).fillColor('#000');
    for (const [label, value] of Object.entries(summary)) {
      doc.text(`${label}: ${value}`);
    }
    doc.moveDown(1);

    if (rows.length > 0) {
      const columnWidth = (doc.page.width - 80) / columns.length;
      const startX = doc.x;
      let y = doc.y;

      doc.fontSize(9).fillColor('#fff');
      doc.rect(startX, y, columnWidth * columns.length, 18).fill('#333');
      doc.fillColor('#fff');
      columns.forEach((column, index) => {
        doc.text(column.header, startX + index * columnWidth + 4, y + 4, { width: columnWidth - 8 });
      });
      y += 18;

      doc.fillColor('#000');
      rows.forEach((row, rowIndex) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = doc.y;
        }
        if (rowIndex % 2 === 1) {
          doc.rect(startX, y, columnWidth * columns.length, 16).fill('#f2f2f2');
          doc.fillColor('#000');
        }
        columns.forEach((column, index) => {
          const value = column.accessor(row);
          doc.text(value === null || value === undefined ? '' : String(value), startX + index * columnWidth + 4, y + 3, {
            width: columnWidth - 8,
          });
        });
        y += 16;
      });
    } else {
      doc.text('Nenhum registro encontrado para os filtros aplicados.');
    }

    doc.end();
  });
}
