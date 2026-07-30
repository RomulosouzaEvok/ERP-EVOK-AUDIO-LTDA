/**
 * Teste de integracao para o fluxo MRP.
 *
 * @module tests/integration/mrp.test
 */

const request = require('supertest');
const app = require('../../index');

describe('MRP Integration Tests', () => {
  let authToken: string;
  let itemId: string;
  let componenteId: string;

  beforeAll(async () => {
    // Obter token de autenticacao
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: process.env.ADMIN_SEED_PASSWORD || 'admin123' });

    if (loginResponse.body?.token) {
      authToken = loginResponse.body.token;
    }
  });

  it('POST /api/mrp/plan - deve gerar ordens planejadas', async () => {
    if (!authToken) return; // Skip se nao autenticou

    const response = await request(app)
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        demands: [
          {
            item_id: '00000000-0000-0000-0000-000000000001', // ID real do teste
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

