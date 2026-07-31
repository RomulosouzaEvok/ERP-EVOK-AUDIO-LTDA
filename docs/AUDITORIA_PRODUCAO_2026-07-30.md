# 🔍 AUDITORIA DE PRONTIDÃO PARA PRODUÇÃO — ERP EVOK AUDIO

**Data**: 2026-07-30  
**Auditor**: Principal Engineer / AppSec  
**Escopo**: Segurança, integridade de dados, desempenho, operação, recuperação  
**Stack**: Node.js, TypeScript, Express, PostgreSQL 16, Sequelize, JWT, Jest, Docker Compose  

---

## 📋 RESUMO EXECUTIVO

### **DECISÃO: 🛑 BLOQUEAR PRODUÇÃO**

Existem **4 achados P0 (BLOQUEADOR)** e **7 achados P1 (CRÍTICO)** que impedem go-live com segurança:

1. **Entrypoints duplicados e divergentes** (`index.ts` vs `app.ts`) — código testado não é o que roda.
2. **Build artifact nunca é usado** — produção roda `tsx index.ts` com `tsx` em devDependencies.
3. **SSL em produção desabilita verificação de certificado** — `rejectUnauthorized: false`.
4. **Destruição de dados possível por variável de ambiente** — `DB_FORCE_SYNC=true` em produção.

Além disso, **sem nenhum P0/P1 fechado, o sistema não deve entrar em produção**. A auditoria identificou:

- Autorização RBAC incompleta (operações financeiras abertas a qualquer usuário autenticado)
- Race conditions em transações de venda/compra/produção sem lock pessimista em nível correto
- Nenhum endpoint de troca de senha (invalidação de sessão impossível pós-ataque)
- Taxa de limite em memória (falha em scaling horizontal)
- CI/CD ausente; Dockerfile não fornecido
- Testes de integração/concorrência pulados silenciosamente

**Recomendação**: Interromper go-live. Implementar correções críticas em ciclo separado (2–3 sprints). Reauditar antes de qualify.

---

## 🔴 ACHADOS P0 — BLOQUEADORES

### AUD-0001 | Entrypoints Duplicados e Divergentes

**Severidade**: P0  
**Status**: Confirmado  
**Título**: Código de produção (`index.ts`) diverge de código testado (`app.ts`)

**Evidência**:
- `server/index.ts:14` — `const app = express()` com rotas, middleware e erro handler duplicados inline.
- `server/app.ts:16` — mesmo `app` gerado em módulo separado, **NUNCA IMPORTADO** por `index.ts`.
- Testes de integração: `testApi.ts` faz `import app from '../../../app'` (app.ts).
- Produção: `npm start` → `tsx index.ts` — índice diferente.

**Cenário de falha**:
1. Desenvolvedor testa com `app.ts` (isolado, sem DB no bootstrap).
2. Testes passam.
3. Produção executa `index.ts` (com connectDB + seeds automáticos + rate limiting em memória).
4. Comportamento diferente não é detectado até deploy.

**Impacto técnico**: Desconexão entre testabilidade e realidade de produção; mudanças acidentais a apenas um entrypoint não se propagam.

**Impacto de negócio**: Regressões, falhas silenciosas, impossibilidade de auditar comportamento exato em produção.

**Causa raiz**: Migração de CommonJS para TypeScript parcial; `app.ts` foi criado para isolar middleware mas nunca consolidada com `index.ts`.

**Correção recomendada**:
1. `app.ts` **é o único entrypoint** de rotas/middleware — toda a lógica vive ali.
2. `index.ts` importa `app` de `app.ts`, chama `connectDB()` e `.listen()` — nada mais.
3. Testes importam `app` de `app.ts` (já faz isto).
4. Remover duplicação de código.

**Teste de regressão**: Ambos os caminhos (testes via app.ts, produção via index.ts) devem ter comportamento idêntico — mesmos middlewares, rotas, handlers.

---

### AUD-0002 | Build Artifact Nunca Usado; Produção Roda `tsx` de devDependencies

**Severidade**: P0  
**Status**: Confirmado  
**Título**: Produção depende de `tsx` em devDependencies sem build artifact compilado

**Evidência**:
- `server/package.json:6` — `"start": "tsx index.ts"`
- `server/package.json:46,48` — `tsx` e `zod` em `devDependencies`, não em `dependencies`.
- Build gera `dist/` com sucesso (`npm run build` → tsc sem erros).
- **Nenhum arquivo gerado em `dist/` é executado** — produção ignora `dist/`.
- `npm ci --omit=dev` em produção **quebra o boot** (falta `tsx`).

**Cenário de falha**:
```bash
npm ci --omit=dev  # Instalação limpa de produção
npm start          # Erro: tsx não encontrado
```

