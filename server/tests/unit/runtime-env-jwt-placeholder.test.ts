/**
 * AUD-AUTHN-01 (ERP-LEGACY-001-CASE-005) — a guarda de JWT_SECRET nao pode
 * depender de NODE_ENV.
 *
 * Estado auditado (AUDIT_COMMIT c1311a6f): `runtimeEnv.ts:34` dava a NODE_ENV o
 * default 'development' e o `superRefine` retornava cedo fora de 'production'
 * (`:72-75`). Resultado: a rejeicao de placeholder de JWT_SECRET (`:103`) era
 * codigo morto em todo boot que nao declarasse producao — inclusive o boot
 * instruido pelo proprio repositorio (`.env.docker.example:1`). Como o valor
 * default publicado em `docker-compose.yml:54` tinha mais de 32 caracteres, ele
 * tambem passava pela unica guarda sempre viva (`getJwtRuntimeConfig`), e a API
 * subia assinando token com um segredo legivel no repositorio.
 *
 * Nenhum valor de segredo real e reproduzido aqui. Os literais abaixo sao
 * construidos a partir do PADRAO DE DETECCAO de `runtimeEnv.ts:12`
 * (`/^(CHANGE_ME|dev-only-change-me)/i`), que e codigo versionado de validacao,
 * nao segredo de instancia.
 */

// `runtimeEnv.ts` chama `dotenv.config()` no carregamento do modulo. Sem
// neutralizar isso, um `.env` local (nao versionado, presente nesta maquina)
// reinjetaria NODE_ENV logo apos o `delete` abaixo e o teste passaria a
// depender do arquivo de cada desenvolvedor. O cenario que este arquivo precisa
// provar e' exatamente "NODE_ENV nao declarado".
jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: jest.fn() },
  config: jest.fn(),
}));

// Mesma CLASSE do default que era publicado em `docker-compose.yml:54`:
// prefixo de placeholder + comprimento acima de 32. Nao e o valor real.
const LONG_PLACEHOLDER_SECRET = `dev-only-change-me-${'0'.repeat(27)}`;

// Placeholder do outro ramo da denylist — mesma forma ja usada em
// `runtime-env.test.ts:46`.
const CHANGE_ME_SECRET = 'CHANGE_ME_LOCAL_DEV_SECRET_32_CHARS_MINIMUM';

// Segredo forte, sem prefixo de placeholder: precisa continuar subindo.
const STRONG_SECRET = 'f3a91c47b25e08d6a1c930f47be25d18c604aa73';

function loadWith(env: Record<string, string | undefined>) {
  delete process.env.NODE_ENV;

  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  const runtimeEnv = require('../../src/config/runtimeEnv');
  runtimeEnv.clearRuntimeEnvCache();

  return runtimeEnv;
}

describe('runtimeEnv — JWT_SECRET fraco reprovado independentemente de NODE_ENV (AUD-AUTHN-01)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('pre-condicao: o valor testado passa na guarda de comprimento (>= 32)', () => {
    // Documenta por que o estado auditado nao falhava: comprimento nunca foi o
    // que barrava este valor.
    expect(LONG_PLACEHOLDER_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(CHANGE_ME_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  // T1 — o caminho do valor realmente publicado em docker-compose.yml:54.
  it('T1: lanca quando NODE_ENV nao e declarado e JWT_SECRET usa o placeholder longo de dev', () => {
    const runtimeEnv = loadWith({ JWT_SECRET: LONG_PLACEHOLDER_SECRET });

    expect(process.env.NODE_ENV).toBeUndefined();
    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  // T-CODEX — o outro ramo da denylist, cobrindo a guarda ENV_PLACEHOLDER_PATTERN.
  it('T-CODEX: lanca quando NODE_ENV nao e declarado e JWT_SECRET usa placeholder CHANGE_ME', () => {
    const runtimeEnv = loadWith({ JWT_SECRET: CHANGE_ME_SECRET });

    expect(process.env.NODE_ENV).toBeUndefined();
    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it('lanca com NODE_ENV=development declarado explicitamente', () => {
    const runtimeEnv = loadWith({
      NODE_ENV: 'development',
      JWT_SECRET: LONG_PLACEHOLDER_SECRET,
    });

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it('lanca com NODE_ENV=test declarado explicitamente', () => {
    const runtimeEnv = loadWith({
      NODE_ENV: 'test',
      JWT_SECRET: CHANGE_ME_SECRET,
    });

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it('lanca fora de producao quando JWT_SECRET tem menos de 32 caracteres', () => {
    const runtimeEnv = loadWith({ NODE_ENV: 'development', JWT_SECRET: 'curto-demais' });

    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it('NAO lanca fora de producao com JWT_SECRET forte (o boot de dev continua subindo)', () => {
    const runtimeEnv = loadWith({ NODE_ENV: 'development', JWT_SECRET: STRONG_SECRET });

    expect(() => runtimeEnv.loadRuntimeEnv()).not.toThrow();
    expect(runtimeEnv.getJwtRuntimeConfig().secret).toBe(STRONG_SECRET);
  });

  it('NAO lanca fora de producao quando JWT_SECRET esta ausente (falha segue no uso, nao no boot)', () => {
    // Ausencia continua sendo tratada como hoje: `loadRuntimeEnv` passa e
    // `getJwtRuntimeConfig` lanca. Mudar isso quebraria scripts e testes que
    // nunca emitem token. Em producao, a ausencia continua reprovada no boot.
    const runtimeEnv = loadWith({ NODE_ENV: 'development', JWT_SECRET: undefined });

    expect(() => runtimeEnv.loadRuntimeEnv()).not.toThrow();
    expect(() => runtimeEnv.getJwtRuntimeConfig()).toThrow('JWT_SECRET');
  });
});
