'use strict';

/**
 * Prova de implementação — CASE-003 (2ª EXTENSÃO): guarda de alvo em
 * `server/scripts/criar-aprovador.cjs`.
 *
 * NATUREZA DESTE ARQUIVO (ler antes de interpretar o resultado):
 * Foi escrito pela SanaCore, que implementou a correção. Portanto é
 * **evidência de implementação, NÃO é reteste** — precedente
 * TEST-SEAL-001/002 (`APR-2026-014`). O reteste independente é da VeriCore e
 * deve ser produzido por quem não escreveu a correção. Este arquivo imita
 * deliberadamente o formato de `PROVA_GUARDA_APPLY_MIGRATIONS.cjs` (1ª
 * extensão) para ser diretamente comparável com ele.
 *
 * O QUE ESTE ARQUIVO FAZ:
 *  - Reproduz literalmente (copiar+colar, com âncora de linha citada) o corpo
 *    de `FLAG_CONFIRMACAO`, `resolveDbName`, `sinaisDeProducao` e
 *    `avaliarAlvo` de `server/scripts/criar-aprovador.cjs`, e a árvore de
 *    decisão de `assertAlvoAutorizado`.
 *  - NÃO usa `require()` do módulo original — isso executaria `main()`, que lê
 *    `.env`, instancia `Sequelize`, chama `authenticate()` e escreve em
 *    `users`. As funções abaixo são cópias textuais, não importações.
 *  - NÃO abre nenhuma conexão de banco, real ou de teste (`APR-2026-016`).
 *  - Substitui `process.exit` por uma exceção marcadora só dentro deste
 *    arquivo, para capturar "a guarda recusou" sem matar o processo de teste.
 *
 * COMO EXECUTAR (reprodutível por qualquer agente/humano com Node):
 *   node remediation/cases/ERP-LEGACY-001-CASE-003/PROVA_GUARDA_CRIAR_APROVADOR.cjs
 *
 * Saída: 0 se todos os casos bateram com o esperado; 1 se algum divergiu.
 *
 * DESENHO (igual ao da 1ª extensão, diferente dos dois scripts de `d4c166e`):
 * aqui existe caminho legítimo de contorno (`--confirmar-banco-real`), porque
 * criar aprovador no banco real é ato de administração legítimo. Logo, o caso
 * "banco real COM a flag → segue" é comportamento CORRETO aqui e seria
 * REPROVAÇÃO em `limpar-dados-transacionais.cjs`.
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
// Cópia literal de `criar-aprovador.cjs` (worktree
// `sana/ERP-LEGACY-001/CASE-003`, `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003`):
//   FLAG_CONFIRMACAO   :138
//   resolveDbName      :153-155
//   sinaisDeProducao   :168-174
//   avaliarAlvo        :185-198
//   assertAlvoAutorizado (árvore de decisão) :219-242
//   chamada da guarda, 1ª instrução de main(), antes de connect() :420
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
      `RECUSADO: este script escreve usuario, senha e permissoes de perfil, e o banco alvo lido e "${alvo.dbName}" @ "${alvo.dbHost}", `
      + 'que nao tem sufixo "_test" nem "_ci"'
      + (alvo.sinais.length ? ` (sinais de producao: ${alvo.sinais.join('; ')})` : '') + '.',
    );
    process.exit(1);
  }
  console.warn(`ATENCAO: criando/alterando aprovador em "${alvo.dbName}" @ "${alvo.dbHost}", confirmado via ${FLAG_CONFIRMACAO}.`);
  return alvo;
}

const chamar = (env, argv = []) => () => assertAlvoAutorizado(env, argv);

// ───────────────────────────────────────────────────────────────────────────
// BATERIA — casos mínimos exigidos pela determinação do dono
// ───────────────────────────────────────────────────────────────────────────

assertResult(
  'CA-01 sufixo _test, sem flag, deve SEGUIR (uso legitimo nao pode ganhar atrito)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test' })),
  false,
);
assertResult(
  'CA-02 sufixo _ci, sem flag, deve SEGUIR',
  record(chamar({ DB_NAME: 'erp_evok_audio_ci' })),
  false,
);
assertResult(
  'CA-03 banco REAL (erp_evok_audio) SEM a flag deve RECUSAR, e a mensagem deve ecoar o alvo lido',
  record(chamar({ DB_NAME: 'erp_evok_audio' })),
  true,
  (o) => o.mensagem.includes('RECUSADO') && o.mensagem.includes('erp_evok_audio'),
);
assertResult(
  'CA-04 banco REAL COM a flag --confirmar-banco-real deve SEGUIR (ato de administracao legitimo)',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar-banco-real'])),
  false,
  (o) => o.mensagem.includes('ATENCAO'),
);
assertResult(
  'CA-05 (AGRAVANTE) DB_NAME AUSENTE do ambiente — resolveDbName cai no default do banco REAL '
    + 'e a guarda avalia o valor RESOLVIDO — deve RECUSAR',
  record(chamar({})),
  true,
  (o) => o.mensagem.includes('erp_evok_audio'),
);
assertResult(
  "CA-06 DB_NAME='' (vazio explicito) — mesmo default por falsiness — deve RECUSAR",
  record(chamar({ DB_NAME: '' })),
  true,
);
assertResult(
  'CA-07 sufixo PARECIDO mas nao exato (_testing) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_testing' })),
  true,
);
assertResult(
  'CA-08 sufixo PARECIDO mas nao exato (_cix) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_cix' })),
  true,
);
assertResult(
  'CA-09 flag PARECIDA nao serve: "--confirmar" (a flag de limpar-dados-transacionais.cjs) '
    + 'NAO satisfaz esta guarda — comparacao e por igualdade exata',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar'])),
  true,
);
assertResult(
  'CA-10 flag PARECIDA nao serve: "--confirmar-banco" (prefixo) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio' }, ['--confirmar-banco'])),
  true,
);

// ── Casos adicionais: fronteiras do desenho ────────────────────────────────

assertResult(
  'CA-11 "_test" no MEIO, nao no fim (_test_extra) deve RECUSAR',
  record(chamar({ DB_NAME: 'erp_evok_audio_test_extra' })),
  true,
);
assertResult(
  'CA-12 case-insensitividade: _TEST deve SEGUIR (regex tem /i, por paridade com run-api-suite.cjs:530)',
  record(chamar({ DB_NAME: 'erp_evok_audio_TEST' })),
  false,
);
assertResult(
  'CA-13 sufixo _test MAS NODE_ENV=production deve RECUSAR sem flag '
    + '(as tres variaveis de run-api-suite.cjs:524-529 desqualificam o alvo como descartavel)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', NODE_ENV: 'production' })),
  true,
);
assertResult(
  'CA-14 sufixo _test MAS DB_HOST casa /prod/i deve RECUSAR sem flag',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', DB_HOST: 'prod-db.evokaudio.local' })),
  true,
);
assertResult(
  'CA-15 sufixo _test com sinal de producao, COM a flag, deve SEGUIR (a flag cobre todo alvo nao descartavel)',
  record(chamar({ DB_NAME: 'erp_evok_audio_test', NODE_ENV: 'production' }, ['--confirmar-banco-real'])),
  false,
);
assertResult(
  'CA-16 DB_NAME="erp_prod_test" — casa sufixo _test MAS casa /prod/i — deve RECUSAR sem flag',
  record(chamar({ DB_NAME: 'erp_prod_test' })),
  true,
);
assertResult(
  'CA-17 (VETOR REAL DO CASO) NODE_ENV=development com DB_NAME do banco real — a configuracao '
    + 'do .env.example, que uma guarda so de NODE_ENV deixaria passar — deve RECUSAR',
  record(chamar({ NODE_ENV: 'development', DB_NAME: 'erp_evok_audio', DB_HOST: 'localhost' })),
  true,
  (o) => o.mensagem.includes('RECUSADO'),
);
assertResult(
  'CA-18 NAO existe bypass por variavel de ambiente: env inventada nao autoriza nada',
  record(chamar({ DB_NAME: 'erp_evok_audio', CONFIRMAR_BANCO_REAL: '1', FORCE: '1', CI: 'true' })),
  true,
);
assertResult(
  'CA-19 ordem dos argumentos nao importa: a flag depois dos argumentos nomeados deve SEGUIR',
  record(chamar(
    { DB_NAME: 'erp_evok_audio' },
    ['--email', 'diretoria@evokaudio.com.br', '--nome', 'Fulano', '--confirmar-banco-real'],
  )),
  false,
);
assertResult(
  'CA-20 argumentos nomeados SEM a flag continuam recusando (a presenca de --email/--admin '
    + 'nao substitui a confirmacao do alvo)',
  record(chamar(
    { DB_NAME: 'erp_evok_audio' },
    ['--email', 'diretoria@evokaudio.com.br', '--admin', '--rotacionar-senha'],
  )),
  true,
);

// ── Consistência entre o valor que a guarda vê e o que a conexão usaria ────

assertResult(
  'CA-21 consistencia: o valor avaliado pela guarda e o MESMO passado ao Sequelize '
    + '(ambos chamam resolveDbName(process.env); criar-aprovador.cjs main() e connect()) — sem divergencia',
  (() => {
    const env = {};
    const guardaVe = avaliarAlvo(env, []).dbName;
    const conexaoVeria = resolveDbName(env);
    return { recusou: guardaVe !== conexaoVeria, mensagem: '' };
  })(),
  false,
);
assertResult(
  'CA-22 NAO ha argumento posicional neste script: arg() usa indexOf("--nome") e flag() usa includes, '
    + 'entao a flag nova nao e consumida como valor de nada quando vem depois de um par completo '
    + '(risco encontrado em apply-pending-migrations.cjs NAO se repete aqui)',
  (() => {
    const argv = ['--email', 'diretoria@evokaudio.com.br', '--perfil', 'compras', '--confirmar-banco-real'];
    const arg = (nome) => {
      const i = argv.indexOf(`--${nome}`);
      return i >= 0 ? argv[i + 1] : undefined;
    };
    const ok = arg('email') === 'diretoria@evokaudio.com.br'
      && arg('perfil') === 'compras'
      && arg('nome') === undefined
      && argv.includes(FLAG_CONFIRMACAO);
    return { recusou: !ok, mensagem: '' };
  })(),
  false,
);

// ───────────────────────────────────────────────────────────────────────────
// RESULTADO
// ───────────────────────────────────────────────────────────────────────────

console.log('CASE-003 (2a extensao) — prova da guarda de criar-aprovador.cjs (SanaCore)\n');
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
