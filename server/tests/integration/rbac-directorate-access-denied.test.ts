import jwt from 'jsonwebtoken';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Emite um token JWT diretamente (mesma técnica de
 * `rbac-maintenance-service-orders-access-denied.test.ts`), sem passar por
 * `POST /api/auth/login`, para evitar o `authLimiter` compartilhado com
 * outras suítes de integração no mesmo processo.
 *
 * @param user - Usuário (`id`, `passwordVersion` opcional) para o qual emitir o token.
 * @returns Token JWT válido por 1 hora.
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
 * Achado de auditoria de QA (2026-08-12): os testes de integração do módulo
 * `directorate/` (organograma, planejamento estratégico, atas, riscos)
 * cobrem o caminho feliz e as validações de payload, mas nenhum verifica que
 * um usuário SEM o módulo `diretoria` é barrado. Esta suíte fecha essa
 * lacuna, no mesmo padrão já usado para `manutencao`/`garantia`.
 *
 * @returns Promise resolvida após validar 403 para usuário sem o módulo
 * `diretoria` em todas as rotas de escrita, e acesso íntegro para admin.
 */
describeIntegration('RBAC HTTP: diretoria sem o modulo recebe 403', () => {
  /**
   * Cria um usuário `operator` vinculado a um `AccessProfile` que só tem
   * permissão no módulo `vendas` (nunca `diretoria`) — reproduz um usuário
   * de outra área tentando escrever em planejamento estratégico, atas ou
   * riscos corporativos.
   *
   * @returns Token JWT do usuário recém-criado.
   */
  async function createUserWithoutDiretoria(): Promise<{ token: string }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now() + Math.floor(Math.random() * 1000);
    const profile = await AccessProfile.create({ nome: `Perfil Sem Diretoria ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'vendas', level: 'approve' });

    const email = `sem-diretoria-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Sem Diretoria',
      email,
      password: 'SenhaTeste123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return { token: mintToken(user) };
  }

  it('GET /api/directorate/org-chart NAO recebe 403 mesmo sem o modulo diretoria (por desenho — unica rota liberada a qualquer usuario, ver comentario em directorate.ts)', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api().get('/api/directorate/org-chart').set('Authorization', `Bearer ${token}`);

    expect(response.status).not.toBe(403);
  });

  it('GET /api/directorate/strategic-plannings retorna 403 MODULE_ACCESS_DENIED', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api().get('/api/directorate/strategic-plannings').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('POST /api/directorate/strategic-plannings retorna 403, sem criar o plano', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api()
      .post('/api/directorate/strategic-plannings')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('POST /api/directorate/meeting-minutes retorna 403, sem criar a ata', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api()
      .post('/api/directorate/meeting-minutes')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('POST /api/directorate/business-risks retorna 403, sem criar o risco', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api()
      .post('/api/directorate/business-risks')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('PATCH /api/directorate/directorates/:id/manager retorna 403, sem atribuir gerente', async () => {
    const { token } = await createUserWithoutDiretoria();

    const response = await api()
      .patch('/api/directorate/directorates/1/manager')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
  });

  it('GET /api/directorate/org-chart com token admin nao recebe 403 (modulo autorizado)', async () => {
    const adminToken = authToken();

    const response = await api().get('/api/directorate/org-chart').set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).not.toBe(403);
  });
});
