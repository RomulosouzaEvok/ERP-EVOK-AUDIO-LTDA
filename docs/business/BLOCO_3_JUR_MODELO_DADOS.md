# BLOCO 3 — Módulo Jurídico (JUR) — Modelo de Dados

**Departamento:** 16 — Jurídico.
**Insumos:** `docs/business/briefs/BRIEF_JUR_2026-08-06.md` (brief de
domínio) e `docs/business/BLOCO_3_JUR_REQUISITOS.md` (46 RF-JUR, 5 RNF-JUR,
UC-52 a UC-56, §6 "Decisões e Pendências para Arquitetos").
**Autor:** `AdmDBA`.
**Data:** 2026-08-07.
**Status:** 🟢 `[IMPLEMENTADO]` — **migrations APLICADAS e no baseline
congelado** (`server/database/postgresql/00_baseline_frozen.sql`). Medido em
2026-08-12: **18 tabelas `jur_*`** no banco `erp_evok_audio`, idênticas em
`erp_evok_audio_test`.

> **Status original deste documento (2026-08-07), mantido como histórico:**
> "🟡 Migrations criadas, **não aplicadas** (aguardando aprovação do dono do
> produto após revisão do `AuditorIntegrador`, mesma convenção dos Blocos
> 1/2)". Nota obsoleta, corrigida pela auditoria documental de 2026-08-11/12.
> O restante do documento continua válido.

---

## 0. Nota de nomenclatura

**Correção de auditoria (`AuditorIntegrador`, `docs/business/BLOCO_3_JUR_AUDITORIA.md`):**
a primeira versão desta seção defendia tabelas **sem** prefixo (`contracts`,
`legal_cases`, `proxies`, `intellectual_property`...), alegando não-colisão
com o schema existente. Essa decisão divergia do contrato de API
(`BLOCO_3_JUR_API.md`), que desde a primeira versão já assumia o prefixo
`jur_`. A auditoria cruzada resolveu a divergência a favor do prefixo,
porque o precedente real e forte do projeto é **prefixar toda tabela nova
de módulo** (`sst_*` no Bloco 1, `it_*` no Bloco 2) — e nomes como
`contracts`/`legal_cases` são genéricos o bastante para colidir com um
futuro módulo de Vendas ("contrato" de venda) ou Cobrança ("caso" de
cobrança). Todas as 16 tabelas novas deste bloco (12 migrations,
`20260807-000260` a `20260807-000271`, renumeradas para rodar depois da
migration `20260807-000220` que já criava um módulo Jurídico enxuto —
ver `docs/business/BLOCO_3_JUR_AUDITORIA.md` §"Plano de Substituição")
usam o prefixo `jur_`: `jur_contracts`, `jur_contract_documents`,
`jur_contract_signatories`, `jur_contract_addendums`, `jur_external_lawyers`,
`jur_legal_cases`, `jur_legal_case_events`, `jur_legal_case_deadlines`,
`jur_legal_case_provisions`, `jur_legal_alerts`, `jur_proxies`,
`jur_intellectual_property`, `jur_ip_contract_links`,
`jur_lgpd_processing_activities`, `jur_lgpd_data_subject_requests`,
`jur_lgpd_incidents`. Colunas continuam em inglês, snake_case, sem
tradução (§14.5 do documento de requisitos permanece válido: não há
mapeamento PT-BR↔inglês a fazer neste módulo).

---

## 1. Cluster Contratos (Processo P1) — UC-52

