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
