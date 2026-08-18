import fs from 'fs';
import dotenv from 'dotenv';
import { z } from 'zod';

import {
  resolveTrackingEnforcementMode,
  type TrackingEnforcementMode,
} from '../modules/production/domain/productionTrackingRules';

dotenv.config();

export const ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME|dev-only-change-me)/i;
const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}, z.boolean());

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default('erp_evok_audio'),
  DB_USER: z.string().min(1).default('evok_admin'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: booleanFromEnv.default(false),
  DB_SSL_CA_PATH: z.string().optional(),
  DB_SSL_CA_BASE64: z.string().optional(),
  DB_LOGGING: booleanFromEnv.default(false),
  DB_FORCE_SYNC: booleanFromEnv.default(false),
  DB_AUTO_ALTER: booleanFromEnv.default(false),
  DB_ALLOW_UNSAFE_ALTER: booleanFromEnv.default(false),
  ALLOW_LOCAL_DB_NO_SSL: booleanFromEnv.default(false),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRE: z.string().default('7d'),
  CORS_ORIGIN: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
  // Numero de saltos de proxy reverso confiaveis na frente do Node (ex.: 1
  // para nginx/load balancer direto na frente da API). Controla
  // `app.set('trust proxy', N)` — sem isso, express-rate-limit usa sempre
  // o IP do socket TCP imediato (o proxy), contando TODAS as requisicoes
  // de TODOS os usuarios como um unico IP e esgotando o rate limit de
  // login para todo mundo assim que houver qualquer proxy em producao.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Caminho opcional de arquivo para o transporte de arquivo do Winston
  // (`src/config/logger.ts`). Quando ausente (default), o logger usa apenas
  // console — comportamento historico do projeto, sem quebrar ambientes sem
  // volume de disco persistente para logs (ex.: containers efemeros).
  LOG_FILE: z.string().optional(),
  // Modo de vigência do apontamento de produção obrigatório (G4) e do gate
  // de partida da OP (G6): `block` (padrão, a lei aplicada) ou `warn`
  // (janela de transição, para UAT com roteiros ainda não cadastrados).
  // Lido cru — a normalização e o default moram em
  // `modules/production/domain/productionTrackingRules`, que é a fonte da
  // regra. Ver a validação de produção no `superRefine` abaixo.
  PRODUCTION_TRACKING_REQUIRED: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  // G4/G6 — `warn` desliga, de uma vez, o apontamento obrigatório na
  // conclusão da OP e o gate de partida: as duas regras que sustentam o
  // Bloco K / Livro modelo 3 e o custo de mão-de-obra real. A janela de
  // transição é legítima em desenvolvimento/homologação; em produção ela é
  // uma obrigação fiscal desligada.
  //
  // A auditoria de 2026-08-11 encontrou a variável sem nenhuma declaração no
  // repositório (nem `.env.example`, nem docker-compose, nem script de
  // boot): só o código a lia. Uma linha esquecida num `.env` de produção
  // depois do UAT desligaria as duas regras **em silêncio**. Falhar o boot é
  // ruidoso e imediato — o oposto de uma regra fiscal que simplesmente para
  // de valer.
  //
  // Valor INVÁLIDO (typo) não reprova aqui de propósito: ele resolve para
  // `block` na leitura do modo (com log `G4-TRACKING-MODE-INVALID`), ou
  // seja, não desliga nada. Derrubar produção por causa dele seria punir o
  // lado seguro.
  if (resolveTrackingEnforcementMode(env.PRODUCTION_TRACKING_REQUIRED).mode === 'warn') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PRODUCTION_TRACKING_REQUIRED'],
      message: 'PRODUCTION_TRACKING_REQUIRED=warn e proibido em producao: desliga o apontamento obrigatorio (G4) '
        + 'e o gate de partida da OP (G6), exigidos pelo Bloco K / Livro modelo 3. Use "block" (ou remova a variavel).',
    });
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || ENV_PLACEHOLDER_PATTERN.test(env.JWT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET deve ter ao menos 32 caracteres e nao pode usar placeholder em producao.',
    });
  }

  if (!env.CORS_ORIGIN || env.CORS_ORIGIN.includes('localhost')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN deve ser definido com origem real em producao.',
    });
  }

  if (!env.DB_PASSWORD || ENV_PLACEHOLDER_PATTERN.test(env.DB_PASSWORD)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DB_PASSWORD'],
      message: 'DB_PASSWORD deve ser definido com valor real em producao.',
    });
  }

  if (!env.ADMIN_SEED_PASSWORD || env.ADMIN_SEED_PASSWORD.length < 8 || ENV_PLACEHOLDER_PATTERN.test(env.ADMIN_SEED_PASSWORD)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ADMIN_SEED_PASSWORD'],
      message: 'ADMIN_SEED_PASSWORD deve ser definido com valor forte em producao.',
    });
  }

  if (!env.DB_SSL && !env.ALLOW_LOCAL_DB_NO_SSL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DB_SSL'],
      message: 'DB_SSL=true e obrigatorio em producao.',
    });
  }

  if (env.DB_FORCE_SYNC) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DB_FORCE_SYNC'],
      message: 'DB_FORCE_SYNC=true e proibido em producao.',
    });
  }

  if (env.DB_AUTO_ALTER) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DB_AUTO_ALTER'],
      message: 'DB_AUTO_ALTER=true e proibido em producao.',
    });
  }

  if (env.DB_ALLOW_UNSAFE_ALTER) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DB_ALLOW_UNSAFE_ALTER'],
      message: 'DB_ALLOW_UNSAFE_ALTER=true e proibido em producao.',
    });
  }
});

