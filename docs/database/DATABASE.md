# Modelagem de Dados - ERP EVOK ÁUDIO

> **Documentação de referência estruturada (2026-08-06):** para o estado
> **atual** e sempre-atualizado do banco (Modelo Conceitual, DER,
> DDL físico, Dicionário de Dados completo das 78 tabelas, Matriz de
> Privilégios/Isolamento, Estruturas Programáveis e Plano de Disaster
> Recovery), veja **[docs/database/00-INDICE.md](00-INDICE.md)**.
> Este arquivo (`docs/database/DATABASE.md`) continua sendo o **changelog
> histórico narrativo** — o racional de cada migration/decisão de
> modelagem desde 2026-07-31 — mantido como está abaixo, sem duplicar o
> conteúdo já consolidado na pasta `docs/database/`.

## Tecnologia
- **ORM:** Sequelize 6.x
- **Banco:** PostgreSQL 16 (único suportado; 59 migrations versionadas em 2026-08-06, 133+ FKs)
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
| role | ENUM('admin','operator','financial') | DEFAULT 'operator' | Perfil de acesso (papel JWT global) |
| department | VARCHAR(100) | DEFAULT '' | Departamento do usuário |
| active | BOOLEAN | DEFAULT true | Status do usuário |
| access_profile_id | INT | FK → access_profiles.id, ON DELETE SET NULL, NULL | Perfil de acesso configurável por área (Bloco 1.1). `NULL` = sem perfil atribuído = bloqueio total de módulos de área (UC-35-Exceção); nunca preenchido automaticamente em backfill. `role='admin'` continua acima deste sistema (BUSINESS_RULES.md §3), independente do valor aqui. |

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
| product_id | INT | NOT NULL, FK → products.id | Produto (legado — sempre preenchido, inclusive quando a movimentação se origina de um `item_id`, ver coluna `item_id`) |
| item_id | UUID | NULL, FK → items.id (dual-read) | Item novo de origem, quando aplicável. Preenchido por `POST /api/inventory/movements` quando o payload usa `item_id` (resolvido para `product_id` via crosswalk por código em `ItemRepository.findLegacyProductByItemId` antes da escrita) — ver `server/src/modules/inventory/README.md` seção "Dual-read `item_id`". `NULL` nos demais fluxos (legado por `product_id`, vendas, compras, produção, contagem de inventário) |
| user_id | INT | NOT NULL, FK → users.id | Responsável |
| warehouse_id | INT | NULL, FK → warehouses.id (`ON DELETE SET NULL`) | Depósito onde a movimentação ocorreu (Bloco 4, UC-42). `NULL` = movimento legado sem depósito atribuído |
| type | ENUM('in','out','adjustment') | NOT NULL | Tipo |
| quantity | DECIMAL(18,6) | NOT NULL | Quantidade movimentada |
| unit_cost | DECIMAL(10,2) | DEFAULT 0 | Custo unitário no momento da movimentação |
| description | TEXT | - | Motivo |
| reference_id | INT | - | ID da referência |
| reference_type | ENUM('sale','purchase','production','adjustment','transfer') | - | Tipo de referência |
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
| rating | INT | DEFAULT 3 | Avaliação (1-5) digitada manualmente no cadastro do fornecedor — **não é** o campo usado pelo cálculo automático abaixo |
| quality_score | DECIMAL(5,2) | NOT NULL, DEFAULT 100.00 | Avaliação **calculada**, 0-100, item 8 do levantamento (realimentação de rating a partir de RNCs). Nunca aceito via payload de `POST/PUT /api/suppliers` (schema Zod `.strict()` sem o campo) — só é escrito por `CreateNonConformityUseCase.recalculateSupplierQualityScore`, na mesma transação da criação de uma RNC que referencia um lote (`lot_number`+`product_id`) cujo `lot_controls.supplier_id` está preenchido. Fórmula: `MAX(0, 100 - (rncs_count / receipts_count * 100))`, onde `receipts_count = COUNT(lot_controls WHERE supplier_id = X)` e `rncs_count = COUNT(non_conformities WHERE supplier_id = X)`. Sem nenhum recebimento (`receipts_count = 0`) o valor permanece no default neutro 100.00 (nenhum `UPDATE` é emitido). RNCs sem lote referenciado, ou cujo lote não tem fornecedor (ex.: lote de produção interna), não alteram nenhum `quality_score` |
| status | ENUM('active','inactive') | DEFAULT 'active' | Status |
| notes | TEXT | - | Observações |

**Migration:** `server/migrations/20260804-000011-add-supplier-quality-score.cjs`
— adiciona `quality_score` (`addColumn`, default `100.00`, sem backfill
retroativo a partir de RNCs históricas: o cálculo passa a valer só
prospectivamente, a partir da próxima RNC criada para cada fornecedor).

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

