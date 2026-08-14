# FINDING

FINDING_ID: FIND-ERP-002
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passos 21-24), fora da sequência normal do passo 31, por autorização humana explícita
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d
TITLE: Nenhuma proteção de banco (trigger/RULE/REVOKE) contra UPDATE/DELETE em audit_logs, sale_invoices (NF-e emitida) e accounting_entries (lançamento postado) — 13 tabelas de RH/JUR/SST têm essa proteção, estas três não têm nenhuma
DOMAIN: security / data-integrity / compliance
SUBDOMAIN: audit-log-immutability / database-enforcement
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: OPEN
DETECTED_BY: vericore-database-auditor (achado original em DATABASE_INVENTORY.md, passo 23) + vericore-architecture-auditor (CURRENT_ARCHITECTURE.md §6 item 6, passo 24); formalizado por vericore-audit-log-security-auditor a pedido do dono do CoreTriad

DESCRIPTION:
O dump de schema congelado (`server/database/postgresql/00_baseline_frozen.sql`)
contém 13 funções + 13 triggers `BEFORE DELETE`/`BEFORE DELETE OR UPDATE`
que bloqueiam alteração/exclusão de registros de compliance de RH, Jurídico
e SST (`hr_lock_employee_contract`, `hr_lock_job_history`,
`hr_lock_vacation_accrual_period`, `hr_block_delete_employee_benefit`,
`hr_block_delete_vacation_schedule`, `jur_lock_contract_addendum`,
`jur_lock_legal_case_deadline`, `jur_lock_legal_case_event`,
`jur_lock_legal_case_provision`, `sst_lock_acidente`, `sst_lock_cat`,
`sst_lock_entrega_epi`, `sst_block_delete_evento_esocial` — funções em
`:2704-2971`, triggers em `:22156-22240`). Estes objetos são a única
evidência, em todo o schema declarado, de regra de integridade imposta pelo
Postgres independentemente de qualquer camada de aplicação: mesmo um
`UPDATE`/`DELETE` via SQL cru direto falharia contra essas 13 tabelas.

Releitura direta confirma que **nenhuma proteção equivalente existe** para
três tabelas de risco de integridade/compliance igual ou maior:

1. **`audit_logs`** (`00_baseline_frozen.sql:3627-3708`) — o próprio registro
   de auditoria do sistema (módulo `auditLogs`, classificado PRODUÇÃO REAL
   por `APR-2026-016`). Declaração da tabela só tem `PRIMARY KEY` (`:16546-
   16547`), 4 índices (`:18583-18607`) e 1 FK `ON DELETE SET NULL` para
   `users` (`:22839-22840`). Nenhum trigger, nenhuma `RULE`, nenhum `REVOKE`
   restringindo `UPDATE`/`DELETE` da role de aplicação sobre esta tabela.

2. **`sale_invoices`** (a tabela real do módulo `sales`/`fiscal` que guarda
   a NF-e emitida — `:12153-12206`, colunas `nfe_status`
   `enum_sale_invoices_nfe_status` com valores `processing`/`authorized`/
   `denied`/`cancelled`, `:2140-2144`). Mesma ausência: só `PRIMARY KEY` +
   sequence, nenhum trigger de imutabilidade uma vez `nfe_status =
   'authorized'`.

3. **`accounting_entries`** (`:3136-3169`, `status`
   `enum_accounting_entries_status` = `draft`/`posted`/`reversed`,
   `:93-97`) — a rota `PATCH /api/accounting/entries/:id/post`
   (`server/src/modules/accounting/presentation/routes/accounting.ts:43`)
   marca o lançamento como `posted`. A imutabilidade pós-`posted` existe
   **apenas na aplicação**: `UpdateEntryUseCase.ts:57-59` —
   `if (current.status !== 'draft') { throw new BusinessRuleError(...) }`
   — bloqueia o *use case* `UpdateEntryUseCase`, mas nenhum trigger/CHECK
   impede um `UPDATE accounting_entries SET status = 'draft', ...` (ou
   qualquer alteração de coluna, incluindo remontar itens) executado por
   SQL cru, por outro caminho de código, ou por um script administrativo,
   direto contra o banco.

