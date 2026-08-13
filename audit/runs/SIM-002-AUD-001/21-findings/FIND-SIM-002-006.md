# FINDING

FINDING_ID: FIND-SIM-002-006
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: Teto de crédito validado por read-modify-write sem transação — TOCTOU permite estourar BR-PAY-001
DOMAIN: Integridade de dados
SUBDOMAIN: Concorrência / atomicidade
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: data-integrity, database, business-rule, idempotency (4 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
REMEDIATION_COMMIT: 9ce4754
RETEST_RESULT: RETEST_PASSED (delimitado à corrida intraprocesso)
CLOSED_BY: vericore-software-audit-director
CLOSED_DATE: 2026-08-13

DESCRIPTION:
`createPayment` soma o valor comprometido, decide com base nessa soma e insere o
pagamento em três operações separadas, sem transação e com ponto de suspensão
(`await`) entre a leitura e a escrita. Duas execuções intercaladas leem o mesmo
valor comprometido e ambas inserem, ultrapassando o teto de crédito.

EXPECTED_BEHAVIOR:
BR-PAY-001 (`requirements/BUSINESS_RULES.md:31-34`): "A soma dos pagamentos
válidos de um fornecedor não pode, **em nenhum momento**, exceder o limite de
crédito aprovado" — invariante que exige verificação e escrita atômicas.

ACTUAL_BEHAVIOR:
A janela entre a leitura (`sumCommittedAmount`) e o `INSERT` não é protegida.
Execuções concorrentes observam o mesmo `committed`, ambas passam pela guarda e
ambas persistem, resultando em `SUM(amount) > credit_limit`.

EVIDENCE:
FILE: product/SIM-002/src/paymentService.js
LINES: 26-35
```js
  async function sumCommittedAmount(supplierId) {
    const row = db.get(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM payments
        WHERE supplier_id = ?
          AND status <> 'cancelled'`,
      supplierId
    );
    return row.total;
  }
