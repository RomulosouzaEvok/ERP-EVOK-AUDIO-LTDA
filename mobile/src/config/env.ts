/**
 * Configuração de ambiente do app mobile.
 *
 * `EXPO_PUBLIC_API_URL` é lida em build-time pelo Expo (variáveis com o
 * prefixo `EXPO_PUBLIC_` ficam disponíveis em `process.env` no bundle do
 * cliente — ver https://docs.expo.dev/guides/environment-variables/).
 *
 * Em desenvolvimento, configure em `mobile/.env` (copie de `.env.example`)
 * apontando para o IP da máquina que roda o backend na rede local —
 * "localhost" não funciona a partir de um dispositivo físico/emulador.
 */

const DEFAULT_API_URL = 'http://192.168.0.10:5000/api';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] EXPO_PUBLIC_API_URL não definida. Usando valor padrão de exemplo ' +
      `(${DEFAULT_API_URL}). Crie um arquivo mobile/.env com EXPO_PUBLIC_API_URL apontando ` +
      'para o IP da máquina que roda o backend.'
  );
}

/** URL base da API (sem barra final), ex.: `http://192.168.0.10:5000/api`. */
export const API_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
