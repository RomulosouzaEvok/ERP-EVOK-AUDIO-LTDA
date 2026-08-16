# T-34 — Validação adversarial (Regra 22) dos HIGH de `client/` (T-32)

Run `ERP-LEGACY-001-AUD-001` · AUDIT_COMMIT `c1311a6f76b512fef893f7e60d934179cae3409f`
Agente: `vericore-finding-validator` · Escopo: **13 findings HIGH** de 5 relatórios T-32
Método: READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Toda âncora abaixo foi **relida
diretamente no worktree**; nenhuma foi herdada do briefing nem do relatório de origem.

> Fora de escopo por instrução: `T32-COM-F01` (desconto, promovido a `AUD-COM-DESCONTO-01`).
> Nenhum veredito de autorização é emitido aqui (mandato do `authorization-auditor`); nenhum
> finding é fechado (autoridade do `vericore-software-audit-director`); nada foi corrigido
> (Regra 2).

## 1. Placar

| Veredito | Qtd | IDs |
|---|---|---|
| `CONFIRMED` — severidade HIGH mantida | 6 | `PROD-F02`, `HRJUR-F01`, `FST-F01`, `FST-F04`, `SUP-F01`, `SUP-F02`, `SUP-F03` (7) |
| `CONFIRMED` — severidade **rebaixada** para MEDIUM | 5 | `PROD-F01`, `QUAL-F07`, `LAB-F10`, `FST-F02`, `COM-F03` |
| `CONFIRMED_PARCIAL` — dois impactos declarados **refutados**, resíduo mantido em MEDIUM | 1 | `SUP-F04` |
| `FALSE_POSITIVE` integral | 0 | — |
| `DUPLICATE` | 0 | — |
| `NEEDS_MORE_EVIDENCE` | 0 | — |

Correção do placar: **7 mantidos em HIGH**, 5 rebaixados a MEDIUM, 1 parcialmente refutado
(rebaixado a MEDIUM). Total 13. Nenhum finding do bloco sobreviveu sem tentativa documentada de
refutação; **3 sub-afirmações foram refutadas** dentro de findings que, no núcleo, se confirmam.

---

## 2. Vereditos

### `T32-PROD-F01` — refugo da OP inalcançável · **CONFIRMED · HIGH → MEDIUM**

**Refutação tentada (terceiro produtor do campo).** Grep próprio por `quantity_scrapped` em
`client/`: as únicas ocorrências de escrita são `ShopFloorPage.tsx:450`, que é
`completeProductionTracking` — **outra tabela** (`production_order_tracking`). O contrato de
conclusão da OP (`client/src/api/production.ts:50-54`) tem três campos, e
`updateProductionOrderStatus` (`:39-42`) envia apenas `{ status }`. No servidor,
`updateProductionOrderSchema` (`productionValidators.ts:30-35`) **exclui** `quantity_scrapped` —
o `PUT /:id` não é caminho alternativo. Único produtor possível é
`updateProductionOrderStatusSchema:40-44`, que nenhuma tela alimenta.
`ProductionOrdersPage.tsx:55` confirma por comentário que `in_progress → completed` só passa pelo
diálogo. **Não existe terceiro caminho. Fato confirmado.**

**Refutação do impacto (por que rebaixo).** Duas evidências que o relatório de origem não pesou:
1. `server/src/modules/production/README.md:117` — decisão versionada: o refugo da OP "**não**
   entra em `InventoryService.receive` e **não** afeta o consumo de componentes — é puramente um
   registro de auditoria". Não há custo de refugo no sistema para ficar zerado; o achado original
   afirma "custo de refugo … estruturalmente zerado" além do que o código sustenta.
2. Existe **registro compensatório do mesmo fato**, alimentado pela UI: `findScrapByStep`
   (`SequelizeReportsRepository.ts:133-147`) lê `production_order_tracking` e
   `GetProductionReportUseCase.ts:70-83` publica `scrap_by_step` **com `scrap_rate` por etapa**, no
   mesmo relatório onde `adherence.scrap_rate` (`:100`, alimentado por `production_orders`) fica em
   zero. O indicador de refugo da fábrica **existe e funciona**; o que falta é o total "oficial" de
   fechamento da OP.

