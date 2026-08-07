'use strict';

/**
 * BLOCO 3 JUR — RF-JUR-005/006/022/027/032/038 (entidade unica de alerta
 * para todo o modulo Juridico, conforme §2 do documento de requisitos).
 *
 * Cria `jur_legal_alerts` (AlertaJuridico). Origem POLIMORFICA
 * (`origin_type` + `origin_id`, SEM FK real) — aponta para 5 tabelas
 * heterogeneas (`jur_contracts`, `jur_proxies`, `jur_legal_case_deadlines`,
 * `jur_intellectual_property`, `jur_lgpd_data_subject_requests`). Mesma excecao
 * documentada ja aceita no projeto para `sst_acoes_corretivas`/
 * `sst_eventos_esocial` (Bloco 1 SST) — 5 colunas de FK nullable sempre-4-
 * vazias poluiriam o schema sem ganho real de integridade (Postgres nao
 * valida FK condicional por `origin_type` sem trigger adicional, que o
 * projeto evita por principio). A integridade de `origin_id` e
 * responsabilidade do use-case que cria o AlertaJuridico (sempre a partir
 * de uma transacao que ja tem a origem carregada em memoria).
 *
 * RNF-JUR-04 (alertas de prazo fatal nao podem ser desativados por
 * ninguem): esta tabela deliberadamente NAO tem nenhuma coluna
 * "disabled"/"muted"/"active" — nao ha campo para desativar um alerta,
 * apenas para reconhece-lo (`acknowledged`) ou resolve-lo
 * (`resolved`, quando a origem deixa de precisar do alerta, ex.: contrato
 * renovado). Enforcement por AUSENCIA de mecanismo, mesma tecnica de
 * `jur_legal_case_deadlines` (migration 000165) e `jur_intellectual_property`
 * (migration 000170, RF-JUR-033).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_legal_alerts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      origin_type: {
        type: Sequelize.ENUM('contract', 'proxy', 'intellectual_property', 'lgpd_request', 'legal_case_deadline'),
        allowNull: false,
      },
      origin_id: { type: Sequelize.INTEGER, allowNull: false, comment: 'Polimorfico — sem FK real (ver cabecalho da migration)' },
      alert_subtype: {
        type: Sequelize.STRING(40),
        allowNull: false,
        comment: 'Ex.: expiration, renewal_notice, adjustment_index, d7, d3, d1, d0, escalation, annuity, response_d5, response_d1',
      },
      due_date: { type: Sequelize.DATEONLY, allowNull: false, comment: 'Data em que o alerta deve disparar' },
      recipient_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('pending', 'acknowledged', 'escalated', 'resolved'),
        allowNull: false,
        defaultValue: 'pending',
      },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      escalated_to_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      escalated_at: { type: Sequelize.DATE, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_legal_alerts', ['origin_type', 'origin_id'], { name: 'idx_jur_legal_alerts_origin' });
    await queryInterface.addIndex('jur_legal_alerts', ['recipient_user_id', 'status'], { name: 'idx_jur_legal_alerts_recipient_status' });
    await queryInterface.addIndex('jur_legal_alerts', ['due_date'], { name: 'idx_jur_legal_alerts_due_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_legal_alerts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_alerts_origin_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_alerts_status";');
  },
};
