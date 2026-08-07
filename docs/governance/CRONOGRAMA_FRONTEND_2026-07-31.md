# Cronograma e Checklist - Frontend Web do ERP EVOK ÁUDIO

**Versão:** 1.0
**Data-base:** 2026-07-31
**Status:** ⚠️ HISTÓRICO — o frontend FOI implementado em `client/` (React 19 + Vite, React Router v7.18.2, porta 5173). FE0 está concluído; FE1–FE7 parcialmente. Cobertura real de telas: ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md
**Depende de:** API já existente em `server/` (Gates G0-G5 aprovados, ver
`docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md` — **nota de pente-fino
2026-08-06:** esse arquivo e `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`
(citado na seção 13 abaixo) **não existem mais no repositório**; para o
status vigente de Go-Live use `CLAUDE.md` §5 e `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`)

## 1. Objetivo

Hoje o ERP EVOK ÁUDIO é apenas uma API REST (`server/`). Não existe nenhuma
interface gráfica — o sistema não é operável por usuários de negócio, só via
Postman/API direta. Este documento define o plano para construir o frontend
web do zero, na pasta `client/` já prevista pelos scripts do
`package.json` raiz (`npm run client`, `npm run dev`), mas nunca criada.

## 2. Decisão de stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | React 18 + TypeScript | Ecossistema maduro, mais bibliotecas prontas para tabelas/formulários/dashboards de ERP |
| Build tool | Vite | Padrão atual para SPAs React, dev server rápido, compatível com o monorepo (`client/` como pasta irmã de `server/`) |
| Roteamento | React Router v6+ | Padrão de mercado para SPA com múltiplas telas/roles |
| Estado de servidor/cache | TanStack Query (React Query) | Cache, refetch, invalidação e estado de loading/erro por chamada de API, sem Redux |
| Formulários e validação | React Hook Form + Zod | Espelha exatamente os schemas Zod já usados no backend — dá para reusar a mesma forma de pensar validação |
| Componentes de UI | shadcn/ui (Radix + Tailwind) | Componentes acessíveis, customizáveis, sem dependência de um design system fechado |
| Cliente HTTP | Axios com interceptor de token | Anexa `Authorization: Bearer`, trata 401 (token expirado/`passwordVersion` desatualizado) redirecionando para login |
| Autenticação | JWT armazenado em memória + `localStorage` para persistir sessão | A API já retorna o token em `POST /api/auth/login`; frontend não gerencia sessão server-side |

Nenhuma dessas escolhas exige mudança no backend — a API já expõe tudo que o
frontend vai consumir (RBAC por role, `passwordVersion`, `forgot/reset-password`,
todos os módulos).

## 3. Regras que não podem ser quebradas

- Todo endpoint de escrita crítica no frontend deve respeitar a mesma matriz
  de RBAC que o backend já aplica (esconder/desabilitar ação que o role atual
  não pode fazer, mas a validação de verdade continua sendo a da API).
- Nunca guardar senha em texto plano no frontend, nem logar token no console
  em produção.
- Todo formulário que escreve dado crítico (venda, compra, estoque, produção,
  financeiro) deve tratar e exibir o erro estruturado que a API já retorna
  (`{ success: false, error: { code, message, details } }`), não apenas um
  alerta genérico.
- Nenhuma tela pode assumir sucesso otimista em operação financeira ou de
  estoque sem confirmar a resposta da API.
- Build de produção do frontend deve ser estático (arquivos servidos por
  Nginx/CDN ou pelo próprio Express), nunca depender de `vite dev` em
  produção.

## 4. Cronograma executivo

| Fase | Entrega | Prioridade | Depende de |
|---|---|---:|---|
| FE0 | Setup do projeto `client/` + camada de API + autenticação | Crítico | Nenhuma |
| FE1 | Estoque e produtos | Crítico | FE0 |
| FE2 | Vendas (PDV/pedidos) | Crítico | FE0, FE1 |
| FE3 | Compras e fornecedores | Crítico | FE0, FE1 |
| FE4 | Produção e BOM/MRP | Crítico | FE0, FE1, FE3 |
| FE5 | Financeiro | Crítico | FE0, FE2, FE3 |
| FE6 | Rastreabilidade e auditoria (consulta) | Alto | FE1 a FE5 |
| FE7 | Polimento, responsividade e UAT do frontend | Alto | FE1 a FE6 |

