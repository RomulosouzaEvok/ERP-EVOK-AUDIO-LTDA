/**
 * Parser tolerante do **AEJ** (Arquivo Eletrônico de Jornada, Portaria MTP
 * 671/2021, Anexo IX) exportado pelo software da administradora dos REPs
 * (RWTech/Pointline) — ver decisão do dono e desenho em
 * `docs/rh/04-FREQUENCIA.md`.
 *
 * ## DECISÃO DE FORMATO (⚠️ pendente de validação contra um arquivo real)
 *
 * A Portaria 671/2021 não fixa publicamente um layout binário/fixed-width
 * único para o AEJ — cada software de tratamento de jornada homologado
 * exporta um arquivo textual próprio, desde que contenha os dados exigidos
 * pelo Anexo IX (identificação do trabalhador, jornada tratada por dia,
 * horas extras, faltas, abonos). Sem uma amostra real do arquivo que a
 * administradora da Evok Áudio gera, este parser adota um **layout
 * textual delimitado por ponto-e-vírgula, um registro por linha**, com o
 * primeiro campo identificando o tipo de registro — escolha pragmática e
 * documentada (não um byte-offset "oficial" inventado):
 *
 * - Tipo `1` — cabeçalho do lote (CNPJ, competência). Informativo, não
 *   gera item.
 * - Tipo `2` — jornada diária de um trabalhador (o único tipo que vira
 *   `hr_time_import_items`):
 *   `2;CPF;MATRICULA;DATA(YYYY-MM-DD);HORAS_TRABALHADAS;HE_50;HE_100;HORAS_NOTURNAS;FALTA(S/N);ABONO`
 *   — os 4 campos de horas aceitam `HH:MM` ou decimal (`7.5`); `FALTA` é
 *   `S`/`N` (ou `1`/`0`); `ABONO` é texto livre (vazio = sem abono).
 * - Tipo `9` — rodapé/trailer (contagem de registros). Informativo.
 * - Qualquer outro valor no primeiro campo é um **tipo de registro
 *   desconhecido**: a linha é ignorada e contada em `unknownRecordTypes`,
 *   sem derrubar a importação.
 *
 * Uma linha tipo `2` malformada (campos faltando, data ou hora
 * inválida) vira uma entrada em `rejectedLines` com o motivo — também sem
 * derrubar o lote inteiro (RF exigido pela tarefa: tolerância a erro
 * pontual).
 *
 * **Quando um arquivo AEJ real da administradora estiver disponível**,
 * ajustar `parseLine`/`RECORD_TYPE_*` para o layout observado e atualizar
 * este comentário — ver limitação equivalente registrada em
 * `docs/rh/04-FREQUENCIA.md`.
 *
 * @module modules/rh/domain/services/aejParser
 */

/** Um registro de jornada diária (tipo `2`) já normalizado. */
export interface ParsedAejWorkdayRecord {
  cpf: string | null;
  registration: string | null;
  workDate: string;
  hoursWorked: number;
  overtime50: number;
  overtime100: number;
  nightHours: number;
  absence: boolean;
  absenceJustified: boolean;
  absenceReason: string | null;
}

/** Uma linha rejeitada (tipo `2` malformado) com o motivo. */
export interface RejectedAejLine {
  line: number;
  raw: string;
  reason: string;
}

/** Resultado completo do parse de um arquivo AEJ. */
export interface ParsedAejFile {
  records: ParsedAejWorkdayRecord[];
  rejectedLines: RejectedAejLine[];
  /** Contagem de linhas por tipo de registro não reconhecido (nem `1`, `2` ou `9`). */
  unknownRecordTypes: Record<string, number>;
  totalLines: number;
}

const CPF_DIGITS_ONLY = /\D/g;

/** Remove tudo que não é dígito — usado para normalizar CPF antes de comparar/persistir. */
function normalizeCpf(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(CPF_DIGITS_ONLY, '');
  return digits.length > 0 ? digits : null;
}

/** `YYYY-MM-DD` (única forma de data aceita — sem adivinhar `DD/MM/YYYY` vs `MM/DD/YYYY`). */
function parseWorkDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return trimmed;
}

/**
 * Converte um campo de horas em `HH:MM` ou decimal (`7.5`, `7,5`) para
 * horas decimais com 2 casas. Campo vazio é tratado como `0`.
 *
 * @param raw - Valor bruto do campo.
 * @returns Horas decimais, ou `null` se o campo não é vazio nem um formato reconhecido.
 */
