/**
 * G1 — a estrutura de produto passa a ter fonte unica.
 *
 * O defeito que estes testes travam: o ERP tinha DUAS arvores de produto
 * paralelas. O MRP lia `item_estruturas` (mestre `items`, UUID) e a producao
 * consumia e custeava por `bill_of_materials` (mestre `products`, INTEGER).
 * A unica ponte era casamento de string, nunca exercida para estrutura —
 * entao planejamento e consumo podiam discordar sobre o que compoe um
 * produto e nada acusava.
 *
 * O teste central e `le a MESMA estrutura`: ele afirma que a aresta que o
 * planejamento enxerga sai da MESMA linha de banco que a producao explode.
 */

jest.mock('../../src/models/index', () => {
  const sequelize = {
    query: jest.fn(),
    transaction: jest.fn(async (callback: any) => callback('TX')),
  };
  return {
    sequelize,
    MrpOrdemPlanejada: { findAll: jest.fn(), findOrCreate: jest.fn(), update: jest.fn() },
    Item: {},
    BillOfMaterial: { findAll: jest.fn(), update: jest.fn() },
    BillOfMaterialItem: {},
    Product: {},
  };
});

const BomStructureProjection = require('../../src/services/bomStructureProjection');
import SequelizeMrpRepository = require('../../src/modules/mrp/infrastructure/sequelize/SequelizeMrpRepository');
import SequelizeItemEstruturaRepository = require('../../src/modules/items/infrastructure/sequelize/SequelizeItemEstruturaRepository');
import CreateItemStructureUseCase = require('../../src/modules/items/application/use-cases/CreateItemStructureUseCase');

const { sequelize, BillOfMaterial } = require('../../src/models/index');

/** Linha crua da projecao, como o Postgres devolve. */
function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    item_pai_id: 'item-pai',
    item_componente_id: 'item-componente',
    quantidade: '2.500000',
    perda_percentual: '5.000000',
    bom_id: 18,
    revisao: 'S1',
    product_pai_id: 17,
    product_componente_id: 16,
    codigo_pai: 'PA-12POL',
    codigo_componente: 'MP-BOBINA',
    ...overrides,
  };
}

