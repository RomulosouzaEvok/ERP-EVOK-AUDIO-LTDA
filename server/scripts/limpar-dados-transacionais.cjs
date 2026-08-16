'use strict';

/**
 * Esvazia o banco de DADOS (movimento e cadastro operacional) preservando a
 * CONFIGURAÇÃO, para que a carga inicial real da fábrica entre num banco
 * limpo em vez de conviver com o dado de teste acumulado nas sessões de
 * desenvolvimento.
 *
 * ## Por que este script existe
 *
 * Em 2026-08-10 o banco de dev carregava resíduo de teste de várias sessões:
 * 30 `products` e 17 `items` inventados, 8 ordens de produção, 4 pedidos de
 * compra, 4 requisições, 29 movimentações de estoque, 10 lotes, 4 processos
 * de importação, contas a pagar/receber, NCs e ensaios acústicos. Nada disso
 * corresponde à fábrica. Carregar a lista real por cima produziria um cadastro
 * misturado — e um estoque que ninguém consegue conferir contra a prateleira.
 *
 * ## O que é PRESERVADO (e por quê)
 *
 * | Tabela                                     | Motivo |
 * |--------------------------------------------|--------|
 * | `SequelizeMeta`                            | Apagar faria as 164 migrations rodarem de novo sobre um schema que já existe |
 * | `users`, `access_profiles`, `access_profile_permissions` | Sem isso ninguém loga; e os aprovadores departamentais somem, travando a segregação de função (D-K) |
 * | `departments`                              | Os 17 departamentos reais vêm do seed, não são dado de teste |
 * | `warehouses`, `work_centers`               | Estrutura física da fábrica, não movimento |
 * | Tabelas de configuração (`*_settings`, `*_config`) | Parametrização, não movimento |
 *
 * ## O que é APAGADO
 *
 * Todo o resto do schema `public`. A lista é montada em tempo de execução a
 * partir do `information_schema` — assim uma tabela nova criada no futuro
 * entra na limpeza sozinha, em vez de ficar de fora silenciosamente por
 * esquecimento de manutenção desta lista.
 *
 * ## Por que NÃO se usa `CASCADE`
 *
 * A primeira versão deste script usava `TRUNCATE ... CASCADE` e **apagou os
 * 17 departamentos**, que estavam na lista de preservados. `CASCADE` não
 * respeita lista nenhuma: ele propaga para toda tabela que tenha FK apontando
 * para o conjunto truncado. `departments` tem FK para `employees` e para
 * `cost_centers` — as duas no escopo da limpeza — e foi junto. Como
 * `departments` é populada por *migration de seed*, a perda seria permanente
 * (foi preciso restaurar do backup).
 *
 * A solução é `DELETE` sob `session_replication_role = 'replica'`:
 *
 * - `replica` suspende os gatilhos de integridade referencial na transação,
 *   então a ordem das exclusões deixa de importar e nada é recusado por FK.
 * - `DELETE` atinge **exatamente** as tabelas listadas. Não existe propagação.
 *
 * `TRUNCATE` não serve aqui nem com `replica`: a exigência de `CASCADE` para
 * tabela referenciada é uma checagem **estática** do Postgres, não um gatilho
 * — `replica` não a desliga (verificado contra o banco real). O preço do
 * `DELETE` é ser mais lento que `TRUNCATE`, irrelevante neste volume.
 *
 * As sequências são reiniciadas manualmente depois, já que só o `TRUNCATE`
 * tem `RESTART IDENTITY`.
 *
 * A transação é única: ou tudo é limpo, ou nada é.
 *
 * ## Uso
 *
 * ```bash
 * cd server
 * node scripts/limpar-dados-transacionais.cjs             # SIMULA (não grava)
 * node scripts/limpar-dados-transacionais.cjs --confirmar # executa de verdade
 * ```
 *
 * ⚠️ **Faça backup antes.** `pg_dump` do banco inteiro leva segundos — comando
 * de exemplo abaixo, contra `erp_evok_audio` (DADO REAL de produção, sem
 * sufixo `_test`/`_ci` — `APR-2026-016`). Adapte `-d` para o banco que você
 * de fato pretende esvaziar antes de copiar e colar:
 * `docker exec evok-postgres pg_dump -U evok_admin -d erp_evok_audio --format=custom > backup.dump`
 *
 * ⚠️ **Recusa rodar em produção** (`NODE_ENV === 'production'`) — mas isso
 * **não é uma guarda de nome de banco**. Este script lê `process.env.DB_NAME`
 * diretamente, sem checar sufixo `_test`/`_ci` (diferente de
 * `run-api-suite.cjs:530-536`). Se `.env` tiver `DB_NAME=erp_evok_audio` (o
 * default de `server/.env.example`) e `NODE_ENV` não estiver
 * `production` — configuração normal de dev local, por este projeto não ter
 * banco de dev separado do real — `--confirmar` apaga dado real de produção.
 * A recusa por `NODE_ENV` cobre o deploy de produção; **não cobre** a estação
 * de trabalho de um desenvolvedor ou de um agente automatizado apontando para
 * o banco real fora do NODE_ENV de produção. Residual registrado em
 * `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`
 * (`CE-03`) — recomendação de reforço (checar sufixo `_test`/`_ci` em
 * `DB_NAME`, como `run-api-suite.cjs`) é decisão de engenharia do dono, não
 * implementada por esta nota.
 *
 * @module scripts/limpar-dados-transacionais
 */

