# USE_CASES_RECOVERED_cadastro-suprimentos.md — ERP-LEGACY-001, Passo 28

```
PROJECT_ID:   ERP-LEGACY-001
CLUSTER:      cadastro-suprimentos
MÓDULOS:      items, categories, departments, suppliers, clients, employees,
              products, bom, purchases, purchaseRequisitions, rfq, comex
              (todos em server/src/modules/<módulo>/, confirmado por Glob)
AUDIT_COMMIT: f05e865 (informado pelo orquestrador; NÃO reverificado por git —
              sessão read-only, sem shell, conforme trilha)
MÉTODO:       READ → ANALYZE → VERIFY → PROVE → CLASSIFY. Read/Grep/Glob apenas.
              Nenhum comando executado, nenhuma conexão de banco aberta.
PRODUÇÃO REAL (items, categories, departments): lidas SOMENTE por código-fonte
              (rotas/use-cases/validators). Nenhuma execução, nenhum acesso a
              banco — APR-2026-016 / regra 2 da trilha.
RESSALVA:     Tudo abaixo é DISCOVERED_USE_CASE até validação humana (regra 4 da
              trilha; CLAUDE.md 6-8). A doc (04-USE_CASES.md, business/01-USE_CASES.md,
              DIAGRAMA_CASOS_DE_USO_BPMN.md) é OBJETO DE AUDITORIA, não fonte de
              verdade — cruzada, nunca copiada. Nenhum finding é promovido aqui:
              candidatos seguem até o passo 31.
BR-IDs:       do passo 26 (BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md).
```

**Legenda de classificação vs. doc:**
`CONFIRMED` = documentado (com UC-ID) e implementado, batendo · `CONFLITANTE` = existe UC, mas código diverge (detalho seção vs. arquivo:linha) · `FANTASMA` = implementado, sem UC no catálogo · `OBSOLETE_CANDIDATE` = artefato de UC/código sem rota alcançável ou UC de doc sem código.

**Modelo de autorização observado (base de todos os UCs):** `middlewares/auth.ts:213-286` — `authorizeModule(mod, level='operate')`. `admin` é curto-circuito total (`:226-229`). Nível `'operate'` aceita `permissions[mod] ∈ {operate,approve}`; nível `'approve'` só aceita `approve` (`:272-282`). Consequência central para este cluster: **`authorizeModule('diretor')` sem nível exige apenas PRESENÇA do módulo `diretor` (qualquer nível), não `approve`** (BR-SUP-008).

---

## 1. `items` (hot path — profundidade)

### UC-CADSUP-01 — Criar item industrial (+ produto-gêmeo atômico)
- **Objetivo:** cadastrar item canônico e garantir o `products` gêmeo na mesma transação (crosswalk `products.code = items.codigo`).
- **Atores:** módulo `produtos` nível `operate` — `items.ts:16` (`authorizeModule('produtos','operate')`) + `authenticate`.
- **Gatilho:** `POST /api/items` — `items.ts:16` → `itemController.create` (`itemController.ts:65`).
- **Fluxo principal:** `CreateItemUseCase.ts:27-59` — valida unicidade de `codigo` (`:28-31`, 409), abre transação, cria item (`:35-49`), espelha produto (`ItemProductMirrorService.ensureProductMirrorForItem`, `:51`), commit.
- **Exceções:** 409 `Codigo do item ja cadastrado` (`:30`); rollback em falha do espelho (`:55-57`); payload inválido → 400 (`itemValidators.ts:8-30`, `.strict()`).
- **Pré/pós e invariantes:** codigo único (comparação exata, case-sensitive, só `.trim()` — BR-CAD-008); produto-gêmeo sempre criado, inclusive `USO_E_CONSUMO`/`ATIVO_IMOBILIZADO` (BR-CAD-009).
- **BRs:** BR-CAD-008, BR-CAD-009.
- **Classificação:** **FANTASMA.** Não há UC "Cadastrar Item" no catálogo. `UC-03` (`04-USE_CASES.md:53`) é "Cadastrar Produto" — outro modelo (`products`, INTEGER), com regras que não batem (ver UC-CADSUP-20). O crosswalk item→produto (BR-CAD-009), invariante central do sistema, é **inteiramente não documentado como UC**.

### UC-CADSUP-02 — Atualizar cadastro de item (sync unidirecional item→produto)
- **Atores:** `produtos:operate` — `items.ts:17`.
- **Gatilho:** `PATCH /api/items/:id` — `items.ts:17` → `itemController.update` (`itemController.ts:84`).
- **Fluxo:** `UpdateItemUseCase.ts:48-64` — findById (404 `:50-52`), update parcial, `syncProductMirrorFromItem` (`:57`), commit.
- **Invariante:** `codigo` e `tipo` fora do `updateItemSchema` (`itemValidators.ts:37-53`) → não alteráveis por API.
- **Classificação:** **FANTASMA.** Sem UC.

