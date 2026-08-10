'use strict';

/**
 * G18 — Subconjunto ESTOCAVEL x subconjunto FANTASMA na explosao da BOM.
 *
 * ## O caso real que expos o defeito (dono do produto, 2026-08-10)
 *
 * A Evok fabrica alto-falantes e **vende REPARO** — o conjunto movel (cone,
 * bobina movel, aranha, suspensao) que o cliente compra para consertar um
 * alto-falante queimado. O reparo e DUAS coisas ao mesmo tempo:
 *
 *   - **produto vendido** no balcao, com preco, estoque e NF-e proprios;
 *   - **componente** consumido na linha de montagem do alto-falante.
 *
 *     Alto-falante 12" (finished, vendido)
 *     ├── REPARO 12"   (finished, vendido E componente)  ← BOM PROPRIA
 *     │   ├── cone
 *     │   ├── bobina movel
 *     │   ├── aranha
 *     │   └── suspensao
 *     ├── ima
 *     ├── carcaca
 *     └── terminais
 *
 * ## O defeito
 *
 * `BomService.explodeBOM` descia **incondicionalmente** em qualquer
 * componente que tivesse BOM ativa propria, e so devolvia as FOLHAS da
 * arvore. Como essa explosao governa reserva (liberacao da OP), consumo,
 * baixa de lote e custeio (conclusao da OP), o efeito no chao de fabrica
 * era:
 *
 *   - a OP do alto-falante reservava e consumia **cone, bobina, aranha e
 *     suspensao** diretamente;
 *   - o **estoque de REPARO nunca era baixado** — o reparo produzido ficava
 *     parado, e o alto-falante saia "sem consumir reparo nenhum";
 *   - o custo do alto-falante ignorava o custo real do reparo (mao-de-obra e
 *     overhead da OP do reparo evaporavam: so as materias-primas entravam).
 *
 * Isso e a diferenca classica de MRP entre **subconjunto estocavel** (tem
 * saldo proprio, e comprado/vendido/produzido por OP propria — o parent
 * consome a PECA) e **subconjunto fantasma/phantom** (nao existe
 * fisicamente, e so um agrupamento de engenharia — o parent consome os
 * FILHOS dele). O ERP so implementava o segundo, e sem ninguem poder
 * escolher.
 *
 * ## O que esta migration faz
 *
 * Adiciona `bill_of_material_items.is_phantom` (BOOLEAN NOT NULL DEFAULT
 * false). A partir dela, `explodeBOM` so desce em um componente quando a
 * linha da BOM diz `is_phantom = true`.
 *
 * ### Por que o default e `false` (e por que isso e seguro aqui)
 *
 * `false` = "consome a peca", que e o comportamento correto para qualquer
 * componente que tenha estoque proprio — o caso do REPARO e a razao de o
 * dono ter levantado o assunto. Inverter o default deixaria o caso real da
 * empresa quebrado por omissao de cadastro.
 *
 * O risco de mudar o default de um comportamento existente foi medido
 * ANTES, no banco real (2026-08-10):
 *
 *   SELECT count(*) FROM bill_of_materials b
 *     JOIN bill_of_material_items bi ON bi.bom_id = b.id
 *     JOIN bill_of_materials sub ON sub.product_id = bi.component_product_id
 *                               AND sub.status = 'active'
 *    WHERE b.status = 'active';
 *   -- erp_evok_audio (dev, dado real do dono): 0
 *
 * **Zero** arestas de dois niveis existem hoje em dado real. Nenhuma BOM
 * cadastrada muda de comportamento com esta migration; o unico efeito e
 * sobre estruturas cadastradas daqui para frente. (No banco de teste ha 5
 * arestas, todas residuo `E2E-*` de suite automatizada.)
 *
 * Aditiva e reversivel: nao cria tabela, nao apaga linha, nao faz backfill.
 *
 * `comment:` dentro de `addColumn` corrompe o SQL gerado neste projeto —
 * por isso o comentario vai por `COMMENT ON`, como nas migrations recentes.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('bill_of_material_items');

    if (!table.is_phantom) {
      await queryInterface.addColumn('bill_of_material_items', 'is_phantom', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN bill_of_material_items.is_phantom IS 'G18 (2026-08-10): define como a explosao trata este componente quando ele tem BOM ativa propria. false (padrao) = subconjunto ESTOCAVEL: a explosao PARA nele, e a OP do pai reserva/consome/custeia a peca pronta (caso do REPARO, que a Evok vende no balcao E monta no alto-falante). true = subconjunto FANTASMA: a explosao DESCE e o pai consome os filhos dele, sem nunca tocar no saldo do subconjunto (agrupamento de engenharia que nao existe fisicamente). Marcar phantom um item que tem estoque proprio faz o saldo dele nunca ser baixado.';`
    );
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('bill_of_material_items');
    if (table.is_phantom) {
      await queryInterface.removeColumn('bill_of_material_items', 'is_phantom');
    }
  },
};

/*
 * Diagnostico (rodar para saber quais BOMs sao afetadas pela regra):
 *
 *   -- Componentes de BOM ativa que TEM estrutura propria — sao exatamente
 *   -- os que o flag governa. Confira com a engenharia, um a um, se cada um
 *   -- e peca estocavel (is_phantom = false) ou agrupamento (true).
 *   SELECT b.id AS bom_pai, pai.code AS codigo_pai, comp.code AS codigo_componente,
 *          bi.is_phantom, sub.id AS bom_do_componente
 *     FROM bill_of_materials b
 *     JOIN bill_of_material_items bi ON bi.bom_id = b.id
 *     JOIN products pai  ON pai.id  = b.product_id
 *     JOIN products comp ON comp.id = bi.component_product_id
 *     JOIN bill_of_materials sub ON sub.product_id = bi.component_product_id
 *                               AND sub.status = 'active'
 *    WHERE b.status = 'active';
 */
