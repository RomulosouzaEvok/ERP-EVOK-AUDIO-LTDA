'use strict';

const fs = require('fs');
const path = require('path');

const PRE_DYNAMIC_SQL_FILES = [
  '01_schema.sql',
  '02_indexes.sql',
  '02a_extend_item_estruturas.sql',
];

const POST_DYNAMIC_SQL_FILES = [
  '04a_inventory_movements_expand.sql',
  '04b_purchase_order_items_expand.sql',
  '04c_sale_items_expand.sql',
  '04d_production_orders_expand.sql',
  '04e_production_lot_consumptions_expand.sql',
  '04f_lot_controls_expand.sql',
  '04g_serial_numbers_expand.sql',
  '04h_production_routes_expand.sql',
  '04i_bill_of_material_items_expand.sql',
];

const DYNAMIC_MODEL_FILES = [
  'User',
  'Client',
  'Category',
  'Product',
  'Supplier',
  'Purchase',
  'PurchaseItem',
  'Sale',
  'SaleItem',
  'AccountReceivable',
  'AccountPayable',
  'InventoryMovement',
  'InventoryCount',
  'InventoryCountItem',
  'ProductCostLedger',
  'Department',
  'Employee',
  'ProductionOrder',
  'ProductionRoute',
  'ProductionRouteStep',
  'ProductionOrderTracking',
  'LotControl',
  'SerialNumber',
  'ProductionLotConsumption',
  'ServiceOrder',
  'Asset',
  'NonConformity',
  'MaintenanceOrder',
  'AuditLog',
  'BillOfMaterial',
  'BillOfMaterialItem',
  'Item',
  'ItemEstrutura',
  'ItemCategoria',
  'ItemDetalheComercial',
  'ItemEspecificacaoTecnica',
  'MrpOrdemPlanejada',
];

function resolveSqlFile(fileName) {
  return path.resolve(__dirname, '..', 'database', 'postgresql', fileName);
}

function resolveBuiltModel(fileName) {
  return path.resolve(__dirname, '..', 'dist', 'src', 'models', `${fileName}.js`);
}

function cleanSql(sql) {
  return sql
    .replace(/^\s*BEGIN;\s*$/gim, '')
    .replace(/^\s*COMMIT;\s*$/gim, '')
    .replace(/^\s*\\.*$/gim, '')
    .trim();
}

async function executeSqlFile(queryInterface, fileName) {
  const filePath = resolveSqlFile(fileName);
  const sql = cleanSql(fs.readFileSync(filePath, 'utf8'));

  if (!sql) {
    return;
  }

  await queryInterface.sequelize.query(sql);
}

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    return false;
  }
}

async function countExistingTables(queryInterface, tableNames) {
  let count = 0;

  for (const tableName of tableNames) {
    if (await tableExists(queryInterface, tableName)) {
      count += 1;
    }
  }

  return count;
}

async function shouldBootstrapCanonicalSchema(queryInterface) {
  const baselineMarkers = [
    'items',
    'users',
    'suppliers',
    'sales',
    'production_orders',
  ];

  const existingMarkerCount = await countExistingTables(queryInterface, baselineMarkers);

  if (existingMarkerCount >= 2) {
    console.log(
      `Schema existente detectado (${existingMarkerCount}/${baselineMarkers.length} tabelas-base). Baseline SQL sera pulada e apenas complementos idempotentes serao aplicados.`
    );
    return false;
  }

  return true;
}

function mapAttribute(attribute) {
  const mapped = {
    type: attribute.type,
    // `model.getAttributes()` deixa `allowNull` como `undefined` (nao
    // `true`) quando o model nao declara a chave explicitamente — e essa
    // e a forma predominante neste projeto de expressar "coluna aceita
    // NULL" (ver DYNAMIC_MODEL_FILES: a maioria dos campos so escreve
    // `allowNull: false` onde e obrigatorio, deixando o resto implicito).
    // Repassar `undefined` direto para `queryInterface.createTable` fazia
    // a coluna nascer NOT NULL em qualquer banco criado do zero por este
    // bootstrap (bug real, achado em 2026-08-05 ao configurar o primeiro
    // banco de teste isolado — nfe_key/phone/reference_id/description
    // entre outras). Bancos existentes (dev/producao) nao sao afetados:
    // eles tomam o caminho "schema ja existe" (`shouldBootstrapCanonicalSchema`)
    // e nunca passam por este createTable.
    allowNull: attribute.allowNull !== false,
  };

  if (attribute.primaryKey) mapped.primaryKey = true;
  if (attribute.autoIncrement) mapped.autoIncrement = true;
  if (attribute.defaultValue !== undefined) mapped.defaultValue = attribute.defaultValue;
  if (attribute.unique) mapped.unique = attribute.unique;
  if (attribute.comment) mapped.comment = attribute.comment;
  if (attribute.field) mapped.field = attribute.field;
  if (attribute.references) mapped.references = attribute.references;
  if (attribute.onDelete) mapped.onDelete = attribute.onDelete;
  if (attribute.onUpdate) mapped.onUpdate = attribute.onUpdate;

  return mapped;
}

