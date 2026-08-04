# TODO de Governança — Controle de Acesso por Área + Fluxos Complementares

Origem: `docs/business/01-USE_CASES.md` (UC-30 a UC-43) e
`docs/business/BUSINESS_RULES.md`. Este documento **não implementa nada**
— apenas quebra os requisitos em tarefas técnicas que os agentes
programadores/DBA/QA devem puxar, na ordem sugerida (dependências
indicadas). Ao concluir cada bloco, o programador deve atualizar
`docs/HANDOFF_CODEX.md` e consolidar os casos de uso implementados em
`docs/projeto/04-USE_CASES.md`.

**Status das decisões de negócio:** as 6 decisões antes propostas foram
**confirmadas pelo dono em 2026-08-03** (ver seção "Decisões do Dono —
Todas Confirmadas" ao final deste documento e o topo de
`01-USE_CASES.md`) — implementação pode iniciar sem bloqueio de negócio.
Único ponto ainda em aberto (não bloqueante) é UC-40 (ver rodapé).

---

## Bloco 1 — Perfis de Acesso Configuráveis (UC-30 a UC-38)

### 1.1 AdmDBA — Schema

- [x] Criar migration `access_profiles` (id, `nome` único, `descricao`,
  `active` boolean default true, timestamps). **Desvio decidido nesta
  entrega:** `criado_por` FK `users` **não** foi criada (não estava no
  escopo repassado pelo DBA para esta migration); `allowed_warehouses`
  JSONB nullable foi adicionado (decisão já registrada em
  `BUSINESS_RULES.md` §12/UC-42, lista simples de depósitos permitidos).
  Ver `server/migrations/20260803-000008-create-access-profiles.cjs`.
- [x] Criar migration `access_profile_permissions` (id, `access_profile_id`
  FK CASCADE, `module` VARCHAR(50), `level`, unique
  `(access_profile_id, module)`, índice em `access_profile_id`).
  **Desvio decidido nesta entrega:** `level` restrito ao ENUM
  `('operate','approve')` — não `none|view|operate|approve`. A ausência
  de linha já representa `none`, e a presença da linha já implica `view`
  implícito; `approve` inclui `operate`. Simplifica a modelagem sem
  perder nenhuma regra de `BUSINESS_RULES.md` §1/§4.
- [x] Adicionar `access_profile_id` (FK nullable, `ON DELETE SET NULL`)
  em `users`. **Pendente/fora de escopo desta migration:**
  `access_level` (`operador`/`gestor`) — a segunda trava de §4 para
  ações de `approve` **não foi criada nesta entrega**; fica registrada
  como próxima tarefa de schema antes do middleware `authorizeModule`
  (Bloco 1.2) poder aplicar a fórmula completa de autorização.
- [ ] **NÃO obrigatório nesta entrega** — `permission_version` (campo
  análogo a `password_version`, que invalidaria a sessão na troca de
  perfil): **decisão do dono foi "vale no próximo login, sem derrubar a
  sessão ativa"** (UC-36) — este campo **não deve ser criado** neste
  bloco. Fica registrado apenas como **melhoria futura opcional**, a ser
  avaliada em sprint separada caso o negócio queira, no futuro, forçar
  consistência imediata de sessão/menu. Não bloqueia nem faz parte do
  escopo atual do Bloco 1.
- [x] Seed inicial. **Desvio decidido nesta entrega:** em vez dos 11
  perfis de departamento completos da matriz de `BUSINESS_RULES.md` §1
  (que dependem de decisão de produto/UX sobre nomes exatos e ainda tem
  a pendência de RH em aberto), a migration semeia apenas o perfil de
  referência **"Administrador Geral"** (todos os módulos em `approve`,
  **não atribuído a nenhum usuário** — o admin global já opera acima do
  sistema de perfis, §3). O seed dos 11 perfis operacionais de
  departamento fica para uma tarefa futura (Bloco 1.2/CRUD de perfis ou
  nova migration de seed), quando a matriz completa (incluindo RH) for
  validada.
- [x] Backfill: **nenhum usuário existente recebeu `access_profile_id`**
  — a coluna nasce `NULL` por padrão (`addColumn` sem `defaultValue`) e
  não há UPDATE de backfill na migration, cumprindo a decisão do dono
  (UC-35-Exceção: bloqueio total, sem perfil provisório). Script de
  validação SQL dedicado não foi criado nesta entrega (a garantia é
  estrutural — a coluna é adicionada sem preenchimento — mas o padrão
  `*_validation.sql` do projeto pode ser adicionado como follow-up se o
  time de QA/DBA quiser uma checagem formal pós-deploy).

### 1.2 Backend — Middleware e Endpoints

- [x] Criar middleware `authorizeModule(moduleKey, requiredLevel = 'operate')`
  em `server/src/middlewares/auth.ts` (aditivo — `authenticate`/`authorize`
  existentes preservados sem alteração de assinatura, compõe em camada,
  conforme risco documentado em `BUSINESS_RULES.md` §8). **Desvio de
  arquitetura decidido pelo orquestrador nesta entrega**, substituindo o
  desenho original deste item: a coluna `users.access_level`
  (`operador`/`gestor`) mencionada no Bloco 1.1 **não foi criada** (fora de
  escopo — este agente não altera migrations) e **não é necessária**: o
  nível gestor/operador de um usuário dentro de uma área passou a morar no
  **perfil**, não no usuário — uma linha de `AccessProfilePermission` com
  `level = 'approve'` no módulo já caracteriza "gestor daquele módulo";
  `level = 'operate'` caracteriza "operador". `approve` inclui `operate`;
  `operate` isolado nunca autoriza uma ação que exija `approve`. Ver JSDoc
  de `authorizeModule` para o detalhamento completo da decisão.
  - [x] Curto-circuito: `req.user.role === 'admin'` sempre libera (§3)
  - [x] Resolve o módulo dono da ação (não o módulo de origem do dado —
    UC-37 cenário "Qualidade libera lote do Recebimento") — o `moduleKey`
    é sempre passado explicitamente pela rota que declara `authorizeModule`.
  - [x] Para ações que exigem `approve`: checa `permissions[module] ===
    'approve'` (fórmula adaptada de `BUSINESS_RULES.md` §4 à decisão
    acima — não há segunda checagem de `access_level` de usuário, pois o
    nível já é resolvido pelo `level` da permissão do perfil).
  - [x] Usuário sem `access_profile_id` (ou perfil desativado): 403
    `NO_ACCESS_PROFILE` com o aviso didático decidido em UC-35-Exceção
    ("Seu acesso ainda não foi configurado — procure o administrador.").
  - [x] Registrar tentativa negada em log de auditoria (`access_denied`,
    fire-and-forget via `logAction`, lazy-required para não quebrar testes
    que mockam apenas `models/index`).
  - [x] `authenticate` agora carrega `AccessProfile` + `AccessProfilePermission`
    junto do `User` (uma única query, `include` aninhado) e anexa
    `req.user.permissions` (mapa `module → 'operate'|'approve'`),
    `req.user.accessProfileId` e `req.user.accessProfileName` — sem query
    extra por request em `authorizeModule` (UC-36: permissões resolvidas
    do banco a cada request, sem `permission_version`, conforme decidido).
- [x] CRUD de perfis: `POST/GET/PUT /api/access-profiles`,
  `GET /api/access-profiles/:id`, `GET /api/access-profiles/modules`,
  `DELETE /api/access-profiles/:id` (UC-30, UC-31, UC-32). **Desvio de
  contrato menor**: a desativação usa `DELETE /api/access-profiles/:id`
  (soft delete, não remove a linha) em vez de
  `PATCH /api/access-profiles/:id/status` mencionado originalmente aqui —
  alinhado à instrução explícita desta entrega e ao padrão já usado por
  `DELETE /api/users/:id` (também soft delete) no restante do projeto.
  - [x] Validação: nome único (409), ao menos um módulo ≠ `none` (422) —
    `module` validado contra `ACCESS_MODULES`
    (`server/src/shared/domain/accessModules.ts`, fonte única compartilhada
    com o middleware).
  - [x] Auditoria completa com `oldValues`/`newValues` (§5) via `logAction`.
  - [x] UC-32: **bloqueia** a desativação (422 `BusinessRuleError`)
    enquanto houver usuário ativo vinculado ao perfil, listando os
    usuários afetados em `error.details.users`.
