/**
 * TypeScript database bootstrap for Sequelize.
 */
const { sequelize, testConnection } = require('../src/config/database');
const { seedDatabase } = require('../src/config/seeds');

const connectDB = async () => {
  await testConnection();

  // Sincronizar modelos apenas quando explicitamente solicitado.
  // Em PostgreSQL, alter automático tem gerado DDL inválido em alguns schemas legados.
  const force = process.env.DB_FORCE_SYNC === 'true';
  const allowUnsafeAlter = process.env.DB_ALLOW_UNSAFE_ALTER === 'true';
  const alter = process.env.DB_AUTO_ALTER === 'true'
    && allowUnsafeAlter
    && process.env.NODE_ENV !== 'production';
  
  if (force) {
    console.log('âš ï¸ ForÃ§ando recriaÃ§Ã£o das tabelas...');
  }

  if (process.env.DB_AUTO_ALTER === 'true' && !allowUnsafeAlter) {
    console.log('âš ï¸ DB_AUTO_ALTER ignorado. Defina DB_ALLOW_UNSAFE_ALTER=true para habilitar sync alter localmente.');
  }

  if (force || alter) {
    await sequelize.sync({ force, alter: !force && alter });
    console.log(`ðŸ“¦ Tabelas sincronizadas${force ? ' (recriadas)' : ''}`);
  } else {
    console.log('ðŸ“¦ Sync de schema desabilitado no bootstrap. Usando schema existente.');
  }

  // Seeds (apenas se tabelas vazias)
  await seedDatabase();
};

module.exports = connectDB;



