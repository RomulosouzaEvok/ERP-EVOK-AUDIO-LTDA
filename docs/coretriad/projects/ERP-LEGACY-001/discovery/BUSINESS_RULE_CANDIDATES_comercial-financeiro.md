# BUSINESS_RULE_CANDIDATES_comercial-financeiro.md — ERP-LEGACY-001, Passo 26

```
PROJECT_ID: ERP-LEGACY-001
DOMÍNIOS: D7 Comercial (sales, serviceOrders) + D8 Financeiro & Fiscal
          (financial, accounting, budget, treasury, fiscal)
MÉTODO: Read/Grep/Glob apenas. Nenhum comando executado, nenhuma conexão de banco,
        nenhum teste rodado. Toda afirmação de "implementado" tem arquivo:linha.
NÃO REPETE: FIND-ERP-001 (idempotência) e FIND-ERP-002 (imutabilidade de NF-e/lançamento).
REGRA 2: documentação NÃO foi presumida correta. Onde doc e código divergem, ambos os
        lados estão citados e a regra fica CONFLICTING — a decisão é do responsável humano.
```

## 0. Sumário — 24 regras candidatas

| BR-ID | Regra | Status | Severidade candidata |
|---|---|---|---|
| BR-COM-001 | Máquina de estados da venda | CONFIRMED | INFO |
| BR-COM-002 | `invoiced`/`partially_invoiced` não setáveis manualmente | CONFIRMED | INFO |
| BR-COM-003 | `shipped` exige `nfe_status='authorized'` | CONFIRMED | INFO |
| BR-COM-004 | `shipped` é terminal e não cancelável | CONFIRMED | INFO |
| BR-COM-005 | Nível de permissão p/ NF-e ("dupla trava") | **CONFLICTING** | MEDIUM |
| BR-COM-006 | Confirmação reserva estoque; não gera recebível (G9/G13) | CONFIRMED | INFO |
| BR-COM-007 | Edição de itens só em `quote`/`confirmed` | CONFIRMED | INFO |
| BR-COM-008 | Tabela de preço por cliente é sugestão, não trava | DISCOVERED | HIGH |
| BR-COM-009 | Não existe limite de desconto | DISCOVERED | HIGH |
| BR-COM-010 | **Desconto não chega à NF-e nem ao recebível** | DISCOVERED | **CRITICAL** |
| BR-COM-011 | Vigência de preço não pode sobrepor | CONFIRMED | INFO |
| BR-COM-012 | Ordem de Serviço não tem máquina de estados | DISCOVERED | HIGH |
| BR-COM-013 | `order_number` da OS = `OS-${Date.now()}` | DISCOVERED | MEDIUM |
| BR-FIS-001 | **Alíquota interna de ICMS por UF** | **CONFLICTING** | **CRITICAL** |
| BR-FIS-002 | Alíquota interestadual de ICMS | **CONFLICTING** | HIGH |
| BR-FIS-003 | **IPI por NCM (cap. 8518)** | **CONFLICTING** | **CRITICAL** |
| BR-FIS-004 | DIFAL para consumidor final | **CONFLICTING** | HIGH |
| BR-FIS-005 | ICMS-ST para NCM 8518 | **CONFLICTING** | HIGH |
| BR-FIS-006 | CFOP de saída | CONFLICTING | MEDIUM |
| BR-FIS-007 | PIS/COFINS por regime (CRT) | CONFIRMED | INFO |
| BR-FIS-008 | Pré-condição de faturamento | CONFLICTING | MEDIUM |
| BR-FIS-009 | Provedor NF-e: fallback silencioso p/ mock | DISCOVERED | HIGH |
| BR-FIS-010 | Justificativa de cancelamento ≥ 15 caracteres | CONFIRMED | INFO |
| BR-CTB-001 | Estorno: quem pode e em que condições | DISCOVERED | HIGH |
| BR-CTB-002 | Partida dobrada exigida ao postar | CONFIRMED | INFO |
| BR-CTR-001 | Orçamento sem limite, sem aprovador, DELETE sem trava | DISCOVERED | HIGH |
| BR-TES-001 | `settle`/`cancel` de operação financeira | CONFIRMED (c/ lacuna) | MEDIUM |
| BR-FIN-001 | Baixa parcial; sem juros/multa | DISCOVERED | MEDIUM |
| BR-FIN-002 | Conciliação: tolerância 1 centavo, janela ±7 dias | CONFIRMED | INFO |

---

## 1. Comercial — `sales`

### BR-COM-001 — Máquina de estados da venda
```
DESCRIPTION: quote→{confirmed,canceled}; confirmed→{invoiced,canceled};
  partially_invoiced→{invoiced,canceled}; invoiced→{shipped,canceled}; shipped→{}; canceled→{}.
  `partially_invoiced` NÃO permite ir direto a `shipped`.
ORIGIN: BUSINESS_RULES.md §11; 01-USE_CASES.md UC-41
OWNER: NÃO DETERMINADO — §11 registra "DECIDIDO (2026-08-03)" sem nomear responsável (L-1)
IMPLEMENTATION: sales/application/use-cases/ChangeSaleStatusUseCase.ts:12-30 (tabela), :152-157
RELATED_PERMISSIONS: authorizeModule('vendas','operate') — sales.ts:46
RELATED_TESTS: change-sale-status-partially-invoiced.test.ts; sale-quote-confirm.test.ts
STATUS: CONFIRMED — doc §11 é mais pobre que o código (só descreve confirmed→invoiced e
  invoiced→shipped); `quote`, `partially_invoiced` e `canceled` existem no código e NÃO na
  doc → cobertura documental parcial (L-2), não divergência.
```

