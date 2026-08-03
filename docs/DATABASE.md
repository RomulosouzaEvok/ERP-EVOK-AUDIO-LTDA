# Modelagem de Dados - ERP EVOK ÁUDIO

## Tecnologia
- **ORM:** Sequelize 6.x
- **Banco:** PostgreSQL 16 (único suportado; 24+ migrations versionadas, 133 FKs)
- **Migrações:** `sequelize-cli` com migrations versionadas em todos os ambientes

---

## Diagrama de Entidades e Relacionamentos

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│    users    │     │   customers      │     │ product_categories  │
├─────────────┤     ├──────────────────┤     ├─────────────────────┤
│ id (PK)     │     │ id (PK)          │     │ id (PK)             │
│ name        │     │ name             │     │ name (UQ)           │
│ email (UQ)  │     │ cpf_cnpj (UQ)    │     │ description         │
│ password    │     │ phone            │     │ active              │ ← NOVO
│ role        │     │ email            │     │ created_at          │
│ department  │     │ cep              │     │ updated_at          │
│ active      │     │ street           │     └────────┬────────────┘
│ created_at  │     │ number           │              │
│ updated_at  │     │ complement       │              │
└──────┬──────┘     │ neighborhood     │              │
       │            │ city             │    1:N        │
       │            │ state            │              │
       │            │ status           │     ┌────────▼────────────┐
       │            │ notes            │     │    products         │
       │            │ tax_regime       │     ├─────────────────────┤
       │            │ ie               │     │ id (PK)             │
       │            │ im               │     │ category_id (FK)    │
       │            │ ind_final        │     │ name                │
       │            │ ind_ie           │     │ code (UQ)           │
       │            │ cnae             │     │ description         │
       │            │ created_at       │     │ price               │
       │            │ updated_at       │     │ cost_price          │
       └──────┬─────┘                  │     │ quantity            │
              │                        │     │ min_quantity        │
              │ 1:N                    │     │ status              │
       ┌──────▼──────────────────┐     │     │ location            │
       │     sales               │     │     │ product_type        │
       ├─────────────────────────┤     │     │ ncm                 │
       │ id (PK)                 │     │     │ cest                │
       │ customer_id (FK)        │     │     │ weight              │
       │ user_id (FK)            │     │     │ unit                │
       │ total_amount            │     │     │ lead_time           │
       │ discount                │     │     │ drawing_number      │
       │ status                  │     │     │ revision            │
       │ payment_method          │     │     │ ts_params_* (13)    │
       │ installments            │     │     │ created_at          │
       │ notes                   │     │     │ updated_at          │
       │ nfe_number              │     │     └────────┬────────────┘
       │ nfe_status              │     │              │
       │ nfe_key                 │     │     ┌────────▼────────────┐
       │ created_at              │     │     │inventory_movements  │
       │ updated_at              │     │     ├─────────────────────┤
       └────────┬────────────────┘     │     │ id (PK)             │
                │                      │     │ product_id (FK)     │
       ┌────────▼────────────────┐     │     │ user_id (FK)        │
       │   sale_items            │     │     │ type (in/out/adj)   │ ← NOVO enum
       ├─────────────────────────┤     │     │ quantity            │
       │ id (PK)                 │     │     │ description         │
       │ sale_id (FK)            │     │     │ reference_id        │
       │ product_id (FK)         │     │     │ reference_type      │
       │ quantity                │     │     │ created_at          │ ← CORRIGIDO
       │ unit_price              │     │     └─────────────────────┘
       │ total_price             │     │
       └─────────────────────────┘     │
                                       │
┌─────────────────────┐     ┌──────────▼────────────┐
│ accounts_receivable │     │   suppliers           │
├─────────────────────┤     ├───────────────────────┤
│ id (PK)             │     │ id (PK)               │
│ sale_id (FK)        │     │ company_name          │
│ customer_id (FK)    │     │ trade_name            │
│ installment         │     │ cnpj (UQ)             │
│ amount              │     │ ie                    │
│ due_date            │     │ phone                 │
│ payment_date        │     │ email                 │
│ status              │     │ contact_name          │
│ payment_method      │     │ contact_phone         │
│ interest            │     │ payment_terms         │
│ fine                │     │ delivery_time         │
│ discount            │     │ rating                │
│ collection_status   │     │ status                │
│ notes               │     │ notes                 │
│ created_at          │     │ created_at            │
│ updated_at          │     │ updated_at            │
└─────────────────────┘     └──────────┬────────────┘
                                       │
