# LEGACY_TRACEABILITY_MATRIX_planejamento-producao.md

**Programa:** ERP-LEGACY-001 · **Passo:** 29 (trilha VeriCore read-only, DISCOVERY) · **Cluster:** `planejamento-producao`
**Módulos:** `mrp`, `production`, `workCenters`, `masterProduction`, `engineering`, `laboratory` (confirmados em `server/src/modules/<módulo>/` via Glob)
**AUDIT_COMMIT alvo:** o HEAD real em disco (números do claudeMd/memória ignorados por instrução; releitura em disco em cada elo)
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nada executado: sem Bash, sem banco, sem teste rodado. Testes lidos por `describe/it`+asserção, arquivo:linha.
**Fontes relidas em disco:**
- `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_planejamento-producao.md` (passo 26)
- `.../USE_CASES_RECOVERED_planejamento-producao.md` (passo 28, UC-PLAN-01..22)
- `.../REQUIREMENTS_BASELINE.md` (passo 27, seção §3.3)
- `server/tests/**` (unit/integration/edge) — testes NÃO são co-locados nos módulos; vivem em `server/tests/`. **O Glob `server/src/modules/{...}/**/*.test.ts` retorna VAZIO** (fato registrado — é a causa-raiz das falsas "LACUNAS" a montante, ver §3 e §5).

## Ressalva estrutural — a matriz NASCE QUEBRADA (confirmada e detalhada)

O elo de **origem** de toda cadeia — **BR canônico versionado com ID, OWNER e vigência** — está **QUEBRADO em 26/26 linhas (100%)**. Não existe catálogo de BR neste domínio: os `BR-PP-NN` são rótulos **propostos no passo 26** e não constam de nenhum artefato versionado (a rastreabilidade real de facto é por **código de gap** `G1..G18` gravado em `details.rule`). Consequência: a coluna **"Status do elo mais fraco"** avalia o elo mais fraco **da cadeia a jusante** (REQ→UC→CÓDIGO→TC); mesmo quando esse elo é PRESENTE, **a cadeia continua nascendo quebrada na origem**. Não há uma única cadeia íntegra ponta a ponta.

Além da origem, o elo **AC (critério de aceite)** é **INEXISTENTE em 26/26**: o REQUIREMENTS_BASELINE (§6) prova que "nenhum dos 90 RFs tem OWNER, AC- ou aponta para um TC-; a cadeia BR→REQ→UC→AC→TC do §19/§20 do Master Spec não existe em nenhum requisito do repositório". A matriz pedida usa BR→REQ→UC→CÓDIGO→TC (sem coluna AC), mas o elo AC ausente é registrado como quebra transversal.

Convenção de célula: `conteúdo [STATUS]`, STATUS ∈ {PRESENTE, AMBÍGUO, QUEBRADO, INEXISTENTE}. `RF-PRD-02..09` = bloco agregado de requisitos de produção que o passo 27 declara CONFIRMED **em bloco, sem desagregação 1:1 para BR** → por isso o elo REQ é AMBÍGUO onde só existe o agregado.

> **NOTA DO ORQUESTRADOR:** o "Glob retorna vazio dentro dos módulos porque os testes vivem em `server/tests/`" é um achado metodológico valioso desta trilha (causa-raiz 5): explica por que os passos 26/28 sub-reportaram cobertura. A trilha **melhorou** o veredito por evidência (laboratory e engineering/ReleaseDrawing TÊM teste). HEAD real da sessão = `7b705f1` (só docs commitados desde a baseline `c9359be`; nenhum `src/` mudou).

---

## 1. Tabela principal (uma linha por BR)