- [x] Atribuição de perfil a usuário: `PUT /api/users/:id/access-profile`
  (UC-33) — implementado no módulo `users` existente
  (`AssignAccessProfileUseCase`), não em `PATCH`, conforme instrução desta
  entrega.
  - [x] Valida perfil ativo (422 se inativo, 404 se inexistente).
  - [x] **Não** incrementa nenhuma versão de sessão/token ao trocar o
    perfil (decisão do dono, UC-36).
- [x] Endpoint de menu resolvido: `GET /api/auth/me/permissions` (UC-34) —
  retorna `{ modules: { modulo: nivel }, profile: { id, nome } | null }`,
  reaproveitando `req.user.permissions` já resolvido por `authenticate`
  (sem query adicional); `admin` recebe todos os módulos em `'approve'`.
- [x] Aplicado `authorizeModule` em **dois módulos piloto** nesta entrega
  (validação do padrão, conforme instrução explícita — não é o retrofit
  completo): `laboratory` (`module: 'laboratorio'`) e `engineering`
  (`module: 'engenharia'`). Escritas exigem `operate`; `release`/`obsolete`
  de desenho técnico exigem `approve`. Os `authorize(role)` legados foram
  **mantidos** em ambos (composição em camada, não substituição — ver
  próximo item).
- [x] **RETROFIT COMPLETO** — `authorizeModule` aplicado em TODOS os
  módulos restantes de rota (`presentation/routes/*.ts`), **substituindo**
  (não empilhando) o `authorize(role)` legado conforme a decisão registrada
  em `BUSINESS_RULES.md` §8: `products`/`items` → `produtos`;
  `inventory-counts` → `contagens` (approve em aprovar/rejeitar);
  `sales` → `vendas`; `clients` → `clientes`; `purchases` → `compras`
  (exceto `POST /:id/receive` → `recebimento`, módulo dono da ação
  diferente do módulo de origem, ver §4); `purchase-requisitions` →
  `requisicoes` (approve em `PATCH /:id/status`); `suppliers` →
  `fornecedores`; `production-orders` → `producao` (rotas `/tracking*` →
  `chao_de_fabrica`); `bom` → `bom`; `mrp` → `mrp`; `work-centers` →
  `centros_de_trabalho`; `non-conformities` → `qualidade`;
  `inventory` (movements/lots/stock-report/low-stock) → `estoque`
  (exceto `lots/:id/release` e `lots/:id/block` → `qualidade` approve,
  UC-37); `assets` → `patrimonio`; `traceability` → `rastreabilidade`;
  `finance` → `financeiro`; `reports/{sales,inventory,customers,cash-flow}`
  → `relatorios.financeiro`; `reports/production` →
  `relatorios.producao`; `reports/purchasing` → `relatorios.compras`;
  `reports/cost-variance` → `relatorios.custos`; `dashboard` →
  `dashboard`; `mobile-inventory` → `estoque`; `items/:id/suppliers` →
  `produtos`. Módulos mantidos fora do escopo (por decisão explícita do
  enunciado): `intelligentAuditor` (`authorize('admin')` mantido),
  `users`/`audit-logs`/`access-profiles`/`auth` (admin-only por role,
  fora do catálogo de 26 módulos de área, §1), `webhooks` (público).
  Ver tabela completa rota→módulo no handoff (`docs/HANDOFF_CODEX.md`).
- [x] Teste de guarda anti-regressão criado:
  `server/tests/unit/module-authorization-map.test.ts` — verifica que
  todo arquivo de rota dos módulos listados usa `authorizeModule` e que
  nenhum deles (exceto os pilotos `laboratory`/`engineering`, que
  optaram pelo modo aditivo) ainda chama `authorize(role)` para escrita
  comum.
- [x] Resolvido o risco de convivência com checagens de `role` legadas
  (§8) para o retrofit completo — decisão aplicada: **substituir**, não
  empilhar. Única exceção mantida (fora do escopo de "trivial"): o
  controller `purchaseRequisitionController.changeStatus` continua com a
  checagem hard-coded `req.user.role !== 'admin'` para `status =
  'approved'` (não removida — tarefa restrita a arquivos de rota, sem
  tocar controllers); a rota já exige `authorizeModule('requisicoes',
  'approve')`, então um usuário com perfil "Gestor de Compras" (`level =
  'approve'`) ainda pode ser bloqueado pelo controller legado — **risco
  residual documentado**, requer decisão de outro agente/humano sobre
  remover a checagem do controller. Nos módulos piloto
  (`laboratory`/`engineering`) a decisão de manter ambas as checagens
  permanece inalterada (fora do escopo desta tarefa).
- [ ] **Pendência registrada nesta entrega**: `PUT /api/sales/:id/status`
  não diferencia a transição para `shipped` (que, na matriz de negócio,
  seria de responsabilidade do módulo `expedicao`) das demais transições
  operacionais de vendas — não é possível segregar por payload na
  definição estática da rota. A rota inteira permanece mapeada em
  `vendas`; a tela de expedição usa o mesmo endpoint. Decisão fina
  (endpoint dedicado para expedição, ou inspeção de payload em
  middleware) fica para tarefa futura.

### 1.3 Backend — Dashboard/Relatórios/Rastreabilidade (UC-38)

- [ ] Dashboard: filtrar cards retornados pela interseção entre cards
  existentes e módulos com nível ≠ `none` no perfil (não é bloqueio 403,
  é filtragem de conteúdo)
- [ ] Relatórios: sub-módulos `relatorios.producao`/`.compras`/`.custos`/
  `.financeiro` na matriz; aplicar `authorizeModule` por sub-tipo de
  relatório
- [ ] Rastreabilidade: módulo próprio `rastreabilidade`, concedido
  explicitamente (não herdado)

### 1.4 Frontend — Menu Dinâmico e Tela de Gestão de Perfis

- [x] Consumir o menu resolvido do backend (UC-34) em
  `client/src/layouts/AppLayout.tsx` — substituir o menu estático atual
  por renderização condicionada aos módulos retornados. **Implementado**:
  `NavItem.module` mapeado para as 26 `AccessModuleKey`; `itemVisible()`
  combina `roles` legado + `hasModuleAccess` (novo, via `AuthContext`).
  Ver `docs/HANDOFF_CODEX.md` §"Bloco 1.4" para detalhes e decisão do
  fallback de segurança em falha de rede.
- [x] Tela "Acesso Negado" para navegação direta por URL fora do perfil
  (UC-35). **Implementado**: `client/src/pages/AccessDeniedPage.tsx`
  (`variant="accessDenied"`) + guard `ModuleRoute` em
  `client/src/routes/ProtectedRoute.tsx`, aplicado a todos os grupos de
  rota de módulo em `client/src/App.tsx`.
- [x] Tela "Usuários > Perfis de Acesso": listagem, criação, edição
  (matriz de módulo × nível em formato de checklist/tabela), desativação.
  **Implementado**: `client/src/pages/users/AccessProfilesPage.tsx`
  (rota `/users/access-profiles`, admin-only), matriz com radio "Sem
  acesso"/"Operar"/"Aprovar" por módulo; desativação com 422 didático
  (`translateApiError`/`DidacticAlert`, UC-32).
- [ ] Tela de edição de usuário: seletor de perfil + nível
  (operador/gestor). **Parcial**: seletor de perfil implementado em
  `UsersPage.tsx` ("Atribuir perfil", `PUT /api/users/:id/access-profile`).
  Seletor de **nível** não implementado — não há campo `access_level` no
  schema atual (decisão de arquitetura do Bloco 1.2: nível já é resolvido
  pelo `level` da permissão do perfil, não por um campo no usuário). Ver
  nota "Fora de escopo" em `docs/HANDOFF_CODEX.md`.
- [x] **Não é necessário** tratamento de "Sessão invalidada" para troca
  de perfil nesta entrega — decisão do dono (UC-36) é que a troca vale no
  próximo login, sem forçar logout. O tratamento de 401 já existente para
  `password_version`/usuário inativo permanece intacto e **é** o
  mecanismo a orientar o admin a usar quando precisar de revogação
  imediata (desativar o usuário, ver UC-36 "mitigação"). **UI**: aviso
  textual dessa regra adicionado ao dialog "Atribuir perfil" em
  `UsersPage.tsx`.
