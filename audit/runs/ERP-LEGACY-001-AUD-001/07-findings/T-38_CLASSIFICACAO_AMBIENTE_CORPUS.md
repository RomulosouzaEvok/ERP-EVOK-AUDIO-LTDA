# T-38 — CLASSIFICAÇÃO DE AMBIENTE DO CORPUS COMPLETO (execução da decisão **D-13**) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-38 — Classificação de ambiente (PRODUÇÃO REAL × DEV/HOMOLOGAÇÃO) do corpus vigente
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
MANDATO:       decisão D-13 do dono (registrada em T-26_CONSOLIDACAO_RODADA4.md:415 e §5.4):
               classificar o ambiente do corpus completo (446 vigentes), módulo a módulo, com
               evidência de artefato já registrado; trazer ao dono APENAS os casos genuinamente
               ambíguos ou sem cobertura de registro.
REGIME:        read-only. Zero conexão de banco (APR-2026-016), zero execução, zero comando,
               zero requisição HTTP. Nenhuma escrita fora de audit/.
NATUREZA:      atributo NOVO ("ambiente") anexado ao corpus por propagação de módulo. NÃO altera
               nenhuma severidade fixada ou proposta (Regra 18). NÃO emite finding novo (Regra 6).
               NÃO reescreve nenhuma rodada anterior (Regra 15). NÃO declara AUDIT_PASSED,
               FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED nem REMEDIATION COMPLETE.
BASE DO CORPUS: T-26_CONSOLIDACAO_RODADA4.md §2.5 — 446 vigentes (9 CRITICAL, 88 HIGH,
               227 MEDIUM, 110 LOW, 11 INFO, 1 sem severidade fixada).
