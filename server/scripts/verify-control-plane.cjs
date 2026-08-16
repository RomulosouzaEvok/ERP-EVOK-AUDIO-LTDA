#!/usr/bin/env node
/**
 * verify-control-plane.cjs
 *
 * CONTROLE DETECTIVO -- classe de risco RC-PROC-01, incidente 4
 * ("artefato de Control Plane envelhece silenciosamente e passa a divergir
 * da evidencia versionada").
 *
 * TESE: nao e possivel verificar por maquina se uma AFIRMACAO do Control Plane
 * e semanticamente verdadeira. E possivel verificar se as REFERENCIAS que ela
 * usa ainda existem. Artefato envelhecido quase sempre quebra referencia antes
 * de quebrar sentido -- e referencia quebrada e objetiva.
 *
 * VERIFICACOES (todas objetivas; nenhuma depende de julgamento):
 *   V1  Todo caminho de arquivo citado existe (em disco, ou como sufixo de um
 *       caminho versionado).
 *   V2  Toda citacao `arquivo.md:N` ou `arquivo.md:N-M` aponta para linha que
 *       existe no arquivo (nao passa do EOF).
 *   V3  Todo ID de finding citado (FIND-ERP-00X, AUD-<AREA>-NN, T<n>-F<n>)
 *       tem artefato correspondente em audit/ ou docs/coretriad/.
 *   V4  Toda aprovacao APR-YYYY-NNN citada existe em
 *       coretriad/governance/APPROVALS.md.
 *   V5  Todo run id <PROJETO>-AUD-NNN citado tem diretorio em audit/runs/.
 *
 * O QUE ESTE SCRIPT NAO FAZ (declarado, nao inferido):
 *   - NAO verifica se "1/7" deveria ser "7/7", nem se o estado declarado da run
 *     corresponde ao trabalho executado. Isso e semantico e fica SEM COBERTURA.
 *   - NAO corrige nada. Relata.
 *   - NAO emite juizo de auditoria, severidade nem fecha criterio algum.
 *
 * Node puro, sem dependencia externa.
 *
 * Uso:  node server/scripts/verify-control-plane.cjs [--json] [arquivo...]
 * Exit: 0 = sem divergencia; 1 = divergencia encontrada; 2 = erro do script.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const explicitTargets = argv.filter((a) => !a.startsWith('--'));

const DEFAULT_TARGETS = [
  'coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md',
  'coretriad/states/ERP-LEGACY-001/PROJECT_EVENT_LOG.md',
];

const APPROVALS_FILE = 'coretriad/governance/APPROVALS.md';
const ARTIFACT_ROOTS = ['audit/', 'docs/coretriad/'];

/** Diretorios de topo do repositorio: citacao que comeca assim e caminho absoluto do repo. */
const TOP_LEVEL = new Set(
  fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'node_modules' && d.name !== '.git')
    .map((d) => d.name),
);

const PATH_EXTENSIONS = new Set([
  'md', 'ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'json', 'yml', 'yaml',
  'sql', 'sh', 'csv', 'html', 'css', 'txt', 'toml',
]);

/**
 * Tokens que terminam em extensao valida mas NAO sao caminho: nomes de
 * tecnologia, pacotes e prosa. Sem esta lista o verificador vira ruido.
 */
const NOT_A_PATH = new Set([
  'node.js', 'Node.js', 'next.js', 'Next.js', 'nest.js', 'Nest.js',
  'vue.js', 'Vue.js', 'react.js', 'React.js', 'express.js', 'Express.js',
  'ecma.js', 'chart.js', 'Chart.js',
]);

/**
 * AUSENCIAS CONHECIDAS E JA DOCUMENTADAS NO PROPRIO REPOSITORIO.
 * Nao e "regra nova" nem excecao inventada: cada entrada aponta a linha do
 * artefato versionado que registra a ausencia. Toda supressao e IMPRESSA na
 * saida -- supressao silenciosa e como nao ter verificador.
 */
