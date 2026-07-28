const { sequelize, testConnection } = require('../src/config/database');
const { seedDatabase } = require('../src/config/seeds');

const connectDB = async () => {
  await testConnection();

  // Sincronizar modelos (cria tabelas se não existirem)
  // Em produção, usar migrations em vez de sync
  const force = process.env.DB_FORCE_SYNC === 'true';
  
  if (force) {
    console.log('⚠️ Forçando recriação das tabelas...');
  }

  await sequelize.sync({ force, alter: !force });
  console.log(`📦 Tabelas sincronizadas${force ? ' (recriadas)' : ''}`);

  // Seeds (apenas se tabelas vazias)
  await seedDatabase();
};

module.exports = connectDB;

