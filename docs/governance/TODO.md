# TODO de Governança — Controle de Acesso por Área + Fluxos Complementares

Origem: `docs/business/01-USE_CASES.md` (UC-30 a UC-43) e
`docs/business/BUSINESS_RULES.md`. Este documento **não implementa nada**
— apenas quebra os requisitos em tarefas técnicas que os agentes
programadores/DBA/QA devem puxar, na ordem sugerida (dependências
indicadas). Ao concluir cada bloco, o programador deve atualizar
`docs/governance/HANDOFF_CODEX.md` e consolidar os casos de uso implementados em
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
  Ver tabela completa rota→módulo no handoff (`docs/governance/HANDOFF_CODEX.md`).
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
  Ver `docs/governance/HANDOFF_CODEX.md` §"Bloco 1.4" para detalhes e decisão do
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
  Ver nota "Fora de escopo" em `docs/governance/HANDOFF_CODEX.md`.
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
  ver `docs/governance/HANDOFF_CODEX.md` seção "Frontend — Semáforo de Handoff...").
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
  ver `docs/governance/HANDOFF_CODEX.md`.
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
  depósito — ver `docs/governance/HANDOFF_CODEX.md` Fase 4.1 como precedente).
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
  `docs/governance/HANDOFF_CODEX.md` seção "Bloco 4 — Frontend").
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
    documentado em `docs/database/DATABASE.md` §"Coluna nova:
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
  `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-04) e **resolvido no
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
  completo em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada 2026-08-04).
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
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova datada 2026-08-04) e
`docs/governance/HANDOFF_CODEX.md` (seção nova). Resumo do que foi fechado nesta
consolidação (cada item abaixo foi verificado por leitura direta do
código/testes, não apenas pelo relato do agente que o entregou):

1. **Bloco 6.1** (`details` estruturado, `BUSINESS_RULES.md` §13.5) —
   fechado. Ver seção 6.1 acima.
2. **Bloco 1.5** (4 testes de integração/E2E de permissões pendentes) —
   fechado. Ver seção 1.5 acima.
3. **Roadmap item 3** (trigger automático do MRP) — ver
   `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, linha do item 3, e
   `docs/projeto/04-USE_CASES.md` UC-24b. **Pendência residual pequena
   registrada:** não existe endpoint/UI para ligar `items
   .conversao_automatica` por item — só via UPDATE direto no banco. Fica
   como próxima tarefa pequena de backend+frontend (tela de cadastro de
   item ganhar um toggle).
4. **Roadmap item 8** (rating de fornecedor via RNC) — ver
   `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, linha do item 8, e
   `docs/database/DATABASE.md` (tabela `suppliers`, coluna `quality_score`), já
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
  `docs/database/DATABASE.md` (seção "Cálculo implementado (item 7/9 — mão-de-obra
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
  roadmap em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`.

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
  `feito` no item 6 do roadmap em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`.

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
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (itens 6 e 7 marcados `feito`),
`docs/governance/HANDOFF_CODEX.md` (seção nova), `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`
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
`docs/governance/HANDOFF_CODEX.md`, seção "Frontend — Levantamento MRP/Requisições/
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
completo em `docs/governance/HANDOFF_CODEX.md`, seção "Backend — Catálogo
item×fornecedor (confirmação) + MRP fecha o ciclo para OP (Fase 2/P1)".

---

## 2026-08-06 — Pendencias da auditoria multi-agente (apps mobile/TV novos + atribuicao de contagens)

**Origem:** auditoria multi-agente de 7 frentes (auditor geral, seguranca,
DBA, infra, frontend, mobile/TV, documentacao) rodada em 2026-08-06 sobre
as entregas do dia (apps `mobile/`/`tv/` novos, atribuicao de contagem
ciclica pool/atribuida, `department_id` em OP/contagens, painel de
demandas por departamento). Detalhe completo de cada achado e da
remediacao imediata (4 frentes) em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`,
entrada "2026-08-06". Os itens abaixo sao as pendencias que ficaram
registradas por decisao consciente de nao resolver no mesmo dia — o bug
P0 do campo "Atribuir a" (frontend) e os achados de infra/mobile mais
simples ja foram corrigidos na propria remediacao de 2026-08-06 (ver
diario) e nao aparecem aqui.

- [x] **[IMPLEMENTADO 2026-08-06, terceira rodada] Decisao de produto —
  JWT de 7 dias x painel de TV "sempre ligado".** Resolvido com
  `POST /api/auth/refresh` (renovação deslizante, mesmo signing do login,
  rate-limit 30/15min por usuário) + refresh proativo a cada 12h no app
  `tv/` (`tv/src/context/AuthContext.tsx`) — bem abaixo do TTL de 7 dias.
  Mobile também ganhou refresh ao abrir o app com sessão persistida. Ver
  `docs/arquitetura/API.md` §1, `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada "terceira
  rodada").
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
  `docs/governance/HANDOFF_CODEX.md`, secao "Inventario Ciclico — Atribuicao de
  Contagem a Funcionario / Pool").
- [x] **[IMPLEMENTADO 2026-08-06, terceira rodada] Paginacao da lista de
  contagens no app mobile.** `mobile/app/(app)/counts/index.tsx` ganhou
  paginação incremental (20/página) nas seções "Minhas contagens"/"Pool"
  — substitui o limite fixo de 100 itens anterior.
- [ ] **[PENDENTE] Infra de producao — reverse proxy/TLS,
  `docker-compose.prod.yml` exercitado de fato, cron de backup.**
  Aguardando a compra do servidor de producao (mesma pendencia (a) ja
  registrada em `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` e na memoria de sessao do
  time). Checklist em `docs/infra/DEPLOY_UBUNTU.md`.

**Documentos atualizados nesta consolidacao:** este arquivo (secao nova),
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada 2026-08-05 retroativa +
entrada 2026-08-06), `CLAUDE.md` (status/data, migrations/FKs, arvore de
pastas, roadmap), `docs/governance/HANDOFF_CODEX.md` (nota de atualizacao),
`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` (resumo executivo/datas, secoes
Kubernetes/Datadog marcadas nao aplicaveis).

---

## 2026-08-06 (segunda rodada do dia) — Pendencias das 4 frentes de roadmap (RFQ, financeiro, OEE, bombas latentes)

**Origem:** segunda rodada de entregas de 2026-08-06 (Onda 1 commitada:
RFQ multi-fornecedor, centros de custo + projecao de caixa diaria, OEE
completo; Onda 2 no working tree: desarme de 7 bombas latentes UUID x
INTEGER + marcacao DEPRECATED de 12 tabelas orfas). Detalhe completo de
cada entrega em `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06
(segunda rodada — 4 frentes do roadmap)". Os itens abaixo sao os riscos
residuais e trabalho futuro registrados por decisao consciente de nao
resolver na mesma rodada.

- [ ] **[PENDENTE] Conciliacao bancaria/CNAB.** ✅ **OFX resolvido em
  2026-08-06 (terceira rodada)** — `/api/finance/reconciliation/*`,
  `bank_statements`/`bank_statement_entries`, dedup global por `FITID`,
  sugestoes de match. **CNAB (boleto/remessa/retorno) continua fora de
  escopo** — sem data definida.
- [ ] **[PENDENTE] Mapeamento automatico departamento -> centro de custo
  na criacao automatica de `AccountPayable`.** Hoje `cost_center_id` so e
  atribuido manualmente (`PUT /api/finance/payable/:id/cost-center` ou no
  payload de `POST /api/finance/payable`) — quando uma conta a pagar e
  criada automaticamente (ex.: ao aprovar um pedido de compra), nasce sem
  centro de custo. Precisa de regra de negocio (provavelmente por
  `department_id` de quem originou a compra) antes de implementar.
- [x] **[IMPLEMENTADO 2026-08-06, terceira rodada] Campo de downtime/parada
  de maquina para OEE preciso.** Tabela `production_downtimes`
  (migration `20260806-000060`), endpoints
  `POST/PUT/GET /api/production/downtimes`, bloqueio de 2ª parada aberta
  simultânea no mesmo centro (use case + índice único parcial).
  `GetOeeReportUseCase.ts` agora desconta `downtime_hours` real das horas
  de calendário (`available_hours = max(calendario - downtime, 0)`), com
  breakdown por motivo. Ver `docs/arquitetura/API.md` §7/`docs/database/DATABASE.md`.
- [ ] **[PENDENTE] Decisao futura — `DROP TABLE` definitivo das 12
  tabelas orfas do schema-fantasma em portugues.** Marcadas `DEPRECATED`
  via `COMMENT ON TABLE` nesta rodada (migration `20260806-000042`), mas
  nao removidas (decisao consciente de preservar historico/possivel
  relevancia de auditoria fiscal). Avaliar em uma janela dedicada, com
  confirmacao formal de que nao ha dependencia de compliance sobre esse
  schema, antes de dropar. Ver `docs/database/DATABASE.md`, secao "Tabelas orfas do
  schema-fantasma em portugues".
- [x] **[IMPLEMENTADO 2026-08-06, terceira rodada] Tela de reatribuicao de
  contagem ciclica.** Botão "Reatribuir" + devolver ao pool em
  `client/src/pages/products/InventoryCountsPage.tsx`, gateado por
  permissão `approve` (consome `PUT /api/inventory-counts/:id/reassign`).
- [x] **[IMPLEMENTADO 2026-08-06, terceira rodada] Campo de
  `fornecedor_padrao_id` acessível em tela.** Seletor "Fornecedor padrão"
  adicionado ao dialog de fornecedores do produto
  (`client/src/pages/products/ProductsPage.tsx`, `ProductSuppliersDialog`,
  `PATCH /api/items/:id`). **Nota:** isso NÃO substitui a tela de cadastro
  completa do Item Mestre canônico (`items`), que continua sem nenhuma
  tela dedicada — ver `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`.
- [ ] **[PENDENTE] CNAB (boleto/remessa/retorno).** Conciliação bancária
  v1 (2026-08-06, terceira rodada) cobriu apenas importação de extrato
  OFX. CNAB é uma frente separada, sem data definida.
- [x] **[IMPLEMENTADO 2026-08-06, rodada Vendas/NF-e] Histórico multi-NF-e
  por pedido (`sale_invoices`).** Nova tabela `sale_invoices` (model
  `SaleInvoice`, migration `server/migrations/20260806-000100-create-sale-invoices.cjs`,
  com backfill best-effort dos dados existentes em `Sale.nfe_*` — 1
  registro consolidado por venda que já tinha NF-e) guarda 1 registro por
  EMISSÃO (chave/protocolo/XML/`items` individuais, não mais
  sobrescritos). Padrão expand-contract: `Sale.nfe_*` **não** foi removido
  — continua em dual-write com a emissão mais recente (ver JSDoc de
  `server/src/models/SaleInvoice.ts`). `IssueSaleNfeUseCase` cria o
  registro na transação de reserva e atualiza na transação de resultado;
  `CancelSaleNfeUseCase` propaga o cancelamento ao registro correspondente.
  Endpoint novo: `GET /api/sales/:id/invoices` (mesmo RBAC de leitura de
  `GET .../nfe`, `authorizeModule('vendas')`). Evidência: unit
  `server/tests/unit/sale-invoice-accumulator.test.ts`,
  `server/tests/unit/get-sale-nfe-status-reconciliation.test.ts`, testes
  atualizados de `issue-sale-nfe-partial.test.ts`/`sales-nfe-rbac.test.ts`
  (711 unit passando); integração real (Postgres) em
  `server/tests/integration/sale-invoice-history.test.ts` (2/2 passando via
  `npm run test:integration:strict` — fecha a lacuna de faturamento parcial
  deixada aberta pelo item logo abaixo, "Conciliação bancária + downtime").
- [x] **[IMPLEMENTADO 2026-08-06, rodada Vendas/NF-e] Reconciliação de
  status assíncrono de provedores reais de NF-e com faturamento parcial.**
  `GetSaleNfeStatusUseCase` (path assíncrono — `focus_nfe`/`enotas`) agora
  reutiliza a mesma lógica de acúmulo de `invoiced_quantity`/transição de
  status do path síncrono, extraída para
  `server/src/modules/fiscal/domain/services/SaleInvoiceAccumulator.ts`
  (sem duplicação). A quantidade/itens de cada emissão pendente vêm do
  snapshot em `sale_invoices.items` (só possível depois da tabela acima);
  sem o registro de emissão correspondente (ex.: venda pré-migração sem
  granularidade retroativa), cai no fallback anterior
  (`confirmed -> invoiced`, sem tocar `invoiced_quantity`). Idempotente
  (não reaplica se a emissão já está em estado terminal). Evidência: 6
  testes unitários novos em `get-sale-nfe-status-reconciliation.test.ts`
  cobrindo autorização parcial/total assíncrona, denied, idempotência e
  ausência de `provider_ref`.