**Impacto técnico**: Dependência circular — produção sem devDependencies não roda. Impossível escalar de forma reproduzível.

**Impacto de negócio**: Deploy falha silenciosamente ou requer devDependencies em produção (aumento de attack surface, tamanho de imagem Docker).

**Causa raiz**: Build pipeline criado mas nunca integrado ao start de produção.

**Correção recomendada**:
1. Mover `tsx` para `dependencies` (necessário em produção).
2. Ou: `"start": "node dist/index.js"` — requer `npm run build` antes de `npm start` no Dockerfile/CI.
3. Preferência: build artifact em CI, imagem Docker com apenas `dependencies`.

**Teste de regressão**: `npm ci --omit=dev && npm start` deve funcionar sem erros.

---

### AUD-0003 | SSL em Produção Desabilita Verificação de Certificado

**Severidade**: P0  
**Status**: Confirmado  
**Título**: Conexão PostgreSQL com `rejectUnauthorized: false` permite MITM

**Evidência**:
- `server/src/config/database.ts:42–48`:
```typescript
if (isProd && sslEnabled) {
  baseConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,  // ← VULNÁVEL
    },
  };
}
```

**Cenário de falha**:
1. Attacker intercepta conexão TLS PostgreSQL (no proxy corporativo, compromesso de ISP, etc).
2. Certificado auto-assinado ou falso é apresentado.
3. `rejectUnauthorized: false` **aceita qualquer certificado**.
4. Credenciais de banco são enviadas ao attacker em texto claro (após decriptação de MITM).

**Pré-condições**: SSL ativado em produção (`DB_SSL=true`) + rede não confiável.

**Impacto técnico**: Comprometimento de todas as credenciais de banco; acesso a dados de clientes, financeiro, produção sem detecção.

**Impacto de negócio**: LGPD/privacidade, conformidade, roubo de dados, perda de confiança.

**Causa raiz**: Configuração copiada de um template de desenvolvimento sem adaptação.

