# FINDING

FINDING_ID: FIND-SIM-002-008
AUDIT_ID: SIM-002-AUD-001
AUDIT_COMMIT: f2fcf1c78a6a1255738d05e66a6100fa9c47428a
PROJECT_ID: SIM-002
TITLE: docs/API.md contradiz o código em createPayment — papel exigido e status de saída
DOMAIN: Consistência documental
SUBDOMAIN: Contrato de API × implementação
SEVERITY: MEDIUM
SEVERITY_ORIGINAL: HIGH (rebaixada pelo finding-validator — ver Validação)
CONFIDENCE: CONFIRMED
STATUS: CONFIRMED
DETECTED_BY: documentation-consistency, traceability, authorization, business-rule, qa (5 de 8 trilhas)
VALIDATED_BY: vericore-finding-validator
VALIDATION_DATE: 2026-08-13

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
RELATED_BUSINESS_RULE: BR-SEC-001 (tangenciada); nenhuma BR arbitra o papel — lacuna normativa
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
