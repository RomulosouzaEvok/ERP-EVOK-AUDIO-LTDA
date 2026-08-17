# T-03 — RETIFICAÇÃO 01 (AUD-DB-09, linha 103)

`AUDIT_COMMIT c1311a6f76b512fef893f7e60d934179cae3409f` · run `ERP-LEGACY-001-AUD-001` · data **2026-08-16** · autor de origem de `T-03_AUDIT_LOG_REPORT.md` (titular `vericore-audit-log-security-auditor`, regime `APR-2026-016` read-only reforçado — **nenhuma conexão de banco aberta**; auditoria 100% estática sobre código versionado)

> **Nota de persistência.** Produzido pelo autor de origem; a ferramenta Write estava desabilitada para o agente, como já ocorrera em T-03. Persistido **sem alteração** pelo orquestrador. O juízo é integralmente da trilha.

> **Natureza deste artefato.** Retificação **ao lado**, não emenda no original. `T-03_AUDIT_LOG_REPORT.md` **não foi editado** (Regra 15). Não fecha finding, não altera severidade de finding existente, não declara `RETEST_PASSED`, não reclassifica `AUD-DB-09`.

## 1. Origem da contestação e verificação própria

`T-36_VALIDACAO_T35.md:396,408-409,432-437,443-444,452` contesta `T-03:103`. Conforme Regra 7, **não aceitei a palavra do validador nem do orquestrador**: reexecutei varreduras e li os fontes. O que segue é prova própria.

## 2. Asserção contestada, verbatim

`T-03_AUDIT_LOG_REPORT.md:98-105`, finding **AUD-DB-09**. A frase retificada é a das linhas 102-105:

> *"O ENUM tem o valor `soft_delete` (`auditActions.ts:84`) **para uma capacidade que não existe**. A "consistência do filtro de soft delete" é satisfeita **por ausência da funcionalidade**, e isso é registrado para não ser lido como conformidade."*

## 3. VEREDITO — A CONTESTAÇÃO PROCEDE. A ASSERÇÃO ESTÁ FACTUALMENTE INCORRETA.

| Evidência | Arquivo:linha | Fato |
|---|---|---|
| Emissor 1 | `products/presentation/controllers/productController.ts:197-205` | `logAction(req, { action: 'soft_delete', entityType: 'Product', oldValues: { status: before.status }, newValues: { status: 'inactive' } })` |
| Emissor 2 | `bom/presentation/controllers/bomController.ts:211-219` | `action: 'soft_delete'`, `entityType: 'BOM'`, `newValues: { status: 'inactive' }` |
| Emissor 3 | `users/application/use-cases/DeactivateUserUseCase.ts:41,46-54` | `update(id, { active: false })` + `action: 'soft_delete'`, `oldValues: { active: before.active }`, `newValues: { active: false }` |
| Doc 1 | `products/README.md:118` | *"`soft_delete` → produto inativado"* |
| Doc 2 | `bom/README.md:171` | *"`DELETE /:id` → `action: 'soft_delete'` … `newValues: { status: 'inactive' }`"* |
| Doc 3 | `users/README.md:152` | *"`soft_delete` registra a transição `active: true → false`"* |
| Implementação | 13 `Deactivate*UseCase` em `server/src/**/application/use-cases/` (glob exaustivo) | a capacidade existe em **13 casos de uso**, não em zero |
| JSDoc do próprio código | `productController.ts:185`, `bomController.ts:199`, `employeeController.ts:94`, `itemController.ts:131-132`, `DeactivateUserUseCase.ts:6` | o código chama a operação de *"soft delete"* por esse nome |

**Os 3 emissores citados pela contestação existem e são exatamente esses.**

### 3.1 O que da AUD-DB-09 permanece VÁLIDO (não retifico o que está certo)

Retificação forçada além do erro é tão danosa quanto o erro. Permanecem verificadas e **não retificadas**: `paranoid` em `server/src` = **0**; `\.destroy\(` = **10 ocorrências / 9 arquivos**; `productionOrderController.ts:176-183` grava o `delete` só com `oldValues: { status }`; **não existe soft delete por `deleted_at`/`paranoid`** — isso é verdadeiro.

**O erro é de inferência, não de varredura.** Varri o mecanismo Sequelize (`paranoid`/`deleted_at`) e concluí sobre a **capacidade de negócio**. O projeto implementa soft delete por **coluna de estado (`active` / `status = 'inactive'`)**, padrão que minha varredura não alcançava e cujo limite eu não declarei.

### 3.2 Texto retificado

Onde `T-03:102-105` diz *"para uma capacidade que não existe"* e *"satisfeita por ausência da funcionalidade"*, **leia-se**:

> O ENUM tem o valor `soft_delete` (`auditActions.ts:84`) **para uma capacidade que existe e é emitida em 3 pontos** (`productController.ts:198`, `bomController.ts:212`, `DeactivateUserUseCase.ts:47`), sobre um universo de **13 casos de uso de desativação lógica**. O projeto **não** usa soft delete por `deleted_at`/`paranoid`, mas **usa soft delete por coluna de estado (`active`/`status`)**. Nada aqui pode ser lido como conformidade de cobertura — ver `AUD-ALOG-01`.

