# `AUD-DB-09` — RETIFICAÇÃO 01 · asserção "soft delete não existe no projeto"

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Data | 2026-08-16 |
| Autor | VeriCore — `vericore-database-auditor` (titular de `T-13`, `T-31`, `T-35`) |
| Natureza | **Retificação de asserção própria.** Não é finding novo, não é reteste, não é fechamento. |
| Origem da contestação | `T-36_VALIDACAO_T35.md` §5 |
| Motivo | Asserção verdadeira na premissa e **excessiva na conclusão**, propagada para consolidação (`T-26:515`) |
| Regime | Auditoria **estática**. **Nenhuma conexão com `erp_evok_audio` nem qualquer banco** — `APR-2026-016` íntegra. |
| Artefatos alterados | **NENHUM.** `T-13`, `T-31`, `T-35`, `T-03`, `T-26`, `T-27`, `T-36` íntegros (Regra 15). |

> **Nota de persistência.** Agente titular read-only por desenho, sem `Write`
> (mesma limitação declarada em `T-13`). Persistido pelo orquestrador **sem
> alteração de conteúdo**. O juízo é integralmente da trilha.

## 0. Nota de autoria — contradição registrada, não arbitrada (Regra 21)

O mandato me designa autor de `AUD-DB-09`. **O artefato versionado diz outra coisa:** `AUD-DB-09` está redigido em `T-03_AUDIT_LOG_REPORT.md:98-105`, e `T-36:452` encaminha a retificação *"ao autor de `T-03`"*. Não resolvo por inferência.

Delimitação adotada: **retifico** `T-13:78` (premissa citada de onde tudo propaga), `T-31:176`, e a redação de `AUD-DB-09` **apenas na parte derivada de `T-13:78`** (`T-03:98` e `:104-105`). **NÃO toco `T-03:103`** — a frase *"capacidade que não existe"* é formulação do autor de `T-03`, está sendo retificada por ele em paralelo. Registro apenas que minha verificação independente chega ao mesmo resultado. **Escalono ao director** a determinação de autoria para efeito de remediação.

## 1. Verificação independente (Regra 7) — refiz tudo, não aceitei a palavra do validador

### 1.1 Premissa de `T-13:78` — **CONFIRMADA, sem ressalva**

`paranoid|deleted_at|deletedAt` em todo `server/`: **2 ocorrências, ambas comentário de migration declarando a AUSÊNCIA** — `20260807-000200-create-facilities-module.cjs:22` e `20260807-000298-create-facility-visitors-visits.cjs:19`. Zero declarações de coluna, zero `paranoid: true`. **A premissa continua verdadeira e não é desmentida aqui.**

### 1.2 Conclusão de `T-13:78` — **REFUTADA por artefato versionado**

O projeto **nomeia a coisa "soft delete" no próprio código**:

| Artefato | Literal |
|---|---|
| `CustomerPriceList.ts:40` | `active: { … comment: 'Soft delete' }` |
| `CostCenter.ts:33` | `comment: 'Desativacao logica (sem delete fisico) — …'` |
| `Category.ts:26` | `comment: 'Status (soft delete)'` |
| `DeactivateCustomerPriceUseCase.ts:5-9` | *"Desativa (**soft delete** via `active = false`) … mesmo padrão de `Category.active`/`ItemSupplier.active`, **ver CLAUDE.md §7**"* |
| `DeactivateUserUseCase.ts:6` | *"Inativa (**soft delete via `active=false`**)"* |
| `clients/README.md:99,135`; `suppliers/README.md:83,116`; `DeactivateSupplierUseCase.ts:7` | *"**Soft delete** (`status='inactive'`)"* |

`DeactivateCustomerPriceUseCase.ts:9` é o achado mais forte e **não constava de `T-36`**: o código remete a **convenção de projeto documentada** (*"ver CLAUDE.md §7"*), também citada em `docs/governance/TODO.md:3672`. O projeto não só pratica soft delete — **tem norma escrita sobre ele**.

**3 emissores de `action: 'soft_delete'`, lidos, não só grepados:** `productController.ts:197-204` (`status → 'inactive'`), `bomController.ts:211-218` (`status → 'inactive'`), `DeactivateUserUseCase.ts:41,46-53` (`active: true → false`). O valor existe em duas camadas — `auditActions.ts:84` e `00_baseline_frozen.sql:227` — e **é exercido**.

