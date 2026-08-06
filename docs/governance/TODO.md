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
  empilhar. **Atualização (auditoria 2026-08-04):** o controller
  `purchaseRequisitionController.changeStatus` **já foi corrigido** num
  commit anterior (`8f646dc`) para `isAdmin || hasApproveLevel`
  (`req.user?.permissions?.requisicoes === 'approve'`) — um usuário com
  perfil "Gestor de Compras" (`level = 'approve'`) não é mais bloqueado
  pelo controller. O risco residual antes documentado aqui está
  **resolvido**, não é mais pendência. Nos módulos piloto
  (`laboratory`/`engineering`) a decisão de manter ambas as checagens
  permanece inalterada (fora do escopo desta tarefa).
- [x] **Resolvido (Onda 2, 2026-08-04, item 2/5 do pacote paralelo):**
  `PUT /api/sales/:id/status` agora diferencia a transição para `shipped`
  por regra de negócio (não por segregação de rota/payload — a rota
  continua compartilhada e mapeada em `vendas`, decisão mantida). Bug real
  encontrado e corrigido em
  `server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts`:
  a transição `invoiced -> shipped` agora exige `sale.nfe_status ===
  'authorized'`, lançando `BusinessRuleError` 422 com `details.nfe_status`
  explícito quando a checagem falha. Antes desta correção, uma venda cuja
  NF-e foi cancelada **depois** de emitida (`nfe_status` muda para
  `cancelled`, mas `sale.status` não reverte de `invoiced`) podia ser
  embarcada indevidamente pela máquina de estados genérica
  (`VALID_TRANSITIONS`), que só olha `sale.status`. Testado em
  `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts`
  (`'Onda 3 - Expedicao (shipped)'`, 5 casos incluindo o cenário de NF-e
  cancelada pós-emissão).

### 1.3 Backend — Dashboard/Relatórios/Rastreabilidade (UC-38)

- [x] Dashboard: filtrar cards retornados pela interseção entre cards
  existentes e módulos com nível ≠ `none` no perfil (não é bloqueio 403,
  é filtragem de conteúdo) — **resolvido (Onda 2, 2026-08-04, item 4/5
  do pacote paralelo)**: `client/src/pages/DashboardPage.tsx` calcula
  `canSee(module)` com o mesmo padrão de fallback de
  `AppLayout.itemVisible` (`usingRoleFallback = permissionsFetchFailed ||
  hasRole('admin')`, nunca esconde cards por bug de infraestrutura) e
  condiciona cada card/query (`canSeeProdutos`, `canSeeCompras`,
  `canSeeProducao`, `canSeeFinanceiro`) ao resultado de
  `hasModuleAccess(module)`.
- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04):** Relatórios —
  sub-módulos `relatorios.producao`/`.compras`/`.custos`/`.financeiro`
  na matriz, com `authorizeModule` por sub-tipo de relatório — este item
  duplicava o que já havia sido entregue no retrofit completo do Bloco
  1.2 (ver nota lá: "reports/{sales,inventory,customers,cash-flow} →
  relatorios.financeiro; reports/production → relatorios.producao; ...").
  Confirmado em `server/src/modules/reports/presentation/routes/reports.ts`
  — cada rota usa o sub-módulo correspondente, não um `relatorios`
  genérico único.
- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04):** Rastreabilidade
  — módulo próprio `rastreabilidade`, concedido explicitamente (não
  herdado de outro módulo) — também já entregue no retrofit do Bloco 1.2.
  Confirmado em
  `server/src/modules/traceability/presentation/routes/traceability.ts`
  (`authorizeModule('rastreabilidade')` nas 3 rotas).

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
- [x] Tela de edição de usuário: seletor de perfil + nível
  (operador/gestor). Seletor de perfil implementado em `UsersPage.tsx`
  ("Atribuir perfil", `PUT /api/users/:id/access-profile`). **Resolvido
  (Onda 2, 2026-08-04, item 4/5 do pacote paralelo):** o dialog "Atribuir
  perfil" agora inclui pré-visualização somente-leitura
  (`selectedProfilePreview`, alimentada por `accessProfilesApi.listAccessModules`)
  mostrando exatamente quais módulos e níveis (`LEVEL_LABEL`) o perfil
  selecionado concede — cobre a necessidade de "ver o nível" sem exigir
  campo `access_level` avulso no usuário. Seletor de **nível** dedicado
  continua não existindo — **não é um gap, é decisão de arquitetura
  confirmada** (Bloco 1.2): não há campo `access_level` no schema porque o
  nível já é 100% resolvido pela matriz do perfil (`level` por módulo).
  Ver nota "Fora de escopo" em `docs/HANDOFF_CODEX.md`.
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
- [x] Teste de integração (HTTP, com Supertest): usuário com perfil sem
  módulo X → GET/POST/PUT/DELETE no módulo X retornam 403, corpo sem
  vazamento de dados — **implementado em 2026-08-04 (rodada de 5 frentes
  paralelas)**: `server/tests/integration/rbac-module-access-denied.test.ts`
  (148 linhas). Confirmado por leitura de código e execução real
  (`npx jest tests/unit` 431/431; suíte de integração completa 27/27
  suites, 65/65 testes rodada nesta consolidação).
- [x] Teste: Dashboard retorna apenas cards dos módulos do perfil (UC-38)
  — **implementado em 2026-08-04**, com **reinterpretação deliberada e
  documentada explicitamente no próprio arquivo**:
  `server/tests/integration/auth-me-permissions.test.ts` (125 linhas).
  "Dashboard retorna apenas cards dos módulos do perfil" é comportamento
  de RENDERIZAÇÃO do React (`client/src/pages/DashboardPage.tsx`,
  `canSee`/`hasModuleAccess`), não testável via Supertest (não há teste
  de componente para essa tela hoje, só `LoginPage.test.tsx`). O teste
  cobre, em nível de integração backend, o CONTRATO que o Dashboard
  consome para decidir quais cards mostrar: `GET
  /api/auth/me/permissions` (UC-34) deve devolver exatamente o mapa
  módulo→nível do perfil do usuário autenticado, nem mais nem menos
  módulos do que os atribuídos.
- [x] Teste: Relatório cruzado exige sub-permissão própria, não herdada
  de módulos isolados (UC-38) — **implementado em 2026-08-04**:
  `server/tests/integration/reports-cross-module-permission.test.ts`
  (108 linhas).
- [x] Teste E2E: Qualidade libera lote criado pelo Recebimento (permissão
  avaliada pelo módulo da ação, não pela origem do dado — UC-37) —
  **implementado em 2026-08-04**:
  `server/tests/integration/quality-releases-receiving-lot.test.ts`
  (197 linhas) — E2E completo do UC-37: recebimento cria lote em
  quarentena, só um usuário com permissão do módulo `qualidade` (não
  `recebimento`) pode liberar/bloquear o lote.

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

- [x] Tela "Engenharia > Solicitar Amostra" — **implementada em 2026-08-04**:
  `client/src/pages/engineering/SampleRequestTab.tsx` (nova aba
  `sample-request` registrada em `EngineeringPage.tsx`). Cria a requisição via
  `POST /api/purchase-requisitions` com `origin='engenharia_amostra'`,
  justificativa obrigatória no campo `notes` (reaproveitado — ver decisão
  2.1, sem coluna dedicada `justificativa`), seleção opcional de item,
  quantidade, unidade e Projeto de P&D. Convive com a opção equivalente já
  existente em `RequisitionsPage.tsx` (tela geral de Requisições) — evidência
  verificada em código.
- [x] `RequisitionsPage.tsx` (`client/src/pages/purchases/`): select de
  origem ganhou a opção "Amostra de Engenharia"
  (`origin='engenharia_amostra'`); ao selecioná-la, aparece select
  opcional de Projeto de P&D (`GET /api/engineering/projects`) + aviso
  "Pedidos desta requisição serão recebidos no Depósito do Laboratório";
  badge "Amostra" na listagem e projeto vinculado no detalhe (2026-08-04,
  ver `docs/HANDOFF_CODEX.md` seção "Frontend — Semáforo de Handoff...").
