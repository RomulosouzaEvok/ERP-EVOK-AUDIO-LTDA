# VEREDITO DE RETESTE — `ERP-LEGACY-001-CASE-018` / `AUD-AUTHN-02`

```
EMITIDO POR        vericore-authentication-auditor (VeriCore)
DATA               2026-08-18
FINDING            AUD-AUTHN-02 — HIGH (estrato 2, produção real, APR-2026-016)
CASO               ERP-LEGACY-001-CASE-018
AUDIT_COMMIT       c1311a6f76b512fef893f7e60d934179cae3409f   (imutável, Regras 12-14)
REMEDIATION_COMMIT 078ee8b  (+ correção de encoding não commitada, apenas mojibake→UTF-8)
BRANCH             sana/ERP-LEGACY-001/CASE-018
WORKTREE           C:\Sistema EvokAudio\ERP-Evok-sana-CASE-014
```

```
VEREDITO 1 (reteste técnico do mecanismo de código) ... RETEST_PASSED
VEREDITO 2 (fechamento do finding) ..................... FINDING PARCIALMENTE FECHADO
                                                          (código/config fecha; credencial existente
                                                          permanece indeterminada — gate humano)
```

**Nenhum `RISK_ACCEPTED` é declarado aqui — só o dono pode aceitar esse risco (Regra 18), e não o fez.**
**Nenhuma severidade é reavaliada aqui (Regra 6/18): `AUD-AUTHN-02` permanece HIGH.**

## Base probatória e limite

Baseio-me em evidência dinâmica coletada por outro agente VeriCore (worktree `ERP-Evok-sana-CASE-014`, branch `sana/ERP-LEGACY-001/CASE-018` @ `078ee8b`), em leitura própria de `TRIAGE.md` (íntegro, incluindo §3.4 "gate morto" e §9 critério de reteste CR-018-E1..E12/DYN-018-01..06), de `REMEDIATION_EVIDENCE_PACKAGE.md` e de `PENDING_DECISION.md` (as 4 perguntas, nenhuma respondida em `APPROVALS.md`).

## Parte (a) — código/config/guardas: RETEST_PASSED

**D-1 (default versionado no compose) — FECHADO.** `docker-compose.yml:57` trocado de `${ADMIN_SEED_PASSWORD:-...}` para `${ADMIN_SEED_PASSWORD:?...}`, mesma forma já usada para `DB_PASSWORD` no mesmo arquivo e em `docker-compose.prod.yml:105`. CR-018-E1/E2 confirmados.

**D-2 (fallback hardcoded no seed) — FECHADO.** `seeds.ts:138` não contém mais `|| '<literal>'`. CR-018-E3 confirmado.

**D-3 (comprimento que só avisa) — FECHADO.** Validação movida para dentro de `seedDatabase()`, **depois** do guard `userCount > 0` (`:117-121`), **independente de `NODE_ENV`** — este é o critério mais importante do caso, porque é exatamente o que evita reproduzir o "gate morto" §3.4 (o early-return de `runtimeEnv.ts:73` que mata guardas de produção fora do ramo `production`). Confirmado: a validação nova roda em `development`, `test` e `production` igualmente. CR-018-E4/E5/E6/E7 confirmados.

**O teste que travava o defeito — CORRIGIDO.** `seeds-production-boot.test.ts:79-85` e `:133-150` antes **assertavam** o literal de fallback e o `console.warn` em senha curta como comportamento esperado — a armadilha mais grave do caso (um teste que congela o defeito, fazendo a suíte passar verde *porque* afirma que o defeito é correto). Confirmado que os 2 casos foram **reescritos** (não apenas o literal trocado): agora assertam `rejects.toThrow` e `User.create` não chamado. 10/10 testes das duas suítes relevantes (`seeds-production-boot.test.ts` 5/5, `docker-compose-admin-seed-guard.test.ts` 5/5) passando, com os novos casos rodando explicitamente sob `NODE_ENV=development` para provar que não reproduzem o gate morto. CR-018-E8 confirmado.

**Conformidade preservada.** `docker-compose.prod.yml` e os três `.env*.example` não regrediram (CR-018-E9/E10).

**Typecheck limpo.**

**Avaliação da suficiência da cobertura dinâmica declarada como não executada:**

- **Suíte completa (1956/1957) não reexecutada nesta rodada** — apenas as 2 suítes diretamente relevantes foram rodadas. Isto é aceitável para o veredito de RETEST_PASSED do mecanismo de código: as suítes relevantes têm poder discriminante direto sobre o defeito auditado, e a regressão ampla (1956/1957, com a única falha pré-existente e não relacionada, `docs-path-reference-guard.test.ts`) já havia sido relatada pelo pacote de evidência com verificação independente do diff. Fica registrada como item de cobertura a confirmar em reteste de integração, não como bloqueio.
- **`docker compose config` não executado** (worktree sem `.env` local) — não é defeito de código, é limitação de ambiente. Fica como pendência de verificação de integração (F-item abaixo), não bloqueia o veredito do mecanismo.
- **Não existe teste isolado dedicado para "senha curta mas não-placeholder" (DYN-018-02)** — coberto só por leitura de código (a validação de comprimento em `seeds.ts:126-140` é lida diretamente, com âncora de linha), não por teste automatizado dedicado a esse caso específico. Isto é uma lacuna real de cobertura de teste automatizado, mas **não invalida** o RETEST_PASSED do mecanismo: a lógica que rejeita senha curta é a mesma lógica (mesmo bloco de código, mesma ordem de checagem: ausência → placeholder → comprimento) que os testes reescritos já exercitam para os outros dois ramos (ausência e placeholder), e a leitura direta do código confirma que o `throw` de comprimento está no mesmo caminho, antes de `User.create`. Fica como F-item para fechar a lacuna de teste automatizado dedicado, não como reprovação.

