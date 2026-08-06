/**
 * Hook do painel "vivo": busca `GET /api/dashboard/department-demands` ao
 * montar e repete a cada `DASHBOARD_REFRESH_INTERVAL_MS` (60s), sem
 * interação humana.
 *
 * Requisito de produto: o painel fica ligado na parede sozinho — uma falha
 * de rede JAMAIS pode travar a tela em um estado de erro. Por isso, em caso
 * de falha, mantém os últimos dados exibidos e apenas sinaliza
 * discretamente (`lastError` + `lastUpdatedAt` desatualizado); a próxima
 * tentativa acontece automaticamente no próximo ciclo do timer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchDepartmentDemands } from './dashboard';
import { ApiError } from './client';
import { DASHBOARD_REFRESH_INTERVAL_MS } from '../config/env';
import type { DepartmentDemand } from './types';

interface UseDepartmentDemandsResult {
  /** Últimos dados carregados com sucesso (permanece populado mesmo se o refresh mais recente falhar). */
  data: DepartmentDemand[] | null;
  /** `true` apenas na primeira carga (sem dados anteriores para exibir). */
  isInitialLoading: boolean;
  /** `true` enquanto uma requisição de refresh está em voo (dados antigos continuam na tela). */
  isRefreshing: boolean;
  /** Timestamp (epoch ms) da última atualização bem-sucedida, ou `null` se nunca teve sucesso. */
  lastUpdatedAt: number | null;
  /** Mensagem de erro do ciclo mais recente, ou `null` se o último ciclo teve sucesso. */
  lastError: string | null;
}

export function useDepartmentDemands(
  isAuthenticated: boolean,
  onUnauthorized: () => void
): UseDepartmentDemandsResult {
  const [data, setData] = useState<DepartmentDemand[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs evitam recriar o efeito/timer a cada render por causa de closures.
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const demands = await fetchDepartmentDemands();
      setData(demands);
      setLastUpdatedAt(Date.now());
      setLastError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorizedRef.current();
        return;
      }
      const message = error instanceof ApiError ? error.message : 'Erro ao atualizar o painel.';
      setLastError(message);
      // Mantém os dados antigos na tela — não limpa `data` em caso de erro.
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    load();
    const interval = setInterval(load, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, load]);

  return { data, isInitialLoading, isRefreshing, lastUpdatedAt, lastError };
}
