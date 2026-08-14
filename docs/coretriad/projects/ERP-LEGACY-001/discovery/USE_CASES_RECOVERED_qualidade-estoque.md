# USE_CASES_RECOVERED_qualidade-estoque.md

**Programa:** ERP-LEGACY-001 · **Passo:** 28 (Casos de Uso Recuperados) · **Trilha:** VeriCore read-only
**Cluster:** `qualidade-estoque` · **Módulos:** `quality`, `nonConformities`, `traceability`, `inventory`, `mobileInventory`, `assets`, `maintenance`
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum arquivo alterado, nenhum comando/teste/banco executado (sem Bash). Só leitura de código/doc.
**AUDIT_COMMIT declarado pelo orquestrador:** HEAD `f05e865` (não reli o hash em disco — sem Bash; os artefatos foram lidos no estado atual do worktree).

> **RESSALVA GLOBAL — `DISCOVERED_USE_CASE`.** Tudo abaixo foi recuperado do CÓDIGO (rota → controller → use-case → domínio) e cruzado com a documentação, que é OBJETO DE AUDITORIA (Regra 3 do programa), não fonte de verdade. Nenhum UC aqui é oficial até validação humana. Os "candidatos a finding" NÃO são promovidos — seguem até o passo 31. BR-IDs (`BR-QE-xxx`) vêm do passo 26 (`BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`, lido nesta sessão) e são propostos, não versionados.
>
> **Convenção de atores.** O sistema não tem "ator" nominal na rota: o ator é derivado do `authorizeModule(<módulo>, <nível>)` em cada rota (arquivo:linha citado). `view` = qualquer nível presente no módulo; `operate` = operador+; `approve` = gestor da área (admin faz curto-circuito, per doc). A identidade do executor vem SEMPRE do JWT (`req.user.id`), nunca do body — confirmado em cada controller.

---

## A. Módulos `quality` + `inventory` (gate de lote) — deep dive

### UC-QUALEST-01 — Registrar inspeção de qualidade de lote (G7)
- **Objetivo:** gravar a evidência mínima de inspeção (critério, veredito, responsável, vínculo ao lote) exigida pela ISO 9001 §8.6/§8.7; reprovação abre RNC e bloqueia o lote.
- **Ator:** perfil com `qualidade:operate` — `quality/presentation/routes/qualityInspections.ts:24`.
- **Gatilho:** `POST /api/quality/inspections` — rota `qualityInspections.ts:24` → `qualityInspectionController.ts:24` (`inspectorId = req.user.id`, :27).
- **Fluxo principal:** `CreateQualityInspectionUseCase.ts:87-162` — valida `lot_id` (:89), `stage∈{incoming,in_process,final}` default `incoming` (:96-103), `verdict∈{approved,rejected,approved_under_concession}` (:105-112), `acceptance_criteria≥3` (:118-124), `concession_justification≥10` só quando concessão (:128-134), `defects_found` inteiro ≥0 (:136); cria a inspeção com `inspected_at=new Date()` server-side (:160).
- **Fluxos alternativos / exceções:** `verdict='rejected'` → delega `CreateNonConformityUseCase` com `severity='major'` e `defect_type='other'` HARDCODED (:184,:193), grava `non_conformity_id` de volta (:198-200). RNC abre transação PRÓPRIA: se falhar, inspeção fica reprovada sem RNC e devolve 500 (conservador; :168-176). `lot_id` ausente → 400; lote inexistente → 404 (:140-143).
- **Pré/pós e invariantes:** pré: lote existe. Pós: inspeção persistida; se reprovada, lote → `blocked` + RNC. Invariante: inspetor NUNCA vem do body (P0 anti-spoofing).
- **BRs:** BR-QE-002 (evidência mínima), BR-QE-003 (reprovação→RNC).
- **Classificação vs. doc: CONFIRMED.** Doc `04-USE_CASES.md` UC-17C (:601-651) descreve fielmente o fluxo. Drift menor: o limiar `acceptance_criteria≥3` (`CreateQualityInspectionUseCase.ts:51`) não aparece em nenhum documento (BR-QE-002); a doc só cita o "10" da concessão.

