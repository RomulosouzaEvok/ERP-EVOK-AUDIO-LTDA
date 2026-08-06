/**
 * Testes do parser manual de OFX (`parseOfx`) da Conciliação Bancária v1:
 * OFX 1.x (SGML, tags sem fechamento) e 2.x (XML, com fechamento),
 * encoding Latin-1/CP1252, valor com vírgula decimal, FITID ausente
 * (id sintético determinístico) e arquivo inválido (422 didático).
 */
import { parseOfx } from '../../src/modules/financial/infrastructure/ofx/parseOfx';
import { BusinessRuleError } from '../../src/errors';

const OFX1_HEADER = [
  'OFXHEADER:100',
  'DATA:OFXSGML',
  'VERSION:102',
  'SECURITY:NONE',
  'ENCODING:USASCII',
  'CHARSET:1252',
  'COMPRESSION:NONE',
  'OLDFILEUID:NONE',
  'NEWFILEUID:NONE',
  '',
].join('\r\n');

function buildOfx1(transactions: string, opts: { bankId?: string; acctId?: string; dtStart?: string; dtEnd?: string } = {}): string {
  const { bankId = '341', acctId = '12345-6', dtStart = '20260701', dtEnd = '20260731' } = opts;
  return `${OFX1_HEADER}<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>${bankId}
<ACCTID>${acctId}
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtStart}
<DTEND>${dtEnd}
${transactions}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

describe('parseOfx — OFX 1.x (SGML)', () => {
  it('extrai bank_name (via BANKID), account_number e periodo do cabecalho', () => {
    const ofx = buildOfx1(`<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260705120000
<TRNAMT>-150.00
<FITID>2026070500001
<MEMO>PAGAMENTO FORNECEDOR
</STMTTRN>`);

    const result = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result.bankName).toBe('Itaú Unibanco');
    expect(result.accountNumber).toBe('12345-6');
    expect(result.periodStart).toBe('2026-07-01');
    expect(result.periodEnd).toBe('2026-07-31');
    expect(result.transactions).toHaveLength(1);
  });

  it('extrai fitid, data, valor (com sinal) e descricao de cada <STMTTRN>', () => {
    const ofx = buildOfx1(`<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260705120000
<TRNAMT>-150.00
<FITID>2026070500001
<MEMO>PAGAMENTO FORNECEDOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260706
<TRNAMT>980.50
<FITID>2026070600002
<NAME>CLIENTE XPTO
</STMTTRN>`);

    const result = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result.transactions).toEqual([
      { fitid: '2026070500001', date: '2026-07-05', amount: -150, description: 'PAGAMENTO FORNECEDOR' },
      { fitid: '2026070600002', date: '2026-07-06', amount: 980.5, description: 'CLIENTE XPTO' },
    ]);
  });

  it('decodifica MEMO com acentuacao Latin-1/CP1252 corretamente', () => {
    const memo = 'PAGTO CONTA DE ÁGUA - LIQUIDAÇÃO';
    const ofx = buildOfx1(`<STMTTRN>
<DTPOSTED>20260705
<TRNAMT>-89.90
<FITID>1
<MEMO>${memo}
</STMTTRN>`);

    const result = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result.transactions[0].description).toBe(memo);
  });

  it('trata TRNAMT com virgula decimal (variacao regional fora da especificacao)', () => {
    const ofx = buildOfx1(`<STMTTRN>
<DTPOSTED>20260705
<TRNAMT>-150,00
<FITID>1
<MEMO>Boleto
</STMTTRN>`);

    const result = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result.transactions[0].amount).toBe(-150);
  });

  it('sintetiza um fitid deterministico quando o FITID esta ausente (mesmo input -> mesmo id sintetico)', () => {
    const ofx = buildOfx1(`<STMTTRN>
<DTPOSTED>20260705
<TRNAMT>-10.00
<MEMO>Tarifa
</STMTTRN>`);

    const result1 = parseOfx(Buffer.from(ofx, 'latin1'));
    const result2 = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result1.transactions[0].fitid).toBeTruthy();
    expect(result1.transactions[0].fitid).toBe(result2.transactions[0].fitid);
  });

  it('ignora bloco <STMTTRN> corrompido (sem DTPOSTED ou TRNAMT validos) sem derrubar o arquivo inteiro', () => {
    const ofx = buildOfx1(`<STMTTRN>
<DTPOSTED>20260705
<TRNAMT>-10.00
<FITID>ok-1
</STMTTRN>
<STMTTRN>
<FITID>corrompido-sem-data-nem-valor
</STMTTRN>`);

    const result = parseOfx(Buffer.from(ofx, 'latin1'));

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].fitid).toBe('ok-1');
  });
});

describe('parseOfx — OFX 2.x (XML)', () => {
  it('extrai transacoes de um OFX 2.x valido (tags fechadas, UTF-8)', () => {
    const ofx = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>001</BANKID>
<ACCTID>987654-0</ACCTID>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260701</DTSTART>
<DTEND>20260731</DTEND>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20260710</DTPOSTED>
<TRNAMT>500.00</TRNAMT>
<FITID>xml-1</FITID>
<MEMO>Recebimento cliente</MEMO>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    const result = parseOfx(Buffer.from(ofx, 'utf8'));

    expect(result.bankName).toBe('Banco do Brasil');
    expect(result.accountNumber).toBe('987654-0');
    expect(result.transactions).toEqual([
      { fitid: 'xml-1', date: '2026-07-10', amount: 500, description: 'Recebimento cliente' },
    ]);
  });
});

describe('parseOfx — arquivos invalidos', () => {
  it('lanca BusinessRuleError (422) quando a tag raiz <OFX> nao existe', () => {
    const notOfx = 'isto nao e um arquivo ofx, apenas texto qualquer';

    expect(() => parseOfx(Buffer.from(notOfx, 'utf8'))).toThrow(BusinessRuleError);
    try {
      parseOfx(Buffer.from(notOfx, 'utf8'));
      fail('deveria ter lancado');
    } catch (error: any) {
      expect(error.statusCode).toBe(422);
    }
  });

  it('lanca BusinessRuleError para buffer vazio', () => {
    expect(() => parseOfx(Buffer.from('', 'utf8'))).toThrow(BusinessRuleError);
  });
});