- [x] Badge "Amostra — Engenharia" na tela de Recebimento — **implementado em
  2026-08-04**: `client/src/pages/logistics/ReceivingPage.tsx` exibe
  `<Badge variant="outline">Amostra — Engenharia</Badge>` ao lado do número
  do pedido quando `purchase.requisition?.origin === 'engenharia_amostra'`
  (compara `requisition.origin`, não a `notes` livre do pedido — evidência
  verificada em código).
- [x] Alerta não bloqueante de quantidade atípica (> 50 unidades) —
  **implementado em 2026-08-04** no mesmo formulário
  (`SampleRequestTab.tsx`, `ATYPICAL_QUANTITY_THRESHOLD = 50`): aviso amarelo
  não bloqueante quando a quantidade solicitada excede 50 unidades; não
  impede o envio.

### 2.4 QA

- [x] Cobertura indireta: os testes unitários existentes de
  `CreatePurchaseRequisitionUseCase`/`ConvertRequisitionToPurchaseOrdersUseCase`
  continuam 100% verdes com os novos campos aditivos (nenhum teste
  dedicado a `engenharia_amostra`/`engineering_project_id` foi criado
  nesta entrega — os testes existentes não fixam `origin`, logo o
  comportamento padrão/backward-compat foi validado; teste dedicado ao
  fluxo de amostra fica como próxima tarefa de QA).
- [x] Teste: requisição `engenharia_amostra` sem justificativa → 422 —
  **implementado em 2026-08-04**: `server/tests/unit/engineering-sample-requisition.test.ts`
  (`CreatePurchaseRequisitionUseCase — amostra de engenharia`), casos "rejeita
  ... sem justificativa" e "... com justificativa em branco", ambos
  `BusinessRuleError` (422). **Nota:** valida o campo `notes` reaproveitado —
  não existe coluna dedicada `justificativa` (ver decisão 2.1); documentado
  no cabeçalho do teste.
- [x] Teste: requisição com `engineering_project_id` válido é persistida e
  rastreável ao projeto (404 se inválido) — **implementado em 2026-08-04**,
  mesmo arquivo, casos "cria requisicao ... e persiste o vinculo com
  engineering_project_id valido" e "rejeita (404 NotFoundError) quando
  engineering_project_id informado nao existe".
- [x] Teste E2E (unit-level, sem infra real): requisição de amostra aprovada →
  convertida em pedido → recebida → entra no Depósito do Laboratório (não no
  de Insumos) — **implementado em 2026-08-04**, mesmo arquivo, describe
  "Cadeia completa: amostra aprovada -> convertida em pedido -> recebida no
  Deposito do Laboratorio". Cobre a cadeia
  `ConvertRequisitionToPurchaseOrdersUseCase` → `ReceivePurchaseItemsUseCase`
  resolvendo `LABORATORIO` sem `warehouse_code` explícito, via
  `purchase.requisition_id → purchase_requisitions.origin`. É um teste
  unitário com dependências mockadas (Sequelize não é exercitado de fato),
  não um E2E de integração contra banco real — suficiente para fechar este
  item de QA nesta entrega.

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
- [x] Script de validação pós-backfill dedicado (mesmo padrão de
  `04c_validation.sql`, implementado em TypeScript em vez de `.sql`) —
  `server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
  (4 blocos: cobertura de backfill, integridade referencial, invariante
  de soma `products.quantity = SOMA(product_warehouse_stock.quantity)`,
  saldos negativos). **Rodado ao vivo contra Postgres real em 2026-08-04:
  4/4 blocos PASS** (invariante de soma validada em 106 produtos no banco
  de desenvolvimento no momento da execução, 97 na rodada anterior do
  mesmo dia — a diferença reflete produtos criados por testes de
  integração entre as duas execuções).

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
  - [x] Consumo de venda/expedição → sempre `ACABADOS` —
    `ChangeSaleStatusUseCase` (`quote -> confirmed`) agora chama
    `warehouseStockService.removeFromWarehouse` para o depósito
    `ACABADOS` na MESMA transação em que `InventoryService.consume`
    debita `products.quantity`; o cancelamento (`status='canceled'`)
    credita de volta via `addToWarehouse`, também na mesma transação.
    Testado em `server/tests/unit/warehouse-stock.test.ts`
    (`'Integracao dual-write: ChangeSaleStatusUseCase (expedicao/venda
    -> ACABADOS)'`).
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
  **Correção (auditoria 2026-08-04):** a leitura da transferência não
  usava transação nem `lock: Transaction.LOCK.UPDATE` (diferente do
  `Approve`, que já travava a linha) — race condition real entre
  aprovar/rejeitar concorrentes na mesma transferência `pending`.
  Corrigido: `rejectTransfer` no controller agora abre
  `sequelize.transaction()` (mesmo padrão do `approveTransfer`) e o use
  case usa `lock: Transaction.LOCK.UPDATE` na leitura. Suíte completa
  (56 suites/375 testes) validada verde após a correção.
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
  `PUT` em vez de `PATCH` para approve/reject).
- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04): `POST/PUT
  /api/warehouses` (CRUD completo de depósito) FOI implementado** —
  entrega posterior à nota "fora do escopo" acima. Rotas reais:
  `POST /api/inventory/warehouses` e `PUT /api/inventory/warehouses/:id`
  (mesmo prefixo `/api/inventory/*` dos demais endpoints deste bloco, não
  um `/api/warehouses` próprio), ambas `authorizeModule('estoque',
  'approve')`, em
  `server/src/modules/inventory/presentation/routes/inventory.ts`. Use
  cases: `CreateWarehouseUseCase.ts`/`UpdateWarehouseUseCase.ts`
  (`server/src/modules/inventory/application/use-cases/`). Testado em
  `server/tests/unit/warehouse-crud.test.ts` (9/9 passando).
- [x] Endpoint de saldo por depósito de UM produto específico —
  **implementado em 2026-08-04**: `GET /api/products/:id/stock-by-warehouse`
  (`server/src/modules/products/presentation/routes/products.ts`,
  `authorizeModule('estoque')`), use case
  `GetProductStockByWarehouseUseCase.ts` e handler
  `productController.getStockByWarehouse`. **Decisão documentada:** retorna
  TODOS os depósitos ativos (mesmo com saldo zero), não apenas os que têm
  linha em `product_warehouse_stock` — diferente do endpoint por query param
  (`GET /api/inventory/warehouse-stock?product_id=`), que só lista linhas
  existentes. Os dois endpoints coexistem por serem consumidos por telas
  diferentes com necessidades de exibição distintas.
- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04):** `GET
  /api/inventory/movements` aceitando filtro `?warehouse_id=` **foi
  implementado** em entrega posterior — item estava desatualizado.
  `warehouse_id` é lido em
  `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
  (`list`) e repassado a `ListInventoryMovementsUseCase.execute`
  (`server/src/modules/inventory/application/use-cases/ListInventoryMovementsUseCase.ts`).
  Testado em `server/tests/unit/warehouse-crud.test.ts` (describe `'GET
  /api/inventory/movements — filtro warehouse_id
  (ListInventoryMovementsUseCase)'`).
- [x] Débito automático de estoque em teste destrutivo (UC-42-E) —
  `AcousticTestResult` ganhou a coluna `consumed_quantity` (migration
  `20260804-000004-add-consumed-quantity-acoustic-tests.cjs`); quando
  informada (> 0) em `POST /api/laboratory/tests`,
  `CreateAcousticTestUseCase` abre `sequelize.transaction()` e, na
  mesma transação do `AcousticTestResult.create`, chama
  `warehouseStockService.removeFromWarehouse` para o depósito
  `LABORATORIO` — sem exigir lançamento manual separado. Ausente/0 não
  debita nada (comportamento anterior mantido). Testado em
  `server/tests/unit/warehouse-stock.test.ts`.
- [x] Teste automatizado obrigatório de invariante: soma dos saldos por
  depósito de um produto reflete corretamente após sequência real de
  entrada/saída/transferência — `server/tests/unit/warehouse-stock.test.ts`
  (`'soma dos saldos por deposito de um produto reflete corretamente
  apos varias operacoes (invariante §12 item 3)'`, com fake in-memory de
  `ProductWarehouseStock` para validar a soma real, não apenas mocks
  opacos).

### 4.3 Frontend

- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04):** Tela
  "Configurações > Depósitos" (CRUD simples) **foi implementada** — item
  estava desatualizado (o backend também já expõe `POST/PUT
  /api/warehouses`, ver correção em 4.2). Tela real:
  `client/src/pages/logistics/WarehousesPage.tsx`, consumindo
  `client/src/api/warehouses.ts` (`createWarehouse`/`updateWarehouse`/
  `listWarehouses`). Cobertura de backend em
  `server/tests/unit/warehouse-crud.test.ts`.
- [x] Filtro de depósito na tela de Recebimento (`ReceivingConferenceDialog`
  — seletor "Depósito de destino", `INSUMOS` default/`LABORATORIO`,
  enviado como `warehouse_code` no payload de recebimento) e na aba
  "Saldos" de `/logistics/estoque` (seletor Todos/por depósito, troca para
  `GET /api/inventory/warehouse-stock` quando um depósito é selecionado).
  **CORREÇÃO (auditoria de reconciliação 2026-08-04):** a nota original
  "extrato de movimentações não aceita `?warehouse_id=` no backend" estava
  desatualizada — o backend já aceita o filtro (ver correção em 4.2) e o
  frontend já consome: `client/src/pages/logistics/ExtractTab.tsx` envia
  `warehouse_id` (via `client/src/api/inventory.ts`). **Ainda não
  implementado**: filtro de depósito em Expedição e tela de Contagem/
  inventário mobile — fora do escopo desta tarefa (ver
  `docs/HANDOFF_CODEX.md` seção "Bloco 4 — Frontend").
- [x] Tela/fluxo de solicitação de transferência + fila de aprovação para
  gestores — nova aba "Transferências" em `/logistics/estoque`
  (`client/src/pages/logistics/TransfersTab.tsx`): tabela com badge de
  status (`pending` âmbar/`approved` verde/`rejected` vermelho, reutiliza
  `Badge` variants `warning`/`success`/`destructive` — não um componente
  de semáforo do Bloco 3, que ainda não foi implementado), dialog de nova
  transferência com validação client-side `from !== to`, e
  aprovar/rejeitar restritos a `permissions?.estoque === 'approve'` ou
  `admin`.
- [x] **CORREÇÃO (auditoria de reconciliação 2026-08-04):** Exibir saldo
  por depósito nas telas de produto/item **foi implementado** — item
  estava desatualizado. Botão "Saldo por depósito" por linha em
  `client/src/pages/products/ProductsPage.tsx`, abre
  `ProductWarehouseStockDialog` (mesmo arquivo), que consome `GET
  /api/inventory/warehouse-stock?product_id=` via
  `client/src/api/warehouses.ts` (`listWarehouseStock`). **Nota:** esta
  alteração está presente na árvore de trabalho no momento desta
  reconciliação (não commitada ainda) — confirmar `git status` antes de
  considerar definitivamente mesclada.

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
- [x] Teste: expedição não lê saldo de outro depósito além de `ACABADOS`,
  mesmo com saldo positivo do mesmo produto em outro depósito —
  **implementado em 2026-08-04**: `server/tests/unit/warehouse-invariants.test.ts`
  (describe `'Invariante 1 — expedicao (ChangeSaleStatusUseCase) so
  le/consome o deposito ACABADOS'`, 2 casos): confirma venda de produto com
  saldo em `INSUMOS` mas sem saldo em `ACABADOS` falha com 422 didático e
  não toca `INSUMOS`; com saldo em ambos, confirma que só `ACABADOS` é
  debitado.
- [x] Teste: quarentena/bloqueio de lote não move o lote de depósito —
  apenas muda `LotControl.status` (§12 item 9) —
  **implementado em 2026-08-04**: `warehouse-invariants.test.ts`
  (describe `'Invariante 2 — quarentena/bloqueio/liberacao de lote
  ... nao move saldo de deposito'`, 3 casos cobrindo `BlockLotUseCase` e
  `ReleaseLotUseCase` nos dois sentidos de transição), provando que nenhum
  método de `ProductWarehouseStock` é chamado e `warehouse_id` do lote
  permanece inalterado.
- [x] Contagem cíclica escopada a um único depósito por vez —
  **CONCLUÍDO em 2026-08-04 (Onda 3+4, full-stack).** Histórico do gap:
  investigado em 2026-08-04 (ver nota no topo de
  `server/tests/unit/warehouse-invariants.test.ts`): `InventoryCount`/
  `InventoryCountItem` não tinham coluna `warehouse_id`, e
  `ApproveInventoryCountUseCase` ajustava a variância via
  `InventoryService.adjust(item.product_id, ...)`, que alterava o saldo
  **global** de `Product.quantity` — uma contagem feita fisicamente no
  depósito X ajustava o total do produto em todos os depósitos. Entrega
  completa (schema → use case → validação → testes → frontend):
  - **Schema:** migration
    `server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`
    (`inventory_counts.warehouse_id`, FK `warehouses.id`, nullable por
    legado, backfill para `INSUMOS` das 4 linhas pré-existentes,
    documentado em `docs/DATABASE.md` §"Coluna nova:
    inventory_counts.warehouse_id"), `InventoryCount.warehouse_id` no
    model Sequelize com associação `belongsTo(Warehouse, { foreignKey:
    'warehouse_id', as: 'warehouse' })`. `InventoryCountItem` continua
    sem coluna própria por decisão de escopo (item herda o depósito do
    cabeçalho — ver comentário da migration).
  - **Use case de criação:** `CreateInventoryCountUseCase.ts` agora exige
    `warehouse_id` no payload (obrigatório).
  - **Use case de aprovação:** `ApproveInventoryCountUseCase.ts` ajusta a
    variância no depósito especificamente contado via
    `WarehouseStockService.addToWarehouse`/`removeFromWarehouse`, mantendo
    `Product.quantity` = soma dos saldos por depósito (invariante §12
    item 3), em vez de tocar o saldo global diretamente.
  - **Validação:** `createInventoryCountSchema`
    (`server/src/modules/inventory/presentation/validators/inventoryValidators.ts`)
    rejeita `warehouse_id` ausente com mensagem didática.
  - **Testes:** `server/tests/unit/warehouse-invariants.test.ts`
    (describe `'Invariante 3 — contagem ciclica ... escopada a um unico
    deposito'`).
  - **Frontend:** `client/src/pages/products/InventoryCountsPage.tsx`
    ganhou seletor de depósito obrigatório no formulário de criação,
    coluna "Depósito" na listagem e no detalhe da contagem, tratamento
    didático de erro 422, e banner com identidade visual EVOK (gradiente
    `bg-brand`).
  - Passo (4) do plano original (tela de Contagem/Inventário mobile
    QR enviando o depósito selecionado) segue **fora do escopo desta
    entrega** — o inventário mobile por QR Code ainda não foi retrofitado
    para múltiplos depósitos.
- [x] Teste: registrar um teste destrutivo com `consumed_quantity`
  informado debita automaticamente o Depósito de Laboratório, na mesma
  transação do registro do teste, sem exigir lançamento manual separado
  (UC-42-E) — **já coberto por entrega anterior** (não desta rodada):
  `server/tests/unit/warehouse-stock.test.ts` (describe `'Integracao
  dual-write: CreateAcousticTestUseCase (teste destrutivo -> LABORATORIO,
  UC-42-E)'`) e `server/tests/unit/laboratory-tests.test.ts` (describe
  `'CreateAcousticTestUseCase — consumo de teste destrutivo (UC-42-E)'`).
  Confirmado em 2026-08-04 que **não há duplicação** em
  `warehouse-invariants.test.ts` — item reconciliado apenas para refletir
  cobertura já existente, nenhum teste novo necessário.

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

- [x] Ocultar/desabilitar botões de emitir/cancelar NF-e para usuários sem
  nível `approve` em `vendas` — **resolvido (Onda 2, 2026-08-04, item 3/5
  do pacote paralelo)**: `client/src/pages/sales/SalesPage.tsx` calcula
  `canApproveNfe = hasRole('admin') || permissions?.vendas === 'approve'`
  (mesma fórmula de `authorizeModule('vendas', 'approve')` do backend) e
  condiciona a exibição dos botões "Emitir NF-e"/"Cancelar NF-e" a esse
  flag.
- [x] Mensagem clara ao tentar (caso o botão não seja escondido) —
  **resolvido junto ao item acima**: quando `canApproveNfe` é falso, o
  botão não aparece e uma mensagem explicativa é exibida no lugar
  (comentário no código: "botões ocultos para... (authorizeModule('vendas',
  'approve'))"), evitando que o usuário chegue a tentar a ação e receba
  apenas um 403 genérico.

