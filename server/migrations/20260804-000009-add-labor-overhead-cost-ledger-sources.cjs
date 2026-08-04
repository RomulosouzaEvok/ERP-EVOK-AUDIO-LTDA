'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE nao pode rodar dentro de uma transacao no
    // Postgres; queryInterface.sequelize.query com raw evita o wrap
    // transacional padrao do sequelize-cli para este comando especifico
    // (mesma tecnica de 20260803-000002-add-quarantine-lot-status.cjs).
    // Novos source_type permitem ao CostingService registrar, no mesmo
    // ledger de custo real do produto, entradas separadas de mao-de-obra
    // e overhead (alem da ja existente 'production', que hoje cobre so
    // material consumido da BOM).
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_product_cost_ledgers_source_type" ADD VALUE IF NOT EXISTS 'production_labor';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_product_cost_ledgers_source_type" ADD VALUE IF NOT EXISTS 'production_overhead';`
    );
  },

  async down() {
    // Remover valores de ENUM no Postgres exige recriar o tipo inteiro
    // (todas as colunas/indices/defaults dependentes). Como estes valores
    // podem estar em uso por ledgers reais de custeio ate este ponto, o
    // rollback seguro e no-op: os valores extras do enum permanecem,
    // inofensivos, ate uma migracao dedicada de limpeza.
  },
};
