# Planejamento e Controle da Produção (PCP)

## Departamento de PCP

### Estrutura do Departamento

| Cargo | Função |
|-------|--------|
| Supervisor de PCP | Coordenar planejamento, MPS, MRP |
| Analista de PCP Sr. | Programação mestre, capacidade |
| Programador de Produção | Sequenciamento diário, OPs |
| Analista de MRP | Necessidade de materiais |
| Analista de Capacidade | Carga máquina, gargalos |
| Apontador | Coleta de dados de chão de fábrica |

### Funções do PCP

| Função | Descrição |
|--------|-----------|
| Planejamento Mestre (MPS) | O que produzir, quando, quanto |
| MRP (Material Requirements Planning) | Calcular necessidades de materiais |
| CRP (Capacity Requirements Planning) | Verificar capacidade produtiva |
| Liberação de OPs | Emitir e liberar ordens de produção |
| Sequenciamento | Ordem de produção diária |
| Apontamento | Coletar dados de produção real |

### Fluxo do PCP na EVOK ÁUDIO

```
Previsão de Vendas / Pedidos Firmes
            │
            ▼
    MPS - Programa Mestre
    ├── Produto: Auto-falante 12"
    ├── Semana 1: 500 un
    ├── Semana 2: 800 un
    └── Semana 3: 600 un
            │
            ▼
    MRP - Necessidade de Materiais
    ├── Cones: 1.900 un
    ├── Bobinas: 1.900 un
    ├── Imãs: 1.900 un
    ├── Baskets: 1.900 un
    └── Cola Epóxi: 9,5 kg
            │
            ▼
    CRP - Capacidade
    ├── Injetora 1: 80% ocupada
    ├── Bobinadeira: 95% ocupada (GARGALO)
    └── Montagem: 70% ocupada
            │
            ▼
    Emissão de OPs
    ├── OP-2024-0100: 500 un (semana 1)
    ├── OP-2024-0101: 300 un (semana 1)
    └── OP-2024-0102: 500 un (semana 2)
            │
            ▼
    Sequenciamento Diário
    ├── Máquina 1 (Injetora): Troca molde às 8h
    ├── Máquina 2 (Bobinadeira): Manutenção 10h-11h
    └── Linha Montagem: 100 un/hora
            │
            ▼
    Apontamento (Chão de Fábrica)
    ├── Produzido: 480 un
    ├── Refugo: 12 un (2,5%)
    └── Paradas: 45 min
```

### Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL**
> (`AUTO_INCREMENT`, `DATETIME`, `ENUM(...)` inline) — este ERP roda
> **exclusivamente em PostgreSQL 16**. Ele **não** descreve o banco real.
> Confronto contra `erp_evok_audio` nesta data:
>
> - `production_programs` e `material_requirements` **não existem**. O
>   planejamento de materiais é feito por `mrp_ordens_planejadas` (MRP) +
>   `purchase_requisitions`;
> - `work_centers` **existe**, mas com outras colunas. As reais são `code`,
>   `name`, `description`, `machines_count`, `capacity_hours_per_day`,
>   `efficiency_factor NUMERIC(5,4)`, `cost_per_hour NUMERIC(18,6)`,
>   `active BOOLEAN`. **Não existem** `department_id`, `machine_id`,
>   `capacity_per_hour`, `setup_time_min`, `labor_count`, nem
>   `status ENUM('active','inactive','maintenance')`. A jornada do centro
>   fica em `work_center_shifts` (weekday + `start_time`/`end_time`), tabela
>   que este documento não menciona.
>
> Fonte da verdade do schema: `docs/database/04-DICIONARIO_DADOS.md` e
> `docs/database/02-MODELO_LOGICO.md`. Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- PROGRAMA MESTRE DE PRODUÇÃO (MPS)
CREATE TABLE production_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    week_year INT NOT NULL,           -- Ex: 2024-35 (semana 35 de 2024)
    planned_quantity INT NOT NULL,
    confirmed_quantity INT DEFAULT 0,
    produced_quantity INT DEFAULT 0,
    status ENUM('planned','confirmed','in_progress','completed','canceled'),
    sales_order_id INT,
    created_by INT,
    created_at DATETIME,
    updated_at DATETIME
);

-- NECESSIDADE DE MATERIAIS (MRP)
CREATE TABLE material_requirements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    component_id INT NOT NULL,
    week_year INT NOT NULL,
    gross_requirement DECIMAL(10,2) NOT NULL,  -- Necessidade bruta
    stock_available DECIMAL(10,2) DEFAULT 0,   -- Estoque disponível
    scheduled_receipts DECIMAL(10,2) DEFAULT 0, -- Recebimentos previstos
    net_requirement DECIMAL(10,2) DEFAULT 0,    -- Necessidade líquida
    planned_order_qty DECIMAL(10,2) DEFAULT 0,  -- Ordem de compra sugerida
    created_at DATETIME
);

-- CENTROS DE TRABALHO
CREATE TABLE work_centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department_id INT,
    machine_id INT,                   -- FK -> assets (se for máquina)
    capacity_per_hour DECIMAL(10,2),  -- Capacidade nominal
    efficiency DECIMAL(5,2) DEFAULT 0.85, -- Eficiência real
    available_hours DECIMAL(10,2),    -- Horas disponíveis/dia
    setup_time_min INT,               -- Tempo de setup (min)
    labor_count INT DEFAULT 1,        -- Nº de operadores
    cost_per_hour DECIMAL(10,2),      -- Custo horário (R$)
    status ENUM('active','inactive','maintenance'),
    created_at DATETIME,
    updated_at DATETIME
);
```

### Indicadores de PCP

| Indicador | Fórmula | Meta |
|-----------|---------|------|
| Acurácia do MPS | (Produzido / Programado) x 100 | > 95% |
| Nível de Atendimento | (OPs no prazo / Total OPs) x 100 | > 90% |
| Lead Time | Data fim - Data início (médio) | < 5 dias |
| Giro de Estoque | Custo MP consumida / Estoque médio | > 8x ano |
| Taxa de Paradas | (Min parada / Min disponíveis) x 100 | < 5% |
| Acurácia MRP | Compras certas / Total compras x 100 | > 85% |
