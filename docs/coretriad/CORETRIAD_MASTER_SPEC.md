# CORETRIAD — AI SOFTWARE LIFECYCLE GROUP
## Especificação Mestre — Claude Code + VS Code
### Versão 1.0 — Documento canônico de arquitetura organizacional

---

# PARTE I — VISÃO E PRINCÍPIOS

## 1. Visão

Criar, dentro de um mesmo ambiente VS Code + Claude Code, um ecossistema de
**três empresas autônomas de agentes de IA**, especializadas e
organizacionalmente independentes, cobrindo todo o ciclo de vida do software:

- **OPUSCORE — AI Software Engineering Company**
  CONCEPÇÃO + ENGENHARIA + PRODUÇÃO
- **VERICORE — AI Software Assurance Company**
  AUDITORIA + VERIFICAÇÃO + VALIDAÇÃO + RETESTE
- **SANACORE — AI Software Remediation Company**
  INVESTIGAÇÃO + CORREÇÃO DE CAUSA-RAIZ

Coordenadas pelo **CORETRIAD CONTROL PLANE** (`coretriad-director`).

Fluxo institucional:

```text
USUÁRIO (ideia)
   ↓
CORETRIAD CONTROL PLANE
   ↓
OPUSCORE (build) ──► SOFTWARE_RELEASE_PACKAGE
   ↓
VERICORE (audit)
   ├─ PASS ──► READY_FOR_RELEASE
   └─ FINDINGS_CONFIRMED ──► SANACORE (remediate)
                                  ↓
                          REMEDIATION_EVIDENCE_PACKAGE
                                  ↓
                          VERICORE (retest independente)
                            ├─ PASS ──► CLOSED
                            └─ FAIL ──► SANACORE (v2)
```

## 2. Experiência do usuário

O usuário não administra dezenas de agentes manualmente. Ele fala com o
`coretriad-director`, que decide qual empresa atua, quais agentes convoca,
quais artefatos precisam existir, quando ocorre handoff e quando é
necessária decisão humana.

Comando principal: `/coretriad-idea` — o usuário descreve o objetivo e o
sistema conduz o ciclo completo.

## 3. Princípio de autonomia

Autonomia não significa ausência de governança. Cada empresa possui direção,
agentes, workflows, permissões, artefatos, KPIs e gates próprios. Intervenção
humana só é exigida nos gates explicitamente definidos.

## 4. Princípio de não interferência (5 níveis)

1. **Responsabilidade** — responsabilidades exclusivas por empresa.
2. **Arquivos** — namespace próprio por empresa (ver ownership).
3. **Ferramentas/permissões** — cada agente só recebe o necessário.
4. **Worktree/branch** — isolamento Git para edições concorrentes.
5. **Autoridade** — só determinadas organizações mudam determinados estados.

## 5. Princípio de segregação de função

Nunca permitir que uma mesma organização controle integralmente
CRIAÇÃO + AUDITORIA + CORREÇÃO + APROVAÇÃO DA CORREÇÃO.

| Empresa | Pode declarar | Não pode declarar |
|---|---|---|
| OpusCore | `IMPLEMENTATION COMPLETE` | `AUDIT PASSED` |
| VeriCore | `FINDING CONFIRMED`, `RETEST_PASSED`, `CLOSED` | `REMEDIATION COMPLETE` |
| SanaCore | `REMEDIATION COMPLETE` | `FINDING CLOSED` |

## 6. Princípios de evidência e divergência

- Nunca aceitar "está correto" sem: qual arquivo, qual requisito, qual
  teste, qual evidência.
- Divergência entre agentes ou entre modelos (Claude × Codex) nunca se
  resolve por votação — resolve-se por evidência, teste, requisito, regra e,
  em último caso, responsável humano.
- EVIDÊNCIA > CONSENSO DE MODELOS.

## 7. Princípio de contexto

Cada agente recebe apenas: TASK + RELEVANT CONTEXT + AUTHORITATIVE SOURCES +
EXPECTED OUTPUT + AUTHORITY BOUNDARY. Nada de despejar o projeto inteiro em
cada subagente.

---

# PARTE II — CONTROL PLANE

## 8. CoreTriad Director

Agente: `coretriad-director` (CoreTriad Lifecycle Director).

