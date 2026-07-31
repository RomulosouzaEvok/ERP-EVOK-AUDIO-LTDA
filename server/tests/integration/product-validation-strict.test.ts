import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: validacao Zod estrita no modulo products', () => {
  /**
   * Regressao para um gap real encontrado em auditoria: `products` (o
   * modulo mais usado do sistema) nao tinha nenhuma validacao declarativa
   * (Zod) na criacao/atualizacao, diferente de sales/purchases/production/
   * inventory - qualquer payload malformado ou com campos desconhecidos
   * passava direto para a regra de negocio sem um 400 estruturado.
   *
   * @returns Promise resolvida apos validar 400 com campo desconhecido.
   */
  it('POST /api/products rejeita campo desconhecido com 400 estruturado', async () => {
    const token = authToken();

    const response = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Produto Teste Validacao',
        code: `VAL-${Date.now()}`,
        category_id: 1,
        unit: 'UN',
        price: 10,
        campo_que_nao_existe: 'valor malicioso',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  /**
   * @returns Promise resolvida apos validar 400 sem nome/codigo/preco.
   */
  it('POST /api/products rejeita payload sem campos obrigatorios', async () => {
    const token = authToken();

    const response = await api().post('/api/products').set('Authorization', `Bearer ${token}`).send({});

    expect(response.status).toBe(400);
  });

  /**
   * @returns Promise resolvida apos validar 400 com tipo invalido em movimento.
   */
  it('POST /api/products/movements rejeita tipo invalido', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const response = await api()
      .post('/api/products/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, type: 'invalido', quantity: 1 });

    expect(response.status).toBe(400);
  });
});
