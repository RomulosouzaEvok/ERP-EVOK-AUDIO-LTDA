# Nothing directly relevant there. I have sufficient evidence to compose the trail report now.

> **Nota de persistência.** Produzido pelo `vericore-devops-auditor` (T-22 plataforma CI infra backup) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

## T-22 — PLATAFORMA · RELATÓRIO DE TRILHA

```
AUDIT_ID: ERP-LEGACY-001-AUD-001
TRILHA: T-22 — PLATAFORMA (governança do caminho commit→produção)
TITULAR: vericore-devops-auditor
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
COBERTURA EFETIVA: PARCIAL — leitura estática completa do escopo declarado
  (workflow, ambos os compose, scripts de backup em scripts/, docs/infra/,
  docs/database/07-DISASTER_RECOVERY.md, checklists de go-live). NENHUMA
  verificação dinâmica de branch protection/review obrigatório foi feita
  (vedado por regime + G4 sem execução) — dois pontos ficam como
  NÃO VERIFICADO, não como "conforme".
```

### Nota de correção de escopo

O plano cita `server/scripts/` para os scripts de backup, mas eles vivem em `scripts/` (raiz do repo): `scripts/backup-postgres.sh`, `scripts/backup-postgres.ps1`, `scripts/schedule-backup-cron.sh`, `scripts/schedule-backup-task.ps1`. Não há scripts de backup em `server/scripts/`. Documentado aqui para não gerar falso "OBS-INV" de ausência.

---

### RES-T22-01 — CI valida, mas não custodia nem publica o artefato que seria implantado

`.github/workflows/server-ci.yml:79-80` builda `erp-evok-audio-server:${{ github.sha }}` e roda smoke test contra ele (linhas 94-119), incluindo verificação de que a última migration é reversível (`migration:down && migration:up`, linhas 86-92) — isso é controle real de qualidade que T-18 não cobriu. **Porém a imagem nunca é `push`ada para nenhum registry** (nenhuma ocorrência de `docker push`/`registry`/`ECR`/`ghcr` no workflow) e é descartada ao fim do job.

O runbook de deploy real, `docs/infra/DEPLOY.md:14-20`, instrui o operador a rodar `docker build -t erp-evok-audio-server:2026-07-31-g5 .\server` **na própria máquina de deploy**, com uma tag arbitrária por data — sem qualquer referência ao SHA validado pelo CI, sem baixar a imagem que passou pelos testes. Ou seja: **a imagem que o CI aprova nunca é a imagem que sobe** — não há cadeia de custódia entre "commit validado em CI" e "artefato em produção". Um build local pode divergir do que passou no CI (dependências resolvidas em outro momento, `Dockerfile` idêntico mas contexto de build diferente).

- **T22-F01 — CI não produz artefato imutável rastreável até produção** (`.github/workflows/server-ci.yml:79-123`, `docs/infra/DEPLOY.md:14-20,75-102`). Severidade: **HIGH**. Confiança: **HIGH** (leitura direta dos dois arquivos, sem inferência). Impacto: quebra a premissa de "reprodutível" do escopo da trilha — não há garantia de que o binário testado (typecheck + testes + smoke + migration reversível) é o mesmo que roda em produção; rollback documentado em `DEPLOY.md:75-102` depende de "descobrir a última imagem aprovada" localmente, sem registry, sem log formal de qual tag foi de fato aprovada e implantada quando.

### RES-T22-02 — Nenhum compose (dev ou prod) é validado pelo CI

`server-ci.yml` não contém nenhuma referência a `docker-compose.yml`/`docker-compose.prod.yml` (nenhum `docker compose config`, nenhum lint de compose). O `docker-compose.prod.yml` — que T-18 já classificou como "nunca exercitado" pelo ângulo de segredo — também nunca é exercitado pelo ângulo de **sintaxe/gate de CI**: nada no repositório impediria um erro de sintaxe ou uma variável obrigatória mal referenciada no compose de produção de ser descoberto só na hora real do deploy. O próprio `docs/infra/DEPLOY_UBUNTU.md:177-193` lista "`docker compose config` não tem erros" como item de checklist manual — não é gate automatizado.

