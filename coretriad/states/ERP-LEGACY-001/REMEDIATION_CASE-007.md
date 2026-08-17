# `REMEDIATION_CASE` — `ERP-LEGACY-001-CASE-007` / `AUD-AUTHN-03`

```
CASE_ID:       ERP-LEGACY-001-CASE-007
FINDING_ID:    AUD-AUTHN-03 — HIGH, produção real, estrato 2
PROJECT_ID:    ERP-LEGACY-001
AUTORIZAÇÃO:   APR-2026-052 (D1-D5 e despacho)
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regra 12)
EXECUTOR:      Codex, como `sanacore-remediation-engineer` (APR-2026-051)
WORKTREE:      c:\Sistema EvokAudio\ERP-Evok-sana-CASE-007   (criada, pronta)
BRANCH:        sana/ERP-LEGACY-001/CASE-007
BASE:          740c5e8
```

> **Estado: DESPACHO PREPARADO, NÃO INVOCADO.** O Codex CLI não está no `PATH` da
> máquina onde a sessão Claude Code roda. Este arquivo é o pacote a ser executado
> na sessão Codex do dono. **A implementação não começou.**

---

## 1. Como invocar

Na sessão Codex, com o **sandbox de leitura desativado** (o engenheiro escreve) e
o agente `sanacore-remediation-engineer` (`.codex/agents/sanacore-remediation-engineer.toml`),
a partir de `c:\Sistema EvokAudio\ERP-Evok-sana-CASE-007`.

O prompt da §3 é para colar literalmente.

## 2. Leitura obrigatória do executor

| Artefato | Para quê |
|---|---|
| `remediation/cases/ERP-LEGACY-001-CASE-007/TRIAGE.md` | **a triagem inteira** — causa-raiz, vetores V1/V2/V2b/V3, critérios R1-R6, armadilhas |
| `.codex/agents/sanacore-remediation-engineer.toml` | a sua carta: PODE / NÃO PODE / limites |
| `CLAUDE.md` | as 24 regras |

## 3. O prompt