const path = require('path');

const serverDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const { Sequelize, QueryTypes } = require('sequelize');

/**
 * Tabelas preservadas por nome exato.
 * @type {Set<string>}
 */
const PRESERVAR_EXATO = new Set([
  'SequelizeMeta',
  'users',
  'access_profiles',
  'access_profile_permissions',
  'departments',
  'warehouses',
  'work_centers',
  'work_center_shifts',
  // Populada por MIGRATION de seed (`20260807-000231-seed-accounting-chart-of-accounts`).
  // Truncar apagaria o plano de contas PARA SEMPRE: como `SequelizeMeta` é
  // preservada, a migration está marcada como aplicada e nunca roda de novo.
  'accounting_chart_of_accounts',
]);

/**
 * Tabelas preservadas por padrão de nome (parametrização do sistema).
 * @type {RegExp[]}
 */
const PRESERVAR_PADRAO = [/_settings$/, /_config$/, /^company_/];

/**
 * Linhas que sobrevivem à limpeza por estarem em tabela preservada, mas que
 * são reconhecidamente lixo de teste. Rodado depois do `TRUNCATE`.
 *
 * Preservar `warehouses` como estrutura da fábrica é correto — só que a suíte
 * de integração cria depósitos descartáveis com `code` prefixado de `RBAC` e
 * um timestamp. Na primeira execução real, 6 dos 9 depósitos eram desses.
 *
 * @type {Array<{ tabela: string, onde: string, motivo: string }>}
 */
const LIXO_EM_TABELA_PRESERVADA = [
  {
    tabela: 'warehouses',
    onde: "code LIKE 'RBAC%'",
    motivo: 'depositos descartaveis criados pelos testes de RBAC',
  },
];

/** @param {string} tabela @returns {boolean} */
function devePreservar(tabela) {
  return PRESERVAR_EXATO.has(tabela) || PRESERVAR_PADRAO.some((re) => re.test(tabela));
}

/**
 * Extrai a primeira coluna de uma linha de resultado.
 *
 * O driver deste ambiente devolve as linhas de query crua como **array**
 * (`["users"]`) e não como objeto (`{ table_name: "users" }`). Ler direto
 * pelo nome da coluna produzia `undefined` e, com ele, um `TRUNCATE` montado
 * sobre uma tabela chamada literalmente `"undefined"`. Aceitar as duas formas
 * é mais barato que depender do formato.
 *
 * @param {Record<string, unknown> | unknown[]} linha
 * @param {string} coluna
 * @returns {any}
 */
function primeiraColuna(linha, coluna) {
  if (Array.isArray(linha)) return linha[0];
  return linha[coluna];
}

/**
 * Lista as tabelas base do schema `public`.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<string[]>}
 */
