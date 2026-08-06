/**
 * Painel principal ("placar") — pós-login. Busca
 * `GET /api/dashboard/department-demands` e atualiza sozinho a cada 60s
 * (`useDepartmentDemands`). Não há navegação/drill-down: é uma tela única,
 * pensada para ficar ligada na parede sem interação humana.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import DepartmentCard from '../../src/components/DepartmentCard';
import FocusablePressable from '../../src/components/FocusablePressable';
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
  const { data, isInitialLoading, isRefreshing, lastUpdatedAt, lastError, isForbidden } =
    useDepartmentDemands(true, logout);

  // Re-renderiza a cada segundo só para manter o texto "há Xs" vivo no rodapé.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Rodapé discreto de logout (canto da tela) — cobre o caso de a TV ter
  // sido logada com o usuário errado. Fica escondido atrás de uma
  // confirmação simples para não ser disparado sem querer no D-pad.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    await logout();
  }, [logout]);

  // Saída dedicada da tela de "sem permissão" — decisão já é explícita
  // (o usuário está olhando para uma tela inteira dizendo que precisa
  // trocar de usuário), então não pede confirmação extra.
  const handleSwitchUser = useCallback(async () => {
    await logout();
  }, [logout]);

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

  // 403: o usuário logado neste aparelho não tem permissão para o módulo
  // `dashboard`. Não adianta ficar retentando sozinho — mostra uma saída
  // clara e persistente em vez do loop eterno de "erro ao atualizar".
  if (isForbidden) {
    return (
      <View style={styles.centered}>
        <Text style={styles.forbiddenTitle}>
          Este usuário não tem permissão para ver o painel
        </Text>
        <Text style={styles.forbiddenSubtitle}>Entre com outro usuário para continuar.</Text>
        <FocusablePressable
          onPress={handleSwitchUser}
          style={styles.forbiddenButton}
          hasTVPreferredFocus
        >
          <Text style={styles.forbiddenButtonText}>Trocar usuário</Text>
        </FocusablePressable>
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

      <View style={styles.footer}>
        {showLogoutConfirm ? (
          <View style={styles.logoutConfirmRow}>
            <Text style={styles.logoutConfirmText}>Sair do painel?</Text>
            <FocusablePressable onPress={handleConfirmLogout} style={styles.footerConfirmButton}>
              <Text style={styles.footerConfirmButtonText}>Confirmar</Text>
            </FocusablePressable>
            <FocusablePressable
              onPress={() => setShowLogoutConfirm(false)}
              style={styles.footerCancelButton}
            >
              <Text style={styles.footerCancelButtonText}>Cancelar</Text>
            </FocusablePressable>
          </View>
        ) : (
          <FocusablePressable
            onPress={() => setShowLogoutConfirm(true)}
            style={styles.footerLogoutButton}
          >
            <Text style={styles.footerLogoutButtonText}>Sair</Text>
          </FocusablePressable>
        )}
      </View>
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
  forbiddenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    paddingHorizontal: 48,
  },
  forbiddenSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  forbiddenButton: {
    marginTop: 32,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  forbiddenButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  // Rodapé discreto: não deve competir visualmente com o painel de demandas.
  footer: {
    alignItems: 'flex-end',
    paddingVertical: 10,
  },
  footerLogoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  footerLogoutButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutConfirmText: {
    color: '#94A3B8',
    fontSize: 12,
    marginRight: 4,
  },
  footerConfirmButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  footerConfirmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  footerCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  footerCancelButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