| BR-ID prov. | gap | REQ | UC-PLAN | CÓDIGO (arquivo:linha) | TC (arquivo:linha) | Elo + fraco (a jusante) | Observação |
|---|---|---|---|---|---|---|---|
| BR-PP-001 | — | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06 [AMBÍGUO] | ProductionOrderEntity.ts:60-67,157-213 [PRESENTE] | production-order-lifecycle.test.ts:203-850; production-order-status-concurrency.test.ts [PRESENTE] | AMBÍGUO (REQ agregado, UC sem cartão) | `paused→in_progress` e terminalidade só no código. |
| BR-PP-002 | G6 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06 [AMBÍGUO] | productionTrackingRules.ts:394-464; ChangeProductionOrderStatusUseCase.ts:302-328 [PRESENTE] | production-start-gate-g6.test.ts:179,301; production-start-gate-route-step-g6.test.ts; production-start-manual-tracking-bypass.test.ts; runtime-env-production-tracking.test.ts [PRESENTE] | AMBÍGUO (doc GO_LIVE contradiz a si mesma; gate é na partida) | Teste prova que liberar NÃO é barrado (l.189) — refuta GO_LIVE_G6:1292. |
| BR-PP-003 | D | **INEXISTENTE** (fantasma, sem REQ) | UC-PLAN-06 [AMBÍGUO] | ChangeProductionOrderStatusUseCase.ts:101-104; ProductionOrderEntity.ts:49-51 [PRESENTE] | production-start-gate-g6.test.ts:274-279 [PRESENTE, fraco] | QUEBRADO (REQ inexistente) | **REFUTA doc passo 26** ("nenhum teste ← LACUNA"): teste existe (integração, DB-gated), asserção fraca (null-ou-inteiro). |
| BR-PP-004 | G3 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06/05/08 [AMBÍGUO] | ChangeProductionOrderStatusUseCase.ts:87-90,687-710,721-727,759-765 [PRESENTE] | production-order-lifecycle.test.ts:286-354; production-order-material-reservation.test.ts [PRESENTE] | AMBÍGUO (UC-12 fluxo principal contradiz: reserva na criação) | Fluxo principal do UC-12:280 é OBSOLETE_CANDIDATE. |
| BR-PP-005 | G4 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06/09 [PRESENTE] (UC-73) | productionTrackingRules.ts:80-123,298-603; ChangeProductionOrderStatusUseCase.ts:330-368 [PRESENTE] | production-tracking-required-g4.test.ts; production-order-lifecycle.test.ts:593-700 [PRESENTE] | AMBÍGUO (só REQ agregado) | Cadeia a jusante forte; quebra só em REQ + origem. |
| BR-PP-006 | G2 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06 [AMBÍGUO] | ChangeProductionOrderStatusUseCase.ts:389-396,412-423 [PRESENTE] | production-order-lifecycle.test.ts:852-914 [PRESENTE] | AMBÍGUO | **REFUTA "parcial" do passo 26**: G2 (qtd zero + sem BOM) tem cobertura forte e explícita (`details.rule==='G2'`). |
| BR-PP-007 | D | **INEXISTENTE** (fantasma, F-27) | UC-PLAN-06 [AMBÍGUO] | ProductionOrderEntity.ts:187-209 [PRESENTE] | production-order-lifecycle.test.ts:562-591; production-order-scrap.test.ts [PRESENTE] | QUEBRADO (REQ inexistente) | Guarda testada; "sem teto por flag no body" é política sem decisão — sem teto a testar. |
| BR-PP-008 | D | **INEXISTENTE** (fantasma) | UC-PLAN-06 [AMBÍGUO] | ChangeProductionOrderStatusUseCase.ts:774-793,823-908,916-945 [PRESENTE] | production-order-lifecycle.test.ts:702-798 (lote vencido+bloqueado) [AMBÍGUO] | QUEBRADO (REQ inexistente) | **REFUTA parte do passo 26**: recusa de lote vencido/bloqueado ESTÁ testada; **ordenação FEFO automática (fallback) permanece SEM teste**. |
| BR-PP-009 | D | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-06 [AMBÍGUO] | ChangeProductionOrderStatusUseCase.ts:565-613,638-658; productionTrackingRules.ts:236-284 [PRESENTE] | production-labor-overhead-cost.test.ts [PRESENTE] | AMBÍGUO | Taxa/overhead/base são config de banco sem valor documentado a confrontar (A-4). |
| BR-PP-010 | crit.1 | RF-PRD-02..09 [AMBÍGUO] | **UC-PLAN-01 [QUEBRADO/FANTASMA]** | mrpEngine.ts:221-268; GenerateMrpPlanUseCase.ts:115 [PRESENTE] | mrp-multi-demand-netting.test.ts; mrp-engine.test.ts [PRESENTE] | QUEBRADO (hub UC-PLAN-01 sem cartão) | Netting conjunto verificado no código atual. |
| BR-PP-011 | D | **INEXISTENTE** (fantasma) | **UC-PLAN-01 [QUEBRADO/FANTASMA]** | allocatePlanByOrigin.ts:139-260 [PRESENTE] | mrp-multi-demand-allocation.test.ts [PRESENTE] | QUEBRADO (REQ inexistente + hub fantasma) | Política de PCP (ratear por prioridade) recusada em código, não ratificada. |
| BR-PP-012 | G7 | RF-PRD-02..09 [AMBÍGUO] | **UC-PLAN-01 [QUEBRADO]** (+UC-PLAN-12) | SequelizeItemRepository.ts:79-107 [PRESENTE] | mrp-quarantine-discount.test.ts; quarantine-blocks-planning-balance.test.ts [PRESENTE] | QUEBRADO (hub fantasma) | Crosswalk `products.code=items.codigo`. |
| BR-PP-013 | — | RF-PRD-04 [AMBÍGUO] | **UC-PLAN-01 [QUEBRADO]** | SequelizeItemRepository.ts:109-110 (mesma coluna `min_quantity`) × mrpEngine.ts:246-254 [PRESENTE] | **nenhum** confronta a coluna única [QUEBRADO] | **QUEBRADO (TC + REQ + hub)** | mrp-engine.test.ts:18 usa `safetyStock:5`≠`minimumLotSize:10` (distintos) → NÃO exercita o defeito. **CANDIDATO FINDING HIGH/CONFIRMED.** |
| BR-PP-014 | crit.2 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-03 (UC-24)/UC-PLAN-01 [AMBÍGUO] | createRequisitionFromPlannedOrders.ts:32,71-88; GenerateMrpPlanUseCase.ts:172-231 [PRESENTE] | mrp-requisition-helper-idempotency.test.ts; mrp-rerun-idempotency.test.ts; mrp-auto-convert.test.ts [PRESENTE] | AMBÍGUO (UC-24 com drift de ator; auto-convert no hub fantasma) | — |
| BR-PP-015 | G16 | **INEXISTENTE** (fantasma) | UC-PLAN-04/05/15 [AMBÍGUO: doc cobre 2 de 3] | CreateProductionOrderUseCase.ts:36-54; Convert…ToProductionOrderUseCase.ts:128-188; ReleaseMasterProductionPlanUseCase.ts:185-238; ProductionOrderEntity.ts:139-145 (morto) [AMBÍGUO] | mrp-convert-to-production-order.test.ts; master-production-plan-g17.test.ts; master-production-plan-cycle.test.ts [AMBÍGUO] | QUEBRADO (REQ inexistente) | 4 implementações (3 ativas + 1 morta), 2 respostas; testes cobrem caminhos isolados, **não confrontam a divergência de rigor nem o método morto**. **CANDIDATO FINDING HIGH/CONFIRMED.** |
| BR-PP-016 | G18 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-04/06 [PRESENTE] | bomService.ts:129,350-355,489-515,505 [PRESENTE] | bom-two-level-reparo.test.ts; bom-recursive.test.ts [PRESENTE] | AMBÍGUO (só REQ agregado + origem) | Fantasma×estocável confirmado. |
| BR-PP-016b | — | **INEXISTENTE** (fantasma) | **UC-PLAN-01 [QUEBRADO]** | mrpEngine.ts:164,184-206 × bomService.ts:505 [AMBÍGUO: 2 impl. divergentes] | **nenhum** confronta a divergência [QUEBRADO] | **QUEBRADO (CÓDIGO divergente + TC + REQ)** | Explosões operam sobre tabelas diferentes (`items`/UUID × `products`/INT); sincronia não verificada. **CANDIDATO FINDING HIGH/MEDIUM.** |
| BR-PP-017 | G1 | RF-PRD-02..09 [AMBÍGUO] | **INEXISTENTE** (BOM CRUD sem UC-PLAN no cluster) | bomService.ts:226-234,254-278,459-464,751-758; bomStructureProjection.ts [PRESENTE] | bom-cycle-multilevel.test.ts; bom-tree-cycle.test.ts; bom-create-revision-rules-g1.test.ts; bom-single-source-g1.test.ts [PRESENTE] | QUEBRADO (UC inexistente) | Barragem de ciclo forte; `maxDepth=10` sem doc de negócio a confrontar (UNKNOWN). |
| BR-PP-018 | G17 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-13/14 (UC-72) [PRESENTE] | masterProduction/domain/constants.ts:206-236; ChangeMasterProductionPlanStatusUseCase.ts:67-106 [PRESENTE] | master-production-plan-g17.test.ts; master-production-plan-cycle.test.ts [PRESENTE] | AMBÍGUO (só REQ + origem) | Cadeia a jusante forte. |
| BR-PP-019 | G17 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-15 (UC-72) [PRESENTE] | ReleaseMasterProductionPlanUseCase.ts:86-238 [PRESENTE] | master-production-plan-cycle.test.ts [PRESENTE] | AMBÍGUO | Limitação de concorrência de material entre linhas do mesmo plano (auto-declarada :37-43) **não testada**. |
| BR-PP-020 | — | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-12 (UC-72) [PRESENTE] | masterProduction/domain/constants.ts:141-203 [PRESENTE] | master-production-plan-g17.test.ts [PRESENTE] | AMBÍGUO | 3 políticas declaradas como não decididas pelo dono (constants.ts:23-35). |
| BR-PP-021 | G5 | RF-PRD-02..09 [AMBÍGUO] | UC-PLAN-10 (**UC-71** catálogo) [PRESENTE, com COLISÃO] | productionRouteRules.ts:30-265 [PRESENTE] | production-routes.test.ts [PRESENTE] | AMBÍGUO (UC-71 colide, ver §3) | **Colisão UC-71**: catálogo = "Roteiro de Produção"; RH usa UC-71 = "Afastamentos". No cluster o UC-71 é o de roteiro. |
| BR-PP-022 | — | RF-AUT-05/07/08 [AMBÍGUO] | transversal (sem UC único) [AMBÍGUO] | productionOrders.ts:23-33; mrp.ts:14-17; masterProductionPlans.ts:33-39 [PRESENTE] | rbac-critical-routes.test.ts; legacy-routes-rbac-regression.test.ts [PRESENTE] | AMBÍGUO | Todas as transições da OP no mesmo `producao:operate`; sem granularidade decidida em artefato. |
| BR-PP-023 | G8 | RF-QUA-04/05 [AMBÍGUO/INFERRED] | UC-PLAN-21 (UC-LAB-01) [PRESENTE] | CreateAcousticTestUseCase.ts:84-98,126-208 [PRESENTE] | **laboratory-tests.test.ts:44-310 [PRESENTE]** | AMBÍGUO (REQ INFERRED) | **REFUTA a PREMISSA e o passo 26/28**: `laboratory` TEM teste (computePassed; RNC no fail G8 mesmo sem flag; consumo destrutivo debita LABORATORIO). **Risco residual (RNC pós-commit → 500) NÃO testado** (mock resolve a RNC). |
| BR-PP-024 | D | **INEXISTENTE** (sem REQ para liberação de desenho) | UC-PLAN-19 (UC-ENG-02) [PRESENTE] | ReleaseDrawingUseCase.ts:33-45 [PRESENTE] | **engineering-module.test.ts:75-114 [PRESENTE]** | QUEBRADO (REQ inexistente) | **REFUTA o passo 26** ("não localizado ← LACUNA"): ReleaseDrawing tem teste (draft→released, approved_by, approval_date, rejeita não-draft, NotFound). |
| BR-PP-025 | CRP | RF-PRD-01 [OBSOLETE_CANDIDATE] | UC-PLAN-05 (passo 5 doc) + **UC-PLAN-16 [FANTASMA]** | **NENHUMA [INEXISTENTE]** | n/a — sem código [INEXISTENTE] | **QUEBRADO/INEXISTENTE (código ausente)** | "CRP" documentada em UC-12:277 sem implementação em nenhum dos 3 caminhos de criação/liberação/partida. Relatório de carga existe (GetWorkCenterLoadUseCase) mas nenhum fluxo de OP o consulta. |

