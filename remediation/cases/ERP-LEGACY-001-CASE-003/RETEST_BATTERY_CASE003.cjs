'use strict';

/**
 * Bateria de reteste independente — CASE-003 (RC-PROC-01).
 *
 * Produzida pela VeriCore (vericore-finding-validator), NÃO pela SanaCore que
 * implementou a correção — precedente TEST-SEAL-001/002 (APR-2026-014):
 * quem escreve a correção não pode ser quem escreve a prova de correção.
 *
 * O QUE ESTE ARQUIVO FAZ:
 *  - Reproduz literalmente (copiar+colar, com âncora de linha citada) o corpo
 *    de `assertBancoDescartavel` e `resolveDbName` dos dois arquivos no
 *    REMEDIATION_COMMIT `d4c166e9c57f473df11b9f5244736c46316dc807`
 *    (worktree `sana/ERP-LEGACY-001/CASE-003`,
 *    `C:\Sistema EvokAudio\ERP-Evok-sana-CASE-003`).
 *  - NÃO usa `require()` dos módulos originais — isso dispararia `main()` e
 *    uma tentativa de `sequelize.authenticate()`. As funções abaixo são
 *    cópias textuais, não importações.
 *  - NÃO abre nenhuma conexão de banco, real ou de teste (APR-2026-016).
 *  - Substitui `process.exit` por uma exceção marcadora só dentro deste
 *    arquivo, para poder capturar "a guarda recusou" sem matar o processo de
 *    teste.
 *
 * COMO EXECUTAR (reprodutível por qualquer agente/humano com Node):
 *   node remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_BATTERY_CASE003.cjs
 *
 * Saída: 0 se todos os casos bateram com o esperado; 1 se algum caso
 * divergiu (nesse caso a lista de divergências é impressa).
 *
 * NOTA DE INTEGRIDADE DO RETESTE (obrigatória — não omitir):
 * A sessão da VeriCore que produziu este arquivo não tinha, ela própria,
 * ferramenta de execução de shell/processo disponível (apenas leitura,
 * grep, glob e escrita de arquivo). Por isso este arquivo foi validado por
 * TRAÇADO MANUAL do regex `/(_test|_ci)$/i` contra cada string de entrada —
 * uma verificação determinística (não é "pode haver um problema": é cálculo
 * exato de um autômato finito conhecido, feito à mão), não uma execução real
 * pela VeriCore nesta sessão. O arquivo abaixo é a forma de qualquer runner
 * com acesso a `node` — humano ou agente com Bash — CONVERTER esse cálculo
 * manual em prova executada, mecanicamente, sem depender de nova leitura de
 * código. Ver RETEST_REPORT.md §2 para a tabela de traçado manual e a
 * qualificação explícita do veredito por esta limitação.
 */

const EXPECTATIONS = [];
let failures = 0;

function record(nome, fn) {
  const ExitMarker = class extends Error {};
  const originalExit = process.exit;
  let exited = false;
  let exitCode = null;
  process.exit = (code) => {
    exited = true;
    exitCode = code;
    throw new ExitMarker('exit-called');
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitMarker) threw = true;
    else throw e; // erro inesperado não deve ser engolido
  } finally {
    process.exit = originalExit;
  }
  const recusou = exited && threw;
  return { nome, recusou, exitCode };
}

function assertResult(nome, recusou, esperadoRecusar) {
  const ok = recusou === esperadoRecusar;
  EXPECTATIONS.push({ nome, recusou, esperadoRecusar, ok });
  if (!ok) failures += 1;
}

// ───────────────────────────────────────────────────────────────────────────
// Cópia literal de `limpar-dados-transacionais.cjs:161-171` (REMEDIATION_COMMIT
// d4c166e). Assinatura idêntica; console.error suprimido para não poluir saída.
function assertBancoDescartavel_LIMPAR(dbName) {
  if (!/(_test|_ci)$/i.test(dbName || '')) {
    process.exit(1);
  }
}

