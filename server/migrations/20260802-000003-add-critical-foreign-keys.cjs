'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = '05_add_critical_foreign_keys.sql';

function resolveSqlFile(fileName) {
  return path.resolve(__dirname, '..', 'database', 'postgresql', fileName);
}

function cleanSql(sql) {
  return sql
    .replace(/^\s*BEGIN;\s*$/gim, '')
    .replace(/^\s*COMMIT;\s*$/gim, '')
    .trim();
}

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function extractConstraintNames(sql) {
  const names = [];
  const pattern = /ADD CONSTRAINT\s+(\S+)/gi;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    names.push(match[1]);
  }
  return names;
}

module.exports = {
  async up(queryInterface) {
    const sql = cleanSql(fs.readFileSync(resolveSqlFile(SQL_FILE), 'utf8'));
    const statements = splitStatements(sql);

    let applied = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        await queryInterface.sequelize.query(statement);
        applied += 1;
      } catch (error) {
        const message = String(error && error.message);
        // Idempotencia: constraint/indice ja existente nao e falha.
        if (/already exists|duplicate/i.test(message)) {
          skipped += 1;
          continue;
        }
        throw new Error(`Falha ao aplicar FK/index: ${statement.slice(0, 120)}... -> ${message}`);
      }
    }

    console.log(`FKs criticas: ${applied} statements aplicados, ${skipped} ja existentes.`);
  },

  async down(queryInterface) {
    const sql = cleanSql(fs.readFileSync(resolveSqlFile(SQL_FILE), 'utf8'));
    const constraintPattern = /ALTER TABLE IF EXISTS\s+(\S+)\s+ADD CONSTRAINT\s+(\S+)/gi;
    let match;
    const drops = [];
    while ((match = constraintPattern.exec(sql)) !== null) {
      drops.push({ table: match[1], constraint: match[2] });
    }

    for (const { table, constraint } of drops.reverse()) {
      await queryInterface.sequelize.query(
        `ALTER TABLE IF EXISTS ${table} DROP CONSTRAINT IF EXISTS ${constraint};`
      );
    }
  },
};
