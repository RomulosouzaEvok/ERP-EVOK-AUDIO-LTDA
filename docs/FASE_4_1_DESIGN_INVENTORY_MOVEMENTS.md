# Fase 4.1 — Design: Expand-Contract de `inventory_movements`

**Fase**: 4.1 (Preparação para migração de FK)  
**Tabela alvo**: `inventory_movements` (legado, INTEGER `product_id`)  
**Objetivo**: Adicionar coluna UUID `item_id` em paralelo, validar 100% backfill, implementar dual-read, preparar cutover.  
**Escopo**: Schema + backfill + validação + código (sem executar ainda).  
**Data**: 2026-07-30  
**Arquiteto**: Claude Code (Agent)

---

## 1. Estado Atual: `inventory_movements`

### 1.1 Definição SQL (01_schema.sql)

```sql
CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,          -- FK → products.id (LEGADO, INT)
  user_id INTEGER NOT NULL,             -- FK → users.id
  type ENUM('in', 'out', 'adjustment'),
  quantity DECIMAL(18, 6) NOT NULL,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  description TEXT,
  reference_id INTEGER,
  reference_type ENUM('sale', 'purchase', 'production', 'adjustment', 'transfer'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Observação crítica**: O schema atual parece ter inconsistência:
- `01_schema.sql` (novo) define `movimentos_estoque` com `item_id UUID` (não `product_id INTEGER`)
- Modelo Sequelize `InventoryMovement.ts` ainda define `product_id: INTEGER`
- Para Fase 4.1, **assumimos que há uma tabela `inventory_movements` legada COM `product_id INTEGER`** (possível em migração gradual ou banco antigo)

### 1.2 Modelo Sequelize Atual (server/src/models/InventoryMovement.ts)

```typescript
interface InventoryMovementAttributes {
  id: number;
  product_id: number;          // ← SERÁ SUBSTITUÍDO/COMPLEMENTADO
  user_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number;
  description: string | null;
  reference_id: number | null;
  reference_type: 'sale' | 'purchase' | 'production' | 'adjustment' | 'transfer' | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id' },
  // ... demais campos
  timestamps: true
});
```

### 1.3 Repositório Sequelize Atual (SequelizeInventoryRepository.ts)

```typescript
async listMovements(filters: any = {}, pagination: any = {}) {
  const where: any = {};
  if (filters.product_id) where.product_id = filters.product_id;  // ← QUERY COM PRODUCT_ID
  if (filters.type) where.type = filters.type;
  
  const { count, rows } = await InventoryMovement.findAndCountAll({
    where,
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'user', attributes: ['id', 'name'] }
    ],
    order: [['created_at', 'DESC']]
  });
}
```

**Padrão atual**:
- Filtro por `product_id INTEGER`
- JOIN com `products` para preencher nome/código
- Sem suporte a `item_id UUID`

### 1.4 Tabela de Crosswalk Disponível

Arquivo: `server/database/postgresql/02a_extend_item_estruturas.sql`

```sql
CREATE TABLE IF NOT EXISTS migracao_product_item_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT NOT NULL UNIQUE,
  item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  product_code VARCHAR(50),
  product_name VARCHAR(200),
  mapeado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(40) NOT NULL DEFAULT 'SUCESSO',
  observacoes TEXT
);
```

**Status**: Tabela já criada. Dados populados por backfill Fase 2B (`02b_product_to_item.ts`).

---

## 2. Plano de ALTER TABLE (Fase 4.1a)

### 2.1 Alteração de Schema SQL

```sql
-- Fase 4.1a: Expand (adicionar coluna item_id em paralelo)
BEGIN;

-- 1. Adicionar coluna item_id (nullable inicialmente)
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. Adicionar índice para item_id (para queries futuras)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id 
  ON inventory_movements(item_id);

-- 3. Adicionar índice composto (para filtros combinados)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id_type 
  ON inventory_movements(item_id, type);

-- 4. Adicionar índice composto (para queries de data + item)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id_created_at 
  ON inventory_movements(item_id, created_at DESC);

-- 5. Adicionar constraint de integridade referencial (como DEFAULT para novas linhas)
-- Não ADD CONSTRAINT ainda — primeiro validar 100% das linhas existentes
-- ALTER TABLE inventory_movements
-- ADD CONSTRAINT fk_inventory_movements_item_id FOREIGN KEY (item_id) REFERENCES items(id);

