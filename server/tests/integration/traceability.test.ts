/**
 * Teste de integracao para o fluxo de rastreabilidade.
 *
 * @module tests/integration/traceability.test
 */

describe('Traceability Integration Tests', () => {
  let authToken: string | undefined;

  beforeAll(async () => {
    if (process.env.RUN_INTEGRATION !== 'true') return;

    const request = require('supertest'); // eslint-disable-line @typescript-eslint/no-var-requires
    const expressApp = require('../../app'); // eslint-disable-line @typescript-eslint/no-var-requires

    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminSeedPassword) throw new Error('[integration:traceability] ADMIN_SEED_PASSWORD ausente.');
    if (!jwtSecret || jwtSecret.length < 32) throw new Error('[integration:traceability] JWT_SECRET ausente ou muito curto.');

    const loginResponse = await request(expressApp)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: adminSeedPassword });

    const tokenFromBody = loginResponse.body?.data?.token ?? loginResponse.body?.token;
    if (!tokenFromBody) {
      throw new Error(`[integration:traceability] Falha no login. Response: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = tokenFromBody;
  });

  it('GET /api/traceability/items/:id - deve retornar historico do item', async () => {
    if (process.env.RUN_INTEGRATION !== 'true' || !authToken) return;

    const request = require('supertest'); // eslint-disable-line @typescript-eslint/no-var-requires
    const expressApp = require('../../app'); // eslint-disable-line @typescript-eslint/no-var-requires

    const response = await request(expressApp)
      .get('/api/traceability/items/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('GET /api/traceability/items/:id - UUID invalido deve retornar 400', async () => {
    if (process.env.RUN_INTEGRATION !== 'true' || !authToken) return;

    const request = require('supertest'); // eslint-disable-line @typescript-eslint/no-var-requires
    const expressApp = require('../../app'); // eslint-disable-line @typescript-eslint/no-var-requires

    const response = await request(expressApp)
      .get('/api/traceability/items/invalid-uuid')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body?.success).toBe(false);
  });
});
