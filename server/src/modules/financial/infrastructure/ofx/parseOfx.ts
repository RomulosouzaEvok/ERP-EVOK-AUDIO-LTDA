/**
 * Parser manual de arquivos OFX (Open Financial Exchange) dos bancos
 * brasileiros mais comuns — Conciliação Bancária v1.
 *
 * DECISÃO ARQUITETURAL (lib vs parser manual): optou-se por um parser
 * manual baseado em regex em vez de adicionar uma dependência npm de
 * terceiros. Motivos:
 *
 * 1. OFX 1.x (o formato usado por praticamente todo banco brasileiro) é
 *    SGML "tag soup" — elementos folha (`<DTPOSTED>`, `<TRNAMT>`, etc.) não
 *    têm tag de fechamento. As libs OFX mantidas no npm são poucas, a
 *    maioria não é atualizada há anos e não trata bem variações regionais
 *    (encoding CP1252, `TRNAMT` com vírgula decimal). O ganho de robustez
 *    de uma lib genérica não compensa o risco de dependência não mantida.
 * 2. O subconjunto realmente necessário para conciliação (bloco
 *    `<STMTTRN>…</STMTTRN>` com `DTPOSTED`, `TRNAMT`, `FITID`,
 *    `MEMO`/`NAME`) é pequeno e estável — um extrator de "tag folha" por
 *    regex (`<TAG>valor` até a próxima `<`) cobre OFX 1.x (SGML, tags sem
 *    fechamento) E OFX 2.x (XML, com fechamento) com o MESMO código, já
 *    que a regex simplesmente para no próximo `<` de qualquer forma.
 * 3. Sem dependência nova = sem superfície adicional de CVE/manutenção em
 *    um parser de arquivo enviado por upload (área sensível).
 *
 * Reavaliar esta decisão se surgir a necessidade de suportar campos OFX
 * muito mais amplos (ex.: extrato de cartão de crédito, `<CCSTMTRS>`) ou
 * validação de assinatura/dígito verificador do arquivo.
 *
 * @module modules/financial/infrastructure/ofx/parseOfx
 */

const { BusinessRuleError } = require('../../../../errors');

/** Um lançamento (`<STMTTRN>`) extraído do OFX. */
export interface ParsedOfxTransaction {
  /** Identificador do banco para o lançamento (FITID), ou id sintético determinístico quando ausente no arquivo. */
  fitid: string;
  /** Data do lançamento no formato `YYYY-MM-DD` (DTPOSTED). */
  date: string;
  /** Valor assinado (negativo = saída/débito, positivo = entrada/crédito). */
  amount: number;
  /** MEMO/NAME do lançamento, ou `null` se ambos ausentes. */
  description: string | null;
}

/** Resultado completo do parse de um arquivo OFX. */
export interface ParsedOfxStatement {
  /** Nome do banco, deduzido do `BANKID` quando reconhecido (ver {@link BANK_NAMES_BY_ID}), ou `null`. */
  bankName: string | null;
  /** `ACCTID` do OFX, ou `null`. */
  accountNumber: string | null;
  /** `DTSTART` no formato `YYYY-MM-DD`, ou `null`. */
  periodStart: string | null;
  /** `DTEND` no formato `YYYY-MM-DD`, ou `null`. */
  periodEnd: string | null;
  /** Lançamentos extraídos de cada `<STMTTRN>`. */
  transactions: ParsedOfxTransaction[];
}

/** Mapeamento de códigos `BANKID` (código COMPE) para nomes de bancos brasileiros comuns — apenas informativo. */
const BANK_NAMES_BY_ID: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '077': 'Banco Inter',
  '104': 'Caixa Econômica Federal',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '290': 'PagSeguro',
  '336': 'C6 Bank',
  '341': 'Itaú Unibanco',
  '389': 'Banco Mercantil do Brasil',
  '422': 'Banco Safra',
  '655': 'Banco Votorantim (BV)',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

/**
 * Extrai o valor de uma tag "folha" (`<TAG>valor` — funciona tanto para
 * SGML sem fechamento quanto para XML com fechamento, pois a regex sempre
 * para no próximo `<`).
 *
 * @param block - Trecho de texto OFX onde procurar.
 * @param tagName - Nome da tag (sem `<`/`>`).
 * @returns Valor com `trim()`, ou `undefined` se a tag não existir no bloco.
 */
