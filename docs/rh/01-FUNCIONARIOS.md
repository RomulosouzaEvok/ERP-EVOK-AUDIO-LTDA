# Cadastro de Funcionarios - RH EVOK AUDIO

## Estrutura da Tabela employees

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,                          -- FK -> users (se tiver acesso ao sistema)
    department_id INT NOT NULL,                -- FK -> departments.id
    name VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(20),
    pis_pasep VARCHAR(20),
    ctps_numero VARCHAR(15),
    ctps_serie VARCHAR(10),
    ctps_uf VARCHAR(2),
    titulo_eleitor VARCHAR(20),
    reservista VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    address_cep VARCHAR(9),
    address_street VARCHAR(200),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    position VARCHAR(100),
    role VARCHAR(100),
    salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    salary_type ENUM('mensal','horista','comissionado') DEFAULT 'mensal',
    hire_date DATE NOT NULL,
    dismissal_date DATE NULL,
    status ENUM('active','inactive','fired','vacation','license') DEFAULT 'active',
    shift ENUM('morning','afternoon','night','commercial','rotating') DEFAULT 'commercial',
    work_regime ENUM('clt','pj','estagiario','aprendiz') DEFAULT 'clt',
    work_hours_weekly INT DEFAULT 44,
    bank_name VARCHAR(100),
    bank_agency VARCHAR(20),
    bank_account VARCHAR(20),
    bank_account_type ENUM('corrente','poupanca') DEFAULT 'corrente',
    pix_key VARCHAR(100),
    education_level ENUM('fundamental','medio','tecnico','superior','pos','mestrado','doutorado'),
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    notes TEXT,
    photo_url VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);
```

## Tabela employees_documents

```sql
CREATE TABLE employee_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,                  -- FK -> employees.id
    document_type ENUM(
        'rg','cpf','ctps','pis','titulo_eleitor',
        'reservista','carteira_vacinacao','exame_admissional',
        'exame_periodico','exame_demissional','certidao_casamento',
        'certidao_nascimento','comprovante_residencia',
        'foto_3x4','contrato_trabalho','termo_ciencia'
    ) NOT NULL,
    description VARCHAR(255),
    file_path VARCHAR(255),
    expiry_date DATE,                          -- Para exames
    created_at DATETIME
);
```

## Tabela de Cargos

```sql
CREATE TABLE job_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT NOT NULL,                -- FK -> departments.id
    name VARCHAR(100) NOT NULL,                -- Ex: Operador de Injetora
    description TEXT,
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    cbo VARCHAR(10),                            -- Classificacao Brasileira de Ocupacoes
    requirements TEXT,
    active BOOLEAN DEFAULT true,
    created_at DATETIME,
    updated_at DATETIME
);
```

## Fluxo de Cadastro

### 1. Admissao
1. Coletar documentos do candidato
2. Solicitar exame admissional
3. Inserir dados no sistema
4. Gerar contrato de trabalho
5. Enviar eventos S-2200 (eSocial)
6. Cadastrar biometria (ponto)

### 2. Alteracao Contratual
1. Alterar dados (salario, cargo, departamento)
2. Registrar termo aditivo
3. Enviar evento S-2206 (eSocial)

### 3. Demissao
1. Solicitar exame demissional
2. Calcular rescisao
3. Gerar TRCT (Termo de Rescisao)
4. Homologar (sindicato ou MTE)
5. Enviar evento S-2299 (eSocial)
6. Baixar na CTPS

## Campos Especificos para Industria de Auto-Falantes

### Cargos Tipicos na EVOK AUDIO

| Cargo | Departamento | CBO | Faixa Salarial |
|-------|-------------|-----|----------------|
| Operador de Injetora | Producao | 7221-10 | R$ 1.800 - 2.500 |
| Montador de Auto-falante | Producao | 7313-15 | R$ 1.700 - 2.200 |
| Tecnico em Som | Engenharia | 3712-05 | R$ 3.500 - 5.000 |
| Inspetor de Qualidade | Qualidade | 3911-05 | R$ 2.200 - 3.000 |
| Almoxarife | Almoxarifado | 4141-15 | R$ 1.800 - 2.500 |
| Vendedor Tecnico | Vendas | 3541-25 | R$ 2.500 + comissao |

### Exames Admissionais (NR-7 / PCMSO)

| Exame | Periodo |
|-------|---------|
| Admissional | Antes de iniciar |
| Periodico | Anual |
| Mudanca de funcao | Na promocao |
| Retorno ao trabalho | Apos 30 dias afastamento |
| Demissional | Ate 15 dias do aviso |
