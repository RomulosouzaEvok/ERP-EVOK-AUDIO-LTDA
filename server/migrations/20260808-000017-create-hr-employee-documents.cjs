'use strict';

/**
 * BLOCO 6 RH — RF-RH-027 a 030 (Documentos do Funcionario).
 *
 * `doc_type` inclui os 5 subtipos de ASO (`aso_admissional`,
 * `aso_periodico`, `aso_retorno`, `aso_mudanca_risco`, `aso_demissional`) —
 * RF-RH-028 e explicito: apenas APTIDAO e VALIDADE sao armazenados aqui, o
 * laudo clinico permanece exclusivamente com a SST (LGPD art. 5o II). Nao
 * ha coluna de laudo/arquivo clinico nesta tabela — `file_path` guarda
 * apenas o documento administrativo (ex.: atestado de aptidao assinado),
 * nunca o prontuario.
 *
 * `origin` distingue documento gerado pelo proprio fluxo de RH
 * (`aso_retorno` confirmado pelo RH a partir do status da SST) de
 * documento de origem SST replicado por integracao — RF-RH-027.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_employee_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      doc_type: {
        type: Sequelize.ENUM(
          'rg',
          'cpf',
          'ctps',
          'aso_admissional',
          'aso_periodico',
          'aso_retorno',
          'aso_mudanca_risco',
          'aso_demissional',
          'contrato',
          'certificado',
          'outro'
        ),
        allowNull: false,
      },
      file_path: { type: Sequelize.STRING(255), allowNull: false },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },
      aptitude_result: { type: Sequelize.ENUM('apto', 'inapto', 'apto_com_restricao'), allowNull: true },
      origin: { type: Sequelize.ENUM('rh', 'sst'), allowNull: false, defaultValue: 'rh' },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_employee_documents', ['employee_id'], { name: 'idx_hr_employee_documents_employee_id' });
    await queryInterface.addIndex('hr_employee_documents', ['employee_id', 'doc_type'], { name: 'idx_hr_employee_documents_employee_type' });
    await queryInterface.addIndex('hr_employee_documents', ['valid_until'], { name: 'idx_hr_employee_documents_valid_until' });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_employee_documents.aptitude_result IS 'RF-RH-028 - apenas para doc_type aso_* - somente aptidao/validade, nunca laudo clinico (LGPD art. 5o II)';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_employee_documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_documents_doc_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_documents_aptitude_result";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_employee_documents_origin";');
  },
};
