# Módulo Sales

## Objetivo

Gerenciar o ciclo de vida de Vendas ao cliente final: criação (com itens,
**reserva** de estoque e geração de parcelas em contas a receber) e
transições de status (`quote` → `confirmed` → `invoiced` → `shipped`, com
`canceled` disponível a partir de `quote`/`confirmed`/`invoiced`). Migrado
para a arquitetura em camadas (`domain` / `application` / `infrastructure` /
`presentation`) descrita na Fase 5 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`, seguindo o mesmo padrão
dos módulos `products`, `inventory`, `bom`, `production` e `purchases`.

Este módulo **não reimplementa** a lógica transacional de reserva/baixa/
entrada de estoque — isso continua 100% centralizado em
`server/src/services/inventoryService.ts` (`reserve` na confirmação,
`releaseReservation`/`releaseAllReservationsForSale` na alteração e no
cancelamento, `receive` na devolução do que já foi faturado). Os use cases
deste módulo são wrappers finos sobre os models Sequelize existentes
(`Sale`, `SaleItem`, `Product`, `Client`, `AccountReceivable`) e sobre
`InventoryService`.

---

## ⚠️ G9 (2026-08-10) — Confirmar RESERVA, faturar BAIXA

**Mudança de regra mais importante deste módulo até hoje.** Até 2026-08-09 a
confirmação do pedido chamava `InventoryService.consume` e dava **baixa
imediata** em `products.quantity`. A partir do gap G9 (decisão D-A do dono,
`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4):

| Evento | O que acontece com o estoque |
|---|---|
| Criar como `quote` | nada |
| Criar como `confirmed` / confirmar orçamento | **reserva** (`InventoryService.reserve({ saleId })`) |
| Alterar itens de venda `confirmed` | ajusta a **reserva** pelo delta |
| **NF-e autorizada** (`POST /api/sales/:id/nfe`) | **baixa** a quantidade faturada, consumindo a reserva (`services/saleStockService.ts`) |
| Cancelar | libera toda a reserva + devolve ao estoque só `invoiced_quantity` |
| `invoiced → shipped` | nada (a baixa já ocorreu) |

**Por quê:** Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º — a NF-e
é autorizada **antes** do fato gerador e a mercadoria só transita **depois**
da autorização de uso. Entre confirmar e faturar, a mercadoria ainda está
fisicamente na empresa; baixar ali fazia o saldo do sistema ficar menor que o
saldo real do galpão.

**Consequências práticas:**

- O que limita uma venda agora é o estoque **disponível**
  (`quantity - reserved_quantity`), não o saldo bruto. Material reservado por
  outro pedido — ou por uma OP — não pode ser vendido de novo.
- **Reserva não movimenta depósito.** O dual-write em
  `warehouseStockService` (ACABADOS) migrou junto com a baixa, para a
  autorização da NF-e, mantendo a invariante "saldo_total = SOMA por
  depósito" (`BUSINESS_RULES.md` §12 item 3) válida em todo instante.
- A baixa é **proporcional à quantidade faturada**: faturamento parcial de
  10 unidades em 4 + 6 gera duas baixas (4 e 6), consumindo a reserva aos
  poucos.
- **Requer a migration `20260810-000030-generalize-stock-reservations-for-sales-g9.cjs`**
  (torna `production_order_reservations.production_order_id` nullable, cria
  `sale_id` e o CHECK de exatamente-um-dono, e faz o backfill dos pedidos
  confirmados e não faturados). Ver `docs/database/DATABASE.md`, seção G9.
- Bug corrigido de tabela: cancelar um **orçamento** devolvia
  `item.quantity` ao estoque mesmo sem nunca ter debitado nada (estoque
  fantasma). Com a regra nova, `quote` não tem reserva nem quantidade
  faturada, então o cancelamento não movimenta estoque.

## Decisão de compatibilidade de rotas

O endpoint `/api/sales` (mesmos 4 paths, métodos e formato de resposta
JSON do controller anterior) agora é servido pelas rotas/controller deste
módulo (`presentation/routes/sales.ts` →
`presentation/controllers/saleController.ts`), registrado em
`server/index.ts`.

O arquivo anterior `server/src/routes/sales.ts` e o controller
`server/src/controllers/saleController.ts` **permanecem no repositório**
como referência histórica, mas **não são mais montados em nenhuma rota** —
evitando duplicidade de `/api/sales` e o risco de duas implementações
divergentes atenderem à mesma URL. Confirmado via `grep` que apenas
`server/index.ts` monta o módulo novo. Os arquivos anteriors podem ser
removidos em uma limpeza futura, uma vez confirmada a estabilidade da
migração.

