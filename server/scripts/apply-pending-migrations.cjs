/**
 * Aplica migrations pendentes na ordem lexicográfica, registrando em
 * "SequelizeMeta" — método validado nos blocos SST/TI/JUR (2026-08-07).
 *
 * NÃO usar `npm run migration:up` cru neste banco: o SequelizeMeta local
 * tem histórico aplicado fora de ordem (SST/TI antes do lote 20260806-*),
 * e o runner padrão diverge. Este script é idempotente: pula o que já está
 * registrado e aplica só o que falta, na ordem correta.
 *
 * Uso (da raiz do repo ou de server/):
 *   node server/scripts/apply-pending-migrations.cjs            # tudo pendente
 *   node server/scripts/apply-pending-migrations.cjs "^20260807" # filtro regex
 *
 * Contra banco SEM sufixo `_test`/`_ci` (inclusive o banco real de produção),
 * a confirmação explícita é obrigatória:
 *   node server/scripts/apply-pending-migrations.cjs --confirmar-banco-real
 *   node server/scripts/apply-pending-migrations.cjs "^20260807" --confirmar-banco-real
 *
 * Requer server/.env com DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
 * (Postgres do docker compose exposto em localhost:5432).
 *
 * ⚠️ **Guarda de alvo com confirmação explícita** (desde `CASE-003`
 * — extensão —, SanaCore, `sana/ERP-LEGACY-001/CASE-003`, `APR-2026-026`).
 * Antes deste caso o script não tinha guarda alguma: aplicava DDL em
 * qualquer banco, e o default abaixo, com `DB_NAME` ausente do `.env`, é
 * `erp_evok_audio` — o banco REAL de produção (`APR-2026-016`). Agora:
 *
 * - `DB_NAME` com sufixo `_test`/`_ci` (e sem sinal de produção em
 *   `NODE_ENV`/`DB_NAME`/`DB_HOST`) → aplica normalmente, sem atrito;
 * - qualquer outro alvo — inclusive `DB_NAME` ausente/vazio, que cai no
 *   default do banco real → **recusa por padrão**, e só prossegue com
 *   `--confirmar-banco-real` na linha de comando.
 *
 * A guarda **não é fail-closed absoluto** (diferente de
 * `limpar-dados-transacionais.cjs` e `seed-usuarios-departamentos.cjs`,
 * onde a decisão do dono foi recusa sem escape): aplicar migration no banco
 * real é operação legítima de deploy, então o desenho aprovado é
 * *confirmação deliberada obrigatória*, não recusa absoluta. Ver
 * `assertAlvoAutorizado()` abaixo. Padrão de leitura das três variáveis
 * replicado de `run-api-suite.cjs:517-536`. Vetor de origem: resíduo `R2`
 * ("indireção por script") do reteste de `AUD-PROC-CUSTODIA-01` e `CE-03` de
 * `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`.
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.resolve(__dirname, '..');
require(path.join(SERVER, 'node_modules', 'dotenv')).config({ path: path.join(SERVER, '.env') });

/**
 * Flag única e inequívoca de confirmação de alvo não descartável.
 * Comparada por igualdade exata: `--confirmar` (a flag de outro script deste
 * diretório) NÃO satisfaz esta guarda, de propósito.
 */
const FLAG_CONFIRMACAO = '--confirmar-banco-real';

/**
 * Resolve o nome do banco **efetivo**, incluindo o default para o banco REAL
 * que este script aplica quando `DB_NAME` não está no ambiente.
 *
 * Existe como função separada para que a guarda avalie exatamente o mesmo
 * valor que o `Sequelize` usará na conexão — o agravante que motivou a
 * correção equivalente em `seed-usuarios-departamentos.cjs` era justamente a
 * guarda ver `process.env.DB_NAME` cru (`undefined`) e a conexão ver o
 * default.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function resolveDbName(env) {
  return env.DB_NAME || 'erp_evok_audio';
}

/**
 * Sinais de que o alvo é produção, lidos das mesmas três variáveis que
 * `run-api-suite.cjs:524-529` inspeciona. Aqui eles NÃO causam recusa
 * absoluta (deploy em produção é o uso legítimo do script): eles apenas
 * desqualificam o alvo como "descartável", exigindo confirmação explícita.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string} dbName valor já resolvido
 * @returns {string[]} descrição textual de cada sinal encontrado
 */
function sinaisDeProducao(env, dbName) {
  const sinais = [];
  if (env.NODE_ENV === 'production') sinais.push('NODE_ENV=production');
  if (/prod/i.test(dbName)) sinais.push(`DB_NAME="${dbName}" casa /prod/i`);
  if (/prod/i.test(env.DB_HOST || '')) sinais.push(`DB_HOST="${env.DB_HOST}" casa /prod/i`);
  return sinais;
}

