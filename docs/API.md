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

**Erro (400/401/404/500) — formato anterior (string):**

Ainda usado por respostas de validação simples e mensagens de negócio pontuais em alguns controllers:
```json
{
  "success": false,
  "error": "Mensagem do erro"
}
```

**Erro padronizado (`AppError` e subclasses) — formato estruturado:**

Erros lançados via `server/src/errors` (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BusinessRuleError`) e tratados pelo `errorHandler` central (`server/src/middlewares/errorHandler.ts`) retornam:
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

### GET /api/auth/me/permissions
Retorna o mapa `módulo → nível` do usuário autenticado e o perfil de
acesso atual, para o frontend montar o menu (UC-34). Não faz query
adicional ao banco — reaproveita `req.user.permissions`, já resolvido por
`authenticate` junto do `AccessProfile` do usuário.

**Headers:** Authorization: Bearer \<token\>

**Response (200) — usuário `admin` global (todos os módulos, sempre `approve`):**
```json
{
  "success": true,
  "data": {
    "modules": { "dashboard": "approve", "estoque": "approve", "...": "approve" },
    "profile": null
  }
}
```

**Response (200) — usuário com perfil "Almoxarife":**
```json
{
  "success": true,
  "data": {
    "modules": { "estoque": "operate", "producao": "operate", "dashboard": "operate" },
    "profile": { "id": 3, "nome": "Almoxarife" }
  }
}
```

**Response (200) — usuário sem perfil atribuído (UC-35-Exceção):**
```json
{ "success": true, "data": { "modules": {}, "profile": null } }
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

### PUT /api/users/:id/access-profile
Atribui (ou remove, com `access_profile_id: null`) o perfil de acesso de
área do usuário (UC-33). A troca **não** invalida sessão/token já
emitidos do usuário-alvo (UC-36 — vale a partir do próximo login para o
menu; a API já reflete o novo perfil na próxima requisição, sem cache).

**Headers:** Authorization: Bearer \<token\> (role: admin)

**Request:**
```json
{ "access_profile_id": 3 }
```

**Response (200):**
```json
{ "success": true, "data": { "id": 12, "accessProfileId": 3 } }
```

**Erro (404)** — usuário ou perfil informado não existem.
**Erro (422)** — perfil informado existe mas está `active = false` (`BusinessRuleError`).

---

## 1.2 Perfis de Acesso (Access Profiles)

Endpoints de gestão dos Perfis de Acesso Configuráveis (UC-30 a UC-32,
`docs/business/01-USE_CASES.md`). Todos os endpoints abaixo exigem
`authenticate` + `authorize('admin')` — CRUD de perfis é exclusivo do
Administrador Global, nunca delegado a um perfil de área (mesmo com
`approve`).

### GET /api/access-profiles/modules
Lista os 26 `module keys` válidos, com rótulo pt-BR — fonte única
compartilhada com o middleware `authorizeModule`.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "key": "dashboard", "label": "Dashboard" },
    { "key": "estoque", "label": "Estoque" },
    "..."
  ]
}
```

### GET /api/access-profiles
Lista todos os perfis (ativos e inativos), com a matriz de permissões e a
contagem de usuários **ativos** vinculados a cada um.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "nome": "Almoxarife",
      "descricao": null,
      "allowedWarehouses": null,
      "active": true,
      "permissions": [{ "module": "estoque", "level": "operate" }],
      "userCount": 5
    }
  ]
}
```

### GET /api/access-profiles/:id
Busca um perfil por id, mesmo formato do item da listagem acima.
**Erro (404)** se não existir.

### POST /api/access-profiles
Cria um novo perfil de acesso (UC-30).

**Request:**
```json
{
  "nome": "Almoxarife",
  "descricao": "Movimentação de estoque de insumos",
  "allowed_warehouses": ["INSUMOS"],
  "permissions": [
    { "module": "estoque", "level": "approve" },
    { "module": "producao", "level": "operate" }
  ]
}
```

**Response (201):** mesmo formato do item de `GET /api/access-profiles` (com `userCount: 0`).

**Erro (409)** — `nome` duplicado.
**Erro (422)** — nenhuma permissão informada, `module` inválido/duplicado, ou `level` fora de `operate|approve`.

