import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const models = require('../../src/models');

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Bloco K preview - corte de periodo em K230', () => {
  jest.setTimeout(60_000);

  it('conta apenas OPs concluidas dentro do periodo e marca o preview como referencial', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID || process.env.TEST_PRODUCT_ID);
    if (!productId) {
      throw new Error('TEST_BOM_LINKED_PRODUCT_ID ou TEST_PRODUCT_ID e obrigatorio para o teste de Bloco K.');
    }

    const before = await api().get('/api/fiscal/bloco-k').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);
    expect(before.body.data.is_reference_only).toBe(true);
    expect(before.body.data.disclaimer).toContain('Preview referencial');

    const baselineK230 = Number(before.body.data.summary.k230_count);
    const suffix = String(Date.now());
    const insideOrderNumber = `BK-IN-${suffix}`;
    const outsideOrderNumber = `BK-OUT-${suffix}`;

    const createdIds: number[] = [];
    try {
      const inside = await models.ProductionOrder.create({
        order_number: insideOrderNumber,
        product_id: productId,
        quantity: 3,
        quantity_produced: 3,
        quantity_scrapped: 0,
        priority: 'normal',
        status: 'completed',
        due_date: '2026-08-12',
        completion_date: '2026-08-12',
        created_by: null,
      });
      createdIds.push(inside.id);

      const outside = await models.ProductionOrder.create({
        order_number: outsideOrderNumber,
        product_id: productId,
        quantity: 2,
        quantity_produced: 2,
        quantity_scrapped: 0,
        priority: 'normal',
        status: 'completed',
        due_date: '2026-07-12',
        completion_date: '2026-07-12',
        created_by: null,
      });
      createdIds.push(outside.id);

      const after = await api().get('/api/fiscal/bloco-k').set('Authorization', `Bearer ${token}`);
      expect(after.status).toBe(200);
      expect(after.body.data.is_reference_only).toBe(true);
      expect(after.body.data.disclaimer).toContain('Preview referencial');
      expect(after.body.data.summary.k230_count).toBe(baselineK230 + 1);
      expect(after.body.data.k230.some((row: any) => row.order_number === insideOrderNumber)).toBe(true);
      expect(after.body.data.k230.some((row: any) => row.order_number === outsideOrderNumber)).toBe(false);
    } finally {
      if (createdIds.length > 0) {
        await models.ProductionOrder.destroy({ where: { id: createdIds } });
      }
    }
  });
});
