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

- [ ] Criar migration `access_profiles` (id, `nome` único, `descricao`,
  `active` boolean default true, `criado_por` FK `users`, timestamps)
- [ ] Criar migration `access_profile_permissions` (id, `access_profile_id`
  FK, `module` (enum ou string validada contra lista fixa de módulos —
  ver `BUSINESS_RULES.md` §1), `level` enum `none|view|operate|approve`,
  unique `(access_profile_id, module)`)
- [ ] Adicionar `access_profile_id` (FK nullable) e `access_level`
  (enum `operador|gestor`, nullable) em `users`
- [ ] **NÃO obrigatório nesta entrega** — `permission_version` (campo
  análogo a `password_version`, que invalidaria a sessão na troca de
  perfil): **decisão do dono foi "vale no próximo login, sem derrubar a
  sessão ativa"** (UC-36) — este campo **não deve ser criado** neste
  bloco. Fica registrado apenas como **melhoria futura opcional**, a ser
  avaliada em sprint separada caso o negócio queira, no futuro, forçar
  consistência imediata de sessão/menu. Não bloqueia nem faz parte do
  escopo atual do Bloco 1.
- [ ] Seed inicial com a matriz proposta em `BUSINESS_RULES.md` §1 (11
  perfis de departamento — RH pendente de módulo próprio, ver nota no
  §1)
- [ ] Script de validação pós-migration (padrão já usado no projeto em
  `server/src/scripts/backfill/*_validation.sql`): nenhum usuário
  `role != admin` deve ficar com `access_profile_id` obrigatoriamente
  preenchido de forma automática — decisão do dono (UC-35-Exceção) é
  **bloqueio total com aviso**: o backfill inicial deve deixar
  `access_profile_id = null` para usuários existentes sem perfil
  definido (eles caem no fluxo UC-35-Exceção até o admin atribuir um
  perfil), não atribuir um perfil "provisório" arbitrário

### 1.2 Backend — Middleware e Endpoints

