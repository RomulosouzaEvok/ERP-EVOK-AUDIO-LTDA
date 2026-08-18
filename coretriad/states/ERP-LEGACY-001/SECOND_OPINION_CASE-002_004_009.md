# Segunda opinião (VeriCore / Claude Code) — CASE-002 (FIND-ERP-005), CASE-004, CASE-009

Revisão adversarial de código real (diff das worktrees `sana/...`), antes do
reteste dinâmico formal. Cada revisor trabalhou isolado, sem ver o trabalho dos
outros dois. Nenhuma conexão com `erp_evok_audio` (produção) foi aberta por
nenhum revisor. Nenhum revisor executou a suíte de testes — os números
declarados nos pacotes de evidência (ex. "95/95", "20/20") são afirmação do
autor, não reproduzidos aqui.

---

## CASE-002 / FIND-ERP-005 (alçada de contrato jurídico) — worktree `sana/ERP-LEGACY-001/FIND-ERP-005`

**F1 (thresholds configuráveis): APROVA_COM_RESSALVA — achado explorável.**
`jur_approval_thresholds` + `approvalPolicy.ts` implementados, fail-closed
quando a tabela está vazia. Mas `validatePayload` não valida contiguidade nem
ausência de lacunas entre faixas. Um `juridico:approve` pode cadastrar
`0–50000` e `300000–∞`, deixando a faixa `50000–300000` sem dono. Um contrato
de R$ 100.000 cai na lacuna → `matched = null` → `requiredRoles = []` → **ativa
sem nenhuma aprovação**. É o mesmo defeito que a remediação existe para
fechar, agora escondido detrás de uma tabela em vez de uma constante. Nenhum
teste exercita política com lacuna. `min_value` é exclusivo (valor exatamente
0 nunca casa faixa).
**Recomendação: tratar como bloqueante antes do reteste formal** — ou a
migration/`approvalPolicy` passa a validar contiguidade na escrita, ou
`resolveContractApprovalPolicy` deve fail-closed (rejeitar ativação) quando
`matched === null`, não apenas quando a tabela está vazia.

**F2 (nível `approve` na rota): APROVA_COM_RESSALVA.**
`requiredLevel: 'approve'` aplicado; truthiness trocada por `===` estrito.
Ressalva: `role === 'admin'` continua aprovando os dois lados sem qualquer
checagem de nível — nenhum teste exercita "admin sem approve". O enforcement
de nível é, na prática, opcional para quem hoje administra o sistema.

**F3 (aditivo reabre alçada): APROVA_COM_RESSALVA.**
`new_value` fora de `change_type='value'` passou a ser rejeitado; reabertura
de alçada implementada; `requesterHasApprove` não é spoofável pelo body.
Inconsistência real: `approved_value === null` é tratado como "cobre qualquer
valor" em `ActivateContractUseCase`, mas como "não cobre" no fluxo do
aditivo — e a migration faz backfill de `approved_value` como NULL. A defesa
de que isso é seguro hoje é "0 linhas em produção" (afirmação documental, não
invariante de schema/código).

**F4 (identidade / segregação): APROVA.**
`assertApproverIsNotPriorApprover` + `assertApproverIsNotRequester`, sem
isenção para admin, com índice único parcial no banco. Tentativa de contorno
(reaprovar via aditivo que invalida a aprovação anterior) não encontrou
brecha. Fraqueza residual não confirmada: se `jur_contracts.created_by` puder
ser NULL, R4(d) não bloqueia.

**Divergência de higiene registrada:** o commit `67b49fb` (todo o código de
produto) diz "remediação PARCIAL — NÃO concluída, NÃO retestável" na
mensagem, mas o `CASE_STATUS.md` e os commits posteriores tratam o caso como
completo. Não é um erro de código, é um risco de leitura para quem confiar só
na mensagem de commit.

**Não verificado por este revisor:** execução de qualquer suíte; estado do
banco de produção real; corpo completo do TRIAGE.md/EVIDENCE_PACKAGE
(resumos apenas); rotas de aditivo quanto ao nível exigido; se
`jur_contracts.created_by` é `NOT NULL`; `down()` da migration.

---

## CASE-004 (AUD-ALOG-01, employees + items) — worktree `sana/ERP-LEGACY-001/CASE-004`

