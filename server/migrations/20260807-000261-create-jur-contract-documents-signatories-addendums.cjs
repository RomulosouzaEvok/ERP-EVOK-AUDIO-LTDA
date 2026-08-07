'use strict';

/**
 * BLOCO 3 JUR — UC-52, RF-JUR-002/004/008, BR-JUR-003/004.
 *
 * Cria as 3 tabelas satélite de `jur_contracts`:
 * - `jur_contract_documents`: minutas versionadas (v1, v2...), com
 *   `is_signed_version` para a versão final assinada anexada.
 * - `jur_contract_signatories`: partes (`party_a`/`party_b`, minimo 2 exigido
 *   pela aplicacao antes de `signed`/`active`) e testemunhas opcionais
 *   (recomendadas para virar titulo executivo extrajudicial — CPC art.
 *   784, III — mas nao bloqueadas se ausentes).
 * - `jur_contract_addendums`: histórico imutável de aditivos (RF-JUR-008).
 *   Ao ser assinado (aplicação seta `signed_at`), a aplicação atualiza os
 *   campos vigentes de `jur_contracts` (`end_date`/`value`) na MESMA
 *   transação — o aditivo em si nunca é editado depois de criado (trigger
 *   `trg_jur_lock_contract_addendum`, mesmo padrão de imutabilidade das
 *   triggers `sst_lock_*` do Bloco 1, conforme decisão repassada §item 3).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_contract_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_contracts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false, comment: 'Sequencia v1, v2... por contrato' },
      file_url: { type: Sequelize.STRING(255), allowNull: false },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      uploaded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      observations: { type: Sequelize.TEXT, allowNull: true },
      is_signed_version: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('jur_contract_documents', {
      fields: ['contract_id', 'version_number'],
      type: 'unique',
      name: 'uq_jur_contract_documents_contract_version',
    });
    await queryInterface.addIndex('jur_contract_documents', ['contract_id'], { name: 'idx_jur_contract_documents_contract_id' });

    await queryInterface.createTable('jur_contract_signatories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_contracts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      signatory_role: {
        type: Sequelize.ENUM('party_a', 'party_b', 'witness'),
        allowNull: false,
        comment: 'party_a/party_b = partes (minimo 2 exigidas em aplicacao antes de signed/active — BR-JUR-004); witness = testemunha opcional recomendada',
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      document: { type: Sequelize.STRING(20), allowNull: true, comment: 'CPF/CNPJ' },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Vinculo opcional quando o signatario e funcionario interno',
      },
      signed_at: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('jur_contract_signatories', ['contract_id'], { name: 'idx_jur_contract_signatories_contract_id' });

    await queryInterface.createTable('jur_contract_addendums', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_contracts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      addendum_number: { type: Sequelize.INTEGER, allowNull: false, comment: 'Sequencial unico no par (contract_id, addendum_number)' },
      addendum_type: {
        type: Sequelize.ENUM('term', 'value', 'clause', 'party', 'other'),
        allowNull: false,
      },
      description: { type: Sequelize.TEXT, allowNull: false },
      previous_end_date: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Snapshot do valor vigente antes deste aditivo' },
      new_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      previous_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
      new_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
      document_url: { type: Sequelize.STRING(255), allowNull: true },
      signed_at: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('jur_contract_addendums', {
      fields: ['contract_id', 'addendum_number'],
      type: 'unique',
      name: 'uq_jur_contract_addendums_contract_number',
    });
    await queryInterface.addIndex('jur_contract_addendums', ['contract_id'], { name: 'idx_jur_contract_addendums_contract_id' });

    // Imutabilidade — RF-JUR-008 ("preservando o histórico do aditivo e os
    // valores anteriores imutáveis"). Exceção arquitetural documentada
    // (mesmo racional de `sst_lock_*`, ver docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md).
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION jur_lock_contract_addendum() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_contract_addendums id=% e imutavel; DELETE nao permitido (RF-JUR-008/RNF-JUR-02). Registre um novo aditivo corretivo.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_contract_addendums id=% e imutavel; UPDATE nao permitido (RF-JUR-008/RNF-JUR-02). Registre um novo aditivo corretivo.', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_jur_lock_contract_addendum
      BEFORE UPDATE OR DELETE ON jur_contract_addendums
      FOR EACH ROW EXECUTE FUNCTION jur_lock_contract_addendum();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_jur_lock_contract_addendum ON jur_contract_addendums;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS jur_lock_contract_addendum();');
    await queryInterface.dropTable('jur_contract_addendums');
    await queryInterface.dropTable('jur_contract_signatories');
    await queryInterface.dropTable('jur_contract_documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contract_addendums_addendum_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contract_signatories_signatory_role";');
  },
};
