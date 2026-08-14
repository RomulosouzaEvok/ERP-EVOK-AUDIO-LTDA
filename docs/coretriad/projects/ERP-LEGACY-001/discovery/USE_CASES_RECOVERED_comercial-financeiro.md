# USE_CASES_RECOVERED_comercial-financeiro.md — ERP-LEGACY-001, Passo 28

```
PROJECT_ID:   ERP-LEGACY-001
CLUSTER:      comercial-financeiro
MÓDULOS:      sales, serviceOrders, financial, accounting, budget, treasury, fiscal
              (todos confirmados via Glob em server/src/modules/<módulo>/)
MÉTODO:       READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Read/Grep/Glob apenas.
              Nenhum comando, teste, script ou conexão de banco executado.
REGRA 2/3:    A documentação (04-USE_CASES.md, 01-USE_CASES.md, BUSINESS_RULES.md §11) é
              OBJETO DE AUDITORIA, não fonte de verdade. Onde código e doc divergem, ambos
              os lados estão citados com arquivo:linha; a decisão é do responsável humano.
RESSALVA:     TODO UC abaixo é DISCOVERED_USE_CASE até validação humana. IDs UC-COMFIN-NN são
              provisórios deste passo, não são UC-IDs oficiais do repositório (Regra 17).
```

> **NOTA DO ORQUESTRADOR (reconciliação do alerta §0 abaixo, Regra 12-14):** a trilha leu, em disco, o HEAD `3eb0b5e` — que é correto: o HEAD avançou de `f05e865` para `3eb0b5e` porque a onda 1 do passo 28 foi commitada enquanto esta trilha rodava. Isso **não** é violação de baseline: a baseline congelada do programa é a tag `legacy-baseline-001` → `c9359be`, e **nenhum arquivo de `src/` mudou** entre `c9359be` e `3eb0b5e` (os commits intermediários são exclusivamente docs de `coretriad`/discovery). O código-fonte auditado por esta trilha é idêntico ao da baseline. O alerta da trilha fica preservado abaixo como evidência de que a verificação de integridade funcionou.

## 0. Alerta de integridade de auditoria (Regra 12/21) — resolver ANTES de persistir

Contradição material sobre o `AUDIT_COMMIT`, três valores distintos:

| Fonte | Valor | Autoridade |
|---|---|---|
| Enunciado da tarefa (contexto injetado) | `f05e865` | reforço, não-normativo (Regra 8/10) |
| `git status` no início da sessão (claudeMd) | `65bd66d` | não-normativo |
| **Disco: `.git/refs/heads/main`** | **`3eb0b5e5a71d43d853b7a7230e318ddbabfe51ba`** | **artefato versionado (Regra 7/12)** |

Auditei o estado em disco (`3eb0b5e`), única fonte autoritativa. Recomendo ao director reconciliar o `AUDIT_COMMIT` antes de fixar esta saída: VeriCore audita um commit imutável e identificado (Regra 12), e nenhum dos números do contexto injetado bate com o disco.

## Legenda de classificação vs. doc
- **CONFIRMED** — comportamento implementado corresponde ao UC/regra documentado.
- **CONFLITANTE** — documentado e implementado divergem (seção do doc × arquivo:linha citados).
- **FANTASMA (doc ausente)** — UC real e alcançável no backend, **sem** UC-ID/requisito documentado correspondente (mandato "comportamento implementado sem UC"). Não confundir com o sentido clássico de "documentado-mas-inexistente": aqui todo UC é real; o fantasma está na documentação.

---

## 1. Módulo `sales` (montado em `app.ts:156` → `/api/sales`)

Autorização provada server-side: `authorizeModule` lê `req.user.permissions`, resolvido do `AccessProfilePermission` do banco a cada request (`auth.ts:105-112, 258`), **não** de body/header/claim de token — sem violação da Regra 24. Curto-circuito de `admin` em `auth.ts:226-229`.

