import jwt from 'jsonwebtoken';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Emite um token JWT diretamente (mesma tecnica de `scripts/run-api-suite.cjs`
 * para o token admin), sem passar por `POST /api/auth/login`. Este arquivo
 * cria varios usuarios com perfis distintos; usar o endpoint de login para
 * cada um esbarraria no `authLimiter` (10 tentativas/15min por IP,
 * `server/app.ts`), que ja e consumido por outras suites de integracao no
 * mesmo processo/janela de 15 minutos. Como o middleware `authenticate`
 * apenas verifica assinatura/issuer/audience e recarrega o usuario do banco
 * a cada request (nunca confia em claims de perfil no token), este atalho
 * exercita exatamente o mesmo caminho de autorizacao (`authorizeModule`)
 * que um token emitido via login real.
 *
 * @param user - Usuario (`id`, `passwordVersion` opcional) para o qual emitir o token.
 * @returns Token JWT valido por 1 hora.
 */
function mintToken(user: { id: number; passwordVersion?: number | null }): string {
  const { secret } = getJwtRuntimeConfig();
  return jwt.sign({ id: user.id, passwordVersion: user.passwordVersion ?? 1 }, secret, {
    expiresIn: '1h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

/**
 * Fecha o item pendente do Bloco 1 (`docs/governance/TODO.md`, Bloco 1.5):
 * "Teste de integracao (HTTP, com Supertest): usuario com perfil sem modulo
 * X -> GET/POST/PUT/DELETE no modulo X retornam 403, corpo sem vazamento de
 * dados". A cobertura anterior (`access-profiles.test.ts`) exercitava o
 * middleware `authorizeModule` isoladamente (unitario, com mocks); este
 * arquivo fecha o gap fim-a-fim contra a API HTTP real (Supertest + servidor
 * + PostgreSQL reais, via `scripts/run-api-suite.cjs`), usando o modulo
 * `produtos` (rotas `server/src/modules/products/presentation/routes/products.ts`)
 * como representante, ja que ele expoe GET/POST/PUT/DELETE reais para os
 * quatro verbos exigidos pelo item.
 *
 * @returns Promise resolvida apos validar 403 em GET/POST/PUT/DELETE de
 * `/api/products*` para um usuario cujo perfil de acesso nao inclui o
 * modulo `produtos`, e que o corpo de erro nao vaza dados do recurso.
 */
describeIntegration('RBAC HTTP: usuario sem o modulo X recebe 403 em todos os verbos', () => {
  /**
   * Cria um usuario `operator` vinculado a um `AccessProfile` que so tem
   * permissao no modulo `vendas` (nunca `produtos`) — reproduz o caso real
   * de um vendedor tentando acessar o modulo de Produtos, ao qual seu
   * perfil nao da acesso.
   *
   * @returns Token JWT do usuario recem-criado.
   */
  async function createUserWithoutProductsModule(): Promise<{ token: string; email: string }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now();
    const profile = await AccessProfile.create({ nome: `Vendedor Sem Produtos ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'vendas', level: 'approve' });

    const email = `vendedor-sem-produtos-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Vendedor Sem Produtos',
      email,
      password: 'SenhaVendedor123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return { token: mintToken(user), email };
  }

  it('GET /api/products retorna 403 MODULE_ACCESS_DENIED, sem vazar lista de produtos', async () => {
    const { token } = await createUserWithoutProductsModule();

    const response = await api().get('/api/products').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('POST /api/products retorna 403 MODULE_ACCESS_DENIED, sem criar o recurso', async () => {
    const { token } = await createUserWithoutProductsModule();
    const suffix = Date.now();

    const response = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Produto RBAC 403 ${suffix}`, code: `RBAC-403-${suffix}`, price: 10, cost_price: 5 });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();

    const adminToken = authToken();
    const shouldNotExist = await api()
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: `RBAC-403-${suffix}` });
    expect(shouldNotExist.status).toBe(200);
    const created = shouldNotExist.body.data.find((p: any) => p.code === `RBAC-403-${suffix}`);
    expect(created).toBeUndefined();
  });

  it('PUT /api/products/:id retorna 403 MODULE_ACCESS_DENIED, sem alterar o recurso', async () => {
    const adminToken = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const before = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(before.status).toBe(200);
    const originalName = before.body.data.name;

    const { token } = await createUserWithoutProductsModule();
    const response = await api()
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tentativa Nao Autorizada RBAC' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');

    const after = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.data.name).toBe(originalName);
  });

  it('DELETE /api/products/:id retorna 403 MODULE_ACCESS_DENIED, sem remover o recurso', async () => {
    const adminToken = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const { token } = await createUserWithoutProductsModule();
    const response = await api().delete(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');

    const stillThere = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(stillThere.status).toBe(200);
  });
});
