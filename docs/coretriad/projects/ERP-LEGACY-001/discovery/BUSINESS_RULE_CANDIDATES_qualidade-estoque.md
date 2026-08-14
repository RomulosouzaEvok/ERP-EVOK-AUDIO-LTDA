# Regras de Negócio Descobertas — Qualidade & Rastreabilidade + Estoque & Logística

**Programa:** ERP-LEGACY-001 · **Passo:** 26 · **Domínios:** `quality`, `nonConformities`, `traceability`, `inventory`, `mobileInventory`, `assets`, `maintenance`
**Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum arquivo alterado. Sem execução, sem banco, sem Bash.
**Escopo negativo:** o achado estrutural `inventory → quality` sem porta (DOMAIN_MAP.md:114,183) **não é repetido** — aqui se aprofunda a *regra*. Idempotência de lançamento (`FIND-ERP-001`) não é reaberta.

## 0. Como ler este documento

- Nenhuma regra tinha BR-ID antes deste passo. `BR-QE-xxx` são **propostos aqui**. A
  rastreabilidade real é por código de gap (`G7`, `G8`, `G10`, `G17`) em `details.rule`, e
  só o G7 tem essa disciplina no escopo.
- Status: `CONFIRMED` · `DISCOVERED` · `CONFLICTING` (inclui **duas implementações
  divergentes da mesma regra**) · `UNKNOWN` (Regra 21) · `OBSOLETE_CANDIDATE`.
- `OWNER: UNKNOWN` domina — não há catálogo com responsável nomeado (§3, L-9).
- Toda afirmação tem arquivo+linha dos **dois lados** da comparação.

---

## 1. Regras extraídas

### BR-QE-001 — Gate de liberação de lote (G7): a condição exata
```
NAME: Um lote só sai de quarentena/bloqueio com inspeção aprovada e posterior ao bloqueio
DESCRIPTION: A liberação (quarantine|blocked → available) é concedida se e somente se:
  (a) lot.status ∈ {quarantine, blocked}         senão 422 (allowed_statuses)
  (b) existe inspeção para o lote                 senão 422 reason=no_inspection
  (c) a inspeção MAIS RECENTE (ORDER BY inspected_at DESC, id DESC) tem
      verdict ∈ {approved, approved_under_concession}
                                                  senão 422 reason=last_inspection_rejected
  (d) se lot.blocked_at existe e é data legível:
      inspected_at > blocked_at (ESTRITA; empate NÃO libera)
                                                  senão 422 reason=inspection_before_block
  Data ilegível em qualquer lado ⇒ tratada como "não posterior" (lado seguro).
  blocked_at NULL/''/não parseável ⇒ item (d) não se aplica (comportamento pré-2026-08-11).
ORIGIN: decisão D-H do dono (PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md §4); ISO 9001:2015
        §8.6/§8.7 (citada por número); API.md:2068-2104; docs/qualidade/01-CONTROLE_QUALIDADE.md §4.3
OWNER: UNKNOWN (o "dono" é citado, sem registro de aprovação assinado)
VALIDITY: (a)-(c) 2026-08-10; (d) 2026-08-11  |  PRIORITY: CRÍTICA
IMPLEMENTATION: quality/domain/constants.ts:127-155 (decideLotRelease), :64 (RELEASING_VERDICTS),
                :167-181 (isInspectionAfterBlock); inventory/.../ReleaseLotUseCase.ts:60,129-158;
                quality/.../GetLotReleaseEligibilityUseCase.ts:54-67 (mesma função);
                SequelizeQualityRepository.ts:52-58 (a ordenação que define "mais recente")
RELATED_USE_CASES: UC-17B  |  RELATED_REQUIREMENTS: RF-EST-05, RF-QUA-03
RELATED_PERMISSIONS: authorizeModule('qualidade','approve') — inventory/.../routes/inventory.ts:35
RELATED_TESTS: quality-inspection-release-gate.test.ts:137-313 (13 casos, inclui empate de
               instante e inspeção sem data); quality-release-after-block.test.ts
STATUS: CONFIRMED — com desvio de documentação
```
**⚠ Desvio de documentação (MEDIUM/CONFIRMED):** `01-CONTROLE_QUALIDADE.md:154` afirma que
`details.reason ∈ { no_inspection, last_inspection_rejected }` — **falso desde 2026-08-11**:
existe um terceiro motivo, `inspection_before_block` (`constants.ts:82`,
`ReleaseLotUseCase.ts:114`). `API.md:2092-2102` está correto. Dois documentos oficiais, uma
regra, duas versões.

