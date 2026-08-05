import axios, { type AxiosError } from 'axios';

/**
 * Tradutor de erros de API para o Padrão de Alerta Didático de 3 Partes
 * (`docs/business/BUSINESS_RULES.md` §13, UC-43): O QUE / POR QUE / O QUE
 * FAZER. Aditivo em relação a `extractApiErrorMessage`
 * (`client/src/api/httpClient.ts`) — não o substitui nem quebra seu
 * contrato; este utilitário é o preferencial para telas retrofitadas pelo
 * UC-43, mas `extractApiErrorMessage` continua válido para os demais
 * pontos ainda não migrados.
 *
 * Diferente de `extractApiErrorMessage` (que descarta `error.details`),
 * este utilitário lê o contrato completo do backend
 * (`{ success: false, error: { code, message, details? } }`,
 * ver `server/src/errors/index.ts`) e:
 * - monta `reasons` com **todas** as pendências de `details` quando o
 *   backend retorna um array estruturado (Regra 3, §13.3) — nunca apenas a
 *   primeira;
 * - resolve `action` (rota de próximo passo) a partir de um mapa de
 *   `code`/`context` (Regra 2, §13.2);
 * - nunca expõe `code` cru nem stack trace ao usuário final (Regra 4,
 *   §13.4).
 */

/** Contexto de tela/ação que originou o erro — usado para resolver o `action` mais específico. */
export type ErrorContext =
  | 'release-production-order'
  | 'complete-production-order'
  | 'ship-sale'
  | 'convert-requisition'
  | 'approve-requisition'
  | 'receive-purchase'
  | 'register-lab-test'
  | 'convert-mrp-order'
  | 'release-lot'
  | 'create-engineering-sample'
  | 'treat-non-conformity';

/** Link de ação sugerido para o usuário resolver o pré-requisito pendente. */
export interface DidacticErrorAction {
  label: string;
  to: string;
}

/** Saída do tradutor — as 3 partes do padrão didático (§13.2). */
export interface DidacticError {
  /** O QUE — ação/documento não pôde ser processado. */
  title: string;
  /** POR QUE — uma ou mais razões concretas (nunca só a primeira, §13.3). */
  reasons: string[];
  /** O QUE FAZER — orientação de próximo passo, com link quando aplicável. */
  action?: DidacticErrorAction;
}

/** Formato de erro estruturado retornado pela API (ver `server/src/errors/AppError.ts`). */
interface StructuredApiError {
  code?: string;
  message: string;
  details?: unknown;
}

type ApiErrorShape = string | StructuredApiError;

interface ApiErrorResponseBody {
  success: false;
  error: ApiErrorShape;
}

const GENERIC_ACTION: DidacticErrorAction = {
  label: 'Corrigir e tentar novamente',
  to: '',
};

/**
 * Mapa "O QUE FAZER" por contexto de tela (Regra 2, §13.2) — cada contexto
 * aponta para a rota onde o pré-requisito pendente é resolvido. Casos
 * mapeados em `docs/business/01-USE_CASES.md` UC-43 (tabela de referência).
 */
const CONTEXT_ACTION_MAP: Record<ErrorContext, DidacticErrorAction> = {
  'release-production-order': {
    label: 'Ver disponibilidade em Compras → Requisições',
    to: '/purchases/requisitions',
  },
  'complete-production-order': {
    label: 'Concluir a etapa pendente no Chão de Fábrica',
    to: '/production/shop-floor',
  },
  'ship-sale': {
    label: 'Emitir a NF-e em Vendas',
    to: '/sales',
  },
  'convert-requisition': {
    label: 'Cadastrar fornecedor em Item → Fornecedores',
    to: '/purchases/requisitions',
  },
  'approve-requisition': {
    label: 'Ver requisições pendentes',
    to: '/purchases/requisitions',
  },
  'receive-purchase': {
    label: 'Informar a nota fiscal no recebimento',
    to: '/logistics/recebimento',
  },
  'register-lab-test': {
    label: 'Preencher resultado ou faixa de especificação',
    to: '/quality',
  },
  'convert-mrp-order': {
    label: 'Consultar status em Produção → MRP',
    to: '/production/mrp',
  },
  'release-lot': {
    label: 'Ver lotes em Qualidade',
    to: '/quality',
  },
  'create-engineering-sample': {
    label: 'Informe a justificativa da amostra',
    to: '',
  },
  'treat-non-conformity': {
    label: 'Ver não-conformidades em Qualidade',
    to: '/quality',
  },
};

