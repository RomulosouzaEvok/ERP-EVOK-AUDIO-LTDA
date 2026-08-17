# T-42 — `C-137` Semântica de coluna, LOTE 4 (reconciliação `RES-T41-01` + 1ª ordem sob `APR-2026-036`)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-42` (continuação de `T-13` → `T-31` → `T-35` → `T-41`, célula `C-137` da EMENDA-02) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Mandato de escopo | **`APR-2026-036`** (dono, 2026-08-17) — opção **(c)** de `T-41` §4 |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linha. |
| Artefatos anteriores | `T-13`, `T-31`, `T-35`, `T-41`, `AUD-DB-09_RETIFICACAO_01` — **não alterados** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`, `T-35:13`, `T-41:14`). Persistido pelo orquestrador **sem alteração**.

> **Nota de execução.** Três tentativas de lote caíram por infraestrutura antes desta. Escopo dimensionado para caber em uma passagem: **menor e inteiro**, não maior pela metade. O produto de maior valor (§2, a reconciliação) foi produzido **primeiro**, porque é o que sobrevive ainda que o resto caia.

---

## 1. O que `APR-2026-036` mandou fazer

> **Cobertura integral** das **57 tabelas de 1ª ordem**. **Exclusão declarada nominalmente** das **23 de 2ª ordem** (marcadas `*` em `T-41` §3.1).

E, expressamente: *"o dado de saúde de trabalhador **permanece coberto**. Não houve aceitação de risco sobre categoria especial de dado pessoal."*

**Efeito imediato sobre a contagem:** as 23 de 2ª ordem saem do denominador de trabalho desta célula. As 71 "INTEGRAL não cobertas" de `T-41` §6.4 **não** são mais o alvo — o alvo passa a ser o subconjunto de 1ª ordem, e §2 mede exatamente quanto é.

---

## 2. `RES-T41-01` — **RESOLVIDO**. O número honesto do que falta

`T-41` §6.4 declarou "71" como **limite superior**, porque não sabia quantas das 80 INTEGRAL já haviam sido cobertas por `T-13`/`T-31`/`T-35`. Esta trilha resolve por **prova de construção**, não por conferência item a item.

### 2.1 A prova: a sobreposição é **ZERO**, e é estrutural

O universo triado por `T-41` §3.1 é, literalmente (`T-41:65`), *"as 134 tabelas com model listadas em `T-35:91-113`"*. E `T-35:87` intitula essa mesma lista: **"Lista nominal das 155 não cobertas"**. Ou seja, o universo da triagem de banda **já era o complemento do conjunto coberto** — `T-35:83` chega a registrar que `suppliers` foi relido mas *"já constava da amostra de `T-13:54` — não é contado como cobertura nova"*, prova de que a lista foi construída excluindo o que estava coberto.

**Consequência:** nenhuma das 80 tabelas INTEGRAL de `T-41` §3.1 havia sido coberta por `T-13` (22), `T-31` (12) ou `T-35` Tier A (18). As 52 anteriores e as 80 INTEGRAL são conjuntos **disjuntos por construção**.

**`RES-T41-01` fecha assim: o "71" de `T-41` §6.4 não era limite superior — era o número exato.** Registro como **erro de contagem a meu próprio favor**: eu havia declarado incerteza onde a evidência já bastava para afirmar. A disciplina exige reportar isto com o mesmo rigor de um erro contra.

### 2.2 O número honesto **depois** de `APR-2026-036`

| Item | Valor |
|---|---|
| Banda INTEGRAL triada (`T-41` §3.1) | 80 |
| **2ª ordem — EXCLUÍDA por `APR-2026-036`** | **23** |
| **1ª ordem — escopo obrigatório** | **57** |
| Cobertas por `T-41` §6.1 (todas as 9 são de 1ª ordem, nenhuma marcada `*`) | 9 |
| **Cobertas por `T-42` (esta trilha, §4)** | **6** |
| **1ª ordem AINDA NÃO COBERTA** | **42** |

**42, não 71.** A diferença (29) é: 23 excluídas pela decisão do dono + 6 cobertas aqui.

### 2.3 Aritmética por banda — verificada nome a nome sobre `T-41` §3.1

| Banda | 1ª ordem | Cobertas (`T-41`) | Cobertas (`T-42`) | **Falta** |
|---|---|---|---|---|
| **DINHEIRO (D)** | 29 (34 − 5 de 2ª ordem) | 3 | 1 | **25** |
| **ESTOQUE (E)** | 5 (6 − 1) | 1 | 4 | **0 — BANDA FECHADA** |
| **FISCAL (F)** | 3 (3 − 0) | 2 | 1 | **0 — BANDA FECHADA** |
| **DADO PESSOAL (P)** | 20 (37 − 17) | 3 | 0 | **17** |
| **Total** | **57** | **9** | **6** | **42** |

Contagem das marcas `*` conferida: 5 (D) + 1 (E) + 0 (F) + 17 (P) = **23**. Fecha com `APR-2026-036`.

### 2.4 Lista nominal das **42** de 1ª ordem que faltam — publicada, como o mandato exige

**DINHEIRO — 25**
`purchase_order_items`, `purchase_requisition_items`, `rfq_items`, `rfq_quotes`, `import_processes`, `import_process_items`, `item_estruturas`, `item_detalhes_comerciais`, `production_routes`, `production_route_steps`, `non_conformities`, `maintenance_orders`, `service_orders`, `marketing_campaigns`, `marketing_events`, `hr_training_courses`, `hr_employee_job_history`, `hr_employee_benefits`, `engineering_projects`, `jur_contract_addendums`, `jur_legal_cases`, `facility_fines`, `facility_vehicle_details`, `facility_vehicle_documents`, `facility_fuel_records`.

**ESTOQUE — 0.** *(As 5 são `warehouses` — `T-41` — e as 4 desta trilha.)*

**FISCAL — 0.** *(As 3 são `purchase_receipts` e `sst_cats` — `T-41` — e `sst_eventos_esocial` desta trilha.)*

**DADO PESSOAL — 17**
`hr_employee_contracts`, `hr_admission_processes`, `hr_termination_processes`, `hr_vacation_accrual_periods`, `marketing_leads`, `marketing_lead_saneamento_log`, **`sst_exames_complementares`**, **`sst_acidentes`**, **`sst_acidente_complementos`**, `sst_investigacoes_acidente`, `sst_acidente_testemunhas`, `sst_entregas_epi`, `sst_devolucoes_epi`, `jur_contract_signatories`, `jur_external_lawyers`, `facility_drivers`, `facility_visitors`.

> **Prioridade que registro para o próximo lote, sem decidir por ninguém:** as três em negrito são **dado de saúde de trabalhador** (LGPD art. 5º II) e são exatamente a categoria que `APR-2026-036` decidiu **não** abrir mão. São o primeiro alvo do LOTE 5.

### 2.5 As 23 de 2ª ordem — exclusão declarada, reproduzida nominalmente

`APR-2026-036` obriga a reproduzir a lista, *"não substituída por frase genérica de escopo"*. Reproduzida aqui para que exista fora de `T-41`:

`purchase_requisitions`, `purchase_order_approvals`, `rfqs`, `import_process_approvals`, `jur_contract_approvals`, `master_production_plans`, `hr_employee_trainings`, `hr_vacation_schedules`, `hr_time_import_batches`, `sst_ges_funcionarios`, `sst_treinamentos`, `sst_brigadistas`, `sst_membros_cipa`, `sst_candidatos_cipa`, `sst_reuniao_cipa_presentes`, `sst_dds_presencas`, `sst_permissoes_trabalho`, `sst_pt_executantes`, `jur_proxies`, `it_responsibility_terms`, `it_license_seats`, `it_access_requests`, `facility_visits`.

**Nenhuma delas foi auditada quanto aos 7 critérios de `C-137`.** Afirmação, não omissão. Somam-se às 53 de `T-41` §3.2 e às **21 sem model** (`RES-T41-07`), que continuam **fora** de qualquer exclusão declarada, porque excluir nominalmente exige nomear.

---

## 3. Método — regra de contagem mantida, sem afrouxamento

Só conta como **coberta** a tabela com **model lido coluna a coluna E pelo menos uma verificação externa** (DDL congelado, migration ou consumidor real). **Model sozinho não conta.** Regra fixada em `T-35`, mantida em `T-41` §6.1, mantida aqui.

Ordem executada, conforme o mandato: **dinheiro → estoque → fiscal → dado pessoal**. A alocação priorizou **fechar bandas inteiras** — estoque (4 restantes) e fiscal (1 restante) eram as duas bandas em que o esforço de um lote produz **cobertura de 1ª ordem completa e verificável**, em vez de mais um recorte parcial. Dado pessoal ficou sem cobertura nova nesta trilha, e isso é declarado, não escondido (§9, `RES-T42-01`).

### 3.1 Correção metodológica que esta trilha aplica a si mesma

O `00_baseline_frozen.sql` é um `pg_dump` (`:1-8`) **anterior a 9 migrations** — fato que eu próprio estabeleci em `AUD-DB-09_RETIFICACAO_01:88,97` (*"grep nas 9 migrations pós-freeze"*). Reconfirmado nesta trilha por dois marcadores independentes:

- `purchase_orders.requester_id integer` (baseline `:11530`) — **ainda nullable**, logo a migration `20260810-000040` **não** está no dump;
- `directorates` e `hr_time_import_batches` (migrations `-000043` e `-000045`) — **ausentes** do dump.

**Consequência para esta célula, e é uma armadilha real:** para toda tabela criada depois de `20260810-000038`, *"não achei no baseline"* **não é evidência de ausência de constraint** — é evidência de que o artefato não alcança a tabela. Ver §7.1, onde essa exata hipótese foi levantada e morreu.

---

## 4. Tabelas cobertas nesta trilha — **6**

| # | Tabela | Banda | 1ª ordem | Verificação externa que a qualificou |
|---|---|---|---|---|
| 1 | `sale_lot_shipments` | estoque | sim | migration `20260810-000039:61-142` lida integralmente; consumidores `saleLotService.ts:423-424,471,484,503-504`, `saleStockService.ts`, `CancelSaleNfeUseCase.ts`, `ChangeSaleStatusUseCase.ts` |
| 2 | `production_order_reservations` | estoque | sim | DDL `00_baseline_frozen.sql:10728-10749` (4 `CHECK`) |
| 3 | `master_production_plan_lines` | estoque | sim | DDL `:9840-9871` (1 `CHECK`, `COMMENT ON TABLE`) |
| 4 | `quality_inspections` | estoque/qualidade | sim | DDL `:11794-11840`, `:17875`, `:20903-20917`, `:25272-25288`; consumidor `CreateQualityInspectionUseCase.ts:128-158`; `constants.ts:53-64` |
| 5 | `sst_eventos_esocial` | **fiscal** | sim | DDL `:13318-13352`, `:18115`, `:21288-21309`, **`:22093`** (índice único parcial) |
| 6 | `item_suppliers` | dinheiro | sim | DDL `:7860-7874`, `:18395`, `:19944-19951`, `:24416-24424`; consumidores `SequelizeItemSupplierRepository.ts:13,44,64-68`, `ConvertRequisitionToPurchaseOrdersUseCase.ts:135-138`, `createRequisitionFromPlannedOrders.ts:108-117` |

**Bandas ESTOQUE e FISCAL de 1ª ordem: fechadas** (5/5 e 3/3, somando `T-41`). É a primeira vez neste run que uma banda de `C-137` fecha integralmente.

---

## 5. Findings `PROPOSED`

Severidade e confiança **declaradas separadamente**. Régua aplicada, sem repetição mecânica: **HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real**. Nenhum dos achados deste lote passou nesse teste — e isso é dito explicitamente em cada um, com o motivo. **Nenhum HIGH neste lote não é sinal de leniência: é o mesmo teste que produziu 2 HIGH em `T-41` aplicado a um material que não os sustenta.**

---

### `T42-EST-F01` — `sale_lot_shipments` promete paridade com o `CHECK` de coerência do G3 e implementa metade dele; o consumidor de devolução filtra justamente pela coluna desprotegida

**Severidade proposta: MEDIUM · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto à materialização**

A migration `20260810-000039:125-127` declara, em comentário, a intenção:

> *"Coerência status × saldo devolvido, **no mesmo espírito do `CHECK` de `production_order_reservations` (G3)**: `'returned'` significa nada a devolver, e não pode existir devolução maior que a saída."*

São **duas** promessas. O SQL escrito logo abaixo (`:128-132`) cumpre **uma**:

```
CHECK (quantity_returned >= 0 AND quantity_returned <= quantity)
```

A tabela citada como referência tem, no DDL congelado, **os dois** controles separados (`:10742` e `:10743`):

| Controle | `production_order_reservations` | `sale_lot_shipments` |
|---|---|---|
| Faixa do saldo devolvido | `chk_..._released_range` (`:10742`) | **presente** (`-000039:130-131`) |
| **Coerência `status` × saldo** | `chk_..._status_coherence` (`:10743`) — `active ⇒ released < quantity`, `released ⇒ released = quantity` | **AUSENTE** |

**Portanto é gravável, no banco:** `status = 'returned'` com `quantity_returned < quantity`, e `status = 'shipped'` com `quantity_returned = quantity`.

**Por que a coluna desprotegida importa — o consumidor.** `saleLotService.ts:471` monta a devolução com `where = { sale_id, status: 'shipped' }` e só então, em `:484`, calcula `outstanding = quantity − quantity_returned`. As duas incoerências têm efeitos **assimétricos**:

- `'shipped'` com saldo zerado → `outstanding = 0`. **Inócuo.**
- `'returned'` com saldo devedor → a linha **não entra no `where` de `:471`** e o saldo **nunca volta ao lote** no cancelamento da NF-e. O rastro de recall (motivo declarado da tabela, `SaleLotShipment.ts:12-26`) fica errado **em silêncio**, e a devolução ao mesmo lote (decisão **D-M** do dono) deixa de ocorrer sem erro visível.

**Por que MEDIUM e não HIGH — teste do consumidor aplicado, e ele reprovou parcialmente.** Os caminhos de escrita lidos gravam o par de forma coerente: `:423-424` cria com `quantity_returned: 0` + `'shipped'`, e `:503-504` grava `quantity_returned = quantity` **junto com** `'returned'`. **Não se localizou caminho normal que produza a incoerência perigosa.** O defeito é de **ausência de lastro no banco** para uma invariante que hoje só a aplicação sustenta — e o artefato afirma tê-la no banco. Mesma classe de `T41-TI-F04` (patologia real, sem consumidor que a materialize provado). **Limitação declarada:** `saleStockService.ts` e `CancelSaleNfeUseCase.ts` foram identificados como consumidores mas **não lidos linha a linha** (`RES-T42-02`); havendo neles escrita parcial de `status`, a severidade sobe.

**Critério de reteste objetivo (estático):** `CHECK` de coerência `status` × `quantity_returned` em `sale_lot_shipments`, em migration versionada, com a mesma forma do `chk_production_order_reservations_status_coherence`; **e** teste de regressão que reprove `INSERT`/`UPDATE` de `status='returned'` com `quantity_returned < quantity`.

---

### `T42-PCP-F02` — `master_production_plan_lines`: 12 colunas numéricas, 3 fórmulas declaradas em `comment`, **1** `CHECK` no banco; e a decisão do planejador não tem par estado/autor imposto

**Severidade proposta: MEDIUM · Confiança: ALTA**

A tabela é o registro auditável do MPS (G17). O model declara, em `comment:`, **três identidades aritméticas explícitas**:

| Coluna | `comment` do model | Imposto no banco? |
|---|---|---|
| `gross_requirement` (`MasterProductionPlanLine.ts:72`) | *"Soma das tres demandas"* | **não** |
| `net_requirement` (`:77`) | *"`max(0, gross_requirement − supply_on_hand − supply_in_production)`"* | **não** |
| `supply_on_hand` (`:73`) | *"Saldo de PLANEJAMENTO: `max(0, fisico − retido − reservado)`"* | **não** |

No DDL congelado (`:9840-9863`) existe **um único** `CHECK` em toda a tabela:

```
chk_master_production_plan_lines_planned_quantity_non_negative CHECK (planned_quantity >= 0)
```

As outras **onze** colunas `numeric(18,6)` — `demand_sales_orders`, `demand_safety_stock`, `demand_forecast`, `gross_requirement`, `supply_on_hand`, `supply_withheld`, `supply_reserved`, `supply_in_production`, `net_requirement`, `suggested_quantity` — **aceitam valor negativo**, inclusive as duas cujo `comment` diz literalmente `max(0, …)`. Uma coluna documentada como não-negativa e gravável negativa é a régua de `AUD-DB-T31-01` — *"domínio na prosa, não no mecanismo"* — aplicada a **onze** colunas de uma vez.

**Segundo defeito, mesma tabela — o par decisão/autor.** `decided_by` (`:88`) e `decided_at` (`:89`) são ambos nullable e **não há `CHECK` que os ligue a `status`**. O cabeçalho do model (`:16-19`) declara que a separação sugestão × decisão existe *"para auditar **onde o planejador divergiu do cálculo**"* — mas `status = 'planned'` com `decided_by IS NULL` é gravável, e a auditoria de divergência perde justamente o **quem**. É a **quinta ocorrência** do padrão de `T35-EST-F05` (`aprovador`/`data` nullable sem `CHECK` ligando ao estado), depois de `purchase_requisitions` (`T41-SUP-F08`).

**Por que MEDIUM e não HIGH.** Não se provou consumidor que **leia** `net_requirement`/`gross_requirement` gravados e os propague a decisão financeira ou a compra sem recalcular — as colunas são declaradas como registro auditável (*"guardado para auditoria"*, `:74-75`), não como entrada de cálculo. Sem consumidor agregador provado, o dano é de **rastreabilidade de planejamento**, não de dinheiro em curso. **Limitação declarada:** busca de consumidor não exaustiva (`RES-T42-02`).

**Critério de reteste:** `CHECK (coluna >= 0)` para as 11 colunas numéricas em migration versionada; `CHECK` ligando `decided_by`/`decided_at` a `status IN ('planned','dismissed','released')`; e, para as três identidades aritméticas, **ou** `CHECK` de identidade **ou** coluna gerada — a escolha é de engenharia, mas "só no `comment`" deixa de ser aceitável.

---

### `T42-FIS-F03` — `sst_eventos_esocial`: a origem do evento legal é polimórfica **sem integridade referencial**, o prazo legal é nullable, e o estado de transmissão não exige recibo

**Severidade proposta: MEDIUM · Confiança: ALTA**

Esta é a última tabela de 1ª ordem da banda **fiscal**, e guarda o rastro de obrigação acessória do eSocial (S-2210/S-2220/S-2240).

**1. FK polimórfica sem FK.** `origem_tipo` + `origem_id` (`:13321-13322`, ambos `NOT NULL`) apontam para três tabelas distintas — o próprio DDL admite: *"`cat->sst_cats`, `aso->sst_asos`, `ges_funcionario->sst_ges_funcionarios` (ver nota polimórfica no cabeçalho)"* (`:13338`). **Nenhuma `FOREIGN KEY` é possível nesse desenho, e não há nenhuma.** Um `origem_id` pode apontar para linha inexistente, ou — pior, porque é silencioso — para a linha **de outra tabela** com o mesmo `id`, se `origem_tipo` for gravado errado. O evento que prova o cumprimento de obrigação legal não tem vínculo verificável com o fato gerador.

**2. Prazo legal nullable, com a regra de cálculo em aberto no próprio schema.** `prazo_legal date` (`:13324`) — **sem `NOT NULL`, sem `DEFAULT`, sem `CHECK`**. E o comentário de coluna (`:13352`) carrega um TODO não resolvido gravado no schema: *"Prazo calculado em app conforme calendário eSocial vigente (BR-SST-028/029, **[VERIFICAR COM TÉCNICO SST DA EMPRESA]**)"*. Um prazo de obrigação acessória pode ser gravado **ausente**, e a regra que o define está declarada como não confirmada. Mesma classe de `T41-LGPD-F07` (prazo legal sem lastro em banco), aqui **agravada** por a coluna ser nullable e a regra estar explicitamente em dúvida.

**3. Estado de transmissão sem `CHECK`.** `status` (`:13325`, default `'pendente'`), `recibo varchar(80)` (`:13326`), `motivo_rejeicao text` (`:13327`) e `data_envio` (`:13328`) são todos nullable e **nenhum `CHECK` os liga**: é gravável `status = 'enviado'` **sem `recibo` e sem `data_envio`** — isto é, marcar como transmitida ao eSocial uma obrigação **sem o número do recibo que é a prova da transmissão** —, e `status = 'rejeitado'` sem `motivo_rejeicao`. Sexta ocorrência do padrão de `T35-EST-F05`, agora sobre registro de obrigação legal.

**Por que MEDIUM e não HIGH — teste do consumidor aplicado.** Não se localizou, nesta trilha, integração que **transmita** de fato ao eSocial (a tabela guarda `payload_referencia` como *"snapshot/referência"*, `:13345`, não um envio); e o módulo SST está classificado **NÃO-PRODUÇÃO** em `PRODUCTION_STATUS_MAP.md`, com a severidade justificada pelo padrão que será promovido — enquadramento uniforme de `APR-2026-018`. Sem transmissor real provado, o dano é latente. **Sobe assim que existir integração eSocial ativa**, e é assim que deve constar da fila.

**Critério de reteste:** discriminante de origem com integridade — três colunas FK exclusivas com `CHECK` de exatamente-um-dono (o desenho que o próprio projeto já usa em `chk_stock_reservations_exactly_one_owner`, `:10744`) **ou** tabela-ponte por tipo; `prazo_legal NOT NULL` com regra versionada (e o `[VERIFICAR]` resolvido por decisão humana registrada, Regra 6); `CHECK` ligando `status='enviado'` a `recibo IS NOT NULL AND data_envio IS NOT NULL` e `status='rejeitado'` a `motivo_rejeicao IS NOT NULL`.

---

### `T42-SUP-F04` — `item_suppliers`: "um fornecedor preferencial por item" é regra de aplicação sem lastro nenhum no banco, e o preço que ela seleciona entra em pedido de compra

**Severidade proposta: MEDIUM · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto à concorrência**

`ItemSupplier.ts:9` declara a regra: *"vários fornecedores por item, com **um** marcado como `preferred`"*. No banco (`:7869`) `preferred` é apenas `boolean DEFAULT false NOT NULL`. **Não há índice único parcial `WHERE preferred`** — a única unicidade da tabela é `uq_item_suppliers_item_supplier (item_id, supplier_id)` (`:18395`), que impede par duplicado, **não** dois preferenciais.

**O consumidor é real e é de dinheiro.** `SequelizeItemSupplierRepository.ts:44` — `findPreferredByItem` faz `where { item_id, preferred: true, active: true }` e devolve **um**; havendo dois, a escolha é indeterminada. Quem consome:

- `ConvertRequisitionToPurchaseOrdersUseCase.ts:135-138` — define **`supplierId`** e **`supplierUnitPrice`** do pedido de compra gerado;
- `createRequisitionFromPlannedOrders.ts:108-117` — define `suggested_supplier_id` e `unit_price_estimated` da requisição gerada pelo MRP.

Ou seja: **de qual fornecedor comprar e a que preço** dependem de uma unicidade que o banco não impõe.

**Controle compensatório encontrado — e é por isso que não é HIGH.** Antes de acusar, procurei o controle (exigência do meu próprio mandato). Ele existe: `SequelizeItemSupplierRepository.ts:64-68` — `clearPreferred` faz `ItemSupplier.update({ preferred: false }, { where: { item_id, preferred: true }, ...transaction })`, e é chamado tanto na criação (`CreateItemSupplierUseCase.ts:74`) quanto na atualização (`UpdateItemSupplierUseCase.ts:55`), com `transaction` propagada. `DeactivateItemSupplierUseCase.ts:37` ainda zera `preferred` junto com `active: false`, e `AwardRfqUseCase.ts:330` cria vínculo com `preferred: false` explícito. **A regra é sustentada de forma consistente em todos os caminhos de escrita lidos.** O defeito é a **ausência de lastro em banco** sob concorrência (dois `create` simultâneos com `preferred: true` em transações distintas podem ambos limpar o estado anterior e ambos gravar), não uma falha no caminho normal sequencial. **Confiança MÉDIA quanto à concorrência**, declarada: o nível de isolamento efetivo das transações **não foi verificado** (`RES-T42-03`).

**Segundo ponto, de domínio monetário:** `unit_price numeric(18,6)` (`:7864`) é **nullable e sem `CHECK >= 0`** — preço negativo de compra é gravável e flui por `:138` para `supplierUnitPrice`. `moq numeric(18,6)` (`:7867`) e `lead_time_days integer` (`:7866`) também sem `CHECK` de não-negatividade. Confirma `T35-CTB-F04` (coluna monetária sem guarda de domínio) numa tabela que **acerta** a moeda (§7.7) e **erra** o sinal.

**Critério de reteste:** `CREATE UNIQUE INDEX ... ON item_suppliers (item_id) WHERE preferred` em migration versionada — a mesma técnica de índice único parcial que o projeto já domina (`uq_sst_eventos_esocial_origem_ativo`, `:22093`); `CHECK (unit_price IS NULL OR unit_price >= 0)` e equivalentes para `moq`/`lead_time_days`; teste de regressão que reprove dois preferenciais para o mesmo item.

---

### `T42-QUA-F05` — `quality_inspections`: a evidência ISO 9001 §8.6 aceita amostra maior que o lote e defeitos negativos no banco

**Severidade proposta: LOW · Confiança: ALTA**

A tabela é a evidência de conformidade exigida pela ISO 9001:2015 §8.6/§8.7 (`COMMENT ON TABLE`, `:11819`). O DDL (`:11794-11812`) não tem **nenhum** `CHECK` — grep por `chk_quality_inspections`/`ck_quality_inspections` no baseline: **zero ocorrências**. Consequências:

1. `lot_size` e `sample_size` (`:11801-11802`) não têm relação imposta: **`sample_size > lot_size` é gravável** — amostra maior que o lote inspecionado, que é evidência aritmeticamente impossível;
2. `defects_found integer DEFAULT 0 NOT NULL` (`:11803`) — a não-negatividade existe **apenas** em `validate: { min: 0 }` no model (`QualityInspection.ts:102`), que é validação Sequelize, não constraint. Escrita fora do model grava negativo;
3. `non_conformity_id` (`:11806`) é nullable e **não há `CHECK`** ligando-o a `verdict = 'rejected'`, embora o model (`:106`) declare *"`rejected` abre RNC"*.

**Por que LOW, e não MEDIUM — o controle decisivo existe e foi verificado.** A hipótese forte que abri contra esta tabela era outra: *"concessão sem justificativa"*, isto é, `verdict = 'approved_under_concession'` com `concession_justification NULL`, que liberaria produto não conforme sem o registro que a ISO 9001 §8.7 exige — e `constants.ts:64` confirma que `approved_under_concession` **libera o lote** (`RELEASING_VERDICTS`). O banco **de fato não impede** (coluna `text` nullable, `:11805`). **Mas a aplicação impede, e com rigor maior que um `NOT NULL`:** `CreateQualityInspectionUseCase.ts:128-132` faz `trim()` e recusa com erro de regra de negócio quando o comprimento é menor que `MIN_CONCESSION_JUSTIFICATION_LENGTH`, citando a ISO no texto do erro; `:158` grava `null` deliberadamente para os demais vereditos. **Justificativa em branco ou só com espaços é recusada — um `CHECK (… IS NOT NULL)` não pegaria isso.** Com o controle decisivo cumprido, o que resta são falhas de qualidade da evidência, sem consequência provada sobre estoque, dinheiro ou liberação de lote. LOW.

**Critério de reteste:** `CHECK (sample_size IS NULL OR lot_size IS NULL OR sample_size <= lot_size)`, `CHECK (defects_found >= 0)` e `CHECK (verdict <> 'rejected' OR non_conformity_id IS NOT NULL)` — este último **condicionado** a confirmar que a RNC é criada antes da inspeção no fluxo real, o que **não** foi verificado aqui.

---

### `T42-META-F06` — Dois models afirmam que sua migration "não foi aplicada" quando o schema congelado mostra a tabela criada

**Severidade proposta: LOW · Confiança: ALTA (verificável por leitura direta dos dois artefatos)**

| Artefato | Afirma | DDL congelado mostra |
|---|---|---|
| `QualityInspection.ts:44-48` | *"⚠️ A migration `20260810-000032` que cria a tabela ainda **não foi aplicada** ao banco de desenvolvimento (está na fila de pendentes) […] **nenhuma consulta a `quality_inspections` funciona** antes de a migration rodar."* | `CREATE TABLE public.quality_inspections` (`:11794`), com PK, UNIQUE, 3 índices e 3 FKs |
| `MasterProductionPlanLine.ts:30-31` | *"⚠️ A migration `20260810-000037` ainda **não foi aplicada** ao banco de desenvolvimento."* | `CREATE TABLE public.master_production_plan_lines` (`:9840`), com `CHECK` e `COMMENT ON TABLE` |

O baseline é um `pg_dump` do banco (`:1-8`) e é **posterior** a essas duas migrations — provado em §3.1 pelos marcadores `-000040`/`-000043`. Logo os avisos são **prosa vencida**, não estado corrente.

**Por que é defeito e não curiosidade.** É o mesmo vetor de `T41-META-F03`, invertido em objeto: o artefato que o desenvolvedor lê afirma um **estado de infraestrutura** que já não vale, e a afirmação é acionável no sentido errado — quem a lê conclui que a tabela não existe e que a consulta falha. A consequência plausível é escrever migration duplicada ou abandonar um caminho de código funcional. Não é a marcação semântica de coluna que `C-137` persegue, mas é **`comment`/docstring × realidade do schema**, que é o 7º critério da célula.

**Por que LOW.** Sem consumidor: nenhuma decisão de sistema é tomada sobre esse texto; o custo é de tempo humano e de risco de retrabalho, não de dado. Mesma faixa de `T41-META-F09`.

**Critério de reteste:** remoção ou correção das duas notas, **e** — remediação de raiz — a verificação versionada já pedida em `T41-META-F03` estendida a "model afirma estado de migration", ou a **regeneração do baseline congelado** (`RES-T42-04`), que torna a divergência detectável por diff.

---

## 6. Classificação de dado sensível — tranche `T-42`

| Coluna(s) | Sensibilidade | Situação |
|---|---|---|
| `sst_eventos_esocial.origem_id` + `origem_tipo` | **Indireta alta** — quando `origem_tipo IN ('aso','ges_funcionario')`, a linha **vincula pessoa a evento de saúde ocupacional** | **NÃO classificada** — nenhum `comment` de sensibilidade no model nem no DDL; o `COMMENT` de `:13338` é técnico |
| `sst_eventos_esocial.payload_referencia` | **Alta** — *"snapshot/referência dos dados enviados (JSON serializado)"* (`:13345`); para S-2220/S-2210 o payload **contém dado clínico** | **NÃO classificada.** Campo livre que replica dado sensível fora da tabela de origem — mesma patologia de `RES-T41-05` (`webhook_events`), aqui com **coluna tipada e finalidade declarada**, o que a torna mais concreta |
| `quality_inspections.inspector_id` | Baixa (funcional) | Conforme — FK a `users` com `ON DELETE RESTRICT` (`:25272`) |
| `item_suppliers.*` | Nenhuma (pessoa jurídica) | N/A |

**Nota para o LOTE 5:** `payload_referencia` é a **quinta** ocorrência do padrão `AUD-DB-T31-08` (dado pessoal sem classificação fora de `employees`), e a primeira em que o dado sensível é **replicado em texto livre por decisão de desenho declarada**. Continua valendo que existe **um** mecanismo executável de classificação no projeto — `employeeSensitiveFields.ts` — cobrindo **uma** tabela.

---

## 7. Conformidades verificadas — pesam tanto quanto os defeitos

**7.1 — Falso positivo evitado, e era o achado mais chamativo do lote.** `sale_lot_shipments` **não existe** no `00_baseline_frozen.sql` (grep: zero ocorrências). A leitura imediata seria drift grave: tabela que sustenta o gate de qualidade na saída (D-L) e a rastreabilidade de recall (D-M) ausente do schema. **A hipótese é falsa.** O baseline é anterior à migration `20260810-000039` — provado por dois marcadores independentes (§3.1) e coerente com o que eu próprio registrei em `AUD-DB-09_RETIFICACAO_01:88`. A migration existe, está completa e é bem-feita (`:61-142`). **Registro o falso positivo com destaque**, porque ele decorre de um viés de método que a própria trilha carrega: *ausência no artefato de referência não é ausência no objeto quando o artefato de referência é sabidamente incompleto.*

**7.2 — `production_order_reservations` é a tabela mais bem restringida encontrada nesta célula até aqui: 4 `CHECK` reais.** `:10741` (`quantity > 0`), `:10742` (faixa de `quantity_released`), `:10743` (**coerência `status` × saldo**, nos dois sentidos) e `:10744` (`chk_stock_reservations_exactly_one_owner`, exatamente-um-dono entre `production_order_id` e `sale_id`). O cabeçalho do model (`:19-32`) **promete** o CHECK de dono único citando-o pelo nome; **a promessa é cumprida no banco**. E `quantity > 0` existe nas duas camadas (`ProductionOrderReservation.ts:66` `validate: { min: 0.000001 }` + `CHECK`) — redundância correta, não substituição.

**7.3 — `sst_eventos_esocial` impede evento duplicado por índice único parcial, e a hipótese contrária morreu na verificação.** Abri a hipótese de que o mesmo CAT pudesse gerar dois eventos eSocial. **Falsa:** `:22093` — `CREATE UNIQUE INDEX uq_sst_eventos_esocial_origem_ativo ON public.sst_eventos_esocial USING btree (origem_tipo, origem_id) WHERE (status <> 'rejeitado')`. O desenho é preciso: unicidade da origem **entre os eventos não rejeitados**, permitindo reemissão depois de rejeição — que é exatamente o comportamento correto para obrigação acessória. **Segundo falso positivo evitado no lote.**

**7.4 — A fila de prazo legal do eSocial está indexada.** `:21288` (`origem_tipo, origem_id`), `:21295` (**`prazo_legal`**), `:21302` (`status`), `:21309` (`tipo`). As três consultas críticas — "o que vence", "o que está pendente", "por tipo de evento" — têm índice. Contraponto honesto a `T42-FIS-F03`: a tabela é fraca em constraint e **forte em índice**.

**7.5 — A concessão sob ISO 9001 §8.7 é impedida com rigor maior que o do banco.** Ver `T42-QUA-F05`: `CreateQualityInspectionUseCase.ts:128-132` recusa justificativa em branco, só-espaços ou curta demais. **Terceiro falso positivo evitado.** Registro para que nenhuma remediação futura "adicione o `NOT NULL` e considere resolvido", achando que substituiu o controle: o `CHECK` seria **complemento**, não equivalente.

**7.6 — `quality_inspections` tem a cadeia de rastreabilidade fechada por FK.** `:25272` (`inspector_id → users`, `RESTRICT`), `:25280` (`lot_id → lot_controls`, `RESTRICT`), `:25288` (`non_conformity_id → non_conformities`, `SET NULL`) e — o elo que importa — `:24816`, `lot_controls.release_inspection_id → quality_inspections` com **`ON DELETE RESTRICT`**: **a inspeção que liberou um lote não pode ser apagada.** Lastro de banco para a exigência ISO de evidência de liberação, imposto pelo banco e não pela aplicação. Somado a `inspection_number UNIQUE` (`:17875`) e aos 3 índices (`:20903-20917`).

**7.7 — `item_suppliers` tem unicidade de par, FKs assimétricas corretas e índices de FK.** `:18395` (`uq_item_suppliers_item_supplier`) — o model declara (`ItemSupplier.ts:48`) **e o banco tem**. As FKs distinguem os dois lados com critério: `item_id → items ON DELETE CASCADE` (`:24416`) × `supplier_id → suppliers ON DELETE RESTRICT` (`:24424` — não se apaga fornecedor com vínculo). Mais `:19944` e `:19951`. Confirma e amplia `T-41` §7.10.

**7.8 — `sale_lot_shipments` protege a cadeia de rastreabilidade por `ON DELETE RESTRICT` em quatro FKs.** `-000039:66-90` — `sales`, `sale_invoices`, `products` e `lot_controls` todas `RESTRICT`; só `user_id` é `SET NULL` (`:100-105`). Apagar a nota ou o lote **não** apaga o rastro de expedição, que é a condição de um recall funcionar. E a nulabilidade de `sale_invoice_id` é **justificada por escrito** (`:41-45`: dado legado sem registro de emissão), não é frouxidão.

**7.9 — `master_production_plan_lines` acerta a chave de negócio e separa cálculo de decisão.** Índice único `(plan_id, product_id)` (`MasterProductionPlanLine.ts:96`) impede duas linhas do mesmo produto no mesmo plano; `suggested_quantity` × `planned_quantity` são colunas **separadas** por decisão declarada (`:16-19`), de forma que a divergência do planejador permanece auditável. O defeito de `T42-PCP-F02` é o que **falta em volta** disso, não isto.

---

## 8. Pedidos de evidência dinâmica — registrados, **NÃO executados**

Nenhum foi executado. Nenhuma conexão a `erp_evok_audio` foi aberta. `APR-2026-016` íntegra.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T42-01` | Existe `sale_lot_shipments` com `status='returned'` **e** `quantity_returned < quantity`? | Materializa `T42-EST-F01`; havendo uma linha, há saldo de lote que nunca voltará no cancelamento — severidade sobe a HIGH. |
| `DYN-T42-02` | Existe `item_id` com **mais de um** `item_suppliers.preferred = true` (`active = true`)? | Materializa `T42-SUP-F04`; prova se o controle de aplicação já falhou de fato. |
| `DYN-T42-03` | Existe `item_suppliers.unit_price < 0`? | Fecha o segundo ponto de `T42-SUP-F04`. |
| `DYN-T42-04` | Existe `sst_eventos_esocial` com `origem_id` sem linha correspondente na tabela indicada por `origem_tipo`? | Mede o dano da FK polimórfica sem integridade. |
| `DYN-T42-05` | Existe `sst_eventos_esocial` com `status='enviado'` e `recibo IS NULL`, ou `prazo_legal IS NULL`? | Materializa os pontos 2 e 3 de `T42-FIS-F03`. |
| `DYN-T42-06` | Existe `master_production_plan_lines` com alguma das 11 colunas numéricas **negativa**, ou `gross_requirement <> soma das três demandas`? | Converte `T42-PCP-F02` de latente em dano medido. |
| `DYN-T42-07` | Existe `master_production_plan_lines` com `status <> 'pending'` e `decided_by IS NULL`? | Mede a perda de rastreabilidade da decisão do planejador. |
| `DYN-T42-08` | Existe `quality_inspections` com `sample_size > lot_size` ou `defects_found < 0`? | Materializa `T42-QUA-F05` (plausivelmente zero linhas — "zero" também é informação). |
| `DYN-T42-09` | O banco corrente tem `sale_lot_shipments`, `directorates`, `hr_time_import_batches`? | **Pergunta de método, não de finding:** mede o atraso real do baseline congelado (§3.1) e diz quantas tabelas escapam de toda verificação por DDL nesta célula. |