### PUT /api/access-profiles/:id
Edita um perfil existente, **substituindo integralmente** a matriz de
`permissions` (UC-31). Mesmo payload do `POST`. Audita `oldValues`/`newValues`
com a matriz de permissões anterior completa.

**Erro (404)** — perfil não existe.
**Erro (409)/(422)** — mesmas regras do `POST`.

### DELETE /api/access-profiles/:id
Desativa (soft delete, `active = false`) um perfil (UC-32).

**Response (200):**
```json
{ "success": true, "data": { "id": 3, "nome": "Almoxarife", "active": false } }
```

**Erro (422)** — há usuário(s) ativo(s) vinculado(s) ao perfil (`BusinessRuleError`):
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Não é possível desativar o perfil \"Almoxarife\": há 2 usuário(s) ativo(s) vinculado(s) a ele. Reatribua cada usuário a outro perfil (PUT /api/users/:id/access-profile) antes de desativar.",
    "details": {
      "profileId": 3,
      "profileName": "Almoxarife",
      "userCount": 2,
      "users": [{ "id": 1, "name": "João", "email": "joao@evokaudio.com" }]
    }
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

### GET /api/products/:id/stock-by-warehouse
**Novo (Bloco 4 — Depósitos).** Retorna o saldo de UM produto específico,
detalhado por depósito (`authorizeModule('estoque')`, nível de leitura —
mesmo padrão do endpoint de listagem `GET /api/inventory/warehouse-stock`).
Complementa `GET /api/inventory/warehouse-stock?product_id=` (que cobre o
mesmo caso de uso via query param, com paginação para múltiplos produtos)
com uma rota aninhada dedicada ao detalhe de um único produto.

**Decisão de escopo:** a resposta inclui **todos os depósitos ativos**,
mesmo aqueles em que o produto ainda não tem nenhuma linha em
`product_warehouse_stock` (retornados com `quantity: 0`) — ao contrário do
backfill original (que só cria linha para saldo > 0). Isso evita que o
frontend precise cruzar a lista de depósitos com a lista de saldos para
descobrir os que faltam (ex.: tela de transferência precisa oferecer os 3
depósitos como origem/destino mesmo que o saldo atual em algum deles seja
zero).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": { "id": 1, "code": "AF-001", "name": "Alto-Falante 8\"", "quantity": "100.000000" },
    "warehouses": [
      { "warehouse_id": 2, "warehouse_code": "ACABADOS", "warehouse_name": "Deposito de Produto Acabado", "quantity": 0 },
      { "warehouse_id": 1, "warehouse_code": "INSUMOS", "warehouse_name": "Deposito de Insumos de Producao", "quantity": 100 },
      { "warehouse_id": 3, "warehouse_code": "LABORATORIO", "warehouse_name": "Deposito do Laboratorio", "quantity": 0 }
    ]
  }
}
```

**Erro (404) — produto inexistente (`NotFoundError`, `NOT_FOUND`).**

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
> reutiliza `server/src/services/inventoryService.ts` (lock pessimista +
> transacao) para debitar estoque, e `server/src/shared/utils/money.ts`
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
| status | string | quote, confirmed, invoiced, shipped, canceled |
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
Atualiza status da venda (máquina de estados: `quote` → `confirmed` →
`invoiced` → `shipped`; `canceled` disponível a partir de
`quote`/`confirmed`/`invoiced`). `shipped` é terminal: não pode ser
cancelada (422) nem transicionar para nenhum outro status.

**Request:**
```json
{
  "status": "canceled"
}
```

**Request (expedição, Onda 3):**
```json
{
  "status": "shipped"
}
```
Só é aceito a partir de `invoiced`. Qualquer outra origem retorna 422
(`BusinessRuleError`). Cancelar uma venda já `shipped` também retorna 422,
com a mensagem "Venda já foi expedida (status shipped) e não pode ser
cancelada."

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

### GET /api/finance/cash-flow-projection
**(Onda 3)** Projeção semanal de fluxo de caixa dos títulos EM ABERTO
(`accounts_receivable`/`accounts_payable` com `payment_date IS NULL` e
`status != 'canceled'`), com saldo acumulado por semana. Exige
`authorize('admin', 'financial')`.

**Query Params:** `days` (int, 7 a 90, default 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "horizon_days": 30,
    "totals": {
      "receivable": 25000.00,
      "payable": 18000.00,
      "net": 7000.00,
      "overdue_receivable": 1200.00,
      "overdue_payable": 300.00
    },
    "due_next_7_days": { "receivable": 4000.00, "payable": 2500.00 },
    "weeks": [
      {
        "week_start": "2026-08-03",
        "week_end": "2026-08-09",
        "receivable": 4000.00,
        "payable": 2500.00,
        "net": 1500.00,
        "cumulative_net": 1500.00
      }
    ]
  }
}
```
Títulos vencidos e não pagos (`due_date < hoje`) entram apenas em
`totals.overdue_receivable`/`totals.overdue_payable`, nunca em nenhuma
semana do horizonte futuro. `cumulative_net` acumula o `net` de todas as
semanas anteriores.

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

