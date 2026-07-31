/**
 * Configuracao da conexao PostgreSQL isolada do ERP Evok Audio.
 *
 * @module config/database
 */

import { Options, Sequelize } from 'sequelize';

import { loadRuntimeEnv, readPostgresSslOptions } from './runtimeEnv';

/**
 * Obtem a configuracao PostgreSQL com base no ambiente atual.
 *
 * @param env - Nome do ambiente: development, production ou test.
 * @returns Configuracao do Sequelize para PostgreSQL.
 */
function getConfig(env: string = loadRuntimeEnv().nodeEnv): Options {
  const runtimeEnv = loadRuntimeEnv();
  const isProd = env === 'production';

  const baseConfig: Options = {
    host: runtimeEnv.dbHost,
    port: runtimeEnv.dbPort,
    database: runtimeEnv.dbName,
    username: runtimeEnv.dbUser,
    password: runtimeEnv.dbPassword,
    dialect: 'postgres',
    logging: runtimeEnv.dbLogging ? console.log : false,
    pool: {
      max: isProd ? 20 : 10,
      min: isProd ? 5 : 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  };

  if (runtimeEnv.dbSsl) {
    baseConfig.dialectOptions = {
      ssl: readPostgresSslOptions(runtimeEnv),
    };
  }

  return baseConfig;
}

/**
 * Instancia do Sequelize configurada para PostgreSQL.
 */
const sequelize = new Sequelize(getConfig());

/**
 * Testa a conexao PostgreSQL atual.
 *
 * @returns Promise resolvida quando a conexao autentica.
 */
async function testConnection(): Promise<void> {
  await sequelize.authenticate();
  const config = getConfig();
  console.log(`PostgreSQL conectado: ${config.host}:${config.port}/${config.database} (${config.dialect})`);
}

export { getConfig, sequelize, testConnection };
export default sequelize;
