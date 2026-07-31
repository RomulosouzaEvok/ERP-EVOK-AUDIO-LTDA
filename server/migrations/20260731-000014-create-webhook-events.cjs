'use strict';

const TABLE_NAME = 'webhook_events';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes(TABLE_NAME)) return;

    await queryInterface.createTable(TABLE_NAME, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      source: { type: Sequelize.STRING(50), allowNull: false, comment: 'Origem do webhook, ex.: "n8n"' },
      event_id: { type: Sequelize.STRING(200), allowNull: false, comment: 'Identificador de idempotencia do evento (unico por source)' },
      event_type: { type: Sequelize.STRING(100), allowNull: true },
      payload: { type: Sequelize.JSONB, allowNull: true },
      received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex(TABLE_NAME, ['source', 'event_id'], {
      unique: true,
      name: 'webhook_events_source_event_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