### Tabela: `items` (Item Mestre Canônico) — coluna `conversao_automatica`
Novo campo do núcleo `items` (roadmap pós-Go-Live item 3, "fechar o ciclo
MRP — plano → requisição/OP automático", ver
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` seção 3):

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| conversao_automatica | BOOLEAN | NOT NULL, DEFAULT false | Opt-in por item: quando `true`, ordens planejadas `RASCUNHO`/`APROVADA` deste item, geradas pelo MRP (`GenerateMrpPlanUseCase`), são convertidas automaticamente em Requisição de Compra (`origin='mrp_auto'`) na mesma transação, sem intervenção do planejador. Itens sem a flag preservam o fluxo manual (UC-24). |

**Migration:** `server/migrations/20260804-000010-add-mrp-auto-convert-to-items.cjs`
(inclui índice parcial `idx_items_conversao_automatica WHERE conversao_automatica = true`).

**Decisão de design:** ver justificativa completa no cabeçalho da migration
e em `docs/projeto/04-USE_CASES.md` (UC-24b) — comprar automaticamente sem
nenhuma revisão humana para todo item foi descartado por risco de negócio;
optou-se por opt-in explícito por item em vez de flag/threshold genérico
por categoria, mantendo o mesmo nível de granularidade e rastreabilidade
já usado em `items.fornecedor_padrao_id`.

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

### Tabela: `work_centers` (Centros de Trabalho — Capacidade Finita)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| code | VARCHAR(30) | UNIQUE, NOT NULL | Código único do centro de trabalho |
| name | VARCHAR(100) | NOT NULL | Nome do centro de trabalho |
| description | TEXT | - | Observações livres |
| machines_count | INT | DEFAULT 1, NOT NULL | Quantidade de máquinas/recursos idênticos no centro |
| capacity_hours_per_day | NUMERIC(6,2) | DEFAULT 8, NOT NULL | Horas produtivas por dia, por máquina |
| efficiency_factor | NUMERIC(5,4) | DEFAULT 1, NOT NULL | Fator de eficiência histórica (0 a 1) |
| cost_per_hour | NUMERIC(18,6) | DEFAULT 0, NOT NULL, CHECK (>= 0) | Custo de mão-de-obra + operação por hora produtiva do centro (BRL/h) — usado no custeio real de produção |
| active | BOOLEAN | DEFAULT true, NOT NULL | Soft delete |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Constraints:** `UNIQUE(code)`; `CHECK (cost_per_hour >= 0)`.

**Migration:** `server/migrations/20260804-000007-add-cost-per-hour-work-centers.cjs`
— adiciona `cost_per_hour` (default `0`, sem impacto retroativo; fábricas
configuram a taxa por centro depois via tela/endpoint administrativo, fora
do escopo desta migration).

### Tabela: `work_center_shifts` (Turnos por Centro de Trabalho)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| work_center_id | INT | FK → work_centers.id, ON DELETE CASCADE, NOT NULL | Centro de trabalho |
| weekday | SMALLINT | CHECK (0-6), NOT NULL | Dia da semana (0 = domingo ... 6 = sábado) |
| start_time | TIME | NOT NULL | Início do turno |
| end_time | TIME | CHECK (end_time > start_time), NOT NULL | Fim do turno |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Constraints:** `CHECK (weekday BETWEEN 0 AND 6)`; `CHECK (end_time > start_time)`;
`UNIQUE(work_center_id, weekday, start_time)`; índice em `work_center_id`.

**Alteração em `production_route_steps`:** nova coluna `work_center_id` INT
NULL, FK → `work_centers.id` (`ON DELETE SET NULL`), com índice
`idx_production_route_steps_work_center_id`. A coluna legada `work_center`
(STRING(100), texto livre) é mantida nesta fase (expand); a remoção
(contract) fica para uma migration futura, após a camada de aplicação migrar
para `work_center_id`.

**Migration:** `server/migrations/20260803-000004-create-work-centers.cjs`
— cria `work_centers` e `work_center_shifts`, adiciona `work_center_id` em
`production_route_steps`, e faz backfill idempotente: gera um `work_center`
por valor distinto não vazio de `production_route_steps.work_center`
(`code = UPPER(TRIM(work_center))` truncado a 30 chars, `name = TRIM(work_center)`,
`ON CONFLICT (code) DO NOTHING`) e depois associa `work_center_id` via match
de código.

### Tabela: `engineering_projects` (Projetos de Engenharia / P&D)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| project_code | VARCHAR(20) | UNIQUE, NOT NULL | Código único do projeto |
| name | VARCHAR(200) | NOT NULL | Nome do projeto |
| description | TEXT | - | Descrição livre |
| project_type | ENUM('new_product','improvement','customization','research') | DEFAULT 'new_product', NOT NULL | Tipo do projeto |
| product_id | INT | FK → products.id, ON DELETE SET NULL | Produto resultante (opcional) |
| project_manager_id | INT | FK → users.id, ON DELETE SET NULL | Gerente do projeto |
| start_date | DATE | - | Início planejado |
| target_date | DATE | - | Prazo alvo |
| completion_date | DATE | - | Data de conclusão real |
| budget | NUMERIC(15,2) | - | Orçamento planejado |
| actual_cost | NUMERIC(15,2) | DEFAULT 0, NOT NULL | Custo real acumulado |
| stage | ENUM('concept','design','prototype','testing','homologation','production') | DEFAULT 'concept', NOT NULL | Fase do PDP |
| status | ENUM('active','paused','completed','canceled') | DEFAULT 'active', NOT NULL | Status do projeto |
| priority | ENUM('low','normal','high','critical') | DEFAULT 'normal', NOT NULL | Prioridade |
| notes | TEXT | - | Observações |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Índices:** `product_id`, `status`, `stage`.

### Tabela: `product_drawings` (Desenhos Técnicos de Produto)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| product_id | INT | FK → products.id, ON DELETE CASCADE, NOT NULL | Produto do desenho |
| drawing_number | VARCHAR(50) | NOT NULL | Número do desenho técnico |
| revision | VARCHAR(10) | DEFAULT '00', NOT NULL | Revisão do desenho |
| title | VARCHAR(200) | NOT NULL | Título |
| drawing_type | ENUM('assembly','detail','exploded','schematic','bom') | DEFAULT 'detail', NOT NULL | Tipo de desenho |
| file_path | VARCHAR(255) | - | Caminho do arquivo CAD/PDF |
| material_spec | TEXT | - | Especificação de material |
| dimensions | TEXT | - | Dimensões |
| tolerances | TEXT | - | Tolerâncias |
| approved_by | INT | FK → users.id, ON DELETE SET NULL | Aprovador |
| approval_date | DATE | - | Data de aprovação |
| status | ENUM('draft','released','obsolete','canceled') | DEFAULT 'draft', NOT NULL | Status do ciclo de vida |
| notes | TEXT | - | Observações |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Constraints:** `UNIQUE(drawing_number, revision)`.
**Índices:** `product_id`, `status`.

**Migration:** `server/migrations/20260803-000005-create-engineering-tables.cjs`
— cria `engineering_projects` e `product_drawings` (schema estático, sem backfill).

### Tabela: `purchase_requisitions` (Requisições de Compra) — coluna incremental

> Nota: esta tabela já existia antes desta entrega
> (`server/migrations/20260802-000002-purchase-requisitions.cjs`) e seu
> dicionário completo não está neste documento ainda (pendência de
> documentação anterior a esta tarefa). Registrado aqui apenas o
> incremento desta entrega (Bloco 2, UC-39):

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| origin | VARCHAR(80) | DEFAULT 'manual', NOT NULL | **Já era texto livre, sem ENUM** — valores em uso: `'manual'`, `'mrp'`, e agora `'engenharia_amostra'` (UC-39). Nenhuma migration de schema foi necessária para este novo valor. |
| engineering_project_id | INT | FK → engineering_projects.id, ON DELETE SET NULL, NULL | **Nova (Bloco 2, UC-39).** Vínculo opcional da requisição de amostra ao projeto de P&D de origem — opcional mesmo quando `origin='engenharia_amostra'`. |

**Índices:** `engineering_project_id` (novo, `idx_purchase_requisitions_engineering_project_id`).

**Migration:** `server/migrations/20260804-000003-requisition-engineering-project.cjs`
— adiciona apenas `engineering_project_id` + índice (expand-only, sem
ALTER TYPE — `origin` já era VARCHAR livre).

### Tabela: `acoustic_test_results` (Resultados de Teste Acústico)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| product_id | INT | FK → products.id, ON DELETE RESTRICT, NOT NULL | Produto testado |
| serial_number | VARCHAR(50) | - | Número de série testado |
| lot_number | VARCHAR(80) | - | Lote testado |
| production_order_id | INT | FK → production_orders.id, ON DELETE SET NULL | OP de origem |
| test_type | ENUM('impedance','frequency_response','thd','power_rms','power_peak','life','polarity','noise','thiele_small') | NOT NULL | Tipo de teste |
| test_date | TIMESTAMPTZ | DEFAULT NOW(), NOT NULL | Data/hora do teste |
| tester_id | INT | FK → users.id, ON DELETE RESTRICT, NOT NULL | Técnico responsável |
| parameters | JSONB | - | Parâmetros do teste (ex.: 13 parâmetros Thiele-Small) |
| result | NUMERIC(12,4) | - | Resultado numérico |
| unit | VARCHAR(20) | - | Unidade do resultado |
| specification_min | NUMERIC(12,4) | - | Limite mínimo de especificação |
| specification_max | NUMERIC(12,4) | - | Limite máximo de especificação |
| passed | BOOLEAN | NOT NULL | Aprovado/reprovado |
| curve_data | JSONB | - | Dados de curva (ex.: frequência x SPL) |
| notes | TEXT | - | Observações |
| non_conformity_id | INT | FK → non_conformities.id, ON DELETE SET NULL | NC gerada quando reprovado |
| consumed_quantity | NUMERIC(18,6) | NULL | Quantidade consumida (destruída) do produto testado em teste destrutivo (Bloco 4/UC-42-E). Quando `> 0`, debitada automaticamente do Depósito `LABORATORIO` na **mesma transação Sequelize** do registro do teste (`CreateAcousticTestUseCase` → `WarehouseStockService.removeFromWarehouse`). `NULL`/`0` = teste não destrutivo, sem débito. |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Índices:** `product_id`, `test_type`, `test_date`, `passed`, `serial_number`.

**Migrations:** `server/migrations/20260803-000006-create-acoustic-tests.cjs`
— cria `acoustic_test_results` (schema estático, sem backfill).
`server/migrations/20260804-000004-add-consumed-quantity-acoustic-tests.cjs`
— adiciona `consumed_quantity` (criada como `NUMERIC(12,4)`, corrigida no
dia seguinte por `20260804-000005-fix-consumed-quantity-precision.cjs`
para `NUMERIC(18,6)` — padrão obrigatório do projeto para toda coluna de
quantidade fracionada, achado de auditoria DBA; coluna estava vazia, sem
dados, `changeColumn` seguro).

### Tabela: `access_profiles` (Perfis de Acesso Configuráveis por Área)
Origem: `docs/governance/TODO.md` Bloco 1.1, `docs/business/BUSINESS_RULES.md`
§1-§4, `docs/business/01-USE_CASES.md` UC-30 a UC-33.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único do perfil |
| nome | VARCHAR(100) | UNIQUE, NOT NULL | Nome do perfil (ex.: "Almoxarife", "Comprador") |
| descricao | TEXT | - | Descrição livre do perfil |
| allowed_warehouses | JSONB | NULL | Lista simples de depósitos permitidos ao perfil dentro dos módulos de estoque (`NULL` = sem restrição por depósito). Não referencia uma tabela `warehouses` — essa tabela é do Bloco 4, fora de escopo desta entrega. |
| active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete. Desativação é bloqueada (na camada de aplicação, UC-32) enquanto houver usuário ativo vinculado ao perfil |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Seed:** a migration cria (idempotente, `ON CONFLICT DO NOTHING`) o perfil
"Administrador Geral" com `level='approve'` em todos os 26 módulos da
matriz de `BUSINESS_RULES.md` §1 — **não atribuído a nenhum usuário**. O
admin global (`role='admin'`) já opera acima do sistema de perfis
(BUSINESS_RULES.md §3); este perfil existe apenas como referência/futuro
uso administrativo.

### Tabela: `access_profile_permissions` (Matriz Módulo × Nível)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador único |
| access_profile_id | INT | FK → access_profiles.id, ON DELETE CASCADE, NOT NULL | Perfil dono da permissão |
| module | VARCHAR(50) | NOT NULL | Chave do módulo (validada em aplicação contra a lista fixa de `BUSINESS_RULES.md` §1: `dashboard`, `produtos`, `contagens`, `vendas`, `clientes`, `compras`, `requisicoes`, `fornecedores`, `producao`, `bom`, `mrp`, `chao_de_fabrica`, `centros_de_trabalho`, `qualidade`, `laboratorio`, `engenharia`, `estoque`, `recebimento`, `expedicao`, `patrimonio`, `rastreabilidade`, `financeiro`, `relatorios.producao`, `relatorios.compras`, `relatorios.custos`, `relatorios.financeiro`) |
| level | ENUM('operate','approve') | NOT NULL | Nível de acesso ao módulo. A **presença da linha** já implica visibilidade (`view` implícito); `approve` inclui as permissões de `operate`. Ausência de linha para um módulo = `nenhum` acesso (403 + módulo oculto do menu) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Constraints:** `UNIQUE(access_profile_id, module)` — no máximo uma
permissão por módulo por perfil.

**Índices:** `access_profile_id` (`idx_access_profile_permissions_profile_id`).

**Migration:** `server/migrations/20260803-000008-create-access-profiles.cjs`
— cria `access_profiles`, `access_profile_permissions`, adiciona
`users.access_profile_id` e semeia o perfil "Administrador Geral".

**Nota de escopo/decisão de arquitetura (atualizada no Bloco 1.2, ver
`docs/governance/TODO.md` e `BUSINESS_RULES.md` §4):** o campo
`access_level` (`operador`/`gestor`) por usuário mencionado como pendência
na entrega do schema (Bloco 1.1) **não foi criado** — decisão do
orquestrador foi que o nível gestor/operador não mora no usuário, mora no
**perfil**: `level = 'approve'` em `access_profile_permissions` já
caracteriza gestor daquele módulo; `level = 'operate'` caracteriza
operador. O middleware `authorizeModule`
(`server/src/middlewares/auth.ts`) foi implementado com essa fórmula
adaptada, sem necessidade de nenhuma migration adicional. O campo
`permission_version` (invalidação de sessão na troca de perfil) continua
explicitamente descartado (decisão do dono: troca vale no próximo login,
sem derrubar sessão ativa — UC-36).

### Tabela: `sales` (Vendas)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| customer_id | INT | FK → customers.id | Cliente |
| user_id | INT | FK → users.id | Vendedor |
| total_amount | DECIMAL(10,2) | NOT NULL | Valor total |
| discount | DECIMAL(10,2) | DEFAULT 0 | Desconto |
| status | ENUM('quote','confirmed','invoiced','shipped','canceled') | DEFAULT 'quote' | Status (fluxo: quote→confirmed→invoiced→shipped; canceled a partir de quote/confirmed/invoiced; shipped é terminal, não pode ser cancelada — ver `migrations/20260803-000007-add-shipped-sale-status.cjs`) |
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
| Product | EngineeringProject | 1:N | product_id FK (SET NULL) |
| User | EngineeringProject (manager) | 1:N | project_manager_id FK (SET NULL) |
| Product | ProductDrawing | 1:N | product_id FK (CASCADE) |
| User | ProductDrawing (approver) | 1:N | approved_by FK (SET NULL) |
| Product | AcousticTestResult | 1:N | product_id FK (RESTRICT) |
| ProductionOrder | AcousticTestResult | 1:N | production_order_id FK (SET NULL) |
| User | AcousticTestResult (tester) | 1:N | tester_id FK (RESTRICT) |
| NonConformity | AcousticTestResult | 1:N | non_conformity_id FK (SET NULL) |

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

---

## Tabelas `warehouses`, `product_warehouse_stock` e `warehouse_transfers` (Múltiplos Depósitos — Bloco 4, UC-42)

**Models:** `server/src/models/Warehouse.ts`, `server/src/models/ProductWarehouseStock.ts`, `server/src/models/WarehouseTransfer.ts`
**Migrations:** `server/migrations/20260804-000001-create-warehouses.cjs`, `server/migrations/20260804-000002-warehouse-transfers.cjs`
**Service de domínio:** `server/src/services/warehouseStockService.ts` (`addToWarehouse`/`removeFromWarehouse`/`getWarehouseByCode`, dual-write transacional)
**Regras de negócio:** `docs/business/BUSINESS_RULES.md` §12, `docs/business/01-USE_CASES.md` UC-42

Introduz depósito físico cadastrável e saldo de produto **por depósito**,
em vez de um único saldo global. A primeira migration
(`20260804-000001`) criou o schema de saldo por depósito + roteamento de
dados legados; a segunda (`20260804-000002`) adicionou o tipo `transfer`
ao enum de `inventory_movements.type` e a tabela `warehouse_transfers`
(solicitação de transferência com aprovação de gestor).

**Backend integrado (dual-write) nesta entrega:**
`ReceivePurchaseItemsUseCase` (recebimento de compra → `INSUMOS` por
padrão, ou `LABORATORIO` se `warehouse_code` for informado no payload),
`ChangeProductionOrderStatusUseCase` (consumo de componentes sai de
`INSUMOS`, produto acabado concluído entra em `ACABADOS`),
`CreateInventoryMovementUseCase` (movimentação manual, `warehouse_code`
opcional, default `INSUMOS`), o fluxo completo de transferência entre
depósitos (`POST /api/inventory/transfers` → `pending` →
`PUT .../approve|reject`), CRUD de depósito (`POST`/`PUT
/api/inventory/warehouses`, Bloco 4.3) e débito automático de teste
destrutivo de laboratório (Fluxo E/UC-42-E, `CreateAcousticTestUseCase`
+ `acoustic_test_results.consumed_quantity`). **Ainda não integrado:**
expedição de venda (Fluxo D do UC-42) — ver `docs/governance/TODO.md`
Bloco 4.2.

### Tabela `warehouses`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `code` | VARCHAR(30) UNIQUE NOT NULL | Ex.: `INSUMOS`, `ACABADOS`, `LABORATORIO` |
| `name` | VARCHAR(100) NOT NULL | |
| `description` | TEXT | |
| `active` | BOOLEAN DEFAULT true | |
| `created_at` / `updated_at` | TIMESTAMP | snake_case |

**Seed obrigatório (idempotente, `ON CONFLICT (code) DO NOTHING`):**

| `code` | `name` |
|---|---|
| `INSUMOS` | Depósito de Insumos de Produção |
| `ACABADOS` | Depósito de Produto Acabado |
| `LABORATORIO` | Depósito do Laboratório |

### Tabela `product_warehouse_stock`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `product_id` | INTEGER FK → `products.id` | `ON DELETE CASCADE` |
| `warehouse_id` | INTEGER FK → `warehouses.id` | `ON DELETE RESTRICT` |
| `quantity` | DECIMAL(18,6) NOT NULL DEFAULT 0 | `CHECK (quantity >= 0)` |
| `created_at` / `updated_at` | TIMESTAMP | snake_case |

Constraints: `UNIQUE (product_id, warehouse_id)`; índices em `product_id`
e `warehouse_id` separadamente.

### Colunas novas (expand, nullable)

| Tabela | Coluna | Notas |
|---|---|---|
| `inventory_movements` | `warehouse_id` INTEGER FK → `warehouses.id` (`ON DELETE SET NULL`) | `NULL` = movimento legado sem depósito atribuído. Índice `idx_inventory_movements_warehouse_id`. |
| `lot_controls` | `warehouse_id` INTEGER FK → `warehouses.id` (`ON DELETE SET NULL`) | `NULL` = lote legado sem depósito atribuído. Índice `idx_lot_controls_warehouse_id`. Ortogonal ao `status` do lote (quarentena/bloqueio não é depósito — §12 item 9). |

### Invariante obrigatória (§12 item 3)

```
saldo_total(produto) = Σ product_warehouse_stock.quantity do produto,
                        para todo depósito ativo
```

Até a migração completa do backend para dual-write por depósito (fase
contract), `products.quantity` continua sendo a fonte de verdade do saldo
total e `product_warehouse_stock` é populada em paralelo (dual-write) —
nenhuma rotina deve alterar um sem refletir no outro. Transferências entre
depósitos nunca alteram a soma total: debitam origem e creditam destino no
mesmo valor, na mesma transação atômica (§12 item 4).

### Backfill aplicado nesta migration

1. Todo produto com `products.quantity > 0` ganha uma linha em
   `product_warehouse_stock` no depósito `INSUMOS` com
   `quantity = products.quantity` (`INSERT ... SELECT ... ON CONFLICT DO NOTHING`).
   Produtos com `quantity = 0` **não** ganham linha (decisão explícita,
   evita poluir a tabela com saldos zerados).
2. Todo `lot_controls` existente recebe `warehouse_id = INSUMOS`.

**Script de validação pós-backfill (read-only, idempotente):**
`server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
(`npx tsx server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts`
a partir de `server/`). Confere 4 blocos — cobertura (todo produto com
`quantity > 0` tem ao menos uma linha em `product_warehouse_stock`),
integridade referencial (nenhuma linha órfã), a invariante de soma acima
(para todos os produtos, não apenas o snapshot do backfill) e ausência de
saldo negativo — imprime relatório no console e encerra com exit code `1`
se qualquer bloco falhar (`0` se tudo passar).

### `down()` (`20260804-000001`)

Remove, em ordem reversa: índice e coluna `warehouse_id` de
`lot_controls`; índice e coluna `warehouse_id` de `inventory_movements`;
índices, CHECK e UNIQUE de `product_warehouse_stock`, depois a tabela;
por fim a tabela `warehouses`.

### Tabela `warehouse_transfers` (migration `20260804-000002`)

Solicitação de transferência de saldo de um produto entre dois depósitos,
com aprovação de gestor obrigatória (§12 itens 6 e 8).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK | |
| `product_id` | INTEGER FK → `products.id` | `ON DELETE RESTRICT` |
| `from_warehouse_id` | INTEGER FK → `warehouses.id` | `ON DELETE RESTRICT` |
| `to_warehouse_id` | INTEGER FK → `warehouses.id` | `ON DELETE RESTRICT`; `CHECK (from_warehouse_id <> to_warehouse_id)` |
| `quantity` | DECIMAL(18,6) NOT NULL | `CHECK (quantity > 0)` |
| `reason` | TEXT NOT NULL | Motivo obrigatório da transferência |
| `user_id` | INTEGER FK → `users.id` | `ON DELETE RESTRICT` — quem solicitou |
| `approved_by` | INTEGER FK → `users.id` NULL | `ON DELETE SET NULL` — quem aprovou/rejeitou |
| `status` | ENUM `pending\|approved\|rejected` | default `pending` |
| `created_at` / `updated_at` | TIMESTAMP | snake_case |

Índices em `product_id`, `from_warehouse_id`, `to_warehouse_id`, `status`.

**`inventory_movements.type`:** ganhou o valor `'transfer'`
(`ALTER TYPE ... ADD VALUE IF NOT EXISTS`, fora de transação, mesmo
padrão de `20260803-000002-add-quarantine-lot-status.cjs`). Uma
transferência aprovada gera **dois** registros de `InventoryMovement`
(`type='transfer'`, um `out` no `warehouse_id` de origem e um `in` no
`warehouse_id` de destino), ambos com
`reference_type='transfer'`/`reference_id=warehouse_transfers.id` —
não existe coluna `transfer_id` dedicada; o par
`reference_type`/`reference_id` já existente cumpre o mesmo papel de
vincular os dois lançamentos.

### `down()` (`20260804-000002`)

Remove índices e CHECKs de `warehouse_transfers`, dropa a tabela e o
enum `enum_warehouse_transfers_status`. O valor `'transfer'` adicionado
ao enum `enum_inventory_movements_type` **permanece** no rollback
(remover um valor de ENUM no Postgres exige recriar o tipo inteiro —
mesma justificativa de `20260803-000002-add-quarantine-lot-status.cjs`).

### Endpoints (`server/src/modules/inventory/presentation/routes/inventory.ts`)

| Método | Rota | Autorização | Descrição |
|---|---|---|---|
| `GET` | `/api/inventory/warehouses` | `authorizeModule('estoque')` | Lista depósitos ativos. |
| `POST` | `/api/inventory/warehouses` | `authorizeModule('estoque', 'approve')` | Cria depósito (`{ code, name, description?, active? }`). `code` normalizado para uppercase; unicidade garantida pela app (`findOne` prévio) **e** pela constraint `UNIQUE` de `warehouses.code` no banco (`warehouses_code_key`) — corrida concorrente vira 409 via `SequelizeUniqueConstraintError` → `errorHandler` genérico, não 500. |
| `PUT` | `/api/inventory/warehouses/:id` | `authorizeModule('estoque', 'approve')` | Edita `name`/`description`/`active`. `code` nunca é editável por este endpoint (é a chave do dual-write, `WarehouseStockService.getWarehouseByCode`). |
| `GET` | `/api/inventory/warehouse-stock?product_id=&warehouse_code=&page=&limit=` | `authorizeModule('estoque')` | Saldo por par produto×depósito, com `product`/`warehouse` incluídos. Consulta usa o índice `UNIQUE (product_id, warehouse_id)` de `product_warehouse_stock` (cobre o filtro composto, sem scan completo). |
| `GET` | `/api/inventory/transfers?status=` | `authorizeModule('estoque')` | Lista transferências (filtro opcional de status). |
| `POST` | `/api/inventory/transfers` | `authorizeModule('estoque', 'operate')` | Solicita transferência (`{ product_id, from_warehouse_code, to_warehouse_code, quantity, reason }`). Cria em `status='pending'`, não altera saldo. |
| `PUT` | `/api/inventory/transfers/:id/approve` | `authorizeModule('estoque', 'approve')` | Aprova e executa a transferência atomicamente (débito origem + crédito destino + 2 `InventoryMovement`). 422 didático se saldo de origem insuficiente no momento da aprovação. |
| `PUT` | `/api/inventory/transfers/:id/reject` | `authorizeModule('estoque', 'approve')` | Rejeita (`body.reason` obrigatório), não altera saldo. |
| `GET` | `/api/products/:id/stock-by-warehouse` | `authorizeModule('estoque')` | **Novo.** Roteado em `server/src/modules/products/presentation/routes/products.ts` (não em `inventory.ts`). Saldo de UM produto específico por depósito — retorna TODOS os depósitos ativos, inclusive com `quantity: 0` quando o produto não tem linha em `product_warehouse_stock` (decisão de UI, ver `docs/arquitetura/API.md`). |

**Integração com endpoints existentes:**
- `POST /api/purchases/:id/receive` — aceita `warehouse_code` opcional
  no payload (`'INSUMOS'\|'LABORATORIO'`, default `'INSUMOS'`).
- `POST /api/inventory/movements` — aceita `warehouse_code` opcional
  (string livre validada contra `warehouses.code` em runtime via
  `getWarehouseByCode`, default `'INSUMOS'`).

### Coluna nova: `inventory_counts.warehouse_id` (migration `20260804-000006`)

**Migration:** `server/migrations/20260804-000006-add-warehouse-id-to-inventory-counts.cjs`

Gap identificado após o Bloco 4: o inventário cíclico (`inventory_counts` +
`inventory_count_items`) não tinha nenhum escopo de depósito, e a
aprovação da contagem ajustava o saldo **global** de `Product.quantity`
em vez do saldo por depósito (`ProductWarehouseStock`). Esta migration
resolveu a fatia de schema; o gap de aplicação foi fechado em seguida
(mesma sessão): `CreateInventoryCountUseCase` agora exige `warehouse_id`
no payload (400 se ausente) e `ApproveInventoryCountUseCase` ajusta o
saldo do depósito específico da contagem via `WarehouseStockService`,
além de manter `Product.quantity` (dual-write legado via
`InventoryService.adjust`) — ver "Contrato" abaixo, agora marcado como
implementado.

| Coluna | Tipo | Notas |
|---|---|---|
| `inventory_counts.warehouse_id` | INTEGER FK → `warehouses.id` (`ON DELETE RESTRICT`, `ON UPDATE CASCADE`) | **Nullable.** Depósito ao qual **toda a contagem** pertence (escopo no cabeçalho, não por item — uma contagem física não mistura depósitos). Índice `idx_inventory_counts_warehouse_id`. |

**Por que nullable e não `NOT NULL`:** em desenvolvimento a tabela já
tinha 4 linhas reais (`CC-2026-0001..0004`) criadas antes do conceito de
depósito existir, 2 delas já com `status='adjusted'` (já impactaram
`Product.quantity`). Não é seguro reescrever histórico auditável para
inferir um depósito que nunca existiu. Segue-se o mesmo padrão
expand-contract já usado em `inventory_movements.warehouse_id` e
`lot_controls.warehouse_id` (migration `20260804-000001`): coluna
nullable no banco + backfill das linhas legadas.

### Coluna nova: `inventory_counts.assigned_to` (migration `20260806-000001`)

**Migration:** `server/migrations/20260806-000001-add-assigned-to-inventory-counts.cjs`

Evolução do inventário cíclico para suportar atribuição de contagens a
funcionários específicos e/ou um "pool" (qualquer funcionário autorizado
pode pegar). Fecha o gap de "qualquer usuário com `operate` podia
iniciar/contar QUALQUER contagem em `draft` de qualquer depósito que ele
tivesse acesso" — agora a contagem pode ser reservada a um funcionário.

| Coluna | Tipo | Notas |
|---|---|---|
| `inventory_counts.assigned_to` | INTEGER FK → `users.id` (`ON DELETE SET NULL`, `ON UPDATE CASCADE`) | Nullable. `NULL` = contagem disponível no "pool". Índice `idx_inventory_counts_assigned_to`. |

**Semântica:**
- **Criação** (`CreateInventoryCountUseCase`): `assigned_to` é opcional no
  payload. Informado = atribuição específica; ausente/`null` = pool.
- **Início** (`StartInventoryCountUseCase`, `POST /:id/start`): faz o
  **claim atômico** quando a contagem está no pool — `assigned_to` passa a
  ser o usuário que chamou o endpoint. A trava é um lock pessimista
  (`SELECT ... FOR UPDATE`, dentro de transação) sobre o cabeçalho da
  contagem: em corrida entre dois usuários tentando pegar a MESMA
  contagem, a segunda transação espera a primeira commitar e então lê
  `assigned_to` já preenchido — só uma vence. Se a contagem já estiver
  atribuída a **outro** usuário e quem inicia **não for `admin`**, rejeita
  com `ConflictError` (HTTP 409). Se quem inicia **for `admin`**, o
  override é permitido (achado de auditoria 2026-08-06, item 1b) — a
  contagem passa a ser do admin, auditado com `oldValues`/`newValues`
  diferenciados. Se já for do próprio usuário, segue normalmente
  (idempotente).
- **Reatribuição** (`ReassignInventoryCountUseCase`, `PUT
  /:id/reassign`, achado de auditoria 2026-08-06, item 1a): endpoint de
  gestor (`authorizeModule('contagens', 'approve')`) para mover
  `assigned_to` para outro usuário ou devolver ao pool (`assigned_to:
  null`), sem depender do fluxo de `start`. Único remédio antes deste
  endpoint para uma contagem "presa" com um funcionário de
  férias/desligado era `UPDATE` manual no banco. Só permitido com a
  contagem em `draft` ou `counting` (422 `BusinessRuleError` caso
  contrário, com `details.current_status`/`details.allowed_statuses`).
  Mesmo lock pessimista de `start`/`approve`/`reject`.
- **Validação do usuário-alvo** (achado de auditoria 2026-08-06, item 2):
  tanto na criação quanto na reatribuição, `assigned_to` (quando
  informado e não-`null`) precisa apontar para um usuário que existe e
  está ATIVO (`users.active = true`) — `BusinessRuleError` (422) caso
  contrário. Não valida o perfil de acesso (`AccessProfile`) do
  usuário-alvo, apenas existência + `active` (decisão documentada no
  JSDoc de `InventoryCountRepository.findActiveUserById`).
- **Listagem** (`ListInventoryCountsUseCase`, `GET /api/inventory-counts`):
  novos filtros `assigned_to` (aceita o atalho `me`, resolvido pelo
  controller para o id do usuário autenticado) e `unassigned=true`
  (contagens do pool, tipicamente combinado com `status=draft`).
- **Aprovação/rejeição** (`Approve`/`RejectInventoryCountUseCase`,
  exclusivas do painel web): inalteradas — não dependem de `assigned_to`.
- **`ON DELETE SET NULL`** (diferente de `warehouse_id`, que é
  `RESTRICT`): se o funcionário atribuído for removido, a contagem volta
  ao pool em vez de bloquear a exclusão do usuário.
- Associação Sequelize: `InventoryCount.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo' })` / `User.hasMany(InventoryCount, { foreignKey: 'assigned_to', as: 'assigned_inventory_counts' })`.
- Validação Zod da API: `createInventoryCountSchema` (`assigned_to` opcional, inteiro positivo ou `null`) e `reassignInventoryCountSchema` (`assigned_to` obrigatório na FORMA, aceita inteiro positivo ou `null`) em
  `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`.

### Bug real corrigido: `product_id` NOT NULL bloqueava contagem via `item_ids` (migration `20260806-000002`)

**Migration:** `server/migrations/20260806-000002-make-product-id-nullable-inventory-count-items.cjs`

`CreateInventoryCountUseCase` já aceitava `item_ids` (caminho novo,
dual-read, PREFERIDO segundo o próprio código) e gravava `product_id:
null` / `item_id: <uuid>` nesse caso — mas `inventory_count_items.product_id`
continuava `NOT NULL` no banco (e no model Sequelize), então **toda**
contagem criada via `item_ids` falhava com erro 500 (`null value in
column "product_id" violates not-null constraint`). Só funcionava pelo
caminho legado `product_ids`. Encontrado em teste manual do fluxo de
atribuição de contagens (2026-08-06).

| Coluna/Constraint | Antes | Depois |
|---|---|---|
| `inventory_count_items.product_id` | `INTEGER NOT NULL` | `INTEGER` nullable |
| `chk_inventory_count_items_product_or_item` (CHECK, novo) | — | `product_id IS NOT NULL OR item_id IS NOT NULL` |

**Fix:** `product_id` passa a ser nullable (mesmo padrão dual-read já usado
em `item_id`), com um CHECK constraint garantindo que pelo menos um dos
dois esteja preenchido — mantém a integridade que o `allowNull: false`
antigo tentava garantir, sem bloquear o caminho novo.

**Risco de rollback (documentado no cabeçalho da migration):** o `down()`
executa `changeColumn(..., { allowNull: false })` em `product_id`, o que
é **irreversível em produção** assim que a primeira contagem for criada
via `item_ids` — essas linhas nascem com `product_id IS NULL` por design,
e o Postgres rejeita `SET NOT NULL` enquanto existir qualquer linha nessa
condição. O `down()` faz uma checagem explícita
(`SELECT count(*) ... WHERE product_id IS NULL`) e aborta com
`throw new Error(...)` de mensagem clara em vez de deixar o Postgres
estourar um erro genérico de constraint no meio do downgrade.

### Coluna nova: `production_orders.department_id` e `inventory_counts.department_id` (migration `20260806-000003`)

**Migration:** `server/migrations/20260806-000003-add-department-id-to-production-orders-and-inventory-counts.cjs`

Suporte ao painel de TV para gestores acompanharem demandas em aberto por
departamento (`GET /api/dashboard/department-demands`, consumido pelo app
Android TV construído em paralelo em `tv/`). `purchase_requisitions.department_id`
já existia; faltava o mesmo campo em `production_orders` (OPs) e
`inventory_counts` (contagens de inventário cíclico) para as 3 entidades
serem agrupadas por departamento de verdade — decisão de produto: **não**
usar depósito (`warehouse_id`) nem centro de trabalho como proxy de
departamento.

| Coluna | Tipo | Notas |
|---|---|---|
| `production_orders.department_id` | INTEGER FK → `departments.id` (`ON DELETE SET NULL`, `ON UPDATE CASCADE`) | Nullable. Departamento dono da OP. Índice `idx_production_orders_department_id`. |
| `inventory_counts.department_id` | INTEGER FK → `departments.id` (`ON DELETE SET NULL`, `ON UPDATE CASCADE`) | Nullable. Departamento dono da contagem. Índice `idx_inventory_counts_department_id`. |

**Por que nullable e SEM backfill (diferente de `warehouse_id` acima):**
não existe nenhuma forma confiável de inferir retroativamente a qual
departamento uma OP ou contagem já existente pertence — não há coluna,
convenção de nomenclatura nem relação transitiva (produto, depósito,
responsável) que garanta o departamento correto sem risco de atribuição
errada. Diferente do backfill de `warehouse_id` (destino óbvio: depósito
padrão `INSUMOS`), inventar uma regra aqui contaminaria a auditoria com
dados fabricados. Todas as linhas existentes de ambas as tabelas ficam
`NULL` — 100% do histórico hoje.

**Semântica:**
- **Criação** (`CreateProductionOrderUseCase` / `CreateInventoryCountUseCase`):
  `department_id` é **opcional** no payload (`POST /api/production-orders`,
  `POST /api/inventory-counts`). Diferente de `warehouse_id` em contagens
  (obrigatório), `department_id` nunca é exigido — se ausente, fica `null`.
- **Painel de TV** (`GET /api/dashboard/department-demands`,
  `GetDepartmentDemandsUseCase` / `SequelizeDashboardRepository.getDepartmentDemands`):
  agrupa OPs em aberto (`planned`/`released`/`in_progress`/`paused`),
  requisições de compra em aberto (`draft`/`pending`/`approved`) e
  contagens em aberto (`draft`/`counting`/`pending_approval`) por
  `department_id`, com um grupo agregado `department_id: null` ("Sem
  departamento") sempre presente. Demandas vinculadas a um departamento
  inativo (`departments.active = false`) ficam fora do painel até o
  departamento ser reativado.
- Associações Sequelize (`server/src/models/index.ts`): `ProductionOrder.belongsTo(Department, { foreignKey: 'department_id', as: 'department' })` / `Department.hasMany(ProductionOrder, { foreignKey: 'department_id', as: 'production_orders' })`; `InventoryCount.belongsTo(Department, { foreignKey: 'department_id', as: 'department' })` / `Department.hasMany(InventoryCount, { foreignKey: 'department_id', as: 'inventory_counts' })` — mesmo padrão já usado por `PurchaseRequisition.belongsTo(Department, ...)`.

### Índices faltantes — status/item_id (migration `20260806-000004`)

**Migration:** `server/migrations/20260806-000004-add-missing-indexes-status-item-id.cjs`

Achados de índice do DBA na auditoria multi-agente de 2026-08-06:

1. **`production_orders.status` sem índice simples.** O painel de TV de
   demandas por departamento (`SequelizeDashboardRepository.getDepartmentDemands`,
   `SELECT ... WHERE po.status IN (...)`) e o dashboard cockpit
   (`ProductionOrder.count({ where: { status: { [Op.in]: [...] } } })`)
   filtram só por status, sem `item_id`. Os índices compostos existentes
   (`idx_production_orders_item_id_status`, `idx_production_orders_item_id_created_at`)
   exigem `item_id` como primeira coluna e não ajudam essas queries.
2. **`item_id` sem índice em 4 tabelas do expand-contract** Product → Item
   (dual-read em andamento): `bill_of_material_items`,
   `inventory_count_items`, `lot_controls`, `production_lot_consumptions`.
   Toda leitura pelo caminho novo (`item_id`) fazia sequential scan.
3. **Índice duplicado** em `inventory_counts(created_by)`:
   `idx_inventory_counts_created_by_fk` era idêntico ao pré-existente
   `inventory_counts_created_by` (mesma coluna, mesmo tipo btree,
   confirmado via `\d inventory_counts` antes da migration). Removido o
   duplicado, mantido o pré-existente.

| Tabela | Índice novo | Coluna(s) |
|---|---|---|
| `production_orders` | `idx_production_orders_status` | `status` |
| `bill_of_material_items` | `idx_bill_of_material_items_item_id` | `item_id` |
| `inventory_count_items` | `idx_inventory_count_items_item_id` | `item_id` |
| `lot_controls` | `idx_lot_controls_item_id` | `item_id` |
| `production_lot_consumptions` | `idx_production_lot_consumptions_item_id` | `item_id` |
| `inventory_counts` | `idx_inventory_counts_created_by_fk` (REMOVIDO, duplicado) | `created_by` |

Idempotente via `showIndex` (mesmo padrão de `20260806-000003`); `down()`
reverte tudo simetricamente (inclusive recriando o índice duplicado
removido, para simetria completa do rollback).

## Custeio de Produção — Mão-de-Obra e Overhead (roadmap pós-Go-Live, item 7/9)

Fecha o gap "custeio real vs padrão não incorpora mão-de-obra nem
overhead" listado em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`. Schema/modelagem
e cálculo (uso destes campos em `costingService.ts` /
`ChangeProductionOrderStatusUseCase`) implementados na mesma frente — ver
"Cálculo implementado" ao final desta seção.

### Estado anterior (o que já existia)

- `product_cost_ledgers` já registra custo real ponderado por produto,
  com `source_type` ENUM `purchase|production|adjustment`. O tipo
  `'production'` hoje cobre **apenas material** — `unitCost` é calculado
  em `ChangeProductionOrderStatusUseCase.completeOrder()` como
  `explosion.total_cost / producedQty` (custo de BOM explodida), sem
  nenhuma parcela de mão-de-obra ou overhead.
- `production_order_tracking` já tem `started_at`/`finished_at` por etapa
  (`production_route_step_id`) e `operator_id` — dá para derivar horas
  trabalhadas por etapa, mas não havia nenhuma taxa de custo associada.
- `work_centers` já existia (capacidade finita: `capacity_hours_per_day`,
  `efficiency_factor`), mas sem taxa de custo por hora.

### Decisão de modelagem

1. **Mão-de-obra:** `work_centers.cost_per_hour` (NUMERIC(18,6), novo,
   default `0`) — taxa de custo (mão-de-obra + operação da máquina) por
   hora produtiva daquele centro. É o dado mais natural para o cálculo,
   porque `production_route_steps.work_center_id` já vincula a etapa
   executada ao centro de trabalho, e `production_order_tracking` já tem
   `started_at`/`finished_at` por etapa — a fórmula fica
   `horas_apontadas × work_centers.cost_per_hour`, sem novas tabelas.
   Como `production_route_steps.work_center_id` é nullable (coluna legada
   `work_center` texto livre ainda em uso — fase expand, ver seção
   `work_centers` acima), foi adicionado também
   `production_cost_settings.default_labor_rate_per_hour` como taxa de
   fallback para quando a etapa não tem centro estruturado vinculado.

2. **Overhead (rateio de despesas indiretas de fábrica):** decidido pela
   abordagem mais simples praticável com os dados existentes — **uma
   taxa global percentual configurável**, não um sistema completo de
   centros de custo (que exigiria alocar cada despesa indireta real a
   centros/produtos, fora de escopo do roadmap atual). Nova tabela
   singleton `production_cost_settings` (mesmo padrão de
   `company_fiscal_config`: uma única linha, `id=1`, `CHECK (id = 1)`),
   com:
   - `overhead_calculation_basis` ENUM `material_labor|labor_only|material_only`
     — sobre qual base o percentual é aplicado (default `material_labor`,
     o mais comum na literatura de custeio industrial: overhead rateado
     sobre custo primário = material + mão-de-obra direta).
   - `overhead_rate_percent` NUMERIC(9,6), default `0`, `CHECK (0..1000)`
     — percentual do rateio (ex.: `25.5` = 25,5%).
   - `default_labor_rate_per_hour` NUMERIC(18,6), default `0` — ver item 1.

   **Por que não em `company_fiscal_config`:** aquela tabela é
   especificamente de dados fiscais do emitente (razão social, CNPJ,
   NF-e); custeio de produção é um domínio diferente (PCP/manufatura),
   então uma tabela nova e pequena mantém a coesão do schema sem poluir
   a config fiscal.

   **Trade-off assumido:** taxa única global, sem versionamento temporal
   (uma mudança na taxa vale para custeios futuros e passados igualmente,
   não há "taxa vigente em determinada data"). Aceitável para o nível de
   maturidade atual do roadmap; se no futuro for necessário overhead por
   período (ex.: taxa muda todo trimestre por variação de despesas fixas),
   uma tabela `production_cost_settings_history` com `effective_from`
   pode substituir o singleton sem quebrar o contrato de leitura (sempre
   "pegar a config vigente").

3. **Rastreabilidade no ledger:** `product_cost_ledgers.source_type`
   ganhou dois novos valores de ENUM — `'production_labor'` e
   `'production_overhead'` — para que o próximo agente possa registrar
   entradas de ledger **separadas** de material (`'production'`),
   mão-de-obra e overhead por OP concluída, preservando auditoria
   granular do custo real (em vez de só um valor agregado).

### Tabela: `production_cost_settings` (Configuração de Custeio — Singleton)

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT, `CHECK (id = 1)` | Singleton — sempre `1` |
| overhead_calculation_basis | ENUM `material_labor\|labor_only\|material_only` | DEFAULT `material_labor`, NOT NULL | Base de cálculo do rateio de overhead |
| overhead_rate_percent | NUMERIC(9,6) | DEFAULT 0, NOT NULL, `CHECK (0..1000)` | Percentual de overhead aplicado sobre a base escolhida |
| default_labor_rate_per_hour | NUMERIC(18,6) | DEFAULT 0, NOT NULL, `CHECK (>= 0)` | Taxa de mão-de-obra/h de fallback (etapa sem `work_center_id`) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case) |

Seed automático da linha `id=1` com valores neutros (`0%`) na própria
migration (`ON CONFLICT (id) DO NOTHING`) — a fábrica configura a taxa
real depois via tela/endpoint administrativo (fora do escopo desta fatia
de schema).

**Migration:** `server/migrations/20260804-000008-create-production-cost-settings.cjs`

### Alteração em `work_centers`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| cost_per_hour | NUMERIC(18,6) | DEFAULT 0, NOT NULL, `CHECK (>= 0)` | Custo de mão-de-obra + operação por hora produtiva do centro (BRL/h) |

**Migration:** `server/migrations/20260804-000007-add-cost-per-hour-work-centers.cjs`

### Alteração em `product_cost_ledgers`

`source_type` ganhou dois valores de ENUM via `ALTER TYPE ... ADD VALUE`
(fora de transação, mesmo padrão de
`20260803-000002-add-quarantine-lot-status.cjs`):

| Valor novo | Descrição |
|---|---|
| `production_labor` | Custo real de mão-de-obra de uma OP concluída (horas apontadas × `work_centers.cost_per_hour`) |
| `production_overhead` | Custo real de overhead rateado sobre a OP concluída, conforme `production_cost_settings` |

**Migration:** `server/migrations/20260804-000009-add-labor-overhead-cost-ledger-sources.cjs`
— rollback é no-op (remover valor de ENUM no Postgres exige recriar o
tipo inteiro; mesma justificativa das demais migrations de ENUM deste
projeto).

### Cálculo implementado (item 7/9 — mão-de-obra e overhead)

Implementado em `ChangeProductionOrderStatusUseCase.completeOrder()`
(`server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`,
métodos privados `registerLaborAndOverheadCost`/`calculateLaborCost`/
`getProductionCostSettings`), na MESMA transação Sequelize da conclusão da
OP (falha em qualquer etapa reverte a conclusão inteira — nenhuma OP é
concluída sem custo, nenhum custo é lançado sem conclusão efetiva):

- **Mão-de-obra:** para cada apontamento (`production_order_tracking`) com
  `status = 'completed'` da OP, `horas = (finished_at - started_at) / 3600000ms`
  × taxa do centro de trabalho (`production_route_steps.work_center_id` →
  `work_centers.cost_per_hour`; fallback
  `production_cost_settings.default_labor_rate_per_hour` quando a etapa não
  tem centro de trabalho estruturado vinculado). Soma-se o custo de todas
  as etapas concluídas; **OP sem nenhum apontamento (ou sem etapas
  `completed`) não lança custo de mão-de-obra** (decisão: nenhuma base
  horária real para estimar — nenhum custo é preferível a um custo
  fabricado). OPs concluídas **antes** desta entrega não recebem custo de
  mão-de-obra retroativo (o cálculo só roda na conclusão, não há
  reprocessamento de OPs históricas).
- **Overhead:** `overhead_rate_percent / 100` aplicado sobre a base
  configurada em `overhead_calculation_basis` (`material_labor` = custo de
  material + mão-de-obra desta mesma conclusão; `labor_only`;
  `material_only`).
- **Lançamentos no ledger:** granulares e separados —
  `CostingService.registerWeightedAverageCost({..., sourceType: 'production'})`
  para material (já existia) e o novo
  `CostingService.registerAdditionalProductionCost({..., sourceType: 'production_labor'|'production_overhead'})`
  para cada componente, omitidos quando o valor calculado é ~0 (sem
  apontamento ou taxa de overhead zerada — sem valor de auditoria em
  lançar uma entrada de custo zero).
  **Por que não reusar `registerWeightedAverageCost` para os 3
  lançamentos:** aquele método recalcula a média ponderada completa contra
  `previousQuantity = product.quantity - quantity`; reaplicar essa fórmula
  numa 2ª/3ª chamada para o mesmo lote físico já recebido (mão-de-obra,
  overhead) rediluiria o custo do material já incorporado na 1ª chamada —
  na prática, descartando parte do custo de material quando o estoque
  anterior era pequeno ou zero. `registerAdditionalProductionCost` evita o
  bug somando apenas a contribuição marginal do componente
  (`quantity * unitCost / product.quantity` já atualizado) sobre o
  `cost_price` já ajustado pela chamada anterior — o resultado final
  converge corretamente para `(material + mão-de-obra + overhead) / producedQty`.
- **Relatório (`GET /reports/cost-variance`):** `SequelizeReportsRepository.findCostVarianceByProduct`
  (`server/src/modules/reports/infrastructure/sequelize/SequelizeReportsRepository.ts:210`)
  foi ajustada (query, não schema) — como a conclusão de uma OP grava até 3
  linhas irmãs em `product_cost_ledgers`
  (`production`/`production_labor`/`production_overhead`, mesmo `source_id`
  e mesma `quantity`), uma média ponderada simples somaria a quantidade 3x
  para o mesmo lote produzido, diluindo `avg_real_cost` incorretamente. A
  query agora usa uma CTE que colapsa essas 3 linhas por
  `(product_id, source_id)` em uma única linha por OP concluída (soma
  `total_cost`, mantém `quantity` uma vez) antes da agregação por produto —
  `avg_real_cost` passa a refletir o custo real **full cost** (material +
  mão-de-obra + overhead) corretamente ponderado.
- **Testes:** `server/tests/unit/production-labor-overhead-cost.test.ts`
  (matemática de custo com `costingService` real, não mockado — mão-de-obra
  via `work_centers.cost_per_hour`, fallback global, OP sem apontamento,
  3 bases de overhead) + suíte existente de ciclo de vida da OP
  (`production-order-lifecycle.test.ts`, `warehouse-stock.test.ts`)
  atualizada com os novos mocks de repositório/settings.
- **OEE:** o cálculo de OEE completo mencionado no item 7/9 do
  levantamento depende de disponibilidade (tempo parado/downtime) e
  qualidade (refugo), já parcialmente cobertos por
  `production_order_tracking.quantity_scrapped`; esta entrega cobre apenas
  o eixo de custo (mão-de-obra + overhead), não o cálculo de OEE em si.

**Backfill aplicado:** as 4 linhas legadas receberam
`warehouse_id = INSUMOS` (mesmo depósito padrão usado no backfill do
Bloco 4 para saldo/lote legado).

**`down()`:** remove o índice e a coluna `warehouse_id` (rollback
simples, sem efeitos colaterais em outras tabelas).

**Contrato implementado (fatia de aplicação, mesma sessão da migration):**
- `warehouse_id` é nullable no banco (por causa do legado acima), mas
  `InventoryCountEntity.validate()` (chamada por `CreateInventoryCountUseCase`)
  exige o campo no payload — `ValidationError` (400) se ausente. Nenhuma
  contagem nova pode ser criada sem depósito.
- Na **aprovação** da contagem (`ApproveInventoryCountUseCase`), cada item
  com variância diferente de zero agora dispara, na MESMA transação:
  1. `InventoryService.adjust(...)` — mantém o dual-write legado de
     `Product.quantity` (hot path do MRP), passando `warehouse_id` para
     o registro de `InventoryMovement`;
  2. `WarehouseStockService.addToWarehouse`/`removeFromWarehouse(product_id,
     count.warehouse_id, quantity, transaction)` — ajusta o saldo do
     depósito específico contado em `ProductWarehouseStock`.
  A invariante `Product.quantity` = soma dos saldos por depósito em
  `ProductWarehouseStock` (Bloco 4) é preservada. Uma contagem
  `pending_approval` sem `warehouse_id` (só possível em dado legado
  inconsistente) é rejeitada com `BusinessRuleError` (422) antes de
  qualquer ajuste.
- `inventory_count_items` **não** ganhou `warehouse_id` próprio; todo
  item herda o depósito do cabeçalho `inventory_counts.warehouse_id`.
- Associação Sequelize já disponível: `InventoryCount.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' })`
  (`server/src/models/index.ts`).
- Validação Zod da API: `createInventoryCountSchema` em
  `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
  (usada em `inventoryCountController.create`), com `warehouse_id`
  obrigatório (`z.coerce.number().int().positive()`).
- **Risco residual conhecido:** se o saldo do depósito específico da
  contagem for insuficiente para uma baixa (`removeFromWarehouse`), a
  aprovação falha com 422 didático e faz rollback de toda a transação
  (nenhum ajuste parcial é persistido) — mesmo que o saldo GLOBAL do
  produto (soma de todos os depósitos) fosse suficiente. Isso é o
  comportamento correto/esperado (o ajuste é por depósito, não global),
  mas pode surpreender o operador se a variância negativa registrada na
  contagem for maior que o saldo real do depósito contado (ex.: contagem
  física registrada incorretamente, ou saldo já alterado por outra
  operação entre o início da contagem e a aprovação). Não há, hoje,
  nenhum mecanismo de saldo negativo — `removeFromWarehouse` bloqueia
  antes de deixar o depósito ficar negativo.
- Testes de invariante: `server/tests/unit/warehouse-invariants.test.ts`,
  describe "Invariante 3 — contagem ciclica...".

---

## Cotação / RFQ Multi-Fornecedor (`rfqs`, `rfq_items`, `rfq_suppliers`, `rfq_quotes`) — 2026-08-06

Fecha o gap "Cotação/RFQ multi-fornecedor" (item 1,
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` seção 2). Módulo
`server/src/modules/rfq/`. Contrato completo dos endpoints em
`docs/arquitetura/API.md` §11.1.

