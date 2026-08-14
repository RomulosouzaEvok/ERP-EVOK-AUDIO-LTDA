# FINDING

FINDING_ID: FIND-ERP-008
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passo 26), fora da sequência normal do passo 31, por autorização humana explícita (APR-2026-018)
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d
TITLE: CAT de acidente do trabalho — o TIPO vem do corpo da requisição e o PRAZO LEGAL vem da gravidade do acidente, sem nenhuma checagem cruzada: o registro enviado ao eSocial (S-2210) pode nascer com a combinação tipo×gravidade incoerente, e a UI oficial produz exatamente a combinação errada em todo acidente com óbito
DOMAIN: business-rules / compliance
SUBDOMAIN: SST — emissão de CAT (Lei 8.213/91 art. 22 §2º) e evento eSocial S-2210
SEVERITY: HIGH
CONFIDENCE: CONFIRMED
STATUS: OPEN
AMBIENTE: DEV/HOMOLOGAÇÃO — `sst` NÃO-PRODUÇÃO em `PRODUCTION_STATUS_MAP.md:163` ("Depende de `employees` (0)"). Nenhum dado real de acidente existe hoje.
DETECTED_BY: vericore-business-rule-auditor (BR-SST-D14, BR-SST-D15, passo 26)

## DESCRIPTION

A emissão da CAT (`POST /api/sst/accidents/:id/cat`) decide **duas coisas legalmente acopladas a
partir de duas fontes independentes**, e nunca as confronta:

1. **O TIPO vem do corpo da requisição.** `EmitCatUseCase.ts:60`:
   `const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';`
   O valor é lido de `body.tipo` (declarado em :31). **Não existe validação Zod, middleware de
   validação nem sanitização nesta rota** — `routes/sst.ts:75` monta apenas
   `authorizeModule('sst','approve')` e o controller (`accidentController.ts:69-74`) repassa
   `req.body` cru.
2. **O PRAZO LEGAL vem da gravidade do acidente já registrado.** `EmitCatUseCase.ts:61`:
   `calcularPrazoLimiteCat(acidente.data_hora, acidente.gravidade)`, e
   `legalDeadlineService.ts:30-41`: `gravidade === 'obito'` → mesmo dia; demais → +1 dia com pulo
   de fim de semana.

**Entre a linha 60 e a 61 não há nenhuma comparação entre `body.tipo` e `acidente.gravidade`.**
Releitura do use case inteiro (101 linhas): nenhum `if`, nenhum `throw`, nenhuma normalização que
relacione os dois. Ambos são gravados na mesma linha de `sst_cats` (:63-70) e o prazo é propagado
ao evento eSocial `S-2210` como `prazo_legal` na **mesma transação** (:72-78).

**(A) `tipo='obito'` para acidente cuja `gravidade` não é óbito.** Alcançável por chamada direta à
API por qualquer `sst:approve`. CAT de óbito com prazo de "1º dia útil seguinte", e S-2210 com
esse `prazo_legal`.

**(B) `tipo='inicial'` para acidente com `gravidade='obito'`.** CAT tipada inicial com prazo
imediato. **Não é apenas um caminho possível — é o único caminho que a UI oficial produz:**
`client/src/api/sst.ts:391` envia `tipo: 'inicial'` **hard-coded**, sem opção de tela
(`AccidentsTab.tsx:306-307,394-396`). **Hoje, todo acidente fatal registrado pela tela do ERP gera
uma CAT tipada `inicial`**, e o valor `obito` do ENUM é **inalcançável pelo cliente oficial**.

**(C) A trava de unicidade só enxerga `tipo='inicial'`.** `EmitCatUseCase.ts:54-58`:
`catsExistentes.some(c => c.tipo === 'inicial')`. Uma CAT `obito` **não** entra no filtro.
Sequência aceita: emitir `obito` e depois `inicial` para o mesmo acidente → duas CATs e **dois
eventos S-2210 `pendente`** na fila da Previdência para a mesma ocorrência.

### Agravante 1 — o prazo ignora feriados, contra requisito versionado

`legalDeadlineService.ts:18-21` considera não-útil apenas sábado e domingo. **Isto não é apenas
uma "simplificação declarada": é divergência contra requisito versionado.**
`BLOCO_1_SST_REQUISITOS.md:160` (RNF-SST-04) exige textualmente que o cálculo "deve considerar
calendário de dias úteis e **feriados nacionais (mínimo)**"; `BLOCO_1_SST_API.md:431` repete. Não
existe tabela, constante ou serviço de feriados em `server/src`. Acidente na véspera de feriado
produz prazo **antecipado** — e esse prazo vai gravado no S-2210.

