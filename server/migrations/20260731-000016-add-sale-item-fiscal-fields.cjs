'use strict';

const TABLE_NAME = 'sale_items';

const COLUMNS = {
  cfop: { type: 'STRING', length: 4, comment: 'Codigo Fiscal de Operacoes e Prestacoes' },
  icms_cst: { type: 'STRING', length: 3, comment: 'Codigo de Situacao Tributaria do ICMS' },
  icms_aliquot: { type: 'DECIMAL', args: [5, 2], comment: 'Aliquota de ICMS aplicada (%)' },
  icms_base: { type: 'DECIMAL', args: [12, 2], comment: 'Base de calculo do ICMS' },
  icms_value: { type: 'DECIMAL', args: [12, 2], comment: 'Valor do ICMS' },
  ipi_cst: { type: 'STRING', length: 3, comment: 'Codigo de Situacao Tributaria do IPI' },
  ipi_aliquot: { type: 'DECIMAL', args: [5, 2], comment: 'Aliquota de IPI aplicada (%)' },
  ipi_value: { type: 'DECIMAL', args: [12, 2], comment: 'Valor do IPI' },
  pis_cst: { type: 'STRING', length: 3, comment: 'Codigo de Situacao Tributaria do PIS' },
  pis_aliquot: { type: 'DECIMAL', args: [5, 2], comment: 'Aliquota de PIS aplicada (%)' },
  pis_value: { type: 'DECIMAL', args: [12, 2], comment: 'Valor do PIS' },
  cofins_cst: { type: 'STRING', length: 3, comment: 'Codigo de Situacao Tributaria do COFINS' },
  cofins_aliquot: { type: 'DECIMAL', args: [5, 2], comment: 'Aliquota de COFINS aplicada (%)' },
  cofins_value: { type: 'DECIMAL', args: [12, 2], comment: 'Valor do COFINS' },
};

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [name, def] of Object.entries(COLUMNS)) {
      if (await columnExists(queryInterface, TABLE_NAME, name)) continue;
      const type = def.type === 'DECIMAL' ? Sequelize.DECIMAL(...def.args) : Sequelize.STRING(def.length);
      await queryInterface.addColumn(TABLE_NAME, name, {
        type,
        allowNull: true,
        comment: def.comment,
      });
    }
  },

  async down(queryInterface) {
    for (const name of Object.keys(COLUMNS)) {
      if (await columnExists(queryInterface, TABLE_NAME, name)) {
        await queryInterface.removeColumn(TABLE_NAME, name);
      }
    }
  },
};