### Tabela: `rfqs` (Cabeçalho da Cotação)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| rfq_number | VARCHAR(60) | UNIQUE, NOT NULL | Número da cotação, formato `RFQ-<ano>-XXXX` |
| requisition_id | INT | FK → purchase_requisitions.id, ON DELETE RESTRICT, NULL | Origem opcional (RFQ pode nascer de requisição ou ser avulsa) |
| status | ENUM('draft','sent','quoted','awarded','cancelled') | NOT NULL, DEFAULT 'draft' | Máquina de status: `draft → sent → quoted → awarded` (`cancelled` reservado, sem transição implementada ainda) |
| created_by | INT | FK → users.id, ON DELETE RESTRICT, NOT NULL | Comprador que criou a cotação |
| response_deadline | DATE | - | Prazo de resposta dos fornecedores convidados |
| notes | TEXT | - | Observações |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria (snake_case, `underscored: true`) |

**Índices:** `requisition_id`, `status`, `created_by`.

### Tabela: `rfq_items` (Itens Cotados)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| rfq_id | INT | FK → rfqs.id, ON DELETE CASCADE, NOT NULL | Cotação dona do item |
| item_id | UUID | FK → items.id, ON DELETE RESTRICT, NOT NULL | Item industrial cotado |
| quantity | DECIMAL(18,6) | NOT NULL | Quantidade a cotar |
| unit | VARCHAR(12) | - | Unidade |
| awarded_supplier_id | INT | FK → suppliers.id, ON DELETE RESTRICT, NULL | Preenchido em `POST /api/rfqs/:id/award` — fornecedor vencedor deste item |
| awarded_unit_price | DECIMAL(18,6) | - | Preço unitário cotado do vencedor, **congelado** no momento da adjudicação (auditoria/exibição sem recalcular o mapa comparativo) |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `rfq_id`, `item_id`, `awarded_supplier_id`.