function mapAttributes(model) {
  const attributes = model.getAttributes();
  return Object.fromEntries(
    Object.entries(attributes).map(([key, attribute]) => [key, mapAttribute(attribute)])
  );
}

async function createTableFromModel(queryInterface, model) {
  const tableName = model.getTableName();
  const alreadyExists = await tableExists(queryInterface, tableName);

  if (alreadyExists) {
    return;
  }

  await queryInterface.createTable(tableName, mapAttributes(model), {
    underscored: true,
  });
}

async function addIndexesFromModel(queryInterface, model) {
  const tableName = model.getTableName();
  const indexes = model.options.indexes || [];
  const tableDefinition = await queryInterface.describeTable(tableName);
  const availableColumns = new Set(Object.keys(tableDefinition));

  for (const index of indexes) {
    const indexFields = (index.fields || []).map((field) => (typeof field === 'string' ? field : field.name));
    const missingFields = indexFields.filter((fieldName) => !availableColumns.has(fieldName));

    if (missingFields.length > 0) {
      console.log(
        `Index ${index.name || '(sem nome)'} ignorado em ${tableName}: colunas ausentes no schema atual (${missingFields.join(', ')}).`
      );
      continue;
    }

    try {
      await queryInterface.addIndex(tableName, index.fields, {
        name: index.name,
        unique: index.unique,
        using: index.using,
        where: index.where,
      });
    } catch (error) {
      if (!String(error && error.message).match(/already exists|duplicate/i)) {
        throw error;
      }
    }
  }
}

function loadModel(fileName) {
  const builtModelPath = resolveBuiltModel(fileName);

  if (!fs.existsSync(builtModelPath)) {
    throw new Error(
      `Model build ausente para migrations: ${builtModelPath}. Execute npm run build antes de migration:up.`
    );
  }

  return require(builtModelPath);
}

async function createDynamicTables(queryInterface) {
  for (const fileName of DYNAMIC_MODEL_FILES) {
    const model = loadModel(fileName);
    if (typeof model.getTableName !== 'function' || typeof model.getAttributes !== 'function') {
      continue;
    }

    await createTableFromModel(queryInterface, model);
  }

  for (const fileName of DYNAMIC_MODEL_FILES) {
    const model = loadModel(fileName);
    if (typeof model.getTableName !== 'function') {
      continue;
    }

    await addIndexesFromModel(queryInterface, model);
  }
}

async function dropTablesIfExist(queryInterface, tableNames) {
  for (const tableName of tableNames) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
  }
}

module.exports = {
  async up(queryInterface) {
    const bootstrapCanonicalSchema = await shouldBootstrapCanonicalSchema(queryInterface);

    if (bootstrapCanonicalSchema) {
      for (const fileName of PRE_DYNAMIC_SQL_FILES) {
        await executeSqlFile(queryInterface, fileName);
      }
    }

    await createDynamicTables(queryInterface);

    if (bootstrapCanonicalSchema) {
      for (const fileName of POST_DYNAMIC_SQL_FILES) {
        await executeSqlFile(queryInterface, fileName);
      }
    }
  },

  async down(queryInterface) {
    await dropTablesIfExist(queryInterface, [
      'audit_logs',
      'maintenance_orders',
      'non_conformities',
      'assets',
      'service_orders',
      'production_lot_consumptions',
      'serial_numbers',
      'lot_controls',
      'production_order_trackings',
      'production_route_steps',
      'production_routes',
      'production_orders',
      'product_cost_ledgers',
      'inventory_count_items',
      'inventory_counts',
      'inventory_movements',
      'accounts_payable',
      'accounts_receivable',
      'sale_items',
      'sales',
      'purchase_items',
      'purchases',
      'products',
      'categories',
      'clients',
      'users',
      'suppliers',
      'employees',
      'departments',
      'bill_of_material_items',
      'bill_of_materials',
      'mrp_ordens_planejadas',
      'item_especificacoes_tecnicas',
      'item_detalhes_comerciais',
      'item_categorias',
      'migracao_bom_log',
      'migracao_product_item_map',
      'auditoria_eventos',
      'webhooks_eventos',
      'movimentos_estoque',
      'ordens_producao',
      'entradas_nf_items',
      'entradas_nf',
      'requisicao_compra_items',
      'requisicoes_compra',
      'numeros_serie',
      'lotes',
      'item_estruturas',
      'items',
      'fornecedores',
      'usuarios',
    ]);

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS item_estrutura_component_type CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS item_estrutura_status CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS origem_mrp CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS ordem_status CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS movimento_tipo CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS item_status CASCADE;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS item_tipo CASCADE;');
  },
};