```

---

## 0. Fontes autoritativas, na ordem usada

| # | Artefato | Papel |
|---|---|---|
| 1 | `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` (lido integral nesta sessão) | mapa por módulo/diretório, com a resolução humana `APR-2026-016` incorporada |
| 2 | `coretriad/governance/APPROVALS.md:318-351` (`APR-2026-016`) e `:299-306` (mandato do mapa); `:538-544` (ordem "PRODUÇÃO REAL primeiro" fixada pelo dono) | decisões humanas registradas |
| 3 | `AUD-ALOG-01.md:11-31` e `:111-122` | declarações do dono de 2026-08-16: item A (`DELETE /api/employees/:id`) = **CRITICAL · PRODUÇÃO REAL**; item B (`PATCH /api/items/:id/inactivate`) = **HIGH · PRODUÇÃO REAL**; critério de fila por exposição real |
| 4 | `T-26_CONSOLIDACAO_RODADA4.md` §2.6 | os 4 findings formais de 2026-08-16 (`AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`, `AUD-RH-COMISSAO-01`) declarados **DEV/HOMOLOGAÇÃO com cláusula de reavaliação automática** |
| 5 | `docs/carga-inicial/insumos-materia-prima.csv` + `GUIA_CARGA_INICIAL.md` (existência verificada por listagem; conteúdo não relido) | corroboram o uso real do módulo `items` (327 insumos), já medido em `PRODUCTION_STATUS_MAP.md:87-104` via `GO_LIVE_G6_CHECKLIST.md:1275-1288` |

Nenhuma memória foi usada como fonte normativa (Regras 8/10). Onde não há artefato, a
classificação é `AMBIGUO` — nunca palpite.

---

## 1. Método e convenções declaradas

1. **Classificação por módulo, propagada por trilha.** Cada trilha do corpus tem escopo modular
   declarado no seu próprio relatório; o ambiente do(s) módulo(s) propaga para os findings da
   trilha. Não classifiquei finding a finding, exceto: (a) os 9 CRITICAL (enumerados um a um em
   §4.3); (b) IDs cujo objeto destoa do escopo da trilha (nominalmente listados).
2. **Cinco baldes**, todos com evidência citada:
   - `PRODUCAO_REAL` — módulo classificado produção real por `APR-2026-016` ou por declaração do
     dono de 2026-08-16;
   - `DEV_HOMOLOGACAO` — módulo classificado NÃO-PRODUÇÃO no mapa;
   - `MISTO` — trilha transversal ou de fluxo com **pelo menos uma âncora em módulo/artefato de
     produção real**; o recorte produção-real está nomeado por trilha em §4.4 e a extração
     item a item é o passo operacional seguinte (não é ambiguidade de registro);
   - `GOVERNANCA_DOC` — o objeto do finding é artefato documental/de governança (catálogo de BR,
     rastreabilidade, docs × código), sem ambiente de execução. **Convenção minha, declarada e
     reversível pelo director** — se revertida para "classificar pelo módulo referido", o efeito
     é determinístico e está decomposto em §4.2;
   - `AMBIGUO` — sem cobertura de registro ou com registros em conflito (Regra 20). **Só estes
     voltam ao dono** (§5).
3. **Finding heterogêneo** (`AUD-ALOG-01`): segue a convenção de contagem da Rodada 4 §2.4 —
   conta **uma vez**, no balde `PRODUCAO_REAL` (itens A e B fixados pelo dono), com a
   heterogeneidade como metadado (itens C–H rotulados DEV/HOMOLOGAÇÃO pela trilha — mas ver
   `DIV-T38-01`, §3).
4. **Ambiente não altera severidade.** Nenhuma severidade fixada ou proposta foi tocada.
5. **Parcialidade**: onde o artefato distingue (ex.: `users` = produção real **apenas** na conta
   admin, `PRODUCTION_STATUS_MAP.md:130`; `employees` = uso real declarado **no fluxo de
   desligamento**, `AUD-ALOG-01.md:20,42-57`), a distinção está registrada; a extensão além do
   recorte declarado é `AMBIGUO`.

---

## 2. TABELA MÓDULO → AMBIENTE → EVIDÊNCIA (entregável a)

### 2.1 PRODUÇÃO REAL

| Módulo/artefato | Ambiente | Evidência (arquivo:linha) |
|---|---|---|
| `items` | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:127` + `APPROVALS.md:339-344` (`APR-2026-016`); 327 insumos reais (`PRODUCTION_STATUS_MAP.md:92`; `docs/carga-inicial/insumos-materia-prima.csv`); reconfirmado pelo dono em `AUD-ALOG-01.md:21,67-69` |
| `categories` | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:128` + `APPROVALS.md:339-344` |
| `departments` | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:129` + `APPROVALS.md:339-344` (17 registros = organograma real) |
| `users` | **PRODUCAO_REAL, PARCIAL** — só a conta admin; as 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO | `PRODUCTION_STATUS_MAP.md:130` + `APPROVALS.md:341-342` |
| `auth` | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:131` + `APPROVALS.md:339-344` |
| `auditLogs` | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:132` + `APPROVALS.md:339-344` |
| `docker-compose.yml` (banco `erp_evok_audio`, hospedeiro do dado real) | **PRODUCAO_REAL** | `PRODUCTION_STATUS_MAP.md:198` + `APPROVALS.md:342-344` |
| `employees` — **recorte: fluxo de desligamento** (`DELETE /api/employees/:id`) | **PRODUCAO_REAL (declaração do dono, 2026-08-16)** | `AUD-ALOG-01.md:20` e `:42-57` ("Está em uso real hoje, confirmado pelo dono"). ⚠ Diverge do mapa — ver `DIV-T38-02` (§3). Extensão ao módulo inteiro = AMBIGUO (§5, item 1) |

### 2.2 NÃO-PRODUÇÃO (DEV/HOMOLOGAÇÃO) — módulos tocados pelo corpus

Todos com classificação individual no mapa; cito a linha de cada bloco:

| Bloco de módulos | Ambiente | Evidência |
|---|---|---|
| `suppliers`, `clients`, `products`, `bom`, `production`, `workCenters`, `mrp` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:133-140` (0 registros medidos; gate `G6-START-NO-ROUTE`) |
| `purchases`, `purchaseRequisitions`, `sales`, `rfq` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:141-143,152` (suppliers=0, clients=0) |
| `inventory`, `mobileInventory`, `traceability` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:148-150` (sem inventário de abertura; app não validado em hardware real). ⚠ ver `DIV-T38-03` e §5 item 2 |
| `maintenance`, `serviceOrders`, `quality`, `nonConformities`, `assets`, `laboratory`, `engineering`, `masterProduction` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:144-147,151,164-165,167` |
| `financial` (`finance`/`cnab`/`reconciliation`), `accounting`, `budget`, `treasury` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:154-157` (sem compras/vendas reais para gerar títulos) |
| `fiscal` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:173`; reafirmado em `T-26_CONSOLIDACAO.md:474-476` ("NF-e está em NÃO-PRODUÇÃO hoje" — sem atenuar severidade) |
| `rh`, `sst`, `juridico`, `ti`, `facilities`, `marketing`, `comex` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:153,158-163` |
| `spreadsheetImport`/`catalogImport`, `reports`, `dashboard`, `accessProfiles`, `webhooks`, `directorate`, `intelligentAuditor` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:166,168-174` (nota: `spreadsheetImport` tem confiança BAIXA no próprio mapa — a carga real foi via API direta) |
| `client/` (frontend) | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:180` |
| `mobile/`, `tv/` | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:186,192` |
| CI (`.github/workflows/server-ci.yml`), `docker-compose.prod.yml`, scripts de backup, `*.local.txt`, dependências dev (`AUD-DEP-JSYAML-01`) | DEV_HOMOLOGACAO | `PRODUCTION_STATUS_MAP.md:199-203`; `AUD-DEP-JSYAML-01` fora do runtime por 5 eixos (`T-26_CONSOLIDACAO_RODADA2.md` §4.3) |

---

## 3. DIVERGÊNCIAS ENTRE ARTEFATOS — registradas, NÃO resolvidas (Regra 20)

| # | Divergência | Fontes em conflito | Tratamento adotado aqui |
|---|---|---|---|
| **DIV-T38-01** | Os itens **C** (`itemController.ts:205` — módulo `items`), **F** (`categoryController.ts:66` — `categories`) e **G** (`departmentController.ts:65` — `departments`) de `AUD-ALOG-01` estão rotulados **DEV/HOMOLOGAÇÃO "pela trilha"** (`AUD-ALOG-01.md:22,25-26`; `T-26_CONSOLIDACAO_RODADA4.md:134-135`) — mas os módulos `items`/`categories`/`departments` são **PRODUÇÃO REAL por `APR-2026-016`** (`APPROVALS.md:339-344`) | rótulo da trilha × decisão humana de módulo | Mantenho o rótulo da trilha nos itens (não altero enunciado de finding — Regra 15) e **escalo ao director**: se a classificação de módulo prevalecer, os itens C/F/G sobem de ambiente e a fila muda. Não decido |
| **DIV-T38-02** | `employees`: `PRODUCTION_STATUS_MAP.md:135` = **NÃO-PRODUÇÃO, 0 registros medidos em 2026-08-12, confiança ALTA** × declaração do dono de **2026-08-16** em `AUD-ALOG-01.md:20,52` — endpoint de desligamento **"em uso real hoje"** | mapa (2026-08-13) × decisão humana posterior (2026-08-16) | Adoto a declaração do dono **no recorte declarado** (fluxo de desligamento) por ser decisão humana posterior (Regra 18). **O mapa está desatualizado** e sua atualização é do director (artefato fora do meu namespace — Regra 16). Extensão ao módulo inteiro: AMBIGUO (§5 item 1) |
| **DIV-T38-03** | `AUD-INTEG-03` rotulado **"em PRODUÇÃO REAL"** em `T-26_CONSOLIDACAO.md:852` (§8, item 3), **sem citação de artefato** × mapa classifica `mobileInventory`/`inventory` como **NÃO-PRODUÇÃO** (`PRODUCTION_STATUS_MAP.md:149-150`) | consolidação R1 × mapa | Não resolvo. `AUD-INTEG-03` vai ao balde **AMBIGUO** (§5 item 2). Registro que `T-26_CONSOLIDACAO.md:850` (item 1, `AUD-AUTHN-01` "Ambiente: PRODUÇÃO REAL") **não** diverge — coincide com `APR-2026-016` para `auth` |
| **OBS-T38-02** | Achado lateral, fora do mandato: a soma das colunas HIGH/MEDIUM de `T-26_CONSOLIDACAO.md` §1.3 não fecha contra o §1.2 por ±2 (HIGH enumera 65 com preliminares contra 67 declarados; MEDIUM 120 contra 118) — mesma classe de `OBS-T26-04` | interno à Rodada 1 | **Não afeta esta classificação** (uso totais por trilha, que fecham em 446 — §4.1). Registrado ao director para reconciliação; por isso NÃO publico tabela cruzada severidade × ambiente para os baldes MISTO/DEV/GOV (§7) |