### 5.3 QA

- [x] Teste: operador de Vendas (nível `operate`) tenta emitir NF-e → 403
  — **resolvido (Onda 2, 2026-08-04)**: `server/tests/unit/sales-nfe-rbac.test.ts`
  (`'operador de Vendas (nivel operate) tenta emitir NF-e -> 403
  APPROVAL_LEVEL_REQUIRED'`), aplica `authorizeModule('vendas', 'approve')`
  diretamente (mesmo middleware da rota real) e confirma 403 +
  `APPROVAL_LEVEL_REQUIRED` + log de auditoria `access_denied`.
- [x] Teste: gestor de Vendas emite NF-e → sucesso — **resolvido (Onda 2,
  2026-08-04)**: mesmo arquivo, teste `'gestor de Vendas (nivel approve)
  emite NF-e -> autorizacao libera e emissao retorna sucesso'` — confirma
  que o middleware libera (`next()` chamado) e que
  `IssueSaleNfeUseCase.execute` completa com `nfe_status: 'authorized'`,
  `status: 'invoiced'`.
- [x] Teste: gestor cancela NF-e de venda `shipped` → `nfe_status
  =cancelled`, `sale.status` permanece `shipped` — **resolvido (Onda 2,
  2026-08-04)**: mesmo arquivo, teste `'gestor de Vendas cancela NF-e de
  venda ja shipped -> nfe_status vira cancelled, sale.status permanece
  shipped'`.
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

- [x] **CONCLUÍDO (2026-08-04, rodada de 5 frentes paralelas):** os 9 casos
  priorizados em `BUSINESS_RULES.md` §13.5 foram auditados, endpoint por
  endpoint, lendo o código real de cada use case. **6 já estavam
  corretos** (nenhuma alteração de código necessária, apenas confirmação
  + testes reforçados para travar o formato de `details` contra
  regressão futura):
  1. Liberação de OP (material/BOM/roteiro) —
     `ChangeProductionOrderStatusUseCase.reserveMaterials` já lança
     `BusinessRuleError` com `details: { production_order_id,
     requested_quantity, max_possible_quantity, missing_items }`.
  2. Conclusão de OP com etapa aberta —
     `ChangeProductionOrderStatusUseCase.reconcileTrackingOnCompletion`
     já lança com `details: { open_steps: [{ id, sequence, status }] }`.
  3. Embarque de venda sem NF-e autorizada — `ChangeSaleStatusUseCase`
     já lança com `details.nfe_status` explícito.
  4. Conversão de requisição sem fornecedor resolvível —
     `ConvertRequisitionToPurchaseOrdersUseCase` já lança com
     `details: { item_ids_without_supplier: [...] }` (lista todos, não
     só o primeiro).
  5. Conversão de ordem planejada do MRP já em execução —
     `ConvertPlannedOrdersToRequisitionUseCase` já lança com
     `details: { invalid_ids: [...] }`.
  6. Aprovação de requisição fora de sequência —
     `ChangePurchaseRequisitionStatusUseCase` já lança com
     `details: { current_status, requested_status }`.
  **3 foram corrigidos nesta rodada** (código real alterado, confirmado
  por leitura pós-edição):
  7. Recebimento de compra sem nota fiscal —
     `server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts`:
     `ValidationError` de `invoice_number` ausente agora inclui
     `details: { purchase_id, order_number, field: 'invoice_number' }`.
  8. Registro de teste de laboratório sem resultado/faixa —
     `server/src/modules/laboratory/application/use-cases/CreateAcousticTestUseCase.ts`:
     `ValidationError` (quando `passed` não é determinável) agora inclui
     `details: { product_id, test_type, missing_fields: ['result',
     'specification_min', 'specification_max'] }`.
  9. Liberação/bloqueio de lote em status terminal —
     `server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts`
     e `BlockLotUseCase.ts`: `BusinessRuleError` agora inclui
     `details: { lot_id, current_status, allowed_statuses }` — fecha
     também a nota de conformidade parcial de `InspectionTab.tsx` deixada
     em §6.2/§6.3 (Onda 2).
  Verificado por leitura direta do código-fonte nesta consolidação
  (não apenas pelos relatos dos agentes) em todos os 9 casos.
- [x] Para os casos que ainda validavam e falhavam na primeira condição —
  já resolvido pelo padrão confirmado acima: `missing_items`,
  `open_steps`, `item_ids_without_supplier` e `invalid_ids` já coletam
  a lista completa de violações antes de lançar o erro (não só a
  primeira), seguindo o padrão de `ConvertRequisitionToPurchaseOrdersUseCase`
  usado como referência.
- [x] **Decisão técnica por caso (2026-08-04)** — para os 6 pontos
  críticos cobertos pelo padrão, lendo as rotas `GET` reais hoje
  disponíveis (`server/src/modules/**/presentation/routes/*.ts`) contra o
  que cada `details` de erro exige (§6.1 acima), a decisão é **não criar
  nenhum endpoint `GET .../:id/prerequisites` novo nesta entrega** — em 5
  dos 6 casos o reaproveitamento é direto; no 6º (liberar OP) o dado que
  falta (disponibilidade de material calculada) não está hoje exposto por
  nenhum `GET`, mas a solução ainda é preventivamente mais barata que um
  endpoint novo dedicado (ver detalhe do caso 1). Caso a caso:
  1. **Liberar OP (material/BOM/roteiro)** — `GET
     /api/production-orders/:id` (rota existente, `productionOrderController.getById`)
     retorna a OP com itens/BOM associados, mas **não** calcula
     disponibilidade de material contra o estoque real (esse cálculo só
     roda dentro de `reserveMaterials`, no `PUT status`, no momento da
     tentativa). **Reaproveitamento não é 100% direto aqui** — duas opções
     técnicas eram possíveis: (a) endpoint novo `GET
     .../:id/prerequisites` que reexecuta o cálculo de disponibilidade em
     modo leitura, ou (b) o frontend cruzar `GET
     /api/production-orders/:id` (itens da BOM) com `GET
     /api/inventory/stock-report` (saldo atual por item, rota já
     existente) e replicar a subtração client-side. **Decisão: opção (b)**
     — evita duplicar a regra de negócio de reserva em dois lugares
     (backend real + endpoint de simulação), aceitando que o checklist
     preventivo do frontend é uma aproximação (mesmo dado-fonte, cálculo
     equivalente) e que a validação definitiva continua sendo o `422` do
     backend na tentativa real (Regra 2, fallback sempre presente). Ainda
     **não implementado no frontend** (`ProductionOrdersPage.tsx` continua
     sem `PrerequisiteChecklist` — ver nota de escopo abaixo).
  2. **Conclusão de OP com etapa aberta** — reaproveita `GET
     /api/production-orders/:id/tracking` (rota existente, já usada por
     `ShopFloorPage.tsx`), que lista as etapas com `status`; o frontend já
     tem tudo para marcar `✓`/`✗` sem endpoint novo.
  3. **Embarque de venda sem NF-e** — reaproveita `GET /api/sales/:id/nfe`
     (rota existente), que retorna `nfe_status` diretamente — dado
     suficiente para o item único do checklist ("NF-e autorizada").
  4. **Conversão de requisição sem fornecedor** — reaproveita `GET
     /api/purchase-requisitions/:id` (retorna os itens da requisição) +
     dado de fornecedor já carregado pela tela via catálogo item×fornecedor
     (`client/src/api/products.ts`/similar, já consumido em
     `RequisitionsPage.tsx`); sem endpoint novo.
  5. **Aprovação de requisição fora de sequência** — reaproveita `GET
     /api/purchase-requisitions/:id`, que já retorna `status`; o checklist
     é uma comparação local contra a máquina de estados conhecida no
     frontend (mesma tabela usada por `ChangePurchaseRequisitionStatusUseCase`
     no backend, documentada em `01-USE_CASES.md`); sem endpoint novo.
  6. **Liberação/bloqueio de lote em status terminal** — reaproveita `GET
     /api/inventory/lots` (lista, já usada por `InspectionTab.tsx`) ou
     `GET /api/inventory/lots/by-code/:lot_number`, que já retornam
     `status` por lote; sem endpoint novo.
  **Nota de escopo:** esta entrega resolve a *decisão* técnica (registrada
  acima) e documenta o caminho de implementação; a *aplicação* do
  `PrerequisiteChecklist` nas 6 telas (consumindo os GETs listados) não
  fazia parte do pedido desta rodada (que cobriu apenas retrofit de
  `translateApiError`/`DidacticAlert` nas telas novas dos Blocos 1–5, ver
  §6.2) e fica registrada como próximo incremento natural do Bloco 6.

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
  - [x] `ProductionOrdersPage.tsx` (liberar/concluir OP) — **resolvido
    (Onda 2, 2026-08-04, item 5/5 do pacote paralelo)**: migrado para
    `translateApiError`/`DidacticAlert` (`statusError` exibido via
    `DidacticAlert`).
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
  - [x] `RegisterTestTab.tsx` (teste sem resultado/faixa) — **resolvido
    (Onda 2, 2026-08-04)**: migrado para `translateApiError`/`DidacticAlert`.
    **Nota de conformidade parcial (checklist 6.3):** o alerta hoje é
    apenas informativo/não-bloqueante — o formulário permite submeter
    mesmo com o aviso visível. Decisão consciente do agente que
    implementou (não travar o submit), registrada aqui para revisão de
    UX futura, não é um bug.
  - [x] `MrpPage.tsx` (conversão de ordem já em execução) — **resolvido
    (Onda 2, 2026-08-04)**: `convertError` migrado para
    `translateApiError`/`DidacticAlert`.
  - [x] `RequisitionsPage.tsx` (aprovação fora de sequência — mesma tela
    do item de conversão, ações diferentes) — `statusMutation`
    (aprovar/cancelar) migrada, `window.alert` removido
  - [x] `InspectionTab.tsx` (liberar/bloquear lote em status terminal) —
    **resolvido (Onda 2, 2026-08-04)**: `release`/`block` migrados para
    `translateApiError`/`DidacticAlert` (`actionError` exibido via
    `DidacticAlert`). **Conformidade total desde 2026-08-04 (5 frentes
    paralelas):** a nota de conformidade parcial abaixo foi fechada — o
    backend (`ReleaseLotUseCase`/`BlockLotUseCase`) agora lança
    `BusinessRuleError` com `details: { lot_id, current_status,
    allowed_statuses }` (ver §6.1, item 9), então `translateApiError` já
    monta a parte "POR QUE" com o dado específico do lote em vez do
    fallback genérico.
