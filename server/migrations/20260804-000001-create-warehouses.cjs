'use strict';

/**
 * Bloco 4 (docs/governance/TODO.md) — Multiplos Depositos (UC-42).
 *
 * Cria `warehouses` (deposito cadastravel) e `product_warehouse_stock`
 * (saldo por par produto/deposito), adiciona `warehouse_id` nullable em
 * `inventory_movements` e `lot_controls` (padrao expand-contract — NULL
 * = movimento/lote legado sem deposito atribuido ainda), e faz o
 * backfill decidido: todo saldo atual de `products.quantity > 0` migra
 * para uma linha em `product_warehouse_stock` no deposito INSUMOS;
 * `lot_controls` existentes recebem `warehouse_id` = INSUMOS.
 *
 * Decisao de escopo desta entrega (ver docs/business/BUSINESS_RULES.md
 * §12 e docs/business/01-USE_CASES.md UC-42): apenas o schema de saldo
 * por deposito + roteamento de dados legados. `warehouse_transfers`
 * (transferencia com aprovacao de gestor) e o enum `type='transfer'` em
 * `inventory_movements` ficam para uma proxima migration do Bloco 4
 * (backend/use cases), fora do escopo deste arquivo.
 *
 * INVARIANTE (BUSINESS_RULES.md §12 item 3, obrigatoria e testavel):
 *   saldo_total(produto) = SOMA(saldo(produto, deposito)) para todo
 *   deposito ativo.
 * Ate a migracao completa do backend para dual-write por deposito
 * (fase contract), `products.quantity` continua sendo a fonte de
 * verdade do saldo total e `product_warehouse_stock` e populada em
 * paralelo (dual-write) — nenhuma rotina deve alterar um sem refletir
 * no outro. Transferencias entre depositos (Bloco 4 backend) NUNCA
 * alteram a soma total, apenas debitam origem/creditam destino no
 * mesmo valor, na mesma transacao atomica.
 *
 * Precedente de padrao seguido: 20260803-000008-create-access-profiles.cjs
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotente: a migration baseline (20260731-000001) cria tabelas
    // dinamicamente a partir dos models Sequelize *atuais* em dist/ — um
    // banco criado do zero hoje já nasce com warehouses/
    // product_warehouse_stock prontos. Mesma causa/fix de
    // 20260803-000004-create-work-centers.cjs e
    // 20260803-000008-create-access-profiles.cjs (2026-08-05).
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('warehouses')) {
      await createWarehousesAndStock(queryInterface, Sequelize);
    }

    // 4. inventory_movements.warehouse_id (nullable — NULL = movimento legado sem deposito)
    const movementsColumns = await queryInterface.describeTable('inventory_movements');
    if (!movementsColumns.warehouse_id) {
      await queryInterface.addColumn('inventory_movements', 'warehouse_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'warehouses', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
    const movementsIndexes = await queryInterface.showIndex('inventory_movements');
    if (!movementsIndexes.some((i) => i.name === 'idx_inventory_movements_warehouse_id')) {
      await queryInterface.addIndex('inventory_movements', ['warehouse_id'], {
        name: 'idx_inventory_movements_warehouse_id',
      });
    }

    // 5. lot_controls.warehouse_id (nullable — NULL = lote legado sem deposito)
    const lotControlsColumns = await queryInterface.describeTable('lot_controls');
    if (!lotControlsColumns.warehouse_id) {
      await queryInterface.addColumn('lot_controls', 'warehouse_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'warehouses', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
    const lotControlsIndexes = await queryInterface.showIndex('lot_controls');
    if (!lotControlsIndexes.some((i) => i.name === 'idx_lot_controls_warehouse_id')) {
      await queryInterface.addIndex('lot_controls', ['warehouse_id'], {
        name: 'idx_lot_controls_warehouse_id',
      });
    }

    // 6. Backfill decidido: todo saldo atual de products.quantity > 0
    // migra para product_warehouse_stock no deposito INSUMOS. Produtos
    // com quantity = 0 (ou negativo) NAO ganham linha zero, para nao
    // poluir a tabela (decisao explicita desta entrega).
    await queryInterface.sequelize.query(`
      INSERT INTO product_warehouse_stock (product_id, warehouse_id, quantity, created_at, updated_at)
      SELECT p.id, w.id, p.quantity, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM products p
      CROSS JOIN (SELECT id FROM warehouses WHERE code = 'INSUMOS') w
      WHERE p.quantity > 0
      ON CONFLICT (product_id, warehouse_id) DO NOTHING;
    `);

    // 7. Backfill: lot_controls existentes recebem warehouse_id = INSUMOS
    await queryInterface.sequelize.query(`
      UPDATE lot_controls
      SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'INSUMOS')
      WHERE warehouse_id IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('lot_controls', 'idx_lot_controls_warehouse_id');
    await queryInterface.removeColumn('lot_controls', 'warehouse_id');

    await queryInterface.removeIndex('inventory_movements', 'idx_inventory_movements_warehouse_id');
    await queryInterface.removeColumn('inventory_movements', 'warehouse_id');

    await queryInterface.removeIndex('product_warehouse_stock', 'idx_product_warehouse_stock_warehouse_id');
    await queryInterface.removeIndex('product_warehouse_stock', 'idx_product_warehouse_stock_product_id');
    await queryInterface.sequelize.query(`
      ALTER TABLE product_warehouse_stock
      DROP CONSTRAINT IF EXISTS ck_product_warehouse_stock_quantity_non_negative;
    `);
    await queryInterface.removeConstraint('product_warehouse_stock', 'uq_product_warehouse_stock_product_warehouse');
    await queryInterface.dropTable('product_warehouse_stock');

    await queryInterface.dropTable('warehouses');
  },
};

async function createWarehousesAndStock(queryInterface, Sequelize) {
    // 1. Tabela warehouses
    await queryInterface.createTable('warehouses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
        comment: 'Codigo unico do deposito (ex.: INSUMOS, ACABADOS, LABORATORIO)',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nome descritivo do deposito',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 2. Seed idempotente dos 3 depositos decididos (BUSINESS_RULES.md §12 item 1)
    await queryInterface.sequelize.query(`
      INSERT INTO warehouses (code, name, description, active, created_at, updated_at)
      VALUES
        ('INSUMOS', 'Deposito de Insumos de Producao', 'Materia-prima e componentes utilizados na producao', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('ACABADOS', 'Deposito de Produto Acabado', 'Produtos concluidos pela producao, prontos para expedicao', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('LABORATORIO', 'Deposito do Laboratorio', 'Amostras e insumos de teste/engenharia', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 3. Tabela product_warehouse_stock (saldo por par produto/deposito)
    await queryInterface.createTable('product_warehouse_stock', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'warehouses',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Saldo do produto neste deposito',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('product_warehouse_stock', {
      fields: ['product_id', 'warehouse_id'],
      type: 'unique',
      name: 'uq_product_warehouse_stock_product_warehouse',
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE product_warehouse_stock
      ADD CONSTRAINT ck_product_warehouse_stock_quantity_non_negative
      CHECK (quantity >= 0);
    `);

    await queryInterface.addIndex('product_warehouse_stock', ['product_id'], {
      name: 'idx_product_warehouse_stock_product_id',
    });

    await queryInterface.addIndex('product_warehouse_stock', ['warehouse_id'], {
      name: 'idx_product_warehouse_stock_warehouse_id',
    });
}