### UC-QUALEST-02 — Consultar elegibilidade de liberação de lote
- **Objetivo:** diagnóstico read-only do gate G7 para a tela saber se "Liberar" vai funcionar antes do clique.
- **Ator:** `qualidade:view` — `qualityInspections.ts:25`.
- **Gatilho:** `GET /api/quality/lots/:lotId/release-eligibility` — `qualityInspections.ts:25` → `qualityInspectionController.ts:55`.
- **Fluxo principal:** `GetLotReleaseEligibilityUseCase.ts:43-82` — lê lote + inspeção mais recente, aplica `decideLotRelease(latestInspection, lot.blocked_at)` (:54), retorna `{ can_release, reason, latest_inspection, ... }`. Leitura pura, sem efeito colateral.
- **Exceções:** lote inexistente → 404 (:45-47).
- **Invariante:** usa a MESMA função `decideLotRelease` (`quality/domain/constants.ts:127-155`) que o POST de liberação → tela e backend não podem divergir.
- **BRs:** BR-QE-001.
- **Classificação vs. doc: CONFIRMED (parcial).** Mencionado apenas como passo 2 dentro de UC-17C (`04-USE_CASES.md:614`); não tem UC próprio nem descrição de contrato. Documentado por referência, não por campo mínimo.

### UC-QUALEST-03 — Listar inspeções de qualidade
- **Ator:** `qualidade:view` — `qualityInspections.ts:23`.
- **Gatilho:** `GET /api/quality/inspections` — `qualityInspectionController.ts:43` → `ListQualityInspectionsUseCase`.
- **Fluxo:** leitura com filtros `lot_id/verdict/stage/inspector_id`, paginação.
- **Classificação vs. doc: CONFIRMED (raso).** Sem UC dedicado; implícito no ecossistema G7.

### UC-QUALEST-04 — Liberar lote (quarentena/bloqueio → disponível)
- **Objetivo:** decisão de liberação pós-inspeção/pós-tratativa de RNC, com gate G7.
- **Ator:** perfil com `qualidade:approve` — `inventory/presentation/routes/inventory.ts:35`. (**Atenção:** a doc UC-17B:547 diz "Ator: Inspetor de Qualidade / Almoxarife (perfis admin, operator)" — conflita com a permissão real `approve`/gestor imposta na rota e com o cenário BDD de UC-37 em `business/01-USE_CASES.md:568-572`, que devolve 403 ao operador. Ver candidato F-6.)
- **Gatilho:** `POST /api/inventory/lots/:id/release` — `inventory.ts:35` → `inventoryController.ts:311` (`releasedBy = req.user.id`, :317).
- **Fluxo principal:** `ReleaseLotUseCase.ts:118-181` — transação + `findLotByIdForUpdate` FOR UPDATE (:125), status ∈ {quarantine,blocked} senão 422 (:129-139), `decideLotRelease(latestInspection, lot.blocked_at)` (:145), grava `status='available'`, `release_inspection_id`, `released_by`, `released_at`, zera `blocked_at` (:161-173).
- **Exceções:** 404 lote inexistente; 422 `rule:'G7'` com `reason∈{no_inspection, last_inspection_rejected, inspection_before_block}` (`constants.ts:82`), NADA gravado (:147-158).
- **Pós/invariante:** liberação é ato distinto da inspeção; empate de instante (`inspected_at == blocked_at`) NÃO libera (lado seguro, `constants.ts:180`).
- **BRs:** BR-QE-001 (gate G7).
- **Classificação vs. doc: CONFLITANTE.** `docs/qualidade/01-CONTROLE_QUALIDADE.md:154` e `04-USE_CASES.md:582-586` listam apenas 2 motivos de recusa (`no_inspection`, `last_inspection_rejected`); o código tem um TERCEIRO desde 2026-08-11: `inspection_before_block` (`ReleaseLotUseCase.ts:114,195`, `constants.ts:82`). `API.md:2092-2102` está correto. Candidato a finding F-2 (= L-7 do passo 26).