**Query Params:** product_id, type (in/out), start_date, end_date, warehouse_id (INTEGER, opcional — filtra movimentações de um depósito específico, Bloco 4 UC-42; quando ausente, lista de todos os depósitos como antes)

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

## 8.1 Múltiplos Depósitos

Base URL: `/api/inventory`. Depósito físico do estoque (ex.: INSUMOS,
ACABADOS, LABORATORIO — Bloco 4, UC-42, docs/business/BUSINESS_RULES.md
§12). O saldo total de um produto é sempre a soma dos saldos em todos os
depósitos ativos (`ProductWarehouseStock`).

### GET /api/inventory/warehouses
Lista depósitos ativos (`authorizeModule('estoque')`), ordenados por `code`.

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "INSUMOS", "name": "Depósito Insumos", "description": null, "active": true, "createdAt": "...", "updatedAt": "..." },
    { "id": 2, "code": "ACABADOS", "name": "Depósito Acabados", "description": null, "active": true, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### POST /api/inventory/warehouses
Cria um novo depósito (`authorizeModule('estoque', 'approve')` — mesmo
nível exigido para aprovar/rejeitar transferência). `code` é obrigatório,
único e normalizado para uppercase antes de persistir.

**Request:**
```json
{
  "code": "expedicao",
  "name": "Depósito Expedição",
  "description": "Área de separação para envio",
  "active": true
}
```
- `code` (string, obrigatório, máx. 30) — normalizado para uppercase (`EXPEDICAO`).
- `name` (string, obrigatório, máx. 100).
- `description` (string, opcional, máx. 2000, aceita `null`).
- `active` (boolean, opcional, default `true`).

**Response (201):**
```json
{
  "success": true,
  "data": { "id": 4, "code": "EXPEDICAO", "name": "Depósito Expedição", "description": "Área de separação para envio", "active": true, "createdAt": "...", "updatedAt": "..." }
}
```

**Erro (400) — `code`/`name` ausente ou payload inválido (`ValidationError`, `VALIDATION_ERROR`); erro (409) — já existe depósito com o mesmo `code` (case-insensitive) (`ConflictError`, `CONFLICT`):**
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "Já existe um depósito com o código \"INSUMOS\"." } }
```

### PUT /api/inventory/warehouses/:id
Edita `name`/`description`/`active` de um depósito existente
(`authorizeModule('estoque', 'approve')`). **`code` nunca é editável** —
é a chave usada por `WarehouseStockService.getWarehouseByCode` em todo o
roteamento automático do dual-write (recebimento, produção, vendas,
laboratório, transferências); enviar `code` no corpo retorna 400
(`ValidationError`, schema é `.strict()`). Desativação lógica é feita com
`{ "active": false }` — não existe DELETE físico.

**Request (todos os campos opcionais, mas ao menos um deve ser enviado):**
```json
{
  "name": "Depósito Insumos Renomeado",
  "description": "Nova descrição",
  "active": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "id": 1, "code": "INSUMOS", "name": "Depósito Insumos Renomeado", "description": "Nova descrição", "active": false, "createdAt": "...", "updatedAt": "..." }
}
```

**Erro (404) — depósito inexistente (`NotFoundError`, `NOT_FOUND`).**

### GET /api/inventory/warehouse-stock
Lista saldos por par produto×depósito (`authorizeModule('estoque')`).

**Query Params:** product_id, warehouse_code, page, limit

> Ver também `GET /api/products/:id/stock-by-warehouse` (seção 3. Produtos)
> — mesmo caso de uso, mas voltado ao detalhe de UM produto específico
> (sem paginação, sempre traz todos os depósitos ativos, inclusive com
> saldo 0).

### GET /api/inventory/transfers
Lista transferências entre depósitos (`authorizeModule('estoque')`).

**Query Params:** status (pending/approved/rejected)

### POST /api/inventory/transfers
Solicita transferência de saldo entre depósitos
(`authorizeModule('estoque', 'operate')`). Cria em `status='pending'` —
não altera nenhum saldo até a aprovação.

**Request:**
```json
{
  "product_id": 10,
  "from_warehouse_code": "INSUMOS",
  "to_warehouse_code": "LABORATORIO",
  "quantity": 7,
  "reason": "Cessão para teste destrutivo"
}
```

### PUT /api/inventory/transfers/:id/approve
Aprova uma transferência pendente (`authorizeModule('estoque', 'approve')`). Executa débito/crédito atômico entre depósitos e gera 2 `InventoryMovement` (`type='transfer'`).

### PUT /api/inventory/transfers/:id/reject
Rejeita uma transferência pendente (`authorizeModule('estoque', 'approve')`), com `body.reason` obrigatório.

---

## 8.2 Inventário Cíclico (Contagens)

Base URL: `/api/inventory-counts`. Todas as rotas exigem JWT válido
(`authenticate`) e `authorizeModule('contagens', ...)` — leituras exigem
`view` implícito, escritas comuns exigem `operate`, aprovar/rejeitar/reatribuir
exigem `approve`.

O app mobile (`mobile/`, construído em paralelo em outro time — mesma
lógica de paridade do app Android TV citado na seção 14) é o consumidor
principal do fluxo de contagem cíclica no chão de fábrica: lista/filtra
contagens (`GET /api/inventory-counts?assigned_to=me`/`unassigned=true`),
inicia (`POST /:id/start`) e registra as quantidades contadas
(`POST /:id/items/:itemId/count`). O painel web é usado para criar
contagens, aprovar/rejeitar e reatribuir.

Workflow de status: `draft` → `counting` → `pending_approval` → `approved`
→ `adjusted` (ou `pending_approval` → `rejected`).

### Atribuição a funcionário (`assigned_to`) e "pool"

Toda contagem tem um campo opcional `assigned_to` (id de usuário):

- **Atribuição específica:** informado na criação (`assigned_to` no
  payload) — só aquele funcionário pode iniciar a contagem.
- **Pool:** `assigned_to` ausente/`null` na criação — qualquer funcionário
  autorizado (`operate` em `contagens`, mesmo depósito) pode "pegar" a
  contagem chamando `POST /:id/start`.
- Em criação e reatribuição, `assigned_to` (quando informado e não-`null`)
  precisa apontar para um usuário que existe e está ATIVO — caso
  contrário, **422** `BUSINESS_RULE_VIOLATION` com mensagem didática.

### POST /api/inventory-counts
Cria uma contagem (`status='draft'`) (`authorizeModule('contagens', 'operate')`).

**Request:**
```json
{
  "count_type": "cycle",
  "warehouse_id": 2,
  "location": "Corredor A",
  "notes": "Contagem mensal",
  "item_ids": ["uuid-item-1", "uuid-item-2"],
  "assigned_to": 15,
  "department_id": 3
}
```
`warehouse_id` é obrigatório. `product_ids` (legado) OU `item_ids` (novo,
preferido) são opcionais e mutuamente aceitos (dual-read). `assigned_to` é
opcional — ausente/`null` deixa a contagem no pool. `department_id` é
**opcional** (FK → `departments.id`) — departamento dono da contagem, usado
apenas pelo painel de TV (`GET /api/dashboard/department-demands`); ausente
= contagem aparece no grupo "Sem departamento" do painel.

### GET /api/inventory-counts
Lista contagens com filtros e paginação (`authorizeModule('contagens')`).

**Query Params:**
- `status`, `count_type` (filtros pré-existentes, inalterados)
- `assigned_to=<id>` — contagens atribuídas a um funcionário específico
- `assigned_to=me` — atalho: resolvido pelo servidor para o id do usuário
  autenticado (contagens atribuídas a mim)
- `unassigned=true` — apenas contagens do pool (`assigned_to IS NULL`);
  tem prioridade sobre `assigned_to` se ambos forem informados; tipicamente
  combinado com `status=draft` para montar a tela "contagens disponíveis
  para pegar"
- `page`, `limit`

### GET /api/inventory-counts/:id
Busca uma contagem por id, com itens (`authorizeModule('contagens')`).

### POST /api/inventory-counts/:id/start
Inicia a contagem, `draft` → `counting` (`authorizeModule('contagens', 'operate')`).

Resolve a atribuição de forma atômica:
- Contagem no pool (`assigned_to IS NULL`): faz o **claim** — `assigned_to`
  passa a ser o usuário logado. Em corrida entre dois usuários, apenas um
  vence (lock pessimista `SELECT ... FOR UPDATE` dentro de transação).
- Contagem já atribuída a **outro** usuário e quem inicia **não é
  `admin`**: rejeita com **409 Conflict** — `{ "success": false, "error": { "code": "CONFLICT", "message": "Esta contagem já foi atribuída a outro funcionário." } }`.
- Contagem já atribuída a **outro** usuário e quem inicia **é `admin`**:
  **override permitido** (achado de auditoria 2026-08-06, item 1b) — a
  contagem passa a ser do admin, sem erro. Auditado (`AuditLog`) com
  `oldValues.assigned_to` (responsável anterior) e
  `newValues.assigned_to` (admin) para rastreabilidade.
- Contagem já atribuída ao **próprio** usuário: segue normalmente
  (idempotente, nenhuma reatribuição).

### PUT /api/inventory-counts/:id/reassign
Reatribui a contagem a outro funcionário, ou devolve ao pool
(`authorizeModule('contagens', 'approve')`, exclusivo de gestor/admin —
achado de auditoria 2026-08-06, item 1a). Corrige o cenário em que uma
contagem atribuída a um funcionário de férias/desligado ficava presa em
`draft` para sempre, sem nenhuma via oficial de recuperação além de
`UPDATE` manual no banco.

**Request:**
```json
{ "assigned_to": 42 }
```
`assigned_to` é **obrigatório** no payload (pode ser `null` para devolver
ao pool — a intenção precisa ser explícita, o campo não pode ser
omitido). Quando não-`null`, precisa ser um usuário ativo (ver acima).

Só permitido com a contagem em `draft` ou `counting` — **422**
`BUSINESS_RULE_VIOLATION` caso contrário, com `details`:
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Apenas contagens em status 'draft' ou 'counting' podem ser reatribuídas. Status atual: 'pending_approval'.",
    "details": { "current_status": "pending_approval", "allowed_statuses": ["draft", "counting"] }
  }
}
```