/** Rótulos amigáveis (linguagem de fábrica) para chaves comuns de `details`, evitando termos técnicos crus. */
const DETAIL_KEY_PREFIX: Record<string, string> = {
  item_ids_without_supplier: 'Item sem fornecedor definido (código interno)',
  missing_product_codes: 'Produto ainda não cadastrado para o código',
  missing_prerequisites: 'Pendência',
  invalid_ids: 'Registro em status inválido',
};

function isStructuredError(error: ApiErrorShape): error is StructuredApiError {
  return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * Extrai a lista de motivos (`reasons`) a partir de `details`, cobrindo os
 * formatos hoje usados pelo backend: array direto, ou objeto cujos valores
 * são arrays (ex.: `{ item_ids_without_supplier: [12, 34] }`). Nunca
 * retorna apenas o primeiro item (Regra 3, §13.3).
 */
function extractReasonsFromDetails(details: unknown): string[] {
  if (details == null) return [];

  if (Array.isArray(details)) {
    return details.map((entry) => stringifyDetailEntry(entry));
  }

  if (typeof details === 'object') {
    const reasons: string[] = [];
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      const label = DETAIL_KEY_PREFIX[key];
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        const items = value.map((entry) => stringifyDetailEntry(entry)).join(', ');
        reasons.push(label ? `${label}: ${items}` : `${key}: ${items}`);
      } else if (value !== undefined && value !== null && value !== '') {
        reasons.push(label ? `${label}: ${String(value)}` : `${key}: ${String(value)}`);
      }
    }
    return reasons;
  }

  return [String(details)];
}

function stringifyDetailEntry(entry: unknown): string {
  if (entry == null) return '';
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
  if (typeof entry === 'object') {
    // Tenta campos comuns de identificação (código/nome) antes de serializar cru.
    const record = entry as Record<string, unknown>;
    const candidate = record.codigo ?? record.code ?? record.name ?? record.label ?? record.id;
    if (candidate !== undefined) return String(candidate);
    return JSON.stringify(entry);
  }
  return String(entry);
}

/**
 * Traduz um erro (tipicamente vindo de uma mutation Axios) para o formato
 * didático de 3 partes. Aceita um `context` opcional para resolver o link
 * de ação mais específico (Regra 2); sem contexto, cai no fallback
 * genérico (nunca deixa de exibir orientação, Regra 4/§13.4 fluxo
 * alternativo).
 *
 * @param error - erro capturado (ex.: `onError` de `useMutation`).
 * @param title - título O QUE (ação + documento), definido pela tela que já
 *   sabe qual ação/documento estava em curso — não é derivável do erro.
 * @param context - contexto de tela usado para resolver a ação sugerida.
 * @param fallbackReason - motivo de fallback quando não há `message`/`details` (erro de rede, etc.).
 */
export function translateApiError(
  error: unknown,
  title: string,
  context?: ErrorContext,
  fallbackReason = 'Não foi possível concluir a operação. Verifique sua conexão e tente novamente.',
): DidacticError {
  const action = context ? CONTEXT_ACTION_MAP[context] : undefined;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponseBody>;
    const body = axiosError.response?.data;

    if (body?.error) {
      if (typeof body.error === 'string') {
        return { title, reasons: [body.error], action };
      }

      if (isStructuredError(body.error)) {
        const detailReasons = extractReasonsFromDetails(body.error.details);
        const reasons = detailReasons.length > 0 ? detailReasons : [body.error.message || fallbackReason];
        return { title, reasons, action: action ?? GENERIC_ACTION };
      }
    }

    if (axiosError.message) {
      return { title, reasons: [axiosError.message], action: action ?? GENERIC_ACTION };
    }
  }

  if (error instanceof Error && error.message) {
    return { title, reasons: [error.message], action: action ?? GENERIC_ACTION };
  }

  return { title, reasons: [fallbackReason], action: action ?? GENERIC_ACTION };
}
