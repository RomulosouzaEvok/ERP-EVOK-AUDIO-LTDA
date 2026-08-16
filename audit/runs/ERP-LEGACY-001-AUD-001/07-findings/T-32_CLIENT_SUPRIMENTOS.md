# T-32 — `client/`, trilha 4/6: Compras, Produtos e Logística

**Run:** `ERP-LEGACY-001-AUD-001` · **Célula:** `C-133` · **AUDIT_COMMIT:**
`c1311a6f76b512fef893f7e60d934179cae3409f`
**Mandato:** UI × backend. Veredito de autorização é do `authorization-auditor` (Regra 4).
**Status:** `PROPOSED`.

> **Nota de persistência.** Write bloqueado na sessão do agente. Persistido pelo orquestrador **sem
> alteração**.

## 1. Inventário próprio

`Glob client/src/pages/{purchases,products,logistics}/**/*.tsx` → **23 arquivos** (22 de produção +
1 de teste). O escopo recebido dizia "22 páginas"; **divergência de contagem, não de conteúdo**
(Regra 20). Some-se `purchases/comexShared.ts`.

**Cobertura: 24/24.** Lacuna: `shared/DepartmentRequisitionsPage`, destino do wrapper de 12 LOC de
`LogisticsRequisitionsPage.tsx`, é compartilhado com outra trilha.

## 2. Findings

### `T32-SUP-F01` — HIGH · Alçada G11 do pedido de compra existe só no servidor; não há UI para consultá-la nem satisfazê-la

Backend tem dois endpoints dedicados: `POST /api/purchases/:id/approve` (`routes/purchases.ts:48`,
`authorizeModule('diretor')`) e `GET /api/purchases/:id/approvals` (`:49`), com o gate aplicado antes
do `save()` (`ChangePurchaseStatusUseCase.ts:142,199-216`).

O cliente **não tem nenhum dos dois**: `client/src/api/purchases.ts` expõe só `listPurchases`,
`createPurchase`, `getPurchase`, `updatePurchaseStatus`, `receivePurchaseItems`,
`getPurchaseCockpit` (`:56-116`). Em `PurchasesPage.tsx:272-276` o botão "Avançar para 'Aprovado'"
aparece para todo `canWrite` sempre que `NEXT_STATUS[status]` existir, sem consultar a alçada.

Pedido de importação, ou nacional acima de `PURCHASE_APPROVAL_THRESHOLD_DIRECTOR = 500000`
(`purchases/domain/constants.ts:74`), entra em **impasse funcional**: o comprador leva 422 e o
diretor não tem tela para registrar a aprovação. O backend chega a instruir o usuário final com uma
rota HTTP crua (`ChangePurchaseStatusUseCase.ts:213`).

**Não é decisão de escopo:** o padrão correto existe duas vezes no repositório —
`ImportApprovalGateCard.tsx:15-24` ("nunca é inferida … de um efeito colateral") e
`ContractsTab.tsx:339-341`. Compras é o único dos três com alçada no backend e sem gate no frontend.

### `T32-SUP-F02` — HIGH · RFQ: a UI sobrescreve cotação de concorrente sem mostrar o valor anterior, sem avisar e sem justificativa

Frente de UI de `T27-RFQ-01` — aprofundamento, não reauditoria. Respostas às três perguntas:

1. **Deixa claro que sobrescreve?** Não. `QuoteTab` pré-carrega a cotação existente nos inputs
   (`RfqPage.tsx:560-578`). Indistinguível de formulário novo. Botão (`:702`) e retorno
   "Cotação registrada com sucesso" (`:693`) idênticos nos dois casos.
2. **Mostra o valor anterior?** Não. É o próprio conteúdo do input; ao digitar por cima ele some,
   sem exibir valor prévio, autor ou data.
3. **Permite justificar?** Não. `QuoteFieldState` declara `notes` (`:543-549`) e o `mutationFn` o
   envia (`:590`), mas **nenhum input de `notes` é renderizado** (`:646-688`). Campo permanentemente
   vazio.

Servidor: `RegisterRfqQuoteUseCase.ts:96-101` é upsert puro, sem versão, histórico ou motivo;
`QUOTABLE_STATUSES` (`:21`) segue aceitando registro em `quoted`, depois do mapa comparativo já ter
exposto os concorrentes.

**Agravante exclusivo do cliente:** `ComparisonTab` pré-seleciona o vencedor
(`RfqPage.tsx:725-736`) e a troca é um `<input type="radio">` sem confirmação nem motivo
(`:817-826`). Na mesma sessão e no mesmo dialog convivem "Registrar cotação" (`:376-379`) e a
adjudicação. `AwardRfqUseCase.ts:108-164` não tem checagem de segregação — contraste com
`ChangePurchaseStatusUseCase.ts:134-140`.