**Semântica não documentada:** "mais recente" é por `inspected_at`, campo gravado pelo
servidor como `new Date()` (`CreateQualityInspectionUseCase.ts:160`) — o payload do inspetor
**não** consegue informar data retroativa, embora o JSDoc do repositório
(`SequelizeQualityRepository.ts:47-49`) justifique o desempate por `id` dizendo que "o
inspetor pode informar a data". Comentário e código divergem. Sub-afirmação: `CONFLICTING`.

### BR-QE-002 — Evidência mínima da inspeção (ISO 9001 §8.6/§8.7)
```
DESCRIPTION: POST /api/quality/inspections exige: lot_id existente; stage ∈
  {incoming,in_process,final} (default 'incoming'); verdict ∈ {approved,rejected,
  approved_under_concession} (sem default); acceptance_criteria >= 3 caracteres após trim;
  concession_justification >= 10 caracteres QUANDO verdict='approved_under_concession';
  inspector_id SEMPRE do JWT; defects_found inteiro >= 0; lot_size ausente ⇒ herda
  lot.quantity_initial.
  NÃO há AQL, nível de inspeção nem tabela Ac/Re — decisão da Engenharia da Qualidade não
  tomada pelo dono (marcada [NÃO CONFIRMADO NA FONTE] na pesquisa normativa).
ORIGIN: docs/qualidade/01-CONTROLE_QUALIDADE.md §4.2; PESQUISA_NORMATIVA §Decisão 5 item (c)
OWNER: UNKNOWN  |  VALIDITY: 2026-08-10  |  PRIORITY: ALTA
CONDITIONS: os limiares 3 e 10 são constantes de código. O "10" aparece na doc (§4.3); o
            "3" NÃO aparece em documento nenhum.
IMPLEMENTATION: CreateQualityInspectionUseCase.ts:51,54 (limiares), :87-162
RELATED_TESTS: quality-inspection-release-gate.test.ts:351-485
STATUS: CONFIRMED para o limiar 10; DISCOVERED para o limiar 3 (valor sem origem documental)
```

### BR-QE-003 — Reprovação abre RNC e bloqueia o lote (delegação G8/G10)
```
DESCRIPTION: verdict='rejected' dispara CreateNonConformityUseCase com severity FIXO 'major',
  defect_type FIXO 'other', origin = stage da inspeção, quantity_affected = defects_found, e
  grava non_conformity_id de volta na inspeção. A RNC bloqueia o lote e grava blocked_at.
ORIGIN: docs/qualidade/01-CONTROLE_QUALIDADE.md:178-182  |  OWNER: UNKNOWN  |  PRIORITY: ALTA
EXCEPTIONS (risco residual documentado no código): CreateNonConformityUseCase abre transação
  PRÓPRIA — a inspeção já está gravada quando a RNC nasce. Falha na RNC deixa inspeção
  reprovada SEM RNC e devolve 500. Conservador, mas é exceção de atomicidade não registrada
  em documento de negócio.
IMPLEMENTATION: CreateQualityInspectionUseCase.ts:164-202 (severity/defect_type hardcoded: :184,:186)
RELATED_TESTS: quality-inspection-release-gate.test.ts:486-531
STATUS: DISCOVERED — "toda reprovação é severidade MAJOR" é decisão de negócio embutida em
        literal de código, sem documento de origem e sem o inspetor poder classificar.
```

