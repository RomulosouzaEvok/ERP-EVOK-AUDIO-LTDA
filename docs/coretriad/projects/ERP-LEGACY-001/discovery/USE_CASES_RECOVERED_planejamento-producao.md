# Casos de Uso Recuperados — Cluster `planejamento-producao`

**Programa:** ERP-LEGACY-001 · **Passo:** 28 (trilha VeriCore read-only) · **AUDIT_COMMIT alvo:** `f05e865` (HEAD real; números do claudeMd ignorados)
**Cluster:** `planejamento-producao`
**Módulos:** `mrp`, `production`, `workCenters`, `masterProduction`, `engineering`, `laboratory` (confirmados em `server/src/modules/<módulo>/` via Glob)
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum arquivo alterado. Sem execução, sem banco, sem teste rodado.

> **RESSALVA GLOBAL — `DISCOVERED_USE_CASE`.** Tudo abaixo foi recuperado a partir do **código** (rota → controller → use-case → domínio) e cruzado com a documentação **sem confiar nela** (Regra 2 do programa). Cada UC-ID `UC-PLAN-NN` é **proposto aqui** e **não existe** em nenhum artefato versionado: permanece `DISCOVERED_USE_CASE` até validação humana. A "classificação vs. doc" compara com `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` e `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` — **os três são OBJETO DE AUDITORIA**. Nenhum finding é promovido aqui (seguem até o passo 31). BR-IDs citados são os propostos no passo 26 (`BUSINESS_RULE_CANDIDATES_planejamento-producao.md`), ainda não catalogados.

**Convenção de permissão observada:** toda rota do cluster impõe autorização **no backend** via `authenticate` + `authorizeModule(<modulo>[, nivel])` (middleware `server/src/middlewares/auth`), montadas em `server/app.ts`. Leitura = nível `view` implícito; escrita comum = `operate`; atos de aprovação = `approve`. Não é controle só de UI. Módulos-piloto (`engenharia`, `laboratorio`) compõem **em camada** um `authorize('admin'/'operator')` legado adicional.

Mounts (server/app.ts): `:169 /api/production-orders` · `:170 /api/production/downtimes` · `:172 /api/production/routes` · `:177 /api/production/master-plans` · `:178 /api/work-centers` · `:195 /api/engineering` · `:196 /api/laboratory` · `:202 /api/mrp`.

---

## Bloco A — MRP (hub: explosão de BOM, netting, requisição, conversão em OP)

### UC-PLAN-01 — Gerar/atualizar Plano MRP (netting conjunto + auto-conversão)
- **Objetivo:** a partir de demandas manuais, explodir a BOM, netar contra o estoque de planejamento e persistir ordens planejadas; opcionalmente fechar o ciclo em requisição de compra para itens com opt-in.
- **Atores:** qualquer usuário com `mrp:operate` (`mrp.ts:14`, `authorizeModule('mrp','operate')`). O `requester_id` vem do JWT (`mrpController.ts:62`), nunca do body.
- **Gatilho:** `POST /api/mrp/plan` → `mrpController.generatePlan` (`mrpController.ts:55`).
- **Fluxo principal:** `GenerateMrpPlanUseCase.execute` (`GenerateMrpPlanUseCase.ts:76`): normaliza demandas (:77-83), lê arestas ativas e posições de estoque (:85-101), **neta UMA vez** via `calculateMrpPlan` (`mrpEngine.ts:221-268`, agregação por `itemId|dueDateISO`, `available = max(0, onHand−reserved−safetyStock)`, `planned = ceil(net/lote)*lote`), depois rateia por origem (`allocatePlanByOrigin.ts:139-260`) e faz upsert em transação (:145-154).
- **Fluxos alternativos / exceções:** payload inválido → `ValidationError` (Zod `createMrpPlanSchema`, `mrpValidators.ts:12-20`; controller :77-82). Ciclo de BOM na explosão → `BusinessRuleError` (`mrpEngine.ts:188-190`). Auto-conversão só dispara com `items.conversao_automatica=true` e repositórios injetados (`GenerateMrpPlanUseCase.ts:172-231`); sem `requester_id` é no-op (:177).
- **Pré/pós e invariantes:** netting é **conjunto** (BR-PP-010); lote mínimo aplicado no agregado, antes do rateio (BR-PP-011); status só grava em linha NOVA (upsert não reescreve status — :137-140); a explosão do motor **ignora `is_phantom`** e desce toda aresta ativa (`mrpEngine.ts:164,184-206` — BR-PP-016b, divergente da explosão de produção).
- **BRs:** BR-PP-010, BR-PP-011, BR-PP-012, BR-PP-013, BR-PP-014, BR-PP-016b.
- **Classificação vs. doc:** **FANTASMA.** Não existe cartão de UC para `POST /api/mrp/plan` em `04-USE_CASES.md` — é apenas **referenciado** como "UC de geração de plano" (`04-USE_CASES.md:1055`) e como pré-condição de UC-24 (`:984`). No BPMN aparece só como nó de sistema ("Sistema (MRP síncrono…)", `DIAGRAMA…:37`), não como UC. O hub do cluster não tem UC documentado.

