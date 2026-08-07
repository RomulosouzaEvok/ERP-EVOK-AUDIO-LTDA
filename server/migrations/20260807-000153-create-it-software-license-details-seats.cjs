'use strict';

/**
 * BLOCO 2 TI — RF-TI-024 a 030, BR-TI-008/014/015/016.
 *
 * `it_software_license_details`: extensão 1:1 de `assets`
 * (`asset_type='license'`), mesmo padrão arquitetural de
 * `ItemDetalheComercial`/`sst_tipos_epi.item_id` (CLAUDE.md §7) — NÃO
 * duplica o cadastro de licença como ativo, já existente
 * (`assets.license_expires_at`); apenas agrega os atributos que faltam
 * (fornecedor, assentos, custo, chave). `assets.license_expires_at`
 * permanece a data canônica de vencimento; `renewal_date` aqui é a data da
 * ação de renovação (tipicamente anterior ao vencimento), distinta por
 * desenho (RF-TI-024).
 *
 * A restrição "`asset_id` deve apontar para um asset com
 * `asset_type='license'`" NÃO é um CHECK/trigger cross-table (Postgres não
 * valida isso sem trigger, que o projeto evita por princípio,
 * `06-ESTRUTURAS_PROGRAMAVEIS.md`) — é responsabilidade do use-case que
 * cria a extensão, mesmo racional documentado para `sst_acoes_corretivas`.
 *
 * `license_key` trafega em texto simples na coluna (sem `pgcrypto`) — o
 * controle de exposição é 100% de aplicação (mascarar em listagens,
 * exigir módulo `ti`/`role=admin` para exibir em claro, auditar leitura —
 * BR-TI-014/RNF-TI-01). Documentado aqui para não ser lido como omissão:
 * criptografia em coluna foi considerada e descartada nesta primeira
 * versão por não haver hoje no projeto um padrão de chave de aplicação
 * para cifrar/decifrar colunas (ex.: `pgcrypto` com chave gerenciada) — se
 * a auditoria de segurança exigir, é evolução de schema futura, não deste
 * bloco.
 *
 * `it_license_seats`: alocação n:n leve funcionário × licença (RF-TI-025).
 * Bloqueio de assento excedente (`seats` contratado, RF-TI-026/BR-TI-015)
 * é regra de aplicação (contagem de linhas com `revoked_at IS NULL` no
 * momento da alocação) — não há CHECK de banco capaz de comparar contagem
 * de linhas relacionadas contra `seats` de outra tabela sem trigger.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('it_software_license_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'FK 1:1 -> assets.id (esperado asset_type=license, validado em app, BR-TI-008)',
      },
      license_type: { type: Sequelize.ENUM('perpetual', 'subscription', 'free'), allowNull: false },
      vendor: { type: Sequelize.STRING(150), allowNull: true },
      seats: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      license_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Acesso restrito (modulo ti ou role=admin) e mascarado nas demais consultas — BR-TI-014/RNF-TI-01. Controle 100% de aplicacao, ver nota de cabecalho.',
      },
      cost: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
      billing_cycle: { type: Sequelize.ENUM('one_time', 'monthly', 'yearly'), allowNull: false, defaultValue: 'one_time' },
      renewal_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Data da ultima acao de renovacao — distinta de assets.license_expires_at (data canonica de vencimento, RF-TI-024)',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE it_software_license_details ADD CONSTRAINT ck_it_software_license_details_seats_positive CHECK (seats > 0);
    `);

    await queryInterface.createTable('it_license_seats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      license_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'it_software_license_details', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_it_license_seats_active_per_employee
      ON it_license_seats (license_detail_id, employee_id)
      WHERE revoked_at IS NULL;
    `);

    await queryInterface.addIndex('it_license_seats', ['license_detail_id'], { name: 'idx_it_license_seats_license_detail_id' });
    await queryInterface.addIndex('it_license_seats', ['employee_id'], { name: 'idx_it_license_seats_employee_id' });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_it_license_seats_active_per_employee;');
    await queryInterface.dropTable('it_license_seats');
    await queryInterface.dropTable('it_software_license_details');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_software_license_details_license_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_it_software_license_details_billing_cycle";');
  },
};
