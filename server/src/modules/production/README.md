# Módulo Production (Ordem de Produção — OP)

## Objetivo

Gerenciar o ciclo de vida da Ordem de Produção (OP) da fábrica de
alto-falantes: planejamento (quantidade, data de vencimento, prioridade,
responsável), liberação/execução (máquina de estados
`planned → released → in_progress → completed/paused/canceled`), e o
efeito colateral mais crítico do PCP — ao concluir uma OP, consumir os
componentes da BOM ativa do produto e dar entrada do produto acabado no
estoque, tudo em uma única transação com lock pessimista.

É o quarto módulo migrado para a arquitetura em camadas (`domain` /
`application` / `infrastructure` / `presentation`) descrita nas Fases 5/6
do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`, seguindo o mesmo padrão dos módulos `products`, `inventory` e
`bom`.

Este módulo **não reimplementa** a lógica de consumo/entrada de estoque
(lock pessimista + transação, corrigidos na Fase 4.1) nem a explosão de
BOM — ambas continuam 100% centralizadas em
`server/src/services/inventoryService.ts` (`InventoryService.consume`/
`InventoryService.receive`) e `server/src/services/bomService.ts`
(`BomService.explodeBOM`). Os use cases deste módulo orquestram essas
chamadas dentro da mesma transação Sequelize que já existia no controller
anterior.

## Decisão de compatibilidade de rotas

O endpoint `/api/production-orders` (mesmos 7 paths, métodos, middlewares
de `authorize` e formato de resposta JSON do controller anterior) agora é
servido pelas rotas/controller deste módulo
(`presentation/routes/productionOrders.ts` →
`presentation/controllers/productionOrderController.ts`), registrado em
`server/index.ts`.

Os arquivos anteriors `server/src/routes/productionOrders.ts` e
`server/src/controllers/productionOrderController.ts` **permanecem no
repositório** como referência histórica, mas **não são mais montados em
nenhuma rota** — evitando duplicidade de `/api/production-orders` e o risco
de duas implementações divergentes atenderem à mesma URL. Podem ser
removidos em uma limpeza futura, uma vez confirmada a estabilidade da
migração.

Nenhum client precisa mudar: mesmos paths, mesmos verbos HTTP, mesmos
middlewares (`authorize('admin', 'operator')` em `POST /`,
`authorize('admin')` em `DELETE /:id`), mesmo envelope `{ success, data }` /
`{ success, error }`. Erros lançados pelos use cases usam `ValidationError`,
`NotFoundError`, `BusinessRuleError` e `ConflictError`
(`server/src/errors`), todas subclasses de `AppError` com `statusCode`
próprio; o controller do módulo responde `{ success: false, error: message
}` no mesmo formato do controller anterior (que usava `res.status(...).JSON(...)`
diretamente), preservando os mesmos códigos HTTP (400/404/409/422) para
cada situação de erro.

## Decisão de desenho: um único `ChangeProductionOrderStatusUseCase`

O `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md` (Fase 6) prevê use cases separados por transição
(`ReleaseProductionOrderUseCase`, `StartProductionOrderUseCase`,
`PauseProductionOrderUseCase`, `ResumeProductionOrderUseCase`,
`CompleteProductionOrderUseCase`, `CancelProductionOrderUseCase`), mas o
controller anterior sempre teve um **único** método `updateStatus`, dirigido
por uma tabela `validTransitions` (máquina de estados), atendendo a um
único endpoint `PUT /api/production-orders/:id/status` que recebe o status
alvo no corpo da requisição.

Criar 6 classes separadas exigiria replicar a mesma tabela
`VALID_TRANSITIONS` (ou uma fatia dela) em cada uma, ou fazê-las delegar
umas às outras de forma artificial — nenhuma das duas opções é mais legível
ou mais segura do que ter a máquina de estados em um único lugar. Optou-se
por **`ChangeProductionOrderStatusUseCase`**, que:

- recebe `{ id, status, quantity_produced, user_id }`;
- valida a transição usando a mesma tabela `VALID_TRANSITIONS` (único ponto
  de verdade, exportada como propriedade estática da classe para eventual
  reuso/teste);
- ao receber `status === 'completed'`, delega para o método privado
  `_completeOrder`, que cobre exatamente o papel do
  `RegisterProductionOutputUseCase` previsto no TODO (registra
  `quantity_produced`, consome componentes via BOM, dá entrada do produto
  acabado) — é isso que o controller anterior já fazia inline dentro do
  mesmo método `updateStatus`.

Essa é uma decisão de Clean Code: evitar duplicação da máquina de estados
em seis classes é mais alinhado ao princípio DRY do que criar seis use
cases finos que, na prática, só mudam uma string (`status`) e reexecutam a
mesma validação de transição. O nome do endpoint HTTP e o formato de
entrada/saída permanecem idênticos ao anterior.

### Registro de refugo na conclusão da OP — implementado

O campo de refugo (`quantity_scrapped`/`scrap_reason`) foi adicionado ao
model `ProductionOrder` (`server/src/models/ProductionOrder.ts`) e à
migration `20260731-000012-add-production-order-scrap-fields.cjs`
(idempotente, `up`/`down` simétricos).

Decisão de schema: **não** foi criada uma tabela dedicada de eventos de
refugo. `production_orders` ganhou apenas dois campos escalares
(`quantity_scrapped DECIMAL(18,6) default 0` e `scrap_reason TEXT
nullable`), porque o refugo aqui é um resultado agregado e único da
conclusão da OP (`PUT /:id/status` com `status: 'completed'`), no mesmo
nível de granularidade que `quantity_produced` — não é um evento
multi-lote/multi-motivo que justificasse rastreabilidade por lote como
`ProductionLotConsumption`/`LotControl`/`SerialNumber` (esses continuam
existindo para os *insumos consumidos* e o *lote do produto acabado bom*,
não para o refugo). Se no futuro for necessário registrar múltiplos
eventos de refugo por etapa/motivo, o model `ProductionOrderTracking`
(F05, já grava `quantity_scrapped` por apontamento de etapa) é o lugar
natural para evoluir isso — o campo em `ProductionOrder` é o total
"oficial" registrado no fechamento contábil da OP.

Regras implementadas em `ChangeProductionOrderStatusUseCase`/
`ProductionOrderEntity.transitionTo` (`status === 'completed'`):

- `quantity_scrapped` é opcional no payload de `PUT /:id/status` (default `0`); `scrap_reason` é opcional (string livre, ignorado se `quantity_scrapped` for `0`).
- `quantity_scrapped` não pode ser negativo.
- `quantity_produced + quantity_scrapped` não pode ultrapassar a `quantity` planejada, a menos que `allow_overproduction: true` seja enviado (mesma trava já existente para `quantity_produced` isolado).
- O refugo **não** entra em `InventoryService.receive` (não vira estoque de produto acabado) e **não** afeta o consumo de componentes já debitado via BOM/lotes — é puramente um registro de auditoria sobre a quantidade produzida que saiu ruim.
- A mudança é persistida na mesma transação da conclusão da OP e auditada via `logAction` (`action: 'status_change'`, `newValues.quantity_scrapped`/`scrap_reason` quando aplicável).

## Estrutura

```
server/src/modules/production/
  domain/
    entities/ProductionOrderEntity.ts         Validação de forma na criação
    repositories/ProductionOrderRepository.ts Interface do repositório
  application/
    use-cases/
      ListProductionOrdersUseCase.ts
      GetProductionOrderByIdUseCase.ts
      CreateProductionOrderUseCase.ts
      UpdateProductionOrderUseCase.ts
      ChangeProductionOrderStatusUseCase.ts   Máquina de estados única (ver decisão acima)
      RemoveProductionOrderUseCase.ts
      GetProductionReportUseCase.ts
  infrastructure/
    sequelize/SequelizeProductionOrderRepository.ts  Implementação usando os models ProductionOrder/Product/Employee/User existentes
  presentation/
    controllers/productionOrderController.ts
    routes/productionOrders.ts
