/**
 * Bloco 4 (Depósitos, docs/governance/TODO.md) — Validação pós-backfill de
 * `product_warehouse_stock`.
 *
 * Script READ-ONLY e idempotente (não altera nenhum dado — pode ser
 * executado quantas vezes forem necessárias, inclusive em produção). Segue
 * o mesmo padrão de relatório dos scripts `.sql` de validação já existentes
 * (`04c_validation.sql`, `04h_lot_controls_validation.sql`, etc: blocos
 * numerados PASS/FAIL), mas implementado em TypeScript (como os `.ts` de
 * backfill desta mesma pasta) para poder encerrar com `process.exit(1)`
 * quando encontrar alguma divergência — os `.sql` legados imprimem PASS/FAIL
 * no console via `psql`, mas não long fazem o processo falhar sozinhos.
 *
 * INVARIANTE VALIDADA (`docs/business/BUSINESS_RULES.md` §12 item 3,
 * `docs/DATABASE.md`): para todo produto,
 *   SOMA(product_warehouse_stock.quantity) = products.quantity
 * Isso cobre tanto o snapshot do backfill original (migration
 * `20260804-...` — todo saldo `products.quantity > 0` foi migrado 1:1 para
 * o depósito `INSUMOS`) quanto o estado atual do dual-write contínuo (toda
 * rotina que altera `products.quantity` também grava em
 * `product_warehouse_stock` na mesma transação, ver
 * `server/src/services/warehouseStockService.ts`).
 *
 * Blocos de validação:
 *   1. Cobertura: produtos com `quantity > 0` que NÃO têm nenhuma linha em
 *      `product_warehouse_stock` (backfill ausente/incompleto).
 *   2. Integridade referencial: linhas de `product_warehouse_stock` cujo
 *      `product_id`/`warehouse_id` não existe mais (órfãs).
 *   3. Invariante de soma: `SUM(product_warehouse_stock.quantity)` por
 *      produto comparado a `products.quantity` (tolerância de arredondamento
 *      de 0.000001 pela precisão `DECIMAL(18,6)`).
 *   4. Saldos negativos: nenhuma linha de `product_warehouse_stock` pode
 *      ficar `< 0` (defesa em profundidade — já existe `CHECK` no banco).
 *
 * Uso: npx tsx server/src/scripts/backfill/04l_product_warehouse_stock_validation.ts
 * Exit code: 0 se todos os blocos passarem, 1 se qualquer divergência for encontrada.
 */

import { sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

const TOLERANCE = 0.000001;

interface ValidationResult {
  block: string;
  pass: boolean;
  details: string;
}

/**
 * Bloco 1: produtos com saldo total positivo (`products.quantity > 0`) que
 * não têm nenhuma linha em `product_warehouse_stock` — indica backfill
 * ausente ou incompleto.
 *
 * @returns Resultado do bloco de validação.
 */
async function validateCoverage(): Promise<ValidationResult> {
  const rows: any[] = await sequelize.query(
    `SELECT p.id, p.code, p.name, p.quantity
     FROM products p
     WHERE p.quantity > 0
       AND NOT EXISTS (
         SELECT 1 FROM product_warehouse_stock pws WHERE pws.product_id = p.id
       )
     ORDER BY p.id ASC
     LIMIT 50`,
    { type: QueryTypes.SELECT }
  );

  const pass = rows.length === 0;
  const details = pass
    ? 'Todos os produtos com quantity > 0 têm ao menos uma linha em product_warehouse_stock.'
    : `${rows.length} produto(s) com quantity > 0 SEM linha em product_warehouse_stock (mostrando até 50): ` +
      rows.map((r) => `#${r.id} ${r.code} (quantity=${r.quantity})`).join(', ');

  return { block: 'BLOCO 1: COBERTURA DE BACKFILL', pass, details };
}

/**
 * Bloco 2: integridade referencial — linhas de `product_warehouse_stock`
 * cujo `product_id` ou `warehouse_id` não existe mais (órfãs). Não deveria
 * ocorrer (FKs `RESTRICT`/`CASCADE` no schema), mas validado explicitamente
 * como defesa em profundidade.
 *
 * @returns Resultado do bloco de validação.
 */
async function validateReferentialIntegrity(): Promise<ValidationResult> {
  const orphanProducts: any[] = await sequelize.query(
    `SELECT pws.id, pws.product_id
     FROM product_warehouse_stock pws
     LEFT JOIN products p ON p.id = pws.product_id
     WHERE p.id IS NULL
     LIMIT 50`,
    { type: QueryTypes.SELECT }
  );

  const orphanWarehouses: any[] = await sequelize.query(
    `SELECT pws.id, pws.warehouse_id
     FROM product_warehouse_stock pws
     LEFT JOIN warehouses w ON w.id = pws.warehouse_id
     WHERE w.id IS NULL
     LIMIT 50`,
    { type: QueryTypes.SELECT }
  );

  const pass = orphanProducts.length === 0 && orphanWarehouses.length === 0;
  const details = pass
    ? 'Nenhuma linha órfã (todo product_id/warehouse_id resolve para um registro existente).'
    : `Órfãs de produto: ${orphanProducts.length}. Órfãs de depósito: ${orphanWarehouses.length}.`;

  return { block: 'BLOCO 2: INTEGRIDADE REFERENCIAL', pass, details };
}

/**
 * Bloco 3: invariante central — a soma dos saldos por depósito de cada
 * produto deve ser igual a `products.quantity`.
 *
 * @returns Resultado do bloco de validação.
 */
async function validateSumInvariant(): Promise<ValidationResult> {
  const rows: any[] = await sequelize.query(
    `SELECT
       p.id,
       p.code,
       p.quantity AS product_quantity,
       COALESCE(SUM(pws.quantity), 0) AS warehouse_sum
     FROM products p
     LEFT JOIN product_warehouse_stock pws ON pws.product_id = p.id
     GROUP BY p.id, p.code, p.quantity
     HAVING ABS(p.quantity - COALESCE(SUM(pws.quantity), 0)) > :tolerance
     ORDER BY p.id ASC
     LIMIT 50`,
    { type: QueryTypes.SELECT, replacements: { tolerance: TOLERANCE } }
  );

  const totalProducts: any[] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM products`,
    { type: QueryTypes.SELECT }
  );

  const pass = rows.length === 0;
  const details = pass
    ? `Invariante de soma OK para todos os ${totalProducts[0]?.total ?? '?'} produtos ` +
      `(SOMA(product_warehouse_stock.quantity) = products.quantity, tolerância ${TOLERANCE}).`
    : `${rows.length} produto(s) com divergência entre products.quantity e a soma dos depósitos (mostrando até 50): ` +
      rows
        .map(
          (r) =>
            `#${r.id} ${r.code} (products.quantity=${r.product_quantity}, soma_depositos=${r.warehouse_sum})`
        )
        .join(', ');

  return { block: 'BLOCO 3: INVARIANTE DE SOMA (products.quantity = SOMA product_warehouse_stock)', pass, details };
}

