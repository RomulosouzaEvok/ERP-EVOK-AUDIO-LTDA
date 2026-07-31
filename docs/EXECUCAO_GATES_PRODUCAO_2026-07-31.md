# Execucao dos Gates de Producao - ERP EVOK AUDIO

**Data:** 2026-07-31  
**Branch de remediacao:** `remediation/production-readiness`  
**Commit baseline:** `993f88a4cd051ce12339364e2bbc61b5bfd3c45b`  
**Auditoria de origem:** `docs/AUDITORIA_PRODUCAO_2026-07-30.md`  
**Cronograma de origem:** `docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md`

## Diretriz operacional registrada em 2026-07-31

- O baseline oficial do projeto passa a ser `Docker + PostgreSQL`.
- Novos scripts, validacoes, ambientes de teste, rotinas operacionais e deploys devem assumir esse stack como padrao.
- Qualquer excecao a esse baseline exige aprovacao tecnica formal registrada no cronograma ou no ticket do gate correspondente.

## G0 - Baseline

### Resultado do gate

**Status do gate:** `[x] Baseline registrado`  
**Decisao atual:** `BLOQUEADO`  
**Motivo:** baseline registrado, mas ainda ha worktree sujo, suites obrigatorias puladas e vulnerabilidade moderada aberta em dependencia transitive de producao.

### Evidencia do repositorio

- Branch ativa anterior ao G0: `main`
- Branch criada para remediacao: `remediation/production-readiness`
- Commit auditado/base: `993f88a4cd051ce12339364e2bbc61b5bfd3c45b`
- Worktree observado antes de editar:
  - `M README.md`
  - `?? .claude/`
  - `?? docs/AUDITORIA_PRODUCAO_2026-07-30.md`
  - `?? docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md`
- Observacao: as alteracoes preexistentes foram preservadas e nao foram revertidas.

### Ambiente observado

- Node.js: `v24.14.1`
- npm: `11.11.0`
- Branch de trabalho no inicio da execucao: `main`
- Branch de trabalho apos abertura da remediacao: `remediation/production-readiness`

### Comandos executados no baseline

Executados a partir de `server/`, salvo quando indicado:

```text
git status --short
git rev-parse HEAD
git branch --show-current
node -v
npm -v
npm run typecheck
npm run build
npm test
npm run test:unit -- --ci
npm run test:integration -- --ci
npm run test:edge -- --ci
npm audit --omit=dev
```

### Resultados do baseline

| Item | Resultado | Evidencia |
|---|---|---|
| `npm run typecheck` | PASS | sem erros de tipo |
| `npm run build` | PASS | build concluido com `tsc -p tsconfig.build.json` |
| `npm test` | PASS com skips | `12 passed`, `5 skipped`, `17 total` |
| `npm run test:unit -- --ci` | PASS | `11 passed`, `0 skipped` |
| `npm run test:integration -- --ci` | FAIL de criterio de aceite | `5 skipped`, `0 executadas` |
| `npm run test:edge -- --ci` | PASS com skips | `1 passed`, `2 skipped` |
| `npm audit --omit=dev` | FAIL | `2 moderate severity vulnerabilities` via `sequelize -> uuid` |

### Registro de suites puladas

- `npm test` nao e criterio de aceite para producao no estado atual.
- Em `2026-07-31`, a suite `tests/integration` foi inteiramente pulada por pre-requisitos ausentes.
- Em `2026-07-31`, a suite `tests/edge` ainda manteve 2 testes pulados.
- Consequencia: o baseline confirma o achado `AUD-0011` da auditoria de `2026-07-30`.

### Registro inicial do cronograma

| ID | Status | Responsavel | Arquivos | Testes | Evidencia | Risco residual | Dependencias desbloqueadas |
|---|---|---|---|---|---|---|---|
| `G0-01` Registrar branch de remediacao | `[x]` | Codex | `.git` | n/a | branch `remediation/production-readiness` criada em `2026-07-31` | nenhuma | G1 |
| `G0-02` Registrar commit base, versoes e status Git | `[x]` | Codex | este documento | n/a | baseline acima | worktree preexistente mantido | G1 |
| `G0-03` Registrar estado atual dos testes | `[x]` | Codex | este documento | `typecheck`, `build`, `test`, `test:unit`, `test:integration`, `test:edge` | tabela de resultados | integracao ainda nao executa | G1, G5, G6 |
| `G0-04` Registrar estado atual de seguranca de dependencias | `[x]` | Codex | este documento | `npm audit --omit=dev` | 2 vulnerabilidades moderadas abertas | `AUD-0012` permanece aberto | G1, G5 |
| `G0-05` Confirmar quadro inicial dos gates | `[x]` | Codex | este documento | n/a | secoes G0-G6 abaixo | donos humanos nao confirmados no repo | G1+ |
| `G0-06` Confirmar responsaveis nominais e canal formal | `[!]` | Sponsor / Tech Lead | n/a | n/a | nao ha aprovacao formal versionada no repo | gate nao pode ser aprovado formalmente so com evidencia tecnica local | nenhum |

