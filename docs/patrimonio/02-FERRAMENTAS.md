# Ferramentas - Patrimonio EVOK AUDIO

## Ferramentaria de Moldes

| Ferramenta | Funcao | Custo | Calibracao |
|------------|--------|-------|------------|
| Molde Cone 12" | Injecao de cone | R$ 30.000 | Anual |
| Molde Cone 15" | Injecao de cone | R$ 35.000 | Anual |
| Molde Surround 12" | Injecao borda | R$ 20.000 | Anual |
| Molde Spider | Prensa centrador | R$ 15.000 | Anual |
| Gabarito Centralizacao | Gap | R$ 5.000 | Mensal |

## Ferramentas de Medicao

| Ferramenta | Qtd | Funcao | Custo Unit. | Calibracao |
|------------|-----|--------|-------------|------------|
| Paquimetro Digital | 10 | Dimensoes | R$ 800 | Semestral |
| Micrometro Externo | 5 | Precisao | R$ 1.500 | Semestral |
| Relogio Comparador | 3 | Centralizacao | R$ 2.000 | Semestral |
| Multimetro Digital | 5 | Testes eletricos | R$ 500 | Anual |
| Osciloscopio | 2 | Analise sinal | R$ 5.000 | Anual |
| Medidor LCR | 2 | Bobina/indutor | R$ 3.000 | Anual |
| Balanca Digital | 3 | Peso | R$ 1.000 | Anual |

## Ferramentas Manuais (Estoque Minimo)

| Ferramenta | Qtd Minima | Local |
|------------|------------|-------|
| Chave Allen Kit | 20 | Producao |
| Chave de Fenda | 30 | Producao |
| Alicate Universal | 25 | Producao |
| Alicate de Corte | 20 | Producao |
| Torquimetro | 5 | Qualidade |
| Martelo de Borracha | 10 | Montagem |
| Pistola de Cola Quente | 15 | Montagem |
| Estilete | 30 | Producao |

## Tabelas SQL

```sql
CREATE TABLE tools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tool_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('manual','cutting','measurement','mold','gauge','welding','assembly','electrical'),
    department_id INT,
    brand VARCHAR(100),
    model VARCHAR(100),
    location VARCHAR(100),
    quantity INT DEFAULT 1,
    min_quantity INT DEFAULT 1,
    purchase_value DECIMAL(10,2),
    last_calibration_date DATE,
    next_calibration_date DATE,
    status ENUM('available','in_use','maintenance','lost','deactivated') DEFAULT 'available',
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE tool_loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tool_id INT NOT NULL,
    employee_id INT NOT NULL,
    loan_date DATETIME NOT NULL,
    expected_return_date DATE,
    return_date DATETIME,
    quantity INT DEFAULT 1,
    status ENUM('loaned','returned','overdue','lost') DEFAULT 'loaned',
    created_at DATETIME,
    updated_at DATETIME
);