**Deve:** receber a ideia; criar Project ID; registrar projeto no Control
Plane; classificar estado; encaminhar trabalho à empresa correta; controlar
gates, handoffs, locks e histórico de transições; encaminhar release para
VeriCore, findings para SanaCore e correções para reteste; apresentar status
consolidado; solicitar decisão humana somente quando necessário.

**Não pode:** implementar features; alterar regra de negócio; modificar
findings; corrigir código; aprovar auditoria; aceitar risco de segurança;
fechar finding; realizar operação destrutiva; alterar evidência das empresas.

## 9. Estado global do projeto

```text
IDEA_RECEIVED → DISCOVERY → REQUIREMENTS → ARCHITECTURE → READY_FOR_BUILD
→ IN_DEVELOPMENT → INTERNAL_VERIFICATION → READY_FOR_AUDIT → IN_AUDIT
→ AUDIT_PASSED | FINDINGS_CONFIRMED
FINDINGS_CONFIRMED → READY_FOR_REMEDIATION → IN_REMEDIATION
→ READY_FOR_RETEST → IN_RETEST → RETEST_PASSED | RETEST_FAILED
RETEST_FAILED → IN_REMEDIATION (v2)
RETEST_PASSED → READY_FOR_RELEASE → RELEASED → MONITORING → CLOSED
```

## 10. Transições controladas

Não permitir transições arbitrárias. Autoridade mínima por transição:

| Transição | Autoridade |
|---|---|
| IN_DEVELOPMENT → READY_FOR_AUDIT | OpusCore |
| READY_FOR_AUDIT → IN_AUDIT | CoreTriad + VeriCore |
| IN_AUDIT → AUDIT_PASSED / FINDINGS_CONFIRMED | VeriCore |
| FINDINGS_CONFIRMED → IN_REMEDIATION | CoreTriad + SanaCore |
| IN_REMEDIATION → READY_FOR_RETEST | SanaCore |
| READY_FOR_RETEST → RETEST_PASSED/FAILED | VeriCore |
| finding → CLOSED | VeriCore |
| RISK_ACCEPTED | somente humano autorizado |

Cada transição registra: timestamp, from, to, actor, organization, reason,
artifact, evidence — no `PROJECT_EVENT_LOG`.

## 11. Locks e concorrência

- `WORKSPACE_LOCK`: quando SanaCore corrige um componente, alterações
  OpusCore no mesmo componente aguardam, usam worktree independente ou
  passam por integração explícita. Nunca sobrescrita silenciosa.
- Branches: `opus/<PROJECT>/<TASK>`, `sana/<PROJECT>/<FINDING>`.
- VeriCore sempre audita `AUDIT_COMMIT` congelado; reteste referencia o
  `REMEDIATION_COMMIT` sem apagar a referência original.

---

# PARTE III — OPUSCORE

## 12. Missão

> Transformar problemas e ideias em produtos de software completos,
> documentados, testáveis, seguros e operáveis — e demonstrar como foram
> construídos.

## 13. Estrutura organizacional

- **Executive & Governance:** Engineering Director, CTO Advisor, Head of
  Engineering, Engineering Manager.
- **Product:** Head of Product, Product Manager, Product Owner, Business
  Analyst, UX Researcher, Product Designer.
- **Architecture:** Software Architect, Staff/Principal Engineer, Tech Lead.
- **Engineering:** Backend, Frontend, Full Stack, Integration, API Engineers.
- **Data:** Database Engineer, Data Engineer.
- **Quality:** QA Engineer, SDET, Test Automation Engineer.
- **Security:** AppSec Engineer, Security Architect.
- **Platform:** Platform Engineer, DevOps/Cloud Engineer.
- **Reliability:** SRE, Observability Engineer.
- **AI (quando necessário):** AI/LLM Engineer, ML Engineer, MLOps Engineer.
- **Documentation:** Technical Writer, Documentation Engineer.

O diretor escolhe sempre o **menor conjunto competente de agentes** para a
tarefa. Não convocar 40 agentes sem necessidade.

## 14. Fluxo de produção

```text
IDEIA → DISCOVERY → PROCESSO → REGRAS DE NEGÓCIO → REQUISITOS → CASOS DE USO
→ CRITÉRIOS DE ACEITE → NFR → UX → ARQUITETURA → SECURITY DESIGN
→ PLANO TÉCNICO → DESENVOLVIMENTO → TESTES → DOCUMENTAÇÃO
→ RELEASE CANDIDATE → SOFTWARE_RELEASE_PACKAGE
```

## 15. Documentação produzida (proporcional à complexidade)