## Gates G1 a G6

| Gate | Status | Observacao atual |
|---|---|---|
| G1 Runtime seguro | `[x]` | gate aprovado em 2026-07-31 com build, unit tests e runtime enxuto validados |
| G2 Dados protegidos | `[~]` | baseline agora validada em banco existente e banco vazio; restore e operacao de backup ainda pendentes |
| G3 Acesso controlado | `[ ]` | depende de matriz RBAC e testes 401/403 |
| G4 Integridade | `[ ]` | depende de locks, idempotencia e testes concorrentes reais |
| G5 Operacao | `[~]` | smoke local-runtime validado; build Dockerfile/CI principal ainda bloqueado por HTTPS Node/npm no Docker Desktop |
| G6 UAT e release | `[~]` | pacote de UAT/reauditoria preparado; conclusao depende do G5 e de aprovacoes humanas |

## Bloqueios abertos ao final do baseline

- `AUD-0010`: smoke local-runtime passou, mas build Dockerfile/CI principal ainda bloqueado por HTTPS Node/npm no Docker Desktop.
- G6 depende de canario, rollback real e aprovacao humana.

## Proximo passo

Entrar no `G1 - Runtime seguro`, atacando primeiro `P0-01` a `P0-10`.

## G1 - Runtime seguro

### Progresso atual

| ID | Status | Responsavel | Arquivos | Testes | Evidencia | Risco residual | Dependencias desbloqueadas |
|---|---|---|---|---|---|---|---|
| `P0-01` Consolidar `server/app.ts` como factory unica | `[x]` | Codex | `server/app.ts`, `server/index.ts` | `npm run typecheck`, `npm run build` | `index.ts` agora importa `app` e nao redefine rotas/middlewares | nenhuma conhecida nesta etapa | `P0-02`, `P0-03` |
| `P0-02` Reduzir `server/index.ts` a bootstrap | `[x]` | Codex | `server/index.ts` | `npm run typecheck`, `npm run build` | bootstrap isolado em `connectDB()` + `listen()` | ainda sem shutdown gracioso | `P0-05`, `P0-07` |
| `P0-03` Remover rotas e middlewares duplicados | `[x]` | Codex | `server/app.ts`, `server/index.ts` | `npm run typecheck`, `npm run build` | codigo duplicado removido do entrypoint | nenhuma conhecida nesta etapa | `P0-05` |
| `P0-04` Mover `zod` para `dependencies` | `[x]` | Codex | `server/package.json`, `server/package-lock.json` | `npm run build` | validators de runtime passam a refletir dependencia de producao | `npm ci --omit=dev` ainda nao executado | `P0-06`, `G5` |
| `P0-05` Alterar `start` para `node dist/index.js` | `[x]` | Codex | `server/package.json` | `npm run build` | `main` e `start` apontam para `dist/index.js` | falta prova com install enxuta | `P0-06` |
| `P0-07` Validar ambiente no boot | `[x]` | Codex | `server/src/config/runtimeEnv.ts`, `server/app.ts`, `server/index.ts` | `npm run test:unit -- --ci` | testes `runtime-env.test.ts` e boot falhando em producao com config invalida | matriz completa de secrets ainda depende de G3/G5 | `P0-08`, `P0-09`, `SEC-13` |
| `P0-08` Bloquear `DB_FORCE_SYNC` e `DB_AUTO_ALTER` em producao | `[x]` | Codex | `server/src/config/runtimeEnv.ts`, `server/config/db.ts` | `npm run test:unit -- --ci` | teste `runtime-env.test.ts` cobre `DB_FORCE_SYNC=true`; bootstrap agora rejeita DDL automatico em qualquer ambiente | nenhuma conhecida nesta etapa | `G2` |
| `P0-09` Exigir TLS PostgreSQL em producao | `[x]` | Codex | `server/src/config/runtimeEnv.ts`, `server/src/config/database.ts`, `.env.example`, `server/.env.example` | `npm run test:unit -- --ci` | `rejectUnauthorized: true` e suporte a CA por path/base64 | teste real contra banco TLS ainda pendente | `G2`, `G5` |
| `P0-10` Remover defaults inseguros | `[x]` | Codex | `server/src/config/runtimeEnv.ts`, `.env.example`, `server/.env.example` | `npm run test:unit -- --ci` | producao agora falha com placeholder em `JWT_SECRET`, `DB_PASSWORD`, `ADMIN_SEED_PASSWORD` e `CORS_ORIGIN` local | defaults de desenvolvimento seguem permitidos fora de producao | `G3`, `G5` |
| `P0-06` Provar `npm ci --omit=dev` no runtime final | `[x]` | Codex | `server/tmp/production-runtime-check` | `npm ci --omit=dev`, `npm start` | instalacao enxuta concluida com sucesso; `npm start` falhou por configuracao invalida e nao por dependencia ausente | imagem final de container ainda inexistente | `G1`, `G5` |

