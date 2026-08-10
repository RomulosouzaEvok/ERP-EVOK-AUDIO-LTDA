'use strict';

/**
 * Baseline do schema — DDL ESTATICO CONGELADO.
 *
 * ## Por que esta migration foi reescrita (2026-08-10)
 *
 * Ate o commit `e2a8d7e` esta migration **gerava** o schema a partir dos
 * models COMPILADOS (`dist/src/models/*.js`), em tempo de execucao, via um
 * `DYNAMIC_MODEL_FILES` + `createTableFromModel`. O efeito colateral e que o
 * schema produzido por uma maquina dependia de **quando** o bootstrap rodou:
 * dois bancos com as MESMAS 160 migrations aplicadas divergiam em 29 colunas
 * (nulabilidade de campos de NF-e/imposto). Isso foi medido, nao suposto —
 * ver `server/scripts/comparar-bancos.cjs` e o commit `e2a8d7e`.
 *
 * Agora o baseline aplica um `pg_dump --schema-only` congelado do banco de
 * desenvolvimento ja corrigido (`00_baseline_frozen.sql`, 200 tabelas), que
 * corresponde ao estado do schema DEPOIS das 160 migrations listadas em
 * `00_baseline_frozen_meta.sql`. Como o DDL e estatico, todo banco novo
 * nasce byte a byte com a mesma estrutura, independente da maquina, da data
 * e do estado do `dist/`.
 *
 * ## Como o resto das migrations e tratado
 *
 * O arquivo congelado ja CONTEM o resultado das 160 migrations. Rodar as 159
 * seguintes por cima quebraria (`column already exists`). Entao, no mesmo
 * `up`, elas sao registradas em `SequelizeMeta` como ja aplicadas.
 *
 * Isso funciona porque o umzug 2.x reconsulta o storage **por migration, no
 * momento de executar** (`Umzug#execute` -> `_wasExecuted` -> `findAll`), e
 * nao apenas uma vez no inicio. Marcar dentro do `up` do baseline faz o umzug
 * pular as seguintes e reportar `No migrations were executed`.
 *
 * Duas excecoes ficam de fora da marcacao e continuam rodando de verdade
 * (`STILL_RUN_AFTER_FROZEN`), porque seu efeito NAO esta no dump congelado:
 * `pg_dump --schema-only --no-owner --no-acl` nao carrega roles/GRANTs nem
 * dados. Ambas sao DDL-free e idempotentes, entao rodam sem conflito sobre
 * um schema ja completo.
 *
 * Tres migrations misturam DDL + seed de dados de referencia na mesma
 * funcao, entao nao podem ser reexecutadas inteiras. Delas so a parte de
 * seed e reaproveitada aqui (`REFERENCE_SEED_MIGRATIONS`), chamando o
 * `seedReferenceData` exportado por cada uma — sem reescrever o SQL, para
 * a fonte da verdade continuar sendo a propria migration.
 *
 * ## Banco que JA existe
 *
 * O atalho `shouldBootstrapCanonicalSchema` continua valendo: se as tabelas
 * base ja estao la, esta migration nao toca em nada (nem aplica o dump, nem
 * marca as demais como aplicadas). E o que protege `erp_evok_audio` e
 * `erp_evok_audio_test`, que ja tem o baseline registrado e nunca reexecutam
 * este `up`.
 *
 * @type {import('sequelize-cli').Migration}
 */

const fs = require('fs');
const path = require('path');

/** DDL congelado (pg_dump --schema-only) do schema canonico. */
const FROZEN_SCHEMA_FILE = '00_baseline_frozen.sql';

/** Lista congelada das migrations ja contidas no DDL acima. */
const FROZEN_META_FILE = '00_baseline_frozen_meta.sql';

/** Nome deste arquivo — o umzug registra sozinho, nao pode ser pre-inserido. */
const SELF_MIGRATION = '20260731-000001-baseline-schema.cjs';

/**
 * Tabela de controle do umzug. Precisa bater com
 * `migrationStorageTableName` em `config/sequelize-cli.config.cjs`.
 */
const META_TABLE = 'SequelizeMeta';

/**
 * Migrations que NAO sao marcadas como aplicadas: o efeito delas nao esta
 * no dump congelado (role/GRANT e dados de referencia) e elas sao
 * idempotentes e sem DDL, logo rodam com seguranca sobre o schema completo.
 */
const STILL_RUN_AFTER_FROZEN = new Set([
  // Cria a role de aplicacao `evok_app` + GRANTs. Roles sao objetos de
  // cluster e o dump foi feito sem ACL, entao nada disso vem no arquivo.
  '20260806-000080-create-app-role-least-privilege.cjs',
  // Seed puro do plano de contas (30 linhas, ON CONFLICT DO NOTHING).
  '20260807-000231-seed-accounting-chart-of-accounts.cjs',
]);