describe('G1 - projecao da estrutura unica (services/bomStructureProjection)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('le apenas a BOM ativa e projeta a aresta em UUID de item', async () => {
    sequelize.query.mockResolvedValue([rawRow()]);

    const { edges, unmapped } = await BomStructureProjection.listActiveStructure();

    expect(unmapped).toEqual([]);
    expect(edges).toEqual([
      {
        item_pai_id: 'item-pai',
        item_componente_id: 'item-componente',
        quantidade: 2.5,
        perda_percentual: 5,
        ativo: true,
        bom_id: 18,
        revisao: 'S1',
        product_pai_id: 17,
        product_componente_id: 16,
        codigo_pai: 'PA-12POL',
        codigo_componente: 'MP-BOBINA',
      },
    ]);

    // A consulta filtra por status vigente via replacement (literal conferido
    // contra `pg_enum`: enum_bill_of_materials_status tem 'active').
    const [, options] = sequelize.query.mock.calls[0];
    expect(options.replacements).toEqual({ activeStatus: 'active' });
    expect(BomStructureProjection.ACTIVE_BOM_STATUS).toBe('active');
  });

  it('le a estrutura de bill_of_materials, nao de item_estruturas', async () => {
    sequelize.query.mockResolvedValue([]);

    await BomStructureProjection.listActiveStructure();

    const [sql] = sequelize.query.mock.calls[0];
    expect(sql).toContain('bill_of_materials');
    expect(sql).toContain('bill_of_material_items');
    expect(sql).not.toContain('item_estruturas');
  });

  it('reporta a aresta que se perde no crosswalk em vez de engoli-la', async () => {
    // Componente de BOM ativa cujo produto nao tem item canonico: sem o
    // relatorio, o MRP simplesmente nao enxergaria esse material — que e o
    // G1 renascendo por outro caminho.
    sequelize.query.mockResolvedValue([
      rawRow(),
      rawRow({
        item_componente_id: null,
        product_componente_id: 99,
        codigo_componente: 'MP-SEM-ITEM',
      }),
    ]);

    const { edges, unmapped } = await BomStructureProjection.listActiveStructure();

    expect(edges).toHaveLength(1);
    expect(unmapped).toEqual([
      { bom_id: 18, side: 'component', product_id: 99, codigo: 'MP-SEM-ITEM' },
    ]);
  });

  it('nao repete a mesma lacuna de catalogo quando ela aparece em varias BOMs', async () => {
    sequelize.query.mockResolvedValue([
      rawRow({ item_componente_id: null, product_componente_id: 99, codigo_componente: 'MP-SEM-ITEM' }),
      rawRow({ bom_id: 21, item_componente_id: null, product_componente_id: 99, codigo_componente: 'MP-SEM-ITEM' }),
    ]);

    const { unmapped } = await BomStructureProjection.listActiveStructure();

    expect(unmapped).toHaveLength(1);
  });

  it('detecta ciclo percorrendo a estrutura vigente', async () => {
    sequelize.query.mockResolvedValue([
      rawRow({ item_pai_id: 'A', item_componente_id: 'B' }),
      rawRow({ item_pai_id: 'B', item_componente_id: 'C' }),
    ]);

    await expect(BomStructureProjection.hasPathBetween('A', 'C')).resolves.toBe(true);
    await expect(BomStructureProjection.hasPathBetween('C', 'A')).resolves.toBe(false);
  });

  it('nao entra em laco infinito se o dado ja tiver ciclo gravado', async () => {
    sequelize.query.mockResolvedValue([
      rawRow({ item_pai_id: 'A', item_componente_id: 'B' }),
      rawRow({ item_pai_id: 'B', item_componente_id: 'A' }),
    ]);

    await expect(BomStructureProjection.hasPathBetween('A', 'Z')).resolves.toBe(false);
  });

  it('enxerga o item nas duas pontas da estrutura vigente', async () => {
    sequelize.query.mockResolvedValue([rawRow({ item_pai_id: 'A', item_componente_id: 'B' })]);

    await expect(BomStructureProjection.hasActiveParentOrComponent('A')).resolves.toBe(true);
    await expect(BomStructureProjection.hasActiveParentOrComponent('B')).resolves.toBe(true);
    await expect(BomStructureProjection.hasActiveParentOrComponent('Z')).resolves.toBe(false);
  });
});

describe('G1 - planejamento e consumo leem a MESMA estrutura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('MRP e explosao de item devolvem a mesma aresta, vinda da mesma BOM', async () => {
    sequelize.query.mockResolvedValue([rawRow()]);

    const planningEdges = await new SequelizeMrpRepository().listActiveEdges();
    const engineeringEdges = await new SequelizeItemEstruturaRepository().listActiveEdges();

    expect(planningEdges).toEqual(engineeringEdges);

    // Nao basta serem iguais: precisam apontar para a MESMA linha de banco
    // que a producao explode na conclusao da OP (`bom_id` + produto legado).
    expect(planningEdges[0].bom_id).toBe(18);
    expect(planningEdges[0].product_pai_id).toBe(17);
    expect(planningEdges[0].product_componente_id).toBe(16);

    // Duas leituras, uma unica origem: as duas consultas sao a mesma SQL.
    const [planningSql] = sequelize.query.mock.calls[0];
    const [engineeringSql] = sequelize.query.mock.calls[1];
    expect(planningSql).toBe(engineeringSql);
    expect(planningSql).toContain('bill_of_materials');
  });

  it('MRP expoe as lacunas de catalogo da estrutura vigente', async () => {
    sequelize.query.mockResolvedValue([
      rawRow({ item_pai_id: null, product_pai_id: 77, codigo_pai: 'PA-SEM-ITEM' }),
    ]);

    const gaps = await new SequelizeMrpRepository().listStructureGaps();

    expect(gaps).toEqual([
      { bom_id: 18, side: 'parent', product_id: 77, codigo: 'PA-SEM-ITEM' },
    ]);
  });
});

