const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./src/middlewares/errorHandler');

dotenv.config();

const app = express();

// Security - CORS restrito em produção
const corsOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || 'https://app.evokaudio.com.br')
  : (process.env.CORS_ORIGIN || 'http://localhost:5173');
const corsOptions = {
  origin: corsOrigins.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, error: 'Muitas tentativas de registro. Tente novamente em 1 hora.' } });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Muitas requisições. Tente novamente em 15 minutos.' } });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api', apiLimiter);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ==========================================
// ROTAS
// ==========================================
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
// Módulo Produtos migrado para Clean Architecture (Fase 5/6 do TODO).
// A rota legada `./src/routes/products.js` (+ `./src/controllers/productController.js`)
// permanece no repositório apenas como referência histórica e NÃO é mais
// registrada aqui, para evitar montar duas vezes o mesmo path `/api/products`.
// Ver `server/src/modules/products/README.md`.
app.use('/api/products', require('./src/modules/products/presentation/routes/products'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/suppliers', require('./src/routes/suppliers'));
app.use('/api/sales', require('./src/routes/sales'));
app.use('/api/purchases', require('./src/routes/purchases'));
app.use('/api/finance', require('./src/routes/finance'));
app.use('/api/service-orders', require('./src/routes/serviceOrders'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/departments', require('./src/routes/departments'));
app.use('/api/production-orders', require('./src/routes/productionOrders'));
// Módulo migrado para Clean Architecture (domain/application/infrastructure/presentation).
// Ver `server/src/modules/inventory/README.md`.
app.use('/api/inventory', require('./src/modules/inventory/presentation/routes/inventory'));

// Fase 2 - Expansão
app.use('/api/assets', require('./src/routes/assets'));
app.use('/api/mobile-inventory', require('./src/routes/mobileInventory'));
app.use('/api/auditor', require('./src/routes/intelligentAuditor'));

// Fase 3 - Melhorias
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Fase 4 - Qualidade, Manutenção e Auditoria
app.use('/api/quality/non-conformities', require('./src/routes/nonConformities'));
app.use('/api/maintenance', require('./src/routes/maintenance'));
app.use('/api/audit-logs', require('./src/routes/auditLogs'));

// Fase 5/6 - Engenharia do Produto (BOM)
// Módulo migrado para Clean Architecture (domain/application/infrastructure/presentation).
// A rota legada `./src/routes/bom.js` (+ `./src/controllers/bomController.js`)
// permanece no repositório apenas como referência histórica e NÃO é mais
// registrada aqui, para evitar montar duas vezes o mesmo path `/api/engineering/bom`.
// Ver `server/src/modules/bom/README.md`.
app.use('/api/engineering/bom', require('./src/modules/bom/presentation/routes/bom'));

// Static files
app.use('/uploads', express.static('uploads'));

// Error handler
app.use(errorHandler);

// Health check
app.get('/api', (req, res) => { res.json({ message: 'API ERP EVOK ÁUDIO - Online', version: '2.0.0 (MySQL/Sequelize)' }); });

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📌 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Banco: MySQL via Sequelize`);
  });
};

start();
