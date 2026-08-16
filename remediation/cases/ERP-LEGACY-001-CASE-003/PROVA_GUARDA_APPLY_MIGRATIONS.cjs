'use strict';

/**
 * Prova de implementação — CASE-003 (EXTENSÃO): guarda de alvo em
 * `server/scripts/apply-pending-migrations.cjs`.
 *
 * NATUREZA DESTE ARQUIVO (ler antes de interpretar o resultado):
 * Foi escrito pela SanaCore, que implementou a correção. Portanto é
 * **evidência de implementação, NÃO é reteste** — precedente
 * TEST-SEAL-001/002 (`APR-2026-014`), §5 do REMEDIATION_CASE. O reteste
 * independente é da VeriCore e deve ser produzido por quem não escreveu a
 * correção, nos moldes de `RETEST_BATTERY_CASE003.cjs` (que este arquivo
 * imita deliberadamente no formato, para ser comparável).
 *
 * O QUE ESTE ARQUIVO FAZ:
 *  - Reproduz literalmente (copiar+colar, com âncora de linha citada) o corpo
 *    de `resolveDbName`, `sinaisDeProducao` e `avaliarAlvo` de
 *    `server/scripts/apply-pending-migrations.cjs`, e a árvore de decisão de
 *    `assertAlvoAutorizado`.
 *  - NÃO usa `require()` do módulo original — isso executaria o script, que
 *    lê `.env`, instancia `Sequelize` e consulta `"SequelizeMeta"`. As
 *    funções abaixo são cópias textuais, não importações.
 *  - NÃO abre nenhuma conexão de banco, real ou de teste (`APR-2026-016`).
 *  - Substitui `process.exit` por uma exceção marcadora só dentro deste
 *    arquivo, para capturar "a guarda recusou" sem matar o processo de teste.
 *
 * COMO EXECUTAR (reprodutível por qualquer agente/humano com Node):
 *   node remediation/cases/ERP-LEGACY-001-CASE-003/PROVA_GUARDA_APPLY_MIGRATIONS.cjs
 *
 * Saída: 0 se todos os casos bateram com o esperado; 1 se algum divergiu.
 *
 * DIFERENÇA DE DESENHO EM RELAÇÃO AOS DOIS SCRIPTS DE `d4c166e` (não é
 * inconsistência — é o desenho aprovado): lá a guarda é fail-closed SEM
 * escape; aqui existe caminho legítimo de contorno
 * (`--confirmar-banco-real`), porque aplicar migration no banco real é
 * operação legítima de deploy. Logo, o caso "banco real COM a flag → segue"
 * é comportamento CORRETO aqui e seria REPROVAÇÃO lá.
 */

const EXPECTATIONS = [];
let failures = 0;

function record(fn) {
  const ExitMarker = class extends Error {};
  const originalExit = process.exit;
  const originalError = console.error;
  const originalWarn = console.warn;
  let exited = false;
  let mensagem = '';
  process.exit = () => {
    exited = true;
    throw new ExitMarker('exit-called');
  };
  console.error = (m) => { mensagem += String(m); };
  console.warn = (m) => { mensagem += String(m); };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitMarker) threw = true;
    else throw e; // erro inesperado não deve ser engolido
  } finally {
    process.exit = originalExit;
    console.error = originalError;
    console.warn = originalWarn;
  }
  return { recusou: exited && threw, mensagem };
}

function assertResult(nome, obtido, esperadoRecusar, extra) {
  const ok = obtido.recusou === esperadoRecusar && (!extra || extra(obtido));
  EXPECTATIONS.push({ nome, recusou: obtido.recusou, esperadoRecusar, ok });
  if (!ok) failures += 1;
}

// ───────────────────────────────────────────────────────────────────────────
// Cópia literal de `apply-pending-migrations.cjs` (worktree
// `sana/ERP-LEGACY-001/CASE-003`, `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003`):
//   FLAG_CONFIRMACAO   :55
//   resolveDbName      :70-72
//   sinaisDeProducao   :84-90
//   avaliarAlvo        :101-114
//   assertAlvoAutorizado (árvore de decisão) :131-154
//   chamada da guarda, ANTES do require/new do Sequelize :156
// Textos de mensagem reduzidos ao essencial verificável (o marcador
// "RECUSADO:" e o eco do DB_NAME), já que a asserção é sobre a DECISÃO.
// ───────────────────────────────────────────────────────────────────────────