### Tabela: `rfq_suppliers` (Fornecedores Convidados)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| rfq_id | INT | FK → rfqs.id, ON DELETE CASCADE, NOT NULL | Cotação |
| supplier_id | INT | FK → suppliers.id, ON DELETE RESTRICT, NOT NULL | Fornecedor convidado |
| status | ENUM('invited','responded','declined') | NOT NULL, DEFAULT 'invited' | Status do convite |
| invited_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Data do convite |
| responded_at | TIMESTAMP | - | Data da resposta |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Constraints:** `UNIQUE(rfq_id, supplier_id)` (`uq_rfq_suppliers_rfq_supplier`).
**Índices:** `rfq_id`, `supplier_id`, `status`.

### Tabela: `rfq_quotes` (Resposta de Cotação por Item × Fornecedor)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| rfq_item_id | INT | FK → rfq_items.id, ON DELETE CASCADE, NOT NULL | Item cotado |
| supplier_id | INT | FK → suppliers.id, ON DELETE RESTRICT, NOT NULL | Fornecedor que respondeu |
| unit_price | DECIMAL(18,6) | NOT NULL | Preço unitário cotado |
| lead_time_days | INT | - | Prazo de entrega cotado |
| moq | DECIMAL(18,6) | - | Quantidade mínima de compra cotada |
| validity_date | DATE | - | Validade da cotação, informada pelo fornecedor |
| notes | TEXT | - | Observações |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Constraints:** `UNIQUE(rfq_item_id, supplier_id)` (`uq_rfq_quotes_item_supplier`)
— upsert por par item × fornecedor (reenviar substitui a cotação anterior).
**Índices:** `rfq_item_id`, `supplier_id`.