### UC-PLAN-02 — Listar Ordens Planejadas do MRP
- **Objetivo:** consultar as ordens planejadas persistidas.
- **Ator:** `mrp:view` (`mrp.ts:15`). **Gatilho:** `GET /api/mrp/planned-orders` → `listPlannedOrders` (`mrpController.ts:85`) → `ListPlannedOrdersUseCase.execute` (`ListPlannedOrdersUseCase.ts:15`).
- **Classificação vs. doc:** **FANTASMA.** Sem cartão próprio; leitura só citada indiretamente.

### UC-PLAN-03 — Converter Ordens Planejadas em Requisição de Compra
- **Objetivo:** consolidar um lote de ordens planejadas (`RASCUNHO`/`APROVADA`) numa **única** requisição de compra, sugerindo fornecedor preferencial.
- **Atores:** `mrp:operate` (`mrp.ts:16`); `requester_id` do JWT (`mrpController.ts:111`).
- **Gatilho:** `POST /api/mrp/planned-orders/convert` → `convertPlannedOrders` (`mrpController.ts:100`).
- **Fluxo principal:** `ConvertPlannedOrdersToRequisitionUseCase.execute` (`ConvertPlannedOrdersToRequisitionUseCase.ts:59`): lock `FOR UPDATE` (:63), valida existência (:65-69) e status convertível (:71-78), cria requisição via helper `createRequisitionFromPlannedOrders` (:80-88 / `createRequisitionFromPlannedOrders.ts:63-124`), marca ordens `EM_EXECUCAO` (:101).
- **Exceções:** id inexistente → 404 (:67); status inválido → 422 (:73); nada convertível → 422 (:94-99).
- **Invariantes:** deduplicação por id + idempotência por status no helper (`createRequisitionFromPlannedOrders.ts:71-88`); cabeçalho vazio nunca criado (retorno `null`).
- **BRs:** BR-PP-014.
- **Classificação vs. doc:** **CONFIRMED** com **ressalva de ator**. `04-USE_CASES.md:980-1030` (UC-24) descreve o fluxo com fidelidade. Porém `UC-24` (`:982`) declara ator "Planejador de PCP (`admin`, `operator`)" — **o código não impõe papel**, só `authorizeModule('mrp','operate')` (`mrp.ts:16`), sem `authorize('admin','operator')`. Divergência de ator declarado × permissão imposta (candidato a finding LOW/doc-drift).

### UC-PLAN-04 — Converter Ordens Planejadas em Ordem de Produção
- **Objetivo:** para itens de fabricação própria (`SUBCONJUNTO`/`PRODUTO_ACABADO`), gerar **uma OP por ordem planejada** convertida.
- **Atores:** `mrp:operate` (`mrp.ts:17`); `requester_id` do JWT (`mrpController.ts:150`).
- **Gatilho:** `POST /api/mrp/planned-orders/convert-to-production` → `convertPlannedOrdersToProduction` (`mrpController.ts:140`).
- **Fluxo principal:** `ConvertPlannedOrdersToProductionOrderUseCase.execute` (`…ToProductionOrderUseCase.ts:99`): lock (:103), valida existência/status (:105-118), por ordem valida tipo de item (:128), produto legado por crosswalk (:136-155, aceita `finished` **e** `semi_finished`), disponibilidade de BOM/material (:157-188, G16), numeração serializada (:198-199), cria OP `planned` (:201-211), marca `EM_EXECUCAO` (:217).
- **Exceções:** item de compra (`MATERIA_PRIMA`) → 422 (:128-134); sem produto legado / inativo / tipo errado → 422 (:137-155); sem BOM ativa (404 de `explodeBOM`) → 422 didático (:164-172); sem material → 422 (:174-188).
- **BRs:** BR-PP-015 (caminho B), BR-PP-016.
- **Classificação vs. doc:** **CONFIRMED** (documentado **dentro** de UC-12, `04-USE_CASES.md:287-300`, como o "caminho do planejamento"). Ressalva: não tem cartão/UC-ID próprio — é um dos três caminhos de criação de OP (BR-PP-015), com rigor de tipo **diferente** dos outros dois.

---

## Bloco B — Ordem de Produção (ciclo de vida, criação, apontamento)

