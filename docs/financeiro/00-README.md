# Módulo Financeiro - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/financeiro/
├── 00-README.md              <- Visão geral do módulo Financeiro
├── 01-FINANCEIRO.md          <- Contas a pagar/receber, fluxo de caixa
├── 02-CONTABILIDADE.md       <- Contabilidade, balanço, DRE
└── 03-TESOURARIA.md          <- Tesouraria, conciliação bancária
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).
> `CONT`, `CTR` e `TES` são subáreas funcionais de Financeiro — não têm linha
> própria em `departments` (ver `docs/00-ESTRUTURA_ORGANIZACIONAL.md` §
> Subáreas funcionais).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 09 | Financeiro | FIN | Gerente Financeiro |
| - | Contabilidade (subárea de FIN) | CONT | Contador |
| - | Controladoria (subárea de FIN) | CTR | Controller |
| - | Tesouraria (subárea de FIN) | TES | Tesoureiro |

## Estrutura Financeira EVOK ÁUDIO

| Cargo | Departamento | Qtd | Função |
|-------|--------------|-----|--------|
| Gerente Financeiro | FIN | 1 | Gestão financeira, estratégia, funding |
| Controller | CTR | 1 | Custos industriais, orçamento, DRE |
| Contador | CONT | 1 | Escrita fiscal, contábil, obrigações |
| Analista Financeiro | FIN | 2 | Contas a pagar/receber, fluxo de caixa |
| Tesoureiro | TES | 1 | Conciliação bancária, pagamentos |
| Assistente Contábil | CONT | 2 | Lançamentos, notas fiscais |
| Analista de Custos | CTR | 1 | Apuração de custo industrial |

## Funções Financeiras

| Função | Departamento | Descrição |
|--------|-------------|-----------|
| Contas a Pagar | FIN | Gestão de fornecedores, boletos, vencimentos |
| Contas a Receber | FIN | Recebimento de clientes, cobrança |
| Fluxo de Caixa | FIN | Projeção diária, semanal, mensal |
| Tesouraria | TES | Controle bancário, aplicações |
| Conciliação Bancária | TES | Conferência extratos x sistema |
| Custos Industriais | CTR | Custeio por absorção, ABC |
| Orçamento | CTR | Orçamento anual, acompanhamento |
| Contabilidade | CONT | Balanço, DRE, obrigações acessórias |
| Fiscal | CONT | Apuração de impostos, SPED |
| Cobrança | FIN | Negativação, protesto, cobrança judicial |

## Ciclo Financeiro

```
    COMPRA (Insumos)
        │
        ▼
  PAGAMENTO FORNECEDOR ◄─── 28 dias (prazo médio)
        │
        ▼
  PRODUÇÃO (5 dias) ──► ESTOQUE (15 dias)
        │
        ▼
  VENDA (Auto-falante)
        │
        ▼
  RECEBIMENTO CLIENTE ◄─── 30 dias (prazo médio)
  
  Ciclo Financeiro: 28 dias (pagar) + 5 + 15 - 30 (receber) = 18 dias
  Necessidade de Capital de Giro: ~18 dias de faturamento
```

## Tabelas SQL (Novas)

```sql
-- CONCILIAÇÃO BANCÁRIA
CREATE TABLE bank_reconciliation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bank_account_id INT NOT NULL,
    reconciliation_date DATE NOT NULL,
    bank_balance DECIMAL(15,2),
    system_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    reconciled BOOLEAN DEFAULT false,
    notes TEXT,
    reconciled_by INT,
    created_at DATETIME
);

-- CONTAS BANCÁRIAS
CREATE TABLE bank_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bank_name VARCHAR(100) NOT NULL,
    agency VARCHAR(20) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_type ENUM('corrente','poupanca','aplicacao'),
    balance DECIMAL(15,2) DEFAULT 0,
    manager_name VARCHAR(100),
    manager_phone VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);

-- EXTRATO BANCÁRIO
CREATE TABLE bank_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bank_account_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    document_number VARCHAR(50),
    type ENUM('credit','debit'),
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(50),
    reconciled BOOLEAN DEFAULT false,
    created_at DATETIME
);

---

**Última atualização:** 2026-08-06
