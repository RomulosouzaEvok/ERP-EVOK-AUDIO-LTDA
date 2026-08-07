'use strict';

/**
 * BLOCO 5 MKT (correção) — RF-MKT-005, RF-MKT-011 a RF-MKT-015.
 *
 * 1. Formaliza o estado intermediário do funil `in_sales_attendance`
 *    (brief: "em_atendimento_vendas") entre `qualified` e `converted` —
 *    marca o momento em que o vendedor aceitou o handoff e está
 *    trabalhando o lead, distinto de "qualificado, aguardando handoff".
 *    Funil corrigido: `new → contacted → qualified → in_sales_attendance
 *    → converted`, com `lost` alcançável de qualquer etapa aberta (mantido
 *    sem alteração — `ChangeLeadStatusUseCase.VALID_TRANSITIONS` é escopo
 *    do `ArquitetoSoftwareAPI`/`programador`, não desta migration).
 *
 * 2. Colunas de handoff Marketing → Vendas (BR-MKT-007):
 *    - `sales_owner_user_id` (FK `users.id`, nullable): o
 *      "responsavel_vendas" do brief — nome adotado nesta correção
 *      (`sales_owner_user_id`) em vez do `responsible_sales_user_id`
 *      sugerido em `BLOCO_5_MKT_REQISITOS.md` RF-MKT-011, por decisão
 *      explícita de modelagem deste passo (mais curto, mesmo padrão de
 *      `_owner_` já em uso em outros módulos do projeto para "dono de uma
 *      tarefa/registro"). Documentado em
 *      `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` para não haver
 *      divergência entre o nome do RF e o nome real da coluna.
 *    - `qualified_at` (timestamp, nullable): momento da transição para
 *      `qualified` — base do cálculo de SLA de handoff (RF-MKT-013/018).
 *    - `handoff_at` (timestamp, nullable): momento em que
 *      `sales_owner_user_id` foi atribuído (equivalente ao
 *      `sales_handoff_at` do RF-MKT-013, renomeado por brevidade).
 *    - `first_response_at` (timestamp, nullable): momento do primeiro
 *      contato do vendedor com o lead após o handoff — não estava no RF
 *      original, mas é necessária para o KPI "tempo de ciclo do lead"
 *      (RF-MKT-026) medir a etapa handoff→primeiro contato separadamente
 *      de handoff→conversão; sem essa coluna o KPI ficaria bloqueado por
 *      falta de dado. Puramente aditiva, sem impacto em regra existente.
 *
 * `sales_owner_user_id` FK usa `ON DELETE SET NULL` (não RESTRICT): se o
 * usuário de vendas for removido do sistema, o histórico do lead deve ser
 * preservado sem o vínculo — mesmo padrão já usado por
 * `marketing_leads.campaign_id`/`converted_to_customer_id` na migration
 * original (`20260807-000210-create-marketing-module.cjs`).
 *
 * Nenhuma regra de obrigatoriedade (RF-MKT-012: "a partir de `qualified`
 * exige `sales_owner_user_id` para avançar a `in_sales_attendance`") é
 * imposta aqui via CHECK constraint: leads já existentes em `qualified`/
 * `converted` (antes desta migration) não têm `sales_owner_user_id`
 * preenchido e não há como inferir retroativamente quem foi o responsável
 * histórico — uma CHECK constraint quebraria a aplicação imediatamente
 * para todo dado pré-existente. Fica como regra de aplicação
 * (`ChangeLeadStatusUseCase`), documentado como decisão consciente em
 * `docs/business/BLOCO_5_MKT_MODELO_DADOS.md` §3.2.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ALTER TYPE ... ADD VALUE não pode rodar dentro de uma transação no
    // Postgres — mesma técnica já usada em
    // 20260806-000052-add-partially-invoiced-sale-status.cjs.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_marketing_leads_status" ADD VALUE IF NOT EXISTS 'in_sales_attendance';`
    );

    const columns = await queryInterface.describeTable('marketing_leads');

    if (!columns.qualified_at) {
      await queryInterface.addColumn('marketing_leads', 'qualified_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.qualified_at IS 'RF-MKT-013 — momento da transição do lead para status qualified, base do calculo de SLA de handoff';`
      );
    }

    if (!columns.sales_owner_user_id) {
      await queryInterface.addColumn('marketing_leads', 'sales_owner_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.sales_owner_user_id IS 'RF-MKT-011 — vendedor responsavel pelo handoff (responsavel_vendas do brief), FK users.id';`
      );
    }

    if (!columns.handoff_at) {
      await queryInterface.addColumn('marketing_leads', 'handoff_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.handoff_at IS 'RF-MKT-013 — momento em que sales_owner_user_id foi atribuido, base do calculo de SLA de handoff';`
      );
    }

    if (!columns.first_response_at) {
      await queryInterface.addColumn('marketing_leads', 'first_response_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN marketing_leads.first_response_at IS 'Momento do primeiro contato do vendedor apos o handoff — apoia KPI de tempo de ciclo (RF-MKT-026), nao estava no RF original';`
      );
    }

    const indexes = await queryInterface.showIndex('marketing_leads');
    if (!indexes.some((i) => i.name === 'idx_marketing_leads_sales_owner_user_id')) {
      await queryInterface.addIndex('marketing_leads', ['sales_owner_user_id'], {
        name: 'idx_marketing_leads_sales_owner_user_id',
      });
    }
    if (!indexes.some((i) => i.name === 'idx_marketing_leads_status_qualified_at')) {
      // suporta a listagem de alerta de SLA vencido (RF-MKT-014): leads
      // qualified sem handoff além do prazo configurado.
      await queryInterface.addIndex('marketing_leads', ['status', 'qualified_at'], {
        name: 'idx_marketing_leads_status_qualified_at',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('marketing_leads');
    if (indexes.some((i) => i.name === 'idx_marketing_leads_status_qualified_at')) {
      await queryInterface.removeIndex('marketing_leads', 'idx_marketing_leads_status_qualified_at');
    }
    if (indexes.some((i) => i.name === 'idx_marketing_leads_sales_owner_user_id')) {
      await queryInterface.removeIndex('marketing_leads', 'idx_marketing_leads_sales_owner_user_id');
    }

    const columns = await queryInterface.describeTable('marketing_leads');
    if (columns.first_response_at) {
      await queryInterface.removeColumn('marketing_leads', 'first_response_at');
    }
    if (columns.handoff_at) {
      await queryInterface.removeColumn('marketing_leads', 'handoff_at');
    }
    if (columns.sales_owner_user_id) {
      await queryInterface.removeColumn('marketing_leads', 'sales_owner_user_id');
    }
    if (columns.qualified_at) {
      await queryInterface.removeColumn('marketing_leads', 'qualified_at');
    }

    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro —
    // rollback no-op para 'in_sales_attendance' (mesmo raciocínio de
    // 20260806-000052-add-partially-invoiced-sale-status.cjs); o valor
    // extra permanece, inofensivo, mesmo após o down().
  },
};
