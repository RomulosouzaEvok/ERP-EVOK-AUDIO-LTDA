# EMENDA-01 ao AUDIT_PLAN — ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (inalterado — Regras 12-14)
EMENDA:        EMENDA-01
DATA:          2026-08-14
EMITIDA POR:   vericore-software-audit-director
EMENDA:        AUDIT_PLAN.md §4.2 (T-04), §4.3 (T-09, T-10, T-11), §4.4 (T-16),
               §5, §8, §12  +  AUDIT_COVERAGE_MATRIX.md §4, §7.1, §7.2
NATUREZA:      **ADIÇÃO RASTREÁVEL** — nenhum texto dos artefatos originais foi
               reescrito, nenhuma numeração foi alterada. Mesmo princípio que este
               plano exige de terceiros em RA-09 ("correção por adição, nunca por
               reescrita silenciosa") e que a APPROVALS.md aplica a si mesma
               ("nunca editar entradas existentes").
ESTADO:        aguardando gate humano — **fieldwork continua NÃO AUTORIZADO**
```

> **Leitura vinculante:** `AUDIT_PLAN.md` e `AUDIT_COVERAGE_MATRIX.md` **só são
> válidos lidos em conjunto com esta emenda**. O item de gate **G1** passa a ler-se
> "aprovar o `AUDIT_PLAN.md` **e a EMENDA-01**".

---

## A. Proveniência — insumo **externo** à VeriCore, a validar

| Item | Valor |
|---|---|
| **Fonte** | `remediation/cases/ERP-LEGACY-001-CASE-002/TRIAGE.md` §3.1 (linhas 140-170) e §3.2 (linhas 172-202) |
| **Organização de origem** | **SanaCore** (`sanacore-remediation-triage`), sob `APR-2026-020` Decisão B |
| **Autoridade de auditoria** | **NENHUMA.** SanaCore corrige findings confirmados; **não audita** (Regra 3 do `CLAUDE.md`). O achado dela **não carrega autoridade de auditoria** e não vale como evidência VeriCore |
| **Data relativa** | concluído **após** o despacho do estágio de plano — por isso entra como emenda, não como omissão do plano original |
| **Status probatório nesta run** | **NÃO VERIFICADO POR AGENTE VERICORE.** Nenhum auditor releu as 3 âncoras. Este director **não** as adjudicou — fazê-lo seria auditar no lugar do especialista (vedação do próprio papel) |
| **Verificação feita aqui** | apenas de **proveniência**: o documento existe no repositório, é versionado, declara autoria e método (reprodução estática, nenhuma conexão de banco aberta), e afirma o que o insumo relata. Verificar que a fonte diz X ≠ verificar que X é verdade |

**Regra 20 aplicada preventivamente:** se a leitura própria da VeriCore no
`AUDIT_COMMIT` divergir do que a triagem SanaCore afirma, **prevalece a evidência
VeriCore** e a divergência é registrada como tal — não conciliada em silêncio, não
resolvida por deferência à outra organização.

---

## B. O insumo dirigido (transcrito da fonte, não endossado)

### B.1 O candidato

A triagem afirma que o padrão da **Falha 2 do FIND-ERP-005** — ato aprovatório
autorizado por **presença do módulo** em vez de **nível `approve`**, via
`authorizeModule`/`authorizeAnyModule` com `requiredLevel` default `'operate'`,
somado a resolução de papel por **truthiness** no controller — **se repete idêntico
fora do `juridico`, em módulos de PRODUÇÃO**:

| # | Âncora declarada pela fonte | Ponto de aprovação |
|---|---|---|
| A1 | `server/src/modules/purchases/presentation/controllers/purchaseController.ts:54` — `user?.permissions?.diretor ? ['diretor'] : []` (mesma truthiness) | alçada de diretoria, Compras |
| A2 | `server/src/modules/purchases/presentation/routes/purchases.ts:48` — `authorizeModule('diretor')` com default `'operate'` | `POST /api/purchases/:id/approve` |
| A3 | `server/src/modules/comex/presentation/routes/importProcesses.ts:34` — idem | `POST /api/comex/import-processes/:id/approve` |

### B.2 Contexto **favorável** cruzado (registrado com o mesmo peso)

Registrar só a acusação e omitir o atenuante seria viés de auditoria. A mesma fonte
declara:

1. Dos **~55 endpoints de ato aprovatório** do ERP, **51 declaram `'approve'`
   explicitamente**. O padrão defeituoso está em **4 linhas / 3 pontos** — é
   **exceção, não padrão dominante**.
2. `authorizeAnyModule` tem **7 call sites**: **6 são GET** (leitura) e **5
   dependem do default implícito `'operate'`** para funcionar. **Alterar o default
   do middleware quebraria 5 rotas de leitura legítimas em 4 módulos** (`juridico`,
   `comex`, `purchases`, `facilities`) — inclusive de PRODUÇÃO.
3. O 4º ponto (`masterProductionPlans.ts:37-38`, firmar/liberar MPS) declara
   `'operate'` **explicitamente** e já está documentado como ausência assumida em
   FIND-ERP-009 §6 — **não é novidade**.

**Consequência de método para as trilhas:** a hipótese "o middleware está errado"
tem contra-evidência declarada. A trilha deve testar as duas hipóteses
concorrentes — defeito no **call site** × defeito no **middleware** — e não adotar
a primeira que confirme sua expectativa.

### B.3 A diferença material — mesmo defeito de classe, peso diferente

| | `juridico` (FIND-ERP-005) | `purchases` / `comex` (candidato) |
|---|---|---|
| Ambiente | **NÃO-PRODUÇÃO** (`PRODUCTION_STATUS_MAP.md:160`) | **PRODUÇÃO** |
| Controle interno | alçada nunca exercida sobre contrato real | alçada de Compras é **controle interno vivo**, com a decisão **D-K** registrada (2026-08-10) e implementada em 4 pontos |
| Efeito de um `diretor:operate` | registra aprovação de contrato inexistente | registraria aprovação de **pedido de compra real** e de **processo de importação real** |

**Registro formal: um mesmo defeito de classe muda de peso conforme o ambiente.**
Isso afeta severidade e prioridade — **não** afeta a existência do defeito, que
continua por provar.

### B.4 Ressalva sobre a Regra 24 — **não herdada**

A triagem conclui (§5, linhas 242-267) que **nenhum** dos 4 vetores do FIND-ERP-005
enquadra na Regra 24 do `CLAUDE.md`, porque `req.user.permissions` é recarregado do
banco a cada request e o JWT carrega só `{id, passwordVersion}`.

**Essa conclusão é de origem SanaCore e NÃO é adotada por este plano.** A Regra 24
é bloqueante e sem `RISK_ACCEPTED` possível neste projeto; sua (in)aplicabilidade é
determinação **da VeriCore**, por leitura própria. **T-02** e **T-04** já têm a
varredura da Regra 24 como tarefa exaustiva (`AUDIT_PLAN.md` §4.2) — ela é
executada **independentemente** desta conclusão de terceiro, que entra como
hipótese a confirmar ou refutar, jamais como dispensa de verificação.

---

## C. Status do candidato — **NÃO PROMOVIDO A FINDING**

```
CANDIDATO:   CAND-AUTHZ-01
TÍTULO:      Padrão "presença de módulo = ato aprovatório" possivelmente replicado
             em purchases e comex/importProcesses (módulos de PRODUÇÃO)
ORIGEM:      SanaCore — TRIAGE do CASE-002 §3.2
STATUS:      **CANDIDATO — NÃO PROMOVIDO**
SEVERIDADE:  **não atribuída** (atribuir severidade a candidato não verificado é
             pré-julgamento)
CONFIANÇA:   **não atribuída**
```

**Vedação expressa, registrada:**

1. **Sem promoção por analogia.** Que o padrão seja idêntico ao do FIND-ERP-005 **não
   torna** o candidato um finding. Cada finding se sustenta na própria evidência,
   lida no próprio `AUDIT_COMMIT`, no próprio módulo. Precedente `APR-2026-018` /
   `APR-2026-020`: a emissão de finding preliminar fora da sequência normal
   dependeu de **autorização humana explícita** — não de similaridade.
2. **Duas vias legítimas de promoção, ambas registradas:** (i) **decisão do dono**,
   registrada em `APPROVALS.md` (via da `APR-2026-018`); ou (ii) **emissão pela
   própria auditoria no fieldwork**, por T-04/T-09/T-10, com evidência própria e,
   por ser candidato a CRITICAL/HIGH, validação pelo `vericore-finding-validator`
   (Regra 22).
3. **Refutação é resultado válido.** Se a leitura própria refutar as 3 âncoras — ou
   demonstrar que um controle intermediário reintroduz a exigência de nível — isso
   é **resultado da auditoria e deve ser registrado como tal**, com a mesma
   formalidade de um finding confirmado. Insumo que não se sustenta é
   informação, não fracasso.
4. **Este documento não emite finding** (Regra 2 e limites do §13 do plano).

---

## D. Emenda a **T-04** (`AUDIT_PLAN.md` §4.2) — mecanismo

**Acrescenta-se ao escopo de T-04** (titular `vericore-appsec-auditor`; segunda voz
`vericore-authorization-auditor`, autor de FIND-ERP-005/009, **não titular** — §7 do
plano permanece intacto):

**D.1 — Insumo dirigido, com instrução de adjudicação.** As âncoras A1/A2/A3 (§B.1)
entram como **ponto de partida verificável**, com a instrução expressa:
**CONFIRMAR OU REFUTAR por leitura própria no `AUDIT_COMMIT`**. Evidência > insumo.
É vedado a T-04 citar a `TRIAGE.md` como prova; ela é citável apenas como **origem
da hipótese**.

**D.2 — Semântica do middleware.** Auditar `authorizeAnyModule.ts` e o
`authorizeModule` de `middlewares/auth.ts` quanto ao **default de `requiredLevel`**:
os 7 call sites (6 GET / 5 dependentes do default), a função `satisfies`, e o
enum `AccessModuleLevel = 'operate' | 'approve'`. **Pergunta objetiva da trilha:**
um default permissivo em middleware compartilhado é defeito do middleware, defeito
do call site, ou ambos? A resposta é da trilha, não deste plano.

**D.3 — Novo entregável exaustivo: CENSO DOS ATOS APROVATÓRIOS.** T-04 passa a
entregar, além do mapa authZ dos 681 endpoints, um **censo 100% exaustivo dos
endpoints de ato aprovatório** (`approve`/`firm`/`release`/`authorize`/`sign` e
equivalentes) em `server/src/modules/*/presentation/routes/`, cada um com: nível
exigido (declarado × efetivo), origem do papel no controller (comparação estrita ×
truthiness), e presença/ausência de segregação de identidade.
**Alvo declarado: ~55 endpoints — cobertura E (exaustiva), 100%.** A contagem "~55"
é da fonte externa e **deve ser recontada**; divergência é registro, não ajuste.

**Pronto quando (adição ao critério existente):** o censo está fechado, as 3 âncoras
têm veredito individual **CONFIRMADA / REFUTADA / PREJUDICADA** com arquivo+linha
no `AUDIT_COMMIT`, e as duas hipóteses concorrentes do §B.2 foram testadas.

**Esforço:** 5 S → **6 S** (+1 S para o censo).

---

## E. Emenda às trilhas de módulo (`AUDIT_PLAN.md` §4.3 e §4.4)

### E.1 — T-10 (`purchases`) recebe A1 e A2
Titular `vericore-backend-auditor`. Recebe as âncoras `purchaseController.ts:54` e
`purchases.ts:48` como insumo dirigido, com a mesma instrução de confirmar/refutar.
`purchases` já está em **tier 2 com D1/D3/D4 exaustivos** — **não há mudança de
profundidade**, apenas direcionamento de leitura. Interface obrigatória com T-04
(mecanismo) e T-09 (alçada como controle interno).

### E.2 — T-09 passa a ser dona da **superfície de ato aprovatório cross-módulo**
T-09 (titulares `vericore-business-process-auditor` + `vericore-appsec-auditor`)
já é dona dos 21 pontos de aprovação do FIND-ERP-009. **Amplia-se explicitamente**
essa titularidade para a **superfície de alçada de PRODUÇÃO**: `purchases`
(D-K implementado), `comex/importProcesses` e `masterProductionPlans`
(firm/release com `'operate'` explícito).

**Antecipação de onda, com justificativa:** a rota
`POST /api/comex/import-processes/:id/approve` pertence ao módulo `comex`, alocado a
**T-16 (onda W3)**. Um candidato de authZ em módulo de **PRODUÇÃO** não pode esperar
a última onda. **A rota de ato aprovatório de `comex` é antecipada para T-09, em
W2**; o **restante** do módulo `comex` permanece em T-16/W3.

É o **mesmo padrão de "fluxo × módulo" já consolidado em T-05**: o módulo continua
com seu dono; a **superfície transversal** ganha dono próprio na onda certa. Sem
isso, o candidato cairia exatamente no vão entre trilhas que o §5 do plano existe
para fechar.

### E.3 — T-11 (`masterProduction`) recebe o 4º ponto
`masterProductionPlans.ts:37-38` (firm/release com `'operate'` explícito). Já
documentado em FIND-ERP-009 §6 como ausência assumida — **não é novidade e não é
promovido**; entra para que a trilha **não o redescubra como se fosse novo** nem o
omita. Interface com T-09.

### E.4 — T-16 (`comex`) — escopo reduzido, registrado
T-16 mantém `comex` (8 endpoints) **menos** a rota de ato aprovatório, antecipada
para T-09. Nenhum endpoint fica sem dono; a aritmética de §7.4 da matriz
(261 = 174 + 44 + 43) **permanece exata** — houve realocação de titularidade dentro
da mesma faixa, não mudança de faixa.

### E.5 — Fila do runner (`AUDIT_PLAN.md` §8)
**DYN-04 é ampliado** (não é pedido novo): a sondagem de authZ passa a incluir,
contra `erp_evok_audio_test`, perfil com `diretor: 'operate'` chamando
`POST /api/purchases/:id/approve` e `POST /api/comex/import-processes/:id/approve`.
Solicitantes: T-09, T-04, T-10. **Nenhuma sondagem toca `erp_evok_audio`** —
o regime `APR-2026-016` permanece integralmente.

---

## F. Emenda à `AUDIT_COVERAGE_MATRIX.md` — **mudança de PROFUNDIDADE, nunca de tier**

Tier é decisão humana (`APR-2026-020`), alterável só pelo `vericore-audit-scope-agent`.
**Nenhum módulo muda de tier nesta emenda.** Mudam células de profundidade:

| Objeto | Seção da matriz | Célula | De | Para | Motivo |
|---|---|---|---|---|---|
| `purchases` (10 end.) | §4 (tier 2) | D1, D3, D4 | **E** | **E** (sem mudança) | já exaustivo; recebe direcionamento de leitura, não mais profundidade |
| `comex` (8 end.) | §7.1 (tier 3 profundo) | **D3** | A | **E para a rota de ato aprovatório** (`POST /import-processes/:id/approve`); **A** no restante | módulo de PRODUÇÃO com candidato de alçada; titular T-09 (W2) |
| `comex` | §7.1 | **D4** | A | **E** para a mesma rota; A no restante | idem |
| `masterProduction` (7 end.) | §4 (tier 2) | **D3** | A | **E** para `firm`/`release`; A no restante | 4º ponto do padrão; evita redescoberta e omissão |
| **Atos aprovatórios (~55 endpoints, transversal)** | §8 (nova linha) | **D1** | — (superfície não declarada) | **E — censo 100%** | novo entregável de T-04 (§D.3) |

**Declaração de honestidade sobre esta emenda:** ela **aumenta** cobertura
declarada em 4 células e cria 1 superfície nova exaustiva. Aumentar promessa é
exatamente o movimento que a lição do SIM-002 manda vigiar. Justificativa do porquê
é sustentável: (i) são **~55 + 15 endpoints**, superfície pequena e enumerável;
(ii) a dimensão é D1/D3 em rotas de aprovação, a mais objetiva de auditar
(nível declarado × nível efetivo); (iii) o esforço correspondente **foi acrescido**
(T-04: 5 S → 6 S), não absorvido no mesmo orçamento. Promessa maior sem esforço
maior seria a promessa vazia que custou o SIM-002.

**Total revisado do plano: 109 S → 110 S.**

**Nada é retirado da matriz.** Nenhuma célula **N** vira **E** por esta emenda; as
declarações negativas N-01…N-16 permanecem **integralmente válidas**, inclusive
N-06 (os 43 endpoints rasos) e N-04 (os 139 endpoints de `juridico`/`rh`/`sst` sem
D3).

---

## G. Emenda ao gate (`AUDIT_PLAN.md` §12) — **novo item G10**

Os itens **G1** e **G2** cobrem a mudança de profundidade e a emenda da matriz —
G1 passa a ler-se "aprovar o `AUDIT_PLAN.md` **e a EMENDA-01**".

**Há, porém, uma decisão que G1-G9 não cobrem e que é exclusivamente do dono:**

| # | Item de gate | Por que exige humano, e por que é distinto de G1/G2 |
|---|---|---|
| **G10** | **Promoção (ou não) do candidato CAND-AUTHZ-01 a finding preliminar, antes do fieldwork** — três opções: **(a)** promover agora por decisão registrada, seguindo o precedente da `APR-2026-018` (justificativa disponível: `purchases`/`comex` são **PRODUÇÃO**, ao contrário do `juridico` do FIND-ERP-005, que é NÃO-PRODUÇÃO, e a SanaCore já está com o caso do padrão em mãos — promover agora permitiria remediação conjunta e **copiável**, como a própria triagem recomenda em §3.2); **(b)** **não promover** e deixar a emissão para T-04/T-09/T-10 no fieldwork, com evidência VeriCore própria — mais lento, mais defensável; **(c)** promover **condicionado** à confirmação por T-04, com a SanaCore instruída a desenhar a correção do FIND-ERP-005 de forma copiável desde já, sem abrir caso novo | G1/G2 aprovam **o plano de auditar**; G10 decide **se um achado ganha status de finding antes de a auditoria o produzir**. É a mesma decisão que a `APR-2026-018` teve de registrar explicitamente, e que este plano se proíbe de tomar por analogia (§C). Tem impacto direto no sequenciamento da SanaCore (Decisão B da `APR-2026-020`), que não é matéria de plano de auditoria |

**Recomendação técnica do director (não é decisão — Regra 6):** a opção **(c)**
preserva as duas invariantes simultaneamente — não promove finding sem evidência
VeriCore, e não deixa a SanaCore produzir uma correção idiossincrática que depois
não sirva para `purchases`/`comex`, risco que a própria triagem registra em §10
("correção idiossincrática não copiável"). A decisão é do dono.

---

## H. O que esta emenda **não** faz

1. **Não promove** CAND-AUTHZ-01 a finding (§C).
2. **Não atribui** severidade nem confiança ao candidato.
3. **Não adjudica** as 3 âncoras — nenhum agente VeriCore as leu; adjudicar aqui
   seria auditar no lugar do especialista.
4. **Não adota** a conclusão SanaCore sobre a inaplicabilidade da Regra 24 (§B.4).
5. **Não altera** tier de nenhum módulo, nem o `AUDIT_COMMIT`, nem as exclusões
   E1-E10, nem qualquer declaração N-01…N-16.
6. **Não reescreve** uma linha sequer do `AUDIT_PLAN.md` ou da
   `AUDIT_COVERAGE_MATRIX.md`.
7. **Não autoriza fieldwork.** `/audit-fieldwork` continua condicionado a
   aprovação humana registrada em `coretriad/governance/APPROVALS.md` (Regra 18).
   O **PARE no gate humano segue integralmente em vigor.**