### UC-CADSUP-03 — Inativar item com verificação de vínculos
- **Atores:** `produtos:operate` — `items.ts:20-21`.
- **Gatilho:** `PATCH /api/items/:id/inactivate` **e** `DELETE /api/items/:id` (ambos → `itemController.inactivate`, `items.ts:20-21`).
- **Fluxo:** `DeactivateItemUseCase.ts:59-76` — verifica 5 vínculos (estrutura BOM ativa, OP aberta, movimento, lote, ordem MRP — `:84-130`); se algum, 409 com detalhe; senão `status='INATIVO'`.
- **Classificação:** **FANTASMA.** Sem UC. Observação: `DELETE` e `PATCH .../inactivate` mapeiam para a MESMA ação (soft-delete) — `DELETE` não apaga registro.

### UC-CADSUP-04 — Cadastrar estrutura pela ficha do item (DESCONTINUADO)
- **Atores:** `produtos:operate` — `items.ts:18`.
- **Gatilho:** `POST /api/items/:id/estrutura` — `items.ts:18` → `itemController.createStructure`.
- **Fluxo real:** `CreateItemStructureUseCase.ts:48-93` — valida existência pai/componente e ciclo, e então **sempre lança 422 `G1-ESTRUTURA-DUPLA`** (`:79-92`) redirecionando para `POST /api/engineering/bom`.
- **Classificação:** **CONFIRMED** (deprecação documentada). `UC-20` (`04-USE_CASES.md:826-831`) declara exatamente que este caminho responde `422 G1-ESTRUTURA-DUPLA`. Código e doc batem. A rota permanece montada de propósito (para dar a mensagem de erro).

### UC-CADSUP-05 — Explodir estrutura do item
- **Atores:** `produtos` (leitura) — `items.ts:19`.
- **Gatilho:** `GET /api/items/:id/estrutura/explode` — `items.ts:19` → `itemController.explode`.
- **Fluxo:** `ExplodeItemStructureUseCase.ts:21-56` — lê `itemEstruturaRepository.listActiveEdges()` (`:29`) e explode via `mrp/application/mrpEngine.explodeBomRequirements`.
- **Classificação:** **FANTASMA + candidato a finding.** Sem UC. Explode a árvore `item_estruturas` que o **G1 aposentou** como fonte (`DOMAIN_MAP.md`; `CreateItemStructureUseCase` bloqueia a escrita dela). Como a escrita HTTP está barrada (UC-CADSUP-04), este endpoint só devolve arestas legadas pré-G1 — lê uma estrutura que o resto do sistema abandonou. Divergência de fonte única (BR-CAD-013/§G1).

### UC-CADSUP-06 a 10 — Catálogo Item × Fornecedor
- **Atores:** `produtos` (leitura) / `produtos:operate` (escrita) — `items.ts:23-27`.
- **Gatilhos/fluxos:**
  - `GET /:id/suppliers` → `ListItemSuppliersUseCase` (`items.ts:23`).
  - `POST /:id/suppliers` → `CreateItemSupplierUseCase.ts:43-86` — 404 item/fornecedor, 409 vínculo duplicado (`:55-57`), zera `preferred` dos demais se `preferred=true` (`:74-76`).
  - `PUT /:id/suppliers/:linkId` → `UpdateItemSupplierUseCase.ts:39-67`.
  - `DELETE /:id/suppliers/:linkId` → `DeactivateItemSupplierUseCase` (soft delete `active=false`).
  - `GET /:id/purchase-history` → `GetItemPurchaseHistoryUseCase.ts:33-40`.
- **Classificação:** **CONFIRMED** vs. `UC-22` (`04-USE_CASES.md:880-912`) — fluxo, 409 duplicado, 404, soft delete e "1 preferencial por item" batem.
  - ⚠ **CONFLITANTE menor (ator):** `UC-22:882` declara ator "Comprador, Administrador"; a rota exige módulo **`produtos`**, não `compras`. Um comprador com apenas `compras` **não** gerencia o catálogo item×fornecedor. `GET /api/suppliers/:id/items` (UC-22 passo 9) exige módulo `fornecedores` (`suppliers.ts:19`) — terceiro módulo para o mesmo UC.

---

## 2. `suppliers`

### UC-CADSUP-11 — Cadastrar fornecedor (CNPJ válido, is_foreign obrigatório)
- **Atores:** `fornecedores:operate` — `suppliers.ts:20`.
- **Gatilho:** `POST /api/suppliers` — `suppliers.ts:20` → `supplierController.create`.
- **Fluxo:** `CreateSupplierUseCase.ts:28-62` — valida CNPJ (`Validators.validateDocument`, `:31-34`), grava só dígitos (`:36`), `rating=3`/`status='active'` fixos (`:50-51`), `is_foreign` do payload (`:53`). Unicidade → 409 `CNPJ já cadastrado` (`:57-59`).
- **Invariantes:** CNPJ com DV válido obrigatório inclusive para estrangeiro (BR-CAD-002); `is_foreign` declaração obrigatória via `z.boolean()` (BR-CAD-003, `supplierValidators.ts:34-37`).
- **Classificação:** **FANTASMA.** Não há UC "Cadastrar Fornecedor" no catálogo (grep confirmou: só `UC-22` toca fornecedor, de lado). O `UC-19` (COMEX) usa o cadastro como pré-condição, mas não o documenta. BR-CAD-001/002/003.

