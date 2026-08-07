import { Badge } from '@/components/ui/badge';

/** Formata uma data ISO (`YYYY-MM-DD` ou timestamp) para `dd/mm/aaaa` (pt-BR). Retorna "-" se ausente/vazia. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

/** Formata um timestamp ISO completo (data + hora) para `dd/mm/aaaa hh:mm` (pt-BR). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Converte um valor `Date`/string em `YYYY-MM-DD` para uso em `<input type="date">`/payload da API. */
export function toDateInputValue(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

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
