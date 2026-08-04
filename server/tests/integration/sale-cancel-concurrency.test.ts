import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Concorrencia de cancelamento de venda', () => {
  const FIXTURE_CNPJ = '11222333000181';

  /**
   * Garante um cliente fixture reutilizavel entre execucoes (find-or-create
   * por CNPJ valido) para nao acumular registros a cada rodada de CI.
   *
   * @returns Id do cliente fixture.
   */
  async function ensureFixtureClient(): Promise<number> {
    const token = authToken();

    const createResponse = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cliente CI Concorrencia',
        cpf_cnpj: FIXTURE_CNPJ,
        email: 'ci-sale-concurrency@evok.local',
      });

    if (createResponse.status === 201) {
      return createResponse.body.data.id;
    }

    const listResponse = await api()
      .get('/api/clients')
      .query({ search: FIXTURE_CNPJ })
      .set('Authorization', `Bearer ${token}`);

    const existing = listResponse.body?.data?.[0];
    if (!existing) {
      throw new Error(`Falha ao criar/localizar cliente fixture: ${JSON.stringify(createResponse.body)}`);
    }

    return existing.id;
  }

  /**
   * Cria uma venda confirmada real (cliente + item) para o teste de concorrencia.
   *
   * @returns Id da venda criada.
   */
  async function createConfirmedSale(): Promise<number> {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const customerId = await ensureFixtureClient();

    // NOTA: a venda ja nasce confirmada e debita o deposito ACABADOS na
    // criacao (dual-write, Bloco 4) - o fixture global (scripts/
    // run-api-suite.cjs `ensureFixtures`) garante saldo generoso la para
    // TEST_PRODUCT_ID.
    const saleResponse = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customerId,
        items: [{ product_id: productId, quantity: 1, unit_price: 10 }],
      });

    if (saleResponse.status !== 201) {
      throw new Error(`Falha ao criar venda fixture: ${JSON.stringify(saleResponse.body)}`);
    }

    return saleResponse.body.data.id;
  }

  /**
   * Duas requisicoes simultaneas tentando cancelar a mesma venda confirmada
   * so podem resultar em um unico cancelamento efetivo (restaura estoque
   * apenas uma vez); a segunda deve falhar por transicao de status invalida.
   *
   * @returns Promise resolvida apos validacao HTTP.
   */
  it('impede cancelamento duplo de venda em concorrencia', async () => {
    const token = authToken();
    const saleId = await createConfirmedSale();

    const [first, second] = await Promise.allSettled([
      api().put(`/api/sales/${saleId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'canceled' }),
      api().put(`/api/sales/${saleId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'canceled' }),
    ]);

    const responses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value);

    const successCount = responses.filter((response) => response.status === 200).length;
    const failureCount = responses.filter((response) => [400, 409, 422].includes(response.status)).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);
  });
});
