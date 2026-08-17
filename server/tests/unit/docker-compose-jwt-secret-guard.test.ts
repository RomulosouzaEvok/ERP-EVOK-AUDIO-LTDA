import fs from 'fs';
import path from 'path';

/**
 * AUD-AUTHN-01 (ERP-LEGACY-001-CASE-005) — o compose de desenvolvimento nao
 * pode publicar default de chave de assinatura nem rebaixar NODE_ENV em
 * silencio.
 *
 * Um teste unitario Node nao enxerga `${VAR:-default}` do compose: o arquivo
 * so vira ambiente dentro do Docker. Este guard test le o artefato versionado e
 * reprova a FORMA proibida. Ele nao substitui a validacao de `docker compose
 * config` (T22-F02), que e item de acompanhamento separado por decisao do dono.
 *
 * Nenhum valor de segredo e reproduzido aqui: o teste assere a forma da linha,
 * nunca o conteudo.
 */

const COMPOSE_PATH = path.resolve(__dirname, '..', '..', '..', 'docker-compose.yml');

/**
 * As assercoes usam booleano, nunca `expect(compose).toMatch(...)`: em caso de
 * falha, o Jest imprimiria o arquivo inteiro no relatorio — e o arquivo e
 * exatamente onde mora o valor sob remediacao. Evidencia de teste nao carrega
 * segredo.
 */
const has = (compose: string, pattern: RegExp): boolean => pattern.test(compose);

describe('docker-compose.yml — sem default fraco para a chave de assinatura', () => {
  const compose = fs.readFileSync(COMPOSE_PATH, 'utf8');

  it('JWT_SECRET nao usa a forma de default versionado `${JWT_SECRET:-...}`', () => {
    expect(has(compose, /JWT_SECRET:\s*\$\{JWT_SECRET:-/)).toBe(false);
  });

  it('JWT_SECRET usa a forma obrigatoria `${JWT_SECRET:?...}`, como DB_PASSWORD ja fazia', () => {
    expect(has(compose, /JWT_SECRET:\s*\$\{JWT_SECRET:\?/)).toBe(true);
  });

  it('NODE_ENV e declarado explicitamente, sem rebaixar o ENV da imagem em silencio', () => {
    // `server/Dockerfile:21` declara `ENV NODE_ENV=production`. Um
    // `${NODE_ENV:-development}` no compose rebaixa esse modo sem que ninguem
    // declare nada. Apagar a linha tambem nao serve: jogaria o dev em
    // 'production' e derrubaria o boot em DB_SSL/CORS_ORIGIN.
    expect(has(compose, /NODE_ENV:\s*\$\{NODE_ENV:-/)).toBe(false);
    expect(has(compose, /NODE_ENV:\s*\$\{NODE_ENV:\?/)).toBe(true);
  });

  it('DB_PASSWORD continua na forma obrigatoria (nao houve regressao no precedente)', () => {
    expect((compose.match(/DB_PASSWORD:\s*\$\{DB_PASSWORD:\?/g) || []).length).toBe(1);
    expect(has(compose, /POSTGRES_PASSWORD:\s*\$\{DB_PASSWORD:\?/)).toBe(true);
  });

  // NOTA DE ESCOPO: `ADMIN_SEED_PASSWORD` (docker-compose.yml:57) tem a mesma
  // forma defeituosa e e o finding AUD-AUTHN-02, cujo escopo ainda nao foi
  // decidido pelo dono. Deliberadamente NAO asserido aqui.
});
