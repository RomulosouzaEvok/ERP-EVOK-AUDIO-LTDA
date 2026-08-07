'use strict';

/**
 * BLOCO 4 FAC (correção) — RF-FAC-001 a 006, decisão D-2.
 *
 * Migra `facility_vehicles` (tabela isolada, violava D-2 — duplicava
 * brand/model/status já existentes em `assets`) para o padrão de extensão
 * 1:1 já usado em `ItSoftwareLicenseDetail` (`asset_type='license'`):
 *
 *   `facility_vehicle_details.asset_id` → `assets.id` (FK NOT NULL UNIQUE)
 *
 * `assets.asset_type='vehicle'` e `assets.status`
 * (`active`/`in_maintenance`/`decommissioned`/`lost`/`returned_to_supplier`)
 * já existem no schema base — nenhum ALTER TYPE necessário aqui (diferente
 * do precedente `20260805-000002-add-asset-type-license.cjs`, que precisou
 * adicionar o valor `license` ao enum).
 *
 * RNF-FAC-03: nenhum dado de `facility_vehicles` pode ser perdido.
 * Estratégia de migração de dado (dentro desta única migration, para não
 * deixar um estado intermediário órfão entre migrations):
 *   1. Cria `facility_vehicle_details` (schema completo, ver RF-FAC-002).
 *   2. Para cada linha de `facility_vehicles`: cria um `Asset`
 *      (`asset_type='vehicle'`, `tag='VEIC-<placa>'` — placa é única,
 *      então a tag também é; `name` = "<brand> <model>" ou "Veículo <placa>"
 *      quando brand/model ausentes), mapeando status
 *      (`active`→`active`, `maintenance`→`in_maintenance`,
 *      `deactivated`/`sold`→`decommissioned`, com a distinção original
 *      registrada em `assets.notes` — RF-FAC-001), preservando
 *      `created_at`/`updated_at` originais.
 *   3. Insere a linha correspondente em `facility_vehicle_details` com os
 *      campos específicos de veículo. Os campos de seguro
 *      (`insurance_company`/`insurance_policy`/`insurance_expiry`) e troca
 *      de óleo (`last_oil_change`/`next_oil_change_km`) são preservados
 *      como colunas "legado" na própria extensão — o desenho-alvo do
 *      RF-FAC-002 é generalizar seguro em `facility_vehicle_documents`
 *      (migration seguinte, 000291) e óleo/preventiva em
 *      `maintenance_orders.next_maintenance_km` (RF-FAC-036, migration
 *      000296); manter as colunas legado aqui evita qualquer perda de dado
 *      sem depender de uma migration futura para não regredir a integridade
 *      (RNF-FAC-03). Uma rotina de aplicação pode, no futuro, criar os
 *      `facility_vehicle_documents`/`maintenance_orders` equivalentes a
 *      partir dessas colunas legado e então elas podem ser descontinuadas —
 *      fora do escopo desta migration de schema.
 *   4. Migra `facility_fuel_records.vehicle_id` (→ `facility_vehicles.id`)
 *      para `facility_fuel_records.asset_id` (→ `assets.id`), usando o mapa
 *      construído no passo 2, e remove a coluna/FK antiga.
 *   5. Dropa `facility_vehicles` e seus enums órfãos.
 *
 * Idempotente: se `facility_vehicles` não existir mais (migration já
 * aplicada), o `up()` não faz nada. Testado apenas contra uma tabela vazia
 * ou sem dados neste ambiente — ver ressalva de risco no handoff; antes de
 * aplicar num banco com dados reais de `facility_vehicles`, rodar contra
 * uma cópia do banco primeiro (RNF-FAC-03).
 *
 * `down()`: reconstrói `facility_vehicles` a partir de
 * `facility_vehicle_details` + `assets` (mapeamento reverso de status;
 * `deactivated`/`sold` não são distinguíveis depois de ambos virarem
 * `decommissioned` — o rollback usa `deactivated` como default e depende do
 * texto salvo em `assets.notes` apenas para leitura humana, não
 * reprocessamento automático). Rollback é best-effort: aceitável para
 * reverter uma aplicação recente desta migration, não uma operação de longo
 * prazo depois de novas linhas terem sido criadas diretamente em
 * `facility_vehicle_details`/`assets`.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('facility_vehicles')) {
      // Já migrado (ou banco criado depois desta migration, sem a tabela
      // legada nunca ter existido) — nada a fazer.
      return;
    }

    if (!tables.includes('facility_vehicle_details')) {
      await queryInterface.createTable('facility_vehicle_details', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        asset_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'assets', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        plate: { type: Sequelize.STRING(10), allowNull: false, unique: true },
        renavam: { type: Sequelize.STRING(30), allowNull: true },
        chassi: { type: Sequelize.STRING(50), allowNull: true },
        color: { type: Sequelize.STRING(30), allowNull: true },
        year: { type: Sequelize.INTEGER, allowNull: true },
        fuel_type: {
          type: Sequelize.ENUM('gasoline', 'ethanol', 'diesel', 'flex', 'electric'),
          allowNull: true,
        },
        current_km: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        tank_capacity_liters: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        required_cnh_category: { type: Sequelize.STRING(5), allowNull: true },
        // Colunas legado, ver nota de cabeçalho (item 3) — candidatas a
        // descontinuação futura em favor de facility_vehicle_documents /
        // maintenance_orders.next_maintenance_km.
        last_oil_change: { type: Sequelize.DATEONLY, allowNull: true },
        next_oil_change_km: { type: Sequelize.INTEGER, allowNull: true },
        insurance_company: { type: Sequelize.STRING(100), allowNull: true },
        insurance_policy: { type: Sequelize.STRING(50), allowNull: true },
        insurance_expiry: { type: Sequelize.DATEONLY, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });

      await queryInterface.sequelize.query(`
        ALTER TABLE facility_vehicle_details ADD CONSTRAINT ck_facility_vehicle_details_current_km_non_negative CHECK (current_km >= 0);
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE facility_vehicle_details ADD CONSTRAINT ck_facility_vehicle_details_tank_capacity_positive CHECK (tank_capacity_liters IS NULL OR tank_capacity_liters > 0);
      `);

      await queryInterface.addIndex('facility_vehicle_details', ['fuel_type'], { name: 'idx_facility_vehicle_details_fuel_type' });
    }

    // ---- Backfill de dado: facility_vehicles -> assets + facility_vehicle_details ----
    // RESSALVA DA AUDITORIA (endurecida na implementação, 2026-08-07):
    // 1. Todo o backfill roda dentro de UMA transação explícita
    //    (`queryInterface.sequelize.transaction`) — se qualquer INSERT/UPDATE
    //    falhar no meio do loop (ex.: violação de constraint numa linha
    //    específica), NENHUM asset/detalhe órfão fica gravado; a migration
    //    inteira faz rollback e pode ser reexecutada do zero com segurança.
    // 2. Idempotência por linha (não só por tabela): cada veículo é
    //    verificado por `plate` em `facility_vehicle_details` ANTES do
    //    INSERT — se um veículo específico já tiver sido migrado (ex.: uma
    //    execução anterior que falhou APÓS já ter migrado parte das linhas,
    //    num ambiente sem a transação — cenário que a transação acima já
    //    torna impossível para execuções futuras, mas mantido como defesa
    //    em profundidade para reexecuções manuais/parciais), a linha é
    //    pulada e o mapa `vehicleIdToAssetId` é preenchido a partir do
    //    `asset_id` já existente, para que o passo de `facility_fuel_records`
    //    abaixo continue correto mesmo num backfill parcial.
    const statusMap = {
      active: 'active',
      maintenance: 'in_maintenance',
      deactivated: 'decommissioned',
      sold: 'decommissioned',
    };

    /** @type {Map<number, number>} old facility_vehicles.id -> new assets.id */
    const vehicleIdToAssetId = new Map();

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [vehicles] = await queryInterface.sequelize.query('SELECT * FROM facility_vehicles ORDER BY id ASC', { transaction });

      for (const v of vehicles) {
        const [existingDetail] = await queryInterface.sequelize.query(
          'SELECT asset_id FROM facility_vehicle_details WHERE plate = :plate',
          { replacements: { plate: v.plate }, transaction }
        );

        if (existingDetail.length) {
          // Já migrado (reexecução parcial) — só popula o mapa para o
          // passo seguinte de facility_fuel_records, sem duplicar.
          vehicleIdToAssetId.set(v.id, existingDetail[0].asset_id);
          continue;
        }

        const assetStatus = statusMap[v.status] || 'active';
        const notesParts = [];
        if (v.status === 'deactivated' || v.status === 'sold') {
          notesParts.push(`Status original em facility_vehicles (pré-migração D-2): ${v.status}`);
        }
        if (v.notes) notesParts.push(v.notes);
        const assetName = [v.brand, v.model].filter(Boolean).join(' ').trim() || `Veículo ${v.plate}`;
        const tag = `VEIC-${v.plate}`;

        const [assetInsert] = await queryInterface.sequelize.query(
          `INSERT INTO assets (tag, name, asset_type, brand, model, status, notes, created_at, updated_at)
           VALUES (:tag, :name, 'vehicle', :brand, :model, :status, :notes, :created_at, :updated_at)
           RETURNING id`,
          {
            replacements: {
              tag,
              name: assetName,
              brand: v.brand || null,
              model: v.model || null,
              status: assetStatus,
              notes: notesParts.length ? notesParts.join(' | ') : null,
              created_at: v.created_at,
              updated_at: v.updated_at,
            },
            transaction,
          }
        );
        const assetId = assetInsert[0].id;
        vehicleIdToAssetId.set(v.id, assetId);

        await queryInterface.sequelize.query(
          `INSERT INTO facility_vehicle_details
             (asset_id, plate, renavam, chassi, color, year, fuel_type, current_km,
              last_oil_change, next_oil_change_km, insurance_company, insurance_policy, insurance_expiry,
              created_at, updated_at)
           VALUES
             (:asset_id, :plate, :renavam, :chassi, :color, :year, :fuel_type, :current_km,
              :last_oil_change, :next_oil_change_km, :insurance_company, :insurance_policy, :insurance_expiry,
              :created_at, :updated_at)`,
          {
            replacements: {
              asset_id: assetId,
              plate: v.plate,
              renavam: v.renavam || null,
              chassi: v.chassi || null,
              color: v.color || null,
              year: v.year || null,
              fuel_type: v.fuel_type || null,
              current_km: v.current_km || 0,
              last_oil_change: v.last_oil_change || null,
              next_oil_change_km: v.next_oil_change_km || null,
              insurance_company: v.insurance_company || null,
              insurance_policy: v.insurance_policy || null,
              insurance_expiry: v.insurance_expiry || null,
              created_at: v.created_at,
              updated_at: v.updated_at,
            },
            transaction,
          }
        );
      }

      // ---- Migra facility_fuel_records.vehicle_id -> asset_id ----
      const fuelColumns = await queryInterface.describeTable('facility_fuel_records');
      if (fuelColumns.vehicle_id && !fuelColumns.asset_id) {
        await queryInterface.addColumn('facility_fuel_records', 'asset_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'assets', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }, { transaction });

        for (const [oldVehicleId, assetId] of vehicleIdToAssetId.entries()) {
          await queryInterface.sequelize.query(
            'UPDATE facility_fuel_records SET asset_id = :assetId WHERE vehicle_id = :oldVehicleId',
            { replacements: { assetId, oldVehicleId }, transaction }
          );
        }

        await queryInterface.sequelize.query(
          'ALTER TABLE facility_fuel_records ALTER COLUMN asset_id SET NOT NULL',
          { transaction }
        );

        const fuelIndexes = await queryInterface.showIndex('facility_fuel_records', { transaction });
        if (fuelIndexes.some((i) => i.name === 'idx_facility_fuel_records_vehicle_id')) {
          await queryInterface.removeIndex('facility_fuel_records', 'idx_facility_fuel_records_vehicle_id', { transaction });
        }
        await queryInterface.removeColumn('facility_fuel_records', 'vehicle_id', { transaction });
        await queryInterface.addIndex('facility_fuel_records', ['asset_id'], { name: 'idx_facility_fuel_records_asset_id', transaction });
      }

      // ---- Dropa a tabela legada ----
      await queryInterface.dropTable('facility_vehicles', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicles_fuel_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicles_status";', { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('facility_vehicles') || !tables.includes('facility_vehicle_details')) {
      // Nada a reverter (já revertido, ou nunca foi aplicado).
      return;
    }

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

    const reverseStatusMap = {
      active: 'active',
      in_maintenance: 'maintenance',
      decommissioned: 'deactivated',
      lost: 'deactivated',
      returned_to_supplier: 'deactivated',
    };

    const [details] = await queryInterface.sequelize.query(
      `SELECT d.*, a.status AS asset_status, a.brand AS asset_brand, a.model AS asset_model, a.notes AS asset_notes
       FROM facility_vehicle_details d
       JOIN assets a ON a.id = d.asset_id
       ORDER BY d.id ASC`
    );

    const assetIdToVehicleId = new Map();

    for (const d of details) {
      const [vehicleInsert] = await queryInterface.sequelize.query(
        `INSERT INTO facility_vehicles
           (plate, brand, model, year, color, fuel_type, renavam, chassi,
            insurance_company, insurance_policy, insurance_expiry, last_oil_change, next_oil_change_km,
            current_km, status, notes, created_at, updated_at)
         VALUES
           (:plate, :brand, :model, :year, :color, :fuel_type, :renavam, :chassi,
            :insurance_company, :insurance_policy, :insurance_expiry, :last_oil_change, :next_oil_change_km,
            :current_km, :status, :notes, :created_at, :updated_at)
         RETURNING id`,
        {
          replacements: {
            plate: d.plate,
            brand: d.asset_brand || null,
            model: d.asset_model || null,
            year: d.year || null,
            color: d.color || null,
            fuel_type: d.fuel_type || null,
            renavam: d.renavam || null,
            chassi: d.chassi || null,
            insurance_company: d.insurance_company || null,
            insurance_policy: d.insurance_policy || null,
            insurance_expiry: d.insurance_expiry || null,
            last_oil_change: d.last_oil_change || null,
            next_oil_change_km: d.next_oil_change_km || null,
            current_km: d.current_km || 0,
            status: reverseStatusMap[d.asset_status] || 'active',
            notes: d.asset_notes || null,
            created_at: d.created_at,
            updated_at: d.updated_at,
          },
        }
      );
      assetIdToVehicleId.set(d.asset_id, vehicleInsert[0].id);
    }

    const fuelColumns = await queryInterface.describeTable('facility_fuel_records');
    if (fuelColumns.asset_id && !fuelColumns.vehicle_id) {
      await queryInterface.addColumn('facility_fuel_records', 'vehicle_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'facility_vehicles', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });

      for (const [assetId, vehicleId] of assetIdToVehicleId.entries()) {
        await queryInterface.sequelize.query(
          'UPDATE facility_fuel_records SET vehicle_id = :vehicleId WHERE asset_id = :assetId',
          { replacements: { vehicleId, assetId } }
        );
      }

      await queryInterface.sequelize.query(
        'ALTER TABLE facility_fuel_records ALTER COLUMN vehicle_id SET NOT NULL'
      );

      const fuelIndexes = await queryInterface.showIndex('facility_fuel_records');
      if (fuelIndexes.some((i) => i.name === 'idx_facility_fuel_records_asset_id')) {
        await queryInterface.removeIndex('facility_fuel_records', 'idx_facility_fuel_records_asset_id');
      }
      await queryInterface.removeColumn('facility_fuel_records', 'asset_id');
      await queryInterface.addIndex('facility_fuel_records', ['vehicle_id'], { name: 'idx_facility_fuel_records_vehicle_id' });
    }

    // Remove os assets criados pela migração (apenas os que vieram de
    // facility_vehicle_details, identificados pela tag 'VEIC-%').
    await queryInterface.sequelize.query(`DELETE FROM assets WHERE id IN (${[...assetIdToVehicleId.keys()].join(',') || 'NULL'}) AND tag LIKE 'VEIC-%'`);

    await queryInterface.dropTable('facility_vehicle_details');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_facility_vehicle_details_fuel_type";');

    await queryInterface.addIndex('facility_vehicles', ['plate'], { name: 'uq_facility_vehicles_plate', unique: true });
    await queryInterface.addIndex('facility_vehicles', ['status'], { name: 'idx_facility_vehicles_status' });
  },
};
