# Reteste final — `ERP-LEGACY-001-CASE-005` / `AUD-AUTHN-01`

```
AUDIT_COMMIT       c1311a6f76b512fef893f7e60d934179cae3409f
REMEDIATION_HEAD   7b06404b0b4614ea40b9eb5cb0ad5cb4d76d58e2
BRANCH             sana/ERP-LEGACY-001/CASE-005
COMMITS            abef59b (patch) · 2a10049 (examples) · 7b06404 (reassunção + CI)
COLETA             vericore-audit-verification-runner
PERSISTIDO POR     sessão orquestradora — o runner é proibido de escrever no repo
NATUREZA           MEDIÇÃO. Nenhum RETEST_PASSED / RETEST_FAILED / FINDING CLOSED (Regra 4)
```

> **Método.** Nenhum arquivo revertido em worktree nenhuma: duas árvores extraídas
> para fora do repositório (`git archive`), identidade verificada por
> `git hash-object` contra `git rev-parse <rev>:<path>` antes de medir.
> **Nenhum valor de segredo neste documento** — só `len=`, booleano e contagem.

---

## 1. Poder discriminante — afirmação da SanaCore confirmada ao pé da letra

`env-examples-jwt-guard` reescrito, contra o `AUDIT_COMMIT`: **15 de 21 falham**.

| Bloco | Casos | Falham ANTES |
|---|---|---|
| existe e declara `JWT_SECRET` | 3 | 0 |
| **asserção central** (3 arquivos × 4 regimes) | 12 | **9** |
| metamórfico (alongar o valor) | 3 | **3** |
| documentação | 3 | **3** |

Corte exato da asserção central — os três arquivos, idênticos:

```
undefined FAIL · development FAIL · test FAIL · production PASS
```

No HEAD: **21/21**. A suíte antiga tinha 4/12 falhando, **1** de segurança; a nova
tem 15/21 com **9 de segurança real**.

O diagnóstico de causa da SanaCore está correto: o teste antigo **reimplementava**
a regra e a media contra os arquivos velhos. Agora executa `loadRuntimeEnv` real.

**Nenhuma das 15 falhas imprimiu conteúdo de arquivo** — só `Received function did
not throw`. O controle contra vazamento sobrevive à reescrita.

## 2. `ci-workflow-jwt-secret-guard` — discrimina, mas protege menos do que declara

Contra o `AUDIT_COMMIT`: **2 de 3 falham** (`Expected: 0 / Received: 2` — as duas
ocorrências literais). No HEAD: **3/3**.

**Sondagem adversarial, 10 probes em sandbox fora do repositório:**

| Probe | Cenário | Pega? | Sobre o limite declarado |
|---|---|---|---|
| **A** | apagar o passo de geração | **SIM** | **REFUTADO** — a SanaCore declarou que não pegaria |
| **B** | **mover o passo para depois do smoke** | **NÃO** | **limite NÃO declarado** |
| C | workflow novo com literal ≥32 | SIM | cobertura além do `server-ci.yml` |
| **D** | workflow novo usando `$JWT_SECRET` **sem** passo de geração | **NÃO** | **limite NÃO declarado** |
| E | literal em block scalar YAML | NÃO | confirmado |
| F | composite action | NÃO | confirmado |
| G | script versionado | NÃO | confirmado |
| **H** | literal com **espaço interno** | **NÃO** | **limite NÃO declarado** |

**Probe B é o mais material.** A propriedade que o commit declara proteger é
*"o passo vem antes do primeiro que sobe a aplicação"*. O teste **não afere
ordem** — só presença de três strings no arquivo inteiro. Movido o bloco para
depois do smoke, a suíte passa 3/3. **O que está travado é a existência das
strings, não a propriedade.**

**Probe H:** o regex para no primeiro espaço; um literal de 40 caracteres com
espaço é capturado como fragmento de 22, reprovado por comprimento e **filtrado
como "não utilizável"**. O literal inteiro passa.

