import fs from 'fs';
import path from 'path';

function collectProductionTypeScriptFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectProductionTypeScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('CASE-007 rate-limit source guards', () => {
  it('does not derive rate-limit keys from unverified JWT payloads', () => {
    const serverRoot = path.resolve(__dirname, '../..');
    const productionFiles = [path.join(serverRoot, 'app.ts'), ...collectProductionTypeScriptFiles(path.join(serverRoot, 'src'))];

    const offenders = productionFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('jwt.decode'));

    expect(offenders.map((file) => path.relative(serverRoot, file))).toEqual([]);
  });

  it('does not mount a refresh limiter before authentication can verify the token', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../../app.ts'), 'utf8');

    expect(appSource).not.toContain("app.use('/api/auth/refresh'");
  });
});
