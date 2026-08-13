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
    deniedPaths: [/^(product|src|tests|database|infrastructure|requirements|architecture)\//],
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
    deniedPaths: [/^src\//, /^product\//, /^tests\//, /^audit\/runs\//, /^remediation\/cases\//],
    allowedException: (_a, p) => /^coretriad\//.test(p) || /^docs\//.test(p),
    reason: 'CoreTriad Director orquestra; não implementa, não audita e não corrige.',
  },
];

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

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
  if (!WRITE_TOOLS.has(tool)) return respond('approve', 'tool não é de escrita');

  const agent = String(
    payload.agent_type || payload.agent_name || payload.subagent_type || ''
  ).toLowerCase();

  const input = payload.tool_input || payload.input || {};
  let filePath = String(input.file_path || input.path || input.notebook_path || '');

  // normalizar para caminho relativo à raiz do repo
  const cwd = String(payload.cwd || process.cwd());
  if (filePath.startsWith(cwd)) filePath = filePath.slice(cwd.length);
  filePath = filePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');

  if (!filePath) return respond('approve', 'sem caminho de arquivo — nada a julgar');

  const hasAgentField =
    'agent_type' in payload || 'agent_name' in payload || 'subagent_type' in payload;

  if (!agent) {
    if (hasAgentField) {
      // fail-closed: contexto de subagente sem identidade nunca vira permissão
      return respond('block', 'org-isolation: subagente sem identificação (fail-closed).');
    }
    return respond('approve', 'sessão principal (sem contexto de subagente)');
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