### Agravante 2 — a CAT errada é imutável por trigger de banco

`models/SstCat.ts:6-10` documenta que `sst_cats` tem "Conteúdo legal imutável desde o INSERT
(trigger `sst_lock_cat`)". O trigger é confirmado independentemente em `FIND-ERP-002.md`.
**Logo, uma CAT emitida com tipo incoerente não pode ser corrigida por UPDATE** — o único caminho
é `POST /cat/:catId/reopen`, que grava nova linha `tipo='reabertura'` e, em
`ReopenCatUseCase.ts:39`, recalcula o prazo a partir de `calcularPrazoLimiteCat(new Date(), ...)`
— **a partir de hoje, não da data do acidente**. A "correção" nasce com prazo diferente do legal
original.

### Achados secundários (não constavam do insumo)

- **SEC-1 — `emitente` aceito, documentado e silenciosamente descartado.**
  `EmitCatUseCase.ts:31` declara `emitente?: string`; **nunca é lido** (as únicas ocorrências no
  módulo são `emitente_id`/`emitenteId`, que vêm do JWT). `BLOCO_1_SST_API.md:427-429` documenta
  `emitente` como gravado — **não é**: `sst_cats` não tem coluna para ele (`SstCat.ts:19-32`). O
  cliente envia `'Técnico SST'` fixo (`AccidentsTab.tsx:307`). O nome de quem assina o documento
  legal é perdido. Mesma classe de defeito de BR-RH-D02/FIND-ERP-007.
- **SEC-2 — mistura de fuso.** `legalDeadlineService.ts:19` usa `date.getDay()` (fuso **local**)
  enquanto :33 e :40 retornam `toISOString().slice(0,10)` (**UTC**). Para acidente registrado à
  noite em UTC-3, a data emitida e o teste de fim de semana podem discordar em um dia. Registrado
  como observação por leitura; não reproduzido por execução.

## EXPECTED_BEHAVIOR

- BR-SST-015 (`BRIEF_SST_2026-08-06.md:154`): "Todo acidente com afastamento, óbito ou doença
  ocupacional exige CAT; deve ser transmitida (S-2210) até o 1º dia útil seguinte e
  **imediatamente em caso de óbito**".
- O tipo e o prazo descrevem **o mesmo fato**. O sistema deveria garantir que nunca se
  contradigam: ou o tipo é **derivado** de `acidente.gravidade`, ou a combinação incoerente é
  **rejeitada** (422) antes de qualquer INSERT.
- `BLOCO_1_SST_API.md:385` descreve o endpoint como "Emite CAT vinculada (**tipo `inicial`**)" e o
  exemplo (:425) mostra `{"tipo": "inicial"}` — **o documento nunca prevê `tipo` variável**.
- A unicidade deveria impedir uma segunda comunicação inicial por qualquer tipo
  (`BLOCO_1_SST_MODELO_DADOS.md:237-239`: só `reabertura` como segunda linha).
- O prazo deveria considerar feriados (RNF-SST-04).

## ACTUAL_BEHAVIOR

- `tipo` é valor livre do corpo, reduzido por :60 a `'obito'` ou `'inicial'` (`'reabertura'`,
  `'OBITO'`, `null`, `['obito']`, ausente → todos viram `'inicial'`).
- `prazo_limite` (e `prazo_legal` do S-2210) calculado exclusivamente de `acidente.gravidade`.
- Nenhuma checagem cruzada. Ambas as combinações incoerentes gravadas com `201 Created`.
- **A UI oficial só consegue produzir a combinação (B)** — `client/src/api/sst.ts:391`.
- A unicidade permite `obito` + `inicial` no mesmo acidente, com dois S-2210.
- Nenhum feriado considerado.

## EVIDENCE