**Correção recomendada**:
1. **REMOVER `rejectUnauthorized: false`** — Sequelize por padrão valida certificados.
2. Se certificado auto-assinado é inevitável: fornecê-lo via `ca: [fs.readFileSync(...)]` em vez de desabilitar validação.
3. Certificados de produção devem vir de CA confiável (ex.: AWS RDS, Hostinger, Let's Encrypt para MITM detection).

**Teste de regressão**: Certificado PostgreSQL válido e verificável; conexão falha se certificado for inválido (teste com cert falso).

---

### AUD-0004 | Variável de Ambiente Permite Destruição de Dados em Produção

**Severidade**: P0  
**Status**: Confirmado  
**Título**: `DB_FORCE_SYNC=true` executa `sequelize.sync({force: true})` mesmo em produção

**Evidência**:
- `server/config/db.ts:12–20`:
```typescript
const force = process.env.DB_FORCE_SYNC === 'true';
const alter = process.env.DB_AUTO_ALTER === 'true' 
  && allowUnsafeAlter 
  && process.env.NODE_ENV !== 'production';

if (force) {
  console.log('⚠️ Forçando recriação das tabelas...');
}

if (force || alter) {
  await sequelize.sync({ force, alter: !force && alter });
```

**Cenário de falha**:
1. Desenvolvedor configura `DB_FORCE_SYNC=true` por acidente em produção.
2. Servidor inicia.
3. **Todas as tabelas são truncadas e recriadas** — dados históricos, produtos, estoque, vendas, financeiro perdidos.
4. **Nenhum backup foi acionado automaticamente** — dados perdidos permanentemente (a menos que backup externo exista).

**Pré-condições**: Acesso a variáveis de ambiente de produção + error na configuração.

**Impacto técnico**: Perda total de dados; impossível recuperar sem backup offline.

**Impacto de negócio**: Parada operacional completa; conformidade (LGPD); perda de receita.

**Causa raiz**: Flag de sincronização não foi protegida contra ativação acidental em produção.

**Correção recomendada**:
1. **NUNCA permitir `force` ou `alter` em produção**, independentemente da variável.
2. Código:
```typescript
const allowSync = process.env.NODE_ENV !== 'production';
const force = allowSync && process.env.DB_FORCE_SYNC === 'true';
const alter = allowSync && process.env.DB_AUTO_ALTER === 'true' && process.env.DB_ALLOW_UNSAFE_ALTER === 'true';
```
3. CI/CD deve validar que `DB_FORCE_SYNC` **não está definido** em produção (pré-deploy check).

**Teste de regressão**: Tentar `DB_FORCE_SYNC=true npm start` em NODE_ENV=production falha com erro claro (não executa sync).

---

## 🔴 ACHADOS P1 — CRÍTICOS

### AUD-0005 | Autorização RBAC Incompleta — Operações Financeiras Abertas

**Severidade**: P1  
**Status**: Confirmado  
**Título**: Qualquer usuário autenticado pode baixar recebível/pagável; sem validação de `role`

**Evidência**:
- `server/src/modules/financial/presentation/routes/finance.ts:14–20`:
```typescript
router.get('/receivable', authenticate, financialController.listReceivable);
router.put('/receivable/:id/pay', authenticate, financialController.receivePayment);  // ← SEM ROLE
router.post('/payable', authenticate, authorize('admin', 'financial'), financialController.createPayable);
router.put('/payable/:id/pay', authenticate, financialController.payPayable);  // ← SEM ROLE
```

**Cenário de exploração**:
1. Usuário `operator` (permissão de estoque) faz login normalmente.
2. Faz `PUT /api/finance/receivable/123/pay` com `{ payment_date, payment_method, amount }`.
3. Middleware `authenticate` passa (token válido).
4. Controller não valida `role` — assume que chegou até aqui = autorizado.
5. Conta é marcada como paga; fluxo de caixa e conformidade são adulterados.

**Pré-condições**: Usuário com token JWT válido; qualquer `role` (operator, financial, admin).

**Impacto técnico**: Contabilidade adulterada; contas a pagar/receber não sincronizadas com caixa real.

**Impacto de negócio**: Fraude interna; LGPD/conformidade; decisões financeiras erradas.

**Causa raiz**: Rota `/receivable/:id/pay` não restringe para `role: 'financial'` (diferente de POST payable que o faz).

**Correção recomendada**:
```typescript
router.put('/receivable/:id/pay', authenticate, authorize('admin', 'financial'), financialController.receivePayment);
router.put('/payable/:id/pay', authenticate, authorize('admin', 'financial'), financialController.payPayable);
```

**Teste de regressão**: Teste com `role: 'operator'` → 403 Forbidden. Teste com `role: 'financial'` → 200 OK.

---

### AUD-0006 | Sem Lock Pessimista em Mudança de Status de Venda

**Severidade**: P1  
**Status**: Confirmado  
**Título**: Race condition — dois cancelamentos simultâneos de venda podem duplicar ajuste de estoque

**Evidência**:
- `server/src/modules/sales/infrastructure/sequelize/SequelizeSaleRepository.ts:81–86`:
```typescript
async findSaleWithItems(id, transaction) {
  return Sale.findByPk(id, {
    include: [{ model: SaleItem, as: 'items' }],
    transaction
    // ← SEM lock: transaction.LOCK.UPDATE
  });
}
```

**Cenário de falha**:
1. Thread A: `PUT /api/sales/123/status` → `{ status: 'canceled' }` inicia.
2. Thread B: `PUT /api/sales/123/status` → `{ status: 'canceled' }` inicia simultânea.
3. Ambas leem `Sale#123` (status='invoiced') sem lock.
4. Thread A executa: restaura 100x product#5 via `InventoryService.receive()`.
5. Thread B executa: restaura 100x product#5 via `InventoryService.receive()` **novamente**.
6. Estoque agora tem +200 de product#5, mas venda foi cancelada uma vez só.

**Pré-condições**: Duas requisições HTTP simultâneas para o mesmo endpoint; rede rápida o suficiente para race.

**Impacto técnico**: Estoque adulterado; contabilidade imprecisa; impossível rastrear valor real do estoque.

**Impacto de negócio**: Previsão de produção errada; OPEXs; impacto financeiro.

**Causa raiz**: `findSaleWithItems` não pede lock. `ChangeSaleStatusUseCase` assume leitura isolada.

**Correção recomendada**:
```typescript
async findSaleWithItems(id, transaction) {
  return Sale.findByPk(id, {
    include: [{ model: SaleItem, as: 'items' }],
    transaction,
    lock: transaction.LOCK.UPDATE  // ← Adicionar
  });
}
```

**Teste de regressão**: Teste de concorrência — lançar 2+ threads de cancelamento simultâneamente; verificar que ajuste de estoque ocorre uma única vez.

---

### AUD-0007 | Sem Endpoint de Troca de Senha

**Severidade**: P1  
**Status**: Confirmado  
**Título**: Usuário não consegue trocar senha; sessão comprometida nunca pode ser invalidada

**Evidência**:
- `server/src/modules/users/presentation/routes/users.ts` — lista rotas: list, getById, create, update, delete.
- `server/src/modules/auth/presentation/routes/auth.ts` — lista rotas: login, register, getMe.
- **Nenhuma rota para `POST /api/auth/change-password` ou similar**.

**Cenário de falha**:
1. Usuário `admin` tem senha comprometida (ex.: força bruta bem-sucedida, ataque MITM).
2. Attacker usa a senha roubada para entrar e fazer danos.
3. Usuário real tenta trocar a senha — **não há endpoint**.
4. Opção: Admin remove e recria o usuário (downtime).
5. Sessão antiga do attacker continua válida (token JWT válido por 7 dias).

**Pré-condições**: Comprom isso de senha + ausência de endpoint de mudança.

**Impacto técnico**: Impossibilidade de revogar acesso comprometido sem deletar conta.

**Impacto de negócio**: Segurança reduzida; conformidade (deve ter fluxo de reset seguro); impacto operacional.

**Causa raiz**: Feature não foi implementada; seeds testam validação de `ADMIN_SEED_PASSWORD`, mas mudança pós-criação não é suportada.

**Correção recomendada**:
1. Implementar `PUT /api/auth/change-password` com validação:
   - Requer token JWT válido (usuário autenticado).
   - Requer `old_password` (verificar contra hash).
   - Requer `new_password` (validar força/comprimento).
   - Atualiza `User.password`, invalida todos os tokens (logout global).
2. Implementar `POST /api/auth/forgot-password` (reset via email).

**Teste de regressão**: Teste troca de senha com admin; verificar que token antigo não funciona mais.

---

### AUD-0008 | Rate Limiting em Memória — Falha em Horizontal Scaling

**Severidade**: P1  
**Status**: Confirmado  
**Título**: `express-rate-limit` padrão (em memória) não funciona em múltiplas instâncias

**Evidência**:
- `server/app.ts:34–48`:
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, error: 'Muitas tentativas...' }
});
app.use('/api/auth/login', authLimiter);
```
- Nenhuma configuração de store distribuído (Redis, Memcached) — padrão é `new MemoryStore()`.
- Sem `trust proxy` configurado.

**Cenário de falha**:
1. Aplicação roda em 3 instâncias: inst#1, inst#2, inst#3 (load balancer).
2. Attacker tenta brute force de senha — 30 tentativas em 5 min.
3. Inst#1 contabiliza 10 tentativas — bloqueia attacker.
4. Attacker reorienta requisições para inst#2 (round-robin).
5. Inst#2 vê 0 tentativas — permite login.
6. Bloqueio é ineficaz.

**Pré-condições**: Múltiplas instâncias Node + balanceador de carga + sem Redis.

**Impacto técnico**: Proteção contra brute force falha; bypass de CAPTCHA/2FA lógico.

**Impacto de negócio**: Contas de usuário comprometidas; conformidade.

**Causa raiz**: Rate limiter não foi configurado para ambientes distribuídos.

**Correção recomendada**:
1. Adicionar Redis/Memcached:
```typescript
import RedisStore from 'rate-limit-redis';
import redis from 'redis';
const redisClient = redis.createClient({ host: process.env.REDIS_HOST });
const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient, prefix: 'rl:auth:' }),
  windowMs: 15 * 60 * 1000, max: 10
});
```
2. Configurar `trust proxy` se atrás de LB:
```typescript
app.set('trust proxy', 1);  // ou ['127.0.0.1', ...]
```

**Teste de regressão**: Deploy em 2 instâncias; verificar que rate limit é compartilhado entre elas.

---

### AUD-0009 | Sem Troca de Senha — Token JWT Permanece Válido 7 Dias

**Severidade**: P1  
**Status**: Confirmado  
**Título**: Sessão não é invalidada após mudança de senha (ou ataque)

**Evidência**:
- `server/src/modules/auth/infrastructure/jwt/TokenService.ts:17–21`:
```typescript
generateToken(userId: number): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  } as jwt.SignOptions);
}
```
- Token contém apenas `{ id }` — nenhum hash de senha, versão de session, ou timestamp.
- Middleware `authenticate` valida token + relê role do banco, mas **não invalida se senha mudou**.

**Cenário de falha**:
1. Attacker obtém token de `admin` (phishing, MITM, etc).
2. Token válido por 7 dias.
3. Admin muda senha (se endpoint existir).
4. Token antigo do attacker **ainda é válido** — middleware só valida JWT, role é relido.
5. Attacker continua autorizado por 7 dias.

**Pré-condições**: Comprometimento de token + mudança de senha não invalida token.

**Impacto técnico**: Acesso prolongado após revogação; impossível revogar token sem mudança de JWT_SECRET (que afetaria todos).

**Impacto de negócio**: Conformidade; segurança operacional comprometida.

**Causa raiz**: JWT stateless não tem mecanismo de revogação; mudança de senha não é ligada a invalidação de sessão.

**Correção recomendada**:
1. Ao mudar senha, incrementar versão de sessão (`User.password_version`).
2. Token inclui `{ id, passwordVersion }`.
3. Middleware valida que `passwordVersion` no token == banco:
```typescript
const user = await User.findByPk(decoded.id);
if (decoded.passwordVersion !== user.password_version) {
  res.status(401).json({ error: 'Sessão expirada; faça login novamente' });
}
```

**Teste de regressão**: Mudar senha; token antigo não funciona mais.

---

### AUD-0010 | Sem Dockerfile da Aplicação; Sem CI/CD

**Severidade**: P1  
**Status**: Confirmado  
**Título**: Sem build pipeline automatizado; deploy manual/ad-hoc

**Evidência**:
- Raiz do repo: nenhum `Dockerfile` para app (apenas `docker-compose.yml` para Postgres).
- `.github/workflows/` ausente — sem CI/CD.
- `docs/DEPLOY.md` vazio (sem runbook).

**Cenário de falha**:
1. Dev faz `npm install` localmente (node_modules com estado local).
2. Faz push para git.
3. Servidor de produção faz pull + `npm install` (pode divergir de lockfile).
4. Sem build artifact centralizado — cada instância compila diferente.
5. Testes não rodam automaticamente — regressões passam despercebidas.

**Pré-condições**: Deploy manual + sem testes de CI.

**Impacto técnico**: Inconsistência entre ambientes; impossibilidade de audit de artefato; regressões não detectadas.

**Impacto de negócio**: Downtime imprevisto; mudanças não testadas em prod.

**Causa raiz**: Infra de CI/CD nunca foi configurada (documentação menciona, código não existe).

**Correção recomendada**:
1. Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --omit=dev
COPY dist .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "index.js"]
```
2. GitHub Actions (`.github/workflows/ci.yml`):
   - Lint, typecheck, build, test (unit+integration com Postgres), audit.
   - Tag de versão imutável em push.
   - Deploy somente após CI passar.

