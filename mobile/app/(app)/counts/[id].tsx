import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import {
  countInventoryCountItem,
  getInventoryCount,
  startInventoryCount,
  submitInventoryCount,
} from '../../../src/api/inventoryCounts';
import { ApiError } from '../../../src/api/client';
import type { InventoryCountDetail, InventoryCountItemDTO } from '../../../src/api/types';
import QrScannerModal from '../../../src/components/QrScannerModal';

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Linha de item da contagem: quantidade de sistema, campo de contagem física e salvamento individual. */
function CountItemRow({
  item,
  highlighted,
  onSaved,
  disabled,
}: {
  item: InventoryCountItemDTO;
  highlighted: boolean;
  onSaved: (updated: InventoryCountItemDTO) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(item.counted_quantity != null ? String(item.counted_quantity) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const parsed = Number(value);
    if (value === '' || Number.isNaN(parsed) || parsed < 0) {
      setError('Informe uma quantidade válida (>= 0).');
      return;
    }
    setSaving(true);
    try {
      const updated = await countInventoryCountItem(item.inventory_count_id, item.id, { counted_quantity: parsed });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar a contagem do item.');
    } finally {
      setSaving(false);
    }
  }

  const isCounted = item.status === 'counted' || item.status === 'adjusted';

  return (
    <View style={[styles.itemCard, highlighted && styles.itemCardHighlighted]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product?.name ?? `Produto #${item.product_id}`}
        </Text>
        {isCounted ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Contado</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.itemCode}>{item.product?.code ?? ''}</Text>
      <Text style={styles.itemSystemQty}>Qtd. sistema: {toNumber(item.system_quantity)}</Text>

      <View style={styles.itemInputRow}>
        <TextInput
          style={styles.itemInput}
          placeholder="Qtd. contada"
          placeholderTextColor="#94A3B8"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          editable={!disabled && !saving}
        />
        <Pressable
          style={[styles.itemSaveButton, (disabled || saving) && styles.itemSaveButtonDisabled]}
          onPress={handleSave}
          disabled={disabled || saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.itemSaveButtonText}>Salvar</Text>}
        </Pressable>
      </View>

      {error ? <Text style={styles.itemError}>{error}</Text> : null}
      {item.status === 'counted' && item.variance_quantity != null && Number(item.variance_quantity) !== 0 ? (
        <Text style={styles.itemVariance}>Divergência: {toNumber(item.variance_quantity)}</Text>
      ) : null}
    </View>
  );
}

export default function InventoryCountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [count, setCount] = useState<InventoryCountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const listRef = useRef<FlatList<InventoryCountItemDTO>>(null);

  const loadCount = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getInventoryCount(id);
      setCount(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao carregar a contagem de inventário.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadCount().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [loadCount])
  );

  const items = useMemo(() => count?.items ?? [], [count]);
  const pendingCount = useMemo(() => items.filter((item) => item.status === 'pending').length, [items]);

  async function handleStart() {
    if (!id) return;
    setStarting(true);
    setErrorMessage(null);
    try {
      const data = await startInventoryCount(id);
      setCount(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        Alert.alert('Indisponível', 'Esta contagem já foi pega por outro funcionário.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao iniciar a contagem.');
    } finally {
      setStarting(false);
    }
  }

  function handleItemSaved(updated: InventoryCountItemDTO) {
    setCount((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) };
    });
  }

  function handleScanned(code: string) {
    setScannerVisible(false);
    const trimmed = code.trim().toLowerCase();
    const found = items.find((item) => (item.product?.code ?? '').trim().toLowerCase() === trimmed);
    if (!found) {
      Alert.alert('Não encontrado', 'Nenhum item desta contagem corresponde ao código lido.');
      return;
    }
    const index = items.findIndex((item) => item.id === found.id);
    setHighlightedItemId(found.id);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }
  }

  async function handleSubmit() {
    if (!id) return;
    if (pendingCount > 0) {
      Alert.alert('Itens pendentes', `Ainda há ${pendingCount} item(ns) não contado(s). Conte todos antes de enviar.`);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitInventoryCount(id);
      Alert.alert('Enviado', 'Contagem enviada para aprovação com sucesso.', [
        { text: 'OK', onPress: () => router.replace('/(app)/counts') },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Erro ao enviar a contagem para aprovação.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!count) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{errorMessage ?? 'Contagem não encontrada.'}</Text>
      </View>
    );
  }

  const canOperate = count.status === 'counting';
  const needsStart = count.status === 'draft';

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.countNumber}>{count.count_number}</Text>
        <Text style={styles.headerLine}>Depósito: {count.warehouse_id ?? '-'}</Text>
        {count.location ? <Text style={styles.headerLine}>Local: {count.location}</Text> : null}
        <Text style={styles.headerLine}>Status: {count.status}</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {needsStart ? (
        <Pressable style={styles.startButton} onPress={handleStart} disabled={starting}>
          {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.startButtonText}>Iniciar contagem</Text>}
        </Pressable>
      ) : (
        <>
          <Pressable style={styles.scanButton} onPress={() => setScannerVisible(true)}>
            <Text style={styles.scanButtonText}>Escanear produto</Text>
          </Pressable>

          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={() => undefined}
            renderItem={({ item }) => (
              <CountItemRow
                item={item}
                highlighted={item.id === highlightedItemId}
                onSaved={handleItemSaved}
                disabled={!canOperate}
              />
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Esta contagem não possui itens.</Text>
              </View>
            }
          />

          {canOperate ? (
            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Enviar para aprovação {pendingCount > 0 ? `(${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
                </Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}

      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScanned} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  headerBox: {
    backgroundColor: '#0F172A',
    padding: 16,
    paddingBottom: 14,
  },
  countNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerLine: { color: '#CBD5E1', fontSize: 13, marginTop: 2 },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  errorText: { color: '#991B1B', textAlign: 'center' },
  startButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    margin: 20,
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scanButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
  },
  scanButtonText: { color: '#fff', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 32 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardHighlighted: { borderColor: '#22D3EE', borderWidth: 2, backgroundColor: '#ECFEFF' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontWeight: '700', fontSize: 14, color: '#0F172A' },
  itemCode: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemSystemQty: { fontSize: 13, color: '#334155', marginTop: 6 },
  doneBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  doneBadgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  itemInputRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  itemInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  itemSaveButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  itemSaveButtonDisabled: { opacity: 0.5 },
  itemSaveButtonText: { color: '#fff', fontWeight: '700' },
  itemError: { color: '#DC2626', fontSize: 12, marginTop: 6 },
  itemVariance: { color: '#B45309', fontSize: 12, marginTop: 6, fontWeight: '600' },
  submitButton: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