FILE: `sst/application/use-cases/accident/EmitCatUseCase.ts` — 31 (`emitente` nunca lido); 48-98 (execute completo, sem comparação tipo×gravidade); 54-58 (unicidade filtra só `c.tipo === 'inicial'`); **60** (TIPO do corpo); **61** (PRAZO da gravidade); 63-70 (INSERT); 72-78 (S-2210 com `prazo_legal`, mesma transação, antes de `t.commit()` em :92)
FILE: `sst/domain/services/legalDeadlineService.ts` — 6-12 (simplificação + `[VERIFICAR COM TÉCNICO SST/RH]`); 18-21 (`isWeekend` — só sáb/dom, `getDay()` local); 30-41 (função inteira; retorno UTC)
FILE: `sst/application/use-cases/accident/ReopenCatUseCase.ts` — 39 (recalcula prazo a partir de HOJE); 43-50
FILE: `sst/presentation/routes/sst.ts` — 75 (**nenhum middleware de validação de payload**); 77
FILE: `sst/presentation/controllers/accidentController.ts` — 69-74 (`req.body` cru); 84-90
FILE: `server/src/models/SstCat.ts` — 6-10 (imutabilidade por trigger `sst_lock_cat`); 16, 38 (ENUM `tipo`); 19-32 (sem coluna para `emitente` textual)
FILE: `server/src/models/SstAcidente.ts` — 49 (ENUM `gravidade` — única fonte factual do óbito)
FILE: `client/src/api/sst.ts` — **388-393** (`{ tipo: 'inicial', emitente }` hard-coded)
FILE: `client/src/pages/sst/AccidentsTab.tsx` — 306-307 (`emitente` fixo); 394-396 (botão sem escolha de tipo)
FILE: `server/tests/unit/sst-accident.test.ts` — 172-213 (bloco `EmitCatUseCase`); **195-202 (o teste "calcula prazo_limite imediato para gravidade obito" constrói o acidente com `gravidade: 'obito'` e chama com `body: { tipo: 'inicial' }` — a suíte verde CODIFICA a combinação incoerente (B) como esperada e nunca a questiona)**; 178-184; 186-193
FILE: `docs/business/BLOCO_1_SST_REQUISITOS.md` — 86 (RF-SST-024 → BR-SST-015); **160 (RNF-SST-04: "calendário de dias úteis e feriados nacionais (mínimo)")**; 343, 365
FILE: `docs/business/briefs/BRIEF_SST_2026-08-06.md` — 154 (BR-SST-015)
FILE: `docs/business/BLOCO_1_SST_API.md` — 385 ("tipo `inicial`"); 423-432 (`emitente` documentado como gravado; prazo com feriados); 439-441
FILE: `docs/business/BLOCO_1_SST_MODELO_DADOS.md` — 229, 231, 237-239
FILE: `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` — 163

GREPS: `calcularPrazoLimiteCat|legalDeadline` → 9 ocorrências (definição + 2 chamadores +
comentários); **zero testes** referenciam o serviço diretamente. `emitente` em `server/src`:
nenhuma leitura de `body.emitente`. `BR-SST` em `server/src`: 20 ocorrências — **`BR-SST-015` não
é citado em nenhum arquivo de código** (elo de rastreabilidade ausente).

RELATED_BUSINESS_RULE: BR-SST-015 (regra oficial); BR-SST-D14, BR-SST-D15 (candidatos)
RELATED_REQUIREMENT: RF-SST-024, RF-SST-042, RNF-SST-04
RELATED_USE_CASE: UC-46
RELATED_ACCEPTANCE_CRITERIA: N/A — **não existe critério de aceite versionado exigindo coerência
tipo×gravidade** (lacuna de requisito: nenhum documento chega a formular a invariante)
RELATED_TEST: `sst-accident.test.ts:172-213`. **Lacunas confirmadas:** (1) nenhum teste de
coerência tipo×gravidade em qualquer direção; (2) nenhum teste do pulo de fim de semana — **o
núcleo da regra de prazo nunca é exercitado**; (3) nenhum teste de feriado; (4) nenhum teste de
unicidade com `tipo='obito'` pré-existente; (5) nenhum teste unitário direto de
`calcularPrazoLimiteCat`; (6) nenhum teste de nível de rota; (7) nenhum teste do descarte de
`body.emitente`. **Agravante: o teste de :195-202 congela a combinação incoerente.**