### UC-QUALEST-05 — Bloquear lote (contenção de qualidade)
- **Objetivo:** conter material sob investigação (quarentena/disponível → bloqueado) gravando `blocked_at`.
- **Ator:** `qualidade:approve` — `inventory.ts:36`.
- **Gatilho:** `POST /api/inventory/lots/:id/block` — `inventoryController.ts:349`.
- **Fluxo principal:** `BlockLotUseCase.ts:50-80` — `reason≥3` senão 400 (:51-54), status ∈ {quarantine,available} senão 422 (:60-69), grava `status='blocked'`, `blocked_at=new Date()` (:71-77).
- **BRs:** BR-QE-004 (statuses bloqueáveis — CONFLICTING).
- **Classificação vs. doc: CONFIRMED com divergência estrutural.** A doc UC-17B (fluxo alternativo, `04-USE_CASES.md:571`) descreve bloqueio de `quarantine|available` — casa com `BlockLotUseCase.ts:26`. Porém o MESMO doc, em UC-17 (:514), descreve bloqueio de `available|quarantine|reserved` — que é a lista do caminho RNC (`CreateNonConformityUseCase.ts:15`). **Duas listas incompatíveis para a mesma regra**, uma em cada UC do próprio documento: um lote `reserved` NÃO bloqueia por este endpoint mas bloqueia via RNC. Candidato a finding F-3 (= BR-QE-004 / L-3). Nota adicional: este use-case NÃO usa transação/lock (`:56` `findLotById`), assimétrico com o `release` que usa FOR UPDATE.

---

## B. Módulo `nonConformities` (RNC) — deep dive

### UC-QUALEST-06 — Registrar não conformidade (RNC)
- **Objetivo:** registrar defeito/RNC, conter o lote referenciado, realimentar rating do fornecedor e (opcional) disparar devolução ao fornecedor.
- **Ator:** `qualidade:operate` — `nonConformities/presentation/routes/nonConformities.ts:19`.
- **Gatilho:** `POST /api/quality/non-conformities` — `nonConformityController.ts:41` (`reportedBy = req.user.id`, :44).
- **Fluxo principal:** `CreateNonConformityUseCase.ts:113-216` — `description` obrigatória senão 400 (:130); transação (:134); resolve lote por `(product_id, lot_number)` (:143-145); defaults `severity='minor'`, `origin='in_process'`, `defect_type='other'`, `status='open'`, `nc_number=NC-<epoch>` (:160-175); bloqueia lote se status ∈ {available,quarantine,reserved} gravando `blocked_at` (:183-194); recalcula `suppliers.quality_score = MAX(0,100−rncs/recebimentos×100)` (:196-198,274-286).
- **Fluxos alternativos / exceções (G10):** se não bloquear lote, RNC nasce assim mesmo com aviso persistido em `notes` prefixado `[ATENCAO: NENHUM LOTE BLOQUEADO]` e desfecho `not_found|not_blockable|not_informed|not_applicable` (:226-259). `immediate_action='return_supplier'` → `applySupplierReturn` na mesma transação (:200-208).
- **BRs:** BR-QE-009 (classificação/efeito), BR-QE-004 (lista bloqueável), BR-QE-010 (devolução), L-10 (quality_score pertence a Suprimentos).
- **Classificação vs. doc: CONFIRMED.** `04-USE_CASES.md` UC-17 (:501-541) descreve fielmente bloqueio best-effort, aviso G10 e não-desbloqueio automático. Drift: a classificação `severity/defect_type/origin` não tem critério documentado (quem escolhe `major`×`minor` e com que consequência) — BR-QE-009 DISCOVERED.

### UC-QUALEST-07 — Atualizar não conformidade
- **Ator:** `qualidade:operate` — `nonConformities.ts:20`.
- **Gatilho:** `PUT /api/quality/non-conformities/:id` — `nonConformityController.ts:52` (`closedBy = req.user.id`, :55).
- **Fluxo principal:** `UpdateNonConformityUseCase.ts:73-127` — copia apenas `ALLOWED_FIELDS` (:26-36,74-77); ao mudar `status='closed'` deriva `closed_date/closed_by` via `buildClosureFields` (:78-87, `domain/closure.ts`); transição de `immediate_action→'return_supplier'` (anti-duplicação, valor já vigente não redispara) aciona `applySupplierReturn` (:94-120).
- **BRs:** BR-QE-009 (sem máquina de estados), BR-QE-010.
- **Classificação vs. doc: CONFLITANTE (candidato a finding F-1 / L-2).** Dois conflitos confirmados:
  1. **`effectiveness_result` é inescrevível pela API.** Não está em `ALLOWED_FIELDS` (`UpdateNonConformityUseCase.ts:26-36`) e nenhum ponto do backend o escreve. Porém o semáforo de handoff — regra de negócio documentada de UC-40 (`04-USE_CASES.md:1833`, `business/01-USE_CASES.md:783`, `shared/domain/handoffSignal.ts`) — pinta de VERMELHO toda RNC `closed` com `effectiveness_result != 'effective'`. Regra documentada cuja pré-condição não tem caminho de escrita → toda RNC fechada fica permanentemente "Reincidente".
  2. **Sem grafo de transição de status.** `status` vem do body sem validação de máquina de estados; `closed→open` é possível. UC-17 (:529) trata `effectiveness_result='effective'` como transição real que o sistema não permite gravar.

