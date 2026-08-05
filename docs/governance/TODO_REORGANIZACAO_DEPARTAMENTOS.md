# TODO — Reorganização de Menu por Departamento + Classificação de Item

Origem: sessão de trabalho de 2026-08-05 com o dono do produto, revisando
o menu lateral do ERP e a modelagem de `Item`/`Asset`/documento fiscal.
Proposta visual completa (com comparativos "hoje vs proposto" e validação
contra prática de mercado) publicada como artifact — este documento é a
versão persistente/executável da mesma decisão, para sobreviver a queda de
sessão. Este documento **não implementa nada** — quebra a decisão em
blocos técnicos que os agentes programadores/DBA/frontend devem puxar, na
ordem sugerida. Ao concluir cada bloco, atualizar `docs/HANDOFF_CODEX.md`
e marcar aqui.

**Status das decisões de negócio:** todas as decisões abaixo foram
confirmadas pelo dono nesta sessão (2026-08-05) — implementação pode
iniciar sem bloqueio de negócio adicional.

---

## Contexto e decisões (resumo para quem não viu a conversa original)

### 1. Menu hoje mistura departamentos que deveriam ser um só, e separa o que deveria estar junto

- "Logística" (Estoque/Recebimento/Expedição/Depósitos) e "Operações"
  (13 itens, incluindo "Produtos e estoque" solto) são hoje duas seções
  do menu — deveriam ser uma seção só, "Logística", seguindo o fluxo
  físico do material.
- "Requisições" fica em Operações, longe de "Compras" — decisão do dono:
  cada departamento deve ter **sua própria** requisição (Logística,
  Produção, Manutenção, Qualidade cada uma com a sua), não uma fila
  única. Compras centraliza só a **aprovação/cotação**.
- "Relatórios" é 1 item genérico dentro de Operações — decisão do dono:
  cada departamento tem seu próprio relatório com as opções da área
  (o backend já tem os módulos `relatorios.producao/compras/custos/financeiro`
  separados — é trabalho de frontend redistribuir, não schema novo).
- "Patrimônio" está espremido no meio de itens de produção — decisão do
  dono: vira **dois departamentos novos**, Manutenção (conserto de
  máquina interna) e Ativos & Garantia (Patrimônio + o que hoje é
  `ServiceOrder`, renomeado no menu para "Garantia/Assistência Técnica" —
  já é o fluxo de produto vendido que volta com defeito, só sem menu).

### 2. Cadastro de item precisa diferenciar destino, não só tipo produtivo

- Hoje `Item.type` só tem `MATERIA_PRIMA`/`SUBCONJUNTO`/`PRODUTO_ACABADO`
  — giram todos em torno do que vira o alto-falante. Luva de proteção,
  item de limpeza (uso e consumo/MRO) não tem categoria própria — seria
  cadastrado como matéria-prima por falta de opção, poluindo BOM/MRP.
- Decisão do dono: tudo passa fisicamente pela mesma porta (Recebimento
  de Logística), mas o **destino** (estoque produtivo, estoque de
  consumo, ou vira um Ativo) precisa vir decidido desde o cadastro do
  item, não decidido na hora do recebimento.
- Validado contra prática de mercado (SAP/item master data): a separação
  Direct Material / MRO / Capital Asset é o padrão da indústria — MRO
  fica fora do BOM e é contabilizado separado de COGS.

### 3. Ativo com defeito (comprado) precisa de devolução — regra unificada com Compras no centro

- Investigação de código: `NonConformity` já tem `origin: 'incoming'`,
  `supplier_id`, `purchase_item_id`, e `immediate_action: 'return_supplier'`
  já é uma opção válida do enum — o **registro** já existe para qualquer
  item comprado.
- Gap real: escolher `return_supplier` hoje só grava o texto, nenhum
  código reage — não estorna estoque, não notifica ninguém, não atualiza
  score de fornecedor.
