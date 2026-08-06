/**
 * Utilitários de baixo nível para montar/ler registros de largura fixa do
 * CNAB 240 (FEBRABAN) — usados por {@link defineLayout} e pelos builders/
 * parsers de remessa/retorno do módulo CNAB (`../cnab`).
 *
 * @module modules/financial/infrastructure/cnab/cnabFieldUtils
 */

/** Todo registro (linha) de um arquivo CNAB 240 tem exatamente 240 posições. */
export const CNAB240_RECORD_LENGTH = 240;

/**
 * Remove tudo que não é dígito de `value`.
 *
 * @param value - Valor bruto (string, number ou `null`/`undefined`).
 * @returns Apenas os dígitos de `value`, ou `''` se `value` for `null`/`undefined`.
 */
export function onlyDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Preenche `value` à esquerda com `'0'` até `length` posições (campo tipo
 * `N` — numérico — do CNAB). Caracteres não numéricos são descartados antes
 * do preenchimento. Se `value` já tiver mais dígitos que `length`, mantém
 * apenas os `length` dígitos MENOS significativos (mais à direita) — nunca
 * deveria acontecer com os campos usados em v1 (validado antes pelos use
 * cases), mas evita estourar a largura fixa do registro.
 *
 * @param value - Valor a preencher (string ou number).
 * @param length - Largura final do campo.
 * @returns String numérica com exatamente `length` caracteres.
 */
export function padNumeric(value: string | number | null | undefined, length: number): string {
  const digits = onlyDigits(value);
  const truncated = digits.length > length ? digits.slice(digits.length - length) : digits;
  return truncated.padStart(length, '0');
}

/**
 * Preenche `value` à direita com espaço até `length` posições (campo tipo
 * `X` — alfanumérico — do CNAB). Acentos são removidos (normalização NFD +
 * remoção de diacríticos) porque o charset tradicionalmente aceito pelos
 * bancos para estes campos é ASCII; o valor é colocado em maiúsculas e
 * truncado se exceder `length`.
 *
 * @param value - Valor a preencher.
 * @param length - Largura final do campo.
 * @returns String alfanumérica com exatamente `length` caracteres.
 */
export function padAlpha(value: string | number | null | undefined, length: number): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const withoutAccents = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ascii = withoutAccents.replace(/[^\x20-\x7E]/g, '').toUpperCase();
  return ascii.slice(0, length).padEnd(length, ' ');
}

/**
 * Formata uma data (`Date` ou string `YYYY-MM-DD`) no formato `DDMMAAAA`
 * (8 posições) exigido pelos campos de data do CNAB. Datas ausentes viram
 * `'00000000'` (convenção CNAB para "sem data").
 *
 * @param value - Data de origem.
 * @returns String de 8 dígitos `DDMMAAAA`, ou `'00000000'`.
 */
export function formatCnabDate(value: string | Date | null | undefined): string {
  if (!value) return '00000000';
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  if (Number.isNaN(date.getTime())) return '00000000';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}${month}${year}`;
}

/**
 * Converte uma data CNAB `DDMMAAAA` para `YYYY-MM-DD`.
 *
 * @param value - String de 8 dígitos `DDMMAAAA` extraída de um registro.
 * @returns Data no formato `YYYY-MM-DD`, ou `null` se `value` for `'00000000'`/inválida.
 */
export function parseCnabDate(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 8 || digits === '00000000') return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Converte um valor monetário decimal (`number` ou string, ex.: `1500.5`)
 * para centavos inteiros (ex.: `150050`), usando `Math.round` para evitar
 * erro de ponto flutuante — NUNCA usar `parseInt(value * 100)` diretamente
 * (ex.: `19.99 * 100` pode dar `1998.9999999999998` em JS).
 *
 * @param value - Valor decimal (unidade principal, ex.: reais).
 * @returns Centavos inteiros (>= 0), como `number`.
 */
export function toCentavos(value: string | number): number {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.abs(numeric) * 100);
}

/**
 * Converte centavos inteiros (ex.: `150050`, extraído de um campo `N15` do
 * CNAB) de volta para o valor decimal na unidade principal (ex.: `1500.5`).
 *
 * @param centavos - Centavos inteiros (string com apenas dígitos ou number).
 * @returns Valor decimal (reais) como `number`.
 */
export function fromCentavos(centavos: string | number): number {
  const numeric = typeof centavos === 'string' ? Number(onlyDigits(centavos) || '0') : centavos;
  return Math.round(numeric) / 100;
}