**Agravante confirmado por leitura de migration**: a role de runtime
`evok_app` — criada explicitamente para operar sob "privilégio mínimo"
(`server/migrations/20260806-000080-create-app-role-least-privilege.cjs:11-16`)
— recebe `GRANT SELECT, INSERT, UPDATE, DELETE` em **todas** as tabelas de
`public` sem exceção (loop sobre `pg_tables`, `:70-83`, nenhuma tabela
excluída além de `SequelizeMeta`/`SequelizeData`, `:40`). Ou seja: a
credencial que a própria API usa em produção já possui, hoje, privilégio de
banco suficiente para `UPDATE`/`DELETE` direto em `audit_logs`,
`sale_invoices` e `accounting_entries` — não é hipótese de escalonamento de
privilégio, é o privilégio concedido por padrão à role de aplicação.
`20260810-000041-reapply-app-role-privileges.cjs` (a migration que reaplica
privilégios pós-congelamento) não menciona nenhuma das três tabelas — não
estreita nem compensa esse GRANT amplo.

EXPECTED_BEHAVIOR:
Consistente com o padrão já adotado para RH/JUR/SST (13 triggers), o banco
deveria impor, independentemente da aplicação: (a) `audit_logs` nunca sofre
`UPDATE`/`DELETE` após `INSERT`; (b) `sale_invoices` com `nfe_status =
'authorized'` não sofre alteração/exclusão de campos fiscais/de
identificação da NF-e; (c) `accounting_entries` com `status = 'posted'` (e
seus `accounting_entry_items`) não sofre `UPDATE`/`DELETE` — apenas
estorno (`ReverseEntryUseCase`), como já documentado como intenção em
`UpdateEntryUseCase.ts:8-9`.

ACTUAL_BEHAVIOR:
Nenhuma das três tabelas tem qualquer trigger, `RULE` ou restrição de
privilégio de banco impedindo `UPDATE`/`DELETE` direto. A única barreira
existente é a checagem de status dentro de `UpdateEntryUseCase` (só cobre
`accounting_entries`, só cobre esse use case específico) — `audit_logs` e
`sale_invoices` não têm sequer essa barreira de aplicação confirmada nesta
leitura sobre update/delete direto de linha.

EVIDENCE:
FILE: server/database/postgresql/00_baseline_frozen.sql
LINES: 3627-3708 (declaração completa de `audit_logs` — PK, índices, FK, sem trigger); 16543-16547 (PK); 18583-18607 (índices); 22836-22840 (única FK, `ON DELETE SET NULL`)
LINES: 12153-12206 (declaração completa de `sale_invoices`); 2140-2144 (enum `nfe_status`)
LINES: 3136-3169 (declaração completa de `accounting_entries`); 90-97 (enum `status`: draft/posted/reversed)
LINES: 2704-2971 (13 funções de trigger de imutabilidade RH/JUR/SST); 22156-22240 (13 CREATE TRIGGER correspondentes)

FILE: server/migrations/20260806-000080-create-app-role-least-privilege.cjs
LINES: 11-16 (intenção declarada de "privilégio mínimo"); 40 (única exclusão: SequelizeMeta/SequelizeData); 70-83 (GRANT SELECT/INSERT/UPDATE/DELETE em todas as tabelas de public, via loop, sem exceção para as 3 tabelas do achado)

FILE: server/migrations/20260810-000041-reapply-app-role-privileges.cjs
Nenhuma ocorrência de `accounting_entries`, `sale_invoices` ou `audit_logs` (grep confirmado) — não adiciona nem remove restrição sobre essas tabelas.

FILE: server/src/modules/accounting/application/use-cases/entry/UpdateEntryUseCase.ts
LINES: 8-9 (comentário: "depois de postado os itens ficam imutáveis... a única forma de desfazer é ReverseEntryUseCase"); 57-59 (`if (current.status !== 'draft') throw new BusinessRuleError(...)` — única barreira, e é de aplicação, não de banco)

FILE: server/src/modules/accounting/presentation/routes/accounting.ts
LINE: 43 (`router.patch('/entries/:id/post', authorizeModule('contabilidade', 'approve'), accountingEntryController.post)`)

