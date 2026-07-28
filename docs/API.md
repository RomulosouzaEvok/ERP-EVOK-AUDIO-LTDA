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

**Erro (400/401/404/500):**
```json
{
  "success": false,
  "error": "Mensagem do erro"
}
```

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

**Erro (401):**
```json
{
  "success": false,
  "error": "Email ou senha incorretos"
}
```

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
Inativa um produto.

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

### GET /api/finance/receivable
Contas a receber.

**Query Params:** status, start_date, end_date, customer_id

### GET /api/finance/payable
Contas a pagar.

### POST /api/finance/payable
Registra nova conta a pagar.

**Request:**
```json
{
  "description": "Conta de Luz",
  "amount": 450.00,
  "due_date": "2024-02-10",
  "category": "Utilidades"
}
```

### PUT /api/finance/receivable/:id/pay
Registra recebimento de conta.

**Request:**
```json
{
  "payment_date": "2024-01-20",
  "payment_method": "pix",
  "amount": 413.23
}
```

### PUT /api/finance/payable/:id/pay
Registra pagamento de conta.

### GET /api/finance/cash-flow
Fluxo de caixa por período.

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "summary": {
      "total_receivable": 25000.00,
      "total_payable": 18000.00,
      "balance": 7000.00
    },
    "daily_flow": [
      {
        "date": "2024-01-15",
        "receipts": 5000.00,
        "payments": 3000.00,
        "balance": 2000.00
      }
    ]
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
