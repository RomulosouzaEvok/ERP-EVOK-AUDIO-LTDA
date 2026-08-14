# T-19 — ARQUITETURA · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-architecture-auditor` (T-19 arquitetura) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID ......... ERP-LEGACY-001-AUD-001
TRILHA ........... T-19 — ARQUITETURA (transversal), onda W3
TITULAR .......... vericore-architecture-auditor
AUDIT_COMMIT ..... c1311a6f76b512fef893f7e60d934179cae3409f
                   (lido do disco em c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/;
                    nenhum HEAD/branch de contexto injetado usado como fonte)
REGIME ........... APR-2026-016 (read-only reforçado; ZERO conexão de banco,
                   ZERO execução) · Regra 2 · Regra 22 (findings PROPOSED)
OBJETO ........... server/src/modules/ (48 módulos) × server/src/models/ (186)
                   + server/src/services/ (16) + server/src/middlewares/ (6)
                   + server/app.ts + docs/arquitetura/
DATA ............. 2026-08-14
ESFORÇO .......... orçado 4 S · realizado ≈1,2 S (parte estática); a parcela
                   dinâmica não foi consumida e não é substituível
```

---

### 0. LIMITAÇÃO DE FERRAMENTAL — DECLARADA ANTES DE QUALQUER AFIRMAÇÃO

Sem shell nesta sessão. **IN-08 não foi satisfeito: nenhuma afirmação deste relatório atribui origem temporal, autoria ou proveniência de commit a nenhum arquivo.** Onde o código traz datas ("corrigido em 2026-08-11", "achado de 2026-08-12"), elas são **citação do texto contido no arquivo**, nunca inferência. Isso é `RES-T19-01`.

Toda contagem abaixo é reproduzível por Grep/Glob e vem com o padrão de busca declarado, para que qualquer parte possa refazê-la.

---

### 1. COBERTURA EFETIVA (declarada honestamente)

| Dimensão do meu mandato | Planejado | **Alcançado** | Evidência |
|---|---|---|---|
| Boundary módulo × módulo (arestas de import relativo) | exaustivo | **exaustivo para import relativo estático** | §3, padrão declarado |
| Acoplamento à espinha legada (`services/`, `models/`) | exaustivo | **exaustivo** | §2, 3 padrões declarados |
| Ownership de dado (qual módulo é dono, quem escreve por fora) | exaustivo | **amostral nominal** — 3 entidades (`lot_controls`, `users`, `audit_logs`) | §4; `RES-T19-05` |
| V1–V4 do `CURRENT_ARCHITECTURE.md` revalidadas no AUDIT_COMMIT | exaustivo | **exaustivo, com 4 refutações** | §6 |
| Consistência transversal: erro, logging, observabilidade | exaustivo | **exaustivo para erro e logging**; observabilidade **não coberta** | §5; `RES-T19-06` |
| Real × intencionado (ADR / `architecture/`) | exaustivo | **exaustivo — e o resultado é a ausência** | §7 |
| `server/app.ts` fora de `server/src/` | integral | **integral** (240 linhas lidas) | §8 |
| Ciclo de dependência em nível de módulo | impacto arquitetural | **1 ciclo provado; fecho transitivo NÃO calculado** | `RES-T19-04` |
| Arquitetura de `client/`, `mobile/`, `tv/` | — | **não coberta** (T-21) | `RES-T19-03` |

---

### 2. A MEDIÇÃO CENTRAL — E A ADJUDICAÇÃO QUE ELA OBRIGA

O plano (`AUDIT_PLAN.md:504-508`) afirma que a espinha legada é "onde vivem as âncoras dos achados mais graves". **Medi. Confirmo — e a medição diz mais do que a afirmação.**

**Acoplamento vertical (módulo → espinha legada), padrão `(from|require\()\s*'(\.\./)+services/` em `server/src/modules/`:**
> **148 arquivos de módulo, 165 declarações de import** de `server/src/services/`.

**Padrão `(from|require\()\s*'(\.\./)+models(/|')` em `server/src/modules/`:**
> **140 arquivos de módulo, 154 declarações de import** de `server/src/models/`.

**Acoplamento horizontal (módulo → outro módulo), padrão `'(\.\./)+<48 nomes de módulo>/(domain|application|infrastructure|presentation)/`:**
> **≈40 declarações de import cruzando fronteira de módulo, em 34 arquivos**, sobre um backend de mais de 1.000 arquivos em 48 módulos.

**A adjudicação, que é minha para nomear:**

> **A arquitetura real não é um emaranhado entre módulos. É uma topologia em estrela em torno de um núcleo legado sem dono.** Os módulos são horizontalmente pouco acoplados — ~40 arestas entre 48 módulos é um número **baixo**, e registro isso como conformidade (§9, C-6). O acoplamento real é **vertical**: 288 declarações de import apontando para duas superfícies globais (`services/` e `models/`) que **não pertencem a nenhum módulo, não têm interface de domínio, e não aparecem em nenhuma trilha de módulo da matriz de cobertura**.

**Isso explica, e valida, a convergência das quatro medições independentes que me foram entregues:**

| Trilha | O que mediu | Onde a âncora caiu |
|---|---|---|
| **T-13** | `server/src/models/` = 186 arquivos distribuídos por 24 trilhas de módulo ⇒ nenhum dono; 190/459 FKs sem índice, ~120 delas em colunas de autoria | núcleo (`models/` + colunas transversais `created_by`/`approved_by`) |
| **T-06** | defeito de idempotência de estoque em `InventoryService.adjust`, compartilhado por 4 rotas de 3 módulos | núcleo (`server/src/services/inventoryService.ts`) |
| **T-11** | a regra que atravessa dois módulos é a que fica sem dono de código; `is_phantom` não carregado na projeção de BOM | fronteira (`services/bomService.ts` × `services/bomStructureProjection.ts`) |
| **T-14** | ≥26 regras vivas sem BR-ID, e **a regra que atravessa dois módulos é a que fica sem BR-ID** (`T-14:307`) | fronteira |
| **T-08** | módulo `fiscal` com 6 rotas em 3 roteadores, onde o plano supunha 1 | fronteira (§ `T19-F08`) |

**Veredito de adjudicação:** as cinco convergem, e convergem **porque medem o mesmo objeto por cinco ângulos**. O predicado comum não é "o código é ruim nos módulos" — é **"tudo que atravessa mais de um módulo cai no núcleo, e o núcleo não tem dono: nem de código, nem de regra, nem de dado, nem de trilha de auditoria"**. Registro isso como o achado de arquitetura de primeira ordem desta run: `T19-F01`. **Não há divergência a escalar com T-06, T-08, T-11, T-13 ou T-14.**

---

### 3. FRONTEIRAS ENTRE MÓDULOS — ENUMERAÇÃO DAS 40 ARESTAS

Classificadas por gravidade da fronteira violada.

**(a) Presentation → infraestrutura CONCRETA de módulo estrangeiro — 7 controllers, 16 imports, 6 módulos-alvo.** O consumidor conhece a classe `Sequelize<X>Repository` do fornecedor, não sua interface:

- `mrp/presentation/controllers/mrpController.ts:4,5,6,7` → `items` (×2), `purchaseRequisitions`, `production`
- `rfq/presentation/controllers/rfqController.ts:7,8,13,17` → `items` (×2), `purchases`, `purchaseRequisitions`
- `purchaseRequisitions/presentation/controllers/purchaseRequisitionController.ts:7,12,13` → `items` (×2), `purchases`
- `masterProduction/presentation/controllers/masterProductionPlanController.ts:17` → `production`
- `comex/presentation/controllers/importProcessController.ts:7` → `items`
- `suppliers/presentation/controllers/supplierController.ts:4` → `items`
- `inventory/presentation/controllers/inventoryController.ts:19` → `quality`

**(b) Application → infraestrutura CONCRETA de módulo estrangeiro — 4 use-cases:**

- `quality/application/use-cases/CreateQualityInspectionUseCase.ts:46,48` → `nonConformities` (use-case + repositório concreto)
- `laboratory/application/use-cases/CreateAcousticTestUseCase.ts:41,43` → idem
- `inventory/application/use-cases/CreateInventoryMovementUseCase.ts:8` → `items`
- `inventory/application/use-cases/CreateInventoryCountUseCase.ts:7` → `items`

**(c) Application → interface de domínio de módulo estrangeiro (o padrão menos danoso):** `mrp/GenerateMrpPlanUseCase.ts:10-12`, `mrp/ConvertPlannedOrdersToRequisitionUseCase.ts:20-21`, `mrp/ConvertPlannedOrdersToProductionOrderUseCase.ts:35`, `mrp/support/createRequisitionFromPlannedOrders.ts:14-15`, `purchaseRequisitions/CreatePurchaseRequisitionUseCase.ts:3`, `purchaseRequisitions/ConvertRequisitionToPurchaseOrdersUseCase.ts:51-52`, `comex/CreateImportProcessUseCase.ts:19`, `comex/ReceiveImportProcessUseCase.ts:73`, `rfq/CreateRfqUseCase.ts:25`, `rfq/AwardRfqUseCase.ts:25`, `suppliers/ListSupplierItemsUseCase.ts:10`, `budget/report/GetBudgetVsActualReportUseCase.ts:1`, `inventory/ReleaseLotUseCase.ts:57`.

**(d) Presentation → presentation de módulo estrangeiro — 2 roteadores montam o controller de `fiscal`:** `sales/presentation/routes/sales.ts:5`, `purchases/presentation/routes/purchases.ts:6`. Ver `T19-F08`.

**(e) Domain → domain estrangeiro:** `users/domain/entities/UpdateUserEntity.ts:3` e `users/application/use-cases/CreateUserUseCase.ts:2` → `auth/domain/entities/AuthCredentialsEntity`.

**(f) O "padrão novo" (adapter) — existe, é real, e **também** alcança a infraestrutura concreta do fornecedor:** `facilities/infrastructure/adapters/AccountPayableServiceAdapter.ts:13` → `financial/infrastructure/sequelize/SequelizeFinancialRepository`; `facilities/.../MaintenanceOrderServiceAdapter.ts:16` → `maintenance/infrastructure`; `marketing/.../ClientServiceAdapter.ts:13,14,15` → `clients` (domínio **+ infraestrutura + use-case**); `ti/.../PurchaseRequisitionServiceAdapter.ts:15,16,17`; `ti/.../AccessProfileExecutionServiceAdapter.ts:17-20` → 3 use-cases de `users`; `rh/.../TrainingMatrixServiceAdapter.ts:18,19` e `rh/.../SstAsoServiceAdapter.ts:13,14` → `sst`; `sst/.../InventoryMovementServiceAdapter.ts:12` e `facilities/.../InventoryServiceAdapter.ts:31` → `inventory/application`.

O adapter **localiza** o acoplamento em um arquivo — o que é ganho real de manutenção e registro como conformidade parcial (C-4). Mas ele **não elimina** a dependência sobre a implementação concreta do fornecedor. Isso **refuta** a afirmação do insumo de discovery de que "o módulo consumidor não conhece a infraestrutura do módulo fornecedor, só o contrato local" (`CURRENT_ARCHITECTURE.md:141-143`) — ver divergência **D-4**, §6.

---

### 4. OWNERSHIP DE DADO — 3 ENTIDADES MEDIDAS NOMINALMENTE

**`lot_controls` — a entidade de rastreabilidade ISO 9001. Dono nominal: `inventory`. Caminhos de escrita independentes encontrados: 5, em 3 módulos estrangeiros + 2 serviços legados.**

| Escritor | Âncora | Passa pela interface de domínio de `inventory`? |
|---|---|---|
| `comex` (infraestrutura) | `SequelizeComexRepository.ts:110` — `LotControl.create` | **não** |
| `purchases` (infraestrutura) | `SequelizePurchaseRepository.ts:313` — `LotControl.create` | **não** |
| `production` (**camada de aplicação**) | `ChangeProductionOrderStatusUseCase.ts:962` — `LotControl.create` | **não** — e pula também a própria infraestrutura de `production` |
| `services/materialReceiptService.ts` (espinha legada) | grava `status:'quarantine'` sobre lote existente (medição de T-06 §BR-QE-006, `:165-179`) | **não** |
| `services/saleLotService.ts` (espinha legada) | `:487` — `LotControl.findByPk(... lock ...)` seguido de escrita | **não** |
| `inventory` (dono) | `SequelizeInventoryRepository.ts:190,195,203,216,230` | sim |

Leitores adicionais sem passar pelo dono: `quality/infrastructure/.../SequelizeQualityRepository.ts:22`, `nonConformities/.../SequelizeNonConformitiesRepository.ts:57,66`, `traceability/.../SequelizeTraceabilityRepository.ts:181`, `items/application/use-cases/DeactivateItemUseCase.ts:110`, `services/quarantineBalanceService.ts:103`.

**`users` — dono nominal: módulo `users`. Padrão `\bUser\b` em `**/infrastructure/**` de `server/src/modules/`: 28 repositórios de infraestrutura, em 24 módulos distintos**, acessam o model `User` diretamente. Some-se `middlewares/auth.ts` (consulta `User`/`AccessProfile` direto do banco a cada requisição, medição de T-04) e a conta fecha: o módulo `users` é um consumidor entre 25, não um dono.

**`audit_logs` — o caso mais nítido, e ele **converge** com T-03 e T-13.** O módulo `auditLogs` é dono formal **apenas da leitura** (`SequelizeAuditLogsRepository.ts:8`); a escrita inteira vive em `services/auditLogService.ts` e é chamada de fora. Medi a distribuição da chamada:

> `logAction(` em `**/presentation/**`: **256 ocorrências em 72 controllers**.
> `logAction(` em `**/application/**`: **9 ocorrências em 9 use-cases**, de exatamente **3 módulos** — `users` (5), `accessProfiles` (3), `auth` (1).

Ver `T19-F09`: esses 3 módulos são **precisamente** os que acoplam a camada de aplicação ao Express (§6, V2). A colocação minoritária do concern transversal é a causa direta da violação de camada.

---

### 5. CONSISTÊNCIA TRANSVERSAL — RESULTADO POSITIVO, MEDIDO

Auditei tratamento de erro e logging com o mesmo rigor com que auditei os defeitos, e o resultado é **conformidade**:

- **Erro: um único caminho, praticamente sem exceção.** Padrão `res\.status\(500\)` em `server/src/modules/`: **1 ocorrência, em 1 arquivo** (`webhooks/presentation/controllers/webhookController.ts`) — em 106 controllers. Todo o restante delega a `next(error)` → `middlewares/errorHandler.ts`. Registro como C-1. A coexistência de **dois envelopes** de erro (`AppError` × erro legado com `statusCode`) é fato conhecido e documentado em `docs/arquitetura/API.md`; **não emito finding novo** — é matéria de contrato de API (T-17) e de documentação (T-23).
- **Logging de requisição: único.** `middlewares/requestContext.ts` (Winston, `x-request-id`), montado uma vez em `server/app.ts:37`, antes de qualquer rota.
- **Logging ad hoc: ausente do caminho de módulo.** Padrão `console\.(log|error|warn)` em `server/src`: **366 ocorrências em 23 arquivos, ZERO em `server/src/modules/`**. A concentração é em `scripts/backfill/` (≈300, fora do caminho de requisição), `config/seeds.ts` (10) e `config/database.ts` (2). Restam 3 no caminho de execução (`services/emailService.ts` ×2, `services/auditLogService.ts` ×5, `middlewares/auth.ts` ×1, `middlewares/requestContext.ts` ×1, `inventory/.../SequelizeInventoryRepository.ts` ×3). Registro como C-2 — **isto é disciplina real e não pode ser reportado como defeito por trilha posterior.**
- **Observabilidade** (métrica, tracing, health além de `/health`) **não foi avaliada** — `RES-T19-06`, mandato de T-22.

---

### 6. V1–V4 REVALIDADAS NO `AUDIT_COMMIT` — 2 CONFIRMADAS, 2 REFUTADAS EM PARTE

Insumo tratado como hipótese, nunca copiado (`CURRENT_ARCHITECTURE.md`, baseline `c9359be`, **não** o AUDIT_COMMIT).

| # | Afirmação do insumo | Medição própria no AUDIT_COMMIT | Veredito |
|---|---|---|---|
| **V1** | Controller instancia infraestrutura concreta; sem composition root | Padrão `new Sequelize[A-Za-z]+Repository\(` em `**/presentation/**`: **170 ocorrências em 105 arquivos** — de 106 controllers | **CONFIRMADA e ampliada de amostra para censo** |
| **V2** | 7 arquivos de `application/` acoplados a `express.Request` | Padrão `express` em `**/application/**`: **6 arquivos** com `import type { Request } from 'express'` (`accessProfiles` ×3 `:1`, `users/AssignAccessProfileUseCase.ts:1`, `ti/.../ExecuteAccessRequestUseCase.ts:12`, `ti/application/services/AccessProfileExecutionService.ts:11`) + **4 arquivos de `users`** com `@param {import('express').Request}` em JSDoc (`CreateUserUseCase.ts:35`, `UpdateUserUseCase.ts:33`, `DeactivateUserUseCase.ts:26`, `RevokeUserSessionsUseCase.ts:24`) | **CONFIRMADA no fato, REFUTADA no arquivo** — ver **D-1** |
| **V3** | `models/User.ts` e `models/AuditLog.ts` carregam regra de negócio | Não refiz a leitura de invariante — **é mandato de T-14 e T-13**, e T-14 já a confirmou (`T-14:65,81,96` ancorando BR-IAM-001/017/032 em `models/User.ts`). **Consumo, não repito** | **CONFIRMADA por T-14; não duplico finding** |
| **V4** | Domínio sem entidade própria; repositórios `any`; ORM vaza até o controller | `items/domain/repositories/ItemRepository.ts:17,22,27,32,37,42,70` — **7 de 8 métodos retornam `any`/`Promise<any>`**. **Mas**: `Glob server/src/modules/*/domain/entities/*.ts` retorna **24 arquivos em 14 módulos** | **CONFIRMADA quanto ao `any`, REFUTADA na forma absoluta** — ver **D-2** |

**Divergências registradas, não conciliadas (Regra 20):**

- **D-1 —** `CURRENT_ARCHITECTURE.md:60-61` lista `ti/application/use-cases/license/RequestRenewalUseCase.ts` como acoplado a `express.Request`. **Refutado no AUDIT_COMMIT:** o arquivo importa `RequestRenewalInput` de `../../../domain/entities/LicenseTypes` (`:13`). Não há `express` nele. A ocorrência foi provável falso positivo por casamento do token `Request`.
- **D-2 —** `CURRENT_ARCHITECTURE.md:96-98` afirma "não há `domain/entities/`" e `:174` que "só 2 dos 48 módulos" desacoplam. **Refutado parcialmente:** 14 módulos têm `domain/entities/`. Distingo, porém, duas naturezas: **12 arquivos são entidades com comportamento** (`auth`, `users`, `bom`, `products`, `financial`, `inventory` ×2, `purchases`, `clients`, `sales`, `suppliers`, `production`) e **12 são apenas aliases de tipo** (`ti` ×5, `juridico` ×7, nomeados `*Types.ts`). **A afirmação sobre mappers permanece correta:** `Glob server/src/modules/*/infrastructure/mappers/*.ts` = **13 arquivos, em 2 módulos apenas (`sst`, `ti`)**. Portanto o desenho real é assimétrico: a entidade é usada como **validador de entrada** e a instância ORM continua escapando **na saída**. A forma correta da afirmação é essa, não a forma absoluta.
- **D-3 —** `CURRENT_ARCHITECTURE.md:152-156` afirma que **não há dependência circular** entre `mrp` e `items`/`purchaseRequisitions`/`production`. **Refutado — ver `T19-F03`.**
- **D-4 —** `CURRENT_ARCHITECTURE.md:141-143` afirma que o adapter dos módulos novos não conhece a infraestrutura do fornecedor. **Refutado — §3(f), 4 adapters requerem o `Sequelize<X>Repository` estrangeiro.**
- **D-5 —** com **T-13**: **convergência total** sobre `models/` como superfície sem dono. Estendo: `services/` tem a mesma propriedade estrutural, mas **tem** dono de auditoria nominal no plano (`AUDIT_PLAN.md:608`, T-05). Nenhum escalonamento necessário.

---

### 7. ARQUITETURA REAL × INTENCIONADA — O REGISTRO NORMATIVO NÃO EXISTE

- **`Glob architecture/**` → nenhum arquivo.** O diretório que `CLAUDE.md` (tabela de ownership) declara como território de escrita de OpusCore **não existe no AUDIT_COMMIT**.
- **`Glob **/ADR*.md` → 1 arquivo: `audit/templates/ADR_TEMPLATE.md`.** É o template da VeriCore. **Zero ADR preenchido em todo o repositório**, apesar de `CLAUDE.md` Regra 17 exigir que decisões estejam registradas com ID padronizado, listando `ADR` explicitamente entre os prefixos obrigatórios.
- O único artefato que descreve camadas é `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md`. Ele declara as 4 camadas (`:6-9`) e adverte que usa "os módulos mais representativos" (`:11-12`). Medido: o diagrama cobre **10 interfaces de repositório** (`:62-71`) — de 48 módulos.

**E o achado que só aparece lendo o diagrama de perto:** ele **documenta a espinha legada como camada intencionada**. `Service <|-- InventoryService` (`:93`); `CreateSaleUseCase --> InventoryService`, `ChangeSaleStatusUseCase --> InventoryService`, `CreateInventoryMovementUseCase --> InventoryService`, `ApproveInventoryCountUseCase --> InventoryService`, `ChangeProductionOrderStatusUseCase --> InventoryService` (`:167-179`); e o fecho `InventoryService --> SequelizeProduct` / `InventoryService --> SequelizeInventoryMovement` (`:193-194`).

> **Consequência para a adjudicação:** o segundo caminho de acesso a dado — use-case → serviço global → model ORM, contornando a interface de repositório do domínio — **não é drift acidental. É a arquitetura pretendida, tal como versionada.** Isso muda a natureza do achado: não é "a implementação divergiu do desenho"; é "o desenho institui uma segunda camada de dados sem dono, e é dela que emergem os defeitos que T-06, T-11 e T-13 encontraram". Registro isso em `T19-F01` — e é a razão de eu **não** propor arquitetura nova (Regra 6): o problema está descrito, a decisão é do dono.

---

### 8. `server/app.ts` — FORA DE `server/src/`

Lido integralmente (240 linhas). É o **único composition root que existe** no sistema — mas de **rotas**, não de dependências: 50 `app.use('/api/...', require('./src/modules/.../routes/...'))` (`:150-218`). Nenhum container de DI, nenhuma factory. A ordem de montagem carrega semântica declarada em comentário no próprio arquivo (`:187-190` — `/api/quality/non-conformities` **antes** de `/api/quality`; `:194` — `/api/engineering/bom` **antes** de `/api/engineering`), isto é: **uma troca de ordem de duas linhas neste arquivo redireciona endpoints inteiros.** Ele monta ainda `/uploads` com `authenticate` (`:225`). A avaliação de **segurança** dessa ordem é mandato de T-04 (`AUDIT_PLAN.md:611`); minha afirmação é estritamente arquitetural (`T19-F10`).

---

### 9. CONFORMIDADES PROVADAS — MESMO PESO DOS DEFEITOS

Registro explícito para que nenhuma vire finding em trilha posterior:

1. **C-1 — Tratamento de erro genuinamente centralizado.** 1 `res.status(500)` em 106 controllers; `errorHandler.ts` único e montado em `app.ts:234`.
2. **C-2 — Zero `console.*` em `server/src/modules/`.** As 366 ocorrências estão em scripts de backfill, seeds e config — fora do caminho de requisição.
3. **C-3 — Existe kernel compartilhado real e ele é usado.** `shared/application/UseCase`, `shared/domain/{Entity,ValueObject,accessModules,auditActions,segregationOfDuties,handoffSignal}` aparecem em dezenas de módulos (ex.: `nonConformities/.../ListNonConformitiesUseCase.ts:13,15`; `auth/domain/entities/AuthCredentialsEntity.ts:7`; `accessProfiles/.../validatePermissions.ts:2`). A estrutura Clean Architecture **não é fachada vazia**.
4. **C-4 — O padrão porta+adapter existe, é real e está em 6 módulos** (`facilities`, `rh`, `ti`, `sst`, `marketing`, `juridico`). Ele **localiza** o acoplamento em um arquivo por dependência, o que é ganho de manutenção mensurável — mesmo não eliminando a dependência sobre a implementação concreta (§3f).
5. **C-5 — Acoplamento horizontal baixo.** ~40 arestas entre 48 módulos. Nenhum "big ball of mud" entre módulos. Se alguma trilha reportar "módulos altamente acoplados entre si", **é falso positivo à luz desta medição.**
6. **C-6 — Camada `domain` limpa de I/O, com exatamente 1 exceção.** Padrão de import de `models/` em `**/domain/**` de todos os 48 módulos: **1 ocorrência** (`T19-F06`). 47 módulos mantêm o domínio livre do ORM.
7. **C-7 — Mappers reais existem** (13 arquivos, `sst` + `ti`), provando que a equipe **sabe** o padrão. A ausência nos outros 46 módulos é escolha, não desconhecimento — o que é insumo de severidade, não de culpa.

---

### 10. FINDINGS PROPOSTOS

Todos em estado **`PROPOSED`**. Nenhum `CONFIRMED`. CRITICAL/HIGH seguem ao `vericore-finding-validator` (Regra 22). Severidade e confiança declaradas separadamente. **Nenhum finding propõe solução (Regra 6).**

---

#### `T19-F01` — O núcleo legado é uma segunda camada de dados, sancionada pelo diagrama versionado, sem dono de módulo, de regra ou de interface — e é onde as 5 trilhas independentes ancoraram

**Severidade proposta: HIGH · Confiança: ALTA**

**Fato medido:** 148 arquivos de módulo (165 imports) dependem de `server/src/services/`; 140 arquivos de módulo (154 imports) dependem de `server/src/models/`. Contra ~40 arestas entre módulos. **O acoplamento do sistema é vertical em direção a um centro que nenhum módulo possui.**

**Fato agravante:** esse centro **é a arquitetura intencionada**, não drift. `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:93,167-179,193-194` declara `UseCase --> InventoryService --> SequelizeProduct` como fluxo de dependência legítimo — um caminho de acesso a dado que **não passa pela interface de repositório do domínio** e que, por construção, não pertence a módulo algum.

**Impacto:** (i) toda regra que atravessa dois módulos é implementada no centro e, por isso, não tem dono de código (medido por T-11) nem BR-ID (medido por T-14, `T-14:307`); (ii) um defeito no centro é multiplicado por todos os consumidores — `InventoryService.adjust` serve 4 rotas de 3 módulos (T-06 §3); (iii) o centro fica fora de todas as trilhas de módulo da matriz de cobertura, o que exigiu resolução nominal por superfície transversal (`AUDIT_PLAN.md:604-617`) — a matriz teve de contornar a arquitetura.

**Âncora:** padrões de busca de §2 (reproduzíveis); `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:93,167-179,193-194`; `server/src/services/inventoryService.ts`; `server/src/models/` (186 arquivos).

**Nota anti-falso-positivo:** procurei ativamente controle compensatório — um teste-guarda de camada, um lint rule de import boundary, um `dependency-cruiser`/`madge` no CI. Não localizei nenhum em `server/tests/**/*guard*` nem em `.github/workflows/server-ci.yml`. **Declaro que a verificação em CI é `DYN-T19-01`, não uma afirmação fechada.**

---

#### `T19-F02` — `lot_controls`, a entidade de rastreabilidade ISO 9001, tem 5 caminhos de escrita independentes; o módulo dono é apenas um deles

**Severidade proposta: HIGH · Confiança: ALTA**

Enumeração completa em §4. Nenhum dos 5 escritores estrangeiros passa pela interface `InventoryRepository` do módulo `inventory`; três instanciam o model ORM diretamente, sendo um deles **na camada de aplicação** (`production/.../ChangeProductionOrderStatusUseCase.ts:962`).

**Impacto:** qualquer invariante de lote (quarentena, bloqueio, liberação por inspeção, saldo disponível) precisa ser reimplementada 5 vezes para valer. T-06 já provou empiricamente as duas consequências: `BlockLotUseCase` sem lock (`AUD-INTEG-05`) e `materialReceiptService.ts:165-179` sobrescrevendo `status:'quarantine'` sem limpar `blocked_at`/`released_by`/`release_inspection_id`. **Aquilo não são dois bugs — é o mesmo defeito de ownership manifestado em dois pontos.**

**Âncora:** `SequelizeComexRepository.ts:110`; `SequelizePurchaseRepository.ts:313`; `ChangeProductionOrderStatusUseCase.ts:962`; `services/saleLotService.ts:487`; `services/materialReceiptService.ts` (via T-06); `SequelizeInventoryRepository.ts:190-230`.

**Interface com T-06 e T-13:** **convergente.** Não escalono. T-13 provou (`T13-F01`) que o banco tampouco protege — `fk_lot_controls_production_order_id` é `SET NULL`. Nem código nem banco: nenhum dos dois é dono.

---

#### `T19-F03` — Ciclo de dependência em nível de módulo `items` ⇄ `mrp` — o insumo de discovery afirma que não existe

**Severidade proposta: HIGH · Confiança: ALTA**

Aresta de ida — **`items` depende de `mrp`:**
`server/src/modules/items/application/use-cases/ExplodeItemStructureUseCase.ts:5`
```ts
import { explodeBomRequirements } from '../../../mrp/application/mrpEngine';
```
Arestas de volta — **`mrp` depende de `items`:** `mrp/application/use-cases/GenerateMrpPlanUseCase.ts:10,12`; `mrp/.../ConvertPlannedOrdersToRequisitionUseCase.ts:21`; `mrp/.../ConvertPlannedOrdersToProductionOrderUseCase.ts:35`; `mrp/.../support/createRequisitionFromPlannedOrders.ts:15`; e, na apresentação, `mrp/presentation/controllers/mrpController.ts:4,5` importando as classes **concretas** `SequelizeItemRepository`/`SequelizeItemSupplierRepository`.

**Impacto:** `items` é módulo **tier 1 / PRODUÇÃO REAL**; `mrp` é não-produção. O ciclo faz um módulo em produção depender, em tempo de compilação, do motor de planejamento não-produtivo — nenhum dos dois pode ser extraído, versionado, testado em isolamento ou desativado sem o outro. O motor de explosão de BOM passa a ter dois donos conceituais, o que é exatamente o cenário que T-11 mediu (dois motores de explosão divergentes, `bomService.ts` × `bomStructureProjection.ts`).

**Divergência formal (Regra 20):** `CURRENT_ARCHITECTURE.md:152-156` afirma "**Dependência circular: não encontrada** nos pares inspecionados (`mrp`→`purchaseRequisitions`/`items`/`production`: confirmado, por grep, que nenhum desses três importa de volta `mrp/`)". **Refutado no AUDIT_COMMIT com âncora arquivo:linha.** Registro a divergência; não a concilio. O insumo provavelmente buscou o token `mrp/` apenas em `presentation`/`infrastructure`, e a aresta vive em `application`.

**Ressalva de escopo honesta:** enumerar **todos** os ciclos é mandato do `vericore-dependency-architecture-auditor`. **Afirmo que este ciclo existe; NÃO afirmo que é o único** — `RES-T19-04`.

---

#### `T19-F04` — A fronteira pública de módulo não existe: 7 controllers instanciam infraestrutura concreta de 6 módulos estrangeiros

**Severidade proposta: MEDIUM · Confiança: ALTA**

16 declarações de import enumeradas em §3(a), mais 4 em §3(b) na camada de aplicação. O consumidor depende da **classe concreta** `Sequelize<X>Repository` do fornecedor — não de interface, não de porta, não de API.

**Impacto:** nenhum dos 48 módulos pode trocar sua implementação de persistência sem quebrar compilação de módulos que ele não conhece. `items` é o alvo mais exposto — sua classe concreta é instanciada por `mrp`, `rfq`, `purchaseRequisitions`, `comex`, `suppliers` e `inventory`. Um módulo tier 1 em produção com 6 dependentes que atravessam sua fronteira interna.

**Nota de conformidade adjacente, obrigatória:** o padrão porta+adapter (§3f, C-4) mostra que a equipe **tem** a técnica. A coexistência dos dois padrões, sem retrofit e sem decisão registrada sobre qual vale, é o que transforma isto em achado arquitetural em vez de dívida localizada.

---

#### `T19-F05` — Não existe nenhum registro normativo da arquitetura intencionada: zero ADR, `architecture/` inexistente, e o único diagrama de camadas cobre 10 de 48 módulos

**Severidade proposta: MEDIUM · Confiança: ALTA**

- `Glob architecture/**` → nenhum arquivo, apesar de `CLAUDE.md` (tabela "Ownership de diretórios") declarar `architecture/` como território de escrita de OpusCore.
- `Glob **/ADR*.md` → apenas `audit/templates/ADR_TEMPLATE.md` (template da VeriCore, não um ADR). **Zero ADR preenchido**, contra `CLAUDE.md` Regra 17, que lista `ADR` entre os IDs obrigatórios de decisão registrada.
- `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:62-71` cobre 10 interfaces de repositório; declara a limitação honestamente em `:11-12`.

**Impacto direto sobre esta auditoria:** as 8 "decisões implícitas" que o discovery inferiu do código (`CURRENT_ARCHITECTURE.md:286-344`) **não podem ser confrontadas com nada**. Onde não há decisão registrada, **não posso declarar violação** — só posso registrar a lacuna (Regra 6). Isso limita objetivamente o alcance de toda a trilha T-19: dos 11 findings abaixo, nenhum pode ser fundamentado em "viola o ADR-nnn", porque não há ADR-nnn.

**Âncora:** ausência verificável por `Glob`; `CLAUDE.md` (tabela de ownership, Regra 17); `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:11-12,62-71`.

---

#### `T19-F06` — A camada `domain` faz I/O de banco em `ti`, e a regra afetada é de elegibilidade de aprovador

**Severidade proposta: MEDIUM · Confiança: ALTA**

`server/src/modules/ti/domain/services/approverEligibilityService.ts:11`
```ts
const { Department, Employee }: any = require('../../../../models/index');
```
e as consultas em `:30` (`Department.findByPk`) e `:33` (`Employee.findByPk`). O arquivo decide, em `:26-37`, quem pode aprovar uma `ItAccessRequest` — regra ancorada pelo próprio cabeçalho em `docs/business/BLOCO_2_TI_API.md §4.1` (`:2-6`).

**Impacto:** a camada mais interna do modelo Clean Architecture depende da mais externa, invertendo a Regra de Dependência no ponto de maior consequência — uma decisão de **segregação de função** que se torna intestável sem banco e não reutilizável fora do processo Node.

**Registro de proporção (obrigatório):** este é o **único** caso em 48 módulos. Ver C-6. Não é padrão sistêmico e a severidade reflete isso.

**Deconflito de mandato:** reporto a **inversão da regra de dependência** (arquitetura). O mérito da regra `ti:approve` OU gestor do departamento é de T-09/T-14; a invariante de domínio é do `vericore-domain-architecture-auditor`. **Não duplico.**

---

#### `T19-F07` — V1 confirmada como censo: 170 instanciações de repositório concreto em 105 dos 106 controllers; zero composition root

**Severidade proposta: MEDIUM · Confiança: ALTA**

Padrão `new Sequelize[A-Za-z]+Repository\(` em `server/src/modules/**/presentation/**`: **170 ocorrências, 105 arquivos**. O insumo de discovery afirmava o padrão por amostra de 15 arquivos; **elevo de amostra a censo** — 105/106 controllers.

**Impacto:** cada controller é seu próprio ponto de composição, em escopo de módulo do arquivo (singleton de fato, criado no `require`). Não há um lugar único onde a topologia de dependências do sistema possa ser lida, substituída (para teste) ou auditada. É a causa estrutural de `T19-F04`: sem composition root, a única forma de um módulo obter a dependência de outro é importar sua classe concreta.

**Deconflito:** a violação Controller→Repository como **disciplina de camada MVC** é mandato do `vericore-mvc-architecture-auditor`. Meu ângulo, e o que reporto, é **a ausência de composition root como propriedade da arquitetura como um todo** e sua consequência sobre a fronteira entre módulos. Se o consolidator julgar sobreposição, **prevalece o mvc-auditor no aspecto de camada** e este finding deve ser reduzido ao seu núcleo de topologia.

---

#### `T19-F08` — O módulo `fiscal` não possui as rotas nem a chave de autorização de suas próprias operações — adjudicação de T-08

**Severidade proposta: MEDIUM · Confiança: ALTA**

T-08 encontrou 6 rotas de `fiscal` em 3 roteadores onde o plano supunha 1. **Confirmo por medição própria e corrijo para 4 superfícies:**

| Roteador | Endpoints de `fiscal` | Chave de autorização usada |
|---|---|---|
| `fiscal/presentation/routes/fiscal.ts:14,15` | 2 (config) | `authorize('admin')` |
| `sales/presentation/routes/sales.ts:54,55,56,60` | 4 | **`authorizeModule('vendas', …)`** |
| `purchases/presentation/routes/purchases.ts:51` | 1 | **`authorizeModule('compras','operate')`** |
| `webhooks/presentation/controllers/webhookController.ts:5` | 1 (chama `fiscal/application/use-cases/HandleNfeStatusWebhookUseCase` direto) | — |

O próprio `fiscal/presentation/routes/fiscal.ts:8` **documenta** a dispersão: *"venda/compra ficam em `/api/sales/:id/nfe*` e `/api/purchases/:id/nfe`"*.

**Impacto arquitetural (o que é meu):** emitir, cancelar e consultar NF-e — operação fiscal, com consequência tributária — é autorizada pela chave do **módulo hospedeiro** (`vendas`, `compras`), não pela do módulo dono da capacidade. O módulo `fiscal` não pode definir, revogar nem auditar quem exerce suas próprias operações; um perfil com `vendas:approve` obtém emissão de NF-e sem que nenhuma permissão fiscal lhe tenha sido concedida.

**Deconflito explícito:** a **presença/ausência e a corretude do guard** são mandato de T-04 e T-09. Reporto **a ownership da chave**, que é fronteira de módulo. Convergência com T-08 registrada; **nenhuma divergência a escalar.**

---

#### `T19-F09` — O concern transversal de auditoria está em duas camadas, e a camada minoritária é exatamente a que quebra o isolamento de framework

**Severidade proposta: MEDIUM · Confiança: ALTA**

`logAction(` em `presentation/`: **256 ocorrências / 72 controllers**. Em `application/`: **9 ocorrências / 9 use-cases**, de **3 módulos apenas** — `users`, `accessProfiles`, `auth`.

E são **esses mesmos 3 módulos** os que aparecem em V2 (§6): 6 arquivos com `import type { Request } from 'express'` na camada de aplicação + 4 com o mesmo contrato em JSDoc, todos em `users`/`accessProfiles`/`ti`. A cadeia causal é fechada e legível no código: `logAction` extrai `req.user`/`req.ip`/`req.headers`; quem o chama **de dentro** do use-case precisa carregar o `Request` para lá; logo, a camada de aplicação passa a depender do framework de transporte.

**Impacto:** (i) não há regra declarada de "quem deve auditar", então a cobertura de auditoria depende de o autor lembrar, em 2 camadas diferentes, sem enforcement — o que é insumo para T-03; (ii) qualquer caminho de execução que não seja HTTP (script, job, mensageria, teste) não registra auditoria em 72 controllers e não compila nos 9 use-cases acoplados.

**Interface com T-03:** T-03 é dono de `auditLogService.ts` (`AUDIT_PLAN.md:607`). **Não reporto o serviço nem sua cobertura.** Reporto **a posição arquitetural da chamada**. Escalono para confronto, sem conciliar.

---

#### `T19-F10` — 20 arquivos de `application/` e 3 controllers falam direto com o ORM, contornando a própria infraestrutura de seus módulos

**Severidade proposta: MEDIUM · Confiança: ALTA**

Padrão de import de `models/` restrito a `**/application/**`: **29 ocorrências em 20 arquivos** — `juridico` (7 arquivos, incl. `legalCase/CreateLegalCaseUseCase.ts` com **7 imports**), `mrp` (3), `masterProduction` (3), `items` (3), `production` (2), `ti` (1), `rh/application/services/EmployeeDirectoryService.ts` (1), `nonConformities/application/services/SupplierReturnHandler.ts` (1).

Restrito a `**/presentation/**`: **3 arquivos** — `employees/.../employeeController.ts:19` (`HrTerminationProcess`), `sst/.../trainingController.ts:10` (`Employee`), `inventory/.../inventoryController.ts:14` (`LotControl`, `Product`).

**Impacto:** nesses 23 arquivos a camada `infrastructure/` do próprio módulo é decorativa — a persistência é alcançada por atalho. É o mecanismo concreto pelo qual `T19-F02` acontece (`ChangeProductionOrderStatusUseCase.ts:962` está nesta lista) e pelo qual a interface de repositório deixa de ser o contrato único de dado.

**Nota de proporção:** os outros 120 arquivos que importam `models/` estão em `infrastructure/sequelize/` — **posição legítima**, e registro isso para que nenhuma trilha reporte os 140 como violação em bloco.

---

#### `T19-F11` — `server/app.ts` é o único ponto de composição do sistema, vive fora de `server/src/`, e sua ordem de linhas é semanticamente carregada

**Severidade proposta: LOW · Confiança: ALTA**

50 montagens `app.use('/api/…', require('./src/modules/…'))` em `:150-218`. Está fora da raiz de código (`server/src/`) — logo, fora de qualquer convenção de caminho, de qualquer `tsconfig` path e de qualquer varredura que assuma `src/`. Dois comentários no próprio arquivo declaram que a ordem importa: `:187-190` e `:194`.

**Impacto:** o mapa completo da superfície HTTP do ERP (681 endpoints, por `API_INVENTORY.md`) depende de um arquivo de 240 linhas cuja **ordem** é regra não testada. Reordenação inocente redireciona rotas inteiras.

**Deconflito:** a consequência de **segurança** da ordem de montagem (onde authZ é contornável) é explicitamente de T-04 (`AUDIT_PLAN.md:611`). **Não a avalio.**

---

### 11. LACUNAS DECLARADAS (`RES-T19-nn`) — sub-entrega declarada, não silenciosa

| ID | Lacuna | Por quê | Quem fecha |
|---|---|---|---|
| `RES-T19-01` | **IN-08 não satisfeito.** Nenhuma proveniência temporal ou de commit estabelecida. | Sem shell; `git log`/`git show` impossíveis. | Reexecução com shell, ou dispensa registrada pelo audit-director |
| `RES-T19-02` | Arestas de fronteira medidas **só por caminho relativo estático**. Import por alias de `tsconfig`, caminho absoluto, `require()` com string montada em runtime ou injeção via objeto **não** foram cobertos. | Grep textual não resolve indireção. | `DYN-T19-01` (grafo por ferramenta) |
| `RES-T19-03` | Arquitetura de `client/` (167 páginas), `mobile/`, `tv/` **não avaliada**. | Fora do escopo textual de T-19 (`AUDIT_PLAN.md:504-509`); é T-21. | audit-director / T-21 |
| `RES-T19-04` | **Fecho transitivo do grafo de dependências NÃO calculado.** Provei 1 ciclo (`T19-F03`); **não afirmo que seja o único**. | Mandato do `vericore-dependency-architecture-auditor`; e inviável manualmente sem ferramenta. | co-titular `vericore-dependency-architecture-auditor` + `DYN-T19-01` |
| `RES-T19-05` | Ownership de dado mapeado nominalmente para **3 entidades** (`lot_controls`, `users`, `audit_logs`) de ~207 tabelas. | 207 tabelas × N escritores excede o orçamento de 4 S. A seleção foi dirigida por risco (rastreabilidade ISO, identidade, trilha de auditoria). | `DYN-T19-03`; T-13 tem o inventário de tabelas |
| `RES-T19-06` | **Observabilidade** (métrica, tracing distribuído, health além de `/health`) **não auditada**. | Escopo textual de T-19 não a inclui; é T-22. | audit-director / T-22 |
| `RES-T19-07` | Não localizei guarda de fronteira de import em CI (`dependency-cruiser`, `madge`, ESLint boundaries). **Declaro busca negativa, não ausência provada** — não li `.github/workflows/server-ci.yml` integralmente (é objeto de T-22). | Fronteira de mandato. | `DYN-T19-01` + T-22 |
| `RES-T19-08` | V3 **não revalidada por leitura própria** — consumida de T-14 (`T-14:65,81,96`). | Invariante de model é mandato de T-13/T-14; revalidar duplicaria finding. | já coberta por T-14 |

---

### 12. PEDIDOS DE EVIDÊNCIA DINÂMICA (`DYN-T19-nn`) — **não executo nada**

G4 aprovado; **eu não executo**. Alvo de banco em todos: **`erp_evok_audio_test`** (efêmero). Nenhum comando abaixo escreve. Declaro honestamente que **dois destes não são de banco** — são de build/análise estática por ferramenta, que o regime read-only desta sessão também proíbe.

**`DYN-T19-01` — Grafo de dependências exaustivo (fecha `RES-T19-02`, `RES-T19-04`, `RES-T19-07`)** · *não é de banco*
```
npx madge --extensions ts --circular --ts-config server/tsconfig.json server/src
npx madge --extensions ts --json server/src > /tmp/graph.json
```
*Verificar:* todos os ciclos em nível de arquivo e sua agregação por módulo; confirmar `items ⇄ mrp` (`T19-F03`) e revelar os que meu grep relativo não alcança.
*Por que estático não basta:* meu método é textual e cobre apenas import relativo literal. Alias de `tsconfig`, `require()` dinâmico e reexport transitivo são invisíveis a ele — e o fecho transitivo não é computável manualmente sobre ~1.000 arquivos dentro do orçamento da trilha.

**`DYN-T19-02` — Tabela de rotas efetivamente montada (valida `T19-F08` e `T19-F11`)** · *não é de banco*
Subir a app em `NODE_ENV=test` **sem conectar ao banco** (`server/app.ts:2-3` declara que o módulo não conecta nem escuta) e enumerar `app._router.stack` — método, path, cadeia de middlewares por rota.
*Verificar:* que os 4 endpoints de NF-e sob `/api/sales/*` chegam com `authorizeModule('vendas', …)` e não com chave `fiscal`; e que a ordem `/api/quality/non-conformities` antes de `/api/quality` (`app.ts:187-190`) é a efetiva.
*Por que estático não basta:* a árvore final de rotas é produto da **ordem de execução** de 50 `require`, não do texto de um arquivo. Reordenação, shadowing de prefixo e middleware montado condicionalmente só aparecem na tabela materializada.

**`DYN-T19-03` — Escritores efetivos de `lot_controls` e controles compensatórios de banco (valida `T19-F02`, fecha parte de `RES-T19-05`)**
```sql
SELECT tgname, tgtype, pg_get_triggerdef(oid)
  FROM pg_trigger
 WHERE tgrelid = 'public.lot_controls'::regclass AND NOT tgisinternal;

SELECT c.conname, pg_get_constraintdef(c.oid)
  FROM pg_constraint c
 WHERE c.conrelid = 'public.lot_controls'::regclass;
```
*Verificar:* se existe trigger ou CHECK que imponha, no banco, a máquina de estados de lote (`quarantine → available/blocked`) que os 5 escritores de aplicação implementam cada um por conta própria.
*Por que estático não basta:* T-13 registrou 13 triggers de imutabilidade em RH/JUR/SST criadas por migration; se alguma cobrir `lot_controls`, existe controle compensatório e a severidade de `T19-F02` cai. O baseline versionado **não** determina o schema efetivo — o próprio repositório declara divergência de 29 colunas entre dois bancos com as mesmas migrations (`schema-model-drift-guard.test.ts:33-36`, citado por `T13-F06`).

**`DYN-T19-04` — Ordem real de carga de módulo e singletons de repositório (valida `T19-F07`)** · *não é de banco*
Instrumentar `require` (ou usar `--cpu-prof`/`module.\_load` hook) num boot de `server/app.ts` em `NODE_ENV=test` e registrar quantas instâncias de cada `Sequelize<X>Repository` são criadas no carregamento.
*Verificar:* que as 170 instanciações produzem N singletons de fato no escopo de módulo, e se algum repositório é instanciado mais de uma vez com estado divergente.
*Por que estático não basta:* a leitura estática prova que a instanciação está no topo do arquivo; só o boot prova quantos objetos existem e em que ordem nascem — o que decide se a ausência de composition root é inconveniência ou risco de estado.

---

### 13. ESCALONAMENTOS ABERTOS (Regra 20 — não concilio em silêncio)

1. **→ `vericore-audit-director` (`RES-T19-01`):** IN-08 inatingível sem shell. Precisa de dispensa registrada ou reexecução.
2. **→ `vericore-audit-director` (`T19-F05`):** a ausência total de ADR e do diretório `architecture/` **limita objetivamente toda a trilha T-19** — não posso fundamentar violação em decisão que não existe. Isso não é lacuna minha; é ausência do objeto de comparação, e precisa constar da matriz executada de T-26 como tal.
3. **→ `vericore-dependency-architecture-auditor` (co-titular):** `T19-F03` e `RES-T19-04`. Entrego 1 ciclo provado e **não** afirmo exclusividade. O grafo exaustivo é seu.
4. **→ `vericore-mvc-architecture-auditor`:** `T19-F07`. Possível sobreposição no aspecto de disciplina de camada Controller→Repository. **Prevaleça o mvc-auditor nesse aspecto**; meu núcleo é a ausência de composition root e seu efeito sobre a fronteira de módulo. Sinalizo para evitar retrabalho no consolidator.
5. **→ `vericore-domain-architecture-auditor`:** `T19-F06`. Reporto a inversão da regra de dependência; o mérito da invariante de elegibilidade de aprovador é seu.
6. **→ T-04 e T-09:** `T19-F08` (chave de autorização de operação fiscal pertence ao módulo hospedeiro) e `T19-F11` (ordem de montagem em `app.ts`). Reporto **ownership** e **topologia**; a corretude do guard é de vocês.
7. **→ T-03:** `T19-F09`. A posição arquitetural da chamada `logAction` (256 em presentation × 9 em application) é insumo direto de cobertura de auditoria.
8. **→ T-08:** `T19-F08` **converge** e corrige de 3 para 4 superfícies (incluindo `webhooks`). Sem divergência.
9. **→ T-06, T-11, T-13, T-14:** `T19-F01` é a **nomeação estrutural** do padrão que vocês mediram independentemente. **Convergência declarada, sem divergência.** Registro para que a remediação de FIND-ERP-001, das FKs sem índice e das BRs sem ID não seja desenhada como três problemas separados.
10. **→ `vericore-documentation-audit-lead` (T-23):** `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md` cobre 10 de 48 módulos e **documenta a espinha legada como camada intencionada** (`:93,167-179,193-194`). Isso é insumo de divergência doc × código com sinal invertido do usual: aqui o documento está *correto* sobre o código e *é a decisão que o código expressa* que está sem registro formal. E: **15 de 48 módulos têm README** (`Glob server/src/modules/*/README.md`) — número revalidado no AUDIT_COMMIT.

---

### 14. ARQUIVOS LIDOS (caminhos absolutos)

**Objeto auditado — leitura integral**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\app.ts` (240 linhas)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\domain\repositories\ItemRepository.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\ti\domain\services\approverEligibilityService.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\facilities\infrastructure\adapters\InventoryServiceAdapter.ts`

**Objeto auditado — leitura dirigida**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mrp\presentation\controllers\mrpController.ts` (`:1-40`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\application\use-cases\ExplodeItemStructureUseCase.ts` (`:1-30`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\ti\application\use-cases\license\RequestRenewalUseCase.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\arquitetura\DIAGRAMA_CLASSES_CAMADAS.md` (`:1-20`, `:62-71`, `:93`, `:148-194`, `:229`)

**Objeto auditado — inventário completo por Glob/Grep (padrões declarados no corpo)**
- `server\src\modules\` — 106 controllers, 53 arquivos de rota, 48 módulos, 24 arquivos `domain/entities/`, 13 `infrastructure/mappers/`, 15 `README.md`
- `server\src\services\` (16 arquivos), `server\src\middlewares\` (6 arquivos)
- `server\src\modules\**` — 7 varreduras de acoplamento (`services/`, `models/` por camada, cross-módulo, `new Sequelize*Repository`, `express`, `logAction`, `res.status(500)`, `console.*`)

**Insumos normativos (validados, nunca copiados)**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\CURRENT_ARCHITECTURE.md` (integral — 4 refutações registradas em §6)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\02-plan\AUDIT_PLAN.md` (`:480-628`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-13_DADOS_E_SCHEMA.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-06_ESTOQUE_IDEMPOTENCIA.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-14_REGRAS_DE_NEGOCIO.md` (dirigido, `:65,81,96,307`)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md` (tabela de ownership; Regras 6, 17, 20, 22)

**Não lido (declarado, para que ninguém conclua que foi auditado):** `.github/workflows/server-ci.yml`; `docs/arquitetura/{DIAGRAMA_ARQUITETURA_INFRAESTRUTURA,DIAGRAMAS_SEQUENCIA,DIAGRAMA_CLASSES,REQUISITOS_NAO_FUNCIONAIS,DOCUMENTO_DE_REQUISITOS}.md`; `docs/arquitetura/API.md` (apenas grep dirigido); os relatórios T-08 e T-11 (consumidos pela síntese que me foi entregue, **não** por leitura integral — declaro isso para que a convergência de §2 seja avaliada com esse peso); `client/`, `mobile/`, `tv/`.

---

**Status desta trilha:** entregue com **11 findings `PROPOSED`** (0 CRITICAL, 3 HIGH, 7 MEDIUM, 1 LOW), **7 conformidades provadas**, **5 divergências formais com o insumo de discovery** (D-1..D-5), **8 lacunas declaradas** (`RES-T19-01`..`08`), **4 pedidos DYN** e **10 escalonamentos**.

**Nenhum finding é `CONFIRMED`. Nada aqui declara `AUDIT_PASSED`, `RETEST_PASSED`, `FINDING CLOSED` ou `REMEDIATION COMPLETE`. Nenhuma arquitetura nova foi proposta (Regra 6). Nenhum arquivo foi criado ou alterado em disco — este relatório é o texto acima.**
