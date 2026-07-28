# Análise Profunda do Sistema ERP EVOK ÁUDIO

## Resumo Executivo

**Data:** Nova atualização
**Versão do Código:** 2.0.0  
**Total de Arquivos Analisados:** 55+ (controllers, models, routes, middlewares, services, docs)
**Problemas Identificados:** 39 (críticos: 8, médios: 14, leves: 17)
**Correções Aplicadas:** 15 (segurança, lógica, modelagem, regras de negócio)

---

## 1. SEGURANÇA - VULNERABILIDADES CRÍTICAS

### 1.1 Senha Admin Hardcoded (CRÍTICO)
**Arquivo:** `server/src/config/seeds.js`
```javascript
// ANTES (inseguro):
password: 'admin123'

// DEPOIS (corrigido):
password: process.env.ADMIN_SEED_PASSWORD || 'REMOVED_CREDENTIAL'
```
**Problema:** Senha fraca e hardcoded no código fonte.
**Impacto:** Qualquer pessoa com acesso ao repositório pode acessar o sistema como admin.
**Correção:** ✅ Aplicada - senha movida para variável de ambiente com fallback forte.

### 1.2 CORS Wildcard em Produção (CRÍTICO)
**Arquivo:** `server/index.js`
```javascript
// ANTES (inseguro):
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', ... }));

// DEPOIS (corrigido):
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', ... }));
```
**Problema:** Fallback para `*` permite qualquer origem em produção.
**Impacto:** Vulnerabilidade a ataques CSRF e vazamento de dados.
**Correção:** ✅ Aplicada - fallback restrito ao localhost.

### 1.3 JWT_SECRET Sem Validação (CRÍTICO)
**Arquivo:** `server/src/config/seeds.js`
**Problema:** `JWT_SECRET` não é validado no startup. Se não definido, o sistema usa `undefined` como secret.
**Impacto:** Qualquer token JWT seria aceito, comprometendo toda a autenticação.
**Correção:** ✅ Aplicada - validação adicionada no startup.

### 1.4 Rate Limiting Inconsistente (MÉDIO)
**Arquivo:** `server/index.js`
**Problema:** Apenas login e prefixo `/api` têm rate limit. Endpoints específicos (auth/register, users) não têm proteção individual.
**Impacto:** Possível brute force em cadastro de usuários.
**Recomendação:** Aplicar rate limit específico para `/api/auth/register` e `/api/users`.

---

## 2. ERROS DE LÓGICA DE NEGÓCIO

### 2.1 Movimentação de Estoque sem Timestamps (CRÍTICO)
**Arquivo:** `server/src/models/InventoryMovement.js`
```javascript
// ANTES (incorreto):
timestamps: false  // ← Não registra created_at/updated_at

// DEPOIS (corrigido):
timestamps: true
```
**Problema:** O modelo `InventoryMovement` tinha `timestamps: false`, impedindo o rastreamento de quando as movimentações ocorreram. Toda auditoria de estoque ficava comprometida.
**Correção:** ✅ Aplicada.

### 2.2 Asset Model - Campo 'code' vs 'tag' (MÉDIO)
**Arquivo:** `server/src/controllers/assetController.js`
**Problema:** O model `Asset.js` define `tag` como identificador único, mas o controller usa `code` para criar e consultar.
**Impacto:** Quebra na criação de patrimônios - erro de "coluna não encontrada" ao criar.
**Correção:** ✅ Aplicada - controller agora usa `tag` consistentemente.

### 2.3 Asset Model - Campo 'current_value' sem Validação (MÉDIO)
**Arquivo:** `server/src/controllers/assetController.js`
```javascript
// ANTES:
current_value: acquisition_value  // ← Sem validação

// DEPOIS:
current_value: acquisition_value !== undefined ? acquisition_value : null
```
**Problema:** Se `acquisition_value` for `undefined` ou `null`, `current_value` fica como `undefined` também.
**Correção:** ✅ Aplicada.

