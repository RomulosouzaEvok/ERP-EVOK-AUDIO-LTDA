# AUDIT_COVERAGE_EXECUTED — ERP-LEGACY-001-AUD-001 (**COBERTURA EXECUTADA**)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f  (única referência de leitura)
TRILHA:        T-26 — CONSOLIDAÇÃO E COBERTURA EXECUTADA (onda W4)
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
NATUREZA:      cobertura EXECUTADA × PLANEJADA, célula a célula. Este documento NÃO
               é fieldwork, NÃO emite finding, NÃO altera severidade de trilha sem
               registro, NÃO corrige o objeto auditado (Regra 2) e NÃO declara
               AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED nem FINDING CLOSED
               (Regras 3, 4, 18).
PAR OBRIGATÓRIO: 07-findings/T-26_CONSOLIDACAO.md (inventário consolidado)
```

**Conjunto normativo lido em bloco (cláusula de conjunto vinculante, `AUDIT_PLAN_EMENDA_02.md` §0):**
`02-plan/AUDIT_PLAN.md` + `02-plan/AUDIT_COVERAGE_MATRIX.md` + `02-plan/AUDIT_PLAN_EMENDA_01.md` +
`02-plan/AUDIT_PLAN_EMENDA_02.md`. Onde divergirem, prevalece a emenda de numeração mais alta,
e a divergência é registro obrigatório. Todas as divergências que encontrei estão em §7.

**Fato de base, verificado pelo orquestrador nesta sessão e registrado com cadeia de custódia
declarada (não é evidência produzida por este agente):**
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` →
**saída vazia**. O código no worktree é idêntico ao `AUDIT_COMMIT` nos caminhos auditados; a
equivalência de leitura declarada em `AUDIT_PLAN.md` §2.2 (fechamento de **L2**) permanece válida
nesta data. Isto **não** supre G7 (Regra 18) e **não** altera `RES-12`.

---

## 0. O que este documento é, e a regra que o governa

**É:** a medição do que foi **de fato** coberto, por trilha e por dimensão, contra o que a matriz
**planejada** (pós-EMENDA-01 e pós-EMENDA-02) prometeu. Cada célula tem um dos valores:

| Valor | Significado |
|---|---|
| **E** | Exaustivo — 100% da população declarada, sem amostragem |
| **A(n/N)** | Amostral executado, com número nominal medido |
| **R** | Raso — só presença, nunca reportável como "auditado" |
| **N(motivo)** | Não coberto, com motivo |
| **DYN-PEND** | A dimensão exige evidência dinâmica que **não foi executada** |

**Regra que este documento aplica sem exceção** (`AUDIT_PLAN.md` §4.5, T-26):
> **Divergência entre planejada e executada é registro obrigatório, nunca ajuste retroativo do
> plano.** Nenhuma célula deste documento foi arredondada para cima. Onde a trilha entregou menos
> do que a matriz prometeu, o número entregue é o que consta, e o déficit é nominal.

**Fonte de cada célula:** a **declaração de cobertura da própria trilha**, no seu relatório em
`07-findings/`. Eu **não** reauditei nenhuma superfície do produto para preencher esta matriz —
ver §9 (limites deste agente).

---

## 1. Onda W0 — Fundação

| Item planejado | Prometido | **Executado** | Divergência |
|---|---|---|---|
| RA-01…RA-06 — re-ancorar `FIND-ERP-002/005/006/007/008/009` | E 6/6 | **E 6/6 — `ÂNCORAS_VÁLIDAS`** (`T-00_REANCHORING_REPORT.md` §0, §3.2-§3.7) | nenhuma |
| RA-07 — verificar independentemente a re-ancoragem SanaCore do `FIND-ERP-001` | E 1/1 | **E 1/1 — `ÂNCORAS_VÁLIDAS`, confirmação independente sem divergência** (§3.1) | nenhuma |
| Reconciliação dos 8 arquivos de `3dee99f` com as âncoras dos 7 findings | E | **E — interseção vazia em `server/src`, `server/migrations`, `server/database`, `client/src`, `*.sql`, `server/tests`** (§2.2 + §2.4 ADENDO-02) | nenhuma |
| Reexecução de E1 no início do fieldwork (EMENDA-02 §10.2.2) | obrigatória | **CUMPRIDA** — E1 vazia; worktree SanaCore isolada (`E-WT`) | nenhuma |
| DYN-01 (custódia VeriCore da evidência de `.git`) | condicionada a G4 | **NÃO EXECUTADA** — substituição declarada (§1.3) | declarada, não silenciosa |
| Congelamento do manifesto de evidência | — | **A CARGO** do `vericore-audit-evidence-controller` — **não consta como concluído** | **lacuna aberta** |

### 1.1 Registro exigido — estado real da re-ancoragem dos 7 findings (item 7 do mandato)

O `PROJECT_STATE.md:618-630` (**OBS-INV-01**) afirma: *"apenas `FIND-ERP-001` foi re-ancorado (pela
triagem do CASE-001). Os outros 6 **não**. […] Re-ancoragem dos 6 é item do plano."*

**Verificação própria contra `T-00_REANCHORING_REPORT.md`:** essa afirmação descreve o estado
**anterior à execução de W0** e **está superada pelo fato**. T-00 executou RA-01 a RA-07 e registrou
veredito individual para **7 de 7**, todos `ÂNCORAS_VÁLIDAS`, **zero** `ÂNCORAS_DERIVADAS`, **zero**
`ÂNCORAS_INVÁLIDAS` (§0, tabela de sumário; §3.1 a §3.7, âncora por âncora relida no `AUDIT_COMMIT`).

**Estado real, para o registro:**

| Finding | Re-ancorado por VeriCore (T-00)? | Profundidade declarada pelo próprio T-00 |
|---|---|---|
| FIND-ERP-001 (CRITICAL) | **SIM** — RA-07 | 14 arquivos / 24 faixas; **confirmação independente** da triagem SanaCore, que entrou como hipótese e nunca como prova |
| FIND-ERP-002 (HIGH) | **SIM** — RA-01 | 5 arquivos / 12 faixas + varredura própria (`CREATE TRIGGER\|CREATE RULE\|REVOKE` = 13 no dump inteiro) |
| FIND-ERP-005 (CRITICAL) | **SIM** — RA-02 | 9 arquivos / 17 faixas; leitura na árvore de `main`, **jamais** na worktree SanaCore |
| FIND-ERP-006 (HIGH) | **SIM** — RA-03 | **amostra dirigida às âncoras load-bearing** — 5 arquivos / 8 faixas. Declarado pelo próprio T-00 como não exaustivo |
| FIND-ERP-007 (MEDIUM) | **SIM** — RA-04 | 3 arquivos / 5 faixas (as 3 load-bearing). Âncoras **documentais** (`BLOCO_6_RH_API.md`) **não** reconferidas por T-00 — delegadas a T-17/T-23 |
| FIND-ERP-008 (HIGH) | **SIM** — RA-05 | 4 arquivos / 6 faixas, server **e** client. `legalDeadlineService.ts`, `sst-accident.test.ts` e âncoras documentais **não** reconferidas — delegadas a T-12/T-20/T-23 |
| FIND-ERP-009 (HIGH) | **SIM** — RA-06 | alegação de exaustividade **reproduzida por varredura própria** (4 call sites de `assertApproverIsNotRequester`); **23 das 28 linhas da tabela do finding não reconferidas** — delegadas a T-09 |

**Correção formal a registrar:** o `PROJECT_STATE.md` §OBS-INV-01 está **desatualizado** quanto ao
placar de re-ancoragem (diz 1/7; o executado é 7/7). Isso **não é finding** e **não é corrigível por
mim** — `coretriad/` é namespace do CoreTriad Director (Regra 16). **Escalo ao director** para
atualização por adição rastreável, nunca por reescrita silenciosa.

**O que a re-ancoragem 7/7 NÃO significa, declarado para não ser lido a mais:** re-ancoragem é
verificação de que a **citação arquivo:linha confere no `AUDIT_COMMIT`**. Não é validação de mérito
(T-25), não é remediação, não é `RETEST_PASSED` e não fecha nada (T-00 §6). Três dos sete (006, 007,
008, 009) tiveram reconferência **dirigida**, não exaustiva, e o próprio T-00 declarou isso por
finding — esse recorte permanece como cobertura parcial e está em §8 (`RES-T26-05`).

---

## 2. Onda W1 — Tier 1 (PRODUÇÃO REAL) + authZ transversal

