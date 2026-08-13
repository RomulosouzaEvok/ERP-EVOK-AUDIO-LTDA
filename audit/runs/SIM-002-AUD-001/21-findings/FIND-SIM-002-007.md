# FINDING

FINDING_ID: FIND-SIM-002-007
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: TC-SIM2-003b é teste falso-positivo — try/catch sem asserção, único teste que alega cobrir BR-PAY-001
DOMAIN: Qualidade / Assurance
SUBDOMAIN: Validade da evidência de teste
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: qa, traceability, business-rule, data-integrity, documentation-consistency, database (6 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
REMEDIATION_COMMIT: f0aaa7a
RETEST_RESULT: RETEST_PASSED
CLOSED_BY: vericore-software-audit-director
CLOSED_DATE: 2026-08-13

DESCRIPTION:
O teste TC-SIM2-003b envolve a chamada a `createPayment` em um `try/catch` cujo
bloco `catch` está vazio e cujo bloco `try` não contém nenhuma asserção nem
`assert.fail()`. O teste passa independentemente do comportamento do sistema: se
o teto for aplicado, o erro é silenciosamente engolido; se o teto for removido, a
chamada simplesmente retorna. É evidência nula apresentada como cobertura.

EXPECTED_BEHAVIOR:
Um teste que alega cobrir AC-SIM2-003 ("Dado que a soma excederia o limite de
crédito, então a criação é recusada", `requirements/REQUIREMENTS.md:43-44`) deve
falhar quando a regra não é aplicada — poder discriminatório é condição de
existência do teste.

ACTUAL_BEHAVIOR:
O teste passa em ambos os mundos possíveis. Sua presença na contagem `12/12 PASS`
transforma ausência de verificação em aparência de cobertura.

EVIDENCE:
FILE: product/SIM-002/tests/payments.test.js
LINES: 43-60
```js
test('TC-SIM2-003b: pagamento acima do limite de credito e rejeitado', async () => {
  const ctx = buildContext();
  try {
    const supplier = approvedSupplier(ctx, { creditLimit: 5000 });

    try {
      await ctx.payments.createPayment({
        supplierId: supplier.id,
        amount: 9000,
        user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
      });
    } catch (error) {
      // limite de crédito excedido
    }
  } finally {
    ctx.close();
  }
});
```
Verificado: nenhuma chamada a `assert.*` dentro do escopo do teste (`:43-60`);
`catch (error)` em `:54-56` contém apenas comentário; não há `assert.fail()` após
o `await` para o caso de a chamada resolver.

PADRÃO CORRETO NO MESMO ARQUIVO — o teste vizinho demonstra que a técnica
adequada era conhecida:
FILE: product/SIM-002/tests/payments.test.js
LINES: 71-78
```js
    await assert.rejects(
      () => ctx.payments.createPayment({
        supplierId: supplier.id,
        amount: 100,
        user: user({ id: 'ana', role: 'analyst', companyId: ctx.companies.acme })
      }),
      /não está aprovado/
    );
```

EXCLUSIVIDADE: TC-SIM2-003b é o **único** teste da suíte que alega cobrir
BR-PAY-001. Nenhum outro teste em `tests/payments.test.js`, `approval.test.js` ou
`suppliers.test.js` exercita o teto de crédito. Portanto BR-PAY-001 está, na
prática, **sem cobertura de teste**.

USO COMO EVIDÊNCIA DE RELEASE:
FILE: product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md
LINES: 31-34
```
TEST_RESULTS: Execução em 2026-08-13 (Node.js v24.18.0):
  tests 12 / suites 0 / pass 12 / fail 0 / cancelled 0 / skipped 0 / todo 0 / duration_ms 98.5321
  Testes: TC-SIM2-001, TC-SIM2-001b, TC-SIM2-002, TC-SIM2-002b, TC-SIM2-002c, TC-SIM2-002d,
  TC-SIM2-003, TC-SIM2-003b, TC-SIM2-003c, TC-SIM2-004, TC-SIM2-005, TC-SIM2-006 — todos PASS.
```
O `12/12 PASS` é apresentado como evidência de cobertura, incluindo TC-SIM2-003b.

RELATED_PROCESS: Verificação e assurance do release SIM-002-RC1
RELATED_BUSINESS_RULE: BR-PAY-001 (sem prova executável)
RELATED_REQUIREMENT: REQ-SIM2-003
RELATED_USE_CASE: Criar pagamento
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-003 (3ª sentença sem prova)
RELATED_TEST: TC-SIM2-003b (`tests/payments.test.js:43-60`) — o próprio objeto do finding

BUSINESS_IMPACT:
Decisão de release fundamentada em evidência inválida. Qualquer regressão futura
no teto de crédito passará despercebida pela suíte. O risco financeiro de
BR-PAY-001 está descoberto enquanto o painel de qualidade indica verde.

TECHNICAL_IMPACT:
Falso-positivo de teste é a forma mais nociva de dívida de qualidade: consome a
confiança do gate sem entregar verificação. Impede também a detecção do defeito
de concorrência correlato (FIND-SIM-002-006).

SECURITY_IMPACT:
Indireto: controles financeiros e de autorização passam a depender de revisão
manual, pois a suíte não os discrimina.

REPRODUCTION:
1. Remover a guarda de limite de `src/paymentService.js:51-53`.
2. Executar `node --test "product/SIM-002/tests/**/*.test.js"`.
3. Observado: TC-SIM2-003b continua PASS (suíte permanece 12/12).
4. Esperado: TC-SIM2-003b deveria falhar.

ROOT_CAUSE_HYPOTHESIS:
Uso de `try/catch` como substituto de asserção de rejeição, sem `assert.fail()`
no caminho de sucesso — padrão que produz teste sempre verde.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:31-34` (BR-PAY-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:40-45` (AC-SIM2-003)
- `product/SIM-002/tests/payments.test.js:71-78` (padrão correto no mesmo arquivo)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:30-34` (TEST_STRATEGY / TEST_RESULTS)

RECOMMENDATION:
Reescrever TC-SIM2-003b com `assert.rejects` e verificação de pós-condição, e
revisar a suíte inteira em busca do mesmo antipadrão. A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
O teste reescrito deve conter, cumulativamente:
1. `await assert.rejects(() => createPayment(...), /excede o limite/)` — rejeição
   com mensagem verificada.
2. Asserção de que **nada foi persistido**: `SELECT COUNT(*) FROM payments WHERE supplier_id = ?`
   permanece igual ao valor anterior à tentativa.
3. Caso acumulado: com `credit_limit = 10000`, pagamento de 6000 aceito e
   segundo de 5000 recusado (o teto considera a soma, não o valor isolado).
4. Fronteira exata: pagamento que iguala exatamente o limite é **aceito**;
   limite + 0,01 é **recusado**.
5. Prova de discriminação (mutation check): com a guarda de
   `src/paymentService.js:51-53` neutralizada, o novo teste **deve falhar**.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade HIGH **mantida**.

### Releitura independente do teste

Li `tests/payments.test.js` integralmente (133 linhas). Confirmo, por inspeção
direta do bloco `:43-60`: o corpo do teste contém `buildContext()`,
`approvedSupplier(...)`, um `await createPayment(...)` dentro de `try`, um `catch`
com apenas um comentário e um `finally` com `ctx.close()`. **Zero** ocorrências de
`assert` no escopo do teste — e o arquivo importa `node:assert` (`:4`), usado nos
demais testes. O teste é, de fato, incapaz de falhar por comportamento do SUT.

### Onde procurei refutação (e o que NÃO encontrei)

1. **Outro teste que cubra BR-PAY-001** — a refutação decisiva seria a existência
   de cobertura real do teto em outro ponto. Reli os três arquivos de teste:
   - `suppliers.test.js` (71 linhas): cadastro, CNPJ malformado, isolamento na
     consulta. Nada de teto.
   - `approval.test.js` (94 linhas): alçada e tenant na aprovação. Nada de teto.
   - `payments.test.js`: TC-SIM2-003 (feliz), 003b (o objeto do finding), 003c
     (fornecedor não aprovado), 004 (envio), 005 (listagem).
   Confirmo a **exclusividade** alegada: BR-PAY-001 não tem nenhum teste com poder
   discriminatório. Refutação falha.
2. **Asserção implícita do runner** — hipótese: `node:test` falharia o teste por
   promessa rejeitada não tratada. Não se aplica: a rejeição **é** tratada pelo
   `catch` (`:54-56`); nada escapa. E no mundo em que a guarda inexiste, o `await`
   simplesmente resolve. O teste é verde nos dois mundos, como alegado.
3. **Verificação equivalente fora da suíte** — não há linter, mutation testing,
   verificação de cobertura ou gate adicional configurado no projeto
   (`SOFTWARE_RELEASE_PACKAGE.md:30` descreve apenas `node --test`). Nenhum
   controle compensatório de assurance.

### Tentativa de refutação por severidade

Argumento testado: "é dívida de teste, não defeito de produto — MEDIUM".
**Rejeitado**: (a) o artefato foi usado como evidência de release
(`SOFTWARE_RELEASE_PACKAGE.md:31-34`, `12/12 PASS`), portanto contaminou uma
decisão de gate — é falha de assurance, não apenas de qualidade interna; (b) é a
razão direta pela qual o único controle de BR-PAY-001 permanece não verificado, o
que se combina com FIND-SIM-002-006 (mesmo invariante, defeito real). HIGH
mantida.

Registro, contudo, uma delimitação: este finding **não** afirma que a guarda de
teto está incorreta — reli `src/paymentService.js:51-53` e a comparação sequencial
está correta. O defeito é exclusivamente da evidência de teste. A distinção
importa para a SanaCore não "corrigir" código que não está errado.

### Relação com FIND-SIM-002-013 (não é duplicata)

FIND-SIM-002-013 (LOW) agrega lacunas de fronteira e testes negativos ausentes;
este finding trata de um teste **existente e inválido** usado como evidência de
release. Objetos distintos. Recomendo, porém, reteste conjunto dos dois na mesma
rodada de suíte.

---

## Fechamento (software-audit-director)

DATA: 2026-08-13
REMEDIATION_COMMIT ACEITO: `f0aaa7a` (WAVE-A; produto byte-idêntico ao HEAD,
equivalência verificada por hash de árvore)
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §1.6
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner`, harness próprio fora
do repositório

RESULTADO DO RETESTE: **RETEST_PASSED**. Itens 1 a 4 da `RETEST_SPECIFICATION`
executados com asserção e verificação de estado:
1. Limite 5000 + pagamento 9000 → **rejeitado**.
2. Nada persistido: `COUNT(*)` de `payments` = **0** após a tentativa.
3. Caso acumulado: 3000 aceito, 2500 rejeitado, `SUM = 3000` — o teto considera a
   **soma**, e não o valor isolado.
4. Fronteira exata: 3000 + 2000 aceitos (`SUM = 5000`, igual ao limite →
   **aceito**); +0,01 → **recusado**.
Regressão: suíte 20/20 (contra 12/12 no `AUDIT_COMMIT`; o crescimento da suíte é
indício de acréscimo de casos, não de reescrita cosmética). Working tree limpo
antes e depois.

RESSALVA REGISTRADA: o item 5 (prova de discriminação por mutação — neutralizar a
guarda e exigir falha do teste) **não consta** da evidência do runner. Não a trato
como bloqueante, e a razão é lógica e não de conveniência: o objeto do finding é
"o teste passa nos dois mundos possíveis" (zero asserções, `catch` vazio), e isso
está diretamente refutado — um teste sem asserção não pode produzir a verificação
`COUNT(*) payments = 0` nem discriminar fronteira em R$ 0,01. A mutação
**elevaria** a confiança; não é condição necessária para demonstrar a extinção do
defeito. Lacuna registrada em aberto como **OBS-SIM-002-005** (INFO, backlog de
assurance) em `31-new-findings/NEW_OBSERVATIONS.md`, junto com a varredura do
mesmo antipadrão (`try/catch` sem asserção) na suíte inteira, recomendada por
este finding.

EFEITO SOBRE A EVIDÊNCIA DE RELEASE: `SOFTWARE_RELEASE_PACKAGE.md:31-34` deixa de
sustentar um `12/12 PASS` contaminado por evidência nula sobre BR-PAY-001.

DECLARAÇÃO: **FINDING CLOSED**, nos termos da **Regra 4** do `CLAUDE.md`. Não
constitui `REMEDIATION COMPLETE` (Regra 3) nem auditoria do commit remediado como
um todo (Regras 12-14).
