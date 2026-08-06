/**
 * Teste de guarda (anti-regressão) da Onda 2 de desarme de "bombas
 * latentes" (`docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md`, seção "Bombas latentes
 * conhecidas" / item 10 do roadmap — fase "contract" da unificação
 * legado/novo).
 *
 * Contexto: `01_schema.sql` (baseline `20260731-000001-baseline-schema`)
 * criou um schema-fantasma paralelo em português que NUNCA foi adotado
 * pelo app real (0 linhas em produção/dev, 0 models Sequelize, 0 uso em
 * `server/src` — confirmado por auditoria em 2026-08-06, ver migration
 * `20260806-000042-comment-deprecated-orphan-pt-schema-tables`, que marca
 * estas 12 tabelas como `DEPRECATED` via `COMMENT ON TABLE` no banco).
 * O app real usa o equivalente em inglês (`users`, `suppliers`,
 * `purchase_requisitions`, `production_orders`, `inventory_movements`,
 * `audit_logs`, `lot_controls`, `serial_numbers`, `webhook_events`,
 * `purchase_receipts`).
 *
 * Este teste falha se qualquer arquivo NOVO em `server/src` passar a
 * referenciar uma dessas 12 tabelas via padrões inequívocos de uso real
 * (SQL bruto `FROM/JOIN/INTO/UPDATE/TABLE <tabela>`, `tableName: '<tabela>'`
 * de um `sequelize.define`, ou métodos do `queryInterface` do
 * sequelize-cli como `bulkInsert`/`bulkDelete`/`describeTable`) — impedindo
 * que alguém "reviva" o schema-fantasma por engano em vez de usar a tabela
 * em inglês correspondente.
 *
 * Deliberadamente NÃO usa um grep ingênuo por substring (ex: a palavra solta
 * "fornecedores"/"usuarios"/"lotes" aparece com frequência em comentários
 * em português sem relação nenhuma com a tabela orfã) — os padrões abaixo
 * exigem contexto de uso real de SQL/ORM, não apenas a palavra.
 *
 * @module tests/unit/no-orphan-pt-schema-tables
 */

import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../src');

/** As 12 tabelas órfãs do schema-fantasma (ver migration 20260806-000042). */
const ORPHAN_TABLES = [
  'usuarios',
  'fornecedores',
  'lotes',
  'numeros_serie',
  'requisicoes_compra',
  'requisicao_compra_items',
  'entradas_nf',
  'entradas_nf_items',
  'ordens_producao',
  'movimentos_estoque',
  'webhooks_eventos',
  'auditoria_eventos',
];

/**
 * Tabelas do schema NOVO (canônico, Fase 1-4 da unificação Item) que
 * também nasceram do `01_schema.sql` mas TÊM model Sequelize e uso ativo
 * em `server/src` — nunca devem ser confundidas com a lista órfã acima.
 */
const LIVE_PT_TABLES = [
  'items',
  'item_categorias',
  'item_detalhes_comerciais',
  'item_especificacoes_tecnicas',
  'item_estruturas',
  'item_suppliers',
  'mrp_ordens_planejadas',
];

function listTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Constrói os padrões de uso real (não substring solta) para uma tabela. */
function buildForbiddenPatterns(table: string): RegExp[] {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    // SQL bruto: FROM/JOIN/INTO/UPDATE/TABLE <tabela> (com ou sem aspas).
    new RegExp(`\\b(FROM|JOIN|INTO|UPDATE|TABLE)\\s+"?${escaped}"?\\b`, 'i'),
    // Definição de model Sequelize apontando para a tabela órfã.
    new RegExp(`tableName:\\s*['"]${escaped}['"]`),
    // Métodos de queryInterface (bulkInsert/bulkDelete/describeTable/etc.)
    new RegExp(`(bulkInsert|bulkDelete|describeTable|dropTable|createTable)\\(\\s*['"]${escaped}['"]`),
  ];
}

describe('no-orphan-pt-schema-tables (guarda anti-regressão schema-fantasma)', () => {
  const tsFiles = listTsFiles(SRC_ROOT);

  it('encontrou arquivos .ts em src/ para varrer (sanity check)', () => {
    expect(tsFiles.length).toBeGreaterThan(50);
  });

  it.each(ORPHAN_TABLES)('nenhum arquivo em server/src referencia a tabela órfã "%s" via SQL/ORM real', (table) => {
    const patterns = buildForbiddenPatterns(table);
    const offenders: string[] = [];

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (patterns.some((pattern) => pattern.test(content))) {
        offenders.push(path.relative(SRC_ROOT, filePath));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('a lista de tabelas órfãs e a lista de tabelas PT vivas não se sobrepõem (sanity check)', () => {
    const overlap = ORPHAN_TABLES.filter((table) => LIVE_PT_TABLES.includes(table));
    expect(overlap).toEqual([]);
  });
});