### 1.3 Origem da propagação — **é minha, não do discovery**

`docs/coretriad/projects/ERP-LEGACY-001/discovery/DATABASE_INVENTORY.md:113-131` é **rigoroso e declara o próprio limite** (*"no nível de banco"*, *"schema declarado"*, recomenda *"confirmar, por módulo"*). **Fui eu, em `T-13:78`, que retirei a qualificação "no nível de banco" e converti o achado em conformidade de projeto.**

### 1.4 `T-31:176` — **confirmo dispensa de escopo, mas DIVIRJO de `T-36` quanto ao fundamento**

As 12 tabelas de `T-31` são de tesouraria/contabilidade/CNAB; nenhuma é `cost_centers` nem `customer_price_lists`. Até aqui, `T-36:429-430` está certo. **Mas `T-36` não notou:** entre as 12 está `treasury_bank_accounts`, que **tem** `active boolean` (`00_baseline_frozen.sql:14700`; `TreasuryBankAccount.ts:52`). Logo *"não há dever de filtrá-lo nestas 12 tabelas"* é **falso como generalização dentro do próprio escopo declarado** — vale para 11 de 12.

Verifiquei o efeito antes de agravar: `SequelizeTreasuryRepository.ts:51` filtra `active: true` por padrão na seleção de conta; `:19` deixa opcional só na listagem administrativa. **Há controle, o dever é cumprido, não abro finding.** Mas a frase está certa **por sorte, não por verificação**. Retifico o **fundamento**, não o escopo.

## 2. Retificação formal

### 2.1 `T-13:78` — linha exata

**Original (preservado no artefato, reproduzido só para identificação):**
> **Soft delete: não existe.** `deleted_at` tem **0 ocorrências** no baseline e **0** em `server/src/models/`. Não há `paranoid: true`. Portanto a responsabilidade "filtrar soft delete em toda query" **não se aplica**: exclusão é `DELETE` físico governado por FK.

**Retificado — leitura que passa a valer:**
> **Soft delete por `deleted_at`/`paranoid`: não existe.** Premissa permanece verificada.
> **A conclusão derivada era excessiva e é retirada.** O projeto pratica **soft delete semântico** por `active`/`is_active`/`ativo` (27 tabelas) e por `status` de desativação (8 tabelas), nomeia-o assim nos próprios artefatos, emite `action: 'soft_delete'` em 3 pontos e remete a convenção de projeto.
> **A responsabilidade "filtrar registro logicamente excluído" APLICA-SE** e deve ser verificada tabela a tabela. O que permanece verdadeiro: **o banco não impõe esse filtro em lugar nenhum** — sem `paranoid`, sem view, sem RLS, sem trigger. **O filtro é 100 % de aplicação, sem lastro em banco.** Esta formulação é **mais desfavorável** ao objeto auditado que a original, não mais branda.
> *"Exclusão é `DELETE` físico governado por FK"* passa a descrever **um dos dois regimes coexistentes**: há `.destroy()` real (10 ocorrências / 9 arquivos, `T-03:99-100`) **e** desativação lógica, e **nenhum artefato define qual entidade segue qual** (achado `RET01-A1`).

### 2.2 `AUD-DB-09` — redação retificada (parte derivada de `T-13:78`)

**Trecho afetado, não alterado no original** (`T-03:98,104-105`): *"soft delete CONFIRMADAMENTE ausente … A 'consistência do filtro de soft delete' é satisfeita por ausência da funcionalidade"*.

**Redação a usar na consolidação e na instrução de remediação:**
> **`AUD-DB-09` — soft delete existe por `active`/`status`, e nenhuma camada de banco o impõe.** Soft delete por `deleted_at`/`paranoid` está ausente (verificado). Soft delete **semântico** está presente em **34 tabelas** e é exercido por 3 emissores de `action: 'soft_delete'`. A "consistência do filtro" **NÃO é satisfeita por ausência da funcionalidade** — precisa ser verificada, e a verificação encontra **3 tabelas com filtro opcional ou inexistente no caminho de escrita**: `cost_centers`, `clients`, `suppliers`. `.destroy()` físico e desativação lógica **coexistem sem critério versionado**.

