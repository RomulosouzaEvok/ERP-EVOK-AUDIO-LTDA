# Codex como motor do papel `sanacore-remediation-engineer` — implantação e prova

```
DATA:        2026-08-17
AUTORIZAÇÃO: APR-2026-048 (decisão do dono)
BASE:        CORETRIAD_MASTER_SPEC.md Parte VI §35
EXECUTOR:    função de infraestrutura (orquestrador) — não produto, não auditoria
ESTADO:      itens 1, 2, 3 e 4 PRONTOS E TESTADOS · item 5 (fluxo) registrado
             1 pendência de prova, nomeada na §5
```

> **Princípio desta implantação:** o Codex assume o **papel** já definido, dentro
> da estrutura já existente. Mesmos contratos, mesma nomenclatura, mesma worktree,
> mesmo formato de evidência. **Nenhuma estrutura paralela.**

---

## 1. Credencial isolada — role `codex_dev`

Mesmo padrão de `evok_audit` (`G4_CREDENCIAL_ISOLADA_AUDITORIA.md`), com uma
diferença deliberada: `evok_audit` é **somente leitura**, porque a VeriCore nunca
altera o objeto auditado (Regra 2). `codex_dev` tem **escrita normal no banco de
teste**, porque o papel SanaCore precisa rodar migrations e suíte.

### 1.1 O que não foi preciso fazer — e por quê

**Nenhum comando foi emitido contra o banco de produção.** O `REVOKE CONNECT ...
FROM PUBLIC` executado em 2026-08-16 já havia fechado a porta padrão. Medição
antes de agir:

```
       datname       |                      datacl
---------------------+--------------------------------------------------
 erp_evok_audio      | {=T/evok_admin,evok_admin=CTc/evok_admin,evok_app=c/evok_admin}
```

`PUBLIC` (a role vazia antes do `=`) tem só `T` (TEMP) — **o `c` de CONNECT não
está lá.** Uma role nova nasce, portanto, **sem acesso a produção**, sem precisar
de `REVOKE` próprio. Isso é consequência direta da remediação anterior: a barreira
de ontem protegeu a credencial de hoje sem ninguém pedir.

### 1.2 Comandos executados

Contra o banco de manutenção `postgres` (metadados de cluster) e contra
`erp_evok_audio_test`. Senha gerada localmente com 32 caracteres, **nunca
impressa em stdout e nunca gravada em arquivo versionado**.

```sql
CREATE ROLE codex_dev WITH
  LOGIN PASSWORD '<gerada, só no .env local>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION
  CONNECTION LIMIT 10;
GRANT CONNECT ON DATABASE erp_evok_audio_test TO codex_dev;
GRANT pg_read_all_data  TO codex_dev;
GRANT pg_write_all_data TO codex_dev;
-- em erp_evok_audio_test:
GRANT USAGE, CREATE ON SCHEMA public TO codex_dev;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO codex_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO codex_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO codex_dev;
```

`pg_read_all_data`/`pg_write_all_data` são dinâmicas: cobrem tabelas criadas por
migrations futuras sem novo `GRANT` manual. `ALTER DEFAULT PRIVILEGES` cobre
sequências e tabelas que `evok_admin` criar depois.

### 1.3 Estado DEPOIS — evidência

```
       datname       |                                    datacl
---------------------+-------------------------------------------------------------------------
 erp_evok_audio      | {=T/evok_admin,evok_admin=CTc/evok_admin,evok_app=c/evok_admin}
 erp_evok_audio_test | {...,evok_audit=c/evok_admin,codex_dev=c/evok_admin}
```

**`codex_dev` não aparece em nenhuma posição da ACL de produção** — nem por grant
direto, nem por herança de `PUBLIC`.

```
  rolname  | rolsuper | rolcreatedb | rolcreaterole | rolbypassrls | rolreplication | rolcanlogin | rolconnlimit
-----------+----------+-------------+---------------+--------------+----------------+-------------+--------------
 codex_dev | f        | f           | f             | f            | f              | t           |           10
```

Prova dinâmica no banco de teste — executada, não alegada:

```
$ psql -U codex_dev -d erp_evok_audio_test -c "SELECT current_user, current_database();"
 codex_dev | erp_evok_audio_test

$ ... "CREATE TABLE codex_probe(x int); INSERT ...; SELECT count(*); DROP TABLE codex_probe;"
CREATE TABLE / INSERT 0 2 / inseridos=2 / DROP TABLE

$ ... 'SELECT count(*) FROM "SequelizeMeta";'
 169
```

169 migrations confere com o número medido em `G4_PRECONDICAO_BANCO_TESTE.md` —
é o mesmo banco de teste real, não um banco vazio.

Credencial gravada **apenas** em `.env` (raiz), confirmado ignorado
(`.gitignore:2`), como `CODEX_DB_HOST/PORT/NAME/USER/PASSWORD`.

---

## 2. Agente Codex espelhando o papel

`.codex/agents/sanacore-remediation-engineer.toml` — **mesmo nome, mesmo prefixo
`sanacore-`, mesmo contrato** de
`.claude/agents/sanacore/sanacore-remediation-engineer.md`. Missão,
responsabilidades, PODE/NÃO PODE, entradas, saídas e critério de conclusão são
os mesmos. O que muda é o motor.

Adaptações — todas por diferença de mecanismo, nenhuma por diferença de papel:

- usa **exclusivamente** `CODEX_DB_*` (`codex_dev`), nunca `DB_*` (`evok_admin`);
- sabe que `org-isolation.js` **não roda** sob Codex, e que os mecanismos do lado
  dele são a credencial e o git hook;
