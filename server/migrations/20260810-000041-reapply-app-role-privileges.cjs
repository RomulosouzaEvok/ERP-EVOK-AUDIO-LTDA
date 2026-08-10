'use strict';

/**
 * Reaplica os privilégios da role de aplicação `evok_app` sobre **todas** as
 * tabelas e sequences do schema `public`.
 *
 * ## O defeito que esta migration corrige
 *
 * Medido nos dois bancos em 2026-08-10:
 *
 *     erp_evok_audio ......  201 de 201 tabelas com GRANT para evok_app
 *     erp_evok_audio_test ..    1 de 201  (200 sem nenhum privilégio)
 *
 * A migration `20260806-000080-create-app-role-least-privilege` fez o trabalho
 * corretamente **no banco em que rodou de fato**. O banco de teste foi
 * reprovisionado depois disso (baseline congelado, `e2a8d7e`): as tabelas
 * nasceram de novo, sem ACL, e a migration já constava como aplicada em
 * `SequelizeMeta` — então nunca mais rodou ali.
 *
 * O efeito é um bloqueador de produção silencioso: um banco novo, provisionado
 * do baseline + migrations, nasce com `evok_app` **sem poder ler nem escrever
 * nada**. A troca de `DB_USER` para a role de privilégio mínimo — o último
 * item de segurança pendente do Go-Live — falharia no primeiro request, em
 * produção, e o sintoma (permission denied em tudo) não apontaria para a
 * causa.
 *
 * Nenhuma rede existente via isso: `comparar-bancos.cjs` compara coluna, tipo,
 * default, índice e constraint — **não compara ACL**. Era o ponto cego do
 * "os dois bancos são idênticos".
 *
 * ## Por que uma migration nova em vez de reescrever a antiga
 *
 * Reescrever a `...-000080` não a faria rodar de novo onde ela já está
 * registrada — que é exatamente o caso. Uma migration nova roda em todo banco
 * que ainda não a tem, incluindo os que já existem.
 *
 * Idempotente por natureza: `GRANT` repetido é no-op. Pode rodar quantas vezes
 * for preciso.
 *
 * @type {import('sequelize-cli').Migration}
 */

/** Role de aplicação (runtime), sem nenhum privilégio de DDL. */
const APP_ROLE = 'evok_app';

/** Controle interno do Sequelize: a aplicação nunca precisa tocar. */
const EXCLUDED_TABLES = ['SequelizeMeta', 'SequelizeData'];

/** @returns {string} Lista SQL de tabelas excluídas. */
function excludedTablesSql() {
  return EXCLUDED_TABLES.map((name) => `'${name}'`).join(', ');
}

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
    );

    if (roles.length === 0) {
      // Sem a role não há o que conceder. Não é erro: em um banco onde a
      // `...-000080` ainda não rodou, ela criará a role e concederá tudo.
      return;
    }

    const dbName = queryInterface.sequelize.getDatabaseName();
    await queryInterface.sequelize.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_ROLE};`);
    await queryInterface.sequelize.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE};`);

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

    // Privilegios padrao para objetos FUTUROS, para a role que de fato cria
    // (`current_user` = quem esta rodando a migration). A `...-000080` fixou
    // `evok_admin` no literal; se outro usuario provisionar o banco, o default
    // nunca valeria e o problema voltaria na proxima tabela criada.
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}',
          current_user);
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE}',
          current_user);
      END
      $$;
    `);
  },

  async down() {
    // Sem `down`: revogar privilegios que a `...-000080` tambem concede
    // deixaria o banco em um estado que nenhuma das duas migrations descreve,
    // e derrubaria a aplicacao se ela ja estivesse rodando como `evok_app`.
    // Reverter a role inteira continua sendo trabalho da `...-000080.down()`.
  },
};
