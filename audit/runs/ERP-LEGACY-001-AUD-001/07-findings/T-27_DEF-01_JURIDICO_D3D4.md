# T-27 — FECHAMENTO DO DÉFICIT `DEF-01`: `juridico` D3/D4 nos 37 endpoints não cobertos por T-09

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:        T-27 — fieldwork complementar (fecha DEF-01 de 24-coverage/AUDIT_COVERAGE_EXECUTED.md §3.1, linha 172)
PRODUZIDO POR: vericore-business-rule-auditor
DATA:          2026-08-16
DIMENSÕES:     D3 (regra de negócio) + D4 (transação/idempotência), EXAUSTIVO, endpoint a endpoint
NATUREZA:      estática, read-only. Nenhuma conexão de banco. Nenhum arquivo do objeto auditado
               alterado (Regra 2). NÃO declara AUDIT_PASSED/RETEST_PASSED/FINDING CLOSED (Regra 4).
               Comportamento extraído do código é DISCOVERED_BUSINESS_BEHAVIOR, nunca BR (Regra 6).
STATUS:        CONCLUÍDA — 37/37 com veredito individual D3 e D4
```

> **Nota de persistência.** O agente titular não dispunha de ferramenta `Write` nesta sessão.
> Conteúdo persistido pelo orquestrador **sem alteração** — mesmo padrão de ressalva de
> transparência já aplicado nos passos 23 e 24.

Base de leitura: o orquestrador verificou que
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` é
vazio. **Esse fato é dele, não do agente** — a árvore de trabalho foi lida sob essa cadeia de
custódia declarada; o agente não executa git.

## 0. Sumário executivo

| | |
|---|---|
| Endpoints em escopo | **37/37 auditados — E (exaustivo)** em D3 e D4 |
| Findings novos | **9 `PROPOSED`**: 2 HIGH, 4 MEDIUM, 2 LOW, 1 INFO |
| Confirmações de conformidade | **5** |
| Divergências (Regra 20) | **3** |
| Escalações ao director (Regra 21) | **2** |

A superfície de 37 **não repete** a Falha de alçada do `FIND-ERP-005` — nenhum deles implementa
alçada por valor. Repete **outro** padrão do mesmo módulo, sistematicamente: **transição de
estado sem gate de estado anterior**. Onze das quinze escritas aceitam a transição a partir de
qualquer estado, inclusive terminais.

**Prova negativa exaustiva, a mais barata desta trilha:** grep de
`transaction|Transaction|sequelize.transaction|lock` em **todo**
`server/src/modules/juridico/` → **zero ocorrências**. Não é amostra: é o módulo inteiro. Nenhuma
operação do Jurídico roda em transação explícita; onde há duas escritas (criação + alerta), são
independentes por construção.

## 1. Confirmação própria do denominador (Regra 20 antes de auditar)

Recontagem por leitura direta de
`server/src/modules/juridico/presentation/routes/juridico.ts`:

| Grupo | Rotas | Âncora | Titular |
|---|---|---|---|
| Exceções antes do gate | 3 | `:64`, `:71`, `:77-81` | T-09 |
| G1 Contratos | 13 | `:86-98` | T-09 |
| G2 Contencioso | 15 | `:101-116` | T-09 |
| G3 Prazos fatais | 7 | `:120-126` | T-09 |
| **G4 Procurações** | **4** | **`:129-132`** | **T-27** |
| **G4 Atos societários** | **4** | **`:134-137`** | **T-27** |
| **G5 Propriedade intelectual** | **6** | **`:144-149`** | **T-27** |
| **G6 LGPD** | **17** | **`:153-173`** | **T-27** |
| **G7 Alertas** | **3** | **`:177-179`** | **T-27** |
| **G7 Fichas cruzadas** | **3** | **`:184-186`** | **T-27** |
| **TOTAL** | **75** | | |

3+13+15+7 = **38** (T-09) · 4+4+6+17+3+3 = **37** (T-27) · soma **75**. **A contagem confere com
o mandato e com T-09 §6** (`T-09_AUTHZ_APLICADA.md:159`). Detalhe de composição que T-09 não
explicitou: "contratos (16)" só fecha em 16 se `GET /reports/financeiro` (`juridico.ts:64`)
estiver ali — 13 do G1 + `approve` + `approvals` = 15. Ver `DIV-T27-03`.

**§1.1 Divergência na própria documentação do código:** `juridico.ts:5-6` afirma "completou os
**71 endpoints** do contrato"; o arquivo monta **75**. A diferença é explicada por
`juridico.ts:12-16` (correção de 2026-08-08 acrescentou 4 endpoints de `corporate-acts`), mas o
número 71 nunca foi atualizado → `DIV-T27-01`.

## 2. Matriz endpoint × D3 × D4 — os 37

Legenda D4: **T** transação · **A** atômico por escrita única · **G** guarda de
estado/idempotência · **∅** sem transação e sem guarda · **R** leitura pura.

### 2.1 Procurações (4) — `juridico.ts:129-132`