- [ ] Criar middleware `authorizeModule(module, minLevel)` em
  `server/src/middlewares/` (não substituir `authenticate`/`authorize`
  existentes — compor em camada, conforme risco documentado em
  `BUSINESS_RULES.md` §8)
  - [ ] Curto-circuito: `req.user.role === 'admin'` sempre libera (§3)
  - [ ] Resolve o módulo dono da ação (não o módulo de origem do dado —
    UC-37 cenário "Qualidade libera lote do Recebimento")
  - [ ] Para ações que exigem `approve`: checar também
    `req.user.access_level === 'gestor'` (fórmula completa em
    `BUSINESS_RULES.md` §4)
  - [ ] Usuário sem `access_profile_id`: aplicar a política **decidida**
    em UC-35-Exceção — bloqueio total, com aviso didático ("Seu acesso
    ainda não foi configurado — procure o administrador"), apenas "Meu
    Perfil" acessível
  - [ ] Registrar tentativa negada em log de auditoria (`access_denied`)
- [ ] CRUD de perfis: `POST/GET/PUT /api/access-profiles`,
  `PATCH /api/access-profiles/:id/status` (UC-30, UC-31, UC-32)
  - [ ] Validação: nome único (409), ao menos um módulo ≠ `none` (422)
  - [ ] Auditoria completa com `oldValues`/`newValues` (§5) — copiar
    padrão já usado em `ChangePurchaseRequisitionStatusUseCase`/`logAction`
  - [ ] UC-32: implementar a regra **decidida** pelo dono — **bloquear**
    a desativação (422) enquanto houver usuário ativo vinculado ao
    perfil, listando os usuários afetados na resposta; a desativação só
    é permitida depois que o admin realocar (UC-33) todos os usuários
    vinculados para outro perfil
- [ ] Atribuição de perfil a usuário: `PATCH /api/users/:id/access-profile`
  (UC-33)
  - [ ] Validar perfil ativo
  - [ ] **Não** incrementar nenhuma versão de sessão/token ao trocar o
    perfil (decisão do dono, UC-36: "vale no próximo login" — a troca é
    apenas persistida no banco, sem efeito de invalidação de sessão)
- [ ] Endpoint de menu resolvido: incluir no payload de login (ou
  `GET /api/auth/me/menu` dedicado) a lista de módulos visíveis + nível,
  já filtrada pelo perfil (UC-34)
- [ ] Aplicar `authorizeModule` em **todas** as rotas de módulo existentes
  (auditoria de rota por rota — trabalho extenso, sugerir dividir por
  módulo em sub-tarefas/PRs separados: vendas, compras, estoque, produção,
  qualidade, laboratório, engenharia, financeiro, patrimônio,
  rastreabilidade, relatórios)
- [ ] Resolver o risco de convivência com checagens de `role` legadas
  (§8) — decidir, por endpoint já existente com checagem hard-coded (ex.:
  aprovação de requisição UC-23, cash-flow UC-29), se a checagem antiga é
  substituída pela nova ou mantida em conjunto; documentar a decisão

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

- [ ] Consumir o menu resolvido do backend (UC-34) em
  `client/src/layouts/AppLayout.tsx` — substituir o menu estático atual
  por renderização condicionada aos módulos retornados
- [ ] Tela "Acesso Negado" para navegação direta por URL fora do perfil
  (UC-35)
- [ ] Tela "Usuários > Perfis de Acesso": listagem, criação, edição
  (matriz de módulo × nível em formato de checklist/tabela), desativação
- [ ] Tela de edição de usuário: seletor de perfil + nível
  (operador/gestor)
- [ ] **Não é necessário** tratamento de "Sessão invalidada" para troca
  de perfil nesta entrega — decisão do dono (UC-36) é que a troca vale no
  próximo login, sem forçar logout. O tratamento de 401 já existente para
  `password_version`/usuário inativo permanece intacto e **é** o
  mecanismo a orientar o admin a usar quando precisar de revogação
  imediata (desativar o usuário, ver UC-36 "mitigação")
- [ ] Estado "sem perfil atribuído": tela reduzida mostrando apenas "Meu
  Perfil" com o aviso didático "Seu acesso ainda não foi configurado —
  procure o administrador" (UC-35-Exceção, texto oficial do dono)

### 1.5 QA — Casos de Teste dos 403

- [ ] Teste de integração: usuário com perfil sem módulo X → GET/POST/PUT/
  DELETE no módulo X retornam 403, corpo sem vazamento de dados
- [ ] Teste: usuário com `view` tenta escrever → 403
- [ ] Teste: usuário com `operate` tenta ação que exige `approve` → 403
- [ ] Teste: usuário `gestor` com `approve` no módulo → ação permitida
- [ ] Teste: usuário `operador` com módulo `approve` (nível de módulo),
  mas `access_level = operador` → 403 (segunda trava, UC-37)
- [ ] Teste: `admin` global nunca bloqueado, mesmo sem perfil (§3)
- [ ] Teste: usuário sem `access_profile_id` → política de UC-35-Exceção
- [ ] Teste: Dashboard retorna apenas cards dos módulos do perfil (UC-38)
- [ ] Teste: Relatório cruzado exige sub-permissão própria, não herdada
  de módulos isolados (UC-38)
- [ ] Teste: auditoria registrada em toda criação/edição/atribuição de
  perfil, com `oldValues` correto na edição (§5)
- [ ] Teste E2E: Qualidade libera lote criado pelo Recebimento (permissão
  avaliada pelo módulo da ação, não pela origem do dado — UC-37)

---

## Bloco 2 — Requisição de Amostra da Engenharia (UC-39)

**Depende de:** Bloco 4 (Depósitos) para o destino físico da amostra —
implementar em conjunto ou sequenciar Bloco 4 antes deste item de
roteamento de depósito.

### 2.1 AdmDBA

- [ ] Adicionar valor `engineering_sample` ao enum/domínio de `origin` de
  `purchase_requisitions` (confirmar mecanismo já usado para adicionar
  valores de enum no projeto — ver
  `server/migrations/20260803-000002-add-quarantine-lot-status.cjs` como
  precedente de `ALTER TYPE ... ADD VALUE`)
- [ ] Adicionar `justificativa` (text, nullable — obrigatório só para
  `engineering_sample`, validado em código) e `project_id` (FK nullable
  para `engineering_projects`) em `purchase_requisitions`, se ainda não
  existirem campos equivalentes

### 2.2 Backend

- [ ] Endpoint/variante de criação de requisição aceitando
  `origin='engineering_sample'`, `project_id` opcional, `justificativa`
  obrigatória nesse caso (validação Zod condicional)
- [ ] Reaproveitar 100% do workflow de aprovação/conversão já existente
  (UC-23/UC-25) — nenhuma nova máquina de estados
  - [ ] Sinalizar o item no Recebimento com badge de origem (campo
    `origin` já propagável do pedido/requisição até a tela de recebimento)
- [ ] Integração com Bloco 4: recebimento de item com requisição de
  origem `engineering_sample` direciona entrada para o Depósito do
  Laboratório (roteamento, ver `BUSINESS_RULES.md` §12 item 7)

### 2.3 Frontend

- [ ] Tela "Engenharia > Solicitar Amostra" (formulário simplificado
  sobre a criação de requisição existente, pré-preenchendo `origin`)
- [ ] Badge "Amostra — Engenharia" na tela de Recebimento
- [ ] Alerta não bloqueante de quantidade atípica (> 50 unidades,
  parâmetro configurável)

### 2.4 QA

- [ ] Teste: requisição `engineering_sample` sem justificativa → 422
- [ ] Teste: requisição com `project_id` válido é persistida e rastreável
  ao projeto
- [ ] Teste E2E: requisição de amostra aprovada → convertida em pedido →
  recebida → entra no Depósito do Laboratório (não no de Insumos)

---

## Bloco 3 — Handoff Entre Departamentos com Semáforo (UC-40)

### 3.1 Backend

- [ ] Definir função utilitária `calculateHandoffSignal(entity, context)`
  compartilhada (não duplicar lógica de cor por módulo) — implementa a
  tabela normativa de `BUSINESS_RULES.md` §10
- [ ] Enriquecer as listagens já existentes com campo aditivo
  `handoff_signal` (`green|yellow|red`) — decisão proposta: aditivo, não
  endpoint novo:
  - [ ] `GET /api/purchases` (fila de Recebimento) — reaproveitar lógica
    de `overdue` já usada em UC-28 (Cockpit de Compras)
  - [ ] `GET /api/inventory/lots` (fila de Qualidade) — `quarantine`
    amarelo, `blocked` vermelho
  - [ ] `GET /api/sales` (fila de Expedição) — `invoiced` verde,
    `processing` amarelo, `denied`/`cancelled` vermelho/fora da fila
  - [ ] `GET /api/quality/non-conformities` (fila de tratativa)
- [ ] Confirmar com o dono se é necessário endpoint de contador/badge
  (ex.: `GET /api/notifications/counts` por módulo) — item em aberto, não
  implementar sem confirmação (evitar escopo não solicitado)

### 3.2 Frontend

- [ ] Componente reutilizável de "bolinha de status" (semáforo) —
  criar um único componente visual, usado em todas as telas de fila
  (Recebimento, Qualidade, Expedição, RNC), consumindo o campo
  `handoff_signal` do backend (nunca recalcular cor no client)
- [ ] Aplicar o componente nas telas já existentes (Recebimento,
  Qualidade — `InspectionTab.tsx`, Expedição, RNC —
  `NonConformitiesTab.tsx`)

### 3.3 QA

- [ ] Teste: pedido `sent` dentro do prazo → `green`
- [ ] Teste: pedido com `expected_date` vencida e sem `delivery_date` →
  `red`, e continua aparecendo na fila (não desaparece por estar atrasado)
- [ ] Teste: pedido `received` sai da fila de pendentes
- [ ] Teste: venda `invoiced` aparece na fila de Expedição como `green`;
  venda `denied`/`cancelled` não aparece como pronta para embarque

---

## Bloco 4 — Múltiplos Depósitos (UC-42)

**Depende de:** nenhum bloco anterior tecnicamente, mas desbloqueia o
roteamento correto do Bloco 2 (amostra → Laboratório). Recomenda-se
priorizar este bloco antes de finalizar o Bloco 2.

### 4.1 AdmDBA — Schema (maior escopo de schema desta entrega)

- [ ] Criar migration `warehouses` (id, `codigo` único, `nome`, `tipo`
  enum `insumos|acabados|laboratorio|outro`, `active` boolean default
  true, timestamps)
- [ ] Seed obrigatório: 3 registros (`INSUMOS`, `ACABADOS`, `LABORATORIO`)
- [ ] Criar migration `product_warehouse_stock` (ou `item_warehouse_stock`
  se migrado ao modelo `Item` canônico — confirmar qual dos dois modelos
  de produto está ativo no momento da implementação, ver `CLAUDE.md`
  seção "Produtos & Engenharia"): `product_id`/`item_id` FK,
  `warehouse_id` FK, `quantity DECIMAL(18,6)` default 0, unique
  `(product_id, warehouse_id)`
- [ ] Adicionar `warehouse_id` (FK, obrigatório) em `inventory_movements`
  (padrão expand-contract já usado no projeto para adicionar colunas —
  ver `docs/HANDOFF_CODEX.md` Fase 4.1 como precedente de como conduzir
  este tipo de migração com backfill seguro)
- [ ] Adicionar `type='transfer'` ao enum de tipo de `inventory_movements`,
  e `transfer_id` (UUID, nullable, usado para vincular o par
  `out`/`in` de uma transferência)
- [ ] Criar migration `warehouse_transfers` (id, `product_id`/`item_id`,
  `from_warehouse_id`, `to_warehouse_id`, `quantity`, `reason` text
  obrigatório, `status` enum `pending|approved|rejected`,
  `requested_by` FK users, `approved_by` FK users nullable,
  `approval_date` nullable, timestamps)
- [ ] Migration de backfill: todo saldo atual de `products.quantity`
  migra para `product_warehouse_stock` no depósito `INSUMOS` (ponto de
  partida — produto acabado que já estava pronto seria, a rigor, do
  depósito `ACABADOS`; **decisão a validar com o dono/PCP antes do
  backfill real**: como não há hoje segregação por tipo de produto vs
  depósito, propor migrar tudo para `INSUMOS` e permitir ajuste manual
  pós-migração, ou migrar por `product_type` — `finished` vai para
  `ACABADOS`, os demais para `INSUMOS`)
- [ ] Script de validação pós-backfill (mesmo padrão de
  `04c_validation.sql`): soma de `product_warehouse_stock` por produto =
  `products.quantity` anterior (invariante de §12 item 3), 0 órfãos

### 4.2 Backend

- [ ] Adaptar `InventoryService` (usado por vendas/produção/compras) para
  aceitar/exigir `warehouse_id` em `consume`/`receive`
  - [ ] Consumo de venda/expedição → sempre `ACABADOS`
  - [ ] Consumo de componente de OP → sempre `INSUMOS`
  - [ ] Conclusão de OP (produto bom) → sempre `ACABADOS`
  - [ ] Recebimento de compra → `INSUMOS` ou `LABORATORIO` conforme
    `origin` da requisição (roteamento do Bloco 2)
- [ ] Novo use case `CreateWarehouseTransferUseCase` (solicitação,
  `status=pending`)
- [ ] Novo use case `ApproveWarehouseTransferUseCase` (exige
  `authorizeModule('estoque', 'approve')` + `access_level=gestor`,
  executa débito/crédito atômico + 2 registros de movimentação
  vinculados por `transfer_id`)
- [ ] Endpoints: `GET/POST /api/warehouses`, `PUT /api/warehouses/:id`,
  `GET /api/warehouse-transfers`, `POST /api/warehouse-transfers`,
  `PATCH /api/warehouse-transfers/:id/approve`,
  `PATCH /api/warehouse-transfers/:id/reject`
- [ ] Endpoint de saldo por depósito:
  `GET /api/products/:id/stock-by-warehouse` (ou equivalente em `items`)
- [ ] Ajustar `GET /api/inventory/movements` para aceitar filtro
  `?warehouse_id=`
- [ ] Débito automático de estoque em teste destrutivo (**decidido**,
  UC-42-E: vinculado ao teste, não manual) — adicionar campos opcionais
  `is_destructive`/`consumed_quantity` (e `consumed_item_id`, se o
  consumo puder ser de um item diferente do produto testado) ao registro
  de `AcousticTestResult` (UC-LAB-01) e debitar automaticamente do
  Depósito de Laboratório, na mesma transação do `INSERT` do teste
- [ ] Teste automatizado obrigatório de invariante: soma dos saldos por
  depósito de um produto nunca diverge do que seria o saldo "legado"
  consolidado, em qualquer sequência de entrada/saída/transferência

### 4.3 Frontend

- [ ] Tela "Configurações > Depósitos" (CRUD simples)
- [ ] Filtro de depósito nas telas de Logística: Recebimento, Expedição,
  extrato de movimentações, tela de Contagem/inventário mobile
- [ ] Tela/fluxo de solicitação de transferência + fila de aprovação para
  gestores (semáforo do Bloco 3 pode ser reaproveitado aqui:
  `pending` amarelo, `approved` verde, `rejected` vermelho)
- [ ] Exibir saldo por depósito (não só saldo total) nas telas de produto/
  item

### 4.4 QA

- [ ] Teste: soma dos saldos por depósito = saldo total do produto, antes
  e depois de qualquer operação (entrada/saída/transferência) — teste de
  invariante automatizado, não só manual
- [ ] Teste: transferência sem aprovação não altera saldo
  (`status=pending` não debita/credita)
- [ ] Teste: transferência aprovada debita origem e credita destino no
  mesmo valor, na mesma transação (rollback em caso de falha parcial)
- [ ] Teste: expedição não lê saldo de outro depósito além de `ACABADOS`,
  mesmo com saldo positivo do mesmo produto em outro depósito
- [ ] Teste: quarentena/bloqueio de lote não move o lote de depósito —
  apenas muda `LotControl.status` (§12 item 9)
- [ ] Teste: contagem cíclica escopada a um único depósito por vez
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

- [ ] Aplicar `authorizeModule('vendas', 'approve')` (ou módulo dedicado
  `faturamento`, conforme decisão do dono) + checagem de
  `access_level='gestor'` em:
  - [ ] `POST /api/sales/:id/nfe` (emissão)
  - [ ] `POST /api/sales/:id/nfe/cancel` (cancelamento)
- [ ] Confirmar que `GET /api/sales/:id/nfe` (consulta de status)
  permanece acessível a `view`/`operate` (não é uma ação de aprovação,
  apenas leitura)

### 5.2 Frontend

- [ ] Ocultar/desabilitar botões de emitir/cancelar NF-e para usuários
  `access_level='operador'`, mesmo que o restante da tela de Vendas seja
  visível
- [ ] Mensagem clara ao tentar (caso o botão não seja escondido por algum
  motivo): reaproveitar o padrão de erro 403 já usado
  (`extractApiErrorMessage`)

### 5.3 QA

- [ ] Teste: operador de Vendas tenta emitir NF-e → 403
- [ ] Teste: gestor de Vendas emite NF-e → sucesso, `sale.status` muda
  automaticamente para `invoiced`
- [ ] Teste: gestor cancela NF-e de venda `shipped` → `nfe_status=cancelled`,
  `sale.status` permanece `shipped` (não regride)
- [ ] Regressão: `GET` de status de NF-e continua acessível a `operator`
  (não deve virar `403` por engano ao aplicar a nova regra)

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

- [ ] Criar componente `PrerequisiteChecklist` (ou nome equivalente) em
  `client/src/components/` — lista de itens `{ label, met: boolean,
  reason?: string }`, renderiza `✓`/`✗`, desabilita children (botão de
  ação) via prop quando houver algum `met === false`, exibe `reason` na
  própria linha (nunca em tooltip)
- [ ] Criar utilitário `translateApiError(error, context)` em
  `client/src/api/` (ao lado de `extractApiErrorMessage`, ou substituindo
  seu uso nos fluxos deste padrão) — consome `error.response.data.error`
  completo (`code`, `message`, `details`), monta as 3 partes (O QUE / POR
  QUE / O QUE FAZER), com um mapa de "O QUE FAZER" por `code`+contexto de
  tela (ex.: `BUSINESS_RULE_VIOLATION` no contexto "liberar OP" → link
  para MRP/Compras; no contexto "converter requisição" → link para Item →
  Fornecedores)
  - [ ] Fallback: quando `details` ausente, usar `message` na parte "POR
    QUE" e uma orientação genérica configurável na parte "O QUE FAZER"
    (nunca regredir a um alerta sem estrutura)
- [ ] Criar componente `DidacticAlertDialog`/`DidacticErrorBanner` (ou
  reaproveitar o padrão de dialog já usado nas telas existentes, ex.:
  `ConvertRequisitionDialog`) que renderiza a saída de
  `translateApiError` no formato visual de 3 partes, com o link/CTA de
  "O QUE FAZER" clicável quando aplicável (`react-router` `Link`)
- [ ] Retrofit das telas já existentes que hoje usam
  `extractApiErrorMessage` (34 arquivos identificados em
  `client/src/pages/**`) — não é obrigatório migrar todas de uma vez;
  priorizar as 9 telas ligadas aos casos de `BUSINESS_RULES.md` §13.5:
  - [ ] `ProductionOrdersPage.tsx` (liberar/concluir OP)
  - [ ] `ShopFloorPage.tsx` / `CompleteProductionOrderDialog.tsx`
    (etapa de apontamento aberta)
  - [ ] `ShippingPage.tsx` (embarque sem NF-e)
  - [ ] `RequisitionsPage.tsx` (conversão sem fornecedor)
  - [ ] `ReceivingConferenceDialog.tsx` (recebimento sem NF)
  - [ ] `RegisterTestTab.tsx` (teste sem resultado/faixa)
  - [ ] `MrpPage.tsx` (conversão de ordem já em execução)
  - [ ] `RequisitionsPage.tsx` (aprovação fora de sequência — mesma tela
    do item de conversão, ações diferentes)
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
