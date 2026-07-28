# Módulo Qualidade - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/qualidade/
├── 00-README.md                  <- Visão geral do módulo Qualidade
├── 01-CONTROLE_QUALIDADE.md      <- Controle de qualidade (incoming, processo, final)
├── 02-TESTES_ACUSTICOS.md        <- Testes acústicos, elétricos, ambientais
└── 03-CERTIFICACOES.md           <- ISO, INMETRO, normativas
```

## Departamentos Cobertos

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 11 | Qualidade | QUAL | Gerente de Qualidade |
| - | Laboratório de Testes | LAB | Supervisor de Testes |
| - | Garantia da Qualidade | GQ | Analista da Qualidade |

## Estrutura do Departamento

| Cargo | Departamento | Qtd | Função |
|-------|--------------|-----|--------|
| Gerente da Qualidade | QUAL | 1 | Gestão do SGQ, ISO 9001 |
| Supervisor de Qualidade | QUAL | 1 | Coordenar inspetores, laboratório |
| Inspetor de Qualidade (incoming) | QUAL | 2 | Inspeção de materiais recebidos |
| Inspetor de Qualidade (processo) | QUAL | 3 | Inspeção durante a produção |
| Inspetor de Qualidade (final) | QUAL | 2 | Inspeção final e testes |
| Técnico de Laboratório Acústico | LAB | 2 | Testes acústicos, câmara anecoica |
| Analista da Qualidade | GQ | 1 | Indicadores, relatórios, garantia |
| Metrologista | LAB | 1 | Calibração de instrumentos |

## Funções da Qualidade na EVOK ÁUDIO

| Função | Descrição |
|--------|-----------|
| IQF (Inspeção de Qualidade Final) | Teste 100% ou amostragem dos produtos acabados |
| Controle Estatístico de Processo (CEP) | Monitorar variação do processo |
| Auditoria da Qualidade | Auditoria interna do SGQ |
| Metrologia | Calibração de instrumentos de medição |
| Garantia da Qualidade | Ações corretivas e preventivas |
| Laboratório Acústico | Testar resposta em frequência, THD, potência |
| Certificações | Manter certificações (ISO, INMETRO) |
| Fornecedores | Qualificação e auditoria de fornecedores |

## Pontos de Inspeção no Fluxo Produtivo

```
MP (Incoming)
 ├── Inspeção de Cone (dimensões, acabamento)
 ├── Inspeção de Bobina (resistência, acabamento)
 ├── Inspeção de Imã (magnetização, dimensões)
 └── Inspeção de Basket (dimensões, pintura)
        │
        ▼
Processo (In-Process)
 ├── Injeção (peso, espessura, temperatura)
 ├── Colagem (força de cola, alinhamento)
 └── Montagem (gap, torque, solda)
        │
        ▼
Produto Acabado (Final)
 ├── Inspeção Visual (100%)
 ├── Teste Elétrico (impedância, polaridade)
 ├── Teste Acústico (amostragem)
 └── Teste de Vedação (amostragem)
        │
        ▼
Embalagem
 └── Inspeção de Embalagem (rótulo, código)
```

## Tabelas SQL

```sql
-- PLANO DE INSPEÇÃO POR PRODUTO
CREATE TABLE inspection_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    inspection_stage ENUM('incoming','process','final','audit') NOT NULL,
    characteristic VARCHAR(200) NOT NULL,
    specification_min VARCHAR(50),
    specification_max VARCHAR(50),
    unit VARCHAR(20),
    measurement_tool VARCHAR(100),
    sample_size INT DEFAULT 1,
    frequency ENUM('every_unit','hourly','batch','daily','lot'),
    control_type ENUM('attribute','variable'),
    created_at DATETIME,
    updated_at DATETIME
);

-- INSPEÇÃO DE FORNECEDORES
CREATE TABLE supplier_quality (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator_id INT,
    product_quality INT DEFAULT 3,        -- 1-5
    delivery_punctuality INT DEFAULT 3,   -- 1-5
    price_competitiveness INT DEFAULT 3,  -- 1-5
    service_support INT DEFAULT 3,        -- 1-5
    total_score DECIMAL(5,2),
    classification ENUM('a','b','c','d'),
    approved BOOLEAN DEFAULT true,
    notes TEXT,
    created_at DATETIME
);

-- NÃO CONFORMIDADES
CREATE TABLE non_conformities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    production_record_id INT,
    supplier_id INT,
    nc_number VARCHAR(20) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category ENUM('dimensional','acoustic','electrical','visual','material','packaging','other'),
    severity ENUM('minor','major','critical'),
    detected_at DATETIME,
    detected_by INT,
    status ENUM('open','analysis','corrective_action','closed'),
    root_cause TEXT,
    corrective_action TEXT,
    closed_by INT,
    closed_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME
);
```

## Indicadores da Qualidade

| KPI | Fórmula | Meta |
|-----|---------|------|
| % Defeitos (PPM) | (Unid refugadas / Total produzido) x 1.000.000 | < 5.000 PPM |
| % Refugo | (Refugo / Total) x 100 | < 2% |
| % Retrabalho | (Retrabalho / Total) x 100 | < 3% |
| CEP (Cp/Cpk) | Capacidade do processo | > 1,33 |
| Auditoria Fornecedor | Pontuação | > 80% |
| NPS Clientes | Pesquisa | > 80 |
| Índice de NCs | NCs abertas / NCs fechadas | > 90% |
