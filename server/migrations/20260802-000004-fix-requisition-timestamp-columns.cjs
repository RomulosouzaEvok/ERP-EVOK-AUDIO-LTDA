'use strict';

// Corrige bancos que aplicaram a versao original da migration de requisicoes,
// que criou createdAt/updatedAt em camelCase enquanto os modelos usam
// underscored: true (created_at/updated_at). Idempotente: renomeia apenas se
// a coluna camelCase existir.

const TABLES = ['purchase_requisitions', 'purchase_requisition_items'];
const RENAMES = [
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
];

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=:table AND column_name=:column`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    for (const table of TABLES) {
      for (const [from, to] of RENAMES) {
        if (await columnExists(queryInterface, table, from)) {
          await queryInterface.sequelize.query(
            `ALTER TABLE ${table} RENAME COLUMN "${from}" TO ${to};`
          );
        }
      }
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      for (const [from, to] of RENAMES) {
        if (await columnExists(queryInterface, table, to)) {
          await queryInterface.sequelize.query(
            `ALTER TABLE ${table} RENAME COLUMN ${to} TO "${from}";`
          );
        }
      }
    }
  },
};
