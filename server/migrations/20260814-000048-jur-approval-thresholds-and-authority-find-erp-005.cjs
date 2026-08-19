'use strict';

/**
 * FIND-ERP-005 — remediação SanaCore (caso ERP-LEGACY-001-CASE-002),
 * autorizada por `APR-2026-021` Partes B e C.
 *
 * Estruturas de banco das 4 falhas:
 *
 * - **Falha 1** — `jur_approval_thresholds` (configuração persistida da
 *   alçada, com faixa, papéis, nível exigido, `contract_type` e vigência) +
 *   `jur_approval_threshold_history` (histórico/auditoria das alterações,
 *   exigido nominalmente pela decisão 3 da `APR-2026-021`). Seed com os
 *   valores que hoje estão em código (50.000 / 300.000) para
 *   `contract_type = '*'`, preservando o comportamento observável — a partir
 *   daqui eles são DADO, não código.
 * - **Falha 1 (R1(d))** — `jur_contracts.approval_policy_snapshot`: qual
 *   política vigia no instante da ativação, recuperável a posteriori.
 * - **Falha 3** — `jur_contract_approvals.approved_value`: vincula a
 *   aprovação ao valor aprovado (a tabela não tinha coluna de valor, §7.2 da
 *   triagem), e `invalidated_at`/`invalidated_reason`/`invalidated_by_addendum_id`
 *   para que o aditivo que eleva a faixa INVALIDE as aprovações antigas
 *   preservando o histórico (em vez de apagá-las).
 * - **Falha 4** — índice único parcial por (contrato, PESSOA): o banco tinha
 *   apenas `uq_jur_contract_approvals_contract_role`, que institucionalizava
 *   a falha ao garantir unicidade por PAPEL. Agora a mesma pessoa não
 *   registra duas aprovações vivas do mesmo contrato nem por caminho que
 *   contorne o use case.
 *
 * A unicidade por papel vira índice único PARCIAL (`WHERE invalidated_at IS
 * NULL`) — sem isso, uma aprovação invalidada bloquearia a nova aprovação do
 * mesmo papel após o aditivo.
 *
 * PRÉ-CONDIÇÃO verificada pela própria migration: se `jur_contract_approvals`
 * tiver linhas, o backfill de `approved_value` é NULL e as linhas legadas
 * permanecem válidas (não há dado real — módulo NÃO-PRODUÇÃO,
 * `PRODUCTION_STATUS_MAP.md:160`).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ---- Falha 1: configuração persistida ----
    await queryInterface.createTable('jur_approval_thresholds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: '*' },
      min_value: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      max_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
      required_roles: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      required_level: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'approve' },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      valid_from: { type: Sequelize.DATEONLY, allowNull: true },
      valid_to: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_approval_thresholds', ['contract_type', 'active'], {
      name: 'idx_jur_approval_thresholds_type_active',
    });

    await queryInterface.createTable('jur_approval_threshold_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      threshold_id: { type: Sequelize.INTEGER, allowNull: true },
      action: { type: Sequelize.STRING(16), allowNull: false },
      previous_values: { type: Sequelize.JSONB, allowNull: true },
      new_values: { type: Sequelize.JSONB, allowNull: true },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      change_reason: { type: Sequelize.TEXT, allowNull: true },
      changed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('jur_approval_threshold_history', ['threshold_id'], {
      name: 'idx_jur_approval_threshold_history_threshold',
    });

    // Seed: reproduz EXATAMENTE o comportamento dos literais removidos.
    // min_value exclusivo, max_value inclusivo.
    await queryInterface.bulkInsert('jur_approval_thresholds', [
      {
        contract_type: '*',
        min_value: 0,
        max_value: 50000,
        required_roles: JSON.stringify([]),
        required_level: 'approve',
        active: true,
        valid_from: null,
        valid_to: null,
        notes: 'Faixa 1 — sem alçada extra. Seed da migração dos literais de constants.ts (FIND-ERP-005). Valores NÃO validados por assessor jurídico (BLOCO_3_JUR_API.md §2.7).',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        contract_type: '*',
        min_value: 50000,
        max_value: 300000,
        required_roles: JSON.stringify(['diretor']),
        required_level: 'approve',
        active: true,
        valid_from: null,
        valid_to: null,
        notes: 'Faixa 2 — exige diretor. Seed da migração dos literais de constants.ts (FIND-ERP-005).',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        contract_type: '*',
        min_value: 300000,
        max_value: null,
        required_roles: JSON.stringify(['diretor', 'financeiro']),
        required_level: 'approve',
        active: true,
        valid_from: null,
        valid_to: null,
        notes: 'Faixa 3 — exige diretor E financeiro. Seed da migração dos literais de constants.ts (FIND-ERP-005).',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await queryInterface.bulkInsert('jur_approval_threshold_history', [{
      threshold_id: null,
      action: 'seed',
      previous_values: null,
      new_values: JSON.stringify({
        source: 'server/src/modules/juridico/domain/constants.ts (literais removidos)',
        finding: 'FIND-ERP-005',
        approval: 'APR-2026-021 Parte B decisao 3',
      }),
      changed_by: null,
      change_reason: 'Carga inicial da politica de alcada a partir dos literais de codigo — remediacao FIND-ERP-005.',
      changed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    // ---- Falha 1 (R1(d)): snapshot da política vigente na ativação ----
    await queryInterface.addColumn('jur_contracts', 'approval_policy_snapshot', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    // ---- Falha 3: vínculo aprovação ↔ valor + invalidação com histórico ----
    await queryInterface.addColumn('jur_contract_approvals', 'approved_value', {
      type: Sequelize.DECIMAL(18, 6),
      allowNull: true,
    });
    await queryInterface.addColumn('jur_contract_approvals', 'invalidated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('jur_contract_approvals', 'invalidated_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('jur_contract_approvals', 'invalidated_by_addendum_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // ---- Falha 4 (defesa no banco) + unicidade por papel vira parcial ----
    await queryInterface.removeConstraint('jur_contract_approvals', 'uq_jur_contract_approvals_contract_role');

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX uq_jur_contract_approvals_role_active '
      + 'ON jur_contract_approvals (contract_id, approver_role) WHERE invalidated_at IS NULL;',
    );
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX uq_jur_contract_approvals_user_active '
      + 'ON jur_contract_approvals (contract_id, approver_user_id) WHERE invalidated_at IS NULL;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_jur_contract_approvals_user_active;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_jur_contract_approvals_role_active;');
    await queryInterface.addConstraint('jur_contract_approvals', {
      fields: ['contract_id', 'approver_role'],
      type: 'unique',
      name: 'uq_jur_contract_approvals_contract_role',
    });

    await queryInterface.removeColumn('jur_contract_approvals', 'invalidated_by_addendum_id');
    await queryInterface.removeColumn('jur_contract_approvals', 'invalidated_reason');
    await queryInterface.removeColumn('jur_contract_approvals', 'invalidated_at');
    await queryInterface.removeColumn('jur_contract_approvals', 'approved_value');
    await queryInterface.removeColumn('jur_contracts', 'approval_policy_snapshot');

    await queryInterface.dropTable('jur_approval_threshold_history');
    await queryInterface.dropTable('jur_approval_thresholds');
  },
};
