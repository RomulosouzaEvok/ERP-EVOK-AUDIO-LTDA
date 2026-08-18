/**
 * Interpretação da política de alçada de aprovação de contrato jurídico
 * (RF-JUR-003) — **estrutura técnica apenas**.
 *
 * FIND-ERP-005 / Falha 1, remediação autorizada por `APR-2026-021` Parte B
 * decisão 3 ("Alçada = TABELA CONFIGURÁVEL").
 *
 * Antes desta remediação os limiares eram dois literais de código
 * (`constants.ts:23,26` — R$ 50.000 e R$ 300.000), contrariando o contrato de
 * API (`docs/business/BLOCO_3_JUR_API.md` §2.7, que declara a tabela
 * `jur_approval_thresholds` e a frase "nenhum valor de alçada é hard-coded").
 *
 * ## O que mora aqui e o que NÃO mora aqui
 *
 * | Mora aqui | NÃO mora aqui |
 * |---|---|
 * | como uma faixa é comparada com o valor do contrato | qual é o valor da faixa |
 * | precedência entre regra por `contract_type` e regra `'*'` | quais tipos de contrato têm regra própria |
 * | filtro de vigência (`valid_from`/`valid_to`/`active`) | as datas de vigência |
 * | fail-closed quando não há política | — |
 *
 * **Nenhum limiar de negócio é literal neste arquivo nem em `constants.ts`.**
 * Os valores vivem em `jur_approval_thresholds` (migration
 * `20260814-000048`), com histórico em `jur_approval_threshold_history`.
 *
 * ## Fail-closed (ASVS V4.1.5)
 *
 * Se a política estiver vazia/indisponível, {@link resolveApprovalPolicy}
 * **lança**. Nunca devolve "nenhum papel exigido" por ausência de
 * configuração — esse era exatamente o padrão do agravante transversal do
 * finding (`ActivateContractUseCase` pulava o gate em silêncio quando a
 * dependência opcional faltava).
 *
 * @module modules/juridico/domain/approvalPolicy
 */

import { BusinessRuleError } from '../../../errors';
import type { ContractApproverRole } from './constants';

/** Nível de RBAC exigido do aprovador da faixa. */
export type ApprovalRequiredLevel = 'operate' | 'approve';

/** `contract_type` curinga: regra vale para qualquer tipo de contrato. */
export const ANY_CONTRACT_TYPE = '*';

/**
 * Uma faixa de alçada, tal como persistida em `jur_approval_thresholds`.
 *
 * Semântica do intervalo: **`min_value` exclusivo, `max_value` inclusivo**
 * (`min_value < valor <= max_value`), com `max_value = null` significando
 * "sem teto". É a mesma semântica que os literais removidos tinham
 * (`valor <= 50000` não exigia nada; `50000 < valor <= 300000` exigia
 * `diretor`), preservada para que a migration de seed reproduza o
 * comportamento anterior sem mudança observável.
 */
export interface ApprovalThresholdRule {
  id?: number;
  /** Tipo de contrato ao qual a faixa se aplica, ou {@link ANY_CONTRACT_TYPE}. */
  contract_type: string;
  /** Piso EXCLUSIVO da faixa. */
  min_value: string | number;
  /** Teto INCLUSIVO da faixa; `null` = sem teto. */
  max_value: string | number | null;
  /** Papéis exigidos nesta faixa (vazio = faixa sem alçada extra). */
  required_roles: ContractApproverRole[];
  /** Nível de RBAC exigido do aprovador (server-side; nunca decidido pelo frontend). */
  required_level: ApprovalRequiredLevel;
  active: boolean;
  /** Início de vigência (`YYYY-MM-DD`), `null` = desde sempre. */
  valid_from?: string | null;
  /** Fim de vigência (`YYYY-MM-DD`, inclusivo), `null` = sem fim. */
  valid_to?: string | null;
}

/** Resultado da interpretação da política para um contrato concreto. */
export interface ResolvedApprovalPolicy {
  /** Papéis exigidos para ativar o contrato no valor avaliado. */
  requiredRoles: ContractApproverRole[];
  /** Nível de RBAC exigido dos aprovadores desta faixa. */
  requiredLevel: ApprovalRequiredLevel;
  /**
   * Snapshot recuperável a posteriori (R1(d) do RETEST_SPECIFICATION):
   * gravado em `jur_contracts.approval_policy_snapshot` na ativação.
   */
  snapshot: {
    resolved_at: string;
    contract_type: string;
    evaluated_value: number;
    matched_rule_id: number | null;
    matched_rule: Pick<ApprovalThresholdRule, 'contract_type' | 'min_value' | 'max_value' | 'required_roles' | 'required_level'> | null;
    /** Ids de todas as regras vigentes consideradas — permite reconstruir a política daquele instante. */
    effective_rule_ids: Array<number | null>;
  };
}

