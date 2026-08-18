const GetBlocoKPreviewUseCase = require('../../src/modules/fiscal/application/use-cases/GetBlocoKPreviewUseCase');

const modelsModulePath = '../../src/models/index';
const repositoryModulePath = '../../src/modules/fiscal/infrastructure/sequelize/SequelizeFiscalRepository';

describe('GetBlocoKPreviewUseCase', () => {
  it('delegates to the repository with the requested period and keeps the preview referential', async () => {
    jest.resetModules();

    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([
        {
          product_id: 1,
          product_code: 'P-001',
          product_name: 'Produto A',
          product_type: 'finished',
          unit: 'un',
          quantity_global: 10,
          quantity_by_warehouse: 8,
          quantity_available_in_lots: 5,
          lots_count: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          production_order_id: 11,
          order_number: 'OP-001',
          product_id: 1,
          product_code: 'P-001',
          product_name: 'Produto A',
          unit: 'un',
          planned_quantity: 10,
          quantity_produced: 9,
          quantity_scrapped: 1,
          status: 'completed',
          completion_date: '2026-08-12',
          production_route_id: 7,
        },
      ])
      .mockResolvedValueOnce([
        {
          consumption_id: 21,
          production_order_id: 11,
          order_number: 'OP-001',
          product_id: 2,
          product_code: 'C-001',
          product_name: 'Componente A',
          lot_control_id: 31,
          lot_number: 'LOT-001',
          quantity_consumed: 4,
          consumed_at: '2026-08-12T10:00:00.000Z',
          user_id: 9,
        },
      ]);

    jest.doMock(modelsModulePath, () => ({
      sequelize: { query: queryMock },
    }));

    let SequelizeFiscalRepository: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      SequelizeFiscalRepository = require(repositoryModulePath);
    });

    const repository = new SequelizeFiscalRepository();
    const useCase = new GetBlocoKPreviewUseCase(repository);
    const result = await useCase.execute({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
    });

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock.mock.calls[1][1].replacements).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    expect(queryMock.mock.calls[2][1].replacements).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });

    expect(result.report_type).toBe('bloco-k-preview');
    expect(result.is_reference_only).toBe(true);
    expect(result.disclaimer).toContain('Preview referencial');
    expect(result.summary).toEqual({
      k200_count: 1,
      k230_count: 1,
      k235_count: 1,
      k280_count: 0,
    });
    expect(result.k200[0].product_code).toBe('P-001');
    expect(result.k230[0].production_route_id).toBe(7);
    expect(result.k235[0].lot_number).toBe('LOT-001');
  });
});
