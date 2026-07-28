# 🔴 ERROS CRÍTICOS - ERP EVOK ÁUDIO

> **Data da análise:** Completa (todos os 25 controllers, 21 models, 22 rotas)
> **Total de bugs críticos encontrados:** 15
> **Já corrigidos:** 8 ✅
> **Pendentes:** 7 ❌

---

## ✅ CORRIGIDOS (8)

| # | Bug | Arquivo | Correção |
|---|-----|---------|----------|
| F27 | CPF/CNPJ sem validação real | clientController, supplierController, employeeController | Validators.validateDocument() implementado |
| F16 | Error handler vaza stack trace | errorHandler.js | Mensagens genéricas em produção |
| F28 | Upload path traversal + magic bytes | uploadService.js | Sanitização + validação real de tipo |
| F25 | LIKE injection nas buscas | validators.js | sanitizeSearch() criado |
| F26 | Client remove sem verificar vendas | clientController | Bloqueio com vendas ativas |
| — | Missing rating no update supplier | supplierController | Campo adicionado |
| — | Documento armazenado com formatação | 3 controllers | Armazena apenas dígitos |
| — | Error messages vazando em produção | 3 controllers | sanitizeError() implementado |

---

## ❌ PENDENTES - CRÍTICOS (7)

### 🔴 F10 - RACE CONDITION NO ESTOQUE (CRÍTICO - PERDA DE DADOS)

**Arquivos:** `saleController.js`, `purchaseController.js`, `inventoryController.js`, `productionOrderController.js`

**Problema:** 4 arquivos usam `sequelize.literal()` para atualizar estoque, o que **não é thread-safe**. Duas vendas simultâneas podem ler o mesmo valor e ambas subtraírem, resultando em estoque negativo ou perda de produtos.

**Ocorrências:**

```javascript
// 1. saleController.js - linha 100 (criar venda)
await Product.update(
  { quantity: sequelize.literal(`quantity - ${item.quantity}`) },
  { where: { id: item.product_id }, transaction: t }
);

// 2. saleController.js - linha 143 (cancelar venda)
await Product.update(
  { quantity: sequelize.literal(`quantity + ${item.quantity}`) },
  { where: { id: item.product_id }, transaction: t }
);

// 3. purchaseController.js - linha 165 (receber compra)
await Product.update(
  { quantity: sequelize.literal(`quantity + ${qty}`) },
  { where: { id: item.product_id }, transaction: t }
);

// 4. inventoryController.js - linha 44 (criar movimentação)
await Product.update(
  { quantity: sequelize.literal(`quantity ${type === 'in' ? '+' : '-'} ${quantity}`) },
  { where: { id: product_id, quantity: { [Op.gte]: type === 'out' ? quantity : 0 } } },
  transaction: t
);

// 5. productionOrderController.js - linha 141 (concluir produção)
await Product.update(
  { quantity: sequelize.literal(`quantity + ${producedQty}`) },
  { where: { id: order.product_id }, transaction: t }
);
```

**Solução:** Substituir por `product.increment()` / `product.decrement()` com lock:

```javascript
const product = await Product.findByPk(productId, { 
  transaction: t, 
  lock: t.LOCK.UPDATE 
});
if (product.quantity < qty) throw new Error('Estoque insuficiente');
await product.decrement('quantity', { by: qty, transaction: t });
```

---

### 🔴 F20 - AUDITLOG NÃO INTEGRADO EM NENHUM CONTROLLER (CRÍTICO - RASTREABILIDADE)

**Problema:** O model `AuditLog` existe (com `AuditLog.register()` pronto), mas **nenhum controller** chama essa função. Qualquer operação crítica (criar venda, alterar preço, excluir usuário) **não é registrada**.

**Arquivos afetados:** Todos os 25 controllers

**Exemplo do que deveria acontecer ao criar uma venda:**

