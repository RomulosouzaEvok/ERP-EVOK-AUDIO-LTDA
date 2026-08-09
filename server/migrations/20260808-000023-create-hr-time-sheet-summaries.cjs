'use strict';

/**
 * BLOCO 6 RH — RF-RH-060 a 063 (Espelho de Ponto Consolidado — Importacao,
 * P8). Cobre APENAS a importacao/consumo do resumo mensal — o registro/
 * tratamento de ponto em si e BUY/INTEGRAR (RNF-RH-03, §6.2 do documento
 * de requisitos). Nenhuma regra legal de ponto (HE, adicional noturno,
 * banco de horas) e recalculada aqui.
 *
 * `competencia` (DATEONLY, sempre o dia 1 do mes — convencao de aplicacao)
 * com `UNIQUE(employee_id, competencia)`: uma unica linha "vigente" por
 * funcionario/mes — reimportacao da mesma competencia deve fazer UPSERT
 * (responsabilidade do use case de importacao), nao acumular duplicatas.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_time_sheet_summaries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      competencia: { type: Sequelize.DATEONLY, allowNull: false },
      horas_normais: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      he_50: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      he_100: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      adicional_noturno_horas: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      faltas_injustificadas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      atrasos_min: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      saldo_banco_horas: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      data_limite_compensacao_banco: { type: Sequelize.DATEONLY, allowNull: true },
      fonte: { type: Sequelize.ENUM('arquivo', 'manual'), allowNull: false, defaultValue: 'manual' },
      importado_em: { type: Sequelize.DATE, allowNull: true },
      importado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_time_sheet_summaries', ['employee_id', 'competencia'], {
      name: 'uq_hr_time_sheet_summaries_employee_competencia',
      unique: true,
    });
    await queryInterface.addIndex('hr_time_sheet_summaries', ['data_limite_compensacao_banco'], {
      name: 'idx_hr_time_sheet_summaries_data_limite_compensacao',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_time_sheet_summaries');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_time_sheet_summaries_fonte";');
  },
};