---

## 4. PROPAGAÇÃO E CONTAGEM (entregável b)

### 4.1 Por origem/trilha — 446 vigentes, aritmética fechada

Vigentes por origem no corpus da Rodada 4 (base R1 253 − 7 `DUPLICATE` R1 − 1 `T-10-02` absorvido
= 245; + R2 69; + R3 119; + R4 13 = 446):

| Origem | Vigentes | Módulo(s) | Ambiente propagado |
|---|---|---|---|
| `T-01` (10 = 11 − `AUD-T01-08` dup) | 10 | items/categories/departments | **PRODUCAO_REAL** |
| `T-02` | 13 | auth/users | **PRODUCAO_REAL** (users: recorte admin) |
| `T-03` | 11 | auditLogs | **PRODUCAO_REAL** |
| `FIND-ERP-002` | 1 | auditLogs + role do banco | **PRODUCAO_REAL** |
| `AUD-ALOG-01` | 1 | heterogêneo (A/B produção real; C–H dev) | **PRODUCAO_REAL** (convenção §1.3; `DIV-T38-01` pendente) |
| `T33-A-F04` | 1 | employees — rota legada de desligamento (mesma superfície do item A de `AUD-ALOG-01`) | **PRODUCAO_REAL** (propagação da declaração do dono, `AUD-ALOG-01.md:59-63`) |
| `T-04` (4 = 7 − 3 dup) | 4 | authZ transversal | **MISTO** |
| `T-05` | 13 | fluxo items(prod)↔products(dev) | **MISTO** |
| `T-13` | 12 | schema do banco único (inclui `audit_logs`) | **MISTO** |
| `T-17` | 9 | contrato de API (superfície inclui rotas tier 1) | **MISTO** |
| `T-18` (12 = 14 − 2 dup) | 12 | segredos/config (inclui `docker-compose.yml` e JWT de `auth`) | **MISTO** |
| `T-19` | 11 | arquitetura (inclui ciclo `items ⇄ mrp`, `T-26_CONSOLIDACAO.md:584`) | **MISTO** |
| `T-22` | 5 | CI/plataforma + `docker-compose.yml` (`T22-F02`, `T22-F04`) | **MISTO** |
| `FIND-ERP-001`, `-005`, `-006`, `-008`, `-009` | 5 | inventory / juridico / compliance / LGPD / segregação | DEV_HOMOLOGACAO |
| `T-06` (8 = 9 − `AUD-INTEG-03` p/ AMBIGUO) | 8 | inventory/mobileInventory | DEV_HOMOLOGACAO |
| `T-07` 10 · `T-08` 20 · `T-09` 6 · `T-10` 8 · `T-11` 9 · `T-12` 18 · `T-16` 14 · `T-18-A` 11 · `T-20` 4 · `T-21` 1 · `T-24` 4 | 105 | financeiro, fiscal, juridico, suprimentos/vendas, produção/MRP, rh/sst/LGPD, tier 3, mass assignment, testes, client, integrações | DEV_HOMOLOGACAO |
| `T-27` (JUR 10 + RH 18 + SST 20 + RFQ 12) | 60 | juridico/rh/sst/rfq | DEV_HOMOLOGACAO |
| `T-29` | 7 | mobile/tv | DEV_HOMOLOGACAO |
| `AUD-DEP-JSYAML-01`, `AUD-CICD-DEPGATE-01` | 2 | dependência dev / CI | DEV_HOMOLOGACAO |
| `T-31` (6 = 8 − 2 absorvidos) | 6 | semântica de coluna — tabelas de módulos não-produção (ver limite §7.2) | DEV_HOMOLOGACAO |
| `T-32` (70 = 72 − 2 absorvidos) | 70 | `client/` | DEV_HOMOLOGACAO |
| `T-33` (37 = 40 − 2 absorvidos − `T33-A-F04` p/ produção real) | 37 | endpoints rasos (módulos não-produção) | DEV_HOMOLOGACAO |
| `AUD-COM-DESCONTO-01` (CRITICAL), `AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01` | 3 | sales/fiscal, treasury, accounting | DEV_HOMOLOGACAO |
| `T-35` (8 = 11 − 3 absorvidos) | 8 | tabelas de módulos não-produção | DEV_HOMOLOGACAO |
| `AUD-RH-VTHORISTA-01` (CRITICAL), `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`, `AUD-RH-COMISSAO-01` | 4 | rh, estoque/compras, assets, rh | DEV_HOMOLOGACAO — **declarado pelo próprio dono**, com cláusula de reavaliação automática (`T-26_CONSOLIDACAO_RODADA4.md` §2.6) |
| `T-14` 9 · `T-15` 10 · `T-23` 5 · `FIND-ERP-007` 1 · `AUD-PROC-DOCDRIFT-01` 1 | 26 | catálogo de BR, rastreabilidade, docs × código, contrato documental | GOVERNANCA_DOC (convenção §1.2) |
| `AUD-INTEG-03` (CRITICAL) · `AUD-RH-CPFSEARCH-01` (HIGH) | 2 | ver §5 itens 1-2 | **AMBIGUO** |