| # | Endpoint | D3 (implementada, onde) | D3 doc × código | D4 |
|---|---|---|---|---|
| 1 | `GET /proxies` `:129` | Default sem `status` exclui `revoked`/`expired` (`SequelizeProxyRepository.ts:19-23`). **O GET GRAVA** `status='expired'` para cada linha vencida **da página** (`ListProxiesUseCase.ts:26-32`) | RF-JUR-029 (`BLOCO_3_JUR_REQUISITOS.md:91`) "verificação ao acessar/rotina agendada" — conforme em espírito, **divergente em alcance** → `T27-F01` | **∅ + escrita em GET**, `update` dentro de `Promise.all` (`:27-32`) |
| 2 | `GET /proxies/:id` `:130` | Mesma expiração preguiçosa, 1 registro (`GetProxyByIdUseCase.ts:26-30`) | idem | **∅ + escrita em GET** |
| 3 | `POST /proxies` `:131` | Obrigatórios (`CreateProxyUseCase.ts:31-33`); FKs validadas (`:35-44`); outorgante default (`:49`); **alerta com antecedência default 30 dias** (`:46`, `:63-74`) | RF-JUR-027 (`:89`) "default 30 dias" — **CONFORME, valor documentado = implementado** | **∅.** 2 escritas independentes (`:48` e `:66`); falha do alerta ⇒ procuração sem alerta |
| 4 | `POST /proxies/:id/revoke` `:132` | `communication_record` obrigatório (`RevokeProxyUseCase.ts:28-30`); grava `revoked` (`:35-39`); **`revocation_date` vem do cliente sem validação** (`proxyController.ts:53`) | RF-JUR-028 (`:90`): justificativa **conforme**; data **divergente** → `T27-F02` | **∅ + sem gate.** Revogar procuração já `revoked` **sobrescreve a comunicação original** |

### 2.2 Atos societários (4) — `:134-137`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 5 | `GET /corporate-acts` `:134` | Filtros `act_type`/`status` (`SequelizeCorporateActRepository.ts:13-16`) | RF-JUR-030 (`:92`) | **R** |
| 6 | `GET /corporate-acts/:id` `:135` | 404 (`GetCorporateActByIdUseCase.ts:21-22`) | idem | **R** |
| 7 | `POST /corporate-acts` `:136` | Obrigatórios (`CreateCorporateActUseCase.ts:25-27`); **sempre `draft`** (`:37`) | **CONFORME** | **A**; sem UNIQUE em `registration_protocol` (`00_baseline_frozen.sql:8265-8278`) → `T27-F06` |
| 8 | `PUT /corporate-acts/:id` `:137` | **Imutabilidade pós-`registered`** (`UpdateCorporateActUseCase.ts:37-42`) — **único gate de estado correto do escopo**; `draft→registered` exige protocolo **e** data juntos (`:44-46`) | **CONFORME, e bem feito** | **A**, mas `{...rest}` cru no `update` (`:48-51` → `SequelizeCorporateActRepository.ts:36`) ⇒ **mass assignment** → `T27-F05` |

### 2.3 Propriedade intelectual (6) — `:144-149`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 9 | `GET /ip-assets` `:144` | `trade_secret` excluído **na persistência** para `role!=='admin'`, inclusive da contagem (`SequelizeIpAssetRepository.ts:33-39`); filtro explícito forçado a vazio (`:35-38`) | RF-JUR-033 (`:100`) — **CONFORME, mais forte que a exigência** | **R** |
| 10 | `GET /ip-assets/:id` `:145` | 403 se `trade_secret` e não-admin (`GetIpAssetByIdUseCase.ts:34-39`) | **CONFORME** | **R** |
| 11 | `POST /ip-assets` `:146` | Rol de 6 tipos (`CreateIpAssetUseCase.ts:41-43`); veto de anexo para segredo (`:47-52`); **`trademark` ⇒ expiração −12 meses (`:70-80`); demais ⇒ alerta na própria `next_annuity_date` (`:81-90`)** | RF-JUR-032 (`:99`) exige **3** janelas: 1 conforme, 1 parcial, **quinquenal ausente** → `T27-F03`; veto sobre coluna inexistente → `T27-F04` | **∅.** 2 escritas (`:56`, `:73`/`:82`); sem UNIQUE em `registration_number` (`JurIntellectualProperty.ts:39`, `indexes :53-58`) |
| 12 | `PUT /ip-assets/:id` `:147` | Whitelist de 11 campos (`UpdateIpAssetUseCase.ts:39-51`) — bom padrão; veto reavaliado sobre tipo resultante (`:31-37`) | **vacuamente conforme** (`T27-F04`) | **A**, sem gate de estado (`:49`) |
| 13 | `POST /ip-assets/:id/contracts` `:148` | `contract_id` obrigatório (`LinkIpContractUseCase.ts:28`); ativo e contrato validados (`:30-35`) | RF-JUR-034 — **CONFORME** | **A + G — único idempotente do escopo:** `UNIQUE (ip_id, contract_id)` existe de fato (`00_baseline_frozen.sql:18423-18427`), traduzido em 409 (`:43-48`). Ressalva: não declarado no model (`JurIpContractLink.ts:32`) — classe `T13-F06` |
| 14 | `GET /ip-assets/:id/contracts` `:149` | 404 se ativo ausente (`ListIpContractLinksUseCase.ts:22-23`) | RF-JUR-034 | **R.** ⚠ **não aplica a regra `trade_secret`/admin** → `T27-F09(a)` |