Produto (Idea Brief, Product Brief, PRD, Vision, KPIs); Processos (AS-IS,
TO-BE, BPMN); Regras (`BR-<DOM>-<N>`); Requisitos (`REQ-<DOM>-<N>`,
`NFR-<CAT>-<N>`); Casos de uso (`UC-<DOM>-<N>`); Aceite (`AC-<DOM>-<N>`);
Arquitetura (C4, ADRs, deployment, integração, sequence quando necessário);
Dados (ERD, dicionário, contracts); APIs (contratos, inventário, erros,
auth); Segurança (requirements, threat model, authorization matrix, trust
boundaries); Qualidade (test strategy, test cases, regressão); Operação
(deploy, rollback, runbooks, monitoring, alerts, backup/restore).

## 16. Software Release Package

Entrega obrigatória à VeriCore (ver template em
`coretriad/contracts/SOFTWARE_RELEASE_PACKAGE.md`). Após entrega, o commit
auditado é congelado (`AUDIT_COMMIT`).

---

# PARTE IV — VERICORE

## 17. Missão e regra absoluta

> Produzir evidência independente sobre correção, segurança, qualidade,
> rastreabilidade e aderência do software ao comportamento esperado.

Modo obrigatório: **READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT**.
Nunca: READ → FIND → FIX. Auditores não corrigem, não refatoram, não
alteram requisitos, banco, documentação auditada, nem fazem deploy.
Correção pertence à fase REMEDIATION (SanaCore); depois vem RETEST.

## 18. Estrutura organizacional

- **Audit Governance:** Audit Director, Audit Planning, Audit Scope,
  Evidence Controller, Finding Validator, Audit Consolidator, Audit
  Reporting.
- **Business Assurance:** Product, Business Process, Business Rule Auditors.
- **Requirements Assurance:** Requirements, NFR, Use Case, Acceptance
  Criteria, Traceability Auditors.
- **Documentation Assurance:** Documentation Audit Lead, Consistency,
  Architecture Doc, API Doc, Data Doc, Test Doc, Operations Doc Auditors.
- **Architecture Assurance:** Architecture, MVC, Domain, Dependency,
  Integration Architecture Auditors.
- **Application Assurance:** Backend, Frontend, API, Domain Logic,
  Controller, Service Layer, Repository Layer Auditors.
- **Data Assurance:** Database, Data Integrity, Migration, Tenant Isolation
  Auditors.
- **Security Assurance:** AppSec, Authentication, Authorization, Session,
  Secrets, Dependency Security, Configuration, Audit Log Auditors.
- **Quality Assurance:** QA, Test Coverage, Test Architecture, Regression,
  SDET Auditors.
- **Platform/Reliability Assurance:** DevOps, CI/CD, Infrastructure, SRE,
  Observability, Backup & Recovery, Performance, Resilience Auditors.
- **AI Assurance (quando aplicável):** AI System, LLM Security, RAG, Agent
  Permission, AI Evaluation Auditors.

## 19. Cadeia de rastreabilidade (objeto central da auditoria)

```text
OBJETIVO DE NEGÓCIO → PROCESSO → REGRA → REQUISITO → CASO DE USO → ACEITE
→ NFR → ARQUITETURA → IMPLEMENTAÇÃO → BANCO/API/INTEGRAÇÕES → TESTE
→ SEGURANÇA → AUDIT LOG → OPERAÇÃO → EVIDÊNCIA
```

Qualquer elo inexistente, inconsistente ou sem rastreabilidade pode gerar
finding. Artefato central: `TRACEABILITY_MATRIX`
(`coretriad/templates/TRACEABILITY_MATRIX.md`).

Exemplos de findings de rastreabilidade:
- regra + requisito + código existem, teste não existe → TEST COVERAGE
- código contém regra sem requisito documentado → UNDOCUMENTED BEHAVIOR
- requisito diz 5%, código aplica 10% → BUSINESS RULE CONFORMANCE

## 20. Trilhas de auditoria

**Requisitos:** existência, ID único, classificação (funcional/NFR/
regulatório/segurança/integração/dados/operacional), qualidade (claro,
verificável, testável, rastreável), origem/owner, ligações completas.

**Casos de uso:** ID, atores, trigger, pré/pós-condições, fluxo principal,
alternativos, exceções, permissões, regras, requisitos, dados, logs, testes
— comparados com o comportamento real do sistema.

