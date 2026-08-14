# RELATÓRIO T-11 — PRODUÇÃO E MRP (onda W2, `ERP-LEGACY-001-AUD-001`)

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`.
Regime `APR-2026-016` respeitado: nenhuma conexão de banco, nenhuma execução.
Nenhum arquivo do objeto auditado foi tocado (Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-domain-architecture-auditor` (T-11 produção e MRP) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

**AUDIT_COMMIT:** `c1311a6f76b512fef893f7e60d934179cae3409f` — única referência de leitura. `c9359be` não citado.
**Titular:** `vericore-domain-logic-auditor` sob a ótica de **fronteira de domínio/DDD** (invariante × camada guardiã). Regime `APR-2026-016`: leitura estática, zero conexão de banco, zero execução.
**Regra 2 observada:** nada foi corrigido, refatorado ou alterado.

---

## 1. Veredito sobre a divergência dos dois motores de BOM (critério de "pronto quando" da trilha)

### 1.1 A premissa que o passo 30 congelou está **REFUTADA** no AUDIT_COMMIT

O teste de caracterização `server/tests/characterization/planejamento-producao--bom-explosion-divergence-mrp-vs-op.test.ts:7-25` afirma, e o briefing desta trilha repete, que a comparação direta é **"inviável por construção"** porque `mrpEngine` explodiria `item_estruturas` (UUID) e `BomService` explodiria `bill_of_materials` (INT), sem ponte.

**Leitura própria no AUDIT_COMMIT — os dois motores leem a MESMA tabela:**

- `server/src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository.ts:4-6,22-24` — `listActiveEdges()` **delega inteiramente** a `BomStructureProjection.listActiveEdges()`. O comentário na linha 4 é explícito: *"G1 (2026-08-10): o MRP deixou de ler `item_estruturas`"*.
- `server/src/services/bomStructureProjection.ts:95-120` — o SQL da projeção lê `bill_of_materials` × `bill_of_material_items`, filtrado por `bom.status = 'active'`. O UUID é apenas uma **projeção de leitura** das mesmas linhas via `LEFT JOIN items ON items.codigo = products.code`.
- Varredura de `item_estruturas`/`ItemEstrutura` em `server/src/`: nenhuma ocorrência em caminho de MRP. Restam apenas `models/index.ts`, scripts de backfill e o próprio comentário histórico.

**A tabela citada como prova (`bomStructureProjection.ts:9-18`) é a descrição do estado ANTERIOR ao G1**, dentro do módulo cuja razão de existir é encerrar aquele estado. Foi lida como estado vigente. Divergência registrada sob a **Regra 20** (prevalece a evidência VeriCore) e sob a **Regra 21** (contradição documento × código): a conclusão de discovery `BR-PP-016b` "confiança MEDIUM porque as duas explosões operam sobre tabelas diferentes e a sincronia não foi verificada" (`BUSINESS_RULE_CANDIDATES_planejamento-producao.md:350-353`) **não se sustenta**. Não há duas árvores a sincronizar: há **uma fonte e dois leitores que discordam sobre ela**.

### 1.2 Consequência: a divergência sobe de "possível" para **provada e comparável**

Comparação linha a linha sobre a mesma fonte (`bill_of_materials` ativo):

| Critério | `mrpEngine.explodeBomRequirements` | `BomService.explodeBOM` (padrão de produção) |
|---|---|---|
| Fonte | `bill_of_materials` (via projeção) | `bill_of_materials` (direto) |
| `is_phantom` | **não é sequer projetado** — ausente do `SELECT` (`bomStructureProjection.ts:96-106`) e do tipo `MrpBomEdge` (`mrpEngine.ts:32-43`) | é **o** critério de parada (`bomService.ts:505`) |
| Parada | nenhuma além de ciclo (`mrpEngine.ts:188`) | para em subconjunto estocável; fantasma some da saída (`bomService.ts:505,517-529`) |
| `maxDepth` | inexistente | 10 (`bomService.ts:424,459-464`) |
| Netagem por nível | **nenhuma** (§2, T11-F01) | n/a (não neta) |
| Quarentena (G7) | no repositório de item (`SequelizeItemRepository.ts:86-107`) | no serviço (`bomService.ts:584-592`) |

