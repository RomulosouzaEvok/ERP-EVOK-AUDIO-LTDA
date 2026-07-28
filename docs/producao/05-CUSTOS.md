# Custos Industriais - EVOK ÁUDIO

## Departamento de Controladoria / Custos

### Classificação de Custos

| Tipo | Descrição | Exemplo na EVOK |
|------|-----------|-----------------|
| **MP** (Matéria-Prima) | Material direto que compõe o produto | Cone, bobina, imã, basket |
| **MOD** (Mão de Obra Direta) | Salário + encargos dos operadores | Operador de injetora, montador |
| **CIF** (Custo Indireto de Fabricação) | Gastos indiretos da produção | Energia, manutenção, aluguel, supervisão |

### Estrutura de Custo de um Auto-Falante 12" 300W

```
                    CUSTO UNITÁRIO - EVOK 12" 300W
                    ┌──────────────────────────────────┐
                    │    1. MATÉRIA-PRIMA (MP)         │
                    │  Cone 12" (polipropileno)  R$ 8,50│
                    │  Surround borracha        R$ 3,20│
                    │  Spider                   R$ 2,80│
                    │  Voice Coil (bobinada)    R$ 6,50│
                    │  Imã de Ferrite           R$ 5,80│
                    │  Placa superior           R$ 2,50│
                    │  Placa inferior           R$ 2,30│
                    │  Basket (aço)             R$ 4,50│
                    │  Terminal + bornes        R$ 1,20│
                    │  Colas e insumos          R$ 2,50│
                    │  Embalagem                R$ 3,00│
                    │  Total MP:              R$ 42,80│
                    ├──────────────────────────────────┤
                    │    2. MÃO DE OBRA DIRETA (MOD)   │
                    │  Injeção (0,63 min)      R$ 0,52│
                    │  Prensagem (0,42 min)    R$ 0,35│
                    │  Bobinagem (0,32 min)    R$ 0,45│
                    │  Colagem (0,82 min)      R$ 0,68│
                    │  Centralização (0,72)    R$ 0,55│
                    │  Montagem (1,25 min)     R$ 1,05│
                    │  Solda (0,42 min)        R$ 0,35│
                    │  Testes (1,54 min)       R$ 1,68│
                    │  Embalagem (0,52 min)    R$ 0,40│
                    │  Total MOD:             R$ 6,03│
                    ├──────────────────────────────────┤
                    │    3. CUSTOS INDIRETOS (CIF)     │
                    │  Energia elétrica        R$ 1,50│
                    │  Manutenção máquinas     R$ 0,80│
                    │  Depreciação máquinas    R$ 0,60│
                    │  Aluguel / rateio        R$ 1,20│
                    │  Supervisão / rateio     R$ 0,90│
                    │  Total CIF:             R$ 5,00│
                    ├──────────────────────────────────┤
                    │    CUSTO FABRIL TOTAL  R$ 53,83  │
                    │    Margem (40%)        R$ 21,53  │
                    │    (=) PREÇO VENDA    R$ 75,36   │
                    └──────────────────────────────────┘
```

### Centros de Custo

| Código | Centro de Custo | Departamento | Rateio |
|--------|----------------|-------------|--------|
| CC-01 | Injeção e Moldagem | PROD | Horas máquina |
| CC-02 | Bobinagem | PROD | Horas máquina |
| CC-03 | Colagem Mecânica | PROD | MOD |
| CC-04 | Montagem Final | PROD | MOD |
| CC-05 | Testes e Qualidade | QUAL | Unidades testadas |
| CC-06 | Engenharia do Produto | ENG | Rateio geral |
| CC-07 | PCP | PCP | Rateio geral |
| CC-08 | Almoxarifado | ALM | Rateio MP |
| CC-09 | Manutenção | MANUT | Horas máquina |
| CC-10 | Administração | DIR | Rateio geral |
| CC-11 | Vendas e Marketing | VEND | % sobre vendas |
| CC-12 | Expedição | EXP | Unidades expedidas |

### Tabelas SQL

```sql
-- CENTROS DE CUSTO
CREATE TABLE cost_centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id INT,
    allocation_method ENUM('machine_hours','labor_hours','units','percentage','general'),
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);

-- CUSTO PADRÃO DO PRODUTO
CREATE TABLE product_standard_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    version INT DEFAULT 1,
    effective_date DATE NOT NULL,
    material_cost DECIMAL(15,2) DEFAULT 0,
    labor_cost DECIMAL(15,2) DEFAULT 0,
    overhead_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    profit_margin_percent DECIMAL(5,2) DEFAULT 40.00,
    selling_price DECIMAL(15,2),
    created_by INT,
    created_at DATETIME,
    updated_at DATETIME
);

-- CUSTO REAL vs PADRÃO (análise de variação)
CREATE TABLE cost_variations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    production_record_id INT NOT NULL,
    product_id INT NOT NULL,
    standard_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    variation DECIMAL(15,2),
    variation_percent DECIMAL(5,2),
    reason VARCHAR(255),
    created_at DATETIME
);
```

### Apuração de Custos Mensal

```
Custo MP Consumida = Estoque Inicial + Compras - Estoque Final
Custo MOD         = Salários + Encargos (rateados por horas apontadas)
CIF Real          = Total gastos indiretos rateados

Custo Fabril Total  = MP + MOD + CIF
Custo Unitário      = Custo Fabril Total / Quantidade Produzida
```

### Indicadores de Custo

| Indicador | Fórmula | Benchmark |
|-----------|---------|-----------|
| % MP sobre custo | MP / Custo Total | 70-75% |
| % MOD sobre custo | MOD / Custo Total | 10-15% |
| % CIF sobre custo | CIF / Custo Total | 10-15% |
| Margem Bruta | (Preço - Custo) / Preço | > 35% |
| Ponto de Equilíbrio | Custo Fixo / Margem Contribuição | - |
| Mark-up | Preço / Custo Total | 1,4x - 1,6x |