### 1.1 `jur_contracts` — migration `20260807-000260`

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | INTEGER PK | autoincrement | |
| contract_number | VARCHAR(20) | NOT NULL, UNIQUE | Gerado pela aplicação (CT-AAAA-NNNN) — RF-JUR-001 |
| contract_type | ENUM(10 valores) | NOT NULL | commercial/employment/supplier/service/rental/nda/distribution/commercial_representation/trademark_license/other |
| object | TEXT | NOT NULL | |
| counterparty_type | ENUM(4 valores) | NOT NULL | supplier/client/employee/other |
| supplier_id | INTEGER | NULL, FK → `suppliers.id` RESTRICT | |
| client_id | INTEGER | NULL, FK → `clients.id` RESTRICT | |
| employee_id | INTEGER | NULL, FK → `employees.id` RESTRICT | |
| counterparty_name / counterparty_doc | VARCHAR | NULL | Contraparte avulsa (`counterparty_type='other'`) |
| value | DECIMAL(18,6) | NULL, CHECK ≥ 0 | |
| currency | VARCHAR(3) | NOT NULL, default `BRL` | |
| start_date / end_date | DATE | NULL | `end_date IS NULL` = vigência indeterminada |
| renewal_auto | BOOLEAN | NOT NULL, default false | |
| notice_days | INTEGER | NULL, CHECK ≥ 0 | Janela de denúncia (RF-JUR-006) |
| adjustment_index | ENUM(5 valores) | NOT NULL, default `none` | ipca/igpm/inpc/other/none — RF-JUR-007 |
| adjustment_base_date | DATE | NULL | |
| alert_advance_days | INTEGER | NOT NULL, default 60, CHECK ≥ 0 | Antecedência do alerta de vencimento (RF-JUR-005) |
| clause_checklist | JSONB | NULL | Checklist PI/confidencialidade/não-concorrência (RF-JUR-010) |
| status | ENUM(8 valores) | NOT NULL, default `draft` | draft→in_approval→approved→signed→active→(expired\|terminated\|canceled) |
| approved_by / approved_at | INTEGER / TIMESTAMP | NULL | |
| signed_at | DATE | NULL | |
| responsible_user_id | INTEGER | NULL, FK → `users.id` RESTRICT | Obrigatório só para `active` (CHECK) |
| termination_reason / termination_date | TEXT / DATE | NULL | Obrigatórios juntos quando `status='terminated'` (CHECK) |
| created_by | INTEGER | NOT NULL, FK → `users.id` RESTRICT | |
| created_at / updated_at | TIMESTAMP | NOT NULL | |

**Contraparte polimórfica mutuamente exclusiva (§6.2 do documento de
requisitos, decisão explícita repassada):** `ck_jur_contracts_counterparty_exclusive`
garante, via `CHECK` com 4 ramos `OR`, que exatamente **uma** das 4
alternativas está preenchida (supplier XOR client XOR employee XOR
nome/doc avulso), condicionada a `counterparty_type`. Precedente aceito
pelo projeto: `CHECK` de exclusividade mútua entre FKs nullable (mesma
família de solução de `sst_matriz_epi`, ainda que lá seja "pelo menos um";
aqui é "exatamente um").

**`responsible_user_id` nullable + CHECK de ativação:** rascunho pode não
ter gestor definido; a transição para `active` é bloqueada em banco
(`ck_jur_contracts_active_requires_responsible`) — reforça RF-JUR-005/E1 de
UC-52 além da validação de aplicação.

**Sem trigger de máquina de estados:** ao contrário de SST, `jur_contracts`
não tem trigger impedindo `expired`/`terminated → active` — é enforcement
de aplicação (RF-JUR-009/BR-JUR-006), porque a transição inválida em si não
tem valor probatório a proteger de bypass administrativo direto (diferente
de "baixa de prazo fatal" ou "provisão", que SÃO protegidas por trigger —
ver §3).

### 1.2 `jur_contract_documents`, `jur_contract_signatories`, `jur_contract_addendums` — migration `20260807-000261`

| Tabela | Colunas-chave | FK | Observação |
|---|---|---|---|
| `jur_contract_documents` | contract_id, version_number (UNIQUE par), file_url, author_id, uploaded_at, observations, is_signed_version | `contract_id`→jur_contracts RESTRICT · `author_id`→users RESTRICT | Minuta versionada (RF-JUR-002) |
| `jur_contract_signatories` | contract_id, signatory_role (`party_a`/`party_b`/`witness`), name, document, employee_id, signed_at | `contract_id`→jur_contracts RESTRICT · `employee_id`→employees RESTRICT (nullable) | Mínimo 2 `party_*` exigido em aplicação antes de `signed`/`active` (BR-JUR-004, E3 UC-52) |
| `jur_contract_addendums` | contract_id, addendum_number (UNIQUE par), addendum_type, description, previous/new_end_date, previous/new_value, document_url, signed_at, created_by | `contract_id`→jur_contracts RESTRICT · `created_by`→users RESTRICT | **Append-only** (ver §5) |

`jur_contract_addendums` é protegida pela trigger `trg_jur_lock_contract_addendum`
(imutável desde o INSERT, nenhuma exceção de coluna) — RF-JUR-008 exige
"preservando o histórico do aditivo e os valores anteriores imutáveis".
Ao ser assinado, a aplicação atualiza `jur_contracts.end_date`/`value` na
MESMA transação do INSERT do aditivo — o aditivo em si nunca é editado
depois.

---

## 2. Contencioso — Processos, Andamentos, Advogados (Processo P2) — UC-53