- [x] Estado "sem perfil atribuído": tela reduzida mostrando apenas "Meu
  Perfil" com o aviso didático "Seu acesso ainda não foi configurado —
  procure o administrador" (UC-35-Exceção, texto oficial do dono).
  **Implementado**: `AppLayout` renderiza `AccessDeniedPage
  variant="noProfile"` no `<main>` quando o mapa de permissões vem vazio
  (usuário não-admin, sem perfil, sem falha de rede) — o header (trocar
  senha/sair) permanece acessível, mas nenhum item de módulo aparece no
  menu.

### 1.5 QA — Casos de Teste dos 403

- [x] Teste unitário (`server/tests/unit/access-profiles.test.ts`):
  `admin` global nunca bloqueado, mesmo sem perfil (§3); usuário sem
  `access_profile_id` → 403 `NO_ACCESS_PROFILE` (UC-35-Exceção); usuário
  com perfil mas sem o módulo → 403 `MODULE_ACCESS_DENIED`; nível
  `operate` não autoriza ação que exige `approve` → 403
  `APPROVAL_LEVEL_REQUIRED` (fórmula adaptada, ver nota do Bloco 1.2);
  nível `approve` no módulo autoriza; `authorizeModule` sem `req.user`
  (antes de `authenticate`) → 401.
- [x] Teste unitário: CRUD de perfis — 409 nome duplicado, 422 perfil sem
  nenhuma permissão, 422 `module` inválido, criação/edição auditadas com
  `oldValues`/`newValues` completos da matriz (§5), 422 desativação com
  usuários ativos vinculados (lista `details.users`), desativação
  bem-sucedida sem usuários vinculados.
- [x] Teste unitário: atribuição de perfil a usuário — audita
  `oldValues`/`newValues` (`assign`), 422 perfil inativo, 404 perfil
  inexistente, remoção de atribuição com `access_profile_id = null`.
- [ ] Teste de integração (HTTP, com Supertest): usuário com perfil sem
  módulo X → GET/POST/PUT/DELETE no módulo X retornam 403, corpo sem
  vazamento de dados — pendente (esta entrega cobriu o middleware e os
  use cases em nível unitário; integração fim-a-fim via rotas reais fica
  para a tarefa de retrofit módulo-a-módulo).
- [ ] Teste: Dashboard retorna apenas cards dos módulos do perfil (UC-38)
- [ ] Teste: Relatório cruzado exige sub-permissão própria, não herdada
  de módulos isolados (UC-38)
- [ ] Teste E2E: Qualidade libera lote criado pelo Recebimento (permissão
  avaliada pelo módulo da ação, não pela origem do dado — UC-37)

---

## Bloco 2 — Requisição de Amostra da Engenharia (UC-39)

**Depende de:** Bloco 4 (Depósitos) para o destino físico da amostra —
implementar em conjunto ou sequenciar Bloco 4 antes deste item de
roteamento de depósito. **Bloco 4 já concluído** (ver acima) — este
bloco foi implementado em sequência, reaproveitando `warehouseStockService`.

### 2.1 AdmDBA

- [x] Valor de `origin` para amostra da engenharia: **`purchase_requisitions
  .origin` já era `VARCHAR(80)` livre** (não ENUM — confirmado em
  `server/migrations/20260802-000002-purchase-requisitions.cjs`), portanto
  **nenhuma migration de schema foi necessária** para o novo valor
  (diferente do precedente `ALTER TYPE ... ADD VALUE` de
  `20260803-000002-add-quarantine-lot-status.cjs`, que se aplica apenas a
  colunas ENUM reais como `lot_controls.status`). **Desvio de nomenclatura
  desta entrega:** o valor usado é **`'engenharia_amostra'`** (não
  `'engineering_sample'` como rascunhado originalmente aqui) — decisão
  explícita do orquestrador nesta entrega; todo o código
  (validator/use case/roteamento de recebimento) usa a string em
  português, consistente com os demais valores de `origin` já em uso
  (`'manual'`, `'mrp'`).
- [x] Migration `server/migrations/20260804-000003-requisition-engineering-project.cjs`
  — adiciona **apenas** `engineering_project_id` (INTEGER, nullable, FK
  `engineering_projects.id` `ON DELETE SET NULL`) + índice dedicado em
  `purchase_requisitions`. **Desvio de escopo desta entrega:** o campo
  `justificativa` (obrigatório apenas para `engenharia_amostra`) **não foi
  criado** — decisão explícita do orquestrador: a requisição já tem
  `notes` (TEXT, livre) suficiente para o texto de justificativa nesta
  fase; criar uma coluna dedicada ficaria para uma iteração futura caso o
  negócio queira validação estrutural separada de "justificativa" vs.
  "observação". `engineering_project_id` é **sempre opcional**, inclusive
  para `origin='engenharia_amostra'` (confirmado no enunciado desta
  tarefa — diverge da nota "não existirem campos equivalentes" do
  rascunho original, que sugeria obrigatoriedade condicional).
  Modelo (`PurchaseRequisition.ts`) e associação
  (`EngineeringProject.hasMany(PurchaseRequisition, ...)`) atualizados em
  `server/src/models/index.ts`.

### 2.2 Backend

- [x] `createPurchaseRequisitionSchema` (Zod) aceita `origin` livre
  (já aceitava qualquer string ≤ 80 chars) e o novo campo opcional
  `engineering_project_id` (coerce int positivo). **Desvio:** nenhuma
  validação condicional de `justificativa` obrigatória foi implementada
  (ver decisão 2.1 — campo não existe nesta entrega).
- [x] `CreatePurchaseRequisitionUseCase` valida a existência do projeto
  quando `engineering_project_id` é informado (`EngineeringProject.findByPk`
  dentro da mesma transação) — 404 didático `NotFoundError` se o projeto
  não existir, para **qualquer** `origin` (não restrito a
  `engenharia_amostra`).
- [x] Reaproveitado 100% o workflow de aprovação/conversão já existente
  (`ChangePurchaseRequisitionStatusUseCase`/
  `ConvertRequisitionToPurchaseOrdersUseCase`) — nenhuma nova máquina de
  estados.
- [x] Sinalização do item no Recebimento: `ConvertRequisitionToPurchaseOrdersUseCase`
  agora concatena uma marcação automática em `notes` do(s) pedido(s) de
  compra gerado(s) quando `requisition.origin === 'engenharia_amostra'`
  ("AMOSTRA ENGENHARIA — receber no Depósito do Laboratório"). **Decisão
  confirmada nesta entrega:** nenhuma coluna nova em `purchase_orders`
  (nem para a marcação, nem para propagar `engineering_project_id`) — a
  marcação vive em `notes` (texto livre já existente), e o roteamento
  REAL de depósito (item abaixo) não depende dessa nota, é resolvido por
  join direto com a requisição de origem.
- [x] Integração com Bloco 4 (roteamento de depósito): `ReceivePurchaseItemsUseCase`
  agora resolve o depósito padrão do recebimento com base na origem da
  requisição — se `warehouse_code` não for informado explicitamente no
  payload de `POST /api/purchases/:id/receive` **e** o pedido tiver
  `requisition_id` apontando para uma requisição com
  `origin='engenharia_amostra'`, o default passa a ser `LABORATORIO` em
  vez de `INSUMOS` (antes desta entrega, o Bloco 4 só oferecia
  `warehouse_code` como parâmetro manual, sem detecção automática — ver
  nota de escopo em `4.2` acima). `warehouse_code` explícito continua
  prevalecendo sobre o default automático.

### 2.3 Frontend

- [ ] Tela "Engenharia > Solicitar Amostra" — **ainda não implementada**
  (a criação de requisição com origem de amostra é feita em
  `RequisitionsPage.tsx`, tela geral de Requisições — ver item abaixo;
  uma tela dedicada dentro do módulo Engenharia não foi criada nesta
  entrega, fora de escopo desta tarefa).
- [x] `RequisitionsPage.tsx` (`client/src/pages/purchases/`): select de
  origem ganhou a opção "Amostra de Engenharia"
  (`origin='engenharia_amostra'`); ao selecioná-la, aparece select
  opcional de Projeto de P&D (`GET /api/engineering/projects`) + aviso
  "Pedidos desta requisição serão recebidos no Depósito do Laboratório";
  badge "Amostra" na listagem e projeto vinculado no detalhe (2026-08-04,
  ver `docs/HANDOFF_CODEX.md` seção "Frontend — Semáforo de Handoff...").
