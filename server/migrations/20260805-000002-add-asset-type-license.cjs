'use strict';

/**
 * Bloco A do TODO de reorganizacao de departamentos
 * (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md, secao 4):
 * "produto digital" cobre licenca/software comprado — decisao do dono:
 * licenca perpetua/multianual de alto valor e capitalizada como
 * intangivel, mesmo tratamento de Ativo fisico (pratica de mercado).
 * `assets.asset_type` (enum Postgres `enum_assets_asset_type`) ganha o
 * valor `license` para cobrir esse caso; assinatura/SaaS de curto prazo
 * continua fora do Patrimonio (despesa operacional imediata em Contas a
 * Pagar, nao vira Asset — decisao explicita do dono).
 *
 * `ALTER TYPE ... ADD VALUE` nao pode rodar dentro de uma transacao no
 * Postgres; `queryInterface.sequelize.query` com raw evita o wrap
 * transacional padrao do sequelize-cli para este comando especifico
 * (mesma tecnica de 20260805-000001-add-item-tipo-uso-consumo-ativo.cjs).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_assets_asset_type" ADD VALUE IF NOT EXISTS 'license';`
    );
  },

  async down() {
    // Remover um valor de ENUM no Postgres exige recriar o tipo inteiro
    // (todas as colunas dependentes, indices, defaults etc). Como
    // 'license' pode estar em uso por ativos reais neste ponto, o
    // rollback seguro e no-op: o valor extra do enum permanece,
    // inofensivo, ate uma migracao dedicada de limpeza (que exigiria
    // primeiro migrar/remover todas as linhas em asset_type 'license').
  },
};
