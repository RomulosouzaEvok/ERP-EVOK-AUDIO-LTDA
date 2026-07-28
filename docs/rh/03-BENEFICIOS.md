# Beneficios - RH EVOK AUDIO

## Tipos de Beneficios

| Beneficio | Descricao | Desconto Funcionario | Custo Empresa |
|-----------|-----------|---------------------|---------------|
| Vale Transporte (VT) | Deslocamento casa-trabalho | 6% do salario base | Diferenca do valor do transporte |
| Vale Refeicao (VR) | Alimentacao diaria | R$ 50,00/mes | R$ 450,00/mes |
| Vale Alimentacao (VA) | Compras supermercado | R$ 30,00/mes | R$ 200,00/mes |
| Plano de Saude | Assistencia medica | R$ 150,00 (titular) | R$ 300,00 (titular) |
| Plano Odontologico | Assistencia dentaria | R$ 30,00 | R$ 60,00 |
| Seguro de Vida | Cobertura vitalicia | Nao | R$ 15,00/mes |
| Participacao Lucros (PLR) | Distribuicao resultados | Nao | 5% do lucro liquido |
| Auxilio Creche | Para filhos ate 5 anos | Nao | R$ 300,00/mes |
| Convenio Farmacia | Desconto em medicamentos | 30% do valor | 20% do valor |
| Cesta Natalina | Natal | Nao | R$ 200,00 |

## Tabelas SQL

```sql
-- BENEFICIOS CONCEDIDOS
CREATE TABLE employee_benefits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    benefit_type ENUM('vt','vr','va','health_plan','dental_plan','life_insurance',
                      'plr','daycare','pharmacy','christmas_basket') NOT NULL,
    provider VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    employee_discount DECIMAL(10,2) DEFAULT 0,
    company_cost DECIMAL(10,2) DEFAULT 0,
    status ENUM('active','suspended','cancelled') DEFAULT 'active',
    created_at DATETIME,
    updated_at DATETIME
);

-- PLANOS DE SAUDE OFERECIDOS
CREATE TABLE health_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_name VARCHAR(100) NOT NULL,
    operator VARCHAR(100) NOT NULL,
    plan_type ENUM('basic','intermediate','premium'),
    employee_discount DECIMAL(10,2),
    company_cost DECIMAL(10,2),
    coverage_description TEXT,
    active BOOLEAN DEFAULT true
);

INSERT INTO health_plans (plan_name, operator, plan_type, employee_discount, company_cost) VALUES
('Basico Unimed', 'Unimed', 'basic', 150.00, 300.00),
('Intermediario Unimed', 'Unimed', 'intermediate', 250.00, 500.00),
('Premium Unimed', 'Unimed', 'premium', 400.00, 800.00);

-- CONVENIOS / PARCERIAS
CREATE TABLE employee_agreements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    benefit_type ENUM('pharmacy','education','gym','optical','food','clothing'),
    discount_percent DECIMAL(5,2),
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);
```

## Politica de Beneficios EVOK AUDIO

### VT (Vale Transporte)
- Obrigatorio por lei para quem utiliza transporte publico
- Desconto maximo de 6% do salario base
- Empresa custeia o valor excedente

### VR (Vale Refeicao)
- Credito em cartao alelo/sodexo
- Utilizado em restaurantes e supermercados
- Cobertura para dias uteis trabalhados

### Plano de Saude
- Cobertura nacional (internacao, consultas, exames)
- Possibilidade de incluir dependentes (custo maior)
- Carência de 90 dias para procedimentos

### PLR (Participacao nos Lucros)
- Regra clara de calculo baseada em metas
- Distribuicao semestral ou anual
- Isento de encargos trabalhistas
