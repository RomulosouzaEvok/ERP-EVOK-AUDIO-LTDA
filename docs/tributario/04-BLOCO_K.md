# Bloco K da EFD ICMS/IPI — Controle da Produção e do Estoque

**Criado em:** 2026-08-10, junto com a entrega do gap **G4** (apontamento de
produção obrigatório).
**Escopo deste documento:** o que a norma exige, em que inciso a Evok Áudio se
enquadra, **o que o ERP já registra**, o que ele **ainda não faz** e o que
depende de confirmação do contador.

> ⚠️ **Este documento não substitui parecer do contador.** Os pontos marcados
> `[NÃO CONFIRMADO NA FONTE]` vêm de
> `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4, e
> **não devem ser usados como base de decisão sem confirmação.**

---

## 1. A obrigação

O Livro Registro de Controle da Produção e do Estoque passou a ser escriturado
na EFD pelo **Ajuste SINIEF 18/13**, que acrescentou o inciso VII ao §3º da
cláusula primeira do **Ajuste SINIEF 2/09**. O cronograma de obrigatoriedade
está no **§7º da cláusula terceira**, com redações sucessivas dos Ajustes
SINIEF 25/16, 41/21, 46/22 e 25/22.

Texto consolidado: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2009/AJ_002_09>

### Enquadramento da Evok Áudio

Fabricação de alto-falantes é **CNAE 2640-0/00** — "Fabricação de aparelhos de
recepção, reprodução, gravação e amplificação de áudio e vídeo", que o
CONCLA/IBGE descreve incluindo expressamente "fabricação de microfones,
alto-falantes, amplificadores". A subclasse pertence à **Divisão 26**.

| Faixa | Dispositivo | Exigência | Desde |
|---|---|---|---|
| Faturamento ≥ R$ 300 milhões | §7º, I, "a" | Bloco K restrito a **K200/K280** | 01/01/2017 |
| idem, divisão 26 | §7º, I, "e" (Aj. 25/22) | **Escrituração completa** | 01/01/2024 |
| Faturamento ≥ R$ 78 milhões | §7º, II (Aj. 41/21) | K200/K280, completa "conforme escalonamento a ser definido" | 01/01/2018 |
| **Demais estabelecimentos industriais** das divisões 10–32 | **§7º, III** (Aj. 46/22) | K200/K280, completa "conforme escalonamento a ser definido" | **01/01/2019** |

Uma indústria de 100–150 pessoas quase certamente cai no **§7º, III**.

### Os dois dispositivos que a maioria ignora

- **§10** — *"Somente a escrituração completa do Bloco K na EFD desobriga a
  escrituração do Livro modelo 3"*. Quem transmite apenas K200/K280 **continua
  legalmente obrigado ao Livro Registro de Controle da Produção e do Estoque
  (modelo 3)** — que exige consumo e produção **por ordem de produção**.
- **§13** (Aj. 25/22) — a escrituração simplificada do parágrafo único do art. 16
  da **Lei 13.874/2019** *"implica a guarda da informação da escrituração
  completa do Bloco K que poderá ser exigida em procedimentos de fiscalização"*.
  **Dispensa transmitir, não dispensa registrar.**

**Conclusão de projeto:** o dado de produção por OP tem de existir no ERP em
qualquer cenário. Foi isso que motivou o gap **G4**.

---

## 2. Registros do Bloco K e o que o ERP tem hoje

| Registro | Conteúdo | Fonte no ERP | Estado |
|---|---|---|---|
| **K200** | Estoque escriturado por item/participante | `products.quantity`, `warehouse_stock`, `lot_controls` | ✅ dado existe |
| **K230** | Itens produzidos (por ordem de produção) | `production_orders` (`order_number`, `product_id`, `quantity_produced`) | ✅ dado existe |
| **K235** | Insumos consumidos (por ordem de produção) | `inventory_movements` (`reference_type='production'`) + `production_lot_consumptions` (por lote) | ✅ dado existe |
| **K250/K255** | Produção e consumo em terceiros | — | ❌ **não modelado** (industrialização por encomenda não existe no ERP) |
| **K280** | Correção de apontamento | — | ❌ não modelado |

> **Importante:** o ERP **não gera o arquivo do Bloco K**. Ele mantém o dado que
> alimentaria os registros. O leiaute é definido em Ato COTEPE e muda; gerar o
> arquivo é trabalho separado, ainda **não iniciado**.

---

## 3. O que o gap G4 fechou (2026-08-10)

Antes do G4 o ERP tinha três buracos que produziam OP concluída **sem lastro de
execução** — e sem erro nenhum:

1. OP sem nenhum apontamento concluía normalmente;
2. etapa concluída sem `started_at`/`finished_at` era pulada em silêncio no
   custeio;
3. taxa horária ausente ou zerada virava custo de mão de obra R$ 0,00.

As três desembocavam no mesmo lugar: **produto acabado entrando em estoque sem
mão de obra**, o que descaracteriza o custo integrado e coordenado do RIR/2018 e
deixa o K235/Livro modelo 3 sem o consumo real por ordem.

Desde o G4, concluir uma OP exige apontamento por etapa, com tempo medido e taxa
horária configurada. Regras, códigos de erro (`details.rule`) e a janela de
transição `PRODUCTION_TRACKING_REQUIRED`:
`docs/producao/04-ROTEIROS.md` (seção "Apontamento obrigatório") e
`docs/arquitetura/API.md` §10.

**Rastro que passa a existir por OP:**

| Pergunta do Fisco | Onde está |
|---|---|
| O que foi produzido nesta OP? | `production_orders.quantity_produced` + lote de acabado em `lot_controls` |
| Quanto de cada insumo foi consumido? | `inventory_movements` + `production_lot_consumptions` (por lote) |
| Quem operou e por quanto tempo cada etapa? | `production_order_tracking` (`operator_id`, `started_at`, `finished_at`) |
| Qual processo foi executado? | `production_order_tracking.production_route_step_id` → etapa da **revisão** de roteiro vigente na liberação (roteiro ativo é imutável) |

---

## 4. Custo integrado e coordenado (RIR/2018)

A regra: quem mantém **sistema de contabilidade de custo integrado e coordenado
com o restante da escrituração** avalia o estoque pelo custo real; quem não
mantém fica sujeito ao **arbitramento do custo** por percentuais fixos.

- Norma-base: **Decreto 9.580/2018 (RIR/2018)** —
  <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/D9580.htm>
- ⚠️ `[NÃO CONFIRMADO NA FONTE]` — a pesquisa aponta consistentemente para o
  **art. 306** (e o arbitramento no **art. 603**), mas o texto oficial não foi
  aberto. **O contador deve confirmar a numeração** antes de este documento ser
  citado em qualquer parecer. A *substância* da regra é pacífica e antiga
  (vinha do art. 294 do RIR/1999).
- ⚠️ `[NÃO CONFIRMADO NA FONTE]` — os percentuais do arbitramento (produtos
  acabados a 70% do maior preço de venda; produtos em elaboração a 80% desse
  valor ou 1,5× o maior custo de matéria-prima do período) vieram de publicação
  da RFB via busca, **não do texto do decreto**.

**O que o ERP registra hoje para sustentar o custo real:** matéria-prima
(explosão da BOM, custo médio ponderado), **mão de obra direta**
(`production_order_tracking` × `work_centers.cost_per_hour`) e **gastos gerais
de fabricação** (rateio configurável em `production_cost_settings`), cada um em
lançamento próprio de `product_cost_ledgers`
(`production`, `production_labor`, `production_overhead`).

---

## 5. Pré-requisitos de configuração antes de rodar em produção

| Item | Onde | Estado em 2026-08-10 (dev) |
|---|---|---|
| Roteiro ativo por produto fabricado | `Produção > Roteiros de Fabricação` | **0 roteiros cadastrados** |
| `work_centers.cost_per_hour > 0` | `POST`/`PUT /api/work-centers` | único centro (`MONTAGEM`) com **0** |
| `production_cost_settings.default_labor_rate_per_hour` | **sem API** ⚠️ | **0** |
| `PRODUCTION_TRACKING_REQUIRED` | variável de ambiente | ausente → `block` (a lei) |

Sem pelo menos uma taxa horária positiva, **toda conclusão de OP falha** com
`G4-LABOR-RATE-MISSING`. Isso é intencional (é o zero silencioso virando erro
explícito), mas exige configuração antes do primeiro uso real.

---

## 6. O que o contador precisa confirmar

1. **CNAE efetivamente escriturado** no cadastro estadual (é mesmo 2640-0/00 /
   divisão 26?) e o **faturamento do segundo exercício anterior** — para fixar em
   qual inciso do §7º a empresa cai.
2. Se a **UF da fábrica** tem exigência estadual antecipada, regime especial ou
   dispensa própria do Bloco K.
3. Alcance do **Ajuste SINIEF 31/24** (prorrogação citada no texto consolidado,
   não verificada) — atinge a divisão 26?
4. **Número do artigo do RIR/2018** sobre custo integrado e coordenado.
5. Se a empresa hoje escritura o **Livro modelo 3** (obrigatório enquanto não
   houver Bloco K completo — §10).
6. Destino das **OPs já concluídas com custo de mão de obra zero**: as 3
   existentes no banco de dev são dados de teste (`CI-…`, `E2E-…`) e a
   recomendação é entrar em produção com base limpa. Se houver histórico real em
   outro ambiente, é lançamento de ajuste de custo, não decisão técnica.

---

## 7. Pendências de engenharia

- Geração do arquivo (K200/K230/K235/K280) — **não iniciada**.
- K250/K255 (industrialização por encomenda) — não modelado.
- API para `production_cost_settings.default_labor_rate_per_hour`.
- Coluna amarrando a OP à revisão de roteiro (hoje mitigado pelos apontamentos).

Todas registradas em `docs/governance/TODO.md`.

---

## Referências

- `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` — Decisão 4 (fonte primária desta análise)
- `docs/producao/04-ROTEIROS.md` — roteiro (G5) e apontamento obrigatório (G4)
- `docs/producao/05-CUSTOS.md` — custeio de produção
- `docs/arquitetura/API.md` §10 e §30 — contratos de OP e centro de trabalho
- `docs/projeto/04-USE_CASES.md` — UC-71 (roteiro) e UC-73 (apontamento)