┌─────────────────────┐     ┌──────────▼────────────┐
│ accounts_payable    │     │   purchase_orders     │
├─────────────────────┤     ├───────────────────────┤
│ id (PK)             │     │ id (PK)               │
│ description         │     │ order_number (UQ)     │
│ amount              │     │ supplier_id (FK)      │
│ due_date            │     │ requester_id (FK)     │
│ payment_date        │     │ status                │
│ status              │     │ requisition_id        │
│ category            │     │ order_date            │
│ supplier_id (FK)    │     │ expected_date         │
│ purchase_id (FK)    │     │ delivery_date         │
│ payment_type        │     │ freight_type          │
│ cost_center         │     │ freight_value         │
│ notes               │     │ total_amount          │
│ approved_by         │     │ notes                 │
│ approval_date       │     │ invoice_number        │
│ created_at          │     │ invoice_date          │
│ updated_at          │     │ created_at            │
└─────────────────────┘     │ updated_at            │
                            └──────────┬────────────┘
                                       │
                            ┌──────────▼────────────┐
                            │ purchase_order_items  │
                            ├───────────────────────┤
                            │ id (PK)               │
                            │ purchase_id (FK)      │
                            │ product_id (FK)       │
                            │ quantity              │
                            │ unit_price            │
                            │ total_price           │
                            │ received_quantity     │
                            │ status                │
                            │ created_at            │
                            │ updated_at            │
                            └───────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│  departments         │     │   employees          │
├──────────────────────┤     ├──────────────────────┤
│ id (PK)              │     │ id (PK)              │
│ code (UQ)            │     │ user_id (FK)         │
│ name (UQ)            │     │ department_id (FK)   │
│ sigla                │     │ name                 │
│ description          │     │ cpf (UQ)             │
│ manager_id (FK→emp)  │     │ rg                   │
│ active               │     │ pis_pasep            │
│ created_at           │     │ ctps                 │
│ updated_at           │     │ phone                │
└──────────┬───────────┘     │ email                │
           │                 │ address              │
           │                 │ position             │
           │                 │ salary               │
           │                 │ salary_type          │
           │                 │ hire_date            │
           │                 │ dismissal_date       │
           │                 │ status               │
           │                 │ shift                │
           │                 │ work_regime          │
           │                 │ bank_name            │
           │                 │ bank_agency          │
           │                 │ bank_account         │
           │                 │ pix_key              │
           │                 │ notes                │
           │                 │ created_at           │
           │                 │ updated_at           │
           │                 └──────────────────────┘
           │
┌──────────▼───────────┐     ┌──────────────────────┐
│ production_orders    │     │  service_orders      │
├──────────────────────┤     ├──────────────────────┤
│ id (PK)              │     │ id (PK)              │
│ order_number (UQ)    │     │ order_number (UQ)    │
│ product_id (FK)      │     │ client_id (FK)       │
│ quantity             │     │ product_id (FK)      │
│ quantity_produced    │     │ equipment_desc       │
│ priority             │     │ reported_issue       │
│ status               │     │ diagnosed_issue      │
│ start_date           │     │ service_performed    │
│ due_date             │     │ labor_cost           │
│ completion_date      │     │ total_amount         │
│ sales_order_id (FK)  │     │ status               │
│ responsible_id (FK)  │     │ priority             │
│ notes                │     │ entry_date           │
│ created_by (FK)      │     │ completion_date      │
│ created_at           │     │ delivery_date        │
│ updated_at           │     │ technician_id (FK)   │
└──────────────────────┘     │ responsible_id (FK)  │
                             │ warranty_days        │
┌──────────────────────┐     │ notes                │
│  assets              │     │ created_at           │
├──────────────────────┤     │ updated_at           │
│ id (PK)              │     └──────────────────────┘
│ tag (UQ)             │
│ name                 │
│ description          │
│ product_id (FK)      │
│ department_id (FK)   │
│ responsible_id (FK)  │
│ location             │
│ asset_type           │
│ brand                │
│ model                │
│ serial_number        │
│ purchase_date        │
│ purchase_value       │
│ current_value        │
│ useful_life_months   │
│ status               │
│ qr_code              │
│ notes                │
│ last_inventory_date  │
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