- **T22-F02 — Nenhum dos dois arquivos de composição Docker é validado automaticamente antes de merge/deploy** (`.github/workflows/server-ci.yml` completo — ausência confirmada; `docker-compose.prod.yml:1-151`). Severidade: **MEDIUM**. Confiança: **HIGH**. Impacto: converge com o achado de T-18 sobre `docker-compose.prod.yml` nunca ter sido implantado de verdade — aqui o ângulo é que **nem a validação estática mínima** (`docker compose config`) está automatizada; depende 100% de disciplina manual do operador seguir o checklist.

### RES-T22-03 — Human gate de deploy: desenho correto, mas não tecnicamente exigível

`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:482-548` define explicitamente 4 aprovações formais (CTO/Tech Lead, CFO, Production Manager, Compliance Officer) como pré-condição da "Decision Point 1: GO/NO-GO", com campos de assinatura e data — isto é desenho de human gate compatível com a Regra 18 do CLAUDE.md (decisão humana explícita registrada, não por inferência). Confirmado honestamente pelo próprio documento (linhas 6, 41-58) que **nenhum deploy ocorreu ainda** — não há servidor de produção adquirido —, então o gate nunca foi de fato exercitado; não há falso positivo de "aprovação simulada".

O que falta, e que é o achado real desta trilha: **nada no pipeline (`server-ci.yml`) ou na composição Docker impede tecnicamente** que alguém suba `docker-compose.prod.yml` sem que essas assinaturas existam — o gate é inteiramente documental/de processo (um arquivo Markdown com campos em branco), sem controle técnico equivalente (ex.: GitHub Environments com required reviewers, ou um workflow de deploy que dependa de aprovação manual no próprio Actions). Isso é o padrão comum em ambientes que ainda não têm CI/CD de deploy automatizado, mas fica registrado como gap de governança formal, não como "aprovação ausente hoje" (não há deploy hoje).

- **T22-F03 — Human gate de deploy existe apenas como processo documental, sem controle técnico que o torne inescapável** (`docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:482-548`; ausência de `environment:`/required reviewers em `.github/workflows/server-ci.yml`, que nem sequer tem job de deploy). Severidade: **MEDIUM** (risco ainda não realizado — nenhum deploy ocorreu; sobe para HIGH no dia em que houver servidor de produção sem controle técnico adicional). Confiança: **HIGH**. Impacto: se o gate depender só de disciplina humana e não de imposição técnica, a Regra 18 fica vulnerável a "pular etapa sob pressão de prazo" sem deixar rastro técnico — o registro assinado no Markdown é o único artefato, e nada tecnicamente valida sua existência antes do deploy.

### RES-T22-04 — Backup e restore: testados localmente, com lacunas honestamente documentadas

`docs/database/07-DISASTER_RECOVERY.md` é excepcionalmente honesto e já se autoclassifica corretamente: restore de `pg_dump -Fc -Z 9` foi **de fato executado e confirmado** em 2026-08-06 (§2.1, linhas 109-166: 79/79 tabelas, contagem de linhas idêntica, incluindo amostras de `users`, `production_orders`, `inventory_movements`). Isso é evidência real de mecânica de restore funcional, não aspiracional.

Limitações que o próprio documento já assume (linhas 168-182, 236-266) e que confirmo como corretas na leitura:
- Nunca testado em servidor/disco novo (cenário de catástrofe total) — não há como testar, pois o servidor de produção não existe.
- Volume `app_uploads` (fotos/desenhos de produto) **não tem nenhuma automação de backup** — confirmado: os scripts em `scripts/backup-postgres.*` cobrem apenas `pg_dump`, nada de `tar`/`rsync` do volume, apesar de `docker-compose.yml:69-73,89-93` comentar explicitamente que esse diretório "DEVE entrar na rotina de backup".
- RPO/RTO não formalizados (§3, linhas 252-266) — sem aprovação do dono do produto.
- O teste de restore validado é anterior à migration COMEX (79 tabelas testadas vs. 80+SequelizeMeta atuais) — o próprio documento já registra essa defasagem sem tentar mascará-la.

