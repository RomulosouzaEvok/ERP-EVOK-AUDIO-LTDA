# VEREDITO DE RETESTE — `ERP-LEGACY-001-CASE-007` / `AUD-AUTHN-03`

```
EMITIDO POR        vericore-authentication-auditor (VeriCore)
DATA               2026-08-18
FINDING            AUD-AUTHN-03 — HIGH / severidade fixada, não reavaliada (Regra 18)
CASO               ERP-LEGACY-001-CASE-007
AUDIT_COMMIT       c1311a6f76b512fef893f7e60d934179cae3409f   (imutável, Regras 12-14)
REMEDIATION_COMMIT ef4b8457a686347ca9ef9d39f0264197ffee19d9  (+ CORRECAO_01, login-IP + TRUST_PROXY)
BRANCH             sana/ERP-LEGACY-001/CASE-007
```

```
VEREDITO 1 (reteste técnico) ......... RETEST_PASSED
VEREDITO 2 (fechamento do finding) ... FINDING CLOSED, com F-itens não bloqueantes
```

## Base probatória e limite

Não reexecutei a suíte. Baseio-me em: (a) evidência dinâmica coletada por outro agente VeriCore, com reprodução independente do "vermelho antes" via `git archive` do `AUDIT_COMMIT` em scratch isolado — `case007-rate-limit-source.test.ts` **FALHA** contra `c1311a6f76b512fef893f7e60d934179cae3409f` e **PASSA** contra o `REMEDIATION_COMMIT` (poder discriminante real, atende ao anti-critério do `TRIAGE.md` §7.2); (b) leitura própria de `TRIAGE.md` íntegro e de `REMEDIATION_EVIDENCE_PACKAGE.md`, incluindo a seção `CORRECAO_01`.

## Por vetor

**V1 (diluição do teto por `id` forjado rotativo) — FECHADO.** R2 confirmado dinamicamente. A causa-raiz (`jwt.decode` como fonte de chave) foi eliminada por desenho: `apiIpLimiter` pré-auth chaveia estritamente por IP; `authenticatedUserLimiter` só roda pós-`jwt.verify` com `req.user` populado. R5 confirmado: zero ocorrências de `jwt.decode` em `server/src`.

**V2 (DoS dirigido a usuário nomeado) — FECHADO.** Decorre da mesma correção estrutural: sem token válido, o atacante não alcança mais o balde de um usuário nomeado.

**V2b (consumo de cota de refresh por terceiro não autenticado) — FECHADO, com ressalva metodológica que não reabre o vetor.** A prova é estrutural (não há mais limiter pré-auth chaveável por token não verificado no caminho de `/api/auth/refresh`), sem teste de integração dinâmico direto. Isto é **aceitável**: (1) a ausência de teste de integração é a regra permanente `APR-2026-016` operando como desenhada, e o próprio `TRIAGE.md` §7.3 restringe o critério de reteste a testes unitários puros — R6 não exige suíte de integração, exige prova de que o particionador não confiável foi removido do caminho, o que é demonstrável estruturalmente; (2) a propriedade provada estruturalmente é suficiente para a causa do defeito (o defeito nunca foi "o valor da cota está errado", foi "o particionador é entrada não confiável antes da autenticação"); (3) o risco residual é baixo e monitorado — `case007-rate-limit-source.test.ts` já atua como guarda de regressão para reintrodução de `jwt.decode` ou limiter pré-auth em refresh. **Pendência declarada, não bloqueante:** se e quando integração for autorizada caso a caso sob `APR-2026-016`, adicionar teste dinâmico direto medindo consumo de cota por terceiro não autenticado.

**V3 (password spraying por rotação de e-mail) — FECHADO.** Confirmado dinamicamente com supertest: 429 na 4ª tentativa de e-mails diferentes do mesmo IP. Isto fecha o problema bloqueante identificado na segunda opinião do director (`CODEX_CORRECTION_DISPATCH_01.md` §2) — a primeira entrega (`ef4b845`) fechou V1/V2/V2b mas deixou V3 pendente; a `CORRECAO_01` (contador agregado por IP no login + `TRUST_PROXY` obrigatório em produção) fecha o que faltava.

## Débito declarado — `rateLimitPolicy.ts` lendo `process.env` diretamente

**Não bloqueante.** É debt sobre **onde** a configuração é lida, não sobre **quem controla a chave de particionamento** do limiter — que é a propriedade auditada por `AUD-AUTHN-03`. Mesmo com fallback silencioso em `process.env`, a chave continua determinada por IP/usuário autenticado, não por entrada do atacante. Fica como pendência dirigida ao `CASE-005`/dono (território de `runtimeEnv.ts`, já com `F1-F4` próprios em aberto), não a este caso.

## O que este veredito NÃO significa

1. Não valida que a cota por usuário autenticado é incondicional à rotação de `JWT_SECRET` — permanece condicional a `AUD-AUTHN-01`/`CASE-005` F3 (gate humano em aberto), já registrado naquele finding.
2. Não fecha nenhum finding de `runtimeEnv.ts`/`CASE-005`.
3. Não atesta que os números D1/D2 (1600/min IP, 300/15min usuário) são operacionalmente corretos para a fábrica — apenas que o mecanismo de particionamento e as guardas de regressão estão corretos.
4. Não é `REMEDIATION COMPLETE` — autoridade da SanaCore.

## Registro formal

```
AUD-AUTHN-03   severidade HIGH (inalterada — Regra 6/18)
               confiança  CONFIRMED
               estado     RETEST_PASSED
               FINDING CLOSED — vetores V1/V2/V2b/V3 todos fechados.
Autoridade:    vericore-authentication-auditor, Regra 4.
```

### F-itens rastreáveis (não bloqueiam o fechamento)

| ID | Item | Responsável | Bloqueia? |
|---|---|---|---|
| F1 | `rateLimitPolicy.ts` lê `process.env` direto, fallback silencioso; mover para schema Zod é território do CASE-005 | dono / SanaCore (CASE-005) | Não |
| F2 | V2b só com prova estrutural, sem teste de integração dinâmico (bloqueado por APR-2026-016) | SanaCore / VeriCore (reteste futuro) | Não |
| F3 | `mobile npm ci` não executado (lockfile fora de sincronia, pré-existente) | SanaCore / dono | Não |
| F4 | Cota por usuário autenticado condicional a rotação de JWT_SECRET (AUD-AUTHN-01 F3) | dono | Não |