### 4.2 Contagem por ambiente (após a propagação)

| Ambiente | Vigentes | Conferência |
|---|---|---|
| **PRODUCAO_REAL** | **37** | T-01 10 + T-02 13 + T-03 11 + `FIND-ERP-002` 1 + `AUD-ALOG-01` 1 + `T33-A-F04` 1 |
| **MISTO** (recorte produção-real a extrair por âncora — §4.4) | **66** | T-04 4 + T-05 13 + T-13 12 + T-17 9 + T-18 12 + T-19 11 + T-22 5 |
| **DEV_HOMOLOGACAO** | **315** | soma das linhas DEV de §4.1 (5+8+105+60+7+2+6+70+37+3+8+4) |
| **GOVERNANCA_DOC** (ambiente não aplicável — convenção reversível) | **26** | T-14 9 + T-15 10 + T-23 5 + `FIND-ERP-007` + `AUD-PROC-DOCDRIFT-01` |
| **AMBIGUO** (volta ao dono) | **2** | `AUD-INTEG-03`, `AUD-RH-CPFSEARCH-01` |
| **TOTAL** | **446** | = placar da Rodada 4 §2.5. **Fecha** |

Estratificação do balde PRODUCAO_REAL, sustentada por enumeração das trilhas de origem
(não pelas colunas de §1.3 da Rodada 1 — ver `OBS-T38-02`):
**2 CRITICAL · 9 HIGH · 14 MEDIUM · 10 LOW · 2 INFO = 37.**

### 4.3 Os 9 CRITICAL, um a um

| ID | Sev./Ambiente | Evidência |
|---|---|---|
| `AUD-AUTHN-01` | CRITICAL · **PRODUCAO_REAL** | `auth` + `docker-compose.yml` (`APPROVALS.md:339-344`; coincide com `T-26_CONSOLIDACAO.md:850`) |
| `AUD-ALOG-01` | CRITICAL · **PRODUCAO_REAL** (itens A/B fixados pelo dono; C–H dev — `DIV-T38-01`) | `AUD-ALOG-01.md:20-31` |
| `AUD-INTEG-03` | CRITICAL · **AMBIGUO** | `DIV-T38-03`; §5 item 2 |
| `FIND-ERP-001` | CRITICAL · DEV_HOMOLOGACAO | `inventory` — `PRODUCTION_STATUS_MAP.md:150`; sujeito à decisão da classe de §5 item 2. Em remediação (CASE-001) — a ordem de caso em curso é do director |
| `FIND-ERP-005` | CRITICAL · DEV_HOMOLOGACAO | `juridico` — `PRODUCTION_STATUS_MAP.md:160`. Em remediação (CASE-002) |
| `T08-F01` | CRITICAL · DEV_HOMOLOGACAO | `fiscal` — `PRODUCTION_STATUS_MAP.md:173`; `T-26_CONSOLIDACAO.md:474-476` |
| `T24-F01` | CRITICAL · DEV_HOMOLOGACAO | idem `fiscal` |
| `AUD-COM-DESCONTO-01` | CRITICAL · DEV_HOMOLOGACAO | `sales`/`fiscal` — `PRODUCTION_STATUS_MAP.md:143,173` (clients = 0) |
| `AUD-RH-VTHORISTA-01` | CRITICAL · DEV_HOMOLOGACAO **declarado pelo dono**, com cláusula de reavaliação automática | `T-26_CONSOLIDACAO_RODADA4.md` §2.6 |

