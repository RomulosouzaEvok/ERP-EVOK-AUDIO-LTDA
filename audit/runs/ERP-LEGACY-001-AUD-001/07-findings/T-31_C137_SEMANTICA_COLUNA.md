# T-31 — `C-137` Semântica de coluna das tabelas do ERP

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-31` (fechamento da célula `C-137` da EMENDA-02) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Banco acessado | **NENHUM** — `APR-2026-016` respeitada integralmente |

> **Nota de persistência.** Agente titular sem `Write`. Persistido pelo orquestrador **sem
> alteração**.

## 1.1 Limitação de execução — declarada, não contornada

O mandato pedia reconfirmação de `git diff --stat c1311a6..HEAD`. **A ferramenta Bash estava
desabilitada na sessão do agente.** Consequência declarada: **não se cita** o resultado do `git
diff` como fato próprio; ele permanece **fato de terceiro, não reconfirmado nesta trilha**
(`RES-T31-01`). Mitigação obtida por outro caminho: a reconstrução independente do denominador (§2)
chegou a **207**, o mesmo de `T-13_DADOS_E_SCHEMA.md:62-67`.

## 2. A lista de tabelas — reconstruída, e como

**Passo 1 — baseline congelado:** `CREATE TABLE` = **200**; `^CREATE TABLE public\.\w+` = **199**.
A diferença **não é erro**: é `CREATE TABLE public."SequelizeMeta"` (`:2999`), com nome **aspado**,
que não casa `\w+`. **199 de negócio + 1 de controle = 200.**

> A armadilha tem **duas** camadas, não uma: o baseline estar defasado, e — mesmo dentro dele — uma
> regex ingênua errar por 1 por causa do identificador aspado.

**Passo 2 — migrations pós-freeze** (169 `.cjs`, três formas sintáticas de `createTable` cobertas):

| # | Tabela | Migration | Âncora |
|---|---|---|---|
| 1 | `sale_lot_shipments` | `20260810-000039-sale-lot-shipments-quality-gate.cjs` | `:61` |
| 2 | `directorates` | `20260811-000043-create-directorates-hierarchy.cjs` | `:143` |
| 3 | `hr_time_import_batches` | `20260812-000045-create-hr-time-imports.cjs` | `:40` |
| 4 | `hr_time_import_items` | `20260812-000045` | `:80` |
| 5 | `strategic_plannings` | `20260812-000046-create-directorate-governance.cjs` | `:52` |
| 6 | `meeting_minutes` | `20260812-000046` | `:142` |
| 7 | `business_risks` | `20260812-000046` | `:196` |

**200 + 7 = 207.** Não diverge do autoritativo. Registra-se o que a coincidência **não** prova:
T-13 chegou a 207 pelo mesmo caminho aritmético — método **parcialmente correlacionado**, não
plenamente disjunto (`RES-T31-05`).

**Falsos positivos descartados:** `legal_contracts`, `legal_contract_addendums`,
`legal_contract_reminders`, `legal_intellectual_property` (`20260807-000220:68,101,127,150`;
ocorrências em `20260807-000280:258,290,312,331` estão no `down()`); `facility_vehicles`
(`20260807-000200:70`, convertida em `facility_vehicle_details`).

## 3. O que já existe — e por que **não** é semântica de coluna

| # | Corpus | Onde | Volume medido |
|---|---|---|---|
| A | `COMMENT ON COLUMN` no DDL | `00_baseline_frozen.sql` | **603** |
| B | `comment:` em model Sequelize | `server/src/models/` | **609** em **105** arquivos |
| C | `COMMENT ON COLUMN` em migration | `server/migrations/` | **120** em **34** arquivos |
| D | Dicionário de dados | `docs/database/04-DICIONARIO_DADOS.md` | **85** tabelas — **estrutural, não semântico** |

**O dicionário não cobre `C-137`.** É gerado por introspecção (`:3`); suas colunas são
`Coluna | Tipo | Nulo? | Default | Chave` (`:148`). **Não existe nele nenhuma coluna de significado
de negócio, origem ou domínio real.** Responde "qual o tipo SQL", que é exatamente o que `C-137`
declara insuficiente. **Não reduz o déficit em nenhuma tabela.**

Falta nele **122 tabelas** (207 − 85); o recorte (`:50-53`) deixa SST, RH, TI, Jurídico, Facilities,
Marketing e **todo o subsistema contábil/tesouraria** de fora.

**Contradição interna:** `:48` diz "85 de **207**"; `:40` diz "80 tabelas / **195**" — dois
denominadores a 8 linhas de distância; `:37-44` autodeclara ~120 colunas divergentes →
`AUD-DB-T31-04`.

## 4. Ordem de prioridade usada — declarada

P1 financeiro/fiscal (12) · P2 estoque/custo/qualidade (~24) · P3 compliance (~40) · P4
autorização/governança (~10) · P5 apoio e `[DEPRECATED]` (~99).

Segundo critério dentro de P1, que é ele próprio um achado — `COMMENT ON COLUMN` por tabela:

| Subsistema | `COMMENT ON COLUMN` |
|---|---|
| Pagar/receber (antigo) | **10 e 9** |
| Conciliação OFX | **5 e 4** |
| **Contabilidade** (3 tabelas) | **0, 0, 0** |
| **Tesouraria** (2) | **0, 0** |
| **CNAB** (4) | **0, 0, 0, 0** |
| **Config. bancária** | **0** |
| **Centro de custo** | **0** |

**A semântica declarada colapsa exatamente nos módulos financeiros mais recentes** →
`AUD-DB-T31-01`.

## 5. Semântica de coluna — 12 tabelas P1 (resumo dos achados estruturais)

Cobertas: `accounting_chart_of_accounts`, `accounting_entries`, `accounting_entry_items`,
`bank_statements`, `bank_statement_entries`, `cnab_remittances`, `cnab_remittance_items`,
`cnab_return_files`, `cnab_return_occurrences`, `company_banking_config`, `treasury_bank_accounts`,
`treasury_financial_operations`. **≈118 colunas** com significado, origem e domínio real
documentados.

Pontos estruturais que sustentam os findings:

- `accounting_chart_of_accounts` — `accept_entries` (analítica) **sem CHECK que o imponha**;
  `parent_id` auto-referente **sem prevenção de ciclo**; **sem `created_by`**.
- `accounting_entries` — `reversal_of_id` com **`ON DELETE SET NULL`** (`:22280`), que apaga o elo
  de estorno. `created_by NOT NULL` com FK `RESTRICT` (`:22272`) — conformidade.
- `accounting_entry_items` — `debit`/`credit` `numeric(15,2) DEFAULT 0 NOT NULL`, **sem CHECK
  `>= 0`** e **sem CHECK de exclusividade mútua**; `cost_center_id` com **`ON DELETE SET NULL`**
  (`:22296`), que desclassifica partidas históricas.
- `company_banking_config` — identidade da linha é o literal **`id = 1`**, embutido em
  `SequelizeCnabRepository.ts:24,29`; no schema há **apenas PK** (`:16651`).
- `cnab_remittances` — `sequential_number` **sem UNIQUE** (só PK `:16627`); `file_content` `text
  NOT NULL` contendo **CNPJ da empresa, conta e CPF/CNPJ + nome + endereço de cada sacado**
  (`GenerateRemittanceUseCase.ts:97-105`).
- `cnab_remittance_items` — `amount` é **saldo em aberto**, não valor de face (`:95`), fato dito
  só no código; `numeric(18,6)` contra `numeric(10,2)` e `numeric(15,2)` no resto do trânsito.
- `cnab_return_files` — `filename` **sem UNIQUE**; a coluna `duplicates_skipped` **prova, por
  existir, que reimportação é esperada e a dedup é de aplicação**.
- `cnab_return_occurrences` — `movement_code` `varchar(2)`: **domínio é tabela FEBRABAN por banco**,
  não está no schema, não está em `COMMENT`, **não é determinável** — e é o campo que decide se um
  título foi pago, protestado ou rejeitado.
- `treasury_financial_operations` — `interest_rate` `numeric(5,2)` **sem unidade declarada (% ao mês
  ou ao ano?)**; **sem CHECK `end_date >= start_date`**; **sem `created_by` nem `approved_by`** —
  contrato de empréstimo cadastrável sem registro de quem o cadastrou.

**A contraprova positiva:** `bank_statements`/`bank_statement_entries` têm `COMMENT ON COLUMN` reais
declarando a **origem externa** de cada campo (`:3833,3840,3847,3854,3861,3768,3775,3789`), incluindo
`amount` → "TRNAMT **com sinal**" e `fitid` → "usado para dedup na reimportação". Somado a
`chk_bank_statement_entries_single_match` (`:3760`), é **conformidade exemplar** — e a régua contra a
qual contábil/tesouraria/CNAB medem zero.

## 6. Colunas cuja semântica **NÃO é determinável** (17 nas 12 cobertas)

- **Classe A — enum sem rótulos no artefato lido:** 9 colunas, nenhuma com `COMMENT`.
- **Classe B — domínio externo de terceiro:** `movement_code`, `wallet_code`, `bank_code` (×2).
- **Classe C — unidade/convenção não declarada:** `interest_rate`, `cnab_remittance_items.amount`,
  `debit`/`credit`, `current_balance`.
- **Classe D — identidade em constante de código:** `company_banking_config.id = 1`.

## 7. Classificação de dado sensível — tranche P1

`cnab_remittances.file_content` **Alta** (CNPJ + conta + CPF/CNPJ, nome e endereço de cada sacado,
texto plano, sem cifragem nem retenção declarada); `company_banking_config.company_document` e
credenciais de cobrança **Alta**; `treasury_bank_accounts.manager_name`/`manager_phone` **Média**
(dado pessoal de terceiro, sem base legal declarada). **Nenhuma marcada como sensível em artefato
algum** → `AUD-DB-T31-08`.

## 8. Findings `PROPOSED`

| ID | Achado | Sev. |
|---|---|---|
| `AUD-DB-T31-01` | Semântica de coluna colapsa nos subsistemas financeiros mais recentes (11 tabelas com **0** `COMMENT`) | MEDIUM |
| `AUD-DB-T31-02` | `debit`/`credit` admitem valor que o banco aceita, o postador **ignora** (`PostEntryUseCase.ts:66-67` soma só `> 0`) e o balancete **soma** (`GetTrialBalanceUseCase.ts:58`) — duas semânticas conforme quem lê | **HIGH** |
| `AUD-DB-T31-03` | 609 `comment:` no model não chegam ao banco (603 no DDL, 120 em migrations) | MEDIUM |
| `AUD-DB-T31-04` | `04-DICIONARIO_DADOS.md` contradiz a si mesmo e não contém semântica | MEDIUM |
| `AUD-DB-T31-05` | Singleton de config bancária imposto por literal `id = 1`, não pelo schema | MEDIUM |
| `AUD-DB-T31-06` | Três precisões monetárias no mesmo trânsito de dinheiro (10,2 / 15,2 / 18,6) | MEDIUM |
| `AUD-DB-T31-07` | `treasury_bank_accounts.current_balance` é **digitado à mão**, nunca derivado, e lido como posição de caixa | **HIGH** |
| `AUD-DB-T31-08` | Ausência de convenção de classificação de dado sensível no schema | MEDIUM |

**Sobre `-07`:** rastreados **todos** os escritores — `CreateBankAccountUseCase.ts:45`,
`UpdateBankAccountUseCase.ts:18`, validados por `treasuryValidators.ts:22,33`. **Nenhum fluxo de
pagamento, recebimento, conciliação OFX, baixa CNAB ou lançamento contábil escreve nesta coluna.** É
lida como posição de caixa em `GetCashPositionUseCase.ts:32,51`. **A ausência é o achado.**

### Conformidades provadas (para não virarem falso positivo adiante)

1. **Balanceamento de partidas dobradas É validado** — `PostEntryUseCase.ts:64-80`, em centavos.
2. **Contador CNAB tem lock de linha** — `SELECT … FOR UPDATE` em `SequelizeCnabRepository.ts:24`,
   mesma transação do incremento (`:155-158`). **Não se reporta race de contador.**
3. **Nosso-número único** — `uq_cnab_remittance_items_nosso_numero` (`:21981`).
4. **Conciliação OFX com constraint no banco** — `chk_bank_statement_entries_single_match` (`:3760`).
5. `accounting_entries.created_by NOT NULL` + FK `RESTRICT` + par `approved_by`/`approved_at`.
6. UNIQUEs de tesouraria — `contract_number` (`:22142`), `(agency, account_number)` (`:22135`).
7. **Soft delete não existe no projeto** (`T-13:78`) — não há dever de filtrá-lo nestas 12 tabelas.

## 9. Cobertura declarada

| Item | Valor |
|---|---|
| Denominador reconstruído | **207** |
| Cobertas por `T-13` | **22** |
| Cobertas por **esta trilha** | **12** |
| **Total com semântica de coluna** | **34 / 207 (16,4 %)** |
| **Déficit remanescente** | **173 / 207 (83,6 %)** |

> **`C-137` NÃO está fechada.** Sai de `A(22/207)` para `A(34/207)`. O déficit registrado em
> `AUDIT_COVERAGE_EXECUTED_RODADA2.md:157,200` (185 tabelas) passa a **173**. Declarado como
> progresso mensurável e **não** como cumprimento da célula.

**Fora, e por quê:** P1 residual (10, com `cost_centers` como a mais urgente — zero `COMMENT` e
destino de FK `ON DELETE SET NULL` de `accounting_entry_items`); P2 (~26, várias já com `COMMENT`);
**P3 compliance (~76: todo `sst_*`, `hr_*`, `jur_lgpd_*`) — maior densidade de dado sensível e a
banda que o dicionário exclui por completo; recomendada como a próxima**; P4 (~9); P5 (~47, com as
18 `[DEPRECATED]` de valor marginal).

### Resíduos

`RES-T31-01` `git diff` não reconfirmado (Bash indisponível) · `RES-T31-02` 173/207 sem semântica ·
`RES-T31-03` rótulos de ENUM não extraídos · `RES-T31-04` os três corpora medidos, não reconciliados
· `RES-T31-05` denominador confirmado por método parcialmente correlacionado.

## 10. Estado

- **Célula `C-137`:** `A(34/207)` — **permanece NÃO ENTREGUE integralmente**.
- **Findings:** 8 `PROPOSED`, sendo **2 HIGH** (`-02`, `-07`) → `vericore-finding-validator`.
- **Conformidades provadas:** 7.
- Nenhuma declaração de `AUDIT_PASSED` / `RETEST_PASSED` / `FINDING CLOSED`.