### UC-CADSUP-12 — Atualizar fornecedor (is_foreign escalation-only)
- **Atores:** `fornecedores:operate` — `suppliers.ts:21`.
- **Gatilho:** `PUT /api/suppliers/:id` → `UpdateSupplierUseCase.ts:40-71`.
- **Invariante:** desmarcar `is_foreign` (true→false) → 422 `G11` (`:53-64`); `cnpj`/`status` fora de `ALLOWED_FIELDS` (`:10-15`). BR-CAD-004/006.
- **Classificação:** **FANTASMA** (comportamento parcialmente citado em `API.md:2957`, mas sem UC).

### UC-CADSUP-13 — Desativar fornecedor
- **Atores:** `fornecedores:approve` — `suppliers.ts:22` (único delete do cluster elevado a `approve`).
- **Gatilho:** `DELETE /api/suppliers/:id` → `DeactivateSupplierUseCase`.
- **Classificação:** **FANTASMA.**

### UC-CADSUP-14 — Itens de um fornecedor
- **Gatilho:** `GET /api/suppliers/:id/items` — `suppliers.ts:19` → `ListSupplierItemsUseCase`.
- **Classificação:** **CONFIRMED (parcial)** — é o passo 9 de `UC-22:898-899`.

---

## 3. `clients`

### UC-CADSUP-15 — Cadastrar cliente (CPF/CNPJ polimórfico)
- **Atores:** `clientes:operate` — `clients.ts:21`.
- **Gatilho:** `POST /api/clients` → `CreateClientUseCase.ts:31-82` — valida documento por tamanho (11/14, `:34-36`), grava dígitos (`:39`), 409 `CPF/CNPJ já cadastrado` (`:77-79`).
- **Classificação:** **CONFIRMED** vs. `UC-02` (`04-USE_CASES.md:31-49`): unicidade, obrigatórios (nome+documento), status active default — batem. BR-CAD-007.
  - ⚠ **CONFLITANTE menor (ator):** `UC-02:33` diz "Operador, Administrador" (modelo de role legado); rota exige módulo `clientes`.

### UC-CADSUP-16 — Atualizar / desativar cliente
- **Gatilhos:** `PUT /api/clients/:id` (`clients.ts:22`, `clientes:operate`) → `UpdateClientUseCase`; `DELETE /api/clients/:id` (`clients.ts:23`, `clientes:approve`) → `DeactivateClientUseCase`.
- **Classificação:** **FANTASMA (parcial).** `UC-02` cobre só o *cadastrar*; edição e desativação (delete elevado a `approve`) não têm UC.

---

## 4. Cadastros rasos (`categories`, `departments`, `employees`, `products`) — cobertura declaradamente rasa

### UC-CADSUP-17 — Gerenciar categorias (CRUD, nome único)
- **Atores/gatilhos:** `categories.ts:12-16` — leitura só `authenticate`; `POST`/`PUT` `authorize('admin','operator')`; `DELETE` `authorize('admin')`. Único módulo do cluster ainda em RBAC por **role** (`authorize`), não `authorizeModule`.
- **Classificação:** **CONFLITANTE** vs. `UC-09` (`04-USE_CASES.md:219-230`): `UC-09:221` afirma ator "Administrador" e pré-condição "autenticado como admin"; o código permite **`operator`** em create/update (`categories.ts:14-15`). Doc mais restritivo que o código.

### UC-CADSUP-18 — Gerenciar departamentos (CRUD, code/name único)
- **Atores/gatilhos:** `departments.ts:12-16` — leitura autenticada; `POST`/`PUT`/`DELETE` `authorize('admin')`. `CreateDepartmentUseCase.ts:33-46` — `code`+`name` obrigatórios, 409 `Código ou nome já existe`.
- **Classificação:** **FANTASMA.** Sem UC dedicado — "departamento" só aparece como pré-condição de `UC-11`. Guarda seeds↔doc do organograma existe mas não auditada aqui.

### UC-CADSUP-19 — Cadastrar/gerenciar funcionário
- **Atores/gatilhos:** `employees.ts:19-23` — leitura autenticada (segregação de campos sensíveis dentro dos use-cases, não na rota); `POST`/`PUT`/`DELETE` `authorize('admin')`.
- **Classificação:** **CONFLITANTE (confiança MÉDIA — use-case não lido em profundidade nesta rodada).** `UC-11` (`04-USE_CASES.md:247-265`) documenta passo 8 "registra no eSocial (evento S-2200)" e regra "Exame admissional obrigatório antes do início": **não há módulo/integração eSocial neste cluster** e `employees` tem 0 registros em base real (BR doc §3) — passos aspiracionais sem código correspondente aparente. Requer verificação dedicada.