RELATED_PROCESS: geração de trilha de auditoria; emissão fiscal (NF-e); fechamento contábil
RELATED_BUSINESS_RULE: Master Spec §20 (registro completo e não adulterável de "quem mudou o quê, quando e de onde")
RELATED_REQUIREMENT: imutabilidade de audit log (implícito, ASVS V7/V1.2); imutabilidade fiscal pós-emissão; imutabilidade contábil pós-postagem
RELATED_USE_CASE: UpdateEntryUseCase, ReverseEntryUseCase, PostEntryUseCase (accounting); logAction/auditLogService (audit); emissão de NF-e (sales/fiscal)
RELATED_ACCEPTANCE_CRITERIA: N/A — não há AC formal de imutabilidade de banco documentado para estas 3 tabelas (lacuna de requisito, não só de implementação)
RELATED_TEST: não verificado nesta leitura se existe teste que tente `UPDATE`/`DELETE` direto via SQL cru contra essas tabelas e espere falha — dado que não há trigger, qualquer teste desse tipo teria que estar ausente ou estaria falhando

BUSINESS_IMPACT: Um autor de ação crítica (ou qualquer processo/credencial com acesso à role `evok_app`, que é a própria credencial de runtime da API) pode apagar ou alterar seu próprio registro de auditoria, adulterar uma NF-e já emitida/autorizada perante o Fisco, ou reabrir um lançamento contábil já postado — sem deixar rastro no nível de banco, contornando totalmente a garantia de "quem mudou o quê" que o Master Spec §20 exige. Risco de compliance fiscal/contábil (NF-e alterada pós-autorização é falsidade documental) e de integridade forense do audit log.
TECHNICAL_IMPACT: A garantia de imutabilidade dessas 3 tabelas depende 100% da disciplina de cada caminho de código chamar o use case "certo" — qualquer script administrativo, migration futura, acesso direto ao banco, ou bug em um caminho de código que não seja `UpdateEntryUseCase` bypassa a proteção sem qualquer erro de banco.
SECURITY_IMPACT: Ausência de defesa em profundidade (defense-in-depth) — a única camada de proteção é a aplicação, e a própria credencial de runtime da aplicação (`evok_app`) já tem o privilégio de banco necessário para violar a garantia, tornando um bug de aplicação (não só um comprometimento de credencial administrativa) suficiente para a violação.

REPRODUCTION (nível de banco, hipotética — não executada, proibido pela regra permanente):
1. Autenticar como a role `evok_app` (a mesma credencial que a API usa em runtime).
2. `UPDATE audit_logs SET old_values = NULL, new_values = '{}' WHERE id = <qualquer>;` — sucede, pois não há trigger/RULE bloqueando.
3. `UPDATE sale_invoices SET nfe_status = 'cancelled', nfe_key = NULL WHERE id = <NF-e autorizada>;` — sucede.
4. `UPDATE accounting_entries SET status = 'draft' WHERE status = 'posted' AND id = <qualquer>;` seguido de `UPDATE accounting_entry_items ...` — sucede, pois a checagem de status só existe dentro de `UpdateEntryUseCase`, não no banco.

ROOT_CAUSE_HYPOTHESIS: A decisão de impor imutabilidade via trigger de banco foi tomada módulo a módulo (RH, JUR, SST) em vez de como política uniforme do sistema — os módulos `auditLogs`, `sales`/fiscal e `accounting` não passaram pelo mesmo tratamento, possivelmente por serem mais antigos que a introdução do padrão de trigger, ou por decisão implícita não documentada (consistente com `CURRENT_ARCHITECTURE.md` §6 item 6: "Enforcement de invariante crítica delegado ao banco, seletivamente").
REFERENCE: Master Spec §20; OWASP ASVS V1.2 (Authentication/Session — princípio de defesa em profundidade), V7 (Error Handling and Logging); `docs/coretriad/projects/ERP-LEGACY-001/discovery/DATABASE_INVENTORY.md` (seção "Constraints e integridade"); `CURRENT_ARCHITECTURE.md` §3 e §6 item 6.
RECOMMENDATION: Adicionar trigger `BEFORE UPDATE OR DELETE` (mesmo padrão de `hr_lock_employee_contract`) em `audit_logs` (bloqueio total, sem exceção), `sale_invoices` (bloqueio condicionado a `nfe_status IN ('authorized')`, permitindo apenas transições esperadas como `cancelled` via fluxo de cancelamento fiscal formal, se existir), e `accounting_entries`/`accounting_entry_items` (bloqueio condicionado a `status = 'posted'`). Avaliar também revogar `UPDATE`/`DELETE` da role `evok_app` nessas 3 tabelas especificamente e criar uma role/função de banco restrita (ex.: `SECURITY DEFINER`) para os poucos fluxos legítimos que precisam gravar nelas (INSERT em `audit_logs`; transição de status via `PostEntryUseCase`/`ReverseEntryUseCase`). (Remediação é da SanaCore — VeriCore não corrige; nenhuma remediação foi aplicada neste finding.)
SUGGESTED_REMEDIATION_OWNER: SanaCore

