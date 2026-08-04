'use strict';

/**
 * Item 8 do levantamento (docs/LEVANTAMENTO_ERP_2026-08-02.md) — pendencia
 * "realimentacao de rating de fornecedor" deixada em aberto na entrega de
 * 2026-08-03 (RNC ja bloqueia lote na mesma transacao, mas nao existia
 * nenhum campo calculado de avaliacao).
 *
 * `suppliers.rating` ja existia, mas e um inteiro (1-5) digitado a mao no
 * cadastro (ver `docs/LEVANTAMENTO_ERP_2026-08-02.md` linha 64: "Rating de
 * fornecedor calculado (OTD, RNCs) — hoje e um inteiro digitado a mao").
 * Este campo NAO deve ser reaproveitado para o calculo automatico, porque:
 * (1) e editavel manualmente pelo usuario no CRUD de fornecedores hoje
 * (`UpdateSupplierUseCase`) e sobrescrever esse valor de forma sincrona a
 * cada RNC quebraria a expectativa de "campo que o comprador ajusta"; (2)
 * misturar um numero editavel com um numero derivado/auditavel no mesmo
 * campo impede saber, ao olhar o dado, se ele reflete o calculo real ou foi
 * digitado por alguem.
 *
 * `quality_score` e um novo campo DECIMAL(5,2), 0-100, EXCLUSIVAMENTE
 * recalculado por codigo (nunca editado via API de fornecedores) a partir
 * da formula (server/src/modules/nonConformities/application/use-cases/
 * CreateNonConformityUseCase.ts):
 *   quality_score = MAX(0, 100 - (rncs_count / receipts_count * 100))
 * onde `receipts_count` = COUNT(lot_controls WHERE supplier_id = X)
 * (cada linha de `lot_controls` com supplier_id preenchido representa uma
 * linha de recebimento, ver ReceivePurchaseItemsUseCase) e `rncs_count` =
 * COUNT(non_conformities WHERE supplier_id = X). Sem fornecedor com
 * nenhum recebimento ainda, o valor fica no default neutro 100.00 (nao ha
 * "taxa de RNC" possivel sem denominador).
 *
 * Nullable: false, com default 100.00 (todo fornecedor comeca com nota
 * maxima ate o primeiro recebimento/RNC alimentar o calculo real).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('suppliers', 'quality_score', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 100.0,
      comment:
        'Avaliacao calculada (0-100), NUNCA editavel via API: recalculada de forma sincrona por CreateNonConformityUseCase quando uma RNC referencia um lote (lote -> recebimento -> fornecedor). Distinto de `rating` (inteiro 1-5 digitado a mao no cadastro).',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('suppliers', 'quality_score');
  },
};
