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

/**
 * Nomes dos bancos comparados. Sem argumentos, compara o banco de
 * desenvolvimento com o de teste (convenção `<db>_test`); com argumentos,
 * compara os dois bancos informados — usado para provar que um banco
 * descartável provisionado só por migrations nasce idêntico ao atual:
 *
 *     node scripts/comparar-bancos.cjs erp_evok_audio erp_evok_audio_baseline_check
 *
 * Nota de conformidade (CE-03, `RISK_CLASS-RC-PROC-01`): este script é
 * **somente leitura** — todas as consultas em `readSchema`/`readIndexes`/
 * `readConstraints`/`summary` são `SELECT`; nenhuma escrita é feita em
 * nenhum dos dois bancos. O default apontar para `erp_evok_audio` (banco
 * REAL) é intencional e seguro por essa razão: comparar o schema real contra
 * o de teste é o propósito declarado do script.
 */
const [argA, argB] = process.argv.slice(2);
const DEV = argA || process.env.DB_NAME || 'erp_evok_audio';
const TEST = argB || `${argA || process.env.DB_NAME || 'erp_evok_audio'}_test`;

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
 * Lê o retrato de cada coluna do schema `public`: nulabilidade, tipo
 * completo (com tamanho/precisão) e default, indexado por `tabela.coluna`.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Map<string, {nullable: boolean, tipo: string, padrao: string}>>}
 */
async function readSchema(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT c.table_name,
           c.column_name,
           c.is_nullable,
           format_type(a.atttypid, a.atttypmod) AS tipo,
           COALESCE(c.column_default, '') AS column_default
      FROM information_schema.columns c
      JOIN pg_class t  ON t.relname = c.table_name
      JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = c.table_schema
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = c.column_name
     WHERE c.table_schema = 'public'
  `);
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.table_name}.${r.column_name}`, {
      nullable: r.is_nullable === 'YES',
      tipo: r.tipo,
      padrao: r.column_default,
    });
  }
  return map;
}

/**
 * Lê os índices do schema `public` pela definição textual do Postgres
 * (`pg_indexes.indexdef`), indexados por nome.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Map<string, string>>}
 */
async function readIndexes(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
  `);
  return new Map(rows.map((r) => [r.indexname, r.indexdef]));
}

/**
 * Lê as constraints do schema `public` (PK, FK, UNIQUE, CHECK) pela
 * definição textual do Postgres, indexadas por `tabela.constraint`.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<Map<string, string>>}
 */
async function readConstraints(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT rel.relname AS tabela,
           con.conname  AS nome,
           pg_get_constraintdef(con.oid) AS definicao
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public'
  `);
  return new Map(rows.map((r) => [`${r.tabela}.${r.nome}`, r.definicao]));
}

/**
 * Compara dois mapas de objetos do schema e devolve as divergências em
 * texto legível.
 *
 * @param {string} rotulo - Nome do que está sendo comparado (ex.: "INDICE").
 * @param {Map<string, string>} a - Retrato do primeiro banco.
 * @param {Map<string, string>} b - Retrato do segundo banco.
 * @returns {{soA: string[], soB: string[], diferentes: string[]}}
 */
function diffMaps(rotulo, a, b) {
  const soA = [];
  const soB = [];
  const diferentes = [];

  for (const [key, valorA] of a) {
    if (!b.has(key)) { soA.push(key); continue; }
    if (b.get(key) !== valorA) {
      diferentes.push(`${rotulo} ${key}: A=${valorA} | B=${b.get(key)}`);
    }
  }
  for (const key of b.keys()) {
    if (!a.has(key)) soB.push(key);
  }

  return { soA, soB, diferentes };
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
    const tipos = [];
    const padroes = [];

    for (const [key, d] of devSchema) {
      const t = testSchema.get(key);
      if (!t) { soDev.push(key); continue; }
      if (d.nullable !== t.nullable) {
        nulabilidade.push(`${key}: A=${d.nullable ? 'NULL' : 'NOT NULL'} B=${t.nullable ? 'NULL' : 'NOT NULL'}`);
      }
      if (d.tipo !== t.tipo) {
        tipos.push(`${key}: A=${d.tipo} B=${t.tipo}`);
      }
      if (d.padrao !== t.padrao) {
        padroes.push(`${key}: A=${d.padrao || '(sem default)'} B=${t.padrao || '(sem default)'}`);
      }
    }
    for (const key of testSchema.keys()) {
      if (!devSchema.has(key)) soTest.push(key);
    }

    const [devIdx, testIdx] = await Promise.all([readIndexes(dev), readIndexes(test)]);
    const [devCon, testCon] = await Promise.all([readConstraints(dev), readConstraints(test)]);
    const idx = diffMaps('INDICE', devIdx, testIdx);
    const con = diffMaps('CONSTRAINT', devCon, testCon);

    /**
     * Imprime uma seção de divergências (no máximo 20 linhas).
     *
     * @param {string} titulo
     * @param {string[]} linhas
     */
    const secao = (titulo, linhas) => {
      console.log(`${titulo}: ${linhas.length}`);
      linhas.slice(0, 20).forEach((l) => console.log(`   ${l}`));
      if (linhas.length > 20) console.log(`   ... e mais ${linhas.length - 20}`);
      console.log('');
    };

    secao(`Colunas so em ${DEV}`, soDev);
    secao(`Colunas so em ${TEST}`, soTest);
    secao('Colunas com NULABILIDADE diferente', nulabilidade);
    secao('Colunas com TIPO diferente', tipos);
    secao('Colunas com DEFAULT diferente', padroes);
    secao(`Indices so em ${DEV}`, idx.soA);
    secao(`Indices so em ${TEST}`, idx.soB);
    secao('Indices com DEFINICAO diferente', idx.diferentes);
    secao(`Constraints so em ${DEV}`, con.soA);
    secao(`Constraints so em ${TEST}`, con.soB);
    secao('Constraints com DEFINICAO diferente', con.diferentes);

    const total =
      soDev.length + soTest.length + nulabilidade.length + tipos.length + padroes.length +
      idx.soA.length + idx.soB.length + idx.diferentes.length +
      con.soA.length + con.soB.length + con.diferentes.length;

    console.log(total === 0
      ? 'RESULTADO: os dois bancos sao IDENTICOS.'
      : `RESULTADO: ${total} divergencia(s) entre os dois bancos.`);
    process.exitCode = total === 0 ? 0 : 2;
  } finally {
    await dev.close();
    await test.close();
  }
}

main().catch((e) => {
  console.error('FALHA:', e.message);
  process.exit(1);
});
