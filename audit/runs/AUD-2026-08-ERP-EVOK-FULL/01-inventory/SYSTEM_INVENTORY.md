AUDIT_ID: AUD-2026-08-ERP-EVOK-FULL
REPOSITORY: c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA (GitHub: gilwagno/ERP-Evok--Audio-LTDA)
BRANCH: main
COMMIT_HASH: dc5208154a51346e835cf54a4a4195780ea683a4 — **verificado nesta sessão** por leitura direta de `.git/logs/HEAD` (última linha: `... pull origin main --ff-only: Fast-forward` de `65bd66d` para `dc52081`). Bate com o valor registrado em `SCOPE.md`.
VERSION: pré-Go-Live G6 (17/17 gaps da cadeia do produto fechados, remediação de gates em 2026-08-12)
DATE: 2026-08-12
ENVIRONMENT: desenvolvimento local (Docker Compose — `docker-compose.yml` e `docker-compose.prod.yml` existem no repositório, confirmado por `Glob`; execução real dos containers **não verificada nesta sessão** — ver limitação de ferramentas abaixo)
AUDITORS: software-audit-director (esta etapa — Inventory)

---

## ⚠️ Limitação de ferramentas nesta sessão (registrar, não esconder)

Esta sessão do agente **não tem acesso a uma ferramenta de execução de shell/bash**
(apenas `Read`, `Grep`, `Glob`, `Write`). Por isso:

- Todas as contagens de arquivos abaixo (módulos, controllers, rotas, migrations, testes,
  páginas) foram obtidas por **`Glob`/`Grep` reais nesta sessão**, com evidência de
  comando e saída — isso satisfaz a regra de "todo número vem de comando real".
- **Não foi possível** nesta sessão: rodar `npm run test:unit`, `npm run typecheck`,
  `npm run test:integration`, nem consultar o PostgreSQL ao vivo via `docker exec ... psql`.
  Onde essa evidência seria necessária, isso está marcado explicitamente como
  **NÃO VERIFICADO NESTA SESSÃO (requer ferramenta de execução)** e a fonte documental
  citada em seu lugar, com a ressalva de que documentos podem estar desatualizados
  (ver achado de calibração abaixo).
- Fica registrado para o `audit-planning-agent`: a trilha de banco de dados/DBA e a
  trilha de execução de testes (rodar de fato a suíte) precisam de um agente com
  ferramenta de shell/execução de comando, não apenas leitura de arquivos.

## 🔴 Achado de calibração do próprio processo de auditoria (importante)

O `CLAUDE.md` que foi **injetado no contexto do sistema desta sessão** (bloco
`claudeMd` fornecido automaticamente ao agente) contém, na seção "Status Atual",
o texto: *"📏 MEDIÇÃO CANÔNICA (2026-08-12, contada no PostgreSQL): **166 migrations
aplicadas · 202 tabelas · 467 foreign keys**."*

Ao ler o arquivo `CLAUDE.md` **diretamente do disco** nesta sessão (`Read`,
linha 69), o texto real é: *"MEDIÇÃO CANÔNICA (2026-08-12, contada no PostgreSQL):
**169 migrations aplicadas · 207 tabelas · 478 foreign keys**."* — ou seja, **o
conteúdo injetado no contexto da sessão diverge do conteúdo real do arquivo no
disco no momento da auditoria**. `docs/database/00-INDICE.md` (lido diretamente,
linhas 30-34) confirma 169/207/478, consistente com o arquivo real.

Isto reforça, com um exemplo concreto e novo, o mesmo alerta já registrado em
`SCOPE.md` ("Achado de escopo — retratado"): **nenhum número deve ser aceito por
vir de um contexto/memória/resumo — só por leitura direta do artefato no momento
da verificação.** Contagem de migrations por arquivo (`Glob server/migrations/*.cjs`)
nesta sessão: **169 arquivos** — bate com o valor correto (169), não com o valor
que estava no contexto injetado (166). Achado tratado como observação de processo
de auditoria, não como finding de produto — mas deve ser lido pelo `finding-validator`
e citado no relatório final como lição de calibração.

---

LANGUAGES: TypeScript (backend `server/src`, frontend `client/src`), JavaScript/CJS (migrations `server/migrations/*.cjs`, scripts)

FRAMEWORKS:
- Backend: Node.js + Express 4.18.2 + Sequelize 6.37.8 (`server/package.json`, lido diretamente)
- Frontend web: React 19.2.8 + Vite 8.2.0 + React Router 8.3.0 + TanStack Query 5.101.4 + Tailwind 4.3.3 (`client/package.json`, lido diretamente)
- Mobile: Expo/React Native (`mobile/package.json` confirmado por Glob — existe)
- TV: react-native-tvos (`tv/package.json` confirmado por Glob — existe)
- Testes: Jest 30.4.2 + Supertest 7.1.4 (server), Vitest 4.1.10 + Testing Library (client)