/**
 * Classifica o alvo sem efeito colateral (não imprime, não sai, não conecta).
 * Separada de `assertAlvoAutorizado()` para ser exercitável em teste unitário
 * sem banco algum (`APR-2026-016`).
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} argv argumentos de linha de comando (sem node/script)
 * @returns {{dbName: string, dbHost: string, sinais: string[], descartavel: boolean, confirmado: boolean, autorizado: boolean}}
 */
function avaliarAlvo(env, argv) {
  const dbName = resolveDbName(env);
  const sinais = sinaisDeProducao(env, dbName);
  const descartavel = /(_test|_ci)$/i.test(dbName) && sinais.length === 0;
  const confirmado = argv.includes(FLAG_CONFIRMACAO);
  return {
    dbName,
    dbHost: env.DB_HOST || 'localhost',
    sinais,
    descartavel,
    confirmado,
    autorizado: descartavel || confirmado,
  };
}

/**
 * Recusa aplicar DDL em alvo não descartável sem confirmação explícita.
 *
 * Este script **aplica DDL** (`mig.up`) — operação legítima em produção, e é
 * para isso que ele existe. Por isso a guarda não é recusa absoluta: banco com
 * sufixo `_test`/`_ci` passa sem atrito; qualquer outro alvo exige
 * `--confirmar-banco-real`, que é deliberado, visível no histórico do shell e
 * impossível de digitar por acidente.
 *
 * Roda ANTES de instanciar o `Sequelize`, portanto antes de qualquer conexão.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} argv
 * @returns {{dbName: string, dbHost: string, sinais: string[], descartavel: boolean, confirmado: boolean, autorizado: boolean}}
 */
function assertAlvoAutorizado(env, argv) {
  const alvo = avaliarAlvo(env, argv);
  if (alvo.descartavel) return alvo;

  if (!alvo.confirmado) {
    console.error(
      `RECUSADO: este script aplica DDL (migrations) e o banco alvo lido e "${alvo.dbName}" @ "${alvo.dbHost}", ` +
      'que nao tem sufixo "_test" nem "_ci"' +
      (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '') + '.\n' +
      'Se o alvo esta ERRADO: corrija DB_NAME/DB_HOST em server/.env (ou aponte para um banco _test/_ci) e rode de novo.\n' +
      `Se o alvo esta CERTO e voce quer mesmo aplicar migrations nele, repita o comando com ${FLAG_CONFIRMACAO}:\n` +
      `  node server/scripts/apply-pending-migrations.cjs ${FLAG_CONFIRMACAO}\n` +
      'Faca backup antes (pg_dump --format=custom). Guarda de CASE-003 (RC-PROC-01, CE-03).',
    );
    process.exit(1);
  }

  console.warn(
    `ATENCAO: aplicando migrations em "${alvo.dbName}" @ "${alvo.dbHost}", que NAO e um banco descartavel` +
    (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '') +
    `. Confirmado explicitamente via ${FLAG_CONFIRMACAO}.`,
  );
  return alvo;
}

assertAlvoAutorizado(process.env, process.argv.slice(2));

const { Sequelize } = require(path.join(SERVER, 'node_modules', 'sequelize'));
const sequelize = new Sequelize(
  resolveDbName(process.env),
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

// A flag de confirmação é retirada dos posicionais: sem isso,
// `... .cjs --confirmar-banco-real` viraria o filtro regex e o script diria
// "Nada pendente." em silêncio, sem aplicar nada.
const posicionais = process.argv.slice(2).filter((a) => a !== FLAG_CONFIRMACAO);
const pattern = new RegExp(posicionais[0] || '.');

(async () => {
  const qi = sequelize.getQueryInterface();
  const [applied] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
  const appliedSet = new Set(applied.map((r) => r.name));

  const files = fs
    .readdirSync(path.join(SERVER, 'migrations'))
    .filter((f) => f.endsWith('.cjs') || f.endsWith('.js'))
    .filter((f) => pattern.test(f))
    .sort();

  let count = 0;
  for (const f of files) {
    if (appliedSet.has(f)) continue;
    const mig = require(path.join(SERVER, 'migrations', f));
    process.stdout.write('APLICANDO: ' + f + ' ... ');
    await mig.up(qi, Sequelize);
    await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES ($1)', { bind: [f] });
    console.log('OK');
    count += 1;
  }
  await sequelize.close();
  console.log(count === 0 ? 'Nada pendente.' : `Concluído: ${count} migration(s) aplicada(s).`);
})().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
