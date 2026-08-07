'use strict';

/**
 * BLOCO 3 JUR — UC-55, RF-JUR-026 a 029, BR-JUR-020/021, Codigo Civil
 * art. 682, I.
 *
 * Cria `jur_proxies` (Procuracao). `grantee_employee_id`/`grantee_external_lawyer_id`
 * sao FKs opcionais (nao mutuamente exclusivas por CHECK, ao contrario da
 * contraparte de `jur_contracts` — o outorgado pode ser identificado por
 * nome/documento livre sem cadastro, ou vinculado a UM dos dois cadastros
 * quando existir; o brief nao exige exclusividade estrita aqui como exige
 * para a contraparte do contrato).
 *
 * `status='revoked'` some IMEDIATAMENTE das listagens de vigentes — isso e
 * responsabilidade de QUERY da aplicacao (filtro `status = 'active'`), nao
 * de uma view/trigger dedicada: a garantia de "sem lag admissivel" (E1 de
 * UC-55) vem do UPDATE sincrono de `status` acontecer na mesma transacao
 * do registro de revogacao, nao de um mecanismo de banco adicional.
 *
 * `superseded_proxy_id` (self-FK) resolve UC-55 A2 (renovacao = nova
 * procuracao referenciando a anterior, preservando o historico de
 * outorgas, em vez de estender a data da existente).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_proxies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      grantor_name: { type: Sequelize.STRING(200), allowNull: false, defaultValue: 'EVOK ÁUDIO LTDA' },
      grantee_name: { type: Sequelize.STRING(200), allowNull: false },
      grantee_document: { type: Sequelize.STRING(20), allowNull: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      external_lawyer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'jur_external_lawyers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      powers_description: { type: Sequelize.TEXT, allowNull: false },
      power_tags: { type: Sequelize.STRING(255), allowNull: true, comment: 'Lista livre: ad_judicia, ad_negotia, banking, other' },
      proxy_form: { type: Sequelize.ENUM('public', 'private'), allowNull: false },
      issue_date: { type: Sequelize.DATEONLY, allowNull: false },
      expiration_date: { type: Sequelize.DATEONLY, allowNull: true, comment: 'NULL = vigencia indeterminada' },
      alert_advance_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      status: { type: Sequelize.ENUM('active', 'revoked', 'expired'), allowNull: false, defaultValue: 'active' },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      revocation_communication: { type: Sequelize.TEXT, allowNull: true, comment: 'Registro de comunicacao da revogacao' },
      superseded_proxy_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'jur_proxies', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Procuracao anterior substituida por esta (renovacao — UC-55 A2)',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE jur_proxies ADD CONSTRAINT ck_jur_proxies_revoked_requires_data
      CHECK (status <> 'revoked' OR (revoked_at IS NOT NULL AND revocation_communication IS NOT NULL));
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_proxies ADD CONSTRAINT ck_jur_proxies_alert_advance_days_non_negative CHECK (alert_advance_days >= 0);
    `);

    await queryInterface.addIndex('jur_proxies', ['status'], { name: 'idx_jur_proxies_status' });
    await queryInterface.addIndex('jur_proxies', ['expiration_date'], { name: 'idx_jur_proxies_expiration_date' });
    await queryInterface.addIndex('jur_proxies', ['employee_id'], { name: 'idx_jur_proxies_employee_id' });
    await queryInterface.addIndex('jur_proxies', ['external_lawyer_id'], { name: 'idx_jur_proxies_external_lawyer_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_proxies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_proxies_proxy_form";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_proxies_status";');
  },
};
