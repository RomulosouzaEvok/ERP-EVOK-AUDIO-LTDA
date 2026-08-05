import jwt from 'jsonwebtoken';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Emite um token JWT diretamente (mesma técnica de
 * `rbac-module-access-denied.test.ts`), sem passar por `POST /api/auth/login`,
 * para evitar o `authLimiter` (10 tentativas/15min por IP) compartilhado com
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
 * Fecha o item de teste do Bloco D (`docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md`):
 * retrofit de `authorizeModule('manutencao', ...)` e `authorizeModule('garantia', ...)`
 * nas rotas de `maintenance` e `serviceOrders`, que antes usavam RBAC legado
 * por papel global (`authorize('admin', 'operator')`). Este arquivo exercita
 * fim-a-fim (Supertest + servidor + PostgreSQL reais) que um usuário cujo
 * `AccessProfile` não inclui o módulo correspondente recebe 403 em todos os
 * verbos, e que um admin (todos os módulos) segue autorizado.
 *
 * @returns Promise resolvida após validar 403 para usuário sem o módulo e
 * acesso íntegro para admin, nos módulos `manutencao` e `garantia`.
 */
describeIntegration('RBAC HTTP: manutencao e garantia sem o modulo recebem 403', () => {
  /**
   * Cria um usuário `operator` vinculado a um `AccessProfile` que só tem
   * permissão no módulo `vendas` (nunca `manutencao`/`garantia`) — reproduz
   * um usuário de outra área tentando acessar essas rotas.
   *
   * @returns Token JWT do usuário recém-criado.
   */
  async function createUserWithoutModule(): Promise<{ token: string }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now() + Math.floor(Math.random() * 1000);
    const profile = await AccessProfile.create({ nome: `Perfil Sem Manutencao Garantia ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'vendas', level: 'approve' });

    const email = `sem-manutencao-garantia-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Sem Manutencao Garantia',
      email,
      password: 'SenhaTeste123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return { token: mintToken(user) };
  }

  describe.each([
    { modulo: 'manutencao', basePath: '/api/maintenance' },
    { modulo: 'garantia', basePath: '/api/service-orders' },
  ])('modulo $modulo ($basePath)', ({ basePath }) => {
    it(`GET ${basePath} retorna 403 MODULE_ACCESS_DENIED, sem vazar dados`, async () => {
      const { token } = await createUserWithoutModule();

      const response = await api().get(basePath).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
      expect(response.body.data).toBeUndefined();
    });

    it(`POST ${basePath} retorna 403 MODULE_ACCESS_DENIED, sem criar o recurso`, async () => {
      const { token } = await createUserWithoutModule();

      const response = await api()
        .post(basePath)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
      expect(response.body.data).toBeUndefined();
    });

    it(`PUT ${basePath}/:id retorna 403 MODULE_ACCESS_DENIED, sem alterar o recurso`, async () => {
      const { token } = await createUserWithoutModule();

      const response = await api()
        .put(`${basePath}/1`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    });

    it(`DELETE ${basePath}/:id retorna 403 MODULE_ACCESS_DENIED, sem remover o recurso`, async () => {
      const { token } = await createUserWithoutModule();

      const response = await api().delete(`${basePath}/1`).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    });

    it(`GET ${basePath} com token admin nao recebe 403 (modulo autorizado)`, async () => {
      const adminToken = authToken();

      const response = await api().get(basePath).set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).not.toBe(403);
    });
  });
});
