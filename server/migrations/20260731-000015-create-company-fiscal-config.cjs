'use strict';

const TABLE_NAME = 'company_fiscal_config';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes(TABLE_NAME)) return;

    await queryInterface.createTable(TABLE_NAME, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      legal_name: { type: Sequelize.STRING(200), allowNull: false, comment: 'Razao social do emitente' },
      trade_name: { type: Sequelize.STRING(200), allowNull: true, comment: 'Nome fantasia' },
      cnpj: { type: Sequelize.STRING(18), allowNull: false, comment: 'CNPJ do emitente (somente numeros ou formatado)' },
      ie: { type: Sequelize.STRING(20), allowNull: true, comment: 'Inscricao Estadual do emitente' },
      im: { type: Sequelize.STRING(20), allowNull: true, comment: 'Inscricao Municipal do emitente' },
      crt: { type: Sequelize.ENUM('1', '2', '3'), allowNull: false, defaultValue: '3', comment: 'Codigo de Regime Tributario: 1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal' },
      cnae: { type: Sequelize.STRING(10), allowNull: true },
      cep: { type: Sequelize.STRING(10), allowNull: true },
      street: { type: Sequelize.STRING(200), allowNull: true },
      number: { type: Sequelize.STRING(20), allowNull: true },
      complement: { type: Sequelize.STRING(100), allowNull: true },
      neighborhood: { type: Sequelize.STRING(100), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      city_ibge_code: { type: Sequelize.STRING(7), allowNull: true, comment: 'Codigo IBGE do municipio (cMun na NFe), obrigatorio para emitir' },
      state: { type: Sequelize.STRING(2), allowNull: true },
      nfe_series: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1, comment: 'Serie da NF-e' },
      nfe_next_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1, comment: 'Proximo numero de NF-e a ser usado (sequencial por serie)' },
      nfe_environment: { type: Sequelize.ENUM('homologacao', 'producao'), allowNull: false, defaultValue: 'homologacao', comment: 'Ambiente SEFAZ: homologacao (testes) ou producao (emissao com valor fiscal real)' },
      nfe_provider: { type: Sequelize.ENUM('mock', 'focus_nfe', 'enotas'), allowNull: false, defaultValue: 'mock', comment: 'Provedor de emissao configurado' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
