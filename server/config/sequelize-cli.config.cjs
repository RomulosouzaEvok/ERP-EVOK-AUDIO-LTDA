const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return defaultValue;
}

function buildConfig(env) {
  const isProd = env === 'production';
  const sslEnabled = parseBoolean(process.env.DB_SSL, false);

  const config = {
    username: process.env.DB_USER || 'evok_admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_evok_audio',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    migrationStorage: 'sequelize',
    migrationStorageTableName: 'SequelizeMeta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData',
    logging: parseBoolean(process.env.DB_LOGGING, false) ? console.log : false,
  };

  if (sslEnabled) {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: isProd,
      },
    };
  }

  return config;
}

module.exports = {
  development: buildConfig('development'),
  test: buildConfig('test'),
  production: buildConfig('production'),
};
