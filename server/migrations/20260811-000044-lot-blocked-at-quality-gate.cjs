'use strict';

/**
 * G7 — `lot_controls.blocked_at`: o bloqueio de lote passa a ter DATA.
 *
 * ## O furo que esta coluna fecha (auditoria de 2026-08-11)
 *
 * O gate de liberação de lote (`decideLotRelease`, G7/2026-08-10) decide
 * olhando a inspeção **mais recente** do lote. Isso resolve o caminho
 * "inspecionou de novo e reprovou → não libera mais", mas não resolve o
 * bloqueio **sem inspeção nova**:
 *
 * ```
 * inspeção APROVADA → lote liberado → defeito aparece em processo
 *   → RNC (ou POST /lots/:id/block) → lote 'blocked'
 *   → POST /lots/:id/release  ← concedido, com a MESMA inspeção antiga
 * ```
 *
 * A inspeção mais recente continuava sendo a aprovada de ANTES do bloqueio,
 * então o gate dizia "aprovado" e o material bloqueado voltava para consumo
 * sem que ninguém o tivesse examinado de novo. Na prática o bloqueio virava
 * decorativo — desfazê-lo não custava nada. É o oposto da ISO 9001:2015 §8.7
 * ("prevenir o uso ou entrega não pretendidos" de saída não conforme).
 *
 * ## Por que uma coluna, e não uma inferência
 *
 * Para exigir "inspeção posterior ao bloqueio" é preciso saber **quando o
 * bloqueio aconteceu**, e esse instante não existia em lugar nenhum
 * consultável: `notes` recebe um texto livre ("Bloqueado: <motivo>"), e
 * `updated_at` muda a cada escrita de qualquer natureza (baixa de saldo,
 * reserva, expedição). Derivar a data de qualquer um dos dois seria adivinhar
 * — e adivinhar errado, aqui, é liberar material contido.
 *
 * `blocked_at` é preenchida pelos DOIS caminhos que bloqueiam lote —
 * `BlockLotUseCase` (endpoint) e `CreateNonConformityUseCase` (RNC, que
 * escreve direto em `lot_controls`) — e zerada na liberação, porque ela
 * descreve o bloqueio VIGENTE, não o histórico (o histórico fica em `notes`,
 * em `audit_logs` e nos próprios registros de `quality_inspections`).
 *
 * ## Efeito nas linhas existentes
 *
 * Nullable, sem backfill. Todo lote atual nasce com `NULL`, inclusive os que
 * já estão `blocked`:
 *
 * - lote em `quarantine` (nunca bloqueado) → `NULL` → gate segue exatamente
 *   como antes (inspeção mais recente aprovada libera);
 * - lote **já** `blocked` antes desta migration → `NULL` → continua liberável
 *   pela regra antiga. É grandfathering **deliberado**: inventar um
 *   `blocked_at` retroativo (ex.: `updated_at`) exigiria uma inspeção nova
 *   para material que a Qualidade pode já ter tratado, travando lote em
 *   produção por causa de um dado que o ERP nunca registrou. Do próximo
 *   bloqueio em diante, todos entram na regra nova.
 *
 * ⚠️ `comment:` NÃO é usado em `addColumn` (corrompe o SQL gerado neste
 * projeto) — o comentário vai em `COMMENT ON COLUMN`.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lot_controls', 'blocked_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN lot_controls.blocked_at IS 'G7 (2026-08-11): quando o bloqueio VIGENTE do lote comecou (endpoint /block ou RNC). Re-liberar exige inspecao aprovada com inspected_at POSTERIOR a este instante (ISO 9001 8.7). Zerada na liberacao. NULL = lote nunca bloqueado, ou bloqueado antes desta coluna existir (grandfathering).';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lot_controls', 'blocked_at');
  },
};
