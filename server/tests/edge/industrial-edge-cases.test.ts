import { calculateMrpPlan } from '../../src/modules/mrp/application/mrpEngine';
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describe('Casos de borda industriais', () => {
  /**
   * Garante precisao para consumo fracionario de insumos.
   *
   * @returns Void.
   */
  it('preserva decimais de alta precisao em insumos como cobre e cola', () => {
    const plan = calculateMrpPlan(
      [{ itemId: 'PA-12', quantity: 3, dueDate: new Date('2026-09-10T00:00:00.000Z'), sourceType: 'manual' }],
      [{ parentItemId: 'PA-12', componentItemId: 'MP-COLA', quantityPer: 0.000123, scrapPercentage: 2.5 }],
      [],
    );

    expect(plan[0].grossRequirement).toBe(0.000378);
  });
});

describeIntegration('Casos de borda API/PostgreSQL', () => {
  /**
   * Valida bloqueio de exclusao/desativacao de insumo vinculado a BOM ativa.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('impede exclusao de insumo vinculado a BOM ativa', async () => {
    const token = authToken();
    const itemId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);

    await api()
      .delete(`/api/products/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect((response) => expect([400, 409, 422]).toContain(response.status));
  });

  /**
   * Valida health do próprio ERP (sem dependência de serviços externos como Hostinger).
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('health do ERP responde com status 200', async () => {
    await api()
      .get('/api')
      .expect((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
  });
});