- proibido de usar `--no-verify`.

---

## 3. Worktree — mesma convenção

`sana/ERP-LEGACY-001/<CASE-ID>`. **Não** existe pasta `codex/`. O papel é o
mesmo, o lugar de trabalho é o mesmo. Um leitor futuro do histórico vê
`sana/ERP-LEGACY-001/CASE-00N` e não precisa saber qual motor rodou — que é
exatamente o ponto.

---

## 4. Guarda de git — agnóstica de ferramenta

`core.hooksPath` → `.githooks/` com `pre-commit` e `pre-push`. É mecanismo do
**git**, não do Claude Code: vale para Codex, IDE, ou git na mão.

**Bloqueia:** `audit/`, `coretriad/governance/`, `coretriad/states/`, `.claude/`
**Faixa liberada:** `main` e `audit/*` — e só elas.

### 4.1 Por que por faixa, e não bloqueio cego

Os quatro caminhos são o **produto de trabalho legítimo** da VeriCore e do
Director. Bloqueá-los em toda branch inviabilizaria o próprio run: não haveria
como registrar finding, aprovação ou estado. A ameaça real é o motor de
**remediação**, que trabalha em `sana/*`. A regra é fail-closed: faixa
desconhecida bloqueia.

### 4.2 Defeito encontrado pelo próprio teste — e corrigido

A primeira versão usou `core.hooksPath = .githooks`, **relativo**. Na worktree
`sana/ERP-LEGACY-001/CASE-003`, cuja branch é anterior à criação de `.githooks/`,
o diretório não existe — o git não encontrou hook nenhum e **o commit passou**.

Falha **aberta**: o modo errado. Medido, não suposto — o teste B reprovou e criou
um commit real, que foi revertido e a worktree restaurada a `95aeff4`.

Corrigido em duas frentes:
1. `install-git-hooks.sh` grava **caminho absoluto**, sempre apontando para a
   worktree principal;
2. `pre-commit`/`pre-push` resolvem a guarda por `$(dirname "$0")`, não por
   `git rev-parse --show-toplevel` — que numa worktree devolve o lugar errado.

### 4.3 Bateria de verificação — `scripts/test-git-hooks.sh`

Recusa educada não é prova: cada caso **executa** um `git commit` real e confere
o HEAD depois.

```
  [PASS] hooksPath e absoluto
  [PASS] commit em audit/ permitido            (faixa Director/VeriCore)
  [PASS] audit bloqueado, HEAD intacto         (faixa SanaCore)
  [PASS] coretriad/governance bloqueado, HEAD intacto
  [PASS] coretriad/states bloqueado, HEAD intacto
  [PASS] .claude bloqueado, HEAD intacto
  [PASS] remediation/ permitido                (não trava a própria SanaCore)
TODOS OS CASOS PASSARAM
```

### 4.4 Limites declarados

1. **`git commit --no-verify` contorna qualquer pre-commit.** Isto é guarda contra
   **engano**, não barreira contra **intenção**. O `pre-push` é a segunda camada
   pelo mesmo motivo, e também é contornável.
2. **`core.hooksPath` é config local — não viaja no clone.** Máquina nova precisa
   rodar `sh scripts/install-git-hooks.sh`. Relevante porque este projeto opera em
   duas máquinas via GitHub.

---

## 5. PENDÊNCIA DE PROVA — nomeada, não escondida

**A prova dinâmica de que `codex_dev` é recusada por produção NÃO foi executada.**

O comando exigiria nomear o banco de produção, e o hook `org-isolation.js`
bloqueia qualquer comando que contenha essa string — inclusive vindo da sessão
principal. O hook agiu corretamente; ele não distingue "conectar em produção" de
"tentar conectar para provar que falha".

O que existe hoje:

| Prova | Estado |
|---|---|
| **Estática** — `codex_dev` ausente da ACL de produção; `PUBLIC` sem `CONNECT` | **FEITA**, §1.3 |
| **Dinâmica** — tentativa real de conexão retornando `FATAL: permission denied` | **NÃO FEITA** |

A prova estática é o **mecanismo**; a dinâmica seria a **confirmação**. O
precedente `evok_audit` teve as duas (`G4_…` §4.1). Para igualar, é preciso uma
autorização humana explícita e escopada para **um** comando de tentativa de
conexão — que **deve falhar**. Decisão do dono, caso a caso, nunca por extensão
(`APR-2026-016`).

---

## 6. Fluxo operacional — dentro da estrutura existente

| # | Etapa | Quem | Onde |
|---|---|---|---|
| a | Triagem / causa-raiz | **Claude Code** (`sanacore-remediation-triage`) | `remediation/cases/<CASE-ID>/TRIAGE.md` |
| b | Despacho do `REMEDIATION_CASE` | **`coretriad-director`** | control plane |
| c | Implementação | **Codex** como `sanacore-remediation-engineer` | worktree `sana/ERP-LEGACY-001/<CASE-ID>` |
| c' | Evidência | mesmo formato `REMEDIATION_EVIDENCE_PACKAGE` de sempre | `remediation/cases/<CASE-ID>/` |
| d | Segunda opinião antes do handoff | **Claude Code** — papel espelhado do que o Codex fez no `CASE-005` | parecer, não decisão |
| e | Reteste independente | **VeriCore** | autoridade de fechamento **inalterada** |

**A etapa (e) não muda nunca, seja qual for o motor que implementou.** Só a
VeriCore declara `RETEST_PASSED` e `FINDING CLOSED` (Regra 4). `REMEDIATION_COMPLETE`
é da SanaCore e **não** substitui reteste (Regra 3).
