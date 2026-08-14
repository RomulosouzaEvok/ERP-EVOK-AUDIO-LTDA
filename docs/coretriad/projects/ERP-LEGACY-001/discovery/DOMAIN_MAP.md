# DOMAIN_MAP.md — ERP-LEGACY-001, Passo 25 (Domínios/Bounded Contexts — AS-IS)

```
PROJECT_ID: ERP-LEGACY-001
INSUMOS: MODULE_CATALOG.md, CURRENT_ARCHITECTURE.md (Passo 24, mesma pasta)
MÉTODO: Read/Grep/Glob apenas — nenhum comando executado, nenhuma conexão de
banco aberta. Agrupamento feito por acoplamento de dados/fluxo real (imports
cross-módulo confirmados por grep), não por pasta de UI nem organograma.
NÃO É ARQUITETURA-ALVO — isso é o passo 34, fora de escopo desta skill.
ESCOPO: os 48 módulos de backend listados em MODULE_CATALOG.md.
```

## 0. Como este mapa foi construído

Para cada agrupamento candidato sugerido pelo orquestrador, foi buscado
(`Grep`) import cross-módulo real (`from '../../../<modulo>'` /
`require('../../../<modulo>/...)`) nos `application/` e `presentation/` de
cada módulo do grupo. Onde o import foi confirmado, o agrupamento está
**evidenciado por código**. Onde nenhum import cross-módulo foi encontrado,
o agrupamento é **conceitual/nominal** (mesma área de negócio, sem
acoplamento de dados detectado nesta amostragem) — marcado explicitamente
abaixo, para não inflar confiança.

## 1. Diagrama Mermaid — domínios e relações

```mermaid
graph TB
  subgraph D1["Identidade e Acesso"]
    auth[auth]
    users[users]
    accessProfiles[accessProfiles]
    auditLogs[auditLogs]
  end

  subgraph D2["Cadastro Central"]
    items[items]
    categories[categories]
    departments[departments]
    suppliers[suppliers]
    clients[clients]
    employees[employees]
    products[products]
    bom[bom]
  end

  subgraph D3["Cadeia de Suprimentos"]
    purchases[purchases]
    purchaseRequisitions[purchaseRequisitions]
    rfq[rfq]
    comex[comex]
  end

  subgraph D4["Planejamento e Producao"]
    mrp[mrp]
    production[production]
    workCenters[workCenters]
    masterProduction[masterProduction]
    engineering[engineering]
    laboratory[laboratory]
  end

  subgraph D5["Qualidade e Rastreabilidade"]
    quality[quality]
    nonConformities[nonConformities]
    traceability[traceability]
  end

  subgraph D6["Estoque e Logistica"]
    inventory[inventory]
    mobileInventory[mobileInventory]
    assets[assets]
    maintenance[maintenance]
  end

  subgraph D7["Comercial"]
    sales[sales]
    serviceOrders[serviceOrders]
  end

  subgraph D8["Financeiro e Fiscal"]
    financial[financial]
    accounting[accounting]
    budget[budget]
    treasury[treasury]
    fiscal[fiscal]
  end

  subgraph D9["Pessoas"]
    rh[rh]
    sst[sst]
  end

  subgraph D10["Governanca e Suporte"]
    directorate[directorate]
    juridico[juridico]
    ti[ti]
    facilities[facilities]
    marketing[marketing]
    reports[reports]
    dashboard[dashboard]
    intelligentAuditor[intelligentAuditor]
    spreadsheetImport[spreadsheetImport]
    webhooks[webhooks]
  end

  %% Relacoes EVIDENCIADAS por import cross-modulo (grep confirmado)
  mrp -->|import direto de dominio + infra concreta, sem porta| items
  mrp -->|import direto de dominio + infra concreta, sem porta| purchaseRequisitions
  mrp -->|import direto de infra concreta, sem porta| production
  rfq -->|import direto de dominio + infra concreta, sem porta| items
  rfq -->|import direto de dominio + infra concreta, sem porta| purchases
  rfq -->|import direto de dominio + infra concreta, sem porta| purchaseRequisitions
  comex -->|import direto de dominio + infra concreta, sem porta| items
  inventory -->|import direto de dominio (constants), sem porta| quality
  sales -->|require direto de controller, sem porta| fiscal
  production -->|require direto de model ORM (Item/WorkCenter), sem repositorio proprio| items
  production -->|require direto de service global compartilhado| bom
  masterProduction -->|require direto de service global compartilhado| bom
  D10 -->|porta local + adapter chamando use-case do fornecedor| D6

  %% Relacoes CONCEITUAIS (mesma area de negocio, sem import cross-modulo achado na amostra)
  financial -.->|sem import cross-modulo detectado| accounting
  financial -.->|sem import cross-modulo detectado| treasury
  financial -.->|sem import cross-modulo detectado| budget
  rh -.->|sem import cross-modulo detectado, mas depende de employees=0 registros| employees
  sst -.->|sem import cross-modulo detectado, mas depende de employees=0 registros| employees

  style mrp fill:#f9d,stroke:#900
  style rfq fill:#f9d,stroke:#900
  style comex fill:#f9d,stroke:#900
  style inventory fill:#f9d,stroke:#900
  style sales fill:#f9d,stroke:#900
  style production fill:#f9d,stroke:#900
```

