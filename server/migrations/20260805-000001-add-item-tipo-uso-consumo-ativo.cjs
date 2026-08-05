'use strict';

/**
 * Bloco A do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secao 2): hoje
 * `items.tipo` (enum Postgres `item_tipo`, criado em
 * `database/postgresql/01_schema.sql` e replicado na baseline
 * `20260731-000001-baseline-schema.cjs`) so tem `MATERIA_PRIMA`,
 * `SUBCONJUNTO`, `PRODUTO_ACABADO` — todos girando em torno do que vira
 * o alto-falante (BOM/MRP). Item de uso e consumo (MRO — luva, material
 * de limpeza) e ativo imobilizado nao tem categoria propria hoje, entao
 * seriam cadastrados como materia-prima por falta de opcao, poluindo
 * BOM/MRP (a segregacao Direct Material / MRO / Capital Asset e o padrao
 * de mercado, ver contexto no TODO).
 *
 * `ALTER TYPE ... ADD VALUE` nao pode rodar dentro de uma transacao no
 * Postgres; `queryInterface.sequelize.query` com raw evita o wrap
 * transacional padrao do sequelize-cli para este comando especifico
 * (mesma tecnica de 20260803-000002-add-quarantine-lot-status.cjs e
 * 20260803-000007-add-shipped-sale-status.cjs).
 *
 * Sem backfill: itens existentes continuam com o tipo atual — a decisao
 * de reclassificar algum item existente como USO_E_CONSUMO ou
 * ATIVO_IMOBILIZADO e manual/futura, fora de escopo desta migration.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "item_tipo" ADD VALUE IF NOT EXISTS 'USO_E_CONSUMO';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "item_tipo" ADD VALUE IF NOT EXISTS 'ATIVO_IMOBILIZADO';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // (todas as colunas dependentes, indices, defaults etc). Como os
    // valores novos podem estar em uso por itens reais neste ponto, o
    // rollback seguro e no-op: os valores extras do enum permanecem,
    // inofensivos, ate uma migracao dedicada de limpeza (que exigiria
    // primeiro migrar/remover todas as linhas com esses tipos).
  },
};
