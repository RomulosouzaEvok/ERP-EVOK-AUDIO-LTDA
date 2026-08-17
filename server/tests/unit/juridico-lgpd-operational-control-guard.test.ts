const {
  LGPD_PROMOTION_BLOCKED,
  LGPD_PROMOTION_GUARD_VERSION,
  LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS,
  LGPD_PROMOTION_GUARD_STATUS,
} = require('../../src/modules/juridico/domain/lgpdOperationalControlGuard');

describe('LGPD operational promotion guard (CASE-010 / D5)', () => {
  it('continua liberado quando D1-D4 e artefatos de suporte estao presentes', () => {
    expect(LGPD_PROMOTION_GUARD_VERSION).toBe('2026-08-14-case-010');
    expect(LGPD_PROMOTION_GUARD_STATUS).toBe('ready');
    expect(LGPD_PROMOTION_BLOCKED).toBe(false);
    expect(LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS).toEqual([]);
  });
});