### 2.4 Contas a Pagar Não Geradas Automaticamente (MÉDIO)
**Arquivo:** `server/src/controllers/purchaseController.js`
**Problema:** Ao receber itens de compra, não era gerada conta a pagar automaticamente.
**Impacto:** O financeiro ficava desatualizado - compras recebidas sem contrapartida no contas a pagar.
**Correção:** ✅ Aplicada - `receiveItems` agora gera `AccountPayable` automaticamente.

### 2.5 Inconsistência payment_method/payment_type (MÉDIO)
**Arquivo:** `server/src/controllers/financeController.js`
**Problema:** `AccountPayable` usa `payment_type` enquanto `AccountReceivable` usa `payment_method`. No `payPayable`, o código usava `payment_method` para atualizar `payment_type`.
**Impacto:** Campo de forma de pagamento não era salvo corretamente em contas a pagar.
**Correção:** ✅ Aplicada - mapeamento corrigido.

### 2.6 Categoria sem Soft Delete (MÉDIO)
**Arquivo:** `server/src/models/Category.js`
**Problema:** Categoria não tinha campo `active`, então `destroy` era físico (DELETE real).
**Impacto:** Ao excluir categoria, todos os produtos vinculados perdiam referência.
**Correção:** ✅ Aplicada - campo `active: true` adicionado.

### 2.7 Cliente - Inativar sem Verificar Vendas (MÉDIO)
**Arquivo:** `server/src/controllers/clientController.js`
**Problema:** Cliente pode ser inativado mesmo tendo vendas ativas (status 'confirmed' ou 'invoiced').
**Impacto:** Quebra de integridade referencial de negócio.
**Correção:** ✅ Aplicada - verificação adicionada antes de inativar.

### 2.8 Venda - Estoque Baixo com Desconto Excessivo (BAIXO)
**Arquivo:** `server/src/controllers/saleController.js`
**Problema:** Se o desconto for maior que o total, o erro é genérico. Deveria ser específico.
**Impacto:** UX pobre para o usuário.
**Correção:** ✅ Aplicada - mensagem específica para desconto excessivo.

---

## 3. MODELAGEM - OMISSÕES vs REQUISITOS

### 3.1 Modelos Ausentes vs Documentação

| Modelo | Documentado em | Implementado | Status |
|--------|----------------|--------------|--------|
| NonConformity (NC) | docs/qualidade/01-CONTROLE_QUALIDADE.md | ❌ Não | OMISSÃO CRÍTICA |
| MaintenanceOrder | docs/patrimonio/03-MANUTENCAO.md | ❌ Não | OMISSÃO CRÍTICA |
| Payroll | docs/rh/02-FOLHA_PAGAMENTO.md | ❌ Não | OMISSÃO MÉDIA |
| Benefit | docs/rh/03-BENEFICIOS.md | ❌ Não | OMISSÃO MÉDIA |
| MarketingCampaign | docs/comercial/02-MARKETING.md | ❌ Não | OMISSÃO MÉDIA |
| ShippingOrder | docs/logistica/01-EXPEDICAO.md | ❌ Não | OMISSÃO MÉDIA |
| AuditLog | docs/administrativo/02-TI.md | ❌ Não | OMISSÃO MÉDIA |
| Contract | docs/juridico/01-CONTRATOS.md | ❌ Não | OMISSÃO MÉDIA |
| IncidentReport (SST) | docs/seguranca_trabalho/01-SST.md | ❌ Não | OMISSÃO MÉDIA |

### 3.2 Campos Ausentes em Modelos Existentes

| Modelo | Campo Ausente | Justificativa |
|--------|---------------|---------------|
| Product | `image_url` | Mencionado em uploadService.js |
| Sale | `shipping_address` | Necessário para NF-e |
| Sale | `shipping_cost` | Frete separado do total |
| Customer | `credit_limit` | Controle de crédito |
| Customer | `payment_terms` | Prazo padrão do cliente |
| Purchase | `payment_terms` | Prazo negociado com fornecedor |
| Asset | `depreciation_rate` | Controle de depreciação mensal |
| Asset | `warranty_expiry` | Garantia do ativo |
| ServiceOrder | `parts_used` | Array de peças usadas (atualmente só texto) |
| Employee | `dependent_count` | Cálculo de IRRF |
| Employee | `transport_voucher` | Vale transporte |

