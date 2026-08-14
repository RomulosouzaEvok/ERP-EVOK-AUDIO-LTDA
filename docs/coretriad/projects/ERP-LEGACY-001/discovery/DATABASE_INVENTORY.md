# DATABASE_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

**Método:** leitura direta de migrations (`server/migrations/*.cjs`), do
dump de schema declarado (`server/database/postgresql/00_baseline_frozen.sql`
+ `00_baseline_frozen_meta.sql`) e dos models Sequelize
(`server/src/models/*.ts`, `server/src/models/index.ts`). **Nenhuma conexão
de banco aberta, nenhum comando executado, nenhum teste rodado** — conforme
a regra permanente do programa.

## Achado estrutural prévio (relevante para toda a leitura abaixo)

`server/migrations/20260731-000001-baseline-schema.cjs:1-52` documenta que a
migration "baseline" **não** roda as 160 migrations anteriores individualmente
contra um banco novo: ela aplica um `pg_dump --schema-only` **congelado**
(`00_baseline_frozen.sql`) e depois **marca** essas 160 migrations como já
aplicadas em `SequelizeMeta` — só duas delas
(`20260806-000080-create-app-role-least-privilege.cjs` e
`20260807-000231-seed-accounting-chart-of-accounts.cjs`, listadas em
`20260731-000001-baseline-schema.cjs:80-86`) continuam executando de verdade
(GRANT de role e seed de plano de contas, sem DDL).

Isso significa que **o schema real de qualquer banco novo é o
`00_baseline_frozen.sql` + as migrations posteriores ao congelamento**, não
a soma ingênua de `createTable()` em todos os 169 arquivos de migration.
Contagens abaixo: tabelas/FKs/índices/CHECKs no dump congelado (fonte de
verdade do estado após 160 migrations) + o que as migrations **posteriores**
ao congelamento (`20260810-000038` em diante) realmente criam.

## Contagens confirmadas por leitura direta

| Métrica | Valor confirmado | Como foi contado |
|---|---|---|
| Migrations (arquivos) | **169** (`server/migrations/*.cjs`) | `Grep module.exports` sobre `*.cjs`, contagem exata de arquivos |
| — das quais "congeladas" (marcadas aplicadas, não re-executam DDL) | 160 | `00_baseline_frozen_meta.sql:26-185` (bloco `COPY`) |
| — das quais rodam de verdade mesmo estando na lista congelada | 2 | `20260731-000001-baseline-schema.cjs:80-86` |
| — pós-congelamento (executam DDL real em banco novo) | 9 | `20260810-000038` até `20260812-000047` |
| Tabelas declaradas | **207** | 200 `CREATE TABLE` em `00_baseline_frozen.sql` + 7 tabelas criadas pelas 9 migrations pós-congelamento |
| Foreign keys declaradas | **478** | 459 `FOREIGN KEY` em `00_baseline_frozen.sql` + 19 `references:` nas migrations pós-congelamento que criam tabela |
| Índices (`CREATE INDEX`/`CREATE UNIQUE INDEX`) | 510 no dump congelado (39 são `UNIQUE`) | `Grep ^CREATE (UNIQUE )?INDEX` em `00_baseline_frozen.sql` |
| `UNIQUE` como constraint de tabela | 69 | idem |
| `CHECK` constraints | 97 | `Grep "CHECK ("` em `00_baseline_frozen.sql` |
| `PRIMARY KEY` | 200 (uma por tabela do dump) | idem |
| Models Sequelize (arquivos, excluindo `index.ts`) | 185 | `Glob server/src/models/*.ts` (186 arquivos − `index.ts`) |

### As 9 migrations pós-congelamento e o que cada uma realmente cria

| Migration | Tabela(s) nova(s) | FKs novas |
|---|---|---|
| `20260810-000038-bom-phantom-explosion.cjs` | nenhuma (só `addColumn` em `bill_of_material_items`) | 0 |
| `20260810-000039-sale-lot-shipments-quality-gate.cjs` | `sale_lot_shipments` | 5 |
| `20260810-000040-purchase-order-requester-not-null.cjs` | nenhuma (`changeColumn`) | 0 |
| `20260810-000041-reapply-app-role-privileges.cjs` | nenhuma (GRANT) | 0 |
| `20260811-000043-create-directorates-hierarchy.cjs` | `directorates` | 3 |
| `20260811-000044-lot-blocked-at-quality-gate.cjs` | nenhuma (`addColumn` em `lot_controls`) | 0 |
| `20260812-000045-create-hr-time-imports.cjs` | `hr_time_import_batches`, `hr_time_import_items` | 4 |
| `20260812-000046-create-directorate-governance.cjs` | `strategic_plannings`, `meeting_minutes`, `business_risks` | 7 |
| `20260812-000047-hr-absences-open-unique.cjs` | nenhuma (`UNIQUE` parcial) | 0 |

Total: 200 + 7 = **207 tabelas**; 459 + 19 = **478 FKs**.

## Comparação com o inventário anterior (`dc52081`)

