'use strict';

/**
 * BLOCO 1 SST — RF-SST-044 a 047, BR-SST-031/032.
 *
 * `sst_matriz_treinamento` (função × norma × periodicidade de reciclagem)
 * e `sst_treinamentos` (realizações, TreinamentoSST).
 *
 * Fecha aqui a FK de `sst_membros_cipa.treinamento_cipa_id ->
 * sst_treinamentos.id`, adiada em 20260806-000138 (ver nota de ordem
 * naquele arquivo).
 *
 * `validade` (data de reciclagem) é calculada em app: NR-10 é bienal
 * (confirmado no brief), demais normas são parametrizadas por
 * `sst_matriz_treinamento.periodicidade_meses` — nenhum valor de
 * periodicidade é hard-coded no banco (RF-SST-045,
 * `[VERIFICAR COM TÉCNICO SST DA EMPRESA]` para normas além da NR-10).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_matriz_treinamento', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      position: { type: Sequelize.STRING(100), allowNull: false, comment: 'Função (employees.position)' },
      norma: {
        type: Sequelize.ENUM('NR-6', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-20', 'NR-23_brigada', 'primeiros_socorros', 'CIPA', 'outro'),
        allowNull: false,
      },
      periodicidade_reciclagem_meses: { type: Sequelize.INTEGER, allowNull: true, comment: 'NULL = sem reciclagem periódica exigida (ex.: treinamento único); NR-10 = 24 (bienal, confirmado)' },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_matriz_treinamento', ['position'], { name: 'idx_sst_matriz_treinamento_position' });
    await queryInterface.addIndex('sst_matriz_treinamento', ['position', 'norma'], { name: 'uq_sst_matriz_treinamento_par', unique: true });

    await queryInterface.createTable('sst_treinamentos', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      norma: {
        type: Sequelize.ENUM('NR-6', 'NR-10', 'NR-11', 'NR-12', 'NR-17', 'NR-20', 'NR-23_brigada', 'primeiros_socorros', 'CIPA', 'DDS_tema', 'outro'),
        allowNull: false,
      },
      curso_descricao: { type: Sequelize.STRING(200), allowNull: true },
      data_realizacao: { type: Sequelize.DATEONLY, allowNull: false },
      carga_horaria: { type: Sequelize.INTEGER, allowNull: false, comment: 'Em horas' },
      instrutor_entidade: { type: Sequelize.STRING(150), allowNull: true },
      certificado_url: { type: Sequelize.STRING(255), allowNull: true },
      validade: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de reciclagem, calculada em app a partir de sst_matriz_treinamento.periodicidade_reciclagem_meses' },
      identificacao_operador: { type: Sequelize.STRING(60), allowNull: true, comment: 'RF-SST-047 (NR-11): crachá/identificação de operador de empilhadeira' },
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
    await queryInterface.addIndex('sst_treinamentos', ['employee_id'], { name: 'idx_sst_treinamentos_employee_id' });
    await queryInterface.addIndex('sst_treinamentos', ['norma'], { name: 'idx_sst_treinamentos_norma' });
    await queryInterface.addIndex('sst_treinamentos', ['validade'], { name: 'idx_sst_treinamentos_validade' });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_membros_cipa
      ADD CONSTRAINT fk_sst_membros_cipa_treinamento
      FOREIGN KEY (treinamento_cipa_id) REFERENCES sst_treinamentos (id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE sst_membros_cipa DROP CONSTRAINT IF EXISTS fk_sst_membros_cipa_treinamento;');
    await queryInterface.dropTable('sst_treinamentos');
    await queryInterface.dropTable('sst_matriz_treinamento');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_matriz_treinamento_norma";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_treinamentos_norma";');
  },
};
