#!/usr/bin/env node
/**
 * verify-git-references.cjs
 *
 * CONTROLE DETECTIVO -- classe de risco RC-PROC-01, incidente 3
 * ("numero de commit/tag citado a partir de contexto injetado, sem releitura
 * da fonte").
 *
 * O QUE ESTE SCRIPT FAZ
 *   Varre os artefatos versionados de governanca/auditoria procurando tokens
 *   que pareçam referencia git (hash de commit abreviado ou completo, e nome
 *   de tag) e verifica se a referencia EXISTE de fato no repositorio.
 *
 * O QUE ESTE SCRIPT NAO FAZ (declarado, nao inferido)
 *   - NAO corrige nada. Relata.
 *   - NAO distingue "hash lido agora" de "hash lembrado". Essa distincao nao
 *     e observavel. Um hash desatualizado porem REAL passa neste verificador.
 *     No incidente 3 original, `65bd66d` era um commit real (apenas antigo):
 *     este script NAO o teria detectado. Ver secao LIMITES no relatorio.
 *   - NAO emite juizo de auditoria, severidade, nem fecha criterio algum.
 *
 * Node puro, sem dependencia externa -- mesmo principio de portabilidade do
 * hook do projeto (.claude/hooks/org-isolation.js) e de scan-tracked-secrets.cjs.
 *
 * Uso:  node server/scripts/verify-git-references.cjs [--json]
 * Saida: exit 0 = nenhuma referencia inexistente; exit 1 = ha referencias
 *        inexistentes ou ambiguas; exit 2 = erro de execucao do proprio script.
 */

'use strict';

const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
/**
 * `--file <caminho>` varre apenas os arquivos indicados, em vez do escopo
 * versionado padrao. Serve para (a) checagem pontual de um documento antes do
 * commit e (b) exercitar o proprio verificador com caso sintetico sem escrever
 * dentro de coretriad/, audit/ ou docs/ -- diretorios de outra autoridade.
 */
const explicitFiles = argv.reduce((acc, a, i) => {
  if (a === '--file' && argv[i + 1]) acc.push(argv[i + 1].replace(/\\/g, '/'));
  return acc;
}, []);

/** Diretorios varridos. Apenas artefato versionado (Regra 7). */
const SCAN_PREFIXES = ['coretriad/', 'audit/', 'docs/coretriad/'];

/**
 * Palavras que colocam a linha em "contexto de commit/tag". Sem pelo menos
 * uma delas na linha, nenhum token hex e considerado candidato.
 * Politica deliberada: ERRAR PARA MENOS. Falso positivo mata verificador.
 */
const COMMIT_CONTEXT = new RegExp(
  [
    'AUDIT_COMMIT',
    'COMMIT_HASH',
    'REMEDIATION_COMMIT',
    'BASELINE_TAG',
    'PARENT_COMMIT',
    // Cobre tambem as conjugacoes em portugues: commitado/commitada/commitados/
    // commitadas/commitou/commitaram/commitando/commitar. O padrao anterior era
    // `\bcommits?\b`, que exige fronteira de palavra logo apos "commit" e por isso
    // NAO casava nenhuma dessas formas — falso negativo real, ja presente no corpus
    // (PROJECT_EVENT_LOG.md: "foi commitado antes (`de4dac1`)", hash nunca
    // verificado). Achado da validacao independente do vericore-sdet-auditor;
    // decisao do dono em 2026-08-16 foi corrigir de imediato (APR-2026-026 item 1).
    '\\bcommit(s|ad[oa]s?|ou|aram|ando|ar)?\\b',
    '\\bHEAD\\b',
    '\\btags?\\b',
    '\\bbaselines?\\b',
    'refs/heads',
    'refs/tags',
    'packed-refs',
    'git (rev-parse|show|diff|log|cat-file|checkout|merge-base|describe)',
  ].join('|'),
  'i',
);

/**
 * Contra-contexto: a linha fala de hash de CONTEUDO (blob), nao de commit.
 * `git hash-object`, checksums de arquivo e comparacoes "hash identico" usam
 * exatamente o mesmo formato hex e sao objetos que podem legitimamente NAO
 * existir no banco de objetos (ex.: hash de arquivo nao commitado).
 * Calibrado sobre 6 falsos positivos reais observados na primeira execucao
 * contra este repositorio -- ver relatorio de entrega.
 */
const NON_COMMIT_CONTEXT =
  /hash-object|\bblobs?\b|hash\s+(id[eê]ntico|igual)|checksum|sha-?(1|256|512)\b|\bmd5\b/i;

/** Tokens hex que sao ruido conhecido e nunca referencia git. */
const HEX_DENYLIST = new Set(['deadbeef', 'cafebabe', 'baadf00d', '00000000', 'abcdef0']);

