# Despacho Codex — `ERP-LEGACY-001-CASE-009`

```
CASE_ID:      ERP-LEGACY-001-CASE-009
FINDING_ID:   FIND-ERP-002
ESCOPO:       audit_logs apenas
BASE:         remediation/cases/ERP-LEGACY-001-CASE-009/TRIAGE.md
DECISOES:     D1-D4 respondidas pelo dono em 2026-08-17
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Decisoes humanas que destravam este despacho

- `D1`: escopo do CASE-009 e **somente `audit_logs`**. `sale_invoices`, `accounting_entries` e `accounting_entry_items` ficam fora deste caso.
- `D2`: aplicar `O2`: congelar agora e aceitar o passivo existente em `audit_logs` como imutavel a partir de hoje. Nao mascarar, nao expurgar, nao atualizar dado legado.
- `D3`: usar `ENABLE ALWAYS` no trigger para impedir bypass por `session_replication_role = 'replica'`.
- `D4`: **Opção A** para `limpar-dados-transacionais.cjs`: nao adicionar `audit_logs` em `PRESERVAR_EXATO`. O script deve quebrar explicitamente ao tentar apagar `audit_logs`, com mensagem clara explicando que a tabela e protegida por desenho.

## 2. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente o CASE-009:

CASE_ID: ERP-LEGACY-001-CASE-009
FINDING_ID: FIND-ERP-002
Escopo autorizado: SOMENTE audit_logs.
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f.

Trabalhe exclusivamente na worktree/branch:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-009
  branch:   sana/ERP-LEGACY-001/CASE-009

Se a worktree ainda não existir, crie-a a partir da base adequada do repositório, sem tocar em main.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não abra conexão de banco nenhuma sem autorização explícita; este caso deve ser implementável com testes estáticos/unitários.
- Se algum acesso a banco for inevitável, use somente credencial/banco de teste com sufixo `_test`/`_ci`, e registre a necessidade antes; não use produção.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- Não toque em server/package.json, docker-compose.yml, .env*.example, server/index.ts, server/app.ts, src/config/runtimeEnv.ts, src/middlewares/auth.ts ou server/src/services/auditLogService.ts.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-009/TRIAGE.md.
2. Leia integralmente docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md.
3. Leia o molde de trigger existente:
   server/migrations/20260808-000014-create-hr-employee-contracts.cjs
4. Leia a DDL de audit_logs no baseline:
   server/database/postgresql/00_baseline_frozen.sql
5. Leia server/scripts/limpar-dados-transacionais.cjs o suficiente para entender que ele usa session_replication_role='replica' e que audit_logs NÃO deve ser preservada silenciosamente.
6. Leia server/src/models/AuditLog.ts e os testes unitários de audit log existentes para preservar o fluxo legítimo de INSERT.

Causa-raiz a remediar:
- audit_logs não tem proteção de banco contra UPDATE/DELETE.
- A aplicação só faz INSERT legítimo nessa tabela; portanto a imutabilidade de UPDATE/DELETE é regra de banco.
- REVOKE não é estratégia suficiente contra o runtime atual superusuário.
- Trigger normal em modo ORIGIN seria bypassável pelo caminho já existente em limpar-dados-transacionais.cjs via session_replication_role='replica'.

Estratégia autorizada:
1. Criar uma migration nova em server/migrations/ com timestamp/sequencial que não colida com as migrations existentes nem com a branch FIND-ERP-005.
2. A migration deve criar uma função PL/pgSQL para bloquear UPDATE e DELETE em public.audit_logs.
3. A função deve lançar exceção clara, em português ou inglês simples, explicando que audit_logs é imutável/protegida por desenho e que UPDATE/DELETE não são permitidos.
4. Criar trigger BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION ...
5. Aplicar ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER ... para que o bloqueio sobreviva a session_replication_role='replica'.
6. O down() deve remover trigger e função na ordem correta.
7. Não adicionar audit_logs a PRESERVAR_EXATO em limpar-dados-transacionais.cjs. A decisão do dono foi deixar o script quebrar explicitamente quando tentar apagar audit_logs.

Testes obrigatórios:
- Adicione teste(s) que falhem no AUDIT_COMMIT e passem depois.
- Pelo menos um teste estático deve verificar no arquivo da migration:
  a) criação de função de imutabilidade para audit_logs;
  b) trigger BEFORE UPDATE OR DELETE ON public.audit_logs;
  c) ENABLE ALWAYS TRIGGER;
  d) mensagem clara sobre audit_logs imutável/protegida;
  e) down() com DROP TRIGGER IF EXISTS antes de DROP FUNCTION IF EXISTS.
- Adicione guarda estática sobre server/scripts/limpar-dados-transacionais.cjs comprovando que audit_logs NÃO foi adicionada a PRESERVAR_EXATO e que a proteção esperada vem do trigger.
- Adicione ou mantenha teste unitário com mock de AuditLog garantindo que o INSERT legítimo via AuditLog.register/logAction continua sendo o caminho aceito, sem abrir banco.
- Não escreva teste que importe app.ts ou abra Sequelize real por acidente.

Prova vermelha:
- Execute os testes novos contra AUDIT_COMMIT em cópia temporária ou por técnica equivalente segura, sem conexão de banco.
- Registre no pacote de evidência quais asserts falharam antes.

Validação depois:
- Execute os testes novos.
- Execute a bateria unitária relevante de audit log.
- Execute typecheck/build do server se node_modules estiver disponível na worktree.
- Se dependências não estiverem instaladas, instale dentro da própria worktree. Se não for possível, registre a lacuna explicitamente no REMEDIATION_EVIDENCE_PACKAGE.md.

Evidência obrigatória:
- Gere remediation/cases/ERP-LEGACY-001-CASE-009/REMEDIATION_EVIDENCE_PACKAGE.md.
- Documente:
  - causa-raiz;
  - decisões D1-D4 aplicadas;
  - estratégia;
  - arquivos alterados;
  - testes adicionados;
  - prova vermelha no AUDIT_COMMIT;
  - prova verde após correção;
  - risco residual: R1-R3/DYN contra erp_evok_audio_test ainda precisam ser executados pela VeriCore para provar comportamento real de banco, especialmente UPDATE, DELETE e session_replication_role='replica';
  - que o passivo existente foi aceito como imutável a partir de hoje por decisão do dono;
  - que sale_invoices/accounting_entries ficaram fora de escopo.
- Termine o pacote com REMEDIATION_COMPLETE.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-009, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

## 3. Observacao para VeriCore

O despacho acima produz evidencia estatica e unitária. O reteste completo de eficacia do banco ainda precisa de trilha dinâmica controlada contra `erp_evok_audio_test`, nunca producao:

- `R1`: `UPDATE audit_logs` deve falhar.
- `R2`: `DELETE FROM audit_logs` deve falhar.
- `R3`: `SET LOCAL session_replication_role = 'replica'` seguido de `DELETE FROM audit_logs` ainda deve falhar por `ENABLE ALWAYS`.

Sem R1-R3, o reteste e incompleto por desenho, mesmo que a migration esteja textual e estaticamente correta.

