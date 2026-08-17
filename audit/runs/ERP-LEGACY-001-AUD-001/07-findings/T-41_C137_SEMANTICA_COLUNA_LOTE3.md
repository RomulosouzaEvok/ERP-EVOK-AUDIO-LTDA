# T-41 — `C-137` Semântica de coluna, LOTE 3 (triagem de banda + cobertura integral)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-41` (continuação de `T-13` → `T-31` → `T-35`, célula `C-137` da EMENDA-02) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Mandato de escopo | `APR-2026-034` **D2** (dono, 2026-08-17) |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linha. |
| Artefatos anteriores | `T-31_C137_SEMANTICA_COLUNA.md` e `T-35_C137_SEMANTICA_COLUNA_LOTE2.md` — **não alterados** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`, `T-35:13`). Persistido pelo orquestrador **sem alteração**.

> **Nota de execução.** Duas execuções anteriores desta trilha caíram por falha de infraestrutura **sem gravar artefato**. Esta execução foi dimensionada para caber em uma passagem: escopo declarado menor, entregue por inteiro, em vez de escopo maior entregue pela metade.

---

## 1. O que `APR-2026-034` D2 mandou fazer

> *"Cobertura integral (7 critérios) apenas nas bandas dinheiro, estoque, fiscal e dado pessoal — estimadas em ~40-50 tabelas […]. Cobertura parcial declarada para o restante (SST, Jurídico, Facilities, TI, Marketing e apoio), registrada por escrito como exclusão explícita."*
> **Condição vinculante:** *"a exclusão precisa constar nominalmente."*

Esta trilha executa a condição vinculante primeiro (§2 e §3), porque a lista nominal é o produto que dá validade à exclusão. A auditoria de conteúdo (§5 em diante) vem depois e é, deliberadamente, menor.

**O resultado da triagem contradiz parcialmente a premissa da própria decisão.** Isso está registrado em §4 como divergência (Regra 20), não acomodado.

---

## 2. Critério de corte — declarado antes de aplicado

Uma tabela entra em **INTEGRAL** se satisfizer **ao menos um** dos quatro critérios. Caso contrário entra em **EXCLUÍDA**.

| Sigla | Critério | Fonte |
|---|---|---|
| **D** | Coluna que representa **valor monetário** que trafega para razão contábil, financeiro, custo de produto, preço praticado ou alçada de gasto. | banda "dinheiro" |
| **E** | Coluna de **quantidade** que altera, reflete ou reconcilia saldo de estoque, lote ou rastreabilidade. | banda "estoque" |
| **F** | Dado com **efeito tributário ou de obrigação acessória** (NF-e, eSocial, CAT, tributo, CNPJ/IE). | banda "fiscal" |
| **P** | **Dado pessoal de pessoa natural identificada ou identificável**, incluindo **dado sensível** — saúde, biometria (LGPD art. 5º **I e II**). | banda "dado pessoal" |

### 2.1 Regras de desempate, registradas porque decidem casos discutíveis

1. **Regra do cabeçalho.** Cabeçalho de documento cujo corpo é INTEGRAL entra como INTEGRAL de **2ª ordem**: não carrega o valor, mas carrega numeração, `status`, data-base e o par aprovador/data — exatamente onde os critérios "data sem semântica" e "nulabilidade contra a regra" se materializam. Aplicada a `purchase_requisitions`, `rfqs`, `master_production_plans`, `purchase_order_approvals`, `import_process_approvals`, `jur_contract_approvals`.
2. **`DECIMAL` não é sinônimo de dinheiro.** `acoustic_test_results` e `facility_areas` têm `DECIMAL` de **grandeza física** (dB, m²). Não entram por **D**.
3. **Catálogo não é dado pessoal.** `sst_riscos_ocupacionais`, `sst_matriz_epi`, `sst_planos_exames`, `sst_ges` descrevem **cargo/GES**, não pessoa — EXCLUÍDOS. Já `sst_ges_funcionarios` **nomeia o funcionário exposto ao risco**; a associação é inferência de saúde ocupacional e entra por **P**.
4. **Dado de saúde é dado pessoal sensível.** LGPD art. 5º II. É o critério que mais move tabelas para INTEGRAL, e o próprio projeto já o reconhece: `employeeSensitiveFields.ts:28-34` classificou `pcd` **como dado de saúde** por achado de auditoria anterior. Não se encolheu o critério para caber no orçamento — encolheu-se a **cobertura**, que é o que §6 declara.

### 2.2 Casos discutíveis, decididos nominalmente

| Tabela | Decisão | Critério explícito |
|---|---|---|
| `jur_contracts` | **INTEGRAL (D)** | `JurContract.ts:74` `value DECIMAL(18,6)` + `:75` `currency`. Há valor contratado; a banda é dinheiro, não "módulo jurídico". |
| `it_software_license_details` | **INTEGRAL (D)** | `ItSoftwareLicenseDetail.ts:39` `cost DECIMAL(18,6)` + `:40` `billing_cycle`. Custo recorrente é dinheiro. |
| `sst_asos` e demais clínicas | **INTEGRAL (P)** | `SstAso.ts:8-9` declara, no próprio artefato, *"Dado clínico sensível (LGPD)"*. Entra por saúde, **não** por dinheiro. |
| `facility_areas` | **EXCLUÍDA** | `DECIMAL` é metragem. **Incerteza declarada:** se for insumo de rateio de custo (não verificado), reclassifica para INTEGRAL-D. `RES-T41-04`. |
| `access_profile_permissions` | **EXCLUÍDA desta célula** | Não é banda de dado; é controle de acesso, coberto pela trilha de segurança. Exclusão de escopo, não de risco. |
| `webhook_events` | **EXCLUÍDA, com ressalva** | Payload livre **pode** conter dado pessoal de terceiro. Fora por não ter coluna tipada de dado pessoal. `RES-T41-05`. |
| `it_tickets` | **EXCLUÍDA, com ressalva** | Idem: texto livre de chamado pode conter dado pessoal. |

---

## 3. As duas listas nominais completas — condição vinculante de `APR-2026-034`

Universo: as **134** tabelas com model listadas em `T-35:91-113`. Sobre a aritmética desse universo, ver `T41-META-F09` (§5.9): **a soma nominal daquela lista fecha em 133, não 134.** As listas abaixo são exaustivas sobre as **133 efetivamente nomeadas**; nenhuma tabela aparece nas duas.

### 3.1 Banda **INTEGRAL** — 80 tabelas

Marcadas com `*` as de **2ª ordem** (regra do cabeçalho / vínculo nominal sem atributo próprio) — 23 tabelas. As demais 57 são de 1ª ordem.

**DINHEIRO (D) — 34**
`purchase_order_items`, `purchase_requisition_items`, `purchase_requisitions*`, `purchase_order_approvals*`, `rfqs*`, `rfq_items`, `rfq_quotes`, `item_suppliers`, `import_processes`, `import_process_items`, `import_process_approvals*`, `item_estruturas`, `item_detalhes_comerciais`, `production_routes`, `production_route_steps`, `non_conformities`, `maintenance_orders`, `service_orders`, `marketing_campaigns`, `marketing_events`, `hr_job_positions`, `hr_training_courses`, `hr_employee_job_history`, `hr_employee_benefits`, `engineering_projects`, `jur_contracts`, `jur_contract_addendums`, `jur_contract_approvals*`, `jur_legal_cases`, `it_software_license_details`, `facility_fines`, `facility_vehicle_details`, `facility_vehicle_documents`, `facility_fuel_records`.

**ESTOQUE (E) — 6**
`warehouses`, `sale_lot_shipments`, `production_order_reservations`, `master_production_plans*`, `master_production_plan_lines`, `quality_inspections`.

**FISCAL (F) — 3**
`purchase_receipts`, `sst_cats`, `sst_eventos_esocial`.

**DADO PESSOAL (P) — 37**
`hr_employee_documents`, `hr_employee_contracts`, `hr_employee_trainings*`, `hr_admission_processes`, `hr_termination_processes`, `hr_vacation_accrual_periods`, `hr_vacation_schedules*`, `hr_time_import_batches*`, `marketing_leads`, `marketing_lead_saneamento_log`, `sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_acidente_complementos`, `sst_investigacoes_acidente`, `sst_acidente_testemunhas`, `sst_ges_funcionarios*`, `sst_entregas_epi`, `sst_devolucoes_epi`, `sst_treinamentos*`, `sst_brigadistas*`, `sst_membros_cipa*`, `sst_candidatos_cipa*`, `sst_reuniao_cipa_presentes*`, `sst_dds_presencas*`, `sst_permissoes_trabalho*`, `sst_pt_executantes*`, `jur_contract_signatories`, `jur_external_lawyers`, `jur_proxies*`, `jur_lgpd_data_subject_requests`, `it_responsibility_terms*`, `it_license_seats*`, `it_access_requests*`, `facility_drivers`, `facility_visitors`, `facility_visits*`.

### 3.2 Banda **EXCLUÍDA** — 53 tabelas

**Esta é a exclusão declarada nominalmente que `APR-2026-034` exige.** Nenhuma delas foi auditada quanto aos 7 critérios de `C-137`, nem nesta trilha nem nas anteriores, e isso é afirmação, não omissão.

**Suprimentos (1):** `rfq_suppliers`.
**Estoque / cadastro (4):** `product_categories`, `item_categorias`, `item_especificacoes_tecnicas`, `product_drawings`.
**Produção / qualidade (3):** `production_downtimes`, `work_center_shifts`, `acoustic_test_results`.
**Marketing (2):** `marketing_event_checklist_items`, `marketing_materials`.
**RH / organização (4):** `hr_benefit_types`, `hr_job_position_trainings`, `departments`, `directorates`.
**SST (15):** `sst_tipos_epi`, `sst_matriz_epi`, `sst_planos_exames`, `sst_acoes_corretivas`, `sst_mandatos_cipa`, `sst_processos_eleitorais_cipa`, `sst_reunioes_cipa`, `sst_ges`, `sst_riscos_ocupacionais`, `sst_risco_epis`, `sst_risco_exames`, `sst_matriz_treinamento`, `sst_inspecoes_seguranca`, `sst_inspecao_itens`, `sst_registros_dds`.
**Jurídico (7):** `jur_contract_documents`, `jur_corporate_acts`, `jur_intellectual_property`, `jur_ip_contract_links`, `jur_legal_alerts`, `jur_legal_case_deadlines`, `jur_legal_case_events`.
**TI (6):** `it_tickets`, `it_ticket_categories`, `it_ticket_comments`, `it_ticket_priority_history`, `it_backup_logs`, `ti_settings`.
**Facilities (6):** `facility_areas`, `facility_correspondence`, `facility_cleaning_schedules`, `facility_cleaning_executions`, `facility_resource_reservations`, `facility_vehicle_trips`.
**Governança / transversais (5):** `access_profile_permissions`, `strategic_plannings`, `meeting_minutes`, `business_risks`, `webhook_events`.

**80 + 53 = 133.** As **21 tabelas sem model** (`T35-META-F01`) **não são triáveis** por esta trilha — não há artefato de aplicação que revele o que guardam, logo não é possível afirmar sua banda. **Não entram na exclusão declarada**, porque excluir nominalmente exige nomear, e `RES-T35-02` continua aberto.

### 3.3 O que a triagem custou em falsos "apoio"

Três tabelas que o vocabulário de módulo trataria como apoio entraram em INTEGRAL por evidência de coluna, e três que o `DECIMAL` sugeriria como dinheiro ficaram fora. A triagem por **coluna** e a triagem por **módulo** divergem nos dois sentidos — é por isso que §4 existe.

---

## 4. Divergência com a premissa de `APR-2026-034` D2 (Regra 20) — não acomodada

`APR-2026-034` D2 contém **duas** definições de escopo que **não coincidem**:

1. **Por banda de risco:** "dinheiro, estoque, fiscal e **dado pessoal**".
2. **Por módulo:** "cobertura parcial declarada para o restante (**SST, Jurídico, Facilities, TI, Marketing** e apoio)".

Aplicado o critério (1) com o rigor da LGPD art. 5º II, **31 das 80 tabelas INTEGRAL pertencem justamente aos módulos que (2) manda excluir**: 17 de SST, 8 de Jurídico, 4 de TI, 7 de Facilities e 4 de Marketing (as contagens se sobrepõem porque alguns módulos entram pelas duas bandas).

**Consequência aritmética:** a estimativa de "~40-50 tabelas" pressupunha a leitura por módulo. Pela leitura por banda, o universo INTEGRAL é de **80 tabelas** — **60 % a 100 % maior** que o previsto.

**Não se resolve isto por conta própria.** Opções, para decisão do dono via `vericore-software-audit-director`:

- **(a)** Prevalece a banda: INTEGRAL = 80, e faltam ~4 lotes, não 2-3.
- **(b)** Prevalece o módulo: SST/JUR/TI/FAC/MKT saem, INTEGRAL cai para ~49 — **e o dado de saúde de `sst_asos`, `sst_acidentes`, `sst_exames_complementares` fica sem auditoria de semântica**, o que precisa ser aceito **por escrito**, porque é dado sensível de trabalhador.
- **(c)** Corte intermediário explícito: cobrir as **57 de 1ª ordem** e excluir nominalmente as **23 de 2ª ordem** (marcadas `*` em §3.1).

Esta trilha executou o Passo 2 **na ordem do mandato** (dinheiro → estoque → fiscal → dado pessoal) sem esperar a decisão, e cobriu 9 tabelas — mas a decisão determina quantos lotes ainda faltam, e a contagem de §6.4 fica condicionada a ela.

---

## 5. Findings `PROPOSED`

Severidade e confiança declaradas separadamente. Régua aplicada: **HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real** — o teste que separou `AUD-RH-VTHORISTA-01` (CRITICAL, unidade variável com consumidor real) de `AUD-PAT-DEPRECIACAO-01` (MEDIUM, coluna write-only). Duas hipóteses desta trilha morreram nesse teste e viraram conformidade (§7.4 e §7.5); duas sobreviveram e são os HIGH abaixo.

---

### `T41-EST-F01` — Desativar um depósito com saldo é permitido pelo caminho normal, e o saldo some da invariante sem virar movimento

**Severidade proposta: HIGH · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto à materialização (é fato de dado)**

`Warehouse.ts:14-16` declara, citando `BUSINESS_RULES.md` §12 item 3, uma **invariante obrigatória**:

> *"o saldo total de um produto é sempre a soma dos saldos em todos os depósitos **ativos**"*

Ou seja, `warehouses.active` **não é flag de apresentação: é operando da invariante de saldo**. E:

1. **A coluna não tem semântica declarada em lugar nenhum.** `Warehouse.ts:63-67` — `active BOOLEAN NOT NULL DEFAULT true`, **sem `comment`**. No DDL congelado, `warehouses` tem `COMMENT ON COLUMN` para `code` (`00_baseline_frozen.sql:14990`) e `name` (`:14997`) — e **nenhum para `active`** (`:14975-14983` é a definição completa e não há outro comentário desta tabela no baseline). A única coluna com efeito sobre saldo é a única sem descrição.

2. **Desativar é operação normal e não tem nenhuma guarda.** `UpdateWarehouseUseCase.ts:53` — `if (input.active !== undefined) updates.active = input.active;` e `:55` `await warehouse.update(updates)`. O único `throw` do use case é `NotFoundError` (`:41`). **Não há verificação de saldo remanescente em `product_warehouse_stock`.** A rota é `PUT /api/inventory/warehouses/:id` (`inventoryController.ts:560-562`), sob `authorizeModule('estoque','approve')` — perfil operacional comum, não caminho excepcional.

3. **Depois de desativado, o saldo fica preso.** `warehouseStockService.ts:84-92` — `getWarehouseByCode` filtra `active: true` e lança `NotFoundError` se inativo. Esse resolvedor é o que `CreateWarehouseTransferUseCase.ts:63-64` usa para **origem e destino**. Logo: o estoque parado no depósito desativado **não pode ser transferido para fora** — o único mecanismo de saída também exige o depósito ativo.

**Resultado combinado:** um clique autorizado remove a linha de saldo da soma da invariante, **sem gerar `inventory_movements`, sem alterar `products.quantity`** (que `warehouseStockService.ts:4-6` descreve como fonte de verdade do MRP) e **sem caminho de reversão pelo módulo de estoque**. O estoque físico existe, o saldo por depósito existe, e o total deixa de contá-lo.

Isto **não é** o padrão `active` de `T35-DIN-F06` (soft delete não filtrado, onde o registro **volta** indevidamente). É o inverso: aqui o filtro **existe e é correto**, e o defeito é a **ausência de guarda na transição** `true → false`. Complementares; nenhum contradiz o outro.

**Critério de reteste objetivo (estático):** recusa explícita (`BusinessRuleError`) em `UpdateWarehouseUseCase` à transição `active: true → false` quando houver `product_warehouse_stock.quantity <> 0` para o depósito, **com teste que reprove a regressão**; e `comment` em `warehouses.active`, **na migration**, declarando o efeito sobre a invariante §12 item 3.

---

### `T41-RH-F02` — O mesmo ASO existe em duas tabelas, com dois domínios grafados diferente, e o gate de retorno ao trabalho lê a cópia

**Severidade proposta: HIGH · Confiança: ALTA (todos os elos provados por linha)**

O resultado de aptidão de um Atestado de Saúde Ocupacional está gravado em **duas tabelas independentes**:

| Onde | Coluna | Domínio declarado |
|---|---|---|
| SST (entidade própria) | `sst_asos.resultado` — `SstAso.ts:44` | `'apto'`, `'inapto'`, **`'apto_com_restricoes'`** |
| RH (cópia) | `hr_employee_documents.aptitude_result` — `HrEmployeeDocument.ts:28` | `'apto'`, `'inapto'`, **`'apto_com_restricao'`** |

Três defeitos encadeados:

1. **Duplicação semântica entre tabelas, sem reconciliação.** `SstAso.ts:6-8` declara que o ASO é *"Entidade PRÓPRIA do módulo SST — **nunca** um registro em `employee_documents`"*, enquanto `HrEmployeeDocument.ts:18-28` mantém cinco valores `aso_*` em `doc_type` **e** a coluna de aptidão. Nada no schema liga uma linha à outra: `hr_employee_documents` não tem FK para `sst_asos` (`00_baseline_frozen.sql:5914-5925`, definição completa). As duas podem divergir permanentemente.

2. **Domínios que não casam.** `apto_com_restricoes` (SST) × `apto_com_restricao` (RH). São enums **distintos** no banco (`enum_sst_asos_resultado` × `enum_hr_employee_documents_aptitude_result`, `:12936` e `:5920`). Qualquer conciliação, relatório unificado ou migração futura falha em silêncio **no valor mais crítico dos três** — o que impõe restrição ao trabalhador.

3. **O consumidor real lê a cópia, não o original.** É o elo que torna isto HIGH: `asoGate.ts:26` — `employeeDocumentRepository.findValidAso(...)` — o gate `hasValidAso` consulta **`HrEmployeeDocument`**, e é ele que decide Admissão/Demissão e **o retorno de afastamento acima de 30 dias** (`absenceRules.ts:82-84`, RF-RH-048; `HrEmployeeDocument.ts:5-7`). Portanto **um `sst_asos.resultado = 'inapto'` registrado pela SST não bloqueia nada** se a cópia de RH estiver `apto` e dentro da validade. A decisão de devolver uma pessoa ao trabalho é tomada sobre a réplica.

**Teste de severidade aplicado:** o defeito ocorre pelo **caminho normal** — RH anexa o documento, SST registra o ASO, cada módulo opera no seu escopo, e nenhum passo anômalo é necessário para as versões divergirem. Há **consumidor real** e a consequência é decisão de saúde ocupacional. HIGH.

**Nuance registrada, para não acusar mais do que é:** o `COMMENT ON COLUMN` do DDL (`:5932`) declara a intenção com precisão — *"apenas para doc_type aso_* — somente aptidão/validade, nunca laudo clínico (LGPD art. 5º II)"*. A duplicação é **deliberada e documentada** quanto ao conteúdo mínimo. O que **não** existe é (a) o vínculo entre as duas linhas e (b) a igualdade de domínio. O finding é sobre isso, não sobre a existência da cópia.

**Critério de reteste:** FK `hr_employee_documents.sst_aso_id` (ou fonte única com view de leitura para o gate), **e** domínio idêntico nos dois enums, **e** teste que reprove divergência entre `sst_asos.resultado` e o `aptitude_result` correspondente.

---

### `T41-META-F03` — A semântica existe no DDL e não chega ao model: o inverso de `AUD-DB-T31-03`, provado em 5 colunas

**Severidade proposta: MEDIUM · Confiança: ALTA**

`AUD-DB-T31-03` reportou o vetor `model → migration`: `comment:` no model, ausente no banco. Esta trilha encontra o vetor **oposto**, que nenhuma trilha anterior registrou:

| Coluna | DDL congelado diz | Model diz |
|---|---|---|
| `it_software_license_details.renewal_date` | *"Data da **última ação de renovação** — **distinta de `assets.license_expires_at`** (data canônica de vencimento, RF-TI-024)"* (`:7449`) | `ItSoftwareLicenseDetail.ts:41` — **nada** |
| `it_software_license_details.license_key` | *"Acesso restrito […] e mascarado nas demais consultas — BR-TI-014"* (`:7442`) | `:38` — **nada** |
| `hr_job_positions.salary_range_min` | *"**Dado sensível** (faixa salarial) — segue segregação de campo do módulo rh"* (`:6100`) | `HrJobPosition.ts:21` — **nada** |
| `sst_asos.medico_examinador` | *"**Nome/CRM** do médico examinador"* (`:12961`) | `SstAso.ts:46` — **nada** |
| `purchase_receipts.invoice_number` | *"Número da **NF-e do fornecedor** referente a este recebimento"* (`:11670`) | `PurchaseReceipt.ts:29` — **nada** |

**Por que é defeito e não curiosidade.** O artefato que o desenvolvedor lê para escrever código é o model TypeScript; o DDL congelado tem ~22 mil linhas e é consultado por exceção. `renewal_date` é o caso demonstrativo: **lida pelo model, a coluna parece ser o vencimento da licença** — e o DDL existe precisamente para avisar que **não é**, que o vencimento canônico mora em `assets.license_expires_at`. A informação que evita o erro está no artefato que não é lido.

**Não contradiz `AUD-DB-T31-03`; mostra que a dessincronização é bidirecional** — o que muda a redação da remediação: não basta "propagar `comment:` do model para a migration"; é preciso **reconciliar nos dois sentidos**.

**Critério de reteste:** verificação versionada (script ou teste) comparando `COMMENT ON COLUMN` do baseline com `comment:` dos models, que **reprove divergência nas duas direções**.

---

### `T41-TI-F04` — `it_software_license_details.cost` muda de unidade conforme `billing_cycle`, sem declaração em nenhum dos dois artefatos

**Severidade proposta: MEDIUM · Confiança: ALTA**

`ItSoftwareLicenseDetail.ts:39` — `cost: DECIMAL(18, 6)`, sem `comment`; e o DDL também não tem `COMMENT ON COLUMN` para `cost` (os únicos comentários desta tabela são `:7435`, `:7442`, `:7449`).

`:40` — `billing_cycle: ENUM('one_time','monthly','yearly') NOT NULL DEFAULT 'one_time'`.

Para `'monthly'`, `cost` é **mensalidade**; para `'yearly'`, **anuidade**; para `'one_time'`, **valor total**. **A mesma coluna monetária carrega três unidades temporais** e nada as declara. Somar `cost` entre ciclos diferentes produz número sem significado — padrão exato de `T35-RH-F02` (`employees.salary` × `salary_type`), aqui em custo de TI.

**Por que MEDIUM e não HIGH — teste do consumidor aplicado.** Não se localizou, nesta trilha, rotina que **some** `cost` entre licenças ou a lance em contabilidade; a tabela é extensão 1:1 de `assets` (`:7435`). Sem consumidor agregador provado, o defeito é de **latência**, não de dano em curso — diferentemente de `AUD-RH-VTHORISTA-01`. **Limitação declarada:** a busca por consumidor não foi exaustiva (`RES-T41-03`); havendo dashboard de custo de TI que agregue `cost`, a severidade sobe.

**Segundo defeito, mesma tabela:** `seats` (`:37`, com `CONSTRAINT ck_it_software_license_details_seats_positive`, `:7427`) declara assentos **contratados**, enquanto `it_license_seats` guarda os **atribuídos**. Duas representações da mesma grandeza, em tabelas distintas, sem constraint que impeça atribuir mais do que o contratado. Mesma classe de `T35-JUR-F09`.

**Critério de reteste:** `comment`, no model **e** na migration, declarando a unidade de `cost` por valor de `billing_cycle` (ou decomposição em `cost_amount` + `cost_period`); e regra versionada ligando `count(it_license_seats)` a `seats`.

---

### `T41-JUR-F05` — `jur_contracts.value` não declara se é valor total, mensal ou de aluguel, e a periodicidade depende de `contract_type`

**Severidade proposta: MEDIUM · Confiança: ALTA**

`JurContract.ts:74` — `value: DECIMAL(18,6)`, nullable, **sem `comment`** (o model não tem `comment:` em nenhuma coluna). O tipo de contrato, `:63-66`, tem **dez** valores, entre eles `'rental'` (valor tipicamente **mensal**), `'employment'` (**salarial**), `'commercial'`/`'service'` (valor **total** ou estimado) e `'nda'` (frequentemente **sem valor** — razão de a coluna ser nullable).

Terceira ocorrência, neste run, do padrão "coluna monetária cuja unidade é **função de outra coluna** que não a declara" — depois de `T35-RH-F02` (`salary` × `salary_type`) e `T41-TI-F04` (`cost` × `billing_cycle`). **Três ocorrências independentes em três módulos distintos movem isto de incidente para padrão sistêmico do ERP**, e é assim que deve ser instruído.

Agravante no mesmo artefato: `adjustment_index` (`:80`, `ipca|igpm|inpc|other|none`) e `adjustment_base_date` (`:81`) declaram **que** há reajuste e **desde quando**, mas, sem saber se `value` é mensal ou total, **nenhuma rotina pode aplicá-lo corretamente**.

**Segundo ponto, de dado pessoal:** `counterparty_doc STRING(20)` (`:73`) recebe **CPF ou CNPJ** conforme a contraparte — para `counterparty_type = 'other'` o `CHECK` obriga o preenchimento (migration `20260807-000260:165`), e uma pessoa natural cai aí. A coluna não distingue os dois documentos e **não consta de nenhuma classificação de dado sensível** — nem no model, nem no DDL, nem em `employeeSensitiveFields.ts:36-51`, que cobre apenas `employees`. Confirma `AUD-DB-T31-08` fora de `employees`.

**Critério de reteste:** `comment` declarando a periodicidade de `value` por `contract_type` (ou coluna `value_period`), na migration; e `counterparty_doc` com discriminante de tipo de documento + inclusão em classificação de dado pessoal.

---

### `T41-SST-F06` — Em `sst_asos`, o artefato nomeia 4 colunas clínicas sensíveis e só 1 recebe marcação; a mais sensível não recebe nenhuma

**Severidade proposta: MEDIUM · Confiança: ALTA**

`SstAso.ts:8-9` declara no cabeçalho: *"Dado clínico sensível (LGPD): `resultado`, `restricoes`, `medico_examinador`, `arquivo_url`."* Quatro colunas nomeadas pelo próprio projeto.

Na coluna, porém:

- `restricoes` (`:45`) — **tem** `comment: 'Dado clínico sensível (LGPD)'`, confirmado no DDL (`:12954`). **Conforme.**
- `resultado` (`:44`) — `ENUM('apto','inapto','apto_com_restricoes')`, `allowNull: false`, **sem `comment` no model e sem `COMMENT ON COLUMN` no DDL** (os únicos comentários de `sst_asos` no baseline são `:12954`, `:12961`, `:12968`). **É o dado de saúde mais direto da tabela — a aptidão da pessoa — e o único dos quatro sem qualquer marcação.**
- `medico_examinador` (`:46`) e `arquivo_url` (`:49`) — sem marcação de sensibilidade no model.

**E não existe mecanismo.** A classificação de `employees` é executável — `employeeSensitiveFields.ts:36-51` lista os campos e `:92` os **aplica**. Para SST **não há artefato equivalente**: a classificação vive numa docstring, que nenhuma camada lê. Terceira instância da régua `AUD-DB-T31-01` — *"domínio na prosa, não no mecanismo"* — agora sobre **dado pessoal sensível de trabalhador**, não sobre domínio numérico.

**Terceiro ponto — coluna composta:** o DDL diz que `medico_examinador` guarda *"**Nome/CRM** do médico examinador"* (`:12961`) num único `character varying(150)` (`:12938`). **Dois dados distintos numa coluna**, um deles identificador profissional. Critério literal de `C-137`. **Nuance declarada:** a tabela alimenta o evento eSocial S-2220 (`status_esocial_s2220`, `:50`); se o layout exigir CRM em campo próprio, o dado não é extraível sem parsing de texto livre. **Não se afirma o requisito do layout** — norma externa não verificada (`RES-T41-02`).

**Critério de reteste:** módulo de classificação de campos sensíveis para SST, análogo a `employeeSensitiveFields.ts`, cobrindo no mínimo as 4 colunas que `SstAso.ts:8-9` já nomeia; `comment` em `resultado` na migration; decomposição de `medico_examinador`.

---

### `T41-LGPD-F07` — Prazo legal do art. 19 sem `DEFAULT` e sem `CHECK`, e documento do titular sem classificação

**Severidade proposta: LOW · Confiança: ALTA**

`JurLgpdDataSubjectRequest.ts:8-9` declara: *"`due_date` = `received_at + 15 dias` (art. 19, II), calculada em aplicação — **sem `DEFAULT` de banco**"*.

Confirmado no DDL: `due_date date NOT NULL` (`00_baseline_frozen.sql:8897`), sem default e **sem `CHECK` que a relacione a `received_at`** — as duas únicas constraints da tabela são as de identidade e justificativa (`:8908-8909`). **Um prazo legal de resposta ao titular pode ser gravado com qualquer data**, inclusive anterior ao recebimento, e o banco aceita.

Complemento: `requester_document STRING(20)` (`:8893`) e `requester_email` (`:8894`) são **dado pessoal do titular** e não constam de classificação alguma — a tabela criada para operacionalizar direitos da LGPD guarda dado pessoal não classificado. `data_subject_category STRING(100)` (`:8895`) é texto livre — mesmo padrão de `T35-LGPD-F10`.

**Por que LOW e não MEDIUM — teste do consumidor aplicado, e ele reprovou.** `JurLgpdDataSubjectRequest.ts:7` declara: *"endpoints do Grupo 6 (LGPD) ficam para a passada 2"*. **Não há caminho normal que grave esta tabela hoje**; o defeito é de schema latente, não de operação — mesma lógica que manteve `AUD-PAT-DEPRECIACAO-01` em MEDIUM apesar de real. **Sobe para MEDIUM assim que o Grupo 6 for exposto**, e é assim que deve constar da fila.

**Critério de reteste:** `CHECK (due_date >= received_at::date)` na migration e classificação de `requester_document`/`requester_email`.

---

### `T41-SUP-F08` — `purchase_requisitions.origin` é `STRING(80)` com o domínio escrito na prosa do `comment`

**Severidade proposta: MEDIUM · Confiança: ALTA**

`PurchaseRequisition.ts:32` — `origin: STRING(80), allowNull: false, defaultValue: 'manual', comment: 'manual, mrp, engenharia_amostra (UC-39), **etc.**'`

Três problemas numa linha:

1. **O domínio está no `comment`, não no tipo.** As colunas vizinhas `priority` (`:30`) e `status` (`:31`) são `ENUM` — a disciplina existe **no mesmo arquivo** e não foi aplicada aqui, o que descarta "não é a convenção do projeto". Mesma régua de `AUD-DB-T31-01` (MEDIUM).
2. **O `"etc."` torna o domínio declaradamente incompleto.** Um `comment` que termina em "etc." não é especificação: nenhum consumidor pode enumerar os valores possíveis, e nenhum reteste pode verificar exaustividade.
3. **`origin` é o discriminante de proveniência da requisição** (manual × MRP × engenharia). Qualquer segregação de alçada ou relatório de origem de gasto depende de comparação com literal de string, sujeita a divergência de grafia e caixa.

Registra-se também o par `approved_by` (`:33`) / `approval_date` (`:34`), ambos nullable e sem `CHECK` que os ligue a `status = 'approved'` — **quarta ocorrência** do padrão de `T35-EST-F05`.

**Critério de reteste:** `origin` convertido em `ENUM` (ou tabela de domínio com FK) na migration, com domínio exaustivo e sem "etc."; e `CHECK` ligando `approved_by`/`approval_date` a `status`.

---

### `T41-META-F09` — A lista nominal de `T-35` §3 soma 133, não 134; o déficit declarado está 1 acima do real

**Severidade proposta: LOW · Confiança: ALTA (aritmética verificável no artefato)**

`T-35:113` afirma: *"A soma nominal fecha em **134** tabelas com model […] 134 + 21 = 155."*

Recontagem, item a item, dos blocos de `T-35:91-111`: Suprimentos 11 (`:91`) + COMEX 2 (`:93`) + Estoque **8** (`:95`) + Produção 12 (`:97`) + Marketing 6 (`:99`) + RH 17 (`:101`) + SST 34 (`:103`) + Jurídico 15 (`:105`) + TI 10 (`:107`) + Facilities 13 (`:109`) + Governança **5** únicas (`:111`, descontadas as duas repetições que o próprio artefato marca como "conta uma vez") = **133**.

Note-se ainda que o rótulo do bloco de estoque diz *"Estoque / cadastro de item **(7)**"* (`:95`) enquanto o bloco lista **8** nomes — divergência interna do próprio artefato.

**Efeito:** o déficit correto é **133 + 21 = 154**, não 155; e a base nominal triada por esta trilha é de **133** tabelas.

**Divergência registrada, `T-35` não alterado (Regra 15).** Não se corrige artefato de outra trilha. O impacto é de **uma** tabela e **não** altera nenhuma conclusão de `T-35` — é reportado porque a disciplina de contagem honesta é o que dá valor aos números desta célula, e um número errado **a favor** do auditor (déficit maior = trabalho maior) merece o mesmo rigor que um errado contra.

**Critério de reteste:** contagem nominal reconciliada e publicada, com a identidade das 21 sem model resolvida (`RES-T35-02` / `DYN-T35-07`).

---

## 6. Contagem honesta de cobertura

### 6.1 Tabelas com passagem **integral** dos 7 critérios nesta trilha — **9**

Contam apenas as que tiveram **model lido coluna a coluna E pelo menos uma verificação externa** (DDL congelado, migration ou consumidor real). Model lido sozinho **não conta** — regra de `T-35`, mantida.

| # | Tabela | Banda | Verificação externa que a qualificou |
|---|---|---|---|
| 1 | `warehouses` | estoque | `UpdateWarehouseUseCase.ts:53`, `warehouseStockService.ts:84-92`, `CreateWarehouseTransferUseCase.ts:63-64`, DDL `:14975-14997` |
| 2 | `purchase_receipts` | fiscal | migration `20260731-000018:24-26`, DDL `:11648-11677` |
| 3 | `jur_contracts` | dinheiro | DDL `:8162-8167` (5 CHECKs), migration `20260807-000260:161-165` |
| 4 | `it_software_license_details` | dinheiro | DDL `:7415-7449` |
| 5 | `hr_job_positions` | dinheiro | DDL `:6080-6100` |
| 6 | `sst_asos` | dado pessoal | DDL `:12931-12968`, `asoGate.ts:26` |
| 7 | `sst_cats` | fiscal | migration `20260806-000136:63-84`, DDL `:2942`, `:22233` |
| 8 | `hr_employee_documents` | dado pessoal | DDL `:5914-5932`, `asoGate.ts:26`, `absenceRules.ts:82-84` |
| 9 | `jur_lgpd_data_subject_requests` | dado pessoal | DDL `:8889-8909` |

### 6.2 Tabelas lidas mas **não** contadas — 3

`purchase_requisitions`, `rfqs`, `item_suppliers` — model lido por inteiro (e `T41-SUP-F08` saiu de `purchase_requisitions`), **sem** verificação externa de migration ou consumidor. **Não fecham `C-137`**, e são declaradas assim de propósito. Um finding extraído de uma tabela **não** promove a tabela a coberta.

### 6.3 Estado da célula `C-137`

| Item | Valor |
|---|---|
| Denominador (herdado de `T-13:62-67`, **não reconstruído**) | **207** |
| Cobertas até `T-35` | 52 |
| **Cobertas por `T-41`** | **+9** |
| **Total** | **61 / 207 (29,5 %)** |
| Déficit remanescente | **146 / 207** (ou **145**, se prevalecer `T41-META-F09`) |

**Célula `C-137`: `A(52/207)` → `A(61/207)`. Delta explícito: `+9`. NÃO FECHADA.**

### 6.4 Quanto falta **dentro da banda INTEGRAL**

| Item | Valor |
|---|---|
| Banda INTEGRAL triada (§3.1) | **80** |
| Já cobertas por `T-13`/`T-31`/`T-35` | *não reconciliado tabela a tabela* — `RES-T41-01` |
| Cobertas por `T-41` | **9** |
| **INTEGRAL nomeadas e NÃO cobertas por esta trilha** | **71** |

**As 71 são, nominalmente, as 80 de §3.1 menos as 9 de §6.1.** Não se alega cobertura parcial sobre elas: 38 tiveram a **dimensão monetária** tocada pelo censo de `DECIMAL` de `T-35:63-67`, o que aquele artefato já declarou **não** ser fechamento de `C-137`.

Ao ritmo desta trilha (9 tabelas com verificação externa por lote), **as 71 restantes exigem ~8 lotes**, não os 2-3 previstos em `APR-2026-034` — número que depende de qual opção de §4 o dono escolher.

---

## 7. Conformidades verificadas — pesam tanto quanto os defeitos

1. **`purchase_receipts` impede NF duplicada no banco, não na aplicação.** `PurchaseReceipt.ts:6-10` afirma que o índice único `(purchase_id, invoice_number)` impede o lançamento duplo da mesma nota *"mesmo sob concorrência"*. **Verificado e verdadeiro:** `20260731-000018-create-purchase-receipts.cjs:24-26` cria o índice com `unique: true`. Docstring que promete mecanismo **e entrega mecanismo**.

2. **`jur_contracts` é a tabela mais bem restringida encontrada até aqui neste run — cinco `CHECK` reais no DDL.** `:8162` (`status='active'` exige `responsible_user_id`), `:8163` (`alert_advance_days >= 0`), `:8164` (`ck_jur_contracts_counterparty_exclusive`), `:8165` (`notice_days >= 0`), `:8167` (`value >= 0`). O CHECK de contraparte citado em `JurContract.ts:9-10` **existe** e está escrito em `20260807-000260:161-165`, com os quatro ramos mutuamente exclusivos. Regra de negócio imposta **pelo banco**.

3. **A imutabilidade legal da CAT é imposta por trigger, e o trigger existe.** `SstCat.ts:6-10` declara o `sst_lock_cat`; verificado em `20260806-000136:63-84` (função com `RAISE EXCEPTION` citando RNF-SST-01) e no baseline, tanto a função (`:2942`) quanto o trigger (`:22233`: `CREATE TRIGGER trg_sst_lock_cat BEFORE DELETE OR UPDATE ON public.sst_cats FOR EACH ROW`). **Isto resolve `RES-T35-06` para este trigger.**

4. **`jur_lgpd_data_subject_requests` impede resposta sem identidade verificada — hipótese de finding refutada, declarada.** Esta trilha partiu da hipótese de que a tabela permitiria `status='answered'` com `identity_verified=false` — entregar dado pessoal a quem não teve identidade conferida. **A hipótese é falsa.** `:8908` — `ck_jur_lgpd_dsr_in_progress_requires_verification CHECK (status <> ALL (ARRAY['in_progress','answered']) OR identity_verified = true)` — e `:8909` exige justificativa para `rejected_justified`. **Registra-se o falso positivo evitado**, porque foi a verificação no DDL, não a leitura do model, que o evitou. É a lição desta célula em forma concreta: *varredura por implementação não autoriza conclusão sobre capacidade* — nem para acusar.

5. **`hr_job_positions` tem `CHECK` de faixa salarial — segunda hipótese refutada.** `:6092` — `ck_hr_job_positions_salary_range CHECK (salary_range_min IS NULL OR salary_range_max IS NULL OR salary_range_min <= salary_range_max)`. E o DDL ainda classifica a coluna como dado sensível (`:6100`). Permanece verdadeiro apenas que a **periodicidade** não é declarada e que a marcação não chega ao model (`T41-META-F03`).

6. **`it_software_license_details` declara qual data é a canônica.** `:7449` — `renewal_date` é *"distinta de `assets.license_expires_at` (data canônica de vencimento)"*. Duas datas confundíveis, e o artefato diz **qual manda** — mesmo padrão de `sale_invoices` (`T-35` §5.12). E `:7427` impõe `seats > 0`.

7. **O saldo por depósito tem lock pessimista e não fica negativo.** `warehouseStockService.ts:49-71` — `findOrCreateLocked` usa `lock: Transaction.LOCK.UPDATE` **inclusive no ramo de criação**, recarregando com lock para igualar o comportamento de concorrência dos dois caminhos (`:61-67`, com o motivo escrito). `:156-173` bloqueia débito acima do saldo. **Concorrência de saldo por depósito não é finding.** Isto torna `T41-EST-F01` mais grave, não menos: o módulo **sabe** proteger saldo, e a única transição desprotegida é a do flag `active`.

8. **`warehouses.code` é imutável por decisão declarada e justificada.** `UpdateWarehouseUseCase.ts:7-10` — `code` nunca é editável *"pois é a chave usada pelo roteamento automático do dual-write […] em todo o sistema"*.

9. **`hr_employee_documents.aptitude_result` tem a intenção de privacidade escrita no DDL.** `:5932` — *"somente aptidão/validade, **nunca laudo clínico** (LGPD art. 5º II)"*. A minimização de dado clínico na cópia de RH é deliberada; o defeito de `T41-RH-F02` é o vínculo e o domínio, não a cópia. Registrado para que a remediação não destrua um controle existente.

10. **`item_suppliers` declara moeda e tem unicidade de par.** `ItemSupplier.ts:36` — `currency STRING(3) NOT NULL DEFAULT 'BRL'` ao lado de `unit_price` (`:35`); `:48` impõe `uq_item_suppliers_item_supplier (item_id, supplier_id)`, com índices de FK nomeados (`:49-50`). **Preço com moeda explícita** — o oposto de `PurchaseItem.unit_price` (`T35-CTB-F04`).

11. **`sst_asos` indexa as consultas críticas do PCMSO.** `SstAso.ts:57-62` — índices em `employee_id`, `tipo`, `data_vencimento` e `status_esocial_s2220`. O controle de vencimento de ASO (NR-7) e a fila de pendência eSocial **estão indexados**.

12. **`jur_contracts` indexa `end_date` e os três discriminantes de contraparte.** `JurContract.ts:100-108` — sete índices, incluindo `end_date`, chave da rotina de alerta de vencimento (`alert_advance_days`, `:82`).

---

## 8. Classificação de dado sensível — tranche `T-41`

| Coluna(s) | Sensibilidade | Situação |
|---|---|---|
| `sst_asos.restricoes` | **Alta** (saúde, art. 5º II) | **Classificada** — `SstAso.ts:45` + DDL `:12954` |
| `sst_asos.resultado` | **Alta** (aptidão = saúde) | **NÃO classificada** — sem `comment` no model nem no DDL |
| `sst_asos.medico_examinador` | **Média** (terceiro + registro profissional) | **NÃO classificada**; **campo composto** (DDL `:12961`) |
| `sst_asos.arquivo_url` | **Alta** (aponta laudo clínico) | **NÃO classificada** |
| `hr_employee_documents.aptitude_result` | **Alta** (saúde) | Intenção no DDL (`:5932`); **sem enforcement** |
| `hr_employee_documents.file_path` | **Alta** (documento pessoal) | **NÃO classificada** |
| `hr_job_positions.salary_range_min\|max` | **Média** | **Classificada no DDL** (`:6100`), ausente no model |
| `jur_lgpd_data_subject_requests.requester_document`, `requester_email` | **Alta** (titular) | **NÃO classificadas** |
| `jur_contracts.counterparty_doc` | **Alta** quando pessoa natural | **NÃO classificada** |
| `it_software_license_details.license_key` | **Alta** (segredo, não dado pessoal) | Controle declarado no DDL (`:7442`), **100 % de aplicação** por decisão registrada |

**Confirma `AUD-DB-T31-08` em quatro módulos novos (SST, RH-documentos, Jurídico, TI)** e reforça a nuance de `T-35` §5.7: existe **um** mecanismo de classificação executável no projeto — `employeeSensitiveFields.ts` — e ele cobre **uma** tabela. Todo o resto é prosa.

---

## 9. Pedidos de evidência dinâmica — registrados, **NÃO executados**

Nenhum foi executado. Nenhuma conexão a `erp_evok_audio` foi aberta.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T41-01` | Existe `warehouses.active = false` com `product_warehouse_stock.quantity <> 0` associado? Qual o valor preso? | Converte `T41-EST-F01` de risco latente em dano quantificado. |
| `DYN-T41-02` | A soma de `product_warehouse_stock` sobre depósitos **ativos** difere de `products.quantity` para algum produto? | Mede a violação da invariante §12 item 3. |
| `DYN-T41-03` | Existe funcionário com `sst_asos.resultado='inapto'` vigente **e** `hr_employee_documents` `aso_*` válido com `aptitude_result` `apto`/`apto_com_restricao`? | Materialização exata de `T41-RH-F02`; havendo uma linha, a severidade passa de HIGH a CRITICAL. |
| `DYN-T41-04` | Quantas linhas `aso_*` de `hr_employee_documents` não têm ASO correspondente em `sst_asos`? | Amplitude da réplica sem vínculo. |
| `DYN-T41-05` | Há `it_software_license_details` com `billing_cycle` distintos somados em relatório? Há mais `it_license_seats` que `seats`? | Materializa `T41-TI-F04` e decide se a severidade sobe. |
| `DYN-T41-06` | Há `jur_contracts` `'rental'`/`'employment'` com `value` preenchido? Ordem de grandeza vs `'commercial'`? | Revela empiricamente qual periodicidade está sendo gravada (`T41-JUR-F05`). |
| `DYN-T41-07` | Quais valores distintos existem de fato em `purchase_requisitions.origin`? | Fecha o "etc." de `T41-SUP-F08`. |
| `DYN-T41-08` | Existe `jur_lgpd_data_subject_requests` com `due_date < received_at::date`? | Materializa `T41-LGPD-F07` (provavelmente tabela vazia; "zero linhas" também é informação). |