- Decisão do dono (correção sobre a primeira proposta): a tratativa da
  devolução deve abrir **direto na fila de Compras** como item de
  trabalho, não como badge informativo — Qualidade decide *que* devolver,
  Compras decide *como* resolver com o fornecedor (crédito, reposição,
  cancelamento), qualquer que seja o tipo do item devolvido.
- Ativo (`Asset`) não tem hoje como ser vinculado a uma NC —
  `NonConformity.product_id` só aponta para `products`.
- Validado contra prática de mercado (RMA/QMS): disposição (devolver/
  retrabalhar/sucatear) deve acionar a ação seguinte sem handoff manual,
  e conectar ao histórico de qualidade do fornecedor — exatamente o
  desenho proposto.

### 4. Produto digital não é "sem processo" — é processo diferente, não o de Recebimento físico

- Decisão do dono: "produto digital" cobre licença/software comprado,
  arquivo técnico gerado internamente (desenho/firmware), e serviço
  contratado. Os três não passam pela porta física de Recebimento.
- Correção do dono sobre a proposta original: digital não é "sem nota
  fiscal" — é **NFS-e** (nota de serviço) em vez de NF-e (mercadoria).
- Validado contra prática de mercado: (a) licença perpétua/multianual de
  alto valor é capitalizada como intangível — mesmo tratamento de Ativo
  físico; assinatura/SaaS de curto prazo é despesa operacional imediata,
  **não** deveria virar registro de Patrimônio (correção sobre a proposta
  original, que tratava todo software igual); (b) NFS-e é municipal
  (ISS), sem layout nacional único, diferente do NF-e estadual
  padronizado (SINIEF) — mas como a EVOK só **recebe** (não emite) NFS-e
  de fornecedor, o escopo real é classificação em Contas a Pagar, não
  integração de emissão.

---

## Bloco A — Schema (AdmDBA) ✅ CONCLUÍDO (2026-08-05)

Nenhum bloco de frontend/backend de aplicação deve começar antes destas
migrations existirem — os demais blocos dependem dos campos abaixo.

Detalhe completo (migrations criadas, decisões técnicas, desvios) em
[`docs/HANDOFF_CODEX.md`](../HANDOFF_CODEX.md), seção "Bloco A — Schema:
classificação de item + ativo/licença + NF-e/NFS-e + módulos RBAC
(2026-08-05)". Todas as migrations abaixo já foram aplicadas no Postgres
local; `tsc --noEmit` e `test:unit` passam limpos.

- [x] `Item.type` — adicionado `USO_E_CONSUMO` e `ATIVO_IMOBILIZADO` ao
  enum existente (`MATERIA_PRIMA`, `SUBCONJUNTO`, `PRODUTO_ACABADO`) via
  `20260805-000001-add-item-tipo-uso-consumo-ativo.cjs`
  (`ALTER TYPE "item_tipo" ADD VALUE`, mesmo padrão de
  `add-quarantine-lot-status`/`add-shipped-sale-status`). Sem backfill.
- [x] `Asset.asset_type` — adicionado `license` ao enum existente via
  `20260805-000002-add-asset-type-license.cjs`.
- [x] `Asset` — adicionados `license_expires_at` (DATEONLY nullable) e
  `purchase_item_id` (INTEGER nullable, FK →
  `purchase_order_items.id` — nome real da tabela, TODO citava
  `purchase_items` — `ON DELETE SET NULL`) via
  `20260805-000003-add-asset-license-and-purchase-item.cjs`.
- [x] `PurchaseRequisition.department_id` — **já existia** desde a
  migration original da tabela (`20260802-000002-purchase-requisitions.cjs`),
  coluna + FK + model já prontos. Nenhuma migration nova criada. Backfill
  não realizado (8 requisições locais com `department_id` NULL) — decisão
  de negócio/aplicação, não de schema; fica para o Bloco C preencher daqui
  para frente.
- [x] `AccountPayable` e `Purchase` — adicionado `invoice_type` ENUM
  `('nfe', 'nfse')` nullable em ambas via
  `20260805-000004-add-invoice-type-payable-and-purchase.cjs`. Sem
  backfill.
