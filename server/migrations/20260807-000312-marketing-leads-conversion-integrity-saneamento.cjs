'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-001/002/004, §2 "Migration de
 * Saneamento de Dados (obrigatória, P0)" de
 * `docs/business/BLOCO_5_MKT_REQUISITOS.md`.
 *
 * PROBLEMA: `marketing_leads.status='converted'` sem
 * `converted_to_customer_id` preenchido é um estado alcançável hoje
 * (`BLOCO_5_MKT_VERIFICACAO.md`, achado BR-MKT-008/2.1) — a aplicação
 * (`ChangeLeadStatusUseCase`) só grava o vínculo `if (converted_to_
 * customer_id)`, nunca exige. Esta migration fecha essa porta no banco,
 * não só na aplicação (CLAUDE.md §7 "A Verdade no Banco").
 *
 * DECISÃO DE SANEAMENTO (§2 do documento de requisitos era
 * `[VERIFICAR COM MARKETING]`, com recomendação técnica explícita — opção
 * (a) adotada nesta migration, caminho REVERSÍVEL):
 *
 *   Leads `converted` órfãos (sem `converted_to_customer_id`) são
 *   REBAIXADOS para `status='qualified'` (único estado imediatamente
 *   anterior a `converted` que existia no funil ANTES desta correção —
 *   `in_sales_attendance` só passou a existir na migration
 *   `20260807-000310`, então nenhum lead legado pode tê-lo sido de fato) e
 *   marcados com `needs_review=true`, reabrindo o handoff para que
 *   Marketing/Vendas vinculem o cliente correto (ou re-convertam) pelo
 *   fluxo normal (UC-63). Não é uma opção (b) de "estado de exceção
 *   permanente": não existe estado terminal inválido novo, o dado volta a
 *   ser um lead ativo e auditável.
 *
 *   Cada linha afetada é registrada em `marketing_lead_saneamento_log`
 *   (tabela de auditoria nova, permanente — não é log volátil) ANTES do
 *   UPDATE, preservando o `status` anterior (`'converted'`) e o motivo,
 *   para rastreabilidade total de quantos/quais registros foram
 *   reclassificados por esta migration (requisito do documento: "gerar
 *   relatório/log de quantos registros foram afetados").
 *
 * RISCO DECLARADO (não mitigado, decisão de negócio pendente formal):
 * reabrir um lead que a equipe comercial já considerava "fechado há
 * tempo" pode gerar trabalho duplicado ou confusão — é exatamente o
 * trade-off que o documento de requisitos identificava como decisão de
 * negócio, não técnica. `needs_review=true` existe justamente para que a
 * equipe MKT/Vendas identifique e triesse esses casos deliberadamente
 * (filtro dedicado na tela, fora do escopo desta migration) em vez de
 * tratá-los como leads novos comuns.
 *
 * ORDEM DE EXECUÇÃO dentro deste arquivo (não pode ser separada em
 * migrations distintas sem risco de a constraint quebrar em um banco que
 * já tenha dado órfão): 1) cria tabela de log, 2) adiciona `needs_review`,
 * 3) grava o log, 4) executa o UPDATE de saneamento, 5) só então adiciona
 * o CHECK constraint.
 *
 * TRANSAÇÃO (correção da auditoria cruzada): `sequelize-cli` (`db:migrate`,
 * ver `server/src/scripts/run-sequelize-cli.cjs`) **não** envolve `up()`
 * automaticamente em uma transação — é responsabilidade de cada migration.
 * A versão original deste arquivo executava os passos 1-5 fora de qualquer
 * transação; nenhum passo aqui usa `ALTER TYPE ... ADD VALUE` (essa
 * restrição de "fora de transação" é da migration `20260807-000310`, não
 * desta), então não há impedimento técnico para envolver tudo em uma única
 * transação — feito nesta correção (`queryInterface.sequelize.transaction`)
 * para que uma falha a meio caminho (ex. entre o UPDATE de saneamento e o
 * `ADD CONSTRAINT`) não deixe o banco em estado intermediário. Cada passo
 * já era idempotente por checagem prévia (`if (!tables.includes(...))`,
 * `if (!columns.x)`, `WHERE status = 'converted' AND ... IS NULL` some a
 * zero linhas após a primeira execução) — a transação é defesa em
 * profundidade, não pré-requisito da idempotência.
 *
 * CORREÇÃO DA AUDITORIA CRUZADA (`AuditorIntegrador`, 2026-08-07):
 * `docs/business/BLOCO_5_MKT_API.md` (UC-63, `POST /leads/:id/convert`)
 * usa `converted_at` no payload de resposta e no cálculo de
 * `median_lead_cycle_days` (RF-MKT-026), mas nenhuma migration/model
 * tinha essa coluna — nem `BLOCO_5_MKT_MODELO_DADOS.md` a listava. Gap de
 * schema real (API prometia campo que o banco não sustentava), fechado
 * aqui de forma aditiva (mesma migration que já mexe no ciclo de vida da
 * conversão): `converted_at` (TIMESTAMPTZ, nullable) — não populado
 * retroativamente para leads `converted` legados que já tinham cliente
 * vinculado (não há como inferir o instante exato da conversão passada);
 * novos vínculos gravam `converted_at=now()` na aplicação
 * (`ConvertLeadUseCase`, fora do escopo desta migration).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tables = await queryInterface.showAllTables({ transaction });

      // ---- 1) tabela de auditoria do saneamento ----
      if (!tables.includes('marketing_lead_saneamento_log')) {
        await queryInterface.createTable(
          'marketing_lead_saneamento_log',
          {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            lead_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: 'marketing_leads', key: 'id' },
              onDelete: 'RESTRICT',
              onUpdate: 'CASCADE',
            },
            previous_status: { type: Sequelize.STRING(30), allowNull: false },
            reverted_to_status: { type: Sequelize.STRING(30), allowNull: false },
            reason: { type: Sequelize.TEXT, allowNull: false },
            reverted_at: { type: Sequelize.DATE, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          },
          { transaction }
        );
        await queryInterface.sequelize.query(
          `COMMENT ON TABLE marketing_lead_saneamento_log IS 'Auditoria permanente do saneamento de leads converted sem cliente vinculado — BLOCO_5_MKT_REQUISITOS.md secao 2, migration 20260807-000312';`,
          { transaction }
        );

        await queryInterface.addIndex('marketing_lead_saneamento_log', ['lead_id'], {
          name: 'idx_marketing_lead_saneamento_log_lead_id',
          transaction,
        });
      }

      // ---- 2) colunas novas em marketing_leads ----
      const columns = await queryInterface.describeTable('marketing_leads', { transaction });

      // ---- 2a) converted_at (gap fechado pela auditoria cruzada — API
      // referenciava o campo sem coluna correspondente) ----
      if (!columns.converted_at) {
        await queryInterface.addColumn(
          'marketing_leads',
          'converted_at',
          { type: Sequelize.DATE, allowNull: true },
          { transaction }
        );
        await queryInterface.sequelize.query(
          `COMMENT ON COLUMN marketing_leads.converted_at IS 'RF-MKT-002/026 (via auditoria cruzada AuditorIntegrador) — momento em que o lead foi convertido (status=converted gravado), usado por median_lead_cycle_days; nulo para leads convertidos antes desta migration';`,
          { transaction }
        );
      }

      // ---- 2b) flag de revisão manual ----
      if (!columns.needs_review) {
        await queryInterface.addColumn(
          'marketing_leads',
          'needs_review',
          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          { transaction }
        );
        await queryInterface.sequelize.query(
          `COMMENT ON COLUMN marketing_leads.needs_review IS 'true quando o lead foi rebaixado automaticamente pelo saneamento de 20260807-000312 (converted orfao sem cliente) e precisa de triagem manual de Marketing/Vendas';`,
          { transaction }
        );

        const indexes = await queryInterface.showIndex('marketing_leads', { transaction });
        if (!indexes.some((i) => i.name === 'idx_marketing_leads_needs_review')) {
          await queryInterface.addIndex('marketing_leads', ['needs_review'], {
            name: 'idx_marketing_leads_needs_review',
            transaction,
          });
        }
      }

      // ---- 3) grava o log dos afetados (ANTES do UPDATE, com o status ainda 'converted') ----
      await queryInterface.sequelize.query(
        `
        INSERT INTO marketing_lead_saneamento_log (lead_id, previous_status, reverted_to_status, reason, reverted_at, created_at)
        SELECT
          id,
          'converted',
          'qualified',
          'Saneamento RF-MKT Sec 2 (migration 20260807-000312): lead estava converted sem converted_to_customer_id preenchido, estado invalido pre-existente. Rebaixado para qualified (unico estado anterior possivel no funil legado) com needs_review=true para nova triagem de handoff via UC-63, antes de aplicar o CHECK constraint que passa a proibir esse estado no banco.',
          NOW(),
          NOW()
        FROM marketing_leads
        WHERE status = 'converted' AND converted_to_customer_id IS NULL;
        `,
        { transaction }
      );

      const [[{ count: affectedCount }]] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS count FROM marketing_leads WHERE status = 'converted' AND converted_to_customer_id IS NULL;`,
        { transaction }
      );
      // eslint-disable-next-line no-console
      console.log(
        `[migration 20260807-000312] Saneamento: ${affectedCount} lead(s) 'converted' sem converted_to_customer_id ` +
        'serao rebaixados para qualified/needs_review=true. Detalhe registrado em marketing_lead_saneamento_log.'
      );

      // ---- 4) executa o rebaixamento ----
      await queryInterface.sequelize.query(
        `
        UPDATE marketing_leads
        SET status = 'qualified', needs_review = true, updated_at = NOW()
        WHERE status = 'converted' AND converted_to_customer_id IS NULL;
        `,
        { transaction }
      );

      // ---- 5) só agora a constraint é segura de aplicar ----
      const [constraints] = await queryInterface.sequelize.query(
        `SELECT conname FROM pg_constraint WHERE conname = 'ck_marketing_leads_converted_requires_client'`,
        { transaction }
      );
      if (constraints.length === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE marketing_leads
          ADD CONSTRAINT ck_marketing_leads_converted_requires_client
          CHECK (status <> 'converted' OR converted_to_customer_id IS NOT NULL);
          `,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE marketing_leads
      DROP CONSTRAINT IF EXISTS ck_marketing_leads_converted_requires_client;
    `);

    // Não é possível reverter o rebaixamento com segurança (não há como
    // distinguir, hoje, quais leads 'qualified'/needs_review=true vieram
    // do saneamento vs. de operação normal desde então) — o down() não
    // tenta "reconverter" ninguém. O log permanece como evidência
    // permanente do que foi feito, mesmo depois do rollback do schema.
    const indexes = await queryInterface.showIndex('marketing_leads');
    if (indexes.some((i) => i.name === 'idx_marketing_leads_needs_review')) {
      await queryInterface.removeIndex('marketing_leads', 'idx_marketing_leads_needs_review');
    }
    const columns = await queryInterface.describeTable('marketing_leads');
    if (columns.needs_review) {
      await queryInterface.removeColumn('marketing_leads', 'needs_review');
    }
    if (columns.converted_at) {
      await queryInterface.removeColumn('marketing_leads', 'converted_at');
    }

    await queryInterface.dropTable('marketing_lead_saneamento_log');
  },
};
