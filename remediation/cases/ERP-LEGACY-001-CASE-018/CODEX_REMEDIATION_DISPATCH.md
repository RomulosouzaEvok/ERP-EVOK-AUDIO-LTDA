# CODEX_REMEDIATION_DISPATCH — `ERP-LEGACY-001-CASE-018` · `AUD-AUTHN-02`

```
CASE_ID:        ERP-LEGACY-001-CASE-018
FINDING_ID:     AUD-AUTHN-02 (HIGH, estrato 2, PRODUCAO REAL por APR-2026-016)
TITULO:         Senha do admin de bootstrap com default versionado
EXECUTOR:       sanacore-remediation-engineer (via Codex)
BRANCH:         sana/ERP-LEGACY-001/CASE-018  (criar a partir de main @ 0ee65c5)
WORKTREE:       C:\Sistema EvokAudio\ERP-Evok-sana-CASE-018
TRIAGEM:        remediation/cases/ERP-LEGACY-001-CASE-018/TRIAGE.md  (LER INTEIRA)
ESCOPO:         SOMENTE a parte executavel sem decisao nova do dono.
                A rotacao da senha do admin de producao NAO esta neste
                despacho — ver PENDING_DECISION.md.
```

---

## 0. LIMITES ABSOLUTOS — leia antes de qualquer edição

1. **NUNCA conectar em `erp_evok_audio`.** Nem para contar linhas, nem para
   confirmar comportamento. `APR-2026-016`. Teste dinâmico, **se e quando
   autorizado**, roda **exclusivamente** contra `erp_evok_audio_test`.
2. **NUNCA reproduzir valor de senha em nenhum artefato** — commit, teste,
   comentário, mensagem de erro, log, evidência. Cite `arquivo:linha`. Os testes
   novos devem assertar **forma e comportamento**, com booleanos, nunca
   `expect(conteudo).toMatch(...)` sobre o arquivo inteiro (o Jest imprimiria o
   arquivo no relatório de falha — precedente:
   `docker-compose-jwt-secret-guard.test.ts` do `CASE-005`, comentário `:20-25`).
3. **NÃO tocar** `audit/`, `coretriad/`, `.claude/`.
4. **NÃO declarar** `FINDING CLOSED`, `RETEST_PASSED` nem `RISK_ACCEPTED`.
   Autoridade exclusiva da VeriCore (Regra 4). `REMEDIATION_COMPLETE` da SanaCore
   **não** substitui reteste (Regra 3).
5. **NÃO rotacionar, trocar ou tocar credencial de produção.** Nem no banco, nem
   no `.env` do dono. Fora de escopo por decisão pendente.
6. **NÃO endereçar linha fixa de `docker-compose.yml`.** Endereçar por chave
   (`services.api.environment.ADMIN_SEED_PASSWORD`). Deslocamento de linha é
   certo — §3.

---

## 1. O DEFEITO — três coisas distintas, todas confirmadas em `main @ 0ee65c5`

| # | Defeito | Âncora | Quem atinge |
|---|---|---|---|
| **D-1** | Compose **fornece** default versionado da senha do admin | `docker-compose.yml:57` (`${ADMIN_SEED_PASSWORD:-<literal>}`) | quem sobe `docker compose up` sem a variável, com `users` vazia |
| **D-2** | Seed tem um **segundo** literal como fallback | `server/src/config/seeds.ts:138` (`adminPassword \|\| '<literal>'`) | **qualquer** boot fora de `production` sem a variável — inclusive `npm run dev` sem Docker. **Sobrevive à correção de D-1** |
| **D-3** | Comprimento curto apenas **avisa** | `server/src/config/seeds.ts:139-141` (`console.warn`, sem `throw`) | quem **declarou** a variável com valor fraco. **Sobrevive a D-1 e D-2** |

