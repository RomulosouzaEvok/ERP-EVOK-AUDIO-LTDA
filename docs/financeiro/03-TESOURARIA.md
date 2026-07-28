# Tesouraria - Módulo Financeiro

## Departamento de Tesouraria (TES)

### Estrutura

| Cargo | Qtd | Função |
|-------|-----|--------|
| Tesoureiro | 1 | Controle bancário, pagamentos, recebimentos |
| Assistente de Tesouraria | 1 | Conciliação, arquivo, boletos |

### Funções da Tesouraria

| Função | Descrição |
|--------|-----------|
| Conciliação Bancária | Conferir extratos bancários com lançamentos do sistema |
| Pagamentos | Efetuar pagamentos a fornecedores (TED, PIX, boleto) |
| Recebimentos | Monitorar recebimentos, baixar boletos |
| Aplicações Financeiras | Aplicar saldo excedente, resgatar |
| Empréstimos | Contratar e acompanhar linhas de crédito |
| Câmbio | Operações de importação/exportação |
| Garantias | Controle de seguros, fianças |

### Contas Bancárias EVOK ÁUDIO

| Banco | Agência | Conta | Tipo | Saldo |
|-------|---------|-------|------|-------|
| Banco do Brasil | 1234-5 | 10.000-1 | Corrente | R$ 45.000 |
| Itaú | 5678-9 | 20.000-2 | Corrente | R$ 32.000 |
| Itaú | 5678-9 | 25.000-7 | Aplicação | R$ 150.000 |
| Caixa | 9876-5 | 30.000-3 | Corrente | R$ 12.000 |
| BNDES | 1000-1 | 40.000-4 | Empréstimo | (R$ 200.000) |

### Conciliação Bancária

```
Extrato Bancário (BB - 15/01/2024):
│ Saldo Anterior:                R$ 38.000,00 │
│ (+) Crédito - Cliente X       R$ 15.000,00 │
│ (-) Débito - Boleto Forn. A   R$ 8.000,00  │
│ Saldo Final:                   R$ 45.000,00 │

Sistema ERP (15/01/2024):
│ Recebimento Cliente X          R$ 15.000,00 │
│ Pagamento Fornecedor A         R$ 8.000,00  │
│ Saldo:                         R$ 45.000,00 │

Diferença: R$ 0,00 ✅ CONCILIADO
```

### Tabelas SQL

```sql
-- CONCILIAÇÃO BANCÁRIA (detalhada)
CREATE TABLE reconciliation_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reconciliation_id INT NOT NULL,
    bank_transaction_id INT,
    system_transaction_id INT,
    type ENUM('matched','bank_only','system_only','difference'),
    difference_value DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME
);

-- OPERAÇÕES FINANCEIRAS (empréstimos, aplicações)
CREATE TABLE financial_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('loan','investment','financing','leasing'),
    institution VARCHAR(100) NOT NULL,
    contract_number VARCHAR(50) UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    start_date DATE,
    end_date DATE,
    guarantee_type ENUM('aval','fianca','alienacao','recebiveis','none'),
    status ENUM('active','settled','canceled'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
