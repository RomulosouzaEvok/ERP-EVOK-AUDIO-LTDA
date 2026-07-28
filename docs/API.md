# Documentação da API - ERP EVOK ÁUDIO

## Base URL

```
Produção: https://api.evokaudio.com.br/api
Desenvolvimento: http://localhost:5000/api
```

## Autenticação

A API utiliza **JWT (JSON Web Token)** para autenticação.

### Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Respostas Padrão

**Sucesso (200/201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro (400/401/404/500) — formato legado (string):**

Ainda usado por respostas de validação simples e mensagens de negócio pontuais em alguns controllers:
```json
{
  "success": false,
  "error": "Mensagem do erro"
}
```

**Erro padronizado (`AppError` e subclasses) — formato estruturado:**

Erros lançados via `server/src/errors` (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BusinessRuleError`) e tratados pelo `errorHandler` central (`server/src/middlewares/errorHandler.js`) retornam:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cliente não encontrado.",
    "details": {}
  }
}
```
- `code`: identificador estável do tipo de erro (ex.: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`).
- `message`: mensagem segura para exibição ao usuário.
- `details`: opcional, presente apenas quando o erro carrega informação estruturada adicional (ex.: lista de campos inválidos).

**Erros inesperados (bugs, falhas de banco, exceções não tratadas):**

Nunca expõem stack trace nem a mensagem crua da exceção ao cliente, em nenhum ambiente (dev ou produção). São logados integralmente no servidor via `console.error` para depuração e respondidos como:
```json
{
  "success": false,
  "error": "Erro interno do servidor"
}
```

> Nota: controllers devem propagar exceções inesperadas com `next(error)` (nunca montar a resposta de erro manualmente com `error.message`); o `errorHandler` central é responsável por sanitizar e formatar a resposta.

---

## 1. Autenticação

### POST /api/auth/login
Autentica o usuário e retorna o token JWT.

**Request:**
```json
{
  "email": "admin@evokaudio.com.br",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Administrador",
      "email": "admin@evokaudio.com.br",
      "role": "admin"
    }
  }
}
```

**Erro (401) — formato estruturado (`UnauthorizedError`):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Email ou senha incorretos"
  }
}
```
> A mensagem é propositalmente idêntica tanto para "email não encontrado" quanto para "senha incorreta" — nunca revela se um email está cadastrado. Usuário inativo retorna a mesma estrutura com `message: "Usuário inativo. Contate o administrador."`.

### POST /api/auth/register
Registra um novo usuário (apenas admin).

**Request:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@evokaudio.com.br",
  "password": "123456",
  "role": "operator"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Novo Usuário",
    "email": "novo@evokaudio.com.br",
    "role": "operator"
  }
}
```

### GET /api/auth/me
Retorna os dados do usuário autenticado.

**Headers:** Authorization: Bearer \<token\>

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Administrador",
    "email": "admin@evokaudio.com.br",
    "role": "admin",
    "active": true
  }
}
```

---

## 1.1 Usuários (Gestão)

Endpoints de gestão de usuários do ERP (CRUD administrativo). Distintos de
`/api/auth/register` (que também cria usuários, mas focado no fluxo de
autenticação) — mesma validação de nome/email/senha é reutilizada
internamente pelos dois. Todos os endpoints abaixo exigem `authenticate` +
`authorize('admin')`.

### GET /api/users
Lista usuários com busca/filtro e paginação.

**Headers:** Authorization: Bearer \<token\> (role: admin)

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página (default: 1) |
| limit | int | Itens por página (default: 10) |
| search | string | Busca por nome ou email |
| role | string | Filtro exato: admin / operator / financial |
| active | boolean | Filtro exato: true / false |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Administrador",
      "email": "admin@evokaudio.com.br",
      "role": "admin",
      "active": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /api/users/:id
Retorna os dados de um usuário específico (sem `password`).

**Erro (404) — formato estruturado (`NotFoundError`):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Usuário não encontrado"
  }
}
```

### POST /api/users
Cria um novo usuário.

**Request:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@evokaudio.com.br",
  "password": "123456",
  "role": "operator"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Novo Usuário",
    "email": "novo@evokaudio.com.br",
    "role": "operator"
  }
}
```

**Erro (400) — email/senha inválidos ou `role` fora de `admin|operator|financial` (`ValidationError`); erro (409) — email já cadastrado (`ConflictError`).**