### UC-CADSUP-20 — Cadastrar produto (`products`)
- **Atores/gatilhos:** `products.ts:19-30` — módulo `produtos`; `POST /` (`operate`) → `CreateProductUseCase`; `/movements`, `/:id/photo`, `/:id/qrcode`, `/:id/stock-by-warehouse` (este último em módulo `estoque`, `products.ts:30`).
- **Classificação:** **CONFLITANTE (confiança MÉDIA — `CreateProductUseCase` não lido linha-a-linha).** `UC-03` (`04-USE_CASES.md:65-69`) afirma regras "Preço de venda deve ser maior que preço de custo" e "Quantidade mínima padrão: 5 unidades" — não confirmadas no código nesta rodada; historicamente `products` é o catálogo legado espelhado por `items` (BR-CAD-009), o que torna essas regras suspeitas. Marcar para verificação.

---

## 5. `bom`

### UC-CADSUP-21 — Criar/versionar BOM (nasce vigente, supersede anterior)
- **Atores:** `bom:operate` — `bom.ts:24`.
- **Gatilho:** `POST /api/engineering/bom` → `CreateBOMUseCase.ts:34-46` → `BomService.createBOM`.
- **Invariantes:** produto deve ser `finished` (BR-CAD-010); BOM nasce `status:'active'` rebaixando a anterior a `superseded` na mesma transação (BR-CAD-013); ciclo/auto-ref barrados (BR-CAD-011); profundidade ≤10 (BR-CAD-015); tipos não-produtivos barrados (BR-CAD-016).
- **Classificação:** **CONFLITANTE.** `UC-20` (`04-USE_CASES.md:790-859`) documenta o versionamento e o controle de alteração corretamente, **mas o UC não registra que NINGUÉM aprova a BOM**: ela entra vigente sem segundo par de olhos (`approved_by`/`approval_date` nunca preenchidos — BR-CAD-014), em contraste com a alçada exigida para COMPRAR (UC-CADSUP-26). O passo documentado 5 do `UC-20:799` ("Define roteiro de fabricação") não é feito por este endpoint.

### UC-CADSUP-22 — Atualizar BOM (ativa imutável)
- **Gatilho:** `PUT /api/engineering/bom/:id` (`bom.ts:25`, `bom:operate`) → `UpdateBOMUseCase` (só `revision`/`notes`/`status`).
- **Classificação:** **CONFIRMED** vs. `UC-20:833-847` (tabela de controle de alteração ISO 9001 §8.5.6 bate).

### UC-CADSUP-23 (leituras BOM)
- `GET /` `/product/:productId[/versions]` `/:id` `/:id/{explode,cost,availability,tree,items}` — `bom.ts:20-33`, todos `authorizeModule('bom')`. **CONFIRMED (agrupado)** como consultas de `UC-20`.

---

## 6. `purchases`

### UC-CADSUP-24 — Registrar pedido de compra
- **Atores:** `compras:operate` — `purchases.ts:44`.
- **Gatilho:** `POST /api/purchases` → `CreatePurchaseUseCase.ts:58-134`.
- **Fluxo/invariantes:** resolve origem efetiva contra `suppliers.is_foreign` e **grava já corrigida** (`:70-113`); 422 `G11-ORIGIN-SUPPLIER-MISMATCH` se `import` × fornecedor nacional (`:71-84`); nasce `status:'pending'` (`:107`). BR-SUP-003/005.
- **Classificação:** **CONFLITANTE.** `UC-15` (`04-USE_CASES.md:375-383`) descreve no fluxo principal numerado o passo 7 "Sistema altera status para **'sent'**" — o código cria **`pending`** (`CreatePurchaseUseCase.ts:107`). A seção de alçada do mesmo UC (`:408`) já assume `pending`, contradizendo o próprio fluxo numerado.

### UC-CADSUP-25 — Editar pedido de compra (congelamento pós-aprovação)
- **Gatilho:** `PUT /api/purchases/:id` (`purchases.ts:45`, `compras:operate`) → `UpdatePurchaseUseCase.ts:49-95`.
- **Invariantes:** só `pending`/`approved` editáveis (`:58-60`); `origin` escalation-only (`:70-75`); `supplier_id`/`freight_value`/`origin` congelados após `approved` (`:79-87`). BR-SUP-006.
- **Classificação:** **CONFIRMED** vs. `UC-15:429-434` (congelamento).

