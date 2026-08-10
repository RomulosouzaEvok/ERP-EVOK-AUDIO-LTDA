# Módulo Logística - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/logistica/
├── 00-README.md              <- Visão geral do módulo Logística
├── 01-EXPEDICAO.md           <- Expedição, carregamento, transporte
└── 02-ESTOQUE_PA.md          <- Estoque de produto acabado
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 11 | Expedição / Logística | EXP | Supervisor de Logística |

## Estrutura do Departamento

| Cargo | Qtd | Função |
|-------|-----|--------|
| Supervisor de Logística | 1 | Gestão de expedição e estoque PA |
| Assistente de Expedição | 2 | Separação, embalagem, carregamento |
| Motorista | 2 | Entregas locais/regionais |
| Auxiliar de Logística | 3 | Paletização, organização |

## Funções

| Função | Descrição |
|--------|-----------|
| Planejamento de Carga | Roteirização, consolidação de pedidos |
| Separação | Picking dos produtos para embarque |
| Embalagem | Caixa master, paletização, lacre |
| Carregamento | Conferência de carga, romaneio |
| Transporte | Frota própria ou terceiros |
| Rastreio | Acompanhamento de entregas |
| Devolução | Logística reversa, produtos com defeito |

## Frota EVOK ÁUDIO

| Veículo | Tipo | Capacidade | Rotas |
|---------|------|------------|-------|
| Fiorino 2022 | Utilitário | 500 kg | Entregas locais (SP capital) |
| Sprinter | Furgão | 1.500 kg | Entregas regionais (SP) |
| VUC Ford | Caminhão | 3.000 kg | Entregas SP + RJ |
| Toco Mercedes | Caminhão | 5.000 kg | Entregas para outros estados |

## Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> `shipping_orders` **não existe** em `erp_evok_audio`. A expedição hoje é
> derivada de `sales` (status `shipped`) e de `inventory_movements`
> (`reference_type='sale'`), sem tabela própria de ordem de expedição. O bloco
> abaixo é rascunho em dialeto MySQL; este ERP roda **exclusivamente em
> PostgreSQL 16**.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- NOTA FISCAL DE REMESSA / FATURAMENTO
CREATE TABLE shipping_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_order_id INT,
    shipping_date DATE NOT NULL,
    carrier VARCHAR(100),
    vehicle_plate VARCHAR(10),
    driver_name VARCHAR(100),
    driver_cpf VARCHAR(14),
    romaneio_number VARCHAR(50),
    volume_quantity INT,
    total_weight DECIMAL(10,3),
    route VARCHAR(200),
    status ENUM('pending','separating','loaded','shipped','delivered','cancelled'),
    delivery_date DATE,
    recipient_name VARCHAR(200),
    signed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

---

**Última atualização:** 2026-08-06