### UC-PLAN-05 — Criar Ordem de Produção (manual)
- **Objetivo:** abrir OP `planned` para produto acabado.
- **Atores:** `producao:operate` (`productionOrders.ts:30`); `created_by` do JWT (`productionOrderController.ts:99`).
- **Gatilho:** `POST /api/production-orders` → `create` (`productionOrderController.ts:93`).
- **Fluxo principal:** `CreateProductionOrderUseCase.execute` (`CreateProductionOrderUseCase.ts:31`): valida produto ativo e **`finished`-only** (:38-41), disponibilidade de material (:43-54), numeração serializada `OP-YYYY-NNNN` (:62-63), cria (:64-67).
- **Exceções:** produto inexistente → 404 (:37); inativo/não-acabado → 422 (:38-41); sem material → 422 (:44-54).
- **Invariantes:** criação **não reserva** (reserva é na liberação — UC-PLAN-06). `ProductionOrderEntity.assertCanBeCreatedFor` (`ProductionOrderEntity.ts:139-145`) reimplementa a regra e **não é chamado** (código morto).
- **BRs:** BR-PP-015 (caminho A), BR-PP-004.
- **Classificação vs. doc:** **CONFLITANTE.**
  1. **Fluxo principal do UC-12 documenta passos que o código não faz.** `04-USE_CASES.md:277` "5. Sistema verifica capacidade produtiva (CRP)" → **nenhuma implementação** (BR-PP-025, RF-PRD-01 OBSOLETE_CANDIDATE). `:280` "8. Sistema reserva materiais em estoque" na **criação** → o código reserva só na **liberação** (a própria seção G3 do UC-12, `:306-320`, contradiz o fluxo principal).
  2. **Path divergente na doc.** UC-12 (`:291`) diz `POST /api/production/orders`; o código monta `POST /api/production-orders` (`app.ts:169`), grafia que o próprio UC-73 usa corretamente (`:2807`). Doc internamente inconsistente e errada vs. código no UC-12.

### UC-PLAN-06 — Alterar status da OP (liberar / iniciar / pausar / concluir / cancelar)
- **Objetivo:** conduzir a OP pela máquina de estados e disparar os efeitos de estoque/lote/custo.
- **Atores:** **todas** as transições em `producao:operate` (`productionOrders.ts:32`, mesma alçada); `user_id` do JWT (`productionOrderController.ts:151`).
- **Gatilho:** `PUT /api/production-orders/:id/status` → `updateStatus` (`productionOrderController.ts:135`).
- **Fluxo principal:** `ChangeProductionOrderStatusUseCase.execute` (`ChangeProductionOrderStatusUseCase.ts:70`): lock (:75), máquina de estados `ProductionOrderEntity.transitionTo` (:81 / `ProductionOrderEntity.ts:60-67,157-213`), e por alvo:
  - `released` → reserva vinculada à OP + materializa apontamentos do roteiro ativo (:87-90; G3/G4).
  - `in_progress` → **gate G6 de partida** `assertOrderIsReadyToStart` (:92-93, :302-328) + preenche `responsible_id` do funcionário do JWT (:101-104).
  - `completed` → **gate G4** `assertTrackingIsSufficientForCompletion` (:108, :330-368) + `completeOrder` (:109, :383-518: proíbe qtd zero/sem BOM = G2, libera reserva própria = G3, consome por lote FEFO :823-908, recebe acabado, cria lote, custeia material+MO+overhead).
  - `canceled` → libera reserva própria (:112-114).
- **Fluxos alternativos / exceções:** transição inválida/mesmo status → 422 (`ProductionOrderEntity.ts:164-165`); sobreprodução sem `allow_overproduction` → 422 (`ProductionOrderEntity.ts:190-204`); gates G6/G4/G2 → 422 com `details.rule`; falha de estoque → 409 (:510-517). Modo `warn` (`PRODUCTION_TRACKING_REQUIRED`) afrouxa parte dos gates (:305-315, :337-349).
- **BRs:** BR-PP-001, -002, -003, -004, -005, -006, -007, -008, -009.
- **Classificação vs. doc:** **CONFIRMED, documentação fragmentada.** A liberação/reserva está em UC-12 (tabela evento×efeito, `04-USE_CASES.md:315-321`); a conclusão/apontamento em UC-73 (`:2770-2877`). Nenhum cartão descreve a transição como um todo, e a granularidade RBAC "todas as transições no mesmo `producao:operate`" (BR-PP-022) não é declarada em nenhum doc de negócio.

### UC-PLAN-07 — Atualizar dados da OP
- **Ator:** `producao:operate` (`productionOrders.ts:31`). **Gatilho:** `PUT /api/production-orders/:id` → `update` (`productionOrderController.ts:113`) → `UpdateProductionOrderUseCase`.
- **Classificação vs. doc:** **FANTASMA.** Sem fluxo documentado (UC-12 cobre criação e ciclo de status, não a edição de campos).