**Item A (employees): APROVA_COM_RESSALVA.**
`logAction` instalado no call site certo, `req` real repassado, payload
restrito a `status`/`dismissal_date` (verificado: nenhuma serialização de
entidade inteira, `entityDescription` usa nome funcional, não CPF). Teste
novo faz varredura negativa por chave e por valor sobre o payload serializado
com um funcionário-dublê cheio de campos sensíveis. `'employees'` removido de
`DEBITO_CONHECIDO`. Nenhuma migration tocada.
Ressalvas: `entityId: Number(before?.id ?? req.params.id)` pode gerar `NaN`
se `before` vier nulo por um caminho não testado; o teste prova identidade do
`req` repassado (mock), não persistência real de USER/IP — isso fica para o
reteste dinâmico.

**Item B (items): APROVA_COM_RESSALVA.**
A armadilha do UUID (nomeada pela própria triagem) não foi acionada: Rota 2
implementada literalmente (`entityId: undefined`, sem cast, sem chamada
direta a `AuditLog.register`), com comentário citando `AUD-DB-04`/`OR-21`.
`'items'` removido de `DEBITO_CONHECIDO`, com o corolário de granularidade
(item C ainda mudo) escrito no comentário. Duas rotas exercitadas
separadamente.
Ressalva: prova de autoria ainda é via mock (`description`/`req.method`), não
via coluna persistida — fica para o reteste dinâmico.

**Não verificado:** execução de jest/tsc; nenhum banco; `DeactivateEmployeeUseCase`/`DeactivateItemUseCase` linha a linha além do que os testes implicam; itens C-H do finding.

---

## CASE-009 (FIND-ERP-002, escopo `audit_logs`) — worktree `sana/ERP-LEGACY-001/CASE-009`

**Veredito: APROVA_COM_RESSALVA.**
Migration cria função PL/pgSQL que bloqueia UPDATE/DELETE com `RAISE
EXCEPTION` (SQLSTATE 23000 válido), trigger `BEFORE UPDATE OR DELETE`, e
`ALTER TABLE ... ENABLE ALWAYS TRIGGER` em statement separado após o create —
ordem correta para sobreviver a `session_replication_role='replica'`.
`down()` remove trigger antes da função (ordem correta). Script de limpeza
(`limpar-dados-transacionais.cjs`) não foi tocado — `audit_logs` continua fora
de `PRESERVAR_EXATO`, conforme D4. Testes são puramente estáticos
(leitura de arquivo), nenhuma conexão real, nenhuma referência a
`erp_evok_audio`.

Ressalvas reais: (1) sem defesa contra `TRUNCATE` (trigger `FOR EACH ROW` não
dispara nesse comando) nem contra `ALTER TABLE ... DISABLE TRIGGER` por um
role com privilégio suficiente; (2) `ENABLE ALWAYS TRIGGER` exige que o role
da migration seja owner da tabela — não validado estaticamente, pode falhar
no deploy; (3) o rollback da transação inteira do script de limpeza ao
atingir `audit_logs` (efeito esperado de D4) não está documentado como
runbook operacional.

**Não verificado / pendente do reteste dinâmico da VeriCore contra
`erp_evok_audio_test`:** R1 (UPDATE falha), R2 (DELETE falha), R3 (DELETE sob
`session_replication_role='replica'` ainda falha), e sugerido: R4 (INSERT
legítimo continua passando), R5 (`up()` roda sem erro de permissão), R6
(`down()` reverte limpo), e confirmação explícita de que `TRUNCATE` não é
coberto.

---

## Síntese para o coretriad-director / dono

Nenhum dos três casos está pronto para `RETEST_PASSED` sem tratar pelo menos
um item cada:

- **CASE-002/FIND-ERP-005**: o gap de F1 (faixas com lacuna → ativação sem
  aprovação) é o mais grave dos três — recomendo tratá-lo como bloqueante,
  não como ressalva a "levar para o reteste". É um bypass completo da
  proteção que o caso existe para entregar.
- **CASE-004**: ressalvas são de robustez/teste, não de bypass funcional.
  Aceitável seguir para reteste dinâmico como está.
- **CASE-009**: ressalvas são de superfície de ataque não coberta
  (TRUNCATE, DISABLE TRIGGER), coerentes com o escopo declarado do caso
  (trigger, não RLS/REVOKE completo). Aceitável seguir para reteste, com
  R1-R6 nomeados.

Autoridade de `RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da
VeriCore após o reteste dinâmico (Regras 3-4 do CLAUDE.md). Nenhum veredito
final é declarado neste documento.
