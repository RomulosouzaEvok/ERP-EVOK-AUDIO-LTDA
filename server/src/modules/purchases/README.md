# Módulo Purchases

## Objetivo

Gerenciar o ciclo de vida de Pedidos de Compra (Purchase Orders) junto a
fornecedores: criação, edição, aprovação/transições de status, e
recebimento (total ou parcial) de itens com baixa de estoque. Migrado para
a arquitetura em camadas (`domain` / `application` / `infrastructure` /
`presentation`) descrita na Fase 5 do `TODO.md`, seguindo o mesmo padrão
dos módulos `products`, `inventory`, `bom` e `production`.

Este módulo **não reimplementa** a lógica transacional de entrada de
estoque no recebimento — isso continua 100% centralizado em
`server/src/services/inventoryService.js` (`InventoryService.receive`,
com lock pessimista da linha do produto). Os use cases deste módulo são
wrappers finos sobre os models Sequelize existentes
(`Purchase`, `PurchaseItem`, `Product`, `Supplier`, `AccountPayable`) e
sobre `InventoryService`.

## Decisão de compatibilidade de rotas

O endpoint `/api/purchases` (mesmos 6 paths, métodos e formato de resposta
JSON do controller legado) agora é servido pelas rotas/controller deste
módulo (`presentation/routes/purchases.js` →
`presentation/controllers/purchaseController.js`), registrado em
`server/index.js`.

O arquivo legado `server/src/routes/purchases.js` e o controller
`server/src/controllers/purchaseController.js` **permanecem no
repositório** como referência histórica, mas **não são mais montados em
nenhuma rota** — evitando duplicidade de `/api/purchases` e o risco de
duas implementações divergentes atenderem à mesma URL. Confirmado via
`grep` que apenas `server/index.js` monta o módulo novo. Os arquivos
legados podem ser removidos em uma limpeza futura, uma vez confirmada a
estabilidade da migração.

Nenhum client precisa mudar: mesmos 6 endpoints, mesmos verbos HTTP, mesmo
envelope `{ success, data }` / `{ success, error }` (respostas de sucesso).
Uma pequena diferença de formato existe apenas nas respostas de **erro**
(mesmo padrão já adotado nos módulos `inventory`/`bom`/`production`):
erros de validação/regra de negócio agora são instâncias de `AppError`
(`server/src/errors`) e chegam ao cliente como
`{ success: false, error: { code, message } }` em vez do
`{ success: false, error: "mensagem em string" }` usado pelo controller
legado. O `statusCode` HTTP retornado é o mesmo em todos os casos (400,
404, 422). Erros inesperados (5xx) mantêm o fallback genérico do
`errorHandler`, igual ao legado.

## Correção de bug pré-existente (atomicidade da aprovação)

O controller legado chamava o helper `createPurchasePayable(purchase,
userId, transaction)` a partir de `updateStatus` **sem abrir uma
transaction e sem passar o parâmetro `transaction`**
(`server/src/controllers/purchaseController.js:67`), ou seja, a mudança de
status para `approved` (`purchase.save()`) e a criação da
`AccountPayable` correspondente não eram atômicas: uma falha entre os dois
passos podia deixar o pedido `approved` sem conta a pagar gerada.

Nesta migração, `ChangePurchaseStatusUseCase` corrige esse problema: o
controller (`presentation/controllers/purchaseController.js#updateStatus`)
abre uma `sequelize.transaction()` e todo o fluxo — busca do pedido,
validação da transição de status (`VALID_TRANSITIONS`, single source of
truth preservada 1:1 do legado), `purchase.save({ transaction })` e a
criação idempotente da `AccountPayable` — roda dentro dela, com
`commit`/`rollback` no controller. É uma melhoria de baixo risco, alinhada
ao objetivo de estabilidade transacional das Fases 4/5, sem alterar o
contrato HTTP.

## Notas sobre dívidas técnicas conhecidas (TODO.md)

- **F21 — `AccountPayable` gerado no recebimento**: já estava **correto**
  antes desta migração. O controller legado já gerava a `AccountPayable`
  em `updateStatus` (na transição para `approved`), não em `receiveItems`.
  A entrada F21 do `TODO.md` descreve um problema que **já foi resolvido**
  em versão anterior do código; esta migração apenas preserva esse
  comportamento correto (e corrige a lacuna de atomicidade descrita acima).
  Nenhuma mudança de regra de negócio foi feita quanto a "quando" a conta
  a pagar é gerada.
- **F24 — Arredondamento de parcelas impreciso**: está relacionado a
  `saleController.js` (módulo `sales`, ainda não migrado) e é **fora do
  escopo desta tarefa**. O módulo `purchases` não gera parcelas — apenas
  uma `AccountPayable` única por pedido — portanto não é afetado por F24.

## Estrutura

```
server/src/modules/purchases/
  domain/
    entities/PurchaseEntity.js                 Validação de forma na criação
    repositories/PurchaseRepository.js         Interface do repositório
  application/
    use-cases/
      ListPurchasesUseCase.js
      GetPurchaseByIdUseCase.js
      CreatePurchaseUseCase.js
      UpdatePurchaseUseCase.js
      ChangePurchaseStatusUseCase.js           Máquina de estados + AccountPayable (transacional)
      ReceivePurchaseItemsUseCase.js           Wrapper fino sobre InventoryService.receive
  infrastructure/
    sequelize/SequelizePurchaseRepository.js   Implementação usando os models existentes
  presentation/
    controllers/purchaseController.js
    routes/purchases.js
```

## Modelos de dados utilizados

