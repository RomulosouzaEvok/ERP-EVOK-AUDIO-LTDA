'use strict';

/**
 * Dá ao módulo Diretoria as três tabelas de governança que
 * `docs/administrativo/01-DIRETORIA.md` descrevia em SQL MySQL aspiracional
 * e que nunca chegaram a existir no banco (a única peça real da Diretoria
 * até aqui era `directorates`, migration `20260811-000043`, que só resolve
 * a HIERARQUIA — quem é diretor de quê — sem nenhum registro de
 * planejamento, ata ou risco).
 *
 * ## As três tabelas
 *
 * - `strategic_plannings` — objetivo estratégico anual, com meta (`kpi`/
 *   `target_value`) e realizado (`actual_value`), atribuído a uma diretoria
 *   OU a um departamento (nunca aos dois — ver CHECK) ou a NENHUM dos dois
 *   (objetivo da empresa inteira, ex.: "faturar R$ X").
 * - `meeting_minutes` — ata de reunião. **Registro de governança imutável**:
 *   o módulo (`server/src/modules/directorate/`) propositalmente NÃO expõe
 *   rota de UPDATE/DELETE de conteúdo — se a ata está errada, registra-se
 *   uma ata retificadora nova, como já é costume em atas societárias reais.
 *   Nada na CAMADA DE BANCO impede um `UPDATE` direto (não há trigger),
 *   porque a garantia de imutabilidade vive na ausência da rota HTTP —
 *   mesma escolha de desenho de `audit_logs` neste projeto.
 * - `business_risks` — registro de risco corporativo. `risk_score` é
 *   SEMPRE calculado no servidor (`probability × impact`, mapeados
 *   low=1..critical=4) — nunca aceito do payload, para não permitir que o
 *   cliente HTTP "decida" a severidade do próprio risco.
 *
 * ## Por que `directorate_id` E `department_id` são nullable e mutuamente exclusivos
 *
 * Um objetivo estratégico pode ser da diretoria inteira (ex.: "reduzir CPV
 * em 8%", do Diretor Industrial), de um departamento específico dentro dela
 * (ex.: "zerar não-conformidade de solda", da Produção) ou da empresa toda
 * (ex.: "faturar R$ 40MM no ano", sem dono único). O CHECK
 * `strategic_plannings_owner_xor_ck` impede a ambiguidade de marcar os dois
 * ao mesmo tempo — não impede marcar nenhum.
 *
 * ## Impacto em linhas existentes
 *
 * Nenhum. Três tabelas novas, todas vazias na criação.
 *
 * @see docs/administrativo/01-DIRETORIA.md
 * @see docs/database/04-DICIONARIO_DADOS.md
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // ---- strategic_plannings ----
      await queryInterface.createTable(
        'strategic_plannings',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          year: { type: Sequelize.INTEGER, allowNull: false },
          objective: { type: Sequelize.TEXT, allowNull: false },
          directorate_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'directorates', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          department_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'departments', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          kpi: { type: Sequelize.STRING(200), allowNull: true },
          target_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
          actual_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
          weight: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
          status: {
            type: Sequelize.ENUM('not_started', 'in_progress', 'achieved', 'not_achieved'),
            allowNull: false,
            defaultValue: 'not_started',
          },
          responsible_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'employees', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE strategic_plannings
           ADD CONSTRAINT strategic_plannings_owner_xor_ck
           CHECK (NOT (directorate_id IS NOT NULL AND department_id IS NOT NULL))`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `COMMENT ON TABLE strategic_plannings IS
           'Objetivo estrategico anual (Diretoria). Fonte: docs/administrativo/01-DIRETORIA.md'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN strategic_plannings.directorate_id IS
           'FK -> directorates.id. Mutuamente exclusivo com department_id (CHECK owner_xor)'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN strategic_plannings.department_id IS
           'FK -> departments.id. Mutuamente exclusivo com directorate_id (CHECK owner_xor)'`,
        { transaction },
      );

      await queryInterface.addIndex('strategic_plannings', ['year'], {
        name: 'strategic_plannings_year_idx',
        transaction,
      });
      await queryInterface.addIndex('strategic_plannings', ['directorate_id'], {
        name: 'strategic_plannings_directorate_id_idx',
        transaction,
      });
      await queryInterface.addIndex('strategic_plannings', ['department_id'], {
        name: 'strategic_plannings_department_id_idx',
        transaction,
      });
      await queryInterface.addIndex('strategic_plannings', ['status'], {
        name: 'strategic_plannings_status_idx',
        transaction,
      });

      // ---- meeting_minutes ----
      await queryInterface.createTable(
        'meeting_minutes',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          meeting_date: { type: Sequelize.DATEONLY, allowNull: false },
          meeting_type: {
            type: Sequelize.ENUM('directors', 'commercial', 'industrial', 'financial', 'board', 'general'),
            allowNull: false,
          },
          title: { type: Sequelize.STRING(200), allowNull: false },
          participants: { type: Sequelize.TEXT, allowNull: true },
          summary: { type: Sequelize.TEXT, allowNull: true },
          decisions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          action_items: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
          file_path: { type: Sequelize.STRING(500), allowNull: true },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `COMMENT ON TABLE meeting_minutes IS
           'Ata de reuniao (Diretoria). Registro de governanca IMUTAVEL apos criacao: o modulo nao expoe rota de update/delete de conteudo -- erro registra ata retificadora nova. Fonte: docs/administrativo/01-DIRETORIA.md'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN meeting_minutes.decisions IS
           'Array JSON de decisoes tomadas na reuniao (texto livre por item)'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN meeting_minutes.action_items IS
           'Array JSON de itens de acao (texto livre por item; sem dono/prazo estruturado nesta versao)'`,
        { transaction },
      );

      await queryInterface.addIndex('meeting_minutes', ['meeting_date'], {
        name: 'meeting_minutes_meeting_date_idx',
        transaction,
      });
      await queryInterface.addIndex('meeting_minutes', ['meeting_type'], {
        name: 'meeting_minutes_meeting_type_idx',
        transaction,
      });

      // ---- business_risks ----
      await queryInterface.createTable(
        'business_risks',
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          risk_category: {
            type: Sequelize.ENUM('operational', 'financial', 'market', 'regulatory', 'reputation', 'supply'),
            allowNull: false,
          },
          description: { type: Sequelize.TEXT, allowNull: false },
          probability: {
            type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
          },
          impact: {
            type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
          },
          risk_score: { type: Sequelize.INTEGER, allowNull: false },
          mitigation_actions: { type: Sequelize.TEXT, allowNull: true },
          contingency_plan: { type: Sequelize.TEXT, allowNull: true },
          responsible_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'employees', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          review_date: { type: Sequelize.DATEONLY, allowNull: true },
          status: {
            type: Sequelize.ENUM('active', 'mitigated', 'accepted', 'closed'),
            allowNull: false,
            defaultValue: 'active',
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `COMMENT ON TABLE business_risks IS
           'Risco corporativo (Diretoria). risk_score = probability x impact (1..4 cada), SEMPRE calculado no servidor. Fonte: docs/administrativo/01-DIRETORIA.md'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN business_risks.risk_score IS
           'probability x impact, mapeados low=1,medium=2,high=3,critical=4. Nunca aceito do payload -- calculado em CalculateRiskScore (application layer)'`,
        { transaction },
      );

      await queryInterface.addIndex('business_risks', ['status'], {
        name: 'business_risks_status_idx',
        transaction,
      });
      await queryInterface.addIndex('business_risks', ['risk_category'], {
        name: 'business_risks_risk_category_idx',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('business_risks', { transaction });
      await queryInterface.dropTable('meeting_minutes', { transaction });
      await queryInterface.dropTable('strategic_plannings', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_risks_risk_category";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_risks_probability";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_risks_impact";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_risks_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_meeting_minutes_meeting_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_strategic_plannings_status";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
