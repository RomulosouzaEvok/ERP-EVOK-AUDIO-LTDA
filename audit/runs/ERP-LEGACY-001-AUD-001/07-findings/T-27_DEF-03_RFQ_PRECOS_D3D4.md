# T-27 — FIELDWORK COMPLEMENTAR `DEF-03` — `rfq` + `customer prices` (D3/D4 EXAUSTIVO)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:        T-27 — fechamento do deficit DEF-03 (AUDIT_COVERAGE_EXECUTED.md §3.1)
ORIGEM:        RES-T10-01 (T-10_SUPRIMENTOS_VENDAS.md §4)
PRODUZIDO POR: vericore-business-rule-auditor
DATA:          2026-08-16
REGIME:        read-only. Nenhuma conexao de banco, nenhuma execucao, nenhum arquivo
               do objeto auditado alterado (Regra 2). Nenhum AUDIT_PASSED /
               RETEST_PASSED / FINDING CLOSED (Regra 4). Findings PROPOSED (Regra 22).
```

> **Nota de persistência.** O agente titular não dispunha de ferramenta `Write` nesta sessão.
> Conteúdo persistido pelo orquestrador **sem alteração** — mesmo padrão de ressalva de
> transparência já aplicado nos passos 23 e 24.

**Fato de base declarado pelo orquestrador (não produzido pelo agente):**
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` →
vazio. Toda leitura abaixo é do worktree, equivalente ao `AUDIT_COMMIT` nesses caminhos.

## 1. Escopo confirmado por leitura própria (não herdado do enunciado)

`server/src/modules/rfq/presentation/routes/rfqs.ts:14-20` — **7 rotas**:

| # | Rota | authZ literal | Handler |
|---|---|---|---|
| R1 | `GET /api/rfqs` | `authorizeModule('compras')` (`:14`) | `list` |
| R2 | `GET /api/rfqs/:id` | `authorizeModule('compras')` (`:15`) | `getById` |
| R3 | `GET /api/rfqs/:id/comparison` | `authorizeModule('compras')` (`:16`) | `getComparison` |
| R4 | `POST /api/rfqs` | `authorizeModule('compras','operate')` (`:17`) | `create` |
| R5 | `POST /api/rfqs/:id/suppliers` | `authorizeModule('compras','operate')` (`:18`) | `inviteSuppliers` |
| R6 | `POST /api/rfqs/:id/quotes` | `authorizeModule('compras','operate')` (`:19`) | `registerQuote` |
| R7 | `POST /api/rfqs/:id/award` | `authorizeModule('compras','approve')` (`:20`) | `award` |

`server/src/modules/sales/presentation/routes/sales.ts:39-42` — **4 rotas de preço por cliente**:

| # | Rota | authZ literal | Handler |
|---|---|---|---|
| P1 | `GET /api/sales/customers/:id/prices` | `authorizeModule('vendas')` (`:39`) | `listCustomerPrices` |
| P2 | `POST /api/sales/customers/:id/prices` | `authorizeModule('vendas','operate')` (`:40`) | `createCustomerPrice` |
| P3 | `PUT /api/sales/customers/:id/prices/:priceId` | `authorizeModule('vendas','operate')` (`:41`) | `updateCustomerPrice` |
| P4 | `DELETE /api/sales/customers/:id/prices/:priceId` | `authorizeModule('vendas','operate')` (`:42`) | `deactivateCustomerPrice` |

**Tabelas de preço tocadas** (baseline `server/database/postgresql/00_baseline_frozen.sql`):
`customer_price_lists` (`:4707-4719`), `rfq_quotes` (`:12014-12025`),
`rfq_items.awarded_unit_price` (`:11984-11987`) e, por realimentação da adjudicação,
`item_suppliers.unit_price` (`AwardRfqUseCase.ts:313-336`).

**Divergência de escopo, registrada (Regra 20):** o enunciado de DEF-03 fala em "≈5
endpoints". A superfície efetiva de leitura profunda desta trilha é de **11 rotas** (7 + 4),
porque as 3 rotas de leitura de `rfq` e a leitura de preços também carregam regra de negócio —
o mapa comparativo (R3) **é** o artefato sobre o qual a adjudicação decide. Não reduzi o
escopo ao número do enunciado.