Os 9 HIGH de PRODUÇÃO REAL, nominalmente: `AUD-T01-01`, `AUD-T01-02`, `AUD-AUTHN-02`,
`AUD-AUTHN-03`, `AUD-DB-01`, `AUD-DB-02`, `AUD-DB-03`, `FIND-ERP-002`, `T33-A-F04` —
mais o item B de `AUD-ALOG-01` (HIGH · PRODUÇÃO REAL, metadado do finding heterogêneo).
Nota sobre `AUD-DB-03`: a **amplitude** cobre 13 módulos majoritariamente dev, mas o finding
inclui nominalmente o tier 1 (`items`/`categories`/`departments` — C-06 da Rodada 1) e é de
`auditLogs`; a classificação PRODUCAO_REAL vale para o recorte tier 1 + trilha, e o lote de
remediação segue a partição já fixada na Rodada 4 §3.2.

### 4.4 Recorte produção-real dos MISTO — nomeado por trilha

A extração item a item é o passo operacional seguinte (pendência T-19 ao director, §6.2); os
recortes já identificáveis por leitura do corpus consolidado:

| Trilha | Recorte produção-real nomeado |
|---|---|
| T-04 | `AUD-SEC-T04-01` — "2 âncoras em módulos de PRODUÇÃO" (`T-26_CONSOLIDACAO.md:421`) |
| T-05 | escrita em `items.status` (`T-05-04`, canônico de DIV-SEV-02) e demais âncoras no lado `items`; o lado `products` é dev |
| T-13 | `T13-F09` e a célula `audit_logs` de `T13-F08…F11` (módulo `auditLogs`); o hospedeiro único do dado real |
| T-17 | superfície de contrato das rotas tier 1 e `auth` (ex.: recorte tier 1 de `T17-F03`) |
| T-18 | `T18-F02` (compose/runtimeEnv — causa-raiz de `AUD-AUTHN-01`), `T18-F03` (segredos, incl. JWT) |
| T-19 | `T19-F03` — ciclo `items ⇄ mrp` ("items é tier 1/PRODUÇÃO", `T-26_CONSOLIDACAO.md:584`) |
| T-22 | `T22-F02` e `T22-F04` (âncoras em `docker-compose.yml`, produção real por `APR-2026-016`) |

---

## 5. CASOS GENUINAMENTE AMBÍGUOS OU SEM COBERTURA DE REGISTRO (entregável c — os únicos que voltam ao dono)

1. **Extensão do módulo `employees`.** A declaração de 2026-08-16 cobre o **fluxo de
   desligamento** (`AUD-ALOG-01.md:20,42-57`). O módulo inteiro (cadastro, listagem, busca) está
   em uso real? O mapa diz 0 registros em 2026-08-12 (`PRODUCTION_STATUS_MAP.md:135`) — medição
   anterior à declaração. **Afeta diretamente:** `AUD-RH-CPFSEARCH-01` (HIGH — busca por CPF com
   oráculo de contagem) e o recorte `employees` de `AUD-DB-03`/`T33-A-F06`. Nenhum artefato
   registrado responde; decisão do dono.