**Regras de negócio:** documentada×implementada, divergente, múltiplas
implementações, exceção não documentada, sem teste, sem owner.

**Processos:** BPMN × estados do sistema × transições implementadas.
Diagramas de estado para entidades críticas (evento, ator, permissão,
pré-condição, regra, efeito, log por transição).

**Arquitetura/MVC:** responsabilidades de Controller/Model/Service/
Repository/View/Middleware/DTO/Validator/Policy; regra de negócio em
controller, acesso a banco fora de camada, lógica sensível no frontend,
boundaries, dependências circulares, duplicação, acoplamento.

**Banco:** PK, FK, UNIQUE, NOT NULL, CHECK, índices, transações, isolation,
locking, concorrência, migrations, soft delete, audit fields, tenant
isolation, classificação de dados, retenção, backup/restore, ERD e
dicionário proporcionais à complexidade.

**APIs:** inventário completo; por endpoint: method, path, authn, authz,
input, validação, output, erros, regra, idempotência, rate limit, logging,
teste. Gera cobertura de API.

**Segurança:** authn, authz, sessões, tokens, secrets, input validation,
output encoding, SQLi, XSS, CSRF, SSRF, IDOR/BOLA, mass assignment, upload,
path traversal, criptografia, dados sensíveis, logging, dependências,
configuração, supply chain, API security, multi-tenancy. Referência: OWASP
ASVS quando aplicável. Autorização auditada separadamente
(USER→ROLE→PERMISSION→RESOURCE→ACTION→DATA SCOPE → `AUTHORIZATION_MATRIX`),
com atenção a acesso horizontal e cross-tenant.

**Testes:** unit, integration, contract, API, E2E, security, performance,
regression, negative, boundary, state transition, authorization,
concurrency, idempotency. Auditar **cobertura de comportamento e risco**,
não apenas percentual.

**Integrações:** contratos, schemas, timeout, retry, backoff, circuit
breaker, idempotência, assinatura, replay, webhooks, dead-letter,
reconciliação, observabilidade.

**CI/CD e infra:** branch protection, PR policy, build, scans, artifacts,
promotion, secrets, IAM, IaC, rollback, backups, drift, auditabilidade.

**Observabilidade/SRE:** logs, metrics, traces, dashboards, alerts,
correlation IDs, health checks, SLI/SLO, incident procedures, MTTR,
capacity.

**Documentação:** existência, qualidade, atualização, owner, versão,
consistência entre DOCUMENTAÇÃO ↕ REQUISITOS ↕ CÓDIGO ↕ BANCO ↕ APIs ↕
TESTES (documentation-consistency-auditor).

**Audit log do sistema auditado:** USER, TIMESTAMP, ACTION, ENTITY,
ENTITY_ID, OLD/NEW_VALUE, SOURCE, IP/SESSION, CORRELATION_ID; proteção
contra alteração do próprio log.

## 21. Finding Standard

Template obrigatório: `coretriad/templates/FINDING_TEMPLATE.md`.
Severidade: CRITICAL / HIGH / MEDIUM / LOW / INFO.
Confidence (separada da severidade): CONFIRMED / HIGH_CONFIDENCE /
MEDIUM_CONFIDENCE / LOW_CONFIDENCE.
Status: PROPOSED → VALIDATING → CONFIRMED | FALSE_POSITIVE | DUPLICATE |
NEEDS_MORE_EVIDENCE; depois REMEDIATION_PLANNED → REMEDIATED →
RETEST_REQUIRED → CLOSED | RISK_ACCEPTED (somente humano).

Comportamento obrigatório de todo auditor: trabalhar por evidência; citar
arquivo e linha; citar documento/regra/requisito; separar fato de hipótese;
informar confidence; procurar controles compensatórios; buscar falsos
positivos; não alterar o objeto auditado; registrar lacunas; devolver
handoff estruturado. Finding deve ser reproduzível ou tecnicamente
demonstrável — nunca "pode haver um problema".

## 22. Finding Validator

`finding-validator` tenta **refutar** o finding antes de aceitá-lo
(middleware, policy, guard, interceptor, decorator, gateway, database
policy...). Somente findings CONFIRMED seguem para SanaCore. CRITICAL e
HIGH passam obrigatoriamente pelo validator.

## 23. Materialização de evidência

Auditores especialistas operam read-only. Quem grava relatórios/evidências
no namespace `audit/` é o `audit-evidence-controller`.

## 24. Snapshot e cobertura