### UC-COMFIN-01 — Registrar Venda
- **Objetivo:** criar venda com itens; se `confirmed`, reservar estoque (G9); nunca gerar recebível na confirmação (G13).
- **Atores:** `vendas`/`operate` — `sales.ts:45`.
- **Gatilho:** `POST /api/sales` — `sales.ts:45` → `saleController.create` (`saleController.ts:97-132`, transação própria :98/:114).
- **Fluxo principal:** `CreateSaleUseCase.execute` — `CreateSaleUseCase.ts:96-195` (cálculo líquido `total_amount = bruto − desconto` :143-160; reserva :178).
- **Alternativos/exceções:** `status:'quote'` não reserva nem valida estoque (:108, :129, :175); produto inativo → `BusinessRuleError` (:122); desconto > total → 422 (:144-146).
- **Pós-condições/invariantes:** `total_amount` líquido; **nenhuma** parcela AR criada (:190-193).
- **BRs:** BR-COM-006, BR-COM-009 (passo 26).
- **Classificação:** **CONFLITANTE.** Doc UC-04 (`04-USE_CASES.md:90-95`) diz que o fluxo alternativo compara estoque **disponível** (`quantity − reserved_quantity`); o código pré-checa saldo **bruto** `product.quantity < qty` (`CreateSaleUseCase.ts:129`). A revalidação correta ocorre dentro de `reserve` (:178), então o efeito é mensagem de erro pior, não furo de saldo (SUB-ACHADO de BR-COM-006). O corpo principal (G9/G13) está CONFIRMED contra UC-04:84-88, 100-133.

### UC-COMFIN-02 — Transicionar status da venda (máquina de estados)
- **Objetivo:** aplicar `VALID_TRANSITIONS`; ao cancelar, liberar reserva/devolver faturado; ao confirmar orçamento, reservar.
- **Atores:** `vendas`/`operate` — `sales.ts:46`.
- **Gatilho:** `PUT /api/sales/:id/status` — `sales.ts:46` → `saleController.updateStatus` (`saleController.ts:144-176`).
- **Fluxo principal:** `ChangeSaleStatusUseCase.ts:120-245` (tabela :12-30; guarda anti-set manual de `invoiced`/`partially_invoiced` :125-132; cancelamento :174-221; `quote→confirmed` reserva :223-239).
- **Exceções:** `shipped` exige `nfe_status==='authorized'` **no instante do embarque** (:159-170); `shipped→canceled` bloqueado com 422 dedicado (:143-150).
- **BRs:** BR-COM-001/002/003/004/006 (passo 26).
- **Classificação:** **CONFIRMED com cobertura documental parcial.** Doc §11/UC-04/UC-27 descreve só 2 das 8 transições (L-2, passo 26); `quote`, `partially_invoiced`, `canceled` existem no código e não na doc formal. Sem divergência de comportamento.

### UC-COMFIN-03 — Alterar itens da venda ("Alteração de pedido")
- **Objetivo:** substituir o conjunto de itens em `quote`/`confirmed`, ajustando reserva pelo delta.
- **Atores:** `vendas`/`operate` — `sales.ts:50`.
- **Gatilho:** `PUT /api/sales/:id/items` — `sales.ts:50` → `saleController.editItems` (`saleController.ts:188-226`).
- **Fluxo principal:** `EditSaleItemsUseCase.ts:67-216` (bloqueio a partir de `partially_invoiced` :73-80; recomputa `total_amount` com desconto :207-212).
- **Exceções:** item com `invoiced_quantity>0` não removível/trocável (:107-118, :171-183).
- **BRs:** BR-COM-007 (passo 26).
- **Classificação:** **FANTASMA (doc ausente).** Regra existe só em `LEVANTAMENTO_ERP_2026-08-02.md` (diagnóstico) e JSDoc; não há UC formal nem seção em BUSINESS_RULES.md/01-USE_CASES.md. Regra real sem requisito.

### UC-COMFIN-04 — Consultar vendas (listar / detalhar)
- **Atores:** `vendas` (view implícito) — `sales.ts:34, 44`.
- **Gatilhos:** `GET /api/sales` (`saleController.ts:48-64`), `GET /api/sales/:id` (:74-86).
- **Classificação:** **CONFIRMED** parcial (UC-07 é relatório em `reports`, não este; leitura básica sem UC próprio). Baixo risco.

### UC-COMFIN-05 — Tabela de preço por cliente (CRUD)
- **Atores:** `vendas` (leitura) / `vendas`+`operate` (escrita) — `sales.ts:39-42`.
- **Gatilhos:** `GET/POST/PUT/DELETE /api/sales/customers/:id/prices[/:priceId]` — `sales.ts:39-42` → `saleController.ts:237-360`.
- **Fluxo:** Create/Update/Deactivate/ListCustomerPriceUseCase.
- **BRs:** BR-COM-008 (preço é sugestão, não trava — nenhum use-case de venda lê a tabela), BR-COM-011 (vigência não sobrepõe).
- **Classificação:** **FANTASMA (doc ausente).** Origem só em gap 1/3 do LEVANTAMENTO; nenhum UC formal define quem fixa preço nem se é vinculante (L-4). Candidato a finding (BR-COM-008, HIGH).