**Veredito: DEFEITO, não comportamento intencional documentado.** Fundamento: (i) `BR-PP-016` está documentada como decisão de negócio (G18, caso REPARO) e afirma no próprio código que *"Mudar a regra aqui muda os três"* — reserva, consumo e custeio (`bomService.ts:396-397`); (ii) não existe um só documento, comentário ou teste declarando que o **planejamento** deva ignorar a mesma regra; (iii) a projeção que alimenta o MRP foi escrita explicitamente para acabar com a divergência de estrutura e **deixou de fora a coluna que decide a profundidade**. Efeito material: para `PA → SUB(estocável) → RAW`, o MRP compra RAW que a OP jamais consumirá, e o estoque de SUB (que a OP vai baixar) é planejado por uma conta e consumido por outra.

---

## 2. Findings

Severidade e confiança declaradas separadamente. CRITICAL/HIGH emitidos como **PROPOSED** (Regra 22 — passam pelo `vericore-finding-validator`).

### T11-F01 — HIGH / CONFIRMED / **PROPOSED** — MRP explode necessidade bruta sem netagem por nível: recompra componentes de subconjunto que já está em estoque
**Achado novo desta trilha — não consta do `BR_CATALOG.md` nem do discovery.**
`server/src/modules/mrp/application/mrpEngine.ts:229-241` explode **toda** a demanda em bruto antes de qualquer confronto com estoque; o abatimento (`availableStock`) só ocorre em `:243-254`, sobre o agregado final, item a item. Não existe netagem nível a nível (`level-by-level netting`), que é o algoritmo canônico de MRP.
Contraexemplo derivado do próprio código: demanda PA=100, `SUB` com 100 em estoque, `SUB → 2×RAW`. Requisitos: SUB=100, RAW=200. Netagem final: SUB → líquido 0 → filtrado em `:266`; RAW → líquido 200 → **ordem planejada de 200**. Compra-se matéria-prima para produzir um subconjunto que não será produzido.
**Camada guardiã esperada:** o motor de domínio do MRP. **Guardiã real:** nenhuma. **Impacto:** compra a maior, dinheiro e capital de giro. Categoria G3 vedada: regra de negócio crítica.

### T11-F02 — HIGH / CONFIRMED / **PROPOSED** — Lote mínimo e estoque de segurança lêem a mesma coluna, com efeito duplo e cumulativo
Validação independente de `BR-PP-013` (não cópia).
`server/src/modules/items/infrastructure/sequelize/SequelizeItemRepository.ts:109-110` — `estoque_seguranca` e `lote_minimo` recebem **ambos** `liveProduct.min_quantity`. As colunas próprias de `items` (`estoque_seguranca`, `lote_minimo`, distintas) só sobrevivem no fallback sem produto casado — que, pelo próprio `bomStructureProjection.ts:36-38`, é o caso raro.
Consumo em `mrpEngine.ts:246-254`: o mesmo número **reduz** `availableStock` **e** arredonda `plannedQuantity` para múltiplo dele. Com `min_quantity=500`, `onHand=600`, bruto=550: disponível = 100, líquido = 450, planejado = **500**. Duas políticas de PCP acionadas por um campo, sem decisão registrada; nenhum documento declara `lote mínimo = estoque mínimo`.
**Camada guardiã esperada:** parâmetros de planejamento do item (cadastro). **Guardiã real:** um único campo do modelo legado `products`, escolhido no repositório. **Lacuna de teste confirmada:** `tests/unit/mrp-engine.test.ts:18` usa `safetyStock:5` ≠ `minimumLotSize:10` — não exercita o defeito.

