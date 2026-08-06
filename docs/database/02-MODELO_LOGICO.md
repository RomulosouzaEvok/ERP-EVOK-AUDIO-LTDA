# Modelo Lógico (DER) — ERP EVOK ÁUDIO

DER técnico: tabelas reais, chaves primárias/estrangeiras e cardinalidade,
conforme aplicado pelas 66 migrations no PostgreSQL 16 local (introspecção
real, 2026-08-06, reconferida no mesmo dia após a migration
`20260806-000090-create-import-processes.cjs`, que adicionou
`import_processes`/`import_process_items` — módulo COMEX/Importação, UC-19).
Cobre os módulos principais pedidos (Item, Fornecedor,
Venda, OP, Requisição/Pedido de Compra, Financeiro, RFQ, Centros de
Custo, COMEX/Importação) — **não** cobre as 12 tabelas órfãs do
schema-fantasma em português nem tabelas puramente técnicas de migração
(ver [04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md) para o catálogo
completo das 80 tabelas).

> **Atenção — dualidade Item×Product ainda em migração (Fase 4/expand):**
> o núcleo canônico novo é `items` (UUID), mas `products` (INTEGER) ainda
> é a tabela realmente usada por `sales`, `purchase_order_items`,
> `production_orders` e várias outras. Onde o diagrama mostra uma FK para
> `products`, é o estado real hoje — não um erro de modelagem.

## Compras: Requisição → RFQ → Pedido → Recebimento

```mermaid
erDiagram
    DEPARTMENTS ||--o{ PURCHASE_REQUISITIONS : "department_id"
    USERS ||--o{ PURCHASE_REQUISITIONS : "requester_id"
    ENGINEERING_PROJECTS ||--o{ PURCHASE_REQUISITIONS : "engineering_project_id"
    PURCHASE_REQUISITIONS ||--|{ PURCHASE_REQUISITION_ITEMS : "id"
    PRODUCTS ||--o{ PURCHASE_REQUISITION_ITEMS : "product_id"

    PURCHASE_REQUISITIONS ||--o{ RFQS : "requisition_id (opcional)"
    RFQS ||--|{ RFQ_ITEMS : "id"
    RFQS }o--o{ SUPPLIERS : "rfq_suppliers (convite)"
    RFQ_ITEMS ||--o{ RFQ_QUOTES : "id"
    SUPPLIERS ||--o{ RFQ_QUOTES : "supplier_id"
    SUPPLIERS ||--o{ RFQ_ITEMS : "awarded_supplier_id (opcional, adjudicacao)"

    SUPPLIERS ||--o{ PURCHASE_ORDERS : "supplier_id"
    USERS ||--o{ PURCHASE_ORDERS : "requester_id"
    PURCHASE_REQUISITIONS ||--o{ PURCHASE_ORDERS : "requisition_id"
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : "id"
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : "product_id"
    PURCHASE_ORDERS ||--o{ PURCHASE_RECEIPTS : "id"
    PURCHASE_ORDERS ||--o{ ACCOUNTS_PAYABLE : "purchase_id (pos-recebimento)"

    ITEMS ||--o{ ITEM_SUPPLIERS : "item_id"
    SUPPLIERS ||--o{ ITEM_SUPPLIERS : "supplier_id"
    SUPPLIERS ||--o{ ITEMS : "fornecedor_padrao_id"

    PURCHASE_REQUISITIONS {
        int id PK
        int department_id FK
        int requester_id FK
        int engineering_project_id FK
        varchar origin
        enum status
    }
    RFQS {
        int id PK
        int requisition_id FK "nullable"
        enum status
    }
    RFQ_ITEMS {
        int id PK
        int rfq_id FK
        uuid item_id FK
        numeric quantity
        int awarded_supplier_id FK "nullable, adjudicacao"
        numeric awarded_unit_price "nullable, adjudicacao"
    }
    RFQ_QUOTES {
        int id PK
        int rfq_item_id FK
        int supplier_id FK
        numeric unit_price
        int lead_time_days
        numeric moq "nullable"
    }
    PURCHASE_ORDERS {
        int id PK
        int supplier_id FK
        int requester_id FK
        int requisition_id FK
        varchar order_number UK
        enum status
    }
```