/**
 * Migrations que criam tabela E semeiam dados de referencia na mesma
 * funcao. Nao da para reexecutar o `up` inteiro (o DDL colidiria), entao
 * chamamos apenas o `seedReferenceData` que cada uma exporta.
 *
 * Sem isso, um banco novo nasceria sem depositos, sem perfil de acesso de
 * referencia e sem a linha singleton de custo de producao — dados que hoje
 * o seed de boot da aplicacao (`src/config/seeds.ts`, que cobre apenas
 * admin/departamentos/categorias) nao repoe.
 */
const REFERENCE_SEED_MIGRATIONS = [
  '20260803-000008-create-access-profiles.cjs',
  '20260804-000001-create-warehouses.cjs',
  '20260804-000008-create-production-cost-settings.cjs',
];

/**
 * Resolve o caminho de um arquivo SQL do diretorio de schema.
 *
 * @param {string} fileName - Nome do arquivo.
 * @returns {string} Caminho absoluto.
 */
function resolveSqlFile(fileName) {
  return path.resolve(__dirname, '..', 'database', 'postgresql', fileName);
}

/**
 * Ajusta o dump do `pg_dump` para rodar pelo driver (e nao pelo `psql`).
 *
 * Sao quatro ajustes, todos necessarios e nenhum deles altera a estrutura
 * produzida:
 * 1. BOM UTF-8 no inicio do arquivo;
 * 2. meta-comandos do psql (`\restrict` / `\unrestrict`), que o protocolo
 *    do driver nao entende;
 * 3. `set_config('search_path', '')` — o dump zera o search_path da SESSAO,
 *    e essa conexao e reaproveitada pelas migrations seguintes;
 * 4. `SequelizeMeta` — o umzug cria a tabela de controle ANTES de executar
 *    a primeira migration, entao o `CREATE TABLE` do dump colidiria.
 *
 * @param {string} rawSql - Conteudo bruto do arquivo.
 * @returns {string} SQL pronto para execucao.
 */
function sanitizeFrozenSchemaSql(rawSql) {
  return rawSql
    .replace(/^﻿/, '')
    .replace(/^\s*\\.*$/gm, '')
    .replace(
      /SELECT pg_catalog\.set_config\('search_path', '', false\);/g,
      "SELECT pg_catalog.set_config('search_path', 'public', false);",
    )
    .replace(
      /CREATE TABLE public\."SequelizeMeta"/g,
      'CREATE TABLE IF NOT EXISTS public."SequelizeMeta"',
    )
    .replace(
      /ALTER TABLE ONLY public\."SequelizeMeta"\s*\n\s*ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY \(name\);/g,
      [
        'DO $sequelize_meta_pkey$',
        'BEGIN',
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SequelizeMeta_pkey') THEN",
        '    ALTER TABLE ONLY public."SequelizeMeta" ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);',
        '  END IF;',
        'END',
        '$sequelize_meta_pkey$;',
      ].join('\n'),
    )
    .trim();
}

/**
 * Le os nomes das migrations congeladas a partir do bloco `COPY` do
 * `00_baseline_frozen_meta.sql`.
 *
 * A lista vem do arquivo (e nao de um `readdir` em `migrations/`) de
 * proposito: uma migration criada DEPOIS do congelamento nao esta no dump e
 * precisa continuar rodando normalmente por cima dele.
 *
 * @returns {string[]} Nomes de arquivo das migrations ja contidas no dump.
 */
function readFrozenMigrationNames() {
  const raw = fs.readFileSync(resolveSqlFile(FROZEN_META_FILE), 'utf8').replace(/^﻿/, '');

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{8}-\d{6}-.+\.cjs$/.test(line));
}

/**
 * Verifica se uma tabela existe.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} tableName
 * @returns {Promise<boolean>}
 */
async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Decide se o schema canonico precisa ser criado.
 *
 * Se o banco ja tem tabelas-base, ele foi provisionado antes (dev,
 * producao, restore de backup) e NAO pode ser tocado por este bootstrap.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @returns {Promise<boolean>}
 */
async function shouldBootstrapCanonicalSchema(queryInterface) {
  const baselineMarkers = ['items', 'users', 'suppliers', 'sales', 'production_orders'];

  let existingMarkerCount = 0;
  for (const tableName of baselineMarkers) {
    if (await tableExists(queryInterface, tableName)) {
      existingMarkerCount += 1;
    }
  }

  if (existingMarkerCount >= 2) {
    console.log(
      `Schema existente detectado (${existingMarkerCount}/${baselineMarkers.length} tabelas-base). ` +
        'O DDL congelado NAO sera aplicado e nenhuma migration sera pre-marcada.',
    );
    return false;
  }

  return true;
}

