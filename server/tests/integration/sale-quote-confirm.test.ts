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
   * @param productId - Produto fixture.
   * @returns Saldo total e quantidade reservada do produto.
   */
  async function getProductStock(productId: number): Promise<{ quantity: number; reserved: number }> {
    const token = authToken();
    const response = await api()
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    if (response.status !== 200) {
      throw new Error(`Falha ao consultar produto fixture: ${JSON.stringify(response.body)}`);
    }

    return {
      quantity: Number(response.body.data.quantity),
      reserved: Number(response.body.data.reserved_quantity),
    };
  }

  /**
   * F22 (orcamento) + **G9** (2026-08-10).
   *
   * O que este teste afirmava ate hoje — "confirmar DEBITA o estoque" — era
   * o comportamento antigo, e ele estava errado do ponto de vista fiscal: dar
   * saida de mercadoria que ainda esta fisicamente na empresa contraria o
   * Ajuste SINIEF 07/05, clausula 9ª §1º (a mercadoria so transita depois da
   * autorizacao de uso da NF-e). Com o G9, confirmar **RESERVA** (o material
   * fica comprometido, indisponivel para outro pedido, mas continua no
   * saldo) e a baixa acontece na autorizacao da NF-e, proporcional ao que
   * foi faturado.
   *
   * O teste foi corrigido para medir os dois numeros que agora contam:
   * `quantity` (nao pode mudar) e `reserved_quantity` (tem que subir).
   */
  it('cria venda quote sem reservar estoque, depois confirma e so entao reserva (sem baixar o saldo)', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const customerId = await ensureFixtureClient();

    // NOTA: reserva NAO movimenta deposito (G9) — o dual-write por deposito
    // acontece so no faturamento. O fixture global (scripts/run-api-suite.cjs
    // `ensureFixtures`) garante saldo generoso para TEST_PRODUCT_ID.
    const before = await getProductStock(productId);

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

    // Nem saldo nem reserva podem mudar apenas por criar o orcamento.
    const afterQuote = await getProductStock(productId);
    expect(afterQuote.quantity).toBe(before.quantity);
    expect(afterQuote.reserved).toBe(before.reserved);

    const confirmResponse = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.data.status).toBe('confirmed');

    // So agora, na confirmacao, o material fica comprometido — RESERVADO,
    // nao baixado (a baixa e na autorizacao da NF-e, G9).
    const afterConfirm = await getProductStock(productId);
    expect(afterConfirm.quantity).toBe(before.quantity);
    expect(afterConfirm.reserved).toBe(before.reserved + 1);

    // Limpeza: cancela a venda para liberar a reserva e nao deixar side
    // effects entre rodadas de CI.
    await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'canceled' });

    const afterCancel = await getProductStock(productId);
    expect(afterCancel.quantity).toBe(before.quantity);
    expect(afterCancel.reserved).toBe(before.reserved);
  });
});