### BR-QE-004 — ⚠ Statuses bloqueáveis: duas implementações divergentes
```
DESCRIPTION: Existem HOJE duas listas incompatíveis para a mesma regra:
  (A) POST /api/inventory/lots/:id/block  → ['quarantine','available']
  (B) caminho RNC (CreateNonConformityUseCase) → ['available','quarantine','reserved']
  Consequência: um lote em 'reserved' NÃO pode ser bloqueado pela Qualidade via endpoint
  (422), mas É bloqueado silenciosamente quando uma RNC o referencia. Material já reservado
  para um documento fica fora do alcance da ação explícita de contenção.
ORIGIN: nenhum documento define a lista  |  OWNER: UNKNOWN  |  PRIORITY: ALTA
IMPLEMENTATION: inventory/.../BlockLotUseCase.ts:26  vs
                nonConformities/.../CreateNonConformityUseCase.ts:15
RELATED_TESTS: nenhum teste compara as duas listas ← LACUNA
STATUS: CONFLICTING (§19 Master Spec)
```
**Nota (MEDIUM):** `BlockLotUseCase` **não** abre transação nem trava a linha (`:56` usa
`findLotById`, não `findLotByIdForUpdate`), enquanto `ReleaseLotUseCase:125` usa `FOR UPDATE`.
A proteção contra corrida foi aplicada em um só lado do par bloquear/liberar.

### BR-QE-005 — Quarentena de recebimento e saldo retido (G17)
```
DESCRIPTION: Todo recebimento cria/atualiza o lote em 'quarantine' e JÁ incrementa
  products.quantity. Saldo retido = SUM(lot_controls.quantity_available) com status ∈
  {quarantine, blocked}. O planejamento (MRP e explosão de BOM) usa max(0, físico − retido).
  'reserved' NÃO entra (evita desconto duplo); 'expired' NÃO entra (tratado no FEFO).
ORIGIN: docs/qualidade §4.4; PESQUISA_NORMATIVA §Decisão 5 ponto 4; BUSINESS_RULES.md §12
        item 9 (quarentena/bloqueio ≠ depósito — dimensões ortogonais); RF-COM-07
OWNER: UNKNOWN  |  VALIDITY: 2026-08-10  |  PRIORITY: CRÍTICA (financeiro/planejamento)
IMPLEMENTATION: services/quarantineBalanceService.ts:73 (WITHHELD_LOT_STATUSES), :87-122,
                :132-138 (clamp max(0,·)); services/materialReceiptService.ts:161-196
RELATED_TESTS: quarantine-blocks-planning-balance.test.ts; mrp-quarantine-discount.test.ts
STATUS: CONFIRMED
```
**⚠ Exceção descoberta, não documentada (HIGH/CONFIRMED):** o desconto de quarentena é
aplicado **apenas nos leitores de planejamento**. A saída física por
`POST /api/mobile-inventory/scan` valida disponibilidade contra `product.quantity` **bruto**
(`ScanItemUseCase.ts:63-64`), sem consultar lote nem saldo retido. **Material em quarentena
pode ser baixado do estoque por um scan mobile** — exatamente o "uso não pretendido" que a
ISO 9001 §8.7 e o G17 existem para impedir. Ver BR-QE-011.

### BR-QE-006 — ⚠ Re-recebimento rebaixa o status sem passar pela máquina de estados
```
DESCRIPTION: Quando (product_id, lot_number) já existe, o recebimento soma quantidades e grava
  status='quarantine' INCONDICIONALMENTE — qualquer que fosse o status anterior
  ('available','blocked','consumed','expired','reserved'). Não limpa blocked_at nem os campos
  de liberação (release_inspection_id/released_by/released_at) do recebimento anterior.
ORIGIN: DESCOBERTA — nenhum documento descreve o re-recebimento em lote existente
OWNER: UNKNOWN  |  VALIDITY: pré-2026-08-10  |  PRIORITY: ALTA
CONSEQUÊNCIAS OBSERVADAS NO CÓDIGO:
  (1) um lote BLOQUEADO pela Qualidade volta a 'quarantine' por ação do Recebimento —
      contorna BlockLotUseCase e o gate de autorização ('qualidade','approve');
  (2) o lote fica em 'quarantine' carregando evidência de uma liberação passada
      (release_inspection_id preenchido) — enganoso para auditoria ISO 9001 §8.6;
  (3) blocked_at preservado faz a nova liberação exigir inspeção posterior ao bloqueio antigo
      (efeito conservador, mas acidental — não decidido).
IMPLEMENTATION: services/materialReceiptService.ts:165-180
RELATED_TESTS: nenhum teste cobre re-recebimento sobre lote 'blocked' ← LACUNA
STATUS: DISCOVERED (sem origem documental e provavelmente não intencional — Regra 20/21)
```