**Response:** `200 OK`, mesmo formato de `GET /api/inventory-counts/:id`
(contagem atualizada, com `assigned_to`/`assignedTo` refletindo a nova
atribuição). Auditado com `oldValues.assigned_to` (anterior) e
`newValues.assigned_to` (novo).

### POST /api/inventory-counts/:id/items/:itemId/count
Registra a quantidade contada de um item (`authorizeModule('contagens', 'operate')`).

### POST /api/inventory-counts/:id/submit
Envia para aprovação, `counting` → `pending_approval` (`authorizeModule('contagens', 'operate')`).

### POST /api/inventory-counts/:id/approve
Aprova a contagem, `pending_approval` → `adjusted` (`authorizeModule('contagens', 'approve')`, exclusivo do painel web). Ajusta `Product.quantity` e o saldo do depósito da contagem para cada item com variância.

### POST /api/inventory-counts/:id/reject
Rejeita a contagem, `pending_approval` → `rejected` (`authorizeModule('contagens', 'approve')`, exclusivo do painel web), com `body.reason` opcional.

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
> permanece em `server/src/services/bomService.ts`. Ver
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
  "department_id": 3,
  "notes": "Lote para pedido X"
}
```
O `order_number` (`OP-<ano>-XXXX`) é gerado automaticamente. O produto deve estar `active` e ser do tipo `finished`. `department_id` é **opcional** (FK → `departments.id`) — departamento dono da OP, usado apenas pelo painel de TV (`GET /api/dashboard/department-demands`); ausente = OP aparece no grupo "Sem departamento" do painel.

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
> consumo/entrada de estoque reutiliza `server/src/services/inventoryService.ts`
> (lock pessimista + transação) e a explosão de BOM reutiliza
> `server/src/services/bomService.ts`. Ver
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

### GET /api/purchases/cockpit
**(Onda 3)** Métricas agregadas do cockpit de compras, somente leitura,
sem paginação. Rota registrada ANTES de `/api/purchases/:id`.
```json
{
  "success": true,
  "data": {
    "pending_requisitions": 3,
    "open_orders": { "count": 5, "total_amount": 45230.50 },
    "arriving_this_week": 2,
    "overdue": 1
  }
}
```
- `pending_requisitions`: `purchase_requisitions` com `status = 'pending'`.
- `open_orders`: `purchase_orders` com `status` em `pending`/`approved`/`sent`/`partial`.
- `arriving_this_week`: pedidos com `status` em `sent`/`approved`/`partial` e `expected_date` entre hoje e hoje+7 dias.
- `overdue`: pedidos com `status` fora de `received`/`canceled`, `expected_date` vencida e sem `delivery_date`.

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
> recebimento reutiliza `server/src/services/inventoryService.ts` (lock
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
  "data": [ { "id": 2, "company_name": "Fornecedor X", "cnpj": "12345678000199", "status": "active", "rating": 3, "quality_score": "100.00" } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```
