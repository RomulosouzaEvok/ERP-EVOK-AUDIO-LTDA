# AUDIT_COVERAGE_MATRIX.md — AUD-2026-08-ERP-EVOK-FULL (Cobertura PLANEJADA)

Mantida pelo `software-audit-director`. Esta é a matriz de cobertura **planejada** para o gate humano de
`/audit-new` (`AUDIT_PROCESS.md` §4, item 3) — nenhuma linha abaixo reflete trabalho de fieldwork executado. Todas as
células de "Status" desta versão são **"PLANEJADO — não executado"**. Após o fieldwork, o `audit-consolidator`
atualiza esta mesma matriz (ou uma nova versão em `07-consolidation/` ou pasta equivalente) com o estado real —
não declarar cobertura de 100% aqui sem que a auditoria correspondente tenha, de fato, ocorrido.

Base: `01-inventory/SYSTEM_MAP.md` (módulos e risco a priori), `02-plan/RISK_CLASSIFICATION.md` (classificação),
`02-plan/AGENT_ASSIGNMENT.md` (distribuição completa por agente — fonte de verdade para a lista de agentes; esta
matriz resume, não substitui).

---

## 1. Por módulo/domínio de negócio

| Módulo/Domínio | Risco (a priori) | Agente(s) principal(is) | Trilhas que também tocam este módulo | Profundidade planejada | Status |
|---|---|---|---|---|---|
| auth | CRITICAL | `authentication-auditor` | Produto/Negócio (domain-logic), Engenharia (backend-auditor) | Full | PLANEJADO — não executado |
| accessProfiles / RBAC | CRITICAL | `authorization-auditor`, `appsec-auditor` | Segurança (documentação), Engenharia | Full | PLANEJADO — não executado |
| users | CRITICAL | `authorization-auditor` | Segurança, Engenharia | Full | PLANEJADO — não executado |
| directorate (governança/alçada D-K) | CRITICAL | `authorization-auditor`, `business-rule-auditor` | Produto/Negócio, Segurança | Full | PLANEJADO — não executado |
| purchases (alçada/origem G11) | CRITICAL | `business-rule-auditor`, `backend-auditor` | Engenharia, Segurança, Regressão | Full | PLANEJADO — não executado |
| comex (gate diretoria) | CRITICAL | `integration-architecture-auditor`, `business-rule-auditor` | Engenharia, Integrações | Full | PLANEJADO — não executado |
| financial (AP/AR — G13) | CRITICAL | `business-rule-auditor`, `backend-auditor` | Engenharia, Produto/Negócio | Full | PLANEJADO — não executado |
| mrp | CRITICAL | `business-rule-auditor`, `idempotency-auditor` | Arquitetura (repository-layer), Regressão | Full | PLANEJADO — não executado |
| quality (quarentena, gate D-L) | CRITICAL | `business-rule-auditor`, `integration-auditor` | Produto/Negócio, Engenharia | Full | PLANEJADO — não executado |
| bom (fonte única — G1) | CRITICAL | `domain-architecture-auditor`, `repository-layer-auditor` | Arquitetura, Engenharia, Regressão | Full | PLANEJADO — não executado |
| production (partida OP — G4/G5/G6) | CRITICAL | `business-rule-auditor`, `domain-logic-auditor` | Engenharia, Regressão | Full | PLANEJADO — não executado |
| fiscal (tributos, NF-e) | CRITICAL | `external-api-auditor` | Engenharia, Integrações | Full | PLANEJADO — não executado |
| auditLogs | CRITICAL | `audit-log-security-auditor` | Segurança | Full | PLANEJADO — não executado |
| sales (faturamento, baixa estoque — G9) | HIGH | `backend-auditor`, `domain-logic-auditor` | Produto/Negócio, Engenharia | Standard-Alta | PLANEJADO — não executado |
| rh | HIGH | `backend-auditor` | Segurança (LGPD), Documentação | Standard-Alta | PLANEJADO — não executado |
| sst | HIGH | `backend-auditor` | Documentação (regulatório eSocial) | Standard-Alta | PLANEJADO — não executado |
| juridico | HIGH | `backend-auditor` | Documentação (LGPD) | Standard-Alta | PLANEJADO — não executado |
| ti | HIGH | `backend-auditor` | Segurança (acesso/backup) | Standard-Alta | PLANEJADO — não executado |
| traceability | HIGH | `backend-auditor` | Produto/Negócio, Qualidade | Standard-Alta | PLANEJADO — não executado |
| masterProduction (MPS — G17) | HIGH | `backend-auditor` | Produto/Negócio | Standard-Alta | PLANEJADO — não executado |
| accounting / treasury / budget | HIGH | `backend-auditor` | — | Standard-Alta | PLANEJADO — não executado |
| suppliers | HIGH | `backend-auditor` | Produto/Negócio (herdado de G11) | Standard-Alta | PLANEJADO — não executado |
| spreadsheetImport | HIGH | `backend-auditor` | Dados (carga inicial) | Standard-Alta | PLANEJADO — não executado |
| webhooks (n8n) | HIGH | `webhook-auditor` | Segurança, Integrações | Full (apesar do volume baixo) | PLANEJADO — não executado |
| purchaseRequisitions | MEDIUM | `backend-auditor` | Produto/Negócio | Amostragem proporcional | PLANEJADO — não executado |
| items / products | MEDIUM | `backend-auditor` | Arquitetura (domain-architecture) | Amostragem proporcional | PLANEJADO — não executado |
| inventory (estoque, contagens, depósitos) | MEDIUM | `sdet-auditor` (concorrência) | Engenharia | Amostragem proporcional | PLANEJADO — não executado |
| engineering | MEDIUM | `backend-auditor` | Arquitetura (alimenta bom) | Amostragem proporcional | PLANEJADO — não executado |
| workCenters | MEDIUM | `backend-auditor` | Produto/Negócio (herdado de G6) | Amostragem proporcional | PLANEJADO — não executado |
| assets / maintenance / serviceOrders | MEDIUM | `backend-auditor` | — | Amostragem proporcional | PLANEJADO — não executado |
| nonConformities | MEDIUM | `backend-auditor` | Qualidade | Amostragem proporcional | PLANEJADO — não executado |
| rfq | MEDIUM | `backend-auditor` | Produto/Negócio (financeiro herdado) | Amostragem proporcional | PLANEJADO — não executado |
| dashboard / reports / intelligentAuditor | MEDIUM | `backend-auditor` | — | Amostragem proporcional | PLANEJADO — não executado |
| facilities | MEDIUM | `mvc-architecture-auditor` (módulo grande) | — | Amostragem proporcional | PLANEJADO — não executado |
| mobileInventory | MEDIUM | `backend-auditor` | Plataforma (limitação hardware) | Amostragem proporcional | PLANEJADO — não executado |
| clients | LOW | `backend-auditor` | — | Amostragem | PLANEJADO — não executado |
| categories / departments | LOW | `backend-auditor` | Documentação (guarda de seed) | Amostragem | PLANEJADO — não executado |
| employees (núcleo) | LOW | `backend-auditor` | — | Amostragem | PLANEJADO — não executado |
| laboratory | LOW | `backend-auditor` | — | Amostragem | PLANEJADO — não executado |
| marketing | LOW | `backend-auditor` | — | Amostragem | PLANEJADO — não executado |