### BR-COM-002 — `invoiced`/`partially_invoiced` são efeito da NF-e
```
DESCRIPTION: PUT /api/sales/:id/status rejeita (422) tentativa de setar `invoiced` ou
  `partially_invoiced` — só IssueSaleNfeUseCase os define.
ORIGIN: BUSINESS_RULES.md §11 (311-314)  |  IMPLEMENTATION: ChangeSaleStatusUseCase.ts:125-132
STATUS: CONFIRMED. Observação: o schema Zod (saleValidators.ts:40-42) ACEITA os dois valores
  por simetria; o bloqueio é 100% no use case. Duas camadas com regras diferentes para o
  mesmo campo — divergência de local de guarda (registrado para o traceability-auditor).
```

### BR-COM-003 — Embarque exige NF-e autorizada no instante do embarque
```
DESCRIPTION: A transição para `shipped` exige `sale.nfe_status === 'authorized'` ALÉM da
  máquina de estados — porque a NF-e pode ser cancelada depois de a venda virar `invoiced`,
  sem reverter `sale.status`.
ORIGIN: BUSINESS_RULES.md §11:315-316; UC-27; §13.5 item 3
IMPLEMENTATION: ChangeSaleStatusUseCase.ts:159-170
RELATED_PERMISSIONS: `vendas`/`operate` — MAS a doc (sales.ts:25-31) registra pendência:
  `shipped` deveria ser do módulo `expedicao`. Pendência ainda ABERTA.
RELATED_TESTS: nenhum teste exercita `invoiced→shipped` com nfe_status='cancelled' ← L-3
STATUS: CONFIRMED (regra), com lacuna de teste no caminho de exceção — que é justamente o
  caminho que motivou a regra existir.
```

### BR-COM-004 — `shipped` é terminal
```
IMPLEMENTATION: ChangeSaleStatusUseCase.ts:28 (shipped: []), :143-150 (mensagem dedicada)
STATUS: CONFIRMED — doc e código idênticos, inclusive na justificativa ("exige ação
  logística manual fora do sistema").
```

### BR-COM-005 — ⚠ Nível de permissão para NF-e: a "dupla trava" documentada não existe
```
DESCRIPTION (DOCUMENTADO): emitir e cancelar NF-e exigem DUAS condições cumulativas:
  (a) módulo `vendas` com nível `A`/aprovar E (b) `nivel = gestor` do USUÁRIO. "Um operador
  de vendas comum não emite nem cancela NF-e, MESMO QUE o módulo do perfil permita A — a
  segunda trava de nível de usuário sempre se aplica."
DESCRIPTION (IMPLEMENTADO): existe UMA trava só. `authorizeModule` decidiu que "o nível
  gestor/operador NÃO mora em coluna própria do usuário — mora no perfil".
ORIGIN: BUSINESS_RULES.md §11:320-327; UC-41:931-938 e cenários Gherkin 961-974
OWNER: doc diz "DECIDIDO (2026-08-03)"; o código diz "orientação direta do orquestrador para
  esta entrega" — DOIS donos diferentes para a mesma regra, nenhum nomeado.
EXCEPTIONS (código, não documentada em §11): role==='admin' curto-circuita (auth.ts:226-229)
IMPLEMENTATION: middlewares/auth.ts:175-200, :213-229, :272-280; sales.ts:54,56
RELATED_TESTS: sales-nfe-rbac.test.ts
STATUS: CONFLICTING. A "segunda trava" documentada em dois artefatos versionados (§11 e
  UC-41, com cenário Gherkin explícito "Operador de Vendas tenta emitir NF-e") NÃO existe no
  código. A decisão que a removeu vive apenas em comentário JSDoc, sem registro de aprovação
  humana — viola Regra 16/17.
```

### BR-COM-006 — Confirmação reserva estoque e NÃO gera recebível (G9/G13)
```
DESCRIPTION: quote→confirmed reserva (`InventoryService.reserve`) sem baixar
  `products.quantity`, e não cria parcela em AccountReceivable. A baixa e o recebível nascem
  na autorização da NF-e.
ORIGIN: PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md §4, decisões D-A do dono (gaps G9 e G13);
  base normativa CPC 47 itens 31/38/108 e Ajuste SINIEF 07/05 cláusulas 1ª §1º e 9ª §1º.
OWNER: "o dono" (decisão D-A) — único caso deste domínio com owner nomeado
VALIDITY: desde 2026-08-10
EXCEPTIONS: venda legada com parcela sem `invoice_number` → nenhum recebível novo
  (`reason: 'legacy_created_on_confirmation'`)
IMPLEMENTATION: ChangeSaleStatusUseCase.ts:223-239; CreateSaleUseCase.ts:169-193;
  services/saleReceivableService.ts:203-208
RELATED_TESTS: sale-receivable-na-nfe-g13.test.ts; sale-stock-baixa-na-nfe-g9.test.ts
STATUS: CONFIRMED — regra com origem, base normativa citada, implementação e teste. É o
  melhor exemplo de rastreabilidade do domínio inteiro.
SUB-ACHADO (DISCOVERED): a pré-checagem de estoque em CreateSaleUseCase.ts:129 usa
  `product.quantity < qty` — saldo BRUTO, sem descontar `reserved_quantity`. A revalidação
  correta acontece dentro de `InventoryService.reserve` (:178), então o efeito é uma mensagem
  de erro pior, não um furo de saldo. Divergência de critério entre duas checagens da MESMA regra.
```