Contexto que explica por que os três coexistem (não é escopo corrigir, é escopo
**não reproduzir**): a única guarda forte do sistema
(`server/src/config/runtimeEnv.ts:127-133` — mínimo 8 **e**
`ENV_PLACEHOLDER_PATTERN`) está atrás do early-return de `runtimeEnv.ts:73-75`, e
`docker-compose.yml:43` rebaixa `NODE_ENV` a `development`. **Isso é `T18-F02`,
finding separado, FORA DESTE ESCOPO.** Ver `TRIAGE.md` §3.4.

A conta afetada, `admin@evokaudio.com.br` (`seeds.ts:144`), é **exatamente** o
único registro de `users` classificado PRODUÇÃO REAL
(`PRODUCTION_STATUS_MAP.md:130`; `APR-2026-016`).

---

## 2. ALTERAÇÕES AUTORIZADAS — 7 itens

### E-1 · `docker-compose.yml` — remover o default versionado

Trocar a forma da chave `services.api.environment.ADMIN_SEED_PASSWORD`, de
default versionado para **obrigatória**:

```yaml
ADMIN_SEED_PASSWORD: ${ADMIN_SEED_PASSWORD:?defina ADMIN_SEED_PASSWORD no .env antes de subir a API}
```

**Fundamento (zero invenção):** esta forma já existe **duas vezes no mesmo
arquivo** para `DB_PASSWORD` (`:13`, `:50`) e em `docker-compose.prod.yml:105`
para esta mesma variável. `APR-2026-049` D2 ratificou exatamente esta forma neste
mesmo bloco YAML (`CASE-005`, `JWT_SECRET`/`NODE_ENV`).

**Nada mais neste arquivo.** Não tocar `:43` (`NODE_ENV` — é `CASE-005`), `:49`
(`DB_USER` — é `CASE-015`), `:54` (`JWT_SECRET` — é `CASE-005`), `:50`
(`DB_PASSWORD` — já correto).

> **AVISO OPERACIONAL que E-1 obriga a registrar no relatório.** `${VAR:?}` **não
> é mudança inerte**: entra em vigor sozinho no próximo `docker compose up -d`.
> Se `ADMIN_SEED_PASSWORD` não estiver no `.env` da raiz, o `up` **falha e a API
> não sobe**. Medição da triagem (§1.1): a chave **existe** no `.env` da raiz
> desta máquina, logo E-1 é **neutro** aqui. **O estado do segundo PC não foi
> verificado.** Declare isso no relatório; não "conserte" nenhum `.env`.

### E-2 · `server/src/config/seeds.ts:138` — remover o fallback hardcoded

Eliminar o literal. A senha passa a vir **exclusivamente** de
`runtimeEnv.adminSeedPassword`. Ausência é **erro**, em qualquer ambiente.

`README.md:220-222` já **afirma** que não há credenciais hardcoded no código.
E-2 torna a afirmação verdadeira.

### E-3 · `server/src/config/seeds.ts:139-141` — comprimento passa a BLOQUEAR

`console.warn` → **`throw`**. A conta **não** é criada com senha abaixo do
mínimo.

**Mínimo obrigatório: 8** — o **mesmo** de `runtimeEnv.ts:127`. **NÃO inventar 12,
16, nem regra de complexidade.** Política de senha de usuário final é
`AUD-AUTHN-09` (LOW, finding separado). Aplicar a política existente onde ela não
chegava é remediação; endurecê-la é outro finding e seria decidir regra de negócio
(Regra 6).

### E-4 · Rejeição de placeholder no seed — reusar o padrão existente

Valor que casa com `ENV_PLACEHOLDER_PATTERN` (`runtimeEnv.ts:12`) deve ser
**rejeitado** pelo seed. **Exportar e importar** o padrão de `runtimeEnv.ts` —
**não** escrever regex nova, **não** copiar literal.

**Fundamento:** `APR-2026-049` D2 estabeleceu que a reprovação deve vir da
**guarda de placeholder**, não de comprimento — *"reprovar só por comprimento é
frágil, porque alongar a string faria o exemplo subir com chave conhecida."*
Idêntico aqui: os três `.env*.example` trazem `CHANGE_ME_REQUIRED_IN_PRODUCTION`
(18 caracteres — passaria por comprimento).

