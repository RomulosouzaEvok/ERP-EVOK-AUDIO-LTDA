import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/context/AuthContext';

/**
 * Layout do grupo de rotas autenticadas. Redireciona para `/login` se não
 * houver sessão válida (ex.: token expirado tratado pelo handler global de
 * 401 em `src/api/client.ts`, que limpa o usuário do contexto).
 */
export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="home" options={{ title: 'Inventário Mobile' }} />
      <Stack.Screen name="history" options={{ title: 'Histórico de Movimentações' }} />
      <Stack.Screen name="counts/index" options={{ title: 'Contagens de Inventário' }} />
      <Stack.Screen name="counts/[id]" options={{ title: 'Contagem de Inventário' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