/** Nomes de tag citados: `tag \`X\``, `refs/tags/X`, `BASELINE_TAG: X`. */
const TAG_PATTERNS = [
  /refs\/tags\/([A-Za-z0-9][A-Za-z0-9._\/-]*)/g,
  /\btags?\s+`([A-Za-z0-9][A-Za-z0-9._\/-]*)`/gi,
  /BASELINE_TAG:\s*`?([A-Za-z0-9][A-Za-z0-9._\/-]*)`?/g,
];

// ---------------------------------------------------------------------------
// Coleta de arquivos
// ---------------------------------------------------------------------------

function trackedMarkdown() {
  if (explicitFiles.length > 0) return explicitFiles;
  const out = execFileSync('git', ['ls-files', '-z', '--', ...SCAN_PREFIXES], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split('\0').filter((p) => p && p.toLowerCase().endsWith('.md'));
}

// ---------------------------------------------------------------------------
// Extracao de candidatos
// ---------------------------------------------------------------------------

const HEX_TOKEN = /(^|[^0-9A-Za-z_])([0-9a-f]{7,40})(?=[^0-9A-Za-z_]|$)/g;

function isPlausibleHash(token, lineBefore) {
  if (HEX_DENYLIST.has(token)) return false;
  // Epoch, data compacta, contagem: tokens puramente decimais nunca sao hash.
  if (/^[0-9]+$/.test(token)) return false;
  // Palavra em prosa que por acaso so tem [a-f]. Hash de 7 chars sem nenhum
  // digito tem probabilidade (6/16)^7 ~= 0,14%: sub-deteccao assumida.
  if (!/[0-9]/.test(token)) return false;
  // Cor CSS (#abc123) e literal hexadecimal (0xabc123).
  if (/[#]$/.test(lineBefore) || /0x$/i.test(lineBefore)) return false;
  return true;
}

function extractHashes(line) {
  if (!COMMIT_CONTEXT.test(line)) return [];
  if (NON_COMMIT_CONTEXT.test(line)) return [];
  const found = [];
  HEX_TOKEN.lastIndex = 0;
  let m;
  while ((m = HEX_TOKEN.exec(line)) !== null) {
    const token = m[2];
    const start = m.index + m[1].length;
    if (!isPlausibleHash(token, line.slice(0, start))) continue;
    found.push(token);
  }
  return found;
}

function extractTags(line) {
  const found = [];
  for (const re of TAG_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const name = m[1].replace(/[.,;:)]+$/, '');
      if (name && !/^[0-9a-f]{7,40}$/.test(name)) found.push(name);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Resolucao contra o repositorio (um unico processo git, via --batch-check)
// ---------------------------------------------------------------------------

function batchCheck(revs) {
  const unique = [...new Set(revs)];
  if (unique.length === 0) return new Map();
  const res = spawnSync('git', ['cat-file', '--batch-check'], {
    cwd: rootDir,
    input: unique.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  const lines = res.stdout.split(/\r?\n/).filter(Boolean);
  const map = new Map();
  for (let i = 0; i < unique.length && i < lines.length; i += 1) {
    const line = lines[i];
    if (/ missing$/.test(line)) map.set(unique[i], { ok: false, reason: 'missing' });
    else if (/ ambiguous$/.test(line)) map.set(unique[i], { ok: false, reason: 'ambiguous' });
    else {
      const parts = line.split(/\s+/);
      map.set(unique[i], { ok: true, sha: parts[0], type: parts[1] });
    }
  }
  for (const rev of unique) if (!map.has(rev)) map.set(rev, { ok: false, reason: 'missing' });
  return map;
}

function isShallow() {
  const res = spawnSync('git', ['rev-parse', '--is-shallow-repository'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  return String(res.stdout || '').trim() === 'true';
}

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

function main() {
  const shallow = isShallow();
  const files = trackedMarkdown();

  /** @type {{file:string,line:number,token:string,kind:string,text:string}[]} */
  const hashCites = [];
  const tagCites = [];
  /** linhas que afirmam vinculo tag -> commit */
  const bindingLines = [];

  const fs = require('fs');
  for (const rel of files) {
    const abs = path.join(rootDir, rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const hashes = extractHashes(line);
      const tags = extractTags(line);
      for (const h of hashes) {
        hashCites.push({ file: rel, line: i + 1, token: h, kind: 'commit', text: line.trim() });
      }
      for (const t of tags) {
        tagCites.push({ file: rel, line: i + 1, token: t, kind: 'tag', text: line.trim() });
      }
      if (tags.length === 1 && hashes.length > 0 && /(→|->|aponta|peeled|apontando)/i.test(line)) {
        bindingLines.push({ file: rel, line: i + 1, tag: tags[0], hashes, text: line.trim() });
      }
    }
  }

  const hashResolution = batchCheck(hashCites.map((c) => `${c.token}^{commit}`));
  const tagResolution = batchCheck(tagCites.map((c) => `refs/tags/${c.token}`));
  const tagPeel = batchCheck([
    ...new Set(bindingLines.flatMap((b) => [`refs/tags/${b.tag}`, `refs/tags/${b.tag}^{commit}`])),
  ]);

  const failures = [];
  const warnings = [];

  for (const c of hashCites) {
    const r = hashResolution.get(`${c.token}^{commit}`);
    if (!r || r.ok) continue;
    const entry = { ...c, reason: r.reason };
    if (r.reason === 'ambiguous') warnings.push({ ...entry, class: 'HASH_AMBIGUO' });
    else failures.push({ ...entry, class: 'HASH_INEXISTENTE' });
  }

  for (const c of tagCites) {
    const r = tagResolution.get(`refs/tags/${c.token}`);
    if (!r || r.ok) continue;
    failures.push({ ...c, reason: r.reason, class: 'TAG_INEXISTENTE' });
  }

  for (const b of bindingLines) {
    const obj = tagPeel.get(`refs/tags/${b.tag}`);
    const peel = tagPeel.get(`refs/tags/${b.tag}^{commit}`);
    if (!obj || !obj.ok || !peel || !peel.ok) continue; // tag inexistente ja reportada
    const accepted = [obj.sha, peel.sha];
    const matched = b.hashes.some((h) => accepted.some((sha) => sha.startsWith(h)));
    if (!matched) {
      failures.push({
        file: b.file,
        line: b.line,
        token: `${b.tag} -> ${b.hashes.join(', ')}`,
        kind: 'binding',
        text: b.text,
        reason: `tag resolve para ${peel.sha} (objeto ${obj.sha})`,
        class: 'VINCULO_TAG_COMMIT_DIVERGENTE',
      });
    }
  }

  const summary = {
    arquivosVarridos: files.length,
    citacoesDeCommit: hashCites.length,
    commitsDistintos: new Set(hashCites.map((c) => c.token)).size,
    citacoesDeTag: tagCites.length,
    tagsDistintas: new Set(tagCites.map((c) => c.token)).size,
    vinculosTagCommitVerificados: bindingLines.length,
    repositorioShallow: shallow,
    falhas: failures.length,
    avisos: warnings.length,
  };

  if (jsonMode) {
    console.log(JSON.stringify({ summary, failures, warnings }, null, 2));
  } else {
    console.log('=== verify-git-references (RC-PROC-01 / incidente 3) ===');
    console.log(
      `Escopo varrido : ${explicitFiles.length > 0 ? explicitFiles.join(', ') : SCAN_PREFIXES.join(', ')}`,
    );
    console.log(`Arquivos .md   : ${summary.arquivosVarridos}`);
    console.log(
      `Candidatos     : ${summary.citacoesDeCommit} citacoes de commit (${summary.commitsDistintos} distintos), ` +
        `${summary.citacoesDeTag} citacoes de tag (${summary.tagsDistintas} distintas)`,
    );
    console.log(`Vinculos tag->commit conferidos: ${summary.vinculosTagCommitVerificados}`);
    if (shallow) {
      console.log(
        'AVISO: repositorio SHALLOW. Commits antigos podem ser reportados como\n' +
          '       inexistentes por ausencia de historico local, nao por invencao.\n' +
          '       Em CI, use actions/checkout com fetch-depth: 0.',
      );
    }
    for (const w of warnings) {
      console.log(`\n[AVISO ${w.class}] ${w.file}:${w.line}  ${w.token}`);
      console.log(`  ${w.text.slice(0, 200)}`);
    }
    for (const f of failures) {
      console.log(`\n[FALHA ${f.class}] ${f.file}:${f.line}  ${f.token}`);
      console.log(`  motivo: ${f.reason}`);
      console.log(`  linha : ${f.text.slice(0, 200)}`);
    }
    console.log('');
    if (failures.length === 0) {
      console.log(
        `OK: nenhuma referencia git inexistente entre ${summary.commitsDistintos} commits e ` +
          `${summary.tagsDistintas} tags citados.`,
      );
    } else {
      console.log(`REPROVADO: ${failures.length} referencia(s) git nao existe(m) no repositorio.`);
    }
    console.log(
      'LIMITE DECLARADO: um hash removido por rebase/gc e indistinguivel de um\n' +
        'hash inventado -- ambos aparecem como inexistentes. E um hash REAL porem\n' +
        'DESATUALIZADO passa neste verificador sem alarme.',
    );
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error(`erro de execucao: ${err && err.message ? err.message : err}`);
  process.exit(2);
}