---

## 2. NF-e — módulo `fiscal` (controller invocado direto por `sales.ts`, padrão controller-a-controller confirmado: `sales.ts:5`, `sales.ts:54-60`)

`/api/fiscal` montado em `app.ts:162`, mas só expõe `/config`. Todo o ciclo de NF-e de venda vive sob `/api/sales/:id/nfe*`.

### UC-COMFIN-06 — Emitir NF-e da venda (total ou parcial)
- **Objetivo:** reservar série/número, calcular tributos, chamar provedor, e na autorização baixar estoque (G9) + criar recebível (G13) na quantidade/valor da emissão.
- **Atores:** `vendas`/**`approve`** — `sales.ts:54`. **Provado server-side:** gate `approve` em `auth.ts:272-282` (403 `APPROVAL_LEVEL_REQUIRED`), admin curto-circuita (:226-229).
- **Gatilho:** `POST /api/sales/:id/nfe` — `sales.ts:54` → `fiscalController.issueSaleNfe` (`fiscalController.ts:34-57`, `userId` sempre do JWT :43).
- **Fluxo principal:** `IssueSaleNfeUseCase.ts:105-440` — reserva em transação curta (:106-293), chamada externa fora de transação (:295-347), gravação/baixa/recebível em transação final (:349-439). `totalAmount = Σ(invoiceQty × unit_price)` :213-214; baixa :396-411; recebível :424-431; status :433.
- **Exceções:** status ≠ `confirmed`/`partially_invoiced` → 422 (:113-115); `nfe_status==='processing'` → 409 (:116-118); quantidade > saldo pendente → 422 (:140-145); lote não liberado (gate D-L) → 422 antes de gravar (:168-174); config fiscal incompleta → 422 (:180-185).
- **BRs:** BR-FIS-001/002/003/004/005/006/007/008/009, BR-COM-010 (passo 26).
- **Classificação:** **CONFLITANTE (múltiplas).**
  - Pré-condição: doc UC-41 (`01-USE_CASES.md:879, 888-889, 927-929`) exige status `confirmed` e 409 se NF-e `processing` **ou `authorized`**; código aceita também `partially_invoiced` e dispara 409 **só** por `processing` (`IssueSaleNfeUseCase.ts:113-118`) — BR-FIS-008. Causa: gap 3/3 (faturamento parcial) implementado sem atualizar UC-41.
  - **Desconto não chega à NF-e nem ao recebível** (BR-COM-010): `sale.discount` não é lido em nenhum ponto (grep `discount` em `server/src/modules/fiscal` = 0). Venda de R$1.000 c/ R$200 desconto grava `total_amount=800` (`CreateSaleUseCase.ts:143-160`) e emite NF-e/recebível de R$1.000 (`IssueSaleNfeUseCase.ts:213-214, 424-431`). Candidato a finding **CRITICAL/CONFIRMED**.
  - Tributos: doc `docs/tributario/02-ICMS_ESTADOS.md` × `TaxCalculationService.ts` divergem (ICMS interno 19/27 UFs — BR-FIS-001; IPI doc 10-15% × código 0% no NCM 8518, produto principal — BR-FIS-003). Candidatos CRITICAL.
  - Provedor: fallback silencioso para `mock` produz NF-e "autorizada" falsa com efeitos patrimoniais reais (BR-FIS-009, HIGH).

### UC-COMFIN-07 — Consultar/reconciliar status da NF-e
- **Atores:** `vendas` (view) — `sales.ts:55`.
- **Gatilho:** `GET /api/sales/:id/nfe` — `sales.ts:55` → `fiscalController.getSaleNfeStatus` (`fiscalController.ts:66-72`).
- **Fluxo principal:** `GetSaleNfeStatusUseCase.ts:78-206` — reconsulta o provedor e, se `authorized` de forma assíncrona, aplica a **mesma** baixa (:156-171) e recebível (:185-192) do caminho síncrono. Idempotência por `saleInvoice.nfe_status` (:116).
- **Classificação:** **CONFIRMED** (contra o parágrafo `GET .../nfe` de UC-41:1872-1874); herda BR-COM-010 (o recebível assíncrono usa `sale_invoices.total_amount`, igualmente bruto de desconto :187).

### UC-COMFIN-08 — Cancelar NF-e da venda (D-M: devolve estoque e derruba recebível)
- **Atores:** `vendas`/**`approve`** — `sales.ts:56` (provado server-side, idem UC-06).
- **Gatilho:** `POST /api/sales/:id/nfe/cancel` — `sales.ts:56` → `fiscalController.cancelSaleNfe` (`fiscalController.ts:75-100`).
- **Fluxo principal:** `CancelSaleNfeUseCase.ts:87-291` — provedor cancela (:102), depois transação: devolve estoque da emissão aos mesmos lotes (:206-219), decrementa `invoiced_quantity` (:188-194), regride status (:203, 221-223), cancela parcelas `pending`/`amount_paid=0` da nota (:247-290).
- **Exceções:** justificativa < 15 caracteres → 422 (:88-90, BR-FIS-010); `nfe_status ≠ authorized` → 422 (:94-96); sem snapshot de itens (venda legada) → não devolve estoque, só loga warn (:174-181) — **risco residual** (parcial-cluster, cross-ref TODO.md).
- **BRs:** BR-FIS-010 (CONFIRMED).
- **Classificação:** **CONFIRMED** contra UC-41 (cancelamento restrito a gestor, justificativa 15 chars); regras de estoque/recebível do D-M existem só em JSDoc + PLANO_ACAO (não em UC formal) → cobertura documental parcial.

### UC-COMFIN-09 — Histórico multi-NF-e por venda
- **Atores:** `vendas` (view) — `sales.ts:60`. **Gatilho:** `GET /api/sales/:id/invoices` → `ListSaleInvoicesUseCase` (`fiscalController.ts:107-113`).
- **Classificação:** **FANTASMA (doc ausente).** Origem só em `docs/governance/TODO.md`.

### UC-COMFIN-10 — Configuração fiscal do emitente
- **Atores:** `role='admin'` (via `authorize('admin')`, server-side em `auth.ts:151-165`, lê `user.role` do banco) — `fiscal.ts:14-15`.
- **Gatilhos:** `GET/PUT /api/fiscal/config` → Get/UpsertCompanyFiscalConfigUseCase (`fiscalController.ts:145-173`).
- **Classificação:** **FANTASMA (doc ausente).** Nenhum UC formal para config fiscal; o default `nfe_provider='mock'` da coluna liga-se a BR-FIS-009.

### UC-COMFIN-11 — Webhook de status de NF-e (provedor real)
- **Atores:** não autenticado por JWT; guarda por segredo `FOCUS_NFE_WEBHOOK_SECRET` (`webhookController.ts:52`).
- **Gatilho:** `POST /api/webhooks/focus-nfe` — `webhooks.ts:13` → `webhookController.focusNfeStatusChange` (:51-64) → `HandleNfeStatusWebhookUseCase` (dispara a reconsulta do UC-COMFIN-07, nunca aplica payload direto).
- **Classificação:** **FANTASMA (doc ausente).** Gatilho fora do cluster (módulo `webhooks`), lógica no `fiscal` — registrar fronteira.

> **Nota cross-cluster (não é UC deste cluster):** `RegisterIncomingNfeUseCase` é acionado por `POST /api/purchases/:id/nfe` (`fiscalController.ts:116-142`), cujo gatilho está no módulo `purchases` (cluster procurement). Registrado só para rastreabilidade da fronteira.

---

## 3. Módulo `financial` (montado em `app.ts:161` → `/api/finance`)

### UC-COMFIN-12 — Gerenciar Contas a Pagar (criar / listar)
- **Atores:** `financeiro` (view) / `financeiro`+`operate` (criar) — `finance.ts:34-35`.
- **Gatilhos:** `GET /api/finance/payable` (`financialController.ts:91-101`); `POST /api/finance/payable` (:111-130) → `CreatePayableUseCase.ts:52-66` (nasce `pending`).
- **Classificação:** **CONFIRMED** contra UC-05 (`04-USE_CASES.md:137-152`) no núcleo de criação/listagem.

### UC-COMFIN-13 — Pagar Conta a Pagar (baixa total/parcial)
- **Atores:** `financeiro`+`operate` — `finance.ts:36`.
- **Gatilho:** `PUT /api/finance/payable/:id/pay` → `financialController.payPayable` (`financialController.ts:175-195`).
- **Fluxo principal:** `PayPayableUseCase.ts:39-74` — lock pessimista (:41); acumula `amount_paid` em centavos (:62-68); status `partial`/`paid`; `amount` original nunca sobrescrito.
- **Exceções:** conta `paid`/`canceled` → 422 (:43-44); pagamento > saldo → 422 (:58-60).
- **BRs:** BR-FIN-001 (passo 26).
- **Classificação:** **CONFLITANTE.** Doc UC-05 (`04-USE_CASES.md:149-151`) promete fluxo alternativo "conta vencida → calcula multa/juros automaticamente"; o código **não** implementa juros/multa/desconto (paga sempre valor de face — BR-FIN-001 item 1). **Confirmação da observação de entrada (FIND-ERP-001):** o double-count por **concorrência** ESTÁ prevenido pelo lock (:41); o double-count por **replay/idempotência de request** NÃO está — não há chave de idempotência, dois POSTs válidos acumulam. A lógica é **duplicada verbatim** com `ReceivePaymentUseCase` ("repetido"). Cross-ref FIND-ERP-001 — **não reabrir aqui**, seguir ao passo 31.

### UC-COMFIN-14 — Criar Recebível Avulso (sem venda, decisão D-J)
- **Atores:** `financeiro`+`operate` — `finance.ts:29`.
- **Gatilho:** `POST /api/finance/receivable` → `financialController.createReceivable` (`financialController.ts:147-165`).
- **Fluxo principal:** `CreateReceivableUseCase.ts:83-131` — `sale_id: null` explícito (:120).
- **Exceções (guarda de fronteira G13):** `sale_id` informado → 422 `G13-AR` (:84-89); `status` informado → 422 `G13-AR-PAID` (:91-96).
- **Classificação:** **CONFIRMED.** Casa fielmente com UC-06 fluxo alternativo (`04-USE_CASES.md:167-182`).

### UC-COMFIN-15 — Receber Conta a Receber (baixa total/parcial)
- **Atores:** `financeiro`+`operate` — `finance.ts:30`.
- **Gatilho:** `PUT /api/finance/receivable/:id/pay` → `financialController.receivePayment` (`financialController.ts:61-81`).
- **Fluxo principal:** `ReceivePaymentUseCase.ts:39-74` — espelho exato de PayPayable (lock :41, acúmulo :62-68).
- **Classificação:** **CONFIRMED** contra UC-06:183-184 (baixa parcial acumula em `amount_paid`). Mesma lacuna de idempotência/juros do UC-COMFIN-13 (FIND-ERP-001, BR-FIN-001).

### UC-COMFIN-16 — Fluxo de Caixa e Projeções
- **Atores:** `financeiro` (view; projeção semanal exige `operate` — assimetria em `finance.ts:41`).
- **Gatilhos:** `GET /api/finance/cash-flow` (:40), `/cash-flow-projection` (:41), `/cashflow/projection` (:44) → `financialController.ts:205-255`.
- **Classificação:** **CONFIRMED** contra UC-29 (`04-USE_CASES.md:1489`, projeção). Nota: o nível exigido difere entre as três rotas de projeção (view × operate) sem regra documentada — insumo ao authorization-auditor.

### UC-COMFIN-17 — Centros de Custo (CRUD + relatório + atribuição em títulos)
- **Atores:** `financeiro` (view) / `operate` (escrita) — `finance.ts:31, 37, 50-53`.
- **Gatilhos:** `GET/POST/PUT /api/finance/cost-centers[/:id]`, `/cost-centers/report`, `PUT .../payable|receivable/:id/cost-center` → `costCenterController` / `financialController.ts:266-313`.
- **Classificação:** **FANTASMA (doc ausente).** Origem só em `LEVANTAMENTO_ERP_2026-08-02.md`.

### UC-COMFIN-18 — Conciliação Bancária (importação OFX)
- **Atores:** `financeiro` (view) / `operate` (escrita) — `reconciliation.ts:22-29` (sub-router montado em `finance.ts:59`).
- **Gatilhos:** `POST/GET /api/finance/reconciliation/statements[...]`, `POST /reconciliation/entries/:id/{match,ignore,unmatch}`.
- **Fluxo:** Import/Match/Ignore/Unmatch/GetSuggestions use-cases; regras em `reconciliationRules.ts:16,23` (tolerância 1 centavo, janela ±7 dias).
- **BRs:** BR-FIN-002 (CONFIRMED, valor doc = código).
- **Classificação:** **FANTASMA (doc ausente).** Regra BR-FIN-002 é CONFIRMED, mas não há UC formal; origem em API.md/DATABASE.md, sem UC-ID.

---

## 4. Módulo `accounting` (montado em `app.ts:210` → `/api/accounting`)

`router.use(authenticate)` global (`accounting.ts:30`); todas as rotas `authorizeModule('contabilidade', …)`.

### UC-COMFIN-19 — Plano de Contas (CRUD sem delete físico)
- **Atores:** `contabilidade` (view) / `operate` (escrita) — `accounting.ts:33-36`.
- **Gatilhos:** `GET/POST/PUT /api/accounting/accounts[/:id]` → `chartOfAccountsController`.
- **Classificação:** **FANTASMA (doc ausente).**

### UC-COMFIN-20 — Lançamentos Contábeis (draft → post / reverse)
- **Atores:** `contabilidade`/`operate` (criar/editar draft); `contabilidade`/**`approve`** (post/reverse) — `accounting.ts:41-44` (provado server-side).
- **Gatilhos:** `POST/PUT /api/accounting/entries[/:id]`; `PATCH .../:id/post`; `PATCH .../:id/reverse`.
- **Fluxo principal:** `PostEntryUseCase.ts:44-91` (partida dobrada em centavos :74-82); `ReverseEntryUseCase.ts:42-89` (estorno append-only, inverte débito/crédito :74-78, marca original `reversed` :81).
- **BRs:** BR-CTB-001 (autoridade sem condições de negócio), BR-CTB-002 (partida dobrada CONFIRMED).
- **Classificação:** **FANTASMA (doc ausente)** + **candidato a finding.** Nenhum requisito versionado define quem/quando estorna. **Sem segregação de funções:** um mesmo usuário `approve` posta gravando `approved_by: userId` (`PostEntryUseCase.ts:84-88`) e estorna nascendo `created_by`+`approved_by`+`approved_at` do próprio usuário (`ReverseEntryUseCase.ts:63-66`) — BR-CTB-001 (HIGH). Imutabilidade/append-only = FIND-ERP-002 (não reabrir).

### UC-COMFIN-21 — Balancete (Trial Balance)
- **Atores:** `contabilidade` (view) — `accounting.ts:47`. **Gatilho:** `GET /api/accounting/trial-balance` → `GetTrialBalanceUseCase`.
- **Classificação:** **FANTASMA (doc ausente).**

---

## 5. Módulo `budget` / Controladoria (montado em `app.ts:212` → `/api/budget`)

### UC-COMFIN-22 — Linhas de Orçamento (CRUD c/ DELETE físico) + Orçado × Realizado
- **Atores:** `controladoria` (view) / `operate` (escrita, inclusive delete) — `budget.ts:35-42`. **Sem nível `approve`** por design (`budget.ts:17-21`).
- **Gatilhos:** `GET/POST/PUT/DELETE /api/budget/lines[/:id]`; `GET /api/budget/report`.
- **BRs:** BR-CTR-001 (passo 26).
- **Classificação:** **FANTASMA (doc ausente)** + **candidato a finding (HIGH).** Orçamento não restringe gasto nenhum (relatório é informativo, `GetBudgetVsActualReportUseCase.ts:92-96`); sem limite, sem aprovador, DELETE físico sem trava (`DeleteBudgetLineUseCase.ts:27-33`). Nenhum UC/requisito de origem.

---

## 6. Módulo `treasury` / Tesouraria (montado em `app.ts:211` → `/api/treasury`)

### UC-COMFIN-23 — Contas Bancárias (CRUD, saldo manual)
- **Atores:** `tesouraria` (view) / `operate` (escrita) — `treasury.ts:38-41`.
- **Gatilhos:** `GET/POST/PUT /api/treasury/bank-accounts[/:id]` → `bankAccountController`.
- **Classificação:** **FANTASMA (doc ausente).**

### UC-COMFIN-24 — Operações Financeiras (CRUD + settle + cancel)
- **Atores:** `tesouraria`/`operate` (CRUD); `tesouraria`/**`approve`** (settle/cancel) — `treasury.ts:46-49` (provado server-side).
- **Gatilhos:** `POST/PUT /api/treasury/financial-operations[/:id]`; `PATCH .../:id/settle`; `PATCH .../:id/cancel`.
- **Fluxo principal:** `SettleOperationUseCase.ts:30-44` (exige `active`, grava `settled_at`); `CancelOperationUseCase.ts:33-43` (exige `active`, só muda status).
- **BRs:** BR-TES-001 (passo 26).
- **Classificação:** **FANTASMA (doc ausente)** + lacunas. `settle`/`cancel` **não produzem efeito de caixa nem contábil** — liquidar operação de R$1M não move um centavo no sistema (BR-TES-001 lacuna 1); `settled_at` sem validação cruzada de data; `cancel` sem justificativa (contraste com BR-FIS-010).

### UC-COMFIN-25 — Posição de Caixa (relatório)
- **Atores:** `tesouraria` (view) — `treasury.ts:52`. **Gatilho:** `GET /api/treasury/cash-position` → `GetCashPositionUseCase`.
- **Classificação:** **FANTASMA (doc ausente).**

---

## 7. Módulo `serviceOrders` / Comercial (montado em `app.ts:164` → `/api/service-orders`)

### UC-COMFIN-26 — Ordem de Serviço (criar / atualizar / cancelar)
- **Atores:** `garantia` (view) / `operate` (criar/atualizar) / **`approve`** (remover) — `serviceOrders.ts:19-23`.
- **Gatilhos:** `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` → `serviceOrderController.ts:19-71`.
- **Fluxo principal:** `CreateServiceOrderUseCase.ts:36-57` (`order_number = 'OS-'+Date.now()` :45, status `open`); `UpdateServiceOrderUseCase` (status é campo livre); `CancelServiceOrderUseCase.ts:25-31` (seta `status:'canceled'` **sem pré-condição**).
- **Exceções:** create sem `client_id` → 422 (:40-42); update de OS inexistente → 404.
- **BRs:** BR-COM-012 (sem máquina de estados), BR-COM-013 (numeração por timestamp).
- **Classificação:** **FANTASMA (doc ausente)** + **candidato a finding (HIGH).** Nenhuma seção de BUSINESS_RULES.md e nenhum UC cobre OS. Sem enum/validador Zod/tabela de transições; `DELETE` cancela OS já `completed`/`delivered` sem checar status; `labor_cost`/`total_amount` livres e **não geram recebível** — serviço prestado não vira cobrança. Contraste direto com a venda (mesmo domínio Comercial, ciclos de vida incompatíveis).

---

## 8. OBSOLETE_CANDIDATE

### OBS-COMFIN-01 — Cobrança CNAB 240 (remessa/retorno) — rota órfã, dead code
- **Evidência:** `financial/presentation/routes/cnab.ts` existe e declara em seu docstring (`cnab.ts:13-15`) estar "Montado como sub-router em `finance.ts` sob `/cnab`". **Falso:** `finance.ts:6, 59` só faz `require('./reconciliation')` e monta `/reconciliation`; **não há** `require('./cnab')` em lugar nenhum (Grep em `server` por `routes/cnab`/`require('./cnab')` = 0 ocorrências; os únicos requires de `cnab*` são utilitários de `infrastructure/cnab/`). Confirmado que **não existe** diretório `server/src/modules/cnab/` (Glob = vazio) — CNAB vive dentro de `financial`, não é módulo top-level.
- **Impacto:** toda a superfície HTTP de CNAB (`/banking-config`, `/remittances`, `/returns` — `cnab.ts:22-31`) é **inalcançável**, apesar de controller (`cnabController.ts`), use-cases (Generate/Get/List Remittance, ProcessReturnFile, Upsert/GetBankingConfig), repositório e 5 models existirem. Drift interno agrava: `treasury.ts:11-13` afirma que CNAB "já existe, real e funcional" — comentário falso.
- **Ressalva de fronteira:** a rota está montada 0×; classifico como **OBSOLETE_CANDIDATE** (dead route), **não** invento UC ativo. Decisão (ativar × remover) é humana. Candidato a finding de código-morto/documentação-mentirosa; segue ao passo 31.

---

## 9. Contagem por classificação e candidatos a finding

**UCs recuperados (26 ativos + 1 obsoleto):**

| Classificação | Qtde | UCs |
|---|---|---|
| CONFIRMED | 6 | 02, 04, 07, 08, 12, 14, 15, 16 (núcleo) |
| CONFLITANTE | 4 | 01, 06, 13 (+ 07 herda BR-COM-010) |
| FANTASMA (doc ausente) | 16 | 03, 05, 09, 10, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 |
| OBSOLETE_CANDIDATE | 1 | OBS-COMFIN-01 (CNAB) |

> Observação: alguns UCs têm dupla natureza (ex.: 06 CONFIRMED no gate de permissão, CONFLITANTE no desconto/pré-condição). A tabela conta pela classificação dominante; o detalhe por-UC está nas seções.

**Candidatos a finding (NÃO promovidos — seguem até o passo 31, com arquivo:linha dos dois lados):**

| # | Descrição | Severidade candidata / confiança | Âncora |
|---|---|---|---|
| C-1 | Desconto do pedido não chega à NF-e nem ao recebível (3 valores para o mesmo negócio) | CRITICAL / CONFIRMED | UC-COMFIN-06; BR-COM-010; `CreateSaleUseCase.ts:143-160` × `IssueSaleNfeUseCase.ts:213-214, 424-431` |
| C-2 | ICMS interno diverge em 19/27 UFs (doc × código) | CRITICAL / CONFIRMED | BR-FIS-001; `TaxCalculationService.ts:55-59` × `02-ICMS_ESTADOS.md:9-35` |
| C-3 | IPI documentado 10-15%, implementado 0% no NCM 8518 (produto principal) | CRITICAL / CONFIRMED | BR-FIS-003; `TaxCalculationService.ts:119-124` |
| C-4 | Provedor NF-e: fallback silencioso p/ `mock` c/ efeitos patrimoniais reais; default de coluna = `mock` | HIGH / CONFIRMED | BR-FIS-009; `NfeProviderFactory.ts:16-26`; `CompanyFiscalConfig.ts:60` |
| C-5 | CNAB: rota órfã inalcançável + docstring/`treasury.ts` afirmando "montado/funcional" | MEDIUM / CONFIRMED | OBS-COMFIN-01; `cnab.ts:13-15` × `finance.ts:6,59` |
| C-6 | OS sem máquina de estados; cancela OS concluída; serviço não gera cobrança | HIGH / CONFIRMED | BR-COM-012; `CancelServiceOrderUseCase.ts:25-31` |
| C-7 | Orçamento não restringe gasto, sem alçada, DELETE físico sem trava | HIGH / CONFIRMED | BR-CTR-001; `budget.ts:17-21`; `DeleteBudgetLineUseCase.ts:27-33` |
| C-8 | Estorno contábil sem segregação de funções (posta/estorna/aprova o mesmo usuário) | HIGH / CONFIRMED | BR-CTB-001; `PostEntryUseCase.ts:84-88`; `ReverseEntryUseCase.ts:63-66` |
| C-9 | Tabela de preço por cliente não é vinculante (nenhum use-case de venda a lê) | HIGH / CONFIRMED | BR-COM-008; ausência em `CreateSaleUseCase.ts:113-141` |
| C-10 | Baixa parcial AP/AR sem idempotência de request (replay double-count) e sem juros/multa | MEDIUM / CONFIRMED | BR-FIN-001; `PayPayableUseCase.ts:39-74`; **cross-ref FIND-ERP-001, não reabrir** |
| C-11 | Permissão de NF-e: "dupla trava" documentada (§11/UC-41 de `01-USE_CASES.md`) inexistente no código | MEDIUM / CONFIRMED | BR-COM-005; `01-USE_CASES.md:967` × `auth.ts:272-282` (fronteira c/ authorization-auditor via director) |
| C-12 | `settle`/`cancel` de operação financeira sem efeito de caixa/contábil | MEDIUM / CONFIRMED | BR-TES-001; `SettleOperationUseCase.ts:39-43` |

**Divergência de fronteira de permissão (C-11):** a permissão **declarada** no UC-41 (`01-USE_CASES.md` cenário Gherkin "Operador de Vendas tenta emitir NF-e", §11 "segunda trava de nível de usuário") NÃO existe no backend — há **uma** trava (`authorizeModule('vendas','approve')`, `auth.ts:272-282`) e não a dupla trava documentada. Já a versão consolidada em `04-USE_CASES.md:1866-1894` (ator = `approve` **ou admin**) **casa** com o código. Ou seja, os dois artefatos de doc contradizem entre si; o código segue o `04`. A matriz USER→ROLE→PERMISSION completa é do authorization-auditor — reporto só a permissão declarada-no-UC × imposta-no-backend, coordenar via director.

---

## 10. Ressalvas de método

- Tudo acima é `DISCOVERED_USE_CASE` até validação humana (Regra 4). Nenhum número foi citado de contexto injetado sem releitura em disco; onde a fonte é o insumo do passo 26 (`BUSINESS_RULE_CANDIDATES_comercial-financeiro.md`), está marcado "(passo 26)" — as linhas de use-case de accounting/treasury e todos os arquivos de rota/controller/use-case centrais foram lidos em primeira mão neste passo.
- Não promovi nenhum candidato a finding; CRITICAL/HIGH devem passar pelo `vericore-finding-validator`, e a persistência de evidência é do `vericore-audit-evidence-controller` em `audit/`.
- Read-only reforçado mantido: nenhum comando, teste ou consulta de banco executado.

**Critério de conclusão atendido:** cada UC em escopo tem veredito por campo mínimo (ID, atores, gatilho, fluxos, pré/pós, BRs) e por fluxo (principal/alternativo/exceção), com evidência de implementação (arquivo:linha) ou lacuna documental explícita. Insumo pronto para `vericore-acceptance-criteria-auditor` e `vericore-traceability-auditor`.
