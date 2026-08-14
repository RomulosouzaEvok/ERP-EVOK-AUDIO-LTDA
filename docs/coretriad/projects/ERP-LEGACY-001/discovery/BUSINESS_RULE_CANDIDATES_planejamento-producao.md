# Regras de Negócio Descobertas — Domínio Planejamento & Produção

**Programa:** ERP-LEGACY-001 · **Passo:** 26 · **Domínio:** `mrp`, `production`, `workCenters`, `masterProduction`, `engineering`, `laboratory`
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum arquivo auditado foi alterado. Sem execução, sem banco.

## 0. Como ler este documento

- Nenhuma das regras abaixo tinha BR-ID antes deste passo. Os identificadores
  `BR-PP-xxx` são **propostos aqui** e ainda não existem em nenhum artefato
  versionado — a rastreabilidade que existe hoje no código é por **código de
  gap** (`G1`…`G18`) gravado em `details.rule` dos erros.
- Status por regra (Regra 2 — não presumir documentação correta):
  `CONFIRMED` (doc + código + teste batem) · `DISCOVERED` (lei de facto, sem
  documento de origem) · `CONFLICTING` (doc × código divergem, ou duas
  implementações divergentes) · `UNKNOWN` (fonte autoritativa indeterminável,
  Regra 21) · `OBSOLETE_CANDIDATE` (documentada e não implementada).
- `OWNER` está `UNKNOWN` em quase todas: não existe catálogo de regras com
  responsável nomeado. Isso é, por si, um achado (ver §3).

---

## 1. Regras extraídas

### BR-PP-001 — Máquina de estados da Ordem de Produção
```
NAME: Transições válidas do status da Ordem de Produção
DESCRIPTION: planned→{released,canceled}; released→{in_progress,canceled};
             in_progress→{completed,paused,canceled}; paused→{in_progress,canceled};
             completed e canceled são TERMINAIS. Transição para o mesmo status é recusada.
ORIGIN: docs/arquitetura/API.md:2285 (descreve só a "trilha feliz");
        docs/projeto/02-PLANO_INDUSTRIAL.md:204 (ENUM)
OWNER: UNKNOWN  |  VALIDITY: anterior a 2026-08-02  |  PRIORITY: CRÍTICA
IMPLEMENTATION: production/domain/entities/ProductionOrderEntity.ts:60-67 (grafo), :157-213
                (transitionTo); ChangeProductionOrderStatusUseCase.ts:52,81
RELATED_USE_CASES: UC-12, UC-13 (docs/projeto/04-USE_CASES.md:268,343)
RELATED_TESTS: production-order-lifecycle.test.ts; production-order-status-concurrency.test.ts
STATUS: CONFIRMED (doc é incompleta, não contraditória)
```
**Nota:** `paused → in_progress` e a natureza terminal de `completed` estão
**só no código**. Quem lê apenas a doc não sabe que uma OP `completed` não
pode ser reaberta.