**Severidade:** MEDIUM. Campo documentado como implementado e inalcançável, com indicador paralelo
íntegro, sem efeito em estoque, custo ou saldo. Confiança ALTA.

---

### `T32-PROD-F02` — sobreprodução inalcançável + contrato de API vazado · **CONFIRMED · HIGH**

**Refutação tentada 1 — a UI impede chegar no erro?** Não: `CompleteProductionOrderDialog.tsx:132-138`
é `Input type="number"` **sem `max`**, inicializado com `order.quantity` (`:61`) e livremente
editável. O caminho é alcançável digitando qualquer valor acima do planejado.

**Refutação tentada 2 — existe outra tela que conclua a OP?** Não. `ProductionOrdersPage.tsx:55`
("`in_progress -> completed` não avança por aqui") e `:255` (`setCompletingOrder`); a única outra é
`CompleteOrderWithLotScanDialog`, usada só por `ShopFloorPage.tsx:274`. Grep por
`allow_overproduction` em `client/`: **zero ocorrências**. Beco sem saída confirmado.

**Refutação tentada 3 — a mensagem crua é mesmo exibida?** Sim, e provei o mecanismo inteiro:
`ProductionOrderEntity.ts:191-194` e `:200-203` lançam `new ValidationError(msg)` **sem `details`**;
`errors/index.ts:17-20` só popula `details` se recebido; `translateApiError.ts:212-215` cai em
`body.error.message` quando `detailReasons` está vazio; `CompleteProductionOrderDialog.tsx:110` e
`:163` renderizam isso em `DidacticAlert`. O operador lê literalmente
`Envie "allow_overproduction: true" na requisicao`.

**Severidade:** HIGH mantida. Evento rotineiro de fábrica sem caminho de confirmação; o único
contorno é declarar a quantidade planejada, o que **falsifica a produção e deixa o excedente fora do
estoque**. Ressalva de qualidade do finding: são dois defeitos empacotados (beco sem saída = HIGH;
vazamento de contrato ao operador = MEDIUM isolado) — recomendo split na consolidação, sem alterar a
severidade do conjunto.

---

### `T32-QUAL-F07` — inspecionar × liberar invisível na UI · **CONFIRMED (fato) · HIGH → MEDIUM**
### · uma sub-afirmação **REFUTADA**

**Fato confirmado por leitura própria dos dois lados.** `inventory.ts:35-36` —
`POST /lots/:id/release` e `/block` exigem `authorizeModule('qualidade','approve')`.
`InspectionTab.tsx:63` — `canWrite = hasRole('admin','operator')`, e são exatamente esses botões
("Aprovar" `:174-181` → `releaseLot`; "Reprovar" `:184-186` → `blockLot`, via `:79-91`) que ficam
sob esse gate. `qualityInspections.ts:11-19` documenta a separação ISO 9001 §8.6 deliberada.
Grep por `releaseLot|blockLot` em `client/src`: **um único consumidor**, `InspectionTab` — não há
tela alternativa com o gate correto.

**Sub-afirmação REFUTADA.** O relatório de origem afirma que o inspetor "recebe 403
`APPROVAL_LEVEL_REQUIRED` **cru** … sem tradução de alçada". **Falso.**
`middlewares/auth.ts:272-281` responde `message: 'Esta ação exige nível gestor da área.'` — português
de negócio, sem código — e `InspectionTab.tsx:87,108` traduz com contexto `'release-lot'`, que
`translateApiError.ts:112-115` resolve para a ação "Ver lotes em Qualidade". O erro entregue é
didático; o defeito é **só** o eixo do gate de botão.

**Divergência nova (minha, não do relatório de origem).** `qualityInspections.ts:25` expõe
`GET /lots/:lotId/release-eligibility` — pré-checagem desenhada exatamente para esta tela. Grep por
`release-eligibility|releaseEligibility` em `client/src`: **zero ocorrências**. O servidor oferece a
antecipação didática e a UI não a consome.

**Severidade:** MEDIUM. O backend barra em todos os caminhos verificados; é ação às cegas
(categoria 2), a mesma classe que este run já classificou MEDIUM em `T32-HRJUR-F04`,
`T32-SUP-F05` e `T32-FST-F08` — manter HIGH aqui quebraria a paridade interna da run. **Veredito de
autorização permanece com o `authorization-auditor`.**

---

