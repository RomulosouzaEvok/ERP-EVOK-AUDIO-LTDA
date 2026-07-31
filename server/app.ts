/**
 * Express application instance shared by runtime and tests.
 * This module must not connect to the database or start listening.
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { loadRuntimeEnv } from './src/config/runtimeEnv';
import healthRouter from './src/routes/health';

const errorHandler = require('./src/middlewares/errorHandler');
const requestContext = require('./src/middlewares/requestContext');

const runtimeEnv = loadRuntimeEnv();
const app = express();

const corsOptions = {
  origin: runtimeEnv.corsOrigin.split(',').map((origin) => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(requestContext);

app.use('/health', healthRouter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Muitas tentativas de registro. Tente novamente em 1 hora.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Muitas requisicoes. Tente novamente em 15 minutos.' },
});
// Limiter proprio (nao compartilhado com login) para recuperacao de senha
// (SEC-12): login/forgot-password/reset-password sao ameacas distintas
// (brute-force de credencial vs. abuso de recuperacao) e nao devem
// consumir a mesma cota - do contrario, uma sequencia legitima de
// forgot+reset+login esgota o limite de login mais rapido do que deveria.
const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', passwordRecoveryLimiter);
app.use('/api/auth/reset-password', passwordRecoveryLimiter);
app.use('/api', apiLimiter);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/auth', require('./src/modules/auth/presentation/routes/auth'));
app.use('/api/users', require('./src/modules/users/presentation/routes/users'));
app.use('/api/products', require('./src/modules/products/presentation/routes/products'));
app.use('/api/clients', require('./src/modules/clients/presentation/routes/clients'));
app.use('/api/suppliers', require('./src/modules/suppliers/presentation/routes/suppliers'));
app.use('/api/sales', require('./src/modules/sales/presentation/routes/sales'));
app.use('/api/purchases', require('./src/modules/purchases/presentation/routes/purchases'));
app.use('/api/finance', require('./src/modules/financial/presentation/routes/finance'));

app.use('/api/service-orders', require('./src/routes/serviceOrders'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/departments', require('./src/routes/departments'));
app.use('/api/production-orders', require('./src/modules/production/presentation/routes/productionOrders'));
app.use('/api/inventory', require('./src/modules/inventory/presentation/routes/inventory'));
app.use('/api/inventory-counts', require('./src/modules/inventory/presentation/routes/inventoryCounts'));

app.use('/api/assets', require('./src/routes/assets'));
app.use('/api/mobile-inventory', require('./src/routes/mobileInventory'));
app.use('/api/auditor', require('./src/routes/intelligentAuditor'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/quality/non-conformities', require('./src/routes/nonConformities'));
app.use('/api/maintenance', require('./src/routes/maintenance'));
app.use('/api/audit-logs', require('./src/routes/auditLogs'));
app.use('/api/engineering/bom', require('./src/modules/bom/presentation/routes/bom'));
app.use('/api/items', require('./src/modules/items/presentation/routes/items'));
app.use('/api/mrp', require('./src/modules/mrp/presentation/routes/mrp'));
app.use('/api/traceability', require('./src/modules/traceability/presentation/routes/traceability'));
app.use('/api/webhooks', require('./src/routes/webhooks'));

app.use('/uploads', express.static('uploads'));

app.get('/api', (_req, res) => {
  res.json({
    message: 'API ERP EVOK AUDIO - Online',
    version: '2.0.0 (PostgreSQL/Sequelize/TypeScript)',
  });
});

app.use(errorHandler);

declare const module: { exports: unknown };

module.exports = app;
export default app;
