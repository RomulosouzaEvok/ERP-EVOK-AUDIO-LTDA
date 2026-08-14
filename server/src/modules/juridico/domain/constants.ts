/**
 * Constantes de negócio do módulo Jurídico.
 *
 * ## ⚠️ Os limiares de alçada NÃO moram mais aqui (FIND-ERP-005, Falha 1)
 *
 * Até 2026-08-14 este arquivo continha
 * `JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000` e
 * `JUR_APPROVAL_THRESHOLD_FINANCE = 300000` mais a função pura
 * `requiredApproverRoles(value)`. Isso contrariava o contrato de API
 * (`docs/business/BLOCO_3_JUR_API.md` §2.7 — tabela `jur_approval_thresholds`,
 * "nenhum valor de alçada é hard-coded") e produzia duas fontes autoritativas
 * contraditórias, registrado como Falha 1 de `FIND-ERP-005`.
 *
 * Por decisão do dono (`APR-2026-021` Parte B, decisão 3 — **tabela
 * configurável**), os limiares passaram a ser **configuração persistida**:
 *
 * - dados: `jur_approval_thresholds` (migration `20260814-000048`);
 * - histórico/auditoria das alterações: `jur_approval_threshold_history`;
 * - interpretação (estrutura técnica, sem valores):
 *   {@link module:modules/juridico/domain/approvalPolicy};
 * - leitura/escrita server-side: `GET`/`PUT
 *   /api/jur/settings/approval-thresholds` (escrita exige `juridico:approve`).
 *
 * **Não reintroduza limiar literal neste arquivo** — R1(a) do
 * RETEST_SPECIFICATION de FIND-ERP-005 reprova a remediação se um `50000`/
 * `300000` com semântica de alçada voltar ao código.
 *
 * @module modules/juridico/domain/constants
 */

/** Papéis de aprovador válidos para `jur_contract_approvals.approver_role`. */
export type ContractApproverRole = 'diretor' | 'financeiro';

/** Todos os papéis de aprovador conhecidos — usado para validar a configuração. */
export const CONTRACT_APPROVER_ROLES: ContractApproverRole[] = ['diretor', 'financeiro'];