### UC-CADSUP-26 — Aprovar/transicionar status do pedido (alçada G11 + segregação D-K)
- **Atores:** `compras:operate` na rota — `purchases.ts:46`. **A alçada e a segregação são impostas DENTRO do use-case, no backend, não na rota.**
- **Gatilho:** `PUT /api/purchases/:id/status` → `ChangePurchaseStatusUseCase.ts:98-150`.
- **Fluxo:** máquina de estados (`:21-28`); em `→approved`: (1) **D-K segregação** `assertApproverIsNotRequester` (`:134-140`, sem isenção de admin), (2) **G11 alçada** `_assertApprovalAuthority` (`:142`, `:172-217`). BR-SUP-001/002/003/004/007.
- **Classificação:** **CONFLITANTE (crítico — mesma contradição de BR-SUP-007).** `UC-15:436-439` afirma explicitamente: "**NÃO implementado (decisão explícita do dono): segregação de função (aprovador != solicitante)**". O código **impõe** D-K em `:134-140`. Doc normativo diz que o controle não existe; o código o executa. Contradição direta entre artefatos versionados (o mesmo par plano-de-ação × código já registrado em BR-SUP-007) — resolução é humana (CLAUDE.md 20-21).

### UC-CADSUP-27 — Registrar aprovação de alçada da diretoria
- **Atores:** módulo `diretor`, **presença apenas** (nível `operate` default) — `purchases.ts:48` (`authorizeModule('diretor')`).
- **Gatilho:** `POST /api/purchases/:id/approve` → `ApprovePurchaseUseCase.ts:70-132`.
- **Fluxo:** `availableRoles` resolvido por RBAC no controller, nunca do body (`purchaseController.ts:51-55`); só enquanto `pending` (`:78-83`); D-K (`:86-92`); um papel aprova 1×.
- **Classificação:** **CONFIRMED com ressalva de nível (BR-SUP-008).** `UC-15:411` diz "usuário com o módulo de acesso `diretor`" — **bate** com a presença exigida. Mas o controller resolve o papel por truthy (`purchaseController.ts:54`), sem comparar nível; qualquer nível de `diretor` autoriza (BR-SUP-008). Sem teste dedicado.

### UC-CADSUP-28 — Consultar situação da alçada
- **Gatilho:** `GET /api/purchases/:id/approvals` — `purchases.ts:49` (`compras` OU `diretor`, `authorizeAnyModule`) → `ListPurchaseApprovalsUseCase`. **CONFIRMED** (UC-15:409).

### UC-CADSUP-29 — Receber itens do pedido (quarentena + AP G13 + sync requisição G15 + ativo F3)
- **Atores:** **`recebimento:operate`** — `purchases.ts:50` (módulo dono da ação ≠ módulo de origem; `BUSINESS_RULES.md §4`).
- **Gatilho:** `POST /api/purchases/:id/receive` → `ReceivePurchaseItemsUseCase.ts:75-256`.
- **Fluxo/invariantes:** só `sent`/`partial` (`:80-82`); NF obrigatória + idempotência `(purchase_id, invoice_number)` (`:86-112`); entrada em **quarentena** via `MaterialReceiptService` (`:181-216`); AP nasce no recebimento pelo valor recebido, `approved_by` nulo (`:307-360`, G13); sync da requisição de origem (`:388-412`, G15); imobilizado vira ativo (`:229-234`, F3).
- **Classificação:** **CONFIRMED** vs. `UC-16` (`04-USE_CASES.md:443-497`) — passivo no recebimento, quarentena, parcial, legacy skip. Roteamento de depósito (amostra→LABORATORIO) confere com `UC-39:1815-1821`.

### UC-CADSUP-30 — Registrar NF-e de entrada (fronteira fiscal)
- **Gatilho:** `POST /api/purchases/:id/nfe` — `purchases.ts:51` (`compras:operate`) → **`fiscalController.registerIncomingNfe`** (controller de outro módulo, `purchases.ts:6`).
- **Classificação:** **FANTASMA neste cluster / fronteira.** Nenhum UC de compras cobre `/nfe`; a lógica pertence a `fiscal`. É controller-a-controller cross-módulo (mesmo padrão `sales→fiscal` do `DOMAIN_MAP.md:150`). Deferir ao cluster comercial-financeiro.

### UC-CADSUP-31 — Cockpit de compras
- **Gatilho:** `GET /api/purchases/cockpit` — `purchases.ts:42` (`compras`) → `GetPurchaseCockpitUseCase`. **CONFIRMED** vs. `UC-28` (`04-USE_CASES.md:1458-1485`).
- (Leituras `GET /` e `GET /:id`, `purchases.ts:39,43` — agrupadas.)

---

## 7. `purchaseRequisitions`

### UC-CADSUP-32 — Criar requisição de compra
- **Atores:** `requisicoes:operate` — `purchaseRequisitions.ts:23`.
- **Gatilho:** `POST /api/purchase-requisitions` → `CreatePurchaseRequisitionUseCase.ts:53-120`.
- **Invariantes:** `department_id` nunca do cliente — resolvido via `Employee` do usuário (`:70-87`); `origin='engenharia_amostra'` exige justificativa em `notes` (`:54-58`); numeração `RQ-YYYY-NNNN`.
- **Classificação:** **FANTASMA (parcial).** A criação manual genérica não tem UC próprio — só é documentada pelo recorte amostra (`UC-39:1800-1809`) e pelo caminho MRP (`UC-24`, módulo `mrp`, fora do cluster).

