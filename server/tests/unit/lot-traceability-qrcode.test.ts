/**
 * Test: Rastreabilidade por lote/QR no chão de fábrica (item 6 do roadmap,
 * docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md).
 *
 * Cobre:
 * - `GetLotByCodeUseCase`: lookup de `LotControl` por `lot_number`
 *   (código legível), com desambiguação opcional por `product_id`;
 * - `GET /api/inventory/lots/:id/qrcode`: geração de QR reaproveitando o
 *   `GenerateEntityQrCodeUseCase` genérico já usado por Ativos/Produtos.
 *
 * @group unit
 * @ticket item-6-rastreabilidade-lote-qr
 */

jest.mock('../../src/models/index', () => ({
  LotControl: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Product: {},
  Supplier: {},
  Warehouse: {},
}));

jest.mock('../../src/services/qrCodeService', () => ({
  generate: jest.fn(),
  generateSvg: jest.fn(),
}));

import GetLotByCodeUseCase = require('../../src/modules/inventory/application/use-cases/GetLotByCodeUseCase');
import SequelizeInventoryRepository = require('../../src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository');
import GenerateEntityQrCodeUseCase = require('../../src/shared/application/GenerateEntityQrCodeUseCase');
import { NotFoundError, ValidationError, ConflictError } from '../../src/errors';

const { LotControl } = require('../../src/models/index');
const QRCodeService = require('../../src/services/qrCodeService');

const inventoryRepository = new SequelizeInventoryRepository();

describe('GetLotByCodeUseCase (lookup por lot_number)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejeita lot_number vazio antes de consultar o banco', async () => {
    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    await expect(useCase.execute({ lot_number: '  ' })).rejects.toBeInstanceOf(ValidationError);
    expect(LotControl.findAll).not.toHaveBeenCalled();
    expect(LotControl.findOne).not.toHaveBeenCalled();
  });

  it('resolve o lote quando o codigo e unico (sem product_id)', async () => {
    LotControl.findAll.mockResolvedValue([{ id: 10, lot_number: 'LOT-QR-001', product_id: 5 }]);

    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    const result = await useCase.execute({ lot_number: 'LOT-QR-001' });

    expect(LotControl.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lot_number: 'LOT-QR-001' }, limit: 2 })
    );
    expect(result.id).toBe(10);
  });

  it('lanca NotFoundError quando nenhum lote corresponde ao codigo', async () => {
    LotControl.findAll.mockResolvedValue([]);

    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    await expect(useCase.execute({ lot_number: 'LOTE-INEXISTENTE' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanca ConflictError quando o codigo aparece em mais de um produto e product_id nao foi informado', async () => {
    LotControl.findAll.mockResolvedValue([
      { id: 10, lot_number: 'LOT-DUP', product_id: 5 },
      { id: 11, lot_number: 'LOT-DUP', product_id: 8 },
    ]);

    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    await expect(useCase.execute({ lot_number: 'LOT-DUP' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('desambigua por product_id quando informado', async () => {
    LotControl.findOne.mockResolvedValue({ id: 11, lot_number: 'LOT-DUP', product_id: 8 });

    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    const result = await useCase.execute({ lot_number: 'LOT-DUP', product_id: 8 });

    expect(LotControl.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lot_number: 'LOT-DUP', product_id: 8 } })
    );
    expect(result.id).toBe(11);
  });

  it('lanca NotFoundError quando product_id informado nao bate com nenhum lote do codigo', async () => {
    LotControl.findOne.mockResolvedValue(null);

    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    await expect(useCase.execute({ lot_number: 'LOT-DUP', product_id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita product_id nao numerico', async () => {
    const useCase = new GetLotByCodeUseCase(inventoryRepository);
    await expect(useCase.execute({ lot_number: 'LOT-001', product_id: 'abc' })).rejects.toBeInstanceOf(ValidationError);
    expect(LotControl.findOne).not.toHaveBeenCalled();
  });
});

describe('QR Code de LotControl via GenerateEntityQrCodeUseCase (item 6)', () => {
  afterEach(() => jest.clearAllMocks());

  it('gera QR Code PNG com lot_number e dados do produto (sem infraestrutura nova de QR)', async () => {
    QRCodeService.generate.mockResolvedValue({
      qrDataUrl: 'data:image/png;base64,xyz',
      qrCodeData: '{"type":"lot","id":10,"lot_number":"LOT-QR-001"}',
    });

    const repository = {
      findById: jest.fn(async () => ({
        id: 10,
        lot_number: 'LOT-QR-001',
        product: { id: 5, code: 'PA-001', name: 'Woofer 12"' },
      })),
    };

    const useCase = new GenerateEntityQrCodeUseCase();
    const result = await useCase.execute({
      repository,
      id: 10,
      entityType: 'lot',
      entityLabel: 'Lote',
      buildData: (lot: any) => ({
        lot_number: lot.lot_number,
        product_code: lot.product?.code,
        product_name: lot.product?.name,
      }),
    });

    expect(QRCodeService.generate).toHaveBeenCalledWith('lot', 10, {
      lot_number: 'LOT-QR-001',
      product_code: 'PA-001',
      product_name: 'Woofer 12"',
    });
    expect(result.format).toBe('png');
    expect(result.qrDataUrl).toContain('data:image/png');
  });

  it('lanca NotFoundError ao gerar QR de lote inexistente', async () => {
    const repository = { findById: jest.fn(async () => null) };
    const useCase = new GenerateEntityQrCodeUseCase();

    await expect(
      useCase.execute({
        repository,
        id: 999,
        entityType: 'lot',
        entityLabel: 'Lote',
        buildData: () => ({}),
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