### `T32-LAB-F10` — caixinha "Abrir RNC" inócua · **CONFIRMED (fato) · HIGH → MEDIUM**

**Fato confirmado.** `CreateAcousticTestUseCase.ts:63-70` marca `create_rnc_on_fail` como
`@deprecated` e instrui literalmente remover a caixinha em `RegisterTestTab.tsx`; o campo é
desestruturado fora do `execute` (`:109-124` **não** o extrai) e `:186` (`if (!passed)`) abre a RNC
incondicionalmente. Cliente: `RegisterTestTab.tsx:52` (schema), `:67` (default `true`), `:119`
(enviado), `:230-240` (renderizado). **Confirmado que o campo não tem outro produtor nem outro
consumidor.**

**Refutação do impacto (por que rebaixo).** A divergência é **fail-safe**: o sistema executa o
controle **mais** rigoroso do que o usuário pediu. Nenhum dado é perdido — contraste direto com
`T32-QUAL-F08` (`root_cause_category` coletado e descartado, com perda real de informação), que o
mesmo relatório classificou MEDIUM. Além disso o default é `true` (`:67`), de modo que o caminho
majoritário é coerente; a divergência só se manifesta quando o usuário desmarca ativamente.

**Severidade:** MEDIUM. Controle fantasma na UI + surpresa operacional (RNC aberta e lote
potencialmente bloqueado contra a expectativa), sem perda de dado e sem enfraquecimento de controle.
Agravante legítimo mantido: divergência **conhecida e documentada desde 2026-08-09** e não remediada.

---

### `T32-HRJUR-F01` — prazo fatal vencido sem caminho de cumprimento · **CONFIRMED · HIGH**

**Refutação tentada 1 — alguém escreve `status='missed'`?** Grep próprio por `missed` em
`server/src`: as ocorrências são o enum do model (`JurLegalCaseDeadline.ts:21,57`), a coluna
`missed_at` (`:40,68`), a leitura de críticos (`SequelizeDeadlineRepository.ts:73`) e
`FulfillDeadlineUseCase.ts:41,55`. **Nenhum escritor de `status='missed'`.** Nenhum scheduler.

**Refutação tentada 2 — outro caminho na UI para a justificativa?** Grep por
`retroactive_justification` em `client/src`: 4 ocorrências — o tipo (`api/juridico.ts:635,700`), o
JSDoc que **documenta o 422** (`:707`) e o único envio (`DeadlinesTab.tsx:285`). O campo só é
renderizado sob `isMissed` (`:329-335`), e `isMissed` é `deadline?.status === 'missed'` (`:290`) —
condição que nunca se torna verdadeira. **Não há caminho alternativo.**

**Refutação tentada 3 — o servidor perdoa?** Não: `FulfillDeadlineUseCase.ts:40-48` calcula
`dueDatePassed = new Date(deadline.due_date) < new Date()` e lança `BusinessRuleError` sem a
justificativa. Confirmado 100% do caminho.

**Divergência nova (minha).** O 422 carrega `details: { rule: 'BR-JUR-014' }` (`:46`). Por
`translateApiError.ts:213-215`, quando há `details` a **mensagem em português é descartada** e o
usuário lê `rule: BR-JUR-014` (chave não mapeada em `DETAIL_KEY_PREFIX`, `:127-132`). O advogado
recebe um código, não a instrução. É o mesmo mecanismo de `T32-SUP-F09`, aqui aplicado ao fluxo mais
crítico do módulo — registre-se o cruzamento.

**Severidade:** HIGH mantida. Não é caso de borda: é o comportamento garantido para **todo** prazo
vencido, no fluxo UC-54 (prazo fatal, risco jurídico), com falha fechada — o cumprimento real não
consegue ser registrado no sistema.

---

### `T32-FST-F01` — CPF/telefone de visitante sem máscara · **CONFIRMED · HIGH (ampliado)**

**Refutação tentada — existe máscara em outra camada?** Não. `SequelizeVisitRepository.ts:17-27`
inclui `{ model: FacilityVisitor, as: 'visitor' }` **sem `attributes`**, ao lado de
`{ model: Employee, as: 'hostEmployee', attributes: ['id','name'] }` — a minimização foi aplicada a
um e não ao outro. `visitController.ts:19-29` devolve `rows` direto, sem mapper. A máscara existe só
em `VisitorUseCases.ts:12-16,26-30` (`ListVisitorsUseCase`, rota `/visitors`). Cliente:
`VisitorsTab.tsx:38` chama `listVisits` e a tabela renderiza só `visit.visitor?.name` (`:114`) — o
dado trafega e não é exibido, que é o pior caso para detecção.

