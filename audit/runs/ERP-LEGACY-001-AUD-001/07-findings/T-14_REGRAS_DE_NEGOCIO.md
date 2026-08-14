# T-14 — REGRAS DE NEGÓCIO · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-business-process-auditor` (T-14 revalidacao das regras de negocio) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:          ERP-LEGACY-001-AUD-001
TRILHA:            T-14 — revalidação das 165 regras do BR_CATALOG.md
TITULAR:           vericore-business-process-auditor
CO-TITULAR:        vericore-traceability-auditor (não consultado nesta passada — ver §7)
AUDIT_COMMIT:      c1311a6f76b512fef893f7e60d934179cae3409f  (única referência de leitura;
                   `c9359be` não citado em ponto algum)
REGIME:            APR-2026-016 — read-only reforçado. ZERO conexão de banco, ZERO execução,
                   ZERO teste rodado. Nenhum arquivo do objeto auditado tocado (Regra 2).
                   `BR_CATALOG.md` lido como INSUMO e não editado.
COBERTURA EFETIVA: 165/165 regras com status individual atribuído (100%).
                   150/165 com âncora `arquivo:linha` decidida por evidência;
                   15/165 NÃO LOCALIZÁVEL, nominalmente listadas em RES-T14-01.
                   Base da evidência: 118 regras por LEITURA PRÓPRIA desta trilha (P),
                   6 por prova negativa própria (N), 26 por leitura própria de outra
                   trilha VeriCore no mesmo AUDIT_COMMIT, citada e não relida (C).
