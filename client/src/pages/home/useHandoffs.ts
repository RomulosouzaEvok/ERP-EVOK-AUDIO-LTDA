import { useQuery } from '@tanstack/react-query';

import { getDashboardHandoffs } from '@/api/dashboard';

/**
 * Hook compartilhado pelos widgets de handoff da Home por Perfil
 * (recebimento, expedição, requisições, qualidade) — todos usam a mesma
 * `queryKey`, então o TanStack Query deduplica em uma única chamada
 * `GET /api/dashboard/handoffs` mesmo com 4 widgets montados ao mesmo tempo.
 *
 * `GET /api/dashboard/handoffs` exige apenas `authorizeModule('dashboard')`,
 * módulo agregador concedido a todos os perfis (ver comentário na rota do
 * backend) — por isso não há gate de módulo aqui; a visibilidade de cada
 * widget é decidida pelo `widgetRegistry` a partir do módulo específico
 * (recebimento/expedicao/requisicoes/qualidade).
 */
export function useHandoffs() {
  return useQuery({
    queryKey: ['home-handoffs'],
    queryFn: getDashboardHandoffs,
    staleTime: 30_000,
  });
}