### UC-QUALEST-08 — Encerrar não conformidade (soft delete via DELETE)
- **Ator:** `qualidade:approve` — `nonConformities.ts:21`.
- **Gatilho:** `DELETE /api/quality/non-conformities/:id` — `nonConformityController.ts:63` (`closedBy = req.user.id`, :69).
- **Fluxo principal:** `CloseNonConformityUseCase.ts:45-54` — grava `status='closed'` + `closed_date/closed_by` (`buildClosureFields`). NÃO exige `root_cause` nem `corrective_action`.
- **BRs:** BR-QE-009 (encerramento sem pré-requisito — ISO 9001 §10.2).
- **Classificação vs. doc: CONFLITANTE (parcial).** O endpoint `DELETE` como caminho de encerramento NÃO é documentado — a doc UC-17:529-532 descreve o fechamento apenas como `status=closed` via PUT. Encerrar sem causa raiz/ação corretiva contraria ISO 9001 §10.2 citada na própria doc. Candidato a finding F-1 (relacionado, L-2).

### UC-QUALEST-09 — Devolver ao fornecedor (sub-fluxo de RNC)
- **Objetivo:** consequência física de `immediate_action='return_supplier'`: estorno de estoque OU mudança de status do ativo.
- **Ator/Gatilho:** não tem endpoint próprio — disparado por UC-QUALEST-06 e UC-QUALEST-07.
- **Fluxo principal:** `SupplierReturnHandler.ts:66-152` — `asset_id` → `Asset.status='returned_to_supplier'` com lock, e RETORNA (mutuamente exclusivo, :86-100); `purchase_item_id` com `Item.tipo ∈ STOCK_ITEM_TYPES` (ou legado sem `item_id` = produtivo por default) → `InventoryService.consume` estornando (:106-149).
- **Exceções silenciosas:** `quantity_affected` ausente/≤0 → NO-OP sem aviso (:129-134); nenhum id → no-op (:102-103); estorno decrementa `products.quantity` SEM `warehouse_id` e SEM baixar lote (:138-148).
- **BRs:** BR-QE-010.
- **Classificação vs. doc: código sem UC (implementado-sem-UC).** Origem é `TODO_REORGANIZACAO_DEPARTAMENTOS.md` Bloco B, não UC versionado. As exceções silenciosas (c)/(d) não têm registro em documento de negócio.

*(Leituras `GET /` e `GET /:id` de RNC — `ListNonConformitiesUseCase`/`GetNonConformityByIdUseCase`, `nonConformities.ts:17-18`, `qualidade:view` — cobertas por UC-40 handoff; sem UC próprio.)*

---

## C. Módulo `inventory` — movimentos, depósitos, transferências

### UC-QUALEST-10 — Registrar movimentação de estoque (entrada/saída/ajuste)
- **Ator:** `estoque:operate` — `inventory.ts:25`.
- **Gatilho:** `POST /api/inventory/movements` — `inventoryController.ts:113` (`userId = req.user.id`, :133).
- **Fluxo principal:** `CreateInventoryMovementUseCase.ts:71-123` — dual-read `item_id`→produto legado por crosswalk (:80-90); saída valida saldo do depósito via `WarehouseStockService.removeFromWarehouse` (:103-105); `InventoryService.adjust` com `warehouse.id` (:107-116); entrada credita depósito (:118-120). Default depósito `INSUMOS`.
- **BRs:** invariante §12 item 3 (products.quantity = soma por depósito).
- **Classificação vs. doc: código sem UC.** Não há UC dedicado a movimentação manual de estoque; a doc só descreve a invariante em `BUSINESS_RULES.md §12`. Candidato a finding F-8 (comportamento com efeito financeiro sem UC).

### UC-QUALEST-11 — Criar depósito
- **Ator:** `estoque:approve` — `inventory.ts:43`. **Gatilho:** `POST /api/inventory/warehouses` — `inventoryController.ts:537`.
- **Fluxo:** `CreateWarehouseUseCase` — `code` único normalizado uppercase.
- **Classificação vs. doc: CONFIRMED.** UC-42 Fluxo A (`04-USE_CASES.md:1909`, `business/01-USE_CASES.md:1020`).