---

## 2. Trilhas transversais

| Trilha | Agente(s) coordenador(es) | Profundidade planejada | Status |
|---|---|---|---|
| Produto e Negócio (regras remediadas 2026-08-09/12, BPMN, rastreabilidade RF→UC→rota) | `business-rule-auditor`, `business-process-auditor`, `product-auditor`, `requirements-auditor`, `acceptance-criteria-auditor`, `use-case-auditor`, `domain-logic-auditor`, `traceability-auditor` | Full nos domínios CRITICAL/HIGH; Standard no restante | PLANEJADO — não executado |
| Documentação (14 grupos + drift de calibração) | `documentation-audit-lead` (coordenação, com `Write`), `documentation-consistency-auditor`, `architecture-documentation-auditor`, `data-documentation-auditor`, `security-documentation-auditor`, `api-documentation-auditor`, `operations-documentation-auditor`, `test-documentation-auditor` | Full em consistency/data/test; Standard/Amostragem no restante | PLANEJADO — não executado |
| Arquitetura (Clean Architecture, camadas, fronteiras de domínio) | `architecture-auditor`, `domain-architecture-auditor`, `mvc-architecture-auditor`, `integration-architecture-auditor`, `dependency-architecture-auditor`, `repository-layer-auditor`, `service-layer-auditor` | Full em bom/mrp/quality/financial/directorate; Standard/amostragem no restante | PLANEJADO — não executado |
| Engenharia / código | `backend-auditor`, `frontend-auditor`, `fullstack-auditor`, `controller-auditor`, `domain-logic-auditor`, `idempotency-auditor`, `api-auditor`, `external-api-auditor`, `webhook-auditor`, `integration-auditor` | Full nos 13 módulos CRITICAL; Standard no restante | PLANEJADO — não executado |
| Dados / Banco (schema real, migrations, integridade referencial) | `database-auditor` (requer execução real — prioridade 1), `migration-auditor`, `data-integrity-auditor` | Full | PLANEJADO — não executado (bloqueado até haver ferramenta de execução real disponível ao agente) |
| Segurança (auth, authz, appsec, secrets, sessão) | `appsec-auditor`, `authentication-auditor`, `authorization-auditor`, `session-security-auditor`, `secrets-auditor`, `security-configuration-auditor`, `dependency-security-auditor`, `audit-log-security-auditor`, `tenant-isolation-auditor` (N/A) | Full nos módulos CRITICAL de identidade/autorização; Standard no restante; N/A explícito em tenant isolation | PLANEJADO — não executado |
| Qualidade / Testes (cobertura real vs. presença de arquivo) | `qa-auditor`, `test-coverage-auditor` (requer execução real), `test-architecture-auditor`, `sdet-auditor`, `regression-auditor` | Full — requer rodar a suíte de fato, não apenas Glob por nome | PLANEJADO — não executado (bloqueado pela mesma limitação de ferramenta de execução) |
| Plataforma / Operação (CI/CD, infra, observabilidade, backup) | `devops-auditor`, `cicd-auditor`, `infrastructure-auditor`, `observability-auditor`, `performance-auditor`, `resilience-auditor`, `backup-recovery-auditor`, `sre-auditor` | Full em CI/CD; Standard/Amostragem no restante (infraestrutura de produção real está fora de escopo, ver AUDIT_PLAN.md §2) | PLANEJADO — não executado |
| Integrações (fiscal providers, CNAB/OFX, webhook n8n) | `external-api-auditor`, `webhook-auditor`, `integration-architecture-auditor` | Alta | PLANEJADO — não executado |
| IA / LLM / RAG | — (nenhum agente alocado) | **Excluída** — sem componente em produção (ver `SCOPE.md`, `RISK_CLASSIFICATION.md`) | N/A — não é lacuna de cobertura, é exclusão de escopo justificada |

