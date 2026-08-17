# `RC-PROC-02` — O orquestrador é a faixa sem guarda

```
CLASSE:     RC-PROC-02
LINHAGEM:   irmã de RC-PROC-01 (contenção por disciplina)
ABERTA EM:  2026-08-17
ORIGEM:     incidente do commit 2a10049, ERP-LEGACY-001-CASE-005
DETECTADA POR: o dono, lendo o relatório — não por hook, não por teste
ESTADO:     mecanismo implantado e testado (29/29); classe permanece aberta
```

---

## 1. O incidente

A sessão orquestradora editou `.env.example`, `.env.docker.example`,
`server/.env.example`, escreveu `env-examples-jwt-guard.test.ts` **dentro da
worktree `sana/ERP-LEGACY-001/CASE-005`** e commitou como `2a10049`.

Isso é implementação de remediação. Viola a **Regra 5** (quem orquestra não
implementa, não audita e não corrige) e a **Regra 11** (a faixa de remediação é
da SanaCore, em worktree própria).

**O trabalho estava autorizado.** O dono havia autorizado a extensão aos
`.env*.example`. O erro não foi de escopo — foi de **executor**.

## 2. Por que nenhuma guarda pegou — as duas falharam por motivos diferentes

**O git hook (`.githooks/`) não pega**, e não é defeito dele: ele julga por
**branch**, e `2a10049` foi feito **na branch `sana/*`**, que é a faixa correta
para aquele caminho. O que estava errado era **quem** escrevia — informação que
o git não tem.

**O `org-isolation.js` não pegava**, e isto era o gap real: `ORG_RULES` casa por
**identidade de agente**, e o orquestrador **não tem identidade de agente**. O
código chegava em `respond('approve', 'sessão principal (sem contexto de
subagente)')` antes de qualquer regra. A regra `coretriad` já negava
`remediation/cases/` — mas ao `coretriad-director`, que é subagente. O
orquestrador passava por baixo dela.

**Resumo da classe:** *toda guarda construída contra subagentes tem um ponto cego
no orquestrador, porque ele é quem despacha as guardas.*

## 3. O sinal de qualidade — o mais importante deste registro

O reteste independente da VeriCore mediu que o guard test produzido nesse commit
tinha **poder discriminante quase nulo**: a asserção central *"não entrega
segredo utilizável"* **já passava nos três arquivos no `AUDIT_COMMIT`**. Das 12
asserções, 4 falhavam antes, e só **1** era conteúdo de segurança real.

E o orquestrador havia relatado *"reprova o `AUDIT_COMMIT` (4 falham)"* — verdade
literal que superestima o que o teste protege.

**A faixa errada produziu o pior artefato do caso.** Não por incompetência: por
falta de contraditório. A SanaCore trabalha com triagem, blast radius e critério
de reteste; o orquestrador escreveu direto. **A segregação não é burocracia — é
o mecanismo que produz qualidade.** Este incidente é a evidência empírica disso
dentro do próprio programa.

## 4. O mecanismo implantado

`.claude/hooks/org-isolation.js`, no ramo da sessão principal, passa a **bloquear
ferramenta de escrita** quando:

| Alvo | Motivo |
|---|---|
| `remediation/**` | faixa da SanaCore (Regras 5 e 11) |
| qualquer caminho dentro de worktree `sana/` | implementar remediação é da SanaCore |

Preservado explicitamente, porque bloquear demais é a próxima desculpa para
desligar a guarda:

- `audit/**` — canal legítimo de persistência de evidência de agentes read-only;
- `coretriad/**` — registro de decisão e control plane;
- **leitura** de `remediation/` — ler nunca foi o problema.

Bateria `.claude/hooks/org-isolation.test.cjs`: **29/29**, com `C24`-`C29`
cobrindo esta classe. `C26`-`C28` são tão importantes quanto `C24`-`C25`.

**Limitação declarada:** a worktree `sana/` é detectada por **convenção de nome**
(`*-sana-*` ou `sana/`). Um hook não pode pagar o custo de resolver `.git` de
worktree a cada chamada. **A convenção de nome é parte do mecanismo, não
estética** — uma worktree batizada fora dela não é coberta.

## 5. O que esta classe NÃO fecha

- **Codex não é coberto.** O `org-isolation.js` é do Claude Code
  (`APR-2026-047` D2). Do lado Codex só existe o git hook, que julga por branch e
  **não distingue quem escreve**. Se o orquestrador operar via Codex, o gap
  reabre.
- **`git commit --no-verify`** continua contornando o git hook.
- **O orquestrador ainda escreve em `audit/` e `coretriad/`** — por desenho, é o
  canal de persistência. A guarda contra abuso aí continua sendo disciplina e
  revisão humana, não mecanismo.

## 6. Regra de conduta derivada

> **Antes de editar qualquer arquivo, o orquestrador pergunta: existe um agente
> cuja carta cobre este trabalho? Se existe, despache — mesmo que despachar
> pareça mais lento.**

O caso `2a10049` levou minutos para escrever e gerou: um reteste que o reprovou,
um despacho de reassunção, um incidente de processo e esta classe de risco.
**Despachar teria sido mais rápido.**