A rota anterior importava `authorize` de `../middlewares/auth` mas nunca o
utilizava em nenhum handler — apenas `authenticate` era aplicado às 4
rotas. Esse comportamento foi preservado 1:1 no módulo novo (nenhuma rota
de vendas exige papel/permissão específica hoje; ver seção "Permissões").

Nenhum client precisa mudar: mesmos 4 endpoints, mesmos verbos HTTP, mesmo
envelope `{ success, data }` / `{ success, error }` (respostas de
sucesso). Uma pequena diferença de formato existe apenas nas respostas de
**erro** (mesmo padrão já adotado nos módulos `inventory`/`bom`/`production`/
`purchases`): erros de validação/regra de negócio agora são instâncias de
`AppError` (`server/src/errors`) e chegam ao cliente como
`{ success: false, error: { code, message } }` em vez do
`{ success: false, error: "mensagem em string" }` usado pelo controller
anterior. Erros propagados de `InventoryService` (que ainda usa
`Object.assign(new Error(...), { statusCode })`, não `AppError`) continuam
retornando `{ success: false, error: "mensagem" }` (string), pois o
`errorHandler` central já trata esse formato anterior separadamente — nenhuma
mudança de contrato nesse caso específico. O `statusCode` HTTP retornado é
o mesmo em todos os casos (400, 404, 409, 422). Erros inesperados (5xx)
mantêm o fallback genérico do `errorHandler`, igual ao anterior.

## F24 — Arredondamento de parcelas (já corrigido antes desta migração)

O `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` lista F24 como uma dívida técnica relacionada a arredondamento
impreciso de parcelas em `saleController.ts`. **Essa correção já havia sido
aplicada antes desta migração** (o controller anterior já calculava tudo em
centavos usando helpers locais `toCents`/`fromCents`, com a última parcela
absorvendo o resto da divisão inteira). Esta migração **não altera a
regra**, apenas troca os helpers locais duplicados por
`server/src/shared/utils/money.ts` (`toCents`/`fromCents`/`round2`), que já
existiam e eram usados por outros módulos migrados — evitando duas
implementações levemente distintas (`fromCents` local usava
`toFixed`/`parseFloat`; a versão compartilhada usa correção por
`Number.EPSILON` antes de `Math.round`, mais robusta para os mesmos casos
de uso). Comportamento numérico observável preservado para todos os valores
em reais/centavos normais de venda.

Fluxo preservado em `CreateSaleUseCase`:
1. Cada item tem seu `unit_price` convertido para centavos (`toCents`) e o
   total da venda é acumulado em centavos.
2. O desconto é convertido para centavos e subtraído do total.
3. Se `installments > 1`: `baseInstallmentCents = Math.floor(totalNetCents / installments)`
   e o resto (`totalNetCents % installments`) é somado exclusivamente à
   **última** parcela, garantindo que a soma das parcelas seja sempre
   exatamente igual ao total líquido da venda (nenhum centavo perdido ou
   sobrando por arredondamento).
4. Se `installments === 1`: uma única `AccountReceivable` já é criada com
   `status: 'paid'` (comportamento anterior preservado — venda à vista é
   considerada quitada na criação).

## F22 — Orçamento (`quote`) sem baixa de estoque na criação (implementado)

O enum de `status` da venda inclui `'quote'` e a máquina de estados
(`ChangeSaleStatusUseCase.VALID_TRANSITIONS`) permite a transição
`quote → confirmed`. O fluxo real de orçamento está implementado:

- `POST /api/sales` aceita um campo opcional `status` (`'quote'` ou
  `'confirmed'`, default `'confirmed'` — preserva 100% o comportamento
  anterior quando omitido).
- Com `status: 'quote'`: `CreateSaleUseCase` cria a venda e os `SaleItem`
  normalmente, mas **não reserva nem debita estoque** **e não gera nenhuma
  `AccountReceivable`**. A validação de quantidade disponível em estoque
  também é adiada (um orçamento pode ser criado mesmo sem estoque
  suficiente no momento).
- Com `status: 'confirmed'` (ou omitido): **reserva** de estoque (G9) e
  geração de parcelas acontecem na criação.
