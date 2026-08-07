'use strict';

/**
 * Módulo Controladoria (subárea CTR do departamento Financeiro, sem linha
 * própria em `departments`) — implementação do zero.
 *
 * Diferente dos 5 módulos implementados antes dele nesta mesma sessão
 * (Facilities, Marketing, Jurídico, Contabilidade, Tesouraria — migrations
 * `20260807-000200` a `20260807-000240`), Controladoria NÃO tem um doc
 * dedicado com tabelas SQL prontas para migrar: seu escopo em
 * `docs/financeiro/00-README.md` é "Custos Industriais, Orçamento, DRE"
 * (funções: custeio por absorção/ABC, orçamento anual e acompanhamento).
 *
 * Custeio industrial (mão-de-obra/overhead) já existe em
 * `server/src/modules/production`/`server/src/modules/reports`, e Centros de
 * Custo (`cost_centers`) + relatório agrupado
 * (`GET /api/finance/cost-centers/report`) já existem em
 * `server/src/modules/financial/` — nenhum dos dois é duplicado aqui. O único
 * pedaço genuinamente inexistente é ORÇAMENTO: orçamento anual por centro de
 * custo + acompanhamento orçado × realizado. Esta migration cria apenas
 * `budget_lines`, prefixo de domínio omitido deliberadamente (o nome já é
 * específico o bastante e não colide com nenhuma tabela existente).
 *
 * DECISÃO — mês opcional (`month IS NULL`): uma linha de orçamento pode ser
 * MENSAL (`month` entre 1 e 12) ou ANUAL "achatada" (`month IS NULL`,
 * representa o ano inteiro em uma única linha, sem detalhamento mês a mês).
 * O relatório orçado × realizado (`GetBudgetVsActualReportUseCase`) trata as
 * duas de forma explícita: ao consultar o ano inteiro (`month` omitido na
 * query), linhas anuais entram pelo valor cheio; ao consultar um mês
 * específico, linhas anuais são rateadas por 12 (distribuição linear
 * simplificada — decisão consciente de não modelar sazonalidade).
 *
 * DECISÃO — unicidade com `month` nulo: `UNIQUE(cost_center_id, year, month,
 * category)` não seria suficiente em PostgreSQL, pois `NULL` nunca é igual a
 * `NULL` em uma constraint UNIQUE padrão (permitiria múltiplas linhas anuais
 * duplicadas para o mesmo centro de custo/ano/categoria). Por isso a
 * unicidade é um ÍNDICE DE EXPRESSÃO
 * `UNIQUE (cost_center_id, year, COALESCE(month, 0), category)`, criado via
 * SQL cru (Sequelize `addIndex` não expressa `COALESCE` em `fields`).
 *
 * DECISÃO — categoria: enum simples (`custo_fixo`, `custo_variavel`,
 * `investimento`, `outro`), não um plano de contas completo — o doc de
 * origem não especifica esse nível de detalhe, e o plano de contas real já
 * existe em `accounting_chart_of_accounts` (módulo Contabilidade); cruzar
 * orçamento com conta contábil fica registrado como possível evolução futura
 * em `docs/governance/TODO.md`, não implementado agora.
 *
 * DECISÃO — sem soft delete: `budget_lines` é artefato de PLANEJAMENTO (não
 * histórico transacional imutável como uma OP ou uma NF-e) — `CLAUDE.md` §7
 * reserva soft delete apenas para `Category`; aqui o DELETE físico é
 * aceitável e é exatamente o que este módulo usa
 * (`DELETE /api/budget/lines/:id`).
 *
 * `cost_center_id` referencia `cost_centers.id` com `ON DELETE CASCADE`
 * (linha de orçamento não faz sentido órfã se o centro de custo é
 * removido — diferente de contas a pagar/receber, que usam `SET NULL`
 * porque são histórico transacional que deve sobreviver à exclusão do
 * centro de custo).
 *
 * Migration idempotente (mesmo padrão de `20260807-000240`): a migration
 * baseline (`20260731-000001-baseline-schema.cjs`) cria tabelas a partir de
 * uma lista fixa de models — `budget_lines` não está nessa lista, então um
 * banco criado do zero após este commit ainda precisa desta migration para
 * nascer com o módulo Controladoria pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('budget_lines')) {
      await queryInterface.createTable('budget_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cost_center_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'cost_centers', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        year: { type: Sequelize.INTEGER, allowNull: false },
        month: { type: Sequelize.INTEGER, allowNull: true, comment: 'NULL = linha anual "achatada"; 1-12 = linha mensal' },
        category: {
          type: Sequelize.ENUM('custo_fixo', 'custo_variavel', 'investimento', 'outro'),
          allowNull: false,
          defaultValue: 'outro',
        },
        planned_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.sequelize.query(
        'ALTER TABLE budget_lines ADD CONSTRAINT chk_budget_lines_month CHECK (month IS NULL OR (month >= 1 AND month <= 12));'
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE budget_lines ADD CONSTRAINT chk_budget_lines_year CHECK (year >= 2000 AND year <= 2100);'
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE budget_lines ADD CONSTRAINT chk_budget_lines_planned_amount CHECK (planned_amount >= 0);'
      );
    }

    // ---- índices ----
    const indexes = await queryInterface.showIndex('budget_lines');

    if (!indexes.some((index) => index.name === 'uq_budget_lines_cost_center_year_month_category')) {
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX uq_budget_lines_cost_center_year_month_category
           ON budget_lines (cost_center_id, year, COALESCE(month, 0), category);`
      );
    }

    if (!indexes.some((index) => index.name === 'idx_budget_lines_year_month')) {
      await queryInterface.addIndex('budget_lines', ['year', 'month'], { name: 'idx_budget_lines_year_month' });
    }

    if (!indexes.some((index) => index.name === 'idx_budget_lines_cost_center_id')) {
      await queryInterface.addIndex('budget_lines', ['cost_center_id'], { name: 'idx_budget_lines_cost_center_id' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('budget_lines');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_budget_lines_category";');
  },
};