BUSINESS_IMPACT: O registro que o ERP produz e enfileira para a Previdência (S-2210) pode carregar
combinação tipo×prazo que não corresponde ao fato. No cenário mais provável — o único que a UI
produz — um acidente **fatal** gera CAT tipada `inicial`. Comunicação incorreta ou fora do prazo é
infração administrativa (Lei 8.213/91 art. 22; Decreto 3.048/99 art. 286), com efeito em perícia
previdenciária, nexo técnico e defesa em ação trabalhista/regressiva. O caminho (C) produz **duas
comunicações do mesmo acidente**. O agravante da imutabilidade significa que um erro emitido **não
é corrigível**.
TECHNICAL_IMPACT: Invariante de domínio (tipo ≡ gravidade) inexistente em todas as camadas: sem
validação de payload, sem Zod, sem checagem no use case, sem CHECK constraint entre
`sst_cats.tipo` e `sst_acidentes.gravidade`. Os dois campos são o mesmo fato modelado duas vezes
sem restrição de consistência. **A suíte é verde e congela a combinação incoerente.**
Rastreabilidade: BR-SST-015 não é citado em nenhum ponto do código.
SECURITY_IMPACT: Não é escalada de privilégio (ambos exigem `sst:approve`). É **integridade de
registro legal**: um usuário legitimamente autorizado produz, por chamada direta à API, documento
previdenciário internamente contraditório e imutável. Falha de validação de entrada (`req.body`
sem schema) + ausência de invariante de domínio.

## REPRODUCTION (leitura estática — nenhuma execução, nenhuma conexão de banco)

**Cenário B (o que a UI faz hoje):**
1. Registrar acidente com `gravidade: 'obito'`.
2. Clicar em emitir CAT → cliente envia `{ tipo: 'inicial', emitente: 'Técnico SST' }`.
3. `:60` → `tipo='inicial'`; `:61` + `legalDeadlineService.ts:32-33` → prazo = data do acidente.
4. `sst_cats` recebe `tipo='inicial'` com prazo de óbito; S-2210 com `prazo_legal` idêntico. `201`.
   *(Este exato caminho é o que `sst-accident.test.ts:195-202` executa e aprova.)*

**Cenário A (chamada direta):** acidente `com_afastamento` + `{ "tipo": "obito" }` → CAT de óbito
com prazo de dia útil, gravada e enfileirada. `201`.

**Cenário C:** repetir com `{ "tipo": "inicial" }` → `:55` avalia
`some(c => c.tipo === 'inicial')` → `false` → segunda CAT, segundo S-2210 `pendente`.

ROOT_CAUSE_HYPOTHESIS: O endpoint foi projetado para um único tipo (`inicial`) — é assim que o
contrato o documenta e que o cliente o chama. O ternário de :60 parece extensão posterior para
acomodar o terceiro valor do ENUM sem que a regra ("quando um CAT é de óbito?") tivesse sido
escrita. O prazo, implementado antes a partir da gravidade, permaneceu na fonte correta. Ninguém
amarrou as pontas porque a invariante nunca foi formulada como requisito.

REFERENCE: Lei 8.213/91 art. 22 §2º; Decreto 3.048/99; leiaute eSocial S-2210. **Ressalva:** a
redação legal citada reproduz o que os artefatos do projeto afirmam — **nenhuma fonte normativa
oficial foi consultada** neste modo read-only (mesma limitação da LACUNA-7 do discovery).

RECOMMENDATION (a decisão de fonte autoritativa é do responsável humano — Regras 20-21):
(1) tornar `tipo` **derivado** de `acidente.gravidade`, ou rejeitar com 422 toda combinação
incoerente nas duas direções, antes de qualquer INSERT; (2) validar o payload com schema explícito;
(3) estender a unicidade para "já existe CAT de comunicação inicial (qualquer tipo ≠ `reabertura`)";
(4) implementar o calendário de feriados de RNF-SST-04, ou registrar decisão versionada do dono
aceitando a simplificação e alterando o requisito; (5) persistir ou remover `body.emitente` (SEC-1)
e alinhar a API; (6) uniformizar o fuso (SEC-2); (7) **corrigir o teste :195-202**, que hoje ancora
a combinação incoerente.
SUGGESTED_REMEDIATION_OWNER: SanaCore

## RETEST_SPECIFICATION

**Coerência tipo×gravidade:**
(a) `gravidade='obito'` + `body.tipo='inicial'` → NÃO grava CAT `inicial`: rejeita com 422 ou grava
    `tipo='obito'` (conforme decisão registrada). Verificar `sst_cats.tipo` e o `prazo_legal` do S-2210.
(b) `gravidade='com_afastamento'` (e `sem_afastamento`, `incapacidade_permanente`) +
    `body.tipo='obito'` → 422; **nenhuma** linha em `sst_cats` e **nenhum** S-2210 (rollback).