ESTADO:            CONCLUÍDA COM LACUNA DECLARADA (RES-T14-01) — não é `AUDIT_PASSED`.
```

**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Cada BR-ID foi confrontado com o código no AUDIT_COMMIT respondendo as três perguntas do escopo (existe? existe como declarada? há contraexemplo?). O texto do catálogo **não é reproduzido** — a coluna "veredito" abaixo é determinação desta trilha, e onde ela coincide com a ficha do passo 26 isso está dito como convergência, não como cópia.

---

## 1. Legenda da base de evidência (obrigatória para ler a tabela)

| Marca | Significado |
|---|---|
| **P** | Âncora aberta e lida **por mim** nesta trilha, no AUDIT_COMMIT. |
| **N** | Prova **negativa própria** (varredura que retorna zero — a forma mais forte de provar ausência). |
| **C** | Evidência de **leitura própria de outra trilha VeriCore** no mesmo AUDIT_COMMIT, com `arquivo:linha` citado por ela. Aceita como evidência, **não relida por mim** — declarada, não disfarçada. |
| **âncora±** | A regra existe e confere, mas a linha publicada no catálogo aponta para linha **vizinha** (comentário/declaração) e não para a imposição. Correção de âncora registrada; não rebaixa a regra. |

---

## 2. Placar da revalidação

| Status T-14 | Regras | % |
|---|---|---|
| **CONFIRMADA** | **145** | 87,9% |
| **DIVERGENTE** | **4** | 2,4% |
| **NÃO IMPLEMENTADA** | **1** | 0,6% |
| **NÃO LOCALIZÁVEL** | **15** | 9,1% |
| **Total** | **165** | 100% |

**Leitura honesta do 87,9%:** ele mede *aderência do código à declaração do catálogo*, **não** qualidade da regra. 32 das 145 CONFIRMADAS são regras cuja declaração é justamente "isto está errado/ausente/contraditório" (`CONFLICTING`/`UNKNOWN`/`OBSOLETE_CANDIDATE`) — confirmar essas é confirmar um **defeito**, não uma conformidade. O catálogo do passo 26 é, quanto ao que registrou, **materialmente correto**; o problema estrutural que esta trilha encontra não é erro no que está lá — é o que **não** está (§5, T14-F05).

---

## 3. TABELA DE STATUS DAS 165 REGRAS

### 3.1 identidade-acesso — 39 regras · 39 CONFIRMADAS

| BR-ID | Veredito T-14 | Âncora decidida no AUDIT_COMMIT | Base |
|---|---|---|---|
| BR-IAM-001 | **CONFIRMADA** | `models/User.ts:123-125` — `beforeSave` + `bcrypt.hash(...,10)`; único ponto de hash | P |
| BR-IAM-002 | **CONFIRMADA** | `AuthCredentialsEntity.ts:89` — `password.length < 6`; 2ª e 3ª implementações (`authValidators.ts:7,18`) por T-02 | P+C |
| BR-IAM-003 | **CONFIRMADA** (âncora±) | imposição em `User.ts:129-131`; a linha `:127` do catálogo é o comentário | P |
| BR-IAM-004 | **CONFIRMADA** | `ChangePasswordUseCase.ts:55-58` — `comparePassword(newPassword)`; existe só nesta rota | P |
| BR-IAM-005 | **CONFIRMADA** | `runtimeEnv.ts:50` — `JWT_EXPIRE: z.string().default('7d')` | P |
| BR-IAM-006 | **CONFIRMADA** | `authController.ts:67-77` — refresh exige token válido; sem refresh-token separado (`:56-57`) | P |
| BR-IAM-007 | **CONFIRMADA** | `app.ts:54` (definição) + `app.ts:143-147` — **5 endpoints**, contagem conferida | P |
| BR-IAM-008 | **CONFIRMADA** | `ForgotPasswordUseCase.ts:17` (TTL 1h), `:45-46` (32 bytes, SHA-256), `ResetPasswordUseCase.ts:55-56` (uso único) | P |
| BR-IAM-009 | **CONFIRMADA** (conflito real) | `ResetPasswordUseCase.ts:51` — `UnauthorizedError` ⇒ **401** | P |
| BR-IAM-010 | **CONFIRMADA** | `LoginUseCase.ts:47-53,55-62` (mensagem uniforme) e `:64-70` (inativo) | P |
| BR-IAM-011 | **CONFIRMADA** | `LoginUseCase.ts:48,57,66` + `authController.ts:38,43` (sucesso e falha) | P |
| BR-IAM-012 | **CONFIRMADA** | `RevokeUserSessionsUseCase.ts:28,34` — `incrementPasswordVersion` | P |
| BR-IAM-013 | **CONFIRMADA** | `users.ts:14-20` e `auditLogs.ts:12-13` — `authorize('admin')` em 9/9 | P |
| BR-IAM-014 | **CONFIRMADA** (conflito real) | proibição em `DeactivateUserUseCase.ts:32`; contorno em `UpdateUserEntity.ts:69` (`active` na allowlist do PUT) | P |
| BR-IAM-015 | **CONFIRMADA** (assimetria real) | `CreateUserUseCase.ts:43-45` valida `VALID_ROLES`; `RegisterUserUseCase` não (T-02) | P+C |
| BR-IAM-016 | **CONFIRMADA** | `UpdateUserEntity.ts:49-51` — presença de `password` rejeita | P |
| BR-IAM-017 | **CONFIRMADA** | `models/User.ts:62-67` — `unique: true` + `isEmail` | P |
| BR-IAM-018 | **CONFIRMADA** | `AssignAccessProfileUseCase.ts:69` (substitui) + `:61-65` (inativo não atribui) | P |
| BR-IAM-019 | **CONFIRMADA** | `middlewares/auth.ts:226-229` — curto-circuito de `admin` | P |
| BR-IAM-020 | **CONFIRMADA** | `middlewares/auth.ts:246-256` — `NO_ACCESS_PROFILE` | P |
| BR-IAM-021 | **CONFIRMADA** (conflito real) | `accessModules.ts:248` — `'operate' \| 'approve'`: **2 níveis implementados** | P |
| BR-IAM-022 | **CONFIRMADA** (conflito real) | 2ª trava inexistente: `middlewares/auth.ts:272-282` decide só por `level`; log falso em `AssignAccessProfileUseCase.ts:78` | P |
| BR-IAM-023 | **CONFIRMADA** | `DeactivateAccessProfileUseCase.ts:51-57` + `AssignAccessProfileUseCase.ts:61-65` | P |
| BR-IAM-024 | **CONFIRMADA** (âncora±) | nome único em `CreateAccessProfileUseCase.ts:55-58`; módulo válido em `:53`. `:48` é o `trim` | P |
| BR-IAM-025 | **CONFIRMADA** | `UpdateAccessProfileUseCase.ts:78-86` — `oldValues`+`newValues` completos | P |
| BR-IAM-026 | **CONFIRMADA** | `authController.ts:87-97` — **nenhum** `logAction` no corpo inteiro | P |
| BR-IAM-027 | **CONFIRMADA** | `middlewares/auth.ts:231-241` — `access_denied` nas 3 negativas | P |
| BR-IAM-028 | **CONFIRMADA** | `auditLogs.ts:12-13` — só `GET`; nenhuma rota de UPDATE/DELETE | P |
| BR-IAM-029 | **CONFIRMADA** | `auditLogService.ts:135-136` + `:164-171` (downgrade com marcador) | P |
| BR-IAM-030 | **CONFIRMADA** | `auditLogService.ts:92-98,186-213` — nunca propaga erro ao chamador | P |
| BR-IAM-031 | **CONFIRMADA** (ampliada) | varredura `logAction\|auditLogService` em `modules/items` = **0 ocorrências** | N |
| BR-IAM-032 | **CONFIRMADA** | `models/User.ts:153-159` — remove `password`, hash e expiração do reset | P |
| BR-IAM-033 | **CONFIRMADA** | `seeds.ts:128,138,142-148` — admin semeado por `ADMIN_SEED_PASSWORD` | P |
| BR-IAM-034 | **CONFIRMADA** (ausência) | varredura `retention\|expurgo\|purge` em `modules/auditLogs` = **0** | N |
| BR-IAM-035 | **CONFIRMADA** | `GetMyPermissionsUseCase.ts:36-49` — reusa `req.user.permissions` | P |
| BR-IAM-036 | **CONFIRMADA** | `ListAuditLogsUseCase.ts:42` — filtros sem `user_id` e sem `success` | P |
| BR-IAM-037 | **CONFIRMADA** | `auditLogService.ts:113-116` — norma "depois do commit", fora de transação | P |
| BR-IAM-038 | **CONFIRMADA** (ausência) | varredura `failed_login_attempts\|locked_until\|password_expires` em `src/` = 1 falso positivo (`resetPasswordExpiresAt`) | N |
| BR-IAM-039 | **CONFIRMADA** (obsoleta) | `AccessProfilePermission.ts:17-19` promete 2ª trava que `middlewares/auth.ts:272-282` **não tem** | P |

### 3.2 cadastro-suprimentos — 33 regras · 30 CONFIRMADAS · 2 DIVERGENTES · 1 CONFIRMADA (ausência)

| BR-ID | Veredito T-14 | Âncora decidida | Base |
|---|---|---|---|
| BR-SUP-001 | **CONFIRMADA** | `purchases/domain/constants.ts:74` — `PURCHASE_APPROVAL_THRESHOLD_DIRECTOR = 500000` | P |
| BR-SUP-002 | **CONFIRMADA** | `purchases/domain/constants.ts:169` — `if (origin === 'import') return ['diretor']` | P |
| BR-SUP-003 | **CONFIRMADA** | `purchases/domain/constants.ts:107-114` — `resolvePurchaseOrigin`, OU escalation-only | P |
| BR-SUP-004 | **CONFIRMADA** | `purchases/domain/constants.ts:185-189` — `total_amount + freight_value`, sem tributo | P |
| BR-SUP-005 | **CONFIRMADA** | `CreatePurchaseUseCase.ts:70-84` — 422 `G11-ORIGIN-SUPPLIER-MISMATCH` | P |
| BR-SUP-006 | **CONFIRMADA** | `UpdatePurchaseUseCase.ts:79-87` — congela `APPROVAL_RELEVANT_FIELDS` (`:20`) só em `approved` | P |
| BR-SUP-007 | **CONFIRMADA** (conflito real) | `segregationOfDuties.ts:75`; a frouxidão declarada está em `:116-117` (solicitante desconhecido ⇒ não bloqueia) | P |
| BR-SUP-008 | **CONFIRMADA** | `purchases.ts:48` — `authorizeModule('diretor')` **sem** `requiredLevel` ⇒ default `'operate'` | P |
| BR-SUP-009 | **CONFIRMADA** | `purchaseController.ts:51-55`, com `:53` `admin ⇒ ['diretor']` | P |
| BR-SUP-010 | **CONFIRMADA** | `ChangePurchaseRequisitionStatusUseCase.ts:62-65` — `VALID_TRANSITIONS` sem faixa de valor | P |
| BR-SUP-011 | **CONFIRMADA** (conflito real) | `rfqValidators.ts:39` — `supplier_ids: z.array(...).min(1)` | P |
| BR-SUP-012 | **CONFIRMADA** (com precisão) | `AwardRfqUseCase.ts:108-124` — nenhum critério de adjudicação e nenhum registro de aprovação. Ressalva própria: a **rota** exige `compras:approve` (`rfqs.ts:20`, T-10) — a ausência é de critério e de registro, não de RBAC | P+C |
| BR-SUP-013 | **CONFIRMADA** | `ConvertRequisitionToPurchaseOrdersUseCase.ts:248-263` e `AwardRfqUseCase.ts:277-292` sem `origin` ⇒ DEFAULT `national` (T-10-03) | C |
| BR-SUP-014 | **CONFIRMADA** | `comex/domain/constants.ts:44,54,57` — gate `draft → shipped` | P |
| BR-SUP-015 | **CONFIRMADA** | `comex/domain/constants.ts:77-82` — `MONETARY_FIELDS_FROZEN_ON_SHIPMENT` | P |
| **BR-SUP-016** | **DIVERGENTE** | O `fail-open` **existe** literalmente (`purchases/domain/constants.ts:171-174`: `Number.isNaN ⇒ []`), mas é **inalcançável** pelos 3 chamadores de produção — `ApprovePurchaseUseCase.ts:103`, `ChangePurchaseStatusUseCase.ts:200` e `ListPurchaseApprovalsUseCase.ts:58` passam sempre `purchaseApprovalValue(...)`, que já neutraliza `NaN` para 0 (`:186-188`). O `UNKNOWN` do catálogo se resolve **contra** a exploração; o gêmeo do Jurídico **não** tem essa proteção → T14-F02 | P |
| BR-CAD-001 | **CONFIRMADA** | `CreateSupplierUseCase.ts:31-36` — valida, normaliza (`replace(/[^\d]/g,'')`), `ConflictError` na colisão | P |
| BR-CAD-002 | **CONFIRMADA** quanto ao fato | `CreateSupplierUseCase.ts:31` aplica `Validators.validateDocument` (CNPJ brasileiro) **incondicionalmente**, inclusive a fornecedor estrangeiro. O `UNKNOWN` é de intenção, não de fato — decisão humana | P |
| BR-CAD-003 | **CONFIRMADA** | `supplierValidators.ts:34-37` — `is_foreign: z.boolean({...})` obrigatório na criação | P |
| BR-CAD-004 | **CONFIRMADA** | `UpdateSupplierUseCase.ts:53-64` — desmarcar `is_foreign` ⇒ 422 | P |
| BR-CAD-005 | **CONFIRMADA** (pendência aberta) | varredura por backfill de `is_foreign` em `src/` = **0**; nada reconcilia o legado | N |
| BR-CAD-006 | **CONFIRMADA** | `UpdateSupplierUseCase.ts:10-15` — `cnpj` fora da `ALLOWED_FIELDS` | P |
| BR-CAD-007 | **CONFIRMADA** | `CreateClientUseCase.ts:34-39` — `validateDocument` polimórfico + normalização | P |
| BR-CAD-008 | **CONFIRMADA** | `CreateItemUseCase.ts:28-31` — `findByCode(String(codigo))`, comparação exata; sensibilidade a caixa provada por T-01 (`AUD-T01-11`, UNIQUE sem `lower()`) | P+C |
| **BR-CAD-009** | **DIVERGENTE** | A regra existe e é transacional (`CreateItemUseCase.ts:33` abre `t`; espelho em `:51`; commit `:53`) — **mas a declaração "para todos os itens" é falsa**: `itemProductMirrorService.ts:92,153` devolve `null` em silêncio para item sem código ou de tipo não mapeado (T-05, regra M-7). A BR não registra a exceção, e o sentido inverso (produto ⇒ item) declarado no mesmo serviço **nunca é chamado** (T-05-01) | P+C |
| BR-CAD-010 | **CONFIRMADA** | `bomService.ts:203-208` — `product_type !== 'finished'` ⇒ 400 | P |
| BR-CAD-011 | **CONFIRMADA** | `bomService.ts:226-234` (auto-ref) + `:261-278` (ciclo multinível, `hasProductPathBetween`) | P |
| BR-CAD-012 | **CONFIRMADA** (âncora±) | imposição em `bomService.ts:286-298` (409 `G1-BOM-REV-DUP`); `:281` é a resolução do rótulo. Ressalva de T-11-F05: a guarda roda **fora** da transação aberta em `:308` | P+C |
| BR-CAD-013 | **CONFIRMADA** | `bomService.ts:308-322` — `superseded` e `create(status:'active')` na **mesma** transação | P |
| BR-CAD-014 | **CONFIRMADA** (conflito real) | `bomService.ts:314-322` — a BOM nasce `status: 'active'`, sem nenhum ato de aprovação | P |
| BR-CAD-015 | **CONFIRMADA** | `BOMEntity.ts:4` — `MAX_BOM_LEVEL = 10`; gêmeo em `bomService.ts:148` (`MAX_BOM_DEPTH = 10`) | P |
| BR-CAD-016 | **CONFIRMADA** | `bomService.ts:51` (`NON_ENGINEERING_ITEM_TYPES`) aplicado a pai (`:216`) e componente (`:243`) | P |
| BR-CAD-017 | **CONFIRMADA** | `bomService.ts:121-129` (contrato) e `:505` (decisão de parada) | P |

### 3.3 planejamento-producao — 26 regras · 21 CONFIRMADAS · 5 NÃO LOCALIZÁVEIS

| BR-ID | Veredito T-14 | Âncora decidida | Base |
|---|---|---|---|
| BR-PP-001 | **CONFIRMADA** | `ProductionOrderEntity.ts:60-67` — matriz 6×6 completa | P |
| BR-PP-002 | **CONFIRMADA** | `productionTrackingRules.ts:394-398` — `assertOrderCanStart` (G6-START-*) | P |
| BR-PP-003 | **CONFIRMADA** | `ChangeProductionOrderStatusUseCase.ts:101` (T-11 I-01) | C |
| BR-PP-004 | **CONFIRMADA** | `ChangeProductionOrderStatusUseCase.ts:687-701` (T-11 I-07) | C |
| BR-PP-005 | **CONFIRMADA** | `productionTrackingRules.ts:80-85` — catálogo `G4-*` de 6 códigos | P |
| BR-PP-006 | **CONFIRMADA** | `ChangeProductionOrderStatusUseCase.ts:389-396,413-423` (T-11 I-05/I-06) | C |
| BR-PP-007 | **CONFIRMADA** | `ProductionOrderEntity.ts:187-204` — exige `allow_overproduction`, **sem teto** | P |
| BR-PP-008 | **CONFIRMADA** | `ChangeProductionOrderStatusUseCase.ts:774`; FEFO em `:870-883` | C+P |
| BR-PP-009 | **CONFIRMADA** | `ChangeProductionOrderStatusUseCase.ts:565` (T-11 §4) | C |
| BR-PP-010 | **CONFIRMADA** (com complemento) | `mrpEngine.ts:221-230` — agregação por item/bucket confirmada. **Complemento próprio:** a BR não registra que não existe netagem **por nível** (T11-F01) | P |
| **BR-PP-011** | **NÃO LOCALIZÁVEL** | Arquivo existe (`mrp/application/use-cases/support/allocatePlanByOrigin.ts`); a linha `:139` **não foi aberta** por esta trilha nem por T-11. Falta: leitura do rateio proporcional | — |
| BR-PP-012 | **CONFIRMADA** | `SequelizeItemRepository.ts:79-88` (G7) e `:103-105` (clamp `planningQuantity`) | P |
| BR-PP-013 | **CONFIRMADA** (conflito real) | `SequelizeItemRepository.ts:109` **e** `:110` recebem ambos `liveProduct.min_quantity` | P |
| **BR-PP-014** | **NÃO LOCALIZÁVEL** | `createRequisitionFromPlannedOrders.ts:32` não aberto. Falta: leitura do mecanismo de idempotência da conversão | — |
| BR-PP-015 | **CONFIRMADA** (ampliada) | 4 implementações, 2 respostas, método da entidade morto (T11-F04, `ProductionOrderEntity.ts:139-145` sem call site) | C |
| BR-PP-016 | **CONFIRMADA** | `bomService.ts:489-505` — `is_phantom` decide a parada | P |
| BR-PP-016b | **CONFIRMADA — fundamento substituído** | `mrpEngine.ts:164` filtra **só** `active`; `is_phantom` não existe no tipo (`:32-43`) nem na projeção. **Acolho T11-OBS-01:** a confiança MEDIUM do passo 26 apoiava-se na premissa (refutada) de tabelas distintas; a divergência é **provada**, não possível | P+C |
| BR-PP-017 | **CONFIRMADA** | 3 camadas: `bomService.ts:226`, `:261`, `:459-464`. `maxDepth=10` segue sem fonte de negócio (UNKNOWN mantido) | P |
| BR-PP-018 | **CONFIRMADA** | `masterProduction/domain/constants.ts:206-211` — `PLAN_TRANSITIONS` | P |
| BR-PP-019 | **CONFIRMADA** | `ReleaseMasterProductionPlanUseCase.ts:120-127,185-239` (T-11 I-23) | C |
| **BR-PP-020** | **NÃO LOCALIZÁVEL** | `masterProduction/domain/constants.ts:141` não aberto (li `:200-223`). Falta: a fórmula da "conta do Plano Mestre" | — |
| BR-PP-021 | **CONFIRMADA** | `productionRouteRules.ts:30-32` — `G5-ROUTE-NOT-DRAFT` | P |
| BR-PP-022 | **CONFIRMADA** (lacuna real) | `productionOrders.ts:23-33`; `:32` põe liberar/iniciar/concluir/cancelar sob um único `producao:operate` | P |
| **BR-PP-023** | **NÃO LOCALIZÁVEL** | `CreateAcousticTestUseCase.ts:84` não aberto. Falta: `passed` calculado e abertura de RNC | — |
| **BR-PP-024** | **NÃO LOCALIZÁVEL** | `ReleaseDrawingUseCase.ts:33` não aberto | — |
| BR-PP-025 | **CONFIRMADA** (ausência) | varredura `CRP\|capacity_requirement\|capacidade finita` em `src/` = 3 ocorrências, todas em `WorkCenter*` (cadastro). **Não existe motor de CRP** | N |

### 3.4 qualidade-estoque — 13 regras · 9 CONFIRMADAS · 2 DIVERGENTES · 2 NÃO LOCALIZÁVEIS

| BR-ID | Veredito T-14 | Âncora decidida | Base |
|---|---|---|---|
| BR-QE-001 | **CONFIRMADA** | `quality/domain/constants.ts:127-154` — `decideLotRelease`: inspeção existe **e** aprovada **e** posterior ao bloqueio | P |
| BR-QE-002 | **CONFIRMADA** | `CreateQualityInspectionUseCase.ts:51` (`MIN_ACCEPTANCE_CRITERIA_LENGTH = 3`) e `:54` (concessão ≥ 10) | P |
| BR-QE-003 | **CONFIRMADA** | `CreateQualityInspectionUseCase.ts:164-184` — reprovação abre RNC `severity:'major'` | P |
| BR-QE-004 | **CONFIRMADA** (conflito real) | `BlockLotUseCase.ts:26` — `['quarantine','available']` | P |
| BR-QE-005 | **CONFIRMADA** | `quarantineBalanceService.ts:73` — `['quarantine','blocked']`; exceção mobile confirmada em BR-QE-011 | P |
| BR-QE-006 | **CONFIRMADA** | `materialReceiptService.ts:165-179` (T-06 §6) | C |
| BR-QE-007 | **CONFIRMADA** (conflito real, **medido por mim**) | Definição A: `saleLotService.ts:153-156` — `String(expires_at).slice(0,10) < today`. Definição B: `ChangeProductionOrderStatusUseCase.ts:851` — `new Date(expires_at) < new Date()`, que **reprova lote que vence hoje**, enquanto a própria query FEFO do mesmo arquivo (`:875`) o **aceita** (`expires_at >= today`). Contradição interna ao mesmo use case | P |
| **BR-QE-008** | **DIVERGENTE** | A máquina de estados existe (`ApproveInventoryCountUseCase.ts:50-115`), mas o catálogo a descreve **como se estivesse guardada em todas as transições**. `submit` não tem transação, lock nem escrita condicional (T-06 `AUD-INTEG-04`) — a BR precisa registrar a assimetria `submit` × `approve`/`reject` | C |
| BR-QE-009 | **CONFIRMADA** | `CreateNonConformityUseCase.ts:113-128` | P |
| **BR-QE-010** | **NÃO LOCALIZÁVEL** | `SupplierReturnHandler.ts:27` não aberto | — |
| **BR-QE-011** | **DIVERGENTE (por omissão de escopo)** | O fato é **CONFIRMADO** por leitura própria: `ScanItemUseCase.ts:45,67-74` chama `InventoryService.adjust` com **6 dos 8 argumentos** — sem `warehouseId`, sem `itemId`; e `:63-64` valida contra `product.quantity` **bruto**, ignorando o saldo retido de `quarantineBalanceService.ts:73`. **Divergência:** a BR restringe o defeito ao mobile; `RegisterProductMovementUseCase.ts:60-67` (`POST /api/products/movements`) tem o mesmo (T-06 D-4) | P+C |
| BR-QE-012 | **CONFIRMADA** (causa ampliada) | `GetLotTraceabilityUseCase.ts:28`; causa adicional: `SequelizeTraceabilityRepository.ts:107-108` lê campos que nunca são gravados (T-06 `AUD-INTEG-01`) | C |
| **BR-QE-013** | **NÃO LOCALIZÁVEL** | `DeactivateAssetUseCase.ts:36` não aberto | — |

### 3.5 comercial-financeiro — 29 regras · 28 CONFIRMADAS · 1 NÃO IMPLEMENTADA (§3.7)

| BR-ID | Veredito T-14 | Âncora decidida | Base |
|---|---|---|---|
| BR-COM-001 | **CONFIRMADA** | `ChangeSaleStatusUseCase.ts:12-30` — `VALID_TRANSITIONS` | P |
| BR-COM-002 | **CONFIRMADA** | `ChangeSaleStatusUseCase.ts:125-132` — 422 dedicado | P |
| BR-COM-003 | **CONFIRMADA** | `ChangeSaleStatusUseCase.ts:159-170` — `nfe_status !== 'authorized'` no instante | P |
| BR-COM-004 | **CONFIRMADA** | `ChangeSaleStatusUseCase.ts:28` (`shipped: []`) + `:143-150` (422 dedicado) | P |
| BR-COM-005 | **CONFIRMADA** (conflito real) | A dupla trava documentada não existe: `middlewares/auth.ts:272-282` decide só por `level`, sem segunda dimensão | P |
| BR-COM-006 | **CONFIRMADA** | `ChangeSaleStatusUseCase.ts:223-232` (reserva na confirmação); recebível só na NF-e (G13, `:39-40`) | P |
| BR-COM-007 | **CONFIRMADA** | `EditSaleItemsUseCase.ts:73-80` — `['quote','confirmed']` | P |
| BR-COM-008 | **CONFIRMADA** | `CreateCustomerPriceUseCase.ts:8-12` — os use cases de venda não leem a tabela | P |
| BR-COM-009 | **CONFIRMADA** | `CreateSaleUseCase.ts:143-146` — único limite é `desconto ≤ total`; **sem alçada, sem percentual máximo** | P |
| BR-COM-010 | **CONFIRMADA** | `IssueSaleNfeUseCase.ts:202-214` recalcula `totalAmount` por `qty × unit_price`; **varredura própria de `discount` no arquivo inteiro = 0 ocorrências** | P+N |
| BR-COM-011 | **CONFIRMADA** (âncora±) | imposição em `CreateCustomerPriceUseCase.ts:60-65` (`_findOverlap` ⇒ 409); `:56` é a validação de intervalo | P |
| BR-COM-012 | **CONFIRMADA** | `UpdateServiceOrderUseCase.ts:11-24` — `status` é campo livre da allowlist; nenhuma máquina de estados | P |
| BR-COM-013 | **CONFIRMADA** | `CreateServiceOrderUseCase.ts:45` — `OS-${Date.now()}` | P |
| BR-FIS-001 | **CONFIRMADA** (conflito real) | `TaxCalculationService.ts:55-59` — `ICMS_INTERNAL_RATE`, 27 UFs, valores não-padrão (ex.: PE 20,5; RO 19,5) | P |
| BR-FIS-002 | **CONFIRMADA** | `TaxCalculationService.ts:63,69-74` — 7%/12%, sem 4% de importado | P |
| BR-FIS-003 | **CONFIRMADA** (conflito real) | `TaxCalculationService.ts:119-124` — `ipiAliquot = 0`, CST 53 fixo | P |
| BR-FIS-004 | **CONFIRMADA** (ausência) | `TaxCalculationService.ts:87-170` — nenhuma linha de DIFAL na função inteira | P |
| BR-FIS-005 | **CONFIRMADA** (ausência) | varredura de `ST`/substituição no arquivo íntegro (177 linhas) = **0** | P+N |
| BR-FIS-006 | **CONFIRMADA** | `TaxCalculationService.ts:88-95` — CFOP 5101/6101/5102/6102 | P |
| BR-FIS-007 | **CONFIRMADA** | `TaxCalculationService.ts:128-149` — CRT 1/2/3 | P |
| BR-FIS-008 | **CONFIRMADA** (conflito real) | `IssueSaleNfeUseCase.ts:113-115` — `confirmed` **ou** `partially_invoiced` | P |
| BR-FIS-009 | **CONFIRMADA** | `NfeProviderFactory.ts:16-25` — `default: return new MockNfeProvider()` | P |
| BR-FIS-010 | **CONFIRMADA** | `CancelSaleNfeUseCase.ts:88-90` — `reason.trim().length < 15` | P |
| BR-CTB-001 | **CONFIRMADA** | `ReverseEntryUseCase.ts:42-49` — única condição é `status === 'posted'`; `:63-65` grava `created_by = approved_by = userId`; estorno nasce `posted` (`:62`) ⇒ estornável em cadeia | P |
| BR-CTB-002 | **CONFIRMADA** | `PostEntryUseCase.ts:53,74-82` (T-07 §3.3) | C |
| BR-CTR-001 | **CONFIRMADA** | `DeleteBudgetLineUseCase.ts:27`; `GetBudgetVsActualReportUseCase.ts:92-96` informativo (T-07) | C |
| BR-TES-001 | **CONFIRMADA** (3 lacunas) | `SettleOperationUseCase.ts:30` — grava só o status (T-07 §3.3) | C |
| BR-FIN-001 | **CONFIRMADA** (+1 lacuna nova) | `ReceivePaymentUseCase.ts:39`; T-07 acrescenta 5ª ausência (efeito na projeção de caixa, `AUD-SERVICE-1`) | C |
| BR-FIN-002 | **CONFIRMADA** | `reconciliationRules.ts:16` — `MATCH_TOLERANCE_CENTS`, constante única | C |

### 3.6 pessoas-governanca — 24 regras · 16 CONFIRMADAS · 8 NÃO LOCALIZÁVEIS

| BR-ID | Veredito T-14 | Âncora decidida | Base |
|---|---|---|---|
| BR-RH-D01 | **CONFIRMADA** | `rh.ts:60-70` — `requiredLevel` derivado de `req.body.decision` (`:68`) | P |
| BR-RH-D02 | **CONFIRMADA** | `DecideEmployeeContractUseCase.ts:100-107` × ausência de coluna de destino (T-12 `T12-L01`) | C |
| **BR-RH-D03** | **NÃO LOCALIZÁVEL** | `CreateTerminationProcessUseCase.ts:51` não aberto (T-12 leu `:62-65`, outro trecho). Falta: os "parâmetros fixos" | — |
| BR-RH-D04 | **CONFIRMADA** | `experienceContractRules.ts:12,22-30` — 90 dias corridos, CLT art. 445 §único | P |
| BR-RH-D05 | **CONFIRMADA** | `experienceContractRules.ts:36-50` — rejeita a 2ª prorrogação em vez de converter; **decisão de risco declarada no próprio código** | P |
| BR-RH-D06 | **CONFIRMADA** | `rhSensitiveFields.ts:61`; ligado nas 5 rotas de afastamento (T-12) — com o docstring falso registrado em `T12-L04` | C |
| BR-JUR-003 | **CONFIRMADA** (conflito real) | `juridico/domain/constants.ts:23,26,38-47` — 50.000/300.000 hard-coded, 2 faixas | P |
| **BR-JUR-D07** | **NÃO LOCALIZÁVEL** | `contractController.ts:42` não aberto | — |
| **BR-JUR-D08** | **NÃO LOCALIZÁVEL** | `ActivateContractUseCase.ts:53` não aberto (li `:61-65` por varredura) | — |
| **BR-JUR-D09** | **NÃO LOCALIZÁVEL** | `CreateContractAddendumUseCase.ts:59` não aberto | — |
| **BR-JUR-D10** | **NÃO LOCALIZÁVEL** | `ActivateContractUseCase.ts:75` não aberto | — |
| BR-JUR-D11 | **CONFIRMADA** | `CreateDataSubjectRequestUseCase.ts:39-41` — `+15` dias corridos, **uniforme para os 8 tipos** (T-12 `T12-M05` adjudica a generalização) | P |
| BR-JUR-D12 | **CONFIRMADA** (zero enforcement) | `JurLgpdProcessingActivity.ts:27`; varredura de `retention_period` = 7 ocorrências, **zero leitores com efeito**; nenhum agendador em `src/` (T-12 `T12-M02`) | C |
| BR-JUR-D13 | **CONFIRMADA** | `juridico.ts:83,163-166,172-173` — resolver em `operate`, rejeitar em `approve` (T-12 `T12-M06`) | C |
| BR-SST-D14 | **CONFIRMADA** (simplificação real) | `legalDeadlineService.ts:30-41` — `obito` ⇒ mesmo dia; demais ⇒ +1 dia pulando **só fim de semana**, sem feriado | P |
| BR-SST-D15 | **CONFIRMADA** | `EmitCatUseCase.ts:48`; `:60` deriva `tipo` do body sem confronto com `acidente.gravidade`, lida na linha seguinte `:61` só para o prazo | P |
| **BR-SST-D16** | **NÃO LOCALIZÁVEL** | `CloseAccidentUseCase.ts` — **o próprio catálogo publica a âncora "sem linha na fonte"**. Não é omissão minha: é âncora não rastreável (T14-F01) | — |
| BR-TI-D17 | **CONFIRMADA** | `approverEligibilityService.ts:26-35` — admin **ou** `ti:approve` **ou** gestor do departamento | P |
| **BR-TI-014** | **NÃO LOCALIZÁVEL** | `RevealLicenseKeyUseCase.ts:32` não aberto | — |
| BR-DIR-D18 | **CONFIRMADA** | `riskScore.ts:18-23` — `LEVEL_WEIGHT`; score é derivado, não aceito do payload | P |
| BR-MKT-D19 | **CONFIRMADA** (conflito real) | `marketing/domain/constants.ts:15` (90 dias) e `:17-18` — SLA em **dias corridos**, com a divergência do requisito ("dias úteis") **declarada no próprio comentário** | P |
| **BR-FAC-D20** | **NÃO LOCALIZÁVEL** | `TripUseCases.ts:87` não aberto | — |
| BR-IMP-D21 | **CONFIRMADA** (âncora±) | dupla exigência em `catalogImport.ts:34-35` (`produtos:operate` **e** `bom:operate`); `:27` é a primeira rota de modelo, em `produtos` puro | P |
| BR-WHK-D22 | **CONFIRMADA** | `webhooks.ts:6-13` — as 2 rotas montadas **sem** `authenticate`/`authorize` | P |

### 3.7 regra por decisão humana — 1 regra · 1 NÃO IMPLEMENTADA

| BR-ID | Veredito T-14 | Fundamento |
|---|---|---|
| **BR-FIN-003** | **NÃO IMPLEMENTADA** | A regra é norma de negócio decidida pelo dono (APR-2026-021 Parte B item 1) e **exige** uma classe de solução: "chave de negócio inequívoca". Ela **não existe** no código: varredura de `idempot*` em `server/src` retorna 34 arquivos, **nenhum** em `financial`/`treasury`/`accounting`/`budget` (T-07 §3.1). `accounts_receivable` tem coluna `installment` populada (`saleReceivableService.ts:210-221`), e o lado **pagável não tem equivalente**. Registro técnico obrigatório: a **proibição** ("`valor + título` como identificador isolado") não está sendo *violada* — porque não há mecanismo de identificação algum. É a **exigência** que está descumprida. Esta é a **única** regra do catálogo cuja origem é decisão humana, e é a única sem implementação. Ver T14-F03 |

---

## 4. Reconciliação de contagem com o catálogo (verificação própria)

Recontei as fichas por cluster contra o §4.1 do `BR_CATALOG.md`: 39 + 33 + 26 + 13 + 29 + 24 + 1 = **165**. Confere. Os 20 prefixos da §2.1 somam 165. Confere. Não encontrei BR-ID duplicado nem ausente na travessia linha a linha — **§5.1 do catálogo ("nenhuma colisão") é confirmada por conferência própria**, e as anomalias de forma da §5.2 (`BR-PP-016b`, série `D<nn>`, `BR-JUR-003`/`BR-TI-014`) existem exatamente como descritas nos arquivos que li.

---

## 5. FINDINGS — `T14-Fnn`

Todos emitidos como **`PROPOSED`** (Regra 22). Severidade e confiança declaradas separadamente. Nenhum é confirmado, nenhum é fechado por mim.

### T14-F01 — MEDIUM · CONFIRMED · `PROPOSED` — Três BR-ID publicam âncora não rastreável, quebrando o padrão de citação do próprio catálogo
`BR_CATALOG.md:169` (**BR-SUP-013** — "`AwardRfqUseCase.ts` (default, sem linha na fonte)"), `:267` (**BR-FIS-005** — "`TaxCalculationService.ts` (ausência, sem linha na fonte)") e `:302` (**BR-SST-D16** — "`CloseAccidentUseCase.ts` (sem linha na fonte)"). O §3 do catálogo declara como norma a forma curta `Arquivo.ts:linha`; essas três a descumprem.
**Impacto:** uma BR sem linha não é reauditável nem reteste-ável — quem for validar precisa redescobrir a regra, que é exatamente o custo que o BR-ID existe para eliminar. Para BR-SST-D16 isso **impediu esta trilha de decidir status** (é 1 dos 15 `NÃO LOCALIZÁVEL`). **Não corrijo** (Regra 2): o catálogo é objeto auditado.
**Âncora:** `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md:169,267,302`.

### T14-F02 — MEDIUM · CONFIRMED · `PROPOSED` — O `fail-open` de alçada é código morto em Compras e **vivo** no Jurídico: a mesma função, com e sem rede de proteção
Achado **novo**, não catalogado. `purchases/domain/constants.ts:171-174` e `juridico/domain/constants.ts:39-42` são a mesma escrita: `Number.isNaN(numericValue) ⇒ return []` — valor não numérico dispensa a alçada.
- **Em Compras a brecha é inalcançável:** os 3 chamadores (`ApprovePurchaseUseCase.ts:103`, `ChangePurchaseStatusUseCase.ts:200`, `ListPurchaseApprovalsUseCase.ts:58`) passam sempre `purchaseApprovalValue(purchase)`, que já converte `NaN → 0` (`:186-188`).
- **No Jurídico não existe wrapper:** `ActivateContractUseCase.ts:62`, `ApproveContractUseCase.ts:77` e `ListContractApprovalsUseCase.ts:53` passam **`contract.value` cru**. Qualquer caminho que produza um `value` não numérico faz a ativação de contrato dispensar diretor **e** financeiro, silenciosamente.
**Categoria G3 tocada:** autorização e contratos. **Confiança da *existência*: CONFIRMED** (estática). **Confiança da *exploração*: não afirmada** — depende do domínio efetivo de `jur_contracts.value`, que `APR-2026-016` me impede de observar → `DYN-T14-01`.
**Consequência para o catálogo:** o status `UNKNOWN` de **BR-SUP-016** resolve-se **contra** a exploração (por isso `DIVERGENTE`), e a mesma condição **não tem BR alguma** do lado do Jurídico.

### T14-F03 — HIGH · CONFIRMED · `PROPOSED` — A única regra do catálogo decidida por humano é a única sem implementação
**BR-FIN-003** é o único registro de origem "decisão do dono" (§3.7). Ela exige chave de negócio inequívoca para identificar parcela; nada em `financial`/`treasury`/`accounting`/`budget` a implementa (varredura `idempot*` = 0 nesses módulos; `ReceivePaymentUseCase.ts:39-68` opera por acumulador escalar `amount_paid`, sem registro de baixa individual).
**Por que HIGH e não MEDIUM:** a regra é **restrição de projeto** sobre a remediação do `FIND-ERP-001` (CASE-001, CRITICAL, em curso). Remediar rejeitando nova baixa sobre título `partial` **violaria** BR-FIN-003 — a segunda parcela de mesmo valor é legítima por decisão registrada do dono. Um caso de remediação aberto contra uma norma não implementada e não verificada é risco de correção que quebra a regra.
**Registro adicional (fato observado, não desenho de solução — Regra 6):** o padrão exigido **já existe no repositório**, em `ReceivePurchaseItemsUseCase.ts:327-331` (dedup por `(purchase_id, invoice_number)` dentro da transação). Não digo que deva ser copiado; digo que a classe de solução não é desconhecida da casa.
**Escalonamento obrigatório:** `vericore-finding-validator` (Regra 22) e SanaCore/CASE-001 via director.

### T14-F04 — LOW · CONFIRMED — Cinco âncoras apontam para a linha vizinha da imposição
`BR-IAM-003` (`User.ts:127` é comentário; imposição `:129-131`), `BR-IAM-024` (`:48` é o `trim`; unicidade `:55-58`), `BR-CAD-012` (`:281` resolve o rótulo; a recusa está em `:286-298`), `BR-COM-011` (`:56` valida o intervalo; a sobreposição está em `:60-65`), `BR-IMP-D21` (`:27` é rota de modelo em `produtos` puro; a dupla exigência está em `:34-35`).
**Severidade LOW porque nenhuma delas invalida a regra** — todas foram localizadas na primeira leitura do arquivo. É defeito de precisão de âncora, e é registrado porque `IN-08` e o precedente de T-05 (`§3`, correção da âncora do BR-CAD-009 no passo 29) já mostraram que âncora errada sobrevive por cópia.

### T14-F05 — HIGH · CONFIRMED · `PROPOSED` — Consolidação: **≥ 26 regras de negócio implementadas e vivas não têm BR-ID**, contra 165 catalogadas
Esta trilha é o ponto de convergência dos handoffs de cobertura de BR de W1/W2. Consolidado, com o titular de origem citado (evidência de cada um, não minha reafirmação):

| Origem | Regras implementadas sem BR-ID | Âncora do titular |
|---|---|---|
| T-05 (RA-08) | **13** — 7 de `itemProductMirrorService.ts` (M-2 a M-8) e 6 de `fixedAssetReceiptService.ts` (F-1 a F-6, incluindo **criação de bem patrimonial com valor contábil**) | T-05 §2 |
| T-12 | **≥ 9** — `terminationRules.ts:33,55,87` (CLT 477 §6º e Lei 12.506/2011), gate de ASO admissional/demissional, checklist de ativos, `vacationRules.ts`, estabilidade CIPA, matriz de EPI/NR-6, `requireSstOrRh` | T-12 `T12-M09` |
| T-06 | **1** — direção real do movimento (`in`/`out`) não persistida (`inventoryService.ts:327-368`) | T-06 `AUD-INTEG-02` |
| T-01 | **3** — autorização de cadastro auxiliar; carga de saldo inicial via `POST /api/items`; propagação de inativação | T-01 §7 |
| T-07 | superfície inteira sem BR: conciliação OFX, dedup de extrato, projeção de fluxo de caixa, plano de contas, balancete, CNAB (8 endpoints) | T-07 §3.3 |
| **T-14 (próprio)** | **1** — o `fail-open` de alçada do Jurídico (T14-F02) | esta trilha |

**Adjudicação de processo (meu mandato):** o padrão é específico e repetido — **a regra que atravessa dois módulos é a que fica sem BR-ID**, exatamente como T-11 mediu que a regra que atravessa dois módulos é a que fica sem dono de código. As 14 regras de T-05 nascem na fronteira `items`↔`products` e `purchases`↔`assets`; as de T-12 nascem na fronteira `rh`↔`sst`↔lei. O catálogo é forte onde o módulo é fechado e cego onde o processo atravessa.
**Isto é finding, não silêncio**, por RA-08 (`AUDIT_PLAN.md:140`).

### T14-F06 — MEDIUM · CONFIRMED — Duas BRs de qualidade/estoque estão **incompletas em direção perigosa**
- **BR-QE-008** descreve a máquina de estados da contagem cíclica sem ressalva; `submit` não tem transação, lock nem escrita condicional (T-06 `AUD-INTEG-04`, com interleaving demonstrado que reaplica ajuste de estoque em dobro). Uma BR que descreve como guardada uma transição desguardada **induz o remediador a não olhar ali**.
- **BR-QE-011** restringe ao mobile um defeito que também existe em `POST /api/products/movements` (`RegisterProductMovementUseCase.ts:60-67`). Remediação fiel à BR deixa uma superfície viva.
**Categoria G3:** movimentação de estoque — amostragem vedada, e a BR é hoje o mapa que define o recorte.

### T14-F07 — MEDIUM · CONFIRMED — **BR-CAD-009 tem exceção silenciosa não declarada, e o seu par declarado nunca executa**
A invariante "criar item garante produto gêmeo na mesma transação" é verdadeira (`CreateItemUseCase.ts:33,51,53`) **mas não é universal**: `itemProductMirrorService.ts:92,153` devolve `null` em silêncio para item sem código ou de tipo não mapeado. A BR não registra a exceção. E o sentido inverso, declarado como regra no cabeçalho do mesmo serviço (`:30-32`), **tem zero call sites de produção** (T-05-01) — regra que vive só como comentário.
**Consequência de rastreabilidade:** BR-CAD-009 é citada como coberta em T-05 §2 (M-1) e é a única das 14 regras daqueles dois serviços com BR-ID. Ela está sendo usada como prova de cobertura de uma superfície que cobre 1/8.

### T14-F08 — INFO · CONFIRMED — **BR-PP-016b muda de fundamento e sobe de confiança** (acolhimento de T11-OBS-01)
O passo 26 declarou confiança MEDIUM porque "as duas explosões operam sobre tabelas diferentes e a sincronia não foi verificada" (`BUSINESS_RULE_CANDIDATES_planejamento-producao.md:350-353`). **A premissa está refutada** no AUDIT_COMMIT: `SequelizeMrpRepository.ts:4-6,22-24` delega a `BomStructureProjection`, que lê `bill_of_materials` (T-11 §1.1). Confirmei o outro lado por leitura própria: `mrpEngine.ts:164` filtra **só** `active`, e `is_phantom` não existe no tipo `MrpBomEdge` (`:32-43`). Não há duas árvores a sincronizar — há **uma fonte e dois leitores que discordam**. A BR passa a `CONFIRMED` com fundamento novo. Encaminhado a T-26 junto com T11-OBS-01.

### T14-F09 — LOW · CONFIRMED — Norma inline falsa em rota de troca de perfil (BR-IAM-022)
`AssignAccessProfileUseCase.ts:78` grava, no **audit log**, que a troca é "efetivo no próximo login (UC-36)". `middlewares/auth.ts:77-112` recarrega perfil e permissões **do banco a cada request** — o efeito é imediato. A trilha de auditoria registra uma afirmação factualmente falsa sobre a vigência de uma mudança de autorização; é o registro que um auditor externo leria. Convergente com `AUD-AUTHN-12` (T-02), aqui pelo ângulo de **conformidade do processo desenhado × implementado**, não de authN.

---

## 6. LACUNAS DE OWNER — contadas e listadas, **não preenchidas**

**Total: 165 de 165 regras com `OWNER = PENDENTE — decisão humana`. Nenhuma foi preenchida, sugerida ou inferida por esta trilha.**

Vedação aplicada: `APR-2026-019` parte 2, reafirmada por `APR-2026-021` Parte E e por `APR-2026-020`; G9; Regra 18 do `CLAUDE.md`. Não decidi, não infiri e não recomendei OWNER por módulo, por autor de código, por departamento nem por memória de projeto.

| # | Área | Prefixo | Regras sem OWNER |
|---|---|---|---|
| 1 | Identidade & Acesso | IAM | 39 |
| 2 | Cadastro Central | CAD | 17 |
| 3 | Cadeia de Suprimentos | SUP | 16 |
| 4 | Planejamento & Produção | PP | 26 |
| 5 | Qualidade & Estoque | QE | 13 |
| 6 | Comercial | COM | 13 |
| 7 | Fiscal | FIS | 10 |
| 8 | Contabilidade | CTB | 2 |
| 9 | Controladoria | CTR | 1 |
| 10 | Tesouraria | TES | 1 |
| 11 | Financeiro | FIN | 3 |
| 12 | Recursos Humanos | RH | 6 |
| 13 | Jurídico & LGPD | JUR | 8 |
| 14 | Saúde e Segurança do Trabalho | SST | 3 |
| 15 | Tecnologia da Informação | TI | 2 |
| 16 | Diretoria | DIR | 1 |
| 17 | Marketing | MKT | 1 |
| 18 | Facilities | FAC | 1 |
| 19 | Importação de planilha | IMP | 1 |
| 20 | Webhooks | WHK | 1 |
| | **Total** | 20 prefixos | **165** |

**Observação de materialidade que cabe no meu mandato (e não invade a decisão):** 4 das 4 regras `DIVERGENTE` e a única `NÃO IMPLEMENTADA` pertencem a áreas sem OWNER (SUP, QE, CAD, FIN). Não há, hoje, a quem endereçar formalmente a decisão sobre nenhuma delas. Registro o fato; a atribuição é ato humano.

---

## 7. RISCO RESIDUAL DECLARADO (condição G3-b)

### RES-T14-01 — 15 regras `NÃO LOCALIZÁVEL`, nominalmente listadas
Sub-entrega **declarada, não silenciosa**. Nenhuma foi marcada CONFIRMADA por presunção.

| BR-ID | O que faltou exatamente |
|---|---|
| BR-PP-011 | `allocatePlanByOrigin.ts:139` não aberto — rateio proporcional do plano por origem |
| BR-PP-014 | `createRequisitionFromPlannedOrders.ts:32` não aberto — mecanismo de idempotência da conversão |
| BR-PP-020 | `masterProduction/domain/constants.ts:141` não aberto — "a conta do Plano Mestre" |
| BR-PP-023 | `CreateAcousticTestUseCase.ts:84` não aberto — `passed` calculado; abertura de RNC |
| BR-PP-024 | `ReleaseDrawingUseCase.ts:33` não aberto — pré-condição `draft` |
| BR-QE-010 | `SupplierReturnHandler.ts:27` não aberto — devolução ao fornecedor |
| BR-QE-013 | `DeactivateAssetUseCase.ts:36` não aberto — baixa e ciclo com manutenção |
| BR-RH-D03 | `CreateTerminationProcessUseCase.ts:51` não aberto — "parâmetros fixos" |
| BR-JUR-D07 | `contractController.ts:42` não aberto |
| BR-JUR-D08 | `ActivateContractUseCase.ts:53` não aberto |
| BR-JUR-D09 | `CreateContractAddendumUseCase.ts:59` não aberto |
| BR-JUR-D10 | `ActivateContractUseCase.ts:75` não aberto |
| BR-SST-D16 | **âncora inexistente no próprio catálogo** (T14-F01) — não é lacuna de leitura |
| BR-TI-014 | `RevealLicenseKeyUseCase.ts:32` não aberto |
| BR-FAC-D20 | `TripUseCases.ts:87` não aberto |

**Categorias G3 atingidas por esta lacuna:** contratos (JUR-D07/D08/D09/D10), estoque/patrimônio (QE-010, QE-013), autorização (TI-014). **Estas são categorias em que G3 veda amostragem reduzida.** Não apresento isso como economia: é escopo não executado. Custo estimado para fechar: **≈ 0,7 S** (14 leituras dirigidas de janela estreita; a 15ª depende do dono da âncora).

### RES-T14-02 — 26 regras com status apoiado em leitura de outra trilha (base `C`), não relidas por mim
Marcadas `C` na tabela. São leituras próprias de VeriCore no mesmo AUDIT_COMMIT, com `arquivo:linha` publicado — evidência legítima, mas **não é dupla verificação**. Onde a conclusão de outra trilha era *premissa* e não *medida* (o caso de T11-OBS-01), refiz por conta própria (BR-PP-016b).

### RES-T14-03 — Nenhuma regra foi verificada em execução
`APR-2026-016` íntegro. Todo status é sobre o **código declarado**, não sobre o comportamento observado nem sobre o estado dos dados. Em particular, `BR-CAD-005` (backfill pendente), `BR-SUP-016`/T14-F02 (domínio efetivo de `contract.value`) e `BR-FIN-003` (existência de duplicatas reais) têm componente empírica não medida. `CONFLITO-G3×G4` incide.

### RES-T14-04 — Mérito de negócio não julgado
Não julguei se alguma regra está **certa para a Evok** — isso é do `vericore-domain-logic-auditor` e, em última instância, do dono (Regra 6). Julguei se o processo **desenhado/declarado** corresponde ao **implementado**. As 32 regras cuja declaração já é um defeito continuam sem decisão humana: 4 `DIVERGENTE` + 32 `CONFLICTING`/`UNKNOWN` confirmadas = superfície que exige o dono, não outro agente.

---

## 8. PEDIDOS DE EVIDÊNCIA DINÂMICA — `DYN-T14-nn`

Nenhuma sondagem executada por esta trilha. Zero conexões abertas. **Nenhum pedido toca `erp_evok_audio`.** Alvo exclusivo: `erp_evok_audio_test` (G4 aprovado), executor `vericore-audit-verification-runner`.

| ID | O que verificar | Comando/sondagem exata | Por que estático não basta | BR/Finding |
|---|---|---|---|---|
| **DYN-T14-01** | Se o `fail-open` do Jurídico é alcançável | `POST /api/jur/contracts` com `value` textual/não numérico (ou `UPDATE jur_contracts SET value='n/a'` em fixture), depois `POST /contracts/:id/activate` com usuário **sem** `diretor` e **sem** `financeiro` | A leitura prova que `NaN ⇒ []`; **não** prova que o domínio de `jur_contracts.value` admite não numérico. 200 ⇒ T14-F02 explorável (subir severidade); 422/erro de tipo ⇒ latente como em Compras | T14-F02, BR-JUR-003 |
| **DYN-T14-02** | Se existe hoje algum meio de distinguir 2ª parcela legítima de retry | Título com 2 baixas de valor idêntico via `PUT /api/finance/receivable/:id/receive`; depois `SELECT * FROM audit_logs WHERE entity_type='AccountReceivable' AND entity_id=:id` | Estático prova a ausência de chave; a prova de que **o próprio audit log também não distingue** (registra `status:'paid'` e `amount` de face — T-07 `AUD-SERVICE-6`) fecha o argumento de BR-FIN-003 | T14-F03, BR-FIN-003 |
| **DYN-T14-03** | Se `BLOQUEADO`/tipo não mapeado realmente não gera gêmeo | `POST /api/items` com `tipo` não mapeado, depois `SELECT * FROM products WHERE code=:codigo` | Prova a exceção silenciosa de BR-CAD-009 como efeito, não como leitura de `return null` | T14-F07, BR-CAD-009 |
| **DYN-T14-04** | Se a contradição de "vencido" produz resultado divergente | Lote com `expires_at = CURRENT_DATE`; consumir em OP (`PUT /production-orders/:id/status {completed}`) e faturar venda pelo FEFO de `saleLotService` | Só a execução mostra que o **mesmo lote** é aceito por um caminho e recusado por outro no mesmo instante | BR-QE-007 |
| **DYN-T14-05** | Se as 15 BRs `NÃO LOCALIZÁVEL` são regras vivas | **Não é DYN** — é leitura estática pendente. Registrado aqui só para não se perder: pertence a RES-T14-01, não à fila do runner | — | RES-T14-01 |

Nenhum finding desta trilha **depende** de DYN para existir. T-14 encerra a parte estática; `DYN-T14-01` é o único que pode **alterar severidade** (T14-F02, MEDIUM → potencialmente HIGH).

---

## 9. O QUE A T-15 VAI CONSUMIR — sinalização explícita

`AUDIT_PLAN.md:442` faz T-15 depender do status das BRs desta trilha. Sinalizo, por classe, o que é consumível e com que grau:

| Classe | Qtde | Consumível por T-15 como…? |
|---|---|---|
| **CONFIRMADA com base `P`/`N`** | **124** | **SIM, sem ressalva.** Âncora `arquivo:linha` decidida por leitura própria VeriCore no AUDIT_COMMIT. Elo `BR → IMPLEMENTAÇÃO` **fechado** — pode entrar na cadeia de rastreabilidade como elo verificado. |
| **CONFIRMADA com base `C`** | **21** | **SIM, com marca de origem.** Elo fechado por outra trilha VeriCore, citada. T-15 deve carregar a atribuição (não é dupla verificação). |
| **DIVERGENTE** | **4** (SUP-016, CAD-009, QE-008, QE-011) | **SIM, mas o elo `BR → IMPLEMENTAÇÃO` é PARCIAL.** T-15 **não** pode contá-los como cadeia completa: a implementação existe e **difere do enunciado**. São exatamente o tipo de elo que produz cadeia falsamente verde. |
| **NÃO IMPLEMENTADA** | **1** (FIN-003) | **SIM — elo `BR → IMPLEMENTAÇÃO` ROMPIDO por ausência.** Única regra de origem humana; se T-15 encontrar `REQ` apontando para ela, a cadeia quebra na implementação, não no requisito. |
| **NÃO LOCALIZÁVEL** | **15** | **NÃO.** T-15 **não deve** contar estes 15 como elo fechado nem como elo rompido — o estado é *indeterminado*. Contá-los em qualquer direção falsearia a medição de "cadeias completas". Devem entrar na matriz de T-15 com marca própria e referência a RES-T14-01. |

**Insumo adicional dirigido a T-15 (causa-raiz nº 1):** o elo quebrado que o passo 29 mediu (`~167/167`) **não é**, pelo que esta trilha vê, um problema de *numeração* — a `APR-2026-019` já o resolveu, e as 145 âncoras que confirmei provam que o BR-ID **casa com código**. O elo que continua rompido é **`BR ↔ REQ`**, não `BR ↔ código`. E T14-F05 mostra a segunda causa, que a renumeração não alcança: **≥ 26 regras vivas sem BR-ID nenhum** — para elas não há elo a consertar, há elo a criar, e criá-lo é ato humano (Regra 6).

---

## 10. ESCALONAMENTOS (Regra 20 — registrados, nunca conciliados em silêncio)

1. **T-11 → T-14 (acolhido).** `T11-OBS-01`: a premissa dos "dois motores, duas tabelas" está refutada; `BR-PP-016b` muda de fundamento e sobe para CONFIRMED (T14-F08). Encaminhado também a **T-26**.
2. **T-06 → T-14 (acolhido, com divergência sobre o catálogo).** `BR-QE-008` e `BR-QE-011` classificadas por mim como **DIVERGENTE**, não CONFIRMADA — vou além do que T-06 propôs, que era "incompletas". `AUD-INTEG-02` (direção do movimento) entra em T14-F05 como regra sem BR.
3. **T-05 → T-14 (acolhido).** RA-08: 13 de 14 regras dos 2 serviços sem BR-ID; correção de âncora de BR-CAD-009 confirmada; acrescento a exceção M-7 como T14-F07.
4. **T-12 → T-14 (acolhido).** `T12-M09`: ≥ 9 regras legais de RH/SST sem BR-ID; `BR-SST-D16` sem linha de origem vira T14-F01.
5. **T-07 → T-14 (acolhido).** Os 7 vereditos de FIN/CTB/CTR/TES são a base `C` da §3.5; a consequência de projeto de BR-FIN-003 vira T14-F03.
6. **T-01 → T-14 (acolhido).** 3 lacunas de BR entram em T14-F05; `AUD-T01-11` resolve o ponto UNKNOWN de BR-CAD-008 **quanto ao fato**.
7. **T-14 → T-25.** T14-F02, T14-F03 e T14-F05 (HIGH/MEDIUM em `PROPOSED`) vão ao `vericore-finding-validator`. **Não os confirmo** (Regra 22).
8. **T-14 → director / dono.** As 165 lacunas de OWNER e as 36 regras que exigem decisão humana (32 `CONFLICTING`/`UNKNOWN` confirmadas + 4 `DIVERGENTE`) — **nenhuma resolvida aqui**.
9. **T-14 → director.** RES-T14-01: decidir entre suprir (~0,7 S) ou registrar redução de cobertura com aceite do dono, dado que 7 das 15 tocam categorias vedadas por G3.
10. **Divergência não conciliada com o co-titular:** o `vericore-traceability-auditor` (co-titular formal) **não foi consultado** nesta passada. Registro como fato de processo, não como conclusão: as 165 linhas foram adjudicadas por um só titular. Isso é insumo para o director decidir se T-15, que é dele, deve reconferir a amostra `C`.

---

## 11. LIMITES DESTE RELATÓRIO

- Nada foi corrigido, refatorado ou alterado (Regra 2). **`BR_CATALOG.md` não foi editado** — foi validado.
- **Nenhum arquivo foi criado em disco**, nem em `audit/`. A persistência em `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/` cabe ao `vericore-audit-evidence-controller`.
- Nenhum OWNER decidido, inferido ou sugerido (G9, `APR-2026-019`/`020`/`021`).
- Nenhum finding confirmado ou fechado; nenhuma declaração de `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED` ou `REMEDIATION COMPLETE`.
- Nenhuma regra de negócio inventada. Onde não há regra, o registro é **lacuna** (Regra 6).
- Nenhuma conexão de banco, nenhuma execução, nenhum teste rodado, nenhum dado real inspecionado.
- Nenhuma citação a `c9359be`. Todas as 150 âncoras decididas são do `AUDIT_COMMIT c1311a6f…`.

---

## 12. MEDIÇÃO (G11-c)

| | |
|---|---|
| **Estimado (AUDIT_PLAN §4.3)** | **6 S** — a trilha mais cara do plano |
| **Real** | **≈ 2,4 S** — 1 sessão contínua, ~38 chamadas de ferramenta em 10 blocos paralelos, ~60 arquivos do objeto abertos, 12 relatórios de trilha lidos |
| **Cobertura entregue** | 165/165 com status; 150/165 com âncora decidida; **15 declarados como não alcançados** |
| **Leitura honesta** | O desvio **não é eficiência pura, e parte dele é cobertura não executada** (RES-T14-01, ~0,7 S). Corrigido por isso, o desvio defensável é **≈ -48%**, não -60%. Duas causas verificáveis do ganho real: (i) **o catálogo é um checklist de qualidade alta** — 145 de 165 âncoras casaram na primeira abertura do arquivo, o que é raro e é mérito do passo 26; (ii) **11 trilhas anteriores já haviam lido, com `arquivo:linha`, exatamente os clusters mais densos** (PP por T-11, FIN por T-07, QE por T-06, IAM por T-02) — consumi essa evidência marcando a origem, em vez de refazê-la. |
| **Advertência contra extrapolação** | T-12 previu que trilhas de **semântica de regra por item** não herdam o fator alto das trilhas de enumeração, e citou nominalmente "T-14, as 164 BRs" como o caso que **não** deveria herdá-lo. **A previsão está parcialmente certa:** onde o insumo era bom e a âncora precisa, o custo por regra foi baixíssimo; onde a âncora falhou ou o arquivo não estava mapeado por outra trilha, o custo por regra explodiu — e é exatamente ali que ficaram as 15 lacunas. O preditor de esforço desta trilha **não é o número de regras: é a qualidade da âncora publicada**. |