export type RuntimeEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbSsl: boolean;
  dbSslCaPath?: string;
  dbSslCaBase64?: string;
  dbLogging: boolean;
  dbForceSync: boolean;
  dbAutoAlter: boolean;
  dbAllowUnsafeAlter: boolean;
  allowLocalDbNoSsl: boolean;
  jwtSecret?: string;
  jwtExpire: string;
  corsOrigin: string;
  adminSeedPassword?: string;
  trustProxy: number;
  logFile?: string;
  /**
   * Modo de vigência do apontamento obrigatório (G4) e do gate de partida
   * (G6), já normalizado. Em produção só pode ser `block` — ver o
   * `superRefine` do schema.
   */
  productionTrackingRequired: TrackingEnforcementMode;
};

let cachedRuntimeEnv: RuntimeEnv | null = null;

function normalizeRuntimeEnv(parsedEnv: z.infer<typeof runtimeEnvSchema>): RuntimeEnv {
  return {
    nodeEnv: parsedEnv.NODE_ENV,
    port: parsedEnv.PORT,
    dbHost: parsedEnv.DB_HOST,
    dbPort: parsedEnv.DB_PORT,
    dbName: parsedEnv.DB_NAME,
    dbUser: parsedEnv.DB_USER,
    dbPassword: parsedEnv.DB_PASSWORD,
    dbSsl: parsedEnv.DB_SSL,
    dbSslCaPath: parsedEnv.DB_SSL_CA_PATH,
    dbSslCaBase64: parsedEnv.DB_SSL_CA_BASE64,
    dbLogging: parsedEnv.DB_LOGGING,
    dbForceSync: parsedEnv.DB_FORCE_SYNC,
    dbAutoAlter: parsedEnv.DB_AUTO_ALTER,
    dbAllowUnsafeAlter: parsedEnv.DB_ALLOW_UNSAFE_ALTER,
    allowLocalDbNoSsl: parsedEnv.ALLOW_LOCAL_DB_NO_SSL,
    jwtSecret: parsedEnv.JWT_SECRET,
    jwtExpire: parsedEnv.JWT_EXPIRE,
    corsOrigin: parsedEnv.CORS_ORIGIN || 'http://localhost:5173',
    adminSeedPassword: parsedEnv.ADMIN_SEED_PASSWORD,
    trustProxy: parsedEnv.TRUST_PROXY,
    logFile: parsedEnv.LOG_FILE,
    productionTrackingRequired: resolveTrackingEnforcementMode(parsedEnv.PRODUCTION_TRACKING_REQUIRED).mode,
  };
}

export function loadRuntimeEnv(): RuntimeEnv {
  if (cachedRuntimeEnv) {
    return cachedRuntimeEnv;
  }

  const parsed = runtimeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ');
    throw new Error(`Configuracao de ambiente invalida: ${message}`);
  }

  cachedRuntimeEnv = normalizeRuntimeEnv(parsed.data);
  return cachedRuntimeEnv;
}

export const JWT_ISSUER = 'erp-evok-audio';
export const JWT_AUDIENCE = 'erp-evok-audio-api';

export function getJwtRuntimeConfig(): { secret: string; expiresIn: string } {
  const runtimeEnv = loadRuntimeEnv();

  if (!runtimeEnv.jwtSecret || runtimeEnv.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET nao configurado ou muito curto. Configure ao menos 32 caracteres.');
  }

  return {
    secret: runtimeEnv.jwtSecret,
    expiresIn: runtimeEnv.jwtExpire,
  };
}

export function clearRuntimeEnvCache(): void {
  cachedRuntimeEnv = null;
}

export function readPostgresSslOptions(runtimeEnv: RuntimeEnv): { require: true; rejectUnauthorized: true; ca?: string } {
  const sslOptions: { require: true; rejectUnauthorized: true; ca?: string } = {
    require: true,
    rejectUnauthorized: true,
  };

  if (runtimeEnv.dbSslCaPath) {
    sslOptions.ca = fs.readFileSync(runtimeEnv.dbSslCaPath, 'utf8');
  } else if (runtimeEnv.dbSslCaBase64) {
    sslOptions.ca = Buffer.from(runtimeEnv.dbSslCaBase64, 'base64').toString('utf8');
  }

  return sslOptions;
}
