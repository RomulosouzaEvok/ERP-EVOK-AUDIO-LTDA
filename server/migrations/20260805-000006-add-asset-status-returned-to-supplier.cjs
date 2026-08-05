'use strict';

/**
 * Bloco B do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secao "Ponto em
 * aberto"): consequencia real de `NonConformity.immediate_action =
 * 'return_supplier'` sobre um ativo imobilizado (`asset_id`).
 *
 * Decisao tecnica documentada: NAO reaproveitar `lost` (semanticamente
 * errado — o ativo nao esta perdido, foi devolvido a um fornecedor
 * conhecido, com processo de RMA/troca/credito em andamento em Compras) e
 * criar um novo valor `returned_to_supplier` no enum `enum_assets_status`
 * (Postgres), paralelo a `active`/`in_maintenance`/`decommissioned`/`lost`
 * ja existentes.
 *
 * `ALTER TYPE ... ADD VALUE` nao pode rodar dentro de uma transacao no
 * Postgres — mesma tecnica de `20260805-000001-add-item-tipo-uso-consumo-ativo.cjs`
 * (raw query fora do wrap transacional padrao do sequelize-cli).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_assets_status" ADD VALUE IF NOT EXISTS 'returned_to_supplier';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // (colunas dependentes, indices, defaults). Como o valor novo pode
    // estar em uso por ativos reais neste ponto, o rollback seguro e
    // no-op — mesmo padrao das demais migrations de ADD VALUE deste
    // pacote (ex.: 20260805-000001).
  },
};
