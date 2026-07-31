'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

const SALES_COLUMNS = (Sequelize) => ({
  nfe_series: { type: Sequelize.INTEGER, allowNull: true, comment: 'Serie da NF-e emitida' },
  nfe_protocol: { type: Sequelize.STRING(50), allowNull: true, comment: 'Protocolo de autorizacao SEFAZ' },
  nfe_environment: { type: Sequelize.ENUM('homologacao', 'producao'), allowNull: true, comment: 'Ambiente em que a NF-e foi emitida' },
  nfe_provider_ref: { type: Sequelize.STRING(100), allowNull: true, comment: 'Referencia externa usada no provedor (idempotencia da emissao)' },
  nfe_xml_url: { type: Sequelize.STRING(500), allowNull: true, comment: 'URL do XML autorizado (fornecida pelo provedor)' },
  nfe_danfe_url: { type: Sequelize.STRING(500), allowNull: true, comment: 'URL do PDF do DANFE (fornecida pelo provedor)' },
  nfe_error_message: { type: Sequelize.TEXT, allowNull: true, comment: 'Ultima mensagem de erro/rejeicao da SEFAZ, se houver' },
  nfe_issued_at: { type: Sequelize.DATE, allowNull: true, comment: 'Data/hora da autorizacao' },
});

const PURCHASES_COLUMNS = (Sequelize) => ({
  nfe_key: { type: Sequelize.STRING(50), allowNull: true, comment: 'Chave de acesso (44 digitos) da NF-e de entrada' },
  nfe_series: { type: Sequelize.STRING(10), allowNull: true },
  nfe_xml_path: { type: Sequelize.STRING(500), allowNull: true, comment: 'Caminho do XML da NF-e de entrada armazenado (upload manual)' },
  nfe_registered_by: { type: Sequelize.INTEGER, allowNull: true, comment: 'FK -> users.id (quem registrou a NFe de entrada)' },
  nfe_registered_at: { type: Sequelize.DATE, allowNull: true },
});

const CLIENTS_COLUMNS = (Sequelize) => ({
  city_ibge_code: { type: Sequelize.STRING(7), allowNull: true, comment: 'Codigo IBGE do municipio do cliente (obrigatorio para NF-e destinatario)' },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [name, def] of Object.entries(SALES_COLUMNS(Sequelize))) {
      if (!(await columnExists(queryInterface, 'sales', name))) {
        await queryInterface.addColumn('sales', name, def);
      }
    }
    for (const [name, def] of Object.entries(PURCHASES_COLUMNS(Sequelize))) {
      if (!(await columnExists(queryInterface, 'purchase_orders', name))) {
        await queryInterface.addColumn('purchase_orders', name, def);
      }
    }
    for (const [name, def] of Object.entries(CLIENTS_COLUMNS(Sequelize))) {
      if (!(await columnExists(queryInterface, 'clients', name))) {
        await queryInterface.addColumn('clients', name, def);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    for (const name of Object.keys(SALES_COLUMNS(Sequelize))) {
      if (await columnExists(queryInterface, 'sales', name)) {
        await queryInterface.removeColumn('sales', name);
      }
    }
    for (const name of Object.keys(PURCHASES_COLUMNS(Sequelize))) {
      if (await columnExists(queryInterface, 'purchase_orders', name)) {
        await queryInterface.removeColumn('purchase_orders', name);
      }
    }
    for (const name of Object.keys(CLIENTS_COLUMNS(Sequelize))) {
      if (await columnExists(queryInterface, 'clients', name)) {
        await queryInterface.removeColumn('clients', name);
      }
    }
  },
};
