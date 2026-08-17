/**
 * Express application instance shared by runtime and tests.
 * This module must not connect to the database or start listening.
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { loadRuntimeEnv } from './src/config/runtimeEnv';
import {
  apiIpLimiter,
  loginAttemptLimiter,
  passwordRecoveryLimiter,
  registerLimiter,
} from './src/middlewares/rateLimitPolicy';
import healthRouter from './src/routes/health';

const errorHandler = require('./src/middlewares/errorHandler');
const requestContext = require('./src/middlewares/requestContext');
const { authenticate } = require('./src/middlewares/auth');

const runtimeEnv = loadRuntimeEnv();
const app = express();

// TRUST_PROXY=0 por padrao (nao confia em nenhum proxy - correto para
// desenvolvimento local sem proxy na frente). Em producao atras de um
// proxy reverso (nginx, load balancer), configurar TRUST_PROXY=1 (ou o
// numero exato de saltos confiaveis) para que express-rate-limit use o
// IP real do cliente (X-Forwarded-For), nao o IP do proxy.
app.set('trust proxy', runtimeEnv.trustProxy);

const corsOptions = {
  origin: runtimeEnv.corsOrigin.split(',').map((origin) => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(requestContext);

app.use('/health', healthRouter);

app.use(express.json({
  limit: '5mb',
  // Guarda o corpo bruto (antes do parse) para permitir verificacao HMAC
  // exata de assinatura em webhooks (ex.: /api/webhooks/n8n), sem afetar
  // o restante das rotas que so usam req.body ja parseado.
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Limiters de entrada precisam vir depois do body parser porque login e
// recuperacao de senha usam req.body.email para a cota por conta. A cota
// global da API aqui e sempre por IP; cotas por usuario autenticado sao
// aplicadas somente apos jwt.verify em authenticate.
app.use('/api/auth/login', loginAttemptLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', passwordRecoveryLimiter);
app.use('/api/auth/reset-password', passwordRecoveryLimiter);
app.use('/api', apiIpLimiter);

app.use('/api/auth', require('./src/modules/auth/presentation/routes/auth'));
app.use('/api/users', require('./src/modules/users/presentation/routes/users'));
app.use('/api/access-profiles', require('./src/modules/accessProfiles/presentation/routes/accessProfiles'));
app.use('/api/products', require('./src/modules/products/presentation/routes/products'));
app.use('/api/clients', require('./src/modules/clients/presentation/routes/clients'));
app.use('/api/suppliers', require('./src/modules/suppliers/presentation/routes/suppliers'));
app.use('/api/sales', require('./src/modules/sales/presentation/routes/sales'));
app.use('/api/purchases', require('./src/modules/purchases/presentation/routes/purchases'));
app.use('/api/purchase-requisitions', require('./src/modules/purchaseRequisitions/presentation/routes/purchaseRequisitions'));
app.use('/api/rfqs', require('./src/modules/rfq/presentation/routes/rfqs'));
app.use('/api/comex/import-processes', require('./src/modules/comex/presentation/routes/importProcesses'));
app.use('/api/finance', require('./src/modules/financial/presentation/routes/finance'));
app.use('/api/fiscal', require('./src/modules/fiscal/presentation/routes/fiscal'));

app.use('/api/service-orders', require('./src/modules/serviceOrders/presentation/routes/serviceOrders'));
app.use('/api/categories', require('./src/modules/categories/presentation/routes/categories'));
app.use('/api/reports', require('./src/modules/reports/presentation/routes/reports'));
app.use('/api/employees', require('./src/modules/employees/presentation/routes/employees'));
app.use('/api/departments', require('./src/modules/departments/presentation/routes/departments'));
app.use('/api/production-orders', require('./src/modules/production/presentation/routes/productionOrders'));
app.use('/api/production/downtimes', require('./src/modules/production/presentation/routes/productionDowntimes'));
// Roteiro de producao (gap G5) - pre-requisito do apontamento obrigatorio (G4).
app.use('/api/production/routes', require('./src/modules/production/presentation/routes/productionRoutes'));
// Plano Mestre de Producao / MPS (gap G17, decisao D-F do dono do produto) - a
// camada de decisao entre a carteira de pedidos e a ordem de producao. Nao ha
// gatilho automatico de OP na confirmacao da venda: a OP nasce da liberacao
// explicita de um plano firmado.
app.use('/api/production/master-plans', require('./src/modules/masterProduction/presentation/routes/masterProductionPlans'));
app.use('/api/work-centers', require('./src/modules/workCenters/presentation/routes/workCenters'));
app.use('/api/inventory', require('./src/modules/inventory/presentation/routes/inventory'));
app.use('/api/inventory-counts', require('./src/modules/inventory/presentation/routes/inventoryCounts'));

app.use('/api/assets', require('./src/modules/assets/presentation/routes/assets'));
app.use('/api/mobile-inventory', require('./src/modules/mobileInventory/presentation/routes/mobileInventory'));
app.use('/api/auditor', require('./src/modules/intelligentAuditor/presentation/routes/intelligentAuditor'));
app.use('/api/dashboard', require('./src/modules/dashboard/presentation/routes/dashboard'));
app.use('/api/quality/non-conformities', require('./src/modules/nonConformities/presentation/routes/nonConformities'));
// IMPORTANTE: registrado APOS '/api/quality/non-conformities' para nao
// capturar suas rotas. Inspecao de qualidade (G7) - `/api/quality/inspections`
// e `/api/quality/lots/:lotId/release-eligibility`.
app.use('/api/quality', require('./src/modules/quality/presentation/routes/qualityInspections'));
app.use('/api/maintenance', require('./src/modules/maintenance/presentation/routes/maintenance'));
app.use('/api/audit-logs', require('./src/modules/auditLogs/presentation/routes/auditLogs'));
app.use('/api/engineering/bom', require('./src/modules/bom/presentation/routes/bom'));
// IMPORTANTE: registrado APOS '/api/engineering/bom' para nao capturar suas rotas.
app.use('/api/engineering', require('./src/modules/engineering/presentation/routes/engineering'));
app.use('/api/laboratory', require('./src/modules/laboratory/presentation/routes/laboratory'));
app.use('/api/items', require('./src/modules/items/presentation/routes/items'));
// Importacao de cadastro por planilha (CSV): carrega insumos, produtos e a
// estrutura de produto de uma vez. Escreve em `products` + `items` e delega a
// estrutura ao `BomService` ja existente.
app.use('/api/catalog-import', require('./src/modules/spreadsheetImport/presentation/routes/catalogImport'));
app.use('/api/mrp', require('./src/modules/mrp/presentation/routes/mrp'));
app.use('/api/traceability', require('./src/modules/traceability/presentation/routes/traceability'));
app.use('/api/webhooks', require('./src/modules/webhooks/presentation/routes/webhooks'));
app.use('/api/sst', require('./src/modules/sst/presentation/routes/sst'));
app.use('/api/ti', require('./src/modules/ti/presentation/routes/ti'));
app.use('/api/facilities', require('./src/modules/facilities/presentation/routes/facilities'));
app.use('/api/marketing', require('./src/modules/marketing/presentation/routes/marketing'));
app.use('/api/jur', require('./src/modules/juridico/presentation/routes/juridico'));
app.use('/api/accounting', require('./src/modules/accounting/presentation/routes/accounting'));
app.use('/api/treasury', require('./src/modules/treasury/presentation/routes/treasury'));
app.use('/api/budget', require('./src/modules/budget/presentation/routes/budget'));
// BLOCO 6 RH - modulo NOVO, montado AO LADO de '/api/employees' (que
// permanece inalterado, RF-RH-006); nao ha conflito de prefixo.
app.use('/api/rh', require('./src/modules/rh/presentation/routes/rh'));
// Modulo Diretoria (2026-08-12) - Organograma Executivo, Planejamento
// Estrategico, Atas de Reuniao e Riscos Corporativos.
app.use('/api/directorate', require('./src/modules/directorate/presentation/routes/directorate'));

// Achado de auditoria de seguranca (2026-08-12): este diretorio guarda ASO,
// TRCT de rescisao, contratos e outros documentos sensiveis de RH/Juridico.
// Servir sem autenticacao deixava qualquer pessoa com a URL acessar o
// arquivo, sem sessao nem log. `authenticate` exige um JWT valido (mesma
// checagem usada nas rotas /api/*) antes do express.static liberar o byte.
app.use('/uploads', authenticate, express.static('uploads'));

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