### 2.4 LGPD — RoPA (5) — `:153-157`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 15 | `GET /lgpd/processing-activities` `:153` | Paginação (`ListProcessingActivitiesUseCase.ts:24-27`) | RF-JUR-035 | **R** |
| 16 | `GET .../:id` `:154` | 404 (`GetProcessingActivityByIdUseCase.ts:21-22`) | RF-JUR-035 | **R** |
| 17 | `POST .../` `:155` | 5 obrigatórios (`CreateProcessingActivityUseCase.ts:36-38`); **rol taxativo de 10 bases legais** (`:13-16`, `:39-41`); `department_id` validado (`:43-45`); `next_review_due_at` = +1 ano (`:47-48`) | RF-JUR-035 (`:107`) "rol taxativo do art. 7º" — **CONFORME (10 = 10 incisos)**; RF-JUR-036 (`:108`) revisão anual — **CONFORME** | **A**; sem unicidade → `T27-F06` |
| 18 | `PUT .../:id` `:156` | Whitelist de 9 campos (`UpdateProcessingActivityUseCase.ts:32-42`) | RF-JUR-035 | **A** |
| 19 | `POST .../:id/review` `:157` | `last_reviewed_at`/`next_review_due_at` = `reviewedAt`+1 ano (`ReviewProcessingActivityUseCase.ts:27-34`); **`reviewedAt` do cliente sem validação** (`lgpdController.ts:80`) | RF-JUR-036 — **DIVERGENTE**: data futura empurra a revisão além de 1 ano e tira a atividade da fila → `T27-F02` | **∅**, sem gate |

### 2.5 LGPD — Solicitação de titular (7) — `:160-166`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 20 | `GET .../pending-critical` `:160` | Janela **D-5**, nunca oculta vencidos (`SequelizeLgpdRequestRepository.ts:51-63`); calcula `dias_restantes`/`vencido` (`PendingCriticalDataSubjectRequestsUseCase.ts:24-28`) | RNF-JUR-05 (`:173`), API `:838` — **CONFORME quanto a "nunca oculta"** | **R** |
| 21 | `GET .../` `:161` | Lista **excluindo `requester_document` e `requester_email`** (`SequelizeLgpdRequestRepository.ts:25`) | API §0.4 — **CONFORME; boa decisão de privacidade** | **R** |
| 22 | `GET .../:id` `:162` | `findByPk` sem exclusão (`:32-34`) — devolve CPF e e-mail a qualquer `juridico:operate` | conforme ao contrato ("detalhe completo") — `DISCOVERED_BUSINESS_BEHAVIOR`, com nota de superfície de dado pessoal | **R** |
| 23 | `POST .../` `:163` | Rol de 8 tipos (`CreateDataSubjectRequestUseCase.ts:21-23`,`35-37`); **`due_date` = `received_at`+15d** (`:39-41`); `dpo_user_id` do corpo **ou** do usuário corrente (`lgpdController.ts:118`) | RF-JUR-037 (`:109`) — **CONFORME no valor**. **MAS** `BLOCO_3_JUR_API.md:852-853` promete "alertas D-5/D-1 já agendados" e **nenhum alerta é criado** → `T27-F07`; `received_at` do cliente → `T27-F02` | **A** para a solicitação; **∅** para o alerta inexistente |
| 24 | `POST /:id/verify-identity` `:164` | Recusa sem `identity_verified===true` (`VerifyIdentityUseCase.ts:33-38`); grava quem/quando (`:40-45`) | RF-JUR-039 (`:111`) + CHECK `ck_jur_lgpd_dsr_in_progress_requires_verification` (`baseline:8908`) — regra conforme em 3 camadas. **MAS `Boolean(req.body?.identity_verified)`** (`lgpdController.ts:130`) → `T27-F08` | **∅ + sem gate:** verificar solicitação já `answered` **regride** para `in_progress` (`:40-42`); o CHECK não impede |
| 25 | `POST /:id/resolve` `:165` | `resolution_notes` obrigatório (`:26`); exige `identity_verified` (`:31-36`); grava `answered` | **`FIND-ERP-006` já documenta** que grava `answered` sem apagar nada (âncora `:38-42`). **Não reabro** | **∅ + sem gate:** `rejected_justified` → `answered` sem trilha de reversão |
| 26 | `POST /:id/reject` `:166` (`approve`) | Justificativa obrigatória (`RejectDataSubjectRequestUseCase.ts:26`) + CHECK `ck_jur_lgpd_dsr_rejected_requires_justification` (`baseline:8909`) | RF-JUR-039 — **CONFORME** | **∅ + sem gate:** recusar solicitação já `answered` é aceito → `T27-F01` |