(c) Caminho feliz: `com_afastamento` + `inicial` → 201, prazo = 1º dia útil, S-2210 com mesmo prazo.
(d) Caminho feliz de óbito: `gravidade='obito'` → CAT de óbito com prazo imediato.
(e) Payload adversarial: `'OBITO'`, `'Obito'`, `' obito '`, `'reabertura'`, `null`, `undefined`,
    `['obito']`, `true`, ausente — nenhum pode produzir CAT que contradiga a gravidade; fail-closed.

**Unicidade:**
(f) Com CAT `obito` existente, emissão `inicial` → 422; nenhum segundo S-2210.
(g) Com CAT `inicial` existente, emissão `obito` → 422.
(h) Regressão: 2ª `inicial` continua rejeitada; `reopen` continua criando `tipo='reabertura'`.

**Prazo (RNF-SST-04):**
(i) Acidente em **sexta** (não óbito) → prazo = segunda (**hoje sem nenhum teste**). Sábado →
    segunda. Domingo → segunda.
(j) Acidente na **véspera de feriado nacional** → prazo = primeiro dia útil real seguinte. Caso o
    dono mantenha a simplificação, este item vira: existe decisão versionada e RNF-SST-04 +
    `BLOCO_1_SST_API.md:431` foram atualizados.
(k) Feriado em fim de semana e feriado na segunda seguinte a acidente de sexta (encadeamento).
(l) Consistência de fuso: acidente `2026-08-08T23:30:00-03:00` (sábado local) produz o mesmo
    resultado que o mesmo instante em UTC — sem deslocamento de um dia (SEC-2).

**Propagação e integridade:**
(m) Em casos aceitos, `sst_cats.prazo_limite` e `sst_eventos_esocial.prazo_legal` são idênticos e
    gravados na mesma transação; em casos rejeitados, nenhuma tabela recebe linha (rollback).
(n) `body.emitente` (SEC-1): ou é persistido em coluna própria, ou removido do contrato e da
    interface — não pode continuar aceito, documentado como gravado, e descartado.

**Cobertura:**
(o) Testes cobrindo (a),(b),(e),(f),(g),(i),(j), referenciando **BR-SST-015** e RNF-SST-04.
(p) Teste unitário direto de `calcularPrazoLimiteCat` (hoje inexistente).
(q) **O teste `sst-accident.test.ts:195-202` foi corrigido** — não pode continuar afirmando como
    esperado o par `gravidade='obito'` + `tipo='inicial'`.
(r) Suíte completa verde no commit de remediação.

## NOTA SOBRE A SEVERIDADE

**Concordo com HIGH.** A justificativa do dono está sustentada: o `prazo_legal` incoerente é
propagado ao S-2210 na mesma transação e a CAT é imutável por trigger. Dois elementos **agravam**
em relação ao insumo: (i) a combinação incoerente (B) é o **único** comportamento que a UI oficial
produz para acidentes fatais; (ii) a suíte **codifica essa combinação como esperada**, de modo que
a proteção por regressão hoje trabalha contra a correção. O que **impede CRITICAL** é
exclusivamente o ambiente: `sst` é NÃO-PRODUÇÃO com `employees`=0 — nenhum registro
previdenciário real afetado, nenhum evento transmitido, nenhum dano consumado. **Registro
expressamente que, se `sst` entrar em produção com dados reais sem esta remediação, a severidade
deve ser reavaliada para CRITICAL**, dada a irreversibilidade do registro e a natureza fatal do
cenário (B).

## LACUNAS PARA DECISÃO HUMANA (Regras 20-21)

- **L-8.1 — Qual é a fonte autoritativa do TIPO da CAT?** Nenhum artefato formula a invariante
  "tipo ≡ gravidade". `BLOCO_1_SST_API.md:385` sugere que o endpoint só emite `inicial`; o ENUM
  admite `obito`. **Não é decidível por leitura de código** qual é a regra da empresa.
- **L-8.2 — Feriados: implementar ou alterar o requisito?** RNF-SST-04 exige; o código dispensa e
  pede `[VERIFICAR COM TÉCNICO SST/RH]`. Nenhuma decisão versionada existe.
- **L-8.3 — Owner.** Nenhuma regra de SST tem owner nominal. O código nomeia um "técnico de
  SST/RH" que não existe no repositório nem no modelo de permissões.