---

## Dicionário de Dados

### Tabela: `users` (Usuários do Sistema)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(200) | NOT NULL | Nome completo |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Email de acesso |
| password | VARCHAR(255) | NOT NULL | Hash bcrypt |
| role | ENUM('admin','operator','financial') | DEFAULT 'operator' | Perfil de acesso |
| department | VARCHAR(100) | DEFAULT '' | Departamento do usuário |
| active | BOOLEAN | DEFAULT true | Status do usuário |

### Tabela: `customers` (Clientes)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(200) | NOT NULL | Nome/Razão Social |
| cpf_cnpj | VARCHAR(18) | UNIQUE, NOT NULL | CPF ou CNPJ |
| phone | VARCHAR(20) | - | Telefone |
| email | VARCHAR(100) | - | Email |
| cep | VARCHAR(10) | - | CEP |
| street | VARCHAR(200) | - | Logradouro |
| number | VARCHAR(20) | - | Número |
| complement | VARCHAR(100) | - | Complemento |
| neighborhood | VARCHAR(100) | - | Bairro |
| city | VARCHAR(100) | - | Cidade |
| state | VARCHAR(2) | - | UF |
| status | ENUM('active','inactive') | DEFAULT 'active' | Status |
| tax_regime | ENUM('simples_nacional','lucro_presumido','lucro_real') | - | Regime tributário |
| ie | VARCHAR(20) | - | Inscrição Estadual |
| im | VARCHAR(20) | - | Inscrição Municipal |
| ind_final | ENUM('0','1') | DEFAULT '0' | Consumidor final |
| ind_ie | ENUM('1','2','9') | DEFAULT '9' | Contribuinte ICMS |
| cnae | VARCHAR(10) | - | CNAE |

### Tabela: `product_categories` (Categorias)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Nome da categoria |
| description | TEXT | - | Descrição |
| active | BOOLEAN | DEFAULT true | Status (soft delete) |

### Tabela: `products` (Produtos)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único |
| category_id | INT | FK → product_categories.id | Categoria |
| name | VARCHAR(200) | NOT NULL | Nome |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Código/SKU |
| price | DECIMAL(10,2) | NOT NULL, >= 0 | Preço de venda |
| cost_price | DECIMAL(10,2) | DEFAULT 0 | Preço de custo |
| quantity | INT | DEFAULT 0 | Estoque atual |
| min_quantity | INT | DEFAULT 5 | Estoque mínimo |
| status | ENUM('active','inactive') | DEFAULT 'active' | Status |
| location | VARCHAR(100) | - | Localização física |
| product_type | ENUM('finished','semi_finished','component','raw_material') | DEFAULT 'finished' | Tipo |
| ncm | VARCHAR(10) | DEFAULT '85182100' | NCM |
| cest | VARCHAR(10) | - | CEST |
| weight | DECIMAL(10,3) | DEFAULT 0 | Peso (kg) |
| unit | VARCHAR(10) | DEFAULT 'un' | Unidade |
| lead_time | INT | DEFAULT 0 | Lead time (dias) |
| drawing_number | VARCHAR(50) | - | Nº do desenho |
| revision | VARCHAR(10) | DEFAULT '00' | Revisão |
| ts_params_fs | DECIMAL(10,2) | - | Parâmetro Thiele-Small |
| ts_params_qms | DECIMAL(10,2) | - | Qms |
| ts_params_qes | DECIMAL(10,2) | - | Qes |
| ts_params_qts | DECIMAL(10,2) | - | Qts |
| ts_params_vas | DECIMAL(10,2) | - | Vas (litros) |
| ts_params_sd | DECIMAL(10,2) | - | Sd (cm²) |
| ts_params_xmax | DECIMAL(10,2) | - | Xmax (mm) |
| ts_params_re | DECIMAL(10,2) | - | Re (Ω) |
| ts_params_le | DECIMAL(10,2) | - | Le (mH) |
| ts_params_bl | DECIMAL(10,2) | - | Bl (Tm) |
| ts_params_mms | DECIMAL(10,2) | - | Mms (g) |
| ts_params_cms | DECIMAL(10,2) | - | Cms (mm/N) |
| ts_params_spl | DECIMAL(10,2) | - | SPL (dB) |