`quality_score` (item 8 do levantamento, realimentação de rating a partir de
RNCs): `DECIMAL(5,2)` **somente leitura** — não existe no schema Zod de
`POST/PUT` (`.strict()`), logo nenhum payload consegue setá-lo. É recalculado
de forma síncrona, na mesma transação de `POST /api/non-conformities`, apenas
quando a RNC referencia um lote (`lot_number`+`product_id`) cujo
`lot_controls.supplier_id` está preenchido — fórmula em
`server/src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase.ts`
(`recalculateSupplierQualityScore`). Distinto de `rating` (inteiro 1-5,
digitado manualmente no cadastro).

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
> do controller anterior (`{ success: false, error: "mensagem" }`), pois o
> `errorHandler` devolve `err.message` como string simples para erros com
> `statusCode < 500`. Este módulo **não gera auditoria** (`AuditLog`) em
> nenhum endpoint — pendência conhecida documentada em
> `server/src/modules/suppliers/README.md`.

---

## 13. MRP (Planejamento de Materiais)

> Módulo `server/src/modules/mrp/` (Clean Architecture). Todas as rotas exigem
> `authenticate` + `authorizeModule('mrp', ...)`. Rotas de leitura exigem
> permissão `view` implícita; rotas de escrita (`plan`, `planned-orders/convert`)
> exigem `operate`.

