FINDING_ID: AUD-QA-001

TITLE: Suíte de integração NÃO está verde no commit atual de main (2/247 testes falhando) e o CLAUDE.md não registra essa regressão
DOMAIN: Qualidade / QA
SUBDOMAIN: Test coverage / release readiness

SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: OPEN

DESCRIPTION:
A execução real (2026-08-12, ordenada pelo orquestrador desta auditoria) de
`cd server && NODE_OPTIONS=--max-old-space-size=4096 npm run test:integration`
no commit `dc52081` (HEAD de `main`) resultou em:

    Test Suites: 2 failed, 57 passed, 59 total
    Tests:       2 failed, 245 passed, 247 total

As duas falhas são: `traceability-and-audit-log-regression.test.ts` (timeout de
5000ms numa query real de `GET /api/traceability/items/:id` que levou
12606ms) e `rbac-maintenance-service-orders-access-denied.test.ts` +
`rbac-directorate-access-denied.test.ts` (timeout em `AccessProfile.create()`).
`CLAUDE.md` (lido diretamente do disco) declara a suíte de integração como
"211 testes / 53 suítes... sem skips" e a trata implicitamente como
referência de saúde do sistema ("suíte de integração real 211/211" na linha
de versão do rodapé) — nenhum texto no documento admite que a suíte
atualmente reprova 2 testes reais contra PostgreSQL real. Isso não é
documentação desatualizada apenas em contagem (ver AUD-QA-004) — é ausência
de registro de uma regressão que já existe no código de `main`.

EXPECTED_BEHAVIOR:
O critério de aceite que o próprio `CLAUDE.md` define ("Critério de aceite
corrigido em 2026-08-10... o aceite honesto é uma escrita real bem-sucedida
no fluxo principal") pressupõe que a suíte de integração contra Postgres
real está verde antes de qualquer alegação de prontidão. Uma regressão real
e reproduzível (não flake de infraestrutura, ver AUD-QA-002) deveria estar
registrada em `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` ou equivalente,
não silenciosamente ausente da SSOT.

ACTUAL_BEHAVIOR:
2 suítes de integração falham na execução real contra o banco de teste real,
sem qualquer menção no `CLAUDE.md` (SSOT) ou nos números medidos no
`SYSTEM_INVENTORY.md` desta mesma auditoria — porque aquele inventário não
teve ferramenta de execução e citou apenas a contagem de arquivos.

EVIDENCE:
FILE: server/tests/integration/traceability-and-audit-log-regression.test.ts
LINES: 56-61 (a query que estoura o timeout)
FILE: server/tests/integration/rbac-maintenance-service-orders-access-denied.test.ts
LINES: 50-52 (AccessProfile.create() que estoura o timeout)
FILE: server/tests/integration/rbac-directorate-access-denied.test.ts
LINES: 50-52 (mesmo padrão)
Saída real de execução (fornecida pelo orquestrador, 2026-08-12):
"Test Suites: 2 failed, 57 passed, 59 total / Tests: 2 failed, 245 passed, 247 total"

RELATED_REQUIREMENT: Critério de aceite corrigido, CLAUDE.md §"Critério de aceite corrigido em 2026-08-10"
RELATED_BUSINESS_RULE: N/A
RELATED_USE_CASE: UC de rastreabilidade de item (ISO 9001 §8.5.2) e RBAC por módulo (accessProfiles)
RELATED_TEST: traceability-and-audit-log-regression.test.ts; rbac-directorate-access-denied.test.ts; rbac-maintenance-service-orders-access-denied.test.ts

BUSINESS_IMPACT: A cadeia de rastreabilidade (exigida por ISO 9001 e citada como pilar do módulo de Qualidade) tem uma regressão de performance mensurável e reproduzível numa auditoria comum. Declarar "17/17 gaps fechados" e "suíte verde" sem esta ressalva é uma alegação de prontidão não sustentada pela evidência.
TECHNICAL_IMPACT: Falso senso de segurança no pipeline (CI roda `test:api:strict`, que aborta em skip mas não necessariamente falha visivelmente o merge se o time olhar só o resumo).
SECURITY_IMPACT: Nenhum diretamente, mas RBAC é módulo de segurança e seus testes de regressão negativa (403) estão instáveis — reduz a confiança na cobertura de controle de acesso.

REPRODUCTION:
cd server && npm run test:integration (contra banco `erp_evok_audio_test`, commit dc52081)

REFERENCE: CLAUDE.md, seção "Critério de aceite corrigido em 2026-08-10"

RECOMMENDATION: Registrar esta regressão em `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` (ou sucessor) com data de descoberta 2026-08-12, vincular a AUD-QA-002 como causa técnica, e não permitir fechamento/aprovação de Go-Live enquanto a suíte de integração não estiver verde de forma reprodutível (não apenas "verde na próxima tentativa").

SUGGESTED_OWNER: qa-engineer / backend-engineer (Development Organization) + software-audit-director para acompanhamento

RETEST_REQUIRED: Yes
