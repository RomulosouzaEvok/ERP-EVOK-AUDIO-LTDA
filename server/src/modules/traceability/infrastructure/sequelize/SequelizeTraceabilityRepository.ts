/**
 * Implementacao Sequelize do repositorio de rastreabilidade industrial.
 * Consulta os models reais do backend para montar a cadeia de custodia
 * disponivel no schema atual.
 *
 * @module modules/traceability/infrastructure/sequelize/SequelizeTraceabilityRepository
 */

import TraceabilityRepository from '../../domain/repositories/TraceabilityRepository';

const {
  Product,
  InventoryMovement,
  User,
  LotControl,
  SerialNumber,
  ProductionOrder,
  ProductionLotConsumption,
  Purchase,
  Supplier
} = require('../../../../models/index');

/**
 * Converte qualquer valor numérico persistido em `DECIMAL` para `number`.
 *
 * @param value - Valor bruto vindo do Sequelize.
 * @returns Número finito ou 0.
 */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normaliza datas opcionais para ordenacao defensiva.
 *
 * @param value - Data recebida.
 * @returns Data ou null.
 */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Implementacao Sequelize com queries SQL para rastreabilidade.
 * Usa queries raw para maior performance em grafos de rastreamento.
 */
class SequelizeTraceabilityRepository extends TraceabilityRepository {
  /**
   * Retorna o historico completo de movimentacoes de um item.
   * Busca em `inventory_movements`, lotes recebidos/gerados e consumos em OP.
   *
   * @param itemId - ID numerico do produto.
   * @returns Lista de movimentos ordenados por data decrescente.
   */
  public async getItemHistory(itemId: number): Promise<any[]> {
    const product = await Product.findByPk(itemId, {
      include: [
        { model: InventoryMovement, as: 'movements', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
        {
          model: LotControl,
          as: 'lot_controls',
          include: [
            { model: Purchase, as: 'purchase', attributes: ['id', 'order_number', 'invoice_number'] },
            { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
            { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status'] },
            { model: SerialNumber, as: 'serial_numbers', attributes: ['id', 'serial_number', 'status'] },
            {
              model: ProductionLotConsumption,
              as: 'production_consumptions',
              include: [
                { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status'] },
                { model: User, as: 'user', attributes: ['id', 'name'] }
              ]
            }
          ]
        },
        {
          model: ProductionLotConsumption,
          as: 'production_lot_consumptions',
          include: [
            { model: LotControl, as: 'lotControl', attributes: ['id', 'lot_number'] },
            { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status'] },
            { model: User, as: 'user', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!product) return [];

    const events: any[] = [];

    for (const movement of product.movements ?? []) {
      events.push({
        item_id: product.id,
        codigo: product.code ?? null,
        descricao: product.name ?? null,
        tipo: 'inventory_movement',
        movimento_tipo: movement.type,
        quantidade: toNumber(movement.quantity),
        lote_id: null,
        codigo_lote: null,
        numero_serie: null,
        origem_tabela: movement.reference_type ?? 'inventory_movements',
        origem_id: movement.reference_id ?? null,
        criado_em: toDate(movement.createdAt),
        metadata: {
          movement_id: movement.id,
          description: movement.description ?? null,
          user: movement.user ? { id: movement.user.id, name: movement.user.name } : null
        }
      });
    }

    for (const lot of product.lot_controls ?? []) {
      events.push({
        item_id: product.id,
        codigo: product.code ?? null,
        descricao: product.name ?? null,
        tipo: 'lot_control',
        movimento_tipo: lot.purchase_id ? 'purchase_lot_received' : 'production_lot_generated',
        quantidade: toNumber(lot.quantity_initial),
        lote_id: lot.id,
        codigo_lote: lot.lot_number,
        numero_serie: (lot.serial_numbers ?? []).map((serial: any) => serial.serial_number).join(', ') || null,
        origem_tabela: lot.purchase_id ? 'purchase_orders' : (lot.production_order_id ? 'production_orders' : 'lot_controls'),
        origem_id: lot.purchase_id ?? lot.production_order_id ?? lot.id,
        criado_em: toDate(lot.createdAt),
        metadata: {
          status: lot.status,
          quantity_available: toNumber(lot.quantity_available),
          purchase: lot.purchase ? { id: lot.purchase.id, order_number: lot.purchase.order_number } : null,
          supplier: lot.supplier ? { id: lot.supplier.id, name: lot.supplier.name } : null,
          production_order: lot.productionOrder ? { id: lot.productionOrder.id, order_number: lot.productionOrder.order_number } : null
        }
      });

      for (const consumption of lot.production_consumptions ?? []) {
        events.push({
          item_id: product.id,
          codigo: product.code ?? null,
          descricao: product.name ?? null,
          tipo: 'production_lot_consumption',
          movimento_tipo: 'lot_consumed_in_production',
          quantidade: toNumber(consumption.quantity_consumed),
          lote_id: lot.id,
          codigo_lote: lot.lot_number,
          numero_serie: null,
          origem_tabela: 'production_orders',
          origem_id: consumption.production_order_id ?? null,
          criado_em: toDate(consumption.consumed_at ?? consumption.createdAt),
          metadata: {
            consumption_id: consumption.id,
            production_order: consumption.productionOrder ? {
              id: consumption.productionOrder.id,
              order_number: consumption.productionOrder.order_number,
              status: consumption.productionOrder.status
            } : null,
            user: consumption.user ? { id: consumption.user.id, name: consumption.user.name } : null,
            notes: consumption.notes ?? null
          }
        });
      }
    }

    events.sort((a, b) => (b.criado_em?.getTime?.() ?? 0) - (a.criado_em?.getTime?.() ?? 0));
    return events;
  }

  /**
   * Retorna o historico completo de um lote: entrada, movimentacoes e consumos
   * em ordens de producao.
   *
   * @param lotId - ID numerico do lote.
   * @returns Lista de movimentos do lote.
   */
  public async getLotHistory(lotId: number): Promise<any[]> {
    const lot = await LotControl.findByPk(lotId, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        { model: Purchase, as: 'purchase', attributes: ['id', 'order_number', 'invoice_number', 'status'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status'] },
        { model: SerialNumber, as: 'serial_numbers', attributes: ['id', 'serial_number', 'status', 'createdAt'] },
        {
          model: ProductionLotConsumption,
          as: 'production_consumptions',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
            { model: ProductionOrder, as: 'productionOrder', attributes: ['id', 'order_number', 'status'] },
            { model: User, as: 'user', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    if (!lot || !lot.product) return [];

    const events: any[] = [
      {
        lote_id: lot.id,
        codigo_lote: lot.lot_number,
        item_id: lot.product.id,
        codigo_item: lot.product.code,
        descricao_item: lot.product.name,
        tipo: lot.product.product_type,
        movimento_tipo: lot.purchase_id ? 'purchase_lot_received' : 'production_lot_generated',
        quantidade: toNumber(lot.quantity_initial),
        origem_tabela: lot.purchase_id ? 'purchase_orders' : (lot.production_order_id ? 'production_orders' : 'lot_controls'),
        origem_id: lot.purchase_id ?? lot.production_order_id ?? lot.id,
        criado_em: toDate(lot.createdAt),
        metadata: {
          status: lot.status,
          quantity_available: toNumber(lot.quantity_available),
          supplier: lot.supplier ? { id: lot.supplier.id, name: lot.supplier.name } : null,
          purchase: lot.purchase ? { id: lot.purchase.id, order_number: lot.purchase.order_number, status: lot.purchase.status } : null,
          production_order: lot.productionOrder ? { id: lot.productionOrder.id, order_number: lot.productionOrder.order_number, status: lot.productionOrder.status } : null
        }
      }
    ];

    for (const serial of lot.serial_numbers ?? []) {
      events.push({
        lote_id: lot.id,
        codigo_lote: lot.lot_number,
        item_id: lot.product.id,
        codigo_item: lot.product.code,
        descricao_item: lot.product.name,
        tipo: lot.product.product_type,
        movimento_tipo: 'serial_generated',
        quantidade: 1,
        origem_tabela: 'serial_numbers',
        origem_id: serial.id,
        criado_em: toDate(serial.createdAt),
        metadata: {
          serial_number: serial.serial_number,
          status: serial.status
        }
      });
    }

    for (const consumption of lot.production_consumptions ?? []) {
      events.push({
        lote_id: lot.id,
        codigo_lote: lot.lot_number,
        item_id: lot.product.id,
        codigo_item: lot.product.code,
        descricao_item: lot.product.name,
        tipo: lot.product.product_type,
        movimento_tipo: 'lot_consumed_in_production',
        quantidade: toNumber(consumption.quantity_consumed),
        origem_tabela: 'production_orders',
        origem_id: consumption.production_order_id ?? null,
        criado_em: toDate(consumption.consumed_at ?? consumption.createdAt),
        metadata: {
          product_consumed: consumption.product ? {
            id: consumption.product.id,
            code: consumption.product.code,
            name: consumption.product.name
          } : null,
          production_order: consumption.productionOrder ? {
            id: consumption.productionOrder.id,
            order_number: consumption.productionOrder.order_number,
            status: consumption.productionOrder.status
          } : null,
          user: consumption.user ? { id: consumption.user.id, name: consumption.user.name } : null,
          notes: consumption.notes ?? null
        }
      });
    }

    events.sort((a, b) => (b.criado_em?.getTime?.() ?? 0) - (a.criado_em?.getTime?.() ?? 0));
    return events;
  }

  /**
   * Retorna os detalhes de rastreabilidade de uma ordem de producao,
   * incluindo todos os insumos (lotes) consumidos.
   *
   * @param productionOrderId - ID numerico da ordem de producao.
   * @returns Dados da OP com insumos ou null.
   */
  public async getProductionOrderDetails(productionOrderId: number): Promise<any | null> {
    const order = await ProductionOrder.findByPk(productionOrderId, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'product_type'] },
        {
          model: ProductionLotConsumption,
          as: 'lot_consumptions',
          include: [
            { model: LotControl, as: 'lotControl', attributes: ['id', 'lot_number', 'status'] },
            { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'user', attributes: ['id', 'name'] }
          ]
        },
        {
          model: LotControl,
          as: 'generated_lots',
          include: [
            { model: SerialNumber, as: 'serial_numbers', attributes: ['id', 'serial_number', 'status'] }
          ]
        },
        { model: SerialNumber, as: 'generated_serial_numbers', attributes: ['id', 'serial_number', 'status', 'lot_control_id'] }
      ]
    });

    if (!order || !order.product) return null;

    const movements = await InventoryMovement.findAll({
      where: { reference_type: 'production', reference_id: productionOrderId },
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'user', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return {
      op_id: order.id,
      op_codigo: order.order_number,
      item_id: order.product.id,
      codigo_item: order.product.code,
      descricao_item: order.product.name,
      tipo: order.product.product_type,
      quantidade_planejada: toNumber(order.quantity),
      quantidade_produzida: toNumber(order.quantity_produced),
      status: order.status,
      movements: movements.map((movement: any) => ({
        id: movement.id,
        product_id: movement.product_id,
        product_code: movement.product?.code ?? null,
        product_name: movement.product?.name ?? null,
        type: movement.type,
        quantity: toNumber(movement.quantity),
        description: movement.description ?? null,
        user: movement.user ? { id: movement.user.id, name: movement.user.name } : null,
        created_at: toDate(movement.createdAt)
      })),
      generated_lots: (order.generated_lots ?? []).map((lot: any) => ({
        id: lot.id,
        lot_number: lot.lot_number,
        status: lot.status,
        quantity_initial: toNumber(lot.quantity_initial),
        quantity_available: toNumber(lot.quantity_available),
        created_at: toDate(lot.createdAt)
      })),
      generated_serial_numbers: (order.generated_serial_numbers ?? []).map((serial: any) => ({
        id: serial.id,
        serial_number: serial.serial_number,
        status: serial.status,
        lot_control_id: serial.lot_control_id ?? null
      })),
      insumos: (order.lot_consumptions ?? []).map((consumption: any) => ({
        lote_id: consumption.lotControl?.id ?? consumption.lot_control_id,
        codigo_lote: consumption.lotControl?.lot_number ?? null,
        item_id: consumption.product?.id ?? consumption.product_id,
        codigo_item: consumption.product?.code ?? null,
        descricao_item: consumption.product?.name ?? null,
        quantidade_consumida: toNumber(consumption.quantity_consumed),
        consumido_em: toDate(consumption.consumed_at ?? consumption.createdAt),
        usuario_id: consumption.user?.id ?? consumption.user_id ?? null,
        observacoes: consumption.notes ?? null
      }))
    };
  }
}

export = SequelizeTraceabilityRepository;