## 3. `CR-4` NÃO está fechado no repositório — achado que ninguém tinha citado

O `server-ci.yml` desta branch tem 123→139 linhas e não contém
`governance-detective-controls`. **Mas o worktree principal não está em `main`** —
está em `audit/ERP-LEGACY-001-AUD-001/2026-08-16` (`1563c47`), irmão desta branch,
e **lá** o arquivo tem:

```
197 linhas
:34  # !! PARE — CONDICAO VINCULANTE CD-CI-01 (APR-2026-026, item 3) !!
:57  governance-detective-controls:
:60    continue-on-error: true
:112 JWT_SECRET  len=42  expansao=false     <- CR-4 vivo
:181 JWT_SECRET  len=42  expansao=false     <- CR-4 vivo
```

O `TRIAGE.md` (risco R3) cita **`server-ci.yml:112,181`** — linhas que **só
existem no arquivo de 197**. A coleta anterior citou `:38` e `:107`, do arquivo de
123. **Triagem e engenheiro leram arquivos diferentes sob o mesmo caminho.**

Consequências **medidas**:

1. **`CD-CI-01` é inaplicável a esta branch, não ao repositório.** O job existe,
   vivo, num irmão que compartilha a base `694bca9`.
2. **As duas branches editam o mesmo arquivo.** Resolução ingênua do merge ou
   perde a geração efêmera, ou perde o `governance-detective-controls` com sua
   cláusula vinculante.
3. O guard novo rodado contra o arquivo de 197: **2/3 falham**. Ou seja: quando as
   duas branches coabitarem uma árvore, **o CI fica vermelho** até alguém aplicar
   a geração efêmera também lá.

## 4. Regressão — baseline reproduzido exatamente

```
Test Suites: 1 failed, 180 passed, 181 total
Tests:       1 failed, 1987 passed, 1988 total
```

Única falha idêntica à já isolada: `docs-path-reference-guard` — `docs/API.md`
(pré-existente) e `client/node_modules/jsdom` (artefato de ambiente).
**Sem regressão atribuível.** `tsc --noEmit` exit 0.

`APR-2026-016` reverificado antes de rodar: `sequelize.authenticate()` só vive
dentro de `testConnection()`, não chamada no load. **Nenhuma conexão aberta.**

## 5. Escopo — nada fora dele foi tocado

`7b06404` toca **3 arquivos**. Diff vazio sobre `runtimeEnv.ts`,
`docker-compose.yml`, os três `.env*.example` e os dois guards antigos.

`T18-F02` aberto e inalterado (as oito guardas seguem depois do early-return de
`:110`) · `AUD-AUTHN-02` intocado · `AUD-AUTHN-03` diff vazio · `T22-F02` não
implementado.

## 6. `C6` — medido, com contrapeso

**Não entregue** (`git diff -- docs/ README.md` vazio).

**Estado do `README.md`:** `openssl rand` = 0 · `CHANGE_ME` = 0 · `placeholder` = 0
· `32 caracteres` = 0.

- `:49` descreve `JWT_SECRET` como *"String longa e aleatória"*. A linha `:50`
  **prova que o `README` tem convenção para documentar bloqueio de boot**
  (`ADMIN_SEED_PASSWORD`: *"o servidor não inicia sem ela"*) — e `JWT_SECRET` é
  justamente quem não a usa, embora seu bloqueio agora seja **mais forte**.
- `:60-61` afirma que `DB_PASSWORD` é a única sem default no compose. **Ficou
  factualmente incompleta:** `NODE_ENV` e `JWT_SECRET` também têm `:?`.

**O risco R1, medido em vez de suposto:**

```
$ docker compose --env-file .env -f docker-compose.yml config --quiet
EXIT=0   (HEAD)   ·   EXIT=0   (AUDIT_COMMIT)
```

