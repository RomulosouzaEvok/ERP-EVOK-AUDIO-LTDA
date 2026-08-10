import jwt from 'jsonwebtoken';
import request from 'supertest';

import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

/**
 * Cria um agente Supertest apontando para a API em execucao.
 *
 * @returns Agente HTTP para testes de integracao.
 */
export function api(): request.SuperTest<request.Test> {
  const baseUrl = process.env.TEST_API_URL || 'http://127.0.0.1:3001';
  return request(baseUrl);
}

/**
 * Retorna o token Bearer usado nos testes de integracao protegidos.
 *
 * @returns Token JWT configurado no ambiente.
 * @throws {Error} Quando o token nao foi informado.
 */
export function authToken(): string {
  const token = process.env.TEST_AUTH_TOKEN;
  if (!token) {
    throw new Error('Configure TEST_AUTH_TOKEN para executar testes de integracao autenticados.');
  }
  return token;
}

/**
 * Token Bearer de um **segundo usuario administrador** (`ci-approver@evok.local`),
 * distinto do dono de {@link authToken}.
 *
 * ## Por que existe
 *
 * A segregacao de funcao (**D-K**, `src/shared/domain/segregationOfDuties.ts`,
 * decisao do dono em 2026-08-10) proibe que quem SOLICITA um documento de
 * compra seja quem o APROVA — e a regra e sobre identidade, entao `role:
 * 'admin'` deliberadamente **nao** isenta. Com um unico usuario na suite,
 * toda requisicao/pedido/importacao criada pelos testes ficava inaprovavel
 * (422 `D-K-REQUISICAO`/`D-K-PEDIDO`/`D-K-COMEX`), derrubando a cadeia
 * inteira a partir da etapa de aprovacao.
 *
 * O usuario e provisionado por `scripts/run-api-suite.cjs` (`ensureFixtures`)
 * com `role: 'admin'`, o que lhe da tambem a alcada de diretoria exigida pelo
 * G11/G11-COMEX (`resolveAvailableApproverRoles` trata `admin` como
 * `diretor`). Ou seja: **este e o token de quem aprova**, em qualquer um dos
 * 4 pontos de aprovacao do ERP.
 *
 * @returns Token JWT do segundo administrador.
 * @throws {Error} Quando o runner nao exportou `TEST_APPROVER_TOKEN`.
 */
export function approverToken(): string {
  const token = process.env.TEST_APPROVER_TOKEN;
  if (!token) {
    throw new Error(
      'Configure TEST_APPROVER_TOKEN (exportado por scripts/run-api-suite.cjs) para exercitar aprovacoes '
      + 'sujeitas a segregacao de funcao (D-K).',
    );
  }
  return token;
}

/**
 * Emite um JWT diretamente para um usuario, **sem** passar por
 * `POST /api/auth/login`.
 *
 * Duas razoes: (1) evita consumir o `authLimiter` (10 tentativas/15min por
 * IP, `server/app.ts`), compartilhado por todas as suites que rodam no mesmo
 * processo; (2) as senhas dos usuarios departamentais sao aleatorias a cada
 * execucao de `scripts/seed-usuarios-departamentos.cjs` e vivem fora do Git —
 * nenhum teste pode depender delas. O middleware `authenticate` recarrega
 * usuario e perfil do banco a cada request (nunca confia em claims do token),
 * entao o caminho de autorizacao exercitado e identico ao de um login real.
 *
 * @param user - Usuario alvo (`id` e, quando conhecido, `passwordVersion`).
 * @returns Token JWT valido por 1 hora.
 */
export function mintToken(user: { id: number; passwordVersion?: number | null }): string {
  const { secret } = getJwtRuntimeConfig();
  return jwt.sign({ id: user.id, passwordVersion: user.passwordVersion ?? 1 }, secret, {
    expiresIn: '1h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

/**
 * Define se os testes de integracao devem rodar contra API/PostgreSQL reais.
 *
 * @returns Verdadeiro quando RUN_INTEGRATION=true.
 */
export function integrationEnabled(): boolean {
  return process.env.RUN_INTEGRATION === 'true';
}

/**
 * Indica se o ambiente minimo para testes de integracao esta pronto.
 *
 * @returns Verdadeiro quando a API e as credenciais basicas estao configuradas.
 */
export function hasIntegrationPrerequisites(): boolean {
  return integrationEnabled() && Boolean(process.env.TEST_AUTH_TOKEN) && Boolean(process.env.TEST_API_URL);
}
