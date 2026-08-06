# 📔 Diário de Bordo — Go-Live G6 ERP Evok Áudio

**Início:** 2 de agosto de 2026, 18:30  
**Objetivo:** Resolver 4 bloqueadores críticos em 30h (P0) antes de Go-Live  
**SSOT:** Este arquivo registra CADA tarefa, bloqueador encontrado, decisão tomada

---

## 📅 Changelog

### 2026-08-02 18:30 — KICKOFF

**Tarefas Completadas:**
- ✅ Auditoria pré-produção consolidada (40 achados, 4 críticos)
- ✅ CLAUDE.md criado (SSOT do projeto)
- ✅ CONFORMIDADE_CHECK criado (15% conforme, 7 bloqueadores)
- ✅ PLANO_IMPLEMENTACAO criado (4 PRs, deps, ordem de merge)
- ✅ GO_LIVE_CHECKLIST criado (3 fases, decision points)
- ✅ Commit 1da0b59: 4 documentos (1948 linhas)

**Status:** 4 documentos SSOT prontos; próximo: começar P0.1 (Requisição de Compra)

---

## 🚨 Bloqueadores P0 — Status Executivo

| ID | Bloqueador | Escopo | Estimativa | Status | PR |
|:---|:-----------|:-------|:-----------|:-------|:---|
| **P0.1** | Requisição de Compra | Novo modelo + use-cases | 8h | 🔴 Não iniciado | `feat/purchase-requisition` |
| **P0.2** | MRP contra estoque real | CalculateMrpUseCase | 6h | 🔴 Não iniciado | `feat/mrp-live-inventory` |
| **P0.3** | Foreign Keys (26 FKs críticas) | 05_add_critical_foreign_keys.sql | 4h | 🟡 Em progresso | `fix/add-missing-foreign-keys` |
| **P0.4** | IDOR (tenant isolation) | Auth middleware + validator | 3h | 🔴 Não iniciado | `fix/tenant-isolation-idor` |
| **P0.5** | react-router v7 (CVE) | package update + testes | 2h | 🔴 Não iniciado | `fix/react-router-v7` |
| **P0.6** | Apontamento reconciliação | Validação quantity_produced | 6h | 🔴 Não iniciado | `fix/production-reconciliation` |

**Meta:** Todos ✅ para 2026-08-09, 23:59 (antes de Go-Live)

---

## 📋 Decisões Arquiteturais Registradas

### ✅ Decisão 1: Ordem de Merge (2026-08-02)
```
Paralelo (ambos prioritários):
  → P0.3: FKs (estrutural, 4h)
  → P0.4: IDOR (segurança, 3h)

Sequencial (após P0.3+P0.4):
  → P0.1: Requisição de Compra (8h, depende FKs)
  → P0.2: MRP live (6h, depende Req. + FKs)

Paralelo (independent):
  → P0.5: react-router (2h)
  → P0.6: Apontamento (6h, depende FKs)
```
**Justificativa:** IDOR é segurança (vai primeiro). FKs é estrutura (bloqueia todos). Req+MRP têm lógica pesada (paralelizáveis).

---

## 📝 Progresso Detalhado

### 2026-08-02 18:45 — P0.3 (FKs) Iniciado

**Tarefas Concluídas:**
- ✅ Criado `05_add_critical_foreign_keys.sql` (26 FKs críticas + 18 índices)
  - Tabelas legadas: inventory_movements, purchase_order_items, sale_items, production_orders, lot_controls, serial_numbers, production_routes, bill_of_material_items
  - Tabelas financeiras: payables, receivables, quality_checks
  - Relacionamentos: items, fornecedores, customers, production_lots
- ✅ Criado `05_add_critical_foreign_keys.test.ts` (11 testes de integridade)
  - Valida existência de constraints
  - Valida enforcement (INSERT reject, CASCADE, RESTRICT)
  - Valida índices de performance
  - Valida dados órfãos (0 orphaned rows)

**Próximo Passo:** Commitar PR `fix/add-missing-foreign-keys` + testar

---

## 🐛 Problemas Encontrados & Resoluções

### Problema 1: Agentes com timeout e ECONNRESET (2026-08-02 18:00-18:45)
- **Sintoma:** Plan agent falhou com ECONNRESET
- **Causa:** Agente rodou por 5+ minutos, API perdeu conexão
- **Solução:** Relançar com escopo compacto (máx 300 linhas output esperado)
- **Ação:** Futura = evitar agentes para tarefas que dão > 500 linhas output

### Problema 2: Aviso CRLF no Git
- **Sintoma:** "LF will be replaced by CRLF" em cada commit
- **Causa:** Arquivos com LF, Git Windows usa CRLF
- **Solução:** `git config core.safecrlf false`
- **Resolvido:** ✅ 2026-08-02 18:27

### Problema 1.1: Agentes API instáveis (continuação)
- **Causa:** API Anthropic perdendo conexão durante agente longo (5+ min)
- **Solução Adotada:** PARAR de usar agentes. Fazer trabalho direto sem delegação.
- **Status:** Agora só fazendo implementação direto (SQL, TypeScript, tests)

---

## 📊 Conformidade em Tempo Real

**Última atualização:** 2026-08-02 18:30

```
Pilar 1: Regras de Negócio & Rastreabilidade
  Conforme: 0/8 (0%)
  Bloqueadores: P0.1 (Req. Compra), P0.2 (MRP)
  Próxima: Começar P0.1

Pilar 2: Integridade Transacional
  Conforme: 1/12 (8%)
  Bloqueadores: P0.3 (FKs), P0.6 (Apontamento reconciliação)
  Próxima: Começar P0.3

Pilar 3: Segurança & DevSecOps
  Conforme: 4/15 (27%)
  Bloqueadores: P0.4 (IDOR), P0.5 (react-router)
  Próxima: Começar P0.4

Pilar 4: Dependências & Arquitetura
  Conforme: 1/5 (20%)
  Bloqueador: Documentação SQL strategy
  Próxima: Após P0.1-P0.6

TOTAL: 15% (6/40) → META: 100% antes Go-Live
```

---

## 🎯 Status Final — Fim da Sessão (2026-08-02 20:30)

**Conclusões da Sessão:**
- ✅ Diário de bordo criado (SSOT de progresso)
- ✅ P0.3 (FKs) iniciado: SQL + testes criados
- ✅ Infraestrutura Docker auditada e melhorada
- ✅ Commit 6a463fa: Docker + DEPLOY_UBUNTU.md
- ✅ Problema API resolvido: parar de usar agentes (trocam timeouts)

**Bloqueadores Acionados:**
1. P0.3 (FKs) — SQL criado, testes prontos, pronto para merge
2. P0.4 (IDOR) — próximo na fila
3. P0.1 (Req. Compra) — aguarda P0.3 passar
4. P0.2 (MRP) — aguarda P0.1 + P0.3

**Próxima Ação Imediata (Próxima Sessão):**
1. Testar P0.3: `docker compose up && npm test -- P0.3`
2. Commitar P0.3 e merge
3. Começar P0.4 (IDOR validation)
4. Atualizar conformidade check
## 2026-08-02 19:20 — Atualização Codex