O compose **parseia** — R1 na forma *"quebra o `up` de todo clone novo"* **não se
realiza**. Mas o passo seguinte sim: o `JWT_SECRET` de `.env.example` é reprovado
nos quatro regimes. **O caminho instruído pelo `README` entrega um stack cuja API
não sobe** — e no `AUDIT_COMMIT` esse mesmo caminho subia, em `development`, com a
chave publicada. A troca é de *"sobe inseguro"* para *"não sobe"*.

**Contrapeso, também medido, e é forte:** a instrução correta está no arquivo que
o desenvolvedor **já está abrindo** (`.env.example:35-38`, comentário de 4 linhas),
e as mensagens dos `:?` são acionáveis e nomeiam o comando:

```
required variable JWT_SECRET is missing a value: defina JWT_SECRET no .env
antes de subir a API (gere com `openssl rand -hex 32`)
```

**Implicação para o critério:** a reintrodução por reversão exige que o operador
não leia nem o comentário que acabou de copiar, nem a mensagem que nomeia a
correção. **A contenção de R1 migrou do `README` (não entregue) para o
`.env.example` e as mensagens `:?` (entregues e medidos funcionando).** O que
**não** está contido é o **drift documental novo** — `README:49` e `:60-61` hoje
subestimam a exigência.

## 7. Onde os números da SanaCore não batem

| Afirmação | Medição | Veredito |
|---|---|---|
| `env-examples` 21/15/9 · `ci-workflow` 3/2 · HEAD 43/43 · suíte 1987/1988 · typecheck limpo | idênticos | **batem exato** |
| **"17 casos falham contra o `AUDIT_COMMIT`"** | **25 de 43** (15 env + 2 ci + 3 compose + 5 placeholder) | **subestimado em 8.** O 17 é o delta das duas suítes que ele mexeu, não o poder discriminante do caso |
| **`scan:secrets` "sem achados"** citado como verificação | o scanner tem **4 padrões** (`BEGIN PRIVATE KEY`, `AKIA…`, `ghp_…`, `xox[baprs]-…`); **nenhum** casa `JWT_SECRET: <literal>` em YAML. E `allowedFragments` **isenta `.env.example` e `.env.docker.example` por completo** | **sem poder sobre a classe. Passar não é evidência** — e explica por que `CR-4` sobreviveu sem detecção |

## 8. Não medido

`DYN-T02-01` (exigiria subir a API) · `scan:secrets` contra a árvore antiga (usa
`git ls-files`; suprido por leitura do ruleset) · `docker compose up` real ·
premissa **A3** · premissa **A1** · comportamento do passo efêmero em runner real.

## 9. Estado final

```
worktree sana       HEAD = 7b06404b0b4614ea40b9eb5cb0ad5cb4d76d58e2   OK
worktree sana       status = (vazio)                                   OK
worktree principal  status = (vazio)                                   OK
```

Sandboxes removidos, junctions deletadas sem recursão, `node_modules` íntegro.
Nenhum arquivo do repositório criado, editado ou revertido. Nenhuma conexão de
banco. Nenhum valor de segredo extraído.

## 10. Insumo ao director

1. **A remediação faz o que anuncia:** 25/43 → 0/43, com a asserção central
   discriminando **9** casos onde antes discriminava **1**.
2. **O guard de CI protege menos do que sua documentação afirma** — ordem não
   aferida (B), workflow novo não coberto (D), literal com espaço evade (H).
3. **`CR-4` não está fechado no repositório** — vive em
   `1563c47:.github/workflows/server-ci.yml:112,181`, e as duas branches editam o
   mesmo arquivo.
4. **`C6` ausente cria drift documental novo**, mas a contenção prática de R1
   existe fora do `README` e foi medida funcionando.
5. **`scan:secrets` não é evidência para esta classe** — se constar como controle
   detectivo de `AUD-AUTHN-01` em algum artefato, isso precisa de correção.

Nada acima é classificado por mim (Regra 6).