-- 6. Registrar status de alter na auditoria
INSERT INTO schema_migration_log (version, description, status, applied_at)
VALUES ('4.1a', 'Expand: adicionar item_id UUID a inventory_movements', 'PENDING_BACKFILL', now());

COMMIT;
```

### 2.2 Atualização do Modelo Sequelize

Arquivo: `server/src/models/InventoryMovement.ts`

```typescript
interface InventoryMovementAttributes {
  id: number;
  product_id: number;               // MANTER (suporte dual durante Fase 4.1/4.2)
  item_id?: string | null;          // NOVO: UUID (opcional até validação 100%)
  user_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number;
  description: string | null;
  reference_id: number | null;
  reference_type: 'sale' | 'purchase' | 'production' | 'adjustment' | 'transfer' | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const InventoryMovement = sequelize.define('InventoryMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'FK → products.id (LEGADO)' },
  item_id: {                                                        // NOVO
    type: DataTypes.UUID,
    allowNull: true,  // Inicialmente nullable; NOT NULL após Fase 4.2
    comment: 'FK → items.id (NOVO, parallel to product_id)'
  },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('in', 'out', 'adjustment'), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
  unit_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  description: DataTypes.TEXT,
  reference_id: DataTypes.INTEGER,
  reference_type: { type: DataTypes.ENUM('sale', 'purchase', 'production', 'adjustment', 'transfer') },
  timestamps: true
});
```

### 2.3 Mudanças nos Índices

| Índice | Propósito | Prioridade |
|--------|-----------|-----------|
| `idx_inventory_movements_item_id` | Filtro por item_id | Alta |
| `idx_inventory_movements_item_id_type` | Filtro combinado (item + tipo) | Alta |
| `idx_inventory_movements_item_id_created_at` | Ordenação temporal por item | Média |
| `idx_inventory_movements_product_id` (existente) | Manter para Fase 4.1/4.2 | Critica |

---

## 3. Plano de Backfill (Fase 4.1b)

### 3.1 Estratégia: Transacional por Lotes

**Abordagem**: Batch transacional (similar a Fase 2B) com lotes de 5.000-10.000 registros (maior que items porque tabela é tipicamente grande).

```typescript
// server/src/scripts/backfill/04a_inventory_movements_expand.ts
// Pseudo-código de estrutura

const LOTE_SIZE = 5000;  // Ajustável conforme performance

