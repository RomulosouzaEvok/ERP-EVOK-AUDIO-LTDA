const CreateDataSubjectRequestUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase');
const CreateIncidentUseCase = require('../../src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase');
const packageJson = require('../../package.json');

const { ValidationError } = require('../../src/errors');

function makeDpoDesignationRepository(activeUserId = 77) {
  return {
    findActive: jest.fn(async () => ({ id: 10, user_id: activeUserId })),
  };
}

function makeRequestRepository() {
  return {
    create: jest.fn(async (data) => ({ id: 1, ...data })),
  };
}

function makeIncidentRepository() {
  return {
    create: jest.fn(async (data) => ({ id: 2, ...data })),
  };
}

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (_error) {
    return null;
  }
}

describe('juridico-lgpd-correction-red-proof', () => {
  it('rejects a request payload DPO that differs from the active designation', async () => {
    await expect(
      new CreateDataSubjectRequestUseCase(makeRequestRepository(), makeDpoDesignationRepository(123)).execute({
        type: 'access',
        received_at: '2026-08-01',
        dpoUserId: 999,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an incident payload DPO that differs from the active designation', async () => {
    await expect(
      new CreateIncidentUseCase(makeIncidentRepository(), makeDpoDesignationRepository(123)).execute({
        detected_at: '2026-08-07T08:00:00Z',
        description: 'Acesso indevido',
        risk_assessment: 'medio',
        dpoUserId: 999,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('provides the retention policy creation use case required by RoPA', () => {
    const CreateRetentionPolicyUseCase = safeRequire(
      '../../src/modules/juridico/application/use-cases/lgpd/CreateRetentionPolicyUseCase',
    );

    expect(typeof CreateRetentionPolicyUseCase).toBe('function');
  });

  it('runs the LGPD release check from the build command', () => {
    expect(packageJson.scripts.build).toContain('npm run release:check');
    expect(packageJson.scripts['release:check']).toBe('tsx scripts/check-lgpd-release-readiness.ts');
  });
});