### UC-PLAN-08 — Remover OP
- **Ator:** `producao:approve` (`productionOrders.ts:33` — única rota de OP em nível de aprovação). **Gatilho:** `DELETE /api/production-orders/:id` → `remove` (`productionOrderController.ts:172`) → `RemoveProductionOrderUseCase`.
- **Invariante documentado:** remoção **bloqueada** enquanto houver reserva ativa (`04-USE_CASES.md:321`).
- **Classificação vs. doc:** **CONFIRMED parcial** (regra na tabela G3 do UC-12; sem cartão próprio).

### UC-PLAN-09 — Apontar produção (criar / iniciar / concluir etapa) e consultar apontamentos
- **Objetivo:** registrar a execução por etapa no chão de fábrica, base do custeio real e do Bloco K.
- **Atores:** `chao_de_fabrica:operate` para escrita; `chao_de_fabrica:view` para leitura (`productionOrders.ts:25-28`). `operator_id` é dado de negócio (FK `employees.id`), **distinto** do autor no JWT (`productionOrderController.ts:227-237`).
- **Gatilhos:** `POST /api/production-orders/:id/tracking` (`createTracking` :207 → `CreateProductionTrackingUseCase.ts:28`); `POST /api/production-orders/tracking/:trackingId/start` (`startTracking` :224 → `StartProductionTrackingUseCase.ts:28`); `POST /api/production-orders/tracking/:trackingId/complete` (`completeTracking` :252 → `CompleteProductionTrackingUseCase.ts:29`); `GET /api/production-orders/:id/tracking` (`listTracking` :198).
- **Fluxos/exceções:** sequência ≤ 0 → 422 (`CreateProductionTrackingUseCase.ts:30`); iniciar só de `pending`/`paused` (`Start…:33-35`); concluir só de `in_progress` (`Complete…:38-40`); quantidades negativas → 422 (`Complete…:32`).
- **BRs:** BR-PP-005, BR-PP-021 (materialização do roteiro).
- **Classificação vs. doc:** **CONFIRMED** — UC-73 (`04-USE_CASES.md:2805-2850`) descreve os três endpoints e o anti-spoofing `operator_id`≠JWT com fidelidade.

---

## Bloco C — Roteiro de Produção (G5) e Paradas

### UC-PLAN-10 — Cadastrar, revisar e liberar Roteiro de Produção
- **Objetivo:** gerir o roteiro (`draft`→`active`→`inactive`/`superseded`), imutável quando ativo.
- **Atores:** leitura e escrita de conteúdo em `producao:operate`; **liberar/inativar** em `producao:approve` (`productionRoutes.ts:31-39`). `created_by`/`approved_by` do JWT, nunca do body (`productionRouteController.ts:8-11,58-61`).
- **Gatilhos:** `GET /` (:31), `GET /:id` (:32), `POST /` (`create` :33 → `CreateProductionRouteUseCase`), `PUT /:id` (`update` :34), `PUT /:id/steps` (`replaceSteps` :35 → `ReplaceProductionRouteStepsUseCase`), `POST /:id/revise` (`revise` :36), `PATCH /:id/activate` (`activate` :37), `PATCH /:id/inactivate` (`inactivate` :38), `DELETE /:id` (`remove` :39).
- **Fluxo principal:** regras puras em `productionRouteRules.ts`: máquina de estados (:82-87), escrita só em `draft` `assertRouteIsDraft` (:131-138, `G5-ROUTE-NOT-DRAFT`), sequência 1..N contígua/única e `step_code` único `normalizeAndValidateSteps` (:181-228), ativação exige etapa `assertHasSteps` (:236-243).
- **Exceções:** todos com `details.rule` `G5-*` (catálogo :30-55). Centro de trabalho inexistente/inativo barrado; etapa já apontada não some (`G5-ROUTE-IN-USE`).
- **Invariantes:** `active` imutável sustenta rastreabilidade "como executado" da OP; `total_standard_time_minutes` soma só `standard_time` (setup fora, :259-265). Dívida declarada: OP não guarda `production_route_id`.
- **BRs:** BR-PP-021.
- **Classificação vs. doc:** **CONFIRMED** — UC-71 (`04-USE_CASES.md:2612-2671`) mapeia endpoints, códigos `G5-*`, RBAC `operate`/`approve` e imutabilidade fielmente.

