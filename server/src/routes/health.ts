import express from 'express';

import { sequelize } from '../config/database';
import { isShuttingDown } from '../config/runtimeState';

const router = express.Router();
const appVersion = '1.0.0';

router.get('/live', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'erp-evok-audio-server',
    version: appVersion,
    uptimeSeconds: Math.round(process.uptime()),
    shuttingDown: isShuttingDown(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  if (isShuttingDown()) {
    res.status(503).json({
      status: 'draining',
      database: 'unknown',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    await sequelize.authenticate();
    res.json({
      status: 'ready',
      database: 'up',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(503).json({
      status: 'not_ready',
      database: 'down',
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
module.exports = router;
