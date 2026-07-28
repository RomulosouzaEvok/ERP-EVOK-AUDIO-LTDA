# Almoxarifado e Insumos - ERP EVOK AUDIO

## Diferenca entre Produto (Estoque) e Insumo (Almoxarifado)

| Tipo | Exemplo | Entra no BOM? | Tabela |
|------|---------|---------------|--------|
| Materia-prima | Bobina cobre, cone, ima | Sim | products |
| Componente | Basket, terminal | Sim | products |
| Embalagem | Caixa master, sacola | Sim | products |
| Insumo producao | Cola, verniz, solvente | Consumo rateado | almox_items |
| EPI | Luva, oculos, protetor | Nao | almox_items |
| Material escritorio | Papel, caneta | Nao | almox_items |
| Peca reposicao | Correia, rolamento | Nao | almox_items |
| Ferramenta consumo | Broca, rebolo | Nao | almox_items |

## Tabelas

```sql
-- INSUMOS / MATERIAIS DE CONSUMO
CREATE TABLE almox_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('epi','cleaning','office','consumable','part','lubricant','chemical','packaging'),
    department_id INT,
    unit VARCHAR(10) NOT NULL,                 -- un, pc, kg, lt, m
    quantity DECIMAL(10,2) DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0,
    cost_price DECIMAL(10,2) DEFAULT 0,
    supplier_id INT,
    location VARCHAR(50),                       -- Endereco no almoxarifado
    status ENUM('active','inactive') DEFAULT 'active',
    created_at DATETIME,
    updated_at DATETIME
);

-- MOVIMENTACAO DE INSUMOS
CREATE TABLE almox_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    type ENUM('in','out','adjustment') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    department_id INT,
    employee_id INT,
    production_order_id INT,
    maintenance_order_id INT,
    reason VARCHAR(255),
    created_at DATETIME
);
```

## Insumos Tipicos EVOK AUDIO

### Insumos de Producao (consumo por unidade produzida)

| Insumo | Aplicacao | Consumo Est. | Unidade |
|--------|-----------|---------------|---------|
| Cola Epoxi (resina + endurecedor) | Colagem cone/bobina | 5g/un | kg |
| Cola Cianoacrilato | Spider/basket | 2g/un | kg |
| Verniz Isolante | Bobina voz | 3ml/un | lt |
| Solda Estanho 60/40 | Terminais | 1g/un | kg |
| Fluxo para Solda | Soldagem | 0.5ml/un | lt |
| Acetona | Limpeza moldes | 50ml/dia | lt |
| Desmoldante | Injecao cone | 2ml/un | lt |
| Thinner | Diluicao tinta | 100ml/dia | lt |
| Tinta Preta Acrilica | Acabamento | 10ml/un | lt |

### EPIs - Estoque Minimo

| EPI | Qtd Mensal | Custo Unit. |
|-----|------------|-------------|
| Luva de Látex (cx c/100) | 5 cx | R$ 25,00 |
| Luva de Raspa (par) | 20 pares | R$ 15,00 |
| Oculos de Seguranca | 30 un | R$ 8,00 |
| Protetor Auricular | 50 pares | R$ 4,00 |
| Mascara Descartavel | 200 un | R$ 1,50 |
| Avental de Raspa | 10 un | R$ 35,00 |
| Sapato de Seguranca | 5 pares | R$ 80,00 |

### Material de Escritorio

| Item | Consumo Mensal | Unidade |
|-----|----------------|---------|
| Papel A4 | 10 | resma |
| Caneta | 50 | un |
| Toner Impressora | 2 | un |
| Grampeador | 2 | un |
| Pasta Arquivo | 30 | un |

### Pecas de Reposicao Comuns

| Peca | Equipamento | Custo |
|------|-------------|-------|
| Correia Injetora | Injetora Cone | R$ 250 |
| Resistencia 220V | Injetora Cone | R$ 120 |
| Bucha Guia Fio | Bobinadeira | R$ 45 |
| Filtro Ar Compressor | Compressor | R$ 80 |
| Filtro Oleo | Compressor | R$ 60 |
| Correia Esteira | Transporte | R$ 300 |