### Tabela: `inventory_movements` (Movimentações)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| product_id | INT | FK → products.id | Produto |
| user_id | INT | FK → users.id | Responsável |
| type | ENUM('in','out','adjustment') | NOT NULL | Tipo |
| quantity | INT | NOT NULL | Quantidade |
| description | TEXT | - | Motivo |
| reference_id | INT | - | ID da referência |
| reference_type | ENUM('sale','purchase','production','adjustment') | - | Tipo de referência |
| created_at | DATETIME | DEFAULT NOW | Data (timestamps habilitado) |

### Tabela: `suppliers` (Fornecedores)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| company_name | VARCHAR(200) | NOT NULL | Razão Social |
| trade_name | VARCHAR(200) | - | Nome Fantasia |
| cnpj | VARCHAR(18) | UNIQUE, NOT NULL | CNPJ |
| ie | VARCHAR(20) | - | Inscrição Estadual |
| phone | VARCHAR(20) | - | Telefone |
| email | VARCHAR(100) | - | Email |
| contact_name | VARCHAR(100) | - | Contato |
| contact_phone | VARCHAR(20) | - | Tel. contato |
| payment_terms | VARCHAR(100) | - | Cond. pagamento |
| delivery_time | INT | DEFAULT 15 | Prazo entrega |
| rating | INT | DEFAULT 3 | Avaliação (1-5) |
| status | ENUM('active','inactive') | DEFAULT 'active' | Status |
| notes | TEXT | - | Observações |

### Tabela: `purchase_orders` (Pedidos de Compra)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| order_number | VARCHAR(20) | UNIQUE, NOT NULL | Nº pedido (PO-...) |
| supplier_id | INT | FK → suppliers.id | Fornecedor |
| requester_id | INT | FK → users.id | Solicitante |
| status | ENUM('pending','approved','sent','partial','received','canceled') | DEFAULT 'pending' | Status |
| total_amount | DECIMAL(10,2) | DEFAULT 0 | Valor total |
| expected_date | DATE | - | Previsão |
| delivery_date | DATE | - | Entrega real |
| freight_type | ENUM('cif','fob') | - | Tipo frete |
| freight_value | DECIMAL(10,2) | DEFAULT 0 | Valor frete |
| invoice_number | VARCHAR(50) | - | Nº NF |
| invoice_date | DATE | - | Data NF |

### Tabela: `purchase_order_items` (Itens do Pedido)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| purchase_id | INT | FK → purchase_orders.id | Pedido |
| product_id | INT | FK → products.id | Produto |
| quantity | DECIMAL(10,2) | NOT NULL | Quantidade |
| unit_price | DECIMAL(10,2) | NOT NULL | Preço unitário |
| total_price | DECIMAL(10,2) | NOT NULL | Total |
| received_quantity | DECIMAL(10,2) | DEFAULT 0 | Qtd recebida |
| status | ENUM('pending','partial','received','canceled') | DEFAULT 'pending' | Status item |

### Tabela: `item_suppliers` (Catálogo Item × Fornecedor)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| item_id | UUID | FK → items.id, ON DELETE CASCADE, NOT NULL | Item industrial |
| supplier_id | INT | FK → suppliers.id, ON DELETE RESTRICT, NOT NULL | Fornecedor |
| unit_price | DECIMAL(18,6) | - | Preço unitário de referência |
| currency | VARCHAR(3) | DEFAULT 'BRL', NOT NULL | Moeda |
| lead_time_days | INT | - | Prazo de entrega (dias) |
| moq | DECIMAL(18,6) | - | Quantidade mínima de compra |
| supplier_item_code | VARCHAR(80) | - | Código do item no catálogo do fornecedor |
| preferred | BOOLEAN | DEFAULT false, NOT NULL | Fornecedor preferencial deste item (único `true` por item) |
| active | BOOLEAN | DEFAULT true, NOT NULL | Soft delete |
| notes | TEXT | - | Observações |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Constraints:** `UNIQUE(item_id, supplier_id)`; índices em `item_id` e `supplier_id`.

**Regra de negócio:** ao marcar `preferred = true` em um vínculo, todos os
demais vínculos ativos do mesmo item têm `preferred` zerado na mesma
transação (garante no máximo um fornecedor preferencial por item).