### UC-CADSUP-33 — Aprovar/transicionar requisição (nível approve + D-K)
- **Atores:** `requisicoes:operate` na rota (`purchaseRequisitions.ts:27`); **aprovação re-checada no controller** (`purchaseRequisitionController.ts:157-162`: `admin` OU `permissions.requisicoes === 'approve'`); **D-K no use-case** (`ChangePurchaseRequisitionStatusUseCase.ts:104-110`).
- **Gatilho:** `PATCH /api/purchase-requisitions/:id/status`.
- **Classificação:** **CONFLITANTE (duplo).**
  1. `UC-23` (`04-USE_CASES.md:926,943`) afirma "Aprovação só pode ser realizada por usuário com perfil **admin**" e "403 se não for admin". O código aceita **admin OU `requisicoes:approve`** (`purchaseRequisitionController.ts:159`). Doc mais restritivo que o código. (Além disso, o próprio docstring da rota, `purchaseRequisitions.ts:16-18`, diz "o controller hoje aceita apenas admin" — comentário **stale**, contradiz o próprio controller.)
  2. `UC-23` **não menciona** a segregação D-K (aprovador ≠ solicitante), que o código **impõe** (`ChangePurchaseRequisitionStatusUseCase.ts:104-110`). Controle implementado ausente do UC. BR-SUP-007/010.

### UC-CADSUP-34 — Converter requisição aprovada em pedido(s)
- **Atores:** `requisicoes:operate` — `purchaseRequisitions.ts:28`.
- **Gatilho:** `POST /api/purchase-requisitions/:id/convert` → `ConvertRequisitionToPurchaseOrdersUseCase.ts:93-291`.
- **Invariantes:** exige `approved` (`:101-106`); só itens com saldo `pending` (`:118-124`, G12); resolve fornecedor (sugerido→preferencial→fallback) e `product_id` legado; 1 pedido por fornecedor; requisição→`ordered`.
- **Classificação:** **CONFIRMED** vs. `UC-25` (`04-USE_CASES.md:1128-1200`). Ressalvas (não-findings de doc, mas lacunas conhecidas): pedidos gerados **nascem sem `origin`→`national`** (BR-SUP-013) e **sem alçada no ato da conversão** (a alçada só age no `PUT /status`).

---

## 8. `rfq` (subsistema inteiro sem UC formal)

**Nota transversal:** o `DIAGRAMA_CASOS_DE_USO_BPMN.md:19,54` declara EXPLICITAMENTE que RFQ "não [tem] UC formal" (`UCRFQ["RFQ / Cotação multi-fornecedor (CLAUDE.md §4)"]`). Os UCs "UC-25b" são **referenciados** em `04-USE_CASES.md:954,1143` mas **nunca definidos** (grep confirmou ausência de header `## UC-25b` em ambos os docs). Todos os UCs abaixo = **FANTASMA**.

### UC-CADSUP-35 — Criar cotação (avulsa ou de requisição)
- **Atores:** `compras:operate` — `rfqs.ts:17`. **Gatilho:** `POST /api/rfqs` → `CreateRfqUseCase.ts:83-162`. XOR `requisition_id`×`items` (`rfqValidators.ts:24-27`); G12: bloqueia requisição não-cotável e itens sem saldo (`:93-116`). **FANTASMA.**

### UC-CADSUP-36 — Convidar fornecedores
- `compras:operate` — `rfqs.ts:18`; `POST /api/rfqs/:id/suppliers` → `InviteRfqSuppliersUseCase`; `supplier_ids .min(1)` (`rfqValidators.ts:39`). **FANTASMA.** BR-SUP-011 (doc de processo exige "mínimo 3 cotações"; código aceita **1**).

### UC-CADSUP-37 — Registrar cotação de fornecedor
- `compras:operate` — `rfqs.ts:19`; `POST /api/rfqs/:id/quotes` → `RegisterRfqQuoteUseCase`. **FANTASMA.**

### UC-CADSUP-38 — Mapa comparativo
- `compras` — `rfqs.ts:16`; `GET /api/rfqs/:id/comparison` → `GetRfqComparisonUseCase`. **FANTASMA.**

### UC-CADSUP-39 — Adjudicar cotação (gera pedidos, G12, realimenta catálogo)
- **Atores:** **`compras:approve`** — `rfqs.ts:20` (única escrita RFQ elevada a `approve`).
- **Gatilho:** `POST /api/rfqs/:id/award` → `AwardRfqUseCase.ts:108-379`.
- **Invariantes:** RFQ deve estar `quoted` (`:114-119`); vencedor = escolha livre de quem adjudica entre os que cotaram, **sem comparação de preço nem justificativa** (BR-SUP-012); consome saldo da requisição (G12); realimenta `item_suppliers` (`:307-337`); pedidos nascem `national` sem alçada no ato (`:277-292`).
- **Classificação:** **FANTASMA** (referenciado como "UC-25b", nunca definido). BR-SUP-011/012/013.

---

## 9. `comex`