### BR-COM-007 — Itens só alteráveis em `quote`/`confirmed`
```
IMPLEMENTATION: EditSaleItemsUseCase.ts:73-80, :107-118 (invoiced_quantity>0 não remove)
RELATED_TESTS: edit-sale-items.test.ts
STATUS: CONFIRMED — porém a regra existe apenas em documento de LEVANTAMENTO (diagnóstico) e
  em JSDoc; não aparece em BUSINESS_RULES.md nem em 01-USE_CASES.md. Regra real sem
  requisito formal correspondente.
```

### BR-COM-008 — Tabela de preço por cliente é SUGESTÃO, não é preço aplicado
```
DESCRIPTION: `/api/sales/customers/:id/prices` mantém preço por par cliente×produto com
  vigência. Mas nenhum use case de venda lê essa tabela: "Não impõe que a venda use
  exatamente este preço — o vendedor sempre pode sobrescrever `unit_price` manualmente
  (CreateSaleUseCase/EditSaleItemsUseCase NÃO leem esta tabela; a sugestão acontece no frontend)."
ORIGIN: gap 1/3 (LEVANTAMENTO_ERP_2026-08-02.md). NENHUM requisito define quem define o
  preço, nem se ele é vinculante.
OWNER: NÃO DETERMINADO (L-4)  |  PRIORITY: alta
CONDITIONS: quem tem `vendas`/`operate` cria/edita/desativa preço de qualquer cliente
  (sales.ts:40-42) — mesmo nível de quem cria a venda. Não há alçada separada entre "definir
  tabela de preço" e "vender".
IMPLEMENTATION: CreateCustomerPriceUseCase.ts:4-13 (JSDoc que declara a não-vinculação);
  ausência confirmada: CreateSaleUseCase.ts:113-141 e EditSaleItemsUseCase não consultam preço
RELATED_TESTS: customer-price-list.test.ts (só listagem)
STATUS: DISCOVERED. A regra "existe uma tabela de preço" está implementada; a regra "qual
  preço vale numa venda" NÃO EXISTE no backend — é decidida pelo frontend e sobrescrevível
  pelo operador. Um preço de tabela pode ser R$ 100 e a venda sair a R$ 1,00 sem erro,
  alerta ou log de exceção.
```

### BR-COM-009 — Não existe limite de desconto
```
DESCRIPTION (documentado): NÃO EXISTE. Grep por `desconto|discount|tabela de pre|
  customer_price` em BUSINESS_RULES.md → zero ocorrências.
DESCRIPTION (implementado): desconto aceita qualquer valor ≥ 0, limitado APENAS pelo total
  bruto. Sem percentual máximo, sem alçada, sem aprovação de gestor, sem registro de exceção.
ORIGIN: NENHUMA — regra existe só no código  |  OWNER: NÃO DETERMINADO (L-4)  |  PRIORITY: alta
CONDITIONS: discount ≥ 0 (SaleEntity.ts:65-68, saleValidators.ts:25); discountCents ≤
  totalCents (CreateSaleUseCase.ts:143-146) → **100% de desconto é aceito**, venda de valor
  líquido zero é criável por qualquer usuário com `vendas`/`operate`.
RELATED_TESTS: sales-validators.test.ts (só forma)
STATUS: DISCOVERED — regra de negócio ausente, não divergente. Cabe ao responsável humano
  decidir se "sem limite" é a política pretendida (Regra 20-21).
```

### BR-COM-010 — ⚠⚠ Desconto do pedido não chega à NF-e nem ao recebível
```
DESCRIPTION: `Sale.total_amount` é gravado LÍQUIDO (bruto − desconto). Mas a NF-e e a conta
  a receber são montadas somando `quantidade × unit_price` item a item, sem nenhuma
  referência a `sale.discount`.
ORIGIN: nenhuma regra documentada define o tratamento do desconto no faturamento. LACUNA.
OWNER: NÃO DETERMINADO  |  PRIORITY: crítica
IMPLEMENTATION (venda): CreateSaleUseCase.ts:143-160 — `total_amount: totalNet` (líquido),
  `discount: fromCents(discountCents)`
IMPLEMENTATION (NF-e): IssueSaleNfeUseCase.ts:202,213-214 — `totalAmount += invoiceTotal`
  onde `invoiceTotal = invoiceQty × unitPrice`; tributos sobre `total_price` bruto (:216-226)
IMPLEMENTATION (recebível): IssueSaleNfeUseCase.ts:424-431 → `invoiceTotal:
  reserved.totalAmount`; services/saleReceivableService.ts:200,215
EVIDÊNCIA NEGATIVA: `Grep "discount"` em server/src/modules/fiscal → 0 ocorrências;
  em server/src/services → 0 ocorrências.
RELATED_TESTS: nenhum teste cobre venda com desconto + emissão de NF-e ← LACUNA
STATUS: DISCOVERED / candidato a finding CRITICAL, confiança CONFIRMED.
```
**Consequência direta:** uma venda de R$ 1.000 com R$ 200 de desconto grava
`total_amount = 800`, emite **NF-e de R$ 1.000**, calcula ICMS/PIS/COFINS sobre R$ 1.000 e
**cobra R$ 1.000 do cliente**. Três valores para o mesmo negócio (venda 800, nota 1.000,
cobrança 1.000). Não se afirma qual está certo — reporta-se a divergência.

