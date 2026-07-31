const fs = require('fs');
const path = require('path');

const summaryPath = process.argv[2];

if (!summaryPath) {
  console.error('Uso: node scripts/assert-jest-no-skips.cjs <arquivo-json>');
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), summaryPath);
const report = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

const pendingTests = Number(report.numPendingTests || 0);
const pendingSuites = Number(report.numPendingTestSuites || 0);
const todoTests = Number(report.numTodoTests || 0);

if (pendingTests > 0 || pendingSuites > 0 || todoTests > 0) {
  console.error(
    `Jest reportou execucao incompleta: pendingTests=${pendingTests}, pendingSuites=${pendingSuites}, todoTests=${todoTests}.`
  );
  process.exit(1);
}

console.log(`Jest sem skips: ${path.basename(absolutePath)}`);
