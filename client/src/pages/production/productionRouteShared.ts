import axios from 'axios';

import type { ProductionRouteStatus } from '@/api/productionRoutes';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';

/**
 * Rótulos e tradução de erro do Roteiro de Produção (gap G5), compartilhados
 * entre `ProductionRoutesPage.tsx` e `RouteStepsEditor.tsx`.
 *
 * O backend devolve códigos estáveis em `error.details.rule` (`G5-SEQ-GAP`,
 * `G5-ROUTE-NOT-DRAFT`, ...). O tradutor genérico (`translateApiError`)
 * despejaria esses códigos crus na tela porque `details` é um objeto — este
 * módulo intercepta os 12 códigos do módulo e escreve cada um em linguagem de
 * chão de fábrica, no Padrão Didático de 3 partes (O QUE / POR QUE / O QUE
 * FAZER).
 */

export const ROUTE_STATUS_LABEL: Record<ProductionRouteStatus, string> = {
  draft: 'Rascunho',
  active: 'Liberado',
  inactive: 'Aposentado',
  superseded: 'Substituído',
};

export const ROUTE_STATUS_VARIANT: Record<ProductionRouteStatus, 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'secondary',
  active: 'success',
  inactive: 'warning',
  superseded: 'outline',
};

/** Uma frase explicando o que o operador pode (e não pode) fazer em cada status. */
export const ROUTE_STATUS_HELP: Record<ProductionRouteStatus, string> = {
  draft: 'Em rascunho você edita à vontade: cabeçalho, etapas, ordem das operações. A fábrica ainda não executa este roteiro.',
  active:
    'Liberado é o roteiro que a fábrica executa hoje — e ele é congelado: não aceita nenhuma alteração. Para mudar o processo, crie uma nova revisão.',
  inactive:
    'Aposentado: o produto ficou sem roteiro liberado. Ele pode voltar a valer (liberar de novo) ou servir de base para uma nova revisão.',
  superseded:
    'Substituído por uma revisão mais nova. Fica guardado com as etapas intactas para sustentar os apontamentos já feitos — não volta a valer nem pode ser alterado.',
};

/** Tipos de produto do cadastro legado, em linguagem de negócio. */
export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  finished: 'produto acabado',
  semi_finished: 'subconjunto',
  component: 'componente',
  raw_material: 'matéria-prima',
};

/** Tipos que admitem roteiro de fabricação (espelha `PRODUCIBLE_PRODUCT_TYPES` do backend). */
export const PRODUCIBLE_PRODUCT_TYPES = ['finished', 'semi_finished'];

export function productTypeLabel(type: string | null | undefined): string {
  if (!type) return 'sem tipo definido';
  return PRODUCT_TYPE_LABEL[type] ?? type;
}

export function routeStatusLabel(status: string): string {
  return ROUTE_STATUS_LABEL[status as ProductionRouteStatus] ?? status;
}

/** Converte DECIMAL (que pode chegar como string) em número seguro. */
export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Minutos com no máximo 2 casas, em formato pt-BR (`4,5 min`). */
export function formatMinutes(value: number | string | null | undefined): string {
  return `${toNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} min`;
}

/** Recorte de `error.details` usado pelas regras `G5-*`. */
interface RouteErrorDetails {
  rule?: string;
  status?: string;
  current?: string;
  next?: string;
  allowed?: string[];
  route_code?: string;
  revision?: string;
  used_revisions?: string[];
  product_status?: string;
  product_type?: string;
  duplicated?: Array<string | number>;
  expected?: number[];
  received?: number[];
  work_center_ids?: number[];
  tracking_count?: number;
}

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function readDetails(error: unknown): RouteErrorDetails | null {
  if (!axios.isAxiosError(error)) return null;

  const body = error.response?.data as { error?: unknown } | undefined;
  const apiError = body?.error;
  if (!apiError || typeof apiError !== 'object') return null;

  const details = (apiError as { details?: unknown }).details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;

  const record = details as Record<string, unknown>;
  if (typeof record.rule !== 'string' || !record.rule.startsWith('G5-')) return null;

  return {
    rule: record.rule,
    status: typeof record.status === 'string' ? record.status : undefined,
    current: typeof record.current === 'string' ? record.current : undefined,
    next: typeof record.next === 'string' ? record.next : undefined,
    allowed: asArray<string>(record.allowed),
    route_code: typeof record.route_code === 'string' ? record.route_code : undefined,
    revision: typeof record.revision === 'string' ? record.revision : undefined,
    used_revisions: asArray<string>(record.used_revisions),
    product_status: typeof record.product_status === 'string' ? record.product_status : undefined,
    product_type: typeof record.product_type === 'string' ? record.product_type : undefined,
    duplicated: asArray<string | number>(record.duplicated),
    expected: asArray<number>(record.expected),
    received: asArray<number>(record.received),
    work_center_ids: asArray<number>(record.work_center_ids),
    tracking_count: typeof record.tracking_count === 'number' ? record.tracking_count : undefined,
  };
}

