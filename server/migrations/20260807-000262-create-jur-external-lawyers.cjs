'use strict';

/**
 * BLOCO 3 JUR — UC-53, RF-JUR-013.
 *
 * Cria `jur_external_lawyers` (AdvogadoExterno). Vinculo opcional a
 * `suppliers.id` (UNIQUE, 1:1 quando existir) para faturamento de
 * honorarios via Contas a Pagar (o escritorio de advocacia so precisa
 * existir como Supplier quando ha faturamento formal; um advogado avulso
 * pode ser cadastrado aqui sem nunca virar Supplier).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_external_lawyers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      full_name: { type: Sequelize.STRING(150), allowNull: false },
      oab_number: { type: Sequelize.STRING(30), allowNull: false, comment: 'Numero de inscricao na OAB' },
      law_firm: { type: Sequelize.STRING(150), allowNull: true },
      document: { type: Sequelize.STRING(20), allowNull: true, comment: 'CPF/CNPJ' },
      contact_email: { type: Sequelize.STRING(150), allowNull: true },
      contact_phone: { type: Sequelize.STRING(30), allowNull: true },
      specialty: { type: Sequelize.STRING(150), allowNull: true },
      fee_terms: { type: Sequelize.TEXT, allowNull: true, comment: 'Condicoes de honorarios (texto livre)' },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        references: { model: 'suppliers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Vinculo 1:1 opcional para faturamento via Contas a Pagar',
      },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_external_lawyers', ['active'], { name: 'idx_jur_external_lawyers_active' });
    await queryInterface.addIndex('jur_external_lawyers', ['oab_number'], { name: 'idx_jur_external_lawyers_oab_number' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_external_lawyers');
  },
};