## 4. Contradição interna ao run, anterior ao T-35 — confirmada

`T-27_DEF-03_RFQ_PRECOS_D3D4.md:71` (*"Soft delete `active = false` (`DeactivateCustomerPriceUseCase.ts:33-35`)"*) e `:269`. Ambos **na mesma auditoria** e **anteriores** ao `T-35`. Confirmo: a contradição é **interna ao run e não foi detectada por mim nem pela consolidação**.

## 5. ALCANCE REAL DO ERRO — a asserção contaminou conclusão de cobertura

Sim: `:103` sustentou a leitura de que **desativação lógica não era classe de evento a contar** no mapa ação-crítica × log. Com a capacidade existindo, `active: true → false` é **evento mutante de cadastro mestre** e deveria ter entrado. Não entrou. Varredura própria dos 13 call sites:

| # | Módulo | Call site | Loga? | Ação |
|---|---|---|---|---|
| 1 | products | `productController.ts:194` | **SIM** | `soft_delete` (old+new) |
| 2 | bom | `bomController.ts:208` | **SIM** | `soft_delete` (old+new) |
| 3 | users | `userController.ts:117` → `DeactivateUserUseCase.ts:46` | **SIM** | `soft_delete` (old+new) |
| 4 | accessProfiles | `accessProfilesController.ts:102` → `DeactivateAccessProfileUseCase.ts:61` | **SIM** | use case emite |
| 5 | sales | `saleController.ts:347` | **PARCIAL** | `action: 'delete'` — verbo errado, **e sem `oldValues`/`newValues`** (`:350-356`) |
| 6 | **items** | `itemController.ts:137` (`PATCH /api/items/:id/inactivate`) | **NÃO** | — |
| 7 | **items** | `itemController.ts:205` (fornecedor de item) | **NÃO** | — |
| 8 | **employees** | `employeeController.ts:97` (`DELETE /api/employees/:id`, desligamento) | **NÃO** | — |
| 9 | **suppliers** | `supplierController.ts:121` | **NÃO** | — |
| 10 | **clients** | `clientController.ts:80` | **NÃO** | — |
| 11 | **categories** | `categoryController.ts:66` | **NÃO** | — |
| 12 | **departments** | `departmentController.ts:65` | **NÃO** | — |
| 13 | **assets** | `assetController.ts:81` | **NÃO** | — |

**Placar: 4 logados-completos · 1 logado-incompleto · 8 não-logados.**

Prova da coluna "NÃO": `logAction` restrito a `server/src/modules/{clients,items,categories,departments,suppliers,assets,employees,sales}/**/*.ts` retorna **1 único arquivo** — `saleController.ts` (7 ocorrências). Nos outros 7 módulos, `logAction` = **zero em qualquer camada**, o que descarta o controle compensatório de camada que `AUD-DB-03:54-57` identificara para `users`/`accessProfiles`.

**Controle compensatório procurado** (obrigação de método): não há middleware global de auditoria de mutação, interceptor de rota nem hook de model. O caminho único de escrita é `logAction` → `AuditLog.create` (`T-03:127-128`, §4), invocado explicitamente pelo call site. **Não há captura implícita.** Os 8 casos são desativação sem trilha.

### 5.1 Correção de caracterização, não de mérito, sobre AUD-DB-03

`AUD-DB-03` (HIGH) já lista esses 7 módulos como "rota de escrita e zero `logAction`". **Severidade e mérito de `AUD-DB-03` não mudam e não são alterados aqui.** Muda a caracterização do risco: dentro desses módulos há uma classe específica — **remoção da entidade da operação, apresentada ao usuário como `DELETE`** — que some sem rastro. `DELETE /api/employees/:id` (desligamento) e `PATCH /api/items/:id/inactivate` (insumo tier 1, universo dos 327 insumos reais) **retornam 200 e não deixam quem, quando, de onde**.

### 5.2 Conformidade nova, registrada para não induzir a erro

Verifiquei se os 3 emissores sobrevivem ao `AUD-DB-04` (`entity_id integer` × PK `UUID`): `Product.ts:59` é `DataTypes.INTEGER` autoincrement; `User`/`BOM` idem no uso do call site. **Os 3 `soft_delete` logados não caem no modo de falha `22P02`.** Registro explicitamente porque supor contaminação seria fácil e errado.

## 6. Achado novo — `AUD-ALOG-01`

```
FINDING_ID: AUD-ALOG-01
AUDIT_ID: ERP-LEGACY-001-AUD-001
PROJECT_ID: ERP-LEGACY-001
TITLE: Desativação lógica (soft delete por `active`/`status`) sem trilha de
       auditoria em 8 de 13 casos de uso, incluindo insumo tier 1 e
       desligamento de funcionário
DOMAIN: Segurança / Audit Log
SUBDOMAIN: Cobertura ação-crítica × log
SEVERITY: HIGH
CONFIDENCE: CONFIRMED (estático, exaustivo sobre os 13 call sites)
STATUS: PROPOSED  (Regra 22 — vai ao vericore-finding-validator)
```

