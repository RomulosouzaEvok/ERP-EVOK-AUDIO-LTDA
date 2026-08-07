'use strict';

/**
 * BLOCO 1 SST — RF-SST-011, BR-SST-011. PCMSO por função/GES.
 *
 * `sst_planos_exames`: define, por função (`employees.position`) e/ou GES
 * (`sst_ges`, criado em 000138 — FK adicionada como nullable aqui e não
 * validada por ordem de criação; ver nota abaixo), qual exame e com que
 * periodicidade. Usada para calcular o vencimento do ASO periódico
 * (BR-SST-011) e a sequência de audiometria (BR-SST-012).
 *
 * NOTA DE ORDEM: `ges_id` referencia `sst_ges`, criada só na migration
 * 000138 (cluster PGR/GES). Para não introduzir uma dependência de ordem
 * "para trás" (tabela criada antes existir referenciando uma criada
 * depois), a FK de `ges_id` é adicionada em 000138 via `addColumn` +
 * `addConstraint` depois que `sst_ges` existe — aqui a coluna nasce sem FK,
 * populável só depois. Ver 000138 para o fechamento do relacionamento.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_planos_exames', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      position: { type: Sequelize.STRING(100), allowNull: true, comment: 'Função (employees.position); alvo alternativo a ges_id' },
      ges_id: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK -> sst_ges.id, fechada em 20260806-000138 (ver nota de ordem no cabeçalho)' },
      tipo_exame: { type: Sequelize.STRING(80), allowNull: false, comment: 'Ex.: audiometria, espirometria, hemograma, acuidade visual, clinico geral' },
      periodicidade_meses: { type: Sequelize.INTEGER, allowNull: false, comment: 'Periodicidade em meses (ex.: 12 = anual)' },
      risco_exigente: { type: Sequelize.STRING(150), allowNull: true, comment: 'Risco/agente que justifica a exigência (texto livre, referência informativa; o vínculo formal fica em sst_risco_exames)' },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE sst_planos_exames ADD CONSTRAINT ck_sst_planos_exames_alvo_definido
      CHECK (position IS NOT NULL OR ges_id IS NOT NULL);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE sst_planos_exames ADD CONSTRAINT ck_sst_planos_exames_periodicidade_positiva
      CHECK (periodicidade_meses > 0);
    `);

    await queryInterface.addIndex('sst_planos_exames', ['position'], { name: 'idx_sst_planos_exames_position' });
    await queryInterface.addIndex('sst_planos_exames', ['ges_id'], { name: 'idx_sst_planos_exames_ges_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_planos_exames');
  },
};
