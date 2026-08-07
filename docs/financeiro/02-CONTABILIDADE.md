# Contabilidade - Módulo Financeiro

> **Status:** ✅ Implementado em 2026-08-07 (backend + frontend), sob
> `server/src/modules/accounting/` e `/api/accounting/*`. As "Tabelas SQL"
> abaixo eram só um spec narrativo em sintaxe MySQL, **nunca foram migradas**
> — foram substituídas pelo contrato real descrito na seção
> [Contrato Real Implementado](#contrato-real-implementado-2026-08-07) ao
> final deste documento. RBAC: módulo `contabilidade`
> (`server/src/shared/domain/accessModules.ts`).

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

### Tabelas SQL (spec original — NUNCA foram migradas em MySQL; ver schema real na seção final)

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

> Obrigações acessórias (SPED/ECD/ECF/DCTF/eSocial etc.) permanecem fora do
> escopo do backend implementado em 2026-08-07 — sem integração com
> Sped/Receita Federal. O módulo cobre apenas a escrituração interna
> (lançamentos, plano de contas, balancete).

## Contrato Real Implementado (2026-08-07)

Backend em `server/src/modules/accounting/` (Clean Architecture:
`domain/repositories`, `application/use-cases/{account,entry,report}`,
`infrastructure/sequelize`, `presentation/{controllers,validators,routes}`),
frontend em `client/src/pages/accounting/AccountingPage.tsx` (abas Plano de
Contas / Lançamentos / Balancete), cliente de API em
`client/src/api/accounting.ts`. RBAC: módulo `contabilidade`
(`docs/administrativo/04-PERFIS_ACESSO.md`), leitura exige qualquer nível
atribuído, escrita comum exige `operate`, as transições `post`/`reverse`
exigem `approve`.

### Schema PostgreSQL real (substitui as "Tabelas SQL" MySQL acima)

Migrations: `server/migrations/20260807-000230-create-accounting-module.cjs`
(schema) e `20260807-000231-seed-accounting-chart-of-accounts.cjs` (seed do
plano de contas resumido, 30 contas, replicando fielmente a tabela "Plano de
Contas (Resumo)" deste documento).

**`accounting_chart_of_accounts`** (Plano de Contas, hierárquico via
`parent_id` self-FK `ON DELETE RESTRICT`):
`id`, `code` (único, ex.: `"1.1.1"`), `name`, `account_type`
(`asset|liability|equity|revenue|expense|cost`), `account_level` (derivado
automaticamente do número de segmentos de `code`), `parent_id` (nullable,
derivado automaticamente do prefixo de `code`), `accept_entries` (boolean —
só contas "folha" aceitam lançamento direto; contas sintéticas/pai não
podem), `active` (boolean, desativação lógica), `created_at`/`updated_at`.

**`accounting_entries`** (Lançamentos Contábeis):
`id`, `entry_number` (único, sequencial `LC-000001`), `entry_date`,
`description`, `entry_type`
(`receipt|payment|sales|purchase|payroll|depreciation|closing|adjustment`),
`status` (`draft|posted|reversed`), `created_by`/`approved_by` (FK `users`,
`ON DELETE RESTRICT`; `approved_by` nullable até postar), `approved_at`,
`reversal_of_id` (nullable, self-FK `ON DELETE SET NULL` — coluna NOVA em
relação ao spec original: no lançamento de ESTORNO, aponta para o
lançamento original revertido, preservando a rastreabilidade sem depender
de parsing de texto na `description`), `created_at`/`updated_at`.

**`accounting_entry_items`** (Itens do Lançamento — débito/crédito):
`id`, `entry_id` (FK `accounting_entries`, `ON DELETE CASCADE`),
`account_id` (FK `accounting_chart_of_accounts`, `ON DELETE RESTRICT` — não
pode apagar conta com lançamento; substitui o `account_code VARCHAR` solto
do spec original por integridade referencial real), `cost_center_id`
(nullable, FK `cost_centers`, `ON DELETE SET NULL`), `debit`/`credit`
(`DECIMAL(15,2)`, exatamente um dos dois > 0 por linha — nunca ambos,
validado em `validateEntryItemsShape.ts`, não no banco), `historical`
(texto), `created_at`/`updated_at`.

**Balancete**: NÃO é tabela (a `trial_balance` do spec original não foi
criada) — é relatório 100% derivado, calculado on-the-fly a partir de
`accounting_entry_items` de lançamentos `posted`, agregados por conta/mês
em `SequelizeAccountingRepository.getTrialBalanceRows`.

### Regra de negócio central: partida dobrada

Um lançamento nasce sempre `draft` (itens editáveis livremente, inclusive
substituição integral via `PUT /api/accounting/entries/:id`). Ao "postar"
(`PATCH /api/accounting/entries/:id/post`, `draft -> posted`), o
`PostEntryUseCase` valida: mínimo de 2 itens, ao menos uma linha de débito E
uma de crédito, e soma de todos os `debit` EXATAMENTE igual à soma de todos
os `credit` (comparação em centavos via `shared/utils/money`, evitando
falso-negativo de ponto flutuante) — senão rejeita com `BusinessRuleError`
(HTTP 422) explicando a diferença em reais. Depois de `posted`, os itens
ficam imutáveis; a única forma de desfazer é
`PATCH /api/accounting/entries/:id/reverse` (`posted -> reversed`), que cria
um NOVO lançamento (`entry_type: 'adjustment'`, já `posted`,
`reversal_of_id` apontando para o original) com débito/crédito de cada item
invertidos, e marca o original como `reversed` — nunca apaga nada.

### Endpoints

| Método | Rota | Nível RBAC |
|--------|------|------------|
| GET | `/api/accounting/accounts` | `contabilidade` |
| GET | `/api/accounting/accounts/:id` | `contabilidade` |
| POST | `/api/accounting/accounts` | `contabilidade:operate` |
| PUT | `/api/accounting/accounts/:id` | `contabilidade:operate` |
| GET | `/api/accounting/entries` | `contabilidade` |
| GET | `/api/accounting/entries/:id` | `contabilidade` |
| POST | `/api/accounting/entries` | `contabilidade:operate` |
| PUT | `/api/accounting/entries/:id` | `contabilidade:operate` |
| PATCH | `/api/accounting/entries/:id/post` | `contabilidade:approve` |
| PATCH | `/api/accounting/entries/:id/reverse` | `contabilidade:approve` |
| GET | `/api/accounting/trial-balance?year=&month=` | `contabilidade` |

### Riscos residuais / fora de escopo

- Sem integração fiscal (SPED/ECD/ECF/DCTF/eSocial) — só escrituração interna.
- Sem geração automática de lançamento a partir de outros módulos (vendas,
  compras, folha) — todo lançamento é manual nesta rodada.
- Sem teste de integração real (Postgres) do fluxo completo
  create→post→reverse; cobertura atual é só unitária (mock de repositório),
  ver `server/tests/unit/accounting-use-cases.test.ts`.
- Tela web não valida hierarquia de árvore com expand/collapse — lista
  indentada por nível (`ChartOfAccountsTab.tsx`), suficiente para os 30
  registros do seed, pode precisar de UI de árvore de verdade se o plano de
  contas crescer muito.
