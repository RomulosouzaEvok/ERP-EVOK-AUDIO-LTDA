# 🗺️ ROADMAP COMPLETO - ERP EVOK ÁUDIO

> **Missão:** ERP Industrial de Larga Escala para fábrica de alto-falantes
> **Equipe:** 1 desenvolvedor (você)
> **Usuários:** ~50 funcionários
> **Status Atual:** 57% implementado (80+ endpoints REST funcionais)

---

## 📋 ÍNDICE

1. [VISÃO GERAL DO PROJETO](#1-visão-geral-do-projeto)
2. [PILARES DA ARQUITETURA](#2-pilares-da-arquitetura)
3. [FASE 0 - AMBIENTE DE DESENVOLVIMENTO](#3-fase-0---ambiente-de-desenvolvimento)
4. [FASE 1 - CORREÇÕES CRÍTICAS (15 bugs)](#4-fase-1---correções-críticas)
5. [FASE 2 - INFRAESTRUTURA (Docker + PostgreSQL)](#5-fase-2---infraestrutura)
6. [FASE 3 - FRONTEND REACT](#6-fase-3---frontend-react)
7. [FASE 4 - MÓDULOS INDUSTRIAIS](#7-fase-4---módulos-industriais)
8. [FASE 5 - QUALIDADE E TESTES](#8-fase-5---qualidade-e-testes)
9. [FASE 6 - DEVOPS E PRODUÇÃO](#9-fase-6---devops-e-produção)
10. [CHECKLIST FINAL](#10-checklist-final)

---

## 1. VISÃO GERAL DO PROJETO

### Stack Tecnológica Final

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Frontend** | React + Vite + TypeScript | 18+ |
| **Backend** | Node.js + Express | 20 LTS |
| **ORM** | Sequelize | 6.x |
| **Banco** | PostgreSQL 16 (Docker) | 16 |
| **Cache** | Redis (opcional) | 7 |
| **Auth** | JWT + bcryptjs | - |
| **Container** | Docker + Docker Compose | - |
| **Servidor** | Ubuntu 24.04 | - |
| **Túnel** | Cloudflare Tunnel | - |

### Estrutura Final do Projeto

```
erp-evok-audio/
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Páginas por módulo
│   │   ├── services/           # API calls (axios)
│   │   ├── hooks/              # Custom hooks
│   │   ├── contexts/           # Auth, Theme, etc.
│   │   └── utils/              # Formatação, validação
│   ├── Dockerfile
│   └── package.json
├── server/                     # Backend (JÁ EXISTE)
│   ├── src/
│   │   ├── controllers/        # 25 controllers
│   │   ├── models/             # 21 models
│   │   ├── routes/             # 22 rotas
│   │   ├── services/           # 4 services
│   │   ├── middlewares/        # auth + errorHandler
│   │   └── utils/              # validators
│   ├── Dockerfile
│   └── package.json
├── docker/
│   ├── docker-compose.yml      # PostgreSQL + pgAdmin + App
│   ├── nginx/                  # Reverse proxy
│   └── postgres/               # Init scripts
├── docs/                       # Documentação
├── scripts/                    # Automação (setup, backup, etc.)
├── .env.example
├── .github/
│   └── workflows/              # CI/CD
└── README.md
```

---

## 2. PILARES DA ARQUITETURA

### 2.1 Clean Architecture (MVC)
```
┌─────────────────────────────────────┐
│         ROUTES (HTTP)               │
├─────────────────────────────────────┤
│         CONTROLLERS (I/O)           │
├─────────────────────────────────────┤
│         SERVICES (Regras)           │
├─────────────────────────────────────┤
│         MODELS (Dados)              │
├─────────────────────────────────────┤
│     INFRASTRUCTURE (DB/Docker)      │
└─────────────────────────────────────┘
```

### 2.2 Regras de Código Obrigatórias
- ✅ **JSDoc** em toda função (descrição, @param, @returns)
- ✅ **Injeção de dependências** para testabilidade
- ✅ **Error handling** centralizado (nunca stack trace)
- ✅ **Transações** em operações multi-tabela
- ✅ **Validação de entrada** em todos endpoints
- ✅ **RBAC** (admin, operator, financial)
- ✅ **Variáveis de ambiente** para credenciais

---

## 3. FASE 0 - AMBIENTE DE DESENVOLVIMENTO

### ⏱️ Estimativa: 1 dia

### Passo 1: Configurar PostgreSQL via Docker

```bash
# Criar docker-compose.yml na raiz
docker-compose.yml:
```

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: erp-evok-postgres
    environment:
      POSTGRES_DB: erp_evok_audio
      POSTGRES_USER: evok_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - erp-network

  pgadmin:
    image: dpage/pgadmin4
    container_name: erp-evok-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@evokaudio.com.br
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "5050:80"
    networks:
      - erp-network

  app:
    build: ./server
    container_name: erp-evok-api
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: erp_evok_audio
      DB_USER: evok_admin
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    networks:
      - erp-network

volumes:
  postgres_data:

networks:
  erp-network:
    driver: bridge
```

### Passo 2: Migrar database.js de MySQL para PostgreSQL

```javascript
// server/src/config/database.js
const { Sequelize } = require('sequelize');

const config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'erp_evok_audio',
    username: process.env.DB_USER || 'evok_admin',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true }
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  }
};
```

### Passo 3: Atualizar .env.example

```env
# ============================================
# ERP EVOK ÁUDIO - Configuração
# ============================================

# Node
NODE_ENV=development
PORT=5000

# PostgreSQL (Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_evok_audio
DB_USER=evok_admin
DB_PASSWORD=Evok@Postgres2024!
DB_LOGGING=false
DB_SSL=false
DB_FORCE_SYNC=false

# JWT
JWT_SECRET=gerar-uma-chave-com-32-caracteres-aqui!
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Admin Seed
ADMIN_SEED_PASSWORD=REMOVED_CREDENTIAL

# Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limit
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# pgAdmin
PGADMIN_PASSWORD=Admin@pgAdmin2024!
```

### Passo 4: Remover dependências não utilizadas

```bash
npm uninstall mongoose --save
npm install pg pg-hstore --save
```

### ⚠️ Pontos de Atenção na Migração MySQL→PostgreSQL

| MySQL | PostgreSQL | Onde alterar |
|-------|-----------|--------------|
| `DataTypes.DECIMAL(10,2)` | `DataTypes.DECIMAL(10,2)` (igual) | Todos models |
| `DataTypes.ENUM` | `DataTypes.ENUM` (igual) | Todos models |
| `sequelize.literal('quantity - X')` | ❌ **TROCAR** por `increment()/decrement()` | saleController, purchaseController |
| `Op.like` | `Op.iLike` (case insensitive) | Todos controllers com busca |
| `utf8mb4` | ❌ Remover (PostgreSQL usa UTF-8 nativo) | database.js |

---

## 4. FASE 1 - CORREÇÕES CRÍTICAS

### ⏱️ Estimativa: 3-5 dias

### 🔴 Prioridade 1: Race Condition no Estoque (F10)

**Problema:** `sequelize.literal('quantity - X')` não é thread-safe.
Duas vendas simultâneas podem ler o mesmo estoque e ambas baixarem.

**Solução em 3 arquivos:**

#### 1. saleController.js - criar venda
```javascript
// ANTES (com race condition)
await Product.update(
  { quantity: sequelize.literal(`quantity - ${item.quantity}`) },
  { where: { id: item.product_id }, transaction: t }
);

// DEPOIS (thread-safe com lock)
const product = await Product.findByPk(item.product_id, { 
  transaction: t, 
  lock: t.LOCK.UPDATE  // Lock de escrita
});
if (!product) throw new Error(`Produto ID ${item.product_id} não encontrado`);
if (product.quantity < item.quantity) {
  throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
}
await product.decrement('quantity', { by: item.quantity, transaction: t });
```

#### 2. saleController.js - cancelar venda (restaurar estoque)
```javascript
// ANTES
await Product.update(
  { quantity: sequelize.literal(`quantity + ${item.quantity}`) },
  { where: { id: item.product_id }, transaction: t }
);

// DEPOIS
const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
await product.increment('quantity', { by: item.quantity, transaction: t });
```

#### 3. purchaseController.js - receber itens
```javascript
// ANTES
await Product.update(
  { quantity: sequelize.literal(`quantity + ${qty}`) },
  { where: { id: item.product_id }, transaction: t }
);

// DEPOIS
const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
await product.increment('quantity', { by: qty, transaction: t });
```

### 🔴 Prioridade 2: Integrar AuditLog em Todos Controllers (F20)

**Criar middleware de auditoria universal:**

```javascript
// server/src/middlewares/auditLogger.js
const AuditLog = require('../models/AuditLog');

/**
 * Middleware que registra automaticamente operações em audit log.
 * @param {Object} options - Configuração
 * @param {string} options.entityType - Nome da entidade (ex: 'sale')
 * @param {string} options.entityIdField - Campo do ID (ex: 'id')
 * @param {string[]} [options.trackedFields] - Campos a rastrear alterações
 * @param {string} [options.descriptionField] - Campo para descrição
 */
exports.audit = (options) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params[options.entityIdField] || body?.data?.id;
        const oldValues = req.oldValues; // Precisa ser carregado antes
        
        await AuditLog.register({
          userId: req.user?.id,
          action: req.method === 'POST' ? 'create' :
                  req.method === 'PUT' ? 'update' :
                  req.method === 'DELETE' ? 'soft_delete' : 'other',
          entityType: options.entityType,
          entityId,
          oldValues,
          newValues: req.method === 'GET' ? undefined : req.body,
          description: `${options.entityType} #${entityId}`,
          req
        });
      }
      return originalJson(body);
    };
    next();
  };
};
```

**Controllers que precisam de AuditLog (22):**

| # | Controller | Ações para Auditar |
|---|------------|--------------------|
| 1 | authController | login, register |
| 2 | userController | create, update, remove |
| 3 | clientController | create, update, remove |
| 4 | productController | create, update, remove |
| 5 | categoryController | create, update, remove |
| 6 | supplierController | create, update, remove |
| 7 | saleController | create, updateStatus |
| 8 | purchaseController | create, update, receiveItems |
| 9 | financeController | createPayable, receivePayment, payPayable |
| 10 | inventoryController | create (movement) |
| 11 | employeeController | create, update, remove |
| 12 | departmentController | create, update, remove |
| 13 | productionOrderController | create, updateStatus |
| 14 | serviceOrderController | create, update, remove |
| 15 | assetController | create, update, remove |
| 16 | nonConformityController | create, update, remove |
| 17 | maintenanceController | create, update, remove |
| 18 | mobileInventoryController | create (movement) |
| 19 | serviceOrderController | create, update |
| 20 | assetController | create, update |
| 21 | supplyController | create, update |
| 22 | clientController | create, update |

### ⚠️ Prioridade 3: AccountPayable na Aprovação (F21)

**Problema:** Atualmente gera conta a pagar apenas no recebimento total dos itens.
O correto é gerar na **aprovação** da compra.

**Arquivo:** `purchaseController.js`

```javascript
// Dentro de updateStatus, quando status = 'approved'
if (status === 'approved') {
  const totalPayable = parseFloat(purchase.total_amount) || 0;
  if (totalPayable > 0) {
    const dueDate = purchase.expected_date
      ? new Date(new Date(purchase.expected_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    await AccountPayable.create({
      description: `Fornecimento ${purchase.order_number}`,
      amount: totalPayable,
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'pending',
      category: 'Fornecedores',
      supplier_id: purchase.supplier_id,
      purchase_id: purchase.id,
      notes: `Gerado na aprovação do pedido ${purchase.order_number}`
    }, { transaction: t });
  }
}
```

### ⚠️ Prioridade 4: Arredondamento Preciso de Parcelas (F24)

**Arquivo:** `saleController.js`

```javascript
// Cálculo preciso de parcelas
const totalNet = Math.round((totalAmount - parsedDiscount) * 100) / 100;
const baseInstallment = Math.floor((totalNet / installments) * 100) / 100;
const remainder = Math.round((totalNet - baseInstallment * installments) * 100) / 100;

for (let i = 1; i <= installments; i++) {
  const amount = i === installments 
    ? Math.round((baseInstallment + remainder) * 100) / 100 
    : baseInstallment;
  
  // Garantir que a soma = totalNet
  // ...
}
```

### ⚠️ Prioridade 5: Sistema de Reserva de Estoque (F22)

**Problema:** Quotes (status 'quote') não reservam estoque. Outra venda pode consumir o estoque que estava disponível no momento da cotação.

**Arquivo 1:** `server/src/models/Product.js` - Adicionar campo

```javascript
const Product = sequelize.define('Product', {
  // ... campos existentes ...
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  reserved_quantity: { type: DataTypes.INTEGER, defaultValue: 0 }, // NOVO
  available_quantity: { // VIRTUAL: calculado como quantity - reserved_quantity
    type: DataTypes.VIRTUAL,
    get() { return this.quantity - this.reserved_quantity; }
  },
  // ...
});
```

**Arquivo 2:** `saleController.js` - Reservar ao criar quote

```javascript
// Ao criar venda com status 'quote':
for (const item of processedItems) {
  const product = await Product.findByPk(item.product_id, { 
    transaction: t, 
    lock: t.LOCK.UPDATE 
  });
  const available = product.quantity - product.reserved_quantity;
  if (available < item.quantity) {
    throw new Error(`Estoque disponível insuficiente para ${product.name}. Disponível: ${available}`);
  }
  await product.increment('reserved_quantity', { by: item.quantity, transaction: t });
}

// Ao confirmar quote (updateStatus → confirmed):
for (const item of sale.items) {
  const product = await Product.findByPk(item.product_id, { 
    transaction: t, 
    lock: t.LOCK.UPDATE 
  });
  await product.decrement('reserved_quantity', { by: item.quantity, transaction: t });
  await product.decrement('quantity', { by: item.quantity, transaction: t });
}

// Ao cancelar quote (updateStatus → canceled):
for (const item of sale.items) {
  const product = await Product.findByPk(item.product_id, { 
    transaction: t, 
    lock: t.LOCK.UPDATE 
  });
  await product.decrement('reserved_quantity', { by: item.quantity, transaction: t });
}
```

---

## 5. FASE 2 - INFRAESTRUTURA

### ⏱️ Estimativa: 2-3 dias

### Passo 1: Dockerfile do Backend

```dockerfile
# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema (para bcrypt, pg)
RUN apk add --no-cache python3 make g++

# Copiar package.json e instalar
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads && chown -R node:node uploads

# Usuário não-root
USER node

EXPOSE 5000

CMD ["node", "index.js"]
```

### Passo 2: Dockerfile do Frontend (React)

```dockerfile
# client/Dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Passo 3: Nginx Config

```nginx
# docker/nginx/default.conf
server {
    listen 80;
    server_name app.evokaudio.com.br;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
    }
}
```

### Passo 4: Script de Setup para Ubuntu 24.04

```bash
#!/bin/bash
# scripts/setup-ubuntu.sh
# ============================================
# Setup do ERP EVOK ÁUDIO em Ubuntu 24.04
# ============================================

set -e

echo "🚀 Iniciando setup do ERP EVOK ÁUDIO..."

# 1. Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 3. Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Clonar repositório
git clone https://github.com/sua-empresa/erp-evok-audio.git /opt/erp-evok-audio
cd /opt/erp-evok-audio

# 5. Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar com suas credenciais

# 6. Subir containers
docker compose up -d

# 7. Verificar logs
docker compose logs -f

echo "✅ Setup concluído!"
echo "📌 API: http://localhost:5000"
echo "📌 pgAdmin: http://localhost:5050"
echo "📌 Frontend: http://localhost:80"
```

### Passo 5: Cloudflare Tunnel

```bash
# scripts/setup-cloudflare.sh
# ============================================
# Configurar Cloudflare Tunnel
# ============================================

# 1. Instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 2. Autenticar
cloudflared tunnel login

# 3. Criar tunnel
cloudflared tunnel create erp-evok-audio

# 4. Configurar DNS
cloudflared tunnel route dns erp-evok-audio app.evokaudio.com.br

# 5. Criar config
cat > ~/.cloudflared/config.yml << EOF
tunnel: erp-evok-audio
credentials-file: /root/.cloudflared/erp-evok-audio.json

ingress:
  - hostname: app.evokaudio.com.br
    service: http://localhost:80
  - service: http_status:404
EOF

# 6. Executar como serviço
cloudflared service install
```

---

## 6. FASE 3 - FRONTEND REACT

### ⏱️ Estimativa: 20-30 dias

### Tecnologias
- **Vite** (build rápido)
- **React 18** + TypeScript
- **React Router v6** (navegação)
- **Axios** (API calls)
- **TailwindCSS** (estilização rápida)
- **Zustand** (estado global leve)
- **React Hook Form** (formulários)
- **React Query** (cache e sincronização)

### Estrutura de Páginas

```
client/src/pages/
├── Login.tsx
├── Dashboard.tsx
├── clients/
│   ├── ClientList.tsx
│   ├── ClientForm.tsx
│   └── ClientDetail.tsx
├── products/
│   ├── ProductList.tsx
│   ├── ProductForm.tsx
│   └── ProductDetail.tsx
├── sales/
│   ├── SaleList.tsx
│   ├── SaleForm.tsx      # + itens, parcelas
│   └── SaleDetail.tsx
├── purchases/
│   ├── PurchaseList.tsx
│   ├── PurchaseForm.tsx
│   └── PurchaseReceive.tsx
├── finance/
│   ├── ReceivableList.tsx
│   ├── PayableList.tsx
│   └── CashFlow.tsx
├── production/
│   ├── ProductionOrderList.tsx
│   └── ProductionOrderForm.tsx
├── inventory/
│   ├── MovementList.tsx
│   └── MovementForm.tsx
├── employees/
│   ├── EmployeeList.tsx
│   └── EmployeeForm.tsx
├── assets/
│   ├── AssetList.tsx
│   └── AssetForm.tsx
├── quality/
│   ├── NonConformityList.tsx
│   └── NonConformityForm.tsx
├── maintenance/
│   ├── MaintenanceList.tsx
│   └── MaintenanceForm.tsx
└── reports/
    ├── SalesReport.tsx
    ├── InventoryReport.tsx
    └── CashFlowReport.tsx
```

### Ordem de Criação Recomendada

| Etapa | Páginas | Dias |
|-------|---------|------|
| 1 | Login, Layout, Dashboard | 2 |
| 2 | Clientes, Produtos, Categorias, Fornecedores | 4 |
| 3 | Vendas (com itens e parcelas) | 4 |
| 4 | Compras (com recebimento) | 3 |
| 5 | Financeiro (receber, pagar, fluxo) | 3 |
| 6 | Estoque, Produção | 3 |
| 7 | RH, Ativos | 2 |
| 8 | Qualidade, Manutenção | 2 |
| 9 | Relatórios | 2 |
| 10 | Refinamentos, testes | 3 |

### Template de Componente

```tsx
// client/src/components/SaleForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSale } from '../services/saleService';
import { listClients } from '../services/clientService';
import { listProducts } from '../services/productService';
import { formatCurrency } from '../utils/format';

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function SaleForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  const loadCustomers = async () => {
    const { data } = await listClients({ limit: 100 });
    setCustomers(data.data);
  };

  const loadProducts = async () => {
    const { data } = await listProducts({ limit: 100 });
    setProducts(data.data);
  };

  const addItem = (productId: number) => {
    const product = products.find(p => p.id === productId);
    setItems([...items, {
      product_id: productId,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      total_price: product.price
    }]);
  };

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    newItems[index][field] = value;
    newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createSale({
        customer_id: parseInt(selectedCustomer),
        items: items.map(({ product_id, quantity, unit_price }) => ({
          product_id, quantity, unit_price
        })),
        payment_method: paymentMethod,
        installments
      });
      navigate('/sales');
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao criar venda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Venda</h1>
      
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium">Cliente</label>
        <select
          value={selectedCustomer}
          onChange={e => setSelectedCustomer(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300"
          required
        >
          <option value="">Selecione...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Itens */}
      <div>
        <label className="block text-sm font-medium">Produtos</label>
        <select
          onChange={e => e.target.value && addItem(parseInt(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300"
        >
          <option value="">Adicionar produto...</option>
          {products.filter(p => p.status === 'active').map(p => (
            <option key={p.id} value={p.id}>
              {p.name} - {formatCurrency(p.price)} (Estoque: {p.quantity})
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de Itens */}
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço Unit.</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.product_name}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))}
                  className="w-20"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                  className="w-24"
                />
              </td>
              <td>{formatCurrency(item.total_price)}</td>
              <td>
                <button type="button" onClick={() => removeItem(index)}>
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right font-bold">Total:</td>
            <td className="font-bold">{formatCurrency(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Pagamento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Forma de Pagamento</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="pix">PIX</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="debit_card">Cartão de Débito</option>
            <option value="boleto">Boleto</option>
            <option value="transfer">Transferência</option>
            <option value="cash">Dinheiro</option>
          </select>
        </div>
        <div>
          <label>Parcelas</label>
          <input
            type="number"
            min="1"
            max="12"
            value={installments}
            onChange={e => setInstallments(parseInt(e.target.value))}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
      >
        {loading ? 'Salvando...' : 'Finalizar Venda'}
      </button>
    </form>
  );
}
```

---

## 7. FASE 4 - MÓDULOS INDUSTRIAIS

### ⏱️ Estimativa: 10-15 dias

### Módulo 1: MRP Engine (BOM Explosion)

**Já implementado parcialmente** - Precisa integrar com PCP:

```javascript
// services/bomService.js - JÁ EXISTE
// Precisa adicionar:

async function generateMRP(salesOrderId) {
  // 1. Pegar produtos da venda
  // 2. Explodir BOM de cada produto
  // 3. Calcular necessidades brutas
  // 4. Subtrair estoque disponível
  // 5. Gerar recomendações de compra/produção
  // 6. Sugerir ordens de produção para itens 'finished'
  // 7. Sugerir pedidos de compra para itens 'raw_material'
}
```

### Módulo 2: Folha de Pagamento (Payroll)

```javascript
// models/Payroll.js
const Payroll = sequelize.define('Payroll', {
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  reference_month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
  reference_year: { type: DataTypes.INTEGER, allowNull: false },
  gross_salary: { type: DataTypes.DECIMAL(10, 2) },
  base_inss: { type: DataTypes.DECIMAL(10, 2) },
  base_irrf: { type: DataTypes.DECIMAL(10, 2) },
  inss_value: { type: DataTypes.DECIMAL(10, 2) },
  irrf_value: { type: DataTypes.DECIMAL(10, 2) },
  fgts_value: { type: DataTypes.DECIMAL(10, 2) },
  net_salary: { type: DataTypes.DECIMAL(10, 2) },
  overtime_hours: { type: DataTypes.DECIMAL(10, 1) },
  overtime_value: { type: DataTypes.DECIMAL(10, 2) },
  absences: { type: DataTypes.INTEGER },
  vacation_days: { type: DataTypes.INTEGER },
  thirteenth_salary: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('calculated', 'paid', 'canceled'), defaultValue: 'calculated' },
  payment_date: DataTypes.DATEONLY
});
```

### Módulo 3: NFe Integration

```javascript
// services/nfeService.js
class NFeService {
  static async generateNFe(saleId) {
    // 1. Buscar dados da venda (cliente, itens, impostos)
    // 2. Calcular impostos (ICMS, IPI, PIS, COFINS)
    // 3. Montar XML conforme schema da SEFAZ
    // 4. Assinar digitalmente
    // 5. Enviar para SEFAZ
    // 6. Atualizar status da venda
    // 7. Salvar chave de acesso
  }
  
  static async cancelNFe(nfeKey) {
    // 1. Montar XML de cancelamento
    // 2. Enviar para SEFAZ
    // 3. Atualizar status
  }
  
  static async calculateTaxes(product, customer, amount) {
    // Cálculo de ICMS baseado no cliente (origem/destino)
    // Cálculo de IPI baseado no NCM
    // Cálculo de PIS/COFINS
  }
}
```

### Módulo 4: Cálculo de ICMS Interestadual

```javascript
// services/taxService.js
const ICMS_TABLE = {
  'SP': { 'SP': 18, 'default': 12 },
  'MG': { 'SP': 12, 'default': 12 },
  'RJ': { 'SP': 12, 'default': 12 },
  'RS': { 'SP': 12, 'default': 12 },
  'SC': { 'SP': 12, 'default': 12 },
  'PR': { 'SP': 12, 'default': 12 },
  'default': { 'default': 7 } // Norte, Nordeste, Centro-Oeste
};

class TaxService {
  static getICMSRate(originState, destinationState) {
    const origin = ICMS_TABLE[originState] || ICMS_TABLE['default'];
    return origin[destinationState] || origin['default'] || 7;
  }
}
```

---

## 8. FASE 5 - QUALIDADE E TESTES

### ⏱️ Estimativa: 5-7 dias

### Testes Unitários com Jest

```javascript
// server/__tests__/validators.test.js
const Validators = require('../src/utils/validators');

describe('Validators', () => {
  describe('isValidCPF', () => {
    test('CPF válido 529.982.247-25', () => {
      expect(Validators.isValidCPF('529.982.247-25')).toBe(true);
    });
    test('CPF inválido sequência', () => {
      expect(Validators.isValidCPF('111.111.111-11')).toBe(false);
    });
    test('CPF vazio', () => {
      expect(Validators.isValidCPF('')).toBe(false);
    });
  });

  describe('isValidCNPJ', () => {
    test('CNPJ válido', () => {
      expect(Validators.isValidCNPJ('11.444.777/0001-61')).toBe(true);
    });
    test('CNPJ inválido', () => {
      expect(Validators.isValidCNPJ('00.000.000/0000-00')).toBe(false);
    });
  });
});
```

### Testes de Integração com Supertest

```javascript
// server/__tests__/auth.test.js
const request = require('supertest');
const app = require('../index');

describe('POST /api/auth/login', () => {
  test('deve retornar token para credenciais válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: 'REMOVED_CREDENTIAL' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('deve retornar 401 para senha inválida', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@evokaudio.com.br', password: 'wrong' });
    
    expect(res.status).toBe(401);
  });
});
```

### Cobertura de Testes Recomendada

| Módulo | Testes | Prioridade |
|--------|--------|------------|
| Validators | Unitários (CPF, CNPJ, sanitize) | 🔴 Alta |
| Auth | Integração (login, register, me) | 🔴 Alta |
| Sales | Integração (criar, cancelar, estoque) | 🔴 Alta |
| Purchases | Integração (criar, receber) | 🔴 Alta |
| Finance | Integração (receber, pagar, fluxo) | ⚠️ Média |
| Products | Integração (CRUD, estoque) | ⚠️ Média |
| Clients | Integração (CRUD, validação doc) | ⚠️ Média |
| Error Handler | Unitário (cada tipo de erro) | 🟡 Baixa |

---

## 9. FASE 6 - DEVOPS E PRODUÇÃO

### ⏱️ Estimativa: 3-5 dias

### CI/CD com GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy ERP EVOK

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/erp-evok-audio
            git pull origin main
            docker compose down
            docker compose build --no-cache
            docker compose up -d
            docker system prune -f
```

### Backup Automático

```bash
#!/bin/bash
# scripts/backup.sh
# ============================================
# Backup do banco PostgreSQL
# ============================================
# Agendar no crontab: 0 2 * * * /opt/erp-evok-audio/scripts/backup.sh

BACKUP_DIR="/backups/erp-evok"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="erp_evok_audio"
DB_USER="evok_admin"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Backup do banco
docker exec erp-evok-postgres pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /opt/erp-evok-audio server/uploads

# Remover backups antigos
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup concluído: $DATE"
```

### Monitoramento

```bash
# scripts/monitoring.sh
# Monitorar saúde do sistema

# 1. Verificar containers
docker ps --filter "name=erp-evok" --format "{{.Names}} {{.Status}}"

# 2. Verificar uso de disco
df -h /var/lib/docker/volumes/erp-evok-audio_postgres_data/

# 3. Verificar logs de erro
docker logs erp-evok-api --since 1h | grep "ERROR"

# 4. Testar health check
curl -f http://localhost:5000/api || echo "API offline!"
```

---

## 10. CHECKLIST FINAL

### 📋 Checklist de GO-LIVE

#### 🔴 Crítico (obrigatório para produção)
- [ ] **F1** - Race condition no estoque corrigida (saleController, purchaseController)
- [ ] **F2** - AuditLog integrado em todos controllers
- [ ] **F3** - PostgreSQL rodando em Docker
- [ ] **F4** - Frontend React com login funcional
- [ ] **F5** - Backup automático configurado
- [ ] **F6** - SSL/HTTPS via Cloudflare
- [ ] **F7** - Todos os 15 bugs críticos corrigidos

#### ⚠️ Alto (importante para operação)
- [ ] **A1** - Reserva de estoque para quotes
- [ ] **A2** - AccountPayable na aprovação da compra
- [ ] **A3** - Arredondamento preciso de parcelas
- [ ] **A4** - Testes de integração das vendas
- [ ] **A5** - Rate limiters específicos por endpoint
- [ ] **A6** - Sanitização de upload (path traversal)

#### 🟡 Médio (melhorias)
- [ ] **M1** - Depreciação automática de ativos
- [ ] **M2** - Notificações de estoque baixo
- [ ] **M3** - Comissão de vendas
- [ ] **M4** - Relatórios exportáveis (PDF/Excel)
- [ ] **M5** - Logging estruturado (Winston)
- [ ] **M6** - CI/CD pipeline

#### 🟢 Desejável (futuro)
- [ ] **D1** - Módulo NFe
- [ ] **D2** - Folha de pagamento
- [ ] **D3** - Logística/Expedição
- [ ] **D4** - Testes acústicos na qualidade
- [ ] **D5** - Módulo tributário completo
- [ ] **D6** - Aplicativo mobile (React Native)

---

### 📊 Estimativa Total de Esforço

| Fase | Dias | Responsável |
|------|------|-------------|
| **F0** - Ambiente | 1 | Você |
| **F1** - Correções Críticas | 3-5 | Você |
| **F2** - Infraestrutura | 2-3 | Você |
| **F3** - Frontend React | 20-30 | Você |
| **F4** - Módulos Industriais | 10-15 | Você |
| **F5** - Testes | 5-7 | Você |
| **F6** - DevOps | 3-5 | Você |
| **Total** | **~60 dias** | |

---

### 🚀 Ordem Recomendada de Execução

```
Semana 1-2:  F0 + F1 (Ambiente + Correções)
Semana 3-4:  F2 (Infraestrutura Docker)
Semana 5-10: F3 (Frontend React - 80% do esforço)
Semana 11-12: F4 (Módulos Industriais)
Semana 13:   F5 (Testes)
Semana 14:   F6 (DevOps + GO-LIVE)
```

---

> **Última atualização:** Roadmap completo para produção
> **Status atual:** 57% implementado (backend funcional, frontend pendente)
> **Próximo passo:** Corrigir race condition no estoque (F1)
