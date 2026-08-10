'use strict';

/**
 * D-K — `purchase_orders.requester_id` passa a ser obrigatório.
 *
 * ## O buraco que isto fecha
 *
 * A segregação de função (**D-K**, `shared/domain/segregationOfDuties.ts`)
 * compara o aprovador com o solicitante. Quando o documento não registra quem
 * solicitou, a comparação é impossível e `isSelfApproval` devolve `false` —
 * **não bloqueia**. Isso foi deliberado: bloquear por `NULL` tornaria pedidos
 * legados inaprováveis para sempre, sem caminho de remediação.
 *
 * As outras duas entidades cobertas pela regra já eram `NOT NULL`
 * (`purchase_requisitions.requester_id`, `import_processes.created_by`). O
 * pedido de compra era a única frouxidão real, e ficou registrada como achado
 * da entrega do D-K com a recomendação explícita de `SET NOT NULL` em
 * migration futura. Esta é essa migration.
 *
 * Enquanto a coluna aceitar `NULL`, existe uma forma de burlar a segregação:
 * um pedido gravado sem solicitante é aprovável por qualquer pessoa,
 * inclusive por quem o criou.
 *
 * ## Por que é seguro agora — e o que acontece se não for
 *
 * Medido nos dois bancos em 2026-08-10, antes de escrever esta migration:
 *
 *     erp_evok_audio ......  0 de  18 pedidos com requester_id NULL
 *     erp_evok_audio_test ..  0 de 227 pedidos com requester_id NULL
 *
 * Todos os caminhos de criação (`CreatePurchaseUseCase`, conversão de
 * requisição, adjudicação de RFQ) já gravam o solicitante a partir do JWT.
 *
 * Se algum banco tiver linha com `NULL`, esta migration **falha em voz alta**
 * em vez de pular em silêncio. Pular criaria divergência entre bancos — a
 * classe de defeito que a guarda `cross-database-drift-guard` passou a vigiar
 * depois de a migration do G18 ficar aplicada só no banco de teste.
 *
 * ## A FK precisa mudar junto — senão vira contradição
 *
 * `fk_purchase_orders_requester_id` era `ON DELETE SET NULL`. Uma FK que
 * promete gravar `NULL` numa coluna `NOT NULL` é uma contradição autoevidente
 * (a guarda `schema-model-drift-guard` reprova exatamente isso, e reprovou
 * esta migration na primeira versão). Passa a `ON DELETE RESTRICT`, que é o
 * padrão do projeto e a regra correta aqui: **apagar um usuário não pode
 * apagar de quem partiu a compra.** Quem saiu da empresa é desativado
 * (`users.active = false`), não removido — a trilha de auditoria fiscal exige
 * histórico imutável.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT count(*)::int AS pendentes FROM purchase_orders WHERE requester_id IS NULL',
    );
    const pendentes = Number(rows?.[0]?.pendentes ?? 0);

    if (pendentes > 0) {
      throw new Error(
        `Ha ${pendentes} pedido(s) de compra sem solicitante (requester_id IS NULL). `
        + 'Enquanto existirem, a segregacao de funcao (D-K) nao consegue avaliar auto-aprovacao neles. '
        + 'Atribua o solicitante correto a cada um (SELECT id, order_number, created_at FROM purchase_orders '
        + 'WHERE requester_id IS NULL) e rode esta migration de novo. Ela NAO preenche por conta propria: '
        + 'inventar um solicitante seria falsificar a trilha de auditoria que a regra existe para proteger.',
      );
    }

    await queryInterface.changeColumn('purchase_orders', 'requester_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // A FK e recriada com RESTRICT: SET NULL sobre coluna NOT NULL nao e uma
    // preferencia de estilo, e uma promessa que o banco nao consegue cumprir.
    await queryInterface.sequelize.query(
      'ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS fk_purchase_orders_requester_id;',
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE purchase_orders
         ADD CONSTRAINT fk_purchase_orders_requester_id
         FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT;`,
    );

    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN purchase_orders.requester_id IS 'FK -> users.id de quem SOLICITOU o pedido, sempre do JWT. NOT NULL desde 2026-08-10: a segregacao de funcao (D-K) compara aprovador x solicitante, e linha sem solicitante e aprovavel por qualquer pessoa, inclusive por quem a criou. ON DELETE RESTRICT: apagar usuario nao pode apagar de quem partiu a compra.';`,
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS fk_purchase_orders_requester_id;',
    );
    await queryInterface.changeColumn('purchase_orders', 'requester_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `ALTER TABLE purchase_orders
         ADD CONSTRAINT fk_purchase_orders_requester_id
         FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL;`,
    );
  },
};
