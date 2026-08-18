const GetBlocoKPreviewUseCase = require('../../src/modules/fiscal/application/use-cases/GetBlocoKPreviewUseCase');

describe('GetBlocoKPreviewUseCase', () => {
  it('delega a consolidacao do Bloco K ao repositório', async () => {
    const repository = {
      findBlocoKPreview: jest.fn().mockResolvedValue({
        report_type: 'bloco-k-preview',
        generated_at: new Date('2026-08-18T00:00:00.000Z'),
        period: { start_date: '2026-08-01', end_date: '2026-08-31' },
        summary: { k200_count: 1, k230_count: 1, k235_count: 1, k280_count: 0 },
        k200: [{ product_code: 'P-001' }],
        k230: [{ order_number: 'OP-1' }],
        k235: [{ order_number: 'OP-1' }],
        k280: [],
      }),
    };

    const useCase = new GetBlocoKPreviewUseCase(repository);
    const result = await useCase.execute({
      start_date: '2026-08-01',
      end_date: '2026-08-31',
    });

    expect(repository.findBlocoKPreview).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    expect(result.summary.k200_count).toBe(1);
    expect(result.k200).toHaveLength(1);
  });
});
