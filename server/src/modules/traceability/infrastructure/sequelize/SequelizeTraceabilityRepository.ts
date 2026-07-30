/**
 * Implementacao Sequelize do repositorio de rastreabilidade industrial.
 * Consulta as tabelas canonicas `movimentos_estoque`, `lotes`, `numeros_serie`,
 * `ordens_producao` e `production_lot_consumptions` para montar a cadeia de
 * custodia ponta a ponta.
 *
 * @module modules/traceability/infrastructure/sequelize/SequelizeTraceabilityRepository
 */

import { QueryTypes } from 'sequelize';
import TraceabilityRepository from '../../domain/repositories/TraceabilityRepository';

const { sequelize } = require('../../../../models/index');

/**
 * Implementacao Sequelize com queries SQL para rastreabilidade.
 * Usa queries raw para maior performance em grafos de rastreamento.
 */
class SequelizeTraceabilityRepository extends TraceabilityRepository {
  /**
   * Retorna o historico completo de movimentacoes de um item.
   * Busca em `movimentos_estoque` com joins em `lotes` e `numeros_serie`.
   *
   * @param itemId - UUID do item canonico.
   * @returns Lista de movimentos ordenados por data decrescente.
   */
  public async getItemHistory(itemId: string): Promise<any[]> {
    const sql = `
      SELECT
        me.item_id,
        i.codigo,
        i.descricao,
        i.tipo,
        me.tipo AS movimento_tipo,
        me.quantidade,
        me.lote_id,
        l.codigo_lote,
        ns.numero_serie,
        me.origem_tabela,
        me.origem_id,
        me.criado_em
      FROM movimentos_estoque me
      JOIN items i ON i.id = me.item_id
      LEFT JOIN lotes l ON l.id = me.lote_id
      LEFT JOIN numeros_serie ns ON ns.lote_id = me.lote_id AND ns.item_id = me.item_id
      WHERE me.item_id = :itemId
      ORDER BY me.criado_em DESC
    `;

    return sequelize.query(sql, {
      replacements: { itemId },
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Retorna o historico completo de um lote: entrada, movimentacoes e consumos
   * em ordens de producao.
   *
   * @param lotId - UUID do lote.
   * @returns Lista de movimentos do lote.
   */
  public async getLotHistory(lotId: string): Promise<any[]> {
    const sql = `
      SELECT
        l.id AS lote_id,
        l.codigo_lote,
        l.item_id,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item,
        i.tipo,
        me.tipo AS movimento_tipo,
        me.quantidade,
        me.origem_tabela,
        me.origem_id,
        me.criado_em
      FROM lotes l
      JOIN items i ON i.id = l.item_id
      LEFT JOIN movimentos_estoque me ON me.lote_id = l.id
      WHERE l.id = :lotId
      ORDER BY me.criado_em DESC
    `;

    return sequelize.query(sql, {
      replacements: { lotId },
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Retorna os detalhes de rastreabilidade de uma ordem de producao,
   * incluindo todos os insumos (lotes) consumidos.
   *
   * @param productionOrderId - UUID da ordem de producao.
   * @returns Dados da OP com insumos ou null.
   */
  public async getProductionOrderDetails(productionOrderId: string): Promise<any | null> {
    // Busca dados da OP
    const opSql = `
      SELECT
        op.id AS op_id,
        op.codigo AS op_codigo,
        op.item_id,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item,
        i.tipo,
        op.quantidade_planejada,
        op.quantidade_produzida,
        op.status
      FROM ordens_producao op
      JOIN items i ON i.id = op.item_id
      WHERE op.id = :productionOrderId
    `;

    const opRows: any[] = await sequelize.query(opSql, {
      replacements: { productionOrderId },
      type: QueryTypes.SELECT,
    });

    const opData = opRows[0];
    if (!opData) return null;

    // Busca insumos consumidos pela OP
    const insumosSql = `
      SELECT
        plc.lot_control_id AS lote_id,
        l.codigo_lote,
        plc.product_id AS item_id,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item,
        plc.quantity_consumed AS quantidade_consumida
      FROM production_lot_consumptions plc
      JOIN lot_controls l ON l.id = plc.lot_control_id
      JOIN items i ON i.id = plc.product_id
      WHERE plc.production_order_id = :productionOrderId
    `;

    const insumosRows: any[] = await sequelize.query(insumosSql, {
      replacements: { productionOrderId },
      type: QueryTypes.SELECT,
    });

    return {
      ...opData,
      insumos: insumosRows,
    };
  }
}

export = SequelizeTraceabilityRepository;