**Conclusão da parte (a): RETEST_PASSED.** As três âncoras do defeito (D-1/D-2/D-3) estão corrigidas, o gate morto não foi reproduzido (a validação nova é independente de `NODE_ENV` — confirmado, não apenas alegado), e o teste que travava o defeito foi corrigido, não maquiado.

## Parte (b) — estado da credencial admin de produção existente: NÃO FECHADA, gate humano

Esta parte não é minha para decidir e não decido aqui. Registro apenas o efeito sobre o veredito do finding, conforme a própria triagem antecipou em §9.2 armadilha 6 ("Declarar `AUD-AUTHN-02` fechado com E-1…E-7. O código fica correto e a reintrodução fica travada. Se a conta admin de produção já tem a senha versionada, ela continua tendo... Mecanismo ≠ estado da credencial").

As 4 perguntas de `PENDING_DECISION.md` permanecem sem resposta em `APPROVALS.md`:
1. Autorizar verificar se a senha do admin de produção é a versionada — não respondida.
2. Rotacionar a senha do admin de produção — não respondida.
3. Confirmar `ADMIN_SEED_PASSWORD` no `.env` de cada máquina antes do próximo `docker compose up` — não respondida.
4. Verificar estado do segundo PC/réplicas — não respondida.

O guard de idempotência `seeds.ts:117-121` (`User.count() > 0`), que é o controle compensatório que rebaixa o finding de CRITICAL a HIGH, **garante que nenhum boot futuro corrija uma senha fraca já gravada** na conta existente. Isto significa: a correção de código impede a **reintrodução** do defeito em contas futuras/novos bancos, mas não pode, por desenho, **corrigir** o estado da conta `admin@evokaudio.com.br` que já existe em produção — que é, precisamente, a única linha de `users` classificada como produção real (`PRODUCTION_STATUS_MAP.md:130`; `APR-2026-016`), com `role:'admin'`, autorizando os endpoints do sistema.

Este veredito **não** tenta responder se a senha atual é a versionada, **não** autoriza inspeção de dado real nem tentativa de login, e **não** aceita o risco em nome do dono. `APR-2026-016` exige aprovação humana caso a caso, nunca por extensão ou inferência.

## O que este veredito NÃO significa

1. Não fecha `AUD-AUTHN-02` totalmente. O código/config está correto e travado contra reintrodução; o estado da credencial admin real permanece indeterminado.
2. Não fecha `T18-F02` (early-return de `runtimeEnv.ts:73` que mantém 8 outras guardas de produção inalcançáveis fora de `NODE_ENV=production`) — fora de escopo deste caso, confirmado intocado.
3. Não fecha `T22-F02` (validação de compose via `docker compose config`) — a guarda estática nova vê a forma do arquivo, não prova que o compose parseia; não verificado nesta rodada por ausência de `.env` na worktree.
4. Não autoriza nem executa rotação de credencial de produção.
5. Não é `REMEDIATION COMPLETE` — autoridade da SanaCore.

## Registro formal

```
AUD-AUTHN-02   severidade HIGH (inalterada — Regra 6/18)
               confiança  CONFIRMED (mecanismo de código reproduzido e corrigido)
               estado     RETEST_PASSED (mecanismo de código)
               FINDING PARCIALMENTE FECHADO:
                 - fechado: D-1, D-2, D-3, gate morto não reproduzido, teste que
                   travava o defeito corrigido.
                 - NÃO fechado: estado da credencial admin de produção existente
                   (indeterminado, L-T02-02), rotação (bloqueada por APR-2026-016,
                   gate humano sem prazo).

Autoridade:    vericore-authentication-auditor, Regra 4.
```

### F-itens rastreáveis

| ID | Item | Responsável | Bloqueia fechamento total? |
|---|---|---|---|
| F1 | Estado da senha admin de produção indeterminado (a senha atual é a versionada?) — `L-T02-02` | dono, via `PENDING_DECISION.md` pergunta 1 | **Sim — é o item central do fechamento material** |
| F2 | Rotação da senha do admin de produção não executada | dono, via `PENDING_DECISION.md` pergunta 2 | Sim, se F1 confirmar exposição |
| F3 | `ADMIN_SEED_PASSWORD` não confirmada em cada máquina antes do próximo `docker compose up` (próximo `up` pode falhar em máquina sem a variável, por desenho) | dono, via `PENDING_DECISION.md` pergunta 3 | Não — efeito operacional esperado, não reabre o finding |
| F4 | Estado do segundo PC/réplicas/homologação não verificado | dono, via `PENDING_DECISION.md` pergunta 4 | Não — superfície residual declarada, não medida |
| F5 | Suíte completa (1956/1957) e `docker compose config` não reexecutados nesta rodada de reteste | VeriCore (reteste de integração futuro) | Não — regressão ampla já relatada com verificação independente do diff |
| F6 | Ausência de teste automatizado dedicado a "senha curta mas não-placeholder" (DYN-018-02); coberto hoje só por leitura de código | SanaCore (reforço de cobertura) | Não — mesma lógica já exercitada para os outros dois ramos |
| F7 | `T18-F02` (gate morto de `runtimeEnv.ts:73`) e `T22-F02` (validação de compose) permanecem abertos, fora de escopo deste caso | dono / backlog | Não — findings próprios, já registrados |