async function backfillInventoryMovementsExpand(opts: { start?: number; limit?: number } = {}) {
  const stats = {
    totalRows: 0,
    backfilledRows: 0,
    skippedRows: 0,
    failedLotes: 0,
    errors: []
  };

  // 1. Contar total de registros em inventory_movements
  const total = await sequelize.query(
    'SELECT COUNT(*) as count FROM inventory_movements',
    { type: 'SELECT' }
  );

  // 2. Para cada lote:
  let offset = 0;
  while (offset < total[0].count) {
    const transaction = await sequelize.transaction();
    
    try {
      // 2.1 Buscar lote de inventory_movements com product_id
      const rows = await sequelize.query(
        `SELECT id, product_id FROM inventory_movements 
         WHERE item_id IS NULL 
         ORDER BY id ASC LIMIT :limit OFFSET :offset`,
        { replacements: { limit: LOTE_SIZE, offset }, type: 'SELECT' }
      );

      // 2.2 Para cada linha, buscar item_id via crosswalk
      const updates: { id: number; item_id: string | null }[] = [];
      
      for (const row of rows) {
        const mapping = await sequelize.query(
          `SELECT item_id FROM migracao_product_item_map 
           WHERE product_id = :product_id AND status = 'SUCESSO'`,
          { 
            replacements: { product_id: row.product_id },
            type: 'SELECT',
            transaction
          }
        );

        if (mapping.length > 0) {
          updates.push({ id: row.id, item_id: mapping[0].item_id });
          stats.backfilledRows++;
        } else {
          // Produto não mapeado (raro — deveria estar em Fase 2B)
          updates.push({ id: row.id, item_id: null });
          stats.skippedRows++;
        }
      }

      // 2.3 Executar UPDATE em batch
      for (const { id, item_id } of updates) {
        await sequelize.query(
          `UPDATE inventory_movements SET item_id = :item_id WHERE id = :id`,
          { 
            replacements: { id, item_id },
            type: 'UPDATE',
            transaction
          }
        );
      }

      await transaction.commit();
      offset += LOTE_SIZE;

    } catch (error) {
      await transaction.rollback();
      stats.failedLotes++;
      stats.errors.push({
        offset,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log('='.repeat(70));
  console.log('RESUMO - Fase 4.1b: Backfill inventory_movements.item_id');
  console.log('='.repeat(70));
  console.log(`Total de registros: ${stats.totalRows}`);
  console.log(`Backfilled com sucesso: ${stats.backfilledRows}`);
  console.log(`Skipped (sem mapeamento): ${stats.skippedRows}`);
  console.log(`Lotes falhados: ${stats.failedLotes}`);
  
  if (stats.errors.length > 0) {
    console.log('\nERROS:');
    stats.errors.forEach(e => console.log(`  Offset ${e.offset}: ${e.error}`));
  }
}
```

### 3.2 Tratamento de Casos Especiais

| Cenário | Ação |
|---------|------|
| `inventory_movements.product_id` não tem mapeamento em `migracao_product_item_map` | Deixar `item_id = NULL` (skipped), logar como aviso |
| Múltiplas linhas para mesmo product_id | Aplicar mesmo item_id em todas (crosswalk é 1:1) |
| `inventory_movements.product_id` aponta para produto deletado | Skipped; será capturado em validação |
| Erro de transação em meio a lote | Rollback completo do lote; reexecutar |

---

## 4. Plano de Validação (Fase 4.1c)

### 4.1 Queries de Validação de Integridade

```sql
-- Validação 1: Cobertura de backfill
SELECT 
  'Cobertura' as test,
  COUNT(*) as total,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as backfilled,
  COUNT(CASE WHEN item_id IS NULL THEN 1 END) as sem_item_id,
  ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as pct_complete
FROM inventory_movements;

-- Esperado: pct_complete = 100.00 (ou <0.1% tolerancia se houver produtos órfãos)

-- Validação 2: Integridade referencial (item_id → items.id)
SELECT 
  'FK Integrity' as test,
  COUNT(*) as inventory_movements_com_item_id,
  COUNT(CASE WHEN items.id IS NOT NULL THEN 1 END) as items_encontrados,
  COUNT(CASE WHEN items.id IS NULL THEN 1 END) as items_nao_encontrados
FROM inventory_movements im
LEFT JOIN items ON im.item_id = items.id
WHERE im.item_id IS NOT NULL;

-- Esperado: items_nao_encontrados = 0

-- Validação 3: Dual-consistency (product_id vs item_id)
SELECT 
  'Dual Consistency' as test,
  COUNT(*) as total_com_ambos,
  COUNT(CASE WHEN 
    (SELECT item_id FROM migracao_product_item_map WHERE product_id = im.product_id) = im.item_id 
    THEN 1 END) as concordantes,
  COUNT(CASE WHEN 
    (SELECT item_id FROM migracao_product_item_map WHERE product_id = im.product_id) <> im.item_id 
    THEN 1 END) as discordantes
FROM inventory_movements im
WHERE im.item_id IS NOT NULL AND im.product_id IS NOT NULL;

-- Esperado: discordantes = 0

-- Validação 4: Nenhuma linha com item_id mas product_id inválido
SELECT 
  COUNT(*) as problema
FROM inventory_movements im
WHERE im.item_id IS NOT NULL
  AND im.product_id NOT IN (SELECT product_id FROM migracao_product_item_map);

-- Esperado: problema = 0

-- Validação 5: Distribuição de preenchimento por tipo de movimento
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as com_item_id,
  COUNT(CASE WHEN item_id IS NULL THEN 1 END) as sem_item_id,
  ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as pct
FROM inventory_movements
GROUP BY type
ORDER BY pct DESC;

-- Esperado: todas as linhas com pct >= 99.9%
```

### 4.2 Script SQL de Validação Completa

Arquivo: `server/src/scripts/backfill/04c_validation.sql`

```sql
-- Executar após 04a_inventory_movements_expand.ts
-- Retorna 5 blocos de testes (sim/não para cada validação)

BEGIN;

-- BLOCO 1: COBERTURA
\echo '=== BLOCO 1: COBERTURA DE BACKFILL ==='
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as com_item_id,
  CASE 
    WHEN COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) = COUNT(*) THEN 'PASS'
    WHEN ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / COUNT(*), 1) >= 99.9 THEN 'PASS (tolerancia <0.1%)'
    ELSE 'FAIL'
  END as resultado
FROM inventory_movements;

-- BLOCO 2: INTEGRIDADE REFERENCIAL
\echo '=== BLOCO 2: INTEGRIDADE REFERENCIAL (item_id → items.id) ==='
SELECT
  COUNT(*) as linhas_com_item_id,
  COUNT(CASE WHEN items.id IS NOT NULL THEN 1 END) as items_encontrados,
  COUNT(CASE WHEN items.id IS NULL THEN 1 END) as items_orfaos,
  CASE 
    WHEN COUNT(CASE WHEN items.id IS NULL THEN 1 END) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM inventory_movements im
LEFT JOIN items ON im.item_id = items.id
WHERE im.item_id IS NOT NULL;

-- BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id via crosswalk)
\echo '=== BLOCO 3: DUAL CONSISTENCY (product_id ↔ item_id) ==='
WITH verificacao AS (
  SELECT 
    im.id,
    im.product_id,
    im.item_id,
    m.item_id as expected_item_id,
    CASE WHEN im.item_id = m.item_id THEN 'OK' ELSE 'MISMATCH' END as status
  FROM inventory_movements im
  LEFT JOIN migracao_product_item_map m ON im.product_id = m.product_id
  WHERE im.item_id IS NOT NULL
)
SELECT
  COUNT(*) as total_verificado,
  COUNT(CASE WHEN status = 'OK' THEN 1 END) as concordantes,
  COUNT(CASE WHEN status = 'MISMATCH' THEN 1 END) as discordantes,
  CASE 
    WHEN COUNT(CASE WHEN status = 'MISMATCH' THEN 1 END) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM verificacao;

-- BLOCO 4: SOMAS E AGREGADOS
\echo '=== BLOCO 4: VERIFICAÇÃO DE SOMAS POR ITEM_ID ==='
SELECT
  'sample_items' as categoria,
  COUNT(DISTINCT item_id) as items_unicos,
  COUNT(*) as total_movimentos,
  ROUND(AVG(quantity::numeric), 2) as qty_media,
  MIN(quantity::numeric) as qty_min,
  MAX(quantity::numeric) as qty_max
FROM inventory_movements
WHERE item_id IS NOT NULL
LIMIT 1;

-- BLOCO 5: DISTRIBUIÇÃO POR TIPO
\echo '=== BLOCO 5: DISTRIBUIÇÃO POR TIPO DE MOVIMENTO ==='
SELECT
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) as com_item_id,
  ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / COUNT(*), 1) as pct_backfilled,
  CASE
    WHEN ROUND(100.0 * COUNT(CASE WHEN item_id IS NOT NULL THEN 1 END) / COUNT(*), 1) >= 99.9 THEN 'PASS'
    ELSE 'FAIL'
  END as resultado
