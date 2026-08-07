/**
 * Constantes de negócio do módulo Marketing (BLOCO 5 MKT, correção) que
 * ficaram `[DEFINIR COM COORDENADOR]` no documento de requisitos
 * (`docs/business/BLOCO_5_MKT_REQUISITOS.md` §5.2) com valor de partida
 * sugerido — mantidas como constante de código única (não hard-code
 * espalhado pelos use cases), conforme decisão registrada em
 * `docs/business/BLOCO_5_MKT_API.md` §10.2. Ajuste sem deploy fica para uma
 * correção futura (endpoint de configuração dedicado), fora do escopo
 * desta rodada.
 *
 * @module modules/marketing/domain/constants
 */

/** Janela de atribuição de receita (RF-MKT-010): dias após a conversão do lead em que uma venda ainda conta como atribuída à campanha/evento. */
export const REVENUE_ATTRIBUTION_WINDOW_DAYS = 90;

/** SLA de handoff Marketing → Vendas (RF-MKT-014), em dias corridos (o requisito sugere "dias úteis"; simplificado para dias corridos nesta rodada — sem calendário de feriados/dias úteis disponível no projeto). */
export const HANDOFF_SLA_DAYS = 2;

/** Threshold de alerta de orçamento de campanha (RF-MKT-032/033): 90% e 100% de `actual_cost ÷ budget_approved`. */
export const BUDGET_ALERT_WARNING_THRESHOLD = 0.9;
export const BUDGET_ALERT_OVER_THRESHOLD = 1.0;

/** Status de venda considerados receita atribuída real (RF-MKT-008) — nunca `canceled`. */
export const ATTRIBUTED_REVENUE_SALE_STATUSES = ['invoiced', 'shipped'] as const;
