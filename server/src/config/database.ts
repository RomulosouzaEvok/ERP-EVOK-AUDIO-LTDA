/**
 * Configuracao da conexao PostgreSQL isolada do ERP Evok Audio.
 *
 * @module config/database
 */

import dotenv from 'dotenv';
import { Options, Sequelize } from 'sequelize';

dotenv.config();

/**
 * Obtem a configuracao PostgreSQL com base no ambiente atual.
 *
 * @param env - Nome do ambiente: development, production ou test.
 * @returns Configuracao do Sequelize para PostgreSQL.
 */
function getConfig(env: string = process.env.NODE_ENV || 'development'): Options {
  const isProd = env === 'production';
  const sslEnabled = process.env.DB_SSL === 'true';

  const baseConfig: Options = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'erp_evok_audio',
    username: process.env.DB_USER || 'evok_admin',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
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

  if (isProd && sslEnabled) {
    baseConfig.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
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
 * @throws {Error} Encerra o processo quando a conexao falha.
 */
async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    const config = getConfig();
    console.log(`PostgreSQL conectado: ${config.host}:${config.port}/${config.database} (${config.dialect})`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Erro na conexao PostgreSQL: ${message}`);
    console.error('Verifique se o PostgreSQL esta rodando e as credenciais estao corretas.');
    process.exit(1);
  }
}

export { getConfig, sequelize, testConnection };
export default sequelize;
