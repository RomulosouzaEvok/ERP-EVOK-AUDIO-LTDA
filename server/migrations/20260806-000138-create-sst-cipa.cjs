'use strict';

/**
 * BLOCO 1 SST — UC-48, RF-SST-028 a 034, BR-SST-020 a 025.
 *
 * Cluster CIPA: `sst_mandatos_cipa`, `sst_membros_cipa`,
 * `sst_processos_eleitorais_cipa`, `sst_candidatos_cipa`,
 * `sst_reunioes_cipa`, `sst_reuniao_cipa_presentes`.
 *
 * ESTABILIDADE (RF-SST-031/BR-SST-022): `sst_membros_cipa.estabilidade_fim`
 * é uma trava de AVISO, não de bloqueio de banco — o próprio brief diz "o
 * módulo SST apenas trava com aviso forte; o bloqueio definitivo é decisão
 * jurídica/RH". Não há FK/trigger impedindo `employees.dismissal_date`
 * durante a estabilidade porque isso quebraria o fluxo real de desligamento
 * do RH sem decisão humana — a checagem é feita em aplicação
 * (`ArquitetoSoftwareAPI`/programador do RH), lendo `sst_membros_cipa` no
 * fluxo de desligamento.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_mandatos_cipa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      data_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      data_fim: { type: Sequelize.DATEONLY, allowNull: false },
      titulares_empregador: { type: Sequelize.INTEGER, allowNull: false, comment: 'Dimensionamento calculado (Quadro I NR-5) — nº titulares representantes do empregador' },
      titulares_empregados: { type: Sequelize.INTEGER, allowNull: false },
      suplentes_empregador: { type: Sequelize.INTEGER, allowNull: false },
      suplentes_empregados: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('eleicao_em_curso', 'vigente', 'encerrado'),
        allowNull: false,
        defaultValue: 'eleicao_em_curso',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE sst_mandatos_cipa ADD CONSTRAINT ck_sst_mandatos_cipa_datas CHECK (data_fim > data_inicio);
    `);
    await queryInterface.addIndex('sst_mandatos_cipa', ['status'], { name: 'idx_sst_mandatos_cipa_status' });
    await queryInterface.addIndex('sst_mandatos_cipa', ['data_inicio', 'data_fim'], { name: 'idx_sst_mandatos_cipa_vigencia' });

    await queryInterface.createTable('sst_membros_cipa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mandato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_mandatos_cipa', key: 'id' },
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
      origem: { type: Sequelize.ENUM('eleito', 'designado'), allowNull: false },
      papel: {
        type: Sequelize.ENUM('presidente', 'vice_presidente', 'secretario', 'titular', 'suplente'),
        allowNull: false,
      },
      votos_recebidos: { type: Sequelize.INTEGER, allowNull: true, comment: 'Preenchido apenas quando origem = eleito' },
      estabilidade_inicio: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Registro da candidatura (só para eleitos, BR-SST-022)' },
      estabilidade_fim: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Fim do mandato + 1 ano (calculado em app), BR-SST-022' },
      treinamento_cipa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK -> sst_treinamentos.id, fechada em 20260806-000139 (cluster Treinamentos criado depois) — obrigatória antes da posse (BR-SST-024), validado em app até a FK poder ser fechada',
      },
      posse_confirmada_em: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_membros_cipa', ['mandato_id'], { name: 'idx_sst_membros_cipa_mandato_id' });
    await queryInterface.addIndex('sst_membros_cipa', ['employee_id'], { name: 'idx_sst_membros_cipa_employee_id' });
    await queryInterface.addIndex('sst_membros_cipa', ['estabilidade_fim'], { name: 'idx_sst_membros_cipa_estabilidade_fim' });
    await queryInterface.addIndex('sst_membros_cipa', ['mandato_id', 'employee_id'], { name: 'uq_sst_membros_cipa_par', unique: true });

    await queryInterface.createTable('sst_processos_eleitorais_cipa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mandato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'sst_mandatos_cipa', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'unique: um processo eleitoral por mandato (entidade (b).13 do brief)',
      },
      data_edital: { type: Sequelize.DATEONLY, allowNull: true },
      data_inicio_inscricoes: { type: Sequelize.DATEONLY, allowNull: true },
      data_fim_inscricoes: { type: Sequelize.DATEONLY, allowNull: true },
      data_votacao: { type: Sequelize.DATEONLY, allowNull: true },
      total_votantes: { type: Sequelize.INTEGER, allowNull: true },
      atas_urls: { type: Sequelize.TEXT, allowNull: true, comment: 'Lista de URLs de atas do processo, serializada' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('sst_candidatos_cipa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      processo_eleitoral_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_processos_eleitorais_cipa', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'CASCADE: lista de candidatos não sobrevive à remoção do processo eleitoral (registro preparatório, diferente do mandato/membro já efetivado)',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      votos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      eleito: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_candidatos_cipa', ['processo_eleitoral_id'], { name: 'idx_sst_candidatos_cipa_processo_id' });
    await queryInterface.addIndex('sst_candidatos_cipa', ['processo_eleitoral_id', 'employee_id'], { name: 'uq_sst_candidatos_cipa_par', unique: true });

    await queryInterface.createTable('sst_reunioes_cipa', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mandato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_mandatos_cipa', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      tipo: { type: Sequelize.ENUM('ordinaria', 'extraordinaria'), allowNull: false },
      pauta: { type: Sequelize.TEXT, allowNull: true },
      ata_texto: { type: Sequelize.TEXT, allowNull: true },
      ata_arquivo_url: { type: Sequelize.STRING(255), allowNull: true },
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
    await queryInterface.addIndex('sst_reunioes_cipa', ['mandato_id', 'data'], { name: 'idx_sst_reunioes_cipa_mandato_data' });

    await queryInterface.createTable('sst_reuniao_cipa_presentes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      reuniao_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_reunioes_cipa', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      membro_cipa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_membros_cipa', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_reuniao_cipa_presentes', ['reuniao_id'], { name: 'idx_sst_reuniao_cipa_presentes_reuniao_id' });
    await queryInterface.addIndex('sst_reuniao_cipa_presentes', ['reuniao_id', 'membro_cipa_id'], { name: 'uq_sst_reuniao_cipa_presentes_par', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_reuniao_cipa_presentes');
    await queryInterface.dropTable('sst_reunioes_cipa');
    await queryInterface.dropTable('sst_candidatos_cipa');
    await queryInterface.dropTable('sst_processos_eleitorais_cipa');
    await queryInterface.dropTable('sst_membros_cipa');
    await queryInterface.dropTable('sst_mandatos_cipa');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_mandatos_cipa_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_membros_cipa_origem";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_membros_cipa_papel";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_reunioes_cipa_tipo";');
  },
};
