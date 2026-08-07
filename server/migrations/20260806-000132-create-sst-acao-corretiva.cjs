'use strict';

/**
 * BLOCO 1 SST — entidade (b).10 do brief, reutilizada por
 * InvestigacaoAcidente (UC-46), ReuniaoCIPA (UC-48), InspecaoSeguranca e
 * PGR (RF-SST-037/048).
 *
 * `sst_acoes_corretivas` usa origem POLIMÓRFICA (`origem_tipo` +
 * `origem_id`) porque o plano de ação é disparado por 4 entidades-pai
 * heterogêneas (investigação de acidente, reunião CIPA, inspeção de
 * segurança, plano de ação do PGR). Isso é uma EXCEÇÃO DELIBERADA à regra
 * "toda FK crítica tem integridade referencial no banco" (CLAUDE.md §2):
 * o Postgres não oferece uma FK polimórfica nativa sem `CHECK` complexo
 * por tabela de destino distinta; a alternativa (4 colunas de FK nullable,
 * uma por origem possível) foi descartada por gerar 3 colunas sempre NULL
 * por linha. A integridade de `origem_id` é validada pela aplicação
 * (use-case), documentada aqui para não ser lida como omissão.
 *
 * `responsavel_id` SEMPRE aponta para `employees` (FK real, obrigatória) —
 * esse relacionamento não é polimórfico e mantém integridade total.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_acoes_corretivas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      origem_tipo: {
        type: Sequelize.ENUM('investigacao_acidente', 'reuniao_cipa', 'inspecao_seguranca', 'pgr'),
        allowNull: false,
        comment: 'Entidade de origem (polimórfica, ver nota de exceção no cabeçalho do arquivo)',
      },
      origem_id: { type: Sequelize.INTEGER, allowNull: false, comment: 'PK da entidade de origem, sem FK de banco (ver nota polimórfica)' },
      descricao: { type: Sequelize.TEXT, allowNull: false },
      responsavel_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      prazo: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('aberta', 'em_andamento', 'concluida', 'atrasada'),
        allowNull: false,
        defaultValue: 'aberta',
      },
      evidencia_conclusao_url: { type: Sequelize.STRING(255), allowNull: true },
      concluida_em: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.addIndex('sst_acoes_corretivas', ['origem_tipo', 'origem_id'], { name: 'idx_sst_acoes_corretivas_origem' });
    await queryInterface.addIndex('sst_acoes_corretivas', ['responsavel_id'], { name: 'idx_sst_acoes_corretivas_responsavel_id' });
    await queryInterface.addIndex('sst_acoes_corretivas', ['status', 'prazo'], { name: 'idx_sst_acoes_corretivas_status_prazo' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sst_acoes_corretivas');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_acoes_corretivas_origem_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_acoes_corretivas_status";');
  },
};
