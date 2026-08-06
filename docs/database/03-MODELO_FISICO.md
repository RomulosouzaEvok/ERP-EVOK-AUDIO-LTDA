# Modelo Físico — ERP EVOK ÁUDIO

O modelo físico real é o schema efetivamente aplicado no PostgreSQL 16
pelas migrations do Sequelize. **A fonte de verdade é sempre o banco
rodando**, nunca um arquivo `.sql` escrito à mão — ver `docs/database/DATABASE.md`
seção "Schema Strategy & Migrations (ADR-DB-001)".

## Como este DDL foi obtido

`docs/database/schema.sql` (anexo deste diretório) é o resultado literal
de:

```bash
docker exec evok-postgres pg_dump -U evok_admin -d erp_evok_audio \
  --schema-only --no-owner --no-privileges \
  > docs/database/schema.sql
```

Rodado contra o container local `evok-postgres` em 2026-08-06 (reconferido
no mesmo dia após a migration `20260806-000090-create-import-processes.cjs`,
módulo COMEX/Importação), com as 66 migrations já aplicadas
(`npm run migration:status` — todas `up`). Isso
garante que o DDL documentado é **exatamente** o que roda, não uma
reconstrução manual sujeita a divergir do real (o mesmo risco que o
`server/database/postgresql/01_schema.sql` legado já materializou —
está marcado HISTÓRICO/DEPRECATED e não deve ser usado para provisionar
banco novo, ver `docs/infra/DEPLOY_UBUNTU.md`).

## Quando regenerar

**Sempre que uma migration nova for aplicada** (`npm run migration:up`
com sucesso), no mesmo ciclo de trabalho, regenerar o dump:

```bash
docker exec evok-postgres pg_dump -U evok_admin -d erp_evok_audio \
  --schema-only --no-owner --no-privileges \
  > docs/database/schema.sql
```

E revisar se a mudança precisa refletir também em:
- [02-MODELO_LOGICO.md](02-MODELO_LOGICO.md) (se mexeu em uma tabela dos módulos cobertos pelo DER)
- [04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md) (regenerar — ver `gen_dict.py` abaixo)
- `docs/database/DATABASE.md` (registrar a decisão/racional da mudança, changelog)

## Regenerando o Dicionário de Dados

`04-DICIONARIO_DADOS.md` é gerado por um script Python que faz
introspecção via `information_schema` (não lê migrations/models — reflete
o banco real):

```bash
# 1. Exportar colunas e constraints do banco real
docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -X -A -F"|" -c "
SELECT c.table_name, c.ordinal_position, c.column_name,
  CASE WHEN c.data_type='character varying' THEN 'VARCHAR('||c.character_maximum_length||')'
       WHEN c.data_type='numeric' THEN 'NUMERIC('||c.numeric_precision||','||c.numeric_scale||')'
       WHEN c.data_type='USER-DEFINED' THEN c.udt_name
       ELSE upper(c.data_type) END AS tipo,
  c.is_nullable, c.column_default
FROM information_schema.columns c
WHERE c.table_schema='public' AND c.table_name NOT IN ('SequelizeMeta')
ORDER BY c.table_name, c.ordinal_position;
" > docs/database/_columns_raw.psv

docker exec evok-postgres psql -U evok_admin -d erp_evok_audio -X -A -F"|" -c "
SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema=kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.constraint_type='FOREIGN KEY'
WHERE tc.table_schema='public' AND tc.constraint_type IN ('PRIMARY KEY','FOREIGN KEY','UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;
" > docs/database/_constraints_raw.psv

# 2. Rodar o gerador (Python 3) — produz 04-DICIONARIO_DADOS.md
python docs/database/gen_dict.py

# 3. Apagar os .psv temporários (não versionados)
rm docs/database/_columns_raw.psv docs/database/_constraints_raw.psv
```

O script `docs/database/gen_dict.py` mantém um dicionário `TABLE_DESC`
com a descrição de negócio curada de cada tabela ativa — ao criar uma
tabela nova, adicione uma entrada nesse dicionário antes de rodar o
gerador, senão a tabela aparece com a descrição genérica
"não catalogada nesta rodada".

## Estatísticas do schema atual (2026-08-06, pós-COMEX)

| Métrica | Valor |
|---|---|
| Tabelas de negócio (excl. `SequelizeMeta`) | 80 |
| Tabelas ativas (schema em inglês, em uso real) | 65¹ |
| Tabelas órfãs `[DEPRECATED]` (schema-fantasma PT) | 12 |
| Tabelas técnicas de log de migração (`migracao_*`, sem uso em código vivo, mas não fazem parte do schema-fantasma PT) | 3 |
| Foreign keys | 175 |
| Migrations aplicadas | 66 (reconferido 2026-08-06, inclui `20260806-000090-create-import-processes.cjs` — módulo COMEX/Importação, `import_processes`/`import_process_items`) |
| Extensões PostgreSQL em uso | `pgcrypto` (apenas — `gen_random_uuid()` para PKs UUID de `items` e tabelas relacionadas; nenhuma outra extensão) |
| Funções/procedures customizadas no banco | 0 (ver [06-ESTRUTURAS_PROGRAMAVEIS.md](06-ESTRUTURAS_PROGRAMAVEIS.md)) |
| Triggers customizados no banco | 0 |