```

## Modelos de dados utilizados

- `server/src/models/ProductionOrder.ts` (Sequelize, reutilizado — nenhum model novo foi criado).
- `server/src/models/Product.ts` (leitura: validação de produto `finished`/`active`; escrita de estoque feita via `InventoryService`).
- `server/src/models/Employee.ts` (leitura: responsável pela OP).
- `server/src/models/User.ts` (leitura: usuário criador).

## Regras de negócio

- `product_id`, `quantity > 0` e `due_date` são obrigatórios na criação — validado por `ProductionOrderEntity` (forma).
- O produto informado deve existir, estar `status === 'active'` e ser `product_type === 'finished'` — validado por `CreateProductionOrderUseCase` consultando `Product` (não duplicado na entidade).
- `order_number` é gerado automaticamente no formato `OP-<ano>-XXXX`, sequencial por ano — `CreateProductionOrderUseCase`.
- Alteração de campos gerais (`priority`, `due_date`, `responsible_id`, `notes`) via `PUT /:id` **não aceita** `status` no corpo — deve usar `PUT /:id/status` (`UpdateProductionOrderUseCase` rejeita com `ValidationError`).
- Máquina de estados (`ChangeProductionOrderStatusUseCase.VALID_TRANSITIONS`): `planned → released|canceled`; `released → in_progress|canceled`; `in_progress → completed|paused|canceled`; `paused → in_progress|canceled`; `completed`/`canceled` são estados finais (sem transições).
- Transição para `in_progress` registra `start_date = now()`.
- Transição para `completed` registra `quantity_produced` (padrão: quantidade planejada, se não informada), `completion_date = now()`, consome os componentes da BOM ativa do produto (via `BomService.explodeBOM` + `InventoryService.consume`, tolerando produto sem BOM cadastrada) e dá entrada do produto acabado no estoque (`InventoryService.receive`).
- A leitura da OP para transição usa lock pessimista (`SELECT ... FOR UPDATE`) dentro da transação, evitando que duas requisições concorrentes de mudança de status processem a mesma OP duas vezes (ex.: duplo clique em "concluir" duplicando entrada de estoque) — comportamento herdado da correção da Fase 4.1, preservado integralmente.
- OPs em `in_progress` ou `completed` não podem ser removidas — `RemoveProductionOrderUseCase` (`BusinessRuleError`, HTTP 422).

## Endpoints

Base URL: `/api/production-orders` (autenticação obrigatória via middleware `authenticate` em todas as rotas).

| Método | Rota | Autorização | Descrição |
|---|---|---|---|
| GET | `/api/production-orders` | qualquer usuário autenticado | Lista OPs (filtros: `status`, `product_id`, `priority`, `start_date`, `end_date`; paginação: `page`, `limit`) + `summary` (total, planned, in_progress, completed, overdue) |
| GET | `/api/production-orders/report` | qualquer usuário autenticado | Relatório de produção de um período (`start_date`, `end_date`) |
| GET | `/api/production-orders/:id` | qualquer usuário autenticado | Detalhes da OP |
| POST | `/api/production-orders` | `admin`, `operator` | Cria OP |
| PUT | `/api/production-orders/:id` | qualquer usuário autenticado | Atualiza campos gerais (não-status) |
| PUT | `/api/production-orders/:id/status` | qualquer usuário autenticado | Muda status (máquina de estados; consome BOM e dá entrada em estoque quando `status === 'completed'`) |
| DELETE | `/api/production-orders/:id` | `admin` | Remove a OP (apenas se não estiver `in_progress`/`completed`) |

Ver `docs/API.md` para exemplos completos de request/response.

## Permissões

`authenticate` (JWT) obrigatório em todas as rotas. `authorize('admin', 'operator')`
em `POST /` e `authorize('admin')` em `DELETE /:id`, preservados exatamente
como no roteador anterior. As demais rotas (`GET`, `PUT`) não têm restrição
de papel adicional hoje — mesmo comportamento do anterior; revisão de RBAC
granular está prevista na Fase 12 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`.