## 2. Matriz endpoint × D3 × D4, com âncora dos dois lados

| Rota | D3 — regra de negócio (doc → cod) | D4 — transação / idempotência |
|---|---|---|
| **R1** `GET /rfqs` | Filtro `status` por `z.enum` (`rfqValidators.ts:33`); paginação `max(100)` (`:32`). Doc: — | Leitura, sem efeito colateral. **Conforme.** |
| **R2** `GET /rfqs/:id` | `include` fixo (`SequelizeRfqRepository.ts:16-39`). Doc: — | Leitura. **Conforme.** |
| **R3** `GET /rfqs/:id/comparison` | **O critério de comparação vive só aqui**: menor preço unitário e menor prazo por item (`GetRfqComparisonUseCase.ts:46-55`), `line_total = qty × unit_price` (`:59`), `supplier_totals` ordenado asc (`:108`). Doc: `docs/suprimentos/01-COMPRAS.md:28` ("Análise Técnica + Comercial") **sem definir critério**. → **T-27-03**, **T-27-02** | Leitura sem lock; o mapa é retrato não congelado — pode mudar entre a leitura e o `award` (**T-27-01**) |
| **R4** `POST /rfqs` | XOR `requisition_id`/`items` (`rfqValidators.ts:24-27`); G12: requisição `ordered/partial/received/canceled` não cota (`CreateRfqUseCase.ts:38,93-99`); só item `pending` (`:41,108-116`); `RFQ-<ano>-NNNN` por contagem (`:139-141`) | Transação no controller (`rfqController.ts:102`), commit `:114`, `rollbackIfPending` `:127`. `count+1` sob concorrência — colisão barrada por `rfqs_rfq_number_key UNIQUE` (baseline `:17943-17947`), mapeada por `errorHandler.ts:73-78`. **Sem chave de idempotência**: duas chamadas criam **duas RFQs** da mesma requisição; dano absorvido no `award` (`AwardRfqUseCase.ts:212-240`). `findById` (`CreateRfqUseCase.ts:133`) lê **fora** da transação → **T-27-12** |
| **R5** `POST /:id/suppliers` | Lido por T-10; reconferido: `draft → sent`, convite idempotente | `findRfqByIdForUpdate` (`SequelizeRfqRepository.ts:78-80`) + `uq_rfq_suppliers_rfq_supplier` (baseline `:18471-18475`). **Conforme.** |
| **R6** `POST /:id/quotes` | Estado cotável `['sent','quoted']` (`RegisterRfqQuoteUseCase.ts:21,59-64`); fornecedor convidado (`:66-69`); item pertence à RFQ (`:71-82`); `unit_price` `positive()` **sem teto e sem piso** (`rfqValidators.ts:44`); upsert por par (`:84-101`). Doc: `01-COMPRAS.md:9,25` exige **mínimo 3 cotações** — **não implementado** (§3) | Transação (`rfqController.ts:137`) + `FOR UPDATE` (`RegisterRfqQuoteUseCase.ts:54`) + `uq_rfq_quotes_item_supplier` (baseline `:18463-18467`). **Idempotente: registrar duas vezes atualiza, não duplica** — e é essa propriedade que vira o vetor de **T-27-01** |
| **R7** `POST /:id/award` | Exige `quoted` (`AwardRfqUseCase.ts:114-119`); item não repete (`:121-129`); par tem de ter cotação (`:148-152,172-177`); G12 exige requisição `approved` e saldo (`:217-240`). **Não existe critério de escolha**: `awards[] = {rfq_item_id, supplier_id}` (`rfqValidators.ts:57-66`), sem justificativa e sem mínimo de cotações. Doc: `01-COMPRAS.md:31` sem critério nem aprovador → **BR-SUP-012**; **T-27-04** | Transação única (`rfqController.ts:220`), `FOR UPDATE` na RFQ (`:109`) e na requisição (`:212`), `quoted → awarded` (`:339`). **Segunda chamada concorrente serializa e cai no gate de status ⇒ não gera segundo pedido. Conforme.** Resíduo: `order_number = PO-${Date.now()}` (`shared/utils/strings.ts:58-60`) barrado por `purchase_orders_order_number_key` (baseline `:17823-17827`) |
| **P1** `GET /customers/:id/prices` | Cliente existe (`ListCustomerPricesUseCase.ts:27-30`); `active_only` (`:32`). Doc: — | Leitura. **Conforme.** |
| **P2** `POST /customers/:id/prices` | Cliente e produto existem (`CreateCustomerPriceUseCase.ts:46-54`); `valid_until >= valid_from` (`:56-58`); **BR-COM-011** não-sobreposição (`:60-65` + `_findOverlap` `:92-105`, `NULL` = infinito `:101-102`); `unit_price` `positive()` (`saleValidators.ts:93`) — **sem teto, sem piso, sem alçada** | **Sem transação. Sem lock. Sem UNIQUE/EXCLUDE em `customer_price_lists`** (baseline `:16679-16683` só PK; `:18975-18992` três índices **não** únicos) ⇒ **BR-COM-011 derrotável por concorrência** → **T-27-05** |
| **P3** `PUT /customers/:id/prices/:priceId` | Preço pertence ao cliente (`UpdateCustomerPriceUseCase.ts:41-44`); vigência (`:49-51`); sobreposição só se `active` (`:53-60`); `product_id` não alterável (`saleValidators.ts:99-104`). **Qualquer `vendas:operate` altera preço de qualquer cliente, em qualquer magnitude, sem aprovação** | Sem transação; `price.save()` (`:67`) após leitura não travada. **Não registra valor anterior** (`saleController.ts:320-327` passa `newValues`, não `oldValues`, que `auditLogService.ts:26,128,150` suporta); tabela sem `updated_by` (baseline `:4707-4719`) → **T-27-06** |
| **P4** `DELETE /customers/:id/prices/:priceId` | Soft delete `active = false` (`DeactivateCustomerPriceUseCase.ts:33-35`). Idempotente por natureza | Escrita única, atômica. Log sem valores (`saleController.ts:350-356`) → **T-27-06** |