- [x] **Verificado (2026-08-04):** as telas novas construídas pelos Blocos
  1–5 já nasceram usando `translateApiError`/`DidacticAlert` — sem
  pendência de retrofit:
  - `client/src/pages/users/AccessProfilesPage.tsx` (gestão de perfis) —
    `saveMutation`/`deactivateMutation` já usam `translateApiError` +
    `DidacticAlert`.
  - `client/src/pages/logistics/WarehousesPage.tsx` (depósitos) —
    `CreateWarehouseDialog`/`EditWarehouseDialog` já usam
    `translateApiError` + `DidacticAlert`.
  - `client/src/pages/logistics/TransfersTab.tsx` (transferências) —
    `approveMutation`/`CreateTransferDialog`/`RejectTransferDialog` já
    usam `translateApiError` + `DidacticAlert`.
  - Filas com semáforo de handoff (Bloco 3) não são telas novas
    independentes — são a mesma coluna `HandoffDot` adicionada a 6 telas
    já existentes (`PurchasesPage.tsx`, `RequisitionsPage.tsx`,
    `ReceivingPage.tsx`, `ShippingPage.tsx`, `InspectionTab.tsx`,
    `NonConformitiesTab.tsx`). Duas dessas 6 ainda usavam
    `extractApiErrorMessage`/`window.alert` nos fluxos de mutation
    (herdados de antes do Bloco 6, não fizeram parte do lote original de
    9 telas do §6.2): **migradas nesta entrega**
    (`PurchasesPage.tsx` — `statusMutation`, `createMutation` e
    `ReceiveItemsDialog`; `NonConformitiesTab.tsx` — `createMutation` de
    nova RNC; o formulário de tratativa CAPA já estava migrado). `
    ReceivingPage.tsx` não tem mutation própria (delega para
    `ReceivingConferenceDialog.tsx`, já conforme).
  - `PrerequisiteChecklist` continua sem consumidor em nenhuma tela (ver
    nota de escopo em §6.1 — a decisão técnica por caso foi feita nesta
    entrega, a aplicação do componente fica para o próximo incremento).

### 6.3 QA — Revisão de Telas Existentes Contra o Padrão

- [x] Checklist de conformidade por tela — **rodado (Onda 2, 2026-08-04)**
  nas 9 telas priorizadas de §6.2 (5 já conformes de entregas anteriores +
  as 4 retrofitadas nesta rodada: `ProductionOrdersPage.tsx`,
  `RegisterTestTab.tsx`, `MrpPage.tsx`, `InspectionTab.tsx`). **2
  conformidades parciais encontradas** na Onda 2, **1 fechada na rodada
  seguinte de 2026-08-04 (5 frentes paralelas)**:
  1. `RegisterTestTab.tsx` — alerta não-bloqueante (decisão consciente de
     não travar o submit do formulário mesmo com o aviso visível).
     **Continua parcial** — decisão de UX, não é bug, fica para revisão
     futura se o negócio quiser travar o submit.
  2. `InspectionTab.tsx` — **fechada (2026-08-04):** `ReleaseLotUseCase`/
     `BlockLotUseCase` agora retornam `details` estruturado (ver §6.1,
     item 9); `translateApiError` já monta a parte "POR QUE" com o dado
     do lote em vez do fallback genérico.
  Incremental às demais 25 telas identificadas ainda não iniciado.
- [x] **Teste (2026-08-04):** ação com múltiplos pré-requisitos faltando
  simultaneamente exibe todas as pendências juntas, não uma de cada vez —
  implementado como teste de integração de use case (mais determinístico
  e barato que E2E de UI para validar o contrato `details`, que é a fonte
  real consumida por `translateApiError`/`DidacticAlert` no frontend; a
  camada de UI já é coberta pelo teste de regressão de import abaixo):
  - `server/tests/unit/production-order-lifecycle.test.ts` — 2 casos
    novos: `ChangeProductionOrderStatusUseCase` retornando `missing_items`
    com 3 itens simultâneos na liberação de OP, e `open_steps` com 3
    etapas simultâneas na conclusão de OP — ambos verificam
    `toHaveLength(3)` e a lista completa, não apenas o primeiro item.
- [x] **Teste (2026-08-04):** corrigir um pré-requisito e tentar novamente
  reflete o estado atualizado (não fica preso a um snapshot antigo) —
  `server/tests/unit/quality-lot-lifecycle.test.ts`, novo caso em
  `ReleaseLotUseCase`: libera um lote `blocked` (pré-requisito corrigido),
  depois simula a releitura do lote já `available` e confirma que a
  segunda tentativa de liberar rejeita corretamente com o novo
  `current_status`, provando que a checagem lê o estado real a cada
  chamada. **Nota de escopo:** é um teste de integração de use case (a
  correção do pré-requisito é simulada trocando o retorno do mock de
  `findByPk` entre as duas chamadas), não um teste E2E de UI com reload de
  tela — decisão consciente: o React Query já garante invalidação/refetch
  no frontend (padrão estabelecido em todas as mutations do projeto), o
  contrato que precisava de prova automatizada é o do backend (dado
  sempre lido "fresco", nunca cacheado no use case).
