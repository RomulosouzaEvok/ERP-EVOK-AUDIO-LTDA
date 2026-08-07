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
 * Requer server/.env com DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
 * (Postgres do docker compose exposto em localhost:5432).
 */
const fs = require('fs');
const path = require('path');

const SERVER = path.resolve(__dirname, '..');
require(path.join(SERVER, 'node_modules', 'dotenv')).config({ path: path.join(SERVER, '.env') });

const { Sequelize } = require(path.join(SERVER, 'node_modules', 'sequelize'));
const sequelize = new Sequelize(
  process.env.DB_NAME || 'erp_evok_audio',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

const pattern = new RegExp(process.argv[2] || '.');

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