### UC-CADSUP-40 — Registrar processo de importação (tributos)
- **Atores:** `comex:operate` — `importProcesses.ts:35`.
- **Gatilho:** `POST /api/comex/import-processes` → `CreateImportProcessUseCase.ts:62-129`. Calcula II/IPI/PIS/COFINS/ICMS na criação; nasce `draft`.
- **Classificação:** **CONFLITANTE.** `UC-19:676` documenta pré-condição "Fornecedor internacional cadastrado (`suppliers.is_foreign = true`)". O código **não verifica `is_foreign`** — `CreateImportProcessUseCase.ts:67-70` só checa existência do fornecedor. Pré-condição documentada **não imposta** no backend.

### UC-CADSUP-41 — Aprovar processo (diretoria + D-K)
- **Atores:** módulo `diretor`, **presença apenas** — `importProcesses.ts:34` (`authorizeModule('diretor')`).
- **Gatilho:** `POST /:id/approve` → `ApproveImportProcessUseCase.ts:65-114`. Só em `draft` (`:74-79`); D-K contra `created_by` (`:82-88`); papel por RBAC (`importProcessController.ts:53-57`).
- **Classificação:** **CONFLITANTE (nível — BR-SUP-008/014).** `UC-19:684` afirma "por usuário com **`diretor:approve`**". A rota usa `authorizeModule('diretor')` sem nível → exige apenas **presença** do módulo (qualquer nível), não `approve` (`auth.ts:272` só discrimina quando `requiredLevel==='approve'`). Doc superestima a imposição.

### UC-CADSUP-42 — Situação da alçada COMEX
- `GET /:id/approvals` — `importProcesses.ts:33` (`comex` OU `diretor`) → `ListImportProcessApprovalsUseCase`. **CONFIRMED** (UC-19).

### UC-CADSUP-43 — Registrar acompanhamento (gate G11-COMEX no embarque)
- **Atores:** `comex:operate` na rota — `importProcesses.ts:36`. **Gate imposto no backend, no use-case.**
- **Gatilho:** `POST /:id/tracking` → `RegisterImportTrackingUseCase.ts:79-120`.
- **Invariantes:** transição sequencial `draft→shipped→arrived→customs_cleared` (`:85-91`); no `shipped`: exige aprovação da diretoria (`:98-99,135-147`) e **congela** câmbio/frete/seguro/despesas (`:100,171-182`, BR-SUP-015). BR-SUP-014.
- **Classificação:** **CONFIRMED** vs. `UC-19:682-689,727-729`.

### UC-CADSUP-44 — Receber importação (nacionaliza, quarentena G14)
- `comex:operate` — `importProcesses.ts:37`; `POST /:id/receive` → `ReceiveImportProcessUseCase.ts:111-201`. Exige `customs_cleared` (`:117-122`); entra em quarentena pelo mesmo `MaterialReceiptService` da compra (`:166-192`, G14); depósito `INSUMOS`; **não gera AP** dos tributos (pendência G13 declarada). **CONFIRMED** vs. `UC-19:690-697,730-786`.

### UC-CADSUP-45 — Cancelar processo de importação
- `comex:operate` — `importProcesses.ts:38`; `POST /:id/cancel` → `CancelImportProcessUseCase`. **FANTASMA (parcial):** `UC-19` cita o status `cancelled` na máquina de estados (`:728`) mas não documenta o fluxo/ator/pré-condição do cancelamento.

---

## OBSOLETE_CANDIDATE

| Artefato | Evidência | Situação |
|---|---|---|
| **`ApproveBOMUseCase.ts`** (70 linhas, **testado**) | `bom.ts:19-33` não monta nenhuma rota `/approve`; a ativação da BOM ocorre na criação (`CreateBOMUseCase`/`BomService.createBOM`, BR-CAD-014) | Use-case sem rota HTTP alcançável. Implementação duplicada da ativação, com uma perna inatingível. `bom/README.md:61,208-211` confirma. |
| **`item_estruturas` / `ExplodeItemStructureUseCase`** (UC-CADSUP-05) | escrita bloqueada por `CreateItemStructureUseCase.ts:79-92`; leitura ainda exposta em `items.ts:19` | Fonte de estrutura aposentada pelo G1; endpoint lê árvore que o resto do sistema não consome. |
| **`UC-11` passo 8 (eSocial S-2200) e "exame admissional obrigatório"** | `04-USE_CASES.md:259,264`; sem integração/enforcement no cluster | UC de doc com passos/regras sem código correspondente (confiança MÉDIA — verificar). |
| **`UC-03` regras "preço venda > custo" e "qtd mínima 5"** | `04-USE_CASES.md:67-68`; não confirmadas em `CreateProductUseCase` nesta rodada | UC de doc com regras não evidenciadas no código (verificar). |

---

## Contagem por classificação

