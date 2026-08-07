'use strict';

/**
 * BLOCO 3 JUR — UC-53, RF-JUR-012/019, BR-JUR (processo P2).
 *
 * Cria `jur_legal_cases` (ProcessoJudicial). Parte contraria tem FK opcional
 * para no maximo UMA de `employees`/`suppliers`/`clients` (CHECK) — quando
 * nenhuma se aplica (ex.: pessoa fisica externa, orgao publico), apenas
 * `opposing_party_name` e preenchido.
 *
 * RETENÇÃO/IMUTABILIDADE (RF-JUR-019/044): processo nunca e excluido
 * fisicamente; `status='archived'`/`won`/`lost`/`settled` sao estados
 * finais de leitura, sem trigger de bloqueio dedicada nesta tabela — o
 * conteudo do PROCESSO em si (numero CNJ, partes, vara) pode receber
 * correcao administrativa tardia (ex.: erro de digitacao do numero CNJ)
 * sem quebrar valor probatorio, ao contrario de `jur_legal_case_events`
 * (cronologia) e `jur_legal_case_provisions` (base contabil), que SAO
 * append-only (migrations 164/166).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_legal_cases', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      case_number: { type: Sequelize.STRING(30), allowNull: false, unique: true, comment: 'Numero CNJ' },
      case_type: {
        type: Sequelize.ENUM('labor', 'civil', 'tax', 'consumer', 'regulatory', 'administrative'),
        allowNull: false,
      },
      case_role: {
        type: Sequelize.ENUM('plaintiff', 'defendant', 'third_party'),
        allowNull: false,
        comment: 'Papel da EVOK no processo (autor/reu/terceiro)',
      },
      opposing_party_name: { type: Sequelize.STRING(200), allowNull: false },
      opposing_party_employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Ex.: reclamatoria trabalhista movida por (ex-)empregado — preservado mesmo apos desligamento (RNF-JUR-03)',
      },
      opposing_party_supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      opposing_party_client_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'clients', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      court: { type: Sequelize.STRING(150), allowNull: true, comment: 'Vara/tribunal' },
      external_lawyer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'jur_external_lawyers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      claim_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'Valor da causa' },
      internal_responsible_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'won', 'lost', 'settled', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      outcome_amount: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'Valor do acordo/condenacao quando settled/lost' },
      outcome_installments: { type: Sequelize.INTEGER, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      next_risk_reassessment_due_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Pendencia de reavaliacao de risco (RF-JUR-017) — a cada andamento tipo decision e, no minimo, a cada 90 dias por processo ativo (periodicidade configuravel em app)',
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
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_cases ADD CONSTRAINT ck_jur_legal_cases_opposing_party_single CHECK (
        (CASE WHEN opposing_party_employee_id IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN opposing_party_supplier_id IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN opposing_party_client_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
      );
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_legal_cases ADD CONSTRAINT ck_jur_legal_cases_closed_requires_closed_at
      CHECK (status NOT IN ('won', 'lost', 'settled', 'archived') OR closed_at IS NOT NULL);
    `);

    await queryInterface.addIndex('jur_legal_cases', ['status'], { name: 'idx_jur_legal_cases_status' });
    await queryInterface.addIndex('jur_legal_cases', ['case_type'], { name: 'idx_jur_legal_cases_case_type' });
    await queryInterface.addIndex('jur_legal_cases', ['internal_responsible_user_id'], { name: 'idx_jur_legal_cases_internal_responsible_user_id' });
    await queryInterface.addIndex('jur_legal_cases', ['opposing_party_employee_id'], { name: 'idx_jur_legal_cases_opposing_party_employee_id' });
    await queryInterface.addIndex('jur_legal_cases', ['external_lawyer_id'], { name: 'idx_jur_legal_cases_external_lawyer_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_legal_cases');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_cases_case_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_cases_case_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_legal_cases_status";');
  },
};