### T11-F03 — HIGH / CONFIRMED / **PROPOSED** — `is_phantom` é invariante de explosão que vive só em `bomService`; a projeção do MRP não a transporta
Ver §1. Evidência: `bomStructureProjection.ts:96-106` (SQL sem `is_phantom`), `mrpEngine.ts:32-43` (tipo sem o campo), `mrpEngine.ts:184-206` (desce incondicionalmente), contra `bomService.ts:489-529` (a regra).
**Camada guardiã esperada:** a regra deveria estar **na projeção da estrutura** (fonte única de arestas) ou num objeto de domínio "estrutura vigente" compartilhado. **Guardiã real:** um `if` dentro de um service de aplicação que o MRP não chama. Regra de domínio duplicada por omissão — a segunda implementação é "não implementar", que é a pior forma de duplicação porque não aparece em nenhum diff.

### T11-F04 — HIGH / CONFIRMED / **PROPOSED** — "Que produto pode gerar OP": 4 implementações, 2 respostas, e o método da entidade está morto
Validação independente de `BR-PP-015`. Todas reconferidas linha a linha:
| # | Local | Resposta |
|---|---|---|
| A | `ProductionOrderEntity.ts:139-145` (`assertCanBeCreatedFor`) | só `finished` — **nunca invocado** (grep em todo o repositório: 1 definição, 0 chamadas em `src/`) |
| B | `CreateProductionOrderUseCase.ts:37-41` | reimplementa inline: só `finished` |
| C | `ConvertPlannedOrdersToProductionOrderUseCase.ts:144-155` | `finished` **ou** `semi_finished` |
| D | `ReleaseMasterProductionPlanUseCase.ts:197-210` + `masterProduction/domain/constants.ts:96` | `finished` **ou** `semi_finished` |
O caminho B **instancia** a entidade (`CreateProductionOrderUseCase.ts:32`) e depois ignora o método dela; os caminhos C e D **nem instanciam** a entidade — escrevem direto no repositório (`:201`, `:134`), contornando `validate()` e a serialização `toCreatePersistence`.
**Diagnóstico de fronteira:** a `ProductionOrderEntity` é um agregado que não guarda a própria criação. Toda invariante de criação depende de cada chamador "lembrar de validar" — exatamente a condição que o G16 (2026-08-09) já corrigiu uma vez e que voltou pelo caminho D, criado depois. É o padrão que reincide.

### T11-F05 — MEDIUM / CONFIRMED — Rótulo de revisão único da BOM: invariante declarada no schema, guardada só por checagem fora da transação
`server/database/postgresql/00_baseline_frozen.sql:4083` declara a regra na própria coluna. A guarda existe apenas em `bomService.ts:286-298` — um `findOne` **antes** de `sequelize.transaction(...)`, que só abre em `:308`. Janela TOCTOU clássica.
Não há índice único `(product_id, revision)` em `bill_of_materials` (varredura de índices do baseline). **Assimetria interna que fecha o argumento:** o mesmo controle de alteração de engenharia, aplicado a roteiro de manufatura, **tem** o índice — `00_baseline_frozen.sql:21848` (`production_routes_product_id_revision`). A BOM não tem.
**Positivo registrado no mesmo assunto:** a invariante irmã "no máximo 1 BOM `active` por produto" **está** guardada na camada certa — índice parcial único `uq_bill_of_materials_active_per_product` (`baseline:21967`) mais a transação de `SequelizeBOMRepository.activateExclusively:165-188`. Resíduo menor: sob concorrência a colisão emerge como violação de unicidade não tipada, não como erro de negócio.

### T11-F06 — MEDIUM / CONFIRMED — `BomService` não aceita transação externa: disponibilidade, reserva e consumo são avaliados fora do lock da OP
`ChangeProductionOrderStatusUseCase.ts:414` (`explodeBOM` na conclusão), `:688` (`checkAvailability` na liberação) e `:701` (`explodeBOM` para reservar) rodam **dentro** da transação `t` aberta em `:73`, mas **nenhuma delas recebe `t`** — `BomService.explodeBOM(productId, quantity, options)` (`bomService.ts:423`) não tem parâmetro de transação, e `BillOfMaterial.findOne` em `:432` roda sem ela.
Consequências de fronteira: (i) a checagem de disponibilidade e a reserva não são atômicas entre si; (ii) o próprio `ReleaseMasterProductionPlanUseCase.ts:37-42` **declara** essa limitação como conhecida e herdada; (iii) é a **mesma causa-raiz** do risco residual dirigido por T-05 (`ImportCatalogSpreadsheetUseCase.ts:21-28,167-194` — `BomService.createBOM` abre transação própria em `bomService.ts:308` e não aceita uma de fora). **Handoff a T-05 confirmado: uma causa, dois sintomas.** Não é defeito do chamador; é a fronteira do serviço de BOM que não expõe transação.

