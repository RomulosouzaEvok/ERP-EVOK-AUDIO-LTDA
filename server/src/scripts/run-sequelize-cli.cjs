const { spawnSync } = require('child_process');
const path = require('path');

const cliArgs = process.argv.slice(2);
const sequelizeEnv = process.env.SEQUELIZE_ENV || 'development';
const cliEntry = require.resolve('sequelize-cli/lib/sequelize');

const result = spawnSync(process.execPath, [
  cliEntry,
  ...cliArgs,
  '--env',
  sequelizeEnv,
  '--config',
  path.resolve(__dirname, '..', '..', 'config', 'sequelize-cli.config.cjs'),
  '--migrations-path',
  path.resolve(__dirname, '..', '..', 'migrations'),
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SEQUELIZE_ENV: sequelizeEnv,
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