## 3. Conformidade documentada × implementada (§19 do Master Spec)

| BR-ID | Documentado (âncora relida) | Implementado (âncora relida) | Veredito |
|---|---|---|---|
| **BR-SUP-011** | `docs/suprimentos/01-COMPRAS.md:9` — "Solicitar **mínimo 3 cotações** para cada material"; `:25` — "3. Cotação (mínimo 3)" | `rfqValidators.ts:39` — `supplier_ids: z.array(...).min(1)`; `:64` — `awards ... .min(1)`. **Nenhuma contagem de cotações recebidas em ponto algum** (varredura própria dos 5 use cases + controller) | **DIVERGENTE — doc 3, código 1.** Padrão literal do §19. **Sem teste dos dois lados** (`rfq.test.ts`, 700 linhas, nenhum caso). `ConvertRequisitionToPurchaseOrdersUseCase` gera pedido com **zero** cotações. Já catalogada; reconfirmo e **não re-emito** |
| **BR-SUP-012** | `01-COMPRAS.md:28-31` — "Análise Técnica + Comercial" → "Escolha do Fornecedor", **sem critério e sem aprovador** | `AwardRfqUseCase.ts:141-177` aceita qualquer fornecedor com cotação; `notes` opcional (`rfqValidators.ts:65`); **nenhuma leitura de `is_best_price`** | **VAZIO DE REGRA confirmado.** O menor preço só existe como **default de UI**: `client/src/pages/purchases/RfqPage.tsx:731-732` pré-seleciona `is_best_price` e o operador troca sem justificar. **O critério não é auditável** |
| **BR-COM-008** | Nenhum requisito define quem define preço nem se vincula | JSDoc `CreateCustomerPriceUseCase.ts:8-12` afirma que *"a sugestão de preço acontece na camada de apresentação/frontend, que consulta `GET .../prices` ao montar o item do pedido"* | **DIVERGENTE — a afirmação é falsa no `AUDIT_COMMIT`.** Grep próprio de `listCustomerPrices` em `client/src`: **2 ocorrências** — `api/sales.ts:118` (definição) e `pages/sales/ClientsPage.tsx:210` (o próprio CRUD). `SalesPage.tsx:75,111,200` digita `unit_price` livre. **Nenhum consumidor lê a tabela** → **T-27-07** |
| **BR-COM-011** | Sem documento de origem | `CreateCustomerPriceUseCase.ts:60-65`, `:92-105` | **IMPLEMENTADA, não atômica** → **T-27-05** |
| **BR-SUP-013** | `TODO.md` (pendência aberta) | `AwardRfqUseCase.ts:277-292` sem `origin` ⇒ DEFAULT `national` | Reconfirmada; já é T-10-03, não re-emito |

