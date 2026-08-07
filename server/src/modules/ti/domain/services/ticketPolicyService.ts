/**
 * Funções puras de política de SLA/prazos do helpdesk de TI (RF-TI-009/011/
 * 013/046), sempre parametrizadas por `TiSettings` — nenhum valor
 * hard-coded (RNF-TI-05).
 *
 * @module modules/ti/domain/services/ticketPolicyService
 */

import type { TicketPriority } from '../entities/TicketTypes';

interface TiSettingsLike {
  sla_response_minutes_low: number;
  sla_response_minutes_medium: number;
  sla_response_minutes_high: number;
  sla_response_minutes_urgent: number;
  sla_resolution_minutes_low: number;
  sla_resolution_minutes_medium: number;
  sla_resolution_minutes_high: number;
  sla_resolution_minutes_urgent: number;
  auto_close_business_days: number;
  reopen_window_days: number;
}

/**
 * Calcula `sla_response_due_at`/`sla_resolution_due_at` a partir da
 * prioridade e da tabela de SLA parametrizada em `ti_settings` (RF-TI-009).
 *
 * @param settings - Linha singleton de `ti_settings`.
 * @param priority - Prioridade do chamado no momento da abertura.
 * @param from - Instante de referência (abertura do chamado).
 * @returns `{ responseDueAt, resolutionDueAt }`.
 */
export function calcSlaDueDates(settings: TiSettingsLike, priority: TicketPriority, from: Date): { responseDueAt: Date; resolutionDueAt: Date } {
  const responseMinutes = {
    low: settings.sla_response_minutes_low,
    medium: settings.sla_response_minutes_medium,
    high: settings.sla_response_minutes_high,
    urgent: settings.sla_response_minutes_urgent,
  }[priority];
  const resolutionMinutes = {
    low: settings.sla_resolution_minutes_low,
    medium: settings.sla_resolution_minutes_medium,
    high: settings.sla_resolution_minutes_high,
    urgent: settings.sla_resolution_minutes_urgent,
  }[priority];

  return {
    responseDueAt: new Date(from.getTime() + responseMinutes * 60_000),
    resolutionDueAt: new Date(from.getTime() + resolutionMinutes * 60_000),
  };
}

/** Soma `days` dias ÚTEIS (segunda a sexta) a `from` (RF-TI-011, auto-close). */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return result;
}

/**
 * Verifica se um chamado `closed`/`resolved` ainda pode ser reaberto,
 * dentro da janela parametrizada em dias corridos (RF-TI-006/RF-TI-013).
 */
export function isWithinReopenWindow(closedAt: Date | null, reopenWindowDays: number, now: Date = new Date()): boolean {
  if (!closedAt) return true;
  const limit = new Date(closedAt.getTime() + reopenWindowDays * 24 * 60 * 60 * 1000);
  return now.getTime() <= limit.getTime();
}

/** Deriva `sla_overdue` por leitura, sem nunca bloquear transição (RNF-TI-03/BR-TI-005). */
export function isSlaOverdue(ticket: { status: string; sla_resolution_due_at: Date | string | null; resolved_at: Date | string | null }, now: Date = new Date()): boolean {
  if (!ticket.sla_resolution_due_at) return false;
  if (['resolved', 'closed', 'canceled'].includes(ticket.status)) return false;
  return now.getTime() > new Date(ticket.sla_resolution_due_at).getTime();
}