### P0.2 (MRP live inventory) iniciado

- Ajustei `SequelizeItemRepository.listMrpInventoryPositions()` para priorizar estoque vivo de `Product` quando houver correspondência por `codigo`.
- Mantive fallback para o snapshot do `Item` quando não existir produto legado correspondente.
- Criei regressão unitária em `tests/unit/item-repository-live-inventory.test.ts`.
- Validei o fluxo com `npx jest --runInBand tests/unit/item-repository-live-inventory.test.ts tests/unit/mrp-persistence.test.ts`.

### Diretriz operacional

- Agentes seguem permitidos, mas apenas para triagem, validação e blocos curtos.
- Execuções longas e implementação principal continuam no agente principal para evitar timeouts.

---

## 2026-08-02 20:05 — Atualização Codex

### P0.1 (Requisição de Compra) iniciado

- Criei o primeiro slice funcional do módulo de requisição de compra em `server/src/modules/purchaseRequisitions/`.
- Adicionei as tabelas novas `purchase_requisitions` e `purchase_requisition_items` via migration.
- Registrei o módulo em `server/app.ts` sob `/api/purchase-requisitions`.
- Adicionei testes unitários para criação de requisição e integração básica com a API.

### Estado atual

- P0.3 segue encaminhado.
- P0.2 ganhou suporte de estoque vivo em `SequelizeItemRepository`.
- A próxima rodada deve concentrar integração entre MRP e requisição de compra.

---

## 2026-08-04 — Triagem de Segurança (fechamento de 3 pendências menores)

**Escopo:** triagem de segurança pontual no repositório (sem outro agente
rodando em paralelo). Nenhum bloqueador P0 novo encontrado. 3 achados
menores, todos endereçados nesta sessão:

