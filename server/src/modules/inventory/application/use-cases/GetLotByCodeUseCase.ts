/**
 * Use case: resolver um lote (`LotControl`) a partir do código legível
 * (`lot_number`) lido por scanner físico ou digitado manualmente no mobile.
 *
 * @module modules/inventory/application/use-cases/GetLotByCodeUseCase
 *
 * Cobre `GET /api/inventory/lots/by-code/:lot_number`. Item 6 do roadmap
 * (`docs/LEVANTAMENTO_ERP_2026-08-02.md`) — rastreabilidade por lote/QR no
 * chão de fábrica: conecta o código já existente em `LotControl.lot_number`
 * ao fluxo de apontamento/consumo, sem exigir o `id` numérico interno.
 *
 * `lot_number` é único por `(product_id, lot_number)` (índice composto do
 * model `LotControl`), não globalmente único — por isso o endpoint aceita
 * `product_id` opcional para desambiguar quando o mesmo código aparecer em
 * mais de um produto (caso raro, mas possível). Sem `product_id`, retorna o
 * primeiro lote encontrado (mais antigo primeiro) quando houver apenas um
 * resultado, ou lança `ConflictError` se houver mais de um, pedindo o
 * `product_id` para desambiguar.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LotControl, Product, Supplier, Warehouse } = require('../../../../models/index');

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, ValidationError, ConflictError } from '../../../../errors';

interface GetLotByCodeInput {
  lot_number: string;
  product_id?: string | number;
}

class GetLotByCodeUseCase extends UseCase<GetLotByCodeInput, any> {
  /**
   * @param input - Código do lote lido (`lot_number`) e `product_id` opcional para desambiguar.
   * @returns Lote encontrado, com `product`, `supplier` e `warehouse` incluídos.
   * @throws {ValidationError} Se `lot_number` estiver vazio.
   * @throws {NotFoundError} Se nenhum lote corresponder ao código informado.
   * @throws {ConflictError} Se o código corresponder a mais de um produto e `product_id` não for informado.
   */
  public async execute({ lot_number, product_id }: GetLotByCodeInput): Promise<any> {
    const code = String(lot_number || '').trim();
    if (!code) {
      throw new ValidationError('lot_number é obrigatório.');
    }

    const where: Record<string, unknown> = { lot_number: code };
    if (product_id !== undefined) {
      const parsedProductId = Number(product_id);
      if (Number.isNaN(parsedProductId)) {
        throw new ValidationError('product_id deve ser numérico.');
      }
      where.product_id = parsedProductId;
    }

    const include = [
      { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
      { model: Supplier, as: 'supplier', attributes: ['id', 'company_name'] },
      { model: Warehouse, as: 'warehouse', attributes: ['id', 'code', 'name'] }
    ];

    if (product_id !== undefined) {
      const lot = await LotControl.findOne({ where, include, order: [['createdAt', 'ASC']] });
      if (!lot) {
        throw new NotFoundError(`Nenhum lote encontrado com o código '${code}' para o produto informado.`);
      }
      return lot;
    }

    const matches = await LotControl.findAll({ where, include, order: [['createdAt', 'ASC']], limit: 2 });
    if (matches.length === 0) {
      throw new NotFoundError(`Nenhum lote encontrado com o código '${code}'.`);
    }
    if (matches.length > 1) {
      throw new ConflictError(
        `O código '${code}' corresponde a lotes de mais de um produto. Informe product_id para desambiguar.`
      );
    }
    return matches[0];
  }
}

export = GetLotByCodeUseCase;