Todas as fases FE1-FE5 foram marcadas como críticas porque foi isso que você
pediu como escopo do MVP (login+estoque+produtos, vendas, compras/fornecedores/
produção/BOM, financeiro) — ou seja, o MVP cobre praticamente o sistema
inteiro, não um subconjunto reduzido. Isso é uma decisão válida, só vale
registrar que o prazo será proporcional a esse escopo.

## 5. FE0 - Setup e Autenticação

### Objetivo

Criar a base do projeto e o fluxo de login/sessão, sem o qual nenhuma outra
tela funciona.

### Checklist

- [ ] Criar `client/` com Vite + React + TypeScript (`npm create vite@latest client -- --template react-ts`).
- [ ] Configurar Tailwind + shadcn/ui.
- [ ] Configurar TanStack Query (`QueryClientProvider` na raiz).
- [ ] Criar camada `client/src/api/httpClient.ts` (Axios) com:
  - Base URL configurável por variável de ambiente (`VITE_API_URL`).
  - Interceptor que anexa `Authorization: Bearer <token>`.
  - Interceptor de resposta que trata `401` (token inválido/expirado/
    `passwordVersion` desatualizado) limpando sessão e redirecionando para `/login`.
- [ ] Criar `AuthContext`/hook `useAuth()` com `login`, `logout`, `user`, `role`.
- [ ] Tela de Login (`POST /api/auth/login`).
- [ ] Tela de "Esqueci minha senha" (`POST /api/auth/forgot-password`) e de
  redefinição (`POST /api/auth/reset-password`) — a API já suporta isso (SEC-12).
- [ ] Layout autenticado: sidebar/menu por módulo, header com usuário/role,
  botão de trocar senha (`PUT /api/auth/change-password`) e logout.
- [ ] Rotas protegidas por autenticação (`ProtectedRoute`) e por role
  (esconder itens de menu/ações que o role atual não pode executar).
- [ ] Tratamento visual padrão de erro de API (toast/alerta com `error.message`
  e, se houver, `error.details` por campo).
- [ ] Build de produção (`npm run build` gera `client/dist`) validado
  localmente (`npm run preview`).
- [x] **Home por Perfil (workspace por papel, 2026-08-06):** rota `/` monta
  dinamicamente um grid de widgets por módulo do perfil logado
  (`client/src/pages/home/HomePage.tsx` + `widgetRegistry.tsx`), em vez de
  cravar o dashboard executivo para todo mundo. Perfis com 1-2 módulos
  (ex.: almoxarife) veem layout de foco; perfis com muitos módulos (admin)
  veem grid denso incluindo o painel executivo (`kpis-executivos`, restrito
  a admin/financial). O dashboard executivo antigo continua acessível em
  `/dashboard` para quem quiser o link direto.

### Critério de aceite

- [ ] Login com usuário ativo funciona e persiste sessão ao recarregar a página.
- [ ] Login com usuário inativo ou senha errada mostra erro claro (401).
- [ ] Trocar senha invalida a sessão atual (usuário é deslogado, precisa logar de novo) — reflete o SEC-10 já implementado na API.
- [ ] Usuário `operator` não vê no menu ações que só `admin`/`financial` podem fazer.

## 6. FE1 - Estoque e Produtos

### Checklist

