/**
 * G1 — regras da criacao de revisao de BOM (`BomService.createBOM`).
 *
 * Dois defeitos travados aqui:
 *
 * 1. O `superseded` da revisao anterior rodava FORA da transacao, antes dela.
 *    Se a criacao falhasse depois (componente invalido, erro de enum, queda
 *    de conexao), o produto ficava com ZERO BOM ativa — e, desde o G2,
 *    produto sem BOM ativa nao conclui OP. Um cadastro malsucedido derrubava
 *    a producao de um produto que estava funcionando.
 * 2. Nada impedia duas revisoes com o mesmo rotulo, nem um produto entrar
 *    como componente de si mesmo (ciclo que so estourava depois, na
 *    explosao, com a BOM ja gravada).
 */

jest.mock('../../src/config/database', () => ({
  sequelize: { transaction: jest.fn(async (callback: any) => callback('TX')) },
}));

jest.mock('../../src/models/index', () => ({
  BillOfMaterial: { findOne: jest.fn(), update: jest.fn(), create: jest.fn() },
  BillOfMaterialItem: { create: jest.fn() },
  Product: { findByPk: jest.fn() },
  Item: { findOne: jest.fn() },
}));

jest.mock('../../src/services/quarantineBalanceService', () => ({
  sumWithheldByProduct: jest.fn(async () => new Map()),
  planningQuantity: (physical: number) => physical,
}));

// Deteccao de ciclo multinivel (auditoria 2026-08-11): a implementacao real
// consulta o banco (`bill_of_materials` em products.id). Aqui ela e um dubl.
// que responde "nao ha caminho" por padrao — o teste de ciclo abaixo inverte
// a resposta. O comportamento contra Postgres real esta em
// `tests/integration/bom-cycle-multilevel.test.ts`.
jest.mock('../../src/services/bomStructureProjection', () => ({
  hasProductPathBetween: jest.fn(async () => false),
}));

const BomService = require('../../src/services/bomService');
const BomStructureProjection = require('../../src/services/bomStructureProjection');
const { sequelize } = require('../../src/config/database');
const { BillOfMaterial, BillOfMaterialItem, Product, Item } = require('../../src/models/index');

const FINISHED = { id: 17, name: 'Alto-falante 12pol', code: 'PA-012', product_type: 'finished', cost_price: '0' };
const COMPONENT = { id: 16, name: 'Bobina de voz', code: 'MP-057', product_type: 'raw_material', cost_price: '17.59' };