### UC-QUALEST-12 — Editar depósito
- **Ator:** `estoque:approve` — `inventory.ts:44`. **Gatilho:** `PUT /api/inventory/warehouses/:id` — `inventoryController.ts:570`.
- **Fluxo:** `UpdateWarehouseUseCase` — `code` nunca editável (chave de roteamento do dual-write).
- **Classificação vs. doc: CONFIRMED.** UC-42.

### UC-QUALEST-13 — Solicitar transferência entre depósitos
- **Ator:** `estoque:operate` — `inventory.ts:47`. **Gatilho:** `POST /api/inventory/transfers` — `inventoryController.ts:378`.
- **Fluxo:** `CreateWarehouseTransferUseCase` — cria em `pending`, não altera saldo.
- **Classificação vs. doc: CONFIRMED.** UC-42 Fluxo F (`04-USE_CASES.md:1943`).

### UC-QUALEST-14 — Aprovar transferência
- **Ator:** `estoque:approve` — `inventory.ts:48`. **Gatilho:** `PUT /api/inventory/transfers/:id/approve` — `inventoryController.ts:414`.
- **Fluxo:** `ApproveWarehouseTransferUseCase` — débito/crédito atômico + 2 `InventoryMovement` type `transfer`.
- **Classificação vs. doc: CONFIRMED.** UC-42 Fluxo F.

### UC-QUALEST-15 — Rejeitar transferência
- **Ator:** `estoque:approve` — `inventory.ts:49`. **Gatilho:** `PUT /api/inventory/transfers/:id/reject` — `inventoryController.ts:448`.
- **Fluxo:** `RejectWarehouseTransferUseCase` — `reason` obrigatório, não altera saldo.
- **Classificação vs. doc: CONFIRMED.** UC-42 Fluxo F.

*(Leituras de estoque — `GET /movements`, `/movements/:id`, `/stock-report`, `/low-stock`, `/lots`, `/lots/by-code/:lot_number`, `/lots/:id/qrcode`, `/warehouses`, `/warehouse-stock`, `/transfers`, todas `estoque:view` em `inventory.ts:23-46` — read-only sem regra própria; sem UC dedicado.)*

---

## D. Submódulo `inventory-counts` (Inventário Cíclico F09)

### UC-QUALEST-16 — Realizar contagem de inventário cíclico (ciclo completo)
- **Objetivo:** contagem física com máquina de estados `draft→counting→pending_approval→adjusted|rejected` e ajuste de estoque na aprovação.
- **Atores:** create/start/count/submit = `contagens:operate`; reassign/approve/reject = `contagens:approve` — `inventory/presentation/routes/inventoryCounts.ts:23-31`.
- **Gatilhos (7 endpoints, `inventoryCountController.ts`):**
  - `POST /api/inventory-counts` → create (:61), `warehouse_id` obrigatório, `assigned_to` opcional (pool).
  - `POST /:id/start` → start (:149), claim do pool; atribuída a outro = 409 salvo admin override (:152-156).
  - `PUT /:id/reassign` → reassign (:189), só draft/counting.
  - `POST /:id/items/:itemId/count` → countItem (:223), `variance = counted − system_quantity`.
  - `POST /:id/submit` → submit (:257), exige ≥1 item e zero pendentes.
  - `POST /:id/approve` → approve (:285) → `ApproveInventoryCountUseCase.ts:50-125`: FOR UPDATE (:56), só `pending_approval` (:60), exige `warehouse_id` (:63-72), para cada `variance≠0` aplica `InventoryService.adjust` + `WarehouseStockService` no depósito (:77-100), `updateIfStatus` condicional (409, :107-115).
  - `POST /:id/reject` → reject (:312), sem ajuste, sem lock.
- **BRs:** BR-QE-008 (máquina de estados completa).
- **Classificação vs. doc: código sem UC (implementado-sem-UC).** NÃO existe UC no catálogo. Aparece apenas como nó `UCCONT "Inventário Cíclico (pool/atribuídas — mobile/)"` no BPMN (`DIAGRAMA_CASOS_DE_USO_BPMN.md:74`, sem número de UC) e como menção de passagem em UC-42 (`business/01-USE_CASES.md:1115-1119`). Todo o ciclo de vida — claim concorrente, admin override, ajuste de estoque — está sem campo mínimo documentado. **Candidatos a finding F-4 (= L-4):** (a) NÃO há política de tolerância de variância/recontagem — variância de 1 e de 10.000 percorrem o mesmo caminho e ambas ajustam estoque; (b) autoaprovação NÃO é impedida — `ApproveInventoryCountUseCase.ts:50-125` nunca compara `approverId` com quem contou.

