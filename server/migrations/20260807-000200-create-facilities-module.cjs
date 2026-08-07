'use strict';

/**
 * Módulo Facilities (departamento 17, sigla FAC) — implementação do zero.
 *
 * Antes desta migration, o departamento Facilities existia apenas como
 * linha em `departments` (seed, `server/src/config/seeds.ts`), sem NENHUMA
 * tabela própria. O spec funcional em `docs/administrativo/03-FACILITIES.md`
 * trazia um esboço `[PENDENTE]` em sintaxe MySQL — esta migration o torna
 * real em PostgreSQL, com os seguintes ajustes deliberados:
 *
 * - `fleet_vehicles` → `facility_vehicles`: nome genérico `fleet_vehicles`
 *   evitado porque não segue o padrão de prefixo por domínio adotado pelos
 *   módulos mais recentes do projeto (`sst_*`, `it_*`/`ti_*`) — prefixamos
 *   com `facility_` para deixar claro o dono do dado e evitar colisão de
 *   nome com um futuro módulo de logística/expedição que também lide com
 *   veículos (frota de entrega).
 * - `fuel_records` → `facility_fuel_records` (mesmo motivo de prefixo).
 * - `cleaning_schedule` → `facility_cleaning_schedules` (nome no plural,
 *   consistente com as demais tabelas do projeto, e prefixado).
 * - `facility_areas` mantido (já vinha prefixado no spec original).
 * - Nenhuma das 4 tabelas tem soft delete (sem coluna `deleted_at`/`active`
 *   dedicada a esconder registros) — `CLAUDE.md` §7 reserva soft delete
 *   apenas para `Category`; aqui seguimos o padrão-geral do projeto de usar
 *   enum de `status` quando a entidade tem ciclo de vida (`facility_vehicles.status`)
 *   e nenhum mecanismo de ocultação nas 3 tabelas de puro cadastro
 *   (`facility_fuel_records`, `facility_cleaning_schedules`, `facility_areas`)
 *   — não há endpoint de delete físico ou lógico neste módulo (escopo da
 *   tarefa: create/list/get/update apenas).
 * - `date` (nome de coluna reservado/ambíguo em alguns drivers) renomeado
 *   para `record_date` em `facility_fuel_records`.
 * - `updated_at` foi adicionado às 4 tabelas (o spec original só tinha em
 *   `fleet_vehicles`) para manter consistência com o padrão
 *   `created_at`/`updated_at` do restante do schema, mesmo em tabelas sem
 *   endpoint de update hoje.
 *
 * FKs:
 * - `facility_fuel_records.vehicle_id` → `facility_vehicles.id`,
 *   `ON DELETE RESTRICT` (não é possível remover um veículo com histórico
 *   de abastecimento — mesmo padrão de `production_downtimes.work_center_id`).
 * - `facility_fuel_records.driver_id` → `employees.id`, `ON DELETE SET NULL`
 *   (motorista é informativo; se o funcionário for removido do quadro, o
 *   registro de abastecimento é preservado sem o vínculo).
 * - `facility_areas.department_id` → `departments.id`, `ON DELETE SET NULL`
 *   (área física pode não pertencer a nenhum departamento específico, ex.
 *   áreas comuns/externas).
 *
 * `facility_cleaning_schedules.area` foi mantido como texto livre
 * (`VARCHAR(100)`, igual ao spec original), não como FK para
 * `facility_areas` — decisão consciente: a programação de limpeza cobre
 * áreas informais (ex. "banheiro do 2º andar", "corredor externo") que nem
 * sempre correspondem a uma `facility_area` cadastrada formalmente. Pode
 * evoluir para FK opcional em rodada futura, se o negócio pedir análise
 * cruzada área×limpeza.
 *
 * Migration idempotente (mesmo padrão de `20260806-000060-create-production-downtimes.cjs`):
 * a migration baseline (`20260731-000001-baseline-schema.cjs`) cria tabelas
 * a partir de uma lista fixa de models — as 4 tabelas deste módulo não
 * estão nessa lista, então um banco criado do zero após este commit ainda
 * precisa desta migration para nascer com o módulo Facilities pronto.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ---- facility_vehicles ----
    if (!tables.includes('facility_vehicles')) {
      await queryInterface.createTable('facility_vehicles', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        plate: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        brand: { type: Sequelize.STRING(50), allowNull: true },
        model: { type: Sequelize.STRING(50), allowNull: true },
        year: { type: Sequelize.INTEGER, allowNull: true },
        color: { type: Sequelize.STRING(30), allowNull: true },
        fuel_type: {
          type: Sequelize.ENUM('gasoline', 'ethanol', 'diesel', 'flex', 'electric'),
          allowNull: true,
        },
        renavam: { type: Sequelize.STRING(30), allowNull: true },
        chassi: { type: Sequelize.STRING(50), allowNull: true },
        insurance_company: { type: Sequelize.STRING(100), allowNull: true },
        insurance_policy: { type: Sequelize.STRING(50), allowNull: true },
        insurance_expiry: { type: Sequelize.DATEONLY, allowNull: true },
        last_oil_change: { type: Sequelize.DATEONLY, allowNull: true },
        next_oil_change_km: { type: Sequelize.INTEGER, allowNull: true },
        current_km: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('active', 'maintenance', 'deactivated', 'sold'),
          allowNull: false,
          defaultValue: 'active',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- facility_fuel_records ----
    if (!tables.includes('facility_fuel_records')) {
      await queryInterface.createTable('facility_fuel_records', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        vehicle_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'facility_vehicles', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        record_date: { type: Sequelize.DATE, allowNull: false },
        km_at_refuel: { type: Sequelize.INTEGER, allowNull: true },
        liters: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        price_per_liter: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        total_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        fuel_station: { type: Sequelize.STRING(100), allowNull: true },
        driver_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'employees', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- facility_cleaning_schedules ----
    if (!tables.includes('facility_cleaning_schedules')) {
      await queryInterface.createTable('facility_cleaning_schedules', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        area: { type: Sequelize.STRING(100), allowNull: false },
        frequency: {
          type: Sequelize.ENUM('daily', 'alternate', 'weekly', 'biweekly', 'monthly'),
          allowNull: false,
        },
        responsible_person: { type: Sequelize.STRING(100), allowNull: true },
        last_cleaning: { type: Sequelize.DATEONLY, allowNull: true },
        next_cleaning: { type: Sequelize.DATEONLY, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- facility_areas ----
    if (!tables.includes('facility_areas')) {
      await queryInterface.createTable('facility_areas', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        area_type: {
          type: Sequelize.ENUM('production', 'warehouse', 'office', 'lab', 'amenities', 'external'),
          allowNull: false,
        },
        square_meters: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        capacity_persons: { type: Sequelize.INTEGER, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // ---- índices ----
    const addIndexIfMissing = async (tableName, fields, name, options = {}) => {
      const indexes = await queryInterface.showIndex(tableName);
      if (!indexes.some((index) => index.name === name)) {
        await queryInterface.addIndex(tableName, fields, { name, ...options });
      }
    };

    await addIndexIfMissing('facility_vehicles', ['plate'], 'uq_facility_vehicles_plate', { unique: true });
    await addIndexIfMissing('facility_vehicles', ['status'], 'idx_facility_vehicles_status');
    await addIndexIfMissing('facility_fuel_records', ['vehicle_id'], 'idx_facility_fuel_records_vehicle_id');
    await addIndexIfMissing('facility_fuel_records', ['driver_id'], 'idx_facility_fuel_records_driver_id');
    await addIndexIfMissing('facility_fuel_records', ['record_date'], 'idx_facility_fuel_records_record_date');
    await addIndexIfMissing('facility_cleaning_schedules', ['next_cleaning'], 'idx_facility_cleaning_schedules_next_cleaning');
    await addIndexIfMissing('facility_areas', ['department_id'], 'idx_facility_areas_department_id');
    await addIndexIfMissing('facility_areas', ['area_type'], 'idx_facility_areas_area_type');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('facility_fuel_records');
    await queryInterface.dropTable('facility_areas');
    await queryInterface.dropTable('facility_cleaning_schedules');
    await queryInterface.dropTable('facility_vehicles');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicles_fuel_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicles_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_cleaning_schedules_frequency";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_areas_area_type";');
  },
};
