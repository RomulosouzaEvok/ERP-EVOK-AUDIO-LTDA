# LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md — ERP-LEGACY-001, Passo 29

```
PROJECT_ID:  ERP-LEGACY-001
CLUSTER:     comercial-financeiro
MÓDULOS:     sales, serviceOrders, financial, accounting, budget, treasury, fiscal
FASE:        DISCOVERY (não é auditoria 360°, não é remediação). Trilha VeriCore read-only.
MÉTODO:      READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum comando/teste/script/
             banco executado. Cada elo é PRESENTE, QUEBRADO ou AMBÍGUO — nenhum inventado.
VOCABULÁRIO: fold-in — "DIVERGENTE" (doc×código) e "INEXISTENTE" (ausência) são registrados
             como QUEBRADO, com o motivo na Observação. AMBÍGUO = fonte existe mas é
             auto-contraditória, prosa sem ID, ou não-vinculante.
```

## 1. Cabeçalho, ressalva e fontes

**Ressalva estrutural — a matriz NASCE QUEBRADA (confirmado e detalhado):** nenhuma das 29 regras candidatas do cluster tem **BR-ID canônico versionado**. Só existem rótulos provisórios do passo 26 (`BR-COM-`, `BR-FIS-`, `BR-CTB-`, `BR-CTR-`, `BR-TES-`, `BR-FIN-`), rótulos de gap (`F-nn`, `G9`/`G13`, `gap n/3`) e IDs de UC provisórios do passo 28 (`UC-COMFIN-nn`). O **primeiro elo de toda cadeia** (`BR-ID`) está, portanto, **QUEBRADO em 100% das linhas** — não repito a coluna; declaro aqui e conto no placar. O segundo elo (`REQ-ID`) também não existe de forma canônica: a baseline §6 registra que **nenhum dos 90 RFs tem OWNER, AC ou aponta para um TC**, e §3.4 que **accounting/budget/treasury não têm um único RF**.

