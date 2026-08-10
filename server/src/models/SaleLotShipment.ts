/**
 * 🚚 Model: SaleLotShipment (rastro de expedição por LOTE)
 *
 * @module models/SaleLotShipment
 *
 * Uma linha por (emissão de NF-e × lote × produto): a quantidade que
 * **aquela emissão** consumiu **daquele lote**. Criado em 2026-08-10 pelas
 * decisões **D-L** e **D-M** do dono
 * (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4), migration
 * `20260810-000039`.
 *
 * ## Por que a tabela precisa existir
 *
 * Até aqui a baixa de estoque da venda (G9,
 * `services/saleStockService.ts`) mexia em `products.quantity` e no depósito
 * ACABADOS, mas **não tocava em `lot_controls`**. Duas consequências:
 *
 * 1. **Não havia gate de qualidade na saída** — o G7 fechou a entrada
 *    (lote de compra nasce em quarentena), mas produto acabado com lote
 *    `quarantine`/`blocked` era faturado normalmente (ISO 9001:2015 §8.6/§8.7).
 * 2. **A expedição não deixava rastro por lote** — num recall não havia como
 *    responder "para qual cliente foi o lote X".
 *
 * Esta tabela resolve as duas de uma vez, e é o que torna a **devolução ao
 * mesmo lote** (D-M) um fato registrado em vez de um palpite.
 *
 * ## Faturamento parcial
 *
 * O dono da linha é a **emissão** (`sale_invoice_id`), não o pedido: uma
 * venda de 10 faturada em 4 + 6 gera dois conjuntos de linhas, e cancelar a
 * segunda nota devolve 6 — nunca 10.
 *
 * ## Nada é apagado
 *
 * A devolução acumula em `quantity_returned` e muda `status` para
 * `'returned'` quando não sobra saldo. O par saída/retorno continua visível
 * para a auditoria (mesma filosofia de `production_order_reservations`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

type SaleLotShipmentStatus = 'shipped' | 'returned';

interface SaleLotShipmentAttributes {
  id: number;
  sale_id: number;
  sale_invoice_id: number | null;
  product_id: number;
  lot_control_id: number;
  quantity: number;
  quantity_returned: number;
  status: SaleLotShipmentStatus;
  shipped_at: Date;
  returned_at: Date | null;
  user_id: number | null;
  notes: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const SaleLotShipment = sequelize.define('SaleLotShipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  sale_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> sales.id' },
  sale_invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK -> sale_invoices.id (a EMISSAO dona desta saida). NULL so em saida sem registro de emissao (dado legado).'
  },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> products.id expedido' },
  lot_control_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK -> lot_controls.id de onde a mercadoria saiu (D-M devolve a ESTE lote)' },
  quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false, comment: 'Quantidade que ESTA emissao consumiu DESTE lote' },
  quantity_returned: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0, comment: 'Quanto ja voltou ao lote (cancelamento de NF-e / de venda)' },
  status: {
    type: DataTypes.ENUM('shipped', 'returned'),
    allowNull: false,
    defaultValue: 'shipped',
    comment: 'shipped = ha saldo expedido nao devolvido; returned = tudo devolveu'
  },
  shipped_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  returned_at: { type: DataTypes.DATE, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'FK -> users.id responsavel pela saida (do JWT)' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'sale_lot_shipments',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['sale_id'] },
    { fields: ['sale_invoice_id'] },
    { fields: ['lot_control_id'] },
    { fields: ['product_id', 'status'] }
  ]
});

export = SaleLotShipment;