APPARENT_ARCHITECTURE: Clean Architecture por módulo de domínio em `server/src/modules/<modulo>/{domain,application,infrastructure,presentation}`. Confirmado por `Glob` — presença consistente de `domain/repositories`, `application/use-cases`, `infrastructure/sequelize`, `presentation/{routes,controllers,validators}` nos módulos amostrados (auth, items, financial, sst, ti, juridico, facilities, etc.). Não é MVC clássico nem microsserviços — é monolito modular.

MODULES: **48 módulos de domínio confirmados** por `Glob`/`Grep` real desta sessão (contagem feita a partir dos 53 arquivos de rota reais, agrupados por pasta-mãe; alguns módulos têm mais de um arquivo de rota: `financial` tem 3 — `finance.ts`, `cnab.ts`, `reconciliation.ts` —, `production` tem 3 — `productionOrders.ts`, `productionDowntimes.ts`, `productionRoutes.ts` —, `inventory` tem 2 — `inventory.ts`, `inventoryCounts.ts`). Lista completa (nome da pasta em `server/src/modules/`):

```
accessProfiles, accounting, assets, auditLogs, auth, bom, budget, categories,
clients, comex, dashboard, departments, directorate, employees, engineering,
facilities, financial, fiscal, intelligentAuditor, inventory, items,
juridico, laboratory, maintenance, marketing, masterProduction,
mobileInventory, mrp, nonConformities, production, products,
purchaseRequisitions, purchases, quality, reports, rfq, rh, sales,
serviceOrders, spreadsheetImport, sst, suppliers, ti, traceability,
treasury, users, warehouse(via inventory), webhooks, workCenters
```
(nota: "warehouse" não é pasta própria — capacidade de múltiplos depósitos vive dentro do módulo `inventory`/models `Warehouse`/`WarehouseTransfer`; listado aqui só para não perder a funcionalidade do rastreamento, não conta como módulo extra nos 48).

Este número (48) é **próximo mas não idêntico** ao "52 arquivos de rotas" citado em `SCOPE.md` como ordem de grandeza — a contagem exata real de arquivos de rota é **53** (`Grep`, "Found 53 files"), e a contagem de módulos-pasta distintos é **48**. A diferença é esperada (múltiplos arquivos de rota por módulo em 3 casos) e não é uma divergência a corrigir, mas fica registrada para precisão.

CONTROLLERS: **106 arquivos** em `server/src/modules/**/presentation/controllers/*.ts` (`Glob`, "Showing 100 of 106 matching files; 6 more").

ROUTES (arquivos): **53 arquivos** em `server/src/modules/**/presentation/routes/*.ts` (`Grep -l`, "Found 53 files" — lista completa obtida e conferida).

SERVICES / USE-CASES: **666 arquivos** em `server/src/modules/**/application/**/*.ts` (`Glob`, "Showing 100 of 666 matching files; 566 more"). Este número é alto porque a convenção do projeto é 1 use-case por arquivo (ex.: `CreateAssetUseCase.ts`, `ListAssetsUseCase.ts` separados).

REPOSITORIES / DOMAIN: **170 arquivos** em `server/src/modules/**/domain/**/*.ts` (`Glob`, "Showing 100 of 170 matching files; 70 more") — inclui interfaces de repositório, entidades de domínio e serviços de domínio (ex.: `TaxCalculationService.ts`, `legalDeadlineService.ts`).

INFRASTRUCTURE (implementações Sequelize/adapters/providers): **151 arquivos** em `server/src/modules/**/infrastructure/**/*.ts` (`Glob`, "Showing 100 of 151 matching files; 51 more").

ENTITIES_MODELS: **186 arquivos** em `server/src/models/*.ts` (`Glob`, "Showing 100 of 186 matching files; 86 more"). Isto é o modelo Sequelize "legado/central" (`server/src/models/`), distinto das `domain entities` dentro de cada módulo Clean Architecture — os dois convivem no projeto (parte da migração incremental para Clean Architecture descrita no `CLAUDE.md`). **Divergência a registrar:** o `CLAUDE.md` (conteúdo real no disco) afirma "175 modelos Sequelize" na árvore de pastas (§3); a contagem real por `Glob` nesta sessão é **186**. Não investigada a causa nesta etapa (pode ser modelos adicionados depois da última atualização do texto, ou arquivos que não são modelos de fato, ex. tipos/enums) — **achado candidato para a trilha de documentação/DBA**, não confirmado como erro, só como divergência a reconciliar.

