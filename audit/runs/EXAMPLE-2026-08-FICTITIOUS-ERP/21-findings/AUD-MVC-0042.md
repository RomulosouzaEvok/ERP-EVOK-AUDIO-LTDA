FINDING_ID: AUD-MVC-0042

TITLE: Regra de cálculo de desconto implementada diretamente na camada Controller
DOMAIN: Arquitetura
SUBDOMAIN: MVC

SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: CONFIRMED

DESCRIPTION:
O PedidoController implementa diretamente a lógica de cálculo/validação de desconto, em vez de delegar a um
serviço/domínio dedicado.

EXPECTED_BEHAVIOR:
Regra de desconto centralizada em PricingService/Domain Policy, reutilizável por qualquer entry point (API, job,
rotina administrativa).

ACTUAL_BEHAVIOR:
calculaDesconto() está implementada em src/controllers/PedidoController.ts (exemplo fictício), linhas 183-221.

EVIDENCE:
FILE: src/controllers/PedidoController.ts (exemplo fictício)
LINES: 183-221

RELATED_REQUIREMENT: REQ-COM-004 (exemplo)
RELATED_BUSINESS_RULE: BR-COM-004 (exemplo — limite de desconto do vendedor)
RELATED_USE_CASE: UC-COM-002 (exemplo)
RELATED_TEST: AUSENTE

BUSINESS_IMPACT:
A regra pode ser ignorada por outros entry points (job, API interna, rotina administrativa) que não passem pelo
Controller, permitindo concessão indevida de desconto.

TECHNICAL_IMPACT:
Duplicação futura da regra é provável quando um segundo entry point precisar do mesmo cálculo.

SECURITY_IMPACT:
N/A (violação arquitetural, não vulnerabilidade de segurança direta)

REPRODUCTION:
Inspeção de código: qualquer chamada a calculaDesconto() fora de PedidoController não está sujeita à mesma validação.

REFERENCE: N/A

RECOMMENDATION:
Mover o cálculo para PricingService/Domain Policy e criar teste unitário da regra (TC-COM-xxx).

SUGGESTED_OWNER: Backend + Tech Lead

RETEST_REQUIRED: Yes
