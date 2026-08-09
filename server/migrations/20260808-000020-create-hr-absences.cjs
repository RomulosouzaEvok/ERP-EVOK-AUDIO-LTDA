'use strict';

/**
 * BLOCO 6 RH — RF-RH-044 a 049 (Afastamentos, P5) — UC-71.
 *
 * `cid` (RNF-RH-01): dado de saude (CID), acesso MAIS restrito que a
 * segregacao padrao de campo do modulo `rh` (que basta
 * `req.user.permissions.rh` — RF-RH-006). Aqui a leitura completa da
 * coluna exige `authorizeModule('rh', ...)` bloqueando a ROTA inteira
 * (nao apenas omissao de campo), mesmo padrao ja usado em `sst` para ASO/
 * Acidente/CAT — decisao de nivel exato (reforcar `rh` ou reaproveitar
 * `sst`) e do `ArquitetoSoftwareAPI` (ver §6.4 do documento de requisitos),
 * este bloco so fixa a exigencia via COMMENT ON COLUMN.
 *
 * `accrual_period_impact_id`/`accrual_impact_days` (RF-RH-049): impacto
 * sobre o periodo aquisitivo em curso, campo DERIVADO (nao editavel
 * manualmente pela API — regra de aplicacao) — FK aponta para o periodo
 * efetivamente impactado (SET NULL se o periodo for removido, cenario
 * teorico ja que `hr_vacation_accrual_periods` bloqueia DELETE).
 *
 * CORRIGIDO pelo `AuditorIntegrador` em 2026-08-09: `extended_program`
 * faltava nesta migration apesar de aceito pelo contrato de API
 * (`docs/business/BLOCO_6_RH_API.md` §9.1, RF-RH-046 — adesao ao programa
 * Empresa Cidadã, licenca-maternidade estendida para 180 dias). Ver
 * `docs/business/BLOCO_6_RH_AUDITORIA.md` achado #2.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hr_absences', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('doenca_ate_15d', 'auxilio_doenca_inss', 'acidente_trabalho', 'maternidade', 'paternidade', 'licenca_outras'),
        allowNull: false,
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      expected_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      extended_program: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      cid: { type: Sequelize.STRING(10), allowNull: true },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_employee_documents', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      s2230_confirmed_at: { type: Sequelize.DATE, allowNull: true },
      s2230_confirmed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      accrual_period_impact_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hr_vacation_accrual_periods', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      accrual_impact_days: { type: Sequelize.INTEGER, allowNull: true },
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

    await queryInterface.addIndex('hr_absences', ['employee_id'], { name: 'idx_hr_absences_employee_id' });
    await queryInterface.addIndex('hr_absences', ['type', 'start_date'], { name: 'idx_hr_absences_type_start_date' });
    await queryInterface.addIndex('hr_absences', ['employee_id', 'actual_end_date'], { name: 'idx_hr_absences_employee_open' });

    await queryInterface.sequelize.query(`
      ALTER TABLE hr_absences ADD CONSTRAINT ck_hr_absences_actual_end_after_start
      CHECK (actual_end_date IS NULL OR actual_end_date >= start_date);
    `);

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN hr_absences.cid IS 'RNF-RH-01 - dado de saude (LGPD art. 5o II) - acesso reforcado (rota bloqueada), mais restrito que a segregacao padrao de campo do modulo rh';`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hr_absences');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_hr_absences_type";');
  },
};