---

## 9. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T42-01` | **Banda DADO PESSOAL sem cobertura nova neste lote.** As 17 de 1ª ordem continuam abertas, três delas com dado de saúde. A ordem do mandato foi seguida e o orçamento acabou no terceiro estágio. **Prioridade nº 1 do LOTE 5.** |
| `RES-T42-02` | **Busca de consumidor não exaustiva** para `sale_lot_shipments` (`saleStockService.ts`, `CancelSaleNfeUseCase.ts`, `ChangeSaleStatusUseCase.ts` identificados, não lidos linha a linha) e para `master_production_plan_lines`. As severidades MEDIUM de `T42-EST-F01` e `T42-PCP-F02` dependem disso. |
| `RES-T42-03` | **Nível de isolamento das transações não verificado.** A confiança MÉDIA quanto à concorrência em `T42-SUP-F04` decorre daí. |
| `RES-T42-04` | **O `00_baseline_frozen.sql` está ≥ 9 migrations atrasado** (§3.1). Toda tabela pós-`20260810-000038` só pode ser verificada por migration. Não é finding contra o produto — é **limitação do instrumento desta auditoria**, e afeta retroativamente qualquer conclusão de `T-13`/`T-31`/`T-35`/`T-41` que tenha usado "ausente no baseline" como evidência. Não reauditei essas conclusões. |
| `RES-T42-05` | **21 tabelas sem model** continuam não nomeadas e não triadas (mantém `RES-T41-07`/`RES-T35-02`); **não** estão na exclusão declarada de `APR-2026-036`. |
| `RES-T42-06` | Denominador **207 herdado**, não reconstruído (mantém `RES-T31-01`/`RES-T35-01`/`RES-T41-06`); `git diff c1311a6..HEAD` **não reconfirmado**. |
| `RES-T42-07` | Reconciliação `COMMENT ON COLUMN` × `comment:` feita **apenas** nas 6 tabelas deste lote; não é censo (mantém `RES-T41-08`/`RES-T35-05`). |
| `RES-T42-08` | O `[VERIFICAR COM TÉCNICO SST DA EMPRESA]` de `:13352` é **lacuna de regra de negócio**, não de banco. Nenhum agente pode supri-la (Regra 6) — exige decisão humana sobre BR-SST-028/029. |

