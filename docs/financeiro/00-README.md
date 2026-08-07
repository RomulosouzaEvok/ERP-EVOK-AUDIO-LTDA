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

## Controladoria (CTR) — Contrato Real Implementado (2026-08-07)

Diferente de Contabilidade (`02-CONTABILIDADE.md`) e Tesouraria
(`03-TESOURARIA.md`), Controladoria NÃO teve um doc dedicado com tabelas SQL
prontas nesta primeira rodada de implementação — seu escopo aqui era só a
tabela "Funções Financeiras" acima ("Custos Industriais: custeio por
absorção/ABC" e "Orçamento: orçamento anual, acompanhamento"). Do que
existia em spec:

- **Custos Industriais** (custeio por absorção/ABC de mão-de-obra e
  overhead) já estava implementado antes desta rodada em
  `server/src/modules/production`/`server/src/modules/reports` — não
  duplicado.
- **Centros de Custo** (`cost_centers`) e o relatório agrupado de contas a
  pagar/receber (`GET /api/finance/cost-centers/report`) já existiam em
  `server/src/modules/financial/` — não duplicados.
- **Orçamento** era a única peça genuinamente inexistente em código. É o
  que esta rodada implementou: linhas de orçamento por centro de custo (
  anual "achatada" ou mensal) e o acompanhamento orçado × realizado.

Backend em `server/src/modules/budget/` (Clean Architecture:
`domain/repositories`, `application/use-cases/{budget-line,report}`,
`infrastructure/sequelize`, `presentation/{controllers,validators,routes}`),
frontend em `client/src/pages/budget/BudgetPage.tsx` (abas Linhas de
Orçamento / Orçado × Realizado), cliente de API em `client/src/api/budget.ts`.
RBAC: módulo `controladoria` (`docs/administrativo/04-PERFIS_ACESSO.md`),
leitura exige qualquer nível atribuído, escrita (CRUD de linha, incluindo
exclusão) exige `operate`; sem nível `approve` (orçamento não tem transição
de status sensível a proteger).

### Schema PostgreSQL

Migration: `server/migrations/20260807-000250-create-budget-module.cjs`.
Tabela única, `budget_lines`: `id`, `cost_center_id` (FK →
`cost_centers.id`, `ON DELETE CASCADE`), `year` (`INTEGER`, 2000-2100),
`month` (`INTEGER` 1-12, **NULLABLE**), `category`
(`custo_fixo|custo_variavel|investimento|outro`, default `outro`),
`planned_amount` (`DECIMAL(15,2)`, `>= 0`), `notes` (nullable),
`created_at`/`updated_at`. Sem soft delete — `budget_lines` é artefato de
planejamento, não histórico transacional imutável, então
`DELETE /api/budget/lines/:id` apaga fisicamente a linha (`CLAUDE.md` §7).

**Decisão — mês opcional.** `month IS NULL` representa uma linha ANUAL
"achatada" (o ano inteiro em uma única linha, sem detalhamento mês a mês);
`month` entre `1` e `12` representa uma linha MENSAL. As duas convivem para
o mesmo centro de custo/ano/categoria sem colidir.

**Decisão — unicidade com `month` nulo.** `(cost_center_id, year, month,
category)` precisa ser único, mas uma `UNIQUE` padrão do PostgreSQL não
barra duas linhas anuais duplicadas (`NULL` nunca é igual a `NULL`). A
migration cria em vez disso um ÍNDICE DE EXPRESSÃO:
`UNIQUE (cost_center_id, year, COALESCE(month, 0), category)`
(`uq_budget_lines_cost_center_year_month_category`).

### Relatório Orçado × Realizado

`GET /api/budget/report?year=&month=&cost_center_id=` (`month` e
`cost_center_id` opcionais). Para cada centro de custo, retorna:

- **Orçado** (`planned_amount`): soma de `budget_lines` do período. Ao
  consultar o ANO INTEIRO (`month` omitido), linhas mensais e anuais entram
  pelo valor cheio. Ao consultar um MÊS específico, linhas mensais daquele
  mês entram cheias e linhas anuais são **rateadas por 12** (distribuição
  linear simplificada — decisão consciente de não modelar sazonalidade).
- **Realizado** (`realized_amount`): reaproveita
  `CostCenterRepository.getCostCenterTotalsByPayable` (mesma agregação de
  `GET /api/finance/cost-centers/report`, módulo Financeiro), usando o
  valor já **pago** (`amount_paid`) de `accounts_payable` no período —
  Controladoria acompanha custos/despesas, não receitas, então apenas o
  lado de contas a PAGAR entra no comparativo; contas a receber ficam fora
  deste relatório por design.
- **Variação** (`variance` = realizado − orçado) e **variação percentual**
  (`variance_percent`, `null` quando o orçado é zero, evitando divisão por
  zero).

### Endpoints

| Método | Rota | Nível RBAC |
|---|---|---|
| GET | `/api/budget/lines` | `controladoria` (leitura) |
| GET | `/api/budget/lines/:id` | `controladoria` (leitura) |
| POST | `/api/budget/lines` | `controladoria` `operate` |
| PUT | `/api/budget/lines/:id` | `controladoria` `operate` |
| DELETE | `/api/budget/lines/:id` | `controladoria` `operate` |
| GET | `/api/budget/report` | `controladoria` (leitura) |

### Riscos residuais

- Sem teste de integração real (Postgres) do fluxo completo CRUD → relatório
  (só unitário, com repositórios mockados) — migration foi exercitada
  manualmente contra o Postgres local (`npm run migration:up`,
  `migration:status`), mas o smoke funcional do endpoint ainda não rodou
  ponta a ponta.
- Categoria de orçamento é um enum simples (4 valores), não um plano de
  contas completo — cruzar linha de orçamento com conta contábil real
  (`accounting_chart_of_accounts`) fica registrado como evolução futura em
  `docs/governance/TODO.md`, não implementado agora.
- Proração linear (÷12) de linha anual ao consultar um mês específico é uma
  simplificação deliberada; não há suporte a curva de sazonalidade.

---

**Última atualização:** 2026-08-07