¹ **Correção de reconferência (2026-08-06):** a versão anterior desta
tabela somava `66 ativas + 12 órfãs = 78`, mas isso contava as 3 tabelas
técnicas de log de migração (`migracao_bom_log`, `migracao_categoria_map`,
`migracao_product_item_map`) como "ativas em uso real" — elas têm 0 uso em
`server/src` (confirmado por `TABLE_DESC` em `gen_dict.py` e pelo teste de
guarda `server/tests/unit/no-orphan-pt-schema-tables.test.ts`, que não as
cobre por não fazerem parte do schema-fantasma PT), então não são
"ativas" nem "órfãs PT" — são uma terceira categoria (log técnico da
migração Product→Item, historicamente relevante, não deletado por
prudência, mas sem uso em código vivo). Números corretos, agora incluindo
as 2 tabelas novas do módulo COMEX (`import_processes`,
`import_process_items`, ambas ativas em inglês): `65 + 12 + 3 = 80`.

## Colunas críticas — precisão decimal obrigatória

Reforço da regra do projeto (peso/custo/quantidade fracionada = sempre
`DECIMAL(18,6)`/`NUMERIC(18,6)`, nunca `FLOAT`/`REAL`). Confirmado por
introspecção real que o schema atual **respeita** essa regra nas colunas
centrais: `inventory_movements.quantity`, `product_warehouse_stock.quantity`,
`warehouse_transfers.quantity`, `item_suppliers.unit_price`/`moq`,
`work_centers.cost_per_hour`, `production_cost_settings.default_labor_rate_per_hour`,
`sale_items.invoiced_quantity` — todas `NUMERIC(18,6)`.

**Achado de auditoria (não é uma violação da regra, mas uma inconsistência
a observar):** várias tabelas monetárias do schema `products`/`sales`
legado usam `NUMERIC(10,2)` (ex.: `sales.total_amount`,
`sale_items.unit_price`, `products.price`, `accounts_payable.amount`) em
vez de `DECIMAL(18,6)`. Isso é aceitável para **valores monetários em
BRL** (2 casas decimais é o padrão contábil), mas diverge da regra
CLAUDE.md se lida literalmente ("custo... DEVE ser DECIMAL(18,6)"). Não
recomendamos migrar essas colunas agora (risco/benefício desfavorável tão
perto do Go-Live, sem bug concreto associado) — registrado aqui como
observação para uma decisão futura consciente, não como pendência
automática.

**Achado de nomenclatura (reconferência 2026-08-06):** varredura das 78
tabelas × todas as colunas (`information_schema.columns`, sem exceção)
não encontrou nenhuma coluna `camelCase` (todas são `snake_case`, como
exige `underscored: true`) nem nenhum nome de tabela fora do padrão
`snake_case`. O subsistema `items`/`item_categorias`/
`item_detalhes_comerciais`/`item_especificacoes_tecnicas`/
`item_estruturas` é consistentemente em português (tabela, colunas e até
`criado_em`/`atualizado_em` em vez de `created_at`/`updated_at`) — desenho
deliberado do núcleo Item (ver CLAUDE.md §4), não uma inconsistência
dentro do próprio subsistema. As 12 tabelas órfãs do schema-fantasma PT
(`fornecedores`, `usuarios`, `lotes`, etc.) também são internamente
consistentes em português e já estão marcadas `[DEPRECATED]`. O único
achado real de mistura de idioma **dentro de uma mesma tabela ativa** é
`access_profiles.nome`/`access_profiles.descricao` (português) ao lado de
`allowed_warehouses`/`active`/`created_at`/`updated_at` (inglês) e da
tabela filha `access_profile_permissions` 100% em inglês — ver detalhe em
[04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md#accessprofiles). Não é um
bug (model/frontend já refletem exatamente essas colunas), apenas uma
inconsistência de convenção isolada, registrada para decisão futura.

## Provisionamento de banco novo (produção)

Nunca aplicar `schema.sql` diretamente em um ambiente novo — ele é
**documentação**, não o mecanismo de deploy. O mecanismo canônico
continua sendo:

```bash
cd server
npm ci
npm run migration:up
npm run migration:status   # confirmar todas "up"
```

Ver `docs/infra/DEPLOY_UBUNTU.md` para o runbook completo de
provisionamento em Ubuntu 24.04 + Docker Compose.