**Migration:** `server/migrations/20260803-000001-create-item-suppliers.cjs`
— inclui backfill que deriva vínculos a partir do histórico de
`purchase_order_items` × `purchase_orders` (preço mais recente por par
item/fornecedor).

### Tabela: `sales` (Vendas)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| customer_id | INT | FK → customers.id | Cliente |
| user_id | INT | FK → users.id | Vendedor |
| total_amount | DECIMAL(10,2) | NOT NULL | Valor total |
| discount | DECIMAL(10,2) | DEFAULT 0 | Desconto |
| status | ENUM('quote','confirmed','invoiced','canceled') | DEFAULT 'quote' | Status |
| payment_method | ENUM('cash','credit_card','debit_card','pix','boleto','transfer') | - | Pagamento |
| installments | INT | DEFAULT 1 | Parcelas |
| nfe_number | VARCHAR(50) | - | Nº NF-e |
| nfe_status | ENUM('pending','processing','authorized','denied','cancelled') | DEFAULT 'pending' | Status NF-e |
| nfe_key | VARCHAR(50) | - | Chave NF-e |

### Tabela: `sale_items` (Itens da Venda)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| sale_id | INT | FK → sales.id | Venda |
| product_id | INT | FK → products.id | Produto |
| quantity | INT | NOT NULL | Quantidade |
| unit_price | DECIMAL(10,2) | NOT NULL | Preço unitário |
| total_price | DECIMAL(10,2) | NOT NULL | Total |

### Tabela: `accounts_receivable` (Contas a Receber)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| sale_id | INT | FK → sales.id | Venda origem |
| customer_id | INT | FK → customers.id | Cliente |
| installment | INT | DEFAULT 1 | Nº parcela |
| amount | DECIMAL(10,2) | NOT NULL | Valor |
| due_date | DATE | NOT NULL | Vencimento |
| payment_date | DATE | - | Pagamento |
| status | ENUM('pending','paid','overdue','canceled') | DEFAULT 'pending' | Status |
| payment_method | VARCHAR(30) | - | Forma recebimento |
| interest | DECIMAL(10,2) | DEFAULT 0 | Juros |
| fine | DECIMAL(10,2) | DEFAULT 0 | Multa |
| discount | DECIMAL(10,2) | DEFAULT 0 | Desconto |
| collection_status | ENUM('normal','warning','overdue_30','overdue_60','overdue_90','protested') | DEFAULT 'normal' | Cobrança |
| notes | TEXT | - | Observações |

### Tabela: `accounts_payable` (Contas a Pagar)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| description | VARCHAR(200) | NOT NULL | Descrição |
| amount | DECIMAL(10,2) | NOT NULL | Valor |
| due_date | DATE | NOT NULL | Vencimento |
| payment_date | DATE | - | Pagamento |
| status | ENUM('pending','paid','overdue','canceled') | DEFAULT 'pending' | Status |
| category | VARCHAR(100) | - | Categoria |
| supplier_id | INT | FK → suppliers.id | Fornecedor |
| purchase_id | INT | FK → purchase_orders.id | Pedido origem |
| payment_type | ENUM('ted','pix','boleto','cheque','dinheiro') | - | Forma pagamento |
| cost_center | VARCHAR(100) | - | Centro de custo |
| notes | TEXT | - | Observações |
| approved_by | INT | FK → users.id | Aprovador |
| approval_date | DATE | - | Data aprovação |

---

## Relacionamentos

| De | Para | Tipo | Regra |
|----|------|------|-------|
| User | Employee | 1:1 | user_id FK |
| Department | Employee | 1:N | department_id FK |
| Department (manager) | Employee | 1:N | manager_id FK |
| Category | Product | 1:N | category_id FK |
| Supplier | Purchase | 1:N | supplier_id FK |
| User | Purchase (requester) | 1:N | requester_id FK |
| Purchase | PurchaseItem | 1:N | purchase_id FK (CASCADE) |
| Product | PurchaseItem | 1:N | product_id FK |
| Customer | Sale | 1:N | customer_id FK |
| User | Sale (seller) | 1:N | user_id FK |
| Sale | SaleItem | 1:N | sale_id FK (CASCADE) |
| Product | SaleItem | 1:N | product_id FK |
| Sale | AccountReceivable | 1:N | sale_id FK |
| Customer | AccountReceivable | 1:N | customer_id FK |
| Supplier | AccountPayable | 1:N | supplier_id FK |
| Purchase | AccountPayable | 1:N | purchase_id FK |
| Product | InventoryMovement | 1:N | product_id FK |
| User | InventoryMovement | 1:N | user_id FK |
| Product | ProductionOrder | 1:N | product_id FK |
| Employee | ProductionOrder | 1:N | responsible_id FK |
| User | ProductionOrder | 1:N | created_by FK |
| Sale | ProductionOrder | 1:N | sales_order_id FK |
| Customer | ServiceOrder | 1:N | client_id FK |
| Product | ServiceOrder | 1:N | product_id FK |
| User | ServiceOrder (tech) | 1:N | technician_id FK |
| User | ServiceOrder (resp) | 1:N | responsible_id FK |
| Department | Asset | 1:N | department_id FK |
| Employee | Asset | 1:N | responsible_id FK |
| Product | Asset | 1:N | product_id FK |

