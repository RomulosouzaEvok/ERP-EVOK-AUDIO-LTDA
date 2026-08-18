import express from 'express';
import request from 'supertest';

import requestIdMiddleware from '../../src/middlewares/requestId';

describe('requestIdMiddleware', () => {
  function buildApp() {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/ping', (req, res) => {
      res.json({ requestId: req.requestId });
    });
    return app;
  }

  it('gera X-Request-Id quando o header nao e informado', async () => {
    const app = buildApp();

    const response = await request(app).get('/ping');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.body.requestId).toEqual(response.headers['x-request-id']);
  });

  it('preserva X-Request-Id recebido no header', async () => {
    const app = buildApp();

    const response = await request(app)
      .get('/ping')
      .set('x-request-id', 'req-123');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-123');
    expect(response.body.requestId).toBe('req-123');
  });
});