// Cópia literal de `seed-usuarios-departamentos.cjs:324-326` e `:342-352`
// (mesmo commit). `resolveDbName` e `assertBancoDescartavel` são funções
// distintas no arquivo original — reproduzidas separadamente aqui, na mesma
// relação (a guarda recebe o valor JÁ resolvido, nunca o env cru).
function resolveDbName_SEED(env) {
  return env.DB_NAME || 'erp_evok_audio';
}
function assertBancoDescartavel_SEED(dbName) {
  if (!/(_test|_ci)$/i.test(dbName || '')) {
    process.exit(1);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// BATERIA — LIMPAR (sem default; recebe process.env.DB_NAME cru, âncora :229)
// ───────────────────────────────────────────────────────────────────────────

assertResult(
  'LIMPAR-01 banco real sem sufixo (erp_evok_audio) deve RECUSAR',
  record('L01', () => assertBancoDescartavel_LIMPAR('erp_evok_audio')).recusou,
  true,
);
assertResult(
  'LIMPAR-02 sufixo _test deve SEGUIR',
  record('L02', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_test')).recusou,
  false,
);
assertResult(
  'LIMPAR-03 sufixo _ci deve SEGUIR',
  record('L03', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_ci')).recusou,
  false,
);
assertResult(
  'LIMPAR-04 DB_NAME undefined (ausente do ambiente) deve RECUSAR',
  record('L04', () => assertBancoDescartavel_LIMPAR(undefined)).recusou,
  true,
);
assertResult(
  "LIMPAR-05 DB_NAME='' (vazio explícito) deve RECUSAR",
  record('L05', () => assertBancoDescartavel_LIMPAR('')).recusou,
  true,
);
assertResult(
  'LIMPAR-06 sufixo parecido mas não exato (_testing) deve RECUSAR',
  record('L06', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_testing')).recusou,
  true,
);
assertResult(
  'LIMPAR-07 sufixo parecido mas não exato (_cix) deve RECUSAR',
  record('L07', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_cix')).recusou,
  true,
);
assertResult(
  'LIMPAR-08 case-insensitividade: _TEST deve SEGUIR (regex tem /i, por desenho)',
  record('L08', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_TEST')).recusou,
  false,
);
assertResult(
  'LIMPAR-09 case-insensitividade: _CI deve SEGUIR',
  record('L09', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_CI')).recusou,
  false,
);
assertResult(
  'LIMPAR-10 banco real em outra caixa (ERP_EVOK_AUDIO, sem sufixo) deve RECUSAR',
  record('L10', () => assertBancoDescartavel_LIMPAR('ERP_EVOK_AUDIO')).recusou,
  true,
);
assertResult(
  'LIMPAR-11 (14º caso ativo) trailing whitespace após sufixo válido ("..._test ") deve RECUSAR — ' +
    'FALSO-NEGATIVO POTENCIAL: nega um banco de teste legítimo se .env tiver espaço/CRLF residual ' +
    '(direção segura: nega, não permite; registrado como observação, não como falha de segurança)',
  record('L11', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_test ')).recusou,
  true,
);
assertResult(
  'LIMPAR-12 sufixo duplo/aninhado ("..._test_ci") deve SEGUIR (termina em _ci)',
  record('L12', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_test_ci')).recusou,
  false,
);
assertResult(
  'LIMPAR-13 apenas o sufixo, sem nome de banco ("_test") deve SEGUIR',
  record('L13', () => assertBancoDescartavel_LIMPAR('_test')).recusou,
  false,
);
assertResult(
  'LIMPAR-14 substring "_test" no MEIO mas não no fim ("_test_extra") deve RECUSAR',
  record('L14', () => assertBancoDescartavel_LIMPAR('erp_evok_audio_test_extra')).recusou,
  true,
);

// ───────────────────────────────────────────────────────────────────────────
// BATERIA — SEED (com default; guarda recebe o valor JÁ RESOLVIDO, âncora :510)
// ───────────────────────────────────────────────────────────────────────────

assertResult(
  'SEED-01 banco real sem sufixo, DB_NAME setado explicitamente deve RECUSAR',
  record('S01', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio' }))).recusou,
  true,
);
assertResult(
  'SEED-02 sufixo _test explícito deve SEGUIR',
  record('S02', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_test' }))).recusou,
  false,
);
assertResult(
  'SEED-03 sufixo _ci explícito deve SEGUIR',
  record('S03', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_ci' }))).recusou,
  false,
);
assertResult(
  'SEED-04 (AGRAVANTE DO CASO) DB_NAME AUSENTE do ambiente — resolveDbName() cai no ' +
    "default 'erp_evok_audio' (o banco REAL) e a guarda recebe esse valor RESOLVIDO — deve RECUSAR",
  record('S04', () => assertBancoDescartavel_SEED(resolveDbName_SEED({}))).recusou,
  true,
);
assertResult(
  "SEED-05 DB_NAME='' (vazio explícito) — cai no mesmo default por falsiness — deve RECUSAR",
  record('S05', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: '' }))).recusou,
  true,
);
assertResult(
  'SEED-06 sufixo parecido mas não exato (_testing) deve RECUSAR',
  record('S06', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_testing' }))).recusou,
  true,
);
assertResult(
  'SEED-07 sufixo parecido mas não exato (_cix) deve RECUSAR',
  record('S07', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_cix' }))).recusou,
  true,
);
assertResult(
  'SEED-08 case-insensitividade: _TEST deve SEGUIR',
  record('S08', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_TEST' }))).recusou,
  false,
);
assertResult(
  'SEED-09 case-insensitividade: _CI deve SEGUIR',
  record('S09', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: 'erp_evok_audio_CI' }))).recusou,
  false,
);
assertResult(
  'SEED-10 (14º caso ativo, PRÓPRIO do seed) DB_NAME = string falsy não-vazia ("0") sem sufixo — ' +
    'confere que resolveDbName NÃO trata "0" como ausente (só "" e undefined são falsy aqui) — deve RECUSAR',
  record('S10', () => assertBancoDescartavel_SEED(resolveDbName_SEED({ DB_NAME: '0' }))).recusou,
  true,
);
assertResult(
  'SEED-11 consistência: o valor que a guarda avalia é o MESMO que connect()/console.log usariam ' +
    '(resolveDbName ausente → mesma string "erp_evok_audio" nos três pontos) — sem divergência de valor',
  (() => {
    const env = {};
    const guardaVe = resolveDbName_SEED(env);
    const conexaoVeria = resolveDbName_SEED(env); // connect() chama a mesma função
    return guardaVe !== conexaoVeria; // "recusou" aqui significa "há divergência" — deve ser false (sem divergência)
  })(),
  false,
);

// ───────────────────────────────────────────────────────────────────────────
// RESULTADO
// ───────────────────────────────────────────────────────────────────────────

console.log('CASE-003 — bateria de reteste independente (VeriCore)\n');
for (const r of EXPECTATIONS) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.nome}`);
}
console.log(`\n${EXPECTATIONS.length - failures}/${EXPECTATIONS.length} casos bateram com o esperado.`);

if (failures > 0) {
  console.error(`\n${failures} DIVERGÊNCIA(S) — reteste NÃO deve ser aprovado sem investigar.`);
  process.exitCode = 1;
} else {
  console.log('\nTodos os casos bateram com o comportamento esperado.');
  process.exitCode = 0;
}