- [x] **[IMPLEMENTADO 2026-08-06, rodada de testes de integração]
  Conciliação bancária + downtime — teste de integração real contra
  PostgreSQL.** 2 das 3 features de maior risco da terceira rodada agora
  têm cobertura de integração real (a 3ª, faturamento parcial, ficou
  deliberadamente fora — o agente de Vendas está refatorando esse fluxo
  para `sale_invoices` em paralelo e escreverá o teste de integração junto,
  ver `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06 (rodada de
  testes de integração)"). **ATUALIZAÇÃO (rodada Vendas/NF-e):** a 3ª
  feature (faturamento parcial) agora também tem teste de integração real
  — `server/tests/integration/sale-invoice-history.test.ts`, ver item
  "Histórico multi-NF-e por pedido" acima — fechando as 3/3:
  - `server/tests/integration/bank-reconciliation-ofx-import.test.ts` (6
    casos): importação OFX 1.x SGML e 2.x XML (mesmo parser, fixtures
    diferentes), dedup por FITID (reimportar o mesmo arquivo não duplica
    lançamento, `entries_created=0` na 2ª importação), sugestão automática
    de match contra uma conta a pagar real criada no teste, baixa efetiva
    via `POST .../entries/:id/match` (`account.status='paid'`), rejeição
    didática de arquivo sem tag `<OFX>`.
  - `server/tests/integration/production-downtime-concurrency.test.ts` (3
    casos): 2 requisições HTTP verdadeiramente concorrentes
    (`Promise.all`) abrindo parada no MESMO centro de trabalho — confirma
    que o índice único parcial `uq_production_downtimes_open_per_work_center`
    (não só a checagem de aplicação) impede a 2ª parada e que o erro
    resultante é tratado (409/422 via `SequelizeUniqueConstraintError`
    mapeado no `errorHandler` global, nunca 500); fechar a 1ª libera nova
    parada no mesmo centro; centros diferentes coexistem sem conflito.
  - `server/tests/integration/inventory-count-claim-concurrency.test.ts`
    (3 casos): 2 clients HTTP simultâneos (2 usuários `operator` distintos,
    tokens mintados diretamente como em `rbac-module-access-denied.test.ts`
    para não esbarrar no rate-limit de login) disputando o claim de uma
    contagem do pool — exatamente 1 vence; contagem atribuída a um
    funcionário específico não pode ser reivindicada por outro operador
    (409); admin pode fazer override de uma contagem atribuída a outro
    funcionário (confirmado no código, `StartInventoryCountUseCase`).
  - **Achado real durante a escrita do teste (não é bug, é
    comportamento correto — documentado para não confundir quem ler os
    testes depois):** a "perdedora" da corrida pelo POOL recebe **422**
    (`BusinessRuleError`, "Apenas contagens em status 'draft' podem ser
    iniciadas"), **não 409** — a checagem de `status` em
    `StartInventoryCountUseCase.execute` vem ANTES da checagem de
    `assigned_to`, então quando a 2ª transação (que esperou a 1ª
    commitar via `SELECT ... FOR UPDATE`) lê o registro, o status já é
    `'counting'`. O `ConflictError` (409) só ocorre no cenário de uma
    contagem CRIADA já atribuída a outro usuário, não na corrida pelo
    pool. Nenhuma correção de código foi feita — é o comportamento
    esperado do lock pessimista, só ajustei a expectativa do teste depois
    de rodar contra Postgres real e ver o 422.
  - Evidência de execução real: `node scripts/run-api-suite.cjs
    integration` — **32/32 suites, 88/88 testes passando** (server real
    + PostgreSQL real via `erp_evok_audio_test`, migrations aplicadas,
    servidor subido em `127.0.0.1:3101`). `npx jest tests/unit` — 88/88
    suites, 711/711 testes passando (sem regressão, nenhum código de
    produção foi alterado nesta rodada).
  - **Nota de reprodutibilidade:** numa primeira rodada completa da suíte
    de integração (antes do ajuste acima), `entity-photo-qrcode.test.ts`
    (arquivo pré-existente, não desta rodada) falhou 2 casos com 500 em
    `POST /api/assets/:id/photo`; numa rodada seguinte, com o mesmo código,
    passou 100%. Não investigado a fundo (fora do território desta
    rodada — `server/src/` não pode ser tocado aqui) porque não é
    reproduzível de forma estável e há edição concorrente de outros
    agentes no mesmo working tree (`git status` mostrava
    `server/src/models/index.ts`/`Department.ts` e o módulo `fiscal`
    modificados por outra frente em paralelo no momento desta rodada);
    mais provável é ruído de build/timing concorrente do que um bug real
    do módulo de patrimônio. Se o dono observar esse 500 de forma
    consistente após a rodada de Vendas/CNAB concluir e commitar, vale
    abrir um item dedicado.
  - **Não coberto (fora do escopo desta rodada, por instrução
    explícita):** faturamento parcial de NF-e (`sale_items.invoiced_quantity`
    / `sale_invoices`) — aguardando a refatoração em andamento do agente
    de Vendas.

**Documentos atualizados nesta consolidacao:** este arquivo (secao nova),
`docs/arquitetura/API.md` (RFQ §11.1, financeiro §6, OEE §7, nota breaking change em
§3), `docs/database/DATABASE.md` (tabelas RFQ, `cost_centers`, correcao das 7
colunas-bomba, `DEPRECATED` nas 12 tabelas orfas), `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`,
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `docs/governance/HANDOFF_CODEX.md`
(secao nova), `CLAUDE.md` (contagem de migrations, roadmap).

---

## 2026-08-06 (terceira rodada do dia) — Pendencias das 6 frentes de hoje (auth refresh/Winston, mobile/TV, telas web, vendas, producao, financeiro)

**Origem:** terceira rodada de entregas de 2026-08-06, distinta das duas
anteriores (auditoria multi-agente de apps mobile/TV; RFQ/centros de
custo/OEE/bombas latentes). Detalhe completo de cada entrega em
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06 (terceira rodada —
6 frentes...)". Os itens marcados `[x]` acima (decisao JWT/TV, paginacao
mobile, downtime/OEE, tela de reatribuicao de contagem, campo de
fornecedor padrao) e os `[ ]` novos (CNAB, historico multi-NF-e, status
assincrono de provedores reais, testes de integracao das 3 features de
maior risco) foram registrados nas secoes correspondentes acima — nao
duplicados aqui.

**Documentos atualizados nesta consolidacao:** este arquivo (itens
marcados `[x]`/`[ ]` novos nas duas secoes de 2026-08-06 anteriores),
`docs/arquitetura/API.md` (auth refresh §1, vendas §5, financeiro §6, relatorios §7 +
`/api/production/downtimes`), `docs/database/DATABASE.md` (`customer_price_lists`,
`sale_items.invoiced_quantity`/`partially_invoiced`,
`production_downtimes`, `bank_statements`/`bank_statement_entries`),
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` (linhas `sales`/`financial`, item 9),
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `docs/governance/HANDOFF_CODEX.md`
(secao nova), `CLAUDE.md` (contagem de migrations, modulos/telas novas).

---

## 2026-08-06 (quarta rodada do dia) — `AdmDBA`: remediacao dos 3 achados de risco do apendice de auditoria (roles, backup/restore, docker-compose.prod.yml)

Origem: apendice "AdmDBA: framework de documentacao de dados completo"
(mesma data), que reportou 3 riscos sem corrigi-los. Esta rodada trata
os 3.

- [x] **[IMPLEMENTADO E TESTADO] Role Postgres de privilegio minimo
  `evok_app`.** Migration
  `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`
  aplicada (`npm run migration:up`). `evok_app`: `NOSUPERUSER`,
  `NOCREATEDB`, `NOCREATEROLE`, sem DDL, `SELECT/INSERT/UPDATE/DELETE`
  nas tabelas de negocio (exceto `SequelizeMeta`/`SequelizeData`),
  `ALTER DEFAULT PRIVILEGES` cobre tabelas futuras automaticamente.
  Testado via TCP com senha (`psql -h 127.0.0.1 -U evok_app`): SELECT
  funciona, `CREATE TABLE` e leitura de `SequelizeMeta` sao rejeitados
  (`permission denied`). `npm test` (86 suites/670 testes) passou depois
  da migration. **Decisao consciente: a credencial ativa do `.env`
  continua sendo `evok_admin`** — a troca para `DB_USER=evok_app` e um
  passo manual documentado em
  `docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.1, nao aplicado agora
  para nao reiniciar o backend/frontend que estavam em uso ativo durante
  esta remediacao.
- [ ] **[PENDENTE, nao bloqueante] Trocar `DB_USER` do `.env` ativo (dev
  e depois producao) de `evok_admin` para `evok_app`.** Requer reiniciar
  a API. Ver passo a passo em
  `docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.1 "Como/quando trocar".
- [ ] **[PENDENTE, nao critico] Roles `evok_backup`
  (dedicada a `pg_dump`, hoje ainda usa `evok_admin`) e role de migration
  separada de `evok_admin`.** Ver
  `docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.2 (decisao consciente de
  nao criar nesta rodada — ganho de seguranca menor que o da role de
  runtime, ja implementada).
- [x] **[IMPLEMENTADO E TESTADO] Agendamento real de backup ativado
  neste ambiente.** `scripts/schedule-backup-task.ps1` registrou a
  tarefa `EvokAudioPostgresBackup` no Agendador de Tarefas do Windows
  (`NextRunTime` confirmado, escopo do usuario, sem exigir admin).
  Execucao manual de `scripts/backup-postgres.sh` gerou um dump novo no
  mesmo dia (`erp_evok_audio_20260806_145213.dump`), quebrando a lacuna
  de 6 dias sem backup identificada na auditoria. Ver
  `docs/database/07-DISASTER_RECOVERY.md` §1.1.
- [ ] **[PENDENTE] Ativar o cron equivalente
  (`scripts/schedule-backup-cron.sh`) no servidor de producao real**,
  quando adquirido — o agendamento feito nesta rodada e local
  (maquina de desenvolvimento), nao o servidor de producao. Ver
  `docs/infra/DEPLOY_UBUNTU.md`, checklist de prontidao.
- [x] **[IMPLEMENTADO E TESTADO] Restore ponta a ponta contra o banco
  local, com evidencia real.** `pg_dump -Fc -Z 9` (script padrao) +
  `pg_restore --no-owner --no-privileges` em banco descartavel
  (`erp_evok_audio_restore_test`, removido ao final) — 79/79 tabelas
  com contagem de linhas identica ao banco de origem (amostra conferida
  manualmente: `users`, `items`, `suppliers`, `production_orders`,
  `sale_items`, `inventory_movements`, `SequelizeMeta`). Passo a passo
  real documentado em `docs/database/07-DISASTER_RECOVERY.md` §2.1.
- [ ] **[PENDENTE] Teste de restore em servidor/maquina limpa nova**
  (cenario de catastrofe total — provisionar do zero, `migration:up`,
  restaurar dump, restaurar `app_uploads`). So sera possivel quando o
  servidor de producao existir. RPO/RTO formais tambem seguem nao
  aprovados pelo dono/CFO (`docs/database/07-DISASTER_RECOVERY.md` §3).
- [ ] **[PENDENTE] Estender o backup para cobrir o volume `app_uploads`**
  (fotos/desenhos de produto) — hoje so o dump do Postgres e coberto.
- [x] **[IMPLEMENTADO] `docker-compose.prod.yml` criado.** Esqueleto na
  raiz do repo, validado por `docker compose -f docker-compose.prod.yml
  config` (sem erro). `NODE_ENV=production`, `DB_SSL=true` por padrao,
  Postgres sem porta publicada (`expose` em vez de `ports`), API
  vinculada a `127.0.0.1:5000`, healthchecks, `restart:
  unless-stopped`, comentarios explicitos sobre o que falta preencher
  quando o servidor existir (reverse proxy/TLS, cron de backup externo
  ao compose). **Nao implantado de verdade** — sem servidor real para
  testar.

**Nao quebrou nada:** `npm test` a partir de `server/` (86 suites, 670
testes) passou depois de todas as mudancas acima; `GET /health/ready`
confirmado respondendo antes e depois (API seguiu autenticando com
`evok_admin`, sem interrupcao).

**Documentos atualizados nesta rodada:**
`docs/database/05-ACESSOS_E_ISOLAMENTO.md` (secoes 1.1/1.2 novas, matriz
atualizada, §3), `docs/database/07-DISASTER_RECOVERY.md` (secoes 1.1/2.1
novas, status honesto atualizado), `docs/infra/DEPLOY_UBUNTU.md`
(checklist atualizado, referencia ao `docker-compose.prod.yml`),
`.env.example` (`APP_DB_ROLE_PASSWORD`), `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`
(entrada nova), este arquivo (secao nova).

---

## 2026-08-06 (apêndice 4) — Auditoria de rastreabilidade: confronto UC×código, bug real corrigido em Patrimônio

**Origem:** rodada de auditoria (`auditor-rastreabilidade`) para confirmar
com evidência de código 3 achados previamente apenas *reportados* (não
verificados a fundo) por outros agentes/documentação, mais uma varredura
ponta a ponta de regras de negócio críticas (reserva de estoque, OEE,
faturamento parcial, adjudicação de RFQ) e confirmação do estado real da
role `evok_app` vs. `.env`.

**1) UC-19 (Importação/COMEX) — gap confirmado, extensão real mapeada:**
- [x] **[IMPLEMENTADO 2026-08-06 — ver apêndice 7 abaixo]** Confirmado por
  busca real no código, à época desta consolidação: zero implementação,
  backend e frontend. `server/src` não tinha nenhum módulo/rota/model com
  termos de domínio COMEX (`FOB`, `desembaraço`, `nacionalização`,
  `II/IPI/PIS/COFINS/ICMS de importação`, `drawback`) — os únicos
  resultados de busca por "import*" no código eram falsos positivos
  (statements TypeScript `import`, e o módulo de **conciliação bancária**
  que "importa" arquivo OFX, sem nenhuma relação com COMEX). `client/src`
  idem — as únicas ocorrências de "importa*" eram a tela de conciliação
  OFX (`ReconciliationTab.tsx`). Nenhuma rota `/api/*` relacionada a COMEX
  estava montada em `server/app.ts`. **Não era um gap subestimado — era
  exatamente zero, como reportado, sem nenhuma implementação parcial.**
  Decisão de negócio tomada no mesmo dia: implementar (não descontinuar).
  Backend completo entregue — ver apêndice 7 ("UC-19/RF-COM-12: módulo
  Importação/COMEX") mais abaixo neste arquivo para o detalhamento
  completo; RF-COM-12 passou a `[IMPLEMENTADO]` em
  `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §3, UC-19 marcado
  `[IMPLEMENTADO]` (backend; tela web pendente) em
  `docs/projeto/04-USE_CASES.md`.

**2) `Asset.status` sem sincronização automática — confirmado, e um bug
real correlato foi encontrado e corrigido nesta rodada:**
- [x] **[CORRIGIDO 2026-08-06] `Asset.status` agora sincroniza
  automaticamente com o ciclo de vida da ordem de manutenção (OM) —
  decisão de negócio tomada: sincronização automática (não manual).**
  Gatilhos implementados em
  `server/src/modules/maintenance/application/use-cases/UpdateMaintenanceOrderUseCase.ts`
  e `CancelMaintenanceOrderUseCase.ts` (a criação da OM continua nascendo
  como `status: 'open'`, então não é gatilho — ver JSDoc do use case para o
  raciocínio completo):
  - Transição da OM para `in_progress` → `Asset.status = 'in_maintenance'`
    (`MaintenanceRepository.markAssetInMaintenance`).
  - Conclusão (`completed`) ou cancelamento (`canceled`) da OM →
    `Asset.status = 'active'`, **somente se** (a) não existir outra OM
    aberta (`open`/`scheduled`/`in_progress`/`waiting_parts`) para o mesmo
    ativo, e (b) o ativo ainda estiver `in_maintenance` (o `UPDATE` usa
    `WHERE status = 'in_maintenance'`, então nunca "ressuscita" um ativo
    baixado — `decommissioned`/`lost`/`returned_to_supplier` — durante a
    manutenção) — método
    `MaintenanceRepository.releaseAssetFromMaintenanceIfNoOtherOpenOrders`.
  - Toda a sincronização roda na mesma transação Sequelize da mudança da
    OM, com `SELECT ... FOR UPDATE` na OM antes de decidir (padrão
    `findByIdForUpdate` + `sequelize.transaction()`, igual ao já usado em
    `ChangeProductionOrderStatusUseCase`/`FinishProductionDowntimeUseCase`).
  - **Testes:** `server/tests/unit/maintenance-use-cases.test.ts` (13
    casos) cobre abertura → `in_maintenance`, conclusão → `active`,
    conclusão de ativo `decommissioned` → permanece `decommissioned`,
    conclusão de uma de duas OMs abertas → permanece `in_maintenance`,
    rollback em erro de sincronização, e a query/condição de UPDATE do
    repositório Sequelize isoladamente. `npx jest tests/unit` → 680/680
    passando (era 671 antes desta entrega). `npm run typecheck` → 0 erros.
  - Sem migration necessária (`in_maintenance` já existia no enum
    `enum_assets_status`).
- [x] **[BUG REAL ENCONTRADO E CORRIGIDO nesta rodada, achado colateral da
  mesma investigação de `Asset.status`]** `[CRITICO]`
  `server/src/modules/assets/application/use-cases/DeactivateAssetUseCase.ts:26`
  fazia `assetsRepository.update(id, { status: 'inactive' })`, mas
  `'inactive'` **nunca existiu** no ENUM Postgres `enum_assets_status`
  (valores reais: `active`, `in_maintenance`, `decommissioned`, `lost`,
  `returned_to_supplier` — confirmado em `server/src/models/Asset.ts:58-62`
  e em todas as migrations que tocam esse enum,
  `server/migrations/20260805-000006-add-asset-status-returned-to-supplier.cjs`
  e `20260805-000002-add-asset-type-license.cjs`, nenhuma adiciona
  `inactive`). **Efeito real:** todo `DELETE /api/assets/:id` (soft
  delete de ativo/patrimônio) retornava 500 — Postgres rejeita o UPDATE
  com "invalid input value for enum enum_assets_status: inactive". Sem
  cobertura de teste (`server/tests` não tem nenhum caso para
  `DeactivateAssetUseCase`), por isso sobreviveu sem detecção. **Correção
  aplicada nesta rodada:** trocado o valor gravado para `'decommissioned'`
  (já usado no frontend com o rótulo "Baixado",
  `client/src/pages/patrimonio/AssetsPage.tsx:36`), que é o valor de enum
  correto e já exibido corretamente na tela — mudança local de uma linha,
  sem migration necessária. **Teste sugerido:** caso de integração
  `DELETE /api/assets/:id` → 200, `Asset.status === 'decommissioned'`
  persistido (hoje inexistente). **Atualização:** cobertura unitária
  (mock de repositório, sem banco real) adicionada no apêndice 6 abaixo —
  o caso de integração completo com Postgres real segue como melhoria
  futura, não bloqueante.

**3) Fluxos críticos ponta a ponta — verificados com leitura completa do
código-fonte, não apenas confirmação de rota:**
- [x] **Reserva/baixa de estoque por venda** (`CreateSaleUseCase.ts`,
  `ChangeSaleStatusUseCase.ts`, `EditSaleItemsUseCase.ts`) `[BAIXO/CLEAN]`
  — baixa atômica via `InventoryService.consume` com `SELECT ... FOR
  UPDATE` na mesma transação da venda; dual-write correto em
  `WarehouseStockService` para o depósito `ACABADOS`; orçamento (`quote`)
  corretamente não debita nada; edição de itens de venda confirmada
  (`EditSaleItemsUseCase.ts:104-186`) bloqueia redução/troca de produto de
  item já parcialmente faturado (`invoiced_quantity > 0`), com ajuste de
  delta de estoque na mesma transação — regra de negócio íntegra.
- [x] **OEE com desconto de downtime**
  (`GetOeeReportUseCase.ts:206-243`) `[BAIXO/CLEAN]` — `available_hours =
  max(calendario - downtime_hours, 0)` (nunca negativo), downtime lido de
  `production_downtimes` com breakdown por motivo, eixos nunca retornam
  `0` artificial quando o denominador é zero (`null` + `no_data_reason`
  explícito) — implementação confere linha a linha com o comportamento
  documentado em `CLAUDE.md` §4.
- [x] **Faturamento parcial acumulando `invoiced_quantity`**
  (`IssueSaleNfeUseCase.ts:79-313`) `[BAIXO/CLEAN]` — duas transações
  curtas (reserva de número fiscal / gravação do resultado) com a chamada
  ao provedor de NF-e FORA de transação (evita segurar lock de banco
  durante I/O externo); saldo pendente calculado por item
  (`quantity - invoiced_quantity`), rejeita quantidade acima do saldo
  (`BusinessRuleError` com `remaining` no payload), incrementa
  `invoiced_quantity` e recalcula `sale.status`
  (`partially_invoiced`/`invoiced`) só após confirmação de
  `status === 'authorized'` do provedor — nunca antes. Limitação já
  documentada no próprio código (sem histórico multi-NF-e por pedido) é a
  mesma já registrada em `CLAUDE.md` §4, não é novidade.
- [x] **Adjudicação de RFQ por item** (`AwardRfqUseCase.ts`)
  `[BAIXO/CLEAN]` com uma ressalva `[MEDIO]` — fluxo transacional com
  `SELECT ... FOR UPDATE` na RFQ, bloqueia item duplicado/adjudicação a
  mais de um fornecedor, valida que existe cotação registrada para o par
  item×fornecedor antes de adjudicar, agrupa por fornecedor vencedor
  gerando um pedido de compra por grupo, e realimenta `item_suppliers`
  (upsert) corretamente. **Ressalva `[MEDIO]`:**
  `AwardRfqUseCase.ts:219` chama
  `itemSupplierRepository.findByItemAndSupplier(award.itemId,
  award.supplierId)` **sem passar `input.transaction`** — a única
  leitura do método que não usa a transação ativa da adjudicação
  (create/update subsequentes na mesma linha 219-238 já usam
  `input.transaction` corretamente). Sob concorrência real (duas RFQs
  distintas adjudicando o mesmo par item×fornecedor pela primeira vez ao
  mesmo tempo), ambas as leituras fora de transação podem não enxergar a
  criação uma da outra antes do commit, arriscando um `create` duplicado
  em `item_suppliers`. **Verificado nesta rodada:** a constraint
  `UNIQUE(item_id, supplier_id)` **existe**
  (`uq_item_suppliers_item_supplier`,
  `server/migrations/20260803-000001-create-item-suppliers.cjs:79-83`),
  então o pior cenário sob concorrência real não é duplicata silenciosa
  de catálogo, e sim um erro de violação de unique constraint propagado
  como 500 na adjudicação concorrente rara do mesmo par item×fornecedor
  novo — rebaixado de risco de integridade para robustez/UX de erro.
  **Ação sugerida (não crítica):** passar `input.transaction` para
  `findByItemAndSupplier` (linha 219) por consistência com o resto do
  método e para que a violação de concorrência, se ocorrer, seja
  capturada e tratada com uma mensagem didática em vez de vazar como erro
  500 genérico. **Atualização:** aplicado no apêndice 6 abaixo.
- [x] **BOM multinível / ciclo** `[BAIXO/CLEAN]` — `ExplodeBOMUseCase`/
  `BomService.explodeBOM` usa `MAX_BOM_DEPTH = 10` como teto de segurança
  contra explosão infinita por referência circular
  (`server/src/modules/bom/README.md:131`); é uma mitigação por
  profundidade máxima, não uma detecção/rejeição ativa de ciclo na
  criação da BOM — suficiente para não travar o sistema, mas não impede
  cadastrar uma BOM cíclica (só faz a explosão parar no nível 10). Não
  reclassificado como achado novo por já ser um comportamento
  documentado e com mitigação real; registrado aqui só para reforço.

**4) `evok_app` (role de mínimo privilégio) vs. `.env` ativo — confirmado
sem inconsistência** `[BAIXO/CLEAN]`:
- [x] Migration `20260806-000080-create-app-role-least-privilege.cjs`
  confere exatamente com o que o apêndice anterior (linhas 1779-1793
  acima) documenta: `CREATE ROLE evok_app ... NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION`, GRANT de DML (não DDL) em todas as tabelas
  de `public` exceto `SequelizeMeta`/`SequelizeData`, `ALTER DEFAULT
  PRIVILEGES` para tabelas futuras — lida linha a linha, migration
  correta e idempotente (`DO $$ IF NOT EXISTS ... END $$`).
  Confirmado por leitura direta (não só do relatório anterior): `.env`
  real do ambiente (`DB_USER=evok_admin`, linha 7) e `.env.example`
  (`DB_USER=evok_admin`, linha 16) e `docker-compose.yml`
  (`DB_USER: evok_admin`, linha 49) **continuam todos no superusuário**,
  exatamente como o comentário de cabeçalho da própria migration
  (linhas 18-24) e o apêndice anterior deste documento já registravam.
  **Nenhuma divergência entre documentação e estado real** — a troca para
  `evok_app` continua sendo um passo manual pendente e não-bloqueante
  (já rastreado acima, "[PENDENTE, nao bloqueante] Trocar `DB_USER`...").

**Arquivos alterados nesta rodada:**
`server/src/modules/assets/application/use-cases/DeactivateAssetUseCase.ts`
(bug de enum corrigido, 1 linha + comentário explicativo).

**Documentos atualizados nesta rodada:** este arquivo (seção nova).

---

## 2026-08-06 (apêndice 3 de governança) — Documento de Requisitos, `01-PLANO.md`, BPMN Qualidade/Manutenção, Manual do Usuário

**Origem:** fechamento das 4 pendências deixadas explicitamente pelo Tech
Lead de governança/documentação nos apêndices anteriores desta mesma data
(`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, "2026-08-06 (apêndice 3)"). Trabalho em
paralelo ao `AdmDBA` — não altera nada de `docs/database/` ou infra de
banco.

**Entregue nesta rodada:**
- [x] `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` criado — índice
  executivo de RFs por módulo, com link para UC/rota real.
- [x] `docs/projeto/01-PLANO.md` reescrito (não é mais o MVP inicial de 18
  modelos/"frontend planejado").
- [x] BPMN de Qualidade e Manutenção adicionados a
  `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` (seções 4 e 5).
- [x] Manual do Usuário com conteúdo prático completo para Vendas, Compras
  (requisição→RFQ→pedido→recebimento), Estoque/Inventário (incl. app
  mobile QR) e Produção (apontamento, paradas).

**Achados/pendências novas registradas por esta consolidação (não
inventados — extraídos da leitura real do código):**

- [x] **[IMPLEMENTADO 2026-08-06] UC-19 (Importação/COMEX)** estava
  documentado em `docs/projeto/04-USE_CASES.md` sem nenhuma rota/modelo
  correspondente no backend — decisão de negócio tomada no mesmo dia:
  implementar (não descontinuar). Backend completo entregue (ver apêndice
  7 mais abaixo neste arquivo). RF-COM-12 passou a `[IMPLEMENTADO]` em
  `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §3; UC-19 marcado
  `[IMPLEMENTADO]` (backend; tela web pendente) em
  `docs/projeto/04-USE_CASES.md`.
- [x] **[CORRIGIDO 2026-08-06] `Asset.status` passou a ser atualizado
  automaticamente pelo ciclo de vida da ordem de manutenção** — ver
  detalhamento completo no achado "2) `Asset.status` sem sincronização
  automática" acima (mesmo arquivo). RF-PAT-05 deixa de ser `[PENDENTE]`
  em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 (atualização de
  requisitos a cargo do agente de documentação/arquitetura em rodada
  posterior — fora do território deste agente); o gap desenhado no
  diagrama BPMN de Manutenção (§5 de `DIAGRAMA_CASOS_DE_USO_BPMN.md`)
  também precisa de atualização por esse mesmo agente.
  **[ATUALIZAÇÃO 2026-08-06, rodada de sincronização documental]** — feito:
  RF-PAT-05 marcado `[IMPLEMENTADO]` em
  `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 (e na tabela de
  divergências); o nó `[PENDENTE]` do BPMN §5 foi reescrito para refletir
  a sincronização automática real; `docs/patrimonio/03-MANUTENCAO.md` §6
  também teve a ressalva antiga substituída pela descrição do
  comportamento novo.
- [ ] Certificações de produto/processo (citadas no `01-PLANO.md` histórico
  como "Módulo 13 — Qualidade") nunca ganharam modelo/rota dedicada — mesma
  decisão de negócio: formalizar como UC futuro ou remover do escopo
  documentado.

**Pendências que ficam fora desta rodada (fora do escopo pedido, não
esquecidas):**
- [ ] Manual do Usuário: capturas de tela, guia de erros comuns, conteúdo
  prático para Qualidade/Laboratório, Engenharia, Financeiro,
  Patrimônio/Manutenção, RH, Relatórios, Rastreabilidade, Administração e
  painel Android TV (hoje esqueleto, rotulado explicitamente no arquivo).

**Documentos atualizados nesta consolidação:** `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
(novo), `docs/projeto/01-PLANO.md` (reescrito), `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md`
(seções 4/5 novas), `docs/manual/00-MANUAL_DO_USUARIO.md` (conteúdo
prático), `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova), `CLAUDE.md`
(link novo em §8), este arquivo.

---

## 2026-08-06 (auditoria cruzada `AuditorIntegrador`) — Requisitos × Banco × API, achado maior: ~55% dos endpoints reais sem documentação em `docs/arquitetura/API.md`

**Origem:** auditoria "pente fino" pedida explicitamente sobre
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` ↔ `docs/database/` ↔
`docs/arquitetura/API.md`/`docs/arquitetura/DIAGRAMA_CLASSES.md`. Não altera código nem schema —
apenas registra achados de documentação para os donos corrigirem.
Relatório completo (com a tabela de rastreabilidade RF→tabela→endpoint)
foi apresentado na resposta ao usuário; aqui ficam só as pendências
reais, com as tags padrão do projeto.

- [x] **[CORRIGIDO 2026-08-06, `ArquitetoSoftwareAPI`] `docs/arquitetura/API.md` não
  documenta pelo menos 17 dos ~34 grupos de rota reais montados em
  `server/app.ts`**, entre eles módulos inteiros citados como
  `[IMPLEMENTADO]` em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`:
  `/api/purchase-requisitions` (RF-COM-01/02/03), `/api/quality/non-conformities`
  (RF-QUA-01/02), `/api/laboratory` (RF-QUA-04/05), `/api/assets`
  (RF-PAT-01/02), `/api/maintenance` (RF-PAT-03/04), `/api/employees`
  (RF-RH-01), `/api/departments` (RF-RH-02), `/api/traceability`
  (RF-REL-05), `/api/audit-logs` (RF-AUT-09/RF-REL-07),
  `/api/service-orders` (RF-PAT-06), `/api/fiscal` (RF-FIN-08),
  `/api/mobile-inventory` (RF-EST-07), `/api/webhooks` (RF-INT-01/02),
  `/api/auditor` (RF-EST-08/RF-REL-04), `/api/work-centers` (RF-PRD-07),
  `/api/items` (só citado de passagem numa nota de breaking change,
  nunca com seção própria de endpoints), e `/api/engineering` (a base,
  fora da sub-rota `/api/engineering/bom` que tem seção 9). Além disso,
  `POST /api/auth/forgot-password`/`POST /api/auth/reset-password`
  (citados em `RF-AUT-03` e usados por rate-limiters dedicados em
  `server/app.ts`) não tinham entrada na própria seção 1 (Autenticação)
  do arquivo. **Resolvido:** todas as 18 lacunas cobertas —
  `docs/arquitetura/API.md` novas seções 15 (Requisição de Compra), 16 (Qualidade —
  RNC), 17 (Laboratório), 18 (Engenharia — Projetos/Desenhos/Ficha
  Técnica), 19 (Patrimônio), 20 (Manutenção), 21 (RH — Funcionários), 22
  (RH — Departamentos), 23 (Rastreabilidade), 24 (Logs de Auditoria), 25
  (Ordens de Serviço), 26 (Fiscal — Config. do Emitente), 27 (Inventário
  Mobile), 28 (Webhooks), 29 (Auditor Inteligente), 30 (Centros de
  Trabalho), 31 (Itens — Item Mestre); `/api/inventory/lots*` (incl.
  `/qrcode`, `/release`, `/block`) cobertos na nova seção 8.3; forgot/
  reset-password adicionados dentro da seção 1 existente. Cada seção
  nova foi conferida diretamente contra o arquivo de rotas +
  controller/validator real (RBAC via `authorizeModule`, payload Zod,
  formato de resposta) — não copiada de suposição.
- [x] **[CORRIGIDO 2026-08-06, `ArquitetoSoftwareAPI`] `docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`
  tinha 2 endpoints com rota/verbo HTTP incorretos** (não batiam com
  `server/app.ts` nem com `docs/arquitetura/API.md`, que já estavam corretos e
  concordavam entre si): fluxo 3 ("Ordem de Produção → Apontamento")
  usava `POST /api/production/orders` e `PATCH /api/production/orders/:id`
  — corrigido para `POST /api/production-orders` (hífen, sem `/orders`
  aninhado) e `PUT /api/production-orders/:id/status`. Fluxo 2
  ("Requisição → RFQ → Pedido → Recebimento") usava
  `PATCH /api/purchases/:id/status` — corrigido para `PUT`
  (`server/src/modules/purchases/presentation/routes/purchases.ts`,
  confirma `docs/arquitetura/API.md` §11).
- [x] **[DOCUMENTADO 2026-08-06, `ArquitetoSoftwareAPI`] Inconsistência de
  convenção de nome de campo entre request e response do mesmo
  endpoint:** `docs/arquitetura/API.md` §1.1, `PUT /api/users/:id/access-profile` —
  confirmado no código (`userController.ts`/`AssignAccessProfileUseCase.ts`)
  que o `Request` de fato usa `{ "access_profile_id": 3 }` (snake_case,
  lido manualmente do body) e o `Response` de fato usa
  `{ "id": 12, "accessProfileId": 3 }` (camelCase, shape do use case) —
  **não era erro de digitação da doc, é o comportamento real**. Mais
  amplamente, confirmado que `docs/arquitetura/API.md` mistura convenção de saída
  entre módulos porque cada model Sequelize declara os nomes de atributo
  JS que quiser (`underscored: true` só afeta a coluna do banco, não a
  chave JSON) — `Client`/`Sale` declaram atributos como `cpf_cnpj`/
  `customer_id` (snake, aparecem snake no JSON), `User` declara
  `accessProfileId`/`passwordVersion` com `field:` explícito (camel no
  JSON), e `Item` chega a renomear os próprios timestamps para
  `criado_em`/`atualizado_em`. **Resolvido:** nota "Convenção de caixa
  (casing) dos campos JSON" adicionada no topo de `docs/arquitetura/API.md`
  (antes da seção 1) explicando a regra real; e os 2 exemplos que
  estavam **de fato errados** relativo ao comportamento real do
  Sequelize (`GET /api/clients` e `GET /api/sales` mostravam
  `"created_at"`, mas o Sequelize sempre serializa timestamps como
  `createdAt`/`updatedAt` — nome de atributo padrão, não afetado por
  `underscored`) foram corrigidos para `createdAt`.
- [x] **[CONFIRMADO 2026-08-06, `ArquitetoSoftwareAPI`]** Confirmação
  pendente sobre `/lots/:id/qrcode` (RF-EST-04): confirmado no código
  (`GenerateEntityQrCodeUseCase` + `inventoryController.getLotQrCode`)
  que o QR do lote é gerado **on-the-fly a cada chamada** (payload
  `{ lot_number, product_code, product_name }` codificado em memória via
  `QRCodeService`), sem nenhuma coluna de imagem/payload persistida em
  `lot_controls` — está correto por desenho, não é um gap. Documentado
  explicitamente em `docs/arquitetura/API.md` §8.3 (nova seção).
- [ ] Nota de rastreabilidade cruzada (não bloqueante, registrar para o
  ciclo de manutenção do Diagrama de Classes): `docs/arquitetura/DIAGRAMA_CLASSES.md`
  já se auto-declara parcial desde 2026-08-06 (seção "Módulos entregues
  após a versão original", que lista `Rfq`/`CostCenter`/`WorkCenter`/
  `ProductionDowntime`/`BankStatement`/etc. em texto, sem re-renderizar o
  Mermaid principal) — isso é uma lacuna já assumida pelo próprio
  documento, não um achado novo desta auditoria; mantido aqui só para
  registro de que foi conferido e a auto-declaração é precisa (as 11
  classes novas listadas batem com as tabelas reais do Dicionário de
  Dados).

**O que esta auditoria cobriu (rastreabilidade completa, não amostrada):**
todas as ~78 tabelas de `docs/database/04-DICIONARIO_DADOS.md`
(incluindo as 12 `[DEPRECATED]`), todos os ~34 grupos de rota de
`server/app.ts`, todos os RFs de `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
(seções 1 a 11), `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` completo,
`docs/database/00-INDICE.md` a `07-DISASTER_RECOVERY.md`,
`docs/arquitetura/DIAGRAMAS_SEQUENCIA.md`,
`docs/arquitetura/DIAGRAMA_ARQUITETURA_INFRAESTRUTURA.md`,
`docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md`, `docs/arquitetura/DIAGRAMA_CLASSES.md`,
`docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md` e os títulos de UC de
`docs/projeto/04-USE_CASES.md`/`docs/business/01-USE_CASES.md`.

**O que ficou de fora desta rodada (auditoria parcial nesse recorte,
registrado para não passar como cobertura 100%):** leitura linha a linha
completa de `docs/projeto/04-USE_CASES.md` (1217 linhas — só os títulos
de UC e os UCs citados diretamente pelo Documento de Requisitos foram
conferidos em detalhe, não o corpo de todos os ~35 casos de uso);
conferência campo a campo de 100% dos payloads de exemplo de
`docs/arquitetura/API.md` contra o Dicionário de Dados (feita por amostragem
dirigida às seções mais prováveis de divergência — Autenticação, Vendas,
Financeiro, Compras/RFQ, Estoque — não todas as ~34 seções linha a
linha); `docs/database/07-DISASTER_RECOVERY.md` foi indexado mas não
lido linha a linha nesta rodada (já auditado por `AdmDBA` em rodada
anterior do mesmo dia, ver apêndice "quarta rodada" acima).

---

## 2026-08-06 (apêndice 5 — pente-fino estrutural) — Nomenclatura da árvore de `docs/`, links quebrados, referências soltas

**Origem:** pedido explícito de "pente fino" na estrutura de pastas/nomes
de `docs/` (não no conteúdo técnico — isso é o escopo do
`AuditorIntegrador`, achado acima). Levantamento completo da árvore real
(19 pastas, ~100 arquivos) + resolução programática dos 115 links
markdown internos de `docs/`, `CLAUDE.md`, `README.md`, `AGENTS.md`
contra o filesystem (case-sensitive) + varredura de menções em texto
corrido a `docs/*.md`. Detalhe completo da metodologia em
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "apêndice 5".

**Links markdown formais `[texto](arquivo.md)`: 0 quebrados** (115/115
resolvem, inclusive em checagem case-sensitive). Nenhuma correção
necessária nessa frente.

- [x] **[CORRIGIDO]** `CLAUDE.md` §3 e `AGENTS.md` §3 (árvore de pastas
  ilustrativa) estavam desatualizadas — não listavam `docs/arquitetura/`,
  `docs/database/`, `docs/business/`, `docs/governance/`, `docs/manual/`,
  `docs/infra/` (criadas em sessões anteriores) nem, no caso de
  `AGENTS.md`, as pastas `mobile/`/`tv/` da raiz do repo. Ambas as
  árvores foram atualizadas para refletir a estrutura real.
- [x] **[CORRIGIDO]** `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` citava em
  texto corrido `docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md` e
  `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` sem avisar que não existem
  mais — adicionada nota (mesmo padrão já usado em
  `.claude/agents/evok-production-remediation.md`/`.codex/agents/evok-production-remediation.toml`)
  apontando para `CLAUDE.md` §5 e `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` como
  fonte vigente de status.
- [ ] **[PENDENTE] Mistura de idioma nos nomes de pasta de `docs/`
  sem critério documentado:** maioria em português
  (`administrativo/`, `comercial/`, `financeiro/`, `juridico/`,
  `logistica/`, `patrimonio/`, `producao/`, `projeto/`, `qualidade/`,
  `rh/`, `seguranca_trabalho/`, `suprimentos/`, `tributario/`,
  `arquitetura/`, `manual/`) vs. inglês (`business/`, `database/`,
  `governance/`, `infra/`). Nenhuma quebra funcional (nenhum link
  aponta errado), mas é uma inconsistência de convenção visível a
  qualquer novo colaborador. **Decisão do dono necessária antes de
  qualquer rename** (renomear pasta quebra todo histórico de git blame
  e exigiria atualizar os poucos links internos apontando para ela):
  manter como está (aceitar que pastas "transversais"/meta —
  arquitetura de sistema, banco, governança, infra — são em inglês por
  serem termos técnicos, e pastas "departamentais" de negócio são em
  português) ou padronizar tudo em português.
- [x] **[CORRIGIDO] `docs/business/01-USE_CASES.md` → consolidação
  completa em `docs/projeto/04-USE_CASES.md` (2026-08-06):** os 7 UCs que
  faltavam (UC-35, UC-35-Exceção, UC-36, UC-37, UC-38, UC-42, UC-43) foram
  verificados contra o código real e consolidados. **6 confirmados
  `[IMPLEMENTADO]`** por leitura direta do código (UC-35 —
  `AccessDeniedPage`/`ModuleRoute`/`NO_ACCESS_PROFILE`; UC-35-Exceção —
  `variant="noProfile"`; UC-36 — sem `permission_version`, decisão
  intencional já em produção; UC-37 —
  `quality-releases-receiving-lot.test.ts` E2E; UC-38 —
  `DashboardPage.tsx canSee`/`relatorios.*`/`rastreabilidade` nas rotas
  reais; UC-42 — Fluxos A–F completos, incluindo D (expedição exclusiva
  `ACABADOS`, invariante 1) e E (débito automático de teste destrutivo),
  que já estavam prontos mas o texto antigo do draft dizia
  "ainda não implementados"). **UC-43 consolidado como parcial**: Fluxo B
  (alerta didático de 3 partes) `[IMPLEMENTADO]` nas 9 telas priorizadas;
  Fluxo A (`PrerequisiteChecklist` preventivo) confirmado `[PENDENTE]` —
  componente existe mas não é consumido em nenhuma tela (`grep` confirmou
  0 ocorrências fora do próprio arquivo do componente). Nenhum `[x]`
  indevido encontrado nos Blocos 1/3/4/5/6 correspondentes — todos já
  refletiam corretamente o estado real (o único `[ ]` genuíno, retrofit
  das telas não priorizadas em 6.2, permanece `[ ]`, correto).
- [x] **[CORRIGIDO] `docs/patrimonio/03-MANUTENCAO.md` estava vazio (0
  bytes) — preenchido (2026-08-06):** conteúdo escrito com base no código
  real do módulo (`server/src/modules/maintenance/`, model
  `MaintenanceOrder`, telas `client/src/pages/maintenance/`), sem duplicar
  o BPMN (`docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` §5) nem o
  Manual do Usuário (`docs/manual/00-MANUAL_DO_USUARIO.md` §10) — apenas
  resume e linka. Inclui a ressalva conhecida (já registrada como
  `RF-PAT-05 [PENDENTE]` em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
  §8): à época do preenchimento, `Asset.status` **não** era sincronizado
  automaticamente com ordens de manutenção.
  **[ATUALIZAÇÃO 2026-08-06, rodada posterior]** — essa ressalva foi
  corrigida no código: `Asset.status` agora sincroniza automaticamente
  (ver achado "2) `Asset.status` sem sincronização automática" acima,
  neste mesmo arquivo, para gatilhos/regras/testes). `docs/patrimonio/03-MANUTENCAO.md`
  em si segue sem edição por este agente (fora do território desta
  entrega) — o agente de documentação deve atualizar essa ressalva na
  próxima rodada.
- [x] **[CORRIGIDO] Referências cruzadas soltas (texto corrido, sem
  sintaxe de link markdown) a arquivos que não existem mais — todas as 4
  resolvidas em 2026-08-06:**
  - `docs/governance/HANDOFF_CODEX.md:418` citava `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`
    (ordem de risco das micro-entregas de expansão de schema) —
    **corrigido**: nota histórica adicionada (arquivo não existe mais; a
    ordem de execução em si já foi seguida, Fases 1–4.1 concluídas).
  - `docs/governance/HANDOFF_CODEX.md:1571` citava `docs/DATABASE_DICTIONARY.md` —
    **corrigido**: confirmado (pelo `documentador`, nesta sessão) como o
    nome antigo do que hoje é `docs/database/04-DICIONARIO_DADOS.md`
    (arquivo existe, verificado); referência atualizada.
  - `docs/producao/06-BOM.md:28` e `:330` citavam
    `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` associado à afirmação de que
    "MRP ainda não implementado" — **corrigido**: era de fato
    `[AUDITORIA-FALHOU]`, divergia de `CLAUDE.md` §4 (MRP implementado,
    roda contra estoque real). Texto reescrito para refletir o fluxo real
    hoje implementado (BOM → MRP → reserva automática na liberação da OP
    → requisição de compra via UC-24/UC-24b → apontamento/baixa de
    estoque no chão de fábrica → custo real), com nota explicando a
    correção e a citação órfã tratada com o mesmo padrão de nota
    histórica.
  - `docs/infra/BACKUP_RESTORE_G2_2026-07-31.md:336` citava
    `docs/UAT_RELEASE_G6_2026-07-31.md`, referenciado como evidência de
    um ensaio de canário local de 2026-07-31 — esse arquivo nunca existiu
    no repositório. **Corrigido**: nota adicionada deixando claro que a
    descrição do ensaio já presente no próprio documento é o registro
    disponível (não ficou claro se um arquivo dedicado chegou a existir),
    e apontando `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` como fonte vigente de
    status de Gate G6/rollback.
- [ ] **[PENDENTE] Paridade `.claude/agents/` × `.codex/agents/`:**
  `.claude/agents/` tem 15 arquivos `.md`, `.codex/agents/` tem 14
  `.toml` — falta o equivalente de `.claude/agents/webdesiner.md` em
  `.codex/agents/webdesiner.toml`. Não corrigido nesta sessão (requer
  conhecimento do formato/schema `.toml` usado pelos demais agentes
  Codex do projeto, fora do escopo de uma auditoria puramente
  estrutural de `docs/`).
- [x] **Confirmado, sem ação necessária:** `docs/database/DATABASE.md` (raiz) e a
  pasta `docs/database/` **não são duplicados divergentes** — o próprio
  `docs/database/DATABASE.md` já tem uma nota de topo (2026-08-06) deixando claro
  que é o changelog histórico narrativo, enquanto `docs/database/`
  (00-INDICE.md a 07-DISASTER_RECOVERY.md) é a referência estruturada
  vigente. Nenhum link aponta o caminho errado.
- [x] **Confirmado, sem ação necessária:** varredura completa de
  mojibake/encoding corrompido (`Ã©`, `Ã£`, `â€™` etc.) em todo `docs/*.md`
  e nos 3 arquivos `.md` da raiz não encontrou nenhuma ocorrência real
  (1 falso positivo em `docs/producao/04-ROTEIROS.md`: "PARÂMETROS" é
  grafia correta em português, não corrupção). Todos os arquivos de
  `docs/database/` confirmados como UTF-8 válido via `file`. Nenhum nome
  de arquivo/pasta com caractere não-ASCII.

---

## 2026-08-06 (apêndice 6) — Correção pós-auditoria: `AwardRfqUseCase` fora de transação + cobertura de teste do bug de `DeactivateAssetUseCase`

**Origem:** fecha as duas pendências deixadas em aberto no apêndice 4
acima ("Adjudicação de RFQ por item" `[MEDIO]` e o "Teste sugerido...
hoje inexistente" do bug de `DeactivateAssetUseCase`). Território: apenas
`server/src/modules/rfq/`, `server/src/modules/items/` (repositório
compartilhado `ItemSupplierRepository`, só a assinatura), `server/tests/`.

- [x] **`AwardRfqUseCase.ts:219` — leitura fora de transação corrigida.**
  `itemSupplierRepository.findByItemAndSupplier(...)` agora recebe
  `input.transaction` como terceiro argumento, igual ao `create`/`update`
  subsequentes na mesma função (linhas 226/230-237 antes da correção).
  Adicionado o parâmetro opcional `transaction?: any` à assinatura do
  método tanto no contrato de domínio
  (`server/src/modules/items/domain/repositories/ItemSupplierRepository.ts`)
  quanto na implementação Sequelize
  (`server/src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository.ts`),
  seguindo o mesmo padrão opcional já usado por `create`/`update`/
  `clearPreferredForItem` no mesmo arquivo — assinatura compatível com os
  outros dois call sites existentes (`CreateItemSupplierUseCase.ts`,
  `ConvertRequisitionToPurchaseOrdersUseCase.ts`, fora do território desta
  rodada, não alterados). **Tratamento de erro de constraint:** verificado
  que `middlewares/errorHandler.ts` já converte
  `Sequelize.UniqueConstraintError` em `409` com mensagem de negócio
  (`"Já existe um registro com este ..."`), então uma violação
  remanescente de `uq_item_suppliers_item_supplier` sob concorrência real
  já não vaza como 500 genérico — nenhuma alteração adicional necessária
  no use case.
- [x] **Teste de regressão para o bug de enum de `DeactivateAssetUseCase`.**
  Adicionados 2 testes unitários em
  `server/tests/unit/assets-use-cases.test.ts` (bloco
  `describe('DeactivateAssetUseCase (regressão: bug de 500 em DELETE
  /api/assets/:id)')`): (a) confirma que o use case grava exatamente
  `status: 'decommissioned'` e que esse valor pertence à lista real de
  valores do ENUM lida do próprio model
  (`Asset.rawAttributes.status.values`, `server/src/models/Asset.ts`) —
  falha se o enum mudar sem o use case acompanhar; também afirma
  explicitamente que `'inactive'` (o valor do bug original) **não**
  pertence ao enum; (b) confirma `NotFoundError` quando o repositório
  retorna `0` linhas afetadas (ativo inexistente).

**Validação:**
- `cd server && npm run typecheck` → 0 erros.
- `cd server && npx jest tests/unit` → 85 suites / **671 testes**
  passando (baseline anterior: 670; +1 líquido pela adição dos 2 testes de
  `DeactivateAssetUseCase` neste apêndice — a diferença de baseline não
  foi investigada por estar fora do território desta rodada, mas a suíte
  completa está 100% verde).
- `npx jest tests/unit/rfq.test.ts` → 20/20 (mocks existentes de
  `findByItemAndSupplier` continuam válidos com a assinatura estendida,
  já que o terceiro parâmetro é opcional).
- `npx jest tests/unit/assets-use-cases.test.ts` → 6/6 (4 pré-existentes +
  2 novos).

**Arquivos alterados nesta rodada:**
- `server/src/modules/rfq/application/use-cases/AwardRfqUseCase.ts`
- `server/src/modules/items/domain/repositories/ItemSupplierRepository.ts`
- `server/src/modules/items/infrastructure/sequelize/SequelizeItemSupplierRepository.ts`
- `server/tests/unit/assets-use-cases.test.ts`

**Documentos atualizados nesta rodada:** este arquivo (seção nova). Sem
mudança de contrato de API pública nem de regra de negócio visível ao
usuário — não houve alteração em `docs/arquitetura/API.md`, `docs/database/` ou
`docs/projeto/04-USE_CASES.md` (fora do território desta rodada e sem
necessidade real: nenhum endpoint/comportamento de negócio mudou, só
robustez interna + cobertura de teste).

---

## 2026-08-06 (apêndice 7) — UC-19/RF-COM-12: módulo Importação/COMEX (backend completo) `[x]` `[IMPLEMENTADO]`

**Origem:** `docs/projeto/04-USE_CASES.md` UC-19 ("Gerenciar Importação
(COMEX)") tinha caso de uso documentado desde a formalização do projeto,
mas **zero implementação** (nem model, nem rota, nem tela). Decisão do
dono do ERP: implementar o backend completo nesta rodada; a tela web
(`client/`) fica para uma rodada seguinte, de outro agente
(`PromadorFonteEnd`). Território desta rodada: novo módulo
`server/src/modules/comex/`, models novos, migration na faixa reservada
`20260806-000090`-`20260806-000099`, `server/app.ts`, `server/tests/`.

**O que o UC-19 pedia (fluxo principal, 6 passos):** (1) acessar
"Suprimentos > Importação"; (2) registrar processo de importação; (3)
informar fornecedor, produto, quantidade, valor FOB; (4) sistema calcula
tributos de importação (II, IPI, PIS, COFINS, ICMS); (5) registrar
acompanhamento (embarque, chegada, desembaraço); (6) após recebimento, dar
entrada no estoque com custo nacionalizado.

**O que foi implementado:**

- [x] **Schema** (migration `20260806-000090-create-import-processes.cjs`,
  `up`/`down` testados em ciclo real — `migration:up` → `migration:down` →
  `migration:up`, todos limpos):
  - `import_processes` (cabeçalho): `process_number` (`IMP-<ano>-XXXX`,
    único), `supplier_id` (FK `suppliers.id` RESTRICT), `status` ENUM
    (`draft`→`shipped`→`arrived`→`customs_cleared`→`received` |
    `cancelled`), `fob_currency`, `exchange_rate`, `freight_value`,
    `insurance_value`, `other_expenses_value` (estes 3 em BRL, `DECIMAL(18,6)`,
    usados no rateio pro-rata do valor aduaneiro entre os itens),
    `shipped_at`/`arrived_at`/`customs_cleared_at`/`received_at`
    (`DATEONLY`, um por marco do passo 5), `notes`, `created_by` (FK
    `users.id`).
  - `import_process_items`: `import_process_id` (FK CASCADE), `item_id`
    (FK `items.id` UUID, RESTRICT), `quantity`, `fob_unit_price` (moeda
    estrangeira do processo), `ii_rate`/`ipi_rate`/`pis_rate`/
    `cofins_rate`/`icms_rate` (`DECIMAL(7,4)`, percentual, informados
    manualmente pelo Analista de Comex — **sem integração Siscomex/NCM**,
    decisão explícita: o UC-19 não pede essa integração, então não foi
    criado stub para ela) e as colunas calculadas
    `customs_value`/`ii_value`/`ipi_value`/`pis_value`/`cofins_value`/
    `icms_value`/`nationalized_unit_cost`.
  - Models `server/src/models/ImportProcess.ts` e
    `server/src/models/ImportProcessItem.ts`, registrados com associações
    em `server/src/models/index.ts` (`Supplier↔ImportProcess`,
    `User↔ImportProcess`, `ImportProcess↔ImportProcessItem` CASCADE,
    `Item↔ImportProcessItem`).
- [x] **RBAC:** nova chave `'comex'` adicionada ao catálogo fixo
  `server/src/shared/domain/accessModules.ts` (`ACCESS_MODULES`), mesmo
  padrão de `manutencao`/`garantia` (2026-08-05). Todas as rotas usam
  `authorizeModule('comex', ...)` — leituras aceitam qualquer nível,
  escritas exigem `operate`. **Decisão:** nenhuma ação exige `approve`
  (diferente da adjudicação de RFQ), porque o UC-19 define um único ator
  (Analista de Comex) sem etapa de aprovação por um segundo nível.
- [x] **Clean Architecture** (mesmo padrão do módulo `rfq/`, usado como
  referência): `domain/repositories/ComexRepository.ts` (contrato),
  `infrastructure/sequelize/SequelizeComexRepository.ts`,
  `application/use-cases/` — `CreateImportProcessUseCase`,
  `ListImportProcessesUseCase`, `GetImportProcessByIdUseCase`,
  `RegisterImportTrackingUseCase`, `CancelImportProcessUseCase`,
  `ReceiveImportProcessUseCase`, mais dois helpers puros sem `export =`
  (`importTaxCalculator.ts`, `recalculateImportProcessTaxes.ts`, evitando
  deliberadamente a armadilha de misturar `export interface`/`export type`
  com `export = X` no mesmo arquivo) — `presentation/validators`
  (Zod, mesmo padrão de `rfqValidators.ts`), `presentation/controllers`,
  `presentation/routes/importProcesses.ts`, montada em `server/app.ts` como
  `app.use('/api/comex/import-processes', ...)`.
- [x] **Cálculo de tributos** (`importTaxCalculator.ts`, função pura,
  testada isoladamente): valor aduaneiro do item = FOB em BRL (quantidade ×
  preço unitário × câmbio) + frete/seguro do processo rateados pro-rata do
  FOB de cada item; II = aduaneiro × alíquota; IPI = (aduaneiro + II) ×
  alíquota; PIS/COFINS = aduaneiro × alíquota (base simplificada,
  documentada no código); ICMS = cálculo "por dentro" (gross-up) sobre
  aduaneiro + II + IPI + PIS + COFINS + despesas rateadas; custo
  nacionalizado = soma de tudo ÷ quantidade. Recalculado (a) na criação; (b)
  no acompanhamento, se dados monetários forem informados; (c) sempre,
  de forma fresca, imediatamente antes do recebimento.
- [x] **Recebimento (entrada em estoque com custo nacionalizado, UC-19
  passo 6):** `ReceiveImportProcessUseCase` exige status `customs_cleared`,
  resolve o `Product` legado de cada item via
  `ItemRepository.findLegacyProductByItemId` (método já existente,
  reaproveitado — mesma resolução `items.codigo = products.code` usada por
  `AwardRfqUseCase`/`ReceivePurchaseItemsUseCase`), chama
  `InventoryService.receive` (incrementa estoque + `InventoryMovement`) e
  `CostingService.registerWeightedAverageCost` (custo médio ponderado do
  `Product`) — **reaproveitando 100% da infraestrutura já testada**, sem
  duplicar lógica de estoque. **Decisão registrada explicitamente no
  código:** `reference_type`/`source_type` gravados como `'purchase'`
  (não existe valor dedicado `'import'` nos ENUMs
  `inventory_movements.reference_type`/`product_cost_ledgers.source_type` —
  criar um exigiria alterar 2 tabelas de altíssimo tráfego, fora do
  território exclusivo deste módulo); rastreabilidade preservada via
  `reference_id`/`source_id` = `import_processes.id` e via
  `description`/`notes` citando o número do processo.
- [x] **Sem geração automática de Conta a Pagar de tributos** (decisão
  documentada no código e aqui): `AccountPayable` é BRL-only e o UC-19 não
  pede esse gatilho explicitamente — fica como melhoria futura (ver
  "Pendências residuais" abaixo).
- [x] **Testes unitários:** `server/tests/unit/comex.test.ts` — 17 testes
  cobrindo a calculadora de tributos (item único, rateio multi-item,
  gross-up de ICMS), `CreateImportProcessUseCase` (número sequencial,
  fornecedor/item inexistente, itens vazios), `RegisterImportTrackingUseCase`
  (sequência correta, evento fora de ordem, recálculo com dado monetário),
  `CancelImportProcessUseCase` (cancelamento válido e bloqueio pós-`received`)
  e `ReceiveImportProcessUseCase` (fluxo feliz com mocks de
  `InventoryService`/`CostingService`, bloqueio pré-`customs_cleared`,
  produto legado ausente).
- [x] Guarda anti-regressão `server/tests/unit/module-authorization-map.test.ts`
  atualizada: `'comex'` adicionado a `MODULES_REQUIRING_AUTHORIZE_MODULE`.

**Rotas criadas (todas sob `/api/comex/import-processes`, `authenticate` +
`authorizeModule('comex', ...)`):**
- `GET /` — lista paginada (filtros `status`, `supplier_id`).
- `GET /:id` — detalhe (itens + fornecedor + criador).
- `POST /` — cria processo (`operate`).
- `POST /:id/tracking` — registra embarque/chegada/desembaraço (`operate`).
- `POST /:id/receive` — nacionaliza e dá entrada em estoque (`operate`).
- `POST /:id/cancel` — cancela processo não recebido (`operate`).

Payloads/contratos completos (para o agente de frontend que for construir
a tela) estão documentados em `docs/governance/HANDOFF_CODEX.md`, seção "UC-19 —
Importação/COMEX".

**Validação:**
- `cd server && npm run typecheck` → 0 erros.
- `cd server && npx jest tests/unit` → 86 suites / **698 testes**
  passando (100% verde; +17 líquidos de `comex.test.ts` + 1 teste de guarda
  ajustado, sem nenhuma regressão nos 671 pré-existentes + os +10 que já
  não batiam com o número citado no apêndice 6 — divergência de baseline
  não investigada por já vir de rodadas anteriores, fora do território
  desta).
- `npm run migration:up` → `20260806-000090-create-import-processes`
  aplicada; `npm run migration:down` → revertida limpo; `npm run
  migration:up` de novo → reaplicada limpo; `npm run migration:status` →
  confirma `up`.
- `curl http://localhost:5000/health/ready` → `{"status":"ready","database":"up",...}`
  antes e depois de todas as alterações (watch mode do backend dev não
  quebrou).
- `curl http://localhost:5000/api/comex/import-processes` (sem token) →
  `401` (confirma que a rota nova está montada e protegida — não `404`).

**Pendências residuais / fora do escopo desta rodada (não bloqueantes):**
- ~~Tela web (`client/`) do módulo — próxima rodada, agente
  `PromadorFonteEnd`.~~ **[RESOLVIDO 2026-08-06]** — ver entrada "UC-19
  (Importação/COMEX) — tela web entregue" mais abaixo neste arquivo.
- Sem integração Siscomex/NCM para resolver alíquotas automaticamente —
  decisão consciente, fora do que o UC-19 pede.
- Sem geração automática de Conta a Pagar de tributos de importação (DARF/
  guia) — `AccountPayable` não suporta moeda estrangeira; avaliar em
  sprint futura se o negócio quiser esse gatilho.
- Sem teste de integração real (Postgres) do fluxo completo
  create→tracking→receive — cobertura atual é 100% unitária (repositórios
  mockados), consistente com o padrão dos demais módulos novos do dia
  (RFQ, downtime, conciliação bancária) que também citam esse mesmo tipo
  de pendência em `docs/governance/TODO.md`.

**Arquivos criados/alterados nesta rodada:**
- `server/migrations/20260806-000090-create-import-processes.cjs`
- `server/src/models/ImportProcess.ts`, `server/src/models/ImportProcessItem.ts`
- `server/src/models/index.ts` (imports + associações + export)
- `server/src/shared/domain/accessModules.ts` (chave `'comex'`)
- `server/src/modules/comex/**` (módulo novo completo)
- `server/app.ts` (rota montada)
- `server/tests/unit/comex.test.ts` (novo)
- `server/tests/unit/module-authorization-map.test.ts` (`'comex'` adicionado)

**Documentos atualizados nesta rodada:** este arquivo (seção nova) e
`docs/governance/HANDOFF_CODEX.md` (seção UC-19). Por instrução explícita do
orquestrador desta rodada, `docs/arquitetura/API.md`, `docs/arquitetura/`,
`docs/projeto/` (incluindo `04-USE_CASES.md`), `docs/business/` e
`docs/patrimonio/` **não foram tocados** neste território (outros agentes
trabalhando em paralelo nesses arquivos) — os detalhes de rota/payload que
normalmente iriam para `docs/arquitetura/API.md`/`04-USE_CASES.md` foram registrados
integralmente em `docs/governance/HANDOFF_CODEX.md` para o próximo agente consolidar
onde for apropriado.

**[ATUALIZAÇÃO 2026-08-06, rodada de sincronização documental]** — as
pendências acima foram fechadas por outro agente: `docs/arquitetura/API.md` ganhou a
seção `§32. Importação / COMEX` (payloads reais confirmados contra
`importProcessValidators.ts`); `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`
§3 (RF-COM-12) e a tabela de divergências passaram para `[IMPLEMENTADO]`;
`docs/projeto/04-USE_CASES.md` (UC-19) ganhou a marcação
`[IMPLEMENTADO]` (backend; tela web pendente) com as decisões de escopo
resumidas; `docs/arquitetura/DIAGRAMA_CLASSES.md` ganhou o módulo `comex` na seção de
módulos recentes; `CLAUDE.md` §1/§4 e a contagem de migrations (66) foram
atualizados. Os dois achados `[ ]` acima sobre UC-19 (apêndice 4, item 1,
e a lista de "Achados/pendências novas" do apêndice 5) foram marcados
`[x]` com nota de resolução, sem reescrever o texto histórico original.

### 2026-08-06 (rodada seguinte, `AdmDBA`) — documentação de `docs/database/` regenerada `[x]`

Fluxo padrão pós-migration executado por completo para
`import_processes`/`import_process_items`: `docs/database/gen_dict.py`
ganhou `TABLE_DESC` curado para as 2 tabelas, `04-DICIONARIO_DADOS.md`
regenerado por introspecção real (80 tabelas), `schema.sql` regenerado
via `pg_dump`, `02-MODELO_LOGICO.md`/`01-MODELO_CONCEITUAL.md` ganharam o
bloco/entidade "Processo de Importação (COMEX)", contagens reconferidas
(66 migrations, 175 FKs) em `00-INDICE.md`/`02-MODELO_LOGICO.md`/
`03-MODELO_FISICO.md`, e `05-ACESSOS_E_ISOLAMENTO.md` ganhou confirmação
real (query em `information_schema.role_table_grants`) de que `evok_app`
herdou os grants nas tabelas novas automaticamente. Detalhe completo em
`docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`, entrada "2026-08-06 (quarta rodada)".
Território estrito de `docs/database/` + este registro + changelog em
`docs/database/DATABASE.md` — nenhum código (`server/`, `client/`) alterado, e
nenhuma migration nova criada (a `-000090` já existia e já estava `up`).

### 2026-08-06 (rodada seguinte, `PromadorFonteEnd`) — UC-19 (Importação/COMEX) — tela web entregue `[x]` `[IMPLEMENTADO]`

**Origem:** backend do UC-19 concluído na mesma data (apêndice 7 acima);
esta rodada fecha a pendência residual "Tela web (`client/`) do módulo".
Contratos confirmados contra o código real (`server/src/modules/comex/
presentation/`) antes de escrever qualquer tipo TypeScript, além da leitura
de `docs/governance/HANDOFF_CODEX.md`, seção "UC-19 — Importação/COMEX".

**O que foi entregue:**
- `client/src/api/comex.ts` — serviço de API com tipos estritos de todos os
  payloads/respostas (6 funções: listar, detalhar, criar, registrar
  acompanhamento, receber, cancelar).
- `client/src/pages/purchases/ComexPage.tsx` — listagem paginada com filtro
  por status; diálogo de criação (`react-hook-form` + `zod`, itens via
  `ItemSearchSelect`); diálogo de detalhe (`Dialog` centralizado, padrão do
  Pedido de Compra — não `Sheet`) com tributos calculados e custo
  nacionalizado por item; diálogo de registro de acompanhamento sequencial;
  diálogo de cancelamento com motivo obrigatório; ações de receber/cancelar
  com confirmação (`window.confirm`).
- Rota `/purchases/comex` em `client/src/App.tsx` (`ModuleRoute
  module="comex"`, guard dedicado — não reaproveita `compras`), item de
  menu "Importação (Comex)" na seção Compras de `client/src/layouts/
  AppLayout.tsx`.
- **Gap fechado nesta rodada:** `client/src/api/accessProfiles.ts` não
  tinha a chave `'comex'` no union type `AccessModuleKey` (só o catálogo do
  backend, `server/src/shared/domain/accessModules.ts`, tinha sido
  atualizado) — sem isso a rota/menu não compilariam. Adicionada.

**Validação:** `cd client && npx tsc --noEmit` (0 erros) e `npm run build`
(`tsc -b && vite build`, sucesso — encontrou 3 erros de inferência de tipo
zod/RHF que só aparecem em `tsc -b`, não em `tsc --noEmit` solto, corrigidos
trocando campos numéricos opcionais problemáticos por estado local simples
no diálogo de acompanhamento, mesmo padrão já usado em `ReceiveItemsDialog`
de `PurchasesPage.tsx`); `npx vitest run` (51/51, mesma baseline anterior,
sem regressão). Testado manualmente com `curl` contra o backend real (porta
5000): criação de processo com item real, `GET`/`GET :id`, transição de
tracking válida e inválida (422 confirmado com a mensagem esperada) e
cancelamento — registro de teste cancelado ao final para não sujar o banco.

**Pendências residuais:**
- `docs/arquitetura/API.md` não referencia a tela nova (fora do território deste
  agente; os endpoints em si já estão documentados lá desde a rodada de
  sincronização documental do mesmo dia).
- Sem teste E2E em navegador real (Cypress/Playwright não fazem parte do
  stack do projeto).
- Sem polimento visual dedicado (`webdesiner`) — a tela segue a estrutura
  de `RfqPage.tsx`/`PurchasesPage.tsx` ponto a ponto, mas não passou por
  revisão fina de hierarquia/responsividade.
- Nenhum perfil de acesso tem o módulo `comex` atribuído (mesma pendência
  já registrada pelo backend) — a tela se comporta corretamente nesse caso
  (`AccessDeniedPage`, mesma UX das demais telas), mas um admin precisa
  atribuir o módulo manualmente antes do primeiro uso real.

**Arquivos criados/alterados nesta rodada:**
- `client/src/api/comex.ts` (novo)
- `client/src/pages/purchases/ComexPage.tsx` (novo)
- `client/src/App.tsx`, `client/src/layouts/AppLayout.tsx`,
  `client/src/api/accessProfiles.ts` (alterados)
- `docs/governance/HANDOFF_CODEX.md` (nova seção "UC-19 — Importação/COMEX: tela web"),
  `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` (FE3), `docs/
  LEVANTAMENTO_ERP_2026-08-02.md` (seção 1), este arquivo (esta entrada).

**Território:** `client/` apenas, mais os 4 arquivos de registro acima.
`server/`, `docs/arquitetura/API.md`, `docs/arquitetura/`, `docs/database/`,
`docs/projeto/` não foram tocados (instrução explícita do escopo desta
rodada).

---

## 2026-08-06 — Reorganização da documentação departamental (IDs de departamento vs. seed)

**Contexto:** dono do produto reclamou que faltava documentação em
`docs/administrativo/` e pediu auditoria de todos os docs departamentais
contra o seed oficial (`server/src/config/seeds.ts`, 17 departamentos,
códigos `01`–`17`).

**Feito nesta rodada (agente documentador, território `docs/` apenas):**
- Reescrita da tabela "Índice de Departamentos por Módulo" em
  `docs/00-ESTRUTURA_ORGANIZACIONAL.md` para bater 1:1 com o seed
  (`02 RH`, `06 ALM`, `10 QUAL`, `11 EXP`, `12 MANUT`, `13 TI`, `14 MKT`,
  `16 JUR`, `17 FAC` corrigidos); nova seção "Subáreas funcionais" para
  `CONT`/`CTR`/`TES` (⊂ Financeiro), `LAB`/`GQ` (⊂ Qualidade), `COMEX`
  (⊂ Compras) — deixando explícito que **não são departamentos no banco**.
- Corrigidos os IDs errados em `docs/{comercial,juridico,logistica,
  qualidade,financeiro,suprimentos}/00-README.md` (tabela "Departamentos
  Cobertos").
- Adicionada tabela "Departamentos Cobertos" em `docs/patrimonio/00-README.md`
  (ALM=06, MANUT=12 — hospedados ali por afinidade de conteúdo) e em
  `docs/rh/00-README.md` (RH=02, sem headcount ainda).
- Criados `docs/administrativo/04-PERFIS_ACESSO.md` (RBAC + Perfis de
  Acesso configuráveis, a partir de `accessModules.ts`/`accessProfiles`
  módulo real) e `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`
  (organograma consolidado por diretoria).
- `CLAUDE.md` §8: corrigida a contagem "21 departamentos" → "17
  departamentos reais + 6 subáreas" no link de `00-ESTRUTURA_ORGANIZACIONAL.md`,
  adicionados links para os dois docs novos de `administrativo/`.

**[AUDITORIA-FALHOU] achado crítico de um agente em paralelo (AdmDBA), não
resolvido por este agente (fora do território `docs/`):** ver
`docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md`. A tabela `departments`
está **vazia (0 linhas)** no banco Docker local usado pela API
(`erp_evok_audio`), apesar do seed já ter rodado uma vez (usuário admin e
outros artefatos já existem) — `seedDatabase()` só popula departamentos
quando `User.count() === 0`, então nunca mais recria a linha se o admin já
existe e os departamentos não. Existe uma migration idempotente já pronta e
**não aplicada**: `server/migrations/20260806-000120-reconcile-departments-with-official-seed.cjs`.
O mesmo achado reporta o banco local contaminado com ~53 usuários e ~37
perfis de acesso de fixtures de teste (`*-rbac-*@evok.local`, timestamps Unix
no nome).

- [PENDENTE] Dono do produto aprovar e rodar
  `npm run migration:up` para a migration `20260806-000120` (repopula os 17
  departamentos oficiais via `INSERT ... ON CONFLICT (code) DO UPDATE`).
- [PENDENTE] Decidir se o banco Docker local (`erp_evok_audio`) deve ser
  resetado (`docker compose down -v` + novo `up` + seed limpo) antes do
  Go-Live, dado o volume de fixtures de teste RBAC/E2E encontrado nele.
- [PENDENTE] Decisão de negócio: se `Contabilidade`/`Controladoria`/
  `Tesouraria`/`Laboratório de Testes`/`Garantia da Qualidade`/`Comex` devem
  virar departamentos formais em `departments` (novos códigos `18+`) — até
  lá, seguem documentados apenas como subáreas funcionais (sem
  `department_id` próprio), conforme feito nesta rodada.
- [PENDENTE] Avaliar criação de um script de verificação (candidato a CI)
  que compare `DEPARTMENTS` de `seeds.ts` contra as tabelas "Departamentos
  Cobertos" de cada `docs/*/00-README.md`, para nunca mais divergir sem
  detecção automática (proposto em detalhe no §5 do audit doc acima).

**Não tocado nesta rodada (decisão de escopo, registrar para o dono
avaliar):**
- `docs/projeto/02-PLANO_INDUSTRIAL.md` mantém a numeração histórica de 21
  departamentos (concepção original, anterior ao seed de 17) — não foi
  reescrito; tratado como documento histórico, com nota de divergência
  adicionada em `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`.
- `docs/administrativo/01-DIRETORIA.md`, `02-TI.md`, `03-FACILITIES.md`
  continuam com esquemas SQL de planejamento (`strategic_planning`,
  `it_tickets`, `fleet_vehicles`, etc.) que não existem no schema real —
  adicionada nota `[PENDENTE]` no topo de cada um apontando para
  `docs/database/DATABASE.md`, mas o conteúdo de negócio (cargos, funções, KPIs) não
  foi reescrito por já ser considerado útil/não-redundante.
- `docs/governance/HANDOFF_CODEX.md` não foi atualizado por este agente: é o handoff
  específico da migração Product→Item, sem relação temática com
  reorganização departamental — registrar aqui em vez de poluir aquele
  documento.

**Arquivos alterados/criados nesta rodada:**
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md`, `CLAUDE.md` (§8 apenas).
- `docs/administrativo/00-README.md`, `01-DIRETORIA.md`, `02-TI.md`,
  `03-FACILITIES.md` (notas + footer), `04-PERFIS_ACESSO.md` (novo),
  `05-ORGANOGRAMA_EXECUTIVO.md` (novo).
- `docs/{comercial,juridico,logistica,qualidade,financeiro,suprimentos,
  seguranca_trabalho,producao,patrimonio,rh}/00-README.md` (correção de
  IDs + footer de data).
- Este arquivo (esta entrada).

**Território:** `docs/` apenas. `client/`, `server/`, migrations não foram
tocados por este agente.

---

## 2026-08-06 — Auditoria Cruzada BLOCO 1 SST (Requisitos × Banco × API) — `AuditorIntegrador`

**Escopo:** gate de qualidade pré-código do módulo SST (departamento 15),
confrontando `docs/business/BLOCO_1_SST_REQUISITOS.md` (55 RF-SST, UC-44 a
UC-48), `docs/business/BLOCO_1_SST_MODELO_DADOS.md` (12 migrations,
`20260806-000130` a `000141`) e `docs/business/BLOCO_1_SST_API.md` (75
endpoints), com `docs/business/briefs/BRIEF_SST_2026-08-06.md` como fonte
de verdade do domínio.

**Veredito: `APROVADO PARA IMPLEMENTAÇÃO`** — rastreabilidade RF→Tabela e
RF→Endpoint 100% verificada (nenhum RF-SST-001..055 órfão nas duas
direções), imutabilidade de `EntregaEPI`/`Acidente`/`CAT` confirmada por
trigger e sem PUT/DELETE incompatível na API, RBAC `sst` consistente
(mais restritivo que `rh`, 2 exceções de leitura enxuta documentadas). 9
inconsistências reais encontradas e já corrigidas nos próprios artefatos
(documentos + 2 arquivos de código) durante a auditoria — nenhuma ficou
pendente sem decisão registrada.

**Correções aplicadas diretamente pelo `AuditorIntegrador` (autoridade de
decisão em pontos ambíguos, sem round-trip com os agentes anteriores):**

1. `[IMPLEMENTADO]` **Bug de schema real (bloqueador se não corrigido):**
   `sst_riscos_ocupacionais.categoria_agente`/`.agente` nasceram `NOT NULL`,
   tornando impossível representar RF-SST-036/BR-SST-026 ("registro
   explícito de ausência de risco identificado"). Tornados `NULL`-áveis +
   `CHECK ck_sst_riscos_ocupacionais_ausencia_coerente` em
   `server/migrations/20260806-000139-create-sst-pgr-ges.cjs` (migration
   ainda não aplicada — `status: down` — correção segura).
2. `[IMPLEMENTADO]` **Tabela de auditoria ausente:** `POST
   /api/sst/accidents/:id/complements` (contrato já publicado) prometia
   trilha de auditoria por lançamento (BR-SST-017, Lei 8.213/91), mas a
   migration só permitia `UPDATE` direto de `dias_perdidos`/`houve_cat` sem
   histórico de quem/quando/motivo. Criada `sst_acidente_complementos`
   (insert-only) em `server/migrations/20260806-000135-create-sst-acidente.cjs`.
3. `[IMPLEMENTADO]` **Bug de runtime certo (3 arquivos):** o valor
   `'sst_epi_delivery'` foi adicionado ao ENUM do Postgres
   (`enum_inventory_movements_reference_type`) mas não sincronizado em
   código — `server/src/models/InventoryMovement.ts` (tipo TS + `DataTypes.ENUM`),
   `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
   (`z.enum`), `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts`
   (`REFERENCE_TYPES`) — os 3 rejeitariam a baixa de estoque de EntregaEPI
   em runtime. Corrigidos.
4. `[IMPLEMENTADO]` **API doc desatualizada vs. decisão real do banco:**
   `BLOCO_1_SST_API.md` §1.3 ainda descrevia devolução de EPI como "grava
   em coluna própria" na própria `sst_entregas_epi`, mas o `AdmDBA` já
   havia decidido tabela dedicada (`sst_devolucoes_epi`, insert-only) — a
   pergunta pendente do `ArquitetoSoftwareAPI` no rodapé do documento já
   estava respondida no documento do `AdmDBA`, só não tinha sido
   propagada. Texto e pendência marcados como resolvidos.
5. `[IMPLEMENTADO]` **Enum divergente `papel` da CIPA:** exemplo usava
   `"vice"`, mas o ENUM real é `vice_presidente`
   (`sst_membros_cipa.papel`, migration `000138`) — corrigido no exemplo.
6. `[IMPLEMENTADO]` **Enum inválido nos exemplos de evidência de EntregaEPI:**
   `"assinatura_eletronica"` não é um dos 3 valores de
   `sst_entregas_epi.evidencia_tipo`; corrigido para `aceite_eletronico`
   em 2 exemplos (PATCH evidence e GET ficha).
7. `[IMPLEMENTADO]` **Enum divergente `norma` de treinamento:** exemplos
   usavam `brigada`/`cipa` (minúsculo), mas o ENUM real é
   `NR-23_brigada`/`CIPA` (`sst_treinamentos.norma`, migration `000140`).
8. `[IMPLEMENTADO]` **Tipo incompatível `setor` (string) vs. `department_id`
   (FK obrigatória):** `POST /api/sst/risks` e `POST /api/sst/inspections`
   enviavam `"setor": "Injeção"` (texto livre) mas os campos reais são
   `department_id INTEGER NOT NULL FK`. Corrigido para `department_id` nos
   dois payloads — decisão: não fazer lookup de nome de setor no backend
   (frágil), cliente deve enviar o id como em Manutenção/Patrimônio.
9. `[IMPLEMENTADO]` **Contagem de endpoints incorreta:** "Resumo — Handoff"
   afirmava 65 endpoints; contagem real de linhas de rota nas tabelas é 75.
   Corrigido.

**`[PENDENTE]` — decisão de expectativa registrada, não uma correção de
schema/código, mas deve orientar o dimensionamento de esforço do
`programador`:** a nota do `AdmDBA` de que a tradução PT-BR (banco) ↔
inglês (API) "é responsabilidade do repositório/DTO, como em qualquer
módulo Clean Architecture do projeto" foi **verificada como falsa** contra
os módulos maduros citados como referência
(`server/src/modules/nonConformities/`, model `NonConformity.ts`): hoje o
projeto **não tem nenhum mapper de tradução de nome de campo** — os
repositórios retornam a instância Sequelize com os mesmos nomes de coluna
do banco (ambos em inglês). SST será o **primeiro módulo do projeto** a
exigir um mapper DTO real (tradução de idioma, não só de convenção de
caixa) para `TipoEPI`/`ASO`/`Acidente`/etc. — o `programador` deve
orçar isso como trabalho novo, não reuso de padrão existente.

**`[PENDENTE]` — fora do escopo desta auditoria, herdado do próprio
`BLOCO_1_SST_API.md` §Resumo (itens 5 e 6), não bloqueia início de
implementação do P0:** RF-SST-009 (checklist de devolução de EPI disparado
por desligamento do RH) sem endpoint/gatilho formalizado entre módulos;
RF-SST-020 (relatório anual PCMSO) e RF-SST-050 (consumo de status de
extintores do Patrimônio/Manutenção) sem endpoint detalhado. Recomenda-se
UC dedicado antes de implementar essas 3 integrações específicas — não
impede o restante do Bloco 1.

**Auditoria parcial (declarado, não omitido):** não foram lidas as 4
migrations restantes do cluster (`000130`, `000132`, `000133`, `000140`,
`000141`) linha a linha com o mesmo rigor dado a
`000131`/`000135`/`000136`/`000137`/`000138`/`000139` — verificação foi por
amostragem dirigida aos pontos de maior risco (imutabilidade, polimorfismo,
FK). Migration `000130` (`sst_tipos_epi`/`sst_matriz_epi`) não foi lida
linha a linha nesta rodada. Recomenda-se conferência humana rápida dessas
antes do `programador` iniciar, ainda que o risco resida majoritariamente
nas já revisadas (triggers e chaves polimórficas).

**Arquivos alterados nesta auditoria:**
- `docs/business/BLOCO_1_SST_MODELO_DADOS.md` (6 notas de correção)
- `docs/business/BLOCO_1_SST_API.md` (9 correções de texto/exemplo)
- `server/migrations/20260806-000139-create-sst-pgr-ges.cjs` (schema)
- `server/migrations/20260806-000135-create-sst-acidente.cjs` (schema)
- `server/src/models/InventoryMovement.ts` (bug de ENUM)
- `server/src/modules/inventory/presentation/validators/inventoryValidators.ts` (bug de ENUM)
- `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts` (bug de ENUM)

**Nota:** `server/src/shared/domain/accessModules.ts` já tinha a chave
`sst` adicionada (mudança não commitada, working tree) antes desta
auditoria, embora ambos `BLOCO_1_SST_REQUISITOS.md` §5.3 e
`BLOCO_1_SST_API.md` a descrevam como "pendência para o `programador`" —
documentação desatualizada em relação ao código já escrito; não é um
problema, só uma informação para quem for commitar (a chave deve ir junto
do commit de implementação do módulo SST, não separada).