describe('G1 - criacao de revisao de BOM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Product.findByPk.mockImplementation(async (id: number | string) => {
      if (String(id) === '17') return FINISHED;
      if (String(id) === '16') return COMPONENT;
      return null;
    });
    BillOfMaterial.findOne.mockResolvedValue(null);
    BillOfMaterial.update.mockResolvedValue([1]);
    BillOfMaterial.create.mockResolvedValue({ id: 18, update: jest.fn() });
    BillOfMaterialItem.create.mockImplementation(async (data: any) => ({ ...data, total_cost: data.total_cost }));
    BomStructureProjection.hasProductPathBetween.mockResolvedValue(false);
    // Crosswalk `products.code = items.codigo`: por padrao nao ha item mestre
    // correspondente — os testes de tipo nao-produtivo abaixo invertem isso.
    Item.findOne.mockResolvedValue(null);
  });

  it('rebaixa a revisao anterior DENTRO da transacao', async () => {
    await BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 2 }],
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    const [values, options] = BillOfMaterial.update.mock.calls[0];
    expect(values).toEqual({ status: 'superseded' });
    expect(options.where).toEqual({ product_id: 17, status: 'active' });
    expect(options.transaction).toBe('TX');
  });

  it('nao rebaixa nada se a validacao falhar antes da transacao', async () => {
    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 999, quantity: 1 }],
    })).rejects.toMatchObject({ statusCode: 404 });

    expect(BillOfMaterial.update).not.toHaveBeenCalled();
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('recusa o proprio produto como componente da estrutura', async () => {
    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 17, quantity: 1 }],
    })).rejects.toMatchObject({ statusCode: 422, rule: 'G1-BOM-AUTO-REF' });

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('recusa CICLO MULTINIVEL: o componente ja contem o produto na estrutura dele', async () => {
    // A auto-referencia acima so cobre profundidade 1. Aqui o dubl. responde
    // que existe caminho 16 -> ... -> 17, entao gravar 17 -> 16 fecharia o
    // ciclo — o que antes entrava no banco e so estourava na explosao, com a
    // BOM ja gravada (e, depois do G2, produto que nao conclui OP).
    BomStructureProjection.hasProductPathBetween.mockResolvedValue(true);

    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({ statusCode: 422, details: { rule: 'G1-BOM-CICLO' } });

    // A pergunta certa: existe caminho do COMPONENTE ate o PAI?
    expect(BomStructureProjection.hasProductPathBetween).toHaveBeenCalledWith(16, 17);
    // E, como toda validacao de forma do G1, ela roda ANTES da transacao.
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(BillOfMaterial.update).not.toHaveBeenCalled();
  });

  it('recusa repetir o rotulo de revisao do mesmo produto', async () => {
    BillOfMaterial.findOne.mockResolvedValue({ id: 18, revision: 'S1' });

    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({ statusCode: 409, rule: 'G1-BOM-REV-DUP' });

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('procura o rotulo duplicado ignorando apenas as revisoes inativas', async () => {
    await BomService.createBOM({
      product_id: 17,
      created_by: 1,
      items: [{ component_product_id: 16, quantity: 1 }],
    });

    const [{ where }] = BillOfMaterial.findOne.mock.calls[0];
    expect(where.product_id).toBe(17);
    // Sem `revision` no payload o rotulo default e '00'.
    expect(where.revision).toBe('00');
  });

  it('recusa componente cujo item mestre e ATIVO_IMOBILIZADO (BOM nao mistura com patrimonio)', async () => {
    // O seletor da tela de BOM so lista `products`, mas o crosswalk
    // `products.code = items.codigo` permite existir um produto cujo item
    // mestre e um bem patrimonial (ex.: "Mesa" cadastrada como item). Sem a
    // guarda, o MRP planejaria COMPRA DE IMOBILIZADO por demanda de producao.
    Item.findOne.mockImplementation(async ({ where }: any) =>
      where.codigo === 'MP-057' ? { codigo: 'MP-057', tipo: 'ATIVO_IMOBILIZADO' } : null);

    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({
      statusCode: 422,
      details: { rule: 'G1-BOM-TIPO-NAO-PRODUTIVO', papel_na_estrutura: 'componente', item_tipo: 'ATIVO_IMOBILIZADO' },
    });

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(BillOfMaterial.update).not.toHaveBeenCalled();
  });

  it('recusa componente cujo item mestre e USO_E_CONSUMO (MRO nao entra em estrutura)', async () => {
    Item.findOne.mockImplementation(async ({ where }: any) =>
      where.codigo === 'MP-057' ? { codigo: 'MP-057', tipo: 'USO_E_CONSUMO' } : null);

    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({
      statusCode: 422,
      details: { rule: 'G1-BOM-TIPO-NAO-PRODUTIVO', item_tipo: 'USO_E_CONSUMO' },
    });

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('recusa BOM cujo PAI tem item mestre de patrimonio (cadastro contraditorio)', async () => {
    Item.findOne.mockImplementation(async ({ where }: any) =>
      where.codigo === 'PA-012' ? { codigo: 'PA-012', tipo: 'ATIVO_IMOBILIZADO' } : null);

    await expect(BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({
      statusCode: 422,
      details: { rule: 'G1-BOM-TIPO-NAO-PRODUTIVO', papel_na_estrutura: 'pai' },
    });

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('aceita componente sem item mestre correspondente (crosswalk vazio nao bloqueia)', async () => {
    await BomService.createBOM({
      product_id: 17,
      created_by: 1,
      revision: 'S1',
      items: [{ component_product_id: 16, quantity: 2 }],
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
  });

  it('recusa BOM de produto que nao e acabado, antes de qualquer escrita', async () => {
    Product.findByPk.mockResolvedValue(COMPONENT);

    await expect(BomService.createBOM({
      product_id: 16,
      created_by: 1,
      items: [{ component_product_id: 16, quantity: 1 }],
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(BillOfMaterial.update).not.toHaveBeenCalled();
  });
});