### 2.1 `jur_external_lawyers` — migration `20260807-000262`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | INTEGER PK | |
| full_name | VARCHAR(150) | NOT NULL |
| oab_number | VARCHAR(30) | NOT NULL |
| law_firm, document, contact_email, contact_phone, specialty, fee_terms | VARCHAR/TEXT | NULL |
| supplier_id | INTEGER | NULL, **UNIQUE**, FK → `suppliers.id` RESTRICT | Vínculo 1:1 opcional para faturamento via AP |
| active | BOOLEAN | NOT NULL, default true |

### 2.2 `jur_legal_cases` — migration `20260807-000263`

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | INTEGER PK | | |
| case_number | VARCHAR(30) | NOT NULL, UNIQUE | Número CNJ |
| case_type | ENUM(6 valores) | NOT NULL | labor/civil/tax/consumer/regulatory/administrative |
| case_role | ENUM(3 valores) | NOT NULL | plaintiff/defendant/third_party |
| opposing_party_name | VARCHAR(200) | NOT NULL | |
| opposing_party_employee_id / _supplier_id / _client_id | INTEGER | NULL, FK RESTRICT cada | No máximo **1** preenchida (CHECK) |
| court | VARCHAR(150) | NULL | Vara/tribunal |
| external_lawyer_id | INTEGER | NULL, FK → `jur_external_lawyers.id` RESTRICT | |
| claim_value | DECIMAL(18,6) | NULL | Valor da causa |
| internal_responsible_user_id | INTEGER | NOT NULL, FK → `users.id` RESTRICT | |
| status | ENUM(5 valores) | NOT NULL, default `active` | active/won/lost/settled/archived |
| outcome_amount / outcome_installments | DECIMAL / INTEGER | NULL | |
| closed_at | TIMESTAMP | NULL, obrigatório quando `status` é final (CHECK) | |
| next_risk_reassessment_due_at | DATE | NULL | Pendência de reavaliação (RF-JUR-017) |
| created_by | INTEGER | NOT NULL, FK → `users.id` RESTRICT | |

**`opposing_party_employee_id` RESTRICT (nunca `SET NULL`/`CASCADE`):** a
FK preserva o vínculo mesmo após desligamento do funcionário — prescrição
trabalhista de até 5+2 anos (RNF-JUR-03, UC-53 A1). O funcionário nunca é
excluído fisicamente de `employees` (padrão "sem soft delete" do CLAUDE.md
§7, já aplicado hoje), então não há risco de órfão no fluxo normal.

### 2.3 `jur_legal_case_events` — migration `20260807-000264` (append-only)

| Coluna | Tipo | Constraints |
|---|---|---|
| legal_case_id | INTEGER | NOT NULL, FK RESTRICT |
| event_type | ENUM(6 valores) | NOT NULL — petition/hearing/decision/appeal/deposit/other |
| occurred_at | TIMESTAMP | NOT NULL |
| description | TEXT | NOT NULL |
| document_url | VARCHAR(255) | NULL |
| created_by | INTEGER | NOT NULL, FK RESTRICT |

Trigger `trg_jur_lock_legal_case_event` bloqueia **100%** de UPDATE/DELETE
(mais estrita que `sst_lock_*`, que permitem UPDATE pontual de colunas de
status — aqui não há status próprio, é puramente insert-only). Correção =
novo registro (RF-JUR-014). `event_type='decision'` é o gatilho de
reavaliação de risco obrigatória (RF-JUR-017); a atualização de
`jur_legal_cases.next_risk_reassessment_due_at` é responsabilidade do use-case,
não de trigger (regra de PROCESSO, não invariante estrutural).

---

## 3. Prazos Processuais Fatais (núcleo crítico) — migration `20260807-000265` — UC-54

`jur_legal_case_deadlines` é a tabela mais protegida do bloco, seguindo
literalmente as 5 decisões repassadas no documento de requisitos:

| Coluna | Tipo | Constraints |
|---|---|---|
| legal_case_id | INTEGER | NOT NULL, FK → `jur_legal_cases.id` RESTRICT |
| description | VARCHAR(200) | NOT NULL |
| due_date | DATE | NOT NULL — informada manualmente, sistema não calcula (RF-JUR-023) |
| is_fatal | BOOLEAN | NOT NULL, default true |
| **responsible_user_id** | INTEGER | **NOT NULL, sem exceção** (item 4 da decisão repassada) |
| backup_user_id | INTEGER | NULL, FK RESTRICT |
| escalation_user_id | INTEGER | NULL, FK RESTRICT — **obrigatório se `is_fatal=true`** (CHECK) |
| status | ENUM(5 valores) | `pending`→`fulfilled_pending_confirmation`→(`confirmed`\|`missed`→`confirmed_late`) |
| acknowledged_at | TIMESTAMP | NULL |
| evidence_file_path | VARCHAR(255) | NULL — 1ª confirmação (protocolo) |
| fulfilled_by / fulfilled_at | INTEGER / TIMESTAMP | NULL |
| confirmed_by / confirmed_at | INTEGER / TIMESTAMP | NULL — **`fulfilled_by ≠ confirmed_by`** (CHECK) |
| escalated_at, missed_at | TIMESTAMP | NULL |
| retroactive_justification | TEXT | NULL — obrigatória quando `status='confirmed_late'` (CHECK) |
| created_by | INTEGER | NOT NULL, FK RESTRICT |

