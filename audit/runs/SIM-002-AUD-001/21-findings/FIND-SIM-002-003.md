# FINDING

FINDING_ID: FIND-SIM-002-003
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: sendPayment sem idempotência — reenvio duplica movimentação no gateway e sobrescreve external_ref
DOMAIN: Integridade financeira
SUBDOMAIN: Idempotência de integração externa
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: idempotency, business-rule, data-integrity, authorization, traceability, database, qa, documentation-consistency (8 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
REMEDIATION_COMMIT: 9ce4754
RETEST_RESULT: RETEST_PASSED (com observação residual OBS-SIM-002-003)
CLOSED_BY: vericore-software-audit-director
CLOSED_DATE: 2026-08-13

DESCRIPTION:
BR-PAY-002 exige que um pagamento nunca seja enviado duas vezes ao gateway e que
um novo pedido de envio reaproveite o envio anterior. `sendPayment` não
implementa nenhum dos dois comportamentos: não há guarda de estado `sent`, não há
reaproveitamento de `external_ref` e não há chave de idempotência na chamada ao
gateway.

EXPECTED_BEHAVIOR:
BR-PAY-002 (`requirements/BUSINESS_RULES.md:36-41`): "Um mesmo pagamento nunca
pode ser enviado duas vezes ao gateway de pagamento. Uma nova solicitação de
envio para um pagamento já enviado deve reaproveitar o envio anterior e a
referência externa já obtida, sem produzir nova movimentação financeira."
AC-SIM2-004 (`requirements/REQUIREMENTS.md:53-57`) repete a exigência.

ACTUAL_BEHAVIOR:
A única guarda é `status === 'cancelled'`. Um pagamento já em `sent` é reenviado:
o gateway é chamado novamente, gerando nova referência sequencial; uma segunda
linha é inserida em `payment_attempts`; e `payments.external_ref` é
**sobrescrito** com a nova referência, apagando de `payments` a referência do
primeiro envio.

EVIDENCE:
FILE: product/SIM-002/src/paymentService.js
LINES: 72-105
```js
  async function sendPayment({ paymentId }) {
    const payment = db.get('SELECT * FROM payments WHERE id = ?', paymentId);

    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }
    if (payment.status === 'cancelled') {
      throw new Error('Pagamento cancelado não pode ser enviado');
    }

    const now = new Date().toISOString();
    const response = await gateway.submitPayment({
      paymentId: payment.id,
      amount: payment.amount
    });

    db.run(
      `INSERT INTO payment_attempts (payment_id, external_ref, result, attempted_at)
       VALUES (?, ?, ?, ?)`,
      payment.id,
      response.externalRef,
      response.accepted ? 'accepted' : 'failed',
      now
    );

    db.run(
      `UPDATE payments SET status = 'sent', external_ref = ?, sent_at = ? WHERE id = ?`,
      response.externalRef,
      now,
      payment.id
    );

    return db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }
```
Pontos verificados: `:78-80` barra somente `cancelled`; não há teste de
`payment.status === 'sent'`; não há leitura de `payment.external_ref` antes de
chamar o gateway; `:97-102` sobrescreve `external_ref` incondicionalmente.

FILE: product/SIM-002/src/gatewayClient.js
LINES: 13-26
```js
  async function submitPayment({ paymentId, amount, currency = 'BRL' }) {
    if (!paymentId) {
      throw new Error('paymentId é obrigatório');
    }
    if (!(amount > 0)) {
      throw new Error('amount deve ser positivo');
    }

    sequence += 1;
    const externalRef = `${prefix}-${String(sequence).padStart(6, '0')}`;
    calls.push({ paymentId, amount, currency, externalRef });

    return { accepted: true, externalRef };
  }
```
O contrato do gateway não aceita chave de idempotência: a assinatura admite
apenas `paymentId`, `amount` e `currency`, e cada chamada incrementa `sequence`
(`:21`) produzindo referência nova, registrada em `calls` (`:23`).

PERDA DE TRILHA: após o segundo envio, `payments.external_ref` contém apenas a
segunda referência. A primeira sobrevive somente em `payment_attempts`
(`src/schema.sql:36-43`), que não possui vínculo de unicidade nem indicação de
qual tentativa é a canônica.

RELATED_PROCESS: Envio de pagamento ao gateway externo
RELATED_BUSINESS_RULE: BR-PAY-002
RELATED_REQUIREMENT: REQ-SIM2-004
RELATED_USE_CASE: Enviar pagamento ao gateway
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-004 (2ª sentença, não realizada)
RELATED_TEST: TC-SIM2-004 (`tests/payments.test.js:84-111`) — executa um único envio e afirma `callsFor(payment.id).length === 1` (`:99`); nunca chama `sendPayment` duas vezes, portanto não cobre a exigência de idempotência

BUSINESS_IMPACT:
Pagamento em duplicidade ao fornecedor. Cada reenvio gera movimentação financeira
real adicional sem consumir crédito adicional (o teto de BR-PAY-001 é avaliado
apenas em `createPayment`). Conciliação bancária comprometida: o registro em
`payments` aponta para uma referência externa enquanto o extrato do gateway
contém duas.

TECHNICAL_IMPACT:
Operação não idempotente exposta como pública, sem chave de deduplicação em
nenhuma camada (aplicação, contrato de gateway ou banco). Retentativa automática
por qualquer orquestrador/job de liquidação produz duplicação silenciosa.

SECURITY_IMPACT:
`sendPayment` não recebe `user`: não há autorização nem restrição de tenant sobre
a operação (`:72`, parâmetro único `paymentId`). Combinada com IDs sequenciais,
qualquer chamador pode disparar reenvios sobre pagamentos arbitrários. Encadeada
com FIND-SIM-002-004, permite duplicação indefinida (enviar → cancelar → enviar).

REPRODUCTION:
1. Criar e aprovar fornecedor; criar pagamento P.
2. `await sendPayment({ paymentId: P.id })` → `external_ref = 'GW-000001'`.
3. `await sendPayment({ paymentId: P.id })` novamente.
4. Observado: `gateway.callsFor(P.id).length === 2`; `payments.external_ref = 'GW-000002'`;
   `payment_attempts` com 2 linhas.
5. Esperado por BR-PAY-002: uma única chamada e `external_ref` preservada.

ROOT_CAUSE_HYPOTHESIS:
Guarda de estado incompleta (apenas `cancelled`), ausência de chave de
idempotência no contrato de integração e teste que exercita somente o caminho
feliz de primeiro envio.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:36-41` (BR-PAY-002)
- `product/SIM-002/requirements/REQUIREMENTS.md:47-58` (REQ-SIM2-004 / AC-SIM2-004)
- `product/SIM-002/docs/API.md:74-86` (contrato de `sendPayment`, silente sobre reenvio)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:23` (THREAT_MODEL reconhece "duplicidade de movimentação financeira no gateway" como risco considerado)

RECOMMENDATION:
Tornar `sendPayment` idempotente: curto-circuito quando `status === 'sent'`
devolvendo o pagamento com a `external_ref` já obtida; propagar chave de
idempotência estável ao gateway; nunca sobrescrever `external_ref` não nula.
Considerar unicidade em `payment_attempts` por chave de idempotência.
A VeriCore não implementa a correção.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
Executar `sendPayment` duas vezes para o mesmo `paymentId` e assertar:
1. `gateway.callsFor(paymentId).length === 1` (exatamente uma movimentação).
2. O `external_ref` devolvido pelo segundo envio é **idêntico** ao do primeiro.
3. `SELECT COUNT(*) FROM payment_attempts WHERE payment_id = ?` → **1 linha**.
4. `payments.sent_at` inalterado entre a primeira e a segunda chamada.
5. Reteste conjunto com FIND-SIM-002-004: a sequência enviar → cancelar → enviar
   não pode produzir segunda movimentação no gateway.
O teste deve falhar contra o `AUDIT_COMMIT` e passar após a remediação.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade CRITICAL **mantida**.

### Releitura independente do código

Reli `src/paymentService.js:72-105` e `src/gatewayClient.js:1-46`. Confirmo linha
a linha: a única guarda de estado é `payment.status === 'cancelled'` (`:78`); não
há leitura de `payment.external_ref` nem de `payment.sent_at` antes da chamada ao
gateway; o `UPDATE` de `:97-102` grava `external_ref` sem cláusula condicional
(nem no `SET`, nem no `WHERE`, que filtra só por `id`).

### Onde procurei controle compensatório (e o que NÃO encontrei)

1. **Deduplicação no cliente de gateway** — `createGatewayClient`
   (`src/gatewayClient.js:9-44`) mantém `calls[]` e `sequence`, mas `submitPayment`
   (`:13-26`) **não** consulta `calls` antes de emitir: incrementa `sequence`
   incondicionalmente (`:21`) e devolve nova `externalRef`. `callsFor()` (`:33`)
   existe apenas para inspeção em teste. Nenhuma deduplicação por `paymentId`.
2. **Chave de idempotência no contrato** — a assinatura aceita somente
   `{ paymentId, amount, currency }`; não há `idempotencyKey` nem header
   equivalente. Não existe outro cliente de gateway no repositório.
3. **Unicidade no banco** — `src/schema.sql:36-43` (`payment_attempts`) não possui
   `UNIQUE` sobre `payment_id` nem sobre `external_ref`; `payments.external_ref`
   (`:28`) tampouco. Busca por `UNIQUE` em todo `product/SIM-002/`: nenhuma
   ocorrência em DDL. O banco não impede a segunda tentativa.
4. **Guarda no chamador / job de liquidação** — `docs/API.md:78-79` diz que a
   operação é executada "pelo processo de liquidação", mas **esse processo não
   existe no repositório**: os únicos chamadores de `sendPayment` são os testes.
   Não há orquestrador com controle de "enviar uma única vez" que pudesse
   compensar. Ao contrário: um job de liquidação com retentativa é exatamente o
   cenário que dispara o defeito.
5. **Teste que cubra** — TC-SIM2-004 (`tests/payments.test.js:84-111`) chama
   `sendPayment` uma única vez (`:94`); a asserção `callsFor(...).length === 1`
   (`:99`) é trivialmente satisfeita e não prova idempotência. Confirmo que
   nenhum outro teste chama `sendPayment`.

### Tentativa de refutação por severidade

Argumento testado: "o gateway é simulado (`SOFTWARE_RELEASE_PACKAGE.md:36`), logo
não há movimentação financeira real — MEDIUM". **Rejeitado**: diferentemente de
FIND-SIM-002-009, aqui o defeito é integralmente demonstrável com o gateway
existente (duas chamadas efetivas, `sequence` incrementada duas vezes, duas linhas
em `payment_attempts`, `external_ref` sobrescrita e perda de trilha em `payments`).
A perda da referência canônica e a duplicidade de trilha são danos reais **dentro
do AUDIT_COMMIT**, independentemente de o gateway ser real. Ademais, a duplicidade
de movimentação é risco explicitamente reconhecido pelo próprio release
(`:23`) e não mitigado. CRITICAL sustentada.

### Relação com outros findings (não é duplicata)

Distinto de FIND-SIM-002-009 (que trata do `UPDATE` ignorar `response.accepted`) e
de FIND-SIM-002-004 (superfície `cancelPayment`). Este finding é o único que trata
da ausência de guarda de reenvio e da sobrescrita de `external_ref`. Mantido como
finding próprio; a remediação deve ser conjunta com -004, como o próprio finding
recomenda.

### Reprodutibilidade

Reprodução executável e determinística com o código do `AUDIT_COMMIT`, sem
duplos de teste. Aceito como prova.

---

## Fechamento (software-audit-director)

DATA: 2026-08-13
REMEDIATION_COMMIT ACEITO: `9ce4754` (WAVE-C)
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §1.3
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner`, harness próprio fora
do repositório

RESULTADO DO RETESTE: **RETEST_PASSED**. No caminho principal, 6 envios sobre o
mesmo pagamento produziram: mesma `external_ref`, mesmo `sent_at`, `callsFor = 1`
e **1** linha em `payment_attempts`; espião de integração confirmou **1**
invocação real de `submitPayment` — a contagem é de chamada efetiva, não artefato
de inspeção. Itens 1, 2, 3 e 5 da `RETEST_SPECIFICATION` atendidos; item 4
atendido no caminho enviar→enviar. Suíte 22/22.

RESSALVA MATERIAL MEDIDA: no caminho **enviar → cancelar → enviar**, o
curto-circuito **do serviço** não age — `cancelPayment` devolve o `status` a
`created`, tornando falsa a condição `status === 'sent' && external_ref` — e
`submitPayment` é **realmente invocado a cada reenvio** (1 → 4 invocações em 3
ciclos). A não-duplicação decorre exclusivamente da deduplicação por
`idempotencyKey` **dentro do gateway**. Resultado final permanece correto: 1
movimentação, 1 attempt. Porém `sent_at` **não é estável** nesse caminho, e a
defesa repousa no gateway, não no serviço.

DECISÃO DO DIRETOR SOBRE A RESSALVA — **RETEST_PASSED com observação residual
nova** (e não RETEST_FAILED, e não aceitação silenciosa):
1. BR-PAY-002 é redigida em termos de **resultado** ("sem produzir nova
   movimentação financeira") e o resultado foi cumprido em todos os caminhos
   exercitados. Nenhum artefato versionado exige que a proteção resida na camada
   de serviço; exigi-lo seria a VeriCore criar requisito de desenho — vedado pela
   Regra 6.
2. Reprovar seria reprovar por **mecanismo** tendo o **resultado** aprovado: o
   item 5 da spec — justamente o cenário da ressalva — foi atendido por medição.
3. Encerrar sem registro também seria impróprio: a §3.3 da
   `AUDIT_COVERAGE_MATRIX` declara que **o gateway real não é auditável** (o
   `gatewayClient` é stub), de modo que a defesa passou a repousar em componente
   que esta auditoria classificou como não verificável; e `sent_at` instável é
   desvio observável com impacto em conciliação.
4. O caminho pós-cancelamento está **fora do escopo decidível desta onda**:
   `cancelPayment` é objeto de FIND-SIM-002-004 (CRITICAL, aberto, human gate) —
   sua legitimidade, autorização e a transição `sent → created` aguardam decisão
   humana. Não se especifica o comportamento idempotente correto de um caminho
   cuja semântica normativa ainda não existe (Regra 18).
5. **Nota de integridade de evidência**: o pacote de evidência da SanaCore
   descreve o curto-circuito do serviço como a proteção contra reenvio; a medição
   independente mostra que, nesse caminho, ele não age. A narrativa do pacote é
   **mais forte que o comportamento medido**. Registrado sem imputação de má-fé,
   sem efeito sobre este veredito, e dirigido à SanaCore e ao CoreTriad Director.

OBSERVAÇÃO RESIDUAL ABERTA: **OBS-SIM-002-003** em
`31-new-findings/NEW_OBSERVATIONS.md`, dependente do desfecho de FIND-SIM-002-004.

DELIMITAÇÃO DO FECHAMENTO: fecha-se a duplicação de movimentação no gateway e a
sobrescrita de `external_ref` — o objeto deste finding. **Não** se fecha nem se
absolve o comportamento de `sent_at` no caminho pós-cancelamento.

DECLARAÇÃO: **FINDING CLOSED**, nos termos da **Regra 4** do `CLAUDE.md`. Não
constitui `REMEDIATION COMPLETE` (Regra 3) nem auditoria do commit remediado como
um todo (Regras 12-14).
