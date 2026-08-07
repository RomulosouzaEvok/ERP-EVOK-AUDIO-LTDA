/**
 * Express application instance shared by runtime and tests.
 * This module must not connect to the database or start listening.
 */

import cors from 'cors';
import express, { Request } from 'express';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import { loadRuntimeEnv, getJwtRuntimeConfig } from './src/config/runtimeEnv';
import healthRouter from './src/routes/health';

const errorHandler = require('./src/middlewares/errorHandler');
const requestContext = require('./src/middlewares/requestContext');

const runtimeEnv = loadRuntimeEnv();
const app = express();

// TRUST_PROXY=0 por padrao (nao confia em nenhum proxy — correto para
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

// Chave de rate-limit por e-mail+IP (nao so IP): varios colaboradores da
// fabrica saem atras do mesmo IP publico/NAT, entao uma chave so-IP faz um
// unico usuario errando a senha bloquear o predio inteiro por 15min. Uma
// chave composta isola o brute-force por CONTA visada, sem perder a
// protecao (um atacante testando N contas do mesmo IP ainda soma por IP
// via `ipKeyGenerator`, so nao compartilha cota com contas legitimas de
// outros colegas atras do mesmo IP).
function loginAttemptKey(req: Request): string {
  const ip = ipKeyGenerator(req.ip ?? '');
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `${ip}:${email}` : ip;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: loginAttemptKey,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Muitas tentativas de registro. Tente novamente em 1 hora.' },
});
// Chave de rate-limit por USUARIO autenticado (nao por IP) quando o
// request traz um Bearer token decodificavel: o objetivo deste limiter e
// conter abuso por CONTA (credencial vazada, script rodando sem limite),
// nao por endereco de rede - varios colaboradores atras do mesmo IP/NAT
// nao devem compartilhar cota, senao trocar de aba rapido em varias
// estacoes do mesmo escritorio derruba o sistema para todo mundo. O token
// so e decodificado (nao verificado) aqui: chave errada na pior hipotese
// isola mal um request nao autenticado, nunca autoriza nada — a validacao
// de assinatura real continua em `authenticate`.
function apiRequestKey(req: Request): string {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(authHeader.slice('Bearer '.length)) as { id?: number | string } | null;

      if (decoded?.id !== undefined) {
        return `user:${decoded.id}`;
      }
    } catch {
      // Token ilegivel — cai para chave por IP abaixo.
    }
  }

  return ipKeyGenerator(req.ip ?? '');
}

// Limiter dedicado para a renovacao deslizante de sessao (painel de TV
// "sempre ligado"): chave por USUARIO autenticado (mesmo `apiRequestKey` do
// limiter geral da API), nao por IP — o cenario de abuso aqui e uma conta
// comprometida renovando token em loop, nao trafego generico da API. 30
// renovacoes/15min e folgado o bastante para varios dispositivos (TVs,
// abas) do mesmo usuario renovando de forma independente, sem abrir espaco
// para um script indefinidamente manter uma sessao viva sem novo login.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: apiRequestKey,
  message: { success: false, error: 'Muitas renovacoes de sessao. Tente novamente em 15 minutos.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Em NODE_ENV=test, a suite de integracao/edge legitimamente dispara
  // centenas de requisicoes reais em poucos segundos contra o mesmo IP
  // (127.0.0.1) — nao e o cenario de abuso que este limiter existe para
  // conter. Sem esta excecao, adicionar novos testes de integracao
  // eventualmente esbarra no limite e derruba suites nao relacionadas com
  // 429, mascarando falhas reais.
  max: runtimeEnv.nodeEnv === 'test' ? 100000 : 300,
  keyGenerator: apiRequestKey,
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
  keyGenerator: loginAttemptKey,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

app.use(express.json({
  limit: '5mb',
  // Guarda o corpo bruto (antes do parse) para permitir verificacao HMAC
  // exata de assinatura em webhooks (ex.: /api/webhooks/n8n), sem afetar
  // o restante das rotas que so usam req.body ja parseado.
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Os limiters precisam vir DEPOIS do body parser: `loginAttemptKey` le
// `req.body.email` para compor a chave por conta (nao so por IP) — antes
// do parser, `req.body` sempre chega `undefined` e todo login cai no
// fallback por IP, fazendo qualquer usuario atras do mesmo IP/NAT
// compartilhar (e esgotar) a cota de tentativas dos colegas.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', passwordRecoveryLimiter);
app.use('/api/auth/reset-password', passwordRecoveryLimiter);
app.use('/api', apiLimiter);

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
app.use('/api/work-centers', require('./src/modules/workCenters/presentation/routes/workCenters'));
app.use('/api/inventory', require('./src/modules/inventory/presentation/routes/inventory'));
app.use('/api/inventory-counts', require('./src/modules/inventory/presentation/routes/inventoryCounts'));

app.use('/api/assets', require('./src/modules/assets/presentation/routes/assets'));
app.use('/api/mobile-inventory', require('./src/modules/mobileInventory/presentation/routes/mobileInventory'));
app.use('/api/auditor', require('./src/modules/intelligentAuditor/presentation/routes/intelligentAuditor'));
app.use('/api/dashboard', require('./src/modules/dashboard/presentation/routes/dashboard'));
app.use('/api/quality/non-conformities', require('./src/modules/nonConformities/presentation/routes/nonConformities'));
app.use('/api/maintenance', require('./src/modules/maintenance/presentation/routes/maintenance'));
app.use('/api/audit-logs', require('./src/modules/auditLogs/presentation/routes/auditLogs'));
app.use('/api/engineering/bom', require('./src/modules/bom/presentation/routes/bom'));
// IMPORTANTE: registrado APOS '/api/engineering/bom' para nao capturar suas rotas.
app.use('/api/engineering', require('./src/modules/engineering/presentation/routes/engineering'));
app.use('/api/laboratory', require('./src/modules/laboratory/presentation/routes/laboratory'));
app.use('/api/items', require('./src/modules/items/presentation/routes/items'));
app.use('/api/mrp', require('./src/modules/mrp/presentation/routes/mrp'));
app.use('/api/traceability', require('./src/modules/traceability/presentation/routes/traceability'));
app.use('/api/webhooks', require('./src/modules/webhooks/presentation/routes/webhooks'));
app.use('/api/sst', require('./src/modules/sst/presentation/routes/sst'));
app.use('/api/ti', require('./src/modules/ti/presentation/routes/ti'));
app.use('/api/facilities', require('./src/modules/facilities/presentation/routes/facilities'));
app.use('/api/marketing', require('./src/modules/marketing/presentation/routes/marketing'));
app.use('/api/legal', require('./src/modules/legal/presentation/routes/legal'));

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