- [ ] Badge "Amostra — Engenharia" na tela de Recebimento — ainda não
  implementado (a marcação hoje só existe em `notes` do pedido de
  compra, texto livre — ver Bloco 2.2; nenhuma UI de Recebimento lê essa
  nota estruturadamente).
- [ ] Alerta não bloqueante de quantidade atípica (> 50 unidades) — não
  implementado nesta entrega.

### 2.4 QA

- [x] Cobertura indireta: os testes unitários existentes de
  `CreatePurchaseRequisitionUseCase`/`ConvertRequisitionToPurchaseOrdersUseCase`
  continuam 100% verdes com os novos campos aditivos (nenhum teste
  dedicado a `engenharia_amostra`/`engineering_project_id` foi criado
  nesta entrega — os testes existentes não fixam `origin`, logo o
  comportamento padrão/backward-compat foi validado; teste dedicado ao
  fluxo de amostra fica como próxima tarefa de QA).
- [ ] Teste: requisição `engenharia_amostra` sem justificativa → 422 —
  **não aplicável nesta entrega** (campo `justificativa` não existe, ver
  decisão 2.1).
- [ ] Teste: requisição com `engineering_project_id` válido é persistida e
  rastreável ao projeto (404 se inválido) — pendente, próxima tarefa de QA.
- [ ] Teste E2E: requisição de amostra aprovada → convertida em pedido →
  recebida → entra no Depósito do Laboratório (não no de Insumos) —
  pendente (requer integração real com banco, fora do escopo desta
  entrega de testes unitários).

**Decisão registrada nesta entrega (permissão):** criar requisição de
amostra **permanece no módulo `requisicoes`** (não existe módulo
`engenharia` dedicado a esta ação) — a Engenharia recebe a permissão do
módulo `requisicoes` no seu perfil de acesso (via `AccessProfilePermission`)
para poder criar requisições com `origin='engenharia_amostra'`. Nenhuma
rota nova foi criada; `POST /api/purchase-requisitions` já exige
`authorizeModule('requisicoes', 'operate')`.

---

## Bloco 3 — Handoff Entre Departamentos com Semáforo (UC-40)

### 3.1 Backend

- [x] Função utilitária `calculateHandoffSignal(kind, entity, now?)`
  compartilhada em `server/src/shared/domain/handoffSignal.ts` (não
  duplicada por módulo) — implementa a tabela normativa de
  `BUSINESS_RULES.md` §10/`01-USE_CASES.md` UC-40 para 4 cadeias
  tabuladas (`purchase`, `lot`, `sale`, `non_conformity`) **+ 1 cadeia
  aditiva não tabulada** (`purchase_requisition`, `pending` → `yellow`
  "aguardando aprovação", pedida nominalmente no enunciado desta tarefa).
  `now` é injetável (default `new Date()`) para testes determinísticos da
  regra de `expected_date` vencida. Cor sempre calculada on-the-fly nas
  listagens (nunca persistida — §10).
- [x] Listagens enriquecidas com campo aditivo `handoff_signal`
  (`green|yellow|red`), sem quebrar contrato (campo novo, aditivo, em
  cada linha de `rows`):
  - [x] `GET /api/purchases` (fila de Recebimento) —
    `ListPurchasesUseCase` usa `calculateHandoffSignal('purchase', ...)`
    com `status`/`expected_date`/`delivery_date`. **Desvio da nota
    original** ("reaproveitar lógica de `overdue` já usada em UC-28"): a
    lógica não foi importada de `GetPurchaseCockpitUseCase`
    (`overdueRow` é uma query SQL agregada, não uma função reutilizável
    por linha) — foi reimplementada como função pura em
    `handoffSignal.ts`, com a MESMA regra (`expected_date < hoje` E
    `delivery_date IS NULL` E fora dos status terminais
    `received`/`canceled`), agora compartilhável por qualquer listagem
    futura.
  - [x] `GET /api/purchase-requisitions` (fila de aprovação) —
    `ListPurchaseRequisitionsUseCase` usa
    `calculateHandoffSignal('purchase_requisition', ...)`. **Não estava
    nesta lista original do Bloco 3.1**, mas foi pedido nominalmente no
    enunciado desta entrega ("purchase-requisitions list") — adicionado
    como 5ª listagem enriquecida.
  - [x] `GET /api/inventory/lots` (fila de Qualidade) —
    `ListLotsUseCase` usa `calculateHandoffSignal('lot', ...)`:
    `available` verde, `quarantine` amarelo, `blocked` vermelho (demais
    status — `reserved`/`consumed`/`expired` — verde, fora da régua de
    alerta desta tabela).
  - [x] `GET /api/sales` (fila de Expedição) — `ListSalesUseCase` usa
    `calculateHandoffSignal('sale', ...)`: `invoiced` verde, `nfe_status
    ='processing'` amarelo, `nfe_status` em `denied`/`cancelled` OU
    `sale.status='canceled'` vermelho.
  - [x] `GET /api/quality/non-conformities` (fila de tratativa) —
    `ListNonConformitiesUseCase` usa
    `calculateHandoffSignal('non_conformity', ...)`: `open`/`analysis`
    (equivalente a `in_analysis` do enunciado — nome real do enum do
    model é `analysis`) amarelo; `closed` com `effectiveness_result !=
    'effective'` vermelho (reincidente, redação literal de
    `01-USE_CASES.md` UC-40); demais status verde.
- [x] `GET /api/dashboard/handoffs` implementado nesta mesma entrega (ver
  3.3 abaixo) — a pergunta original "confirmar com o dono se é necessário
  endpoint de contador/badge" foi resolvida a favor do "sim" pelo
  enunciado explícito desta tarefa (Bloco 3, item 3), que já especificou
  o contrato exato do endpoint.

### 3.2 Frontend

- [x] Componente reutilizável de "bolinha de status" (semáforo) —
  `client/src/components/HandoffDot.tsx` (`HandoffDot({ signal })`,
  `title`/`aria-label` didáticos, sem texto cru de status) — 2026-08-04,
  ver `docs/HANDOFF_CODEX.md`.
- [x] Aplicar o componente nas telas já existentes — coluna extra (só a
  bolinha) em `PurchasesPage.tsx`, `RequisitionsPage.tsx`,
  `ReceivingPage.tsx`, `ShippingPage.tsx`, `InspectionTab.tsx` (aba de
  `/quality`) e `NonConformitiesTab.tsx`, consumindo o `handoff_signal`
  aditivo já retornado pelas listagens (item 3.1 acima). — 2026-08-04.
- [x] **Contador/badge de menu** (ponto do dono ainda não respondido,
  ver rodapé deste documento) — **versão mínima e reversível**
  implementada por instrução explícita desta entrega, não é a decisão
  final do dono: badge numérico discreto em Recebimento/Requisições/
  Expedição/Qualidade em `client/src/layouts/AppLayout.tsx`, via
  `GET /api/dashboard/handoffs` com polling de 60s (TanStack Query),
  restrito a quem tem acesso ao módulo `dashboard`; falha da chamada
  nunca quebra o menu (sem badge, sem erro visível). — 2026-08-04.

### 3.3 Backend — `GET /api/dashboard/handoffs`

- [x] `GetDashboardHandoffsUseCase` +
  `SequelizeDashboardRepository.getHandoffsSummary()` (SQL parametrizado
  leve, mesmo padrão de `getCockpitMetrics`) + rota
  `GET /api/dashboard/handoffs` (`authenticate`, `authorizeModule
  ('dashboard')`) retornando exatamente o contrato do enunciado:
  `{ recebimento: { pending }, requisicoes: { awaiting_approval },
  expedicao: { ready_to_ship }, qualidade: { quarantine, open_rncs } }`.
  `recebimento.pending` conta `purchase_orders` em
  `sent`/`approved`/`partial`; `requisicoes.awaiting_approval` conta
  `purchase_requisitions.status='pending'`; `expedicao.ready_to_ship`
  conta `sales.status='invoiced'`; `qualidade.quarantine` conta
  `lot_controls.status='quarantine'`; `qualidade.open_rncs` conta
  `non_conformities.status IN ('open','analysis')`.

### 3.4 QA

