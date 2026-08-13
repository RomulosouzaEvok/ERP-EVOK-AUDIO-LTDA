# FINDING

FINDING_ID: FIND-SIM-002-004
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: cancelPayment é comportamento não documentado, sem autorização nem tenant, e reverte pagamento enviado para "created"
DOMAIN: Rastreabilidade / Integridade financeira
SUBDOMAIN: UNDOCUMENTED BEHAVIOR
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: traceability, documentation-consistency, authorization, data-integrity, idempotency, business-rule, database (7 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
HUMAN_GATE: APR-2026-007 (`coretriad/governance/APPROVALS.md`) — 2026-08-13
REMEDIATION_COMMIT: b6d44da (WAVE-D)
RETEST_RESULT: RETEST_PASSED
CLOSED_BY: vericore-software-audit-director — 2026-08-13
RESIDUAL_CARVED_OUT: OBS-SIM-002-007 (papel autorizado a cancelar pagamento `created` — sem árbitro normativo)

DESCRIPTION:
A função exportada `cancelPayment` não possui origem documental alguma — não há
requisito, critério de aceite, regra de negócio, entrada em `docs/API.md` nem
menção no API_CONTRACTS do release. Além de não documentada, opera sem sujeito
(não recebe `user`) e, no ramo `status === 'sent'`, reverte o pagamento para
`created` zerando `sent_at` mas **mantendo** o `external_ref`.

EXPECTED_BEHAVIOR:
Regra 6 e Regra 17 do `CLAUDE.md`: nenhum comportamento de negócio existe sem
requisito registrado. Toda operação de escrita deve identificar o sujeito e
respeitar BR-SEC-001 (`requirements/BUSINESS_RULES.md:43-47`). Nenhuma transição
de estado pode desfazer o fato de um envio já realizado ao gateway (BR-PAY-002,
`:36-41`).

ACTUAL_BEHAVIOR:
Qualquer chamador, sem identidade e sem empresa, cancela qualquer `paymentId`.
Se o pagamento estiver `sent`, ele volta a `created` com `sent_at = NULL` e
`external_ref` preservado — um pagamento já liquidado no gateway volta a parecer
não enviado, permanecendo elegível para novo `sendPayment` (que não valida
`external_ref` preexistente — FIND-SIM-002-003).

EVIDENCE:
FILE: product/SIM-002/src/paymentService.js
LINES: 124-138
```js
  function cancelPayment({ paymentId }) {
    const payment = db.get('SELECT * FROM payments WHERE id = ?', paymentId);

    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }

    if (payment.status === 'sent') {
      db.run(`UPDATE payments SET status = 'created', sent_at = NULL WHERE id = ?`, payment.id);
    } else {
      db.run(`UPDATE payments SET status = 'cancelled' WHERE id = ?`, payment.id);
    }

    return db.get('SELECT * FROM payments WHERE id = ?', payment.id);
  }
```
Verificado: assinatura em `:124` recebe apenas `{ paymentId }` — sem `user`, sem
papel, sem `company_id`; o `UPDATE` de `:132` não repõe `external_ref = NULL`.
A função é exportada em `src/paymentService.js:140`.

AUSÊNCIA DE ORIGEM DOCUMENTAL (verificada arquivo a arquivo no AUDIT_COMMIT):
- `product/SIM-002/requirements/REQUIREMENTS.md` — REQ-SIM2-001..006 (linhas 7-83); nenhum trata de cancelamento.
- `product/SIM-002/requirements/BUSINESS_RULES.md` — BR-SUP-001/002, BR-APR-001, BR-PAY-001/002, BR-SEC-001; nenhuma define semântica de cancelamento.
- `product/SIM-002/docs/API.md` — documenta 6 operações (`:26`, `:37`, `:48`, `:61`, `:74`, `:88`); `cancelPayment` **não consta**.
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:18` — API_CONTRACTS lista `createSupplier`, `getSupplier`, `approveSupplier`, `createPayment`, `sendPayment`, `listPaymentsBySupplier`; `cancelPayment` **não consta**.
- `product/SIM-002/tests/` — nenhum teste exercita a função.

ACOPLAMENTO JÁ EXISTENTE: o status `cancelled` que ela produz é consumido por
`sumCommittedAmount` (`src/paymentService.js:31`, exclui `cancelled` do crédito
comprometido) e por `sendPayment` (`:78`). Ou seja, um comportamento sem
requisito já governa o cálculo do teto de crédito e a elegibilidade de envio.

RELATED_PROCESS: Cancelamento de pagamento (processo não formalizado)
RELATED_BUSINESS_RULE: BR-SEC-001 (violada — escrita sem tenant/sujeito); BR-PAY-002 (violada por encadeamento); BR-PAY-001 (impactada — liberação de crédito sem controle)
RELATED_REQUIREMENT: **nenhum** (código sem requisito) — suprido a posteriori por APR-2026-007
RELATED_USE_CASE: **nenhum**
RELATED_ACCEPTANCE_CRITERIA: **nenhum**
RELATED_TEST: **nenhum**

BUSINESS_IMPACT:
Duplicação financeira ilimitada. Encadeado com FIND-SIM-002-003, a sequência
`sendPayment` → `cancelPayment` → `sendPayment` pode ser repetida
indefinidamente: cada iteração produz nova movimentação real no gateway,
enquanto o crédito do fornecedor é consumido **uma única vez** (o valor é
avaliado apenas na criação, e o registro nunca deixa de existir). Adicionalmente,
o ramo `else` cancela pagamentos liberando crédito comprometido sem qualquer
alçada, autorização ou trilha.

TECHNICAL_IMPACT:
Superfície pública fora do contrato declarado, portanto fora da matriz de
autorização (`SOFTWARE_RELEASE_PACKAGE.md:24-29`) e fora do plano de testes.
A reversão `sent → created` é uma transição de estado que nenhuma máquina de
estados documentada prevê (`DATA_DICTIONARY.md:44` enumera `created`, `sent`,
`cancelled` sem descrever transições).

SECURITY_IMPACT:
Escrita sem autenticação, sem autorização por papel e sem isolamento de tenant.
Com IDs sequenciais (`src/schema.sql:23`), permite manipulação de pagamentos de
qualquer empresa. A ausência de `updated_at` e de trilha de alteração
(FIND-SIM-002-012) torna a reversão **indetectável a posteriori**: após o
cancelamento de um `sent`, o registro é indistinguível de um pagamento que nunca
foi enviado, exceto pelo `external_ref` remanescente.

REPRODUCTION:
1. Criar e aprovar fornecedor com `credit_limit = 10000`; criar pagamento P de 10000.
2. `await sendPayment({ paymentId: P.id })` → gateway chamado 1×.
3. `cancelPayment({ paymentId: P.id })` → `status = 'created'`, `sent_at = null`, `external_ref` mantido.
4. `await sendPayment({ paymentId: P.id })` → gateway chamado 2×, `external_ref` sobrescrito.
5. Repetir 3–4 N vezes → N movimentações de 10000 consumindo 10000 de crédito.

ROOT_CAUSE_HYPOTHESIS:
Funcionalidade adicionada ao código sem passar pelo ciclo de requisito → AC → TC,
com semântica de reversão improvisada para o estado `sent`.

REFERENCE:
- `CLAUDE.md`, Regra 6 (nenhum agente inventa regra de negócio) e Regra 17 (tudo com ID registrado)
- `product/SIM-002/requirements/BUSINESS_RULES.md:36-47`
- `product/SIM-002/docs/API.md` (contrato completo, sem a operação)
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:18`
- `audit/runs/SIM-002-AUD-001/07-traceability/TRACEABILITY_MATRIX.md` §2.1
- `coretriad/governance/APPROVALS.md` — **APR-2026-007** (norma que passou a existir)

RECOMMENDATION:
**Não remediar antes de decisão humana.** É necessário definir formalmente se a
operação deve existir e, em caso afirmativo, sua semântica: quem pode cancelar,
se um pagamento `sent` pode ser cancelado (e se a resposta for sim, mediante qual
compensação/estorno no gateway), qual status resultante e qual trilha de
alteração. Enquanto não houver requisito aprovado, a alternativa conservadora é a
remoção da superfície pública. Definida a norma, remediar em conjunto com
FIND-SIM-002-003.

SUGGESTED_REMEDIATION_OWNER: Decisão humana (product owner) → SanaCore após requisito registrado

RETEST_SPECIFICATION:
**Bloqueado por human gate.** Este finding exige decisão humana explícita e
registrada sobre a existência e a semântica da operação **antes** de qualquer
remediação (Regra 18 do `CLAUDE.md`); nenhum reteste pode ser especificado contra
um oráculo inexistente.

Após a decisão registrada, o reteste deverá cobrir, no mínimo:
1. Se a operação for **removida**: `typeof payments.cancelPayment === 'undefined'`
   e nenhum caminho de código produz transição `sent → created`.
2. Se a operação for **mantida**: exige `user`; recusa chamador de outra empresa
   (BR-SEC-001); recusa papel sem alçada; e a sequência
   enviar → cancelar → enviar **não** produz segunda movimentação no gateway
   (`gateway.callsFor(id).length === 1`).
3. Em qualquer hipótese: nenhuma transição pode apagar `sent_at` mantendo
   `external_ref`; e a alteração deve deixar trilha auditável.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** — severidade CRITICAL **mantida**.

### Releitura independente do código

Reli `src/paymentService.js:124-141`. Confirmo: assinatura `({ paymentId })` sem
`user`; nenhuma validação de papel ou tenant; ramo `sent → created` com
`sent_at = NULL` e sem tocar `external_ref` (`:132`); ramo `else → cancelled`
(`:134`); exportada em `:140` junto com as demais operações.

### Onde procurei refutação (e o que NÃO encontrei)

1. **Origem documental** — refiz a busca por `cancelPayment` em **todo o
   repositório**. Fora da definição/export em `src/paymentService.js` e dos
   artefatos da própria auditoria, não há **nenhuma** ocorrência em
   `docs/API.md`, `README.md`, `SOFTWARE_RELEASE_PACKAGE.md`, `REQUIREMENTS.md`,
   `BUSINESS_RULES.md`, `DATA_DICTIONARY.md` ou `tests/`. Li integralmente
   `docs/API.md` (6 operações, `:26/:37/:48/:61/:74/:88`) e `README.md` — a
   operação de fato não existe em contrato algum. A alegação de "comportamento
   sem requisito" está provada.
2. **Guarda de autorização a montante** — nenhuma: sem HTTP, sem middleware, sem
   autenticação (`SOFTWARE_RELEASE_PACKAGE.md:16`, `:36`); a função é exportada e
   invocável diretamente.
3. **Defesa no banco** — `src/schema.sql` não possui `CHECK` de status nem trigger
   que barre a transição `sent → created`, nem coluna `updated_at` que a
   registrasse. Nada impede nem testemunha a reversão.
4. **Encadeamento que tornaria o defeito inócuo** — testei a hipótese de que a
   duplicação só ocorreria se FIND-SIM-002-003 também estivesse aberto. É verdade
   para o cenário de duplicação ilimitada, mas **não** neutraliza este finding:
   mesmo isolado, o ramo `else` libera crédito comprometido (consumido por
   `sumCommittedAmount`, `:31`) sem sujeito, papel, tenant ou trilha; e o ramo
   `sent` corrompe a máquina de estados apagando `sent_at` sem apagar
   `external_ref`. O dano subsiste com -003 remediado.

### Tentativa de refutação por severidade

Argumento testado: "sem requisito não há oráculo, logo isto seria apenas um
finding de rastreabilidade (MEDIUM), não um defeito". **Rejeitado**: a ausência de
requisito é agravante, não atenuante — há um comportamento **efetivo** de escrita
financeira, sem sujeito e sem trilha, já acoplado ao cálculo do teto de crédito
(`:31`) e à elegibilidade de envio (`:78`). O finding não pede correção às cegas:
corretamente aponta human gate para a semântica. CRITICAL sustentada com base no
dano executável, não na hipótese normativa.

### Observação registrada ao consolidador

Este finding e o FIND-SIM-002-003 compartilham o cenário de duplicação
encadeada, mas os defeitos são independentes e as remediações distintas.
**Não é duplicata.** O human gate declarado deve ser respeitado: nenhum
encaminhamento à SanaCore antes da decisão humana registrada sobre a existência e
a semântica da operação (Regra 18).

---

## Fechamento (software-audit-director)

DATA: **2026-08-13**
HUMAN GATE ATENDIDO: **APR-2026-007** — `cancelPayment` válido **apenas** para
pagamentos em `created`; **não existe cancelamento após `sent`** (reverter envio
seria estorno, operação distinta, fora do escopo do SIM-002). Decisão humana
explícita e registrada em `coretriad/governance/APPROVALS.md`, lida integralmente
por este diretor — Regra 18 satisfeita por leitura de artefato versionado, não
por inferência nem por memória (Regras 8 e 10).
REMEDIATION_COMMIT ACEITO: **`b6d44da`** (WAVE-D)
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §5.1
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner` — harness próprio, fora
do repositório; código do `AUDIT_COMMIT` extraído via `git show` para comparação
antes/depois; working tree limpo antes e depois.

### Resultado do reteste

| Cenário | `f2fcf1c` (antes) | `b6d44da` (depois) |
|---|---|---|
| Cancelar pagamento `created` | `cancelled` | `cancelled` — preservado |
| Cancelar pagamento `sent` | **revertia** para `created`, zerava `sent_at`, mantinha `external_ref` | **RECUSADO**: *"Pagamento já enviado não pode ser cancelado; estorno é operação distinta"*; estado permanece `sent` |
| Chamada cross-tenant | aceita (sem `user`, sem `company_id`) | **RECUSADA** — BR-SEC-001 |

A diferença antes/depois está **comprovada por execução** sobre os dois estados
do código, e não por leitura do diff — é o que dá a este fechamento valor
probatório e não meramente declaratório. Suíte 49/49; não-regressão da integração
verificada em §5.4 do RETEST_REPORT.

Itens da `RETEST_SPECIFICATION` (hipótese 2 — operação mantida): exige `user`
→ atendido; recusa chamador de outra empresa → atendido; sequência
enviar→cancelar→enviar sem segunda movimentação → atendido **por extinção do
caminho**; item 3 (nenhuma transição apaga `sent_at` mantendo `external_ref`) →
atendido por remoção da transição.

### O que está fechado

(i) A transição `sent → created`; (ii) a duplicação financeira ilimitada
encadeada com FIND-SIM-002-003; (iii) a escrita sem sujeito e sem tenant;
(iv) a ausência de origem normativa — que deixou de existir com APR-2026-007.

### O que NÃO está fechado e sai como item próprio

**Qual papel pode cancelar um pagamento `created`.** A APR-2026-007 definiu
*quais estados* são canceláveis; **não** definiu *quem* cancela. O item da
`RETEST_SPECIFICATION` "recusa papel sem alçada" permanece, portanto, sem oráculo,
e este diretor **não** o supre por analogia com a APR-2026-008 (que trata de
pagamento, não de cancelamento) — Regras 6 e 18. Registrado como
**OBS-SIM-002-007** em `31-new-findings/NEW_OBSERVATIONS.md`, escalado a human
gate. Impacto residual: cancelar `created` libera crédito comprometido
(`paymentService.js:31`) sem alçada e, enquanto FIND-SIM-002-012 estiver aberto,
sem trilha. **Sem duplicação financeira nesse caminho.**

Igualmente não coberta: a segunda metade do item 3 da spec ("a alteração deve
deixar trilha auditável") — permanece endereçada por FIND-SIM-002-012, aberto.

### Por que isso não impede o fechamento

O **objeto** deste finding — comportamento sem requisito, revertendo envio, sem
sujeito, com duplicação financeira encadeada — está extinto e provado extinto.
Manter um CRITICAL aberto para carregar uma pendência normativa distinta (papel de
cancelamento, sem dano financeiro demonstrado) descreveria mal o risco e degradaria
a precisão do registro de auditoria. Diferentemente do FIND-SIM-002-008 nas ondas
anteriores, cuja `RETEST_SPECIFICATION` continha cláusula **terminante** de não
fechamento, a spec deste finding enuncia **cobertura mínima** de reteste.

### Efeito colateral registrado

Com a recusa de cancelar pagamento `sent`, o caminho enviar→cancelar→enviar deixou
de existir e a **OBS-SIM-002-003** extingue-se por **perda de objeto** — registrado
e não presumido, como a própria observação exigia. Ver RETEST_REPORT §5.2.

### Autoridade

`RETEST_PASSED` e `FINDING CLOSED` declarados nos termos da **Regra 4** do
`CLAUDE.md` — competência exclusiva da VeriCore. Este diretor **não** declara
`REMEDIATION COMPLETE` (Regra 3, autoridade da SanaCore) e não alterou o objeto
auditado (Regra 2).

STATUS RESULTANTE: **CLOSED** (com as delimitações acima).