**Teste de regressão**: CI deve falhar em vulnerabilidades detectadas por `npm audit`.

---

### AUD-0011 | Testes de Integração/Concorrência Pulados Silenciosamente

**Severidade**: P1  
**Status**: Confirmado  
**Título**: `npm test` passa 0 mas 5 suites de integração/edge não rodaram

**Evidência**:
- `server/tests/setup.ts` + `server/tests/helpers/testApi.ts`:
```typescript
export function hasIntegrationPrerequisites(): boolean {
  return integrationEnabled() && Boolean(process.env.TEST_AUTH_TOKEN) && Boolean(process.env.TEST_API_URL);
}
```
- Todas as suites de integração:
```typescript
const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;
describeIntegration('Stock Concurrency', () => { ... });
```
- Resultado: `npm test` → "Test Suites: 5 skipped, 12 passed" — nenhum erro, nenhum aviso.

**Cenário de falha**:
1. CI roda `npm test` em pipeline.
2. 5 suites pulam silenciosamente.
3. Regressão de concorrência (race condition de estoque, venda dupla) **não é detectada**.
4. Testes unitários passam.
5. Deploy acontece.
6. Produção falha com race condition.

**Pré-condições**: Ambiente de teste sem `RUN_INTEGRATION=true` + sem Postgres Docker.