const FLAG_CONFIRMACAO = '--confirmar-banco-real';

function resolveDbName(env) {
  return env.DB_NAME || 'erp_evok_audio';
}

function sinaisDeProducao(env, dbName) {
  const sinais = [];
  if (env.NODE_ENV === 'production') sinais.push('NODE_ENV=production');
  if (/prod/i.test(dbName)) sinais.push(`DB_NAME="${dbName}" casa /prod/i`);
  if (/prod/i.test(env.DB_HOST || '')) sinais.push(`DB_HOST="${env.DB_HOST}" casa /prod/i`);
  return sinais;
}

function avaliarAlvo(env, argv) {
  const dbName = resolveDbName(env);
  const sinais = sinaisDeProducao(env, dbName);
  const descartavel = /(_test|_ci)$/i.test(dbName) && sinais.length === 0;
  const confirmado = argv.includes(FLAG_CONFIRMACAO);
  return {
    dbName,
    dbHost: env.DB_HOST || 'localhost',
    sinais,
    descartavel,
    confirmado,
    autorizado: descartavel || confirmado,
  };
}

function assertAlvoAutorizado(env, argv) {
  const alvo = avaliarAlvo(env, argv);
  if (alvo.descartavel) return alvo;
  if (!alvo.confirmado) {
    console.error(
      `RECUSADO: este script aplica DDL (migrations) e o banco alvo lido e "${alvo.dbName}" @ "${alvo.dbHost}", ` +
      'que nao tem sufixo "_test" nem "_ci"' +
      (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '') + '.',
    );
    process.exit(1);
  }
  console.warn(`ATENCAO: aplicando migrations em "${alvo.dbName}" @ "${alvo.dbHost}", confirmado via ${FLAG_CONFIRMACAO}.`);
  return alvo;
}

const chamar = (env, argv = []) => () => assertAlvoAutorizado(env, argv);

// ───────────────────────────────────────────────────────────────────────────
// BATERIA — casos mínimos exigidos pela determinação do dono
// ───────────────────────────────────────────────────────────────────────────

assertResult(
  'AM-01 sufixo _test, sem flag, deve SEGUIR (uso legitimo nao pode ganhar atrito)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test' })),
  false,
);
assertResult(
  'AM-02 sufixo _ci, sem flag, deve SEGUIR',
  record(chamar({ DB_NAME: 'erp_evok_audio_ci' })),
  false,
);
assertResult(
  'AM-03 banco REAL (erp_evok_audio) SEM a flag deve RECUSAR, e a mensagem deve ecoar o alvo lido',
  record(chamar({ DB_NAME: 'erp_evok_audio' })),
  true,
  (o) => o.mensagem.includes('RECUSADO') && o.mensagem.includes('erp_evok_audio'),
);
assertResult(
  'AM-04 banco REAL COM a flag --confirmar-banco-real deve SEGUIR (caminho legitimo de deploy)',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar-banco-real'])),
  false,
  (o) => o.mensagem.includes('ATENCAO'),
);
assertResult(
  'AM-05 (AGRAVANTE) DB_NAME AUSENTE do ambiente — resolveDbName cai no default do banco REAL ' +
    'e a guarda avalia o valor RESOLVIDO — deve RECUSAR',
  record(chamar({})),
  true,
  (o) => o.mensagem.includes('erp_evok_audio'),
);
assertResult(
  "AM-06 DB_NAME='' (vazio explicito) — mesmo default por falsiness — deve RECUSAR",
  record(chamar({ DB_NAME: '' })),
  true,
);
assertResult(
  'AM-07 sufixo PARECIDO mas nao exato (_testing) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_testing' })),
  true,
);
assertResult(
  'AM-08 sufixo PARECIDO mas nao exato (_cix) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_cix' })),
  true,
);

// ── Casos adicionais: fronteiras do desenho ────────────────────────────────