**Não retifico:** a parte sobre reconstituição de linha destruída (`productionOrderController.ts:176-183`, `oldValues: { status }` apenas) é independente da premissa e **permanece integralmente válida**.

### 2.3 `T-31:176` — retificação de fundamento

> *"Nestas 12 tabelas não há dever de filtrar registro logicamente excluído por `deleted_at` (inexistente). Onze das 12 não têm coluna de desativação. A décima-segunda, `treasury_bank_accounts`, **tem** `active` (`:14700`) e **o dever existe e é cumprido** (`SequelizeTreasuryRepository.ts:51`). A conformidade é por controle verificado, não por inexistência."*

## 3. Inventário de soft delete semântico — cobertura declarada

| Dimensão | Nível | Método |
|---|---|---|
| Coluna booleana (`active`/`is_active`/`ativo`) | **EXAUSTIVO** | grep `^\s+(active\|is_active\|ativo\|ativa)\s+boolean` no baseline (26) mapeado por `CREATE TABLE` + grep nas 9 migrations pós-freeze (1) |
| `status` como desativação | **QUASE-EXAUSTIVO**, resíduo declarado | grep `'inactive'\|'inativo'` nos `CREATE TYPE` (7 ENUMs) + 1 por emissor (`assets`→`'decommissioned'`) |
| `'blocked'`, `'suspended'`, `'cancelled'`, `'closed'`, `'superseded'`, `'encerrado'` | **NÃO COBERTO** → `RES-RET01-01` | critério é semântico, exige regra de negócio (Regra 6) |
| Aplicação do filtro por consumidor | **AMOSTRAL DIRIGIDO** (18/34) → `RES-RET01-02` | leitura de repositórios/use cases |
| Verificação em banco | **ZERO** | `APR-2026-016` |

### 3.1 Coluna booleana — 27 tabelas (exaustivo)

`access_profiles`:3061 · `accounting_chart_of_accounts`:3106 · `cost_centers`:4677 · `customer_price_lists`:4715 · `departments`:4795 · `facility_cleaning_schedules`:5153 · **`fornecedores`**:5621 (`ativo`, PT DEPRECATED, sem model) · `hr_benefit_types`:5759 · `hr_job_positions`:6089 · `hr_training_courses`:6404 · `it_ticket_categories`:7481 · `item_estruturas`:7829 (`ativo`) · `item_suppliers`:7870 · `jur_external_lawyers`:8337 · `product_categories`:10359 · **`production_route_steps`**:11034 (**`is_active`**) · `sst_brigadistas`:13000 · `sst_matriz_epi`:13713 · `sst_matriz_treinamento`:13763 · `sst_planos_exames`:13936 · `sst_tipos_epi`:14377 · `treasury_bank_accounts`:14700 · `users`:14779 · **`usuarios`**:14889 (PT DEPRECATED) · `warehouses`:14980 · `work_centers`:15142 — todos em `00_baseline_frozen.sql`; models correspondentes em `AccessProfile.ts:72`, `AccountingChartOfAccount.ts:44`, `CostCenter.ts:33`, `CustomerPriceList.ts:40`, `Department.ts:45`, `FacilityCleaningSchedule.ts:46`, `HrBenefitType.ts:23`, `HrJobPosition.ts:24`, `HrTrainingCourse.ts:23`, `ItTicketCategory.ts:32`, `ItemEstrutura.ts:95`, `ItemSupplier.ts:41`, `JurExternalLawyer.ts:42`, `Category.ts:26`, `ProductionRouteStep.ts:41`, `SstBrigadista.ts:28`, `SstMatrizEpi.ts:33`, `SstMatrizTreinamento.ts:34`, `SstPlanoExames.ts:32`, `SstTipoEpi.ts:48`, `TreasuryBankAccount.ts:52`, `User.ts:84`, `Warehouse.ts:63`, `WorkCenter.ts:38`.
**+ 27ª (pós-freeze):** `directorates` — `20260811-000043-create-directorates-hierarchy.cjs:157`; `Directorate.ts:65`.

**Achado de nomenclatura:** quatro grafias para a mesma semântica; `is_active` é ocorrência **única** em 207 tabelas.

### 3.2 `status` como desativação — 8 tabelas