---

## 10. Divergências registradas (Regra 20)

1. **`T-41` §6.4 × §2.1 desta trilha — erro de contagem meu, a meu favor.** Declarei "71" como *limite superior* por não ter reconciliado; a evidência para afirmar que era **exato** já estava nos artefatos (`T-35:87` + `T-41:65`), e eu não a usei. **`T-41` não é alterado** (Regra 15); a leitura corrigida é a de §2.1. Reporto porque contagem honesta perde valor se só os erros contra o auditor forem reportados.
2. **`T42-EST-F01` × migration `20260810-000039:125-127`** — o artefato afirma paridade que não entrega. A divergência é **interna ao objeto auditado**, entre o comentário da migration e o SQL da própria migration três linhas abaixo. Fonte autoritativa: o SQL executado.
3. **`T42-META-F06` × `QualityInspection.ts:44-48` e `MasterProductionPlanLine.ts:30-31`** — model afirma migration não aplicada; DDL congelado, posterior, mostra a tabela criada. Fonte autoritativa: o `pg_dump`, por ser observação do banco e não declaração de intenção. **Não altero os models** (Regra 2).
4. **§7.1 × método desta célula.** "Ausente no baseline" foi usado como evidência de ausência em trilhas anteriores desta célula. Para objetos pós-`-000038` isso é **inválido**. Registro como divergência de método, não como finding, e **não** reabro conclusões anteriores por conta própria — `RES-T42-04` fica para o director.
5. **`T42-FIS-F03` × `T41-LGPD-F07`** — mesma patologia (prazo legal sem lastro em banco), severidades diferentes (MEDIUM × LOW) por motivo declarado: o módulo LGPD **não está exposto** (`JurLgpdDataSubjectRequest.ts:7`), enquanto o SST tem endpoints implementados e auditados (`T-27_DEF-02B`). A diferença é de exposição, não de gravidade intrínseca.

