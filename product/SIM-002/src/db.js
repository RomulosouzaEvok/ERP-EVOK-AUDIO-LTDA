'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Abre a base de dados e garante que o schema esteja aplicado.
 *
 * @param {string} [location] caminho do arquivo SQLite; ':memory:' por padrão.
 * @returns {object} handle com helpers de acesso.
 */
function openDatabase(location = ':memory:') {
  const database = new DatabaseSync(location);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  database.exec(schema);

  return {
    raw: database,

    run(sql, ...params) {
      return database.prepare(sql).run(...params);
    },

    get(sql, ...params) {
      return database.prepare(sql).get(...params);
    },

    all(sql, ...params) {
      return database.prepare(sql).all(...params);
    },

    close() {
      database.close();
    }
  };
}

/**
 * Cria uma empresa (tenant) e devolve o registro persistido.
 */
function createCompany(db, name, now = new Date().toISOString()) {
  const result = db.run(
    'INSERT INTO companies (name, created_at) VALUES (?, ?)',
    name,
    now
  );
  return db.get('SELECT * FROM companies WHERE id = ?', Number(result.lastInsertRowid));
}

module.exports = { openDatabase, createCompany };