Matriz planejada: **100% E em 10/10 dimensões, zero amostragem** (`AUDIT_COVERAGE_MATRIX.md` §3).
Nenhuma das 137 células elevadas pela EMENDA-02 pertence a W0/W1 (EMENDA-02 §10.1.2) — logo, o
planejado de W1 é o do plano original.

| Trilha | Superfície | D1 authN/authZ | D2 contrato/validação | D3 regra de negócio | D4 transação/idemp. | D5 dados | D6 audit log | D7 testes | D8 doc×código | D9 appsec | D10 camadas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **T-01** `items`/`categories`/`departments` | 22 end. | **E 22/22** | **E 22/22** | **A(3 BRs)** ⚠ | **E 22/22** | **E 4 models** | **E 22/22** | **E** (existência) | **A** ⚠ | **A** ⚠ | **E** |
| **T-02** `auth`/`users` | 15 end. | **E 15/15** | **E 15/15** | **E 39/39 BR-IAM** | **E** | **E** | **E 15/15** | **E** (4 suítes; lacuna nominal: 0 casos cobrem `POST /login`) | **E** | **E** | **E** |
| **T-03** `auditLogs` + `auditLogService.ts` | 2 end. + 403 ocorr. | **E** | **E** | **E** | **E** (prova estrutural) | **E** | **E — 362/362 call sites classificados por prova estrutural** | **E** | **E** | **E** | **E** |
| **T-04** middlewares + `app.ts` | 681 rotas / 65 `app.use` | **E 681/681 + 65/65** | — | — | **A dirigida (pontos de alçada)** ⚠ | — | — | — | — | **E** | — |
| **T-05** fluxo item↔produto↔recebimento | 8 arq. `3dee99f` + fluxo | **N** (delegado a T-04) | parcial | **E** (RA-08: 14 regras extraídas) | **E** (atomicidade ponta a ponta) | **E** (larguras de coluna) | parcial | **E** | — | — | — |

**Divergências de W1, nominais:**

- **T-01 D3/D8/D9 — planejado E 10/10, executado profundidade dirigida em 3 dimensões.** A própria
  trilha declara: *"Declarar E nessas três seria a promessa vazia do SIM-002"* (`T-01` §5). D3 = 3 BRs
  validadas (as 164 são de T-14); D8 = só divergências internas (varredura é T-23); D9 = só os
  arquivos lidos (varredura transversal é T-18). **Nenhuma célula em branco, nenhum endpoint sem
  verificação** — o déficit é de **profundidade por dimensão**, não de superfície.
- **T-04 D4 amostral dirigida.** A trilha declara (§9(a)): *"a profundidade D4 foi verificada por
  amostra dirigida nos pontos de alçada, não exaustivamente"*. O plano não exigia D4 de T-04, mas a
  trilha registrou o recorte — registro mantido.
- **T-04 entregou MAIS que o planejado em dois pontos:** o censo de atos aprovatórios (EMENDA-01
  §D.3) foi **recontado** — **63 endpoints em nível `approve`**, não os "~55" da fonte externa, com
  superfície total de ato aprovatório ≈83; e a trilha descobriu a **âncora A4** (`importProcessController.ts:56`),
  não declarada pelo insumo. **Divergência registrada, não ajuste.**
- **T-04 corrigiu o denominador do escopo:** `financial/routes/cnab.ts` (8 endpoints) **não é montado**
  ⇒ **673 endpoints alcançáveis, não 681**. T-07 e T-17 confirmaram por leitura própria e
  independente. **Toda métrica de cobertura que use 681 como denominador está inflada em 8.**
- **T-05 declarou um vão de titularidade que precisa de decisão:** auditou o **fluxo**, não a matriz
  endpoint×dimensão dos 9 endpoints de `products` e 7 de `assets`; o plano os coloca em T-10/T-16.
  T-16 **não** os cobriu (estão na faixa "já cobertos por outras trilhas" da aritmética 174+44+43).
  **Resultado: 16 endpoints de `products`/`assets` sem matriz endpoint×dimensão em nenhuma trilha.**
  Registrado em §8 como `RES-T26-01`.
- **T-05 registrou dupla alocação de plano:** `uploadService.ts` aparece em **duas** células de
  titularidade (T-18 §D9 e T-24 integrações), contra a regra de completude de `AUDIT_PLAN.md:614-617`
  ("exatamente uma célula"). **Não produziu vão** (ambas as trilhas o leram), mas produziu o risco
  simétrico. **Desambiguação registrada aqui:** T-18 cobriu upload como superfície de segurança
  (magic bytes, extensões, MIME); T-24 cobriu como integração (degradação, silêncio controlado).
  Nenhum ponto ficou descoberto; a regra de plano foi violada e o efeito é nulo.

---

## 3. Onda W2 — Tier 2 e superfícies transversais

Matriz planejada **pós-EMENDA-02**: D3 e D4 elevados a **E** em `juridico` (75), `rh` (57), `sst` (75),
`treasury` (11), `accounting` (11), `budget` (6), `rfq` (7), `suppliers` (6), `masterProduction` (7)
— células C-01…C-15. D9 elevado a **E** em 19 módulos por varredura transversal de T-18 — C-16…C-34.

| Trilha | Superfície | D1 | D2 | D3 | D4 | D5 | D6 | Estado declarado pela trilha |
|---|---|---|---|---|---|---|---|---|
| **T-06** `inventory` 27 + `mobileInventory` 3 + `traceability` 3 | 33 end. | **E 33/33** | **E** | **E** | **E 17/17 escritas classificadas** | parcial (→T-13) | parcial (→T-03) | `READY_TO_CLOSE_BLOCKED_BY_G4` |
| **T-07** `financial` 30 + `treasury` 11 + `accounting` 11 + `budget` 6 | 58 declarados / **50 alcançáveis** | **E** | **A — validators lidos em superfície** ⚠ | **E** (C-07/08/09 cumpridas) | **E** | N (→T-13) | parcial | `READY_TO_CLOSE_BLOCKED_BY_G4`; pedido de +0,5 S para fechar D2 |
| **T-08** `fiscal` | 2 declarados / **6 rotas em 3 routers, 7 use cases** | **E** | **E** | **E** | **E** | parcial | parcial | parte estática completa; `T08-F11`/`F12` em `READY_TO_CLOSE_PENDING_DYN` |
| **T-09** `accessProfiles` 6 + `juridico` 75 + `directorate` 14 | 95 end. | **E 95/95** | — | **A(38/75) em `juridico`** ⚠⚠ | **A(38/75)** ⚠⚠ | — | parcial | `READY_TO_CLOSE_BLOCKED_BY_G4` **e** bloqueada quanto ao fechamento de D3/D4 |
| **T-10** `purchases` 10 + `purchaseRequisitions` 5 + `rfq` 7 + `suppliers` 6 + `sales` 13 | 41 end. | **E 41/41** | **E** | **E** exceto `rfq`: **A(2/7 use cases)** ⚠ | idem | — | — | `READY_TO_CLOSE_BLOCKED_BY_G4`; `RES-T10-01` aberto |
| **T-11** `mrp` 4 + `bom` 12 + `masterProduction` 7 + `production` 23 | 46 end. | **E** | **E** | **E** em `mrp`/`bom`; **E** em `masterProduction` D3/D4 (C-14/C-15); **A** em `production` ⚠ | idem | — | — | `READY_TO_CLOSE_BLOCKED_BY_G4`; `RES-T11-01` aberto |
| **T-12** `rh` 57 + `sst` 75 + LGPD 17 | 149 end. | **E 149/149** | **E** (`rh` por 5 validadores; `sst` por **negativa exaustiva**: zero validadores) | **A(~24/132)** ⚠⚠ | **A** ⚠⚠ | **A** | parcial | **`PARTIAL — COVERAGE GAP DECLARED`** |
| **T-13** schema transversal (207 tabelas / 478 FKs / 186 models / 169 migrations) | — | — | — | — | — | **E** em inventário, PK, FK, UNIQUE, CHECK(inventário), model×tabela; **E** em FK-sem-índice (190/459 enumeradas nominalmente); **A(22/207 tabelas)** em nulabilidade e semântica de coluna ⚠ | — | 12 findings; 7 `RES-T13-*` abertos |
| **T-14** 165 BRs | — | — | — | **E — 165/165 com status individual**; 150/165 com âncora decidida; **15 `NÃO LOCALIZÁVEL`** ⚠ | — | — | — | `CONCLUÍDA COM LACUNA DECLARADA` |
| **T-15** 90 RFs + UCs + cadeias | — | — | — | **E** nos dois produtos quantitativos (0/90 estrito; 3 frouxo); `RES-T15-01` fechado por adendo | — | — | — | `CONCLUÍDA COM LACUNAS` (`RES-T15-02..06`) |

