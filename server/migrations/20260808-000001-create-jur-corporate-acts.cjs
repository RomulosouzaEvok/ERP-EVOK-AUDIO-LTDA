'use strict';

/**
 * BLOCO 3 JUR — correção de 2 pendências reais (RF-JUR-030), decisão do
 * dono do produto em 2026-08-08.
 *
 * Cria `jur_corporate_acts` (Ato Societário — assembleia geral, reunião de
 * sócios, alteração contratual/estatutária, deliberação de diretoria,
 * outros). Entidade própria da Secretaria/Governança, SEM FK para
 * contrato/caso (ao contrário do restante do módulo, que sempre pendura em
 * `jur_contracts`/`jur_legal_cases`) — mesmo espírito de "documento
 * institucional" de `jur_proxies`, mas mais simples (sem contraparte).
 *
 * `status`: `draft → registered` (imutável depois de `registered`, mesmo
 * padrão de bloqueio pós-registro/pós-encerramento já usado em outras
 * entidades do módulo, ex. `jur_legal_cases.status='closed'`). O registro na
 * Junta Comercial (`registration_protocol`+`registered_at`) pode ficar
 * pendente por um tempo após `act_date` — por isso os dois campos são
 * nullable e a transição de status é decidida na aplicação
 * (`UpdateCorporateActUseCase`), não em CHECK de banco.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_corporate_acts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      act_type: {
        type: Sequelize.ENUM('general_assembly', 'partners_meeting', 'bylaw_amendment', 'board_resolution', 'other'),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      act_date: { type: Sequelize.DATEONLY, allowNull: false },
      registration_protocol: { type: Sequelize.STRING(60), allowNull: true, comment: 'Número de registro na Junta Comercial' },
      registered_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data do registro — pode ficar pendente por um tempo após act_date' },
      status: { type: Sequelize.ENUM('draft', 'registered'), allowNull: false, defaultValue: 'draft' },
      document_file_path: { type: Sequelize.STRING(500), allowNull: true, comment: 'Referência de arquivo — mesmo padrão de jur_contract_documents, sem upload real nesta rodada' },
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

    await queryInterface.addIndex('jur_corporate_acts', ['status'], { name: 'idx_jur_corporate_acts_status' });
    await queryInterface.addIndex('jur_corporate_acts', ['act_type'], { name: 'idx_jur_corporate_acts_act_type' });
    await queryInterface.addIndex('jur_corporate_acts', ['act_date'], { name: 'idx_jur_corporate_acts_act_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_corporate_acts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_corporate_acts_act_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_corporate_acts_status";');
  },
};
