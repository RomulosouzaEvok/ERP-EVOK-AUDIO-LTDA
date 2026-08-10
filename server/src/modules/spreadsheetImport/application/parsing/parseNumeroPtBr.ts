/**
 * Conversão de número escrito à mão em planilha brasileira.
 *
 * O ponto delicado é a ambiguidade real de `1.500`: em pt-BR significa mil e
 * quinhentos; em en-US, um e meio. Num ERP industrial isso é a diferença
 * entre 1,5 kg e 1.500 kg de peso, ou entre R$ 1,50 e R$ 1.500 de custo — um
 * erro de mil vezes que passaria calado. Por isso este parser **recusa** o
 * caso ambíguo em vez de escolher por conta própria.
 *
 * @module modules/spreadsheetImport/application/parsing/parseNumeroPtBr
 */

/** Resultado da conversão: valor, ausência de valor, ou recusa com motivo. */
export type ResultadoNumero =
  | { ok: true; valor: number | undefined }
  | { ok: false; motivo: string };

/** Padrão de valor ambíguo: um único ponto separando 1-3 dígitos de exatamente 3. */
const AMBIGUO = /^\d{1,3}\.\d{3}$/;

/**
 * Converte o conteúdo de uma célula numérica.
 *
 * Regras, nesta ordem:
 * - célula vazia → `undefined` (o chamador decide se usa o default do banco);
 * - tem `.` e `,` → o **último** dos dois é o separador decimal;
 * - só `,` → separador decimal (`12,5` = 12.5);
 * - `1.234.567` (mais de um ponto) → pontos são separador de milhar;
 * - `1.500` (um ponto, exatamente 3 dígitos depois) → **recusado por ambiguidade**;
 * - só `.` nos demais casos → separador decimal (`12.5` = 12.5).
 *
 * @param bruto - Conteúdo da célula.
 * @returns Valor convertido, `undefined` para célula vazia, ou recusa explicada.
 */
export function parseNumeroPtBr(bruto: string | undefined | null): ResultadoNumero {
  if (bruto === undefined || bruto === null) return { ok: true, valor: undefined };

  const texto = String(bruto).trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (texto === '') return { ok: true, valor: undefined };

  const negativo = texto.startsWith('-');
  const semSinal = texto.replace(/^[+-]/, '');

  if (!/^[\d.,]+$/.test(semSinal)) {
    return { ok: false, motivo: `"${bruto}" não é um número. Use apenas dígitos, vírgula decimal e, se quiser, ponto de milhar.` };
  }

  const temPonto = semSinal.includes('.');
  const temVirgula = semSinal.includes(',');
  let normalizado: string;

  if (temPonto && temVirgula) {
    const decimal = semSinal.lastIndexOf(',') > semSinal.lastIndexOf('.') ? ',' : '.';
    const milhar = decimal === ',' ? '.' : ',';
    normalizado = semSinal.split(milhar).join('').replace(decimal, '.');
  } else if (temVirgula) {
    if ((semSinal.match(/,/g) ?? []).length > 1) {
      return { ok: false, motivo: `"${bruto}" tem mais de uma vírgula decimal.` };
    }
    normalizado = semSinal.replace(',', '.');
  } else if (temPonto) {
    const pontos = (semSinal.match(/\./g) ?? []).length;
    if (pontos > 1) {
      normalizado = semSinal.split('.').join('');
    } else if (AMBIGUO.test(semSinal)) {
      return {
        ok: false,
        motivo:
          `"${bruto}" é ambíguo: pode ser ${semSinal.replace('.', '')} (ponto de milhar) `
          + `ou ${semSinal.replace('.', ',')} (ponto decimal). `
          + 'Escreva com vírgula para decimal (ex.: 1,5) ou sem separador de milhar (ex.: 1500).',
      };
    } else {
      normalizado = semSinal;
    }
  } else {
    normalizado = semSinal;
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) {
    return { ok: false, motivo: `"${bruto}" não é um número válido.` };
  }

  return { ok: true, valor: negativo ? -valor : valor };
}

/** Valores aceitos como "sim" em colunas de sim/não. */
const AFIRMATIVOS = new Set(['SIM', 'S', 'X', 'TRUE', 'VERDADEIRO', '1', 'Y', 'YES']);
/** Valores aceitos como "não" em colunas de sim/não. */
const NEGATIVOS = new Set(['NAO', 'N', 'FALSE', 'FALSO', '0', 'NO', '']);

/**
 * Converte uma célula de sim/não.
 *
 * @param bruto - Conteúdo da célula.
 * @returns `true`/`false`/`undefined` (vazio), ou recusa explicada.
 */
export function parseSimNao(bruto: string | undefined | null): { ok: true; valor: boolean | undefined } | { ok: false; motivo: string } {
  const texto = String(bruto ?? '')
    .normalize('NFD')
    .replace(new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g'), '')
    .trim()
    .toUpperCase();

  if (texto === '') return { ok: true, valor: undefined };
  if (AFIRMATIVOS.has(texto)) return { ok: true, valor: true };
  if (NEGATIVOS.has(texto)) return { ok: true, valor: false };

  return { ok: false, motivo: `"${bruto}" não é sim nem não. Escreva "sim" ou deixe em branco.` };
}