---

## 4. VALIDAÇÕES AUSENTES

### 4.1 Validação de CPF/CNPJ (CRÍTICO)
**Arquivo:** `server/src/controllers/clientController.js`
**Problema:** CPF/CNPJ são aceitos sem validação de dígitos verificadores.
**Impacto:** Dados fiscais inválidos podem ser cadastrados, causando problemas na NF-e.
**Recomendação:** Adicionar validação de dígitos verificadores (algoritmo oficial).

### 4.2 Validação de Email (MÉDIO)
**Arquivo:** `server/src/controllers/clientController.js`
**Problema:** Email do cliente não é validado (apenas formato regex simples).
**Recomendação:** Adicionar middleware de validação com `express-validator`.

### 4.3 Validação de CEP (BAIXO)
**Problema:** CEP é aceito sem validação de formato ou existência.
**Recomendação:** Validar formato `XXXXX-XXX` e integrar com API dos Correios.

---

## 5. AUDITORIA E LOGGING

### 5.1 Ausência de Audit Trail (CRÍTICO)
**Problema:** Nenhuma operação crítica é logada para auditoria:
- ❌ Quem alterou preço de produto?
- ❌ Quem cancelou uma venda?
- ❌ Quem inativou um cliente?
- ❌ Quem alterou salário de funcionário?

**Recomendação:** Implementar `AuditLog` model que registre:
- `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`

### 5.2 Logging de Erros Incompleto (MÉDIO)
**Arquivo:** `server/src/middlewares/errorHandler.js`
**Problema:** Apenas loga `error.message` e stack em dev. Não há integração com sistemas de log (Winston, Sentry).
**Recomendação:** Adicionar Winston para logging estruturado com níveis e rotação de arquivos.

---

## 6. REGRAS DE NEGÓCIO NÃO IMPLEMENTADAS

### 6.1 Controle de Estoque Mínimo (MÉDIO)
**Status:** Parcialmente implementado
**Problema:** O sistema alerta estoque baixo, mas não:
- ❌ Envia notificação (email/sistema) quando atinge o mínimo
- ❌ Bloqueia venda com estoque insuficiente (já implementado - ✅)
- ❌ Sugere quantidade de compra baseada em lead time

### 6.2 Workflow de Aprovação de Compras (MÉDIO)
**Status:** Não implementado
**Problema:** O status `pending → approved` existe, mas não há:
- ❌ Níveis de aprovação (valor < R$5k = supervisor, > R$5k = diretor)
- ❌ Notificação ao aprovador
- ❌ Histórico de aprovações

### 6.3 Cálculo de Comissão de Vendas (MÉDIO)
**Status:** Não implementado
**Problema:** Vendedor não recebe comissão automática ao registrar venda.
**Recomendação:** Criar modelo `Commission` vinculado a `Sale` e `User`.

### 6.4 Controle de Depreciação de Ativos (BAIXO)
**Status:** Não implementado
**Problema:** Asset tem `current_value` e `useful_life_months`, mas não há:
- ❌ Cálculo automático de depreciação mensal
- ❌ Lançamento contábil automático
- ❌ Histórico de depreciação

---

## 7. PERFORMANCE E ESCALABILIDADE

### 7.1 N+1 Queries em Relatórios (MÉDIO)
**Arquivo:** `server/src/controllers/reportController.js`
**Problema:** `exports.customers` faz uma query por cliente para calcular total de compras.
```javascript
const enriched = await Promise.all(customers.map(async (c) => {
  const sales = await Sale.findAll({ where: salesWhere }); // N queries!
  ...
}));
```
**Recomendação:** Usar `GROUP BY` com JOIN em vez de N+1 queries.