### E-5 · TRÊS restrições de implementação NÃO NEGOCIÁVEIS para E-2/E-3/E-4

Estas três definem se a correção é real ou teatro. Não improvisar:

1. **A validação fica DENTRO de `seedDatabase()`, DEPOIS do guard
   `seeds.ts:117-121` (`if (userCount > 0) return;`).**
   **PROIBIDO** mover para o schema Zod (`runtimeEnv.ts:52`,
   `z.string().optional()`). Fundamento: mover para o schema quebraria o boot de
   **toda** instância com banco já populado — **inclusive a do dono**, que hoje
   retorna em `:120` e nunca chega em `:128`. A validação só deve existir no
   caminho que **realmente vai criar** a conta.
2. **A validação é INDEPENDENTE de `NODE_ENV`.** **PROIBIDO** condicioná-la a
   `nodeEnv === 'production'` (como `:130` faz hoje). Se ela só valer em
   `production`, o gate morto de `runtimeEnv.ts:73` foi reproduzido e o patch é
   **cosmético**. Este é o critério que separa correção de teatro, e o reteste vai
   medi-lo (`CR-018-E5`, `DYN-018-01..03` rodam **fora** de `production`).
3. **A mensagem de erro nomeia a variável e ensina o fix, sem citar valor.**
   Modelo já aceito no repositório: `docs/infra/DOCKER_POSTGRES_SETUP.md:106-112`
   documenta a falha de `DB_PASSWORD` como comportamento **correto e esperado**,
   com o fix ao lado. Fazer o mesmo aqui.

### E-6 · `server/tests/unit/seeds-production-boot.test.ts` — reescrever 2 casos

**Este é o item mais importante do despacho e o mais fácil de fazer errado.**

O teste existente **TRAVA o defeito**:

- `:79-85` asserta o **literal do fallback** de `seeds.ts:138` como `password`
  esperado em `User.create` — ou seja, **asserta D-2 como correto**.
- `:133-150` (*"avisa quando `ADMIN_SEED_PASSWORD` e muito curta"*) asserta que
  senha de 3 caracteres produz `console.warn` e **boot bem-sucedido** — ou seja,
  **asserta D-3 como correto**.

Estes 2 casos **vão reprovar** após E-2/E-3, **e é o resultado esperado**.

**REESCREVER, não ajustar.** Trocar o literal esperado por outro literal mantém o
defeito e será pego por `CR-018-E8`. A reescrita:

| Caso atual | Vira |
|---|---|
| `:67-92` — *"loga aviso mas continua em desenvolvimento sem `ADMIN_SEED_PASSWORD`"* | *"falha o seed sem `ADMIN_SEED_PASSWORD` **em qualquer ambiente**"* — `rejects.toThrow` nomeando a variável, e `expect(User.create).not.toHaveBeenCalled()`. **`NODE_ENV=development`** |
| `:133-150` — *"avisa quando … e muito curta"* | *"**falha** quando … é muito curta"* — `rejects.toThrow`, `User.create` não chamado. **`NODE_ENV=development`** |

**Casos NOVOS a acrescentar:**

| # | Cenário | Asserção |
|---|---|---|
| N-1 | `NODE_ENV=development`, valor casando com `ENV_PLACEHOLDER_PATTERN` (usar prefixo `CHANGE_ME…`, que é marcador público de recusa, **não** segredo) | `rejects.toThrow`; `User.create` não chamado |
| N-2 | `NODE_ENV=development`, valor forte | sucesso; `User.create` chamado com `email`/`role` — **NÃO assertar o valor da senha** |
| N-3 | `users` **populada** (`User.count` → ≥ 1), variável **ausente** | **sucesso, sem throw**; `User.create` não chamado. **Prova que a correção não quebra instância existente** — é a asserção que mede o risco de regressão |

**Preservar** os casos `:50-65` (falha em produção sem a variável) e `:94-116`
(usa o valor quando definida) — a mudança é que o primeiro deixa de ser exclusivo
de `production`.

