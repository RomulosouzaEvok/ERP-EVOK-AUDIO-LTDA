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

/**
 * Estado paginado de uma seção da lista (Minhas contagens / Pool). Cada
 * seção pagina de forma independente contra `GET /api/inventory-counts`
 * (`page`/`limit`/`totalPages`, ver `PaginationMeta`).
 */
interface PaginatedSectionState {
  data: InventoryCount[];
  page: number;
  totalPages: number;
  loadingMore: boolean;
}

const INITIAL_SECTION_STATE: PaginatedSectionState = { data: [], page: 1, totalPages: 1, loadingMore: false };

type SectionKey = 'mine' | 'pool';

type Section = { key: SectionKey; title: string; state: PaginatedSectionState; emptyText: string };

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
  const [mine, setMine] = useState<PaginatedSectionState>(INITIAL_SECTION_STATE);
  const [pool, setPool] = useState<PaginatedSectionState>(INITIAL_SECTION_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Carrega a primeira página das duas seções (usado no foco da tela e no pull-to-refresh). */
  const loadFirstPage = useCallback(async () => {
    try {
      const [mineResult, poolResult] = await Promise.all([
        listMyInventoryCounts({ page: 1 }),
        listPoolInventoryCounts({ page: 1 }),
      ]);
      setMine({ data: mineResult.data, page: mineResult.pagination.page, totalPages: mineResult.pagination.totalPages, loadingMore: false });
      setPool({ data: poolResult.data, page: poolResult.pagination.page, totalPages: poolResult.pagination.totalPages, loadingMore: false });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar contagens de inventário.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadFirstPage().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [loadFirstPage])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }

  /** Busca a página `nextPage` de "Minhas contagens" e anexa ao final da lista já carregada. */
  const fetchNextMine = useCallback(async (nextPage: number) => {
    try {
      const response = await listMyInventoryCounts({ page: nextPage });
      setMine((prev) => ({
        data: [...prev.data, ...response.data],
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        loadingMore: false,
      }));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar mais contagens.');
      setMine((prev) => ({ ...prev, loadingMore: false }));
    }
  }, []);

  /** Busca a página `nextPage` do pool e anexa ao final da lista já carregada. */
  const fetchNextPool = useCallback(async (nextPage: number) => {
    try {
      const response = await listPoolInventoryCounts({ page: nextPage });
      setPool((prev) => ({
        data: [...prev.data, ...response.data],
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        loadingMore: false,
      }));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar mais contagens.');
      setPool((prev) => ({ ...prev, loadingMore: false }));
    }
  }, []);

  const handleLoadMoreMine = useCallback(async () => {
    if (mine.loadingMore || loading || mine.page >= mine.totalPages) return;
    setMine((prev) => ({ ...prev, loadingMore: true }));
    await fetchNextMine(mine.page + 1);
  }, [mine.loadingMore, mine.page, mine.totalPages, loading, fetchNextMine]);

  const handleLoadMorePool = useCallback(async () => {
    if (pool.loadingMore || loading || pool.page >= pool.totalPages) return;
    setPool((prev) => ({ ...prev, loadingMore: true }));
    await fetchNextPool(pool.page + 1);
  }, [pool.loadingMore, pool.page, pool.totalPages, loading, fetchNextPool]);

  /**
   * A tela mostra as duas seções ("Minhas contagens" e "Disponíveis") numa
   * única lista rolável. Como o `FlatList` externo só dispara `onEndReached`
   * ao alcançar o fim de TODO o conteúdo (não há suporte nativo a
   * `onEndReached` por seção dentro de uma mesma lista), ao chegar ao fim da
   * lista carregamos mais páginas priorizando "Minhas contagens" (a primeira
   * seção, visualmente mais próxima do topo) e só then "Disponíveis" — assim
   * o usuário nunca perde itens acima de 100 registros em nenhuma das duas
   * seções, apenas continua rolando para trazer mais.
   */
  const handleEndReached = useCallback(() => {
    if (mine.page < mine.totalPages) {
      handleLoadMoreMine();
      return;
    }
    if (pool.page < pool.totalPages) {
      handleLoadMorePool();
    }
  }, [mine.page, mine.totalPages, pool.page, pool.totalPages, handleLoadMoreMine, handleLoadMorePool]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  const sections: Section[] = [
    { key: 'mine', title: 'Minhas contagens', state: mine, emptyText: 'Nenhuma contagem atribuída a você no momento.' },
    { key: 'pool', title: 'Disponíveis (pool)', state: pool, emptyText: 'Nenhuma contagem disponível no pool.' },
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
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.state.data.length === 0 ? (
              <Text style={styles.emptyText}>{section.emptyText}</Text>
            ) : (
              section.state.data.map((item) => <CountCard key={item.id} item={item} />)
            )}
            {section.state.loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color="#0F172A" />
            ) : null}
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
  footerLoader: { marginTop: 8 },
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
