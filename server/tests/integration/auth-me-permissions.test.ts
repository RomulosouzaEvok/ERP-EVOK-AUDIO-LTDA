import jwt from 'jsonwebtoken';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
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
 * "Teste: Dashboard retorna apenas cards dos modulos do perfil (UC-38)".
 *
 * Reinterpretacao deliberada do item: "Dashboard retorna apenas cards dos
 * modulos do perfil" e comportamento de RENDERIZACAO do frontend
 * (`client/src/pages/DashboardPage.tsx`, filtragem via `canSee`/
 * `hasModuleAccess` sobre o mapa vindo de `GET /api/auth/me/permissions`) —
 * nao existe hoje nenhum teste de componente para essa tela em
 * `client/src/pages/**\/*.test.tsx` (apenas `LoginPage.test.tsx`), e um
 * teste de integracao HTTP nao consegue exercitar renderizacao de React.
 *
 * A interpretacao mais fiel ao objetivo do item, em nivel de integracao
 * backend, e confirmar o CONTRATO que o Dashboard consome para decidir quais
 * cards mostrar: `GET /api/auth/me/permissions` (UC-34,
 * `server/src/modules/auth/application/use-cases/GetMyPermissionsUseCase.ts`)
 * deve devolver EXATAMENTE o mapa module->nivel do perfil do usuario
 * autenticado — nem mais, nem menos modulos do que os atribuidos — pois e
 * esse mapa que o Dashboard usa para filtrar os cards exibidos.
 *
 * @returns Promise resolvida apos validar o payload de `GET
 * /api/auth/me/permissions` para um usuario com perfil restrito e para o
 * usuario `admin` (que deve receber o catalogo completo em nivel
 * `approve`).
 */
describeIntegration('GET /api/auth/me/permissions — contrato consumido pelo Dashboard (UC-34/UC-38)', () => {
  it('usuario com perfil restrito recebe APENAS os modulos atribuidos ao seu perfil', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now();
    const profile = await AccessProfile.create({ nome: `Dashboard Restrito ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'vendas', level: 'approve' });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'clientes', level: 'operate' });

    const email = `dashboard-restrito-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Dashboard Restrito',
      email,
      password: 'SenhaDashboard123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    const token = mintToken(user);

    const response = await api().get('/api/auth/me/permissions').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.modules).toEqual({ vendas: 'approve', clientes: 'operate' });
    // Modulos NAO atribuidos ao perfil nao podem aparecer no mapa (senao o
    // Dashboard mostraria cards indevidos).
    expect(response.body.data.modules.produtos).toBeUndefined();
    expect(response.body.data.modules.financeiro).toBeUndefined();
    expect(response.body.data.modules.qualidade).toBeUndefined();
    expect(response.body.data.profile).toEqual({ id: profile.id, nome: profile.nome });
  });

  it('usuario sem access_profile_id recebe mapa de modulos vazio (nenhum card no Dashboard)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../../src/models/index');

    const suffix = Date.now();
    const email = `dashboard-sem-perfil-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Dashboard Sem Perfil',
      email,
      password: 'SenhaDashboard123456!',
      role: 'operator',
      active: true,
      accessProfileId: null,
    });

    const token = mintToken(user);

    const response = await api().get('/api/auth/me/permissions').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.modules).toEqual({});
    expect(response.body.data.profile).toBeNull();
  });

  it('admin global recebe o catalogo completo de modulos em nivel approve (todos os cards)', async () => {
    const token = authToken();

    const response = await api().get('/api/auth/me/permissions').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.modules.produtos).toBe('approve');
    expect(response.body.data.modules.vendas).toBe('approve');
    expect(response.body.data.modules.qualidade).toBe('approve');
    expect(response.body.data.modules.financeiro).toBe('approve');
    expect(Object.keys(response.body.data.modules).length).toBeGreaterThanOrEqual(26);
  });
});