### `T32-SUP-F03` — HIGH · "Estoque inicial" no cadastro cria saldo sem movimento e sem depósito

Três telas oferecem quantidade inicial: `ProductsPage.tsx:44,189-191`, `ItemMasterPage.tsx:58,202-203`,
`UsageItemsTab.tsx:34,197-198`. `createProductSchema` aceita `quantity` (`productValidators.ts:63`) e
a criação **não passa por `WarehouseStockService`** — ao contrário de
`CreateInventoryMovementUseCase.ts:97-120`, que faz o dual-write.

Produto criado com 100 aparece com 100 na visão "Todos os depósitos" (`BalancesTab.tsx:48-52,192`,
lê `products.quantity`) e **zero** em qualquer depósito (`:54-58`), **sem linha alguma no extrato**.

Prova de que é defeito e não desenho: `updateProductSchema` **exclui** `quantity` deliberadamente
(`productValidators.ts:79-96`). O caminho de criação ficou aberto. Cruza com `AUD-INTEG-03`: além do
mobile, a própria tela web de cadastro injeta saldo fora do razão.

### `T32-SUP-F04` — HIGH · Dois caminhos de UI para o mesmo `receive`, com campos diferentes; um não informa depósito nem lote

Resposta direta à pergunta do escopo: **depende da tela.**

| | `ReceivingConferenceDialog` | `PurchasesPage → ReceiveItemsDialog` |
|---|---|---|
| `invoice_number` | ✔ `:162-166` | ✔ `:442-448` |
| `warehouse_code` | ✔ `:168-174` | ✘ **ausente** |
| `lot_number` | ✔ `:209-215` | ✘ **ausente** |
| `expires_at` | ✔ `:216-218` | ✘ **ausente** |

`ReceiveItemsDialog` (`PurchasesPage.tsx:415-424`) monta só
`{ invoice_number, items:[{item_id, quantity}] }`; o backend cai no default `'INSUMOS'`
(`purchaseValidators.ts:57-61`) e cria lote sem número nem validade. **Um recebimento de amostra de
engenharia por essa tela vai ao depósito errado silenciosamente** — justo o roteamento prometido ao
usuário em `RequisitionsPage.tsx:241-243,564-568`. Agravante: `api/purchases.ts:80-89` declara cinco
campos de rastreabilidade, dos quais só dois têm input, em uma só das telas.

### Demais findings

| ID | Achado | Sev. |
|---|---|---|
| `F05` | UI decide autorização por `role`; backend por módulo. **`contagens:approve` é inalcançável pela web** — `InventoryCountsPage.tsx:81` usa `hasRole('admin')` para Aprovar/Rejeitar/Reatribuir (`:408-436`) contra `authorizeModule('contagens','approve')` (`routes/inventoryCounts.ts:27,30,31`). A página nunca lê `permissions` — confirmado pelo próprio teste (`.test.tsx:21-25`). **É a aprovação que dispara o ajuste real de estoque** (`:430`) | MEDIUM |
| `F06` | `ProductsPage → ProductSuppliersDialog` não aplica `canWrite` em "Novo vínculo" (`:606-615`), no formulário (`:617-690`) nem em Editar/Desativar (`:720-737`); o gêmeo em `ItemMasterDetailPage.tsx:548,643,658` aplica. Dois componentes gêmeos, duas políticas | MEDIUM |
| `F07` | A única proteção contra lançamento duplicado de movimento é estado efêmero do cliente. `isSubmitting` **não cobre a requisição** (`:356`, `mutate` retorna `void`); a barreira real é só `mutation.isPending` (`BalancesTab.tsx:387`), memória de uma aba. Contraste: `receive` tem dedup real por constraint `(purchase_id, invoice_number)` (`ReceivePurchaseItemsUseCase.ts:93,103`) | MEDIUM |
| `F08` | `invoice_date`/`due_date` aceitos pelo backend (`purchaseValidators.ts:62-71`, alimentam o vencimento da AP do G13) e **ausentes de toda UI**. **Todo passivo do ERP nasce com vencimento sintético** (fallback recebimento + 30 dias) | MEDIUM |
| `F09` | O alerta didático expõe chaves cruas de `details` (`translateApiError.ts:212-215`; só 4 chaves têm rótulo, `:127-132`). Para o G11 o operador vê `rule: G11 · origin: national · approvalValue: 750000 · missingRoles: diretor` e **perde** a mensagem em português. O JSDoc promete o oposto (`:21-22`) | MEDIUM |
| `F10` | Segregação D-K imposta no servidor (`ChangePurchaseStatusUseCase.ts:134-140`, "inclusive `role='admin'`") e invisível na UI: `Purchase` no cliente nem carrega `requester_id` (`api/purchases.ts:16-41`) e o botão aparece para o próprio solicitante | MEDIUM |
| `F11` | Inativação de depósito irreversível pela API, **sem confirmação** (`WarehousesPage.tsx:292-295`, ao contrário de ações menores na mesma trilha) e **sem checagem de saldo** em nenhum dos lados (`UpdateWarehouseUseCase.ts:50-55`). Depósito com saldo some da lista e o saldo fica órfão | MEDIUM |
| `F12` | `UsageItemsTab`: filtro por tipo só no cliente sobre página já paginada (`:61-67,102-104,261`) — pode dizer "nenhum item encontrado" com a paginação anunciando várias páginas | LOW |
| `F13` | Movimentação manual com depósito em default silencioso (`BalancesTab.tsx:318,345,365-375`) e **sem campo de lote**. A equipe já resolveu o risco equivalente ao contrário em `SuppliersPage.tsx:26-31` ("um default silencioso gravava fornecedor estrangeiro como nacional") | LOW |
| `F14` | Conferência anuncia `máx. N` (`ReceivingConferenceDialog.tsx:205`) contra `quantity: z.string().optional()` sem `max` (`:27-33`). Backend impõe (`ReceivePurchaseItemsUseCase.ts:154-160`) — defeito é anunciar regra que não exerce. Nota: a tabela acopla `fields[index]` a `purchase.items[index]` por posição (`:189-190`) — hoje seguro, frágil se a ordenação mudar | LOW |