```text
Você é o `sanacore-remediation-engineer` (motor: Codex). Implemente a remediação
do ERP-LEGACY-001-CASE-007 (AUD-AUTHN-03).

BRANCH/WORKTREE: sana/ERP-LEGACY-001/CASE-007, já criada, base 740c5e8.
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f

LEIA PRIMEIRO, INTEIRO:
  remediation/cases/ERP-LEGACY-001-CASE-007/TRIAGE.md

A triagem é o seu insumo principal e foi escrita para quem chega sem contexto.
Ela separa o que foi PROVADO do que foi ASSUMIDO — respeite essa separação e
diga se discordar de qualquer ponto.

O DEFEITO, EM UMA FRASE
`apiRequestKey` (server/app.ts:74-90) usa `jwt.decode`, que NÃO verifica
assinatura, como chave do rate limiter. O atacante escolhe a própria chave.
Num controle que particiona tráfego, quem controla o particionador controla o
controle. O mesmo vale para `loginAttemptKey` (:50), que particiona por
`req.body.email`.

A causa-raiz NÃO é descuido: o comentário :65-73 mostra que o uso de `decode`
foi deliberado e documentado. A falha é de MODELO DE AMEAÇA — a análise cobriu
o caso acidental e o eixo autorização, nunca o caso adversarial. Portanto
"trocar decode por verify" NÃO é a correção: quebraria a proteção de limitar
antes de autenticar. Separe as duas coisas.

DECISÕES DO DONO — vinculantes (APR-2026-052, D1 e D2 revistos na EMENDA-01)
  D1  Teto por IP: 1600 requisições/minuto.
      Derivação explícita do dono: 80 terminais × 20/min — preserva o ritmo
      atual POR TERMINAL, com folga, para evitar 429 legítimo em pico real.
  D2  Cota COMBINADA: por IP **E** por usuário autenticado. Não é ou/ou.
      Valor por usuário: 300 / 15min — CONFIRMADO pelo dono, mesmo valor de
      hoje. Não é assunção: é decisão registrada.
  D3  TRUST_PROXY entra no escopo. Sem ele, com proxy na frente, o limite por
      IP conta a fábrica inteira como um único cliente.
  D4  Todo acionamento de 429 gera log/métrica observável. Hoje não há
      nenhuma (requestContext.ts:27-38 loga só statusCode) — V2 é invisível
      em produção.
  D5  A proteção pode ser condicional a F3 (rotação da chave JWT do CASE-005).
      Não espere a rotação.

OS DOIS NÚMEROS, EM CONSTANTES NOMEADAS
  Teto por IP        1600 / minuto
  Teto por usuário    300 / 15 minutos   (autenticado)
  Ambos em constante nomeada, cada um num só lugar, configuráveis. Os dois são
  DECISÃO DO DONO — não os altere por conta própria, em nenhuma direção.

O QUE MUDA DE FATO
  Hoje  apiLimiter = 300 / 15min = 20/min, com chave FORJÁVEL — o teto não
        existe na prática: rotação de `id` o anula.
  Novo  camada IP = 1600/min com chave REAL
        + camada por usuário autenticado = 300/15min (o valor de hoje).

  Aritmética verificada, e é o ponto de D1: 1600 ÷ 80 terminais = 20/min por
  terminal — exatamente o ritmo atual. A revisão de D1 (de 1000 para 1600)
  existe justamente para NÃO apertar o usuário legítimo atrás de NAT.

  Se ainda assim aparecer 429 legítimo em pico real, isso é insumo para o dono
  rever o número — reporte com medição. NÃO "conserte" mexendo na constante.

TRÊS ARMADILHAS CONFIRMADAS PELA TRIAGEM — não caia em nenhuma

1. SEGURANÇA. `server/tests/setup.ts:5` define só NODE_ENV; `DB_NAME` cai no
   default do schema, que é o nome do banco de PRODUÇÃO REAL. Importar
   `app.ts` num teste arrasta models/index -> config/database. NUNCA importe
   `app.ts` num teste novo. Teste a função de chave ISOLADA. Isso também
   resolve a armadilha 2.

2. TESTABILIDADE. `apiRequestKey` e `loginAttemptKey` NÃO são exportadas —
   nenhum teste as alcança hoje. E sob NODE_ENV=test o orçamento do apiLimiter
   é 100000 (app.ts:113), então supertest nunca estoura o limiter.
   Testabilidade é REQUISITO da correção, não consequência.

3. ANTI-CRITÉRIO. Um teste do tipo "depois de N requisições vem 429" passa
   ANTES e DEPOIS — não protege nada. O defeito não é SE existe contador; é
   DE QUEM é o contador. O teste tem de provar que a chave não é mais
   escolhida pelo requisitante.

CRITÉRIO INEGOCIÁVEL
  Todo teste de regressão tem de REPROVAR o estado do AUDIT_COMMIT e passar
  depois. Verifique executando contra o estado anterior. Para medir o estado
  anterior, NÃO reverta arquivo dentro da worktree — extraia a árvore para
  fora (`git archive c1311a6f | tar -x -C <tmp>/antes`) e meça lá. Um agente
  que reverteu in-place neste programa morreu no meio e deixou o patch fora da
  worktree. Se não conseguir provar que reprova, diga que não conseguiu.
  Siga os critérios R1-R6 da §7 da triagem.

FORA DE ESCOPO — não invente trabalho
  - AUD-AUTHN-01 / CASE-005: RETEST_PASSED, FINDING NOT CLOSED, branch não
    mesclada. NÃO toque em runtimeEnv.ts sem levantar o conflito antes — é
    território daquela branch, ainda aberta. Se D3 exigir variável nova, PARE
    e reporte.
  - NÃO toque em server/package.json — CASE-003, CASE-004 e CASE-006 já o
    alteram.
  - T18-F02, AUD-AUTHN-02, T22-F02: fora, por decisão registrada.
  - Rotação da chave de produção: gate humano sem prazo (APR-2026-049 D3).

CONTRADIÇÕES QUE A TRIAGEM DEVOLVEU — não as "resolva", elas são de auditoria
  T18-F05 fala em alg:none (desnecessário); T-02 delimitou mal o refreshLimiter
  para o vetor V2; T18-F05:124 alega um limiter de login por IP que NÃO EXISTE
  no código. São registros de auditoria a retificar pela VeriCore, não trabalho
  seu. Não edite `audit/`.

RESTRIÇÕES INVIOLÁVEIS
  - O banco de PRODUÇÃO REAL é proibido, sem exceção, nem para contar linhas
    (APR-2026-016). Use SOMENTE a credencial codex_dev, lida do .env local
    (CODEX_DB_*), que só alcança o banco de teste. NUNCA use DB_USER/DB_PASSWORD
    (evok_admin, superuser, enxerga os dois bancos).
  - Nunca copie valor de segredo para relatório, commit, teste ou log.
  - Você NÃO fecha finding, NÃO declara RETEST_PASSED (Regras 3 e 4). Pode
    declarar REMEDIATION_COMPLETE; o finding segue RETEST_REQUIRED.
  - NÃO escreva em audit/, coretriad/, .claude/. O git hook bloqueia, e está
    certo. NUNCA use `git commit --no-verify`.
  - Regra 6: não invente regra de negócio. Se a correção depender de regra não
    escrita em artefato versionado, PARE e pergunte.

RETORNO
  O que mudou (arquivo e linha); saída dos testes ANTES e DEPOIS, com o número
  de casos que falham contra o AUDIT_COMMIT; como D1-D5 foram atendidas uma a
  uma; o REMEDIATION_COMMIT; e o que você discorda do que recebeu.
```

## 4. Depois que o Codex terminar

| # | Etapa | Quem |
|---|---|---|
| 1 | Segunda opinião / revisão do patch | **Claude Code** (`APR-2026-051`) |
| 2 | Reteste independente | **VeriCore** |
| 3 | Veredito e fechamento | **VeriCore** — autoridade inalterada (Regra 4) |

Nenhuma declaração de `RETEST_PASSED`, `FINDING CLOSED` ou `REMEDIATION_COMPLETE`
é feita por este documento.
