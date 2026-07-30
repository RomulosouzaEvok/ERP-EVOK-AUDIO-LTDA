# Handoff Codex — Migração Product/Item

Documento de handoff entre desenvolvimento (Backend Engineer) e QA/auditoria (Codex agent).

---

## Fase 1 — Fundação de Schema (Concluída)

**Data**: 2026-07-30  
**Escopo**: Criar modelos Sequelize e tabelas SQL para extensões do modelo canônico `Item`.  
**Status**: ✅ Concluído

### Decisão arquitetural
Implementado o padrão **Item (core, intocado) + extensões por domínio**:
- `Item` mantém 12 colunas (hot path do MRP), nunca muda
- `item_categorias` (novo) — categorias para itens (UUID PK, código único, descrição)
- `item_detalhes_comerciais` (novo, 1:1 obrigatória com `Item`) — preço, NCM/CEST, peso, localização, número de desenho, revisão, lote, série
- `item_especificacoes_tecnicas` (novo, 1:1 opcional com `Item`) — `familia_tecnica` (discriminador: ALTO_FALANTE, CABO, AMPLIFICADOR, etc) + `atributos` JSONB (flexível por família)

Esta separação evita:
- Inchar `Item` com campos comerciais/técnicos que MRP nunca usa
- Criar uma tabela genérica de detalhe que muda a cada nova linha de produto
- Necessidade de `ALTER TABLE` ao lançar novos tipos de produto

### Arquivos modificados

#### Criados
- `server/src/models/ItemCategoria.ts` — Model Sequelize com UUID PK, `codigo` unique, `descricao`, timestamps
- `server/src/models/ItemDetalheComercial.ts` — Model Sequelize com FK `item_id` (PK), `preco_venda`, `categoria_id`, NCM/CEST, peso, localização, desenho, revisão, lote/série, timestamps
- `server/src/models/ItemEspecificacaoTecnica.ts` — Model Sequelize com FK `item_id` (PK), `familia_tecnica` VARCHAR(40), `atributos` JSONB com índice GIN, timestamps
- `docs/HANDOFF_CODEX.md` — Este arquivo

#### Modificados
- `server/src/models/index.ts` — Adicionados imports e associações 1:1 de `Item` com `ItemDetalheComercial` e `ItemEspecificacaoTecnica`, `ItemCategoria` com `ItemDetalheComercial`
- `server/database/postgresql/01_schema.sql` — Adicionadas 3 tabelas SQL com índices: `item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`

### Invariantes mantidas
- ✅ `Item.ts` permanece intocado (compatibilidade com MRP)
- ✅ Sem FK constraints diretas em `Item` (apenas comentários em PKs de FK das novas tabelas)
- ✅ DECIMAL(18,6) para quantidades/custos (conforme padrão do projeto)
- ✅ JSONB para `atributos` com índice GIN (facilita busca e evolução de specs por família)
- ✅ Padrão Sequelize: `underscored: true`, `createdAt: 'criado_em'`, `updatedAt: 'atualizado_em'`

### Testes críticos para Codex validar

1. **Sincronização de schema**: verificar que as 3 tabelas SQL (`item_categorias`, `item_detalhes_comerciais`, `item_especificacoes_tecnicas`) existem no banco com coluna/tipo/índice corretos
   ```sql
   \d+ item_categorias
   \d+ item_detalhes_comerciais
   \d+ item_especificacoes_tecnicas
   ```

2. **Modelos Sequelize**: verificar que os 3 modelos carregam sem erro e que `sequelize.sync()` (com env var `DB_FORCE_SYNC=true`, `DB_ALLOW_UNSAFE_ALTER=true`) não altera nada (já está sincronizado)
   ```bash
   npm test server -- --testPathPattern="models|sequelize" --verbose
   ```

3. **Associações**: verificar que:
   - `Item.hasOne(ItemDetalheComercial)` funciona: `item.getDetalheComercial()`
   - `Item.hasOne(ItemEspecificacaoTecnica)` funciona: `item.getEspecificacaoTecnica()`
   - `ItemCategoria.hasMany(ItemDetalheComercial)` funciona: `categoria.getItensDetalhe()`

4. **FK integrity**: inserir um `Item`, depois `ItemDetalheComercial` associado; verificar que dropar o `Item` em cascata remove o detalhe também (ON DELETE CASCADE)

5. **Índices**: confirmar que as queries abaixo usam índices (EXPLAIN ANALYZE):
   ```sql
   SELECT * FROM item_categorias WHERE codigo = '...';
   SELECT * FROM item_detalhes_comerciais WHERE categoria_id = '...' OR ncm = '...';
   SELECT * FROM item_especificacoes_tecnicas WHERE familia_tecnica = 'ALTO_FALANTE';
   ```

6. **JSONB GIN index**: testar busca em atributos JSONB
   ```sql
   SELECT * FROM item_especificacoes_tecnicas 
   WHERE atributos @> '{"fs": 40.5}'::jsonb;
   ```

### Próximas fases (não iniciadas)
- **Fase 2**: Backfill de dados `Product` → `Item` + extensões
- **Fase 3**: Workflow de versão em `ItemEstrutura` (draft/active/inactive/superseded)
- **Fase 4**: Reescrita de FKs em 16 tabelas (expand-contract)
- **Fase 5**: Migração de módulos de aplicação
- **Fase 6**: Descomissionamento de `Product`/`BillOfMaterial`

### Notas para implementação futura
- `ItemEspecificacaoTecnica.atributos` será validado por schema Zod específico por `familia_tecnica` (ex: `ThieleSmallAtributosSchema` para ALTO_FALANTE)
- Campos de `ItemDetalheComercial` devem ser obrigatórios em qualquer `CREATE Item` ou `UPDATE Item` que tenha um detalhe comercial associado (regra de negócio: todo item vendável tem preço, NCM, peso)
- `item_categorias` substitui parcialmente `Category` (modelo legado); backfill deve mapear `product_categories.id` → novo `item_categorias.id` mantendo códigos/descrições

---

**Desenvolvedor**: Claude Code (Backend Engineer)  
**Data**: 2026-07-30  
**Próximo checkpoint**: Aprovação de Codex para prosseguir para Fase 2 (Backfill)
