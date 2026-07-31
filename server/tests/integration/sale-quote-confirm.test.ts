import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('F22 - Confirmacao de orcamento (quote -> confirmed)', () => {
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
        name: 'Cliente CI Orcamento',
        cpf_cnpj: FIXTURE_CNPJ,
        email: 'ci-sale-quote@evok.local',
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
   * @returns Quantidade em estoque do produto fixture usado no cronograma de testes.
   */
  async function getProductQuantity(productId: number): Promise<number> {
    const token = authToken();
    const response = await api()
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    if (response.status !== 200) {
      throw new Error(`Falha ao consultar produto fixture: ${JSON.stringify(response.body)}`);
    }

    return Number(response.body.data.quantity);
  }

  it('cria venda quote sem debitar estoque, depois confirma e debita o estoque so nesse momento', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const customerId = await ensureFixtureClient();

    const quantityBefore = await getProductQuantity(productId);

    const createResponse = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: customerId,
        items: [{ product_id: productId, quantity: 1, unit_price: 10 }],
        status: 'quote',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.status).toBe('quote');

    const saleId = createResponse.body.data.id;

    // Estoque nao pode ter mudado apenas por criar o orcamento.
    const quantityAfterQuote = await getProductQuantity(productId);
    expect(quantityAfterQuote).toBe(quantityBefore);

    const confirmResponse = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.data.status).toBe('confirmed');

    // So agora, na confirmacao, o estoque deve ter sido debitado.
    const quantityAfterConfirm = await getProductQuantity(productId);
    expect(quantityAfterConfirm).toBe(quantityBefore - 1);

    // Limpeza: cancela a venda para restaurar o estoque ao estado original
    // e nao deixar side effects entre rodadas de CI.
    await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'canceled' });
  });
});