- `server/src/models/Purchase.js` (Sequelize, reutilizado — nenhum model novo foi criado).
- `server/src/models/PurchaseItem.js`.
- `server/src/models/Product.js` (leitura na validação de itens; escrita de `quantity` feita exclusivamente por `InventoryService.receive`).
- `server/src/models/Supplier.js` (associação `belongsTo`, apenas leitura).
- `server/src/models/AccountPayable.js` (criada na aprovação do pedido).

## Regras de negócio

- Criação: `supplier_id` obrigatório; `items` não pode ser vazio; cada item precisa de `product_id`/`quantity > 0`/`unit_price > 0` (validado por `PurchaseEntity`) e o produto deve existir no banco (validado no use case, dentro da transação). `total_amount` é calculado no backend a partir dos itens.
- Edição (`update`): apenas pedidos `pending` ou `approved` podem ser editados; apenas os campos `expected_date`, `freight_type`, `freight_value`, `notes`, `supplier_id` são alteráveis.
- Máquina de estados (`ChangePurchaseStatusUseCase.VALID_TRANSITIONS`, single source of truth):
  - `pending` → `approved` | `canceled`
  - `approved` → `sent` | `canceled`
  - `sent` → `partial` | `received` | `canceled`
  - `partial` → `received` | `canceled`
  - `received` / `canceled` → (terminal, sem transições)
- Ao transicionar para `approved`, gera uma `AccountPayable` (idempotente — não duplica se já existir uma para o mesmo `purchase_id`), com vencimento em 30 dias após `expected_date` (ou 30 dias a partir de hoje, se não houver `expected_date`).
- Recebimento (`receiveItems`): apenas pedidos `sent` ou `partial` podem receber itens; cada item recebido não pode exceder `quantity - received_quantity`; cada linha aciona `InventoryService.receive` (lock pessimista + `InventoryMovement`) na mesma transação; o pedido vira `received` quando todos os itens estiverem `received`, senão `partial`.

## Endpoints

Base URL: `/api/purchases` (autenticação obrigatória via middleware `authenticate` em todas as rotas).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/purchases` | Lista pedidos (filtros: `status`, `supplier_id`, `start_date`, `end_date`; paginação: `page`, `limit`) |
| GET | `/api/purchases/:id` | Busca pedido por id (com fornecedor e itens + produto) |
| POST | `/api/purchases` | Cria pedido de compra com itens — transacional |
| PUT | `/api/purchases/:id` | Atualiza campos permitidos do pedido |
| PUT | `/api/purchases/:id/status` | Altera status (máquina de estados) — transacional; gera `AccountPayable` na aprovação |
| POST | `/api/purchases/:id/receive` | Registra recebimento de itens — transacional, lock pessimista via `InventoryService` |

Ver `docs/API.md` para exemplos completos de request/response.

## Permissões

Todas as rotas exigem JWT válido (`authenticate`). O projeto ainda não
possui um middleware de RBAC granular por rota neste módulo — qualquer
usuário autenticado pode criar/aprovar/receber pedidos de compra hoje.
Isso está listado como pendência na Fase 12 do `TODO.md` ("Revisar RBAC
completo"), mesma pendência documentada nos demais módulos migrados.

## Eventos / Auditoria

Todos os endpoints de escrita continuam chamando `logAction` (via
`server/src/services/auditLogService.js`) após o `commit`/persistência
(para não segurar locks de banco durante a escrita do log), preservando o
comportamento do controller legado:

- `create` → entidade `Purchase` criada.
- `update` → campos alterados do pedido.
- `approve` (quando `status = approved`) ou `status_change` (demais
  transições) → mudança de status.
- `update` → recebimento de itens (mudança de status do pedido pós-recebimento).

`GET /` e `GET /:id` são somente leitura e não geram auditoria, mesmo
comportamento do legado.

## Fluxo simplificado (Mermaid)

```mermaid
flowchart TD
  A[HTTP Request] --> B[purchaseController]
  B --> C[Use Case]
  C -->|validacao de forma na criacao| D[PurchaseEntity]
  C -->|leitura/escrita de Purchase e PurchaseItem| E[SequelizePurchaseRepository]
  C -->|recebimento: baixa de estoque| F[InventoryService.receive]
  C -->|aprovacao: gera conta a pagar| G[AccountPayable]
  F -->|lock pessimista + transaction| H[(MySQL - tabela products)]
  F --> I[(MySQL - tabela inventory_movements)]
  E --> J[(MySQL - tabela purchases / purchase_items)]
  G --> K[(MySQL - tabela account_payables)]
  B -->|apos commit| L[auditLogService.logAction]
  L --> M[(MySQL - tabela audit_logs)]
```

## Testes existentes

Nenhum teste automatizado existe hoje para este módulo (nem para o
restante do projeto — `server/tests/` ainda não existe). Cobertura de
testes unitários de `PurchaseEntity`/use cases e testes de integração dos
endpoints está prevista na Fase 9 do `TODO.md`.

## Pendências conhecidas

- Não há RBAC granular por papel neste módulo (qualquer usuário
  autenticado pode aprovar/receber pedidos de compra).
- Validação de entrada é manual/via entidade (sem schema declarativo);
  migração para Zod está prevista para a Fase 8.
- F24 (arredondamento de parcelas) não se aplica a este módulo (ver seção
  acima) — permanece pendente apenas em `sales`.
- O controller/rota legados (`server/src/controllers/purchaseController.js`,
  `server/src/routes/purchases.js`) foram deixados intactos no repositório
  como referência histórica, mas não são mais usados; podem ser removidos
  em limpeza futura.
