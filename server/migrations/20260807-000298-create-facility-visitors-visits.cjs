'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-044 a 047, BR-FAC-013, RNF-FAC-04.
 *
 * `facility_visitors`: cadastro mínimo de visitante (LGPD Art. 6º —
 * minimização de dado, RF-FAC-047). Sem `unique` em `document`: a mesma
 * pessoa pode ter múltiplos registros de visita ao longo do tempo; o
 * cadastro de visitante em si não é único por documento nesta primeira
 * versão (poderia ser deduplicado por aplicação no futuro, não é requisito
 * P1 deste bloco).
 *
 * `facility_visits`: check-in/check-out (RF-FAC-044/045). CHECK garante
 * que não há `checkout_at` sem `checkin_at` (banco recusa o estado
 * inconsistente, não só a aplicação).
 *
 * RNF-FAC-04: retenção de dado pessoal de visitante depende de política a
 * definir com Compliance — nenhuma rotina de expurgo automática é criada
 * aqui (nem coluna `deleted_at`/TTL); quando a política existir, é uma
 * migration futura, não uma suposição desta.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('facility_visitors')) {
      await queryInterface.createTable('facility_visitors', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        document: { type: Sequelize.STRING(30), allowNull: false },
        company: { type: Sequelize.STRING(150), allowNull: true },
        phone: { type: Sequelize.STRING(20), allowNull: true },
        photo_path: { type: Sequelize.STRING(500), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('facility_visitors', ['document'], { name: 'idx_facility_visitors_document' });
    }

    if (!tables.includes('facility_visits')) {
      await queryInterface.createTable('facility_visits', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        visitor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'facility_visitors', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        host_employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        scheduled_at: { type: Sequelize.DATE, allowNull: true },
        checkin_at: { type: Sequelize.DATE, allowNull: true },
        checkout_at: { type: Sequelize.DATE, allowNull: true },
        badge_number: { type: Sequelize.STRING(20), allowNull: true },
        purpose: { type: Sequelize.STRING(200), allowNull: true },
        areas_authorized: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('scheduled', 'onsite', 'completed', 'no_show', 'canceled'),
          allowNull: false,
          defaultValue: 'scheduled',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.sequelize.query(`
        ALTER TABLE facility_visits ADD CONSTRAINT ck_facility_visits_checkout_requires_checkin
        CHECK (checkout_at IS NULL OR checkin_at IS NOT NULL);
      `);

      await queryInterface.addIndex('facility_visits', ['visitor_id'], { name: 'idx_facility_visits_visitor_id' });
      await queryInterface.addIndex('facility_visits', ['host_employee_id'], { name: 'idx_facility_visits_host_employee_id' });
      await queryInterface.addIndex('facility_visits', ['status'], { name: 'idx_facility_visits_status' });
      await queryInterface.addIndex('facility_visits', ['checkin_at'], { name: 'idx_facility_visits_checkin_at' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_visits');
    await queryInterface.dropTable('facility_visitors');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_visits_status";');
  },
};