**Regras vivas sem BR-ID** (insumo a `T14-F05`): (a) estados cotáveis `['sent','quoted']`
(`RegisterRfqQuoteUseCase.ts:21`); (b) upsert de cotação como política de correção (`:96-100`);
(c) `quoted` como único estado adjudicável (`AwardRfqUseCase.ts:114`); (d) realimentação
automática de `item_suppliers` (`:313-336`); (e) `NULL` de vigência = infinito
(`CreateCustomerPriceUseCase.ts:101-102`); (f) `product_id` imutável na edição de preço
(`saleValidators.ts:99-104`). **Nenhuma tem owner.** Regra 21 ⇒ escalo ao director.

## 4. Findings — todos `PROPOSED` (Regra 22)

### T-27-01 — HIGH · CONFIRMED

**A cotação de um fornecedor pode ser reescrita depois que os preços dos concorrentes já são
visíveis, e nem o valor anterior nem o novo ficam registrados.**

- `RegisterRfqQuoteUseCase.ts:59-64` — aceita registro enquanto a RFQ estiver `sent` **ou
  `quoted`**; `quoted` é exatamente o estado em que o mapa comparativo já existe.
- `GetRfqComparisonUseCase.ts:57-86` — `GET /:id/comparison` expõe `unit_price` de **todos** os
  fornecedores a qualquer `compras:operate` (`rfqs.ts:16`).
- `RegisterRfqQuoteUseCase.ts:96-100` — havendo cotação do par, faz `updateRfqQuote` **sem
  guardar o valor anterior**.
- `rfq_quotes` (baseline `:12014-12025`) só tem `created_at`/`updated_at`: **não há histórico de
  cotação**.
- `rfqController.ts:187-194` — o `logAction` de `register_quote` grava `supplier_id` e `status`;
  **não grava preço nem `oldValues`**. Contraste interno: `createCustomerPrice` grava
  `newValues:{unit_price...}` (`saleController.ts:286`).

**Efeito:** quem digita as cotações vê o mapa e pode rebaixar/elevar o preço de qualquer
fornecedor até o `award`, sem rastro do valor substituído. O log prova *que houve* registro; não
prova *o que foi registrado*.

**Categorias G3:** processo competitivo/favorecimento, integridade da trilha de auditoria.
**Atenuante:** `updated_at` + log datado permitem detecção *ex post* parcial, nunca
reconstituição.

**Nota de honestidade:** MEDIUM é defensável por quem considerar o upsert decisão de produto
(JSDoc `:6-8` declara "permite corrigir um preço digitado errado"). Proponho **HIGH** porque a
intenção declarada não exige janela aberta em `quoted` **nem** ausência de valor no log; as duas
escolhas juntas removem a auditabilidade de um ato de decisão econômica em módulo de PRODUÇÃO.
**Sem teste** (`rfq.test.ts:339-354` cobre o upsert como funcionalidade desejada).

### T-27-02 — MEDIUM · CONFIRMED

**`validity_date` e `moq` são coletados, persistidos e nunca aplicados: adjudicar cotação
vencida ou abaixo do lote mínimo é aceito em silêncio.**

Varredura própria em todo `server/src`: `rfqValidators.ts:46-47`,
`RegisterRfqQuoteUseCase.ts:91-92`, `GetRfqComparisonUseCase.ts:79-80`,
`AwardRfqUseCase.ts:162,321`, `models/RfqQuote.ts:34-35`. **Zero comparações** — nenhuma contra
`new Date()`, nenhuma contra `rfq_items.quantity`. O baseline `:12029-12032` **declara** a
semântica ("Validade da cotacao informada pelo fornecedor") que o código não honra;
`is_best_price` (`GetRfqComparisonUseCase.ts:83`) pode premiar cotação vencida. Sem regra
documentada e sem teste. A política é decisão humana (Regras 6/21).

