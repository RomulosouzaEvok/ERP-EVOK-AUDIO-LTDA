'use strict';

module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260803-000002-add-quarantine-lot-status.cjs).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_sales_status" ADD VALUE IF NOT EXISTS 'shipped';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // (todas as colunas dependentes, indices, defaults etc). Como 'shipped'
    // pode estar em uso por vendas reais neste ponto (fluxo de expedicao
    // invoiced -> shipped), o rollback seguro e no-op: o valor extra do enum
    // permanece, inofensivo, ate uma migracao dedicada de limpeza (que
    // exigiria primeiro migrar/remover todas as linhas em status 'shipped').
  },
};
