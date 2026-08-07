'use strict';

/**
 * BLOCO 2 TI — UC-50, RF-TI-017 a 023, BR-TI-010/011.
 *
 * Cria `it_responsibility_terms` (Termo de Responsabilidade). Reutiliza
 * `assets` (BR-TI-008, nenhum cadastro paralelo de equipamento) e
 * `employees` — a atualização de `Asset.responsible_id`/`Asset.location`
 * na entrega/devolução é responsabilidade do use-case (transação única
 * termo+asset), não de trigger (mesma decisão arquitetural do projeto de
 * manter lógica de processo fora do banco, `06-ESTRUTURAS_PROGRAMAVEIS.md`).
 *
 * Invariante "no máximo 1 termo ACTIVE por asset" (BR-TI-010/RF-TI-019) é
 * garantida por ÍNDICE ÚNICO PARCIAL (não por trigger) — mesmo padrão já
 * aceito no projeto para `uq_production_downtimes_open_per_work_center` e
 * para `sst_eventos_esocial` (`uq_sst_eventos_esocial_origem_ativo`,
 * BLOCO_1_SST_MODELO_DADOS.md §5): garante a regra mesmo sob concorrência,
 * sem exigir lógica de processo em PL/pgSQL.
 *
 * FKs para `assets`/`employees`/`users` são `RESTRICT` (padrão do projeto):
 * termo é documento probatório de entrega/devolução de patrimônio, nunca
 * apagado (BR-TI-011 trata o bloqueio de desligamento com termo pendente).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_responsibility_terms', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      term_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      delivered_at: { type: Sequelize.DATE, allowNull: false },
      delivered_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      condition_on_delivery: { type: Sequelize.TEXT, allowNull: true },
      accessories: { type: Sequelize.TEXT, allowNull: true },
      acceptance_type: {
        type: Sequelize.ENUM('physical_signature', 'digital_ack'),
        allowNull: false,
      },
      signed_document_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Upload do termo assinado (infra Multer existente, CLAUDE.md §2). Validade juridica do digital_ack sem upload e parametro de aplicacao (RF-TI-046 item 2), nao trava de schema.',
      },
      returned_at: { type: Sequelize.DATE, allowNull: true },
      received_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      condition_on_return: { type: Sequelize.ENUM('ok', 'damaged', 'incomplete'), allowNull: true },
      return_notes: { type: Sequelize.TEXT, allowNull: true },
      lost_justification: { type: Sequelize.TEXT, allowNull: true, comment: 'Obrigatoria em app quando status=lost (extravio sem devolucao fisica possivel, UC-50 A2)' },
      related_ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'it_tickets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Chamado aberto quando devolucao e damaged (RF-TI-021)',
      },
      related_maintenance_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'maintenance_orders', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Alternativa a related_ticket_id quando a devolucao damaged vai direto para manutencao (RF-TI-021)',
      },
      status: {
        type: Sequelize.ENUM('active', 'returned', 'lost'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_it_responsibility_terms_active_per_asset
      ON it_responsibility_terms (asset_id)
      WHERE status = 'active';
    `);

    await queryInterface.addIndex('it_responsibility_terms', ['employee_id'], { name: 'idx_it_responsibility_terms_employee_id' });
    await queryInterface.addIndex('it_responsibility_terms', ['asset_id'], { name: 'idx_it_responsibility_terms_asset_id' });
    await queryInterface.addIndex('it_responsibility_terms', ['status'], { name: 'idx_it_responsibility_terms_status' });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_it_responsibility_terms_active_per_asset;');
    await queryInterface.dropTable('it_responsibility_terms');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_responsibility_terms_acceptance_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_responsibility_terms_condition_on_return";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_responsibility_terms_status";');
  },
};