### Evidencia adicional do G1

- `npm run typecheck`: PASS apos consolidacao do bootstrap.
- `npm run build`: PASS gerando `server/dist/app.js` e `server/dist/index.js`.
- `npm run test:unit -- --ci`: PASS com `13 suites`, incluindo `runtime-env.test.ts` e `database-config.test.ts`.
- Prova de fail-fast do artefato compilado:
  - comando: `NODE_ENV=production` com `DB_SSL=false` e `node dist/index.js`
  - resultado: falha imediata com `Configuracao de ambiente invalida: DB_SSL: DB_SSL=true e obrigatorio em producao.`

### Bloqueios remanescentes do G1

- Nao existe ainda Dockerfile/imagem final para validar o runtime em ambiente de producao reproduzivel.

## G2 - Dados protegidos

### Progresso atual

| ID | Status | Responsavel | Arquivos | Testes | Evidencia | Risco residual | Dependencias desbloqueadas |
|---|---|---|---|---|---|---|---|
| `DB-01` Inventariar schema real | `[x]` | Codex | `docs/INVENTARIO_SCHEMA_G2_2026-07-31.md` | busca esttica em SQL e docs | inventario criado a partir de `01_schema.sql`, `02*.sql` e `04*.sql` | ainda ha drift entre SQL, docs e models | `DB-02`, `DB-03` |
| `DB-02` Definir ferramenta e formato de migrations versionadas | `[x]` | Codex | `server/.sequelizerc`, `server/config/sequelize-cli.config.cjs`, `server/package.json` | `npx sequelize-cli --help`, carga da config via `node` | `sequelize-cli` instalado e scripts operacionais adicionados | validacao contra banco real ainda pendente | `DB-03`, `DB-05`, `DB-06` |
| `DB-03` Criar migration baseline para banco novo | `[x]` | Codex | `server/migrations/20260731-000001-baseline-schema.cjs` | carga da migration via `node`; `npm run build` | baseline criada com SQL historico + tabelas dinamicas a partir dos models compilados | aplicacao real em banco ainda nao comprovada | `DB-06`, `DB-07` |
| `DB-05` Adicionar tabela/controle de versao das migrations | `[x]` | Codex | `server/config/sequelize-cli.config.cjs` | carga da config via `node` | `migrationStorageTableName=SequelizeMeta` | criacao fisica da tabela depende de `migration:up` contra banco real | `DB-06` |
| `DB-06` Validar todas as migrations em banco vazio | `[x]` | Codex | `server/migrations/20260731-000001-baseline-schema.cjs` | `npm run migration:up`, `npm run migration:status` com `DB_NAME=erp_evok_audio_g2_empty` | baseline executada com sucesso em banco PostgreSQL vazio, `SequelizeMeta` preenchida e `52` tabelas publicas criadas | ainda falta restore e rollback homologados | `DB-10`, `DB-11`, `DB-13` |
| `DB-07` Validar todas as migrations em copia representativa do banco atual | `[x]` | Codex | `server/migrations/20260731-000001-baseline-schema.cjs`, `server/.env` | `npm run migration:up`, `npm run migration:status` no banco `erp_evok_audio` | baseline passou a detectar schema existente, pular SQL de bootstrap e registrar `SequelizeMeta` sem recriar tabelas | alguns indices foram conscientemente ignorados por drift de schema legado | `DB-10`, `DB-11`, `DB-13` |
| `DB-08` Proibir DDL automatico durante o boot da aplicacao | `[x]` | Codex | `server/config/db.ts`, `docs/DATABASE.md`, `docs/DATABASE_SETUP.md`, `README.md` | `npm run typecheck`, `npm run build`, `npm run test:unit -- --ci` | bootstrap agora falha se flags legadas forem usadas; docs alinhadas a migrations | runtime ainda depende de banco aplicado previamente | `G3`, `G5` |

### Evidencia adicional do G2