### T-27-03 — MEDIUM · CONFIRMED

**`supplier_totals` ranqueia fornecedores por totais não comparáveis entre si.**

`GetRfqComparisonUseCase.ts:63-71` acumula apenas os itens que aquele fornecedor cotou; `:108`
ordena asc por `total_amount`. Quem cotou 1 de 5 itens aparece **em primeiro lugar**. Defeito de
apresentação decisória, não de cálculo. **Atenuante material:** `items_quoted_count` é devolvido
(`:69`) **e exibido** no client (`RfqPage.tsx:855`) — por isso MEDIUM. Nenhuma regra documentada
define como comparar propostas parciais.

### T-27-04 — HIGH · CONFIRMED

**A adjudicação é ato aprovatório que gera compromisso de compra e não tem segregação de função:
o mesmo usuário cria a RFQ, digita as cotações de todos os fornecedores e adjudica.**

Verificação própria, sem analogia com `FIND-ERP-009`:

- Grep próprio de `assertApproverIsNotRequester` em `server/src`: **4 call sites** —
  `ApproveImportProcessUseCase.ts:82`, `ChangePurchaseRequisitionStatusUseCase.ts:104`,
  `ChangePurchaseStatusUseCase.ts:134`, `ApprovePurchaseUseCase.ts:86`. **Nenhum em `rfq`.**
- `AwardRfqUseCase.ts:108-379` não lê `rfq.created_by` nem o autor das cotações; a única dimensão
  é o nível de rota (`rfqs.ts:20`).
- O ato **cria pedido de compra** (`:277-292`) e **altera o catálogo de preços**
  `item_suppliers` (`:313-336`).
- `docs/suprimentos/01-COMPRAS.md:57-62` lista **4 atos** cobertos por D-K; a adjudicação **não
  está na tabela**, nem como ausência justificada.

**Compensação parcial, medida:** o pedido nasce com `requester_id: input.userId`
(`AwardRfqUseCase.ts:280`) — o adjudicador vira solicitante do PO, e D-K
(`ChangePurchaseStatusUseCase.ts:134-140`) o barra de aprová-lo. A cadeia "adjudicar + aprovar o
PO" exige duas identidades. O que **não** existe é controle sobre a escolha do vencedor: um único
`compras:approve` decide sozinho **quem vende e a que preço**, e a aprovação do PO já recebe
fornecedor e preço congelados.

**Agravante sistêmico, não originado aqui:** `middlewares/auth.ts:226-229` libera
`role === 'admin'` antes de qualquer checagem. **Insumo formal a T-09** — não promovo nem altero
o `FIND-ERP-009`.

### T-27-05 — HIGH · CONFIRMED

**BR-COM-011 é regra de aplicação única em memória, sem transação, sem lock e sem constraint:
duas requisições simultâneas criam a sobreposição que a regra existe para impedir.**

- `CreateCustomerPriceUseCase.ts:60-65` read-then-write; `:92-105` comparação **em memória**.
- `SequelizeSaleRepository.ts:233-245` — `findAll` e `create` **sem `transaction`** e sem lock.
- `saleController.ts:263-291` — **nenhuma** `sequelize.transaction()` (contraste literal:
  `rfqController.ts:102,137,220`).
- Banco: `customer_price_lists` tem **PK e nada mais** (baseline `:16679-16683`); os 3 índices
  (`:18975-18992`) **não são únicos**; sem `EXCLUDE`, sem `CHECK`.
- `UpdateCustomerPriceUseCase.ts:53-60` herda a mesma janela.

**Efeito:** dois preços ativos e vigentes para o mesmo par cliente×produto — e, como **nenhum
consumidor** resolve a ambiguidade (T-27-07), o desempate não existe. Mesma família de
`T13-F02`/`T13-F03`, **sem concluir por analogia**: a ausência de constraint foi lida diretamente
no baseline. **Sem teste de concorrência** — `customer-price-list.test.ts:78-89` cobre o caso
**sequencial** com repositório mockado.

### T-27-06 — MEDIUM · CONFIRMED

**Alteração de preço de cliente não é rastreável ao valor anterior, e a tabela não guarda quem
alterou.**

