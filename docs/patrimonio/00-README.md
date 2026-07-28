# Modulo de Patrimonio e Ativos - ERP EVOK AUDIO

## Visao Geral

Gerenciamento completo de ativos, maquinas, equipamentos, ferramentas, moveis e utensilios da EVOK AUDIO.

## Estrutura dos Documentos

```
docs/patrimonio/
├── 00-README.md                <- Visao geral
├── 01-ATIVOS_FIXOS.md          <- Maquinas, equipamentos, moveis
├── 02-FERRAMENTAS.md           <- Ferramentas manuais e de corte
├── 03-MANUTENCAO.md            <- Manutencao corretiva e preventiva
├── 04-ALMOXARIFADO_INSUMOS.md  <- Insumos, EPIs, material de consumo
└── 05-DEPRECIACAO.md           <- Calculo de depreciacao fiscal
```

## Tipo de Ativos na EVOK AUDIO

### Grupo 1 - Maquinas de Producao
| Ativo | Quantidade Estimada | Valor Unitario |
|-------|---------------------|----------------|
| Injetora de Cone (plastico/papel) | 5-10 | R$ 50.000 - 200.000 |
| Prensa de Surround | 3-5 | R$ 30.000 - 80.000 |
| Bobinadeira (Voice Coil) | 5-10 | R$ 20.000 - 60.000 |
| Maquina de Colagem (Spider) | 3-5 | R$ 25.000 - 70.000 |
| centralizadora (Gap) | 3-5 | R$ 40.000 - 100.000 |
| Magnetizadora | 2-3 | R$ 80.000 - 200.000 |
| Prensa Hidraulica (basket) | 2-4 | R$ 30.000 - 90.000 |
| Solda Ultrassonica | 3-5 | R$ 15.000 - 40.000 |
| Esteira de Montagem | 2-4 | R$ 50.000 - 150.000 |
| Teste Acustico (Camera acustica) | 1-2 | R$ 100.000 - 300.000 |

### Grupo 2 - Equipamentos de Apoio
- Compressores de ar
- Sistema de exaustao
- Climatizacao (salas limpas)
- Empilhadeiras (1-2)
- Paleteiras
- Balancas e medidores

### Grupo 3 - Moveis e Utensilios
- Mesas, cadeiras, armarios
- Bancadas de trabalho
- Computadores e notebooks
- Impressoras, scanners
- Telefones, centrais

### Grupo 4 - Ferramentas
- Chaves, alicates, parafusos (ferramentaria)
- Moldes de injecao
- Gabaritos de montagem
- Paquimetros, micrometros
- Multimetros, osciloscopios

### Grupo 5 - Veiculos
- Veiculos leves (vendas/entregas)
- Caminhoes (logistica)
- Empilhadeiras

## Tabelas do Sistema

```sql
-- ATIVOS FIXOS (maquinas, equipamentos, moveis, veiculos)
CREATE TABLE assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_code VARCHAR(50) UNIQUE NOT NULL,   -- PAT-001, MAQ-010
    name VARCHAR(200) NOT NULL,
    description TEXT,
    asset_type ENUM('machine','equipment','furniture','vehicle','tool','computer','other'),
    department_id INT,                        -- FK -> departments
    location VARCHAR(100),                    -- Setor, sala, linha
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    supplier_id INT,
    purchase_date DATE,
    purchase_value DECIMAL(15,2),
    current_value DECIMAL(15,2),
    residual_value DECIMAL(15,2) DEFAULT 0,  -- Valor residual
    useful_life_months INT,                   -- Vida util (meses)
    depreciation_method ENUM('linear','accelerated','none') DEFAULT 'linear',
    warranty_end DATE,
    status ENUM('active','maintenance','loaned','deactivated','sold'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