- [x] Listagem de produtos com busca, filtro por categoria/status e paginação (`GET /api/products`).
- [x] Criar/editar produto (`POST`/`PUT /api/products`), com validação espelhando o schema Zod do backend.
- [x] Inativar produto (`DELETE /api/products/:id`), tratando o `409` de item vinculado a BOM/movimento com mensagem clara (não um erro genérico).
- [x] Tela de movimentação manual de estoque (entrada/saída) — **movida para `/logistics/estoque` (aba Saldos)** na Onda 1 da separação Produto×Estoque; `ProductsPage` mantém apenas cadastro/foto/QR/fornecedores/inativação, com aviso apontando para Logística. **Onda Múltiplos Depósitos (Bloco 4, UC-42)**: o dialog de movimentação passou a usar `POST /api/inventory/movements` (não mais `POST /api/products/movements`, que não aceita `warehouse_code`) e ganhou seletor de depósito (default `INSUMOS`).
- [x] Alerta visual de estoque baixo (`min_quantity`) — tile "Abaixo do mínimo" em `/logistics/estoque` (`GET /api/inventory/low-stock`) + pill "Abaixo do mínimo"/"OK" na tabela de saldos.
- [x] Tela de contagem de inventário cíclico (`/api/inventory-counts`): criar, iniciar, contar item, submeter, aprovar/rejeitar. (Página em `/products/inventory-counts`, `client/src/pages/products/InventoryCountsPage.tsx`; aba "Contagens" de `/logistics/estoque` aponta para ela via link, não foi movida nesta onda.) **Atualização 2026-08-04:** seletor de depósito tornado obrigatório na criação da contagem (`warehouse_id` validado via Zod, `Select` `<option>` populado por `listWarehouses()`), com rótulo `código — nome` resolvido no cliente (backend não faz eager-load de `warehouse` na listagem/detalhe); tela também recebeu o visual de marca EVOK (paleta/tipografia consistente com o restante do app).
- [ ] Cadastro de Itens/BOM canônico se aplicável à operação real (`/api/items`) — confirmar com o negócio se `products` (legado) ou `items` (canônico) é a fonte de verdade operacional antes de decidir a tela.

### Critério de aceite

- [x] Criar produto, editar, dar baixa manual de estoque e ver o saldo atualizado na listagem sem recarregar a página manualmente (invalidação de cache do TanStack Query).
- [ ] Tentar inativar produto vinculado a BOM ativa mostra o erro 409 de forma compreensível para o usuário.

### Onda 1 — Departamento Logística (Estoque + Recebimento)

- [x] Nova página `/logistics/estoque` (`src/pages/logistics/InventoryPage.tsx`) com 4 abas (5 após a Onda Múltiplos Depósitos, ver abaixo):
  - [x] **Saldos**: tiles (abaixo do mínimo, lotes em quarentena/bloqueados, valor em estoque via `GET /api/inventory/stock-report`) + tabela de produtos com busca/paginação (`GET /api/products`) + ação "Movimentar" (dialog entrada/saída).
  - [x] **Extrato**: `GET /api/inventory/movements` paginado, com badge de tipo (entrada/saída/ajuste), motivo e referência.
  - [x] **Lotes**: somente leitura, filtro por situação (`GET /api/inventory/lots?status=`), badges coloridos por status; ações de liberar/bloquear permanecem exclusivamente em `/quality`.
  - [x] **Contagens**: card com link para `/products/inventory-counts` (página não movida nesta onda).
- [x] Nova página `/logistics/recebimento` (`src/pages/logistics/ReceivingPage.tsx`): fila de pedidos `sent`/`partial` (`GET /api/purchases`, duas buscas client-side combinadas — backend não suporta status múltiplo), destaque de data prevista vencida, dialog de conferência (`ReceivingConferenceDialog.tsx`) com itens pedida/recebida/a receber + lote/validade opcionais + NF obrigatória, submit em `POST /api/purchases/:id/receive`, aviso pós-recebimento de quarentena com link para `/quality`.
- [x] Navegação: grupo "Logística" na sidebar (`AppLayout.tsx`) com ícones `Warehouse`/`PackageCheck`, rotas lazy em `App.tsx`, breadcrumbs dedicados.

### Onda — Múltiplos Depósitos (Bloco 4, UC-42, `docs/governance/TODO.md`)

- [x] `client/src/api/warehouses.ts` novo: `listWarehouses`,
  `listWarehouseStock`, `listTransfers`, `createTransfer`,
  `approveTransfer`, `rejectTransfer` (todos sob `/api/inventory/*`,
  confirmado por leitura direta do controller/validators do backend).
- [x] Aba **Saldos** de `/logistics/estoque`: seletor de depósito
  (Todos/Insumos/Acabados/Laboratório); com depósito selecionado, troca a
  tabela para o saldo por depósito (`GET /api/inventory/warehouse-stock`).
  Dialog de movimentação manual ganhou seletor de depósito.
