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

const ORG_RULES = [
  {
    org: 'vericore',
    match: (a) => a.includes('vericore'),
    deniedPaths: [/^(product|src|server|client|mobile|tests|database|infrastructure|requirements|architecture)\//],
    allowedException: (agent, p) =>
      agent.includes('evidence-controller') && /^audit\//.test(p),
    reason: 'VeriCore é read-only sobre o objeto auditado. Evidências só via audit-evidence-controller em audit/.',
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

// Inspeciona recursivamente qualquer string do tool_input (file_path, path,
// pattern, command, arrays de comandos...), não apenas os campos de caminho.
function touchesSealed(value, depth = 0) {
  if (depth > 4) return false;
  if (typeof value === 'string') return SEALED.test(value.replace(/\\/g, '/'));
  if (Array.isArray(value)) return value.some((v) => touchesSealed(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.values(value).some((v) => touchesSealed(v, depth + 1));
  }
  return false;
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
