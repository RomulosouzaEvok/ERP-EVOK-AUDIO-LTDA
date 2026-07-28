# Roteiros de Fabricação - EVOK ÁUDIO

## O que é um Roteiro de Fabricação?

Documento que descreve **passo a passo** como fabricar um auto-falante, incluindo:
- Sequência de operações
- Máquinas utilizadas
- Tempos (setup + ciclo)
- Insumos e componentes
- Parâmetros de processo
- Controles de qualidade

## Roteiro Padrão: Auto-falante 12" 300W

| OP | Operação | Departamento | Máquina | Setup (min) | Ciclo (min) | Qtd Oper. |
|----|----------|-------------|---------|-------------|-------------|-----------|
| 10 | Injetar Cone 12" | PROD | Injetora Hidráulica 80t | 30 | 0,6 | 1 |
| 20 | Prensar Surround 12" | PROD | Prensa Surround Pneumática | 15 | 0,4 | 1 |
| 30 | Prensar Spider 12" | PROD | Prensa Spider | 10 | 0,5 | 1 |
| 40 | Bobinar Voice Coil 12" | PROD | Bobinadeira Automática | 20 | 0,3 | 1 |
| 50 | Colar Cone + VC + Spider | PROD | Mesa Colagem Manual | 5 | 0,8 | 1 |
| 60 | Centralizar Gap | PROD | Centralizadora | 10 | 0,7 | 1 |
| 70 | Montar Conjunto Magnético | PROD | Mesa Montagem | 10 | 0,5 | 1 |
| 80 | Magnetizar | PROD | Magnetizadora Pulsada | 5 | 0,3 | 1 |
| 90 | Montagem Final (MC+CM+Basket) | PROD | Esteira Montagem | 5 | 1,2 | 3 |
| 100 | Soldar Terminais | PROD | Solda Ultrassônica | 5 | 0,4 | 1 |
| 110 | Teste Elétrico | QUAL | LMS / Medidor Impedância | 5 | 0,5 | 1 |
| 120 | Teste Acústico | QUAL | Câmara Acústica | 5 | 1,0 | 1 |
| 130 | Inspeção Visual | QUAL | Banca Inspeção | 0 | 0,3 | 1 |
| 140 | Embalar | EXP | Mesa Embalagem | 5 | 0,5 | 2 |
| 150 | Paletizar | EXP | Paletizadora Manual | 10 | 1,5 | 1 |

## Roteiro Específico por Modelo

### Modelo: EVOK-12-300

| OP | Descrição | Tempo Total (min) | Custo Oper. (R$) |
|----|-----------|-------------------|------------------|
| 10 | Injetar Cone | 0,63 | 0,52 |
| 20 | Prensar Surround | 0,42 | 0,35 |
| 30 | Prensar Spider | 0,52 | 0,38 |
| 40 | Bobinar VC | 0,32 | 0,45 |
| 50 | Colagem | 0,82 | 0,68 |
| 60 | Centralizar | 0,72 | 0,55 |
| 70 | Montagem Magnética | 0,52 | 0,42 |
| 80 | Magnetizar | 0,32 | 0,30 |
| 90 | Montagem Final | 1,25 | 1,05 |
| 100 | Soldar | 0,42 | 0,35 |
| 110 | Teste Elétrico | 0,52 | 0,48 |
| 120 | Teste Acústico | 1,02 | 1,20 |
| 130 | Inspeção Visual | 0,30 | 0,25 |
| 140 | Embalar | 0,52 | 0,40 |
| 150 | Paletizar | 1,52 | 0,38 |
| **Total** | | **9,80 min** | **R$ 7,76** |

### Modelo: EVOK-15-500

| OP | Tempo Total (min) | Custo Oper. (R$) |
|----|-------------------|------------------|
| 10-150 | (similar, com tempos maiores) | |
| **Total** | **14,20 min** | **R$ 11,50** |

## Parâmetros de Processo por Operação

### Injeção de Cone

| Parâmetro | Cone Papel | Cone Polipropileno |
|-----------|------------|-------------------|
| Temperatura zona 1 | 180°C | 220°C |
| Temperatura zona 2 | 185°C | 225°C |
| Temperatura zona 3 | 190°C | 230°C |
| Pressão de injeção | 80 bar | 100 bar |
| Pressão de recalque | 50 bar | 65 bar |
| Tempo de injeção | 3s | 4s |
| Tempo de resfriamento | 25s | 30s |
| Temperatura do molde | 60°C | 70°C |

### Bobinagem (Voice Coil)

| Parâmetro | Valor |
|-----------|-------|
| Tensão do fio | 30 gf |
| Velocidade de bobinagem | 400 rpm |
| Camadas | 2 |
| Espessura do former | 0,2 mm |
| Temperatura cura cola | 150°C |
| Tempo de cura | 60 min |

### Colagem

| Parâmetro | Cone-VC | Spider-Cone | Magnético |
|-----------|---------|-------------|-----------|
| Tipo de cola | Epóxi | Cianoacrilato | Epóxi |
| Gramatura | 3g | 1g | 5g |
| Temperatura de aplicação | 25°C | 25°C | 30°C |
| Tempo de cura | 24h | 2h | 24h |
| Força de aperto | 2 kgf | 1 kgf | 5 kgf |

## Tabelas SQL

```sql
-- ROTEIROS DETALHADOS (expansão do manufacturing_routes)
ALTER TABLE manufacturing_routes ADD COLUMN (
    setup_time INT DEFAULT 0,           -- minutos
    cycle_time INT DEFAULT 0,           -- minutos
    labor_time INT DEFAULT 0,           -- minutos de mão de obra
    labor_count INT DEFAULT 1,          -- quantidade de operadores
    machine_code VARCHAR(50),
    tool_code VARCHAR(50),              -- molde/gabarito
    parameters JSON,                    -- parâmetros de processo
    quality_check VARCHAR(255),         -- controle de qualidade na operação
    consumables TEXT                    -- insumos consumidos (cola, etc)
);

-- PARÂMETROS DE PROCESSO POR PRODUTO E OPERAÇÃO
CREATE TABLE process_parameters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    parameter_value VARCHAR(100),
    min_value VARCHAR(50),
    max_value VARCHAR(50),
    unit VARCHAR(20),
    created_at DATETIME,
    updated_at DATETIME
);

-- INSUMOS POR OPERAÇÃO
CREATE TABLE operation_consumables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    almox_item_id INT NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,        -- quantidade por unidade
    unit VARCHAR(10),
    created_at DATETIME
);
```

## Matriz de Qualificação de Operadores

| Operador | Injetora | Bobinadeira | Colagem | Montagem | Solda | Testes |
|----------|----------|-------------|---------|----------|-------|--------|
| João S. | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Maria C. | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pedro A. | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ana L. | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