1. **Robustez — `:id` não validado em `PUT /api/inventory/warehouses/:id`**
   (baixa severidade, não é SQL injection — Sequelize parametriza, mas um
   id não numérico propagava erro imprevisível do driver em vez do
   400/404 esperado). Corrigido: `idParamSchema` (`z.coerce.number().int().positive()`)
   adicionado em
   `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
   e aplicado em `updateWarehouse`
   (`server/src/modules/inventory/presentation/controllers/inventoryController.ts`).
   Coberto por teste unitário novo em `server/tests/unit/warehouse-crud.test.ts`.

2. **Gap de teste — RBAC dos endpoints de Depósito não coberto** (`POST
   /api/inventory/warehouses`, `PUT /api/inventory/warehouses/:id`, ambos
   `authorizeModule('estoque', 'approve')`). Adicionada cobertura de
   integração (401 sem token, 403 para operator sem nível `approve`, 200/201
   para admin) em
   `server/tests/integration/legacy-routes-rbac-regression.test.ts`. Esses
   testes exigem `RUN_INTEGRATION=true` + `TEST_API_URL` + `TEST_AUTH_TOKEN`
   + PostgreSQL acessível; no ambiente desta sessão nenhum desses
   pré-requisitos estava disponível, então rodaram via `describe.skip`
   (não é uma falha — é o comportamento padrão já existente do arquivo
   quando os pré-requisitos de integração não estão configurados).

3. **Risco residual registrado — `react-router@7.18.2` (client) na faixa
   vulnerável do advisory `GHSA-qwww-vcr4-c8h2`** (CSRF em modo RSC,
   `npm audit` reporta "high", faixa `>=7.12.0 <8.3.0`). O vetor (RSC/Server
   Actions) provavelmente **não se aplica** a esta SPA Vite sem RSC, mas
   isso é uma avaliação técnica desta triagem, não uma aceitação formal de
   risco — fica registrado como item aberto no gate G6 (ver
   `docs/governance/TODO.md`, seção "Pendências de Segurança / Gate G6").
   Também identificado que o `node_modules` local do `client/` estava
   dessincronizado do lockfile (`react-router-dom@6.30.4` instalado vs
   `^7.18.2` declarado) — reforça a necessidade de `npm ci` (nunca `npm
   install`) no pipeline de build de produção. **Nenhum upgrade de major
   version foi feito** — decisão explicitamente adiada para o gate G6.

**Validação:** `npm run typecheck` (a partir de `server/`) passou sem
erros. `npx jest warehouse-crud` — 11/11 passou. `npx jest
tests/integration/legacy-routes-rbac-regression.test.ts` — 9/9 `skipped`
(pré-requisitos de integração/PostgreSQL indisponíveis neste ambiente;
não reportado como sucesso pleno, apenas como "não executado por falta de
infraestrutura").

---

### 2026-08-04 (rodada de reconciliação em paralelo) — MRP fechado, Bloco 2 (amostras) entregue, invariantes de depósito testadas, logo oficial no login

**Contexto:** 4 entregas concluídas hoje por agentes distintos em paralelo,
consolidadas nesta sessão de governança (leitura de código/testes reais
antes de marcar qualquer item — nada foi aceito apenas pela lista recebida).

**1. MRP fecha o ciclo (item 3 do roadmap de `docs/LEVANTAMENTO_ERP_2026-08-02.md`)**
— `POST /api/mrp/planned-orders/convert` implementado:
`ConvertPlannedOrdersToRequisitionUseCase` (converte ordens `RASCUNHO`/
`APROVADA` em 1 requisição de compra, sugere fornecedor preferencial,
marca ordens `EM_EXECUCAO`), rota com `authorizeModule('mrp','operate')`,
4 testes unitários (`mrp-convert-to-requisition.test.ts`), documentado em
`docs/API.md` §13. Item 3 da tabela de `LEVANTAMENTO_ERP_2026-08-02.md`
marcado ✅ resolvido (parcial — trigger 100% automático plano→requisição
sem intervenção do planejador continua fora do escopo).

**2. Bloco 2 — Requisição de Amostra da Engenharia (UC-39), frontend + QA**
— `client/src/pages/engineering/SampleRequestTab.tsx` (nova aba
"Solicitar Amostra" em `EngineeringPage.tsx`), badge "Amostra —
Engenharia" em `ReceivingPage.tsx` (lê `requisition.origin ===
'engenharia_amostra'`), alerta não bloqueante de quantidade > 50 unidades,
e 5 testes em `server/tests/unit/engineering-sample-requisition.test.ts`
(422 sem justificativa/justificativa em branco, persistência do vínculo
com `engineering_project_id`, 404 projeto inválido, e cadeia unit-level
amostra→pedido→recebimento roteando para `LABORATORIO`). A justificativa
reaproveita o campo `notes` já existente — decisão confirmada em 2.1 de
`docs/governance/TODO.md`, nenhuma coluna dedicada `justificativa` foi
criada.

**3. Bloco 4 — 4 testes de invariante de depósito, com 1 gap real descoberto**
— novo arquivo `server/tests/unit/warehouse-invariants.test.ts`: 2 dos 4
itens ganharam cobertura nova (expedição só lê `ACABADOS`; quarentena/
bloqueio de lote não move depósito), o 3º (teste destrutivo debita
`LABORATORIO`) já estava coberto em `warehouse-stock.test.ts`/
`laboratory-tests.test.ts` (não duplicado). **O 4º item — contagem cíclica
escopada a um único depósito — é um GAP REAL DE FUNCIONALIDADE, não de
teste**: `InventoryCount`/`InventoryCountItem` não têm coluna
`warehouse_id`, e `ApproveInventoryCountUseCase` ajusta o saldo GLOBAL do
produto (`Product.quantity`), não o saldo de um depósito específico.
Marcado `[AUDITORIA-FALHOU]`/gap de desenvolvimento em
`docs/governance/TODO.md` (não fechado como teste faltando) — vira tarefa
nova de dev (migration + use case + tela) a despachar em seguida.

**4. Logo oficial da marca aplicado no login** — `client/src/pages/LoginPage.tsx`
importa `@/assets/brand/evok-logo.png` (raio verde + wordmark "VOK AUDIO"),
renderizado sobre fundo branco (o wordmark é preto e sumiria sobre fundo
escuro).

**Checklist G6** (`docs/GO_LIVE_G6_CHECKLIST.md`, já reconciliado por outro
agente): confirmado que não há menção a Bloco 2/Bloco 4/endpoint de
conversão MRP nesse arquivo — nenhuma contradição com o que foi registrado
aqui.

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 2 seções
2.3/2.4, Bloco 4 seção 4.4), `docs/LEVANTAMENTO_ERP_2026-08-02.md` (item 3
da tabela), `docs/HANDOFF_CODEX.md` (resumo consolidado + gap da contagem
cíclica como próxima tarefa), este diário.

---

### 2026-08-04 (Onda 2, segunda rodada em paralelo) — bug real de expedição/NF-e corrigido, RBAC de NF-e fechado (backend+frontend), dashboard/edição de usuário filtrados por perfil, mais 4 telas com alertas didáticos

**Contexto:** 5 entregas concluídas hoje por agentes distintos em
paralelo (Onda 2, rodando ao mesmo tempo de um 6º agente que segue
ajustando `ApproveInventoryCountUseCase` em `server/src/modules/inventory/**`
— não coberto por esta consolidação). Cada evidência foi verificada por
leitura direta do código/testes antes de qualquer item ser marcado `[x]`
em `docs/governance/TODO.md`; nada foi aceito apenas pela lista recebida.

**1. Bloco 4 — schema de contagem cíclica por depósito, PARCIAL (schema
pronto, use case em andamento em paralelo)** — migration
`server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
aplicada (`inventory_counts.warehouse_id`, nullable por legado, backfill
para `INSUMOS` das 4 linhas pré-existentes), `InventoryCount.warehouse_id`
+ associação `belongsTo(Warehouse)` no model, documentado em
`docs/DATABASE.md`. **Não fechado no TODO** — `ApproveInventoryCountUseCase`
(passo que efetivamente escopa o ajuste de saldo por depósito) segue em
ajuste por outro agente rodando em paralelo a esta consolidação; o item
permanece `[ ]` com nota "schema pronto, use case em andamento".

**2. Bloco 1.2 — bug real corrigido em `PUT /api/sales/:id/status`** —
`ChangeSaleStatusUseCase.execute` agora exige `sale.nfe_status ===
'authorized'` para permitir a transição `invoiced -> shipped` (422
`BusinessRuleError` com `details.nfe_status` quando falha). Bug real
confirmado por leitura de código: antes desta correção, uma venda cuja
NF-e foi cancelada **depois** de emitida (`nfe_status` muda para
`cancelled`, `sale.status` não reverte de `invoiced`) podia ser embarcada
indevidamente, porque a máquina de estados genérica (`VALID_TRANSITIONS`)
só olha `sale.status`, não `nfe_status`. Testado em
`server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts` (5 casos,
incluindo o cenário de NF-e cancelada pós-emissão).

**3. Bloco 5 completo — RBAC de NF-e, backend + testes + frontend** —
backend já estava correto (`authorizeModule('vendas','approve')` em
`POST /api/sales/:id/nfe` e `/nfe/cancel`, confirmado em
`server/src/modules/sales/presentation/routes/sales.ts`); 3 testes novos
fecham a lacuna de QA em `server/tests/unit/sales-nfe-rbac.test.ts`
(operador nível `operate` → 403 `APPROVAL_LEVEL_REQUIRED`; gestor nível
`approve` emite NF-e com sucesso; gestor cancela NF-e de venda `shipped`
sem reverter `sale.status`). Frontend: `client/src/pages/sales/SalesPage.tsx`
calcula `canApproveNfe = hasRole('admin') || permissions?.vendas ===
'approve'` e esconde os botões "Emitir NF-e"/"Cancelar NF-e" para quem
não tem esse nível, com mensagem explicativa no lugar.

**4. Bloco 1 — dashboard filtrado por módulo + preview de perfil na
edição de usuário** — `client/src/pages/DashboardPage.tsx`: cards e
queries (`canSeeProdutos`/`canSeeCompras`/`canSeeProducao`/
`canSeeFinanceiro`) agora usam `hasModuleAccess`, com o mesmo fallback de
segurança de `AppLayout.itemVisible` (`permissionsFetchFailed ||
hasRole('admin')` nunca esconde cards por bug de rede).
`client/src/pages/users/UsersPage.tsx`: dialog "Atribuir perfil" ganhou
pré-visualização somente-leitura (`selectedProfilePreview`) dos
módulos/níveis (`LEVEL_LABEL`) que o perfil selecionado concede.
Confirmado por leitura de código que **não existe e não deveria existir**
um campo `access_level` avulso no usuário — decisão de arquitetura já
registrada no Bloco 1.2 (nível é 100% resolvido pela matriz do perfil),
não é um gap.

**5. Bloco 6 — retrofit de alertas didáticos em mais 4 telas, com 2
conformidades parciais** — `ProductionOrdersPage.tsx`, `RegisterTestTab.tsx`,
`MrpPage.tsx`, `InspectionTab.tsx` migradas para
`translateApiError`/`DidacticAlert` (confirmado por leitura de código nas
4). Checklist de conformidade (§6.3) rodado nas 9 telas priorizadas (5 já
conformes de antes + as 4 novas) — **2 conformidades parciais**:
`RegisterTestTab.tsx` (alerta não-bloqueante, decisão consciente de não
travar o submit) e `InspectionTab.tsx` (backend
`ReleaseLotUseCase`/`BlockLotUseCase` retorna só `message` em texto livre,
sem `details` estruturado, confirmado por leitura direta do use case —
`translateApiError` cai no fallback genérico). Gerou item novo `[ ]` em
§6.1: "auditar e estruturar `details` no erro de
`ReleaseLotUseCase`/`BlockLotUseCase`".

**Coordenação:** 2 outros agentes seguiam em paralelo em
`server/src/modules/inventory/**` e `server/src/modules/products/**`
(código) durante esta consolidação — esta sessão só editou `.md`, sem
risco de conflito.

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 1.2 linha do
bug de `shipped`, Bloco 1.3 dashboard, Bloco 1.4 edição de usuário, Bloco
4.1 nota de schema pronto/use case em andamento, Bloco 5 completo §5.2/
§5.3, Bloco 6 §6.2/§6.3/§6.1 item novo), `docs/HANDOFF_CODEX.md` (resumo
consolidado desta Onda 2), este diário.

---

### 2026-08-04 (Onda 3+4) — Bloco 4 fechado (contagem cíclica por depósito, full-stack), suíte de integração saudável pela primeira vez contra Postgres real, e um BUG CRÍTICO P0 real de produção encontrado e corrigido

**Contexto:** rodada final do dia, fechando os 3 gaps que ainda restavam em
aberto das duas rodadas anteriores (Onda 2). Toda evidência abaixo foi
verificada por leitura direta de código/migrations/testes e por execução
ao vivo dos comandos citados nesta mesma sessão de governança, antes de
qualquer item ser marcado `[x]` em `docs/governance/TODO.md`.

**1. Bloco 4 fechado — contagem cíclica escopada a um único depósito
(full-stack completo).** O gap registrado na entrada anterior ("schema
pronto, use case em andamento") foi concluído ponta a ponta:
- Schema: migration `20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
  (já aplicada anteriormente, mantida sem alteração).
- Use case de criação: `CreateInventoryCountUseCase.ts` agora **exige**
  `warehouse_id` no payload.
- Use case de aprovação: `ApproveInventoryCountUseCase.ts` ajusta a
  variância apenas no depósito especificamente contado, via
  `WarehouseStockService.addToWarehouse`/`removeFromWarehouse`, mantendo
  `Product.quantity` como soma dos saldos por depósito (nunca mais
  ajustado diretamente por uma contagem).
- Validador: `createInventoryCountSchema`
  (`server/src/modules/inventory/presentation/validators/inventoryValidators.ts`)
  rejeita `warehouse_id` ausente.
- Teste: `server/tests/unit/warehouse-invariants.test.ts`, describe
  `'Invariante 3 — contagem ciclica ... escopada a um unico deposito'`.
- Frontend: `client/src/pages/products/InventoryCountsPage.tsx` — seletor
  de depósito obrigatório no formulário de criação, coluna "Depósito" na
  listagem/detalhe, tratamento didático de erro 422, e banner com
  identidade visual EVOK (gradiente `bg-brand`) no topo da tela.
- As 2 últimas pendências do Bloco 4 também foram fechadas: `GET
  /api/products/:id/stock-by-warehouse` (novo endpoint dedicado, decisão
  documentada de retornar todos os depósitos ativos mesmo com saldo
  zero, diferente do endpoint por query param que só lista linhas
  existentes) e o script de validação pós-backfill
  `server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
  — **rodado ao vivo contra Postgres real nesta sessão**: `4/4` blocos
  PASS (cobertura de backfill, integridade referencial, invariante de
  soma `products.quantity = SOMA(product_warehouse_stock.quantity)` em
  106 produtos no momento da execução, sem saldos negativos).
  **Bloco 4 (UC-42) está agora fechado por completo** — todos os itens
  de schema (4.1), backend (4.2), frontend (4.3) e QA (4.4) marcados
  `[x]` em `docs/governance/TODO.md`, exceto o inventário mobile por QR
  Code (fora do escopo desta entrega, registrado como pendência futura).

**2. Suíte de testes de integração saudável pela primeira vez contra
Postgres real.** Uma rodada completa contra o container `evok-postgres`
encontrou 5 suítes falhando. Causa raiz identificada em cada caso
(nenhuma era regressão de produto):
- 3 suítes falhavam por falta de saldo no depósito `ACABADOS` no
  fixture global de setup da suíte — corrigido em
  `server/scripts/run-api-suite.cjs` (garante saldo mínimo de 100.000 un
  em `ACABADOS` antes da suíte rodar, para não colidir com testes de
  expedição/venda que debitam justamente esse depósito desde o Bloco 4).
- 2 suítes falhavam por fragilidade pré-existente de fixture
  (`category_id: 1` hardcoded — frágil em qualquer banco de
  desenvolvimento reutilizado onde a sequência de `categories.id` já
  avançou além de 1) — corrigido com fixture dedicada nova
  `server/tests/integration/helpers/categoryFixtures.ts`
  (`ensureFixtureCategoryId`, resolve a primeira categoria ativa
  existente via API em vez de assumir um id fixo).

**3. BUG CRÍTICO P0 REAL DE PRODUÇÃO encontrado e corrigido — não é um
achado de teste, é um achado de segurança operacional do mesmo escopo de
risco dos bloqueadores originais do go-live.** No processo de investigar
as falhas de integração acima, foi descoberto que `POST
/api/inventory/movements` — o endpoint de lançamento manual de
entrada/saída de estoque, usado no dia a dia operacional do almoxarifado
— **derrubava o processo Node.js inteiro** em qualquer chamada bem
sucedida (não apenas retornava erro para o usuário: o servidor caía para
**todos** os usuários conectados simultaneamente). Causa raiz:
`server/src/modules/inventory/presentation/controllers/inventoryController.ts`
(`exports.create`) desestruturava `{ movement }` do retorno de
`CreateInventoryMovementUseCase.execute(...)`, mas esse use case só
retorna `{ movementId }` — o `movement` desestruturado ficava
`undefined`, o código seguinte acessava propriedades dele e lançava um
`TypeError` **depois** de a transação de banco já ter sido commitada; o
tratamento de erro então tentava fazer `rollback()` de uma transação já
commitada, o que não é um erro recuperável e derrubava o processo Node
inteiro. **Esta correção foi feita diretamente nesta sessão de
governança (não por um subagente)** — o controller agora busca o
movimento completo via `GetInventoryMovementByIdUseCase` usando o
`movementId` retornado pelo use case, antes de responder `201`.
**Validação ao vivo, feita pessoalmente:** subi o servidor real de
produção compilado (`node dist/index.js`), autentiquei como admin via
`POST /api/auth/login`, chamei `POST /api/inventory/movements` com um
lançamento manual real — recebi `201` com o servidor **sobrevivendo**
(antes desta correção, o mesmo passo derrubava o processo). Em seguida
rodei a suíte completa novamente para garantir zero regressão: **417/417
testes unitários e 23/23 suítes / 54/54 testes de integração, todos
verdes.**

**Resultado final confirmado nesta sessão de governança (comandos
rodados diretamente, não repassados por outro agente):**
```
cd server && npx jest tests/unit
  → Test Suites: 60 passed, 60 total | Tests: 417 passed, 417 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 23 passed, 23 total | Tests: 54 passed, 54 total

cd server && npx tsx src/scripts/backfill/04l_product_warehouse_stock_validation.ts
  → BLOCO 1/2/3/4: ✅ PASS (4/4) — invariante de soma validada em 106 produtos
```

**Documentos atualizados:** `docs/governance/TODO.md` (Bloco 4 seções
4.1/4.4 fechadas `[x]`, nova seção em "Pendências de Segurança / Gate
G6" com o bug P0 e com a saúde da suíte de integração),
`docs/HANDOFF_CODEX.md` (seção nova consolidando as 3 frentes), este
diário.

---

## 2026-08-04 (apêndice) — Fechamento do risco residual react-router

**Contexto:** a entrada de "2026-08-04 — Triagem de Segurança" (achado 3,
acima) havia registrado `react-router@7.18.2` na faixa vulnerável do
advisory `GHSA-qwww-vcr4-c8h2`, com decisão explicitamente adiada para o
gate G6 (aceitar o risco ou fazer upgrade major). O dono do produto
decidiu **não aceitar o risco** e mandou resolver agora.

**Ação executada:** upgrade real de `react-router-dom@7.18.2` para
`react-router@8.3.0` em `client/package.json`. A partir da v8 do
React Router, o pacote `react-router-dom` foi descontinuado — tudo foi
unificado em `react-router`, incluindo os bindings de DOM
(`BrowserRouter`, `Link`, `useNavigate`, etc). Todos os arquivos que
importavam de `react-router-dom` (24 arquivos, incluindo
`client/src/App.tsx`) foram migrados para importar de `react-router`.

**Verificação feita diretamente nesta sessão de governança:**
```
cd client && npm audit --omit=dev
  → found 0 vulnerabilities

grep -n "react-router" client/package.json
  → "react-router": "^8.3.0"

grep -rln "react-router-dom" client/src
  → (nenhum resultado — migração completa confirmada)

client/src/App.tsx
  → import { Route, Routes } from 'react-router';
```

**Resultado:** o risco residual `GHSA-qwww-vcr4-c8h2` está **resolvido**,
não apenas mitigado/aceito. `npm audit --omit=dev` em `client/` confirma
zero vulnerabilidades.

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(item marcado `[x]` na seção "Pendências de Segurança / Gate G6"),
`docs/GO_LIVE_G6_CHECKLIST.md` (resumo executivo pendência (c), seção
P0.5, tabela de decisão do Decision Point 1, checklist rápido e seção de
assinatura — todos atualizados de "pendente de decisão formal" para
"resolvido"), este diário.

**Nota de rastreabilidade:** o achado 3 da entrada "2026-08-04 — Triagem
de Segurança" (acima) permanece inalterado por histórico — este apêndice
documenta o fechamento subsequente, não uma reescrita do registro
original.

---

## 2026-08-04 (apêndice) — Rodada de 5 frentes paralelas (Bloco 6.1, Bloco 1.5, roadmap itens 3/7/8)

**Contexto:** rodada grande concluída no mesmo dia, com 5 agentes
trabalhando em paralelo em frentes independentes: `details` estruturado
(Bloco 6.1), testes de integração/E2E de permissões (Bloco 1.5), trigger
automático do MRP (roadmap item 3), rating de fornecedor via RNC
(roadmap item 8) e schema de mão-de-obra/overhead no custeio (roadmap
item 7, parcial). Cada entrega foi verificada nesta consolidação por
leitura direta do código-fonte e execução real dos testes, não apenas
pelo relato de cada agente.

### 1. Bloco 6.1 — `details` estruturado nos 9 endpoints priorizados

Os 9 casos de `BUSINESS_RULES.md` §13.5 foram auditados um a um. 6 já
estavam corretos (liberação de OP, conclusão de OP, embarque sem NF-e,
conversão de requisição sem fornecedor, conversão MRP em execução,
aprovação de requisição fora de sequência) — confirmados por leitura de
código, sem alteração necessária. 3 foram corrigidos:

- `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts`
  — recebimento sem NF agora lança `ValidationError` com
  `details: { purchase_id, order_number, field: 'invoice_number' }`.
- `server/src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts`
  — teste de laboratório sem resultado/faixa agora lança `ValidationError`
  com `details: { product_id, test_type, missing_fields }`.
- `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts`
  e `BlockLotUseCase.ts` — liberação/bloqueio de lote em status terminal
  agora lançam `BusinessRuleError` com `details: { lot_id,
  current_status, allowed_statuses }` (item que o próprio TODO já
  sinalizava desde a Onda 2).

Ver `docs/governance/TODO.md`, seção 6.1, marcada `[x]` por completo
nesta consolidação.

### 2. Bloco 1 — 4 testes de integração/E2E de permissões

- `server/tests/integration/rbac-module-access-denied.test.ts`
- `server/tests/integration/auth-me-permissions.test.ts` — reinterpretação
  deliberada do item "Dashboard só mostra cards do perfil": renderização
  React não é testável via Supertest, então o teste valida o CONTRATO
  (`GET /api/auth/me/permissions`) que o Dashboard consome para filtrar
  os cards. Reinterpretação documentada explicitamente no cabeçalho do
  próprio arquivo de teste.
- `server/tests/integration/reports-cross-module-permission.test.ts`
- `server/tests/integration/quality-releases-receiving-lot.test.ts` — E2E
  completo do UC-37: recebimento cria lote em quarentena, só um usuário
  com permissão do módulo `qualidade` (não `recebimento`) pode liberar o
  lote.

Ver `docs/governance/TODO.md`, seção 1.5, os 4 itens marcados `[x]` nesta
consolidação.

### 3. Roadmap item 3 — trigger automático do MRP

Implementado como **opt-in por item** (`items.conversao_automatica`,
migration `20260804-000010`), documentado como `UC-24b` em
`docs/projeto/04-USE_CASES.md`. Decisão de design deliberada: **nunca
100% automático** — risco de compra sem revisão humana; só itens com a
flag convertem sozinhos, dentro da mesma transação do plano MRP
(`GenerateMrpPlanUseCase`). Testado em
`server/tests/unit/mrp-auto-convert.test.ts` (4/4). **Pendência residual
pequena:** ainda não existe endpoint/UI para ligar a flag por item — só
via UPDATE direto no banco.

### 4. Roadmap item 8 — rating de fornecedor via RNC

Novo campo `suppliers.quality_score` — **calculado, nunca editável via
API** —, migration `20260804-000011-add-supplier-quality-score.cjs`,
recalculado de forma síncrona na criação de RNC vinculada a lote com
fornecedor (`CreateNonConformityUseCase.recalculateSupplierQualityScore`).
Fórmula: `MAX(0, 100 - (rncs_count / receipts_count * 100))`.
Documentado por completo em `docs/DATABASE.md`. Testado em
`server/tests/unit/quality-lot-lifecycle.test.ts` (20/20). **Risco
residual importante, registrado em destaque:** sem backfill retroativo —
RNCs fechadas antes desta entrega não contam no cálculo inicial (o campo
nasce no default neutro 100.00 para todo fornecedor).

### 5. Roadmap item 7 (parcial) — schema de mão-de-obra/overhead no custeio

Apenas o schema foi entregue: `work_centers.cost_per_hour` + tabela
`production_cost_settings` (migrations `20260804-000007/-000008/
-000009`). **O cálculo real ainda NÃO foi implementado.** Contrato
documentado em `docs/DATABASE.md`, apontando
`ChangeProductionOrderStatusUseCase.completeOrder()` como o lugar certo
para plugar o cálculo. Este item **não** foi marcado como resolvido no
roadmap — fica "schema pronto, cálculo pendente" como próxima tarefa.

### Achado operacional importante — risco de processo com migrations paralelas

Durante esta rodada, 2 agentes em paralelo (schema de custeio e rating de
fornecedor) colidiram numerando migrations como `20260804-000007` para
arquivos diferentes. Um deles renomeou o próprio arquivo para `-000011`
para evitar duplicidade, mas isso deixou a tabela `SequelizeMeta` do
Postgres dessincronizada do arquivo em disco — a migration já havia sido
APLICADA sob o nome antigo por uma corrida com o outro agente rodando
`migration:up` ao mesmo tempo. Detectado e corrigido diretamente nesta
consolidação: `UPDATE` em `SequelizeMeta` para casar com o nome do
arquivo atual em disco, **sem** re-executar a migration. Confirmado via
`npm run migration:status`: todas as 11 migrations de 2026-08-04
aparecem como `up`, numeração `000001` a `000011` sem lacunas nem
duplicidade.

**Registrado como risco de processo para rodadas futuras com múltiplos
agentes mexendo em schema ao mesmo tempo** (ver detalhamento em
`docs/governance/TODO.md`): preferir um agente por vez para
`migration:generate`/`migration:up` quando há mais de um agente de schema
na mesma sessão, ou revisar `migration:status` manualmente ao final de
rodadas com múltiplos agentes de schema.

### Registro geral (rodado diretamente nesta consolidação, não repassado por outro agente)

```
cd server && npx jest tests/unit
  → Test Suites: 61 passed, 61 total | Tests: 431 passed, 431 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd server && npm run migration:status
  → todas as migrations até 20260804-000011 em estado "up", sem lacunas
```

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(Bloco 6.1 e Bloco 1.5 fechados `[x]`, nova seção "Rodada de 5 Frentes
Paralelas — 2026-08-04"), `docs/LEVANTAMENTO_ERP_2026-08-02.md` (itens 3
e 8 marcados resolvidos, item 7 mantido parcial com nota do schema),
`docs/HANDOFF_CODEX.md` (seção nova consolidando tudo), este diário.
original.

---

## 2026-08-04 (apêndice) — Custeio real de mão-de-obra/overhead + rastreabilidade por lote/QR

Duas frentes do roadmap (`docs/LEVANTAMENTO_ERP_2026-08-02.md`) fechadas
nesta data, em sequência à rodada de 5 frentes registrada logo acima. A
entrada anterior deste diário deixou o item 7 explicitamente como "NÃO
marcado como resolvido, só o schema foi entregue" — esta entrada fecha o
cálculo real que faltava, e também fecha o item 6.

### 1. Roadmap item 7 — custeio real (mão-de-obra + overhead)

O schema (`work_centers.cost_per_hour`, tabela
`production_cost_settings`, migrations `20260804-000007/-000008/-000009`)
já existia desde a rodada anterior. O que entrou agora foi o **cálculo**:

- `server/src/services/costingService.ts` ganhou
  `registerAdditionalProductionCost()`.
- `ChangeProductionOrderStatusUseCase.completeOrder()`
  (`server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`)
  agora calcula, na MESMA transação da conclusão da OP:
  - **Mão-de-obra:** horas apontadas (`production_order_tracking`,
    `finished_at - started_at`) × `work_centers.cost_per_hour` da etapa,
    com fallback `production_cost_settings.default_labor_rate_per_hour`
    quando a etapa não tem centro de trabalho estruturado vinculado. OP
    sem nenhum apontamento concluído não lança custo de mão-de-obra
    (nenhuma base horária real para estimar).
  - **Overhead:** `overhead_rate_percent / 100` sobre a base configurada
    em `overhead_calculation_basis` (`material_labor`/`labor_only`/
    `material_only`).
  - Lançamentos gravados em `ProductCostLedger` com
    `source_type: 'production_labor'`/`'production_overhead'`, separados
    do lançamento de material (`'production'`, já existia).
- Contrato completo, com justificativa de cada decisão de modelagem, já
  documentado em `docs/DATABASE.md` (seção "Cálculo implementado (item
  7/9 — mão-de-obra e overhead)").
- Testado em `server/tests/unit/production-labor-overhead-cost.test.ts`
  (6 casos, `costingService` real não mockado — mão-de-obra via
  `work_centers.cost_per_hour`, fallback global, OP sem apontamento, 3
  bases de overhead).

**Bug real encontrado e corrigido no caminho:**
`SequelizeReportsRepository.findCostVarianceByProduct`
(`server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts:225`)
triplicava a contagem de `quantity` quando existiam múltiplos
lançamentos-irmãos (material + mão-de-obra + overhead) da mesma OP
compartilhando `source_id` — a média ponderada simples somava a
quantidade 3x para o mesmo lote produzido, diluindo `avg_real_cost`
incorretamente. Corrigido com uma CTE que colapsa as linhas-irmãs por
`(product_id, source_id)` (soma `total_cost`, mantém `quantity` uma vez)
antes de agregar por produto. Isso afeta diretamente o relatório de
variância de custo em `/reports` (aba "Custos") — o número exibido antes
desta correção estava sistematicamente errado para qualquer OP concluída
com apontamento de mão-de-obra/overhead lançado.

**Risco residual real, sem mitigação (registrado para o time humano):**
não há backfill retroativo — OPs concluídas antes desta entrega não
ganham custo de mão-de-obra/overhead; permanecem só com o custo de
material já existente. OEE completo (que depende de disponibilidade/downtime
e qualidade/refugo, além do eixo de custo) continua fora de escopo desta
entrega.

### 2. Roadmap item 6 — rastreabilidade por lote/QR no chão de fábrica

Backend reaproveitou 100% a infraestrutura de QR já existente
(`qrCodeService.ts`, `GenerateEntityQrCodeUseCase.ts`, hoje usada em
Ativos) e o model `ProductionLotConsumption` já existente — nenhuma
tabela nova. Dois endpoints novos em
`server/src/modules/inventory/presentation/routes/inventory.ts`:

- `GET /api/inventory/lots/by-code/:lot_number` — lookup por código
  legível (`GetLotByCodeUseCase.ts`), com desambiguação opcional por
  `product_id`.
- `GET /api/inventory/lots/:id/qrcode` — gera QR para etiqueta,
  reaproveitando `GenerateEntityQrCodeUseCase`.

Testado em `server/tests/unit/lot-traceability-qrcode.test.ts` (9 casos).

Frontend: novo componente
`client/src/pages/production/CompleteOrderWithLotScanDialog.tsx` —
conclusão de OP com leitura/digitação de código de lote consumido
(resolvido via lookup ao endpoint acima) e lote produzido via
`finished_lot_number` — integrado em `ShopFloorPage.tsx` (botão "Concluir
OP (ler lote)", abre o QR da etiqueta pós-conclusão via `QrCodeDialog`
reaproveitado de Ativos). Botão de reimpressão de QR adicionado em
`client/src/pages/logistics/LotsTab.tsx`.

**Decisão consciente, registrada como não sendo gap:** leitura por câmera
(`getUserMedia`) não foi implementada — o leitor físico USB/Bluetooth de
código de barras/QR, padrão em chão de fábrica, já preenche o campo de
texto como se fosse digitação, tornando a câmera do navegador
desnecessária para este caso de uso.

### Validação rodada diretamente nesta consolidação (não repassada por outro agente)

```
cd server && npx jest tests/unit
  → Test Suites: 63 passed, 63 total | Tests: 446 passed, 446 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd client && npx vitest run
  → Test Files: 6 passed (6) | Tests: 24 passed (24)
```

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(nova seção "Custeio real de mão-de-obra/overhead + rastreabilidade por
lote/QR — 2026-08-04"), `docs/LEVANTAMENTO_ERP_2026-08-02.md` (itens 6 e
7 marcados `feito`), `docs/HANDOFF_CODEX.md` (seção nova), este diário.

---

## 2026-08-05 — Menu por departamento, `Item.type` USO_E_CONSUMO/ATIVO_IMOBILIZADO, devolução ao fornecedor com estorno, toggle MRP auto-convert, refactor Clean Architecture (22 use-cases), fix de bootstrap de banco novo, telas órfãs cabeadas

**Contexto:** dia inteiro de entregas (8 commits), todas já mergeadas em
`main` sem passar por esta sessão de governança em tempo real — esta
entrada consolida retroativamente, por leitura de `git log --stat` e dos
diffs reais, o que foi commitado em 2026-08-05 (nenhuma entrada de diário
havia sido registrada até agora para essa data).

**1. Reorganização do menu por departamento (Blocos A–F)** — navegação
lateral (`AppLayout.tsx`) reagrupada por blocos de área de negócio em vez
da lista plana anterior, alinhando o menu à estrutura organizacional de
21 departamentos já documentada em `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.

**2. `Item.type` ganha `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO`** — novo par de
valores no enum de tipo de item (migration `20260805-000001-add-item-tipo-uso-consumo-ativo.cjs`),
permitindo cadastrar itens que não são matéria-prima/produto/subconjunto
(ex.: material de escritório, ferramental capitalizável). Migrations
complementares no mesmo dia: `20260805-000002-add-asset-type-license.cjs`,
`20260805-000003-add-asset-license-and-purchase-item.cjs` (licença como
tipo de ativo + vínculo do ativo ao item do pedido de compra que o
originou), `20260805-000004-add-invoice-type-payable-and-purchase.cjs`
(tipo de nota fiscal em contas a pagar/compra),
`20260805-000005-add-asset-id-non-conformities.cjs` (RNC pode referenciar
um ativo, não só um lote), `20260805-000006-add-asset-status-returned-to-supplier.cjs`
(novo status de ativo para devolução ao fornecedor).

**3. Devolução ao fornecedor com estorno** — fluxo novo de devolução de
ativo/item ao fornecedor, com estorno financeiro associado (usa o status
`returned_to_supplier` da migration `-000006` acima).

**4. Toggle de MRP auto-convert via PATCH + UI** — a pendência residual
registrada em 2026-08-04 ("não existe endpoint/UI para ligar
`items.conversao_automatica` por item — só via UPDATE direto no banco")
foi fechada: `client/src/api/items.ts` + `ProductsPage.tsx` ganharam a
chamada e o controle de UI para ligar/desligar a conversão automática do
MRP por item, consumindo um `PATCH` já exposto no backend.

**5. Refactor de 22 use-cases para Clean Architecture (commit `e4104fb`)**
— módulos `fiscal`, `inventory` (warehouses/lots/transfers), `products`,
`purchase-requisitions`, `purchases`, `users`, `webhooks` desacoplados de
acesso direto ao Sequelize nos use-cases, passando a depender de
interfaces de repositório (`domain/repositories/*Repository.ts`) com
implementação em `infrastructure/sequelize/Sequelize*Repository.ts`. 62
arquivos alterados, cobertura de teste unitário existente mantida verde
(ajustes em ~15 arquivos de teste para os novos mocks de repositório).

**6. Fix real de bootstrap de banco novo + bug de dual-read na contagem
cíclica (commit `f9f03ea`)** — `20260731-000001-baseline-schema.cjs`
tinha uma coluna `NOT NULL` indevida que quebrava a criação de banco do
zero (ambiente novo, sem histórico de migrations incrementais);
corrigido. Bug real também corrigido em
`CreateInventoryCountUseCase.ts`/`SequelizeItemRepository.ts`: dual-read
de contagem cíclica lia o campo errado em certos casos. Teste de
invariante novo: `server/tests/unit/warehouse-invariants.test.ts`.

**7. `@types/express` alinhado ao runtime real v4 (commit `a386ca2`)** —
o pacote de tipos estava na major errada frente ao Express 4.18
efetivamente instalado; corrigido `server/package.json`/`package-lock.json`.

**8. Fixture de Item para CI + remoção de padrão perigoso de login com
admin real em teste (commit `06851db`)** — `server/scripts/run-api-suite.cjs`
ganhou fixture de Item para os testes de integração de MRP/rastreabilidade;
`mrp.test.ts`/`traceability.test.ts` pararam de logar com as credenciais
reais do admin seed, usando um usuário de teste dedicado.

**9. 3 telas órfãs cabeadas no frontend (commit `da27101`)** — RH,
Configuração Fiscal e Auditor Inteligente ganharam entrada de menu/rota em
`App.tsx`/`AppLayout.tsx` (backend já existia, sem UI acessível até este
commit).

**10. Atualização do doc de auditoria (commit `0c68b65`)** — status real
dos 15 achados ALTO de `docs/AUDITORIA_PRE_PRODUCAO_2026-08-02.md`
atualizado.

**Documentos atualizados nesta consolidação retroativa:** este diário
(entrada nova, único registro de 2026-08-05 até agora).

---

## 2026-08-06 — Apps mobile (Expo) e Android TV novos, atribuição de contagem cíclica (pool/claim), `department_id` em OP/contagens, auditoria multi-agente de 7 frentes, remediação imediata de 4 frentes

**Contexto:** sessão longa com dois grandes blocos de trabalho: (I) entrega
de dois aplicativos novos + feature de atribuição de contagens no backend/
web, todos testados ao vivo contra Postgres real; (II) auditoria
multi-agente completa (7 agentes em paralelo) seguida de remediação
imediata (4 agentes em paralelo) dos achados mais graves. Checkpoint
principal: commit `8ba775f`. Correções subsequentes da remediação seguem
em andamento no working tree no momento desta entrada (ver `git status`
no fechamento desta sessão).

### I. Entregas de produto

**1. App mobile novo (`mobile/`, Expo/React Native + Expo Router)** —
login JWT reaproveitando o backend existente, scan de estoque QR
(`expo-camera`, `CameraView`), histórico de movimentações, execução de
contagens cíclicas (pool de contagens disponíveis + contagens já
atribuídas ao usuário logado). **Validado apenas por typecheck
(`npx tsc --noEmit`)/bundle (`npx expo export`) nesta entrega — nenhum
teste em dispositivo/emulador real ainda** (câmera, leitor físico,
D-pad n/a aqui, rede real da fábrica). Detalhe completo em
`mobile/README.md` §5 e `docs/HANDOFF_CODEX.md`.

**2. App Android TV novo (`tv/`, react-native-tvos)** — painel de demandas
por departamento (recebimento pendente, requisições aguardando aprovação,
expedição pronta, qualidade em quarentena/RNCs abertas), auto-refresh a
cada 60s, navegação por D-pad (`FocusablePressable`). **Mesma ressalva:
validado só por typecheck/bundle, sem teste em hardware de TV real** (D-pad
físico, resolução de banner 320×180, controle remoto). Detalhe em
`tv/README.md` §5.

**3. Feature de atribuição de contagem cíclica (pool/atribuída) — full
stack** — migration `20260806-000001-add-assigned-to-inventory-counts.cjs`
(`inventory_counts.assigned_to`, FK `users`, nullable); claim atômico no
`start` da contagem (lock pessimista `SELECT ... FOR UPDATE` dentro de
transação — dois funcionários competindo pela mesma contagem do pool
resolvem via 409 `CONFLICT` para o perdedor da corrida); filtros de
listagem `assigned_to=me`/`unassigned=true`. Tela web do supervisor
(`InventoryCountsPage.tsx`) ganhou campo "Atribuir a" na criação + filtro
na listagem; app mobile (`(app)/counts/`) consome o mesmo contrato.
Detalhe completo do contrato em `docs/API.md` §8.2 e
`docs/HANDOFF_CODEX.md`.

**4. Bug real corrigido — caminho `item_ids` de contagens dava 500** —
`product_id NOT NULL` em `inventory_count_items` quebrava a criação de
contagem quando informada por lista de itens (não por depósito completo);
migration `20260806-000002-make-product-id-nullable-inventory-count-items.cjs`
(nullable + `CHECK`). **Testado ao vivo.**

**5. `department_id` em `production_orders`/`inventory_counts` + painel de
demandas por departamento** — migration
`20260806-000003-add-department-id-to-production-orders-and-inventory-counts.cjs`
(nullable, **sem backfill por design** — dado histórico não tem
departamento de origem confiável para inferir). Endpoint novo
`GET /api/dashboard/department-demands` (consumido pelo painel de TV do
item 2 acima). **Testado ao vivo contra Postgres real.**

**6. Teste manual completo do fluxo de contagem via API real** — criar
(pool) → claim → conflito 409 (segundo usuário) → contar itens → submit
bloqueado com pendências (422) → submit válido → aprovação com ajuste
real de saldo de estoque. Dados de teste limpos ao final.

**7. Limpeza de `.claude/agents/evok-production-remediation.md`** —
removidas ~90 linhas de texto estranho coladas por acidente em uma
entrega anterior (não relacionado a código de produto).

### II. Auditoria multi-agente (7 agentes em paralelo) — todos os relatórios entregues

- **Auditor geral:** veredito **PARCIALMENTE APROVADO** — sólido
  tecnicamente, 2 achados P1 de fluxo de exceção.
- **Segurança:** zero crítico/alto — apto para G6 do ponto de vista de
  segurança pura.
- **DBA:** schema saudável, 53 migrations sincronizadas (no momento da
  auditoria, antes da `-000004` de remediação abaixo), índices faltantes
  detectados.
- **Infra:** 4 achados altos — uploads sem volume persistente no
  `docker-compose.yml`, docs de deploy (`docs/infra/DEPLOY_UBUNTU.md`)
  ainda citando SQL legado em vez de migrations, ausência de TLS
  documentado, `docker-compose.prod.yml` nunca exercitado de fato.
- **Frontend:** 1 bug P0 real, introduzido no próprio diff do dia — o
  campo "Atribuir a" (item I.3 acima) quebrava o caso "pool" (sem
  atribuição) com falha silenciosa.
- **Mobile/TV:** timeout de rede ausente nos dois apps, TV entrando em
  loop de erro 403 sem tratamento diferenciado, TTL de JWT de 7 dias
  incompatível com um painel de TV "sempre ligado" (sem fluxo de
  relogin/refresh).
- **Documentação:** este relatório de consolidação (a auditoria em si).

### III. Remediação imediata (4 agentes em paralelo) — concluída em 2026-08-06

- **Bug P0 do pool (frontend):** corrigido + teste de componente novo
  (`client/src/pages/products/InventoryCountsPage.test.tsx`) — suíte
  vitest do client em **49/49** após a correção.
- **Mobile/TV:** timeout de 15s adicionado às chamadas HTTP dos dois apps;
  tratamento diferenciado de 403 (não confunde com 401/relogin); logout
  explícito disponível na TV; ícones vetoriais substituindo emoji/texto
  cru; lixo de template do `create-expo-app` removido do `mobile/`
  (`mobile/CLAUDE.md`, `mobile/AGENTS.md`, `mobile/LICENSE` — não tinham
  relação com o projeto, eram gerados pelo scaffold do Expo).
- **Infra:** `docker-compose.yml` ganhou volume dedicado para uploads +
  variável de timezone (`TZ`); `ALLOW_LOCAL_DB_NO_SSL` documentada;
  `docs/infra/DEPLOY_UBUNTU.md` corrigido para referenciar o fluxo real de
  migrations (não mais o SQL legado).
- **Backend (em finalização no momento desta entrada, ainda não
  commitado):** endpoint novo `PUT /api/inventory-counts/:id/reassign`
  (`ReassignInventoryCountUseCase.ts`), admin-override no `start` (admin
  pode iniciar uma contagem de qualquer atribuição), validação de
  `assigned_to` ativo na atribuição, migration
  `20260806-000004-add-missing-indexes-status-item-id.cjs` (índices em
  `production_orders.status` + `item_id` em 4 tabelas, drop de índice
  duplicado encontrado na auditoria do DBA), `down()` da migration
  `-000002` protegido com mensagem de erro clara (evita reverter uma
  coluna que já tem dados não nulos sem aviso).

### Pendências registradas (decisão consciente de não resolver hoje)

- **JWT de 7 dias × painel de TV "sempre ligado"** — exige decisão de
  produto (refresh token dedicado, TTL específico para o app de TV, ou
  runbook operacional de relogin periódico). Registrado como decisão
  pendente, não como bug.
- **Validação em hardware real dos 2 apps** — listas detalhadas em
  `mobile/README.md` §5 e `tv/README.md` §5 (build APK/EAS, D-pad físico,
  câmera/leitor físico de QR, rede real da fábrica, banner de TV
  320×180).
- **Teste de integração de concorrência real do claim** — dois clientes
  simultâneos contra Postgres real (hoje coberto só por teste unitário
  com repositório mockado).
- **Paginação da lista de contagens no app mobile** — limite fixo de 100
  itens, sem paginação real.
- **Infra de produção** — reverse proxy/TLS, `docker-compose.prod.yml`
  exercitado de fato, cron de backup — todos aguardando a compra do
  servidor de produção (checklist em `docs/infra/DEPLOY_UBUNTU.md`).

**Documentos atualizados nesta consolidação de governança:**
`docs/governance/TODO.md` (nova seção "2026-08-06" com as pendências
acima), `CLAUDE.md` (status/data, contagem de migrations/FKs, árvore de
pastas com `mobile/`/`tv/`, roadmap), `docs/HANDOFF_CODEX.md` (nota de
atualização na seção de atribuição de contagens), `docs/GO_LIVE_G6_CHECKLIST.md`
(resumo executivo/datas, seções Kubernetes/Datadog marcadas não
aplicáveis), este diário.