**Ampliação (minha).** O vazamento não é só da listagem: **três** métodos do mesmo repositório têm o
include idêntico — `list:17-27`, `findById:29-36` e `listOnsite:49-58`. Rotas correspondentes:
`facilities.ts:99` (`/visits/onsite-overdue`), `:100` (`/visits`), `:101` (`/visits/:id`) — todas
`authorizeModule('facilities')`, **nível de leitura**. E `VisitorsTab.tsx:41-44` consome
`onsite-overdue` **sem nenhum gate**. A superfície é maior que a descrita.

**Severidade:** HIGH mantida. Dado pessoal sensível (CPF + telefone) entregue ao browser de qualquer
usuário com leitura em `facilities`, por três endpoints, contra minimização declarada em dois
artefatos (docblock da tela `:22-27` e contrato `api/facilities.ts`). Fonte autoritativa = código do
servidor (Regra 21). Contraste interno que sustenta a severidade: o CPF de funcionário É omitido no
servidor (`EmployeesTab.tsx:72-74` renderiza "•••" sobre campo ausente).

---

### `T32-FST-F02` — CAT de óbito inalcançável · **CONFIRMED (fato) · HIGH → MEDIUM**

**Fato confirmado.** `client/src/api/sst.ts:388-394` — `emitCat(accidentId, emitente)` envia
`{ tipo: 'inicial', emitente }` e **não tem parâmetro `tipo`**. `EmitCatUseCase.ts:60` —
`const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';`. Model
`SstCat.ts:38` — `ENUM('inicial','reabertura','obito')`, portanto o valor é persistível e o caminho
do servidor é real. Achado adicional meu: o tipo do cliente é
`CatTipo = 'inicial' | 'reabertura'` (`api/sst.ts:374`) — o cliente **nem conhece** o valor `obito`,
o que explica e agrava a renderização errada apontada em `T32-FST-F03`.

**Refutação do impacto (por que rebaixo).** O relatório sugere consequência legal. Verifiquei:
1. O **prazo legal** da CAT de óbito (imediato, mesmo dia — Lei 8.213/91 art. 22 §2º) é calculado a
   partir de `acidente.gravidade`, **não** de `tipo`: `EmitCatUseCase.ts:61` chama
   `calcularPrazoLimiteCat(acidente.data_hora, acidente.gravidade)` e
   `legalDeadlineService.ts:30-34` ramifica em `gravidade === 'obito'`. **O controle legal funciona
   mesmo com `tipo='inicial'`.**
2. Grep próprio por `obito` em `server/src/modules/sst`: as únicas ocorrências são
   `legalDeadlineService.ts:27,32` (gravidade), `CloseAccidentUseCase.ts:25` (gravidade),
   `CreateAccidentUseCase.ts:22` (enum de gravidade) e a própria atribuição de
   `EmitCatUseCase.ts:60`. **`cat.tipo === 'obito'` não tem nenhum consumidor** — não roteia eSocial,
   não muda regra de encerramento, não entra em relatório.
3. O evento eSocial `S-2210` é enfileirado identicamente (`:72-78`).

**Severidade:** MEDIUM. Campo de classificação de documento legal que a UI não consegue produzir,
com rótulo errado na tela — sem efeito sobre prazo, transmissão ou regra de negócio.

---

### `T32-FST-F04` — solicitante escolhe o `department_id` que define quem aprova · **CONFIRMED · HIGH**

**Refutação tentada — guarda no backend.** Nenhuma. `CreateAccessRequestUseCase.ts:39-41` faz
`departmentId = input.department_id ?? employee.department_id` e valida **apenas a existência** do
departamento — nunca a coerência com `employee.department_id`. `:43-46` valida que o perfil existe,
nunca **qual** perfil. `ApproveAccessRequestUseCase.ts:35` resolve elegibilidade por
`request.department_id`, e `approverEligibilityService.ts:26-37` habilita o gestor daquele
departamento (`departments.manager_id → employees.user_id`). Cliente:
`AccessRequestsTab.tsx:222-229` lista **todos** os departamentos, desvinculado do funcionário
selecionado, e `:169` envia; `:231-235` deixa `requested_profile_id` como `Input type="number"`
livre.