MIGRATIONS: **169 arquivos** `.cjs` em `server/migrations/*.cjs` (`Glob`, "Showing 100 of 169 matching files; 69 more"). Bate exatamente com o valor declarado como canônico tanto em `CLAUDE.md` (real, no disco) quanto em `docs/database/00-INDICE.md` (linhas 30-34) — **consistência confirmada por 3 fontes independentes nesta sessão** (contagem de arquivo real + 2 documentos).

DATABASE: PostgreSQL 16. **Tabelas/FKs aplicadas no Postgres real: NÃO VERIFICADO NESTA SESSÃO** (sem ferramenta de execução de `psql`/`docker exec`). Fonte documental citada (não confirmada ao vivo): `docs/database/00-INDICE.md` linhas 30-40, medição datada 2026-08-12: 207 tabelas, 478 foreign keys, `sst_*`=35 tabelas, `jur_*`=18, `marketing_*`=6, `hr_*`=22, `facility_*`=13, `departments`=17 registros. **Recomendação:** a trilha `database-auditor`/`AdmDBA` deve reconfirmar isso com uma consulta real (`SELECT count(*) FROM information_schema.tables`, `SELECT count(*) FROM pg_constraint WHERE contype='f'`) antes de aceitar como fato de auditoria — o achado de calibração acima mostra que até o próprio `CLAUDE.md` teve uma cópia divergente circulando.

APIS: **681 ocorrências** de `router.(get|post|put|patch|delete)(` nos 53 arquivos de rota (`Grep -c`, soma total "Found 681 total occurrences across 53 files"). Isto é uma contagem aproximada de endpoints (uma ocorrência de `router.metodo(` não é sempre exatamente 1 endpoint público distinto — pode haver múltiplos handlers/middlewares na mesma linha em casos raros —, mas é a melhor aproximação disponível por grep estático). Módulos com mais endpoints: `juridico` (75), `sst` (75), `rh` (57), `facilities` (64), `ti` (47), `marketing` (30).

MIDDLEWARES: não contados nesta etapa (fora do escopo desta rodada de inventário; localização conhecida por leitura anterior do projeto: `server/src/middlewares/`). **NÃO VERIFICADO NESTA SESSÃO por Glob** — recomenda-se contagem na trilha de segurança/arquitetura.

TESTS:
- Unit: **177 arquivos** `*.test.ts` em `server/tests/unit/**` (`Glob`, "Showing 100 of 177 matching files; 77 more"). O `CLAUDE.md` (real) afirma "1848 testes / 172 suítes" — a contagem de arquivos aqui (177) é de **suítes/arquivos**, não de testes individuais (`it`/`test`); a pequena diferença (177 vs 172) não foi investigada nesta etapa e fica como item a reconciliar (pode ser arquivos novos após a última medição do CLAUDE.md, já que este é datado do mesmo dia 2026-08-12 mas pode ter sido escrito antes dos últimos commits do dia).
- Integration: **59 arquivos** `*.test.ts` em `server/tests/integration/**` (`Glob`, contagem manual da lista completa retornada, sem truncamento — 59 itens). O `CLAUDE.md` (real) afirma "211 testes / 53 suítes" — aqui também a métrica do CLAUDE.md é "testes" (asserções/`it` individuais, 211) vs "suítes" (53), e a contagem de arquivos desta sessão (59) diverge da contagem de "53 suítes" do CLAUDE.md por 6 arquivos. **Achado a investigar**: pode ser que nem todo arquivo de teste rode via `test:integration` (alguns podem estar filtrados/ignorados pelo runner, ou a contagem do CLAUDE.md está desatualizada). Rastreado para a trilha de qualidade/QA confirmar rodando a suíte de fato (`npm run test:integration`), o que esta sessão não pôde fazer.
- Execução real (typecheck, test:unit, test:integration): **NÃO VERIFICADO NESTA SESSÃO** — sem ferramenta de shell disponível ao agente nesta rodada. Scripts confirmados por leitura de `server/package.json`: `typecheck` (`tsc --noEmit`), `test:unit` (`jest --runInBand tests/unit`), `test:integration` (`node scripts/run-api-suite.cjs integration` — sobe API real contra banco de teste, não é dublê).
- Client: `client/src/pages/products/InventoryCountsPage.test.tsx` confirmado existir (aparece na listagem de páginas); contagem completa de testes de frontend não fechada nesta etapa.

CICD: **Existe** — `.github/workflows/server-ci.yml` (único arquivo em `.github/workflows/`, confirmado por `Glob`). Pipeline cobre: checkout, install, scan de segredos (`scan:secrets`), typecheck, build, `test:unit:strict` (falha se houver skip), `test:api:strict` (integration+edge sem skip), `npm audit --omit=dev`, build de imagem Docker imutável, aplica migrations, **verifica que a migration mais nova é reversível** (`down` + `up`), sobe container de smoke test e checa `/health/ready`. **Não há pipeline de CI para o `client/` nem para `mobile/`/`tv/`** — apenas `server-ci.yml` existe; typecheck/lint/teste do frontend web e dos apps mobile/TV, se rodam, rodam só localmente/manualmente (achado a registrar: cobertura de CI é só backend).