### UC-PLAN-11 — Registrar e encerrar Parada de Máquina (downtime)
- **Objetivo:** abrir/fechar paradas de centro de trabalho, opcionalmente vinculadas a OP.
- **Atores:** `chao_de_fabrica:operate` (escrita), `chao_de_fabrica:view` (leitura) (`productionDowntimes.ts:17-19`); `created_by` do JWT (`productionDowntimeController.ts:43`).
- **Gatilhos:** `GET /api/production/downtimes` (`list` :77); `POST /` (`open` :37 → `OpenProductionDowntimeUseCase.ts:42`); `PUT /:id/finish` (`finish` :57 → `FinishProductionDowntimeUseCase.ts:33`).
- **Fluxos/exceções:** `reason` fora do enum → 422 (`Open…:46-48`); centro/OP inexistente → 404 (:52-58); **segunda parada aberta simultânea no mesmo centro → 422** (:65-70, rede de segurança = índice parcial único); encerrar parada já encerrada → 422 (`Finish…:38-40`); `finished_at ≤ started_at` → 422 (:46-48).
- **BRs:** nenhuma BR-PP catalogada (fora do recorte do passo 26, §4 do BR doc).
- **Classificação vs. doc:** **FANTASMA.** Sem cartão em `04-USE_CASES.md` (grep `Parada`/`downtime` → 0 cartões). No BPMN aparece só como nó "Paradas de Máquina / OEE (CLAUDE.md §4)" (`DIAGRAMA…:62`) e `downtime_hours` no fluxo de reparo (`:296`). Regra crítica (bloqueio de 2ª parada) sem UC de origem.

---

## Bloco D — Plano Mestre de Produção (MPS, G17)

### UC-PLAN-12 — Consolidar e abrir o Plano Mestre
- **Objetivo:** fotografar demanda (carteira + estoque mínimo + previsão manual) e suprimento, abrindo plano `draft` com linhas `pending`/`planned_quantity=0`.
- **Atores:** `mrp:operate` (`masterProductionPlans.ts:35`); `planner_id` do JWT (`masterProductionPlanController.ts:33`).
- **Gatilho:** `POST /api/production/master-plans` → `create` (`…Controller.ts:30`) → `CreateMasterProductionPlanUseCase.execute` (`…UseCase.ts:93`).
- **Fluxo/exceções:** horizonte obrigatório e não invertido (:94-104); previsão inválida → 422 (:248-274); produto de compra vai para `skipped` (não some, :143-151); sem demanda a planejar → 422 (:160-165).
- **Invariantes:** saldo de planejamento `max(0, físico−retido−reservado)` (BR-PP-020); `suggested_quantity` nunca vira decisão (:186-191).
- **BRs:** BR-PP-020.
- **Classificação vs. doc:** **CONFIRMED** — UC-72 (`04-USE_CASES.md:2698-2725`), inclusive a tabela da conta consolidada, bate com o código.

### UC-PLAN-13 — Decidir linha do Plano Mestre
- **Ator:** `mrp:operate` (`masterProductionPlans.ts:36`); `decided_by` do JWT (`…Controller.ts:78`).
- **Gatilho:** `PATCH /api/production/master-plans/:id/lines/:lineId` → `decideLine` → `DecideMasterProductionPlanLineUseCase.execute` (`…UseCase.ts:66`).
- **Fluxo/exceções:** só editável em `draft` (:75-81); `planned_quantity` XOR `dismiss` (:92-106); `planned_quantity=0` vira `dismissed` (:140-145); data mal formada → 422 (:117-126).
- **BRs:** BR-PP-018.
- **Classificação vs. doc:** **CONFIRMED** — UC-72 passo 2 (`04-USE_CASES.md:2704-2706`).

### UC-PLAN-14 — Firmar / Cancelar Plano Mestre
- **Ator:** `mrp:operate` (`masterProductionPlans.ts:37,39`); `userId` do JWT.
- **Gatilhos:** `POST /:id/firm` (`firm` :95) e `POST /:id/cancel` (`cancel` :118) → `ChangeMasterProductionPlanStatusUseCase.execute` (`…UseCase.ts:57`).
- **Fluxo/exceções:** transição inválida → 422 (`canTransitionPlan`, :67-77); **firmar exige ≥1 linha decidida** → 422 (:87-98); cancelar grava `canceled_by/at/reason` (:102-105).
- **BRs:** BR-PP-018.
- **Classificação vs. doc:** **CONFIRMED** — UC-72 passo 3 e tabela de validações (`04-USE_CASES.md:2707,2739`).