### PUT /api/users/:id
Atualiza nome/email/role/active de um usuário. **Não permite alterar senha** por este endpoint.

**Request:**
```json
{
  "name": "Nome Atualizado",
  "role": "financial",
  "active": true
}
```

**Erro (400) — se `password` for enviado no corpo (`ValidationError`, mensagem `"Use endpoint específico para alterar senha"`); erro (409) — email já cadastrado.**

### DELETE /api/users/:id
Inativa (soft delete via `active=false`) um usuário. Bloqueia auto-inativação.

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Usuário inativado com sucesso" }
}
```

**Erro (422) — usuário tentando inativar a si mesmo (`BusinessRuleError`):**
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Você não pode inativar seu próprio usuário"
  }
}
```

---

## 2. Clientes

### GET /api/clients
Lista todos os clientes (com paginação e busca).

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página (default: 1) |
| limit | int | Itens por página (default: 10) |
| search | string | Busca por nome ou CPF/CNPJ |
| status | string | active / inactive |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "cpf_cnpj": "123.456.789-00",
      "phone": "(11) 99999-8888",
      "email": "joao@email.com",
      "address": "Rua A, 123",
      "status": "active",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### GET /api/clients/:id
Retorna os dados de um cliente específico.

### POST /api/clients
Cadastra um novo cliente.

**Request:**
```json
{
  "name": "Maria Souza",
  "cpf_cnpj": "987.654.321-00",
  "phone": "(11) 97777-6666",
  "email": "maria@email.com",
  "address": "Rua B, 456",
  "notes": "Cliente desde 2023"
}
```

### PUT /api/clients/:id
Atualiza os dados de um cliente.

### DELETE /api/clients/:id
Inativa um cliente (soft delete - status = 'inactive').

---

## 3. Produtos

### GET /api/products
Lista todos os produtos.

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página |
| limit | int | Itens por página |
| search | string | Busca por nome ou código |
| category_id | int | Filtrar por categoria |
| low_stock | bool | Apenas estoque baixo |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Microfone SM58",
      "code": "MIC-SM58",
      "description": "Microfone dinâmico cardioide",
      "price": 599.90,
      "cost_price": 350.00,
      "quantity": 15,
      "min_quantity": 5,
      "status": "active",
      "category": {
        "id": 1,
        "name": "Microfones"
      }
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 10,
    "totalPages": 12
  }
}
```

### POST /api/products
Cadastra um novo produto.

**Request:**
```json
{
  "name": "Cabo P10 5m",
  "code": "CAB-P10-5M",
  "description": "Cabo de áudio P10 5 metros",
  "price": 39.90,
  "cost_price": 22.00,
  "quantity": 50,
  "min_quantity": 10,
  "category_id": 3
}
```

### PUT /api/products/:id
Atualiza dados do produto.

### DELETE /api/products/:id
Inativa um produto (bloqueado se houver vendas ativas associadas: retorna erro de regra de negocio).

### POST /api/products/movements
Registra uma movimentacao manual de estoque (entrada ou saida) para um produto.

**Request:**
```json
{
  "product_id": 1,
  "type": "in",
  "quantity": 10,
  "description": "Ajuste de inventario"
}
```

> Nota de arquitetura: desde a Fase 5 do TODO, o modulo Produtos foi migrado
> para Clean Architecture (`server/src/modules/products/`). O contrato de
> `/api/products` (paths, metodos, formato de resposta) permanece identico;
> apenas a implementacao interna passou a usar entidades de dominio e use
> cases. Detalhes em `server/src/modules/products/README.md`.

---

## 4. Categorias

### GET /api/categories
Lista todas as categorias.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Microfones", "description": "Microfones profissionais", "product_count": 12 },
    { "id": 2, "name": "Mesas de Som", "description": "Mesas de som e mixers", "product_count": 8 }
  ]
}
```

### POST /api/categories
```json
{
  "name": "Caixas de Som",
  "description": "Caixas acústicas ativas e passivas"
}
```

### PUT /api/categories/:id
### DELETE /api/categories/:id

---

## 5. Vendas