**5 CHECK constraints de banco** (não só validação de aplicação):

1. `ck_jur_legal_case_deadlines_fatal_requires_escalation` — `is_fatal=false OR escalation_user_id IS NOT NULL`.
2. `ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct` — `fulfilled_by IS NULL OR confirmed_by IS NULL OR fulfilled_by <> confirmed_by` (RF-JUR-024, BR-JUR-013, E2 de UC-54).
3. `ck_jur_legal_case_deadlines_confirmed_requires_evidence` — `status IN ('confirmed','confirmed_late')` exige `fulfilled_by`, `confirmed_by` E `evidence_file_path` preenchidos.
4. `ck_jur_legal_case_deadlines_confirmed_late_requires_justification` — `status='confirmed_late'` exige `retroactive_justification` (RF-JUR-025, BR-JUR-014, E3 de UC-54).

**Imutabilidade pós-confirmação (trigger `trg_jur_lock_legal_case_deadline`):**
DELETE é **sempre** bloqueado (RF-JUR-044); UPDATE é bloqueado apenas
quando `OLD.status IN ('confirmed','confirmed_late')` — a "baixa de prazo
fatal" citada explicitamente na decisão repassada (item 3) como candidata a
imutabilidade estrutural, mesmo racional das triggers `sst_lock_*`.

**RNF-JUR-04 (alertas de prazo fatal não podem ser desativados por
ninguém, nem admin):** garantido por **ausência estrutural** — não existe
nenhuma coluna `disabled`/`muted`/`active` nesta tabela nem em
`jur_legal_alerts` (§4). Não há nada para desativar, mesmo via `UPDATE` manual
via `psql`.

---

## 4. `jur_legal_alerts` — entidade única de alerta — migration `20260807-000267`

| Coluna | Tipo | Constraints |
|---|---|---|
| origin_type | ENUM(5 valores) | NOT NULL — contract/proxy/intellectual_property/lgpd_request/legal_case_deadline |
| origin_id | INTEGER | NOT NULL, **sem FK** (polimórfico, mesma exceção documentada de `sst_acoes_corretivas`/`sst_eventos_esocial`) |
| alert_subtype | VARCHAR(40) | NOT NULL — ex.: `expiration`, `renewal_notice`, `d7`, `d3`, `d1`, `d0`, `escalation`, `annuity`, `response_d5` |
| due_date | DATE | NOT NULL |
| recipient_user_id | INTEGER | NOT NULL, FK RESTRICT |
| status | ENUM(4 valores) | `pending`/`acknowledged`/`escalated`/`resolved` |
| acknowledged_at, escalated_to_user_id, escalated_at, resolved_at | | NULL |

Cobre RF-JUR-005 (vencimento de contrato), 006 (denúncia), 022 (D-7/D-3/D-1/D0
de prazo fatal), 027 (vencimento de procuração), 032 (renovação/anuidade
de PI) e 038 (D-5/D-1 de solicitação LGPD) em uma única tabela — evita 5
tabelas quase-idênticas para o mesmo conceito de "lembrete com
destinatário e prazo". `origin_id` sem FK real é a mesma exceção
arquitetural documentada em `BLOCO_1_SST_MODELO_DADOS.md` §2 (5 tabelas
heterogêneas de origem tornariam 4 colunas de FK sempre vazias por linha
sem ganho real de integridade — resolução em aplicação).

---

## 5. `jur_legal_case_provisions` — append-only (CPC 25) — migration `20260807-000266`

| Coluna | Tipo | Constraints |
|---|---|---|
| legal_case_id | INTEGER | NOT NULL, FK RESTRICT |
| risk_class | ENUM(3 valores) | NOT NULL — `probable`/`possible`/`remote` (CPC 25) |
| claim_amount | DECIMAL(18,6) | NULL — valor exposto nesta avaliação, usado no relatório "exposição possível" |
| provisioned_amount | DECIMAL(18,6) | NOT NULL, default 0, CHECK ≥ 0 |
| rationale | TEXT | NULL, obrigatório quando `risk_class='probable'` (CHECK) |
| assessed_by / assessed_at | INTEGER / TIMESTAMP | NOT NULL |

