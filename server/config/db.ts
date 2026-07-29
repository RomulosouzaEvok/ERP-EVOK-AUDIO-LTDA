/**
 * TypeScript database bootstrap for Sequelize.
 */
const { sequelize, testConnection } = require('../src/config/database');
const { seedDatabase } = require('../src/config/seeds');

const connectDB = async () => {
  await testConnection();

  // Sincronizar modelos (cria tabelas se nÃ£o existirem)
  // Em produÃ§Ã£o, usar migrations em vez de sync
  const force = process.env.DB_FORCE_SYNC === 'true';
  const alter = process.env.DB_AUTO_ALTER === 'true' && process.env.NODE_ENV !== 'production';
  
  if (force) {
    console.log('âš ï¸ ForÃ§ando recriaÃ§Ã£o das tabelas...');
  }

  await sequelize.sync({ force, alter: !force && alter });
  console.log(`ðŸ“¦ Tabelas sincronizadas${force ? ' (recriadas)' : ''}`);

  // Seeds (apenas se tabelas vazias)
  await seedDatabase();
};

module.exports = connectDB;