> Nota de arquitetura: os endpoints de `/api/sales` sao servidos pelo
> modulo `server/src/modules/sales/` (Clean Architecture). A criacao
> reutiliza `server/src/services/inventoryService.js` (lock pessimista +
> transacao) para debitar estoque, e `server/src/shared/utils/money.js`
> (toCents/fromCents) para o calculo em centavos das parcelas geradas em
> AccountReceivable (ultima parcela absorve o resto da divisao). Erros de
> validacao/regra de negocio retornam `{ success: false, error: { code,
> message } }` (em vez de string simples, mesmo padrao ja adotado em
> `inventory`/`bom`/`production`/`purchases`). Ver
> `server/src/modules/sales/README.md` para detalhes, incluindo a
> pendencia conhecida de reserva de estoque em orcamentos (`quote`).

### GET /api/sales
Lista vendas com paginação.

**Query Params:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| page | int | Nº da página |
| limit | int | Itens por página |
| status | string | quote, confirmed, invoiced, canceled |
| start_date | date | Início do período |
| end_date | date | Fim do período |
| customer_id | int | Filtrar por cliente |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer": { "id": 1, "name": "João Silva" },
      "user": { "id": 1, "name": "Admin" },
      "total_amount": 1250.00,
      "status": "confirmed",
      "payment_method": "credit_card",
      "items_count": 3,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### POST /api/sales
Registra uma nova venda.

**Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 599.90
    },
    {
      "product_id": 3,
      "quantity": 1,
      "unit_price": 39.90
    }
  ],
  "discount": 0,
  "payment_method": "credit_card",
  "installments": 3,
  "notes": "Entrega agendada"
}
```

**Response (201) - Venda registrada com sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "customer_id": 1,
    "total_amount": 1239.70,
    "status": "confirmed",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 599.90,
        "total_price": 1199.80
      },
      {
        "product_id": 3,
        "quantity": 1,
        "unit_price": 39.90,
        "total_price": 39.90
      }
    ],
    "accounts_receivable": [
      {
        "installment": 1,
        "amount": 413.23,
        "due_date": "2024-02-15"
      },
      {
        "installment": 2,
        "amount": 413.23,
        "due_date": "2024-03-15"
      },
      {
        "installment": 3,
        "amount": 413.24,
        "due_date": "2024-04-15"
      }
    ]
  }
}
```

### GET /api/sales/:id
Detalhes completos de uma venda.

### PUT /api/sales/:id/status
Atualiza status da venda.

**Request:**
```json
{
  "status": "canceled"
}
```

---

## 6. Financeiro

Implementado no módulo `server/src/modules/financial/` (Clean Architecture). Todas as rotas exigem `authenticate`; `POST /api/finance/payable` exige adicionalmente `authorize('admin', 'financial')`.

### GET /api/finance/receivable
Contas a receber, com paginação.

**Query Params:** status, start_date, end_date, customer_id, page, limit

**Response:** `{ success: true, data: AccountReceivable[], pagination: { total, page, limit, totalPages } }` (cada item inclui `customer` e `sale`).

### PUT /api/finance/receivable/:id/pay
Registra recebimento de conta a receber (total ou parcial via `amount`).

**Request:**
```json
{
  "payment_date": "2024-01-20",
  "payment_method": "pix",
  "amount": 413.23
}
```
Regras: conta não pode estar `paid` ou `canceled`; se `amount` informado, deve ser > 0 e não pode exceder o valor atual da conta. Em caso de sucesso, `status` vira `paid`.

### GET /api/finance/payable
Contas a pagar, com paginação.

**Query Params:** status, start_date, end_date, page, limit

**Response:** `{ success: true, data: AccountPayable[], pagination: { total, page, limit, totalPages } }`

### POST /api/finance/payable
Registra nova conta a pagar. Requer papel `admin` ou `financial`.

**Request:**
```json
{
  "description": "Conta de Luz",
  "amount": 450.00,
  "due_date": "2024-02-10",
  "category": "Utilidades"
}
```
Campos obrigatórios: `description`, `amount` (> 0), `due_date`. Opcionais: `category`, `supplier_id`, `purchase_id`, `notes`. Criada sempre com `status: "pending"`.

### PUT /api/finance/payable/:id/pay
Registra pagamento de conta a pagar (total ou parcial via `amount`). Mesmas regras de `PUT /api/finance/receivable/:id/pay`.

### GET /api/finance/cash-flow
Fluxo de caixa agregado por status, no período informado (padrão: mês corrente).