- **T22-F04 — Backup de arquivos (`app_uploads`) sem qualquer automação, apesar de reconhecido como necessário no próprio código** (`docker-compose.yml:69-73,89-93`; ausência confirmada em `scripts/backup-postgres.sh` e `.ps1` — cobrem só Postgres). Severidade: **MEDIUM**. Confiança: **HIGH**. Impacto: em caso de restore de desastre, dados transacionais voltam mas fotos/desenhos de produto enviados via multer são permanentemente perdidos — quebra "caminho de rollback plausível" para uma classe de dado que o sistema sabidamente produz.
- Não emito finding novo sobre "provisionamento de servidor novo nunca testado" nem sobre RPO/RTO não formalizado — já estão descritos com precisão e honestidade no próprio `07-DISASTER_RECOVERY.md`, tratados como pendência de Go-Live rastreada, não como achado ocultado. Registro como **RES-T22-04b (observação, não finding)**: continuam pendentes e devem permanecer bloqueadores do Go-Live G6 até resolução.

### RES-T22-05 — OBS-INV-07 promovido a finding formal

Confirmado por leitura direta:
- `client/package.json:11-12` — `"test": "vitest run"`, `"test:watch": "vitest"` — suíte de teste declarada e presente.
- `.github/workflows/server-ci.yml` — nenhum job/step referencia `client/`, `mobile/`, ou `tv/`; o único `working-directory` usado é `server`.
- `mobile/package.json` e `tv/package.json` — nenhum script `test` existe (grep vazio); `tv/package.json` tem apenas `typecheck`.

Uso a autoridade dada pelo plano para promover:

- **T22-F05 (ex-OBS-INV-07) — Zero pipeline de CI para `client/`, `mobile/`, `tv/`; suíte vitest de `client/` nunca roda automaticamente** (`.github/workflows/server-ci.yml` completo; `client/package.json:11-12`). Severidade: **HIGH**. Confiança: **HIGH**. Impacto: qualquer regressão de frontend (o app que os usuários finais realmente tocam) só é detectada manualmente, se alguém lembrar de rodar `npm test` localmente antes do merge — não há gate de merge para `client/`, apesar de ele possuir cobertura de teste declarada. Isso é mais grave que "ausência de teste": é teste que existe e é sistematicamente ignorado pelo pipeline. Para `mobile/`/`tv/` a lacuna é dupla (nem pipeline, nem suíte de teste declarada) — risco proporcionalmente menor por não haver testes para ignorar, mas ainda um gap de engenharia relevante dado que esses apps já foram objeto de achados P0/altos remediados (conforme `GO_LIVE_G6_CHECKLIST.md` linha 56).

---

### Convergência / divergência com T-18 (`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md`)

**Convergência total** sobre os fatos: `docker-compose.yml:43,54,57` com defaults fracos, e `docker-compose.prod.yml` nunca exercitado, são achados que confirmo lendo os mesmos arquivos.

**Ângulo diferente, sem duplicar severidade:** T-18 tratou isso como problema de **segredo/configuração de segurança** (T18-F02/T18-F03). Esta trilha acrescenta a pergunta que era minha: **o CI validaria essas condições antes do deploy?** Resposta: **não** — `server-ci.yml` não executa `docker compose config` em nenhum dos dois arquivos (RES-T22-02), então mesmo se alguém corrigisse os defaults fracos apontados por T-18, nada no pipeline atual impediria uma futura regressão de voltar a introduzir default fraco ou quebrar uma variável obrigatória sem que isso seja pego antes do deploy. Recomendo ao director que, se T22-F02 for validado, seja tratado como pré-requisito técnico para o fechamento definitivo de T18-F02/T18-F03 (corrigir o valor não impede recorrência sem gate automatizado).

---

### Escalonamentos e evidência dinâmica solicitada

