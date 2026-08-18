import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');

describe('CASE-008 static runtime and Docker guards', () => {
  it('registers process safety handlers for unhandled rejections and uncaught exceptions', () => {
    const processSafety = fs.readFileSync(path.join(repoRoot, 'server/src/config/processSafety.ts'), 'utf8');
    const index = fs.readFileSync(path.join(repoRoot, 'server/index.ts'), 'utf8');

    expect(processSafety).toContain("process.on('unhandledRejection'");
    expect(processSafety).toContain("process.on('uncaughtException'");
    expect(index).toContain('registerProcessSafetyHandlers({');
    expect(index).toContain('fatalShutdownTimeoutMs: FATAL_SHUTDOWN_FORCED_EXIT_MS + 1000');
  });

  it('drains pending audit logs before closing Sequelize during shutdown', () => {
    const index = fs.readFileSync(path.join(repoRoot, 'server/index.ts'), 'utf8');

    const drainPosition = index.indexOf('waitForPendingAuditLogs');
    const sequelizeClosePosition = index.indexOf('sequelize.close()');

    expect(drainPosition).toBeGreaterThan(-1);
    expect(sequelizeClosePosition).toBeGreaterThan(-1);
    expect(drainPosition).toBeLessThan(sequelizeClosePosition);
  });

  it('persists /app/logs with a named volume and creates it with the non-root runtime user owner', () => {
    const compose = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
    const dockerfile = fs.readFileSync(path.join(repoRoot, 'server/Dockerfile'), 'utf8');
    const prodCompose = fs.readFileSync(path.join(repoRoot, 'docker-compose.prod.yml'), 'utf8');

    expect(compose).toContain('- app_logs:/app/logs');
    expect(compose).toMatch(/^  app_logs:/m);
    expect(compose).toContain('stop_grace_period: 35s');
    expect(prodCompose).toContain('stop_grace_period: 35s');
    expect(dockerfile).toContain('mkdir -p /app/uploads /app/logs');
    expect(dockerfile).toContain('chown -R evok:evok /app');
  });
});