### 3.1 Os três déficits materiais de W2, com número nominal

Estes são os pontos em que a **cobertura executada é menor que a prometida pela EMENDA-02**, e
nenhum deles é economia — são escopo não executado, e a própria trilha os declarou:

| # | Célula da EMENDA-02 | Prometido | **Executado** | Déficit nominal | Declarado por |
|---|---|---|---|---|---|
| **DEF-01** | **C-01/C-02** — `juridico` D3+D4 | **E 75/75** | **A(38/75)** — contratos (16), contencioso (15), prazos (7) lidos no use case | **37 endpoints** (LGPD 17, PI 6, procurações/atos societários 8, alertas 3, fichas cruzadas 3) | `T-09` §6, textual: *"A condição de G3 para `juridico` D3/D4 NÃO foi integralmente cumprida por esta trilha"* |
| **DEF-02** | **C-03…C-06** — `rh`+`sst` D3+D4 | **E 132/132** | **A(~24/132)** — clusters-âncora (contrato, demissão, admissão, afastamento; CAT/acidente, PT, eSocial) | **108 endpoints** | `T-12` §5 → `RES-T12-01`, com dano possível nomeado e custo de fechamento estimado (3-4 S) |
| **DEF-03** | **C-10/C-11** — `rfq` D3+D4 | **E 7/7** | **A** — `AwardRfqUseCase` e `InviteRfqSuppliersUseCase` lidos; `CreateRfqUseCase`, `RegisterRfqQuoteUseCase`, `GetRfqComparisonUseCase`, `rfqController` **não** lidos em profundidade; idem 4 rotas de `customer prices` | **≈5 endpoints + tabelas de preço** | `T-10` §4 → `RES-T10-01` |

**Soma dos déficits declarados de W2 em D3/D4: ≈150 endpoints** que a EMENDA-02 elevou a exaustivo e
que foram entregues em profundidade menor. **Todos os três estão nas categorias que G3 veda amostrar**
(contratos/jurídico, dado pessoal sensível/obrigação legal com prazo, operações financeiras/segregação).
Isso **não** é conformidade com a condição (a) de G3, e as trilhas não a declararam.

### 3.2 Onde W2 entregou MAIS do que o planejado (registro simétrico obrigatório)

- **T-06** classificou **17/17 endpoints de escrita** quanto a idempotência com veredito individual
  (P-L / P-C / P-G / D) e enumerou **4 rotas** que compartilham `InventoryService.adjust` — o plano
  pedia enumeração, a trilha entregou a classificação e a extensão de escopo do `FIND-ERP-001`.
- **T-07** leu os **8 endpoints inalcançáveis** do CNAB assim mesmo, para adjudicar a inalcançabilidade,
  e mediu a cadeia morta completa (8 use cases, 1 controller, 1 repositório, 5 módulos de
  infraestrutura, 5 models, 5 migrations, 5 tabelas no schema).
- **T-08** recontou a superfície do módulo `fiscal`: o plano diz "2 endpoints"; o real é **7 use cases
  / 6 rotas em 3 routers**. Divergência de inventário registrada, não conciliada.
