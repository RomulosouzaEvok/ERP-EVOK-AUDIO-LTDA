/**
 * Caso de uso `POST /api/comex/import-processes/:id/approve` — registra a
 * aprovacao da DIRETORIA sobre um processo de importacao (G11-COMEX,
 * decisao D-G do dono do produto em 2026-08-10).
 *
 * Isto NAO avanca o processo: quem embarca continua sendo
 * `POST /:id/tracking` com `event = 'shipped'`
 * (`RegisterImportTrackingUseCase`), que passa a exigir esta aprovacao
 * previamente registrada.
 *
 * Mesmo padrao anti-spoofing ja aprovado no G11 (`ApprovePurchaseUseCase`) e
 * no Juridico (RF-JUR-003, `ApproveContractUseCase`): a AUTORIZACAO real vem
 * do RBAC — a rota e protegida por `authorizeModule('diretor')` e o
 * controller resolve `availableRoles` a partir de `req.user.permissions`.
 * `approverUserId` vem SEMPRE de `req.user.id` (JWT); nenhum dos dois e
 * aceito do body.
 *
 * ## Segregacao de funcao (D-K, 2026-08-10)
 *
 * O analista que registrou o processo (`import_processes.created_by`, coluna
 * NOT NULL preenchida do JWT em `CreateImportProcessUseCase`) nao aprova o
 * proprio processo, ainda que tenha o papel `diretor` (ou seja `admin`).
 * Como este gate e o UNICO controle antes do embarque de uma importacao —
 * o dono citou processos na casa de R$ 1 milhao —, permitir auto-aprovacao
 * aqui deixaria a importacao inteira sem segunda pessoa em nenhum ponto.
 * Ver `shared/domain/segregationOfDuties`.
 *
 * @module modules/comex/application/use-cases/ApproveImportProcessUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError, BusinessRuleError } from '../../../../errors';
import { assertApproverIsNotRequester, SEGREGATION_RULES } from '../../../../shared/domain/segregationOfDuties';
import ComexRepository from '../../domain/repositories/ComexRepository';
import {
  IMPORT_APPROVAL_RULE,
  IMPORT_APPROVAL_STATUS,
  requiredImportApproverRoles,
} from '../../domain/constants';

interface ApproveImportProcessInput {
  id: number;
  /** Sempre `req.user.id` (JWT) — nunca do body. */
  approverUserId: number;
  /** Papeis de alcada que o usuario logado efetivamente possui, resolvidos por RBAC no controller. */
  availableRoles: string[];
  transaction: any;
}

class ApproveImportProcessUseCase extends UseCase<ApproveImportProcessInput, any> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  /**
   * @param input - Id do processo, id do aprovador (JWT), papeis disponiveis (RBAC) e a transacao ativa.
   * @returns A aprovacao criada.
   * @throws {NotFoundError} Se o processo nao existir.
   * @throws {BusinessRuleError} (422, `details.rule = 'D-K-COMEX'`) Se o aprovador e o analista que criou o processo (segregacao de funcao).
   * @throws {BusinessRuleError} (422, `details.rule = 'G11-COMEX'`) Se o processo ja passou do `draft` (aprovacao retroativa), se o usuario nao possui papel de aprovador, ou se o papel ja aprovou este processo.
   */
  public async execute(input: ApproveImportProcessInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessByIdForUpdate(input.id, input.transaction);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }

    // A alcada so faz sentido ANTES do embarque: depois de `shipped` o
    // cambio e o frete ja estao comprometidos e a aprovacao seria
    // retroativa. `cancelled`/`received` idem (terminais).
    if (importProcess.status !== IMPORT_APPROVAL_STATUS) {
      throw new BusinessRuleError(
        `Processo esta com status "${importProcess.status}": a aprovacao da diretoria so pode ser registrada enquanto o processo esta em "${IMPORT_APPROVAL_STATUS}" (antes do embarque).`,
        { rule: IMPORT_APPROVAL_RULE, current_status: importProcess.status },
      );
    }

    // D-K — segregacao de funcao, antes de qualquer escrita.
    assertApproverIsNotRequester({
      rule: SEGREGATION_RULES.IMPORT_PROCESS_AUTHORITY,
      requesterUserId: importProcess.created_by,
      approverUserId: input.approverUserId,
      documentLabel: `o processo de importacao ${importProcess.process_number ?? input.id}`,
      approverHint: 'outro usuario da diretoria (papel `diretor`)',
    });

    const roles = input.availableRoles || [];
    const required = requiredImportApproverRoles();
    const role = required.find((requiredRole: string) => roles.includes(requiredRole));
    if (!role) {
      throw new BusinessRuleError(
        `Usuario nao possui nenhum dos papeis exigidos por um processo de importacao: ${required.join(', ')}.`,
        { rule: IMPORT_APPROVAL_RULE, required_roles: required },
      );
    }

    const existing = await this.comexRepository.findImportProcessApprovalByRole(importProcess.id, role, input.transaction);
    if (existing) {
      throw new BusinessRuleError(
        `O papel "${role}" ja aprovou este processo de importacao.`,
        { rule: IMPORT_APPROVAL_RULE, approver_role: role },
      );
    }

    return this.comexRepository.createImportProcessApproval({
      import_process_id: importProcess.id,
      approver_user_id: input.approverUserId,
      approver_role: role,
      approved_at: new Date(),
    }, input.transaction);
  }
}

export = ApproveImportProcessUseCase;
