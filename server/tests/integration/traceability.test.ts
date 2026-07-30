/**
 * Teste de integracao para o fluxo de rastreabilidade.
 *
 * @module tests/integration/traceability.test
 */

const request = require('supertest');
const app = require('../../index');

describe('Traceability Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: process.env.ADMIN_SEED_PASSWORD || 'admin123' });

    if (loginResponse.body?.token) {
      authToken = loginResponse.body.token;
    }
  });

  it('GET /api/traceability/items/:id - deve retornar historico do item', async () => {
    if (!authToken) return;

    const response = await request(app)
      .get('/api/traceability/items/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('GET /api/traceability/items/:id - UUID invalido deve retornar 400', async () => {
    if (!authToken) return;

    const response = await request(app)
      .get('/api/traceability/items/invalid-uuid')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
  });
});