function parseHours(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return 0;

  const hhmmMatch = trimmed.match(/^(\d{1,3}):([0-5]\d)$/);
  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1]);
    const minutes = Number(hhmmMatch[2]);
    return Math.round((hours + minutes / 60) * 100) / 100;
  }

  const normalized = trimmed.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

/** `S`/`N`/`1`/`0` (case-insensitive) → booleano. Vazio = `false`. */
function parseFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw.trim() === '') return false;
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'S' || normalized === '1' || normalized === 'SIM') return true;
  if (normalized === 'N' || normalized === '0' || normalized === 'NAO' || normalized === 'NÃO') return false;
  return null;
}

const RECORD_TYPE_HEADER = '1';
const RECORD_TYPE_WORKDAY = '2';
const RECORD_TYPE_TRAILER = '9';

/**
 * Faz o parse de um registro tipo `2` (jornada diária) já dividido em campos.
 *
 * @param fields - Campos da linha (incluindo o tipo de registro em `fields[0]`).
 * @returns O registro normalizado, ou uma `string` com o motivo de rejeição.
 */
function parseWorkdayFields(fields: string[]): ParsedAejWorkdayRecord | string {
  if (fields.length < 10) {
    return `Registro tipo 2 esperava 10 campos (tipo;cpf;matricula;data;horas;he50;he100;noturno;falta;abono), recebeu ${fields.length}.`;
  }

  const [, cpfRaw, registrationRaw, dateRaw, hoursRaw, he50Raw, he100Raw, nightRaw, absenceRaw, absenceReasonRaw] = fields;

  const workDate = parseWorkDate(dateRaw);
  if (!workDate) return `Data inválida: "${dateRaw}" (esperado YYYY-MM-DD).`;

  const hoursWorked = parseHours(hoursRaw);
  if (hoursWorked === null) return `Horas trabalhadas inválidas: "${hoursRaw}".`;

  const overtime50 = parseHours(he50Raw);
  if (overtime50 === null) return `Hora extra 50% inválida: "${he50Raw}".`;

  const overtime100 = parseHours(he100Raw);
  if (overtime100 === null) return `Hora extra 100% inválida: "${he100Raw}".`;

  const nightHours = parseHours(nightRaw);
  if (nightHours === null) return `Horas noturnas inválidas: "${nightRaw}".`;

  const absence = parseFlag(absenceRaw);
  if (absence === null) return `Indicador de falta inválido: "${absenceRaw}" (esperado S/N).`;

  const absenceReason = absenceReasonRaw && absenceReasonRaw.trim() !== '' ? absenceReasonRaw.trim() : null;

  return {
    cpf: normalizeCpf(cpfRaw),
    registration: registrationRaw && registrationRaw.trim() !== '' ? registrationRaw.trim() : null,
    workDate,
    hoursWorked,
    overtime50,
    overtime100,
    nightHours,
    absence,
    absenceJustified: absenceReason !== null,
    absenceReason,
  };
}

/**
 * Faz o parse de um arquivo AEJ completo (buffer de texto), linha a linha.
 * Tolerante por design: tipo de registro desconhecido é ignorado e
 * contado; linha tipo `2` malformada vira item rejeitado com motivo, sem
 * abortar a importação do restante do arquivo.
 *
 * @param buffer - Conteúdo bruto do arquivo enviado (upload multipart, memoryStorage).
 * @returns Registros de jornada válidos + linhas rejeitadas + contagem de tipos desconhecidos.
 */
export function parseAej(buffer: Buffer): ParsedAejFile {
  const text = buffer.toString('utf8');
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');

  const records: ParsedAejWorkdayRecord[] = [];
  const rejectedLines: RejectedAejLine[] = [];
  const unknownRecordTypes: Record<string, number> = {};

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const fields = rawLine.split(';').map((field) => field.trim());
    const recordType = fields[0];

    if (recordType === RECORD_TYPE_HEADER || recordType === RECORD_TYPE_TRAILER) {
      return; // Informativo — não vira item nem erro.
    }

    if (recordType === RECORD_TYPE_WORKDAY) {
      const parsed = parseWorkdayFields(fields);
      if (typeof parsed === 'string') {
        rejectedLines.push({ line: lineNumber, raw: rawLine, reason: parsed });
      } else {
        records.push(parsed);
      }
      return;
    }

    const key = recordType || '(vazio)';
    unknownRecordTypes[key] = (unknownRecordTypes[key] ?? 0) + 1;
  });

  return { records, rejectedLines, unknownRecordTypes, totalLines: lines.length };
}