`customer_price_lists` (baseline `:4707-4719`) tem `created_by` e **não tem `updated_by`**; o
model repete (`models/CustomerPriceList.ts:41`). `saleController.ts:320-327` passa `newValues` e
**não** `oldValues` (suportado em `auditLogService.ts:26,128,150`); `:350-356` (delete) não passa
valor nenhum. `UpdateCustomerPriceUseCase.ts:62-68` altera in place; não há tabela de histórico.

**Resposta direta ao item do mandato "a alteração é rastreável?": parcialmente — autor e novo
valor sim; valor anterior não.**

### T-27-07 — MEDIUM · CONFIRMED

**A tabela de preços por cliente é cadastro órfão, e a documentação inline afirma o contrário.**

Âncoras em §3 (BR-COM-008). **Efeito:** um preço negociado de R$ 100 não impede — nem sinaliza —
venda a R$ 1,00. Combinado com **BR-COM-009** (desconto sem teto) e **T-10-02** (desconto não
chega à NF-e), o preço efetivamente cobrado do cliente não tem **nenhuma** âncora de política no
sistema. O mérito ("deveria vincular?") é decisão humana; o que reporto é a divergência entre
dois artefatos versionados.

### T-27-08 — MEDIUM · CONFIRMED

**Definir preço de cliente não é tratado como ato de alçada.**

`sales.ts:40-42` — as três escritas exigem `vendas:operate`, idêntico a `POST /api/sales`
(`:45`). `accessModules.ts:248` — os níveis são **apenas** `'operate' | 'approve'`; o módulo
`vendas` **tem** `approve` em uso (`sales.ts:54,56`, NF-e), logo a distinção existia e não foi
aplicada ao preço. `saleValidators.ts:93,100` — `unit_price` apenas `positive()`: sem teto, sem
piso, sem comparação com custo. **Ponto de aprovação ausente**, não ponto de aprovação sem
segregação — distinção entregue a T-09 sem conclusão própria.

### T-27-09 — LOW · CONFIRMED

**Comentário normativo de rota contradiz o middleware.** `sales.ts:15-16` afirma "leituras exigem
`view` implicito"; `:22-23` repete. **Não existe nível `view`**: `accessModules.ts:248` declara
`AccessModuleLevel = 'operate' | 'approve'` e `auth.ts:215` usa `'operate'` como default.
Controle efetivo **correto**; documentação induz a erro. Mesma classe de **T-10-07** — **segunda
ocorrência**, o que torna o padrão sistêmico. `rfqs.ts:8-12` **não** incorre no erro.

### T-27-10 — MEDIUM · CONFIRMED

**Cobertura de teste: as regras implementadas têm teste; as regras contestadas não têm nenhum.**

| Regra crítica | Teste |
|---|---|
| G12 (criação e adjudicação) | **SIM** — `rfq.test.ts:178-243`, `:548-698` |
| Upsert de cotação e `sent → quoted` | **SIM** — `:290-355` |
| Mapa comparativo | **SIM** — `:357-409` |
| Adjudicação: status, duplicidade, par sem cotação, produto legado | **SIM** — `:485-539` |
| BR-COM-011 sequencial e soft delete | **SIM** — `customer-price-list.test.ts:78-89`, `:116-127` |
| Mínimo de 3 cotações (BR-SUP-011) | **NÃO** |
| Critério de adjudicação / justificativa de desvio (BR-SUP-012) | **NÃO** |
| Validade e MOQ (T-27-02) | **NÃO** |
| Segregação no `award` (T-27-04) | **NÃO** |
| Atomicidade da não-sobreposição (T-27-05) | **NÃO** |
| Rastreabilidade do preço anterior (T-27-06) | **NÃO** |
| Vinculação do preço de tabela à venda (T-27-07) | **NÃO** |

**Padrão:** existe teste para tudo que o código **faz** e para nada que o código **deveria decidir
e não decide**. Nenhum teste afirma uma **ausência** — e ausência não testada é ausência que
remediação futura pode reintroduzir sem quebrar nada.

### T-27-11 — INFO — conformidades, com o mesmo peso

1. Toda escrita de `rfq` roda em transação única com rollback protegido contra `commit` duplo
   (`rfqController.ts:55-59,102,137,220`).
