# TODO de Governança — Controle de Acesso por Área + Fluxos Complementares

Origem: `docs/business/01-USE_CASES.md` (UC-30 a UC-43) e
`docs/business/BUSINESS_RULES.md`. Este documento **não implementa nada**
— apenas quebra os requisitos em tarefas técnicas que os agentes
programadores/DBA/QA devem puxar, na ordem sugerida (dependências
indicadas). Ao concluir cada bloco, o programador deve atualizar
`docs/governance/HANDOFF_CODEX.md` e consolidar os casos de uso implementados em
`docs/projeto/04-USE_CASES.md`.

> ## ⚠️ Estado do banco em 2026-08-10 — leia antes de qualquer entrada abaixo
>
> As **160** migrations estão **aplicadas nos dois bancos** (`erp_evok_audio` e
> `erp_evok_audio_test`), commit `e2a8d7e`. Os dois foram medidos como
> **idênticos** — coluna, tipo, default, índice e constraint
> (`node server/scripts/comparar-bancos.cjs`).
>
> **Toda linha deste arquivo que diz "migration NÃO aplicada" e é anterior a
> 2026-08-10 está superada.** Elas foram escritas quando aplicar migration
> estava barrado pelo classificador de permissão do ambiente; esse bloqueio
> caiu. Não foram reescritas uma a uma de propósito — o arquivo é um registro
> cronológico, e reescrever o passado apagaria o histórico. Este bloco é a
> fonte de verdade sobre o estado atual.
>
> O baseline (`20260731-000001-baseline-schema.cjs`) deixou de gerar schema a
> partir dos models e passou a aplicar DDL congelado — ver a última seção
> deste arquivo e `docs/database/DATABASE.md`.

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

---

## 2026-08-07 — Implementação Backend BLOCO 1 SST (P0) — `programador`

**Escopo:** implementação do backend do módulo SST a partir dos artefatos
já auditados/aprovados (`docs/business/BLOCO_1_SST_{REQUISITOS,MODELO_DADOS,API}.md`,
commit `fed55f8`). Ordem de prioridade seguida conforme instrução: P0
primeiro (EPI, ASO, Acidente/CAT, fila eSocial); CIPA/PGR/Treinamentos/
Rotina Preventiva/Ações Corretivas (CRUD) ficam para a próxima passada.

- [x] `server/src/shared/domain/accessModules.ts` — chave `sst` já
  existia (adicionada pela auditoria anterior), confirmada sem alteração
  necessária.
- [x] 14 models Sequelize (`server/src/models/Sst*.ts`) registrados e
  associados em `server/src/models/index.ts`, refletindo exatamente o
  schema das 12 migrations pendentes (`server/migrations/20260806-000130`
  a `000141`) — **nenhuma migration foi tocada/aplicada** (`migration:up`
  continua pendente de aprovação do dono do produto, instrução explícita
  da tarefa).
- [x] Módulo `server/src/modules/sst/` em Clean Architecture (domain/
  application/infrastructure/presentation), seguindo o padrão de
  `nonConformities`/`maintenance`:
  - [x] Cluster EPI (NR-6, UC-44): `EpiRepository`/`SequelizeEpiRepository`,
    `EpiMapper` (mapper DTO PT-BR↔inglês, primeiro do projeto — `ca`↔
    `ca_numero`, `ativo`↔`active`, `tamanhos_variacoes`↔`tamanhos`,
    `tipo_epi_id`↔`epi_type_id`), 16 use cases, `epiController`, rotas em
    `sst.ts`. `ConfirmEpiDeliveryUseCase` integra com
    `/api/inventory/movements` via adapter
    `InventoryMovementServiceAdapter` (interface `InventoryMovementService`
    injetada — nenhum import direto de Sequelize/Model do módulo
    `inventory`), reaproveitando `reference_type: 'sst_epi_delivery'` já
    habilitado pela auditoria anterior.
  - [x] Cluster ASO/PCMSO (NR-7, UC-45): `AsoRepository`/
    `SequelizeAsoRepository`, `AsoMapper` (rename `risco_exigente`↔
    `risco_exigido`, divergência não documentada nos blocos anteriores),
    9 use cases, `asoController` (log de leitura RNF-SST-05 via
    `logAction` fire-and-forget), rota de status enxuto
    `GET /aso/status/:employeeId` com checagem `sst`|`rh` inline
    (`requireSstOrRh`, mesmo padrão de Requisição de Compra).
  - [x] Cluster Acidente/CAT (Lei 8.213/91, UC-46): `AccidentRepository`/
    `SequelizeAccidentRepository`, `AccidentMapper`, `legalDeadlineService`
    (cálculo de `prazo_limite` — 1º dia útil seguinte, imediato em óbito;
    **simplificado**: considera só sábado/domingo, sem calendário de
    feriados nacionais parametrizável — melhoria futura documentada),
    10 use cases, `accidentController`.
  - [x] Fila eSocial (S-2210/S-2220/S-2240, UC-47): `EsocialEventRepository`/
    `SequelizeEsocialEventRepository`, 3 use cases, `esocialController` —
    fila 100% passiva (só nasce como efeito colateral de `POST /aso` e
    `POST /accidents/:id/cat`; `POST /:id/resend` é a única escrita
    direta, restrita a evento `rejeitado`).
  - [x] Router agregador `server/src/modules/sst/presentation/routes/sst.ts`
    montado em `server/app.ts` sob `/api/sst` — **38 dos 75 endpoints do
    contrato completo** (`BLOCO_1_SST_API.md`) implementados nesta
    passada (grupos 1-4: EPI, ASO, Acidente/CAT, eSocial). Grupos 5-9
    (CIPA, PGR/GES, Treinamentos, Rotina Preventiva, Ações Corretivas)
    **não implementados nesta passada** — ver pendências no handoff.
  - [x] Middleware de erro: `server/src/middlewares/errorHandler.ts`
    ganhou mapeamento dedicado (409 `CONFLICT` amigável) para a exceção
    Postgres dos triggers de imutabilidade SST
    (`sst_lock_entrega_epi`/`sst_lock_acidente`/`sst_lock_cat`/
    `sst_block_delete_evento_esocial`), caso algum bypass escape da
    validação de aplicação (defesa em profundidade, instrução explícita
    da tarefa).
- [x] **Gap de schema documentado (não é bug desta entrega):**
  `sst_acidentes` não tem coluna de status de encerramento — `POST
  /accidents/:id/close` funciona como portão de validação (RF-SST-026)
  sem persistir uma nova transição de estado. Registrado em
  `docs/database/DATABASE.md` e no handoff.
- [x] Testes unitários (`server/tests/unit/sst-{epi,aso,accident,esocial,rbac}.test.ts`,
  55 casos): fluxo principal + fluxo de exceção de cada caso de uso P0
  (CA vencido, evidência ausente, reconfirmação, 2ª CAT inicial,
  encerramento sem investigação/ação corretiva, reenvio de evento não-
  rejeitado, corrida de evento ativo duplicado) + RBAC (`requireSstOrRh`
  libera `sst`/`rh`/admin, bloqueia demais com 403; guarda genérico
  `module-authorization-map.test.ts` estendido com `sst`).
- [x] `npm run typecheck --prefix server`: 0 erros. `npx jest tests/unit`:
  762/763 passando (1 falha pré-existente e não relacionada, dependente de
  data corrente, confirmada igual no baseline antes desta entrega).
- [x] **Não implementado nesta passada** (ver handoff para detalhamento):
  CIPA, PGR/GES, Treinamentos, Rotina Preventiva, recurso genérico de
  Ações Corretivas (`/api/sst/corrective-actions` — a criação inline via
  investigação de acidente já existe, mas não o CRUD dedicado), testes de
  integração HTTP (Supertest) contra banco real, aplicação das migrations.
  **Concluído em 2026-08-07 (passada 2)** — ver entrada abaixo. Testes de
  integração HTTP e `migration:up` continuam pendentes/fora de escopo.

---

## 2026-08-07 — Implementação Backend BLOCO 1 SST, passada 2 (37 endpoints restantes) — `programador`

**Escopo:** completar os 37 endpoints restantes do contrato SST
(`docs/business/BLOCO_1_SST_API.md`, 75 endpoints totais) a partir da
passada anterior (commit `8482e79`, 38/75): CIPA, PGR/GES, Treinamentos,
Rotina Preventiva e CRUD dedicado de Ações Corretivas. **Nenhuma migration
foi criada/alterada/aplicada** — mesmo princípio da passada 1.

- [x] 20 models Sequelize novos (`server/src/models/Sst*.ts`) registrados
  e associados em `server/src/models/index.ts`: CIPA (`SstMandatoCipa`,
  `SstMembroCipa`, `SstProcessoEleitoralCipa`, `SstCandidatoCipa`,
  `SstReuniaoCipa`, `SstReuniaoCipaPresente`), PGR/GES (`SstGes`,
  `SstGesFuncionario`, `SstRiscoOcupacional`, `SstRiscoEpi`,
  `SstRiscoExame`), Treinamentos (`SstMatrizTreinamento`,
  `SstTreinamento`), Rotina Preventiva (`SstInspecaoSeguranca`,
  `SstInspecaoItem`, `SstPermissaoTrabalho`, `SstPtExecutante`,
  `SstBrigadista`, `SstRegistroDds`, `SstDdsPresenca`).
- [x] Módulo `server/src/modules/sst/` estendido (mesmo padrão
  Clean Architecture das passadas anteriores, sem recriar EPI/ASO/
  Acidente/eSocial):
  - [x] Cluster CIPA (NR-5, CF/88, UC-48): `CipaRepository`/
    `SequelizeCipaRepository`, `CipaMapper` (`estabilidade_inicio`↔
    `inicio_candidatura`, `estabilidade_fim`↔`fim_estabilidade`,
    `mandato_id`↔`mandate_id`), 12 use cases, `cipaController`. Inclui
    `GET /cipa/dimensioning` (tabela genérica por headcount,
    `[VERIFICAR CNAE/grau de risco]` documentado — NR-5 Quadro I real
    depende de parametrização por CNAE, fora de escopo desta passada),
    `fim_estabilidade` persistido na criação do membro
    (`mandato.data_fim + 1 ano`, decisão fechada não reaberta), bloqueio
    de posse sem `TreinamentoSST` tipo `CIPA` (BR-SST-024) e bloqueio de
    2º mandato consecutivo eleito (BR-SST-021) tanto na adição de membro
    quanto na inscrição de candidato.
  - [x] Cluster PGR/GRO + GES (NR-1): `PgrRepository`/
    `SequelizePgrRepository`, `PgrMapper` (`intensidade_concentracao`↔
    `intensidade`, `proxima_revisao_prevista`↔`data_revisao_prevista`,
    `medidas_controle` array↔`TEXT`), 6 use cases, `pgrController`.
    `CreateRiskUseCase` replica em aplicação o mesmo CHECK de banco
    `ck_sst_riscos_ocupacionais_ausencia_coerente` (RF-SST-036/BR-SST-026)
    para devolver `ValidationError` 400 amigável em vez de erro de
    constraint Postgres. `AddGesMemberUseCase` gera `EventoESocialSST`
    tipo `S-2240` pendente (RF-SST-040).
  - [x] Cluster Treinamentos (NRs): `TrainingRepository`/
    `SequelizeTrainingRepository`, `TrainingMapper`
    (`periodicidade_reciclagem_meses`↔`periodicidade_meses`,
    `data_realizacao`↔`data`), 6 use cases, `trainingController`.
    `GetTrainingBlocklistUseCase` junta matriz × treinamentos ×
    funcionários ativos (RF-SST-046); `CreateTrainingUseCase` calcula
    `validade` pela matriz da função ou usa o default bienal (24 meses)
    confirmado para NR-10.
  - [x] Cluster Rotina Preventiva (Inspeções, PT, Brigada, DDS):
    `SafetyRoutineRepository`/`SequelizeSafetyRoutineRepository`,
    `SafetyRoutineMapper` (`item_verificado`↔`item`), 10 use cases,
    `safetyRoutineController`. Item de inspeção não-conforme gera
    `SstAcaoCorretiva` automática (`origem: 'inspecao_seguranca'`,
    prazo de 1 dia se `risco_grave_iminente`, 15 dias caso contrário —
    parametrização própria desta passada, não estava no contrato).
  - [x] CRUD dedicado de Ações Corretivas: `CorrectiveActionRepository`/
    `SequelizeCorrectiveActionRepository`, `CorrectiveActionMapper`
    (`origem_tipo`↔`origem`, `status: atrasada` sempre derivado por
    leitura, nunca setável via `PUT`), 3 use cases,
    `correctiveActionController`.
  - [x] Router `server/src/modules/sst/presentation/routes/sst.ts`
    estendido (não recriado) com os 37 endpoints — **75/75 endpoints do
    contrato completo** (`BLOCO_1_SST_API.md`). `GET /cipa/stability/:id`
    reaproveita o middleware `requireSstOrRh` já existente (exceção
    `sst`|`rh`, mesmo padrão de `GET /aso/status/:id`).
- [x] Decisões de design tomadas por conta própria (documentadas,
  não reabrem escopo fechado):
  - `GetDimensioningUseCase`: tabela genérica de dimensionamento por
    faixa de headcount (NR-5 Quadro I real depende de CNAE/grau de risco,
    `[VERIFICAR COM TÉCNICO SST DA EMPRESA]`).
  - `AddCandidateUseCase`: além do bloqueio por 2 mandatos consecutivos
    (BR-SST-021, já no contrato), também rejeita inscrição em processo
    eleitoral já encerrado (apurado) — não estava explícito no contrato,
    mas é a interpretação natural de "eleger fora do processo aberto".
  - `ListBrigadeUseCase`: mínimo de brigadistas configurado é uma
    constante placeholder (`[VERIFICAR COM TÉCNICO SST DA EMPRESA]`,
    NBR 14276 real varia por população/risco do prédio).
  - Prazo de ação corretiva automática de inspeção (1 dia se risco grave
    e iminente, 15 dias caso contrário) — não especificado no contrato,
    parametrização razoável desta passada.
- [x] Testes unitários novos (`server/tests/unit/sst-{cipa,pgr,training,
  safety-routine,corrective-action}.test.ts`, 54 casos): fluxo principal +
  ao menos 1 fluxo de exceção por grupo (CIPA: 2 mandatos consecutivos
  eleitos, candidatura fora de processo aberto, posse sem treinamento,
  reunião ordinária sem ata; PGR: incoerência ausência-de-risco vs.
  agente informado; Treinamentos: matriz duplicada, blocklist com
  matrícula vencida; Rotina Preventiva: PT sem campos obrigatórios/datas
  invertidas, encerrar PT já encerrada; Ações Corretivas: tentativa de
  setar `status: atrasada` manualmente).
- [x] `npm run typecheck --prefix server`: 0 erros.
  `npx jest tests/unit --runInBand`: 816/817 passando (1 falha
  pré-existente e não relacionada, `onda3-shipping-cockpit-cashflow.test.ts`,
  confirmada igual à da passada anterior — dependente de data corrente).
  Antes desta passada: 762/763. Delta: +54 testes novos, 0 regressões.
- [x] `docs/database/DATABASE.md` atualizado com seção "passada 2".
- [ ] Segue pendente (fora de escopo desta passada, igual à anterior):
  testes de integração HTTP (Supertest) contra banco real, aplicação das
  migrations `migration:up`, telas de frontend para os 5 novos grupos.

## 2026-08-07 — Auditoria Cruzada BLOCO 2 TI (Requisitos × Banco × API) — `AuditorIntegrador`

**Escopo:** gate de qualidade pré-código do módulo TI (departamento 13),
confrontando `docs/business/BLOCO_2_TI_REQUISITOS.md` (46 RF-TI, UC-49 a
UC-51), `docs/business/BLOCO_2_TI_MODELO_DADOS.md` (6 migrations,
`20260807-000150` a `000155`) e `docs/business/BLOCO_2_TI_API.md` (57
endpoints, middleware `authorizeSelfOrModule`), com
`docs/business/briefs/BRIEF_TI_2026-08-06.md` como fonte primária.
Relatório completo em `docs/business/BLOCO_2_TI_AUDITORIA.md`.

**[IMPLEMENTADO]** Rastreabilidade RF→Tabela→Endpoint 100% verificada
(46/46 RF-TI, nenhum órfão nas duas pontas).

**[IMPLEMENTADO]** 7 inconsistências reais encontradas e corrigidas
diretamente nos artefatos (docs + migrations, ainda não aplicadas ao
banco) nesta mesma passada — nenhuma pendência de auditoria remanescente
para o `programador` começar `server/src/modules/ti/`:
1. Conflito de parametrização (RF-TI-046): `AdmDBA` havia decidido "sem
   tabela", citando RF-SST-019 como precedente — verificado que RF-SST-019
   nunca foi implementado em código (não é precedente válido). Criada
   `ti_settings` (migration `20260807-000156`), seguindo o precedente real
   `production_cost_settings` (já em produção).
2. Aprovador de `grant`/`change` de acesso: `BLOCO_2_TI_API.md` §4.1
   afirmava incorretamente que não existia FK de gestor de departamento —
   `departments.manager_id → employees.id` e `employees.user_id →
   users.id` já existem e foram verificados em código; doc corrigido, sem
   migração de schema necessária.
3. `it_tickets.requester_id` estava `NOT NULL`, mas a API contrata um
   chamado automático sem requester humano (RF-TI-040, falha de backup) —
   migration `20260807-000150` corrigida: `requester_id` agora nullable +
   nova coluna `system_generated` + CHECK.
4. `it_ticket_priority_history` já existia (migration `20260807-000151`),
   mas `BLOCO_2_TI_API.md` ainda tratava a tabela como incerta —
   documentação corrigida (falso positivo de desalinhamento entre agentes
   paralelos).
5. Índice único parcial de license seats: confirmado já existente
   (`uq_it_license_seats_active_per_employee`, migration `20260807-000153`)
   — outro falso positivo de pendência na API doc, corrigido.
6. `urgency_perceived` (payload de abertura de chamado) vs. `urgency`
   (coluna SMALLINT de triagem): nota explícita adicionada esclarecendo
   que não são a mesma coisa e que `urgency_perceived` não é persistido —
   ambiguidade de nomenclatura documentada, não bloqueante.
7. `it_access_requests.corporate_email`/`equipment_needed`: campos já
   contratados no payload de `grant` (RF-TI-031) mas ausentes na migration
   original — colunas adicionadas em `20260807-000154`.

**[APROVADO]** Verificações sem inconsistência: FK adiada
`it_tickets.access_request_id` (ordem de aplicação e `down()` corretos),
nenhuma tabela paralela de assets (BR-TI-008 respeitada), especificação de
`authorizeSelfOrModule` completa e sem vazamento de rota de gestão para
fora do gate `ti`, `npm run migration:status --prefix server` (7
migrations do bloco listam sem erro, `down`/não aplicadas conforme
esperado), `npm run typecheck --prefix server` (0 erros).

- [x] Próximo passo: `programador` implementa
  `server/src/modules/ti/` (Clean Architecture) + middleware
  `authorizeSelfOrModule` — **[IMPLEMENTADO 2026-08-07]**, ver seção
  "BLOCO 2 TI — Implementação Backend" abaixo. Migrations
  (`20260807-000150` a `000156`) **permanecem não aplicadas** em qualquer
  banco (dev ou teste) — os testes unitários desta entrega usam
  repositórios mockados (mesmo padrão do módulo SST), sem exigir schema
  real; aplicação real fica para quando o dono do produto aprovar.
- [ ] Fora de escopo desta auditoria (não coberto, sinalizar se resgatado):
  validação de implementação real do `authorizeSelfOrModule` contra
  manipulação de `:id` (recomendado a `iterative-review`/`auditor-seguranca`
  quando o código existir); dashboard/KPI consolidado de TI (RF-TI-045,
  pendência já declarada nos 3 documentos, sem endpoint neste bloco).

## 2026-08-07 — BLOCO 2 TI — Implementação Backend (57/57 endpoints) — `programador`

**Escopo:** implementação completa de `server/src/modules/ti/` (Clean
Architecture), 10 models Sequelize (`It*`/`TiSettings`), middleware
`authorizeSelfOrModule`, e montagem em `/api/ti` (`server/app.ts`). Ver
`docs/database/DATABASE.md` seção "BLOCO 2 TI" para o detalhamento de
schema/estrutura e `docs/governance/HANDOFF_CODEX.md` para o handoff
completo.

- [x] 57/57 endpoints do contrato (`docs/business/BLOCO_2_TI_API.md`)
  implementados: Helpdesk (20, incl. categorias), Termo de Responsabilidade
  (7), Licenças (10), Solicitação de Acesso (8), Backup (3) + sub-rotas de
  comentários/seats/checklist.
- [x] Middleware `authorizeSelfOrModule` novo, aplicado às 6 rotas de
  auto-serviço do helpdesk + à elegibilidade de aprovador de
  `ItAccessRequest` (`ti:approve` OU gestor do departamento, §4.1 da API).
- [x] `CheckOffboardingBlockersUseCase` bloqueia `POST
  /access-requests/:id/execute` (revoke) enquanto houver
  `ItResponsibilityTerm` `active` sem tratamento (E1/RF-TI-037/BR-TI-011).
- [x] `AccessProfileExecutionServiceAdapter` delega 100% a
  `AssignAccessProfileUseCase`/`DeactivateUserUseCase`/`CreateUserUseCase`
  reais do módulo `users` — nenhuma duplicação de `AuditLog` (RF-TI-036).
- [x] `PurchaseRequisitionServiceAdapter` delega a
  `CreatePurchaseRequisitionUseCase` real — renovação de licença nunca é
  compra direta (BR-TI-015).
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] `npx jest tests/unit --runInBand`: 871/872 passando (1 falha
  pré-existente e conhecida em `onda3-shipping-cockpit-cashflow.test.ts`,
  não relacionada a este bloco) — 54 testes novos do módulo TI, 0
  regressões.
- [x] Migrations `20260807-000150` a `000156` **não aplicadas ao banco de *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  dev** — aguardando aprovação do dono do produto (mesma convenção do
  Bloco 1 SST).
- [ ] Fora de escopo desta entrega (pendências aceitas, ver
  `docs/governance/HANDOFF_CODEX.md`): seed idempotente das 8 categorias de
  chamado (hardware, software, rede, e-mail, sistema ERP, telefonia,
  acesso, outros — RF-TI-001); job agendado de auto-close (RF-TI-011) e de
  alerta de backup diário (RF-TI-041) fora do ciclo HTTP (a rota
  `GET /backup-logs/health` funciona como fallback determinístico,
  conforme já previsto pela API); dashboard/KPI consolidado (RF-TI-045, sem
  endpoint neste bloco, pendência já declarada).

## 2026-08-07 — Módulo Facilities implementado do zero (backend + frontend) — `programador`

**Escopo:** departamento 17 (Facilities, FAC) não tinha NENHUM código antes
desta entrega — apenas a linha em `departments` (seed) e um esboço
`[PENDENTE]` em sintaxe MySQL em `docs/administrativo/03-FACILITIES.md`.
Implementado do zero: migration PostgreSQL, 4 models Sequelize, módulo
Clean Architecture completo (`server/src/modules/facilities/`), 16
endpoints REST em `/api/facilities`, tela web `/facilities` (4 abas). Ver
`docs/database/DATABASE.md` seção "Módulo Facilities" e
`docs/governance/HANDOFF_CODEX.md` para o handoff completo.

- [x] Migration `20260807-000200-create-facilities-module.cjs` criada e
  **aplicada** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status`) — `facility_vehicles`,
  `facility_fuel_records`, `facility_cleaning_schedules`, `facility_areas`.
- [x] CRUD completo (create/list/get/update, sem delete) para as 4
  entidades, RBAC via novo módulo `facilities` em `accessModules.ts`
  (espelhado no client), leitura em nível padrão/escrita em `operate`.
- [x] Tela web `client/src/pages/facilities/FacilitiesPage.tsx` (Frota,
  Abastecimento, Limpeza, Áreas), API client `client/src/api/facilities.ts`,
  rota `/facilities` protegida por `ModuleRoute module="facilities"`, item
  de menu em Administração.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] `npx tsc --noEmit --project client` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand --prefix server`: 889/890 passando
  (1 falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo) — 14 testes novos do módulo Facilities
  (`facilities-vehicle-use-cases`, `facilities-fuel-record-use-cases`,
  `facilities-cleaning-schedule-use-cases`, `facilities-area-use-cases`),
  0 regressões. `tests/unit/module-authorization-map.test.ts` atualizado
  para incluir `facilities` na lista de módulos que exigem
  `authorizeModule` (guarda anti-regressão).
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/administrativo/03-FACILITIES.md`): Controle de EPIs (já coberto
  pelo módulo SST, não duplicado); Segurança/CFTV/alarme (sem cadastro
  dedicado); vínculo formal entre `facility_cleaning_schedules.area` (texto
  livre) e `facility_areas` (cadastro estruturado).

## 2026-08-07 — Módulo Marketing implementado do zero (backend + frontend) — `programador`

**Escopo:** departamento 14 (Marketing, MKT) não tinha NENHUM código antes
desta entrega — apenas a linha em `departments` (seed) e um esboço de 3
tabelas em sintaxe MySQL em `docs/comercial/02-MARKETING.md`, apresentadas
como reais mas nunca migradas. Implementado do zero: migration PostgreSQL,
3 models Sequelize, módulo Clean Architecture completo
(`server/src/modules/marketing/`), 13 endpoints REST em `/api/marketing`,
tela web `/marketing` (3 abas). Ver `docs/database/DATABASE.md` seção
"Módulo Marketing" e `docs/governance/HANDOFF_CODEX.md` para o handoff
completo.

- [x] Migration `20260807-000210-create-marketing-module.cjs` criada e
  **aplicada** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status`) — `marketing_campaigns`,
  `marketing_leads`, `marketing_materials`.
- [x] CRUD completo (create/list/get/update, sem delete) para as 3
  entidades, RBAC via novo módulo `marketing` em `accessModules.ts`
  (espelhado no client), leitura em nível padrão/escrita em `operate`.
- [x] Funil de leads como ação dedicada (`ChangeLeadStatusUseCase`,
  `POST /api/marketing/leads/:id/status`), não `PUT` genérico irrestrito —
  `new -> contacted -> qualified -> converted/lost`, incrementa contadores
  `leads_generated`/`conversions` da campanha vinculada automaticamente.
- [x] Upload de arquivo de material dedicado
  (`POST /api/marketing/materials/:id/file`, multipart, campo `file`, até
  50MB) — `UploadMaterialFileUseCase` própria (não reaproveita
  `UploadEntityPhotoUseCase`, que é fixada em imagem/`photo_path`).
- [x] Tela web `client/src/pages/marketing/MarketingPage.tsx` (Campanhas,
  Leads — kanban simples por status —, Materiais), API client
  `client/src/api/marketing.ts`, rota `/marketing` protegida por
  `ModuleRoute module="marketing"`, item de menu no grupo Vendas.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] `npx tsc --noEmit --project client` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand --prefix server`: 917/918 passando
  (1 falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo) — 25 testes novos do módulo Marketing
  (`marketing-campaign-use-cases`, `marketing-lead-use-cases`,
  `marketing-material-use-cases`), 0 regressões.
  `tests/unit/module-authorization-map.test.ts` atualizado para incluir
  `marketing` na lista de módulos que exigem `authorizeModule` (guarda
  anti-regressão).
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/comercial/02-MARKETING.md`): cálculo automático de ROI (informado
  manualmente); histórico multi-arquivo por material (só a versão atual é
  mantida); integração com ferramentas externas de email marketing/Ads.

## 2026-08-07 — Módulo Jurídico implementado do zero (backend + frontend) — `programador`

**Escopo:** departamento 16 (Jurídico, JUR) não tinha NENHUM código antes
desta entrega — apenas a linha em `departments` (seed) e dois specs
(`docs/juridico/01-CONTRATOS.md`, `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`)
com 3 tabelas em sintaxe MySQL apresentadas como reais, nunca migradas.
Implementado do zero: migration PostgreSQL, 4 models Sequelize, módulo
Clean Architecture completo (`server/src/modules/legal/`), 19 endpoints
REST em `/api/legal`, tela web `/legal` (2 abas). Ver
`docs/juridico/01-CONTRATOS.md`/`docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`
(atualizados nesta entrega) e `docs/governance/HANDOFF_CODEX.md` para o
handoff completo.

- [x] Migration `20260807-000220-create-legal-module.cjs` criada e
  **aplicada** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status`) — `legal_contracts` (NOVA, não existia
  no spec original — os aditivos/lembretes dependiam de um `contract_id`
  que nunca teve tabela própria), `legal_contract_addendums`,
  `legal_contract_reminders`, `legal_intellectual_property`.
- [x] CRUD completo (create/list/get/update, sem delete) para as 4
  entidades, RBAC via novo módulo `juridico` em `accessModules.ts`
  (espelhado no client), leitura em nível padrão/escrita em `operate`.
- [x] Caso de uso central do spec (gestão de prazos): `GET
  /api/legal/contracts/expiring?days=30` e `GET
  /api/legal/intellectual-property/expiring?days=30` — vencendo em até
  `days` dias ou já vencidos, excluindo `status` `terminated`/
  `expired`/`abandoned`.
- [x] Upload de instrumento dedicado (`POST /api/legal/contracts/:id/file` e
  `POST /api/legal/contract-addendums/:id/file`, multipart, campo `file`,
  PDF/DOC/DOCX até 20MB) — `UploadContractFileUseCase`/
  `UploadAddendumFileUseCase` próprios, mesmo padrão de
  `UploadMaterialFileUseCase` (Marketing).
- [x] Tela web `client/src/pages/legal/LegalPage.tsx` (Contratos —
  aditivos/lembretes como sub-seção do dialog de detalhe, não abas
  próprias —, Propriedade Intelectual), com badge de alerta de
  vencimento próximo em ambas as abas. API client `client/src/api/legal.ts`,
  rota `/legal` protegida por `ModuleRoute module="juridico"`, item de menu
  no grupo Administração.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`): OK — os 4
  models novos usam `type X = ...` (sem `export`) + `export = Model`, nunca
  `export type` misturado com `export =` no mesmo arquivo (bug de
  `tsx`/esbuild identificado em módulos anteriores da mesma sessão).
- [x] `npx tsc --noEmit --project client` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand --prefix server`: 942/943 passando
  (1 falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este
  módulo) — 24 testes novos do módulo Jurídico
  (`legal-contract-use-cases`, `legal-addendum-reminder-use-cases`,
  `legal-intellectual-property-use-cases`), 0 regressões.
  `tests/unit/module-authorization-map.test.ts` atualizado para incluir
  `legal` na lista de módulos que exigem `authorizeModule` (guarda
  anti-regressão).
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/juridico/01-CONTRATOS.md`/`docs/juridico/02-PROPRIEDADE_INTELECTUAL.md`):
  notificação automática (email/push) quando um lembrete vence — `notified`
  é hoje marcado manualmente pelo usuário; geração de contrato a partir de
  template; vínculo formal de `party_a`/`party_b` com `suppliers`/`clients`/
  `employees` (texto livre por decisão de design, ver migration).

## 2026-08-07 — Módulo Contabilidade implementado do zero (backend + frontend) — `programador`

**Escopo:** subárea CONT do departamento Financeiro (sem linha própria em
`departments`) não tinha NENHUM código antes desta entrega — apenas o spec
`docs/financeiro/02-CONTABILIDADE.md` com 4 tabelas em sintaxe MySQL
apresentadas como reais, nunca migradas. Implementado do zero: migration
PostgreSQL (+ seed do plano de contas resumido, 30 contas), 3 models
Sequelize, módulo Clean Architecture completo
(`server/src/modules/accounting/`), 11 endpoints REST em `/api/accounting`,
tela web `/accounting` (3 abas). Ver `docs/financeiro/02-CONTABILIDADE.md`
(atualizado nesta entrega, seção "Contrato Real Implementado") e
`docs/governance/HANDOFF_CODEX.md` para o handoff completo. Módulo mais
arriscado dos 4 implementados nesta sessão — envolve dupla entrada contábil
(débito = crédito), ao contrário de Facilities/Marketing/Jurídico
(cadastro/controle simples).

- [x] Migrations `20260807-000230-create-accounting-module.cjs` (schema) e
  `20260807-000231-seed-accounting-chart-of-accounts.cjs` (seed) criadas e
  **aplicadas** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status`) — `accounting_chart_of_accounts` (30
  linhas seedadas, confirmado via
  `SELECT count(*) FROM accounting_chart_of_accounts` = 30),
  `accounting_entries`, `accounting_entry_items`. `trial_balance` do spec
  original **não** virou tabela — é relatório derivado on-the-fly, por
  instrução explícita da tarefa.
- [x] Plano de Contas: CRUD sem delete físico (`active: false`),
  `account_level`/`parent_id` calculados automaticamente a partir dos
  segmentos do `code` (nunca informados pelo chamador), `accept_entries`
  protegido (não liga em conta com filhas; conta pai deve ter
  `accept_entries=false` antes de ganhar filhas).
- [x] Lançamentos Contábeis: `POST`/`PUT` (só em `draft`, substituição
  integral dos itens) + 2 transições dedicadas de status,
  `PATCH .../post` (`draft -> posted`, valida mínimo 2 itens + 1 débito + 1
  crédito + soma débito = soma crédito em centavos, `BusinessRuleError`
  422 didático com a diferença em reais se não fechar) e
  `PATCH .../reverse` (`posted -> reversed`, cria novo lançamento
  `adjustment` já `posted` com débito/crédito invertidos e
  `reversal_of_id` apontando para o original — nunca apaga nada).
- [x] Balancete: `GET /api/accounting/trial-balance?year=&month=`, saldo
  anterior/débito do mês/crédito do mês/saldo atual por conta, só
  lançamentos `posted`, reaproveitando o padrão de query agregada de
  `GetCostCenterReportUseCase` (módulo `financial`).
- [x] RBAC via novo módulo `contabilidade` em `accessModules.ts` (espelhado
  no client) — leitura em nível padrão, escrita comum (`operate`), `post`/
  `reverse` em `approve` (único módulo dos 4 desta sessão com nível
  `approve`, por ser o único com uma transição de status que "fecha" um
  registro contábil).
- [x] Tela web `client/src/pages/accounting/AccountingPage.tsx` (Lançamentos
  — lista + form de criação com `useFieldArray` para múltiplas linhas
  débito/crédito e validação em tempo real de soma balanceada via
  `useWatch`, Plano de Contas — tabela indentada por nível, Balancete —
  relatório por mês/ano). API client `client/src/api/accounting.ts`, rota
  `/accounting` protegida por `ModuleRoute module="contabilidade"`, item de
  menu no grupo Gestão, ao lado de Financeiro.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`): OK — os 3
  models novos usam `type X = ...` (sem `export`) + `export = Model`, nunca
  `export type` misturado com `export =` no mesmo arquivo.
- [x] `npx tsc --noEmit --project client` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand --prefix server`: 962/963 passando (1
  falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este módulo)
  — 19 testes novos do módulo Contabilidade
  (`accounting-use-cases.test.ts`), cobrindo especificamente: débito≠crédito
  rejeitado ao postar, lançamento balanceado aceito, itens de lançamento
  `posted` não editáveis, estorno gera novo lançamento com valores
  invertidos, conta sintética (`accept_entries=false`) rejeitada em
  lançamento direto. 0 regressões.
  `tests/unit/module-authorization-map.test.ts` atualizado para incluir
  `accounting` na lista de módulos que exigem `authorizeModule` (guarda
  anti-regressão).
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/financeiro/02-CONTABILIDADE.md`): integração fiscal (SPED/ECD/ECF/
  DCTF/eSocial); geração automática de lançamento a partir de outros
  módulos (vendas, compras, folha) — todo lançamento é manual nesta rodada;
  teste de integração real (Postgres) do fluxo completo
  create→post→reverse (cobertura atual é só unitária, mock de
  repositório); UI de árvore com expand/collapse no Plano de Contas (hoje
  é lista indentada por nível, suficiente para os 30 registros do seed).

## 2026-08-07 — Módulo Tesouraria implementado do zero (backend + frontend) — `programador`

**Escopo:** subárea TES do departamento Financeiro (sem linha própria em
`departments`) não tinha NENHUM código antes desta entrega — apenas o spec
`docs/financeiro/03-TESOURARIA.md` com 2 tabelas em sintaxe MySQL
apresentadas como reais (`reconciliation_items`, `financial_operations`),
nunca migradas. `reconciliation_items` **não foi recriada** — o projeto já
tem conciliação bancária real e funcional em `server/src/modules/financial/`
(`bank_statements`/`bank_statement_entries`,
`presentation/routes/reconciliation.ts`/`cnab.ts`); recriar seria
duplicação de domínio. Implementado do zero: migration PostgreSQL (2
tabelas: `treasury_bank_accounts` NOVA + `treasury_financial_operations` do
spec), 2 models Sequelize, módulo Clean Architecture completo
(`server/src/modules/treasury/`), 9 endpoints REST em `/api/treasury`, tela
web `/treasury` (3 abas). Ver `docs/financeiro/03-TESOURARIA.md`
(atualizado nesta entrega, seção "Contrato Real Implementado") e
`docs/governance/HANDOFF_CODEX.md` para o handoff completo.

