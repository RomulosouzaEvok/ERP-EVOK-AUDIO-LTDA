# Tesouraria - Módulo Financeiro

> **Status:** ✅ Implementado em 2026-08-07 (backend + frontend), sob
> `server/src/modules/treasury/` e `/api/treasury/*`. A seção "Tabelas SQL"
> abaixo era só um spec narrativo em sintaxe MySQL, **nunca foi migrada** —
> substituída pelo contrato real descrito na seção
> [Contrato Real Implementado](#contrato-real-implementado-2026-08-07) ao
> final deste documento. RBAC: módulo `tesouraria`
> (`server/src/shared/domain/accessModules.ts`). A Conciliação Bancária
> descrita abaixo (extrato x sistema) **já existia antes desta entrega**,
> real e funcional, em `server/src/modules/financial/` (`bank_statements`/
> `bank_statement_entries`, `/api/finance/reconciliation/*`,
> `/api/finance/cnab/*`) — este módulo `treasury` NÃO a duplica; a tabela
> `reconciliation_items` do spec original nunca foi criada, de propósito.

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

### Tabelas SQL (spec original — NUNCA foram migradas, ver contrato real abaixo)

> As duas tabelas abaixo são o spec narrativo ORIGINAL deste documento
> (sintaxe MySQL), mantido aqui só por referência histórica. Nenhuma das
> duas existe no banco real: `reconciliation_items` nunca foi criada (a
> conciliação bancária real usa `bank_statements`/`bank_statement_entries`,
> ver nota no topo do documento); `financial_operations` foi implementada
> como `treasury_financial_operations`, com ajustes documentados na seção
> [Contrato Real Implementado](#contrato-real-implementado-2026-08-07).

```sql
-- CONCILIAÇÃO BANCÁRIA (detalhada) — NÃO IMPLEMENTADA, ver nota acima
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
```

## Contrato Real Implementado (2026-08-07)

Backend em `server/src/modules/treasury/` (Clean Architecture:
`domain/repositories`, `application/use-cases/{bank-account,operation,
report}`, `infrastructure/sequelize`, `presentation/{controllers,
validators,routes}`), frontend em
`client/src/pages/treasury/TreasuryPage.tsx` (abas Operações Financeiras /
Posição de Caixa / Contas Bancárias), cliente de API em
`client/src/api/treasury.ts`. RBAC: módulo `tesouraria`
(`docs/administrativo/04-PERFIS_ACESSO.md`), leitura exige qualquer nível
atribuído, escrita comum exige `operate`, as transições `settle`/`cancel`
exigem `approve`.

### Decisão arquitetural: `CompanyBankingConfig` NÃO é o cadastro de contas

Antes de criar `treasury_bank_accounts`, o model já existente
`server/src/models/CompanyBankingConfig.ts`
(`company_banking_config`) foi investigado: é uma tabela **singleton** (1
única linha, `id=1`) com os dados bancários do CEDENTE (a própria Evok)
usados exclusivamente na geração de arquivo de remessa/boleto CNAB —
banco, agência, conta, código do convênio, carteira, e os contadores
sequenciais de "nosso número"/"número de remessa". NÃO é, e nunca foi
desenhada para ser, um cadastro de múltiplas contas correntes/poupança/
aplicação. Como a Tesouraria precisa gerenciar N contas bancárias com
saldo cada, a tabela `treasury_bank_accounts` foi criada **separada**, sem
nenhuma FK entre as duas — são domínios de configuração distintos ("conta
bancária operacional, saldo variável, N linhas" vs. "config de cedente
para CNAB, 1 linha fixa").

### Schema PostgreSQL real (substitui as "Tabelas SQL" MySQL acima)

Migration: `server/migrations/20260807-000240-create-treasury-module.cjs`.

**`treasury_bank_accounts`** (tabela NOVA — não existia no spec original,
que só tinha uma tabela markdown estática de exemplo): `id`, `bank_name`,
`agency`, `account_number` (únicos em conjunto), `account_type`
(`corrente|poupanca|aplicacao`), `current_balance` (`DECIMAL(15,2)`,
mantido MANUALMENTE pela Tesouraria — sem reconciliação automática com
`bank_statements`), `manager_name`/`manager_phone` (nullable),
`active` (boolean, desativação lógica), `created_at`/`updated_at`.

**`treasury_financial_operations`** (renomeada de `financial_operations`
do spec original): `id`, `operation_type`
(`loan|investment|financing|leasing`), `institution`, `contract_number`
(único), `amount` (`DECIMAL(15,2)`), `interest_rate` (`DECIMAL(5,2)`,
nullable), `start_date` (obrigatória), `end_date` (nullable),
`guarantee_type` (`aval|fianca|alienacao|recebiveis|none`, default
`none`), `status` (`active|settled|canceled`, default `active`), `notes`
(nullable), `settled_at` (nullable, `DATEONLY` — coluna NOVA em relação ao
spec original: preenchida apenas por `PATCH .../settle`, registra a data
do encerramento natural do contrato), `created_at`/`updated_at`.

**Posição de Caixa**: NÃO é tabela — é relatório 100% derivado
(`GetCashPositionUseCase`), somando
`treasury_bank_accounts.current_balance` (contas ativas, por tipo +
total) e cruzando com o resumo de títulos em aberto de
`accounts_payable`/`accounts_receivable` (mesmo critério de
`payment_date IS NULL AND status != 'canceled'` de
`GetCashFlowProjectionUseCase`, módulo `financial`).

### Ciclo de vida de uma Operação Financeira

Nasce sempre `active` (editável livremente via
`PUT /api/treasury/financial-operations/:id`). Duas transições dedicadas,
ambas para estados finais (nunca reabertos, nunca apagados fisicamente —
histórico de contrato financeiro exige auditoria):
- `PATCH /api/treasury/financial-operations/:id/settle` (`active ->
  settled`): encerramento NATURAL do contrato (ciclo cumprido), preenche
  `settled_at`.
- `PATCH /api/treasury/financial-operations/:id/cancel` (`active ->
  canceled`): encerramento ANTES do previsto (erro de cadastro, distrato).

### Endpoints

| Método | Rota | Nível RBAC |
|--------|------|------------|
| GET | `/api/treasury/bank-accounts` | `tesouraria` |
| GET | `/api/treasury/bank-accounts/:id` | `tesouraria` |
| POST | `/api/treasury/bank-accounts` | `tesouraria:operate` |
| PUT | `/api/treasury/bank-accounts/:id` | `tesouraria:operate` |
| GET | `/api/treasury/financial-operations` | `tesouraria` |
| GET | `/api/treasury/financial-operations/:id` | `tesouraria` |
| POST | `/api/treasury/financial-operations` | `tesouraria:operate` |
| PUT | `/api/treasury/financial-operations/:id` | `tesouraria:operate` |
| PATCH | `/api/treasury/financial-operations/:id/settle` | `tesouraria:approve` |
| PATCH | `/api/treasury/financial-operations/:id/cancel` | `tesouraria:approve` |
| GET | `/api/treasury/cash-position` | `tesouraria` |

### Fora do escopo desta entrega

Conciliação bancária OFX/CNAB (já existe, real, em
`server/src/modules/financial/` — não duplicada aqui); operações de câmbio
dedicadas (o módulo Importação/COMEX, UC-19, já cobre nacionalização de
importação com câmbio informado manualmente por processo, sem campo de
câmbio dedicado a este módulo); vínculo automático entre uma Operação
Financeira liquidada e a baixa de um título em contas a pagar/receber;
reconciliação automática de `treasury_bank_accounts.current_balance` com
o extrato OFX importado em `bank_statements`. Ver
`docs/governance/HANDOFF_CODEX.md`, entrada 2026-08-07 "Módulo Tesouraria",
para o detalhamento completo.