**Decisão repassada (item 2): "provisão de contingência é histórico
append-only (CPC 25)".** Cada reavaliação gera **nova linha**; não existe
coluna `is_current` — a vigente é resolvida em query
(`ORDER BY assessed_at DESC LIMIT 1` por `legal_case_id`), evitando um
segundo caminho de mutação que precisaria ficar em sincronia manual.
Trigger `trg_jur_lock_legal_case_provision` bloqueia **qualquer**
UPDATE/DELETE, sem exceção — mais estrita até que
`jur_legal_case_deadlines` (que permite evolução até a confirmação final):
uma linha de provisão, uma vez inserida, é um fato contábil histórico que
a Controladoria consome para o balanço (RF-JUR-020) e não pode ser
reescrito.

`ck_jur_legal_case_provisions_probable_requires_amount` — `risk_class <>
'probable' OR (provisioned_amount > 0 AND rationale IS NOT NULL)` — E1 de
UC-53 (BR-JUR-015).

---

## 6. Integração de custos com Contas a Pagar — migration `20260807-000268`

**Decisão (§6.3 do documento de requisitos, explicitamente repassada):**
FK direta, não tabela de junção.

`accounts_payable` recebe 2 colunas novas:

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| legal_case_id | INTEGER | NULL, FK → `jur_legal_cases.id` **RESTRICT** | Vínculo do lançamento ao processo (RF-JUR-018) |
| legal_expense_type | ENUM(`expense`,`judicial_deposit`) | NULL | Distingue despesa de depósito judicial/recursal desde o dia 1 |

`ck_jur_accounts_payable_legal_expense_type_requires_case` — `legal_expense_type`
só pode ser preenchido quando `legal_case_id IS NOT NULL`. O tratamento
contábil fino (depósito como ativo restrito vs. despesa) permanece
pendente de confirmação com o contador (`[VERIFICAR COM ASSESSOR JURÍDICO
DA EMPRESA]`, item 6 do §6.5 do documento de requisitos) — esta migration
só garante que o dado mínimo para a distinção existe, sem forçar decisão
contábil fora de escopo.

`legal_case_id` é **RESTRICT** (não `SET NULL`/`CASCADE`): `jur_legal_cases`
nunca é excluído fisicamente (RF-JUR-019), então não há cenário legítimo
de apagar um processo com AP vinculada.

---

## 7. Procurações — migration `20260807-000269` — UC-55

| Coluna | Tipo | Constraints |
|---|---|---|
| grantor_name | VARCHAR(200) | NOT NULL, default `EVOK ÁUDIO LTDA` |
| grantee_name / grantee_document | VARCHAR | NOT NULL / NULL |
| employee_id / external_lawyer_id | INTEGER | NULL, FK RESTRICT cada — não mutuamente exclusivas (outorgado pode não ter nenhum cadastro) |
| powers_description | TEXT | NOT NULL |
| power_tags | VARCHAR(255) | NULL — lista livre (ad_judicia/ad_negotia/banking/other) |
| proxy_form | ENUM(`public`,`private`) | NOT NULL |
| issue_date / expiration_date | DATE | NOT NULL / NULL (`NULL`=indeterminada) |
| alert_advance_days | INTEGER | NOT NULL, default 30 |
| status | ENUM(`active`,`revoked`,`expired`) | NOT NULL, default `active` |
| revoked_at / revocation_communication | TIMESTAMP / TEXT | NULL, ambos obrigatórios juntos quando `status='revoked'` (CHECK) |
| superseded_proxy_id | INTEGER | NULL, self-FK RESTRICT — renovação referencia a anterior (UC-55 A2) |
| created_by | INTEGER | NOT NULL, FK RESTRICT |

`status='revoked'` some **imediatamente** das listagens de vigentes — não
é uma view/trigger dedicada, é o `UPDATE` de `status` acontecendo na mesma
transação do registro da revogação (E1 de UC-55, sem lag admissível por
desenho de aplicação, não de banco).

---

## 8. Propriedade Intelectual — migration `20260807-000270`

### 8.1 `jur_intellectual_property`

| Coluna | Tipo | Constraints |
|---|---|---|
| ip_type | ENUM(6 valores) | NOT NULL — trademark/patent/utility_model/industrial_design/copyright/trade_secret |
| registration_number, title | VARCHAR | title NOT NULL |
| description | TEXT | NULL — **apenas genérica** para `trade_secret` |
| holding_area | VARCHAR(150) | NULL — área detentora (trade_secret) |
| filing_date, grant_date, expiration_date, next_annuity_date | DATE | NULL |
| status | ENUM(5 valores) | NOT NULL, default `filed` |
| responsible_user_id | INTEGER | NOT NULL, FK RESTRICT |