---

## E. Módulo `mobileInventory`

### UC-QUALEST-17 — Movimentar estoque via scanner mobile (scan/lote)
- **Ator:** `estoque:operate` — `mobileInventory/presentation/routes/mobileInventory.ts:17-18`.
- **Gatilho:** `POST /api/mobile-inventory/scan` e `/batch` — `mobileInventoryController.ts:21,36` (`userId = req.user.id`).
- **Fluxo principal:** `ScanItemUseCase.ts:45-81` — exige `product_code`, `quantity` (parseInt>0), `type∈{in,out}`; para saída valida APENAS `product.quantity >= qty` (:63-64); `InventoryService.adjust` com 6 argumentos, SEM `warehouseId` (:67-74). `BatchScanUseCase` = mesmo caminho.
- **BRs:** BR-QE-011 (CONFLICTING, CRITICAL).
- **Classificação vs. doc: código sem UC + CONFLITANTE (candidato a finding F-5 / L-1, CRITICAL).** Nenhum UC no catálogo cobre o scan mobile. Além disso, o comportamento CONTRARIA regra documentada (`BUSINESS_RULES.md §12` item 3): (1) debita `products.quantity` global e nenhum depósito (viola a invariante); (2) ignora saldo retido em quarentena/bloqueio (BR-QE-005) — **permite baixar material que a Qualidade não liberou**, exatamente o "uso não pretendido" que a ISO 9001 §8.7 existe para impedir; (3) ignora `lot_controls` — quebra a cadeia lida pelo domínio `traceability`. Deve passar pelo vericore-finding-validator (CRITICAL).

*(`GET /movements` — `estoque:view`, `mobileInventory.ts:19` — read-only.)*

---

## F. Módulo `traceability`

### UC-QUALEST-18 — Rastrear item / lote / ordem de produção
- **Ator:** `rastreabilidade:view` — `traceability/presentation/routes/traceability.ts:22-24`.
- **Gatilhos:** `GET /api/traceability/items/:id`, `/lots/:id`, `/production-orders/:id` — `traceabilityController.ts` → `GetItem/GetLot/GetProductionOrderTraceabilityUseCase`.
- **Fluxo:** leitura pura, delega ao repositório, sem regra de negócio própria.
- **BRs:** BR-QE-012 (cobertura rasa; histórico de lote NÃO inclui inspeções de qualidade — associação `QualityInspection` não registrada em `models/index.ts`, admitido em `SequelizeQualityRepository.ts:4-11`).
- **Classificação vs. doc: CONFIRMED (raso).** Documentado como MÓDULO (UC-38, `business/01-USE_CASES.md:595-630`) sob o ângulo de permissão, não como UC com fluxo/contrato dos 3 endpoints. A limitação estrutural (não enxerga a Qualidade) não está no UC. Candidato a finding F-7 (rastreabilidade que não rastreia qualidade — MEDIUM).

---

## G. Módulos `assets` + `maintenance`

### UC-QUALEST-19 — Gerenciar ativos / patrimônio (CRUD + baixa)
- **Atores:** list/get/qrcode `patrimonio:view`; create/update/photo `patrimonio:operate`; delete `patrimonio:approve` — `assets/presentation/routes/assets.ts:18-24`.
- **Gatilhos:** `GET/POST/PUT/DELETE /api/assets`, `POST /:id/photo`, `GET /:id/qrcode` — `assetController.ts`.
- **Fluxo relevante (baixa):** `DELETE /:id` → `DeactivateAssetUseCase.ts:36` — soft delete gravando `status='decommissioned'` (o valor `inactive` nunca existiu no ENUM e causava 500, corrigido 2026-08-06). ENUM real: `active|in_maintenance|decommissioned|lost|returned_to_supplier`.
- **Nota (INFO):** `CreateAssetUseCase`/`UpdateAssetUseCase` recebem `req.body` direto sem extrair `userId` do JWT (`assetController.ts:60,71`) — sem `created_by`/`updated_by` de identidade verificada nesses dois; contrasta com o padrão anti-spoofing dos demais UCs do cluster.
- **BRs:** BR-QE-013.
- **Classificação vs. doc: código sem UC (implementado-sem-UC).** Não há UC dedicado a ativos no catálogo; o patrimônio só aparece como pré-condição de UC-18 (manutenção) e como destino de devolução (UC-QUALEST-09). Origem é `HANDOFF_CODEX.md` + migration `20260805-000006`.

