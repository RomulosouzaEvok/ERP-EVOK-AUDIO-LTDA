import { ExecutiveKpiPanel } from '@/pages/DashboardPage';

/**
 * Widget `kpis-executivos` — reaproveita o painel executivo do
 * `DashboardPage.tsx` (KPIs consolidados + estoque baixo + atalhos) sem
 * duplicar a lógica/visual. Restrito a `admin`/`financial` no `widgetRegistry`
 * (papel "roles altos"), então não precisa reforçar gates aqui.
 */
export function KpisExecutivosWidget() {
  return <ExecutiveKpiPanel />;
}
