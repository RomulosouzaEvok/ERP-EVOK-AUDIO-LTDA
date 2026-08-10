# Módulo `masterProduction` — Plano Mestre de Produção (MPS)

**Gap G17** · Decisão **D-F** do dono do produto · 2026-08-10
Base URL: `/api/production/master-plans`

---

## 1. O buraco que este módulo fecha

Antes do G17, conferido no código (não na documentação):

| Fato | Onde |
|---|---|
| Confirmar venda **não** gerava produção nenhuma | `ChangeSaleStatusUseCase` apenas reserva estoque (G9) |
| O MRP calculava só contra a demanda **digitada no payload** | `GenerateMrpPlanUseCase.execute` → `input.demands` |
| Nada lia a **carteira de pedidos** aberta | não existia consulta de `quantity − invoiced_quantity` fora do faturamento |
| Nada tratava o **estoque mínimo** como demanda | `products.min_quantity` só alimentava alerta de dashboard |

Ou seja: a ponte entre *"o cliente comprou"* e *"a fábrica produz"* era memória
de quem planeja. Sem registro da decisão e sem rastro de origem na OP.

## 2. O que este módulo **não** faz, e por quê

**Não existe gatilho de OP automática na confirmação da venda.** A decisão D-F
registrou que **existe PCP formal — há quem planeje**, e a recomendação do
próprio plano de ação (linha do G17) é a camada de plano mestre: o sistema
fornece a informação, **uma pessoa decide**, e a decisão registrada é o que
gera ordem de produção.

Por isso a linha do plano nasce `pending` com `planned_quantity = 0` mesmo
quando a sugestão calculada é positiva, e firmar um plano sem nenhuma decisão
é recusado (422).

## 3. O ciclo

```
POST /master-plans           → draft   (demanda consolidada, linhas editáveis)
PATCH /:id/lines/:lineId     → decisão do planejador por linha
POST /:id/firm               → firm    (decisão congelada)
POST /:id/release            → released + Ordens de Produção criadas
POST /:id/cancel             → canceled (a partir de draft ou firm)
```

## 4. A conta

```
necessidade líquida = max(0,
    (carteira de pedidos + estoque mínimo + previsão manual)
  − (saldo de planejamento + saldo a produzir das OPs abertas))
```

O **saldo de planejamento** é `max(0, products.quantity − retido em
quarentena/bloqueio − reservado)` — o mesmo saldo que o G7 impôs ao MRP e à
disponibilidade de OP, e que o G3/G9 povoam com as reservas por documento.
Material não inspecionado e material reservado para outra ordem/venda **não**
contam como disponível.

`suggested_quantity` (sistema) e `planned_quantity` (humano) são colunas
distintas de propósito: a divergência entre as duas é o que uma auditoria de
PCP procura.

## 5. Rigor na geração da OP

A liberação repete **exatamente** as validações dos outros dois caminhos de
criação de OP (`CreateProductionOrderUseCase` e
`ConvertPlannedOrdersToProductionOrderUseCase`) — produto ativo, tipo
fabricável, **BOM ativa** (G2) e material mínimo disponível — para não recriar
a divergência de rigor que o **G16** fechou em 2026-08-09.

A liberação é **tudo ou nada**: os bloqueios de todas as linhas são coletados
antes de qualquer escrita e a operação inteira falha com a lista completa.

## 6. RBAC

Todas as rotas usam `authorizeModule('mrp', …)`. O caminho é
`/api/production/…` porque o artefato gerado é a OP, mas o **ator é o PCP** — o
mesmo que opera o MRP e converte ordem planejada em OP
(`POST /api/mrp/planned-orders/convert-to-production`, também `mrp:operate`).

Nenhuma rota exige `approve`: nível de alçada do PCP é política de governança
que o dono não definiu. Registrado em `docs/governance/TODO.md`.

## 7. Políticas de PCP deliberadamente **não** inventadas

1. **Horizonte de planejamento** — sem default; o planejador declara
   `horizon_start`/`horizon_end` a cada plano.
2. **Lote mínimo/múltiplo de produção** — `suggested_quantity` é a necessidade
   líquida crua, sem arredondamento.
3. **Pedido que chega depois do plano fechado** — não há replanejamento
   automático; o plano é fotografia datada (`consolidated_at`).

## 8. Riscos residuais conhecidos

- **A carteira de pedidos não tem data de entrega prometida.** `sales` não tem
  coluna de prazo de entrega — a demanda é consolidada por produto no horizonte
  inteiro, sem baldes de tempo (*time buckets*). Um MPS semanal de verdade
  depende dessa coluna existir.
- **Não existe entidade de previsão de vendas.** A previsão é digitada no
  payload de criação do plano.
- **`BomService.checkAvailability` não participa da transação** e a reserva de
  material só ocorre quando a OP vai a `released` — duas linhas do mesmo plano
  que consomem o mesmo componente são avaliadas de forma independente. Mesma
  limitação já existente no caminho do MRP; a contenção real continua sendo a
  reserva por OP do G3.

## 9. Arquivos

```
domain/constants.ts                          regras puras + literais de ENUM conferidos
domain/repositories/…Repository.ts           contrato (a aplicação não conhece Sequelize)
infrastructure/sequelize/…Repository.ts      agregações SQL da consolidação
application/use-cases/
  CreateMasterProductionPlanUseCase.ts       consolida demanda × suprimento
  DecideMasterProductionPlanLineUseCase.ts   registra a decisão do planejador
  ChangeMasterProductionPlanStatusUseCase.ts firmar / cancelar
  ReleaseMasterProductionPlanUseCase.ts      gera as OPs, com rastro de origem
  ListMasterProductionPlansUseCase.ts        leitura
  GetMasterProductionPlanUseCase.ts          leitura + resumo da decisão
presentation/{controllers,routes}
```

Migration: `server/migrations/20260810-000037-create-master-production-plan-g17.cjs`
(**escrita, não aplicada** — aplicar migrations está bloqueado no ambiente).
Testes: `server/tests/unit/master-production-plan-g17.test.ts` (40 casos).