### 2.6 LGPD — Incidentes (5) — `:169-173`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 27 | `GET /lgpd/incidents` `:169` | Paginação, shape resumido (`ListIncidentsUseCase.ts:24-28`) | API §0.4 | **R** |
| 28 | `GET .../:id` `:170` | 404 (`GetIncidentByIdUseCase.ts:21-22`) | — | **R** |
| 29 | `POST /lgpd/incidents` `:171` | 3 obrigatórios (`CreateIncidentUseCase.ts:32-34`); categorias concatenadas (`:36-41`); `status='open'` | RF-JUR-040 (`:112`) — **CONFORME nos campos**; **nenhum prazo de comunicação à ANPD é calculado** (tabela sem coluna de prazo, `baseline:8965-8982`) → raiz comum de `T27-F07` | **A** |
| 30 | `POST /:id/decision` `:172` (`approve`) | **Ambas as justificativas obrigatórias inclusive ao NÃO comunicar** (`DecideIncidentUseCase.ts:41-46`); 2 booleanos → enum de 4 (`:51-57`) | RF-JUR-040 "ambos os sentidos" — **CONFORME; melhor regra do escopo** | **∅ + sem gate:** grava `investigating` **incondicionalmente** (`:60`) ⇒ decisão sobre incidente `closed` **reabre** sem trilha → `T27-F01` |
| 31 | `POST /:id/close` `:173` (`approve`) | Bloqueia sem decisão (`CloseIncidentUseCase.ts:30-35`) + CHECK (`baseline:8982`) | E4/RF-JUR-040 — **CONFORME em 2 camadas** | **∅**; fechar 2× sobrescreve `closed_at` (`:37`) |

### 2.7 Alertas (3) — `:177-179`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 32 | `GET /alerts` `:177` | Filtros `origin_type`/`status`/`recipient_user_id` (`SequelizeLegalAlertRepository.ts:17-21`); **sem filtro implícito por destinatário** | §8.1; fila global para todo `juridico:operate` | **R** |
| 33 | `GET /alerts/:id` `:178` | 404 (`GetAlertByIdUseCase.ts:22-24`) | §8.1 | **R** |
| 34 | `POST /alerts/:id/acknowledge` `:179` | Grava `acknowledged` (`AcknowledgeAlertUseCase.ts:28`); **nunca desativa** — a tabela não tem coluna de desativação | RNF-JUR-04 (`:172`) — **CONFORME por ausência estrutural de coluna** (forma mais forte possível) | **∅ + sem verificação de destinatário** → `T27-F09(b)` |

### 2.8 Fichas cruzadas (3) — `:184-186`

| # | Endpoint | D3 | doc × código | D4 |
|---|---|---|---|---|
| 35 | `GET /contracts/by-supplier/:supplierId` `:184` | `WHERE supplier_id` + whitelist `CROSS_REFERENCE_ATTRIBUTES` (`SequelizeContractRepository.ts:112`) | RF-JUR-045 (`:122`) "leitura, sem duplicar dado" — **CONFORME** | **R** |
| 36 | `GET .../by-client/:clientId` `:185` | `WHERE client_id`, mesma whitelist (`:115`) | **CONFORME** | **R** |
| 37 | `GET .../by-employee/:employeeId` `:186` | `WHERE employee_id`, mesma whitelist (`:118`) | RF-JUR-045 cita fornecedor e cliente; **`by-employee` não consta do texto do RF** — `DISCOVERED_BUSINESS_BEHAVIOR`, não BR | **R** |

## 3. Findings propostos

Todos `PROPOSED`. Severidade e confiança separadas. HIGH passa pelo
`vericore-finding-validator` (Regra 22); persistência via `vericore-audit-evidence-controller`.

### `T27-F01` · HIGH · CONFIDENCE CONFIRMED · D4/D3

**Onze escritas transicionam estado sem verificar o estado anterior — estados terminais
(`answered`, `rejected_justified`, `closed`, `revoked`) são reversíveis por chamada única, sem
trilha de reversão.**

| Endpoint | Âncora do UPDATE incondicional | Reversão |
|---|---|---|
| `POST /lgpd/incidents/:id/decision` | `DecideIncidentUseCase.ts:59-63` | `closed` → `investigating` |
| `POST /lgpd/data-subject-requests/:id/reject` | `RejectDataSubjectRequestUseCase.ts:31-34` | `answered` → `rejected_justified` |
| `POST .../:id/resolve` | `ResolveDataSubjectRequestUseCase.ts:38-42` | `rejected_justified` → `answered` |
| `POST .../:id/verify-identity` | `VerifyIdentityUseCase.ts:40-45` | `answered` → `in_progress` |
| `POST /proxies/:id/revoke` | `RevokeProxyUseCase.ts:35-39` | `revoked_at`/comunicação sobrescritos |
| `POST /lgpd/incidents/:id/close` | `CloseIncidentUseCase.ts:37` | `closed_at` sobrescrito |
| `POST /alerts/:id/acknowledge` | `AcknowledgeAlertUseCase.ts:28` | `acknowledged_at` sobrescrito |
| `PUT /ip-assets/:id` | `UpdateIpAssetUseCase.ts:49` | qualquer `status` → qualquer `status` |
| `POST /lgpd/.../:id/review` | `ReviewProcessingActivityUseCase.ts:31-34` | revisão sobrescrita |
| `GET /proxies` / `GET /proxies/:id` | `ListProxiesUseCase.ts:29`, `GetProxyByIdUseCase.ts:28` | escrita disparada por leitura |