- A confirmação de um orçamento (`PUT /api/sales/:id/status` com
  `{ "status": "confirmed" }`, transição `quote → confirmed`) é o momento em
  que `ChangeSaleStatusUseCase` **reserva** o estoque de cada item via
  `InventoryService.reserve({ saleId })` (revalidando a disponibilidade
  `quantity - reserved_quantity` sob lock, com 404/422 da mesma forma que a
  criação confirmada direta) e gera as parcelas em `AccountReceivable` a
  partir de `total_amount`/`installments`/`payment_method` já persistidos na
  venda, com o mesmo arredondamento em centavos (F24). A **baixa** só ocorre
  na autorização da NF-e (G9).

## Estrutura

```
server/src/modules/sales/
  domain/
    entities/SaleEntity.ts                   Validação de forma na criação
    repositories/SaleRepository.ts           Interface do repositório
  application/
    use-cases/
      ListSalesUseCase.ts
      GetSaleByIdUseCase.ts
      CreateSaleUseCase.ts                   Cálculo em centavos + baixa de estoque + parcelas (transacional)
      ChangeSaleStatusUseCase.ts             Máquina de estados + cancelamento (restaura estoque, cancela parcelas)
  infrastructure/
    sequelize/SequelizeSaleRepository.ts     Implementação usando os models existentes
  presentation/
    controllers/saleController.ts
    routes/sales.ts
```

## Modelos de dados utilizados

- `server/src/models/Sale.ts` (Sequelize, reutilizado — nenhum model novo foi criado).
- `server/src/models/SaleItem.ts`.
- `server/src/models/Product.ts` (leitura na validação de itens; escrita de `quantity` feita exclusivamente por `InventoryService`).
- `server/src/models/Client.ts` (associação `belongsTo`, apenas leitura — a existência do cliente não é validada explicitamente na criação, mesmo comportamento do anterior).
- `server/src/models/AccountReceivable.ts` (parcelas geradas na criação da venda; canceladas em massa no cancelamento).

## Regras de negócio

- Criação: `customer_id` obrigatório; `items` não pode ser vazio; cada item precisa de `product_id`/`quantity > 0`/`unit_price > 0` (validado por `SaleEntity`); `installments >= 1`; `discount >= 0`; `status` opcional (`'quote'`|`'confirmed'`, default `'confirmed'` — ver seção F22). Cada produto referenciado deve existir e estar `status: 'active'`. Estoque suficiente é exigido apenas quando `status: 'confirmed'` (validado no use case, dentro da transação, e revalidado sob lock por `InventoryService.reserve`); para `status: 'quote'` essa checagem é adiada para a confirmação. `total_amount` é calculado no backend em centavos a partir dos itens e do desconto.
- Reserva de estoque (G9): `InventoryService.reserve` por item, com lock pessimista (`SELECT ... FOR UPDATE`), executada dentro da transação da criação (venda `confirmed`) ou dentro da transação de confirmação (`quote → confirmed`, ver F22) — previne condição de corrida entre vendas concorrentes do mesmo produto (corrigida na Fase 4.1, preservada aqui) e impede que o mesmo saldo seja prometido a dois pedidos.
- Baixa de estoque (G9): `services/saleStockService.commitInvoicedStock`, chamado por `IssueSaleNfeUseCase`/`GetSaleNfeStatusUseCase` na **mesma transação** em que `sale_items.invoiced_quantity` é incrementado. Libera a reserva no montante faturado, consome `products.quantity` e debita o depósito ACABADOS.
- Geração de parcelas: ver seção F24/F22 acima — na criação (venda `confirmed`) ou na confirmação do orçamento (`quote → confirmed`). **Não** migrou para a NF-e: isso é o gap **G13**, ainda pendente de implementação.
- Máquina de estados (`ChangeSaleStatusUseCase.VALID_TRANSITIONS`, single source of truth):
  - `quote` → `confirmed` | `canceled`
  - `confirmed` → `invoiced` | `canceled`
  - `invoiced` → `shipped` | `canceled`
  - `shipped` → (terminal, sem transições — inclusive não pode ser cancelada; ver bloqueio dedicado abaixo)
  - `canceled` → (terminal, sem transições)