- [x] Aba **Lotes**: nova coluna "Depósito" (`lot.warehouse_id` mapeado
  pelo nome via `listWarehouses()` — o endpoint de lotes não inclui a
  associação `warehouse`).
- [x] Nova aba **Transferências** (`TransfersTab.tsx`): tabela com badge de
  status (pending âmbar/approved verde/rejected vermelho) + dialog "Nova
  transferência" (produto/de/para/quantidade/motivo, validação
  `from ≠ to` no client) + Aprovar/Rejeitar restritos a
  `permissions?.estoque === 'approve'` ou `admin`, com `DidacticAlert`
  para os 422 de saldo insuficiente.
- [x] `/logistics/recebimento` (`ReceivingConferenceDialog`): seletor
  "Depósito de destino" (Insumos default/Laboratório), enviado como
  `warehouse_code` no payload de `POST /api/purchases/:id/receive`.
- Detalhamento completo, decisões e roteiro de teste manual:
  `docs/governance/HANDOFF_CODEX.md` seção "Bloco 4 — Múltiplos Depósitos: Frontend".

### Onda 3 — Expedição

- [x] Nova página `/logistics/expedicao` (`src/pages/logistics/ShippingPage.tsx`): fila de vendas `confirmed`/`invoiced` (`GET /api/sales?status=`, duas buscas client-side combinadas — mesma limitação de status único do backend usada em Recebimento), dialog "Ver itens" (picking list via `GET /api/sales/:id`), ação "Marcar como embarcada" (`PUT /api/sales/:id/status` com `{ status: 'shipped' }`, novo valor de enum) restrita a vendas `invoiced` com NF-e `authorized`, aviso "Emita a NF-e na tela de Vendas antes de embarcar" com link para `/sales` quando faltar NF-e autorizada, filtro para ver embarcadas (badge verde "Embarcada").
- [x] Navegação: item "Expedição" no grupo Logística (ícone `Send`), rota lazy em `App.tsx`, breadcrumb `['Logística', 'Expedição']`.

### Onda — Identidade Visual EVOK ÁUDIO (polish, 2026-08-04)

- [x] `InventoryPage.tsx`, `ReceivingPage.tsx`, `ShippingPage.tsx` e
  `WarehousesPage.tsx` restilizadas com a marca EVOK ÁUDIO (tokens `--brand`
  do `client/src/index.css`): cabeçalho em faixa de marca (`bg-gradient-to-r
  from-brand/10 via-brand/5 to-transparent`) com selo de ícone
  (`bg-brand/10 text-brand`), mesmo padrão do `KpiCard` de
  `DashboardPage.tsx`; abas de `/logistics/estoque` com ícone e estado
  ativo/hover em verde. Puramente visual, sem alteração de lógica/API —
  ver `docs/governance/HANDOFF_CODEX.md` seção "Identidade Visual EVOK ÁUDIO — Telas
  de Logística".

## 7. FE2 - Vendas (PDV/pedidos)

### Checklist

- [ ] Cadastro/busca de clientes (`/api/clients`).
- [ ] Tela de criação de venda: seleção de cliente, adicionar itens (produto + quantidade + preço), desconto, forma de pagamento, parcelas.
- [ ] Listagem de vendas com filtro por status/período/cliente.
- [ ] Alterar status da venda (confirmar/cancelar), com aviso de que o cancelamento restaura estoque automaticamente.
- [ ] Exibir e imprimir/visualizar comprovante da venda.

### Critério de aceite

- [ ] Criar uma venda debita o estoque visível na tela de produtos.
- [ ] Cancelar a mesma venda duas vezes seguidas (duplo clique/nova aba) não duplica restauração de estoque — a API já garante isso (idempotência), o frontend só precisa não mascarar o segundo erro.

## 8. FE3 - Compras e Fornecedores

### Checklist

