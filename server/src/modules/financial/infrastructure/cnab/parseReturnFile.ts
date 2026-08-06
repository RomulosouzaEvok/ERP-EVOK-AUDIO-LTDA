/**
 * Faz o parse de um arquivo de RETORNO CNAB 240 (cobrança registrada,
 * layout simplificado FEBRABAN v1 — ver decisão em `./layouts240.ts`),
 * extraindo uma ocorrência por par de registros Segmento T + Segmento U
 * (dados do título + valores da liquidação).
 *
 * @module modules/financial/infrastructure/cnab/parseReturnFile
 */

const { BusinessRuleError } = require('../../../../errors');
const {
  segmentoTLayout, segmentoULayout, MOVEMENT_CODE_DESCRIPTIONS,
} = require('./layouts240');
const { parseCnabDate, fromCentavos } = require('./cnabFieldUtils');

/** Uma ocorrência (par Segmento T + Segmento U) extraída do retorno. */
export interface ParsedReturnOccurrence {
  /** Nosso número do título (usado para casar com `CnabRemittanceItem.nosso_numero`). */
  nossoNumero: string;
  /** Código de movimento/ocorrência (ex.: `'06'` = liquidação normal). */
  movementCode: string;
  /** Descrição amigável do código (ver `MOVEMENT_CODE_DESCRIPTIONS`), ou `null` se desconhecido. */
  movementDescription: string | null;
  /** Identificação do título na empresa (Segmento T, `document_number`). */
  documentNumber: string;
  /** Data de vencimento (`YYYY-MM-DD`), ou `null`. */
  dueDate: string | null;
  /** Valor nominal do título (Segmento T). */
  nominalValue: number;
  /** Valor efetivamente pago pelo sacado (Segmento U), ou `0` se não aplicável ao código de movimento. */
  amountPaid: number;
  /** Valor líquido creditado (Segmento U, já descontadas tarifas), ou `0`. */
  netValue: number;
  /** Data da ocorrência no sacado (`YYYY-MM-DD`, Segmento U), ou `null`. */
  occurrenceDate: string | null;
}

export interface ParsedReturnFile {
  bankCode: string | null;
  generatedAt: string | null;
  occurrences: ParsedReturnOccurrence[];
}

/**
 * Faz o parse de um arquivo `.RET` (texto, `\r\n` ou `\n`), pareando cada
 * Segmento T com o Segmento U imediatamente seguinte (mesma ordem que o
 * banco grava, conforme o layout FEBRABAN).
 *
 * @param buffer - Conteúdo bruto do arquivo enviado.
 * @returns Ocorrências extraídas, prontas para `ProcessReturnFileUseCase` aplicar.
 * @throws {BusinessRuleError} Se o arquivo estiver vazio, sem Header de Arquivo (registro `0`), ou sem nenhum par Segmento T/U válido.
 */
export function parseReturnFile(buffer: Buffer): ParsedReturnFile {
  if (!buffer || buffer.length === 0) {
    throw new BusinessRuleError('Arquivo de retorno CNAB vazio.');
  }

  const text = buffer.toString('latin1');
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new BusinessRuleError('Arquivo de retorno CNAB vazio.');
  }

  const headerLine = lines.find((line) => line.length >= 8 && line[7] === '0');
  if (!headerLine) {
    throw new BusinessRuleError(
      'Arquivo inválido: nenhum registro Header de Arquivo (tipo "0") foi encontrado. '
      + 'Confirme que o arquivo enviado é um retorno CNAB 240 de cobrança.',
    );
  }

  const bankCode = headerLine.slice(0, 3).trim() || null;
  const generationDateRaw = headerLine.length >= 151 ? headerLine.slice(143, 151) : '';
  const generatedAt = parseCnabDate(generationDateRaw);

  const occurrences: ParsedReturnOccurrence[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Posição 14 (índice 13) identifica o segmento em registros tipo 3 (detalhe).
    const isDetail = line.length >= 14 && line[7] === '3';
    if (!isDetail) continue;

    const segmentCode = line[13];
    if (segmentCode !== 'T') continue;

    const nextLine = lines[i + 1];
    const nextIsSegmentU = nextLine && nextLine.length >= 14 && nextLine[7] === '3' && nextLine[13] === 'U';
    if (!nextIsSegmentU) {
      // Segmento T sem o U correspondente logo em seguida — registro
      // incompleto/fora de ordem; ignora esta ocorrência em vez de derrubar
      // o arquivo inteiro (mesma filosofia defensiva de `parseOfx`).
      continue;
    }

    const t = segmentoTLayout.parse(line);
    const u = segmentoULayout.parse(nextLine);
    i += 1; // consome também a linha do Segmento U

    const movementCode = t.movement_code;
    occurrences.push({
      nossoNumero: t.nosso_numero,
      movementCode,
      movementDescription: MOVEMENT_CODE_DESCRIPTIONS[movementCode] || null,
      documentNumber: t.document_number,
      dueDate: parseCnabDate(t.due_date),
      nominalValue: fromCentavos(t.nominal_value),
      amountPaid: fromCentavos(u.amount_paid),
      netValue: fromCentavos(u.net_value),
      occurrenceDate: parseCnabDate(u.occurrence_date),
    });
  }

  if (occurrences.length === 0) {
    throw new BusinessRuleError(
      'Nenhuma ocorrência (par Segmento T/U) foi encontrada no arquivo de retorno enviado.',
    );
  }

  return { bankCode, generatedAt, occurrences };
}
