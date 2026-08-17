#!/usr/bin/env node
/**
 * BATERIA DE VERIFICAÇÃO DO HOOK `org-isolation.js` — evidência de `CE-05` e `CE-01`
 * da classe de risco `RC-PROC-01`.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * --------------------------
 * A `RC-PROC-01 §9.4` declarava `CE-05` como SATISFEITO citando "23/23 casos",
 * mas a bateria correspondente **não estava versionada**. O reteste de
 * `AUD-PROC-CUSTODIA-01` apontou a citação órfã: pela regra que a própria classe
 * fixa em §5 — "só é controle o que é versionado e reauditável" — uma evidência
 * que só existe no relato de um agente não sustenta critério de encerramento.
 *
 * Este arquivo é a correção: a bateria passa a viver ao lado do que ela testa,
 * executável por qualquer pessoa, a qualquer momento, com
 *
 *     node .claude/hooks/org-isolation.test.cjs
 *
 * Exit 0 = todos os casos bateram. Exit 1 = houve divergência.
 *
 * MÉTODO
 * ------
 * Cada caso alimenta um payload JSON no stdin do hook, exatamente como o
 * PreToolUse faz em produção (`spawnSync` com `cwd` na raiz do repositório), e
 * compara a `decision` devolvida com a esperada. Não há mock: o hook real é
 * executado.
 *
 * NOTA SOBRE O NOME DO BANCO DE PRODUÇÃO
 * --------------------------------------
 * Os casos de banco montam o identificador em duas metades concatenadas em
 * runtime. Não é obscurecimento: é necessidade. O próprio hook bloqueia
 * qualquer comando `Bash` cujo texto contenha o nome do banco de produção, e o
 * `node` que executa esta bateria passa por ele. Escrever o literal aqui faria
 * o teste bloquear a si mesmo. O efeito colateral — a guarda ser evadível por
 * concatenação — está registrado e **aceito por escrito** pelo dono em
 * `APR-2026-026` (`CE-02`), com o fundamento de que ela cobre acidente de
 * configuração, não evasão deliberada.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const HOOK = path.join(REPO, '.claude', 'hooks', 'org-isolation.js');

// Montado em runtime — ver NOTA acima.
const PROD_DB = 'erp_evok' + '_audio';
const TEST_DB = PROD_DB + '_test';
const CI_DB = PROD_DB + '_ci';

const FIND_DOCS = 'docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md';

function chamarHook(payload) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    cwd: REPO,
    encoding: 'utf8',
  });
  if (r.error) return { decision: 'ERRO_SPAWN', reason: String(r.error) };
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { decision: 'SAIDA_ILEGIVEL', reason: r.stdout + r.stderr };
  }
}

/** @type {{id:string, desc:string, esperado:'approve'|'block', payload:object}[]} */
const CASOS = [
  // ── CE-05: artefato de finding em docs/ é protegido contra escrita VeriCore ──
  {
    id: 'C01',
    desc: 'vericore-finding-validator Write em FIND-ERP-002.md (vetor do incidente 1)',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-finding-validator',
      agent_id: 'a1',
      tool_input: { file_path: FIND_DOCS, content: 'teste' },
    },
  },
  {
    id: 'C02',
    desc: 'mesmo alvo por caminho absoluto',
    esperado: 'block',
    payload: {
      tool_name: 'Edit',
      agent_type: 'vericore-finding-validator',
      agent_id: 'a1',
      tool_input: { file_path: path.join(REPO, FIND_DOCS.replace(/\//g, path.sep)), old_string: 'a', new_string: 'b' },
    },
  },
  {
    id: 'C03',
    desc: 'mesmo alvo por traversal (../)',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-finding-validator',
      agent_id: 'a1',
      tool_input: { file_path: 'docs/coretriad/projects/ERP-LEGACY-001/discovery/../discovery/FIND-ERP-002.md', content: 'x' },
    },
  },
  {
    id: 'C04',
    desc: 'a exceção do evidence-controller NAO se estende a docs/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-audit-evidence-controller',
      agent_id: 'a2',
      tool_input: { file_path: 'docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md', content: 'x' },
    },
  },
  {
    id: 'C05',
    desc: 'prefixo AUD- em qualquer profundidade de docs/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-appsec-auditor',
      agent_id: 'a3',
      tool_input: { file_path: 'docs/seguranca/AUD-XYZ-01.md', content: 'x' },
    },
  },
  // ── CE-05: escopo estreito — trabalho legítimo da VeriCore NAO é bloqueado ──
  {
    id: 'C06',
    desc: 'matriz de rastreabilidade no MESMO diretório do finding',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-traceability-auditor',
      agent_id: 'a4',
      tool_input: { file_path: 'docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_TRACEABILITY_MATRIX.md', content: 'x' },
    },
  },
  {
    id: 'C07',
    desc: 'relatório em docs/coretriad/planning/',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-audit-reporting-agent',
      agent_id: 'a5',
      tool_input: { file_path: 'docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md', content: 'x' },
    },
  },
  {
    id: 'C08',
    desc: 'candidatos de regra de negócio (discovery legítimo)',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-business-rule-auditor',
      agent_id: 'a6',
      tool_input: { file_path: 'docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_qualidade-estoque.md', content: 'x' },
    },
  },
  {
    id: 'C09',
    desc: 'LEITURA de finding continua livre',
    esperado: 'approve',
    payload: {
      tool_name: 'Read',
      agent_type: 'vericore-finding-validator',
      agent_id: 'a1',
      tool_input: { file_path: FIND_DOCS },
    },
  },
  {
    id: 'C10',
    desc: 'evidence-controller em audit/ (nao regrediu)',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-audit-evidence-controller',
      agent_id: 'a2',
      tool_input: { file_path: 'audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md', content: 'x' },
    },
  },
  {
    id: 'C11',
    desc: 'regra antiga preservada: vericore em server/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'vericore-appsec-auditor',
      agent_id: 'a3',
      tool_input: { file_path: 'server/src/index.ts', content: 'x' },
    },
  },
  // ── CE-01: guarda de banco de produção (nao regrediu) ──
  {
    id: 'C12',
    desc: 'Bash contra o BANCO DE PRODUCAO',
    esperado: 'block',
    payload: {
      tool_name: 'Bash',
      agent_type: 'opuscore-devops-engineer',
      agent_id: 'a7',
      tool_input: { command: 'docker exec evok-postgres psql -U evok_admin -d ' + PROD_DB + ' -c "SELECT 1"' },
    },
  },
  {
    id: 'C13',
    desc: 'Bash contra banco _test (discriminacao)',
    esperado: 'approve',
    payload: {
      tool_name: 'Bash',
      agent_type: 'opuscore-devops-engineer',
      agent_id: 'a7',
      tool_input: { command: 'docker exec evok-postgres psql -U evok_admin -d ' + TEST_DB + ' -c "SELECT 1"' },
    },
  },
  {
    id: 'C14',
    desc: 'Bash contra banco _ci (discriminacao)',
    esperado: 'approve',
    payload: {
      tool_name: 'Bash',
      agent_type: 'vericore-audit-verification-runner',
      agent_id: 'a8',
      tool_input: { command: 'psql -d ' + CI_DB + ' -c "SELECT 1"' },
    },
  },
  // ── Fronteiras das outras organizações (nao regrediram) ──
  {
    id: 'C15',
    desc: 'opuscore em audit/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'opuscore-backend-engineer',
      agent_id: 'a9',
      tool_input: { file_path: 'audit/runs/x.md', content: 'x' },
    },
  },
  {
    id: 'C16',
    desc: 'opuscore em server/ (namespace proprio)',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'opuscore-backend-engineer',
      agent_id: 'a9',
      tool_input: { file_path: 'server/src/novo.ts', content: 'x' },
    },
  },
  {
    id: 'C17',
    desc: 'opuscore em finding de docs/ — FORA do escopo da regra vericore (residuo declarado)',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'opuscore-documentation-agent',
      agent_id: 'a10',
      tool_input: { file_path: FIND_DOCS, content: 'x' },
    },
  },
  {
    id: 'C18',
    desc: 'sanacore em coretriad/states/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'sanacore-remediation-engineer',
      agent_id: 'a11',
      tool_input: { file_path: 'coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md', content: 'x' },
    },
  },
  {
    id: 'C19',
    desc: 'sanacore em server/ no worktree principal',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'sanacore-remediation-engineer',
      agent_id: 'a11',
      tool_input: { file_path: 'server/src/fix.ts', content: 'x' },
    },
  },
  {
    id: 'C20',
    desc: 'coretriad-director em coretriad/ (namespace proprio)',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'coretriad-director',
      agent_id: 'a12',
      tool_input: { file_path: 'coretriad/governance/APPROVALS.md', content: 'x' },
    },
  },
  {
    id: 'C21',
    desc: 'coretriad-director em src/',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      agent_type: 'coretriad-director',
      agent_id: 'a12',
      tool_input: { file_path: 'src/app.ts', content: 'x' },
    },
  },
  {
    id: 'C22',
    desc: 'sessao principal em finding de docs/ (residuo declarado)',
    esperado: 'approve',
    payload: { tool_name: 'Write', tool_input: { file_path: FIND_DOCS, content: 'x' } },
  },
  {
    id: 'C23',
    desc: 'subagente sem identificacao (fail-closed)',
    esperado: 'block',
    payload: { tool_name: 'Write', agent_id: 'a99', tool_input: { file_path: FIND_DOCS, content: 'x' } },
  },

  // ───────────────────────────────────────────────────────────────────────
  // C24-C29 — GAP DE SIMETRIA da sessao principal (incidente RC-PROC-02).
  //
  // Antes de 2026-08-17 a sessao principal passava sem NENHUMA restricao: as
  // ORG_RULES so casam por identidade de agente, e o orquestrador nao tem
  // identidade. Foi por essa porta que saiu o commit 2a10049, com o
  // orquestrador implementando remediacao dentro da worktree sana/.
  //
  // C26-C28 sao tao importantes quanto C24-C25: uma guarda que bloqueia demais
  // quebra o canal legitimo de persistencia de evidencia e vira a proxima
  // desculpa para desliga-la.
  {
    id: 'C24',
    desc: 'sessao principal escrevendo em remediation/ (faixa da SanaCore)',
    esperado: 'block',
    payload: { tool_name: 'Write', tool_input: { file_path: 'remediation/cases/X/TRIAGE.md', content: 'x' } },
  },
  {
    id: 'C25',
    desc: 'sessao principal escrevendo DENTRO de worktree sana (o caso 2a10049)',
    esperado: 'block',
    payload: {
      tool_name: 'Write',
      tool_input: { file_path: 'c:/Sistema EvokAudio/ERP-Evok-sana-CASE-005/server/x.ts', content: 'x' },
    },
  },
  {
    id: 'C26',
    desc: 'sessao principal persistindo evidencia em audit/ (canal legitimo) — NAO pode bloquear',
    esperado: 'approve',
    payload: { tool_name: 'Write', tool_input: { file_path: 'audit/runs/R/30-retest/E.md', content: 'x' } },
  },
  {
    id: 'C27',
    desc: 'sessao principal em coretriad/governance (registro de decisao) — NAO pode bloquear',
    esperado: 'approve',
    payload: { tool_name: 'Write', tool_input: { file_path: 'coretriad/governance/APPROVALS.md', content: 'x' } },
  },
  {
    id: 'C28',
    desc: 'sessao principal LENDO remediation/ — leitura nunca foi o problema',
    esperado: 'approve',
    payload: { tool_name: 'Read', tool_input: { file_path: 'remediation/cases/X/TRIAGE.md' } },
  },
  {
    id: 'C29',
    desc: 'sanacore-engineer escrevendo na worktree sana — a faixa dele, segue liberada',
    esperado: 'approve',
    payload: {
      tool_name: 'Write',
      agent_type: 'sanacore-remediation-engineer',
      agent_id: 'a30',
      tool_input: { file_path: 'c:/Sistema EvokAudio/ERP-Evok-sana-CASE-005/server/x.ts', content: 'x' },
    },
  },
];

let ok = 0;
let falhas = 0;

console.log('BATERIA DO HOOK org-isolation.js — CE-01 e CE-05 (RC-PROC-01)\n');

for (const caso of CASOS) {
  const r = chamarHook(caso.payload);
  const passou = r.decision === caso.esperado;
  if (passou) ok++; else falhas++;
  console.log(
    (passou ? 'PASS ' : 'FALHA') + '  [' + caso.id + '] ' + caso.desc,
  );
  console.log('        esperado=' + caso.esperado + '  obtido=' + r.decision);
  if (!passou) console.log('        reason=' + r.reason);
}

console.log('\n' + ok + '/' + CASOS.length + ' casos corretos, ' + falhas + ' falha(s).');
process.exit(falhas === 0 ? 0 : 1);