```javascript
exports.create = async (req, res) => {
  // ... lógica existente ...
  await t.commit();
  
  // LINTA FALTANDO:
  await AuditLog.register({
    userId: req.user.id,
    action: 'create',
    entityType: 'sale',
    entityId: sale.id,
    entityDescription: `Venda #${sale.id} - R$ ${totalAmount}`,
    newValues: { customer_id, items, total_amount: totalAmount },
    req
  });
};
```

**Controllers prioritários para auditoria:**

| Prioridade | Controller | Ações |
|------------|------------|-------|
| 🔴 Crítica | saleController | create (dinheiro), updateStatus |
| 🔴 Crítica | purchaseController | create (gasto), receiveItems, updateStatus |
| 🔴 Crítica | financeController | receivePayment, payPayable |
| ⚠️ Alta | userController | create, update, remove |
| ⚠️ Alta | productController | create, update (preço) |
| ⚠️ Alta | employeeController | create, update (salário) |
| 🟡 Média | Todos os outros | create, update, remove |

---

### 🔴 F32 - PRODUCT CONTROLLER BUSCA SaleItem ERRADO (CRÍTICO - BLOQUEIO INCORRETO)

**Arquivo:** `productController.js` - linha 64

```javascript
// CÓDIGO ATUAL (ERRADO):
exports.remove = async (req, res) => {
  const { Sale } = require('../models/index');
  const activeSales = await Sale.count({
    where: { product_id: req.params.id, status: [...] }
  });
```

**Problema:** `product_id` NÃO existe na tabela `sales`. Ele está em `sale_items`!
Isso faz com que o bloqueio de inativação de produto **nunca funcione** - sempre retorna 0 vendas ativas, mesmo que o produto esteja em dezenas de vendas.

**Código correto:**
```javascript
const { SaleItem } = require('../models/index');
const activeSales = await SaleItem.count({
  where: { product_id: req.params.id }
});
```

---

### 🔴 F34 - SERVICE ORDER RETORNA {error} EM VEZ DE {success: false, error} (CRÍTICO - PADRÃO API)

**Arquivo:** `serviceOrderController.js` - linhas 107 e 113

```javascript
// CÓDIGO ATUAL (ERRADO - quebra o padrão da API):
return res.status(400).json({ error: `Transição inválida...` });
// ...
return res.status(400).json({ error: 'Apenas ordens abertas...' });
```

**Problema:** Todos os outros endpoints retornam `{ success: false, error: "mensagem" }`, mas este controller retorna `{ error: "mensagem" }` (sem o campo `success`). Isso quebra o padrão e qualquer cliente que espere `response.data.success` vai quebrar.

**Código correto:**
```javascript
return res.status(400).json({ success: false, error: 'Transição inválida...' });
```

---

### 🔴 F35 - INVENTORY CONTROLLER UPDATE SILENCIOSO (CRÍTICO - ESTOQUE INCORRETO)

**Arquivo:** `inventoryController.js` - linha 44

```javascript
// CÓDIGO ATUAL (PERIGOSO):
await Product.update(
  { quantity: sequelize.literal(`quantity ${type === 'in' ? '+' : '-'} ${quantity}`) },
  { 
    where: { 
      id: product_id, 
      quantity: { [Op.gte]: type === 'out' ? quantity : 0 }  // ← PROBLEMA AQUI
    }, 
    transaction: t 
  }
);
```

**Problema:** A condição `quantity: { [Op.gte]: quantity }` faz com que o `UPDATE` **não afete nenhuma linha** se o estoque for insuficiente. Mas o código **não verifica o resultado**! O `affectedRows` é ignorado.

Resultado: Se o estoque for 5 e a saída for 10, o update simplesmente **não acontece**, o estoque continua 5, e nenhum erro é retornado ao usuário. O sistema fica inconsistente.

**Código correto:**
```javascript
const product = await Product.findByPk(product_id, { transaction: t, lock: t.LOCK.UPDATE });
if (type === 'out' && product.quantity < quantity) {
  await t.rollback();
  return res.status(400).json({
    success: false,
    error: `Estoque insuficiente. Disponível: ${product.quantity}, Solicitado: ${quantity}`
  });
}
await product.increment(
  type === 'in' ? 'quantity' : { quantity: -quantity },
  { transaction: t }
);
```

---

### 🔴 F33 - ASSET CONTROLLER USA CAMPOS INEXISTENTES (CRÍTICO - UPDATE QUEBRADO)

**Arquivo:** `assetController.js` - linha 80

```javascript
// CÓDIGO ATUAL (ERRADO):
const allowedFields = [
  'name', 'description', 
  'category',           // ← NÃO EXISTE no model Asset (o campo correto é 'asset_type')
  'department_id', 'responsible_id', 'location',
  'acquisition_date',   // ← NÃO EXISTE (o campo correto é 'purchase_date')
  'acquisition_value',  // ← NÃO EXISTE (o campo correto é 'purchase_value')
  'current_value',      // ← NÃO DEVERIA SER EDITÁVEL DIRETAMENTE
  'quantity',           // ← NÃO EXISTE no model Asset!
  'product_id', 'notes', 'status'
];
```

**Problema:** 4 campos incorretos + 1 campo que não deveria ser editado. Atualizações no asset nunca vão funcionar para `category`, `acquisition_date`, `acquisition_value` porque esses campos simplesmente não existem na tabela.

**Código correto:**
```javascript
const allowedFields = [
  'name', 'description', 'asset_type',
  'department_id', 'responsible_id', 'location',
  'purchase_date', 'purchase_value',
  'useful_life_months', 'product_id', 'notes', 'status'
];
```

---

### ⚠️ F36 - PRODUCT CONTROLLER REMOVE USA MODEL ERRADO (ALTO - BLOQUEIO INEFICAZ)

**Arquivo:** `productController.js` - linha 62

```javascript
// CÓDIGO ATUAL:
const { Sale } = require('../models/index');
const activeSales = await Sale.count({
  where: { product_id: req.params.id, status: [...] }
});
```

**Problema:** Igual ao F32. `product_id` está em `SaleItem`, não em `Sale`. A verificação de "produto com venda ativa" **nunca funciona**.

**Solução:** Usar `SaleItem` em vez de `Sale`.

---

## 📊 RESUMO DOS DANOS

| Bug | Impacto | Pode causar |
|-----|---------|-------------|
| **F10** - Race condition | 🔴 Perda financeira | Estoque negativo, venda sem produto |
| **F20** - Sem audit | 🔴 Legal/Contábil | Sem rastreabilidade para auditoria |
| **F32** - Bloqueio incorreto | 🔴 Dados inconsistentes | Produto inativado com vendas ativas |
| **F34** - API quebrada | 🔴 Integração | Frontend e integrações quebram |
| **F35** - Update silencioso | 🔴 Estoque incorreto | Saída de estoque sem atualizar |
| **F33** - Campos errados | 🔴 Funcionalidade quebrada | Update de ativo nunca funciona |
| **F36** - Verificação errada | ⚠️ Dados inconsistentes | Produto removido indevidamente |

---

## 🚨 RECOMENDAÇÃO

**Corrigir URGENTEMENTE nesta ordem:**

1. **F10** - Race condition (4 arquivos) → IMPEDE PRODUÇÃO
2. **F35** - Update silencioso (inventoryController) → PERDA DE ESTOQUE
3. **F32** + **F36** - Bloqueio incorreto (productController) → DADOS INCONSISTENTES
4. **F34** - API quebrada (serviceOrderController) → INTEGRAÇÃO QUEBRADA
5. **F33** - Campos errados (assetController) → FUNCIONALIDADE QUEBRADA
6. **F20** - AuditLog (25 controllers) → RASTREABILIDADE

**Tempo estimado de correção:** 1-2 dias