- [x] `NonConformity` — adicionado `asset_id` (INTEGER nullable, FK →
  `assets.id`, `ON DELETE SET NULL`) via
  `20260805-000005-add-asset-id-non-conformities.cjs`.
- [x] Adicionados `manutencao` e `garantia` ao catálogo de módulos em
  `server/src/shared/domain/accessModules.ts` (`AccessModuleKey` + lista
  ordenada com label pt-BR, entre `patrimonio` e `rastreabilidade`).
  Confirmado que não há CHECK constraint de `module` no Postgres
  (validação só em código via `isValidAccessModuleKey`), então não havia
  nada além do catálogo TypeScript para alterar.

## Bloco B — Backend: consequência real da devolução ao fornecedor ✅ CONCLUÍDO (2026-08-05)

Depende do Bloco A (`asset_id` em `NonConformity`).

Detalhe completo em [`docs/HANDOFF_CODEX.md`](../HANDOFF_CODEX.md), seção
"Bloco B — Backend: consequência real da devolução ao fornecedor
(2026-08-05)". `tsc --noEmit` e `test:unit` (473 testes) passam limpos.

- [x] Ao criar/atualizar `NonConformity` com
  `immediate_action = 'return_supplier'`: dependendo do tipo do item
  (via `purchase_item_id` → `PurchaseItem.item_id` → `Item.tipo`),
  dispara (a) para item produtivo/uso-consumo (`MATERIA_PRIMA`/
  `SUBCONJUNTO`/`PRODUTO_ACABADO`/`USO_E_CONSUMO`): `InventoryMovement`
  tipo `out` (`reference_type: 'purchase'`, reaproveitado — sem novo
  valor de enum) via `InventoryService.consume`, estornando a entrada
  original; (b) para `ATIVO_IMOBILIZADO`/RNC com `asset_id`: atualiza
  `Asset.status`. **Decisão sobre o status do Asset devolvido:** criado
  valor novo `returned_to_supplier` no enum `enum_assets_status`
  (migration `20260805-000006-add-asset-status-returned-to-supplier.cjs`)
  em vez de reaproveitar `lost` — `lost` é semanticamente incorreto para
  um ativo com fornecedor e processo de RMA conhecidos (não é extravio).
  Lógica centralizada em `SupplierReturnHandler.applySupplierReturn`
  (compartilhada por Create/Update), chamada na MESMA transação da RNC;
  em `Update`, só dispara na TRANSIÇÃO para `return_supplier` (evita
  reestornar a cada PUT subsequente).
- [x] Score de qualidade do fornecedor: já era recalculado por
  `CreateNonConformityUseCase.recalculateSupplierQualityScore` (item 8,
  2026-08-03) para qualquer RNC cujo lote referenciado tenha
  `supplier_id` — cobre também RNCs de devolução sem lógica adicional
  (mesma fórmula `MAX(0, 100 - rncs/receipts*100)`); testado
  explicitamente no cenário de devolução em
  `non-conformity-supplier-return.test.ts`.
- [x] Handoff de Compras: novo bloco `compras.pending_returns` em
  `GET /api/dashboard/handoffs` (`GetDashboardHandoffsUseCase`,
  `SequelizeDashboardRepository.getHandoffsSummary`) — conta RNCs com
  `immediate_action = 'return_supplier'` e `status NOT IN
  ('closed','canceled')`. Backend expõe o contador; frontend
  (`badgeKey` novo em `AppLayout.tsx`) fica para o Bloco E, conforme
  escopo desta tarefa (não tocar frontend).
- [x] Testes unitários (`server/tests/unit/non-conformity-supplier-return.test.ts`,
  `server/tests/unit/dashboard-handoffs-repository.test.ts`) cobrindo:
  devolução de item produtivo/uso-consumo estorna estoque; devolução sem
  vínculo suficiente não estorna nada (no-op); devolução de ativo muda
  status (idempotente — segunda RNC no mesmo ativo já devolvido não
  reabre o estorno); score de fornecedor é recalculado a partir de
  devolução real; transição de `immediate_action` via `Update` aciona o
  handler (e não duplica se já era `return_supplier`); contador de
  handoff de Compras reflete devoluções pendentes.