---

## 11. Estado

- **Célula `C-137`:** `A(61/207)` → **`A(67/207)`**, delta **`+6`**. **NÃO FECHADA.** Déficit **140/207** (139 pela aritmética de `T41-META-F09`).
- **`RES-T41-01`: RESOLVIDO** (§2). Sobreposição com `T-13`/`T-31`/`T-35` provada **ZERO**, por construção do universo. O "71" era exato, não limite superior.
- **Escopo obrigatório sob `APR-2026-036`:** **57** de 1ª ordem. Cobertas **15** (9 em `T-41` + 6 em `T-42`). **Faltam 42**, nominalmente publicadas em §2.4.
- **Bandas de 1ª ordem FECHADAS nesta trilha: ESTOQUE (5/5) e FISCAL (3/3)** — primeira vez neste run que uma banda de `C-137` fecha integralmente.
- **Exclusão declarada nominalmente das 23 de 2ª ordem: reproduzida em §2.5**, cumprindo a condição vinculante de `APR-2026-036`.
- **Findings `PROPOSED`: 6** — **0 CRITICAL, 0 HIGH, 4 MEDIUM** (`T42-EST-F01`, `T42-PCP-F02`, `T42-FIS-F03`, `T42-SUP-F04`), **2 LOW** (`T42-QUA-F05`, `T42-META-F06`). **Nenhum vai ao `vericore-finding-validator` por força da Regra 22** — nenhum é CRITICAL ou HIGH. O teste do consumidor real foi aplicado aos seis e **nenhum passou**; onde havia dúvida, a limitação está declarada em `RES-T42-02`/`RES-T42-03` com a condição objetiva de subida de severidade.
- **Conformidades verificadas: 9**, incluindo **3 falsos positivos evitados** (§7.1, §7.3, §7.5) — **todos** mortos por verificação externa, nenhum por leitura de model.
- **Divergências registradas: 5** (uma delas erro de contagem próprio, a favor). **Resíduos: 8.** **Pedidos dinâmicos: 9, nenhum executado.**
- **Banco de produção: não acessado.** `APR-2026-016` íntegra. Nada gravado fora de `audit/`.
- `T-13`, `T-31`, `T-35`, `T-41` e `AUD-DB-09_RETIFICACAO_01` **não foram alterados** (Regra 15).
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`. Nenhuma severidade de finding anterior alterada.

---

**Duas coisas que exigem decisão antes do LOTE 5:**

1. **`RES-T42-04` — o baseline congelado está ≥ 9 migrations atrasado.** Enquanto não for regenerado, a "verificação externa por DDL" — instrumento principal desta célula — **não alcança** as tabelas mais recentes, e "não achei constraint" pode significar "não achei o artefato". Decisão de director: regenerar o baseline (fora do meu mandato, exigiria tocar banco, o que `APR-2026-016` proíbe) ou declarar a limitação no relatório final.
2. **`RES-T42-01` — a banda de dado pessoal está integralmente aberta (17 tabelas).** É a banda que `APR-2026-036` decidiu explicitamente **não** sacrificar, e é a única das quatro sem cobertura nova neste lote. Ao ritmo medido (6 tabelas com verificação externa por lote), as 42 restantes exigem **~7 lotes**.
