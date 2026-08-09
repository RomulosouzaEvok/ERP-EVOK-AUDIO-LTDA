'use strict';

/**
 * BLOCO 3 JUR — correção de 2 pendências reais (RF-JUR-003), decisão do
 * dono do produto em 2026-08-08.
 *
 * Cria `jur_contract_approvals` (alçada de aprovação de contrato por
 * valor). `approver_role` é SEMPRE determinado pelo módulo de acesso do
 * usuário logado no momento do `POST /api/jur/contracts/:id/approve`
 * (`req.user.permissions.diretor`/`.financeiro`), nunca aceito do body —
 * mesmo padrão anti-spoofing de `approver_user_id`
 * (`server/src/modules/juridico/domain/constants.ts` documenta os
 * thresholds de valor). Unique (`contract_id`, `approver_role`) impede
 * duplicidade — um único approval por papel por contrato.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_contract_approvals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_contracts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      approver_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      approver_role: { type: Sequelize.ENUM('diretor', 'financeiro'), allowNull: false },
      approved_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('jur_contract_approvals', {
      fields: ['contract_id', 'approver_role'],
      type: 'unique',
      name: 'uq_jur_contract_approvals_contract_role',
    });

    await queryInterface.addIndex('jur_contract_approvals', ['contract_id'], { name: 'idx_jur_contract_approvals_contract_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_contract_approvals');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contract_approvals_approver_role";');
  },
};
