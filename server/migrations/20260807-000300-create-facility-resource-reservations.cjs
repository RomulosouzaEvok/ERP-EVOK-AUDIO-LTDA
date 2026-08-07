'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-054 a 056, BR-FAC-014 (P2).
 *
 * `facility_resource_reservations`: reserva de sala (`facility_area_id`)
 * ou equipamento (`asset_id`) — exatamente um dos dois, conforme
 * `resource_type` (CHECK).
 *
 * RF-FAC-055 (não pode haver sobreposição de intervalo entre reservas
 * `confirmed` do mesmo recurso) é implementada como constraint real de
 * banco — `EXCLUDE USING gist`, não apenas validação de aplicação — para
 * seguir a diretriz "verdade no banco" (CLAUDE.md §7) num requisito onde
 * isso é diretamente viável em Postgres. Exige a extensão `btree_gist`
 * (permite comparar `=` de colunas escalares dentro do `EXCLUDE`, além do
 * `&&` de `tstzrange`).
 *
 * Risco/observação: `CREATE EXTENSION` requer privilégio (`CREATEDB`/
 * superuser, ou a extensão já estar na allowlist do Postgres gerenciado);
 * no Postgres local via Docker deste projeto isso não costuma ser
 * problema (superuser padrão), mas é a única migration deste bloco cujo
 * `up()` pode falhar por permissão dependendo do ambiente — reportar ao
 * dono antes de aplicar em produção se a extensão não puder ser criada.
 *
 * Nenhum precedente de `CREATE EXTENSION` foi encontrado em migrations
 * anteriores do projeto — é a primeira vez que esse recurso é necessário.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_resource_reservations')) return;

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');

    await queryInterface.createTable('facility_resource_reservations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      resource_type: { type: Sequelize.ENUM('room', 'equipment'), allowNull: false },
      facility_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_areas', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      asset_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'assets', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      reserved_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      subject: { type: Sequelize.STRING(200), allowNull: true },
      status: {
        type: Sequelize.ENUM('confirmed', 'canceled', 'completed'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE facility_resource_reservations ADD CONSTRAINT ck_facility_resource_reservations_ends_after_starts
      CHECK (ends_at > starts_at);
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_resource_reservations ADD CONSTRAINT ck_facility_resource_reservations_resource_matches_type
      CHECK (
        (resource_type = 'room' AND facility_area_id IS NOT NULL AND asset_id IS NULL)
        OR
        (resource_type = 'equipment' AND asset_id IS NOT NULL AND facility_area_id IS NULL)
      );
    `);

    // RF-FAC-055: sem sobreposição de intervalo entre reservas 'confirmed'
    // do mesmo recurso (sala OU equipamento — COALESCE trata o outro lado
    // como -1, nunca colidindo entre um recurso sala e um equipamento).
    await queryInterface.sequelize.query(`
      ALTER TABLE facility_resource_reservations ADD CONSTRAINT excl_facility_resource_reservations_no_overlap
      EXCLUDE USING gist (
        COALESCE(facility_area_id, -1) WITH =,
        COALESCE(asset_id, -1) WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      ) WHERE (status = 'confirmed');
    `);

    await queryInterface.addIndex('facility_resource_reservations', ['facility_area_id'], { name: 'idx_facility_resource_reservations_facility_area_id' });
    await queryInterface.addIndex('facility_resource_reservations', ['asset_id'], { name: 'idx_facility_resource_reservations_asset_id' });
    await queryInterface.addIndex('facility_resource_reservations', ['reserved_by'], { name: 'idx_facility_resource_reservations_reserved_by' });
    await queryInterface.addIndex('facility_resource_reservations', ['status'], { name: 'idx_facility_resource_reservations_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_resource_reservations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_resource_reservations_resource_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_resource_reservations_status";');
    // Nota: NÃO faz DROP EXTENSION btree_gist — outras tabelas/migrations
    // futuras podem depender dela; extensão é recurso compartilhado do
    // banco, não desta tabela.
  },
};