- [x] `server/tests/unit/handoff-signal.test.ts` — cobre a tabela
  normativa §10/UC-40 completa (26 casos): pedido `sent`/`approved`/
  `partial` dentro do prazo → `green`; pedido com `expected_date` vencida
  e sem `delivery_date` → `red` (inclui o caso "continua na fila" —
  garantido pela ausência de filtro de exclusão no próprio cálculo, a
  listagem nunca remove o registro por cor); pedido `received`/`canceled`
  saem da régua de atraso (estado terminal) → `green`; lote
  `available`/`quarantine`/`blocked`; venda `invoiced`/`processing`/
  `denied`/`cancelled`/`canceled`/`shipped`; RNC `open`/`analysis`/
  `closed` efetivo/não efetivo/demais status; requisição `pending` vs.
  demais status; guarda de `kind` desconhecido.

---

## Bloco 4 — Múltiplos Depósitos (UC-42)

**Depende de:** nenhum bloco anterior tecnicamente, mas desbloqueia o
roteamento correto do Bloco 2 (amostra → Laboratório). Recomenda-se
priorizar este bloco antes de finalizar o Bloco 2.

### 4.1 AdmDBA — Schema (maior escopo de schema desta entrega)

- [x] Criar migration `warehouses` (id, `code` único, `name`,
  `description`, `active` boolean default true, timestamps) —
  `server/migrations/20260804-000001-create-warehouses.cjs`. **Desvio
  deliberado desta entrega:** sem coluna `tipo` enum
  (`insumos|acabados|laboratorio|outro`) — o `code` único já cumpre o
  papel de identificar o depósito nesta fase; se um enum de tipo for
  necessário para regras de roteamento automatizadas no backend (4.2),
  avaliar então como ALTER TYPE incremental.
- [x] Seed obrigatório: 3 registros (`INSUMOS`, `ACABADOS`, `LABORATORIO`)
  — idempotente via `ON CONFLICT (code) DO NOTHING` na mesma migration.
- [x] Criar migration `product_warehouse_stock`: modelo `products`
  (INTEGER) confirmado ativo para saldo físico nesta fase — `product_id`
  FK `products.id` (CASCADE), `warehouse_id` FK `warehouses.id`
  (RESTRICT), `quantity DECIMAL(18,6)` default 0, `CHECK (quantity >= 0)`,
  unique `(product_id, warehouse_id)`, índices em ambos os FKs.
- [x] Adicionar `warehouse_id` em `inventory_movements` — **desvio
  deliberado desta entrega:** coluna `NULL`able (não obrigatória) com
  `ON DELETE SET NULL`, seguindo o padrão expand-contract (fase expand
  apenas; tornar `NOT NULL` fica para uma fase contract futura, quando
  todo código que grava `InventoryMovement` já estiver informando
  depósito — ver `docs/HANDOFF_CODEX.md` Fase 4.1 como precedente).
- [x] Adicionar `type='transfer'` ao enum de tipo de `inventory_movements`
  — `server/migrations/20260804-000002-warehouse-transfers.cjs`
  (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`, mesmo padrão de
  `20260803-000002-add-quarantine-lot-status.cjs`, fora de transação).
  **Desvio deliberado desta entrega:** não foi criada uma coluna
  `transfer_id` (UUID) dedicada — o par já existente
  `reference_type='transfer'` / `reference_id=warehouse_transfers.id`
  em `inventory_movements` cumpre o mesmo papel de vincular os dois
  registros (`out`/`in`) de uma transferência, sem duplicar modelagem.
- [x] Criar migration `warehouse_transfers` (id, `product_id` FK
  `products` NOT NULL, `from_warehouse_id`/`to_warehouse_id` FK
  `warehouses` NOT NULL com `CHECK (from_warehouse_id <>
  to_warehouse_id)`, `quantity NUMERIC(18,6)` com `CHECK (quantity >
  0)`, `reason` text obrigatório, `user_id` FK `users` NOT NULL (quem
  solicitou), `approved_by` FK `users` nullable (quem aprovou/rejeitou),
  `status` enum `pending|approved|rejected` default `pending`,
  timestamps, índices em `product_id`/`from_warehouse_id`/
  `to_warehouse_id`/`status`) —
  `server/migrations/20260804-000002-warehouse-transfers.cjs`. **Desvio
  de nomenclatura desta entrega:** os nomes de coluna usados são
  `user_id` (não `requested_by`) e não há `approval_date` dedicada (o
  `updatedAt` do registro já reflete o momento da aprovação/rejeição) —
  ajuste feito para alinhar com o contrato de payload pedido nesta
  tarefa (`POST /api/inventory/transfers`). Modelo
  `server/src/models/WarehouseTransfer.ts` + associações em
  `server/src/models/index.ts` (`Product`, `Warehouse` origem/destino,
  `User` solicitante/aprovador).
- [x] Migration de backfill: todo saldo atual de `products.quantity > 0`
  migra para `product_warehouse_stock` no depósito `INSUMOS`
  (`INSERT ... SELECT ... ON CONFLICT DO NOTHING`; produtos com
  `quantity = 0` não ganham linha, decisão desta entrega para não poluir
  a tabela com saldos zerados). `lot_controls` existentes recebem
  `warehouse_id = INSUMOS`. **Nota:** a segregação por `product_type`
  (`finished` → `ACABADOS`) mencionada como alternativa não foi aplicada
  nesta entrega — todo saldo legado foi tratado como Insumos, conforme
  instrução explícita recebida; ajuste manual pós-migração fica a
  critério do PCP.
- [ ] Script de validação pós-backfill dedicado (mesmo padrão de
  `04c_validation.sql`) — pendente como arquivo separado; a invariante
  (soma de `product_warehouse_stock` por produto = `products.quantity`
  anterior para produtos com saldo > 0) está documentada em
  `docs/DATABASE.md` e nos comentários da migration, mas o script `.sql`
  de validação automatizada ainda não foi criado.

### 4.2 Backend

- [x] Adaptar `InventoryService`/`ChangeProductionOrderStatusUseCase`/
  `ReceivePurchaseItemsUseCase`/movimentação manual para dual-write em
  `ProductWarehouseStock` via novo `server/src/services/warehouseStockService.ts`
  (`addToWarehouse`/`removeFromWarehouse`/`getWarehouseByCode`, todos
  transacionais com lock pessimista `LOCK.UPDATE`). **`products.quantity`
  continua a fonte de verdade para MRP/telas legadas** — toda operação
  grava nos dois lugares na MESMA transação (invariante §12 item 3).
  - [x] Consumo de componente de OP → sempre `INSUMOS`
    (`ChangeProductionOrderStatusUseCase.completeOrder`,
    `removeFromWarehouse` antes de `consumeLotsForComponent` — 422
    didático se o saldo do depósito for insuficiente, nunca fica
    negativo).
  - [x] Conclusão de OP (produto bom) → sempre `ACABADOS`
    (`addToWarehouse` + `LotControl` do produto acabado ganha
    `warehouse_id` do depósito `ACABADOS`).
  - [x] Recebimento de compra → `INSUMOS` por padrão ou `LABORATORIO` se
    `warehouse_code` for informado explicitamente no payload de
    `POST /api/purchases/:id/receive` (`ReceivePurchaseItemsUseCase`,
    validado em `receivePurchaseItemsSchema`). **Desvio de escopo desta
    entrega:** o roteamento automático por `origin` da requisição
    (`engineering_sample`, Bloco 2) **não foi implementado** — o Bloco 2
    ainda não existe (`origin='engineering_sample'` não foi criado no
    enum de `purchase_requisitions`). Esta entrega expõe o parâmetro
    `warehouse_code` opcional para que o Recebimento sinalize
    manualmente a origem de amostra até o Bloco 2 automatizar a
    detecção; nenhuma trava impede reaproveitar o mesmo parâmetro
    quando o Bloco 2 for implementado.
  - [ ] Consumo de venda/expedição → sempre `ACABADOS` — **não
    implementado nesta entrega** (fora do escopo desta tarefa, que
    cobriu apenas Compras/Produção/movimentação manual/transferências);
    `ChangeSaleStatusUseCase`/expedição ainda usam apenas
    `InventoryService` sem depósito. Fica registrado como próxima
    tarefa do Bloco 4.
- [x] Novo use case `CreateWarehouseTransferUseCase` (solicitação,
  `status='pending'`, não altera nenhum saldo) —
  `server/src/modules/inventory/application/use-cases/CreateWarehouseTransferUseCase.ts`.
- [x] Novo use case `ApproveWarehouseTransferUseCase` (rota exige
  `authorizeModule('estoque', 'approve')`; executa débito/crédito
  atômico via `warehouseStockService` + 2 registros de
  `InventoryMovement` (`type='transfer'`) vinculados por
  `reference_type='transfer'`/`reference_id=warehouse_transfers.id`,
  todos na mesma transação) —
  `server/src/modules/inventory/application/use-cases/ApproveWarehouseTransferUseCase.ts`.
  **Desvio de nomenclatura:** não existe `access_level='gestor'` como
  campo próprio de usuário (decisão já registrada no Bloco 1.2 — o
  nível "gestor" é resolvido pelo `level='approve'` da permissão do
  perfil no módulo `estoque`); `authorizeModule('estoque', 'approve')`
  já implementa exatamente essa fórmula.
- [x] Novo use case `RejectWarehouseTransferUseCase` (não estava
  detalhado nesta lista, mas exigido pelo contrato de
  `PUT /api/inventory/transfers/:id/reject` desta entrega — motivo
  obrigatório, não altera saldo) —
  `server/src/modules/inventory/application/use-cases/RejectWarehouseTransferUseCase.ts`.
- [x] Endpoints (contrato desta entrega, difere do desenho original
  deste item — ver desvios abaixo):
  `GET /api/inventory/warehouses` (lista depósitos ativos),
  `GET /api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=`
  (saldo por par produto×depósito), `GET /api/inventory/transfers?status=`,
  `POST /api/inventory/transfers`,
  `PUT /api/inventory/transfers/:id/approve`,
  `PUT /api/inventory/transfers/:id/reject` — todos em
  `server/src/modules/inventory/presentation/routes/inventory.ts`
  (não em um módulo `warehouses`/`warehouse-transfers` novo, nem em
  `/api/warehouses`/`/api/warehouse-transfers` como prefixo próprio, e
  `PUT` em vez de `PATCH` para approve/reject). **`POST/PUT
  /api/warehouses`(CRUD completo de depósito) não foi implementado** —
  fora do escopo desta tarefa (que focou saldo/transferência); depósitos
  seguem cadastrados apenas via seed/migration.
- [ ] Endpoint de saldo por depósito de UM produto específico
  (`GET /api/products/:id/stock-by-warehouse`) — **não implementado**;
  o endpoint entregue (`GET /api/inventory/warehouse-stock?product_id=`)
  cobre o mesmo caso de uso via query param, mas não existe a rota
  aninhada em `/api/products/:id/...`.
- [ ] Ajustar `GET /api/inventory/movements` para aceitar filtro
  `?warehouse_id=` — não implementado nesta entrega (fora do escopo
  desta tarefa); `warehouse_id` já é persistido em toda movimentação
  nova (dual-write), mas o filtro de leitura fica pendente.
- [ ] Débito automático de estoque em teste destrutivo (UC-42-E) — não
  implementado nesta entrega (depende do Bloco de Laboratório/
  `AcousticTestResult`, fora do escopo desta tarefa).
- [x] Teste automatizado obrigatório de invariante: soma dos saldos por
  depósito de um produto reflete corretamente após sequência real de
  entrada/saída/transferência — `server/tests/unit/warehouse-stock.test.ts`
  (`'soma dos saldos por deposito de um produto reflete corretamente
  apos varias operacoes (invariante §12 item 3)'`, com fake in-memory de
  `ProductWarehouseStock` para validar a soma real, não apenas mocks
  opacos).

