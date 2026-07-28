# Gestão Financeira - Módulo Financeiro

## Departamento Financeiro (FIN)

### Estrutura

| Cargo | Qtd | Responsabilidades |
|-------|-----|-------------------|
| Gerente Financeiro | 1 | Gestão estratégica, funding, resultado |
| Analista Financeiro Sr. | 1 | Fluxo de caixa, projeções |
| Analista de Contas a Pagar | 1 | Fornecedores, boletos, vencimentos |
| Analista de Contas a Receber | 1 | Recebimentos, cobrança, negativação |
| Assistente Financeiro | 2 | Baixas, conciliação, arquivo |

### Contas a Pagar

| Fluxo | Descrição |
|-------|-----------|
| Recebimento de nota fiscal | Fornecedor envia NF |
| Lançamento no sistema | Contabilização da despesa |
| Programação de pagamento | Conforme prazo negociado |
| Aprovação | Supervisor ou gerente aprova |
| Pagamento | Efetivado via TED, boleto, pix |
| Baixa | Conciliação bancária |

### Contas a Receber

| Fluxo | Descrição |
|-------|-----------|
| Emissão de nota fiscal | Venda faturada |
| Geração de parcelas | Automático (conforme condições) |
| Envio de boleto/pix | Ao cliente |
| Acompanhamento | Dias de atraso, carteira |
| Cobrança | Telefone, email, protesto |
| Recebimento | Baixa automática via extrato |
| Negativação | Serasa após 60 dias atraso |

### Fluxo de Caixa

```
Projeção Diária de Fluxo de Caixa
┌─────────────────────────────────────────────────────────────┐
│ Data: 15/01/2024                                            │
│                                                             │
│ RECEBIMENTOS PREVISTOS:                                     │
│ ├── Cliente A (boleto)                     R$ 15.000,00    │
│ ├── Cliente B (pix)                        R$  8.500,00    │
│ └── Total Recebimentos:                    R$ 23.500,00    │
│                                                             │
│ PAGAMENTOS PREVISTOS:                                       │
│ ├── Fornecedor X (boleto)                  R$ 12.000,00    │
│ ├── Folha de Pagamento                     R$ 45.000,00    │
│ ├── Conta de Luz (concessionária)          R$  3.500,00    │
│ └── Total Pagamentos:                      R$ 60.500,00    │
│                                                             │
│ SALDO DO DIA:                              (R$ 37.000,00)  │
│                                                             │
│ SALDO ANTERIOR:                            R$ 45.000,00    │
│ SALDO FINAL:                               R$  8.000,00    │
└─────────────────────────────────────────────────────────────┘
```

### Tabelas SQL

```sql
-- CONTAS A RECEBER (expansão)
ALTER TABLE accounts_receivable ADD COLUMN (
    invoice_number VARCHAR(50),               -- NF emitida
    barcode VARCHAR(100),                      -- Código barras boleto
    pix_key VARCHAR(100),                      -- Chave pix para cobrança
    interest DECIMAL(10,2) DEFAULT 0,          -- Juros de mora
    fine DECIMAL(10,2) DEFAULT 0,              -- Multa
    discount DECIMAL(10,2) DEFAULT 0,          -- Desconto
    collection_status ENUM('normal','warning','overdue_30','overdue_60','overdue_90','protested') DEFAULT 'normal',
    protest_date DATE,
    negativation_date DATE
);

-- CONTAS A PAGAR (expansão)
ALTER TABLE accounts_payable ADD COLUMN (
    invoice_number VARCHAR(50),
    barcode VARCHAR(100),
    cost_center_id INT,
    payment_type ENUM('ted','pix','boleto','cheque','dinheiro'),
    approved_by INT,
    approval_date DATE
);

-- MOVIMENTAÇÃO FINANCEIRA (histórico completo)
CREATE TABLE financial_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    document_type ENUM('receivable','payable','transfer','investment','loan'),
    reference_id INT,                          -- ID da tabela de origem
    category VARCHAR(100),
    cost_center_id INT,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('credit','debit'),
    payment_method VARCHAR(50),
    bank_account_id INT,
    status ENUM('pending','settled','canceled'),
    created_at DATETIME,
    updated_at DATETIME
);
```

### Indicadores Financeiros

| KPI | Fórmula | Meta |
|-----|---------|------|
| Liquidez Corrente | Ativo Circulante / Passivo Circulante | > 1,5 |
| Prazo Médio Recebimento | (Duplicatas a Receber / Vendas) x 30 dias | < 30 dias |
| Prazo Médio Pagamento | (Fornecedores / Compras) x 30 dias | > 28 dias |
| Ciclo Financeiro | PMR + PME - PMP | < 20 dias |
| Margem Líquida | Lucro Líquido / Receita Líquida | > 10% |
| EBITDA | Lucro Operacional + Depreciação | > 15% Receita |
