import request from 'supertest';

const authModulePath = '../../src/middlewares/auth';
const useCaseModulePath = '../../src/modules/fiscal/application/use-cases/GetBlocoKPreviewUseCase';
const routeModulePath = '../../src/modules/fiscal/presentation/routes/blocoK';

function createAuthMock() {
  const authenticate = (req, res, next) => {
    const roleHeader = req.headers['x-test-role'];

    if (!roleHeader) {
      res.status(401).json({ success: false, error: 'Token nao fornecido' });
      return;
    }

    req.user = { id: 1, role: roleHeader, permissions: {}, accessProfileId: 1, accessProfileName: 'Perfil CI' };
    next();
  };

  const actual = jest.requireActual(authModulePath);
  return { ...actual, authenticate };
}

function buildApp() {
  jest.resetModules();

  const preview = {
    report_type: 'bloco-k-preview',
    generated_at: new Date('2026-08-18T12:00:00.000Z'),
    period: { start_date: '2026-08-01', end_date: '2026-08-31' },
    is_reference_only: true,
    disclaimer: 'Preview referencial; nao e o arquivo oficial do SPED.',
    summary: { k200_count: 1, k230_count: 1, k235_count: 1, k280_count: 0 },
    k200: [
      {
        product_code: 'P-001',
        product_name: 'Produto A',
        unit: 'un',
        quantity_global: 10,
        quantity_by_warehouse: 8,
        quantity_available_in_lots: 5,
        lots_count: 2,
      },
    ],
    k230: [
      {
        order_number: 'OP-001',
        product_code: 'P-001',
        product_name: 'Produto A',
        planned_quantity: 10,
        quantity_produced: 9,
        quantity_scrapped: 1,
        status: 'completed',
        completion_date: '2026-08-12',
        production_route_id: 7,
      },
    ],
    k235: [
      {
        order_number: 'OP-001',
        product_code: 'C-001',
        product_name: 'Componente A',
        lot_number: 'LOT-001',
        quantity_consumed: 4,
        consumed_at: '2026-08-12T10:00:00.000Z',
        user_id: 9,
      },
    ],
    k280: [],
  };

  const useCaseMock = {
    execute: jest.fn().mockResolvedValue(preview),
  };

  jest.doMock(authModulePath, () => createAuthMock());
  jest.doMock(useCaseModulePath, () => jest.fn(() => useCaseMock));

  let expressModule: any;
  let routeModule: any;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expressModule = require('express');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    routeModule = require(routeModulePath);
  });

  const app = expressModule();
  app.use(expressModule.json());
  app.use('/api/fiscal/bloco-k', routeModule);
  return { app, useCaseMock };
}

describe('bloco-k route', () => {
  jest.setTimeout(30_000);

  it('exige autenticacao e papel de admin', async () => {
    const { app } = buildApp();

    const unauthenticated = await request(app).get('/api/fiscal/bloco-k/');
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/fiscal/bloco-k/')
      .set('x-test-role', 'operator');
    expect(forbidden.status).toBe(403);
  });

  it('entrega JSON e CSV com preview referencial e flatten real do controller', async () => {
    const { app, useCaseMock } = buildApp();

    const jsonResponse = await request(app)
      .get('/api/fiscal/bloco-k/')
      .query({ start_date: '2026-08-01', end_date: '2026-08-31' })
      .set('x-test-role', 'admin');
    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.body.success).toBe(true);
    expect(jsonResponse.body.data.is_reference_only).toBe(true);
    expect(jsonResponse.body.data.disclaimer).toContain('Preview referencial');
    expect(useCaseMock.execute).toHaveBeenCalledTimes(1);

    const csvResponse = await request(app)
      .get('/api/fiscal/bloco-k/')
      .query({ start_date: '2026-08-01', end_date: '2026-08-31' })
      .query({ format: 'csv' })
      .set('x-test-role', 'admin');
    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers['content-type']).toContain('text/csv');
    expect(csvResponse.text).toContain('is_reference_only');
    expect(csvResponse.text).toContain('Preview referencial; nao e o arquivo oficial do SPED.');
    expect(csvResponse.text).toContain('K200');
    expect(csvResponse.text).toContain('K230');
    expect(csvResponse.text).toContain('K235');
    expect(csvResponse.text).not.toContain('K280,adjustment,true');
  });
});
