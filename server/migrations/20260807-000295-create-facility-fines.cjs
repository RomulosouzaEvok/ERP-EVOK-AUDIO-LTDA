'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-028 a 035, BR-FAC-007/008/016/017.
 * Maior exposição legal do bloco (CTB Art. 257 §7º, prazo de indicação de
 * condutor; Lei 14.071/2020).
 *
 * `facility_fines`: multa de trânsito vinculada ao veículo (`asset_id`).
 *
 * O que o banco garante:
 * - `amount > 0` (CHECK).
 * - Nunca excluída fisicamente (sem endpoint de delete previsto,
 *   RF-FAC-035/059) — apenas transições de `status`/`indication_status`.
 *
 * O que fica com a aplicação:
 * - `indication_deadline = notice_received_at + prazo_parametrizado`
 *   (default 30 dias, RF-FAC-029) — cálculo feito na escrita, não via
 *   coluna gerada, porque o prazo é parametrizável (não uma constante de
 *   30 dias fixa no banco).
 * - Transição automática para `indication_status='expired_nic'` ao vencer
 *   o prazo sem indicação (RF-FAC-031) — job/verificação ao acessar o
 *   painel, mesmo padrão de RNF-FAC-02 (sem trigger).
 * - Sugestão de `identified_driver_id` cruzando `infraction_at` + placa
 *   com `facility_vehicle_trips` (RF-FAC-032) — consulta de aplicação.
 *
 * `identified_driver_id` referencia `facility_drivers` (não `employees`
 * diretamente) — mantém consistência com o restante do módulo, que sempre
 * fala de condutor autorizado via `facility_drivers`, mesmo que o condutor
 * identificado numa multa antiga possa não estar mais `authorized=true`
 * hoje (o registro histórico da multa não muda por isso).
 *
 * `accounts_payable_id`: vínculo direto e opcional ao título gerado quando
 * a multa é paga pela empresa (RF-FAC-034) — mesmo padrão de FK direta já
 * usado em `accounts_payable.legal_case_id`
 * (`20260807-000268-add-legal-case-id-to-accounts-payable.cjs`), mas aqui
 * no sentido inverso (a multa aponta para o título, não o título para a
 * multa) porque uma multa gera no máximo um título, e a tabela nova é quem
 * está sendo criada agora.
 *
 * `financial_ref`: referência livre para o vínculo de repasse RH/Financeiro
 * quando `charge_to_driver=true` (RF-FAC-033) — não há tabela formal de
 * desconto em folha no ERP hoje; política de repasse é
 * `[VERIFICAR COM GESTOR DE FACILITIES]`, este campo só guarda a
 * identificação/observação do acordo, não implementa o desconto em si.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_fines')) return;

    await queryInterface.createTable('facility_fines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      infraction_at: { type: Sequelize.DATE, allowNull: false },
      location: { type: Sequelize.STRING(200), allowNull: true },
      infraction_code: { type: Sequelize.STRING(20), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      points: { type: Sequelize.SMALLINT, allowNull: true },
      notice_received_at: { type: Sequelize.DATEONLY, allowNull: true },
      indication_deadline: { type: Sequelize.DATEONLY, allowNull: true },
      identified_driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_drivers', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      indicated_at: { type: Sequelize.DATEONLY, allowNull: true },
      indication_status: {
        type: Sequelize.ENUM('pending', 'indicated', 'expired_nic', 'not_applicable'),
        allowNull: false,
        defaultValue: 'pending',
      },
      charge_to_driver: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      financial_ref: { type: Sequelize.STRING(150), allowNull: true },
      accounts_payable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'accounts_payable', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('open', 'paid', 'appealed', 'canceled'),
        allowNull: false,
        defaultValue: 'open',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE facility_fines ADD CONSTRAINT ck_facility_fines_amount_positive CHECK (amount > 0);
    `);

    await queryInterface.addIndex('facility_fines', ['asset_id'], { name: 'idx_facility_fines_asset_id' });
    await queryInterface.addIndex('facility_fines', ['indication_deadline'], { name: 'idx_facility_fines_indication_deadline' });
    await queryInterface.addIndex('facility_fines', ['identified_driver_id'], { name: 'idx_facility_fines_identified_driver_id' });
    await queryInterface.addIndex('facility_fines', ['status'], { name: 'idx_facility_fines_status' });
    await queryInterface.addIndex('facility_fines', ['indication_status'], { name: 'idx_facility_fines_indication_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_fines');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_fines_indication_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_fines_status";');
  },
};
