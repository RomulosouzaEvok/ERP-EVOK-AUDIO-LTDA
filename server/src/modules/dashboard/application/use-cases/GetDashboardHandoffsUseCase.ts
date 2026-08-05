/**
 * Use case: obter o resumo de contadores por área do semáforo de handoff
 * (UC-40, BUSINESS_RULES.md §10, docs/governance/TODO.md Bloco 3.3).
 *
 * Cobre o endpoint `GET /api/dashboard/handoffs`, usado pelo futuro
 * badge/contador do menu lateral por módulo (Recebimento, Requisições,
 * Expedição, Qualidade, Compras). Não substitui `handoff_signal` das
 * listagens (Bloco 3.2) — é um resumo agregado, separado, para o menu.
 *
 * `compras.pending_returns` (Bloco B,
 * docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md): RNCs com
 * `immediate_action = 'return_supplier'` ainda não encerradas — a
 * tratativa comercial da devolução (crédito/reposição/cancelamento com o
 * fornecedor) vira item de trabalho direto na fila de Compras, não um
 * badge passivo em Qualidade.
 *
 * @module modules/dashboard/application/use-cases/GetDashboardHandoffsUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import DashboardRepository from '../../domain/repositories/DashboardRepository';

/** Resumo de contadores por área, um bloco por fila de handoff. */
interface DashboardHandoffsSummary {
  recebimento: { pending: number };
  requisicoes: { awaiting_approval: number };
  expedicao: { ready_to_ship: number };
  qualidade: { quarantine: number; open_rncs: number };
  compras: { pending_returns: number };
}

class GetDashboardHandoffsUseCase extends UseCase<void, DashboardHandoffsSummary> {
  private readonly dashboardRepository: DashboardRepository;

  /** @param dashboardRepository - Repositorio de indicadores do dashboard. */
  public constructor(dashboardRepository: DashboardRepository) {
    super();
    this.dashboardRepository = dashboardRepository;
  }

  /**
   * @returns Resumo por área: pedidos pendentes de recebimento, requisições
   *   aguardando aprovação, vendas prontas para embarque, lotes em
   *   quarentena, RNCs abertas/em análise e devoluções ao fornecedor
   *   pendentes de tratativa em Compras.
   */
  public async execute(): Promise<DashboardHandoffsSummary> {
    return this.dashboardRepository.getHandoffsSummary();
  }
}

export = GetDashboardHandoffsUseCase;
