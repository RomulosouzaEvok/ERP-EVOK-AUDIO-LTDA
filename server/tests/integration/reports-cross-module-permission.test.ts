import jwt from 'jsonwebtoken';

import { api, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Emite um token JWT diretamente (mesma tecnica de `scripts/run-api-suite.cjs`
 * para o token admin), sem passar por `POST /api/auth/login` — evita
 * consumir o `authLimiter` (10 tentativas/15min por IP, `server/app.ts`)
 * compartilhado com as demais suites de integracao no mesmo processo. O
 * middleware `authenticate` recarrega o usuario/perfil do banco a cada
 * request (nunca confia em claims do token), entao o caminho de autorizacao
 * exercitado e identico ao de um token emitido via login real.
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
 * "Teste: Relatorio cruzado exige sub-permissao propria, nao herdada de
 * modulos isolados (UC-38)".
 *
 * As rotas de `server/src/modules/reports/presentation/routes/reports.ts`
 * mapeiam cada relatorio para uma sub-permissao dedicada da matriz
 * (`relatorios.producao`, `relatorios.compras`, `relatorios.custos`,
 * `relatorios.financeiro`) — nenhuma delas e liberada por interseccao
 * automatica com as demais (`BUSINESS_RULES.md` §6.2). Este teste confirma
 * que um usuario com `relatorios.producao` (e nao `relatorios.custos`)
 * consegue `/api/reports/production` mas recebe 403 em
 * `/api/reports/cost-variance`, mesmo tendo acesso a outro sub-relatorio.
 *
 * @returns Promise resolvida apos validar a segregacao de sub-permissoes de
 * relatorio.
 */
describeIntegration('Relatorios cruzados exigem sub-permissao propria (UC-38, relatorios.*)', () => {
  /**
   * Cria um usuario `operator` cujo perfil possui APENAS
   * `relatorios.producao` (nunca `relatorios.custos`, `relatorios.compras`
   * ou `relatorios.financeiro`) — reproduz o caso real de um analista de
   * PCP com acesso ao relatorio de producao, mas sem acesso ao relatorio de
   * custos (area sensivel/financeira).
   *
   * @returns Token JWT do usuario recem-criado.
   */
  async function createUserWithProductionReportOnly(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now();
    const profile = await AccessProfile.create({ nome: `Analista PCP Relatorios ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'relatorios.producao', level: 'operate' });

    const email = `analista-pcp-relatorios-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Analista PCP Relatorios',
      email,
      password: 'SenhaAnalistaPcp123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return mintToken(user);
  }

  it('usuario com relatorios.producao acessa /api/reports/production normalmente', async () => {
    const token = await createUserWithProductionReportOnly();

    const response = await api().get('/api/reports/production').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('mesmo usuario recebe 403 em /api/reports/cost-variance (sub-permissao nao herdada)', async () => {
    const token = await createUserWithProductionReportOnly();

    const response = await api().get('/api/reports/cost-variance').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.data).toBeUndefined();
  });

  it('mesmo usuario tambem recebe 403 em /api/reports/purchasing e /api/reports/sales (outras sub-permissoes)', async () => {
    const token = await createUserWithProductionReportOnly();

    const purchasing = await api().get('/api/reports/purchasing').set('Authorization', `Bearer ${token}`);
    expect(purchasing.status).toBe(403);
    expect(purchasing.body.error.code).toBe('MODULE_ACCESS_DENIED');

    const sales = await api().get('/api/reports/sales').set('Authorization', `Bearer ${token}`);
    expect(sales.status).toBe(403);
    expect(sales.body.error.code).toBe('MODULE_ACCESS_DENIED');
  });
});
