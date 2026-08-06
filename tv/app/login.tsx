/**
 * Tela de login do painel de TV — adaptação de `mobile/app/login.tsx` para
 * "10-foot UI": campos e botão grandes, navegáveis por D-pad, sem teclado
 * na tela (usa o teclado virtual do próprio Android TV ao focar o
 * `TextInput`). Usada apenas UMA vez por aparelho: após o primeiro login a
 * sessão fica salva (ver `AuthContext`) e o painel abre direto em
 * `/(app)/dashboard` nas próximas vezes que a TV ligar.
 */

import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';

import { ApiError } from '../src/api/client';
import FocusablePressable from '../src/components/FocusablePressable';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading: sessionLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sessão já restaurada do SecureStore: pula a tela de login.
  if (!sessionLoading && isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Informe e-mail e senha.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrorMessage('E-mail ou senha incorretos.');
        } else if (error.status === 429) {
          setErrorMessage('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Erro inesperado ao tentar entrar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../assets/brand/evok-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Painel de Demandas — Evok Áudio</Text>
        <Text style={styles.subtitle}>Faça login uma vez neste aparelho para deixar o painel sempre visível.</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="usuario@evokaudio.com"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
          hasTVPreferredFocus
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
          onSubmitEditing={handleSubmit}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <FocusablePressable onPress={handleSubmit} disabled={submitting} style={styles.button}>
          {submitting ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </FocusablePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  card: {
    width: 640,
    maxWidth: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 48,
  },
  logo: {
    width: 220,
    height: 110,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 20,
    color: '#F8FAFC',
    backgroundColor: '#0F172A',
  },
  error: {
    color: '#F87171',
    fontSize: 15,
    marginTop: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
});
