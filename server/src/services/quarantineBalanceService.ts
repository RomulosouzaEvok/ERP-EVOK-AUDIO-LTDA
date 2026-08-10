/**
 * 🚧 quarantineBalanceService — o saldo que a quarentena retém deixa de ser
 * decorativo (achado colateral do G7).
 *
 * ## O problema confirmado no código (2026-08-10)
 *
 * O recebimento cria o lote em `quarantine`, mas **já incrementa
 * `products.quantity`** no mesmo passo
 * (`services/materialReceiptService.ts` → `InventoryService.receive`). Como
 * as duas rotinas de PLANEJAMENTO leem exatamente esse número:
 *
 * | Leitor | Onde | O que via antes |
 * |---|---|---|
 * | MRP | `SequelizeItemRepository.listMrpInventoryPositions` → `estoque_atual = products.quantity` | material em quarentena contava como estoque disponível → **MRP comprava de menos** |
 * | Disponibilidade de OP | `BomService.explodeBOM` → `stock_available = products.quantity` | OP era criada/liberada contra material que a produção não pode consumir |
 *
 * …material **não inspecionado já contava como disponível**. O consumo real
 * não estava exposto (o FEFO de `ChangeProductionOrderStatusUseCase` só
 * seleciona lote `status='available'`), então o efeito não era consumo
 * indevido — era **planejamento sobre um número falso**, que estoura mais
 * tarde, na conclusão da OP, quando o FEFO não acha lote liberado. É o "uso
 * não pretendido" que a ISO 9001 §8.7 manda prevenir, e é a razão pela qual
 * a própria pesquisa normativa classificou a quarentena atual como
 * decorativa (`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`
 * §Decisão 5, ponto 4 do "Desenho proposto").
 *
 * ## A correção escolhida (e a que foi descartada)
 *
 * **Descartada:** parar de incrementar `products.quantity` no recebimento, ou
 * jogar o saldo em `reserved_quantity` até a liberação. Isso é reescrita do
 * caminho de escrita de estoque (`services/inventoryService.ts`), que está
 * sob refatoração concorrente (reserva por documento, G3/G9) e cuja semântica
 * de `reserved_quantity` está mudando. Mexer nos dois ao mesmo tempo é como
 * se perde um sistema.
 *
 * **Escolhida:** corrigir o LADO DA LEITURA. `products.quantity` continua
 * significando **saldo físico** (o material está lá, é verdade), e as duas
 * rotinas de planejamento passam a descontar o que está retido em
 * `lot_controls` com status `quarantine`/`blocked`. Aditivo, reversível e
 * conservador: o planejamento passa a ver MENOS estoque, então o erro
 * possível é comprar/planejar a mais — nunca consumir material não liberado.
 *
 * ## Invariante defensiva
 *
 * O desconto é sempre `max(0, físico − retido)`. Sem esse clamp, um desvio
 * de dado entre `lot_controls` e `products.quantity` (que existe: ver
 * `docs/governance/` sobre o drift de schema/saldo) produziria disponibilidade
 * NEGATIVA e MRP planejando quantidades absurdas.
 *
 * @module services/quarantineBalanceService
 */

import type { Transaction } from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fn, col, Op } = require('sequelize');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LotControl } = require('../models/index');

/**
 * Status de lote que RETÊM o saldo: o material existe fisicamente, mas não
 * está liberado para consumo.
 *
 * ⚠️ Conferido literal a literal contra o ENUM
 * `enum_lot_controls_status` do model `LotControl`
 * (`available | reserved | consumed | blocked | expired | quarantine`).
 * `reserved` NÃO entra: reserva é alocação de material já liberado, e
 * descontá-la aqui duplicaria o desconto que o MRP já faz por
 * `estoque_reservado`. `expired` também não: vencimento é tratado no FEFO e
 * misturá-lo aqui esconderia o problema de estoque vencido atrás de um
 * número de qualidade.
 */
const WITHHELD_LOT_STATUSES = ['quarantine', 'blocked'] as const;

/**
 * Soma, por produto, o saldo retido em lotes não liberados
 * (`quarantine` + `blocked`).
 *
 * Uma única query agregada para todos os produtos pedidos — chamada dentro
 * da explosão de BOM e da leitura de posições do MRP, ambas em laço sobre
 * dezenas de itens; uma query por item seria N+1 no hot path do MRP.
 *
 * @param productIds - `products.id` a consultar. Lista vazia devolve mapa vazio sem tocar o banco.
 * @param transaction - Transação Sequelize ativa (opcional).
 * @returns Mapa `productId -> quantidade retida`. Produtos sem lote retido simplesmente não aparecem.
 */
async function sumWithheldByProduct(
  productIds: Array<number | string>,
  transaction?: Transaction
): Promise<Map<number, number>> {
  const withheld = new Map<number, number>();
  // `Number(null)` e `Number('')` valem 0 — sem descartar esses casos ANTES
  // da conversão, um `null` na lista viraria `product_id = 0` no `WHERE` (id
  // que não existe, mas suja a query e mascara o bug de quem passou `null`).
  const ids = [...new Set(
    (productIds ?? [])
      .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  )];
  if (!ids.length) return withheld;

  const rows = await LotControl.findAll({
    attributes: ['product_id', [fn('SUM', col('quantity_available')), 'withheld_quantity']],
    where: {
      product_id: { [Op.in]: ids },
      status: { [Op.in]: [...WITHHELD_LOT_STATUSES] },
    },
    group: ['product_id'],
    raw: true,
    ...(transaction ? { transaction } : {}),
  });

  for (const row of rows) {
    const quantity = Number(row.withheld_quantity ?? 0);
    if (Number.isFinite(quantity) && quantity > 0) {
      withheld.set(Number(row.product_id), quantity);
    }
  }

  return withheld;
}

/**
 * Calcula o saldo que o PLANEJAMENTO deve enxergar: saldo físico menos o
 * retido em quarentena/bloqueio, nunca negativo.
 *
 * @param physicalQuantity - `products.quantity` (saldo físico).
 * @param withheldQuantity - Saldo retido do mesmo produto (ver {@link sumWithheldByProduct}).
 * @returns Saldo disponível para planejamento (>= 0).
 */
function planningQuantity(physicalQuantity: unknown, withheldQuantity: unknown): number {
  const physical = Number(physicalQuantity ?? 0);
  const withheld = Number(withheldQuantity ?? 0);
  const safePhysical = Number.isFinite(physical) ? physical : 0;
  const safeWithheld = Number.isFinite(withheld) && withheld > 0 ? withheld : 0;
  return Math.max(0, safePhysical - safeWithheld);
}

// ATENÇÃO (armadilha conhecida do projeto): este objeto SUBSTITUI qualquer
// named export em tempo de execução (`require`). Toda função nova precisa
// aparecer aqui também — mesma regra de `inventoryService.ts`.
module.exports = {
  WITHHELD_LOT_STATUSES,
  sumWithheldByProduct,
  planningQuantity,
};