| Classificação | Qtd | UCs |
|---|---|---|
| **CONFIRMED** | 10 | 04(deprec.), 06-10(grupo, =1), 14, 15, 21→22? … detalhado: 04, 06-10, 14, 16-parcial(15), 22, 23(grupo BOM), 25, 28, 29, 31, 34, 42, 43, 44 |
| **CONFLITANTE** | 9 | 06-10(ator), 17, 19, 20, 21, 24, 26, 33, 40, 41 |
| **FANTASMA** | 15 | 01, 02, 03, 05, 11, 12, 13, 16, 18, 30, 32, 35, 36, 37, 38, 39, 45 |
| **OBSOLETE_CANDIDATE** | 4 | ApproveBOMUseCase; item_estruturas/explode; UC-11 eSocial; UC-03 regras |

(Alguns UCs contam em duas colunas por terem eixo CONFIRMED + ressalva CONFLITANTE menor — ex.: 06-10 confirmam UC-22 no fluxo mas conflitam no ator. A tabela prioriza o eixo dominante; a íntegra está por UC acima.)

**Cobertura de campos mínimos (§20 Master Spec):** todo UC recuperado tem veredito por ator, gatilho, fluxo principal, exceções e pré/pós — com arquivo:linha. Campos que a DOC deveria conter e não tem (ID padronizado, atores corretos, regras, testes vinculados) são justamente o insumo dos candidatos abaixo.

## Candidatos a finding (NÃO promovidos — seguem ao passo 31)

1. **[CRÍTICO/CONFLITANTE] Segregação D-K documentada como INEXISTENTE, imposta no código** — UC-CADSUP-26 vs. `UC-15:436-439`; código em `ChangePurchaseStatusUseCase.ts:134-140`. Contradição entre artefatos versionados (converge com BR-SUP-007). Fonte autoritativa indeterminável — decisão humana (CLAUDE.md 20-21).
2. **[ALTO/CONFLITANTE] Aprovação de requisição: doc exige `admin`, código aceita `requisicoes:approve`; D-K omitido no UC** — UC-CADSUP-33 vs. `UC-23:926,943`; `purchaseRequisitionController.ts:159` + comentário stale em `purchaseRequisitions.ts:16-18`. BR-SUP-010.
3. **[ALTO/CONFLITANTE] Alçada `diretor` — doc reivindica nível `approve`, backend exige só PRESENÇA do módulo** — UC-CADSUP-27/41 vs. `UC-19:684`; `auth.ts:272` + controllers `resolveAvailableApproverRoles` (truthy). BR-SUP-008. Permissão declarada ≠ imposta (núcleo do meu mandato). Sem teste.
4. **[MÉDIO/CONFLITANTE] Pré-condição COMEX "fornecedor is_foreign=true" não imposta** — UC-CADSUP-40; `CreateImportProcessUseCase.ts:67-70` não checa `is_foreign`. BR-CAD-002 (contradição de modelo).
5. **[MÉDIO/CONFLITANTE] Mínimo de 3 cotações documentado, código aceita 1; adjudicação sem competitividade** — UC-CADSUP-36/39; `rfqValidators.ts:39` (`.min(1)`), `AwardRfqUseCase` (escolha livre). BR-SUP-011/012 (a divergência valor-documentado × valor-implementado mais limpa do cluster).
6. **[MÉDIO/FANTASMA] Subsistema RFQ inteiro sem UC formal** — UC-CADSUP-35..39; BPMN admite (`:19,54`), "UC-25b" citado e nunca definido. Comportamento financeiro (gera pedidos) sem caso de uso — §19/§20 Master Spec.
7. **[MÉDIO/FANTASMA] Crosswalk item→produto-gêmeo (invariante central) sem UC** — UC-CADSUP-01; `CreateItemUseCase.ts:51`. BR-CAD-009. Toda a cadeia RFQ/requisição/COMEX depende dele e nenhum UC o descreve.
8. **[MÉDIO/CONFLITANTE] Fluxo numerado de UC-15 diz status inicial 'sent'; código cria 'pending'** — UC-CADSUP-24; `CreatePurchaseUseCase.ts:107` vs. `04-USE_CASES.md:382`.
9. **[BAIXO/CONFLITANTE] UC-09 restringe a admin; código permite operator** — UC-CADSUP-17; `categories.ts:14-15`.
10. **[BAIXO/OBSOLETE] `ApproveBOMUseCase` testado e sem rota; `explode` de item lê estrutura aposentada** — ver OBSOLETE_CANDIDATE.
11. **[A VERIFICAR] UC-11 (eSocial/exame) e UC-03 (preço>custo, qtd min 5)** — passos/regras de doc sem código evidenciado (confiança MÉDIA — cadastros rasos, não aprofundados nesta rodada).

---

*Produzido por trilha `vericore-use-case-auditor` (passo 28, ERP-LEGACY-001) em modo read-only reforçado — Read/Grep/Glob apenas; sem Bash, sem banco, sem execução; produção real (`items`,`categories`,`departments`) lida só por código-fonte. Todo item é DISCOVERED_USE_CASE até validação humana. Persistência por vericore-audit-evidence-controller/orquestrador; sem edição de conteúdo.*