### UC-PLAN-15 — Liberar Plano Mestre (gera OPs, tudo-ou-nada)
- **Ator:** `mrp:operate` (`masterProductionPlans.ts:38`); `userId` do JWT.
- **Gatilho:** `POST /api/production/master-plans/:id/release` → `release` (`…Controller.ts:142`) → `ReleaseMasterProductionPlanUseCase.execute` (`…UseCase.ts:86`).
- **Fluxo/exceções:** exige `firm` → 422 (:96-106); sem linha liberável → 422 (:113-118); coleta **todos** os bloqueios antes de qualquer escrita `collectBlockers` (:120-127, :185-239: `product_not_found`/`inactive_product`/`not_manufactured`/`no_active_bom`/`insufficient_material`); uma OP por linha (:132-158); `sales_order_id` NULL de propósito (:141-147).
- **Invariante auto-declarada e ausente de doc de negócio:** `checkAvailability` fora da transação → duas linhas do mesmo plano que consomem o mesmo componente são avaliadas **independentemente** (:37-43 do cabeçalho — BR-PP-019).
- **BRs:** BR-PP-019, BR-PP-015 (caminho C).
- **Classificação vs. doc:** **CONFIRMED** — UC-72 passo 4 e tabela (`04-USE_CASES.md:2708,2741-2744`). Ressalva: UC-72 **não menciona** que este é o 3º caminho de criação de OP com validação de tipo `finished`/`semi_finished` (BR-PP-015 diz que o doc cobre só 2 de 3).

---

## Bloco E — Centros de Trabalho (capacidade / CRP)

### UC-PLAN-16 — Consultar Carga-Máquina (relatório de capacidade × carga)
- **Objetivo:** relatório capacidade × carga por centro de trabalho ativo num horizonte de dias.
- **Ator:** `centros_de_trabalho:view` (`workCenters.ts:20`). **Gatilho:** `GET /api/work-centers/load` → `getLoad` (`workCenterController.ts:145`) → `GetWorkCenterLoadUseCase.execute` (`…UseCase.ts:57`).
- **Fluxo:** capacidade por turnos ou fallback `capacity_hours_per_day` (:81-83); carga = saldo a produzir × tempo das etapas (:60-71); `utilization_rate` protegido de divisão por zero (:94).
- **Classificação vs. doc:** **FANTASMA.** Sem cartão. **Correlato crítico (BR-PP-025):** é o relatório que a "verificação de capacidade (CRP)" documentada em UC-12 usaria, mas **nenhum** caminho de criação/liberação/partida de OP o consulta — a CRP documentada continua sem implementação (RF-PRD-01 OBSOLETE_CANDIDATE).

### UC-PLAN-17 — Cadastrar/Manter Centro de Trabalho e turnos
- **Ator:** `centros_de_trabalho:view`/`operate` (`workCenters.ts:21-25`).
- **Gatilhos:** `GET /` (`list` :35), `GET /:id` (`getById` :54), `POST /` (`create` :65 → `CreateWorkCenterUseCase`), `PUT /:id` (`update` :89), `PUT /:id/shifts` (`replaceShifts` :113 → `ReplaceWorkCenterShiftsUseCase`, transacional).
- **Classificação vs. doc:** **FANTASMA.** Grep `Centro de Trabalho` nos três docs → só menções em mensagens de erro/telas (`business/01-USE_CASES.md:1279`), nenhum cartão de UC.

---

## Bloco F — Engenharia (P&D, desenhos, ficha técnica)

### UC-PLAN-18 — Gerenciar Projeto de Engenharia (P&D)
- **Atores:** `engenharia:view` (leitura) e `engenharia:operate` **+** `authorize('admin','operator')` (escrita) — dupla camada (`engineering.ts:34-37`).
- **Gatilhos:** `GET /projects` (`listProjects` :44), `GET /projects/:id` (:63), `POST /projects` (`createProject` :74 → `CreateProjectUseCase`), `PUT /projects/:id` (`updateProject` :98).
- **Exceção:** `project_code` duplicado → 409.
- **Classificação vs. doc:** **CONFIRMED** — UC-ENG-01 (`04-USE_CASES.md:1270-1292`); ator "admin/operator" bate com a camada `authorize` adicional.

### UC-PLAN-19 — Gerenciar Desenho Técnico (draft → released → obsolete)
- **Atores:** `engenharia:view`/`operate` para CRUD; **`engenharia:approve` + `authorize('admin')`** para liberar/obsoletar (`engineering.ts:40-44`); `approved_by` do JWT (`engineeringController.ts:196`).
- **Gatilhos:** `GET /drawings` (:126), `POST /drawings` (`createDrawing` :145 → `CreateDrawingUseCase.ts:35`, unicidade `drawing_number`+`revision`), `PUT /drawings/:id` (:169), `POST /drawings/:id/release` (`releaseDrawing` :193 → `ReleaseDrawingUseCase.ts:27`, só de `draft`), `POST /drawings/:id/obsolete` (`obsoleteDrawing` :214 → `ObsoleteDrawingUseCase.ts:23`, só de `released`).
- **Exceções:** transição inválida → 422 (`Release…:33-37` / `Obsolete…:29-33`); duplicidade → 409.
- **BRs:** BR-PP-024.
- **Classificação vs. doc:** **CONFIRMED** — UC-ENG-02 (`04-USE_CASES.md:1296-1323`). Ressalva (BR-PP-024): nenhum vínculo "desenho liberado" × "BOM ativa"/"roteiro ativo" — é possível produzir sem desenho liberado.