`products`→`'inactive'` (ENUM `:1961-1963`; `DeactivateProductUseCase.ts:27`) · `clients`→`'inactive'` (`:325-327`; `DeactivateClientUseCase.ts:36`) · `suppliers`→`'inactive'`/`'blocked'` (`:2535-2537`; `DeactivateSupplierUseCase.ts:7`) · `employees`→`'inactive'` (`:423-425`; `DeactivateEmployeeUseCase.ts:73`) · `bill_of_materials`→`'inactive'` (`:280-283`; `DeactivateBOMUseCase.ts:36`) · `production_routes`→`'inactive'` (`:1937-1940`; `InactivateProductionRouteUseCase.ts:48-50`) · `item_estruturas`→`'inactive'` (`:2629-2632`) · `assets`→**`'decommissioned'`** (`Asset.ts:59`; `DeactivateAssetUseCase.ts:31-36`).

**Total distinto: 34 tabelas** (27 + 8 − 1 sobreposição em `item_estruturas`) = **16,4 % de 207**. A asserção retificada afirmava, na prática, que esse conjunto era vazio.

### 3.3 Aplicação do filtro — amostra dirigida de 18 tabelas

**Conformidades provadas (dever existe e é cumprido — registro para não virarem falso positivo):**
`users` → **controle global de middleware**, `auth.ts:94`; `LoginUseCase.ts:64-68`; `ForgotPasswordUseCase.ts:41` · `access_profiles` → `auth.ts:107,123`; `AssignAccessProfileUseCase.ts:61`; `SequelizeAccessProfilesRepository.ts:44` · `accounting_chart_of_accounts` → **validado na escrita**, `CreateEntryUseCase.ts:68`; `UpdateEntryUseCase.ts:80` · `products` → default `status='active'` (`SequelizeProductRepository.ts:26`) + `CreateSaleUseCase.ts:122` · `item_suppliers` → `SequelizeItemSupplierRepository.ts:11,20,44` · `product_categories` → `SequelizeCategoriesRepository.ts:13` · `departments` → `SequelizeDepartmentsRepository.ts:13`; `SequelizeDashboardRepository.ts:165,218` · `warehouses` → `SequelizeInventoryRepository.ts:135`; `SequelizeProductRepository.ts:98` · `work_centers`/`production_route_steps` → `SequelizeWorkCenterRepository.ts:60,101,103`; `resolveRouteStepWorkCenters.ts:67`; `productionTrackingRules.ts:441`; `SequelizeProductionOrderRepository.ts:293` · `customer_price_lists` → `SequelizeSaleRepository.ts:208,234` · `treasury_bank_accounts` → `SequelizeTreasuryRepository.ts:51` · `directorates` → `SequelizeDirectorateRepository.ts:17` · `it_ticket_categories` → `SequelizeTicketRepository.ts:21` · `sst_*` → `SequelizeEpiRepository.ts:18,31,98`; `SequelizeTrainingRepository.ts:67`; `SequelizeAsoRepository.ts:36` · `item_estruturas` → `ExplodeItemStructureUseCase.ts:40`; `mrpEngine.ts:164`; `GenerateMrpPlanUseCase.ts:92`.

**Não-conformidades (dever existe e NÃO é cumprido no caminho de escrita):**
- `cost_centers` — filtro opcional (`SequelizeCostCenterRepository.ts:17`) e **nenhuma** validação na escrita contábil (`CreateEntryUseCase.ts:89`).
- `clients` — filtro opcional (`SequelizeClientsRepository.ts:25`); `CreateSaleUseCase.ts:96-160` **não carrega o cliente**.
- `suppliers` — filtro opcional (`SequelizeSuppliersRepository.ts:24`); `CreatePurchaseUseCase.ts:65-80` **carrega o fornecedor e valida só `is_foreign`**.

**Não verificadas quanto à escrita** (`RES-RET01-02`): `hr_benefit_types`, `hr_job_positions`, `hr_training_courses`, `jur_external_lawyers`, `facility_cleaning_schedules`, `sst_brigadistas`, `employees`, `bill_of_materials`, `production_routes`, `assets`, mais listagens administrativas. Filtro **opt-in** localizado em `SequelizeBenefitTypeRepository.ts:13`, `SequelizeTrainingCourseRepository.ts:13`, `SequelizeExternalLawyerRepository.ts:14`, `SequelizeSafetyRoutineRepository.ts:96` — mesmo padrão de `cost_centers`.