### 4.3 Frontend

- [ ] Tela "Configurações > Depósitos" (CRUD simples) — **não implementada
  nesta entrega**; o backend também não expõe `POST/PUT /api/warehouses`
  ainda (ver 4.2), depósitos seguem cadastrados apenas via seed/migration.
- [x] Filtro de depósito na tela de Recebimento (`ReceivingConferenceDialog`
  — seletor "Depósito de destino", `INSUMOS` default/`LABORATORIO`,
  enviado como `warehouse_code` no payload de recebimento) e na aba
  "Saldos" de `/logistics/estoque` (seletor Todos/por depósito, troca para
  `GET /api/inventory/warehouse-stock` quando um depósito é selecionado).
  **Não implementado nesta entrega**: filtro de depósito em Expedição,
  extrato de movimentações (`GET /api/inventory/movements` ainda não
  aceita `?warehouse_id=` no backend) e tela de Contagem/inventário
  mobile — fora do escopo desta tarefa (ver `docs/HANDOFF_CODEX.md`
  seção "Bloco 4 — Frontend").
- [x] Tela/fluxo de solicitação de transferência + fila de aprovação para
  gestores — nova aba "Transferências" em `/logistics/estoque`
  (`client/src/pages/logistics/TransfersTab.tsx`): tabela com badge de
  status (`pending` âmbar/`approved` verde/`rejected` vermelho, reutiliza
  `Badge` variants `warning`/`success`/`destructive` — não um componente
  de semáforo do Bloco 3, que ainda não foi implementado), dialog de nova
  transferência com validação client-side `from !== to`, e
  aprovar/rejeitar restritos a `permissions?.estoque === 'approve'` ou
  `admin`.
- [ ] Exibir saldo por depósito (não só saldo total) nas telas de produto/
  item — **não implementado nesta entrega**; o saldo por depósito hoje só
  é visível em Logística → Estoque → aba Saldos (seletor de depósito), não
  na tela de cadastro de produto/item.

### 4.4 QA

- [x] Teste: soma dos saldos por depósito reflete corretamente antes e
  depois de operações reais de entrada/saída/transferência — teste de
  invariante automatizado (não só manual),
  `server/tests/unit/warehouse-stock.test.ts`.
- [x] Teste: transferência `pending` (recém-criada) não altera nenhum
  saldo (`addToWarehouse`/`removeFromWarehouse` não chamados em
  `CreateWarehouseTransferUseCase`) — `warehouse-stock.test.ts`
  (`'cria transferencia pending sem alterar nenhum saldo'`).
- [x] Teste: transferência aprovada debita origem e credita destino no
  mesmo valor (mesma transação, mesmo `quantity`), gera os 2
  `InventoryMovement` `type='transfer'` vinculados e **não** chama
  `Product.findByPk`/`InventoryService` (prova de que `products.quantity`
  não é tocado) — `warehouse-stock.test.ts`
  (`'aprova transferencia: debita origem, credita destino...'`).
  **Rollback em caso de falha parcial:** coberto indiretamente pelo
  teste de 422 na aprovação (abaixo) — não há teste de integração real
  com banco Postgres nesta entrega (fora do escopo, mocks apenas).
- [x] Teste: `from_warehouse_code === to_warehouse_code` é rejeitado
  (`ValidationError`, transferência não é criada) —
  `warehouse-stock.test.ts`
  (`'rejeita from_warehouse_code igual a to_warehouse_code (from=to
  invalido)'`).
- [x] Teste: aprovação com saldo de origem insuficiente **no momento da
  aprovação** propaga 422 didático (`BusinessRuleError`) e não credita o
  destino nem persiste `approved` — `warehouse-stock.test.ts`
  (`'aprovacao propaga 422 didatico quando saldo de origem e
  insuficiente NO MOMENTO da aprovacao'`).
- [x] Teste: `removeFromWarehouse` nunca deixa o saldo do depósito
  negativo e a mensagem de erro cita produto, depósito e saldo atual
  (padrão didático §13) — `warehouse-stock.test.ts`.
- [ ] Teste: expedição não lê saldo de outro depósito além de `ACABADOS`,
  mesmo com saldo positivo do mesmo produto em outro depósito — **não
  implementado nesta entrega**, pois a integração de vendas/expedição
  com depósito (item correspondente em 4.2) também não foi feita.
- [ ] Teste: quarentena/bloqueio de lote não move o lote de depósito —
  apenas muda `LotControl.status` (§12 item 9) — não coberto nesta
  entrega (já implícito no modelo, mas sem teste dedicado novo).
- [ ] Teste: contagem cíclica escopada a um único depósito por vez —
  fora do escopo desta entrega (Bloco 4 Frontend/contagem cíclica).