### E-7 · Guarda estática nova + alinhamento de documentação

**E-7a — Guard test: ARQUIVO NOVO.**
`server/tests/unit/docker-compose-admin-seed-guard.test.ts`

**PROIBIDO editar** `server/tests/unit/docker-compose-jwt-secret-guard.test.ts`
(é do `CASE-005`, existe **apenas na branch dele**, não em `main`). Aquele arquivo
termina com uma *NOTA DE ESCOPO* declarando que `ADMIN_SEED_PASSWORD` foi
deliberadamente não asserido — é um handoff para este caso, e deve permanecer
como registro histórico. Editar cria colisão real de merge e mistura dois
findings no mesmo artefato de evidência.

Asserções do arquivo novo (booleanas, nunca imprimindo o arquivo):

- `docker-compose.yml` **não** casa `/ADMIN_SEED_PASSWORD:\s*\$\{ADMIN_SEED_PASSWORD:-/`
- `docker-compose.yml` **casa** `/ADMIN_SEED_PASSWORD:\s*\$\{ADMIN_SEED_PASSWORD:\?/`
- `docker-compose.prod.yml` **continua** na forma `${…:?}` (**conformidade a
  preservar**, `:105`)
- `DB_PASSWORD` continua na forma obrigatória em `docker-compose.yml`
  (não-regressão do precedente)
- Os três `.env*.example` continuam com valor que casa com
  `ENV_PLACEHOLDER_PATTERN` (**conformidade de `APR-2026-049` D2 a preservar** —
  **não alterar esses arquivos**)
- **NÃO assertar** `JWT_SECRET` nem `DB_USER` — ficariam vermelhas em `main` antes
  de `CASE-005`/`CASE-015` serem mesclados, e o veredito deste caso passaria a
  depender de outro caso. §3.

**E-7b — Guard test do código:** um caso que assere, por leitura de
`server/src/config/seeds.ts`, que **não existe** senha literal como fallback
(ausência da forma `|| '<string literal>'` na resolução da senha). Booleano,
sem imprimir o arquivo.

**E-7c — Documentação (drift ativo, verificado):**

| Arquivo:linha | Estado hoje | O que fazer |
|---|---|---|
| `README.md:220-222` | *"Não há credenciais hardcoded no código"* — **falso** por `seeds.ts:138` | passa a ser verdadeiro com E-2; **conferir e ajustar o texto** se ele condicionar o controle a produção |
| `README.md:50` | *"Com `NODE_ENV=production` o servidor não inicia sem ela"* — literalmente verdadeiro, operacionalmente enganoso (`docker-compose.yml:43` rebaixa `NODE_ENV`) | atualizar: a exigência passa a valer **em qualquer ambiente** no caminho de criação da conta |
| `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md:47` | classifica *"sem fallback previsível"* como **`[IMPLEMENTADO]`**, citando `docker-compose.yml` e `runtimeEnv.ts` — os dois arquivos provam o contrário | após E-1..E-4 passa a ser verdadeiro para esta variável. **Não** marcar `JWT_SECRET`/`DB_PASSWORD` como resolvidos por este caso |
| `docs/infra/DOCKER_POSTGRES_SETUP.md` | `:10-25` instrui `cp .env.example .env`; `:60-65` e `:106-112` já ensinam que o boot falha sem `DB_PASSWORD` e que isso é de propósito | **acrescentar `ADMIN_SEED_PASSWORD` ao mesmo fluxo já existente**, com a mensagem de erro e o fix, no formato de `:106-112`. **Sem isso a correção é revertida por atrito no primeiro boot falhado de um dev novo** |

---

## 3. COORDENAÇÃO — três casos tocam `docker-compose.yml`

Modelado na §3 de `CASE-014/CODEX_REMEDIATION_DISPATCH.md`. **Verificado, não
presumido:** `git merge-base --is-ancestor <branch> main` em **todas** as branches
`sana/*` e `origin/sana/*`.

### 3.1 Estado de merge — declarado explicitamente

