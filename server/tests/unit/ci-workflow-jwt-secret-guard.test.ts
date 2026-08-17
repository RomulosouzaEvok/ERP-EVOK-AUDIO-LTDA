import fs from 'fs';
import path from 'path';

/**
 * AUD-AUTHN-01 / CASE-005 — nenhum workflow versionado pode carregar um
 * `JWT_SECRET` literal que a guarda de `runtimeEnv.ts` aceite.
 *
 * Origem: RETEST_EVIDENCE §6.1. Depois do patch de `docker-compose.yml`, o
 * reteste da VeriCore mediu que `.github/workflows/server-ci.yml` ainda tinha
 * DUAS ocorrencias do mesmo `JWT_SECRET` fixo (`len=42`, sem prefixo de
 * placeholder, `REPROVARIA_NO_BOOT=false`). Ou seja: sobrava no repositorio uma
 * chave de assinatura versionada que o runtime aceita em qualquer ambiente —
 * `CR-4` sobrevivendo ao patch. Aqui a propriedade fica travada.
 *
 * A propriedade NAO e "o workflow nao pode ter JWT_SECRET". CI precisa de chave
 * para assinar token. A propriedade e: o valor nao pode ser um LITERAL FIXO
 * versionado — tem de vir de expansao (`$JWT_SECRET` gerado por execucao,
 * `${{ secrets.* }}`) ou, se literal, tem de ser rejeitado pela guarda real.
 *
 * Segredos: nenhuma assercao imprime valor. O que aparece em falha e o nome do
 * arquivo e a contagem. A verificacao roda a guarda REAL (`loadRuntimeEnv`), nao
 * uma reimplementacao da regra — reimplementar a regra foi exatamente o defeito
 * de metodo corrigido em `env-examples-jwt-guard.test.ts`.
 */

jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: jest.fn() },
  config: jest.fn(),
}));

const RAIZ = path.resolve(__dirname, '../../..');
const DIR_WORKFLOWS = path.join(RAIZ, '.github', 'workflows');

// Captura tanto `JWT_SECRET: valor` (env de job/step) quanto
// `-e JWT_SECRET=valor` (docker run).
const OCORRENCIA = /JWT_SECRET[:=][ \t]*([^\s\\]+)/g;

function ehExpansao(valor: string): boolean {
  const limpo = valor.replace(/^["']|["']$/g, '');
  return limpo.startsWith('$') || limpo.includes('${{');
}

function literaisDe(arquivo: string): string[] {
  const conteudo = fs.readFileSync(path.join(DIR_WORKFLOWS, arquivo), 'utf8');
  const literais: string[] = [];

  for (const achado of conteudo.matchAll(OCORRENCIA)) {
    const valor = achado[1];
    if (!ehExpansao(valor)) {
      literais.push(valor.replace(/^["']|["']$/g, ''));
    }
  }

  return literais;
}

function bootReprova(jwtSecret: string): boolean {
  jest.resetModules();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = jwtSecret;

  const runtimeEnv = require('../../src/config/runtimeEnv');
  runtimeEnv.clearRuntimeEnvCache();

  try {
    runtimeEnv.loadRuntimeEnv();
    return false;
  } catch {
    return true;
  }
}

const WORKFLOWS = fs.existsSync(DIR_WORKFLOWS)
  ? fs.readdirSync(DIR_WORKFLOWS).filter((nome) => /\.ya?ml$/.test(nome))
  : [];

describe('.github/workflows — nenhuma chave de assinatura fixa versionada (AUD-AUTHN-01)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('existe ao menos um workflow para inspecionar', () => {
    expect(WORKFLOWS.length).toBeGreaterThan(0);
  });

  it.each(WORKFLOWS)('%s nao define JWT_SECRET literal que suba o boot', (arquivo) => {
    const utilizaveis = literaisDe(arquivo).filter((valor) => !bootReprova(valor));

    // Se falhar aqui: o workflow carrega uma chave de assinatura fixa e
    // versionada. Troque por geracao no proprio job (`openssl rand -hex 32` +
    // `$GITHUB_ENV`) ou por segredo de repositorio.
    expect(utilizaveis.length).toBe(0);
  });

  it('server-ci.yml gera o segredo por execucao e o mascara no log', () => {
    const conteudo = fs.readFileSync(path.join(DIR_WORKFLOWS, 'server-ci.yml'), 'utf8');

    expect(conteudo.includes('openssl rand -hex 32')).toBe(true);
    expect(conteudo.includes('::add-mask::')).toBe(true);
    expect(conteudo.includes('JWT_SECRET=$SECRET" >> "$GITHUB_ENV"')).toBe(true);
  });
});