- [x] **Decisão arquitetural registrada**: `CompanyBankingConfig`
  (`company_banking_config`) é tabela SINGLETON (1 linha, id=1) com os dados
  bancários do CEDENTE, usada apenas na geração de remessa/boleto CNAB — não
  é um cadastro de múltiplas contas correntes/aplicação da empresa. Como a
  Tesouraria precisa gerenciar N contas bancárias com saldo cada,
  `treasury_bank_accounts` foi criada SEPARADA, sem FK entre as duas
  (domínios de configuração distintos).
- [x] Migration `20260807-000240-create-treasury-module.cjs` criada e
  **aplicada** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status` → `up`) — `treasury_bank_accounts`
  (0 linhas, cadastro fica a critério do usuário) e
  `treasury_financial_operations` (0 linhas), ambas confirmadas via query
  Sequelize real (`TreasuryBankAccount.count()`/
  `TreasuryFinancialOperation.count()` = 0, sem erro de tabela ausente).
- [x] Contas Bancárias: CRUD (`bank_name`/`agency`/`account_number`/
  `account_type` `corrente|poupanca|aplicacao`/`current_balance` mantido
  manualmente/`manager_name`/`manager_phone`/`active`), unicidade de
  agência+número validada na camada de aplicação (`ConflictError` 409).
- [x] Operações Financeiras: `POST`/`PUT` (só em `active`) + 2 transições
  dedicadas de status, `PATCH .../settle` (`active -> settled`, preenche
  `settled_at`) e `PATCH .../cancel` (`active -> canceled`) — ambos estados
  finais, nunca reabertos; `contract_number` único (`ConflictError` 409);
  `end_date` (quando informada) não pode ser anterior a `start_date`
  (`BusinessRuleError` 422).
- [x] Posição de Caixa: `GET /api/treasury/cash-position` — relatório
  derivado (sem tabela própria), soma `current_balance` de todas as
  `treasury_bank_accounts` ativas (total geral + por `account_type`) e
  cruza com o resumo de títulos em aberto de `accounts_payable`/
  `accounts_receivable` (mesmo critério de
  `GetCashFlowProjectionUseCase` do módulo `financial`, sem reimplementar a
  query — só reagregado em totais "hoje", não em baldes semanais), incluindo
  `projected_balance` = saldo bancário + a receber em aberto − a pagar em
  aberto.
- [x] RBAC via novo módulo `tesouraria` em `accessModules.ts` (espelhado no
  client) — leitura em nível padrão, escrita comum (`operate`), `settle`/
  `cancel` em `approve` (mesmo padrão de `contabilidade`, por serem
  transições que encerram um contrato financeiro).
- [x] Tela web `client/src/pages/treasury/TreasuryPage.tsx` (Operações
  Financeiras — CRUD + ações de liquidar/cancelar, Posição de Caixa —
  cards de saldo total/a receber/a pagar/saldo projetado + saldo por tipo de
  conta + tabela de contas ativas, Contas Bancárias — CRUD). API client
  `client/src/api/treasury.ts`, rota `/treasury` protegida por
  `ModuleRoute module="tesouraria"`, item de menu no grupo Gestão, ao lado
  de Contabilidade.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`): OK — os 2
  models novos usam `type X = ...` (sem `export`) + `export = Model`, nunca
  `export type` misturado com `export =` no mesmo arquivo.
- [x] `npx tsc --noEmit --project .` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand` (a partir de `server/`): 981/982
  passando (1 falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este módulo)
  — 18 testes novos do módulo Tesouraria (`treasury-use-cases.test.ts`),
  cobrindo especificamente: conflito de agência+número em conta bancária,
  conflito de `contract_number` em operação, `end_date` anterior a
  `start_date` rejeitada, edição de operação `settled`/`canceled` rejeitada,
  `settle`/`cancel` só a partir de `active`, agregação de saldo por tipo de
  conta e saldo projetado na Posição de Caixa. 0 regressões.
  `tests/unit/module-authorization-map.test.ts` atualizado para incluir
  `treasury` na lista de módulos que exigem `authorizeModule` (guarda
  anti-regressão) — sem essa atualização o teste falhava detectando a pasta
  nova sem cobertura.
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/financeiro/03-TESOURARIA.md`): conciliação bancária OFX/CNAB
  (já existe, real, em `financial/` — não duplicada aqui); operações de
  câmbio (importação/exportação, mencionadas no spec original de cargos mas
  sem modelo de dados definido — `comex` já cobre nacionalização de
  importação, sem campo de câmbio dedicado à Tesouraria); teste de
  integração real (Postgres) do fluxo completo create→settle/cancel
  (cobertura atual é só unitária, mock de repositório); baixa automática de
  contas a pagar/receber a partir de uma operação financeira liquidada (o
  spec não define esse vínculo — liquidação de operação e baixa de título
  continuam fluxos independentes).

## 2026-08-07 — Módulo Controladoria implementado do zero (backend + frontend) — `programador`

