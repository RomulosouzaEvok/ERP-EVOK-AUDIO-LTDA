# Ativos Fixos - Patrimonio EVOK AUDIO

## Estrutura de Dados

### Tabela principal assets

```sql
CREATE TABLE assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    asset_type ENUM('machine','equipment','furniture','vehicle','tool','computer','other'),
    category_id INT,
    department_id INT,
    location VARCHAR(100),
    responsible_id INT,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    supplier_id INT,
    manufacturer VARCHAR(100),
    acquisition_type ENUM('purchase','lease','donation','transfer'),
    purchase_date DATE,
    installation_date DATE,
    start_operation_date DATE,
    purchase_value DECIMAL(15,2),
    current_value DECIMAL(15,2),
    residual_value DECIMAL(15,2) DEFAULT 0,
    useful_life_months INT,
    depreciation_method ENUM('linear','accelerated','none') DEFAULT 'linear',
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    warranty_end DATE,
    next_maintenance_date DATE,
    insurance_policy VARCHAR(100),
    insurance_value DECIMAL(15,2),
    status ENUM('active','maintenance','loaned','deactivated','sold','lost'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

### Categorias de Ativos

```sql
CREATE TABLE asset_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    useful_life_months INT,
    depreciation_rate DECIMAL(5,2),
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);

INSERT INTO asset_categories (name, description, useful_life_months, depreciation_rate) VALUES
('Maquinas de Producao', 'Injetoras, prensas, bobinadeiras', 120, 10.00),
('Equipamentos', 'Compressores, sistemas de ar', 120, 10.00),
('Moveis e Utensilios', 'Mesas, cadeiras, armarios', 120, 10.00),
('Computadores', 'Desktops, notebooks', 60, 20.00),
('Veiculos', 'Utilitarios, caminhoes', 60, 20.00),
('Ferramentas', 'Ferramentas manuais, moldes', 60, 20.00),
('Instalacoes', 'Sistemas prediais, eletrica', 240, 5.00);
```

### Movimentacoes de Ativos

```sql
CREATE TABLE asset_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    movement_date DATETIME NOT NULL,
    type ENUM('transfer','loan','return','maintenance_departure','maintenance_return'),
    from_department_id INT,
    to_department_id INT,
    from_employee_id INT,
    to_employee_id INT,
    reason TEXT,
    authorized_by INT,
    status ENUM('pending','approved','completed') DEFAULT 'pending',
    created_at DATETIME,
    updated_at DATETIME
);
```

### Inventario Fisico

```sql
CREATE TABLE asset_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    inventory_date DATE NOT NULL,
    counted_quantity INT DEFAULT 1,
    found BOOLEAN DEFAULT true,
    location_verified VARCHAR(100),
    condition ENUM('excellent','good','fair','poor','damaged') DEFAULT 'good',
    verified_by INT,
    notes TEXT,
    created_at DATETIME
);
```

## Codificacao de Ativos

```
Formato: [TIPO]-[DEPARTAMENTO]-[NUMERO]

Exemplos:
MAQ-PROD-001   (Injetora de Cone #1)
MAQ-PROD-010   (Esteira Montagem #1)
EQP-QUAL-001   (Camera Acustica)
VEI-EXP-001    (Caminhao Baú)
FER-SUP-001    (Molde Cone 12")
COM-ADM-010    (Notebook Diretoria)
MUV-GER-015    (Mesa Escritorio)
```

## Inventario EVOK AUDIO (Estimativa)

| Codigo | Ativo | Depto | Valor | Vida Util |
|--------|-------|-------|-------|-----------|
| MAQ-PROD-001 | Injetora Cone 12" PROD | Producao | R$ 180.000 | 10 anos |
| MAQ-PROD-002 | Injetora Cone 15" PROD | Producao | R$ 200.000 | 10 anos |
| MAQ-PROD-003 | Bobinadeira Auto VC-01 | Producao | R$ 55.000 | 5 anos |
| MAQ-PROD-004 | Prensa Surround 12" | Producao | R$ 65.000 | 10 anos |
| MAQ-PROD-005 | Centralizadora GAP | Producao | R$ 85.000 | 10 anos |
| MAQ-PROD-006 | Magnetizadora | Producao | R$ 150.000 | 10 anos |
| MAQ-PROD-007 | Solda Ultrassonica | Producao | R$ 35.000 | 5 anos |
| MAQ-PROD-008 | Teste Acustico | Qualidade | R$ 250.000 | 10 anos |
| MAQ-PROD-009 | Prensa Hidraulica | Producao | R$ 70.000 | 10 anos |
| MAQ-PROD-010 | Esteira Montagem | Producao | R$ 120.000 | 10 anos |
| EQP-GER-001 | Compressor Ar 100L | Manutencao | R$ 25.000 | 10 anos |
| EQP-GER-002 | Empilhadeira Eletrica | Almox | R$ 90.000 | 5 anos |
| VEI-EXP-001 | Fiorino 2022 | Expedicao | R$ 80.000 | 5 anos |
| COM-GER-020 | 10x Computadores Adm | Geral | R$ 50.000 | 5 anos |
| FER-PROD-001 | Molde Cone 12" | Producao | R$ 30.000 | 5 anos |
| FER-PROD-005 | Gabarito Montagem | Producao | R$ 8.000 | 5 anos |

### Valor Total Estimado: ~R$ 1.500.000,00