- [ ] Cadastro/busca de fornecedores (`/api/suppliers`).
- [ ] Criar pedido de compra: fornecedor, itens, quantidade, preço unitário, data prevista.
- [ ] Fluxo de status do pedido (pending → approved → sent → partial/received → canceled), com transições visíveis conforme a máquina de estados real do backend.
- [ ] Tela de recebimento de itens (parcial ou total), atualizando estoque e gerando lote (`LotControl`) quando aplicável.
- [ ] Listagem de pedidos com filtro por status/fornecedor/período.
- [x] Conversão de requisição aprovada em pedido(s) de compra (`POST /api/purchase-requisitions/:id/convert`), com dialog de confirmação, fornecedor fallback opcional, agrupamento por fornecedor no resultado e tratamento de erro 422 (itens sem fornecedor resolvível) sem fechar o dialog.
- [x] Cockpit de compras no topo de `/purchases` (`GET /api/purchases/cockpit`): 4 tiles clicáveis — "Requisições pendentes" (→ `/purchases/requisitions`), "Pedidos em aberto" (N · R$ total; aplica filtro local na tabela pelos status `pending/approved/sent/partial`), "Chegando em 7 dias" (verde), "Atrasados" (vermelho; → `/logistics/recebimento`). Função `getPurchaseCockpit` em `src/api/purchases.ts`.
- [x] Tela de Importação/Comex (UC-19, `/purchases/comex`, `ComexPage.tsx`): listagem paginada com filtro por status, criação de processo (fornecedor, itens com valor FOB/câmbio/alíquotas de II/IPI/PIS/COFINS/ICMS via `zod`+`react-hook-form`), diálogo de detalhe (padrão `Dialog` centralizado) com tributos calculados e custo nacionalizado por item, registro de acompanhamento sequencial (embarque → chegada → desembaraço), recebimento com confirmação (`window.confirm`, entrada em estoque + custo nacionalizado) e cancelamento com motivo obrigatório. Módulo de acesso `comex` adicionado ao catálogo do client (`AccessModuleKey`); nenhum perfil o tem atribuído ainda — comportamento de acesso negado herdado de `ModuleRoute` (mesma UX das demais telas).

### Critério de aceite

- [ ] Receber parcialmente um pedido e depois tentar receber quantidade além do saldo restante mostra o erro 422 correspondente, não permite receber "de mais".

## 9. FE4 - Produção e BOM/MRP

### Checklist

- [ ] Cadastro/visualização de estrutura de produto (BOM): componente pai, subcomponentes, quantidades.
- [ ] Explosão de BOM (visualizar árvore de materiais necessários) (`GET /.../estrutura/explode`).
- [ ] Criar ordem de produção, com bloqueio visual se não houver disponibilidade de material (a API já valida, o frontend deve mostrar o motivo).
- [ ] Fluxo de status da OP: liberar (reserva material), concluir com consumo de lote.
- [x] Tela de apontamento de chão de fábrica (`/production/shop-floor`): lista de OPs liberadas/em produção com busca, painel de etapas (`GET /api/production-orders/:id/tracking`) ordenadas por sequência, ações de iniciar (`POST .../tracking/:id/start`, seleção de operador), concluir (`POST .../tracking/:id/complete`, quantidade boa/refugo/observações) e adicionar etapa manual (`POST /api/production-orders/:id/tracking`), com total bom acumulado vs quantidade planejada.
- [x] Tela de geração de plano MRP (`POST /api/mrp/plan`) e visualização de ordens planejadas (`GET /api/mrp/planned-orders`).
- [x] Conversão de ordens planejadas em Requisição de Compra (`POST /api/mrp/planned-orders/convert`), com seleção múltipla, dialog de confirmação e badges de status.
- [x] Tela de Centros de Trabalho (`/production/work-centers`): carga-máquina por horizonte configurável (7/14/30 dias, `GET /api/work-centers/load`) com barra de utilização colorida, CRUD de centros (`GET/POST/PUT /api/work-centers`) e dialog de gestão de turnos (`PUT /api/work-centers/:id/shifts`, substituição completa, 422 de sobreposição tratado).

### Critério de aceite

- [ ] Tentar criar OP sem material suficiente mostra a mensagem de bloqueio de disponibilidade da API, não um erro genérico de rede.
- [ ] Concluir uma OP exige informar o(s) lote(s) consumido(s), replicando a obrigatoriedade que já existe na API.

### Qualidade (item 8 do backlog de telas)