const KNOWN_ABSENCES = [
  {
    id: 'FIND-ERP-003',
    motivo:
      'lacuna de numeracao declarada em coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:441 ' +
      '("FIND-ERP-003 e FIND-ERP-004 NUNCA EXISTIRAM")',
  },
  {
    id: 'FIND-ERP-004',
    motivo:
      'lacuna de numeracao declarada em coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md:441 ' +
      '("FIND-ERP-003 e FIND-ERP-004 NUNCA EXISTIRAM")',
  },
];
const SUPPRESSED_IDS = new Map(KNOWN_ABSENCES.map((a) => [a.id, a.motivo]));

// ---------------------------------------------------------------------------
// Indice do repositorio
// ---------------------------------------------------------------------------

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);
}

const tracked = trackedFiles();
const trackedSet = new Set(tracked);
/** basename -> lista de caminhos, para resolucao por sufixo. */
const bySuffix = new Map();
for (const p of tracked) {
  const base = p.split('/').pop();
  if (!bySuffix.has(base)) bySuffix.set(base, []);
  bySuffix.get(base).push(p);
}

const artifactPaths = tracked.filter((p) => ARTIFACT_ROOTS.some((r) => p.startsWith(r)));

/**
 * Todo caminho que ja existiu em QUALQUER ref (branches sana/*, opus/*, refs
 * remotas, commits antigos). O Control Plane cita legitimamente artefatos de
 * worktree de remediacao que nunca entraram na main -- reportar isso como
 * "inexistente" seria falso alarme. Resolvido aqui, e reportado como AVISO.
 */
