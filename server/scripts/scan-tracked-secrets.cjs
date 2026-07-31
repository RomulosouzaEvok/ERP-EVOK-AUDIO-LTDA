const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const blockedFileNames = new Set(['.env', '.env.local', '.env.production', '.env.test']);
const allowedFragments = ['.env.example', '.env.docker.example', 'node_modules', 'dist', 'tmp', '.git'];
const contentChecks = [
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{36,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
];

const findings = [];
const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: rootDir,
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

for (const relativePath of trackedFiles) {
  if (allowedFragments.some((fragment) => relativePath.includes(fragment))) {
    continue;
  }

  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    continue;
  }

  if (blockedFileNames.has(path.basename(relativePath))) {
    findings.push(`Arquivo sensivel versionado: ${relativePath}`);
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  for (const pattern of contentChecks) {
    if (pattern.test(content)) {
      findings.push(`Possivel segredo em ${relativePath} (${pattern})`);
      break;
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Secret scan local concluido sem achados bloqueantes.');