- [x] Tela `/quality` com duas abas: inspeção de recebimento (lotes em quarentena/bloqueados/liberados, `GET /api/inventory/lots`, ações de liberar `POST .../lots/:id/release` e bloquear `POST .../lots/:id/block` com motivo obrigatório e opção de abrir RNC pré-preenchida) e não-conformidades (RNC) (`GET/POST /api/quality/non-conformities`, badges de severidade/status, dialog de nova RNC com aviso de bloqueio automático de lote).
- [x] Tela `/laboratory` com duas abas: registro de teste acústico/Thiele-Small (`POST /api/laboratory/tests`, veredito destacado aprovado/reprovado com link para RNC quando aberta automaticamente) e histórico (`GET /api/laboratory/tests` com filtros de produto/tipo/veredito/série + tiles de resumo `GET /api/laboratory/tests/summary`).
- [x] Tela `/engineering` com três abas: Projetos P&D (`GET/POST/PUT /api/engineering/projects`, badges de fase do PDP e prioridade), Desenhos Técnicos (`GET/POST/PUT /api/engineering/drawings` + liberar `POST .../release` e tornar obsoleto `POST .../obsolete`, restritos a `admin`) e Ficha Técnica Thiele-Small por item (`GET/PUT /api/engineering/items/:itemId/technical-spec`, 13 parâmetros T-S via `ItemSearchSelect`).

## 10. FE5 - Financeiro

### Checklist

- [ ] Listagem de contas a pagar e a receber, com filtro por status/vencimento.
- [ ] Criar conta a pagar manual.
- [ ] Registrar pagamento/recebimento (total ou parcial).
- [ ] Tela de fluxo de caixa agregado (`GET /api/finance/cash-flow`) — **nota:** hoje a API só agrega totais por status no período, não gera série diária; a tela deve refletir isso (não prometer um gráfico diário que a API não sustenta ainda).
- [x] Seção "Fluxo de caixa (projeção)" em `/financial` (`GET /api/finance/cash-flow-projection?days=`, restrita a `admin`/`financial` via `RoleRoute` já existente): seletor de horizonte 30/60/90 dias, tiles (Entradas previstas, Saídas previstas, Saldo projetado com cor conforme sinal, Vencendo em 7d, Em atraso) e tabela semanal (semana dd/mm–dd/mm, a receber, a pagar, saldo da semana, acumulado em negrito/vermelho se negativo). Função `getCashFlowProjection` em `src/api/financial.ts`.

### Critério de aceite

- [ ] Tentar pagar a mesma conta duas vezes seguidas não duplica a baixa (idempotência já garantida pela API, frontend só precisa exibir o segundo erro corretamente).

## 11. FE6 - Rastreabilidade e Auditoria (consulta)

### Checklist

- [ ] Tela de consulta de rastreabilidade por item (`GET /api/traceability/items/:id`).
- [ ] Tela de consulta de rastreabilidade por lote (`GET /api/traceability/lots/:id`).
- [ ] Tela de consulta de rastreabilidade por ordem de produção (`GET /api/traceability/production-orders/:id`).
- [ ] Tela de audit log (somente leitura, `admin`) com filtro por `entity_type`/`entity_id`/ação/período.
- [ ] Tela de administração de usuários (`admin`): listar, criar, editar, inativar, e botão de "revogar sessões" (`POST /api/users/:id/revoke-sessions`, SEC-12).

## 11a. Addendum — Módulo SST (BLOCO 1, 2026-08-07)

Módulo novo, fora da numeração original FE0-FE7 (departamento 15, backend
com 75 endpoints `/api/sst/*` implementado em 2026-08-06). Frontend
construído em 2026-08-07: rota `/sst`, menu em "Qualidade & Engenharia",
chave RBAC `sst` adicionada a `AccessModuleKey` no client (já existia no
backend), widget `sst-pendencias` na Home por Perfil.

### Checklist

