'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-048, processo P-FAC-03.6 (P2).
 *
 * `facility_correspondence`: registro simples de correspondência
 * recebida, sem workflow de aprovação. Destinatário pode ser um
 * funcionário específico ou um departamento (ao menos um dos dois
 * obrigatório, CHECK).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_correspondence')) return;

    await queryInterface.createTable('facility_correspondence', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      sender: { type: Sequelize.STRING(150), allowNull: true },
      recipient_employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      recipient_department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('letter', 'package', 'document', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      delivered_to: { type: Sequelize.STRING(150), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE facility_correspondence ADD CONSTRAINT ck_facility_correspondence_recipient_present
      CHECK (recipient_employee_id IS NOT NULL OR recipient_department_id IS NOT NULL);
    `);

    await queryInterface.addIndex('facility_correspondence', ['recipient_employee_id'], { name: 'idx_facility_correspondence_recipient_employee_id' });
    await queryInterface.addIndex('facility_correspondence', ['recipient_department_id'], { name: 'idx_facility_correspondence_recipient_department_id' });
    await queryInterface.addIndex('facility_correspondence', ['received_at'], { name: 'idx_facility_correspondence_received_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_correspondence');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_correspondence_type";');
  },
};
