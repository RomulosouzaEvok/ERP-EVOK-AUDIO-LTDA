# Despacho de correção — CORREÇÃO 01 — `ERP-LEGACY-001-CASE-007`

```
CASE_ID:      ERP-LEGACY-001-CASE-007
FINDING_ID:   AUD-AUTHN-03
ESCOPO:       Correção de 1 problema bloqueante (metade do finding nunca
              corrigida) + 1 problema de configuração, achados na segunda
              opinião aprofundada sobre commit ef4b845
BRANCH:       sana/ERP-LEGACY-001/CASE-007
WORKTREE:     C:\Sistema EvokAudio\ERP-Evok-sana-CASE-007
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Contexto

A correção anterior (commit `ef4b845`) fechou 3 dos 4 vetores do finding
(diluição do teto por header forjado, DoS dirigido a usuário nomeado,
consumo de cota de refresh da vítima) — todos confirmados corretos pela
segunda opinião. Mas **o vetor mais grave (V3 — password spraying) nunca
foi endereçado**, e uma decisão do dono (`APR-2026-052` D3) nunca foi
executada. Este despacho corrige só isso — não reabre o que já está
correto.

## 2. Problema 1 (BLOQUEANTE) — contador agregado por IP no login nunca foi implementado

O `TRIAGE.md` original exigia DOIS contadores no endpoint de login: por
`(ip, email)` — já existe — e por **IP agregado**, para pegar o cenário de
"password spraying" (um atacante tenta senhas diferentes contra e-mails
diferentes, do mesmo IP, rotacionando o e-mail pra nunca bater o mesmo
balde). Critério **R4** do `TRIAGE.md` cobre exatamente isso.

O que existe hoje: `server/src/middlewares/rateLimitPolicy.ts`,
`loginAttemptLimiter`, continua chaveado só por `(ip, email)` — rotacionar
e-mail continua gerando balde novo de 10 tentativas. **Não há nenhum
contador agregando por IP no endpoint de login especificamente.**

O único agregado por IP que existe é o `apiIpLimiter` genérico
(1600/min) — mas esse teto foi dimensionado como pico de tráfego de
terminais, não como orçamento de tentativas de autenticação. Usando esse
mesmo balde pro login, o teto efetivo de password spraying por IP virou
~24.000 tentativas/15min (1600/min × 15), muito acima do orçamento de 300
tentativas/15min que o dono já havia decidido em `APR-2026-052` — usar o
balde genérico pra isso é exatamente o "controle compensatório que não
existe" que a triagem original já havia refutado.

Nenhum teste da suíte atual exercita esse cenário —
`case007-rate-limit-policy.test.ts` na verdade **documenta** (sem corrigir)
que e-mails distintos geram chaves distintas e que a chave de IP é a mesma.

**Correção exigida:** implementar um segundo limiter no endpoint de login,
agregado por IP (independente do e-mail), com orçamento **próprio**
(coerente com o que `APR-2026-052` já decidiu para tentativas de
autenticação — não reaproveitar o teto do `apiIpLimiter` genérico). Quando
esse limiter estourar, deve gerar o mesmo log `rate_limit_exceeded` já
usado pelos outros limiters (`keySource`, `limiter`, etc.). Adicionar teste
real que prova: N tentativas de login com e-mails DIFERENTES, do MESMO IP,
esgotam esse novo contador agregado (não escapam rotacionando e-mail).

## 3. Problema 2 (ALTA) — `TRUST_PROXY` decidido mas nunca executado, e agora com impacto maior

`APR-2026-052` D3 decidiu que `TRUST_PROXY` entra no escopo desta correção.
Hoje: `server/src/config/runtimeEnv.ts` continua com `default(0)`,
`docker-compose.yml` continua com `${TRUST_PROXY:-0}` — zero linhas novas
desde a decisão.

O agravante: como a correção anterior tornou a chave por IP o caminho
**principal** de todo tráfego não autenticado (`apiIpLimiter`), rodar atrás
de um proxy reverso com `TRUST_PROXY=0` faz `req.ip` virar sempre o IP do
próprio proxy — **toda a fábrica de tráfego não autenticado colapsa num
único balde de 1600/min**, o que é risco de indisponibilidade real, não
hipotético, e maior do que era antes desta correção.

**Correção exigida:** no mínimo, uma validação de arranque (startup) que
recuse subir com `TRUST_PROXY=0`/ausente quando `NODE_ENV=production` (ou
equivalente), forçando a configuração correta em produção antes de aceitar
tráfego. Se subir sem essa configuração for aceitável em outros ambientes
(dev/test), a validação deve ser condicionada a produção, não bloquear
localmente.

## 4. Problema 3 (MÉDIA, opcional se o tempo permitir) — segundo caminho de configuração contorna o schema Zod

`rateLimitPolicy.ts` lê `process.env` diretamente para os limiares e faz
fallback silencioso em valor inválido (`RATE_LIMIT_IP_MAX_PER_MINUTE=0` ou
`="abc"` não falha o boot, cai pro default em silêncio). Isso contorna
`runtimeEnv.ts`, que é a fonte única de verdade de configuração do
projeto (território de `CASE-005`).

**Correção exigida, se o tempo permitir dentro desta correção:** mover as
constantes de rate limit para o schema Zod de `runtimeEnv.ts`, coordenando
com o que já existe lá. Se isso for grande demais para esta correção
pontual, registrar explicitamente como pendência separada no pacote de
evidência, sem tentar resolver aqui às pressas.

## 5. O que já está certo — não mexer

- V1 (diluição do teto por `jwt.decode` forjado): fechado, `apiIpLimiter`
  chaveado só por IP real.
- V2 (DoS dirigido a usuário nomeado): fechado, cota por usuário só após
  `jwt.verify`.
- V2b (consumo de cota de refresh da vítima): fechado.
- R5 (guarda anti-`jwt.decode`): presente e correta.
- D4 (429 observável, log `rate_limit_exceeded`): atendido.
- D1/D2 (1600/min IP genérico, 300/15min usuário autenticado): conformes à
  decisão já registrada — não mudar esses números, só adicionar o contador
  NOVO e separado do login.

## 6. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Isto é uma CORREÇÃO 01 sobre a remediação já existente do CASE-007 (AUD-AUTHN-03, commit ef4b845). NÃO é reimplementação — os vetores V1, V2, V2b já estão corrigidos e confirmados corretos por segunda opinião independente; não toque nisso.

Trabalhe exclusivamente na worktree/branch já existente:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-007
  branch:   sana/ERP-LEGACY-001/CASE-007

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção).
- Não execute operação destrutiva em banco real. Testes de integração HTTP somente contra erp_evok_audio_test.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/.
- Não declare FINDING CLOSED nem RETEST_PASSED.
- Capture e registre o OUTPUT REAL dos comandos executados (typecheck, testes), não apenas a alegação em texto.

Leitura obrigatória antes de editar:
1. Leia server/src/middlewares/rateLimitPolicy.ts por inteiro.
2. Leia server/src/middlewares/auth.ts, a parte de rate limit no fluxo de login.
3. Leia server/src/config/runtimeEnv.ts (schema Zod de configuração).
4. Leia docker-compose.yml (TRUST_PROXY) e server/tests/unit/case007-rate-limit-policy.test.ts.
5. Leia o registro APR-2026-052 em coretriad/governance/APPROVALS.md (D1-D5, e a EMENDA-01 lá referenciada) — apenas leitura, para entender os números já decididos, sem alterar esse arquivo.

PROBLEMA 1 (BLOQUEANTE) — falta o contador agregado por IP no login (password spraying, V3):
loginAttemptLimiter hoje é chaveado só por (ip, email) — rotacionar o e-mail sempre gera balde novo de 10 tentativas, então um atacante trocando o e-mail a cada tentativa nunca esgota nada. O único agregado por IP que existe é o apiIpLimiter genérico (1600/min), dimensionado pra tráfego de terminais, não pra tentativas de login — usá-lo aqui daria um orçamento de ~24000 tentativas/15min pra spraying, muito acima do que o dono decidiu (300/15min, ver APR-2026-052).
Implemente um SEGUNDO limiter específico do endpoint de login, agregado só por IP (sem o e-mail), com orçamento próprio coerente com a decisão já registrada em APR-2026-052 pra tentativas de autenticação — não reaproveite o teto do apiIpLimiter genérico. Ao estourar, gere o mesmo padrão de log rate_limit_exceeded (keySource, limiter, etc.) já usado pelos outros limiters. Adicione teste real: N tentativas de login com e-mails DIFERENTES, do MESMO IP, devem esgotar esse novo contador agregado — a rotação de e-mail não pode mais escapar dele.

PROBLEMA 2 (ALTA) — TRUST_PROXY decidido em APR-2026-052 D3 mas nunca executado:
runtimeEnv.ts e docker-compose.yml continuam com TRUST_PROXY default 0/ausente. Como a correção anterior tornou a chave por IP o caminho principal de todo tráfego não autenticado, rodar com TRUST_PROXY=0 atrás de proxy reverso colapsa toda a fábrica de tráfego não autenticado num único balde de 1600/min (req.ip vira sempre o IP do proxy) — risco real de indisponibilidade.
Adicione uma validação de arranque que recuse subir (falhe o boot) quando NODE_ENV=production e TRUST_PROXY estiver ausente/0, forçando configuração correta antes de aceitar tráfego em produção. Não bloquear dev/test.

PROBLEMA 3 (MÉDIA, só se o tempo permitir) — rateLimitPolicy.ts lê process.env direto, contornando o schema Zod de runtimeEnv.ts, com fallback silencioso em valor inválido. Se for viável dentro desta correção, mova as constantes de rate limit para o schema Zod de runtimeEnv.ts. Se for grande demais, registre como pendência separada no REMEDIATION_EVIDENCE_PACKAGE.md, sem tentar resolver às pressas.

Documente no REMEDIATION_EVIDENCE_PACKAGE.md do caso (seção nova "Correção 01"):
- os problemas corrigidos, com arquivo:linha da causa e da correção;
- prova vermelha: cenário de spraying (e-mails diferentes, mesmo IP) escapando do rate limit ANTES da correção;
- prova verde: o mesmo cenário bloqueado DEPOIS;
- se TRUST_PROXY foi implementado: prova de que o boot falha em produção sem a variável configurada;
- output REAL de: testes novos/atualizados, typecheck/build do server.

Validação depois:
- Execute os testes novos/atualizados e a suíte relevante, capture e registre o output real.
- Execute typecheck/build do server, capture e registre o output real.

Ao terminar:
- Atualize REMEDIATION_EVIDENCE_PACKAGE.md e o status do caso, mantendo REMEDIATION_COMPLETE apenas se os problemas bloqueantes estiverem de fato corrigidos e comprovados com output real.
- Commit na branch sana/ERP-LEGACY-001/CASE-007, não em main.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.
- Pare aguardando revisão/segunda opinião/reteste da VeriCore.
```

## 7. Registro

Corrige a remediação existente do CASE-007 (AUD-AUTHN-03), mesma worktree/
branch. Não reabre V1/V2/V2b/R5/D4, já corretos e confirmados. Autoridade
de `RETEST_PASSED`/`FINDING CLOSED` permanece exclusiva da VeriCore.