function extractTag(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<${tagName}>([^<\r\n]*)`, 'i'));
  return match ? match[1].trim() : undefined;
}

/**
 * Converte uma data OFX (`DTPOSTED`/`DTSTART`/`DTEND`, formato
 * `YYYYMMDD[HHMMSS][.mmm][[tz]]`) para `YYYY-MM-DD`.
 *
 * @param raw - Valor bruto da tag de data.
 * @returns Data no formato `YYYY-MM-DD`, ou `null` se `raw` não tiver ao menos 8 dígitos.
 */
function parseOfxDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Converte `TRNAMT` para `number`. Trata o caso (raro, mas visto em
 * exports de alguns bancos brasileiros) de vírgula como separador decimal
 * em vez do ponto exigido pela especificação OFX.
 *
 * @param raw - Valor bruto da tag `TRNAMT`.
 * @returns Valor numérico assinado, ou `null` se `raw` não for um número válido.
 */
function parseOfxAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  let normalized = raw.trim();
  if (/,\d{1,2}$/.test(normalized) && !normalized.includes('.')) {
    // "1234,56" (vírgula decimal, sem separador de milhar) → "1234.56".
    normalized = normalized.replace(',', '.');
  } else {
    // "1.234,56" (separador de milhar com ponto) → remove pontos, troca vírgula por ponto.
    normalized = normalized.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Deduz o encoding do buffer OFX a partir do cabeçalho SGML
 * (`ENCODING:`/`CHARSET:`) ou do atributo XML `encoding="..."`.
 *
 * OFX 1.x brasileiro tipicamente declara `CHARSET:1252` (Windows-1252) ou
 * `CHARSET:8859-1` (ISO-8859-1) — ambos aproximados aqui por `latin1`
 * (mapeamento byte-a-byte nativo do Node), suficiente para acentuação
 * portuguesa em `MEMO`/`NAME` sem precisar de uma lib de encoding.
 *
 * @param buffer - Conteúdo bruto do arquivo enviado.
 * @returns Encoding do Node.js Buffer a usar na decodificação (`'utf8'` ou `'latin1'`).
 */
function detectEncoding(buffer: Buffer): BufferEncoding {
  const headerSample = buffer.subarray(0, 512).toString('ascii');
  if (/<\?xml/i.test(headerSample)) {
    const xmlEncodingMatch = headerSample.match(/encoding=["']([^"']+)["']/i);
    const xmlEncoding = xmlEncodingMatch?.[1]?.toLowerCase();
    if (xmlEncoding && /1252|8859|latin/i.test(xmlEncoding)) return 'latin1';
    return 'utf8';
  }
  const charsetMatch = headerSample.match(/CHARSET:\s*([A-Z0-9-]+)/i);
  const encodingMatch = headerSample.match(/ENCODING:\s*([A-Z0-9-]+)/i);
  const charset = charsetMatch?.[1]?.toUpperCase();
  const encoding = encodingMatch?.[1]?.toUpperCase();
  if (encoding === 'UTF-8' && !charset) return 'utf8';
  // Default: OFX 1.x brasileiro overwhelmingly declara 1252/8859-1, ou nem
  // declara nada corretamente — latin1 é a aproximação mais segura.
  return 'latin1';
}

/**
 * Faz o parse de um arquivo OFX (1.x SGML ou 2.x XML) de banco brasileiro,
 * extraindo os lançamentos (`<STMTTRN>`) e os metadados de cabeçalho do
 * extrato.
 *
 * @param buffer - Conteúdo bruto do arquivo `.ofx` enviado (upload multipart, memoryStorage).
 * @returns Extrato normalizado, pronto para persistir em `BankStatement`/`BankStatementEntry`.
 * @throws {BusinessRuleError} 422 didático se o arquivo não contiver a tag raiz `<OFX>` (arquivo não é um OFX válido).
 */
export function parseOfx(buffer: Buffer): ParsedOfxStatement {
  if (!buffer || buffer.length === 0) {
    throw new BusinessRuleError('Arquivo OFX vazio.');
  }

  const encoding = detectEncoding(buffer);
  const text = buffer.toString(encoding);

  if (!/<OFX[\s>]/i.test(text)) {
    throw new BusinessRuleError(
      'Arquivo inválido: a tag raiz <OFX> não foi encontrada. Confirme que o arquivo enviado é um extrato OFX exportado pelo internet banking.',
    );
  }

  const bankIdMatch = text.match(/<BANKID>([^<\r\n]*)/i);
  const bankId = bankIdMatch?.[1]?.trim();
  const bankName = bankId ? (BANK_NAMES_BY_ID[bankId] ?? `Banco ${bankId}`) : null;

  const acctIdMatch = text.match(/<ACCTID>([^<\r\n]*)/i);
  const accountNumber = acctIdMatch?.[1]?.trim() ?? null;

  const dtStartMatch = text.match(/<DTSTART>([^<\r\n]*)/i);
  const dtEndMatch = text.match(/<DTEND>([^<\r\n]*)/i);
  const periodStart = parseOfxDate(dtStartMatch?.[1]);
  const periodEnd = parseOfxDate(dtEndMatch?.[1]);

  const transactionBlocks = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)
    ?? text.split(/<STMTTRN>/i).slice(1).map((chunk) => chunk.split(/<\/BANKTRANLIST>|<\/STMTTRN>/i)[0]);

  const transactions: ParsedOfxTransaction[] = [];
  let syntheticIndex = 0;

  for (const rawBlock of transactionBlocks ?? []) {
    const block = rawBlock.replace(/<\/STMTTRN>/i, '');
    const date = parseOfxDate(extractTag(block, 'DTPOSTED'));
    const amount = parseOfxAmount(extractTag(block, 'TRNAMT'));
    if (date === null || amount === null) {
      // Bloco corrompido/incompleto (sem data ou valor válido) — ignora
      // silenciosamente em vez de derrubar a importação inteira do
      // arquivo, mas nunca inventa data/valor.
      continue;
    }

    const memo = extractTag(block, 'MEMO');
    const name = extractTag(block, 'NAME');
    const description = memo && name && memo !== name
      ? `${name} - ${memo}`
      : (memo || name || null);

    let fitid = extractTag(block, 'FITID');
    if (!fitid) {
      // OFX sem FITID (raro, viola a especificação, mas visto em exports
      // de sistemas legados) — id sintético determinístico: reimportar o
      // mesmo arquivo gera o mesmo id sintético para o mesmo lançamento,
      // preservando o dedup.
      syntheticIndex += 1;
      fitid = `synthetic:${date}:${amount}:${syntheticIndex}`;
    }

    transactions.push({ fitid, date, amount, description });
  }

  return { bankName, accountNumber, periodStart, periodEnd, transactions };
}
