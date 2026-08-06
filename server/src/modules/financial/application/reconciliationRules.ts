/**
 * Constantes de regra de negócio da Conciliação Bancária v1, compartilhadas
 * entre `GetMatchSuggestionsUseCase` e `MatchEntryUseCase` — únicos pontos
 * do código que devem ler estes valores (nunca duplicar o número mágico).
 *
 * @module modules/financial/application/reconciliationRules
 */

/**
 * Tolerância de arredondamento (em centavos) aceita entre o valor absoluto
 * do lançamento do extrato e o saldo devedor/a receber da conta candidata.
 * Cobre apenas erro de ponto flutuante/arredondamento bancário — NÃO é uma
 * margem de negociação de valor. Ajuste aqui se o negócio decidir tolerar
 * mais que 1 centavo (não recomendado: mascara divergência real).
 */
export const MATCH_TOLERANCE_CENTS = 1;

/**
 * Janela (em dias, para cada lado) de proximidade entre a data do
 * lançamento do extrato e o vencimento da conta candidata, usada em
 * `GetMatchSuggestionsUseCase` para sugerir candidatos de conciliação.
 */
export const MATCH_DATE_WINDOW_DAYS = 7;