## Bloco C — Backend: requisição por departamento ✅ CONCLUÍDO (2026-08-06)

Depende do Bloco A (`department_id`).

- [x] `CreatePurchaseRequisitionUseCase` passa a preencher
  `department_id` a partir do departamento do `Employee` vinculado ao
  usuário autenticado (mesmo padrão já usado para outros campos
  derivados do JWT, não confiar em campo enviado pelo cliente). Resolve
  via `Employee.findOne({ where: { user_id: requester_id } })` — usa
  `requester_id` (já vem do JWT no controller) para achar o `Employee`
  vinculado e ler `department_id`. Campo `department_id` removido do
  schema Zod de criação (`createPurchaseRequisitionSchema`) para não
  aceitar mais valor vindo do cliente (mesmo raciocínio anti-spoofing já
  usado em `requester_id`/`approved_by`). Se o usuário autenticado não
  tiver `Employee` vinculado, `department_id` fica `null` — requisição
  ainda é criada normalmente.
- [x] Endpoint de listagem de requisições aceita filtro por
  `department_id` via query param (`GET /api/purchase-requisitions?department_id=`),
  para as telas por departamento do Bloco E. Adicionado em
  `listPurchaseRequisitionQuerySchema`, `ListPurchaseRequisitionsUseCase`
  e `SequelizePurchaseRequisitionRepository.listRequisitions` (filtro de
  leitura, sem risco de spoofing).
- [x] Testes cobrindo o preenchimento automático e o filtro — novo arquivo
  `server/tests/unit/purchase-requisition-department.test.ts` (preenchimento
  a partir do usuário logado, valor do cliente ignorado, `null` quando sem
  `Employee` vinculado, filtro repassado ao repositório, filtro ausente não
  quebra). Teste existente `engineering-sample-requisition.test.ts` ajustado
  para mockar `Employee` também (novo `require` no use case). `npx tsc
  --noEmit` limpo e `npm run test:unit` 461/461 passando.

## Bloco D — Backend: retrofit RBAC de Manutenção e Garantia ✅ CONCLUÍDO (2026-08-05)

Depende do Bloco A (`manutencao`/`garantia` no catálogo de módulos).

- [x] `server/src/modules/maintenance/presentation/routes/maintenance.ts`
  — trocado `authorize('admin', 'operator')`/`authorize('admin')` por
  `authorizeModule('manutencao', 'operate')`/`authorizeModule('manutencao', 'approve')`,
  mesmo padrão já aplicado a todos os outros módulos do sistema de
  perfis por área (`server/src/modules/assets/presentation/routes/assets.ts`
  usado como referência direta de como foi feito para Patrimônio). GET
  passa a exigir `authorizeModule('manutencao')` (nível de leitura
  implícito).
- [x] `server/src/modules/serviceOrders/presentation/routes/serviceOrders.ts`
  — mesmo retrofit, usando `authorizeModule('garantia', ...)`.
- [x] Testes de regressão RBAC em
  `server/tests/integration/rbac-maintenance-service-orders-access-denied.test.ts`
  (seguindo o padrão de `rbac-module-access-denied.test.ts`): usuário
  `operator` com `AccessProfile` sem os módulos `manutencao`/`garantia`
  recebe 403 `MODULE_ACCESS_DENIED` em GET/POST/PUT/DELETE de
  `/api/maintenance` e `/api/service-orders`, sem side-effects; admin
  segue autorizado. 10/10 testes passando via
  `npm run test:integration:strict`. `npx tsc --noEmit` e
  `npm run test:unit` (456/456) também passando.

## Bloco E — Frontend: menu reorganizado ✅ CONCLUÍDO (2026-08-05)

Depende dos Blocos A/C/D estarem prontos o suficiente para as telas terem
dados reais para exibir (department_id, permissões). Pode começar em
paralelo assim que o Bloco A estiver aplicado, mesmo que B/C/D ainda não
tenham terminado — usar dado mock/vazio até o backend fechar.