### T11-F07 — MEDIUM / CONFIRMED — A OP não registra contra qual revisão de BOM rodou; o consumo usa a BOM vigente no instante da conclusão
`ChangeProductionOrderStatusUseCase.ts:414` explode a BOM **ativa no momento da conclusão**; a reserva usou a BOM ativa **no momento da liberação** (`:701`). Entre os dois instantes, `PUT /api/engineering/bom/:id` com `status: 'active'` (`UpdateBOMUseCase.ts:81-93`) ou um `POST` de nova revisão trocam a estrutura vigente. `production_orders` não tem coluna de BOM (confirmado em `ProductionOrderEntity.ts:13-31` e no payload de criação `:221-235`).
A liberação de reserva foi blindada contra isso (`releaseOwnReservations:759-765`, lê a reserva persistida), mas **o consumo e o custeio não** — eles reexplodem a BOM atual.
**Contradição documental registrada:** a regra `G1-BOM-REV-DUP` é justificada, no próprio código, por *"é ela que identifica, depois, contra qual versão da estrutura cada ordem de produção rodou"* (`bomService.ts:284-285,293-294`), e o cabeçalho de `bomStructureProjection.ts:39-42` invoca ISO 9001 §8.5.6. **A identificação que a regra promete não é persistida em lugar nenhum.** A rastreabilidade existente (`ProductionLotConsumption`) registra lote, não revisão de estrutura.

### T11-F08 — MEDIUM / CONFIRMED — `explodeBomRequirements` sem teto de profundidade e sem memoização
`mrpEngine.ts:184-206`: `visit()` é reinvocado por ocorrência de aresta, sem cache por `(item, nível)`. O único freio é ciclo por caminho de ancestrais (`:188`). Estrutura em diamante com N níveis produz travessia exponencial; cadeia linear de 50 níveis passa (congelado pelo teste do passo 30, `:110-133`). O motor de produção tem `maxDepth=10` (`bomService.ts:424,459-464`) — **a mesma estrutura tem teto num motor e não tem no outro**. `BR-PP-017` registra `maxDepth=10` como valor sem fonte de negócio (UNKNOWN); confirmo: nenhum documento fixa profundidade máxima da estrutura da Evok.

### T11-F09 — MEDIUM / CONFIRMED — `PUT /:id/status` concentra quatro atos de domínio distintos sob um único nível de permissão
`productionOrders.ts:32` — `producao:operate` cobre: liberar (reserva material — `ChangeProductionOrderStatusUseCase.ts:87-90`), iniciar, **concluir** (consome estoque, baixa lote, grava custo médio ponderado e overhead — `:107-110`, `:438-509`) e cancelar (devolve reserva — `:112-114`). A granularidade da autorização não acompanha a granularidade do ato de domínio: quem pode iniciar uma OP pode encerrá-la movimentando estoque e alterando custo de produto. Consumido do mapa de T-04 §6 (`C13-C16`, classificado ali como materialidade menor pelo ângulo authZ); **adjudicado aqui pelo ângulo de domínio como fronteira mal traçada**, não como falha de nível. Sem promoção a HIGH: nenhum caminho de contorno de nível foi encontrado, e a contornabilidade efetiva depende de DYN-04 (bloqueada por G4).