- [x] Aba EPI: catálogo de TipoEPI (CA/validade), Matriz Função×EPI, entregas com fluxo rascunho→evidência→confirmação (imutável) e devolução.
- [x] Aba ASO: registro com bloqueio visual de resultado inapto/restrições, cards de vencimento 30/60/90 dias.
- [x] Aba Acidentes: registro imutável, emissão de CAT com prazo legal em destaque, investigação obrigatória para encerrar acidente grave.
- [x] Aba eSocial: fila somente leitura (S-2210/S-2220/S-2240) + reenvio de eventos rejeitados.
- [x] Aba CIPA: dimensionamento, mandatos (leitura), reuniões com ata.
- [x] Aba Treinamentos: registro + lista de bloqueio operacional (NR-11/NR-10 etc.).
- [ ] PGR/GES e Rotina Preventiva (Inspeções, PT, Brigada, DDS) — CRUD do backend pronto, sem tela ainda.
- [ ] Criação de Mandato/Processo Eleitoral CIPA — hoje só leitura na UI (criação ficou para o backend/próxima passada de frontend).

## 11b. Addendum — Módulo TI (BLOCO 2, 2026-08-07)

Módulo novo, fora da numeração original FE0-FE7 (departamento 13, backend
com 57 endpoints `/api/ti/*`, commit `2518d42`). Frontend construído em
2026-08-07: dois públicos distintos — auto-serviço (`/meus-chamados`,
qualquer usuário autenticado, sem `module`) e gestão (`/ti`, `module: 'ti'`,
menu em "Administração"). Chave RBAC `ti` adicionada a `AccessModuleKey` no
client (já existia no backend). Widget `ti-pendencias` na Home por Perfil
(chamados abertos + licenças vencendo + acessos pendentes).

### Checklist

- [x] `/meus-chamados`: abrir chamado, listar os próprios (qualquer status), ver detalhe, comentar, confirmar resolução com avaliação (1-5), reabrir.
- [x] `/ti` aba Fila de Chamados: fila completa com filtro de status/SLA estourado, assumir, colocar em espera/retomar, vincular ordem de manutenção, registrar solução e resolver, reclassificar prioridade com motivo, comentar (inclusive nota interna), cancelar.
- [x] `/ti` aba Termos de Responsabilidade: registrar entrega, registrar devolução, marcar como perdido (nível approve).
- [x] `/ti` aba Licenças: listar com alerta de vencimento, cadastrar/editar extensão de licença sobre asset existente, revelar chave com clique explícito (mascarada por padrão), gerenciar assentos (alocar/revogar), solicitar renovação (nível approve, gera Requisição de Compra).
- [x] `/ti` aba Acessos: criar solicitação grant/change/revoke, aprovar/rejeitar, executar (com bloqueio visível de offboarding por termo ativo), atualizar checklist de desligamento, cancelar.
- [x] `/ti` aba Backup: painel de saúde (alerta de backup diário/teste de restore atrasado), histórico, registrar execução (com aviso de chamado urgente gerado automaticamente em caso de falha).
- [ ] `GET /api/ti/dashboard`/KPIs de TI (RF-TI-045) — não existe endpoint dedicado no contrato ainda; fora de escopo desta passada.
- [ ] Upload real do termo assinado (`signed_document_path` via Multer) — formulário aceita apenas aceite eletrônico nesta passada; assinatura física exige integração de upload futura.
- [ ] Ficha "equipamentos por funcionário" (RF-TI-022) e listagem dedicada de "termos pendentes para offboarding" (RF-TI-023) — endpoints existem (`GET .../by-employee/:id`, `GET .../pending-for-offboarding/:id`), sem tela dedicada; o bloqueio de execução já aparece no fluxo de Acessos.

## 11c. Addendum — Módulo Jurídico (BLOCO 3, 2026-08-07)

Módulo novo, fora da numeração original FE0-FE7 (departamento 16, backend
com 69/71 endpoints `/api/jur/*`, commits `0d97b12`+`c25f572`). O módulo
Jurídico enxuto anterior (`/api/legal`, `client/src/pages/legal/`) foi
REMOVIDO — substituído por completo. Frontend reconstruído em 2026-08-07:
rota `/juridico` (`/legal` agora redireciona), menu em "Administração",
chave RBAC `juridico` já existia (`AccessModuleKey`), widget
`juridico-pendencias` na Home por Perfil (prazos fatais críticos + alertas
pendentes). Rota liberada por `AnyModuleRoute(['juridico', 'financeiro'])`
— quem só tem `financeiro` (sem `juridico`) enxerga apenas a aba "Alertas &
Relatório Financeiro" (versão sanitizada, RF-JUR-042/BR-JUR-050).