- **DYN-T22-01** — Verificar via GitHub API (branch protection rules de `main`/`master`): review obrigatório, número mínimo de aprovadores, status checks obrigatórios (`server-ci` como required check), permissão de push direto. Não pode ser inferido de arquivo algum no repositório (branch protection é configuração server-side do GitHub, não versionada). Solicito ao vericore-audit-verification-runner via director.
- **DYN-T22-02** — Verificar se existe CODEOWNERS efetivo em outra branch/configuração da organização GitHub não presente no working tree local (confirmei ausência de arquivo `CODEOWNERS` na árvore lida, mas não descarto configuração fora do repositório versionado).
- **Escalonamento ao vericore-cicd-auditor**: T22-F01 (imagem CI descartada, nunca publicada) tem sobreposição parcial com "pipeline como vetor de risco" — se a trilha de CI/CD já tiver avaliado a ausência de publicação de artefato por outro ângulo (ex.: supply chain/assinatura de imagem), converger achados para evitar duplicidade de ID.
- **Escalonamento ao vericore-software-audit-director**: T22-F03 (human gate sem controle técnico) e T22-F01 (sem cadeia de custódia commit→produção) são ambos classificados HIGH/MEDIUM com potencial de subir para CRITICAL no dia em que o servidor de produção for adquirido e o deploy real for tentado sob a infraestrutura atual — recomendo que ambos sejam reavaliados como bloqueadores formais de Go-Live G6 antes da Fase 2 do checklist (`GO_LIVE_G6_CHECKLIST.md` Fase 2), não apenas como findings de auditoria arquivados.

---

### Classificação por etapa (commit → build → promoção → produção)

| Etapa | Classificação | Evidência |
|---|---|---|
| Commit → CI (build/test/typecheck/secret-scan) | **GOVERNADA** | `.github/workflows/server-ci.yml:11-92` — gates reais (typecheck, testes sem skip, `npm audit`, scan de segredo, migration down+up) |
| CI → artefato publicado | **NÃO GOVERNADA** | T22-F01 — imagem buildada em CI nunca é publicada/referenciada no deploy real |
| Artefato → promoção para ambiente | **NÃO GOVERNADA (inexistente)** | Nenhum job de deploy em `server-ci.yml`; deploy é 100% manual via `docs/infra/DEPLOY.md` |
| Promoção → produção (human gate) | **DESENHADA, NÃO EXERCITADA, NÃO IMPOSTA TECNICAMENTE** | `GO_LIVE_G6_CHECKLIST.md:482-548` (desenho correto) + T22-F03 (sem imposição técnica) |
| Rollback | **PARCIALMENTE GOVERNADA** | Restore de banco testado e confirmado (`07-DISASTER_RECOVERY.md` §2.1); rollback de aplicação depende de imagem local não custodiada (T22-F01); `app_uploads` sem backup (T22-F04) |
| Branch protection / review obrigatório | **NÃO VERIFICADO** | Requer DYN-T22-01/02 — não inferível de arquivo versionado |

---

### Arquivos lidos

- `.github/workflows/server-ci.yml`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `scripts/backup-postgres.sh`
- `scripts/schedule-backup-cron.sh`
- `docs/database/07-DISASTER_RECOVERY.md`
- `docs/infra/DEPLOY_UBUNTU.md`
- `docs/infra/DEPLOY.md`
- `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md` (linhas 1-932)
- `client/package.json`, `mobile/package.json`, `tv/package.json`
- `server/package.json` (grep de scripts `migration:*`, `test:*strict`, `scan:secrets`)
- `.gitignore` (confirmação de `backups/` fora do controle de versão)
- Glob/Grep de verificação de ausência: `.github/**` (só há `server-ci.yml`), `CODEOWNERS` (ausente), `server/scripts/*backup*` (ausente — corrigido no início do relatório)

Nenhum arquivo do objeto auditado foi alterado. Nenhum comando foi executado; nenhuma conexão a ambiente em execução ou a `erp_evok_audio` foi feita.