---

## Índices Recomendados

```sql
-- Performance em buscas
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_cpf_cnpj ON customers(cpf_cnpj);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
```

---

## Observações Finais

1. **Timestamps:** Todos os modelos usam `timestamps: true` (exceto InventoryMovement que foi corrigido)
2. **Soft Delete:** Categories agora têm `active` para soft delete; Products e Customers usam status 'inactive'
3. **Charset:** `utf8mb4` para suporte completo a caracteres especiais
4. **Índices:** Adicionar índices compostos para consultas frequentes por período+status
5. **Audit:** Recomenda-se criar modelo AuditLog para rastrear alterações em dados sensíveis
6. **Modelos Pendentes:** NonConformity (qualidade), MaintenanceOrder (manutenção) e Payroll (folha) ainda não implementados

---

## Schema Strategy & Migrations (ADR-DB-001)

**IMPORTANTE:** O schema canônico é definido pelos **Sequelize models** (`server/src/models/*.ts`), não pelo arquivo SQL.

### Razão

O arquivo `server/database/postgresql/01_schema.sql` é um artefato histórico que não é sincronizado com os models. Isso cria dois riscos:
- **Documentação drift**: SQL fica desatualizado após mudanças de model
- **Deployment risk**: Produção não pode confiar no arquivo SQL

### Solução

1. **Models descrevem o estado esperado pelo app**, mas a aplicação do schema acontece por migrations.
2. **Migrations formais**: Use `sequelize-cli` com baseline versionada e `SequelizeMeta`.
3. **Sem DDL no boot**: `DB_FORCE_SYNC`, `DB_AUTO_ALTER` e `DB_ALLOW_UNSAFE_ALTER` não são caminho operacional.
4. **Verificação pós-deploy**: Confirmar que colunas críticas (DECIMAL, constraints) estão corretas.

### Colunas Críticas (DECIMAL)

Estas devem estar em `DECIMAL(18,6)` em PRODUÇÃO:
- `products.quantity`, `reserved_quantity`, `min_quantity`
- `inventory_movements.quantity`
- `production_orders.quantity`, `quantity_produced`
- `sale_items.quantity`
- `production_order_tracking.quantity_good`, `quantity_scrapped`

### Processo para Production

```bash
# 1. Criar migration
npm run migration:generate -- --name <date>-<description>

# 2. Implementar up/down
# server/migrations/20260731-*.cjs

# 3. Testar em staging
npm run migration:up

# 4. Verificar schema
psql postgres://user:pass@host/db \
  -c "SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name='products' AND column_name='quantity';"
# Esperado: DECIMAL com precision=18, scale=6

# 5. Deploy em produção
npm run migration:up
```

### Verificação Pós-Deploy

```javascript
// Verificar DECIMAL correto após deploy
const Product = require('./models/Product');
const result = await sequelize.query(
  "SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name='products' AND column_name='quantity'"
);
console.log('✓ Schema verified:', result[0][0]);
// Expected: { numeric_precision: 18, numeric_scale: 6 }
```

---

## Tabela `lot_controls` (Rastreabilidade de Lotes + Quarentena de Qualidade)

**Model:** `server/src/models/LotControl.ts`
**Migration do enum:** `server/migrations/20260803-000002-add-quarantine-lot-status.cjs`

