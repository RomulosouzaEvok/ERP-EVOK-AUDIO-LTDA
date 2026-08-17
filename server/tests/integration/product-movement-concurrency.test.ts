import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';
import { ensureFixtureCategoryId } from './helpers/categoryFixtures';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: concorrencia em POST /api/products/movements', () => {
  /**
   * Regressao para um bug real encontrado em auditoria: `RegisterProductMovementUseCase`
   * lia `Product.quantity` e escrevia de volta sem transacao nem lock
   * pessimista, permitindo que duas saidas concorrentes deixassem o
   * estoque negativo (a mesma classe de bug ja corrigida em
   * `/api/inventory/movements`, mas que este endpoint mais antigo ainda
   * tinha). Corrigido delegando a `InventoryService.adjust` (lock
   * pessimista + transacao).
   *
   * @returns Promise resolvida apos validar que so uma das duas saidas concorrentes foi aceita.
   */
  it('bloqueia colisao transacional que geraria estoque negativo', async () => {
    const token = authToken();
    const categoryId = await ensureFixtureCategoryId(token);

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Produto Concorrencia ${Date.now()}`,
        code: `CONC-${Date.now()}`,
        category_id: categoryId,
        unit: 'UN',
        min_quantity: 1,
        cost_price: 1,
        price: 2,
      });
    expect(product.status).toBe(201);
    const productId = product.body.data.id;

    const seed = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product_id: productId,
        type: 'in',
        quantity: 5,
        warehouse_code: 'INSUMOS',
        description: 'Seed seguro para teste de concorrencia',
      });
    expect(seed.status).toBe(201);

    const payload = {
      product_id: productId,
      type: 'out',
      quantity: 5,
      warehouse_code: 'INSUMOS',
      description: 'Teste de concorrencia',
    };

    const [first, second] = await Promise.allSettled([
      api().post('/api/products/movements').set('Authorization', `Bearer ${token}`).send(payload),
      api().post('/api/products/movements').set('Authorization', `Bearer ${token}`).send(payload),
    ]);

    const statuses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value.status);

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.some((status) => [400, 409, 422].includes(status))).toBe(true);

    const finalProduct = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(finalProduct.body.data.quantity)).toBe(0);
  });
});
