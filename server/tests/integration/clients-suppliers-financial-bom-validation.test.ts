import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: validacao Zod estrita em clients/suppliers/financial/bom', () => {
  /**
   * Gap real encontrado em auditoria: `clients`, `suppliers`, `financial` e
   * `bom` nao tinham nenhuma validacao declarativa, diferente do resto do
   * sistema. Cada teste abaixo confirma que campo desconhecido/payload
   * invalido agora retorna 400 estruturado, sem derrubar o processo.
   *
   * @returns Promise resolvida apos validar 400 em clients.
   */
  it('POST /api/clients rejeita campo desconhecido', async () => {
    const token = authToken();
    const response = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Teste', cpf_cnpj: '00000000000', campo_invalido: true });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });

  /** @returns Promise resolvida apos validar 400 em suppliers. */
  it('POST /api/suppliers rejeita payload sem cnpj', async () => {
    const token = authToken();
    const response = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Fornecedor Teste' });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });

  /** @returns Promise resolvida apos validar 400 em financial. */
  it('POST /api/finance/payable rejeita valor negativo', async () => {
    const token = authToken();
    const response = await api()
      .post('/api/finance/payable')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Conta teste', amount: -10, due_date: '2026-12-31' });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });

  /** @returns Promise resolvida apos validar 400 em bom. */
  it('POST /api/engineering/bom rejeita item sem quantity', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const response = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: productId, items: [{ component_product_id: productId }] });

    expect(response.status).toBe(400);

    const health = await api().get('/health/ready');
    expect(health.status).toBe(200);
  });

  /**
   * Confirma que payloads validos ainda funcionam normalmente nos 4
   * modulos (a validacao nao pode ter quebrado o caminho feliz).
   *
   * @returns Promise resolvida apos validar 201 em clients e suppliers.
   */
  it('payloads validos continuam funcionando em clients e suppliers', async () => {
    const token = authToken();

    const client = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Cliente Valido ${Date.now()}`, cpf_cnpj: '11144477735' });
    expect([201, 409]).toContain(client.status);

    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: `Fornecedor Valido ${Date.now()}`, cnpj: '11444777000161' });
    expect([201, 409]).toContain(supplier.status);
  });
});