## Compras: Processo de Importação (COMEX)

```mermaid
erDiagram
    SUPPLIERS ||--o{ IMPORT_PROCESSES : "supplier_id (fornecedor internacional)"
    USERS ||--o{ IMPORT_PROCESSES : "created_by"
    IMPORT_PROCESSES ||--|{ IMPORT_PROCESS_ITEMS : "id"
    ITEMS ||--o{ IMPORT_PROCESS_ITEMS : "item_id"

    IMPORT_PROCESSES {
        int id PK
        varchar process_number UK "IMP-<ano>-XXXX"
        int supplier_id FK
        int created_by FK
        enum status "draft|shipped|arrived|customs_cleared|received|cancelled"
        varchar fob_currency
        numeric exchange_rate
        numeric freight_value
        numeric insurance_value
        numeric other_expenses_value
    }
    IMPORT_PROCESS_ITEMS {
        int id PK
        int import_process_id FK
        uuid item_id FK
        numeric quantity
        numeric fob_unit_price "moeda estrangeira"
        numeric ii_rate
        numeric ipi_rate
        numeric pis_rate
        numeric cofins_rate
        numeric icms_rate
        numeric customs_value "calculado"
        numeric nationalized_unit_cost "calculado"
    }
```

`IMPORT_PROCESS_ITEMS.item_id` referencia o núcleo canônico `ITEMS`
(UUID), não `PRODUCTS` legado — único ponto do bloco Compras/RFQ que já
nasceu apontando só para o modelo novo (ao contrário de
`PURCHASE_REQUISITION_ITEMS`/`PURCHASE_ORDER_ITEMS`, que ainda apontam
para `PRODUCTS`).

## Vendas: Cliente → Venda → Faturamento → Contas a Receber

```mermaid
erDiagram
    CLIENTS ||--o{ SALES : "customer_id"
    USERS ||--o{ SALES : "user_id (vendedor)"
    SALES ||--|{ SALE_ITEMS : "id"
    PRODUCTS ||--o{ SALE_ITEMS : "product_id"
    SALES ||--o{ ACCOUNTS_RECEIVABLE : "sale_id"
    CLIENTS ||--o{ ACCOUNTS_RECEIVABLE : "customer_id"
    CLIENTS ||--o{ CUSTOMER_PRICE_LISTS : "customer_id"
    PRODUCTS ||--o{ CUSTOMER_PRICE_LISTS : "product_id"
    SALES ||--o| PRODUCTION_ORDERS : "sales_order_id (venda->OP)"

    SALES {
        int id PK
        int customer_id FK
        int user_id FK
        enum status "quote|confirmed|partially_invoiced|invoiced|shipped|canceled"
        varchar nfe_number
    }
    SALE_ITEMS {
        int id PK
        int sale_id FK
        int product_id FK
        int quantity
        decimal invoiced_quantity "acumulado entre NF-e parciais"
    }
    CUSTOMER_PRICE_LISTS {
        int id PK
        int customer_id FK
        int product_id FK
        decimal unit_price
        date valid_from "nullable"
        date valid_until "nullable"
    }
```

## Produção: Item/BOM → Ordem de Produção → Apontamento/OEE