- `sequelize-cli` instalado em `server/package.json` como dev dependency.
- Scripts adicionados:
  - `npm run migration:generate`
  - `npm run migration:up`
  - `npm run migration:down`
  - `npm run migration:status`
- Arquivos de infraestrutura criados:
  - `server/.sequelizerc`
  - `server/config/sequelize-cli.config.cjs`
  - `server/migrations/20260731-000001-baseline-schema.cjs`
  - `server/seeders/.gitkeep`
- Validacoes locais executadas:
  - `npm run typecheck`: PASS
  - `npm run build`: PASS
  - `npm run test:unit -- --ci`: PASS
  - `npx sequelize-cli --help`: PASS
  - carga da config `sequelize-cli`: PASS (`development,test,production`, `SequelizeMeta`)
  - carga da migration baseline via `node`: PASS (`up` e `down` exportados)
  - `npm run migration:up` no banco existente `erp_evok_audio`: PASS apos baseline ficar tolerante a schema preexistente
  - `npm run migration:status` no banco existente `erp_evok_audio`: PASS (`up 20260731-000001-baseline-schema.cjs`)
  - `npm run migration:up` no banco vazio `erp_evok_audio_g2_empty`: PASS
  - `npm run migration:status` no banco vazio `erp_evok_audio_g2_empty`: PASS (`up 20260731-000001-baseline-schema.cjs`)
  - leitura direta de `public."SequelizeMeta"` via `pg`: PASS nos dois bancos

### Bloqueios remanescentes do G2

- `DB-10` a `DB-13` (backup, restore, RPO/RTO e rollback de migration) continuam pendentes.
- Alguns indices da baseline foram ignorados no banco existente por drift entre schema legado e models atuais; esse alinhamento estrutural segue para fases incrementais posteriores.
- `AUD-0011` foi revalidado com suites estritas sem skips.
- `AUD-0012` foi revalidado com `npm audit --omit=dev` retornando 0 vulnerabilidades.

## Readiness final

- Documento consolidado: `docs/GO_LIVE_READINESS_2026-07-31.md`.
- Decisao atual: nao liberar producao ate concluir smoke Docker da API, rollback real, canario e aprovacoes formais.

## G6 - UAT e release

### Progresso atual

| ID | Status | Responsavel | Arquivos | Evidencia | Risco residual |
|---|---|---|---|---|---|
| `REL-01` Restaurar backup em homologacao | `[ ]` | DBA | `docs/UAT_RELEASE_G6_2026-07-31.md` | roteiro preparado | backup homologado ainda nao fornecido |
| `REL-02` Executar UAT por area | `[~]` | QA/Sponsor | `docs/UAT_RELEASE_G6_2026-07-31.md` | matriz de cenarios criada | exige API canario operacional |
| `REL-03` Validar dados iniciais e roles | `[~]` | QA/Backend | `docs/UAT_RELEASE_G6_2026-07-31.md` | checklist criado | exige ambiente aplicado |
| `REL-04` Deploy canario | `[ ]` | DevOps | `docs/UAT_RELEASE_G6_2026-07-31.md` | passos definidos | bloqueado pelo smoke Docker da API |
| `REL-05` Monitoramento do canario | `[~]` | DevOps | `docs/UAT_RELEASE_G6_2026-07-31.md` | criterios definidos | exige canario ativo |
| `REL-06` Teste real de rollback | `[ ]` | DevOps/DBA | `docs/UAT_RELEASE_G6_2026-07-31.md` | criterios definidos | exige imagem aprovada |
| `REL-07` Backup pre-janela | `[ ]` | DBA | `docs/UAT_RELEASE_G6_2026-07-31.md` | evidencia requerida definida | exige janela definida |
| `REL-08` Aprovacao formal | `[ ]` | Todos | `docs/UAT_RELEASE_G6_2026-07-31.md` | tabela de assinaturas criada | exige REL-01 a REL-07 |
| `REL-09` Reauditoria P0/P1 | `[~]` | Tech Lead/QA | `docs/REAUDITORIA_P0_P1_2026-07-31.md` | achados mapeados | `AUD-0010` segue parcial por Docker |
| `REL-10` Liberacao de producao | `[ ]` | Sponsor | `docs/UAT_RELEASE_G6_2026-07-31.md` | criterio de bloqueio registrado | proibida ate todos os gates assinados |

### Bloqueios remanescentes do G6

- O Gate G6 nao pode ser concluido enquanto o G5 nao comprovar imagem final, readiness e rollback.
- O smoke Docker da API esta bloqueado por `ECONNRESET` em HTTPS Node/npm dentro do Docker Desktop.
- Aprovacoes humanas de Tech Lead, DBA, DevOps, QA e Sponsor ainda precisam ser registradas.