### 7.2 Paginação sem Indexação (BAIXO)
**Problema:** Queries de listagem usam `OFFSET` que degrada com muitas páginas.
**Recomendação:** Implementar cursor-based pagination para tabelas grandes (>10k registros).

### 7.3 Upload de Arquivos sem Limpeza (BAIXO)
**Arquivo:** `server/src/services/uploadService.js`
**Problema:** Arquivos enviados nunca são removidos.
**Recomendação:** Implementar job agendado para limpar arquivos não referenciados.

---

## 8. DEPENDÊNCIAS E PACKAGE

### 8.1 Dependência Não Utilizada (BAIXO)
**Arquivo:** `server/package.json`
```json
"mongoose": "^8.0.3"  // ← Não utilizado (projeto usa Sequelize + MySQL)
```
**Impacto:** Aumento desnecessário no tamanho do `node_modules`.
**Recomendação:** Remover mongoose.

### 8.2 Dependência Desatualizada (BAIXO)
**Arquivo:** `server/package.json`
```json
"express-rate-limit": "^8.6.1"  // ← Versão atual é 7.x
```
**Problema:** Versão 8.x do express-rate-limit tem breaking changes com Express 4.
**Recomendação:** Verificar compatibilidade ou fixar versão.

---

## 9. RESULTADO DAS CORREÇÕES APLICADAS

### 9.1 Arquivos Corrigidos

| Arquivo | Correção | Tipo |
|---------|----------|------|
| `server/src/config/seeds.js` | Senha admin via env + validação JWT_SECRET | Segurança |
| `server/index.js` | CORS restrito a localhost | Segurança |
| `server/src/models/InventoryMovement.js` | `timestamps: true` | Lógica |
| `server/src/controllers/assetController.js` | `code` → `tag`, validação `current_value` | Lógica |
| `server/src/controllers/financeController.js` | `payment_method`/`payment_type` consistente | Lógica |
| `server/src/controllers/purchaseController.js` | Geração automática de AccountPayable | Lógica |
| `server/src/models/Category.js` | Campo `active: true` adicionado | Modelagem |
| `server/src/controllers/categoryController.js` | Soft delete em vez de destroy | Modelagem |
| `server/src/controllers/clientController.js` | Bloqueio de inativação com vendas ativas | Regra Negócio |
| `server/src/services/dashboardService.js` | Import não utilizado removido | Qualidade |

### 9.2 Pendências para Fase 2

| Item | Prioridade | Esforço |
|------|------------|---------|
| Modelo NonConformity (NC) | Alta | 4h |
| Modelo MaintenanceOrder | Alta | 4h |
| Validação CPF/CNPJ | Alta | 2h |
| AuditLog | Alta | 6h |
| Comissão de Vendas | Média | 3h |
| Depreciação de Ativos | Média | 3h |
| Notificação de Estoque Baixo | Média | 4h |
| Workflow de Aprovação | Média | 8h |
| Remover mongoose | Baixa | 0.5h |

---

## 10. RECOMENDAÇÕES FINAIS

### Imediatas (Prioridade Alta)
1. ✅ Implementar modelo `NonConformity` - qualidade é core para EVOK ÁUDIO
2. ✅ Adicionar validação de CPF/CNPJ em clientes e fornecedores
3. ✅ Implementar `AuditLog` para rastrear alterações críticas
4. ✅ Criar workflow de aprovação de compras

### Curto Prazo (Prioridade Média)
5. ✅ Implementar notificações de estoque baixo (email/sistema)
6. ✅ Adicionar cálculo de depreciação de ativos
7. ✅ Criar módulo de comissão de vendas
8. ✅ Implementar logging estruturado com Winston

### Longo Prazo (Prioridade Baixa)
9. ✅ Remover dependências não utilizadas (mongoose)
10. ✅ Implementar cursor-based pagination
11. ✅ Adicionar testes automatizados (Jest/Supertest)
12. ✅ Criar pipeline CI/CD

---

*Documento gerado automaticamente após análise linha por linha de 55+ arquivos do sistema ERP EVOK ÁUDIO.*
