'use strict';

/**
 * BLOCO 3 JUR — UC-53, RF-JUR-015/016/020, BR-JUR-015, CPC 25.
 *
 * Cria `jur_legal_case_provisions` (ProvisaoContingencia): historico
 * APPEND-ONLY de verdade — cada reavaliacao de risco gera uma NOVA linha;
 * a "vigente" e sempre a mais recente por `legal_case_id` (resolvida em
 * query, `ORDER BY assessed_at DESC LIMIT 1` / `MAX(id)`, sem coluna de
 * flag "is_current" que precisaria ser mantida em sincronia manualmente a
 * cada INSERT — decisao deliberada, evita um segundo caminho de mutacao).
 *
 * E a serie que a Controladoria consome para o balanco (RF-JUR-020) — por
 * isso a trigger `trg_jur_lock_legal_case_provision` bloqueia QUALQUER
 * UPDATE/DELETE, sem excecao nenhuma (mais estrita que
 * `jur_legal_case_deadlines`, que permite evolucao ate a confirmacao final):
 * uma linha de provisao, uma vez inserida, e um fato contabil historico
 * que nao pode ser reescrito.
 *
 * `risk_class='probable'` exige `provisioned_amount > 0` E `rationale`
 * preenchidos (CHECK) — BR-JUR-015, bloqueio de banco alem da validacao
 * de aplicacao (E1 de UC-53).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_legal_case_provisions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      legal_case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'jur_legal_cases', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      risk_class: {
        type: Sequelize.ENUM('probable', 'possible', 'remote'),
        allowNull: false,
        comment: 'Nomenclatura CPC 25',
      },
      claim_amount: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'Valor exposto nesta avaliacao — usado no relatorio de "exposicao possivel" (RF-JUR-020) quando risk_class=possible' },
      provisioned_amount: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      rationale: { type: Sequelize.TEXT, allowNull: true },
      assessed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      assessed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_provisions ADD CONSTRAINT ck_jur_legal_case_provisions_probable_requires_amount
      CHECK (risk_class <> 'probable' OR (provisioned_amount > 0 AND rationale IS NOT NULL));
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_case_provisions ADD CONSTRAINT ck_jur_legal_case_provisions_amount_non_negative
      CHECK (provisioned_amount >= 0 AND (claim_amount IS NULL OR claim_amount >= 0));
    `);

    await queryInterface.addIndex('jur_legal_case_provisions', ['legal_case_id', 'assessed_at'], { name: 'idx_jur_legal_case_provisions_case_assessed' });
    await queryInterface.addIndex('jur_legal_case_provisions', ['risk_class'], { name: 'idx_jur_legal_case_provisions_risk_class' });

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION jur_lock_legal_case_provision() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_provisions id=% e append-only (CPC 25/RNF-JUR-02); DELETE nao permitido. Registre nova avaliacao.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_legal_case_provisions id=% e append-only (CPC 25/RNF-JUR-02); UPDATE nao permitido. Registre nova avaliacao.', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_jur_lock_legal_case_provision
      BEFORE UPDATE OR DELETE ON jur_legal_case_provisions
      FOR EACH ROW EXECUTE FUNCTION jur_lock_legal_case_provision();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trg_jur_lock_legal_case_provision ON jur_legal_case_provisions;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS jur_lock_legal_case_provision();');
    await queryInterface.dropTable('jur_legal_case_provisions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_case_provisions_risk_class";');
  },
};