**EXPECTED_BEHAVIOR (Master Spec §20).** Toda ação crítica sobre cadastro mestre gera registro com USER, TIMESTAMP, ACTION, ENTITY, ENTITY_ID, OLD/NEW_VALUE, SOURCE, IP/SESSION, CORRELATION_ID. Desativação lógica é mutação de cadastro mestre.

**ACTUAL_BEHAVIOR.** 8 dos 13 call sites não emitem nada; 1 emite com verbo errado (`delete`) e **sem old/new**.

**EVIDENCE.** `itemController.ts:135-146` e `:205`; `employeeController.ts:94-103`; `supplierController.ts:121`; `clientController.ts:80`; `categoryController.ts:66`; `departmentController.ts:65`; `assetController.ts:81`; `saleController.ts:342-360`. Contraprova de que o padrão correto existe no mesmo repo: `productController.ts:197-205`, `bomController.ts:211-219`, `DeactivateUserUseCase.ts:46-54`.

**SECURITY_IMPACT.** Ator com permissão de escrita remove insumo, cliente, fornecedor, ativo, departamento ou funcionário da operação sem produzir evento — inclusive **encobrindo o próprio rastro**. Com `AUD-DB-06` (sem CORRELATION_ID) e `FIND-ERP-002` (trilha não imutável), não há reconstituição possível.

**BUSINESS_IMPACT.** Sumiço de item de estoque tier 1 e desligamento de funcionário sem "quem/quando/de onde" — os dois eventos de maior exigência probatória do escopo.

**RELAÇÃO COM FINDINGS EXISTENTES.** Sobrepõe-se materialmente a `AUD-DB-03` (HIGH). **Declaro a sobreposição em vez de contar um HIGH novo sobre o mesmo risco:** cabe ao `vericore-finding-validator` decidir entre (a) consolidar como emenda de caracterização de `AUD-DB-03`, ou (b) manter autônomo por atingir também `sales`, que **não** está na lista dos 13 módulos de `AUD-DB-03`. **Não antecipo essa decisão.**

**RECOMMENDATION** (endereçada a SanaCore, não executada — Regra 2): emitir `logAction` com `action: 'soft_delete'` e par old/new nos 8 call sites; corrigir verbo e adicionar valores em `saleController.ts:350`.

**RETEST_SPECIFICATION.** Estático: `logAction` nos 13 call sites com `soft_delete` + par old/new. Dinâmico (fila G4, **`erp_evok_audio_test` apenas**): `DYN-T03-07` — exercitar os 13 endpoints e verificar 13 linhas em `audit_logs`. **Nenhuma sondagem executada.**

## 7. Propagação para artefatos de OUTROS autores — registro, sem toque

Não editei nenhum. Cada um exige retificação **pelo respectivo autor de origem** (Regras 2 e 15):

| Artefato | Linha | Texto propagado | Ação necessária |
|---|---|---|---|
| `T-26_CONSOLIDACAO.md` | `:515` | *"soft delete **confirmadamente ausente**"* — consolida `AUD-DB-09` com a asserção errada | retificar para "soft delete por `active`/`status` **existe**; ausente é só `deleted_at`/`paranoid`"; incorporar `AUD-ALOG-01` |
| `T-13_DADOS_E_SCHEMA.md` | `:78` | *"Soft delete: não existe … a responsabilidade 'filtrar soft delete em toda query' **não se aplica**"* | restringir a soft delete por `deleted_at` (já pedido por `T-36:455`) |
| `T-31_C137_SEMANTICA_COLUNA.md` | `:176` | *"Soft delete não existe no projeto (`T-13:78`)"* — herda a premissa de `T-13` | retificar após `T-13` |

`AUD-DB-09` é finding **meu** e foi retificado aqui no que estava errado. As três linhas acima **não são minhas** e permanecem intactas.

## 8. Lacuna declarada / risco residual

- **RES-T03-05 (novo).** A cobertura foi medida sobre os call sites de `Deactivate*UseCase`. Um `update` genérico que grave `active: false` por outra via (ex.: `PUT` de edição) **não** foi enumerado — declaro como **não coberto**, não como conforme. Foi exatamente essa extrapolação que produziu o erro ora retificado.
- **RES-T03-01** permanece: estado efetivo do banco não observável (`APR-2026-016`).

## 9. Lição de método incorporada

O erro nasceu de **provar o mecanismo e concluir sobre a capacidade**. Regra que passo a aplicar: varredura por *implementação* (`paranoid`, `deleted_at`) só autoriza conclusão sobre aquela implementação; conclusão sobre *capacidade de negócio* exige varredura pelo **vocabulário do domínio** — aqui, o próprio ENUM `soft_delete` que citei e não segui até seus emissores. A pista estava dentro da minha própria frase.