### BR-QE-007 — ⚠ FEFO: duas definições de "vencido" e dois critérios de desempate
```
DESCRIPTION (consumo de produção): candidatos: status='available' AND (expires_at IS NULL OR
  expires_at >= hoje); ordem: expires_at IS NULL ASC, expires_at ASC, received_at ASC,
  manufactured_at ASC, createdAt ASC.
DESCRIPTION (expedição/faturamento, saleLotService): vencido := expires_at < hoje; ordem:
  expires_at ASC, NULL por último, desempate por id ASC. Lotes retidos viram "blockingLots".
  Produto SEM nenhum lote com saldo ⇒ governed=false ⇒ NÃO bloqueia (estoque legado).
DIVERGÊNCIA CONFIRMADA: no caminho de consumo com lote EXPLÍCITO, vencido é avaliado como
  `new Date(lot.expires_at) < new Date()` — comparação de INSTANTE contra coluna DATEONLY
  ('YYYY-MM-DD', LotControl.ts:69). **Um lote que vence HOJE é ACEITO pelo FEFO automático
  (expires_at >= hoje) e REJEITADO pelo caminho explícito** (meia-noite UTC < agora). Mesma
  pergunta de negócio, duas respostas no mesmo arquivo.
ORIGIN: nenhum documento define FEFO como política; docs/qualidade §4.3 só cita "(FEFO)"
OWNER: UNKNOWN  |  VALIDITY: pré-2026-08-09  |  PRIORITY: ALTA
IMPLEMENTATION: ChangeProductionOrderStatusUseCase.ts:851-853 (explícito), :867-886 (automático);
                services/saleLotService.ts:153-156,171-180,191-229
RELATED_TESTS: sale-lot-quality-gate.test.ts. Nenhum teste da fronteira "vence hoje" ← LACUNA
STATUS: CONFLICTING
```
**Nota cosmética com risco de auditoria:** a linha gravada pelo consumo automático diz
`Consumo FIFO OP ...` (`:900`) enquanto a regra é FEFO. O registro histórico nomeia a política
errada. (Convergente com BR-PP-008 do domínio Planejamento & Produção.)

### BR-QE-008 — Máquina de estados da contagem de inventário cíclico
```
DESCRIPTION: create → 'draft' (número CC-<ano>-NNNN, warehouse_id OBRIGATÓRIO, assigned_to
  opcional=pool); start → 'counting' (claim do pool; contagem atribuída a OUTRO usuário = 409,
  salvo admin); count item → só em 'counting'; counted_quantity >= 0; variance = counted −
  system_quantity (system_quantity FOTOGRAFADO na criação); submit → só de 'counting', exige
  >= 1 item e ZERO itens 'pending'; approve → só de 'pending_approval', exige warehouse_id,
  para cada item com variance != 0 aplica InventoryService.adjust + WarehouseStockService no
  depósito da contagem, MESMA transação; contagem vai a 'adjusted'; reject → só de
  'pending_approval' → 'rejected', NENHUM ajuste; reassign → só em 'draft'/'counting',
  assigned_to precisa existir e estar ATIVO; null devolve ao pool.
  Concorrência: approve usa FOR UPDATE + updateIfStatus condicional (409); reject usa
  updateIfStatus sem lock.
ORIGIN: BUSINESS_RULES.md §12 itens 3, 7 e 10; achados de auditoria 2026-08-06 (só em comentário)
OWNER: UNKNOWN  |  VALIDITY: F09/Bloco 4 (2026-08-04) + 2026-08-06  |  PRIORITY: CRÍTICA
RELATED_PERMISSIONS: create/start/count/submit = ('contagens','operate');
                     approve/reject/REASSIGN = ('contagens','approve')
IMPLEMENTATION: CreateInventoryCountUseCase.ts:109-150; StartInventoryCountUseCase;
                CountInventoryItemUseCase.ts:42-75; SubmitInventoryCountUseCase.ts:28-48;
                ApproveInventoryCountUseCase.ts:50-120; RejectInventoryCountUseCase.ts:36-61;
                ReassignInventoryCountUseCase.ts:8,51-88
RELATED_TESTS: inventory-count-assignment.test.ts; inventory-count-claim-concurrency.test.ts;
               warehouse-invariants.test.ts:541,575
STATUS: DISCOVERED — o ciclo completo não está em nenhum documento de negócio.
```
**Achados dentro desta regra:**
1. **Sem tolerância de variância, sem recontagem (HIGH/CONFIRMED).** Não existe **nenhum**
   limiar de divergência: uma variância de 1 peça e uma de 10.000 peças percorrem o mesmo
   caminho e ambas ajustam o estoque no `approve`. Não há recontagem obrigatória, segunda
   contagem cega, nem alçada por valor. Grep por `tolerância|variance|recontagem` em `docs/`
   não encontra política. **Regra ausente, não implementada errada** — decisão humana pendente.