### T11-F10 — HIGH / CONFIRMED / **PROPOSED** — Terceira superfície de estrutura de produto, **de escrita**, sobre a árvore que ninguém planeja
`server/src/modules/items/presentation/routes/items.ts:18-19`:
- `POST /api/items/:id/estrutura` (`produtos:operate`) → `CreateItemStructureUseCase` grava em `item_estruturas`;
- `GET /api/items/:id/estrutura/explode` → `ExplodeItemStructureUseCase.ts:29-42`, que lê `ItemEstruturaRepository.listActiveEdges()` e passa por `explodeBomRequirements` (o motor do MRP).

Depois do G1, **nada de planejamento, reserva, consumo ou custeio lê `item_estruturas`**. O usuário monta uma estrutura de produto por um endpoint legítimo, autenticado e autorizado, recebe uma explosão plausível de volta — e nem o MRP nem a OP enxergam uma linha dela. O guarda de inativação de item já foi migrado para a fonte certa (`bomStructureProjection.hasActiveParentOrComponent:262-266`), mas **a superfície de escrita não foi**.
**Fronteira de domínio:** existem dois conceitos "estrutura de produto" em dois bounded contexts (`items` e `bom`), com dois cadastros, e apenas um governa dinheiro e estoque. **Handoff obrigatório a T-01 (`items`) e T-05 (fluxo item↔produto)** — o módulo é deles; a fronteira é deste relatório. Escalado sem conciliação (Regra 20).

### T11-OBS-01 — Observação de qualidade de evidência da própria run (não é finding do produto)
A premissa de `planejamento-producao--bom-explosion-divergence-mrp-vs-op.test.ts:7-25` é factualmente incorreta no AUDIT_COMMIT (§1.1), e dela derivam a confiança MEDIUM de `BR-PP-016b` e a instrução "comparação inviável por construção" recebida por esta trilha. Os 47 testes de caracterização continuam **válidos como congelamento de comportamento** — o que cai é a explicação, não a medição. Encaminhado a **T-26** (conciliação de evidência) e a **T-14** (revalidação das 164 BRs: `BR-PP-016b` deve subir para confiança CONFIRMED e mudar de fundamento).

### Adjudicação do insumo dirigido de T-04 (Classe C — `masterProductionPlans.ts:37,38,39`)
`firm`/`release`/`cancel` em `mrp:operate` **explícito**. Reconferido no AUDIT_COMMIT: as três linhas existem como descritas; a justificativa está escrita no cabeçalho do arquivo (`:20-28`) e remete a pendência de decisão do dono.
**Veredito de domínio: CONFIRMADA a ausência, NÃO PROMOVIDA** — coerente com `FIND-ERP-009` §6 e com a EMENDA-01 §E.3. Fundamento próprio, não deferência: `firm` congela a decisão (`ChangeMasterProductionPlanStatusUseCase.ts:81-101`) e `release` cria OPs reais (`ReleaseMasterProductionPlanUseCase.ts:132-158`) — são atos aprovatórios pela semântica de domínio; mas o nível `approve` para o ator PCP é **política de alçada que o dono não definiu**, e inventá-la aqui violaria a Regra 6. Registro adicional, dentro do meu mandato: `firmed_by` e `released_by` são gravados (`:100,163`) e **nunca comparados** — a invariante "quem firma não libera" não existe em lugar nenhum do código. Não é defeito (nenhuma BR a declara); é **lacuna de regra**, encaminhada a T-09 e ao dono.

---

## 3. Mapa invariante × camada guardiã (entregável da trilha)

