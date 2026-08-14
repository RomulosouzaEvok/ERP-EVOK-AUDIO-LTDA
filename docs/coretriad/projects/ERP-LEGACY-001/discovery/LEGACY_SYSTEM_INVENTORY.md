# LEGACY_SYSTEM_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

```
PROJECT_ID: ERP-LEGACY-001
BASELINE TAG: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d (.git/packed-refs, peeled)
HEAD NO MOMENTO DESTA LEITURA: 1979beb1fd0edc167f5d6460dec68d674ce4772c — à frente da baseline (esperado; trabalho de governança CoreTriad, não do ERP em si)
MÉTODO: Read/Grep/Glob apenas — nenhum comando executado, nenhuma conexão de banco aberta, nenhum teste rodado.
DATA: 2026-08-13
PRODUCTION_STATUS_MAP DE REFERÊNCIA: coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md (classificação final por APR-2026-016)
```

**Nota de verificação da baseline:** a tag `legacy-baseline-001` foi confirmada
via `.git/packed-refs` apontando para `c9359be399c45191fe90e8e9707803125a5ba91d`.
O HEAD atual de `main` está em `1979beb1fd0edc167f5d6460dec68d674ce4772c`,
à frente da baseline — esperado, já que representa trabalho de governança
CoreTriad (SIM-001/SIM-002/onboarding) posterior à baseline, não alteração do
ERP em si. O agente que produziu este inventário não tinha ferramenta de
diff de git neste modo (só Read/Grep/Glob); em vez disso, revalidou por
amostragem direta no disco os números do inventário anterior (`dc52081`) e
todos bateram exatamente — evidência indireta de que o código do ERP não
mudou estruturalmente entre as duas baselines, não uma prova exaustiva.

**Achado de processo (mesma classe já registrada pela auditoria anterior em
`dc52081`):** o conteúdo de `CLAUDE.md` injetado no contexto de sessão do
agente (bloco `claudeMd`) divergiu do conteúdo real lido diretamente do disco
em `CLAUDE.md`. Reforça a regra já estabelecida: nenhum número/conteúdo deve
ser aceito por vir de contexto injetado, só por leitura direta do arquivo no
momento da verificação.

---

## Linguagens

TypeScript (`server/src`, `client/src`, `mobile/`, `tv/`), JavaScript/CJS
(`server/migrations/*.cjs`, `server/scripts/*.cjs`).

## Frameworks/stack

Lido de `server/package.json` e `client/package.json`, sem alteração desde
`dc52081`:

- **Backend:** Node.js + Express `^4.18.2` + Sequelize `^6.37.8` +
  `pg ^8.13.1`, TypeScript `^7.0.2`, Zod `^4.4.3`, Jest `^30.4.2`.
- **Frontend web:** React `^19.2.8` + Vite `^8.2.0` + React Router `^8.3.0` +
  TanStack Query `^5.101.4` + Tailwind `^4.3.3`, TypeScript `~6.0.2` — nota:
  server usa TS 7, client usa TS 6 (divergência de major version de
  compilador entre as duas apps, já registrada em `dc52081`). Zod `^3.25.76`
  (client) vs `^4.4.3` (server) — duas majors de Zod convivendo no mesmo
  produto.
- **Mobile:** Expo/React Native — `mobile/package.json` confirmado existir.
- **TV:** react-native-tvos — `tv/package.json` confirmado existir.
- **Não há `package.json` na raiz** — não é monorepo com workspaces npm:
  `server/`, `client/`, `mobile/`, `tv/` são quatro projetos Node
  independentes dentro do mesmo repositório git.

## Arquitetura aparente do backend

Clean Architecture por módulo de domínio, em
`server/src/modules/<modulo>/{domain,application,infrastructure,presentation}`.
Confirmado consistente via `Glob` recursivo por camada — monolito modular,
não MVC clássico nem microsserviços.

## Módulos de backend

**48 módulos-pasta** em `server/src/modules/` — contagem obtida por extração
das pastas-mãe dos 53 arquivos de rota reais, cruzada com a distribuição por
camada abaixo. Idêntico ao número apurado pela auditoria anterior em
`dc52081` — **nenhuma mudança de módulo detectada** entre as duas baselines
(nem módulo novo, nem módulo removido).

Lista completa: `accessProfiles, accounting, assets, auditLogs, auth, bom,
budget, categories, clients, comex, dashboard, departments, directorate,
employees, engineering, facilities, financial, fiscal, intelligentAuditor,
inventory, items, juridico, laboratory, maintenance, marketing,
masterProduction, mobileInventory, mrp, nonConformities, production,
products, purchaseRequisitions, purchases, quality, reports, rfq, rh, sales,
serviceOrders, spreadsheetImport, sst, suppliers, ti, traceability,
treasury, users, webhooks, workCenters`.