RETEST_SPECIFICATION:
(a) `\d+ audit_logs` (ou dump de schema) mostra trigger `BEFORE UPDATE OR DELETE` ativo, e uma tentativa de `UPDATE`/`DELETE` direto via SQL (executada por instância de teste, não produção) falha com erro de banco.
(b) Idem para `sale_invoices` quando `nfe_status = 'authorized'`.
(c) Idem para `accounting_entries`/`accounting_entry_items` quando `status = 'posted'`.
(d) Teste automatizado (integração, contra banco de teste) cobrindo os 3 cenários acima, falhando hoje e passando após remediação.
(e) Confirmar que os fluxos legítimos de escrita (INSERT em audit_logs via `logAction`; `PostEntryUseCase`/`ReverseEntryUseCase`; emissão/cancelamento fiscal formal) continuam funcionando sem regressão.

NOTA DE STATUS: Nenhuma remediação foi aplicada neste finding — este é um registro de discovery formalizado antecipadamente por autorização explícita do dono do CoreTriad (fora da sequência normal do passo 31). STATUS permanece OPEN até passar pelo `vericore-finding-validator` (obrigatório para HIGH) e, em seguida, seguir o fluxo normal de remediação (SanaCore) e reteste/fechamento (exclusivo de VeriCore, Regra 4 do CLAUDE.md).

---

Arquivos lidos/citados nesta verificação (todos leitura direta, nenhuma
conexão de banco):
- `server/database/postgresql/00_baseline_frozen.sql` (linhas 3136-3169,
  3627-3708, 12153-12206, 2140-2144, 90-97, 2704-2971, 22156-22240,
  16543-16547, 18583-18607, 22836-22840)
- `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`
- `server/migrations/20260810-000041-reapply-app-role-privileges.cjs`
- `server/src/modules/accounting/application/use-cases/entry/UpdateEntryUseCase.ts`
- `server/src/modules/accounting/presentation/routes/accounting.ts`
- `docs/coretriad/projects/ERP-LEGACY-001/discovery/DATABASE_INVENTORY.md`
- `docs/coretriad/projects/ERP-LEGACY-001/discovery/CURRENT_ARCHITECTURE.md`

---

*Produzido pelo agente `vericore-audit-log-security-auditor` em modo
read-only reforçado; conteúdo persistido neste caminho pelo orquestrador a
partir da resposta do agente, sem edição de conteúdo.*

## Validação (finding-validator)

BUSCA POR CONTROLE COMPENSATÓRIO:
- Grep por `audit_logs|sale_invoices|accounting_entries` em todo
  `server/database/postgresql/00_baseline_frozen.sql`: confirma que as
  únicas ocorrências dessas 3 tabelas no arquivo inteiro são ENUM/TYPE,
  `CREATE TABLE`, comentários de coluna, `CREATE SEQUENCE`,
  `ALTER TABLE ... SET DEFAULT`, `PRIMARY KEY`, `UNIQUE CONSTRAINT`,
  índices (`btree`) e `FK CONSTRAINT` — nenhuma linha de `CREATE TRIGGER`,
  `CREATE RULE` ou `REVOKE` associada a nenhuma das três.
- Grep por `REVOKE` no arquivo inteiro: **zero ocorrências** em todo o
  dump congelado (não há nenhum REVOKE, para nenhuma tabela, em lugar
  nenhum do baseline — refuta a hipótese de um REVOKE isolado ter
  escapado da varredura original).