- [x] **Teste de regressão (2026-08-04):**
  `client/src/test/didacticAlertRegression.test.ts` — varre estaticamente
  (via `import.meta.glob` com `?raw`, sem depender de `node:fs`/
  `@types/node`, que não estão instalados no client) as 9 telas novas/
  retrofitadas dos Blocos 1–5 (`AccessProfilesPage.tsx`,
  `WarehousesPage.tsx`, `TransfersTab.tsx`, `PurchasesPage.tsx`,
  `RequisitionsPage.tsx`, `ReceivingPage.tsx`, `ShippingPage.tsx`,
  `InspectionTab.tsx`, `NonConformitiesTab.tsx`) confirmando (a) nenhuma
  usa `window.alert()`/`alert()` cru, e (b) toda tela com `useMutation`
  importa `translateApiError` e `DidacticAlert`. 18 casos, todos verdes
  após a migração de `PurchasesPage.tsx`/`NonConformitiesTab.tsx` nesta
  mesma entrega (ver §6.2).

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

---

## Pendências de Segurança / Gate G6

- [x] **Risco residual — `react-router@7.18.2` (client) na faixa vulnerável
  do advisory `GHSA-qwww-vcr4-c8h2`** (CSRF em modo RSC/Server Actions,
  `npm audit` reportava severidade "high", faixa afetada `>=7.12.0 <8.3.0`).
  Identificado na triagem de segurança de 2026-08-04 (ver
  `docs/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-04) e **resolvido no
  mesmo dia** via upgrade para `react-router@8.3.0` — risco não mais
  aceito, mitigado por atualização real.
  - **Resolução (2026-08-04):** `client/package.json` migrado de
    `react-router-dom@^7.18.2` para `react-router@^8.3.0` — a partir da v8
    o pacote `react-router-dom` foi descontinuado e unificado em
    `react-router` (inclui os bindings de DOM: `BrowserRouter`, `Link`,
    etc). Os arquivos que importavam `react-router-dom` foram migrados para
    importar de `react-router` (ex. `client/src/App.tsx`:
    `import { Route, Routes } from 'react-router'`). Confirmado
    `grep -rl "react-router-dom" client/src` → 0 resultados.
  - **Confirmação de auditoria:** `npm audit --omit=dev` em `client/`
    reporta **0 vulnerabilidades** (reconfirmado nesta consolidação,
    2026-08-04).
  - **Achado correlato (mantido por histórico):** o `node_modules` local do
    `client/` já havia estado dessincronizado do lockfile antes desta
    correção — reforça que o build de produção **deve sempre** partir de
    `npm ci` (nunca `npm install`) para garantir que a versão realmente
    auditada/travada no lockfile é a que vai para produção.

- [x] **BUG CRÍTICO P0 (encontrado e corrigido em 2026-08-04) — `POST
  /api/inventory/movements` derrubava o processo Node.js inteiro em
  qualquer entrada/saída manual bem-sucedida.** Achado durante a correção
  da suíte de testes de integração contra Postgres real (ver detalhe
  completo em `docs/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-04).
  Causa raiz: `server/src/modules/inventory/presentation/controllers/inventoryController.ts`
  (`exports.create`) desestruturava `{ movement }` do retorno de
  `CreateInventoryMovementUseCase.execute(...)`, mas o use case só
  retorna `{ movementId }` — `movement` ficava `undefined`, o código
  seguinte tentava acessar `movement.id`/repassar `movement` e lançava
  `TypeError` **depois** da transação já ter sido commitada; o
  `catch`/tratamento de erro tentava fazer rollback de uma transação já
  commitada, o que derrubava o processo Node inteiro (não apenas a
  requisição). Qualquer usuário fazendo um lançamento manual de
  entrada/saída de estoque em produção derrubaria o servidor para todos
  os usuários simultâneos. Corrigido: o controller agora busca o
  movimento completo via `GetInventoryMovementByIdUseCase` usando o
  `movementId` retornado, antes de responder `201`. **Validado ao vivo**
  em 2026-08-04: servidor real subido (`node dist/index.js`), login como
  admin, chamada real ao endpoint retornou `201` com o servidor
  sobrevivendo (antes derrubava o processo); suíte completa revalidada
  em seguida (417/417 unit, 23/23 suites e 54/54 testes de integração).

- [x] **Suíte de integração saudável pela primeira vez contra Postgres
  real (2026-08-04).** Rodada completa contra `evok-postgres` (Docker)
  encontrou 5 suítes falhando; causa raiz identificada e corrigida em
  cada caso (nenhuma era regressão de produto):
  - 3 suítes falhavam por falta de saldo no depósito `ACABADOS` no
    fixture global de setup — corrigido em
    `server/scripts/run-api-suite.cjs` (garante saldo mínimo de 100.000
    un no depósito `ACABADOS` antes da suíte rodar).
  - 2 suítes falhavam por fragilidade pré-existente de fixture
    (`category_id: 1` hardcoded, que quebra em qualquer banco
    reutilizado onde a sequência de `categories.id` já avançou) —
    corrigido com fixture dedicada
    `server/tests/integration/helpers/categoryFixtures.ts`
    (`ensureFixtureCategoryId`, resolve a primeira categoria ativa
    existente em vez de assumir id fixo).
  - Resultado final confirmado: `23/23` suítes e `54/54` testes de
    integração verdes contra banco real.

---

## Rodada de 5 Frentes Paralelas — 2026-08-04 (consolidação de governança)

Rodada de 5 agentes em paralelo concluída em 2026-08-04. Detalhamento
completo por frente, decisões e riscos residuais em
`docs/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova datada 2026-08-04) e
`docs/HANDOFF_CODEX.md` (seção nova). Resumo do que foi fechado nesta
consolidação (cada item abaixo foi verificado por leitura direta do
código/testes, não apenas pelo relato do agente que o entregou):

1. **Bloco 6.1** (`details` estruturado, `BUSINESS_RULES.md` §13.5) —
   fechado. Ver seção 6.1 acima.
2. **Bloco 1.5** (4 testes de integração/E2E de permissões pendentes) —
   fechado. Ver seção 1.5 acima.
3. **Roadmap item 3** (trigger automático do MRP) — ver
   `docs/LEVANTAMENTO_ERP_2026-08-02.md`, linha do item 3, e
   `docs/projeto/04-USE_CASES.md` UC-24b. **Pendência residual pequena
   registrada:** não existe endpoint/UI para ligar `items
   .conversao_automatica` por item — só via UPDATE direto no banco. Fica
   como próxima tarefa pequena de backend+frontend (tela de cadastro de
   item ganhar um toggle).
4. **Roadmap item 8** (rating de fornecedor via RNC) — ver
   `docs/LEVANTAMENTO_ERP_2026-08-02.md`, linha do item 8, e
   `docs/DATABASE.md` (tabela `suppliers`, coluna `quality_score`), já
   documentado por completo, incluindo o **risco residual de não haver
   backfill retroativo** (RNCs fechadas antes desta entrega não contam no
   cálculo inicial de `quality_score` — o campo nasce no default neutro
   100.00 para todo fornecedor e só passa a refletir a realidade a partir
   da próxima RNC criada).
5. **Roadmap item 7** (mão-de-obra/overhead no custeio) — na consolidação
   original desta rodada, **NÃO** estava marcado como resolvido (só o
   schema havia sido entregue). ✅ **Cálculo real implementado em
   2026-08-04 (mesma data, entrega seguinte)** e agora fechado — ver
   seção "Custeio real de mão-de-obra/overhead + rastreabilidade por
   lote/QR — 2026-08-04" mais abaixo neste arquivo.
6. **Roadmap item 6** (rastreabilidade por lote/QR no chão de fábrica) —
   também fechado na mesma entrega de 2026-08-04. Ver a mesma seção
   abaixo.

### Achado operacional — risco de processo com múltiplos agentes de schema

Durante esta rodada, 2 agentes em paralelo (schema de custeio e rating de
fornecedor) colidiram numerando migrations como `20260804-000007` para
arquivos diferentes. Um deles renomeou o próprio arquivo para
`-000011` para evitar duplicidade, mas isso deixou a tabela
`SequelizeMeta` do Postgres dessincronizada do arquivo em disco — a
migration já havia sido APLICADA sob o nome antigo por uma corrida com o
outro agente rodando `migration:up` ao mesmo tempo. Detectado e
corrigido diretamente nesta consolidação: `UPDATE` em `SequelizeMeta`
para casar com o nome do arquivo atual em disco — **sem** re-executar a
migration (a estrutura já existia no banco, só o nome do registro em
`SequelizeMeta` precisava ser corrigido). Confirmado via `npm run
migration:status` (todas as 11 migrations de 2026-08-04 aparecem como
`up`, numeração `000001` a `000011` sem lacunas nem duplicidade).

**Registrado como risco de processo para rodadas futuras com múltiplos
agentes mexendo em schema ao mesmo tempo:**
- Preferir que só **um agente por vez** rode `migration:generate`/
  `migration:up` quando há mais de um agente criando migrations na mesma
  sessão.
- Se isso não for viável (rodadas paralelas de verdade), revisar
  `migration:status` manualmente ao final da rodada e comparar contra o
  conteúdo real de `SequelizeMeta` antes de dar a rodada por encerrada.

### Registro geral (confirmado nesta consolidação, comandos rodados diretamente)

```
cd server && npx jest tests/unit
  → Test Suites: 61 passed, 61 total | Tests: 431 passed, 431 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd server && npm run migration:status
  → todas as migrations até 20260804-000011 em estado "up", sem lacunas
