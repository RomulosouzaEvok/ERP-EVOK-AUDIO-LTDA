import UseCase from '../../../../shared/application/UseCase';
import PurchaseRequisitionRepository from '../../domain/repositories/PurchaseRequisitionRepository';
import { calculateHandoffSignal } from '../../../../shared/domain/handoffSignal';

type ListPurchaseRequisitionsInput = {
  status?: string;
  origin?: string;
  requester_id?: number;
  department_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  offset?: number;
};

type ListPurchaseRequisitionsOutput = {
  rows: any[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Lista requisições de compra com filtros e paginação, cobrindo o fluxo do
 * endpoint `GET /api/purchase-requisitions`.
 *
 * Bloco 3 (UC-40, docs/governance/TODO.md): cada linha ganha o campo
 * aditivo `handoff_signal` (`green|yellow|red`), calculado via
 * `calculateHandoffSignal('purchase_requisition', ...)` — fila de
 * aprovação do gestor de Requisições (`pending` = amarelo, "aguardando
 * aprovação"). Campo sempre calculado on-the-fly, nunca persistido.
 *
 * Bloco C (docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md):
 * `department_id` é aceito como filtro de query (`?department_id=`) para o
 * frontend restringir a fila às requisições do departamento do usuário
 * logado (Logística, Produção, Manutenção, Qualidade). Diferente de
 * `requester_id`/`approved_by`, este campo é apenas leitura/filtro — não
 * há risco de spoofing de identidade.
 */
class ListPurchaseRequisitionsUseCase extends UseCase<ListPurchaseRequisitionsInput, ListPurchaseRequisitionsOutput> {
  private readonly requisitionRepository: PurchaseRequisitionRepository;

  constructor(requisitionRepository: PurchaseRequisitionRepository) {
    super();
    this.requisitionRepository = requisitionRepository;
  }

  async execute({ status, origin, requester_id, department_id, start_date, end_date, page = 1, limit = 20, offset = 0 }: ListPurchaseRequisitionsInput = {}) {
    const { rows, count } = await this.requisitionRepository.listRequisitions(
      { status, origin, requester_id, department_id, start_date, end_date },
      { limit, offset }
    );

    const rowsWithSignal = rows.map((row: any) => {
      const json = row.toJSON ? row.toJSON() : row;
      return {
        ...json,
        handoff_signal: calculateHandoffSignal('purchase_requisition', { status: json.status }),
      };
    });

    return { rows: rowsWithSignal, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

export = ListPurchaseRequisitionsUseCase;