**Fontes (relidas em disco nesta passagem):**
- BRs: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_comercial-financeiro.md` (passo 26)
- UCs: `.../USE_CASES_RECOVERED_comercial-financeiro.md` (passo 28; UC-COMFIN-01..26 + OBS-COMFIN-01)
- REQs: `.../REQUIREMENTS_BASELINE.md` (passo 27; §3.2, §3.4, §4)
- Testes: `server/tests/**` — lidos em primeira mão (describe/it/asserções), **não executados**. (O Glob de testes co-locados em `server/src/modules/**` retornou vazio: todos os testes do cluster vivem em `server/tests/{unit,integration}`.)

**Caveat de AUDIT_COMMIT (Regra 12/14):** os `arquivo:linha` da coluna **CÓDIGO** são herdados dos insumos dos passos 26/28, que auditaram `c9359be` (tag `legacy-baseline-001`) / HEAD `3eb0b5e` reconciliado. Os `arquivo:linha` da coluna **TC** são **de primeira mão no disco atual** (git status inicial = `65bd66d`). Não re-verifiquei as linhas de CÓDIGO contra `65bd66d`; a baseline declara que nenhum arquivo de `src/` mudou entre `c9359be` e o estado auditado. Reconciliar `AUDIT_COMMIT` antes de fixar é do director. **(Nota do orquestrador: os commits intermediários — `f05e865`, `3eb0b5e`, `7b705f1` — são exclusivamente docs de `coretriad`; nenhum `src/` mudou desde a baseline `c9359be`. As trilhas do passo 29 auditam o mesmo código-fonte da baseline.)**

## 2. Tabela principal — uma linha por BR

Legenda de elos: `P`=PRESENTE · `Q`=QUEBRADO · `A`=AMBÍGUO. `BR-ID`(1º elo)=**Q em todas** (provisório). Coluna "elo mais fraco" reporta o pior elo **a jusante** (REQ→UC→CÓDIGO→TC).

| BR-ID prov. | gap | REQ | UC-COMFIN | CÓDIGO (arquivo:linha) | TC (arquivo:linha) | Elo + fraco | Observação |
|---|---|---|---|---|---|---|---|
| BR-COM-001 máquina de estados | — | A (§11 só 2/8 transições) | P (UC-02) | ChangeSaleStatusUseCase.ts:12-30,152-157 | P change-sale-status-partially-invoiced.test.ts:63-101; sale-quote-confirm.test.ts:78-131 | **A** | doc cobre 2 de 8 transições (L-2); sem REQ-ID |
| BR-COM-002 anti-set manual invoiced/partially | — | A (§11:311-314) | P (UC-02) | ChangeSaleStatusUseCase.ts:125-132 | P (parcial) change-sale-status-partially-invoiced.test.ts:63-71 | **A** | teste prova só `partially_invoiced→422`; `invoiced` manual não asserido; Zod aceita ambos (saleValidators.ts:40-42) — guarda dupla |
| BR-COM-003 shipped exige nfe authorized | — | A (§11:315-316; UC-27) | P (UC-02) | ChangeSaleStatusUseCase.ts:159-170 | **Q** nenhum teste do caminho `invoiced`(NF-e cancelada)`→shipped` (L-3) | **Q** | o caminho de exceção que É a razão da regra não tem teste |
| BR-COM-004 shipped terminal | — | A (§11) | P (UC-02) | ChangeSaleStatusUseCase.ts:28,143-150 | **Q** nenhum teste exercita `shipped→canceled`=422 | **Q** | terminalidade não provada por teste |
| BR-COM-005 "dupla trava" NF-e | C-11 | **Q DIVERGENTE** (§11:320-327 e UC-41:961-974 × código: 1 trava só) | Q (UC-06 CONFLITANTE na permissão) | auth.ts:175-200,213-229,272-280; sales.ts:54,56 | P sales-nfe-rbac.test.ts:143-171 (prova a trava única `approve`) | **Q** | doc versionado (2 artefatos, cenário Gherkin) exige 2ª trava que não existe; decisão vive só em JSDoc (viola Regra 16/17); admin curto-circuita (auth.ts:226-229) |
| BR-COM-006 confirma reserva, não gera AR | G9/G13 | A (PLANO_ACAO §4 + CPC47/SINIEF; **owner nomeado**, sem REQ-ID) | P (UC-01/02) | ChangeSaleStatusUseCase.ts:223-239; CreateSaleUseCase.ts:169-193; saleReceivableService.ts:203-208 | P sale-stock-baixa-na-nfe-g9.test.ts (todo); sale-receivable-na-nfe-g13.test.ts (todo); g13-payable-receivable.test.ts:622-696 | **A** | **melhor cadeia do cluster**; só falha por não ter BR-ID/REQ-ID canônico. Sub-achado: pré-checagem usa saldo bruto (CreateSaleUseCase.ts:129) |
| BR-COM-007 itens só em quote/confirmed | gap 2/3 | **Q** (fantasma; só LEVANTAMENTO+JSDoc) | Q (UC-03 FANTASMA) | EditSaleItemsUseCase.ts:73-80,107-118 | P edit-sale-items.test.ts:174-192,194-208 | **Q** | regra real sem requisito nem UC |
| BR-COM-008 tabela preço não vincula | F-39/gap 1/3 | **Q** (fantasma; L-4) | Q (UC-05 FANTASMA) | CreateCustomerPriceUseCase.ts:4-13; **ausência** em CreateSaleUseCase.ts:113-141 | **Q** customer-price-list.test.ts cobre só CRUD; nenhum teste prova a não-vinculação na venda | **Q** | preço R$100 pode sair a R$1 sem erro; TC não toca a regra real |
| BR-COM-009 sem limite de desconto | F-40 | **Q** (inexistente) | A (UC-01 não cobre desconto) | SaleEntity.ts:65-68; saleValidators.ts:25; CreateSaleUseCase.ts:143-146 | **Q** sales-validators.test.ts:103-115 só forma (default 0); 100% de desconto nunca asserido | **Q** | teste nominal/forma; a política "sem teto" não é exercida |
| **BR-COM-010 desconto não chega à NF-e/AR** | **F-41 (CRÍTICO)** | **Q** (inexistente) | **Q** (nenhum UC cobre desconto no faturamento) | CreateSaleUseCase.ts:143-160; IssueSaleNfeUseCase.ts:202,213-214,424-431; saleReceivableService.ts:200,215 | **Q INEXISTENTE** — grep `discount` em tests só acha forma; g13-payable-receivable.test.ts:87 **evita desconto de propósito** | **Q** | 3 valores p/ o mesmo negócio (venda 800 / nota 1000 / cobrança 1000); **nenhum teste com desconto+NF-e existe** |
| BR-COM-011 vigência de preço não sobrepõe | — | **Q** (implementado, sem origem) | Q (UC-05 FANTASMA) | CreateCustomerPriceUseCase.ts:56-65,92-105 | P customer-price-list.test.ts:66-89 | **Q** | comportamento correto, testado, sem requisito |
| BR-COM-012 OS sem máquina de estados | F-42 | **Q** (inexistente; L-5) | Q (UC-26 FANTASMA) | UpdateServiceOrderUseCase.ts:11-24,46-51; CancelServiceOrderUseCase.ts:25-31; serviceOrders.ts:19-23 | **Q** serviceOrders-use-cases.test.ts só testa create-sem-cliente/NotFound; **nenhum teste** do cancel-sem-pré-condição nem da ausência de enum | **Q** | OS `completed` cancelável a qualquer hora; serviço não vira AR — nada disso é testado |
| BR-COM-013 order_number timestamp | — | **Q** (inexistente; L-6) | Q (UC-26 FANTASMA) | CreateServiceOrderUseCase.ts:45 | P (formato) serviceOrders-use-cases.test.ts:31 (`/^OS-\d+$/`) | **Q** | formato testado; unicidade sob mesmo ms **não** testada |
| **BR-FIS-001 ICMS interno 19/27 UF** | **C-2 (CRÍTICO)** | **Q DIVERGENTE** (02-ICMS_ESTADOS.md:9-35 × TaxCalculationService.ts:55-59) | P (UC-06) | TaxCalculationService.ts:55-59,101-117 | **Q** tax-calculation-service.test.ts cobre **só SP** (:6-15), uma das 8 UF que conferem; nenhuma das 19 divergentes | **Q** | código tributa mais em 18 UF, menos em 1 (RS); fallback silencioso 18% (:114) |
| BR-FIS-002 ICMS interestadual | — | **A** (doc contradiz a si: versão A × B, L-8) | P (UC-06) | TaxCalculationService.ts:63,69-74,112-113 | P tax-calculation-service.test.ts:17-34 (consagra versão A) | **A** | fonte autoritativa indeterminável no repo; importado 4% e exportação 0% não implementados |
| **BR-FIS-003 IPI 10-15% doc × 0% código (NCM 8518)** | **C-3 (CRÍTICO)** | **Q DIVERGENTE** (02-ICMS_ESTADOS.md:71-85 × código 0%) | P (UC-06) | TaxCalculationService.ts:119-124; IssueSaleNfeUseCase.ts:216-240 | **Q** IPI nunca asserido; issue-sale-nfe-partial.test.ts:20-27 **mocka** `ipi_aliquot:0` | **Q** | 8518 é o produto principal da fábrica; código reconhece a lacuna em comentário |
| BR-FIS-004 DIFAL documentado | — | **Q** (documentado, sem impl) | P (UC-06) | **Q CÓDIGO AUSENTE** — TaxCalculationService.ts:5-11,154-169 (ausência confirmada) | **Q** inexistente | **Q** | regra com base legal e exemplo numérico, zero código, zero teste |
| BR-FIS-005 ICMS-ST documentado | — | **Q** (documentado, sem impl) | P (UC-06) | **Q CÓDIGO AUSENTE** (02-ICMS_ESTADOS.md:102-131 sem contraparte) | **Q** inexistente | **Q** | idem BR-FIS-004 |
| BR-FIS-006 CFOP de saída | — | **A** (doc lista 5.102 2× e 6.101 como exportação, L-8) | P (UC-06) | TaxCalculationService.ts:88-95 | P tax-calculation-service.test.ts:6,17,36 (consagra o código) | **A** | doc auto-contraditório; teste fixa o comportamento do código, não do doc |
| BR-FIS-007 PIS/COFINS por CRT | — | **A** (doc=código, sem REQ-ID) | P (UC-06) | TaxCalculationService.ts:128-152 | P tax-calculation-service.test.ts:45-77 (3 CRTs, valores exatos) | **A** | **único bloco tributário sem divergência**; só falta REQ-ID |
| BR-FIS-008 pré-condição faturamento | gap 3/3 | **Q DIVERGENTE** (UC-41:879,888-889,927-929 × código aceita `partially_invoiced`, 409 só por `processing`) | A (UC-06 CONFLITANTE) | IssueSaleNfeUseCase.ts:113-118 | P issue-sale-nfe-partial.test.ts:156-212 (exercita o comportamento do código) | **Q** | gap 3/3 implementado/testado sem atualizar UC-41; epsilon 1e-9 (:139-152) sem requisito |
| BR-FIS-009 fallback silencioso p/ mock | F-44/C-4 | **Q** (só JSDoc) | Q (UC-10 config FANTASMA) | NfeProviderFactory.ts:16-26; CompanyFiscalConfig.ts:60 | **Q** nenhum teste da seleção de provedor nem proibição de `mock` fora de dev | **Q** | default de coluna `mock` → nota falsa com baixa de estoque (G9) e AR (G13) reais |
| BR-FIS-010 justificativa cancelamento ≥15 | — | **A** (UC-41:916,977 doc=código) | P (UC-08) | CancelSaleNfeUseCase.ts:88-96 | **Q** sales-nfe-rbac.test.ts:243-278 só o caminho feliz (razão longa); rejeição `<15` não asserida | **Q** | valor documentado idêntico ao código, mas o limiar não é exercitado |
| BR-CTB-001 estorno sem segregação | F-45/C-8 | **Q** (inexistente; L-9) | Q (UC-20 FANTASMA) | ReverseEntryUseCase.ts:42-89; PostEntryUseCase.ts:84-88; accounting.ts:43-44 | P(autoridade)/Q(segregação) accounting-use-cases.test.ts:267-297 prova estorno+reject; **não** prova o mesmo-usuário posta/estorna/aprova | **Q** | um usuário `approve` cria/posta/estorna/aprova; estorno é ele próprio estornável — não testado |
| BR-CTB-002 partida dobrada | — | **A** (código coerente, sem REQ-ID) | Q (UC-20 FANTASMA) | validateEntryItemsShape.ts:26-47; PostEntryUseCase.ts:53-82 | P accounting-use-cases.test.ts:133-260 (débito≠crédito, `<2 itens`, linha dupla) | **Q** | implementação e teste sólidos, mas UC-20 é fantasma e não há REQ-ID |
| BR-CTR-001 orçamento não restringe | F-46/C-7 | **Q** (inexistente; L-10) | Q (UC-22 FANTASMA) | budgetValidators.ts:20; GetBudgetVsActualReportUseCase.ts:92-96; DeleteBudgetLineUseCase.ts:27-33; budget.ts:17-21 | P(parcial) budget-use-cases.test.ts:169-180 prova DELETE físico sem trava; :186-264 prova relatório só informativo | **Q** | ausência de limite/alçada não é testável (não há código); regra fantasma |
| BR-TES-001 settle/cancel sem efeito de caixa | F-48/C-12 | **Q** (inexistente) | Q (UC-24 FANTASMA) | SettleOperationUseCase.ts:30-44; CancelOperationUseCase.ts:33-43 | P(transições)/Q(lacunas) treasury-use-cases.test.ts:162-206 prova transições; efeito-de-caixa/data cruzada/justificativa não testados | **Q** | liquidar R$1M não move um centavo; 3 lacunas sem teste |
| BR-FIN-001 baixa parcial AP/AR | C-10 (FIND-ERP-001) | **Q DIVERGENTE** (UC-05:149-151 promete juros/multa × código paga valor de face) | A (UC-13 CONFLITANTE / UC-15) | ReceivePaymentUseCase.ts:39-73; PayPayableUseCase.ts:39-74 | P(baixa) integrity-transaction-guards.test.ts:150-214 ('partial', reject-paid, lock) | **Q** | doc promete juros que não existem; idempotência de replay ausente = FIND-ERP-001 (**não reabrir**) |
| BR-FIN-002 conciliação 1¢/±7d | — | **A** (API.md:1503 valor=código, sem REQ-ID) | Q (UC-18 FANTASMA) | reconciliationRules.ts:16,23; MatchEntryUseCase.ts:6,72,111 | P reconciliation-use-cases.test.ts (match/baixa/tolerância/janela); bank-reconciliation-ofx-import.test.ts:294 | **Q** | **melhor conformidade valor-a-valor do repo**, mas UC-18 é fantasma, sem REQ-ID |
| **OBS-COMFIN-01 CNAB 240** | **C-5 (dead route)** | **Q** (RF-FIN-07 `[PENDENTE]`→OBSOLETE) | **Q** (nenhum UC ativo; obsoleto) | **Q CÓDIGO-MORTO** cnab.ts:22-31 (8 endpoints) **nunca montado** (finance.ts:6,59); cnabController.ts + use-cases inalcançáveis | **Q** grep `cnab` em tests = **0 arquivos** | **Q** | cadeia com **4 elos quebrados**: docstring (cnab.ts:13-15) e treasury.ts:11-13 afirmam "montado/funcional" — falso |

## 3. Elos reversos (rastreabilidade de trás para frente)

**UCs FANTASMA (código real e alcançável, sem UC-ID/requisito documentado) — 16 de 27:** UC-03, 05, 09, 10, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 (+ OBS-01). **Concentração crítica:** os módulos **`accounting` (UC-19/20/21), `treasury` (UC-23/24/25) e `budget` (UC-22) são 100% fantasma** — nenhum UC documentado, e a baseline §3.4 confirma **zero RF** para os três. Um domínio contábil/tesouraria/controladoria inteiro sem um único elo `REQ`/`UC` versionado.

**CNAB — rota órfã / código-morto sem UC (representado como cadeia terminando em dead code):**
`BR(nenhum) → REQ RF-FIN-07 [OBSOLETE] → UC ∅ → CÓDIGO cnab.ts:22-31 (inalcançável) → TC ∅`. Controller, 6 use-cases (Generate/Get/List Remittance, ProcessReturnFile, Upsert/GetBankingConfig), repositório e 5 models existem mas nenhum caminho HTTP chega neles: `finance.ts:6,59` monta só `/reconciliation`. Documentação mentirosa em dois pontos (cnab.ts:13-15; treasury.ts:11-13).

**UCs SEM teste real (código alcançável, cobertura de teste ausente):** UC-04 (consultar vendas — leitura), UC-10 (config fiscal `GET/PUT /api/fiscal/config`), UC-11 (webhook focus-nfe — `HandleNfeStatusWebhookUseCase`, sem TC dedicado no cluster), UC-21 (balancete / `GetTrialBalanceUseCase`). Mais OBS-01 (CNAB).

**REQs FANTASMA que atingem o cluster (baseline §4):** F-39 (BR-COM-008), F-40 (BR-COM-009), **F-41 (BR-COM-010, CRÍTICO)**, F-42 (BR-COM-012), F-44 (BR-FIS-009), F-45 (BR-CTB-001), F-46 (BR-CTR-001), F-48 (BR-TES-001). Todos `INFERRED — NEEDS HUMAN VALIDATION`.

**Código sem BR sequer levantado (UNDOCUMENTED BEHAVIOR — nenhuma regra candidata no passo 26):** UC-04 (rotas de leitura de venda), UC-09 (histórico multi-NF-e — só TODO.md), UC-16/17 (fluxo de caixa, centros de custo — só LEVANTAMENTO), UC-19/21 (plano de contas, balancete). Há código **e teste** (ex.: cost-centers-and-cashflow-projection.test.ts, accounting-use-cases.test.ts CreateAccount) mas **zero regra de negócio** que os ancore.

## 4. Placar

**Cadeias por elo (30 linhas = 29 BR + CNAB):**

| Elo | PRESENTE | AMBÍGUO | QUEBRADO |
|---|---|---|---|
| **BR-ID** (1º) | 0 | 0 | **30** (todos provisórios) |
| REQ | 0 | 9 | 21 |
| UC | 15 | 2 | 13 |
| CÓDIGO | 27 | — | 3 (FIS-004, FIS-005 ausentes; CNAB dead) |
| TC | 17 | 0 | 13 |

**Elo mais fraco a jusante (REQ→TC):** **QUEBRADO em 24 linhas · AMBÍGUO em 6 · PRESENTE em 0.**

**Cadeias COMPLETAS (BR→REQ→UC→CÓDIGO→TC todos PRESENTE): `0` de 30.** Mesmo as 4 melhores (BR-COM-006, BR-FIS-007, BR-CTB-002, BR-FIN-002) quebram no BR-ID (provisório) e no REQ-ID (inexistente/AMBÍGUO); BR-FIS-007/FIN-002/CTB-002 também quebram no UC (fantasma). Confirma a premissa: **a matriz nasce quebrada, e a quebra é na origem (BR/REQ), não na implementação.**

**Contraste — implementação testada sem regra/requisito canônico (o problema reverso, "UNDOCUMENTED BEHAVIOR testado"): 15 linhas** têm CÓDIGO **e** TC PRESENTE porém REQ ou UC QUEBRADO (COM-001, 006, 007, 011, 013, FIS-002, 006, 007, 008, CTB-001, 002, CTR-001, TES-001, FIN-001, 002).

**Cobertura de teste real por UC (26 ativos):**
- **Testado (exercita comportamento):** UC-01, 02, 03, 05(parc), 06(parc), 07, 08(parc), 09, 12, 13, 14, 15, 16, 17, 18, 19, 20(parc), 22(parc), 23, 24(parc), 25, 26(parc) → **~22/26**.
- **Sem teste real:** UC-04, 10, 11, 21 → 4/26.
- **CNAB (OBS-01):** 0.
- "Parcial" (parc) = o núcleo é testado mas o **gap/finding específico** não: desconto (UC-06), IPI/ICMS-19UF (UC-06), segregação de estorno (UC-20), limite/alçada (UC-22), efeito de caixa (UC-24), máquina de estados/cancel de OS (UC-26), não-vinculação de preço (UC-05), limiar 15-char (UC-08). **A cobertura protege o caminho feliz e deixa o achado descoberto.**

## 5. Causas-raiz (sem inferência — cada uma com âncora)

1. **Ausência de BR-ID canônico versionado.** O passo 26 só produziu IDs provisórios; a fonte de regra é prosa dispersa (BUSINESS_RULES.md §11, JSDoc, PLANO_ACAO, `docs/tributario/`) sem ID/OWNER/AC/TC. Rompe o **1º elo de todas as 30 cadeias**. (Insumo passo 26, nota final; baseline §6.)
2. **Ausência de REQ-ID canônico.** Baseline §6: nenhum dos 90 RFs tem OWNER/AC/aponta TC; §3.4: accounting/budget/treasury têm **zero** RF; desconto de venda e OS sem RF. Rompe o **2º elo** em 21/30.
3. **CNAB é dead route.** `finance.ts:6,59` nunca faz `require('./cnab')`; 8 endpoints inalcançáveis + docstring e `treasury.ts:11-13` afirmando "montado/funcional". Cadeia com 4 elos quebrados de origem.
4. **16 de 27 UCs sem documentação** (FANTASMA), com **accounting/budget/treasury 100% fantasma**. Comportamento real recuperado sem UC-ID.
5. **`docs/tributario/` diverge do código e de si mesmo** (L-7/L-8): ICMS interno 19/27 UF, IPI 0%×10-15%, interestadual/CFOP auto-contraditórios — impede desempate por artefato.
6. **Sem estratégia de teste versionada** (NFR-MAINT-D05, baseline §5): causa-raiz declarada das ~13 lacunas "regra crítica sem teste" desta matriz (os TCs cobrem o caminho feliz, não o achado).
7. **Inconsistência no próprio insumo:** o sumário do passo 26 anuncia "24 regras candidatas" mas a tabela e as seções trazem **29** BR-IDs. Miscount de rastreabilidade na fonte (INFO) — registrado, não corrigido.

## 6. Candidatos a finding (NÃO promovidos — seguem ao passo 31 / finding-validator)

Reafirmo os candidatos dos passos 26/28 sem reabrir (arquivo:linha dos dois lados já nas seções) e acrescento os **específicos de rastreabilidade** desta trilha:

| # | Objeto (rastreabilidade) | Sev./Conf. candidata | Âncora |
|---|---|---|---|
| TR-1 | **Cadeia BR→REQ→UC→CÓDIGO→TC completa: 0 de 30.** BR-ID e REQ-ID canônicos inexistentes em todo o cluster | HIGH / CONFIRMED | esta matriz §4; baseline §6 e §8#6 |
| TR-2 | **accounting/budget/treasury: 100% UC-fantasma + zero RF** (domínio contábil/tesouraria sem elo REQ/UC versionado) | HIGH / CONFIRMED | UC-19..25; baseline §3.4 |
| TR-3 | **BR-COM-010** desconto não chega à NF-e/AR — **TC INEXISTENTE** (nenhum teste com desconto+emissão; g13-...:87 evita de propósito) | CRITICAL / CONFIRMED | =C-1/F-41 |
| TR-4 | **BR-FIS-001/003** tributos divergentes com **TC cego** (só SP; IPI nunca asserido/mockado a 0) | CRITICAL / CONFIRMED | =C-2/C-3; tax-...:6-15; issue-sale-nfe-partial.test.ts:20-27 |
| TR-5 | **CNAB dead chain** — 4 elos quebrados + documentação mentirosa | MEDIUM / CONFIRMED | =C-5; cnab.ts:13-15,22-31; finance.ts:6,59 |
| TR-6 | **Cobertura protege caminho feliz, não o achado** — 8 UCs com gap crítico não exercitado (BR-COM-003/004/008/012, FIS-009/010, CTB-001, TES-001) | MEDIUM / CONFIRMED | esta matriz §2/§4 |
| TR-7 | Insumo do passo 26 conta "24 regras" × 29 reais | INFO / CONFIRMED | BUSINESS_RULE_CANDIDATES §0 |

Demais candidatos (C-6 OS, C-7 orçamento, C-8 estorno, C-9 preço, C-10 baixa AP/AR, C-11 permissão NF-e, C-12 tesouraria) permanecem como no passo 28 — mapeados nas linhas acima, **não promovidos**.

---

## Ressalvas de método (o que esta trilha NÃO afirma)

- **Não promove finding, não decide divergência, não corrige objeto auditado** (Regras 2, 20-21). "DIVERGENTE"/"INEXISTENTE" descrevem o estado do elo, não vereditos.
- **Não executou nada** — testes lidos por describe/it/asserção; "TC PRESENTE" = a asserção exercita o comportamento no `arquivo:linha` citado; "TC QUEBRADO" inclui teste nominal (nome sem asserção do comportamento) e ausência.
- `arquivo:linha` de **CÓDIGO** herdados dos passos 26/28 (AUDIT_COMMIT `c9359be`/`3eb0b5e`); de **TC** de primeira mão no disco atual (`65bd66d`). Reconciliação do `AUDIT_COMMIT` é do director (Regra 12/14).
- Nenhum elo foi "preenchido por inferência": onde não há evidência, o elo é **QUEBRADO/INEXISTENTE** e está contado.

**Critério de conclusão atendido:** cada uma das 30 linhas em escopo tem os quatro elos a jusante marcados (P/A/Q) — nenhum em branco — e o elo mais fraco identificado. Insumo pronto para `vericore-audit-consolidator` e `vericore-audit-reporting-agent`.