async function listarTabelas(sequelize) {
  const linhas = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name
  `, { type: QueryTypes.SELECT });
  return linhas.map((l) => primeiraColuna(l, 'table_name')).filter(Boolean);
}

/**
 * Conta as linhas de cada tabela informada.
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string[]} tabelas
 * @returns {Promise<Map<string, number>>}
 */
async function contarLinhas(sequelize, tabelas) {
  const contagens = new Map();
  for (const tabela of tabelas) {
    const linhas = await sequelize.query(
      `SELECT count(*)::int AS total FROM "${tabela}"`,
      { type: QueryTypes.SELECT },
    );
    contagens.set(tabela, Number(primeiraColuna(linhas[0], 'total')));
  }
  return contagens;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('RECUSADO: este script nao roda com NODE_ENV=production.');
    process.exit(1);
  }

  const confirmado = process.argv.includes('--confirmar');

  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      logging: false,
    },
  );

  await sequelize.authenticate();
  console.log(`Banco: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);

  const todas = await listarTabelas(sequelize);
  const preservadas = todas.filter(devePreservar);
  const alvo = todas.filter((t) => !devePreservar(t));

  const contagens = await contarLinhas(sequelize, todas);
  const comDados = alvo.filter((t) => contagens.get(t) > 0);
  const totalLinhas = comDados.reduce((soma, t) => soma + contagens.get(t), 0);

  console.log(`PRESERVADAS (${preservadas.length} tabelas):`);
  for (const t of preservadas) {
    console.log(`  = ${t.padEnd(38)} ${String(contagens.get(t)).padStart(6)} linhas mantidas`);
  }

  console.log(`\nA APAGAR (${comDados.length} tabelas com dado, de ${alvo.length} no escopo):`);
  for (const t of comDados) {
    console.log(`  - ${t.padEnd(38)} ${String(contagens.get(t)).padStart(6)} linhas`);
  }
  console.log(`\n  TOTAL: ${totalLinhas} linhas em ${comDados.length} tabelas.`);

  console.log('\nLIMPEZA PONTUAL em tabela preservada:');
  for (const { tabela, onde, motivo } of LIXO_EM_TABELA_PRESERVADA) {
    const linhas = await sequelize.query(
      `SELECT count(*)::int AS total FROM "${tabela}" WHERE ${onde}`,
      { type: QueryTypes.SELECT },
    );
    console.log(`  - ${tabela} WHERE ${onde}: ${primeiraColuna(linhas[0], 'total')} linhas (${motivo})`);
  }

  if (!confirmado) {
    console.log('\n>>> SIMULACAO. Nada foi alterado.');
    console.log('>>> Para executar de verdade, rode de novo com --confirmar');
    console.log('>>> ANTES DISSO, faca o backup (ver cabecalho deste arquivo).');
    await sequelize.close();
    return;
  }

  if (alvo.length === 0) {
    console.log('\nNada a fazer.');
    await sequelize.close();
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    // Suspende os gatilhos de FK (ver cabeçalho: por que NÃO se usa CASCADE).
    await sequelize.query(`SET LOCAL session_replication_role = 'replica'`, { transaction });

    for (const tabela of alvo) {
      await sequelize.query(`DELETE FROM "${tabela}"`, { transaction });
    }
    for (const { tabela, onde } of LIXO_EM_TABELA_PRESERVADA) {
      await sequelize.query(`DELETE FROM "${tabela}" WHERE ${onde}`, { transaction });
    }

    // Equivalente ao `RESTART IDENTITY` que só o TRUNCATE oferece — restrito
    // às tabelas do escopo. Reiniciar TODAS as sequências do schema quebraria
    // as preservadas: o próximo `users` nasceria com id 1, colidindo com o
    // admin que continua lá.
    await sequelize.query(`
      DO $$
      DECLARE seq record;
      BEGIN
        FOR seq IN
          SELECT s.oid::regclass AS nome
            FROM pg_class s
            JOIN pg_namespace n  ON n.oid = s.relnamespace
            JOIN pg_depend d     ON d.objid = s.oid AND d.deptype = 'a'
            JOIN pg_class tabela ON tabela.oid = d.refobjid
           WHERE s.relkind = 'S'
             AND n.nspname = 'public'
             AND tabela.relname = ANY(:alvo)
        LOOP
          EXECUTE format('ALTER SEQUENCE %s RESTART', seq.nome);
        END LOOP;
      END $$;
    `, { transaction, replacements: { alvo } });

    await transaction.commit();
  } catch (erro) {
    await transaction.rollback();
    console.error('\nFALHOU — nada foi apagado (rollback):', erro.message);
    await sequelize.close();
    process.exit(1);
  }

  const depois = await contarLinhas(sequelize, alvo);
  const sobrou = alvo.filter((t) => depois.get(t) > 0);

  console.log(`\nOK. ${totalLinhas} linhas removidas de ${comDados.length} tabelas.`);
  if (sobrou.length > 0) {
    console.log('ATENCAO: estas tabelas ainda tem dado:', sobrou.join(', '));
  }

  // Guarda contra perda colateral. A versao com CASCADE apagou `departments`
  // em silencio; so foi notado por acaso, depois. Aqui a perda vira erro.
  const preservadasDepois = await contarLinhas(sequelize, preservadas);
  const perdidas = preservadas.filter((t) => {
    const esperado = contagens.get(t);
    const obtido = preservadasDepois.get(t);
    const removidoDeProposito = LIXO_EM_TABELA_PRESERVADA.some((l) => l.tabela === t);
    return obtido < esperado && !removidoDeProposito;
  });

  if (perdidas.length > 0) {
    console.error('\n*** PERDA COLATERAL EM TABELA PRESERVADA ***');
    for (const t of perdidas) {
      console.error(`  ${t}: tinha ${contagens.get(t)}, ficou com ${preservadasDepois.get(t)}`);
    }
    console.error('\nRestaure do backup antes de continuar:');
    console.error('  docker cp <backup>.dump evok-postgres:/tmp/b.dump');
    console.error('  MSYS_NO_PATHCONV=1 docker exec evok-postgres \\');
    // ⚠️ Exemplo de restauração — "-d erp_evok_audio" abaixo é o banco REAL de
    // produção (APR-2026-016). Adapte "-d" para o banco correto antes de rodar.
    console.error('    pg_restore -U evok_admin -d erp_evok_audio --data-only -t <tabela> /tmp/b.dump');
    process.exitCode = 1;
  } else {
    console.log('Guarda: todas as tabelas preservadas mantiveram suas linhas.');
  }
  console.log('\nProximo passo: carregar o cadastro real com');
  console.log('  node scripts/importar-itens-csv.cjs ../docs/carga-inicial/insumos-materia-prima.csv');

  await sequelize.close();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
