jest.mock('../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
  },
}));

import express from 'express';
import request from 'supertest';

describe('health routes', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function buildApp() {
    const healthRouter = require('../../src/routes/health');
    const app = express();
    app.use('/health', healthRouter);
    return app;
  }

  it('retorna liveness com status 200', async () => {
    const app = buildApp();
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('version');
  });

  it('retorna readiness 200 quando o banco autentica', async () => {
    const { sequelize } = require('../../src/config/database');
    sequelize.authenticate.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('retorna readiness 503 quando o banco falha', async () => {
    const { sequelize } = require('../../src/config/database');
    sequelize.authenticate.mockRejectedValueOnce(new Error('db down'));

    const app = buildApp();
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('not_ready');
  });
});
