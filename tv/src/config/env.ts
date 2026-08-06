/**
 * Configuração de ambiente do app de TV (Android TV / Fire TV).
 *
 * `EXPO_PUBLIC_API_URL` é lida em build-time pelo Expo (variáveis com o
 * prefixo `EXPO_PUBLIC_` ficam disponíveis em `process.env` no bundle do
 * cliente — ver https://docs.expo.dev/guides/environment-variables/).
 *
 * Assim como no app mobile (`mobile/src/config/env.ts`), a TV/box roda em um
 * aparelho físico separado na rede local — configure `tv/.env` (copie de
 * `.env.example`) com o IP da máquina que roda o backend. "localhost" não
 * funciona a partir do dispositivo.
 */

const DEFAULT_API_URL = 'http://192.168.0.10:5000/api';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!rawApiUrl && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] EXPO_PUBLIC_API_URL não definida. Usando valor padrão de exemplo ' +
      `(${DEFAULT_API_URL}). Crie um arquivo tv/.env com EXPO_PUBLIC_API_URL apontando ` +
      'para o IP da máquina que roda o backend na rede local.'
  );
}

/** URL base da API (sem barra final), ex.: `http://192.168.0.10:5000/api`. */
export const API_URL = (rawApiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

/** Intervalo de auto-refresh do painel (ms). Painel "vivo", sem interação humana esperada. */
export const DASHBOARD_REFRESH_INTERVAL_MS = 60_000;
