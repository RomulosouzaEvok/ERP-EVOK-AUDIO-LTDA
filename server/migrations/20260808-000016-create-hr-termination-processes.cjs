'use strict';

/**
 * BLOCO 6 RH — RF-RH-017 a 023 (Demissao/Rescisao, P3) — UC-70.
 *
 * `payment_deadline` (RF-RH-018) e coluna GERADA (`GENERATED ALWAYS AS ...
 * STORED`) — `termination_date + 10 dias corridos` — garantida no banco em
 * vez de calculada em cada leitura pela aplicacao, para eliminar drift
 * entre telas/relatorios. Sequelize `createTable` nao suporta coluna
 * gerada nativamente; adicionada via SQL bruto apos o `createTable`.
 *
 * Checklist de devolucao de ativos/EPI (RF-RH-023) integra com Patrimonio
 * via `Asset.responsible_id` (tabela `assets`, ja existente) — sem tabela
 * dedicada aqui; `checklist_assets_returned` e a flag que o use case seta
 * apos confirmar que nenhum `assets.responsible_id` do funcionario segue
 * aberto (ou que nunca houve ativo vinculado).
 *
 * ASO demissional (RF-RH-020): mesmo padrao de snapshot direto de
 * `hr_admission_processes.aso_*` (RF-RH-008) — aqui o funcionario ja
 * existe, mas manter o mesmo desenho evita duas formas distintas de
 * registrar a mesma integracao SST->RH no mesmo bloco.
 *
 * CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09: `trct_paid_at` faltava
 * apesar de referenciado pelo contrato de API (`docs/business/
 * BLOCO_6_RH_API.md` §6.2, RF-RH-018/021 — marcador informativo de
 * pagamento das verbas rescisorias, preenchido via `POST
 * /termination-processes/:id/trct` com `{ paid: true }`). Ver
 * `docs/business/BLOCO_6_RH_AUDITORIA.md` achado #5.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_termination_processes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      termination_type: {
        type: Sequelize.ENUM('pedido', 'sem_justa_causa', 'justa_causa', 'termino_experiencia', 'acordo'),
        allowNull: false,
      },
      notice_date: { type: Sequelize.DATEONLY, allowNull: false },
      notice_modality: { type: Sequelize.ENUM('trabalhado', 'indenizado'), allowNull: false },
      termination_date: { type: Sequelize.DATEONLY, allowNull: true },
      trct_file_path: { type: Sequelize.STRING(255), allowNull: true },
      trct_paid_at: { type: Sequelize.DATE, allowNull: true },
      s2299_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      s2299_confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      aso_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      aso_result: { type: Sequelize.ENUM('apto', 'inapto', 'apto_com_restricao'), allowNull: true },
      checklist_assets_returned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('aberto', 'aguardando_aso', 'aguardando_trct', 'concluido', 'cancelado'),
        allowNull: false,
        defaultValue: 'aberto',
      },
      cancel_reason: { type: Sequelize.TEXT, allowNull: true },
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
      ALTER TABLE hr_termination_processes
      ADD COLUMN payment_deadline DATE GENERATED ALWAYS AS (termination_date + 10) STORED;
    `);
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_termination_processes.payment_deadline IS 'RF-RH-018 - gerado pelo banco: termination_date + 10 dias corridos (CLT art. 477 par. 6o)';`
    );

    await queryInterface.addIndex('hr_termination_processes', ['employee_id'], { name: 'idx_hr_termination_processes_employee_id' });
    await queryInterface.addIndex('hr_termination_processes', ['status'], { name: 'idx_hr_termination_processes_status' });
    await queryInterface.addIndex('hr_termination_processes', ['payment_deadline'], { name: 'idx_hr_termination_processes_payment_deadline' });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_termination_processes ADD CONSTRAINT ck_hr_termination_processes_concluido_requires_checklist
      CHECK (status <> 'concluido' OR checklist_assets_returned = true);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_termination_processes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_termination_processes_termination_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_termination_processes_notice_modality";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_termination_processes_aso_result";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_termination_processes_status";');
  },
};