---

## 3. Formato compatível com o template padrão (`AUDIT_COVERAGE_MATRIX_TEMPLATE.md`)

Visão resumida no formato de referência do framework, adaptada ao estado desta etapa (Inventariada = já mapeada por
`SYSTEM_INVENTORY.md`/`SYSTEM_MAP.md`; Auditada = **0%** em toda linha, pois fieldwork não começou; Findings = 0 até
aqui; Validada = N/A):

| Área | Inventariada | Auditada | Findings | Validada |
|---|---|---|---|---|
| Requisitos | 100% | 0% (planejado) | 0 | N/A |
| Casos de uso | 100% | 0% (planejado) | 0 | N/A |
| Regras de negócio | 100% | 0% (planejado) | 0 | N/A |
| Arquitetura / MVC | 100% | 0% (planejado) | 0 | N/A |
| APIs | 100% | 0% (planejado) | 0 | N/A |
| Banco de dados | Inventariado por documento; **contagem ao vivo pendente** (ver AUDIT_PLAN.md §3, item 3) | 0% (planejado) | 0 | N/A |
| Segurança / Autorização | 100% | 0% (planejado) | 0 | N/A |
| Integrações | 100% | 0% (planejado) | 0 | N/A |
| Qualidade / Testes | Inventariado por contagem de arquivo; **execução real da suíte pendente** | 0% (planejado) | 0 | N/A |
| Plataforma / Operação | 100% | 0% (planejado) | 0 | N/A |
| Documentação | 100% | 0% (planejado) | 0 | N/A |
| IA (se aplicável) | N/A — confirmado ausente | N/A | N/A | N/A |

**Nenhuma célula acima declara 100% de cobertura executada.** "Auditada" só passará de 0% quando o
`audit-consolidator`, na etapa de Consolidation, atualizar esta matriz com evidência real de fieldwork — conforme
`AUDIT_PROCESS.md` §4, itens 4 a 7, e a regra deste framework de nunca declarar cobertura sem prova.

---

## Gate

Esta matriz, junto com `AUDIT_PLAN.md` e `00-scope/SCOPE.md`, compõe o pacote de aprovação humana exigido antes do
início de `/audit-fieldwork` (`AUDIT_PROCESS.md` §4, item 3).