Detalhe completo (decisões técnicas, componentes criados) em
[`docs/HANDOFF_CODEX.md`](../HANDOFF_CODEX.md), seção "Bloco E — Frontend:
menu reorganizado (2026-08-05)". `npx tsc --noEmit` (client e server),
`npm run lint` (oxlint, só warnings pré-existentes) e `npx vitest run`
(45/45) passam limpos; `test:unit` do server (473/473) também.

- [x] Reestruturado `NAV_SECTIONS` em `client/src/layouts/AppLayout.tsx`
  seguindo o menu final: Logística (Produtos + Estoque + Depósitos +
  Recebimento + Expedição + Requisições-de-Logística +
  Relatórios-de-Logística), Vendas, Compras (+ Fornecedores + Fila de
  aprovação + Relatórios-de-Compras), Produção (+ Chão de Fábrica +
  Centros de Trabalho + MRP + Requisições-de-Produção +
  Relatórios-de-Produção), Qualidade & Engenharia, Manutenção (novo),
  Ativos & Garantia (novo, Patrimônio + Garantia/Assistência Técnica),
  Gestão (Financeiro + Relatórios Financeiros + Rastreabilidade),
  Administração.
- [x] Adicionada rota `/maintenance` (ligada a `MaintenanceOrdersTab`,
  export nomeado — `App.tsx` faz `.then(m => ({ default: m.MaintenanceOrdersTab }))`
  no `lazy()`) e `/service-orders` (ligada a `ServiceOrdersTab`, mesmo
  padrão), renomeada no menu para "Garantia / Assistência Técnica". Ambas
  guardadas por `ModuleRoute` (`manutencao`/`garantia`).
- [x] `ReportsPage.tsx` mantido como página única com abas + deep-link
  `?tab=production|purchasing|costs|financial` — decisão técnica
  documentada no próprio arquivo: os relatórios compartilham quase todo o
  layout, então 3-4 páginas seria duplicação; cada aba se auto-filtra pelo
  módulo de RBAC correspondente (`relatorios.producao/compras/custos/financeiro`),
  e cada seção do menu linka direto para a aba certa. Adicionada 4ª aba
  "Financeiro" (fluxo de caixa agregado, `GET /api/reports/cash-flow`, que
  já existia no backend mas não tinha consumidor no frontend). Rota
  `/reports` trocou de `ModuleRoute` (só `relatorios.producao`) para o
  novo `AnyModuleRoute` (`client/src/routes/ProtectedRoute.tsx`) — libera
  se o usuário tiver QUALQUER um dos 4 módulos de relatório.
- [x] Cadastro de item: `ProductsPage.tsx` ganhou uma segunda aba interna
  "Uso e consumo / Ativo" (`UsageItemsTab.tsx`, novo componente) que usa o
  `Item` mestre (`/api/items`, não o `Product` legado — `Product.product_type`
  não tem os 2 valores novos) com seletor para `USO_E_CONSUMO`/
  `ATIVO_IMOBILIZADO`, mantendo a aba principal (matéria-prima/subconjunto/
  produto acabado) sem poluição. **Correção de backend necessária e feita
  dentro deste bloco**: `itemValidators.ts` (`createItemSchema`/
  `listItemsQuerySchema`) ainda tinha o enum `tipo` desatualizado (só 3 dos
  5 valores do Bloco A) — sem essa correção o cadastro seria rejeitado com
  400 mesmo com o schema do banco já aceitando os 2 valores novos desde
  2026-08-05.
