import {
  LGPD_PROMOTION_BLOCKED,
  LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS,
  LGPD_PROMOTION_GUARD_VERSION,
} from '../src/modules/juridico/domain/lgpdOperationalControlGuard';

if (LGPD_PROMOTION_BLOCKED) {
  console.error(`LGPD release readiness blocked (${LGPD_PROMOTION_GUARD_VERSION}): ${LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`LGPD release readiness passed (${LGPD_PROMOTION_GUARD_VERSION}).`);
}
