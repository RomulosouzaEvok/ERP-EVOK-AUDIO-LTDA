import { Badge } from '@/components/ui/badge';

// Formatação canônica em `@/lib/format` (re-export preserva os consumidores).
export { formatDate, formatDateTime, toDateInputValue } from '@/lib/format';

/** Badge de status genérico de entrega EPI. */
export function EpiStatusBadge({ status }: { status: 'rascunho' | 'confirmada' }) {
  return status === 'confirmada' ? (
    <Badge variant="success">Confirmada</Badge>
  ) : (
    <Badge variant="warning">Rascunho</Badge>
  );
}

/** Badge de resultado de ASO. */
export function AsoResultadoBadge({ resultado }: { resultado: string }) {
  if (resultado === 'apto') return <Badge variant="success">Apto</Badge>;
  if (resultado === 'inapto') return <Badge variant="destructive">Inapto</Badge>;
  if (resultado === 'apto_com_restricoes') return <Badge variant="warning">Apto com restrições</Badge>;
  return <Badge variant="outline">{resultado}</Badge>;
}

/** Badge de gravidade de acidente. */
export function AccidentGravidadeBadge({ gravidade }: { gravidade: string }) {
  if (gravidade === 'sem_afastamento') return <Badge variant="secondary">Sem afastamento</Badge>;
  if (gravidade === 'com_afastamento') return <Badge variant="warning">Com afastamento</Badge>;
  if (gravidade === 'incapacidade_permanente') return <Badge variant="destructive">Incapacidade permanente</Badge>;
  if (gravidade === 'obito') return <Badge variant="destructive">Óbito</Badge>;
  return <Badge variant="outline">{gravidade}</Badge>;
}

/** Badge de status de evento eSocial. */
export function EsocialStatusBadge({ status }: { status: string }) {
  if (status === 'aceito') return <Badge variant="success">Aceito</Badge>;
  if (status === 'rejeitado') return <Badge variant="destructive">Rejeitado</Badge>;
  if (status === 'enviado') return <Badge variant="secondary">Enviado</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

/** Rótulos pt-BR de enums usados em múltiplas telas do módulo SST. */
export const EPI_MOTIVO_LABELS: Record<string, string> = {
  primeira_entrega: 'Primeira entrega',
  troca_periodica: 'Troca periódica',
  dano: 'Dano',
  perda: 'Perda',
  mudanca_funcao: 'Mudança de função',
};

export const ASO_TIPO_LABELS: Record<string, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno_trabalho: 'Retorno ao trabalho',
  mudanca_riscos: 'Mudança de riscos',
  demissional: 'Demissional',
};

export const ACCIDENT_TIPO_LABELS: Record<string, string> = {
  tipico: 'Típico',
  trajeto: 'Trajeto',
  doenca_ocupacional: 'Doença ocupacional',
};