```mermaid
erDiagram
    PRODUCTS ||--o{ PRODUCTION_ORDERS : "product_id"
    DEPARTMENTS ||--o{ PRODUCTION_ORDERS : "department_id"
    SALES ||--o| PRODUCTION_ORDERS : "sales_order_id"
    PRODUCTION_ORDERS ||--|{ PRODUCTION_ORDER_TRACKING : "id (apontamento)"
    PRODUCTION_ROUTES ||--|{ PRODUCTION_ROUTE_STEPS : "id"
    WORK_CENTERS ||--o{ PRODUCTION_ROUTE_STEPS : "work_center_id"
    WORK_CENTERS ||--|{ WORK_CENTER_SHIFTS : "id"
    WORK_CENTERS ||--o{ PRODUCTION_DOWNTIMES : "work_center_id"
    PRODUCTION_ORDERS ||--o{ PRODUCTION_DOWNTIMES : "production_order_id (opcional)"
    ITEMS ||--o{ ITEM_ESTRUTURAS : "item_id (BOM)"
    PRODUCTS ||--o{ BILL_OF_MATERIAL_ITEMS : "product_id (BOM legado, dual-read item_id)"
    PRODUCTION_ORDERS ||--o{ LOT_CONTROLS : "production_order_id (lote de saida)"
    PRODUCTION_ORDERS ||--o{ PRODUCTION_LOT_CONSUMPTIONS : "id (FEFO)"

    PRODUCTION_ORDERS {
        int id PK
        int product_id FK
        int department_id FK
        int sales_order_id FK "nullable"
        enum status "planned|released|in_progress|completed|..."
    }
    WORK_CENTERS {
        int id PK
        varchar code UK
        numeric cost_per_hour
    }
    PRODUCTION_DOWNTIMES {
        int id PK
        int work_center_id FK
        int production_order_id FK "nullable"
        enum reason
        timestamp started_at
        timestamp finished_at "nullable"
    }
```

## Financeiro: Contas, Centros de Custo, Conciliação Bancária

```mermaid
erDiagram
    SUPPLIERS ||--o{ ACCOUNTS_PAYABLE : "supplier_id"
    PURCHASE_ORDERS ||--o{ ACCOUNTS_PAYABLE : "purchase_id"
    COST_CENTERS ||--o{ ACCOUNTS_PAYABLE : "cost_center_id (opcional)"
    USERS ||--o{ ACCOUNTS_PAYABLE : "approved_by"
    COST_CENTERS ||--o{ ACCOUNTS_RECEIVABLE : "cost_center_id (opcional)"

    USERS ||--o{ BANK_STATEMENTS : "imported_by"
    BANK_STATEMENTS ||--|{ BANK_STATEMENT_ENTRIES : "statement_id"
    BANK_STATEMENT_ENTRIES ||--o| ACCOUNTS_PAYABLE : "matched_payable_id (XOR)"
    BANK_STATEMENT_ENTRIES ||--o| ACCOUNTS_RECEIVABLE : "matched_receivable_id (XOR)"

    ACCOUNTS_PAYABLE {
        int id PK
        int supplier_id FK
        int purchase_id FK
        int cost_center_id FK "nullable"
        enum status
    }
    COST_CENTERS {
        int id PK
        varchar code UK
        varchar name
    }
    BANK_STATEMENT_ENTRIES {
        int id PK
        int statement_id FK
        varchar fitid "dedup global"
        enum status "pending|matched|ignored"
        int matched_payable_id FK "nullable"
        int matched_receivable_id FK "nullable"
    }
```

## Acesso e Perfis

```mermaid
erDiagram
    USERS ||--o| ACCESS_PROFILES : "access_profile_id (nullable)"
    ACCESS_PROFILES ||--|{ ACCESS_PROFILE_PERMISSIONS : "access_profile_id"

    USERS {
        int id PK
        varchar email UK
        enum role "admin|operator|financial"
        int access_profile_id FK "nullable"
    }
    ACCESS_PROFILE_PERMISSIONS {
        int id PK
        int access_profile_id FK
        varchar module
        enum level "operate|approve"
    }
```

## Convenções de cardinalidade usadas

- `||--o{` = 1 para 0..N (a maioria das FKs opcionais/obrigatórias de lado N).
- `||--|{` = 1 para 1..N (relação "dono" onde o filho não existe sem o pai, ex.: `SALES` → `SALE_ITEMS`).
- `}o--o{` = N para N (via tabela associativa, ex.: `RFQS` × `SUPPLIERS` por `rfq_suppliers`).
- `||--o|` = 1 para 0..1 (FK opcional e tipicamente única do lado N, ex.: `SALES` → `PRODUCTION_ORDERS.sales_order_id`).

Para o `ON DELETE`/`ON UPDATE` exato de cada FK (RESTRICT/CASCADE/SET
NULL), ver [03-MODELO_FISICO.md](03-MODELO_FISICO.md) → `schema.sql`
(fonte de verdade) ou `docs/database/DATABASE.md` (racional de cada decisão).
