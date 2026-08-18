import express from 'express';
import request from 'supertest';

jest.mock('../../src/config/logger', () => ({
  warn: jest.fn(),
}));

describe('CASE-007 login spraying guard', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('bloqueia e-mails diferentes vindos do mesmo IP quando a cota por IP de login estoura', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const logger = require('../../src/config/logger');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createLoginAttemptIpLimiter,
      loginAttemptLimiter,
    } = require('../../src/middlewares/rateLimitPolicy');

    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.post(
      '/login',
      createLoginAttemptIpLimiter(3),
      loginAttemptLimiter,
      (_req, res) => {
        res.status(204).end();
      },
    );

    const ip = '198.51.100.77';
    for (let index = 1; index <= 3; index += 1) {
      await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip)
        .send({ email: `spray${index}@example.com`, password: 'irrelevante' })
        .expect(204);
    }

    const blocked = await request(app)
      .post('/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'spray4@example.com', password: 'irrelevante' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'rate_limit_exceeded',
      expect.objectContaining({
        limiter: 'login_ip',
        keySource: 'ip',
        limit: 3,
        windowMs: 15 * 60 * 1000,
      }),
    );
  });
});
