/**
 * Caso de uso `GET /api/comex/import-processes/:id/approvals` — situacao da
 * alcada da diretoria sobre um processo de importacao (G11-COMEX).
 *
 * Existe pelo mesmo motivo do equivalente em Compras
 * (`ListPurchaseApprovalsUseCase`, G11) e no Juridico (RF-JUR-003): a tela
 * precisa saber o que ainda falta para o processo poder embarcar **sem
 * efeito colateral** — sem este endpoint, o unico jeito de descobrir seria
 * tentar `POST /approve` (que grava uma aprovacao de verdade) ou tentar
 * embarcar e tomar 422.
 *
 * Leitura pura: nao abre transacao, nao usa lock e nao grava nada.
 *
 * @module modules/comex/application/use-cases/ListImportProcessApprovalsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../errors';
import ComexRepository from '../../domain/repositories/ComexRepository';
import {
  IMPORT_APPROVAL_GATE_EVENT,
  IMPORT_APPROVAL_RULE,
  IMPORT_APPROVAL_STATUS,
  requiredImportApproverRoles,
} from '../../domain/constants';

interface ListImportProcessApprovalsInput {
  id: number;
}

class ListImportProcessApprovalsUseCase extends UseCase<ListImportProcessApprovalsInput, any> {
  private readonly comexRepository: ComexRepository;

  public constructor(comexRepository: ComexRepository) {
    super();
    this.comexRepository = comexRepository;
  }

  /**
   * @param input - Id do processo de importacao.
   * @returns `{ rule, process_status, gate_event, can_register_approval, required_roles, approvals, missing_roles, approval_complete }`.
   * @throws {NotFoundError} Se o processo nao existir.
   */
  public async execute(input: ListImportProcessApprovalsInput): Promise<any> {
    const importProcess = await this.comexRepository.findImportProcessById(input.id);
    if (!importProcess) {
      throw new NotFoundError('Processo de importacao nao encontrado.');
    }

    const requiredRoles = requiredImportApproverRoles();
    const approvals = (await this.comexRepository.listImportProcessApprovals(input.id)) || [];
    const approvedRoles = new Set(approvals.map((approval: any) => approval.approver_role));
    const missingRoles = requiredRoles.filter((role: string) => !approvedRoles.has(role));

    return {
      rule: IMPORT_APPROVAL_RULE,
      process_status: importProcess.status,
      // Etapa que o gate trava — a tela usa para explicar POR QUE o botao
      // de embarque esta bloqueado.
      gate_event: IMPORT_APPROVAL_GATE_EVENT,
      can_register_approval: importProcess.status === IMPORT_APPROVAL_STATUS && missingRoles.length > 0,
      required_roles: requiredRoles,
      approvals,
      missing_roles: missingRoles,
      approval_complete: missingRoles.length === 0,
    };
  }
}

export = ListImportProcessApprovalsUseCase;
