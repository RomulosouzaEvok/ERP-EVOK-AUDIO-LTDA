# Módulo Jurídico - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/juridico/
├── 00-README.md                  <- Visão geral do módulo Jurídico
├── 01-CONTRATOS.md               <- Contratos trabalhistas, comerciais, fornecedores
└── 02-PROPRIEDADE_INTELECTUAL.md <- Marcas, patentes, desenhos industriais
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 16 | Jurídico | JUR | Assessor Jurídico |

## Estrutura do Departamento

| Cargo | Qtd | Função |
|-------|-----|--------|
| Assessor Jurídico | 1 (terceirizado) | Contratos, contencioso, PL |
| Estagiário de Direito | 1 | Acompanhamento processual |

## Funções

| Função | Descrição |
|--------|-----------|
| Contratos | Elaborar e revisar contratos |
| Contencioso Trabalhista | Ações trabalhistas, acordos |
| Contencioso Cível | Ações cíveis, fornecedores |
| Propriedade Intelectual | Registro de marcas, patentes |
| Compliance | LGPD, código de conduta |
| Contratos Comerciais | Distribuição, representação |

## Tabelas SQL

```sql
-- CONTRATOS
CREATE TABLE contracts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    contract_type ENUM('commercial','employment','supplier','rental','confidentiality','distribution','franchise'),
    title VARCHAR(200) NOT NULL,
    party_a VARCHAR(200) NOT NULL,
    party_b VARCHAR(200) NOT NULL,
    subject TEXT,
    value DECIMAL(15,2),
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_auto BOOLEAN DEFAULT false,
    notice_days INT DEFAULT 30,
    file_path VARCHAR(255),
    status ENUM('draft','signed','active','expired','terminated'),
    created_at DATETIME,
    updated_at DATETIME
);

-- PROCESSOS JUDICIAIS
CREATE TABLE legal_cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    case_type ENUM('labor','civil','tax','consumer','regulatory'),
    party_opposing VARCHAR(200),
    subject TEXT NOT NULL,
    claim_amount DECIMAL(15,2),
    court VARCHAR(100),
    judge_name VARCHAR(100),
    lawyer_responsible VARCHAR(100),
    last_movement_date DATE,
    next_hearing_date DATE,
    probability ENUM('low','medium','high','unknown'),
    provisioned_amount DECIMAL(15,2),
    status ENUM('active','archived','won','lost','settled'),
    created_at DATETIME,
    updated_at DATETIME
);

---

**Última atualização:** 2026-08-06