**NENHUM `CASE-0xx` deste programa está em `main`.**

| Caso | Branch | Em `main`? | Estado |
|---|---|---|---|
| `CASE-005` (`AUD-AUTHN-01`) | `sana/ERP-LEGACY-001/CASE-005` @ `7b06404` | **NÃO** | aguardando reteste dinâmico |
| `CASE-015` (`AUD-DB-01`) | nenhuma branch criada | — | `BLOQUEADO_DECISAO_DONO`, despacho não emitido |
| **`CASE-018`** (este) | a criar de `main @ 0ee65c5` | **NÃO** | este despacho |

### 3.2 Quem toca qual linha — sem sobreposição

| Linha em `main @ 0ee65c5` | Chave | `CASE-005` | `CASE-015` | **`CASE-018`** |
|---|---|---|---|---|
| `:43` | `NODE_ENV` | **TOCA** | — | — |
| `:49` | `DB_USER` | — | **TOCA** | — |
| `:50` | `DB_PASSWORD` | preserva | preserva | preserva |
| `:54` | `JWT_SECRET` | **TOCA** | — | — |
| **`:57`** | **`ADMIN_SEED_PASSWORD`** | **NÃO TOCA** (escopo excluído) | — | **TOCA** |

**`CASE-005` não toca `:57`** — três provas independentes:
(1) `git show sana/ERP-LEGACY-001/CASE-005:docker-compose.yml | grep -n
ADMIN_SEED_PASSWORD` → linha **69**, forma de default **intacta**;
(2) a *NOTA DE ESCOPO* no fim de `docker-compose-jwt-secret-guard.test.ts`;
(3) `VERDICT_CASE-005.md:300` (VeriCore): *"**Não fecha `AUD-AUTHN-02`**"*.

### 3.3 Regras de merge — para quem mesclar

1. **Um caso de cada vez, nunca em paralelo sem rebase.** Os três hunks estão a
   3-4 linhas de distância no mesmo bloco `services.api.environment`. Merge
   automático é **provável, não garantido** — e, por serem próximos, é fácil
   mesclar errado sem ninguém notar.
2. **Deslocamento de linha é CERTO.** Após os dois hunks de `CASE-005` (+6 linhas
   de comentário cada), `ADMIN_SEED_PASSWORD` sai de `:57` para `~:69` (medido).
   **Endereçar por chave, nunca por linha** — inclusive nos regexes do guard test
   (E-7a já está escrito por chave).
3. **Ordem de merge segura (recomendação ao director, não decisão da SanaCore):**
   `CASE-005` → `CASE-018` → `CASE-015`. `CASE-005` está mais adiantado e
   introduz os deslocamentos; `CASE-018` é o menor delta (1 linha) e rebaseia
   trivialmente; `CASE-015` está bloqueado por decisão do dono e ainda pode mudar
   de forma (Opção A/B/C não decidida) — mesclá-lo antes fixaria posição a partir
   de um caso não aprovado.
4. **Guarda de teste: arquivo novo por caso.** Ver E-7a.
5. **A guarda deste caso não assere `JWT_SECRET` nem `DB_USER`.** Ver E-7a.
6. **Não agrupar os três num caso só.** As causas-raiz são a mesma família (*o
   controle certo existe, versionado, e está desligado*), mas `CASE-005` já está
   em reteste e `CASE-015` está bloqueado: agrupar reabriria um e sequestraria
   este pelo bloqueio do outro. O mecanismo comum é `T22-F02`, finding próprio.

---

## 4. FORA DO ESCOPO AUTORIZADO — não incluir, não "aproveitar a viagem"

### 4.1 Fora por ser outro finding

