'use strict';

/**
 * Roadmap pos-Go-Live item 3 (docs/LEVANTAMENTO_ERP_2026-08-02.md, secao 3):
 * "Fechar o ciclo MRP - plano -> requisicao/OP automatico".
 *
 * Decisao de design (ver GenerateMrpPlanUseCase.ts e
 * ConvertPlannedOrdersToRequisitionUseCase.ts): o projeto tem cultura forte
 * de rastreabilidade/auditoria (CLAUDE.md Sec.7) e comprar automaticamente
 * SEM nenhuma revisao humana, para QUALQUER item, e um risco de negocio
 * (compra sem aprovacao de ninguem). Por isso o trigger automatico NAO e
 * "toda ordem planejada vira requisicao sozinha" -- e um opt-in explicito
 * por item: apenas itens com `conversao_automatica = true` tem suas ordens
 * planejadas RASCUNHO convertidas em Requisicao de Compra automaticamente,
 * na MESMA transacao em que o MRP gera/atualiza o plano (GenerateMrpPlanUseCase),
 * sem esperar o planejador selecionar nada na tela. Itens sem a flag mantem
 * o comportamento manual de hoje (selecao na tela /production/mrp ->
 * POST /api/mrp/planned-orders/convert).
 *
 * Por que no `items` (nucleo) e nao em `item_detalhes_comerciais`
 * (extensao): a flag e um parametro de comportamento do MRP (hot path),
 * nao um dado comercial/tecnico -- mesma categoria logica de
 * `estoque_seguranca`/`lote_minimo`/`lead_time_dias`, que ja vivem no
 * nucleo (ver server/src/models/Item.ts).
 *
 * Coluna NOT NULL com default `false`: nenhum item deve comecar a comprar
 * sozinho por omissao; a ativacao e sempre uma decisao explicita do
 * planejador/comprador no cadastro do item.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('items', 'conversao_automatica', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Opt-in por item: quando true, ordens planejadas RASCUNHO deste item viram Requisicao de Compra automaticamente ao rodar o MRP (origin=mrp_auto), sem intervencao do planejador. Default false preserva o fluxo manual existente.',
    });

    await queryInterface.addIndex('items', ['conversao_automatica'], {
      name: 'idx_items_conversao_automatica',
      where: { conversao_automatica: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('items', 'idx_items_conversao_automatica');
    await queryInterface.removeColumn('items', 'conversao_automatica');
  },
};
