# T-06 — ESTOQUE E IDEMPOTÊNCIA — RELATÓRIO DE TRILHA

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`.
Regime `APR-2026-016` respeitado: nenhuma conexão de banco, nenhuma execução.
Nenhum arquivo do objeto auditado foi tocado (Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-data-integrity-auditor` (T-06 estoque e idempotência) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
TRILHA:        T-06 (inventory 27 · mobileInventory 3 · traceability 3)
TITULAR:       vericore-data-integrity-auditor
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
ONDA:          W2  ·  AUTORIDADE: APR-2026-023 Parte C + diretiva de paralelismo
REGIME:        APR-2026-016 — read-only reforçado. NENHUMA conexão de banco aberta.
               NENHUM teste executado. Toda evidência é estática.
ESTADO FINAL:  **READY_TO_CLOSE_BLOCKED_BY_G4** (EMENDA-02 §8.1) — a parte estática
               fecha; a prova de duplicidade sob concorrência exige DYN-02.
```

> **Nota de método (Regra 3).** A `TRIAGE.md` do CASE-001 (SanaCore) e os artefatos de discovery (`FIND-ERP-001.md`, `BR_CATALOG.md`, `BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`, `CHARACTERIZATION_TESTS.md`) foram tratados **exclusivamente como origem de hipótese**. Toda âncora abaixo foi lida por este agente no `AUDIT_COMMIT`. Nenhuma linha de artefato de terceiro é citada como prova. Onde a leitura própria coincide, registro convergência; onde diverge, registro divergência (§8).

---

## 1. Cobertura efetiva — censo 100%, sem amostragem

G3 veda amostragem reduzida em **movimentação de estoque** e **integridade de dados**. As duas categorias cobrem integralmente esta trilha, logo **cobertura E em 33/33 endpoints**, sem exceção.

| Arquivo de rota | Endpoints | Lidos | Escrita |
|---|---|---|---|
| `server/src/modules/inventory/presentation/routes/inventory.ts:23-49` | 18 | 18 | 8 |
| `server/src/modules/inventory/presentation/routes/inventoryCounts.ts:23-31` | 9 | 9 | 7 |
| `server/src/modules/mobileInventory/presentation/routes/mobileInventory.ts:17-19` | 3 | 3 | 2 |
| `server/src/modules/traceability/presentation/routes/traceability.ts:22-24` | 3 | 3 | 0 |
| **TOTAL** | **33** | **33 (100%)** | **17** |

A contagem 27 do `AUDIT_PLAN.md` §4.3 **confere** (18 + 9). Sem divergência de inventário.

**Verificação de não-escrita de `traceability` (exaustiva, 3/3):** `SequelizeTraceabilityRepository.ts` contém apenas `findByPk` (`:59`, `:181`, `:287`) e `findAll` (`:312`). Nenhum `create`/`update`/`destroy`/`query` de escrita em todo o arquivo. **Resultado negativo confirmado — os 3 endpoints são leitura pura.**

Camadas lidas na íntegra além das rotas: `inventoryController.ts`, `inventoryCountController.ts`, `mobileInventoryController.ts`, `traceabilityController` (via repositório), 23 use cases de `inventory`, 3 de `mobileInventory`, 3 de `traceability`, `SequelizeInventoryRepository.ts`, `SequelizeInventoryCountRepository.ts`, `SequelizeMobileInventoryRepository.ts`, `SequelizeTraceabilityRepository.ts`, `InventoryMovementEntity.ts`, `inventoryValidators.ts`, `models/InventoryMovement.ts`, `models/InventoryCount.ts`, `models/LotControl.ts`, e os 6 serviços do escopo (`inventoryService.ts`, `warehouseStockService.ts`, `quarantineBalanceService.ts`, `saleLotService.ts`, `materialReceiptService.ts`) + `RegisterProductMovementUseCase.ts` (superfície irmã).

---

## 2. Classificação de idempotência/atomicidade — 17/17 endpoints de escrita

Legenda: **P-L** protegido por lock pessimista · **P-C** protegido por constraint · **P-G** protegido por guarda de estado condicional atômica · **D** desprotegido.

| # | Endpoint | Transação | Lock | Guarda | Veredito |
|---|---|---|---|---|---|
| 1 | `POST /api/inventory/movements` | sim (`inventoryController.ts:114`) | `Product` FOR UPDATE (`inventoryService.ts:128-131`) | **nenhuma de idempotência** | **D** — F-01 |
| 2 | `POST /api/inventory/lots/:id/release` | sim (`ReleaseLotUseCase.ts:119`) | `findLotByIdForUpdate` (`:125`) | status + gate G7 (`:129`,`:147`) | **P-L** |
| 3 | `POST /api/inventory/lots/:id/block` | **não** | **não** (`BlockLotUseCase.ts:56` usa `findLotById`) | guarda lida fora de lock; escrita incondicional (`:71`) | **D** — AUD-INTEG-05 |
| 4 | `POST /api/inventory/warehouses` | não | não | `findWarehouseByCode`+`create` (`CreateWarehouseUseCase.ts:49-59`) | **P-C** — UNIQUE `warehouses.code` (`20260804-000001:134-138`) |
| 5 | `PUT /api/inventory/warehouses/:id` | não | não | idempotente por natureza (PUT de campos) | aceitável |
| 6 | `POST /api/inventory/transfers` | não | não | não altera saldo (`CreateWarehouseTransferUseCase.ts:66-74`) | aceitável |
| 7 | `PUT /api/inventory/transfers/:id/approve` | sim (`inventoryController.ts:415`) | `findWarehouseTransferForUpdate` (`SequelizeInventoryRepository.ts:146-151`) | `status !== 'pending'` sob lock (`ApproveWarehouseTransferUseCase.ts:49`) | **P-L** |
| 8 | `PUT /api/inventory/transfers/:id/reject` | sim (`:449`) | idem | idem | **P-L** |
| 9 | `POST /api/inventory-counts` | sim (`CreateInventoryCountUseCase.ts:93`) | não | numeração `COUNT(*)+1` (`:111-112`) | **P-C** parcial — AUD-INTEG-08 |
| 10 | `POST /api/inventory-counts/:id/start` | sim (`StartInventoryCountUseCase.ts:61`) | `findRawByIdForUpdate` (`:63`) | status + claim (`:67`,`:71`) | **P-L** |
| 11 | `PUT /api/inventory-counts/:id/reassign` | não | não | cadastral | aceitável |
| 12 | `POST /api/inventory-counts/:id/items/:itemId/count` | **não** | **não** | status lido fora de lock (`CountInventoryItemUseCase.ts:51-57`), escrita incondicional (`:66`) | **D** — AUD-INTEG-06 |
| 13 | `POST /api/inventory-counts/:id/submit` | **não** | **não** | status lido (`SubmitInventoryCountUseCase.ts:29-35`), escrita **incondicional** `update` (`:46`) | **D** — AUD-INTEG-04 |
| 14 | `POST /api/inventory-counts/:id/approve` | sim (`ApproveInventoryCountUseCase.ts:51`) | `findRawByIdForUpdate` (`:56`) | status sob lock (`:60`) **+** `updateIfStatus` (`:107-115`) + `ConflictError` (`:113`) | **P-L + P-G** — melhor exemplar do módulo |
| 15 | `POST /api/inventory-counts/:id/reject` | não | não | `updateIfStatus` atômico (`RejectInventoryCountUseCase.ts:50-59`) | **P-G** |
| 16 | `POST /api/mobile-inventory/scan` | sim (`mobileInventoryController.ts:22`) | `Product` FOR UPDATE via `adjust` | nenhuma de idempotência; **sem depósito, sem lote** | **D** — F-01 + AUD-INTEG-03 |
| 17 | `POST /api/mobile-inventory/batch` | sim (`:37`) | idem, por item | idem | **D** — F-01 + AUD-INTEG-03 |

**Aritmética de fechamento:** 6 P-L · 1 P-G · 1 P-L+P-G · 1 P-C · 3 aceitáveis por natureza · **5 desprotegidos**. 17/17 classificados. Nenhum endpoint sem veredito.

---

## 3. Reconfirmação independente de **FIND-ERP-001** (CRITICAL) — âncoras próprias

**Não emito finding novo sobre o núcleo do FIND-ERP-001** (já formalizado e em remediação sob CASE-001). Reconfirmo, com leitura própria no `AUDIT_COMMIT`:

| Afirmação do finding | Evidência própria | Resultado |
|---|---|---|
| Rota sem middleware de idempotência | `inventory.ts:25` — `router.post('/movements', authenticate, authorizeModule('estoque','operate'), inventoryController.create)`. Três middlewares, nenhum de idempotência | **CONFIRMADA** |
| Controller não checa duplicidade | `inventoryController.ts:113-152` — `create` abre tx (`:114`), valida Zod (`:116`), chama use case (`:131`), `t.commit()` (`:137`). Zero leitura prévia de "operação já processada" | **CONFIRMADA** |
| Use case não checa duplicidade | `CreateInventoryMovementUseCase.ts:71-123` — corpo integral lido: resolução `item_id` (`:80-90`), entidade (`:92-94`), depósito (`:97`), débito (`:104`), `adjust` (`:107`), crédito (`:119`). Nenhuma guarda de reexecução | **CONFIRMADA** |
| `adjust` sempre grava | `inventoryService.ts:350-368` — `increment`/`decrement` incondicional seguido de `createMovement` incondicional. `createMovement` (`:176-189`) é `InventoryMovement.create` puro, sem `findOrCreate` | **CONFIRMADA** |
| Índice `(reference_type, reference_id)` não é UNIQUE | `models/InventoryMovement.ts:65` — `{ fields: ['reference_type','reference_id'] }`, sem `unique: true`. Confirmado no schema versionado: `migrations/20260731-000019-add-inventory-movements-indexes.cjs:17-21` cria o índice **sem** opção `unique` | **CONFIRMADA** |
| Nenhum UNIQUE em `inventory_movements` | Varredura de 100% das migrations que citam a tabela (12 arquivos): zero `addConstraint`/`unique` sobre ela | **CONFIRMADA** |

**Veredito T-06: FIND-ERP-001 se sustenta integralmente por evidência VeriCore própria.** Convergência com a re-ancoragem de T-00 (RA-07) e com a triagem SanaCore — **convergência, não deferência**: nenhuma das duas foi usada como premissa.

**Extensão de escopo do finding, medida por mim:** o defeito **não é de uma rota, é do caminho `InventoryService.adjust`**. Três rotas o compartilham sem qualquer proteção adicional: `POST /api/inventory/movements` (`CreateInventoryMovementUseCase.ts:107`), `POST /api/mobile-inventory/scan` (`ScanItemUseCase.ts:67`), `POST /api/mobile-inventory/batch` (`BatchScanUseCase.ts:72`) — e uma quarta fora do módulo, `POST /api/products/movements` (`RegisterProductMovementUseCase.ts:60`). **Remediação restrita à rota do finding deixa 3 superfícies vivas.** Registro dirigido à SanaCore via orquestrador (não instrução — Regra 3).

---

## 4. Findings propostos

Todos em estado **`PROPOSED`**. CRITICAL/HIGH seguem ao `vericore-finding-validator` (Regra 22). **Não confirmo nenhum.** Severidade e confiança declaradas separadamente.

---

### AUD-INTEG-01 — `reference_type`/`reference_id` do payload são descartados no caminho de escrita
**Severidade proposta: HIGH · Confiança: ALTA (prova estática direta e completa)**

**Evidência (cadeia fechada, 4 elos):**
1. `inventoryValidators.ts:23-26` — o schema **aceita e valida** `reference_id` (int positivo) e `reference_type` (enum de 7 valores).
2. `inventoryController.ts:118` — os dois campos são desestruturados de `parsed.data` e repassados ao use case (`:132`).
3. `InventoryMovementEntity.ts:53-54` e `:88-96` — a entidade guarda e **serializa** os dois em `toServiceInput()`.
4. `CreateInventoryMovementUseCase.ts:107-116` — a chamada é posicional:
   ```
   InventoryService.adjust(input.product_id, input.type, input.quantity,
                           userId, input.description, transaction,
                           warehouse.id, item_id ?? null)
   ```
   `input.reference_id` e `input.reference_type` **nunca são passados**. `input` é usado nas linhas 103, 104, 108-112 — nunca para reference.
5. `inventoryService.ts:356-368` — `adjust` chama `createMovement` com `referenceType: 'adjustment'` **hardcoded** e **sem** `referenceId`; `createMovement` (`:184-185`) grava `reference_id: data.referenceId ?? null` ⇒ **sempre `null`**.

**Consequências provadas por leitura:**
- **Toda** movimentação manual nasce `reference_type='adjustment'`, `reference_id=null`, qualquer que seja o payload.
- A **única chave candidata a dedupe** que o schema oferece (`reference_type`,`reference_id`) é **estruturalmente inutilizável**: mesmo que se adicionasse `UNIQUE` sobre ela, todas as linhas colidiriam em `('adjustment', NULL)` — em Postgres, `NULL` não colide, logo o UNIQUE seria **inócuo**. **Isto agrava FIND-ERP-001: a remediação óbvia não funciona sem corrigir antes este defeito.**
- **Rastreabilidade quebrada a jusante, com âncora:** `SequelizeTraceabilityRepository.ts:107-108` monta `origem_tabela: movement.reference_type` e `origem_id: movement.reference_id`. Para todo movimento manual, de contagem cíclica e de scan mobile, a rastreabilidade devolve origem `'adjustment'` / `null` — **evento sem origem**. `getProductionOrderDetails` (`:313`) só funciona porque o caminho de produção passa reference de verdade.
- A aprovação de contagem cíclica (`ApproveInventoryCountUseCase.ts:89`) sofre o mesmo: o ajuste **não fica vinculado** ao `count_number` que o originou, embora o motivo apareça em texto livre (`:83`).

**Interleaving não é necessário** — é defeito determinístico, não de corrida.

---

### AUD-INTEG-02 — a direção real do movimento (`in`/`out`) não é persistida
**Severidade proposta: HIGH · Confiança: ALTA**

`inventoryService.ts:327-368`: `adjust` recebe `type: 'in' | 'out'`, usa-o para decidir `increment` (`:351`) ou `decrement` (`:353`), e então grava `type: 'adjustment'` **hardcoded** (`:360`) na linha de `inventory_movements`. `quantity` é sempre positivo (validado em `inventoryValidators.ts:4-7` e `InventoryMovementEntity.ts:75`).

**Consequência:** a linha persistida **não contém o sinal da operação**. Entrada de 10 e saída de 10 do mesmo produto produzem registros indistinguíveis exceto pelo texto livre de `description`. Efeitos provados:
- `SequelizeInventoryRepository.ts:54` (`if (filters.type) where.type = filters.type`) — `GET /api/inventory/movements?type=out` **nunca** devolve movimento manual, de contagem ou de scan.
- Nenhuma reconstrução de saldo a partir do razão `inventory_movements` é possível para esses caminhos — o que contradiz o JSDoc do próprio model (`models/InventoryMovement.ts:6-7`: "Toda alteração em Product.quantity DEVE passar por este model").
- Atinge 4 rotas: `POST /inventory/movements`, `POST /inventory-counts/:id/approve`, `POST /mobile-inventory/scan|batch`, `POST /products/movements`.

**Contraste que descarta "intencional":** os caminhos automáticos gravam o tipo correto — `consume` grava `'out'` (`:226`), `receive` grava `'in'` (`:283`), `ApproveWarehouseTransferUseCase.ts:67,78` grava `'transfer'`. Só `adjust` colapsa. O ENUM do banco suporta os 4 valores (`models/InventoryMovement.ts:35`).

**Divergência com o discovery:** este defeito **não está** no `BR_CATALOG.md` nem no `FIND-ERP-001`. Aparece apenas como asserção lateral em teste (`characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts:182`), sem BR nem finding. **Lacuna de catálogo — reportada a T-14.**

---

### AUD-INTEG-03 — scan mobile move estoque fora de depósito, de lote e da quarentena (invariante §12 item 3 quebrada)
**Severidade proposta: CRITICAL · Confiança: ALTA**

**Evidência:**
- `ScanItemUseCase.ts:67-74` chama `InventoryService.adjust` com **6 argumentos**. A assinatura tem 8 (`inventoryService.ts:327-335`): `warehouseId` (7º) e `itemId` (8º) são **omitidos**. `BatchScanUseCase.ts:72-79`: idêntico.
- `inventoryService.ts:364,186` ⇒ `warehouse_id: null` gravado no movimento; nenhuma chamada a `WarehouseStockService`.
- **A invariante violada está declarada no próprio código auditado**, `warehouseStockService.ts:9-17`: *"Toda rotina que altera `products.quantity` via `inventoryService` DEVE também chamar `addToWarehouse`/`removeFromWarehouse` na MESMA transação"*. O scan altera `products.quantity` (`:351/:353`) e **não** chama nenhuma das duas.
- **Contraste na mesma trilha:** `CreateInventoryMovementUseCase.ts:97-120` resolve o depósito, valida saldo por depósito (`:104`) e faz o dual-write (`:119`). `ApproveInventoryCountUseCase.ts:92-96` idem. O mobile é a **exceção**, não a regra.
- **Fura a quarentena:** `ScanItemUseCase.ts:63-64` valida `type='out'` contra `product.quantity` **bruto**. `quarantineBalanceService.ts:73,132-138` define o saldo retido (`quarantine`+`blocked`) e o clamp `max(0, físico − retido)` — e é consultado **apenas pelos leitores de planejamento**. Nenhuma linha do caminho do scan lê `LotControl`. Material que a Qualidade não liberou é baixado sem erro (ISO 9001:2015 §8.7).

**Estado do dado após a operação (corrupção persistida, não transitória):** `products.quantity` decrementado · `SUM(ProductWarehouseStock)` inalterado ⇒ **invariante rompida permanentemente** · `lot_controls.quantity_available` inalterado ⇒ retido passa a ser **maior** que o físico · `inventory_movements` com `warehouse_id=null`, `type='adjustment'`, `reference_id=null` ⇒ evento não reconciliável.

**Superfície irmã, mesmo defeito, fora do módulo:** `RegisterProductMovementUseCase.ts:60-67` (`POST /api/products/movements`) chama `adjust` com os mesmos 6 argumentos. **Fronteira declarada:** o módulo `products` é de T-05/T-16; **a superfície de movimentação de estoque é minha** (plano §4.3). Registro aqui e faço handoff explícito — divergência entre trilhas escala, não se concilia (Regra 20).

**Convergência registrada:** o discovery já classificara isto como BR-QE-011 `CONFLICTING`, candidato CRITICAL/CONFIRMED **não promovido**. Confirmo por leitura própria e **proponho a promoção**, com a evidência acima, não por analogia.

---

### AUD-INTEG-04 — `submit` de contagem escreve status incondicionalmente e permite reaprovar (duplo ajuste de estoque)
**Severidade proposta: HIGH · Confiança: ALTA (interleaving demonstrado)**

`SubmitInventoryCountUseCase.ts` — **sem transação, sem lock, com escrita incondicional**: lê status (`:29`, `findRawById`, sem `transaction`), valida `counting` (`:33`), lista itens (`:37`), e grava com `update` (`:46`) — o método que **não** condiciona por status (`SequelizeInventoryCountRepository.ts:96-99`, `WHERE id = :id`).

**Interleaving demonstrado, passo a passo:**

| t | Requisição | Ação | Estado de `inventory_counts.status` |
|---|---|---|---|
| t0 | — | contagem CC-2026-0007, itens todos `counted` | `counting` |
| t1 | **A** `POST /:id/submit` | `findRawById` ⇒ `'counting'` ✓ (`:29-35`); `listItems` ✓ (`:37-44`). **Pausa antes de `:46`** (I/O, GC, ou simples atraso de rede/CPU — nenhum lock a impede) | `counting` |
| t2 | **B** `POST /:id/submit` | mesmo caminho, executa `:46` | `pending_approval` |
| t3 | **C** `POST /:id/approve` | `findRawByIdForUpdate` (`ApproveInventoryCountUseCase.ts:56`) — trava · status ✓ · aplica **todas** as variâncias via `adjust` (`:89`) + dual-write (`:92-96`) · `updateIfStatus` ⇒ 1 linha (`:107`) · `commit` (`:117`) | `adjusted` — **estoque ajustado 1×** |
| t4 | **A** retoma | executa `:46` — `UPDATE ... SET status='pending_approval' WHERE id=:id`, **sem cláusula de status**. A guarda de A foi avaliada em t1 sobre um estado que já não existe | `pending_approval` ← **regressão** |
| t5 | **C'** `POST /:id/approve` | trava, encontra `pending_approval` ✓, relê `listItems` — os itens continuam com `variance_quantity` original (`updateItem` em `:99` só grava `status`) — e aplica **as mesmas variâncias de novo** | `adjusted` — **estoque ajustado 2×** |

**Resultado:** ajuste de inventário aplicado em dobro, com dois registros de aprovação legítimos em `audit_logs`. O lock pessimista de `approve` **não protege**, porque `submit` não participa dele: não abre transação e não trava a linha.

**Contraste que descarta "intencional":** as duas irmãs diretas usam a proteção certa — `reject` usa `updateIfStatus` + `ConflictError` (`RejectInventoryCountUseCase.ts:50-59`); `approve` usa lock **e** `updateIfStatus` **e** `ConflictError`, com comentário explícito sobre a corrida (`ApproveInventoryCountUseCase.ts:102-115`). `submit` é a única transição da máquina de estados sem nenhuma das três.

---

### AUD-INTEG-05 — `BlockLotUseCase` faz check-then-act sem transação, lock ou escrita condicional
**Severidade proposta: MEDIUM · Confiança: ALTA**

`BlockLotUseCase.ts:56` usa `findLotById` (`SequelizeInventoryRepository.ts:189-191`, sem `transaction`, sem `lock`); guarda de status em `:60`; `lot.update(...)` em `:71-77`, **sem transação e sem condição de status**.

**A prova de que isto é defeito, e não desenho, está no arquivo par:** `ReleaseLotUseCase.ts:39-51` documenta esta exata classe de defeito como **corrigida em 2026-08-11** — *"Leitura e escrita sem transação nem lock… Um bloqueio concorrente entre a leitura e a escrita era simplesmente sobrescrito"* — e implementa transação (`:119`) + `findLotByIdForUpdate` (`:125`). **A correção foi aplicada em um só lado do par bloquear/liberar.**

**Interleaving:** T1 `block` lê o lote em `quarantine` (sem lock) e passa a guarda; T2 `release` trava a linha, roda o gate G7, grava `status='available'`, `released_by`, `released_at`, `release_inspection_id`, `blocked_at=null`, `notes` e commita; T1 então executa seu `UPDATE` (que espera o lock de linha e prossegue), gravando `status='blocked'`, `blocked_at=now` e `notes` **montado a partir do `lot.notes` obsoleto lido em t1** — a anotação de liberação é perdida. Estado final persistido: lote `blocked` **com** `release_inspection_id`/`released_by`/`released_at` preenchidos e o rastro da liberação apagado das `notes`. Registro internamente contraditório para auditoria ISO 9001 §8.6.

**Direção do risco:** o desfecho tende ao lado conservador (`blocked`), o que rebaixa a severidade de HIGH para MEDIUM — mas o **registro de qualidade fica corrompido**, e é o registro que a norma exige.

---

### AUD-INTEG-06 — `countItem` grava variância sem transação nem lock, podendo divergir da variância aplicada
**Severidade proposta: MEDIUM · Confiança: ALTA**

`CountInventoryItemUseCase.ts:51` (`findRawById` sem transação), `:55` (guarda de status), `:66-73` (`updateItem` incondicional, sem transação). `ApproveInventoryCountUseCase` lê os itens dentro da sua transação (`:74`) **sem lock de linha** (`listItems` não usa `lock` — `SequelizeInventoryCountRepository.ts:127-134`).

**Interleaving:** `approve` (com lock no cabeçalho) lê os itens em t1 e começa a aplicar ajustes; `countItem` de outro operador — cuja guarda `status === 'counting'` foi lida antes da transição — grava `variance_quantity` novo em t2; `approve` marca o item como `adjusted` em t3 (`:99`, só o campo `status`). Persiste um item `adjusted` cuja variância registrada **nunca foi aplicada ao estoque**. O lock do cabeçalho não cobre a tabela de itens.

---

### AUD-INTEG-07 — falha após o commit devolve 5xx com o efeito de estoque já persistido (amplificador de FIND-ERP-001)
**Severidade proposta: MEDIUM · Confiança: ALTA**

`inventoryController.ts:137-152`: `await t.commit()` (`:137`) → `GetInventoryMovementByIdUseCase.execute` (`:139`) → `logAction` (`:143`) → `res.status(201)` (`:152`). Se `:139` falhar (indisponibilidade momentânea, timeout, erro de include), o `catch` interno (`:153-160`) avalia `if (!t.finished) await t.rollback()` — a transação **está** finalizada, então nada é revertido — e relança; o `catch` externo (`:161-169`) cai em `next(error)` ⇒ **HTTP 5xx**.

**Cliente recebe erro para uma operação que foi persistida.** O comportamento natural (usuário ou camada de retry) é reenviar — e, por FIND-ERP-001, o reenvio é aceito e duplica o efeito. **Isto converte uma falha transitória de leitura em duplicação de estoque**, sem envolver concorrência.

Nota correlata para T-03: `logAction` (`:143`) não é `await`-ado; falha de auditoria é silenciosa. Mesmo padrão em `:320`, `:354`, `:390`, `:422`, `:460`, `:546`, `:582`.

---

### AUD-INTEG-08 — numeração `CC-YYYY-NNNN` por `COUNT(*)+1`, sem serialização, divergindo do padrão do ERP
**Severidade proposta: LOW · Confiança: ALTA**

`CreateInventoryCountUseCase.ts:111-112`: `countByCountNumberPrefix` (`SequelizeInventoryCountRepository.ts:25-27`, `COUNT` simples) + 1. Sob READ COMMITTED, `COUNT` não bloqueia inserções concorrentes: duas criações simultâneas calculam o mesmo `existing` e derivam o **mesmo** `count_number`.

**Controle compensatório localizado:** `models/InventoryCount.ts:60` declara `unique: true` em `count_number` ⇒ a colisão é **barrada** (não corrompe). Mas o erro emerge como `SequelizeUniqueConstraintError` não tratado ⇒ 500, não 409.

**Divergência de padrão, medida:** o ERP possui a solução correta implementada em **5 módulos** — `pg_advisory_xact_lock` em `SequelizeProductionOrderRepository.ts:118`, `SequelizePurchaseRequisitionRepository.ts:131`, `SequelizeMaintenanceRepository.ts:72`, `SequelizeMasterProductionPlanRepository.ts:169`, e referenciado em `ConvertPlannedOrdersToProductionOrderUseCase.ts:190`. A contagem cíclica é a **única numeração anual do ERP sem advisory lock**. Adicionalmente, `COUNT(*)+1` (em vez de `MAX+1`) reusa número após exclusão de linha.

**Lacuna de verificação declarada:** não localizei, nas migrations versionadas, a criação do índice único de `count_number` — apenas a declaração no model. Confirmação depende de **DYN-06.4**.

---

### AUD-INTEG-09 — endpoints mobile sem validação de esquema e com rollback incondicional
**Severidade proposta: LOW · Confiança: ALTA**

`mobileInventoryController.ts:26` — `useCase.execute({ ...req.body, userId, transaction: t })`: o corpo cru é espalhado, **sem Zod**, ao contrário de todo o módulo `inventory` (`inventoryController.ts:116`, `:380`, `:451`, `:539`, `:575`). A validação existe só ad-hoc no use case (`ScanItemUseCase.ts:48-57`), e `parseInt` (`:51`) trunca decimais numa coluna `DECIMAL(18,6)` — enquanto `BatchScanUseCase.ts:59` usa `parseFloat`: **dois caminhos irmãos com precisão diferente para a mesma grandeza**. `POST /batch` não impõe teto de itens (`BatchScanUseCase.ts:49-54`), logo uma lista grande mantém uma transação aberta em laço serial. `mobileInventoryController.ts:30` faz `await t.rollback()` sem checar `t.finished` (o módulo `inventory` protege: `:158`, `:162`, `:433`, `:471`) — se `t.commit()` (`:27`) falhar, o `rollback` lança erro secundário que mascara o original.

**Nota de not-a-finding (busca ativa por controle compensatório):** a validação de saldo em `ScanItemUseCase.ts:63-64` é feita **fora** de lock, mas **não** produz venda a descoberto: `adjust` chama `validateAndLock(productId, type==='out' ? quantity : undefined, ...)` (`inventoryService.ts:343-347`), que relê sob `FOR UPDATE` e rejeita com 422 (`:142-150`). **A checagem rasa é redundante, não é buraco.** Registro para que a próxima trilha não a reporte como falso positivo.

---

## 5. Superfícies verificadas e declaradas **PROTEGIDAS** (resultado negativo é resultado)

| Superfície | Controle identificado | Âncora |
|---|---|---|
| Transferência entre depósitos | lock `FOR UPDATE` + guarda `status !== 'pending'` + débito/crédito/2 movimentos/atualização na **mesma** transação | `SequelizeInventoryRepository.ts:146-151`; `ApproveWarehouseTransferUseCase.ts:44-89`; `inventoryController.ts:415-420` |
| Aprovação de contagem cíclica | lock + guarda + `updateIfStatus` + `ConflictError` + dual-write na mesma tx | `ApproveInventoryCountUseCase.ts:51-117` |
| Claim de contagem (pool) | lock + guarda de `assigned_to` na mesma tx | `StartInventoryCountUseCase.ts:61-89` |
| Liberação de lote | tx + `FOR UPDATE` + gate G7 antes de qualquer escrita | `ReleaseLotUseCase.ts:118-176` |
| Saída por lote na NF-e (FEFO) | `FOR UPDATE` na leitura de lotes do caminho de escrita; revalidação do gate sob lock | `saleLotService.ts:303-310` (`lock: true`), `:390-396` |
| Devolução ao lote (D-M) | `FOR UPDATE` em `SaleLotShipment` e em `LotControl`; idempotente por `status='shipped'` | `saleLotService.ts:471-491` |
| Saldo por depósito | `findOrCreateLocked` com `FOR UPDATE`; guarda de saldo negativo | `warehouseStockService.ts:49-71`, `:156-173`; UNIQUE `(product_id, warehouse_id)` em `20260804-000001:214-218` |
| Criação de depósito | UNIQUE `warehouses.code` no schema versionado | `20260804-000001:134-138` |
| `traceability` (3 endpoints) | leitura pura, verificada exaustivamente | `SequelizeTraceabilityRepository.ts` (integral) |
| Reserva de estoque | `FOR UPDATE` no produto e na reserva; CHECK de exatamente-um-dono no banco | `inventoryService.ts:544-551`, `:625-632` |

---

## 6. Validação do `BR_CATALOG.md` — cluster `qualidade-estoque` (validado, não copiado)

| BR | Status no catálogo | Veredito T-06 no `AUDIT_COMMIT` |
|---|---|---|
| BR-QE-004 | CONFLICTING (`BlockLotUseCase.ts:26`) | **CONFIRMADA.** `BLOCKABLE_STATUSES = ['quarantine','available']` lido em `:26`. A nota MEDIUM do discovery sobre ausência de lock é **independentemente confirmada** e **promovida** a AUD-INTEG-05 |
| BR-QE-005 | CONFIRMED (exceção mobile) | **CONFIRMADA.** `quarantineBalanceService.ts:73` (`WITHHELD_LOT_STATUSES`), `:132-138` (clamp). Exceção mobile confirmada e promovida em AUD-INTEG-03 |
| BR-QE-006 | DISCOVERED | **CONFIRMADA.** `materialReceiptService.ts:165-179` grava `status:'quarantine'` incondicionalmente sobre lote existente, sem limpar `blocked_at`, `release_inspection_id`, `released_by`, `released_at`. Acrescento: `findLotForReceipt` (`:162`) é lido **sem lock** — check-then-act cuja proteção declarada é o UNIQUE `(product_id, lot_number)` de `models/LotControl.ts:94`, **que não localizei em nenhuma migration versionada** ⇒ pedido DYN-06.4 |
| BR-QE-008 | DISCOVERED | **DIVERGENTE — incompleta.** O catálogo descreve a máquina de estados como se estivesse guardada; a transição `counting → pending_approval` **não tem** proteção alguma (AUD-INTEG-04). A BR precisa registrar a assimetria entre `submit` e `approve`/`reject` |
| BR-QE-011 | CONFLICTING, candidato CRITICAL não promovido | **CONFIRMADA por evidência própria.** Promoção proposta como AUD-INTEG-03. Acrescento consequência não catalogada: `POST /api/products/movements` tem o **mesmo** defeito (`RegisterProductMovementUseCase.ts:60-67`) — a BR menciona apenas o mobile |
| BR-QE-012 | DISCOVERED, "cobertura RASA por decisão" | **CONFIRMADA quanto ao fato**, mas a *causa* declarada é incompleta: além da associação ausente com `QualityInspection`, a rastreabilidade dos eventos de ajuste é vazia por causa de AUD-INTEG-01 (`SequelizeTraceabilityRepository.ts:107-108` lê campos que nunca são preenchidos) |
| **Lacuna** | — | **AUD-INTEG-02 não tem BR correspondente** em nenhum status. Encaminhado a T-14 |

---

## 7. Cobertura de teste — varredura das 4 pastas, não da pasta do módulo

85 arquivos em `server/tests/{unit,integration,edge,characterization}` contêm referência a inventário/lote. Leitura dirigida:

| Teste | O que de fato cobre | Efeito sobre esta trilha |
|---|---|---|
| `characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts` | Congela FIND-ERP-001 **e** a descarte de reference (`:133-136`). **`describeIntegration` — `describe.skip` sem pré-requisitos; o próprio cabeçalho (`:73-74`) declara que não foi executado** | Confirma AUD-INTEG-01 como comportamento **esperado** pelo autor do teste. Prova dinâmica pendente ⇒ DYN-02 |
| `characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts` | Exercita `ScanItemUseCase` **real** contra `inventoryService` real; asserta `warehouse_id === null` (`:178`), `type === 'adjustment'` (`:182`), `LotControl` nunca tocado (`:166-167`), drift retido > físico (`:201`) | **Corrobora AUD-INTEG-03 e AUD-INTEG-02.** Unit puro, sem banco — executável sem G4 ⇒ DYN-06.1 |
| `integration/stock-concurrency.test.ts:23-32` | Duas saídas **concorrentes** contra saldo insuficiente; asserta que **alguma** falha | Prova o **lock**, não a idempotência. Depende de `TEST_LOW_STOCK_PRODUCT_ID` no ambiente |
| `integration/product-movement-concurrency.test.ts:41-54` | Idem para `/api/products/movements`; asserta exatamente 1× 201 | Idem. **Nenhum dos dois toca dual-write nem depósito** |
| `unit/warehouse-invariants.test.ts` | 3 invariantes: faturamento (`:40`), bloqueio/liberação de lote (`:226`), contagem cíclica (`:329`) | **A suíte que existe para provar a invariante §12 não cobre o caminho que a viola.** Nenhum `it` menciona scan/mobile |
| `unit/mobileInventory-use-cases.test.ts` | 4 casos, todos de **validação de entrada** (`:6`,`:19`,`:31`,`:43`) | Confirma o "TC cego" — nenhum exercita o bypass |
| `unit/integrity-transaction-guards.test.ts` | 8 casos de lock/guarda em vendas, financeiro e compras | **Nenhum caso de `inventory`, `mobileInventory` ou contagem cíclica** |
| `integration/inventory-count-claim-concurrency.test.ts` | Corrida de claim (`start`) | Cobre o caminho **protegido**; não cobre `submit` (AUD-INTEG-04) |

**Conclusão de D7 para T-06:** existe teste de concorrência para 2 dos 5 endpoints desprotegidos, e nenhum deles testa idempotência. **AUD-INTEG-02, 04, 05, 06, 07, 08 não têm cobertura de teste alguma.**

---

## 8. Divergências com o discovery (Regra 20 — registradas, não conciliadas)

| # | Fonte | Afirmação | Leitura T-06 no `AUDIT_COMMIT` |
|---|---|---|---|
| D-1 | `FIND-ERP-001.md:226-230` | Cenário de reprodução assume `reference_id`/`reference_type` chegando à gravação | **Refutado.** Não chegam (AUD-INTEG-01). O finding continua correto no núcleo; o **cenário** precisa de correção por adição, e a remediação por UNIQUE sobre esses campos seria **inócua** |
| D-2 | `AUDIT_PLAN.md` §4.3 T-06 | Escopo cita "ausência de UNIQUE em `InventoryMovement.ts`" | **Confirmado e ampliado**: a ausência é também no schema versionado (`20260731-000019`), não só no model — e a chave candidata é inutilizável por D-1 |
| D-3 | `BR_CATALOG.md` BR-QE-008 | Máquina de estados da contagem cíclica descrita sem ressalva | **Divergente**: `submit` não tem lock, transação nem escrita condicional (AUD-INTEG-04) |
| D-4 | `BR_CATALOG.md` BR-QE-011 | Restringe o bypass ao mobile | **Divergente por omissão**: `POST /api/products/humovements` tem o mesmo defeito |
| D-5 | `CURRENT_ARCHITECTURE.md` (via T-04 §6) | — | Sem divergência de authZ nesta trilha: os 33 endpoints conferem com o mapa de T-04 (`authorizeModule` em 33/33; níveis `operate`/`approve` conforme rotas). **Consumido, não refeito** |
| D-6 | Insumo dirigido T-00/IN-07 | Ramo `item_id` em `CreateInventoryMovementUseCase.ts:80-90` | **Adjudicado por T-06.** Ramo lido integralmente: crosswalk `findLegacyProductByItemId` (`:81`) com rejeição explícita 422 quando não há produto legado (`:83-87`). **Sem defeito de integridade próprio** — não cria caminho de estoque paralelo, e o `item_id` só chega ao movimento como rastro (`:115`, `inventoryService.ts:179`). **Herda**, porém, os defeitos 01/02 do caminho comum. Superfície agora **enumerada** |

---

## 9. Pedidos DYN (`vericore-audit-verification-runner`, alvo `erp_evok_audio_test`)

Nenhuma conexão de banco foi aberta por este agente. **Nenhuma sondagem toca `erp_evok_audio`** (APR-2026-016 inviolável).

| ID | Pedido | Critério de aceite |
|---|---|---|
| **DYN-02.1** | Executar `tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts` com pré-requisitos de integração satisfeitos | 2× `201` + 2 movimentos + `quantity=20` ⇒ FIND-ERP-001 **provado dinamicamente**. Qualquer 409/422 ⇒ existe controle não localizado estaticamente, e o finding é revisto |
| **DYN-02.2** | 2 `POST /api/inventory/movements` **concorrentes** (`Promise.all`), `type:'in'`, corpo idêntico | 2× 201 ⇒ duplicidade **sob concorrência** (o que a leitura estática não prova — EMENDA-02 §8.1) |
| **DYN-02.3** | Mesmo payload com `reference_id:555`, `reference_type:'purchase'`; ler a linha gravada | `reference_type='adjustment'`, `reference_id=null` ⇒ AUD-INTEG-01 confirmado |
| **DYN-02.4** | `POST /movements` `type:'out'`; ler `inventory_movements.type` | `'adjustment'` ⇒ AUD-INTEG-02 confirmado. Complemento: `GET /movements?type=out` não retorna a linha |
| **DYN-06.1** | Executar `tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena.test.ts` (unit, **não exige banco**) | 4 casos verdes ⇒ AUD-INTEG-03 corroborado sem custo de ambiente. **Menor custo/maior retorno da fila** |
| **DYN-06.2** | `POST /api/mobile-inventory/scan` `type:'out'`; comparar `products.quantity` com `SUM(product_warehouse_stock.quantity)` antes/depois | divergência ⇒ invariante §12 item 3 rompida (AUD-INTEG-03) |
| **DYN-06.3** | Contagem em `counting`: disparar 2 `submit` concorrentes, `approve`, e reenviar o `submit` retardado; depois `approve` de novo | 2º `approve` com 200 e variâncias reaplicadas ⇒ AUD-INTEG-04 confirmado |
| **DYN-06.4** | Consultar `pg_indexes` de `inventory_counts`, `lot_controls`, `inventory_movements` em `erp_evok_audio_test` | Ausência de único em `count_number` ou em `(product_id, lot_number)` eleva AUD-INTEG-08 e a nota de BR-QE-006. **Compartilhar com DYN-05/T-13** |
| **DYN-06.5** | `block` e `release` concorrentes sobre o mesmo lote; ler a linha final | `status='blocked'` com `released_by`/`release_inspection_id` preenchidos ⇒ AUD-INTEG-05 confirmado |

---

## 10. Lacunas de verificação dinâmica declaradas (G3-b)

1. **DYN-02 bloqueada por G4.** A leitura estática prova a **ausência** de lock, UNIQUE e guarda de idempotência; **não prova** que a duplicidade ocorre em execução. É exatamente o `CONFLITO-G3×G4` da EMENDA-02 §8.1. **Nenhuma conformidade com G3 é declarada por leitura estática nesta dimensão.**
2. **Schema efetivo não observado** (RES-10). As afirmações de constraint apoiam-se em migrations versionadas e models; onde só o model declara (`InventoryCount.count_number`, `LotControl (product_id, lot_number)`), o estado real do banco **não é observável nesta run**.
3. **Ordem de resolução de locks do Postgres inferida**, não medida. Os interleavings de AUD-INTEG-04/05/06 são deriváveis do código com precisão; a janela temporal real não foi medida.
4. **9 suítes de caracterização não executadas** por este agente (regime read-only). O `CHARACTERIZATION_TESTS.md` congela o comportamento **defeituoso** — foi tratado como declaração de comportamento vigente, nunca como aprovação dele.
5. **Frequência operacional desconhecida.** Não foi possível observar com que frequência o mobile é usado nem se há perfis com `estoque:'operate'` em operação — o que afeta **exposição**, não **existência**, dos defeitos.

---

## 11. Medição de esforço (G11-c)

| Item | Valor |
|---|---|
| **Estimado (plano §4.3 / EMENDA-02 §7.1)** | **4 S** (sem delta — "já E nas dimensões vedadas") |
| **Realizado (parte estática)** | **≈1,3 S** — 1 sessão contínua, 38 operações de ferramenta (24 leituras de arquivo integrais, 14 buscas), ≈4.900 linhas de código-fonte e schema lidas, 33/33 endpoints classificados |
| **Não realizado** | **DYN-02 e os 8 pedidos DYN — bloqueados por G4.** A parcela dinâmica das 4 S permanece **não consumida e não substituível** |
| **Leitura honesta** | O estimado de 4 S **não foi refutado**: ele embutia a evidência dinâmica, que não pôde ser executada. Comparar 1,3 S realizado com 4 S estimado seria **comparar coisas diferentes** e produzir uma falsa eficiência |

**Extrapolação — advertência explícita:** o rendimento observado aqui (≈25 endpoints classificados por sessão) **não é extrapolável** às demais trilhas de W2, por três razões verificáveis: (i) `inventory` tem **um** caminho de escrita de saldo (`InventoryService.adjust`) que concentra 4 rotas — auditá-lo uma vez resolve quatro endpoints, o que não vale para `juridico` (75) ou `sst` (75), onde as regras são disjuntas; (ii) o discovery já havia mapeado o cluster `qualidade-estoque` com densidade alta (13 BRs, 2 testes de caracterização dedicados), poupando trabalho de localização — o que **não** existe em módulos com "TC cego" generalizado; (iii) T-04 §6 entregou o mapa authZ pronto, e eu o consumi sem refazer. **Projetar 1,3 S/trilha sobre W2 seria repetir o erro do SIM-002 na direção da promessa vazia.** Recomendo que o director trate esta medição como **piso de uma trilha densa e pré-mapeada**, não como média.

---

## 12. Limites de autoridade deste relatório

1. **Não corrigi nada** (Regra 2). Nenhuma escrita em `src/`, `tests/`, `product/`, `requirements/`, `architecture/`.
2. **Não confirmo finding.** Os 3 CRITICAL/HIGH (AUD-INTEG-01, 02, 03, 04) seguem **`PROPOSED`** ao `vericore-finding-validator` (Regra 22).
3. **Não fecho FIND-ERP-001**, não declaro `RETEST_PASSED` nem `FINDING CLOSED` (Regra 4). A reconfirmação de §3 é de **âncora**, não de remediação.
4. **Não persisti arquivo.** Sou read-only por desenho; a persistência em `07-findings/T-06_ESTOQUE_IDEMPOTENCIA.md` cabe ao orquestrador / `vericore-audit-evidence-controller`.
5. **Não alterei tier, escopo nem `AUDIT_COMMIT`.** Nenhuma citação a `c9359be` em nenhum ponto.
6. **Handoffs abertos:** T-05/T-16 (`POST /api/products/movements` — AUD-INTEG-03), T-13 (constraints declaradas só no model — DYN-06.4), T-14 (AUD-INTEG-02 sem BR; BR-QE-008 e BR-QE-011 incompletas), T-03 (`logAction` não aguardado), T-20 (2 characterization tests desta trilha nunca executados).

**Arquivos-chave desta trilha (caminhos absolutos):**
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\inventoryService.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\warehouseStockService.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\inventory\application\use-cases\CreateInventoryMovementUseCase.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\inventory\application\use-cases\SubmitInventoryCountUseCase.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\inventory\application\use-cases\BlockLotUseCase.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mobileInventory\application\use-cases\ScanItemUseCase.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\InventoryMovement.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\traceability\infrastructure\sequelize\SequelizeTraceabilityRepository.ts`