(Nós/arestas em vermelho/rosa = cruzamento de fronteira **sem porta local**,
já confirmado em `CURRENT_ARCHITECTURE.md` seção 2 e reconfirmado aqui por
grep direto nos módulos consumidores.)

## 2. Tabela domínio → módulos → justificativa → fronteiras problemáticas

| Domínio candidato | Módulos | Justificativa (evidência) | Fronteiras problemáticas |
|---|---|---|---|
| **Identidade & Acesso** | `auth`, `users`, `accessProfiles`, `auditLogs` | Entidade central compartilhada: `User`/`AccessProfile`/`AccessProfilePermission` (`server/src/models/`). `auth` e `users` são 2 dos 6 módulos PRODUÇÃO REAL. `accessProfiles` e `users` compartilham o mesmo fluxo (`AssignAccessProfileUseCase.ts` em `users` — ver V2 em `CURRENT_ARCHITECTURE.md`). | (a) **V3**: regra de negócio de segurança (hash+`passwordVersion`) mora em `models/User.ts`, fora da árvore Clean Architecture de `auth` — quem "garante" a invariante de senha não é o agregado do módulo, é um hook Sequelize global. (b) **Cross-cutting real**: `middlewares/auth.ts` consulta `User`/`AccessProfile`/`AccessProfilePermission` direto do banco a cada requisição, sem passar pelo repositório de domínio de `users`/`accessProfiles` — nenhum destes módulos "possui" de fato a leitura usada em runtime de autenticação. (c) **Ownership quebrado em `auditLogs`**: escrita bypassa o módulo via `server/src/services/auditLogService.ts` (101 arquivos, 403 chamadas) — o módulo só possui a leitura. Candidata a revisão na arquitetura-alvo (já registrado em `CURRENT_ARCHITECTURE.md` seção 3). |
| **Cadastro Central** | `items`, `categories`, `departments`, `suppliers`, `clients`, `employees`, `products`, `bom` | `items` é citado como "hot path" e é importado por 5+ módulos de outros domínios (`mrp`, `rfq`, `comex`, ver linhas abaixo) — é o cadastro mestre real do sistema. `categories`/`departments` são vocabulário de apoio ao mesmo cadastro. `bom` referencia estrutura de `products`+`items` (estrutura de produto). Agrupados por serem a *origem* de dado consumida por quase todos os outros domínios, não por fluxo sequencial próprio. | **`items` é acessado por fora, sem porta, por 3 domínios diferentes** (Suprimentos, Planejamento&Produção) — ver linhas abaixo. `bom` é lido por `production`/`masterProduction` via serviço global (`services/bomService.ts`), não pelo repositório de domínio de `bom` — mais um caso de acesso a cadastro central que ignora a fronteira do módulo dono. |
| **Cadeia de Suprimentos** | `purchases`, `purchaseRequisitions`, `rfq`, `comex` | Fluxo sequencial de processo confirmado por import real: `rfq/application/use-cases/AwardRfqUseCase.ts:25` importa `PurchaseRequisitionRepository`; `rfq/presentation/controllers/rfqController.ts:7-17` importa e instancia `SequelizeItemRepository`, `SequelizeItemSupplierRepository`, `SequelizePurchaseRepository`, `SequelizePurchaseRequisitionRepository` — as 4 classes concretas dos 3 módulos vizinhos, todas no mesmo controller. `comex/application/use-cases/{Create,Receive}ImportProcessUseCase.ts` importa `ItemRepository` de `items` (cadastro central, fora deste domínio mas consumido por ele). | **Todos os 4 módulos cruzam fronteira sem porta local** — nenhum define uma interface própria (`application/services/*Service.ts`) para consumir o vizinho; todos importam a interface OU a implementação concreta do repositório estrangeiro diretamente. Isso é o "padrão antigo" já descrito em `CURRENT_ARCHITECTURE.md` seção 2 — reconfirmado aqui módulo a módulo. Candidata a revisão na arquitetura-alvo. |
| **Planejamento & Produção** | `mrp`, `production`, `workCenters`, `masterProduction`, `engineering`, `laboratory` | `mrp` é o hub: `GenerateMrpPlanUseCase.ts:10-12` importa `ItemRepository`, `PurchaseRequisitionRepository`, `ItemSupplierRepository`; `mrpController.ts:4-7` importa e instancia as 4 classes concretas de infraestrutura de `items`, `purchaseRequisitions` e `production` no mesmo arquivo (confirmado em `CURRENT_ARCHITECTURE.md` V-boundary e reconfirmado por grep aqui). `production` consome `items`/`workCenters`/`bom` — `SequelizeProductionOrderRepository.ts:9` faz `require('../../../../models/index')` e desestrutura `Item`, `WorkCenter` diretamente (model ORM, não repositório de domínio de `items`/`workCenters`). `masterProduction/ReleaseMasterProductionPlanUseCase.ts:53` usa `services/bomService.ts` (serviço global, não módulo `bom`). `engineering`/`laboratory` não têm import cross-módulo detectado nesta amostra — agrupamento aqui é **conceitual** (mesma cadeia de engenharia de produto), não evidenciado por acoplamento de código. | `mrp` é o pior caso do repositório inteiro para esta pauta: acessa infraestrutura concreta (não interface) de **3 módulos estrangeiros** a partir da camada de apresentação. `production` acessando `Item`/`WorkCenter` via model Sequelize cru (sem passar pelo repositório de domínio de `items`/`workCenters`) é o mesmo padrão, uma camada abaixo. Ambos já registrados como achado AS-IS em `CURRENT_ARCHITECTURE.md`; aqui apenas mapeados ao domínio. Candidatas a revisão na arquitetura-alvo — **não** decidido aqui. |
| **Qualidade & Rastreabilidade** | `quality`, `nonConformities`, `traceability` | Agrupados por responsabilidade de negócio (inspeção/liberação/rastreio de lote), citados juntos em `MODULE_CATALOG.md`. Nenhum import cross-módulo entre os três foi encontrado nesta amostra — **agrupamento conceitual**, não evidenciado por acoplamento de código interno ao domínio. | Não há evidência de vazamento *entre* os três módulos deste grupo. A fronteira problemática real está na direção oposta: **`inventory` (outro domínio) importa `quality` sem porta** (ver linha "Estoque & Logística"). |
| **Estoque & Logística** | `inventory`, `mobileInventory`, `assets`, `maintenance` | `inventory` é citado como consumido por múltiplos domínios (Comercial via `services/inventoryService.ts`, Produção via mesmo serviço). `assets`/`maintenance` foram checados por import cruzado e **nenhum foi encontrado** entre si nem com `inventory`. Agrupamento de `assets`/`maintenance`/`mobileInventory` com `inventory` é, portanto, **conceitual** nesta amostra, não confirmado por import direto. | **`inventory/application/use-cases/ReleaseLotUseCase.ts:57` importa `decideLotRelease`/`QUALITY_INSPECTION_RULE` de `../../../quality/domain/constants`** — cruzamento de fronteira de domínio sem porta local: a regra de "quando um lote pode ser liberado" (invariante de qualidade) é importada como constante de domínio direto de outro bounded context, em vez de `inventory` consultar uma porta/serviço exposto por `quality`. Achado novo, não descrito em `CURRENT_ARCHITECTURE.md`. Precisa ser confirmada como intencional (porta compartilhada) ou vazamento (candidata a revisão na arquitetura-alvo). |
| **Comercial** | `sales`, `serviceOrders` | `sales` é o módulo mais rico do grupo (13 rotas, NF-e, baixa de estoque). `serviceOrders` agrupado por proximidade de negócio; nenhum import cross-módulo `sales`↔`serviceOrders` foi encontrado — **agrupamento conceitual**. | `sales/presentation/routes/sales.ts:5` faz `require('../../../fiscal/presentation/controllers/fiscalController')` — **controller de um módulo chamando controller de outro diretamente na camada de apresentação**, o cruzamento de fronteira mais grave encontrado neste domínio (nem sequer é use-case-a-use-case, é controller-a-controller). Além disso, `sales` consome estoque/lote via serviços globais não-modulares (`services/inventoryService.ts`, `services/warehouseStockService.ts`, `services/saleLotService.ts`) em vez do repositório de domínio de `inventory`. |
| **Financeiro & Fiscal** | `financial`, `accounting`, `budget`, `treasury`, `fiscal` | Agrupados por área de negócio comum. **Nenhum import cross-módulo foi encontrado** entre `financial`↔`accounting`/`budget`/`treasury` nesta amostra — agrupamento **conceitual**, não evidenciado por acoplamento de código. Pode indicar que esses módulos são hoje mais isolados entre si do que a semântica de negócio sugeriria. | Nenhuma fronteira de import cruzado dentro do próprio grupo nesta amostra — mas `sales` (Comercial) acessa `fiscal` diretamente por controller, uma fronteira *entrando* neste domínio pela porta errada. Recomenda-se, num passo futuro, verificar se `financial`/`accounting` têm de fato zero acoplamento com `sales`/`purchases` apesar de o negócio exigir baixa de contas a receber/pagar. |
| **Pessoas** | `rh`, `sst` | Agrupados por dependência de negócio comum e documentada — mesma entidade central (`Employee`). Nenhum import cross-módulo `rh`↔`sst` foi encontrado nesta amostra. | Sem cruzamento de fronteira código-a-código detectado. `sst`/`ti` são os únicos 2/48 módulos com mapper de domínio — disciplina de fronteira interna melhor que a média do repositório. |
| **Governança & Suporte** | `directorate`, `juridico`, `ti`, `facilities`, `marketing`, `reports`, `dashboard`, `intelligentAuditor`, `spreadsheetImport`, `webhooks` | Agrupamento residual/nominal — módulos de suporte transversal. `facilities`/`juridico`/`ti` (`sst` no grupo Pessoas) usam o "padrão novo" de fronteira: porta local + adapter para consumir módulos de outros domínios. | Mais disciplinado que o padrão antigo, mas ainda alcança o use-case do módulo fornecedor, não uma API/porta exposta por ele — e `InventoryServiceAdapter.ts` documenta que `reference_type`/`reference_id` são descartados, quebrando rastreabilidade cross-domínio (já registrado em `AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`). A lógica de "quem pode aprovar o quê" está duplicada em 3 mecanismos distintos neste domínio (rota, controller em `juridico`, corpo de requisição em `rh`) — candidata forte a "invariante de autorização não garantida pelo agregado/domínio". |

