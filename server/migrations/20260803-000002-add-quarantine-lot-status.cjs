'use strict';

module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260731-000013-add-partial-payment-tracking.cjs).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_lot_controls_status" ADD VALUE IF NOT EXISTS 'quarantine';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // (todas as colunas dependentes, indices, defaults etc). Como
    // 'quarantine' pode estar em uso por lotes de recebimento reais neste
    // ponto (RecebimentoPurchaseItemsUseCase passou a criar lotes com este
    // status), o rollback seguro e no-op: o valor extra do enum permanece,
    // inofensivo, ate uma migracao dedicada de limpeza (que exigiria
    // primeiro migrar/remover todas as linhas em status 'quarantine').
  },
};
