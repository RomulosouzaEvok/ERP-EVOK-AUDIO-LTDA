import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';

/**
 * Rota raiz (`/`): decide para onde navegar com base na sessão salva.
 * Enquanto o SecureStore ainda está sendo lido, mostra um loading simples.
 */
export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(app)/home' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