### UC-QUALEST-20 — Gerenciar ordem de manutenção (ciclo + sincronização de ativo)
- **Atores:** list/get `manutencao:view`; create/update `manutencao:operate`; delete `manutencao:approve` — `maintenance/presentation/routes/maintenance.ts:19-23`.
- **Gatilhos:** `GET/POST/PUT/DELETE /api/maintenance` — `maintenanceController.ts`.
- **Fluxo principal:** create → `CreateMaintenanceOrderUseCase.ts:46-76` (`asset_id`+`description` obrigatórios; `order_number=OM-<ano>-NNNN` via advisory lock; `priority` default `normal`; `maintenance_type` default `corrective`; `status='open'`). update → `UpdateMaintenanceOrderUseCase.ts:74-103`: transição `in_progress` marca ativo `in_maintenance` (:91-92); `completed` devolve ativo a `active` só se não houver outra OM aberta e o ativo não tiver sido baixado (:93-94). delete → `CancelMaintenanceOrderUseCase` (`maintenanceController.ts:85`).
- **BRs:** BR-QE-013 (OM sem grafo de transições — `status` vem do body, `completed→open` possível).
- **Classificação vs. doc: CONFLITANTE.** `04-USE_CASES.md` UC-18 (:658-669) descreve um fluxo idealizado que diverge do código nos dois sentidos:
  - **Doc promete, código não faz (OBSOLETE_CANDIDATE):** UC-18 passo 7 "Sistema programa próxima manutenção preventiva" — não há agendamento preventivo em nenhum use-case do módulo; passo 5 "peças trocadas" mapeia para colunas que não são preenchidas pelo contrato atual (`UpdateMaintenanceOrderUseCase.ts:21-22` — `parts_used` foi removido do contrato).
  - **Código faz, doc não descreve:** toda a sincronização `Asset.status` (in_maintenance / release) na mesma transação não consta no UC-18. O BPMN (`DIAGRAMA_CASOS_DE_USO_BPMN.md:280-311`) descreve a sincronização, mas o catálogo de UC não.

---

## OBSOLETE_CANDIDATE (UC do doc sem código alcançável, ou código sem rota)

| Item | Fonte | Situação | Evidência |
|---|---|---|---|
| UC-18 passo 7 "programa próxima manutenção preventiva" | `04-USE_CASES.md:669` | **Documentado, sem implementação.** Nenhum use-case de `maintenance` agenda preventiva. | `maintenance/application/use-cases/*` (nenhum agendamento); rotas `maintenance.ts:19-23` |
| UC-18 passo 5 "peças trocadas" | `04-USE_CASES.md:667` | **Documentado, contrato removido.** `parts_used` retirado do UPDATE. | `UpdateMaintenanceOrderUseCase.ts:21-22` |
| — | — | Nenhum use-case de código órfão (sem rota) encontrado no cluster. Todos os use-cases resolvidos por Glob estão wired a controller+rota (confirmado). | Glob `modules/*/use-cases` vs. `presentation/controllers` + `routes` |

Nota: NÃO classifiquei nenhum UC como FANTASMA puro (UC do doc que descreve comportamento inexistente por inteiro). Os desalinhamentos são parciais (drift/conflito), registrados nos UCs acima.

---

## Contagem por classificação

| Classificação | Qtde | UCs |
|---|---|---|
| CONFIRMED (fiel ou com drift menor) | 11 | 01, 02, 03, 05, 11, 12, 13, 14, 15, 18 (+ ressalva de doc rasa em 02, 03, 18) |
| CONFLITANTE (doc × código divergem) | 4 | 04, 07, 08, 20 |
| Código sem UC (implementado sem caso de uso no catálogo) | 5 | 09, 10, 16, 17, 19 |
| OBSOLETE_CANDIDATE (doc sem código) | 2 sub-itens | UC-18 passos 5 e 7 |

*(Reconciliação: 20 UCs recuperados. "CONFIRMED" agrupa 11 vereditos; alguns UCs CONFIRMED carregam ressalva de doc rasa — 02, 03, 18. UC-05 é CONFIRMED com divergência estrutural de lista bloqueável, também rastreada como candidato F-3.)*

---

## Candidatos a finding (NÃO promovidos — seguem até o passo 31; CRITICAL/HIGH exigem vericore-finding-validator)

