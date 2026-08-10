# Compras e Suprimentos - Módulo Suprimentos

## Departamento de Compras (COMP)

### Funções

| Função | Descrição |
|--------|-----------|
| Cotação | Solicitar mínimo 3 cotações para cada material |
| Negociação | Negociar preço, prazo de entrega, condição de pagamento |
| Emissão de Pedido | Gerar purchase_order no sistema |
| Follow-up | Acompanhar entrega, resolver problemas |
| Recebimento | Conferir quantidade e qualidade |
| Avaliação | Avaliar fornecedores periodicamente |

### Processo de Compras

```
1. Necessidade (MRP / Requisição)
    │
    ▼
2. Pesquisa de Fornecedores
    │
    ▼
3. Cotação (mínimo 3)
    │
    ▼
4. Análise Técnica + Comercial
    │
    ▼
5. Escolha do Fornecedor
    │
    ▼
6. Emissão do Pedido (PO)
    │
    ▼
7. Acompanhamento
    │
    ▼
8. Recebimento
    ├── Conferência física (quantidade)
    └── Inspeção de qualidade (incoming)
    │
    ▼
9. Liberação para pagamento
```

### Categorias de Compra

| Categoria | Exemplos | Lead Time | Fornecedores Principais |
|-----------|----------|-----------|------------------------|
| Matéria-prima nacional | Cone, basket, surround, spider | 15-30 dias | ConeTech, AçoFort, Têxtil Spider |
| Matéria-prima importada | Imã neodímio, bobinas especiais | 60-90 dias | MagnaTech (China), Ferrite Global |
| Embalagem | Caixa master, sacola, papelão | 10-15 dias | EmbalarTech, CaixaFort |
| Insumos produção | Cola, verniz, solda | 5-10 dias | Adesivos Brasil, ColaFort |
| EPIs | Luvas, óculos, protetor | 5 dias | EPI Brasil, SafetyFirst |
| Manutenção | Correias, rolamentos, filtros | 10-20 dias | ManuPeças, Rolamentec |
| Material escritório | Papel, toner, caneta | 3 dias | OfiBrasil, Kalunga |

### Tabelas SQL (Complementares)

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL** — este ERP
> roda **exclusivamente em PostgreSQL 16**. Confronto contra `erp_evok_audio`
> nesta data:
>
> - `purchase_requisitions` **existe**, mas `department_id` é **nullable** e
>   há colunas não descritas aqui: `origin`, `engineering_project_id`,
>   `production_order_id`, `updated_at`;
> - `purchase_requisition_items` **existe**, porém **não tem `product_id` nem
>   `almox_item_id`**: a coluna real é **`item_id UUID NOT NULL`** com FK para
>   `items.id`. Também tem `required_date`, `notes` e `updated_at`;
> - o `ALTER TABLE purchase_orders` é fantasia parcial: `requisition_id`,
>   `freight_type`, `freight_value`, `invoice_number` e `invoice_date`
>   **existem**; `incoterm`, `tracking_code`, `delivery_forecast_date` e
>   `received_date` **não existem** (as datas reais são `expected_date` e
>   `delivery_date`). O pedido real ainda tem `nfe_key`, `nfe_series`,
>   `nfe_xml_path`, `nfe_registered_by`, `nfe_registered_at` e `invoice_type`.
>
> Sobre o ciclo de `purchase_requisitions.status`: desde o commit `9df39c7`
> (gap G15) os estados `partial` e `received` **deixaram de ser mortos** — são
> recalculados a cada recebimento por
> `modules/purchases/application/services/syncRequisitionReceiptStatus.ts`, e
> não são declaráveis por `PATCH /:id/status`.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- REQUISIÇÃO DE COMPRA (antes do pedido)
CREATE TABLE purchase_requisitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requisition_number VARCHAR(20) UNIQUE NOT NULL,
    requester_id INT NOT NULL,
    department_id INT NOT NULL,
    production_order_id INT,
    request_date DATE NOT NULL,
    priority ENUM('normal','urgent','emergency'),
    status ENUM('draft','pending','approved','ordered','partial','received','canceled'),
    approved_by INT,
    approval_date DATE,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- ITENS DA REQUISIÇÃO
CREATE TABLE purchase_requisition_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requisition_id INT NOT NULL,
    product_id INT,
    almox_item_id INT,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10),
    suggested_supplier_id INT,
    unit_price_estimated DECIMAL(10,2),
    status ENUM('pending','ordered','canceled'),
    created_at DATETIME
);

-- ACOMPANHAMENTO DE PEDIDO
ALTER TABLE purchase_orders ADD COLUMN (
    requisition_id INT,
    freight_type ENUM('cif','fob'),
    freight_value DECIMAL(10,2),
    incoterm VARCHAR(10),                        -- EXW, FOB, CIF, DDP
    tracking_code VARCHAR(100),
    delivery_forecast_date DATE,
    received_date DATE,
    invoice_number VARCHAR(50),
    invoice_date DATE
);
```

### Indicadores de Compras

| KPI | Fórmula | Meta |
|-----|---------|------|
| Prazo Médio Entrega | Soma dias / Nº de pedidos | < 20 dias |
| % Entrega no Prazo | Entregas no prazo / Total | > 90% |
| Economia em Compras | (Preço padrão - Preço real) x Qtd | > 5% |
| Giro de Fornecedores | Fornecedores ativos / Total | > 80% |
| Lead Time Importação | Data pedido - Data recebimento | < 90 dias |