- Cancelamento (`status: 'canceled'`, G9): (1) libera **todo** o saldo reservado da venda via `InventoryService.releaseAllReservationsForSale` — nada entra em `products.quantity`, porque nada tinha saído; (2) devolve ao estoque via `InventoryService.receive` **apenas** `sale_items.invoiced_quantity` de cada item (o que já virou NF-e e portanto saiu de fato); (3) cancela todas as `AccountReceivable` da venda que ainda não estejam `paid`/`canceled`. Tudo na mesma transação.
- Múltiplos depósitos (Bloco 4, `BUSINESS_RULES.md` §12 item 7): **reserva não movimenta depósito**. O dual-write com `warehouseStockService` acompanha exatamente as alterações de `products.quantity`: `removeFromWarehouse` na baixa por NF-e (`saleStockService`) e `addToWarehouse` na devolução do que foi faturado, no cancelamento. O depósito é sempre `ACABADOS` (resolvido via `getWarehouseByCode('ACABADOS', transaction)`).
- Expedição (`status: 'shipped'`, Onda 3): única origem permitida é `invoiced`. Não debita estoque nem altera `AccountReceivable` (isso já ocorreu antes — o estoque na autorização da NF-e, as parcelas na confirmação). Uma venda `shipped` **não pode mais ser cancelada** — `ChangeSaleStatusUseCase` lança 422 (`BusinessRuleError`) com mensagem dedicada ("Venda já foi expedida...") antes mesmo de consultar a tabela genérica de transições, para dar uma mensagem mais clara que o erro genérico de transição inválida.

## Endpoints

Base URL: `/api/sales` (autenticação obrigatória via middleware `authenticate` em todas as rotas).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/sales` | Lista vendas (filtros: `status`, `customer_id`, `start_date`, `end_date`; paginação: `page`, `limit`) |
| GET | `/api/sales/:id` | Busca venda por id (com cliente e itens + produto) |
| POST | `/api/sales` | Cria venda com itens — transacional; com `status: 'confirmed'` (default) **reserva** estoque e gera parcelas na hora; com `status: 'quote'` não reserva nem gera parcelas (F22) |
| PUT | `/api/sales/:id/status` | Altera status (máquina de estados) — transacional; ao confirmar um orçamento (`quote → confirmed`) **reserva** estoque e gera parcelas; ao cancelar, libera a reserva, devolve ao estoque só o que foi faturado e cancela parcelas pendentes; `invoiced → shipped` marca a expedição (sem efeito colateral em estoque/parcelas); cancelamento de venda `shipped` é bloqueado (422) |
| PUT | `/api/sales/:id/items` | Substitui o conjunto de itens (`quote`/`confirmed`); em `confirmed` ajusta a **reserva** pelo delta, sem tocar em `products.quantity` |
| POST | `/api/sales/:id/nfe` | (módulo `fiscal`) Emite NF-e total/parcial — **é aqui que o estoque é baixado** (G9) |

Ver `docs/arquitetura/API.md` para exemplos completos de request/response.

## Permissões

Todas as rotas exigem JWT válido (`authenticate`). O projeto ainda não
possui um middleware de RBAC granular por rota neste módulo — qualquer
usuário autenticado pode criar/cancelar vendas hoje. Isso está listado
como pendência na Fase 12 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` ("Revisar RBAC completo"), mesma
pendência documentada nos demais módulos migrados.

## Eventos / Auditoria

Todos os endpoints de escrita continuam chamando `logAction` (via
`server/src/services/auditLogService.ts`) após o `commit`/persistência
(para não segurar locks de banco durante a escrita do log), preservando o
comportamento do controller anterior:

- `create` → entidade `Sale` criada.
- `status_change` → mudança de status da venda.

`GET /` e `GET /:id` são somente leitura e não geram auditoria, mesmo
comportamento do anterior.

## Fluxo simplificado (Mermaid)

```mermaid
flowchart TD
  A[HTTP Request] --> B[saleController]
  B --> C[Use Case]
  C -->|validacao de forma na criacao| D[SaleEntity]
  C -->|leitura/escrita de Sale e SaleItem| E[SequelizeSaleRepository]
  C -->|confirmacao: RESERVA G9| F[InventoryService.reserve saleId]
  C -->|cancelamento: libera reserva| G1[InventoryService.releaseAllReservationsForSale]
  C -->|cancelamento: devolve o que foi faturado| G[InventoryService.receive]
  C -->|criacao: gera parcelas| H[AccountReceivable]
  C -->|cancelamento: cancela parcelas pendentes| H
  NFE[POST /api/sales/:id/nfe autorizada] -->|BAIXA G9| S[saleStockService.commitInvoicedStock]
  S --> G1b[InventoryService.releaseReservation]
  S --> CONS[InventoryService.consume]
  S --> WH[(PostgreSQL - product_warehouse_stock ACABADOS)]
  F -->|lock pessimista + transaction| R[(PostgreSQL - production_order_reservations)]
  F --> I[(PostgreSQL - tabela products)]
  G1 --> R
  G1b --> R
  CONS -->|lock pessimista + transaction| I
  CONS --> J[(PostgreSQL - tabela inventory_movements)]
  G --> I
  G --> J
  E --> K[(PostgreSQL - tabela sales / sale_items)]
  H --> L[(PostgreSQL - tabela account_receivables)]
  B -->|apos commit| M[auditLogService.logAction]
  M --> N[(PostgreSQL - tabela audit_logs)]
```