### UC-PLAN-20 — Consultar/Atualizar Ficha Técnica Thiele-Small do Item
- **Atores:** `engenharia:view`/`operate` (**+** `authorize('admin','operator')` no PUT) (`engineering.ts:47-48`).
- **Gatilhos:** `GET /items/:itemId/technical-spec` (`getTechnicalSpec` :239); `PUT …` (`upsertTechnicalSpec` :250 → `UpsertTechnicalSpecUseCase.ts:31`, 404 se item inexistente).
- **Classificação vs. doc:** **CONFIRMED** — UC-ENG-03 (`04-USE_CASES.md:1327-1347`).

---

## Bloco G — Laboratório (G8)

### UC-PLAN-21 — Registrar Teste de Laboratório (acústico / Thiele-Small)
- **Objetivo:** registrar resultado, calcular `passed`, e em reprovação **sempre** abrir RNC; teste destrutivo debita o depósito LABORATORIO.
- **Atores:** `laboratorio:operate` **+** `authorize('admin','operator')` (`laboratory.ts:26`); `tester_id` do JWT (`laboratoryController.ts:29`), nunca do body.
- **Gatilho:** `POST /api/laboratory/tests` → `createTest` (`…Controller.ts:23`) → `CreateAcousticTestUseCase.execute` (`…UseCase.ts:108`).
- **Fluxo/exceções:** `passed` calculado (`computePassed` :84-98); sem result/faixa → 422 (:128-137); destrutivo (`consumed_quantity>0`) debita na mesma transação (:147-172; saldo insuficiente propaga 422); reprovação cria RNC `major`/`final`/`acoustic` (:186-208).
- **Invariantes:** `create_rnc_on_fail` aceito mas **ignorado** (deprecated, :63-70 — a caixa na tela `RegisterTestTab.tsx` mente). **Risco residual auto-declarado:** RNC nasce em transação **própria** após o commit do teste; se falhar, teste reprovado fica sem RNC e resposta 500 (:180-185).
- **BRs:** BR-PP-023.
- **Classificação vs. doc:** **CONFIRMED** — UC-LAB-01 (`04-USE_CASES.md:1351-1389`) descreve G8 fielmente. Ressalva de cobertura: **nenhum teste automatizado** do módulo `laboratory` (BR-PP-023; RF-QUA-04/05 INFERRED).

### UC-PLAN-22 — Consultar Testes de Laboratório (listagem + resumo)
- **Ator:** `laboratorio:view` (`laboratory.ts:24-25`).
- **Gatilhos:** `GET /api/laboratory/tests` (`listTests` :47) e `GET /api/laboratory/tests/summary` (`getSummary` :66).
- **Classificação vs. doc:** **CONFIRMED** — UC-LAB-02 (`04-USE_CASES.md:1393-1411`).

---

## OBSOLETE_CANDIDATE (UC/passo do doc sem código correspondente)

| Item do doc | Onde | Situação no código |
|---|---|---|
| **"Sistema verifica capacidade produtiva (CRP)"** — passo 5 do fluxo principal do UC-12 | `04-USE_CASES.md:277` | **Sem implementação** em nenhum dos 3 caminhos de criação/liberação de OP (`CreateProductionOrderUseCase`, `Convert…ToProductionOrder`, `ReleaseMasterProductionPlan`). O único cálculo de capacidade é o relatório `GetWorkCenterLoadUseCase` (UC-PLAN-16), nunca consultado no fluxo da OP. BR-PP-025 / RF-PRD-01. |
| **"Sistema reserva materiais em estoque"** — passo 8 do fluxo principal (na **criação**) do UC-12 | `04-USE_CASES.md:280` | Contradiz o próprio UC-12 §G3 (`:306-320`) e o código: a reserva ocorre na **liberação**, não na criação. Fluxo principal do UC-12 é OBSOLETE_CANDIDATE nesse passo. BR-PP-004. |
| **Path `POST /api/production/orders`** (UC-12) | `04-USE_CASES.md:291` | O mount real é `/api/production-orders` (`app.ts:169`); UC-73 já usa a grafia correta (`:2807`). Doc parcialmente obsoleta/inconsistente. |
| **"Sem roteiro de fabricação, a OP não sai de `planned` (G6)"** | `GO_LIVE_G6_CHECKLIST.md:1292` (citado no BR doc) | Falso no código: a OP sem roteiro **é liberada** (só `logger.warn`, `ChangeProductionOrderStatusUseCase.ts:205-217`); o gate G6 é na **partida** (`→in_progress`), não na liberação. BR-PP-002. |