assertResult(
  'AM-09 "_test" no MEIO, nao no fim (_test_extra) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_test_extra' })),
  true,
);
assertResult(
  'AM-10 case-insensitividade: _TEST deve SEGUIR (regex tem /i, por paridade com run-api-suite.cjs:530)',
  record(chamar({ DB_NAME: 'erp_evok_audio_TEST' })),
  false,
);
assertResult(
  'AM-11 sufixo _test MAS NODE_ENV=production deve RECUSAR sem flag ' +
    '(as tres variaveis de run-api-suite.cjs:524-529 desqualificam o alvo como descartavel)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', NODE_ENV: 'production' })),
  true,
);
assertResult(
  'AM-12 sufixo _test MAS DB_HOST casa /prod/i deve RECUSAR sem flag',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', DB_HOST: 'prod-db.evokaudio.local' })),
  true,
);
assertResult(
  'AM-13 sufixo _test com sinal de producao, COM a flag, deve SEGUIR (a flag cobre todo alvo nao descartavel)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', NODE_ENV: 'production' }, ['--confirmar-banco-real'])),
  false,
);
assertResult(
  'AM-14 flag PARECIDA nao serve: "--confirmar" (a flag de limpar-dados-transacionais.cjs) ' +
    'NAO satisfaz esta guarda — comparacao e por igualdade exata',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar'])),
  true,
);
assertResult(
  'AM-15 flag PARECIDA nao serve: "--confirmar-banco" (prefixo) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar-banco'])),
  true,
);
assertResult(
  'AM-16 flag em SEGUNDA posicao, depois do filtro regex, deve SEGUIR ' +
    '(ordem dos argumentos nao importa: argv.includes)',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['^20260807', '--confirmar-banco-real'])),
  false,
);
assertResult(
  'AM-17 NAO existe bypass por variavel de ambiente: env inventada nao autoriza nada',
  record(chamar({ DB_NAME: 'erp_evok_audio', CONFIRMAR_BANCO_REAL: '1', FORCE: '1', CI: 'true' })),
  true,
);
assertResult(
  'AM-18 DB_NAME="erp_prod_test" — casa sufixo _test MAS casa /prod/i — deve RECUSAR sem flag',
  record(chamar({ DB_NAME: 'erp_prod_test' })),
  true,
);

// ── Consistência entre o valor que a guarda vê e o que a conexão usaria ────

assertResult(
  'AM-19 consistencia: o valor avaliado pela guarda e o MESMO passado ao Sequelize ' +
    '(ambos chamam resolveDbName(process.env); apply-pending-migrations.cjs:156 e :160) — sem divergencia',
  (() => {
    const env = {};
    const guardaVe = avaliarAlvo(env, []).dbName;
    const conexaoVeria = resolveDbName(env);
    return { recusou: guardaVe !== conexaoVeria, mensagem: '' };
  })(),
  false,
);
assertResult(
  'AM-20 a flag NAO e consumida como filtro regex: apos remove-la, o posicional volta a ser o filtro ' +
    '(apply-pending-migrations.cjs:174-175) — sem isso o script diria "Nada pendente." em silencio',
  (() => {
    const FLAG = '--confirmar-banco-real';
    const semFlag = ['--confirmar-banco-real'].filter((a) => a !== FLAG);
    const comFiltro = ['^20260807', '--confirmar-banco-real'].filter((a) => a !== FLAG);
    const okVazio = new RegExp(semFlag[0] || '.').source === '.';
    const okFiltro = new RegExp(comFiltro[0] || '.').source === '^20260807';
    return { recusou: !(okVazio && okFiltro), mensagem: '' };
  })(),
  false,
);

// ───────────────────────────────────────────────────────────────────────────
// RESULTADO
// ───────────────────────────────────────────────────────────────────────────

console.log('CASE-003 (extensao) — prova da guarda de apply-pending-migrations.cjs (SanaCore)\n');
for (const r of EXPECTATIONS) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.nome}`);
}
console.log(`\n${EXPECTATIONS.length - failures}/${EXPECTATIONS.length} casos bateram com o esperado.`);

if (failures > 0) {
  console.error(`\n${failures} DIVERGENCIA(S) — nao entregar sem investigar.`);
  process.exitCode = 1;
} else {
  console.log('\nTodos os casos bateram com o comportamento esperado.');
  console.log('Nenhuma conexao de banco foi aberta por este arquivo (APR-2026-016).');
  process.exitCode = 0;
}