**Divergência nova (minha) — cadeia completa de escalonamento.** Não encontrei nenhuma guarda de
segregação `requested_by ≠ approved_by`: `ApproveAccessRequestUseCase.ts:29-41` não a tem. Logo, um
usuário com `ti:operate` que **também** seja `manager_id` de algum departamento pode: (1) criar a
solicitação escolhendo o próprio departamento; (2) aprová-la a si mesmo pela branch de gestor de
`authorizeSelfOrModule` (`ti.ts:82`), **sem nunca ter `ti:approve`**; (3) executá-la com o mesmo
`ti:operate` (`ti.ts:84`), acionando `ExecuteAccessRequestUseCase.ts:76-81` →
`provisionAccess({ profileId })`, que aplica o perfil de acesso real. Quem não é gestor ainda assim
**escolhe qual gestor** aprovará (approver shopping). O relatório de origem descreveu o campo; a
cadeia até o provisionamento não estava demonstrada.

**Severidade:** HIGH mantida, com **recomendação explícita ao `authorization-auditor` de avaliar
elevação a CRITICAL** à luz da cadeia acima (o veredito de autorização não é meu). A delimitação do
relatório de origem está correta e é mantida: **não é violação da Regra 24** — nenhum papel é aceito
do cliente como fonte de autorização; o defeito é um campo controlado pelo solicitante com efeito de
autorização.

---

### `T32-SUP-F01` — alçada G11 só no servidor, sem tela · **CONFIRMED · HIGH**

**Refutação tentada — a UI tem o endpoint em outro módulo de API?** Grep próprio por
`approvals|/approve` em `client/src/api`: existem `comex.ts:204-229`
(`/api/comex/import-processes/:id/approvals` e `/approve`), `juridico.ts:277-297`,
`marketing.ts:553`, `warehouses.ts:148`, `inventory.ts:279`, `ti.ts:522`. **Nenhum para
`/api/purchases/:id/approve` ou `/approvals`.** O `ImportApprovalGateCard` citado como padrão de
referência pertence ao gate G11-**COMEX**, outro recurso — não cobre o pedido de compra.
`client/src/api/purchases.ts:56-116` expõe seis funções, nenhuma de alçada.

**Refutação tentada — o backend realmente barra?** Sim, com bloqueio duro:
`ChangePurchaseStatusUseCase.ts:127-143` chama `_assertApprovalAuthority` antes do `save()`, e
`:199-216` lança `BusinessRuleError` quando falta o papel `diretor`.
`purchases/domain/constants.ts:162-176` — **importação exige diretoria em qualquer valor**
(inclusive R$ 0,00), nacional acima de `PURCHASE_APPROVAL_THRESHOLD_DIRECTOR = 500000` (`:74`).
Rota da aprovação: `purchases.ts:48` (`authorizeModule('diretor')`), leitura em `:49`.

**Severidade:** HIGH mantida. **Todo pedido de importação é impossível de aprovar pelo ERP** — não é
degradação, é impasse funcional total em um fluxo obrigatório. Agravante confirmado por leitura:
`ChangePurchaseStatusUseCase.ts:213` instrui o usuário final com uma rota HTTP crua, e o `details`
(`:214`) faz `translateApiError.ts:213-215` **descartar até essa mensagem**, exibindo
`rule: G11 · origin · approvalValue · missingRoles` (cruza `T32-SUP-F09`).

---

### `T32-SUP-F02` — cotação sobrescrita sem valor anterior nem justificativa · **CONFIRMED · HIGH**

**Refutação tentada 1 — histórico/versão no servidor?** Não: `RegisterRfqQuoteUseCase.ts:84-101` é
upsert puro (`updateRfqQuote` sobre `existingQuote`), sem tabela de versão, sem `previous_price`.
`QUOTABLE_STATUSES = ['sent','quoted']` (`:21`) segue aceitando registro depois que o mapa
comparativo já expôs os concorrentes.

