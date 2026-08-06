'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabela singleton (id=1, mesmo padrao de company_fiscal_config) com a
    // configuracao global de rateio de overhead (despesas indiretas de
    // fabrica) usada no custeio real de producao. Escolha deliberada de
    // manter simples (uma taxa global, sem centros de custo) — ver decisao
    // documentada em docs/database/DATABASE.md.
    await queryInterface.createTable('production_cost_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      overhead_calculation_basis: {
        type: Sequelize.ENUM('material_labor', 'labor_only', 'material_only'),
        allowNull: false,
        defaultValue: 'material_labor',
        comment: 'Base de calculo do rateio: sobre custo de material+mao-de-obra, so mao-de-obra, ou so material',
      },
      overhead_rate_percent: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Percentual de rateio de overhead aplicado sobre a base escolhida (ex.: 25.5 = 25,5%)',
      },
      default_labor_rate_per_hour: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Taxa de mao-de-obra/h de fallback quando a etapa da rota nao tem work_center_id vinculado (ainda usa o campo legado work_center em texto)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE production_cost_settings
      ADD CONSTRAINT ck_production_cost_settings_rate_range
      CHECK (overhead_rate_percent >= 0 AND overhead_rate_percent <= 1000);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE production_cost_settings
      ADD CONSTRAINT ck_production_cost_settings_labor_rate_non_negative
      CHECK (default_labor_rate_per_hour >= 0);
    `);

    // Garante no maximo uma linha (singleton), mesma tecnica usada para
    // company_fiscal_config na camada de aplicacao/seed: restringe via
    // CHECK (id = 1) para impedir mais de uma configuracao ativa.
    await queryInterface.sequelize.query(`
      ALTER TABLE production_cost_settings
      ADD CONSTRAINT ck_production_cost_settings_singleton_id
      CHECK (id = 1);
    `);

    // Seed da linha singleton com valores neutros (0%) — a fabrica configura
    // depois via tela/endpoint administrativo (fora do escopo desta migration).
    await queryInterface.sequelize.query(`
      INSERT INTO production_cost_settings (
        id, overhead_calculation_basis, overhead_rate_percent, default_labor_rate_per_hour, created_at, updated_at
      ) VALUES (
        1, 'material_labor', 0, 0, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('production_cost_settings');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_production_cost_settings_overhead_calculation_basis";
    `);
  },
};