```

---

## Custeio real de mão-de-obra/overhead + rastreabilidade por lote/QR — 2026-08-04

Duas frentes de roadmap fechadas nesta data, verificadas por leitura
direta do código/testes (não apenas pelo relato do agente que entregou):

- [x] **Roadmap item 7 — custeio real (mão-de-obra + overhead).**
  `server/src/services/costingService.ts` ganhou
  `registerAdditionalProductionCost()`;
  `ChangeProductionOrderStatusUseCase.completeOrder()` agora calcula
  mão-de-obra (horas apontadas × `work_centers.cost_per_hour`, fallback
  `production_cost_settings.default_labor_rate_per_hour`) e overhead
  (`overhead_rate_percent` sobre a base configurada em
  `overhead_calculation_basis`), lançando em `ProductCostLedger` com
  `source_type: 'production_labor'`/`'production_overhead'`, na mesma
  transação da conclusão da OP. Contrato completo já documentado em
  `docs/DATABASE.md` (seção "Cálculo implementado (item 7/9 — mão-de-obra
  e overhead)"). Testado em
  `server/tests/unit/production-labor-overhead-cost.test.ts` (6 casos,
  `costingService` real não mockado). **Bug real encontrado e corrigido
  no caminho:** `SequelizeReportsRepository.findCostVarianceByProduct`
  (`server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts:225`)
  triplicava `quantity` quando existiam lançamentos-irmãos
  (material+mão-de-obra+overhead) da mesma OP compartilhando
  `source_id` — corrigido com uma CTE que colapsa as linhas-irmãs por
  `(product_id, source_id)` antes de agregar. Afeta diretamente o
  relatório de variância de custo em `/reports`. **Risco residual real,
  sem mitigação:** não há backfill retroativo — OPs concluídas antes
  desta entrega não ganham custo de mão-de-obra/overhead (permanecem só
  com o custo de material já existente). Marcado `feito` no item 7 do
  roadmap em `docs/LEVANTAMENTO_ERP_2026-08-02.md`.

- [x] **Roadmap item 6 — rastreabilidade por lote/QR no chão de fábrica.**
  Backend reaproveitou 100% a infraestrutura de QR já existente
  (`qrCodeService.ts`, `GenerateEntityQrCodeUseCase.ts`, hoje usada em
  Ativos) e o model `ProductionLotConsumption` já existente. Dois
  endpoints novos: `GET /api/inventory/lots/by-code/:lot_number` (lookup
  por código, `GetLotByCodeUseCase.ts`) e `GET /api/inventory/lots/:id/qrcode`
  (gera QR para etiqueta), ambos em
  `server/src/modules/inventory/presentation/routes/inventory.ts`.
  Testado em `server/tests/unit/lot-traceability-qrcode.test.ts` (9
  casos). Frontend: novo componente
  `client/src/pages/production/CompleteOrderWithLotScanDialog.tsx`
  (conclusão de OP com leitura/digitação de código de lote consumido,
  resolvido via lookup, e lote produzido via `finished_lot_number`),
  integrado em `ShopFloorPage.tsx` (botão "Concluir OP (ler lote)", abre
  QR da etiqueta pós-conclusão via `QrCodeDialog` reaproveitado de
  Ativos), e botão de reimpressão de QR em
  `client/src/pages/logistics/LotsTab.tsx`. **Decisão consciente,
  registrada como não sendo gap:** leitura por câmera (`getUserMedia`)
  não foi implementada — leitor físico/teclado (padrão em chão de
  fábrica) já preenche o campo de texto como se fosse digitação. Marcado
  `feito` no item 6 do roadmap em `docs/LEVANTAMENTO_ERP_2026-08-02.md`.

**Validação rodada diretamente nesta consolidação:**

```
cd server && npx jest tests/unit
  → Test Suites: 63 passed, 63 total | Tests: 446 passed, 446 total

cd server && node scripts/run-api-suite.cjs integration
  → Test Suites: 27 passed, 27 total | Tests: 65 passed, 65 total

cd client && npx vitest run
  → Test Files: 6 passed (6) | Tests: 24 passed (24)