---

## 2. Placar

### 2.1 Integridade por elo (26 linhas BR)

| Elo | PRESENTE | AMBÍGUO | QUEBRADO | INEXISTENTE / OBSOLETE |
|---|---|---|---|---|
| **BR canônico (origem)** | 0 | 0 | **26** | 0 |
| REQ | 0 | 18 | — | 7 INEXISTENTE + 1 OBSOLETE |
| UC-PLAN | 8 | 11 | 7 (5 fantasma + 1 UC ausente + CRP) | — |
| CÓDIGO | 23 | 2 (BR-PP-015, -016b) | 0 | 1 INEXISTENTE (BR-PP-025) |
| TC | **21** | 2 (BR-PP-008, -015) | 2 (BR-PP-013, -016b) | 1 n/a (BR-PP-025) |

### 2.2 Cadeias completas × quebras

- **Cadeias completas ponta a ponta (BR canônico→REQ→UC→CÓDIGO→TC todos PRESENTE): 0 de 26.** A quebra é garantida na origem (BR não canônico) e reforçada em REQ (0 PRESENTE — só agregado/fantasma).
- **Cadeias fortes a jusante** (REQ AMBÍGUO como único ponto fraco, UC+CÓDIGO+TC todos PRESENTE): **7** — BR-PP-005, 016, 018, 019, 020, 021, 023. (BR-PP-021 com colisão UC-71; BR-PP-023 com risco residual sem teste.)
- **Quebra pela ausência do hub MRP (UC-PLAN-01 FANTASMA):** 4 BRs (010, 011, 012, 013) + 016b.
- **Elo mais fraco = TC:** BR-PP-013 e BR-PP-016b (QUEBRADO); BR-PP-008 e BR-PP-015 (AMBÍGUO).
- **Elo mais fraco = CÓDIGO INEXISTENTE:** BR-PP-025 (CRP).

