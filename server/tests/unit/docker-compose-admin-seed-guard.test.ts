import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('guardas de ADMIN_SEED_PASSWORD no compose e no seed', () => {
  it('compose de desenvolvimento exige ADMIN_SEED_PASSWORD sem fallback fraco', () => {
    const compose = read('docker-compose.yml');

    expect(compose).toMatch(/ADMIN_SEED_PASSWORD:\s*\$\{ADMIN_SEED_PASSWORD:\?/);
    expect(compose).not.toMatch(/ADMIN_SEED_PASSWORD:\s*\$\{ADMIN_SEED_PASSWORD:-/);
  });

  it('compose de producao continua exigindo ADMIN_SEED_PASSWORD', () => {
    const composeProd = read('docker-compose.prod.yml');

    expect(composeProd).toMatch(/ADMIN_SEED_PASSWORD:\s*\$\{ADMIN_SEED_PASSWORD:\?/);
  });

  it('DB_PASSWORD permanece obrigatorio no compose de desenvolvimento', () => {
    const compose = read('docker-compose.yml');

    expect(compose).toMatch(/POSTGRES_PASSWORD:\s*\$\{DB_PASSWORD:\?/);
    expect(compose).toMatch(/DB_PASSWORD:\s*\$\{DB_PASSWORD:\?/);
  });

  it('os exemplos de ambiente continuam com placeholders de troca obrigatoria', () => {
    const envExample = read('.env.example');
    const envDockerExample = read('.env.docker.example');

    expect(envExample).toMatch(/ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION/);
    expect(envDockerExample).toMatch(/ADMIN_SEED_PASSWORD=CHANGE_ME_REQUIRED_IN_PRODUCTION/);
    expect(envExample).toMatch(/DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD/);
    expect(envDockerExample).toMatch(/DB_PASSWORD=CHANGE_ME_USE_A_STRONG_PASSWORD/);
  });

  it('o seed nao volta a ter fallback literal para a senha do admin', () => {
    const seeds = read('server/src/config/seeds.ts');

    expect(seeds).not.toMatch(/\|\|\s*['"`]/);
    expect(seeds).toContain('ADMIN_SEED_PASSWORD');
    expect(seeds).toContain('throw new Error');
  });
});