function toNumber(value: string | number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function isInForce(rule: ApprovalThresholdRule, at: string): boolean {
  if (!rule.active) return false;
  if (rule.valid_from && String(rule.valid_from).slice(0, 10) > at) return false;
  if (rule.valid_to && String(rule.valid_to).slice(0, 10) < at) return false;
  return true;
}

/**
 * Filtra as regras vigentes na data `at` e aplica a precedência por
 * especificidade: se existir **qualquer** regra vigente para o
 * `contract_type` do contrato, o conjunto `'*'` é ignorado por completo (e
 * não mesclado — mesclar produziria faixas sobrepostas silenciosas).
 *
 * @param rules - Todas as regras conhecidas (normalmente `listAll()` do repositório).
 * @param contractType - `jur_contracts.contract_type`.
 * @param at - Data de avaliação (`YYYY-MM-DD`).
 * @returns Regras aplicáveis, ordenadas por `min_value` crescente.
 */
export function selectEffectiveRules(
  rules: ApprovalThresholdRule[],
  contractType: string | null | undefined,
  at: string,
): ApprovalThresholdRule[] {
  const inForce = (rules ?? []).filter((rule) => isInForce(rule, at));
  const specific = inForce.filter((rule) => rule.contract_type === contractType);
  const chosen = specific.length > 0 ? specific : inForce.filter((rule) => rule.contract_type === ANY_CONTRACT_TYPE);
  return [...chosen].sort((a, b) => toNumber(a.min_value, 0) - toNumber(b.min_value, 0));
}

/**
 * Resolve a alçada exigida para um valor de contrato, a partir da política
 * configurada.
 *
 * @param rules - Regras carregadas do repositório (`jur_approval_thresholds`).
 * @param params - Valor avaliado, tipo do contrato e data de avaliação.
 * @returns Papéis exigidos, nível exigido e snapshot auditável.
 * @throws {BusinessRuleError} Quando não há **nenhuma** regra vigente aplicável — fail-closed: sem política configurada, nada é ativado.
 */
export function resolveApprovalPolicy(
  rules: ApprovalThresholdRule[],
  params: { value: string | number | null | undefined; contractType: string | null | undefined; at?: string },
): ResolvedApprovalPolicy {
  const at = params.at ?? new Date().toISOString().slice(0, 10);
  const effective = selectEffectiveRules(rules, params.contractType, at);

  if (effective.length === 0) {
    throw new BusinessRuleError(
      'Política de alçada de aprovação de contrato não configurada (jur_approval_thresholds vazia ou fora de vigência). '
        + 'Nenhum contrato pode ser aprovado ou ativado até que a configuração exista — configure em '
        + 'Jurídico > Configurações > Alçadas de aprovação.',
      { rule: 'RF-JUR-003', reason: 'APPROVAL_POLICY_UNAVAILABLE', contract_type: params.contractType ?? null },
    );
  }

  const evaluated = toNumber(params.value, 0);
  const matched = effective.find((rule) => {
    const min = toNumber(rule.min_value, 0);
    const max = rule.max_value === null || rule.max_value === undefined ? null : toNumber(rule.max_value, 0);
    return evaluated > min && (max === null || evaluated <= max);
  }) ?? null;

  if (matched === null) {
    throw new BusinessRuleError(
      `Lacuna de configuração na política de alçada para o valor avaliado (${evaluated}). `
        + 'Há regras vigentes para este contrato, mas nenhuma cobre esse valor. '
        + 'Reveja as faixas em Jurídico > Configurações > Alçadas de aprovação para eliminar o intervalo descoberto.',
      {
        rule: 'RF-JUR-003',
        reason: 'APPROVAL_POLICY_GAP',
        contract_type: params.contractType ?? null,
        evaluated_value: evaluated,
        effective_rule_ids: effective.map((rule) => rule.id ?? null),
      },
    );
  }

  return {
    requiredRoles: [...(matched.required_roles ?? [])],
    requiredLevel: matched.required_level,
    snapshot: {
      resolved_at: new Date().toISOString(),
      contract_type: params.contractType ?? ANY_CONTRACT_TYPE,
      evaluated_value: evaluated,
      matched_rule_id: matched?.id ?? null,
      matched_rule: matched
        ? {
          contract_type: matched.contract_type,
          min_value: matched.min_value,
          max_value: matched.max_value,
          required_roles: [...(matched.required_roles ?? [])],
          required_level: matched.required_level,
        }
        : null,
      effective_rule_ids: effective.map((rule) => rule.id ?? null),
    },
  };
}

/**
 * Açúcar usado pelos use cases: carrega a política do repositório e a
 * resolve para o contrato. Mantido aqui (e não no use case) para que os
 * quatro pontos de consulta — approve, activate, list, aditivo — usem
 * exatamente o mesmo caminho.
 *
 * @param thresholdRepository - Qualquer objeto com `listAll()` devolvendo {@link ApprovalThresholdRule}[].
 * @param contract - Contrato (usa `value` e `contract_type`).
 * @param overrideValue - Valor alternativo a avaliar (aditivo avalia o valor FUTURO antes de gravá-lo).
 * @returns Ver {@link ResolvedApprovalPolicy}.
 * @throws {BusinessRuleError} Fail-closed quando o repositório não foi injetado ou a política está vazia.
 */
export async function resolveContractApprovalPolicy(
  thresholdRepository: { listAll(): Promise<ApprovalThresholdRule[]> } | undefined | null,
  contract: { value?: string | number | null; contract_type?: string | null },
  overrideValue?: string | number | null,
): Promise<ResolvedApprovalPolicy> {
  if (!thresholdRepository || typeof thresholdRepository.listAll !== 'function') {
    throw new BusinessRuleError(
      'Repositório de política de alçada não injetado — operação bloqueada (fail-closed, FIND-ERP-005 R5).',
      { rule: 'RF-JUR-003', reason: 'APPROVAL_POLICY_REPOSITORY_MISSING' },
    );
  }
  const rules = await thresholdRepository.listAll();
  return resolveApprovalPolicy(rules, {
    value: overrideValue === undefined ? contract.value : overrideValue,
    contractType: contract.contract_type ?? null,
  });
}