## 4. Alcance — resposta direta, sem minimizar

**Sim, a asserção sustentava conclusão operacional.** `T-13:78` a enuncia em letra: *"a responsabilidade 'filtrar soft delete em toda query' **não se aplica**"*. Isso é **dispensa de verificação**, e foi exercida: `T-13` não verificou filtro em nenhuma das 34 tabelas, e `T-31:176` reutilizou a dispensa como conformidade provada.

| Dimensão de `AUD-DB-09` | Muda? | Determinação |
|---|---|---|
| **Redação** | **SIM** | §2.2 |
| **Escopo** | **SIM** | de observação sobre valor órfão de ENUM → **34 tabelas** com dever não verificado, **3 com falha demonstrada na escrita** |
| **Natureza** | **SIM** | de *"conformidade por ausência de funcionalidade"* → **lacuna de controle**: filtro 100 % de aplicação, sem `paranoid`/view/RLS/trigger |
| **Severidade** | **NÃO POR MIM** | Regra 18. **Recomendo formalmente ao director reexaminar** a permanência no bloco `AUD-DB-04…-09` MEDIUM ×6 (`T-26:515`): o item entrou como observação inócua e sai como lacuna de controle com 3 falhas nomeadas. Manter a severidade sem reexame é herdá-la de premissa que já não existe. |
| Reconstituição de linha destruída | **NÃO** | permanece válida |

**`T-26:515` propaga a frase *"soft delete confirmadamente ausente"* para o relatório final e deve ser substituída antes dele.** Não altero `T-26` — cabe ao consolidador, instruído por esta retificação.

**Bloqueio normativo solicitado** (endossando `T-36:458`): *"soft delete não existe"* não pode mais ser usado como conformidade genérica em nenhuma trilha, delta audit ou reteste deste run. Forma admissível: *"soft delete por `deleted_at`/`paranoid` não existe"*, com escopo explícito.

## 5. `T35-DIN-F06` — **AMPLIADO em escopo, MEDIUM mantida**

**A retificação não o rebaixa. Ela o amplia.** Três reforços novos:

1. **Assimetria dentro do mesmo laço** (reforço novo, decisivo): `CreateEntryUseCase.ts:60-71` valida existência da conta (`:62`), `accept_entries` (`:65`) **e `account.active` (`:68`)**. No mesmo use case, `:89` grava `cost_center_id: item.cost_center_id ?? null` **sem carregar o centro de custo, sem checar existência e sem checar `active`**. O projeto **sabe** validar estado de entidade referenciada em lançamento contábil — faz isso três linhas acima. **"Não é a convenção do projeto" está descartado como defesa.**
2. **Docstring que descreve controle inexistente:** `CreateEntryUseCase.ts:55` declara `@throws {NotFoundError}` *"Se algum `account_id`/**`cost_center_id`** referenciado não existir"* — **não há nenhuma busca de centro de custo no corpo do método**. Mesma classe de `AUD-CTB-DEBCRED-01` e `T35-PRD-F07`.
3. **Duas ocorrências novas fora de contabilidade:** `clients` e `suppliers` (§3.3). `CreatePurchaseUseCase.ts:65-70` é o caso mais expressivo — carrega o fornecedor, valida `is_foreign`, **ignora `status`**: fornecedor `'inactive'`/`'blocked'` recebe pedido novo.

**Recomendação ao director (não executo):** ampliar `T35-DIN-F06` de 2 para **3 entidades de escrita** e acrescentar ao critério de reteste (`T-35:240`) validação de estado da entidade referenciada **no caminho de escrita**, com teste de regressão, mais correção do JSDoc de `CreateEntryUseCase.ts:55`. **Severidade permanece MEDIUM, por mim, sem alteração.**

## 6. Achados novos (evidência anexada a findings existentes; nenhum finding novo criado)

