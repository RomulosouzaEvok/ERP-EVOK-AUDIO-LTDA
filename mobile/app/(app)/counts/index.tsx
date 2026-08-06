import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { listMyInventoryCounts, listPoolInventoryCounts } from '../../../src/api/inventoryCounts';
import { ApiError } from '../../../src/api/client';
import type { InventoryCount, InventoryCountStatus } from '../../../src/api/types';

const STATUS_LABEL: Record<InventoryCountStatus, string> = {
  draft: 'Não iniciada',
  counting: 'Em contagem',
  pending_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  adjusted: 'Ajustada',
};

const COUNT_TYPE_LABEL: Record<string, string> = {
  cycle: 'Cíclica',
  full: 'Geral',
  spot: 'Pontual',
};

type Section = { key: 'mine' | 'pool'; title: string; data: InventoryCount[] };

function CountCard({ item }: { item: InventoryCount }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/(app)/counts/[id]', params: { id: String(item.id) } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.countNumber}>{item.count_number}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardLine}>
        Tipo: {COUNT_TYPE_LABEL[item.count_type] ?? item.count_type}
        {item.location ? ` · ${item.location}` : ''}
      </Text>
      <Text style={styles.cardLine}>Depósito: {item.warehouse_id ?? '-'}</Text>
      {item.assignedTo ? <Text style={styles.cardLine}>Responsável: {item.assignedTo.name}</Text> : null}
    </Pressable>
  );
}

export default function InventoryCountsListScreen() {
  const [mine, setMine] = useState<InventoryCount[]>([]);
  const [pool, setPool] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mineResult, poolResult] = await Promise.all([listMyInventoryCounts(), listPoolInventoryCounts()]);
      setMine(mineResult);
      setPool(poolResult);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar contagens de inventário.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadData().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [loadData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  const sections: Section[] = [
    { key: 'mine', title: 'Minhas contagens', data: mine },
    { key: 'pool', title: 'Disponíveis (pool)', data: pool },
  ];

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={sections}
        keyExtractor={(section) => section.key}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.length === 0 ? (
              <Text style={styles.emptyText}>
                {section.key === 'mine'
                  ? 'Nenhuma contagem atribuída a você no momento.'
                  : 'Nenhuma contagem disponível no pool.'}
              </Text>
            ) : (
              section.data.map((item) => <CountCard key={item.id} item={item} />)
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  errorText: { color: '#991B1B', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  emptyText: { color: '#64748B', fontSize: 13 },
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
    marginBottom: 6,
  },
  countNumber: { fontWeight: '700', fontSize: 15, color: '#0F172A' },
  badge: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  cardLine: { fontSize: 13, color: '#334155', marginTop: 2 },
});