**Segredo industrial nunca armazena conteúdo (RF-JUR-033, LPI art. 195
XI-XII):** garantido por **ausência estrutural** — não existe NENHUMA
coluna de conteúdo/anexo de segredo nesta tabela (só `description`
genérica e `holding_area`), para nenhum tipo de ativo. É enforcement por
design de schema, não por `CHECK` condicional (que poderia ser contornado
inserindo o conteúdo disfarçado em outro tipo de ativo — a ausência da
coluna em si é a garantia). Leitura restrita a `role=admin` + módulo
`juridico` (RNF-JUR-01) é RBAC de aplicação, fora do escopo desta
migration.

### 8.2 `jur_ip_contract_links` (N:N)

| Coluna | Constraints |
|---|---|
| ip_id | NOT NULL, FK → `jur_intellectual_property.id` RESTRICT |
| contract_id | NOT NULL, FK → `jur_contracts.id` RESTRICT |
| link_description | NULL — ex.: "NDA que protege o segredo", "licenciamento da marca EVOK" |

UNIQUE par `(ip_id, contract_id)` — RF-JUR-034.

---

## 9. LGPD — RoPA, Titular, Incidente — migration `20260807-000271` — UC-56

| Tabela | Colunas-chave | FK |
|---|---|---|
| `jur_lgpd_processing_activities` | purpose, legal_basis (ENUM 10 valores, art. 7º), data_categories, data_subject_categories, source_system, sharing_description, retention_period, security_measures, department_id, last_reviewed_at, next_review_due_at | `department_id`→departments RESTRICT · `created_by`→users RESTRICT |
| `jur_lgpd_data_subject_requests` | request_type (ENUM 8 valores, art. 18), requester_*, data_subject_category, received_at, due_date, status, identity_verified(+by/at), rejection_justification, resolution_notes, answered_at, dpo_user_id | `identity_verified_by`/`dpo_user_id`→users RESTRICT |
| `jur_lgpd_incidents` | occurred_at, detected_at, description, affected_categories, affected_data_subjects_estimate, risk_assessment, communication_decision, communication_justification, action_plan, status, dpo_user_id, closed_at, created_by | `dpo_user_id`/`created_by`→users RESTRICT |

**`due_date` de solicitação de titular:** calculada em aplicação
(`received_at + 15 dias`, art. 19 II) — não há `DEFAULT` de banco porque
`received_at` pode ser retroativa (data de recebimento informada pelo
canal, não necessariamente `CURRENT_TIMESTAMP` do INSERT).

**CHECK `ck_jur_lgpd_dsr_in_progress_requires_verification`:**
`status NOT IN ('in_progress','answered') OR identity_verified = true` —
E1 de UC-56 (BR-JUR-041).

**CHECK `ck_jur_lgpd_dsr_rejected_requires_justification`:**
`status <> 'rejected_justified' OR rejection_justification IS NOT NULL` —
E3 de UC-56.

**CHECK `ck_jur_lgpd_incidents_closed_requires_decision`:**
`status <> 'closed' OR (communication_decision IS NOT NULL AND
communication_justification IS NOT NULL AND closed_at IS NOT NULL)` — E4
de UC-56 (BR-JUR-042), "não permite fechar sem decisão explícita sobre
comunicação à ANPD/titulares, com justificativa registrada mesmo quando a
decisão é 'não comunicar'". `communication_decision`/`communication_justification`
nascem **nullable** (o incidente pode existir em `open`/`investigating`
sem decisão ainda tomada) — o CHECK só exige o par no fechamento, não na
criação.

---

## 10. Imutabilidade — Resumo (RNF-JUR-02, decisão repassada item 3)

Seguindo o precedente das triggers `trg_sst_lock_*` do Bloco 1 (exceção
arquitetural documentada em `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md`),
este bloco introduz **3 novas triggers**:

| Function/trigger | Tabela | O que impede |
|---|---|---|
| `jur_lock_contract_addendum` | `jur_contract_addendums` | UPDATE/DELETE de **qualquer** linha, desde o INSERT (RF-JUR-008) |
| `jur_lock_legal_case_event` | `jur_legal_case_events` | UPDATE/DELETE de **qualquer** linha, desde o INSERT (RF-JUR-014) |
| `jur_lock_legal_case_deadline` | `jur_legal_case_deadlines` | DELETE sempre; UPDATE quando `OLD.status IN ('confirmed','confirmed_late')` (RF-JUR-024/025) |
| `jur_lock_legal_case_provision` | `jur_legal_case_provisions` | UPDATE/DELETE de **qualquer** linha, desde o INSERT (CPC 25) |