| # | Invariante | Guardiã esperada | Guardiã real no AUDIT_COMMIT | Status |
|---|---|---|---|---|
| I-01 | Máquina de estados da OP (6×6) | entidade | `ProductionOrderEntity.ts:60-67,157-213`, chamada por `ChangeProductionOrderStatusUseCase.ts:81` | **PROTEGIDA** |
| I-02 | Sobreprodução exige confirmação explícita | entidade | `ProductionOrderEntity.ts:190-204` | **PROTEGIDA** |
| I-03 | Quantidade da OP é imutável após criação | use case | `UpdateProductionOrderUseCase.ts:10,30` (allowlist sem `quantity`, `status` recusado) | **PROTEGIDA** |
| I-04 | Produto que pode gerar OP | entidade | 3 use cases + 1 método morto, 2 respostas | **T11-F04** |
| I-05 | Concluir OP exige BOM ativa (G2) | use case | `ChangeProductionOrderStatusUseCase.ts:413-423` | **PROTEGIDA** |
| I-06 | Concluir com qtd zero é proibido (G2) | use case | `:389-396` | **PROTEGIDA** |
| I-07 | OP libera só a própria reserva (G3) | serviço de estoque + tabela | `:759-765` sobre `production_order_reservations`, com índice único parcial (`baseline:22044`) | **PROTEGIDA** |
| I-08 | OP com reserva viva não é removível (G3) | use case | `RemoveProductionOrderUseCase.ts:41-48` | **PROTEGIDA** |
| I-09 | 1 BOM `active` por produto (G1) | banco + repositório | `baseline:21967` + `SequelizeBOMRepository.ts:165-188` | **PROTEGIDA** |
| I-10 | BOM `active` imutável / `superseded` intocável | use case | `UpdateBOMUseCase.ts:114-157` | **PROTEGIDA** |
| I-11 | Rótulo de revisão único por produto | banco | só app, fora da transação | **T11-F05** |
| I-12 | Ciclo na BOM barrado na escrita (G1) | serviço + projeção | `bomService.ts:226-234,261-278` + `bomStructureProjection.ts:323-357` (espaço de `products.id`, decisão correta) | **PROTEGIDA** |
| I-13 | Profundidade máxima da estrutura | motor | só em `bomService`; ausente no MRP | **T11-F08** |
| I-14 | Explosão para em subconjunto estocável (G18) | projeção/estrutura | só em `bomService` | **T11-F03** |
| I-15 | Netagem antes de explodir nível seguinte | motor MRP | inexistente | **T11-F01** |
| I-16 | Parâmetros de planejamento distintos (lote × segurança) | cadastro de item | uma coluna para dois papéis | **T11-F02** |
| I-17 | OP rastreável à revisão de BOM que consumiu | tabela `production_orders` | inexistente | **T11-F07** |
| I-18 | Estrutura de produto tem fonte única | bounded context | duas superfícies de escrita | **T11-F10** |
| I-19 | Apontamento obrigatório para concluir (G4) | regras puras + use case | `productionTrackingRules` via `:330-368` | **PROTEGIDA** (com chave de ambiente `PRODUCTION_TRACKING_REQUIRED`; default seguro `block`, `:140-153`) |
| I-20 | Partida exige lastro de roteiro (G6) | regras puras | `:302-328` | **PROTEGIDA** |
| I-21 | MPS: `draft→firm→released`, terminais | constantes de domínio | `masterProduction/domain/constants.ts:206-223` | **PROTEGIDA** |
| I-22 | Firmar exige decisão registrada | use case | `ChangeMasterProductionPlanStatusUseCase.ts:81-98` | **PROTEGIDA** |
| I-23 | Liberar MPS é tudo-ou-nada | use case | `ReleaseMasterProductionPlanUseCase.ts:120-127,185-239` | **PROTEGIDA** |
| I-24 | Rerun do MRP não rebaixa status de ordem convertida | repositório | `SequelizeMrpRepository.ts:78-81` | **PROTEGIDA** |
| I-25 | Segregação firmar × liberar | — | não existe regra | **LACUNA DE REGRA** (dono) |

**14 de 25 invariantes protegidas pela camada certa.** Este módulo **não** é um domínio anêmico: `ProductionOrderEntity`, `masterProduction/domain/constants.ts` e `productionTrackingRules.ts` são domínio real e testável. O padrão de falha é específico e repetido: **a regra que atravessa dois módulos** (`bom`↔`mrp`, `bom`↔`production`, `items`↔`bom`) é a que fica sem dono.

---

## 4. Cobertura declarada

