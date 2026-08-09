'use strict';

/**
 * BLOCO 6 RH — RF-RH-007 a 012 (Admissao — Workflow, P1) — UC-69.
 *
 * Checklist de documentos obrigatorios (RG, CPF, CTPS digital, PIS,
 * comprovante de residencia, foto) modelado como flags booleanos fixos —
 * decisao deliberada, ao contrario do checklist variavel de
 * `marketing_event_checklist_items` (tabela filha): aqui a lista e fixa e
 * pequena (6 itens sempre os mesmos), nao ha necessidade de responsavel/
 * status por item nem de um item novo por processo.
 *
 * ASO admissional (RF-RH-008): o processo de admissao NAO tem `employee_id`
 * ainda (funcionario so existe apos a conclusao, RF-RH-009) — por isso o
 * resultado do ASO e armazenado como SNAPSHOT direto nesta tabela
 * (`aso_*`), nao como FK para `hr_employee_documents` (que exige
 * employee_id NOT NULL). Nenhuma FK cruza para o schema do modulo SST
 * (`sst_asos`) — RH consome apenas o status via endpoint de leitura,
 * mesmo padrao ja usado pelo proprio SST em relacao ao RH (ver
 * `docs/business/BLOCO_1_SST_MODELO_DADOS.md` §3.2).
 *
 * `employee_id`/`contract_id`/`job_history_id` sao preenchidos na conclusao
 * (RF-RH-009, mesma transacao) — FK RESTRICT, nullable ate a conclusao.
 *
 * CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09: `department_id`,
 * `job_position_id`, `candidate_cpf` e `planned_start_date` faltavam nesta
 * migration apesar de exigidos/aceitos pelo contrato de API
 * (`docs/business/BLOCO_6_RH_API.md` §4.1, `POST /admission-processes`) —
 * a tabela nao sustentava o payload documentado. Ver
 * `docs/business/BLOCO_6_RH_AUDITORIA.md` achado #1.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_admission_processes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      job_vacancy_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_job_vacancies', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      candidate_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_candidates', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      candidate_name: { type: Sequelize.STRING(200), allowNull: false },
      candidate_cpf: { type: Sequelize.STRING(14), allowNull: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      job_position_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_job_positions', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      planned_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      checklist_rg: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checklist_cpf: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checklist_ctps: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checklist_pis: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checklist_proof_of_address: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      checklist_photo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('documentos_pendentes', 'aso_pendente', 'aguardando_esocial', 'concluida', 'cancelada'),
        allowNull: false,
        defaultValue: 'documentos_pendentes',
      },
      cancel_reason: { type: Sequelize.TEXT, allowNull: true },
      aso_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      aso_result: { type: Sequelize.ENUM('apto', 'inapto', 'apto_com_restricao'), allowNull: true },
      aso_valid_until: { type: Sequelize.DATEONLY, allowNull: true },
      esocial_s2200_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      esocial_s2200_confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      contract_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_employee_contracts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      job_history_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_employee_job_history', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
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

    await queryInterface.addIndex('hr_admission_processes', ['status'], { name: 'idx_hr_admission_processes_status' });
    await queryInterface.addIndex('hr_admission_processes', ['employee_id'], { name: 'idx_hr_admission_processes_employee_id' });
    await queryInterface.addIndex('hr_admission_processes', ['department_id'], { name: 'idx_hr_admission_processes_department_id' });

    // RF-RH-010: data de inicio efetiva (hr_employee_contracts.start_date /
    // employees.hire_date, fora desta tabela) fica bloqueada para edicao
    // livre enquanto esocial_s2200_confirmed_at for NULL — regra de
    // aplicacao (nao expressavel como CHECK cross-table sem trigger; ver
    // decisao de nao usar trigger para regra de fluxo em
    // docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md).
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_admission_processes.esocial_s2200_confirmed_at IS 'RF-RH-010 - enquanto NULL, a data de inicio efetiva do funcionario fica bloqueada para edicao livre (regra de aplicacao)';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_admission_processes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_admission_processes_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_admission_processes_aso_result";');
  },
};