Diferente do Bloco 1 (onde `sst_lock_acidente`/`sst_lock_cat` permitem
UPDATE pontual de colunas de status pós-confirmação), aqui **3 das 4**
triggers são estritamente insert-only (sem nenhuma coluna mutável depois
do INSERT) — reflexo de que `jur_contract_addendums`, `jur_legal_case_events` e
`jur_legal_case_provisions` são, por natureza, séries históricas puras (cada
"correção" é sempre uma linha nova), enquanto `jur_legal_case_deadlines` tem um
ciclo de vida real (pending → fulfilled → confirmed) que precisa evoluir
até a baixa final.

`jur_legal_cases`, `jur_contracts`, `jur_proxies`, `jur_intellectual_property` e as 3
tabelas LGPD **não** têm trigger de imutabilidade — correções tardias de
cadastro (ex.: erro de digitação no número CNJ, ajuste de descrição de
poderes da procuração) não comprometem valor probatório da mesma forma que
o conteúdo de um andamento processual, aditivo ou provisão contábil já
registrados; a trilha é a auditoria de escrita já existente do projeto
(`AuditLog`, RF-JUR-043), não uma trava estrutural adicional — mesmo
critério de corte já usado para `sst_asos` no Bloco 1.

---

## 11. Retenção legal (RNF-JUR-03)

Nenhuma rotina de expurgo/limpeza automática é criada. Retenção é
garantida por **ausência de mecanismo de exclusão**, não por contador de
expiração:

- Nenhuma migration deste bloco cria `DELETE`/job/`pg_cron`.
- Todas as FKs de `jur_contracts`/`jur_legal_cases`/`legal_case_*`/`jur_proxies`/
  `jur_intellectual_property` para `employees`/`suppliers`/`clients`/`users`
  são `RESTRICT` — nenhuma exclusão em cascata que apagaria histórico
  jurídico junto de um cadastro relacionado.
- `jur_legal_case_events`, `jur_legal_case_provisions` e `jur_contract_addendums`
  bloqueiam `DELETE` incondicionalmente via trigger; `jur_legal_case_deadlines`
  bloqueia `DELETE` sempre (RF-JUR-044).
- Prazo exato de guarda (10 anos após encerramento, `[PRÁTICA DE MERCADO —
  a confirmar]`, RNF-JUR-03) não é imposto no schema — quando/se
  confirmado, a mudança esperada é uma rotina de arquivamento FRIO (não
  exclusão), fora de escopo deste bloco.

---

## 12. Alterações fora das novas tabelas JUR

1. **`server/src/shared/domain/accessModules.ts`** — adicionada a chave
   `juridico` à union `AccessModuleKey` e ao array `ACCESS_MODULES` (32ª
   chave), com o mesmo padrão de comentário de `rh`/`sst`/`ti`, explicitando
   que `juridico` é **mais restritivo** (bloqueia rota inteira via
   `authorizeModule`, igual a `sst`), com a exceção de campo do perfil
   `financeiro` (RF-JUR-042/BR-JUR-050).
2. **`accounts_payable`** — 2 colunas novas (`legal_case_id`,
   `legal_expense_type`), migration `20260807-000268` (ver §6).
