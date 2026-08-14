# LEGACY_TRACEABILITY_MATRIX_cadastro-suprimentos.md

```
PROJECT_ID:   ERP-LEGACY-001 — Passo 29 (matriz de rastreabilidade do legado)
CLUSTER:      cadastro-suprimentos
MÓDULOS:      items, categories, departments, suppliers, clients, employees,
              products, bom, purchases, purchaseRequisitions, rfq, comex
TRILHA:       VeriCore read-only (DISCOVERY, não auditoria 360°, não remediação)
MÉTODO:       READ → ANALYZE → VERIFY → PROVE → CLASSIFY. Read/Grep/Glob apenas.
              Nenhum comando executado, nenhum teste rodado, nenhum banco tocado.
PRODUÇÃO REAL (items, categories, departments): lidas SOMENTE por código-fonte e
              por arquivo de teste. PROIBIDO executar teste/script/banco (regra 1 da trilha).
LEITURA EM:   árvore de trabalho atual (HEAD main = 65bd66d). Os insumos foram
              produzidos em commits distintos (UC: f05e865; REQ: c9359be / tag
              legacy-baseline-001). Divergências entre insumo e disco estão marcadas
              como DELTA-INSUMO e são reais para o HEAD lido.
```

> **NOTA DO ORQUESTRADOR (Regras 12-14):** os commits citados (`c9359be`, `f05e865`, `3eb0b5e`, `7b705f1`, e o "65bd66d" do contexto injetado) diferem apenas por commits de DOCUMENTAÇÃO de discovery; **nenhum `src/` mudou desde a baseline `c9359be`**. O HEAD real desta sessão é `7b705f1` (verificado em `.git/refs`), não `65bd66d` (que veio de contexto injetado desatualizado). As "DELTA-INSUMO" abaixo são reais e valiosas: refletem testes que já existiam no código-fonte da baseline e que o passo 26 sub-reportou.

## 1. Ressalva estrutural — a matriz NASCE QUEBRADA (confirmado e detalhado)

Confirmo a premissa e a detalho com evidência de disco:

1. **Elo BR-ID canônico: QUEBRADO em 33/33 linhas.** Nenhuma regra do cluster tem BR-ID versionado. Os identificadores em uso (`G1`, `G11`, `G12`, `G14`, `G18`, `D-C`, `D-G`, `D-K`, `D-I`) são rótulos de *gap*/*decisão*; os `BR-SUP-NN`/`BR-CAD-NN` são IDs **provisórios do passo 26**, não catalogados em nenhum artefato canônico. Fonte: `BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md:25-26,548-549`.
2. **Elo OWNER: QUEBRADO em 33/33.** `BUSINESS_RULE_CANDIDATES...:25` — "Regras sem OWNER nomeado: 32 de 32".
3. **Elo REQ canônico (com AC-/TC- vinculado): QUEBRADO em 33/33.** `REQUIREMENTS_BASELINE.md:279-282` — "nenhum dos 90 RFs tem OWNER, critério de aceite (AC-) ou aponta para um TC-. A cadeia BR → REQ → UC → AC → TC que o §20 exige não existe em nenhum requisito do repositório." `items` e `categories` (PRODUÇÃO REAL) não têm **um único RF** (`:29-31`).
4. **RFQ inteiro sem UC formal.** `DIAGRAMA_CASOS_DE_USO_BPMN.md:19,54` admite explicitamente "não [tem] UC formal"; "UC-25b" é referenciado em `04-USE_CASES.md:954,1143` e **nunca definido** (`USE_CASES_RECOVERED...:227`).

Consequência: para **toda** linha, os elos `BR-ID canônico`, `OWNER` e `REQ canônico (AC/TC)` já estão QUEBRADOS por construção. Para dar sinal diferenciado, a coluna **"elo mais fraco"** de cada linha reporta a quebra mais severa **a jusante** (UC → CÓDIGO → TC), assumindo o topo universalmente quebrado.

### Fontes lidas em disco
- `discovery/BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md` (passo 26, 32 regras)
- `discovery/USE_CASES_RECOVERED_cadastro-suprimentos.md` (passo 28, UC-CADSUP-01..45)
- `discovery/REQUIREMENTS_BASELINE.md` (passo 27, §2.2/§3.1)
- Testes verificados linha a linha em disco: `server/tests/unit/{purchase-approval-authority, purchase-segregation-of-duties, bom-create-revision-rules-g1, bom-single-source-g1, item-suppliers, items-use-cases, purchase-requisition-status, requisition-convert-to-purchase, rfq, comex, comex-directorate-approval, categories-use-cases, departments-use-cases, employees-use-cases, client-cnae-optional, items-models, deactivate-item-http-409}.test.ts` e `server/tests/integration/{purchase-origin-foreign-supplier, bom-two-level-reparo, clients-suppliers-financial-bom-validation}.test.ts`.

## 2. Tabela principal (uma linha por BR)

Legenda TC: **PROVA** = describe/it exercita o comportamento com asserção verificada; **NOMINAL** = arquivo/nome sugere mas não assere o comportamento-alvo; **AUSENTE** = sem teste; **FANTASMA** = insumo aponta arquivo de teste que não existe em disco.
Legenda elo: PRESENTE / QUEBRADO / AMBÍGUO (elo mais fraco a jusante do BR-ID/REQ, universalmente quebrados).

### Cadeia de Suprimentos (D3)

| BR provisório | gap | REQ | UC-CADSUP | CÓDIGO (arquivo:linha) | TC (arquivo:linha) | Elo + fraco | Observação |
|---|---|---|---|---|---|---|---|
| BR-SUP-001 teto R$500k | D-C/G11 | RF-COM-05 (CONFLICT vigência) | 26 CONFLIT / 27 CONFIRM | `constants.ts:74,162-176`; `ChangePurchaseStatusUseCase.ts:172-217` | `purchase-approval-authority.test.ts:84-88,143-173` **PROVA** | AMBÍGUO | Valor PROVADO (borda 500000 vs .01); rastreabilidade quebrada (sem BR-ID/OWNER) |
| BR-SUP-002 import qualquer valor | D-C | RF-COM-05 | 27/41 | `constants.ts:169` | `purchase-approval-authority.test.ts:90-94`; `purchase-origin-foreign-supplier.test.ts:206-229` **PROVA** | AMBÍGUO | Cobre R$0/R$1M |
| BR-SUP-003 origem efetiva escalation-only | — | INEXISTENTE (RF parcial) | 24 CONFLIT | `constants.ts:107-114`; `CreatePurchaseUseCase.ts:70-113` | `purchase-approval-authority.test.ts:96-104,207-220`; `purchase-origin-foreign-supplier.test.ts:174-201` **PROVA** | AMBÍGUO | Cadastro prevalece; anti-burla PROVADO |
| BR-SUP-004 base = mercadoria+frete | (auto-decl) | INEXISTENTE (F-14) | 26 | `constants.ts:185-189` | `purchase-approval-authority.test.ts:122-125,175-185` **PROVA** | QUEBRADO (REQ) | **DELTA-INSUMO:** passo-26 §5 diz "❌ AUSENTE"; em disco HÁ teste da soma na fronteira (499000+21000=520000→G11). Regra de impacto financeiro sem requisito |
| BR-SUP-005 mismatch origem×cadastro | G11 | RF-COM-05 (vigência 08-11×08-12) | 24 CONFLIT | `constants.ts:88,143-152`; `CreatePurchaseUseCase.ts:70-84` | `purchase-approval-authority.test.ts:106-120,242-262`; `purchase-origin-foreign-supplier.test.ts:155-169` **PROVA** | AMBÍGUO | Divergência de vigência entre código e RF-COM-05 |
| BR-SUP-006 congelamento pós-approved | anti-burla | INEXISTENTE | 25 CONFIRM | `UpdatePurchaseUseCase.ts:20,79-87` | `purchase-approval-authority.test.ts:426-437` (frozenFields) **PROVA** | QUEBRADO (REQ) | **DELTA-INSUMO:** passo-26 não citava teste; em disco há prova (freight congelado) |
| BR-SUP-007 segregação D-K | D-K | RF-COM-02 **CONFLICT** | 26/33 CONFLIT | `segregationOfDuties.ts:75-149`; `ChangePurchaseStatusUseCase.ts:134-140`; `ApprovePurchaseUseCase.ts:86-92` | `purchase-segregation-of-duties.test.ts` (4 pontos + admin não isento :309-321) **PROVA** | AMBÍGUO | Código+teste PROVAM; `PLANO_ACAO...:136-142` e `TODO.md:5271-5274` afirmam "não implementado". Fonte autoritativa indeterminável (CLAUDE.md 20-21) |
| BR-SUP-008 nível diretor = presença | V/O/A | BUSINESS_RULES §1 **CONFLICT** | 27/41 ressalva | `purchases.ts:48`; `auth.ts:213-215,258-284`; `purchaseController.ts:51-55` | ❌ **AUSENTE** | QUEBRADO (TC) | Doc reivindica `diretor:approve`; backend exige só presença. Permissão declarada ≠ imposta, sem teste |
| BR-SUP-009 admin = diretor | admin | INEXISTENTE (F-19) | 27 | `purchaseController.ts:51-55`; `auth.ts:226-229` | ❌ **AUSENTE** (dedicado) | QUEBRADO (TC) | Toda a suíte de integração autentica como admin (`testApi.ts:45`) → curto-circuito sempre ligado |
| BR-SUP-010 requisição sem alçada por valor | — | INEXISTENTE (F-16) | 33 CONFLIT | `ChangePurchaseRequisitionStatusUseCase.ts:62-117` | `purchase-requisition-status.test.ts:12-99` (transições) + `:112-127` (403 nível) **NOMINAL** | AMBÍGUO | Transição/nível testados; **AUSÊNCIA de faixa de valor NÃO asserida** (R$5M aprovável por qualquer `requisicoes:approve`) |
| BR-SUP-011 mínimo 3 cotações | 3-cotações | RF-COM-04 **CONFLICT** | 36/39 FANTASMA | `rfqValidators.ts:39` (`.min(1)`); `AwardRfqUseCase.ts:108-129` | `rfq.test.ts:246-288` (convida 2, idempotência) **NOMINAL** | QUEBRADO (DIVERGENTE) | Doc diz 3, código aceita 1; teste convida sem exigir contagem. Conversão gera pedido sem RFQ nenhuma |
| BR-SUP-012 critério de adjudicação | vazio | INEXISTENTE (F-17) | 39 FANTASMA | `AwardRfqUseCase.ts:108-139` | `rfq.test.ts:411-539` **PROVA a AUSÊNCIA** | QUEBRADO (regra ausente) | Teste confirma escolha livre sem comparação de preço/justificativa. `GetRfqComparison` marca `is_best_price` mas award não o usa |
| BR-SUP-013 pedido RFQ/conversão nasce national | TODO | INEXISTENTE | 34/39 | `AwardRfqUseCase.ts:277-292`; `ConvertRequisition...` (sem origin) | `rfq.test.ts:453`; `requisition-convert-to-purchase.test.ts:220,223` (status pending) **NOMINAL** | QUEBRADO | Testes asserem `status:'pending'`, **não** `origin`. Lacuna conhecida (TODO.md) |
| BR-SUP-014 gate COMEX draft→shipped | D-G/G11-COMEX | UC-19 (RF-COM) | 43 CONFIRM | `comex/domain/constants.ts:44-96`; `RegisterImportTrackingUseCase.ts:98-99,135-147` | `comex-directorate-approval.test.ts:95-180` **PROVA** | AMBÍGUO | Gate PROVADO (bloqueia embarque milionário sem diretoria); UC-41 conflita no nível |
| BR-SUP-015 congelamento monetário no embarque | freeze | INEXISTENTE (pendência README) | 43 | `comex/domain/constants.ts:77-82`; `RegisterImportTracking...:100,171-182` | `comex-directorate-approval.test.ts:182-223` (frozen_fields) **PROVA** | QUEBRADO (REQ) | **DELTA-INSUMO:** passo-26 marca DISCOVERED sem teste; em disco há prova por campo. `comex/README.md:81-82` pede validação do dono |
| BR-SUP-016 fail-open com NaN | NaN | INEXISTENTE | 26 | `constants.ts:171-175,185-189` | `purchase-approval-authority.test.ts:124` (null→0); ramo NaN **AUSENTE** | QUEBRADO (TC) | Controle de autorização fail-open silencioso; UNKNOWN, sem teste do caso degenerado |

### Cadastro Central (D2)

| BR provisório | gap | REQ | UC-CADSUP | CÓDIGO (arquivo:linha) | TC (arquivo:linha) | Elo + fraco | Observação |
|---|---|---|---|---|---|---|---|
| BR-CAD-001 CNPJ fornecedor (DV+normaliz+unicidade) | — | REQ-CAD candidato / INEXISTENTE | 11 FANTASMA | `CreateSupplierUseCase.ts:31-36,56-60`; `utils/validators.ts:76-96` | `clients-suppliers-financial-bom-validation.test.ts:28-39` (sem cnpj→400) **NOMINAL** | QUEBRADO (TC) | **DELTA-INSUMO:** linhas `:88-92` citadas no passo-26 hoje apontam para teste de "payload válido" (201/409), não DV nem unicidade. DV e 409-duplicado **sem asserção** |
| BR-CAD-002 estrangeiro precisa CNPJ BR | — | INEXISTENTE (UNKNOWN) | 11 | `CreateSupplierUseCase.ts:31-34`; `supplierValidators.ts:9` | ❌ **AUSENTE** | QUEBRADO (TC) | Teste de estrangeiro usa CNPJ BR válido. Contradição de modelo (não decidível por código) |
| BR-CAD-003 is_foreign obrigatório na criação | 08-11 | INEXISTENTE | 11 | `supplierValidators.ts:34-37` (`z.boolean()`) | `purchase-origin-foreign-supplier.test.ts:106-119` (400 + campo nomeado) **PROVA** | AMBÍGUO | Comportamento PROVADO; UC FANTASMA, sem REQ |
| BR-CAD-004 is_foreign escalation-only na edição | G11 | API.md:2957 candidato | 12 FANTASMA | `UpdateSupplierUseCase.ts:53-64` | `purchase-approval-authority.test.ts:448-474` (true→false→G11; →ok) **PROVA** | AMBÍGUO | PROVADO; sem UC/REQ |
| BR-CAD-005 backfill is_foreign legado | pendência | TODO.md:5260-64 (aberto) | — | ❌ **NENHUM** (sem migration) | ❌ **N/A** | QUEBRADO (CÓDIGO) | Elo de implementação INEXISTENTE; exposição só de dado legado; volume não medível (banco proibido) |
| BR-CAD-006 campos não alteráveis fornecedor | — | README/API candidato | 12 | `UpdateSupplierUseCase.ts:10-15`; `CreateSupplierUseCase.ts:50-51` | `purchase-approval-authority.test.ts:448-474` (só is_foreign) **NOMINAL** | QUEBRADO (TC) | is_foreign coberto; cnpj/status/rating/quality_score **sem asserção** |
| BR-CAD-007 CPF/CNPJ cliente polimórfico | — | clients/README candidato | 15 CONFIRM (UC-02) | `CreateClientUseCase.ts:34-44,78`; `validators.ts:101-115` | `clients-suppliers...:14-25` (campo desconhecido→400); `client-cnae-optional.test.ts` (CNAE) **NOMINAL** | QUEBRADO (TC) | **DELTA-INSUMO:** `:79-83` citado ≠ conteúdo em disco. DV por tamanho (11/14) e unicidade 409 **sem asserção** (CPF DV só é testado em RH, `employees-use-cases.test.ts:20-29`) |
| BR-CAD-008 item codigo único | codigo | REQ-CAD-D01 INEXISTENTE | 01 FANTASMA | `CreateItemUseCase.ts:28-31` | ❌ **AUSENTE** (`CreateItemUseCase` não é exercitado; `items-models.test.ts` testa modelo, não unicidade) | QUEBRADO (TC) | Ponto aberto: `ABC-100`≠`abc-100`; crosswalk literal quebra em silêncio. Sem teste em 3 elos |
| BR-CAD-009 item cria produto-gêmeo | catálogo-duplo | REQ-CAD-D02 INEXISTENTE | 01 FANTASMA | `CreateItemUseCase.ts:33-58`; `itemProductMirrorService.ts` | **`item-product-mirror.test.ts` NÃO EXISTE** (glob `**/*mirror*` → só node_modules); `items-use-cases.test.ts:14-18` **MOCKA** o serviço | QUEBRADO (TC-FANTASMA) | Invariante central do sistema. RELATED_TEST do BR-CAD-009 e 2 comentários (`purchase-approval-authority.test.ts:3`, `items-use-cases.test.ts:9`) apontam arquivo inexistente |
| BR-CAD-010 BOM só finished | G1 | INEXISTENTE | 21 CONFLIT | `bomService.ts:203-208` | `bom-create-revision-rules-g1.test.ts:219-229` **PROVA** | AMBÍGUO | PROVADO; sem REQ |
| BR-CAD-011 ciclo/auto-ref BOM | G1 | INEXISTENTE | 21 | `bomService.ts:220-234,245-278` | `bom-create-revision-rules-g1.test.ts:94-124`; `bom-single-source-g1.test.ts:131-148`; `bom-cycle-multilevel.test.ts` **PROVA** | AMBÍGUO | Auto-ref + ciclo multinível PROVADOS (unit + integração) |
| BR-CAD-012 revisão duplicada | G1 | INEXISTENTE (ISO externa) | 22 | `bomService.ts:281-298` | `bom-create-revision-rules-g1.test.ts:126-150` **PROVA** | AMBÍGUO | Origem é norma externa, não decisão do dono |
| BR-CAD-013 única BOM ativa/imutável | G1 | INEXISTENTE | 21/22 CONFIRM | `bomService.ts:308-313`; `UpdateBOMUseCase.ts:114-157`; `SequelizeBOMRepository.activateExclusively` | `bom-single-source-g1.test.ts:260-296`; `bom-engineering-change-control-g1.test.ts` **PROVA** | AMBÍGUO | Supersede na mesma transação PROVADO |
| BR-CAD-014 ninguém aprova BOM | — | INEXISTENTE (F-22) | 21 CONFLIT | `bomService.ts:314-322`; `BillOfMaterial.ts:49-50`; `routes/bom.ts:19-34` (sem /approve) | ❌ **AUSENTE** (`ApproveBOMUseCase` testado mas SEM rota) | QUEBRADO (TC) | `approved_by`/`approval_date` = campos-fantasma nunca escritos. Contraste com D-K exigido para COMPRAR |
| BR-CAD-015 profundidade máx 10 | G1 | INEXISTENTE | 21/23 | `BOMEntity.ts:4,72-75`; `bomService.ts:148,459-464` | profundidade 10 **NOMINAL/AUSENTE** (2 níveis testados em `bom-two-level-reparo`) | QUEBRADO (TC) | Constante `10` duplicada em 2 arquivos sem fonte única |
| BR-CAD-016 tipos não-produtivos fora de BOM | G1 | INEXISTENTE | 21 | `bomService.ts:51-92,216,243` | `bom-create-revision-rules-g1.test.ts:152-206`; `bom-tipo-nao-produtivo.test.ts` **PROVA** | AMBÍGUO | ATIVO_IMOBILIZADO/USO_E_CONSUMO como pai e componente PROVADOS |
| BR-CAD-017 subconjunto estocável×fantasma | G18 | INEXISTENTE | 21 | `bomService.ts:121-129,489-528` | `bom-two-level-reparo.test.ts` (10 etapas, produção×engenharia) **PROVA** | AMBÍGUO | Prova mais forte do cluster (reserva/consumo/custeio de 2 níveis) |

### Cadastros rasos (cobertura declaradamente rasa no passo 26)

| Item | REQ | UC-CADSUP | CÓDIGO | TC | Elo + fraco | Observação |
|---|---|---|---|---|---|---|
| categories CRUD/nome único | REQ-CAD-D06 INEXISTENTE | 17 CONFLIT | `categories.ts:12-16`; use-cases | `categories-use-cases.test.ts:6-51` (nome, unicidade→Conflict, 404) **PROVA parcial** | QUEBRADO (TC/RBAC) | RBAC `operator`×`admin` (UC-09 CONFLIT) **não testado**; RBAC por role legado |
| departments CRUD/code+name único | REQ-CAD-D07 INEXISTENTE | 18 FANTASMA | `departments.ts:12-16`; `CreateDepartmentUseCase.ts:33-46` | `departments-use-cases.test.ts:6-51` **PROVA parcial** | AMBÍGUO | Sem UC dedicado; guarda seeds↔doc do organograma não auditada; inativação sem verificar vínculo |
| employees CRUD + LGPD | INEXISTENTE | 19 CONFLIT | `employees.ts:19-23`; `employeeSensitiveFields.ts` | `employees-use-cases.test.ts` (CPF DV :20-29; LGPD :71-181) **PROVA** | QUEBRADO (UC) | `UC-11` passo 8 (eSocial S-2200) e "exame admissional" **sem código** (OBSOLETE); 0 registros em base real |
| products cadastro | INEXISTENTE | 20 CONFLIT | `products.ts:19-30`; `CreateProductUseCase` | indireto via `bom-two-level-reparo` **NOMINAL** | QUEBRADO (código sem BR) | `UC-03` regras "preço venda > custo" e "qtd mín 5" **não confirmadas no código** (OBSOLETE, a verificar) |

## 3. Elos reversos

### 3.1 UCs FANTASMA (implementados, sem UC no catálogo) — 15 (fonte: `USE_CASES_RECOVERED...:295`)
`UC-CADSUP-01, 02, 03, 05, 11, 12, 13, 16, 18, 30, 32, 35, 36, 37, 38, 39, 45`.

**DESTAQUE RFQ — subsistema inteiro FANTASMA:** `UC-CADSUP-35, 36, 37, 38, 39` (criar cotação, convidar, registrar cotação, mapa comparativo, adjudicar). O BPMN admite a ausência (`DIAGRAMA_CASOS_DE_USO_BPMN.md:19,54`); "UC-25b" é citado em `04-USE_CASES.md:954,1143` e **nunca definido**. Paradoxo relevante: **o RFQ tem TESTE forte (`rfq.test.ts`, ~700 linhas, PROVA CreateRfq/Invite/Quote/Comparison/Award+G12) mas ZERO UC** — o elo CÓDIGO→TC existe, o elo UC→CÓDIGO está quebrado. Comportamento com efeito financeiro (gera pedido de compra) sem caso de uso rastreável.

### 3.2 UCs sem teste (elo UC→TC quebrado)
- **UC-CADSUP-01 (Criar item + espelho):** `CreateItemUseCase` não é exercitado por nenhum teste; o serviço de espelho é mockado onde poderia sê-lo. Teste referenciado (`item-product-mirror.test.ts`) **não existe**.
- **UC-CADSUP-27 / 41 (registrar alçada diretor):** sem teste do **nível** exigido (BR-SUP-008) — o `resolveAvailableApproverRoles` por truthy não é coberto.
- **UC-CADSUP-30 (`/nfe`):** fronteira fiscal, deferida ao cluster comercial-financeiro.
- **UC-CADSUP-20 (produto):** sem teste dedicado; coberto só indiretamente.

### 3.3 REQs fantasma (comportamento em produção sem requisito)
Todos `INFERRED — NEEDS HUMAN VALIDATION`, IDs candidatos marcados INEXISTENTE no repositório: `REQ-CAD-D01..D07` (`items`/`categories`/`departments`) e os BRs sem RF: BR-SUP-004 (F-14), BR-SUP-006, BR-SUP-009 (F-19), BR-SUP-010 (F-16), BR-SUP-012 (F-17), BR-SUP-013, BR-SUP-015, BR-SUP-016; BR-CAD-002 (UNKNOWN), BR-CAD-005, BR-CAD-008, BR-CAD-009 (F-02), BR-CAD-014 (F-22). **`items` (327 registros reais em produção) não tem um único RF** (`REQUIREMENTS_BASELINE.md:29-31,87-88`).

### 3.4 Código sem BR / código órfão
- **`item_estruturas` + `ExplodeItemStructureUseCase` (UC-CADSUP-05):** endpoint de leitura vivo (`items.ts:19`) sobre a estrutura que o G1 aposentou; a escrita está barrada (`CreateItemStructureUseCase.ts:79-92`, PROVADO em `bom-single-source-g1.test.ts:198-258`). Lê árvore que o resto do sistema abandonou.
- **`ApproveBOMUseCase.ts`:** 70 linhas, **testado**, **sem rota HTTP** — implementação duplicada e inalcançável da ativação de BOM (OBSOLETE_CANDIDATE; `bom/README.md:61,208-211`).
- **`UC-03` regras de produto** (preço venda > custo; qtd mínima 5) e **`UC-11` passos eSocial/exame admissional:** documentados, sem código correspondente (OBSOLETE_CANDIDATE).

## 4. Placar

### 4.1 Cadeias completas × quebras por elo (33 BR + 4 rasos = 37 linhas)
- **Cadeia BR→REQ→UC→AC→TC íntegra e canônica: 0/37.** Impossível por construção — nenhum BR-ID/OWNER/AC canônico (§1).
- **Elo BR-ID canônico:** QUEBRADO 37/37.
- **Elo REQ canônico (RF com AC/TC):** QUEBRADO 37/37 (RF-COM-02/04/05 existem como RF, mas em CONFLICT e sem AC/TC).
- **Elo UC formal presente e batendo (CONFIRMED):** ~10/45 UCs (`USE_CASES_RECOVERED...:293`); FANTASMA 15, CONFLITANTE 9, OBSOLETE 4.
- **Elo CÓDIGO presente:** 36/37 (única exceção BR-CAD-005 — sem implementação de backfill).
- **Elo TC (asserção verificada em disco):**

| TC | BRs | Qtd |
|---|---|---|
| **PROVA** (asserção do comportamento-alvo) | SUP-001,002,003,004,005,006,007,014,015; CAD-003,004,010,011,012,013,016,017; +categories/departments/employees | **20** |
| **NOMINAL** (nome sugere, não assere alvo) | SUP-010,011,013; CAD-001,006,007,015; +products | **8** |
| **AUSENTE** | SUP-008,009,016; CAD-002,014; (CAD-005 N/A) | **5** |
| **FANTASMA** (arquivo de teste inexistente) | CAD-009 | **1** |

**Cobertura de teste REAL: 20/33 BR-core (~61%). Elo TC quebrado (NOMINAL+AUSENTE+FANTASMA): 14/33 (~42%).**

### 4.2 Cobertura de teste real por UC (amostra)
- PROVADOS por teste: UC-04, 06-10, 21-23, 24, 25, 26, 34, 40-45, e RFQ 35-39 (via `rfq.test.ts`, apesar de FANTASMA no catálogo).
- Sem prova de teste: UC-01, 02 (parcial), 03 (só `deactivate-item-http-409.test.ts`, 1 dos 5 vínculos), 20, 27/41 (nível), 30 (fora).

### 4.3 Três correções de insumo detectadas em disco (DELTA-INSUMO)
1. **BR-SUP-004** — passo-26 §5 lista "sem teste"; em disco há `purchase-approval-authority.test.ts:122-125,175-185`.
2. **BR-SUP-006** — passo-26 não cita teste; em disco há `purchase-approval-authority.test.ts:426-437`.
3. **BR-SUP-015** — passo-26 DISCOVERED sem teste; em disco há `comex-directorate-approval.test.ts:182-223`.
   (Explicação provável: insumos produzidos em commits anteriores — UC f05e865, REQ c9359be — a HEAD atual. **Nota do orquestrador:** nenhum `src/` mudou entre esses commits; o passo 26 sub-reportou testes que já existiam.)

## 5. Causas-raiz (registradas, não resolvidas — decisão humana, CLAUDE.md 20-21)

1. **Ausência de catálogo de BR-IDs canônicos.** Toda regra vive como rótulo de gap/decisão em prosa ou comentário; nenhum artefato enumera BR-IDs, OWNER ou vigência de forma autoritativa (`BUSINESS_RULE_CANDIDATES...:543-549`). É a causa direta de os elos BR-ID/OWNER/REQ-canônico nascerem quebrados em 37/37 linhas.
2. **RFQ sem UC formal (assumido no BPMN).** Um subsistema que gera pedido de compra (efeito financeiro) opera sem caso de uso; "UC-25b" é referência pendente nunca definida. Viola §19/§20 do Master Spec.
3. **Ghost requirements — 58 comportamentos em produção sem requisito** (`REQUIREMENTS_BASELINE.md:200-234`), inclusive o cadastro-mestre `items` (PRODUÇÃO REAL, 327 registros, 0 RF). A pergunta "quem aprova o quê" não tem resposta em artefato versionado — só varrendo código (`:232-234`).
4. **Ausência de documento de estratégia de testes** (`NFR-MAINT-D05`, `REQUIREMENTS_BASELINE.md:268-270`) — causa-raiz declarada das lacunas "regra crítica sem teste": não há critério que force teste ao lado do requisito, então regras nascem sem TC vinculado.

## 6. Candidatos a finding (NÃO promovidos — DISCOVERY; seguem ao passo 31)

Nenhum coberto por FIND-ERP-001/002/005-009. Severidade × confiança separadas; CRITICAL/HIGH exigem `vericore-finding-validator`.

1. **[HIGH/CONFIRMED] BR-CAD-009 — invariante central (crosswalk item→produto-gêmeo) com TESTE-FANTASMA.** `CreateItemUseCase.ts:33-58` referencia `item-product-mirror.test.ts` que **não existe** em disco; o único teste que tocaria o serviço o mocka (`items-use-cases.test.ts:14-18`). Toda a cadeia RFQ/requisição/COMEX depende do espelho e nenhum teste o exercita.
2. **[HIGH/CONFIRMED] BR-SUP-008/009 — alçada `diretor` por PRESENÇA do módulo, não `approve`, sem teste, e admin satisfaz sozinho.** Núcleo do mandato de rastreabilidade "permissão declarada ≠ imposta": doc reivindica nível `approve`; backend não discrimina (`auth.ts:258-284`; `purchaseController.ts:51-55`). Toda a suíte de integração roda com o curto-circuito admin ligado (`testApi.ts:45`).
3. **[HIGH/CONFIRMED] BR-CAD-008 — codigo de item (mestre PRODUÇÃO REAL) sem requisito, sem UC e sem teste.** `CreateItemUseCase.ts:28-31`; unicidade case-sensitive quebra o crosswalk literal em silêncio.
4. **[MEDIUM/CONFIRMED] BR-SUP-011/012 — RFQ sem competitividade em nenhum ponto.** `rfqValidators.ts:39` aceita 1 cotação (doc pede 3, RF-COM-04); `AwardRfqUseCase.ts:108-139` permite escolha livre — `rfq.test.ts:411-539` **confirma a ausência** da regra. Divergência valor-documentado × implementado mais limpa do cluster.
5. **[MEDIUM/CONFIRMED] BR-SUP-007 — segregação D-K: artefatos versionados se contradizem.** Código+teste PROVAM a imposição (`purchase-segregation-of-duties.test.ts`); `PLANO_ACAO...:136-142`, `TODO.md:5271-5274`, `04-USE_CASES.md:436-439` afirmam "não implementado". Fonte autoritativa indeterminável.
6. **[MEDIUM/CONFIRMED] BR-CAD-001/007 — validação de CNPJ/CPF (DV + unicidade 409) sem teste que a assere.** Os testes citados no passo-26 hoje cobrem só obrigatoriedade/payload estrito; DV e 409-duplicado sem asserção em clients e suppliers (só o domínio RH testa DV de CPF).
7. **[MEDIUM/CONFIRMED] BR-CAD-014 — BOM entra vigente sem ato de aprovação; `approved_by`/`approval_date` são campos-fantasma.** `bomService.ts:314-322`; `routes/bom.ts:19-34` sem rota `/approve`; `ApproveBOMUseCase` testado e inalcançável. Estrutura define consumo/custo/MRP sem segundo par de olhos.
8. **[MEDIUM/CONFIRMED] UC-CADSUP-40 — pré-condição COMEX `is_foreign=true` documentada e não imposta.** `CreateImportProcessUseCase.ts:67-70` só checa existência do fornecedor; `comex.test.ts:124-208` confirma que `is_foreign` não é verificado (converge com contradição de modelo BR-CAD-002).
9. **[LOW/CONFIRMED] Código órfão do G1.** `ExplodeItemStructureUseCase` (UC-05) lê `item_estruturas` aposentada; `ApproveBOMUseCase` sem rota. Ambos OBSOLETE_CANDIDATE.
10. **[INFO/CONFIRMED] Ausência de catálogo de BR-ID/OWNER e de estratégia de testes** — causa-raiz transversal (37/37 elos de topo quebrados; `REQUIREMENTS_BASELINE.md:268-282`).

---

*Produzido pela trilha `vericore-traceability-auditor` (passo 29, ERP-LEGACY-001) em modo read-only reforçado — Read/Grep/Glob apenas; sem Bash, sem execução de teste, sem banco. Produção real (`items`, `categories`, `departments`) lida só por código-fonte e arquivo de teste. Todo elo foi verificado em disco no HEAD atual; nenhum elo foi inferido ou "completado". Nenhum finding promovido. Persistência pelo orquestrador (hook org-isolation bloqueia escrita VeriCore fora de `audit/`).*