- **F-5 (CRITICAL, CONFIRMED) — UC-QUALEST-17:** scan mobile fura quarentena, depósito e lote (`ScanItemUseCase.ts:63-74`), contrariando `BUSINESS_RULES.md §12` item 3 e a contenção ISO 9001 §8.7. = L-1 do passo 26.
- **F-1 (HIGH, CONFIRMED) — UC-QUALEST-07/08:** `effectiveness_result` sem caminho de escrita (`UpdateNonConformityUseCase.ts:26-36`) torna a regra de semáforo de UC-40 inaplicável (toda RNC fechada fica vermelha); encerramento sem causa raiz/ação corretiva (ISO 9001 §10.2). = L-2.
- **F-3 (HIGH, CONFIRMED) — UC-QUALEST-05/06:** duas listas de statuses bloqueáveis (`BlockLotUseCase.ts:26` × `CreateNonConformityUseCase.ts:15`); `reserved` só bloqueável por caminho indireto. O próprio documento reflete as duas listas (UC-17 × UC-17B). = L-3 / BR-QE-004.
- **F-4 (HIGH, CONFIRMED) — UC-QUALEST-16:** contagem cíclica sem política de tolerância/recontagem e sem impedir autoaprovação (`ApproveInventoryCountUseCase.ts:50-125`); ajuste de estoque de qualquer magnitude por ator único. Todo o ciclo sem UC no catálogo. = L-4.
- **F-2 (MEDIUM, CONFIRMED) — UC-QUALEST-04:** doc lista 2 motivos de recusa; código tem 3 (`inspection_before_block`) desde 2026-08-11 (`ReleaseLotUseCase.ts:114`; `01-CONTROLE_QUALIDADE.md:154`, `04-USE_CASES.md:584-586`). = L-7.
- **F-6 (MEDIUM, CONFIRMED) — UC-QUALEST-04:** ator documentado (UC-17B:547 "admin/operator/Almoxarife") conflita com a permissão real imposta na rota (`inventory.ts:35` = `qualidade:approve`/gestor) e com o BDD de UC-37 (`business/01-USE_CASES.md:568-572`). **Fronteira com o authorization-auditor:** este agente registra apenas a divergência UC-declarado × imposto-no-backend; a matriz USER→ROLE→PERMISSION é do authorization-auditor (coordenar via director).
- **F-7 (MEDIUM, CONFIRMED) — UC-QUALEST-18:** rastreabilidade de lote não inclui inspeções de qualidade (associação ausente, `SequelizeQualityRepository.ts:4-11`). BR-QE-012.
- **F-8 (LOW/MEDIUM, CONFIRMED) — UC-QUALEST-10 + 16 + 17 + 19:** comportamentos com efeito de estoque/financeiro sem UC no catálogo (movimentação manual, contagem cíclica, scan mobile, ativos). Insumo direto para o vericore-traceability-auditor (BR→REQ→UC→TC nasce quebrada nesta metade — = L-9).
- **INFO — UC-QUALEST-19:** `Create/UpdateAssetUseCase` não vinculam identidade do JWT (`assetController.ts:60,71`), fora do padrão anti-spoofing do cluster.

---

## Fronteiras e ressalvas de método

- **Fronteira com authorization-auditor:** todos os atores acima foram derivados do `authorizeModule(...)` da rota (arquivo:linha citado) apenas para checar a permissão DECLARADA no UC vs. IMPOSTA no backend. A matriz de autorização completa (USER→ROLE→PERMISSION, curto-circuito de admin, sub-permissões de `relatorios`/depósito de UC-38/UC-42) é do authorization-auditor.
- **Delimitação com business-rule-auditor:** BRs referenciadas pelo passo 26 (lido em disco nesta sessão), não reabertas; o achado estrutural `inventory→quality` sem porta (DOMAIN_MAP) não é repetido.
- **Read-only reforçado cumprido:** nenhum arquivo alterado, nenhum teste/script/comando de banco executado. `04-USE_CASES.md` (2881 linhas) foi acessado só por grep + leitura das seções do cluster, nunca inteiro. Nenhum número foi copiado de contexto injetado (claudeMd/memória) sem releitura direta em disco.

*Produzido pela trilha `vericore-use-case-auditor` em modo read-only. Saída devolvida como texto para persistência pelo orquestrador (hook org-isolation bloqueia escrita de VeriCore fora de `audit/`). Todo UC é `DISCOVERED_USE_CASE` até validação humana (Regra 18).*
