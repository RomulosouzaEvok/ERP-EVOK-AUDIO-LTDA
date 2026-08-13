FINDING_ID: AUD-QA-004

TITLE: CLAUDE.md (SSOT) reporta contagens de teste desatualizadas frente à execução real de 2026-08-12 (unit: 1848/172 vs. real 1952/177; integration: 211/53 vs. real 247/59 com 2 falhas)
DOMAIN: Documentação / Governança
SUBDOMAIN: Drift de documentação (mesma classe já coberta por docs-reality-drift-guard, mas de contagem de teste, não de migration/caminho)

SEVERITY: LOW
CONFIDENCE: CONFIRMED

DESCRIPTION:
`CLAUDE.md` (lido diretamente do disco nesta sessão, seção "Runbook
Operacional" / "Setup Local") declara:
"npm run test:unit # 1848 testes / 172 suítes (repositório dublê)"
"npm run test:integration # 211 testes / 53 suítes contra PostgreSQL real, sem skips"
ambas "medido 2026-08-12".

A execução real fornecida ao auditor nesta mesma data (2026-08-12), pelo
orquestrador, contra o mesmo commit (`dc52081`), deu:
- `npm run test:unit`: "Test Suites: 177 passed, 177 total / Tests: 1952 passed, 1952 total"
- `npm run test:integration`: "Test Suites: 2 failed, 57 passed, 59 total / Tests: 2 failed, 245 passed, 247 total"

Isto é uma divergência real e mensurável, não uma alucinação de contexto
injetado (diferente do achado de calibração já registrado em
`SYSTEM_INVENTORY.md`, que foi sobre um snapshot de CLAUDE.md desatualizado
NO CONTEXTO DA SESSÃO vs. o arquivo real em disco — aqui o PRÓPRIO arquivo em
disco, lido corretamente, está com números que não batem com a execução real
do dia que ele mesmo alega ter medido). A diferença de suítes (172→177
unit, 53→59 integration) é compatível com arquivos de teste novos
adicionados depois da última vez que alguém rodou a suíte e atualizou o
texto — mas o texto usa o mesmo carimbo de data "medido 2026-08-12" tanto
para o valor antigo quanto (implicitamente) para o estado atual do dia,
criando uma alegação de precisão que a evidência real não sustenta.

EXPECTED_BEHAVIOR:
Todo número citado como "medido" em `CLAUDE.md` deveria refletir a última
execução real conhecida, com o carimbo de data/hora daquela execução — e
não ser reescrito manualmente sem re-rodar a suíte.

ACTUAL_BEHAVIOR:
Os números creditados a "medido 2026-08-12" estão defasados em relação a uma
execução real do mesmo dia (177 suítes/1952 testes unit reais vs. 172/1848
declarados; 59 suítes/247 testes integration reais — com 2 falhas atuais,
ver AUD-QA-001 — vs. 53/211 declarados, sem qualquer menção a falha).

EVIDENCE:
FILE: CLAUDE.md
LINES: (seção "Runbook Operacional", bloco de comandos `npm run test:unit` / `npm run test:integration`, texto: "1848 testes / 172 suítes" e "211 testes / 53 suítes contra PostgreSQL real, sem skips")
Execução real fornecida pelo orquestrador (2026-08-12), commit dc52081:
"Test Suites: 177 passed, 177 total / Tests: 1952 passed, 1952 total" (unit)
"Test Suites: 2 failed, 57 passed, 59 total / Tests: 2 failed, 245 passed, 247 total" (integration)

RELATED_REQUIREMENT: CLAUDE.md como SSOT ("Single Source of Truth")
RELATED_BUSINESS_RULE: N/A
RELATED_USE_CASE: N/A
RELATED_TEST: N/A

BUSINESS_IMPACT: Baixo isoladamente (é contagem de teste, não regra de negócio), mas corrói a confiabilidade da SSOT que o próprio projeto elegeu como fonte única de verdade — o mesmo padrão de erro (número "medido" que não bate com a realidade) que motivou a criação das guardas `docs-reality-drift-guard`/`docs-path-reference-guard` em 2026-08-12.
TECHNICAL_IMPACT: Nenhum diretamente sobre o sistema em produção.
SECURITY_IMPACT: Nenhum.

REPRODUCTION:
cd server && npm run test:unit && npm run test:integration; comparar saída com o texto de CLAUDE.md na seção citada.

REFERENCE: Convenção de "todo número deve vir de execução real com evidência", já adotada pelo próprio framework de auditoria (ver SCOPE.md e SYSTEM_INVENTORY.md desta mesma auditoria, seções sobre calibração de contexto)

RECOMMENDATION: Atualizar CLAUDE.md com os números reais (1952 testes/177 suítes unit; 247 testes/59 suítes integration) E registrar explicitamente as 2 falhas atuais de integração (ligando a AUD-QA-001/002) em vez de declarar a suíte como limpa. Considerar estender `docs-reality-drift-guard` (ou criar guarda irmã) para também comparar a contagem de teste declarada em CLAUDE.md contra a contagem real de arquivos `*.test.ts` (como o `SYSTEM_INVENTORY.md` já fez manualmente por Glob) — reduziria a chance de nova divergência silenciosa.

SUGGESTED_OWNER: Quem mantém CLAUDE.md (documentação/governança) — Development Organization

RETEST_REQUIRED: No