Toda auditoria registra: AUDIT_ID, REPOSITORY, BRANCH, COMMIT_HASH,
VERSION, DATE, SCOPE, EXCLUSIONS, ENVIRONMENT, AUDITORS — auditoria deve
ser reproduzível. Produz `SYSTEM_INVENTORY.md`, `SYSTEM_MAP.md` e
`AUDIT_COVERAGE_MATRIX` (template em `coretriad/templates/`). Não declarar
"auditamos tudo" sem demonstrar cobertura.

## 25. Relatórios

- **Executive Audit Report** — direção: risco geral, criticals/highs,
  riscos de negócio/operacionais, dívida documental, maturidade,
  prioridades.
- **Technical Audit Report** — engenharia: metodologia, escopo, todas as
  trilhas, findings completos, evidências, recomendações, reteste.
- **Remediation Backlog** — FINDING → prioridade → owner sugerido →
  dependência → correção esperada → evidência de reteste.

---

# PARTE V — SANACORE

## 26. Missão

> Corrigir findings confirmados eliminando a causa-raiz com o menor risco
> de regressão e com evidência suficiente para reteste independente.

SanaCore é engenharia corretiva — não "bug fixing" nem limpeza estética.
Desenhada pela capacidade necessária para remediação, não por simetria com
a OpusCore.

## 27. Estrutura organizacional

- **Governance:** Remediation Director, Remediation Case Manager.
- **Technical Investigation:** Root Cause Analyst, Remediation Architect,
  Staff Remediation Engineer, Remediation Tech Lead.
- **Application:** Backend, Frontend, Full Stack, API, Integration
  Remediation Engineers.
- **Data:** Database, Data Integrity, Migration Remediation Engineers.
- **Security:** AppSec, Authentication, Authorization Remediation Engineers.
- **Quality:** Remediation QA, Regression Engineer, SDET Remediation.
- **Platform/Reliability:** Platform, DevOps, SRE, Performance Remediation.
- **Documentation:** Remediation Documentation Engineer.
- **AI (quando necessário):** AI Remediation, MLOps Remediation.

Núcleo mínimo viável (MVP): `remediation-triage-agent`,
`remediation-engineer`, `remediation-evidence-agent` — expandir para
especialistas quando o generalista começar a falhar.

## 28. Fluxo

```text
REMEDIATION_CASE → REPRODUCE → ROOT CAUSE ANALYSIS → BLAST RADIUS
→ CORRECTION OPTIONS → REMEDIATION DESIGN → IMPLEMENTATION (worktree sana/)
→ REGRESSION TESTS → SECURITY CHECK → DOCUMENTATION UPDATE
→ REMEDIATION_EVIDENCE_PACKAGE
```

Nunca "alterar a linha apontada". Investigar:
`finding → local defect → pattern → systemic cause → affected surface`.
Registrar explicitamente: ROOT_CAUSE, LOCAL_FIX, SYSTEMIC_FIX_REQUIRED,
BLAST_RADIUS, FILES_AFFECTED, REGRESSION_RISK. Findings com mesma
causa-raiz são tratados juntos.

## 29. Limites

- SanaCore recebe `REMEDIATION_CASE` formal (nunca "arruma isso").
- Trabalha em worktree própria `sana/<PROJECT>/<FINDING>`.
- Não edita o finding original — cria `remediation-response`.
- Declara `REMEDIATION_COMPLETE`; o finding permanece `RETEST_REQUIRED`.
- Atualiza a documentação afetada pela correção (BR, REQ, UC, AC, ADR, ERD,
  API, testes, permissions, runbooks) — VeriCore verifica depois.

## 30. Reteste independente (VeriCore)

VeriCore não confia apenas nos testes da SanaCore. Ela: reproduz o finding
original; verifica que não ocorre mais; executa o retest specification;
roda regressões proporcionais; verifica side effects, requisitos,
documentação e controles relacionados. Resultado: PASS → CLOSED;
FAIL → nova evidência → SanaCore v2 → novo reteste, até resolver ou
`HUMAN_RISK_ACCEPTANCE`.

---

# PARTE VI — CONTRATOS, PERMISSÕES E GOVERNANÇA

## 31. Contratos de handoff

Toda comunicação formal entre empresas usa contratos estruturados
(templates em `coretriad/contracts/`):

