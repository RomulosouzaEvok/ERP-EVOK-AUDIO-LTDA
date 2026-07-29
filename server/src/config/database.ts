/**
 * 🗄️ Configuração da conexão com o banco de dados.
 *
 * Suporta MySQL (legado) e PostgreSQL (alvo) via Dialect do Sequelize.
 * A configuração é definida por ambiente (development/production).
 *
 * @module config/database
 */

import { Sequelize, Options } from 'sequelize';

/**
 * Obtém a configuração do banco de dados com base no ambiente atual.
 *
 * @param env - Nome do ambiente (development, production, test).
 * @returns Configuração do Sequelize para o ambiente informado.
 */
function getConfig(env: string = process.env.NODE_ENV || 'development'): Options {
  const isProd = env === 'production';
  const dialect = (process.env.DB_DIALECT as 'mysql' | 'postgres') || 'mysql';
  const sslEnabled = process.env.DB_SSL === 'true';

  const baseConfig: Options = {
    host: process.env.DB_HOST || (isProd ? 'localhost' : 'localhost'),
    port: parseInt(process.env.DB_PORT || (dialect === 'postgres' ? '5432' : '3306'), 10),
    database: process.env.DB_NAME || 'erp_evok_audio',
    username: process.env.DB_USER || (dialect === 'postgres' ? 'evok_admin' : 'root'),
    password: process.env.DB_PASSWORD || '',
    dialect: dialect,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: isProd ? 20 : 10,
      min: isProd ? 5 : 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: dialect === 'mysql' ? 'utf8mb4' : undefined
    }
  };

  // Configuração SSL específica para PostgreSQL em produção
  if (isProd && dialect === 'postgres' && sslEnabled) {
    baseConfig.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }

  return baseConfig;
}

/**
 * Instância do Sequelize configurada e pronta para uso.
 * A configuração ativa depende da variável de ambiente NODE_ENV.
 */
const sequelize = new Sequelize(getConfig());

/**
 * Testa a conexão com o banco de dados.
 * Exibe mensagem de sucesso ou erro no console e encerra o processo em caso de falha.
 */
async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    const config = getConfig();
    console.log(`✅ Banco Conectado: ${config.host}:${config.port}/${config.database} (${config.dialect})`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ Erro na conexão: ${message}`);
    console.error('Verifique se o banco está rodando e as credenciais estão corretas.');
    process.exit(1);
  }
}

export { sequelize, testConnection, getConfig };
export default sequelize;