### BR-PP-002 — Gate de partida: `G6-START-NO-ROUTE` (três condições)
```
NAME: Uma OP não entra em produção sem lastro de roteiro
DESCRIPTION: Na transição *→in_progress, exige nesta ordem:
  (1) ≥1 linha de apontamento na OP           → 422 `G6-START-NO-ROUTE`
  (2) ≥1 linha ligada a etapa de roteiro OU produto com roteiro ATIVO com ≥1 etapa
                                              → 422 `G6-START-NO-ROUTE-STEP`
  (3) nenhuma etapa com centro de trabalho inativo → 422 `G6-START-WC-INACTIVE`
ORIGIN: PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md (gap G6);
        GO_LIVE_G6_CHECKLIST.md:1285,1292; docs/producao/04-ROTEIROS.md:274; UC-73
OWNER: UNKNOWN (comentário atribui a "aprovação do dono" sem registro — ver A-3)
VALIDITY: (1)(3) 2026-08-10; (2) 2026-08-11  |  PRIORITY: CRÍTICA
CONDITIONS: Só vale com PRODUCTION_TRACKING_REQUIRED = `block`.
EXCEPTIONS: em modo `warn` o gate NÃO bloqueia — só logger.warn
  (ChangeProductionOrderStatusUseCase.ts:305-315). Mitigação: runtimeEnv recusa o boot em
  produção com `warn`. Valor ausente/inválido → `block` (lado seguro).
  Etapa SEM centro de trabalho NÃO bloqueia — válido por desenho do G5.
IMPLEMENTATION: production/domain/productionTrackingRules.ts:394-464 (regra pura),
                :105,116,122 (códigos); ChangeProductionOrderStatusUseCase.ts:302-328
RELATED_TESTS: production-start-gate-g6.test.ts; production-start-gate-route-step-g6.test.ts;
               production-start-manual-tracking-bypass.test.ts; runtime-env-production-tracking.test.ts
STATUS: CONFIRMED — com ressalva de redação da documentação
```
**⚠ Divergência de redação (documento contradiz a si mesmo):**
`GO_LIVE_G6_CHECKLIST.md:1292` afirma *"Sem roteiro de fabricação, a OP não sai
de `planned` (G6)"*. **Falso no código atual.** A OP sem roteiro **sai de
`planned` normalmente**: a liberação segue e apenas grava `logger.warn`
(`ChangeProductionOrderStatusUseCase.ts:205-217`, comentário explícito: *"Não se
trava a liberação por falta de roteiro"*). O gate é em `→ in_progress`. A frase
da linha 1285 do mesmo documento (*"sem roteiro ativo, nenhuma OP inicia"*) está
correta. Duas linhas de distância, afirmações incompatíveis. Não decidido aqui
(Regra 20).

### BR-PP-003 — Responsável da OP é atribuído, não exigido
```
NAME: Preenchimento automático de responsible_id na partida
DESCRIPTION: Se a OP não tem responsible_id ao entrar em in_progress, traduz o user_id do
             JWT para `employees.id` e grava. Se o usuário não for funcionário, fica nulo
             e a partida NÃO é bloqueada.
ORIGIN: DESCOBERTA — só comentário de código (ChangeProductionOrderStatusUseCase.ts:94-100)
OWNER: UNKNOWN  |  VALIDITY: 2026-08-10  |  PRIORITY: MÉDIA
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:101-104; ProductionOrderEntity.ts:49-51
RELATED_TESTS: nenhum teste dedicado localizado ← LACUNA
STATUS: DISCOVERED
```
**Finding de cobertura (MEDIUM/MEDIUM):** regra que afeta responsabilização de
chão de fábrica (FK trocada `users.id` × `employees.id` é justamente o defeito
que o comentário diz ter evitado) sem teste automatizado.

### BR-PP-004 — Reserva de material na liberação, vinculada à ordem (G3)
```
DESCRIPTION: A criação da OP não reserva nada. Em `released`, explode a BOM na quantidade
             planejada, exige disponibilidade e cria reserva vinculada à OP.
             Cancelamento/conclusão liberam EXATAMENTE o que aquela OP reservou, lendo
             production_order_reservations — nunca reexplodindo a BOM.
ORIGIN: docs/projeto/04-USE_CASES.md:306-339 (UC-12, gap G3, com tabela evento×efeito)
OWNER: UNKNOWN  |  VALIDITY: 2026-08-09  |  PRIORITY: CRÍTICA
CONDITIONS: Liberação falha (422) listando TODOS os itens faltantes de uma vez.
EXCEPTIONS: Sobreprodução consome estoque livre (não reservado) — permitida.
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:87-90, :687-710, :721-727, :759-765
RELATED_TESTS: production-order-material-reservation.test.ts
STATUS: CONFIRMED
```
**Contradição interna do documento de origem:** o mesmo UC-12, no fluxo
principal, diz *"8. Sistema reserva materiais em estoque"* como passo da
**criação** (`04-USE_CASES.md:280`), enquanto a seção G3 do próprio UC-12
(:308) diz *"A criação da OP (`planned`) **não** reserva nada"*. O código
implementa a segunda. Fluxo principal do UC-12 é **OBSOLETE_CANDIDATE**.

### BR-PP-005 — Conclusão exige apontamento (G4) — seis regras encadeadas
```
DESCRIPTION: Antes de qualquer escrita de estoque/lote/custo:
  1. nenhuma etapa em aberto            → `G4-TRACKING-STEP-OPEN`
  2. existe ≥1 apontamento              → `G4-TRACKING-REQUIRED`
  3. existe ≥1 etapa `completed`        → `G4-TRACKING-NO-COMPLETED`
  4. quantity_produced ≤ quantity_good da ÚLTIMA etapa concluída (ε=0.0001)
                                        → `G4-TRACKING-QTY-EXCEEDS`
  5. toda etapa completed tem duração > 0 → `G4-TRACKING-TIME-MISSING`
  6. toda etapa completed tem taxa horária > 0 → `G4-LABOR-RATE-MISSING`
ORIGIN: docs/tributario/04-BLOCO_K.md; Ajuste SINIEF 2/09 cl.3ª §7º III e §10/§13;
        RIR/2018; PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md Decisão 4; UC-73
OWNER: UNKNOWN (origem é norma fiscal externa)  |  VALIDITY: 2026-08-10  |  PRIORITY: CRÍTICA
CONDITIONS: Regras 1 e 4 valem NOS DOIS MODOS. Regras 2,3,5,6 só em `block`.
IMPLEMENTATION: productionTrackingRules.ts:80-123, :298-309, :322-333, :477-491,
                :504-525, :538-560, :575-603; ChangeProductionOrderStatusUseCase.ts:330-368
RELATED_TESTS: production-tracking-required-g4.test.ts (inclui janela `warn`, :486)
STATUS: CONFIRMED
```

### BR-PP-006 — Conclusão exige BOM ativa e proíbe quantidade zero (G2)
```
DESCRIPTION: (a) Concluir com quantity_produced ≤ 0 é recusado (422 `G2`) — antes marcava
             `completed` em silêncio e deixava a reserva presa.
             (b) 404 "sem BOM ativa" vira erro de negócio explícito (422 `G2`) — antes era
             engolido e o produto acabado entrava em estoque com custo ZERO, contaminando
             o custo médio.
ORIGIN: PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md (gap G2)
OWNER: UNKNOWN  |  VALIDITY: 2026-08-09  |  PRIORITY: CRÍTICA
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:389-396, :412-423
RELATED_TESTS: production-order-scrap.test.ts (parcial)
STATUS: DISCOVERED — `G2` não é BR-ID de catálogo; nenhum documento declara a regra
        fora do comentário e do plano de ação (que é plano de correção, não catálogo).
```

### BR-PP-007 — Sobreprodução exige confirmação explícita
```
DESCRIPTION: Se produced > quantity, OU produced + scrapped > quantity, a transição é
             recusada a menos que allow_overproduction=true. Negativos sempre recusados.
             scrap_reason só persistido quando scrapped > 0.
ORIGIN: DESCOBERTA — mensagem de erro é a única especificação
OWNER: UNKNOWN  |  VALIDITY: ≤2026-08-09  |  PRIORITY: ALTA
CONDITIONS: Comparação estrita (>), sem tolerância percentual. NÃO há limite máximo:
            com a flag, qualquer excesso passa.
EXCEPTIONS: A flag vem do BODY, não de permissão — qualquer usuário `producao:operate`
            pode autorizar sobreprodução ILIMITADA.
IMPLEMENTATION: ProductionOrderEntity.ts:187-209
RELATED_TESTS: production-order-scrap.test.ts
STATUS: DISCOVERED
```
**Para o passo de requisitos:** "sobreprodução sem teto, autorizada por flag de
body" é política de negócio real que ninguém decidiu em artefato. Candidata a
pergunta ao dono.

### BR-PP-008 — Lote obrigatório no consumo, com FEFO como fallback
```
DESCRIPTION: Se a BOM tem ≥1 componente, `lot_consumptions` é OBRIGATÓRIO e precisa cobrir
             TODOS os componentes. Por componente, a soma dos lotes tem de bater com a
             quantidade exigida (tolerância 0.0001). Lote informado precisa existir, estar
             `available` e não estar vencido. Sem payload, consome por FEFO (expires_at NULL
             por último; depois received_at, manufactured_at, createdAt), excluindo vencidos.
ORIGIN: DESCOBERTA  |  OWNER: UNKNOWN  |  VALIDITY: ≤2026-08-09  |  PRIORITY: ALTA
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:774-793, :823-908, :916-945
RELATED_TESTS: nenhum teste dedicado à ordenação FEFO nem à recusa de lote vencido ← LACUNA
STATUS: DISCOVERED
```
**Finding de cobertura (MEDIUM/MEDIUM):** ordenação FEFO e recusa de lote
vencido/bloqueado são regra crítica de rastreabilidade sem teste. Contradição
terminológica: o comentário diz "FIFO real (First-Expired-First-Out)" e a nota
grava `Consumo FIFO OP ...` (:900), enquanto a ordenação implementada é FEFO.

### BR-PP-009 — Custo real: material + MO apontada + overhead rateado
```
DESCRIPTION: Material = total_cost da explosão de BOM (custo médio ponderado).
             MO = Σ(horas de cada etapa `completed`) × taxa, taxa = work_centers.cost_per_hour;
             na AUSÊNCIA do valor, fallback production_cost_settings.default_labor_rate_per_hour.
             Overhead = overhead_rate_percent/100 × base ∈ {material_labor (default),
             labor_only, material_only}. Lançamentos ≤ 0.0001 são OMITIDOS do ledger.
ORIGIN: LEVANTAMENTO_ERP item 7/9; RIR/2018  |  OWNER: UNKNOWN  |  PRIORITY: CRÍTICA
EXCEPTIONS: work center com cost_per_hour = 0 NÃO cai no fallback — resolve para 0 e é
            tratado como configuração incompleta (productionTrackingRules.ts:272-284).
            Comportamento histórico preservado deliberadamente.
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:565-613, :638-658;
                productionTrackingRules.ts:236-284
RELATED_TESTS: production-labor-overhead-cost.test.ts
STATUS: DISCOVERED — os valores (taxa padrão, % overhead, base de rateio) são CONFIGURAÇÃO
        de banco, sem valor documentado a confrontar. Ver A-4.
```

### BR-PP-010 — Netting do MRP é CONJUNTO (estado ATUAL confirmado)
```
DESCRIPTION: TODAS as demandas da rodada entram numa ÚNICA chamada de calculateMrpPlan.
             Agregação por chave (itemId | dueDate ISO). Por chave:
               availableStock = max(0, onHand − reserved − safetyStock)
               netRequirement = max(0, gross − availableStock)
               plannedQuantity = lote>0 && net>0 ? ceil(net/lote)*lote : net
               releaseDate = dueDate − leadTimeDays (dias corridos)
ORIGIN: correção do "defeito CRÍTICO 1" (2026-08-11); commit 16a8ce3
OWNER: UNKNOWN  |  VALIDITY: 2026-08-11 (estado ATUAL)  |  PRIORITY: CRÍTICA
CONDITIONS: Datas de necessidade DIFERENTES não se misturam — netting por bucket de data.
IMPLEMENTATION: mrp/application/mrpEngine.ts:221-268; GenerateMrpPlanUseCase.ts:115
RELATED_TESTS: mrp-multi-demand-netting.test.ts; mrp-engine.test.ts;
               mrp-multi-demand-allocation.test.ts
STATUS: CONFIRMED (verificado no código ATUAL, não na memória — a versão antiga, uma
        passagem por demanda, NÃO existe mais)
```

### BR-PP-011 — Rateio do plano por origem
```
DESCRIPTION: Depois da netagem conjunta, a necessidade de cada (item,data) é dividida entre
             as origens proporcionalmente à NECESSIDADE BRUTA. As quatro medidas usam a
             MESMA proporção. A maior participação recebe o RESTO (soma fecha exatamente).
             Origens com fatia < 0.000001 são absorvidas pela maior.
ORIGIN: DESCOBERTA — só no cabeçalho do próprio módulo
OWNER: UNKNOWN  |  VALIDITY: 2026-08-11  |  PRIORITY: ALTA
CONDITIONS: Lote mínimo aplicado ANTES do rateio (no agregado) — a linha individual pode
            não ser múltipla do lote; a soma é.
DECISÃO EXPLICITAMENTE RECUSADA (registrada no código, allocatePlanByOrigin.ts:29-35):
            ratear por data/prioridade ("quem precisa antes leva o estoque") foi descartado
            por ser alocação por prioridade, "assunto do dono do processo".
IMPLEMENTATION: mrp/application/use-cases/support/allocatePlanByOrigin.ts:139-260
RELATED_TESTS: mrp-multi-demand-allocation.test.ts
STATUS: DISCOVERED — inclui decisão de política de PCP tomada por código e NÃO ratificada.
```

### BR-PP-012 — Saldo do MRP desconta material retido pela Qualidade (G7)
```
DESCRIPTION: `estoque_atual` entregue ao motor = max(0, físico − retido), retido = soma dos
             lot_controls em `quarantine`/`blocked`. Sem retenção, valor IDÊNTICO ao anterior
             (inclusive o tipo string do Sequelize), para não alterar o contrato.
ORIGIN: gap G7 (2026-08-10)  |  OWNER: UNKNOWN  |  PRIORITY: ALTA
CONDITIONS: Casamento por crosswalk products.code = items.codigo; item sem produto
            correspondente NÃO recebe desconto.
IMPLEMENTATION: items/infrastructure/sequelize/SequelizeItemRepository.ts:79-107
RELATED_TESTS: mrp-quarantine-discount.test.ts
STATUS: CONFIRMED
```

### BR-PP-013 — ⚠⚠ Lote mínimo e estoque de segurança lêem o MESMO campo
```
BR_ID: BR-PP-013
NAME: Origem dos parâmetros de planejamento do item
DESCRIPTION: Em listMrpInventoryPositions, quando existe produto legado correspondente:
               estoque_seguranca ← liveProduct.min_quantity
               lote_minimo       ← liveProduct.min_quantity   (MESMO CAMPO)
             O motor usa os dois de formas DIFERENTES e cumulativas: safetyStock REDUZ o
             disponível; minimumLotSize ARREDONDA a compra para cima.
ORIGIN: nenhuma. Não há documento que declare que lote mínimo = estoque mínimo.
OWNER: UNKNOWN  |  VALIDITY: indeterminada  |  PRIORITY: ALTA
CONDITIONS: Só no caminho com produto legado. No fallback (item sem produto), são campos
            distintos: item.estoque_seguranca e item.lote_minimo.
IMPLEMENTATION: SequelizeItemRepository.ts:109-110
  109:  estoque_seguranca: liveProduct?.min_quantity ?? item.estoque_seguranca,
  110:  lote_minimo:       liveProduct?.min_quantity ?? item.lote_minimo,
CONSUMO: mrpEngine.ts:246-254 (safetyStock subtrai; minimumLotSize arredonda)
RELATED_TESTS: nenhum teste confronta as duas semânticas ← LACUNA
STATUS: CONFLICTING
```
**Achado mais forte deste passo.** Efeito prático: para itens com produto
legado, um `min_quantity = 500` simultaneamente retira 500 do disponível **e**
força a compra a múltiplos de 500 — duas políticas de PCP diferentes acionadas
por um campo só, sem decisão registrada. Severidade proposta **HIGH**, confiança
**CONFIRMED** (arquivo+linha nos dois lados). → CANDIDATO A FINDING FORMAL

### BR-PP-014 — Idempotência da conversão plano → requisição
```
DESCRIPTION: Só ordens em RASCUNHO ou APROVADA são convertíveis. Repetidas no mesmo lote são
             deduplicadas por id. Se nada sobrar, NENHUMA requisição é criada (null) — nunca
             cabeçalho vazio. Requisição nasce `pending`, origin `mrp_auto`, sugere o
             fornecedor preferencial ativo com preço de referência do vínculo.
ORIGIN: "defeito CRÍTICO 2" (2026-08-11); UC-24 e UC-24b
OWNER: UNKNOWN  |  VALIDITY: 2026-08-11  |  PRIORITY: CRÍTICA
CONDITIONS: Conversão automática só com opt-in por item (items.conversao_automatica) e só se
            requisitionRepository + itemSupplierRepository + requester_id existirem. Roda na
            MESMA transação do plano.
IMPLEMENTATION: mrp/application/use-cases/support/createRequisitionFromPlannedOrders.ts:32,71-88;
                GenerateMrpPlanUseCase.ts:20,172-231
RELATED_TESTS: mrp-requisition-helper-idempotency.test.ts; mrp-rerun-idempotency.test.ts;
               mrp-auto-convert.test.ts
STATUS: CONFIRMED
```

### BR-PP-015 — ⚠ Três caminhos de criação de OP, com rigor DIFERENTE
```
DESCRIPTION: TRÊS caminhos, que NÃO aplicam a mesma regra de tipo de produto:
  (A) manual  POST /api/production/orders                → product_type DEVE ser `finished`
  (B) MRP     POST /api/mrp/planned-orders/convert-to-production
                                                          → `finished` OU `semi_finished`
  (C) MPS     POST /api/production/master-plans/:id/release → `finished` OU `semi_finished`
  Comum aos três: produto ativo; BOM ativa; material mínimo disponível; numeração
  OP-YYYY-NNNN por advisory lock + MAX (nunca COUNT).
ORIGIN: docs/projeto/04-USE_CASES.md:287-304 (UC-12, gap G16) documenta a divergência (A)×(B)
        como INTENCIONAL. Não menciona o caminho (C).
OWNER: UNKNOWN  |  VALIDITY: (A)(B) 2026-08-09; (C) 2026-08-10  |  PRIORITY: CRÍTICA
IMPLEMENTATION:
  (A) CreateProductionOrderUseCase.ts:36-54 (:39 `if (product.product_type !== 'finished')`)
  (B) ConvertPlannedOrdersToProductionOrderUseCase.ts:128-188 (:150 aceita ambos)
  (C) ReleaseMasterProductionPlanUseCase.ts:185-238 + masterProduction/domain/constants.ts:96
  Duplicação adicional: a MESMA regra existe em ProductionOrderEntity.assertCanBeCreatedFor
  (:139-145, versão `finished`-only) — método que NÃO é chamado por CreateProductionOrderUseCase,
  que reimplementa a validação inline.
RELATED_TESTS: mrp-convert-to-production-order.test.ts; master-production-plan-g17.test.ts;
               master-production-plan-cycle.test.ts
STATUS: CONFLICTING — mesma regra com 4 implementações (3 ativas + 1 morta), 2 respostas
        diferentes, documentação cobrindo só 2 dos 3 caminhos ativos.
        → CANDIDATO A FINDING FORMAL (HIGH/CONFIRMED)
```
**Sub-achado (código morto de regra):** `ProductionOrderEntity.assertCanBeCreatedFor`
(:139-145) implementa a regra e **não é invocado em lugar nenhum** do fluxo de
criação. Regra de domínio duplicada fora do agregado. MEDIUM/CONFIRMED.

### BR-PP-016 — Explosão de BOM: subconjunto estocável × fantasma (G18)
```
DESCRIPTION: Ter BOM própria NÃO basta para a explosão descer. Quem decide é `is_phantom`
             na linha da BOM do PAI:
               is_phantom = false (DEFAULT) → subconjunto ESTOCÁVEL: a explosão PARA nele;
                 a OP do pai reserva/consome/custeia a peça pronta (cost_price já carrega
                 MO+overhead da OP do subconjunto).
               is_phantom = true            → FANTASMA: desce e o pai consome os filhos.
             Opção `throughSubassemblies=true` desce também nos estocáveis (visão de
             engenharia, não de produção).
ORIGIN: gap G18 (2026-08-10); caso real citado: o REPARO da Evok
OWNER: UNKNOWN  |  VALIDITY: 2026-08-10  |  PRIORITY: CRÍTICA
CONDITIONS: Ausência de valor na criação grava `false` EXPLÍCITO (null anula o DEFAULT do
            Postgres — classe de defeito catalogada).
EXCEPTIONS: Cadastro contraditório (is_phantom=true SEM BOM ativa própria) → tratado como
            PEÇA (seguro) e o problema aparece no array `errors`, não como exceção.
IMPLEMENTATION: services/bomService.ts:129,350-355, :489-515, :505
RELATED_TESTS: bom-two-level-reparo.test.ts; bom-recursive.test.ts
STATUS: CONFIRMED
```

### BR-PP-016b — ⚠ MRP ignora `is_phantom`: profundidade de explosão divergente
```
DESCRIPTION: O motor MRP explode TODA aresta ativa recursivamente, sem conceito de
             subconjunto estocável; a explosão da produção para no subconjunto estocável.
             Para o mesmo produto, MRP e OP podem chegar a listas de necessidade diferentes.
IMPLEMENTATION: mrpEngine.ts:164,184-206  ×  services/bomService.ts:505
STATUS: CONFLICTING — confiança MEDIUM: as duas explosões operam sobre TABELAS diferentes
        (grafo `items`/UUID × `products`/INT), e não foi verificado se as duas estruturas são
        mantidas em sincronia. Se forem independentes, é regra duplicada em dois cadastros —
        pior, não melhor. Escalar (Regra 21). → CANDIDATO A FINDING FORMAL
```

### BR-PP-017 — Barragem de ciclo na BOM (G1)
```
DESCRIPTION: Três defesas em camadas:
  (1) ESCRITA — auto-referência direta → 422 `G1-BOM-AUTO-REF`
  (2) ESCRITA — ciclo MULTINÍVEL: antes de gravar pai→componente, pergunta se já existe
      caminho componente→pai. Se sim, 422 `G1-BOM-CICLO`
  (3) LEITURA — explodeBOM mantém caminho de ancestrais e barra profundidade > maxDepth
      (default 10); buildTree barra MAX_BOM_DEPTH
ORIGIN: auditoria 2026-08-11 (gap G1)  |  OWNER: UNKNOWN  |  PRIORITY: CRÍTICA
CONDITIONS: A detecção (2) roda no espaço de `products.id` DE PROPÓSITO — a projeção em UUID
            depende do crosswalk, e produto sem item correspondente sumiria do grafo,
            "deixando o ciclo passar exatamente onde o cadastro está mais incompleto".
VALOR NUMÉRICO A CONFRONTAR: maxDepth = 10. Nenhum documento de negócio fixa a profundidade
            máxima da estrutura da Evok. UNKNOWN.
IMPLEMENTATION: services/bomService.ts:226-234, :254-278, :459-464, :751-758;
                services/bomStructureProjection.ts
RELATED_TESTS: bom-cycle-multilevel.test.ts; bom-tree-cycle.test.ts;
               bom-create-revision-rules-g1.test.ts; bom-single-source-g1.test.ts
STATUS: CONFIRMED (existência) / UNKNOWN (valor maxDepth=10)
```

### BR-PP-018 — Plano Mestre: estados e "firmar exige decisão"
```
DESCRIPTION: draft→{firm,canceled}; firm→{released,canceled}; released e canceled TERMINAIS.
             Linhas só editáveis em `draft`. Firmar EXIGE ≥1 linha `planned` com
             planned_quantity > 0 — "um plano em que ninguém decidiu nada não é um plano".
             Firmar grava firmed_by/firmed_at; cancelar grava canceled_by/at/reason.
ORIGIN: gap G17; decisão D-F do dono (PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md §4); UC-72
OWNER: PCP (papel citado; pessoa não nomeada)  |  VALIDITY: 2026-08-10  |  PRIORITY: ALTA
IMPLEMENTATION: masterProduction/domain/constants.ts:206-236;
                ChangeMasterProductionPlanStatusUseCase.ts:67-106
RELATED_TESTS: master-production-plan-g17.test.ts; master-production-plan-cycle.test.ts
STATUS: CONFIRMED
```

### BR-PP-019 — Liberar o MPS: exige `firm`, é tudo-ou-nada
```
DESCRIPTION: Só plano `firm` libera (senão 422 G17). Linhas liberáveis = `planned` E
             planned_quantity > 0. TODOS os bloqueios de TODAS as linhas são coletados ANTES
             de qualquer escrita, e a liberação inteira falha com a lista completa
             (product_not_found, inactive_product, not_manufactured, no_active_bom,
             insufficient_material). Uma OP por linha. `sales_order_id` fica NULL DE PROPÓSITO
             (demanda consolidada; apontar um pedido arbitrário seria rastreabilidade falsa).
ORIGIN: decisão D-F do dono; UC-72; gap G17  |  OWNER: PCP (papel)  |  PRIORITY: CRÍTICA
CONDITIONS: NÃO existe (e "não deve existir" — comentário :10-12) gatilho de OP na
            confirmação da venda.
EXCEPTIONS: **Limitação conhecida e declarada no código (:38-42):** checkAvailability NÃO
            participa da transação e a reserva só ocorre na liberação da OP; duas linhas do
            mesmo plano que consomem o mesmo componente são avaliadas INDEPENDENTEMENTE.
IMPLEMENTATION: ReleaseMasterProductionPlanUseCase.ts:86-238
RELATED_TESTS: master-production-plan-cycle.test.ts
STATUS: CONFIRMED — com exceção auto-declarada (sobre-liberação por concorrência de material
        entre linhas do mesmo plano) AUSENTE de qualquer documento de negócio.
```

### BR-PP-020 — A conta do Plano Mestre
```
DESCRIPTION: gross = carteira(confirmed, partially_invoiced) + estoque mínimo + previsão manual
             onHand = max(0, físico − retido(quarantine/blocked) − reservado)
             net = max(0, gross − onHand − emProdução)
             emProdução = saldo a produzir das OPs planned/released/in_progress/paused
             suggested_quantity = net, SEM arredondamento de lote.
ORIGIN: masterProduction/domain/constants.ts:18-21; API.md:4827; 04-USE_CASES.md:2719
OWNER: PCP (papel)  |  VALIDITY: 2026-08-10  |  PRIORITY: ALTA
CONDITIONS: Literais de ENUM conferidos contra o banco (comentários :63-96). `quote` fora;
            invoiced/shipped fora (NF-e já baixou o estoque — evita demanda em duplicidade).
POLÍTICAS AUSENTES, DECLARADAS COMO NÃO DECIDIDAS PELO DONO (constants.ts:23-35):
   1. horizonte de planejamento — sem default;
   2. lote mínimo/múltiplo de produção — NÃO existe para o MPS (só o MRP arredonda);
   3. pedido que chega depois do plano fechado — SEM replanejamento automático.
IMPLEMENTATION: masterProduction/domain/constants.ts:141-203
RELATED_TESTS: master-production-plan-g17.test.ts
STATUS: CONFIRMED
```

### BR-PP-021 — Roteiro de produção: `active` é imutável (G5)
```
DESCRIPTION: draft→[active]; active→[inactive, superseded]; inactive→[active]; superseded
             TERMINAL. Toda escrita de conteúdo exige `draft` (`G5-ROUTE-NOT-DRAFT`) —
             roteiro ativo NÃO muda; quem precisa mudar cria nova revisão, e a anterior vira
             `superseded` COM AS ETAPAS INTACTAS.
             Etapas: sequence 1..N CONTÍGUA (`G5-SEQ-GAP`), sem duplicidade (`G5-SEQ-DUP`),
             step_code único (`G5-STEP-CODE-DUP`), roteiro sem etapa não ativa
             (`G5-SEQ-EMPTY`), work_center inexistente/inativo barrado, etapa já apontada
             não pode sumir (`G5-ROUTE-IN-USE`).
             total_standard_time_minutes soma SÓ standard_time; setup é por LOTE e NÃO entra.
ORIGIN: gap G5; UC-71; docs/producao/04-ROTEIROS.md
OWNER: UNKNOWN  |  VALIDITY: 2026-08-10  |  PRIORITY: ALTA
CONDITIONS: A imutabilidade do `active` sustenta a rastreabilidade "como executado" de BR-PP-005.
EXCEPTIONS: work_center_id NULO é válido por desenho.
DÍVIDA DECLARADA: não existe production_orders.production_route_id — a OP não guarda qual
            revisão usou. Registrado em TODO.md e productionTrackingRules.ts:52-62.
IMPLEMENTATION: production/domain/productionRouteRules.ts:30-265
RELATED_TESTS: production-routes.test.ts
STATUS: CONFIRMED
```

### BR-PP-022 — Quem pode executar cada transição (RBAC)
```
DESCRIPTION:
  producao:view     GET  /orders, /report, /:id
  producao:operate  POST /orders, PUT /:id, PUT /:id/status  ← TODAS as transições da OP
                    (liberar, iniciar, pausar, concluir, cancelar) no MESMO nível
  producao:approve  DELETE /orders/:id
  chao_de_fabrica:operate  POST /:id/tracking, /tracking/:id/start, /tracking/:id/complete
  mrp:operate       POST /api/mrp/plan, /planned-orders/convert, /convert-to-production
  mrp:operate       POST /master-plans (create, decideLine, firm, release, cancel)
ORIGIN: docs/business/BUSINESS_RULES.md §8 e matriz módulo×permissão (:23-58)
OWNER: UNKNOWN  |  PRIORITY: ALTA
EXCEPTIONS: **Deliberada:** NENHUMA rota do MPS exige `approve`, embora firmar e liberar
            sejam atos de decisão. Justificativa no código (masterProductionPlans.ts:20-28):
            "nível de alçada do PCP é política de governança que o dono do produto não
            definiu"; registrado como pendência em TODO.md.
IMPLEMENTATION: productionOrders.ts:23-33; mrp.ts:14-17; masterProductionPlans.ts:33-39
RELATED_TESTS: rbac-critical-routes.test.ts; legacy-routes-rbac-regression.test.ts
STATUS: CONFIRMED, com lacuna de granularidade
```
**Achado de granularidade (MEDIUM/CONFIRMED):** a pergunta *"quem pode executar
cada transição"* tem, hoje, **uma única resposta para todas**: `producao:operate`.
Cancelar uma OP em `in_progress` (que libera reserva e joga fora o trabalho) e
liberar uma OP nova exigem exatamente o mesmo nível. Nenhum artefato declara isso
como decisão.

### BR-PP-023 — Laboratório: aprovação calculada, reprovação SEMPRE abre RNC (G8)
```
DESCRIPTION: `passed` NUNCA vem do cliente — é calculado: com min e max, result ∈ [min,max];
             só max → result ≤ max; só min → result ≥ min; sem result OU sem limite → 422.
             tester_id sempre do JWT. Se passed=false, cria SEMPRE Não-Conformidade
             (severity `major`, origin `final`, defect_type `acoustic`) e grava
             non_conformity_id no teste. Teste destrutivo debita do depósito LABORATORIO na
             MESMA transação.
ORIGIN: gap G8 (2026-08-09); UC-LAB-01; BUSINESS_RULES.md §12/§13 e UC-42-E
OWNER: UNKNOWN  |  VALIDITY: 2026-08-09  |  PRIORITY: ALTA
EXCEPTIONS: `create_rnc_on_fail` continua ACEITO no payload por compatibilidade e é IGNORADO
            (deprecated). A caixinha em client/src/pages/laboratory/RegisterTestTab.tsx ainda
            existe — a tela oferece uma escolha que o backend não honra mais.
RISCO RESIDUAL DECLARADO NO CÓDIGO (:180-185): a RNC nasce em transação PRÓPRIA, DEPOIS do
            commit do teste. Se falhar, o teste reprovado fica gravado sem RNC e a resposta é
            500 — exatamente o estado que o G8 existe para impedir.
IMPLEMENTATION: laboratory/application/use-cases/CreateAcousticTestUseCase.ts:84-98,126-208
RELATED_TESTS: nenhum arquivo de teste dedicado ao módulo laboratory ← LACUNA
STATUS: DISCOVERED — regra crítica de qualidade, com risco residual auto-declarado e SEM teste.
```

### BR-PP-024 — Engenharia: liberação de desenho técnico
```
DESCRIPTION: ReleaseDrawing exige status `draft`; grava `released`, approved_by e
             approval_date (data do servidor).
ORIGIN: UC-ENG-01 cobre projeto de engenharia; a regra do desenho não foi localizada em doc.
OWNER: UNKNOWN  |  PRIORITY: MÉDIA
EXCEPTIONS: Não há vínculo verificado entre "desenho liberado" e "BOM ativa"/"roteiro ativo":
            é possível produzir sem desenho liberado. Nenhuma regra exige o contrário.
IMPLEMENTATION: engineering/application/use-cases/ReleaseDrawingUseCase.ts:33-45
RELATED_TESTS: não localizado ← LACUNA
STATUS: DISCOVERED
```

### BR-PP-025 — ⚠ "Verificação de capacidade produtiva (CRP)" documentada e inexistente
```
DESCRIPTION: A documentação afirma, no fluxo principal de UC-12, passo 5:
             "Sistema verifica capacidade produtiva (CRP)".
ORIGIN: docs/projeto/04-USE_CASES.md:277
IMPLEMENTAÇÃO ENCONTRADA: **NENHUMA**. CreateProductionOrderUseCase.ts:36-54 valida produto
             ativo, tipo `finished` e disponibilidade de MATERIAL. Não há consulta a
             work_centers, calendário/turnos, nem carga. O módulo workCenters expõe carga
             (GetWorkCenterLoadUseCase / aggregateLoadByWorkCenter), mas é RELATÓRIO — nenhum
             caminho de criação/liberação/partida de OP a consulta. Verificado também em
             ConvertPlannedOrdersToProductionOrderUseCase e ReleaseMasterProductionPlanUseCase:
             nenhum dos três caminhos checa capacidade.
STATUS: OBSOLETE_CANDIDATE — regra documentada sem implementação. Ou a doc descreve intenção
        futura como fato, ou a regra foi abandonada. Não decidido (Regra 20-21).
```
**Correlato:** `GO_LIVE_G6_CHECKLIST.md:1285` registra `production_routes` com
**0 linhas**. Com `PRODUCTION_TRACKING_REQUIRED=block` (padrão e obrigatório em
produção), BR-PP-002 implica que, no estado de dados registrado, **nenhuma OP
consegue iniciar**. Consistência entre regra e dado, não defeito de regra — mas é
pré-condição de Go-Live.

---

## 2. Tabela-resumo (documentada × implementada × testada)

| BR-ID | Regra | Documentada | Implementada | Testada | Status |
|---|---|---|---|---|---|
| BR-PP-001 | Máquina de estados da OP | parcial | sim | sim | CONFIRMED |
| BR-PP-002 | Gate G6 de partida | sim (frase contraditória) | sim | sim (4) | CONFIRMED (ressalva) |
| BR-PP-003 | Responsável na partida | não | sim | **não** | DISCOVERED |
| BR-PP-004 | Reserva na liberação (G3) | sim | sim | sim | CONFIRMED |
| BR-PP-005 | Apontamento obrigatório (G4) | sim | sim | sim | CONFIRMED |
| BR-PP-006 | BOM ativa / qtd zero (G2) | só plano de ação | sim | parcial | DISCOVERED |
| BR-PP-007 | Sobreprodução | não | sim | parcial | DISCOVERED |
| BR-PP-008 | Lote obrigatório + FEFO | não | sim | **não** | DISCOVERED |
| BR-PP-009 | Custo MO + overhead | parcial | sim | sim | DISCOVERED |
| BR-PP-010 | Netting conjunto do MRP | só como correção | sim | sim | **CONFIRMED (atual)** |
| BR-PP-011 | Rateio por origem | não | sim | sim | DISCOVERED |
| BR-PP-012 | Desconto de quarentena (G7) | sim | sim | sim | CONFIRMED |
| BR-PP-013 | Lote mínimo = estoque segurança | **não** | sim (mesma coluna) | **não** | **CONFLICTING** |
| BR-PP-014 | Idempotência da requisição | sim | sim | sim (3) | CONFIRMED |
| BR-PP-015 | 3 caminhos de criação de OP | 2 de 3 | 3 (+1 morta) | sim | **CONFLICTING** |
| BR-PP-016 | Fantasma × estocável (G18) | sim | sim | sim | CONFIRMED |
| BR-PP-016b | MRP ignora `is_phantom` | não | divergente | não | **CONFLICTING** |
| BR-PP-017 | Ciclo de BOM (G1) | sim | sim | sim (4) | CONFIRMED / maxDepth UNKNOWN |
| BR-PP-018 | Estados do MPS | sim | sim | sim | CONFIRMED |
| BR-PP-019 | Liberar MPS | sim | sim | sim | CONFIRMED |
| BR-PP-020 | Conta do MPS | sim | sim | sim | CONFIRMED |
| BR-PP-021 | Roteiro imutável (G5) | sim | sim | sim | CONFIRMED |
| BR-PP-022 | RBAC por transição | parcial | sim | sim | CONFIRMED (lacuna) |
| BR-PP-023 | Laboratório passed/RNC | sim | sim | **não** | DISCOVERED |
| BR-PP-024 | Liberação de desenho | não | sim | **não** | DISCOVERED |
| BR-PP-025 | CRP na criação da OP | **sim** | **não** | n/a | **OBSOLETE_CANDIDATE** |

---

## 3. Achados transversais (insumo para traceability-auditor e director)

**A-1 — Não existe catálogo de BR-ID neste domínio.** A rastreabilidade real é
por código de gap (`G1`…`G18`) em `details.rule`, criada por auditorias de
remediação, não por decisão de negócio. Não é possível responder "quantas regras
a Produção tem?" a partir de artefato — só varrendo código. **HIGH/CONFIRMED.**

**A-2 — Regras críticas moram em comentário de código, não em requisito.**
BR-PP-003, -007, -008, -011 são lei em produção e não existem em nenhum artefato
de requisito. Os comentários são excelentes (datados, com justificativa) — mas
comentário não é artefato versionado de regra (CLAUDE.md Regra 16).

**A-3 — Aprovação humana citada sem registro.** `ProductionOrderEntity.ts:169`
afirma *"Gap G6 — FECHADO em 2026-08-10, com aprovação do dono"*. Não localizado
o registro dessa aprovação (Regra 17). **MEDIUM/HIGH.**

**A-4 — Valores de negócio em configuração de banco, sem valor documentado a
confrontar.** `overhead_rate_percent`, `default_labor_rate_per_hour`,
`overhead_calculation_basis` (BR-PP-009) e `maxDepth=10` (BR-PP-017). O confronto
"documento diz X, código aplica Y" é **impossível de executar**: não há X.
Escalar ao director (Regra 21).

**A-5 — Lacunas de teste em regra crítica:** BR-PP-003, -008 (FEFO/lote vencido),
-023 (laboratório/RNC), -024 (engenharia). Confiança MEDIUM: busca por glob de
nomes, não por cobertura instrumentada.

**A-6 — Candidatas a `finding-validator` (CRITICAL/HIGH):** BR-PP-013
(HIGH/CONFIRMED), BR-PP-015 (HIGH/CONFIRMED), BR-PP-016b (HIGH/MEDIUM), A-1
(HIGH/CONFIRMED).

---

## 4. O que este documento NÃO afirma

- Não decide qual lado está certo em nenhuma divergência (BR-PP-002 doc×doc,
  -013, -015, -025). Regra 20-21: decisão do responsável humano.
- Não executou nada. "Testada" na tabela significa **existe arquivo de teste cujo
  nome e escopo declarado cobrem a regra** — **não** que o teste passa nem que a
  asserção cobre o valor exato.
- Não auditou `workCenters` em profundidade além do papel nas regras de OP e
  roteiro. `mobileInventory`, OEE e paradas de produção ficaram fora do recorte.
- Não verificou se as duas estruturas de produto (`mrp_bom_edges` sobre
  `items`/UUID × `bill_of_material_items` sobre `products`/INT) são mantidas em
  sincronia — levantado em BR-PP-016b, deixado em aberto.

---

**Confirmação do recorte pedido:**
- **G6-START-NO-ROUTE:** são **três** condições e **três** códigos de erro (não
  um), e o gate é na **partida** (`→in_progress`), **não** na liberação —
  contrariando `GO_LIVE_G6_CHECKLIST.md:1292`.
- **Netting do MRP:** estado **ATUAL** verificado no código (não na memória) —
  netagem **conjunta** com rateio posterior por origem; a versão antiga não
  existe mais no arquivo.
- **Explosão de BOM:** fantasma/estocável confirmado; multinível e barragem de
  ciclo confirmados em três camadas; **divergência nova**: o motor MRP não conhece
  `is_phantom`.
- **Firmar/liberar MPS:** confirmados, com limitação de concorrência de material
  entre linhas auto-declarada no código e ausente de documento de negócio.

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only
reforçado; conteúdo persistido neste caminho pelo orquestrador (hook de
segregação bloqueia escrita VeriCore fora de `audit/`), sem edição de conteúdo.*
