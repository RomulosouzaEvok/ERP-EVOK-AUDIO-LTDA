# AUDIT_COVERAGE_MATRIX — ERP-LEGACY-001-AUD-001 (**COBERTURA PLANEJADA**)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
ESTÁGIO:       02-plan
NATUREZA:      COBERTURA **PLANEJADA** — não é registro de cobertura executada.
               A matriz EXECUTADA é produzida por T-26 ao fim do fieldwork e
               qualquer divergência entre as duas é registro obrigatório.
ESTADO:        aguardando gate humano (G2 e G3 do AUDIT_PLAN.md §12)
```

## 0. Regra que governa este documento

> **Lição do SIM-002 (empírica, não teórica):** uma coverage matrix que declarou
> cobrir o que não cobria foi **refutada por evidência** e custou o
> `AUDIT_PASSED`. Aqui vale a regra inversa: **declarar menos e verdadeiro,
> nunca mais e otimista.**

Consequências operacionais, vinculantes:

1. Toda célula `A` (amostral) tem **regra de seleção e percentual** declarados.
   Amostragem sem regra escrita é violação de plano.
2. Toda célula `N` (não coberto) tem **motivo**. Silêncio não é cobertura.
3. Célula em branco é **defeito de plano** e motivo suficiente para T-26 rejeitar
   a consolidação.
4. Se o fieldwork cobrir **menos** que o planejado, a matriz executada registra a
   redução — **este plano não é editado retroativamente** para caber no resultado.

## 1. Legenda

| Símbolo | Significado |
|---|---|
| **E** | **Exaustivo** — 100% da superfície daquela célula |
| **A** | **Amostral declarado** — regra e percentual em §5 |
| **R** | **Raso** — apenas presença/ausência do controle; **sem** análise de regra de negócio. Nunca pode ser reportado como "auditado" |
| **N** | **Não coberto** — motivo obrigatório em §6 |
| **n/a** | Dimensão não aplicável ao objeto (com nota) |

## 2. Dimensões de auditoria

| ID | Dimensão | Trilha(s) responsáveis |
|---|---|---|
| **D1** | AuthN/AuthZ efetiva por endpoint (inclui Regra 24 do `CLAUDE.md`: role declarado pelo cliente) | T-04 (mapa), T-02, T-09, T-16 |
| **D2** | Contrato de API e validação de entrada | T-17, T-01, T-10, T-16 |
| **D3** | Regra de negócio × `BR_CATALOG.md` (164 BRs) e requisitos (89) | T-14, T-15, T-12, T-11, T-08 |
| **D4** | Integridade transacional e idempotência | T-06, T-07, T-05, T-13 |
| **D5** | Dados: model × tabela × migration; PK/FK/UNIQUE/NOT NULL | T-13 |
| **D6** | Audit log e rastreabilidade de operação (imutabilidade) | T-03 |
| **D7** | Testes: existência, efetividade, cobertura do módulo | T-20 |
| **D8** | Documentação × código | T-23 |
| **D9** | Segurança de aplicação, segredos e dependências | T-18 |
| **D10** | Arquitetura, camadas e dependências internas | T-19 |

---

## 3. TIER 1 — PRODUÇÃO REAL (6 módulos, 39 endpoints) — **100% exaustivo**

Regime read-only reforçado permanente (`APR-2026-016`). **Nenhuma célula
amostral, em nenhuma dimensão.**

| Módulo | End. | Trilha titular | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `items` | 12 | T-01 (+T-05 fluxo) | E | E | E | E | E | E | E | E | E | E |
| `categories` | 5 | T-01 | E | E | E | E | E | E | E | E | E | E |
| `departments` | 5 | T-01 | E | E | E | E | E | E | E | E | E | E |
| `users` | 7 | T-02 | E | E | E | E | E | E | E | E | E | E |
| `auth` | 8 | T-02 | E | E | E | E | E | E | E | E | E | E |
| `auditLogs` | 2 | T-03 | E | E | E | E | E | E | E | E | E | E |
| **Total** | **39** | | **39/39 em todas as dimensões** ||||||||||

Notas de tier 1:
- `users`: **o código do módulo é auditado integralmente**; o *dado* real é só a
  conta admin (as 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO). A distinção é de
  dado, não de cobertura de código.
- `items`: além da célula de módulo (T-01), participa do fluxo cross-tier de T-05
  (espelhamento item↔produto, `3dee99f`). **As duas coberturas são cumulativas,
  não alternativas.**
- Banco por trás de `docker-compose.yml`: objeto de **leitura declarada apenas**
  (migrations, dump congelado, models, seeds). Nenhuma conexão a `erp_evok_audio`.

---

## 4. TIER 2 — alto risco (20 módulos, 381 endpoints)

**Dois níveis, ambos declarados:** D1/D2/D6 exaustivos nos 381 endpoints
(alavancados pelo mapa authZ de T-04); D3 e D4 com profundidade dirigida e
amostragem declarada onde a superfície é grande demais para promessa honesta de
exaustividade.

| Módulo | End. | Trilha | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `inventory` | 27 | T-06 | E | E | E | E | E | E | E | E | A | E |
| `mobileInventory` | 3 | T-06 | E | E | E | E | E | E | A | A | A | E |
| `traceability` | 3 | T-06 | E | E | E | E | E | E | A | A | A | E |
| `financial` | 30 | T-07 | E | E | E | E | E | E | E | E | A | E |
| `treasury` | 11 | T-07 | E | E | A | E | E | E | A | A | A | E |
| `accounting` | 11 | T-07 | E | E | A | E | E | E | A | A | A | E |
| `budget` | 6 | T-07 | E | E | A | E | E | E | A | A | A | E |
| `fiscal` | 2 | T-08 | E | E | E | E | E | E | E | E | A | E |
| `accessProfiles` | 6 | T-09 | E | E | E | E | E | E | E | E | E | E |
| `juridico` | 75 | T-09 | E | E | **A** | A | E | E | A | A | A | A |
| `purchases` | 10 | T-10 (+T-05) | E | E | E | E | E | E | E | E | A | E |
| `purchaseRequisitions` | 5 | T-10 | E | E | E | E | E | E | A | A | A | E |
| `rfq` | 7 | T-10 | E | E | A | A | E | E | A | A | A | A |
| `suppliers` | 6 | T-10 | E | E | A | A | E | E | A | A | A | A |
| `sales` | 13 | T-10 | E | E | E | E | E | E | A | A | A | E |
| `mrp` | 4 | T-11 | E | E | E | E | E | E | E | A | A | E |
| `production` | 23 | T-11 | E | E | E | E | E | E | E | A | A | E |
| `masterProduction` | 7 | T-11 | E | E | A | A | E | E | A | A | A | A |
| `rh` | 57 | T-12 | E | E | **A** | A | E | E | A | A | A | A |
| `sst` | 75 | T-12 | E | E | **A** | A | E | E | A | A | A | A |
| **Total** | **381** | | **381/381** | **381/381** | ver §5.1 | ver §5.2 | E | **381/381** | | | | |

**Declaração negativa obrigatória do tier 2:** os três módulos de maior superfície
— `juridico` (75), `rh` (57), `sst` (75), **207 endpoints somados** — **não** terão
análise de regra de negócio (D3) exaustiva. Prometer 207 endpoints de análise
profunda de regra seria a mesma promessa que o SIM-002 refutou. A amostra está em
§5.1 e é item de gate (G3).

---

## 5. Amostragens declaradas (regra + percentual)

### 5.1 D3 (regra de negócio) em `juridico`, `rh`, `sst`

**Regra de seleção**, aplicada nesta ordem de prioridade:
1. todo endpoint que é **âncora de finding preliminar** (FIND-ERP-005, 006, 007,
   008, 009);
2. todo endpoint que **escreve dado pessoal sensível** ou registro com efeito legal
   (CAT/eSocial, contrato, rescisão, incidente LGPD);
3. todo endpoint com **obrigação legal com prazo** (ANPD, S-2210, alçada);
4. todo endpoint mapeado a uma BR do `BR_CATALOG.md` com severidade de impacto
   financeiro ou legal.

| Módulo | Endpoints | Amostra D3 | % | Complemento |
|---|---|---|---|---|
| `juridico` | 75 | **24** | 32% | os 51 restantes: D1/D2/D6 exaustivos, D3 = **não coberto** (§6, N-04) |
| `rh` | 57 | **20** | 35% | os 37 restantes: idem (N-04) |
| `sst` | 75 | **24** | 32% | os 51 restantes: idem (N-04) |
| **Soma** | **207** | **68** | **33%** | **139 endpoints sem análise de regra de negócio** |

A **lista nominal** dos 68 endpoints é fixada no início de T-12/T-09 e anexada ao
relatório **antes** da análise — nunca ajustada depois para caber no achado.

### 5.2 D4 (idempotência/transação) em tier 2

- **Exaustivo** onde há escrita de saldo, estoque, título financeiro ou documento
  fiscal: `inventory`, `mobileInventory`, `traceability`, `financial`, `treasury`,
  `accounting`, `budget`, `fiscal`, `purchases`, `purchaseRequisitions`, `sales`,
  `mrp`, `production`, `accessProfiles`.
- **Amostral** onde a escrita é cadastral: `juridico`, `rh`, `sst`, `rfq`,
  `suppliers`, `masterProduction` — amostra = rotas de escrita com efeito em
  documento com valor ou prazo legal.

### 5.3 Tier 3 (§7) e front-ends (§8)
Regras próprias, declaradas nas respectivas seções.

### 5.4 D8 (documentação × código)
- **E** nos documentos que descrevem tier 1 e tier 2 e nos 15 READMEs de módulo.
- **A** no restante dos 172 `.md` em escopo — regra: documento citado por qualquer
  trilha, documento que declara número (contagem, tributo, prazo) e documento de
  processo do produto. Alvo declarado: **≈90 dos 172 (52%)**.

### 5.5 D5 (dados)
- **E** para as 207 tabelas quanto a PK/FK/UNIQUE/NOT NULL **declarados** e para
  os 186 models quanto a correspondência model × tabela.
- **A** para **semântica** de coluna — amostra = todas as tabelas tocadas por tier
  1 e tier 2. Semântica de colunas exclusivas de tier 3 raso: **não coberta**
  (N-05).

---

## 6. O QUE ESTE PLANO **NÃO** COBRE — declaração explícita

| ID | Não coberto | Motivo |
|---|---|---|
| **N-01** | Qualquer execução contra o banco real `erp_evok_audio` e qualquer inspeção de dado real (uma linha, uma query) | `APR-2026-016` / `AUDIT_SCOPE.md` §5 — regime inviolável. Exigiria aprovação humana caso a caso, **nunca por extensão** |
| **N-02** | Tudo em E1-E10 do escopo: simulados SIM-001/SIM-002, `coretriad/`, `.claude/`, `docs/coretriad/`, `node_modules/` e builds, **conteúdo** dos arquivos não versionados, `.git/` como objeto, workspace `tibia`, auto memory | Exclusões formais registradas em `AUDIT_SCOPE.md` §6 |
| **N-03** | **Conteúdo** de `CREDENCIAIS_TESTE.local.txt`, `CREDENCIAIS_APROVADOR.local.txt`, `ACESSOS_N8N.local.txt` | E6. Apenas a **existência** pode fundamentar finding de gestão de segredos. Abrir qualquer um é violação de escopo |
| **N-04** | **139 dos 207 endpoints** de `juridico`/`rh`/`sst` quanto a **regra de negócio (D3)** | §5.1 — superfície incompatível com promessa honesta de exaustividade. D1/D2/D6 permanecem exaustivos neles |
| **N-05** | **Semântica** das colunas de tabelas exclusivas dos módulos tier 3 rasos | §5.5 — profundidade proporcional ao risco |
| **N-06** | Análise de **regra de negócio** nos 10 módulos tier 3 de varredura rasa (43 endpoints): `clients`, `employees`, `maintenance`, `serviceOrders`, `nonConformities`, `spreadsheetImport`, `intelligentAuditor`, `quality`, `laboratory`, `dashboard` | §7 — amostragem declarada, aprovada no gate G3. Terão apenas D1/D2 em nível **R** |
| **N-07** | **127 das 167 páginas** do `client/` | §8 — amostra dirigida a tier 1/tier 2 e a telas citadas por finding |
| **N-08** | `mobile/` e `tv/` além de varredura estrutural | Sem suíte de teste identificada, sem pipeline de CI, superfície de risco baixa relativa. Cobertura = estrutura, dependências e authN do cliente |
| **N-09** | Teste de penetração, DAST, fuzzing, análise dinâmica de segurança | Fora do mandato da `APR-2026-020`; exigiria ambiente e autorização próprios |
| **N-10** | Teste de carga, performance sob volume real, capacidade | Exigiria dado real ou massa sintética equivalente; N-01 impede |
| **N-11** | Auditoria de licenças de dependências transitivas dentro de `node_modules` | E5 — dependências são auditadas pelos **manifestos versionados** |
| **N-12** | Comportamento em **operação real** (logs de produção, incidentes, métricas) | Não existe ambiente de produção separado; infra é auditada **como declarada** |
| **N-13** | Qualquer alteração posterior ao `AUDIT_COMMIT`, inclusive as remediações SanaCore em curso (`APR-2026-020` Decisão B) | Regras 13-14 — exige **delta audit** ou nova auditoria. Item de gate G7 |
| **N-14** | Trilhas de IA (`ai-system`, `llm-security`, `rag`, `ai-evaluation`) e `agent-permission` | **Dispensadas com evidência** — `AUDIT_PLAN.md` §9. `intelligentAuditor` é SQL determinístico; zero SDK de IA em qualquer `package.json`; `.claude/` excluído por E3. Com **cláusula de reabertura** |
| **N-15** | Correção de qualquer defeito encontrado | Regra 2 — VeriCore **nunca** corrige o objeto auditado |
| **N-16** | Definição de **OWNER por área** das regras de negócio | `APR-2026-019` parte 2 / `APR-2026-020`: atribuição do dono; **vedado a agente decidir ou inferir**. T-14 **reporta** a lacuna, não a preenche |

---

## 7. TIER 3 — 22 módulos, 261 endpoints (amostragem declarada, aritmética fechada)

### 7.1 Profundidade em 7 módulos (174 endpoints) — regra: maior superfície e maior potencial de escrita

| Módulo | End. | Trilha | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `facilities` | 64 | T-16 | E | E | A | A | A | E | A | A | A | A |
| `ti` | 47 | T-16 | E | E | A | A | A | E | A | A | A | A |
| `marketing` | 30 | T-16 | E | E | A | A | A | E | A | A | A | A |
| `engineering` | 11 | T-16 | E | E | A | A | A | E | A | A | A | A |
| `comex` | 8 | T-16 (+T-24) | E | E | A | A | A | E | A | A | A | A |
| `reports` | 8 | T-16 | E | E | A | n/a¹ | A | E | A | A | A | A |
| `workCenters` | 6 | T-16 | E | E | A | A | A | E | A | A | A | A |
| **Subtotal** | **174** | | | | | | | | | | | |

¹ `reports` é somente leitura por desenho; a **verificação** de que não escreve é
parte de D2/D4 e o resultado negativo é registrado (se escrever, é finding).

### 7.2 Módulos tier 3 **puxados** para profundidade de tier 2 (44 endpoints)

Tier **não alterado** (autoridade do `vericore-audit-scope-agent`); apenas a
profundidade foi elevada, conforme as notas do inventário.

| Módulo | End. | Trilha | Motivo | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `products` | 9 | T-05 | fluxo `3dee99f` item↔produto | E | E | E | E | E | E | E | E | A | E |
| `assets` | 7 | T-05 | recebimento de imobilizado (`3dee99f`) | E | E | E | E | E | E | A | A | A | E |
| `bom` | 12 | T-11 | BR-PP-016/017, **dois motores de explosão divergentes** | E | E | E | E | E | E | E | E | A | E |
| `directorate` | 14 | T-09 | concentra **alçada/aprovação**, matéria do FIND-ERP-009 | E | E | E | E | E | E | A | A | A | E |
| `webhooks` | 2 | T-24 | superfície de integração exposta | E | E | A | A | A | E | A | A | E | A |
| **Subtotal** | **44** | | | | | | | | | | | | |

### 7.3 Varredura **RASA** — 10 módulos, 43 endpoints (**declarada, nunca reportável como "auditada"**)

Cobertura: **apenas** presença/ausência de authN+authZ (D1) e de validação de
entrada (D2). **Sem** análise de regra de negócio, transação, dados ou testes.

| Módulo | End. | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `clients` | 5 | R | R | N (N-06) | N | N (N-05) | R | N | N | N | N |
| `employees` | 5 | R | R | N | N | N | R | N | N | N | N |
| `maintenance` | 5 | R | R | N | N | N | R | N | N | N | N |
| `serviceOrders` | 5 | R | R | N | N | N | R | N | N | N | N |
| `nonConformities` | 5 | R | R | N | N | N | R | N | N | N | N |
| `spreadsheetImport` | 5 | R | R | N | N | N | R | N | N | N | N |
| `intelligentAuditor` | 4 | R | R | N | N | N | R | N | N | N | N |
| `quality` | 3 | R | R | N | N | N | R | N | N | N | N |
| `laboratory` | 3 | R | R | N | N | N | R | N | N | N | N |
| `dashboard` | 3 | R | R | N | N | N | R | N | N | N | N |
| **Subtotal** | **43** | | | | | | | | | | |

Nota sobre `intelligentAuditor`: a varredura rasa **inclui** a confirmação de que
o módulo não usa IA (evidência já levantada — `AUDIT_PLAN.md` §9). Se a confirmação
falhar, aplica-se a **cláusula de reabertura** das trilhas de IA.

### 7.4 Fechamento aritmético do tier 3

| Faixa | Endpoints | % do tier 3 |
|---|---|---|
| Profundidade (§7.1) | 174 | 66,7% |
| Profundidade elevada (§7.2) | 44 | 16,9% |
| **Subtotal profundo** | **218** | **83,5%** |
| Varredura rasa (§7.3) | 43 | 16,5% |
| **Não coberto (nenhuma dimensão)** | **0** | **0%** |
| **Total** | **261** | **100%** |

---

## 8. Superfícies não-modulares e não-backend

| Superfície | Tamanho | Dono / trilha | Cobertura planejada |
|---|---|---|---|
| `server/src/middlewares/` | 6 arquivos, **100% da authZ** | `vericore-appsec-auditor` / **T-04** | **E** em todas as dimensões aplicáveis. Produz o mapa authZ dos 681 endpoints |
| `server/app.ts` | 65 `app.use(` | T-04 | **E** — ordem de montagem e rotas sem authZ |
| `server/src/services/auditLogService.ts` | **101 arquivos / 403 ocorrências** | `vericore-database-auditor` / **T-03** | **E por classe de uso**, com enumeração completa das 403 ocorrências anexa. Estratificação declarada — **não** é amostragem |
| `server/src/services/` — 15 demais | 16 no total | `vericore-service-layer-auditor` / **T-05** (dono) | **E** para os 16 quanto a existência, chamadores e responsabilidade; profundidade de regra sub-alocada a T-06 (estoque), T-07 (financeiro), T-11 (BOM), T-24 (e-mail/upload/QR) |
| `itemProductMirrorService.ts`, `fixedAssetReceiptService.ts` | 2 arquivos, **sem cobertura de auditoria anterior** | T-05 (RA-08) | **E — 100% das linhas.** Regra extraída e confrontada com `BR_CATALOG.md`; BR ausente é finding |
| `server/src/models/` | 186 arquivos | `vericore-database-auditor` / **T-13** | **E** em correspondência model × tabela; **A** em semântica (§5.5) |
| Schema declarado | 207 tabelas / 478 FKs / 169 migrations | `vericore-migration-auditor` / **T-13** | **E** em PK/FK/UNIQUE/NOT NULL declarados. Fonte = `00_baseline_frozen.sql` + 9 migrations pós-congelamento, **não** a soma dos `createTable()` |
| Rotas / contrato de API | 53 arquivos, 681 endpoints | `vericore-api-auditor` / **T-17** | **E** em inventário e código de status; **A** em semântica profunda (tiers 1-2 + os 174 profundos do tier 3) |
| Testes | 177 unit + 59 integ. + 1 edge + 9 charact. (66 casos) | `vericore-qa-auditor` / **T-20** | **E** em inventário e classificação; **A** em efetividade por asserção. Inclui OBS-INV-03 (33 blocos × 66 casos, exige runtime) e OBS-INV-06 (2 testes falhando) |
| `client/` | 167 páginas `.tsx` | `vericore-frontend-auditor` / **T-21** | **A — ≈40/167 (24%)**, regra: páginas que consomem tier 1/tier 2 + telas citadas por finding (inclui a UI de CAT do FIND-ERP-008). **127 páginas: N-07** |
| `mobile/` | Expo/RN | T-21 | **R** — estrutura, dependências, authN do cliente. **N-08** para o resto |
| `tv/` | react-native-tvos | T-21 | **R** — idem. **N-08** |
| CI | **1** workflow (`server-ci.yml`) | `vericore-cicd-auditor` / **T-22** | **E**. Inclui OBS-INV-07: **zero** pipeline para client/mobile/tv apesar de `client/` ter suíte vitest declarada |
| Infra declarada | `docker-compose*.yml`, `docs/infra/`, `server/scripts/` backup | **T-22** | **E como declarada**. Nenhum acesso a ambiente em execução (N-12) |
| Documentação em escopo | 172 `.md` + `CLAUDE.md` + 15 READMEs de módulo + 3 READMEs de app | `vericore-documentation-audit-lead` / **T-23** | **E** nos que descrevem tier 1/2 e nos READMEs; **A ≈90/172 (52%)** no restante (§5.4). Inclui a lacuna registrada: **`server/` não tem README próprio** |
| Dependências | manifestos de server/client/mobile/tv | **T-18** | **E** nos manifestos versionados; **N-11** para transitivas em `node_modules`. Inclui OBS-INV-08 (duas majors de Zod entre server e client) |
| Integrações | `webhooks`, n8n, e-mail, upload, QR, `comex` | **T-24** | **E** em inventário; **A** em resiliência (timeout/retry/circuito) |

---

## 9. Cobertura dos 7 findings preliminares (re-ancoragem — OBS-INV-01)

| Finding | Sev. | Âncora atual | Re-ancorado? | Tarefa | Trilha de re-ancoragem | Trilha de reexame (titular ≠ autor) |
|---|---|---|---|---|---|---|
| FIND-ERP-001 | CRITICAL | `c9359be` | **SIM** — pela triagem SanaCore do CASE-001 | RA-07 (**verificação independente** pela VeriCore) | T-00 | T-06, T-07 |
| FIND-ERP-002 | HIGH | `c9359be` | **NÃO** | RA-01 | T-00 | T-03 |
| FIND-ERP-005 | CRITICAL | `c9359be` | **NÃO** | RA-02 | T-00 | T-09 |
| FIND-ERP-006 | HIGH | `c9359be` | **NÃO** | RA-03 | T-00 | T-12 |
| FIND-ERP-007 | MEDIUM | `c9359be` | **NÃO** | RA-04 | T-00 | T-12, T-17 (409×422) |
| FIND-ERP-008 | HIGH | `c9359be` | **NÃO** | RA-05 | T-00 | T-12 |
| FIND-ERP-009 | HIGH | `c9359be` | **NÃO** | RA-06 | T-00 | T-09 |

**Cobertura de re-ancoragem planejada: 7/7 (E).** Nenhum finding entra em reexame
antes de ter âncora verificada no `AUDIT_COMMIT`.

**Registro obrigatório:** a re-ancoragem **não invalida** os findings a priori.
Invalida a **premissa** de que `legacy-baseline-001` (`c9359be`) representa o
código auditado — premissa hoje sabidamente incorreta no `AUDIT_SCOPE.md` §2.3
(emenda formal = item de gate **G6**).

---

## 10. Resumo quantitativo da cobertura planejada

| Faixa | Endpoints | Profundidade |
|---|---|---|
| Tier 1 | 39 | **100% exaustivo em 10/10 dimensões** |
| Tier 2 — D1 (authZ), D2 (contrato), D6 (audit log) | 381 | **100% exaustivo** |
| Tier 2 — D3 (regra de negócio) | 381 | exaustivo em 174; **amostral declarado em 207** (68 analisados, **139 em N-04**) |
| Tier 3 — profundo | 218 | análise por dimensão, com amostragem declarada |
| Tier 3 — raso | 43 | **apenas D1/D2 em nível R** (N-06) |
| **Endpoints com alguma cobertura** | **681 / 681 (100%)** | — |
| **Endpoints com cobertura profunda de regra de negócio** | **≈ 500 / 681 (73%)** | 39 + 242 (tier 2 exaustivo em D3) + 218 (tier 3 profundo) ≈ 499 |
| Páginas `client/` | 40 / 167 (24%) | **N-07 para 127** |
| Documentos em escopo | ≈ 90 + 100% dos de tier 1/2 dos 172 | **A** |
| Findings re-ancorados | 7 / 7 | **E** |

**Nenhuma célula desta matriz declara cobertura que o plano não sustenta.** Onde a
garantia é parcial, está escrito **A** ou **R**; onde não há garantia, está escrito
**N** com motivo numerado. É esse contrato — e não uma afirmação de "auditamos
tudo" — que autoriza, ao final, um veredito.

---

## 11. Estado

```
[X] 00-scope     — SCOPE_REGISTERED
[X] 01-inventory — inventário revalidado; L1/L2/OBS-INV-02 FECHADAS (AUDIT_PLAN §2)
[X] 02-plan      — AUDIT_PLAN.md + AUDIT_COVERAGE_MATRIX.md (planejada)
[ ] **GATE HUMANO** — G1…G9 do AUDIT_PLAN.md §12, a registrar em APPROVALS.md
[ ] fieldwork    — **NÃO AUTORIZADO**
```
