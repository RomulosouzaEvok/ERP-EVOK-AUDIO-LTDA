'use strict';

/**
 * BLOCO 1 SST — RF-SST-048 a 053, BR-SST-033/034/035.
 *
 * Cluster de rotina preventiva (P1/P2, sem UC formal detalhado neste bloco
 * — ver BLOCO_1_SST_REQUISITOS.md §7): `sst_inspecoes_seguranca` +
 * `sst_inspecao_itens`, `sst_permissoes_trabalho` + `sst_pt_executantes`,
 * `sst_brigadistas`, `sst_registros_dds` + `sst_dds_presencas`.
 *
 * Não-conformidade de inspeção grave/iminente (RF-SST-049) não tem coluna
 * dedicada de "risco grave e iminente": é modelada como
 * `sst_inspecao_itens.conforme = false` combinado com a criação de uma
 * `sst_acoes_corretivas` com `prazo` imediato — a sinalização de urgência é
 * responsabilidade da aplicação (notificação), não estrutural de banco.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_inspecoes_seguranca', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      checklist_modelo: { type: Sequelize.STRING(150), allowNull: true, comment: 'Nome do checklist aplicado (ex.: extintores, proteção NR-12, sinalização NR-26)' },
      inspetor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_inspecoes_seguranca', ['department_id', 'data'], { name: 'idx_sst_inspecoes_seguranca_dept_data' });

    await queryInterface.createTable('sst_inspecao_itens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      inspecao_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_inspecoes_seguranca', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      item_verificado: { type: Sequelize.STRING(200), allowNull: false },
      conforme: { type: Sequelize.BOOLEAN, allowNull: false },
      observacao: { type: Sequelize.TEXT, allowNull: true },
      acao_corretiva_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sst_acoes_corretivas', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Preenchida quando conforme = false (BR-SST-033: NC gera AcaoCorretiva obrigatória)',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_inspecao_itens', ['inspecao_id'], { name: 'idx_sst_inspecao_itens_inspecao_id' });
    await queryInterface.addIndex('sst_inspecao_itens', ['conforme'], { name: 'idx_sst_inspecao_itens_conforme' });

    await queryInterface.createTable('sst_permissoes_trabalho', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      atividade: { type: Sequelize.STRING(200), allowNull: false },
      tipo_risco: { type: Sequelize.STRING(100), allowNull: false, comment: 'Ex.: trabalho a quente, elétrica energizada (NR-10), altura (NR-35), espaço confinado (NR-33)' },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      requisitos_verificados: { type: Sequelize.TEXT, allowNull: true, comment: 'Checklist de requisitos verificados, serializado' },
      autorizante_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      inicio_validade: { type: Sequelize.DATE, allowNull: false },
      fim_validade: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('emitida', 'encerrada', 'cancelada'),
        allowNull: false,
        defaultValue: 'emitida',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE sst_permissoes_trabalho ADD CONSTRAINT ck_sst_permissoes_trabalho_validade CHECK (fim_validade > inicio_validade);
    `);
    await queryInterface.addIndex('sst_permissoes_trabalho', ['status', 'fim_validade'], { name: 'idx_sst_permissoes_trabalho_status_fim' });

    await queryInterface.createTable('sst_pt_executantes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      permissao_trabalho_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_permissoes_trabalho', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_pt_executantes', ['permissao_trabalho_id', 'employee_id'], { name: 'uq_sst_pt_executantes_par', unique: true });

    await queryInterface.createTable('sst_brigadistas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data_formacao: { type: Sequelize.DATEONLY, allowNull: false },
      validade_reciclagem: { type: Sequelize.DATEONLY, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_brigadistas', ['ativo'], { name: 'idx_sst_brigadistas_ativo' });
    await queryInterface.addIndex('sst_brigadistas', ['validade_reciclagem'], { name: 'idx_sst_brigadistas_validade' });

    await queryInterface.createTable('sst_registros_dds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      turno: { type: Sequelize.ENUM('morning', 'afternoon', 'night', 'commercial', 'rotating'), allowNull: true, comment: 'Mesmo enum de employees.shift para consistência' },
      tema: { type: Sequelize.STRING(200), allowNull: false },
      condutor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_registros_dds', ['department_id', 'data'], { name: 'idx_sst_registros_dds_dept_data' });

    await queryInterface.createTable('sst_dds_presencas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      registro_dds_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_registros_dds', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_dds_presencas', ['registro_dds_id', 'employee_id'], { name: 'uq_sst_dds_presencas_par', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_dds_presencas');
    await queryInterface.dropTable('sst_registros_dds');
    await queryInterface.dropTable('sst_brigadistas');
    await queryInterface.dropTable('sst_pt_executantes');
    await queryInterface.dropTable('sst_permissoes_trabalho');
    await queryInterface.dropTable('sst_inspecao_itens');
    await queryInterface.dropTable('sst_inspecoes_seguranca');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_permissoes_trabalho_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_registros_dds_turno";');
  },
};
