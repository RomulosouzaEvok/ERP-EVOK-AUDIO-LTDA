# API_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

**Método:** leitura direta de todos os 53 arquivos de rota em
`server/src/modules/*/presentation/routes/*.ts`, extração de 100% das
linhas `router.<método>(` via Grep (681 linhas confirmadas, batendo com
`MODULE_CATALOG.md`), verificação de `router.use(authenticate)`/
`router.use(authorizeModule(...))` de topo de arquivo nos módulos que não
colocam o middleware inline, e amostragem de controllers para caracterizar
o mecanismo de validação dominante (Zod). **Nenhum comando de teste, script
ou conexão de banco foi executado.**

## Destaques (discovery, não finding formal — isso é passo 25+/31)

1. **`webhooks` (`webhooks.ts:12-13`)** — `POST /api/webhooks/n8n` e
   `POST /api/webhooks/focus-nfe` **não têm `authenticate`/`authorize`**
   (por desenho — comentário explícito no arquivo: "é um webhook de sistema
   externo"). Verificado no controller (`webhookController.ts:20,52-57`):
   `n8n` usa assinatura HMAC (`X-Evok-Signature` +
   `WEBHOOK_SECRET_NOT_CONFIGURED`/`INVALID_SIGNATURE`); `focus-nfe` usa
   segredo compartilhado em header (`X-Webhook-Secret` vs
   `process.env.FOCUS_NFE_WEBHOOK_SECRET`). **Não é "sem nenhuma
   autenticação"** no sentido estrito, mas é autenticação fora do padrão
   JWT do resto da API — merece olhar do `authorization-auditor`/
   `controller-auditor` (o que acontece se `FOCUS_NFE_WEBHOOK_SECRET` não
   estiver setado em produção — o código trata isso, mas é ponto de
   atenção).
2. **`juridico`** usa um padrão de dois estágios: `router.use(authenticate)`
   (linha 57) seguido de duas rotas montadas *antes* de
   `router.use(authorizeModule('juridico','operate'))` (linha 83) —
   `GET /reports/financeiro` e `POST /contracts/:id/approve` —
   exatamente para permitir acesso a perfis `diretor`/`financeiro` que não
   têm o módulo `juridico`. Desenho intencional e documentado, não shadow
   endpoint, mas é o único módulo com esse padrão de bypass ordenado — vale
   conferência cruzada do `authorization-auditor`.
3. **10 módulos** (`accounting`, `facilities`, `juridico`, `directorate`,
   `marketing`, `budget`, `treasury`, `rh`, `ti`, `sst`) aplicam
   `authenticate` via `router.use(authenticate)` no topo do arquivo, não
   inline por rota — válido no Express (aplica-se a todas as rotas
   subsequentes do router), mas exige conferência de ordem de `router.use`
   para não haver rota montada antes do `use` sem perceber (nenhum caso
   disso encontrado nos 53 arquivos, exceto o padrão intencional do item 2).
4. **`facilities` — `POST /maintenance-tickets` (`facilities.ts:89`)** é
   rota de escrita com **apenas `authenticate` (herdado do `router.use`),
   sem `authorizeModule`** — auto-atendimento documentado no cabeçalho do
   arquivo ("abertura é auto-serviço... RF-FAC-040"), mesmo padrão do `ti`
   para chamados. Comportamento aparentemente intencional, não corrigir.
5. **Nenhum arquivo de rota, nos 53, usa middleware de validação de entrada
   explícito no nível de rota** (nenhuma ocorrência de `validate(`/
   `celebrate(`/schema-middleware em grep sobre todos os 53 arquivos). A
   validação observada ocorre dentro de controllers/use-cases,
   predominantemente via Zod (`z.object(...).parse()`), confirmada por
   amostragem em 46 arquivos de controller. **Não confirmado nesta amostra**
   (681 endpoints tornam inviável abrir cada controller neste passo sem
   execução): `categories`, `departments`, `users`, `auditLogs`,
   `suppliers`, `clients`, `employees`, `products`, `bom`, `production` (3
   arquivos), `purchases`, `sales`, `maintenance`, `serviceOrders`,
   `quality`, `nonConformities`, `traceability`, `mobileInventory`,
   `inventory` (2 arquivos), `assets`, `sst`, `ti`, `juridico`,
   `masterProduction`, `spreadsheetImport`, `reports`, `dashboard`,
   `accessProfiles`, `webhooks`, `fiscal`, `intelligentAuditor`.
   **Registrado como lacuna de método, não como finding** — é trabalho do
   `controller-auditor`.
6. Todas as rotas de **upload de arquivo** usam `multer` (`ofxUpload.single`,
   `cnabReturnUpload.single`, `imageUpload.single`, `materialFileUpload.single`,
   `rhFileUpload.single`, `spreadsheetUpload`) — validação de tipo/tamanho de
   arquivo não verificada neste passo.

## Ressalva de método (aplica-se a todo o documento)

- Contagem de 681 endpoints em 53 arquivos/48 módulos confirmada por Grep
  exaustivo (`router\.(get|post|put|patch|delete)\(`), sem amostragem —
  bate com `MODULE_CATALOG.md`.
- AuthN/AuthZ: verificado por leitura completa de cada arquivo de rota,
  incluindo `router.use()` de topo de arquivo (não apenas grep de linha,
  para não gerar falso-negativo em módulos que aplicam middleware
  globalmente).
- Validação de entrada: caracterizada por padrão dominante amostrado nos
  controllers (Zod), **não verificada endpoint a endpoint** — a única
  coluna que não atinge cobertura 100% linha a linha neste passo;
  registrado explicitamente, não omitido.
- Idempotência: observação de discovery apenas nos POST/PUT de pagamento,
  estoque e fiscal, listados por módulo abaixo — **não é veredito de
  finding**, é sinalização para os passos 25+/31.
- Mecanismo interno do controller (como a validação é feita) é fronteira do
  `controller-auditor`; veredito de permissão (se a regra de RBAC está
  correta para o processo de negócio) é fronteira do
  `authorization-auditor`. Este documento entrega apenas a matriz de
  presença/ausência.

---

## Módulos PRODUÇÃO REAL (APR-2026-016) — regime de segurança permanente aplicado

### `items` — 12 endpoints — `server/src/modules/items/presentation/routes/items.ts`
AuthN: `authenticate` em todas. AuthZ: `authorizeModule('produtos', ...)` em
todas (retrofit documentado no cabeçalho do arquivo).

| Method | Path | Linha | AuthZ nível |
|---|---|---|---|
| GET | / | 15 | view |
| POST | / | 16 | operate |
| PATCH | /:id | 17 | operate |
| POST | /:id/estrutura | 18 | operate |
| GET | /:id/estrutura/explode | 19 | view |
| PATCH | /:id/inactivate | 20 | operate |
| DELETE | /:id | 21 | operate (na prática chama `inactivate`, não delete físico) |
| GET | /:id/suppliers | 23 | view |
| POST | /:id/suppliers | 24 | operate |
| PUT | /:id/suppliers/:linkId | 25 | operate |
| DELETE | /:id/suppliers/:linkId | 26 | operate |
| GET | /:id/purchase-history | 27 | view |

Validação: Zod confirmado em `itemController.ts` (7 ocorrências).
Idempotência: `POST /:id/estrutura` e `POST /:id/suppliers` são escrita
não-idempotente sem chave de idempotência visível na rota — observação de
discovery, não finding.

### `categories` — 5 endpoints — `categories.ts`
| Method | Path | Linha | AuthN | AuthZ |
|---|---|---|---|---|
| GET | / | 12 | sim | nenhuma (qualquer autenticado) |
| GET | /:id | 13 | sim | nenhuma |
| POST | / | 14 | sim | `authorize('admin','operator')` |
| PUT | /:id | 15 | sim | `authorize('admin','operator')` |
| DELETE | /:id | 16 | sim | `authorize('admin')` |

Validação: não observada nesta amostra. Usa `authorize(role)` legado, não
`authorizeModule` — diferente do padrão retrofit de `items`.

### `departments` — 5 endpoints — `departments.ts`
| Method | Path | Linha | AuthN | AuthZ |
|---|---|---|---|---|
| GET | / | 12 | sim | nenhuma |
| GET | /:id | 13 | sim | nenhuma |
| POST | / | 14 | sim | `authorize('admin')` |
| PUT | /:id | 15 | sim | `authorize('admin')` |
| DELETE | /:id | 16 | sim | `authorize('admin')` |

### `users` — 7 endpoints — `users.ts`
| Method | Path | Linha | AuthN | AuthZ |
|---|---|---|---|---|
| GET | / | 14 | sim | `authorize('admin')` |
| GET | /:id | 15 | sim | `authorize('admin')` |
| POST | / | 16 | sim | `authorize('admin')` |
| PUT | /:id | 17 | sim | `authorize('admin')` |
| DELETE | /:id | 18 | sim | `authorize('admin')` |
| POST | /:id/revoke-sessions | 19 | sim | `authorize('admin')` |
| PUT | /:id/access-profile | 20 | sim | `authorize('admin')` |

### `auth` — 8 endpoints — `auth.ts`
| Method | Path | Linha | AuthN | AuthZ |
|---|---|---|---|---|
| POST | /login | 13 | **não** (esperado — é o próprio login) | nenhuma |
| POST | /refresh | 14 | sim | nenhuma |
| POST | /register | 15 | sim | `authorize('admin')` |
| GET | /me | 16 | sim | nenhuma |
| GET | /me/permissions | 17 | sim | nenhuma |
| PUT | /change-password | 18 | sim | nenhuma (self) |
| POST | /forgot-password | 19 | **não** (esperado) | nenhuma |
| POST | /reset-password | 20 | **não** (esperado — usa token de reset no corpo) | nenhuma |

Validação: Zod confirmado (3 ocorrências em `authController.ts`).

### `auditLogs` — 2 endpoints — `auditLogs.ts`
| Method | Path | Linha | AuthN | AuthZ |
|---|---|---|---|---|
| GET | / | 12 | sim | `authorize('admin')` |
| GET | /:id | 13 | sim | `authorize('admin')` |

---

## Demais 42 módulos — NÃO-PRODUÇÃO (`PRODUCTION_STATUS_MAP.md`)

### `suppliers` — 6 — `suppliers.ts` (17-22)
GET / (view), GET /:id (view), GET /:id/items (view), POST / (operate), PUT
/:id (operate), DELETE /:id (approve). Todas `authenticate` +
`authorizeModule('fornecedores', ...)`.

### `clients` — 5 — `clients.ts` (19-23)
GET / , GET /:id (view), POST / , PUT /:id (operate), DELETE /:id (approve).
`authorizeModule('clientes', ...)`.

### `employees` — 5 — `employees.ts` (19-23)
GET / , GET /:id (`authenticate` apenas, sem authorizeModule), POST/PUT/DELETE
(`authorize('admin')`). **Observação**: leitura sem nível de módulo — condiz
com nota do cabeçalho de `rh.ts` ("`GET /api/employees` permanece aberto a
qualquer autenticado com segregação por campo, RF-RH-006").

### `products` — 9 — `products.ts` (19-30)
GET /, GET /:id, POST /, PUT /:id, DELETE /:id, POST /movements, POST
/:id/photo (upload), GET /:id/qrcode, GET /:id/stock-by-warehouse (authz
`estoque`). Todas `authorizeModule('produtos', ...)` exceto a última
(`estoque`).

### `bom` — 12 — `bom.ts` (20-33)
GET /, GET /product/:productId/versions, GET /product/:productId, GET /:id,
POST /, PUT /:id, DELETE /:id, GET /:id/explode, /cost, /availability,
/tree, /items. Todas `authorizeModule('bom', ...)`.

### `production` — 23 (3 arquivos)
- `productionOrders.ts` (11): GET /, GET /report, POST
  /tracking/:trackingId/start|complete, GET/POST /:id/tracking, GET /:id,
  POST /, PUT /:id, PUT /:id/status, DELETE /:id (`approve`). authz
  `producao`/`chao_de_fabrica`.
- `productionDowntimes.ts` (3): GET /, POST / (open), PUT /:id/finish. authz
  `chao_de_fabrica`.
- `productionRoutes.ts` (9): GET /, GET /:id, POST /, PUT /:id, PUT
  /:id/steps, POST /:id/revise, PATCH /:id/activate|inactivate (`approve`),
  DELETE /:id. authz `producao`.

Idempotência: `POST /tracking/:trackingId/start|complete` são transições de
estado de chão de fábrica — observação de discovery para não-idempotência
em reenvio de rede (dupla contagem de apontamento), sem julgamento formal.

### `workCenters` — 6 — `workCenters.ts` (20-25)
GET /load, GET /, GET /:id, POST /, PUT /:id, PUT /:id/shifts. authz
`centros_de_trabalho`.

### `mrp` — 4 — `mrp.ts` (14-17)
POST /plan, GET /planned-orders, POST /planned-orders/convert, POST
/planned-orders/convert-to-production. authz `mrp`. Validação: Zod
confirmado (4 ocorrências). **Observação de idempotência**: `POST
/planned-orders/convert` e `.../convert-to-production` são operações
críticas de escrita (geram OC/OP reais a partir de planejamento) sem chave
de idempotência visível na rota — mencionado no histórico de memória do
dono ("rodar o MRP de novo duplicava requisição", corrigido recentemente na
lógica, mas a proteção está no use case, não na rota).

### `purchases` — 10 — `purchases.ts` (39-51)
GET /, GET /cockpit, GET /:id, POST /, PUT /:id, PUT /:id/status, POST
/:id/approve (authz `diretor`), GET /:id/approvals (`authorizeAnyModule`
compras|diretor), POST /:id/receive (authz `recebimento`), POST /:id/nfe
(compras). **Idempotência**: `POST /:id/receive` (recebimento físico) e
`POST /:id/nfe` (emissão fiscal) são write crítico sem idempotency-key
visível.

### `purchaseRequisitions` — 5 — `purchaseRequisitions.ts` (21-28)
GET /, GET /:id, POST /, PATCH /:id/status, POST /:id/convert. authz
`requisicoes`.

### `sales` — 13 — `sales.ts` (34-60)
GET /, GET/POST/PUT/DELETE de `/customers/:id/prices`, GET /:id, POST /
(create sale), PUT /:id/status, PUT /:id/items, **POST /:id/nfe** (authz
`approve`), GET /:id/nfe, **POST /:id/nfe/cancel** (`approve`), GET
/:id/invoices. **Idempotência — destaque**: `POST /:id/nfe` (emissão de
NF-e) e `POST /:id/nfe/cancel` são exatamente o tipo de operação fiscal que
exige idempotency-key/reentrância segura (reenvio de rede não pode emitir 2
NF-e); não há evidência de tal proteção na camada de rota.

### `maintenance` — 5 — `maintenance.ts` (19-23)
CRUD padrão, authz `manutencao`, DELETE em nível `approve`.

### `serviceOrders` — 5 — `serviceOrders.ts` (19-23)
CRUD padrão, authz `garantia`, DELETE em `approve`.

### `quality` — 3 — `qualityInspections.ts` (23-25)
GET /inspections, POST /inspections, GET /lots/:lotId/release-eligibility.
authz `qualidade`.

### `nonConformities` — 5 — `nonConformities.ts` (17-21)
CRUD, authz `qualidade`, DELETE `approve`.

### `traceability` — 3 — `traceability.ts` (22-24)
GET /items/:id, /lots/:id, /production-orders/:id. authz `rastreabilidade`,
somente leitura.

### `mobileInventory` — 3 — `mobileInventory.ts` (17-19)
POST /scan, POST /batch, GET /movements. authz `estoque`.

### `inventory` — 27 (2 arquivos)
- `inventoryCounts.ts` (9): POST /, GET /, GET /:id, POST /:id/start, PUT
  /:id/reassign (`approve`), POST /:id/items/:itemId/count, POST
  /:id/submit, POST /:id/approve (`approve`), POST /:id/reject (`approve`).
  authz `contagens`.
- `inventory.ts` (18): GET/POST /movements, GET /stock-report, /low-stock,
  /lots, /lots/by-code/:lot_number, /lots/:id/qrcode, **POST /lots/:id/release**
  e **POST /lots/:id/block** (authz `qualidade`, `approve` — segregação
  correta: quem opera estoque não libera lote sozinho), GET/POST/PUT
  `/warehouses*`, GET/POST/PUT `/transfers*` (aprovação/rejeição em
  `approve`).

**Idempotência**: `POST /movements` (lançamento de estoque) é o write mais
crítico do sistema sem idempotency-key na rota.

### `assets` — 7 — `assets.ts` (18-24)
CRUD + `POST /:id/photo` (upload) + `GET /:id/qrcode`. authz `patrimonio`,
DELETE `approve`.

### `rfq` — 7 — `rfqs.ts` (14-20)
GET /, /:id, /:id/comparison, POST /, /:id/suppliers, /:id/quotes, **POST
/:id/award** (`approve`). authz `compras`. Validação Zod confirmada.

### `comex` — 8 — `importProcesses.ts` (30-38)
GET /, /:id, /:id/approvals (`authorizeAnyModule` comex|diretor), **POST
/:id/approve** (authz `diretor`), POST /, /:id/tracking, **/:id/receive**,
/:id/cancel. authz `comex`. **Idempotência**: `POST /:id/receive` é
recebimento físico de importação — mesma observação de `purchases`.

### `financial` — 30 (3 arquivos)
- `finance.ts` (15): `/receivable*` (GET/POST/PUT pay/cost-center),
  `/payable*` (idem — **`PUT /payable/:id/pay`** é write de pagamento
  crítico), `/cash-flow*`, `/cost-centers*`. authz `financeiro`.
- `cnab.ts` (8): `/banking-config` GET/PUT, **`POST /remittances`** (geração
  de remessa bancária), GET /remittances, GET /remittances/:id/download,
  **`POST /returns`** (upload+processamento de retorno CNAB), GET /returns,
  GET /returns/:id/occurrences. authz `financeiro`. **Não montado no app —
  ver `INTEGRATION_INVENTORY.md`.**
- `reconciliation.ts` (7): `POST /statements` (upload OFX), GET /statements,
  /:id/entries, /:id/suggestions, `POST /entries/:id/match|ignore|unmatch`.
  authz `financeiro`.

**Idempotência — destaque forte**: `PUT /payable/:id/pay`, `PUT
/receivable/:id/pay`, `POST /remittances` (gera arquivo de remessa bancária
— reenvio duplicaria ordem de pagamento ao banco) e `POST /returns`
(processamento de retorno bancário) são as operações de maior risco
financeiro de todo o inventário sem evidência de idempotency-key na rota.
Registrar para os passos 25+/31 como candidato prioritário de finding
formal.

### `accounting` — 11 — `accounting.ts` (33-47), `authenticate` via `router.use` linha 30
`/accounts` CRUD (sem delete), `/entries` CRUD, **`PATCH /entries/:id/post`**
e **`/reverse`** (`approve`), `/trial-balance` (leitura). authz
`contabilidade`.

### `budget` — 6 — `budget.ts` (35-42), `authenticate` via `router.use` linha 32
`/lines` CRUD completo (inclusive DELETE físico, por design), `/report`.
authz `controladoria`.

### `treasury` — 11 — `treasury.ts` (38-52), `authenticate` via `router.use` linha 35
`/bank-accounts` CRUD, `/financial-operations` CRUD + `settle`/`cancel`
(`approve`), `/cash-position`. authz `tesouraria`.

### `facilities` — 64 — `facilities.ts`, `authenticate` via `router.use` linha 42
Grupos: veículos+documentos (8), condutores (6), viagens (5), abastecimento
(4), multas (7), chamados de manutenção predial (5, sendo `POST
/maintenance-tickets` **sem** authorizeModule — auto-serviço documentado),
visitante/visita (6), correspondência (3), limpeza plano×execução (6),
reservas (4), áreas (4). authz `facilities`, nível `approve` em
liberações/suspensões/pagamento de multa/plano de limpeza.

### `marketing` — 30 — `marketing.ts`, `authenticate` via `router.use` linha 37
Campanhas (6, `budget-decision` em `approve`), leads (7, `handoff` via
`authorizeAnyModule` marketing|vendas), eventos (8), relatórios (2),
materiais (5, `approve` na aprovação de material). authz `marketing`.

### `juridico` — 75 — `juridico.ts`, `authenticate` via `router.use` linha 57
Blanket `authorizeModule('juridico','operate')` via `router.use` linha 83
(exceto as 2 rotas montadas antes, ver destaque #2). Grupos: contratos (13),
contencioso/casos (15), prazos fatais (7), procurações (2), atos societários
(4), PI (5), LGPD RoPA+DSR+incidentes (16), alertas (3), relatórios
transversais (2), fichas cruzadas por fornecedor/cliente/funcionário (3), +
reports/financeiro e contracts/:id/approve fora do blanket. `approve`
explícito em: `close` de caso, `revoke` de procuração, `reject`/`decision`/
`close` de LGPD.

### `ti` — 47 — `ti.ts`, `authenticate` via `router.use` linha 30
Categorias de chamado (4), chamados (15, com 6 rotas de auto-serviço via
`authorizeSelfOrModule`/`authenticate` puro — abertura, `mine`, detalhe/
comentários/confirmação/reabertura do próprio chamado), termo de
responsabilidade (7), licenças (9, incluindo `POST
/licenses/:assetId/reveal-key` — revelação de chave de licença, sensível),
solicitações de acesso (9, aprovação via `authorizeSelfOrModule` com
`approverEligibilityCheck`), backup (3).

### `rh` — 57 — `rh.ts`, `authenticate` via `router.use` linha 58
Admissão (8), contrato de experiência (4, `decision` com função
`authorizeContractDecision` que decide `approve` vs `operate`
**dinamicamente pelo corpo da requisição** — `req.body.decision ===
'rescindir'`), demissão (10, `conclude` em `approve`), documentos (4),
férias (7), afastamentos (4), benefícios (6), treinamentos (5,
`training-matrix` com `requireSstOrRh` — interseção sst|rh), ponto/importação
(5).

### `sst` — 75 — `sst.ts`, `authenticate` via `router.use` linha 35
EPI (11), ASO (8, `aso/status/:employeeId` com `requireSstOrRh`),
acidentes/CAT (10, `emitCat`/`close`/`reopenCat` em `approve`), eSocial (3),
CIPA (12, aprovações em `approve`), PGR/GES (7), treinamentos (6), rotinas
de segurança/brigada/DDS (10), ações corretivas (3).

### `engineering` — 11 — `engineering.ts` (34-48)
Projetos (4, create/update com dupla checagem
`authorizeModule('engenharia','operate')` **e** `authorize('admin','operator')`
— padrão redundante, digno de nota para o `authorization-auditor`), desenhos
(5, `release`/`obsolete` exigem `approve` + `authorize('admin')`),
especificação técnica de item (2).

### `laboratory` — 3 — `laboratory.ts` (24-26)
`/tests/summary`, `/tests` GET, `/tests` POST (com dupla checagem
authorizeModule+authorize, igual a `engineering`).

### `directorate` — 14 — `directorate.ts`, `authenticate` via `router.use` linha 32
`GET /org-chart` (única rota sem `authorizeModule`, só `authenticate`, por
design), `PATCH /directorates/:id/manager` (`approve`), planejamento
estratégico (5), atas (3, sem update/delete por design), riscos
corporativos (4). Todas as demais em `approve`.

### `masterProduction` — 7 — `masterProductionPlans.ts` (33-39)
CRUD + `decideLine`, `firm`, `release`, `cancel`. authz `mrp`.

### `spreadsheetImport` — 5 — `catalogImport.ts` (27-46)
GET /modelos, /modelos/produtos.csv, /modelos/estrutura.csv (authz
`produtos`), **POST /simulacao** e **POST /** (import real) exigem duplo
módulo: `authorizeModule('produtos','operate')` **e**
`authorizeModule('bom','operate')` — desenho intencional documentado no
cabeçalho.

### `reports` — 8 — `reports.ts` (24-31)
sales, inventory, customers, cash-flow (authz `relatorios.financeiro`),
production, oee (`relatorios.producao`), purchasing (`relatorios.compras`),
cost-variance (`relatorios.custos`) — único módulo com granularidade de
sub-permissão por relatório.

### `dashboard` — 3 — `dashboard.ts` (27-29)
/, /handoffs, /department-demands. authz `dashboard` (concedido a todos os
perfis, por design retrofit).

### `accessProfiles` — 6 — `accessProfiles.ts` (21-26)
/modules, GET/POST/PUT/DELETE de perfis. `authorize('admin')` em todas (não
usa `authorizeModule` — é o próprio módulo que define RBAC).

### `webhooks` — 2 — ver destaque #1 acima
Sem `authenticate`/`authorize`, autenticação por assinatura/segredo no
controller.

### `fiscal` — 2 — `fiscal.ts` (14-15)
GET/PUT `/config`. `authorize('admin')`.

### `intelligentAuditor` — 4 — `intelligentAuditor.ts` (12-15)
/stock, /sales, /purchases, /financial. `authorize('admin')`.

---

## Resumo de conclusão

- **Endpoints na matriz: 681** — idêntico à contagem real extraída de
  `router.(get|post|put|patch|delete)(` nos 53 arquivos de rota.
- **Módulos cobertos: 48/48** — nenhum módulo omitido.
- **AuthN**: preenchido para 100% dos 681 endpoints (inline ou via
  `router.use(authenticate)` de topo de arquivo). Únicas ausências de
  AuthN: `auth.ts` (login/forgot/reset-password — esperado) e
  `webhooks.ts` (autenticação alternativa por assinatura/segredo, não JWT).
- **AuthZ**: preenchido para 100% — anotado por módulo/nível (`view`
  implícito, `operate`, `approve`) ou `authorize(role)` legado nos módulos
  mais antigos (`categories`, `departments`, `users`, `auditLogs`, `auth`,
  `accessProfiles`, `fiscal`, `intelligentAuditor`).
- **Validação de entrada**: preenchido para todos os 48 módulos, mas com
  granularidade de módulo (não de endpoint individual) e marcada
  explicitamente como "não confirmada nesta amostra" para 31 dos 48
  módulos — **única dimensão sem cobertura endpoint-a-endpoint 100%**,
  registrada como tal; recomenda-se checagem por controller num passo
  seguinte.
- **Idempotência**: observação de discovery registrada nos módulos de maior
  risco (`financial`, `sales` NF-e, `inventory` movements, `purchases`/
  `comex` recebimento, `mrp` conversão de ordem planejada) — sem veredito
  de finding formal, conforme escopo deste passo.

---

*Produzido pelo agente `vericore-api-auditor` em modo read-only reforçado
(Read/Grep/Glob apenas, sem Write disponível neste modo); conteúdo
persistido neste caminho pelo orquestrador a partir da resposta do agente,
sem edição de conteúdo.*