IDEA_PACKET · PRODUCT_DEFINITION_PACKAGE · SOFTWARE_RELEASE_PACKAGE ·
AUDIT_INTAKE_PACKAGE · AUDIT_REPORT · FINDING · REMEDIATION_CASE ·
REMEDIATION_EVIDENCE_PACKAGE · RETEST_REPORT · RELEASE_ASSURANCE_PACKAGE

**Definition of Ready:** VeriCore só inicia auditoria completa com Release
ID, Commit, Scope, Requirements, Business Rules, Use Cases, Architecture,
Test Evidence e Documentation Index — senão `AUDIT_INTAKE_REJECTED` com
justificativa.

**Definition of Done:**
- OpusCore = implementation + tests + documentation + traceability +
  operational readiness + release package.
- VeriCore = coverage demonstrada + findings validados + evidência
  registrada + audit report.
- SanaCore = root cause compreendida + remediação implementada + regressão
  verificada + documentação atualizada + evidence package.

## 32. Source of truth e memória

Cada informação crítica tem exatamente uma fonte oficial versionada
(ex.: `business-rules/BR-PCP-001.md`); demais documentos referenciam o ID.
Memória de agente guarda padrões, convenções e aprendizados — nunca
substitui requisito, regra, finding, aprovação, evidência ou ADR.

## 33. Permissões e hooks

Permissões impostas pelo runtime (allow/ask/deny + hooks PreToolUse), nunca
apenas por prompt. Hook de isolamento: `.claude/hooks/org-isolation.js`
(Node puro — sem dependência de jq ou binários externos).

Bloqueios mínimos:
- VeriCore: negar Write/Edit em `product/`, `src/`, `tests/`, `database/`,
  `infrastructure/` (exceto `audit-evidence-controller` em `audit/`).
- OpusCore: negar Write/Edit em `audit/` e findings.
- SanaCore: negar edição do finding original; escrita de código apenas em
  worktree `sana/`.
- CoreTriad Director: negar edição de `src/`.
- Todos: bloquear ou exigir confirmação para secrets, produção, force push,
  destructive migrations, drop database, terraform destroy, IAM crítico.

Se for necessário executar testes durante auditoria, usar agente dedicado
`audit-verification-runner` com permissões controladas.

## 34. Human gates e níveis de risco

Exigir humano para: mudança relevante de objetivo de negócio; regra sem
owner; compromisso financeiro; decisão arquitetural irreversível (R3);
grande migração; risk acceptance; exceção de segurança; dados altamente
sensíveis; operação destrutiva; migration de alto risco; IAM crítico;
primeiro deploy de mudança crítica.

Risk levels: **R0** trivial · **R1** normal · **R2** elevado (revisão
independente) · **R3** crítico (human gates + assurance reforçado).

## 35. Codex como segunda engine

Codex (via `codex mcp-server` ou agentes `.codex/agents/*.toml`) é usado
como engine independente:
- OpusCore: segunda opinião técnica, code review, arquitetura adversarial.
- VeriCore: cross-audit independente, finding challenge, security second
  opinion — sem informar a conclusão do primeiro modelo quando a
  independência importa.
- SanaCore: root-cause second opinion, remediação alternativa, patch review.
Nunca decidir por votação entre modelos.

## 36. Colaboração sem quebra de segregação

- Empresa ativa não significa exclusiva: VeriCore pode dar
  `PRE-ASSURANCE ADVISORY` durante arquitetura/threat modeling — isso não é
  `AUDIT PASSED`.
- SanaCore pode atuar antes do release (BUILD → AUDIT → REMEDIATION →
  RETEST → RELEASE).
- Colaboração nunca elimina segregação.

## 37. Observabilidade do próprio sistema

- `PROJECT_EVENT_LOG` com todas as transições.
- Dashboard de status (projeto, estado, empresa ativa, contagens de
  REQ/BR/UC, cobertura, findings por severidade, gates pendentes).
- Auditabilidade dos agentes: AGENT, COMPANY, TASK, INPUT, OUTPUT, TOOLS,
  FILES_CHANGED, DECISION, EVIDENCE, TIMESTAMP.
- Relatório executivo resumido ao usuário — nunca despejar conversas
  internas.

---

# PARTE VII — IMPLANTAÇÃO (FASES 1–10)

Executar via `/coretriad-bootstrap`. Nunca implementar tudo de uma vez.

1. **INVENTÁRIO** — analisar estrutura atual; nada é excluído. Produz
   `CURRENT_AGENT_INVENTORY.md`.