## Eventos / Auditoria

Os endpoints de escrita continuam chamando `logAction` (via
`server/src/services/auditLogService.ts`), preservando o comportamento do
controller anterior:

- `POST /` → `action: 'create'`, entidade `ProductionOrder`, com `product_id`, `quantity` e `status: 'planned'`.
- `PUT /:id` → `action: 'update'`, com `oldValues`/`newValues` apenas dos campos efetivamente alterados.
- `PUT /:id/status` → `action: 'status_change'`, com `oldValues: { status: <status anterior> }` e `newValues: { status, quantity_produced? }`.
- `DELETE /:id` → `action: 'delete'`, com `oldValues: { status: <status anterior> }`.

Em todos os casos, o log é registrado **após o commit** da transação, para
não segurar locks de banco (mesmo comentário/comportamento do anterior).

## Testes existentes

Nenhum teste automatizado existe hoje para este módulo (nem para o
restante do projeto — `server/tests/` ainda não existe). Cobertura de
testes unitários de `ProductionOrderEntity`/use cases e testes de
integração dos endpoints está prevista na Fase 9 do `docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`.

## Fluxo simplificado (Mermaid)

```mermaid
flowchart TD
  A[HTTP Request] --> B[productionOrderController]
  B --> C[Use Case]
  C -->|validação de forma na criação| D[ProductionOrderEntity]
  C -->|leitura/CRUD simples| E[SequelizeProductionOrderRepository]
  C -->|status = completed: explode BOM| F[BomService.explodeBOM]
  C -->|status = completed: consumo/entrada de estoque| G[InventoryService.consume / receive]
  G -->|lock pessimista + transação| H[(PostgreSQL - tabela products / stock_movements)]
  E --> I[(PostgreSQL - tabela production_orders)]
  F --> J[(PostgreSQL - tabela bill_of_materials)]
  B -->|apos escrita| K[auditLogService.logAction]
  K --> L[(PostgreSQL - tabela audit_logs)]
```

