# FINDING

FINDING_ID: FIND-SIM-002-008
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: docs/API.md contradiz o código em createPayment — papel exigido e status de saída
DOMAIN: Consistência documental → **Autorização** (reclassificado em 2026-08-13)
SUBDOMAIN: Contrato de API × implementação
SEVERITY: HIGH
SEVERITY_HISTORY: HIGH (auditoria) → MEDIUM (rebaixada pelo finding-validator) → **HIGH (re-elevada em 2026-08-13 por acionamento da cláusula de reversão de severidade, após APR-2026-008)**
CONFIDENCE: CONFIRMED
STATUS: CLOSED
DETECTED_BY: documentation-consistency, traceability, authorization, business-rule, qa (5 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13
HUMAN_GATE: APR-2026-008 (`coretriad/governance/APPROVALS.md`) — 2026-08-13
REMEDIATION_COMMIT: f0aaa7a (divergência B, WAVE-A) + b6d44da (divergência A, WAVE-D)
RETEST_RESULT: RETEST_PASSED (divergências A e B)
CLOSED_BY: vericore-software-audit-director — 2026-08-13
RESIDUAL_CARVED_OUT: OBS-SIM-002-006 (convergência de `SOFTWARE_RELEASE_PACKAGE.md:28` e formalização da BR de papéis com ID)

DESCRIPTION:
O contrato publicado de `createPayment` diverge da implementação em dois pontos
independentes: o papel exigido para executar a operação e o status do pagamento
retornado. As duas divergências têm naturezas distintas — a primeira é uma
**contradição normativa sem árbitro**, a segunda é um **erro isolado do
documento**.

EXPECTED_BEHAVIOR:
Documento, contrato, DDL, dicionário e código devem descrever o mesmo
comportamento (Regra 7 do `CLAUDE.md`: artefatos versionados são a única fonte
oficial de verdade — logo não podem divergir entre si).

ACTUAL_BEHAVIOR:
Divergência A (papel) e divergência B (status), detalhadas abaixo.

## Divergência A — papel exigido (sem árbitro normativo)

EVIDENCE:
FILE: product/SIM-002/docs/API.md
LINES: 65
```
- **Papel exigido:** `manager`.
```

FILE: product/SIM-002/src/paymentService.js
LINES: 3
```js
const PAYER_ROLES = ['analyst', 'manager'];
```
Aplicado em `src/paymentService.js:41` (`!PAYER_ROLES.includes(user.role)`).

FILE: product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md
LINES: 28
```
  - Criar pagamento: `analyst`, `manager` da empresa proprietária — permitido.
```

Estado da arbitragem: **nenhuma BR define quem pode registrar pagamento**.
`BUSINESS_RULES.md` trata de alçada apenas para **aprovação** (BR-APR-001,
`:19-29`); BR-PAY-001/002 e BR-SEC-001 nada dizem sobre papel de pagamento.
REQ-SIM2-003 e AC-SIM2-003 (`REQUIREMENTS.md:33-45`) também não. Portanto há 2
artefatos a favor de `analyst`+`manager` (código, release package) e 1 a favor de
`manager` (docs/API.md), **sem norma que decida**. Contagem de artefatos não é
critério de verdade normativa.

> Estado da arbitragem em 2026-08-13: **resolvido** por **APR-2026-008** —
> escrita restrita a `manager`. Ver Fechamento.

Relevância de segurança: se o papel correto for `manager`, o defeito é de
autorização — e, combinado com FIND-SIM-002-001, o analista hoje aprova o crédito
e o consome, sem segregação de funções.

## Divergência B — status de saída (documento isolado contra 5 fontes)

EVIDENCE:
FILE: product/SIM-002/docs/API.md
LINES: 67
```
- **Saída:** pagamento com `status: "pending"`, `external_ref: null`.
```

Contra as cinco fontes concordantes em `created`:
1. `product/SIM-002/src/paymentService.js:58` — `VALUES (?, ?, ?, 'created', ?, ?)`
2. `product/SIM-002/src/schema.sql:27` — `status TEXT NOT NULL DEFAULT 'created'`
3. `product/SIM-002/requirements/DATA_DICTIONARY.md:44` — "NOT NULL, default `created` | Situação do pagamento: `created`, `sent`, `cancelled`" (o valor `pending` **não** consta da enumeração de `payments`)
4. `product/SIM-002/requirements/REQUIREMENTS.md:42-43` (AC-SIM2-003) — "então o pagamento é registrado com status `created`"
5. `product/SIM-002/tests/payments.test.js:36` — `assert.strictEqual(payment.status, 'created')`

Conclusão da trilha: `pending` é status **de fornecedor** (`DATA_DICTIONARY.md:28`),
transposto por engano para a seção de pagamento do contrato. Erro documental
isolado, sem ambiguidade normativa.

RELATED_PROCESS: Registro de pagamento / publicação de contrato de API
RELATED_BUSINESS_RULE: BR-SEC-001 (tangenciada); nenhuma BR arbitra o papel — lacuna normativa suprida por APR-2026-008 em 2026-08-13
RELATED_REQUIREMENT: REQ-SIM2-003
RELATED_USE_CASE: Criar pagamento
RELATED_ACCEPTANCE_CRITERIA: AC-SIM2-003
RELATED_TEST: TC-SIM2-003 (`tests/payments.test.js:21-41`) — usa papel `analyst` (`:29`) e assere `created` (`:36`), alinhado ao código e não ao documento

BUSINESS_IMPACT:
Divergência A: risco de que a operação esteja aberta a um papel que o negócio não
autoriza, quebrando segregação de funções entre concessão e consumo de crédito.
Divergência B: consumidores do contrato podem implementar máquinas de estado
baseadas em `pending`, um status que nunca é produzido nem aceito.

TECHNICAL_IMPACT:
O contrato de API não é confiável como especificação de integração. Um cliente
que aguarde `pending` nunca convergirá.

SECURITY_IMPACT:
Divergência A é potencialmente uma falha de autorização não decidida: enquanto
não houver norma, não é possível classificar se o código está permissivo demais
ou o documento restritivo demais.

> Atualização de 2026-08-13: com APR-2026-008 a condicional **resolveu-se contra o
> código** — a divergência A passou a ser falha de autorização **confirmada**,
> daí a re-elevação a HIGH.

REPRODUCTION:
1. `createPayment({ ..., user: { role: 'analyst', companyId: A } })` → sucesso (contra `docs/API.md:65`).
2. Inspecionar o retorno → `status === 'created'` (contra `docs/API.md:67`).

ROOT_CAUSE_HYPOTHESIS:
Contrato redigido a partir de uma versão anterior da implementação e não
reconciliado; `pending` copiado da seção de fornecedores.

REFERENCE:
- `product/SIM-002/docs/API.md:61-72`
- `product/SIM-002/requirements/REQUIREMENTS.md:33-45`
- `product/SIM-002/requirements/DATA_DICTIONARY.md:28` e `:44`
- `product/SIM-002/SOFTWARE_RELEASE_PACKAGE.md:24-29` (AUTHORIZATION_MATRIX)
- Regra 20 do `CLAUDE.md` (divergência resolve-se por evidência → teste → requisito → regra → responsável humano) e Regra 21 (contradição entre documento e código interrompe a decisão)
- `CLAUDE.md`, **Regra 24** (papel autodeclarado sem verificação server-side)
- `coretriad/governance/APPROVALS.md` — **APR-2026-008**

RECOMMENDATION:
Divergência B: corrigir `docs/API.md:67` para `status: "created"` — a fonte
autoritativa é inequívoca. Divergência A: **submeter a decisão humana**; registrar
uma BR explícita de papel para registro de pagamento e só então alinhar código e
documento à norma aprovada. A VeriCore não implementa nem arbitra.

SUGGESTED_REMEDIATION_OWNER: Divergência B → SanaCore; Divergência A → decisão humana (product owner) antes de qualquer remediação

RETEST_SPECIFICATION:
1. Divergência B: `docs/API.md` descreve `status: "created"` para `createPayment`,
   coerente com `schema.sql`, `DATA_DICTIONARY.md:44`, AC-SIM2-003 e TC-SIM2-003.
   Nenhuma ocorrência de `pending` remanescente na seção de pagamentos.
2. Divergência A (após decisão humana registrada): existe BR identificada que
   define o papel; código, `docs/API.md:65` e `SOFTWARE_RELEASE_PACKAGE.md:28`
   convergem para essa BR; e há teste negativo com papel não autorizado
   (`assert.rejects` com a mensagem de permissão).
3. Sem a decisão humana da divergência A, o finding permanece aberto ainda que a
   divergência B esteja corrigida.

---

## Validação (finding-validator)

VEREDITO: **CONFIRMED** quanto aos fatos — **severidade REBAIXADA de HIGH para
MEDIUM**, com reclassificação de natureza: trata-se de **contradição documental +
lacuna normativa**, não de defeito de autorização demonstrado.

### Releitura independente

Verifiquei as duas divergências nos arquivos, sem intermediação:
- `docs/API.md:65` diz "Papel exigido: `manager`"; `src/paymentService.js:3`
  define `PAYER_ROLES = ['analyst', 'manager']`, aplicado em `:41`;
  `SOFTWARE_RELEASE_PACKAGE.md:28` concorda com o código. Fato confirmado.
- `docs/API.md:67` diz `status: "pending"`; li as cinco fontes citadas e todas
  dizem `created` (`paymentService.js:58`, `schema.sql:27`,
  `DATA_DICTIONARY.md:44`, `REQUIREMENTS.md:42-43`, `payments.test.js:36`).
  Confirmo também que `pending` é o default de **suppliers** (`schema.sql:14`,
  `DATA_DICTIONARY.md:28`). Fato confirmado.

### Busca por árbitro normativo (o eixo decisivo)

Li `BUSINESS_RULES.md` na íntegra (48 linhas, seis BRs: BR-SUP-001, BR-SUP-002,
BR-APR-001, BR-PAY-001, BR-PAY-002, BR-SEC-001). **Nenhuma delas menciona papel
para registro de pagamento** — BR-APR-001 rege exclusivamente a *aprovação*.
Também li `REQUIREMENTS.md` (REQ-SIM2-003/AC-SIM2-003, `:33-45`): não há menção a
papel. Confirmo integralmente a conclusão do auditor: **não existe BR que
arbitre**.

### Consequência da ausência de árbitro (reclassificação)

Sem norma, não é tecnicamente demonstrável que o código esteja permissivo demais.
As duas leituras são igualmente sustentáveis pelos artefatos versionados, e a
AUTHORIZATION_MATRIX (`SOFTWARE_RELEASE_PACKAGE.md:28`) — artefato de release,
não apenas código — concorda com a implementação. Aplicando o critério de
severidade (severidade reflete o defeito **provado**, não o pior cenário
hipotético), o que está provado é:
- (A) uma contradição entre artefatos com lacuna normativa subjacente → risco de
  decisão, human gate;
- (B) um erro documental isolado, sem ambiguidade (por si só, LOW).

Nenhum dos dois é uma falha de autorização confirmada. **MEDIUM** é a severidade
sustentada pela evidência. Rejeito explicitamente o enquadramento HIGH baseado em
"se o papel correto for `manager`, então é falha de autorização": trata-se de
condicional não resolvida, e a Regra 22 exige refutação ativa antes de aceitar
severidade alta — a refutação aqui teve sucesso parcial.

### Cláusula de reversão de severidade (obrigatória)

Se a decisão humana registrar BR determinando que **somente `manager`** pode
registrar pagamento, então, **no mesmo ato**, a divergência A deixa de ser
documental e passa a ser defeito de autorização confirmado, devendo ser
**re-elevada a HIGH** (e reavaliada quanto a segregação de funções em conjunto com
FIND-SIM-002-001, cuja severidade CRITICAL não depende desta decisão). Registro
esta condição para que o consolidador e o diretor de auditoria não a percam.

### Onde procurei controle compensatório

1. **Teste que arbitrasse** — TC-SIM2-003 (`payments.test.js:21-41`) usa `analyst`
   e assere `created`: alinha-se ao código, mas teste não é norma (Regra 20 coloca
   requisito e regra acima de teste). Não arbitra.
2. **Consumidor real do contrato que sofresse com `pending`** — não há cliente de
   integração no repositório; o impacto da divergência B é potencial, não
   realizado. Reforça o rebaixamento.
3. **Outra fonte normativa fora de `product/SIM-002/`** — nada em `CLAUDE.md` nem
   nos artefatos de governança define papéis deste domínio.

### Encaminhamento

Divergência B pode seguir isoladamente à SanaCore (correção documental de uma
linha, sem invenção de regra). Divergência A **não segue** — human gate, Regra 18.

---

## Fechamento parcial (software-audit-director) — ondas A/B/C, HISTÓRICO

> Preservado como registro do estado anterior. Superado pelo **Fechamento**
> abaixo, que é a decisão vigente.

DATA: 2026-08-13
REMEDIATION_COMMIT ACEITO: `f0aaa7a` (WAVE-A) — **exclusivamente** quanto à
divergência B
RETEST_REPORT: `audit/runs/SIM-002-AUD-001/30-retest/RETEST_REPORT.md` §1.7
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner`

### Divergência B — status de saída: **RETEST_PASSED**

`docs/API.md` passa a declarar `status: "created"`, convergindo com as cinco
fontes concordantes (`paymentService.js:58`, `schema.sql:27`,
`DATA_DICTIONARY.md:44`, AC-SIM2-003 e `payments.test.js:36`). Nenhuma ocorrência
remanescente de `pending` na seção de pagamentos. Item 1 da
`RETEST_SPECIFICATION` atendido. Suíte 20/20; a alteração é documental e não
produz efeito em código.

### Divergência A — papel exigido: **ABERTA, RETEST_NOT_APPLICABLE** (à época)

A linha do papel `manager` em `docs/API.md:65` **não foi alterada**, e o runner
confirmou **empiricamente** que `analyst` consegue criar pagamento. A contradição
documento × código persiste — o que está **correto**: a decisão normativa não foi
tomada, e alterar qualquer um dos lados sem norma seria escolher arbitrariamente
entre duas leituras igualmente sustentáveis pelos artefatos versionados.

O item 2 da `RETEST_SPECIFICATION` **não é executável**: pressupõe decisão humana
registrada que institua BR de papel para registro de pagamento, e tal decisão não
existe no repositório.

### Por que o finding NÃO era fechado

O item 3 da própria `RETEST_SPECIFICATION` é terminante: *"Sem a decisão humana da
divergência A, o finding permanece aberto ainda que a divergência B esteja
corrigida."* Fechar o finding inteiro exigiria que este diretor arbitrasse, por
inferência, qual papel o negócio autoriza — vedado pela **Regra 18** e pela
**Regra 6**. A **Regra 21** manda interromper a decisão diante de contradição
entre documento e código sem fonte autoritativa, e é o que se fez.

STATUS RESULTANTE (à época): **PARTIALLY_REMEDIATED**.

---

## Fechamento (software-audit-director)

DATA: **2026-08-13**
HUMAN GATE ATENDIDO: **APR-2026-008** (`coretriad/governance/APPROVALS.md`), lida
integralmente por este diretor: **escrita** (criar e enviar pagamento) restrita a
**`manager`**; **leitura** (consultar pagamentos e fornecedores) permitida a
**`analyst` e `manager`**; e, em ambos os casos, **o papel deve ser verificado no
servidor contra fonte confiável de identidade — nunca autodeclarado pelo
cliente**. A decisão vincula-se expressamente à **Regra 24** do `CLAUDE.md` e
manda **implementar** o padrão correto, não aceitar o risco.
REMEDIATION_COMMIT ACEITO: **`b6d44da`** (WAVE-D) para a divergência A;
`f0aaa7a` (WAVE-A) para a divergência B — ambos aceitos.
RETEST_REPORT: `30-retest/RETEST_REPORT.md` §5.3
EXECUÇÃO DO RETESTE: `vericore-audit-verification-runner` — harness próprio, fora
do repositório; working tree limpo antes e depois; suíte 49/49.

### 1. Acionamento da cláusula de reversão de severidade — feito ANTES do veredito

A condição fixada pelo `vericore-finding-validator` ocorreu **literalmente**: a
decisão humana estabeleceu que somente `manager` registra pagamento. Portanto, no
mesmo ato, a divergência A deixa de ser contradição documental e passa a ser
**defeito de autorização confirmado**; a severidade é **re-elevada de MEDIUM para
HIGH**. Faço a re-elevação **antes** de julgar o reteste, deliberadamente, para
que o fechamento recaia sobre a severidade correta e não sobre a severidade
conveniente. O finding fecha como **HIGH**, não como MEDIUM.

Reavaliação de segregação de funções (exigida pela cláusula, em conjunto com
FIND-SIM-002-001): com alçada de aprovação em 10000 para `analyst` e
criação/envio de pagamento restritos a `manager`, **concessão e consumo de
crédito deixam de ser exercíveis pelo mesmo papel**. A segregação ausente passa a
existir no plano dos papéis. **Ressalva material:** ela só é efetiva se o papel
for confiável, e é exatamente esse pressuposto que o **FIND-SIM-002-014**
(`approveSupplier` com papel autodeclarado) põe em questão do lado da aprovação.

### 2. Resultado do reteste (divergência A)

- `createPayment` e `sendPayment`: `analyst` → **RECUSADO**; `manager` →
  **ACEITO**. O código convergiu para `docs/API.md:65`, isto é, para a norma
  aprovada — e não o documento para o código.
- Leitura (`getSupplier`, `listPaymentsBySupplier`): funciona para `analyst` e
  `manager`, conforme a parte de leitura da APR-2026-008. Isso **remedia também a
  OBS-SIM-002-002**, decidida no mesmo ato, como este diretor havia exigido para
  não produzir norma de papel fragmentada entre operações.
- Usuário inexistente → **RECUSADO** (*"Usuário não autenticado"*).
- **Teste decisivo de procedência do papel:** payload declarando `role:'manager'`
  **falso**, cujo registro em `users` diz `analyst` → **RECUSADO nas duas
  escritas**. O papel vem do **banco**, não do payload. É a prova da parte mais
  exigente da APR-2026-008 e da Regra 24 — obtida por **comportamento**, não por
  leitura de código, o que a torna resistente a reorganizações internas.
- Isolamento de tenant reconfirmado sem regressão no código integrado
  (RETEST_REPORT §5.4).

### 3. Decisão: fechamento **integral** (divergências A e B)

Fecho o finding **integralmente**. Fundamento e fronteira:

1. A divergência B fechou na WAVE-A. A divergência A tinha **um único obstáculo
   declarado** — a inexistência de árbitro normativo. O árbitro existe
   (APR-2026-008), o código foi alinhado **à norma**, e o alinhamento foi medido,
   inclusive contra papel forjado. A cláusula terminante do item 3 da
   `RETEST_SPECIFICATION` ("sem a decisão humana ... permanece aberto") tinha por
   condição a **ausência** da decisão; a condição cessou.
2. O que resta do item 2 da spec é **convergência documental de um terceiro
   artefato** (`SOFTWARE_RELEASE_PACKAGE.md:28`, que no `AUDIT_COMMIT` declara
   `analyst, manager` como permitidos), a **formalização da norma como BR com ID**
   em `requirements/BUSINESS_RULES.md` (Regra 17 — a Regra 18 já está satisfeita
   pelo registro em `APPROVALS.md`) e a **existência do caso negativo na suíte
   versionada**. Nenhum desses três altera o defeito de autorização, que está
   provado extinto; e nenhum é verificável por este diretor sem delta audit, já
   que a inspeção disponível no working tree corresponde ao `AUDIT_COMMIT`.
   Saem como **OBS-SIM-002-006**, com instrução expressa: se o delta audit
   encontrar `SOFTWARE_RELEASE_PACKAGE.md:28` ainda divergente, **abra-se finding
   documental próprio — este não se reabre**.
3. Manter um HIGH de autorização aberto para carregar pendência documental
   descreveria mal o risco real e é o tipo de imprecisão que esta auditoria
   recusou em outros pontos.

### 4. Autoridade e limites

`RETEST_PASSED` e `FINDING CLOSED` declarados nos termos da **Regra 4** do
`CLAUDE.md` — competência exclusiva da VeriCore, sobre o `REMEDIATION_COMMIT`
identificado `b6d44da`, com reteste independente. Este diretor **não** declara
`REMEDIATION COMPLETE` (Regra 3) e não tocou no objeto auditado (Regra 2). O
fechamento **não** implica `AUDIT_PASSED` do run — ver `30-retest/RETEST_REPORT.md`
§6.

STATUS RESULTANTE: **CLOSED** — severidade final **HIGH**.
