import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { listMovements } from '../../src/api/mobileInventory';
import { ApiError } from '../../src/api/client';
import type { InventoryMovement } from '../../src/api/types';

const PAGE_LIMIT = 20;

const TYPE_LABEL: Record<string, string> = {
  in: 'Entrada',
  out: 'Saída',
  adjustment: 'Ajuste',
};

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR');
}

export default function HistoryScreen() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number, mode: 'replace' | 'append') => {
    try {
      const response = await listMovements({ page: targetPage, limit: PAGE_LIMIT });
      setMovements((prev) => (mode === 'append' ? [...prev, ...response.data] : response.data));
      setPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar histórico de movimentações.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadPage(1, 'replace').finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [loadPage])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadPage(1, 'replace');
    setRefreshing(false);
  }

  async function handleLoadMore() {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    await loadPage(page + 1, 'append');
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={movements}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhuma movimentação registrada ainda.</Text>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
        renderItem={({ item }) => {
          const typeKey = String(item.type ?? '');
          const isOut = typeKey === 'out';
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.product?.name ?? `Produto #${item.product_id ?? '-'}`}
                </Text>
                <View style={[styles.badge, isOut ? styles.badgeOut : styles.badgeIn]}>
                  <Text style={styles.badgeText}>{TYPE_LABEL[typeKey] ?? (typeKey || '-')}</Text>
                </View>
              </View>
              <Text style={styles.productCode}>{item.product?.code ?? ''}</Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Quantidade</Text>
                <Text style={styles.cardValue}>{item.quantity ?? '-'}</Text>
              </View>
              {item.description ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Descrição</Text>
                  <Text style={styles.cardValue} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              ) : null}
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Responsável</Text>
                <Text style={styles.cardValue}>{item.user?.name ?? '-'}</Text>
              </View>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64 },
  emptyText: { color: '#64748B', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  errorText: { color: '#991B1B', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  productName: { flex: 1, fontWeight: '700', fontSize: 15, color: '#0F172A' },
  productCode: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeIn: { backgroundColor: '#DCFCE7' },
  badgeOut: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardLabel: { fontSize: 12, color: '#64748B' },
  cardValue: { fontSize: 13, color: '#0F172A', fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'right' },
  footerLoader: { marginVertical: 16 },
});