| Item | Finding | Por quê |
|---|---|---|
| `runtimeEnv.ts:73-75` (early-return que mata 8 guardas de produção) | **`T18-F02`** | Raio muito maior — `DB_SSL`/`CORS_ORIGIN` derrubariam o boot de dev. `CASE-005` §5.1 opção B foi rejeitada por isso. **Este caso NÃO fecha `T18-F02`** |
| `docker-compose.yml:43` (`NODE_ENV`) e `:54` (`JWT_SECRET`) | `AUD-AUTHN-01` / `CASE-005` | outro caso, outra branch |
| `docker-compose.yml:49` (`DB_USER`) | `AUD-DB-01` / `CASE-015` | outro caso, **bloqueado** |
| Validação de compose por `docker compose config` | **`T22-F02`** | a guarda de E-7a é contribuição parcial; um guard de conteúdo vê a *forma*, não prova que o compose parseia |
| Política de senha de usuário final (mínimo 6, sem complexidade) | `AUD-AUTHN-09` | E-3 usa **8**, o mínimo já versionado em `runtimeEnv.ts:127`. Não inventar |
| `AccessProfileExecutionServiceAdapter.ts:42-49` (usuário criado com senha temporária que ninguém recebe) | `AUD-AUTHN-13` item (3), trilha T-16 | mesma família, causa-raiz distinta. **Sinalizado, não absorvido** |
| `.github/workflows/server-ci.yml` | trava `CD-CI-01` (`APR-2026-026` item 3) | valor de CI já é forte (`:114`, `:183`, `NODE_ENV: test` em `:103`). **Não tocar** |
| Os três `.env*.example` | ratificados em `APR-2026-049` D2 | **já corretos** — casam com `ENV_PLACEHOLDER_PATTERN`. **Não tocar**; só assertar como conformidade preservada |
| `docker-compose.prod.yml` | já correto (`:105`) | **não tocar**; só assertar |

### 4.2 Fora por exigir decisão/ato humano em produção — `PENDING_DECISION.md`

| Item | Por quê |
|---|---|
| Determinar se `admin@evokaudio.com.br` tem hoje a senha versionada | exige inspecionar dado real ou tentar login. `APR-2026-016`, aprovação **caso a caso**. Lacuna `L-T02-02` (`T-02` §6) |
| **Rotacionar a senha do admin de produção** | escrita em dado real; incrementa `passwordVersion` (`User.ts:118-134`) e **expulsa todas as sessões** (`middlewares/auth.ts:99-103`), inclusive a de quem executa |
| Declarar `ADMIN_SEED_PASSWORD`/`NODE_ENV` no `.env` de produção antes do próximo `up` | pré-requisito operacional de E-1. Ato do dono |
| Verificar o `.env` do segundo PC / réplicas | fora do alcance desta máquina |

**Nota de precisão normativa, para não estender aprovação por analogia:** a
reserva de `APR-2026-049` **D3** é nominalmente sobre a **rotação da chave JWT** e
**não menciona senha de usuário**. Portanto o bloqueio da rotação do admin
**não** é afirmado como cobertura literal de D3 — ele decorre de **`APR-2026-016`**
(`APPROVALS.md:329-344`), que é mais forte e não depende de analogia: `users`
(conta admin) está sob regime read-only reforçado permanente, com aprovação
**caso a caso**, *"nunca por extensão"*. Fundamentação completa em `TRIAGE.md`
§6.1.

### 4.3 O que este despacho NÃO fecha — escrever no relatório

E-1…E-7 tornam o **código** correto e travam a **reintrodução** do defeito.
**Não** dizem nada sobre o estado da credencial que já existe: se a conta admin
de produção tiver hoje a senha versionada, ela **continua tendo** — e o guard
`seeds.ts:117-121`, que é o controle compensatório, **garante que nenhum boot
futuro a corrija**.

**Mecanismo ≠ estado da credencial.** Isto **tem** de constar do pacote de
evidência, sob risco de o caso virar "concluído com ressalva", que este programa
não aceita.

---

## 5. CRITÉRIO DE ACEITE — o que o engineer deve entregar

### 5.1 Estático (roda em CI, sem banco)