("warehouse" não é pasta própria — vive dentro de `inventory`, mesma
observação de `dc52081`.)

**Correção de consistência:** o `PRODUCTION_STATUS_MAP.md` menciona no texto
corrido "49 módulos" / "43 NÃO-PRODUÇÃO", mas sua própria tabela lista 48
módulos (42 NÃO-PRODUÇÃO + 6 PRODUÇÃO REAL). A contagem real por
`Glob`/`Grep` desta sessão confirma **48**, consistente com o inventário de
`dc52081`. O `PRODUCTION_STATUS_MAP.md` foi corrigido para refletir isso.

## Camadas (contagem por `Glob` recursivo)

- `domain/**/*.ts`: **170 arquivos** (idêntico a `dc52081`).
- `application/**/*.ts` (use-cases): **666 arquivos** (idêntico).
- `infrastructure/**/*.ts`: **151 arquivos** (idêntico).
- `presentation/controllers/*.ts`: **106 arquivos** (idêntico).
- `presentation/routes/*.ts`: **53 arquivos**, com **681 ocorrências** de
  `router.(get|post|put|patch|delete)(` — bate exatamente com `dc52081`.
- `server/src/models/*.ts` (modelos Sequelize "legado/central", fora da
  árvore Clean Architecture): **186 arquivos** (idêntico a `dc52081`).
- `server/src/middlewares/*.ts`: **6 arquivos** (`imageUpload.ts`, `auth.ts`,
  `requestContext.ts`, `errorHandler.ts`, `authorizeSelfOrModule.ts`,
  `authorizeAnyModule.ts`) — não contado na auditoria de `dc52081`;
  registrado agora pela primeira vez.

## Migrations

**169 arquivos** `.cjs` em `server/migrations/*.cjs` — idêntico a `dc52081`.

## Frontend (`client/`)

React SPA. **167 arquivos** `.tsx` em `client/src/pages/**`, estruturadas
por área de negócio (`engineering/`, `production/`, `logistics/`, `sst/`,
`ti/`, `juridico/`, `facilities/`, `marketing/`, `accounting/`, `treasury/`,
`budget/`, `hr/`, `sales/`, `quality/`, `traceability/`, `patrimonio/`,
`home/` com widgets por módulo, etc.) mais 8 páginas de nível raiz (login,
troca/recuperação de senha, dashboard, 404, acesso negado).

## Apps mobile/TV

`mobile/` (Expo/React Native) e `tv/` (react-native-tvos) confirmados
existir como projetos próprios. Classificados NÃO-PRODUÇÃO em
`PRODUCTION_STATUS_MAP.md` (sem validação em hardware real).

## Testes (existência/contagem de arquivo, não execução — proibido rodar)

- Unit: **177 arquivos** `*.test.ts` em `server/tests/unit/**` — idêntico a
  `dc52081`.
- Integration: **59 arquivos** `*.test.ts` em `server/tests/integration/**`
  — idêntico a `dc52081`.
- Edge: **1 arquivo** — `server/tests/edge/industrial-edge-cases.test.ts`.
- Client: pelo menos `client/src/pages/products/InventoryCountsPage.test.tsx`
  e `client/src/pages/LoginPage.test.tsx` confirmados; contagem completa de
  testes de frontend não fechada nesta sessão.
- Scripts declarados em `server/package.json`: `test`, `test:unit`,
  `test:integration` (sobe API real contra banco — **não executado**),
  `test:edge`, `test:coverage`, variantes `:strict`/`:ci`, `scan:secrets`.

## CI/CD

**1 arquivo** de workflow — `.github/workflows/server-ci.yml`. Cobre apenas
o backend; **não há pipeline de CI para `client/`, `mobile/` ou `tv/`**.

## Infraestrutura declarada

`docker-compose.yml` (dev — hospeda hoje o banco com os 327 itens reais,
classificado PRODUÇÃO REAL por `APR-2026-016`) e `docker-compose.prod.yml`
(não exercitado) — ambos confirmados na raiz, nenhum outro arquivo
`docker-compose*` encontrado.

## Documentação

Ver `DOCUMENTATION_INVENTORY.md` (mesma pasta) para o inventário completo —
pelo menos 195 arquivos `.md` relevantes mapeados.

---

*Produzido pelo agente `vericore-architecture-auditor` em modo read-only
reforçado (Read/Grep/Glob apenas, sem Write disponível neste modo); conteúdo
persistido neste caminho pelo orquestrador a partir da resposta do agente,
sem edição de conteúdo além da correção de consistência 49/43→48/42 marcada
acima.*
