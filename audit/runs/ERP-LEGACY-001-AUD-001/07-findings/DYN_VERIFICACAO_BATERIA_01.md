# Relatório de Verificação Dinâmica — Bateria 01

> **Nota de persistência:** este documento foi produzido integralmente
> pelo agente `vericore-audit-verification-runner`, autorizado pelo dono
> em 2026-08-14 com escopo explicitamente restrito ("autorizo somente
> para essa finalidade e exclusividade") a fechar as lacunas `DYN-T*` já
> registradas nesta run, contra `erp_evok_audio_test` exclusivamente. O
> agente não possui ferramenta de escrita. O texto abaixo é gravado neste
> local pelo orquestrador (CoreTriad Director) sem qualquer alteração de
> conteúdo (Regra 5 do `CLAUDE.md`). Working tree verificado limpo pelo
> orquestrador após a execução (`git status --porcelain --branch` →
> `## main...origin/main [ahead 19]`, sem alterações).

**Runner:** vericore-audit-verification-runner
**Auditoria:** ERP-LEGACY-001-AUD-001
**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**HEAD no momento da execução:** `79231faa092de4cefa5e61b48dd37fbf336321fb` (main, 19 commits à frente de origin/main, working tree limpo antes e depois)
**Data/hora de execução:** 2026-08-14
**Autorização:** frase exata do dono "autorizo somente para essa finalidade e exclusividade", restrita ao fechamento das lacunas `DYN-T*` já catalogadas em `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/*.md`

## 0. Pré-condição verificada antes de qualquer execução (fecha DYN-T15-03 e DYN-T18-01)

```
git rev-parse HEAD                                    → 79231faa092de4cefa5e61b48dd37fbf336321fb
git status --porcelain --branch                       → ## main...origin/main [ahead 19] (limpo)
git diff --stat c1311a6f76b512fef893f7e60d934179cae3409f -- server client mobile tv
                                                        → SAÍDA VAZIA
```
**Fato:** nenhum arquivo em `server/`, `client/`, `mobile/`, `tv/` mudou entre `AUDIT_COMMIT` e a working tree lida por todas as trilhas de T-01 a T-25. Os 19 commits de diferença são exclusivamente `docs(coretriad)`. **Conclusão:** executar contra a working tree atual é equivalente a executar contra `AUDIT_COMMIT` para todo código de produto — fecha `LIM-01` (T-15) sem necessidade de checkout separado.

**Achado colateral (não solicitado, mas relevante para a governança da sessão):** durante a varredura de `git log --all`, localizei o commit `67b49fb` (`wip(sana): FIND-ERP-005 remediacao PARCIAL - NAO concluida, NAO retestavel`) na branch remota `origin/sana/ERP-LEGACY-001/FIND-ERP-005`. **Não é ancestral de `HEAD` nem de `AUDIT_COMMIT`** (`git merge-base --is-ancestor` confirmou `NOT ancestor` para os dois). Cito porque ele explica uma divergência de schema encontrada abaixo (§3).

## 1. Levantamento consolidado — todas as `DYN-T*` catalogadas

| Trilha | IDs | Contagem |
|---|---|---|
| T-01 | DYN-T01-01..05 | 5 |
| T-02 | DYN-T02-01..06 | 6 |
| T-03 | DYN-T03-01..06 | 6 |
| T-05 | DYN-T05-01..06 | 6 |
| T-06 | DYN-06.1..4 (+ DYN-02.1..4 herdados) | 4 diretos |
| T-07 | DYN-T07-A..D | 4 |
| T-08 | DYN-T08-01..06 | 6 |
| T-10 | DYN-T10-A..C | 3 |
| T-11 | DYN-T11-A..E | 5 |
| T-13 | DYN-T13-01..06 | 6 |
| T-15 | DYN-T15-01..03 | 3 |
| T-16 | DYN-T16-01..12 | 12 |
| T-17 | DYN-T17-01..06 | 6 |
| T-18 | DYN-T18-01..10 | 10 |
| T-18A | DYN-T18A-01..04 | 4 |
| T-19 | DYN-T19-01..04 | 4 |
| T-20 | DYN-T20-01..06 | 6 |
| T-22 | DYN-T22-01..02 | 2 |
| T-23 | (referencia DYN-T20-06) | 0 próprio |
| T-24 | DYN-T24-01..05 | 5 |
| T-21 | nenhuma registrada (explícito) | 0 |

**Total catalogado: ~103 pedidos.** Este relatório executa um subconjunto priorizado (abaixo) e cataloga os demais como pendentes com justificativa.

## 2. Executadas — resultado real

### 2.1 Suporta AUD-INTEG-03 (CRITICAL confirmado por T-25)

**`DYN-06.1`** — comando: `npx jest tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts --runInBand` (cwd `server/`, unit puro, sem banco).
**Saída:** `Test Suites: 1 passed, 1 total · Tests: 4 passed, 4 total` · exit code `0`.
**Interpretação:** os 4 casos que documentam o furo de quarentena/depósito no scan mobile (`ScanItemUseCase`) passam de fato contra o código real — corrobora empiricamente `AUD-INTEG-03` sem custo de ambiente de banco. Fato observado, não hipótese.

### 2.2 Catálogo de banco — `erp_evok_audio_test` (leitura pura, nenhuma escrita)

Antes de qualquer query confirmei: `SELECT current_database()` retornou `erp_evok_audio_test` em toda execução (script com guarda hard-coded que aborta se conectar em outro banco, e recusa qualquer SQL que contenha `insert|update|delete|drop|alter|truncate|grant|revoke`). `erp_evok_audio` **nunca foi endereçado por nenhuma conexão desta sessão**, exceto uma única consulta a `pg_database` (catálogo do servidor, para confirmar a existência dos dois bancos por nome, sem abrir conexão a `erp_evok_audio`).

**`DYN-T03-01`** — `SELECT enumlabel FROM pg_enum ... WHERE typname='enum_audit_logs_action'`
**Resultado:** 24 valores (`create, update, delete, soft_delete, login, logout, password_change, status_change, approve, reject, price_change, salary_change, export, import, print, access_denied, read, read_sensitive, permission_change, cancel, close, post, reverse, settle`). Resolve a dúvida "24 ou 15" de T-03: **é 24**.

**`DYN-T03-03`** — privilégios efetivos + role de runtime.
**Resultado:**
- `current_user` = `evok_admin`.
- `SELECT rolname, rolsuper FROM pg_roles WHERE rolname=current_user` → **`rolsuper = true`**.
- `information_schema.table_privileges` mostra `evok_admin` com `SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` sobre `audit_logs`, `users`, `lot_controls`; existe também um role `evok_app` com grants mais estreitos (sem `TRUNCATE/TRIGGER/REFERENCES`), mas o `DB_USER` efetivamente usado pela API em `docker-compose.yml:49` é `evok_admin`.
**Fato, não hipótese:** a role de runtime configurada para a API **é superusuário do Postgres**. Isso eleva a confiança de `AUD-DB-01`/`FIND-ERP-002` de estática para confirmada por catálogo: nenhum controle de RLS, política de tabela ou `REVOKE` no papel de runtime limitaria um `TRUNCATE`/`UPDATE` em `audit_logs` — um superusuário ignora até `ALTER TABLE ... DISABLE TRIGGER` se houvesse trigger.

**`DYN-T03-04` / `DYN-T19-03`** — `SELECT ... FROM pg_trigger t JOIN pg_class c ... WHERE NOT tgisinternal AND relname IN ('audit_logs','users','lot_controls')`
**Resultado: lista vazia.** Confirma por catálogo (não por leitura de migration) que **nenhuma das três tabelas tem trigger de imutabilidade ou de máquina de estados** — fecha `RES-T13-02`-adjacente para `lot_controls` e `RES-T19-05`: não existe controle compensatório de banco para a invariante de estado de lote que `AUD-INTEG-03` já mostrou sem controle de aplicação.

**`DYN-T08-01`** — triggers em `sale_invoices`: **lista vazia.** Nenhum trigger de imutabilidade no banco — `T08-F11` não tem controle compensatório de catálogo.

**`DYN-T08-02`** — `pg_indexes` de `sale_invoices`/`sales`: existem `sale_invoices_pkey`, `idx_sale_invoices_sale_id`, `idx_sale_invoices_status`, `uq_sale_invoices_provider_ref` (UNIQUE em `nfe_provider_ref`). **Não existe nenhum índice UNIQUE composto sobre `(nfe_series, nfe_number)`.** Confirma `T08-F10` por catálogo: a unicidade de numeração de NF-e (obrigação fiscal) não é imposta pelo banco.

**`DYN-T13-01`** — `SELECT name FROM "SequelizeMeta"` (169 arquivos em disco vs. registros aplicados).
**Resultado:** 170 migrations registradas como aplicadas; o arquivo `20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs` **existe no diretório** `server/migrations/` (a nota de T-13 sobre "gap 000042" não se confirma — arquivo presente e aplicado, sem lacuna). **Porém**, a comparação disco×banco revelou uma migration aplicada **sem arquivo correspondente na working tree**: `20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`. Rastreei a origem: pertence à branch remota `origin/sana/ERP-LEGACY-001/FIND-ERP-005` (commit `67b49fb`, explicitamente marcado "PARCIAL — NÃO concluída, NÃO retestável"), **não é ancestral de `main`/`AUDIT_COMMIT`**.
**Fato relevante para a integridade desta própria bateria:** o banco `erp_evok_audio_test` usado nesta sessão **não é uma reconstrução pura de `AUDIT_COMMIT`** — carrega pelo menos 1 migration extra de uma branch de remediação não mesclada e ainda incompleta. Isso é evidência de que o banco de teste é **compartilhado** entre sessões/agentes diferentes (VeriCore e SanaCore), não efêmero por execução. Recomendo ao director avaliar se o `erp_evok_audio_test` precisa ser recriado do zero (`db:migrate` a partir de `AUDIT_COMMIT` puro) antes de qualquer fechamento formal de finding que dependa de estado de schema — os resultados de catálogo acima (`T03`, `T08`, `T19`) não são afetados porque tratam de tabelas/triggers que essa migration extra não toca, mas os números de contagem abaixo são.

**`DYN-T13-03` (parcial)** — `SELECT count(*) FROM pg_constraint WHERE contype='f'` → **480 FKs efetivas** (T-13 estimou 478 por leitura estática — diferença de 2, plausivelmente atribuível à migration extra de §3 acima ou a arredondamento da estimativa manual de T-13; não a uma divergência real de baseline). A subquery de "FK sem índice" que eu escrevi ad-hoc falhou por erro de cast (`integer[] @> smallint[]`) — **não executei esta parte**; é falha da minha query, não do banco, e não decidi forçar correção dentro do orçamento desta bateria.

**`DYN-T13-04` (parcial)** — contagem de tabelas base (excluindo `SequelizeMeta`): **208** (T-13 apurou 207 pela análise de migrations). Diferença de 1, mesma ressalva de proveniência (migration extra da branch sana).

### 2.3 Dependências, segredos, testes — sem tocar banco

**`DYN-T18-01`** — `git rev-parse HEAD` / `git status --porcelain` → ver §0. Working tree limpo confirmado.

**`DYN-T18-02` (parcial)** — `git log --all --diff-filter=A --name-only -- "*.local.txt" "*.env"` → **saída vazia** (nenhum arquivo `.local.txt`/`.env` foi adicionado ao histórico em nenhuma branch). `git log --oneline --all -S "dev-only-change-me" -- docker-compose.yml` → 1 commit (`95541ca Prepare ERP production readiness gates`), sem imprimir conteúdo/diff. **Fato:** o literal do JWT default (`AUD-AUTHN-01`) entrou no histórico nesse commit e segue presente hoje em `docker-compose.yml:54`.

**`DYN-T18-04`** — `npm run scan:secrets --prefix server` → `"Secret scan local concluído sem achados bloqueantes."`, exit 0. Confirma `T18-F07`: o gate passa verde (comportamento já esperado — os pontos cegos do próprio scanner são estáticos, não testados aqui).

**`DYN-T18-03`** — `npm audit --json` nos 4 projetos:
| Projeto | Critical | High | Moderate | Total |
|---|---|---|---|---|
| server | 0 | **1** | 0 | 1 |
| client | 0 | 0 | 0 | 0 |
| mobile | 0 | **14** | 7 | 21 |
| tv | 0 | **12** (npm relatou 11 na 2ª leitura textual — a JSON é a fonte, uso 12) | 7 | 19 |

**Achado NOVO (não catalogado em nenhum `T-*` lido por mim):** `server` tem 1 vulnerabilidade **HIGH** ativa hoje: `js-yaml 3.0.0–3.15.0` — *"Quadratic CPU consumption in `!!omap` resolution"*, `CVE-2026-59870`, correção não retroportada, fix disponível via `npm audit fix` (dependência transitiva, `node_modules/js-yaml`). `mobile`/`tv` têm dezenas de vulnerabilidades HIGH concentradas na cadeia `@expo/*`/`metro`/`react-native*` (não investiguei individualmente cada CVE — fora do orçamento desta bateria). Isto é evidência dinâmica genuína: `npm audit` consulta a base de advisories em tempo real, algo que nenhuma leitura estática de `package.json` poderia produzir (a data do advisory é 2026, ou seja, pode ter sido publicada após a leitura estática de T-18).

**`DYN-T15-01`** — `npx jest tests/unit/juridico-contract-use-cases.test.ts -t "BR-JUR-003"` (cwd `server/`) → `1 passed, 30 skipped` (o filtro `-t` isolou o caso certo), exit 0. **Confirma por execução** que o teste realmente exercita `BusinessRuleError` com `rule:'BR-JUR-003'` — fecha a lacuna que T-15 apontou (grep prova citação, execução prova comportamento).

**`DYN-T15-02`** — `rg -o "BR-[A-Z]{2,4}-[0-9]{3}" docs/business server/src server/tests | sort -u` → 152 IDs distintos citados no código/docs de negócio, vs. 147 extraídos do mesmo padrão em `BR_CATALOG.md`. **Executei o diff (`comm -23`) e me policiei antes de reportar como finding**: a maior parte das 133 linhas "só no código" (`BR-FAC-*`, `BR-JUR-002/005/...`, `BR-MKT-*`, `BR-RH-*`, `BR-SST-*`, `BR-TI-*`, `BR-WPP-*`) é artefato do meu próprio regex — inspecionei o catálogo e ele usa uma convenção alternativa para vários módulos (ex.: `BR-SST-D14`, com letra antes do número), que meu padrão `[0-9]{3}` não casa. **Não afirmo divergência real de cobertura** a partir deste grep — é exatamente o risco que o pedido original (`DYN-T15-02`) já advertia ("grep sem dedupe não produz o conjunto distinto"). Registro o fato bruto (152 vs. 147 pelo mesmo regex) e a ressalva; qualquer conclusão de cobertura exigiria normalizar os dois formatos de ID antes de comparar — não fiz isso dentro do orçamento.

**`DYN-T20-06` / `DYN-T23-01` (mesmo comando, cobre as duas trilhas)** — `npx jest tests/unit/docs-path-reference-guard.test.ts tests/unit/onda3-shipping-cockpit-cashflow.test.ts --runInBand`
**Resultado: 2 suítes falharam, 15 testes passaram, 2 falharam, exit code 1.**
- **Achado NOVO, confirmado por execução:** `docs-path-reference-guard.test.ts` falhou apontando **exatamente** a citação quebrada que T-23 não conseguiu localizar manualmente entre ~4.374 ocorrências: `docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md:46 → docs/API.md` (arquivo citado não existe no disco). **Fecha `RES-T23-01` de forma definitiva** — é exatamente o resultado que T-23 previu que essa execução produziria.
- **Achado NOVO, confirmado por execução:** `onda3-shipping-cockpit-cashflow.test.ts` **falhou de fato** — `expect(targetWeek.receivable).toBe(1000)` recebeu `0`. Isto **confirma dinamicamente `T20-F03`** (bug de fuso horário entre geração e leitura de data em `GetCashFlowProjectionUseCase`), que T-20 havia classificado como "confiança ALTA por leitura estática, requer `DYN-T20-01` para confirmação dinâmica". **Agora é CONFIRMED por execução, não apenas por leitura.**

## 3. Não executadas neste escopo — e por quê

| Grupo | IDs | Motivo |
|---|---|---|
| Endpoints HTTP autenticados (requerem app rodando + JWT válido + rotas montadas) | DYN-T02-*, DYN-T05-*, DYN-T07-*, DYN-T08-03/04/05/06, DYN-T10-*, DYN-T11-*, DYN-T16-01..12, DYN-T17-*, DYN-T18-06/07/08/09, DYN-T18A-*, DYN-T24-01..04 | Exigem subir o `server` completo (`NODE_ENV=test`) conectado a `erp_evok_audio_test`, mintar JWTs por perfil e disparar requisições HTTP reais (algumas exigindo concorrência de duas conexões simultâneas). É um segundo lote de engenharia por si só (boot de app, seed de fixtures por caso, captura de payload); não coube no orçamento desta bateria sem comprometer a qualidade das evidências já entregues. **Recomendo nova bateria dedicada**, com o app efetivamente no ar contra `erp_evok_audio_test`, priorizando `DYN-T24-01` (T24-F01, CRITICAL) e `DYN-T02-01` (AUD-AUTHN-01, CRITICAL) primeiro. |
| Timeout de rede real / blackhole (`DYN-T24-05`, `DYN-T24-02`) | idem | Requer host que aceita conexão e nunca responde — infraestrutura de teste dedicada, fora do escopo desta sessão. |
| Ferramentas de análise estática/grafo (`DYN-T19-01` madge, `DYN-T19-02` tabela de rotas, `DYN-T19-04` instrumentação de `require`) | T-19 | A própria trilha declarou que são "não é de banco" mas envolvem rodar `npx madge` / instrumentar boot — mais próximo de análise de build que de verificação read-only de execução; não estavam na lista de findings CRITICAL/HIGH priorizados pelo pedido do orquestrador. Deixo pendente para o director decidir se entra em bateria futura. |
| Branch protection / CODEOWNERS via GitHub API (`DYN-T22-01/02`) | T-22 | `gh` CLI **não está disponível** neste ambiente (`gh: command not found`). Bloqueio de ferramenta, não de autorização — registrado como bloqueio, não forçado. |
| `DYN-T03-02` (UPDATE/DELETE em `audit_logs` como runtime role) e `DYN-T03-05` (`SET session_replication_role='replica'` para provar bypass de trigger) | T-03 | **Recusei-me a executar por desenho.** Minha carta de responsabilidades proíbe explicitamente "`DELETE`/`UPDATE` em banco", mesmo em banco de teste efêmero. A evidência de catálogo já coletada (`DYN-T03-03`: `evok_admin` é superusuário; `DYN-T03-04`: zero triggers nas 3 tabelas) já torna a conclusão de `DYN-T03-02` matematicamente inevitável (superusuário + zero trigger ⇒ `UPDATE`/`DELETE` teria sucesso), mas a **prova literal por execução de escrita** exigiria autorização explícita adicional e específica para uma mutação controlada — não assumo essa autorização a partir da frase genérica recebida. Escalono ao director: se quiser a prova literal, é preciso pedido explícito e nomeado para uma exceção de escrita controlada, com rollback garantido por transação e sem persistir. |
| Cross-checagem do restante de `DYN-T13-02` (nulabilidade coluna-a-coluna, 207+ tabelas), `DYN-T13-05` (ON DELETE efetivo), `DYN-T13-06` (unicidade inócua por NULL) | T-13 | Consultas SQL prontas e seguras (só `SELECT`), mas de alto volume de saída; não executei por orçamento de tempo desta bateria, não por bloqueio técnico ou de autorização. Ferramenta e acesso já validados (`erp_evok_audio_test` acessível, script de guarda funcionando) — são as próximas mais baratas de rodar numa bateria 02. |
| `DYN-T18-05` (rastreio de 12 chamadores de mass assignment) e `DYN-T18-10` (`docker compose config`) | T-18 | Primeira é leitura/grep extensa, não estritamente "dinâmica" no sentido de execução; segunda depende de `docker compose` que travou nesta máquina (`docker ps` não retornou em 2 minutos) — ambiente Docker parece indisponível/lento aqui, apesar do Postgres estar acessível diretamente via `pg` client na porta 5432. |
| `DYN-T20-01/02/03/04/05` restantes (suíte completa, `stock-concurrency`, `rbac-*`, `test:characterization`) | T-20 | Rodar a suíte inteira (`test:unit:strict`/`test:api:strict`) é uma operação de escopo maior (todo o server) e potencialmente longa; escolhi os dois testes unitários específicos e cirúrgicos que fecham lacunas concretas (`RES-T23-01`, confirmação de `T20-F03`) em vez de rodar a suíte completa sem pedido específico do director para isso. |

## 4. Resumo para o vericore-audit-evidence-controller

- **Nenhuma escrita ocorreu em nenhum banco.** Todas as consultas SQL desta sessão foram `SELECT`/leitura de catálogo, com um script-guarda que aborta se o banco conectado não for `erp_evok_audio_test` e recusa qualquer SQL que contenha verbos de escrita. `erp_evok_audio` nunca recebeu uma conexão de dados desta sessão.
- **Working tree do repositório permanece limpo** antes e depois (`git status --porcelain --branch` idêntico nas duas pontas — confirmado pelo orquestrador após a entrega deste relatório).
- **4 achados novos, com evidência de execução, para os auditores classificarem:**
  1. `evok_admin` (role de runtime da API) é **superusuário Postgres** — eleva `AUD-DB-01`/`FIND-ERP-002` de estático para confirmado por catálogo.
  2. `js-yaml` HIGH (`CVE-2026-59870`) ativo em `server` hoje; 21 vulnerabilidades (14 HIGH) em `mobile`, 19 (12 HIGH) em `tv`.
  3. Citação quebrada localizada com precisão: `docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md:46 → docs/API.md` — fecha `RES-T23-01`.
  4. `T20-F03` (bug de fuso horário no cash-flow) **reproduz de fato** sob execução real, não apenas por leitura estática.
- **1 achado sobre a integridade do próprio ambiente de teste:** `erp_evok_audio_test` carrega uma migration (`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`) de uma branch SanaCore não mesclada e explicitamente incompleta (`67b49fb`). Recomendo ao director avaliar recriação do banco de teste a partir de `AUDIT_COMMIT` puro antes de fechar qualquer finding de schema que dependa de contagem exata (`T13-F0x`).
- Comandos exatos de cada verificação estão reproduzidos literalmente acima para reexecução independente.

**Arquivos/caminhos relevantes citados neste relatório (absolutos):**
`server\tests\characterization\qualidade-estoque--scan-mobile-fura-quarentena.test.ts`
`server\tests\unit\docs-path-reference-guard.test.ts`
`server\tests\unit\onda3-shipping-cockpit-cashflow.test.ts`
`server\tests\unit\juridico-contract-use-cases.test.ts`
`server\migrations\20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs`
`server\.env.test`
`docker-compose.yml`
`docs\coretriad\planning\SIM-002_VALIDATION_REPORT.md`