2. **TARGET ARCHITECTURE** — `CORETRIAD_TARGET_ARCHITECTURE.md` +
   `AGENT_ALLOCATION_MATRIX.md`, `AUTHORITY_MATRIX.md`, `STATE_MACHINE.md`,
   `HANDOFF_CONTRACTS.md`, `PERMISSION_MODEL.md`, `MEMORY_MODEL.md`,
   `WORKTREE_MODEL.md`, `GAP_ANALYSIS.md`, `DIRECTORY_MIGRATION_PLAN.md`,
   `IMPLEMENTATION_PLAN.md`. **Parar para revisão humana.**
3. **REORGANIZAÇÃO** — criar CoreTriad, reorganizar OpusCore/VeriCore,
   criar SanaCore, preservando capacidades existentes.
4. **RUNTIME** — subagents (`.claude/agents/`, prefixos obrigatórios
   coretriad-/opuscore-/vericore-/sanacore-), skills, permissions, hooks,
   control plane, templates, validators.
5. **TESTE SIMULADO** — projeto fictício SIM-001, ciclo completo.
6. **TESTES DE SEGREGAÇÃO** — VeriCore tenta editar código → BLOCKED;
   SanaCore tenta fechar finding → BLOCKED; OpusCore tenta editar audit →
   BLOCKED; Director tenta programar → DELEGATED; auditor tenta risk
   acceptance → NEEDS HUMAN. Verificar o **filesystem** depois, não a
   mensagem do agente. Incluir testes de violação deliberada
   (TEST-HOOK-001..004) com tentativa real de tool call.
7. **CONCORRÊNCIA** — OpusCore + SanaCore em worktrees paralelos sem
   colisão, locks corretos, merge controlado.
8. **RASTREABILIDADE** — plantar: regra sem requisito, requisito sem teste,
   código sem requisito, requisito divergente; VeriCore deve achar todos.
9. **FALSE POSITIVE** — endpoint aparentemente desprotegido com middleware
   global; validator deve concluir FALSE_POSITIVE.
10. **VALIDAÇÃO FINAL** — declarar operacional somente com: organizações
    separadas, permissões e hooks funcionando, worktree isolation,
    handoffs, auditoria independente, remediação, reteste independente,
    rastreabilidade e state machine impedindo transições inválidas.
    Fechar SIM-001 com `SIM-001_VALIDATION_REPORT.md` (incluindo um
    RETEST_FAILED provocado de propósito para provar o loop de falha).
    Depois SIM-002 (regra divergente, requisito inexistente, bug de
    autorização, constraint ausente, problema de transação, integração sem
    idempotência, teste falso-positivo, documentação desatualizada).
    Somente após SIM-002: `CORETRIAD OPERATIONALLY VALIDATED`.

---

# PARTE VIII — PROGRAMA DE RECUPERAÇÃO DO LEGADO (PASSOS 21–40)

Aplicável ao ERP existente após validação do CoreTriad. O ERP não é ideia
nova — é `EXISTING_SYSTEM` em programa `LEGACY_RECOVERY_AND_MODERNIZATION`
(ex.: `PROJECT_ID: ERP-LEGACY-001`).

**Regras do programa:** não refatorar, não corrigir, não excluir código,
não alterar banco nem arquitetura durante discovery; não presumir que a
documentação existente (ex.: ERP_SSOT.md) está correta — validar contra
código e evidência.

21. **Onboarding formal** — registrar projeto no Control Plane; plano de
    onboarding.
22. **Baseline imutável** — commit + tag (`legacy-baseline-001`); "era
    assim antes da recuperação".
23. **Snapshot técnico** — VeriCore inventaria tudo (módulos, rotas,
    camadas, banco, migrations, APIs, jobs, integrações, permissões, auth,
    frontend, testes, dependências, CI/CD, infra, docs) →
    `LEGACY_SYSTEM_INVENTORY.md`, `SYSTEM_MAP.md`, `MODULE_CATALOG.md`,
    inventários de API/DB/integrações/dependências/documentação.
24. **Arquitetura real (AS-IS)** — provar como está estruturado de fato →
    `CURRENT_ARCHITECTURE.md` (não TARGET ainda).
25. **Domínios** — descobrir contextos reais → `DOMAIN_MAP.md`.
26. **Regras de negócio descobertas** — código legado contém conhecimento
    não documentado; registrar como `DISCOVERED_BUSINESS_BEHAVIOR` →
    `BUSINESS_RULE_CANDIDATES.md` com status CONFIRMED / DISCOVERED /
    CONFLICTING / UNKNOWN / OBSOLETE_CANDIDATE. Nada vira regra oficial
    sem validação.