**Query Params:** start_date, end_date

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-01-01T00:00:00.000Z", "end": "2024-01-31T00:00:00.000Z" },
    "summary": {
      "total_receivable": 25000.00,
      "total_payable": 18000.00,
      "pending_receivable": 12000.00,
      "pending_payable": 5000.00,
      "projected_balance": 7000.00,
      "actual_balance": 7000.00
    },
    "receivable_by_status": [ { "status": "pending", "total": "12000.00" }, { "status": "paid", "total": "13000.00" } ],
    "payable_by_status": [ { "status": "pending", "total": "5000.00" }, { "status": "paid", "total": "13000.00" } ]
  }
}
```

---

## 7. Relatórios

### GET /api/reports/sales
Relatório de vendas.

**Query Params:** start_date, end_date, customer_id

### GET /api/reports/inventory
Relatório de estoque.

### GET /api/reports/customers
Relatório de clientes.

### GET /api/reports/cash-flow
Relatório de fluxo de caixa.

**Response (todos os relatórios):**
```json
{
  "success": true,
  "data": {
    "report_type": "sales",
    "generated_at": "2024-01-20T15:00:00.000Z",
    "filters": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    },
    "summary": {
      "total_sales": 45,
      "total_amount": 38500.00,
      "average_ticket": 855.55
    },
    "details": [ ... ]
  }
}
```

---

## 8. Estoque / Movimentações

### GET /api/inventory/movements
Histórico de movimentações.

**Query Params:** product_id, type (in/out), start_date, end_date

### POST /api/inventory/movements
Registra movimentação manual.

**Request:**
```json
{
  "product_id": 1,
  "type": "in",
  "quantity": 20,
  "description": "Compra de reposição"
}
```

### GET /api/inventory/movements/:id
Busca uma movimentação de estoque específica pelo id.

### GET /api/inventory/stock-report
Relatório consolidado de estoque: `{ summary: { total_products, total_items, total_value, low_stock_count }, products: [...] }`.

### GET /api/inventory/low-stock
Lista produtos ativos com estoque em ou abaixo do ponto de reposição (`quantity <= min_quantity`).

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "...", "code": "...", "quantity": 2, "min_quantity": 5, "category": { "id": 1, "name": "..." } }
  ]
}
```

> Nota de arquitetura: os endpoints de `/api/inventory` são servidos pelo
> módulo `server/src/modules/inventory/` (Clean Architecture). Ver
> `server/src/modules/inventory/README.md` para detalhes de regras de
> negócio, entidades e pendências (ex.: `reserved_quantity` ainda não
> existe no schema).

---

## 9. Estrutura de Produto (BOM)

Base URL: `/api/engineering/bom`

### GET /api/engineering/bom
Lista BOMs com paginação e filtros.

**Query Params:** page, limit, status (draft/active/inactive/superseded), search (nome do produto), product_id

### GET /api/engineering/bom/product/:productId
Retorna a BOM ativa (`status=active`) de um produto, com itens.