- **T-11** **refutou a premissa herdada do passo 30** ("os dois motores de BOM leem tabelas diferentes,
  comparação inviável por construção") e converteu a divergência de "possível" em "provada e
  comparável" (`T11-OBS-01`).
- **T-13** enumerou **nominalmente as 190 FKs sem índice** (41,4% de 459) — o plano pedia a dimensão,
  não a enumeração.
- **T-14** entregou **165/165** com status individual, contra as "164 regras" do plano.

---

## 4. Onda W3 — Tier 3 e plataforma

Matriz planejada **pós-EMENDA-02**: REG-G3 com **triagem 100% IN/OUT-categoria** nos 174 profundos
(C-35…C-62); os **43 rasos elevados a E em D1, D2, D3, D4, D5, D6, D9** (C-63…C-132, **70 células**);
`client/` com **triagem estática 100% das 167 páginas + E nas IN-categoria** (C-133); `mobile/` com
**E nos fluxos de estoque, authN e origem de papel** (C-134); `tv/` com **triagem estática 100%**
(C-135); contrato de API com **E 681/681 em semântica profunda** (C-136).

| Trilha | Prometido pós-EMENDA-02 | **Executado** | Divergência |
|---|---|---|---|
| **T-16** tier 3, 174 profundos | REG-G3: triagem 100% + **E** em D3/D4/D5/D9 nos IN-categoria | **D1/D2/D3(borda) = E 174/174**; **D4-D8 = A(≈91/174, 52%)**. `workCenters` 6/6 **só rotas**. `RES-T16-01…05` nominais | ⚠⚠ **A lista nominal IN-categoria × OUT-categoria exigida por REG-G3 passo 4 NÃO foi publicada.** Sem ela, a amostra restante não é "baseada em risco" no sentido da condição (a) de G3 — é amostra com critério declarado em prosa |
| **T-16** os 43 rasos | **E 43/43 em D1, D2, D3, D4, D5, D6, D9** (C-63…C-132) | **R 43/43** — só duas colunas: presença de authN/authZ e presença de validação. A trilha declara literalmente: *"Estes 43 NÃO foram auditados em profundidade. Nenhuma regra de negócio destes módulos foi examinada"* | ⚠⚠⚠ **70 das 137 células elevadas pela EMENDA-02 NÃO FORAM EXECUTADAS.** É a maior divergência planejado × executado desta run. **N-05 e N-06, que a EMENDA-02 §4 declarou REVOGADAS, permanecem materialmente em vigor** |
| **T-16** `RES-T16-06` (`comex` G11) | fechar antes do veredito | **FECHADO** por `T16_FECHAMENTO_RES-T16-06.md` — leitura integral, nenhum achado novo | cumprido |
| **T-17** contrato de API | inventário E + **semântica profunda E 683/683** (C-136) | **Inventário: E 683/683** (recontagem própria: 681 em módulos + 2 em `health.ts`; +1 handler inline em `app.ts:227`; **676 alcançáveis**). **Matriz por dimensão: NÃO alcançada em 683/683** — `RES-T17-01` | ⚠⚠ C-136 não cumprida. A trilha declara estado `PARTIAL` no próprio cabeçalho |
| **T-18** appsec/segredos/dependências | **D9 = E** por varredura transversal sobre 30 módulos (C-16…C-34 + C-123…C-132) | Injeção **Alta**, XSS **Alta**, upload **Alta**, SSRF **Alta**, CSRF **Alta**, config/headers/CORS/rate-limit **Alta**; **mass assignment ≈8%** (1 de 13 cadeias) — depois **fechado a 21/21 call sites por T-18-A**; cripto **Média**; segredos **Média**; dependências **Média-baixa** (sem consulta a CVE) — depois **parcialmente fechado por `DYN-T18-03`** | ⚠ D9 = **E em 6 das 10 categorias ASVS declaradas**, A/M nas outras 4. A elevação C-16…C-34 é **parcialmente cumprida** |
| **T-19** arquitetura | D10 amostral (RES-08) | 11 findings; ciclos de dependência **não** enumerados exaustivamente (`RES-T19-04`) | dentro do planejado |
| **T-20** qualidade e testes | D7 amostral (RES-06) | 4 findings MEDIUM; **efetividade de asserção não medida em 100%** | dentro do planejado; `T20-F03` **confirmado por execução** na bateria dinâmica |
| **T-21** front-ends | **triagem 100% das 167 páginas + E nas IN-categoria** (C-133); `mobile` **E** nos fluxos de estoque (C-134); `tv` **triagem 100%** (C-135) | **A(41/167 páginas)**; **`mobile/` NÃO explorado**; **`tv/` NÃO explorado** — a trilha declara: *"não explorados nesta run por restrição de tempo/orçamento (4S), mesmo como varredura estrutural prevista no plano"* | ⚠⚠⚠ **C-133, C-134 e C-135 NÃO CUMPRIDAS.** **N-07 (126 páginas) e N-08 (`mobile`/`tv`), que a EMENDA-02 declarou "REDUZIDAS e recondicionadas", permanecem em vigor com número maior do que o recondicionamento previa** |
| **T-22** plataforma | CI/infra declarada/backup/observabilidade | **E** no único workflow, nos dois composes, nos scripts de backup e no checklist de Go-Live; **branch protection e CODEOWNERS NÃO VERIFICADOS** — `gh` CLI ausente | ⚠ 2 células dependem de `DYN-T22-01/02`, **bloqueadas por ferramenta**, não por autorização |
| **T-23** documentação × código | A(≈90/172) — fora das categorias vedadas | **A** conforme planejado; `RES-T23-01` (citação quebrada não localizada estaticamente) **FECHADO por execução** (`DYN-T20-06`) | dentro do planejado |
| **T-24** integrações e resiliência | E na superfície declarada | **E** nos 4 provedores/serviços do escopo; 2 achados registrados como **confirmação de conformidade** (`T24-F05`, `T24-F06`), não como finding | dentro do planejado |

### 4.1 Aritmética de fechamento do tier 3 — verificada

`T-16` §1: **174 + 44 + 43 = 261**. Confere com a matriz planejada §7.4 e com a contagem própria da
trilha. **Nenhum endpoint do tier 3 ficou sem titular.** O que mudou não foi a superfície — foi a
**profundidade** entregue nas faixas de 174 (52% em D4-D8) e de 43 (0% em profundidade).

---

## 5. Superfícies não-modulares (matriz §8)

| Superfície | Dono | Prometido | **Executado** |
|---|---|---|---|
| `server/src/middlewares/` (6 arquivos, 100% da authZ) | T-04 | E | **E** — 6/6 lidos; 4 mecanismos identificados (o `CURRENT_ARCHITECTURE.md` declara 3 — divergência registrada) |
| `server/app.ts` (65 `app.use`) | T-04 | E | **E 65/65**; reconciliação exata 681 = 390 + 286 + 5; **zero endpoints não autenticados por descuido** |
| Mapa authZ dos 681 endpoints | T-04 | E, consumido por W2/W3 | **E** — entregue e **efetivamente consumido** por T-06 (D-5), T-11, T-16 e T-12 |
| Censo de atos aprovatórios (EMENDA-01 §D.3) | T-04 | E, alvo ~55 | **E — 63 em nível `approve`, superfície total ≈83**; Classe C (lacuna) com 16 entradas, Classe B (compensada) com 5 |
| `auditLogService.ts` (403 ocorrências / 101 arquivos) | T-03 | E por estratificação com enumeração | **E** — número reproduzido e método recuperado; universo real de **chamadas** = 362 / 85 arquivos (41 ocorrências não são chamadas). 3 dimensões resolvidas por **prova estrutural exaustiva** |
| os 16 serviços de `server/src/services/` | T-05 (dono da superfície) | 16/16 com titular | **E — 16/16, zero órfãos**; 1 dupla alocação reportada (`uploadService.ts`) |
| `itemProductMirrorService.ts` + `fixedAssetReceiptService.ts` (RA-08) | T-05 | 100% das linhas | **E — 265 linhas, 100%**; 14 regras extraídas, **13 sem BR** |
| `server/src/models/` (186 arquivos) | T-13 | E em correspondência model×tabela | **E — 185 `tableName` + `index.ts`**; discrepância de 1 não atribuída (`RES-T13-06`) |
| Schema declarado (baseline + 9 migrations) | T-13 | E, fonte = `00_baseline_frozen.sql` | **E** em estrutura; **A(22/207)** em nulabilidade/semântica. **Ver §6 — a fonte declarada pelo plano está DEFASADA** |
| Re-ancoragem dos 7 findings | T-00 | E 7/7 | **E 7/7** (§1.1), com reconferência dirigida declarada em 4 deles |
| CI e infra declarada | T-22 | E | **E** no versionado; **N** em branch protection (fora do repositório) |
| Manifestos de dependência | T-18 | E | **E** nos 4 `package.json`/lockfiles; **CVE só por execução** (`DYN-T18-03`) |
| Documentação (172 `.md`) | T-23 | A(≈90/172) | **A** conforme planejado |

---

## 6. `OBS-R3C-01` — a fonte de schema declarada pelo plano está DEFASADA (impacto transversal)

**O fato, verificado pela Rodada 3-C por grep dirigido e por mim reconciliado contra a §2 do próprio
relatório de T-13:**

`server/database/postgresql/00_baseline_frozen.sql` — que o `AUDIT_PLAN.md:612` fixa como **a fonte do
schema** — **não contém** `sale_lot_shipments` (0 ocorrências), **não contém** `public.directorates`
(0 ocorrências) e **não contém** `lot_controls.blocked_at` (ausente da definição da tabela em
`:9179-9201`, 22 colunas). As três estruturas são criadas por migrations **presentes no
`AUDIT_COMMIT`** (`…-000039`, `…-000043`, `…-000044`). Já `quality_inspections` (`…-000032`) **está**
no baseline. **Logo o congelamento ocorreu entre `…-000032` e `…-000039`.**

**Reconciliação própria (leitura do `T-13_DADOS_E_SCHEMA.md` §2, não do SQL):** T-13 mediu 160
migrations no `00_baseline_frozen_meta.sql` contra 169 arquivos em `server/migrations/`, e nomeou as
**9 pós-congelamento**: `…-000038`, `…-000039`, `…-000040`, `…-000041`, `…-000043`, `…-000044`,
`…-000045`, `…-000046`, `…-000047`. **As duas medições são consistentes** — a Rodada 3-C descreve, por
outro caminho, exatamente o conjunto que T-13 já havia enumerado. **Não há divergência entre T-13 e a
Rodada 3-C; há uma consequência metodológica que nenhuma das duas tinha extraído por inteiro.**

**A consequência, declarada sem eufemismo:**

> Toda conclusão da forma **"o schema NÃO tem X"** apoiada exclusivamente no baseline é **incompleta
> por construção**. Ela só é fechada se acompanhada da varredura complementar das 9 migrations
> pós-freeze.

### 6.1 Impacto na confiança, finding a finding — determinação exigida pelo item 4 do mandato

Este é o resultado da minha leitura própria da §2 de T-13 (lista nominal das 9 migrations e do que
cada uma cria/altera) cruzada com a âncora declarada de cada finding. **Não conclui que nenhum
finding esteja errado — conclui o que a âncora prova e o que não prova.**

| Finding | Âncora | Alguma das 9 migrations toca o objeto? | **Efeito na confiança** |
|---|---|---|---|
| `T13-F01` FKs de `production_orders` | baseline `:23136,23312,23344,23568,25160` | **Não.** Além disso, a Rodada 3-C **executou** a varredura complementar de `server/migrations/2026081*` para `RESTRICT`/trigger/`deleted_at` nessas tabelas: nenhuma | **INALTERADA — ALTA.** Fragilidade **não herdada** |
| `T13-F02` `uq_mrp_sem_duplicidade` inócuo por NULL | baseline `:10149`, `:18435` | **Não** — nenhuma das 9 toca `mrp_ordens_planejadas` (as 9 criam/alteram BOM-fantasma, lotes de venda, `purchase_orders.requester_id`, privilégios, diretorias, `lot_controls.blocked_at`, importação de ponto, governança de diretoria, afastamentos) | **INALTERADA — ALTA**, com a ressalva de que a varredura complementar foi feita **por mim, sobre a enumeração de T-13**, e não por grep próprio no diretório |
| `T13-F03` `inventory_movements` sem UNIQUE | baseline `:7077-7091`, `:21666` | **Não.** Reforço independente: **T-06** varreu **100% das 12 migrations que citam a tabela** — zero `addConstraint`/`unique` | **INALTERADA — ALTA.** Dupla cobertura (T-13 + T-06) |
| `T13-F04` `accounts_receivable` sem chave de parcela | baseline `:3335-3359`, `:16515`, `:18719` | **Não** — a Rodada 3-C varreu `server/migrations/2026081*` por `accounts_receivable`: nenhuma adiciona unicidade | **INALTERADA — ALTA** |
| `T13-F05` 7 tabelas vivas sem model | baseline + inventário de models | **Parcialmente relevante:** as 9 migrations **criam 7 tabelas novas**, e T-13 as incorporou ao denominador (200+7=207). O conjunto das 21 sem model foi computado sobre 207 | **INALTERADA quanto ao método**; permanece o `RES-T13-06` (discrepância de 1) |
| `T13-F06` guarda de drift unidirecional e pulável | `schema-model-drift-guard.test.ts` — **não é o baseline** | n/a | **INALTERADA — e REFORÇADA.** `OBS-R3C-01` acrescenta um **terceiro eixo de drift** que a guarda também não cobre: **baseline × migrations versionadas**. A guarda compara *model × banco*; ninguém compara *baseline × migrations*. **Registro este reforço explicitamente, porque o mandato me pediu para determinar o impacto e o impacto aqui é de fortalecimento, não de fragilidade** |
| `T13-F07` CHECKs ausentes no núcleo comercial/estoque/produção | baseline `:10122-10123, 10333, 10523` + **ausência** nas definições de `:7077`, `:10891`, `:11197`, `:12213`, `:12412` | **Não verificado.** T-13 leu 4 das 9 migrations integralmente e 5 de forma dirigida; **não há declaração de varredura por `CHECK`/`addConstraint` nas 9** | ⚠ **CONFIANÇA REBAIXADA de ALTA para MÉDIA-ALTA quanto à afirmação de ausência.** O fato "o baseline não tem CHECK nessas tabelas" está provado; a afirmação "o **schema versionado** não tem" exige a varredura complementar. **Custo de fechar: 1 grep.** Registrado como `RES-T26-02` |
| `T13-F08` `bill_of_materials (product_id, revision)` sem UNIQUE | baseline `:4039-4055`, `:21967` | **Sim, tangencialmente** — `…-000038-bom-phantom-explosion.cjs` toca a família BOM. T-13 a leu **integralmente** e reportou apenas a coluna `is_phantom` | **INALTERADA — ALTA** |
| `T13-F09` `audit_logs.user_id ON DELETE SET NULL` | baseline `:22840`, `:23016` | **Não verificado.** `…-000041-reapply-app-role-privileges.cjs` toca privilégios, não FKs; foi lida de forma **dirigida**, não integral | ⚠ **CONFIANÇA MANTIDA em ALTA para o fato**, com nota de que a leitura da migration de privilégios foi dirigida. Materialidade da ressalva: baixa |
| `T13-F10` `sst_matriz_epi` CASCADE divergente | baseline `:25664` vs `:25672` etc. | **Não** — nenhuma das 9 toca `sst_*` | **INALTERADA — ALTA** |
| `T13-F11` schema declarado ≠ efetivo | **é o próprio finding sobre a diferença**; âncora é `…-000040` (migration pós-freeze) | por construção | **REFORÇADA.** `OBS-R3C-01` é evidência adicional, do lado **versionado**, do que `T13-F11` afirma do lado **efetivo** |
| `T13-F12` constraints/índices duplicados | baseline | **Não** | **INALTERADA — ALTA**; materialidade LOW |

**Alcance da herança de fragilidade, medido:** dos 12 findings de T-13, **2** ficam com a afirmação de
ausência **não integralmente fechada** contra o schema versionado (`T13-F07` e, em grau menor,
`T13-F09`). Os outros 10 **não herdam** a fragilidade: ou o objeto não é tocado pelas 9 migrations,
ou a varredura complementar foi de fato executada (por T-13, por T-06 ou pela Rodada 3-C), ou a
âncora não é o baseline.

**Extensão para fora de T-13, que o mandato pediu que eu determinasse:** procurei findings de outras
trilhas ancorados **exclusivamente** no baseline. Encontrei:

- `T-05-02` (larguras de coluna `items`→`products`) — **fechado**: a Rodada 3-A reconferiu as 6 linhas
  do baseline **e** os models `Item.ts`/`Product.ts`, que são fonte independente. Nenhuma das 9
  migrations altera larguras dessas colunas.
- `T11-F05` (rótulo de revisão de BOM sem índice único) — mesma classe de `T13-F08`; `…-000038` foi
  lida integralmente por T-13. **Sem fragilidade herdada.**
- `T08-F10` (unicidade de `(nfe_series, nfe_number)`) — **fechado por execução**: `DYN-T08-02`
  consultou `pg_indexes` no banco efêmero e confirmou a ausência **por catálogo**, não por baseline.
- `T12-H03` (ausência de `UNIQUE(acidente_id, tipo)` em `sst_cats`) — baseline `:18071-18075`,
  `:21222-21239`. **Nenhuma das 9 toca `sst_*`. Sem fragilidade herdada.**

**Consequência de plano, registrada e não conciliada:** o `AUDIT_PLAN.md:612` fixa
`00_baseline_frozen.sql` **+ as 9 migrations** como a fonte — e está **correto**. O que a run
executou, em vários pontos, foi ler **só o baseline**. A divergência é de **execução contra o plano**,
não do plano contra a realidade. Registro nessa direção porque é a direção verdadeira.

---

## 7. Divergências planejado × executado — quadro consolidado

**Regra aplicada:** nenhuma célula da matriz planejada foi editada. O quadro abaixo é aditivo.

### 7.1 Células elevadas pela EMENDA-02 — 137 prometidas, quantas foram entregues

| Faixa | Células elevadas | **Entregues como E** | **Não entregues** | Evidência |
|---|---|---|---|---|
| §4 tier 2 — D3/D4 (C-01…C-15) | 15 | **9** (`treasury`, `accounting`, `budget`, `suppliers`, `masterProduction` D3/D4) | **6** — `juridico` D3+D4 (DEF-01), `rh` D3+D4 e `sst` D3+D4 (DEF-02), `rfq` D3+D4 (DEF-03) | T-07 §5; T-09 §6; T-12 §5; T-10 §4 |
| §4 tier 2 — D9 (C-16…C-34) | 19 | **parcial** — 6 de 10 categorias ASVS em nível Alto | **parcial** | T-18 §Cobertura efetiva |
| §7.1 tier 3 profundo (C-35…C-62) | 28 | **parcial** — D1/D2/D3 E 174/174; D4-D8 A(≈91/174) | **parcial**, sem lista nominal IN/OUT | T-16 §2 |
| §7.3 tier 3 raso (C-63…C-132) | **70** | **0** | **70** | T-16 §5, textual |
| §8 superfícies (C-133…C-137) | 5 | **0 integralmente** — C-133/134/135 não cumpridas; C-136 `PARTIAL`; C-137 A(22/207) | **5** | T-21 §escalonamentos 4-5; T-17 cabeçalho; T-13 §1 |
| **TOTAL** | **137** | **≈9 integralmente + parcial em ~47** | **≈81 células não entregues como E** | — |

> **Declaração sem eufemismo:** a EMENDA-02 elevou 137 células para cumprir a condição do gate G3 e
> **calculou o custo em +34 S (110 → 144)**. O item de gate **G11 permanece registrado como aberto no
> próprio estado da run**; as trilhas executaram, em quase todos os casos, dentro do orçamento
> **pré-elevação**. **A cobertura executada corresponde, em larga medida, à matriz PRÉ-EMENDA-02.**
> Isso é **divergência de primeira ordem entre planejado e executado**, e é matéria de decisão humana
> — não de conciliação por este agente.

### 7.2 Declarações negativas — estado real após a execução

| ID | Estado declarado pela EMENDA-02 §4 | **Estado real após a execução** |
|---|---|---|
| **N-04** (139 de 207 endpoints de `juridico`/`rh`/`sst` sem D3) | REVOGADA | ⚠ **MATERIALMENTE EM VIGOR** — DEF-01 (37) + DEF-02 (108) = **145 endpoints** sem D3/D4 de use case |
| **N-05** (semântica de coluna do tier 3 raso) | REVOGADA (absorvida por C-137) | ⚠ **EM VIGOR** — T-13 entregou A(22/207 tabelas) |
| **N-06** (regra de negócio nos 43 rasos) | REVOGADA (absorvida por C-93…C-122) | ⚠ **EM VIGOR INTEGRALMENTE** — T-16 §5 declara que nenhuma regra de negócio dos 43 foi examinada |
| **N-07** (127 de 167 páginas do `client/`) | REDUZIDA e recondicionada | ⚠ **EM VIGOR com número medido: 126 páginas não amostradas** |
| **N-08** (`mobile`/`tv` só estrutural) | REDUZIDA | ⚠ **EM VIGOR E AGRAVADA** — `mobile/` e `tv/` **não foram explorados nem estruturalmente** |
| **N-01, N-02, N-03, N-09…N-16** | MANTIDAS | **MANTIDAS**, com dois ajustes de fato: **N-11** foi parcialmente fechada por `DYN-T18-03` (`npm audit` executado nos 4 projetos) e **N-14** foi **reforçada** — `intelligentAuditor` recebeu leitura, ainda que rasa, e nenhuma trilha encontrou chamada a modelo de linguagem, embedding ou decisão não determinística (cláusula de reabertura do plano §9 **não** foi acionada por nenhuma das 27 trilhas) |

### 7.3 Divergências de inventário (superfície), medidas por trilha

| # | Afirmação do plano/inventário | Medição executada | Trilha que mediu |
|---|---|---|---|
| INV-01 | 681 endpoints | **673 alcançáveis** (−8 CNAB não montado) | T-04, confirmado por T-07 e T-17 |
| INV-02 | 681 endpoints | **683 handlers registrados** (681 em módulos + 2 em `health.ts`), **+1** inline em `app.ts:227` ⇒ **676 alcançáveis** | T-17 §1.1/§1.3 |
| INV-03 | `fiscal` = 2 endpoints | **6 rotas em 3 routers, 7 use cases** | T-08 |
| INV-04 | `financial` = 30 | **22 alcançáveis** | T-07 §1 |
| INV-05 | 164 BRs | **165 fichas** na working tree; **164** no `AUDIT_COMMIT` (`BR-FIN-003` entrou por `APR-2026-021`, commit posterior) | T-14 mediu 165; T-15 registrou a discrepância (`RES-T15-02`, reaberto e agravado) |
| INV-06 | 3 mecanismos de authZ (`CURRENT_ARCHITECTURE.md`) | **4** (+`requireSstOrRh`) | T-04 §6, confirmado por T-12 |
| INV-07 | 478 FKs | **478** no versionado; **480** no banco efêmero | T-13 (estático) × `DYN-T13-03` (catálogo) |
| INV-08 | 207 tabelas | **207** no versionado; **208** no banco efêmero | T-13 × `DYN-T13-04` |
| INV-09 | "~55 atos aprovatórios" (EMENDA-01) | **63 em nível `approve`**, superfície ≈83 | T-04 §2 |
| INV-10 | 21 pontos de aprovação com 4 pontos de segregação (`FIND-ERP-009`) | **mínimo 5 pontos de segregação** — `ConfirmDeadlineUseCase.ts:36-41` (`BR-JUR-013`) é o 5º | T-09 §4 (`DIV-T09-01`) |

**As divergências INV-01 e INV-02 não são conciliáveis entre si sem uma decisão de definição** (o que
conta como "endpoint": handler registrado, rota alcançável, ou rota alcançável em módulo). Registro as
duas medições lado a lado e **escalo ao director**; não escolho por votação nem por autoridade da
trilha mais recente (Regra 20).

---

## 8. Cobertura de evidência dinâmica — declarada item a item, sem eufemismo

**Esta é a lacuna estrutural desta run, e ela não é de mérito dos findings — é de prova.**

### 8.1 O universo real de pedidos DYN

A bateria dinâmica declara **~103** pedidos catalogados. **Minha recontagem, por leitura própria dos
27 relatórios, chega a ≈137** — a tabela de catálogo da bateria **omite trilhas inteiras**:

| Trilha omitida do catálogo da bateria | Pedidos que a trilha de fato registrou |
|---|---|
| **T-04** | `DYN-04.1` … `DYN-04.10` — **10** |
| **T-09** | `DYN-09.1` … `DYN-09.6` — **6** |
| **T-12** | `DYN-12.1` … `DYN-12.8` — **8** |
| **T-14** | `DYN-T14-01` … `DYN-T14-04` — **4** |
| **T-06** (subcontado) | catálogo diz "4 diretos"; a trilha registrou **9** (`DYN-02.1-4` + `DYN-06.1-5`) |

**Registro de divergência (Regra 20):** o catálogo da própria bateria dinâmica está incompleto em
**≈34 pedidos**, e **todos os quatro omitidos são de trilhas de autorização, segregação, alçada,
LGPD/SST e regra de negócio** — exatamente as categorias vedadas por G3. Não concilio: registro as
duas contagens e escalo.

### 8.2 O que foi executado (bateria 01)

| Estado | Qtd | IDs |
|---|---|---|
| **Executados integralmente** | **12** | `DYN-06.1`, `DYN-T03-01`, `DYN-T03-03`, `DYN-T03-04`(= `DYN-T19-03` parcial), `DYN-T08-01`, `DYN-T08-02`, `DYN-T13-01`, `DYN-T15-01`, `DYN-T18-01`, `DYN-T18-03`, `DYN-T18-04`, `DYN-T20-06`(= `DYN-T23-01`) |
| **Executados parcialmente** | **4** | `DYN-T13-03` (subquery falhou por cast), `DYN-T13-04` (contagem só), `DYN-T18-02` (histórico), `DYN-T15-02` (regex do próprio runner não normaliza dois formatos de BR-ID — o runner se autopoliciou e **não** reportou divergência) |
| **Recusados por desenho do runner** | **2** | `DYN-T03-02`, `DYN-T03-05` — exigiriam `UPDATE`/`DELETE` ou `SET session_replication_role`; o runner recusou e **escalou**, em vez de assumir autorização a partir de frase genérica |
| **Bloqueados por ferramenta** | **3** | `DYN-T22-01`, `DYN-T22-02` (`gh` ausente), `DYN-T18-10` (`docker compose` sem resposta) |
| **NÃO EXECUTADOS** | **≈116** | ver §8.3 |

### 8.3 O que ficou sem prova dinâmica — item a item, por finding sustentado

**Esta tabela é o cumprimento literal do item 8 do mandato.** Cada linha declara: qual finding
depende, o que a leitura estática **prova**, e o que **só a execução provaria**.

| Pedido não executado | Finding(s) que sustentaria | O que o estático já prova | O que **falta** provar |
|---|---|---|---|
| **`DYN-T02-01`** (JWT forjado com o literal de `docker-compose.yml:54` aceito em `/api/auth/me`) | **`AUD-AUTHN-01` — CRITICAL** | o default é versionado, a guarda `superRefine` está desligada fora de `production`, e o segredo tem 42 chars (passa em `length<32`) | que o token forjado **é aceito** pela instância. **É o CRITICAL de maior prioridade e o mais barato de provar** |
| `DYN-T02-02`, `DYN-T02-03` | `AUD-AUTHN-03`, `-04` | chave do rate limiter vem de `jwt.decode` sem verificação | o bypass efetivo do teto |
| `DYN-T02-04`, `-05`, `-06` | `AUD-AUTHN-11`, `-06`, `-07` | os caminhos de código | o efeito observável |
| **`DYN-02.1`, `DYN-02.2`** (duplicidade concorrente em `POST /api/inventory/movements`) | **`FIND-ERP-001` — CRITICAL** | ausência de lock, de UNIQUE e de guarda de idempotência | **que a duplicidade ocorre em execução.** `CONFLITO-G3×G4` incide diretamente: movimentação de estoque é categoria vedada |
| `DYN-02.3`, `DYN-02.4` | `AUD-INTEG-01`, `-02` | descarte de `reference_*` e `type:'adjustment'` fixo — defeito **determinístico**, não de corrida | o valor gravado (confirmação barata) |
| **`DYN-06.2`** (scan mobile: `products.quantity` × `SUM(product_warehouse_stock)`) | **`AUD-INTEG-03` — CRITICAL** | 6 de 8 argumentos, invariante declarada no próprio código não cumprida. **`DYN-06.1` FOI EXECUTADA** e os 4 casos de caracterização passam — corrobora sem banco | a **divergência de saldo persistida** |
| `DYN-06.3`, `DYN-06.5` | `AUD-INTEG-04`, `-05` | interleaving derivado do código com precisão | a janela temporal real |
| `DYN-06.4` (`pg_indexes` de `inventory_counts`/`lot_controls`) | `AUD-INTEG-08`, BR-QE-006 | constraint declarada **só no model**, não localizada em migration | a existência efetiva do índice |
| **`DYN-03`, `DYN-T07-A`** (pagamento parcial; título `partial` some da projeção) | `FIND-ERP-001` grupo B, **`AUD-SERVICE-1`** | `payment_date` preenchido em toda baixa × `WHERE payment_date IS NULL` | `DYN-T07-A` é **100% SQL e determinístico** — o pedido de maior valor probatório da run que não foi executado |
| `DYN-T07-B`, `-C`, `-D` | `AUD-SERVICE-2`, `-9`; CNAB prejudicado | falta de transação e de guarda de estado | o título órfão observado |
| **`DYN-T08-03/04/05/06`** | `T08-F12`, **`T08-F04`**, `T08-F07`, **`T08-F05`** | backfill com tabela errada; mock autorizando tudo; janela de edição; retorno antecipado | a **exploração ponta a ponta** de mock em produção e do cancelamento sem snapshot |
| **`DYN-T24-01`** (credencial ausente prende a venda em `processing`) | **`T24-F01` — CRITICAL** | exceção síncrona fora do `try/catch`, após commit da numeração; **nenhuma rota de reset existe** | o estado preso observado. **Prioridade nº 2 entre os CRITICAL** |
| `DYN-T24-02` … `-05` | `T24-F02` | zero timeout/retry/circuit breaker | comportamento sob rede lenta/blackhole — exige infraestrutura dedicada |
| **`DYN-04.1` … `DYN-04.10`** (10 sondagens de authZ/alçada) | **`AUD-SEC-T04-01` (HIGH)**, `AUD-SEC-T04-02`, `-03`, `-04`, `T16-F01` (HIGH), `CAND-AUTHZ-01` | o padrão existe verbatim em 4 âncoras; a cadeia TI→`diretor`→aprovação está lida ponta a ponta | **a contornabilidade efetiva.** Quatro categorias vedadas por G3 simultaneamente (autenticação, autorização, segregação, permissões administrativas). **`DYN-04.1`/`04.2` também decidem se existe perfil `diretor:'operate'` em operação — a condição que T-04, T-09 e o adendo de severidade declararam como a única capaz de mover a severidade** |
| **`DYN-09.1` … `DYN-09.6`** | `FIND-ERP-005` (CRITICAL) Falhas 2/4/5; `AUD-PROC-T09-01`; `DIV-T09-01` | alçada dupla satisfazível por uma identidade; ausência de gate de status | a exploração |
| **`DYN-12.1` … `DYN-12.8`** | **`T12-H01`, `H02`, `H03`, `H04` (4 HIGH)**; `T12-M01`, `M07`; `T12-L03` | provas de **ausência de código** — que o estático demonstra melhor que a execução | o **efeito observado**: CAT `inicial` para óbito aceita; pedido de exclusão LGPD encerrado com o dado íntegro; fila eSocial parada |
| `DYN-T05-01` … `-06` | `T-05-01`, `-02`, `-03`, `-04`, `-08` | leitura literal de constante e de fluxo | a componente **concorrente** de `T-05-08` (única lacuna que T-05 declara insuficiente estaticamente) |
| `DYN-T10-A`, `-B`, `-C` | `T-10-01` (HIGH), `T-10-04`, `T-10-05` | janela de alçada aberta em `pending` | a exploração |
| **`DYN-T11-A`, `-B`, `-C`** | `T11-F03`, `T11-F01`, `T11-F02` (3 HIGH) | divergência dos dois motores provada analiticamente sobre a **mesma fonte** | **`DYN-T11-A` é a prova que fecha o "pronto quando" da trilha T-11** — diff de saída dos dois motores sobre o mesmo fixture |
| ~~`DYN-T11-D`~~ | ~~`T11-F10`~~ | — | **RETIRADO DA FILA** — ver `T-26_CONSOLIDACAO.md` §3.1 (`T11-F10` é `FALSE_POSITIVE`) |
| `DYN-T13-02`, `-05`, `-06` | `T13-F01`, `F04`, `F09`, `F10`, `F11`, `F02`, `F03` | schema **versionado** | o schema **efetivo** e **quantas linhas já escaparam** de cada UNIQUE inócuo |
| `DYN-T14-01` … `-04` | `T14-F02`, `T14-F03`, `T14-F07`, BR-QE-007 | `NaN ⇒ []` existe literalmente no Jurídico sem wrapper | se o domínio de `jur_contracts.value` admite não numérico. **É o único DYN da run que pode ELEVAR severidade** (`T14-F02` MEDIUM → potencialmente HIGH) |
| `DYN-T16-01` … `-12` | `T16-F02`, `F03`, `F06`, e outros | leitura de código | DDL de `accounts_payable`; comportamento de magic bytes; nível de isolamento |
| `DYN-T17-01` … `-06` | `T17-F01`, `F02`, `F03` (3 HIGH) | envelope bimodal, GET com efeito patrimonial, paginação sem teto | o comportamento em resposta real |
| **`DYN-T18A-01`** | **`T18A-F10` — HIGH (bypass de `authorizeSelfOrModule`)** | a cadeia de código está lida ponta a ponta | a confirmação empírica do bypass de posse |
| `DYN-T18A-02`, `-03`, `-04` | `T18A-F08`, `F04`, `F01` | mass assignment e sobrescrita de ID | o efeito no `audit_logs` |
| `DYN-T18-06` … `-09` | `T18-F05`, `F09` | ausência de rate limit em `/uploads`; nome previsível | exploração |
| `DYN-T19-01`, `-02`, `-04` | `T19-F01`, `F03` | acoplamento vertical e ciclo `items ⇄ mrp` | grafo completo por `madge`; **não é evidência de banco** — é análise de build, e permanece pendente por decisão, não por G4 |
| `DYN-T20-01` … `-05` | `T20-F01`, `F02`, `F04` | testes que passam sem asserção efetiva | a suíte completa executada |
| `DYN-T22-01`, `-02` | `T22-F03` | gate documental sem imposição técnica | branch protection real — **bloqueio de ferramenta (`gh` ausente), não de autorização** |

### 8.4 Declaração formal exigida

> **≈116 dos ≈137 pedidos de evidência dinâmica registrados nesta run NÃO foram executados.**
> Deles, **a maioria absoluta exige o servidor no ar contra `erp_evok_audio_test`** — um segundo lote
> de engenharia (boot do app, mint de JWT por perfil, seed de fixtures por caso, captura de payload),
> como o próprio runner declarou. **Isto NÃO é lacuna de mérito dos findings: é lacuna de PROVA
> DINÂMICA.** Os findings sustentados por leitura estática permanecem com a confiança que suas
> trilhas lhes atribuíram; o que não existe é a demonstração do **efeito observado**.
>
> **Consequência normativa, transcrita da EMENDA-02 §8.1 e verificada como realizada:** as trilhas
> **T-06, T-07, T-09, T-10, T-11** encerraram formalmente em **`READY_TO_CLOSE_BLOCKED_BY_G4`**, e
> **T-03** e **T-08** em `READY_TO_CLOSE_PENDING_DYN`. **Nenhuma delas declarou conformidade com G3
> nas dimensões dependentes de DYN.** O `CONFLITO-G3×G4` **materializou-se integralmente**: as
> categorias que G3 veda amostrar (movimentação de estoque, operações financeiras, autorização,
> segregação, integridade de dados, permissões administrativas) são exatamente aquelas cuja prova
> dinâmica não foi produzida.

### 8.5 Achados NOVOS produzidos pela execução dinâmica (registro obrigatório)

A bateria executada produziu **5 fatos** que nenhuma leitura estática poderia produzir. Eles **não são
findings novos** — três **elevam a confiança** de findings existentes e dois são **observações não
promovidas**:

| # | Fato observado | Efeito |
|---|---|---|
| 1 | `evok_admin` (role de runtime da API) é **superusuário Postgres** (`rolsuper = true`), e `pg_trigger` sobre `audit_logs`/`users`/`lot_controls` retorna **lista vazia** | **Eleva `AUD-DB-01` e `FIND-ERP-002` de estático para confirmado por catálogo.** Superusuário + zero trigger ⇒ a conclusão de `DYN-T03-02` é matematicamente inevitável sem executar a escrita |
| 2 | `sale_invoices` **sem trigger** e **sem índice único** sobre `(nfe_series, nfe_number)` | Confirma `T08-F11` e `T08-F10` **por catálogo** |
| 3 | `onda3-shipping-cockpit-cashflow.test.ts` **falha de fato** (`expect(...).toBe(1000)` recebeu `0`) | **`T20-F03` passa de "confiança ALTA por leitura estática" para CONFIRMADO POR EXECUÇÃO** |
| 4 | Citação quebrada localizada com precisão: `SIM-002_VALIDATION_REPORT.md:46 → docs/API.md` | **Fecha `RES-T23-01`** — exatamente o resultado que T-23 previu |
| 5 | `npm audit`: **server 1 HIGH** (`js-yaml`, `CVE-2026-59870`), **mobile 21 (14 HIGH)**, **tv 19 (12 HIGH)** | **Observação NÃO PROMOVIDA a finding** (§9 do consolidado). Fecha parcialmente `RES-02`/N-11 |

### 8.6 Achado sobre a integridade do próprio ambiente de prova — material

O banco `erp_evok_audio_test` usado na bateria **não é reconstrução pura do `AUDIT_COMMIT`**: carrega a
migration `20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`, pertencente à
branch **SanaCore não mesclada e explicitamente incompleta** (`67b49fb`, "PARCIAL — NÃO concluída, NÃO
retestável"), que **não é ancestral** de `main` nem do `AUDIT_COMMIT`.

**Consequência que registro como vinculante para qualquer bateria futura:**

> Os resultados de **catálogo** obtidos (enum de ações, privilégios, triggers, índices de
> `sale_invoices`) **não são afetados** — a migration extra não toca esses objetos. Os resultados de
> **contagem** (480 FKs, 208 tabelas, 170 migrations em `SequelizeMeta`) **são afetados** e **não devem
> ser usados** para fechar nenhum finding de schema que dependa de número exato. O banco de teste é
> **compartilhado entre organizações** (VeriCore e SanaCore), não efêmero por execução — o que, por
> si, é uma quebra de isolamento de ambiente de prova entre duas organizações que a Regra 15 e o
> `AUDIT_SCOPE.md` §5 pressupõem separadas. **Recomendo ao director** recriação a partir do
> `AUDIT_COMMIT` puro antes de qualquer bateria 02. **Não é finding do produto** — é defeito de
> cadeia de evidência da própria auditoria, na mesma classe de `IN-02`/G6.

---

## 9. Limites deste agente — o que consolidei por leitura própria e o que aceitei de terceiro

**Exigência explícita do mandato. Declaro sem atenuação.**

### 9.1 O que consolidei por leitura própria e integral nesta sessão

- **`CLAUDE.md`** (integral), **`AUDIT_PLAN.md`** (integral), **`AUDIT_PLAN_EMENDA_01.md`** (integral),
  **`AUDIT_PLAN_EMENDA_02.md`** (integral), estrutura da `AUDIT_COVERAGE_MATRIX.md`.
- **Os 27 relatórios de trilha + adendos + 5 rodadas de validação + a bateria dinâmica**, em
  `07-findings/`. `T-14` foi lido em duas passadas (465 linhas); `T-16`, `T-17`, `T-18`, `T-19`,
  `T-21`, `T-22`, `T-23`, `T-24` foram lidos **integralmente nas seções de findings, cobertura,
  severidade e escalonamento**, e por grep dirigido nas demais.
- **`PROJECT_STATE.md` §OBS-INV-01** (leitura dirigida) — para o item 7 do mandato.
- **Toda a aritmética deste documento e do consolidado** (contagem de findings por trilha e por
  severidade; recontagem dos pedidos DYN; soma dos déficits nominais; conferência da aritmética
  174+44+43=261 e 200+7=207) **foi refeita por mim** a partir das declarações das trilhas, e **fecha**.

### 9.2 O que aceitei de relato de outra trilha SEM reverificar

**Aceito integralmente e sem reverificação, por não ser meu mandato e por ser vedado a mim reauditar
o produto:**

1. **Toda âncora `arquivo:linha` de todos os 254 IDs.** Não abri **nenhum** arquivo de `server/src`,
   `client/src`, `server/database`, `server/migrations` ou `server/tests` nesta sessão. **Zero.**
   Cada âncora deste consolidado é reprodução fiel do que a trilha de origem publicou.
2. **Todo veredito de mérito do `vericore-finding-validator`** nas 5 rodadas — incluindo o
   `FALSE_POSITIVE` de `T11-F10` e as duas recomendações de rebaixamento. Avaliei a **fundamentação**
   (é interna, é fechada, tem contraprova?) e a **consistência** com o restante do corpus; **não**
   reli `CreateItemStructureUseCase.ts`, `RemoveProductionOrderUseCase.ts` nem
   `CreateReceivableUseCase.ts`.
3. **Toda declaração de cobertura de cada trilha.** As células desta matriz são as que a trilha
   declarou. Não recontei um único endpoint do produto. Se uma trilha declarou "E 22/22" e cobriu 20,
   **este documento repete o erro dela** — e o registro desse limite é a única defesa que posso
   oferecer.
4. **As contagens de superfície** (681/683/676/673, 207 tabelas, 478/480 FKs, 186 models, 165/164 BRs,
   90 RFs). Reproduzi as divergências entre elas (§7.3) **sem arbitrar** qual está certa.
5. **A evidência de git** (`E1`, `E2`, `E3`, `R-01…R-04`, `A2-01…A2-05`) — coletada pelo
   **orquestrador**, não por agente VeriCore, com cadeia de custódia declarada em `AUDIT_PLAN.md` §2.3
   e `T-00` §1.1/§2.4. **Não a reexecutei** — não uso Bash nesta sessão, e a `IN-08` de T-00 vale para
   mim: **não faço nenhuma afirmação própria de proveniência de commit**.
6. **Todo o conteúdo da bateria dinâmica.** Não executei nada. Nenhuma conexão de banco foi aberta,
   nenhum teste rodado, nenhum comando executado nesta sessão.

### 9.3 Riscos residuais próprios de T-26

| ID | Risco residual introduzido pela minha própria passada |
|---|---|
| **`RES-T26-01`** | **16 endpoints de `products` (9) e `assets` (7) sem matriz endpoint×dimensão em nenhuma trilha.** T-05 auditou o **fluxo** e declarou o vão; T-16 os classificou como "já cobertos por outras trilhas" na aritmética. **Vão real, declarado agora.** Custo de fechar: ~0,5 S |
| **`RES-T26-02`** | **`T13-F07` e `T13-F09` com afirmação de ausência não fechada contra o schema versionado completo** (§6.1). Custo de fechar: 1 grep por `CHECK`/`addConstraint` nas 9 migrations pós-freeze |
| **`RES-T26-03`** | **A consolidação é uma leitura de segunda ordem.** Um erro de contagem, de severidade ou de âncora cometido por uma trilha e não detectado pelo validador **propaga-se integralmente** para este documento. A dedup de §2 do consolidado é a única barreira que apliquei, e ela é sintática (mesmo objeto, mesma âncora), não semântica |
| **`RES-T26-04`** | **Não recontei os findings de cada trilha contra o texto integral de todos os relatórios.** Para T-16, T-17, T-18, T-19, T-21, T-22, T-23, T-24 a contagem saiu de tabelas-resumo e de grep dirigido por ID. Se algum finding foi enunciado fora dessas seções, ele **não está no meu inventário** |
| **`RES-T26-05`** | **A re-ancoragem de `FIND-ERP-006/007/008/009` foi dirigida às âncoras load-bearing**, por declaração do próprio T-00. As âncoras não-load-bearing e as documentais foram delegadas a T-12, T-17, T-20 e T-23 — e **T-17 aceitou o elo 4 de T-12 como insumo, não como verificação própria**. A cadeia de verificação dessas âncoras é, portanto, **mais rasa** do que "7/7 re-ancorados" sugere |
| **`RES-T26-06`** | **O manifesto de evidência da run não consta como congelado** pelo `vericore-audit-evidence-controller` (critério de "Pronto quando" de T-00, `AUDIT_PLAN.md` §4.1). Sem ele, a rastreabilidade da run depende dos arquivos em `07-findings/` e do commit history |

---

## 10. Critério de conclusão de T-26 — autoavaliação contra o "Pronto quando"

| Critério | Estado |
|---|---|
| Nenhum finding duplicado sem marcação | **CUMPRIDO** — 8 pares/famílias `DUPLICATE`/`SUBSUMIDO` marcados com finding canônico, em `T-26_CONSOLIDACAO.md` §2 |
| Todo grupo tem causa raiz identificada ou lacuna registrada | **CUMPRIDO** — 11 grupos de causa-raiz, 2 deles com causa-raiz declarada como **lacuna** (G-09 e G-11) |
| Total consolidado confere com o total reportado pelas trilhas | **CUMPRIDO** — 247 findings de trilha + 7 preliminares = **254 IDs**; **253 vigentes** após 1 `FALSE_POSITIVE`. A aritmética por severidade fecha (§1 do consolidado) |
| Divergência planejado × executado registrada | **CUMPRIDO** — §7, com número nominal e sem ajuste retroativo do plano |
| Cobertura executada declarada célula a célula | **CUMPRIDO** — §2, §3, §4, §5 |
| O que ficou sem prova dinâmica declarado explicitamente, item a item | **CUMPRIDO** — §8.3 |

**Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`
nem `REMEDIATION COMPLETE`.** Fechamento é autoridade de reteste independente e de gate humano
(Regras 3, 4, 18). Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2).
Nenhuma evidência histórica de outra organização foi tocada (Regra 15). Nenhuma regra de negócio,
requisito ou aprovação foi inventada (Regra 6). Nenhum OWNER foi decidido, sugerido ou inferido (G9).