## 3. Conformidades verificadas

1. **Regra 24 — papel não é declarado pelo cliente.** `user.role` de `GET /api/auth/me` e do JWT
   verificado (`AuthContext.tsx:106-114`; `middlewares/auth.ts:69-128`); `permissions` resolvido no
   servidor a cada request a partir do `AccessProfile` do banco, sem cache no token (`:105-112`).
   Nenhuma página do escopo envia `role`/`isAdmin`/`perfil`. **Sem violação.**
2. **Adjudicação de RFQ:** `RfqPage.tsx:713-714` espelha `routes/rfqs.ts:20` e falha fechado com
   `permissions === null`.
3. **Transferências:** `TransfersTab.tsx:48` espelha `routes/inventory.ts:48-49`; motivo obrigatório
   na solicitação e na rejeição; o dialog declara que nenhum saldo muda antes da aprovação.
4. **CRUD de depósito:** `WarehousesPage.tsx:43` espelha `routes/inventory.ts:43-44`; `code`
   `disabled readOnly` no cliente e não editável no servidor.
5. **Expedição:** `canShip` (`ShippingPage.tsx:149`) é exatamente o gate de
   `ChangeSaleStatusUseCase.ts:159-168`, e a tela explica a pendência com link em vez de esconder.
6. **Gate G11-COMEX:** implementação de referência — estado lido de `GET /:id/approvals`, nunca
   inferido; bloqueio enquanto a consulta não responde (`ComexPage.tsx:441-449`;
   `ImportApprovalGateCard.tsx:68-75`); campos monetários nem oferecidos no embarque.
7. **Total do pedido é do servidor.** A soma client-side (`PurchasesPage.tsx:330`) é rotulada "Soma
   dos itens" e apresentada ao lado do total do servidor como conferência. **Nenhum cálculo de
   total, desconto ou saldo do escopo nasce no cliente.**
8. **Saldos são do servidor** — `BalancesTab`, `ExtractTab`, `LotsTab` só renderizam.
9. **Recebimento é idempotente por NF** — constraint única `(purchase_id, invoice_number)`.

## 4. Lacunas declaradas

Ordem/latência real do duplo clique (F07); renderização efetiva do `DidacticAlert` para o erro G11
(F09); `shared/DepartmentRequisitionsPage`; comportamento com `permissions === null`.

## 5. Encaminhamentos

- **`finding-validator`** (Regra 22): `F01`, `F02`, `F03`, `F04`.
- **`authorization-auditor`** (cruzamento): `F01`, `F05`, `F10`.
- **Achados já abertos, ampliados pelo lado do cliente:** `T27-RFQ-01`/`T27-RFQ-04` (via F02),
  `FIND-ERP-001` (via F07), `AUD-INTEG-03` (via F03 e F04).