**Impacto técnico**: Falsa sensação de segurança; testes críticos nunca rodam.

**Impacto de negócio**: Bugs de produção que deveriam ter sido pegos em teste; downtime.

**Causa raiz**: Pré-requisitos de integração nunca foram satisfeitos em CI; skip silencioso é confundido com sucesso.

**Correção recomendada**:
1. CI deve spinup Postgres via Docker (`docker-compose -f tests/docker-compose.test.yml up -d`).
2. Definir `RUN_INTEGRATION=true` antes de `npm test`.
3. Falhar CI se suites forem skipped (adicionar contagem de skips à threshold).
4. Alternativa: Fazer testes de integração como job separado em CI (mais claro).

**Teste de regressão**: `RUN_INTEGRATION=true npm test` deve executar todas as 17 suites (0 skipped).

---

### AUD-0012 | Dependências de Produção com Vulnerabilidades

**Severidade**: P1  
**Status**: Confirmado  
**Título**: 2 vulnerabilidades moderadas em dependências de produção

**Evidência**:
```bash
npm audit --omit=dev
# uuid <11.1.1: Missing buffer bounds check (GHSA-w5hq-g745-h8pq)
# Sequelize depends on uuid
# 2 moderate severities
```

**Cenário de exploração**: Incerto (GHSA-w5hq-g745-h8pq é de buffer bounds; o impacto em Node.js típico é baixo, mas pode vazar dados se UUID for processado com input não confiável).

**Impacto técnico**: Possível vazamento de memória ou corrupção de dados.

**Impacto de negócio**: Confidencialidade de dados de cliente/financeiro em risco.

**Causa raiz**: Lockfile não foi atualizado; uuid < 11.1.1 ainda em transitive dependency.

**Correção recomendada**:
1. `npm audit fix` (se breaking changes forem aceitáveis) ou manual update de uuid.
2. Sempre rodar `npm audit` pré-deploy.