FROM inventory_movements
GROUP BY type
ORDER BY pct_backfilled DESC;

\echo '=== FIM DA VALIDAÇÃO ==='
COMMIT;
```

---

## 5. Plano de Mudança em Código (Fase 4.1d)

### 5.1 Dual-Read em SequelizeInventoryRepository

**Implementar suporte para ambos os modos de busca (product_id INTEGER e item_id UUID) em paralelo.**

```typescript
// server/src/modules/inventory/infrastructure/sequelize/SequelizeInventoryRepository.ts

interface ListMovementsFiltersV2 {
  product_id?: number;     // Modo legado (INTEGER)
  item_id?: string;        // Modo novo (UUID)
  type?: string;
  start_date?: string | Date;
  end_date?: string | Date;
}

async listMovements(filters: ListMovementsFiltersV2 = {}, pagination: any = {}) {
  const where: any = {};

  // DUAL-READ: Suportar ambos os modos
  if (filters.product_id && !filters.item_id) {
    // Modo legado (retrocompatível)
    where.product_id = filters.product_id;
    console.log('[InventoryMovement] Using legacy product_id filter');
  } else if (filters.item_id && !filters.product_id) {
    // Modo novo (preferred após Fase 4.2)
    where.item_id = filters.item_id;
    console.log('[InventoryMovement] Using new item_id filter (PREFERRED)');
  } else if (filters.product_id && filters.item_id) {
    // Ambos especificados: validar concordância
    // Buscar via ambos e cruzar validação (para detect drift)
    const mapping = await sequelize.query(
      `SELECT item_id FROM migracao_product_item_map WHERE product_id = :product_id`,
      { replacements: { product_id: filters.product_id }, type: 'SELECT' }
    );
    
    if (mapping.length > 0 && mapping[0].item_id !== filters.item_id) {
      console.warn(`[DRIFT] product_id=${filters.product_id} maps to ${mapping[0].item_id}, but item_id=${filters.item_id} specified`);
      // Decisão: usar item_id (mais confiável), avisar no log
      where.item_id = filters.item_id;
    } else {
      where.item_id = filters.item_id;
    }
  }
  // Se nenhum especificado: listar todos (cuidado com paginação)

  if (filters.type) where.type = filters.type;
  if (filters.start_date || filters.end_date) {
    where.created_at = {};
    if (filters.start_date) where.created_at[Op.gte] = new Date(filters.start_date);
    if (filters.end_date) where.created_at[Op.lte] = new Date(filters.end_date);
  }

  const { count, rows } = await InventoryMovement.findAndCountAll({
    where,
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'code'] },
      // ← NOVO: JOIN com Item quando item_id for usado
      ...(filters.item_id ? [{ model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] }] : []),
      { model: User, as: 'user', attributes: ['id', 'name'] }
    ],
    limit: pagination.limit,
    offset: pagination.offset,
    order: [['created_at', 'DESC']]
  });

  return { rows, count };
}

