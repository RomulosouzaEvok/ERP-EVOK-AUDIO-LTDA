'use strict';

/**
 * BLOCO 3 JUR — RF-JUR-031 a 034, BR-JUR-030/031, LPI arts. 84/108/133/195.
 *
 * Cria `jur_intellectual_property` (AtivoPI) e `jur_ip_contract_links` (vinculo
 * N:N com `jur_contracts`).
 *
 * SEGREDO INDUSTRIAL (RF-JUR-033, LPI art. 195 XI-XII): ativo tipo
 * `trade_secret` NUNCA armazena o conteudo do segredo. Isso e garantido
 * pela AUSENCIA ESTRUTURAL de qualquer coluna de conteudo/anexo de
 * segredo nesta tabela — so existem metadados genericos
 * (`description`, `holding_area`). Nao ha coluna "content"/"file_url"
 * capaz de guardar o segredo em si, para nenhum tipo de ativo — e um
 * enforcement por design de schema, nao por CHECK condicional (que
 * poderia ser contornado inserindo o conteudo em outro tipo de ativo).
 * A leitura restrita a `role=admin` + modulo `juridico` (RNF-JUR-01) e
 * responsabilidade de RBAC de aplicacao, fora do escopo desta migration.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_intellectual_property', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ip_type: {
        type: Sequelize.ENUM('trademark', 'patent', 'utility_model', 'industrial_design', 'copyright', 'trade_secret'),
        allowNull: false,
      },
      registration_number: { type: Sequelize.STRING(50), allowNull: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true, comment: 'Para trade_secret: descricao GENERICA apenas — nunca o conteudo do segredo (RF-JUR-033)' },
      holding_area: { type: Sequelize.STRING(150), allowNull: true, comment: 'Area detentora do segredo (relevante para trade_secret)' },
      filing_date: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de deposito' },
      grant_date: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de concessao' },
      expiration_date: { type: Sequelize.DATEONLY, allowNull: true },
      next_annuity_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Proxima anuidade/prorrogacao — janelas exatas por tipo sujeitas a conferencia nos certificados (RF-JUR-032)',
      },
      status: {
        type: Sequelize.ENUM('filed', 'granted', 'active', 'expired', 'abandoned'),
        allowNull: false,
        defaultValue: 'filed',
      },
      responsible_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_intellectual_property', ['ip_type'], { name: 'idx_jur_intellectual_property_ip_type' });
    await queryInterface.addIndex('jur_intellectual_property', ['status'], { name: 'idx_jur_intellectual_property_status' });
    await queryInterface.addIndex('jur_intellectual_property', ['next_annuity_date'], { name: 'idx_jur_intellectual_property_next_annuity_date' });
    await queryInterface.addIndex('jur_intellectual_property', ['expiration_date'], { name: 'idx_jur_intellectual_property_expiration_date' });

    await queryInterface.createTable('jur_ip_contract_links', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ip_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_intellectual_property', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_contracts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      link_description: { type: Sequelize.STRING(200), allowNull: true, comment: 'Ex.: "NDA que protege o segredo", "licenciamento da marca EVOK"' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('jur_ip_contract_links', {
      fields: ['ip_id', 'contract_id'],
      type: 'unique',
      name: 'uq_jur_ip_contract_links_ip_contract',
    });
    await queryInterface.addIndex('jur_ip_contract_links', ['contract_id'], { name: 'idx_jur_ip_contract_links_contract_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_ip_contract_links');
    await queryInterface.dropTable('jur_intellectual_property');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_intellectual_property_ip_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_intellectual_property_status";');
  },
};
