import { httpClient } from './httpClient';
import type { ItemResponse } from './types';

/**
 * Resumo por área do semáforo de handoff (UC-40, Bloco 3.3) — usado para o
 * badge/contador discreto no menu lateral (Bloco 3, ponto em aberto do
 * dono, versão mínima reversível — ver `docs/governance/TODO.md` rodapé).
 */
export interface DashboardHandoffsSummary {
  recebimento: { pending: number };
  requisicoes: { awaiting_approval: number };
  expedicao: { ready_to_ship: number };
  qualidade: { quarantine: number; open_rncs: number };
}

/** `GET /api/dashboard/handoffs` — exige `authorizeModule('dashboard')`. */
export async function getDashboardHandoffs() {
  const { data } = await httpClient.get<ItemResponse<DashboardHandoffsSummary>>('/api/dashboard/handoffs');
  return data.data;
}