### POST /api/mrp/plan
Roda o MRP contra o estoque real (não congelado) e cria ordens planejadas a partir de uma lista de demandas.
```json
{
  "demands": [
    { "item_id": "uuid-item", "quantidade": 100, "data_necessidade": "2026-08-20", "origem": "PEDIDO_VENDA" }
  ]
}
```
`origem` aceita `MANUAL`, `PEDIDO_VENDA`, `PREVISAO`, `ORDEM_PRODUCAO`. Retorna `201` com a lista de ordens planejadas geradas (`necessidade_bruta`, `estoque_disponivel`, `necessidade_liquida`, `quantidade_planejada`, `status` inicial `RASCUNHO`, ou `EM_EXECUCAO` para as convertidas automaticamente — ver abaixo).

**Fechamento automático do ciclo (roadmap pós-Go-Live item 3):** na mesma
transação em que o plano é persistido, ordens planejadas cujo item tem
`items.conversao_automatica = true` são convertidas automaticamente em
Requisição de Compra (`origin: "mrp_auto"`, `requester_id` = usuário que
chamou este endpoint), sem esperar a seleção manual do UC-24
(`POST /api/mrp/planned-orders/convert`, `origin: "mrp"`). Itens sem a
flag (padrão `false`) continuam exigindo a conversão manual — comportamento
inalterado. Decisão de design completa e justificativa (por que não é
100% automático para todo item) em `docs/projeto/04-USE_CASES.md` (UC-24b)
e no cabeçalho da migration
`server/migrations/20260804-000010-add-mrp-auto-convert-to-items.cjs`.

### GET /api/mrp/planned-orders
Lista as ordens planejadas geradas pelo MRP, com o item relacionado (`id`, `codigo`, `descricao`).

