'use strict';

// item_estruturas.criado_por e approved_by eram UUID, mas users.id e INTEGER.
// O controller injeta req.user.id (integer) e o Postgres rejeitava com
// "invalid input syntax for type uuid". Converte para INTEGER com FK real
// para users(id), garantindo rastreabilidade com integridade referencial.
// Colunas sao de auditoria e estavam 100% nulas em todos os ambientes
// conhecidos; valores UUID orfaos (sem correspondencia possivel em users)
// sao descartados via USING NULL.

const COLUMNS = ['criado_por', 'approved_by'];

module.exports = {
  async up(queryInterface) {
    for (const column of COLUMNS) {
      // FK legada apontava para usuarios(id) UUID e bloquearia o ALTER TYPE.
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          DROP CONSTRAINT IF EXISTS item_estruturas_${column}_fkey;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          ALTER COLUMN ${column} TYPE integer USING NULL;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          DROP CONSTRAINT IF EXISTS fk_item_estruturas_${column}_users;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          ADD CONSTRAINT fk_item_estruturas_${column}_users
          FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE SET NULL;
      `);
    }
  },

  async down(queryInterface) {
    for (const column of COLUMNS) {
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          DROP CONSTRAINT IF EXISTS fk_item_estruturas_${column}_users;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE item_estruturas
          ALTER COLUMN ${column} TYPE uuid USING NULL;
      `);
    }
  },
};