**Contraprova que fortalece:** o único gate correto está em
`UpdateCorporateActUseCase.ts:37-42`. O padrão certo existe **no mesmo módulo, na mesma
passada** — logo a ausência nos outros onze é lacuna, não decisão arquitetural declarada.

**O que os CHECKs de banco cobrem e o que não:** verificados em
`00_baseline_frozen.sql:8908-8909` e `:8982`, são **predicados de estado final, não de
transição**. `ck_..._dsr_in_progress_requires_verification` só exige `identity_verified=true`
quando o status é `in_progress` ou `answered` — nada impede `answered → in_progress`.
`ck_..._incidents_closed_requires_decision` só valida `closed` — nada impede
`closed → investigating`. **A camada de banco não supre a lacuna de aplicação.**

**HIGH e não MEDIUM:** três dos onze gravam o desfecho de obrigação legal com prazo e titular
externo (LGPD arts. 18 e 48). O registro de que a empresa respondeu no prazo é a própria
evidência perante a ANPD, e é sobrescrevível por chamada única, sem versionamento e sem
`oldValues` na trilha (`T27-F10`).

**Limite da confiança:** CONFIRMED que **o código não contém a verificação** (prova de ausência,
exaustiva sobre os 11 arquivos). Efeito em execução **não** observado → `DYN-T27-01`.

### `T27-F07` · HIGH · CONFIDENCE CONFIRMED · D3

**O contrato de API declara alertas D-5/D-1 "já agendados" na criação de solicitação LGPD;
nenhum alerta é criado — em nenhum ponto do código — para solicitação de titular nem para
incidente.**