- [ ] Teste: registrar um teste destrutivo com `consumed_quantity`
  informado debita automaticamente o Depósito de Laboratório, na mesma
  transação do registro do teste, sem exigir lançamento manual separado
  (UC-42-E)

---

## Bloco 5 — Emissão de NF-e pelo Vendas: Permissão por Perfil (UC-41)

**Depende de:** Bloco 1 (middleware de módulo/nível) já concluído — este
bloco é apenas a aplicação da regra de autorização sobre endpoints já
existentes (`server/src/modules/fiscal/...`), não cria fluxo fiscal novo.

### 5.1 Backend

- [x] Aplicado `authorizeModule('vendas', 'approve')` em:
  - [x] `POST /api/sales/:id/nfe` (emissão) — antes desta entrega estava
    em nível `operate` (retrofit anterior do Bloco 1.2); alterado para
    `approve` nesta entrega para cumprir UC-41/§11 (DECIDIDO 2026-08-03:
    emissão **e** cancelamento restritos ao nível gestor, sem distinção
    entre as duas operações). Ver
    `server/src/modules/sales/presentation/routes/sales.ts`.
  - [x] `POST /api/sales/:id/nfe/cancel` (cancelamento) — já estava em
    `approve` desde o retrofit do Bloco 1.2 (nenhuma mudança necessária
    aqui; apenas alinhado o comentário da rota à fórmula formal do §11).
  **Desvio de nomenclatura desta entrega:** não existe módulo
  `faturamento` dedicado nem coluna `access_level='gestor'` no usuário —
  o nível "gestor" já é resolvido pelo `level='approve'` da permissão do
  perfil no módulo `vendas` (mesma decisão de arquitetura registrada no
  Bloco 1.2), então `authorizeModule('vendas', 'approve')` já implementa
  exatamente a fórmula de §11 sem necessidade de checagem adicional de
  `access_level`.
- [x] Confirmado: `GET /api/sales/:id/nfe` (consulta de status) permanece
  em `authorizeModule('vendas')` (nível implícito `view`/`operate`) — não
  foi alterado, continua acessível a qualquer nível do módulo `vendas`.

### 5.2 Frontend

- [ ] Ocultar/desabilitar botões de emitir/cancelar NF-e para usuários sem
  nível `approve` em `vendas` — **fora de escopo desta entrega** (tarefa
  restrita a `server/`, sem tocar `client/`).
- [ ] Mensagem clara ao tentar (caso o botão não seja escondido) — fora de
  escopo (frontend).

### 5.3 QA

- [ ] Teste: operador de Vendas (nível `operate`) tenta emitir NF-e → 403
  — **não coberto por teste dedicado nesta entrega**. Cobertura indireta:
  `server/tests/unit/access-profiles.test.ts` já cobre a fórmula genérica
  do middleware (`operate` não autoriza ação que exige `approve` →
  `APPROVAL_LEVEL_REQUIRED`); nenhum teste específico do endpoint
  `/sales/:id/nfe` foi adicionado. Fica como próxima tarefa de QA
  (integração HTTP real).
- [ ] Teste: gestor de Vendas emite NF-e → sucesso — coberto apenas pelo
  teste de integração já existente
  `server/tests/integration/sale-nfe-issuance.test.ts` (usa token
  admin/prerequisito de ambiente, `describe.skip` sem `TEST_PRODUCT_ID` —
  não roda no `npx jest tests/unit`).
- [ ] Teste: gestor cancela NF-e de venda `shipped` → `nfe_status
  =cancelled`, `sale.status` permanece `shipped` — mesma cobertura
  indireta acima (integração, não unitário).
- [x] Regressão confirmada por leitura de código (não por teste
  automatizado dedicado): `GET /api/sales/:id/nfe` não foi tocado nesta
  entrega — permanece `authorizeModule('vendas')` sem `approve`.

---

## Bloco 6 — Alertas Didáticos de Pré-Requisitos (UC-43, Transversal)

**Depende de:** nenhum outro bloco tecnicamente — é o único bloco desta
entrega que **não exige nenhuma migration de schema**. Pode ser
executado em paralelo a qualquer outro bloco. Recomenda-se, no entanto,
aplicar o padrão já nos componentes novos criados pelos Blocos 1–5 (não
construir tela nova fora do padrão para depois ter que retrofitar).

### 6.1 Backend — Evolução Incremental de `details` Estruturado

- [ ] Auditar, endpoint por endpoint, os 9 casos priorizados em
  `BUSINESS_RULES.md` §13.5 e confirmar se cada um já retorna `details`
  estruturado suficiente para montar as 3 partes do alerta (`item`,
  `quantidade`, `documento`, `status_atual`, etc.) — não apenas uma
  `message` em texto livre
- [ ] Para os casos que ainda validam e falham na primeira condição
  (`throw` no primeiro erro), avaliar viabilidade de **coletar todas as
  violações antes de lançar o erro**, retornando um array em `details`
  (ex.: `details: { missing_prerequisites: [...] }`) — seguir o padrão já
  usado em `ConvertRequisitionToPurchaseOrdersUseCase` (lista todos os
  itens sem fornecedor de uma vez) como referência
- [ ] Priorizar nesta ordem (criticidade operacional, §13.5):
  1. [ ] Liberação de OP (material/BOM/roteiro) — confirmar se o endpoint
    de liberação hoje existe como ação dedicada ou se é parte do
    `ChangeProductionOrderStatusUseCase`; se validações estão
    fragmentadas em múltiplos pontos, consolidar em um único checklist
    de pré-requisitos consultável via `GET` (necessário para o checklist
    preventivo do frontend, item 6.2)
  2. [ ] Conclusão de OP com etapa aberta
  3. [ ] Embarque de venda sem NF-e autorizada (já implementado com boa
    mensagem em `ChangeSaleStatusUseCase` — validar se `details` inclui
    o `nfe_status` atual para a parte "POR QUE")
  4. [ ] Conversão de requisição sem fornecedor resolvível (já lista
    todos os itens — confirmar formato de `details` e replicar padrão)
  5. [ ] Recebimento de compra sem nota fiscal
  6. [ ] Registro de teste de laboratório sem resultado/faixa
  7. [ ] Conversão de ordem planejada do MRP já em execução (já lista
    ids inválidos — confirmar formato)
  8. [ ] Aprovação de requisição fora de sequência
  9. [ ] Liberação/bloqueio de lote em status terminal
- [ ] Para o checklist preventivo (Regra 1, §13.1), avaliar se cada ação
  crítica precisa de um **endpoint de pré-checagem** dedicado (`GET
  .../:id/prerequisites` ou equivalente, retornando a lista de itens
  `✓`/`✗` com os mesmos dados que o erro `422` traria) ou se o frontend
  pode montar o checklist reaproveitando dados já carregados por outras
  chamadas `GET` existentes (ex.: para liberar OP, cruzar
  `GET /api/production-orders/:id` + `GET /api/mrp/...` disponibilidade
  de material, sem endpoint novo) — decisão técnica por caso, priorizar
  reaproveitamento antes de criar endpoint novo

### 6.2 Frontend — Componentes Padrão (Construir Uma Vez, Reusar em Tudo)

- [x] Criar componente `PrerequisiteChecklist` (ou nome equivalente) em
  `client/src/components/` — lista de itens `{ label, met: boolean,
  reason?: string }`, renderiza `✓`/`✗`, desabilita children (botão de
  ação) via prop quando houver algum `met === false`, exibe `reason` na
  própria linha (nunca em tooltip)
  — implementado em `client/src/components/PrerequisiteChecklist.tsx` como
  `PrerequisiteChecklist` (`items: PrerequisiteItem[]{ label, ok, detail?,
  action? }`) + helper `hasPendingPrerequisite(items)` para o `disabled` do
  botão de ação principal. Ainda não consumido em nenhuma tela (nenhuma das
  4 telas do retrofit 6.2 tinha um endpoint de pré-checagem dedicado
  pronto — ver 6.1 item de checklist preventivo, que segue `[ ]`).