### Checklist

- [x] Aba Contratos: lista/filtros (status/tipo), criação em `draft`, detalhe com documentos versionados, signatários, checklist de cláusulas (employment/supplier/nda), ativação (bloqueio sem responsável/2 partes/versão assinada), aditivos (prazo/valor/cláusula/parte), encerramento (rescisão com motivo ou vencimento natural).
- [x] Aba Contencioso: processos (CNJ único), advogados externos (mini-CRUD em diálogo), andamentos (insert-only), avaliação de risco/provisão (CPC 25, `probable` exige valor+justificativa), lançamento de custos (despesa/depósito judicial → Conta a Pagar), encerramento (won/lost/settled com parcelamento/archived).
- [x] Aba Prazos Fatais (fluxo mais crítico): lista com semáforo de urgência por dias restantes, filtro "só críticos" (`GET .../critical`), criação exigindo responsável+escalonamento, reconhecimento de alerta, dupla confirmação em 2 rotas separadas (`fulfill` com evidência → `confirm` por usuário distinto, com aviso explícito se o usuário logado é quem cumpriu).
- [x] Aba Procurações: listagem (default exclui revogadas/vencidas), cadastro, revogação com registro de comunicação obrigatório.
- [x] Aba Propriedade Intelectual: listagem/cadastro por tipo (marca/patente/modelo/desenho/direito autoral/segredo industrial — segredo industrial nunca aceita anexo), vínculo N:N com contratos (NDA/licenciamento).
- [x] Aba LGPD: RoPA (cadastro + revisão anual), Solicitações de Titular (SLA de 15 dias calculado no backend, contador de dias, filtro "só críticas" D-5/vencidas, verificação de identidade obrigatória antes de avançar, resolução, recusa justificada nível approve), Incidentes (abertura, decisão de comunicação ANPD/titulares com justificativa obrigatória em ambos os sentidos, encerramento bloqueado sem decisão).
- [x] Aba Alertas & Relatório Financeiro: lista de alertas pendentes com reconhecimento (nunca desativação — RNF-JUR-04 não tem esse caminho em nenhuma rota), relatório financeiro sanitizado (provisão vigente + custos, visível também ao perfil `financeiro`).
- [ ] `corporate-acts` (atos societários, RF-JUR-030) — sem tela porque o backend também não implementou (sem tabela modelada nesta passada).
- [ ] Tabela de alçada de aprovação de contrato por valor/tipo (RF-JUR-003) — pendência de backend (endpoint de configuração ainda não existe); hoje todo `juridico:operate` pode ativar qualquer contrato.
- [ ] Upload real de documentos/evidências (minuta, aditivo, evidência de cumprimento de prazo) — formulários aceitam apenas URL/caminho, sem integração de upload de arquivo (Multer) nesta passada.

## 12. FE7 - Polimento e UAT do Frontend

### Checklist

- [ ] Responsividade (desktop prioritário, mas sem quebrar em tablet/notebook menor).
- [ ] Estados de loading/skeleton em todas as listagens.
- [ ] Tratamento de erro de rede (API fora do ar) com mensagem clara, não tela em branco.
- [ ] Build de produção testado servido por um servidor estático real (não só `vite dev`).
- [ ] Smoke test manual de cada fluxo crítico (login, venda, compra, produção, financeiro) contra a API real rodando em Docker local.
- [ ] Sessão de UAT com usuário de negócio real (mesmo escopo do Gate G6 do backend, mas agora incluindo a interface).

## 13. Observação sobre o cronograma do backend

Este documento **não substitui** `docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md`
nem `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` — a API já está com G0-G5/F1-F9
fechados e validados. O Gate G6 (UAT, canário, aprovação formal) do backend
continua bloqueado pela compra do servidor real. O frontend pode ser
desenvolvido em paralelo a essa espera, e pode inclusive ser ensaiado contra
a mesma API local em Docker já usada nos ensaios de canário anteriores — não
depende do servidor de produção estar comprado.