**Teste de regressão**: `npm audit --omit=dev` retorna 0 vulnerabilidades.

---

## 📊 MATRIZ DE ROTAS × PAPÉIS

| Rota | Método | Autenticação | Autorização | Observação |
|------|--------|--------------|-------------|-----------|
| `/api/auth/login` | POST | Rate limit | Nenhuma | ✅ Correto |
| `/api/auth/register` | POST | Rate limit + admin | ✅ Restrita | ✅ Correto |
| `/api/auth/me` | GET | ✅ JWT | Nenhuma | ✅ Correto |
| **`/api/finance/receivable/:id/pay`** | PUT | ✅ JWT | ❌ **Aberta** | 🔴 P1 |
| **`/api/finance/payable/:id/pay`** | PUT | ✅ JWT | ❌ **Aberta** | 🔴 P1 |
| `/api/finance/payable` | POST | ✅ JWT | ✅ admin/financial | ✅ Correto |
| `/api/sales/*` | GET/POST/PUT | ✅ JWT | ❌ Nenhuma (qualquer role autenticada) | ⚠️ P2 (requer `role: financial` ou business owner) |
| `/api/purchases/*` | GET/POST/PUT | ✅ JWT | ❌ Nenhuma | ⚠️ P2 |
| `/api/inventory/*` | GET/POST | ✅ JWT | ❌ Nenhuma | ⚠️ P2 (estoque é crítico) |
| `/api/production-orders/*/create` | POST | ✅ JWT | ✅ admin/operator | ✅ Bom |
| `/api/users/*` | GET/POST/PUT/DELETE | ✅ JWT | ✅ admin | ✅ Correto |
| `/api/audit-logs` | GET | ✅ JWT | ✅ admin | ✅ Correto |

**Recomendação**: Definir matriz de negócio (por role, quem pode executar qual ação) e garantir que cada rota a respeita.

---

## 🔐 INVENTÁRIO DE SEGREDOS, VARIÁVEIS E DEPENDÊNCIAS

### Variáveis de Ambiente Críticas

| Var | Tipo | Padrão | Falha-Rápida? | Observação |
|-----|------|--------|---------------|-----------|
| `NODE_ENV` | string | development | ❌ Não (boot continua) | Deveria falhar se não for um de {development, test, production} |
| `JWT_SECRET` | string | Nenhum | ❌ Não (validado no primeiro request) | Deveria falhar no boot |
| `DB_PASSWORD` | string | `''` (vazio) | ❌ Não | Deveria falhar no boot (impossível logar com pass vazio) |
| `DB_HOST` | string | localhost | ✅ Sim (conectDB falha) | Bom |
| `DB_FORCE_SYNC` | boolean | false | ❌ Não (bom padrão, mas flag ativa sem proteção) | Deveria ser impossível em prod |
| `ADMIN_SEED_PASSWORD` | string | dev-only-change-me | ✅ Parcial (rejeita em prod) | Bom; deveria ser obrigatório em prod |
| `CORS_ORIGIN` | string | localhost:5173 / app.evokaudio.com.br | ⚠️ Parcial | Padrão flexível; deveria ser validado contra whitelist |

### Arquivo de Configuração Rastreado

- `.env.example` ✅ (contém apenas placeholders)
- `.env.docker.example` ✅ (contém apenas placeholders)
- `server/.env.example` ✅ (contém apenas placeholders)
- `.env` ❌ (não rastreado — bom)
- Histórico Git: nenhum segredo real encontrado (apenas placeholders e menções em docs)

**Conclusão**: Higiene de segredos é **boa**. Nenhum segredo real está rastreado. Recomendação: usar ferramenta de secret scanning (ex.: git-secrets, trufflehog) em CI.

### Dependências Críticas

| Pacote | Versão | Função | Risco |
|--------|--------|--------|-------|
| sequelize | ^6.37.8 | ORM | ✅ Stável, ainda mantido |
| express | ^4.18.2 | Framework | ✅ Stável |
| jsonwebtoken | ^9.0.2 | JWT | ✅ Stável |
| bcryptjs | ^2.4.3 | Hash de senha | ✅ Stável |
| **uuid** | via sequelize | Gerador de UUID | ⚠️ 2x vulnerable < 11.1.1 |
| decimal.js | ^10.6.0 | Matemática monetária | ✅ Stável |
| zod | ^4.4.3 | Validação | ✅ Stável (em devDependencies, usado em produção — **risco**) |
| **tsx** | ^4.23.1 | Runtime TS | ⚠️ Em devDependencies, necessário em prod |

---

## ✅ RESULTADO DE COMANDOS EXECUTADOS

### npm ci
```
added 497 packages in 7s
62 packages funding available
22 vulnerabilities (2 moderate, 20 high)
  - 2 moderate: uuid transitive (sequelize)
  - 20 high: devDependencies (@swc/jest, jest, etc) — não afetam prod
```

