/**
 * Constantes de negócio do módulo Jurídico (RF-JUR-003 — alçada de
 * aprovação de contrato por valor), decisão do dono do produto em
 * 2026-08-08 fechando a pendência deixada no cabeçalho de
 * `ActivateContractUseCase.ts`. Threshold como constante de código (não
 * tabela de configuração editável nesta rodada) — mesmo padrão já usado em
 * `server/src/modules/marketing/domain/constants.ts`.
 *
 * Regras (baseadas em `jur_contracts.value`):
 * - valor <= {@link JUR_APPROVAL_THRESHOLD_DIRECTOR}: sem aprovação extra —
 *   comportamento já existente, ativação direta por qualquer
 *   `juridico:operate`.
 * - {@link JUR_APPROVAL_THRESHOLD_DIRECTOR} < valor <=
 *   {@link JUR_APPROVAL_THRESHOLD_FINANCE}: exige 1 aprovação de um usuário
 *   com módulo de acesso `diretor`.
 * - valor > {@link JUR_APPROVAL_THRESHOLD_FINANCE}: exige 2 aprovações
 *   distintas — 1 de `diretor` E 1 de `financeiro`.
 *
 * @module modules/juridico/domain/constants
 */

/** Acima deste valor (R$), ativação de contrato exige 1 aprovação do papel `diretor`. */
export const JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000;

/** Acima deste valor (R$), ativação de contrato exige 1 aprovação `diretor` E 1 `financeiro`. */
export const JUR_APPROVAL_THRESHOLD_FINANCE = 300000;

/** Papéis de aprovador válidos para `jur_contract_approvals.approver_role`. */
export type ContractApproverRole = 'diretor' | 'financeiro';

/**
 * Resolve os papéis de aprovador exigidos para ativar um contrato de
 * determinado valor (RF-JUR-003).
 *
 * @param value - Valor do contrato (`jur_contracts.value`), pode ser `null`/`undefined` (tratado como 0 — sem alçada extra).
 * @returns Lista de papéis exigidos (vazia se dentro da faixa sem aprovação extra).
 */
export function requiredApproverRoles(value: string | number | null | undefined): ContractApproverRole[] {
  const numericValue = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(numericValue) || numericValue <= JUR_APPROVAL_THRESHOLD_DIRECTOR) {
    return [];
  }
  if (numericValue <= JUR_APPROVAL_THRESHOLD_FINANCE) {
    return ['diretor'];
  }
  return ['diretor', 'financeiro'];
}
