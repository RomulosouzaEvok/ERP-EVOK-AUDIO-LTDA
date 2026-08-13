# FINDING

FINDING_ID: FIND-SIM-002-009
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: sendPayment marca status "sent" mesmo com recusa do gateway, e persiste tentativa e pagamento sem transação
DOMAIN: Integridade de dados
SUBDOMAIN: Máquina de estados / atomicidade de integração
SEVERITY: HIGH
SEVERITY_HISTORY: HIGH (auditoria) → MEDIUM (rebaixada pelo finding-validator) → **HIGH (re-elevada em 2026-08-13 por acionamento da cláusula de re-elevação, condição (b): APR-2026-009 normatizou o estado sob recusa)**
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: data-integrity, idempotency, database, business-rule (4 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
HUMAN_GATE: APR-2026-009 (`coretriad/governance/APPROVALS.md`) — 2026-08-13
REMEDIATION_COMMIT: b6d44da (WAVE-D)
RETEST_RESULT: RETEST_PASSED
CLOSED_BY: vericore-software-audit-director — 2026-08-13
RESIDUAL_CARVED_OUT: OBS-SIM-002-008 (atomicidade não evidenciada; `CHECK` de status sem migração para bases preexistentes; ausência de política de retentativa para pagamento `failed`)

DESCRIPTION:
`sendPayment` calcula corretamente o resultado da tentativa (`accepted`/`failed`)
e o registra na trilha, mas atualiza o pagamento para `status = 'sent'`
incondicionalmente — inclusive quando o gateway recusa. Adicionalmente, o
`INSERT` em `payment_attempts` e o `UPDATE` em `payments` são duas escritas
independentes, sem transação: uma falha entre elas deixa estado parcial.

EXPECTED_BEHAVIOR:
O estado persistido deve refletir o resultado real da integração. As duas
escritas que compõem o efeito de um envio devem ser atômicas.

Ressalva material: **nenhum requisito define o estado do pagamento sob recusa do
gateway.** REQ-SIM2-004 e AC-SIM2-004 (`requirements/REQUIREMENTS.md:47-58`)
descrevem apenas o caminho de aceite; `docs/API.md:74-86` idem; `DATA_DICTIONARY.md:44`
enumera somente `created`, `sent`, `cancelled` — não há status de falha. Trata-se,
portanto, também de uma **lacuna normativa**.

> Lacuna suprida em 2026-08-13 por **APR-2026-009**: criado o estado **`failed`**
> no domínio de `payments.status`. Ver Fechamento.

ACTUAL_BEHAVIOR:
Com `response.accepted === false`, a trilha grava `result = 'failed'` e o
pagamento assume `status = 'sent'` com `external_ref` e `sent_at` preenchidos.
A base afirma que o pagamento foi enviado com sucesso enquanto a trilha afirma o
contrário — contradição interna persistida.

EVIDENCE:
FILE: product/SIM-002/src/paymentService.js
LINES: 88-102
```js
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
```
Verificado: a decisão `accepted ? 'accepted' : 'failed'` existe em `:93` (logo o
código reconhece a possibilidade de recusa), mas o `UPDATE` de `:97-102` fixa
`'sent'` literal, sem consultar `response.accepted`. As duas chamadas `db.run`
(`:88` e `:97`) não estão envolvidas por transação — o handle de `src/db.js:20-38`
sequer expõe primitiva transacional.

FILE: product/SIM-002/src/gatewayClient.js
LINES: 25
```js
    return { accepted: true, externalRef };
```
O stub **sempre** devolve `accepted: true`. Consequência de auditoria: o ramo de
recusa é **inalcançável em teste** com o cliente atual — o defeito não pode ser
demonstrado dinamicamente sem substituir o gateway por um duplo de teste, e o
comportamento do gateway real não é auditável neste escopo.

RELATED_PROCESS: Envio de pagamento ao gateway externo
RELATED_BUSINESS_RULE: BR-PAY-002 (integridade do envio); lacuna normativa — nenhuma BR define o estado sob recusa (suprida por APR-2026-009)
RELATED_REQUIREMENT: REQ-SIM2-004
RELATED_USE_CASE: Enviar pagamento ao gateway
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-004 (cobre apenas o caminho de aceite)
RELATED_TEST: TC-SIM2-004 (`tests/payments.test.js:84-111`) — exercita apenas o aceite; assere `result === 'accepted'` (`:106`)

BUSINESS_IMPACT:
Pagamento recusado pelo gateway é contabilizado como enviado. O fornecedor
aparece como pago sem ter recebido, e o pagamento não é reprocessado — perda
silenciosa de obrigação financeira. Conciliação divergente entre sistema e
extrato do gateway.

TECHNICAL_IMPACT:
Máquina de estados sem representação para falha de integração. Estado parcial
possível: `payment_attempts` gravado sem o `UPDATE` correspondente (ou o inverso,
em outra ordem de falha), sem mecanismo de reconciliação. Combina-se com
FIND-SIM-002-003: ausência de idempotência somada a estado incorreto impede
qualquer estratégia segura de retentativa.

SECURITY_IMPACT:
Trilha de auditoria internamente contraditória (`payments.status` versus
`payment_attempts.result`) compromete a confiabilidade do registro financeiro
como evidência.

REPRODUCTION:
Requer duplo de teste do gateway que devolva `{ accepted: false, externalRef }`:
1. Criar pagamento P.
2. `await sendPayment({ paymentId: P.id })` com o gateway recusando.
3. Observado: `payments.status = 'sent'`, `sent_at` preenchido, `external_ref`
   preenchido; `payment_attempts.result = 'failed'`.
4. Esperado: pagamento **não** em `sent` (estado a ser normatizado).

ROOT_CAUSE_HYPOTHESIS:
`UPDATE` escrito para o caminho feliz e nunca condicionado ao resultado; ausência
de requisito para o caminho de exceção; stub que impossibilita a detecção pelo
teste.

REFERENCE:
- `product/SIM-002/requirements/REQUIREMENTS.md:47-58` (REQ-SIM2-004 / AC-SIM2-004)
- `product/SIM-002/requirements/DATA_DICTIONARY.md:44` e `:59`
- `product/SIM-002/docs/API.md:74-86`
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:36` (KNOWN_LIMITATIONS: gateway simulado, sem integração real)
- `coretriad/governance/APPROVALS.md` — **APR-2026-009**

RECOMMENDATION:
Duas ações distintas: (a) **normativa** — registrar requisito/BR definindo o
estado do pagamento sob recusa do gateway e a política de retentativa; (b)
**técnica** — condicionar o `UPDATE` ao resultado da integração e tornar as duas
escritas atômicas. A ação (b) não deve ser executada antes de (a), sob pena de o
remediador inventar regra de negócio (Regra 6 do `CLAUDE.md`). A VeriCore não
implementa nem define a regra.

SUGGESTED_REMEDIATION_OWNER: Definição normativa → decisão humana (product owner); implementação → SanaCore

RETEST_SPECIFICATION:
1. Com duplo de gateway devolvendo `{ accepted: false }`: o pagamento **não**
   assume `status = 'sent'` e assume o estado definido pela norma aprovada;
   `sent_at` permanece nulo.
2. `payment_attempts` registra `result = 'failed'` — a trilha e o estado do
   pagamento devem ser mutuamente coerentes (asserção cruzada explícita).
3. Atomicidade: simulando falha entre as duas escritas, nenhuma delas persiste
   (não pode existir tentativa sem atualização de pagamento, nem o inverso).
4. Não-regressão: com gateway aceitando, TC-SIM2-004 continua verde.
5. Pré-condição do reteste: existir requisito registrado que defina o estado sob
   recusa — sem ele, o reteste não pode ser considerado válido.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** quanto ao defeito principal — **severidade REBAIXADA de
HIGH para MEDIUM**. A subalegação de atomicidade é **parcialmente refutada** e
rebaixada a observação residual.

### Releitura independente

Reli `src/paymentService.js:72-105` e `src/gatewayClient.js:1-46`. O fato central
é estaticamente provado e não depende de execução: o `UPDATE` (`:97-102`) grava a
literal `'sent'` sem qualquer referência a `response.accepted`, enquanto o
`INSERT` imediatamente anterior (`:93`) avalia `response.accepted`. O código
reconhece a recusa na trilha e a ignora no estado. Confirmado.

### Refutação 1 — alcançabilidade (bem-sucedida, motiva o rebaixamento)

`createGatewayClient` é a **única** implementação de gateway do repositório e
`submitPayment` retorna `{ accepted: true, externalRef }` incondicionalmente
(`src/gatewayClient.js:25`); os únicos caminhos de erro (`:14-19`) lançam exceção
antes de qualquer escrita — e uma exceção ali aborta `sendPayment` sem persistir
nada, o que é comportamento seguro. Conclusão: **dentro do AUDIT_COMMIT, o ramo
de recusa é inalcançável**; o defeito é latente, não explorável. O próprio finding
admite que a reprodução exige substituir o gateway por um duplo de teste — ou
seja, exige **modificar o objeto auditado** para se manifestar. Trata-se de um
controle compensatório acidental (não intencional, não documentado como
mitigação), mas efetivo no escopo auditado. Isso é incompatível com HIGH.

### Refutação 2 — atomicidade das duas escritas (bem-sucedida em parte)

A alegação "duas escritas sem transação ⇒ estado parcial" foi testada contra o
driver real: `db.run` (`src/db.js:23-25`) é **síncrono** (`DatabaseSync`), e as
duas chamadas (`:88` e `:97`) são **estritamente consecutivas**, sem `await`,
sem I/O e sem chamada de função interveniente. Não existe, portanto, ponto de
intercalação em processo único — diferentemente de `createPayment`
(FIND-SIM-002-006), onde há `await` entre leitura e escrita. O estado parcial
exigiria: (i) queda do processo entre duas instruções síncronas adjacentes, ou
(ii) exceção lançada pelo `INSERT`/`UPDATE` (possível, mas sem constraints
declaradas no schema que a provoquem), ou (iii) escrita concorrente por outro
processo sobre o mesmo arquivo `.db` — cenário que não intercala **estas** duas
instruções, apenas concorre com elas. Janela real: desprezível. Rebaixo esta
subalegação a **observação residual (LOW)**; a demarcação transacional continua
sendo boa prática recomendável, mas não sustenta severidade.

### Refutação 3 — lacuna normativa

Confirmei, lendo `REQUIREMENTS.md:47-58`, `docs/API.md:74-86`,
`BUSINESS_RULES.md` (integral) e `DATA_DICTIONARY.md:44`, que **nenhum artefato
define o estado do pagamento sob recusa**. Não há oráculo. Um finding não pode
sustentar severidade alta contra um comportamento cujo "esperado" ainda não
existe. Isso não anula o finding — a contradição interna persistida
(`payments.status = 'sent'` versus `payment_attempts.result = 'failed'`) é
demonstravelmente incoerente sob qualquer norma futura razoável — mas confirma o
enquadramento como **defeito latente + lacuna normativa**, MEDIUM.

### O que NÃO refutou o finding

- Não há tratamento do resultado em nenhuma outra camada: nenhum consumidor de
  `payment_attempts`, nenhum processo de reconciliação, nenhum job de retentativa
  no repositório (grep: `payment_attempts` só aparece em `schema.sql`,
  `paymentService.js`, testes e documentação).
- Não há `CHECK`/trigger no banco que impeça `status = 'sent'` com tentativa
  `failed`.
- Nenhum teste exercita recusa (impossível com o stub atual).
Logo o defeito é real; apenas não é atualmente alcançável.

### Cláusula de re-elevação (obrigatória)

Este finding **deve ser re-elevado a HIGH** — sem necessidade de nova auditoria —
no momento em que qualquer das condições ocorrer: (a) substituição do
`gatewayClient` por integração real ou por qualquer cliente capaz de retornar
`accepted: false`; (b) registro de requisito que normatize o estado sob recusa.
Registro a condição para o consolidador e para o diretor de auditoria.

### Encaminhamento

Ação (a) normativa: human gate (Regra 18) — **não** segue à SanaCore.
Ação (b) técnica: só após (a), sob pena de o remediador inventar regra (Regra 6).

---

## Fechamento (software-audit-director)

DATA: **2026-08-13**
HUMAN GATE ATENDIDO: **APR-2026-009** (`coretriad/governance/APPROVALS.md`), lida
integralmente: adiciona o estado **`failed`** ao domínio de `payments.status`
(antes `created`/`sent`/`cancelled`), porque **recusa do gateway é causa distinta
de cancelamento e deve ser rastreável separadamente**.
REMEDIATION_COMMIT ACEITO: **`b6d44da`** (WAVE-D)
RETEST_REPORT: `30-retest/RETEST_REPORT.md` §5.5
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner` — harness próprio, fora
do repositório; código do `AUDIT_COMMIT` extraído via `git show`; working tree
limpo antes e depois; suíte 49/49.

### 1. Acionamento da cláusula de re-elevação — feito ANTES do veredito

A condição (b) da cláusula ocorreu literalmente: a APR-2026-009 **é** o registro
normativo do estado sob recusa. A condição (a) também se realizou no plano de
teste — foi o duplo de gateway capaz de devolver `accepted:false` que tornou o
defeito, enfim, **alcançável**. Severidade **re-elevada de MEDIUM para HIGH**
antes do julgamento do reteste, para que o fechamento recaia sobre a severidade
correta. O finding fecha como **HIGH**.

### 2. Resultado do reteste — evidência antes/depois

| Cenário: gateway **recusa** | `f2fcf1c` (antes) | `b6d44da` (depois) |
|---|---|---|
| `payments.status` | **`sent`** (contradizendo a trilha) | **`failed`** |
| `payments.external_ref` | preenchido | **`null`** |
| `payments.sent_at` | preenchido | **`null`** |
| `payment_attempts.result` | `failed` | `failed` |

A diferença está **comprovada por execução** nos dois estados do código. Registro
um ganho probatório específico: a auditoria original só pôde provar este defeito
**estaticamente**, porque o stub tornava o ramo de recusa inalcançável — a
limitação declarada na própria EVIDENCE. O reteste o provou **dinamicamente**,
encerrando essa limitação para este ponto.

Itens da `RETEST_SPECIFICATION`: item 1 → atendido (com o reforço de
`external_ref` nulo, o que evita contaminar conciliação futura com referência de
gateway inexistente); item 2 (coerência cruzada trilha × estado) → atendido;
item 4 (não-regressão com gateway aceitando) → atendido (49/49 e RETEST_REPORT
§5.4); item 5 (pré-condição normativa) → atendido por APR-2026-009 — sem ela o
reteste seria inválido, com ela é válido.

### 3. O que NÃO está coberto por este fechamento

- **Item 3 — atomicidade** (falha simulada entre as duas escritas): **não
  evidenciada**. Não a converto em bloqueio porque o próprio finding-validator já
  a havia **rebaixado a observação residual LOW**, demonstrando que `db.run` é
  síncrono e as chamadas consecutivas, com janela desprezível em processo único.
  Transformar agora em condição de fechamento uma subalegação refutada por
  evidência seria incoerente com a validação deste mesmo finding.
- **Migração do `CHECK` de `payments.status`**: a constraint **não retroage a
  bases preexistentes** — não há script de migração. Em base já povoada, o novo
  domínio não é imposto.
- **Política de retentativa/expiração para pagamento `failed`**: inexistente. O
  estado `failed` cria uma pergunta que antes não existia — o que fazer com o
  pagamento recusado — e a norma aprovada não a responde. **Não é defeito do que
  foi remediado**; é lacuna normativa nova, e por isso segue a human gate como
  observação, não como finding.

Os três itens vão para **OBS-SIM-002-008** em
`31-new-findings/NEW_OBSERVATIONS.md`.

### 4. Autoridade e limites

`RETEST_PASSED` e `FINDING CLOSED` declarados nos termos da **Regra 4** do
`CLAUDE.md`, sobre o `REMEDIATION_COMMIT` identificado `b6d44da`, com reteste
independente. Este diretor **não** declara `REMEDIATION COMPLETE` (Regra 3) e não
alterou o objeto auditado (Regra 2). O fechamento **não** implica `AUDIT_PASSED`
do run — ver `30-retest/RETEST_REPORT.md` §6.

STATUS RESULTANTE: **CLOSED** — severidade final **HIGH**.
