/**
 * Painel principal ("placar") — pós-login. Busca
 * `GET /api/dashboard/department-demands` e atualiza sozinho a cada 60s
 * (`useDepartmentDemands`). Não há navegação/drill-down: é uma tela única,
 * pensada para ficar ligada na parede sem interação humana.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import DepartmentCard from '../../src/components/DepartmentCard';
import { useAuth } from '../../src/context/AuthContext';
import { useDepartmentDemands } from '../../src/api/useDepartmentDemands';

/** Texto relativo simples ("agora", "há 1 min", "há 3 min"), sem libs externas. */
function formatRelativeTime(timestampMs: number, nowMs: number): string {
  const diffSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSeconds < 10) return 'agora mesmo';
  if (diffSeconds < 60) return `há ${diffSeconds}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  return `há ${diffMinutes} min`;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { data, isInitialLoading, isRefreshing, lastUpdatedAt, lastError } = useDepartmentDemands(
    true,
    logout
  );

  // Re-renderiza a cada segundo só para manter o texto "há Xs" vivo no rodapé.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const renderStatus = useCallback(() => {
    if (lastError) {
      return (
        <Text style={styles.statusError}>
          ⚠ Erro ao atualizar, tentando novamente…
          {lastUpdatedAt ? ` (últimos dados: ${formatRelativeTime(lastUpdatedAt, nowMs)})` : ''}
        </Text>
      );
    }
    if (isRefreshing && lastUpdatedAt) {
      return <Text style={styles.statusOk}>Atualizando…</Text>;
    }
    if (lastUpdatedAt) {
      return <Text style={styles.statusOk}>Atualizado {formatRelativeTime(lastUpdatedAt, nowMs)}</Text>;
    }
    return null;
  }, [lastError, isRefreshing, lastUpdatedAt, nowMs]);

  if (isInitialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Carregando painel…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Demandas em Aberto por Departamento</Text>
          {user ? <Text style={styles.subtitle}>Evok Áudio ERP · sessão de {user.name}</Text> : null}
        </View>
        <View style={styles.statusBox}>{renderStatus()}</View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {(data ?? []).map((demand) => (
          <DepartmentCard key={demand.department_id ?? 'sem-departamento'} demand={demand} />
        ))}
        {data && data.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum departamento cadastrado.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 32,
    paddingTop: 28,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 18,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statusBox: {
    minWidth: 240,
    alignItems: 'flex-end',
  },
  statusOk: {
    fontSize: 13,
    color: '#64748B',
  },
  statusError: {
    fontSize: 13,
    color: '#FBBF24',
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 24,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
});
