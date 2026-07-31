/**
 * Exportador CSV genérico para relatórios.
 *
 * @module modules/reports/infrastructure/export/csvExporter
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Escapa um valor para uso seguro em uma célula CSV (RFC 4180): envolve em
 * aspas duplas se contiver vírgula, aspas ou quebra de linha, duplicando
 * aspas internas.
 *
 * @param value - Valor bruto da célula.
 * @returns Valor pronto para escrita no CSV.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Neutraliza injecao de formula (CSV/Excel/Sheets interpretam celulas que
  // comecam com =, +, -, @, tab ou CR como formula/comando ao abrir o arquivo).
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Converte uma lista de linhas em um CSV com cabeçalho, usando as colunas
 * fornecidas (cada relatório define suas próprias colunas relevantes, em
 * vez de despejar todos os campos brutos do model).
 *
 * @param rows - Linhas de dados (já serializadas, ex. `toJSON()` do Sequelize).
 * @param columns - Definição de colunas (cabeçalho + acessor do valor).
 * @returns Conteúdo CSV completo (cabeçalho + linhas), separado por `\r\n`.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(column.accessor(row))).join(','));
  return [header, ...lines].join('\r\n');
}
