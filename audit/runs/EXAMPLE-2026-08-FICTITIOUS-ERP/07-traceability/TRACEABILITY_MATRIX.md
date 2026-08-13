# TRACEABILITY_MATRIX — AUD-2026-08-FICTITIOUS-ERP (exemplo fictício)

| Processo | Regra (BR) | Requisito (REQ) | Caso de Uso (UC) | Aceite (AC) | Código | Teste (TC) | Permissão (PERM) | Evidência |
|---|---|---|---|---|---|---|---|---|
| PROC-COM-001 | BR-COM-004 | REQ-COM-004 | UC-COM-002 | AC-COM-004 | PedidoController.calculaDesconto() | ❌ AUSENTE | PERM-SALE-DISCOUNT | AUD-MVC-0042 |

**Leitura deste exemplo:** a regra de desconto tem processo, regra, requisito, caso de uso e implementação
identificados — mas não tem teste automatizado. Isso, somado à regra estar na camada errada (Controller em vez de
Service/Domain), gerou o finding `AUD-MVC-0042` e deve gerar também um finding de cobertura de teste ausente
(`business-rule-auditor`/`qa-auditor`) apontando para o mesmo `BR-COM-004`.