2. **Autoaprovação não é impedida (HIGH/CONFIRMED).** `ApproveInventoryCountUseCase.ts:50-120`
   nunca compara `approverId` com `count.assigned_to`/`item.counted_by`. Quem contou pode
   aprovar o próprio ajuste de estoque. Contraste com BR-SUP-007 (compras exige aprovador ≠
   solicitante).
3. **`reject` não exige motivo (MEDIUM/CONFIRMED).** `reason` é opcional (`:36,45`).
4. **`reject` sem lock (MEDIUM).** `approve` trava a linha; `reject` não. Par não simétrico.
5. **Cobertura (MEDIUM/CONFIRMED).** Sem teste de `SubmitInventoryCountUseCase` nem de
   `RejectInventoryCountUseCase`. `ApproveInventoryCountUseCase` só é testado sob o ângulo de
   depósito, não de variância/valor ajustado.

### BR-QE-009 — Classificação e efeito da não conformidade (RNC)
```
DESCRIPTION: description é o ÚNICO campo obrigatório. Defaults: severity='minor',
  origin='in_process', defect_type='other', status='open'. nc_number = `NC-<epoch>`.
  Contenção: se (lot_number + product_id) resolvem um lote bloqueável, o lote é bloqueado com
  blocked_at na MESMA transação. Quando NÃO bloqueia, a RNC é criada assim mesmo, com aviso
  persistido em notes prefixado '[ATENCAO: NENHUM LOTE BLOQUEADO]' e desfecho:
  not_found | not_blockable | not_informed | not_applicable (G10). supplier_id é herdado do
  lote quando não informado.
ORIGIN: gap G10; docs/qualidade §4.3  |  OWNER: UNKNOWN  |  PRIORITY: ALTA
IMPLEMENTATION: CreateNonConformityUseCase.ts:15,23,113-216,226-259
RELATED_TESTS: non-conformity-supplier-return.test.ts (o aviso G10 e a herança de supplier_id
               não têm teste dedicado) ← LACUNA PARCIAL
STATUS: DISCOVERED — a classificação (severity/defect_type/origin) não tem critério
        documentado: quem escolhe 'major' × 'minor', e com que consequência.
```
**⚠ Sem máquina de estados (HIGH/CONFIRMED).** `non_conformities.status` tem 6 valores
(`open, analysis, corrective_action, effectiveness_check, closed, canceled` —
`models/NonConformity.ts:38`), mas `UpdateNonConformityUseCase.ts:26-36,74-77` aceita
**qualquer** valor do body, sem grafo de transições. `closed → open` é possível e não deixa
registro específico. Contraste com BR-PP-001 (OP tem grafo explícito).

**⚠ Encerramento sem pré-requisito (HIGH/CONFIRMED).** Fechar a RNC exige **apenas**
`status='closed'`; `root_cause` e `corrective_action` podem estar vazios (`:78-87` só
acrescenta `closed_by`/`closed_date`). ISO 9001 §10.2 pede análise de causa e ação corretiva.
`nonConformities/domain/closure.ts:45-62` (data em UTC — encerramento após 21h BRT grava o dia
seguinte, exceção assumida no JSDoc).

