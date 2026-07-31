import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: payload invalido de venda nao pode derrubar o processo', () => {
  /**
   * Regressao para um bug real encontrado em ensaio de canario: o
   * `saleController.create` fazia `t.rollback()` antes de chamar
   * `handleZodError`, que sempre lanca. O catch externo tentava fazer
   * rollback de novo na mesma transacao ja finalizada, o que derrubava
   * o processo Node inteiro (nao apenas a requisicao).
   *
   * @returns Promise resolvida apos validar 400 e sobrevivencia do processo.
   */
  it('POST /api/sales com payload invalido retorna 400 e mantem a API viva', async () => {
    const token = authToken();

    const response = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ campo_invalido: true });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });

  /**
   * Mesma regressao para `PUT /api/sales/:id/status`.
   *
   * @returns Promise resolvida apos validar 400 e sobrevivencia do processo.
   */
  it('PUT /api/sales/:id/status com payload invalido retorna 400 e mantem a API viva', async () => {
    const token = authToken();

    const response = await api()
      .put('/api/sales/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'estado-que-nao-existe' });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });
});
