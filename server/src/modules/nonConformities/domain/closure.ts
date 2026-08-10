/**
 * Regra de encerramento de RNC (Relatorio de Nao Conformidade).
 *
 * @module modules/nonConformities/domain/closure
 *
 * ## Por que isto virou um modulo proprio
 *
 * A RNC pode ser encerrada por DOIS caminhos —
 * `PUT /api/quality/non-conformities/:id` com `status: 'closed'`
 * ({@link ../application/use-cases/UpdateNonConformityUseCase}) e
 * `DELETE /api/quality/non-conformities/:id`
 * ({@link ../application/use-cases/CloseNonConformityUseCase}) — e ate
 * 2026-08-10 **nenhum dos dois gravava a data de fechamento**:
 *
 * - o `PUT` gravava `closed_at`, chave que nao e atributo do model; o
 *   Sequelize a **descartava em silencio** (UPDATE saia sem ela, API
 *   respondia 200). A coluna real e `closed_date`;
 * - o `DELETE` nao gravava data nem autor — so `status = 'closed'`.
 *
 * ISO 9001:2015 §8.7 e §10.2 exigem a data de encerramento da nao
 * conformidade: sem ela nao ha como medir tempo de tratativa nem provar
 * tempestividade em auditoria. Centralizar aqui garante que os dois caminhos
 * (e qualquer terceiro que apareca) gravem o MESMO conjunto de campos.
 *
 * Ver `docs/governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md` §3.
 */

/** Status terminal de encerramento de uma RNC (`non_conformities.status`). */
export const CLOSED_STATUS = 'closed';

/**
 * Data de encerramento no formato de `non_conformities.closed_date`
 * (coluna `DATE` / `DataTypes.DATEONLY`, portanto `YYYY-MM-DD`).
 *
 * Usa a mesma convencao de "hoje" ja adotada em ~90 pontos do backend
 * (`toISOString().slice(0, 10)`, portanto UTC). Consistencia foi preferida a
 * uma terceira semantica de data so para este modulo; o efeito pratico e que
 * um encerramento feito depois das 21h (UTC-3) grava a data do dia seguinte.
 * Se algum dia o projeto adotar fuso local para colunas `DATE`, a troca e
 * neste unico ponto.
 *
 * @param now - Instante de referencia (injetavel para teste). Padrao: agora.
 * @returns Data no formato `YYYY-MM-DD`.
 */
export function buildClosedDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Campos que TODO encerramento de RNC precisa gravar, qualquer que seja a
 * rota usada.
 *
 * @param closedBy - Id do usuario autenticado que encerrou (sempre do JWT, nunca do body).
 * @param now - Instante de referencia (injetavel para teste).
 * @returns Patch a mesclar no payload de `update` da RNC.
 */
export function buildClosureFields(closedBy: number, now: Date = new Date()): {
  closed_by: number;
  closed_date: string;
} {
  return { closed_by: closedBy, closed_date: buildClosedDate(now) };
}