### BR-COM-011 — Vigência de preço não pode sobrepor
```
DESCRIPTION: já existindo preço ATIVO do par cliente×produto com vigência sobreposta → 409.
  `valid_until < valid_from` → 422.
IMPLEMENTATION: CreateCustomerPriceUseCase.ts:56-65, :92-105 (comparação em memória)
STATUS: CONFIRMED (implementado), sem documento de origem. `null` é tratado como "infinito"
  nos dois lados (:101-102), então dois preços sem vigência definida sempre colidem —
  comportamento correto mas não documentado.
```

## 2. Comercial — `serviceOrders`

### BR-COM-012 — ⚠ OS sem máquina de estados
```
DESCRIPTION (esperado por simetria com a venda): transições controladas
  (open → in_progress → completed → delivered / canceled).
DESCRIPTION (implementado): NÃO EXISTE máquina de estados. `status` é campo livre da lista
  ALLOWED_FIELDS, gravado direto do body. Não há enum, não há validador Zod para o módulo
  (nenhum `serviceOrders/presentation/validators/` existe — confirmado por Glob), não há
  tabela de transições, não há checagem de status anterior.
ORIGIN: NENHUMA. Nenhuma seção de BUSINESS_RULES.md e nenhum UC cobre OS.
OWNER: NÃO DETERMINADO (L-5)  |  PRIORITY: alta
CONDITIONS: PUT aceita qualquer string em `status`. DELETE apenas seta `status:'canceled'` —
  sem verificar o status atual: uma OS já `completed`/`delivered` pode ser "cancelada" a
  qualquer momento por quem tem `garantia`/`approve`.
EXCEPTIONS: única regra derivada — `status === 'completed'` preenche `completion_date`.
IMPLEMENTATION: UpdateServiceOrderUseCase.ts:11-24, :46-51;
  CancelServiceOrderUseCase.ts:25-31 (nenhuma pré-condição); serviceOrders.ts:19-23
RELATED_TESTS: serviceOrders-use-cases.test.ts
STATUS: DISCOVERED
```
**Contraste direto com BR-COM-001:** dois módulos do MESMO domínio (Comercial) tratam ciclo
de vida de forma incompatível — um com máquina de estados + lock + trava fiscal, outro com
campo texto livre. Também: `labor_cost`/`total_amount` são editáveis livremente e **não geram
nenhuma conta a receber** (nenhuma referência a AccountReceivable no módulo) — serviço
prestado não vira cobrança pelo sistema.

### BR-COM-013 — Numeração da OS
```
DESCRIPTION: `order_number = 'OS-' + Date.now()` — timestamp em ms, não sequencial, sem
  verificação de unicidade na aplicação.
IMPLEMENTATION: CreateServiceOrderUseCase.ts:45
STATUS: DISCOVERED. Duas OS criadas no mesmo milissegundo produzem o mesmo número. Não
  confirmado se existe UNIQUE em `service_orders.order_number` (L-6).
```

## 3. Fiscal — cálculo de tributo

### BR-FIS-001 — ⚠⚠ Alíquota interna de ICMS: 19 das 27 UFs divergem
```
DOCUMENTADO: tabela de 27 UFs em docs/tributario/02-ICMS_ESTADOS.md:9-35 ("Alíquotas
  Internas de ICMS por UF (2024)")
IMPLEMENTADO: tabela `ICMS_INTERNAL_RATE` em TaxCalculationService.ts:55-59
OWNER: NÃO DETERMINADO — o doc não tem autor, data de vigência (diz "2024") nem responsável
  tributário nomeado (L-7)  |  PRIORITY: crítica
```
**CONFRONTO VALOR A VALOR:**

| UF | Doc | Código | | UF | Doc | Código |
|---|---|---|---|---|---|---|
|AC | 17 | **19** | |PB | 18 | **20** |
|AL | 17 | **19** | |PR | 18 | **19** |
|AP | 18 | 18 ok | |PE | 18 | **20,5** |
|AM | 18 | **20** | |PI | 18 | **21** |
|BA | 18 | **19** | |RJ | 18 | **20** |
|CE | 18 | **20** | |RN | 18 | 18 ok |
|DF | 18 | **20** | |RS | 18 | **17** ← código MENOR |
|ES | 17 | 17 ok | |RO | 17,5| **19,5** |
|GO | 17 | **19** | |RR | 17 | **20** |
|MA | 18 | **20** | |SC | 17 | 17 ok |
|MT | 17 | 17 ok | |SP | 18 | 18 ok |
|MS | 17 | 17 ok | |SE | 18 | **19** |
|MG | 18 | 18 ok | |TO | 18 | **20** |
|PA | 17 | **19** | | | | |