2. Os dois pontos de concorrência real estão travados: `FOR UPDATE` em
   `RegisterRfqQuoteUseCase.ts:54` e `AwardRfqUseCase.ts:109` (+ requisição em `:212`).
3. Idempotência com respaldo de banco: `uq_rfq_quotes_item_supplier` (baseline `:18463-18467`) e
   `uq_rfq_suppliers_rfq_supplier` (`:18471-18475`).
4. Adjudicação dupla não gera pedido duplicado: lock + gate `quoted` (`:114-119`).
5. G12 fechado nos dois caminhos, com teste.
6. `award` exige `compras:approve` explícito (`rfqs.ts:20`) — **não** repete `CAND-AUTHZ-01`.
7. Preço de cliente usa soft delete (`DeactivateCustomerPriceUseCase.ts:33`).
8. `status` de `rfq` fechados por `z.enum` (`rfqValidators.ts:33`).

### T-27-12 — INFO

`CreateRfqUseCase.ts:133` valida itens **fora** da transação do controller e `:88` lê a requisição
**sem `FOR UPDATE`**. Não produz escrita inconsistente — a guarda de saldo que importa está no
`award`, sob lock. Registrado para não ser "redescoberto" como defeito nem removido por
remediação sem análise.

## 5. Confronto com o contexto já estabelecido

**`CAND-AUTHZ-01` aparece nas minhas rotas?**

| Elemento do padrão | `rfq` | `customer prices` |
|---|---|---|
| `authorizeModule(...)` sem nível em **leitura** | SIM (`rfqs.ts:14,15,16`) — **efeito nulo** (leitura exige `operate`, o mínimo existente) | SIM (`sales.ts:39`) — idem |
| `authorizeModule(...)` sem nível em **ato aprovatório** | **NÃO** — `award` declara `'approve'` (`rfqs.ts:20`) | **NÃO EXISTE ato aprovatório** (T-27-08) |
| Truthiness de papel/nível no controller | **NÃO** — `rfqController.ts` não lê `req.user.role` em ponto algum; usa `req.user.id` só como autoria (`:110,230`) | **NÃO** — `saleController.ts:278` usa `req.user.id` só como `created_by` |

**Veredito:** `CAND-AUTHZ-01` **não se reproduz** nestas 11 rotas. O que existe é problema
**diferente**: em `rfq`, gate de nível sem segregação (T-27-04); em preços, **ausência de gate de
alçada** (T-27-08). Fundir os dois inflaria o candidato por associação — mesmo critério de T-10 §1.

**`FIND-ERP-009`:** não concluo por analogia e **não reproduzo o placar** (o
`AUDIT_COVERAGE_EXECUTED.md` §1.1 registra que 23 das 28 linhas não foram reconferidas). Entrego
**dois candidatos nominais** ao denominador: `POST /api/rfqs/:id/award` (ponto de aprovação **sem**
segregação, com compensação parcial medida) e as 3 escritas de preço (**sem** ponto de aprovação).
A incorporação é decisão de T-09/director.

## 6. Divergências registradas (Regra 20 — registro, nunca conciliação)

- **DIV-T27-01** — escopo declarado (≈5 endpoints) × real (**11 rotas**, 4 delas de leitura com
  regra decisória).
- **DIV-T27-02** — BR-SUP-011: `01-COMPRAS.md:9,25` (mínimo 3) × `rfqValidators.ts:39` (`min(1)`).
  **Não decido qual lado é o certo** (Regra 20-21).
- **DIV-T27-03** — `CreateCustomerPriceUseCase.ts:8-12` × `client/src` (nenhum consumo).
- **DIV-T27-04** — comentário de coluna do baseline `:12029-12032` × ausência total de comparação
  de `validity_date`.
- **DIV-T27-05** — `sales.ts:15,22` (nível `view`) × `accessModules.ts:248` (inexistente).
- **DIV-T27-06 — owner.** Nenhuma regra de `rfq`/preço tem owner nomeado;
  `BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md:203-204` atribui BR-SUP-011 ao
  **departamento** COMP — departamento não é responsável por regra. Regra 21: fonte autoritativa
  **não determinável** ⇒ escalo ao director.

## 7. Cobertura declarada (condição (b) do G3) — sem arredondamento

