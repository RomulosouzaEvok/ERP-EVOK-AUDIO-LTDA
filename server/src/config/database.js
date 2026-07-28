const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'erp_evok_audio',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4'
    }
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'mysql',
    logging: false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, charset: 'utf8mb4' }
  }
};

const currentConfig = config[env];

const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  {
    host: currentConfig.host,
    port: currentConfig.port,
    dialect: currentConfig.dialect,
    logging: currentConfig.logging,
    pool: currentConfig.pool,
    define: currentConfig.define
  }
);

// Testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL Conectado: ${currentConfig.host}:${currentConfig.port}/${currentConfig.database}`);
  } catch (error) {
    console.error(`❌ Erro na conexão MySQL: ${error.message}`);
    console.error('Verifique se o MySQL está rodando e as credenciais estão corretas.');
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection, Sequelize };