### 2.3 Cobertura de TESTE REAL por UC-PLAN (verificada em disco)

| Cobertura | UC-PLAN | Nota |
|---|---|---|
| **COM teste real dedicado (17)** | 01 (hub: netting/allocation/quarantine/idempotency), 03, 04, 05, 06, 09, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, **21 (laboratory)** | 21 refuta a premissa |
| **SEM teste dedicado (5)** | 02 (listar planejadas), 07 (update OP), 08 (remover OP), 16 (carga/CRP — só work-centers.test.ts parcial), 22 (listar testes lab) | leituras/CRUD secundário |

**Correção material ao insumo:** ~17 de 22 UCs do cluster têm teste real. Os passos 26/28 e a própria premissa desta tarefa afirmam ausência de teste em `laboratory` e em `engineering/ReleaseDrawing` — **falso contra o commit auditado**. Ver §5.

---

## 3. Elos reversos

### 3.1 UCs FANTASMA (código sem cartão de UC em nenhum dos 3 docs)
`UC-PLAN-01` (**hub do cluster — geração do plano MRP**, o comportamento mais central, sem cartão), `UC-PLAN-02`, `UC-PLAN-07`, `UC-PLAN-11` (Paradas de Máquina, inclui bloqueio de 2ª parada — regra crítica só como nó BPMN), `UC-PLAN-16` (Carga-Máquina/CRP), `UC-PLAN-17` (Centros de Trabalho CRUD/turnos). O hub e o relatório que a CRP usaria são **ambos** fantasma.

