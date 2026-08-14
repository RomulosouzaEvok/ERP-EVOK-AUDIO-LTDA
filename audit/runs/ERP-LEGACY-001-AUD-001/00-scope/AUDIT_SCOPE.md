# AUDIT SCOPE — ERP-LEGACY-001-AUD-001

```
AUDIT_ID:        ERP-LEGACY-001-AUD-001
PROJECT_ID:      ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION, Parte VIII do master spec)
PASSO:           31 — Auditoria 360°
REPOSITORY:      ERP-Evok--Audio-LTDA
BRANCH:          main
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f   (congelado — ver §2)
BASELINE_TAG:    legacy-baseline-001 → tag object ad8e26cc0779f98b31f8d31bc865862e7f6b9452,
                 peeled commit c9359be399c45191fe90e8e9707803125a5ba91d (ver §2.3)
VERSION:         sem release formal — produto em "Pré-Go-Live G6" (docs/project-memory/product/ERP_SSOT.md);
                 a identidade da versão auditada é o próprio AUDIT_COMMIT
DATE:            2026-08-14
AUDIT_AUTHORITY: VeriCore — autorizada por APR-2026-020 Decisão A (coretriad/governance/APPROVALS.md)
PRODUZIDO POR:   vericore-audit-scope-agent
STATUS:          SCOPE_REGISTERED — FIELDWORK NÃO AUTORIZADO (ver §11)
```

---

## 1. Autoridade e limites desta run

- **Autorização:** `APR-2026-020` Decisão A (Gilwagno, 2026-08-14) autoriza o
  passo 31 executado pelo fluxo `/audit-new` — **escopo → inventário → plano** —
  **terminando no gate humano do plano de auditoria antes de qualquer
  fieldwork**.
- **O que esta run NÃO cobre nesta fase:** nenhuma trilha de fieldwork, nenhum
  finding de conteúdo, nenhuma execução dinâmica. `/audit-fieldwork` só após
  aprovação humana registrada do `AUDIT_PLAN.md`.
- A Decisão B da mesma aprovação (encaminhamento dos 7 findings à SanaCore) é
  **processo paralelo e independente** desta run — ver §2.4 (delta audit).

## 2. AUDIT_COMMIT — fixação e método de verificação

### 2.1 Valor congelado

```
AUDIT_COMMIT = c1311a6f76b512fef893f7e60d934179cae3409f
```

Commit: `docs(coretriad): APR-2026-020 - gate do passo 31 aprovado + 7
findings encaminhados a SanaCore` — Gilwagno, epoch `1786706764 -0300`
(2026-08-14). É o commit que contém a própria autorização desta auditoria.

### 2.2 Método — leitura direta de disco, nunca contexto injetado

O agente de escopo desta run não possui Bash (ver §9); a verificação foi por
leitura direta dos internos do git, com três fontes convergentes:

1. **Ref solto:** `.git/refs/heads/main` (linha 1) =
   `c1311a6f76b512fef893f7e60d934179cae3409f`.
2. **Reflog:** `.git/logs/refs/heads/main:133` (última entrada do arquivo) =
   transição `4de066c0…` → `c1311a6f…`, mensagem e timestamp citados acima.
3. **Precedência sobre packed-refs:** `.git/packed-refs:2` contém uma entrada
   **estalada** `48f8f1d7de9efc75c2a994a807a4b5fcba625ee0 refs/heads/main`.
   Pela semântica do git, o ref solto prevalece sobre o packed-ref; o reflog
   confirma que `48f8f1d` é histórico, não a ponta atual.
4. **`.git/HEAD`** = `ref: refs/heads/main` (a branch auditada é a corrente).

**Incidente registrado (Regra 10 do `CLAUDE.md`):** o contexto injetado da
sessão declarava HEAD = `8cc650a` — valor **3 commits atrás** da ponta real
(`8cc650a` → `694955f` [passo 30] → `4de066c` [APR-2026-019] → `c1311a6f`).
A leitura de disco prevaleceu. É a mesma classe de incidente já registrada em
`docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_SYSTEM_INVENTORY.md:23-28`
(contexto injetado divergente do disco). Nenhum número ou hash deste escopo
foi aceito por vir de contexto injetado ou memória auxiliar.

