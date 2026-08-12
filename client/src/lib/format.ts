/**
 * 📐 Formatação canônica de moeda e data do client.
 *
 * Antes deste arquivo existiam ~15 formatadores de moeda e ~20 de data
 * reimplementados por página — e eles **já tinham divergido de forma visível**:
 * Contabilidade/Tesouraria mostravam `R$ 1.234,56` enquanto Financeiro,
 * Logística, Compras, Vendas e RFQ mostravam `R$ 1234.56` (template com
 * `toFixed(2)`, sem separador de milhar e com ponto decimal). Registro:
 * L-1 em `docs/governance/auditorias/VARREDURA_DUPLA_2026-08-11.md`.
 *
 * Regras:
 * - Valor ausente/ilegível vira `'-'` — nunca `R$ 0,00`, que afirmaria um
 *   fato de negócio falso (mesma regra do OEE e da Sala de Comando).
 * - Formatação é para EXIBIÇÃO apenas. Payloads de escrita mandam o `string`
 *   original do input, sem passar por aqui, preservando a precisão DECIMAL
 *   do banco.
 * - Não reimplementar nada disto por página: importe daqui.
 */

/** DECIMAL string ou número → `R$ 1.234,56` (pt-BR). Ausente/NaN → `'-'`. */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '-';
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Data ISO (`YYYY-MM-DD` ou timestamp) → `dd/mm/aaaa` (pt-BR). Ausente/ilegível → `'-'`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

/** Timestamp ISO completo → `dd/mm/aaaa hh:mm` (pt-BR). Ausente/ilegível → `'-'`. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `Date`/string → `YYYY-MM-DD` (uso em `<input type="date">`/payload da API). */
export function toDateInputValue(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

/** `Date`/string → `YYYY-MM-DDTHH:mm` (uso em `<input type="datetime-local">`). */
export function toDateTimeInputValue(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 16);
}
