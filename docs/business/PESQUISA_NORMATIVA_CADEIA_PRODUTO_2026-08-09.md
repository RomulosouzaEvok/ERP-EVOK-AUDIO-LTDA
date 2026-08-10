# Pesquisa Normativa — Cadeia de Produto (6 Decisões de Processo)

**Projeto:** ERP Evok Áudio LTDA — indústria de auto-falantes profissionais, manufatura discreta, ~100-150 funcionários
**Data:** 2026-08-09
**Status:** 🟡 EM ELABORAÇÃO (escrito incrementalmente — seções marcadas ⏳ ainda não preenchidas)
**Objetivo:** Dar ao dono do produto recomendações **fechadas com fonte normativa** onde a lei/norma já responde, e recomendações de **boa prática de mercado claramente rotuladas como tal** onde não há norma.

## Convenção de confiabilidade

| Marca | Significado |
|-------|-------------|
| ✅ **NORMA** | Existe lei, decreto, IN, NBR ou cláusula ISO que responde. URL citada. Dono apenas valida. |
| 📘 **BOA PRÁTICA** | Não há norma vinculante; é padrão consagrado de ERP/APICS/COSO. Dono decide. |
| ⚠️ `[NÃO CONFIRMADO NA FONTE]` | Não foi possível verificar na fonte oficial nesta rodada. **Não usar como base de decisão sem confirmar.** |

---

## Índice