**Refutação tentada 2 — trilha de auditoria compensatória?** **Refutada, e o resultado agrava o
finding**: `rfqController.ts:187-194` registra `action: 'register_quote'` com
`newValues: { supplier_id, status }` — **sem nenhum preço e sem `oldValues`**. Não há registro do
valor anterior *em lugar nenhum do sistema*, nem no log de auditoria. Fato novo, não levantado pelo
relatório de origem.

**Refutação tentada 3 — a UI mostra que é sobrescrita?** Confirmado que não:
`RfqPage.tsx:560-578` pré-carrega a cotação existente nos mesmos inputs; a tabela renderiza cinco
colunas (`:637-643`: Item, Preço unit., Prazo, MOQ, Validade) — **`notes` não tem input**, embora
exista em `QuoteFieldState` (`:548`) e seja enviado em `:590`, portanto permanentemente vazio. Botão
"Salvar cotação" (`:696-703`) e retorno "Cotação registrada com sucesso" (`:693`) idênticos nos dois
casos.

**Mitigação parcial encontrada (registrada em favor do objeto auditado).** A adjudicação não é
totalmente livre a jusante: `AwardRfqUseCase.ts:280` grava `requester_id: input.userId` no pedido
gerado, e `ChangePurchaseStatusUseCase.ts:134-140` (`assertApproverIsNotRequester`, D-K) impede que
**o próprio adjudicante aprove** o pedido resultante. Isso mitiga a concentração adjudicar+aprovar,
mas **não** o vetor central deste finding: quem aprova o pedido vê apenas o preço final já
sobrescrito.

**Severidade:** HIGH mantida. Processo competitivo com sobrescrita silenciosa, sem valor anterior,
sem motivo e — provado agora — **sem controle detectivo algum**.

---

### `T32-SUP-F03` — "estoque inicial" cria saldo sem movimento e sem depósito · **CONFIRMED · HIGH (reforçado)**

**Refutação tentada — dual-write em outra camada?** Não. `CreateProductUseCase.ts:58-88` instancia
`ProductEntity` com `quantity: input.quantity || 0` e chama `productRepository.create` —
**nenhuma chamada a `WarehouseStockService`, nenhum movimento**. `createProductSchema:63` aceita
`quantity`; `updateProductSchema:79-96` **não a aceita** — prova de que a exclusão é deliberada e o
caminho de criação ficou aberto. Cliente: `ProductsPage.tsx:44,189-190` ("Quantidade inicial", campo
**obrigatório** no schema `z.coerce.number().min(0)`); gêmeo no Item Mestre em
`ItemMasterPage.tsx:58,202-203` (`estoque_atual`), aceito por `itemValidators.ts:14` e gravado por
`CreateItemUseCase.ts:41`.

**Reforço material (meu, não estava no relatório).** O saldo fantasma **não é apenas cosmético na
tela de saldos**: `SequelizeItemRepository.ts:90-112` monta a posição de estoque do planejamento com
`physicalQuantity = liveProduct?.quantity ?? item.estoque_atual` (`:92`), e essa posição alimenta
`GenerateMrpPlanUseCase.ts:94-101` (`onHand`) → `mrpEngine.ts:246-254`, onde é **netada contra a
necessidade bruta**. Ou seja: quantidade digitada no cadastro, sem movimento e sem depósito,
**reduz a compra e a produção planejadas**. O impacto ultrapassa o razão de estoque e chega ao MRP.

**Severidade:** HIGH mantida e reforçada. Cruzamento com `AUD-INTEG-03` confirmado.

---

### `T32-SUP-F04` — duas telas para o mesmo `receive` · **CONFIRMED_PARCIAL · HIGH → MEDIUM**
### · **dois impactos declarados REFUTADOS**

**Fato de contrato confirmado.** `PurchasesPage.tsx:415-423` monta exatamente
`{ invoice_number, items:[{item_id, quantity}] }` — sem `warehouse_code`, `lot_number`, `expires_at`,
`invoice_date` ou `due_date`. A tela irmã (`ReceivingConferenceDialog`) oferece os campos de lote e
depósito. Divergência entre duas portas para o mesmo endpoint: **confirmada**.