### GET /api/engineering/bom/product/:productId/versions
**Novo.** Lista todas as versões (qualquer status) de BOM de um produto, ordenadas por data de criação (mais antiga primeiro).

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "product_id": 10, "revision": "00", "status": "superseded", "createdAt": "..." },
    { "id": 5, "product_id": 10, "revision": "01", "status": "active", "createdAt": "..." }
  ]
}
```

### GET /api/engineering/bom/:id
Detalhes da BOM com produto e itens (componentes).

### POST /api/engineering/bom
Cria uma nova BOM para um produto acabado (`product_type = 'finished'`). Marca automaticamente qualquer BOM `active` anterior do mesmo produto como `superseded` (versionamento).

**Request:**
```json
{
  "product_id": 1,
  "revision": "00",
  "notes": "BOM inicial Alto-Falante 12" PRO",
  "items": [
    { "component_product_id": 10, "quantity": 1, "unit": "un", "bom_level": 1 },
    { "component_product_id": 11, "quantity": 1, "unit": "un", "bom_level": 1 }
  ]
}
```

### PUT /api/engineering/bom/:id
Atualiza campos gerais (`revision`, `revision_notes`, `notes`, `status`). Quando `status` muda para `active`, o log de auditoria registra a ação como `approve`.

### DELETE /api/engineering/bom/:id
Inativa (soft delete) a BOM. Apenas BOMs em `draft` ou `active` podem ser inativadas.

### GET /api/engineering/bom/:id/explode?qty=
Explode a BOM (incluindo sub-BOMs recursivamente) para a quantidade informada.

### GET /api/engineering/bom/:id/cost?qty=
Calcula o custo total/unitário do produto baseado na BOM ativa.

### GET /api/engineering/bom/:id/availability?qty=
Verifica se há estoque suficiente dos componentes para produzir a quantidade desejada.

### GET /api/engineering/bom/:id/tree
Retorna a árvore hierárquica completa da BOM (útil para produtos com subconjuntos).

### GET /api/engineering/bom/:id/items
Lista os itens (componentes) de uma BOM.

> Nota de arquitetura: os endpoints de `/api/engineering/bom` são servidos
> pelo módulo `server/src/modules/bom/` (Clean Architecture). A lógica de
> negócio pesada (explosão, custo, disponibilidade, versionamento)
> permanece em `server/src/services/bomService.js`. Ver
> `server/src/modules/bom/README.md` para detalhes de regras de negócio,
> entidades e pendências.

## 10. Ordens de Produção

### GET /api/production-orders
Lista ordens de produção. Filtros: `status`, `product_id`, `priority`, `start_date`, `end_date`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 1, "order_number": "OP-2026-0001", "status": "planned", "quantity": 100, "product": { "id": 5, "name": "Alto-falante 12in" } } ],
  "summary": { "total": 10, "planned": 3, "in_progress": 2, "completed": 4, "overdue": 1 },
  "pagination": { "total": 10, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET /api/production-orders/report
Relatório de produção de um período (`start_date`, `end_date`), com totais planejados/produzidos, taxa de conclusão e distribuição por status.

### GET /api/production-orders/:id
Detalhes da OP (produto, responsável, criador).

### POST /api/production-orders
Cria uma OP. Requer papel `admin` ou `operator`.
```json
{
  "product_id": 5,
  "quantity": 100,
  "due_date": "2026-08-30",
  "priority": "normal",
  "responsible_id": 3,
  "notes": "Lote para pedido X"
}
```
O `order_number` (`OP-<ano>-XXXX`) é gerado automaticamente. O produto deve estar `active` e ser do tipo `finished`.

### PUT /api/production-orders/:id
Atualiza campos gerais (`priority`, `due_date`, `responsible_id`, `notes`). **Não aceita** `status` — use `PUT /:id/status`.

### PUT /api/production-orders/:id/status
Muda o status da OP conforme a máquina de estados `planned → released → in_progress → completed/paused/canceled`.
```json
{ "status": "completed", "quantity_produced": 98 }
```
Ao transicionar para `completed`, consome os componentes da BOM ativa do produto (se houver) e dá entrada do produto acabado no estoque, em uma única transação com lock pessimista.

### DELETE /api/production-orders/:id
Remove a OP. Requer papel `admin`. Não permitido se a OP estiver `in_progress` ou `completed`.

> Nota de arquitetura: os endpoints de `/api/production-orders` são servidos
> pelo módulo `server/src/modules/production/` (Clean Architecture). O
> consumo/entrada de estoque reutiliza `server/src/services/inventoryService.js`
> (lock pessimista + transação) e a explosão de BOM reutiliza
> `server/src/services/bomService.js`. Ver
> `server/src/modules/production/README.md` para detalhes de regras de
> negócio, a máquina de estados e pendências (ex.: registro de refugo).

---

## 11. Compras (Pedidos de Compra)

### GET /api/purchases
Lista pedidos de compra. Filtros: `status`, `supplier_id`, `start_date`, `end_date`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 1, "order_number": "PO-1730000000000", "status": "pending", "total_amount": "1500.00", "supplier": { "id": 2, "company_name": "Fornecedor X" } } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET /api/purchases/:id
Detalhes do pedido, com fornecedor e itens (+ produto).

### POST /api/purchases
Cria um pedido de compra com itens (transacional).
```json
{
  "supplier_id": 2,
  "expected_date": "2026-08-15",
  "notes": "Reposição de bobinas",
  "items": [
    { "product_id": 10, "quantity": 100, "unit_price": 12.5 }
  ]
}
```
`order_number` (`PO-<timestamp>`) e `total_amount` são calculados no backend. Cada `product_id` deve existir.

### PUT /api/purchases/:id
Atualiza campos permitidos (`expected_date`, `freight_type`, `freight_value`, `notes`, `supplier_id`). Só permitido enquanto o pedido está `pending` ou `approved`.

### PUT /api/purchases/:id/status
Altera o status conforme a máquina de estados `pending → approved → sent → partial/received/canceled`.
```json
{ "status": "approved" }
```
Ao transicionar para `approved`, gera automaticamente uma `AccountPayable` vinculada ao pedido (idempotente), em uma única transação com o `save()` do status.

### POST /api/purchases/:id/receive
Registra o recebimento (total ou parcial) dos itens do pedido. Só permitido enquanto o pedido está `sent` ou `partial`.
```json
{
  "items": [
    { "item_id": 7, "quantity": 60 }
  ]
}
```
Cada item não pode exceder a quantidade pendente (`quantity - received_quantity`). Dá entrada no estoque via `InventoryService.receive` (lock pessimista + transação) e atualiza o status do pedido e dos itens.

> Nota de arquitetura: os endpoints de `/api/purchases` são servidos pelo
> módulo `server/src/modules/purchases/` (Clean Architecture). O
> recebimento reutiliza `server/src/services/inventoryService.js` (lock
> pessimista + transação). Erros de validação/regra de negócio retornam
> `{ success: false, error: { code, message } }` (em vez de string simples,
> mesmo padrão já adotado em `inventory`/`bom`/`production`). Ver
> `server/src/modules/purchases/README.md` para detalhes de regras de
> negócio, a máquina de estados e a correção de atomicidade da aprovação.

---

## 12. Fornecedores

### GET /api/suppliers
Lista fornecedores. Filtros: `search` (busca por `company_name`/`cnpj`, sanitizada), `status`; paginação: `page`, `limit`.
```json
{
  "success": true,
  "data": [ { "id": 2, "company_name": "Fornecedor X", "cnpj": "12345678000199", "status": "active", "rating": 3 } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET /api/suppliers/:id
Detalhes de um fornecedor. `404` (`{ "success": false, "error": "Fornecedor não encontrado" }`) se o id não existir.

### POST /api/suppliers
Cria um fornecedor.
```json
{
  "company_name": "Fornecedor X Ltda",
  "cnpj": "12.345.678/0001-99",
  "trade_name": "Fornecedor X",
  "ie": "123456789",
  "phone": "(11) 99999-0000",
  "email": "contato@fornecedorx.com",
  "contact_name": "João",
  "contact_phone": "(11) 98888-0000",
  "payment_terms": "30/60/90",
  "delivery_time": 15,
  "notes": "Fornecedor de bobinas"
}
```
`company_name` e `cnpj` são obrigatórios. O CNPJ é validado (dígito verificador) e salvo sem formatação (apenas dígitos). `rating` é sempre `3` e `status` sempre `"active"` na criação. CNPJ duplicado retorna `409`.

### PUT /api/suppliers/:id
Atualiza campos cadastrais (`company_name`, `trade_name`, `ie`, `phone`, `email`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `contact_name`, `contact_phone`, `payment_terms`, `delivery_time`, `rating`, `notes`). Não permite alterar `cnpj` nem `status` por este endpoint.

### DELETE /api/suppliers/:id
Inativa (soft delete, `status="inactive"`) um fornecedor. Bloqueado (`400`) se o fornecedor possuir pedidos de compra com status `pending`/`approved`/`sent`/`partial`:
```json
{ "success": false, "error": "Fornecedor possui 2 pedido(s) de compra pendente(s)." }
```

> Nota de arquitetura: os endpoints de `/api/suppliers` são servidos pelo
> módulo `server/src/modules/suppliers/` (Clean Architecture). Todas as
> rotas exigem apenas `authenticate` (sem `authorize` por papel). Erros de
> validação/regra de negócio preservam exatamente o mesmo corpo de resposta
> do controller legado (`{ success: false, error: "mensagem" }`), pois o
> `errorHandler` devolve `err.message` como string simples para erros com
> `statusCode < 500`. Este módulo **não gera auditoria** (`AuditLog`) em
> nenhum endpoint — pendência conhecida documentada em
> `server/src/modules/suppliers/README.md`.

---

## Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token ausente ou inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Duplicidade (CPF, email, etc) |
| 422 | Unprocessable Entity - Validação |
| 500 | Internal Server Error |

---

## Exemplos de Uso (cURL)

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evokaudio.com.br","password":"123456"}'
```

### Listar Clientes (autenticado)
```bash
curl http://localhost:5000/api/clients?page=1&limit=10 \
  -H "Authorization: Bearer <token>"
```

### Criar Venda
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 1, "quantity": 2, "unit_price": 599.90}],
    "payment_method": "pix",
    "installments": 1
  }'