## Testes existentes

- `server/tests/unit/sales-validators.test.ts` — schemas Zod (`createSaleSchema`, `updateSaleStatusSchema`, `listSalesQuerySchema`, `getSaleByIdParamSchema`).
- `server/tests/unit/integrity-transaction-guards.test.ts` — `ChangeSaleStatusUseCase` (cancelamento com lock/restauração de estoque).
- `server/tests/unit/create-sale-quote.test.ts` — `CreateSaleUseCase` com `status: 'quote'` não debita estoque nem gera `AccountReceivable`.
- `server/tests/integration/sale-cancel-concurrency.test.ts` — concorrência de cancelamento (Postgres real).
- `server/tests/integration/sale-invalid-payload-no-crash.test.ts` — payload inválido não derruba a API.
- `server/tests/integration/sale-quote-confirm.test.ts` — cria venda `quote` (estoque não muda), confirma via `PUT /status` e valida que o débito só acontece na confirmação (Postgres real, F22).
- `server/tests/unit/onda3-shipping-cockpit-cashflow.test.ts` — `invoiced → shipped` permitido; `confirmed → shipped` rejeitado (422); cancelamento de venda `shipped` bloqueado (422, mensagem dedicada); `shipped` confirmado como terminal.
- `server/tests/unit/sale-stock-baixa-na-nfe-g9.test.ts` — **(G9)** caminho real `ChangeSaleStatusUseCase → inventoryService → saleStockService` contra dublê em memória dos models: confirmação reserva e não baixa; faturamento parcial baixa proporcional; segunda emissão baixa só o restante; isolamento entre donos de reserva (venda × venda e venda × OP com o mesmo id numérico); `details.rule` dos erros de dono; cancelamento em cada estágio.
- `server/tests/unit/warehouse-stock.test.ts` / `warehouse-invariants.test.ts` — **(G9)** dual-write de depósito migrado da confirmação para o faturamento; confirmação não movimenta depósito nenhum.

## Pendências conhecidas

- Não há RBAC granular por papel neste módulo (qualquer usuário
  autenticado pode criar/cancelar vendas).
- A existência do `customer_id` não é validada explicitamente na criação
  (mesma lacuna do controller anterior — uma FK inválida cai no tratamento
  genérico de `SequelizeForeignKeyConstraintError` do `errorHandler`).
- O controller/rota anteriors (`server/src/controllers/saleController.ts`,
  `server/src/routes/sales.ts`) foram deixados intactos no repositório
  como referência histórica, mas não são mais usados; podem ser removidos
  em limpeza futura.
- **(G9)** A migration `20260810-000030` está **escrita mas não aplicada**
  (aplicar migration está bloqueado no ambiente). Enquanto não for
  aplicada, confirmar pedido falha (coluna `sale_id` inexistente).
- **(G9)** Cancelar a NF-e (`POST /api/sales/:id/nfe/cancel`) **não**
  reverte `invoiced_quantity` nem devolve o estoque baixado —
  comportamento pré-existente, mantido de propósito para as duas coisas
  continuarem coerentes entre si (baixado == faturado). A devolução é
  manual (ajuste de estoque) ou via cancelamento da venda.
- **(G9)** Se a baixa falhar na autorização da NF-e (estoque insuficiente
  por venda legada sem reserva ou ajuste manual), a transação final volta
  atrás e a venda fica `nfe_status = 'processing'` mesmo com a nota
  autorizada no provedor. A recuperação é `GET /api/sales/:id/nfe` depois
  de corrigir o estoque (o snapshot da emissão já está em `sale_invoices`).
- **(G9)** Ainda sem teste de integração contra Postgres real do CHECK de
  exatamente-um-dono, dos índices únicos parciais novos e do backfill da
  migration.
