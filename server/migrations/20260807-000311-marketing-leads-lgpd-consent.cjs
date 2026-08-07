'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-035/036 (BR-MKT-012).
 *
 * Adiciona o campo estrutural de consentimento LGPD ao lead — a
 * verificação (`BLOCO_5_MKT_VERIFICACAO.md` §2.4) apontou que sua
 * ausência já era um problema ("hoje seria necessária uma nova migration
 * para adicionar"): esta é exatamente essa migration.
 *
 * `POST /api/marketing/leads` aceita os 3 campos como **opcionais** nesta
 * rodada (RF-MKT-036 — não bloquear captação por ausência de consentimento
 * explícito, decisão de negócio real fica com Compliance); todas as
 * colunas nascem nullable/`false` por padrão, sem backfill necessário
 * (nenhum lead existente tem esse dado, e não há como inferi-lo
 * retroativamente).
 *
 * Rotina de anonimização/expurgo de leads `lost` após X meses
 * (RF-MKT-037) **não entra nesta correção** — fica registrada como
 * pendência P3 explícita, ver `docs/business/BLOCO_5_MKT_MODELO_DADOS.md`
 * §7.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('marketing_leads');

    if (!columns.consent_given) {
      await queryInterface.addColumn('marketing_leads', 'consent_given', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.consent_given IS 'RF-MKT-035 — flag de consentimento LGPD explicito do titular do lead';`
      );
    }

    if (!columns.consent_date) {
      await queryInterface.addColumn('marketing_leads', 'consent_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.consent_date IS 'RF-MKT-035 — momento em que o consentimento foi registrado, nulo se consent_given=false';`
      );
    }

    if (!columns.consent_channel) {
      await queryInterface.addColumn('marketing_leads', 'consent_channel', {
        type: Sequelize.ENUM('formulario_site', 'whatsapp', 'telefone', 'feira', 'indicacao', 'outro'),
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.consent_channel IS 'RF-MKT-035 — canal pelo qual o consentimento foi capturado';`
      );
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('marketing_leads');
    if (columns.consent_channel) {
      await queryInterface.removeColumn('marketing_leads', 'consent_channel');
    }
    if (columns.consent_date) {
      await queryInterface.removeColumn('marketing_leads', 'consent_date');
    }
    if (columns.consent_given) {
      await queryInterface.removeColumn('marketing_leads', 'consent_given');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_leads_consent_channel";');
  },
};
