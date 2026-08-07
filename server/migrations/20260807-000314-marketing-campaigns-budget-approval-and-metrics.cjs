'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-007/009/030/031/034 (BR-MKT-001/002/004).
 *
 * 1. ORÇAMENTO (RF-MKT-030): o campo único `budget` (solicitado) é
 *    renomeado para `budget_requested` (preserva o dado existente, zero
 *    perda) e ganha:
 *    - `budget_approved` (nullable até a aprovação)
 *    - `budget_approval_status` ENUM `pending`/`approved`/`rejected`,
 *      default `pending`
 *    - `budget_approved_by` (FK `users.id`, nullable)
 *    - `budget_approved_at` (timestamp, nullable)
 *    Aprovação registrada DENTRO do módulo MKT nesta rodada (recomendação
 *    do brief d.2 — sem entidade formal de orçamento por centro de custo
 *    no Financeiro ainda; por isso NENHUMA FK para `cost_centers` foi
 *    adicionada aqui — não há requisito funcional pedindo esse vínculo
 *    nesta correção, ver `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` §5).
 *
 * 2. IMUTABILIDADE (RF-MKT-034): `notes` (TEXT, nullable) é o único campo
 *    editável quando a campanha está `completed`/`canceled` — o bloqueio
 *    dos demais campos é regra de aplicação (`UpdateCampaignUseCase`),
 *    **sem trigger** (mesmo princípio já registrado para o projeto em
 *    `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md`: lógica de negócio só
 *    na aplicação). Uma CHECK constraint não pode expressar "bloquear
 *    mudança de valor comparado ao estado anterior" sem trigger no
 *    Postgres — por isso fica fora do escopo de schema.
 *
 * 3. MÉTRICAS DE CAMPANHA (RF-MKT-007/009): `leads_generated`/
 *    `conversions`/`roi` **permanecem** como colunas de cache (decisão
 *    explícita do `AdmDBA`, seguindo a recomendação do requisito —
 *    listagem de campanha precisa de leitura rápida sem JOIN/agregação
 *    pesada a cada `GET`). Somente-leitura via API é regra de validação
 *    (Zod `.strict()`), fora do escopo desta migration. Ganham
 *    `metrics_recalculated_at` (timestamp, nullable) — marca quando o
 *    cache foi recalculado pela última vez (criação/conversão de lead ou
 *    `POST .../recalculate`, RF-MKT-009), viabilizando alertar drift
 *    (cache nunca recalculado, ou recalculado há muito tempo) sem
 *    depender de trigger de recálculo automático (decisão nº3 deste
 *    passo: "nada de trigger de recálculo — é use case").
 *
 * 4. ALERTA DE ORÇAMENTO (RF-MKT-032/033): `budget_alert_level`
 *    (`none`/`warning_90`/`over_100`) é **calculado em tempo de leitura**
 *    (`actual_cost ÷ budget_approved`), não é coluna persistida — não há
 *    ALTER TABLE correspondente, por design (evita drift entre coluna e
 *    fonte de verdade, mesmo raciocínio das métricas de campanha).
 *
 * BACKFILL/GRANDFATHERING (necessário para RF-MKT-031 — "campanha só
 * transita para active com budget_approval_status='approved'" — ser uma
 * CHECK constraint real de banco sem quebrar dado existente): campanhas
 * já em `status='active'` no momento desta migration são consideradas
 * aprovadas retroativamente (`budget_approval_status='approved'`,
 * `budget_approved = budget_requested` quando havia valor, `budget_approved_at
 * = NOW()`, `budget_approved_by` permanece NULL — não há como saber quem
 * aprovou historicamente). O número de campanhas afetadas é logado no
 * console da migration para auditoria mínima, mesmo padrão do saneamento
 * de leads (`20260807-000312`).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('marketing_campaigns');

    // ---- 1) budget -> budget_requested ----
    if (columns.budget && !columns.budget_requested) {
      await queryInterface.renameColumn('marketing_campaigns', 'budget', 'budget_requested');
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_campaigns.budget_requested IS 'RF-MKT-030 — orcamento solicitado no planejamento (renomeado de budget)';`
      );
    }

    const columnsAfterRename = await queryInterface.describeTable('marketing_campaigns');

    if (!columnsAfterRename.budget_approved) {
      await queryInterface.addColumn('marketing_campaigns', 'budget_approved', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_campaigns.budget_approved IS 'RF-MKT-030 — orcamento aprovado, nulo ate a aprovacao';`
      );
    }

    if (!columnsAfterRename.budget_approval_status) {
      await queryInterface.addColumn('marketing_campaigns', 'budget_approval_status', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      });
    }

    if (!columnsAfterRename.budget_approved_by) {
      await queryInterface.addColumn('marketing_campaigns', 'budget_approved_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }

    if (!columnsAfterRename.budget_approved_at) {
      await queryInterface.addColumn('marketing_campaigns', 'budget_approved_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // ---- 2) imutabilidade pós-conclusão ----
    if (!columnsAfterRename.notes) {
      await queryInterface.addColumn('marketing_campaigns', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_campaigns.notes IS 'RF-MKT-034 — unico campo editavel quando status e completed/canceled (regra de aplicacao)';`
      );
    }

    // ---- 3) cache de métricas ----
    if (!columnsAfterRename.metrics_recalculated_at) {
      await queryInterface.addColumn('marketing_campaigns', 'metrics_recalculated_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_campaigns.metrics_recalculated_at IS 'RF-MKT-009 — ultima vez que leads_generated/conversions/roi foram recalculados a partir dos vinculos reais';`
      );
    }

    // ---- backfill/grandfathering para viabilizar a CHECK de RF-MKT-031 ----
    const [[{ count: grandfatheredCount }]] = await queryInterface.sequelize.query(`
      SELECT count(*)::int AS count FROM marketing_campaigns
      WHERE status = 'active' AND budget_approval_status = 'pending';
    `);
    // eslint-disable-next-line no-console
    console.log(
      `[migration 20260807-000314] Grandfathering: ${grandfatheredCount} campanha(s) ja 'active' sem aprovacao ` +
      "de orcamento formal serao marcadas budget_approval_status='approved' retroativamente " +
      '(budget_approved_by permanece NULL — nao ha como saber quem aprovou historicamente).'
    );
    await queryInterface.sequelize.query(`
      UPDATE marketing_campaigns
      SET budget_approval_status = 'approved',
          budget_approved = COALESCE(budget_approved, budget_requested),
          budget_approved_at = NOW(),
          updated_at = NOW()
      WHERE status = 'active' AND budget_approval_status = 'pending';
    `);

    // ---- 4) CHECK — RF-MKT-031 ----
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'ck_marketing_campaigns_active_requires_budget_approval'
    `);
    if (constraints.length === 0) {
      await queryInterface.sequelize.query(`
        ALTER TABLE marketing_campaigns
        ADD CONSTRAINT ck_marketing_campaigns_active_requires_budget_approval
        CHECK (status <> 'active' OR budget_approval_status = 'approved');
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE marketing_campaigns
      DROP CONSTRAINT IF EXISTS ck_marketing_campaigns_active_requires_budget_approval;
    `);

    const columns = await queryInterface.describeTable('marketing_campaigns');
    if (columns.metrics_recalculated_at) {
      await queryInterface.removeColumn('marketing_campaigns', 'metrics_recalculated_at');
    }
    if (columns.notes) {
      await queryInterface.removeColumn('marketing_campaigns', 'notes');
    }
    if (columns.budget_approved_at) {
      await queryInterface.removeColumn('marketing_campaigns', 'budget_approved_at');
    }
    if (columns.budget_approved_by) {
      await queryInterface.removeColumn('marketing_campaigns', 'budget_approved_by');
    }
    if (columns.budget_approval_status) {
      await queryInterface.removeColumn('marketing_campaigns', 'budget_approval_status');
    }
    if (columns.budget_approved) {
      await queryInterface.removeColumn('marketing_campaigns', 'budget_approved');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_marketing_campaigns_budget_approval_status";');

    const columnsAfter = await queryInterface.describeTable('marketing_campaigns');
    if (columnsAfter.budget_requested && !columnsAfter.budget) {
      await queryInterface.renameColumn('marketing_campaigns', 'budget_requested', 'budget');
    }
  },
};