**Escopo:** subárea CTR do departamento Financeiro (sem linha própria em
`departments`), 6º e último módulo desta sequência (Facilities, Marketing,
Jurídico, Contabilidade, Tesouraria, Controladoria). Diferente dos 5
anteriores, Controladoria NÃO tinha doc dedicado com tabelas SQL prontas —
seu escopo em `docs/financeiro/00-README.md` era só "Custos Industriais,
Orçamento, DRE". Custeio industrial já existia em
`server/src/modules/production`/`server/src/modules/reports`; Centros de
Custo (`cost_centers`) + relatório agrupado já existiam em
`server/src/modules/financial/`. A ÚNICA peça genuinamente inexistente era
Orçamento (linhas de orçamento por centro de custo + acompanhamento orçado ×
realizado) — é o que esta entrega implementou, do zero. Ver
`docs/financeiro/00-README.md` (seção "Controladoria (CTR) — Contrato Real
Implementado", atualizado nesta entrega) e `docs/governance/HANDOFF_CODEX.md`
para o handoff completo.

- [x] Migration `20260807-000250-create-budget-module.cjs` criada e
  **aplicada** ao Postgres local (`npm run migration:up --prefix server`,
  confirmado com `migration:status` → `up`) — tabela `budget_lines` única,
  confirmada via `\d budget_lines` no psql: FK `cost_center_id →
  cost_centers.id ON DELETE CASCADE`, 3 CHECK constraints (`month` 1-12 ou
  nulo, `year` 2000-2100, `planned_amount >= 0`), índice de expressão
  `UNIQUE (cost_center_id, year, COALESCE(month, 0), category)`.
- [x] **Decisão — mês opcional**: `month IS NULL` = linha ANUAL "achatada";
  `1`-`12` = linha MENSAL. Testado explicitamente (`CreateBudgetLineUseCase`,
  caso "linha anual e linha mensal para o mesmo centro/ano/categoria NÃO
  colidem") que as duas convivem sem violar a unicidade.
- [x] **Decisão — unicidade com `month` nulo**: `UNIQUE` padrão do
  PostgreSQL não bastaria (`NULL != NULL`); resolvido com índice de
  expressão `COALESCE(month, 0)` criado via SQL cru na migration (Sequelize
  `addIndex` não expressa `COALESCE` em `fields`).
- [x] CRUD completo de Linhas de Orçamento (`POST`/`GET`/`PUT`/
  `DELETE /api/budget/lines`), incluindo **DELETE físico** (planejamento,
  não histórico transacional imutável — `CLAUDE.md` §7 reserva soft delete
  só para `Category`), unicidade de `(cost_center_id, year, month,
  category)` validada na camada de aplicação (`ConflictError` 409).
- [x] Relatório Orçado × Realizado (`GET /api/budget/report?year=&month=&
  cost_center_id=`): "orçado" agregado em `SequelizeBudgetRepository`
  (SQL com proração ÷12 de linhas anuais quando `month` é informado);
  "realizado" **reaproveita** `CostCenterRepository.getCostCenterTotalsByPayable`
  do módulo `financial` (mesma fonte de dados de
  `GET /api/finance/cost-centers/report`, lado contas a PAGAR/`amount_paid`
  — não reimplementado); variação absoluta e percentual calculadas por
  centro de custo e no total (`variance_percent = null` quando orçado é
  zero, evita divisão por zero).
- [x] RBAC via novo módulo `controladoria` em `accessModules.ts` (espelhado
  no client `accessProfiles.ts`) — leitura em nível padrão, escrita
  (CRUD de linha) em `operate`; sem nível `approve` (planejamento
  orçamentário não tem transição de status sensível a proteger, mesmo
  padrão de `facilities`/`marketing`/`juridico`).
- [x] Tela web `client/src/pages/budget/BudgetPage.tsx` (Linhas de
  Orçamento — CRUD com filtro de ano/centro de custo, Orçado × Realizado —
  cards de totais + tabela por centro de custo com variação/variação %).
  API client `client/src/api/budget.ts` (reaproveita `listCostCenters` de
  `client/src/api/financial.ts` para o dropdown de centro de custo — não
  duplicado). Rota `/budget` protegida por `ModuleRoute module="controladoria"`,
  item de menu "Controladoria" no grupo Gestão, ao lado de Tesouraria.
- [x] `npm run typecheck --prefix server`: 0 erros.
- [x] Smoke test de runtime dos models (`node -e "require('tsx/cjs');
  require('./src/models/index.ts')"`, a partir de `server/`): OK — o model
  novo (`BudgetLine.ts`) usa `type X = ...` (sem `export`) + `export =
  Model`, nunca `export type` misturado com `export =` no mesmo arquivo.
- [x] `npx tsc --noEmit --project .` (a partir de `client/`): 0 erros.
- [x] `npx jest tests/unit --runInBand` (a partir de `server/`): 999/1000
  passando (1 falha pré-existente e conhecida em
  `onda3-shipping-cockpit-cashflow.test.ts`, não relacionada a este módulo)
  — 17 testes novos do módulo Controladoria (`budget-use-cases.test.ts`),
  cobrindo especificamente: criação de linha mensal/anual, conflito de
  chave `(cost_center_id, year, month, category)`, não-colisão entre linha
  anual e mensal do mesmo centro/ano/categoria, listagem paginada,
  `NotFoundError` em get/update/delete de linha inexistente, atualização
  sem/com mudança de chave, exclusão física, cálculo de variação
  absoluta/percentual no relatório (incluindo divisão por zero → `null`),
  uso do intervalo de datas correto (`from`/`to`) quando `month` é/não é
  informado, filtro por `cost_center_id`. 0 regressões.
  `tests/unit/module-authorization-map.test.ts` atualizado para incluir
  `budget` na lista de módulos que exigem `authorizeModule` (guarda
  anti-regressão) — sem essa atualização o teste falhava detectando a pasta
  nova sem cobertura.
- [ ] Fora de escopo desta entrega (decisões conscientes, ver
  `docs/financeiro/00-README.md`): teste de integração real (Postgres) do
  fluxo completo CRUD → relatório (cobertura atual é só unitária, mock de
  repositório — a migration em si foi validada contra o Postgres local via
  `migration:up`/`migration:status`/`\d budget_lines`); plano de contas
  completo por linha de orçamento (categoria é enum simples de 4 valores,
  não cruza com `accounting_chart_of_accounts`); modelagem de sazonalidade
  na proração de linha anual (hoje é ÷12 linear).

**Fecha a sequência dos 6 módulos** implementados nesta sessão (Facilities,
Marketing, Jurídico, Contabilidade, Tesouraria, Controladoria) — todos os
departamentos/subáreas documentados que não tinham código correspondente
antes agora têm backend + frontend + RBAC + testes + docs.

## 2026-08-07 (rodada seguinte) — Auditoria Cruzada BLOCO 3 Juridico (Requisitos x Banco x API) e conflito com modulo enxuto ja mesclado — `AuditorIntegrador`

**Escopo:** gate de qualidade pre-codigo do modulo Juridico completo
(departamento 16, 46 RF-JUR, UC-52 a UC-56), confrontando
`docs/business/BLOCO_3_JUR_REQUISITOS.md`,
`docs/business/BLOCO_3_JUR_MODELO_DADOS.md` (12 migrations, renumeradas
para `20260807-000260` a `000271`) e `docs/business/BLOCO_3_JUR_API.md`
(71 endpoints, 7 grupos). Durante a auditoria, um `git pull` trouxe os
commits `2ad27fd`/`aaf6ec5`, que ja tinham implementado um modulo
Juridico ENXUTO e mesclado ao main (`server/src/modules/legal/`,
`/api/legal`, migration `20260807-000220-create-legal-module.cjs`) -
decisao do dono do produto: o Bloco 3 completo substitui o enxuto (plano
de substituicao formal, nao executado nesta rodada). Relatorio completo
em `docs/business/BLOCO_3_JUR_AUDITORIA.md`.

**Veredito: [APROVADO COM RESSALVAS]**

**[IMPLEMENTADO]** Rastreabilidade RF-Tabela-Endpoint 100% verificada
(46/46 RF-JUR, nenhum orfao nas duas pontas).

**[IMPLEMENTADO]** Divergencia de nomenclatura de tabela resolvida:
`AdmDBA` havia nomeado as 16 tabelas novas sem prefixo (`contracts`,
`legal_cases`, `proxies`, etc.), divergindo do contrato de API (que ja
assumia `jur_*` desde a primeira versao). Corrigido nesta auditoria: as
12 migrations foram renomeadas de tabela (todas para `jur_*`, incluindo
indices/constraints/enums), renumeradas de `20260807-000160..171` para
`20260807-000260..271` (para rodar depois da migration `000220` do
modulo enxuto que chegou pelo pull, pre-requisito da futura migracao de
dados) e verificadas com `node -c` (todas OK). Docs de Modelo de Dados e
API atualizados para consistencia.

**[IMPLEMENTADO]** Inconsistencia de nome de coluna corrigida:
`docs/business/BLOCO_3_JUR_API.md` citava `legal_entry_type` como coluna
nova de `accounts_payable`, mas a migration real (`20260807-000268`) e o
Modelo de Dados usam `legal_expense_type` — corrigido nas 4 ocorrencias do
contrato de API.

**[APROVADO]** Foco critico do modulo (dupla confirmacao de prazo fatal,
UC-54) verificado em todas as 3 camadas sem nenhuma inconsistencia: CHECK
de banco `fulfilled_by <> confirmed_by`, rotas separadas fulfill/confirm,
segundo confirmador sempre do JWT, ausencia estrutural de qualquer campo
de desativacao de alerta fatal (nem para admin). Tambem sem inconsistencia:
imutabilidade (triggers x endpoints de escrita), exceção de campo do
perfil financeiro (`GET /api/jur/reports/financeiro`, shape sanitizado
verificado campo a campo), contraparte polimorfica do contrato (CHECK do
banco e validacao da API semanticamente identicas), integracao com
`accounts_payable` (apos a correcao do §3.1), RBAC (chave `juridico` ja
presente em `accessModules.ts`, niveis operate/approve consistentes com
os 5 UCs, excecao `role==='admin'` do `trade_secret` isolada e coerente).

- [x] **Pendencia real 1 (RF-JUR-030) — RESOLVIDA em 2026-08-08:**
  `GET/POST /api/jur/corporate-acts` + `GET/PUT /api/jur/corporate-acts/:id`
  implementados com tabela `jur_corporate_acts` (migration
  `20260808-000001-create-jur-corporate-acts.cjs`, model `JurCorporateAct`,
  CRUD completo `Create/List/GetById/UpdateCorporateActUseCase`,
  `corporateActController.ts`). Edicao bloqueada apos `status='registered'`
  (imutabilidade pos-registro, mesmo espirito de outras entidades do
  modulo). Testes: `server/tests/unit/juridico-corporate-act-use-cases.test.ts`
  (10 casos).
- [x] **Pendencia real 2 (RF-JUR-003) — RESOLVIDA em 2026-08-08:** alcada de
  aprovacao de contrato por valor implementada com 3 faixas definidas pelo
  dono do produto (constantes de codigo em
  `server/src/modules/juridico/domain/constants.ts`, sem tabela de
  configuracao editavel nesta rodada): valor <= R$ 50.000 ativa direto
  (comportamento existente); R$ 50.000 < valor <= R$ 300.000 exige 1
  aprovacao `diretor`; valor > R$ 300.000 exige `diretor` + `financeiro`.
  Tabela `jur_contract_approvals` (migration
  `20260808-000002-create-jur-contract-approvals.cjs`, unique
  `contract_id`+`approver_role`), novo endpoint
  `POST /api/jur/contracts/:id/approve` (`ApproveContractUseCase`,
  `authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])`,
  `approver_user_id`/`approver_role` sempre resolvidos do JWT/RBAC, nunca do
  body), `ActivateContractUseCase` ajustado para consultar os approvals
  antes de ativar. Novo modulo de acesso `diretor` adicionado a
  `accessModules.ts` (`financeiro` ja existia). Testes: 11 casos novos em
  `server/tests/unit/juridico-contract-use-cases.test.ts`.
- [x] **Plano de Substituicao do Modulo Enxuto (secao 6 do relatorio) —
  EXECUTADO em 2026-08-07 (`programador`, passada 1/2):** migration
  `20260807-000280-migrate-legal-lean-to-jur.cjs` copia `legal_contracts`/
  `legal_contract_addendums`/`legal_contract_reminders`/
  `legal_intellectual_property` para `jur_*` (enum PT-BR→ingles via CASE
  WHEN, placeholder `MIGRADO-SEM-DOC` para contraparte sem documento,
  perdas de campo documentadas no cabecalho) e so entao dropa as 4 tabelas
  antigas, tudo dentro da mesma transacao; idempotente/segura via
  `showAllTables()` quando as tabelas antigas nunca existiram; migration
  `20260807-000220` NAO foi deletada (continua existindo, apenas superada
  em efeito). Codigo do modulo enxuto REMOVIDO:
  `server/src/modules/legal/**`, models `LegalContract*`/
  `LegalIntellectualProperty`, referencias em `server/src/models/index.ts`,
  rota `/api/legal` em `server/app.ts` (substituida por `/api/jur`), 3
  suites de teste antigas. `client/src/api/legal.ts` e
  `client/src/pages/legal/**` NAO foram tocados nesta passada (fora do
  escopo do `programador` backend) — as chamadas a `/api/legal/*` vao
  falhar em runtime ate a passada de frontend recriar as telas; ver
  `docs/governance/HANDOFF_CODEX.md`.
- [ ] Fora de escopo desta auditoria (nao coberto, sinalizar se resgatado):
  qualidade de implementacao do modulo enxuto ja mesclado — recomendado a
  `auditor` revisar `server/src/modules/legal/` contra
  `docs/juridico/01-CONTRATOS.md`/`02-PROPRIEDADE_INTELECTUAL.md` se o
  modulo enxuto continuar em producao por mais tempo antes da
  substituicao; execucao real da migracao de dados de substituicao;
  qualquer teste funcional/integracao do Bloco 3 completo (nenhum codigo
  do Bloco 3 foi escrito ainda, proximo passo e `programador`).

---

## 2026-08-07 (rodada seguinte) — BLOCO 3 Juridico: implementacao backend passada 1/2 (Contratos, Contencioso, Prazos Fatais) — `programador`

**Escopo:** passo 4 (implementacao) do pipeline do Bloco 3, passada 1 de 2 —
P0 + substituicao do modulo enxuto, conforme
`docs/business/BLOCO_3_JUR_AUDITORIA.md` §6.

**[IMPLEMENTADO]** Migration de transicao `20260807-000280-migrate-legal-lean-to-jur.cjs`
(copia `legal_*` → `jur_*` + drop das 4 tabelas antigas, mesma transacao,
idempotente) — ver item acima marcado `[x]`.

**[IMPLEMENTADO]** Modulo enxuto removido por completo do backend
(`server/src/modules/legal/`, models `Legal*`, rota `/api/legal`) — ver
item acima.

**[IMPLEMENTADO]** `server/src/modules/juridico/` criado (Clean
Architecture, padrao `sst`/`ti`): 16 models Sequelize das 16 tabelas
`jur_*` (`server/src/models/Jur*.ts`) + `AccountPayable.legal_case_id`/
`legal_expense_type` (colunas da migration `000268`, ausentes do model até
agora); 35 dos 71 endpoints do contrato implementados:
- Grupo 1 — Contratos (13/13, UC-52): CRUD, documentos versionados,
  signatarios, checklist de clausulas, ativacao (validando responsavel,
  2 signatarios parte + versao assinada, checklist obrigatorio por tipo,
  geracao automatica de `JurLegalAlert` de vencimento/denuncia/reajuste),
  aditivos (snapshot de valores anteriores, atualiza contrato na mesma
  chamada), encerramento (bloqueio de reversao `expired`/`terminated→active`).
- Grupo 2 — Contencioso (15/15, UC-53): advogados externos, processos
  (exclusividade de parte contraria), andamentos (insert-only),
  avaliacao de risco/provisao (append-only, `probable` exige `approve` +
  valor/rationale), custo/deposito judicial via `AccountPayableService`
  (adapter, nunca Sequelize direto de outro modulo), encerramento com
  parcelamento em AP, relatorio de provisoes (`risco_nao_avaliado` para
  processos ativos sem avaliacao).
- Grupo 3 — Prazos Fatais (7/7, UC-54, fluxo mais critico): criacao exige
  `responsible_user_id` sem excecao e `escalation_user_id` quando
  `is_fatal`; `acknowledge` restrito ao responsavel/backup; `fulfill`
  exige evidencia e justificativa retroativa quando vencido; `confirm`
  valida `confirmedBy !== fulfilled_by` (BR-JUR-013) alem do CHECK de
  banco ja existente na migration `000265`; fila `critical`.

**[PENDENTE — passada 2, nao implementado nesta rodada]**: Procuracoes
(6 endpoints), Propriedade Intelectual (6), LGPD (17), Transversal —
alertas/relatorio financeiro sanitizado/fichas cruzadas (8) = 36
endpoints restantes; alcada de aprovacao de contrato por valor (RF-JUR-003,
tabela ainda nao modelada); atos societarios (RF-JUR-030, sem tabela);
mapper DTO PT-BR↔ingles NAO criado (decisao consciente — o Modelo de
Dados §0 confirma que os nomes de coluna do Bloco 3 ja sao os nomes de
campo esperados de API, sem traducao a fazer, diferente do precedente
SST citado no enunciado do pipeline); o front antigo do Juridico
(`client/src/api/legal.ts` e `client/src/pages/legal/`, que **nao existem
mais**) ficou intocado nesta passada — telas antigas quebrariam em runtime
contra `/api/legal`, reconstrucao e responsabilidade do passo 5/frontend.
*(✔ superado — o front foi reconstruido em `client/src/api/juridico.ts` e
`client/src/pages/juridico/`; conferido em 2026-08-12.)*

**Testes:** 3 suites novas (`server/tests/unit/juridico-contract-use-cases.test.ts`,
`juridico-legal-case-use-cases.test.ts`, `juridico-deadline-use-cases.test.ts`),
49 casos, cobrindo os 3 grupos implementados com foco no fluxo de dupla
confirmacao de prazo fatal (mesmo usuario tentando confirmar a propria
baixa, baixa sem evidencia, baixa retroativa sem justificativa). Suite
completa do server: 1024/1025 passando (1 falha pre-existente de data em
`onda3-shipping-cockpit-cashflow.test.ts`, nao relacionada a este bloco).
`npm run typecheck` limpo. Detalhes completos em
`docs/governance/HANDOFF_CODEX.md`.

## 2026-08-07 (rodada seguinte) — BLOCO 3 Juridico: implementacao backend passada 2/2 (final) — Procuracoes, PI, LGPD, Transversal — `programador`

**Escopo:** passo 4 (implementacao) do pipeline do Bloco 3, passada 2 de 2
(final) — fecha os 36 endpoints restantes sobre os models `Jur*` ja
criados na passada 1.

**[IMPLEMENTADO]** Backend do Bloco 3 Juridico = **69/71 endpoints**
(96%), unicos 2 nao implementados sao `corporate-acts` (RF-JUR-030, sem
tabela — pendencia real 1 acima permanece `[ ]`, nao resolvida por
decisao explicita de nao criar migration nova sem necessidade):
- Grupo 4 — Procuracoes (4/6, UC-55): cadastro, revogacao (nivel
  `approve`, `communication_record` obrigatorio, efeito imediato),
  expiracao automatica ao acessar (`GET`/lista), alerta de vencimento
  automatico quando `expiration_date` informada.
- Grupo 5 — Propriedade Intelectual (6/6, RF-JUR-031 a 034): CRUD,
  vinculo N:N com Contrato (`uq_jur_ip_contract_links_ip_contract`),
  alertas de renovacao/anuidade (`trademark` 12 meses antes da
  expiracao; demais tipos com `next_annuity_date`), `trade_secret` nunca
  aceita `attachment_url` e e o UNICO recurso do modulo com RBAC
  `role==='admin'` (nao `authorizeModule`) — verificado dentro dos use
  cases, exclui `trade_secret` da listagem/contagem para nao-admin mesmo
  filtrando explicitamente por `type=trade_secret`.
- Grupo 6 — LGPD (17/17, UC-56): RoPA (5, revisao anual +1 ano), Solicitacao
  de Titular (7, `due_date`=recebimento+15 dias, `verify-identity` bloqueia
  avanco sem `identity_verified=true`, `resolve` exige identidade
  verificada, `reject` nivel `approve` com justificativa obrigatoria,
  `pending-critical` nunca oculta vencido), Incidente (5, `decision` nivel
  `approve` com as DUAS justificativas obrigatorias mesmo com booleano
  `false`, `close` nivel `approve` bloqueado sem decisao previa — E4).
- Grupo 7 — Transversal (7/7): Alertas (3, `acknowledge` nunca desativa —
  `jur_legal_alerts` nao tem coluna para isso, RNF-JUR-04 garantido por
  ausencia estrutural), Relatorio Financeiro Sanitizado (1,
  `GET /reports/financeiro` liberado tambem a `financeiro:operate`,
  shape fixo sem `parte_contraria`/`rationale`/`case_number_cnj`), Fichas
  Cruzadas (3, `by-supplier`/`by-client`/`by-employee`, leitura pura).

**8 reconciliacoes schema↔contrato documentadas** (sem migration nova):
`title` de PI derivado de `description`; janela de alerta de PI
simplificada (`[VERIFICAR COM ASSESSOR JURIDICO]`); DPO/Encarregado sem
cadastro formal (usa quem registra, se nao informado); decisao de
incidente LGPD combina 2 booleanos+2 justificativas em 1
enum+1 campo de texto; `cost_center_id` null em provisoes do relatorio
financeiro (schema so tem essa coluna em `accounts_payable`); RBAC
`trade_secret` por `role` dentro do use case; `GET /reports/financeiro`
com 2 niveis de acesso (rota fora do `router.use(authorizeModule(...))`
geral). Detalhes completos, incluindo os 8 pontos numerados, em
`docs/governance/HANDOFF_CODEX.md`.

**Testes:** 2 suites novas (`server/tests/unit/juridico-proxy-ip-use-cases.test.ts`,
`juridico-lgpd-alert-use-cases.test.ts`), 45 casos novos, cobrindo os 4
grupos desta passada. Suite completa do server: 1069/1070 passando (1
falha pre-existente de data em `onda3-shipping-cockpit-cashflow.test.ts`,
nao relacionada a este bloco). `npm run typecheck` limpo.

**Pendencias que seguem em aberto** (nao resolvidas nesta passada, ja
listadas nos itens `[ ]` acima): `corporate-acts` (RF-JUR-030, sem
tabela) e alcada de aprovacao de contrato por valor (RF-JUR-003, sem
tabela). Frontend completo do Bloco 3 (Procuracoes/PI/LGPD/Alertas)
segue como proximo passo do pipeline.

## 2026-08-07 (rodada seguinte) — Auditoria Cruzada BLOCO 4 Facilities (Requisitos x Banco x API) — `AuditorIntegrador`

**Escopo:** gate de qualidade pre-codigo do bloco de correcao do modulo
Facilities (departamento 17, 60 RF-FAC, UC-58 a UC-62), confrontando
`docs/business/BLOCO_4_FAC_REQUISITOS.md`,
`docs/business/BLOCO_4_FAC_MODELO_DADOS.md` (11 migrations,
`server/migrations/20260807-000290` a `000300`, nao aplicadas) e *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
`docs/business/BLOCO_4_FAC_API.md` (60 endpoints, 9 grupos). Correcao do
modulo Facilities existente (commit `2ad27fd`), motivada por
`docs/business/BLOCO_4_FAC_VERIFICACAO.md` (14/17 regras do brief
NAO ATENDIDAs). Relatorio completo em `docs/business/BLOCO_4_FAC_AUDITORIA.md`.

**Veredito: [APROVADO COM RESSALVAS]**

**[IMPLEMENTADO]** Rastreabilidade RF-Tabela-Endpoint 100% verificada
(60/60 RF-FAC, nenhum orfao nas duas pontas).

**[IMPLEMENTADO]** 8 inconsistencias de nomenclatura/schema entre o
Modelo de Dados/migrations e o Contrato de API corrigidas diretamente nos
artefatos: (1) tabela `facility_correspondence` singular vs.
`facility_correspondences` plural assumido pela API — mesmo padrao de
divergencia de prefixo do Bloco 3; (2) ENUM `fuel_type` da migration
(`gasoline/ethanol/diesel/flex/electric`) divergente do citado na API
(`flex/gasoline/diesel/electric/hybrid/other` — omitia `ethanol`,
inventava `hybrid`/`other`); (3) campo `chassis` no payload de exemplo vs.
coluna real `chassi`; (4) campos `manufacture_year`/`model_year`
duplicados no payload vs. coluna unica `year` em `facility_vehicle_details`;
(5) campo `responsible_employee_id` no payload vs. `responsible_id`, nome
real usado por `CreateAssetUseCase`; (6) campo `area_free_text` vs. coluna
real `area` em `facility_cleaning_schedules`; (7) caminho de modulo do
`MaintenanceOrder` nao confirmado (API citava
`server/src/modules/manufacturing/`, caminho real e
`server/src/modules/maintenance/`, com precedente de adapter ja usado por
`server/src/modules/ti/`); (8) `authorizeModule('manutencao') OR
authorizeModule('facilities')` citado como se fosse primitivo existente —
`authorizeModule()` so aceita um `moduleKey` por chamada, sem precedente
de composicao OR no projeto; documentado como middleware NOVO a criar.

**[IMPLEMENTADO]** Gap real de schema corrigido: `trip_id` (vinculo
opcional de abastecimento ao diario de uso) ja aparecia no payload de
`POST /fuel-records` da API, mas nenhuma das 11 migrations criava essa
coluna em `facility_fuel_records` — adicionada a
`20260807-000294-add-full-tank-invoice-ref-to-facility-fuel-records.cjs`
(INTEGER nullable, FK -> `facility_vehicle_trips.id`, `SET NULL`),
`node -c` validado.

**[IMPLEMENTADO]** Erro de contagem corrigido em
`BLOCO_4_FAC_REQUISITOS.md`: cabecalho e secao 7 diziam "37 P0/19 P1/4 P2";
recontagem linha a linha da coluna Prioridade das 12 subtabelas resulta em
**38 P0/17 P1/5 P2** (RF-FAC-042 estava marcado P0 na tabela de origem mas
tratado como P1 no resumo consolidado).

**[APROVADO]** Migracao D-2 (`20260807-000290`, maior risco do bloco) lida
linha a linha: backfill `facility_vehicles -> assets + facility_vehicle_details`
cobre os 18 campos originais sem perda de dado, enums `DROP TYPE`
conferidos contra os nomes reais gerados pela migration original,
`facility_fuel_records.vehicle_id -> asset_id` migrado com ordem correta
de indice/coluna, idempotencia confirmada.

- [x] **Risco residual real 1 (migracao D-2):** RESOLVIDO em 2026-08-07
  (implementacao) — `up()` da migration `20260807-000290` agora roda
  dentro de `queryInterface.sequelize.transaction()` e verifica
  idempotencia por `plate` (SELECT em `facility_vehicle_details`) antes de
  cada INSERT em `assets`. `node -c` validado. RNF-FAC-03 (teste contra
  copia real do banco) continua pendente — nao foi possivel nesta rodada
  (ambiente sem `facility_vehicles` populada).
- [x] **Risco residual real 2 (nao-regressao MANUT):** RESOLVIDO em
  2026-08-07 — `server/src/models/MaintenanceOrder.ts` `asset_id` agora
  `allowNull: true`, com 3 colunas novas (`next_maintenance_km`/
  `facility_specialty`/`facility_area_id`).
- [x] **Pendencia de codigo (RF-FAC-057):** RESOLVIDO em 2026-08-07 — nivel
  `approve` aplicado em `facilities` (liberacao de doc vencido, divergencia
  de odometro, suspensao de condutor, indicacao/pagamento de multa,
  plano de limpeza); comentario de `accessModules.ts` atualizado.
- [x] **Pendencia de codigo:** RESOLVIDO em 2026-08-07 — middleware
  `server/src/middlewares/authorizeAnyModule.ts` criado e aplicado em
  `GET /api/facilities/maintenance-tickets*`.
- [ ] **Nao coberto por esta auditoria (fora de escopo declarado), ainda
  pendente:** execucao real da migration `000290` contra copia de banco
  com dado real (RNF-FAC-03) — migrations `000290..300` continuam **nao
  aplicadas**, por instrucao explicita desta rodada; revisao de seguranca
  do middleware `authorizeAnyModule` pelo `auditor-seguranca`.

### 2026-08-07 (rodada seguinte) — Implementacao BLOCO 4 FAC (correcao) — `programador`

**Escopo:** implementacao completa dos 60 endpoints do contrato
`docs/business/BLOCO_4_FAC_API.md`, endurecimento da migration `000290`
(transacao + idempotencia por linha, ver acima), models Sequelize novos/
atualizados, middleware `authorizeAnyModule`, RBAC `approve` aplicado,
reescrita do modulo `server/src/modules/facilities/`.

- [x] Migration `20260807-000290` endurecida (transacao explicita +
  idempotencia por `plate`) — `node -c` valido, NAO aplicada.
- [x] `MaintenanceOrder.ts`: `asset_id` nullable + `next_maintenance_km`/
  `facility_specialty`/`facility_area_id`.
- [x] Models novos: `FacilityVehicleDetail` (substitui `FacilityVehicle`,
  removido), `FacilityVehicleDocument`, `FacilityDriver`,
  `FacilityVehicleTrip`, `FacilityFine`, `FacilityCleaningExecution`,
  `FacilityVisitor`, `FacilityVisit`, `FacilityCorrespondence`,
  `FacilityResourceReservation`; `FacilityFuelRecord`/
  `FacilityCleaningSchedule` atualizados. Associacoes em `models/index.ts`.
- [x] Middleware `authorizeAnyModule` (composicao OR de modulos).
- [x] RBAC `approve` aplicado nas 5 acoes previstas no contrato §0.2.
- [x] 60 endpoints implementados (48 novos + 8 breaking + 4 mantidos) —
  ver detalhamento em `docs/governance/HANDOFF_CODEX.md`.
- [x] Integracao D-3 (insumos) via `InventoryService`/adapter — sem
  endpoint proprio de estoque.
- [x] 50 testes unitarios novos/reescritos (`facilities-*.test.ts`) — foco
  odometro, CNH, multa/prazos, LGPD, criacao veiculo+asset transacional.
- [x] `npm run typecheck` limpo; suite unitaria completa: 1105/1106
  passando (unica falha e a pre-existente `onda3-shipping-cockpit-cashflow`,
  nao relacionada).
- [ ] **Pendente (fora de escopo deste passo):** telas
  `client/src/pages/facilities/` vao quebrar com os breaking changes
  (`vehicle_id`→`asset_id`, `id` do recurso vehicles passa a ser
  `asset_id`) — proxima tarefa de `PromadorFonteEnd`.
- [x] **Pendente:** aplicar as migrations `20260807-000290..300` em *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  ambiente de teste real (RNF-FAC-03) antes de qualquer deploy; teste de
  integracao real (Postgres) do fluxo completo (odometro cross-row,
  EXCLUDE gist de reservas, transicao automatica `expired_nic`).
- [ ] **Pendente:** `SST` nao tem adapter real — a checagem de
  `personal_safety_risk`/notificacao SST em `.../execute` usa um marcador
  em texto livre (`notes`) como simplificacao, nao uma integracao real
  com o modulo SST — revisar se vira requisito de fato.
- [ ] **Risco residual (identidade):** `reserved_by`/`executed_by` em
  Reserva/Execucao de Limpeza sao gravados com `req.user.id` (JWT, tabela
  `users`) mas as colunas sao FK para `employees.id` — mesma ambiguidade
  usuario×funcionario ja presente em outros pontos do sistema, nao
  resolvida por este bloco (herdada do contrato de API, que pede
  `req.user.id` explicitamente).

## 2026-08-07 (rodada seguinte) — Correção dos 2 achados P1 da auditoria CONT/TES/CTR — `programador`

**Escopo:** correção dos 2 achados P1 de
`docs/governance/auditorias/AUDITORIA_CONT_TES_CTR_2026-08-07.md`.

- [x] **P1-2 (Contabilidade) — CORRIGIDO.** Conta com `active=false` agora
  é rejeitada em novo lançamento, com o mesmo padrão de erro já usado para
  `accept_entries=false`. Alterado
  `server/src/modules/accounting/application/use-cases/entry/CreateEntryUseCase.ts`
  e `.../UpdateEntryUseCase.ts` (checagem `if (!account.active) throw new
  BusinessRuleError(...)` logo após a checagem de `accept_entries`).
  Testes novos em `server/tests/unit/accounting-use-cases.test.ts`
  ("rejeita conta desativada... P1-2 da auditoria CONT/TES/CTR", 2 casos:
  create e update) — passando.
- [x] **P1-1 (Controladoria) — CORRIGIDO, sem migration.** Investigação
  mostrou que a premissa da auditoria ("`accounts_payable` não tem coluna
  de data de pagamento") estava desatualizada: `accounts_payable` e
  `accounts_receivable` **já têm** `payment_date` (`DATEONLY`, nullable),
  populada em todo evento real de baixa (`PayPayableUseCase`,
  `ReceivePaymentUseCase`, `MatchEntryUseCase` da conciliação bancária,
  `ProcessReturnFileUseCase` do retorno CNAB) — não foi necessária nova
  migration. A correção foi trocar o filtro de "realizado" em
  `SequelizeCostCenterRepository.getCostCenterTotalsByPayable`/
  `getCostCenterTotalsByReceivable` de `due_date` para
  `COALESCE(payment_date, due_date)` (fallback para `due_date` só em
  registro legado sem `payment_date`), com `WHERE` ampliado para `due_date
  BETWEEN :from AND :to OR COALESCE(payment_date, due_date) BETWEEN :from
  AND :to` — sem essa ampliação uma conta vencida fora do período mas paga
  dentro dele desapareceria da consulta inteira. `open_amount` continua
  filtrado por `due_date` (saldo em aberto no período, comportamento
  correto e inalterado). Isso corrige tanto o relatório orçado×realizado
  da Controladoria (`GetBudgetVsActualReportUseCase`) quanto o relatório
  de Centro de Custo do Financeiro (`GetCostCenterReportUseCase`), que
  compartilham o mesmo repositório. Arquivos alterados: `.../financial/
  infrastructure/sequelize/SequelizeCostCenterRepository.ts`, `.../
  financial/domain/repositories/CostCenterRepository.ts` (JSDoc),
  `.../budget/application/use-cases/report/GetBudgetVsActualReportUseCase.ts`
  (JSDoc), `.../financial/application/use-cases/GetCostCenterReportUseCase.ts`
  (JSDoc). Teste novo dedicado (mock de `sequelize.query`, valida a SQL
  gerada) em `server/tests/unit/cost-center-realized-payment-date.test.ts`
  — passando.
- [x] `npm run typecheck` limpo (`server/`). Suíte unitária completa:
  1110/1111 passando (única falha é a pré-existente
  `onda3-shipping-cockpit-cashflow`, não relacionada a esta correção).
- [ ] **Fora de escopo desta correção (registrado como P2 residual, já
  citado na auditoria):** teste de integração real (Postgres) criando uma
  conta a pagar com vencimento em um mês e baixa em outro, confirmando
  contra banco real que o relatório atribui o valor ao mês de pagamento.
  Validação de limitação estrutural conhecida e não resolvida: `amount_paid`
  é um acumulador único (não há linha por baixa parcial), então uma conta
  com múltiplas baixas parciais em meses diferentes tem seu
  `realized_amount` inteiro atribuído ao mês do **último** `payment_date`
  — mais correto que o comportamento anterior (100% dos casos comuns de
  pagamento único por título), mas ainda não é uma reconstrução exata de
  cada baixa parcial individual (exigiria uma tabela de histórico de
  pagamentos, fora do escopo deste P1 pontual).

## 2026-08-07 (rodada seguinte) — Auditoria Cruzada BLOCO 5 MKT (Requisitos × Banco × API) — `AuditorIntegrador`

**Escopo:** `docs/business/BLOCO_5_MKT_REQUISITOS.md` (40 RF-MKT) ×
`docs/business/BLOCO_5_MKT_MODELO_DADOS.md` + migrations
`server/migrations/20260807-000310` a `000315` ×
`docs/business/BLOCO_5_MKT_API.md`. Relatório completo:
`docs/business/BLOCO_5_MKT_AUDITORIA.md`. **Status: `[REPROVADO COM
RESSALVAS]`** — 6 inconsistências reais encontradas e **já corrigidas
nesta mesma passada** (não ficaram como pendência de correção futura,
diferente do padrão usual deste TODO — os 6 itens abaixo são histórico,
não ação pendente):

- [x] **Corrigido.** `converted_client_id` (nome inventado pelo contrato
  de API) → `converted_to_customer_id` (nome real, decidido pelo `AdmDBA`
  para não forçar rename de coluna com FK/índice já ativos em produção) —
  8 ocorrências em `BLOCO_5_MKT_API.md`.
- [x] **Corrigido.** `responsible_sales_user_id`/`sales_handoff_at` (nomes
  conceituais do RF) → `sales_owner_user_id`/`handoff_at` (nomes reais da
  migration `000310`) — ~11 ocorrências em `BLOCO_5_MKT_API.md`.
- [x] **Corrigido.** Contrato de API descrevia `authorizeAnyModule` como
  middleware "a criar" pelo `programador` — na verdade **já existe**
  (`server/src/middlewares/authorizeAnyModule.ts`, Bloco 4 FAC). Corrigido
  em `BLOCO_5_MKT_API.md` §4.5/§10.5.
- [x] **Corrigido (achado potencialmente mais grave dos 6).** RBAC dupla
  do handoff (`POST /leads/:id/handoff`, RF-MKT-015) usava a chave
  `authorizeModule('sales', ...)` — **`sales` não existe** no catálogo
  RBAC (`server/src/shared/domain/accessModules.ts`); a chave real do
  módulo de Vendas é `vendas`. Se implementado como escrito, nenhum perfil
  de Vendas teria conseguido usar o endpoint (a intenção central de
  RF-MKT-015). Corrigido para `authorizeAnyModule([{ moduleKey:
  'marketing' }, { moduleKey: 'vendas' }])`.
- [x] **Corrigido.** `SalesRevenueServiceAdapter` do contrato agregava
  receita via `Sale.client_id` — coluna inexistente; `server/src/models/
  Sale.ts` usa `customer_id`. Corrigido em `BLOCO_5_MKT_API.md` §2.
- [x] **Corrigido, com mudança de schema.** Contrato de API usa
  `converted_at` (payload de `POST /leads/:id/convert`, KPI
  `median_lead_cycle_days`) — coluna **não existia em nenhuma migration
  nem no model**. Adicionada `marketing_leads.converted_at` (TIMESTAMPTZ,
  nullable, sem backfill retroativo) na migration `20260807-000312`,
  validada com `node -c`; `BLOCO_5_MKT_MODELO_DADOS.md` atualizado (MER +
  §3.2b + §8).
- [x] **Corrigido (robustez, não achado de nomenclatura).** Migration
  `20260807-000312` (a mais delicada do bloco — saneamento de leads
  `converted` órfãos) não executava seus 5 passos dentro de uma transação
  explícita (`sequelize-cli` não envolve `up()` em transação
  automaticamente). Como nenhum passo desta migration usa `ALTER TYPE`
  (restrição real está na migration `000310`, não nesta), não havia
  impedimento técnico — envolvida em `queryInterface.sequelize.transaction`.
  Ordem de execução (log → UPDATE → CHECK) e idempotência (guards
  `if (!columns.x)`/`WHERE` que zera após a 1ª execução) foram conferidas
  linha a linha e estão corretas, sem alteração necessária.
- [ ] **Risco de negócio residual, não mitigável por engenharia (declarado
  pelo próprio `AdmDBA`, confirmado por esta auditoria):** a migration
  `000312` rebaixa TODO lead `converted` órfão para
  `qualified`/`needs_review=true`, sem diferenciar erro operacional
  recente de venda fechada há meses (schema não tem histórico de status
  para inferir). Antes de rodar em qualquer banco com dado real de
  Marketing, o volume afetado (impresso via `console.log` no `up()`)
  precisa ser contado e revisado por Marketing/Vendas —
  `[VERIFICAR COM MARKETING]` já registrado em
  `BLOCO_5_MKT_REQUISITOS.md` §5.2 item 6, não resolvido por esta
  auditoria (decisão de negócio, não técnica).
- [ ] **Não coberto por esta auditoria (fora de escopo declarado):**
  `client/` (telas) — módulo ainda não tem frontend desta correção;
  validação em banco real (Postgres) do volume de leads órfãos e das 6
  migrations rodando de fato (só validadas por `node -c` + leitura
  estática nesta passada, nenhuma foi aplicada).

## 2026-08-07 (rodada seguinte) — Backend da correção do BLOCO 5 MKT implementado (Passo 4) — `programador`

**Escopo:** implementação do backend (`server/src/modules/marketing/`,
`server/src/models/Marketing*.ts`) a partir dos artefatos aprovados
(`docs/business/BLOCO_5_MKT_REQUISITOS.md`, `BLOCO_5_MKT_MODELO_DADOS.md`,
`BLOCO_5_MKT_API.md`, `BLOCO_5_MKT_AUDITORIA.md`, commits `704e8e2` +
`ec1ac57`). **Migrations `20260807-000310` a `000315` NÃO foram aplicadas**
(continuam como estavam, responsabilidade de um passo de deploy futuro) —
os models Sequelize foram escritos para o schema-alvo dessas migrations.

- [x] Models atualizados/criados: `MarketingLead` (novo enum de status com
  `in_sales_attendance`, `sales_owner_user_id`, `handoff_at`,
  `qualified_at`, `first_response_at`, `converted_at`, `needs_review`,
  campos LGPD, `event_id`), `MarketingCampaign` (`budget_requested`,
  `budget_approved*`, `notes`, `metrics_recalculated_at` —
  `leads_generated`/`conversions`/`roi` mantidas como cache),
  `MarketingMaterial` (`stock_item_id`, `approved_by`, `approved_at`),
  `MarketingEvent`/`MarketingEventChecklistItem`/
  `MarketingLeadSaneamentoLog` (novos) — `server/src/models/index.ts`
  atualizado (imports + associações + barrel de exports).
- [x] Conversão atômica (UC-63): `POST /api/marketing/leads/:id/convert`
  (`ConvertLeadUseCase`) — opção A (cliente existente, via
  `ClientService.findById`) ou B (cliente novo, via
  `ClientService.create()` reaproveitando `CreateClientUseCase` do módulo
  `clients` **na mesma transação Sequelize**); `PUT /leads/:id` e
  `POST /leads/:id/status` continuam rejeitando `status='converted'`
  (`ChangeLeadStatusUseCase` lança `BusinessRuleError` redirecionando para
  `/convert`). `ClientsRepository.create`/`SequelizeClientsRepository.create`/
  `CreateClientUseCase.execute` ganharam parâmetro `transaction` opcional
  (mudança pontual no módulo `clients` para viabilizar a atomicidade —
  compatível para trás).
- [x] Métricas não-editáveis (BR-MKT-004): `createCampaignSchema`/
  `updateCampaignSchema` (Zod `.strict()`) não aceitam mais
  `leads_generated`/`conversions`/`roi`/`budget` — envio retorna `400`
  (chave desconhecida, nunca ignorado silenciosamente).
  `POST /campaigns/:id/recalculate-metrics` (`RecalculateCampaignMetricsUseCase`)
  é idempotente — recalcula `leads_generated`/`conversions` por `COUNT`
  real e `roi` por receita atribuída somada por lead convertido (janela de
  90 dias a partir de `converted_at` de cada lead, não da campanha).
- [x] Handoff (UC-64): `POST /leads/:id/handoff` (`HandoffLeadUseCase`)
  com `authorizeAnyModule([{moduleKey:'marketing'}, {moduleKey:'vendas'}])`
  (middleware reaproveitado, não recriado); `ChangeLeadStatusUseCase`
  aceita `sales_owner_user_id` só quando `status='qualified'` e exige
  responsável já atribuído para avançar a `in_sales_attendance`
  (RF-MKT-012).
- [x] Eventos/Feiras (UC-65): CRUD completo
  (`CreateEventUseCase`/`UpdateEventUseCase`/`ListEventsUseCase`/
  `GetEventByIdUseCase`), checklist
  (`AddChecklistItemUseCase`/`UpdateChecklistItemUseCase`), encerramento
  exigindo `actual_cost` (`CloseEventUseCase`, RF-MKT-025) e relatório de
  ROI/custo por lead por evento (`GetEventsReportUseCase`,
  `GET /reports/events`). **Decisão registrada:** `PUT /events/:id` bloqueia
  TODA edição quando `completed`/`canceled` (sem exceção de `notes`, como
  sugerido no contrato de API) — `marketing_events` não tem coluna `notes`
  na migration `000313`; documentado no código
  (`UpdateEventUseCase.ts`) como divergência consciente entre contrato e
  schema real.
- [x] KPIs de funil (UC-66): `GET /reports/funnel`
  (`GetFunnelReportUseCase` — CPL, taxa de qualificação, conversão, receita
  atribuída/ROI, SLA de handoff, mediana de ciclo, orçado×realizado) e
  `GET /reports/events`; ambos retornam `200` com `has_data:false` e todos
  os campos numéricos `null` quando o filtro não encontra dado (nunca
  divisão por zero).
- [x] RBAC `approve` pontual: `POST /campaigns/:id/budget-decision`
  (`BudgetDecisionUseCase`) e `PATCH /materials/:id/approve`
  (`ApproveMaterialUseCase`) usam `authorizeModule('marketing', 'approve')`
  — resto do módulo continua em `operate`/leitura padrão.
  `budget_approved_by`/`approved_by` sempre vêm de `req.user.id`, nunca do
  body.
- [x] `stock_item_id` em `MarketingMaterial` é FK opcional só de leitura —
  nenhum endpoint de estoque criado pelo módulo MKT (BR-MKT-011 mantida).
- [x] 27 endpoints do contrato implementados em
  `server/src/modules/marketing/presentation/routes/marketing.ts` (8 leads,
  6 campanhas, 8 eventos/checklist, 2 relatórios, 6 materiais — a soma
  aritmética das seções do contrato é 30, mas a rota
  `PUT /events/:id/checklist/:itemId` e `GET /events/:id/leads` já
  constavam do grupo de eventos original de 8; todos os endpoints
  descritos em `BLOCO_5_MKT_API.md` §4 a §8 foram implementados 1:1, sem
  omissão).
- [x] Testes unitários novos/reescritos (52 + 10 + 10 + 22 + 4 = 98 testes
  do módulo Marketing, suíte completa 1177/1178 — única falha é a
  pré-existente `onda3-shipping-cockpit-cashflow`, não relacionada):
  `tests/unit/marketing-lead-use-cases.test.ts`,
  `marketing-campaign-use-cases.test.ts`,
  `marketing-material-use-cases.test.ts` (reescritos para o novo
  comportamento), `marketing-convert-lead-use-case.test.ts`,
  `marketing-handoff-lead-use-case.test.ts`,
  `marketing-funnel-report-use-case.test.ts`,
  `marketing-event-use-cases.test.ts`, `marketing-lead-saneamento.test.ts`
  (novos).
- [x] `npm run typecheck` limpo (`server/`).
- [ ] **Pendência conhecida, fora deste passo:** as telas
  `client/src/pages/marketing/` (`MarketingPage.tsx` e afins, entregues em
  2026-08-06 contra o contrato ANTIGO) vão quebrar com os breaking changes
  deste passo (`budget`→`budget_requested`, `status='converted'` via
  `/status` removido, `approved` removido de `POST /materials`, etc.) —
  responsabilidade do Passo 5 (frontend), não deste passo de backend.
- [ ] **Pendência herdada, não resolvida por este passo (é decisão de
  negócio/infra, não de código):** migrations `000310`-`000315` seguem não
  aplicadas; volume real de leads `converted` órfãos ainda não contado
  (`[VERIFICAR COM MARKETING]`); parâmetros
  `REVENUE_ATTRIBUTION_WINDOW_DAYS`/`HANDOFF_SLA_DAYS`/
  `BUDGET_ALERT_WARNING_THRESHOLD` implementados como constantes de código
  (`server/src/modules/marketing/domain/constants.ts`), não editáveis via
  API nesta rodada; teste de integração real (Postgres) do fluxo completo
  (conversão atômica, handoff, saneamento) ainda não executado — só
  unitário com repositórios mockados.

## 2026-08-08 — BLOCO 3 Jurídico: correção das 2 pendências reais (RF-JUR-030, RF-JUR-003) — `programador`

**Escopo:** fecha as 2 pendências deixadas explícitas no cabeçalho de
`ActivateContractUseCase.ts` e nas seções "Pendencia real 1/2" acima, com
regras de negócio decididas pelo dono do produto em 2026-08-08.

- [x] **RF-JUR-030 (Atos Societários):** tabela `jur_corporate_acts`
  (migration `20260808-000001-create-jur-corporate-acts.cjs`), model
  `JurCorporateAct` (`server/src/models/JurCorporateAct.ts`), CRUD completo
  (`CreateCorporateActUseCase`, `ListCorporateActsUseCase`,
  `GetCorporateActByIdUseCase`, `UpdateCorporateActUseCase`) e
  `corporateActController.ts`. Rotas `GET/POST /api/jur/corporate-acts` e
  `GET/PUT /api/jur/corporate-acts/:id`, `authorizeModule('juridico', 'operate')`
  igual ao resto do módulo. Edição bloqueada quando `status='registered'`
  (`BusinessRuleError`); transição `draft→registered` acontece no `PUT`
  quando `registration_protocol`+`registered_at` são informados juntos.
- [x] **RF-JUR-003 (alçada de aprovação de contrato por valor):** 3 faixas
  definidas pelo dono do produto — valor <= R$ 50.000 ativa direto
  (comportamento existente, não alterado); R$ 50.000 < valor <= R$ 300.000
  exige 1 aprovação `diretor`; valor > R$ 300.000 exige `diretor` E
  `financeiro`. Thresholds como constantes de código
  (`server/src/modules/juridico/domain/constants.ts`,
  `JUR_APPROVAL_THRESHOLD_DIRECTOR`/`JUR_APPROVAL_THRESHOLD_FINANCE`), mesmo
  padrão de `marketing/domain/constants.ts` (sem tabela de configuração
  editável nesta rodada). Nova tabela `jur_contract_approvals` (migration
  `20260808-000002-create-jur-contract-approvals.cjs`, unique
  `contract_id`+`approver_role`), model `JurContractApproval`, novo
  endpoint `POST /api/jur/contracts/:id/approve`
  (`ApproveContractUseCase`) montado ANTES do gate geral do módulo com
  `authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])`
  (aprovadores de alçada não necessariamente têm o módulo `juridico`).
  `approver_user_id` sempre de `req.user.id`; `approver_role` sempre
  resolvido do RBAC (`req.user.permissions.diretor`/`.financeiro` no
  controller), nunca aceito do body — `role` no body só desambigua quando o
  aprovador tem os dois perfis. `ActivateContractUseCase` ajustado para
  consultar `jur_contract_approvals` via novo `ContractApprovalRepository`
  antes de ativar, lançando `BusinessRuleError` listando os papéis
  faltantes quando aplicável.
- [x] Novo módulo de acesso `diretor` adicionado a
  `server/src/shared/domain/accessModules.ts` (`financeiro` já existia no
  catálogo e passou a ser reaproveitado como segundo papel de aprovador).
- [x] Testes: `server/tests/unit/juridico-corporate-act-use-cases.test.ts`
  (10 casos, novo) + 11 casos novos em
  `server/tests/unit/juridico-contract-use-cases.test.ts`
  (`ActivateContractUseCase` — RF-JUR-003, `ApproveContractUseCase`).
  Suíte completa do server: 1198/1198 unitários passando. `npm run
  typecheck` limpo.
- [x] **Pendência residual, fora deste passo:** migrations
  `20260808-000001`/`20260808-000002` ainda não aplicadas no banco (deixadas *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  para revisão/aplicação manual, conforme instrução da tarefa); nenhuma
  tela nova em `client/` (fora de escopo — telas de Procurações/Atos
  Societários e o botão de aprovação de contrato ficam para o próximo passo
  de frontend); sem teste de integração real (Postgres) do fluxo completo
  approve→activate — só unitário com repositórios mockados.

## 2026-08-09 — BLOCO 6 RH: auditoria cruzada Requisito x Banco x API — `AuditorIntegrador`

**Escopo:** auditoria cruzada dos 3 artefatos do Bloco 6 (RH, ultimo bloco
do pipeline de modulos novos) antes da implementacao. Relatorio completo em
`docs/business/BLOCO_6_RH_AUDITORIA.md`. Veredito: **REPROVADO COM
RESSALVAS**.

- [x] 5 lacunas objetivas de schema corrigidas diretamente nas migrations
  (nao aplicadas ao banco) e no Modelo de Dados: `hr_admission_processes`
  (faltavam `department_id`/`job_position_id`/`candidate_cpf`/
  `planned_start_date`), `hr_absences` (faltava `extended_program`),
  `hr_employee_benefits` (faltava `suspended_days`),
  `hr_employee_job_history` (faltava `pending_aso_risk_change` + ajuste no
  trigger `hr_lock_job_history`), `hr_termination_processes` (faltava
  `trct_paid_at`).
- [x] Inconsistencia interna corrigida em `BLOCO_6_RH_API.md` secao 2 sobre
  o escopo real de `SstAsoService` (nao e usado como gate de conclusao, so
  no momento da solicitacao do ASO — a checagem real e via snapshot em
  `EmployeeDocument`, alinhado ao que o `AdmDBA` ja havia modelado).
- [x] Contagem de tabelas corrigida em `BLOCO_6_RH_MODELO_DADOS.md`
  ("18 tabelas novas" -> 20, confirmado contra as 16 migrations).
- [x] Contagem de prioridade corrigida em `BLOCO_6_RH_REQUISITOS.md`
  ("25 P0, 40 P1, 12 P2" -> 19 P0, 49 P1, 8 P2, confirmado por grep
  deterministico das 81 linhas RF-RH).
- [ ] **[PENDENCIA DE DECISAO DO DONO DO PRODUTO]** RBAC `rh:approve` usado
  com dois significados nao relacionados (autorizar demissao/rescisao E
  liberar leitura de `Absence.cid`/`PayrollImportItem.bruto`/`liquido`) —
  3 opcoes documentadas em `BLOCO_6_RH_API.md` secao 0, recomendacao do
  `AuditorIntegrador`: Opcao C (intersecao de modulo so para os 2 campos
  sensiveis, manter `approve` so para as 2 acoes de alto impacto).
- [ ] **[PENDENCIA DE DECISAO DO DONO DO PRODUTO]** Risco de duplicacao
  RH x SST em treinamento normativo (`is_normative=true`) — SST ja tem
  matriz funcao x norma + blocklist proprios (`server/src/modules/sst/`);
  RH cria um segundo registro de conclusao e um segundo relatorio "quem
  nao pode operar" sem sincronizacao automatica. Recomendacao: delegar ao
  blocklist do SST para cursos normativos.
- [ ] **[PENDENCIA DE DECISAO DO DONO DO PRODUTO]** `DELETE
  /api/employees/:id` (ja em producao, `status='inactive'`) nao foi
  reconciliado com o novo `TerminationProcess` (`status='fired'`) — dois
  caminhos concorrentes de desligamento sem os gates do fluxo formal
  (ASO demissional, devolucao de ativos) no caminho antigo.
- [ ] **[PENDENCIA DE IMPLEMENTACAO, passo 4 `programador`]** Adicionar
  `'pcd'` a `SENSITIVE_EMPLOYEE_FIELDS`
  (`server/src/modules/employees/domain/services/employeeSensitiveFields.ts`)
  na mesma migration/PR que cria `employees.pcd` — sem isso, condicao de
  PCD fica visivel a qualquer autenticado via `GET /api/employees`.
- [ ] **Cobertura de auditoria declarada parcial:** 7 tabelas P1/P2 de
  menor risco legal (`hr_job_positions`, `hr_job_vacancies`/
  `hr_candidates`, `hr_training_courses`/`hr_job_position_trainings`/
  `hr_employee_trainings`, `hr_time_sheet_summaries`,
  `hr_payroll_import_batches`/`items`, `hr_performance_reviews`,
  `hr_vacation_accrual_periods`) nao foram auditadas coluna-a-coluna
  contra a migration bruta nesta rodada — recomenda-se segunda passada
  antes do `programador` iniciar a implementacao dessas tabelas.

## 2026-08-09 — Fecha superfície de risco de enum sem validação no módulo TI — `programador`

**Contexto:** logo após a correção de um 500 em produção no módulo
Jurídico (query filtrando por um valor de `status` fora do enum do
Postgres — `invalid input value for enum`, não capturado nem por
`npm run typecheck` nem pelos 1203 testes unitários porque o `where` do
Sequelize é `any` e os testes usam repositório mockado), uma varredura
identificou que o módulo `ti` era o único, junto de `juridico` já
corrigido, sem validador Zod replicando os enums reais do banco — os
use-cases só validam presença dos campos, não o valor, e o payload ia
direto do `req.body` para o `.create()`/`.update()` do Sequelize.

- [x] Criado `server/src/modules/ti/presentation/validators/` (5 arquivos
  novos, mesmo padrão `.strict()` + `safeParse`/`handleZodError` de
  `facilities`/`juridico`): `licenseValidators.ts` (`license_type`,
  `billing_cycle` — `it_software_license_details`), `termValidators.ts`
  (`acceptance_type`, `condition_on_return` —
  `it_responsibility_terms`), `backupValidators.ts` (`backup_type` —
  `it_backup_logs`), `accessRequestValidators.ts` (`type` —
  `it_access_requests`), `ticketValidators.ts` (`default_priority` —
  `it_ticket_categories`, `priority` — `it_tickets`/reclassificação).
  Cada literal foi conferido contra a migration real (`20260807-000150` a
  `000155`), não contra uma lista solta.
- [x] 5 controllers ligados aos validadores:
  `licenseController.create`/`.update`, `termController.create`/
  `.returnTerm`, `backupController.create`, `accessRequestController.create`,
  `ticketController.createCategory`/`.updateCategory`/`.changePriority`.
  Endpoints cobertos: `POST/PUT /api/ti/licenses(:assetId)`,
  `POST /api/ti/responsibility-terms`,
  `POST /api/ti/responsibility-terms/:id/return`,
  `POST /api/ti/backup-logs`, `POST /api/ti/access-requests`,
  `POST/PUT /api/ti/ticket-categories(:id)`,
  `PUT /api/ti/tickets/:id/priority`.
- [x] **Decisão de escopo (não é omissão):** `license_type` NÃO é aceito em
  `updateLicenseSchema` — a API já documentava
  `PUT /api/ti/licenses/:assetId` como "atualiza fornecedor/seats/custo/
  ciclo" (`docs/business/BLOCO_2_TI_API.md` §3) e `UpdateLicenseDetailInput`
  nunca incluiu o campo; o `.strict()` agora fecha um caminho não
  documentado que existia por acidente (o controller fazia spread cru de
  `req.body`, então um cliente que mandasse `license_type` no update
  conseguia alterá-lo sem que a API ou o tipo TS previssem isso).
  `it_tickets.status`/`it_access_requests.status`/
  `it_responsibility_terms.status` não precisaram de validador porque
  nunca vêm do `req.body` (são sempre setados internamente pelo use-case
  em transições fixas). `impact`/`urgency` de `it_tickets` são
  `SMALLINT` com `CHECK 1..3`, não `ENUM` — fora do escopo desta tarefa
  (risco residual: um valor fora de 1..3 ainda causaria erro de `CHECK
  constraint` do Postgres, não de `ENUM`; ver observação abaixo).
- [x] Testes novos: `server/tests/unit/ti-validators.test.ts` (21 casos —
  1 válido + 1 inválido por enum coberto, mais 1 caso de `.strict()`
  rejeitando campo desconhecido). Suíte completa do server:
  1259/1260 passando (a única falha, `module-authorization-map`, é de
  outro agente trabalhando em paralelo no módulo `rh`, fora do escopo e
  das restrições desta tarefa). `npm run typecheck` limpo.
- [ ] **Risco residual, fora do escopo pedido:** `impact`/`urgency` em
  `POST /api/ti/tickets/:id/assign` e `PUT /api/ti/tickets/:id/priority`
  têm `CHECK (... BETWEEN 1 AND 3)` no banco mas não são `ENUM` — um
  valor fora da faixa ainda produziria um erro de constraint do Postgres
  não mapeado para 400 (mesma classe de bug, mas fora do pedido explícito
  "enum" desta tarefa). Meus schemas Zod já limitam `impact`/`urgency` a
  `1..3` como efeito colateral (`changeTicketPrioritySchema`), mas
  `AssignTicketUseCase`/`assign` continua sem validador — recomenda-se
  cobrir na próxima rodada de robustez.

---

## 2026-08-09 — Cadeia do produto, Onda 1: gaps G16, G8, G10, G12 (+ análise de G6) — `programador`

**Contexto:** `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` — a
auditoria do fluxo real do produto final (21 estações) achou 17 gaps. G2 já
havia sido corrigido (commit `5ec0651`). Esta entrega fecha os demais gaps da
Onda 1 sob a mesma regra: correção contida, sem migration, sem decisão de
negócio, uma correção por vez com teste.

- [x] **G16 — os dois caminhos de criação de OP tinham rigor diferente.**
  `ConvertPlannedOrdersToProductionOrderUseCase` (via MRP) não validava
  disponibilidade nenhuma e criava OP sem material — OP que depois não podia
  ser concluída (a conclusão explode a BOM e falha sem estoque/sem BOM, G2).
  Passa a chamar `BomService.checkAvailability` com a mesma regra do caminho
  manual, convertendo o 404 de "sem BOM ativa" em `BusinessRuleError`
  didático (mesmo padrão do G2) em vez de vazar um 404 de serviço.
  **Decisão de desenho:** `semi_finished` **continua aceito** neste caminho
  (produzir subconjunto é legítimo e é o que o MRP planeja ao explodir um
  `SUBCONJUNTO`); o caminho manual, mais restrito (`finished` apenas), não
  foi afrouxado — afrouxar controle está fora do escopo de um gap sobre o
  caminho permissivo demais.
- [x] **G16 — numeração `OP-YYYY-NNNN` insegura.** `countByOrderNumberPrefix`
  (`COUNT(*) + 1` lido pelo caso de uso) foi **removido** do contrato e da
  implementação, substituído por
  `ProductionOrderRepository.nextOrderNumberForYear(yearPrefix, transaction)`:
  advisory lock de transação por ano (`pg_advisory_xact_lock(41001, ano)`,
  reentrante — o laço do MRP pode chamá-lo N vezes) + `MAX` do sufixo já
  emitido. **Correção do enunciado do achado:** dentro do laço do MRP o
  `COUNT` *funcionava* (a contagem enxerga as próprias inserções da
  transação); os defeitos reais são (a) nada protegia contra criação
  concorrente lendo a mesma contagem e (b) `COUNT` regride quando uma OP é
  removida (`RemoveProductionOrderUseCase`), reemitindo um número já usado —
  e `order_number` é `UNIQUE`, então a colisão derruba a operação em runtime.
- [x] **G8 — teste acústico reprovado não abria não conformidade.**
  `CreateAcousticTestUseCase`: a condição `!passed && create_rnc_on_fail`
  virou `!passed`. Reprovação abre RNC **sempre** (`origin: 'final'`).
  **Decisão de desenho:** a flag `create_rnc_on_fail` **não foi removida do
  schema** — `createTestSchema` é `.strict()` e a tela de Laboratório sempre
  envia o campo; removê-lo daria 400 no client, que está fora do escopo
  desta tarefa. Ficou aceita e **ignorada**, marcada `@deprecated` no tipo de
  entrada e documentada em `API.md`/`04-USE_CASES.md`.
- [x] **G10 — RNC que não conseguia bloquear o lote passava em silêncio.**
  `CreateNonConformityUseCase` passa a classificar o desfecho do bloqueio
  (`blocked`/`not_found`/`not_blockable`/`not_informed`/`not_applicable`) e,
  quando **nada** é bloqueado, grava aviso explícito em
  `non_conformities.notes` prefixado por `[ATENCAO: NENHUM LOTE BLOQUEADO]`,
  que volta no payload da resposta (o endpoint devolve a RNC inteira).
  **Decisão de desenho:** avisar em vez de recusar — a RNC é registro de
  qualidade e evidência de auditoria (ISO 9001 8.7), e pode legitimamente
  referenciar lote externo/legado, material sem controle de lote ou nem se
  referir a produto (`audit`, `asset_id`). Exigir o lote também não
  resolveria (continuaria criando RNC sem bloqueio quando o número não
  existisse). Sem coluna nova: `notes` já existia, era nullable e **não era
  escrita por este caso de uso** — nenhum dado do usuário é sobrescrito.
- [x] **G12 — requisição e cotação podiam gerar pedido em duplicidade.**
  Controle de saldo/estado em três pontos, todos na mesma transação:
  (1) `CreateRfqUseCase` recusa cotar requisição em
  `ordered`/`partial`/`received`/`canceled` e só puxa itens com saldo
  (`purchase_requisition_items.status = 'pending'`); (2) `AwardRfqUseCase`
  recebe o `PurchaseRequisitionRepository` (4º parâmetro, injetado no
  controller), trava a requisição (`FOR UPDATE`) **antes** de criar qualquer
  pedido, exige `approved`, exige saldo nos itens adjudicados, marca-os
  `ordered` e fecha a requisição **só quando não sobra saldo**;
  (3) `ConvertRequisitionToPurchaseOrdersUseCase` passa a converter apenas
  itens `pending`. **Decisão de desenho (efeito colateral consciente):**
  adjudicar exige requisição `approved` — mesma porta da conversão direta;
  antes, adjudicar uma requisição `draft`/`pending` gerava pedido de compra
  pulando o gate de aprovação e saltava a máquina de estados direto para
  `ordered`. Cotar antes de aprovar continua permitido (o preço cotado é o
  que embasa a aprovação).
- [x] **G15 avaliado no contexto do G12 e deliberadamente NÃO ativado.** O
  enum `purchase_requisitions.status` (`draft, pending, approved, ordered,
  partial, received, canceled`) espelha o de `purchase_orders`, onde
  `partial` significa "parcialmente **recebido**". Reaproveitá-lo aqui para
  "parcialmente **pedido**" colidiria com a rotina de recebimento que o G15
  ainda vai escrever. O saldo de compra ficou em
  `purchase_requisition_items.status` (`pending|ordered|canceled`), enum
  inequívoco e já existente; a requisição permanece `approved` enquanto há
  saldo. **`partial`/`received` continuam mortos — G15 segue em aberto.**
- [ ] **G6 — analisado e NÃO implementado (decisão consciente).** A
  transição `released → in_progress` só grava `start_date`, mas a
  pré-condição que importa já é coberta: `in_progress` só é alcançável a
  partir de `released`/`paused`, e entrar em `released` valida
  disponibilidade e **reserva** o material (`reserveMaterials`). As três
  validações sugeridas não têm onde se apoiar: **centro de trabalho** não
  existe como coluna em `production_orders` (vive nas etapas de
  roteiro/apontamento) — exigi-lo é **mudança de schema**, explicitamente
  fora do escopo; **`responsible_id`** é opcional por desenho em todo o
  módulo e nenhuma regra documentada o torna obrigatório; **apontamento
  iniciado** contradiz a decisão explícita de `reconcileTrackingOnCompletion`
  ("OP sem apontamento por etapa: fluxo simples permanece válido") e é
  exatamente a pergunta em aberto do **G4**, que depende de decisão do dono
  (Onda 3). A análise ficou registrada em código, em
  `ProductionOrderEntity.transitionTo`. O plano já classificava G6 na
  **Onda 2** (precisa de migration) — confirmado.
- [x] **Testes:** +29 casos novos/reescritos em 6 arquivos
  (`mrp-convert-to-production-order`, `production-order-lifecycle`,
  `laboratory-tests`, `quality-lot-lifecycle`, `rfq`,
  `requisition-convert-to-purchase`). Suíte unitária **1295/1296**
  (baseline era 1266/1267; a única falha, `module-authorization-map`, é do
  agente que está implementando `rh` em paralelo — mesma falha de antes,
  nenhuma nova). `npm run typecheck` limpo. Cada literal de status/enum foi
  conferido contra o model real (`PurchaseRequisition`,
  `PurchaseRequisitionItem`, `LotControl`, `NonConformity`, `Purchase`),
  não contra memória.
- [x] **Fixtures corrigidos (mock incompleto não é teste verde legítimo):**
  os fixtures de item de requisição em `requisition-convert-to-purchase`,
  `engineering-sample-requisition` e `rfq` não tinham `status`, embora a
  coluna seja `NOT NULL DEFAULT 'pending'` — não representavam uma linha
  real. Preenchidos.
- [ ] **Risco residual (G8), não introduzido nesta entrega:** a RNC da
  reprovação nasce em transação **própria**, depois do commit do teste
  (`CreateNonConformityUseCase` abre a sua). Se ela falhar, o teste
  reprovado já está gravado e a resposta é 500. Fechar isso exige que
  aquele caso de uso aceite transação externa, o que afeta todos os seus
  chamadores.
- [ ] **Pendência no `client/` (G8), fora do escopo desta tarefa:** remover
  a caixinha "Abrir RNC automaticamente se reprovar"
  (`client/src/pages/laboratory/RegisterTestTab.tsx`, `create_rnc_on_fail`
  em `client/src/api/laboratory.ts`) — o campo virou decorativo no backend.
  Quando ela sair, remover também do `createTestSchema`.
- [ ] **Sem teste de integração real (Postgres).** Duas mudanças desta
  entrega só foram exercitadas com repositório mockado e merecem teste
  contra banco real: o `pg_advisory_xact_lock` + `SUBSTRING/CAST` da
  numeração de OP (SQL cru, invisível para o typecheck e para os mocks) e o
  consumo de saldo requisição × cotação com dois clients concorrentes.

---

## 2026-08-09 — BLOCO 6 RH: backend do escopo P0 (Férias, Experiência, Admissão, Demissão) — `programador`

Passada 2/2 do backend do Bloco 6 (a passada 1 foi interrompida por queda
de rede e deixou domínio/aplicação/infraestrutura parciais, **sem camada
de apresentação**). Artefatos: `docs/business/BLOCO_6_RH_REQUISITOS.md`,
`..._MODELO_DADOS.md`, `..._API.md`, `..._AUDITORIA.md`.

### Entregue

- [x] **Camada de apresentação completa do módulo `rh`** (não existia): 5
  controllers, 6 arquivos de validators Zod `.strict()`, middleware Multer
  dedicado e o router agregador `/api/rh` (**34 endpoints**), montado em
  `server/app.ts`. Boot real do Express verificado (`require('./app')`),
  não só typecheck.
- [x] **`module-authorization-map.test.ts` volta a passar** — `rh` entrou
  na lista de módulos que exigem `authorizeModule` em 100% das rotas
  (era a única falha da suíte antes desta entrega).
- [x] **4 use cases de férias que faltavam:** listagem de programações,
  confirmação de gozo, calendário por departamento (RF-RH-039) e
  **revisão de programação** (RF-RH-040, P0 — sem endpoint no contrato de
  API original, ver "Lacunas do contrato" abaixo).
- [x] **RBAC decidido conforme instrução normativa do dono do produto**
  (fecha o achado 10 da auditoria, Opção C): `rh:approve` só para as 2
  ações de alto impacto; `hr_absences.cid` (`rh`+`sst`) e
  `hr_payroll_import_items.bruto/liquido` (`rh`+`financeiro`) por
  **interseção de módulo com omissão de campo**, em
  `modules/rh/domain/services/rhSensitiveFields.ts` (pronto e testado,
  ainda sem consumidor — as entidades são P1).
- [x] **Clean Architecture restaurada:** `EmployeeDirectoryService` +
  adapter substituíram o `require('models/index')` que estava dentro de 3
  use cases (férias, admissão, demissão). Efeito colateral desejado: os
  dois use cases transacionais passaram a ser testáveis sem banco.
- [x] **Transação onde faltava:** `decision='efetivar'` (fechar o contrato
  de experiência + abrir o indeterminado) agora é atômico.
- [x] **+81 casos de teste novos** em 5 arquivos
  (`rh-vacation-use-cases`, `rh-contract-use-cases`,
  `rh-admission-termination-use-cases`, `rh-sensitive-fields`,
  `rh-validators`) mais casos acrescentados a `rh-vacation-rules` e
  `rh-termination-rules`. Suíte unitária **1402/1402**, `npm run typecheck`
  limpo.

### Bugs de runtime encontrados e corrigidos (nenhum era pego por typecheck nem por teste)

- [x] **`export =` + `export interface` derrubava o servidor inteiro.** O
  esbuild do `tsx` transpila o módulo em modo ESM e o `export =` vira uma
  referência a `<Nome>_module`, que não existe →
  `ReferenceError` no `require`. Afetava **10 arquivos**: 8 use cases novos
  de `rh`, `employees/DeactivateEmployeeUseCase.ts` (introduzido na passada
  1) e **`juridico/ApproveContractUseCase.ts` — este já commitado desde
  `97628ae`**, ou seja, `require('./app')` estava falhando em `main`.
  Corrigido em todos (interface local ou `*Types.ts`) e coberto por uma
  guarda nova: `tests/unit/export-assignment-guard.test.ts`, que varre
  `src/` inteiro.
- [x] **Aviso prévio proporcional subestimado em 1 ano nos aniversários
  redondos** (Lei 12.506/2011). O cálculo usava
  `floor(dias / 365,25)`: 10 anos completos davam 9 → 57 dias de aviso em
  vez de 60, **3 dias a menos do que a lei garante**. Substituído por
  `calculateCompletedYearsOfService` (aniversário de calendário), com teste
  de regressão.
- [x] **`calculateConcessiveEnd` violaria CHECK do Postgres em 29/02.** O
  JS transborda para 01/03, o Postgres satura em 28/02 e a migration
  `20260808-000018` exige igualdade exata. Corrigido e testado.
- [x] **Contrato de experiência PRORROGADO nunca vencia automaticamente** —
  a verificação ativa só olhava `status='ativo'`. Era justamente o cenário
  do Art. 451 da CLT (prorrogação vencida em silêncio vira prazo
  indeterminado). Corrigido para `['ativo','prorrogado']`.

### Divergências lei × requisito (lei conferida na fonte, `planalto.gov.br`)

- [x] **Art. 134 §2º → §3º.** A vedação de início de férias nos 2 dias que
  antecedem feriado/DSR é o **§3º** (incluído pela Lei 13.467/2017); o §2º
  foi **revogado** por essa mesma lei. Os requisitos, o contrato de API e o
  código da passada 1 citavam "§2º". Citação corrigida no código.
- [ ] **Art. 135 caput × RF-RH-037 — divergência NÃO resolvida em código,
  precisa de decisão do dono do produto.** A lei fixa 30 dias como
  antecedência **mínima obrigatória** do aviso de férias; o requisito manda
  aceitar antecedência menor "com justificativa", sem bloquear. Mantido o
  comportamento do requisito (o ERP registra um aviso já dado, não o
  emite), mas a mensagem de warning passou a citar o descumprimento do
  mínimo legal. **Se o dono quiser bloquear, é uma linha.**
- [ ] **Feriados não são verificados** (Art. 134 §3º, cobertura parcial): o
  ERP não tem calendário de feriados em nenhum módulo, e nenhum RF do bloco
  pede um. Só o DSR (assumido como domingo) é verificado. Fica como
  pendência de modelagem para a passada 2.

### Lacunas dos artefatos de origem encontradas na implementação

- [x] **`POST /vacation-schedules/:id/revise` não existia no contrato de
  API.** §8.3 descreve a regra de RF-RH-040 (P0) em prosa e a migration
  modela as colunas, mas a tabela de endpoints de §8.1 não lista nenhuma
  rota capaz de executá-la. Endpoint acrescentado.
- [x] **`PATCH .../aso-confirmation`** (admissão e demissão) também não
  existia — sem ele o gate de conclusão seria inalcançável (já registrado
  pela passada 1, mantido).
- [x] **`"work_regime": "experiencia"`** no exemplo de §4.3 do contrato de
  API é inválido: o ENUM real de `employees.work_regime` é
  `clt|pj|estagiario|aprendiz`. Experiência é tipo de CONTRATO. Coberto
  por teste dedicado.

### Pendente para a passada 2 (P1/P2)

- [x] **Afastamentos, Benefícios e Treinamentos (Grupos 7/8/9) entregues em
  2026-08-12** — ver entrada própria abaixo. `Absence` liga de fato o
  gatilho de zeramento de férias (RF-RH-041/049): `CreateAbsenceUseCase`
  chama `ResetVacationAccrualPeriodUseCase` na mesma transação quando o
  acumulado previdenciário ultrapassa 6 meses.
- [ ] Grupos 1, 10 a 15 do contrato de API (restantes): Cargos, Espelho de
  Ponto, Histórico Contratual, Quotas PCD/aprendiz, Folha importada,
  Painel/KPIs (RF-RH-074/075), Avaliação de Desempenho e Recrutamento.
- [ ] **`RecalculateVacationAccrualPeriodUseCase` sempre assume 0 faltas** e
  devolve `data_gap_detected: true` — o cálculo real de RF-RH-032 depende
  de `HrTimeSheetSummary` (Grupo 10, P1). Enquanto isso, `dias_direito`
  só muda se o RH informar as faltas manualmente no corpo do
  `POST .../recalculate`.
- [ ] **Abertura automática do período aquisitivo no aniversário de 12
  meses** (RF-RH-031, segunda metade): hoje só o primeiro período é aberto,
  na conclusão da admissão. Falta o mecanismo recorrente (cron ou
  verificação ativa em leitura) — o contrato de API delegava a escolha ao
  programador (§8.1).
- [ ] **`PUT /api/employees/:id` ainda não gera `EmployeeJobHistory`**
  (RF-RH-065, P1) nem bloqueia `hire_date` sem confirmação de S-2200
  (RF-RH-010): `hire_date` continua fora de `ALLOWED_FIELDS`, ou seja, já é
  ignorado — a trava só faz sentido depois de abrir o campo (achado 15).
- [ ] **Nenhuma tela em `client/`** para o módulo RH — escopo dos agentes de
  frontend.

### Riscos residuais

- [x] **Migrations `20260808-000010..025` continuam NÃO aplicadas.** Todo o *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  backend foi validado com repositório mockado + boot do Express; nenhum
  `INSERT`/`SELECT` real foi executado. Os pontos de maior risco para o
  primeiro teste com Postgres real estão listados em
  `docs/database/DATABASE.md` (seção BLOCO 6 RH): CHECKs de data do período
  aquisitivo, coluna gerada `payment_deadline`, CHECK de checklist na
  conclusão e os 3 triggers de imutabilidade.
- [ ] **Sem teste de integração real** dos 2 fluxos transacionais
  (conclusão de admissão e de demissão) nem dos triggers de imutabilidade
  de contrato/período aquisitivo — mesma pendência das entregas anteriores.

---

## 2026-08-09 — Cadeia do produto, Onda 2: gap G3 (reserva vinculada à ordem) — `programador`

**Contexto:** `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`,
Onda 2. Classificado como **alto risco** e executado **isolado**, como manda o
princípio 4 do plano ("mudança de alto risco vai isolada, com caminho de
migração descrito para o dado que já existe").

**O problema (verificado no código, não suposto):** a reserva de material de
uma OP era só um contador global no produto — `products.reserved_quantity`,
incrementado por `inventoryService.reserveStock`. Sem vínculo com a ordem, a
liberação fazia `MIN(reservado_total, desejado)`
(`ChangeProductionOrderStatusUseCase.releaseReservedQuantity`), então
**qualquer OP liberava e consumia o material reservado por outra**.

- [x] **Tabela nova `production_order_reservations`** (OP × produto ×
  quantidade) como **fonte da verdade** da reserva — migration
  `20260809-000026-create-production-order-reservations.cjs`. Índice UNIQUE
  parcial `(production_order_id, product_id) WHERE status='active'` + 3 CHECKs
  (quantidade > 0, faixa de `quantity_released`, coerência `status` ×
  `quantity_released`). `up`/`down` funcionais; nenhum `comment:` dentro de
  `addColumn` (bug conhecido) — só `COMMENT ON COLUMN`.
- [x] **`products.reserved_quantity` mantido como cache derivado**, atualizado
  na mesma transação como `SUM(quantity - quantity_released)` das reservas
  vivas. Foi a escolha explícita para **não quebrar nenhum leitor existente**
  (ver lista de consumidores no handoff). Como é **recalculado** e não
  incrementado, o cache é auto-corrigível.
- [x] **Liberar e consumir passaram a operar sobre a reserva da própria OP.**
  `releaseMaterialsIfReserved` e `releaseReservationsForQuantity` (que
  reexplodiam a BOM para adivinhar o quanto liberar) e
  `releaseReservedQuantity` (o `MIN` sobre o contador global) foram
  substituídos por um único `releaseOwnReservations` →
  `InventoryService.releaseAllReservationsForOrder`. Efeito colateral bom: a
  liberação deixou de depender da BOM atual, então **alteração de engenharia
  entre a liberação e a conclusão não prende mais reserva**.
- [x] **Reserva anônima virou erro 400.** `inventoryService.reserve` e
  `releaseReservation` exigem `options.productionOrderId`.
- [x] **`RemoveProductionOrderUseCase` bloqueia remover OP com reserva ativa**
  (`BusinessRuleError`, regra `G3`), orientando a cancelar antes — o
  cancelamento devolve o material. Sem isso o `ON DELETE CASCADE` apagaria as
  reservas e deixaria o cache alto para sempre. (O vazamento já existia antes,
  em silêncio.)
- [x] **Backfill** `server/src/scripts/backfill/05_production_order_reservations.ts`
  — dry-run por padrão, `--apply` para gravar, idempotente, uma única
  transação. Reconstrói a reserva das OPs `released`/`in_progress`/`paused`
  pela explosão da BOM na quantidade planejada (que é exatamente o que a
  rotina de liberação fazia) e relata, sem inventar, o que não consegue
  reconstruir.
- [x] **Testes:** `tests/unit/production-order-material-reservation.test.ts`
  (17 casos, com dublê em memória dos models implementando a semântica real) e
  `tests/unit/inventory-service-contract.test.ts` (guarda do
  `module.exports` do serviço). Suíte unitária: **1430/1430** (baseline era
  1402/1402). `npm run typecheck` limpo e `npx tsx -e "require('./app')"`
  sobe sem erro.
- [x] **Mock incompleto encontrado e corrigido em 3 suítes existentes**
  (`production-order-lifecycle`, `production-labor-overhead-cost`,
  `warehouse-stock`): o mock de `inventoryService` não expunha a função nova,
  e o erro real (`is not a function`) era embrulhado por `completeOrder` em
  `ConflictError` — teste falhando/passando pelo motivo errado.

### Escopo declarado como fora

- [ ] **Vendas não entraram** — e não precisavam: venda **não reserva** estoque
  neste ERP (`CreateSaleUseCase`/`ChangeSaleStatusUseCase` chamam
  `InventoryService.consume`, baixa direta; `quote` não toca estoque).
  Se um dia expedição/venda precisar reservar, é migration própria
  (`production_order_id` nullable + `sale_id` + CHECK de exatamente-um-dono).
  Preferiu-se FK real e dura a par polimórfico sem integridade referencial.

### Riscos residuais

- [x] **Migration `20260809-000026` NÃO aplicada** (deliberado — aguarda *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  aprovação do dono). Enquanto não for aplicada, **o código novo não funciona
  contra o banco**: `reserve`/`releaseReservation` gravam em uma tabela que
  ainda não existe. Aplicar migration e rodar o backfill são um **único**
  passo operacional, nesta ordem.
- [ ] **Sem teste de integração contra Postgres real** do índice único
  parcial, dos 3 CHECKs, do `SELECT ... FOR UPDATE` e do backfill. Os testes
  unitários usam dublê em memória — a mesma limitação estrutural apontada no
  princípio 2 do plano de ação.
- [ ] **Cache inflado herdado bloqueia reserva nova até o backfill rodar**
  (há teste unitário provando o comportamento). É o motivo de a ordem
  migration → backfill não poder ser invertida nem adiada.
- [ ] **O backfill usa a BOM ATUAL.** Se a engenharia mudou a estrutura depois
  de a OP ter sido liberada, a reserva reconstruída difere da que foi feita de
  fato. Não existe histórico da explosão no banco; o script relata a
  divergência produto a produto em vez de inventar número.
- [ ] **Nenhuma tela em `client/`** expõe a reserva por OP (o endpoint de
  consulta é `inventoryService.listOrderReservations`, ainda sem rota HTTP) —
  escopo dos agentes de frontend.

---

## 2026-08-09 — Cadeia do produto, Onda 2: gaps G14 e G15 — `programador`

**Contexto:** `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`.
Fecham a Onda 2 junto com o G3 (`fed3129`).

### G14 — Importação (COMEX) entrava fora do padrão de rastreabilidade

**O problema (verificado no código, e declarado no próprio cabeçalho do
arquivo como limitação conhecida):** `ReceiveImportProcessUseCase` dava
entrada do material importado mexendo em `products.quantity` e no custo médio,
mas **sem criar lote, sem passar por quarentena e sem dual-write de
depósito** — as três coisas que `ReceivePurchaseItemsUseCase` faz. Na prática:
insumo importado entrava no estoque sem rastreabilidade por lote e sem gate de
qualidade, podendo ser consumido pela produção sem nunca ter sido liberado,
enquanto o mesmo insumo comprado no Brasil ficava retido em quarentena.

- [x] **Caminho único extraído**, não duplicado:
  `server/src/services/materialReceiptService.ts` →
  `receiveMaterialIntoQuarantine` executa os 4 passos na mesma transação
  (estoque → dual-write de depósito → lote nascendo em `quarantine` → custo
  real médio ponderado). `ReceivePurchaseItemsUseCase` passou a chamá-la
  **sem mudança de comportamento** (há teste-guarda de regressão), e a
  importação passou a usar exatamente a mesma função.
- [x] **Lote de importação**: `IMP-<ano>-XXXX-ITEM<id do item>-R001`,
  `supplier_id` do processo, `purchase_id` nulo, depósito `INSUMOS`,
  `received_at` = data do desembaraço, `status='quarantine'`. O par
  (processo, item) é único, então o número nunca colide com o índice único
  `(product_id, lot_number)` de `lot_controls`.
- [x] **Acesso ao lote por gateway injetado** (`findLotForReceipt`/`createLot`),
  método novo em `ComexRepository` + implementação Sequelize — mantém os dois
  módulos Clean Architecture e o serviço testável com repositório mockado,
  sem abrir uma segunda porta direta ao ORM.
- [x] **`reference_type`/`source_type` deixaram de mentir**: de `'purchase'`
  para `'import'`. O valor antigo era dado factualmente errado —
  `reference_id` aponta para `import_processes.id`, e a consulta reversa pelo
  índice `(reference_type, reference_id)` devolvia um **pedido de compra
  alheio** de id coincidente. Migration
  `20260809-000027-add-import-origin-to-inventory-and-cost-enums.cjs`
  (`ALTER TYPE ... ADD VALUE`, aditivo, fora de transação, `down` no-op).
  Sincronizado em `InventoryMovement`, `ProductCostLedger`, `costingService`,
  `InventoryMovementEntity.REFERENCE_TYPES` e no enum Zod de
  `inventoryValidators`.
- [x] **Testes:** 4 casos novos em `tests/unit/comex.test.ts` (lote em
  quarentena, dual-write, consolidação em lote existente, nada gravado quando
  o processo não está desembaraçado) + `tests/unit/material-receipt-quarantine.test.ts`
  (4 casos: os 4 passos na mesma transação, lote existente voltando a
  quarentena, gerador de número de lote e o guarda de regressão do lado de
  compras).
- [x] **Mock incompleto corrigido**: `tests/unit/comex.test.ts` não mockava
  `warehouseStockService` — sem isso o teste tentava abrir conexão real com o
  Postgres ao resolver o depósito.

### G15 — Estados mortos no ENUM da requisição de compra

**O problema:** `purchase_requisitions.status` tem `partial` e `received` no
ENUM e **nenhuma rotina jamais os atingia**. A requisição morria em `ordered`
e ninguém conseguia responder "esta requisição foi atendida?" — o elo final do
rastro requisição → pedido → recebimento → estoque ficava aberto.

- [x] **Decisão: acionar, não remover do ENUM.** O rastro
  requisição → pedido → recebimento é requisito de auditoria fiscal declarado
  (`CLAUDE.md` §7); sem esses estados, a única forma de saber se a requisição
  foi atendida é abrir cada pedido gerado, um a um.
- [x] **Gatilho no recebimento** (`ReceivePurchaseItemsUseCase`), que é o
  único ponto que sabe o que de fato chegou. Regra pura isolada em
  `modules/purchases/application/services/syncRequisitionReceiptStatus.ts`:
  `received` ⇔ todos os pedidos **ativos** da requisição `received` **e**
  nenhum item da requisição com saldo `pending`; `partial` ⇔ chegou algo mas
  não tudo; pedido `canceled` ignorado (senão a requisição nunca fecharia).
  **Recálculo total, nunca incremental** — o resultado não depende da ordem
  dos recebimentos.
- [x] **Requisição `approved` com saldo NÃO é tocada.** Foi a decisão mais
  importante: `approved` é o estado que autoriza cotar/converter o restante
  (`CreateRfqUseCase`/`AwardRfqUseCase` bloqueiam `partial`/`received` desde o
  G12). Empurrá-la para `partial` num recebimento parcial deixaria o saldo
  remanescente **impossível de comprar** — trocaria um estado morto por um
  travamento real de processo. Não abre buraco: quando o último saldo vira
  pedido ela passa a `ordered`, e o recebimento desse pedido fecha em
  `received`.
- [x] **Semântica honrada, sem colidir com o G12:** o ENUM espelha o de
  `purchase_orders`, onde `partial` = "parcialmente **recebido**" — que é
  exatamente o sentido usado aqui. O saldo de *compra* continua em
  `purchase_requisition_items.status`, onde o G12 o colocou.
- [x] **Lock pessimista na requisição** antes do recálculo, para dois
  recebimentos simultâneos de pedidos diferentes da mesma requisição não
  regredirem `received` para `partial`.
- [x] **`PATCH /:id/status` continua sem alcançar `ordered`/`partial`/
  `received`** — são fatos derivados, não declaráveis à mão (marcar
  "requisição atendida" sem nada ter chegado seria fraude de rastreabilidade).
  Tabela de "quem grava cada status" documentada no JSDoc do use case, na
  API.md §15 e no UC-23.
- [x] **`requisition_status` exposto na resposta** de
  `POST /api/purchases/:id/receive` (fora de `data`) e no log de auditoria.
- [x] **Testes:** `tests/unit/requisition-receipt-status.test.ts` (15 casos:
  11 da regra pura, incluindo todos os "não deve mexer", + 4 da integração no
  recebimento). `tests/unit/engineering-sample-requisition.test.ts` (o teste
  da "cadeia completa") passou a **provar a corrente fechando**: a requisição
  de amostra sai de `ordered` e chega em `received`.

### Validação

- [x] `npm run typecheck` limpo.
- [x] `npx jest tests/unit`: **1453/1453** (baseline era 1430/1430; +23 casos).
- [x] `npx tsx -e "require('./app')"` sobe.

### Pendências e riscos residuais

- [x] **Migration `20260809-000027` NÃO aplicada** (deliberado). O código já *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  grava `'import'` — sem a migration, o recebimento de importação falha com
  erro de ENUM inválido do Postgres (500). Aplicar na **mesma janela** da
  `20260809-000026` (G3), que está na mesma condição.
- [ ] **Movimentações/ledgers de importação gravados ANTES** continuam com
  `reference_type='purchase'`. Não há backfill automático possível (olhando
  só a linha, não dá para distinguir compra de importação); a correção é
  manual, cruzando `import_processes.received_at` com a `description` do
  movimento, que sempre cita `IMP-<ano>-XXXX`.
- [ ] **Requisições já em `ordered` cujos pedidos foram todos recebidos antes
  desta mudança continuam em `ordered`** — o gatilho é o recebimento, e ele já
  passou. Backfill não feito nesta entrega; se for necessário, o critério é
  exatamente o da regra pura `resolveRequisitionStatusAfterReceipt`.
- [ ] **AP dos tributos de importação NÃO implementada — ligada ao G13
  (Onda 3, decisão do dono).** O momento de reconhecimento do passivo vale
  para compra nacional e importação ao mesmo tempo; criar uma regra só para
  COMEX geraria um segundo padrão contábil no mesmo ERP. Some-se: os tributos
  têm fatos geradores e vencimentos distintos entre si, e `AccountPayable` não
  suporta moeda estrangeira. **O escopo do G13 no plano foi ampliado para
  registrar isso.**
- [ ] **Sem teste de integração contra Postgres real** do novo valor de ENUM,
  do lote de importação e do lock da requisição — mesma limitação estrutural
  do princípio 2 do plano (a suíte unitária usa repositório mockado).
- [ ] **Ordem de lock inversa entre recebimento e conversão** (recebimento:
  pedido → requisição; conversão: requisição → pedidos). Teoricamente sujeito
  a deadlock sob concorrência alta; o Postgres detecta e aborta uma das
  transações, e as duas operações são curtas. Registrado como risco conhecido.
- [ ] **`client/` não exibe** o status novo da requisição depois do
  recebimento nem o lote/quarentena do material importado (a tela de COMEX
  ainda não existe) — escopo dos agentes de frontend.

---

## 2026-08-10 — Validação ponta a ponta da cadeia do produto (teste de integração real)

Relatório completo: **`docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`**.
Artefato: `server/tests/integration/e2e-cadeia-insumo-produto.test.ts` (26 casos).

### O que foi provado

- [x] Corrente executada de verdade contra API + PostgreSQL rodando (sem mock):
  **8 das 10 estações fecham** (cadastro → requisição → pedido → recebimento com
  quarentena → liberação pela Qualidade → OP com reserva → conclusão com consumo
  por lote, custo real e reserva liberada → rastro lote-acabado→OP→lote-insumo).
- [x] **Os 8 gates pedidos foram provados fechados**: G2 (sem BOM ativa e
  quantidade zero), G3 (reserva por OP, sem canibalização), G8 (RNC automática),
  G12 (requisição não gera 2º pedido), G14 (importação em quarentena), G15
  (requisição chega a `received`), G16 (OP via MRP valida material).
- [x] Migrations `20260809-000026` e `20260809-000027` **aplicadas e exercitadas**
  em `erp_evok_audio_test` (pendência anterior deste TODO permanece para o banco
  de desenvolvimento/produção).

### Bugs NOVOS encontrados (nenhum estava nos 17 gaps)

- [ ] **BUG-01 (P0)** `POST /api/engineering/bom` responde **500 sempre** —
  `bill_of_material_items.parent_item_id`/`notes`/`alternative_product_id` são
  `NOT NULL` no banco e o model/`BomService` gravam `NULL`. **Não é possível
  cadastrar estrutura de produto pelo sistema.**
- [x] **BUG-02 (P0)** ✅ **FECHADO em 2026-08-10.** `POST /api/clients` respondia
  **500 sempre** — `clients.cnae` (entre outras) era `NOT NULL` e o schema Zod
  `.strict()` nem aceitava o campo. Fechado em duas metades:
  - **Schema** (`94e0f14` + migration `20260810-000028`): as colunas que o
    cadastro não preenche deixaram de ser `NOT NULL`; `phone`/`email`/`notes`
    continuam `NOT NULL DEFAULT ''` e o `CreateClientUseCase` passou a mandar
    `''` em vez do `null` que **anulava o `DEFAULT`**.
  - **Campo `cnae` exposto** (2026-08-10, decisão **D-I** do dono: *"sim, mas
    opcional"*): entrou em `createClientSchema`/`updateClientSchema`
    (`max(10)`, protege o `varchar(10)`), em `ClientEntity` (ausente ou em
    branco → `NULL`, nunca `''` — a coluna é nullable **sem** `DEFAULT`,
    conferido em `information_schema.columns`), no `CreateClientUseCase` e na
    allowlist do `UpdateClientUseCase`. **Não trava a criação** — não se aplica
    a pessoa física.
  - **Evidência de escrita real** (o aceite honesto do §6.5 da análise de
    classe de defeito, não dublê): `INSERT` no PostgreSQL **com** CNAE, **sem**
    CNAE e com CNAE em branco, mais releitura via `SELECT` e `UPDATE`
    preenchendo depois — 15/15 verificações verdes, tudo dentro de transação
    **revertida** (o banco tem dado real do dono; nenhum `DELETE` usado).
  - Cobertura permanente: `server/tests/unit/client-cnae-optional.test.ts`
    (16 testes), incluindo a regressão de que `phone`/`email`/`notes` seguem
    saindo como `''`. Contrato em `docs/arquitetura/API.md` §2.
- [ ] **BUG-03 (P0)** `POST /api/sales` responde **500 sempre** —
  `sales.nfe_number`/`nfe_key` são `NOT NULL` e só são preenchidos na emissão.
  **Nenhuma venda pode ser criada** (`sales` = 0 linhas).
- [ ] **BUG-04 (P0)** confirmar venda responde **500** —
  `accounts_receivable.payment_date` (+7 colunas) `NOT NULL` sem default.
  **Nenhuma conta a receber pode ser gerada.**
- [ ] **BUG-05 (P1)** trilha de auditoria perdida em silêncio: o enum
  `enum_audit_logs_action` tem 15 valores, o código usa 43 literais — **28 nunca
  gravam** (`convert`, `receive`, `release`, `update_status`, `approve` de
  requisição etc.). A requisição responde 200 e o log some.
- [ ] **Drift de schema (P1)** `erp_evok_audio_test` tem **29 colunas `NOT NULL` a
  mais** que `erp_evok_audio`, com as mesmas 150 migrations. **Nenhum dos dois
  bancos é reproduzível a partir das migrations** — bloqueador para provisionar o
  servidor de produção. Recriar o banco de teste só por migrations + teste de
  guarda comparando `information_schema` com os `allowNull` dos models.

### Observações menores

- [ ] `GET /api/inventory/lots?product_id=X` sem `status` assume `available`
  (compatibilidade retroativa) — lote em quarentena fica invisível; documentar na
  `API.md`.
- [ ] MRP planeja **apenas componentes**, nunca o item demandado — reforça o G17.
- [ ] `POST /api/comex/import-processes/:id/{tracking,receive}` respondem 201 e não
  200, diferente das demais transições de estado.
- [ ] Limpeza dos dados `E2E-*` criados na validação: script pronto na §8 do
  relatório (atenção ao recorte de data em `non_conformities` — existe NC real).

---

## 2026-08-10 — Auditoria de consistência tripla Documentação ↔ Banco ↔ Código (cadeia do produto) — `AuditorIntegrador`

Relatório completo: `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.
**Veredito: `[AUDITORIA-FALHOU]` — REPROVADO** (banco reprovado; código e documentação reprovados com ressalvas).
Auditoria feita em paralelo à validação E2E acima e **convergiu com ela de forma independente**: BUG-01/BUG-03 do E2E são o mesmo achado P0-05 desta auditoria.

### P0 — bloqueiam a cadeia do produto

- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] S-1 — "bomba de schema" do `allowNull` implícito, segunda rodada.**
  **Resolvido pela migration `20260810-000028`.** Medição em
  `information_schema.columns` (banco `erp_evok_audio`, 2026-08-12): as 14
  colunas citadas em `bill_of_material_items`, `inventory_counts` e
  `inventory_count_items` estão todas `is_nullable = YES`, e
  `inventory_movements.reference_id` também. As duas exceções são
  **deliberadas e documentadas no model**: `inventory_movements.description`
  e `reference_type` foram **mantidas `NOT NULL`** porque todos os pontos de
  INSERT vivos preenchem (o `createMovement` usa `data.description ?? ''`, e
  ajuste manual grava `reference_type='adjustment'`) — o defeito era o model
  TS declarar nullable o que o banco exigia, não o contrário. `src/models/InventoryMovement.ts`
  hoje declara os três com a nulabilidade real e explica cada decisão no
  `comment`. A guarda `schema-model-drift-guard` impede a reincidência.
  A migration `20260804-000012-fix-production-orders-nullable-columns.cjs` corrigiu
  isso **só para `production_orders`**. Continuava vivo em: `bill_of_material_items`
  (`parent_item_id`, `alternative_product_id`, `notes`), `inventory_counts`
  (`location`, `started_at`, `completed_at`, `approved_at`, `approved_by`, `notes`),
  `inventory_count_items` (`counted_quantity`, `variance_quantity`, `counted_by`,
  `counted_at`, `notes`), `inventory_movements` (`reference_id`, `reference_type`,
  `description`) e `sales` (`nfe_number`, `nfe_key`) — mais `clients` e
  `accounts_receivable` (BUG-02/BUG-04). Levantamento completo e provas de `INSERT`
  no §P0-05 do relatório. **Alinhar os models na mesma entrega**, senão o bootstrap
  canônico (`20260731-000001-baseline-schema.cjs:148`) recria o problema num banco
  novo. Responsável: `AdmDBA` + `programador`.
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] P0-01 — `InventoryService.adjust()` gravava `reference_id = NULL`
  em coluna `NOT NULL`.** **Resolvido pela migration `20260810-000028`**, que
  removeu o `NOT NULL` indevido: medido em 2026-08-12,
  `inventory_movements.reference_id` é `is_nullable = YES`. Ajuste manual,
  aprovação de contagem e scan mobile não têm documento de origem — exigir
  `reference_id` deles era o erro. Derrubava com 500: `POST /api/inventory/movements`,
  `POST /api/products/movements`, aprovação de contagem de inventário
  (`ApproveInventoryCountUseCase.ts:89`) e **todo o app mobile**
  (`ScanItemUseCase.ts:67`, `BatchScanUseCase.ts:72`). Evidência: 35 movimentações
  no banco, **nenhuma** com `reference_type='adjustment'`. Resolvido por S-1.
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] P0-02 — model `InventoryMovement` declarava `description`,
  `reference_id` e `reference_type` como opcionais; o banco exigia os três.**
  Por isso o P0-01 virava 500 de driver em vez de 422 didático.
  **Resolvido:** o model foi alinhado ao banco na mesma entrega da migration
  `20260810-000028` — `description` e `reference_type` `allowNull: false`
  (o banco continua exigindo, por decisão), `reference_id` `allowNull: true`
  (o `NOT NULL` foi removido do banco). Verificado em 2026-08-12 lendo
  `server/src/models/InventoryMovement.ts` contra `information_schema`.
- [ ] **[PENDENTE] Limpar o dado sujo do contorno BUG-01:** as 7 linhas de
  `bill_of_material_items` com `notes = 'Contorno BUG-01'` têm `parent_item_id`
  apontando para si mesmas e `alternative_product_id` igual ao próprio componente.
  Corrigir junto com S-1.

### P1 — inconsistências reais entre camadas

- [ ] **[PENDENTE] P1-03 — `inventoryService.ts:476,573` usam `'reservation'` e
  `'reservation_release'` como *fallback* de `reference_type`; nenhum dos dois existe
  no ENUM.** Hoje não explode porque o único chamador passa `'production'`
  explicitamente. Ver S-2 no relatório.
- [ ] **[PENDENTE] P1-04 — Facilities: `reference_type`/`reference_id` do consumo
  predial são descartados por `CreateInventoryMovementUseCase`, e os valores que ele
  tenta gravar (`facility_maintenance_ticket`, `facility_cleaning_execution`) não
  existem no ENUM.** JSDoc do adapter **já corrigido** nesta auditoria; falta a
  decisão de negócio (S-3).
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] P1-06 — 4 FKs `ON DELETE SET NULL` sobre colunas `NOT NULL`**
  (`bill_of_material_items.parent_item_id`/`alternative_product_id`,
  `inventory_counts.approved_by`, `inventory_count_items.counted_by`): o `DELETE` do
  pai falhava com erro de banco em vez de anular a referência.
  **Resolvido por S-1 / migration `20260810-000028`.** Medido em `pg_constraint`
  × `pg_attribute` em 2026-08-12: as 4 FKs seguem `ON DELETE SET NULL`
  (`confdeltype='n'`) e as 4 colunas agora são nulláveis (`attnotnull = f`) —
  a contradição sumiu. A guarda `schema-model-drift-guard` reprova se voltar.
- [ ] **[PENDENTE] P1-07 — FKs ausentes:** `purchase_receipts` **não tem nenhuma FK**
  (nem `purchase_id`, nem `received_by`) e `product_cost_ledgers.product_id` também
  não tem. Contradiz `CLAUDE.md` §7. Ver S-4.
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] P1-13 — fechar RNC gravava `closed_at`, coluna que não existe**
  (`UpdateNonConformityUseCase.ts:70`); a real é `closed_date`. O Sequelize descartava
  em silêncio ⇒ **toda RNC fechada ficava com `closed_date` nulo**.
  `CloseNonConformityUseCase.ts:26` não gravava nem `closed_by` nem `closed_date`.
  **Resolvido** (ver entrada "Tarefa 2 — `closed_at` × `closed_date` na RNC",
  mais abaixo neste arquivo): os dois caminhos passaram a derivar o
  encerramento da mesma função `nonConformities/domain/closure.ts`, que grava
  `closed_by` + `closed_date`; `closed_by` saiu de `ALLOWED_FIELDS` do `PUT`
  (vinha do body, permitia atribuir o encerramento a outra pessoa) e passa a
  vir só do JWT. Conferido em 2026-08-12: `non_conformities` tem
  `closed_date`/`closed_by` e **não** tem `closed_at`; o código grava os nomes
  certos; a guarda `column-name-drift-guard` cobre a reincidência. O JSDoc
  desatualizado em `client/src/api/nonConformities.ts` (que ainda dizia
  `closed_at`) foi corrigido nesta passagem — o tipo TS já estava certo.
- [ ] **[PENDENTE] P1-14 — duas BOMs paralelas sem sincronização:** produção/OP/custo
  leem `bill_of_material_items`; **MRP e a API de item leem `item_estruturas`**. Já
  divergem no banco. Como o G2 exige BOM ativa em `bill_of_material_items` para
  concluir OP, cadastrar estrutura pelo caminho novo **não destrava** a OP.
  Decisão do dono do produto. Responsável: `AnalistaNegocios` + `AdmDBA`.
- [ ] **[PENDENTE] P1-15 — `item_estruturas` tem dois interruptores de vigência**
  (`ativo BOOLEAN` e `status` ENUM) e o código só usa `ativo`; `status` nunca é lido
  nem escrito.

### P2 — documentação (a maior parte já corrigida nesta auditoria)

- [x] **[IMPLEMENTADO] P2-08** — `04-DICIONARIO_DADOS.md`: 22 seções da cadeia do
  produto regeneradas por introspecção real; `production_order_reservations` e
  `sale_invoices` adicionadas; `migracao_categoria_map` (tabela inexistente) marcada;
  cabeçalho e índice corrigidos.
- [ ] **[PENDENTE] P2-08 (resto)** — ~124 divergências de nulabilidade **fora** da
  cadeia do produto continuam no dicionário, e o índice cobre 81 de 195 tabelas.
  Exige regeneração completa (S-5), preferencialmente **depois** de S-1.
- [x] **[IMPLEMENTADO] P2-09** — corrigidas as afirmações de "migration não aplicada"
  em `00-INDICE.md` (banner global), `DATABASE.md` (G3, G14),
  `PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` (G3, G14) e `02-MODELO_LOGICO.md`.
- [ ] **[PENDENTE] P2-09 (resto)** — `docs/business/BLOCO_{1..6}_*_MODELO_DADOS.md` e
  as entradas de SST/TI/JUR/FAC/MKT/RH ainda dizem "não aplicadas". As 150 migrations
  **estão aplicadas**. Responsável: `documentador` / `AdmDBA`.
- [x] **[IMPLEMENTADO] P2-10** — banner "DDL de projeto, NÃO é o schema implementado"
  inserido nos 15 documentos departamentais em escopo, com o confronto exato contra o
  banco. **24 tabelas** documentadas em DDL MySQL não existem.
- [ ] **[PENDENTE] P2-10 (decisão)** — decidir quais desses 24 desenhos viram backlog
  real (ex.: `test_certificates`, `inspection_plans`, `shipping_orders`,
  `sales_commissions`) e quais devem ser removidos da documentação.
  Responsável: `AnalistaNegocios`.
- [x] **[IMPLEMENTADO] P2-11** — `02-MODELO_LOGICO.md` deixou de afirmar a FK
  inexistente `products → purchase_requisition_items.product_id` (a coluna real é
  `item_id UUID` para `items.id`).
- [x] **[IMPLEMENTADO] P2-12** — `API.md` deixou de afirmar que `reserved_quantity`
  "ainda não existe no schema".
- [ ] **[PENDENTE] S-5** — regenerar `docs/database/schema.sql` (`pg_dump`) e o
  dicionário inteiro contra `erp_evok_audio` depois de S-1. O `schema.sql` atual
  descreve `sales.nfe_number`/`status` como nullable — foi gerado de outro banco.

### Não coberto por esta auditoria (declarado, para não inflar o veredito)

- Suíte de testes não foi executada; conclusões de runtime vêm de leitura de código
  + prova SQL direta, corroboradas pelo E2E que rodava em paralelo.
- Tabelas fora da cadeia do produto (RH, SST, TI, Jurídico, Facilities, Marketing,
  Contabilidade/Tesouraria/Controladoria) não foram auditadas.
- `client/` não foi auditado nem tocado.
- `03-MODELO_FISICO.md`/`schema.sql` não foram regenerados (dependem de S-1).

---

## G11 — Alçada de aprovação de compra por origem (2026-08-10)

Decisão D-C do dono do produto
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4). Regra: nacional
até R$ 500.000 segue direto, acima exige a diretoria; **importação sempre
exige a diretoria**.

### Entregue

- [x] **Regra de negócio isolada** em `server/src/modules/purchases/domain/constants.ts`
  (`PURCHASE_APPROVAL_THRESHOLD_DIRECTOR`, `resolvePurchaseOrigin`,
  `requiredApproverRoles`, `purchaseApprovalValue`). Evidência: 4 testes de
  constante em `tests/unit/purchase-approval-authority.test.ts` (limite exato de
  R$ 500.000 passa; R$ 500.000,01 exige).
- [x] **Gate na aprovação do pedido** — `ChangePurchaseStatusUseCase` verifica a
  alçada ANTES de gravar `approved`; sem aprovação, 422 `details.rule='G11'` e
  nada é gravado (nem status, nem conta a pagar). Evidência: 8 testes do bloco
  "aprovação do pedido".
- [x] **Registro da aprovação** — `ApprovePurchaseUseCase` +
  `POST /api/purchases/:id/approve` (`authorizeModule('diretor')`),
  `approver_user_id` do JWT e `approver_role` do RBAC. Evidência: 6 testes.
- [x] **Leitura da situação sem efeito colateral** — `ListPurchaseApprovalsUseCase`
  + `GET /api/purchases/:id/approvals` (`compras` OU `diretor`), devolve
  `origin_source` explicando por que caiu na alçada. Evidência: 3 testes.
- [x] **Anti-burla** — origem escalation-only; `origin` não volta de `import` para
  `national`; `supplier_id`/`freight_value`/`origin` congelados após a aprovação;
  `suppliers.is_foreign` não pode ser desmarcado pela API. Evidência: 6 testes.
- [x] **Migration `20260810-000029-purchase-approval-authority-g11.cjs`** criada
  (`suppliers.is_foreign`, `purchase_orders.origin`, `purchase_order_approvals`),
  com `up`/`down` — ⚠️ **NÃO aplicada ao banco** (aplicação é do dono do ambiente).
- [x] `npm run typecheck` limpo; `npx jest tests/unit` **1480/1480**
  (baseline 1453 + 27 novos, nenhuma falha nova); `npx tsx -e "require('./app')"` sobe.

### Pendências e riscos residuais deste gap

- [x] **[PENDENTE] Aplicar a migration `20260810-000029`.** Enquanto não for *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  aplicada, `PUT /api/purchases/:id/status` para `approved` quebra em runtime
  (coluna `origin`/tabela de aprovações inexistentes) — o código já lê os dois.
  **Aplicar antes de subir este working tree.**
- [ ] **[PENDENTE] Marcar `is_foreign = true` nos fornecedores estrangeiros já
  cadastrados.** Nenhum dado atual permite inferir isso (o `cnpj` é obrigatório
  para todos), então todos nascem `false` pelo DEFAULT. Sem essa ação, um pedido
  de importação a fornecedor estrangeiro só cai na alçada se quem criou o pedido
  marcar `origin='import'`. Responsável: Suprimentos.
- [x] **[RESOLVIDO 2026-08-10 — decisão D-G do dono] Importação registrada no
  módulo COMEX ficava FORA da alçada.** `import_processes` não passa por
  `purchase_orders` e não tinha etapa de aprovação nenhuma, então os pedidos de
  ~R$ 1 milhão citados pelo dono passariam sem a diretoria. O dono decidiu: a
  diretoria aprova na transição `draft → shipped`, sem faixa de valor. Ver a
  seção **G11-COMEX** abaixo.
- [ ] **[PENDENTE] Sem segregação de função** (aprovador ≠ solicitante) — decisão
  explícita do dono, não é defeito. Abaixo de R$ 500.000 no nacional, quem solicita
  pode aprovar. Um usuário `admin` também satisfaz sozinho o papel `diretor`
  (curto-circuito padrão de `authorizeModule` em todo o projeto).
- [ ] **[PENDENTE] Teste de integração real (Postgres)** do fluxo
  create → approve → status=approved e da UNIQUE
  `uq_purchase_order_approvals_purchase_role` sob concorrência. A suíte unitária
  usa repositório mockado e não toca o banco.
- [ ] **[PENDENTE] Tela em `client/`** — os 2 endpoints novos ainda não têm UI
  (fora do escopo desta entrega, que é backend). Sem tela, a diretoria só aprova
  por API.
- [ ] **[PENDENTE] Alçada não alcança pedido criado por RFQ/conversão de
  requisição com origem correta:** `AwardRfqUseCase` e
  `ConvertRequisitionToPurchaseOrdersUseCase` criam o pedido sem informar
  `origin` (fica `national` pelo DEFAULT). Isso é seguro para fornecedor
  estrangeiro (`is_foreign` prevalece), mas **importação por conta e ordem** via
  trading nacional criada por esses caminhos nasce como nacional e precisa ser
  corrigida à mão (`PUT /api/purchases/:id` com `origin='import'`, permitido
  enquanto `pending`).

---

## G11-COMEX — Gate de aprovação da diretoria na importação (2026-08-10)

Decisão **D-G** do dono do produto, 2026-08-10 — fecha o furo deixado em
aberto pelo G11 (item marcado como resolvido acima). Regra: **a diretoria
aprova na transição `draft → shipped`**, antes de comprometer câmbio e
embarque; **sem faixa de valor** — importação é sempre da diretoria, coerente
com o G11.

### Entregue

- [x] **Regra de negócio isolada** em `server/src/modules/comex/domain/constants.ts`
  (`IMPORT_APPROVAL_RULE`, `IMPORT_APPROVAL_STATUS`, `IMPORT_APPROVAL_GATE_EVENT`,
  `MONETARY_FIELDS_FROZEN_ON_SHIPMENT`, `requiredImportApproverRoles`).
  Evidência: 3 testes de constante em `tests/unit/comex-directorate-approval.test.ts`.
- [x] **Gate no embarque** — `RegisterImportTrackingUseCase` verifica a alçada
  ANTES de gravar `shipped`; sem aprovação, 422 `details.rule='G11-COMEX'` e
  **nada** é gravado (nem status, nem recálculo de tributos dos itens).
  Evidência: 7 testes do bloco "gate no embarque", incluindo o que afirma
  `updateImportProcess`/`updateImportProcessItem` não chamados e o que garante
  que `arrived`/`customs_cleared` não consultam a alçada.
- [x] **Registro da aprovação** — `ApproveImportProcessUseCase` +
  `POST /api/comex/import-processes/:id/approve` (`authorizeModule('diretor')`),
  `approver_user_id` sempre do JWT e `approver_role` sempre do RBAC (nunca do
  body). Evidência: 7 testes, incluindo bloqueio de aprovação retroativa
  (processo já `shipped`/`cancelled`) e leitura com lock na transação.
- [x] **Leitura da situação sem efeito colateral** —
  `ListImportProcessApprovalsUseCase` +
  `GET /api/comex/import-processes/:id/approvals` (`comex` OU `diretor`),
  devolve `process_status`, `gate_event`, `can_register_approval`,
  `missing_roles`. Evidência: 4 testes.
- [x] **Anti-decoração do gate** — no evento `shipped`, os 4 campos monetários
  do cabeçalho (`exchange_rate`, `freight_value`, `insurance_value`,
  `other_expenses_value`) são rejeitados: `POST /:id/tracking` é o único
  caminho de escrita capaz de alterá-los (não existe `PUT /:id` no módulo),
  então sem isso daria para aprovar R$ 50 mil e embarcar R$ 1 milhão na mesma
  chamada. Evidência: 6 testes (4 parametrizados por campo + data/observação
  ainda aceitas + valores voltando a ser editáveis em `arrived`).
- [x] **Migration `20260810-000031-comex-directorate-approval-gate.cjs`** criada
  (`import_process_approvals`: FK CASCADE p/ processo, FK RESTRICT p/ `users`,
  ENUM(`diretor`), UNIQUE processo×papel, índice na FK), com `up`/`down` —
  ⚠️ **NÃO aplicada ao banco** (aplicação é do dono do ambiente).
- [x] `npm run typecheck` limpo; `npx jest tests/unit --maxWorkers=2`
  **1507/1507** (baseline 1480 + 27 novos, nenhuma falha nova);
  `npx tsx -e "require('./app')"` sobe.

### Pendências e riscos residuais deste gap

- [x] **[PENDENTE] Aplicar a migration `20260810-000031`.** Enquanto não for *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  aplicada, `POST /api/comex/import-processes/:id/tracking` com
  `event='shipped'` e as 2 rotas novas quebram em runtime (tabela inexistente).
  **Aplicar antes de subir este working tree** — junto com a `20260810-000029`
  do G11, que também está pendente.
- [ ] **[PENDENTE — comunicar ao COMEX] Sem grandfathering:** processos já em
  `draft` quando a migration subir passam a exigir a aprovação da diretoria
  para embarcar. Decisão consciente (o gate só protege se valer para o estoque
  de processos abertos). Processos já em `shipped` ou adiante não são afetados
  e **não** têm como receber aprovação retroativa.
- [ ] **[PENDENTE — validar com o dono] Corrigir câmbio/frete antes de embarcar
  exige cancelar e recriar o processo.** Consequência direta do congelamento:
  como o módulo nunca teve endpoint de edição (fornecedor e itens também são
  imutáveis desde a criação), a única saída é `POST /:id/cancel` + novo
  processo. Se o COMEX precisar ajustar câmbio no embarque com frequência, o
  dono precisa decidir entre (a) permitir a edição invalidando a aprovação, ou
  (b) criar um `PUT /:id` restrito a `draft` que zere as aprovações. **Nenhuma
  das duas foi inventada aqui.**
- [ ] **[PENDENTE] Sem segregação de função** (aprovador ≠ solicitante) — mesma
  decisão explícita do dono registrada no G11. Um usuário `admin` satisfaz
  sozinho o papel `diretor` (curto-circuito padrão de `authorizeModule`).
- [ ] **[PENDENTE] Teste de integração real (Postgres)** do fluxo
  create → approve → tracking(shipped) e da UNIQUE
  `uq_import_process_approvals_process_role` sob concorrência. A suíte unitária
  usa repositório mockado e não toca o banco.
- [ ] **[PENDENTE] Tela em `client/`** — o módulo COMEX inteiro ainda não tem
  UI (pendência anterior a esta entrega); os 2 endpoints novos entram na mesma
  fila. Sem tela, a diretoria só aprova por API.
- [ ] **[PENDENTE — decisão do dono] O gate não cobre o valor do que já
  embarcou.** Depois de `shipped`, `arrived`/`customs_cleared` continuam
  podendo elevar `other_expenses_value`/`freight_value` (despesas aduaneiras
  reais), sem novo aval. Isso é intencional — são custos posteriores ao
  compromisso —, mas significa que o custo final nacionalizado pode superar o
  valor visto pela diretoria. Se o dono quiser um segundo gate por variação
  percentual, é regra nova.

---

## G9 — Baixa de estoque da venda migra da confirmação para a NF-e (2026-08-10)

Onda 3 do `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`, decisão
**D-A** do dono ("seguir a lei nas 3 decisões com resposta normativa,
isoladas, uma por vez, com caminho de migração do dado existente").
Base normativa: **Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º** —
a NF-e é autorizada antes do fato gerador e a mercadoria só transita depois
da autorização de uso (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`).

### Regra nova

**Confirmar o pedido RESERVA. Autorizar a NF-e BAIXA.** A baixa é
proporcional à quantidade **desta emissão** — faturamento parcial de 10
unidades em 4 + 6 gera duas baixas (4 e 6), consumindo a reserva aos poucos.

- [x] `CreateSaleUseCase` (venda criada `confirmed`) — `consume` -> `reserve({ saleId })`
- [x] `ChangeSaleStatusUseCase` `quote -> confirmed` — `consume` -> `reserve({ saleId })`
- [x] `ChangeSaleStatusUseCase` `-> canceled` — libera toda a reserva
  (`releaseAllReservationsForSale`) e devolve ao estoque **apenas**
  `sale_items.invoiced_quantity`
- [x] `EditSaleItemsUseCase` (venda `confirmed`) — ajusta a **reserva** pelo
  delta; não toca mais em `products.quantity` nem em depósito
- [x] `services/saleStockService.ts` **(novo)** — `commitInvoicedStock`:
  libera a reserva no montante faturado -> `consume` -> debita ACABADOS
- [x] `IssueSaleNfeUseCase` (caminho síncrono) e `GetSaleNfeStatusUseCase`
  (caminho assíncrono/webhook) chamam a baixa **na mesma transação** que
  incrementa `invoiced_quantity`
- [x] `fiscalController` repassa o `userId` do JWT (autor do
  `InventoryMovement`); no webhook, sem usuário autenticado, assina o
  vendedor da venda (`Sale.user_id`, NOT NULL)
- [x] Dual-write de depósito ACABADOS migrado junto (reserva **não**
  movimenta depósito) — invariante `BUSINESS_RULES.md` §12 item 3 preservada

### Schema

- [x] **Migration `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs`**
  criada — generaliza `production_order_reservations` exatamente como o
  cabeçalho da migration do G3 previu: `production_order_id` vira nullable,
  entra `sale_id` (FK -> `sales`, `ON DELETE RESTRICT`), CHECK
  `chk_stock_reservations_exactly_one_owner`, índices únicos parciais por
  dono. ⚠️ **NÃO aplicada ao banco** (aplicação é do dono do ambiente).
- [x] Tabela **não** renomeada para `stock_reservations` — decisão
  consciente (renomear tabela num banco com drift é risco sem ganho
  funcional). Nome histórico documentado em `COMMENT ON TABLE`, no model e
  em `docs/database/04-DICIONARIO_DADOS.md`.

### Migração do dado existente

- [x] **Levantado por consulta ao banco real antes de codificar:**
  `SELECT status, COUNT(*) FROM sales GROUP BY status` -> **`confirmed: 1`**
  (nenhuma venda em `quote`/`partially_invoiced`/`invoiced`/`shipped`/
  `canceled`). Um único pedido no estado "já baixou e não faturou": venda
  **#10**, 1 unidade do produto **#25**, `invoiced_quantity = 0`, movimento
  de saída **#46**. **Confirma a decisão D-E do dono** ("entre confirmar e
  faturar passa o mesmo dia") — migração indolor, **nenhuma decisão
  adicional do dono foi necessária**.
- [x] Backfill escrito genérico (funciona para N pedidos): para cada item de
  venda `confirmed`/`partially_invoiced` com saldo não faturado, cria a
  reserva, **devolve** o saldo a `products.quantity`, devolve ao depósito
  ACABADOS, grava o `inventory_movements` de entrada e recalcula
  `products.reserved_quantity`. Vendas `invoiced`/`shipped` não são tocadas
  (efeito líquido idêntico entre a regra antiga e a nova).
- [x] `SELECT` do backfill validado em modo somente-leitura contra o banco
  real: devolve exatamente 1 linha (venda 10 × produto 25 × qty 1), e
  `product_warehouse_stock` de ACABADOS (9) bate com `products.quantity`
  (9) — os dois voltam para 10 juntos.

### Bomba desarmada de tabela (achado desta entrega)

- [x] **`inventory_movements.reference_type = 'reservation'` /
  `'reservation_release'` não existem no ENUM do Postgres.** O G3 gravava
  esses dois valores a cada `reserve`/`releaseReservation`; o ENUM real
  (verificado por `pg_enum` em 2026-08-10) é `sale, purchase, production,
  adjustment, transfer, sst_epi_delivery, import`. **Toda reserva real
  morria em 500** — invisível para `tsc` (campo tipado como `string`) e para
  a suíte (dublês em memória). Como o G9 faz a confirmação de pedido
  reservar, isso passaria a derrubar **toda venda confirmada**.
- [x] Correção escolhida: **parar de gravar o movimento**, não adicionar
  valores ao ENUM. `inventory_movements` documenta alteração de
  `products.quantity`; reserva não altera quantidade nenhuma — gravar
  `'adjustment'` de N unidades que não se moveram é o mesmo tipo de dado
  factualmente errado que a migration `20260809-000027` corrigiu. O rastro
  da reserva é a própria linha de `production_order_reservations`.
- [x] Guarda de regressão em `sale-stock-baixa-na-nfe-g9.test.ts`: confirmar
  pedido não gera movimento; a baixa gera movimento com `reference_type`
  pertencente à lista real do ENUM.

### Bug de tabela corrigido de carona

- [x] **Cancelar um orçamento (`quote`) criava estoque fantasma.** O ramo de
  cancelamento fazia `receive(item.quantity)` para todos os itens,
  independentemente do status de origem — mas um `quote` nunca tinha
  debitado nada. Com a regra nova (`quote` não tem reserva nem quantidade
  faturada), o cancelamento não movimenta estoque. Coberto por teste.

### Verificação

- [x] `npm run typecheck` limpo
- [x] `npx jest tests/unit --maxWorkers=2` -> **1533/1533**, 149 suítes, zero
  falhas (baseline 1507 desta mesma sessão — 1480 + 27 do G11-COMEX — mais
  26 testes novos/refeitos deste gap)
- [x] `npx tsx -e "require('./app')"` sobe

### Pendências e riscos residuais deste gap

- [x] **[PENDENTE — bloqueia o deploy] Aplicar a migration `20260810-000030`.** *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  O código do working tree já grava `sale_id`; com o schema antigo, confirmar
  pedido falha (coluna inexistente). Aplicar **antes** de subir o código,
  junto com `20260810-000029` (G11) e `20260810-000031` (G11-COMEX), que
  também estão pendentes.
- [ ] **[PENDENTE] Teste de integração real (Postgres)** do CHECK
  `chk_stock_reservations_exactly_one_owner`, dos dois índices únicos
  parciais novos, do backfill da migration e do fluxo
  confirmar -> faturar parcial -> faturar o restante -> cancelar. A suíte
  unitária usa dublê em memória e não exercita constraint nenhuma do banco.
- [ ] **[PENDENTE] Cancelar NF-e não devolve estoque.**
  `CancelSaleNfeUseCase` não reverte `invoiced_quantity` nem o consumo —
  comportamento **pré-existente**, mantido de propósito para as duas coisas
  seguirem coerentes (baixado == faturado). Hoje a devolução é manual
  (ajuste de estoque) ou pelo cancelamento da venda. Se o dono quiser
  reversão automática, é regra nova (e precisa decidir o que fazer com a
  reserva: recriar ou não).
- [ ] **[PENDENTE] Falha de baixa depois da autorização deixa a venda em
  `processing`.** Se o estoque não bastar no momento do faturamento (só
  possível em venda legada sem reserva ou após ajuste manual), a transação
  final volta atrás — a nota está autorizada no provedor e o registro local
  fica `nfe_status='processing'`. A recuperação existe e é documentada
  (`GET /api/sales/:id/nfe` reconsulta e reaplica, usando o snapshot já
  gravado em `sale_invoices`), mas não é automática.
- [ ] **[PENDENTE — frontend, fora do escopo deste agente] Telas de venda
  não explicam a reserva.** Entre confirmar e faturar, o produto agora
  aparece com `quantity` inalterada e `reserved_quantity` maior — quem olhar
  só o saldo bruto vai achar que a venda "não baixou". As telas de
  Vendas/Produtos/Estoque precisam exibir **disponível =
  `quantity - reserved_quantity`** e o motivo da reserva. Tarefa de
  `PromadorFonteEnd`.
- [ ] **[PENDENTE — operacional] `products.reserved_quantity` passa a somar
  reservas de venda além das de OP.** Semanticamente correto ("comprometido"),
  mas muda o número que MRP, dual-read de `Item.estoque_reservado` e as telas
  já liam. Vale um aviso ao PCP na virada.
- [ ] **[PENDENTE] Backfill do G3 (`05_production_order_reservations.ts`)
  continua sem rodar com `--apply`.** Não é deste gap, mas interage: OPs
  liberadas antes de 2026-08-09 seguem sem linha de reserva, então o cache
  `reserved_quantity` delas pode estar inflado sem lastro — e agora ele
  também limita o que a venda consegue reservar.

---

## 2026-08-10 — `AdmDBA`: drift schema × model, rodada 3 (P0, bloqueia o servidor de produção)

**Entrega:** migration `server/migrations/20260810-000033-fix-nullable-columns-round-3.cjs`
(**escrita, NÃO aplicada** — aplicar está bloqueado por permissão do ambiente),
7 models alinhados e a guarda `tests/integration/schema-model-drift-guard.test.ts`
corrigida. Racional completo em `docs/database/DATABASE.md`, seção "S-1 rodada 3".

Fecha o escopo que a rodada 2 (`20260810-000028`, commit `94e0f14`) deixou
declarado como pendente para `assets`/`employees`/`service_orders`/`maintenance_orders`.

Medição pela guarda contra o banco de dev: **65 → 1** divergência de
nulabilidade e **12 → 0** FKs `ON DELETE SET NULL` sobre coluna `NOT NULL`.

### O que foi feito

- [x] **59 colunas afrouxadas** (`DROP NOT NULL`) em `assets` (15),
  `employees` (18), `maintenance_orders` (14), `service_orders` (11) e
  `departments` (1) — todas com model + interface de atributos + semântica da
  FK já concordando que o valor é opcional. As 4 tabelas estão com **0 linhas**
  (evidência de que `POST /api/assets` e `POST /api/employees` nunca
  funcionaram: 500 em 100% dos casos).
- [x] **4 colunas NÃO afrouxadas — o model é que mentia.**
  `purchase_orders.order_date`, `maintenance_orders.report_date`,
  `service_orders.entry_date`, `bill_of_materials.revision_date` continuam
  `NOT NULL`; os models passaram a `allowNull: false` (o Sequelize já as
  preenche via `defaultValue: DataTypes.NOW`, aplicado no cliente).
- [x] Todos os models tocados passaram a declarar `allowNull` **explícito**
  (mesma convenção da rodada 2), para que o bootstrap produza este schema.

### Pendências abertas por esta entrega

- [ ] **Aplicar** `20260810-000033` (junto com `…-000030` a `…-000032`) e
  reexecutar `RUN_INTEGRATION=true npx jest tests/integration/schema-model-drift-guard.test.ts`
  — critério de aceite: 0 divergências. **Dono** (permissão de ambiente).
- [x] **`src/models/index.ts` — atributo-fantasma de FK.** ✅ **CORRIGIDO em
  2026-08-10** (agente com posse exclusiva de `models/index.ts`). As 4
  associações de `AccessProfile` passavam `foreignKey: 'access_profile_id'`
  (nome da **coluna**) enquanto os models `User`/`AccessProfilePermission`
  declaram o atributo como `accessProfileId` com `field:`; o Sequelize criava
  um **segundo** atributo homônimo da coluna, com `allowNull: true` no default,
  ao lado do `accessProfileId` declarado `allowNull: false`. Trocado para
  `foreignKey: 'accessProfileId'` nas 4 (`AccessProfile↔AccessProfilePermission`
  e `AccessProfile↔User`).
  - **Varredura, não amostragem:** scan de todos os models da instância
    agrupando atributos por coluna física — **2 grupos-fantasma no ERP inteiro
    (`User` e `AccessProfilePermission`), 0 depois da correção**. Não havia
    um quinto caso escondido.
  - **Efeito colateral real, verificado antes de mudar:** o atributo-fantasma
    aparecia no JSON serializado (`access_profile_id` **e** `accessProfileId`).
    Grep em `server/`, `client/`, `mobile/` e `tv/`: **nenhum consumidor lê a
    chave duplicada** — todos usam `accessProfileId`. `req.body.access_profile_id`
    (controller de users) é campo de *payload*, não de resposta, e não muda; o
    `group: ['access_profile_id']` de `SequelizeAccessProfilesRepository` é nome
    de **coluna** em SQL cru — SQL gerado e resultado conferidos idênticos
    contra o Postgres real, antes e depois.
  - **Guarda permanente:** `server/tests/unit/model-association-attribute-guard.test.ts`
    falha se qualquer model voltar a ter dois atributos na mesma coluna.
    `docs/arquitetura/API.md` §convenções de nomenclatura documenta a mudança
    de shape.
- [ ] **Banco reproduzível — a raiz ainda de pé (BLOQUEIA a compra do servidor).**
  `20260731-000001-baseline-schema.cjs` **não é DDL congelado**: gera as tabelas
  a partir dos models compilados em `dist/` em tempo de execução
  (`DYNAMIC_MODEL_FILES` → `createTableFromModel`). O schema que uma máquina
  nova produz depende de **quando** o bootstrap rodou — foi exatamente isso que
  fez dev e teste divergirem com as mesmas migrations (o mapeador só foi
  corrigido em `f9f03ea`, e bancos já criados caem no atalho
  `shouldBootstrapCanonicalSchema` e nunca são reparados). Plano de 4 passos em
  `docs/database/DATABASE.md`, §"Por que os dois bancos divergiram". Enquanto o
  passo 4 (provisionar banco descartável **só por migrations** e a guarda de
  drift passar contra ele) não for executado, **provisionar produção gera um
  terceiro schema**.

### Deliberadamente NÃO corrigido

- `production_order_reservations.production_order_id`: já tratado por
  `20260810-000030` (G9). Duplicar criaria conflito de ordem entre migrations.
- `access_profile_permissions.access_profile_id`: não é drift de schema (ver
  acima) — banco e model concordam; a guarda é que precisava ser corrigida.
  ✅ A associação foi corrigida em 2026-08-10 e o atributo-fantasma não existe
  mais; **nenhuma migration foi necessária**, exatamente como previsto aqui.
- Precisão de `assets.purchase_value`/`current_value` (`DECIMAL(10,2)`): fora
  do escopo de drift. Se valor de ativo deve migrar para `DECIMAL(18,6)` como
  os demais campos industriais, é **decisão de negócio/contábil do dono**.

---

## 2026-08-10 — Cadeia do produto, gap G5: API de Roteiro de Produção — `programador`

**Por que este gap veio antes do G4 (apontamento obrigatório).** O G4 é
exigência legal (Bloco K do SPED Fiscal — Ajuste SINIEF 2/09 cláusula 3ª §7º
III, com o §10 fechando a saída pelo Livro modelo 3;
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4).
Mas `production_routes` / `production_route_steps` **existiam, eram lidas pelo
custeio de mão de obra, pela carga-máquina e pelo OEE — e não tinham nenhum
endpoint**. Exigir apontamento sem poder cadastrar roteiro é regra inexequível:
o operador não teria contra o que apontar. **Escopo desta entrega é o G5
apenas — o apontamento continua NÃO obrigatório.**

**Entrega:** módulo `server/src/modules/production/` (arquivos
`*ProductionRoute*`, Clean Architecture: domínio puro → repositório como
interface → use cases sem Sequelize → controller fino), base URL
`/api/production/routes`, montada em `server/app.ts`.

### O que foi feito

- [x] **9 endpoints**: `GET /` (lista paginada + filtros), `GET /:id` (detalhe
  com etapas e totais derivados), `POST /` (cria rascunho, com etapas
  opcionais), `PUT /:id` (cabeçalho), `PUT /:id/steps` (substituição total das
  etapas), `PATCH /:id/activate`, `PATCH /:id/inactivate`,
  `POST /:id/revise` (nova revisão), `DELETE /:id` (só rascunho nunca usado).
  Contrato em `docs/arquitetura/API.md` §33.
- [x] **Ciclo de vida com imutabilidade** — `draft` editável; `active`
  **congelado**; `inactive` reversível; `superseded` final (automático quando
  uma revisão mais nova é liberada). Alterar roteiro liberado só por
  `POST /:id/revise`. **Efeito nas OPs já abertas: nenhum** — a revisão
  anterior sobrevive com as etapas intactas, sustentando os apontamentos já
  feitos e o custeio da OP em curso.
- [x] **Regras de sequência**: `sequence` obrigatoriamente **1..N contígua**,
  sem buraco (`G5-SEQ-GAP`) e sem duplicidade (`G5-SEQ-DUP`); `step_code` único
  no roteiro (`G5-STEP-CODE-DUP`); roteiro sem etapa não é liberável
  (`G5-SEQ-EMPTY`).
- [x] **Vínculo com centro de trabalho** validado em UMA consulta (sem N+1):
  `work_center_id` opcional, mas quando informado precisa existir
  (`G5-WC-NOT-FOUND`) e estar ativo (`G5-WC-INACTIVE`) — **revalidado também na
  liberação**, porque um centro pode ser desativado entre o rascunho e a
  ativação e roteiro ativo apontando para centro morto zera o custo de mão de
  obra sem avisar. O campo legado `work_center` (texto) é preenchido
  automaticamente com o `code` do centro.
- [x] **Guarda de histórico** (`G5-ROUTE-IN-USE`): etapa já referenciada por
  `production_order_tracking.production_route_step_id` não pode ser apagada nem
  reescrita — apagá-la zeraria o vínculo do apontamento com a operação, e com
  ele o custeio daquela OP.
- [x] **Anti-spoofing P0**: `created_by` e `approved_by` vêm **sempre** de
  `req.user.id`; os schemas Zod são `.strict()` e sequer aceitam esses campos.
- [x] **RBAC**: leitura `authorizeModule('producao')`; escrita de rascunho
  `('producao','operate')`; **liberar/aposentar** `('producao','approve')` —
  liberar roteiro é ato de aprovação (o model já tinha
  `approved_by`/`approved_at`), mesmo critério de `contabilidade`
  (`post`/`reverse`) e `tesouraria` (`settle`/`cancel`).
- [x] **Migration `20260810-000034-production-route-active-unique-g5.cjs`
  (escrita, NÃO aplicada)** — índice único **parcial**
  `uq_production_routes_active_per_product` (1 roteiro `active` por produto) +
  `COMMENT ON COLUMN`. Nenhuma tabela ou coluna criada/alterada. Racional em
  `docs/database/DATABASE.md`, seção "G5".
- [x] **Bug latente corrigido junto**:
  `SequelizeWorkCenterRepository.aggregateLoadByWorkCenter` somava **todas** as
  revisões de roteiro do produto — inofensivo com a tabela vazia, passaria a
  **dobrar a carga-máquina** na primeira revisão criada pela nova API. Agora
  filtra `pr.status = 'active'`.
- [x] **43 testes** em `server/tests/unit/production-routes.test.ts`, todo teste
  de erro afirmando `details.rule`.

### Decisões que precisam de confirmação do dono (não inventadas, mas discutíveis)

- [ ] **`sequence` contígua 1..N × numeração de 10 em 10.**
  `docs/producao/04-ROTEIROS.md` documenta as operações do chão de fábrica como
  "OP 10, OP 20, OP 30..." (prática que deixa espaço para inserir etapa no
  meio). A API separa: `sequence` é o **ordinal** 1..N (é por ele que o
  apontamento casa com a etapa, sem tabela de-para) e o número de operação vai
  no `step_code` (texto livre). **Confirmar com o PCP** que isso atende — o
  custo é ter de renumerar em rascunho para inserir uma operação no meio.
- [ ] **OP não é amarrada a uma revisão de roteiro.** `production_orders` não
  tem `production_route_id`; relatórios derivados usam sempre a revisão **ativa
  no momento da consulta**. Amarrar a OP à revisão vigente na liberação é
  decisão de negócio (e coluna nova) — **fora do escopo do G5**, mas é
  pré-requisito honesto do G4 se o Fisco exigir reconstituir o processo
  exatamente como executado.
- [ ] **`total_standard_time_minutes` não inclui setup.** Tempo padrão é por
  **unidade**; setup é por **lote**. Somá-los distorceria o OEE (mesma convenção
  de `GetOeeReportUseCase`). O total de setup é devolvido como campo derivado no
  detalhe (`total_setup_time_minutes`), não persistido.

### Pendências abertas por esta entrega

- [ ] **Aplicar `20260810-000034`** (junto com as demais migrations não
  aplicadas de 2026-08-10). ⚠️ Se o banco já tiver 2+ roteiros `active` para o
  mesmo produto, a criação do índice falha — a consulta de diagnóstico está no
  rodapé do arquivo de migration. **Dono** (permissão de ambiente).
- [ ] **Teste de integração real (Postgres)** do ciclo
  create → steps → activate → revise → activate, verificando que o índice
  parcial e o `superseded` automático concordam sob concorrência (2 ativações
  simultâneas do mesmo produto).
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] Tela web** do roteiro
  em `client/`. **Existe:** `client/src/pages/production/ProductionRoutesPage.tsx`
  (+ `RouteStepsEditor.tsx`, `productionRouteShared.ts` e teste
  `ProductionRoutesPage.test.tsx`), entregue no commit `b52470d`. O PCP não
  depende mais de chamada HTTP direta.
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] G4 (apontamento obrigatório)**
  — **entregue em `b954fa5`**. Concluir OP sem apontamento passou a falhar
  (obrigação do SPED Bloco K, Ajuste SINIEF 2/09 cl. 3ª §7º III — ver
  `docs/tributario/04-BLOCO_K.md`). O par G5 (roteiro com API + tela) + G4
  destravou o G6, fechado em 2026-08-10.

---

## 2026-08-10 — Cadeia do produto, gap G7: inspeção de qualidade como entidade + gate de liberação de lote — `programador`

**Decisão de negócio:** D-H do dono, 2026-08-10 — a empresa pretende se
certificar ISO 9001, então o registro de inspeção nasce no formato que a norma
pede (§8.6 evidência do critério de aceitação + rastreabilidade de quem
autorizou; §8.7 controle de saída não conforme), **sem** travar a operação com
burocracia que ninguém ainda executa
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).

### O problema (confirmado no código, não assumido)

- [x] **A inspeção não existia como entidade.** Liberar um lote da quarentena
  era `POST /api/inventory/lots/:id/release` gravando **apenas
  `lot_controls.notes`** (texto livre). Nenhum inspetor identificado, nenhum
  critério, nenhum resultado. As únicas tabelas "inspeção" do ERP
  (`sst_inspecoes_seguranca`/`sst_inspecao_itens`) são de SST e não têm
  relação com lote.
- [x] **Achado colateral CONFIRMADO: a quarentena era decorativa.**
  `materialReceiptService.receiveMaterialIntoQuarantine` chama
  `InventoryService.receive` (incrementa `products.quantity`) e só então cria
  o lote em `quarantine`. Os dois leitores de planejamento usavam esse saldo
  bruto: `SequelizeItemRepository.listMrpInventoryPositions`
  (`estoque_atual = products.quantity`) e `BomService.explodeBOM`
  (`stock_available = products.quantity`, base de `checkAvailability`, usada
  na criação/conversão de OP). Material não inspecionado contava como
  disponível → **MRP comprava de menos** e a OP era aprovada contra material
  que o FEFO (só consome lote `available`) nunca conseguiria consumir.

### O que foi implementado

- [x] **Migration `20260810-000032-create-quality-inspections-g7.cjs`
  (escrita, NÃO aplicada)** — tabela `quality_inspections` (lote, estágio,
  critério de aceitação, plano/tamanhos de amostra, defeitos, veredito,
  justificativa de concessão, RNC, inspetor, data) + 3 colunas nullable em
  `lot_controls` (`release_inspection_id`, `released_by`, `released_at`).
  `up`/`down` exercitados contra `queryInterface` falso; sem `comment:` em
  `addColumn`. Racional completo em `docs/database/DATABASE.md` §G7.
- [x] **Model `QualityInspection`** + 3 campos novos em `LotControl`.
- [x] **Módulo novo `server/src/modules/quality/`** (Clean Architecture):
  `domain/constants.ts` (regra pura `decideLotRelease`),
  `QualityRepository` + `SequelizeQualityRepository`,
  `CreateQualityInspectionUseCase`, `ListQualityInspectionsUseCase`,
  `GetLotReleaseEligibilityUseCase`, controller, rotas.
- [x] **3 endpoints novos:** `POST /api/quality/inspections`,
  `GET /api/quality/inspections`,
  `GET /api/quality/lots/:lotId/release-eligibility` (leitura pura, sem efeito
  colateral — mesmo padrão do endpoint de leitura de alçada do G11).
- [x] **`ReleaseLotUseCase` passou a exigir inspeção aprovada.** O gateway de
  qualidade é **parâmetro obrigatório** do construtor de propósito: opcional
  criaria um caminho silencioso em que o gate não roda. A verificação acontece
  integralmente **antes** do único `update` — teste explícito de que **nada é
  gravado** quando recusa.
- [x] **Regra é "a inspeção MAIS RECENTE"**, não "existe alguma aprovada" —
  senão um lote aprovado na entrada e reprovado depois continuaria liberável
  para sempre (§8.7). Re-inspeção após retrabalho é o mecanismo de reabertura.
- [x] **Anti-spoofing:** `inspector_id` e `released_by` vêm sempre de
  `req.user.id`; teste envia `inspector_id` no body e prova que é ignorado.
- [x] **Integrou G8/G10 em vez de reinventar:** `verdict = 'rejected'` delega a
  `CreateNonConformityUseCase` (que já abre a RNC, bloqueia o lote, herda o
  fornecedor e recalcula `quality_score`), e guarda `non_conformity_id`.
- [x] **Quarentena deixou de ser decorativa** —
  `server/src/services/quarantineBalanceService.ts` (novo): o planejamento
  desconta `SUM(quantity_available)` dos lotes `quarantine`/`blocked`, sempre
  `max(0, físico − retido)`. Ligado em `listMrpInventoryPositions` e em
  `explodeBOM`. **`services/inventoryService.ts` NÃO foi tocado** (está sob
  refatoração concorrente G3/G9) — a correção é toda do lado da leitura.
- [x] **36 testes novos** (`quality-inspection-release-gate.test.ts` 24 +
  `quarantine-blocks-planning-balance.test.ts` 12), todo teste de erro
  afirmando `details.rule = 'G7'`. Um deles achou um defeito real durante a
  implementação: `Number(null) === 0` fazia um `null` na lista virar
  `product_id = 0` no `WHERE` — corrigido.

### Verificado

- [x] `npm run typecheck` limpo
- [x] `npx jest tests/unit --maxWorkers=2` → **152 suites / 1615 testes**
  (baseline medida antes de começar: 149 / 1533)
- [x] `npx tsx -e "require('./app')"` sobe (exit 0)
- [x] `up`/`down` da migration exercitados contra `queryInterface` falso

### Testes existentes ajustados (e por quê)

- [x] `quality-lot-lifecycle.test.ts` e `warehouse-invariants.test.ts` —
  codificavam a liberação **sem** inspeção (o comportamento que o G7 fecha).
  Passaram a informar explicitamente uma inspeção aprovada, para continuarem
  medindo o que existiam para medir (máquina de estados do lote e invariante
  de depósito). O gate em si tem suite própria.
- [x] `item-repository-live-inventory.test.ts` — fixtures de `Product` sem
  `id` (agora necessário para casar o lote) e novos campos de diagnóstico.
- [x] `module-authorization-map.test.ts` — registro do módulo novo `quality`.

### ⚠️ Pendências abertas por esta entrega

- [ ] **Aplicar `20260810-000032`** (junto com as demais migrations não
  aplicadas de 2026-08-10). **Enquanto não for aplicada, o código não roda**:
  os models já declaram `quality_inspections` e as 3 colunas de
  `lot_controls`, então qualquer `SELECT` em lote quebra. **Dono** (permissão
  de ambiente). Mesma situação já registrada para `20260810-000029` (G11).
  - **Confirmado empiricamente em 2026-08-10** contra o banco de dev:
    `LotControl.findAll({ limit: 1 })` — **sem nenhum `include`** — já falha com
    `column "release_inspection_id" does not exist`, e
    `information_schema.columns` não tem nenhuma das 3 colunas em
    `lot_controls`. Ou seja, **hoje toda leitura de lote no dev está quebrada**,
    não só as consultas novas de inspeção. É drift model→banco pré-existente
    (o model foi entregue adiantado em relação à migration), **não** efeito do
    registro das associações — verificado revertendo `models/index.ts`, o erro
    é idêntico.
- [x] **Registrar `QualityInspection` em `server/src/models/index.ts`** e criar
  as associações. ✅ **FEITO em 2026-08-10** pelo agente com posse exclusiva do
  arquivo. Import + export no barrel e **9 associações** (o dobro do previsto,
  porque o desenho real da migration `20260810-000032` tem 4 FKs, não 3 —
  `lot_controls.release_inspection_id` e `.released_by` também precisavam de
  lado):
  - `QualityInspection`: `lot` (→`LotControl`), `inspector` (→`User`),
    `nonConformity` (→`NonConformity`), `released_lots` (→`LotControl`);
  - lado inverso: `LotControl.inspections`, `LotControl.releaseInspection`,
    `LotControl.releasedBy`, `User.quality_inspections`,
    `NonConformity.quality_inspections`.
  - **Verificação:** boot da app OK (erro de associação mata o boot); SQL do
    `findAll` com os 3 `include` gerado e enviado ao PostgreSQL real, com os
    nomes de coluna batendo 1:1 com a migration — o único erro devolvido é o
    esperado `relation "quality_inspections" does not exist`, porque a
    migration segue pendente. Cobertura em
    `server/tests/unit/model-association-attribute-guard.test.ts`.
  - ⚠️ **O payload das respostas não mudou**: o registro *habilita* o `include`,
    nenhuma consulta do módulo `quality/` passou a usá-lo (o módulo é de outro
    agente nesta rodada). A listagem continua devolvendo `lot_id`/`inspector_id`
    crus — usar os aliases é trabalho de quem tocar `modules/quality/`.
- [ ] **Impacto operacional no dia da aplicação:** os **9 lotes em quarentena
  (281 un.) e 1 bloqueado (100 un.)** hoje no banco de dev passam a exigir
  inspeção registrada para serem liberados. **Não há backfill** — inventar
  inspeção retroativa seria fabricar evidência de auditoria. A Qualidade
  precisa registrar a inspeção desses lotes na virada.
- [ ] **Teste de integração real (Postgres)** do ciclo
  recebimento → quarentena → inspeção → liberação, e do desconto de saldo
  retido no MRP. A suíte unitária usa repositório mockado e **não pega** erro
  de enum/coluna.
- [ ] **Tela web** em `client/`: registrar inspeção e mostrar o motivo do
  bloqueio na tela de lotes em quarentena. Sem ela, o botão "Liberar" passa a
  falhar com 422 e o usuário não saberá o que fazer — o endpoint
  `GET /api/quality/lots/:lotId/release-eligibility` existe exatamente para
  alimentar essa tela. **Escopo de `PromadorFonteEnd`.**
- [ ] **Risco residual herdado (não introduzido aqui):** na reprovação, a RNC
  nasce em transação PRÓPRIA depois do commit da inspeção
  (`CreateNonConformityUseCase` abre a sua). Se ela falhar, fica uma inspeção
  reprovada sem RNC e a resposta é 500 — a falha é **conservadora** (reprovada
  continua reprovada, o gate não abre). Idêntico ao já registrado em
  `CreateAcousticTestUseCase` (G8); fechar exige aquele caso de uso aceitar
  transação externa, o que afeta todos os seus chamadores.
- [ ] **`inspection_number` usa `INSP-<timestamp>`**, mesma convenção de
  `NC-<timestamp>` já em uso. Colisão sob concorrência no mesmo milissegundo é
  teoricamente possível (o UNIQUE do banco a detectaria como 500). Trocar por
  sequência anual com advisory lock (padrão do G16) é melhoria, não bug ativo.

### Decisão de negócio NÃO tomada — não inventei a regra

- [ ] **Nível de inspeção e AQL por classe de defeito (ISO 2859-1).** A norma
  fornece as tabelas; a escolha dos números é da Engenharia da Qualidade /
  contrato. A pesquisa normativa marca os valores de AQL como
  `[NÃO CONFIRMADO NA FONTE]` e registra que `ABNT NBR 5426:1985` está
  **cancelada**. Por isso `sampling_plan`/`lot_size`/`sample_size` são
  evidência textual **sem efeito de cálculo**, e **não há motor Ac/Re nem
  comutação de regime (normal/severo/atenuado)**. Pendente do dono:
  (1) aquisição da ISO 2859-1 vigente; (2) definição dos níveis/AQL por classe;
  (3) se há contrato OEM com plano de amostragem próprio.
- [ ] **Inspeção sem lote não é suportada** (`lot_id` é `NOT NULL`). Se a
  Qualidade precisar inspecionar algo que não tem lote (ex.: inspeção de
  processo sem material rastreável), é decisão de modelagem nova — não assumi.

---

## 2026-08-10 — Cadeia do produto, gap G1: estrutura de produto (BOM) passa a ter fonte única — `AdmDBA`

### O problema (confirmado no banco e no código, não assumido)

O ERP mantinha **duas árvores de produto paralelas**, com mestres e chaves
diferentes, e **nada reconciliava as duas**:

| Estrutura | Mestre | Chave | Quem lia |
|---|---|---|---|
| `item_estruturas` | `items` | UUID | MRP (`SequelizeMrpRepository.listActiveEdges`), explosão de item |
| `bill_of_materials` | `products` | INTEGER | `BomService` → criação, liberação (reserva), **conclusão** (consumo + custeio) da OP |

A única ponte era casamento de string (`products.code = items.codigo`), nunca
exercida para estrutura. **Planejamento e consumo podiam discordar sobre o que
compõe um produto sem nada acusar.**

### O que o banco disse antes de eu agir (somente leitura)

O dono informou (D-B) que ninguém mantinha nenhuma das duas. **Confirmado:**

- `item_estruturas`: **4 linhas**, 100% resíduo de teste (`PA-TESTE-001`, `E2E-*`)
- `bill_of_materials`: **2 linhas** — uma de CI **sem nenhum item** (cabeçalho
  órfão, `total_components = 1`) e uma de e2e de hoje
- `bill_of_material_items`: **2 linhas**, ambas da mesma BOM e2e

**Zero engenharia real.** Risco rebaixado de "migração de base viva" para
**escolha técnica** — foi isso que autorizou converter agora.

Achado colateral que fecha a decisão: **`items.estoque_atual` é `0.000000` em
100% das 17 linhas**, enquanto `products.quantity` carrega os saldos reais. O
mestre da árvore "canônica" não é sistema de registro de nada transacional — o
próprio MRP já o abandonava para ler número
(`listMrpInventoryPositions` faz o crosswalk para `products`).

### Decisão: `bill_of_materials` sobrevive

Argumentada com o código em `docs/producao/06-BOM.md` §G1 e no cabeçalho de
`server/src/services/bomStructureProjection.ts`. Resumo: é a estrutura que
governa dinheiro e estoque (e desde o **G2** é obrigatória para concluir OP);
sua chave é a de `inventory_movements`/`lot_controls`/`stock_reservations`/
`production_orders`; e já tem o vocabulário de revisão que a ISO 9001 §8.5.6
exige — o mesmo que o **G5** exercitou em roteiro.

> `CLAUDE.md` §7 ("Item core intocado + extensões por domínio") **segue
> valendo para cadastro** (código, descrição, tipo, custo padrão, catálogo
> item×fornecedor, requisição, RFQ). Muda só a **estrutura**: ela não é
> extensão de cadastro, é regra de consumo e de custo.

### O que foi feito (convergência incremental, sem big-bang)

**Nenhuma linha copiada, migrada ou apagada.** A convergência é de **leitura**:

- **`server/src/services/bomStructureProjection.ts` (novo)** — projeta a BOM
  ativa para arestas em UUID via o crosswalk que o resto do ERP já usa.
  Projeção feita na hora ⇒ **não existe réplica para dessincronizar**
- `SequelizeMrpRepository.listActiveEdges` → lê a projeção; novo
  `listStructureGaps()` expõe as arestas invisíveis ao MRP
- `SequelizeItemEstruturaRepository` → todas as leituras pela projeção;
  `create()` bloqueado
- `CreateItemStructureUseCase` → `POST /api/items/:id/estrutura` responde
  **422 `G1-ESTRUTURA-DUPLA`**
- `UpdateBOMUseCase`/`ApproveBOMUseCase`/`BomService.createBOM` → ciclo de
  revisão ISO (tabela de regras em `docs/producao/06-BOM.md` §G1)
- Migration **`20260810-000035-bom-single-source-g1.cjs`** — índice único
  parcial `uq_bill_of_materials_active_per_product` + `COMMENT ON` marcando
  `item_estruturas` como legado congelado

### Bugs latentes corrigidos de carona

- [x] **`superseded` rodava FORA da transação de `createBOM`**, antes dela. Se
  a criação falhasse depois, o produto ficava com **zero BOM ativa** — e, desde
  o G2, produto sem BOM ativa **não conclui OP**. Um cadastro malsucedido
  derrubava a produção de um produto que estava funcionando.
- [x] **Guarda de inativação de item estava cego para a BOM de produção.**
  `hasActiveParentOrComponent` olhava só `item_estruturas` (vazia): dava para
  inativar um item que é componente de uma BOM ativa, e a OP só descobria na
  conclusão.
- [x] **`PUT /api/engineering/bom/:id` era `UPDATE` cru** — dava para ativar
  uma **segunda** BOM do mesmo produto. Com duas ativas,
  `findOne({ status: 'active' })` devolve revisão **arbitrária**: o G1
  renascendo por dentro do próprio módulo de BOM.

### Verificado por fora

- `npm run typecheck` limpo
- **31 testes novos** em 3 suítes, incluindo o teste de que **planejamento e
  consumo leem a mesma estrutura** (mesma SQL, mesmo `bom_id`, mesmo
  `product_id`); todo teste de erro afirma `details.rule`
- `npx tsx -e "require('./app')"` sobe
- **SQL da projeção executada contra o Postgres real** (leitura) — e ela já
  revelou uma lacuna de catálogo no dado de dev, ver abaixo
- **`up`/`down` da migration exercitados contra o Postgres real dentro de
  `BEGIN … ROLLBACK`** (banco byte-idêntico): índice criado → presente →
  removido → ausente; os 4 `COMMENT ON` aplicados e zerados

⚠️ **Suíte unitária completa:** 1646 testes / 155 suítes. **17 falhas em 9
suítes** — todas em `sales/`, `purchases/`, `fiscal/` e
`saleReceivableService`, módulos **sob trabalho concorrente de outro agente**,
nenhum deles tocado por esta entrega (rastro das falhas confirmado:
`IssueSaleNfeUseCase`, `SequelizeFiscalRepository`,
`ReceivePurchaseItemsUseCase`, `saleReceivableService`). Excluindo essas
suítes: **148/148 verdes**. Baseline de entrada era 1615/1615 em 152 suítes;
1615 + 31 = 1646, ou seja **nenhum teste foi perdido por esta entrega**.

### ⚠️ Pendências abertas por esta entrega

- [x] **MIGRATION NÃO APLICADA** — `20260810-000035`. Passam a ser **7** *(✔ aplicada — conferido contra `SequelizeMeta` em 2026-08-10 pela guarda `docs-reality-drift-guard`)*
  pendentes (000029 a 000035) aguardando liberação do dono.
- [ ] **Tela `ItemMasterDetailPage` (`client/`) continua oferecendo o cadastro
  de estrutura** que agora responde 422. O erro é didático e o frontend já
  traduz `details`, mas a aba deveria apontar para o módulo de BOM em vez de
  oferecer um formulário que não grava mais. **Não toquei em `client/` —
  trabalho em voo.** Handoff registrado.
- [ ] **Lacuna de catálogo já existente no dado de dev:** o componente
  `E2E-MP2-1786338099090` (produto 18) está numa BOM ativa e **não tem
  `items.codigo`** — invisível para o MRP, visível para a produção. Agora é
  reportado por `MrpRepository.listStructureGaps()`, mas **não há endpoint nem
  tela expondo isso**. Enquanto não houver, a lacuna só aparece para quem
  chamar o repositório.
- [ ] **`listStructureGaps` sem rota.** Decidi não criar endpoint novo nesta
  rodada para não ampliar superfície no meio de trabalho concorrente; o método
  existe e está testado.
- [ ] **Teste de integração real (Postgres) do fluxo convergido** —
  criar BOM → gerar plano MRP → liberar OP → concluir, provando que os três
  leem a mesma revisão. A suíte de integração continua pulando em silêncio
  (`RUN_INTEGRATION`), ver
  `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md` §1.
- [ ] **`item_estruturas` não foi dropada** — de propósito. `DROP TABLE` é
  passo de **contração** e só deve acontecer depois da baseline congelada de
  schema; sem ela o `DROP` sai diferente em cada banco divergente.

### Decisão de negócio NÃO tomada — não inventei a regra

- [ ] **`production_orders.bom_id` — amarrar a OP à revisão de BOM que ela
  executou.** Hoje a conclusão explode a BOM **vigente no momento da
  conclusão**: se a engenharia revisar a estrutura no meio de uma OP aberta,
  ela é consumida e custeada pela revisão **nova**, não pela reservada na
  liberação. É o mesmo gap que o G5 registrou para roteiro
  (`production_route_id`), e pela mesma razão: é coluna nova **mais** decisão
  de negócio — *a OP em curso segue a revisão antiga ou migra para a nova?* —
  e implementá-la mexe em `ChangeProductionOrderStatusUseCase`, que está sob
  trabalho concorrente (G2/G3/G7). **Pré-requisito honesto se o Fisco ou a
  auditoria ISO 9001 exigirem reconstituir o produto COMO FABRICADO.**
- [ ] **Rótulo de revisão passou a ser obrigatoriamente único por produto**
  (`G1-BOM-REV-DUP`). Como o default do payload é `'00'`, criar a **segunda**
  revisão de um produto sem informar `revision` agora falha com 409 didático.
  É o comportamento ISO correto (a revisão identifica a versão), mas é
  **mudança de contrato** para quem chamava a API sem `revision` — confirmar
  com a Engenharia antes de treinar o usuário.

---

## 2026-08-10 — Três pendências pequenas retidas por disputa de arquivo (models/index.ts)

**Contexto:** três itens ficaram abertos não por dificuldade técnica, mas porque
`server/src/models/index.ts` estava sob edição concorrente e os agentes anteriores
foram instruídos a não tocá-lo. Fechados nesta passada com posse exclusiva do
arquivo. Escopo: `models/index.ts`, `models/QualityInspection.ts`,
`models/Client.ts` e o módulo `clients/`. **Nenhuma migration aplicada**
(as 7 pendentes continuam pendentes) e **nenhum commit** — o dono verifica antes.

- [x] **Tarefa 1 — `QualityInspection` registrado no barrel** com 9 associações.
  Detalhe e evidência na seção do G7 acima.
- [x] **Tarefa 2 — atributo-fantasma de `access_profile_id` corrigido** nas 4
  associações. Detalhe, varredura completa e análise de consumidores na seção
  da correção de nulabilidade (round 3) acima.
- [x] **Tarefa 3 — CNAE opcional no cadastro de cliente (decisão D-I).**
  Detalhe e evidência de escrita real no BUG-02 acima. **Backend apenas** — a
  tela é escopo de `PromadorFonteEnd`.

### Evidência de aceite

| Verificação | Resultado |
|---|---|
| `npm run typecheck` (server) | limpo |
| `npx tsx -e "require('./app')"` | `BOOT OK` — erro de associação mata o boot, então isto é o teste que importa aqui |
| Suíte unitária | **+2 suítes, +22 testes, todos verdes** (155→157 suítes, 1646→1668 testes) |
| Escrita real no PostgreSQL (CNAE) | 15/15 verificações verdes, em transação **revertida** |
| Varredura de atributo-fantasma | 2 grupos antes → **0** depois, em todos os models |

⚠️ **Sobre a contagem de falhas da suíte:** no momento desta entrega a suíte tem
falhas em `create-sale-quote`, `integrity-transaction-guards`,
`issue-sale-nfe-partial` e `purchase-approval-authority`. **Não são desta
entrega** — foi verificado revertendo os arquivos desta tarefa e rodando a suíte
completa: as mesmas suítes falham, com os mesmos testes. São trabalho em voo de
outros agentes em `sales/`, `purchases/`, `fiscal/`, `bom/`, `items/`, `mrp/` e
`bomService.ts` (a contagem oscilou de 9 para 5 suítes durante a própria sessão,
conforme eles avançavam). O baseline de 1615/1615 em 152 suítes citado na tarefa
já não existia quando esta entrega começou.

### Pendências abertas por esta entrega

- [ ] **Usar os aliases novos em `modules/quality/`.** O registro habilita
  `include`, mas nenhuma consulta foi alterada — o módulo é de outro agente
  nesta rodada. `GET /api/quality/inspections` continua devolvendo
  `lot_id`/`inspector_id` crus, sem `lot`/`inspector`/`nonConformity` aninhados.
- [ ] **Nada de `QualityInspection` foi exercitado contra o banco**, porque a
  migration `20260810-000032` não foi aplicada (proibido nesta tarefa). A
  verificação possível — SQL gerado com nomes de coluna reais, batendo com a
  migration — foi feita; o `INSERT`/`SELECT` real fica para depois de aplicar.
- [ ] **CNAE não tem validação de formato, de propósito.** A decisão D-I foi
  disponibilizar o campo, não normalizá-lo. Se a Contabilidade precisar do CNAE
  no formato fiscal (7 dígitos, `NNNN-N/NN`), é **decisão de negócio do dono** —
  não inventei máscara nem tabela de CNAEs válidos. Hoje `varchar(10)` aceita
  qualquer texto até 10 caracteres.
- [ ] **`clientValidators.ts` mistura `export const` com `module.exports =`**
  (pré-existente, não introduzido aqui). Funciona porque o `module.exports =`
  vem depois e sobrescreve, mas é exatamente o padrão que morre em runtime sem
  o typecheck acusar. Não mexi para não misturar refatoração com entrega, mas
  vale um passe de limpeza.

---

## G13 — Momento em que nascem a conta a pagar e a conta a receber (2026-08-10)

Onda 3 do `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`, decisão
**D-A** do dono ("seguir a lei nas 3 decisões com resposta normativa,
isoladas, uma por vez, com caminho de migração do dado existente"), com a
restrição da decisão **D-J** ("conta a receber avulsa, sem venda vinculada,
é caso legítimo").

Base normativa (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`,
Decisão 6):
- **CPC 00 (R2) itens 4.56/4.58** — pedido aprovado e não entregue é
  *contrato executório*; o passivo surge quando a outra parte cumpre
  primeiro (o fornecedor entrega).
- **CPC 47 itens 31/38/108** — receita quando o cliente obtém o controle;
  recebível exige direito **incondicional**.

### Regra nova

| Conta | Nascia em | Passa a nascer em |
|---|---|---|
| A pagar (compra) | aprovação do pedido, valor **do pedido inteiro**, vencimento `expected_date + 30` | **recebimento**, valor **do que chegou**, vencimento da NF do fornecedor |
| A receber (venda) | confirmação do pedido, valor **do pedido inteiro**; à vista já nascia `paid` | **autorização da NF-e**, valor **da emissão**, sempre `pending` |
| A receber (avulsa) | — (não havia endpoint) | `POST /api/finance/receivable`, sem `sale_id` (decisão D-J) |

### Conta a pagar — recebimento

- [x] `ChangePurchaseStatusUseCase` — `_createPurchasePayable` **removido**;
  a transição para `approved` não cria mais passivo. A alçada do G11 continua
  sendo o portão: pedido não aprovado nunca chega a `sent`, e `sent`/`partial`
  são os únicos status que o recebimento aceita — **nenhum passivo passa a
  existir sem aprovação**.
- [x] `purchases/domain/services/purchasePayableRules.ts` **(novo)** — funções
  puras `calculateReceiptAmount` (soma em centavos) e `resolvePayableDueDate`
  (`due_date` informado > `invoice_date + 30` > `recebimento + 30`).
- [x] `ReceivePurchaseItemsUseCase.createReceiptPayable` — cria a AP na
  **mesma transação** do recebimento, com `invoice_number` = NF do fornecedor,
  `approved_by`/`approval_date` **nulos** (quem recebe não aprova pagamento).
- [x] Payload de `POST /api/purchases/:id/receive` ganhou `invoice_date` e
  `due_date` (ambos opcionais, `YYYY-MM-DD`); resposta ganhou
  `account_payable` e `payable_skip_reason` fora de `data`.
- [x] Repositório: `findLegacyPayableByPurchaseId` e
  `findAccountPayableByPurchaseAndInvoice` (abstrato + Sequelize).
- [x] Frete continua **fora** do valor da AP — como já ficava fora de
  `total_amount`. Nenhuma mudança de comportamento; lançamento manual.

### Conta a receber — NF-e

- [x] `CreateSaleUseCase` e `ChangeSaleStatusUseCase` (`quote -> confirmed`)
  — **toda** criação de `AccountReceivable` removida, inclusive a parcela à
  vista que nascia `paid`.
- [x] `services/saleReceivableService.ts` **(novo)** — `buildInstallmentPlan`
  (pura: rateio em centavos, última parcela absorve o resto, vencimento sem
  overflow de mês) e `createInvoiceReceivables`.
- [x] `IssueSaleNfeUseCase` (síncrono) e `GetSaleNfeStatusUseCase`
  (assíncrono/webhook) criam as parcelas na **mesma transação** que incrementa
  `invoiced_quantity` e baixa o estoque (G9). Faturado sem baixar e faturado
  sem nada a cobrar são o mesmo defeito visto de dois lados.
- [x] Numeração de `installment` **contínua** entre emissões parciais
  (nota 1 -> 1..N, nota 2 -> N+1..M) — sem isso, duas emissões criariam dois
  pares `(sale_id, installment)` iguais.
- [x] Repositório fiscal: `createAccountReceivable` e `findReceivablesBySaleId`.
- [x] `cancelPendingReceivables` mantido no cancelamento da venda (cobre tanto
  as parcelas geradas pela NF-e quanto as legadas).

### Conta a receber avulsa (decisão D-J)

- [x] `CreateReceivableUseCase` **(novo)** + `POST /api/finance/receivable`
  (`authorizeModule('financeiro','operate')`).
- [x] Recusa `sale_id` com 422 e `details.rule = 'G13-AR'` — recebível de
  venda só nasce na NF-e; a porta dos fundos fica fechada.
- [x] Recusa `status` com 422 e `details.rule = 'G13-AR-PAID'` — nenhuma
  parcela nasce baixada.
- [x] `sale_id` e `status` são **aceitos pelo schema Zod de propósito**, para
  a recusa vir do use case com `details.rule` e mensagem útil, em vez do erro
  genérico de campo desconhecido do `.strict()`.

### Schema

- [x] **Nenhuma migration foi necessária.** O discriminador do dado legado é
  `invoice_number IS NULL` (conta criada pela regra antiga nunca teve nota,
  porque a nota não existia naquele momento) — não foi preciso criar coluna
  de flag `legacy_created_on_approval`/`legacy_created_on_confirmation`. Isso
  mantém as 7 migrations pendentes como 7, e faz o G13 funcionar contra o
  banco atual sem depender de liberação de aplicação.
- [x] Todos os literais de ENUM conferidos contra `pg_enum`
  (`enum_accounts_payable_status` e `enum_accounts_receivable_status` =
  `pending, paid, overdue, canceled, partial` — só `pending` é usado) e todos
  os nomes de coluna contra `information_schema.columns`.

### Migração do dado existente

- [x] **Levantado por consulta somente-leitura ao banco real antes de
  codificar** (números de 2026-08-10):

  | Levantamento | Qtd | Valor |
  |---|---|---|
  | AP de pedido **não recebido** (criadas na aprovação) | **8** | R$ 3.675,02 |
  | por status do pedido | 1 `approved`, 6 `sent`, **1 de pedido `canceled`** | — |
  | AR de venda **não faturada** | **2** (1 venda) | R$ 150,00 |
  | AR que nasceram `paid` sem baixa registrada | **0** | R$ 0,00 |
  | AP/AR com `payment_date` preenchido | **0** | — |

- [x] **Volume trivial e nada foi pago/recebido de fato** -> tratado sem
  parar a entrega: as linhas legadas **permanecem exatamente como estão** e o
  sistema apenas se recusa a criar uma segunda conta para a mesma obrigação
  (`payable_skip_reason: 'legacy_created_on_approval'` /
  `reason: 'legacy_created_on_confirmation'`). **Nenhum `UPDATE`, `DELETE` ou
  reclassificação foi aplicado a lançamento financeiro do dono.**
- [x] A AP do pedido **cancelado** (R$ 26,88) é o exemplo didático do defeito
  que o G13 corrige: passivo de uma compra que nunca vai existir, ainda
  contaminando a projeção de fluxo de caixa.
- [x] Consultas de levantamento documentadas em
  `docs/financeiro/01-FINANCEIRO.md` para o contador reproduzir.

### Verificação

- [x] `npm run typecheck` limpo
- [x] `npx jest tests/unit --maxWorkers=2` -> **1692/1692**, 159 suítes
  (era 1668/1668 em 157 antes desta entrega — subiu, não caiu)
- [x] `npx tsx -e "require('./app')"` sobe
- [x] **Escrita real contra o PostgreSQL de dev, dentro de transação com
  ROLLBACK:** os três payloads exatos que o código novo monta (AP do
  recebimento, AR da NF-e, AR avulsa) foram aceitos pelo schema físico;
  contagens de `accounts_payable`/`accounts_receivable` conferidas antes e
  depois (18 e 2, inalteradas). Fecha parte da lacuna descrita em
  `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`
  (typecheck + unitário não provam escrita).
- [x] Testes novos: `purchase-payable-no-recebimento-g13.test.ts` (11) e
  `sale-receivable-na-nfe-g13.test.ts` (13) — incluindo recebimento
  **parcial** (recebeu metade, deve a metade), faturamento **parcial**, AR de
  venda exigindo NF-e, AR avulsa funcionando, e todo teste de erro afirmando
  `details.rule`.

### PARADO E REPORTADO — Conta a pagar dos tributos de importação (COMEX)

O escopo registrado no plano (§3, linha do G13) incluía os tributos de
importação (II/IPI/PIS/COFINS/ICMS), que hoje não geram AP nenhuma.
**Não foi implementado, de propósito**, e a razão deixou de ser "falta
decidir o momento" (que o G13 resolveu) para virar quatro lacunas concretas:

1. **Vencimento por tributo.** II/IPI/PIS/COFINS têm fato gerador no
   **registro da DI**; ICMS-Importação varia por **UF** e regime especial. O
   ERP guarda `import_processes.customs_cleared_at` mas **não guarda número
   nem data de registro da DI** — não há de onde derivar vencimento sem
   inventar. As datas **não foram confirmadas em fonte oficial** na pesquisa
   normativa e não devem ser assumidas.
2. **Credor.** O beneficiário é a União (DARF) ou o Estado (GNRE/GARE), não o
   fornecedor estrangeiro. `accounts_payable.supplier_id` aponta para
   `suppliers`; criar fornecedores "União"/"Estado" é decisão de cadastro.
3. **Uma AP ou cinco?** Guias, datas e credores distintos por tributo.
4. **Moeda.** `AccountPayable` não tem coluna de moeda/câmbio. Os tributos já
   saem em BRL, então esta é a menor lacuna — mas o **FOB do fornecedor**
   continua sem lugar para virar passivo em moeda estrangeira.

- [ ] **Decisão do dono/contador necessária:** (a) o ERP passa a registrar
  número e data da DI? (b) cada tributo vira uma AP própria, com qual credor
  cadastrado? (c) qual UF e prazo de ICMS-Importação? (d) o FOB do fornecedor
  estrangeiro deve virar AP, e em qual moeda?

### Pendências abertas por esta entrega

- [ ] **Cancelar NF-e autorizada não cancela as parcelas daquela emissão.**
  Mantido coerente com o G9 (que também não devolve estoque no cancelamento
  de nota): baixado == faturado == cobrado. A reversão hoje é manual, ou pelo
  cancelamento da venda (que derruba os recebíveis pendentes). Se o dono
  quiser reversão automática, é uma entrega própria — e precisa tratar os
  três lados juntos.
- [ ] **Nada foi exercitado ponta a ponta contra o banco por HTTP.** A escrita
  real foi validada por transação com rollback (payloads aceitos pelo schema),
  não por um `POST` completo de recebimento/faturamento. O teste de integração
  real de `POST /api/purchases/:id/receive` e `POST /api/sales/:id/nfe`
  continua pendente — mesmo débito registrado em
  `CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md` item 3.
- [ ] **Mapeamento departamento -> centro de custo na AP automática** segue em
  aberto (TODO pré-existente, apenas transplantado da aprovação para o
  recebimento): a AP nasce com `cost_center_id NULL` e pode ser atribuída
  depois em `PUT /api/finance/payable/:id/cost-center`.
- [ ] **Compromisso de compra não tem tela.** Pedido aprovado e não recebido
  deixou de aparecer em contas a pagar (correto), mas a visão gerencial que
  deveria substituí-la — "pedidos em aberto / desembolso previsto", separada
  do passivo contábil — não existe. Sem ela, Compras perde visibilidade que
  antes tinha, ainda que pelo lugar errado.
- [ ] **Tela do `POST /api/finance/receivable`** (cobrança avulsa) não existe
  em `client/` — endpoint pronto, front pendente (escopo dos agentes de
  frontend).
- [ ] **Pergunta C7 ao contador** (prazo de pagamento conta da NF do
  fornecedor ou do recebimento físico?) muda apenas a data-base do default de
  30 dias; **C9** (destino das AP legadas: estorno ou congelamento) segue sem
  resposta e as 8 linhas continuam intactas aguardando.

---

## D-K — Segregação de função na compra: quem solicita não aprova (2026-08-10)

**Decisão de negócio:** D-K do dono do produto, 2026-08-10, respondendo à
pergunta direta *"aprovador ≠ solicitante?"* com **"Sim, aprovador ≠
solicitante"**. Registrada em
`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4 (D-K) e fecha o
critério de pronto da §5 do mesmo plano, que estava aberto **de propósito**
desde o G11 (naquela entrega o dono pediu alçada, não segregação, e o escopo
não foi estendido por conta própria).

### Entregue

- [x] Regra única em `server/src/shared/domain/segregationOfDuties.ts`
  (`assertApproverIsNotRequester`, `isSelfApproval`, `SEGREGATION_RULES`).
  Mora em `shared/` porque os 4 pontos pertencem a 3 módulos diferentes —
  cópia por módulo garantiria que o próximo ponto ficasse para trás, que foi
  exatamente o que aconteceu com o G11 (nasceu em Compras, só alcançou o
  COMEX na decisão D-G).
- [x] **4 pontos de aprovação cobertos**, cada um com `details.rule` próprio
  e verificação **antes de qualquer escrita**:

  | Ponto | `details.rule` | Solicitante comparado | Arquivo |
  |---|---|---|---|
  | `PATCH /api/purchase-requisitions/:id/status` (`approved`) | `D-K-REQUISICAO` | `purchase_requisitions.requester_id` | `ChangePurchaseRequisitionStatusUseCase.ts` |
  | `PUT /api/purchases/:id/status` (`approved`) | `D-K-PEDIDO` | `purchase_orders.requester_id` | `ChangePurchaseStatusUseCase.ts` |
  | `POST /api/purchases/:id/approve` (alçada G11) | `D-K-ALCADA` | `purchase_orders.requester_id` | `ApprovePurchaseUseCase.ts` |
  | `POST /api/comex/import-processes/:id/approve` (G11-COMEX) | `D-K-COMEX` | `import_processes.created_by` | `ApproveImportProcessUseCase.ts` |

- [x] Identidade do aprovador **sempre** de `req.user.id` (JWT), nunca do
  body — os 4 controllers já injetavam assim; nenhum deles foi alterado.
- [x] Mensagem prescritiva (diz a quem pedir a aprovação e como cadastrar um
  segundo aprovador), com `details.what_to_do` — não um 422 seco.
- [x] 18 testes unitários em
  `server/tests/unit/purchase-segregation-of-duties.test.ts`: para cada ponto,
  o solicitante é recusado **e nada é gravado**; um segundo usuário aprova
  normalmente; todo teste de erro afirma `details.rule`.
- [x] **Sem migration.** Nenhuma coluna nova foi necessária — as 3 colunas de
  solicitante já existiam e já eram preenchidas do JWT em 100% dos caminhos
  de criação (`CreatePurchaseRequisitionUseCase`, `CreatePurchaseUseCase`,
  `ConvertRequisitionToPurchaseOrdersUseCase`, `AwardRfqUseCase`,
  `CreateImportProcessUseCase`). Nomes de coluna conferidos contra
  `information_schema.columns` (regra de
  `CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md` §6 item 4).

### 🔴 Impacto operacional — precisa de ação ANTES de a regra valer

Verificado no banco de dev em 2026-08-10 (somente leitura), não estimado:

- **2 usuários ativos** no sistema inteiro: `admin` (id 1) e um Analista de
  Laboratório cujo perfil não tem `compras`, `requisicoes` nem `diretor`.
- **1 único usuário capaz de aprovar compra** — o próprio `admin`.
- Ele é o autor de **100% dos documentos**: 18/18 pedidos, 13/13 requisições
  e 4/4 processos de importação com `requester_id`/`created_by = 1`.
- **7 das 7 requisições aprovadas foram auto-aprovadas**
  (`approved_by = requester_id = 1`) — a prova documental do furo que a regra
  fecha, e ao mesmo tempo a prova de que ela trava a operação atual.

Com a regra ativa e sem novo cadastro, **nenhuma compra é aprovável**.

- [ ] **Cadastrar o segundo aprovador** (Administração → Perfis de Acesso):
  `requisicoes: approve` + `compras: operate`; e `diretor: operate` se ele
  também for assinar alçada G11 / aprovação de importação.

### Achados desta entrega (reportados, não implementados)

- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] `purchase_orders.requester_id` era `NULL`-able** — era a única das três
  colunas de solicitante que não era `NOT NULL` (`purchase_requisitions.requester_id`
  e `import_processes.created_by` já eram). Quando nula, a comparação era impossível
  e a regra **não bloqueava**, por desenho (bloquear tornaria pedidos legados
  inaprováveis para sempre, sem caminho de remediação). Havia **0 linhas
  nulas**, então o risco era teórico — mas *segregação sem solicitante confiável
  é decorativa*.
  **Resolvido: `purchase_orders.requester_id` é `NOT NULL`** desde a migration
  `20260810-000040` — confirmado em `information_schema.columns`
  (`is_nullable = NO`) no banco `erp_evok_audio` em 2026-08-12. A segregação
  D-K passa a ter solicitante confiável em todos os 4 pontos de aprovação.
- [ ] **Adjudicação de RFQ (`POST /api/rfqs/:id/award`) não está coberta.**
  É um ato de nível `compras:approve` que escolhe o fornecedor vencedor e
  gera pedido(s), e `rfqs.created_by` é `NOT NULL` — dá para cobrir em ~5
  linhas. **Não implementado por decisão consciente:** (a) não estava no
  escopo autorizado; (b) o desembolso continua com segunda pessoa, porque o
  pedido gerado nasce `pending` com `requester_id` = quem adjudicou e passa
  pelo gate `D-K-PEDIDO`; (c) com 1 único aprovador, cobrir também a
  adjudicação paralisaria um terceiro fluxo sem ganho de controle. **Basta o
  dono dizer "sim" para entrar.**
- [ ] **Recebimento (`POST /api/purchases/:id/receive`) não está coberto.**
  Segregação clássica de *three-way match* (quem compra ≠ quem recebe ≠ quem
  paga) — controle diferente do D-K (que é solicitante × aprovador) e não
  autorizado nesta rodada. Fica como recomendação de controle interno.
- [ ] **Aprovações fora da cadeia de compras** encontradas na varredura de
  rotas e **deliberadamente não tocadas** (escopo é a cadeia de suprimentos):
  `PUT /api/inventory/transfers/:id/approve`,
  `POST /api/inventory/counts/:id/approve`,
  `PATCH /api/marketing/materials/:id/approve`,
  `POST /api/ti/access-requests/:id/approve` (este já tem elegibilidade
  própria por gestor de departamento) e
  `POST /api/juridico/contracts/:id/approve`. Se o dono quiser a mesma regra
  nesses pontos, a função de `shared/domain/segregationOfDuties.ts` já serve
  sem alteração.
- [ ] **`docs/arquitetura/API.md`, seção `PUT /api/purchases/:id/status`,
  contém uma frase desatualizada** ("Ao transicionar para `approved`, gera
  automaticamente uma `AccountPayable`"): o G13 moveu esse lançamento para o
  recebimento. Não corrigido aqui por ser área de outro agente em voo
  (financeiro/G13).

---

## 2026-08-10 — Cadeia do produto, gap G17: Plano Mestre de Produção (MPS) — `programador`

**Decisão de negócio:** **D-F** do dono, 2026-08-10 — *existe PCP formal, há
quem planeje* (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
Isso confirma a recomendação da linha do G17: **não** ligar pedido de venda
diretamente à OP; o padrão da indústria é uma camada de plano mestre entre a
carteira e a ordem.

### O buraco que foi fechado (conferido no código, não na doc)

| Fato | Onde |
|---|---|
| Confirmar venda **não** gerava produção nenhuma | `ChangeSaleStatusUseCase` (só reserva estoque, G9) |
| O MRP calculava **só** contra a demanda digitada no payload | `GenerateMrpPlanUseCase` → `input.demands` |
| Nada lia a **carteira de pedidos** aberta | não havia consulta de `quantity − invoiced_quantity` fora do faturamento |
| Nada tratava o **estoque mínimo** como demanda | `products.min_quantity` só alimentava alerta de dashboard |

### O que foi entregue

- [x] Migration `20260810-000037-create-master-production-plan-g17.cjs` —
  `master_production_plans` + `master_production_plan_lines`. **ESCRITA, NÃO
  APLICADA** (aplicar migrations está bloqueado pelo classificador de permissão
  do ambiente; entra na fila de pendentes). `up`/`down` validados por dry-run
  com `queryInterface` dublê. Duas tabelas novas, **nenhuma coluna alterada em
  tabela existente** — o vínculo com a OP mora em
  `master_production_plan_lines.production_order_id`, não numa coluna nova em
  `production_orders`, justamente para não tocar o hot path da produção.
- [x] Models `MasterProductionPlan` / `MasterProductionPlanLine` registrados em
  `server/src/models/index.ts` com todas as associações.
- [x] Módulo `server/src/modules/masterProduction/` (Clean Architecture:
  `domain/constants.ts` com as regras puras, contrato de repositório,
  implementação Sequelize, 6 use cases, controller, rotas).
- [x] `/api/production/master-plans` montado em `app.ts`; RBAC
  `authorizeModule('mrp', …)` em 100% das rotas; guarda
  `module-authorization-map.test.ts` atualizada.
- [x] 40 testes unitários (`server/tests/unit/master-production-plan-g17.test.ts`),
  todo teste de erro afirmando `details.rule === 'G17'`.
- [x] Documentação: `docs/arquitetura/API.md` §34,
  `docs/producao/02-PCP.md` (seção "Plano Mestre — IMPLEMENTADO"),
  `docs/projeto/04-USE_CASES.md` UC-72, `docs/database/DATABASE.md`,
  `server/src/modules/masterProduction/README.md`.

### A regra, em uma frase

O sistema consolida (carteira + estoque mínimo + previsão) × (saldo de
planejamento + OPs abertas), **uma pessoa decide** linha a linha, e só a
liberação explícita do plano **firmado** gera OP. A linha nasce `pending` com
`planned_quantity = 0` mesmo com sugestão positiva, e firmar plano sem decisão
nenhuma é recusado (422).

### 🟡 Decisões de PCP que o dono NÃO tomou — e que o código se recusou a inventar

- [ ] **Horizonte de planejamento.** Não há default: `horizon_start`/`horizon_end`
  são obrigatórios e declarados pelo planejador a cada plano. Se a empresa tem
  um horizonte padrão (30/60/90 dias, semana móvel), ele pode virar default.
- [ ] **Política de lote mínimo / múltiplo de produção.** `suggested_quantity` é
  a necessidade líquida **crua**, sem arredondamento. O motor MRP arredonda por
  `items.lote_minimo`, mas o MPS opera sobre `products` (a chave da OP), onde
  não existe campo equivalente — criá-lo é decisão de negócio + migration.
- [ ] **Pedido que chega depois do plano fechado.** Não há replanejamento
  automático: o plano é fotografia datada (`consolidated_at`) e a demanda nova
  entra no próximo plano. Alternativas possíveis (re-consolidar plano `draft`,
  plano "vivo", alerta de demanda órfã) dependem de como o PCP trabalha.
- [ ] **Alçada de aprovação do PCP.** Firmar e liberar exigem apenas
  `mrp:operate`, seguindo o precedente de
  `POST /api/mrp/planned-orders/convert-to-production` (que também cria OP).
  Se o dono quiser gerente/diretoria firmando, é trocar para
  `authorizeModule('mrp', 'approve')` em 2 rotas.

### ⚠️ Limitações estruturais reportadas (não implementadas)

- [ ] **`sales` não tem data de entrega prometida.** Não existe coluna de prazo
  no pedido de venda — a demanda é consolidada por produto **no horizonte
  inteiro, sem baldes de tempo**. O "Semana 1 / Semana 2 / Semana 3" que
  `docs/producao/02-PCP.md` desenha desde sempre **não é possível** hoje. Um MPS
  semanal de verdade depende dessa coluna existir (migration + tela de venda).
- [ ] **Não existe entidade de previsão de vendas.** A previsão é digitada no
  payload de criação do plano (`forecast_demands`). Se o Comercial passar a
  manter previsão formal, ela vira tabela e o MPS lê dela.
- [ ] **`BomService.checkAvailability` não participa da transação** e a reserva
  de material só ocorre quando a OP vai a `released` — duas linhas do mesmo
  plano que consomem o mesmo componente são avaliadas de forma independente.
  **Limitação herdada, idêntica à do caminho do MRP**; a contenção real
  continua sendo a reserva por OP do G3. Fechar isso exige reservar na criação
  da OP, o que muda o comportamento dos três caminhos.
- [ ] **Teste de integração real (Postgres) pendente** — como todo o resto da
  fila, os 40 testes usam repositório dublê. O aceite honesto desta entrega é
  um `POST /api/production/master-plans` bem-sucedido contra o banco, **depois**
  de a migration ser aplicada (ver
  `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md` §6,
  item 5).
- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] Tela web do Plano
  Mestre de Produção (MPS)** — **existe**:
  `client/src/pages/production/MasterProductionPlanPage.tsx` (+ teste
  `MasterProductionPlanPage.test.tsx`), rota `/production/master-plans`,
  entregue em 2026-08-10. Mostra sugerido × planejado lado a lado (a
  divergência é o que a auditoria de PCP procura) e avisa na própria interface
  que a demanda é consolidada **sem baldes de tempo** (limitação conhecida:
  `sales` não tem data de entrega prometida). Com ela, **nenhum módulo de
  backend ficou sem tela** — as exceções restantes são por desenho (inventário
  mobile via QR e endpoints de webhook).

---

## 2026-08-10 — Cadeia do produto, gap G4: apontamento de produção obrigatório — `programador`

**Decisão de negócio:** **D-A** do dono — *"Sim, siga a lei nas 3"*, isoladas,
uma por vez, com caminho de migração do dado existente.

**Base legal (não é preferência de processo):** Ajuste SINIEF 2/09, cl. 3ª §7º
III (Bloco K desde 01/01/2019, divisões 10–32 — alto-falante é CNAE 2640-0/00,
divisão 26); **§10** (só a escrituração completa desobriga o Livro modelo 3, que
exige consumo e produção **por ordem de produção**); **§13** (a simplificada
dispensa transmitir, não registrar); RIR/2018 (custo integrado e coordenado).
Fonte e ressalvas: `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`
Decisão 4. Detalhamento fiscal: `docs/tributario/04-BLOCO_K.md` (**novo**).

### O que foi entregue

- [x] `server/src/modules/production/domain/productionTrackingRules.ts` (**novo**)
  — regras puras, 7 códigos `G4-*`, sem Sequelize/HTTP/`process.env`.
- [x] Gate na conclusão da OP (`ChangeProductionOrderStatusUseCase`), rodando
  **antes** de qualquer escrita: sem apontamento (`G4-TRACKING-REQUIRED`), tudo
  pulado (`G4-TRACKING-NO-COMPLETED`), etapa concluída sem tempo mensurável
  (`G4-TRACKING-TIME-MISSING`) e sem taxa horária resolvível
  (`G4-LABOR-RATE-MISSING`) passam a reprovar. As duas regras anteriores
  (etapa em aberto, quantidade acima do apontado) ganharam `details.rule`.
- [x] **Materialização do apontamento na liberação da OP** a partir do roteiro
  ativo (G5) — é o que torna a regra exequível e o que amarra cada apontamento
  ao `production_route_step_id` da revisão executada.
- [x] `calculateLaborCost` passou a usar as mesmas funções puras do gate
  (`computeStepHours`, `resolveStepLaborRate`) — gate e custeio não podem
  divergir. **Nenhum número de custo mudou.**
- [x] `cost_per_hour` passou a ser configurável em `POST`/`PUT /api/work-centers`
  (antes só por SQL direto — regra bloqueante precisa de remediação pelo sistema).
- [x] Envelope de erro do módulo de OP passou a delegar `AppError` ao
  `errorHandler` central, para que `details.rule` chegue ao cliente. O envelope
  antigo (`error: "<mensagem>"`) descartava `details`.
- [x] Janela de transição `PRODUCTION_TRACKING_REQUIRED` (`block` padrão /
  `warn`); valor inválido cai em `block` e loga `G4-TRACKING-MODE-INVALID`.
- [x] **Nenhuma migration criada** — G4 não precisou de schema novo.

### Migração do dado existente — levantado no banco, não estimado

Consulta somente-leitura a `erp_evok_audio` em 2026-08-10:

| Métrica | Valor |
|---|---|
| OPs no total | **12** |
| por status | 3 `completed`, 5 `canceled`, 1 `planned`, 2 `released`, 1 `in_progress` |
| OPs `completed` **sem** apontamento | **3** (todas) |
| OPs abertas **sem** apontamento | **4** (todas) |
| linhas em `production_order_tracking` | **0** |
| roteiros cadastrados | **0** |

**As 12 OPs são dados de teste** (produtos `CI-BOM-FINISHED-001`,
`E2E-MRP-OP-001`, `E2E-PA-…`). Não há OP de produção real que a regra nova
travaria, e nenhuma OP concluída exige retrofit de custo. **Não houve decisão de
negócio a tomar sobre volume de dado.** A recomendação da pesquisa continua
valendo: entrar em produção com base limpa.

### 🔴 Pré-requisitos de configuração ANTES de usar em ambiente real

Verificado no banco de dev em 2026-08-10 — **os três estavam zerados**:

- [ ] Cadastrar **roteiro ativo** para cada produto fabricado
  (`Produção > Roteiros de Fabricação`). Hoje: **0 roteiros**.
- [ ] Definir `work_centers.cost_per_hour > 0`. Hoje o único centro
  (`MONTAGEM`) tem **0**. Já configurável via API desde esta entrega.
- [ ] Definir `production_cost_settings.default_labor_rate_per_hour` para etapas
  **sem** centro de trabalho. Hoje **0** — e **sem API** (ver pendência abaixo).

Sem pelo menos uma taxa positiva, **toda conclusão de OP falha** com
`G4-LABOR-RATE-MISSING`. Isso é o zero silencioso virando erro explícito, mas
exige configuração antes do primeiro uso.

### ⚠️ Pendências e limitações reportadas (não implementadas)

- [ ] **`production_cost_settings` não tem nenhuma API.** O fallback global de
  taxa horária (`default_labor_rate_per_hour`), a base de rateio e o percentual
  de overhead só existem por SQL direto. É um módulo de configuração pequeno,
  mas é backend + tela.
- [ ] **OP continua sem coluna de revisão de roteiro.** A mitigação entregue
  (cada apontamento guarda `production_route_step_id` da revisão ativa na
  liberação, e roteiro ativo é imutável) **não cobre** OP liberada sem roteiro
  ativo nem apontamento criado à mão. Reconstituir 100% dos casos exige
  `production_orders.production_route_id` — migration + decisão de negócio. É a
  mesma dependência que o G5 registrou (commit `c21f81b`) e que o G1 tem para
  revisão de BOM (`067472a`).
- [ ] **Geração do arquivo do Bloco K (K200/K230/K235/K280) não iniciada.** O
  ERP passa a **registrar** o dado; gerar o arquivo (leiaute de Ato COTEPE) é
  trabalho separado. K250/K255 (industrialização por encomenda) não é modelado.
- [ ] **Teste de integração real (Postgres) da suíte completa não executado** —
  `npm run test:integration:strict` aplica migrations, e há **8 pendentes**
  bloqueadas por liberação do dono. Os testes de integração **foram atualizados**
  (`e2e-cadeia-insumo-produto.test.ts` ganhou as etapas 6b/gate G4;
  `production-order-scrap.test.ts` ganhou o helper `apontarEtapa`), mas **não
  rodaram**. O que **foi** verificado contra o Postgres real está abaixo.
- [ ] **Tela de chão de fábrica (`client/`) não foi tocada** — `ShopFloorPage`
  já cobre criar/iniciar/concluir etapa, então a regra é exequível pela UI hoje.
  Falta: campo `cost_per_hour` na tela de centro de trabalho e tradução dos 7
  códigos `G4-*` para linguagem de usuário (mesmo tratamento que o G5 deu aos
  `G5-*`). **Tarefa de `PromadorFonteEnd` / `ui-ux-styling-expert`.**
- [ ] **Log de nível `error` para regra de negócio esperada.** Ao delegar
  `AppError` ao `errorHandler`, todo 422 do módulo passa a ser logado com stack
  em `logger.error` — comportamento pré-existente do handler central, aplicado a
  todos os outros módulos. Não foi alterado (mudaria o sistema inteiro), mas vai
  gerar ruído de log proporcional ao uso.

### ✅ Verificação executada (não é relatório — foi rodado)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | limpo |
| `npx jest tests/unit --maxWorkers=2` | **1807/1807** em 166 suítes (baseline era 1692) |
| `npx tsx -e "require('./app')"` | sobe |
| **Escrita real no Postgres**, em transação revertida | roteiro + 3 etapas + 2 apontamentos gravados, ciclo `start`→`complete` persistido, leitura do gate OK; **contagens de volta a 0 após rollback** |
| **HTTP real contra a API + banco de dev** | `PUT /api/production-orders/4/status` (`completed`, OP sem apontamento) → **422** com `error.details.rule = "G4-TRACKING-REQUIRED"`; OP permaneceu `in_progress`; **7 tabelas com contagem idêntica antes e depois** |

Nenhuma migration foi aplicada. Nenhum dado do dono foi alterado.

---

## 2026-08-10 — Trilha de auditoria silenciosa (`enum_audit_logs_action`) e `closed_date` da RNC — `programador`

Fecha os achados **§2 (P0)** e **§3 (P1)** de
`docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` — as duas
instâncias confirmadas da classe "o Sequelize engole em silêncio: a API
responde 200 e o dado some"
(`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`).

### Tarefa 1 — 37 literais de `action` fora do `ENUM` (46 call sites)

- [x] **Decisão tomada e justificada: híbrida — 9 valores canônicos novos +
  29 sinônimos normalizados.** O critério não foi "o verbo é diferente?" e sim
  **"a pergunta do auditor muda?"**. Um `ENUM` que ganha um valor por endpoint
  não é vocabulário: é texto livre com passos extras, que não agrega, não
  indexa e volta a divergir no módulo seguinte. Racional completo, valor a
  valor, em `server/src/shared/domain/auditActions.ts` (constante
  `NEW_AUDIT_ACTION_RATIONALE`, no próprio código) e em
  `docs/database/DATABASE.md`.
- [x] SSOT criada: `server/src/shared/domain/auditActions.ts` — vocabulário
  (24 valores), tabela de sinônimos (29), tabela de degradação (9) e as
  funções `resolveAuditAction` / `downgradeAuditAction` /
  `markAuditActionInDescription` / `isUnsupportedAuditActionError`.
- [x] `src/models/AuditLog.ts`: `action` deixou de ser `string` e virou union
  type derivado da SSOT; a lista de `DataTypes.ENUM` também passou a ser
  derivada, para model e vocabulário não poderem divergir de novo.
- [x] Normalização no `AuditLog.register` (cobre qualquer chamador, não só o
  wrapper) — sinônimo vira valor canônico e o verbo original é preservado como
  marcador na `description` (`WHERE description LIKE '[award]%'`).
- [x] Degradação segura no `auditLogService.logAction`: ao receber o `22P02`
  do Postgres, memoriza o valor e **regrava a mesma linha** no valor legado
  equivalente. **O evento nunca é perdido**, com ou sem a migration aplicada.
- [x] Migration `20260810-000036-extend-audit-log-action-enum.cjs` **escrita,
  `up`/`down` funcionais e verificados por dry-run — NÃO APLICADA** (fila de
  pendentes aguardando liberação do dono).
- [x] Guarda `tests/integration/enum-literal-guard.test.ts`: **6/6 verde**
  contra o banco de dev **com a migration pendente** (ver ressalva abaixo).
- [x] `tests/unit/audit-action-vocabulary.test.ts` (16 testes) — a metade da
  guarda que **não precisa de banco**, para a regressão aparecer na suíte
  rápida e não só na de integração.
- [x] `tests/unit/audit-log-action-downgrade.test.ts` (5) e
  `tests/unit/audit-log-register-normalization.test.ts` (5).

> ⚠️ **O que a guarda passou a afirmar.** A pergunta original era *"o literal
> está no `ENUM` hoje?"* — uma aproximação da pergunta que importa, que é
> ***"o evento chega ao banco?"***. Com o caminho de degradação as duas
> deixaram de coincidir, e o teste passou a afirmar a segunda. Ficou **mais
> forte**: continua reprovando literal que não é canônico nem sinônimo, e
> passou a reprovar também sinônimo quebrado e degradação quebrada — duas
> falhas que a versão anterior não via. A tolerância é limitada a valores com
> degradação **provada contra o `pg_enum` real desta conexão**, e some sozinha
> quando a `000036` for aplicada.

- [ ] **Depois de aplicar a `000036`:** rodar `npm run test:integration` e
  conferir que os `console.warn` "gravando em modo degradado" **desaparecem**
  — é o sinal de que os 9 valores passaram a ser gravados exatos.
- [ ] **Normalizar no call site os 7 sinônimos de `src/modules/production/` e
  `src/modules/mrp/`** (`activate`, `inactivate`, `revise`, `update_steps`,
  `convert_to_requisition`, `convert_to_production_order`,
  `mrp_auto_convert_to_requisition`). Hoje funcionam pela tabela central;
  aqueles dois módulos estavam sob edição concorrente e **não podiam ser
  tocados**. Não é urgente — é higiene de quem for dono daqueles arquivos.
- [ ] **`logAction` é importado por `require()` em 74 arquivos**, então o
  union type de `action` **não protege os call sites** (o `require` devolve
  `any`). A tipagem só vale para quem usar `import`. Enquanto isso, a rede
  real são as duas guardas (unitária + integração). Converter os 74 imports é
  mudança ampla e transversal — não foi feita aqui.
- [ ] **Backfill das linhas gravadas em modo degradado: NÃO feito, de
  propósito.** São identificáveis (`description LIKE '[access_denied]%'`), mas
  reescrever log de auditoria existente é o que uma trilha não pode permitir.
  Se for necessário reclassificar, que seja decisão explícita com `UPDATE`
  revisado — nunca efeito colateral de migration.

### Tarefa 2 — `closed_at` × `closed_date` na RNC

- [x] `UpdateNonConformityUseCase` passou a gravar **`closed_date`** (coluna
  real, `DATE`) em vez de `closed_at` (que o Sequelize descartava em
  silêncio). Reprodução do antes/depois no SQL emitido está em
  `docs/database/DATABASE.md`.
- [x] **Segunda ocorrência encontrada na varredura do módulo** (não apontada
  pela auditoria): `CloseNonConformityUseCase`
  (`DELETE /api/quality/non-conformities/:id`) gravava **apenas**
  `status = 'closed'` — sem data e sem responsável. Corrigida.
- [x] Os dois caminhos passaram a derivar os campos de encerramento da mesma
  função (`src/modules/nonConformities/domain/closure.ts`), com teste
  comparando os dois payloads para impedir divergência futura.
- [x] **`closed_by` removido de `ALLOWED_FIELDS`** do `PUT`: bastava enviá-lo
  no body para atribuir o encerramento a outra pessoa. Passa a vir só do JWT
  (mesmo padrão anti-spoofing da remediação 3.1).
- [x] `tests/unit/non-conformity-closure-date.test.ts` (9 testes) + correção
  do teste existente em `nonConformities-use-cases.test.ts`, que se chamava
  *"define closed_by e closed_at"* e **nunca verificou a data** — foi assim
  que o defeito atravessou a suíte.
- [x] Varredura do módulo inteiro:
  `tests/integration/column-name-drift-guard.test.ts` (3º teste, o que acusava
  `closed_at`) **passa** — nenhum outro payload de escrita em
  `application/use-cases` / `infrastructure/sequelize` usa chave que não é
  atributo de model.

**Estado do dado (verificado):** as 6 RNCs do banco estão todas `status='open'`
e `closed_date IS NULL` em 100% delas — **nenhuma perda ocorreu**. Era esse o
motivo de corrigir antes do Go-Live: depois exigiria reconstituir uma data que
ninguém tem.

### Fuso horário de `closed_date` (limitação assumida)

- [ ] `closed_date` usa a convenção de "hoje" já adotada em ~90 pontos do
  backend (`toISOString().slice(0, 10)`, portanto **UTC**). Um encerramento
  feito depois das 21h (UTC-3) grava a data do dia seguinte. Consistência foi
  preferida a criar uma terceira semântica de data só para este módulo; a
  troca, se decidida, é num único ponto (`domain/closure.ts`).

### Fora do escopo, encontrado no caminho

- [x] **[IMPLEMENTADO — fechado em 2026-08-12 após medição] `non_conformities.asset_id` era `NOT NULL` no banco de TESTE e `assets`
  tinha 0 linhas** — ou seja, **criar RNC no banco de teste era impossível**.
  **Resolvido:** medido em 2026-08-12, `asset_id` é `is_nullable = YES` nos
  **dois** bancos (`erp_evok_audio` e `erp_evok_audio_test`). Era exatamente o
  drift dev × teste previsto abaixo; a guarda `cross-database-drift-guard`
  (que executa `server/scripts/comparar-bancos.cjs`) hoje reprova se voltar.
  É a divergência dev × teste já descrita em
  `VARREDURA_ESCRITA_REAL_2026-08-10.md` §10 (resíduo da `000028`, aplicada em
  dev e não em teste). Some quando os dois bancos forem reprovisionados a
  partir do baseline congelado.
- [x] 3 entradas novas na allowlist de `enum-literal-guard.test.ts` para
  literais `reason:` em `saleReceivableService.ts`,
  `ReceivePurchaseItemsUseCase.ts` e `modules/masterProduction/`. **São falso
  positivo estrutural** da união por nome de coluna do 3º teste: os três são
  discriminadores de **retorno em memória**
  (`return { reason: 'zero_amount' }`), tipados como union de string no próprio
  arquivo, que nunca chegam a `.create()`/`.update()` — `MasterProductionPlan`
  tem `cancel_reason`, não `reason`. Conferidos linha a linha; eram
  **pré-existentes** (vieram do commit G13 e do módulo MPS, ambos fora desta
  tarefa).

---

## 2026-08-10 — Baseline do schema congelado: o banco passa a ser reproduzível — `AdmDBA`

Fecha os **passos 3 e 4** do plano de 4 passos registrado em
`docs/database/DATABASE.md` (seção "S-1 rodada 3"). Passos 1 e 2 saíram no
commit `e2a8d7e`. Também fecha o **item 2** da lista de correções estruturais
de `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md` §6.

### O que foi feito

- [x] `server/migrations/20260731-000001-baseline-schema.cjs` **não gera mais
  schema a partir dos models compilados**. `DYNAMIC_MODEL_FILES`,
  `createTableFromModel`, `addIndexesFromModel` e a dependência de
  `dist/src/models/*.js` foram removidos. O `up` aplica o DDL estático
  `database/postgresql/00_baseline_frozen.sql` (784 KB, 200 tabelas).
- [x] As outras 159 migrations são **registradas em `SequelizeMeta` pelo
  próprio `up`** (a lista vem de `00_baseline_frozen_meta.sql`, não de um
  `readdir`). Funciona porque o umzug 2.x reconsulta o storage por migration,
  no momento de executar. Migration criada **depois** do congelamento não está
  no dump e continua rodando normalmente por cima dele.
- [x] Duas migrations ficam **fora** da marcação e rodam de verdade, porque
  `pg_dump --schema-only --no-owner --no-acl` não carrega role, GRANT nem dado:
  `20260806-000080` (role `evok_app`, objeto de cluster) e `20260807-000231`
  (seed do plano de contas). Ambas são DDL-free e idempotentes.
- [x] Três migrations que misturam DDL + seed passaram a exportar
  `seedReferenceData`, chamado pelo baseline: `20260803-000008`
  (perfil "Administrador Geral" + 26 permissões), `20260804-000001`
  (depósitos `INSUMOS`/`ACABADOS`/`LABORATORIO`) e `20260804-000008`
  (singleton de custo). O SQL **não** foi copiado — a fonte da verdade
  continua na migration. Sem isso banco novo nasceria sem depósito.
- [x] `down` coerente: derruba todas as tabelas de `public` (exceto
  `SequelizeMeta`), funções e tipos ENUM que não pertencem a extensão, e
  devolve as 159 pré-marcadas ao estado pendente.
- [x] O atalho `shouldBootstrapCanonicalSchema` foi **mantido** (o plano
  original previa removê-lo). É a proteção contra aplicar o dump sobre banco
  que já tem tabelas. Quando dispara, o `up` não faz nada — nem aplica o dump,
  nem pré-marca migration.
- [x] `server/scripts/comparar-bancos.cjs` passou a **receber os dois nomes de
  banco por argumento** e a comparar muito mais: além de presença de coluna e
  nulabilidade, confere **tipo completo** (`format_type`), **default**,
  **definição de todo índice** e **de toda constraint**
  (`pg_get_constraintdef`). Sai com código 2 quando há divergência.

### Validação — medida, não afirmada

- [x] Banco descartável `erp_evok_audio_baseline_check` criado vazio,
  provisionado **só** por `db:migrate` (3 migrations executaram de fato, 157
  puladas, ~5 s), comparado com `erp_evok_audio`: **"os dois bancos sao
  IDENTICOS"** — 0 divergência em coluna, tipo, default, índice e constraint.
- [x] Dado de referência conferido no descartável: 3 depósitos, 1 perfil, 26
  permissões, 1 `production_cost_settings`, 30 contas contábeis, GRANT de
  `evok_app` em 199 tabelas.
- [x] Ciclo `up → down → up` exercitado: depois do `down` restou 1 tabela
  (`SequelizeMeta`), 0 migrations e 0 tipos ENUM; o `up` seguinte reconstruiu
  tudo e a comparação voltou a dar idêntico.
- [x] Banco descartável **derrubado** ao fim. `erp_evok_audio` e
  `erp_evok_audio_test` não foram tocados (`migration:status` segue 160 up /
  0 pendentes nos dois).
- [x] `npm run typecheck` limpo · `npx jest tests/unit` **1807 testes / 166
  suítes**, todos passando · servidor sobe (`/health/ready` 200) · as 3 guardas
  de integração (drift de schema, nome de coluna, literal de enum) **verdes**
  com `RUN_INTEGRATION=true DB_NAME=erp_evok_audio_test`.

### Efeito no gate de produção

O plano dizia *"até o passo 4 passar, o servidor de produção não deve ser
provisionado"*. **O passo 4 passou** — o banco deixou de ser bloqueador.
Continuam pendentes e **fora** desta entrega: aquisição do servidor, reverse
proxy/TLS, `docker-compose.prod.yml` exercitado de fato, cron de backup e a
troca da credencial de runtime para `evok_app`.

### Pendências que esta entrega deixa

- [ ] **`01_schema.sql`, `02_indexes.sql`, `02a_…` e a série `04a…04i` ficaram
  órfãos** — nenhuma migration os lê mais. Foram mantidos como histórico.
  Decidir se saem do repositório ou ganham um cabeçalho `DEPRECATED`.
- [ ] **O dump não carrega dado.** Se no futuro outra migration passar a
  semear dado de referência, ela precisa entrar em `STILL_RUN_AFTER_FROZEN`
  (se for DDL-free) ou exportar `seedReferenceData`. Não há guarda automática
  para isso — é convenção documentada no cabeçalho do baseline.
- [ ] **Recongelar o dump quando o volume de migrations pós-freeze crescer.**
  Hoje o processo é manual (`pg_dump --schema-only` + `pg_dump --data-only
  --table=SequelizeMeta`); não há script versionado que o faça.
- [ ] **`erp_evok_audio_test` não foi reprovisionado a partir do baseline
  congelado.** Ele foi recriado a partir do dev em `e2a8d7e` e é idêntico ao
  dev, então não há divergência a corrigir — mas quem quiser a prova completa
  do caminho de provisionamento deve refazê-lo pelo baseline.

---

## 2026-08-10 — Suíte de integração: de 31 falhas para 0 (124/124 verdes) — `programador`

**Ponto de partida medido:** `npm run test:integration` → **97 passavam, 31
falhavam** em 36 arquivos, contra a API + PostgreSQL reais
(`server/scripts/run-api-suite.cjs`, banco `erp_evok_audio_test`).

**Resultado:** `npm run test:integration` → **36 suítes / 124 testes, todos
passando**, duas execuções seguidas contra o mesmo banco (idempotente).
`assert-jest-no-skips` verde — nenhum teste pulou em silêncio.

### O diagnóstico: 26 das 31 falhas eram teste desatualizado, 5 eram defeito/fixture

| Causa | Falhas | Natureza |
|---|---|---|
| Segregação de função **D-K** (aprovador ≠ solicitante) com **um único usuário** na suíte | 7 diretas + cascata no E2E | teste desatualizado |
| **G7** (liberar lote exige inspeção registrada, ISO 9001 §8.6) | 1 + cascata | teste desatualizado |
| **G11-COMEX** (importação exige aprovação da diretoria antes do embarque) | 1 | teste desatualizado |
| **G1** (estrutura de produto tem fonte única: BOM) | 1 | teste desatualizado |
| **G9** (venda confirmada RESERVA, não baixa) | 1 | teste desatualizado |
| `POST /api/sales` impossível sem `payment_method` + `notes` | 4 | **bug real** |
| `POST /api/suppliers` 500 sem `trade_name` | 1 | **bug real** |
| `production_cost_settings.default_labor_rate_per_hour` zerado no banco de teste | 1 | fixture faltando |

Nenhuma regra de produção foi afrouxada para o teste passar. Onde o teste
afirmava o comportamento antigo como correto, o **teste** foi corrigido — e a
regra nova passou a ser exercitada explicitamente (a suíte hoje prova o 422 de
auto-aprovação, o 422 de liberação sem inspeção, o 422 de embarque sem
diretoria e o 422 de estrutura paralela, além do caminho feliz).

### Bugs reais corrigidos

- [x] **`POST /api/sales` respondia 400 para qualquer payload sem
  `payment_method` e `notes`** — ou seja, não existia venda criável pela API
  sem informar forma de pagamento e observação, apesar de os dois serem
  `.optional()` em `createSaleSchema`. Causa: `SaleEntity` coagia a ausência
  para **`null` explícito**, e `sales.payment_method` / `sales.notes` são
  `NOT NULL` **COM default** (`'pix'` e `''`) — `null` explícito anula o
  default do Postgres. Corrigido em
  `server/src/modules/sales/domain/entities/SaleEntity.ts` (passa `undefined`);
  `CreateSaleUseCase` passou a usar `sale.payment_method` (persistido) na
  descrição da movimentação de estoque, em vez do valor da entidade.
  Verificado contra o Postgres real: `POST /api/sales` mínimo → **201**, com
  `payment_method: "pix"` e `notes: ""` aplicados pelo default.
- [x] **`POST /api/suppliers` respondia 500 quando `trade_name` era omitido**
  (`null value in column "trade_name" ... violates not-null constraint`).
  Mesma armadilha: `suppliers.trade_name` é `NOT NULL DEFAULT ''` e
  `SupplierEntity` gravava `null`. Corrigido em
  `server/src/modules/suppliers/domain/entities/SupplierEntity.ts`. Verificado:
  cadastro mínimo → **201** com `trade_name: ""`.

> ⚠️ **É uma classe de defeito, não dois defeitos.** Mesma família catalogada
> em `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`,
> numa variante que **nenhuma das 3 guardas cobre**: a guarda de drift
> (`schema-model-drift-guard`) isenta de propósito colunas `NOT NULL` **com
> default**, porque omiti-las não quebra INSERT — o que quebra é passar `null`
> explícito, e isso é código, não schema. Ver pendência aberta abaixo.

### Correções de fixture (runner)

- [x] `scripts/run-api-suite.cjs` provisiona um **segundo administrador**
  (`ci-approver@evok.local`) e exporta `TEST_APPROVER_TOKEN`. É o mínimo
  organizacional que a D-K exige: com um único usuário, nenhuma compra do ERP
  é aprovável, então a suíte inteira travava na primeira aprovação.
  `role: 'admin'` também dá a alçada de diretoria do G11/G11-COMEX
  (`resolveAvailableApproverRoles` trata `admin` como `diretor`), então um
  usuário extra cobre os **4** pontos de aprovação.
- [x] `tests/helpers/testApi.ts` ganhou `approverToken()` e `mintToken()`
  (esta última promovida de `quality-releases-receiving-lot.test.ts`, onde já
  existia). **Nenhuma senha é usada**: o token é assinado direto, mesma
  técnica do runner — as senhas dos 18 usuários departamentais
  (`scripts/seed-usuarios-departamentos.cjs`) são aleatórias a cada execução e
  vivem fora do Git, então nenhum teste pode depender delas.
- [x] `scripts/run-api-suite.cjs` passou a garantir
  `production_cost_settings.default_labor_rate_per_hour = 50` no banco de
  teste. Sem isso, o G4 recusa concluir qualquer OP cuja etapa não tenha
  centro de trabalho com `cost_per_hour` (`G4-LABOR-RATE-MISSING`) — é o
  equivalente do que o dono configura uma vez em Produção > Configuração de
  Custeio.
- [x] `scripts/run-api-suite.cjs` aceita um **filtro opcional** de caminho
  (`node scripts/run-api-suite.cjs integration sale-`) para depuração. Com
  filtro, a checagem de "nenhum teste pulado" é ignorada — ela só faz sentido
  na suíte completa.

### Testes atualizados para a regra nova

- [x] `e2e-cadeia-insumo-produto.test.ts` — reescrito para **dois usuários**.
  Passou a exercitar: recusa de auto-aprovação da requisição
  (`D-K-REQUISICAO`), aprovação do pedido pelo segundo administrador, recusa
  de liberação de lote sem inspeção (`G7` / `no_inspection`) seguida de
  inspeção aprovada e liberação amarrada à evidência
  (`release_inspection_id`), recusa de embarque de importação sem diretoria
  (`G11-COMEX`) e de auto-aprovação (`D-K-COMEX`), e recusa de estrutura
  paralela (`G1-ESTRUTURA-DUPLA`).
  **Os 4 contornos BUG-01…BUG-04 foram removidos** — as colunas `NOT NULL`
  indevidas caíram na migration `20260810-000028` e os caminhos de API (BOM,
  cliente, venda, confirmação) voltaram a funcionar; contorno vivo depois da
  correção esconde a próxima regressão. O gate G16 passou a montar a árvore
  por BOM (fonte única do G1) em vez de `item_estruturas`.
- [x] `sale-quote-confirm.test.ts` — **afirmava o comportamento pré-G9 como
  correto** ("confirmar DEBITA o estoque"), que é justamente o que o G9
  corrigiu por contrariar o Ajuste SINIEF 07/05 cl. 9ª §1º. Passou a medir os
  dois números que hoje importam: `quantity` não muda, `reserved_quantity`
  sobe, e o cancelamento devolve a reserva.
- [x] `material-requisition-flow.test.ts`,
  `purchase-receipt-duplicate-invoice.test.ts`,
  `purchase-receive-concurrency.test.ts`,
  `traceability-and-audit-log-regression.test.ts`,
  `quality-releases-receiving-lot.test.ts` — aprovação de pedido movida para
  `approverToken()`. O último ganhou também o registro de inspeção (G7) antes
  da liberação do lote.

### Verificação

- [x] `npm run test:integration` → **36/36 suítes, 124/124 testes**, duas
  rodadas seguidas · `Jest sem skips` verde
- [x] As **3 guardas verdes**: `schema-model-drift-guard`,
  `column-name-drift-guard`, `enum-literal-guard`
- [x] `npm run typecheck` limpo
- [x] `npx jest tests/unit --runInBand` → **1807/1807** (166 suítes), sem queda
- [x] `npm run test:edge:strict` → 3/3
- [x] Servidor sobe (`/health/ready` 200)

### Pendências que esta entrega deixa

- [ ] **Guarda para a variante "`null` explícito em coluna `NOT NULL` COM
  default"** — a que deixou passar os dois bugs de hoje. Levantamento feito:
  há **69** colunas nessa condição declaradas nulláveis nos models. Uma guarda
  por schema seria ruído (a maioria nunca recebe `null` explícito); o sinal
  real está no código — o padrão `this.<campo> = props.<campo> ?? null` dentro
  de `domain/entities/`. Uma varredura estática ingênua devolve 13 candidatos,
  a maioria falso-positivo por casar só pelo nome da coluna (não há mapeamento
  declarativo entidade→tabela). **Fechar isto de verdade exige o item 3 do
  documento de classe de defeito: um `POST` com payload mínimo contra cada
  endpoint de criação, no Postgres real.** Recomendado como próxima frente.
- [ ] **`BomService.createBOM` só aceita `product_type = 'finished'`.** Como o
  G1 fez o MRP ler exclusivamente a BOM ativa, um **subconjunto
  (`semi_finished`) não pode ter estrutura própria** — o gate G16 do E2E só
  roda porque tipa o subconjunto como `finished`, o que está comentado no
  teste. Restrição anterior a esta rodada; precisa de **decisão do dono** (a
  alternativa é a árvore multinível dentro da BOM do produto acabado, via
  `bom_level` / `parent_item_id`, que existe no schema mas não é o que o
  `bomStructureProjection` projeta hoje).
- [ ] **`POST /api/inventory/lots/:id/release` com id não numérico responde
  500** ("Erro ao processar operação no banco de dados") em vez de 400. Achado
  incidental: apareceu porque o E2E, ao falhar numa etapa anterior, mandava
  `undefined` na URL. Outros endpoints (rastreabilidade) já validam o
  parâmetro e respondem 400 — este não. Baixo impacto, mas é inconsistência de
  contrato.

---

## 2026-08-11 — Auditoria do MRP: os 2 defeitos CRÍTICOS fechados

Escopo: **só** os dois críticos apontados pela auditoria de 2026-08-11 (mais o
achado BAIXO 15, que estava no mesmo caminho de código). Nada de schema mudou —
não há migration nesta entrega.

### Crítico 1 — netagem multi-demanda (a fábrica comprava a menos)

- [x] `GenerateMrpPlanUseCase` deixou de chamar `calculateMrpPlan([demand])`
  **por demanda** com o estoque íntegro. Agora neta **uma vez** sobre a demanda
  agregada e rateia a necessidade líquida por origem, proporcional à bruta de
  cada origem (`origem`/`origem_id` preservados).
  Evidência: `server/tests/integration/mrp-multi-demand-netting.test.ts` —
  **reprovava antes** da correção (o plano voltava com ZERO linhas para o
  cenário 100+100 contra 100 disponíveis) e passa depois, com a soma da
  necessidade líquida em exatamente 100. Aritmética do rateio (resto de
  arredondamento, participações desiguais, origem repetida, demanda única):
  `server/tests/unit/mrp-multi-demand-allocation.test.ts`, 5 casos.
- [x] Rateio isolado em módulo próprio, com o racional das decisões:
  `server/src/modules/mrp/application/use-cases/support/allocatePlanByOrigin.ts`.

### Crítico 2 — reexecução do plano duplicava requisição

- [x] `SequelizeMrpRepository.upsertPlannedOrders` não reescreve mais `status`
  no UPDATE (linha nova segue nascendo `RASCUNHO` via `defaults`).
- [x] `createRequisitionFromPlannedOrders` virou idempotente: ignora ordem fora
  de `RASCUNHO`/`APROVADA`, deduplica a mesma ordem repetida no lote e devolve
  `null` — sem criar cabeçalho vazio — quando não há nada a converter.
- [x] Efeito colateral corrigido: as ordens devolvidas por `POST /api/mrp/plan`
  diziam `RASCUNHO` mesmo depois de promovidas a `EM_EXECUCAO` (o UPDATE era
  por `where id in`). Como o controller decide gravar o audit log
  `mrp_auto_convert_to_requisition` olhando esse status, **o log da conversão
  automática nunca era escrito**. Passou a ser.
  Evidência: `server/tests/integration/mrp-rerun-idempotency.test.ts` — três
  rodadas do mesmo plano, uma ordem e **uma** requisição
  (antes da correção: 3 requisições e a ordem rebaixada a cada rodada).
  Unitário do helper: `server/tests/unit/mrp-requisition-helper-idempotency.test.ts`.

### Achado BAIXO 15 — numeração da requisição

- [x] `RQ-<timestamp>` → série anual `RQ-YYYY-NNNN`, emitida por
  `SequelizePurchaseRequisitionRepository.nextRequisitionNumberForYear`
  (advisory lock `41003` + `MAX`, mesmo padrão da numeração de OP do G16).
  Aplicado nos **dois** caminhos de criação (MRP e requisição manual).
  Verificado no banco de teste: `RQ-2026-0001` … `RQ-2026-0004`; os números
  legados continuam no histórico e são ignorados pela geração.

### Ferramental

- [x] `scripts/run-api-suite.cjs`: o filtro de depuração passava
  `--testPathPattern`, removido no Jest 30 — o Jest abortava com código 1
  **antes** de rodar qualquer teste, e a falha parecia "suíte reprovou".
  Corrigido para `--testPathPatterns`.

### Suítes (execução real, 2026-08-11)

- [x] `npm run typecheck` (server) → verde
- [x] `npm run test:unit` → **1826/1826** (170 suítes)
- [x] `npm run test:integration` → **179/179** (47 suítes), incluindo as
  guardas de drift (schema×model, nome de coluna, literal de enum,
  cross-database, docs×realidade, cobertura de auditoria)

### Pendências que esta entrega deixa

- [ ] **`origem_id NULL` não é protegido pelo índice único**
  `uq_mrp_sem_duplicidade`: no PostgreSQL, `NULL` é distinto de `NULL`, então
  duas rodadas concorrentes do MRP com demanda `MANUAL` (sem documento de
  origem) podem inserir duas linhas iguais — o `findOrCreate` resolve o caso
  sequencial, não o concorrente. Correção seria índice único parcial com
  `COALESCE(origem_id, '00000000-...')` ou `NULLS NOT DISTINCT` (PG 15+).
  Nenhum caso observado; a rodada do MRP hoje é síncrona e humana.
- [ ] **Rateio não reabre requisição já emitida.** Se uma rodada posterior
  aumentar a necessidade de uma ordem já convertida (`EM_EXECUCAO`), a
  quantidade da ordem é recalculada mas a requisição correspondente **não** é
  ajustada nem uma complementar é criada. É o comportamento conservador
  (melhor não comprar sozinho do que comprar duas vezes), mas precisa virar
  sinal na tela do planejador — hoje é silencioso.
- [ ] **Base do rateio é a necessidade bruta, não a data.** Quando duas origens
  disputam o mesmo saldo, cada uma leva a parcela proporcional ao que pediu.
  A alternativa — quem precisa antes leva o estoque — é alocação por
  prioridade e muda a decisão de compra; é assunto do dono do processo, não de
  uma correção de defeito.

---

## 2026-08-11 — 5 brechas de severidade ALTA da auditoria (working tree)

Entrega separada da correção do MRP acima. As cinco brechas tinham a mesma
assinatura: **a regra existia, mas era satisfeita por um caminho lateral.**

- [x] **G6 — linha de apontamento VAZIA destravava a partida da OP.**
  `assertOrderCanStart` contava linhas, e `POST /production-orders/:id/tracking`
  aceita `production_route_step_id: null`. Agora exige lastro de roteiro
  (linha ligada a etapa **ou** roteiro ativo do produto), novo código
  `G6-START-NO-ROUTE-STEP`. Apontar à mão **depois** da partida continua
  livre. Provado em `tests/integration/production-start-manual-tracking-bypass.test.ts`
  (reprovava antes da correção) e em `tests/unit/production-start-gate-route-step-g6.test.ts`.
- [x] **G7 — lote bloqueado era re-liberado com a inspeção de ANTES do
  bloqueio.** Migration `20260811-000044-lot-blocked-at-quality-gate.cjs`
  (`lot_controls.blocked_at`) **aplicada nos dois bancos**; a liberação exige
  `inspected_at > blocked_at` e passou a rodar em transação com `FOR UPDATE`.
  Os dois caminhos de bloqueio (endpoint e RNC) gravam a data. Provado em
  `tests/integration/quality-release-after-block.test.ts`.
- [x] **`PRODUCTION_TRACKING_REQUIRED=warn` desligava G4+G6 sem nenhuma
  declaração no repositório.** Passou a ser validada no boot
  (`src/config/runtimeEnv.ts`): com `NODE_ENV=production`, `warn` **derruba o
  boot**. Documentada em `.env.example` (raiz e `server/`) e em
  `docs/tributario/04-BLOCO_K.md`. Unitário: `tests/unit/runtime-env-production-tracking.test.ts`.
- [x] **G11 — alçada de importação dependia de default permissivo.**
  `is_foreign` virou **obrigatório** na criação de fornecedor (era opcional,
  com `DEFAULT false`); `POST /api/purchases` grava a origem **efetiva**
  (fornecedor estrangeiro nunca fica registrado como compra nacional) e recusa
  `origin='import'` com fornecedor nacional (`G11-ORIGIN-SUPPLIER-MISMATCH`),
  na criação e na aprovação. Provado em
  `tests/integration/purchase-origin-foreign-supplier.test.ts`.
- [x] **G1 — BOM aceitava ciclo multinível.** Só a auto-referência era barrada;
  `A→B` seguido de `B→A` entrava no banco e só estourava na explosão (produto
  que não conclui OP). Detecção de caminho no espaço de `products.id`
  (`bomStructureProjection.hasProductPathBetween`), 422 `G1-BOM-CICLO`.
  Provado em `tests/integration/bom-cycle-multilevel.test.ts`.

### Suítes (execução real, 2026-08-11)

- [x] `npm run typecheck` (server) → verde | `client`: `npx tsc -b` → verde
- [x] `npm run test:unit` → **1848/1848** (172 suítes)
- [x] `npm run test:integration` → **196/196** (51 suítes), incluindo as
  guardas de drift (schema×model, nome de coluna, literal de enum,
  cross-database, docs×realidade, cobertura de auditoria)
- [x] `npm run test:edge:strict` → 3/3

### Pendências que esta entrega deixa

- [ ] **Fornecedores cadastrados ANTES de 2026-08-11 podem estar com
  `is_foreign = false` por omissão, não por decisão.** A obrigatoriedade vale
  só para cadastros novos; nenhum backfill é possível por código (é informação
  de negócio). Compras precisa revisar a lista de fornecedores e marcar os
  estrangeiros — enquanto não fizer, uma importação daquele fornecedor
  continua passando por baixo da alçada se o pedido não declarar `import`.
- [ ] **Lotes já `blocked` antes da migration ficam com `blocked_at = NULL`** e
  seguem liberáveis pela regra antiga (grandfathering deliberado, sem
  backfill — inventar data retroativa travaria material que a Qualidade pode
  já ter tratado). Do próximo bloqueio em diante, todos entram na regra nova.
- [ ] **A tela de fornecedores (`client/`) ganhou o campo "Origem"**, mas o
  restante do `client/` que cria fornecedor por outros caminhos (se houver)
  precisa da mesma declaração — varredura não encontrou outro ponto.

---

## 2026-08-12 — As 2 provas de integração que faltavam (working tree)

Terceira entrega do mesmo working tree (convive com a correção do MRP e com
as 5 brechas ALTAS acima; nenhuma delas foi tocada). A auditoria de
2026-08-11 apontou dois comportamentos **afirmados na documentação e nunca
executados contra o PostgreSQL** — os dois estavam cobertos apenas por
suítes unitárias com repositório dublê, que não tem coluna `NOT NULL`, nem
`ENUM`, nem `DEFAULT`. É exatamente a classe de defeito descrita em
`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.

### G13 — `tests/integration/g13-payable-receivable.test.ts` (novo, 8 testes)

- [x] Pedido de compra **aprovado** e depois **enviado** não gera nenhuma
  linha em `accounts_payable` (CPC 00 R2 4.56 — contrato executório).
- [x] O **recebimento** cria a conta a pagar na mesma transação, com
  `status='pending'`, `payment_date IS NULL`, `amount_paid = 0`,
  `approved_by IS NULL` e `approval_date IS NULL` (quem recebe não aprova
  pagamento), `category='Fornecedores'` e o rastro `purchase_id`/
  `supplier_id`/`invoice_number`.
- [x] **Recebeu metade, deve a metade:** entrega de 60 de 100 gera AP de
  R$ 450,00 (não os R$ 750,00 do pedido); a segunda entrega gera a segunda
  AP de R$ 300,00 e a soma fecha o pedido.
- [x] Vencimento: sem `due_date`, `invoice_date + 30`; com `due_date`
  informado, o negociado prevalece.
- [x] Venda **confirmada** não gera nenhuma linha em `accounts_receivable`
  (CPC 47 item 108 — direito ainda condicional).
- [x] A **NF-e autorizada** cria as 3 parcelas, todas `pending`,
  `payment_date IS NULL`, `collection_status='normal'`, com o número da nota
  em `invoice_number`, e a soma **exatamente** igual ao valor da nota
  (R$ 1.250,00 divididos em 416,66 + 416,66 + 416,68).
- [x] Cada asserto financeiro é feito duas vezes: pela API e por **SQL cru**
  nomeando coluna a coluna — é assim que drift de coluna/enum/default
  aparece em vez de passar batido.
- [x] O cenário da venda respeita o gate **D-L**: o lote nasce em quarentena
  no recebimento (G14), é inspecionado e liberado pela Qualidade (G7) e
  transferido INSUMOS→ACABADOS antes do faturamento.

### G7/MRP — `tests/integration/mrp-quarantine-discount.test.ts` (novo, 7 testes)

- [x] Cenário com 45 livres (entrada avulsa, sem lote) + 60 em **quarentena**
  (recebimento de compra) + estoque de segurança 5: o MRP enxerga **40**, não
  100. Demanda de 100 — que caberia no saldo físico — gera necessidade
  líquida de 60. Sem o desconto, a linha simplesmente não existiria e o plano
  voltaria vazio.
- [x] O desconto é de **leitura**: `products.quantity` continua 105 e
  `lot_controls` continua com 60 retidos (conferido por SQL cru), como manda
  a decisão de projeto de `services/quarantineBalanceService.ts`.
- [x] Liberado o lote pela Qualidade (inspeção aprovada + release), a mesma
  demanda de 160 cai de 120 para 60 de necessidade líquida — queda de
  **exatamente** os 60 que estavam retidos.
- [x] A suíte usa **uma demanda por rodada** de propósito: com origem única o
  rateio de `allocatePlanByOrigin` devolve a linha integral, então
  `estoque_disponivel` é o número agregado, sem parcela no meio.

### Suítes (execução real, 2026-08-12)

- [x] `npm run typecheck` (server) → verde
- [x] `npm run test:unit` → **1848/1848** (172 suítes) — nenhuma regressão
- [x] `npm run test:integration` → **211/211** (53 suítes), rodada limpa
- [x] Rodada anterior à limpa: 210/211, com falha de *timeout de 5s* em
  `quality-releases-receiving-lot`; a rodada de baseline (antes destes dois
  arquivos) já falhava do mesmo jeito, em arquivos diferentes a cada
  execução — ver "Achados" abaixo.

### Achados desta entrega

- [ ] **O plano de MRP cresce mas nunca encolhe.** Provado por consulta ao
  banco depois da suíte nova: a ordem planejada criada quando o material
  estava em quarentena (comprar 60) **permanece em `mrp_ordens_planejadas`
  como `RASCUNHO`** depois de o lote ser liberado, quando a necessidade real
  passou a ser zero — e continua conversível em requisição de compra
  (`POST /api/mrp/planned-orders/convert`). Causa: o upsert de
  `SequelizeMrpRepository.upsertPlannedOrders` só toca as linhas que o motor
  devolveu, e `calculateMrpPlan` filtra `plannedQuantity > 0`; linha que
  deixou de ser necessária não é revisitada. É o **espelho** do CRÍTICO 1 da
  auditoria de 2026-08-11 (aquele comprava a menos; este compra a mais).
  Não corrigido nesta entrega de propósito: a correção exige decidir o que
  fazer com a linha órfã (zerar? novo status? apagar?) e o ENUM de
  `mrp_ordens_planejadas.status` não tem valor para "não é mais necessária" —
  é decisão de processo, não de teste. Registrado no JSDoc da etapa 7 de
  `tests/integration/mrp-quarantine-discount.test.ts`.
- [x] **A suíte de integração é intermitente por timeout de 5 s.** Nenhum
  arquivo de `tests/integration/` define `jest.setTimeout`, e o default do
  Jest é dimensionado para teste unitário. Em 4 execuções houve 3 falhas, em
  3 arquivos **diferentes** (`rbac-maintenance-service-orders-access-denied`,
  `traceability-and-audit-log-regression`,
  `quality-releases-receiving-lot`), sempre por estouro de 5 s sob carga —
  duas delas em rodadas **anteriores** aos arquivos novos. Os dois arquivos
  desta entrega já nascem com `jest.setTimeout(60_000)`; os outros 51
  continuam expostos. Uma suíte que reprova por sorte treina o time a
  reexecutar até passar, que é o oposto do que uma rede de segurança faz.
  **Resolvido em 2026-08-19:** `scripts/run-api-suite.cjs` agora passa
  `--testTimeout=60000` para as suítes API de forma centralizada, com override
  opcional por `API_SUITE_TEST_TIMEOUT_MS`. Guarda unitária:
  `tests/unit/run-api-suite-timeout-guard.test.ts`. Evidência:
  `npm --prefix .\server run test:unit` → 183/183 suítes, 1965/1965 testes;
  `npm --prefix .\server run test:integration` → 61/61 suítes, 250/250 testes.
- [ ] **`estoque_retido_qualidade` não chega a nenhum payload.**
  `SequelizeItemRepository.listMrpInventoryPositions` calcula o campo (e
  `estoque_fisico`), mas nada é propagado para `mrp_ordens_planejadas` nem
  para a resposta de `POST /api/mrp/plan`. Na prática, o planejador vê o
  estoque disponível cair e **não tem como saber que a causa é a Qualidade**.
  Não é defeito de regra — a conta está certa —, é falta de explicação na
  tela. A verificação direta hoje só é possível por SQL, que é como a suíte
  nova faz.

---

## 2026-08-12 — BLOCO 6 RH: Afastamentos, Benefícios e Treinamentos (Grupos 7/8/9) — `programador`

Backend completo das 3 sub-áreas do RF-RH-044 a 059 (Afastamentos,
Benefícios, Treinamentos), sobre as tabelas já existentes (migrations
`20260808-000020/021/022`). Contrato de API: `docs/business/BLOCO_6_RH_API.md`
§9/§10/§11. Trabalho restrito a `server/` (frontend é escopo de outro agente).

### Entregue

- [x] **6 models Sequelize novos** (`HrAbsence`, `HrBenefitType`,
  `HrEmployeeBenefit`, `HrTrainingCourse`, `HrJobPositionTraining`,
  `HrEmployeeTraining`), registrados em `src/models/index.ts` com
  associações (`as:`).
- [x] **16 endpoints novos** em `/api/rh` (5 Afastamentos, 7 Benefícios, 6
  Treinamentos — na prática 16 rotas HTTP, `POST /training-courses` e
  `PUT .../:id` contam junto no grupo 9), Clean Architecture completa
  (domain/repositories + domain/services + application/use-cases +
  infrastructure/sequelize + presentation/controllers), seguindo o padrão
  de `admissionController`/`vacationController` já existentes no módulo.
- [x] **`CreateAbsenceUseCase` transacional**: cria o afastamento, move
  `employees.status='license'`, suspende `suspended_days` de benefícios
  VT/VR ativos (RF-RH-047) e — quando o tipo é `auxilio_doenca_inss`/
  `acidente_trabalho` e o acumulado no período aquisitivo em curso passa de
  6 meses (Art. 133, IV, CLT) — zera o período **na mesma transação**,
  reaproveitando `ResetVacationAccrualPeriodUseCase`/
  `OpenVacationAccrualPeriodUseCase` já existentes do Grupo 6 (Férias),
  agora estendidos para aceitar `transaction` (mudança aditiva, retrocompatível).
  É o gatilho que a entrega de 2026-08-09 deixou registrado como pendente
  ("RF-RH-041, cujo use case já existe... mas hoje não tem quem o chame").
- [x] **`ReturnFromAbsenceUseCase`** reaproveita o gate de ASO já existente
  (`domain/services/asoGate.ts#hasValidAso`) — afastamento > 30 dias exige
  `HrEmployeeDocument` tipo `aso_retorno` válido antes de reverter
  `employees.status` para `active`.
- [x] **`cid` (dado de saúde, LGPD art. 5º II)** segue exatamente o desenho
  já decidido pelo dono do produto em 2026-08-09
  (`domain/services/rhSensitiveFields.ts`, interseção `rh`+`sst`/admin) —
  as funções `canViewAbsenceCid`/`sanitizeAbsence` já existiam, prontas e
  testadas, sem consumidor; agora `absenceController` é o primeiro
  consumidor real.
- [x] **`CreateEmployeeBenefitUseCase`**: limite de 6% de VT sobre o
  salário (lido sempre do repositório, nunca do payload — evita spoofing),
  `dependents` restrito a `saude`/`odonto`, bloqueio de adesão duplicada
  ativa. **Cancelamento nunca é `DELETE`** — o banco já tem trigger
  bloqueando a exclusão física (`trg_hr_block_delete_employee_benefit`);
  `CancelEmployeeBenefitUseCase` sempre grava `enrollment_status='cancelado'`.
- [x] **`GetMonthlyBenefitReportUseCase`** — `hr_employee_benefits` não tem
  coluna de competência; "vigente na competência" é derivado por
  `enrolled_at <= fim do mês` e (`canceled_at` nulo OU `>= início do mês`)
  (decisão desta implementação, documentada no JSDoc do use case).
- [x] **`CreateEmployeeTrainingUseCase`**: `valid_until` sempre calculado no
  servidor (`completed_at + TrainingCourse.validity_months`, com saturação
  de fim de mês igual à de `vacationRules.calculateConcessiveEnd`); warning
  quando o curso é normativo (RF-RH-059, sem integração síncrona com SST
  nesta rodada — decisão já registrada no contrato de API, mantida).
- [x] **`GetCannotOperateReportUseCase`** (RF-RH-058): funcionários ativos
  com cargo cuja matriz (`HrJobPosition × HrTrainingCourse`,
  `hr_job_position_trainings`) exige treinamento ausente/vencido. Exigiu
  estender `EmployeeDirectoryService` com `listActiveWithJobPosition` e
  `updateStatus` (usado também pelo fluxo de afastamento).
- [x] **+107 testes unitários novos** em 2 arquivos
  (`rh-block6-extension-rules.test.ts` — regras puras; `rh-block6-extension-use-cases.test.ts`
  — use cases com repositório dublê), suíte unitária completa
  **1902/1902** (175 suítes), `npm run typecheck` limpo,
  `audit-coverage-guard` verde sem precisar entrar em `DEBITO_CONHECIDO`
  (todo controller de escrita novo chama `logAction`).
- [x] **1 arquivo de integração novo** (`tests/integration/rh-block6-extension.test.ts`),
  3 fluxos ponta a ponta contra Postgres real (afastar→retornar,
  aderir→cancelar benefício, criar curso→registrar conclusão), com
  asserção de `audit_logs` via `GET /api/audit-logs?entity_type=...&entity_id=...`
  em cada um. `npm run test:integration` → **221/221** (54 suítes), rodada
  limpa (o banco de teste local não existia — criado via
  `CREATE DATABASE erp_evok_audio_test` — e o banco de dev estava 1
  migration atrás do de teste — `npm run migration:up` resolveu; nenhuma
  das duas causas é deste bloco).

### Decisões tomadas além das listadas no enunciado

- [x] **`ResetVacationAccrualPeriodUseCase`/`OpenVacationAccrualPeriodUseCase`
  ganharam `transaction` opcional** (antes não aceitavam) para o zeramento
  de período por afastamento acontecer na MESMA transação da criação do
  afastamento — mudança aditiva, sem quebrar os chamadores existentes.
- [x] **`EmployeeDirectoryService` ganhou 2 métodos novos**
  (`updateStatus`, `listActiveWithJobPosition`) — a interface original só
  cobria admissão/demissão/férias; afastamento e o relatório de
  treinamentos precisavam de leitura/escrita adicionais de `employees` sem
  reintroduzir `require('models/index')` dentro de use case.
- [x] **`GET /api/rh/employee-benefits/monthly-report` e
  `GET /api/rh/employee-trainings/cannot-operate-report` entram ANTES das
  rotas com parâmetro** no router (mesmo padrão já usado para
  `/vacation-schedules/calendar`), para não colidir com uma futura rota
  `GET /employee-benefits/:id`/`GET /employee-trainings/:id` que o
  contrato de API não previu nesta rodada.
- [x] **`enum-literal-guard`**: `GetCannotOperateReportUseCase` usa
  `reason: 'ausente' | 'vencido'` como discriminador de retorno em memória
  (não é coluna) — adicionada 1 entrada em `KNOWN_NON_DB_LITERALS`, mesmo
  padrão já usado para os outros DTOs em memória do projeto.
- [x] **Migration `20260811-000044-lot-blocked-at-quality-gate` aplicada no
  banco de desenvolvimento** (`npm run migration:up`) — estava só no banco
  de teste, o que fazia `cross-database-drift-guard` reprovar; achado
  incidental, não relacionado a este bloco, corrigido porque bloqueava
  `npm run test:integration` completo.

### Pendências que ficam registradas (não resolvidas nesta rodada, por decisão já tomada em documento anterior)

- [x] **Integração síncrona `rh`↔`sst` para `validity_months` de curso
  normativo (RF-RH-059)** — **RESOLVIDO em 2026-08-12** (decisão do dono,
  RF-INT-RH-SST-01): `CreateTrainingCourseUseCase`/`UpdateTrainingCourseUseCase`
  agora consultam `TrainingMatrixServiceAdapter` (novo, chama
  `ListTrainingMatrixUseCase` de `modules/sst/`) e gravam a validade da
  matriz quando o `nr_code` está cadastrado/ativo (`validity_source:
  'sst_matrix'`); fora desse caso, mantém o `warning` textual de sempre.
  `GET /api/sst/training-matrix` passou a aceitar `sst`|`rh`
  (`requireSstOrRh`, middleware já existente reaproveitado). Provado por
  `server/tests/unit/rh-block6-extension-use-cases.test.ts` (describe
  `RF-INT-RH-SST-01`) e `server/tests/integration/rh-block6-extension.test.ts`
  (2 fluxos novos, Postgres real). `CreateEmployeeTrainingUseCase`
  (conclusão) continua emitindo o aviso de sempre — fora do escopo desta
  correção, registrado como risco residual em `docs/governance/HANDOFF_CODEX.md`
  (entrada 2026-08-12, 2ª).
- [ ] **`hr_job_position_trainings` (matriz cargo × treinamento) não tem
  CRUD de rota** nesta entrega — é escopo do Grupo 1 (Cargos), fora deste
  bloco; `GetCannotOperateReportUseCase` já lê a tabela, mas populá-la
  hoje só é possível via SQL direto/seed.
- [x] **Suspensão de benefício (RF-RH-047) não é revertida automaticamente
  no retorno do afastamento** — **RESOLVIDO em 2026-08-12** (decisão do
  dono, RF-RH-047-A): `ReturnFromAbsenceUseCase` agora roda em transação e
  reativa (`suspended_days` decrementado pelo mesmo total somado por
  `CreateAbsenceUseCase`) os benefícios VT/VR ainda ativos suspensos por
  este afastamento; resposta ganhou `reactivated_benefits`. Provado por
  `server/tests/unit/rh-block6-extension-use-cases.test.ts` (2 casos novos
  em `ReturnFromAbsenceUseCase`) e
  `server/tests/integration/rh-block6-extension.test.ts` (fluxo
  suspende→confere→retorna→confere, Postgres real).