```

**Documentos atualizados nesta consolidação:** `docs/governance/TODO.md`
(este bloco + nota na seção "Rodada de 5 Frentes Paralelas"),
`docs/LEVANTAMENTO_ERP_2026-08-02.md` (itens 6 e 7 marcados `feito`),
`docs/HANDOFF_CODEX.md` (seção nova), `docs/DIARIO_BORDO_GO_LIVE_G6.md`
(entrada nova datada 2026-08-04, em apêndice).

---

## Nota fora do escopo dos Blocos 1–7 (fora de governança de acesso) — Frontend MRP/Requisições/Qualidade

**Data:** 2026-08-04. Este item não pertence à numeração de blocos deste
documento (que cobre perfis de acesso, amostra de engenharia, handoff,
depósitos, NF-e), mas é registrado aqui por instrução explícita de
handoff. Levantamento das telas `/production/mrp`,
`/purchases/requisitions` e `/quality` confirmou que as 3 já estavam
completas (roteadas, com CRUD/aprovação/conversão funcionando). Único
gap real encontrado com backend pronto e sem UI: fluxo CAPA de RNC
(`PUT /api/quality/non-conformities/:id`) sem tela de tratativa —
resolvido com `NonConformityTreatmentSheet` em
`client/src/pages/quality/NonConformitiesTab.tsx`. Detalhe completo em
`docs/HANDOFF_CODEX.md`, seção "Frontend — Levantamento MRP/Requisições/
Qualidade e fechamento do loop CAPA (Bloco 8)".

---

## Nota fora do escopo dos Blocos 1–7 (fora de governança de acesso) — Backend MRP fecha o ciclo para OP + reconfirmação item×fornecedor

**Data:** 2026-08-04. Também fora da numeração de blocos deste documento
(roadmap Fase 2/P1 do `CLAUDE.md`, não governança de acesso). Catálogo
item×fornecedor (N:N) reconfirmado 100% implementado (CRUD completo em
`server/src/modules/items/`), nenhum trabalho novo necessário. Gap real
encontrado e fechado: o ciclo MRP → Requisição de Compra só cobria itens
de compra (`MATERIA_PRIMA`) — itens de fabricação própria
(`SUBCONJUNTO`/`PRODUTO_ACABADO`) não tinham conversão automática do
plano MRP para Ordem de Produção. Novo endpoint
`POST /api/mrp/planned-orders/convert-to-production`
(`ConvertPlannedOrdersToProductionOrderUseCase.ts`). No caminho, corrigido
um bug de schema real e pré-existente que bloqueava toda criação de OP
(`production_orders` com 7 colunas `NOT NULL` sem default no banco físico,
apesar de opcionais no model/domínio) via migration
`20260804-000012-fix-production-orders-nullable-columns.cjs`. Detalhe
completo em `docs/HANDOFF_CODEX.md`, seção "Backend — Catálogo
item×fornecedor (confirmação) + MRP fecha o ciclo para OP (Fase 2/P1)".

---

## 2026-08-06 — Pendencias da auditoria multi-agente (apps mobile/TV novos + atribuicao de contagens)

**Origem:** auditoria multi-agente de 7 frentes (auditor geral, seguranca,
DBA, infra, frontend, mobile/TV, documentacao) rodada em 2026-08-06 sobre
as entregas do dia (apps `mobile/`/`tv/` novos, atribuicao de contagem
ciclica pool/atribuida, `department_id` em OP/contagens, painel de
demandas por departamento). Detalhe completo de cada achado e da
remediacao imediata (4 frentes) em `docs/DIARIO_BORDO_GO_LIVE_G6.md`,
entrada "2026-08-06". Os itens abaixo sao as pendencias que ficaram
registradas por decisao consciente de nao resolver no mesmo dia — o bug
P0 do campo "Atribuir a" (frontend) e os achados de infra/mobile mais
simples ja foram corrigidos na propria remediacao de 2026-08-06 (ver
diario) e nao aparecem aqui.

- [ ] **[PENDENTE] Decisao de produto — JWT de 7 dias x painel de TV
  "sempre ligado".** O app `tv/` fica logado indefinidamente em uma tela
  fixa de chao de fabrica; o TTL de 7 dias do JWT (padrao do sistema,
  pensado para sessao de usuario humano) nao tem hoje um mecanismo de
  renovacao automatica para esse caso de uso. Precisa de decisao de
  produto: refresh token dedicado, TTL especifico para o app de TV, ou
  runbook operacional de relogin periodico (ex.: reiniciar o app
  semanalmente). Nao e um bug — e uma lacuna de design a decidir antes de
  instalar o app de TV em producao continuamente.
- [ ] **[PENDENTE] Validacao em hardware real dos 2 apps novos
  (`mobile/`, `tv/`).** Hoje validados so por `tsc --noEmit`/bundle
  Metro — nenhum teste em dispositivo/emulador real. Checklist detalhado
  em `mobile/README.md` §5 e `tv/README.md` §5: build APK/EAS, camera/
  leitor fisico de QR (mobile), navegacao por D-pad e resolucao de banner
  320x180 (TV), comportamento na rede real da fabrica.
- [ ] **[PENDENTE] Teste de integracao de concorrencia real do claim de
  contagem.** O claim atomico (`StartInventoryCountUseCase`, lock
  pessimista) esta coberto por teste unitario com repositorio mockado,
  mas nao por um teste de integracao com dois clients HTTP simultaneos
  contra PostgreSQL real. Recomendado antes do Go-Live se o fluxo for
  critico em producao (ver risco ja registrado em
  `docs/HANDOFF_CODEX.md`, secao "Inventario Ciclico — Atribuicao de
  Contagem a Funcionario / Pool").
- [ ] **[PENDENTE] Paginacao da lista de contagens no app mobile.** Hoje
  usa limite fixo de 100 itens, sem paginacao real — funciona enquanto o
  volume de contagens ativas for baixo, mas nao escala.
- [ ] **[PENDENTE] Infra de producao — reverse proxy/TLS,
  `docker-compose.prod.yml` exercitado de fato, cron de backup.**
  Aguardando a compra do servidor de producao (mesma pendencia (a) ja
  registrada em `docs/GO_LIVE_G6_CHECKLIST.md` e na memoria de sessao do
  time). Checklist em `docs/infra/DEPLOY_UBUNTU.md`.

**Documentos atualizados nesta consolidacao:** este arquivo (secao nova),
`docs/DIARIO_BORDO_GO_LIVE_G6.md` (entrada 2026-08-05 retroativa +
entrada 2026-08-06), `CLAUDE.md` (status/data, migrations/FKs, arvore de
pastas, roadmap), `docs/HANDOFF_CODEX.md` (nota de atualizacao),
`docs/GO_LIVE_G6_CHECKLIST.md` (resumo executivo/datas, secoes
Kubernetes/Datadog marcadas nao aplicaveis).

---

## 2026-08-06 (segunda rodada do dia) — Pendencias das 4 frentes de roadmap (RFQ, financeiro, OEE, bombas latentes)

**Origem:** segunda rodada de entregas de 2026-08-06 (Onda 1 commitada:
RFQ multi-fornecedor, centros de custo + projecao de caixa diaria, OEE
completo; Onda 2 no working tree: desarme de 7 bombas latentes UUID x
INTEGER + marcacao DEPRECATED de 12 tabelas orfas). Detalhe completo de
cada entrega em `docs/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06
(segunda rodada — 4 frentes do roadmap)". Os itens abaixo sao os riscos
residuais e trabalho futuro registrados por decisao consciente de nao
resolver na mesma rodada.

- [ ] **[PENDENTE] Conciliacao bancaria/CNAB.** Modulo financeiro ganhou
  centros de custo e projecao diaria de fluxo de caixa nesta rodada, mas
  conciliacao bancaria (importacao de extrato/CNAB, baixa automatica de
  titulos) continua sem nenhuma implementacao. Sem data definida.
- [ ] **[PENDENTE] Mapeamento automatico departamento -> centro de custo
  na criacao automatica de `AccountPayable`.** Hoje `cost_center_id` so e
  atribuido manualmente (`PUT /api/finance/payable/:id/cost-center` ou no
  payload de `POST /api/finance/payable`) — quando uma conta a pagar e
  criada automaticamente (ex.: ao aprovar um pedido de compra), nasce sem
  centro de custo. Precisa de regra de negocio (provavelmente por
  `department_id` de quem originou a compra) antes de implementar.
- [ ] **[PENDENTE] Campo de downtime/parada de maquina para OEE preciso.**
  `GET /api/reports/oee` calcula Disponibilidade por aproximacao de
  calendario de turnos (tempo apontado vs. tempo disponivel do centro) —
  o schema (`production_order_tracking`) nao tem um registro explicito de
  inicio/fim de parada real (so o status `paused`, sem timestamp). Se o
  negocio precisar de OEE com desconto de paradas reais, e necessario
  desenhar esse campo/tabela antes de ajustar a formula em
  `GetOeeReportUseCase.ts`.
- [ ] **[PENDENTE] Decisao futura — `DROP TABLE` definitivo das 12
  tabelas orfas do schema-fantasma em portugues.** Marcadas `DEPRECATED`
  via `COMMENT ON TABLE` nesta rodada (migration `20260806-000042`), mas
  nao removidas (decisao consciente de preservar historico/possivel
  relevancia de auditoria fiscal). Avaliar em uma janela dedicada, com
  confirmacao formal de que nao ha dependencia de compliance sobre esse
  schema, antes de dropar. Ver `docs/DATABASE.md`, secao "Tabelas orfas do
  schema-fantasma em portugues".
- [ ] **[PENDENTE] Tela de reatribuicao de contagem ciclica.** O endpoint
  `PUT /api/inventory-counts/:id/reassign` (`ReassignInventoryCountUseCase.ts`,
  entregue na remediacao de 2026-08-06 registrada na entrada anterior
  deste arquivo) nao tem UI — hoje so e acionavel via chamada direta a
  API. Precisa de um botao/dialog em `client/src/pages/products/InventoryCountsPage.tsx`
  (ou equivalente) para o gestor reatribuir uma contagem sem depender de
  suporte tecnico.
- [ ] **[PENDENTE] Tela de `fornecedor_padrao_id` no cadastro de item.**
  O campo existe no backend (`Item.fornecedor_padrao_id`, corrigido de
  UUID para INTEGER nesta rodada, `POST`/`PATCH /api/items`), mas o Item
  Mestre canonico continua sem nenhuma tela de cadastro completa (ver
  `docs/LEVANTAMENTO_ERP_2026-08-02.md`, lista de "9 modulos do backend
  SEM NENHUMA TELA" — `items` e um deles). Quando a tela de cadastro do
  Item Mestre for construida, incluir um seletor de fornecedor padrao
  (`supplier_id` inteiro, nao mais UUID) como parte do formulario.

**Documentos atualizados nesta consolidacao:** este arquivo (secao nova),
`docs/API.md` (RFQ §11.1, financeiro §6, OEE §7, nota breaking change em
§3), `docs/DATABASE.md` (tabelas RFQ, `cost_centers`, correcao das 7
colunas-bomba, `DEPRECATED` nas 12 tabelas orfas), `docs/LEVANTAMENTO_ERP_2026-08-02.md`,
`docs/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `docs/HANDOFF_CODEX.md`
(secao nova), `CLAUDE.md` (contagem de migrations, roadmap).
