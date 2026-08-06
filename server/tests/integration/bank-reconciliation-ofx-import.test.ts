import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Teste de integracao contra PostgreSQL real da Conciliacao Bancaria v1
 * (`docs/governance/TODO.md`, "Teste de integracao real das 3 features de
 * maior risco da terceira rodada de 2026-08-06"). Ate esta suite, o modulo
 * so tinha cobertura unitaria com repositorio mockado
 * (`server/tests/unit/reconciliation*.test.ts`).
 *
 * Cobre:
 * - Importacao de extrato OFX 1.x (SGML, tags sem fechamento).
 * - Importacao de extrato OFX 2.x (XML, tags com fechamento) — mesmo
 *   parser (`parseOfx`), fixture diferente.
 * - Dedup por FITID: reimportar o MESMO arquivo nao duplica lancamentos
 *   (`entries_created=0` na segunda importacao).
 * - Sugestao automatica de match contra uma conta a pagar real criada no
 *   teste.
 * - Baixa efetiva de uma conta a pagar via `POST .../entries/:id/match`.
 */
describeIntegration('Conciliacao bancaria — importacao OFX (integracao real)', () => {
  const RECONCILIATION_BASE = '/api/finance/reconciliation';

  /**
   * Monta um arquivo OFX 1.x (SGML, tags folha sem fechamento) com um
   * unico lancamento de SAIDA (debito), usando fitid/valor/data
   * parametrizaveis para isolar cada teste.
   *
   * @param fitid - Identificador do lancamento (FITID).
   * @param amount - Valor assinado (negativo = saida). Ex.: -150.5.
   * @param dtposted - Data no formato `YYYYMMDD`.
   * @returns Buffer do arquivo `.ofx` pronto para upload.
   */
  function buildSgmlOfx(fitid: string, amount: number, dtposted: string): Buffer {
    const amountStr = amount.toFixed(2);
    const content = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${dtposted}120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtposted}
<DTEND>${dtposted}
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${dtposted}120000
<TRNAMT>${amountStr}
<FITID>${fitid}
<MEMO>Pagamento fornecedor teste integracao
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>${dtposted}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
    return Buffer.from(content, 'ascii');
  }

  /**
   * Monta um arquivo OFX 2.x (XML, tags com fechamento) com um unico
   * lancamento de ENTRADA (credito).
   *
   * @param fitid - Identificador do lancamento (FITID).
   * @param amount - Valor assinado (positivo = entrada). Ex.: 250.
   * @param dtposted - Data no formato `YYYYMMDD`.
   * @returns Buffer do arquivo `.ofx` pronto para upload.
   */
  function buildXmlOfx(fitid: string, amount: number, dtposted: string): Buffer {
    const amountStr = amount.toFixed(2);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
      <DTSERVER>${dtposted}120000</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1</TRNUID>
      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>001</BANKID>
          <ACCTID>987654</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dtposted}000000</DTSTART>
          <DTEND>${dtposted}000000</DTEND>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>${dtposted}000000</DTPOSTED>
            <TRNAMT>${amountStr}</TRNAMT>
            <FITID>${fitid}</FITID>
            <MEMO>Recebimento cliente teste integracao</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`;
    return Buffer.from(content, 'utf8');
  }

  it('importa um extrato OFX 1.x (SGML) e cria o lancamento correspondente', async () => {
    const token = authToken();
    const fitid = `FIT-SGML-${Date.now()}`;
    const file = buildSgmlOfx(fitid, -150.0, '20260803');

    const response = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'extrato-sgml-teste.ofx');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.entries_created).toBe(1);
    expect(response.body.data.duplicates_skipped).toBe(0);
    expect(response.body.data.total_in_file).toBe(1);
    expect(response.body.data.statement.bank_name).toBe('Itaú Unibanco');

    const statementId = response.body.data.statement.id;
    const entriesResponse = await api()
      .get(`${RECONCILIATION_BASE}/statements/${statementId}/entries`)
      .set('Authorization', `Bearer ${token}`);

    expect(entriesResponse.status).toBe(200);
    expect(entriesResponse.body.data).toHaveLength(1);
    expect(entriesResponse.body.data[0].fitid).toBe(fitid);
    expect(Number(entriesResponse.body.data[0].amount)).toBeCloseTo(-150.0, 2);
    expect(entriesResponse.body.data[0].entry_date).toBe('2026-08-03');
  });

  it('importa um extrato OFX 2.x (XML) e cria o lancamento correspondente', async () => {
    const token = authToken();
    const fitid = `FIT-XML-${Date.now()}`;
    const file = buildXmlOfx(fitid, 250.0, '20260804');

    const response = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'extrato-xml-teste.ofx');

    expect(response.status).toBe(201);
    expect(response.body.data.entries_created).toBe(1);
    expect(response.body.data.statement.bank_name).toBe('Banco do Brasil');

    const statementId = response.body.data.statement.id;
    const entriesResponse = await api()
      .get(`${RECONCILIATION_BASE}/statements/${statementId}/entries`)
      .set('Authorization', `Bearer ${token}`);

    expect(entriesResponse.body.data).toHaveLength(1);
    expect(entriesResponse.body.data[0].fitid).toBe(fitid);
    expect(Number(entriesResponse.body.data[0].amount)).toBeCloseTo(250.0, 2);
  });

  it('reimportar o MESMO arquivo OFX nao duplica lancamentos (dedup por FITID)', async () => {
    const token = authToken();
    const fitid = `FIT-DEDUP-${Date.now()}`;
    const file = buildSgmlOfx(fitid, -75.5, '20260802');

    const first = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'extrato-dedup.ofx');
    expect(first.status).toBe(201);
    expect(first.body.data.entries_created).toBe(1);
    expect(first.body.data.duplicates_skipped).toBe(0);

    // Reimporta o MESMO buffer (mesmo FITID) — o extrato (BankStatement) e
    // um registro novo, mas NENHUM lancamento novo deve ser criado.
    const second = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'extrato-dedup.ofx');
    expect(second.status).toBe(201);
    expect(second.body.data.entries_created).toBe(0);
    expect(second.body.data.duplicates_skipped).toBe(1);
    expect(second.body.data.total_in_file).toBe(1);
    expect(second.body.data.statement.id).not.toBe(first.body.data.statement.id);

    // Confirma que so existe 1 lancamento com este FITID no banco inteiro
    // (findExistingFitids e global, nao escopado por statement).
    const firstEntries = await api()
      .get(`${RECONCILIATION_BASE}/statements/${first.body.data.statement.id}/entries`)
      .set('Authorization', `Bearer ${token}`);
    const secondEntries = await api()
      .get(`${RECONCILIATION_BASE}/statements/${second.body.data.statement.id}/entries`)
      .set('Authorization', `Bearer ${token}`);

    expect(firstEntries.body.data).toHaveLength(1);
    expect(secondEntries.body.data).toHaveLength(0);
  });

  it('sugere e efetiva o match de um lancamento de saida contra uma conta a pagar real, dando baixa nela', async () => {
    const token = authToken();
    const suffix = Date.now();
    const dueDate = '2026-08-10';
    const amount = 321.45;

    // Cria uma conta a pagar real via API (nao mock) com o mesmo valor do
    // lancamento que sera importado a seguir.
    const payableResponse = await api()
      .post('/api/finance/payable')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: `Conciliacao bancaria — teste integracao ${suffix}`,
        amount,
        due_date: dueDate,
        category: 'teste-integracao',
      });
    expect(payableResponse.status).toBe(201);
    const payableId = payableResponse.body.data.id;

    // Lancamento de saida (debito) com data proxima ao vencimento (dentro
    // da janela de sugestao de 7 dias) e mesmo valor absoluto.
    const fitid = `FIT-MATCH-${suffix}`;
    const file = buildSgmlOfx(fitid, -amount, '20260808');

    const importResponse = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'extrato-match.ofx');
    expect(importResponse.status).toBe(201);
    const statementId = importResponse.body.data.statement.id;

    const suggestionsResponse = await api()
      .get(`${RECONCILIATION_BASE}/statements/${statementId}/suggestions`)
      .set('Authorization', `Bearer ${token}`);
    expect(suggestionsResponse.status).toBe(200);

    const entriesResponse = await api()
      .get(`${RECONCILIATION_BASE}/statements/${statementId}/entries`)
      .set('Authorization', `Bearer ${token}`);
    const entry = entriesResponse.body.data.find((e: { fitid: string }) => e.fitid === fitid);
    expect(entry).toBeTruthy();

    const entrySuggestions = suggestionsResponse.body.data.find(
      (row: { entry: { id: number } }) => row.entry.id === entry.id,
    );
    expect(entrySuggestions).toBeTruthy();
    expect(entrySuggestions.suggestions.some((s: { type: string; id: number }) => s.type === 'payable' && s.id === payableId)).toBe(true);

    const matchResponse = await api()
      .post(`${RECONCILIATION_BASE}/entries/${entry.id}/match`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payable_id: payableId });

    expect(matchResponse.status).toBe(200);
    expect(matchResponse.body.data.entry.status).toBe('matched');
    expect(matchResponse.body.data.accountType).toBe('payable');
    expect(matchResponse.body.data.account.status).toBe('paid');
    expect(Number(matchResponse.body.data.account.amount_paid)).toBeCloseTo(amount, 2);

    // Tentar conciliar o mesmo lancamento de novo deve falhar (ja esta 'matched').
    const secondMatch = await api()
      .post(`${RECONCILIATION_BASE}/entries/${entry.id}/match`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payable_id: payableId });
    expect([400, 409, 422]).toContain(secondMatch.status);
  });

  it('rejeita arquivo sem a tag raiz <OFX> com erro didatico (nao 500)', async () => {
    const token = authToken();
    const invalidFile = Buffer.from('isto nao e um arquivo OFX valido', 'utf8');

    const response = await api()
      .post(`${RECONCILIATION_BASE}/statements`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', invalidFile, 'invalido.ofx');

    expect([400, 422]).toContain(response.status);
  });
});
