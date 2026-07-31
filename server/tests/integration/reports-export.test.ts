import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Exportacao de relatorios (CSV/PDF) - regressao de contrato', () => {
  const token = () => authToken();

  /**
   * Sem `?format`, o contrato antigo (`{ success: true, data }`) continua
   * intacto - a migracao do modulo `reports` para Clean Architecture nao
   * pode ter mudado o formato default.
   *
   * @returns Promise resolvida apos validar o formato JSON.
   */
  it('GET /api/reports/inventory sem format retorna o JSON de sempre', async () => {
    const response = await api().get('/api/reports/inventory').set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.report_type).toBe('inventory');
    expect(response.body.data.summary).toHaveProperty('total_products');
  });

  /**
   * `?format=csv` retorna um CSV real (content-type + cabecalho esperado),
   * nao o JSON de sempre.
   *
   * @returns Promise resolvida apos validar o CSV.
   */
  it('GET /api/reports/inventory?format=csv retorna CSV com cabecalho esperado', async () => {
    const response = await api()
      .get('/api/reports/inventory')
      .query({ format: 'csv' })
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('relatorio-estoque.csv');
    expect(response.text).toContain('Código,Nome,Categoria,Quantidade,Custo unitário,Valor total');
  });

  /**
   * `?format=pdf` retorna um PDF binario valido (assinatura `%PDF-`).
   *
   * @returns Promise resolvida apos validar o PDF.
   */
  it('GET /api/reports/sales?format=pdf retorna um PDF valido', async () => {
    const response = await api()
      .get('/api/reports/sales')
      .query({ format: 'pdf' })
      .set('Authorization', `Bearer ${token()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('relatorio-vendas.pdf');
    expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  /**
   * Sem token, todos os formatos continuam exigindo autenticacao (RBAC nao
   * pode ter regredido na migracao).
   *
   * @returns Promise resolvida apos validar 401.
   */
  it('exige autenticacao mesmo com format=csv/pdf', async () => {
    const csvResponse = await api().get('/api/reports/customers').query({ format: 'csv' });
    expect(csvResponse.status).toBe(401);

    const pdfResponse = await api().get('/api/reports/customers').query({ format: 'pdf' });
    expect(pdfResponse.status).toBe(401);
  });
});