- [x] Requisição por departamento: criado componente compartilhado
  `DepartmentRequisitionsPage` (`client/src/pages/shared/`) + 4 páginas
  finas (`LogisticsRequisitionsPage`/`ProductionRequisitionsPage`/
  `MaintenanceRequisitionsPage`/`QualityRequisitionsPage`), cada uma
  filtrando automaticamente por `department_id` via novo hook
  `useMyDepartment` (`client/src/hooks/useMyDepartment.ts`). O hook resolve
  o departamento chamando `GET /api/employees?user_id=<id>` — **pequena
  adição de backend necessária**: `user_id` não era um filtro aceito por
  `ListEmployeesUseCase`/`SequelizeEmployeesRepository.findAndCountAll`
  (só `department_id`/`status`/`search`); adicionado como filtro de leitura
  simples, sem risco de spoofing (mesmo raciocínio já documentado para
  `department_id` em `purchaseRequisitionValidators.ts`, Bloco C). A fila
  de aprovação/conversão em pedido de compra continua central em Compras
  (`RequisitionsPage.tsx`, inalterada) — as 4 telas novas são só
  criação/acompanhamento pelo solicitante do departamento.
- [x] Atualizado `BREADCRUMBS` em `AppLayout.tsx` para todas as rotas
  novas/movidas (inclusive Produtos passando a aparecer sob "Logística" no
  breadcrumb) e `ProtectedRoute.test.tsx` com 3 testes novos cobrindo
  `ModuleRoute` (bloqueia/libera `/maintenance` por perfil) e o novo
  `AnyModuleRoute` (libera `/reports` com apenas 1 dos módulos de
  relatório).
- [x] Extras não pedidos explicitamente mas necessários para o menu fechar
  sem quebrar nada: `AccessModuleKey` do frontend
  (`client/src/api/accessProfiles.ts`) estava desatualizado (faltavam
  `manutencao`/`garantia`, já existentes no backend desde o Bloco A) —
  sincronizado; `DashboardHandoffsSummary` ganhou `compras.pending_returns`
  (o Bloco B já expunha o contador no backend e deixou o badge explicitamente
  para este bloco) — novo badge no item "Compras" do menu
  (`badgeKey: 'compras_devolucoes'`).

## Bloco F — Frontend: NF-e/NFS-e e licença de Ativo ✅ CONCLUÍDO (2026-08-05)

Depende do Bloco A.

Detalhe completo em [`docs/HANDOFF_CODEX.md`](../HANDOFF_CODEX.md), seção
"Bloco F — Frontend: NF-e/NFS-e e licença de Ativo (2026-08-05)".

- [x] Tela de Contas a Pagar ganha seletor `invoice_type` (nfe/nfse) —
  campo simples, sem tentar integrar layout de prefeitura nenhum (fora
  de escopo, ver seção 4 do contexto acima). Coberto também no backend:
  o schema Zod, a entidade e o use case de criação de conta a pagar não
  aceitavam `invoice_type` ainda (só o schema/coluna do Bloco A existia)
  — adicionado passthrough mínimo para o campo não ficar "morto" na UI.
- [x] Cadastro de Ativo ganha campo `license_expires_at` quando
  `asset_type = 'license'`, e exibe alerta de vencimento próximo. Decisão
  técnica: **não** reaproveitado `DidacticAlert` (é voltado a erros de
  mutation com ação corretiva, `error.reasons`/`error.action`) — usado um
  `Badge` simples (`warning`/`destructive`) direto na coluna "Licença" da
  tabela, mais direto para um aviso informativo de prazo por linha.
  `purchase_item_id` exibido como texto somente-leitura ("Origem: compra
  #N") abaixo da tag, sem campo editável no formulário (conforme decisão
  do Bloco A).

---

## Ordem de execução recomendada

1. Bloco A (schema — tudo mais depende dele)
2. Bloco D (RBAC de Manutenção/Garantia — pequeno, desbloqueia o menu)
3. Bloco B e Bloco C em paralelo (backend, não colidem em arquivos)
4. Bloco E (frontend — menu, telas por departamento)
5. Bloco F (frontend — pode ser paralelo ao E, arquivos diferentes)

## Ponto em aberto (não bloqueante)

- Decisão de qual status usar para `Asset` devolvido ao fornecedor
  (reaproveitar `lost` vs. criar `returned_to_supplier`) fica para o
  agente do Bloco B decidir e documentar — não é uma decisão de negócio
  pendente, é detalhe de implementação.