## Diagrama de estados da OP

```mermaid
stateDiagram-v2
  [*] --> planned
  planned --> released
  planned --> canceled
  released --> in_progress
  released --> canceled
  in_progress --> completed
  in_progress --> paused
  in_progress --> canceled
  paused --> in_progress
  paused --> canceled
  completed --> [*]
  canceled --> [*]
```

## Pendências conhecidas

- Não há RBAC granular por papel nas rotas `GET`/`PUT` (apenas `POST`/`DELETE`
  restringem por papel, herdado do anterior).
- Validação de entrada é manual/via entidade (sem schema declarativo);
  migração para Zod está prevista para a Fase 8.
- O controller/rota anteriors (`server/src/controllers/productionOrderController.ts`,
  `server/src/routes/productionOrders.ts`) foram deixados intactos no
  repositório como referência histórica, mas não são mais usados; podem ser
  removidos em limpeza futura.

## F04 - Roteiro De Producao

A sprint F04 criou a base de dados inicial para roteiro industrial sem alterar
o fluxo atual de OP. A criacao, mudanca de status e conclusao transacional da
OP continuam funcionando como antes; os novos models entram como estrutura
complementar para as proximas sprints de apontamento, eficiencia e OEE.

Models adicionados:

- `server/src/models/ProductionRoute.ts` / `.ts`: roteiro mestre por produto,
  revisao, status, tempos padrao e aprovacao.
- `server/src/models/ProductionRouteStep.ts` / `.ts`: etapas sequenciais do
  roteiro, posto de trabalho, setup, tempo padrao, instrucao e exigencia de
  qualidade.
- `server/src/models/ProductionOrderTracking.ts` / `.ts`: apontamento por
  etapa da OP, status operacional, operador, inicio/fim, quantidade boa e
  refugo.

Relacionamentos registrados em `server/src/models/index.ts` e `.ts`:

- `Product -> ProductionRoute`
- `ProductionRoute -> ProductionRouteStep`
- `ProductionOrder -> ProductionOrderTracking`
- `ProductionRouteStep -> ProductionOrderTracking`
- `Employee -> ProductionOrderTracking`
- `User -> ProductionRoute` como criador/aprovador

Pendencias intencionais:

- Criar endpoints/use cases CRUD de roteiro.
- Popular tracking da OP automaticamente a partir do roteiro ativo.
- Criar migrations formais dos novos models (Fase 11).

## F05 - Apontamento De Producao

A sprint F05 implementou o primeiro fluxo operacional de apontamento por etapa
da OP, usando o model `ProductionOrderTracking` criado na F04. O objetivo foi
liberar o registro de execucao de chao de fabrica sem alterar ainda a conclusao
contabil/transacional da OP.

