import { Op } from 'sequelize';
import ItemRepository from '../../domain/repositories/ItemRepository';
const { Item, Product } = require('../../../../models/index');
const Validators = require('../../../../utils/validators');
// G7 (achado colateral): o MRP não pode contar como disponível o material
// que está em quarentena/bloqueio — ver `services/quarantineBalanceService`.
const QuarantineBalanceService = require('../../../../services/quarantineBalanceService');
type ItemListOptions = { limit: number; offset: number; search?: string; tipo?: string; status?: string };

/**
 * Implementacao Sequelize do repositorio de itens industriais.
 */
class SequelizeItemRepository extends ItemRepository {
  /** @inheritdoc */
  public async list({ limit, offset, search, tipo, status }: ItemListOptions): Promise<{ rows: any[]; count: number }> {
    const where: any = {};
    if (search) {
      const sanitized = Validators.sanitizeSearch(search);
      where[Op.or] = [
        { codigo: { [Op.like]: `%${sanitized}%` } },
        { descricao: { [Op.like]: `%${sanitized}%` } },
      ];
    }
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;

    return Item.findAndCountAll({
      where,
      limit,
      offset,
      order: [['criado_em', 'DESC']],
    });
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<any | null> {
    return Item.findByPk(id);
  }

  /** @inheritdoc */
  public async findByCode(code: string): Promise<any | null> {
    return Item.findOne({ where: { codigo: code } });
  }

  /** @inheritdoc */
  public async create(data: Record<string, unknown>, transaction?: any): Promise<any> {
    return Item.create(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async update(id: string, data: Record<string, unknown>, transaction?: any): Promise<any> {
    const item = await Item.findByPk(id);
    if (!item) return null;
    return item.update(data, transaction ? { transaction } : undefined);
  }

  /** @inheritdoc */
  public async listMrpInventoryPositions(itemIds?: string[]): Promise<any[]> {
    const where = itemIds?.length ? { id: { [Op.in]: itemIds } } : undefined;
    const items = await Item.findAll({ where });

    if (!items.length) {
      return [];
    }

    const codes = [...new Set(items.map((item: any) => String(item.codigo)).filter(Boolean))];
    const products = codes.length
      ? await Product.findAll({
        where: { code: { [Op.in]: codes } },
        // `id` é necessário desde o G7: a retenção por qualidade é agregada
        // por `lot_controls.product_id`, e sem o id não há como casar o lote
        // com a posição de estoque do MRP.
        attributes: ['id', 'code', 'quantity', 'reserved_quantity', 'min_quantity', 'lead_time'],
      })
      : [];

    const productByCode = new Map<string, any>(products.map((product: any) => [String(product.code), product]));

    // G7 (achado colateral, 2026-08-10): `products.quantity` é saldo FÍSICO e
    // inclui o material recebido que ainda não passou por inspeção — o
    // recebimento incrementa o saldo e cria o lote em `quarantine` no mesmo
    // passo. Enquanto o MRP lia esse número cru, material não inspecionado
    // contava como disponível e o plano **comprava de menos**. O desconto é
    // conservador por construção (`max(0, físico − retido)`): o pior caso
    // agora é planejar a mais, nunca planejar sobre material bloqueado.
    const withheldByProduct = await QuarantineBalanceService.sumWithheldByProduct(
      products.map((product: any) => product.id).filter((id: unknown) => id !== undefined && id !== null)
    );

    return items.map((item: any) => {
      const liveProduct = productByCode.get(String(item.codigo));
      const physicalQuantity = liveProduct?.quantity ?? item.estoque_atual;
      const withheldQuantity = liveProduct ? (withheldByProduct.get(Number(liveProduct.id)) ?? 0) : 0;

      return {
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        // Só desconta quando há retenção: sem lote em quarentena/bloqueio o
        // valor devolvido continua sendo exatamente o de antes (inclusive o
        // tipo string vindo do Sequelize), para não alterar o contrato de
        // quem já consome este método.
        estoque_atual: withheldQuantity > 0
          ? QuarantineBalanceService.planningQuantity(physicalQuantity, withheldQuantity)
          : physicalQuantity,
        estoque_fisico: physicalQuantity,
        estoque_retido_qualidade: withheldQuantity,
        estoque_reservado: liveProduct?.reserved_quantity ?? item.estoque_reservado,
        estoque_seguranca: liveProduct?.min_quantity ?? item.estoque_seguranca,
        lote_minimo: liveProduct?.min_quantity ?? item.lote_minimo,
        lead_time_dias: liveProduct?.lead_time ?? item.lead_time_dias,
      };
    });
  }

  /** @inheritdoc */
  public async listAutoConvertItemIds(itemIds: string[]): Promise<Set<string>> {
    if (!itemIds.length) {
      return new Set();
    }

    const items = await Item.findAll({
      where: { id: { [Op.in]: itemIds }, conversao_automatica: true },
      attributes: ['id'],
      raw: true,
    });

    return new Set(items.map((item: any) => String(item.id)));
  }

  /** @inheritdoc */
  public async findLegacyProductByItemId(itemId: string): Promise<any | null> {
    const item = await Item.findByPk(itemId);
    if (!item) {
      return null;
    }

    return Product.findOne({
      where: { code: item.codigo },
      attributes: ['id', 'code', 'name', 'status', 'product_type', 'quantity'],
    });
  }
}

export = SequelizeItemRepository;
