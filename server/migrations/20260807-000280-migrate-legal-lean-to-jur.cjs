'use strict';

/**
 * BLOCO 3 JUR — migration de transição/substituição do módulo Jurídico
 * enxuto (`legal_contracts`/`legal_contract_addendums`/
 * `legal_contract_reminders`/`legal_intellectual_property`, migration
 * `20260807-000220-create-legal-module.cjs`, commit `2ad27fd`) pelo Bloco
 * 3 completo (`jur_*`, migrations `20260807-000260` a `20260807-000271`).
 *
 * Segue à risca o plano de substituição de
 * `docs/business/BLOCO_3_JUR_AUDITORIA.md` §6.2:
 *
 * 1. COPIA (nunca move) os dados das 4 tabelas antigas para as `jur_*`
 *    equivalentes, com tradução explícita de enum PT-BR → inglês e
 *    perdas assumidas/documentadas (ver comentários por bloco abaixo).
 * 2. Só então DROPA as 4 tabelas antigas — dentro da MESMA transação da
 *    cópia (se a cópia falhar, o DROP não executa).
 * 3. NÃO deleta a migration `20260807-000220-create-legal-module.cjs` —
 *    continua existindo e sendo idempotente (`showAllTables()` antes de
 *    criar), apenas tem seu resultado removido em runtime por esta
 *    migration subsequente.
 * 4. Idempotente/segura quando as tabelas antigas nunca existiram (banco
 *    criado do zero após a substituição, ou ambiente que nunca aplicou a
 *    `000220`): todo o bloco de cópia é pulado silenciosamente via
 *    `queryInterface.showAllTables()`.
 *
 * MAPEAMENTO DE DADOS (perdas assumidas, ver auditoria §6.2 item 2):
 * - `legal_contracts` → `jur_contracts`: `contract_type` traduzido por
 *   `CASE WHEN` (PT-BR → inglês); `party_a`/`party_b` (texto livre) não tem
 *   equivalente em `jur_contracts` (FK polimórfica) — gravado como
 *   `counterparty_type='other'`, `counterparty_name=party_b`,
 *   `counterparty_doc='MIGRADO-SEM-DOC'` (placeholder explícito exigido
 *   pelo CHECK de exclusividade mútua); `responsible_user_id` só é
 *   preenchido (com o usuário admin mais antigo, fallback) quando
 *   `status='active'` — exigência do CHECK `ck_jur_contracts_active_requires_responsible`.
 *   `contract_number` truncado para 20 caracteres (`jur_contracts` é
 *   VARCHAR(20) vs. VARCHAR(50) do enxuto) — risco de colisão em números
 *   muito longos, aceito (dataset real pequeno).
 * - `legal_contract_addendums` → `jur_contract_addendums`: mapeamento
 *   direto; `previous_end_date`/`previous_value` (que o enxuto não tinha)
 *   ficam NULL — perda de dado histórico aceita, não reconstruível.
 * - `legal_contract_reminders` → `jur_legal_alerts`: só os lembretes ainda
 *   NÃO notificados (`notified=false`) migram, como
 *   `origin_type='contract'`, `alert_subtype` derivado de `reminder_type`;
 *   lembretes já notificados não têm mais função e não são recriados.
 * - `legal_intellectual_property` → `jur_intellectual_property`:
 *   mapeamento direto na maioria dos campos; `owner`/`jurisdiction` são
 *   descartados (sempre "EVOK ÁUDIO LTDA"/"BR" no dataset real, sem falta
 *   funcional); `status='examined'` (que `jur_intellectual_property` não
 *   tem) mapeado para `filed`; `responsible_user_id` (NOT NULL, inexistente
 *   no enxuto) recebe o usuário admin mais antigo como default — precisa
 *   de reatribuição manual pós-migração.
 *
 * `down()`: melhor-esforço, NÃO reverte a cópia de dados (reconstruir as 4
 * tabelas do enxuto com os dados originais seria reconstruir um estado com
 * perda de informação já conhecida) — apenas recria as 4 tabelas vazias
 * (mesmo shape da `000220`), mesmo padrão já aceito em outras migrations de
 * dado do projeto.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('legal_contracts')) {
      // Banco novo (nunca aplicou a 000220) ou já migrado — nada a copiar.
      return;
    }

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [adminRows] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1;`,
        { transaction },
      );
      let fallbackUserId = adminRows[0]?.id;
      if (!fallbackUserId) {
        const [anyUserRows] = await queryInterface.sequelize.query(
          `SELECT id FROM users ORDER BY id ASC LIMIT 1;`,
          { transaction },
        );
        fallbackUserId = anyUserRows[0]?.id;
      }
      if (!fallbackUserId) {
        // Banco sem nenhum usuário (não deveria acontecer em produção/dev
        // seedado) — não há como satisfazer created_by/responsible_user_id
        // NOT NULL de jur_contracts/jur_intellectual_property. Aborta a
        // cópia com erro explícito em vez de inserir dado inconsistente.
        throw new Error(
          'Migração 20260807-000280: nenhum usuário encontrado em `users` — impossível migrar legal_* para jur_* sem um created_by/responsible_user_id válido.',
        );
      }

      // ---- 1. legal_contracts → jur_contracts ----
      await queryInterface.sequelize.query(
        `
        INSERT INTO jur_contracts (
          contract_number, contract_type, object, counterparty_type,
          counterparty_name, counterparty_doc, value, currency,
          start_date, end_date, renewal_auto, notice_days, adjustment_index,
          status, responsible_user_id, created_by, created_at, updated_at
        )
        SELECT
          LEFT(lc.contract_number, 20),
          CASE lc.contract_type
            WHEN 'clt_indeterminado' THEN 'employment'
            WHEN 'clt_determinado' THEN 'employment'
            WHEN 'experiencia' THEN 'employment'
            WHEN 'estagio' THEN 'employment'
            WHEN 'aprendiz' THEN 'employment'
            WHEN 'distribuicao' THEN 'distribution'
            WHEN 'representacao_comercial' THEN 'commercial_representation'
            WHEN 'fornecimento' THEN 'supplier'
            WHEN 'prestacao_servicos' THEN 'service'
            WHEN 'confidencialidade' THEN 'nda'
            WHEN 'licenciamento_marca' THEN 'trademark_license'
            ELSE 'other'
          END::"enum_jur_contracts_contract_type",
          COALESCE(lc.title, 'Contrato migrado') || COALESCE(' — ' || lc.subject, ''),
          'other'::"enum_jur_contracts_counterparty_type",
          lc.party_b,
          'MIGRADO-SEM-DOC',
          lc.value,
          'BRL',
          lc.start_date,
          lc.end_date,
          lc.auto_renewal,
          lc.notice_period_days,
          'none'::"enum_jur_contracts_adjustment_index",
          lc.status::text::"enum_jur_contracts_status",
          CASE WHEN lc.status = 'active' THEN :fallbackUserId ELSE NULL END,
          :fallbackUserId,
          lc.created_at,
          lc.updated_at
        FROM legal_contracts lc;
        `,
        { transaction, replacements: { fallbackUserId } },
      );

      await queryInterface.sequelize.query(
        `CREATE TEMP TABLE _jur_contract_map (old_id integer PRIMARY KEY, new_id integer NOT NULL) ON COMMIT DROP;`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
        INSERT INTO _jur_contract_map (old_id, new_id)
        SELECT lc.id, jc.id
        FROM legal_contracts lc
        JOIN jur_contracts jc ON jc.contract_number = LEFT(lc.contract_number, 20);
        `,
        { transaction },
      );

      // ---- 2. legal_contract_addendums → jur_contract_addendums ----
      await queryInterface.sequelize.query(
        `
        INSERT INTO jur_contract_addendums (
          contract_id, addendum_number, addendum_type, description,
          previous_end_date, new_end_date, previous_value, new_value,
          document_url, signed_at, created_by, created_at
        )
        SELECT
          map.new_id,
          la.addendum_number,
          la.change_type::text::"enum_jur_contract_addendums_addendum_type",
          COALESCE(la.description, 'Aditivo migrado do módulo Jurídico enxuto (sem descrição original)'),
          NULL,
          la.new_end_date,
          NULL,
          la.new_value,
          la.file_path,
          la.signed_date,
          :fallbackUserId,
          la.created_at
        FROM legal_contract_addendums la
        JOIN _jur_contract_map map ON map.old_id = la.contract_id;
        `,
        { transaction, replacements: { fallbackUserId } },
      );

      // ---- 3. legal_contract_reminders (não notificados) → jur_legal_alerts ----
      await queryInterface.sequelize.query(
        `
        INSERT INTO jur_legal_alerts (
          origin_type, origin_id, alert_subtype, due_date, recipient_user_id, status, created_at
        )
        SELECT
          'contract'::"enum_jur_legal_alerts_origin_type",
          map.new_id,
          CASE lr.reminder_type
            WHEN 'renewal' THEN 'renewal_notice'
            WHEN 'expiration' THEN 'expiration'
            WHEN 'notice' THEN 'renewal_notice'
            WHEN 'payment' THEN 'payment'
            ELSE 'expiration'
          END,
          lr.reminder_date,
          :fallbackUserId,
          'pending'::"enum_jur_legal_alerts_status",
          lr.created_at
        FROM legal_contract_reminders lr
        JOIN _jur_contract_map map ON map.old_id = lr.contract_id
        WHERE lr.notified = false;
        `,
        { transaction, replacements: { fallbackUserId } },
      );

      // ---- 4. legal_intellectual_property → jur_intellectual_property ----
      await queryInterface.sequelize.query(
        `
        INSERT INTO jur_intellectual_property (
          ip_type, registration_number, title, description,
          filing_date, grant_date, expiration_date, status,
          responsible_user_id, created_at, updated_at
        )
        SELECT
          lip.ip_type::text::"enum_jur_intellectual_property_ip_type",
          lip.registration_number,
          lip.title,
          lip.description,
          lip.filing_date,
          lip.grant_date,
          lip.expiration_date,
          CASE WHEN lip.status = 'examined' THEN 'filed' ELSE lip.status::text END::"enum_jur_intellectual_property_status",
          :fallbackUserId,
          lip.created_at,
          lip.updated_at
        FROM legal_intellectual_property lip;
        `,
        { transaction, replacements: { fallbackUserId } },
      );

      // ---- 5. Dropa as 4 tabelas antigas (só depois da cópia bem-sucedida) ----
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS legal_contract_addendums;', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS legal_contract_reminders;', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS legal_contracts;', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS legal_intellectual_property;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contracts_contract_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contracts_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contract_addendums_change_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_contract_reminders_reminder_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_intellectual_property_ip_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_intellectual_property_status";', { transaction });
    });
  },

  /**
   * Melhor-esforço: recria as 4 tabelas vazias (mesmo shape da `000220`).
   * NÃO restaura os dados migrados para `jur_*` — ver cabeçalho da migration.
   */
  async down(queryInterface, Sequelize) {
    console.warn(
      '[20260807-000280] down(): recriando legal_contracts/legal_contract_addendums/' +
      'legal_contract_reminders/legal_intellectual_property VAZIAS. Os dados migrados ' +
      'para jur_* NÃO retornam automaticamente — restaure de backup se necessário.',
    );

    const tables = await queryInterface.showAllTables();

    if (!tables.includes('legal_contracts')) {
      await queryInterface.createTable('legal_contracts', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        contract_type: {
          type: Sequelize.ENUM(
            'clt_indeterminado', 'clt_determinado', 'experiencia', 'estagio', 'aprendiz',
            'distribuicao', 'representacao_comercial', 'fornecimento', 'prestacao_servicos',
            'confidencialidade', 'licenciamento_marca', 'outro',
          ),
          allowNull: false,
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        party_a: { type: Sequelize.STRING(200), allowNull: false },
        party_b: { type: Sequelize.STRING(200), allowNull: false },
        subject: { type: Sequelize.TEXT, allowNull: true },
        value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        auto_renewal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        notice_period_days: { type: Sequelize.INTEGER, allowNull: true },
        file_path: { type: Sequelize.STRING(255), allowNull: true },
        status: {
          type: Sequelize.ENUM('draft', 'signed', 'active', 'expired', 'terminated'),
          allowNull: false,
          defaultValue: 'draft',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    if (!tables.includes('legal_contract_addendums')) {
      await queryInterface.createTable('legal_contract_addendums', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'legal_contracts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        addendum_number: { type: Sequelize.INTEGER, allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        change_type: { type: Sequelize.ENUM('term', 'value', 'clause', 'party', 'other'), allowNull: false },
        new_end_date: { type: Sequelize.DATEONLY, allowNull: true },
        new_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        file_path: { type: Sequelize.STRING(255), allowNull: true },
        signed_date: { type: Sequelize.DATEONLY, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    if (!tables.includes('legal_contract_reminders')) {
      await queryInterface.createTable('legal_contract_reminders', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        contract_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'legal_contracts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        reminder_type: { type: Sequelize.ENUM('renewal', 'expiration', 'notice', 'payment'), allowNull: false },
        reminder_date: { type: Sequelize.DATEONLY, allowNull: false },
        days_before: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
        notified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    if (!tables.includes('legal_intellectual_property')) {
      await queryInterface.createTable('legal_intellectual_property', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        ip_type: { type: Sequelize.ENUM('trademark', 'patent', 'industrial_design', 'copyright', 'trade_secret'), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        registration_number: { type: Sequelize.STRING(50), allowNull: true },
        filing_date: { type: Sequelize.DATEONLY, allowNull: true },
        grant_date: { type: Sequelize.DATEONLY, allowNull: true },
        expiration_date: { type: Sequelize.DATEONLY, allowNull: true },
        owner: { type: Sequelize.STRING(200), allowNull: false, defaultValue: 'EVOK ÁUDIO LTDA' },
        status: { type: Sequelize.ENUM('filed', 'examined', 'granted', 'expired', 'abandoned'), allowNull: false, defaultValue: 'filed' },
        jurisdiction: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'BR' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }
  },
};