**Migration:** `server/migrations/20260806-000010-create-rfq-tables.cjs`
(schema estático, sem backfill — módulo novo).

**Efeitos colaterais da adjudicação (`POST /api/rfqs/:id/award`), fora
destas 4 tabelas, todos na mesma transação:** gera um `purchase_order` por
fornecedor vencedor; faz upsert em `item_suppliers` (catálogo item ×
fornecedor) com o preço/prazo/MOQ do vencedor. RFQ travada via `SELECT
... FOR UPDATE` durante a operação (impede adjudicações concorrentes
duplicadas).

---

## Financeiro — Centros de Custo (`cost_centers`) — 2026-08-06

Fecha o gap "centros de custo" (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`,
linha `financial`). Módulo `server/src/modules/financial/`. Contrato
completo dos endpoints em `docs/arquitetura/API.md` §6.

### Tabela: `cost_centers` (Centros de Custo)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| code | VARCHAR(30) | UNIQUE, NOT NULL | Código do centro de custo |
| name | VARCHAR(100) | NOT NULL | Nome |
| description | TEXT | - | Descrição livre |
| active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

### Alteração em `accounts_payable` e `accounts_receivable`
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| cost_center_id | INT | FK → cost_centers.id, ON DELETE SET NULL, NULL | Centro de custo do lançamento. **Coexiste** com a coluna legada `accounts_payable.cost_center` (VARCHAR(100), texto livre, não normalizado) — a nova coluna é a fonte estruturada usada pelo relatório `GET /api/finance/cost-centers/report`; a legada não foi removida nem migrada automaticamente |

**Índices:** `idx_accounts_payable_cost_center_id`, `idx_accounts_receivable_cost_center_id`.

**Migration:** `server/migrations/20260806-000020-create-cost-centers.cjs`
— idempotente (checa `showAllTables()`/`describeTable()` antes de criar,
pois a migration baseline `20260731-000001-baseline-schema.cjs` já cria
tabelas a partir dos models Sequelize atuais — um banco criado do zero
após este commit já nasce com `cost_centers`/`cost_center_id` prontos).
**Sem backfill:** todo o histórico existente nasce com `cost_center_id =
NULL` (agregado como `"Sem centro de custo"` no relatório) — não há
mapeamento automático seguro de lançamentos antigos para um centro de
custo específico.

**Risco residual registrado (não implementado nesta entrega):** mapeamento
automático departamento → centro de custo na criação automática de
`AccountPayable` (ex.: ao aprovar um pedido de compra) — hoje
`cost_center_id` só é atribuído manualmente via `PUT
.../cost-center` ou no payload de `POST /api/finance/payable`. Ver
`docs/governance/TODO.md`.

---

## Correção de "bombas latentes" UUID × INTEGER (7 colunas) — 2026-08-06

Continuação do mesmo padrão de bug já corrigido em `item_estruturas`
(migration `20260802-000005-fix-item-estruturas-user-columns`) e listado
como pendência em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, seção "Bombas
latentes conhecidas": colunas `UUID` referenciando usuário/fornecedor
`INTEGER`, tornando o campo estruturalmente impossível de preencher
corretamente via API (ou quebrando em runtime com `operator does not
exist: uuid = integer` em qualquer `include`).

### 1. Bomba real em tabela viva: `items.fornecedor_padrao_id`
| Antes | Depois |
|-------|--------|
| `UUID`, FK → `fornecedores.id` (tabela órfã em português, também UUID) | `INTEGER`, FK → `suppliers.id` (`ON DELETE SET NULL`) |

`suppliers.id` sempre foi `INTEGER`, mas `items.fornecedor_padrao_id`
nasceu `UUID` (herdado por engano do `01_schema.sql`), enquanto o código
(`models/index.ts`: `Item.belongsTo(Supplier, { foreignKey:
'fornecedor_padrao_id' })`) sempre associou a coluna ao model `Supplier`
real. Diagnóstico antes do fix (banco real, 2026-08-06): `items` tinha 13
linhas, `fornecedor_padrao_id` 100% `NULL` (0/13) — sem dado incompatível
a migrar, correção segura. Model (`Item.ts`) e validators
(`itemValidators.ts`, `z.coerce.number().int().positive().nullable().optional()`)
atualizados no mesmo commit. **BREAKING CHANGE de API:** ver
`docs/arquitetura/API.md` §3 (nota no topo da seção Produtos).

**Migration:** `server/migrations/20260806-000040-fix-items-fornecedor-padrao-id-type.cjs`.

### 2–7. Bombas em tabelas órfãs do schema-fantasma em português
As 4 colunas já documentadas em `docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`
("Bombas latentes conhecidas") + 2 encontradas nesta rodada pelo mesmo
padrão de auditoria:

| Tabela | Coluna | Antes | Depois |
|--------|--------|-------|--------|
| `requisicoes_compra` | `aprovado_por` | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |
| `requisicoes_compra` | `solicitante_id` *(novo nesta rodada)* | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |
| `ordens_producao` | `criado_por` | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |
| `movimentos_estoque` | `usuario_id` | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |
| `auditoria_eventos` | `usuario_id` | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |
| `entradas_nf` | `recebido_por` *(novo nesta rodada)* | UUID → `usuarios.id` | INTEGER → `users.id` (`ON DELETE SET NULL`) |

Todas as 6 colunas estavam 100% vazias (`0` linhas não nulas) em todas as
tabelas — confirmado por `SELECT count(*)` antes da migration (que aborta
com erro explícito se encontrar qualquer linha não nula, guarda de
segurança). As tabelas em si (`requisicoes_compra`, `ordens_producao`,
`movimentos_estoque`, `auditoria_eventos`, `entradas_nf`) são elas mesmas
órfãs (ver seção seguinte) — a correção de tipo aqui é preventiva: se esse
schema-fantasma for reaproveitado por engano no futuro, o tipo já aponta
para a fonte de verdade real de usuários (`users`, não `usuarios`).

**Migration:** `server/migrations/20260806-000041-fix-orphan-pt-schema-user-columns.cjs`.

---

## Tabelas órfãs do schema-fantasma em português — `[DESCONTINUADO]` (2026-08-06)

12 tabelas criadas pelo `01_schema.sql`/migration baseline
(`20260731-000001-baseline-schema.cjs`) em um schema em português que
**nunca foi adotado pelo app real** — confirmado por auditoria completa:
**0 linhas** em todas, **0 models Sequelize**, **0 referências** em
`server/src` (controllers, use cases, repositories, migrations
posteriores) fora de comentários genéricos sem relação com a tabela.

| Tabela órfã (português) | Equivalente ativo (inglês, em uso real) |
|---|---|
| `usuarios` | `users` |
| `fornecedores` | `suppliers` |
| `lotes` | `lot_controls` |
| `numeros_serie` | `serial_numbers` |
| `requisicoes_compra` | `purchase_requisitions` |
| `requisicao_compra_items` | `purchase_requisition_items` |
| `entradas_nf` | `purchase_receipts` (dados de recebimento) |
| `entradas_nf_items` | idem |
| `ordens_producao` | `production_orders` |
| `movimentos_estoque` | `inventory_movements` |
| `webhooks_eventos` | `webhook_events` |
| `auditoria_eventos` | `audit_logs` |

**Decisão (2026-08-06):** nenhuma tabela foi removida (`DROP TABLE`) —
princípio de nunca derrubar dado potencialmente fiscal/auditável sem uma
decisão explícita e uma janela de confirmação maior que uma única rodada
de trabalho. Cada tabela recebeu apenas `COMMENT ON TABLE` marcando-a
`DEPRECATED`, visível em `\dt`/pgAdmin/DataGrip/qualquer client SQL:

> "DEPRECATED (2026-08-06): tabela órfã do schema-fantasma em português
> criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso
> em código vivo (confirmado por auditoria). NÃO usar em código novo.
> Equivalente ativo em inglês com PKs INTEGER. Ver
> docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e
> server/tests/unit/no-orphan-pt-schema-tables.test.ts."

**Migration:** `server/migrations/20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs`.

**Fora de escopo desta marcação (schema em português que É o canônico
vivo, fases 1–4 da unificação Item — NÃO recebeu o comentário):** `items`,
`item_categorias`, `item_detalhes_comerciais`,
`item_especificacoes_tecnicas`, `item_estruturas`,
`mrp_ordens_planejadas` — todas com model Sequelize e uso ativo em
`server/src`.

**Teste de guarda anti-regressão:**
`server/tests/unit/no-orphan-pt-schema-tables.test.ts` (14 casos) — falha
o build se qualquer arquivo novo em `server/src` referenciar uma das 12
tabelas órfãs listadas acima (nome de tabela em query raw, `sequelize.define`,
`tableName` de model, etc.). **Limitação registrada:** a guarda cobre
apenas `server/src`; não varre `server/migrations/*.cjs` (migrations
antigas legitimamente referenciam essas tabelas para criá-las/alterá-las).

**Decisão futura em aberto:** avaliar `DROP TABLE` definitivo dessas 12
tabelas em uma janela dedicada, após confirmação formal de que não há
nenhuma dependência de auditoria/compliance sobre o schema-fantasma — ver
item registrado em `docs/governance/TODO.md`.

---

## Terceira rodada de 2026-08-06 — Vendas (preço por cliente + faturamento
## parcial), Produção (downtime) e Financeiro (conciliação bancária OFX)

Migrations `20260806-000050/051/052/060/070`, todas aplicadas no banco
local (junto com as das rodadas anteriores do dia — 64 migrations no
total ao final desta rodada).

### Tabela: `customer_price_lists` (Tabela de Preços por Cliente)
Gap 1/3 do módulo `sales` (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, linha
`sales`). Contrato completo em `docs/arquitetura/API.md` §5.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| customer_id | INT | FK → clients.id, `ON DELETE CASCADE`, NOT NULL | Cliente |
| product_id | INT | FK → products.id, `ON DELETE CASCADE`, NOT NULL | Produto (schema legado, não `items.id`) |
| unit_price | DECIMAL(10,2) | NOT NULL | Preço unitário negociado |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'BRL' | Moeda |
| valid_from | DATEONLY | NULL | Início da vigência (`NULL` = válido desde sempre) |
| valid_until | DATEONLY | NULL | Fim da vigência (`NULL` = sem prazo) |
| active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete (mesmo padrão de `Category.active`/`item_suppliers.active`) |
| created_by | INT | FK → users.id, `ON DELETE SET NULL`, NULL | Quem cadastrou |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `idx_customer_price_lists_customer_id`,
`idx_customer_price_lists_customer_product` (`customer_id, product_id`,
não único), `idx_customer_price_lists_product_id`. **Sem índice único**
de `customer_id + product_id` — a vigência permite múltiplas faixas de
preço no tempo para o mesmo par (reajuste mantendo histórico); a
unicidade de uma vigência ativa e não sobreposta é validada na aplicação
(`CreateCustomerPriceUseCase`), não no banco.

**Migration:** `server/migrations/20260806-000050-create-customer-price-lists.cjs`.

### Colunas novas: `sale_items.invoiced_quantity` e status `partially_invoiced`
Gap 3/3 do módulo `sales` ("Faturamento parcial").

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| `sale_items.invoiced_quantity` | DECIMAL(18,6) | NOT NULL, DEFAULT 0 | Quantidade já faturada (NF-e emitida) deste item, cumulativa entre emissões parciais. `quantity - invoiced_quantity` = saldo pendente |

`enum_sales_status` ganha o valor `'partially_invoiced'` — transição
automática `confirmed → partially_invoiced → invoiced` (nunca manual via
`PUT /:id/status`, disparada por `POST /:id/nfe` quando a NF-e cobre só
parte da quantidade). Embarque (`shipped`) continua exigindo a venda
totalmente `invoiced` — `partially_invoiced` não tem transição direta para
`shipped` em `VALID_TRANSITIONS`.

**Migrations:** `server/migrations/20260806-000051-add-invoiced-quantity-sale-items.cjs`
(coluna, idempotente via `describeTable`), `server/migrations/20260806-000052-add-partially-invoiced-sale-status.cjs`
(`ALTER TYPE ... ADD VALUE IF NOT EXISTS`, fora de transação — mesma
técnica de `20260803-000007-add-shipped-sale-status.cjs`; `down()` é
no-op, remover valor de ENUM no Postgres exige recriar o tipo inteiro).

**Risco residual documentado:** `Sale.nfe_*` guarda apenas a NF-e mais
recente — múltiplas emissões parciais sobrescrevem
chave/protocolo/XML uma da outra, sem histórico por emissão. Não há
tabela `sale_invoices` (1 venda : N NF-e) nesta v1 — ver
`docs/governance/TODO.md`. `GetSaleNfeStatusUseCase` (path assíncrono de
provedores reais — `focus_nfe`/`enotas`) ainda não atualiza
`invoiced_quantity`/`partially_invoiced`, só finaliza `confirmed →
invoiced`; afeta apenas provedor real, não o mock usado em dev.

### Tabela: `production_downtimes` (Paradas de Máquina/Centro de Trabalho)
Fecha a pendência "campo de downtime/paradas para OEE preciso" registrada
em `docs/governance/TODO.md`. Contrato completo em `docs/arquitetura/API.md` §7.

| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| work_center_id | INT | FK → work_centers.id, `ON DELETE RESTRICT`, NOT NULL | Centro de trabalho parado |
| production_order_id | INT | FK → production_orders.id, `ON DELETE SET NULL`, NULL | OP vinculada (opcional — parada pode ser geral do centro) |
| reason | ENUM | NOT NULL | `setup`, `manutencao_corretiva`, `manutencao_preventiva`, `falta_material`, `falta_operador`, `qualidade`, `outros` |
| notes | TEXT | NULL | Observações livres |
| started_at | TIMESTAMP | NOT NULL | Início da parada |
| finished_at | TIMESTAMP | NULL | Fim da parada (`NULL` = parada em aberto) |
| created_by | INT | FK → users.id, `ON DELETE RESTRICT`, NOT NULL | Quem abriu a parada |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `idx_production_downtimes_work_center_id`,
`idx_production_downtimes_production_order_id`,
`idx_production_downtimes_started_at`, e o índice único parcial
`uq_production_downtimes_open_per_work_center` (`work_center_id` WHERE
`finished_at IS NULL`) — defesa em profundidade contra 2 paradas abertas
simultâneas do mesmo centro (a regra de negócio primária vive em
`OpenProductionDowntimeUseCase`; este índice cobre corrida de escrita
concorrente que a checagem em aplicação sozinha não pega).

**Migration:** `server/migrations/20260806-000060-create-production-downtimes.cjs`
— idempotente (`showAllTables()`/`showIndex()` antes de criar).

**Impacto em OEE:** `GetOeeReportUseCase` passou a descontar
`downtime_hours` (agregado de `production_downtimes` no período) das
horas de calendário brutas para calcular `available_hours` líquidas —
`available_hours = max(calendario_bruto - downtime_hours, 0)`. Ver
`docs/arquitetura/API.md` §7.

**Risco residual documentado:** sem teste de integração real contra
Postgres para o índice único parcial (só unitário com mock).

### Tabelas: `bank_statements` / `bank_statement_entries` (Conciliação Bancária OFX)
Fecha parte do gap "conciliação bancária/CNAB" de
`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md` — **CNAB fica fora desta v1**.
Contrato completo em `docs/arquitetura/API.md` §6.

#### Tabela: `bank_statements` (um registro por arquivo `.ofx` importado)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| filename | VARCHAR(255) | NOT NULL | Nome original do arquivo enviado |
| bank_name | VARCHAR(150) | NULL | `BANKID` do OFX (informativo) |
| account_number | VARCHAR(60) | NULL | `ACCTID` do OFX (informativo) |
| period_start | DATEONLY | NULL | `DTSTART` do OFX |
| period_end | DATEONLY | NULL | `DTEND` do OFX |
| imported_by | INT | FK → users.id, `ON DELETE RESTRICT`, NOT NULL | Quem importou |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índice:** `idx_bank_statements_imported_by`.

#### Tabela: `bank_statement_entries` (cada `<STMTTRN>` do OFX)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| statement_id | INT | FK → bank_statements.id, `ON DELETE CASCADE`, NOT NULL | Extrato de origem |
| entry_date | DATEONLY | NOT NULL | `DTPOSTED` do `<STMTTRN>` |
| amount | DECIMAL(12,2) | NOT NULL | `TRNAMT` com sinal (negativo = saída/débito, positivo = entrada/crédito) |
| description | VARCHAR(255) | NULL | `MEMO`/`NAME` do `<STMTTRN>` |
| fitid | VARCHAR(100) | NOT NULL | `FITID` do `<STMTTRN>` (ou id sintético determinístico quando ausente) — usado para dedup |
| status | ENUM | NOT NULL, DEFAULT 'pending' | `pending`, `matched`, `ignored` |
| matched_payable_id | INT | FK → accounts_payable.id, `ON DELETE SET NULL`, NULL | Conta a pagar vinculada (XOR com `matched_receivable_id`) |
| matched_receivable_id | INT | FK → accounts_receivable.id, `ON DELETE SET NULL`, NULL | Conta a receber vinculada (XOR com `matched_payable_id`) |
| matched_by | INT | FK → users.id, `ON DELETE SET NULL`, NULL | Quem fez o match |
| matched_at | TIMESTAMP | NULL | Quando o match foi feito |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `uq_bank_statement_entries_statement_fitid` (único,
`statement_id + fitid`), `idx_bank_statement_entries_fitid` (dedup
**global** — contra qualquer importação anterior, não só a mesma —
verificado em `ImportStatementUseCase` via `findExistingFitids`),
`idx_bank_statement_entries_status`,
`idx_bank_statement_entries_matched_payable`,
`idx_bank_statement_entries_matched_receivable`. **Constraint**
`chk_bank_statement_entries_single_match`: `matched_payable_id IS NULL OR
matched_receivable_id IS NULL` (nunca os dois ao mesmo tempo).

**Migration:** `server/migrations/20260806-000070-create-bank-statements.cjs`
— idempotente (`showAllTables()` antes de criar).

**Parser OFX:** implementação manual (`server/src/modules/financial/infrastructure/ofx/`),
cobrindo OFX 1.x (SGML) e OFX 2.x (XML) — decisão de não adicionar
biblioteca nova, cobertura suficiente do subconjunto necessário sem
dependência frágil numa área de upload de arquivo de terceiro. Detecção
de encoding (Latin-1/CP1252) é heurística.

**Sugestões de match:** tolerância de 1 centavo (`MATCH_TOLERANCE_CENTS`)
e vencimento a até ±7 dias da data do lançamento — nunca vincula
sozinho, só sugere (`GetMatchSuggestionsUseCase`). `unmatch` é bloqueado
(422) se a conta já foi baixada — correção manual exigida, decisão
conservadora (`UnmatchEntryUseCase`).

**Risco residual documentado:** sem teste de integração end-to-end contra
Postgres real (só unitários com mocks); CNAB (boleto/remessa/retorno)
fora de escopo desta v1 — ver `docs/governance/TODO.md`.

---

### Auth — renovação deslizante de token (`POST /api/auth/refresh`) e Winston

Sem migration/tabela nova. `POST /api/auth/refresh` (`authenticate` +
`RefreshTokenUseCase`) renova o JWT com o mesmo `passwordVersion` já
validado nessa requisição — ver `docs/arquitetura/API.md` §1. Logging estruturado
Winston (`server/src/config/logger.ts`) integrado em request-logger,
errorHandler e boot (`server/index.ts`) — JSON em produção, colorido em
dev, `LOG_FILE` opcional (sem rotação de arquivo — se usado em produção,
rotação/logrotate deve ser configurada fora da aplicação).

---

### Tabelas: `import_processes` / `import_process_items` (Módulo COMEX/Importação, UC-19)

Migration `server/migrations/20260806-000090-create-import-processes.cjs`
(aplicada — total agora 66 migrations). Cobre o acompanhamento de um
processo de importação (embarque → chegada → desembaraço → entrada em
estoque) e o cálculo de nacionalização de cada item importado, **sem**
integração Siscomex/NCM — alíquotas de II/IPI/PIS/COFINS/ICMS são
informadas manualmente pelo Analista de Comex; o cálculo de tributos e
custo nacionalizado é feito em código (`ImportTaxCalculator`, módulo
`server/src/modules/comex/`), não no banco.

#### Tabela: `import_processes` (cabeçalho do processo)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| process_number | VARCHAR(60) | NOT NULL, UNIQUE | Formato `IMP-<ano>-XXXX` |
| supplier_id | INT | FK → suppliers.id, `ON DELETE RESTRICT`, NOT NULL | Fornecedor internacional — reutiliza o cadastro de `suppliers` nacional, sem campo dedicado de fornecedor estrangeiro (decisão consciente, não um bug) |
| status | ENUM | NOT NULL, DEFAULT 'draft' | `draft`→`shipped`→`arrived`→`customs_cleared`→`received`, ou `cancelled` a qualquer momento antes de `received` |
| fob_currency | VARCHAR(3) | NOT NULL, DEFAULT 'USD' | Código ISO da moeda do valor FOB |
| exchange_rate | DECIMAL(18,6) | NOT NULL, DEFAULT 1 | Cotação moeda estrangeira → BRL, usada para converter o FOB |
| freight_value | DECIMAL(18,6) | NOT NULL, DEFAULT 0 | Frete internacional em BRL, rateado pro-rata do FOB entre os itens |
| insurance_value | DECIMAL(18,6) | NOT NULL, DEFAULT 0 | Seguro internacional em BRL, rateado pro-rata do FOB |
| other_expenses_value | DECIMAL(18,6) | NOT NULL, DEFAULT 0 | Despesas aduaneiras adicionais (armazenagem, capatazia etc.) em BRL, rateadas pro-rata do FOB |
| shipped_at / arrived_at / customs_cleared_at / received_at | DATEONLY | NULL | Datas de acompanhamento do processo |
| notes | TEXT | NULL | Observações livres |
| created_by | INT | FK → users.id, `ON DELETE RESTRICT`, NOT NULL | Analista de Comex que registrou o processo |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `idx_import_processes_supplier_id`, `idx_import_processes_status`, `idx_import_processes_created_by`.

#### Tabela: `import_process_items` (itens importados)
| Coluna | Tipo | Restrições | Descrição |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Identificador |
| import_process_id | INT | FK → import_processes.id, `ON DELETE CASCADE`, NOT NULL | Processo de importação dono do item |
| item_id | UUID | FK → items.id, `ON DELETE RESTRICT`, NOT NULL | Núcleo canônico `items` — **não** `products` legado (único ponto do módulo Compras que já nasceu apontando só para o modelo novo) |
| quantity | DECIMAL(18,6) | NOT NULL | Quantidade importada |
| fob_unit_price | DECIMAL(18,6) | NOT NULL | Preço unitário FOB, na moeda estrangeira de `import_processes.fob_currency` |
| ii_rate / ipi_rate / pis_rate / cofins_rate / icms_rate | DECIMAL(7,4) | NOT NULL, DEFAULT 0 | Alíquotas percentuais informadas manualmente (ex.: `60.0000` = 60%) |
| customs_value | DECIMAL(18,6) | NULL, calculado | Valor aduaneiro rateado do item (FOB em BRL + frete + seguro + outras despesas, pro-rata) |
| ii_value / ipi_value / pis_value / cofins_value | DECIMAL(18,6) | NULL, calculado | Tributos calculados sobre `customs_value` |
| icms_value | DECIMAL(18,6) | NULL, calculado | ICMS calculado pela fórmula "por dentro" |
| nationalized_unit_cost | DECIMAL(18,6) | NULL, calculado | Custo unitário nacionalizado final — usado na entrada de estoque |
| created_at / updated_at | TIMESTAMP | NOT NULL | Auditoria |

**Índices:** `idx_import_process_items_process_id`, `idx_import_process_items_item_id`.

**Grants:** `evok_app` recebeu `SELECT/INSERT/UPDATE/DELETE` automaticamente
nas 2 tabelas via `ALTER DEFAULT PRIVILEGES` da migration `-000080` —
confirmado por query real em `information_schema.role_table_grants`, ver
`docs/database/05-ACESSOS_E_ISOLAMENTO.md` §1.1.1.

**Contagens atualizadas (2026-08-06, pós-COMEX):** 66 migrations
aplicadas, 80 tabelas de negócio, 175 foreign keys. Ver
`docs/database/03-MODELO_FISICO.md` para o detalhamento completo.

---

## BLOCO 1 SST — Implementação Backend (2026-08-07)

Módulo SST (Segurança e Saúde do Trabalho, departamento 15). Schema
completo (12 migrations, `20260806-000130` a `20260806-000141`) já
projetado e auditado em 2026-08-06 (`docs/business/BLOCO_1_SST_*.md`) —
**migrations continuam pendentes de `migration:up`** (aguardando
aprovação explícita do dono do produto, convenção do projeto). Esta
entrega adicionou apenas o CÓDIGO que aponta para esse schema:

- **14 models Sequelize** (`server/src/models/Sst*.ts`): `SstTipoEpi`,
  `SstMatrizEpi`, `SstEntregaEpi`, `SstDevolucaoEpi`, `SstAcaoCorretiva`,
  `SstPlanoExames`, `SstAso`, `SstExameComplementar`, `SstAcidente`,
  `SstAcidenteTestemunha`, `SstInvestigacaoAcidente`,
  `SstAcidenteComplemento`, `SstCat`, `SstEventoEsocial` — colunas 100%
  em português (nome igual ao da migration), registrados e associados em
  `server/src/models/index.ts`.
- **Mapper DTO PT-BR↔inglês** (primeiro do projeto,
  `docs/business/BLOCO_1_SST_MODELO_DADOS.md` §0): vive em
  `server/src/modules/sst/infrastructure/mappers/` (`EpiMapper.ts`,
  `AsoMapper.ts`, `AccidentMapper.ts`) — traduz `ca`↔`ca_numero`,
  `ativo`↔`active`, `tamanhos_variacoes` (string `P/M/G`) ↔ `tamanhos`
  (array), `tipo_epi_id`↔`epi_type_id`, `setor_local`↔`local_setor`,
  `parte_corpo_atingida`↔`parte_corpo`, `risco_exigente`↔`risco_exigido`
  (esta última divergência não estava mapeada em nenhum documento do
  bloco anterior — descoberta na implementação).
- **Nenhuma migration foi criada, alterada ou aplicada** nesta entrega —
  os models refletem exatamente o schema já revisado pelo
  `AuditorIntegrador`. Se o schema mudar antes da aprovação, os models
  precisam ser atualizados manualmente (não há introspecção automática).
- **NOTA DE GAP DE SCHEMA (transparência para a próxima passada):**
  `sst_acidentes` não tem uma coluna de status de encerramento dedicada
  (`POST /accidents/:id/close` da API publicada) — apenas `confirmado`,
  que já nasce `true` na criação (a API não expõe uma fase de rascunho
  para Acidente, diferente de EntregaEPI). `CloseAccidentUseCase` hoje
  funciona como um PORTÃO DE VALIDAÇÃO (RF-SST-026/BR-SST-018) sem
  persistir uma nova transição de estado. Se o produto precisar de um
  status de encerramento auditável, é necessária uma migration adicional
  (fora do escopo desta passada).

Ver `docs/governance/HANDOFF_CODEX.md` para o detalhamento completo da
entrega (endpoints implementados, testes, pendências).

---

## BLOCO 1 SST — Implementação Backend, passada 2 (2026-08-07)

Continuação da entrega acima: CIPA, PGR/GES, Treinamentos, Rotina
Preventiva e CRUD dedicado de Ações Corretivas — os 37 endpoints restantes
do contrato (75/75 endpoints do módulo SST completos). Mesmo princípio da
passada 1: **nenhuma migration foi criada, alterada ou aplicada** — os
models abaixo apontam para o schema já existente
(`server/migrations/20260806-000138` a `-000141`), ainda pendente de
`migration:up` (aguardando aprovação do dono do produto).

- **20 models Sequelize novos** (`server/src/models/Sst*.ts`), colunas
  100% em português (nome igual ao da migration), registrados e associados
  em `server/src/models/index.ts`:
  - CIPA: `SstMandatoCipa`, `SstMembroCipa`, `SstProcessoEleitoralCipa`,
    `SstCandidatoCipa`, `SstReuniaoCipa`, `SstReuniaoCipaPresente`.
  - PGR/GES: `SstGes`, `SstGesFuncionario`, `SstRiscoOcupacional`,
    `SstRiscoEpi`, `SstRiscoExame`.
  - Treinamentos: `SstMatrizTreinamento`, `SstTreinamento`.
  - Rotina Preventiva: `SstInspecaoSeguranca`, `SstInspecaoItem`,
    `SstPermissaoTrabalho`, `SstPtExecutante`, `SstBrigadista`,
    `SstRegistroDds`, `SstDdsPresenca`.
- **5 mappers DTO PT-BR↔inglês novos**
  (`server/src/modules/sst/infrastructure/mappers/`): `CipaMapper.ts`
  (`estabilidade_inicio`↔`inicio_candidatura`, `estabilidade_fim`↔
  `fim_estabilidade`, `mandato_id`↔`mandate_id` em reuniões),
  `PgrMapper.ts` (`intensidade_concentracao`↔`intensidade`,
  `proxima_revisao_prevista`↔`data_revisao_prevista`, `medidas_controle`
  array↔`TEXT` serializado por `|`), `TrainingMapper.ts`
  (`periodicidade_reciclagem_meses`↔`periodicidade_meses`,
  `data_realizacao`↔`data`), `SafetyRoutineMapper.ts`
  (`item_verificado`↔`item`), `CorrectiveActionMapper.ts`
  (`origem_tipo`↔`origem`, `status: atrasada` derivado na leitura, nunca
  persistido).
- **5 repositórios de domínio + Sequelize** novos: `CipaRepository`,
  `PgrRepository`, `TrainingRepository`, `SafetyRoutineRepository`,
  `CorrectiveActionRepository` (interfaces em `domain/repositories/`,
  implementações em `infrastructure/sequelize/`).
- **NOTA DE DECISÃO DE SCHEMA (transparência, não gap):** `sst_candidatos_cipa`
  não tem coluna para registrar apuração fora de `votos`/`eleito` — a
  "apuração" (`POST /cipa/electoral-processes/:id/close`) atualiza os
  candidatos existentes (`votos`, `eleito`) e consolida
  `total_votantes`/`data_votacao`/`atas_urls` no processo eleitoral, sem
  necessidade de tabela adicional.

Ver `docs/governance/HANDOFF_CODEX.md` para o detalhamento completo da
entrega (endpoints implementados, testes, pendências).

---

## BLOCO 2 TI — Implementação Backend (2026-08-07)

Módulo TI (Tecnologia da Informação, departamento 13): helpdesk, termo de
responsabilidade de equipamento, licenças de software, solicitações de
acesso (onboarding/change/offboarding) e backup/continuidade. Migrations já
existiam (`server/migrations/20260807-000150` a `-000156`, criadas e
auditadas em passada anterior) — **ainda pendentes de `migration:up`**
(aguardando aprovação do dono do produto para o banco de dev; nenhuma
migration foi aplicada nesta entrega). Diferente do SST, as tabelas `it_*`
usam nomes em **inglês** (colunas e tabelas), então os mappers deste módulo
são mais finos (achatam a instância Sequelize, sem tradução PT-BR↔inglês).

### Tabelas novas (10)

| Tabela | Migration | Model Sequelize | Observação |
|---|---|---|---|
| `it_ticket_categories` | `20260807-000150` | `ItTicketCategory` | Catálogo leve, seed idempotente feito pela aplicação (não pela migration) |
| `it_tickets` | `20260807-000150` | `ItTicket` | `requester_id` nullable + `system_generated` (CHECK) para chamado automático de falha de backup |
| `it_ticket_comments` | `20260807-000151` | `ItTicketComment` | `ticket_id` CASCADE (composição pura) |
| `it_ticket_priority_history` | `20260807-000151` | `ItTicketPriorityHistory` | Trilha de reclassificação de prioridade |
| `it_responsibility_terms` | `20260807-000152` | `ItResponsibilityTerm` | Índice único parcial `uq_it_responsibility_terms_active_per_asset` (1 termo `active` por asset) |
| `it_software_license_details` | `20260807-000153` | `ItSoftwareLicenseDetail` | Extensão 1:1 de `assets` (`asset_type='license'`, validado em app) |
| `it_license_seats` | `20260807-000153` | `ItLicenseSeat` | Índice único parcial `uq_it_license_seats_active_per_employee` |
| `it_access_requests` | `20260807-000154` | `ItAccessRequest` | Fecha a FK adiada `it_tickets.access_request_id` |
| `it_backup_logs` | `20260807-000155` | `ItBackupLog` | `generated_ticket_id` aponta para o chamado automático de falha (RF-TI-040) |
| `ti_settings` | `20260807-000156` | `TiSettings` | Singleton (`id=1`, `CHECK`), mesmo padrão de `production_cost_settings` — SLA por prioridade, dias de auto-close/reabertura, janelas de alerta de licença, frequência de teste de restore |

Nenhuma tabela paralela de ativos/licenças foi criada (BR-TI-008) —
`it_software_license_details`/`it_responsibility_terms` sempre referenciam
`assets` por FK. Nenhuma FK nova de "gestor de departamento" foi criada —
`departments.manager_id` (já existente) resolve a elegibilidade de
aprovador de `ItAccessRequest` (ver `approverEligibilityService.ts`).

### Estrutura do módulo (Clean Architecture)

`server/src/modules/ti/` segue exatamente o padrão de `modules/sst/`:
`domain/{entities,repositories,services}`, `application/{services,use-cases}`
(ticket, term, license, accessRequest, backup), `infrastructure/{adapters,
mappers,sequelize}`, `presentation/{controllers,routes}`. 4 interfaces de
serviço injetadas evitam import direto de outro módulo:
`AssetLookupService`, `MaintenanceOrderService`,
`AccessProfileExecutionService` (delega a
`AssignAccessProfileUseCase`/`DeactivateUserUseCase`/`CreateUserUseCase`
reais do módulo `users`, nunca duplica `AuditLog`) e
`PurchaseRequisitionService` (delega a `CreatePurchaseRequisitionUseCase`
real do módulo `purchaseRequisitions`).

### Novo middleware `authorizeSelfOrModule`

`server/src/middlewares/authorizeSelfOrModule.ts` — libera a requisição se
`role=admin`, OU módulo com nível suficiente, OU posse do recurso
(`ownershipCheck(req)` assíncrono fornecido pelo chamador). Único uso hoje:
6 rotas de auto-serviço do helpdesk de TI (abrir/ver/comentar/confirmar/
reabrir o PRÓPRIO chamado) e a elegibilidade de aprovador de
`ItAccessRequest` (`ti:approve` OU gestor do departamento). Reutilizável por
qualquer módulo futuro com a mesma necessidade (RNF-TI-02).

Ver `docs/governance/HANDOFF_CODEX.md` para o detalhamento completo desta
entrega (endpoints implementados, testes, pendências, decisões próprias).

---

## Módulo Facilities — Implementação Backend + Frontend do zero (2026-08-07)

Módulo Facilities (departamento 17, sigla FAC) não tinha NENHUM código
antes desta entrega — apenas a linha do departamento em `departments`
(seed) e um esboço `[PENDENTE]` em sintaxe MySQL em
`docs/administrativo/03-FACILITIES.md`. Implementado do zero: 4 tabelas,
4 models Sequelize, módulo Clean Architecture completo
(`server/src/modules/facilities/`), CRUD create/list/get/update (sem
delete) e tela web com 4 abas.

### Tabelas novas (4)

Migration única `20260807-000200-create-facilities-module.cjs` (idempotente).

| Tabela | Model Sequelize | Observação |
|---|---|---|
| `facility_vehicles` | `FacilityVehicle` | Nome prefixado `facility_` (não `fleet_vehicles`, nome do spec original) para evitar colisão com uma futura frota de logística/expedição. `plate` único. |
| `facility_fuel_records` | `FacilityFuelRecord` | FK `vehicle_id` → `facility_vehicles` (`ON DELETE RESTRICT`), FK opcional `driver_id` → `employees` (`ON DELETE SET NULL`). Coluna `record_date` (não `date`, nome do spec original — evita nome ambíguo/reservado). |
| `facility_cleaning_schedules` | `FacilityCleaningSchedule` | `area` é texto livre (não FK para `facility_areas` — cobre áreas informais não cadastradas formalmente). |
| `facility_areas` | `FacilityArea` | FK opcional `department_id` → `departments` (`ON DELETE SET NULL`). |

Nenhuma das 4 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
apenas para `Category`) — não há endpoint de delete físico ou lógico neste
módulo (escopo: create/list/get/update).

### RBAC

Novo módulo `facilities` em `server/src/shared/domain/accessModules.ts`
(espelhado em `client/src/api/accessProfiles.ts`) — todas as rotas usam
`authorizeModule('facilities', ...)`, leitura no nível padrão (`operate`,
mesmo padrão de `centros_de_trabalho`/`sst`/`ti`) e escrita explicitamente
com `authorizeModule('facilities', 'operate')`. Sem nível `approve` — módulo
essencialmente de cadastro/controle.

### Frontend

`client/src/pages/facilities/FacilitiesPage.tsx` (4 abas: Frota,
Abastecimento, Limpeza, Áreas), `client/src/api/facilities.ts`. Rota
`/facilities` protegida por `ModuleRoute module="facilities"`, item de menu
em "Administração" (junto de TI).

Ver `docs/governance/HANDOFF_CODEX.md` para o detalhamento completo desta
entrega (endpoints, testes, decisões próprias).

---

## Módulo Marketing — Implementação Backend + Frontend do zero (2026-08-07)

Módulo Marketing (departamento 14, sigla MKT) não tinha NENHUM código antes
desta entrega — apenas a linha do departamento em `departments` (seed) e 3
tabelas apresentadas em sintaxe MySQL como se fossem reais em
`docs/comercial/02-MARKETING.md` (nunca migradas). Implementado do zero: 3
tabelas, 3 models Sequelize, módulo Clean Architecture completo
(`server/src/modules/marketing/`), CRUD create/list/get/update (sem delete),
funil de leads como ação dedicada e upload de arquivo de material, com tela
web de 3 abas.

### Tabelas novas (3)

Migration única `20260807-000210-create-marketing-module.cjs` (idempotente).

| Tabela | Model Sequelize | Observação |
|---|---|---|
| `marketing_campaigns` | `MarketingCampaign` | `campaign_type` (`ads`/`social`/`email`/`event`/`trade`/`content`), `status` (`planned`/`active`/`paused`/`completed`/`canceled`), contadores `leads_generated`/`conversions` incrementados automaticamente pelos casos de uso de Lead (não editáveis livremente via `PUT`, mas aceitos no payload para correção manual). |
| `marketing_leads` | `MarketingLead` | FK opcional `campaign_id` → `marketing_campaigns` (`ON DELETE SET NULL`), FK opcional `converted_to_customer_id` → `clients` (`ON DELETE SET NULL`, populada quando o funil atinge `converted`). Funil (`status`) via ação dedicada `POST /api/marketing/leads/:id/status`, não `PUT` genérico. |
| `marketing_materials` | `MarketingMaterial` | FK opcional `product_id` → `items.id` — **`UUID`, não `INTEGER`** (diferença deliberada do spec original em MySQL: `items.id` é UUID no schema real, mesmo padrão de `sst_tipo_epi.item_id`). `file_path` populado via `POST /api/marketing/materials/:id/file` (upload separado da criação dos metadados). |

Nenhuma das 3 tabelas tem soft delete (`CLAUDE.md` §7 reserva soft delete
apenas para `Category`) — `marketing_campaigns`/`marketing_leads` têm ciclo
de vida via `status` enum; não há endpoint de delete físico ou lógico neste
módulo (escopo: create/list/get/update).

### Funil de leads (`ChangeLeadStatusUseCase`)

`new -> contacted -> qualified -> converted/lost`. `lost` pode ser atingido
de qualquer etapa aberta (desistência a qualquer momento); `converted`/
`lost` são terminais. Transições fora do mapa (pular etapa, voltar etapa)
são bloqueadas com 422 (`BusinessRuleError`). Ao converter, `converted_to_customer_id`
é opcional (pode ser vinculado depois) e, se a campanha de origem existir,
`marketing_campaigns.conversions` é incrementado na mesma operação.

### RBAC

Novo módulo `marketing` em `server/src/shared/domain/accessModules.ts`
(espelhado em `client/src/api/accessProfiles.ts`) — todas as rotas usam
`authorizeModule('marketing', ...)`, leitura no nível padrão (`operate`,
mesmo padrão de `facilities`/`centros_de_trabalho`/`sst`/`ti`) e escrita
explicitamente com `authorizeModule('marketing', 'operate')`. Sem nível
`approve` — módulo essencialmente de cadastro/controle de funil.

### Frontend

`client/src/pages/marketing/MarketingPage.tsx` (3 abas: Campanhas, Leads —
kanban simples por status com botões de avanço/perda —, Materiais),
`client/src/api/marketing.ts`. Rota `/marketing` protegida por
`ModuleRoute module="marketing"`, item de menu no grupo "Vendas" (junto de
Vendas).

Ver `docs/governance/HANDOFF_CODEX.md` para o detalhamento completo desta
entrega (endpoints, testes, decisões próprias).