### 3.2 UCs sem teste — **REFUTAÇÃO DA PREMISSA**
A premissa e os insumos afirmam que `laboratory` não tem teste automatizado. **FALSO:** `server/tests/unit/laboratory-tests.test.ts` (UC-PLAN-21 / BR-PP-023) tem asserções reais sobre `CreateAcousticTestUseCase` — cálculo de `passed`, criação de RNC no fail G8 mesmo sem `create_rnc_on_fail`, e débito destrutivo do depósito LABORATORIO. `server/tests/unit/engineering-module.test.ts` cobre UC-PLAN-18/19/20 (incl. `ReleaseDrawingUseCase`, BR-PP-024). Os UCs realmente **sem** teste dedicado são: **UC-PLAN-02, 07, 08, 22** (leituras/CRUD) e **UC-PLAN-16 parcial**. Lacuna residual dentro de UC-PLAN-21: o **risco auto-declarado** (RNC em transação própria pós-commit → 500) não é exercitado.

### 3.3 REQs fantasma / OBSOLETE
- **RF-PRD-01 (CRP): OBSOLETE_CANDIDATE** — documentado, sem implementação (BR-PP-025). Relatório de carga existe mas nenhum fluxo de OP o consulta.
- **RF-PRD-02..09: agregado sem desagregação 1:1** — 18 BRs "batem" contra um bloco de RFs indistintos; o elo REQ→BR não é resolvível em nível de ID (AMBÍGUO estrutural).
- **RF-PRD-04 ↔ BR-PP-013:** único mapeamento RF↔BR explícito do cluster, e é justamente CONFLICTING interno (mesma coluna `min_quantity`).
- **RF-QUA-04/05: INFERRED** (laboratory) — existe como candidato, não como requisito; mas o comportamento **tem** teste.
- **Sem REQ algum (INFERRED/fantasma):** BR-PP-003, 007, 008, 011, 015, 016b, 024.

