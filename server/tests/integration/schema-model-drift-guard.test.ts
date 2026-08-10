/**
 * Guarda anti-regressão: o schema físico do PostgreSQL precisa contar a
 * mesma história que os models Sequelize.
 *
 * ## Por que este teste existe (incidente de 2026-08-09/10)
 *
 * O banco tinha colunas `NOT NULL` que o model declarava opcionais e que o
 * código **nunca preenchia**. O efeito era catastrófico e silencioso: criar
 * estrutura de produto (BOM), criar cliente, criar venda, criar contagem de
 * inventário e **ajustar estoque** eram impossíveis — todos `500` — e o app
 * mobile inteiro estava morto. A prova de que nunca funcionou estava no
 * próprio banco: entre 35 movimentações de estoque, **nenhuma** era
 * `reference_type='adjustment'`.
 *
 * Nenhuma rede de segurança existente pegava isso:
 * - `tsc --noEmit` não sabe nada sobre o schema físico;
 * - a suíte unitária usa repositório mockado, sem Postgres;
 * - até o boot do servidor passa — o defeito só aparece no `INSERT`.
 *
 * Corrigido em `94e0f14` (38 colunas em 7 tabelas). Este teste existe para
 * a classe não voltar: ele confronta `information_schema` com o que cada
 * model declara e falha quando os dois divergem.
 *
 * ## Sintoma correlato que este teste também expõe
 *
 * FK com `ON DELETE SET NULL` sobre coluna `NOT NULL` é uma contradição
 * autoevidente: a FK promete gravar `NULL` numa coluna que o proíbe. Toda
 * ocorrência encontrada até hoje era, de fato, uma coluna indevidamente
 * obrigatória.
 *
 * ## Sobre o `drift` entre bancos
 *
 * `erp_evok_audio_test` chegou a ter **29 colunas `NOT NULL` a mais** que o
 * banco de desenvolvimento **com as mesmas migrations** — ou seja, nenhum
 * dos dois era reproduzível a partir do versionado. Enquanto isso não for
 * resolvido, provisionar o servidor de produção gera um banco diferente.
 * Rodar este teste contra o banco de destino é a forma de detectar isso.
 *
 * @module tests/integration/schema-model-drift-guard
 */

import { integrationEnabled } from '../helpers/testApi';

const describeIntegration = integrationEnabled() ? describe : describe.skip;

/**
 * Colunas cuja divergência model × banco é conhecida, aceita e rastreada.
 * Cada entrada precisa de um motivo e de um dono — este teste não deve
 * virar um depósito de exceções silenciosas.
 */
const KNOWN_EXCEPTIONS: Array<{ table: string; column: string; reason: string }> = [
  // Vazio de propósito. Ao adicionar, registre também em
  // docs/governance/TODO.md com prazo de resolução.
];

function isException(table: string, column: string): boolean {
  return KNOWN_EXCEPTIONS.some((e) => e.table === table && e.column === column);
}

describeIntegration('Guarda de drift schema × model', () => {
  let sequelize: any;
  let models: Record<string, any>;

  beforeAll(() => {
    // Import tardio: fora do modo integração nada disso deve ser carregado,
    // senão o `describe.skip` ainda abriria conexão com o Postgres.
    sequelize = require('../../src/config/database').sequelize;
    models = require('../../src/models/index');
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  /**
   * Lê a nulabilidade real de cada coluna do schema `public`.
   *
   * @returns Mapa `tabela.coluna` → `{ nullable, hasDefault }`.
   */
  async function readPhysicalColumns(): Promise<Map<string, { nullable: boolean; hasDefault: boolean }>> {
    const [rows]: any = await sequelize.query(`
      SELECT table_name, column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const map = new Map<string, { nullable: boolean; hasDefault: boolean }>();
    for (const row of rows) {
      map.set(`${row.table_name}.${row.column_name}`, {
        nullable: row.is_nullable === 'YES',
        hasDefault: row.column_default !== null,
      });
    }
    return map;
  }

  it('nenhuma coluna obrigatória no banco é declarada opcional no model', async () => {
    const physical = await readPhysicalColumns();
    const divergences: string[] = [];

    for (const [modelName, model] of Object.entries(models)) {
      if (!model?.getTableName || !model?.rawAttributes) continue;

      const tableName = typeof model.getTableName() === 'string'
        ? model.getTableName()
        : model.getTableName().tableName;

      for (const [attrName, attr] of Object.entries<any>(model.rawAttributes)) {
        const columnName = attr.field || attrName;
        const key = `${tableName}.${columnName}`;
        const column = physical.get(key);
        if (!column || isException(tableName, columnName)) continue;

        // O model considera a coluna opcional quando `allowNull` é `true` ou
        // foi omitido (o default do Sequelize é permitir nulo).
        const modelAllowsNull = attr.allowNull !== false;

        // Coluna obrigatória COM default nunca quebra um INSERT que a omite,
        // então não é um defeito — a menos que o código passe NULL explícito,
        // o que anula o default do Postgres (foi o caso de `clients.phone`).
        if (!column.nullable && !column.hasDefault && modelAllowsNull) {
          divergences.push(
            `${modelName} (${key}): banco exige valor (NOT NULL sem default), `
            + 'model declara opcional — INSERT que omitir a coluna vai falhar com 500.',
          );
        }
      }
    }

    expect(divergences).toEqual([]);
  });

  it('nenhuma FK ON DELETE SET NULL aponta para coluna NOT NULL', async () => {
    const [rows]: any = await sequelize.query(`
      SELECT
        tc.constraint_name,
        kcu.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.table_schema
      JOIN information_schema.columns col
        ON col.table_name = kcu.table_name
       AND col.column_name = kcu.column_name
       AND col.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND rc.delete_rule = 'SET NULL'
        AND col.is_nullable = 'NO'
      ORDER BY kcu.table_name, kcu.column_name
    `);

    const contradictions = rows
      .filter((r: any) => !isException(r.table_name, r.column_name))
      .map((r: any) => `${r.table_name}.${r.column_name} (${r.constraint_name})`);

    expect(contradictions).toEqual([]);
  });
});