/** Código de negação de acesso (`error.code`) do middleware `authorizeModule`. */
function readAccessCode(error: unknown): string | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return null;

  const body = error.response?.data as { error?: unknown } | undefined;
  const apiError = body?.error;
  if (apiError && typeof apiError === 'object' && typeof (apiError as { code?: unknown }).code === 'string') {
    return (apiError as { code: string }).code;
  }
  return 'MODULE_ACCESS_DENIED';
}

/** Monta as 3 partes a partir de uma regra `G5-*`. */
function reasonsForRule(details: RouteErrorDetails): { reasons: string[]; action: string } | null {
  switch (details.rule) {
    case 'G5-ROUTE-NOT-DRAFT':
      return {
        reasons: [
          `Este roteiro está ${routeStatusLabel(details.status ?? '').toLowerCase() || 'fora de rascunho'} e roteiro liberado é congelado: nem o cabeçalho nem as etapas podem mudar.`,
          'É essa regra que garante que as ordens de produção já abertas e os apontamentos já feitos continuem batendo com o roteiro que a fábrica executou.',
        ],
        action: 'Use o botão "Criar nova revisão": o sistema copia tudo para um rascunho novo, você altera e libera.',
      };

    case 'G5-ROUTE-STATUS-TRANSITION': {
      const from = routeStatusLabel(details.current ?? '');
      const to = routeStatusLabel(details.next ?? '');
      const allowed = (details.allowed ?? []).map(routeStatusLabel);
      return {
        reasons: [
          `Um roteiro em "${from}" não pode passar para "${to}".`,
          allowed.length > 0
            ? `A partir de "${from}" só é possível ir para: ${allowed.join(', ')}.`
            : `"${from}" é situação final: este roteiro fica guardado apenas como histórico.`,
        ],
        action: 'Crie uma nova revisão a partir deste roteiro e libere a revisão nova.',
      };
    }

    case 'G5-ROUTE-CODE-DUP':
      return {
        reasons: [
          `Já existe outro roteiro com o código ${details.route_code ?? 'informado'}. O código do roteiro é único em toda a fábrica.`,
        ],
        action: 'Troque o código do roteiro (ex.: acrescente o modelo ou a revisão) e salve de novo.',
      };

    case 'G5-REVISION-DUP':
      return {
        reasons: [
          `Este produto já tem um roteiro na revisão ${details.revision ?? 'informada'}.`,
          details.used_revisions?.length
            ? `Revisões já usadas neste produto: ${details.used_revisions.join(', ')}.`
            : 'Cada revisão só pode existir uma vez por produto.',
        ],
        action: 'Informe uma revisão ainda não usada (ou deixe em branco para o sistema sugerir a próxima).',
      };

    case 'G5-PRODUCT-NOT-PRODUCIBLE':
      return {
        reasons: [
          details.product_status && details.product_status !== 'active'
            ? 'O produto escolhido está inativo no cadastro e por isso não pode receber roteiro.'
            : `Roteiro de fabricação só existe para produto acabado ou subconjunto — o produto escolhido é ${productTypeLabel(details.product_type)}.`,
        ],
        action: 'Escolha um produto acabado ou subconjunto ativo, ou ajuste o cadastro do produto antes.',
      };

    case 'G5-SEQ-EMPTY':
      return {
        reasons: ['O roteiro não tem nenhuma operação cadastrada, e um roteiro sem etapa não tem o que a fábrica apontar.'],
        action: 'Adicione as operações na aba de etapas, salve e libere de novo.',
      };

    case 'G5-SEQ-DUP':
      return {
        reasons: [
          `Há mais de uma operação ocupando a mesma posição (${(details.duplicated ?? []).join(', ')}) na sequência.`,
        ],
        action: 'Reordene as operações com as setas ↑ ↓ e salve novamente — a numeração é refeita sozinha.',
      };

    case 'G5-SEQ-GAP':
      return {
        reasons: [
          'A ordem das operações ficou com buraco: as etapas precisam ser 1, 2, 3... sem pular número.',
          'É por essa numeração que o apontamento do operador casa com a operação do roteiro — sem ela, não há como saber em que etapa a peça está.',
        ],
        action: 'Reordene com as setas ↑ ↓ e salve novamente — a tela renumera as etapas automaticamente.',
      };

    case 'G5-STEP-CODE-DUP':
      return {
        reasons: [
          `O código de operação ${(details.duplicated ?? []).join(', ')} está repetido neste roteiro.`,
          'Cada operação precisa de um código próprio (é ele que o chão de fábrica lê na ordem, ex.: 10, 20, 30).',
        ],
        action: 'Troque o código de uma das operações repetidas e salve de novo.',
      };

    case 'G5-WC-NOT-FOUND':
      return {
        reasons: [
          'Uma das operações aponta para um centro de trabalho que não existe mais no cadastro.',
        ],
        action: 'Reabra a etapa, escolha um centro de trabalho válido (ou deixe sem centro) e salve.',
      };

    case 'G5-WC-INACTIVE':
      return {
        reasons: [
          'Uma das operações aponta para um centro de trabalho que foi desativado no cadastro.',
          'O sistema confere os centros de novo na liberação, de propósito: um centro pode ser desativado depois que o rascunho foi montado, e roteiro liberado apontando para centro desativado zera o custo de mão de obra sem avisar ninguém.',
        ],
        action: 'Reative o centro em Produção → Centros de Trabalho, ou troque o centro da operação no rascunho.',
      };

    case 'G5-ROUTE-IN-USE':
      return {
        reasons: [
          details.tracking_count
            ? `Este roteiro já tem ${details.tracking_count} apontamento(s) de produção vinculado(s) às suas operações.`
            : 'Este roteiro já tem apontamento de produção vinculado às suas operações.',
          'Apagar as etapas apagaria o vínculo do apontamento com a operação — e com ele o custo de mão de obra daquela ordem de produção.',
        ],
        action: 'Crie uma nova revisão para mudar o processo: o roteiro apontado fica guardado como histórico.',
      };

    default:
      return null;
  }
}

