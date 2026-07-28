# Contabilidade - Módulo Financeiro

## Departamento de Contabilidade (CONT)

### Estrutura

| Cargo | Qtd | Função |
|-------|-----|--------|
| Contador (CRC) | 1 | Responsável técnico, obrigações acessórias |
| Analista Contábil | 1 | Lançamentos, conciliação, balancetes |
| Analista Fiscal | 1 | Apuração de impostos, SPED |
| Assistente Contábil | 2 | Classificação fiscal, arquivos |

### Funções Contábeis na EVOK ÁUDIO

| Função | Periodicidade | Descrição |
|--------|--------------|-----------|
| Escrituração Contábil | Diário | Lançamento de notas fiscais, receitas, despesas |
| Conciliação de Contas | Mensal | Conferência de saldos contábeis x auxiliares |
| Apuração de Resultado | Mensal | DRE mensal por centro de custo |
| Balanço Patrimonial | Mensal/Anual | Ativo, Passivo, PL |
| Livros Fiscais | Mensal | SPED Fiscal, ECD, ECF |
| Obrigações Acessórias | Mensal/Anual | DCTF, ECD, ECF, DEFIS |
| Controle de Impostos | Mensal | Apuração e recolhimento |
| Ativo Fixo | Mensal | Depreciação, baixa, reavaliação |
| Custos Industriais | Mensal | Rateio de custos, variações |

### Plano de Contas (Resumo)

| Código | Descrição | Tipo |
|--------|-----------|------|
| 1 | ATIVO | - |
| 1.1 | Ativo Circulante | - |
| 1.1.1 | Caixa e Equivalentes | Caixa, bancos |
| 1.1.2 | Clientes | Duplicatas a receber |
| 1.1.3 | Estoques | MP, WIP, PA |
| 1.1.4 | Tributos a Recuperar | ICMS, IPI, PIS, COFINS |
| 1.2 | Ativo Não Circulante | - |
| 1.2.1 | Imobilizado | Máquinas, equipamentos |
| 1.2.2 | Intangível | Marcas, patentes, software |
| 1.2.3 | (-) Depreciação Acumulada | Redutora do imobilizado |
| 2 | PASSIVO | - |
| 2.1 | Passivo Circulante | - |
| 2.1.1 | Fornecedores | Duplicatas a pagar |
| 2.1.2 | Obrigações Trabalhistas | Salários, férias, 13º |
| 2.1.3 | Obrigações Tributárias | Impostos a recolher |
| 2.1.4 | Empréstimos | CP |
| 2.2 | Passivo Não Circulante | - |
| 2.2.1 | Empréstimos LP | Bancos, BNDES |
| 2.3 | Patrimônio Líquido | - |
| 2.3.1 | Capital Social | - |
| 2.3.2 | Reservas | Legal, lucros |
| 2.3.3 | Lucros/Prejuízos Acumulados | - |
| 3 | RECEITAS | - |
| 3.1 | Receita Bruta de Vendas | Faturamento |
| 3.2 | (-) Deduções | Impostos, devoluções |
| 3.3 | Receita Líquida | - |
| 4 | CUSTOS E DESPESAS | - |
| 4.1 | Custos dos Produtos Vendidos | MP, MOD, CIF |
| 4.2 | Despesas Operacionais | Adm, vendas |
| 4.3 | Despesas Financeiras | Juros, tarifas |

### DRE (Demonstrativo de Resultado) - EVOK ÁUDIO

```
DEMONSTRATIVO DE RESULTADO - MÊS XX/2024
┌─────────────────────────────────────────────────────────┐
│ RECEITA BRUTA DE VENDAS                  R$ 500.000,00  │
│ (-) Deduções e Impostos                 (R$ 80.000,00)  │
│   ICMS sobre vendas                     (R$ 90.000,00) │
│   IPI                                   (R$ 50.000,00) │
│   PIS/COFINS                            (R$ 18.125,00) │
│   Devoluções                            (R$ 10.000,00) │
│                                          ─────────────  │
│ (=) RECEITA LÍQUIDA                     R$ 331.875,00  │
│                                          ═════════════  │
│ (-) CPV - Custo dos Produtos Vendidos  (R$ 215.320,00) │
│   MP consumida                         (R$ 171.200,00) │
│   MOD                                  (R$ 24.120,00)  │
│   CIF                                  (R$ 20.000,00)  │
│                                          ─────────────  │
│ (=) LUCRO BRUTO                        R$ 116.555,00   │
│   Margem Bruta: 35,12%                                 │
│                                          ─────────────  │
│ (-) DESPESAS OPERACIONAIS              (R$ 55.000,00)  │
│   Despesas com vendas                  (R$ 25.000,00)  │
│   Despesas administrativas             (R$ 20.000,00)  │
│   Depreciação                          (R$ 8.000,00)   │
│   Despesas financeiras                 (R$ 2.000,00)   │
│                                          ─────────────  │
│ (=) LUCRO OPERACIONAL (EBIT)           R$ 61.555,00    │
│   Margem Operacional: 18,55%                            │
│                                          ─────────────  │
│ (+/-) Resultado Financeiro             (R$ 1.500,00)   │
│                                          ─────────────  │
│ (=) LAIR                               R$ 60.055,00    │
│ (-) IRPJ/CSLL                         (R$ 15.013,75)   │
│                                          ─────────────  │
│ (=) LUCRO LÍQUIDO                      R$ 45.041,25    │
│   Margem Líquida: 13,57%                               │
└─────────────────────────────────────────────────────────┘
```

### Tabelas SQL

```sql
-- LANÇAMENTOS CONTÁBEIS
CREATE TABLE accounting_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entry_date DATE NOT NULL,
    entry_number VARCHAR(20) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    entry_type ENUM('receipt','payment','sales','purchase','payroll','depreciation','closing','adjustment'),
    status ENUM('draft','posted','reversed') DEFAULT 'draft',
    created_by INT,
    created_at DATETIME,
    approved_by INT,
    approved_at DATETIME
);

-- ITENS DO LANÇAMENTO CONTÁBIL (débito/crédito)
CREATE TABLE accounting_entry_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entry_id INT NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    cost_center_id INT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    historical TEXT,
    created_at DATETIME
);

-- PLANO DE CONTAS
CREATE TABLE chart_of_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type ENUM('asset','liability','equity','revenue','expense','cost'),
    account_level INT DEFAULT 1,
    parent_id INT,
    accept_entries BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at DATETIME,
    updated_at DATETIME
);

-- BALANCETE
CREATE TABLE trial_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reference_month INT NOT NULL,
    reference_year INT NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    previous_balance DECIMAL(15,2) DEFAULT 0,
    debit_movement DECIMAL(15,2) DEFAULT 0,
    credit_movement DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    created_at DATETIME
);
```

### Obrigações Acessórias por Regime

| Obrigação | Simples Nacional | Lucro Presumido | Lucro Real |
|-----------|-----------------|-----------------|------------|
| PGDAS-D | Mensal | - | - |
| DEFIS | Anual | - | - |
| DCTF | - | Mensal | Mensal |
| ECD | - | Anual | Anual |
| ECF | Opcional | Anual | Anual |
| SPED Fiscal | Mensal | Mensal | Mensal |
| GIA (SP) | Mensal | Mensal | Mensal |
| eSocial | Mensal | Mensal | Mensal |
| DIFAL | Mensal | Mensal | Mensal |
