# Módulo Segurança do Trabalho - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/seguranca_trabalho/
├── 00-README.md              <- Visão geral do módulo SST
├── 01-SST.md                 <- Segurança e saúde ocupacional (NRs)
└── 02-CIPA.md                <- Comissão Interna de Prevenção de Acidentes
```

## Departamentos Cobertos

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 15 | Segurança do Trabalho | SST | Técnico de Segurança do Trabalho |

## Estrutura do Departamento

| Cargo | Qtd | Função |
|-------|-----|--------|
| Técnico de Segurança do Trabalho | 1 | Implementar NRs, treinamentos |
| Médico do Trabalho | 1 (parcial) | PCMSO, exames |
| Enfermeiro do Trabalho | 1 | Primeiros socorros, ambulatório |
| Brigadista | 10 | Brigada de incêndio (voluntários) |

## Normas Regulamentadoras (NRs) Aplicáveis

| NR | Descrição | Aplicação na EVOK |
|----|-----------|-------------------|
| NR-6 | EPI - Equipamento de Proteção Individual | Luvas, óculos, protetor auricular, máscara |
| NR-7 | PCMSO - Programa de Controle Médico | Exames admissionais, periódicos, demissionais |
| NR-9 | PPRA - Programa de Prevenção de Riscos | Ruído (acima de 85 dB), agentes químicos (cola) |
| NR-10 | Segurança em Instalações Elétricas | Máquinas, painéis, solda |
| NR-11 | Transporte e Armazenagem | Empilhadeira, paleteira |
| NR-12 | Segurança em Máquinas e Equipamentos | Injetoras, prensas, esteiras |
| NR-17 | Ergonomia | Posto de trabalho, levantamento de peso |
| NR-20 | Líquidos Inflamáveis | Colas, solventes, thinner |
| NR-23 | Proteção Contra Incêndios | Extintores, saídas de emergência |
| NR-26 | Sinalização de Segurança | Faixas, placas, cores |

## Tabelas SQL

```sql
-- EPIs - CONTROLE DE ENTREGA
CREATE TABLE epi_deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    epi_item_id INT NOT NULL,
    delivery_date DATE NOT NULL,
    quantity INT DEFAULT 1,
    validity_date DATE,
    signature_url VARCHAR(255),
    created_at DATETIME
);

-- ACIDENTES DE TRABALHO
CREATE TABLE work_accidents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    accident_date DATE NOT NULL,
    accident_time TIME,
    accident_type ENUM('typical','commuting','disease'),
    description TEXT NOT NULL,
    affected_body_part VARCHAR(100),
    severity ENUM('without_leave','leave','permanent_disability','fatal'),
    lost_days INT DEFAULT 0,
    cat_number VARCHAR(50),                   -- Comunicação de Acidente de Trabalho
    created_at DATETIME
);

-- TREINAMENTOS DE SEGURANÇA
CREATE TABLE safety_trainings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    training_type ENUM('nr_6','nr_10','nr_12','nr_17','nr_20','brigade','first_aid','other'),
    training_date DATE NOT NULL,
    validity_date DATE,
    hours_duration INT,
    trainer_name VARCHAR(200),
    certification VARCHAR(255),
    created_at DATETIME
);
```

## Risco Ocupacional na EVOK ÁUDIO

| Setor | Risco | Agente | EPI Necessário |
|-------|-------|--------|----------------|
| Injeção | Físico | Ruído (>90 dB) | Protetor auricular |
| Injeção | Físico | Calor (>30°C) | Ventilação |
| Injeção | Químico | Vapores (plástico) | Máscara |
| Colagem | Químico | Cola, solvente | Luvas, máscara |
| Solda | Físico | Fumaça metálica | Extrator, máscara |
| Montagem | Ergonômico | Movimentos repetitivos | Pausas, rodízio |
| Testes | Físico | Ruído (>100 dB) | Protetor duplo |
| Almoxarifado | Mecânico | Empilhadeira | Sinalização |
