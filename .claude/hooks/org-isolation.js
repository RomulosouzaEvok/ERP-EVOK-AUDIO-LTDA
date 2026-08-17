#!/usr/bin/env node
/**
 * CORETRIAD — Hook PreToolUse de isolamento organizacional.
 *
 * Node puro (sem jq nem dependências externas — jq não existe em todos os
 * ambientes e um hook que falha silenciosamente vira "hook fantasma").
 *
 * Lê o payload JSON do hook via stdin, identifica a organização do agente
 * e nega Write/Edit fora do namespace autorizado.
 *
 * Saída:
 *   exit 0 + JSON {"decision":"approve"|"block", "reason": "..."}
 *   Em caso de erro de parsing: BLOQUEIA por segurança (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// No worktree principal, `.git` é um DIRETÓRIO; em worktrees git, é um ARQUIVO.
// É assim que distinguimos "SanaCore no repo principal" de "SanaCore em sana/".
function isMainWorktree(cwd) {
  try {
    return fs.statSync(path.join(cwd, '.git')).isDirectory();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Artefato de FINDING vivendo fora de `audit/` (vetor do incidente 1).
//
// Origem: RC-PROC-01 §2.2 incidente 1 — um `vericore-finding-validator`
// sobrescreveu `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md`
// com texto de teste AO SONDAR se tinha permissão de escrita, e restaurou por
// conduta própria. A regra `vericore` negava
// product|src|server|client|mobile|tests|database|infrastructure|requirements|architecture
// e **não** negava `docs/` — a escrita foi tecnicamente permitida.
//
// ESCOPO DELIBERADAMENTE ESTREITO: o discriminador é o **nome do artefato**
// (prefixo de ID de finding/observação, convenção da Regra 17 do CLAUDE.md),
// NÃO o diretório. Negar `docs/` inteiro — ou mesmo `discovery/` inteiro —
// quebraria trabalho legítimo da VeriCore, que produz no MESMO diretório
// `LEGACY_TRACEABILITY_MATRIX*.md`, `BUSINESS_RULE_CANDIDATES*.md`,
// `USE_CASES_RECOVERED*.md`, `*_INVENTORY.md`, `REQUIREMENTS_BASELINE.md` etc.
// (skill `coretriad-legacy-discovery`, passos 21-27), além de relatórios em
// `docs/coretriad/planning/`. Esses ficam FORA do bloqueio, por decisão de
// escopo registrada.
//
// Cobre qualquer profundidade sob `docs/`, para que um finding criado amanhã em
// outro subdiretório caia na mesma regra sem precisar editar o hook.
const DOCS_FINDING_ARTIFACT = /^docs\/(?:[^/]+\/)*(?:FIND|FINDING|AUD|OBS)[-_][A-Za-z0-9][A-Za-z0-9._-]*$/;

const ORG_RULES = [
  {
    org: 'vericore',
    match: (a) => a.includes('vericore'),
    deniedPaths: [
      /^(product|src|server|client|mobile|tests|database|infrastructure|requirements|architecture)\//,
      DOCS_FINDING_ARTIFACT,
    ],
    // A exceção do evidence-controller permanece restrita a `audit/`: ela NÃO
    // se estende ao artefato de finding em `docs/`. Fora de `audit/` não existe
    // canal de escrita de finding para nenhum agente VeriCore — a persistência
    // é manual, pelo director ou pela sessão principal, exatamente como no
    // item 2 do inventário de RC-PROC-01, catalogado como sucesso de mecanismo.
    allowedException: (agent, p) =>
      agent.includes('evidence-controller') && /^audit\//.test(p),
    reason: 'VeriCore é read-only sobre o objeto auditado, e não reescreve artefato de finding fora de audit/. Evidências só via audit-evidence-controller em audit/.',
  },
  {
    org: 'opuscore',
    match: (a) => a.includes('opuscore'),
    deniedPaths: [/^audit\//, /^remediation\//, /^coretriad\/(states|locks)\//],
    allowedException: () => false,
    reason: 'OpusCore não pode alterar auditoria, remediação ou estado do control plane.',
  },
  {
    org: 'sanacore',
    match: (a) => a.includes('sanacore') || a.includes('remediation'),
    deniedPaths: [/^audit\/.*finding/i, /^audit\/runs\//, /^coretriad\/(states|locks)\//],
    // Código de produto só em worktree `sana/<PROJECT>/<FINDING>` — no worktree
    // principal, escrita de código pela SanaCore é bloqueada.
    deniedInMainWorktree: [/^(src|server|client|product|tests|mobile)\//],
    allowedException: () => false,
    reason: 'SanaCore não pode alterar findings originais, evidência de auditoria nem estado do control plane.',
    mainWorktreeReason: 'SanaCore só escreve código em worktree sana/<PROJECT>/<FINDING> — nunca no worktree principal.',
  },
  {
    org: 'coretriad',
    match: (a) => a.includes('coretriad') || a.includes('director'),
    deniedPaths: [/^src\//, /^server\//, /^client\//, /^mobile\//, /^product\//, /^tests\//, /^audit\/runs\//, /^remediation\/cases\//],
    allowedException: (_a, p) => /^coretriad\//.test(p) || /^docs\//.test(p),
    reason: 'CoreTriad Director orquestra; não implementa, não audita e não corrige.',
  },
];

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Worktree de remediação da SanaCore, detectada por CONVENÇÃO DE NOME.
//
// Limitação declarada: um hook não pode pagar o custo de resolver `.git` de
// worktree e ler a branch a cada chamada, então o discriminador é o nome do
// diretório. As worktrees deste repositório seguem `ERP-Evok-sana-<CASE>` e a
// convenção de branch é `sana/<PROJECT>/<CASE>` (Regra 11). Uma worktree
// batizada fora da convenção NÃO é coberta — por isso a convenção de nome é
// parte do mecanismo, não estética.
const SANA_WORKTREE_PATH = /(^|\/)[^/]*-sana-|(^|\/)sana\//i;

// Artefatos selados: nenhum subagente lê, sob nenhuma ferramenta. Usado pelos
// gabaritos de simulado — um simulado cujo gabarito é legível pelo auditor não
// mede capacidade de detecção nenhuma. Só a sessão principal (sem contexto de
// subagente) tem acesso.
//
// O selo cobre o DIRETÓRIO inteiro, não só o nome do arquivo: um Grep apontado
// para `coretriad/locks/` com padrão genérico, ou um `cat coretriad/locks/*.md`,
// devolveriam o conteúdo sem nunca citar "answer-key". Vetores identificados
// pelo TEST-SEAL-001 (vericore-qa-auditor), que os reportou sem explorá-los.
const SEALED = /coretriad\/locks|answer[-_]key/i;

// Campos que carregam CONTEÚDO, não alvo de acesso. Citar o caminho selado
// dentro de um documento é legítimo (um pacote de evidência pode precisar
// referenciá-lo); o que o selo impede é ler/listar o artefato.
const CONTENT_FIELDS = new Set(['content', 'new_string', 'old_string', 'prompt', 'description']);

// Inspeciona recursivamente as strings de acesso do tool_input (file_path,
// path, pattern, command, arrays de comandos...), ignorando os campos de
// conteúdo acima.
function touchesSealed(value, depth = 0) {
  if (depth > 4) return false;
  if (typeof value === 'string') return SEALED.test(value.replace(/\\/g, '/'));
  if (Array.isArray(value)) return value.some((v) => touchesSealed(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([k, v]) => !CONTENT_FIELDS.has(k) && touchesSealed(v, depth + 1)
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guarda de acesso ao BANCO DE PRODUÇÃO (ferramenta Bash).
//
// Origem: AUD-PROC-CUSTODIA-01 — um agente executou `docker exec evok-postgres
// psql -U evok_admin -d erp_evok_audio -c "SELECT ..."` contra o banco real e
// NENHUM controle técnico o impediu. Regra 23 do CLAUDE.md exige hook, não só
// prompt.
//
// DISCRIMINADOR = NOME DO BANCO, NÃO O CONTAINER. O container `evok-postgres`
// hospeda os dois bancos (`erp_evok_audio` e `erp_evok_audio_test`) — ver
// docker-compose.yml. Bloquear por container inviabilizaria toda a verificação
// dinâmica legítima da auditoria.
//
// O token é capturado com o sufixo colado (`[A-Za-z0-9_]*`) justamente porque
// `erp_evok_audio_test` CONTÉM `erp_evok_audio`: um regex ingênuo bloquearia o
// uso legítimo. Só passa quando o token termina em `_test` ou `_ci`.
const PROD_DB_TOKEN_SOURCE = 'erp_evok_audio[A-Za-z0-9_]*';
const SAFE_DB_SUFFIX = /(_test|_ci)$/i;

// Escopo: TODOS os chamadores — subagente e sessão principal. O incidente foi
// de agente, mas a barreira pedida ("tecnicamente impossível") não admite
// exceção por quem chama; o hook é o único ponto onde isso é imponível.
const SHELL_TOOLS = new Set(['bash', 'shell', 'run_command']);

// Mesmo padrão recursivo do selo (touchesSealed): varre as strings de ACESSO do
// tool_input (command, arrays de comandos, campos aninhados) e ignora
// CONTENT_FIELDS — citar o nome do banco dentro de um texto não é acesso.
function findProdDbRef(value, depth = 0) {
  if (depth > 4) return null;
  if (typeof value === 'string') {
    const tokens = value.match(new RegExp(PROD_DB_TOKEN_SOURCE, 'gi')) || [];
    for (const t of tokens) {
      if (!SAFE_DB_SUFFIX.test(t)) return t;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = findProdDbRef(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (CONTENT_FIELDS.has(k)) continue;
      const hit = findProdDbRef(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  return null;
}

function respond(decision, reason) {
  process.stdout.write(JSON.stringify({ decision, reason }));
  process.exit(0);
}

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // fail-closed: payload ilegível nunca deve virar permissão implícita
    return respond('block', 'org-isolation: payload de hook ilegível (fail-closed).');
  }

  const tool = payload.tool_name || payload.tool || '';

  const agent = String(
    payload.agent_type || payload.agent_name || payload.subagent_type || ''
  ).toLowerCase();

  const isSubagent =
    'agent_type' in payload ||
    'agent_name' in payload ||
    'subagent_type' in payload ||
    'agent_id' in payload;

  // Gabarito selado: bloqueio vale para QUALQUER ferramenta (Read, Grep, Glob,
  // Bash, Write...) vinda de subagente, não só escrita.
  if (isSubagent && touchesSealed(payload.tool_input || payload.input || {})) {
    return respond('block', 'org-isolation: artefato SELADO (gabarito de simulado) — inacessível a subagentes.');
  }

  // Banco de PRODUÇÃO via shell: bloqueio para QUALQUER chamador (subagente ou
  // sessão principal). Precede o approve genérico de tools não-escrita, que
  // hoje libera todo Bash.
  if (SHELL_TOOLS.has(String(tool).toLowerCase())) {
    const hit = findProdDbRef(payload.tool_input || payload.input || {});
    if (hit) {
      return respond(
        'block',
        `org-isolation: comando referencia o BANCO DE PRODUÇÃO ("${hit}") — acesso proibido a qualquer agente (AUD-PROC-CUSTODIA-01, Regra 23). ` +
          'Use um banco descartável com sufixo _test ou _ci.'
      );
    }
  }

  if (!WRITE_TOOLS.has(tool)) return respond('approve', 'tool não é de escrita');

  const input = payload.tool_input || payload.input || {};
  const rawPath = String(input.file_path || input.path || input.notebook_path || '');

  // Canonicalizar contra a raiz do repositório principal (cwd do processo do
  // hook). path.resolve neutraliza traversal (../) e absolutos fora do repo.
  const cwd = String(payload.cwd || process.cwd());
  const projectRoot = process.cwd();
  let filePath = '';
  let insideRepo = false;
  if (rawPath) {
    const resolved = path.resolve(cwd, rawPath);
    const rel = path.relative(projectRoot, resolved).replace(/\\/g, '/');
    insideRepo = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
    filePath = insideRepo ? rel : resolved.replace(/\\/g, '/');
  }

  if (!rawPath) return respond('approve', 'sem caminho de arquivo — nada a julgar');

  // Discriminador verificado empiricamente neste harness: o payload da sessão
  // principal não traz NENHUMA chave de agente; subagentes trazem agent_id e
  // agent_type. Qualquer sinal de contexto de subagente — inclusive só o
  // agent_id — exige identidade resolvível, senão bloqueia.
  const hasAgentContext =
    'agent_type' in payload ||
    'agent_name' in payload ||
    'subagent_type' in payload ||
    'agent_id' in payload;

  if (!agent) {
    if (hasAgentContext) {
      // fail-closed: contexto de subagente sem identidade nunca vira permissão
      return respond('block', 'org-isolation: subagente sem identificação (fail-closed).');
    }

    // ─────────────────────────────────────────────────────────────────────
    // GAP DE SIMETRIA — fechado em 2026-08-17 (incidente RC-PROC-02).
    //
    // Até aqui a sessão principal (orquestrador) passava SEM NENHUMA
    // restrição. A regra `coretriad` da linha ~93 já negava
    // `remediation/cases/` ao `coretriad-director`, mas o director é
    // subagente: o orquestrador não casa com nenhuma regra de ORG_RULES,
    // porque não tem identidade de agente.
    //
    // Foi por essa porta que saiu o commit `2a10049`: a sessão principal
    // editou `.env*.example` e escreveu um guard test DENTRO da worktree
    // `sana/ERP-LEGACY-001/CASE-005`, implementando remediação. Violação das
    // Regras 5 (quem orquestra não corrige) e 11 (a faixa de remediação é da
    // SanaCore). O reteste independente mediu que esse trabalho saiu com
    // poder discriminante quase nulo — a faixa errada produziu o pior
    // artefato do caso.
    //
    // O guard de git (`.githooks/`) NÃO pega este caso: ele julga por branch,
    // e `2a10049` foi feito NA branch `sana/*`, que é a faixa correta para o
    // caminho. O que estava errado era QUEM escrevia — informação que o git
    // não tem e este hook tem.
    //
    // Mesma lógica de simetria já aplicada ao Bash em AUD-PROC-CUSTODIA-01:
    // uma direção sem guarda é gap, não economia.
    if (WRITE_TOOLS.has(tool)) {
      if (insideRepo && /^remediation\//.test(filePath)) {
        return respond(
          'block',
          'org-isolation: a sessão principal não escreve em `remediation/` — essa é a faixa da SanaCore ' +
            '(Regras 5 e 11). Despache `sanacore-remediation-triage`/`-engineer`/`-evidence`. ' +
            'Se o artefato é evidência de VERIFICAÇÃO, o lugar dele é `audit/runs/<RUN>/30-retest/`, não `remediation/`.'
        );
      }
      if (SANA_WORKTREE_PATH.test(filePath)) {
        return respond(
          'block',
          'org-isolation: a sessão principal não escreve dentro de worktree `sana/` — implementar remediação é ' +
            'da SanaCore (Regras 5 e 11). Despache o `sanacore-remediation-engineer`. Precedente: incidente RC-PROC-02, commit 2a10049.'
        );
      }
    }

    return respond('approve', 'sessão principal (sem contexto de subagente)');
  }

  if (!insideRepo) {
    return respond('approve', 'alvo fora do repositório principal (worktree/scratchpad)');
  }

  for (const rule of ORG_RULES) {
    if (!rule.match(agent)) continue;
    for (const denied of rule.deniedPaths) {
      if (denied.test(filePath)) {
        if (rule.allowedException(agent, filePath)) {
          return respond('approve', `exceção autorizada para ${agent}`);
        }
        return respond('block', `[${rule.org.toUpperCase()}] ${rule.reason} (bloqueado: ${filePath})`);
      }
    }
    if (rule.deniedInMainWorktree && isMainWorktree(cwd)) {
      for (const denied of rule.deniedInMainWorktree) {
        if (denied.test(filePath)) {
          return respond('block', `[${rule.org.toUpperCase()}] ${rule.mainWorktreeReason} (bloqueado: ${filePath})`);
        }
      }
    }
    return respond('approve', `dentro do namespace de ${rule.org}`);
  }

  return respond('approve', 'agente sem organização mapeada — sem restrição adicional');
});
