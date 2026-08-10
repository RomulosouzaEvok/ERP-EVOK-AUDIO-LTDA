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

### ⚠️ Quando cada conta nasce (gap G13, 2026-08-10)

Esta é a regra contábil que governa as duas seções abaixo. Decisão **D-A**
do dono do produto
(`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4); pesquisa
normativa completa em
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 6.

| Conta | Nasce em | Base normativa | O que era antes |
|---|---|---|---|
| **A pagar** (compra) | **Recebimento** do material (`POST /api/purchases/:id/receive`), no valor **do que chegou** | **CPC 00 (R2) 4.56** (pedido aprovado e não entregue é *contrato executório*) e **4.58** (o passivo surge quando o fornecedor cumpre primeiro) | Nascia na **aprovação do pedido**, no valor do pedido inteiro, com vencimento `expected_date + 30` |
| **A receber** (venda) | **Autorização da NF-e** (`POST /api/sales/:id/nfe`), no valor **da emissão** | **CPC 47** 31 (controle), 38 (indicadores de transferência) e **108** (recebível exige direito **incondicional**) | Nascia na **confirmação do pedido**, no valor do pedido inteiro |
| **A receber** (avulsa) | Lançamento manual (`POST /api/finance/receivable`), **sem venda** | Decisão **D-J** do dono: reembolso, aluguel e venda de sucata são cobranças legítimas sem pedido | Não existia endpoint |

**Consequências práticas para o Financeiro:**

1. **Pedido aprovado não aparece mais em contas a pagar.** Ele é
   *compromisso de compra*, informação gerencial de Compras — a projeção de
   fluxo de caixa deixa de incluir saídas de pedidos que podem nunca chegar
   (ou que foram cancelados).
2. **Recebimento parcial gera passivo parcial.** Recebeu metade, deve a
   metade. Cada entrega gera uma conta a pagar própria, amarrada à NF do
   fornecedor daquela entrega.
3. **Faturamento parcial gera recebível parcial**, com numeração de parcela
   contínua entre as notas da mesma venda.
4. **Nenhuma parcela nasce paga** — nem a venda à vista. A parcela nasce
   `pending` com vencimento na data da emissão e a Tesouraria dá baixa em
   `PUT /api/finance/receivable/:id/pay`, com valor, data, usuário e
   contrapartida conciliável no extrato (OFX/CNAB). Antes, a venda à vista
   nascia `paid` sem nenhum dinheiro ter entrado: a receita estava
   reconhecida, o caixa não existia e nada acusava.
5. **Quem recebe não aprova pagamento.** A conta a pagar do recebimento
   nasce com `approved_by`/`approval_date` nulos (segregação de funções /
   three-way match: pedido × recebimento × NF do fornecedor).

**Dado legado (não foi reclassificado).** Contas criadas pela regra antiga
são reconhecíveis por `invoice_number IS NULL` e **permanecem exatamente
como estão** — o sistema apenas se recusa a criar uma segunda conta para a
mesma obrigação quando o pedido/venda legado chega ao recebimento/NF-e. O
destino delas (estornar ou congelar) é a pergunta **C9** ao contador, ainda
sem resposta. Consulta de levantamento (somente leitura):

```sql
-- Contas a pagar criadas na aprovação e ainda não recebidas
SELECT po.status, count(*), sum(ap.amount)
FROM accounts_payable ap
JOIN purchase_orders po ON po.id = ap.purchase_id
WHERE ap.invoice_number IS NULL AND po.status NOT IN ('received', 'partial')
GROUP BY po.status;

-- Contas a receber de venda ainda não faturada
SELECT count(*), sum(ar.amount)
FROM accounts_receivable ar
JOIN sales s ON s.id = ar.sale_id
WHERE ar.invoice_number IS NULL AND s.status IN ('quote', 'confirmed');

-- Parcelas que nasceram "pagas" sem baixa registrada
SELECT count(*), sum(amount)
FROM accounts_receivable
WHERE status = 'paid' AND COALESCE(amount_paid, 0) = 0;
```

**Situação apurada em 2026-08-10** (base de desenvolvimento do dono):
8 contas a pagar de pedidos não recebidos (R$ 3.675,02 — 1 `approved`,
6 `sent`, 1 de pedido **cancelado**), 2 contas a receber de 1 venda não
faturada (R$ 150,00) e **0** parcelas nascidas pagas sem baixa. **Nenhuma
das 20 linhas tem `payment_date`** — ou seja, nada foi pago ou recebido de
fato, então a decisão do contador não afeta caixa, só classificação.

### Contas a Pagar

| Fluxo | Descrição |
|-------|-----------|
| Requisição e pedido de compra | Compromisso — **não gera passivo** (CPC 00 4.56) |
| Aprovação do pedido | Alçada por origem (G11) — **não gera passivo** |
| **Recebimento do material + NF do fornecedor** | **Nasce a conta a pagar**, no valor recebido (CPC 00 4.58) |
| Programação de pagamento | Conforme prazo negociado (`due_date` informado no recebimento, ou NF + 30 dias) |
| Aprovação do pagamento | Supervisor ou gerente aprova — papel distinto de quem recebeu |
| Pagamento | Efetivado via TED, boleto, pix |
| Baixa | Conciliação bancária |

### Contas a Receber

| Fluxo | Descrição |
|-------|-----------|
| Orçamento / confirmação do pedido | Reserva estoque — **não gera recebível** (CPC 47 108) |
| **Emissão e autorização da NF-e** | **Nascem as parcelas**, no valor faturado, sempre `pending` |
| Envio de boleto/pix | Ao cliente |
| Acompanhamento | Dias de atraso, carteira |
| Cobrança | Telefone, email, protesto |
| Recebimento | Baixa explícita (`PUT /api/finance/receivable/:id/pay`) ou via extrato |
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