### npm run typecheck
```
✅ PASS (exit code 0)
Sem erros de tipo.
```

### npm run build
```
✅ PASS (exit code 0)
Gera dist/ com index.js, config/, src/ compilados.
Artefato nunca é usado em produção (npm start usa tsx).
```

### npm test
```
✅ PASS (exit code 0)
Test Suites: 5 skipped, 12 passed, 17 total
Tests: 7 skipped, 62 passed, 69 total
Time: 4.219s

Interpretação: Testes de integração/concorrência NÃO rodaram.
Sem RUN_INTEGRATION=true e TEST_AUTH_TOKEN, as 5 suites skippam silenciosamente.
Falsa sensação de cobertura.
```

### npm audit --omit=dev
```
2 moderate severity vulnerabilities (uuid < 11.1.1 via sequelize)
Nenhuma vulnerabilidade alta em dependências de produção.
```

### Secret Scan (git log + git ls-files)
```
✅ CLEAN — Nenhum segredo real encontrado.
Histórico contém apenas placeholders (CHANGE_ME_*) em .env examples e documentação.
```

---

## 📋 PLANO DE CORREÇÃO

### **Fase 1: Bloqueadores (ANTES do qualquer deploy de produção)**

1. **AUD-0001 (P0)**: Consolidar entrypoints.
   - Tempo: 2–4 horas
   - Dono: Tech Lead
   - Verificação: Testes + deploy de canário rodando mesmo código.

2. **AUD-0002 (P0)**: Mover `tsx` para dependencies ou usar build artifact.
   - Tempo: 2 horas
   - Dono: DevOps
   - Verificação: `npm ci --omit=dev && npm start` funciona.

3. **AUD-0003 (P0)**: Remover `rejectUnauthorized: false`.
   - Tempo: 1 hora
   - Dono: Database Admin
   - Verificação: Cert PostgreSQL válido e verificável.

4. **AUD-0004 (P0)**: Proteger `DB_FORCE_SYNC` em produção.
   - Tempo: 1 hora
   - Dono: Lead Backend
   - Verificação: Tentar ativar em prod falha com erro claro.

5. **AUD-0005 (P1)**: Adicionar `authorize('admin', 'financial')` em financial/:id/pay.
   - Tempo: 30 minutos
   - Dono: Backend
   - Verificação: Teste com role=operator → 403.

6. **AUD-0006 (P1)**: Adicionar `lock: transaction.LOCK.UPDATE` em findSaleWithItems e compras similares.
   - Tempo: 3–4 horas
   - Dono: Backend (concurrency specialist)
   - Verificação: Teste de concorrência com 2+ threads de cancelamento.

7. **AUD-0007 (P1)**: Implementar endpoint de troca de senha + invalidação de token.
   - Tempo: 8–12 horas
   - Dono: Auth Team
   - Verificação: Teste de invalidação de token pós-mudança de senha.

8. **AUD-0008 (P1)**: Redis + rate limiting distribuído (ou remover se não necessário).
   - Tempo: 6–8 horas
   - Dono: DevOps/Backend
   - Verificação: Deploy em 2 instâncias; rate limit compartilhado.

9. **AUD-0009 (P1)**: Implementar invalidação de token pós-mudança de senha.
   - Tempo: 4–6 horas (integrado com AUD-0007)
   - Dono: Auth Team
   - Verificação: Token antigo não funciona após senha mudada.

10. **AUD-0010 (P1)**: Dockerfile + GitHub Actions CI.
    - Tempo: 8–10 horas
    - Dono: DevOps
    - Verificação: Pipeline de CI passa; artefato é imutável.

11. **AUD-0012 (P1)**: Atualizar uuid para > 11.1.1.
    - Tempo: 1 hora + regressão
    - Dono: Backend
    - Verificação: `npm audit` retorna 0 moderadas.

### **Fase 2: Críticos (antes de go-live)**

- **AUD-0011**: Integração com Postgres em CI; testes de integração/concorrência obrigatórios.
  - Tempo: 4–6 horas
  - Dono: QA/DevOps
  - Verificação: CI falha se suites de integração não rodarem.

### **Fase 3: Melhorias (pós-go-live, prazo 1 mês)**

- RBAC completo por rota (sales, purchases, inventory).
- Graceful shutdown + healthcheck de liveness/readiness.
- Request ID + logs estruturados.
- Backup/restore testado; runbook de disaster recovery.
- 2FA/TOTP para usuários admin.

---

## 📋 CHECKLIST DE GO-LIVE