Registra lotes de matéria-prima/subconjunto (origem: recebimento de compra) e
de produto acabado (origem: conclusão de Ordem de Produção).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `product_id` | INTEGER FK → `products.id` | |
| `item_id` | UUID FK → `items.id` | Fase 4.6 expand-contract |
| `supplier_id` | INTEGER FK → `suppliers.id` | Preenchido quando o lote vem de compra |
| `purchase_id` | INTEGER FK → `purchase_orders.id` | Preenchido quando o lote vem de recebimento |
| `production_order_id` | INTEGER FK → `production_orders.id` | Preenchido quando o lote é produto acabado |
| `lot_number` | STRING(80) | Único por `product_id` |
| `status` | ENUM | Ver lifecycle abaixo |
| `quantity_initial` / `quantity_available` | DECIMAL(12,4) | Saldo rastreável do lote |
| `manufactured_at` / `expires_at` / `received_at` | DATEONLY | |
| `created_by` | INTEGER FK → `users.id` | |
| `notes` | TEXT | Acumula histórico textual de bloqueios/liberações |

### Enum `status` (lifecycle)

`available` | `reserved` | `consumed` | `blocked` | `expired` | **`quarantine`** (novo)

```
                    ┌───────────────────────────────────────────┐
                    │                                             │
  Recebimento   ┌───▼────────┐   POST /lots/:id/release   ┌──────┴─────┐
  de compra ───►│ quarantine │ ──────────────────────────► │ available  │◄── Produção conclui OP
  (novo lote)    └───┬────────┘                             └──────┬─────┘    (createFinishedLot)
                     │                                              │
                     │ POST /lots/:id/block (reason obrigatório)    │ POST /lots/:id/block
                     │ ou RNC referenciando o lote                  │ ou RNC referenciando o lote
                     ▼                                              ▼
                ┌─────────┐   POST /lots/:id/release (manual, pós-tratativa)
                │ blocked │◄──────────────────────────────────────────────────┘
                └─────────┘
```

- **Recebimento de compra** (`ReceivePurchaseItemsUseCase`): todo lote novo
  (ou incremento de lote existente) nasce/permanece em **`quarantine`**. O
  estoque físico (`products.quantity`) entra normalmente via
  `InventoryService.receive` — a quarentena bloqueia apenas o **consumo por
  lote**, nunca a entrada física.
- **FEFO da produção** (`ChangeProductionOrderStatusUseCase.consumeLotsForComponent`):
  seleciona candidatos apenas com `status = 'available'`. Lotes em
  `quarantine` ficam automaticamente fora do consumo automático, sem
  necessidade de filtro adicional.
- **Produto acabado** (`createFinishedLot`, gerado pela conclusão de OP):
  continua nascendo em `available` (não passa por quarentena).
- **Inspeção de recebimento** (`GET/POST /api/inventory/lots*`): libera
  (`quarantine|blocked` → `available`) ou bloqueia
  (`quarantine|available` → `blocked`, com `reason` obrigatório) manualmente.
- **RNC (Não Conformidade)** (`CreateNonConformityUseCase`): quando o payload
  contém `lot_number` + `product_id`, localiza o `LotControl` correspondente
  e, se estiver em `available`, `quarantine` ou `reserved`, move para
  `blocked` **na mesma transação** da criação da RNC, registrando
  `"Bloqueado pela RNC #<id>"` em `notes`. Se o lote não for encontrado, a
  RNC é criada normalmente (pode referenciar lote de sistema externo).
- **Fechamento de RNC** (`UpdateNonConformityUseCase`): fechar como
  `effective` **não** desbloqueia o lote automaticamente — a liberação
  pós-tratativa é sempre manual via `POST /api/inventory/lots/:id/release`.

### Endpoints (módulo `inventory`)

| Método | Rota | RBAC | Descrição |
|---|---|---|---|
| `GET` | `/api/inventory/lots?status=&product_id=&page=&limit=` | `authenticate` | Lista lotes com `product` e `supplier` incluídos. Sem `status` + com `product_id` mantém o comportamento legado (`available` + saldo > 0). |
| `POST` | `/api/inventory/lots/:id/release` | `admin`, `operator` | `quarantine\|blocked` → `available`. Body opcional `{ notes }`. 422 se status atual não for liberável. |
| `POST` | `/api/inventory/lots/:id/block` | `admin`, `operator` | `quarantine\|available` → `blocked`. Body `{ reason }` obrigatório (mín. 3 chars). 422 se status atual não for bloqueável. |

