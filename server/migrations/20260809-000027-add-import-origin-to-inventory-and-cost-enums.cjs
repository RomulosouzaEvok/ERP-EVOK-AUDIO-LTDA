'use strict';

/**
 * G14 (Onda 2 do PLANO_ACAO_CADEIA_PRODUTO_2026-08-09) — origem `import` no
 * rastro de estoque e de custo.
 *
 * ## Problema
 *
 * `ReceiveImportProcessUseCase` gravava a entrada do material importado com
 * `inventory_movements.reference_type = 'purchase'` e
 * `product_cost_ledgers.source_type = 'purchase'`, com
 * `reference_id`/`source_id` apontando para `import_processes.id`.
 *
 * Isso nao era so uma imprecisao de nomenclatura: era **dado factualmente
 * errado**. O indice `(reference_type, reference_id)` existe exatamente para
 * a consulta reversa "toda movimentacao originada por este documento"; com
 * `'purchase'` gravado, essa consulta cruza `import_processes.id` contra
 * `purchase_orders.id` e devolve o pedido de compra ERRADO sempre que os ids
 * coincidirem — o que e praticamente certo, ja que as duas sequencias comecam
 * em 1. Uma auditoria fiscal que puxasse o rastro por esse par receberia a
 * nota de compra de outro fornecedor.
 *
 * ## Decisao
 *
 * Acrescentar o valor `'import'` aos dois ENUMs, em vez de:
 *
 * - manter `'purchase'` (mantem o dado errado); ou
 * - criar coluna nova de origem (mudanca estrutural em duas tabelas de alto
 *   trafego, quando o ENUM ja e o mecanismo desenhado para isso).
 *
 * `ALTER TYPE ... ADD VALUE` e **aditivo e retrocompativel**: nenhuma linha
 * existente muda, nenhum leitor quebra. As linhas gravadas ANTES desta
 * migration continuam com `'purchase'` — nao ha backfill automatico possivel
 * (nao da para distinguir, olhando so a linha, um `reference_id` que aponta
 * para compra de um que aponta para importacao). Se houver processo de
 * importacao ja recebido em producao, a correcao e manual, cruzando
 * `import_processes.received_at` com a `description` do movimento, que sempre
 * cita o numero do processo (`IMP-<ano>-XXXX`).
 *
 * ## ATENCAO — ordem de deploy
 *
 * O codigo do working tree ja grava `'import'`. Esta migration precisa estar
 * APLICADA antes de subir esse codigo, senao o recebimento de importacao
 * falha com erro de ENUM invalido do Postgres (500). Aplicar junto de
 * `20260809-000026` (G3), que esta na mesma condicao.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260804-000009-add-labor-overhead-cost-ledger-sources.cjs).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_inventory_movements_reference_type" ADD VALUE IF NOT EXISTS 'import';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_product_cost_ledgers_source_type" ADD VALUE IF NOT EXISTS 'import';`
    );
  },

  async down() {
    // Remover valores de ENUM no Postgres exige recriar o tipo inteiro (todas
    // as colunas/indices/defaults dependentes). Como o valor pode ja estar em
    // uso por movimentacoes e ledgers reais, o rollback seguro e no-op — o
    // valor extra permanece, inofensivo, ate uma migracao dedicada de
    // limpeza. Mesmo criterio de 20260804-000009.
  },
};
