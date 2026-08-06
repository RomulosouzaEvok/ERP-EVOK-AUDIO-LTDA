'use strict';

/**
 * Faturamento parcial (gap 3/3 do módulo `sales`): adiciona o valor
 * `'partially_invoiced'` ao ENUM `enum_sales_status`, usado quando uma
 * venda `confirmed` teve NF-e emitida para apenas parte da quantidade de
 * seus itens (`ChangeSaleStatusUseCase`/`IssueSaleNfeUseCase` — transição
 * automática, nunca manual via `PUT /:id/status`, mesmo tratamento hoje
 * dado a `'invoiced'`).
 *
 * `confirmed -> partially_invoiced -> invoiced` quando o saldo pendente de
 * todos os itens chega a zero. Embarque (`shipped`) continua exigindo a
 * venda totalmente `invoiced` — `'partially_invoiced'` deliberadamente NÃO
 * é adicionado a `VALID_TRANSITIONS['partially_invoiced']` com destino
 * `shipped` (ver `ChangeSaleStatusUseCase`), preservando a regra de negócio
 * existente sem alteração.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260803-000007-add-shipped-sale-status.cjs).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_sales_status" ADD VALUE IF NOT EXISTS 'partially_invoiced';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro.
    // Rollback seguro e no-op (mesmo raciocinio de
    // 20260803-000007-add-shipped-sale-status.cjs) — o valor extra do enum
    // permanece, inofensivo, caso alguma venda ja esteja neste status.
  },
};
