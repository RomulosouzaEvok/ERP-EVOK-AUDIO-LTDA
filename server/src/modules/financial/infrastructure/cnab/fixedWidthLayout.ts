/**
 * Motor genérico de layout de largura fixa (`build`/`parse` simétricos a
 * partir de uma ÚNICA lista de campos) usado por todos os registros do
 * CNAB 240 (`../cnab/layouts240.ts`).
 *
 * DECISÃO ARQUITETURAL: em vez de escrever `slice(inicio, fim)` manualmente
 * para cada campo (alto risco de erro de aritmética de posição — um erro de
 * 1 caractere em um campo desalinha TODOS os campos seguintes do registro),
 * cada layout é uma lista ordenada de `{ name, length, type }` e o motor
 * calcula os offsets automaticamente, tanto para montar (concatenar campos
 * padded) quanto para ler (fatiar por offset acumulado) — os dois sempre
 * usam exatamente a mesma fonte de verdade. `defineLayout` também valida em
 * tempo de carregamento do módulo que a soma das larguras é exatamente 240
 * (erra cedo/alto — falha ao importar o módulo, não em produção lendo um
 * arquivo real).
 *
 * @module modules/financial/infrastructure/cnab/fixedWidthLayout
 */

const { BusinessRuleError } = require('../../../../errors');
const { CNAB240_RECORD_LENGTH, padNumeric, padAlpha } = require('./cnabFieldUtils');

/** Um campo de um registro CNAB de largura fixa. */
export interface CnabField {
  /** Nome do campo, usado como chave em `build()`/valor de retorno de `parse()`. */
  name: string;
  /** Largura (nº de posições/caracteres) do campo dentro do registro. */
  length: number;
  /** `'N'` = numérico (zero-padded à esquerda), `'X'` = alfanumérico (space-padded à direita). */
  type: 'N' | 'X';
}

/** Layout de um tipo de registro CNAB (header de arquivo, segmento P, etc.). */
export interface CnabLayout {
  /** Nome do layout (para mensagens de erro). */
  readonly name: string;
  /** Campos na ordem em que aparecem no registro. */
  readonly fields: CnabField[];
  /** Sempre `240` (constante do CNAB 240) — validado no momento da definição. */
  readonly totalLength: number;
  /**
   * Monta a linha de 240 posições a partir dos valores informados.
   * Campos ausentes em `values` são preenchidos como vazio/zero.
   */
  build(values: Record<string, string | number | null | undefined>): string;
  /**
   * Lê uma linha de 240 posições e devolve um objeto `{ [campo]: valor }`
   * (valores já com `trim()` — o chamador decide se interpreta como texto,
   * data (`parseCnabDate`) ou valor monetário (`fromCentavos`)).
   */
  parse(line: string): Record<string, string>;
}

/**
 * Define um layout de registro CNAB 240 a partir da lista ordenada de
 * campos, com `build`/`parse` derivados automaticamente dos offsets.
 *
 * @param name - Nome do layout (aparece em mensagens de erro).
 * @param fields - Campos, na ordem exata em que aparecem no registro (posição 1 em diante).
 * @returns Layout pronto para uso.
 * @throws {Error} Se a soma das larguras dos campos não for exatamente 240 (erro de programação — falha ao carregar o módulo, nunca em runtime de produção).
 */
export function defineLayout(name: string, fields: CnabField[]): CnabLayout {
  const totalLength = fields.reduce((sum, field) => sum + field.length, 0);
  if (totalLength !== CNAB240_RECORD_LENGTH) {
    throw new Error(
      `Layout CNAB "${name}" soma ${totalLength} posições, esperado exatamente ${CNAB240_RECORD_LENGTH}. `
      + 'Corrija a largura dos campos antes de usar este layout (erro de programação).',
    );
  }

  return {
    name,
    fields,
    totalLength,
    build(values) {
      return fields
        .map((field) => {
          const raw = values[field.name];
          return field.type === 'N' ? padNumeric(raw, field.length) : padAlpha(raw, field.length);
        })
        .join('');
    },
    parse(line) {
      if (!line || line.length < totalLength) {
        throw new BusinessRuleError(
          `Registro CNAB inválido: linha com ${line ? line.length : 0} posições, esperado ${totalLength} `
          + `(layout "${name}"). Confirme que o arquivo não foi truncado/corrompido.`,
        );
      }
      const result: Record<string, string> = {};
      let cursor = 0;
      for (const field of fields) {
        result[field.name] = line.slice(cursor, cursor + field.length).trim();
        cursor += field.length;
      }
      return result;
    },
  };
}