## 3. Observação de método — o que este mapa NÃO afirma

- Onde a tabela diz "agrupamento conceitual, sem import cross-módulo
  detectado", isso **não** é prova de que o domínio é limpo/isolado — é
  prova apenas de que, na amostragem `Grep` feita nesta sessão, nenhum
  acoplamento direto de código apareceu. Integração via evento assíncrono,
  trigger de banco, ou script fora da árvore `modules/` não seria capturada
  por este método e não foi verificada.
- Os cruzamentos marcados em vermelho no diagrama (`mrp→items`,
  `mrp→purchaseRequisitions`, `mrp→production`, `rfq→{items,purchases,
  purchaseRequisitions}`, `comex→items`, `inventory→quality`,
  `sales→fiscal`, `production→items` via model cru) são os únicos
  confirmados por leitura direta de arquivo:linha nesta sessão.
- Nenhuma decisão de arquitetura-alvo (introduzir porta, mover invariante
  para agregado, unificar mecanismo de autorização) é tomada aqui — isso é
  mandato do passo 34, fora de escopo desta skill e deste agente.
- Todo cruzamento de fronteira listado aqui como "candidata a revisão na
  arquitetura-alvo" é apresentado como achado AS-IS com evidência de
  arquivo:linha, não como finding formal com severidade/confiança.