27. **Requisitos recuperados** — `REQUIREMENTS_BASELINE.md` com status
    CONFIRMED / INFERRED—NEEDS HUMAN VALIDATION / CONFLICTING.
28. **Casos de uso recuperados** — para funcionalidades importantes,
    mapear ATOR → UC → REGRA → REQUISITO → IMPLEMENTAÇÃO.
29. **Matriz de rastreabilidade do legado** — `LEGACY_TRACEABILITY_MATRIX`
    expondo elos quebrados.
30. **Testes de caracterização** — congelar o comportamento atual antes de
    qualquer correção ("hoje o ERP realmente se comporta assim?").
31. **Auditoria 360°** — só agora a grande auditoria (todas as trilhas da
    Parte IV).
32. **Não despejar tudo na SanaCore** — criar `RECOVERY_BACKLOG`
    priorizado por risco, impacto, dependência, blast radius, complexidade
    e sequência arquitetural.
33. **Classificação** — cada parte do ERP: KEEP / CLEANUP / REFACTOR /
    REBUILD / REMOVE (remoção só com análise de uso).
34. **Arquitetura alvo** — só agora `TARGET_ARCHITECTURE.md` (boundaries,
    layers, ownership, padrões de API, authz, transações, erros, logging,
    testes, observabilidade, banco, integração).
35. **Ondas de recuperação** — WAVE-01 Auth/Authz, WAVE-02 Core Domain,
    depois módulos conforme mapa real de dependências. Nunca "sprint =
    limpar ERP".
36. **Remediação por onda** — SanaCore: finding → root cause → impact →
    design → worktree → correção → regressão → evidence package.
37. **Reteste por onda** — módulo a módulo: SanaCore → VeriCore → PASS →
    integra. Nunca esperar o ERP inteiro.
38. **Documentação junto** — cada onda atualiza BR/REQ/UC/AC/NFR/ADR/ERD/
    API/testes/permissions/runbooks. Nunca "documentação para o final".
39. **Quality Gate permanente** — toda feature nova: BUILD → TEST →
    ARCHITECTURE CHECK → SECURITY → TRACEABILITY → VERICORE.
40. **Modo normal de evolução** — com baseline, arquitetura conhecida,
    requisitos recuperados e áreas críticas saneadas: NOVA IDEIA →
    OPUSCORE → VERICORE → SANACORE (se necessário) → RETEST → RELEASE.

---

# PARTE IX — CRITÉRIOS DE SUCESSO

O CoreTriad está funcionando quando o usuário pode escrever apenas
"Quero desenvolver um sistema de PCP para minha fábrica" e o sistema
conduz autonomamente IDEA → DISCOVERY → REQUIREMENTS → UC → BR →
ARCHITECTURE → BUILD → TEST → DOCUMENT → AUDIT → FINDINGS → REMEDIATION →
RETEST → RELEASE READINESS, parando apenas nos human gates.

E quando, para qualquer projeto, o sistema responde de forma rastreável:
quais módulos/requisitos/regras/casos de uso existem e quais faltam; quais
divergem da implementação; quais comportamentos não têm requisito; quais
requisitos/regras não têm teste; quais APIs estão desprotegidas; quais
permissões são inconsistentes; quais violações MVC/arquiteturais existem;
quais riscos de banco/segurança/integração existem; quais documentos estão
desatualizados; quais NFRs não têm evidência; quais findings foram
confirmados, com qual severidade, evidência, owner e reteste.

**Princípios institucionais:**
- OpusCore: construir corretamente e demonstrar como foi construído.
- VeriCore: verificar independentemente e provar se está correto.
- SanaCore: corrigir a causa e demonstrar como foi corrigida.
- VeriCore novamente: confirmar que a correção resolveu.
- CoreTriad: cada empresa no momento certo, com a autoridade certa, sem
  interferência indevida.

> Nenhum comportamento crítico deve existir sem origem, requisito,
> implementação verificável, teste e evidência.
> Nenhum finding crítico deve ser aceito sem evidência e validação
> independente.
> O objetivo não é fazer o máximo sem humano — é permitir que o máximo
> seja executado autonomamente sem comprometer responsabilidade,
> segurança, rastreabilidade e qualidade.
