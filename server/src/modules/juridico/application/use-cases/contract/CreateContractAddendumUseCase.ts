/**
 * `POST /api/jur/contracts/:id/addendums` — cria e assina um aditivo
 * (RF-JUR-008). Atualiza os campos vigentes do contrato; o aditivo e os
 * valores anteriores (`previous_*`, snapshot) são imutáveis a partir da
 * criação (trigger de banco).
 *
 * ## Remediação FIND-ERP-005 / Falha 3 (SanaCore, ERP-LEGACY-001-CASE-002)
 *
 * Antes desta remediação este era o caminho lateral que anulava por completo
 * o único controle financeiro do módulo: um `juridico:operate` elevava o
 * valor de um contrato `active` de R$ 40.000 para R$ 5.000.000, sem reabrir
 * alçada, sem invalidar aprovação, sem mudar o status — e nem sequer
 * precisava declarar `change_type='value'`, porque a linha que gravava
 * `value` não consultava o `change_type`. É contorno de um controle que o
 * próprio módulo implementa na rota vizinha (`UpdateContractUseCase` bloqueia
 * alterar `value` de contrato `active`, BR-JUR-007).
 *
 * Três controles, por decisão do dono em `APR-2026-021` Parte B decisão 4
 * (*"aditivo que eleva valor EXIGE `approve`"*):
 *
 * 1. **`new_value` só é aceito com `change_type = 'value'`** — rejeição
 *    explícita, nunca descarte silencioso (R3(b), variante cruzada).
 * 2. **Elevação de valor exige nível `approve`.** A *preparação* do aditivo
 *    continua ao alcance de `juridico:operate` (aditivo de prazo, de
 *    reajuste para baixo, de qualquer outro tipo); a *efetivação de um
 *    aumento de valor* exige `approve`.
 * 3. **Reabertura de alçada.** Se o valor novo exige papéis que as
 *    aprovações vivas não cobrem, as aprovações são **invalidadas**
 *    (preservadas como histórico, `invalidated_at`) e o contrato volta a
 *    `in_approval`. A aprovação dada para a faixa antiga não vale para a
 *    nova (R3(c)).
 *
 * ## Ordenação fail-safe (limitação declarada, no lugar de transação única)
 *
 * A triagem recomendou envolver as escritas numa transação. A camada de
 * repositório deste módulo **não tem plumbing de transação** (nenhum método
 * de `ContractRepository`/`ContractApprovalRepository` aceita `transaction`),
 * e acrescentá-lo alargaria o blast radius para todo o módulo. Em vez disso,
 * as escritas são ordenadas de modo que **nenhuma falha intermediária deixe
 * o estado perigoso** (contrato `active`, valor elevado, sem aprovação):
 *
 * | Ordem | Escrita | Estado se falhar logo depois |
 * |---|---|---|
 * | 1 | invalidar aprovações + `status = 'in_approval'` | contrato travado com valor ANTIGO — seguro |
 * | 2 | `update` do valor | contrato travado com valor NOVO e sem aprovação — seguro |
 * | 3 | gravar o aditivo | igual a 2, faltando o registro documental |
 *
 * O estado perigoso não é alcançável por interrupção. Registrado como
 * limitação conhecida na remediação — a transação real é melhoria posterior.
 *
 * @module modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import ContractRepository from '../../../domain/repositories/ContractRepository';
import ContractApprovalRepository from '../../../domain/repositories/ContractApprovalRepository';
import ApprovalThresholdRepository from '../../../domain/repositories/ApprovalThresholdRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import { resolveContractApprovalPolicy } from '../../../domain/approvalPolicy';
import type { CreateContractAddendumInput } from '../../../domain/entities/ContractTypes';

/** Status a partir dos quais um contrato volta a exigir aprovação quando a faixa sobe. */
const REOPENED_STATUS = 'in_approval';

class CreateContractAddendumUseCase extends UseCase<CreateContractAddendumInput, any> {
  private readonly repository: ContractRepository;
  private readonly approvalRepository: ContractApprovalRepository;
  private readonly thresholdRepository: ApprovalThresholdRepository;

  /**
   * @param repository - Repositório de contratos.
   * @param approvalRepository - **Obrigatório** (FIND-ERP-005): sem ele não há como invalidar aprovações ao reabrir a alçada.
   * @param thresholdRepository - **Obrigatório**: política configurável de alçada.
   * @throws {Error} Fail-closed por construção quando falta qualquer dependência de controle.
   */
  public constructor(
    repository: ContractRepository,
    approvalRepository: ContractApprovalRepository,
    thresholdRepository: ApprovalThresholdRepository,
  ) {
    super();
    if (!approvalRepository || !thresholdRepository) {
      throw new Error(
        'CreateContractAddendumUseCase: approvalRepository e thresholdRepository sao obrigatorios — sem eles um '
        + 'aditivo elevaria o valor do contrato sem reabrir a alcada (FIND-ERP-005, Falha 3).',
      );
    }
    this.repository = repository;
    this.approvalRepository = approvalRepository;
    this.thresholdRepository = thresholdRepository;
  }