| ID | Asserção | Deve reprovar em `main @ 0ee65c5` |
|---|---|---|
| `CR-018-E1` | compose sem `${ADMIN_SEED_PASSWORD:-…}` | **SIM** |
| `CR-018-E2` | compose com `${ADMIN_SEED_PASSWORD:?…}` | **SIM** |
| `CR-018-E3` | `seeds.ts` sem literal de senha como fallback | **SIM** |
| `CR-018-E4` | senha abaixo do mínimo **interrompe** (`throw`), não avisa | **SIM** |
| `CR-018-E5` | a validação **não** é condicionada a `NODE_ENV` | **SIM** |
| `CR-018-E6` | placeholder rejeitado em qualquer ambiente, **pela guarda de placeholder** | **SIM** |
| `CR-018-E7` | mínimo aplicado = 8 (o de `runtimeEnv.ts:127`); nenhuma política nova | vigilância |
| `CR-018-E8` | nenhum teste asserta valor de senha versionado como esperado | **SIM** (`seeds-production-boot.test.ts:82`) |
| `CR-018-E9` | `docker-compose.prod.yml:105` continua `${VAR:?}` | não — **não pode regredir** |
| `CR-018-E10` | os três `.env*.example` continuam casando com `ENV_PLACEHOLDER_PATTERN` | não — **não pode regredir** |
| `CR-018-E11` | `README.md` e `REQUISITOS_NAO_FUNCIONAIS.md:47` sem drift | **SIM** |
| `CR-018-E12` | nenhum artefato do caso reproduz valor de senha | vigilância |

**Obrigatório no relatório: rodar a suíte nova contra o `AUDIT_COMMIT`
`c1311a6f76b512fef893f7e60d934179cae3409f` e mostrar que ela REPROVA lá e PASSA
depois.** Guarda que já passava no `AUDIT_COMMIT` tem poder discriminante zero —
precedente `APR-2026-050` D1: *"a faixa errada produziu o pior artefato do
caso."*

### 5.2 Dinâmico — **exclusivamente `erp_evok_audio_test`**

> **`erp_evok_audio` é PROIBIDO.** `APR-2026-016`; o guarda de banco de produção
> de `.claude/hooks/org-isolation.js` bloqueia. Sonda contra `users` real exige
> aprovação humana caso a caso — **nenhuma foi concedida**.

`DYN-018-01`…`DYN-018-06`, definidos em `TRIAGE.md` §9.2. Duas armadilhas que
reprovam o fechamento:

- **Todas** as sondas de rejeição rodam com `NODE_ENV` **fora** de `production`.
  Se só falharem em `production`, o gate morto foi reproduzido (E-5 item 2).
- **`DYN-018-05` é obrigatória** (banco com `users` populada + variável ausente →
  boot normal). É a única sonda que mede o risco de regressão, não a correção.

### 5.3 Baseline conhecido do ambiente

`APR-2026-050` D4 registra que `docs-path-reference-guard.test.ts` valida um
caminho dentro de `client/node_modules` e **contamina o baseline de todo reteste**
em worktree sem `npm install` no `client/`. Medir e declarar o baseline **antes**
de atribuir qualquer falha a este patch.

---

## 6. RELATÓRIO ESPERADO

1. `arquivo:linha` de cada alteração, **antes e depois**, sem valor de segredo.
2. Suítes: antes/depois, incluindo a execução contra o `AUDIT_COMMIT` (§5.1).
3. Os 2 casos reescritos de `seeds-production-boot.test.ts` — mostrar que
   reprovavam por **assertar o defeito**, não por bug de teste.
4. Declaração explícita: **`T18-F02` não foi fechado**; `AUD-AUTHN-01`,
   `AUD-DB-01`, `T22-F02`, `AUD-AUTHN-09` não foram tocados.
5. Declaração explícita de §4.3 — mecanismo ≠ estado da credencial.
6. Aviso operacional de E-1 (efeito no próximo `docker compose up`).
7. Confirmação de que **nenhuma** conexão a `erp_evok_audio` foi aberta.
8. **Nenhuma** declaração de `FINDING CLOSED`, `RETEST_PASSED` ou
   `RISK_ACCEPTED`. O caso segue para reteste independente da VeriCore.