- Grep por `CREATE RULE|DO INSTEAD` no arquivo inteiro: **zero
  ocorrências** — não há nenhuma `RULE` no schema, muito menos uma
  `DO INSTEAD NOTHING` sobre as 3 tabelas.
- Grep por `CREATE TRIGGER` no arquivo inteiro: exatamente 13 resultados
  (`00_baseline_frozen.sql:22156-22240`), todos com nomes
  `trg_hr_*`/`trg_jur_*`/`trg_sst_*`, cobrindo apenas as tabelas
  `hr_employee_benefits`, `hr_vacation_schedules`,
  `hr_employee_contracts`, `hr_employee_job_history`,
  `hr_vacation_accrual_periods`, `jur_contract_addendums`,
  `jur_legal_case_deadlines`, `jur_legal_case_events`,
  `jur_legal_case_provisions`, `sst_eventos_esocial`, `sst_acidentes`,
  `sst_cats`, `sst_entregas_epi` — nenhum trigger com nome que escape do
  padrão `hr_`/`jur_`/`sst_`, e nenhum trigger em `audit_logs`,
  `sale_invoices` ou `accounting_entries`. Confirma o achado com exatidão:
  são exatamente os 13 citados, nem um a mais.
- Releitura completa de
  `server/migrations/20260806-000080-create-app-role-least-privilege.cjs`
  (133 linhas): `EXCLUDED_TABLES = ['SequelizeMeta', 'SequelizeData']`
  (L40) é a única exclusão do loop de GRANT (L70-83); nenhuma menção a
  `audit_logs`, `sale_invoices` ou `accounting_entries` em nenhuma
  linha do arquivo.
- Releitura completa de
  `server/migrations/20260810-000041-reapply-app-role-privileges.cjs`
  (125 linhas): mesma lógica, mesma `EXCLUDED_TABLES`, mesma ausência de
  menção às 3 tabelas; o `down()` é intencionalmente vazio (não reverte
  nada), o que não afeta o `up()` já aplicado.
- Listagem de todo `server/migrations/` datado após
  `20260810-000041` (via glob de `server/migrations/202608*`, 149
  arquivos no total) seguida de grep dirigido por
  `audit_logs|sale_invoices|accounting_entries` em toda a pasta de
  migrations: 9 arquivos citam alguma das 3 tabelas
  (`20260731-000009-align-audit-log-optional-columns.cjs`,
  `20260806-000041-fix-orphan-pt-schema-user-columns.cjs`,
  `20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs`,
  `20260806-000100-create-sale-invoices.cjs`,
  `20260807-000230-create-accounting-module.cjs`,
  `20260810-000036-extend-audit-log-action-enum.cjs`,
  `20260810-000039-sale-lot-shipments-quality-gate.cjs`,
  `20260811-000044-lot-blocked-at-quality-gate.cjs`,
  `20260812-000046-create-directorate-governance.cjs`). Lidas as
  posteriores a 20260810-000041: `20260810-000036` apenas estende o
  ENUM `enum_audit_logs_action` com 9 valores novos (`ALTER TYPE ... ADD
  VALUE`, nenhum trigger/GRANT/REVOKE); `20260812-000046` não contém
  `REVOKE`, `GRANT`, `CREATE TRIGGER` nem `CREATE RULE` associados às 3
  tabelas (grep dirigido, zero ocorrências de padrão de privilégio).
  Nenhuma migration posterior estreita o GRANT amplo nem adiciona
  proteção de banco às 3 tabelas.
- Grep por hooks de model Sequelize (`beforeUpdate|beforeDestroy|
  beforeBulkUpdate|beforeBulkDestroy`) em todo `server/src`: **zero
  ocorrências** — não existe hook de nenhum tipo, em nenhum model,
  bloqueando update/delete cru a nível de ORM.
- Grep por padrão genérico de interceptação de query
  (`sequelize.addHook|hooks:\s*\{|beforeQuery|query.*intercept`) em todo
  `server/src`: única ocorrência é `server/src/models/User.ts:118`
  (`hooks: { beforeSave: ... }`), que hashea senha com bcrypt — sem
  qualquer relação com `audit_logs`, `sale_invoices` ou
  `accounting_entries`, e sem qualquer proxy de query genérico no
  projeto (nenhum "gateway" de acesso a dados centralizado que pudesse
  ocultar uma checagem).