  /**
   * @throws {ValidationError} `change_type`/`description` ausentes ou dados incoerentes com o tipo (400).
   * @throws {NotFoundError} Contrato não encontrado (404).
   * @throws {BusinessRuleError} `change_type=value` sem `new_value`; `term` sem `new_end_date`; `new_value` em `change_type` que não é `value` (R3(b)); elevação de valor sem nível `approve` (APR-2026-021 B.4); política de alçada indisponível (422).
   */
  public async execute(input: CreateContractAddendumInput): Promise<any> {
    if (!input.change_type || !input.description) {
      throw new ValidationError('change_type e description são obrigatórios.');
    }

    const contract = await this.repository.findById(input.contractId);
    if (!contract) throw new NotFoundError(`Contrato ${input.contractId} não encontrado.`);

    if (input.change_type === 'value' && (input.new_value === undefined || input.new_value === null)) {
      throw new BusinessRuleError('change_type=value exige new_value.', { rule: 'BR-JUR-003' });
    }
    if (input.change_type === 'term' && !input.new_end_date) {
      throw new BusinessRuleError('change_type=term exige new_end_date.', { rule: 'BR-JUR-003' });
    }

    // (1) FIND-ERP-005 R3(b): `new_value` fora de `change_type='value'` é
    // REJEITADO, não ignorado — ignorar esconderia a intenção do usuário e
    // manteria o vetor aberto para qualquer futuro controle que confiasse no
    // `change_type` declarado.
    const carriesNewValue = input.new_value !== undefined && input.new_value !== null;
    if (carriesNewValue && input.change_type !== 'value') {
      throw new BusinessRuleError(
        `Aditivo do tipo "${input.change_type}" não pode alterar o valor do contrato. `
        + 'Para alterar valor, registre um aditivo com change_type="value" — que exige nível "approve" e reabre a alçada de aprovação.',
        { rule: 'RF-JUR-008', finding: 'FIND-ERP-005', field: 'new_value', change_type: input.change_type },
      );
    }

    const previousValue = Number(contract.value ?? 0);
    const nextValue = carriesNewValue ? Number(input.new_value) : previousValue;
    const isValueIncrease = carriesNewValue && nextValue > previousValue;

    // (2) APR-2026-021 B.4: preparar é `operate`; EFETIVAR aumento é `approve`.
    if (isValueIncrease && !input.requesterHasApprove) {
      throw new BusinessRuleError(
        'Aditivo que ELEVA o valor do contrato exige nível "approve" no módulo jurídico — elevação de valor é '
        + 'alteração material (decisão APR-2026-021). Peça a um gestor do Jurídico para efetivar o aumento.',
        { rule: 'RF-JUR-008', finding: 'FIND-ERP-005', previous_value: contract.value ?? null, new_value: input.new_value ?? null },
      );
    }

    // (3) Reabertura de alçada: a faixa NOVA é resolvida antes de qualquer escrita.
    let reopened = false;
    if (carriesNewValue && nextValue !== previousValue) {
      const nextPolicy = await resolveContractApprovalPolicy(this.thresholdRepository as any, contract, nextValue);
      const liveApprovals = await this.approvalRepository.listByContract(input.contractId);
      const coveredRoles = new Set(
        liveApprovals
          .filter((approval: any) => {
            if (approval?.approved_value === null || approval?.approved_value === undefined) return false;
            return Number(approval.approved_value) >= nextValue;
          })
          .map((approval: any) => approval.approver_role),
      );
      const missing = nextPolicy.requiredRoles.filter((role) => !coveredRoles.has(role));
      reopened = missing.length > 0;

      if (reopened) {
        // Escrita 1 — invalida e trava ANTES de o valor novo existir.
        await this.approvalRepository.invalidateByContract(input.contractId, {
          reason: `Aditivo alterou o valor de ${contract.value ?? 0} para ${nextValue} — alçada reaberta (RF-JUR-003, FIND-ERP-005).`,
          addendumId: null,
        });
        await this.repository.update(input.contractId, {
          status: REOPENED_STATUS,
          approval_policy_snapshot: nextPolicy.snapshot,
        });
      }
    }

    // Escrita 2 — campos vigentes do contrato.
    const contractUpdates: Record<string, unknown> = {};
    if (input.new_end_date) contractUpdates.end_date = input.new_end_date;
    if (carriesNewValue) contractUpdates.value = input.new_value;
    if (Object.keys(contractUpdates).length > 0) {
      await this.repository.update(input.contractId, contractUpdates);
    }

    // Escrita 3 — registro documental do aditivo.
    const addendumNumber = (await this.repository.countAddendums(input.contractId)) + 1;
    const addendum = await this.repository.addAddendum({
      contract_id: input.contractId,
      addendum_number: addendumNumber,
      addendum_type: input.change_type,
      description: input.description,
      previous_end_date: contract.end_date,
      new_end_date: input.new_end_date ?? null,
      previous_value: contract.value,
      new_value: carriesNewValue ? input.new_value : null,
      document_url: input.document_url ?? null,
      signed_at: new Date().toISOString().slice(0, 10),
      created_by: input.createdBy,
    });

    return reopened ? { ...(addendum.get ? addendum.get({ plain: true }) : addendum), approval_reopened: true } : addendum;
  }
}

export = CreateContractAddendumUseCase;
