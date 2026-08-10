# Estoque de Produto Acabado - Módulo Logística

## Gestão de Estoque PA

### Layout do Depósito

```
┌─────────────────────────────────────────────────────────┐
│                    ESTOQUE PA EVOK                        │
├─────────────────────────────────────────────────────────┤
│ Rua A: Auto-falante 12" (picking) ████████████████░░ 80%│
│ Rua B: Auto-falante 15" (picking) ██████████░░░░░░ 50%│
│ Rua C: Tweeter (caixas)           ██████████████░░ 70%│
│ Rua D: Subwoofer 18"              █████████████░░░ 65%│
│ Rua E: Paletização (expedição)    ████████████████░ 85%│
│ Rua F: Devoluções / Quarentena    ████░░░░░░░░░░░░ 20%│
└─────────────────────────────────────────────────────────┘
```

### Níveis de Estoque PA

| Produto | Estoque Segurança | Ponto de Pedido | Estoque Máximo | Estoque Atual |
|---------|------------------|----------------|---------------|--------------|
| EVOK-12-300 | 200 | 500 | 2.000 | 1.250 |
| EVOK-15-500 | 100 | 300 | 1.000 | 450 |
| EVOK-TW-100 | 500 | 1.000 | 5.000 | 3.200 |
| EVOK-MR-200 | 300 | 600 | 3.000 | 1.800 |

### Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> `finished_goods_inventory` **não existe** em `erp_evok_audio`. O que existe:
> saldo por depósito em **`product_warehouse_stock`** (`product_id` ×
> `warehouse_id` × `quantity`, com UNIQUE no par e CHECK `quantity >= 0`),
> saldo global em `products.quantity`, reserva em `products.reserved_quantity`
> (cache derivado de `production_order_reservations`) e lote/validade em
> `lot_controls`. O bloco abaixo é rascunho em dialeto MySQL; este ERP roda
> **exclusivamente em PostgreSQL 16**.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- INVENTÁRIO DE PRODUTO ACABADO
CREATE TABLE finished_goods_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    location_code VARCHAR(20),
    batch_number VARCHAR(50),
    manufacturing_date DATE,
    quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    available_quantity INT DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME
);