| ID | Achado | Evidência | Destino |
|---|---|---|---|
| `RET01-A1` | **Dois regimes de exclusão coexistem sem critério versionado**; a única remissão normativa é *"CLAUDE.md §7"*, cujo texto **não está no `CLAUDE.md` atual** | `DeactivateCustomerPriceUseCase.ts:9`; `TODO.md:3672`; `CLAUDE.md` atual | `AUD-DB-09` + `AUD-PROC-DOCDRIFT-01` |
| `RET01-A2` | **Deriva documental falsa em SSOT**: `docs/project-memory/product/ERP_SSOT.md:401` — *"Apenas `Category` tem soft delete (`active` flag); outras usam `status` enum ou **`deleted_at`**"*. Errado em dois pontos: são **27** tabelas, e `deleted_at` **não existe em nenhuma** | `ERP_SSOT.md:401` × §3.1 | `AUD-PROC-DOCDRIFT-01` (autor de origem) |
| `RET01-A3` | Quatro grafias sem convenção declarada; `is_active` é ocorrência única em 207 tabelas | §3.1-3.2 | `AUD-DB-T31-08` |
| `RET01-A4` | `item_estruturas` tem **dois mecanismos na mesma tabela** (`ativo` `:7829` + `status='inactive'` `:2629-2632`) sem CHECK ligando-os; estado contraditório é gravável | baseline + `ItemEstrutura.ts:95` | `T13-F07` |
| `RET01-A5` | `assets` usa `'decommissioned'` porque `'inactive'` **causava HTTP 500** — incidente registrado no próprio use case | `DeactivateAssetUseCase.ts:31-36` | evidência de `T35-PAT-F03` |
| `RET01-A6` | `CreateEntryUseCase.ts:55` documenta `NotFoundError` para `cost_center_id` que o método **não lança** | `:55` × `:60-93` | **amplia `T35-DIN-F06`** |
| `RET01-A7` | Fornecedor inativo/bloqueado recebe pedido; cliente inativo recebe venda | `CreatePurchaseUseCase.ts:65-80`; `CreateSaleUseCase.ts:96-160`; `SequelizeSuppliersRepository.ts:24`; `SequelizeClientsRepository.ts:25` | **amplia `T35-DIN-F06`** |

## 7. Lacunas declaradas

| ID | Lacuna | Por quê | Quem fecha |
|---|---|---|---|
| `RES-RET01-01` | Vocabulários além de `'inactive'`/`'inativo'`/`'decommissioned'` não triados | critério é semântico, exige regra de negócio (Regra 6) | decisão humana + auditor do módulo |
| `RES-RET01-02` | Caminho de escrita verificado em 18 de 34 tabelas | orçamento; mandato pedia cobertura declarada, não exaustão | delta audit / `vericore-repository-layer-auditor` |
| `RES-RET01-03` | Nenhuma verificação dinâmica (quantas linhas desativadas, quantos vínculos apontam para linha desativada) | `APR-2026-016`. Nenhuma conexão aberta. | `DYN` escopado em banco efêmero, se autorizado |
| `RES-RET01-04` | Autoria de `AUD-DB-09` não resolvida (§0) | Regra 21 manda escalonar, não arbitrar | `vericore-software-audit-director` |
| `RES-RET01-05` | **Este arquivo não pôde ser persistido pelo agente** (Write desabilitado) | mesma limitação de `T-13` | orquestrador persiste sem alteração de conteúdo |

## 8. Estado

- **A contestação PROCEDE**, verificada de forma independente. Premissa de `T-13:78` correta; **conclusão errada, e é minha**. Origem da generalização identificada (§1.3): fui eu, não o discovery.
- **Divirjo parcialmente de `T-36`:** `T-31:176` **não** está integralmente dispensado — `treasury_bank_accounts` tem `active`; a asserção está certa por sorte, não por verificação. Retifico o fundamento (§2.3).
- **Artefatos originais íntegros; `T-03:103` não tocado.**
- **Alcance:** `AUD-DB-09` muda em **redação, escopo e natureza**. Severidade não alterada por mim; **reexame recomendado ao director** — não minimizo.
- **`T35-DIN-F06`: MEDIUM mantida, escopo AMPLIADO** de 2 para 3 entidades de escrita.
- **34 tabelas** praticam exclusão lógica (16,4 % de 207); **filtro 100 % em aplicação, zero lastro em banco**.
- **Banco não acessado.** `APR-2026-016` íntegra.
- **Nenhum `FINDING CLOSED`, `RETEST_PASSED`, `AUDIT_PASSED`, nenhuma severidade alterada, nenhum finding novo.**