```

FILE: product/SIM-002/src/paymentService.js
LINES: 48-64
```js
    const supplier = await loadApprovedSupplier(supplierId, user);
    const committed = await sumCommittedAmount(supplierId);

    if (committed + amount > supplier.credit_limit) {
      throw new Error('Pagamento excede o limite de crédito do fornecedor');
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO payments (supplier_id, company_id, amount, status, created_by, created_at)
       VALUES (?, ?, ?, 'created', ?, ?)`,
```
Sequência verificada: leitura em `:49` (precedida de `await` em `:48`), decisão em
`:51-53`, escrita em `:56-64`. Não há `BEGIN`/`COMMIT` envolvendo o bloco, e os
`await` de `:48` e `:49` cedem o event loop entre a leitura e a escrita.

FILE: product/SIM-002/src/db.js
LINES: 20-38
```js
  return {
    raw: database,

    run(sql, ...params) {
      return database.prepare(sql).run(...params);
    },

    get(sql, ...params) {
      return database.prepare(sql).get(...params);
    },

    all(sql, ...params) {
      return database.prepare(sql).all(...params);
    },

    close() {
      database.close();
    }
  };
```
O handle exposto **não oferece primitiva transacional** (`transaction`, `begin`,
`commit`, `rollback`): apenas `run`/`get`/`all`/`close` e o `raw`. Verificação
exaustiva: não há nenhum `BEGIN` em todo o `product/SIM-002/src/` — nem em
`paymentService.js`, `supplierService.js`, `approvalService.js`, `db.js` ou
`schema.sql`.

RELATED_PROCESS: Registro de pagamento
RELATED_BUSINESS_RULE: BR-PAY-001
RELATED_REQUIREMENT: REQ-SIM2-003
RELATED_USE_CASE: Criar pagamento
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-003
RELATED_TEST: TC-SIM2-003b (`tests/payments.test.js:43-60`) — além de falso-positivo (FIND-SIM-002-007), é estritamente sequencial; nenhum teste exercita concorrência

BUSINESS_IMPACT:
Exposição de crédito superior ao aprovado, sem qualquer registro de exceção: os
pagamentos criados são todos formalmente válidos, e o estouro só é perceptível
por auditoria agregada posterior. O excesso é limitado apenas pelo grau de
concorrência da chamada.

TECHNICAL_IMPACT:
TOCTOU clássico (time-of-check to time-of-use) sobre invariante financeira. A
ausência de qualquer suporte transacional na camada de acesso impede que a
correção seja local ao serviço: exige evolução do handle de banco. O mesmo
padrão não-atômico afeta `sendPayment` (FIND-SIM-002-009).

SECURITY_IMPACT:
Contorno de controle financeiro por corrida; explorável deliberadamente por
chamador que dispare requisições paralelas.

REPRODUCTION:
1. Aprovar fornecedor com `credit_limit = 10000`.
2. `await Promise.all([createPayment({..., amount: 8000}), createPayment({..., amount: 8000})])`.
3. Observado (esperado do defeito): ambos resolvem; `SELECT SUM(amount) FROM payments WHERE supplier_id = ? AND status <> 'cancelled'` = 16000 > 10000.
4. Esperado por BR-PAY-001: exatamente uma criação bem-sucedida.

ROOT_CAUSE_HYPOTHESIS:
Validação de invariante implementada na aplicação em vez de no banco, sem
transação nem constraint que a sustente; o modelo mental sequencial dos testes
mascarou a lacuna.

REFERENCE:
- `product/SIM-002/requirements/BUSINESS_RULES.md:31-34` (BR-PAY-001)
- `product/SIM-002/requirements/REQUIREMENTS.md:33-45` (REQ-SIM2-003 / AC-SIM2-003)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:16` (arquitetura: "handle único de banco")
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:37` ("Nenhum risco registrado pela engenharia neste ciclo")

RECOMMENDATION:
Envolver leitura-decisão-escrita em transação com nível de isolamento adequado
(em SQLite, transação imediata/exclusiva) e/ou mover a invariante para o banco.
Expor primitiva transacional no handle de `db.js`. A VeriCore não implementa.

SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
1. Fornecedor aprovado com `credit_limit = 10000`; disparar
   `Promise.all([createPayment(8000), createPayment(8000)])`.
   Asserção: **exatamente 1 sucesso e 1 rejeição** com a mensagem de limite.
2. Invariante pós-condição: `SUM(amount) WHERE status <> 'cancelled'` **≤**
   `credit_limit` do fornecedor.
3. Não-regressão sequencial: 6000 + 3000 com limite 10000 → ambos aceitos;
   6000 + 5000 → segundo recusado.
4. Verificação estrutural: existe demarcação transacional efetiva (não apenas
   `try/catch`) cobrindo leitura e escrita.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade HIGH **mantida**. Alegação de concorrência
**submetida a refutação específica e sobrevivente**, com uma correção de precisão
técnica registrada abaixo.

### Refutação tentada: "driver síncrono ⇒ trecho crítico atômico"

Hipótese de refutação (a mais forte contra este finding): `node:sqlite` expõe
`DatabaseSync` (`src/db.js:5,16`) e todos os helpers `run/get/all`
(`:23-33`) são chamadas **síncronas**; logo o trecho leitura→decisão→escrita seria
atômico dentro de um único processo e a corrida só existiria entre processos —
como corretamente concluído em FIND-SIM-002-010 para `approveSupplier`.

**A refutação FALHA aqui**, e a diferença é material: `approveSupplier` é uma
função **síncrona** (`src/approvalService.js:13`), sem ponto de suspensão entre
leitura e escrita. Já `createPayment` é `async` e possui `await` **entre a leitura
e a decisão/escrita** (`src/paymentService.js:48-49`). Em JavaScript, `await`
sempre difere a continuação para a fila de microtarefas, mesmo quando o valor
aguardado já está resolvido. Traço de intercalação para
`Promise.all([createPayment(A), createPayment(B)])` sobre o mesmo `supplier_id`,
com um único processo e um único handle:

1. `createPayment(A)` executa as validações síncronas (`:41-46`), chama
   `loadApprovedSupplier` (corpo síncrono) e suspende no `await` de `:48`
   → agenda a microtarefa M1 e devolve promessa pendente.
2. `createPayment(B)` idem → agenda M2.
3. M1: A retoma, chama `sumCommittedAmount` (`:49`) — o `SELECT SUM` executa
   **agora**, lendo `committed = 0` — e suspende no `await` → agenda M3.
4. M2: B retoma, executa o mesmo `SELECT SUM` e lê **também** `committed = 0`
   (A ainda não inseriu) → agenda M4.
5. M3: A avalia `0 + 8000 <= 10000` → passa e executa o `INSERT` (`:56`).
6. M4: B avalia com o valor **obsoleto** `0 + 8000 <= 10000` → passa e insere.

Resultado: `SUM(amount) = 16000 > credit_limit = 10000`. A corrida é, portanto,
**realizável em processo único**, sem múltiplos processos e sem arquivo `.db`
compartilhado — exatamente o cenário da REPRODUCTION do finding, que é executável
como está. Não há redução de severidade a fazer por este eixo.

**Correção de precisão** (registrada, sem alterar o veredito): a frase da EVIDENCE
"os `await` de `:48` e `:49` cedem o event loop" é imprecisa — cede-se a fila de
**microtarefas**, não uma volta completa do event loop (não há I/O envolvido, pois
o driver é síncrono). A consequência lógica é idêntica e a intercalação continua
garantida; recomendo à SanaCore/consolidador usar a formulação precisa para não
induzir diagnóstico errado durante a remediação.

### Onde mais procurei controle compensatório (e o que NÃO encontrei)

1. **Transação** — o handle de `src/db.js:20-38` expõe apenas `run/get/all/close`
   e `raw`. Busca por `BEGIN`, `TRANSACTION`, `COMMIT`, `transaction` em todo
   `product/SIM-002/`: **nenhuma ocorrência**. Nenhum serviço usa `db.raw` para
   demarcar transação (grep por `raw` fora de `db.js`: nenhum uso).
2. **Constraint/trigger no banco que sustentasse a invariante** —
   `src/schema.sql:1-47` não possui `CHECK`, trigger ou coluna computada que
   compare `SUM(amount)` com `credit_limit`. A invariante existe apenas na
   aplicação.
3. **Serialização a montante (fila, lock, mutex)** — não há orquestrador, fila ou
   lock no módulo; os únicos chamadores são os testes. `SOFTWARE_RELEASE_PACKAGE.md:16`
   descreve "handle único de banco", sem serialização de requisições.
4. **Teste que cubra** — nenhum teste concorrente na suíte; TC-SIM2-003b é, além
   de sequencial, sem asserção (FIND-SIM-002-007).

### Severidade

Mantida em HIGH. Considerei elevar a CRITICAL por ser invariante financeira
explorável em processo único, mas mantenho HIGH porque a exploração exige que o
chamador dispare chamadas concorrentes sobre o mesmo fornecedor e o excesso é
limitado ao grau de concorrência — diferentemente dos CRITICAL, que se realizam
com uma única chamada trivial. Registro, porém, que este é o mais grave dos HIGH
confirmados e que sua remediação depende de evolução do handle de `db.js`,
compartilhada com FIND-SIM-002-009 e FIND-SIM-002-010.

---

## Fechamento (software-audit-director)

DATA: 2026-08-13
REMEDIATION_COMMIT ACEITO: `9ce4754` (WAVE-C)
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §1.5
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner`, harness próprio fora
do repositório

RESULTADO DO RETESTE: **RETEST_PASSED**. 3 rodadas de
`Promise.all([createPayment(8000), createPayment(8000)])` com `credit_limit =
10000` → **1 sucesso por rodada**, `SUM(amount) = 8000`; rajada de 10 chamadas
concorrentes → **1 sucesso**. Invariante `SUM ≤ credit_limit` preservada.
Não-regressão sequencial coberta pelos cenários acumulados e de fronteira
executados no reteste de FIND-SIM-002-007 (3000 aceito, 2500 recusado sobre
limite 5000; fronteira exata 3000+2000 aceitos e +0,01 recusado). Suíte 22/22.

RESSALVA METODOLÓGICA DO RUNNER, ACOLHIDA: removido o `await` que antecedia o
bloco transacional síncrono, **a janela deixou de ser fisicamente alcançável
neste modelo de execução**; logo o teste de concorrência **não distingue
"corrigido" de "não observável"**. O veredito, por isso, **não repousa** no teste
dinâmico: repousa no **item 4 da própria `RETEST_SPECIFICATION`** — verificação
estrutural de demarcação transacional efetiva —, escrito pela auditoria
justamente por antecipar esta limitação. Acrescento que a eliminação do ponto de
suspensão entre leitura e escrita é precisamente o mecanismo que o
finding-validator identificou como causa da corrida (o `await` diferindo a
continuação para a fila de microtarefas): removê-lo **remove** a corrida, não a
oculta. Limitação registrada como **OBS-SIM-002-004** (INFO) em
`31-new-findings/NEW_OBSERVATIONS.md`, para que nenhuma auditoria futura
interprete "0 estouros medidos" como prova de atomicidade multiprocesso.

DELIMITAÇÃO DO FECHAMENTO: fecha-se a corrida **intraprocesso** sobre BR-PAY-001.
A corrida **entre processos/conexões** não foi exercitada por nenhuma das partes
e **não** está coberta por este fechamento; permanece registrada na §3.2 da
`AUDIT_COVERAGE_MATRIX` e é objeto conceitual de FIND-SIM-002-010 (MEDIUM,
`PROPOSED`, aberto).

DECLARAÇÃO: **FINDING CLOSED**, nos termos da **Regra 4** do `CLAUDE.md`, com a
delimitação acima. Não constitui `REMEDIATION COMPLETE` (Regra 3) nem auditoria
do commit remediado como um todo (Regras 12-14).