/**
 * Aplica o DDL congelado.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @returns {Promise<void>}
 */
async function applyFrozenSchema(queryInterface) {
  const filePath = resolveSqlFile(FROZEN_SCHEMA_FILE);
  const sql = sanitizeFrozenSchemaSql(fs.readFileSync(filePath, 'utf8'));

  if (!sql) {
    throw new Error(`DDL congelado vazio ou ausente: ${filePath}`);
  }

  console.log(`Aplicando DDL congelado (${FROZEN_SCHEMA_FILE}, ${(sql.length / 1024).toFixed(0)} KB).`);
  await queryInterface.sequelize.query(sql);
}

/**
 * Reaplica apenas o seed de dados de referencia das migrations que
 * misturam DDL + seed (ver `REFERENCE_SEED_MIGRATIONS`).
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @returns {Promise<void>}
 */
async function seedReferenceData(queryInterface) {
  for (const fileName of REFERENCE_SEED_MIGRATIONS) {
    const migration = require(path.resolve(__dirname, fileName));

    if (typeof migration.seedReferenceData !== 'function') {
      throw new Error(
        `Migration ${fileName} deveria exportar seedReferenceData() para o baseline congelado reaproveitar o seed.`,
      );
    }

    await migration.seedReferenceData(queryInterface);
  }
}

/**
 * Registra em `SequelizeMeta` as migrations ja contidas no DDL congelado,
 * para que o umzug as pule em vez de tentar reaplica-las.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @returns {Promise<void>}
 */
async function markFrozenMigrationsAsApplied(queryInterface) {
  const names = readFrozenMigrationNames().filter(
    (name) => name !== SELF_MIGRATION && !STILL_RUN_AFTER_FROZEN.has(name),
  );

  if (names.length === 0) {
    throw new Error(
      `Nenhuma migration lida de ${FROZEN_META_FILE}. O arquivo de registro do baseline congelado esta corrompido.`,
    );
  }

  const values = names.map((name) => `('${name.replace(/'/g, "''")}')`).join(', ');

  await queryInterface.sequelize.query(
    `INSERT INTO "${META_TABLE}" (name) VALUES ${values} ON CONFLICT (name) DO NOTHING;`,
  );

  console.log(
    `${names.length} migrations marcadas como aplicadas (ja contidas no DDL congelado). ` +
      `${STILL_RUN_AFTER_FROZEN.size} continuam pendentes de proposito: ${[...STILL_RUN_AFTER_FROZEN].join(', ')}.`,
  );
}

module.exports = {
  async up(queryInterface) {
    if (!(await shouldBootstrapCanonicalSchema(queryInterface))) {
      return;
    }

    await applyFrozenSchema(queryInterface);
    await seedReferenceData(queryInterface);
    await markFrozenMigrationsAsApplied(queryInterface);
  },

  /**
   * DESTRUTIVO por natureza: este `up` cria o schema INTEIRO, entao o
   * inverso coerente e remover o schema inteiro. Rodar isto contra um banco
   * com dado real apaga tudo — a protecao e que o baseline so e revertido
   * depois de reverter todas as 159 migrations acima dele.
   *
   * As extensoes (`pgcrypto`, `btree_gist`) e os objetos que pertencem a
   * elas sao preservados: o `up` as cria com `IF NOT EXISTS`, entao deixa-las
   * instaladas mantem o ciclo up/down/up funcionando sem efeito colateral.
   */
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $baseline_down$
      DECLARE
        obj RECORD;
      BEGIN
        FOR obj IN
          SELECT tablename FROM pg_tables
           WHERE schemaname = 'public' AND tablename <> '${META_TABLE}'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', obj.tablename);
        END LOOP;

        FOR obj IN
          SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND NOT EXISTS (
               SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
             )
        LOOP
          EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', obj.proname, obj.args);
        END LOOP;

        FOR obj IN
          SELECT t.typname
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public'
             AND t.typtype = 'e'
             AND NOT EXISTS (
               SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e'
             )
        LOOP
          EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', obj.typname);
        END LOOP;
      END
      $baseline_down$;
    `);

    // Devolve as migrations pre-marcadas ao estado "pendente". O proprio
    // umzug remove o registro deste arquivo logo apos este `down`.
    const names = readFrozenMigrationNames().filter((name) => name !== SELF_MIGRATION);
    const values = names.map((name) => `'${name.replace(/'/g, "''")}'`).join(', ');

    await queryInterface.sequelize.query(
      `DELETE FROM "${META_TABLE}" WHERE name IN (${values});`,
    );
  },
};
