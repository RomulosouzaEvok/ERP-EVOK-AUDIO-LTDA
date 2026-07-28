# Folha de Pagamento - RH EVOK AUDIO

## Estrutura de Dados

### Cabecalho da Folha (payroll_headers)

```sql
CREATE TABLE payroll_headers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reference_month INT NOT NULL,
    reference_year INT NOT NULL,
    department_id INT,
    status ENUM('calculating','calculated','closed','canceled') DEFAULT 'calculating',
    total_proceeds DECIMAL(15,2) DEFAULT 0,
    total_discounts DECIMAL(15,2) DEFAULT 0,
    total_net_pay DECIMAL(15,2) DEFAULT 0,
    inss_total DECIMAL(15,2) DEFAULT 0,
    irrf_total DECIMAL(15,2) DEFAULT 0,
    fgts_total DECIMAL(15,2) DEFAULT 0,
    closed_date DATE,
    created_at DATETIME,
    updated_at DATETIME
);
```

### Itens da Folha (payroll_items)

```sql
CREATE TABLE payroll_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payroll_header_id INT NOT NULL,
    employee_id INT NOT NULL,
    gross_salary DECIMAL(10,2) NOT NULL,
    base_inss DECIMAL(10,2),
    base_irrf DECIMAL(10,2),
    inss_value DECIMAL(10,2) DEFAULT 0,
    irrf_value DECIMAL(10,2) DEFAULT 0,
    fgts_value DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_value DECIMAL(10,2) DEFAULT 0,
    night_shift_extra DECIMAL(10,2) DEFAULT 0,
    danger_extra DECIMAL(10,2) DEFAULT 0,
    commission DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    transportation_voucher DECIMAL(10,2) DEFAULT 0,
    meal_voucher DECIMAL(10,2) DEFAULT 0,
    health_plan DECIMAL(10,2) DEFAULT 0,
    dental_plan DECIMAL(10,2) DEFAULT 0,
    advance_salary DECIMAL(10,2) DEFAULT 0,
    union_fee DECIMAL(10,2) DEFAULT 0,
    pension_loan DECIMAL(10,2) DEFAULT 0,
    other_discounts DECIMAL(10,2) DEFAULT 0,
    status ENUM('active','canceled') DEFAULT 'active',
    created_at DATETIME
);
```

## Tabela INSS 2024

```sql
CREATE TABLE inss_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    range_order INT NOT NULL,
    min_salary DECIMAL(10,2) NOT NULL,
    max_salary DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    created_at DATETIME
);

INSERT INTO inss_table (year, range_order, min_salary, max_salary, rate) VALUES
(2024, 1, 0.00, 1412.00, 7.50),
(2024, 2, 1412.01, 2666.68, 9.00),
(2024, 3, 2666.69, 4000.03, 12.00),
(2024, 4, 4000.04, 7786.02, 14.00);
```

### Tabela IRRF 2024

```sql
CREATE TABLE irrf_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    range_order INT NOT NULL,
    min_salary DECIMAL(10,2) NOT NULL,
    max_salary DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    deduction DECIMAL(10,2) NOT NULL,
    created_at DATETIME
);

INSERT INTO irrf_table (year, range_order, min_salary, max_salary, rate, deduction) VALUES
(2024, 1, 0.00, 2112.00, 0.00, 0.00),
(2024, 2, 2112.01, 2826.65, 7.50, 158.40),
(2024, 3, 2826.66, 3751.05, 15.00, 370.40),
(2024, 4, 3751.06, 4664.68, 22.50, 651.73),
(2024, 5, 4664.69, 999999.99, 27.50, 884.96);
```

### FGTS

```
Aliquota FGTS: 8% sobre salario base
Mesada adicional: 0,5% (se demissao sem justa causa)

Calculo: FGTS = Salario Bruto x 8%
Deposito ate dia 20 do mes seguinte
```

## Encargos Sociais sobre Folha (Industria)

| Encargo | Aliquota | Base |
|---------|----------|------|
| INSS Patronal | 20% | Folha de pagamento |
| SAT/RAT | 1% a 3% | (risco de acidente) |
| Terceiros (SESI, SENAI, SEBRAE) | 3,3% | Folha |
| FGTS | 8% | Salario |
| Salario Educacao | 2,5% | Folha |
| **Total Encargos** | **~34,8% a 36,8%** | |

### Exemplo Calculo Folha EVOK AUDIO

```
Funcionario: Operador de Injetora
Salario Bruto: R$ 2.200,00
Horas Extras (10h x 50%): R$ 150,00
Adicional Noturno: R$ 80,00
Total Bruto: R$ 2.430,00

--- DESCONTOS ---
INSS (9% - 2a faixa): R$ 218,70
IRRF (isento ate R$ 2.112,00): R$ 0,00
Vale Transporte (6%): R$ 132,00
Total Descontos: R$ 350,70

Liquido: R$ 2.079,30

--- ENCARGOS PATRONAIS ---
INSS Patronal (20%): R$ 486,00
FGTS (8%): R$ 194,40
Terceiros (3,3%): R$ 80,19
SAT/RAT (2%): R$ 48,60
Salario Educacao (2,5%): R$ 60,75
Total Encargos: R$ 869,94

Custo Total para Empresa: R$ 3.299,94
