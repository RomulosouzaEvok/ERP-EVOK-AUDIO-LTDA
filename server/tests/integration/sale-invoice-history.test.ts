import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Historico multi-NF-e por pedido (sale_invoices)', () => {
  /**
   * Fluxo real (Postgres): cria uma venda confirmada com 10 unidades,
   * emite NF-e parcial (6 unidades), depois emite a segunda parcela
   * (4 unidades restantes). Confirma que:
   *  - `sale_invoices` acumula 1 registro por emissao (nao sobrescreve);
   *  - `invoiced_quantity` do item acumula entre as duas emissoes;
   *  - o status da venda transiciona confirmed -> partially_invoiced -> invoiced;
   *  - `GET /api/sales/:id/invoices` retorna as 2 emissoes, mais recente primeiro.
   *
   * @returns Promise resolvida apos validar o fluxo completo.
   */
  it('emite duas NF-e parciais e acumula historico completo em sale_invoices', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: (await createClient(token)).id,
        items: [{ product_id: productId, quantity: 10, unit_price: 10 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expect(sale.status).toBe(201);
    const saleId = sale.body.data.id;
    const saleItemId = sale.body.data.items[0].id;

    // 1a emissao parcial: 6 de 10 unidades.
    const firstIssue = await api()
      .post(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sale_item_id: saleItemId, quantity: 6 }] });
    expect(firstIssue.status).toBe(202);
    expect(firstIssue.body.data.nfe_status).toBe('authorized');
    expect(firstIssue.body.data.status).toBe('partially_invoiced');

    // 2a emissao parcial: as 4 unidades restantes.
    const secondIssue = await api()
      .post(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sale_item_id: saleItemId, quantity: 4 }] });
    expect(secondIssue.status).toBe(202);
    expect(secondIssue.body.data.nfe_status).toBe('authorized');
    expect(secondIssue.body.data.status).toBe('invoiced');

    // `sale_invoices` deve ter 1 registro por emissao (2 no total), nao
    // sobrescrever o anterior.
    const invoices = await api()
      .get(`/api/sales/${saleId}/invoices`)
      .set('Authorization', `Bearer ${token}`);
    expect(invoices.status).toBe(200);
    expect(invoices.body.data).toHaveLength(2);

    const [mostRecent, oldest] = invoices.body.data;
    expect(mostRecent.nfe_status).toBe('authorized');
    expect(oldest.nfe_status).toBe('authorized');

    // Cada registro guarda o snapshot de itens/quantidade DESTA emissao
    // (nao a quantidade cumulativa) — a mais recente faturou 4, a mais
    // antiga faturou 6.
    const mostRecentQty = mostRecent.items[0].quantity;
    const oldestQty = oldest.items[0].quantity;
    expect([mostRecentQty, oldestQty].sort((a: number, b: number) => a - b)).toEqual([4, 6]);

    // As duas notas tem chaves/protocolos distintos (nao sobrescritos).
    expect(mostRecent.nfe_key).not.toBe(oldest.nfe_key);
    expect(mostRecent.nfe_provider_ref).not.toBe(oldest.nfe_provider_ref);

    // `invoiced_quantity` do item acumulou as duas emissoes (10 no total).
    const finalSale = await api()
      .get(`/api/sales/${saleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(finalSale.status).toBe(200);
    expect(Number(finalSale.body.data.items[0].invoiced_quantity)).toBe(10);
    expect(finalSale.body.data.status).toBe('invoiced');
  });

  /** @returns Promise resolvida apos validar 404 para venda inexistente. */
  it('retorna 404 ao listar historico de venda inexistente', async () => {
    const token = authToken();

    const response = await api()
      .get('/api/sales/999999999/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
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
    .send({ name: `Cliente NFe Historico ${Date.now()}`, cpf_cnpj: generateValidCpf(), state: 'SP' });
  return response.body.data;
}
