import fs from 'fs';
import path from 'path';

const GUARD_VERSION = '2026-08-14-case-010';
const SERVER_ROOT = path.resolve(__dirname, '../../../../');

const REQUIRED_ARTIFACTS = [
  'migrations/20260814-000050-lgpd-operational-controls-case-010.cjs',
  'src/models/JurLgpdDpoDesignation.ts',
  'src/models/JurLgpdRetentionPolicy.ts',
  'src/models/JurLgpdManualTask.ts',
  'src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts',
  'src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase.ts',
  'src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts',
  'src/modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase.ts',
  'src/modules/juridico/application/use-cases/lgpd/PendingCriticalIncidentsUseCase.ts',
  'src/modules/juridico/presentation/controllers/lgpdController.ts',
  'src/modules/juridico/presentation/routes/juridico.ts',
];

function resolveArtifact(relativePath: string): string {
  return path.resolve(SERVER_ROOT, relativePath);
}

export const LGPD_PROMOTION_GUARD_VERSION = GUARD_VERSION;
export const LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS = REQUIRED_ARTIFACTS.filter((artifact) => !fs.existsSync(resolveArtifact(artifact)));
export const LGPD_PROMOTION_BLOCKED = LGPD_PROMOTION_GUARD_MISSING_ARTIFACTS.length > 0;
export const LGPD_PROMOTION_GUARD_STATUS = LGPD_PROMOTION_BLOCKED ? 'blocked' : 'ready';