**19 das 27 UFs divergem.** 8 conferem (AP, ES, MT, MS, MG, RN, SC, SP). Em 18 casos o código
tributa MAIS que o documento; em 1 caso (RS) tributa MENOS.
```
EXCEPTIONS (implementadas, não documentadas): CRT=1 (Simples) → alíquota 0 e CSOSN 102;
  `client.ind_ie === '2'` → alíquota 0 e CST 40; UF ausente do mapa → fallback silencioso
  18% (`?? 18`, :114).
IMPLEMENTATION: TaxCalculationService.ts:55-59, :101-117
RELATED_TESTS: tax-calculation-service.test.ts — cobre APENAS SP (:8,13). Nenhuma das 19 UFs
  divergentes é testada ← LACUNA em regra crítica.
STATUS: CONFLICTING — BUSINESS RULE CONFORMANCE (Master Spec §19). CRITICAL/CONFIRMED.
```
O próprio código se declara "SIMPLIFICAÇÃO IMPORTANTE... NÃO substitui a validação de um
contador/tributarista" (:5-11) e aponta `docs/tributario/` como documentação — ou seja, **o
código aponta como fonte autoritativa exatamente o documento do qual diverge em 19 de 27
linhas.**

### BR-FIS-002 — ⚠ Alíquota interestadual: o documento contradiz a si mesmo
```
DOC versão A ("Regra Geral", :40-42): SP → Sul/Sudeste exceto ES = 12%; SP → Norte,
  Nordeste, CO **e ES** = 7%.
DOC versão B (tabela :15-20 e resumo :142): SP→DF 12%, SP→GO 12%, SP→MT 12%, SP→MS 12%,
  SP→ES 12%; "Centro-Oeste (DF, GO, MT, MS): 12%".
CÓDIGO: origem ∈ {SP,RJ,MG,PR,SC,RS} → destino no mesmo conjunto = 12%, senão 7%; origem
  fora do conjunto = 12% sempre. Logo Centro-Oeste e ES recebem **7%**.
EXCEPTIONS: produto importado (4%) e exportação (0%, doc :42) NÃO estão implementados —
  declarado na :68: "não considera produtos importados (4%)".
IMPLEMENTATION: TaxCalculationService.ts:63, :69-74, :112-113
RELATED_TESTS: tax-calculation-service.test.ts:17-34 — o teste consagra a versão A do doc.
STATUS: CONFLICTING. O documento diverge de si mesmo e o código segue a versão A. Não há
  como determinar a fonte autoritativa dentro do repositório → L-8, escalar. HIGH.
```

### BR-FIS-003 — ⚠⚠ IPI documentado 10%/15%, implementado 0%
```
DOCUMENTADO: tabela de 13 NCMs do cap. 8518 com IPI de **10%** (12 NCMs) e **15%**
  (8518.40.00 — amplificadores).
IMPLEMENTADO: IPI fixo em **0%**, CST 53 (não tributado), para TODO item, independente de
  NCM. Comentário: "sem alíquota por NCM cadastrada no catalogo hoje — assume nao tributado
  (NT) por padrao. Configurar alíquota por NCM é trabalho futuro (tabela TIPI completa)."
ORIGIN: docs/tributario/02-ICMS_ESTADOS.md:71-85  |  PRIORITY: crítica
IMPLEMENTATION: TaxCalculationService.ts:119-124; consumido em IssueSaleNfeUseCase.ts:216-240
  (vai direto para o payload do provedor)
RELATED_TESTS: nenhum teste verifica IPI ≠ 0.
STATUS: CONFLICTING — CRITICAL/CONFIRMED.
```
**A empresa é fabricante de alto-falantes — NCM 8518 é exatamente o seu produto.** Esta não é
uma alíquota marginal: é a do produto principal. O código reconhece a lacuna em comentário; o
documento afirma a alíquota. Nenhum dos dois é declarado autoritativo.

### BR-FIS-004 — DIFAL documentado, não implementado
```
DOCUMENTADO: "Desde 2024, o DIFAL é devido para operações com consumidor final não
  contribuinte", com fórmula, partilha 20% origem / 80% destino e exemplo numérico SP→RJ.
IMPLEMENTADO: não existe. O código declara "sem considerar ... DIFAL".
ORIGIN: 02-ICMS_ESTADOS.md:45-63
IMPLEMENTATION: ausência confirmada — TaxCalculationService.ts:5-11, :154-169;
  TaxCalcItemResult (:35-50) não tem campo de DIFAL.
STATUS: CONFLICTING — regra documentada sem implementação. HIGH.
```

### BR-FIS-005 — ICMS-ST documentado, não implementado
```
DOCUMENTADO: ST aplicável em MG ("quando destinado a consumidor final"), RJ ("Protocolo ICMS
  10/2019") e PR; não em SP e RS. Fórmula com MVA e exemplo numérico.
IMPLEMENTADO: não existe ST em nenhum ponto do cálculo.
ORIGIN: 02-ICMS_ESTADOS.md:102-131
STATUS: CONFLICTING — regra documentada, com base legal citada, sem implementação. HIGH.
```

### BR-FIS-006 — CFOP de saída
```
IMPLEMENTADO: produção própria (finished/semi_finished) → 5101 (intra) / 6101 (inter);
  demais → 5102 / 6102.
DOCUMENTADO: "5.102 = Venda de mercadoria industrializada (dentro do estado)", "5.401 = ...
  fora do estado", "5.102 = Venda de produção do estabelecimento" (duplicado, dois
  significados para o mesmo código) e "6.101 = Venda ao exterior (exportação)".
IMPLEMENTATION: TaxCalculationService.ts:88-95
RELATED_TESTS: tax-calculation-service.test.ts:6,17,36 — consagram o CÓDIGO, não o documento.
STATUS: CONFLICTING. Doc e código atribuem CFOPs diferentes à mesma operação, e o próprio doc
  lista 5.102 duas vezes e 6.101 como exportação (o código usa 6101 para venda
  interestadual). Fonte autoritativa indeterminável → L-8. MEDIUM.
```