async findMovementById(id: number) {
  return InventoryMovement.findByPk(id, {
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'code', 'quantity'] },
      { model: Item, as: 'item', attributes: ['id', 'codigo', 'descricao'] },  // ← NOVO
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
    ]
  });
}
```

### 5.2 Associação Sequelize (models/index.ts)

```typescript
// Adicionar associação de Item ↔ InventoryMovement
Item.hasMany(InventoryMovement, { foreignKey: 'item_id', as: 'inventory_movements' });
InventoryMovement.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
```

### 5.3 API Controllers: Retrocompatibilidade

```typescript
// server/src/modules/inventory/presentation/controllers/inventoryController.ts

async listMovements(req: Request, res: Response) {
  const filters = {
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
    item_id: req.query.item_id ? String(req.query.item_id) : undefined,
    type: req.query.type as string | undefined,
    start_date: req.query.start_date as string | undefined,
    end_date: req.query.end_date as string | undefined,
  };

  // DUAL-READ: Aceitar ?product_id (legado) ou ?item_id (novo)
  // Se ambos especificados: avisar e preferir item_id
  if (filters.product_id && filters.item_id) {
    res.setHeader('X-Warning', 'Both product_id and item_id specified; using item_id (preferred)');
  }

  const result = await this.repository.listMovements(filters, {
    limit: req.query.limit ? Number(req.query.limit) : 20,
    offset: req.query.offset ? Number(req.query.offset) : 0
  });

  res.json(result);
}
```

### 5.4 Endpoints Propostos

| Endpoint | Modo | Status |
|----------|------|--------|
| `GET /api/inventory/movements?product_id=123` | Legado | Mantém (retrocompat) |
| `GET /api/inventory/movements?item_id=<uuid>` | Novo | Novo (preferred) |
| `GET /api/inventory/movements/by-item/:item_id` | Novo | Novo (convenience) |
| `GET /api/inventory/movements/:id` | Ambos | Sem mudança (by PK) |

---

## 6. Risco Residual & Mitigação

### 6.1 Riscos Críticos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| **Backfill incompleto** | Média | Alto | Executar validação 4.1 pós-backfill; revisar mapeamento em `migracao_product_item_map`; aceitar tolerance < 0.1% (produtos órfãos) |
| **Drift entre product_id e item_id** | Baixa | Médio | Comparação via crosswalk na validação 4.1c (BLOCO 3); alertar em dual-read se detectado |
| **FK constraint violation ao adicionar** | Baixa | Alto | Não adicionar CONSTRAINT até validação 100% (usar nullable temporário); validar integridade em Fase 4.1c BLOCO 2 antes de fazer NOT NULL |
| **Query performance degradação** | Baixa | Médio | Índices em item_id já criados (2.3); monitorar EXPLAIN ANALYZE em queries críticas pós-backfill |
| **Aplicação legada não suporta item_id UUID** | Média | Médio | Manter retrocompatibilidade em API (dual-read, aceitar product_id); cutover para item_id apenas após Fase 4.2 |
| **Erro em criação de nova movement durante backfill** | Baixa | Médio | Backfill não bloqueia INSERTs novos (coluna nullable); novas linhas terão item_id = NULL até serem processadas; considerar "catch-up" pós-backfill |

### 6.2 Estratégia de Rollback

Se backfill falhar irreversivelmente:

1. **Rollback SQL**: Executar `ALTER TABLE inventory_movements DROP COLUMN item_id`
2. **Reset Sequelize**: Remover campo `item_id` do model
3. **Investigação**: Revisar erro em backfill (lote falhado, mapping inconsistente)
4. **Replanejamento**: Decidir se reintentar ou escalar para arquitetura manual

### 6.3 Dependências de Pré-requisitos

| Pré-requisito | Status | Verificação |
|---------------|--------|-------------|
| Tabela `migracao_product_item_map` existir e populada | ✅ Fase 2A | `SELECT COUNT(*) FROM migracao_product_item_map WHERE status = 'SUCESSO'` > 0 |
| Tabela `items` existir com FK constraint | ✅ Fase 1 | `\d+ items` no PostgreSQL |
| Modelo `Item` importado e exportado em index.ts | ✅ Fase 1 | Verificar `import Item = require('./Item')` em models/index.ts |
| Modelo `InventoryMovement` com INT pk | ✅ Legado | Verificar tabela existe em DB |
| Schema PostgreSQL suportar UUID | ✅ Fase 1 | `CREATE EXTENSION IF NOT EXISTS pgcrypto` já executado |

---

## 7. Execução: Ordem de Steps

### 7.1 Fase 4.1a: Expand (Add Column)
1. Revisar / executar SQL em 2.1
2. Verificar índices criados: `\d+ inventory_movements`
3. Confirmar coluna `item_id` existe e é NULL

### 7.2 Fase 4.1b: Backfill
1. Criar script `04a_inventory_movements_expand.ts`
2. Executar: `npm run backfill -- 04a [--start 0] [--limit 50000]`
3. Monitorar logs de lotes/erros
4. Repeater se houver falhas (timeout, lock contention)

### 7.3 Fase 4.1c: Validação
1. Executar `04c_validation.sql`
2. Verificar todos os BLOCOs retornam 'PASS'
3. Documentar resultado de validação

### 7.4 Fase 4.1d: Código (Dual-Read)
1. Atualizar `SequelizeInventoryRepository.ts` com dual-read
2. Adicionar associação Item ↔ InventoryMovement em models/index.ts
3. Atualizar controller para aceitar `?item_id`
4. Rodar `npm run typecheck` + `npm run build`

### 7.5 Próxima: Fase 4.2 (Contract)
- Após testes integrais, fazer switch: `item_id NOT NULL`, remover references a `product_id`

---

## 8. Documentação de Checkpoint

### Checklist Pré-Backfill
- [ ] Backup de banco realizado
- [ ] `migracao_product_item_map` está populada (Fase 2B completa)
- [ ] Tabela `items` existe e é acessível
- [ ] SQL do Expand (2.1) revisado por lead arquiteto
- [ ] Model Sequelize (2.2) revisado

### Checklist Pós-Backfill
- [ ] Script 04a executado sem erros críticos
- [ ] Validação 4.1c (04c_validation.sql) PASS em todos os blocos
- [ ] Pct_complete >= 99.9% (tolerance aceitável)
- [ ] Nenhum FK orphan detectado
- [ ] Logs de backfill revisados e documentados

### Checklist Pós-Código
- [ ] Dual-read implementado e testado
- [ ] Controller aceita ?item_id e ?product_id
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] Testes de integração com nova coluna passam

---

## 9. Referências

- **Fase 1**: `docs/HANDOFF_CODEX.md` (seção "Fase 1 — Fundação de Schema")
- **Fase 2A**: `server/database/postgresql/02a_extend_item_estruturas.sql`
- **Fase 2B**: `server/src/scripts/backfill/02b_product_to_item.ts`
- **TODO**: `TODO.md` (linha 148: Fase 4)
- **Crosswalk**: `migracao_product_item_map` table

---

**Documento**: Design apenas — execução pendente de aprovação.  
**Próximo passo**: Review por Lead QA/DevSecOps; aprovação para execução de backfill em staging.