| Objeto | Nível | Observação |
|---|---|---|
| `mrp` (4 endpoints) | **E** | rotas, controller-path, motor, 5 use cases, repositório |
| `bom` (12 endpoints) | **E** | rotas, controller, `UpdateBOMUseCase`, repositório, `bomService.ts` integral (795 linhas), `bomStructureProjection.ts` integral |
| `masterProduction` (7 endpoints) | **E** em D3/D4 (exigido por EMENDA-02 C-14/C-15) | rotas, constantes, `ChangeStatus`, `Release`. **Não lidos linha a linha:** `CreateMasterProductionPlanUseCase`, `DecideMasterProductionPlanLineUseCase`, repositório |
| `production` (23 endpoints) | **PARCIAL — declarado** | ciclo de vida da OP coberto exaustivamente (`ChangeProductionOrderStatusUseCase` 1.015 linhas, `Create`/`Update`/`Remove`, entidade, rotas). **Não lidos:** `productionRoutes` (roteiro de manufatura, 9 use cases), `productionDowntimes` (4), `productionTracking` (4), `productionRouteRules.ts`, `productionTrackingRules.ts` (lido só por referência cruzada) |

**Varredura de testes feita em `server/tests/` inteiro** (correção metodológica do passo 29 observada): 41 suítes tocam o cluster, distribuídas em `unit/`, `integration/` e `characterization/` — nenhuma delas mora sob a pasta do módulo. Glob restrito a `modules/*/` teria reportado "sem teste" falsamente, de novo.
**Lacunas de teste confirmadas:** nenhuma suíte confronta os dois motores sobre a mesma fonte (T11-F03); nenhuma exercita `min_quantity` idêntico nos dois papéis (T11-F02); nenhuma cobre netagem por nível (T11-F01); nenhuma marca `assertCanBeCreatedFor` como código morto (T11-F04).

---

## 5. Risco residual (condição G3-b) — específico de T-11

| ID | Risco |
|---|---|
| RES-T11-01 | **`production` coberto parcialmente.** Roteiro de manufatura, apontamento e paradas não auditados linha a linha. Toca regra de negócio crítica e custo (mão-de-obra/overhead vêm do apontamento) — **categoria vedada por G3**. Não é inaplicabilidade técnica: é escopo não executado dentro do orçamento de 5 S. Deve ser suprido antes do fechamento da trilha ou registrado como redução de cobertura com aceite do dono. |
| RES-T11-02 | **Contornabilidade de `mrp:operate` em firm/release não verificada** — depende de DYN-04, bloqueada por G4. `CONFLITO-G3×G4` aplicável. |
| RES-T11-03 | **Estado real dos dados não observado** (`APR-2026-016`): quantos produtos têm BOM sem `items.codigo` correspondente (`listStructureGaps`), quantos itens têm `min_quantity` ≠ 0, quantas linhas vivas há em `item_estruturas`. A **materialidade** de F01, F02, F03 e F10 é, portanto, argumentada, não medida. |
| RES-T11-04 | Corolário de RES-T11-03: nenhum finding desta trilha quantifica prejuízo em R$ ou em unidades. |

---

## 6. DYN — evidência dinâmica solicitada (G4 aberto)

Nenhuma sondagem executada. Regime `APR-2026-016` íntegro: zero conexão, zero execução, zero inspeção de dado real.

| ID | Pedido | Alvo | O que prova | Substituível estaticamente? |
|---|---|---|---|---|
| **DYN-T11-A** | Rodar `explodeBomRequirements` e `BomService.explodeBOM` sobre **o mesmo fixture** de `bill_of_materials` em `erp_evok_audio_test`, com `is_phantom=false` num subconjunto com BOM própria, e diffar as listas | `erp_evok_audio_test` (G4 aprovado) | converte T11-F03 de comparação analítica em **diff de saída sobre o mesmo dado** — hoje tecnicamente possível, ao contrário do que o passo 30 concluiu | **NÃO.** É a prova que fecha o "pronto quando" da trilha |
| **DYN-T11-B** | Plano MRP com `SUB` em estoque suficiente e `RAW` zerado | idem | T11-F01: mede a compra a maior | **NÃO** |
| **DYN-T11-C** | Plano MRP com item cujo `products.min_quantity = 500` | idem | T11-F02: efeito duplo em número | **NÃO** |
| **DYN-T11-D** | `POST /api/items/:id/estrutura` seguido de `POST /api/mrp/plan` para o mesmo item | idem | T11-F10: prova que a estrutura escrita não produz nenhuma ordem planejada | **NÃO** |
| **DYN-T11-E** | Duas ativações concorrentes de BOMs distintas do mesmo produto | idem | resíduo de I-09: confirma que a colisão emerge como violação de unicidade não tipada | PARCIALMENTE (o índice está declarado no baseline) |