### BR-FIS-007 — PIS/COFINS por regime
```
DESCRIPTION: CRT=1 (Simples) → 0/0, CST 99; CRT=2 (Presumido, cumulativo) → PIS 0,65% /
  COFINS 3,00%, CST 01; CRT=3 (Real, não-cumulativo) → PIS 1,65% / COFINS 7,60%, CST 01.
IMPLEMENTATION: TaxCalculationService.ts:128-152
RELATED_TESTS: tax-calculation-service.test.ts:45-77 — cobre os 3 CRTs com os valores exatos.
STATUS: CONFIRMED — **único bloco tributário do módulo sem divergência.** Ressalva do próprio
  código: Lucro Real "simplificado sem apuração de créditos".
```

### BR-FIS-008 — Pré-condição de faturamento
```
DOCUMENTADO (UC-41): pré-condição "status = 'confirmed'"; e "409 CONFLICT se já houver NF-e
  `processing` **ou `authorized`**".
IMPLEMENTADO: aceita `confirmed` **ou `partially_invoiced`**; o 409 é disparado **apenas** por
  `nfe_status === 'processing'` — `authorized` não bloqueia (é o caso do faturamento parcial).
ORIGIN: 01-USE_CASES.md UC-41:879, 888-889, 927-929
IMPLEMENTATION: IssueSaleNfeUseCase.ts:113-118
STATUS: CONFLICTING. Divergência causada por o gap 3/3 (faturamento parcial) ter sido
  implementado e testado sem que UC-41 fosse atualizado. MEDIUM. Regras de saldo pendente
  (epsilon 1e-9) existem só no código (:139-152), sem requisito.
```

### BR-FIS-009 — ⚠ Provedor NF-e: fallback silencioso para mock
```
DESCRIPTION: o provedor é dado de negócio (`CompanyFiscalConfig.nfe_provider`,
  ENUM('mock','focus_nfe','enotas'), default **'mock'**), nunca variável de ambiente.
ORIGIN: JSDoc de NfeProviderFactory.ts:1-9 — regra existe apenas em comentário de código
EXCEPTIONS NÃO DOCUMENTADAS (2, ambas perigosas):
  (a) `case 'mock': default:` — qualquer valor inesperado cai SILENCIOSAMENTE no
      MockNfeProvider, que devolve NF-e "autorizada" falsa. Sem erro, sem log, sem guarda
      de ambiente.
  (b) O default da coluna é 'mock' (CompanyFiscalConfig.ts:60): **uma instalação nova emite
      NF-e mock por padrão** — e, como a autorização dispara baixa de estoque (G9) e criação
      de recebível (G13), **uma nota falsa produz efeitos patrimoniais reais**.
IMPLEMENTATION: NfeProviderFactory.ts:16-26; models/CompanyFiscalConfig.ts:60; consumido em
  IssueSaleNfeUseCase.ts:295, CancelSaleNfeUseCase.ts:101, GetSaleNfeStatusUseCase.ts:96
RELATED_TESTS: nenhum teste verifica a seleção de provedor ou proíbe 'mock' fora de dev.
STATUS: DISCOVERED — HIGH/CONFIRMED. Não existe nenhuma regra que impeça
  `nfe_provider='mock'` em produção, nem que cruze `nfe_environment` com o provedor.
```

### BR-FIS-010 — Justificativa de cancelamento ≥ 15 caracteres
```
IMPLEMENTATION: CancelSaleNfeUseCase.ts:88-96  |  ORIGIN: UC-41:916, cenário :977
STATUS: CONFIRMED — valor documentado (15) idêntico ao implementado (15).
```

## 4. Contabilidade — `accounting`

