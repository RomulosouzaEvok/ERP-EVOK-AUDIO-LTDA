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
 *
 * Exceção: 403 (usuário sem permissão no módulo `dashboard`) é definitivo —
 * o hook para de tentar novos ciclos e sinaliza via `isForbidden`, cabendo à
 * tela mostrar uma saída clara (trocar de usuário) em vez de ficar em loop
 * eterno de "erro ao atualizar".
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
  /**
   * `true` quando o backend respondeu 403 (usuário sem permissão no módulo
   * `dashboard`). Diferente de `lastError`, esse estado é definitivo — o
   * hook para de tentar novos ciclos automaticamente, já que o problema não
   * se resolve sozinho (exige trocar de usuário).
   */
  isForbidden: boolean;
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
  const [isForbidden, setIsForbidden] = useState(false);

  // Refs evitam recriar o efeito/timer a cada render por causa de closures.
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  // Evita chamadas sobrepostas: se o ciclo anterior ainda está em voo quando
  // o timer de 60s dispara de novo (ex.: resposta lenta/timeout de 15s
  // quase colidindo com o próximo tick), pula o novo ciclo em vez de
  // empilhar requisições concorrentes.
  const isLoadingRef = useRef(false);

  const load = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
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
      if (error instanceof ApiError && error.status === 403) {
        // Estado definitivo: não adianta insistir sozinho, o usuário atual
        // não tem permissão. O efeito abaixo para o timer ao ver `isForbidden`.
        setIsForbidden(true);
        return;
      }
      const message = error instanceof ApiError ? error.message : 'Erro ao atualizar o painel.';
      setLastError(message);
      // Mantém os dados antigos na tela — não limpa `data` em caso de erro.
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isForbidden) return undefined;

    load();
    const interval = setInterval(load, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, isForbidden, load]);

  return { data, isInitialLoading, isRefreshing, lastUpdatedAt, lastError, isForbidden };
}