| Superfície | D3 | D4 | Base |
|---|---|---|---|
| `rfq` — 7/7 rotas | **E 7/7** | **E 7/7** | leitura integral de `rfqs.ts`, `rfqController.ts` (257 linhas), `rfqValidators.ts` (81), `CreateRfqUseCase` (166), `RegisterRfqQuoteUseCase` (117), `GetRfqComparisonUseCase` (114), `AwardRfqUseCase` (383), `SequelizeRfqRepository` (171) |
| `customer prices` — 4/4 rotas | **E 4/4** | **E 4/4** | 4 use cases, 4 handlers (`saleController.ts:237-360`), 5 schemas (`saleValidators.ts:75-104`), model e repositório (`:205-245`) |
| Tabelas de preço | **E** (`customer_price_lists`, `rfq_quotes`: DDL, constraints, índices, FKs) | **E** | baseline `:4704-4781`, `:12011-12052`, `:16679-16683`, `:18463-18475`, `:18975-18992`, `:22468-22488`, `:25332-25344` |
| Testes do escopo | **E** — 2 suítes lidas integralmente | — | `rfq.test.ts`, `customer-price-list.test.ts` |

**O que NÃO foi coberto, declarado:** (1) `InviteRfqSuppliersUseCase` foi **reconferido**, não
relido linha a linha — cobertura herdada de T-10, declarada como tal; (2) `AwardRfqUseCase` foi
**relido integralmente**, sem dependência herdada nas afirmações de T-27-04; (3) **nenhuma prova
dinâmica** — a contornabilidade efetiva de T-27-01 e T-27-05 permanece não provada por execução;
(4) `client/` foi lido de forma **dirigida** (`SalesPage.tsx`, `ClientsPage.tsx`, `RfqPage.tsx`,
`api/sales.ts`, `api/rfq.ts`) só para adjudicar T-27-03 e T-27-07 — **não** é cobertura de T-21.

**Estado da trilha:** `READY_TO_CLOSE_BLOCKED_BY_G4`. **Efeito sobre `DEF-03`/`RES-T10-01`:** a
promessa **E** de C-10/C-11 está coberta em D3 e D4 para `rfq` 7/7 e para as 4 rotas de preço.
**Não declaro o déficit fechado** — quem declara é o consolidator/director.

## 8. DYN sugeridos (alvo exclusivo `erp_evok_audio_test`, se e quando G4 autorizar)

| ID | Sondagem | Prova |
|---|---|---|
| `DYN-T27-A` | RFQ `quoted` com 2 cotações → `GET /:id/comparison` → `POST /:id/quotes` reescrevendo o preço do concorrente → conferir `audit_logs` e `rfq_quotes` | **T-27-01** |
| `DYN-T27-B` | 2 `POST /customers/:id/prices` simultâneos, vigências sobrepostas | **T-27-05** |
| `DYN-T27-C` | cotação com `validity_date` no passado → `award` | **T-27-02** |
| `DYN-T27-D` | mesmo usuário: `POST /rfqs` → `POST /:id/quotes` (2 fornecedores) → `POST /:id/award` | **T-27-04** |
| `DYN-T27-E` | `PUT /customers/:id/prices/:priceId` → inspecionar `audit_logs.old_values` | **T-27-06** |

## 9. Handoffs

- **T-09 / dono do `FIND-ERP-009`** — 2 candidatos nominais ao denominador (§5), não promovidos
  aqui.
- **T-14** — 6 regras vivas sem BR-ID (§3), insumo a `T14-F05`; reconfirmação independente de
  BR-SUP-011/012/013 e BR-COM-008/011.
- **T-13** — `customer_price_lists` sem UNIQUE/EXCLUDE (T-27-05): mesma família de
  `T13-F02`/`T13-F03`, tabela **não** listada naqueles findings.
- **T-20** — T-27-10. **T-23** — DIV-T27-03/04/05.
- **`vericore-finding-validator`** — T-27-01, T-27-04, T-27-05 (HIGH, Regra 22).
- **`vericore-audit-evidence-controller`** — persistência em `audit/`.
- **`vericore-software-audit-director`** — Regra 21 (DIV-T27-06) e a impossibilidade de gravação
  na sessão do agente titular.

**Nada foi corrigido (Regra 2). Nenhum finding confirmado ou fechado (Regras 3, 4).**