Nenhum UC-ID **inteiro** do doc ficou sem código no cluster — os obsoletos são **passos/afirmações** dentro de UC-12 e de checklists, não cartões completos.

---

## Resumo por classificação

| Classificação | Qtd | UC-PLAN |
|---|---|---|
| **CONFIRMED** | 11 | 03*, 04, 06, 09, 10, 12, 13, 14, 15, 18, 19, 20, 21, 22 (03 com ressalva de ator) |
| **CONFLITANTE** | 1 | 05 (CRP inexistente + reserva na criação + path divergente) |
| **FANTASMA** (código sem cartão de UC) | 6 | 01 (hub MRP!), 02, 07, 11, 16, 17 |
| **CONFIRMED parcial** (regra em tabela, sem cartão próprio) | 1 | 08 |

*(Contagem: 22 UCs recuperados; os grupos acima somam por natureza dominante — UC-03 contado em CONFIRMED com ressalva.)*

**Leitura crítica:** o **hub do cluster** (`POST /api/mrp/plan`, UC-PLAN-01) e o **relatório de capacidade** que a CRP documentada deveria usar (UC-PLAN-16) são ambos **FANTASMA**. A capacidade prometida no fluxo principal do UC-12 não existe no caminho da OP.

---

## Candidatos a finding (NÃO promovidos — seguem até o passo 31)

1. **UC-PLAN-05 / CONFLITANTE (MEDIUM/CONFIRMED):** UC-12 documenta CRP (passo 5) e reserva na criação (passo 8) que o código não implementa; ainda declara path `/api/production/orders` divergente do mount `/api/production-orders`. Confronta BR-PP-025, BR-PP-004; RF-PRD-01. Fluxo principal do caso de uso mais central da produção está errado em 2 passos.
2. **UC-PLAN-01 / FANTASMA (MEDIUM/CONFIRMED):** o hub do cluster (geração do plano MRP, com netting conjunto, rateio por origem e auto-conversão) não tem cartão de UC em nenhum dos três documentos — só menção indireta ("UC de geração de plano"). Regra 17: comportamento crítico sem UC-ID.
3. **UC-PLAN-11 / FANTASMA (MEDIUM/CONFIRMED):** Paradas de Máquina (open/finish, incluindo o bloqueio de 2ª parada aberta) sem cartão de UC; só nó no BPMN. Regra 17.
4. **UC-PLAN-16 + UC-PLAN-17 / FANTASMA (LOW→MEDIUM/CONFIRMED):** Centros de Trabalho (CRUD/turnos) e Carga-Máquina/CRP sem UC documentado, apesar de a CRP ser prometida em UC-12. Ligação direta com o candidato 1.
5. **UC-PLAN-03 / doc-drift de ator (LOW/CONFIRMED):** UC-24 declara ator por papel (`admin`,`operator`), mas o backend impõe `mrp:operate` (sem `authorize(role)`). Ator declarado ≠ permissão imposta — insumo para o `authorization-auditor` (fronteira de matriz); a permissão DO UC vs. imposta é deste agente: **está imposta, mas com identidade divergente da doc**.
6. **UC-PLAN-06 / granularidade RBAC (MEDIUM/CONFIRMED):** todas as transições da OP (liberar/iniciar/pausar/concluir/cancelar) exigem o mesmo `producao:operate`; nenhum documento declara essa decisão (BR-PP-022). Insumo para acceptance-criteria e authorization auditors.
7. **UC-PLAN-21 / cobertura (MEDIUM/MEDIUM):** UC-LAB-01 é regra crítica de qualidade (G8) com risco residual auto-declarado (RNC pós-commit → 500) e **sem teste** do módulo `laboratory` (BR-PP-023; RF-QUA-04/05 INFERRED).

---

## O que esta trilha NÃO afirma

- Não decide qual lado está certo em nenhuma divergência (Regra 20-21 — responsável humano).
- "CONFIRMED" significa que o **fluxo documentado bate com o código lido em disco** neste commit; **não** que os testes passam nem que cobrem o valor exato.
- Não auditei a matriz USER→ROLE→PERMISSION (fronteira do `authorization-auditor`); só verifiquei que **cada UC impõe a permissão declarada no backend** (rota+middleware, arquivo:linha).
- Não reexecutei nada; sem banco, sem teste. Cobertura de teste inferida por nome/escopo, não instrumentada.
- Não confiei em números do claudeMd/memória; toda citação tem arquivo:linha relida em disco.

*Produzido pela trilha VeriCore read-only do passo 28 (Read/Grep/Glob apenas). Sem Write. O orquestrador persiste este markdown; o hook org-isolation bloqueia escrita VeriCore fora de `audit/`.*