### BR-CTB-001 — ⚠ Estorno: autoridade existe, condições de negócio não
```
IMPLEMENTADO: PATCH /api/accounting/entries/:id/reverse exige
  `authorizeModule('contabilidade','approve')`. Condição única: lançamento `posted`. Cria
  novo lançamento `adjustment` já `posted`, com débito/crédito invertidos e `reversal_of_id`,
  e marca o original `reversed`.
ORIGIN: NENHUM requisito versionado define quem pode estornar nem sob quais condições. Única
  fonte: JSDoc da rota (accounting.ts:14-18) e AUDITORIA_CONT_TES_CTR_2026-08-07.md.
OWNER: NÃO DETERMINADO (L-9)  |  PRIORITY: alta

CONDIÇÕES AUSENTES (verificadas por leitura):
  1. **Sem segregação de funções**: PostEntryUseCase.ts:84-88 grava `approved_by: userId` —
     quem posta aprova a si mesmo. Em ReverseEntryUseCase.ts:62-66 o estorno nasce com
     `created_by: userId` **e** `approved_by: userId` **e** `approved_at` pelo mesmo usuário,
     sem checar se ele é o autor do original. **Um único usuário com nível `approve` cria,
     posta, estorna e aprova o estorno.**
  2. **Sem período contábil**: nenhuma checagem de exercício fechado. Não existe noção de
     fechamento no módulo.
  3. **Sem prazo**: um lançamento de qualquer data pode ser estornado hoje.
  4. **Data do estorno é sempre hoje** (:55) — estorno de lançamento de exercício anterior
     cai no exercício corrente sem aviso.
  5. **Sem justificativa obrigatória** — contraste direto com BR-FIS-010, que exige 15
     caracteres para cancelar uma NF-e. Estornar um lançamento contábil não exige explicação.
  6. **Estorno em cadeia**: o lançamento de estorno nasce `posted`, logo é ele próprio
     estornável, indefinidamente.
IMPLEMENTATION: ReverseEntryUseCase.ts:42-89; PostEntryUseCase.ts:84-88; accounting.ts:43-44
RELATED_TESTS: accounting-use-cases.test.ts (unitário com mock). A auditoria de 2026-08-07
  :142 já registra que falta teste de integração real do fluxo create→post→reverse.
STATUS: DISCOVERED — HIGH/CONFIRMED.
NOTA DE NÃO-DUPLICAÇÃO: a imutabilidade/append-only do estorno é FIND-ERP-002 — aqui o
  objeto é AUTORIDADE e CONDIÇÕES. A numeração `LC-{count+1}` sob concorrência (:53-54) já é
  o achado P2-1 da auditoria de 2026-08-07 — referência cruzada, sem duplicar.
```

### BR-CTB-002 — Partida dobrada
```
DESCRIPTION: (a) por LINHA, sempre: exatamente um de débito/crédito > 0; (b) por LANÇAMENTO,
  só ao postar: mínimo 2 itens, ao menos uma linha de débito E uma de crédito, e soma de
  débitos == soma de créditos, comparada em CENTAVOS.
IMPLEMENTATION: validateEntryItemsShape.ts:26-47; PostEntryUseCase.ts:53-82
STATUS: CONFIRMED. Separação deliberada (rascunho pode estar desbalanceado) documentada no
  código e coerente entre as duas implementações.
```

## 5. Controladoria — `budget`

### BR-CTR-001 — ⚠ Orçamento não restringe nada
```
• "Linha excede limite?" — NÃO EXISTE conceito de limite. `planned_amount` é
  `z.number().nonnegative()` sem teto (budgetValidators.ts:20). Nenhum use case compara
  realizado × orçado para BLOQUEAR: o relatório Orçado×Realizado calcula
  `variance`/`variance_percent` e devolve (GetBudgetVsActualReportUseCase.ts:92-96) — é
  informativo, não impeditivo. Nenhuma criação de conta a pagar, requisição ou pedido
  consulta `budget_lines`.
• "Quem aprova?" — NINGUÉM. O módulo não tem nível `approve`, por decisão declarada na rota:
  "Sem nível `approve`: ... planejamento orçamentário é editável/excluível livremente por
  quem tem acesso de escrita ao módulo" (budget.ts:17-21).
• "O DELETE físico tem trava?" — NÃO. DeleteBudgetLineUseCase.ts:27-33 faz apenas findById →
  NotFound → delete. Sem checagem de período, sem verificação de realizado associado, sem
  soft delete, sem justificativa, sem nível `approve`.
ORIGIN: a decisão "DELETE físico por design" está em budget.ts:5-8,
  DeleteBudgetLineUseCase.ts:4-8 e na migration 20260807-000250. Não existe política de
  negócio que estabeleça limite orçamentário ou alçada.
OWNER: NÃO DETERMINADO (L-10)  |  PRIORITY: alta
CONDITIONS: unicidade da chave (cost_center_id, year, month, category), com `month = null`
  tratado como "linha anual" distinta (CreateBudgetLineUseCase.ts:36-44).
STATUS: DISCOVERED — HIGH/CONFIRMED.
```
O achado P2-4 da auditoria de 2026-08-07 cobre a PERDA DE HISTÓRICO do DELETE; o que se
registra aqui e não está lá é o conjunto maior: **orçamento no ERP é hoje um artefato
puramente descritivo — não restringe gasto nenhum, não tem alçada e não tem aprovador.** Se o
negócio espera que "estourar o orçamento" tenha consequência, essa regra não existe.

## 6. Tesouraria — `treasury`

### BR-TES-001 — `settle`/`cancel`
```
DESCRIPTION: ambos exigem `status === 'active'` e são estados FINAIS, nunca reabertos.
  `settle` grava `settled_at`; `cancel` não grava nada além do status. settle = encerramento
  natural; cancel = encerramento antecipado/distrato.
IMPLEMENTATION: SettleOperationUseCase.ts:30-44; CancelOperationUseCase.ts:33-43;
  treasury.ts (nível `approve` para settle/cancel)
STATUS: CONFIRMED quanto às transições, **com 3 lacunas**:
  1. `settle`/`cancel` NÃO produzem nenhum efeito de caixa nem contábil: nenhuma escrita em
     `TreasuryBankAccount.current_balance`, nenhum lançamento contábil, nenhuma conta a
     pagar/receber. **Liquidar um empréstimo de R$ 1 milhão não move um centavo no sistema.**
     (Consistente com P2-2 da auditoria de 2026-08-07: saldo bancário é 100% manual.)
  2. `settled_at` aceita qualquer data (treasuryValidators.ts:85-87), inclusive anterior a
     `start_date` ou futura — sem validação cruzada.
  3. `cancel` não exige justificativa, ao contrário de BR-FIS-010 (15 caracteres). Regras de
     cancelamento inconsistentes entre módulos do mesmo domínio.
```