describe('G1 - escrita em estrutura paralela esta encerrada', () => {
  const itemRepository = {
    findById: jest.fn(),
  } as any;
  const itemEstruturaRepository = {
    hasPathBetween: jest.fn(),
    create: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    itemRepository.findById.mockImplementation(async (id: string) => ({ id, codigo: `COD-${id}` }));
    itemEstruturaRepository.hasPathBetween.mockResolvedValue(false);
  });

  it('recusa a gravacao apontando para o modulo de BOM, sem tocar no repositorio', async () => {
    const useCase = new CreateItemStructureUseCase(itemRepository, itemEstruturaRepository);

    const promise = useCase.execute({ item_pai_id: 'pai', item_componente_id: 'comp', quantidade: 2 });

    await expect(promise).rejects.toMatchObject({
      statusCode: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      details: {
        rule: 'G1-ESTRUTURA-DUPLA',
        origem_unica: 'bill_of_materials',
        endpoint_correto: 'POST /api/engineering/bom',
      },
    });
    expect(itemEstruturaRepository.create).not.toHaveBeenCalled();
  });

  it('continua acusando o problema real do payload antes de falar de rota descontinuada', async () => {
    const useCase = new CreateItemStructureUseCase(itemRepository, itemEstruturaRepository);

    await expect(
      useCase.execute({ item_pai_id: 'mesmo', item_componente_id: 'mesmo', quantidade: 1 }),
    ).rejects.toMatchObject({ details: { rule: 'G1-ESTRUTURA-AUTO-REF' } });

    itemEstruturaRepository.hasPathBetween.mockResolvedValue(true);
    await expect(
      useCase.execute({ item_pai_id: 'pai', item_componente_id: 'comp', quantidade: 1 }),
    ).rejects.toMatchObject({ details: { rule: 'G1-ESTRUTURA-CICLO' } });
  });

  it('404 continua vindo antes de tudo quando o item nem existe', async () => {
    itemRepository.findById.mockResolvedValue(null);
    const useCase = new CreateItemStructureUseCase(itemRepository, itemEstruturaRepository);

    await expect(
      useCase.execute({ item_pai_id: 'pai', item_componente_id: 'comp', quantidade: 1 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('o repositorio tambem barra, para quem chamar direto', async () => {
    await expect(new SequelizeItemEstruturaRepository().create({})).rejects.toMatchObject({
      statusCode: 422,
      rule: 'G1-ESTRUTURA-DUPLA',
    });
  });
});

describe('G1 - ativacao exclusiva de BOM (SequelizeBOMRepository)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rebaixa a vigente anterior e ativa a nova na MESMA transacao', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SequelizeBOMRepository = require('../../src/modules/bom/infrastructure/sequelize/SequelizeBOMRepository');
    BillOfMaterial.findAll.mockResolvedValue([{ id: 7 }]);
    BillOfMaterial.update.mockResolvedValue([1]);

    const result = await new SequelizeBOMRepository().activateExclusively(9, 17, { notes: 'x' });

    expect(result).toEqual({ updated: 1, supersededIds: [7] });
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);

    const [supersedeValues, supersedeOptions] = BillOfMaterial.update.mock.calls[0];
    expect(supersedeValues).toEqual({ status: 'superseded' });
    expect(supersedeOptions.transaction).toBe('TX');

    const [activateValues, activateOptions] = BillOfMaterial.update.mock.calls[1];
    expect(activateValues).toEqual({ notes: 'x', status: 'active' });
    expect(activateOptions.transaction).toBe('TX');
  });

  it('nao emite UPDATE de supersede quando o produto ainda nao tem BOM vigente', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SequelizeBOMRepository = require('../../src/modules/bom/infrastructure/sequelize/SequelizeBOMRepository');
    BillOfMaterial.findAll.mockResolvedValue([]);
    BillOfMaterial.update.mockResolvedValue([1]);

    const result = await new SequelizeBOMRepository().activateExclusively(9, 17, {});

    expect(result.supersededIds).toEqual([]);
    expect(BillOfMaterial.update).toHaveBeenCalledTimes(1);
  });
});