NOTA DE STATUS: Nenhuma remediação aplicada, nenhum arquivo alterado, nenhum comando executado.
STATUS OPEN até passar pelo `vericore-finding-validator` (obrigatório para HIGH), remediação pela
SanaCore e reteste/fechamento exclusivo de VeriCore (Regra 4).

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador, sem edição.*

---

## Validação (finding-validator)

**VEREDITO: CONFIRMED — severidade HIGH mantida.** Segue à SanaCore após 2 correções de texto.

BUSCA POR CONTROLE COMPENSATÓRIO (rota, middleware, controller, use case, CHECK de banco, índice
único, UI):
- **Rota/controller/use case** — confirmado: nenhuma validação de payload, `req.body` cru, e entre
  `:60` e `:61` do `EmitCatUseCase` nenhum `if`/`throw` relaciona `body.tipo` a `acidente.gravidade`.
- **Banco** — `sst_cats` (`00_baseline_frozen.sql:13072-13087`) tem só PK, FKs e 3 índices; **nenhum
  CHECK** entre `tipo` e `gravidade`.
- **Índice único de eventos eSocial — REFUTAÇÃO TENTADA E FALHA:** `uq_sst_eventos_esocial_origem_ativo`
  garante 1 evento por **CAT** (`origem_id`), não por **acidente** — no cenário (C) as duas CATs
  têm `id` distintos, logo o índice **não bloqueia** os dois S-2210. Não refuta.

CONFIRMAÇÃO 1 (achado mais forte) — **CONFIRMADO:** `client/src/api/sst.ts:388-393` posta
`{ tipo: 'inicial' }` **literal**; `AccidentsTab.tsx:394-399` é o único botão, sem seletor. A tela
**permite registrar óbito** (`:137,:247`). **Todo acidente fatal registrado pela tela produz CAT
`tipo='inicial'`; o valor `obito` é inalcançável pelo cliente oficial.**

CONFIRMAÇÃO 2 — **CONFIRMADO:** `sst-accident.test.ts:195-202` monta `gravidade:'obito'` e executa
com `body: { tipo: 'inicial' }`, assertando o prazo — a combinação incoerente é **afirmada como
esperada**. A proteção por regressão trabalha contra a correção.

CONFIRMAÇÃO 3 (RNF-SST-04) — **CONFIRMADO:** `BLOCO_1_SST_REQUISITOS.md:160` exige "calendário de
dias úteis e **feriados nacionais (mínimo)**" — divergência contra requisito versionado, não
simplificação aceita. *(Nota: `:160` também exige escalonamento de alerta, 2ª divergência do mesmo
RNF não explorada pelo finding.)*

CONFIRMAÇÃO 4 (unicidade) — **CONFIRMADO:** `:54-58` filtra só `c.tipo === 'inicial'`.

AGRAVANTE 2 (imutabilidade) — **CONFIRMADO E FORTALECIDO:** trigger `sst_lock_cat`
(`00_baseline_frozen.sql:2942-2964`, montado `:22233`) só aceita UPDATE se `NEW.tipo = OLD.tipo`;
DELETE sempre lança. `tipo` é comprovadamente incorrigível.

RESULTADO DA BUSCA: nenhum controle compensatório em nenhuma camada. A única barreira (índice
único de eventos eSocial) foi analisada e **não cobre** o cenário.

CORREÇÃO EXIGIDA (não altera o veredito):
1. TITLE e BUSINESS_IMPACT dizem "registro **enviado** ao eSocial / enfileirado à Previdência".
   Verificado: **não existe implementação de transmissão** — `sst_eventos_esocial` é fila
   **interna**; `resend` só cria nova linha `pendente`. Reescrever para "gravado na fila interna
   de eventos, origem do futuro S-2210". A materialidade não muda.
2. Acrescentar que RNF-SST-04 também exige **escalonamento de alerta** (2ª divergência).

JUSTIFICATIVA: as quatro confirmações foram verificadas por leitura direta. HIGH **não é
inflação** porque a severidade repousa em (i) irreversibilidade provada no trigger; (ii) o defeito
ser o **comportamento único** da UI para o cenário fatal; (iii) a suíte verde congelar a
combinação. O ambiente NÃO-PRODUÇÃO é o que impede CRITICAL, e a reavaliação para CRITICAL na
promoção está corretamente registrada.

*Validação produzida pelo `vericore-finding-validator`; seção anexada pelo orquestrador.*
