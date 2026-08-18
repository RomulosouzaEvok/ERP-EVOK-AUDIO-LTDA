> ## DOCUMENTO HISTÓRICO
> Playbook datado de uma sessão anterior. Consulte o estado vivo do repositório e os PRs abertos para a situação atual.

# CODEX Playbook Checklist

Este arquivo contÃ©m o checklist completo e executÃ¡vel que o Codex/VSCode deve usar para aplicar as remediaÃ§Ãµes e configuraÃ§Ãµes no repositÃ³rio ERP-EVOK-AUDIO-LTDA. Cole este arquivo no repositÃ³rio e, localmente no VS Code, coloque o Codex para executar as tarefas em sequÃªncia.

---

## Resumo rÃ¡pido

Siga a ordem abaixo no VS Code (terminal integrado). Cada seÃ§Ã£o indica comandos exatos, arquivos a criar/editar, mensagens de commit e pontos onde parar para aprovaÃ§Ã£o humana (gates CoreTriad).

---

## Passo 0 â€” PreparaÃ§Ã£o no VS Code (setup)

1) Abra o repositÃ³rio no VS Code (File â†’ Open Folder â†’ pasta do repo).
2) Abra o terminal integrado (Ctrl+`).
3) Verifique branch atual e sincronize:
   - git fetch --all
   - git checkout main
   - git pull origin main
4) Instale dependÃªncias (servidor e client):
   - cd server
   - npm ci
   - cd ../client
   - npm ci
   - cd ..

---

## Passo 1 â€” Criar branch de inventÃ¡rio e adicionar arquivo de inventÃ¡rio

1) Criar branch:
   - git checkout -b remediation/inventory-001
2) Criar arquivo `docs/remediation-inventory.md` com inventÃ¡rio (modelo/placeholder).
3) Commit & push:
   - git add docs/remediation-inventory.md
   - git commit -m "docs(remediation): add remediation inventory (diagnostic)"
   - git push -u origin remediation/inventory-001
4) Abrir PR (via gh ou UI):
   - gh pr create --title "Diagnostic: remediation inventory" --body "InventÃ¡rio inicial de remediation cases. Ver docs/remediation-inventory.md." --base main

---

## Passo 2 â€” Enforce secrets (branch remediation/001-enforce-secrets)

1) Criar branch:
   - git checkout main
   - git pull origin main
   - git checkout -b remediation/001-enforce-secrets
2) Criar/editar arquivo `server/src/config/runtimeEnv.ts` com validaÃ§Ã£o fail-fast para JWT_SECRET e ADMIN_SEED_PASSWORD.
3) Criar teste unitÃ¡rio `server/tests/unit/runtime-env-fail-fast.test.ts`.
4) Rodar checks locais:
   - cd server
   - npm run typecheck
   - npm run test:unit
5) Commit & push:
   - git add server/src/config/runtimeEnv.ts server/tests/unit/runtime-env-fail-fast.test.ts
   - git commit -m "fix(security): fail-fast when JWT_SECRET missing or default (CASE-005)"
   - git push -u origin remediation/001-enforce-secrets
6) Abrir PR:
   - gh pr create --title "Remediation CASE-005: enforce required secrets" --body "Fail-fast when JWT_SECRET/ADMIN_SEED_PASSWORD invalid. Inclui teste unitÃ¡rio." --base main

**Gate humano**: este change faz o servidor falhar ao iniciar se JWT_SECRET for fraco. Em dev/staging Ã© OK; para produÃ§Ã£o, NÃƒO rotacione sem APR. Inclua no PR: "Gate: rotacionamento de segredos em produÃ§Ã£o exige APPROVAL APR-XXXX".

---

## Passo 3 â€” Request-id + logger (branch remediation/002-request-id-logger)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/002-request-id-logger
2) Criar os arquivos:
   - `server/src/middlewares/requestId.ts`
   - `server/src/config/logger.ts`
3) Registrar middleware no app (`server/app.ts` ou equivalente):
   - importar e usar `requestIdMiddleware` logo apÃ³s body-parsers: `app.use(requestIdMiddleware)`.
4) Adicionar testes unitÃ¡rios (validar X-Request-Id header e passagem no logger).
5) Rodar:
   - cd server
   - npm run typecheck
   - npm run test:unit
6) Commit & push:
   - git add server/src/middlewares/requestId.ts server/src/config/logger.ts server/app.ts server/src/config/__tests__/*
   - git commit -m "feat(logging): add request-id middleware and structured logger"
   - git push -u origin remediation/002-request-id-logger
7) Abrir PR:
   - gh pr create --title "Remediation: add request-id middleware and structured logging" --body "Add request-id middleware and structured JSON logger. Improves traceability." --base main

---

## Passo 4 â€” Idempotency (branch remediation/003-idempotency)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/003-idempotency
2) Criar arquivos:
   - `server/src/middlewares/idempotency.ts`
   - `server/src/models/IdempotencyKeyModel.ts`
   - `server/src/migrations/20260818-create-idempotency-keys.js`
3) Aplicar middleware somente nas rotas mutativas crÃ­ticas (ex.: criaÃ§Ã£o de vendas).
4) Escrever teste de integraÃ§Ã£o `server/tests/integration/idempotency.sales.test.ts`.
5) Rodar integration tests (usar docker-compose.test.yml ou testcontainers):
   - docker compose -f docker-compose.test.yml up -d
   - export DATABASE_URL=postgres://test:test@localhost:5432/erp_evok_audio_test
   - cd server
   - npm run test:integration
6) Commit & push:
   - git add server/src/middlewares/idempotency.ts server/src/models/IdempotencyKeyModel.ts server/src/migrations/20260818-create-idempotency-keys.js server/tests/integration/idempotency.sales.test.ts
   - git commit -m "feat(idempotency): add idempotency middleware + migration + tests (CASE-001)"
   - git push -u origin remediation/003-idempotency
7) Abrir PR:
   - gh pr create --title "Remediation CASE-001: idempotency for mutative endpoints" --body "Add idempotency keys table and middleware; integration test included." --base main

---

## Passo 5 â€” Corrigir escrita fantasma de inventÃ¡rio (branch remediation/004-fix-inventory-initial)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/004-fix-inventory-initial
2) Localize handlers nas pastas modules/items e modules/inventory (pesquisa por: estoque_atual, initialStock, createItem, inventory_movements, estoque_reservado).
3) AlteraÃ§Ãµes recomendadas:
   - Ao criar item: garantir estoque inicial = 0 (zeroInitialStock).
   - Remover atribuiÃ§Ãµes diretas de estoque_atual que nÃ£o criam movimento.
   - Criar endpoint admin-only: POST /api/inventory/initial-load que cria movimentos inventory_movements (source=initial_load, supervisorApproval). 
4) Escrever testes (unit + integration/characterization).
5) Rodar testes:
   - cd server
   - npm run test:unit
   - npm run test:integration
6) Commit & push:
   - git add modificaÃ§Ãµes
   - git commit -m "fix(inventory): ensure initial stock zero on item creation; add admin initial-load endpoint (CASE-006/017)"
   - git push -u origin remediation/004-fix-inventory-initial
7) Abrir PR:
   - gh pr create --title "Remediation CASE-006/017: fix initial stock behavior" --body "Guarantee item created with zero initial stock; added admin initial-load endpoint for authorized initial loads." --base main

**Gate humano**: CASE-017 tem PENDING_DECISION â€” ver `coretriad/governance/APPROVALS.md`. Se nÃ£o existir APR, marque o PR como needs-decision e nÃ£o feche o case.

---

## Passo 6 â€” Adicionar CI (branch ci/add-ci)

1) Criar branch:
   - git checkout main
   - git checkout -b ci/add-ci
2) Criar arquivo `.github/workflows/ci.yml` com pipeline que roda typecheck, unit tests e integration tests usando um serviÃ§o Postgres.
3) Commit & push:
   - git add .github/workflows/ci.yml
   - git commit -m "ci: add GitHub Actions CI to run typecheck, unit and integration tests"
   - git push -u origin ci/add-ci
4) Abrir PR:
   - gh pr create --title "ci: add CI pipeline (typecheck, unit, integration, client build)" --body "Adds CI pipeline with Postgres service for integration tests." --base main

---

## Passo 7 â€” Evidence & Verdict files

1) Para cada case corrigido localmente:
   - Crie pasta `remediation/cases/ERP-LEGACY-001-CASE-XXX/` (se nÃ£o existir).
   - Adicione `REMEDIATION_EVIDENCE_PACKAGE.md` com o resumo da remediaÃ§Ã£o e comandos e saÃ­das dos testes.
   - Quando estiver pronto para fechar (apÃ³s reteste automatizado/manual/verificado), crie `VERDICT_CASE-XXX.md` conforme template.
2) Commit & push os arquivos de evidence com o PR de cada case.

---

## Passo 8 â€” RevisÃ£o, merges e gates finais

1) Nos PRs que exigem aprovaÃ§Ã£o humana (rotacionamento de segredos, alteraÃ§Ã£o de dados de produÃ§Ã£o, decisÃµes de negÃ³cio), adicione comentÃ¡rio pedindo approver especÃ­fico e referencie `coretriad/governance/APPROVALS.md`.
2) ApÃ³s CI verde e revisÃ£o humana, faÃ§a o merge (squash preferred) e delete a branch.
3) Atualize `remediation/cases/.../REMEDIATION_EVIDENCE_PACKAGE.md` e crie `VERDICT_CASE-XXX.md` quando aplicÃ¡vel.

---

## Comandos Ãºteis de PR/Merge

- Abrir PR com CLI (gh):
  - gh pr create --title "..." --body "..." --base main
- Merge apÃ³s aprovaÃ§Ã£o:
  - gh pr merge <PR_number> --squash --delete-branch

---

## Checks obrigatÃ³rios antes de merge

- cd server && npm run typecheck => 0 erros
- cd server && npm run test:unit => green
- cd server && npm run test:integration => green (usar DB de teste)
- cd client && npm run build && npm run lint => sem erros
- docker compose config => exit 0
- npm run scan:secrets => sem segredos comprometidos

---

## Dicas prÃ¡ticas no VS Code

- ExtensÃµes recomendadas: ESLint, Prettier, TypeScript, Jest Runner, GitLens, GitHub Pull Requests and Issues
- Use a aba Source Control para staged files e commits pequenos.
- Use o terminal integrado para executar os scripts npm.
- Use REST Client ou Thunder Client para testar endpoints localmente.
- Para rodar integration tests com containers localmente: `docker compose -f docker-compose.test.yml up -d` (se existir) ou rode testes que criam DB via testcontainers.

---

## Gates que exigem aprovaÃ§Ã£o humana (NÃƒO automatize)

- RotaÃ§Ã£o de secrets JWT_SECRET / ADMIN_SEED_PASSWORD em produÃ§Ã£o.
- MudanÃ§as que toquem tabelas/dados marcados como produÃ§Ã£o real em `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`.
- DecisÃµes de negÃ³cio listadas em `remediation/cases/PENDING_DECISIONS_2026-08-17.md`.

---

## PrÃ³ximos passos sugeridos (apÃ³s criar este arquivo)

1) No VS Code: puxe a branch `remediation/bootstrap-artifacts` e verifique o arquivo `docs/CODEX-PLAYBOOK-CHECKLIST.md`.
   - git fetch
   - git checkout remediation/bootstrap-artifacts
   - code .
2) Use o Codex/VSCode automation para executar os passos na ordem (comece pelo passo 1: inventÃ¡rio).
3) Se algo falhar, cole o log aqui e eu te ajudarei a corrigir.

---

Arquivo gerado por: GitHub Copilot (assistente). Siga estritamente as gates CoreTriad descritas no repositÃ³rio antes de executar aÃ§Ãµes que impactam produÃ§Ã£o.