**⚠⚠ `effectiveness_result` é inescrevível pela API (HIGH/CONFIRMED — candidato a finding).**
`ALLOWED_FIELDS` (`UpdateNonConformityUseCase.ts:26-36`) **não contém**
`effectiveness_result`, e nenhum outro ponto do backend o escreve (grep em `server/src`: só
leituras). Porém o semáforo de handoff (`shared/domain/handoffSignal.ts:196-211`, regra de
negócio de UC-40 §10) pinta de **VERMELHO** toda RNC `closed` com `effectiveness_result !==
'effective'`. Como o campo nunca pode ser preenchido, **toda RNC fechada fica permanentemente
vermelha**. Regra documentada cuja pré-condição não tem caminho de escrita: `CONFLICTING`.

### BR-QE-010 — Devolução ao fornecedor
```
DESCRIPTION: Na criação da RNC, ou na TRANSIÇÃO do campo em um update (valor já vigente não
  redispara — anti-duplicação), aplica-se na mesma transação:
  (a) asset_id presente → Asset.status='returned_to_supplier' (com lock), e RETORNA: ativo e
      item de estoque são mutuamente exclusivos por RNC;
  (b) purchase_item_id presente e Item.tipo ∈ {MATERIA_PRIMA, SUBCONJUNTO, PRODUTO_ACABADO,
      USO_E_CONSUMO} (ou item_id ausente = compra legada ⇒ produtivo por DEFAULT) →
      InventoryService.consume estornando, reference_type='purchase';
  (c) quantity_affected ausente ou <= 0 ⇒ NO-OP SILENCIOSO;
  (d) nenhum dos dois ids ⇒ no-op silencioso.
  A tratativa comercial NÃO é feita aqui — vira item de fila em Compras.
ORIGIN: TODO_REORGANIZACAO_DEPARTAMENTOS.md Bloco B §3; HANDOFF_CODEX.md
OWNER: UNKNOWN  |  VALIDITY: 2026-08-05  |  PRIORITY: ALTA
IMPLEMENTATION: nonConformities/application/services/SupplierReturnHandler.ts:27,86-100,
                102-134,136-149; CreateNonConformityUseCase.ts:200-208;
                UpdateNonConformityUseCase.ts:94-120
RELATED_TESTS: non-conformity-supplier-return.test.ts
STATUS: DISCOVERED — origem é TODO/handoff de reorganização, não política versionada.
```
**Exceções silenciosas (MEDIUM/CONFIRMED):** (c) e (d) devolvem sucesso HTTP sem estornar nada
e **sem aviso persistido** — ao contrário do G10, que aprendeu a avisar quando não conteve
material. Uma devolução sem `quantity_affected` "funciona" e não devolve nada. Também: o
estorno decrementa `products.quantity` **sem** `warehouse_id` e **sem** baixar o lote.

### BR-QE-011 — ⚠⚠ Movimentação mobile fora dos controles de lote e depósito
```
DESCRIPTION: POST /api/mobile-inventory/scan exige product_code, quantity (parseInt > 0) e
  type ∈ {in,out}; para 'out' valida apenas product.quantity >= qty; chama
  InventoryService.adjust SEM warehouseId (6 argumentos; o 7º existe em
  inventoryService.ts:327-334 e é omitido).
CONSEQUÊNCIAS CONFIRMADAS:
  (1) viola a invariante de BUSINESS_RULES.md §12 item 3 (products.quantity = soma de
      ProductWarehouseStock por depósito): a saída mobile debita o global e nenhum depósito;
  (2) ignora o saldo retido em quarentena/bloqueio (BR-QE-005): permite baixar material que a
      Qualidade não liberou;
  (3) ignora lot_controls por completo: nenhuma baixa de lote, nenhuma linha de
      rastreabilidade por lote — quebra a cadeia que o domínio traceability lê.
ORIGIN: BUSINESS_RULES.md §12 itens 3 e 10  |  OWNER: UNKNOWN  |  PRIORITY: CRÍTICA
VALIDITY: pré-2026-08-04 (não migrado no Bloco 4)
RELATED_PERMISSIONS: authorizeModule('estoque','operate') — mobileInventory.ts:17-18
IMPLEMENTATION: ScanItemUseCase.ts:45-80 (validação :63-64, chamada :67-74);
                BatchScanUseCase.ts (mesmo caminho); mobileInventoryController.ts:21-40
RELATED_TESTS: nenhum ← LACUNA
STATUS: CONFLICTING (regra documentada §12 × implementação) — CRITICAL/CONFIRMED como
        candidato a finding formal; deve passar pelo vericore-finding-validator.
```