**REFUTAÇÃO 1 — "vai ao depósito errado silenciosamente".** **Falsa.**
`ReceivePurchaseItemsUseCase.ts:131-138`: quando `warehouseCode` está ausente **e** o pedido tem
`requisition_id` cuja requisição de origem tem `origin = ENGINEERING_SAMPLE_ORIGIN`, o default passa
a `'LABORATORIO'` automaticamente. O JSDoc `:58` e o comentário `:123-130` declaram que o desenho
existe justamente "sem exigir que o Recebimento saiba/lembre de sinalizar manualmente a origem de
amostra". O caso citado pelo relatório — amostra de engenharia recebida pela tela simples — é
**exatamente o caso que o servidor cobre**. Controle compensatório deliberado.

**REFUTAÇÃO 2 — "cria lote sem número".** **Falsa.** `ReceivePurchaseItemsUseCase.ts:168-174`: sem
`lot_number` informado, gera `buildGeneratedLotNumber(order_number, item.id, sequence)` →
`materialReceiptService.ts:127-129` produz `"<pedido>-ITEM<id>-R00n"`, determinístico e compatível
com o índice único `(product_id, lot_number)` (`:118-120`). O lote nasce numerado e em quarentena
(`:181`).

**Resíduo confirmado.** Pela tela de `PurchasesPage` não é possível informar **o número de lote do
fornecedor** (perde-se o vínculo com a rastreabilidade externa, ex.: recall de fornecedor) nem
**`expires_at`** (o lote nasce sem validade, e o controle de vencimento não tem como operar). Isso é
real e material, mas é uma fração do que o finding afirma. `invoice_date`/`due_date` já estão
cobertos por `T32-SUP-F08` — não os conto duas vezes.

**Severidade:** MEDIUM. Fica registrado que o finding, como redigido, **não seria remediável como
descrito** — a SanaCore precisa do resíduo, não do texto original.

---

### `T32-COM-F03` — tabela de preço por cliente: os dois lados delegam ao outro · **CONFIRMED (fato) · HIGH → MEDIUM**

**Fato confirmado nos dois lados, por leitura própria.** Cliente afirma
(`ClientsPage.tsx:197-203`, JSDoc): "O preço aqui cadastrado passa a ser sugerido automaticamente ao
adicionar aquele produto num pedido de venda daquele cliente". Servidor afirma o simétrico
(`CreateCustomerPriceUseCase.ts:8-12`): "`CreateSaleUseCase`/`EditSaleItemsUseCase` não leem esta
tabela; a sugestão de preço acontece na camada de apresentação/frontend". Grep próprio por
`listCustomerPrices|customer-prices` em `client/src`: **um único chamador**, o próprio diálogo de
cadastro (`ClientsPage.tsx:209-210`). Grep por `CustomerPrice` em `server/src`: 11 arquivos, todos
CRUD/list/model/rota — `CreateSaleUseCase.ts:96-140` toma `unit_price` do payload sem nenhuma
consulta. **Nenhum dos dois implementa; ambos documentam como existente.** Contradição
documento × código nos termos da Regra 21: confirmada.

**Refutação da severidade.** Não há regra sendo contornada — a regra **não existe**. Não há perda de
dado, alçada furada nem exposição. O peso do achado é (a) funcionalidade anunciada e inerte e (b)
dois artefatos versionados mentindo. Paridade interna da própria trilha: `T32-COM-F02` (desconto sem
campo em tela alguma, sem alçada nem teto) e `T32-COM-F04` (preço de cliente sem alçada) são MEDIUM,
e ambos carregam risco financeiro **maior** que este. Manter HIGH aqui seria incoerente com o
próprio relatório de origem.

**Severidade:** MEDIUM, com nota Regra 21 (fonte a reconciliar) — mesmo tratamento dado a
`T32-HRJUR-F09`.

---

## 3. Divergências novas levantadas nesta validação

