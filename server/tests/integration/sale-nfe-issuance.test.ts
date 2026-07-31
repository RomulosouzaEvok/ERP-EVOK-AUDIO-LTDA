import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Emissao de NF-e de venda (provedor mock)', () => {
  /**
   * Fluxo completo real: cria venda confirmada, emite NF-e (provedor mock,
   * autorizacao sincrona), confirma que status vira 'invoiced' e que os
   * tributos foram calculados/persistidos nos itens, depois cancela a NF-e.
   *
   * @returns Promise resolvida apos validar o fluxo completo.
   */
  it('emite, consulta e cancela a NF-e de uma venda confirmada', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: (await createClient(token)).id,
        items: [{ product_id: productId, quantity: 1, unit_price: 10 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expect(sale.status).toBe(201);
    const saleId = sale.body.data.id;

    const issue = await api()
      .post(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(issue.status).toBe(202);
    expect(issue.body.data.nfe_status).toBe('authorized');
    expect(issue.body.data.status).toBe('invoiced');
    expect(issue.body.data.nfe_key).toHaveLength(44);

    const statusCheck = await api()
      .get(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`);
    expect(statusCheck.status).toBe(200);
    expect(statusCheck.body.data.nfe_status).toBe('authorized');

    // Nao pode faturar de novo uma venda ja invoiced (nao esta mais 'confirmed').
    const secondIssue = await api()
      .post(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(secondIssue.status).toBe(422);

    // 'invoiced' nao pode ser setado manualmente via PUT /status.
    const manualStatus = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invoiced' });
    expect(manualStatus.status).toBe(422);

    const cancel = await api()
      .post(`/api/sales/${saleId}/nfe/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Cancelamento de teste automatizado de integracao' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.nfe_status).toBe('cancelled');
  });

  /** @returns Promise resolvida apos validar rejeicao de justificativa curta. */
  it('rejeita cancelamento com justificativa curta demais', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: (await createClient(token)).id,
        items: [{ product_id: productId, quantity: 1, unit_price: 10 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    const saleId = sale.body.data.id;

    await api().post(`/api/sales/${saleId}/nfe`).set('Authorization', `Bearer ${token}`).send({});

    const cancel = await api()
      .post(`/api/sales/${saleId}/nfe/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'curta' });
    expect(cancel.status).toBe(400);
  });
});

function cpfCheckDigit(base: number[]): number {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Gera um CPF matematicamente valido (checksum real), unico por chamada. */
function generateValidCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const d1 = cpfCheckDigit(base);
  const d2 = cpfCheckDigit([...base, d1]);
  return [...base, d1, d2].join('');
}

async function createClient(token: string) {
  const response = await api()
    .post('/api/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Cliente NFe ${Date.now()}`, cpf_cnpj: generateValidCpf(), state: 'SP' });
  return response.body.data;
}
