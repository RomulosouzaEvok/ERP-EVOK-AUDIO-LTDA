'use strict';

/**
 * BLOCO 1 SST — UC-47, RF-SST-040/041/042/043, BR-SST-028/029/030,
 * RNF-SST-03.
 *
 * `sst_eventos_esocial`: fila única S-2210 (CAT) / S-2220 (ASO) / S-2240
 * (vínculo GES/risco × funcionário). Origem POLIMÓRFICA
 * (`origem_tipo` + `origem_id`), mesma exceção documentada em
 * `sst_acoes_corretivas` (20260806-000132) — aqui ainda mais justificada
 * porque as 3 origens (`sst_cats`, `sst_asos`, `sst_ges_funcionarios`) são
 * tabelas de módulos diferentes deste mesmo bloco, criadas em migrations
 * distintas; uma FK real exigiria 3 colunas nullable.
 *
 * IDEMPOTÊNCIA (RNF-SST-03, RF-SST-043 E2): índice único parcial
 * `uq_sst_eventos_esocial_origem_ativo` garante no máximo 1 evento
 * NÃO-REJEITADO por origem — evita duplicar o envio ao reprocessar a fila.
 * Reenvio após rejeição cria uma NOVA linha (o evento rejeitado permanece
 * visível no histórico, nunca é sobrescrito — RF-SST-043 A1).
 *
 * Nenhum DELETE é permitido (trigger) — "nenhum evento seja perdido ou
 * descartado silenciosamente" é um requisito legal (obrigação de
 * prestação de informação ao eSocial), não apenas operacional.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sst_eventos_esocial', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tipo: {
        type: Sequelize.ENUM('S-2210', 'S-2220', 'S-2240'),
        allowNull: false,
      },
      origem_tipo: {
        type: Sequelize.ENUM('cat', 'aso', 'ges_funcionario'),
        allowNull: false,
        comment: 'cat->sst_cats, aso->sst_asos, ges_funcionario->sst_ges_funcionarios (ver nota polimórfica no cabeçalho)',
      },
      origem_id: { type: Sequelize.INTEGER, allowNull: false },
      payload_referencia: { type: Sequelize.TEXT, allowNull: true, comment: 'Snapshot/referência dos dados enviados (JSON serializado), para auditoria sem depender do estado atual da origem' },
      prazo_legal: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Prazo calculado em app conforme calendário eSocial vigente (BR-SST-028/029, [VERIFICAR COM TÉCNICO SST DA EMPRESA])' },
      status: {
        type: Sequelize.ENUM('pendente', 'enviado', 'aceito', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      recibo: { type: Sequelize.STRING(80), allowNull: true },
      motivo_rejeicao: { type: Sequelize.TEXT, allowNull: true },
      data_envio: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sst_eventos_esocial', ['tipo'], { name: 'idx_sst_eventos_esocial_tipo' });
    await queryInterface.addIndex('sst_eventos_esocial', ['origem_tipo', 'origem_id'], { name: 'idx_sst_eventos_esocial_origem' });
    await queryInterface.addIndex('sst_eventos_esocial', ['status'], { name: 'idx_sst_eventos_esocial_status' });
    await queryInterface.addIndex('sst_eventos_esocial', ['prazo_legal'], { name: 'idx_sst_eventos_esocial_prazo_legal' });

    // No máximo 1 evento "ativo" (pendente/enviado/aceito) por origem —
    // rejeitado não conta para o índice, permitindo reenvio como nova linha.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_sst_eventos_esocial_origem_ativo
      ON sst_eventos_esocial (origem_tipo, origem_id)
      WHERE status <> 'rejeitado';
    `);

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION sst_block_delete_evento_esocial() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'sst_eventos_esocial id=% nao pode ser excluido (RNF-SST-03/RF-SST-043).', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_sst_block_delete_evento_esocial
      BEFORE DELETE ON sst_eventos_esocial
      FOR EACH ROW EXECUTE FUNCTION sst_block_delete_evento_esocial();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_sst_block_delete_evento_esocial ON sst_eventos_esocial;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS sst_block_delete_evento_esocial();');
    await queryInterface.dropTable('sst_eventos_esocial');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_eventos_esocial_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_eventos_esocial_origem_tipo";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sst_eventos_esocial_status";');
  },
};
