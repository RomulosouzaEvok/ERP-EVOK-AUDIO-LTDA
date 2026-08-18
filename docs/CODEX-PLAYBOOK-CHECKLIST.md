# CODEX Playbook Checklist

Este arquivo contém o checklist completo e executável que o Codex/VSCode deve usar para aplicar as remediações e configurações no repositório ERP-EVOK-AUDIO-LTDA. Cole este arquivo no repositório e, localmente no VS Code, coloque o Codex para executar as tarefas em sequência.

---

## Resumo rápido

Siga a ordem abaixo no VS Code (terminal integrado). Cada seção indica comandos exatos, arquivos a criar/editar, mensagens de commit e pontos onde parar para aprovação humana (gates CoreTriad).

---

## Passo 0 — Preparação no VS Code (setup)

1) Abra o repositório no VS Code (File → Open Folder → pasta do repo).
2) Abra o terminal integrado (Ctrl+`).
3) Verifique branch atual e sincronize:
   - git fetch --all
   - git checkout main
   - git pull origin main
4) Instale dependências (servidor e client):
   - cd server
   - npm ci
   - cd ../client
   - npm ci
   - cd ..

---

## Passo 1 — Criar branch de inventário e adicionar arquivo de inventário

1) Criar branch:
   - git checkout -b remediation/inventory-001
2) Criar arquivo `docs/remediation-inventory.md` com inventário (modelo/placeholder).
3) Commit & push:
   - git add docs/remediation-inventory.md
   - git commit -m "docs(remediation): add remediation inventory (diagnostic)"
   - git push -u origin remediation/inventory-001
4) Abrir PR (via gh ou UI):
   - gh pr create --title "Diagnostic: remediation inventory" --body "Inventário inicial de remediation cases. Ver docs/remediation-inventory.md." --base main

---

## Passo 2 — Enforce secrets (branch remediation/001-enforce-secrets)

1) Criar branch:
   - git checkout main
   - git pull origin main
   - git checkout -b remediation/001-enforce-secrets
2) Criar/editar arquivo `server/src/config/runtimeEnv.ts` com validação fail-fast para JWT_SECRET e ADMIN_SEED_PASSWORD.
3) Criar teste unitário `server/src/config/__tests__/runtimeEnv.test.ts`.
4) Rodar checks locais:
   - cd server
   - npm run typecheck
   - npm run test:unit
5) Commit & push:
   - git add server/src/config/runtimeEnv.ts server/src/config/__tests__/runtimeEnv.test.ts
   - git commit -m "fix(security): fail-fast when JWT_SECRET missing or default (CASE-005)"
   - git push -u origin remediation/001-enforce-secrets
6) Abrir PR:
   - gh pr create --title "Remediation CASE-005: enforce required secrets" --body "Fail-fast when JWT_SECRET/ADMIN_SEED_PASSWORD invalid. Inclui teste unitário." --base main

**Gate humano**: este change faz o servidor falhar ao iniciar se JWT_SECRET for fraco. Em dev/staging é OK; para produção, NÃO rotacione sem APR. Inclua no PR: "Gate: rotacionamento de segredos em produção exige APPROVAL APR-XXXX".

---

## Passo 3 — Request-id + logger (branch remediation/002-request-id-logger)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/002-request-id-logger
2) Criar os arquivos:
   - `server/src/middlewares/requestId.ts`
   - `server/src/config/logger.ts`
3) Registrar middleware no app (`server/app.ts` ou equivalente):
   - importar e usar `requestIdMiddleware` logo após body-parsers: `app.use(requestIdMiddleware)`.
4) Adicionar testes unitários (validar X-Request-Id header e passagem no logger).
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

## Passo 4 — Idempotency (branch remediation/003-idempotency)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/003-idempotency
2) Criar arquivos:
   - `server/src/middlewares/idempotency.ts`
   - `server/src/models/IdempotencyKeyModel.ts`
   - `server/src/migrations/20260818-create-idempotency-keys.js`
3) Aplicar middleware somente nas rotas mutativas críticas (ex.: criação de vendas).
4) Escrever teste de integração `server/test/integration/idempotency.sales.test.ts`.
5) Rodar integration tests (usar docker-compose.test.yml ou testcontainers):
   - docker compose -f docker-compose.test.yml up -d
   - export DATABASE_URL=postgres://test:test@localhost:5432/erp_evok_audio_test
   - cd server
   - npm run test:integration
6) Commit & push:
   - git add server/src/middlewares/idempotency.ts server/src/models/IdempotencyKeyModel.ts server/src/migrations/20260818-create-idempotency-keys.js server/test/integration/idempotency.sales.test.ts
   - git commit -m "feat(idempotency): add idempotency middleware + migration + tests (CASE-001)"
   - git push -u origin remediation/003-idempotency
7) Abrir PR:
   - gh pr create --title "Remediation CASE-001: idempotency for mutative endpoints" --body "Add idempotency keys table and middleware; integration test included." --base main

---

## Passo 5 — Corrigir escrita fantasma de inventário (branch remediation/004-fix-inventory-initial)

1) Criar branch:
   - git checkout main
   - git checkout -b remediation/004-fix-inventory-initial
2) Localize handlers nas pastas modules/items e modules/inventory (pesquisa por: estoque_atual, initialStock, createItem, inventory_movements, estoque_reservado).
3) Alterações recomendadas:
   - Ao criar item: garantir estoque inicial = 0 (zeroInitialStock).
   - Remover atribuições diretas de estoque_atual que não criam movimento.
   - Criar endpoint admin-only: POST /api/inventory/initial-load que cria movimentos inventory_movements (source=initial_load, supervisorApproval). 
4) Escrever testes (unit + integration/characterization).
5) Rodar testes:
   - cd server
   - npm run test:unit
   - npm run test:integration
6) Commit & push:
   - git add modificações
   - git commit -m "fix(inventory): ensure initial stock zero on item creation; add admin initial-load endpoint (CASE-006/017)"
   - git push -u origin remediation/004-fix-inventory-initial
7) Abrir PR:
   - gh pr create --title "Remediation CASE-006/017: fix initial stock behavior" --body "Guarantee item created with zero initial stock; added admin initial-load endpoint for authorized initial loads." --base main

**Gate humano**: CASE-017 tem PENDING_DECISION — ver `coretriad/governance/APPROVALS.md`. Se não existir APR, marque o PR como needs-decision e não feche o case.

---

## Passo 6 — Adicionar CI (branch ci/add-ci)

1) Criar branch:
   - git checkout main
   - git checkout -b ci/add-ci
2) Criar arquivo `.github/workflows/ci.yml` com pipeline que roda typecheck, unit tests e integration tests usando um serviço Postgres.
3) Commit & push:
   - git add .github/workflows/ci.yml
   - git commit -m "ci: add GitHub Actions CI to run typecheck, unit and integration tests"
   - git push -u origin ci/add-ci
4) Abrir PR:
   - gh pr create --title "ci: add CI pipeline (typecheck, unit, integration, client build)" --body "Adds CI pipeline with Postgres service for integration tests." --base main

---

## Passo 7 — Evidence & Verdict files

1) Para cada case corrigido localmente:
   - Crie pasta `remediation/cases/ERP-LEGACY-001-CASE-XXX/` (se não existir).
   - Adicione `REMEDIATION_EVIDENCE_PACKAGE.md` com o resumo da remediação e comandos e saídas dos testes.
   - Quando estiver pronto para fechar (após reteste automatizado/manual/verificado), crie `VERDICT_CASE-XXX.md` conforme template.
2) Commit & push os arquivos de evidence com o PR de cada case.

---

## Passo 8 — Revisão, merges e gates finais

1) Nos PRs que exigem aprovação humana (rotacionamento de segredos, alteração de dados de produção, decisões de negócio), adicione comentário pedindo approver específico e referencie `coretriad/governance/APPROVALS.md`.
2) Após CI verde e revisão humana, faça o merge (squash preferred) e delete a branch.
3) Atualize `remediation/cases/.../REMEDIATION_EVIDENCE_PACKAGE.md` e crie `VERDICT_CASE-XXX.md` quando aplicável.

---

## Comandos úteis de PR/Merge

- Abrir PR com CLI (gh):
  - gh pr create --title "..." --body "..." --base main
- Merge após aprovação:
  - gh pr merge <PR_number> --squash --delete-branch

---

## Checks obrigatórios antes de merge

- cd server && npm run typecheck => 0 erros
- cd server && npm run test:unit => green
- cd server && npm run test:integration => green (usar DB de teste)
- cd client && npm run build && npm run lint => sem erros
- docker compose config => exit 0
- npm run scan:secrets => sem segredos comprometidos

---

## Dicas práticas no VS Code

- Extensões recomendadas: ESLint, Prettier, TypeScript, Jest Runner, GitLens, GitHub Pull Requests and Issues
- Use a aba Source Control para staged files e commits pequenos.
- Use o terminal integrado para executar os scripts npm.
- Use REST Client ou Thunder Client para testar endpoints localmente.
- Para rodar integration tests com containers localmente: `docker compose -f docker-compose.test.yml up -d` (se existir) ou rode testes que criam DB via testcontainers.

---

## Gates que exigem aprovação humana (NÃO automatize)

- Rotação de secrets JWT_SECRET / ADMIN_SEED_PASSWORD em produção.
- Mudanças que toquem tabelas/dados marcados como produção real em `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`.
- Decisões de negócio listadas em `remediation/cases/PENDING_DECISIONS_2026-08-17.md`.

---

## Próximos passos sugeridos (após criar este arquivo)

1) No VS Code: puxe a branch `remediation/bootstrap-artifacts` e verifique o arquivo `docs/CODEX-PLAYBOOK-CHECKLIST.md`.
   - git fetch
   - git checkout remediation/bootstrap-artifacts
   - code .
2) Use o Codex/VSCode automation para executar os passos na ordem (comece pelo passo 1: inventário).
3) Se algo falhar, cole o log aqui e eu te ajudarei a corrigir.

---

Arquivo gerado por: GitHub Copilot (assistente). Siga estritamente as gates CoreTriad descritas no repositório antes de executar ações que impactam produção.
