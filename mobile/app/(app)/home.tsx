import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { scanItem } from '../../src/api/mobileInventory';
import { ApiError } from '../../src/api/client';
import type { MovementType, ScanItemResponseData } from '../../src/api/types';
import { useAuth } from '../../src/context/AuthContext';
import QrScannerModal from '../../src/components/QrScannerModal';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const [productCode, setProductCode] = useState('');
  const [warehouseCode, setWarehouseCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<MovementType>('in');
  const [description, setDescription] = useState('');

  const [scannerVisible, setScannerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanItemResponseData | null>(null);

  const handleScanned = useCallback((code: string) => {
    setProductCode(code);
    setScannerVisible(false);
    setErrorMessage(null);
    setLastResult(null);
  }, []);

  function resetForm() {
    setProductCode('');
    setQuantity('');
    setDescription('');
  }

  async function handleSubmit() {
    setErrorMessage(null);

    const trimmedCode = productCode.trim();
    const trimmedWarehouseCode = warehouseCode.trim().toUpperCase();
    const parsedQuantity = Number(quantity);

    if (!trimmedCode) {
      setErrorMessage('Escaneie ou digite o código do produto.');
      return;
    }
    if (!trimmedWarehouseCode) {
      setErrorMessage('Informe o codigo do deposito.');
      return;
    }
    if (!quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage('Informe uma quantidade válida (maior que zero).');
      return;
    }

    setSubmitting(true);
    try {
      const result = await scanItem({
        product_code: trimmedCode,
        quantity: parsedQuantity,
        type,
        warehouse_code: trimmedWarehouseCode,
        description: description.trim() || undefined,
      });
      setLastResult(result);
      resetForm();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          setErrorMessage('Produto não encontrado para o código informado.');
        } else if (error.status === 403) {
          setErrorMessage('Seu perfil não tem permissão para movimentar estoque. Fale com o administrador.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Erro inesperado ao registrar a movimentação. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] ?? 'operador'}</Text>
            <Text style={styles.greetingSub}>{user?.email}</Text>
          </View>
          <Pressable onPress={handleLogout} hitSlop={12}>
            <Text style={styles.logout}>Sair</Text>
          </Pressable>
        </View>

        {lastResult ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Movimentação registrada</Text>
            <Text style={styles.successLine}>
              {lastResult.product.name} ({lastResult.product.code})
            </Text>
            <Text style={styles.successLine}>Novo saldo em estoque: {lastResult.new_quantity}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Código do produto</Text>
        <View style={styles.codeRow}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="Escaneie ou digite o código"
            placeholderTextColor="#94A3B8"
            value={productCode}
            onChangeText={setProductCode}
            autoCapitalize="characters"
            editable={!submitting}
          />
          <Pressable
            style={styles.scanButton}
            onPress={() => setScannerVisible(true)}
            disabled={submitting}
          >
            <Text style={styles.scanButtonText}>Escanear</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Deposito</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: INSUMOS"
          placeholderTextColor="#94A3B8"
          value={warehouseCode}
          onChangeText={setWarehouseCode}
          autoCapitalize="characters"
          editable={!submitting}
        />

        <Text style={styles.label}>Quantidade</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          value={quantity}
          onChangeText={setQuantity}
          editable={!submitting}
        />

        <Text style={styles.label}>Tipo de movimentação</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeButton, type === 'in' && styles.typeButtonActiveIn]}
            onPress={() => setType('in')}
            disabled={submitting}
          >
            <Text style={[styles.typeButtonText, type === 'in' && styles.typeButtonTextActive]}>
              Entrada
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeButton, type === 'out' && styles.typeButtonActiveOut]}
            onPress={() => setType('out')}
            disabled={submitting}
          >
            <Text style={[styles.typeButtonText, type === 'out' && styles.typeButtonTextActive]}>
              Saída
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: recebimento NF 12345"
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
          editable={!submitting}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.submitButtonPressed]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Registrar movimentação</Text>
          )}
        </Pressable>

        <Pressable style={styles.historyLink} onPress={() => router.push('/(app)/history')}>
          <Text style={styles.historyLinkText}>Ver histórico de movimentações</Text>
        </Pressable>

        <Pressable style={styles.countsCard} onPress={() => router.push('/(app)/counts')}>
          <Text style={styles.countsCardTitle}>Contagem de Inventário</Text>
          <Text style={styles.countsCardSubtitle}>
            Veja suas contagens atribuídas e as disponíveis no pool para pegar
          </Text>
        </Pressable>
      </ScrollView>

      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  greetingSub: { fontSize: 13, color: '#64748B' },
  logout: { color: '#DC2626', fontWeight: '700' },
  successCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successTitle: { fontWeight: '700', color: '#166534', marginBottom: 4 },
  successLine: { color: '#166534', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeInput: { flex: 1 },
  scanButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
  },
  scanButtonText: { color: '#fff', fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeButtonActiveIn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  typeButtonActiveOut: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  typeButtonText: { fontWeight: '700', color: '#334155' },
  typeButtonTextActive: { color: '#fff' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 16, textAlign: 'center' },
  submitButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  submitButtonPressed: { opacity: 0.8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyLink: { marginTop: 18, alignItems: 'center' },
  historyLinkText: { color: '#0F172A', fontWeight: '700', textDecorationLine: 'underline' },
  countsCard: {
    marginTop: 24,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
  },
  countsCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  countsCardSubtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
});