Trilha encerra em **`READY_TO_CLOSE_BLOCKED_BY_G4`** quanto a DYN-T11-A/B/C/D. A parte estática está fechada.

---

## 7. Medição (G11-c)

| | |
|---|---|
| **Estimado** | 5 S (AUDIT_PLAN 4 S + EMENDA-02 §7.1 +1 S por C-14/C-15) |
| **Real** | ≈ **3,2 S** |
| **Leitura honesta** | O número **não** significa eficiência. Significa que `production` (23 dos 46 endpoints da trilha, metade da superfície) recebeu profundidade em **um** eixo — o ciclo de vida da OP — e nenhuma em roteiro, apontamento e paradas. Gastar as 1,8 S restantes ali era o uso correto do orçamento aprovado. Registro isso como **RES-T11-01**, e não como economia: sob G3, cobertura não executada é risco residual, nunca sessão poupada. |
| **Onde o esforço rendeu acima do previsto** | `mrpEngine`+`bomStructureProjection`+`bomService` somam ~1.400 linhas com documentação interna densa e datada, que permitiu reconstruir a cronologia G1→G18 e detectar que a premissa herdada estava vencida. Documentação boa no código **acelerou** a auditoria — e foi um comentário histórico lido como estado vigente que produziu o erro que esta trilha corrige. |
| **Onde rendeu abaixo** | A varredura de índices do baseline (207 tabelas) para confirmar I-09/I-11 custou desproporcionalmente ao valor; é trabalho de T-13 e deveria ter chegado pronto. |

---

## 8. Arquivos relevantes (absolutos)

- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mrp\application\mrpEngine.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mrp\infrastructure\sequelize\SequelizeMrpRepository.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mrp\application\use-cases\GenerateMrpPlanUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\mrp\application\use-cases\ConvertPlannedOrdersToProductionOrderUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\bomService.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\bomStructureProjection.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\bom\application\use-cases\UpdateBOMUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\bom\infrastructure\sequelize\SequelizeBOMRepository.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\bom\presentation\routes\bom.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\production\domain\entities\ProductionOrderEntity.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\production\application\use-cases\ChangeProductionOrderStatusUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\production\application\use-cases\CreateProductionOrderUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\production\presentation\routes\productionOrders.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\masterProduction\application\use-cases\ReleaseMasterProductionPlanUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\masterProduction\domain\constants.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\masterProduction\presentation\routes\masterProductionPlans.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\infrastructure\sequelize\SequelizeItemRepository.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\application\use-cases\ExplodeItemStructureUseCase.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\items\presentation\routes\items.ts`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql`
- `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\characterization\planejamento-producao--bom-explosion-divergence-mrp-vs-op.test.ts`

**Persistência:** este relatório destina-se a `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-11_PRODUCAO_MRP.md`, via `vericore-audit-evidence-controller`. Não escrevi arquivo algum (Regra 2 e vedação de relatório em disco).
**Escalonamentos abertos:** T11-F10 → T-01/T-05; T11-OBS-01 → T-26/T-14; T11-F06 → T-05 (causa-raiz comum); T11-F09 e I-25 → T-09; RES-T11-01 → `vericore-software-audit-director` (decisão sobre suprir ou registrar redução).
Nenhuma declaração de `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` ou `REMEDIATION COMPLETE` é emitida aqui.
