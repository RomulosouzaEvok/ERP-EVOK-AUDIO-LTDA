'use strict';

/**
 * Achado de auditoria (docs/database/05-ACESSOS_E_ISOLAMENTO.md, §1):
 * o banco tinha um unico usuario Postgres (`evok_admin`), superusuario,
 * usado para TUDO -- runtime da API, migrations e administracao manual.
 * Um comprometimento de credencial da API dava ao atacante superusuario
 * completo do Postgres (DROP DATABASE, criar roles, ler/alterar qualquer
 * tabela do sistema).
 *
 * Esta migration cria a role `evok_app`: privilegio minimo necessario
 * para a API operar em runtime -- SELECT/INSERT/UPDATE/DELETE nas
 * tabelas de negocio do schema `public`, SEM nenhum privilegio de DDL
 * (CREATE/ALTER/DROP), SEM acesso a `SequelizeMeta`/`SequelizeData`
 * (controle interno de migrations, a app nunca precisa toca-las) e SEM
 * `SUPERUSER`/`CREATEDB`/`CREATEROLE`/`REPLICATION`.
 *
 * IMPORTANTE -- esta migration APENAS CRIA a role e concede privilegios.
 * Ela NAO troca a credencial ativa em uso (`DB_USER=evok_admin` no
 * `.env`/`docker-compose.yml`) -- essa troca e um passo manual separado,
 * documentado em docs/database/05-ACESSOS_E_ISOLAMENTO.md, a ser feito
 * quando apropriado (ex.: provisionamento do servidor de producao), para
 * nao derrubar nenhum backend rodando no momento em que esta migration
 * for aplicada.
 *
 * Senha da role: lida de `APP_DB_ROLE_PASSWORD` (env var), com fallback
 * de desenvolvimento claramente marcado como "trocar antes de producao".
 * Nunca comitar uma senha real de producao neste arquivo.
 *
 * Idempotente: seguro rodar mais de uma vez (CREATE ROLE so executa se
 * a role ainda nao existir; GRANT/ALTER DEFAULT PRIVILEGES sao
 * naturalmente idempotentes no Postgres).
 */

const APP_ROLE = 'evok_app';
const DEV_DEFAULT_PASSWORD = 'change-me-evok-app-dev-only';
// Tabelas de controle interno do Sequelize -- a role de aplicacao nunca
// precisa ler/escrever nelas (migrations continuam rodando com
// evok_admin, que mantem privilegio total).
const EXCLUDED_TABLES = ['SequelizeMeta', 'SequelizeData'];

function excludedTablesSql() {
  return EXCLUDED_TABLES.map((t) => `'${t}'`).join(', ');
}

module.exports = {
  async up(queryInterface) {
    const password = (process.env.APP_DB_ROLE_PASSWORD || DEV_DEFAULT_PASSWORD).replace(/'/g, "''");
    const dbName = queryInterface.sequelize.getDatabaseName();

    // 1. Cria a role somente se ainda nao existir (Postgres nao suporta
    //    `CREATE ROLE IF NOT EXISTS` nativamente).
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
          CREATE ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${password}'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
        END IF;
      END
      $$;
    `);

    // 2. Conectar ao banco + usar o schema public.
    await queryInterface.sequelize.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_ROLE};`);
    await queryInterface.sequelize.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE};`);

    // 3. DML (nunca DDL) em todas as tabelas de negocio existentes hoje,
    //    exceto as de controle interno do Sequelize.
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        tbl RECORD;
      BEGIN
        FOR tbl IN
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename NOT IN (${excludedTablesSql()})
        LOOP
          EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO ${APP_ROLE}', tbl.tablename);
        END LOOP;
      END
      $$;
    `);

    // 4. Sequences (necessarias para colunas SERIAL/IDENTITY em INSERT).
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        seq RECORD;
      BEGIN
        FOR seq IN
          SELECT sequence_name FROM information_schema.sequences
          WHERE sequence_schema = 'public'
        LOOP
          EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO ${APP_ROLE}', seq.sequence_name);
        END LOOP;
      END
      $$;
    `);

    // 5. Privilegios padrao para tabelas/sequences FUTURAS criadas por
    //    `evok_admin` (quem roda as migrations) -- sem isso, toda
    //    migration nova precisaria de um GRANT manual adicional para a
    //    role de aplicacao enxergar a tabela nova.
    await queryInterface.sequelize.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE};
    `);
    await queryInterface.sequelize.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE};
    `);
  },

  async down(queryInterface) {
    const dbName = queryInterface.sequelize.getDatabaseName();

    await queryInterface.sequelize.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM ${APP_ROLE};
    `);
    await queryInterface.sequelize.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE evok_admin IN SCHEMA public
      REVOKE USAGE, SELECT ON SEQUENCES FROM ${APP_ROLE};
    `);
    await queryInterface.sequelize.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${APP_ROLE};`);
    await queryInterface.sequelize.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${APP_ROLE};`);
    await queryInterface.sequelize.query(`REVOKE USAGE ON SCHEMA public FROM ${APP_ROLE};`);
    await queryInterface.sequelize.query(`REVOKE CONNECT ON DATABASE "${dbName}" FROM ${APP_ROLE};`);
    await queryInterface.sequelize.query(`DROP ROLE IF EXISTS ${APP_ROLE};`);
  },
};
