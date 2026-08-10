'use strict';

/**
 * Compara os dois bancos do ERP (desenvolvimento e teste) coluna a coluna.
 *
 * ## Por que este script existe
 *
 * Em 2026-08-10 descobrimos que os dois bancos divergiam **com as mesmas
 * migrations aplicadas**: o de teste chegou a ter dezenas de colunas
 * `NOT NULL` a mais que o de dev. A causa não é "trocar de computador" no
 * sentido trivial — é que `20260731-000001-baseline-schema.cjs` **gera o
 * schema a partir dos models compilados, em tempo de execução**. Logo, o
 * schema que uma máquina produz depende de **quando** o bootstrap rodou.
 *
 * Trocar de máquina (ou criar um banco novo) em outro momento do histórico
 * do código é exatamente o gatilho que expõe isso.
 *
 * Este script mostra a diferença objetivamente, para que a decisão sobre o
 * baseline congelado seja tomada com dado e não com suposição.
 *
 * @module scripts/comparar-bancos
 */

const path = require('path');
const serverDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const { Sequelize } = require('sequelize');

/** Nomes dos bancos comparados (o de teste segue a convenção `<db>_test`). */
const DEV = process.env.DB_NAME || 'erp_evok_audio';
const TEST = `${DEV}_test`;

/**
 * Abre conexão com um banco específico usando as credenciais do `.env`.
 *
 * @param {string} dbName - Nome do banco.
 * @returns {import('sequelize').Sequelize}
 */
function connect(dbName) {
  return new Sequelize(dbName, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  });
}

/**
 * Lê o retrato do schema: nulabilidade e default de cada coluna do schema
 * `public`, indexado por `tabela.coluna`.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Map<string, {nullable: boolean, hasDefault: boolean}>>}
 */
async function readSchema(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT table_name, column_name, is_nullable, column_default
      FROM information_schema.columns
     WHERE table_schema = 'public'
  `);
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.table_name}.${r.column_name}`, {
      nullable: r.is_nullable === 'YES',
      hasDefault: r.column_default !== null,
    });
  }
  return map;
}

/**
 * Coleta um resumo operacional do banco (tabelas, migrations, volume).
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Object>}
 */
async function summary(sequelize) {
  const [t] = await sequelize.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  const [m] = await sequelize.query(`SELECT count(*)::int AS n FROM "SequelizeMeta"`);
  const [last] = await sequelize.query(`SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 1`);
  const [u] = await sequelize.query(`SELECT count(*)::int AS n FROM users`);
  return {
    tabelas: t[0].n,
    migrations: m[0].n,
    ultima: last[0] ? last[0].name : '(nenhuma)',
    usuarios: u[0].n,
  };
}

async function main() {
  const dev = connect(DEV);
  const test = connect(TEST);

  try {
    const [devSum, testSum] = await Promise.all([summary(dev), summary(test)]);

    console.log(`${DEV}`);
    console.log(`   tabelas=${devSum.tabelas}  migrations=${devSum.migrations}  usuarios=${devSum.usuarios}`);
    console.log(`   ultima: ${devSum.ultima}`);
    console.log(`${TEST}`);
    console.log(`   tabelas=${testSum.tabelas}  migrations=${testSum.migrations}  usuarios=${testSum.usuarios}`);
    console.log(`   ultima: ${testSum.ultima}`);
    console.log('');

    const [devSchema, testSchema] = await Promise.all([readSchema(dev), readSchema(test)]);

    const soDev = [];
    const soTest = [];
    const nulabilidade = [];

    for (const [key, d] of devSchema) {
      const t = testSchema.get(key);
      if (!t) { soDev.push(key); continue; }
      if (d.nullable !== t.nullable) {
        nulabilidade.push(`${key}: dev=${d.nullable ? 'NULL' : 'NOT NULL'} test=${t.nullable ? 'NULL' : 'NOT NULL'}`);
      }
    }
    for (const key of testSchema.keys()) {
      if (!devSchema.has(key)) soTest.push(key);
    }

    console.log(`Colunas so em ${DEV}: ${soDev.length}`);
    soDev.slice(0, 20).forEach((k) => console.log(`   ${k}`));
    if (soDev.length > 20) console.log(`   ... e mais ${soDev.length - 20}`);
    console.log('');

    console.log(`Colunas so em ${TEST}: ${soTest.length}`);
    soTest.slice(0, 20).forEach((k) => console.log(`   ${k}`));
    if (soTest.length > 20) console.log(`   ... e mais ${soTest.length - 20}`);
    console.log('');

    console.log(`Colunas com NULABILIDADE diferente: ${nulabilidade.length}`);
    nulabilidade.slice(0, 40).forEach((l) => console.log(`   ${l}`));
    if (nulabilidade.length > 40) console.log(`   ... e mais ${nulabilidade.length - 40}`);
    console.log('');

    const total = soDev.length + soTest.length + nulabilidade.length;
    console.log(total === 0
      ? 'RESULTADO: os dois bancos sao IDENTICOS.'
      : `RESULTADO: ${total} divergencia(s) entre os dois bancos.`);
  } finally {
    await dev.close();
    await test.close();
  }
}

main().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
