'use strict';

/**
 * BLOCO 6 RH — RF-RH-070 a 073 (Custo Importado da Folha, cobre APENAS a
 * importacao do resultado ja calculado pelo provedor de folha — o calculo
 * em si e BUY/INTEGRAR, RNF-RH-03/§6.1).
 *
 * `bruto`/`liquido` (RF-RH-072): acesso MAIS restrito que a segregacao
 * padrao de campo do modulo `rh` — exige `rh` E nivel equivalente a
 * `financeiro`/`admin` (dado financeiro individual de alta sensibilidade,
 * mesmo racional do contencioso em `juridico`/BR-JUR-050). Decisao final
 * de nivel exato e do `ArquitetoSoftwareAPI` (§6.3 do documento de
 * requisitos); este bloco fixa a exigencia via COMMENT ON COLUMN.
 *
 * `cost_center_id` (RF-RH-071): reaproveita Centros de Custo ja existente
 * (`cost_centers`, `20260806-000020`) — alimenta relatorio financeiro de
 * custo de pessoal sem duplicar cadastro.
 *
 * Sem UNIQUE(competencia) em `hr_payroll_import_batches`: reimportacoes da
 * mesma competencia sao permitidas (cada lote e um evento distinto,
 * auditavel) — decisao deliberada, diferente de `hr_time_sheet_summaries`
 * (que faz UPSERT por competencia); aqui o dado e financeiro e o
 * historico de re-importacoes tem valor de auditoria.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_payroll_import_batches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      competencia: { type: Sequelize.DATEONLY, allowNull: false },
      importado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      importado_por: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      fonte: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_payroll_import_batches', ['competencia'], { name: 'idx_hr_payroll_import_batches_competencia' });

    await queryInterface.createTable('hr_payroll_import_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_payroll_import_batches', key: 'id' },
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
      bruto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      encargos: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      liquido: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      custo_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      cost_center_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cost_centers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_payroll_import_items', ['batch_id'], { name: 'idx_hr_payroll_import_items_batch_id' });
    await queryInterface.addIndex('hr_payroll_import_items', ['employee_id'], { name: 'idx_hr_payroll_import_items_employee_id' });
    await queryInterface.addIndex('hr_payroll_import_items', ['cost_center_id'], { name: 'idx_hr_payroll_import_items_cost_center_id' });

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_payroll_import_items.bruto IS 'RF-RH-072 - dado financeiro individual de alta sensibilidade - exige modulo rh E nivel financeiro/admin (mais restrito que a segregacao padrao rh/RF-RH-006)';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_payroll_import_items.liquido IS 'RF-RH-072 - dado financeiro individual de alta sensibilidade - exige modulo rh E nivel financeiro/admin (mais restrito que a segregacao padrao rh/RF-RH-006)';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_payroll_import_items');
    await queryInterface.dropTable('hr_payroll_import_batches');
  },
};
