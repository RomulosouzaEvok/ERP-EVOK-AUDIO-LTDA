# SIM-002 "PagaFácil" — Dicionário de Dados

Banco relacional SQLite (`node:sqlite`). Tipos declarados conforme afinidade
SQLite. Todas as chaves primárias são inteiras autoincrementais.

---

## companies

Empresas (tenants) que operam no sistema.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK | Identificador da empresa. |
| `name` | TEXT | NOT NULL | Razão social da empresa. |
| `created_at` | TEXT | NOT NULL | Data/hora de criação (ISO 8601). |

## suppliers

Fornecedores cadastrados, sempre vinculados a uma empresa.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK | Identificador do fornecedor. |
| `company_id` | INTEGER | NOT NULL, FK → `companies.id` | Empresa proprietária do cadastro (BR-SEC-001). |
| `cnpj` | TEXT | **UNIQUE**, NOT NULL | CNPJ do fornecedor; identificador único no sistema (BR-SUP-002). |
| `name` | TEXT | NOT NULL | Razão social do fornecedor. |
| `status` | TEXT | NOT NULL, default `pending` | Situação cadastral: `pending`, `approved`, `rejected` (BR-SUP-001). |
| `credit_limit` | REAL | NOT NULL, default `0` | Limite de crédito aprovado, em reais (BR-APR-001, BR-PAY-001). |
| `approved_by` | TEXT | NULL | Identificador do usuário aprovador. |
| `approved_at` | TEXT | NULL | Data/hora da aprovação (ISO 8601). |
| `created_at` | TEXT | NOT NULL | Data/hora do cadastro (ISO 8601). |

## payments

Pagamentos registrados para um fornecedor.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK | Identificador do pagamento. |
| `supplier_id` | INTEGER | NOT NULL, FK → `suppliers.id` | Fornecedor destinatário. |
| `company_id` | INTEGER | NOT NULL, FK → `companies.id` | Empresa pagadora (BR-SEC-001). |
| `amount` | REAL | NOT NULL | Valor do pagamento, em reais; deve ser positivo. |
| `status` | TEXT | NOT NULL, default `created` | Situação do pagamento: `created`, `sent`, `cancelled`. |
| `external_ref` | TEXT | NULL | Referência devolvida pelo gateway após o envio. |
| `created_by` | TEXT | NOT NULL | Identificador do usuário que registrou o pagamento. |
| `created_at` | TEXT | NOT NULL | Data/hora do registro (ISO 8601). |
| `sent_at` | TEXT | NULL | Data/hora do envio ao gateway (ISO 8601). |

## payment_attempts

Trilha das chamadas efetuadas ao gateway de pagamento.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PK | Identificador da tentativa. |
| `payment_id` | INTEGER | NOT NULL, FK → `payments.id` | Pagamento correspondente. |
| `external_ref` | TEXT | NULL | Referência externa retornada na tentativa. |
| `result` | TEXT | NOT NULL | Resultado da chamada: `accepted` ou `failed`. |
| `attempted_at` | TEXT | NOT NULL | Data/hora da chamada (ISO 8601). |