const historicalPaths = (() => {
  try {
    return new Set(
      execFileSync('git', ['log', '--all', '--pretty=format:', '--name-only'], {
        cwd: rootDir,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      })
        .split(/\r?\n/)
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
})();
const historicalBySuffix = new Map();
for (const p of historicalPaths) {
  const base = p.split('/').pop();
  if (!historicalBySuffix.has(base)) historicalBySuffix.set(base, []);
  historicalBySuffix.get(base).push(p);
}

/** Conteudo concatenado dos artefatos, para busca de ID por mencao. */
let artifactCorpus = null;
function corpus() {
  if (artifactCorpus === null) {
    const parts = [];
    for (const p of artifactPaths) {
      if (!p.toLowerCase().endsWith('.md')) continue;
      try {
        parts.push(fs.readFileSync(path.join(rootDir, p), 'utf8'));
      } catch {
        /* ignora ilegivel */
      }
    }
    artifactCorpus = parts.join('\n');
  }
  return artifactCorpus;
}

const lineCountCache = new Map();
function lineCount(relOrAbs) {
  if (lineCountCache.has(relOrAbs)) return lineCountCache.get(relOrAbs);
  let n = -1;
  try {
    n = fs.readFileSync(path.join(rootDir, relOrAbs), 'utf8').split(/\r?\n/).length;
  } catch {
    n = -1;
  }
  lineCountCache.set(relOrAbs, n);
  return n;
}

// ---------------------------------------------------------------------------
// Resolucao de caminho citado
// ---------------------------------------------------------------------------

function resolveCitedPath(token) {
  const clean = token.replace(/\/+$/, '');
  // 1. exato a partir da raiz do repositorio (inclui arquivos nao versionados,
  //    ex.: .claude/hooks/org-isolation.js)
  const abs = path.join(rootDir, clean);
  if (abs.startsWith(rootDir) && fs.existsSync(abs)) {
    return { ok: true, how: 'exato', resolved: clean };
  }
  // 2. sufixo de algum caminho versionado (o Control Plane cita muito por
  //    nome curto: `07-findings/T-26_CONSOLIDACAO.md`, `AUDIT_SCOPE.md`)
  const base = clean.split('/').pop();
  const candidates = bySuffix.get(base) || [];
  const suffixHits = candidates.filter((p) => p === clean || p.endsWith('/' + clean));
  if (suffixHits.length > 0) {
    return { ok: true, how: 'sufixo', resolved: suffixHits[0], candidates: suffixHits };
  }
  // 3. existiu em outra ref (branch de remediacao, worktree, commit antigo)
  const histHits = (historicalBySuffix.get(base) || []).filter(
    (p) => p === clean || p.endsWith('/' + clean),
  );
  if (histHits.length > 0) {
    return { ok: true, how: 'historico', resolved: histHits[0], candidates: histHits };
  }
  return { ok: false };
}

function isPathCandidate(raw) {
  let t = raw.trim();
  if (!t || t.length > 200) return null;
  if (NOT_A_PATH.has(t)) return null;
  if (/[\s*?<>|$()\[\]{}"',;!]/.test(t)) return null;
  if (/:\/\//.test(t)) return null; // URL
  if (/\.\.\./.test(t)) return null; // elipse/truncagem
  if (/^[.]{1,2}$/.test(t)) return null;
  // Fragmento de extensao usado em prosa: `.md`, `.prod.yml` em
  // "`docker-compose.yml`/`.prod.yml`". Sem barra e comecando por ponto,
  // nao e caminho -- e abreviacao textual.
  if (t.startsWith('.') && !t.includes('/')) return null;

  // sufixo de linha: arquivo.md:123 ou arquivo.md:123-456
  let lineRef = null;
  const m = /^(.+?):(\d+)(?:-(\d+))?$/.exec(t);
  if (m) {
    t = m[1];
    lineRef = { from: Number(m[2]), to: m[3] ? Number(m[3]) : Number(m[2]) };
  }
  t = t.replace(/[.,;:)]+$/, '');
  if (!t) return null;

  const ext = (t.split('.').pop() || '').toLowerCase();
  const isDir = raw.trim().endsWith('/');
  const startsAtRoot = TOP_LEVEL.has(t.split('/')[0]) || t.startsWith('.');

  if (isDir && startsAtRoot && t.includes('/')) return { token: t, lineRef: null, kind: 'dir' };
  if (!PATH_EXTENSIONS.has(ext)) return null;
  // exige que pareca nome de arquivo, nao numero de versao (`1.0.0`)
  if (/^\d+(\.\d+)*$/.test(t)) return null;
  return { token: t, lineRef, kind: 'file' };
}

// ---------------------------------------------------------------------------
// Extracao
// ---------------------------------------------------------------------------

const BACKTICK = /`([^`\n]+)`/g;
const APR_ID = /\bAPR-(\d{4})-(\d{3})\b/g;
const FIND_ERP_ID = /\bFIND-ERP-\d{3}\b/g;
const AUD_FINDING_ID = /\bAUD-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{2,}\b/g;
const TF_ID = /\bT\d+-F\d+\b/g;
const RUN_ID = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-AUD-\d{3}\b/g;

function collect(re, text) {
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push({ value: m[0], index: m.index });
  return out;
}

function lineNumberOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

function main() {
  const targets = (explicitTargets.length > 0 ? explicitTargets : DEFAULT_TARGETS).map((t) =>
    t.replace(/\\/g, '/'),
  );

  const approvalsText = fs.readFileSync(path.join(rootDir, APPROVALS_FILE), 'utf8');
  const approvalsDefined = new Set(
    collect(/\bAPR-\d{4}-\d{3}\b/g, approvalsText).map((x) => x.value),
  );

  const failures = [];
  const warnings = [];
  const suppressed = [];
  const stats = {
    alvos: targets.length,
    caminhosVerificados: 0,
    caminhosDistintos: 0,
    citacoesComLinha: 0,
    findingsVerificados: 0,
    aprovacoesVerificadas: 0,
    runsVerificadas: 0,
  };

  const distinctPaths = new Set();

  for (const rel of targets) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) {
      failures.push({
        class: 'ALVO_INEXISTENTE',
        file: rel,
        line: 0,
        token: rel,
        detalhe: 'arquivo de Control Plane informado nao existe',
      });
      continue;
    }
    const text = fs.readFileSync(abs, 'utf8');

    // --- V1 / V2: caminhos citados -------------------------------------
    const seenInFile = new Set();
    for (const hit of collect(BACKTICK, text)) {
      const raw = hit.value.slice(1, -1);
      const cand = isPathCandidate(raw);
      if (!cand) continue;
      const key = `${cand.token}|${cand.lineRef ? cand.lineRef.to : ''}`;
      if (seenInFile.has(key)) continue;
      seenInFile.add(key);

      stats.caminhosVerificados += 1;
      distinctPaths.add(cand.token);
      const line = lineNumberOf(text, hit.index);
      const res = resolveCitedPath(cand.token);

      if (!res.ok) {
        failures.push({
          class: 'CAMINHO_INEXISTENTE',
          file: rel,
          line,
          token: cand.token,
          detalhe: 'nao existe em disco nem como sufixo de caminho versionado',
        });
        continue;
      }

      if (res.how === 'historico') {
        warnings.push({
          class: 'CAMINHO_SO_EM_OUTRA_REF',
          file: rel,
          line,
          token: cand.token,
          detalhe:
            `nao existe no working tree; existe em outra ref/commit como ` +
            `${res.resolved} (tipico de artefato de worktree de remediacao)`,
        });
        continue;
      }

      if (cand.lineRef) {
        stats.citacoesComLinha += 1;
        // Citacao por nome curto pode casar com varios arquivos (ha 3
        // SYSTEM_MAP.md e 5 auth.ts neste repo). So e falha se a linha
        // citada estiver alem do fim em TODOS os candidatos -- caso
        // contrario a citacao e satisfativel e o alarme seria falso.
        const cands = res.candidates && res.candidates.length ? res.candidates : [res.resolved];
        const counts = cands.map((c) => ({ c, n: lineCount(c) })).filter((x) => x.n > 0);
        const satisfiable = counts.some((x) => cand.lineRef.to <= x.n);
        if (counts.length > 0 && !satisfiable) {
          failures.push({
            class: 'LINHA_ALEM_DO_FIM',
            file: rel,
            line,
            token: `${cand.token}:${cand.lineRef.from}${
              cand.lineRef.to !== cand.lineRef.from ? '-' + cand.lineRef.to : ''
            }`,
            detalhe:
              `citacao aponta ate a linha ${cand.lineRef.to}; nenhum arquivo correspondente ` +
              `chega la (${counts.map((x) => `${x.c}=${x.n}`).join(', ')})`,
          });
        }
      }
    }

    // --- V3: IDs de finding --------------------------------------------
    const findingIds = new Set(
      [
        ...collect(FIND_ERP_ID, text),
        ...collect(AUD_FINDING_ID, text),
        ...collect(TF_ID, text),
      ].map((x) => x.value),
    );
    for (const id of findingIds) {
      stats.findingsVerificados += 1;
      if (SUPPRESSED_IDS.has(id)) {
        suppressed.push({ id, motivo: SUPPRESSED_IDS.get(id), file: rel });
        continue;
      }
      const hasArtifactFile = artifactPaths.some((p) => p.split('/').pop().includes(id));
      if (hasArtifactFile) continue;
      const mentioned = corpus().includes(id);
      const entry = {
        file: rel,
        line: lineNumberOf(text, collect(new RegExp(`\\b${id}\\b`, 'g'), text)[0].index),
        token: id,
      };
      if (mentioned) {
        warnings.push({
          ...entry,
          class: 'FINDING_SEM_ARTEFATO_PROPRIO',
          detalhe:
            'ID citado e mencionado dentro de audit/ ou docs/coretriad/, mas nenhum arquivo ' +
            'leva o ID no nome',
        });
      } else {
        failures.push({
          ...entry,
          class: 'FINDING_SEM_ARTEFATO',
          detalhe: 'ID nao aparece em nome nem em conteudo de audit/ ou docs/coretriad/',
        });
      }
    }

    // --- V4: aprovacoes -------------------------------------------------
    const aprIds = new Set(collect(APR_ID, text).map((x) => x.value));
    for (const id of aprIds) {
      stats.aprovacoesVerificadas += 1;
      if (approvalsDefined.has(id)) continue;
      failures.push({
        class: 'APROVACAO_INEXISTENTE',
        file: rel,
        line: lineNumberOf(text, collect(new RegExp(`\\b${id}\\b`, 'g'), text)[0].index),
        token: id,
        detalhe: `nao consta em ${APPROVALS_FILE}`,
      });
    }

    // --- V5: run ids ----------------------------------------------------
    const runIds = new Set(collect(RUN_ID, text).map((x) => x.value));
    for (const id of runIds) {
      stats.runsVerificadas += 1;
      if (fs.existsSync(path.join(rootDir, 'audit', 'runs', id))) continue;
      failures.push({
        class: 'RUN_SEM_DIRETORIO',
        file: rel,
        line: lineNumberOf(text, collect(new RegExp(`\\b${id}\\b`, 'g'), text)[0].index),
        token: id,
        detalhe: 'nao existe audit/runs/' + id,
      });
    }
  }

  stats.caminhosDistintos = distinctPaths.size;

  if (jsonMode) {
    console.log(JSON.stringify({ stats, failures, warnings, suppressed }, null, 2));
  } else {
    console.log('=== verify-control-plane (RC-PROC-01 / incidente 4) ===');
    console.log(`Alvos: ${targets.join(', ')}`);
    console.log(
      `Verificado: ${stats.caminhosVerificados} citacoes de caminho (${stats.caminhosDistintos} distintas), ` +
        `${stats.citacoesComLinha} com numero de linha, ${stats.findingsVerificados} IDs de finding, ` +
        `${stats.aprovacoesVerificadas} aprovacoes, ${stats.runsVerificadas} run ids`,
    );
    for (const s of new Map(suppressed.map((x) => [x.id, x])).values()) {
      console.log(`\n[SUPRIMIDO] ${s.id} -- ${s.motivo}`);
    }
    // Avisos nao reprovam. Sao limitados a 8 por classe para que a saida
    // continue legivel; use --json para a lista integral.
    const byClass = new Map();
    for (const w of warnings) {
      if (!byClass.has(w.class)) byClass.set(w.class, []);
      byClass.get(w.class).push(w);
    }
    for (const [cls, list] of byClass) {
      console.log(`\n[AVISO ${cls}] ${list.length} ocorrencia(s):`);
      for (const w of list.slice(0, 8)) {
        console.log(`  - ${w.file}:${w.line}  ${w.token}`);
        console.log(`      ${w.detalhe}`);
      }
      if (list.length > 8) console.log(`  ... (+${list.length - 8} outras; use --json)`);
    }
    for (const f of failures) {
      console.log(`\n[FALHA ${f.class}] ${f.file}:${f.line}  ${f.token}`);
      console.log(`  ${f.detalhe}`);
    }
    console.log('');
    console.log(
      failures.length === 0
        ? 'OK: nenhuma referencia do Control Plane contrariada pelo disco.'
        : `REPROVADO: ${failures.length} divergencia(s) entre Control Plane e disco.`,
    );
    console.log(
      'LIMITE DECLARADO: este verificador confere REFERENCIA, nao AFIRMACAO.\n' +
        'Um "1/7" que deveria ser "7/7", ou um estado de run declarado errado,\n' +
        'passam sem alarme -- permanecem SEM COBERTURA TECNICA.',
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