### POST /api/mrp/planned-orders/convert
Converte um lote de ordens planejadas (status `RASCUNHO` ou `APROVADA`) em uma única **Requisição de Compra**, fechando o ciclo planejamento → suprimentos. A identidade do solicitante (`requester_id`) vem sempre de `req.user` (JWT) — nunca do body. A operação é atômica (transação Sequelize): se qualquer ordem informada não existir ou estiver em status inválido, nada é persistido.

Requisição:
```json
{
  "planned_order_ids": ["order-uuid-1", "order-uuid-2"],
  "notes": "Urgente cliente XPTO"
}
```
`notes` é opcional (default: `"Gerada automaticamente do plano MRP"`).

Resposta (`201`):
```json
{
  "success": true,
  "data": {
    "requisition": {
      "id": 99,
      "requisition_number": "RQ-1723123456789",
      "status": "pending",
      "origin": "mrp",
      "items": [
        {
          "item_id": "uuid-item",
          "quantity": "10.000000",
          "required_date": "2026-08-20",
          "suggested_supplier_id": 7,
          "unit_price_estimated": 12.5
        }
      ]
    },
    "converted_ids": ["order-uuid-1", "order-uuid-2"]
  }
}
```

Regras de negócio:
- Todas as ordens informadas devem existir; caso contrário `404` (`NotFoundError`).
- Todas devem estar em status `RASCUNHO` ou `APROVADA`; caso contrário `422` (`BusinessRuleError`) com a lista de ids inválidos em `invalid_ids` — nenhuma conversão parcial é permitida.
- Uma única requisição é criada (`origin: "mrp"`), com um item de requisição por ordem convertida.
- O fornecedor preferencial ativo do item (`ItemSupplier`), quando existir, é sugerido automaticamente (`suggested_supplier_id`) junto com o preço de referência (`unit_price_estimated`).
- Ao final, as ordens planejadas convertidas são marcadas como `EM_EXECUCAO`.

---

## 14. Dashboard / Painel de TV

### GET /api/dashboard/department-demands
Painel de TV (gestores) — demandas em aberto agrupadas por departamento, para acompanhamento sem precisar entrar no sistema (consumido pelo app Android TV construído em paralelo em `tv/`). Somente leitura; qualquer usuário autenticado com acesso ao módulo `dashboard` (`authorizeModule('dashboard')`, mesma autorização de `GET /api/dashboard` e `GET /api/dashboard/handoffs`).

Agrega, sem paginação, 3 entidades por departamento:
- **OPs** (`open_production_orders`): status `planned`, `released`, `in_progress` ou `paused` (tudo que não é `completed`/`canceled`).
- **Requisições de compra** (`open_purchase_requisitions`): status `draft`, `pending` ou `approved` (ainda não convertidas em pedido de compra pelo MRP/Compras — a partir de `ordered` a requisição deixa de ser demanda do departamento requisitante).
- **Contagens de inventário** (`open_inventory_counts`): status `draft`, `counting` ou `pending_approval`.

Inclui sempre um grupo agregado `department_id: null` ("Sem departamento") — cobre hoje 100% do histórico de OPs e contagens (campo novo, sem backfill retroativo por design, ver `docs/DATABASE.md`) e qualquer requisição legada sem departamento atribuído.

```json
{
  "success": true,
  "data": [
    {
      "department_id": 3,
      "department_name": "Producao",
      "open_production_orders": {
        "count": 2,
        "items": [
          { "id": 10, "reference": "OP-2026-0001", "status": "planned", "due_date": "2026-08-10", "label": "Alto-falante 12in" }
        ]
      },
      "open_purchase_requisitions": { "count": 0, "items": [] },
      "open_inventory_counts": {
        "count": 1,
        "items": [
          { "id": 30, "reference": "CC-2026-0001", "status": "counting", "due_date": null, "label": "cycle" }
        ]
      }
    },
    {
      "department_id": null,
      "department_name": "Sem departamento",
      "open_production_orders": { "count": 5, "items": [ "..." ] },
      "open_purchase_requisitions": { "count": 1, "items": [ "..." ] },
      "open_inventory_counts": { "count": 3, "items": [ "..." ] }
    }
  ]
}
```

Departamentos ativos aparecem em ordem alfabética; o grupo `"Sem departamento"` é sempre o último item da lista. Demandas vinculadas a um departamento inativo (soft delete, `active = false`) não aparecem em nenhum grupo até o departamento ser reativado.

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