INFRASTRUCTURE: `docker-compose.yml` e `docker-compose.prod.yml` confirmados existir na raiz do repositório (`Glob`). Conteúdo interno não lido nesta etapa. Servidor de produção real: conforme `CLAUDE.md` (texto real), ainda não adquirido — **não verificável por arquivo**, é um fato de infraestrutura física fora do repositório.

DOCUMENTATION_FOUND: Extensa — `docs/` com subpastas por área (`projeto/`, `arquitetura/`, `database/`, `governance/`, `manual/`, `infra/`, e uma pasta por departamento). `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` é citado como fonte de pendências (não lido integralmente nesta etapa de inventário — candidato a leitura obrigatória na fase de planejamento/fieldwork).

DEPENDENCIES (principais, lidas diretamente de `server/package.json`/`client/package.json`):
- Backend: `express ^4.18.2`, `sequelize ^6.37.8`, `pg ^8.13.1`, `jsonwebtoken ^9.0.2`, `bcryptjs ^2.4.3`, `helmet ^8.3.0`, `express-rate-limit ^8.6.1`, `zod ^4.4.3`, `winston ^3.19.0`, `multer ^2.2.0`, `decimal.js ^10.6.0`, `qrcode ^1.5.4`. Dev: `typescript ^7.0.2` (nota: TypeScript 7 é uma versão muito recente/major — vale confirmar na trilha técnica se é intencional ou erro de digitação do caret), `jest ^30.4.2`, `tsx ^4.23.1`.
- Frontend: `react ^19.2.8`, `react-dom ^19.2.8`, `react-router ^8.3.0`, `@tanstack/react-query ^5.101.4`, `tailwindcss ^4.3.3`, `axios ^1.19.0`, `zod ^3.25.76` (nota: **client usa Zod 3.x e server usa Zod 4.x** — divergência de major version entre camadas, candidato a finding de manutenibilidade, não de segurança). Dev: `vite ^8.2.0`, `vitest ^4.1.10`, `oxlint ^1.75.0` (lint), `typescript ~6.0.2` (nota: **client fixa TypeScript ~6.0.2 enquanto server usa ^7.0.2** — duas versões de compilador TS diferentes no mesmo monorepo, candidato a achado).
- `npm audit` completo **não executado nesta sessão** (instrução explícita da tarefa também pedia não rodar audit completo agora).

INTEGRATIONS: Webhook `POST /api/webhooks/n8n` citado no `CLAUDE.md` e confirmado existir como módulo `webhooks` (rota `server/src/modules/webhooks/presentation/routes/webhooks.ts`, 2 endpoints por grep). Provedores de NF-e: `FocusNfeProvider.ts`, `ENotasProvider.ts`, `MockNfeProvider.ts` confirmados em `server/src/modules/fiscal/infrastructure/providers/` (Glob). CNAB (remessa/retorno) e OFX (conciliação bancária) confirmados por arquivos em `server/src/modules/financial/infrastructure/{cnab,ofx}/`.

AUTHENTICATION_MECHANISM: JWT (`jsonwebtoken`), módulo `auth` com `TokenService.ts` (`infrastructure/jwt/`), rotas de login/refresh/forgot/reset-password confirmadas em `server/src/modules/auth/presentation/routes/auth.ts` (8 endpoints por grep) e casos de uso (`LoginUseCase`, `ChangePasswordUseCase`, `ForgotPasswordUseCase`, `ResetPasswordUseCase`, `RegisterUserUseCase`, `GetMeUseCase`, `GetMyPermissionsUseCase`).

AUTHORIZATION_MECHANISM: RBAC via `accessProfiles` (módulo dedicado, `AccessProfilePermission` model, `validatePermissions.ts` use-case) — citado no `CLAUDE.md` como "100% das rotas". **Cobertura real de RBAC por rota não verificada nesta etapa** (recomendado à trilha `appsec-auditor`: amostrar rotas e confirmar presença de middleware de autorização, não aceitar a alegação de "100%" sem prova).

OBSERVABILITY_STACK: Winston (`winston ^3.19.0`, confirmado em `server/package.json`), `logger.test.ts` existe em `server/tests/unit/`. Health checks: módulo `dashboard`/rotas próprias citadas no `CLAUDE.md` (`/health/live`, `/health/ready`) — a segunda é exercitada de fato pelo pipeline de CI (`server-ci.yml`, smoke test).