- [x] Criar utilitário `translateApiError(error, context)` em
  `client/src/api/` (ao lado de `extractApiErrorMessage`, ou substituindo
  seu uso nos fluxos deste padrão) — consome `error.response.data.error`
  completo (`code`, `message`, `details`), monta as 3 partes (O QUE / POR
  QUE / O QUE FAZER), com um mapa de "O QUE FAZER" por `code`+contexto de
  tela (ex.: `BUSINESS_RULE_VIOLATION` no contexto "liberar OP" → link
  para MRP/Compras; no contexto "converter requisição" → link para Item →
  Fornecedores)
  — implementado em `client/src/lib/translateApiError.ts` (não em
  `client/src/api/` — colocado em `lib/` por consumir apenas o axios
  error, sem chamada HTTP própria; `extractApiErrorMessage` permanece
  intocado em `client/src/api/httpClient.ts`, uso aditivo). Mapa de ação
  por `ErrorContext` (não por `code`, já que `code` hoje é quase sempre
  `BUSINESS_RULE_VIOLATION`/`VALIDATION_ERROR` genérico — o contexto de
  tela é o discriminador real). Testado em
  `client/src/lib/translateApiError.test.ts`.
  - [x] Fallback: quando `details` ausente, usar `message` na parte "POR
    QUE" e uma orientação genérica configurável na parte "O QUE FAZER"
    (nunca regredir a um alerta sem estrutura)
- [x] Criar componente `DidacticAlertDialog`/`DidacticErrorBanner` (ou
  reaproveitar o padrão de dialog já usado nas telas existentes, ex.:
  `ConvertRequisitionDialog`) que renderiza a saída de
  `translateApiError` no formato visual de 3 partes, com o link/CTA de
  "O QUE FAZER" clicável quando aplicável (`react-router` `Link`)
- [ ] Retrofit das telas já existentes que hoje usam
  `extractApiErrorMessage` (34 arquivos identificados em
  `client/src/pages/**`) — não é obrigatório migrar todas de uma vez;
  priorizar as 9 telas ligadas aos casos de `BUSINESS_RULES.md` §13.5:
  - [ ] `ProductionOrdersPage.tsx` (liberar/concluir OP)
  - [x] `ShopFloorPage.tsx` / `CompleteProductionOrderDialog.tsx`
    (etapa de apontamento aberta) — mutation de conclusão migrada para
    `translateApiError` + `DidacticAlert` em
    `client/src/pages/production/CompleteProductionOrderDialog.tsx`
  - [x] `ShippingPage.tsx` (embarque sem NF-e) — `window.alert` removido,
    `shipMutation` usa `translateApiError`/`DidacticAlert`; aviso inline
    de NF-e não autorizada reescrito nas 3 partes do padrão didático
  - [x] `RequisitionsPage.tsx` (conversão sem fornecedor) — dialog
    `ConvertRequisitionDialog` migrado; lista TODOS os itens sem
    fornecedor retornados em `details` (não apenas o primeiro)
  - [x] `ReceivingConferenceDialog.tsx` (recebimento sem NF) — mutation de
    recebimento migrada para `translateApiError`/`DidacticAlert`
  - [ ] `RegisterTestTab.tsx` (teste sem resultado/faixa)
  - [ ] `MrpPage.tsx` (conversão de ordem já em execução)
  - [x] `RequisitionsPage.tsx` (aprovação fora de sequência — mesma tela
    do item de conversão, ações diferentes) — `statusMutation`
    (aprovar/cancelar) migrada, `window.alert` removido
  - [ ] `InspectionTab.tsx` (liberar/bloquear lote em status terminal)
- [ ] Para telas novas construídas pelos Blocos 1–5 (gestão de perfis,
  depósitos, transferências, filas com semáforo), já nascer usando
  `PrerequisiteChecklist`/`translateApiError` desde o início — não é
  retrofit, é aplicação direta do padrão

### 6.3 QA — Revisão de Telas Existentes Contra o Padrão

- [ ] Checklist de conformidade por tela (aplicar às 9 telas priorizadas
  e, incrementalmente, às demais 25 identificadas): botão desabilitado
  sempre tem motivo visível ao lado? Erro exibido segue as 3 partes (O
  QUE / POR QUE / O QUE FAZER)? Lista completa de pendências, não só a
  primeira? Nenhum código de erro cru (`BUSINESS_RULE_VIOLATION` etc.)
  aparece como texto para o usuário? Nenhum stack trace/mensagem técnica
  crua aparece?
- [ ] Teste E2E: ação com 3 pré-requisitos faltando simultaneamente
  (ex.: OP sem material + sem roteiro liberado + com etapa aberta) exibe
  as 3 pendências juntas, não uma de cada vez
- [ ] Teste E2E: corrigir um pré-requisito e reabrir a tela reflete o
  checklist atualizado (item que era `✗` passa a `✓`)
- [ ] Teste de regressão visual/copy: nenhuma tela nova entregue pelos
  Blocos 1–5 usa `alert()`/toast genérico sem estrutura de 3 partes para
  erros de pré-requisito

---

## Ordem de Execução Recomendada

1. Bloco 1 (fundação de autorização — tudo mais depende dele para ser
   *aplicado*, embora o schema de cada bloco possa ser desenhado em
   paralelo)
2. Bloco 4 (depósitos — desbloqueia o roteamento correto do Bloco 2)
3. Bloco 2 (amostra da engenharia)
4. Bloco 3 (semáforo de handoff — pode ser paralelo ao Bloco 2/4, é
   aditivo e não depende de schema novo além de leitura)
5. Bloco 5 (permissão de NF-e — trivial após Bloco 1 concluído)
6. Bloco 6 (alertas didáticos — sem dependência de schema, pode começar a
   qualquer momento em paralelo; recomenda-se iniciar os componentes
   padrão de frontend (6.2) cedo, para que os Blocos 1–5 já os consumam
   em suas telas novas em vez de precisar de retrofit depois)

## Decisões do Dono — Todas Confirmadas em 2026-08-03 (Não Bloqueiam Mais o Início de Código)

As 6 decisões antes listadas como pendentes foram confirmadas pelo dono.
Resumo (detalhamento completo em `docs/business/01-USE_CASES.md`, seção
"Decisões do dono sobre pontos antes em aberto", e em
`docs/business/BUSINESS_RULES.md` §§ 4/9/11/12):

- **UC-32:** bloquear a desativação de perfil com usuários ativos
  vinculados, até o admin realocar todos para outro perfil. Refletido em
  §1.2 (CRUD de perfis).
- **UC-35-Exceção:** bloqueio total com aviso didático ("Seu acesso ainda
  não foi configurado — procure o administrador"). Refletido em §1.2/§1.4.
- **UC-36:** troca de perfil vale no próximo login, **sem** invalidar a
  sessão ativa (`permission_version` **não será implementado** nesta
  entrega — fica marcado como melhoria futura opcional, ver §1.1).
  Mitigação para revogação urgente: desativar o usuário (`active=false`,
  mecanismo já existente).
- **UC-41:** emissão **e** cancelamento de NF-e restritos ao nível
  **gestor** do perfil de Vendas, sem distinção entre as duas operações.
  Refletido no Bloco 5.
- **UC-42-E:** consumo do Depósito de Laboratório em teste destrutivo é
  **vinculado ao teste** (débito automático na mesma transação do
  registro do `AcousticTestResult`), não manual. Refletido em §4.2/§4.4.
- **UC-42 §12 item 11:** permissão por depósito como **lista simples**
  (`warehouses_visible`) dentro da própria linha de permissão do módulo,
  sem tabela própria de associação perfil×depósito.

O Bloco 6 (UC-43, alertas didáticos) continua **sem decisão de negócio
pendente** — é puramente uma decisão de sequenciamento técnico (quais
endpoints priorizar para ganhar `details` estruturado primeiro, já
sugerido em §6.1) e pode iniciar imediatamente, em paralelo aos demais
blocos.

**Único ponto ainda em aberto (não fazia parte deste lote de 6, não
bloqueia início de desenvolvimento):** UC-40 — se o campo
`handoff_signal` aditivo é suficiente ou se o dono também quer um
contador/badge de notificação por módulo no menu (ver Bloco 3, §3.1).
**Atualização 2026-08-04:** uma **versão mínima e reversível** do
contador/badge foi implementada no frontend (Bloco 3.2) por instrução
explícita de uma entrega posterior — isso **não** substitui a decisão
formal do dono; se o dono decidir que não quer contador algum, basta
remover o bloco `useQuery`/`badgeCount` de `AppLayout.tsx` sem impacto em
nenhum outro contrato (backend `GET /api/dashboard/handoffs` pode
continuar existindo sem uso).