1. [Produção sob encomenda (MTO) vs. para estoque (MTS) e o papel do MPS](#decisão-1)
2. [Unificação das duas estruturas de produto (BOM)](#decisão-2)
3. [Quem aprova alteração de engenharia (ECO/ECN)](#decisão-3)
4. [Apontamento de produção obrigatório? (Bloco K + custeio)](#decisão-4)
5. [Gate de qualidade e momento da baixa de estoque](#decisão-5)
6. [Alçada de compra e reconhecimento financeiro](#decisão-6)
7. [Perguntas para o dono / contador](#perguntas)

---

<a name="decisão-1"></a>
## Decisão 1 — Produção sob encomenda (MTO) vs. para estoque (MTS)

### Recomendação

📘 **Modelo híbrido por item, não por empresa: catálogo em MTS/ATO, OEM customizado em MTO — e, nos dois casos, a venda NÃO gera OP.** A venda gera **demanda**; o **Plano Mestre de Produção (MPS)** é quem gera a OP. Implemente o MPS como camada explícita entre carteira e ordem.

### Base normativa

⚠️ **Não há norma legal aqui.** Isto é engenharia de produção, não legislação. A referência de mercado é o corpo de conhecimento **ASCM/APICS (CPIM)** — que **não é norma vinculante**, mas é o padrão de fato que todo ERP sério implementa.

**Fonte primária consultada (documento oficial ASCM):** *APICS CPIM Learning System, Version 6.2, 2020 Edition — Module 1: Basics of Supply Chain Management*, excerto público:
<https://learningsystem.ascm.org/wp-content/uploads/2019/11/CPIM_LS_2020_Excerpt-2.pdf>

Trechos literais relevantes (tradução livre indicada entre parênteses):

> *"Master planning begins with **sales and operations planning**, which is an executive-level decision-making process where the supply, demand, and financial sides of the organization agree on a consensus plan for satisfying demand in a feasible and profitable manner. The result is a **production plan**…"*

> *"The next level of master planning is **master scheduling**. This is planning over a shorter time horizon, and the demand information provided is now at the detail level for individual units. **(These could be raw materials in a make-to-order environment, components in an assemble-to-order environment, or finished goods in a make-to-stock environment.)** The second level of capacity planning, **rough-cut capacity planning**, takes place at this point. This is a check to see if bottleneck work centers and other key resources will have sufficient capacity. Once any adjustments are made, the output of master scheduling is a **master production schedule** for each product. The schedule indicates what will be made in each time period of the planning horizon."*

> *"Continuing down, now we begin the detailed planning and scheduling needed to meet the master production schedule. This involves **material requirements planning (MRP)**, which uses **bills of material** and other basic inputs to calculate all of the raw materials and components that need to be used from inventory or purchased. MRP also calculates **when** to purchase or release these items so they will arrive on time. (…) the third level of capacity planning, **capacity requirements planning**, occurs at this point."*

> *"**The bottom level is where planning ends and execution takes over.**"*

O mesmo documento cita a definição do **APICS Dictionary, 16ª edição**, de *master planning*: *"a group of business processes that includes the following activities: demand management (which includes forecasting and order servicing); production and resource planning; and master scheduling (which includes the master schedule and the rough-cut capacity plan)."*

### Por que ERPs sérios NÃO geram OP automática direto do pedido

Esta era a pergunta central, e o excerto acima já a responde estruturalmente: **existem três checagens de capacidade em três horizontes diferentes entre a demanda e a ordem** (resource planning → rough-cut capacity planning → capacity requirements planning). Gerar OP direto do pedido **pula as três**. As razões concretas:

1. **Sem verificação de capacidade, a "ordem" é uma mentira com data.** A OP nasce com uma data de entrega que ninguém checou contra o centro de trabalho. O ERP passa a prometer o que a fábrica não pode fazer. É por isso que a hierarquia tem *rough-cut capacity planning* **no nível do MPS, antes da ordem**.
2. **Perde-se o agrupamento de lote.** Cinco pedidos do mesmo modelo em três dias viram cinco OPs de setup próprio em vez de uma OP única. Em manufatura discreta com setup relevante (e bobinagem/colagem/prensagem de alto-falante tem setup), isso é destruição direta de margem.
3. **Não há amortecimento de variabilidade.** Cancelamento ou alteração de pedido vira cancelamento de OP com material já requisitado e, possivelmente, já consumido. O MPS existe justamente para ser o ponto onde a mudança é barata.
4. **A OP passa a ser gerada por quem não tem a informação.** Quem confirma o pedido é o Comercial; quem sabe se cabe na semana é o PCP. Gerar OP no ato da venda **transfere a decisão de produção para Vendas** — inversão de responsabilidade que nenhum ERP maduro faz.
5. **Item comum a vários produtos é planejado n vezes.** Sem consolidação no MPS, o mesmo componente é requisitado por várias OPs isoladas, em vez de um requerimento líquido único. **É a mesma canibalização de reserva já mapeada, um nível acima.**
6. **Produto de catálogo simplesmente não deveria esperar pedido.** Em MTS, a OP existe **antes** da venda — o pedido consome estoque, não dispara fábrica.

**O que ERPs usam no lugar:** MPS + **ATP (available-to-promise)**. O pedido consulta o ATP para dar uma data confiável; o MPS decide o que produzir e quando; o MRP explode o MPS. O documento ASCM cita ATP e *capable-to-promise* como capacidades de sistemas de planejamento avançado.

### Quando cabe cada modo (manufatura discreta deste porte) 📘

| Modo | Cabe quando | No caso Evok |
|---|---|---|
| **MTS** (make-to-stock) | produto de catálogo, demanda previsível, lead time de produção **maior** que o prazo que o cliente aceita esperar, custo de manter estoque baixo | **linha de catálogo** — alto-falantes de modelos padrão, vendidos por distribuidor/revenda |
| **ATO** (assemble-to-order) | muitas variantes a partir de poucos subconjuntos comuns; guarda-se estoque **no nível do componente**, não do acabado | **provavelmente o mais aderente para o mix**: mesmo conjunto móvel/ímã/carcaça, variações de terminal, impedância, acabamento, marca gravada |
| **MTO** (make-to-order) | especificação por cliente, baixo volume, alto valor, cliente aceita esperar | **OEM customizado** |
| **ETO** (engineer-to-order) | há projeto de engenharia por pedido | provavelmente **não** se aplica, salvo desenvolvimento OEM do zero |

**A decisão certa não é "a Evok é MTO ou MTS" — é um atributo por item.** Cada SKU carrega uma **política de planejamento** (`planning_policy`: MTS / ATO / MTO), e o MPS trata cada uma diferente:
- **MTS** → MPS dirigido por **previsão + estoque mínimo/ponto de pedido**; o pedido de venda **consome** a previsão.
- **ATO** → MPS no nível do **subconjunto**; o acabado é montado contra pedido (*final assembly schedule*).
- **MTO** → MPS dirigido pela **carteira firme**; a previsão só reserva capacidade, não material.

⚠️ **O ponto de desacoplamento (onde o estoque para de ser "genérico" e vira "do cliente") é a decisão de negócio real por trás de tudo isso.** Este documento não pode decidi-la — depende de prazo prometido ao cliente × lead time de produção, que só o dono sabe.

### Desenho proposto

```
Previsão de vendas ─┐
                    ├─> [MPS]  ──> ordens planejadas ──(firmar)──> OP
Carteira firme  ────┘     ↑                                 │
                          │                                 ├─> reserva de material
Estoque mín./ponto de ────┘                                 └─> requisição de compra
pedido                (rough-cut capacity: cabe?)
                          │
                          └─> ATP ──> data confiável de volta para Vendas
```

Regras de desenho:
1. **A venda nunca cria OP.** A venda cria **demanda** — uma linha na carteira que o MPS enxerga.
2. **O MPS produz "ordens planejadas", não OPs.** Uma ordem planejada é editável, agrupável, adiável e **descartável sem consequência**. Só ao ser *firmada* pelo PCP vira OP com reserva de material e número.
3. **O MRP explode o MPS, não a carteira.** Isso conserta o gap mapeado ("MRP não lê a carteira") **pelo caminho certo** — a solução não é fazer o MRP ler pedidos, é fazer o MPS ler pedidos e o MRP ler o MPS. Ler a carteira direto no MRP recria o problema 5 acima.
4. **Estoque mínimo entra como fonte de demanda do MPS**, não como alerta solto.

### Esforço / risco aqui

**Estado atual (verificado):** o MRP existe (`server/src/modules/mrp/application/use-cases/GenerateMrpPlanUseCase.ts:75`) e explode a BOM via `listActiveEdges()` (`server/src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository.ts:7`), mas **a demanda é digitada à mão** — não há leitura de carteira nem de estoque mínimo. **Não existe entidade de MPS nem de ordem planejada.** Não há `planning_policy` por item. Não há capacidade finita (o CLAUDE.md já a coloca na Fase 3/P2), e `GetWorkCenterLoadUseCase` existe mas depende de `production_routes`, que **não tem API** (ver Decisão 4).

| Item | Referência | Esforço | Risco |
|---|---|---|---|
| `planning_policy` por item (MTS/ATO/MTO) + estoque mín./máx. | `server/src/models/Product.ts` / modelo `Item` | **Baixo** | Baixo |
| Entidade MPS + ordens planejadas | novo | **Alto** | Médio |
| MRP passar a ler MPS em vez de demanda digitada | `GenerateMrpPlanUseCase.ts:75` | **Médio** | Médio |
| Carteira e estoque mínimo como fontes de demanda do MPS | `modules/sales` (leitura) | **Médio** | Baixo |
| Rough-cut capacity no MPS | depende de `ProductionRoute` **ter API** (`server/src/models/ProductionRoute.ts:42`) | **Alto** | Médio |
| ATP para dar data ao Comercial | novo | **Médio** | Baixo |

**Migração de dado:** baixa — MPS é camada nova e aditiva; as OPs existentes continuam válidas. **O risco aqui é de processo, não de dado:** o PCP passa a ter uma etapa que hoje não existe, e sem treinamento a equipe vai firmar tudo automaticamente, o que reproduz o comportamento atual com mais cliques.

📘 **Faseamento recomendado (não faça tudo):**
- **Fase 1 (barata, alto retorno):** `planning_policy` + estoque mínimo por item + MRP lendo carteira e estoque mínimo como demanda. **Já elimina a digitação manual**, que é o gap mais grosseiro.
- **Fase 2:** MPS com ordens planejadas firmáveis.
- **Fase 3:** rough-cut capacity + ATP (depende da API de roteiro).

### O que o dono precisa confirmar

1. **Qual o mix real hoje** entre catálogo e OEM customizado (% de faturamento e % de itens)?
2. **Qual prazo de entrega é prometido ao cliente** e **qual o lead time real de produção**? A diferença entre os dois **é** o que define o ponto de desacoplamento — e portanto se o modelo é MTS, ATO ou MTO.
3. **Existe previsão de vendas hoje?** Se não existe nenhuma, MPS para itens MTS não tem entrada e a Fase 1 tem que começar por estoque mínimo/ponto de pedido.
4. **Setup é relevante?** (tempo de troca entre modelos). Se for alto, o ganho de agrupamento no MPS é o principal argumento econômico; se for baixo, o argumento enfraquece.
5. **Quem exerce a função de PCP hoje** — existe a pessoa que vai firmar as ordens planejadas? Se não existir, o MPS vira burocracia sem dono.

---

<a name="decisão-2"></a>
## Decisão 2 — Unificação das duas estruturas de produto (BOM)

### Recomendação

📘 **Strangler com dual-read verificado, nunca big-bang.** Eleger `item_estruturas` como estrutura sobrevivente, escrever nas duas por um período, **rodar um comparador diário que prove equivalência** e só então cortar a leitura de `bill_of_material_items`. **O corte só acontece depois de N dias consecutivos com zero divergências** — a prova de equivalência é o critério de aceite, não a data no cronograma.

### Base normativa

⚠️ **Não há norma que diga como unificar duas tabelas.** Isto é engenharia de migração. Duas amarrações normativas indiretas, ambas já cobertas em outras decisões:
- ✅ **Bloco K, registro K235** (insumos consumidos na produção) exige que o consumo declarado ao Fisco seja **um só e reconciliável** com a estrutura do produto. Duas BOMs divergentes significam que o consumo teórico que o Fisco vai comparar contra o real depende de qual tabela o ERP consultou. Ver Decisão 4 e <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2009/AJ_002_09>.
- ✅ **ISO 9001:2015, 8.3.6** (alterações de projeto) exige informação documentada da alteração e de sua autorização. **Com duas estruturas, um ECO aprovado altera uma e a outra continua valendo** — o registro da alteração passa a ser factualmente falso. Ver Decisão 3.

### O problema real (verificado no código)

São duas estruturas com modelos, tabelas e **idiomas** diferentes, e **nenhum código lê as duas**:

| | Estrutura A | Estrutura B |
|---|---|---|
| **Modelo** | `ItemEstrutura` | `BillOfMaterial` + `BillOfMaterialItem` |
| **Tabela** | `item_estruturas` (`server/src/models/ItemEstrutura.ts:166`) — colunas em PT (`item_pai_id`, `item_componente_id`, `quantidade`, `perda_percentual`, `ativo`) | `bill_of_material_items` (`server/src/models/BillOfMaterialItem.ts:68`) |
| **Quem lê** | **MRP / planejamento** — `SequelizeMrpRepository.ts:7` (`listActiveEdges()`, `ativo: true`), consumido em `GenerateMrpPlanUseCase.ts:75`; e o CRUD de Itens (`SequelizeItemEstruturaRepository.ts:3`, `CreateItemStructureUseCase.ts:4`, `ExplodeItemStructureUseCase.ts:4`) | **Produção / execução** — `bomService.ts:225`/`:230` (`explodeBOM`, multi-nível em `:283`/`:289`), `checkAvailability()` em `:412`; conclusão de OP em `ChangeProductionOrderStatusUseCase.ts:183` (import em `:13`); API `/api/bom` via `SequelizeBOMRepository.ts:2` |
| **Sincronização em runtime** | **Nenhuma.** Existe apenas um script de backfill pontual B→A: `server/src/scripts/backfill/02c_bom_to_item_estrutura.ts` | |

**Consequência.** O MRP planeja compra pela estrutura A; a OP consome e custeia pela estrutura B. Se as duas divergirem — e elas **vão** divergir, porque `/api/bom` grava só em B e o CRUD de itens grava só em A — o ERP compra o que não vai usar e usa o que não comprou, **e ninguém recebe nenhum alerta**. É um erro silencioso por construção. Vale notar que o gap "OP concluía sem BOM ativa → custo zero" (já corrigido, guarda em `ChangeProductionOrderStatusUseCase.ts:186`) era **um sintoma disto**: a BOM existia — na outra tabela.

### Qual estrutura sobrevive

📘 **Recomendo `item_estruturas` (A).** Justificativas, em ordem de peso:

1. **É a estrutura do modelo-alvo.** A arquitetura do projeto migra `Product` → `Item` (Fase 1-4.1 do HANDOFF_CODEX); `bill_of_material_items` está ancorada em `Product` (`bomService.ts:27` importa `Product`). Manter B é manter viva a metade legada que o projeto já decidiu aposentar.
2. **É a que o MRP usa**, e MRP é *hot path* — o CLAUDE.md registra explicitamente a decisão de manter o núcleo `Item` intocado por causa de performance de MRP.
3. **O backfill B→A já existe e é transacional por BOM**, com log em `migracao_bom_log` e rollback automático (`02c_bom_to_item_estrutura.ts`, cabeçalho). **A direção de migração já foi escolhida uma vez** — inverter agora joga fora trabalho testado.
4. `item_estruturas` já tem autorrelacionamento (`parent_item_estrutura_id`, resolvido pelo backfill), portanto suporta hierarquia multinível nativamente.

⚠️ **Contraponto honesto:** as colunas de A estão em português e as de B em inglês, e o resto do sistema novo é inglês. Sobreviver A significa **conviver com nomenclatura inconsistente** ou pagar um rename adicional. **Recomendo conviver na v1** — renomear coluna durante uma unificação é empilhar dois riscos no mesmo corte. O rename pode vir depois, isolado.

⚠️ `[NÃO CONFIRMADO]` — **não verifiquei se A tem todos os campos que B tem** (por exemplo, `total_cost` calculado com scrap, que o backfill computa em `calculateTotalCost`). **Antes de decidir, rodar um diff de colunas entre os dois modelos.** Se A não tiver paridade de campos, a escolha muda ou exige migration de expansão de A **antes** do dual-write.

### Desenho proposto — 6 fases, cada uma reversível

```
F0 diagnóstico   ── comparador roda em produção, só reporta. NADA muda.
F1 paridade      ── migration expande `item_estruturas` para cobrir campos de B (se faltarem)
F2 dual-write    ── toda escrita (API /api/bom + CRUD de itens) grava em A e em B
F3 backfill      ── 02c reprocessa o histórico; comparador tem de zerar
F4 dual-read     ── produção lê A, compara com B, LOGA divergência, mas usa A
F5 corte         ── produção lê só A; B vira somente-leitura
F6 aposentadoria ── B marcada DEPRECATED; DROP só num release posterior
```

**Por que não big-bang.** O ponto de leitura crítico é a **conclusão da OP** (`ChangeProductionOrderStatusUseCase.ts:183`), que numa única transação explode a BOM, consome material e calcula custo. Um erro de conversão aqui não produz uma tela quebrada — produz **estoque consumido errado e custo de produto errado**, que se propagam para o CPV, para o Bloco K e para o balanço. **É um erro que ninguém vê no dia e todo mundo vê no fechamento.** Não vale a economia de duas semanas.

**Como provar equivalência antes do corte (o item que decide o sucesso desta migração).**

Um script comparador, rodando diariamente em produção desde a F0, que para **cada item pai**:
1. explode pela estrutura A (`ExplodeItemStructureUseCase` / `listActiveEdges`) e pela B (`bomService.explodeBOM`, `:225`);
2. normaliza os dois resultados para a mesma forma: `{item_componente, quantidade_total_por_unidade}` **no nível de folha**, aplicando perdas (`perda_percentual` em A, `scrap` em B) da mesma maneira;
3. compara com **tolerância explícita** (quantidades são decimais; a comparação tem de ser por `Decimal`, não `float` — o backfill já usa `decimal.js`, seguir o mesmo padrão);
4. reporta 4 classes de divergência, que precisam ser tratadas diferente:
   - **Só em A** (BOM que a produção não enxerga)
   - **Só em B** (BOM que o MRP não enxerga)
   - **Ambas, quantidades diferentes**
   - **Ambas, conjunto de componentes diferente**
5. **Critério de corte:** `N` dias consecutivos com zero divergências das classes 2, 3 e 4 — e as da classe 1 explicitamente revisadas. 📘 Sugestão: `N = 15` dias corridos cobrindo pelo menos um ciclo de fechamento. ⚠️ O número exato é decisão do dono, não deste documento.

**Complicador de custo, que precisa entrar no comparador:** o backfill calcula `total_cost = qty × unit_cost × (1 + scrap%)` (`02c_bom_to_item_estrutura.ts`, `calculateTotalCost`). Se A e B **arredondarem em pontos diferentes** da explosão multinível, o custo total do produto acabado diverge por centavos que **acumulam**. O comparador tem de checar **quantidade E custo**, senão o corte passa com quantidade certa e custo errado — que é exatamente o tipo de erro que só aparece no fechamento contábil.

### Esforço / risco aqui

| Fase | Arquivos | Esforço | Risco |
|---|---|---|---|
| F0 comparador | novo, sobre `bomService.ts:225` e `SequelizeMrpRepository.ts:7` | **Médio** | **Zero** — só lê |
| F1 paridade de colunas | migration sobre `item_estruturas` (`ItemEstrutura.ts:166`) | **Baixo** | Baixo |
| F2 dual-write | `SequelizeBOMRepository.ts:2`, `SequelizeItemEstruturaRepository.ts:3`, `CreateItemStructureUseCase.ts:4` | **Médio** | **Médio** — escrita em dois lugares tem de ser transacional; falha parcial cria a divergência que se quer eliminar |
| F3 backfill | `02c_bom_to_item_estrutura.ts` (já existe, transacional por BOM com rollback) | **Baixo** | Baixo |
| F4 dual-read | `bomService.ts:225`,`:283`,`:412`; `ChangeProductionOrderStatusUseCase.ts:183` | **Médio** | **Médio** |
| F5 corte | idem | **Baixo** | **Alto** — é o ponto de não-retorno |
| F6 DEPRECATED | `BillOfMaterialItem.ts:68` | **Baixo** | Baixo |

**Migração do dado existente — pontos de atenção que o backfill sozinho não resolve:**
1. **BOMs órfãs em A que nunca existiram em B** (criadas pelo CRUD de itens): o backfill é B→A, então **não as toca** — mas elas são invisíveis para a produção hoje. Precisam de revisão manual, não de script.
2. **BOMs que existem nas duas com conteúdo diferente:** o backfill B→A **sobrescreveria A com B**. Isso pode ser exatamente o errado, se a versão correta estiver em A. **Rodar o comparador ANTES do backfill (F0 antes de F3) é o que impede essa perda.** Esta é a razão pela qual F0 vem primeiro e não é opcional.
3. **OPs em andamento no momento do corte:** uma OP liberada antes e concluída depois explodiria BOMs diferentes na liberação e na conclusão. **Cortar com zero OPs abertas**, ou congelar a BOM na liberação da OP (snapshot) — 📘 e *snapshot de BOM na liberação da OP é boa prática independentemente da unificação*, porque é o que torna o custo da OP auditável depois que a engenharia muda o produto (ver Decisão 3).
4. **Não fazer DROP junto com o corte.** F5 e F6 em releases separados. Se F5 der errado, a volta é reverter a leitura — impossível se a tabela já foi dropada. (O CLAUDE.md já registra postura semelhante para as 12 tabelas órfãs do schema-fantasma.)

### O que o dono precisa confirmar

1. **Quantos itens têm BOM hoje, e quantos têm BOM nas duas estruturas?** Se forem poucas dezenas, o comparador pode virar revisão manual assistida e a migração encolhe drasticamente. Se forem centenas, o comparador é obrigatório.
2. **Qual estrutura os usuários estão de fato mantendo hoje?** Se a Engenharia cadastra por `/api/bom` (B) e ninguém usa o CRUD de itens (A), a resposta sobre "qual é a verdade" é B, e isso **inverte a recomendação de qual sobrevive** — o que importa é onde está o dado correto, não qual é a arquitetura mais bonita.
3. **`N` dias de comparador limpo** como critério de corte.
4. **Existe janela com zero OPs abertas?** Define quando o corte pode acontecer.
5. Tolerância aceitável de arredondamento de custo na explosão multinível.

---

<a name="decisão-3"></a>
## Decisão 3 — Quem aprova alteração de engenharia (ECO/ECN)

### Recomendação

📘 **Um comitê de 3 papéis fixos (Engenharia + Qualidade + PCP/Produção), com Compras e Comercial convocados por gatilho, e aprovação eletrônica registrada no ERP.** Não crie um CCB (Change Control Board) formal semanal com 7 assentos — para 100-150 pessoas isso morre em três meses. ✅ **O que é obrigatório (se ISO 9001) não é o comitê, é o *registro*:** a norma exige informação documentada da alteração, da análise crítica, **da autorização** e das ações para prevenir efeitos adversos.

### Base normativa

Norma: **ABNT NBR ISO 9001:2015**. Página oficial: <https://www.iso.org/standard/62085.html>
⚠️ **Texto integral paywalled** (iso.org bloqueia consulta automatizada — HTTP 403). Numeração e assunto das cláusulas são públicos; o **literal deve ser conferido no exemplar da empresa**. As sínteses abaixo vêm de fontes secundárias de consultoria de certificação, identificadas como tal.

| Cláusula | Assunto | Exigência relevante (síntese) |
|---|---|---|
| **8.3.6** | Alterações de projeto e desenvolvimento | Identificar, analisar criticamente e controlar alterações feitas durante ou após o projeto e desenvolvimento, na extensão necessária para assegurar que não haja impacto adverso na conformidade com requisitos. **Reter informação documentada sobre: (a) as alterações; (b) os resultados das análises críticas; (c) a autorização das alterações; (d) as ações tomadas para prevenir impactos adversos.** |
| **8.5.6** | Controle de alterações | Analisar criticamente e controlar **alterações para produção ou prestação de serviço**, na extensão necessária para assegurar continuidade da conformidade com requisitos. **Reter informação documentada que descreva os resultados da análise crítica, a(s) pessoa(s) que autorizou(aram) a alteração e quaisquer ações necessárias.** |

Fontes secundárias consultadas (**não normativas**):
- <https://davidbarker.consulting/iso9001/8-3-6-design-and-development-changes/>
- <https://davidbarker.consulting/iso9001/clause-8-5-6-control-of-changes/>
- <https://msspassociation.org/training-courses/iso-standards-in-plain-english/iso-9001-clauses/iso-9001-clause-8-3-6-design-development-changes>

**Por que as duas cláusulas importam aqui, e não só uma.** 8.3.6 cobre a mudança **do projeto** (o alto-falante passa a usar outra bobina). 8.5.6 cobre a mudança **do processo** (a mesma bobina passa a ser colada com outro adesivo, ou a operação muda de centro de trabalho). Um ECO de BOM cai em 8.3.6; um ECO de roteiro cai em 8.5.6. **O ERP precisa de um único fluxo de ECO que cubra os dois, porque na prática a mesma solicitação muda BOM e roteiro juntos.**

⚠️ `[NÃO CONFIRMADO NA FONTE]` — **não existe norma que prescreva a composição do comitê.** ISO 9001 exige que a autorização seja registrada e rastreável a uma pessoa; **quem** é essa pessoa é decisão da organização. Qualquer documento que afirme "a ISO exige um CCB com X membros" está errado. As siglas **ECO** (Engineering Change Order), **ECN** (Engineering Change Notice) e **ECR** (Engineering Change Request) são vocabulário de indústria (PLM/APICS), **não termos normativos ISO**.

### Desenho proposto — proporcional a 100-150 pessoas

**Não crie um comitê. Crie um fluxo com aprovadores obrigatórios por impacto.**

```
ECR (solicitação)  ──> triagem por Engenharia ──> ECO (ordem de alteração)
   qualquer um abre          classifica impacto        aprovadores dependem da classificação
                                                              │
                                                              ├─ aprovado ──> ECN (notificação) + efetivação
                                                              └─ rejeitado ──> encerrado com justificativa
```

**Papéis fixos (sempre aprovam):**

| Papel | Por que é obrigatório |
|---|---|
| **Engenharia de Produto** | dono técnico da mudança; avalia se o produto continua atendendo aos requisitos (8.3.6) |
| **Qualidade** | avalia efeito em critérios de aceitação, ensaios acústicos, rastreabilidade e se há necessidade de requalificação (8.3.6 "ações para prevenir impactos adversos") |
| **PCP / Produção** | avalia efeito em roteiro, capacidade, estoque em processo e **data de corte** (8.5.6) |

**Papéis convocados por gatilho (aprovam só quando o gatilho dispara):**

| Papel | Gatilho |
|---|---|
| **Compras / Suprimentos** | a alteração troca item comprado, fornecedor, ou torna obsoleto estoque acima de um limite de valor |
| **Comercial** | a alteração afeta forma, ajuste, função ou especificação publicada (o cliente percebe) — **em OEM isto vira aprovação do cliente**, e a ISO 9001 8.6 já fala em aprovação pelo cliente "quando aplicável" |
| **Diretoria** | valor do estoque obsoleto ou do investimento acima de limite (usar o mesmo eixo de valor da Decisão 6) |

**Classificação de impacto** (📘 vocabulário de indústria, largamente usado; **não é norma**):
- **Classe I / "form-fit-function"** — muda forma, ajuste ou função; o cliente percebe; **exige notificação/aprovação do cliente** e corte controlado por lote.
- **Classe II** — não muda FFF (troca de fornecedor equivalente, correção de desenho, melhoria de processo); aprovação interna basta.

**Data de efetivação — o campo que mais dói se esquecerem.** Todo ECO precisa de uma **regra de corte** explícita, e é aqui que ECO e BOM se encontram (Decisão 2):
- *imediato* — a partir de agora, todas as OPs novas;
- *por número de série / lote* — a partir do lote N;
- *esgotar estoque* — usar o componente antigo até acabar, depois trocar (o mais comum e o mais difícil de rastrear);
- *retroativo com retrabalho* — obriga plano de contenção do que já foi produzido.

Isso implica **BOM versionada com vigência**, e é por isso que a Decisão 2 (unificação de BOM) é **pré-requisito** desta. Não faz sentido implementar ECO sobre duas estruturas que não conversam entre si — o ECO aprovaria a mudança em uma e a produção continuaria consumindo a outra.

### Esforço / risco aqui

**Não existe módulo de ECO/ECN no ERP hoje** (nenhuma entidade de engineering change foi encontrada; o mais próximo, e não é a mesma coisa, é `server/src/models/NonConformity.ts`, que é reativo).

| Item | Referência | Esforço | Risco |
|---|---|---|---|
| Entidade ECR/ECO/ECN + workflow de aprovação | novo | **Médio** | Baixo (aditivo) |
| Aprovadores por gatilho | espelhar `server/src/modules/juridico/domain/constants.ts:38-47` (padrão de alçada já existente no projeto) | **Baixo** | Baixo |
| Versionamento/vigência de BOM | `server/src/models/ItemEstrutura.ts:166` e `server/src/models/BillOfMaterialItem.ts:68` — **hoje nenhuma das duas tem vigência** | **Alto** | **Alto** |
| Vigência de roteiro | `server/src/models/ProductionRoute.ts:42` — **sem API** (ver Decisão 4) | **Médio** | Médio |

**Migração de dado:** baixa. ECO é aditivo — não há histórico a converter. **O custo real está no pré-requisito** (BOM unificada e versionada), não no ECO em si.

📘 **Sequência recomendada:** ECO **depois** da Decisão 2. Se o Go-Live for antes, um "ECO manual" (ata assinada em papel/PDF anexada ao item) atende a ISO 9001 8.3.6/8.5.6 — a norma exige **informação documentada**, não exige que ela esteja num ERP. Isso é um caminho legítimo de v1 e economiza semanas.

### O que o dono precisa confirmar

1. **Existe função de Engenharia de Produto separada da Produção?** Em fábrica desse porte é comum a mesma pessoa acumular — se acumula, **a segregação Engenharia/Produção no comitê é fictícia** e o desenho precisa mudar (nesse caso Qualidade vira o contrapeso obrigatório).
2. **Há contrato OEM que obrigue notificação/aprovação prévia do cliente para mudança de projeto ou de fornecedor?** É cláusula muito comum em OEM e, se existir, deixa de ser boa prática e vira obrigação contratual.
3. **A empresa é ou será certificada ISO 9001?** Define se 8.3.6/8.5.6 são auditáveis.
4. **Frequência real de alteração de engenharia hoje** (por mês). Se for 1-2, ata em PDF resolve; se for 10+, o módulo se paga.
5. Qual **regra de corte** é a praticada hoje na fábrica ("esgotar estoque" costuma ser a real, mesmo quando ninguém documenta).

---

<a name="decisão-4"></a>
## Decisão 4 — Apontamento de produção obrigatório?

> **Esta é a decisão com a base legal mais forte das seis. Não é escolha de processo — é obrigação acessória fiscal + condição de aceitação do custo do estoque pela Receita Federal.**

### Recomendação

✅ **Sim — apontamento obrigatório.** Nenhuma OP pode ser concluída sem (a) consumo de materiais registrado por item e quantidade e (b) tempo/mão de obra apontado por etapa. A regra decorre de duas obrigações independentes: o **Bloco K da EFD ICMS/IPI** (registro de consumo e produção) e a exigência de **custo integrado e coordenado com a escrituração** do RIR/2018 — sem apontamento, o custo é arbitrável pelo Fisco.

### Base normativa

#### (a) Bloco K — SPED Fiscal ✅ **NORMA — confirmado em fonte oficial**

O Livro Registro de Controle da Produção e do Estoque passou a ser escriturado na EFD pelo **Ajuste SINIEF 18/13**, que acrescentou o inciso VII ao §3º da cláusula primeira do Ajuste SINIEF 2/09 (efeitos a partir de 01.12.13). O cronograma de obrigatoriedade está no **§7º da cláusula terceira do Ajuste SINIEF 2/09**, com redações sucessivas dadas pelos Ajustes SINIEF 25/16, 25/21, 41/21, 46/22 e **25/22** (a mais recente para o nosso caso).

- Texto consolidado: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2009/AJ_002_09>
- Ajuste SINIEF 25/22 (última prorrogação relevante): <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2022/AJ025_22>
- Ajuste SINIEF 25/16: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/aj_025_16>

**Enquadramento da Evok Áudio.** Fabricação de alto-falantes é **CNAE 2640-0/00** ("Fabricação de aparelhos de recepção, reprodução, gravação e amplificação de áudio e vídeo"), que o IBGE/CONCLA descreve incluindo expressamente "fabricação de microfones, alto-falantes, amplificadores…". Essa subclasse pertence à **Divisão 26** ("Fabricação de equipamentos de informática, produtos eletrônicos e ópticos").
- CONCLA/IBGE: <https://concla.ibge.gov.br/busca-online-cnae.html?subclasse=2640000&view=subclasse>

⚠️ **Confirmar com o contador o CNAE efetivamente escriturado no cadastro estadual** — se a empresa fabrica também gabinetes/caixas de madeira ou componentes metálicos e o CNAE principal for outro (ex.: divisão 16 madeira, divisão 25 metal, divisão 31 móveis), a data muda. Todas essas divisões estão no cronograma, mas em alíneas diferentes.

O texto legal (transcrição literal do §7º da cláusula terceira):

| Faixa | Dispositivo | O que é exigido | Desde |
|---|---|---|---|
| Empresa com faturamento anual **≥ R$ 300.000.000,00** | §7º, I, "a" | Bloco K **restrito aos saldos de estoque** (registros **K200** e **K280**), divisões 10 a 32 da CNAE | 01/01/2017 |
| idem, **divisão 26** (nosso caso, se ≥ R$300M) | §7º, I, "e" (red. Aj. SINIEF **25/22**) | **Escrituração completa do Bloco K** para as divisões 13, 14, 15, 16, 17, 18, 22, **26**, 28, 31 e 32 | **01/01/2024** |
| Empresa com faturamento anual **≥ R$ 78.000.000,00** | §7º, II (red. Aj. SINIEF 41/21) | Bloco K **restrito** a K200/K280, divisões 10 a 32, "com escrituração completa conforme **escalonamento a ser definido**" | 01/01/2018 |
| **Demais estabelecimentos industriais** das divisões 10 a 32 (e atacadistas dos grupos 462-469 e equiparados a industrial) | §7º, III (red. Aj. SINIEF 46/22) | Bloco K **restrito** a K200/K280, "com escrituração completa conforme **escalonamento a ser definido**" | **01/01/2019** |

Definição de estabelecimento industrial para o Bloco K (§8º, red. Aj. SINIEF 8/15): *"aquele que possui qualquer dos processos que caracterizam uma industrialização, segundo a legislação de ICMS e de IPI, e cujos produtos resultantes sejam tributados pelo ICMS ou IPI, mesmo que de alíquota zero ou isento."* — A Evok Áudio se enquadra.

Definição de faturamento (§9º, red. Aj. SINIEF 46/22): receita bruta de venda de mercadorias de **todos os estabelecimentos da empresa no território nacional**, excluídas vendas canceladas, devoluções e descontos incondicionais; exercício de referência = **segundo exercício anterior** ao início da vigência.

Outros dispositivos relevantes confirmados no mesmo texto:
- **§10** — *"Somente a escrituração completa do Bloco K na EFD desobriga a escrituração do Livro modelo 3"* (Convênio S/Nº de 15/12/1970). Ou seja: quem faz só K200/K280 **continua legalmente obrigado ao Livro Registro de Controle da Produção e do Estoque modelo 3** — que exige exatamente consumo e produção por OP. Este é o ponto que mais gente ignora.
- **§13** (red. Aj. SINIEF 25/22) — a obrigatoriedade das alíneas "b" a "f" do inciso I **pode ser atendida pela escrituração simplificada** do parágrafo único do art. 16 da **Lei 13.874/2019** (Lei da Liberdade Econômica), *"e implica a guarda da informação da escrituração completa do Bloco K que poderá ser exigida em procedimentos de fiscalização e por força de regimes especiais."* — **A simplificação dispensa transmitir, não dispensa registrar.** O dado tem de existir no ERP de qualquer forma.
- Há prorrogação posterior citada no consolidado: **Ajuste SINIEF 31/24**, "que dispõe sobre a prorrogação de prazo para entrega de informações para escrituração do Bloco K, no caso que especifica" — ⚠️ `[NÃO CONFIRMADO NA FONTE]` o alcance exato desse ajuste; **o contador deve verificar se atinge a divisão 26**.

**Conclusão prática para a Evok Áudio.** Uma indústria de 100-150 pessoas quase certamente fatura abaixo de R$ 78 milhões, portanto cai no **§7º, III**: obrigada desde **01/01/2019** ao Bloco K restrito (K200 = estoque escriturado por participante/item, K280 = correção de apontamento), com escrituração completa "conforme escalonamento a ser definido" — isto é, **o gatilho da escrituração completa pode ser acionado a qualquer momento por novo Ajuste SINIEF, e o §10 já obriga hoje ao Livro modelo 3 enquanto a completa não é feita**. Além disso, a legislação **estadual** pode antecipar exigência ou impor regime especial. Projetar o ERP para produzir K230 (produção acabada), K235 (insumos consumidos), K250/K255 (produção conjunta/terceiros) é a única escolha defensável — o custo de retrofitar apontamento depois do Go-Live é muito maior que o de exigi-lo agora.

#### (b) Custeio de produção — RIR/2018 ⚠️ **parcialmente confirmado**

A regra é: quem mantém **sistema de contabilidade de custo integrado e coordenado com o restante da escrituração** avalia o estoque pelo custo real apurado; quem **não** mantém fica sujeito ao **arbitramento do custo** por percentuais fixos sobre o preço de venda / preço de compra dos insumos, o que quase sempre resulta em lucro tributável maior.

- Norma-base: **Decreto 9.580/2018 (RIR/2018)** — <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/D9580.htm>
- ⚠️ `[NÃO CONFIRMADO NA FONTE]` — **o número do artigo.** A pesquisa aponta consistentemente para o **art. 306 do RIR/2018** (e seu §2º, que define quando o sistema é "integrado e coordenado": apoiado em valores originados da escrituração contábil — matéria-prima, mão de obra direta, gastos gerais de fabricação; apuração de custo por período; e apoio em inventários físicos), com o arbitramento de lucro no **art. 603**. **Não consegui abrir o texto oficial do Planalto nesta rodada** (o arquivo do decreto é grande e a conexão caiu). **O contador deve confirmar o número do artigo antes de este documento ser citado em qualquer parecer.** A *substância* da regra (custo integrado e coordenado × arbitramento) é pacífica e antiga (vinha do art. 294 do RIR/1999); o que não está confirmado aqui é a numeração no RIR/2018.

**O que isso significa para o gap real do ERP.** Hoje `calculateLaborCost()` retorna **0 quando não há apontamento** (`server/src/modules/production/application/use-cases/ChangeProductionOrderStatusUseCase.ts:382-404`, guarda em `:384`) e a OP conclui normalmente sem nenhum apontamento (`:113`). Um estoque de produto acabado valorizado **sem mão de obra direta e sem gastos gerais de fabricação** não é custo integrado e coordenado por definição — é custo incompleto. O efeito é duplo e ambos ruins:
1. **Estoque subavaliado** → CPV inflado no período de venda, lucro distorcido entre exercícios.
2. **Risco de arbitramento** do custo em fiscalização, com o Fisco substituindo o custo escriturado por percentual legal.

Não há como argumentar "custo real" para um estoque em que a mão de obra é R$ 0,00.

### Desenho proposto

**Regra dura (bloqueante):**
1. **OP não conclui sem consumo registrado.** A conclusão já explode a BOM e consome (`ChangeProductionOrderStatusUseCase.ts:183`) — isso atende K235 desde que o consumo seja **real apontado**, não apenas teórico da BOM. 📘 Boa prática: permitir que o apontamento **ajuste** a quantidade consumida em relação à BOM (é exatamente para isso que o K235 existe — o Fisco compara consumo teórico × real e a diferença é o que ele quer ver justificada).
2. **OP não conclui sem ao menos um apontamento de etapa concluído.** Trocar a guarda de `:384` (retorna 0 silenciosamente) por erro de regra de negócio na conclusão.
3. **Fallback obrigatório de taxa.** Já existe `work_centers.cost_per_hour` com fallback `production_cost_settings.default_labor_rate_per_hour` (`:396`) — tornar a ausência de ambos um erro de configuração, não um zero silencioso.

**Regra macia (transição, 📘 boa prática):** um flag de ambiente/parâmetro `PRODUCTION_TRACKING_REQUIRED` que começa em modo *warn* (registra pendência e deixa concluir) e vira *block* após o período de UAT. Isso evita travar o chão de fábrica no dia 1 do Go-Live.

**Roteiro de fabricação — pré-requisito esquecido.** `production_routes` e `production_route_steps` existem (`server/src/models/ProductionRoute.ts:42`, `server/src/models/ProductionRouteStep.ts:43`) e **são lidos no cálculo do custo de MO** (`server/src/modules/production/infrastructure/sequelize/SequelizeProductionOrderRepository.ts:177` e `:207`), mas **não têm nenhuma API** — só são populáveis por script (`server/src/scripts/backfill/04h_production_routes_expand.ts`). Ou seja: **hoje é impossível para o usuário cadastrar as etapas que geram o custo de mão de obra.** Apontamento obrigatório sem CRUD de roteiro é uma regra inexequível. **A API de roteiro é pré-requisito, não item separado.**

### Esforço / risco aqui

| Item | Arquivo:linha | Esforço | Risco |
|---|---|---|---|
| CRUD + API de roteiro de fabricação (**pré-requisito**) | `server/src/models/ProductionRoute.ts:42`, `ProductionRouteStep.ts:43`; criar rotas em `server/src/modules/production/presentation/routes/` (hoje só `productionOrders.ts` e `productionDowntimes.ts`) | **Médio** — modelo pronto, falta camada HTTP + tela | Baixo (aditivo) |
| Tornar apontamento bloqueante | `ChangeProductionOrderStatusUseCase.ts:113`, `:384`, `:390` | **Baixo** | **Médio operacional** — trava a fábrica se roteiro não estiver cadastrado |
| Consumo real ≠ consumo teórico (K235) | `ChangeProductionOrderStatusUseCase.ts:183` | **Médio** | Médio |
| Geração dos registros K200/K230/K235/K280 | não existe hoje | **Alto** | Alto — leiaute é definido em Ato COTEPE e muda |

**Migração do dado existente.** OPs concluídas antes da mudança têm custo de MO = 0 e não têm apontamento. O CLAUDE.md já registra como risco residual aceito o "backfill retroativo de custo de mão-de-obra/overhead em OPs concluídas antes de 2026-08-04". **Para efeito fiscal isso precisa de decisão explícita do contador**, não de decisão técnica: ou (a) essas OPs são de dados de teste e serão purgadas antes do Go-Live — solução limpa e recomendada, ou (b) são dados reais e exigem lançamento de ajuste de custo no período. 📘 **Recomendação: entrar em produção com base de produção limpa** e tratar histórico anterior fora do ERP.

### O que o dono / contador precisa confirmar

1. **CNAE efetivamente escriturado** no cadastro estadual (é mesmo 2640-0/00 / divisão 26?) e **faturamento anual** do segundo exercício anterior — para fixar em qual inciso do §7º a empresa cai.
2. Se a **UF onde a fábrica está** tem exigência estadual antecipada, regime especial ou dispensa própria do Bloco K.
3. Alcance do **Ajuste SINIEF 31/24** (prorrogação citada no consolidado, não verificada aqui).
4. **Número do artigo do RIR/2018** sobre custo integrado e coordenado (indicado como art. 306, não confirmado na fonte oficial).
5. Se a empresa hoje escritura o **Livro modelo 3** (obrigatório enquanto não houver Bloco K completo — §10).
6. Destino das **OPs já concluídas com custo de MO zero**: purga pré-Go-Live ou ajuste contábil.

---

<a name="decisão-5"></a>
## Decisão 5 — Gate de qualidade e momento da baixa de estoque

> **Duas questões separadas que o ERP hoje trata como uma só.** (A) *quando* o estoque sai; (B) *sob que evidência* um lote é liberado. A resposta fiscal da primeira é inequívoca; a segunda é norma de sistema de gestão, não lei.

### Recomendação

✅ **A baixa de estoque deve ocorrer na saída física da mercadoria, acobertada por NF-e autorizada — não na confirmação do pedido.** O padrão a implementar é **reserva → separação (picking) → expedição com baixa**, com a baixa disparada pelo evento de expedição vinculado à NF-e autorizada.
📘 **A liberação de lote da quarentena deve exigir um registro de inspeção** (plano de amostragem, tamanho da amostra, defeitos encontrados, critério de aceitação, inspetor, data) — não um campo de observação livre.

### Base normativa

#### (a) Momento da baixa — dimensão fiscal ✅ **NORMA — confirmado em fonte oficial**

**A NF-e é autorizada *antes* do fato gerador, e o DANFE só pode transitar depois da autorização.** Ajuste SINIEF 07/05:

- **Cláusula primeira, §1º** (red. Ajuste SINIEF 17/22): *"Considera-se Nota Fiscal Eletrônica - NF-e - o documento emitido e armazenado eletronicamente, de existência apenas digital, com o intuito de documentar operações e prestações, cuja validade jurídica é garantida por uma assinatura eletrônica qualificada e pela autorização de uso por parte da administração tributária da unidade federada do contribuinte, **antes da ocorrência do fato gerador**."*
- **Cláusula nona**: *"Fica instituído o Documento Auxiliar da NF-e - DANFE, conforme leiaute estabelecido no MOC, **para acompanhar o trânsito das mercadorias** acobertado por NF-e (…)"*
- **Cláusula nona, §1º**: *"O DANFE **somente poderá ser utilizado para transitar com as mercadorias após a concessão da Autorização de Uso da NF-e**, de que trata o inciso III da cláusula sétima (…)"*
- Fonte: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2005/AJ_007_05>

**Consequência direta.** A sequência legal é: **NF-e autorizada → mercadoria transita**. O ERP hoje faz **estoque baixado → (talvez) NF-e → (talvez) expedição**, com a baixa disparada por mudança de status (`server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts:159` e `:168`; e `CreateSaleUseCase.ts:161` para venda já criada confirmada). A NF-e é endpoint separado que **não movimenta estoque** (`server/src/modules/sales/presentation/routes/sales.ts:54`). Isso significa que **existe uma janela — potencialmente longa — em que o estoque contábil/gerencial do ERP diz que a mercadoria saiu, mas ela está fisicamente no depósito e fiscalmente ainda no estabelecimento.**

**Por que isso é um risco de fiscalização, não só um incômodo gerencial:**

1. **Bloco H — Registro de Inventário.** O Livro Registro de Inventário é escriturado na EFD (Ajuste SINIEF 2/09, cláusula primeira, §3º, **inciso III**). Se o inventário declarado no Bloco H vier do saldo do ERP, ele **subdeclara** o estoque na data-base pelo montante de pedidos confirmados e não faturados. Divergência entre inventário declarado e contagem física é achado clássico de auditoria fiscal, e a presunção contra o contribuinte é de **saída sem nota** (omissão de receita).
2. **Bloco K.** Os registros K200/K280 são justamente saldos de estoque. A mesma distorção contamina o Bloco K (ver Decisão 4).
3. **Contagem física.** Qualquer inventário rotativo ou anual vai acusar sobra física recorrente, e a equipe vai "corrigir" o sistema com ajustes — destruindo a rastreabilidade que o Bloco K existe para provar.

⚠️ `[NÃO CONFIRMADO NA FONTE]` — não localizei nesta rodada um dispositivo que diga literalmente "é vedado baixar estoque antes da emissão da NF-e". **Não existe tal dispositivo**, e é importante ser honesto sobre isso: a norma não regula o momento do lançamento no *sistema interno*. O que a norma regula é (i) a NF-e antes do fato gerador, (ii) o DANFE acompanhando o trânsito, e (iii) a fidedignidade do Registro de Inventário. **O argumento é de consistência entre esses três, não de proibição expressa.** Ainda assim, é um argumento forte o bastante para tratar a mudança como obrigatória.

#### (b) Gate de qualidade — ISO 9001:2015 📘 **norma de sistema de gestão (texto paywalled)**

Norma: **ABNT NBR ISO 9001:2015 — Sistemas de gestão da qualidade — Requisitos**. Página oficial: <https://www.iso.org/standard/62085.html>

⚠️ **O texto integral da ISO 9001 é protegido por direito autoral e não é publicamente acessível** (iso.org retorna 403 para consulta automatizada). As cláusulas abaixo são citadas por **número e assunto**, que são públicos e estáveis; o **texto literal deve ser conferido no exemplar adquirido pela empresa** antes de citação em documento de auditoria.

| Cláusula | Assunto | O que exige (síntese) |
|---|---|---|
| **8.5.2** | Identificação e rastreabilidade | Identificar as saídas e controlar a identificação única quando a rastreabilidade é requisito; **reter informação documentada** |
| **8.6** | Liberação de produtos e serviços | Implementar arranjos planejados, em estágios apropriados, para verificar atendimento aos requisitos. **A liberação não deve prosseguir até que os arranjos planejados tenham sido satisfatoriamente concluídos**, salvo aprovação por autoridade pertinente e, quando aplicável, pelo cliente. **Reter informação documentada da liberação**, incluindo evidência de conformidade com os critérios de aceitação e **rastreabilidade à(s) pessoa(s) que autorizou(aram) a liberação** |
| **8.7** | Controle de saídas não conformes | Identificar e controlar saídas não conformes para prevenir uso ou entrega não pretendidos; tratar por correção, segregação/contenção/devolução/suspensão, informação ao cliente ou **obtenção de autorização para aceitação sob concessão**; reter informação documentada |

Fontes secundárias consultadas (consultorias de certificação, úteis para a síntese acima, **não são fonte normativa**):
- <https://www.isms.online/iso-9001/clause-8-6-release-of-products-and-services/>
- <https://davidbarker.consulting/iso9001/clause-8-7-control-of-nonconforming-outputs/>

**O gap real.** A liberação de lote hoje (`server/src/modules/inventory/application/use-cases/ReleaseLotUseCase.ts:40-62`) grava **apenas `notes`** (`:58-61`) — sem inspetor identificado, sem critério de aceitação, sem tamanho de amostra, sem resultado. Isso **não satisfaz 8.6** ("evidência de conformidade com os critérios de aceitação" e "rastreabilidade a quem autorizou") em nenhuma leitura razoável. **Não existe modelo de registro de inspeção de qualidade no ERP** — as únicas entidades "inspeção" são `SstInspecaoSeguranca` / `SstInspecaoItem`, do domínio de Segurança do Trabalho, sem relação com lote. O mais próximo de registro de qualidade é `server/src/models/NonConformity.ts`, que é **reativo** (registra o problema depois) e não substitui o registro de liberação.

Agravante encontrado no código: o recebimento cria o lote em quarentena (`server/src/modules/purchases/application/use-cases/ReceivePurchaseItemsUseCase.ts:178`, `:194`) **mas já incrementa `products.quantity`** (nota do próprio código em `:166-171`). **A quarentena não bloqueia o saldo agregado** — material não inspecionado já conta como disponível para o MRP e para a produção. Isso é exatamente o "uso não pretendido" que a cláusula 8.7 manda prevenir.

#### (c) Plano de amostragem por atributos ✅/⚠️

- ⚠️ **`ABNT NBR 5426:1985` está CANCELADA.** Não use essa referência em procedimento novo. (Confirmado como cancelada em base de normas; a **data e o número do ato de cancelamento não foram confirmados** nesta rodada — `[NÃO CONFIRMADO NA FONTE]`.) Referência: <https://buscanormas.com.br/canceladas>
- ✅ **A norma vigente é a série ISO 2859.** A parte aplicável é **ISO 2859-1 — "Sampling procedures for inspection by attributes — Part 1: Sampling schemes indexed by acceptance quality limit (AQL) for lot-by-lot inspection"**. A edição 1999 (2ª) **foi retirada** e substituída pela **ISO 2859-1:2026** (3ª edição).
  - ISO 2859-1:2026: <https://www.iso.org/standard/85464.html>
  - ISO 2859-1:1999 (retirada): <https://www.iso.org/standard/1141.html>
  - Introdução à série: ISO 2859-10 — <https://www.iso.org/standard/39991.html>
  - ⚠️ `[NÃO CONFIRMADO NA FONTE]` **se já existe adoção ABNT da 3ª edição** (`ABNT NBR ISO 2859-1`) e em que ano — verificar no catálogo ABNT antes de citar a versão brasileira.

📘 **Sobre valores de NQA/AQL: a norma fornece as tabelas, não escolhe o número por você.** A escolha do nível de inspeção e do AQL é decisão de engenharia/contrato, e **qualquer número específico que este documento sugerisse seria invenção**. O que dá para afirmar com segurança:
- A norma indexa os planos por **AQL** e por **nível de inspeção** (níveis gerais I, II, III e níveis especiais S-1 a S-4), com regimes **normal / severo / atenuado** e regras de comutação entre eles conforme o histórico do fornecedor.
- ⚠️ `[NÃO CONFIRMADO NA FONTE]` os valores de AQL disponíveis nas tabelas (a literatura secundária cita a faixa 0,010 a 10,0 em percentual de defeituosos, mais valores de 15 a 1000 em defeitos por cem unidades — **conferir na norma adquirida**).

**Dimensionamento realista para 100-150 pessoas** 📘: usar **nível geral II em regime normal** como padrão, **um AQL por classe de defeito** (crítico mais rigoroso que maior, maior mais rigoroso que menor) definido pela Engenharia da Qualidade, e **aproveitar as regras de comutação da norma** — fornecedor com histórico bom migra para inspeção atenuada (menos amostra, menos custo), fornecedor com reprovações migra para severa. Isso é o principal ganho operacional da ISO 2859-1 numa fábrica desse porte: **a amostra encolhe sozinha para quem é bom**. O ERP precisa então guardar o **histórico de lotes por fornecedor×item** para calcular o regime — o que conversa diretamente com o módulo de avaliação de fornecedores já existente.

### Desenho proposto

**Fluxo de saída (padrão consagrado ERP/WMS)** 📘 com o gatilho fiscal do item (a):

```
Pedido confirmado
   └─> RESERVA  (soft allocation)      → saldo disponível cai; saldo físico NÃO muda
        └─> SEPARAÇÃO / PICKING        → quantidade separada por lote/endereço; hard allocation
             └─> NF-e emitida e AUTORIZADA (protocolo)   ← barreira fiscal
                  └─> EXPEDIÇÃO (embarque)  → BAIXA DE ESTOQUE aqui
```

Pontos de desenho:
1. **A baixa é atômica com o registro de expedição**, e a expedição só é permitida se houver NF-e com protocolo de autorização. Faturamento parcial já existe (`sale_items.invoiced_quantity`) — a baixa deve ser **por quantidade expedida**, casando com a quantidade da NF-e.
2. **A reserva precisa deixar de ser um contador agregado.** Hoje `reserved_quantity` é uma coluna no `Product` (`server/src/models/Product.ts:67`), incrementada/decrementada em `server/src/services/inventoryService.ts:385` e `:421`, **sem `order_id`**. Só a produção passa referência (`ChangeProductionOrderStatusUseCase.ts:449-450`, via `inventory_movements.referenceId`), e **vendas não reservam nada**. Sem tabela de reserva por documento, "cancelar o pedido X" não sabe quanto liberar — é exatamente a canibalização já mapeada.
3. **Gate de qualidade como entidade de primeira classe:** tabela `quality_inspections` (lote, origem — recebimento/processo/final, plano/nível/AQL aplicados, tamanho do lote, tamanho da amostra, nº de defeitos por classe, critério Ac/Re, veredito, inspetor, data). `ReleaseLotUseCase` passa a **exigir** uma inspeção aprovada; reprovação abre NC (`NonConformity` já existe) e o lote vai para `blocked`; **aceitação sob concessão** (ISO 9001 8.7) vira um veredito próprio, com aprovador de nível superior e justificativa obrigatória — nunca um "release com observação".
4. **Quarentena tem de bloquear saldo.** Enquanto `products.quantity` for incrementado no recebimento (`ReceivePurchaseItemsUseCase.ts:166-171`), a quarentena é decorativa. Ou o saldo em quarentena vira um bucket separado, ou entra em `reserved_quantity` até a liberação.

### Esforço / risco aqui

| Item | Arquivo:linha | Esforço | Risco |
|---|---|---|---|
| Tabela de reserva por documento (substituir contador agregado) | `server/src/models/Product.ts:67`, `server/src/services/inventoryService.ts:385`, `:421` | **Alto** | **Alto** — toca produção e vendas |
| Mover baixa de `confirmed` para expedição | `ChangeSaleStatusUseCase.ts:159`,`:168`,`:178`; `CreateSaleUseCase.ts:161`; estorno em `ChangeSaleStatusUseCase.ts:146` | **Alto** | **Alto** |
| Entidade de expedição + trava "só expede com NF-e autorizada" | não existe (`sales.ts:54` emite NF-e sem tocar estoque) | **Médio** | Médio |
| `quality_inspections` + tornar `ReleaseLotUseCase` dependente dela | `ReleaseLotUseCase.ts:40-62`; rota `inventory.ts:35-36` | **Médio** | Baixo (aditivo) |
| Quarentena bloquear saldo | `ReceivePurchaseItemsUseCase.ts:166-171`,`:178`,`:194` | **Médio** | **Alto** — muda disponibilidade vista pelo MRP |

#### ⚠️ Caminho de migração do dado existente (obrigatório — esta é a mudança mais perigosa das seis)

O estado final não basta. No dia do corte existirão pedidos **`confirmed` com estoque já baixado** e sem expedição. Se o código novo passar a baixar na expedição, esses pedidos **serão baixados duas vezes**.

**Roteiro proposto:**
1. **Antes do corte:** inventariar `sales` com `status IN ('confirmed','partially_invoiced')` e movimentos `inventory_movements` com `referenceType='sale'`, cruzando por `sale_id`.
2. **Introduzir a entidade de expedição já com um campo `legacy_stock_already_written_off` (boolean).** Para todo pedido pré-corte com movimento de saída existente, a expedição nasce com esse flag `true` e **não gera novo movimento** — só registra a saída física e a vinculação à NF-e.
3. **Só pedidos criados após o corte** seguem o fluxo novo (baixa na expedição). Isto é um *strangler* de dado, não um big-bang.
4. **Contagem física de corte** (inventário geral) na virada, com o ajuste lançado como movimento de inventário identificado — nunca como "correção silenciosa". Esse ajuste é a evidência que o auditor vai pedir para explicar a descontinuidade da série histórica.
5. **Não retroagir NF-e.** Pedidos antigos ficam com o histórico como está; a mudança é prospectiva.

**Alternativa de menor risco, se o Go-Live for próximo** 📘: manter a baixa onde está e **introduzir primeiro a reserva por documento + a entidade de expedição em modo somente-registro** (sem mover a baixa). Isso já resolve a canibalização e cria a trilha física, e o movimento da baixa vira uma segunda fase com base de dados já organizada. **Custo: a divergência de inventário fiscal persiste até a fase 2** — decisão do contador se isso é tolerável por um ou dois exercícios.

### O que o dono / contador precisa confirmar

1. **Qual é a janela real** entre confirmação do pedido e faturamento hoje (dias? semanas?). Se for horas, o risco de inventário é pequeno; se for semanas, é material.
2. Como o **Bloco H (Registro de Inventário)** é hoje montado — do saldo do ERP, de contagem física, ou da contabilidade? Se vem de contagem física, a divergência já existe e alguém a está conciliando manualmente.
3. Se a empresa é ou pretende ser **certificada ISO 9001** — isso muda 8.6/8.7 de boa prática para requisito auditável com não-conformidade em auditoria de certificação.
4. **Aquisição da ISO 2859-1 (edição vigente)** e definição, pela Engenharia da Qualidade, dos **níveis de inspeção e AQL por classe de defeito** — o ERP não pode inventar esses números.
5. Se existe **contrato com cliente OEM** que imponha plano de amostragem ou critério de aceitação próprio (comum em OEM) — isso se sobrepõe ao padrão interno.
6. Viabilidade operacional de uma **contagem física de corte** na virada.

---

<a name="decisão-6"></a>
## Decisão 6 — Alçada de compra e reconhecimento financeiro

> **Três problemas distintos, todos no mesmo fluxo.** (A) quem pode aprovar; (B) quando nasce a conta a pagar; (C) quando nasce a conta a receber. Os itens (B) e (C) **têm resposta normativa fechada**. O item (A) é boa prática — mas com um erro de desenho já identificável.

### Recomendações

| | Recomendação |
|---|---|
| **(A) Alçada** | 📘 Segregar **requisitar ≠ aprovar ≠ receber ≠ pagar**, com faixas de valor **próprias de compra recorrente** — as faixas do módulo Jurídico **não servem** (justificativa abaixo). |
| **(B) Conta a pagar** | ✅ **Nasce no recebimento** (ou na entrada da NF do fornecedor), **não na aprovação do pedido**. Pedido aprovado e não recebido é *contrato executório* — não é passivo. |
| **(C) Conta a receber** | ✅ **Nasce quando o controle é transferido ao cliente** (entrega/expedição), **não na confirmação do pedido**. E **nenhuma parcela pode nascer com status `paid`** — pagamento é um evento com baixa e conciliação, não um atributo de criação. |

### Base normativa

#### (B) Momento da conta a pagar ✅ **NORMA — confirmado em fonte oficial (texto literal)**

**CPC 00 (R2) — Estrutura Conceitual para Relatório Financeiro.** Fonte oficial (PDF): <http://static.cpc.aatb.com.br/Documentos/573_CPC00(R2).pdf> — página do CPC: <https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos>

- **Item 4.26**: *"Passivo é uma obrigação presente da entidade de transferir um recurso econômico como resultado de eventos passados."*
- **Item 4.27**: *"Para que exista passivo, três critérios devem ser satisfeitos: (a) a entidade tem uma obrigação (…); (b) a obrigação é de transferir um recurso econômico (…); e (c) a obrigação é uma obrigação presente que existe como resultado de eventos passados (…)."*
- **Item 4.56**: *"Contrato executório é o contrato, ou parte de contrato, que é igualmente não cumprido – nenhuma das partes cumpriu qualquer de suas obrigações, ou ambas as partes cumpriram parcialmente suas obrigações em igual extensão."*
- **Item 4.57**: *"O contrato executório estabelece o direito combinado com a obrigação de trocar recursos econômicos. O direito e a obrigação são interdependentes e não podem ser separados. Assim, o direito e a obrigação combinados constituem um único ativo ou passivo. A entidade tem um ativo se os termos da troca são atualmente favoráveis; tem um passivo se os termos da troca são atualmente desfavoráveis."*
- **Item 4.58** (o dispositivo decisivo): *"Na medida em que qualquer das partes cumpre suas obrigações previstas no contrato, o contrato não é mais executório. (…) **Se a outra parte efetua o cumprimento primeiro, esse cumprimento é o evento que altera o direito e a obrigação da entidade que reporta de trocar recursos econômicos pela obrigação de transferir um recurso econômico. Essa obrigação é um passivo.**"*

**Leitura direta para o ERP.** Um pedido de compra aprovado e ainda não recebido é o exemplo de manual de contrato executório: o fornecedor não entregou, a Evok não pagou. **Não é passivo.** O evento que cria o passivo é o **cumprimento pelo fornecedor** — a entrega/recebimento. O ERP hoje faz o oposto: `status === 'approved'` dispara `_createPurchasePayable` (`server/src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase.ts:69-70`), criando um `AccountPayable` com vencimento calculado como `expected_date + 30 dias` (`:76-115`, persistência em `server/src/modules/purchases/infrastructure/sequelize/SequelizePurchaseRepository.ts:154`).

**Três consequências ruins, em ordem de gravidade:**
1. **Passivo inexistente no balanço.** Endividamento e índices de liquidez distorcidos; se houver covenant bancário ou análise de crédito, o número está errado contra a empresa.
2. **Fluxo de caixa envenenado.** A projeção de 30/60/90 dias (`GET /api/finance/cashflow/projection`) inclui saídas de pedidos que podem nunca ser entregues. O ERP passa a prever pagamentos de compras canceladas.
3. **Vencimento fictício.** `expected_date + 30` não é o prazo negociado nem a data da NF do fornecedor — é um chute. O prazo de pagamento conta a partir do documento fiscal do fornecedor, que só existe no recebimento.

📘 **O que fazer com o compromisso, então?** O pedido aprovado **é** informação gerencial relevante (é *commitment* / compromisso de compra), e o CLAUDE.md indica que a Controladoria já tem orçamento por centro de custo. O tratamento correto é: **compromisso é uma visão gerencial de compras** (relatório de pedidos em aberto, consumo de orçamento, projeção de desembolso) **e não um lançamento em contas a pagar**. Duas telas, dois números, dois propósitos. Isso também resolve o TODO de centro de custo nulo em `ChangePurchaseStatusUseCase.ts:99-107`: o centro de custo é reservado no compromisso e realizado na AP.

#### (C) Momento da conta a receber ✅ **NORMA — confirmado em fonte oficial (texto literal)**

**CPC 47 — Receita de Contrato com Cliente** (correspondente ao **IFRS 15**). Fonte oficial (PDF): <http://static.cpc.aatb.com.br/Documentos/527_CPC_47.pdf> — IFRS 15: <https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/>

- **Item 31**: *"A entidade deve reconhecer receitas quando (ou à medida que) a entidade satisfizer à obrigação de desempenho ao transferir o bem ou o serviço (ou seja, um ativo) prometido ao cliente. **O ativo é considerado transferido quando (ou à medida que) o cliente obtiver o controle desse ativo.**"*
- **Item 33**: *"O controle do ativo refere-se à capacidade de determinar o uso do ativo e de obter substancialmente a totalidade dos benefícios restantes provenientes do ativo. O controle inclui a capacidade de evitar que outras entidades direcionem o uso do ativo e obtenham benefícios desse ativo."*
- **Item 38** — para obrigação satisfeita em momento específico no tempo (o caso normal de venda de auto-falante de catálogo), a norma manda considerar os **indicadores de transferência de controle**, entre outros: *"(a) a entidade possui um direito presente a pagamento pelo ativo; (b) o cliente possui a titularidade legal do ativo; (c) a entidade transferiu a posse física do ativo; (d) o cliente detém os riscos e benefícios significativos da propriedade; (e) o cliente aceitou o ativo."*
- **Item 105**: *"Quando qualquer das partes do contrato tiver concluído o desempenho, a entidade deve apresentar o contrato no balanço patrimonial como ativo de contrato ou passivo de contrato (…). **A entidade deve apresentar separadamente como recebível quaisquer direitos incondicionais à contraprestação.**"*
- **Item 108**: *"**Recebível é um direito da entidade à contraprestação que seja incondicional.** O direito à contraprestação é considerado incondicional, se somente a passagem do tempo for exigida antes que o pagamento (…) seja devido."*

**Leitura direta para o ERP.** Na confirmação do pedido **nenhum** dos indicadores do item 38 está presente: não há posse física transferida, não há titularidade, não há aceite, não há direito presente a pagamento. Portanto **não há receita e não há recebível** — o direito é *condicional* ao embarque, o que pelo item 108 o exclui da definição de recebível. O ERP cria as parcelas na confirmação (`server/src/modules/sales/application/use-cases/CreateSaleUseCase.ts:197` e `server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts:199`). **Isso antecipa receita e infla o ativo.**

**Note a coerência com a Decisão 5:** o evento correto para a receita (transferência de controle — expedição/entrega, item 38 "c") é **o mesmo evento** que deve disparar a baixa de estoque. Não são duas correções, é uma. A entidade de expedição proposta na Decisão 5 é o gatilho das duas.

⚠️ Um detalhe que o contador deve decidir e que a norma **não** resolve sozinha: se a venda é **FOB** (controle transfere no embarque) ou **CIF/entrega** (controle transfere na entrega ao cliente). O item 38 lista indicadores, não uma regra única. Para venda OEM com aceite formal do cliente, o indicador (e) — "o cliente aceitou o ativo" — pode postergar o reconhecimento.

#### (C-bis) "Parcela nascer paga sem baixa real" ✅ **problema de controle interno, não de norma isolada**

O código cria a parcela de venda à vista já com `status: 'paid'` e `payment_date: new Date()` (`CreateSaleUseCase.ts:203-206`; idem `ChangeSaleStatusUseCase.ts:205-208`) — **sem que nenhum dinheiro tenha entrado e sem passar pela Tesouraria.**

**O que isso quebra, concretamente:**
1. **Conciliação bancária.** O ERP já tem conciliação OFX (`/api/finance/reconciliation/*`). Um recebível que nasce `paid` **nunca terá contrapartida no extrato** — ele não vai aparecer como pendência de conciliação, vai simplesmente sumir do radar. É um buraco silencioso: a receita está reconhecida, o caixa não existe, e nada acusa.
2. **Trilha de auditoria.** Não há registro de *quem* recebeu, *quando*, *em qual conta*. O auditor pergunta "prove o recebimento" e não há documento.
3. **Segregação de funções (COSO).** Quem vende passa a dar quitação. Isso é o desenho clássico que permite **lapping** (desvio de recebimento coberto com recebimento seguinte) — e o ERP não teria como detectar.
4. **Inadimplência invisível.** A régua de cobrança nunca vê essas vendas. Se o cliente à vista não pagou, ninguém descobre pelo sistema.
5. **CPC 47 item 108.** Um recebível que já nasce liquidado não é recebível nem receita reconhecida com contrapartida em caixa — é um lançamento sem lastro.

**Correção:** venda à vista cria parcela `pending` com vencimento = data da expedição; a baixa é um **evento separado** (`POST /receivables/:id/settle`) com conta bancária/caixa, valor, data e usuário — reconciliável contra o OFX. Se a venda é balcão com dinheiro na hora, a baixa acontece um segundo depois — mas **acontece**, com registro.

#### (A) Alçada e segregação de funções 📘 **BOA PRÁTICA (COSO / ISO 9001 8.4)**

- **COSO — Internal Control–Integrated Framework (2013).** Página oficial: <https://www.coso.org/guidance-on-ic>. O **Princípio 10** ("A organização seleciona e desenvolve atividades de controle que contribuem para a mitigação de riscos…") tem, entre seus *points of focus*, **"Addresses Segregation of Duties"** — segregar iniciação, aprovação, processamento e conciliação de transações, e, **onde a segregação não for praticável, selecionar controles alternativos**. ⚠️ `[NÃO CONFIRMADO NA FONTE]` o texto literal do princípio e do *point of focus* — o framework COSO é publicação paga e coso.org não expõe o texto integral. A numeração (Princípio 10) e a existência do *point of focus* de segregação de funções são consistentes em múltiplas fontes secundárias (KPMG, Deloitte, Protiviti), mas **confirmar no exemplar antes de citar em relatório de auditoria**.
- **ISO 9001:2015, cláusula 8.4** — "Controle de processos, produtos e serviços providos externamente": exige determinar e aplicar **critérios de avaliação, seleção, monitoramento de desempenho e reavaliação de provedores externos**, e reter informação documentada dessas atividades. Página oficial da norma: <https://www.iso.org/standard/62085.html>. ⚠️ **Texto integral paywalled** — assunto e numeração são públicos; o literal deve ser conferido no exemplar. *(A Evok já tem módulo de avaliação de fornecedores, o que atende parcialmente 8.4.)*
- 📘 **Three-way match** — conferência automática entre **pedido de compra × recebimento (nota de entrada/romaneio) × nota fiscal do fornecedor** antes de liberar o pagamento. **Não é norma** — é o controle padrão de contas a pagar em qualquer framework de controle interno, e é a razão técnica pela qual a AP deve nascer no recebimento: no recebimento existem as três pernas; na aprovação do pedido existe uma só.

**Situação atual do ERP — segregação de funções inexistente:**
- Requisição de compra: `PATCH /:id/status` exige apenas `authorizeModule('requisicoes','operate')` (`server/src/modules/purchaseRequisitions/presentation/routes/purchaseRequisitions.ts:27`) — **`operate`, não `approve`**. Quem cria pode aprovar.
- Pedido de compra: `PUT /:id/status` exige apenas `authorizeModule('compras','operate')` (`server/src/modules/purchases/presentation/routes/purchases.ts:31`) — mesmo problema, e este é o status que **cria a conta a pagar**.
- Não há alçada por valor em lugar nenhum de compras. A **única** alçada por valor do ERP inteiro é a do Jurídico.

**A alçada do Jurídico NÃO serve para compra recorrente de insumo. Avaliação crítica:**

Constantes atuais (`server/src/modules/juridico/domain/constants.ts:23`, `:26`, `:38-47`):
```
JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000;    // ≤ R$50k: sem aprovador
JUR_APPROVAL_THRESHOLD_FINANCE  = 300000;   // R$50k–300k: 1 diretor
                                            // > R$300k: diretor + financeiro
```

Por que não transplantar:

| | Contrato jurídico | Compra de insumo |
|---|---|---|
| **Frequência** | unidades por mês | dezenas a centenas por mês |
| **Duração do risco** | plurianual, obrigações continuadas | pontual, extingue-se no recebimento |
| **Reversibilidade** | baixa (multa, aviso prévio) | alta (cancela pedido não entregue) |
| **Efeito de faixa ≤ R$50k sem aprovador** | tolerável (poucos contratos) | **grave** — a esmagadora maioria dos pedidos de matéria-prima de uma fábrica desse porte fica abaixo de R$50k, então **na prática ninguém aprova quase nada** |
| **Risco dominante** | valor do compromisso | **fracionamento** (dividir R$120k em 3 pedidos de R$40k) e **acumulação por fornecedor/período** |

**O erro estrutural é usar valor por documento como único eixo.** Numa fábrica, a compra que quebra o caixa não é o pedido grande e visível — é o volume recorrente sem ninguém olhando. 📘 **Desenho recomendado, com três eixos:**

1. **Eixo de segregação (não negociável, independe de valor):** quem **requisita** ≠ quem **aprova** ≠ quem **recebe** ≠ quem **paga**. Isso significa permissão `approve` distinta de `operate` nas rotas de requisição e de pedido, e o recebimento (`ReceivePurchaseItemsUseCase`) exigindo perfil diferente do aprovador. **Este eixo sozinho resolve a maior parte do risco e é o de menor esforço.**
2. **Eixo de valor (faixas próprias, calibradas pelo dono):** faixas de compra devem ser **substancialmente mais baixas** que as do Jurídico, porque o objetivo aqui é *cobertura* (que a maioria dos pedidos tenha algum aprovador), não *exceção*. ⚠️ **Este documento deliberadamente não sugere valores em reais** — qualquer número seria invenção sem conhecer o ticket médio de compra. **O dono deve extrair do histórico o ticket médio e os percentis 50/80/95 dos pedidos de compra e calibrar as faixas para que ~50% caia na faixa 1, ~40% na faixa 2 e ~10% na faixa 3.**
3. **Eixo de acumulação (o que o Jurídico não tem e compras precisa):** teto por **fornecedor por período** e por **centro de custo / orçamento**. É o que impede fracionamento e o que conecta compras à Controladoria (que já tem orçamento por centro de custo). Sem este eixo, o eixo de valor é contornável em cinco minutos.

📘 **Um passo além do desejável seria matriz de alçada configurável em banco** (em vez de constantes no código, como o Jurídico fez). Para 100-150 pessoas isso pode ser overengineering na v1 — **constantes em código com uma tabela de override por departamento é um meio-termo defensável**. Mas registre-se: a decisão do Jurídico de fixar em código já é uma dívida conhecida (o próprio cabeçalho do arquivo, `constants.ts:1-19`, admite isso).

### Esforço / risco aqui

| Item | Arquivo:linha | Esforço | Risco |
|---|---|---|---|
| Permissão `approve` ≠ `operate` em requisição e pedido | `purchaseRequisitions.ts:27`, `purchases.ts:31` | **Baixo** | Baixo — mas exige revisar perfis de acesso existentes |
| Aprovador ≠ criador (checagem de identidade) | `ChangePurchaseRequisitionStatusUseCase.ts:66-67`, `ChangePurchaseStatusUseCase.ts` | **Baixo** | Baixo |
| Alçada por valor + acumulação por fornecedor/orçamento | novo; espelhar padrão de `juridico/domain/constants.ts:38-47` | **Médio** | Baixo |
| **Mover criação da AP de `approved` para recebimento** | `ChangePurchaseStatusUseCase.ts:69-70`, `:76-115`; `SequelizePurchaseRepository.ts:154`; destino: `ReceivePurchaseItemsUseCase` | **Médio** | **ALTO — mexe em passivo já lançado** |
| Three-way match antes de liberar pagamento | novo, no recebimento | **Médio** | Baixo |
| **Mover criação do AR de `confirmed` para expedição** | `CreateSaleUseCase.ts:197`,`:203-206`; `ChangeSaleStatusUseCase.ts:199`,`:205-208`; cancelamento em `:157` | **Médio** | **ALTO — mexe em receita já reconhecida** |
| Baixa de recebível como evento próprio (fim do `paid` na criação) | `CreateSaleUseCase.ts:203-206`; `ChangeSaleStatusUseCase.ts:205-208` | **Baixo** | **Médio** — muda o comportamento que o usuário de balcão conhece |

#### ⚠️ Caminho de migração do dado existente

**Contas a pagar (mudança de gatilho `approved` → recebimento).** No corte existirão APs criadas a partir de pedidos aprovados e **ainda não recebidos** — passivos que, pelo CPC 00 4.58, não deveriam existir.
1. **Levantar** APs cujo `purchase_id` aponte para pedido em status anterior a recebido. A idempotência já existente (`ChangePurchaseStatusUseCase.ts:82`) ajuda a identificar a origem.
2. **Decisão do contador, não do desenvolvedor:** estornar essas APs (correção do balanço) ou deixá-las e aplicar a regra nova só daqui para frente. **Estornar é o correto; deixar é o pragmático.** Documentar a escolha.
3. **Flag `legacy_created_on_approval`** nas APs pré-corte, para que o recebimento **não crie uma segunda AP** para o mesmo pedido. Sem isso, duplicação garantida de passivo.
4. **Reconciliar o vencimento.** As APs legadas têm vencimento `expected_date + 30` (fictício). No recebimento, atualizar para o prazo real da NF do fornecedor.

**Contas a receber (mudança de gatilho `confirmed` → expedição).** Mesmo padrão:
1. Levantar ARs de vendas `confirmed` sem expedição.
2. **Flag `legacy_created_on_confirmation`**; a expedição não recria.
3. **Parcelas legadas com `status='paid'` sem baixa real** são o item mais delicado: elas afirmam recebimentos que podem nunca ter ocorrido. **Não converter automaticamente para `pending`** — isso "ressuscitaria" cobranças já quitadas de fato. O caminho é: **relatório de reconciliação** dessas parcelas contra o extrato bancário (a conciliação OFX já existe) e tratamento caso a caso pela Tesouraria antes do Go-Live. ⚠️ **Se o volume for grande, isto é um projeto próprio, não uma migration.**

### O que o dono / contador precisa confirmar

1. **Ticket médio e distribuição de valor dos pedidos de compra** (percentis 50/80/95) — sem isso as faixas de alçada são chute.
2. **Quem** hoje, na estrutura real, pode aprovar compra: existe um Gerente de Suprimentos? Diretor Industrial? A alçada precisa mapear cargos que existem.
3. **Prazo de pagamento é contado da NF do fornecedor ou do recebimento físico?** (define o vencimento correto da AP).
4. **Incoterm padrão de venda** (FOB embarque ou CIF entrega) e se há **aceite formal do cliente** em vendas OEM — define o momento exato da transferência de controle (CPC 47, item 38).
5. **Destino das APs criadas na aprovação e ainda não recebidas**: estorno ou congelamento com flag.
6. **Volume de recebíveis legados com `status='paid'` sem baixa** e se a Tesouraria consegue reconciliá-los antes do Go-Live.
7. Se a empresa é **auditada** (auditoria independente) ou tem **covenant bancário** — se sim, os itens (B) e (C) deixam de ser melhoria e viram correção de erro material.

---

<a name="perguntas"></a>
## Perguntas para o dono / contador

⏳ *em elaboração*