---

Arquivos-chave citados nesta análise (além dos já citados em
`CURRENT_ARCHITECTURE.md`):
`server/src/modules/mrp/application/use-cases/{ConvertPlannedOrdersToProductionOrderUseCase,GenerateMrpPlanUseCase}.ts`,
`server/src/modules/rfq/presentation/controllers/rfqController.ts`,
`server/src/modules/rfq/application/use-cases/{AwardRfqUseCase,CreateRfqUseCase}.ts`,
`server/src/modules/comex/{presentation/controllers/importProcessController.ts,application/use-cases/{Create,Receive}ImportProcessUseCase.ts}`,
`server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts:54-58`,
`server/src/modules/sales/presentation/routes/sales.ts:5`,
`server/src/modules/sales/application/use-cases/{ChangeSaleStatusUseCase,CreateSaleUseCase,EditSaleItemsUseCase}.ts`,
`server/src/modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository.ts:9`,
`server/src/modules/production/application/use-cases/{CreateProductionOrderUseCase,ChangeProductionOrderStatusUseCase}.ts`,
`server/src/modules/masterProduction/application/use-cases/ReleaseMasterProductionPlanUseCase.ts:53`,
`server/src/modules/maintenance/presentation/routes/maintenance.ts:10-16`,
`server/src/modules/accounting/application/use-cases/**` (11 arquivos,
todos só importam `AccountingRepository` próprio).

---

*Produzido pelo agente `vericore-domain-architecture-auditor` em modo
read-only reforçado (Read/Grep/Glob apenas, sem Write disponível nesta
sessão); conteúdo persistido neste caminho pelo orquestrador a partir da
resposta do agente, sem edição de conteúdo.*
