# LEGACY_TRACEABILITY_MATRIX_qualidade-estoque.md

**Programa:** ERP-LEGACY-001 · **Passo:** 29 (Matriz de Rastreabilidade do Legado) · **Trilha:** VeriCore read-only · **Modo:** DISCOVERY (não é auditoria 360°, não é remediação)
**Cluster:** `qualidade-estoque` · **Módulos:** `quality`, `nonConformities`, `traceability`, `inventory`, `mobileInventory`, `assets`, `maintenance`
**Cadeia rastreada:** `BR → REQ → UC → CÓDIGO(arquivo:linha) → TC(teste)`
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum arquivo alterado, nenhum teste/script/banco executado (sem Bash). Cada elo é `PRESENTE`, `QUEBRADO` ou `AMBÍGUO`. Nenhum elo inventado; ausência de evidência é registrada como `QUEBRADO`/`INEXISTENTE`, nunca preenchida por inferência (Regras 6-7).

**Fontes (relidas em disco nesta sessão):**
- BRs: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_qualidade-estoque.md` (passo 26)
- UCs: `.../USE_CASES_RECOVERED_qualidade-estoque.md` (UC-QUALEST-01..20, passo 28)
- REQs: `.../REQUIREMENTS_BASELINE.md` (passo 27, §2.1, §3.3, §4)
- Testes: `server/tests/**` (unit + integration), lidos por `describe/it/test` + linha, **não executados**.

> **RESSALVA GLOBAL — A MATRIZ NASCE QUEBRADA.** Confirmado e detalhado abaixo: **nenhuma das 13 regras do cluster tem BR-ID canônico versionado**. `BR-QE-NN` são IDs **provisórios do passo 26**; a única rastreabilidade em runtime é `details.rule='G7'` (um único gap dos 13). Vários comportamentos com efeito de estoque/financeiro **não têm UC no catálogo** (recebimento/quarentena, scan mobile, contagem cíclica, movimentação manual, ativos, FEFO de expedição). Consequência: **0 cadeias completas** e a âncora BR canônica está `QUEBRADA` em 13/13 linhas antes mesmo do primeiro elo.
>
> **Procedência das coordenadas.** `TC arquivo:linha` foram **lidos diretamente em disco nesta sessão**. `CÓDIGO arquivo:linha` são **consolidados dos passos 26/28** (insumos dos auditores de BR e UC); não foram re-verificados linha a linha neste passo — este agente consolida rastreabilidade, não reaudita código (Regra 2, §19 Master Spec).

---

## 1. Tabela principal — uma linha por BR (13 regras)

Colunas de elo marcadas `PRESENTE` / `QUEBRADO` / `AMBÍGUO`. `CÓDIGO` traz "(DIVERGENTE)" quando há implementação conflitante/violadora. "Elo mais fraco" define o status da cadeia.

| BR-ID (provisório) | gap | REQ | UC-QUALEST | CÓDIGO (arquivo:linha) | TC (arquivo:linha) | Elo mais fraco → Status | Observação |
|---|---|---|---|---|---|---|---|
| **BR-QE-001** Gate de liberação de lote | G7 | `RF-EST-05`,`RF-QUA-03` — **AMBÍGUO** (existem, sem AC/TC; vínculo só no discovery) | 01/02/04 — **PRESENTE** | `quality/domain/constants.ts:127-155,167-181`; `inventory/.../ReleaseLotUseCase.ts:118-181` — **PRESENTE** | `quality-inspection-release-gate.test.ts:137-334`; `quality-release-after-block.test.ts:154-236` — **PRESENTE** (regra pura + empate de instante + pós-bloqueio) | **AMBÍGUO** | Única cadeia quase completa. Quebra fina: `01-CONTROLE_QUALIDADE.md:154` omite o 3º motivo `inspection_before_block`; JSDoc `SequelizeQualityRepository.ts:47-49` diz que o inspetor informa a data, mas o código grava `new Date()`. |
| **BR-QE-002** Evidência mínima da inspeção | — (D/ISO 8.6-8.7) | **QUEBRADO** (limiar `≥3` sem origem documental; ISO citada por número, sem RF) | 01 — **PRESENTE** | `CreateQualityInspectionUseCase.ts:51,54,87-162` — **PRESENTE** | `quality-inspection-release-gate.test.ts:351-485` — **PRESENTE** (rejeita fora de ENUM, exige critério/justificativa) | **QUEBRADO** (REQ) | O valor `3` (acceptance_criteria) é constante de código sem documento; teste exercita presença, não prova a fronteira exata `=3`. |
| **BR-QE-003** Reprovação abre RNC e bloqueia lote | G8/G10 | **QUEBRADO** (severity `major` fixo, sem RF; listado como fantasma na baseline §3.3) | 01 — **PRESENTE** | `CreateQualityInspectionUseCase.ts:164-202` (:184,:186 hardcoded) — **PRESENTE** | `quality-inspection-release-gate.test.ts:486-531` — **PRESENTE** | **QUEBRADO** (REQ) | "Toda reprovação é MAJOR" é decisão de negócio embutida em literal; inspetor não classifica. |
| **BR-QE-004** Statuses bloqueáveis (2 listas) | — (D) | **QUEBRADO** (nenhum RF; baseline §3.3 fantasma) | 05/06 — **AMBÍGUO** (o próprio doc reflete 2 listas: UC-17 × UC-17B) | `BlockLotUseCase.ts:26` `['quarantine','available']` **×** `CreateNonConformityUseCase.ts:15` `['available','quarantine','reserved']` — **PRESENTE (DIVERGENTE)** | **nenhum teste compara as listas** — **QUEBRADO** | **QUEBRADO** | `reserved` só é bloqueável por caminho indireto (RNC). `BlockLotUseCase` não usa lock (`:56 findLotById`), assimétrico com `release`. |
| **BR-QE-005** Quarentena de recebimento e saldo retido | G17 | `RF-COM-07` — **AMBÍGUO** (citado no passo 26, domínio Suprimentos, sem AC) | **QUEBRADO** (nenhum UC cobre recebimento nem cálculo de saldo retido) | `quarantineBalanceService.ts:73,87-138`; `materialReceiptService.ts:161-196` — **PRESENTE** | `quarantine-blocks-planning-balance.test.ts:46-123`; `mrp-quarantine-discount.test.ts:286-529` — **PRESENTE** (2 suítes, 7 etapas de MRP) | **QUEBRADO** (UC) | Desconto de quarentena só nos leitores de planejamento; **furado pelo scan mobile** (ver BR-QE-011). Comportamento crítico com efeito financeiro sem UC. |
| **BR-QE-006** Re-recebimento rebaixa status | — (D) | **QUEBRADO** (fantasma F-34, baseline §4) | **QUEBRADO** (re-recebimento sem UC) | `materialReceiptService.ts:165-180` — **PRESENTE** | **nenhum teste** sobre lote `blocked` — **QUEBRADO** | **QUEBRADO** (3 elos) | Lote BLOQUEADO volta a `quarantine` por ação do Recebimento, contornando `BlockLotUseCase` e o gate `('qualidade','approve')`. Provável não intencional (Regra 20/21). |
| **BR-QE-007** FEFO — 2 definições de "vencido" | — (D) | **QUEBRADO** (fantasma, baseline §3.3) | **QUEBRADO** (sem UC no cluster; consumo em produção/venda) | `ChangeProductionOrderStatusUseCase.ts:851-853,867-886`; `saleLotService.ts:153-229` — **PRESENTE (DIVERGENTE)** | `sale-lot-quality-gate.test.ts:282-598` — **AMBÍGUO** (exercita FEFO de expedição; **fronteira "vence hoje" e a divergência instante×DATEONLY sem teste**) | **QUEBRADO** (REQ/UC) | Lote que vence HOJE é aceito pelo FEFO automático e recusado pelo caminho explícito. Linha histórica grava `Consumo FIFO OP` (`:900`) sendo a regra FEFO. |
| **BR-QE-008** Máquina de estados da contagem cíclica | — (D) | **QUEBRADO** (fantasma F-35, baseline §4) | 16 — **QUEBRADO** (não há UC no catálogo; só nó BPMN sem número, `DIAGRAMA_CASOS_DE_USO_BPMN.md:74`) | `CreateInventoryCountUseCase.ts:109-150`; `ApproveInventoryCountUseCase.ts:50-125`; `Reassign/Count/Submit/Reject...UseCase.ts` — **PRESENTE** | `inventory-count-assignment.test.ts:85-339`; `inventory-count-claim-concurrency.test.ts:117-191`; `warehouse-invariants.test.ts:329-575` — **AMBÍGUO** (atribuição/claim/escopo de depósito cobertos; **Submit, Reject, tolerância de variância e antiautoaprovação SEM teste**) | **QUEBRADO** (REQ/UC) | Sem política de tolerância/recontagem; autoaprovação não impedida (`ApproveInventoryCountUseCase` nunca compara aprovador × quem contou). Ajuste de qualquer magnitude por ator único. |
| **BR-QE-009** Classificação e efeito da RNC | G10 | `RF-QUA-02` — **AMBÍGUO/CONFLITANTE** (baseline §3.3: existe e diverge) | 06/07/08 — **AMBÍGUO** (07/08 CONFLITANTE) | `CreateNonConformityUseCase.ts:113-286`; `UpdateNonConformityUseCase.ts:26-36,73-127`; `NonConformity.ts:38` — **PRESENTE (DIVERGENTE)** | `non-conformity-supplier-return.test.ts` (criação/score); `handoff-signal.test.ts:133-158` (semáforo) — **AMBÍGUO** | **QUEBRADO** | **Sem grafo de transições** (`closed→open` possível). Encerra sem `root_cause`/`corrective_action` (ISO 9001 §10.2). **`effectiveness_result` inescrevível pela API** → toda RNC fechada fica vermelha; `handoff-signal.test.ts:152` alimenta `='effective'` que o write-path **nunca produz** — o conflito não é exercitado. |
| **BR-QE-010** Devolução ao fornecedor | — (D) | **QUEBRADO** (origem TODO/handoff, sem RF) | 09 — **AMBÍGUO** (sub-fluxo sem endpoint próprio, não catalogado) | `SupplierReturnHandler.ts:66-152`; `CreateNonConformityUseCase.ts:200-208`; `UpdateNonConformityUseCase.ts:94-120` — **PRESENTE** | `non-conformity-supplier-return.test.ts:68-388` — **PRESENTE** (estorno, ativo, idempotência, anti-duplicação) | **QUEBRADO** (REQ) | Cadeia UC→CÓDIGO→TC forte. Exceções silenciosas (c) `quantity_affected ≤0` e (d) sem id retornam sucesso sem estornar e **sem teste**; estorno decrementa `products.quantity` sem `warehouse_id` nem baixa de lote. |
| **BR-QE-011** Movimentação mobile fora de lote/depósito/quarentena | — (D/CRÍTICO) | `RF-EST-07` — **AMBÍGUO/CONFLITANTE** (baseline §3.3: código viola §12) | 17 — **QUEBRADO** (scan mobile sem UC no catálogo) | `ScanItemUseCase.ts:45-80` (valida :63-64, chama :67-74 sem `warehouseId`); `BatchScanUseCase.ts`; `mobileInventoryController.ts:21-40` — **PRESENTE (DIVERGENTE — viola BUSINESS_RULES §12 item 3)** | `mobileInventory-use-cases.test.ts:5-43` — **QUEBRADO (teste nominal)**: cobre só validação de entrada (campos, qty insuficiente, lote vazio); **o bypass de quarentena/depósito/lote NÃO é exercitado** | **QUEBRADO** (UC/TC) | **CRITICAL candidato.** Permite baixar material que a Qualidade não liberou (fura BR-QE-005), debita global sem depósito, ignora `lot_controls` (quebra a cadeia lida por `traceability`). Deve passar pelo vericore-finding-validator. |
| **BR-QE-012** Rastreabilidade é leitura cega à Qualidade | — (D) | **QUEBRADO** (só `BUSINESS_RULES.md §6`, sem RF de contrato) | 18 — **PRESENTE** (recuperado, raso) | `GetLotTraceabilityUseCase.ts:28-30`; `SequelizeQualityRepository.ts:4-11` (associação ausente, admitida em comentário) — **PRESENTE** | `traceability.test.ts:12` (só `id inválido 400`); `lot-traceability-qrcode.test.ts:41-145` (lookup+QR) — **QUEBRADO (teste nominal)**: não prova inclusão/exclusão das inspeções no histórico | **QUEBRADO** (REQ/TC) | Histórico de lote NÃO inclui `QualityInspection` (não registrado em `models/index.ts`). Rastreabilidade que não rastreia qualidade. |
| **BR-QE-013** Ativos: baixa e ciclo com manutenção | — (D) | **QUEBRADO** (origem handoff/migration `20260805-000006`, sem RF) | 19/20 — **AMBÍGUO** (19 sem UC catalogado; 20/UC-18 CONFLITANTE) | `DeactivateAssetUseCase.ts:36`; `CreateMaintenanceOrderUseCase.ts:46-76`; `UpdateMaintenanceOrderUseCase.ts:74-103` — **PRESENTE** | `assets-use-cases.test.ts:8-78`; `maintenance-order-lifecycle.test.ts:73-157` — **PRESENTE** (baixa `decommissioned`; OM→ativo `in_maintenance`/release) | **QUEBRADO** (REQ) | OM sem grafo de transições (`completed→open` possível) — **sem teste**. UC-18 promete "preventiva" e "peças trocadas" que o código não faz (OBSOLETE_CANDIDATE). |

---

## 2. Elos reversos (o que a matriz direta não captura)

### 2.1 CÓDIGO sem UC — comportamento com efeito de estoque/financeiro sem caso de uso catalogado
Confirma a premissa. Estes existem em código+rota, mas **não têm UC oficial** (são "código-sem-UC" no passo 28, insumo direto de F-8):

| Comportamento | UC recuperado (não oficial) | Código | Situação |
|---|---|---|---|
| Recebimento de material → cria/atualiza lote em quarentena, incrementa saldo | — (nenhum UC-QUALEST) | `materialReceiptService.ts:161-196` | **UC INEXISTENTE** (base de BR-QE-005/006) |
| Cálculo do saldo retido (planejamento) | — | `quarantineBalanceService.ts` | **UC INEXISTENTE** |
| FEFO de consumo/expedição | — | `ChangeProductionOrderStatusUseCase.ts:867-886`; `saleLotService.ts` | **UC INEXISTENTE no cluster** (BR-QE-007) |
| Movimentação manual de estoque (entrada/saída/ajuste) | UC-QUALEST-10 | `CreateInventoryMovementUseCase.ts:71-123` | **UC-sem-catálogo** (F-8) |
| Contagem de inventário cíclico (ciclo completo) | UC-QUALEST-16 | `Create/Approve/…InventoryCountUseCase` | **UC-sem-catálogo** — só nó BPMN sem número |
| Scan mobile (scan/batch) | UC-QUALEST-17 | `ScanItemUseCase.ts:45-80` | **UC-sem-catálogo** + CRÍTICO |
| Ativos (CRUD + baixa) | UC-QUALEST-19 | `assetController.ts`; `DeactivateAssetUseCase.ts:36` | **UC-sem-catálogo** |
| Devolução ao fornecedor (sub-fluxo) | UC-QUALEST-09 | `SupplierReturnHandler.ts` | **sub-fluxo sem endpoint/UC** |

### 2.2 UCs sem teste real (nominal ou zero)
- **UC-QUALEST-07** (atualizar RNC) — **zero teste** da máquina de estados/`closed→open`/`effectiveness_result`.
- **UC-QUALEST-08** (encerrar RNC via DELETE sem causa raiz) — **zero teste**.
- **UC-QUALEST-17** (scan mobile) — **teste nominal**: só validação de entrada, não o bypass.
- **UC-QUALEST-18** (rastreabilidade) — **teste nominal**: só `400` + QR; não prova o histórico cego à qualidade.
- **UC-QUALEST-05** (bloquear lote) — **parcial**: `warehouse-invariants.test.ts:273` testa só a invariante de depósito, não a lista de statuses nem `reserved`.
- **UC-QUALEST-06** (criar RNC) — **parcial**: aviso G10 e herança de `supplier_id` sem teste dedicado.
- **UC-QUALEST-16** (contagem) — **parcial**: Submit/Reject/tolerância/antiautoaprovação sem teste.
- *(Bem cobertos, para contraste: UC-01/02/03/04 gate; UC-09 devolução; UC-10 movimentação; UC-11/12 depósito `warehouse-crud.test.ts`; UC-13/14/15 transferências `warehouse-stock.test.ts:176-375`; UC-19/20 ativos/manutenção.)*

### 2.3 REQs fantasma (comportamento real sem requisito) — baseline passo 27
Do cluster, **INFERRED — NEEDS HUMAN VALIDATION** (sem RF versionado): BR-QE-003, BR-QE-004, BR-QE-006, BR-QE-007, BR-QE-008 (baseline §3.3, "Fantasmas"). Os RFs que **existem** para o cluster estão **CONFLITANTES ou sem AC/TC**: `RF-EST-07` (CONFLICTING, scan mobile), `RF-QUA-02` (CONFLICTING, RNC). Transversal (baseline §6): **nenhum dos 90 RFs do repositório tem OWNER, AC- ou aponta para TC-** — a cadeia `BR→REQ→UC→AC→TC` do §20 do Master Spec **não existe em nenhum requisito versionado**.

### 2.4 CÓDIGO sem BR (comportamento sem regra candidata)
- **Depósitos — criar/editar** (UC-11/12): coberto por invariante §12, **sem BR-QE-0NN**.
- **Transferências entre depósitos** (UC-13/14/15): código + teste fortes, **sem BR-QE-0NN**.
- **Movimentação manual** (UC-10): apenas invariante §12 item 3, **sem BR numerado**.
- **Endpoints de leitura** de `traceability`/`inventory`/`quality` (list/get): sem regra própria, **sem BR**.

---

## 3. Placar

### 3.1 Cadeias completas × quebras por elo (13 BRs)
- **Cadeias completas (BR-canônico + REQ + UC + CÓDIGO + TC todos PRESENTE): 0 / 13.** A matriz nasce quebrada — confirmado.
- **Status da cadeia (elo mais fraco):** `PRESENTE` = **0** · `AMBÍGUO` = **1** (BR-QE-001) · `QUEBRADO` = **12**.

| Elo | PRESENTE | AMBÍGUO | QUEBRADO |
|---|---|---|---|
| **BR-ID canônico (âncora)** | 0 | 0 | **13** (todos provisórios; só G7 tem `details.rule` em runtime) |
| **REQ** | 0 | 4 (001, 005, 009, 011) | 9 (002,003,004,006,007,008,010,012,013) |
| **UC** | 4 (001,002,003,012) | 4 (004,009,010,013) | 5 (005,006,007,008,011) |
| **CÓDIGO** | 13 (dos quais **4 DIVERGENTES**: 004,007,009,011) | 0 | 0 |
| **TC** | 6 (001,002,003,005,010,013) | 3 (007,008,009) | 4 (004,006,011,012) |

### 3.2 Cobertura de teste real por UC (20 UCs)
- **PRESENTE (exercita comportamento com asserção): 13** — UC-01,02,03,04,09,10,11,12,13,14,15,19,20.
- **AMBÍGUO/parcial (cobre parte, não o achado): 3** — UC-05,06,16.
- **QUEBRADO (nominal ou zero): 4** — UC-07,08,17,18.
- Cobertura real ≈ **65%** dos UCs; **os 3 comportamentos de maior risco (scan mobile, RNC update/close, contagem — tolerância/autoaprovação) estão em teste nominal ou zero**.

---

## 4. Causas-raiz (por que a matriz nasce quebrada)

1. **Ausência de BR-ID canônico versionado (raiz nº 1).** 13/13 regras só têm rótulo provisório do passo 26; a única disciplina em runtime é `details.rule='G7'` (1 de 13). Sem âncora canônica, **todo primeiro elo da cadeia já está quebrado** e nenhum REQ/UC/TC pode referenciá-la de forma versionada (Regra 17). Consolidada da L-9 do passo 26.
2. **Comportamento com efeito de estoque sem UC no catálogo.** Recebimento/quarentena, saldo retido, FEFO, movimentação manual, contagem cíclica, scan mobile, ativos e devolução — todos movem saldo ou dinheiro e **nenhum tem UC oficial**. O catálogo de UC documenta o fluxo "feliz" da inspeção/liberação e ignora os caminhos que efetivamente debitam estoque.
3. **REQ sem AC nem ponteiro para TC (baseline §6).** Mesmo os 4 BRs que tocam um RF numerado não fecham a cadeia: `RF-EST-05/RF-QUA-03` sem AC; `RF-EST-07`/`RF-QUA-02` conflitantes. A cadeia `REQ→AC→TC` do §20 não existe.
4. **Teste nominal mascarando o vazio.** `mobileInventory-use-cases`, `traceability` e o branch de `effectiveness_result` em `handoff-signal` **têm arquivo de teste**, mas exercitam validação de entrada / entradas inalcançáveis, **não o comportamento crítico** — o que produz falsa sensação de cobertura na contagem bruta de suites.

---

## 5. Candidatos a finding (NÃO promovidos — seguem ao passo 31; CRITICAL/HIGH exigem vericore-finding-validator)

Consolidados dos passos 26/28 + evidência de rastreabilidade deste passo. **Não promovo nenhum** (Regra 22; autoridade do director/validator).

- **TC-GAP CRITICAL / CONFIRMED — BR-QE-011 / UC-QUALEST-17:** comportamento que fura quarentena/depósito/lote **existe em código e não é exercitado por teste** (`mobileInventory-use-cases.test.ts:5-43` é nominal). Elo TC = QUEBRADO sobre regra documentada violada (`BUSINESS_RULES §12`). = L-1/F-5.
- **BROKEN-CHAIN HIGH / CONFIRMED — BR-QE-009 / UC-QUALEST-07/08:** `effectiveness_result` sem caminho de escrita; o único teste (`handoff-signal.test.ts:152`) alimenta valor que a API nunca gera ⇒ a regra do semáforo UC-40 é inaplicável e **não testável pelo caminho real**. Encerramento sem causa raiz/ação corretiva sem teste. = L-2/F-1.
- **TEST-COVERAGE HIGH / CONFIRMED — BR-QE-008 / UC-QUALEST-16:** contagem cíclica sem política de tolerância/recontagem e sem antiautoaprovação — **regra ausente, não implementada errada**; elo TC AMBÍGUO (só atribuição/claim). Ajuste de qualquer magnitude por ator único. = L-4/F-4.
- **CONFLICT HIGH / CONFIRMED — BR-QE-004 / UC-QUALEST-05/06:** duas listas de statuses bloqueáveis; **nenhum teste compara as listas** (elo TC QUEBRADO, CÓDIGO DIVERGENTE); `reserved` bloqueável só por caminho indireto. = L-3.
- **UNDOCUMENTED-BEHAVIOR HIGH — BR-QE-006:** re-recebimento rebaixa lote BLOQUEADO a `quarantine` contornando o gate `('qualidade','approve')` — **REQ, UC e TC todos INEXISTENTES**; só código. = L-6/F-34.
- **CONFLICT MEDIUM — BR-QE-007:** "vencido" com duas semânticas (instante × DATEONLY) no mesmo módulo; fronteira "vence hoje" **sem teste**. = L-5.
- **DRIFT MEDIUM — BR-QE-001:** doc `01-CONTROLE_QUALIDADE.md:154` omite `inspection_before_block`; JSDoc `SequelizeQualityRepository.ts:47-49` diverge do código. = L-7/F-2.
- **RASO MEDIUM — BR-QE-012 / UC-QUALEST-18:** rastreabilidade não inclui inspeções (associação ausente); elo TC QUEBRADO (nominal). = F-7.
- **GOVERNANÇA HIGH / CONFIRMED — transversal (= L-9, baseline §8 item 6):** ausência de catálogo de BR-ID/REQ com AC/TC; a cadeia `BR→REQ→UC→AC→TC` **inexiste** para as 13 regras do cluster. Causa-raiz da própria quebra desta matriz.

---

## 6. O que esta matriz NÃO afirma
- **Não promove finding nem atribui severidade final** (Regra 22; §5 são candidatos).
- **Não decide qual lado está certo** em nenhuma divergência (Regras 20-21).
- **Não inventou elo:** todo `QUEBRADO`/`INEXISTENTE` é ausência de evidência registrada, nunca preenchida por inferência (Regras 6-7); coordenadas de CÓDIGO vêm dos passos 26/28, coordenadas de TC foram lidas em disco.
- **Não executou nada** — nenhum teste/script/banco (Regra 1 do escopo; `06-...` sem Bash).
- **Cobertura de reporte** dos auditores de origem é controlada pelo director; este agente não detecta auditor que não reportou.

---

*Produzido pela trilha `vericore-traceability-auditor` (passo 29, ERP-LEGACY-001) em modo read-only reforçado. Saída devolvida como texto para persistência pelo orquestrador — o hook org-isolation bloqueia escrita VeriCore fora de `audit/`. Alimenta o vericore-audit-consolidator e o vericore-audit-reporting-agent.*

---

**Arquivos relevantes (caminhos absolutos):**
- Insumos lidos: `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`, `...\USE_CASES_RECOVERED_qualidade-estoque.md`, `...\REQUIREMENTS_BASELINE.md`
- Testes lidos (describe/it, sem execução): `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\{quality-inspection-release-gate,quarantine-blocks-planning-balance,non-conformity-supplier-return,inventory-count-assignment,mobileInventory-use-cases,assets-use-cases,warehouse-invariants,warehouse-crud,warehouse-stock,inventory-movements-dual-read,lot-traceability-qrcode,handoff-signal}.test.ts` e `...\server\tests\integration\{quality-release-after-block,mrp-quarantine-discount,sale-lot-quality-gate,inventory-count-claim-concurrency,maintenance-order-lifecycle,traceability,product-movement-concurrency,stock-concurrency,mrp}.test.ts`

**Headline:** cadeias completas **0/13**; status por elo mais fraco — **1 AMBÍGUO (BR-QE-001), 12 QUEBRADO**; âncora BR canônica **QUEBRADA em 13/13**. A premissa "a matriz nasce quebrada" está **confirmada e quantificada**.