| # | Divergência | Âncora | Vinculada a |
|---|---|---|---|
| D-1 | `GET /api/quality/lots/:lotId/release-eligibility` não tem **nenhum** consumidor no cliente | `qualityInspections.ts:25` × grep 0 em `client/src` | `T32-QUAL-F07` |
| D-2 | 422 `BR-JUR-014` carrega `details.rule`, e `translateApiError` **descarta a mensagem em português**, exibindo `rule: BR-JUR-014` | `FulfillDeadlineUseCase.ts:44-47` × `translateApiError.ts:213-215`, `:127-132` | `T32-HRJUR-F01`, cruza `T32-SUP-F09` |
| D-3 | Vazamento de visitante alcança **três** métodos/rotas, não só a listagem; `onsite-overdue` é consumido sem gate | `SequelizeVisitRepository.ts:17-27,29-36,49-58`; `facilities.ts:99-101`; `VisitorsTab.tsx:41-44` | `T32-FST-F01` |
| D-4 | Cadeia completa criar→auto-aprovar→executar sem `ti:approve` e **sem guarda `requester ≠ approver`** | `CreateAccessRequestUseCase.ts:39`; `ApproveAccessRequestUseCase.ts:29-41`; `ti.ts:82,84`; `ExecuteAccessRequestUseCase.ts:76-81` | `T32-FST-F04` → `authorization-auditor` |
| D-5 | O log de auditoria de `register_quote` **não grava preço nem `oldValues`** — a sobrescrita de cotação é indetectável a posteriori | `rfqController.ts:187-194` | `T32-SUP-F02` |
| D-6 | O "estoque inicial" alimenta a **netagem do MRP** via `liveProduct.quantity` | `SequelizeItemRepository.ts:90-112`; `GenerateMrpPlanUseCase.ts:94-101`; `mrpEngine.ts:246-254` | `T32-SUP-F03` |
| D-7 | Cliente sequer conhece `CatTipo = 'obito'` (`'inicial' \| 'reabertura'`), o que causa a renderização "Reabertura" | `client/src/api/sst.ts:374` × `SstCat.ts:38` | `T32-FST-F02`, `T32-FST-F03` |
| D-8 | Roteamento automático `engenharia_amostra → LABORATORIO` é **conformidade**, não defeito | `ReceivePurchaseItemsUseCase.ts:131-138` | contra `T32-SUP-F04` |
| D-9 | Geração determinística de nº de lote no recebimento é **conformidade** | `ReceivePurchaseItemsUseCase.ts:168-174`; `materialReceiptService.ts:118-129` | contra `T32-SUP-F04` |
| D-10 | Mensagem de 403 por nível é didática em português, não código cru | `middlewares/auth.ts:272-281` | contra `T32-QUAL-F07` |

## 4. Lacunas que permanecem (para o `vericore-audit-verification-runner`)

1. Captura do JSON de `GET /api/facilities/visits` provando `visitor.document`/`visitor.phone` em
   claro (`FST-F01`, L-1 do relatório de origem) — o caminho de código está provado; a captura, não.
2. Renderização literal de `Envie "allow_overproduction: true"` na tela (`PROD-F02`) e de
   `rule: BR-JUR-014` (`HRJUR-F01` / D-2).
3. Execução da cadeia D-4 com um usuário `ti:operate` que também seja `manager_id` — prova dinâmica
   de auto-aprovação de acesso.
4. Prova de que um produto criado com "estoque inicial" reduz `netRequirement` em um plano de MRP
   real (D-6). **Não executo comando de banco nem de ambiente** (proibição de escopo).

## 5. Encerramento

- **13/13 findings HIGH do bloco receberam veredito com tentativa de refutação documentada**
  (Regra 22 satisfeita para este bloco).
- Seguem para consolidação/remediação com status `CONFIRMED`: `PROD-F01` (MEDIUM), `PROD-F02`
  (HIGH), `QUAL-F07` (MEDIUM), `LAB-F10` (MEDIUM), `HRJUR-F01` (HIGH), `FST-F01` (HIGH), `FST-F02`
  (MEDIUM), `FST-F04` (HIGH), `SUP-F01` (HIGH), `SUP-F02` (HIGH), `SUP-F03` (HIGH), `SUP-F04`
  (MEDIUM, **redigido de novo a partir do resíduo** — o texto original contém duas afirmações
  refutadas e não deve ser remediado como está), `COM-F03` (MEDIUM).
- **Nenhum finding deste bloco é `FALSE_POSITIVE` integral.** Cinco severidades rebaixadas e três
  sub-afirmações refutadas.
- **`T32-FST-F04` é encaminhado ao `authorization-auditor`** com a cadeia D-4 e recomendação de
  avaliar elevação a CRITICAL — o veredito de autorização não pertence a este agente.
- Não declaro `RETEST_PASSED`, `FINDING CLOSED` nem `REMEDIATION COMPLETE`. Nenhum artefato fora de
  `audit/` foi alterado.