/**
 * Bloco 4: nenhuma linha de `product_warehouse_stock` deve ter saldo
 * negativo (o `CHECK (quantity >= 0)` do banco já impede isso na origem;
 * este bloco é apenas uma defesa em profundidade read-only).
 *
 * @returns Resultado do bloco de validação.
 */
async function validateNoNegativeStock(): Promise<ValidationResult> {
  const rows: any[] = await sequelize.query(
    `SELECT id, product_id, warehouse_id, quantity
     FROM product_warehouse_stock
     WHERE quantity < 0
     LIMIT 50`,
    { type: QueryTypes.SELECT }
  );

  const pass = rows.length === 0;
  const details = pass
    ? 'Nenhum saldo negativo encontrado em product_warehouse_stock.'
    : `${rows.length} linha(s) com saldo negativo (mostrando até 50): ` +
      rows.map((r) => `id=${r.id} produto=${r.product_id} deposito=${r.warehouse_id} quantity=${r.quantity}`).join(', ');

  return { block: 'BLOCO 4: SALDOS NEGATIVOS', pass, details };
}

/**
 * Executa todos os blocos de validação em sequência, imprime o relatório no
 * console e encerra o processo com exit code 1 se qualquer bloco falhar.
 *
 * @returns {Promise<void>}
 */
async function runValidation(): Promise<void> {
  console.log('='.repeat(70));
  console.log('🔎 Validação pós-backfill: product_warehouse_stock (Bloco 4)');
  console.log('='.repeat(70));

  const results: ValidationResult[] = [];

  try {
    results.push(await validateCoverage());
    results.push(await validateReferentialIntegrity());
    results.push(await validateSumInvariant());
    results.push(await validateNoNegativeStock());

    console.log('');
    for (const result of results) {
      console.log(`=== ${result.block} ===`);
      console.log(result.pass ? `✅ PASS` : `❌ FAIL`);
      console.log(result.details);
      console.log('');
    }

    const allPassed = results.every((r) => r.pass);

    console.log('='.repeat(70));
    if (allPassed) {
      console.log('✅ VALIDAÇÃO CONCLUÍDA: todos os blocos PASS.');
    } else {
      const failedBlocks = results.filter((r) => !r.pass).map((r) => r.block);
      console.log(`❌ VALIDAÇÃO ENCONTROU DIVERGÊNCIAS em: ${failedBlocks.join(' | ')}`);
    }
    console.log('='.repeat(70) + '\n');

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('❌ Erro ao executar validação:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

// CLI entry point
if (require.main === module) {
  runValidation();
}

export { runValidation, validateCoverage, validateReferentialIntegrity, validateSumInvariant, validateNoNegativeStock };