- Grep pelas classes/models de `AuditLog`, `SaleInvoice`,
  `AccountingEntry`: nenhum model nomeado dessa forma contém hook de
  ciclo de vida; o repositório de `accounting`
  (`server/src/modules/accounting/infrastructure/sequelize/
  SequelizeAccountingRepository.ts`) foi localizado e não define
  hooks de model — a única barreira encontrada continua sendo a
  checagem de aplicação já citada no finding original
  (`UpdateEntryUseCase.ts:57-59`), específica de um único use case.
- Nenhum `middleware`/`interceptor`/`policy`/`guard` de nível de rota foi
  encontrado bloqueando `UPDATE`/`DELETE` cru contra essas 3 tabelas — a
  arquitetura do projeto não tem um proxy de query central (confirmado
  pela ausência de qualquer hit de `beforeQuery`/interceptação genérica).

RESULTADO DA BUSCA: nenhum controle compensatório encontrado, em nenhuma
camada (banco: trigger/RULE/REVOKE — zero; privilégio: GRANT amplo
confirmado sem exclusão dessas 3 tabelas em nenhuma das duas migrations
nem em nenhuma migration posterior; aplicação: nenhum hook de model,
nenhum middleware/interceptor genérico — apenas a checagem pontual já
citada no finding original, dentro de um único use case, que não cobre
`audit_logs` nem `sale_invoices`). A busca exaustiva confirma, em vez de
refutar, cada alegação do finding original: os 13 triggers citados são
exatamente os únicos existentes no schema; o GRANT amplo é exatamente como
descrito, sem exceção; e nenhuma migration ou linha de código posterior ao
`AUDIT_COMMIT` fecha a lacuna.

VEREDITO: **CONFIRMED**
JUSTIFICATIVA: A refutação foi tentada em três frentes exigidas pelo
método (banco, privilégio de role, aplicação) e nenhuma produziu um
controle compensatório. No nível de banco, grep exaustivo por
`CREATE TRIGGER`, `CREATE RULE`/`DO INSTEAD` e `REVOKE` no dump de schema
inteiro confirma zero objetos de proteção para as 3 tabelas e exatamente
os 13 triggers já citados para RH/JUR/SST — nenhum trigger com nome fora
do padrão `hr_`/`jur_`/`sst_` escapou da varredura original. No nível de
privilégio, releitura linha a linha das duas migrations de GRANT
(`20260806-000080` e `20260810-000041`) confirma que a única exclusão em
ambas é `SequelizeMeta`/`SequelizeData`, e uma varredura de todas as
migrations datadas após `20260810-000041` não encontrou nenhum `REVOKE`
específico subsequente sobre as 3 tabelas. No nível de aplicação, grep por
hooks de ciclo de vida de model Sequelize (`beforeUpdate`,
`beforeDestroy`, `beforeBulkUpdate`, `beforeBulkDestroy`) em todo
`server/src` não retornou nenhuma ocorrência, e a única estrutura
parecida com interceptação de query (`hooks: {...}` em `User.ts:118`) é
hash de senha, sem relação com as tabelas do achado — não existe proxy de
query central, gateway de acesso a dados ou middleware de rota que
pudesse compensar a ausência de trigger. A única barreira real
encontrada continua sendo exatamente a já citada no finding
(`UpdateEntryUseCase.ts:57-59`), que cobre apenas `accounting_entries` e
apenas esse use case específico — não `audit_logs`, não `sale_invoices`,
e não qualquer outro caminho de escrita em `accounting_entries` (script
administrativo, migration futura, acesso direto). O achado é reproduzível
por leitura estática determinística (schema + migrations + código),
sem necessidade de execução contra banco — consistente com a proibição
de tocar produção. Nada na busca reduz a severidade (HIGH permanece
apropriada: GRANT amplo real da credencial de runtime + ausência total de
defesa em profundidade em 3 tabelas de maior valor probatório/fiscal/
contábil do sistema) nem a confiança (CONFIRMED). Segue para
consolidação como CONFIRMED, elegível para remediação pela SanaCore
(Regra 22 do CLAUDE.md). Nenhuma correção foi aplicada por este agente —
apenas leitura e veredito, conforme Regra 2 do CLAUDE.md e o escopo do
`vericore-finding-validator`.