`dc52081` registrava "169 migrations, 207 tabelas, 478 foreign keys". **As
três contagens bateram exatamente** com a releitura direta feita agora
contra a baseline `legacy-baseline-001` (`c9359be`) — recalculado do zero
por dois caminhos independentes (grep de arquivos de migration + grep do
DDL congelado) que convergiram para os mesmos três números, não copiado do
número antigo. Interpretação: nenhuma migration de schema foi adicionada
nem removida entre o inventário antigo e este commit, apesar de o número de
módulos de negócio (RH, JUR, Facilities, SST etc.) ter crescido bastante
nesse período — o crescimento aconteceu majoritariamente **antes** de
`dc52081`, não depois.

## Constraints e integridade — evidência de imposição real pelo banco (não só disciplina de app)

- **CHECK XOR real, não apenas validação de app**: `bank_statement_entries`
  tem `CHECK (matched_payable_id IS NULL OR matched_receivable_id IS NULL)`
  — `server/migrations/20260806-000070-create-bank-statements.cjs:168` —
  impede no banco que uma linha de conciliação bancária aponte
  simultaneamente para um título a pagar E a receber. O comentário em
  `server/src/models/index.ts:945` ("XOR — no maximo um preenchido, ver
  CHECK da migration") confirma que o model documenta a regra, e a migration
  confirma que o banco a impõe — par model↔migration verificado.
- **Triggers de imutabilidade — a prova mais forte de "banco impõe, não só
  app"**: o dump congelado contém 13 funções e 13 triggers `BEFORE DELETE`/
  `BEFORE DELETE OR UPDATE` bloqueando alteração/exclusão de registros de
  compliance:
  - `hr_lock_employee_contract`, `hr_lock_job_history`,
    `hr_lock_vacation_accrual_period`, `hr_block_delete_employee_benefit`,
    `hr_block_delete_vacation_schedule`
    (`00_baseline_frozen.sql:2704-2818`, triggers em `:22156-22184`)
  - `jur_lock_contract_addendum`, `jur_lock_legal_case_deadline`,
    `jur_lock_legal_case_event`, `jur_lock_legal_case_provision`
    (`:2818-2887`, triggers `:22191-22212`)
  - `sst_lock_acidente`, `sst_lock_cat`, `sst_lock_entrega_epi`,
    `sst_block_delete_evento_esocial`
    (`:2887-2971`, triggers `:22219-22240`)

  Estes 13 objetos são a única evidência encontrada, no escopo desta
  leitura, de regra de integridade que o banco impõe **independentemente**
  de qualquer camada de aplicação — mesmo um `UPDATE`/`DELETE` via SQL cru
  direto falharia. **Recomendação para o passo 25+/31, se convocado:**
  verificar se módulos igualmente sensíveis (ex.: `AuditLog`,
  `SaleInvoice` já emitida, `AccountingEntry` lançado) têm proteção
  equivalente — não foi encontrado trigger equivalente para eles no dump.

- **Foreign keys com `onDelete: RESTRICT` explícito** aparecem de forma
  consistente nas migrations pós-congelamento (todas as 19 FKs novas usam
  `RESTRICT` ou `SET NULL`/`CASCADE` explícitos, nunca o default implícito
  do Postgres) — reduz o risco de FK "solta" sem política de borda
  definida.

## Lacuna encontrada — soft delete NÃO existe no nível de banco

Busca de `deleted_at`/`deletedAt` no dump congelado inteiro (200 tabelas) e
`paranoid` em todos os 185 models Sequelize: **zero ocorrências em ambos**.
Não há infraestrutura de soft delete no banco declarado — nenhuma tabela tem
coluna de exclusão lógica, e nenhum model Sequelize usa `paranoid: true`. Em
paralelo, há **chamadas reais de `.destroy()` (hard delete)** em pelo menos
9 arquivos, incluindo `SequelizeProductionOrderRepository.ts`,
`SequelizeSaleRepository.ts`, `SequelizeAccountingRepository.ts`,
`RemoveProductionOrderUseCase.ts`.

Isto é uma divergência potencial entre a expectativa comum de ERP ("nada é
apagado de verdade") e a realidade declarada do schema — registrado como
`DISCOVERED_BUSINESS_BEHAVIOR`, não como bug, até validação humana: pode ser
decisão deliberada (o módulo `AuditLog` seria o registro histórico, não soft
delete por linha) ou lacuna real. **Recomendação:** qualquer auditoria de
negócio futura deve confirmar, por módulo, se a ausência de soft delete em
tabelas críticas (`sales`, `production_orders`, `accounting_entries`) é
compatível com os requisitos legais/fiscais aplicáveis.

## Campos de auditoria (createdAt/updatedAt/createdBy)

`created_at`/`createdAt`/`created_by` aparece 318 vezes no dump congelado —
presença ampla, mas **não uniforme**: `created_by`/`createdBy`
especificamente aparece em 140 linhas (aproximação por ocorrência de coluna,
não por tabela distinta). Não fechado por tabela individual nesta leitura —
lacuna de cobertura declarada; um levantamento posterior deveria produzir a
tabela completa `tabela → tem/não tem created_by` se isso entrar no escopo
de um próximo passo.

## Transações e concorrência

- `sequelize.transaction(` usado em **92 arquivos** de use cases/
  controllers/repositórios, cobrindo os fluxos de maior risco: estoque,
  MRP, financeiro, fiscal, produção, RH.
- Locking pessimista (`Transaction.LOCK` / `FOR UPDATE`) em **61 arquivos**
  — ex.: `server/src/services/inventoryService.ts:130`
  (`lock: Transaction.LOCK.UPDATE`).
- **Advisory lock de Postgres** (`pg_advisory_xact_lock`) usado em 4
  repositórios para geração de numeração sequencial sob concorrência:
  `SequelizeProductionOrderRepository.ts:118-120` (comentário explícito:
  "impede que duas transacoes concorrentes leiam o mesmo 'ultimo numero'...
  reentrante — o laco de conversao do MRP pode chamar este metodo N vezes na
  mesma transacao"), replicado em `SequelizeMasterProductionPlanRepository.ts`,
  `SequelizeMaintenanceRepository.ts`, `SequelizePurchaseRequisitionRepository.ts`.
  Coerente com o fix relatado na memória do projeto ("rodar o MRP de novo
  duplicava requisicao", commit `16a8ce3`).
- Nenhum `SET TRANSACTION ISOLATION LEVEL` explícito nem `isolationLevel` no
  código — o sistema opera no nível padrão do Postgres (READ COMMITTED) e
  compensa com locking explícito/advisory locks em vez de elevar isolamento
  globalmente. Razoável, mas qualquer novo fluxo concorrente que **não**
  adote lock explícito fica exposto a race condition sob READ COMMITTED —
  observação para findings futuros de módulos específicos.

## Achado de baixa severidade — artefatos de schema mortos no mesmo diretório

`server/database/postgresql/` contém, além dos dois arquivos autoritativos
(`00_baseline_frozen.sql`, `00_baseline_frozen_meta.sql`), os arquivos
`01_schema.sql`, `02_indexes.sql`, `03_seed_inicial.sql`, `04a`…
`04i_*_expand.sql`, `04f_production_orders_validation.sql`,
`05_add_critical_foreign_keys.sql`. Confirmado que **nenhum código de
bootstrap os referencia** — as únicas referências encontradas são
comentários históricos dentro de outras migrations (`20260805-000001`,
`20260806-000040/41/42`, `20260810-000033`) e um teste sobre tabelas órfãs
(`server/tests/unit/no-orphan-pt-schema-tables.test.ts`). São artefatos
históricos do processo de schema pré-congelamento, não um segundo caminho de
bootstrap ativo — mas sua presença ao lado do arquivo autoritativo é risco
de confusão para um leitor futuro (drift de documentação, não de execução).

## Limitação de evidência (declarada, não contornada)

Esta contagem é sobre o **schema declarado em arquivo** (migrations + dump
congelado + models). Não foi confirmado nada contra o banco `erp_evok_audio`
real (proibido nesta etapa, conforme a regra permanente e
`PRODUCTION_STATUS_MAP.md`) — não se sabe se o banco real está exatamente no
estado que este DDL implica (ex.: se alguma alteração manual foi aplicada
fora de migration). Isso deveria ser verificado por um passo de auditoria
com aprovação humana explícita, se necessário.

## Arquivos citados

- `server/migrations/20260731-000001-baseline-schema.cjs` (linhas 1-362,
  especialmente 60-102, 291-300)
- `server/database/postgresql/00_baseline_frozen.sql` (linhas 2704-2971 e
  22156-22240 — triggers; contagens agregadas acima)
- `server/database/postgresql/00_baseline_frozen_meta.sql` (linhas 26-185 —
  lista das 160 migrations congeladas)
- `server/migrations/20260806-000070-create-bank-statements.cjs:119-168`
- `server/migrations/20260810-000039-sale-lot-shipments-quality-gate.cjs`,
  `20260811-000043-create-directorates-hierarchy.cjs`,
  `20260812-000045-create-hr-time-imports.cjs`,
  `20260812-000046-create-directorate-governance.cjs`
- `server/src/models/index.ts` (185 imports, ~750 associações declaradas)
- `server/src/services/inventoryService.ts:130`
- `server/src/modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository.ts:96-120`

## Resposta final às contagens

**Migrations confirmadas por leitura direta: 169. Tabelas: 207. Foreign
keys: 478.** As três batem exatamente com os números de `dc52081` — não
houve alteração líquida de schema (contagem de migrations/tabelas/FKs) entre
aquele inventário antigo e a baseline atual `c9359be`/`legacy-baseline-001`,
apesar de o repositório ter recebido trabalho substancial de outros tipos
(governança CoreTriad, guardas, testes) nesse intervalo.

---

*Produzido pelo agente `vericore-database-auditor` em modo read-only
reforçado (Read/Grep/Glob apenas, sem Write disponível neste modo); conteúdo
persistido neste caminho pelo orquestrador a partir da resposta do agente,
sem edição de conteúdo.*