Documentado: `BLOCO_3_JUR_API.md:852-853` ("Resposta (201) inclui `due_date` calculada … **e
alertas D-5/D-1 já agendados**"); `BLOCO_3_JUR_REQUISITOS.md:110` (RF-JUR-038); `:113`
(RF-JUR-041, "o DPO **recebe os alertas** de solicitações de titular e de incidentes").

Implementado — prova negativa exaustiva: grep de `alertRepository.create|JurLegalAlert.create`
em **todo** `server/src` retorna **4 pontos de criação**, nenhum LGPD: `CreateProxyUseCase.ts:66`,
`CreateIpAssetUseCase.ts:73` e `:82`, `ActivateContractUseCase.ts:112/124/137`.
`CreateDataSubjectRequestUseCase.ts:26-31` e `CreateIncidentUseCase.ts:25-28` **não recebem sequer
o `LegalAlertRepository` no construtor** — não é bug de condição, é ausência de cadeia.

Substituto real e por que não fecha: o painel `pending-critical`
(`SequelizeLgpdRequestRepository.ts:51-63`) cobre D-5 sob demanda, o que RNF-JUR-05 (`:173`)
admite *"se não houver rotina agendada"*. Mas (a) exige que alguém o abra — `FIND-ERP-006` já
registrou que **não existe agendador**, e confirmo que a ausência atinge esta superfície; (b)
**não existe painel equivalente para incidentes**, e `jur_lgpd_incidents` não tem coluna de prazo
(`baseline:8965-8982`) — o prazo do art. 48 **não é controlado por nenhum mecanismo**; (c)
"solicitações de acesso em formato simplificado sinalizadas para resposta imediata"
(RF-JUR-038) **não tem nenhuma implementação**.

**Relação com `FIND-ERP-006`, declarada para não haver dupla contagem:** o 006 afirma que
*resolver* grava `answered` sem apagar nada e que não há agendador. Este é **outro fato** — o
alerta prometido pelo contrato **nunca é criado como registro**, e a lacuna alcança
**incidentes**, fora do escopo do 006. Recomendo mantê-los separados e correlacionados, nunca
fundidos.

### `T27-F08` · MEDIUM · CONFIDENCE CONFIRMED · D3

**A verificação de identidade do titular (BR-JUR-041) é derrotável por coerção de tipo.**

Âncora: `lgpdController.ts:130` — `identity_verified: Boolean(req.body?.identity_verified)`.

O use case checa corretamente `!== true` (`VerifyIdentityUseCase.ts:33`), mas o controller já
converteu. `Boolean("false")`, `Boolean("0")`, `Boolean([])` e `Boolean({})` são **todos
`true`**. A string `"false"` — o que um formulário HTML envia — avança para `in_progress` com
`identity_verified=true` gravado, satisfazendo o CHECK `:8908` e habilitando `resolve`
(`ResolveDataSubjectRequestUseCase.ts:31`). `BLOCO_3_JUR_API.md:859-861` declara que
`identity_verified: false` não avança de estado: com o booleano JSON confere; com a string, não.

**MEDIUM e não HIGH:** exige cliente que envie string onde o contrato pede booleano; não escala
privilégio. Mas grava prova falsa de verificação de identidade de titular. **Se o validator
concluir que a coerção é alcançável pelo `client/` em produção, sobe para HIGH — `client/` não
foi auditado neste escopo e não se presume.**

### `T27-F03` · MEDIUM · CONFIDENCE CONFIRMED · D3

**RF-JUR-032 documenta três janelas de alerta de PI; o código implementa uma integralmente, uma
parcialmente e nenhuma para desenho industrial.**

Documentado (`BLOCO_3_JUR_REQUISITOS.md:99`): marca 12 meses (LPI 133); patente anuidade anual
(LPI 84); desenho industrial prorrogação quinquenal (LPI 108).

Implementado (`CreateIpAssetUseCase.ts:70-90`): `trademark` −12 meses **conforme** (`:70-80`);
qualquer outro tipo com `next_annuity_date` ⇒ alerta **na própria data**, antecedência zero,
**único e não recorrente** (`:81-90`); `industrial_design` cai no mesmo `else if` e **nada
quinquenal existe**; sem `next_annuity_date`, **nenhum alerta**.

**Motivo de MEDIUM:** o requisito carrega `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` e o use
case declara em `:6-9` que a janela exata está pendente de confirmação, *"nunca hard-coded"*. **O
código foi honesto sobre o que não sabia.** O finding é que **a regra não tem fonte autoritativa
fechada** e a lacuna permanece com prazo de terceiro (INPI) correndo → **escala (Regra 21)**.

### `T27-F04` · MEDIUM · CONFIDENCE CONFIRMED · D3

**A guarda de segredo industrial protege um campo que não existe no modelo, enquanto o campo que
pode conter o segredo não tem guarda.**

Guarda: `CreateIpAssetUseCase.ts:47-52`, `UpdateIpAssetUseCase.ts:32-37` rejeitam
`attachment_url` para `trade_secret`. **`attachment_url` não é atributo do model:**
`JurIntellectualProperty.ts:36-59` tem 11 atributos, nenhum de anexo; grep por
`attachment|file_path` em `server/src/models/Jur*.ts` retorna **apenas**
`JurLegalCaseDeadline.ts:34/62` e `JurCorporateAct.ts:29/47`. Campo desprotegido:
`JurIntellectualProperty.ts:41` — `description: TEXT`, gravado sem restrição por tipo em
`CreateIpAssetUseCase.ts:60`.

**Dois lados, registro dos dois:** (1) a favor — o model declara a estratégia em `:9-10`
(*"garantido por ausência estrutural de coluna de conteúdo"*): defesa estrutural, mais forte que
validação; **não é classificado como falha de segurança**. (2) contra — RF-JUR-033 (`:100`) fala
em *"descrição genérica"*, e isso não é verificável nem verificado. A guarda existente dá
aparência de controle sobre vetor inexistente; o vetor real é o único sem controle. MEDIUM pelo
eixo de conformidade documental.

### `T27-F05` · MEDIUM · CONFIDENCE CONFIRMED · D3/D4

**`PUT /corporate-acts/:id` repassa o corpo cru ao `update` — mass assignment, inclusive
`created_by` (NOT NULL).**

Cadeia: `corporateActController.ts:49` (`{ id, ...req.body }`) →
`UpdateCorporateActUseCase.ts:33` (`rest` = todo o corpo) → `:48-51` (`update(id, { ...rest,
status })`, **sem whitelist**) → `SequelizeCorporateActRepository.ts:36` (`act.update(data)` sem
`fields`). Contraste interno: `UpdateIpAssetUseCase.ts:39-51` e
`UpdateProcessingActivityUseCase.ts:32-42` whitelistam campo a campo **no mesmo módulo**.

Efeito: `created_by` (`00_baseline_frozen.sql:8275`, NOT NULL) é reescrevível pelo próprio
requisitante, num repositório documental de finalidade probatória perante a Junta Comercial.

**Escala:** T-18-A fechou mass assignment em 21/21 call sites
(`AUDIT_COVERAGE_EXECUTED.md:214`); este call site é deste escopo, que T-09 não cobriu em D3/D4.
**Não se afirma que T-18 errou** — afirma-se que a interseção precisa ser conferida por quem tem
o inventário dos 21 → `DIV-T27-02`.

### `T27-F02` · MEDIUM · CONFIDENCE CONFIRMED · D3

**Quatro datas de efeito jurídico são aceitas do cliente sem validação de intervalo.**

| Campo | Origem | Destino | Efeito |
|---|---|---|---|
| `received_at` | `lgpdController.ts:117` | `due_date = +15d` (`CreateDataSubjectRequestUseCase.ts:39-41`) | desloca o prazo do art. 19, II |
| `answered_at` | `lgpdController.ts:145` | `ResolveDataSubjectRequestUseCase.ts:41` | grava resposta "no prazo" depois do vencimento |
| `revocation_date` | `proxyController.ts:53` | `RevokeProxyUseCase.ts:37` | antedata revogação de poderes (CC 682, I) |
| `reviewed_at` | `lgpdController.ts:80` | `ReviewProcessingActivityUseCase.ts:27-33` | pós-datar tira a atividade da fila |

Nenhum tem checagem de futuro, passado ou coerência de estado. `new Date(...)` inválido produz
`Invalid Date` sem tratamento (`RevokeProxyUseCase.ts:37`,
`ResolveDataSubjectRequestUseCase.ts:41`). Correlação registrada com `T14-F02` (eixo numérico da
mesma classe, `AUDIT_COVERAGE_EXECUTED.md:437`); **os findings não são fundidos**.

### `T27-F06` · LOW · CONFIDENCE CONFIRMED · D4

**Quatro criações sem chave de unicidade natural — duplo clique produz duplicata silenciosa:**
`registration_protocol` (`baseline:8265-8278`; `JurCorporateAct.ts:53` indexa, não unifica);
`registration_number` (`JurIntellectualProperty.ts:39`, `:53-58`); RoPA
(`JurLgpdProcessingActivity.ts:58`); solicitação de titular
(`JurLgpdDataSubjectRequest.ts:63`).

Contraste que dá o padrão certo: `JurContract.ts:62`, `JurLegalCase.ts:46`,
`JurContractApproval.ts:42`, `uq_jur_ip_contract_links_ip_contract` (`baseline:18427`). **O módulo
sabe fazer; nestes quatro não fez.** LOW porque duplicata documental é detectável por processo —
**exceto** a solicitação de titular, que cria **dois prazos legais para o mesmo pedido**.

### `T27-F09` · LOW · CONFIDENCE CONFIRMED · D3

(a) `GET /ip-assets/:id/contracts` (`:149`) valida existência
(`ListIpContractLinksUseCase.ts:22-23`) mas **não aplica a regra `trade_secret`/admin** de
`GetIpAssetByIdUseCase.ts:34-39`: um não-admin bloqueado no detalhe obtém, pela rota de vínculos,
a confirmação da existência do ativo e a lista de contratos que o protegem
(`SequelizeIpAssetRepository.ts:70-75`) — não o segredo, mas **o grafo em torno dele**.

(b) `POST /alerts/:id/acknowledge` (`AcknowledgeAlertUseCase.ts:24-29`) **não verifica
`recipient_user_id`** — qualquer `juridico:operate` reconhece o alerta de prazo fatal de outro.
RNF-JUR-04 protege contra **desativação** (e essa proteção é real); não fala de reconhecimento
por terceiro, e o código não impede.

(c) `GET /alerts` (`SequelizeLegalAlertRepository.ts:17-21`) só filtra por destinatário se o
cliente pedir.

### `T27-F10` · INFO · CONFIDENCE CONFIRMED · D3

**RF-JUR-043 (`:120`) exige trilha "antes/depois"; as escritas do escopo registram no máximo
`newValues`, e três não registram nada.** `logAction` sem `oldValues` em
`lgpdController.ts:63,72,81,120,134,147,159,191,200,209`; `proxyController.ts:43,56`;
`corporateActController.ts:41,50`; `ipAssetController.ts:52,61`; `alertController.ts:39`. Sem
`logAction` nenhum: `POST /ip-assets/:id/contracts` (`ipAssetController.ts:67-76`) e as escritas
disparadas por leitura (`ListProxiesUseCase.ts:29`, `GetProxyByIdUseCase.ts:28`).

**INFO porque não é desta trilha para elevar:** D6 é titularidade de T-03, que declarou
`E — 362/362` (`AUDIT_COVERAGE_EXECUTED.md:238`). Encaminhado a T-03/`vericore-traceability-auditor`;
não se duplica severidade sobre trilha alheia (Regra 15).

## 4. Confirmações de conformidade (registro simétrico obrigatório)

1. **RF-JUR-027 — 30 dias**: doc `:89` × código `CreateProxyUseCase.ts:46`, aplicado em `:65`.
   Valor documentado = implementado.
2. **RF-JUR-037 — +15 dias (art. 19, II)**: doc `:109` × `CreateDataSubjectRequestUseCase.ts:39-41`
   × **teste** `server/tests/unit/juridico-lgpd-alert-use-cases.test.ts:97`. Três camadas conferem.
3. **RF-JUR-040 — justificativa em ambos os sentidos**: doc `:112` ×
   `DecideIncidentUseCase.ts:41-46` × teste `:183`.
4. **RNF-JUR-04 — alerta fatal indesativável**: implementado por **ausência estrutural de coluna**
   (`AcknowledgeAlertUseCase.ts:2-7`; `JurLegalAlert.ts` sem `disabled`/`muted`/`active`).
5. **`POST /ip-assets/:id/contracts` é idempotente por prova de banco**:
   `UNIQUE (ip_id, contract_id)` existe de fato (`baseline:18423-18427`), traduzido em 409
   (`LinkIpContractUseCase.ts:43-48`). **A constraint foi verificada em vez de confiar no
   comentário do código** — que é exatamente o erro que `T13-F02`/`T13-F03` documentam em outras
   tabelas.

## 5. Cobertura de teste por regra

| Cluster | Suíte | Regras críticas COM teste | Regras críticas SEM teste |
|---|---|---|---|
| LGPD + alertas | `juridico-lgpd-alert-use-cases.test.ts` | `legal_basis` `:52`; +15d `:97`; E1 identidade `:120`; identidade em `resolve` `:129`; justificativa de recusa `:151`; ambas justificativas `:183`; E4 `:210`; acknowledge `:227` | **coerção `"false"` (`F08`)**; **regressão de estado (`F01`)**; datas do cliente (`F02`); alerta D-5/D-1 (`F07`) |
| Procurações + PI | `juridico-proxy-ip-use-cases.test.ts` | alerta de vencimento `:46`; sem alerta se indeterminada `:59`; revogação `:80`; expiração ao acessar `:104`; 12m de marca `:151`; veto anexo `:163`; 403 `:198`; exclusão em lista `:213` | **`UpdateIpAssetUseCase` sem NENHUM teste** — é o use case do `F04`; quinquenal (`F03`); expiração em lote paginado (`F01`) |
| Atos societários | `juridico-corporate-act-use-cases.test.ts` | draft `:46`; transição conjunta `:87`; **imutabilidade `:101`** | **mass assignment (`F05`)** |

**Veredito:** o fluxo principal e as exceções **documentadas** estão testados acima da média do
repositório. **Nenhum dos 9 findings tem teste** — coerente: são comportamentos que ninguém
especificou. Lacuna de cobertura **de regra**, não falha das suítes.

## 6. Divergências (Regra 20) e escalações (Regra 21)

| ID | Divergência | Lados | Encaminhamento |
|---|---|---|---|
| `DIV-T27-01` | `juridico.ts:5-6` diz "71 endpoints"; o arquivo monta **75** | comentário × código | registro; família INV-01…INV-10 (`AUDIT_COVERAGE_EXECUTED.md:359-368`) |
| `DIV-T27-02` | `PUT /corporate-acts/:id` é call site de mass assignment possivelmente fora dos 21 de T-18-A | T-27 × T-18-A | **escala ao director** |
| `DIV-T27-03` | "contratos (16)" de T-09 só fecha com `/reports/financeiro` dentro; `juridico.ts:6-9` o classifica como **G7 Transversal** | T-09 §6 × router | **escala.** Se prevalecer o router, **1 endpoint fica sem D3/D4** e DEF-01 fecha em **74/75**, não 75/75 |

Escalações Regra 21: (1) janela de alerta de PI (`T27-F03`) — sem fonte autoritativa fechada; não
se inventa nem se escolhe entre doc e código. (2) `DIV-T27-03` — decisão de definição, não de
evidência.

## 7. Pedidos de evidência dinâmica (G4) — nenhum executado por esta trilha

Nenhum é pré-requisito dos findings acima, que são todos prova de **ausência de código**.

| ID | Pedido | Aceite |
|---|---|---|
| `DYN-T27-01` | Solicitação `answered` → `reject`; incidente `closed` → `decision` | 200 ⇒ confirma `F01`; 4xx ⇒ refuta |
| `DYN-T27-02` | `verify-identity` com `{"identity_verified":"false"}` | `in_progress` + `identity_verified=true` ⇒ confirma `F08` |
| `DYN-T27-03` | Criar DSR e ler `jur_legal_alerts` por `origin_type` | zero linhas ⇒ confirma `F07` pelo lado do dado |
| `DYN-T27-04` | `PUT /corporate-acts/:id` com `created_by` de outro usuário | alterado ⇒ confirma `F05` |
| `DYN-T27-05` | Procuração vencida na página 3 de `GET /proxies?limit=20`; ler `status` no banco | `active` persistido ⇒ confirma o alcance de `F01` |

## 8. Declaração de cobertura alcançada — sem eufemismo

| Item | Prometido | **Entregue** |
|---|---|---|
| Endpoints do `DEF-01` | 37 | **37 — E (exaustivo)** |
| D3 por endpoint | E 37/37 | **E 37/37**, com âncora `arquivo:linha` dos **dois** lados |
| D4 por endpoint | E 37/37 | **E 37/37**; a negativa de transação é **prova exaustiva de módulo**, não amostra |
| Confronto com `FIND-ERP-005` | verificar se o padrão se repete | **feito: NÃO se repete** (nenhuma alçada por valor nos 37); repete-se **outro** padrão → `T27-F01` |
| Confronto com `FIND-ERP-006` | ponto de partida, não conclusão | **feito**: `T27-F07` é fato distinto e alcança **incidentes**, fora do 006 |

**O que esta trilha NÃO fecha, nominalmente:**

1. **`/reports/financeiro`** — não auditado; fora dos 37 e com titularidade ambígua
   (`DIV-T27-03`).
2. **D1/D2/D5/D6/D7/D9/D10 dos 37** — fora do mandato (D1 em T-09, D6 em T-03, D9 em T-18). **Não
   declarados cobertos.**
3. **Efeito em execução** dos 9 findings — `DYN-T27-01…05` abertos.
4. **`client/src`** — a alcançabilidade real de `T27-F08` não foi verificada, e é o que decide se
   sobe para HIGH. Lacuna declarada em vez de arbitrada.

**Efeito proposto sobre `DEF-01`:** `juridico` D3/D4 passaria de **A(38/75)** para **E(75/75)** —
ou **74/75 + 1 ambíguo**, conforme `DIV-T27-03`. **A atualização da matriz é do
`vericore-audit-consolidator` e a declaração de estado é do director. Esta trilha não altera
`24-coverage/` (Regra 15) e não declara `AUDIT_PASSED` (Regra 4).**

**Estado:** `CONCLUÍDA — 9 FINDINGS PROPOSED, 3 DIVERGÊNCIAS, 2 ESCALAÇÕES`. `T27-F01` e
`T27-F07` (HIGH) exigem `vericore-finding-validator` (Regra 22).