### BR-QE-012 — Rastreabilidade é leitura pura, e não enxerga a Qualidade
```
DESCRIPTION: Três endpoints de leitura sem regra de negócio própria — delegam ao repositório.
  O histórico de lote NÃO inclui as inspeções de qualidade: QualityInspection não está
  registrado em models/index.ts e o repositório de qualidade não usa include algum, "porque as
  associações não existem" (declarado no próprio código).
ORIGIN: BUSINESS_RULES.md §6  |  OWNER: UNKNOWN  |  PRIORITY: MÉDIA
IMPLEMENTATION: traceability/.../GetLotTraceabilityUseCase.ts:28-30;
                SequelizeQualityRepository.ts:4-11 (registro pendente, admitido em comentário)
RELATED_TESTS: nenhum ← LACUNA
STATUS: DISCOVERED — cobertura RASA por decisão; o gap de associação é estrutural e já
        reportado em docs/governance/TODO.md pelo próprio código.
```

### BR-QE-013 — Ativos: baixa e ciclo com manutenção
```
DESCRIPTION: DELETE /api/assets/:id é soft delete: grava status='decommissioned' (o valor
  'inactive' NUNCA existiu no ENUM e causava 500 — corrigido 2026-08-06). ENUM real: active |
  in_maintenance | decommissioned | lost | returned_to_supplier.
  OM: nasce 'open' com número OM-<ano>-NNNN (advisory lock); asset_id e description
  obrigatórios; priority default 'normal'; maintenance_type default 'corrective'.
  Gatilho: OM→'in_progress' marca o ativo in_maintenance; OM→'completed'/'canceled' devolve a
  'active' SOMENTE se não houver outra OM aberta E o ativo não tiver sido baixado no meio-tempo.
ORIGIN: HANDOFF_CODEX.md; migration 20260805-000006  |  OWNER: UNKNOWN  |  PRIORITY: MÉDIA
IMPLEMENTATION: assets/.../DeactivateAssetUseCase.ts:36;
                maintenance/.../CreateMaintenanceOrderUseCase.ts:56-68;
                UpdateMaintenanceOrderUseCase.ts:74-95; CancelMaintenanceOrderUseCase
RELATED_TESTS: maintenance-order-lifecycle.test.ts
STATUS: DISCOVERED — nenhum documento descreve o gatilho; a origem é um handoff.
```
**Nota (MEDIUM):** a OM também não tem grafo de transições — `status` vem do body e é mapeado
direto (`UpdateMaintenanceOrderUseCase.ts:28-40,76-77`). `completed → open` é possível.

---

## 2. Veredito documentada × implementada × testada

| BR | Documentada | Implementada | Testada | Veredito |
|---|---|---|---|---|
| BR-QE-001 gate G7 | API.md ✔ / qualidade §4.3 **parcial** | ✔ | 13 casos ✔ | **CONFIRMED** + drift |
| BR-QE-002 evidência inspeção | §4.2/§4.3 (limiar 3 ausente) | ✔ | ✔ | CONFIRMED/DISCOVERED |
| BR-QE-003 reprovação→RNC | §4.3 ✔ | ✔ (severity fixo) | ✔ | DISCOVERED |
| BR-QE-004 bloqueáveis | ❌ ausente | **2 listas** | ❌ | **CONFLICTING** |
| BR-QE-005 quarentena/planejamento | §4.4 ✔ | ✔ | ✔ (2 suítes) | CONFIRMED |
| BR-QE-006 re-recebimento | ❌ ausente | ✔ (rebaixa status) | ❌ | DISCOVERED |
| BR-QE-007 FEFO | ❌ ausente | **2 semânticas** | parcial | **CONFLICTING** |
| BR-QE-008 contagem | §12 parcial | ✔ | parcial | DISCOVERED |
| BR-QE-009 RNC | §4.3/§4.5 parcial | sem máquina de estados | parcial | DISCOVERED + CONFLICTING |
| BR-QE-010 devolução | TODO/handoff | ✔ | ✔ | DISCOVERED |
| BR-QE-011 mobile | §12 item 3 diz o contrário | ✔ (viola) | ❌ | **CONFLICTING** |
| BR-QE-012 rastreabilidade | §6 | delegação pura | ❌ | DISCOVERED (raso) |
| BR-QE-013 ativos/manutenção | handoff | ✔ | ✔ | DISCOVERED |