3. **`docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md`** — nova seção
   documentando as 4 triggers deste bloco (mesmo padrão da seção "Exceção
   aplicada — BLOCO 1 SST").

---

## 13. Rastreabilidade RF-JUR → Tabela(s)

| RF-JUR | Tabela(s) |
|---|---|
| 001, 005, 006, 007, 009, 011 | `jur_contracts` |
| 002 | `jur_contract_documents` |
| 003 | fora de escopo deste bloco — alçada de aprovação por valor/tipo depende de tabela de configuração ainda não confirmada (§6.4 do documento de requisitos); `jur_contracts.status='in_approval'`/`approved_by`/`approved_at` cobrem o RESULTADO da aprovação, não a tabela de alçadas em si |
| 004 | `jur_contract_signatories` |
| 008 | `jur_contract_addendums` |
| 010 | `jur_contracts.clause_checklist` |
| 005, 006, 022, 027, 032, 038 | `jur_legal_alerts` |
| 012, 019, 020 | `jur_legal_cases` |
| 013 | `jur_external_lawyers` |
| 014 | `jur_legal_case_events` |
| 015, 016 | `jur_legal_case_provisions` |
| 017 | `jur_legal_cases.next_risk_reassessment_due_at` + `jur_legal_case_events` (evento `decision`) |
| 018 | `accounts_payable.legal_case_id`/`legal_expense_type` |
| 021 a 025 | `jur_legal_case_deadlines` |
| 026 a 029 | `jur_proxies` |
| 030 | fora de escopo deste bloco — repositório documental de atos societários (atas, livro) não tem tabela dedicada; é gestão simples de documentos sem workflow, mesmo padrão de "sem tabela dedicada" já usado em outros blocos para features leves de baixa prioridade |
| 031, 032, 033 | `jur_intellectual_property` |
| 034 | `jur_ip_contract_links` |
| 035, 036 | `jur_lgpd_processing_activities` |
| 037, 038, 039 | `jur_lgpd_data_subject_requests` |
| 040 | `jur_lgpd_incidents` |
| 041 | `jur_lgpd_data_subject_requests.dpo_user_id` / `jur_lgpd_incidents.dpo_user_id` |
| 042 | RBAC (`accessModules.ts`, chave `juridico`) |
| 043 | `AuditLog` (reutilizada, sem tabela nova) |
| 044 | Retenção — ver §11 |
| 045 | Leitura de `jur_contracts.supplier_id`/`client_id` na ficha do fornecedor/cliente — sem tabela dedicada |
| 046 | Fora de escopo de banco — export/relatório de leitura, sem tabela dedicada |

**RF-JUR-030 e RF-JUR-003 ficam deliberadamente sem tabela neste bloco**
(ver rastreabilidade acima) — ambos dependem de decisão de negócio ainda
pendente (§6.4/§6.5 do documento de requisitos) e não bloqueiam o núcleo
crítico do módulo (contratos, contencioso, prazos fatais, LGPD).

---

## 14. Pendências para o `ArquitetoSoftwareAPI`

1. **Alçada de aprovação de contrato (RF-JUR-003):** confirmar com
   `AnalistaNegocios`/negócio se existe estrutura equivalente em Compras
   antes de propor uma tabela nova de configuração — mesma cautela já
   registrada no Bloco 2 TI (§5.2). Não modelada neste bloco.
2. **Atos societários (RF-JUR-030):** repositório documental simples — se
   o `ArquitetoSoftwareAPI` decidir que precisa de tabela dedicada (em vez
   de reaproveitar `jur_contract_documents`-like genérico), sinalizar de volta
   ao `AdmDBA` antes de implementar.
3. **`jur_legal_alerts` é polimórfica** (`origin_type`+`origin_id`, sem FK
   real) — igual ao padrão já usado em `sst_acoes_corretivas`/
   `sst_eventos_esocial`: o repositório precisa resolver a origem em
   aplicação (switch por `origin_type`), não via `include`/`join`
   automático do Sequelize.
4. **`jur_legal_case_deadlines` tem máquina de estados com 5 valores**
   (`pending`/`fulfilled_pending_confirmation`/`confirmed`/`missed`/
   `confirmed_late`) — o contrato de API precisa expor operações distintas
   por transição: `POST` (cria em `pending`), `POST /:id/fulfill` (1ª
   confirmação → `fulfilled_pending_confirmation`), `POST /:id/confirm`
   (2ª confirmação → `confirmed`), rotina agendada/verificação ao acessar
   para `pending → missed` quando `due_date` vence, e
   `POST /:id/confirm-late` (com `retroactive_justification` obrigatória)
   para `missed → confirmed_late`. Um `PUT` genérico sempre falhará com
   erro de trigger quando `status` já é final — o `errorHandler` precisa
   mapear para 409, não vazar a mensagem SQL crua (mesmo padrão já pedido
   para SST).
5. **Nomenclatura de campo (DB inglês, sem tradução):** ao contrário de
   SST, aqui não há mapeamento PT-BR↔inglês a fazer — os nomes de coluna já
   são os nomes de campo esperados de API.

---

## Referências

- `docs/business/briefs/BRIEF_JUR_2026-08-06.md`
- `docs/business/BLOCO_3_JUR_REQUISITOS.md`
- `docs/business/BLOCO_1_SST_MODELO_DADOS.md`, `docs/business/BLOCO_2_TI_*`
  — mesmo padrão de entregável (formato de referência para este bloco)
- `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md` (atualizado com as 4
  triggers deste bloco)
- `server/src/shared/domain/accessModules.ts` (chave `juridico` adicionada)
- Migrations: `server/migrations/20260807-000260-*.cjs` a
  `20260807-000271-*.cjs`

**Fim do modelo de dados do BLOCO 3 — Jurídico.**
