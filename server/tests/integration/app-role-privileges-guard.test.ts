/**
 * Guarda anti-regressão: a role de aplicação `evok_app` precisa alcançar
 * **todas** as tabelas de negócio.
 *
 * ## O incidente que criou esta guarda (2026-08-10)
 *
 * `evok_app` (privilégio mínimo, criada em 2026-08-06) tinha `GRANT` em 201 de
 * 201 tabelas no banco de desenvolvimento e em **1 de 201** no banco de teste.
 * A migration original rodou corretamente onde rodou; o banco de teste foi
 * reprovisionado depois (baseline congelado), as tabelas nasceram sem ACL, e a
 * migration já constava aplicada — então nunca mais rodou ali.
 *
 * O risco não era o banco de teste: era **produção**. Um banco novo,
 * provisionado do baseline + migrations, nasceria com a role de aplicação sem
 * poder ler nem escrever nada. A troca de `DB_USER` para `evok_app` — o último
 * item de segurança do Go-Live — falharia no primeiro request, e "permission
 * denied em tudo" não aponta para a causa.
 *
 * Nenhuma rede via isso: `comparar-bancos.cjs` compara coluna, tipo, default,
 * índice e constraint — **ACL não estava na lista**. Este arquivo fecha esse
 * ponto cego.
 *
 * ## Por que é um teste, e não só uma migration
 *
 * A migration conserta o estado de hoje. A guarda impede que a próxima tabela
 * criada por um caminho que não herda os privilégios padrão volte a abrir o
 * buraco — e o custo de descobrir isso em produção é uma aplicação que não
 * sobe.
 *
 * @module tests/integration/app-role-privileges-guard
 */

import { integrationEnabled } from '../helpers/testApi';

const describeIntegration = integrationEnabled() ? describe : describe.skip;

/** Role de runtime, sem DDL. */
const APP_ROLE = 'evok_app';

/** Controle interno do Sequelize: a aplicação nunca precisa tocar. */
const EXCLUDED_TABLES = ['SequelizeMeta', 'SequelizeData'];

describeIntegration('Guarda de privilegios da role de aplicacao (evok_app)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sequelize } = require('../../src/config/database');

  it('a role existe e NAO e superusuario nem cria banco/role', async () => {
    const [rows]: any = await sequelize.query(
      `SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin
         FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
    );

    if (rows.length === 0) {
      throw new Error(
        `A role "${APP_ROLE}" nao existe neste banco. Ela e a credencial de runtime de privilegio minimo `
        + '(migration 20260806-000080). Sem ela, a aplicacao so pode rodar como o dono do schema, que tem DDL.',
      );
    }

    const role = rows[0];
    // Privilegio minimo nao e so "tem os GRANTs certos": e tambem nao ter os
    // errados. Uma role de aplicacao com CREATEDB/CREATEROLE anula o proposito.
    expect(role.rolsuper).toBe(false);
    expect(role.rolcreatedb).toBe(false);
    expect(role.rolcreaterole).toBe(false);
    expect(role.rolcanlogin).toBe(true);
  });

  it('alcanca TODAS as tabelas de negocio com SELECT/INSERT/UPDATE/DELETE', async () => {
    const [rows]: any = await sequelize.query(
      `SELECT t.table_name, p.privilege_type
         FROM information_schema.tables t
         CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS p(privilege_type)
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT IN (${EXCLUDED_TABLES.map((name) => `'${name}'`).join(', ')})
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants g
             WHERE g.table_schema = 'public'
               AND g.table_name = t.table_name
               AND g.grantee = '${APP_ROLE}'
               AND g.privilege_type = p.privilege_type)
        ORDER BY t.table_name, p.privilege_type`,
    );

    const faltando = rows.map((row: any) => `${row.table_name}.${row.privilege_type}`);

    if (faltando.length > 0) {
      throw new Error(
        `${faltando.length} privilegio(s) faltando para "${APP_ROLE}". Rode `
        + '`npx sequelize-cli db:migrate` (migration 20260810-000041 reaplica os GRANTs de forma idempotente). '
        + `Primeiros: ${faltando.slice(0, 15).join(', ')}${faltando.length > 15 ? ' ...' : ''}`,
      );
    }

    expect(faltando).toEqual([]);
  });

  it('alcanca todas as sequences (senao todo INSERT com id serial falha)', async () => {
    const [rows]: any = await sequelize.query(
      `WITH seqs AS MATERIALIZED (
         SELECT c.oid, c.relname
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind = 'S' AND n.nspname = 'public'
       )
       SELECT relname FROM seqs
        WHERE NOT has_sequence_privilege('${APP_ROLE}', oid, 'USAGE')
        ORDER BY relname`,
    );

    const faltando = rows.map((row: any) => row.relname);
    expect(faltando).toEqual([]);
  });

  it('NAO alcanca as tabelas de controle de migration', async () => {
    // O contrario tambem e regressao: a aplicacao com poder de mexer em
    // `SequelizeMeta` poderia reescrever o historico de migrations.
    const [rows]: any = await sequelize.query(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee = '${APP_ROLE}'
          AND table_name IN (${EXCLUDED_TABLES.map((name) => `'${name}'`).join(', ')})`,
    );

    expect(rows).toEqual([]);
  });
});
