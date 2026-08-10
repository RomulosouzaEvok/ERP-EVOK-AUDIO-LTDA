/**
 * Constantes de negócio do módulo RH.
 *
 * Mesmo padrão já usado em `modules/juridico/domain/constants.ts` e
 * `modules/marketing/domain/constants.ts`: parâmetro de negócio que a lei
 * NÃO define fica como constante nomeada de código, com marcação explícita
 * de que precisa ser confirmado com a área — nunca um número solto no meio
 * de um use case.
 *
 * @module modules/rh/domain/constants
 */

/**
 * Percentual máximo de equipe simultaneamente em férias por departamento
 * (RF-RH-039).
 *
 * ⚠️ **POLÍTICA INTERNA DA EMPRESA, NÃO É REGRA LEGAL** — a CLT não define
 * esse limite. `[VERIFICAR COM RH DA EMPRESA]` o valor real.
 *
 * O Modelo de Dados sugeria `Department.vacation_team_limit_percent`, coluna
 * que **não existe** em nenhuma migration commitada deste bloco (divergência
 * registrada no HANDOFF_CODEX). Constante de código é a alternativa já
 * prevista em `docs/business/BLOCO_6_RH_API.md` §21 item 3.
 */
export const DEFAULT_VACATION_TEAM_LIMIT_PERCENT = 0.3; // [VERIFICAR COM RH]
