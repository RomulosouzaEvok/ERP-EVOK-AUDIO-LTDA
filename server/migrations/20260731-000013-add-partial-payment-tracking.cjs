'use strict';

const TABLES = ['accounts_payable', 'accounts_receivable'];
const AMOUNT_PAID_COLUMN = 'amount_paid';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      if (!(await columnExists(queryInterface, table, AMOUNT_PAID_COLUMN))) {
        await queryInterface.addColumn(table, AMOUNT_PAID_COLUMN, {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Soma dos valores ja pagos/recebidos nesta conta. O campo `amount` permanece o valor TOTAL original (nunca sobrescrito); status so vira "paid" quando amount_paid >= amount.',
        });
      }
    }

    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_accounts_payable_status" ADD VALUE IF NOT EXISTS 'partial';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_accounts_receivable_status" ADD VALUE IF NOT EXISTS 'partial';`
    );
  },

  async down(queryInterface) {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro;
    // como 'partial' pode estar em uso por linhas existentes, o rollback
    // seguro aqui e remover apenas a coluna adicionada (o valor extra do
    // enum permanece, inofensivo, ate uma migracao dedicada de limpeza).
    for (const table of TABLES) {
      if (await columnExists(queryInterface, table, AMOUNT_PAID_COLUMN)) {
        await queryInterface.removeColumn(table, AMOUNT_PAID_COLUMN);
      }
    }
  },
};
