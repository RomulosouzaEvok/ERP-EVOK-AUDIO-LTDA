'use strict';

/**
 * BLOCO 3 JUR (departamento 16) — UC-52, RF-JUR-001 a 011, BR-JUR-001 a 007.
 *
 * Cria `jur_contracts`, núcleo do módulo Jurídico. Prefixo de tabela `jur_`
 * ADOTADO (correção da auditoria cruzada `AuditorIntegrador`,
 * `docs/business/BLOCO_3_JUR_AUDITORIA.md`): a primeira versão desta
 * migration criava a tabela como `contracts`, sem prefixo, alegando não
 * colisão com nada existente — decisão revertida porque o precedente real
 * e forte do projeto é PREFIXAR toda tabela nova de módulo (`sst_*` no
 * Bloco 1, `it_*` no Bloco 2), e `contracts`/`legal_cases` são nomes
 * genéricos com risco de colisão futura (ex.: um módulo de Vendas que
 * precise de "contrato" de venda). O contrato de API
 * (`docs/business/BLOCO_3_JUR_API.md`) já assumia `jur_*` desde a primeira
 * versão — esta migration foi corrigida para ficar consistente com ele.
 *
 * CONTRAPARTE POLIMÓRFICA MUTUAMENTE EXCLUSIVA (§6.2 do documento de
 * requisitos, decisão explícita repassada ao AdmDBA): CHECK garantindo
 * exatamente uma das 4 alternativas preenchida —
 * `supplier_id` XOR `client_id` XOR `employee_id` XOR
 * (`counterparty_name` + `counterparty_doc`, quando `counterparty_type='other'`).
 * Precedente aceito pelo projeto: CHECK de exclusividade mútua entre FKs
 * nullable (mesma família de solução já usada em
 * `sst_matriz_epi`/`sst_planos_exames`, ainda que lá seja "pelo menos um",
 * aqui é "exatamente um").
 *
 * RETENÇÃO/IMUTABILIDADE (RF-JUR-011/044, RNF-JUR-02/03): nenhuma rotina de
 * exclusão física é criada; `status` nunca retorna de `expired`/`terminated`
 * para `active` (enforcement de aplicação — o Postgres não impõe máquina de
 * estados sem trigger dedicada, e este bloco não introduz uma para
 * `jur_contracts` porque a transição inválida não tem valor probatório a
 * proteger de bypass administrativo direto, diferente dos casos SST).
 *
 * `responsible_user_id` é NULLABLE na criação (rascunho pode não ter gestor
 * definido ainda) mas a CHECK `ck_jur_contracts_active_requires_responsible`
 * bloqueia a transição para `active` sem ele — RF-JUR-005/BR-JUR-001 (E1 de
 * UC-52).
 *
 * `clause_checklist` (JSONB) cobre RF-JUR-010 (checklist de cláusulas
 * PI/confidencialidade/não concorrência) sem uma tabela normalizada
 * dedicada — volume baixo por contrato (3 itens fixos), estrutura livre
 * o suficiente para "não se aplica" ser um valor registrado
 * (`{"pi":"not_applicable","confidentiality":"yes","non_compete":"no"}`),
 * mesmo espírito de `sst_tipos_epi.tamanhos_variacoes` (campo livre em vez
 * de tabela normalizada para baixo volume).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jur_contracts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contract_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Gerado pela aplicacao no formato CT-AAAA-NNNN (RF-JUR-001), nao pelo banco',
      },
      contract_type: {
        type: Sequelize.ENUM(
          'commercial',
          'employment',
          'supplier',
          'service',
          'rental',
          'nda',
          'distribution',
          'commercial_representation',
          'trademark_license',
          'other'
        ),
        allowNull: false,
      },
      object: { type: Sequelize.TEXT, allowNull: false, comment: 'Objeto do contrato' },
      counterparty_type: {
        type: Sequelize.ENUM('supplier', 'client', 'employee', 'other'),
        allowNull: false,
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'clients', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      counterparty_name: { type: Sequelize.STRING(200), allowNull: true, comment: 'Contraparte avulsa, sem cadastro no ERP — exigido quando counterparty_type=other' },
      counterparty_doc: { type: Sequelize.STRING(20), allowNull: true, comment: 'CPF/CNPJ da contraparte avulsa' },
      value: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'BRL' },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true, comment: 'NULL = vigencia indeterminada' },
      renewal_auto: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      notice_days: { type: Sequelize.INTEGER, allowNull: true, comment: 'Janela de denuncia para nao-renovacao automatica (RF-JUR-006)' },
      adjustment_index: {
        type: Sequelize.ENUM('ipca', 'igpm', 'inpc', 'other', 'none'),
        allowNull: false,
        defaultValue: 'none',
        comment: 'Indice de reajuste (RF-JUR-007) — calculo do novo valor permanece manual',
      },
      adjustment_base_date: { type: Sequelize.DATEONLY, allowNull: true },
      alert_advance_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Antecedencia do alerta de vencimento (RF-JUR-005), configuravel por contrato',
      },
      clause_checklist: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Checklist PI/confidencialidade/nao-concorrencia (RF-JUR-010) para employment/supplier/nda. Estrutura livre: {pi, confidentiality, non_compete} in (yes|no|not_applicable)',
      },
      status: {
        type: Sequelize.ENUM('draft', 'in_approval', 'approved', 'signed', 'active', 'expired', 'terminated', 'canceled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      signed_at: { type: Sequelize.DATEONLY, allowNull: true },
      responsible_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Gestor interno do contrato — obrigatorio apenas para status=active (CHECK), nao no cadastro',
      },
      termination_reason: { type: Sequelize.TEXT, allowNull: true },
      termination_date: { type: Sequelize.DATEONLY, allowNull: true },
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
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_counterparty_exclusive CHECK (
        (counterparty_type = 'supplier' AND supplier_id IS NOT NULL AND client_id IS NULL AND employee_id IS NULL AND counterparty_name IS NULL AND counterparty_doc IS NULL)
        OR (counterparty_type = 'client' AND client_id IS NOT NULL AND supplier_id IS NULL AND employee_id IS NULL AND counterparty_name IS NULL AND counterparty_doc IS NULL)
        OR (counterparty_type = 'employee' AND employee_id IS NOT NULL AND supplier_id IS NULL AND client_id IS NULL AND counterparty_name IS NULL AND counterparty_doc IS NULL)
        OR (counterparty_type = 'other' AND supplier_id IS NULL AND client_id IS NULL AND employee_id IS NULL AND counterparty_name IS NOT NULL AND counterparty_doc IS NOT NULL)
      );
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_active_requires_responsible
      CHECK (status <> 'active' OR responsible_user_id IS NOT NULL);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_terminated_requires_reason
      CHECK (status <> 'terminated' OR (termination_reason IS NOT NULL AND termination_date IS NOT NULL));
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_value_non_negative CHECK (value IS NULL OR value >= 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_notice_days_non_negative CHECK (notice_days IS NULL OR notice_days >= 0);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE jur_contracts ADD CONSTRAINT ck_jur_contracts_alert_advance_days_non_negative CHECK (alert_advance_days >= 0);
    `);

    await queryInterface.addIndex('jur_contracts', ['status'], { name: 'idx_jur_contracts_status' });
    await queryInterface.addIndex('jur_contracts', ['contract_type'], { name: 'idx_jur_contracts_contract_type' });
    await queryInterface.addIndex('jur_contracts', ['supplier_id'], { name: 'idx_jur_contracts_supplier_id' });
    await queryInterface.addIndex('jur_contracts', ['client_id'], { name: 'idx_jur_contracts_client_id' });
    await queryInterface.addIndex('jur_contracts', ['employee_id'], { name: 'idx_jur_contracts_employee_id' });
    await queryInterface.addIndex('jur_contracts', ['end_date'], { name: 'idx_jur_contracts_end_date' });
    await queryInterface.addIndex('jur_contracts', ['responsible_user_id'], { name: 'idx_jur_contracts_responsible_user_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('jur_contracts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contracts_contract_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contracts_counterparty_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contracts_adjustment_index";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_jur_contracts_status";');
  },
};
