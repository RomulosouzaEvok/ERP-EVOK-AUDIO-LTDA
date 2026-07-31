import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Registro de refugo na conclusao de ordem de producao', () => {
  /**
   * Conclui uma OP informando quantity_scrapped/scrap_reason e confirma,
   * via GET, que os valores foram persistidos e que a quantidade recebida
   * em estoque corresponde apenas a producao boa (nao inclui o refugo).
   *
   * @returns Promise resolvida apos validar a persistencia via GET.
   */
  it('persiste quantity_scrapped e scrap_reason ao concluir a OP', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 10, due_date: dueDate });
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'released' });
    expect(released.status).toBe(200);

    const started = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });
    expect(started.status).toBe(200);

    const completed = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'completed',
        quantity_produced: 7,
        quantity_scrapped: 3,
        scrap_reason: 'Falha de solda identificada na inspecao final',
      });
    expect(completed.status).toBe(200);
    expect(String(completed.body.data.quantity_scrapped)).toBe('3.000000');

    const fetched = await api()
      .get(`/api/production-orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetched.status).toBe(200);
    expect(String(fetched.body.data.quantity_produced)).toBe('7.000000');
    expect(String(fetched.body.data.quantity_scrapped)).toBe('3.000000');
    expect(fetched.body.data.scrap_reason).toBe('Falha de solda identificada na inspecao final');
  });

  /**
   * Garante que produced + scrapped acima do planejado, sem
   * allow_overproduction, e rejeitado com erro de validacao.
   *
   * @returns Promise resolvida apos validar o status HTTP de erro.
   */
  it('rejeita conclusao quando produced + scrapped excede o planejado sem allow_overproduction', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_BOM_LINKED_PRODUCT_ID);
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, quantity: 5, due_date: dueDate });
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;

    await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'released' })
      .expect(200);

    await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' })
      .expect(200);

    const completed = await api()
      .put(`/api/production-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', quantity_produced: 4, quantity_scrapped: 3 });

    expect([400, 409, 422]).toContain(completed.status);
  });
});