---

## 10. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T41-01` | **A triagem de banda não foi reconciliada com as 52 já cobertas.** §6.4 não diz quantas das 80 INTEGRAL já haviam sido cobertas por `T-13`/`T-31`/`T-35`, porque aquelas trilhas não classificaram por banda. O "71" é limite superior. |
| `RES-T41-02` | **Layout eSocial S-2220/S-2210 não verificado.** A observação sobre CRM em `sst_asos.medico_examinador` não afirma requisito de layout. |
| `RES-T41-03` | **Busca de consumidor não exaustiva** para `it_software_license_details.cost` e `jur_contracts.value`. As severidades MEDIUM dependem disso. |
| `RES-T41-04` | **`facility_areas` classificada como EXCLUÍDA sob incerteza** — se o `DECIMAL` alimentar rateio de custo, reclassifica para INTEGRAL-D. |
| `RES-T41-05` | **`webhook_events` e `it_tickets` excluídos apesar de poderem conter dado pessoal em campo livre.** Exclusão por ausência de coluna tipada, não por ausência de risco. |
| `RES-T41-06` | Denominador **207 herdado**, não reconstruído (mantém `RES-T31-01`/`RES-T35-01`); `git diff c1311a6..HEAD` **não reconfirmado**. |
| `RES-T41-07` | **As 21 tabelas sem model continuam não nomeadas e não triadas** — não integram nem a lista INTEGRAL nem a EXCLUÍDA. A exclusão declarada de §3.2 **não as cobre**. |
| `RES-T41-08` | Reconciliação `COMMENT ON COLUMN` × `comment:` feita **apenas nas colunas citadas em `T41-META-F03`**; não é censo completo (mantém `RES-T35-05`). |