| Item | Responsável | Evidência | Status |
|------|-------------|-----------|--------|
| Todos os P0 corrigidos e testados | Tech Lead | Regress ion pass | ❌ Não |
| Todos os P1 corrigidos e testados | Tech Lead | Regress ion pass | ❌ Não |
| Build artifact imutável em Docker | DevOps | Dockerfile + CI | ❌ Não |
| CI/CD pipeline verde | DevOps | GitHub Actions log | ❌ Não |
| Testes de concorrência passando | QA | npm test (5/5 suites) | ❌ Não |
| npm audit sem vulns moderadas | Backend | npm audit output | ❌ Parcial (atualizar uuid) |
| Backup/restore testado | DBA | Teste de restore de backup | ❌ Não |
| Runbook de deploy pronto | DevOps | docs/DEPLOY.md completo | ❌ Não |
| Runbook de rollback pronto | DevOps | docs/ROLLBACK.md | ❌ Não |
| Runbook de incidente pronto | OnCall | docs/INCIDENT.md | ❌ Não |
| Rotação de segredos documentada | SecOps | docs/SECRET_ROTATION.md | ❌ Não |
| Aprovação formal de P0 fechados | CTO/Sponsor | Email/Jira | ❌ Não |

---

## 📖 RUNBOOK DE DEPLOY (PRELIMINAR)

**Pré-deploy**:
1. `npm audit` — sem vulnerabilidades moderadas/altas.
2. `npm run typecheck` — sem erros de tipo.
3. `npm run build` — gera dist/.
4. `npm test` (com RUN_INTEGRATION=true) — todas as suites passam.
5. Secret scan — nenhum segredo em git.

**Deploy**:
1. Build imagem Docker: `docker build -t evok-erp:v1.0.0 .`
2. Push para registry: `docker push registry/evok-erp:v1.0.0`
3. Atualizar composição de produção (e.g., Kubernetes manifesto, docker-compose de produção).
4. Smoke test: `curl https://app.evokaudio.com.br/api/health` → 200 OK.
5. Verificar logs: nenhum erro crítico nos primeiros 5 minutos.

**Rollback**:
1. Reverter composição para versão anterior.
2. Reiniciar pods/containers.
3. Verificar logs novamente.

---

## 🎯 DÍVIDA TÉCNICA E ITENS FORA DO ESCOPO

### Fora do Escopo da Auditoria (Operacional/Funcional)

- Testes de carga/performance (SLO, latência p99).
- LGPD/conformidade detalhada (retenção de dados, exportação, direito ao esquecimento).
- Modelagem de ameaças formal (STRIDE, etc).
- Teste de penetração (red team).

### Descoberto Durante a Auditoria (Não-Crítico, Backlog)

- **P2**: RBAC ausente em sales, purchases, inventory (qualquer role autenticada tem acesso completo).
- **P2**: Paginação sem limite máximo (cliente pode pedir limit=999999).
- **P2**: Helper de paginação com teto de 100 é código morto (nenhum controller usa).
- **P3**: Sem graceful shutdown (SIGTERM não drena conexões).
- **P3**: Sem request ID / correlation ID (logs não são rastreáveis).
- **P3**: Logs apenas em console; nenhuma agregação centralizada.
- **P3**: Sem 2FA/TOTP para admin.
- **P3**: Sem HSTS/CSP headers.
- **P3**: Sem monitoramento de erros (Sentry, Datadog, etc).

---

## 📞 CONTATOS E ESCALONAMENTO

| Função | Nome | Email | Telefone |
|--------|------|-------|----------|
| CTO | Responsável | cto@evokaudio.com | (11) 99999-9999 |
| Tech Lead | Responsável | tech@evokaudio.com | (11) 88888-8888 |
| DBA | Responsável | dba@evokaudio.com | (11) 77777-7777 |
| DevOps | Responsável | devops@evokaudio.com | (11) 66666-6666 |
| OnCall | Responsável | oncall@evokaudio.com | (11) 55555-5555 |

---

## 📝 CONCLUSÃO

Este repositório **não está pronto para produção**. Existem **4 bloqueadores P0** e **7 críticos P1** que devem ser resolvidos antes de qualquer deploy.

A correção estimada é de **2–3 sprints** (2–4 semanas, dependendo de recursos). Recomenda-se:

1. **Imediatamente**: Pausar go-live; designar tech lead para triagem.
2. **Sprint 1**: Corrigir P0 (entrypoints, build, SSL, DB_FORCE_SYNC).
3. **Sprint 2**: Corrigir P1 (RBAC, locks, troca de senha, CI/CD).
4. **Sprint 3**: Testes + UAT; aprovação formal.
5. **Reauditoria**: Antes do go-live final.

**Decisão**: 🛑 **BLOQUEAR** até que P0/P1 sejam fechados e reauditados.

---

**Auditoria concluída em**: 2026-07-30 às 14:30 UTC  
**Próxima revisão recomendada**: Após fechamento de P0/P1 (estimado 2026-08-13)
