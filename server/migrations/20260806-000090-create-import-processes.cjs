'use strict';

/**
 * UC-19 (Gerenciar Importacao/COMEX) — docs/projeto/04-USE_CASES.md.
 *
 * Cria 2 tabelas:
 * - `import_processes`: cabecalho do processo de importacao (numero
 *   `IMP-<ano>-XXXX`, fornecedor, status de acompanhamento
 *   embarque/chegada/desembaraco, cambio e despesas de importacao em BRL
 *   usadas no rateio do valor aduaneiro).
 * - `import_process_items`: itens importados (quantidade, valor FOB
 *   unitario na moeda estrangeira, aliquotas de II/IPI/PIS/COFINS/ICMS
 *   informadas manualmente pelo Analista de Comex — sem integracao
 *   Siscomex/NCM, fora do escopo do UC-19) e os valores de tributo e custo
 *   nacionalizado calculados (`ImportTaxCalculator`).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('import_processes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      process_number: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
        comment: 'Numero do processo de importacao, formato IMP-<ano>-XXXX',
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Fornecedor internacional (reutiliza o cadastro de suppliers — sem campo dedicado de fornecedor estrangeiro, ver decisao no handoff)',
      },
      status: {
        type: Sequelize.ENUM('draft', 'shipped', 'arrived', 'customs_cleared', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft=registrado, shipped=embarque, arrived=chegada, customs_cleared=desembaracado, received=entrada em estoque, cancelled=cancelado',
      },
      fob_currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'Codigo ISO da moeda do valor FOB (ex.: USD, EUR)',
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 1,
        comment: 'Cotacao (moeda estrangeira -> BRL) usada para converter o FOB',
      },
      freight_value: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Frete internacional em BRL, rateado entre os itens pro-rata do FOB',
      },
      insurance_value: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Seguro internacional em BRL, rateado entre os itens pro-rata do FOB',
      },
      other_expenses_value: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        comment: 'Despesas aduaneiras adicionais (armazenagem, capatazia, etc.) em BRL, rateadas pro-rata do FOB',
      },
      shipped_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de embarque' },
      arrived_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de chegada' },
      customs_cleared_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de desembaraco aduaneiro' },
      received_at: { type: Sequelize.DATEONLY, allowNull: true, comment: 'Data de entrada em estoque (nacionalizacao concluida)' },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
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

    await queryInterface.createTable('import_process_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      import_process_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'import_processes',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
      },
      fob_unit_price: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        comment: 'Preco unitario FOB, na moeda estrangeira (import_processes.fob_currency)',
      },
      ii_rate: { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do Imposto de Importacao, percentual (ex.: 60.0000 = 60%), informada manualmente' },
      ipi_rate: { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do IPI, percentual, informada manualmente' },
      pis_rate: { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do PIS-Importacao, percentual, informada manualmente' },
      cofins_rate: { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota da COFINS-Importacao, percentual, informada manualmente' },
      icms_rate: { type: Sequelize.DECIMAL(7, 4), allowNull: false, defaultValue: 0, comment: 'Aliquota do ICMS, percentual, informada manualmente' },
      customs_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'Valor aduaneiro rateado deste item (FOB em BRL + frete + seguro rateados) — calculado' },
      ii_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'II calculado' },
      ipi_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'IPI calculado' },
      pis_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'PIS-Importacao calculado' },
      cofins_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'COFINS-Importacao calculado' },
      icms_value: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'ICMS calculado (formula "por dentro")' },
      nationalized_unit_cost: { type: Sequelize.DECIMAL(18, 6), allowNull: true, comment: 'Custo unitario nacionalizado final — usado na entrada de estoque' },
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

    await queryInterface.addIndex('import_processes', ['supplier_id'], { name: 'idx_import_processes_supplier_id' });
    await queryInterface.addIndex('import_processes', ['status'], { name: 'idx_import_processes_status' });
    await queryInterface.addIndex('import_processes', ['created_by'], { name: 'idx_import_processes_created_by' });

    await queryInterface.addIndex('import_process_items', ['import_process_id'], { name: 'idx_import_process_items_process_id' });
    await queryInterface.addIndex('import_process_items', ['item_id'], { name: 'idx_import_process_items_item_id' });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('import_process_items');
    await queryInterface.dropTable('import_processes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_import_processes_status";');
  },
};