## 3. Lacunas e escalações (Regra 21 — decisão humana)

- **L-1 (CRITICAL):** BR-QE-011 — movimentação mobile fora de depósito, lote e quarentena.
  Contraria regra documentada (§12 item 3) e permite baixar material retido. Candidato a
  finding formal.
- **L-2 (HIGH):** BR-QE-009 — `effectiveness_result` sem caminho de escrita ⇒ regra UC-40 do
  semáforo é inaplicável. Também: fechar RNC sem causa raiz nem ação corretiva (ISO 9001 §10.2).
- **L-3 (HIGH):** BR-QE-004 — duas listas de statuses bloqueáveis; `reserved` bloqueável só
  por caminho indireto.
- **L-4 (HIGH):** BR-QE-008 — **não existe** política de tolerância/recontagem de inventário,
  e a autoaprovação de contagem não é impedida. Ajuste de estoque de qualquer magnitude com um
  único ator.
- **L-5 (HIGH):** BR-QE-007 — "vencido" tem duas definições no mesmo módulo; lote que vence
  hoje é aceito por um caminho e recusado por outro.
- **L-6 (MEDIUM):** BR-QE-006 — recebimento rebaixa lote bloqueado a quarentena sem passar
  pelo gate de autorização da Qualidade.
- **L-7 (MEDIUM):** BR-QE-001 — `01-CONTROLE_QUALIDADE.md:154` omite `inspection_before_block`;
  e o JSDoc de `SequelizeQualityRepository.ts:47-49` afirma que o inspetor informa a data, o
  que o código não permite.
- **L-8 (MEDIUM, cobertura):** sem teste para `SubmitInventoryCountUseCase`,
  `RejectInventoryCountUseCase`, aviso G10, herança de `supplier_id`, re-recebimento sobre lote
  bloqueado, fronteira "vence hoje", e todo o `mobileInventory`.
- **L-9 (INFO, governança):** **nenhuma** das 13 regras tem BR-ID versionado nem owner
  nomeado. A única rastreabilidade em runtime é `details.rule='G7'`. Sem isso,
  `BR → REQ → UC → TC` do passo 29 nasce quebrada nesta metade do sistema.
- **L-10 (INFO):** `suppliers.quality_score = MAX(0, 100 − rncs/recebimentos × 100)`
  (`CreateNonConformityUseCase.ts:274-286`) é regra de avaliação de fornecedor disparada pela
  Qualidade; pertence ao domínio Cadastro & Suprimentos — sinalizada, não duplicada.

---

### Arquivos-chave citados

`server/src/modules/quality/domain/constants.ts`,
`server/src/modules/inventory/application/use-cases/{ReleaseLotUseCase,BlockLotUseCase,ApproveInventoryCountUseCase}.ts`,
`server/src/modules/nonConformities/application/use-cases/{Create,Update}NonConformityUseCase.ts`,
`server/src/modules/mobileInventory/application/use-cases/ScanItemUseCase.ts`,
`server/src/services/{quarantineBalanceService,materialReceiptService,saleLotService}.ts`,
`server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts`,
`docs/business/BUSINESS_RULES.md` (§4, §12),
`docs/qualidade/01-CONTROLE_QUALIDADE.md` (§4.2-§4.5),
`docs/arquitetura/API.md` (:2068-2104).

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado. Nada foi
alterado, nenhum comando executado, nenhum acesso a banco. Os itens L-1 a L-5 exigem decisão
do responsável humano antes de qualquer remediação (Regras 20-21). Conteúdo persistido pelo
orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem edição.*