### 3.4 Código sem BR (candidato a UNDOCUMENTED BEHAVIOR — NÃO promovido)
- **Paradas de máquina** (`OpenProductionDowntimeUseCase`, `FinishProductionDowntimeUseCase`, bloqueio de 2ª parada) — UC-PLAN-11, **nenhuma BR-PP catalogada** (o próprio passo 26 §4 exclui do recorte); tem teste (`production-downtime.test.ts`, `production-downtime-concurrency.test.ts`).
- **Centros de Trabalho CRUD/turnos** (UC-PLAN-17) e **Carga/CRP** (UC-PLAN-16) — sem BR-PP; `work-centers.test.ts`.
- **Projeto de Engenharia** (UC-PLAN-18) e **Ficha Técnica Thiele-Small** (UC-PLAN-20) — sem BR-PP; cobertos por `engineering-module.test.ts`.
- **Leituras** UC-PLAN-02/07/08/22 — sem BR-PP e sem teste.
- **Código morto de regra:** `ProductionOrderEntity.assertCanBeCreatedFor:139-145` — implementa a regra de BR-PP-015 e não é invocado por nenhum fluxo; sem teste que o marque como morto.

---

## 4. Causas-raiz (registradas, não decididas — Regra 20-21)

1. **Ausência de catálogo de BR-ID canônico (A-1 do passo 26).** A rastreabilidade de facto é por código de gap `G1..G18` em `details.rule`, produto de auditorias de remediação, não de decisão de negócio. É a quebra da origem em 26/26 linhas. **HIGH/CONFIRMED.**
2. **Elo REQ→BR não resolvível em ID.** O baseline confirma RF-PRD-02..09 "em bloco"; só há 2 mapeamentos RF↔BR explícitos (RF-PRD-01↔025 OBSOLETE, RF-PRD-04↔013 CONFLICTING). Somado à ausência total de AC- e ponteiro TC- nos 90 RFs, a cadeia `BR→REQ→UC→AC→TC` do §19/§20 do Master Spec **não existe** em nenhum requisito. **HIGH/CONFIRMED.**
3. **Colisão de UC-71.** Catálogo (`04-USE_CASES.md:2612-2671`, via UC-PLAN-10) usa UC-71 = "Roteiro de Produção"; o módulo de RH usa UC-71 = "Afastamentos". Mesmo ID, dois casos de uso em domínios distintos → rastreabilidade por UC-ID é ambígua fora do contexto do cluster. Neste cluster, UC-71 = roteiro. **MEDIUM/CONFIRMED.**
4. **CRP documentada sem código (BR-PP-025 / RF-PRD-01).** Doc afirma "Sistema verifica capacidade produtiva (CRP)" (UC-12:277) como fato; nenhum dos 3 caminhos de OP a implementa. Elo CÓDIGO INEXISTENTE com REQ/UC vivos → cadeia quebrada no meio. **MEDIUM/CONFIRMED.**
5. **Insumos a montante sub-reportaram cobertura de teste.** Passos 26/28 (e a premissa desta tarefa) marcam `laboratory`, `engineering/ReleaseDrawing`, BR-PP-003, -006, -008 como "sem teste/parcial". A causa é metodológica: **os testes não são co-locados** — vivem em `server/tests/`, e o Glob `server/src/modules/{...}/**/*.test.ts` retorna vazio. Um agente que globou dentro do módulo declarou LACUNA onde há teste real. Registro isto como quebra reversa: **elos marcados QUEBRADO a montante que são de fato PRESENTE** (BR-PP-003, 006, 008-parcial, 023, 024). Corrigir a matriz por evidência, nunca preencher por inferência — aqui a evidência **melhora** o veredito. **MEDIUM/CONFIRMED.**

---

## 5. Candidatos a finding (NÃO promovidos — seguem ao passo 31 / finding-validator)

