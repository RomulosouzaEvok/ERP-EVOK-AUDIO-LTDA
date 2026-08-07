'use strict';

/**
 * BLOCO 1 SST — RF-SST-035 a 043, BR-SST-026 a 030.
 *
 * Cluster PGR/GRO + GES: `sst_ges`, `sst_ges_funcionarios` (N:N),
 * `sst_riscos_ocupacionais`, `sst_risco_epis` (N:N com `sst_tipos_epi`),
 * `sst_risco_exames` (associação informativa risco × tipo de exame).
 *
 * Fecha aqui a FK de `sst_planos_exames.ges_id -> sst_ges.id`, adiada em
 * 20260806-000133 (ver nota de ordem naquele arquivo), agora que `sst_ges`
 * existe.
 *
 * `sst_ges_funcionarios` é a origem do evento S-2240 (RF-SST-040): cada
 * INSERT (novo vínculo funcionário × GES/exposição) ou alteração relevante
 * deve gerar uma pendência em `sst_eventos_esocial` — geração é
 * responsabilidade do use-case, não de trigger (decisão arquitetural do
 * projeto, ver 06-ESTRUTURAS_PROGRAMAVEIS.md).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_ges', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING(150), allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_planos_exames
      ADD CONSTRAINT fk_sst_planos_exames_ges
      FOREIGN KEY (ges_id) REFERENCES sst_ges (id)
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await queryInterface.createTable('sst_ges_funcionarios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ges_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_ges', key: 'id' },
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
      inicio_exposicao: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Base do prazo de envio do S-2240 (BR-SST-028)' },
      fim_exposicao: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_ges_funcionarios', ['ges_id'], { name: 'idx_sst_ges_funcionarios_ges_id' });
    await queryInterface.addIndex('sst_ges_funcionarios', ['employee_id'], { name: 'idx_sst_ges_funcionarios_employee_id' });

    await queryInterface.createTable('sst_riscos_ocupacionais', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'RESTRICT (diferente de sst_matriz_epi.department_id, que é CASCADE): risco é registro histórico de avaliação, não deve desaparecer se o setor for reorganizado',
      },
      ges_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sst_ges', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      categoria_agente: {
        type: Sequelize.ENUM('fisico', 'quimico', 'biologico', 'ergonomico', 'mecanico_acidente'),
        allowNull: true,
        comment: 'NULL somente quando ausencia_risco_identificado = true (RF-SST-036/BR-SST-026) — ver CHECK ck_sst_riscos_ocupacionais_ausencia_coerente',
      },
      agente: { type: Sequelize.STRING(150), allowNull: true, comment: 'Ex.: ruído, cola/solvente. NULL somente quando ausencia_risco_identificado = true' },
      fonte_geradora: { type: Sequelize.STRING(200), allowNull: true },
      intensidade_concentracao: { type: Sequelize.STRING(100), allowNull: true, comment: 'Valor medido com unidade (ex.: 87 dB(A))' },
      data_medicao: { type: Sequelize.DATEONLY, allowNull: true },
      medido_por: { type: Sequelize.STRING(150), allowNull: true },
      severidade: { type: Sequelize.INTEGER, allowNull: true },
      probabilidade: { type: Sequelize.INTEGER, allowNull: true },
      classificacao_resultante: { type: Sequelize.STRING(50), allowNull: true, comment: 'Classificação de risco resultante (severidade × probabilidade), calculada em app' },
      medidas_controle: { type: Sequelize.TEXT, allowNull: true },
      ausencia_risco_identificado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'RF-SST-036: registro explícito de "nenhum risco identificado" para o setor' },
      data_revisao: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Última revisão do item do inventário (BR-SST-027)' },
      proxima_revisao_prevista: { type: Sequelize.DATEONLY, allowNull: true },
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
    // RF-SST-036/BR-SST-026: um setor sem risco identificado é registrado
    // com ausencia_risco_identificado = true e SEM agente/categoria_agente
    // (não faz sentido exigir um agente para "nenhum risco encontrado");
    // qualquer risco real exige os dois campos preenchidos. Adicionado na
    // auditoria cruzada (AuditorIntegrador, 2026-08-06) — o desenho original
    // teria NOT NULL em agente/categoria_agente, impossibilitando o cenário
    // de "ausência de risco" exigido pelo requisito.
    await queryInterface.sequelize.query(`
      ALTER TABLE sst_riscos_ocupacionais ADD CONSTRAINT ck_sst_riscos_ocupacionais_ausencia_coerente CHECK (
        (ausencia_risco_identificado = true AND categoria_agente IS NULL AND agente IS NULL)
        OR
        (ausencia_risco_identificado = false AND categoria_agente IS NOT NULL AND agente IS NOT NULL)
      );
    `);

    await queryInterface.addIndex('sst_riscos_ocupacionais', ['department_id'], { name: 'idx_sst_riscos_ocupacionais_department_id' });
    await queryInterface.addIndex('sst_riscos_ocupacionais', ['ges_id'], { name: 'idx_sst_riscos_ocupacionais_ges_id' });
    await queryInterface.addIndex('sst_riscos_ocupacionais', ['proxima_revisao_prevista'], { name: 'idx_sst_riscos_ocupacionais_proxima_revisao' });

    await queryInterface.createTable('sst_risco_epis', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      risco_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_riscos_ocupacionais', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tipo_epi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_tipos_epi', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_risco_epis', ['risco_id', 'tipo_epi_id'], { name: 'uq_sst_risco_epis_par', unique: true });

    await queryInterface.createTable('sst_risco_exames', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      risco_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sst_riscos_ocupacionais', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      tipo_exame: { type: Sequelize.STRING(80), allowNull: false, comment: 'Texto livre (catálogo aberto de exames, sem tabela normalizada — mesmo padrão de sst_planos_exames.tipo_exame)' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sst_risco_exames', ['risco_id'], { name: 'idx_sst_risco_exames_risco_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_risco_exames');
    await queryInterface.dropTable('sst_risco_epis');
    await queryInterface.dropTable('sst_riscos_ocupacionais');
    await queryInterface.dropTable('sst_ges_funcionarios');
    await queryInterface.sequelize.query('ALTER TABLE sst_planos_exames DROP CONSTRAINT IF EXISTS fk_sst_planos_exames_ges;');
    await queryInterface.dropTable('sst_ges');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_riscos_ocupacionais_categoria_agente";');
  },
};