Endpoints adicionados:

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/production-orders/:id/tracking` | Lista etapas/apontamentos da OP |
| POST | `/api/production-orders/:id/tracking` | Cria uma etapa manual de apontamento para a OP |
| POST | `/api/production-orders/tracking/:trackingId/start` | Inicia uma etapa pendente/pausada |
| POST | `/api/production-orders/tracking/:trackingId/complete` | Conclui uma etapa em andamento, registrando quantidade boa e refugo |

Use cases adicionados:

- `ListProductionTrackingUseCase`
- `CreateProductionTrackingUseCase`
- `StartProductionTrackingUseCase`
- `CompleteProductionTrackingUseCase`

Regras implementadas:

- OP precisa existir para criar/listar apontamentos.
- Sequencia da etapa deve ser maior que zero.
- Etapa so inicia se estiver `pending` ou `paused`.
- Etapa so conclui se estiver `in_progress`.
- Quantidades boa/refugada nao podem ser negativas.
- Inicio/conclusao usam transacao e lock pessimista na etapa de tracking.
- Escritas de apontamento geram auditoria via `AuditLogService`.

Pendencias intencionais:

- Popular etapas automaticamente a partir do roteiro ativo.
- Calcular OEE/eficiencia por posto/operador.
- Consolidar `quantity_good`/`quantity_scrapped` no fechamento da OP.
- Criar migrations formais dos novos endpoints/models (Fase 11).

## F06 - Controle De Lote, Serie E Rastreabilidade

A sprint F06 iniciou a base estrutural de rastreabilidade industrial. A
entidade `Product` continua sendo a fonte unica para materia-prima,
subconjunto e produto acabado; os novos models apenas vinculam origem,
consumo e destino de lotes/series sem qualquer integracao com ERP anterior.

Models adicionados:

- `server/src/models/LotControl.ts` / `.ts`: lote por produto, com origem por
  compra ou OP, status operacional, quantidade inicial, saldo disponivel e
  datas de fabricacao/validade/recebimento.
- `server/src/models/SerialNumber.ts` / `.ts`: numero de serie individual
  vinculado a produto, lote, OP e venda.
- `server/src/models/ProductionLotConsumption.ts` / `.ts`: vinculo entre OP,
  produto consumido e lote usado na fabricacao.

Relacionamentos registrados em `server/src/models/index.ts` e `.ts`:

- `Product -> LotControl`
- `Supplier -> LotControl`
- `Purchase -> LotControl`
- `ProductionOrder -> LotControl` como lotes gerados
- `Product -> SerialNumber`
- `LotControl -> SerialNumber`
- `ProductionOrder -> SerialNumber`
- `Sale -> SerialNumber`
- `ProductionOrder -> ProductionLotConsumption`
- `LotControl -> ProductionLotConsumption`
- `Product -> ProductionLotConsumption`
- `User -> ProductionLotConsumption`

Pendencias intencionais:

- Criar use cases/endpoints para criar, bloquear, consumir e consultar lotes.
- Integrar consumo por lote ao fechamento transacional da OP.
- Vincular numeros de serie ao faturamento/expedicao.
- Criar migrations formais dos novos models (Fase 11).

## F07 - Custeio Real Por Produto

A sprint F07 iniciou o custeio real com ledger historico e custo medio
ponderado no `Product.cost_price`. O fluxo continua isolado no PostgreSQL do
ERP, sem qualquer consulta ou integracao com banco anterior.

Estrutura adicionada:

- `server/src/models/ProductCostLedger.ts` / `.ts`: historico de custo real
  por produto, origem (`purchase`, `production`, `adjustment`), quantidade,
  custo unitario, custo total, custo anterior e novo custo medio.
- `server/src/services/costingService.ts` / `.ts`: calcula media ponderada e
  grava o ledger dentro da mesma transacao de estoque.

Fluxos integrados:

- Recebimento de compra: usa `PurchaseItem.unit_price` como custo real de
  entrada, registra `InventoryMovement.unit_cost`, atualiza `Product.cost_price`
  e grava `ProductCostLedger`.
- Fechamento de OP: explode a BOM com custo, registra custo unitario nos
  consumos de componentes, calcula custo unitario do produto acabado e grava
  ledger de producao.

Pendencias intencionais:

- Criar endpoint/relatorio para consultar ledger de custo por produto.
- Separar custo de material, mao de obra, overhead e refugo em campos proprios.
- Criar migrations formais do ledger (Fase 11).
