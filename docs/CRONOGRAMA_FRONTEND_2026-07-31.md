# Cronograma e Checklist - Frontend Web do ERP EVOK ÁUDIO

**Versão:** 1.0
**Data-base:** 2026-07-31
**Status:** Planejamento - nenhum código de frontend criado ainda
**Depende de:** API já existente em `server/` (Gates G0-G5 aprovados, ver
`docs/CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md`)

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

### Critério de aceite

- [ ] Login com usuário ativo funciona e persiste sessão ao recarregar a página.
- [ ] Login com usuário inativo ou senha errada mostra erro claro (401).
- [ ] Trocar senha invalida a sessão atual (usuário é deslogado, precisa logar de novo) — reflete o SEC-10 já implementado na API.
- [ ] Usuário `operator` não vê no menu ações que só `admin`/`financial` podem fazer.

## 6. FE1 - Estoque e Produtos

### Checklist

- [ ] Listagem de produtos com busca, filtro por categoria/status e paginação (`GET /api/products`).
- [ ] Criar/editar produto (`POST`/`PUT /api/products`), com validação espelhando o schema Zod do backend.
- [ ] Inativar produto (`DELETE /api/products/:id`), tratando o `409` de item vinculado a BOM/movimento com mensagem clara (não um erro genérico).
- [ ] Tela de movimentação manual de estoque (entrada/saída) (`POST /api/products/movements`).
- [ ] Alerta visual de estoque baixo (`min_quantity`).
- [ ] Tela de contagem de inventário cíclico (`/api/inventory-counts`): criar, iniciar, contar item, submeter, aprovar/rejeitar.
- [ ] Cadastro de Itens/BOM canônico se aplicável à operação real (`/api/items`) — confirmar com o negócio se `products` (legado) ou `items` (canônico) é a fonte de verdade operacional antes de decidir a tela.

### Critério de aceite

- [ ] Criar produto, editar, dar baixa manual de estoque e ver o saldo atualizado na listagem sem recarregar a página manualmente (invalidação de cache do TanStack Query).
- [ ] Tentar inativar produto vinculado a BOM ativa mostra o erro 409 de forma compreensível para o usuário.

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

### Critério de aceite

- [ ] Receber parcialmente um pedido e depois tentar receber quantidade além do saldo restante mostra o erro 422 correspondente, não permite receber "de mais".

## 9. FE4 - Produção e BOM/MRP

### Checklist

- [ ] Cadastro/visualização de estrutura de produto (BOM): componente pai, subcomponentes, quantidades.
- [ ] Explosão de BOM (visualizar árvore de materiais necessários) (`GET /.../estrutura/explode`).
- [ ] Criar ordem de produção, com bloqueio visual se não houver disponibilidade de material (a API já valida, o frontend deve mostrar o motivo).
- [ ] Fluxo de status da OP: liberar (reserva material), iniciar/concluir apontamento, concluir com consumo de lote.
- [ ] Tela de geração de plano MRP (`POST /api/mrp/plan`) e visualização de ordens planejadas (`GET /api/mrp/planned-orders`).

### Critério de aceite

- [ ] Tentar criar OP sem material suficiente mostra a mensagem de bloqueio de disponibilidade da API, não um erro genérico de rede.
- [ ] Concluir uma OP exige informar o(s) lote(s) consumido(s), replicando a obrigatoriedade que já existe na API.

## 10. FE5 - Financeiro

### Checklist

- [ ] Listagem de contas a pagar e a receber, com filtro por status/vencimento.
- [ ] Criar conta a pagar manual.
- [ ] Registrar pagamento/recebimento (total ou parcial).
- [ ] Tela de fluxo de caixa agregado (`GET /api/finance/cash-flow`) — **nota:** hoje a API só agrega totais por status no período, não gera série diária; a tela deve refletir isso (não prometer um gráfico diário que a API não sustenta ainda).

### Critério de aceite

- [ ] Tentar pagar a mesma conta duas vezes seguidas não duplica a baixa (idempotência já garantida pela API, frontend só precisa exibir o segundo erro corretamente).

## 11. FE6 - Rastreabilidade e Auditoria (consulta)

### Checklist

- [ ] Tela de consulta de rastreabilidade por item (`GET /api/traceability/items/:id`).
- [ ] Tela de consulta de rastreabilidade por lote (`GET /api/traceability/lots/:id`).
- [ ] Tela de consulta de rastreabilidade por ordem de produção (`GET /api/traceability/production-orders/:id`).
- [ ] Tela de audit log (somente leitura, `admin`) com filtro por `entity_type`/`entity_id`/ação/período.
- [ ] Tela de administração de usuários (`admin`): listar, criar, editar, inativar, e botão de "revogar sessões" (`POST /api/users/:id/revoke-sessions`, SEC-12).

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