2. **Classe "módulo NÃO-PRODUÇÃO com caminho de escrita sobre dado de módulo PRODUÇÃO REAL".**
   O mapa classifica por volume de dado do módulo; o critério do dono é exposição real. Módulos
   dev cuja escrita altera o estado dos 327 itens reais: `mobileInventory`/`inventory`
   (**`AUD-INTEG-03`** — CRITICAL, e `FIND-ERP-001`), cadastro simples de `client/`
   (`T32-SUP-F03` — estoque inicial que alimenta o MRP). O dono decide **uma vez, para a
   classe**: exposição real se aplica a essas escritas cross-módulo ou não? (Resolve também
   `DIV-T38-03`.)
3. **Itens C/F/G de `AUD-ALOG-01`** (`DIV-T38-01`): prevalece o rótulo DEV/HOMOLOGAÇÃO da trilha
   ou a classificação de módulo de `APR-2026-016` (items/categories/departments = produção
   real)? Encaminhado via director; a decisão de ambiente é do dono.
4. **Findings de governança/documentação (26 IDs — T-14, T-15, T-23, `FIND-ERP-007`,
   `AUD-PROC-DOCDRIFT-01`).** Nenhum registro atribui ambiente a artefato documental. Convenção
   adotada: "ambiente não aplicável". Confirmar ou mandar classificar pelo módulo referido.
5. **Alcance do critério de fila por estrato.** Lido literalmente
   (`T-26_CONSOLIDACAO_RODADA4.md:352-363`), um LOW de produção real fica à frente de um
   CRITICAL dev. Aplico como escrito (§6), mas os 14 MEDIUM + 10 LOW + 2 INFO de produção real
   à frente dos 6 CRITICAL dev é consequência que o dono deve ver antes de a fila completa ser
   emitida. Confirmar se o critério vale para todos os estratos ou apenas CRITICAL/HIGH.
6. **`PRODUCTION_STATUS_MAP.md` desatualizado** (`DIV-T38-02`): a atualização por adição
   (employees + eventuais decisões dos itens 1-3) é do director — registro, não executo
   (Regra 16).

Todos os demais módulos do corpus estão cobertos por registro existente — **nenhuma outra
pergunta módulo a módulo é necessária**, conforme a instrução da D-13.

---

## 6. EFEITO NA FILA DE EXPOSIÇÃO REAL (entregável d)

Aplicando o critério do dono (`AUD-ALOG-01.md:111-122`; `T-26_CONSOLIDACAO_RODADA4.md` §5.1)
ao corpus agora classificado:

1. **Cabeça mantida:** `AUD-ALOG-01/A` (CRITICAL · produção real), `AUD-ALOG-01/B` (HIGH ·
   produção real) — posições 1-2 da Rodada 4 §5.2 **inalteradas**, com uma disputa nova:
   **`AUD-AUTHN-01` (CRITICAL · produção real) entra no mesmo estrato de topo.** Recomendação
   técnica (Regra 6, decisão do director): `AUD-AUTHN-01` à frente ou em paralelo — anula todos
   os demais controles de authZ e tem a prova dinâmica mais barata da run (`DYN-T02-01`).
2. **Sobem para o estrato produção real — à frente de todos os 6 CRITICAL dev** (`FIND-ERP-001`*,
   `FIND-ERP-005`*, `T08-F01`, `T24-F01`, `AUD-COM-DESCONTO-01`, `AUD-RH-VTHORISTA-01`;
   * já em remediação — casos em curso não são reordenados por mim):
   os **9 HIGH nominais de §4.3** (`AUD-T01-01`, `AUD-T01-02`, `AUD-AUTHN-02`, `AUD-AUTHN-03`,
   `AUD-DB-01`, `AUD-DB-02`, `AUD-DB-03` [recorte], `FIND-ERP-002`, `T33-A-F04`).
3. **Consequência literal do critério, declarada para ninguém descobrir tarde:** os 14 MEDIUM,
   10 LOW e 2 INFO de produção real também precedem os estratos dev — inclusive CRITICAL dev.
   Sujeito à confirmação do dono (§5 item 5).
4. **MISTO herda "no recorte necessário"** (regra do próprio critério): os recortes nomeados em
   §4.4 entram no estrato produção real; o restante de cada trilha segue a fila dev normal.
   A enumeração âncora a âncora é a pendência T-19 (§6.2 da Rodada 4 estendida — director).