1. **BR-PP-013 — lote mínimo e estoque de segurança leem a MESMA coluna (`min_quantity`)**, sem teste que confronte as duas semânticas (mrp-engine.test.ts:18 usa valores distintos). `SequelizeItemRepository.ts:109-110` × `mrpEngine.ts:246-254`. **HIGH/CONFIRMED.**
2. **BR-PP-015 — 4 implementações da regra de tipo de produto** (3 ativas com 2 respostas + 1 método morto), testadas isoladamente, sem teste da divergência de rigor nem do código morto. **HIGH/CONFIRMED.**
3. **BR-PP-016b — MRP ignora `is_phantom`**; explosões divergentes sobre tabelas diferentes (`items`/UUID × `products`/INT), sincronia não verificada, sem teste que confronte. **HIGH/MEDIUM (escalar, Regra 21).**
4. **Ausência de catálogo de BR + cadeia REQ→UC→AC→TC inexistente** (causas-raiz 1-2). **HIGH/CONFIRMED.**
5. **Colisão UC-71** (roteiro × afastamentos). **MEDIUM/CONFIRMED.**
6. **BR-PP-025 / RF-PRD-01 — CRP documentada sem código** e relatório de carga (UC-PLAN-16) fantasma. **MEDIUM/CONFIRMED.**
7. **BR-PP-023 — risco residual não testado** (RNC pós-commit → 500), apesar do núcleo G8 coberto. **MEDIUM/MEDIUM.**
8. **BR-PP-008 — ordenação FEFO automática (fallback) sem teste** (recusa de vencido/bloqueado já coberta). **MEDIUM/CONFIRMED.**
9. **Insumos a montante com cobertura de teste sub-reportada** (causa-raiz 5) — impacta a fidelidade da própria matriz de descoberta; recomenda-se rerodar o levantamento de testes do cluster contra `server/tests/`. **MEDIUM/CONFIRMED.**

---

## 6. O que esta trilha NÃO afirma
- Não decide qual lado está certo em nenhuma divergência (Regra 20-21 — responsável humano).
- Não promove finding nem atribui severidade final (§5 são candidatos ao validador).
- Não inventou elo: cada célula PRESENTE tem arquivo:linha relido em disco; cada QUEBRADO/INEXISTENTE registra ausência de evidência, nunca a preenche.
- "PRESENTE" em TC significa que o `describe/it` exercita o comportamento com asserção (arquivo:linha) no código lido; **não** que o teste passa nem que a asserção cobre o valor exato. Testes de integração (BR-PP-002, 003, 004) rodam sob `describe.skip` sem pré-requisitos de banco — existem e têm asserção, execução condicionada.
- Não reexecutou nada; sem Bash, sem banco, sem teste rodado.

---

## Notas de entrega (paths absolutos relevantes)

Deliverable para persistir pelo orquestrador em `docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_TRACEABILITY_MATRIX_planejamento-producao.md` (escrita VeriCore fora de `audit/` é bloqueada pelo hook org-isolation — devolvido como texto).

Fontes lidas em disco:
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\BUSINESS_RULE_CANDIDATES_planejamento-producao.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\USE_CASES_RECOVERED_planejamento-producao.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\REQUIREMENTS_BASELINE.md`

Evidência de teste que refuta a premissa (leia estes se for revisar):
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\laboratory-tests.test.ts` (BR-PP-023 / UC-PLAN-21)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\engineering-module.test.ts` (BR-PP-024 / UC-PLAN-18/19/20)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\integration\production-start-gate-g6.test.ts` (BR-PP-002/003)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\production-order-lifecycle.test.ts` (BR-PP-004/005/006/007/008)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\mrp-engine.test.ts` (BR-PP-013 — prova que os campos usados são distintos, logo o defeito não é confrontado)

**Resumo executivo:** o cluster tem **0 cadeias completas** — a matriz nasce quebrada na origem (26/26 sem BR canônico) e no elo REQ (0 PRESENTE). O hub do cluster (UC-PLAN-01) e a CRP (UC-PLAN-16) são fantasma; BR-PP-025 tem CÓDIGO inexistente. Os elos com quebra a jusante mais forte são BR-PP-013 e BR-PP-016b (TC QUEBRADO). Diferentemente do que a premissa e os passos 26/28 afirmam, **a cobertura de teste do cluster é alta (~17/22 UCs; 21/26 BRs com TC PRESENTE)** — a suposta ausência de teste em `laboratory` e `engineering/ReleaseDrawing` é falsa contra o commit auditado, e a causa é o Glob restrito à pasta do módulo enquanto os testes vivem em `server/tests/`.