---

## 11. Divergências registradas (Regra 20)

1. **§4 — triagem por banda × exclusão por módulo em `APR-2026-034` D2.** As duas leituras da mesma decisão divergem em **31 tabelas**. Fonte autoritativa proposta: o **critério de banda**, porque é o que a decisão enuncia como regra; a lista de módulos é ilustração da regra, não a regra. **Decisão humana requerida** — envolve renunciar (ou não) à auditoria de semântica de dado de saúde de trabalhador.
2. **`T41-META-F09` × `T-35:113`** — soma nominal 133 × 134; déficit 154 × 155. `T-35` **não alterado**.
3. **`T41-META-F03` × `AUD-DB-T31-03`** — não é contradição: `-03` mediu o vetor `model → DDL`; esta trilha prova o vetor `DDL → model`. A remediação de `-03` precisa ser **bidirecional**, senão resolve metade do problema.
4. **`T41-EST-F01` × `T35-DIN-F06`** — os dois tratam de `active` e são **opostos**: lá o filtro falta e o registro inativo **volta**; aqui o filtro existe, está correto, e falta a **guarda na transição**. Uma remediação que apenas "adicione filtro de `active`" **não resolve** `T41-EST-F01` e pode ser confundida com resolução.
5. **§7.4 e §7.5 × método** — duas hipóteses de finding desta trilha foram **refutadas pelo DDL**. Registradas como conformidade e falso positivo evitado, para que o relatório final não seja lido como "auditoria só encontra defeito".