/**
 * Traduz erros da tela de Roteiro de Produção. Intercepta as regras `G5-*` e
 * as negações de acesso do `authorizeModule`; qualquer outro erro segue pelo
 * tradutor genérico.
 *
 * @param error - Erro capturado no `onError` da mutation.
 * @param title - O QUE: ação que não pôde ser concluída (ex.: "Não foi possível liberar o roteiro ROT-ALT15").
 */
export function translateProductionRouteError(error: unknown, title: string): DidacticError {
  const accessCode = readAccessCode(error);
  if (accessCode) {
    if (accessCode === 'APPROVAL_LEVEL_REQUIRED') {
      return {
        title,
        reasons: [
          'Liberar e aposentar roteiro são atos de aprovação, não de digitação: o sistema grava quem liberou e quando, porque é esse roteiro que passa a definir o custo de mão de obra da fábrica.',
          'Seu perfil de acesso permite montar e revisar o rascunho, mas não liberar.',
        ],
        action: { label: 'Peça à gerência de produção para liberar este roteiro.', to: '' },
      };
    }
    if (accessCode === 'NO_ACCESS_PROFILE') {
      return {
        title,
        reasons: ['Seu usuário ainda não tem perfil de acesso configurado.'],
        action: { label: 'Procure o administrador do sistema.', to: '' },
      };
    }
    return {
      title,
      reasons: ['Seu perfil de acesso não contempla o cadastro de roteiros de produção.'],
      action: { label: 'Procure o administrador do sistema para solicitar acesso.', to: '' },
    };
  }

  const details = readDetails(error);
  if (!details) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      return {
        title,
        reasons: [
          'Algum campo ficou fora do formato aceito (código com mais caracteres do que o permitido, tempo negativo ou campo obrigatório em branco).',
        ],
        action: { label: 'Revise os campos destacados e salve novamente.', to: '' },
      };
    }
    return translateApiError(error, title);
  }

  const translated = reasonsForRule(details);
  if (!translated) return translateApiError(error, title);

  return {
    title,
    reasons: translated.reasons,
    action: { label: translated.action, to: '' },
  };
}
