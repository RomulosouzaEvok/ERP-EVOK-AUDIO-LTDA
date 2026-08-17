# `AUD-EST-TRUNCCADEIA-01` — Truncamento em cadeia: quantidade perde precisão ao atravessar a cadeia de suprimentos

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         T-35_C137_SEMANTICA_COLUNA_LOTE2.md (T35-EST-F01)
VALIDAÇÃO:      T-36_VALIDACAO_T35.md — CONFIRMED com refutação parcial
SEVERIDADE:     HIGH  (fixada pelo dono, 2026-08-16)
ESTADO:         PROPOSED → CONFIRMED
AMBIENTE:       DEV / HOMOLOGAÇÃO
```

> **CLÁUSULA DE REAVALIAÇÃO AUTOMÁTICA.** Sem risco ativo hoje porque os
> módulos de compras, estoque e MRP não estão em produção. **Reavaliar
> automaticamente para BLOQUEANTE quando qualquer um deles entrar em produção.**
> Decisão do dono, 2026-08-16.

> **UNIFICAÇÃO DETERMINADA PELO DONO.** Os dois vetores abaixo — divergência
> cumulativa no recebimento e truncamento na geração de pedido a partir do MRP —
> são tratados como **uma classe só**, "truncamento em cadeia", e não como
> findings separados. Compartilham causa (precisão heterogênea sem unidade
> canônica declarada) e remediação (fixar a precisão da cadeia inteira).
> Corrigir um sem o outro apenas move o ponto de perda.

## 1. A causa comum

Quatro precisões de quantidade coexistem na mesma cadeia, **sem que nenhuma
coluna declare qual é a canônica**:

| Precisão | Onde |
|---|---|
| `(18,6)` — núcleo | `Product.ts:66`, `ProductWarehouseStock.ts:59`, `InventoryMovement.ts:36`, `WarehouseTransfer.ts:77`, `ProductionOrder.ts:41-43`, `SaleItem.ts:50,53`, `RfqItem.ts:30`, `PurchaseRequisitionItem.ts:23`, `MasterProductionPlanLine.ts:69-79` |
| `(12,4)` — cadeia de lote | `LotControl.ts:57,63`, `ProductionLotConsumption.ts:35`, `SaleLotShipment.ts:72-73`, `QualityInspection.ts:100-101` |
| `(12,3)` — contagem de inventário | `InventoryCountItem.ts:39,40,41` |
| `(10,2)` — **compras** | `PurchaseItem.ts:32` `quantity`, `:35` `received_quantity` |

O DDL confirma os models sem divergência
(`00_baseline_frozen.sql:11443,11446,6856-6858`) — a hipótese "o model está
desatualizado em relação ao banco" foi testada e **falhou**.

## 2. Vetor A — divergência cumulativa no recebimento

**Correção de fato em relação ao texto de origem:** `T-35:139` descreveu
`PurchaseItem.received_quantity` alimentando `InventoryMovement.quantity`
diretamente. **Está errado** — existe camada:
`ReceivePurchaseItemsUseCase.ts:181-184` passa o `qty` do *payload* para o
estoque, não a coluna.

**Mas refutar o caminho expôs defeito pior.** Em `:154-162`, o use case:

1. **lê** o total já recebido da coluna truncada em `(10,2)`;
2. usa esse valor como **teto** de recebimento (`:156`);
3. regrava `currentReceived + qty` de volta na mesma coluna truncada;
4. usa a coluna como **critério de fechamento** do item (`:161`).

Enquanto isso, o estoque acumula o valor **não truncado**. A divergência entre
`SUM(InventoryMovement.quantity)` e `PurchaseItem.received_quantity` é
**cumulativa**: cresce a cada recebimento parcial, e a coluna divergente é
justamente a que decide se ainda cabe receber e se o item está encerrado.

Consequência prática: um pedido pode fechar tendo recebido a menos, ou aceitar
recebimento além do pedido, sem que nada acuse.

## 3. Vetor B — a saída do MRP é truncada

`ConvertRequisitionToPurchaseOrdersUseCase.ts:219,226` copia a quantidade de
`PurchaseRequisitionItem` `(18,6)` para `PurchaseItem` `(10,2)` **sem
arredondamento explícito**. A requisição nasce do planejamento; o pedido é o que
o fornecedor recebe.

**É a saída do MRP sendo truncada na porta de saída** — o cálculo de necessidade
é feito com 6 casas e comprado com 2.

## 4. Por que isto é perda real, e não teórica

A refutação mais forte disponível era: *"este negócio compra em peça ou caixa,
nunca em fração menor que 0,01 — logo a precisão excedente é decorativa"*.
**Falhou, com o dado do próprio projeto:**

- `bomService.ts:149-158` admite `g`, `kg`, `m`, `cm`, `l`, `ml`, `m2`.
- `docs/carga-inicial/insumos-materia-prima.csv:178` diz literalmente
  *"a BOM consome grama, nao unidade"*; `:82` e `:197` registram
  *"unidade deveria ser KG"*.

Exemplo aritmético direto: cola a **19 g** = `0,019 kg` → armazenada em `(10,2)`
vira `0,02` — **+5,3 % em cada linha**, sistematicamente para cima, num insumo
consumido em toda ordem de produção.

## 5. Gate humano que bloqueia a remediação (Regra 18)

**Correção de unidade dos insumos e correção de precisão são a mesma decisão.**

A carga inicial já registra que vários insumos estão com unidade errada e
"deveriam ser KG". **Corrigir a unidade sem corrigir a precisão converte risco
latente em perda ativa**: hoje, um item cadastrado em "unidade" não exercita as
casas decimais; passar a medir em kg com `(10,2)` na cadeia de compras faz o
truncamento começar a valer imediatamente, em todos os itens migrados.

A ordem correta é precisão primeiro, ou as duas juntas — nunca unidade primeiro.

## 6. Critério de reteste (objetivo, estático)

1. Constante ou documento **versionado** declarando a precisão canônica de
   quantidade do projeto.
2. `PurchaseItem.quantity`, `PurchaseItem.received_quantity`,
   `InventoryCountItem.system_quantity|counted_quantity|variance_quantity` e
   `SaleLotShipment.quantity|quantity_returned` com escala **≥ 6**, no model
   **e** na migration.
3. `ReceivePurchaseItemsUseCase` deriva o total recebido de fonte não truncada,
   ou a coluna passa a ter precisão compatível com o estoque.
4. `ConvertRequisitionToPurchaseOrdersUseCase` com arredondamento **explícito e
   auditável**, se algum arredondamento tiver de existir.
5. Teste de regressão com quantidade fracionária abaixo de `0,01`.

Reteste **estático**, sem banco.

## 7. Rastreabilidade

**Estende** `AUD-DB-T31-06` (três precisões monetárias) para a dimensão
quantidade, que `T-31` não examinou. Relacionado a `T35-CTB-F04` (sete precisões
monetárias, com `rfq_items.awarded_unit_price` perdendo 4 casas ao virar
pedido) — **mesma patologia, dimensão diferente**; a decisão de unificar
*aquele* a este não foi tomada e permanece com o consolidador.

Pedido de evidência dinâmica registrado e **não executado**: `DYN-T35-01`.

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4).
