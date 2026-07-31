import GetBOMByIdUseCase = require('../../src/modules/bom/application/use-cases/GetBOMByIdUseCase');
import ListBOMItemsUseCase = require('../../src/modules/bom/application/use-cases/ListBOMItemsUseCase');

describe('Custo de BOM desatualizado (achado de auditoria)', () => {
  it('GetBOMByIdUseCase expoe current_total_cost e cost_is_stale quando o preco do componente mudou', async () => {
    const bomRepository = {
      findById: jest.fn(async () => ({
        id: 1,
        total_cost: 100, // snapshot antigo: componente custava 10/un x 10un
        items: [
          {
            quantity: 10,
            componentProduct: { cost_price: 25 }, // preco atual subiu para 25/un
            setDataValue(this: any, key: string, value: unknown) { (this as any)[key] = value; },
          },
        ],
        setDataValue(this: any, key: string, value: unknown) { (this as any)[key] = value; },
      })),
    };

    const useCase = new GetBOMByIdUseCase(bomRepository);
    const result: any = await useCase.execute({ id: 1 });

    expect(result.current_total_cost).toBe(250);
    expect(result.cost_is_stale).toBe(true);
    expect(result.items[0].current_unit_cost).toBe(25);
  });

  it('GetBOMByIdUseCase nao marca como desatualizado quando o custo persistido ainda bate com o atual', async () => {
    const bomRepository = {
      findById: jest.fn(async () => ({
        id: 2,
        total_cost: 100,
        items: [
          {
            quantity: 10,
            componentProduct: { cost_price: 10 },
            setDataValue(this: any, key: string, value: unknown) { (this as any)[key] = value; },
          },
        ],
        setDataValue(this: any, key: string, value: unknown) { (this as any)[key] = value; },
      })),
    };

    const useCase = new GetBOMByIdUseCase(bomRepository);
    const result: any = await useCase.execute({ id: 2 });

    expect(result.current_total_cost).toBe(100);
    expect(result.cost_is_stale).toBe(false);
  });

  it('ListBOMItemsUseCase expoe current_unit_cost por item', async () => {
    const bomRepository = {
      listItems: jest.fn(async () => ([
        {
          componentProduct: { cost_price: 42 },
          setDataValue(this: any, key: string, value: unknown) { (this as any)[key] = value; },
        },
      ])),
    };

    const useCase = new ListBOMItemsUseCase(bomRepository);
    const result: any = await useCase.execute({ id: 1 });

    expect(result[0].current_unit_cost).toBe(42);
  });
});
