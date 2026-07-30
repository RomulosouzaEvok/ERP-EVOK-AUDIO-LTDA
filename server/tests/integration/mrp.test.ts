/**
 * Teste de integracao para o fluxo MRP.
 *
 * @module tests/integration/mrp.test
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest'); // CommonJS for Jest/SWC compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const expressApp = require('../../app');

describe('MRP Integration Tests', () => {
  let authToken: string | undefined;

  beforeAll(async () => {
    if (process.env.RUN_INTEGRATION !== 'true') return;

    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminSeedPassword) throw new Error('[integration:mrp] ADMIN_SEED_PASSWORD ausente.');
    if (!jwtSecret || jwtSecret.length < 32) throw new Error('[integration:mrp] JWT_SECRET ausente ou muito curto.');

    const loginResponse = await request(expressApp)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: adminSeedPassword });

    const tokenFromBody = loginResponse.body?.data?.token ?? loginResponse.body?.token;
    if (!tokenFromBody) {
      throw new Error(`[integration:mrp] Falha no login. Response: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = tokenFromBody;
  });

  it('POST /api/mrp/plan - deve gerar ordens planejadas', async () => {
    if (process.env.RUN_INTEGRATION !== 'true' || !authToken) return;

    const response = await request(expressApp)
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        demands: [
          {
            item_id: '00000000-0000-0000-0000-000000000001',
            quantidade: 10,
            data_necessidade: '2026-08-15',
            origem: 'MANUAL',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
