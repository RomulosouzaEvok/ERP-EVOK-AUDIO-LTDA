'use strict';

/**
 * BLOCO 6 RH — Grupo 10 (Frequência / Ponto Eletrônico).
 *
 * Implementa o desenho aprovado pelo dono em 2026-08-12
 * (`docs/rh/04-FREQUENCIA.md`): a Evok Áudio possui os relógios de ponto
 * (REPs RWTech/Pointline), mas **não trata ponto** — uma administradora
 * externa faz isso e exporta o **AEJ** (Arquivo Eletrônico de Jornada,
 * Portaria MTP 671/2021, Anexo IX) já com a jornada tratada. O ERP só
 * IMPORTA esse resultado — mesmo padrão arquitetural de
 * `hr_payroll_import_batches`/`hr_payroll_import_items`
 * (`20260808-000024`, BUY/INTEGRAR).
 *
 * `hr_time_import_batches`: um lote por arquivo AEJ importado. `status`
 * ('uploaded' → 'validated'/'rejected' → 'confirmed') acompanha o ciclo:
 * o parser roda de forma síncrona no upload (sem fila), então o lote nasce
 * e sai de 'uploaded' na mesma requisição — 'uploaded' fica reservado como
 * marco transacional/for future async, nunca observado em repouso hoje.
 * 'rejected' é para falha ESTRUTURAL do arquivo (nenhum registro de
 * jornada reconhecido) — diferente de linha malformada isolada, que vira
 * entrada em `rejected_lines` (JSONB) sem derrubar o lote inteiro.
 *
 * `hr_time_import_items`: uma linha por funcionário×dia. `employee_id` é
 * NULLABLE de propósito — o casamento é por CPF (campo padrão do AEJ,
 * Anexo IX) contra `employees.cpf`; quando não casa, a linha entra mesmo
 * assim (`employee_id=NULL`, `original_registration` preserva a matrícula
 * do arquivo) para o relatório de "não-casados" antes da confirmação —
 * RH decide manualmente (cadastrar o funcionário, corrigir o CPF no
 * arquivo, ou ignorar).
 *
 * Sem UNIQUE(employee_id, work_date): mesma decisão da folha importada —
 * reimportação da mesma competência é permitida (cada lote é um evento
 * auditável), registrado como limitação conhecida em
 * `docs/rh/04-FREQUENCIA.md` (soma dupla se dois lotes da mesma
 * competência forem confirmados).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_time_import_batches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      filename: { type: Sequelize.STRING(255), allowNull: false },
      competencia_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      competencia_fim: { type: Sequelize.DATEONLY, allowNull: false },
      imported_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      imported_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      status: {
        type: Sequelize.ENUM('uploaded', 'validated', 'confirmed', 'rejected'),
        allowNull: false,
        defaultValue: 'uploaded',
      },
      total_lines: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      matched_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unmatched_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      rejected_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unknown_record_types: { type: Sequelize.JSONB, allowNull: true },
      rejected_lines: { type: Sequelize.JSONB, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_time_import_batches', ['status'], { name: 'idx_hr_time_import_batches_status' });
    await queryInterface.addIndex('hr_time_import_batches', ['competencia_inicio', 'competencia_fim'], { name: 'idx_hr_time_import_batches_competencia' });

    await queryInterface.createTable('hr_time_import_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'hr_time_import_batches', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // NULLABLE de proposito: linha nao-casada (matricula/CPF do AEJ sem
      // funcionario correspondente) fica com employee_id=NULL ate o RH
      // decidir. RESTRICT porque, uma vez casada, o funcionario nao pode
      // ser removido sem antes tratar o historico de ponto importado.
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      original_registration: { type: Sequelize.STRING(30), allowNull: true },
      cpf: { type: Sequelize.STRING(14), allowNull: true },
      work_date: { type: Sequelize.DATEONLY, allowNull: false },
      hours_worked: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      overtime_50: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      overtime_100: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      night_hours: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      absence: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      absence_justified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      absence_reason: { type: Sequelize.STRING(200), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('hr_time_import_items', ['batch_id'], { name: 'idx_hr_time_import_items_batch_id' });
    await queryInterface.addIndex('hr_time_import_items', ['employee_id', 'work_date'], { name: 'idx_hr_time_import_items_employee_date' });
    await queryInterface.addIndex('hr_time_import_items', ['cpf'], { name: 'idx_hr_time_import_items_cpf' });

    await queryInterface.sequelize.query(
      `COMMENT ON TABLE hr_time_import_batches IS 'Grupo 10 RH - lote de importacao do AEJ (Portaria MTP 671/2021, Anexo IX) exportado pela administradora dos REPs RWTech/Pointline - docs/rh/04-FREQUENCIA.md';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON TABLE hr_time_import_items IS 'Grupo 10 RH - linha funcionario x dia extraida do AEJ; employee_id NULL = matricula/CPF do arquivo sem funcionario correspondente (relatorio de nao-casados antes de confirmar)';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_time_import_items.employee_id IS 'FK employees.id, NULLABLE ate o casamento por CPF - ver docs/rh/04-FREQUENCIA.md';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_time_import_items');
    await queryInterface.dropTable('hr_time_import_batches');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_time_import_batches_status";');
  },
};