### 2.3 Baseline histórica de comparação

Tag `legacy-baseline-001`, verificada em `.git/packed-refs:15-16`:

```
ad8e26cc0779f98b31f8d31bc865862e7f6b9452 refs/tags/legacy-baseline-001
^c9359be399c45191fe90e8e9707803125a5ba91d
```

A tag é anotada; o commit baseline (peeled) é `c9359be…`. Serve como base
histórica de comparação: os commits entre `c9359be` e `c1311a6f` são, pelas
mensagens de commit e pelo reflog, trabalho de governança CoreTriad
(SIM-001/SIM-002, onboarding, discovery, testes de caracterização) — **a
confirmação de que o código do ERP em si não mudou entre baseline e
AUDIT_COMMIT é tarefa do inventário da run (`01-inventory/`), não deste
escopo** (o inventário do discovery fez essa checagem por amostragem, não
exaustiva — `LEGACY_SYSTEM_INVENTORY.md:12-21`).

### 2.4 Imutabilidade e delta audit (Regras 12-14)

- Esta auditoria audita **exclusivamente** o `AUDIT_COMMIT` acima. Não segue
  HEAD automaticamente.
- **Remediações SanaCore autorizadas por `APR-2026-020` Decisão B correrão em
  paralelo** em worktrees `sana/ERP-LEGACY-001/<FINDING>`. Qualquer merge
  dessas correções em `main` posterior ao `AUDIT_COMMIT` **não entra nesta
  auditoria**: exige delta audit ou nova auditoria (Regra 14) — precedente
  operacional registrado no veredito do SIM-002 (`APR-2026-014`, seção "O que
  esta declaração NÃO significa", item 1).
- O `AUDIT_COMMIT` não pode ser alterado após congelado. Ampliação de escopo
  em auditoria em andamento exige novo registro formal.

## 3. Objeto auditado

O **ERP real** deste repositório — distinto dos simulados SIM-001 ("Sala
Livre") e SIM-002 ("PagaFácil"), que foram objetos de validação do modelo
CoreTriad e estão **excluídos** (§6). Componentes, todos verificados
existentes no disco nesta data:

| # | Componente | Caminho | Evidência de existência verificada |
|---|---|---|---|
| 1 | Backend (API + domínio) | `server/` | `server/package.json`; **53 arquivos de rota** em `server/src/modules/*/presentation/routes/*.ts` contados por Glob nesta sessão (48 módulos com rotas; o discovery declara 49 diretórios de módulo — 1 sem rotas, a confirmar no inventário) |
| 2 | Banco de dados **declarado** | `server/migrations/*.cjs`, `server/database/postgresql/` (inclui `00_baseline_frozen.sql`), `server/src/models/` | contagens declaradas pelo discovery em §7; **nenhuma conexão a banco será aberta** (§5) |
| 3 | Frontend web | `client/` | `client/package.json` |
| 4 | App mobile (Expo/RN) | `mobile/` | `mobile/package.json` |
| 5 | App Android TV | `tv/` | `tv/package.json` |
| 6 | CI | `.github/workflows/server-ci.yml` | único workflow; verificado por Glob |
| 7 | Infra declarada | `docker-compose.yml`, `docker-compose.prod.yml`, `docs/infra/`, scripts de backup em `server/scripts/` | referenciados por `PRODUCTION_STATUS_MAP.md` (seção Infra) |
| 8 | Documentação do produto | `docs/` **exceto** `docs/coretriad/` (ver §6) | trilha de consistência doc×código |
| 9 | Testes existentes | `server/tests/` (unit/integration/edge/characterization), suítes de client/mobile/tv | inclui `server/tests/characterization/` (passo 30, autoria OpusCore — §8) |

O objeto é a **árvore do `AUDIT_COMMIT`**. Arquivos não versionados presentes
no working tree (ex.: `server/*.local.txt`, `server/.server-out.log`,
`server/typecheck_out.txt`) **não fazem parte do objeto** — ver §6, exclusão E6,
com a ressalva de trilha de segredos ali registrada.

## 4. Prioridade — fixada pelo dono (APR-2026-020 Decisão A)

A ordem abaixo é **decisão humana registrada**; o `AUDIT_PLAN.md` distribui
profundidade e trilhas dentro dela, mas não pode invertê-la.

### Tier 1 — PRODUÇÃO REAL primeiro

Classificação de `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`
(resolvida por decisão humana `APR-2026-016`):

| Módulo | Observação de escopo |
|---|---|
| `items` | 327 insumos reais da fábrica no banco `erp_evok_audio` |
| `categories` | referenciada pelos itens reais |
| `departments` | 17 registros = organograma real (seed oficial) |
| `users` | **parcial: a conta admin** — as 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO; o código do módulo é auditado integralmente |
| `auth` | autenticação que protege o dado real |
| `auditLogs` | inclui o achado já formalizado FIND-ERP-002 (carga real não auditada) |
| — | o banco por trás de `docker-compose.yml` (hospeda o dado real; não existe banco de produção separado) entra no tier 1 como **objeto de leitura declarada**, sob o regime do §5 |

### Tier 2 — alto risco financeiro / fiscal / estoque / autorização

Inclui obrigatoriamente os módulos dos **7 findings abertos**
(FIND-ERP-001 CRITICAL, FIND-ERP-005 CRITICAL, FIND-ERP-002/006/008/009 HIGH,
FIND-ERP-007 MEDIUM — severidades conforme `APR-2026-017/018/020`):

- **Estoque/idempotência:** `inventory` (`POST /api/inventory/movements` —
  FIND-ERP-001), `mobileInventory`, `traceability`;
- **Financeiro:** `financial` (finance/cnab/reconciliation — inclui
  `PayPayableUseCase`/`ReceivePaymentUseCase` de FIND-ERP-001), `treasury`,
  `accounting`, `budget`;
- **Fiscal:** `fiscal` (NF-e);
- **Autorização/segregação:** `accessProfiles`, middleware
  `authenticate`/`authorizeModule`, `juridico` (FIND-ERP-005), segregação
  sistêmica (FIND-ERP-009: compras × demais pontos de aprovação);
- **Compras/vendas/MRP:** `purchases`, `purchaseRequisitions`, `rfq`,
  `suppliers`, `sales`, `mrp`, `production`, `masterProduction`;
- **Compliance/pessoas:** módulos de FIND-ERP-006 (LGPD/DPO), FIND-ERP-007
  (`rh`), FIND-ERP-008 (`sst`).

### Tier 3 — o restante

Demais módulos backend (`clients`, `employees`, `products`, `bom`,
`workCenters`, `maintenance`, `serviceOrders`, `quality`, `nonConformities`,
`assets`, `comex`, `facilities`, `marketing`, `ti`, `engineering`,
`laboratory`, `directorate`, `spreadsheetImport`, `reports`, `dashboard`,
`webhooks`, `intelligentAuditor`), `client/`, `mobile/`, `tv/`, CI e infra
declarada.

A alocação módulo-a-módulo por trilha é atribuição do
`vericore-audit-planning-agent` no `AUDIT_PLAN.md`, respeitando os tiers.

## 5. Regime de segurança de dado real (APR-2026-016 — inviolável)

Condição **permanente** do programa, não condicionada a Go-Live formal:

1. Módulos PRODUÇÃO REAL (tier 1) em **read-only reforçado**: apenas leitura
   de código-fonte, schema declarado, configuração e documentação versionada.
2. **Nenhuma execução que abra conexão com o banco real** (`erp_evok_audio`)
   — nenhum teste, script de diagnóstico ou comando, em nenhuma trilha, de
   nenhum tier.
3. **Evidência dinâmica** (quando o plano a previr) **exclusivamente** via
   `vericore-audit-verification-runner` contra o banco efêmero
   `erp_evok_audio_test` — mesmo regime já exercitado no passo 30
   (`CHARACTERIZATION_TESTS.md` §"BANCO").
4. Inspecionar dado real (uma linha, uma query) exige aprovação humana
   explícita, caso a caso — nunca por extensão de aprovação anterior.

## 6. Exclusões explícitas

Declaradas como parte formal do escopo, não como surpresa posterior:

| ID | Exclusão | Justificativa |
|---|---|---|
| E1 | `audit/runs/SIM-001-AUD-001/`, `audit/runs/SIM-002-AUD-001/`, `product/SIM-002/` e demais artefatos/states dos simulados (`coretriad/states/SIM-001/`, `coretriad/states/SIM-002/`, `coretriad/locks/SIM-002-answer-key.md`) | Objetos de validação do CoreTriad, não do ERP. Evidência histórica de outra auditoria — intocável (Regra 15). SIM-002 delta audit está explicitamente em espera por `APR-2026-017` Decisão C. |
| E2 | `coretriad/` (control plane: states, locks, contracts, governance) | Ownership do CoreTriad Director; é a **governança** do processo, não o objeto. É citado como fonte normativa (APRs, PRODUCTION_STATUS_MAP), nunca como objeto de finding desta run. |
| E3 | `.claude/` (agents, hooks, skills, settings) | Governança do harness. Pode ser citado como contexto (ex.: identificação de auditores em §10); não é objeto do passo 31. Auditá-lo é mandato do `vericore-agent-permission-auditor` em run própria, se convocada. |
| E4 | `docs/coretriad/` (planning, master spec, projetos, discovery) | Produto de trabalho do CoreTriad sobre o ERP, não o ERP. O discovery entra como **insumo** (§7), não como objeto auditado. O restante de `docs/` (governança do produto, infra, SSOT, departamentos) **está em escopo** — é a documentação do próprio ERP. |
| E5 | `node_modules/`, artefatos de build (`dist/`, caches) | Código de terceiros/derivado, não fonte. Dependências são auditadas pelos manifestos versionados (`package.json`/`package-lock.json` de server/client/mobile/tv) nas trilhas de dependência. |
| E6 | Arquivos não versionados do working tree (ex.: `server/CREDENCIAIS_TESTE.local.txt`, `server/CREDENCIAIS_APROVADOR.local.txt`, `server/ACESSOS_N8N.local.txt`, `server/.server-out.log`, `server/.server-err.log`, `server/typecheck_out.txt`) | O objeto é a árvore do `AUDIT_COMMIT`; o que não está no commit não é auditável de forma reproduzível. **Ressalva registrada para a trilha de segredos:** a *existência* de arquivos de credenciais em texto claro no working tree é fato relevante e pode fundamentar finding sobre práticas de gestão de segredos **sem leitura do conteúdo** (conforme precedente do `PRODUCTION_STATUS_MAP.md`, que os classificou por nome sem abri-los). |
| E7 | `.git/` (internos do repositório) | Usado para **verificação** de identidade do commit (§2), não é objeto de auditoria. |
| E8 | Banco de dados **em execução** (`erp_evok_audio`) e qualquer dado real nele | Regime do §5. O banco entra no escopo apenas na forma **declarada** (migrations, dump congelado, models, seeds). |
| E9 | Workspace adicional da sessão (`c:\Sistema EvokAudio\tibia`) | Fora do repositório auditado; nenhuma relação com o objeto. Registrado apenas porque estava montado no ambiente da sessão de escopo. |
| E10 | Auto memory da sessão | Regra 8 do `CLAUDE.md`: contexto auxiliar, nunca fonte normativa nem objeto. Nenhum dado deste escopo foi fundamentado em memória sem verificação em disco. |

## 7. Insumos pré-existentes — REAPROVEITÁVEIS no passo de inventário

O discovery (passos 21-30, autorizado por `APR-2026-015/017`) produziu em
`docs/coretriad/projects/ERP-LEGACY-001/discovery/` (todos verificados
existentes por Glob nesta sessão):

| Insumo | Conteúdo declarado | Medido em |
|---|---|---|
| `LEGACY_SYSTEM_INVENTORY.md` | inventário de linguagens/stack/estrutura | HEAD `1979beb`, 2026-08-13 |
| `API_INVENTORY.md` | **681 endpoints** extraídos dos **53 arquivos de rota** (48 módulos) | 2026-08-13 |
| `DATABASE_INVENTORY.md` | **169 migrations / 207 tabelas / 478 FKs** declaradas (método: dump congelado + migrations pós-congelamento) | 2026-08-13 |
| `MODULE_CATALOG.md`, `SYSTEM_MAP.md`, `CURRENT_ARCHITECTURE.md`, `DOMAIN_MAP.md`, `INTEGRATION_INVENTORY.md`, `DEPENDENCY_INVENTORY.md`, `DOCUMENTATION_INVENTORY.md`, `REQUIREMENTS_BASELINE.md` | catálogos e mapas do sistema | 2026-08-13/14 |
| `BUSINESS_RULE_CANDIDATES_*.md` (6 clusters) + `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` | **164 regras** com BR-ID canônico (`APR-2026-019`); status do passo 26 preservado — **nenhuma regra validada** | 2026-08-13/14 |
| `USE_CASES_RECOVERED_*.md` (6 clusters) | casos de uso recuperados | 2026-08-14 |
| `LEGACY_TRACEABILITY_MATRIX*.md` (consolidada + 6 clusters) | ~167 linhas; **0 cadeias completas** (elo BR-ID quebrado, causa-raiz tratada por APR-2026-019) | 2026-08-14 |
| `CHARACTERIZATION_TESTS.md` + `server/tests/characterization/` | 9 suítes / 66 testes / 66 verdes contra banco efêmero | HEAD `8cc650a`, 2026-08-14 |
| `FIND-ERP-001/002/005/006/007/008/009.md` | 7 findings formais preliminares (validados adversarialmente) | 2026-08-13/14 |

**Condição de reaproveitamento (obrigatória):** todas as contagens acima têm
data de 13-14/08 e foram medidas em HEADs **anteriores** ao `AUDIT_COMMIT`
(`1979beb` e `8cc650a`). O estágio `01-inventory/` desta run deve
**revalidar cada número materialmente usado contra o `AUDIT_COMMIT`
`c1311a6f`** antes de fundamentar o plano — no mínimo: contagem de módulos
(49 vs 48 com rotas), arquivos de rota (53 — já reconfirmado por este agente
nesta sessão), endpoints (681), migrations/tabelas/FKs (169/207/478) e a
verificação de que os 4 commits entre `1979beb` e `c1311a6f` não tocaram
`server/`, `client/`, `mobile/`, `tv/` além de `server/tests/characterization/`
e `server/scripts/run-api-suite.cjs` (declarados pelo passo 30). Divergência
encontrada = registrar, não silenciar (Regra 21).

## 8. Conflito de interesse — verificação e veredito

Verificado nesta sessão contra artefatos versionados (Regra 1 do sistema
VeriCore: quem construiu não audita):

1. **Código do ERP:** anterior ao CoreTriad. O roster atual foi materializado
   em 2026-08-13 (`APR-2026-001/002`), do zero, com o roster antigo deprecado
   de forma rastreável (`.claude/agents/_deprecated/`). **Nenhum agente
   VeriCore do roster atual escreveu o código auditado.** SEM CONFLITO.
2. **Testes de caracterização (passo 30):** autoria **OpusCore** — declarado
   em `CHARACTERIZATION_TESTS.md` (cabeçalho: "Código de teste produzido por
   agentes OpusCore… Nenhum agente VeriCore escreveu código"). A VeriCore
   pode auditá-los como objeto (linha 9 do §3). SEM CONFLITO.
3. **Findings preliminares** — autoria verificada nos próprios arquivos:
   | Finding | Autor (agente VeriCore) |
   |---|---|
   | FIND-ERP-001 | `vericore-idempotency-auditor` (validado por `vericore-finding-validator`) |
   | FIND-ERP-002 | `vericore-audit-log-security-auditor` |
   | FIND-ERP-005, FIND-ERP-009 | `vericore-authorization-auditor` |
   | FIND-ERP-006, FIND-ERP-007, FIND-ERP-008 | `vericore-business-rule-auditor` |
   **Restrição registrada para o `AUDIT_PLAN.md`:** o agente que produziu um
   finding preliminar **não audita sozinho, no fieldwork, a trilha que
   reexamina o próprio finding** — a trilha correspondente deve ter segunda
   opinião independente ou titular distinto, e a validação permanece com o
   `vericore-finding-validator` (que não é autor de nenhum dos 7). Auditar
   *módulos vizinhos* não é vedado; reexaminar *o próprio achado* como única
   voz, sim.
4. **Este agente de escopo** não escreveu nada do objeto; sua escrita está
   restrita por hook a `audit/`.

**VEREDITO: SEM CONFLITO DE INTERESSE IMPEDITIVO** para abrir a run, com a
restrição de alocação do item 3 vinculando o planejamento.

## 9. Ambiente e limitações de toolset (declaradas como parte do escopo)

| Item | Valor |
|---|---|
| Plataforma da auditoria | win32 — Windows 11 Pro 10.0.26200 |
| Toolset do agente de escopo | Read/Grep/Glob/Write (Write restrito a `audit/` por hook). **Sem Bash** — por isso a verificação de commit foi por leitura direta de `.git/` (§2.2) e não por `git rev-parse`. Método reproduzível por qualquer terceiro com acesso de leitura ao repositório. |
| Execução dinâmica | Proibida nesta fase. No fieldwork, exclusivamente via `vericore-audit-verification-runner` contra `erp_evok_audio_test` (§5), se e como o plano aprovado previr. |
| Fontes normativas | `CLAUDE.md`, `docs/coretriad/CORETRIAD_MASTER_SPEC.md`, `coretriad/governance/APPROVALS.md`, `audit/framework/AUDIT_PROCESS.md` |

## 10. Auditores

- **Organização:** VeriCore — roster versionado em `.claude/agents/vericore/`
  (69 agentes conforme `APR-2026-001`; presença no disco confirmada por Glob).
- **Governança desta run:** `vericore-software-audit-director` (direção),
  `vericore-audit-scope-agent` (este documento),
  `vericore-audit-planning-agent` (plano), `vericore-audit-evidence-controller`
  (persistência de evidência), `vericore-finding-validator` (validação de
  CRITICAL/HIGH — Regra 22), `vericore-audit-verification-runner` (única via
  de evidência dinâmica).
- **Trilhas de fieldwork:** alocação nominal é atribuição do `AUDIT_PLAN.md`,
  vinculada aos tiers do §4 e à restrição de conflito do §8 item 3.

## 11. Estado e sequência

```
[X] 00-scope  — SCOPE_REGISTERED (este documento)
[ ] 01-inventory — revalidação dos insumos do §7 contra o AUDIT_COMMIT
[ ] 02-plan   — AUDIT_PLAN.md → **GATE HUMANO (APR a registrar)**
[ ] fieldwork — NÃO AUTORIZADO; /audit-fieldwork só após aprovação registrada
```

O fieldwork **não está autorizado** por este escopo nem pela `APR-2026-020` —
que explicitamente termina no gate humano do plano. Qualquer início de
fieldwork sem nova aprovação registrada em `coretriad/governance/APPROVALS.md`
é violação de gate (Regra 18).

## 12. Critério de reprodutibilidade e limite de autoridade

Um terceiro com acesso de leitura ao repositório reproduz esta auditoria com:
o `AUDIT_COMMIT` do §2 (verificável pelos mesmos caminhos de `.git/`), o
objeto do §3, as exclusões do §6, os insumos do §7 com a condição de
revalidação, e o regime do §5. Nada neste escopo depende de memória, contexto
de sessão ou estado não versionado.

Este documento **não** emite findings de conteúdo (objeto do escopo é o
escopo), **não** declara `REMEDIATION COMPLETE` (autoridade da SanaCore, e
mesmo ela não fecha finding — Regras 3-4), e **não** altera o objeto auditado
(Regra 2). Nenhuma evidência de auditoria anterior foi alterada (Regra 15).
