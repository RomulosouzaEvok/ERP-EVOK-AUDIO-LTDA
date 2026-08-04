/**
 * Use case: obter o resumo de contadores por área do semáforo de handoff
 * (UC-40, BUSINESS_RULES.md §10, docs/governance/TODO.md Bloco 3.3).
 *
 * Cobre o endpoint `GET /api/dashboard/handoffs`, usado pelo futuro
 * badge/contador do menu lateral por módulo (Recebimento, Requisições,
 * Expedição, Qualidade). Não substitui `handoff_signal` das listagens
 * (Bloco 3.2) — é um resumo agregado, separado, para o menu.
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
   *   quarentena e RNCs abertas/em análise.
   */
  public async execute(): Promise<DashboardHandoffsSummary> {
    return this.dashboardRepository.getHandoffsSummary();
  }
}

export = GetDashboardHandoffsUseCase;