5. **Indeterminações remanescentes da fila:** os 2 AMBIGUO (§5 itens 1-2) — um deles CRITICAL
   (`AUD-INTEG-03`) — não têm posição final até a decisão do dono. `AUD-RH-COMISSAO-01`
   permanece fora da fila por falta de severidade (D-11).
6. **Cláusulas de reavaliação automática** (Rodada 4 §5.1, 3º critério) permanecem metadado
   obrigatório: `AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01`,
   `AUD-RH-COMISSAO-01` sobem a BLOQUEANTE na entrada do módulo em produção, sem novo despacho.

Com isto, **a condição declarada em `T-26_CONSOLIDACAO_RODADA4.md` §5.4 está satisfeita no que
depende de registro**: a fila completa por exposição real pode ser emitida assim que o dono
responder os itens de §5 (em particular 2, 3 e 5).

---

## 7. LIMITES DESTE AGENTE — sem atenuação

### 7.1 Por leitura própria nesta sessão

`PRODUCTION_STATUS_MAP.md` (integral); `T-26_CONSOLIDACAO_RODADA4.md` (integral);
`T-26_CONSOLIDACAO.md` (integral); `T-26_CONSOLIDACAO_RODADA2.md` (dirigido: §0-§6);
`T-26_CONSOLIDACAO_RODADA3.md` (dirigido: §0-§5); `AUD-ALOG-01.md` (integral);
`APPROVALS.md:295-354` e `:530-544` (dirigido, mais grep por "produção real");
listagem de `docs/carga-inicial/` e de `07-findings/`. **Toda a aritmética de §4 foi refeita
por mim e fecha em 446 nos dois sentidos** (por origem e por balde).

### 7.2 Aceito de relato, sem reverificar

1. **Nenhum arquivo do objeto auditado foi aberto** (`server/`, `client/`, `docs/` fora de
   `carga-inicial` por listagem, `product/`). O escopo modular de cada trilha foi tomado dos
   próprios relatórios consolidados, não reconferido âncora a âncora.
2. **T-31 e T-35**: a afirmação de que as tabelas cobertas pertencem todas a módulos
   não-produção vem dos títulos e grupos dos relatórios (CTB/EST/DIN/PRD/RH/JUR/LGPD/PAT/TES);
   **não reli a lista tabela a tabela**. Se alguma tabela dessas trilhas pertencer a módulo de
   produção real, o ID correspondente migra de DEV para MISTO — correção por adição em rodada
   seguinte.
3. A medição de dados de 2026-08-12 (tabela do mapa) e toda a evidência nela citada.

### 7.3 O que esta classificação não oferece

- **Tabela cruzada severidade × ambiente completa** para MISTO/DEV/GOV — bloqueada por
  `OBS-T38-02` (colunas da Rodada 1 §1.3 não fecham por ±2). O estrato PRODUCAO_REAL tem a
  estratificação completa porque foi enumerado por ID.
- **Extração item a item dos recortes MISTO** — nomeada em §4.4, não executada.
- O par de cobertura continua dois corpora atrás (`OBS-T26-33`) — esta rodada não o produz.

---

## 8. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2). Única escrita:
  este documento, em `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`.
- Nenhuma rodada anterior foi editada (Regra 15). As divergências com artefatos anteriores estão
  em §3, registradas e escaladas — nenhuma resolvida por mim (Regra 20).
- **Nenhuma severidade foi alterada** (Regra 18). Ambiente é atributo novo, anexado por
  propagação, com evidência citada linha a linha.
- Nenhum finding novo, nenhum descartado, nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED`.
- **Critério de conclusão da D-13:** 446/446 vigentes classificados (37 produção real, 66 misto
  com recorte nomeado, 315 dev/homologação, 26 governança-doc, 2 ambíguos); total confere com o
  placar da Rodada 4; **apenas 6 itens voltam ao dono** (§5), todos genuinamente sem cobertura
  de registro ou com registros em conflito.

**Entrega:** ao `vericore-software-audit-director` (itens de §5 para o dono; `DIV-T38-01…03` e
atualização do mapa) e ao `vericore-audit-reporting-agent` (o atributo de ambiente acompanha o
corpus consolidado da Rodada 4).