---

## 12. Estado

- **Célula `C-137`:** `A(52/207)` → **`A(61/207)`**, delta **`+9`**. **NÃO FECHADA.** Déficit **146/207** (145 pela aritmética de `T41-META-F09`).
- **Triagem de banda (produto principal deste lote):** **completa** sobre as 133 tabelas nomeáveis — **80 INTEGRAL** (§3.1) e **53 EXCLUÍDA** (§3.2), ambas nominais, satisfazendo a condição vinculante de `APR-2026-034`.
- **INTEGRAL não coberta por esta trilha:** **71**, nominalmente identificáveis por diferença entre §3.1 e §6.1.
- **Findings `PROPOSED`:** **9** — **2 HIGH** (`T41-EST-F01`, `T41-RH-F02`), **5 MEDIUM**, **2 LOW**. Os 2 HIGH seguem para `vericore-finding-validator` (Regra 22).
- **Conformidades verificadas:** **12**, incluindo **2 falsos positivos evitados** por verificação no DDL.
- **Divergências registradas:** **5**. **Resíduos:** **8**. **Pedidos dinâmicos:** **8**, nenhum executado.
- **Banco de produção:** **não acessado**. `APR-2026-016` íntegra.
- **`RES-T35-06` parcialmente resolvido:** trigger `sst_lock_cat` passou de "aceito como declarado" a **verificado** (§7.3).
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.
- `T-31_C137_SEMANTICA_COLUNA.md` e `T-35_C137_SEMANTICA_COLUNA_LOTE2.md` **não foram alterados** (Regra 15).

---

**Duas coisas que exigem ação do diretor antes do LOTE 4:**
1. A divergência de §4 — a decisão `APR-2026-034` D2 não é autoaplicável, e a escolha entre (a), (b) e (c) muda o número de lotes de 2-3 para até 8. A opção (b) implica aceitar por escrito ficar sem auditoria de semântica sobre dado de saúde de trabalhador.
2. `DYN-T41-03` é o pedido dinâmico de maior valor do lote: uma única linha de resultado eleva `T41-RH-F02` de HIGH a CRITICAL.