## 7. Financeiro — `financial`

### BR-FIN-001 — Baixa de título
```
DESCRIPTION: baixa sob lock pessimista; `amount` original NUNCA sobrescrito; `amount_paid`
  acumula; status vira 'partial' enquanto houver saldo e 'paid' quando zera; pagamento acima
  do saldo rejeitado (422); conta já `paid`/`canceled` rejeitada. Cálculo em centavos.
IMPLEMENTATION: ReceivePaymentUseCase.ts:39-73; PayPayableUseCase.ts:39-74 (espelhadas)
STATUS: DISCOVERED — regra coerente e simétrica. Regras AUSENTES relevantes:
  1. **Sem juros, multa ou desconto por antecipação**: nenhum cálculo sobre título vencido;
     paga-se sempre o valor de face.
  2. `payment_date` aceita qualquer valor, inclusive futuro ou anterior à emissão (:69).
  3. Sem segregação: quem tem acesso ao endpoint dá baixa sozinho, sem aprovação, em
     qualquer valor até o saldo.
  4. A baixa não gera lançamento contábil (zero acoplamento `financial`↔`accounting`,
     consistente com DOMAIN_MAP.md, apesar de o negócio exigir).
```

### BR-FIN-002 — Conciliação bancária
```
DESCRIPTION: (a) MATCH_TOLERANCE_CENTS = **1 centavo**; (b) MATCH_DATE_WINDOW_DAYS = **7
  dias** para cada lado; (c) baixa por conciliação é sempre INTEGRAL; (d) sinal obrigatório:
  crédito só concilia com recebível, débito só com pagável; (e) XOR entre payable_id e
  receivable_id.
ORIGIN: API.md:1503 ("valor até 1 centavo e vencimento a até ±7 dias"); DATABASE.md
OWNER: o próprio código nomeia o decisor implícito: "Ajuste aqui se o negócio decidir tolerar
  mais que 1 centavo (não recomendado: mascara divergência real)".
IMPLEMENTATION: financial/application/reconciliationRules.ts:16,23 (fonte única declarada);
  MatchEntryUseCase.ts:6,72,111; GetMatchSuggestionsUseCase.ts
STATUS: CONFIRMED — **valor documentado idêntico ao implementado**, com constante única e
  comentário proibindo duplicação do número mágico. Melhor exemplo de conformidade
  valor-a-valor do domínio e contraexemplo direto ao BR-FIS-001/003.
```

## 8. Lacunas sem fonte autoritativa (Regra 21 — escalar ao director)

| ID | Lacuna | Por que não é resolvível aqui |
|---|---|---|
| L-1 | Owner das regras de venda/NF-e | §11 e UC-41 dizem "DECIDIDO (2026-08-03)" sem nomear pessoa/papel |
| L-2 | Máquina de estados documentada só parcialmente | §11 descreve 2 das 8 transições |
| L-3 | Teste ausente do caminho `invoiced`(NF-e cancelada)→`shipped` | é a razão de existir da trava BR-COM-003 |
| L-4 | Política de preço e desconto | não existe artefato de origem |
| L-5 | Ciclo de vida e faturamento de OS | nenhum requisito, nenhum UC, nenhuma regra |
| L-6 | UNIQUE em `service_orders.order_number` | exigiria leitura de migration/banco |
| L-7 | Owner e vigência da tabela tributária | `docs/tributario/` sem autor nem responsável |
| L-8 | **Fonte autoritativa de ICMS interestadual e CFOP** | o documento contradiz a si mesmo; sem terceiro artefato para desempatar |
| L-9 | Condições de estorno contábil | nenhum artefato define período/segregação/justificativa |
| L-10 | Existe limite orçamentário no negócio? | o sistema não implementa nenhum; nenhum documento afirma que deveria |

## 9. O que este documento NÃO afirma

- Não decide qual lado está certo em nenhuma das 7 regras CONFLICTING — em especial nas
  tributárias. O código se declara simplificado e aponta `docs/tributario/` como fonte; o
  documento não se declara autoritativo nem tem responsável (Regras 20-21).
- Nenhuma consulta a banco: afirmações sobre constraints são só as já registradas em
  auditoria anterior, citadas como referência.
- FIND-ERP-001 e FIND-ERP-002 não foram reauditados nem reafirmados.

---

**Prioridade sugerida para o `vericore-finding-validator`** (todos com arquivo:linha dos dois
lados): **BR-FIS-001, BR-FIS-003, BR-COM-010 (CRITICAL)**; BR-FIS-002, BR-FIS-004, BR-FIS-005,
BR-FIS-009, BR-COM-008, BR-COM-009, BR-COM-012, BR-CTB-001, BR-CTR-001 (HIGH).

**Insumo para o `vericore-traceability-auditor`:** nenhuma das 24 regras tem BR-ID
pré-existente no repositório. Só 4 regras (BR-COM-006, BR-FIS-007, BR-FIS-010, BR-FIN-002)
têm a cadeia completa requisito → código → teste com o mesmo valor dos dois lados.

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado.
Conteúdo persistido pelo orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem
edição.*
