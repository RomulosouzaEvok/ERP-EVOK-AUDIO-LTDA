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
