/**
 * TypeScript database bootstrap for Sequelize.
 */

const { sequelize, testConnection } = require('../src/config/database');
const { loadRuntimeEnv } = require('../src/config/runtimeEnv');
const { seedDatabase } = require('../src/config/seeds');

const connectDB = async () => {
  const runtimeEnv = loadRuntimeEnv();
  await testConnection();

  const force = runtimeEnv.dbForceSync;
  const allowUnsafeAlter = runtimeEnv.dbAllowUnsafeAlter;

  if (force || runtimeEnv.dbAutoAlter || allowUnsafeAlter) {
    throw new Error(
      'DDL automatico no bootstrap foi removido. DB_FORCE_SYNC, DB_AUTO_ALTER e DB_ALLOW_UNSAFE_ALTER nao sao mais suportados; use migrations versionadas.'
    );
  }

  console.log('Bootstrap sem DDL automatico. Use migrations versionadas para evolucao de schema.');
  await seedDatabase();
};

module.exports = connectDB;
export default connectDB;
