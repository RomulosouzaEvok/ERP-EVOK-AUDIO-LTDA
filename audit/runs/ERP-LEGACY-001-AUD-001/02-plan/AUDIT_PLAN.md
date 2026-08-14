# AUDIT_PLAN — ERP-LEGACY-001-AUD-001

```
AUDIT_ID:        ERP-LEGACY-001-AUD-001
PROJECT_ID:      ERP-LEGACY-001 (passo 31 — auditoria 360°)
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regras 12-14)
DATA:            2026-08-14
AUTORIDADE:      APR-2026-020 Decisão A (Gilwagno, 14/08/2026)
PRODUZIDO POR:   vericore-software-audit-director, com o estágio de planejamento
                 do vericore-audit-planning-agent
ESTADO:          PLAN_DRAFTED — AGUARDANDO GATE HUMANO
FIELDWORK:       **NÃO AUTORIZADO** (ver §12)
```

Documentos vinculantes: `00-scope/AUDIT_SCOPE.md`, `01-inventory/SYSTEM_INVENTORY.md`,
`01-inventory/SYSTEM_MAP.md`, `coretriad/governance/APPROVALS.md`
(APR-2026-016, 019, 020), `audit/framework/AUDIT_PROCESS.md`, `CLAUDE.md`.

---

## 1. O que este plano é e o que não é

**É:** a distribuição de escopo por trilha, com titularidade nominal, profundidade
declarada, dependências entre ondas, critério objetivo de conclusão por trilha e
a matriz de cobertura **planejada** (`AUDIT_COVERAGE_MATRIX.md`).

**Não é:** fieldwork. Nenhuma trilha foi executada. Nenhum finding de conteúdo é
emitido aqui. Nenhuma linha do objeto auditado foi alterada (Regra 2). Nenhuma
evidência de auditoria anterior foi tocada (Regra 15).

**Lição incorporada do SIM-002 (vinculante para a matriz):** uma coverage matrix
que declara cobrir o que não cobre foi empiricamente refutada e custou o
`AUDIT_PASSED`. Este plano declara **menos e verdadeiro**. Toda amostragem é
explícita, com regra de seleção e percentual. Amostragem silenciosa é violação de
plano, não economia de esforço.

---

## 2. Fechamento da Limitação L1 do inventário — evidência dinâmica anexada

O `SYSTEM_INVENTORY.md` §0.2 declarou honestamente a limitação **L1**: o agente de
inventário não possuía Bash e, portanto, deixou **asserida, não provada**, a
identidade entre a árvore medida (working tree em HEAD `de4dac1`) e a árvore do
`AUDIT_COMMIT`. Essa limitação está **FECHADA**.

### 2.1 Comandos executados e saídas

Executados pelo **orquestrador da sessão** (não por auditor VeriCore — ver §2.3),
sobre o repositório local, sem qualquer escrita:

| # | Comando | Saída observada | Leitura |
|---|---|---|---|
| E1 | `git diff --stat c1311a6f76b512fef893f7e60d934179cae3409f de4dac1 -- server client mobile tv .github docs` | **vazia** | A árvore em HEAD (`de4dac1`) é **idêntica** ao `AUDIT_COMMIT` em **todos** os caminhos auditados. Todas as contagens do `SYSTEM_INVENTORY.md`, obtidas por Glob/Grep sobre o working tree, **valem para o AUDIT_COMMIT** |
| E2 | `git merge-base --is-ancestor 3dee99f c9359be` | **falso** (exit ≠ 0) | `3dee99f` **NÃO** é ancestral da tag `legacy-baseline-001` — ou seja, é **posterior** à baseline |
| E3 | `git merge-base --is-ancestor 3dee99f 1979beb` | **verdadeiro** (exit 0) | `3dee99f` é ancestral de `1979beb` — é **anterior** ao HEAD em que o discovery mediu |

Identidade de `3dee99f`: 2026-08-13, *"feat(itens,compras): espelhamento
item<->produto e recebimento de imobilizado"*.

Conclusão formal: **`3dee99f` ∈ (`c9359be`, `1979beb`]** — prova direta, que
substitui a inferência indireta (b) do `SYSTEM_INVENTORY.md` §1.2 e **confirma o
veredito §1.3 daquele documento**.

### 2.2 Efeito sobre as limitações declaradas

| Limitação | Estado |
|---|---|
| **L1** (identidade árvore ↔ AUDIT_COMMIT sem prova) | **FECHADA** por E1 |
| **L2** (estado do working tree) | **FECHADA na prática** por E1: um diff vazio entre commits, somado à ausência de divergência nas 21 métricas recontadas, torna a leitura do working tree equivalente à do commit nos caminhos auditados |
| **OBS-INV-02** (ausência de Bash no inventário) | **RESOLVIDA** — a ação exigida ("anexar a saída de `git diff --stat` como evidência antes do gate do plano") está cumprida aqui |
| **OBS-INV-01** | **NÃO** fechada — ao contrário, **confirmada** e promovida a item de primeira classe do plano (§3) |

### 2.3 Transparência de autoria da evidência (registro obrigatório)

Esta evidência dinâmica foi coletada pelo **orquestrador da sessão**, não por um
agente auditor VeriCore, **exatamente pelo mesmo padrão de transparência já usado
nesta run e nos passos 23/24 do discovery**. Registra-se, sem eufemismo:

1. Os três comandos são **read-only** sobre `.git` e **reprodutíveis** por
   qualquer terceiro com acesso de leitura ao repositório;
2. A cadeia de custódia é declarada, não presumida: quem executou, o quê, e qual
   saída;
3. **Não substitui** o `vericore-audit-verification-runner` para evidência
   dinâmica **do produto** (execução de teste, conexão de banco). O regime do
   `AUDIT_SCOPE.md` §5 permanece integralmente: qualquer evidência que envolva
   banco ou execução de código do ERP passa **obrigatoriamente** pelo runner,
   contra `erp_evok_audio_test` — ver §8.

---

## 3. OBS-INV-01 é item de primeira classe deste plano

### 3.1 O fato, sem atenuação

O commit `3dee99f` alterou 8 arquivos de `server/src` **depois** da tag
`legacy-baseline-001` (`c9359be`) e **antes** do discovery (`1979beb`) — provado
por E2/E3. Consequência direta:

> **Os 7 findings preliminares (`FIND-ERP-001/002/005/006/007/008/009`) estão
> ancorados em `c9359be`, um commit que já não refletia o código do ERP no momento
> em que o discovery foi executado.**

Verificado por leitura direta dos 7 arquivos nesta sessão: os cabeçalhos
`AUDIT_COMMIT:` / `BASELINE:` de todos apontam para
`c9359be399c45191fe90e8e9707803125a5ba91d`.

**Re-ancoragem já feita: 1 de 7.** A triagem SanaCore do CASE-001
(`remediation/cases/ERP-LEGACY-001-CASE-001/TRIAGE.md:20-31,44-49`) reconfirmou
todas as âncoras do `FIND-ERP-001` no HEAD e concluiu impacto nulo.
**Os outros 6 não foram re-ancorados por ninguém.**

Além disso, `server/src/services/itemProductMirrorService.ts` e
`server/src/services/fixedAssetReceiptService.ts` são **código que nenhuma
auditoria examinou** — entraram depois da baseline e não são âncora de nenhum dos
7 findings.

### 3.2 O que isso NÃO significa (declaração explícita)

**Isto NÃO invalida os 7 findings a priori.** Um finding não cai porque a âncora
mudou de commit; cai se a evidência citada não existir mais no
`AUDIT_COMMIT`. O que fica invalidado é **a premissa de que a baseline
`legacy-baseline-001` representa o código auditado** — premissa que o
`AUDIT_SCOPE.md` §2.3 ainda afirma e que hoje se sabe incorreta.

Correlato operacional: qualquer trilha que use a tag como referência de leitura
está lendo **um sistema que não é o auditado**. A única referência válida de
leitura nesta run é o `AUDIT_COMMIT`.

### 3.3 Tarefas explícitas derivadas (rastreadas, não implícitas)

| ID | Tarefa | Trilha responsável | Critério de pronto |
|---|---|---|---|
| **RA-01** | Re-ancorar `FIND-ERP-002` contra o `AUDIT_COMMIT` | T-00 | Cada citação arquivo+linha do finding reconferida no `AUDIT_COMMIT`; veredito MANTIDO / MANTIDO-COM-CORREÇÃO-DE-ÂNCORA / PREJUDICADO, com diff citado |
| **RA-02** | Idem `FIND-ERP-005` | T-00 | idem |
| **RA-03** | Idem `FIND-ERP-006` | T-00 | idem |
| **RA-04** | Idem `FIND-ERP-007` | T-00 | idem |
| **RA-05** | Idem `FIND-ERP-008` | T-00 | idem |
| **RA-06** | Idem `FIND-ERP-009` | T-00 | idem |
| **RA-07** | Registrar que `FIND-ERP-001` **já** foi re-ancorado pela SanaCore e **verificar independentemente** essa re-ancoragem (VeriCore não aceita conclusão de SanaCore como prova — Regras 3-4) | T-00 | Re-conferência independente registrada |
| **RA-08** | Cobertura integral de `itemProductMirrorService.ts` e `fixedAssetReceiptService.ts` como **código sem cobertura de auditoria anterior** | T-05 | 100% das linhas dos 2 arquivos lidas, regra de negócio extraída e confrontada com `BR_CATALOG.md`; ausência de BR correspondente é finding, não silêncio |
| **RA-09** | Correção formal do `AUDIT_SCOPE.md` §2.3 (afirmação hoje sabidamente incorreta) | **fora de trilha** — autoridade do `vericore-audit-scope-agent`; item de gate (§12) | Escopo emendado por adição rastreável, nunca por reescrita silenciosa |

---

## 4. Estrutura de trilhas — 27 trilhas em 5 ondas

| Onda | Trilhas | Natureza | Dependência |
|---|---|---|---|
| **W0 — Fundação** | T-00 | integridade do commit + re-ancoragem dos findings | nenhuma (bloqueia todas) |
| **W1 — Tier 1 + authZ transversal** | T-01 … T-05 | exaustivo | W0 |
| **W2 — Tier 2 + superfícies transversais** | T-06 … T-15 | exaustivo/dirigido | W0 + T-04 |
| **W3 — Tier 3 + plataforma** | T-16 … T-24 | amostral declarado | W0; consome saídas de W1/W2 |
| **W4 — Assurance** | T-25, T-26 | validação e consolidação | W1+W2+W3 |

Contagem: **1 trilha de fundação + 24 trilhas de auditoria de conteúdo + 2
trilhas de assurance = 27**.

### 4.1 Onda 0 — Fundação (bloqueante)

#### T-00 — INTEGRIDADE DO OBJETO E RE-ANCORAGEM DOS FINDINGS
- **Titular:** `vericore-finding-validator` (autor de **nenhum** dos 7 findings —
  ver §7).
- **Apoio:** `vericore-audit-verification-runner` (comandos git adicionais, se o
  titular precisar de diff por arquivo), `vericore-audit-evidence-controller`
  (persistência).
- **Escopo:** RA-01 … RA-07 (§3.3); reconferência do §2 deste plano; congelamento
  do manifesto de evidência da run.
- **Profundidade:** exaustiva. Não é amostral em nenhuma hipótese.
- **Pronto quando:** os 7 findings têm veredito de re-ancoragem registrado contra
  `c1311a6f`, com arquivo+linha reconferido; a lista de arquivos alterados por
  `3dee99f` está reconciliada com a árvore auditada; nenhuma citação de finding
  permanece apontando para `c9359be` sem nota de re-ancoragem.
- **Esforço:** 3 S (sessões de agente auditor).
- **Bloqueio:** nenhuma trilha de W1/W2/W3 inicia antes do fechamento de T-00 —
  auditar módulo cuja âncora de finding é desconhecida produz retrabalho e
  duplicidade.

### 4.2 Onda 1 — Tier 1 (PRODUÇÃO REAL, exaustivo) + authZ transversal

Regime **read-only reforçado permanente** (APR-2026-016). 6 módulos, 39
endpoints, **100% exaustivo**, sem amostragem em nenhuma dimensão.

#### T-01 — TIER1 CADASTRO: `items`, `categories`, `departments` (22 endpoints)
- **Titular:** `vericore-backend-auditor`. **Co-titulares:**
  `vericore-domain-logic-auditor` (regra), `vericore-data-integrity-auditor`
  (integridade).
- **Escopo:** 100% dos 22 endpoints; use cases, controllers, repositories, models
  correspondentes; seed oficial de `departments` (17 registros = organograma
  real); validação de entrada; authZ por endpoint; audit log por operação de
  escrita.
- **Atenção obrigatória:** `items` é tier 1 **e** foi alterado por `3dee99f` — é
  o ponto de maior atenção do plano (`SYSTEM_MAP.md` §2.1). A parte do
  espelhamento vai para T-05; T-01 audita o módulo, T-05 audita o fluxo.
- **Pronto quando:** matriz endpoint × (authN, authZ, validação, transação, audit
  log, BR correspondente) preenchida para os 22, sem célula "não verificado".
- **Esforço:** 4 S.

#### T-02 — TIER1 IDENTIDADE: `auth`, `users` (15 endpoints)
- **Titular:** `vericore-authentication-auditor`. **Co-titular:**
  `vericore-session-security-auditor`.
- **Escopo:** 100% dos 15 endpoints; emissão/verificação de token; hash e política
  de senha; recuperação; ciclo de vida de sessão; a conta admin como **único** dado
  real do módulo (as 20 contas `@teste.evokaudio` são NÃO-PRODUÇÃO, mas **o código
  é auditado integralmente**).
- **Verificação obrigatória por regra do CLAUDE.md nº 24:** papel/role declarado
  pelo cliente sem verificação server-side é **CRITICAL bloqueante**, sem
  `RISK_ACCEPTED` possível neste projeto. Varredura de `role`/`userRole`/
  `isAdmin`/`perfil` vindos de body/query/header/payload não verificado — em
  `auth`, `users` e, por delegação, em T-04.
- **Pronto quando:** cadeia completa credencial → token → `req.user` → decisão de
  authZ demonstrada com arquivo+linha, e a origem de cada campo de identidade
  classificada (servidor × cliente).
- **Esforço:** 3 S.

#### T-03 — TIER1 AUDIT LOG: `auditLogs` (2 endpoints) + `auditLogService.ts`
- **Titular:** `vericore-database-auditor`.
  **Segunda voz:** `vericore-audit-log-security-auditor` — **autor do
  FIND-ERP-002, portanto não é voz única** (§7).
- **Escopo:** módulo `auditLogs`; `server/src/services/auditLogService.ts`
  (**chamado por 101 arquivos / 403 ocorrências** — maior superfície transversal
  do sistema); as 3 tabelas do FIND-ERP-002 (`audit_logs`, `sale_invoices`,
  `accounting_entries`) × as 13 tabelas RH/JUR/SST que têm proteção; imutabilidade
  declarada no schema (trigger/RULE/REVOKE).
- **Método específico:** as 403 ocorrências não são auditadas uma a uma como
  chamadas idênticas; são **classificadas** por padrão de uso (com/sem ator,
  com/sem antes-depois, dentro/fora de transação) e **auditadas exaustivamente
  por classe**, com a enumeração completa anexada. Isto é declarado como
  estratificação, não como amostragem.
- **Pronto quando:** todas as 403 ocorrências classificadas (lista anexa), classes
  auditadas 100%, e o veredito de re-ancoragem do FIND-ERP-002 (RA-01) confrontado
  com a evidência própria de T-03.
- **Esforço:** 4 S.

#### T-04 — TRANSVERSAL AUTHZ: `server/src/middlewares/` (6) + montagem em `server/app.ts`
- **Titular:** `vericore-appsec-auditor`. **Co-titular:**
  `vericore-authentication-auditor`. **Segunda voz consultiva:**
  `vericore-authorization-auditor` (autor de FIND-ERP-005/009 — não titular).
- **Escopo:** `auth.ts`, `authorizeAnyModule.ts`, `authorizeSelfOrModule.ts`,
  `errorHandler.ts`, `imageUpload.ts`, `requestContext.ts`; as **65 chamadas
  `app.use(`** de `server/app.ts` (raiz de `server/`, **não** `server/src/`);
  ordem de montagem; rotas montadas **sem** middleware de authZ.
- **Por que existe como trilha própria:** `SYSTEM_MAP.md` §2.2 registra que
  **100% da authZ mora nesses 6 arquivos**. Sem dono explícito, essa superfície cai
  no vão entre trilhas de módulo — que é exatamente o modo como authZ some de
  auditoria.
- **Saída que as outras trilhas consomem:** **mapa authZ por endpoint** (681
  linhas: endpoint → middleware aplicado → módulo/nível exigido → efetivo/inefetivo).
  W2 e W3 dependem deste artefato.
- **Pronto quando:** os 681 endpoints têm classificação de authZ derivada da
  montagem real, e cada endpoint sem authZ está enumerado com justificativa
  (público por desenho × lacuna).
- **Esforço:** 5 S. **É a trilha de maior alavancagem do plano.**

#### T-05 — FLUXO ITEM ↔ PRODUTO ↔ RECEBIMENTO (cross-tier 1/2/3, dono único)
- **Titular:** `vericore-service-layer-auditor`. **Co-titular:**
  `vericore-domain-logic-auditor`.
- **Escopo:** os 8 arquivos de `3dee99f` + `products` (9 endpoints, tier 3) +
  `assets` (7 endpoints, tier 3, recebimento de imobilizado) + a interface com
  `purchases` (tier 2, `ReceivePurchaseItemsUseCase`) + `items` (tier 1).
- **Por que existe:** o inventário registrou que `products` (tier 3) + `purchases`
  (tier 2) + `items` (tier 1) formam **um único fluxo** alterado por `3dee99f`.
  Auditá-los em trilhas desconexas **perde o fluxo** — o defeito de espelhamento
  não mora em nenhum dos três módulos, mora entre eles. Uma trilha, um dono, o
  fluxo inteiro. A auditoria **de módulo** de `purchases` permanece em T-10 e a de
  `items` em T-01; T-05 é dona do **fluxo** e da **fronteira**.
- **Tarefa RA-08:** `itemProductMirrorService.ts` e `fixedAssetReceiptService.ts`
  são tratados como **código sem cobertura de auditoria anterior** — leitura 100%,
  regra extraída e confrontada com `BR_CATALOG.md`; BR ausente é finding.
- **Pronto quando:** o fluxo insumo → item → produto espelhado → recebimento →
  imobilizado está descrito ponta a ponta com arquivo+linha, divergências de
  estado entre `items` e `products` enumeradas, e os 2 serviços novos cobertos
  integralmente.
- **Esforço:** 4 S.

### 4.3 Onda 2 — Tier 2 (alto risco) + superfícies transversais

20 módulos, 381 endpoints. **Dois níveis de profundidade, ambos declarados:**

- **Nível A (exaustivo, 381/381 endpoints):** authN, authZ (herdado de T-04),
  validação de entrada, presença de transação, presença de audit log.
- **Nível B (regra de negócio em profundidade, amostra declarada):** âncoras dos
  findings + fluxos de maior valor + amostra por módulo declarada na
  `AUDIT_COVERAGE_MATRIX.md`. **Não** se declara nível B exaustivo em `juridico`
  (75), `rh` (57) e `sst` (75) — 207 endpoints de nível B exaustivo é promessa que
  este plano não sustenta e, portanto, não faz.

#### T-06 — ESTOQUE E IDEMPOTÊNCIA: `inventory` (27), `mobileInventory` (3), `traceability` (3)
- **Titular:** `vericore-data-integrity-auditor`.
  **Segunda voz:** `vericore-idempotency-auditor` — **autor do FIND-ERP-001, não
  titular** (§7).
- **Escopo:** `POST /api/inventory/movements` (âncora do FIND-ERP-001 CRITICAL);
  superfícies irmãs levantadas pela triagem (`products/movements`,
  `mobile-inventory/scan|batch`); serviços `inventoryService.ts`,
  `warehouseStockService.ts`, `quarantineBalanceService.ts`,
  `saleStockService.ts`, `materialReceiptService.ts`, `saleLotService.ts`;
  ausência de UNIQUE em `InventoryMovement.ts`.
- **Evidência dinâmica:** **DYN-02** (§8) — reprodução de duplicidade concorrente
  contra `erp_evok_audio_test`.
- **Pronto quando:** toda rota que grava movimento de estoque está enumerada e
  classificada quanto a idempotência (protegida por lock / por guarda de estado /
  desprotegida), e o veredito de RA-07 confrontado.
- **Esforço:** 4 S.

#### T-07 — FINANCEIRO: `financial` (30), `treasury` (11), `accounting` (11), `budget` (6)
- **Titular:** `vericore-domain-logic-auditor`. **Co-titular:**
  `vericore-data-integrity-auditor`. **Segunda voz:** `vericore-idempotency-auditor`
  (não titular).
- **Escopo:** `PayPayableUseCase` / `ReceivePaymentUseCase` (pagamento parcial —
  FIND-ERP-001); CNAB e conciliação; `saleReceivableService.ts`,
  `costingService.ts`; imutabilidade de `accounting_entries` (interface com T-03).
- **Evidência dinâmica:** **DYN-03**.
- **Pronto quando:** todo caminho que altera saldo financeiro enumerado, com
  classificação transacional e de idempotência; divergências com o
  `BR_CATALOG.md` registradas.
- **Esforço:** 4 S.

#### T-08 — FISCAL: `fiscal` (2 endpoints)
- **Titular:** `vericore-business-process-auditor`.
- **Escopo:** NF-e; os tributos congelados no passo 30 (ICMS por UF divergente da
  documentação; IPI sempre 0%); imutabilidade de `sale_invoices` (interface T-03).
- **Nota de honestidade:** 2 endpoints, superfície pequena, **impacto legal
  desproporcional ao tamanho**. Profundidade exaustiva apesar da contagem baixa.
- **Pronto quando:** cada tributo calculado tem fonte normativa citada ou é
  registrado como regra sem fonte.
- **Esforço:** 2 S.

#### T-09 — AUTORIZAÇÃO APLICADA E SEGREGAÇÃO: `accessProfiles` (6), `juridico` (75), `directorate` (14, puxado do tier 3)
- **Titular:** `vericore-business-process-auditor` (segregação como controle
  interno). **Co-titular:** `vericore-appsec-auditor` (alçada técnica).
  **Segunda voz:** `vericore-authorization-auditor` — **autor de FIND-ERP-005 e
  FIND-ERP-009, não titular** (§7).
- **Escopo:** alçada de contrato jurídico (RF-JUR-003 — FIND-ERP-005 CRITICAL, 4
  falhas encadeadas); `shared/domain/segregationOfDuties.ts`; os **21 pontos de
  aprovação** do FIND-ERP-009 (4 com segregação na cadeia de compras × 20 sem);
  perfis de acesso e o curto-circuito por `role === 'admin'`.
- **Resolução da nota de inventário nº 2:** `directorate` está em **tier 3** pela
  enumeração do escopo — este plano **não altera o tier** (alteração exige o
  `vericore-audit-scope-agent`). Trata-o **com profundidade de tier 2** dentro
  desta trilha, porque concentra alçada e é matéria do FIND-ERP-009. O tier
  governa a **prioridade**; o plano governa a **profundidade** dentro dela.
- **Evidência dinâmica:** **DYN-04**.
- **Pronto quando:** os 21 pontos de aprovação estão enumerados com veredito
  individual (segregação presente/ausente/contornável) e a alçada jurídica
  reconferida contra o contrato de API no `AUDIT_COMMIT`.
- **Esforço:** 5 S.

#### T-10 — SUPRIMENTOS E VENDAS: `purchases` (10), `purchaseRequisitions` (5), `rfq` (7), `suppliers` (6), `sales` (13)
- **Titular:** `vericore-backend-auditor`. **Co-titular:**
  `vericore-use-case-auditor`.
- **Interface obrigatória com T-05:** `ReceivePurchaseItemsUseCase` é auditado
  **como módulo** aqui e **como fluxo** em T-05; o handoff entre as duas trilhas é
  explícito, e divergência entre elas é escalada, não conciliada em silêncio
  (Regra 20).
- **Pronto quando:** ciclo requisição → cotação → pedido → recebimento →
  pagamento descrito ponta a ponta com os pontos de aprovação marcados.
- **Esforço:** 4 S.

#### T-11 — PRODUÇÃO E MRP: `mrp` (4), `production` (23), `masterProduction` (7), `bom` (12, puxado do tier 3)
- **Titular:** `vericore-domain-logic-auditor`. **Co-titular:**
  `vericore-data-integrity-auditor`.
- **Resolução da nota de inventário nº 3:** `bom` está em **tier 3** pela
  enumeração do escopo — tier **não alterado**, profundidade **elevada a tier 2**
  dentro desta trilha, porque é âncora de BR-PP-016/017 e da **divergência entre
  dois motores de explosão** (`bomService.ts` × `bomStructureProjection.ts`),
  congelada no passo 30.
- **Pronto quando:** os dois motores de BOM comparados linha a linha em pelo menos
  os casos congelados pelos testes de caracterização, com a divergência
  caracterizada como defeito ou como comportamento intencional documentado.
- **Esforço:** 4 S.

#### T-12 — PESSOAS E COMPLIANCE: `rh` (57), `sst` (75) + LGPD
- **Titular:** `vericore-requirements-auditor`. **Co-titular:**
  `vericore-use-case-auditor`. **Segunda voz:** `vericore-business-rule-auditor`
  — **autor de FIND-ERP-006/007/008, não titular** (§7).
- **Escopo:** LGPD (DPO sem cadastro, retenção sem consumidor, incidente sem prazo
  ANPD — FIND-ERP-006 HIGH); CAT/eSocial S-2210 tipo × gravidade (FIND-ERP-008
  HIGH); rescisão de experiência (FIND-ERP-007 MEDIUM).
- **Tratamento específico do FIND-ERP-007:** a `APR-2026-020` Decisão B item 3
  determina que ele **não segue à SanaCore** até o item 409×422
  (`NEEDS_MORE_EVIDENCE`) voltar ao autor de origem. Esta trilha produz uma
  **determinação independente** sobre 409×422, com titular distinto do autor; o
  retorno ao autor exigido pela APR ocorre **em paralelo** e não é substituído por
  esta trilha. As duas conclusões são confrontadas em T-25.
- **Nível B declarado:** amostra de 20 dos 57 endpoints de `rh` e 24 dos 75 de
  `sst`, selecionados por: (i) âncora de finding, (ii) escrita de dado pessoal
  sensível, (iii) obrigação legal com prazo. Regra registrada na matriz.
- **Esforço:** 5 S.

#### T-13 — DADOS E SCHEMA (transversal): 207 tabelas, 478 FKs, 186 models, 169 migrations
- **Titular:** `vericore-database-auditor`. **Co-titulares:**
  `vericore-migration-auditor`, `vericore-data-integrity-auditor`.
- **Escopo:** `server/database/postgresql/00_baseline_frozen.sql` (fonte do schema
  — **não** a soma dos `createTable()` dos 169 arquivos) + as 9 migrations
  pós-congelamento; **os 186 models de `server/src/models/`**, que estão **fora**
  da árvore Clean Architecture; divergência model × coluna (as 5 bombas NOT NULL
  historicamente conhecidas); FKs sem índice; ausência de UNIQUE onde a regra
  exige.
- **Por que é trilha própria:** `server/src/models/` é a segunda superfície
  transversal sem dono natural. 186 arquivos distribuídos entre 24 trilhas de
  módulo = nenhum dono. Aqui tem um.
- **Nível declarado:** **exaustivo** para as 207 tabelas quanto a PK/FK/UNIQUE/NOT
  NULL declarados; **exaustivo** para os 186 models quanto a correspondência
  model × tabela; **amostral declarado** para semântica de coluna (amostra: todas
  as tabelas tocadas por tier 1 e tier 2 = regra registrada na matriz).
- **Evidência dinâmica:** **DYN-05** (schema efetivo do banco efêmero × schema
  declarado).
- **Esforço:** 5 S.

#### T-14 — REGRAS DE NEGÓCIO: revalidação das **164 regras** do `BR_CATALOG.md`
- **Titular:** `vericore-business-process-auditor`. **Co-titular:**
  `vericore-traceability-auditor`. **Segunda voz:** `vericore-business-rule-auditor`
  (autor de findings derivados de BRs de `rh`/`sst`/LGPD — as BRs vinculadas a
  FIND-ERP-006/007/008 são validadas pelos dois titulares, não por ele).
- **Pendência que esta trilha fecha:** o `SYSTEM_INVENTORY.md` §6 registra
  explicitamente que **"as 164 regras do BR_CATALOG NÃO foram revalidadas no
  estágio estrutural"** e que isso ficaria para uma trilha do plano. **É esta.**
- **Escopo:** cada BR-ID canônico (`APR-2026-019`) confrontado com o código no
  `AUDIT_COMMIT`: regra existe no código? existe como declarada? tem contraexemplo?
  Status por regra: CONFIRMADA / DIVERGENTE / NÃO IMPLEMENTADA / NÃO LOCALIZÁVEL.
- **Insumo, nunca cópia:** o `BR_CATALOG.md` é validado, não reproduzido. Copiar
  conclusão de discovery para relatório de auditoria é o antipadrão que esta run
  existe para não repetir.
- **Vedação registrada:** **OWNER por área é atribuição do dono** (APR-2026-019
  parte 2, reafirmada por APR-2026-020) — **vedado a agente decidir ou inferir
  OWNER**. Esta trilha reporta lacuna de OWNER; não a preenche.
- **Pronto quando:** as 164 regras têm status individual com arquivo+linha ou com
  declaração explícita de não-localização.
- **Esforço:** 6 S. **É a trilha mais cara do plano e a de maior valor
  estrutural.**

#### T-15 — REQUISITOS, CASOS DE USO E RASTREABILIDADE
- **Titular:** `vericore-traceability-auditor`. **Co-titulares:**
  `vericore-requirements-auditor`, `vericore-use-case-auditor`,
  `vericore-acceptance-criteria-auditor`.
- **Escopo:** `REQUIREMENTS_BASELINE.md` (89 requisitos) e
  `LEGACY_TRACEABILITY_MATRIX.md` (**0 cadeias completas**) validados contra o
  `AUDIT_COMMIT`; a causa-raiz nº 1 declarada (elo BR↔REQ quebrado) reexaminada
  após a renumeração canônica da `APR-2026-019`; cadeia do
  `AUDIT_PROCESS.md` §1 (OBJETIVO → PROCESSO → BR → REQ → UC → AC → NFR →
  ARQUITETURA → IMPLEMENTAÇÃO → BANCO/API → TESTE → SEGURANÇA → AUDIT LOG →
  OPERAÇÃO → EVIDÊNCIA).
- **Dependência:** consome a saída de T-14 (status das 164 BRs). Inicia em
  paralelo, **fecha depois** de T-14.
- **Pronto quando:** para cada um dos 89 requisitos, o elo quebrado está
  identificado nominalmente, e o número de cadeias completas no `AUDIT_COMMIT` é
  medido (podendo ser 0 — resultado negativo é resultado).
- **Esforço:** 5 S.

### 4.4 Onda 3 — Tier 3 e plataforma (amostragem declarada)

#### T-16 — TIER 3 BACKEND: 7 módulos em profundidade + varredura rasa nos demais
- **Titular:** `vericore-backend-auditor`. **Co-titular:**
  `vericore-authorization-auditor` (aqui **pode** ser titular de authZ: não é
  autor de nenhum finding nestes módulos — §7).
- **Amostragem declarada (regra de seleção: maior superfície de endpoints e maior
  potencial de escrita):** profundidade em `facilities` (64), `ti` (47),
  `marketing` (30), `engineering` (11), `comex` (8), `reports` (8), `workCenters`
  (6) = **174 endpoints**.
- **Já cobertos por outras trilhas:** `products` (9) e `assets` (7) em T-05,
  `bom` (12) em T-11, `directorate` (14) em T-09, `webhooks` (2) em T-24 = **44
  endpoints**.
- **Varredura rasa (apenas presença de authN/authZ e de validação de entrada,
  sem análise de regra de negócio) — DECLARADA COMO NÃO-PROFUNDA:** `clients` (5),
  `employees` (5), `maintenance` (5), `serviceOrders` (5), `nonConformities` (5),
  `spreadsheetImport` (5), `intelligentAuditor` (4), `quality` (3), `laboratory`
  (3), `dashboard` (3) = **43 endpoints**.
- **Aritmética de fechamento:** 174 + 44 + 43 = **261** = total do tier 3.
  Cobertura profunda do tier 3 = 218/261 = **83,5%**; rasa = 43/261 = **16,5%**;
  não coberto = **0**.
- **Pronto quando:** os 174 têm matriz por dimensão preenchida; os 43 têm as duas
  colunas rasas preenchidas e estão nominalmente listados como rasos no relatório
  — nunca apresentados como auditados em profundidade.
- **Esforço:** 5 S.

#### T-17 — CONTRATO DE API: 681 endpoints
- **Titular:** `vericore-api-auditor`. **Co-titular:**
  `vericore-api-documentation-auditor`.
- **Escopo:** os 53 arquivos de rota, 100%, quanto a: método × semântica, código de
  status (o 409×422 do FIND-ERP-007 entra aqui), formato de erro, versionamento,
  paginação, contrato documentado × implementado.
- **Nível:** **exaustivo para inventário e status**; **amostral para semântica
  profunda** (amostra = tiers 1 e 2 integralmente + os 174 profundos do tier 3).
- **Esforço:** 4 S.

#### T-18 — SEGURANÇA DE APLICAÇÃO, SEGREDOS E DEPENDÊNCIAS
- **Titular:** `vericore-appsec-auditor`. **Co-titulares:**
  `vericore-secrets-auditor`, `vericore-dependency-security-auditor`,
  `vericore-security-configuration-auditor`.
- **Escopo:** injeção, XSS, upload (`imageUpload.ts`, `uploadService.ts`), CORS,
  headers, rate limiting; segredos em código e configuração versionada;
  manifestos `package.json`/`package-lock.json` de server/client/mobile/tv;
  OBS-INV-08 (`typescript ^7.0.2` × `~6.0.2`; `zod ^4.4.3` × `^3.25.76` —
  contratos compartilhados entre duas majors de Zod).
- **Ressalva E6 vinculante:** a **existência** de `CREDENCIAIS_TESTE.local.txt`,
  `CREDENCIAIS_APROVADOR.local.txt`, `ACESSOS_N8N.local.txt` no working tree pode
  fundamentar finding de gestão de segredos **sem leitura do conteúdo**. Abrir
  qualquer um deles é violação de escopo.
- **Esforço:** 4 S.

#### T-19 — ARQUITETURA
- **Titular:** `vericore-architecture-auditor`. **Co-titulares:**
  `vericore-domain-architecture-auditor`, `vericore-dependency-architecture-auditor`,
  `vericore-repository-layer-auditor`.
- **Escopo:** a **dualidade estrutural** — Clean Architecture por módulo (170
  domain + 666 application + 151 infrastructure + 106 controllers) **×** a espinha
  legada `models/` (186) + `services/` (16), que é **onde vivem as âncoras dos
  achados mais graves**; violações V1-V4 do `CURRENT_ARCHITECTURE.md` revalidadas
  no `AUDIT_COMMIT`; `server/app.ts` fora de `server/src/`.
- **Esforço:** 4 S.

#### T-20 — QUALIDADE E TESTES
- **Titular:** `vericore-qa-auditor`. **Co-titulares:**
  `vericore-test-coverage-auditor`, `vericore-test-architecture-auditor`,
  `vericore-sdet-auditor`, `vericore-regression-auditor`.
- **Escopo:** 177 unit + 59 integration + 1 edge + 9 characterization (66 casos);
  **OBS-INV-03** (33 blocos estáticos × 66 casos em execução — cobertura gerada em
  laço **não é auditável estaticamente**); **OBS-INV-06** (2 testes unit
  pré-existentes falhando — `docs-path-reference-guard.test.ts` e
  `onda3-shipping-cockpit-cashflow.test.ts`, explicitamente herdados para o passo
  31); teste que passa sem asserção efetiva; teste acoplado a dado real.
- **Conflito:** os testes de caracterização são de autoria **OpusCore** — VeriCore
  os audita como objeto, sem conflito (`AUDIT_SCOPE.md` §8 item 2).
- **Evidência dinâmica:** **DYN-06** e **DYN-07**.
- **Esforço:** 4 S.

#### T-21 — FRONT-ENDS: `client` (167 páginas), `mobile`, `tv`
- **Titular:** `vericore-frontend-auditor`. **Co-titular:**
  `vericore-fullstack-auditor` (fronteira contrato × consumo).
- **Amostragem declarada:** as páginas que consomem tier 1 e tier 2 + as telas
  citadas por finding (a UI de CAT do FIND-ERP-008, que "produz exatamente a
  combinação errada em todo acidente com óbito"). Alvo: **≈40 das 167 páginas
  (24%)**, lista nominal fixada no início da trilha e anexada ao relatório.
  `mobile/` e `tv/` — **varredura estrutural apenas** (sem suíte de teste
  identificada; ver matriz).
- **Declaração negativa obrigatória:** **127 páginas do `client/` não serão
  auditadas** nesta run. Está na matriz como NÃO COBERTO, com motivo.
- **Esforço:** 4 S.

#### T-22 — PLATAFORMA: CI, infra declarada, backup, observabilidade
- **Titular:** `vericore-devops-auditor`. **Co-titulares:**
  `vericore-cicd-auditor`, `vericore-infrastructure-auditor`,
  `vericore-backup-recovery-auditor`, `vericore-observability-auditor`,
  `vericore-sre-auditor`.
- **Escopo:** o **único** workflow `.github/workflows/server-ci.yml`;
  **OBS-INV-07** — zero pipeline para `client/`, `mobile/`, `tv/`, apesar de
  `client/` ter suíte vitest declarada (candidato a finding de engenharia, **não
  emitido no inventário**, corretamente); `docker-compose.yml` /
  `docker-compose.prod.yml`; scripts de backup em `server/scripts/`; `docs/infra/`.
- **Limite duro:** infra é auditada **como declarada**. Nenhum acesso a
  ambiente em execução. Nenhuma conexão a `erp_evok_audio`.
- **Esforço:** 3 S.

#### T-23 — DOCUMENTAÇÃO × CÓDIGO
- **Titular:** `vericore-documentation-audit-lead`. **Co-titulares:**
  `vericore-documentation-consistency-auditor`,
  `vericore-architecture-documentation-auditor`, `vericore-data-documentation-auditor`,
  `vericore-operations-documentation-auditor`, `vericore-security-documentation-auditor`,
  `vericore-test-documentation-auditor`.
- **Escopo:** 172 `.md` em escopo (excluídos os 58 de `docs/coretriad/` por E4) +
  `CLAUDE.md` + 15 READMEs de módulo + READMEs de client/mobile/tv; a lacuna
  registrada **`server/` não tem README próprio**; divergência doc × código
  (ex.: ICMS por UF).
- **Amostragem declarada:** 100% dos documentos que descrevem tier 1/tier 2;
  amostral no restante — regra na matriz.
- **Esforço:** 4 S.

#### T-24 — INTEGRAÇÕES E RESILIÊNCIA
- **Titular:** `vericore-integration-auditor`. **Co-titulares:**
  `vericore-webhook-auditor`, `vericore-external-api-auditor`,
  `vericore-integration-architecture-auditor`, `vericore-resilience-auditor`,
  `vericore-performance-auditor`.
- **Escopo:** `webhooks` (2 endpoints), n8n como transporte, `emailService.ts`,
  `uploadService.ts`, `qrCodeService.ts`, `comex` na parte de integração;
  timeout/retry/circuito; `INTEGRATION_INVENTORY.md` revalidado.
- **Esforço:** 3 S.

### 4.5 Onda 4 — Assurance

#### T-25 — VALIDAÇÃO DE FINDINGS (Regra 22)
- **Titular:** `vericore-finding-validator` (autor de nenhum dos 7 — §7).
- **Escopo:** tentar **refutar** cada finding CRITICAL e HIGH antes de aceitá-lo;
  confrontar a determinação independente de T-12 sobre o 409×422 com o retorno ao
  autor exigido pela `APR-2026-020` Decisão B item 3.
- **Escalonamento:** todo CRITICAL vai a humano (Regra 21) **no momento em que
  surge**, não no fim da onda.
- **Esforço:** 4 S.

#### T-26 — CONSOLIDAÇÃO E COBERTURA EXECUTADA
- **Titular:** `vericore-audit-consolidator`. **Apoio:**
  `vericore-audit-evidence-controller`.
- **Escopo:** deduplicação, agrupamento, priorização; e a **`AUDIT_COVERAGE_MATRIX`
  EXECUTADA** — a matriz deste plano é **planejada**; a executada registra o que
  de fato foi coberto, célula a célula. **Divergência entre planejada e executada é
  registro obrigatório, nunca ajuste retroativo do plano.**
- **Esforço:** 3 S.

---

## 5. Superfícies transversais — dono explícito (resolução da lacuna do inventário)

O `SYSTEM_MAP.md` §2.2 alertou: superfícies que não são módulos **caem no vão
entre trilhas** se não tiverem dono. Resolvido nominalmente:

| Superfície | Tamanho | **Dono único** | Trilha | Observação |
|---|---|---|---|---|
| `server/src/middlewares/` | 6 arquivos — **100% da authZ** | `vericore-appsec-auditor` | **T-04** | Produz o mapa authZ dos 681 endpoints, consumido por W2/W3 |
| `server/src/services/auditLogService.ts` | **101 arquivos / 403 ocorrências** | `vericore-database-auditor` | **T-03** | Estratificação por classe de uso, com enumeração completa anexa |
| `server/src/services/` (15 demais) | 16 arquivos no total | `vericore-service-layer-auditor` | **T-05** (dono da superfície) | Sub-alocação: estoque→T-06; financeiro→T-07; BOM→T-11; e-mail/upload/QR→T-24. O **dono da superfície permanece T-05**, que responde pela completude dos 16 |
| `itemProductMirrorService.ts`, `fixedAssetReceiptService.ts` | 2 arquivos **sem cobertura de auditoria anterior** | `vericore-service-layer-auditor` | **T-05** (RA-08) | 100% das linhas |
| `server/src/models/` | 186 arquivos, **fora da Clean Architecture** | `vericore-database-auditor` | **T-13** | Exaustivo em correspondência model×tabela |
| `server/app.ts` (65 `app.use`) | 1 arquivo, raiz de `server/` | `vericore-appsec-auditor` | **T-04** | Ordem de montagem = onde authZ é contornável |
| Schema declarado (207/478/169) | — | `vericore-migration-auditor` | **T-13** | Fonte = `00_baseline_frozen.sql` + 9 migrations, **não** a soma dos `createTable()` |

**Regra de completude:** cada um dos 16 serviços, 186 models, 6 middlewares e 53
arquivos de rota aparece em **exatamente uma** célula de titularidade na
`AUDIT_COVERAGE_MATRIX.md`. Arquivo sem titular é defeito de plano — e é motivo
para T-26 rejeitar a consolidação.

---

## 6. Fluxos que atravessam tiers (resolução das notas do inventário)

| Nota | Problema | Resolução |
|---|---|---|
| **Nota 1** — `items` (T1) + `purchases` (T2) + `products` (T3) são **um fluxo** alterado por `3dee99f` | auditar em trilhas desconexas perde o fluxo | **T-05** é dona do fluxo ponta a ponta, cross-tier, com dono único. T-01 e T-10 continuam donas dos **módulos**; a fronteira é de T-05. Handoff explícito e divergência escalada (Regra 20) |
| **Nota 2** — `directorate` (T3) concentra alçada | tier baixo × risco alto | **T-09** o audita com **profundidade de tier 2**. Tier **não** alterado (autoridade do scope-agent). Tier = prioridade; plano = profundidade |
| **Nota 3** — `bom` (T3) e a divergência dos dois motores de explosão | idem | **T-11**, mesma solução. `bomService.ts` × `bomStructureProjection.ts` comparados nos casos congelados pelo passo 30 |

---

## 7. Conflito de interesse — resolução nominal (restrição vinculante do escopo §8.3)

Regra: **o autor de um finding preliminar não reexamina o próprio achado como voz
única.** Auditar módulos vizinhos não é vedado; ser voz única sobre o próprio
achado, sim.

| Finding | Autor | Trilha que reexamina | **Titular (≠ autor)** | Papel do autor |
|---|---|---|---|---|
| FIND-ERP-001 (CRITICAL) | `vericore-idempotency-auditor` | T-06, T-07 | `vericore-data-integrity-auditor` (T-06), `vericore-domain-logic-auditor` (T-07) | segunda voz consultiva |
| FIND-ERP-002 (HIGH) | `vericore-audit-log-security-auditor` | T-03 | `vericore-database-auditor` | segunda voz |
| FIND-ERP-005 (CRITICAL) | `vericore-authorization-auditor` | T-09 | `vericore-business-process-auditor` + `vericore-appsec-auditor` | segunda voz |
| FIND-ERP-009 (HIGH) | `vericore-authorization-auditor` | T-09 | idem | segunda voz |
| FIND-ERP-006 (HIGH) | `vericore-business-rule-auditor` | T-12 | `vericore-requirements-auditor` | segunda voz |
| FIND-ERP-007 (MEDIUM) | `vericore-business-rule-auditor` | T-12, T-17 | `vericore-requirements-auditor` (T-12), `vericore-api-auditor` (409×422, T-17) | segunda voz; **e** destinatário do retorno exigido pela APR-2026-020 B.3, em processo paralelo |
| FIND-ERP-008 (HIGH) | `vericore-business-rule-auditor` | T-12 | `vericore-requirements-auditor` | segunda voz |
| **Todos os 7** | — | **T-00** (re-ancoragem) e **T-25** (validação) | **`vericore-finding-validator`** — **autor de nenhum** | — |

Consequências registradas:
1. `vericore-idempotency-auditor`, `vericore-audit-log-security-auditor`,
   `vericore-authorization-auditor` e `vericore-business-rule-auditor`
   **permanecem no fieldwork** — apenas não como titulares das trilhas que
   reexaminam seus próprios achados.
2. `vericore-authorization-auditor` **é titular** de authZ em **T-16** (tier 3),
   onde não é autor de nenhum finding. Restrição aplicada por achado, não por
   pessoa.
3. `vericore-business-rule-auditor` **não é titular** de T-14 (revalidação das 164
   BRs), porque parte dessas BRs fundamenta seus próprios findings; titulares são
   `vericore-business-process-auditor` e `vericore-traceability-auditor`.
4. O `vericore-finding-validator` mantém a validação de CRITICAL/HIGH (Regra 22) —
   posição legítima por não ter autoria em nenhum dos 7.

---

## 8. Evidência dinâmica — fila do `vericore-audit-verification-runner`

Regime `APR-2026-016` / `AUDIT_SCOPE.md` §5, **inviolável**:
nenhuma execução abre conexão com `erp_evok_audio`; evidência dinâmica
**exclusivamente** pelo runner, contra o banco efêmero `erp_evok_audio_test`;
**auditores read-only não executam nada** — enfileiram pedido.

| ID | Pedido | Trilha solicitante | Banco | Justificativa |
|---|---|---|---|---|
| DYN-01 | Reexecutar E1/E2/E3 (§2.1) por auditor, se T-00 quiser prova sob custódia VeriCore | T-00 | nenhum (só `.git`) | independência de cadeia de custódia |
| DYN-02 | Reprodução de escrita concorrente em `POST /api/inventory/movements` e superfícies irmãs | T-06 | `erp_evok_audio_test` | idempotência não se prova por leitura estática |
| DYN-03 | Reprodução de pagamento parcial duplicado (`PayPayable`/`ReceivePayment`) | T-07 | `erp_evok_audio_test` | idem |
| DYN-04 | Sondagem de authZ/alçada: chamada com nível insuficiente e com `role` declarado pelo cliente (Regra 24) | T-09, T-04 | `erp_evok_audio_test` | contornabilidade se prova executando |
| DYN-05 | Extração do schema **efetivo** do banco efêmero para confronto com o schema **declarado** | T-13 | `erp_evok_audio_test` | drift model×coluna é histórico neste repositório |
| DYN-06 | Execução das 9 suítes de caracterização (66 casos) | T-20 | `erp_evok_audio_test` | OBS-INV-03: casos gerados em laço não são auditáveis estaticamente |
| DYN-07 | Execução dos 2 testes unit declarados falhando (OBS-INV-06) | T-20 | nenhum/efêmero | a falha é hoje **declaração de terceiro**, não observação VeriCore (confiança MEDIUM) |
| DYN-08 | `npm ci` + `audit` sobre manifestos, sem rede de produção | T-18 | nenhum | vulnerabilidade de dependência |

Regras da fila: (a) todo pedido é registrado antes da execução, com comando exato;
(b) a saída é persistida pelo `vericore-audit-evidence-controller` em `audit/`;
(c) pedido que exija tocar `erp_evok_audio` é **recusado pelo runner** e escalado a
humano (`AUDIT_SCOPE.md` §5.4 — inspeção de dado real exige aprovação caso a caso,
**nunca por extensão de aprovação anterior**).

---

## 9. Trilhas condicionais de IA — **DISPENSADAS**, com evidência

Decisão registrada: as trilhas `vericore-ai-system-auditor`,
`vericore-llm-security-auditor`, `vericore-rag-auditor`,
`vericore-ai-evaluation-auditor` **NÃO são ativadas** nesta run.

**Evidência coletada nesta sessão (leitura direta no `AUDIT_COMMIT`):**

1. O módulo `intelligentAuditor` (4 endpoints, tier 3) **não contém IA**. Os 4
   use cases (`AuditStockUseCase`, `AuditSalesUseCase`, `AuditPurchasesUseCase`,
   `AuditFinancialUseCase`) são invólucros finos sobre
   `SequelizeIntelligentAuditorRepository`, que executa **consultas Sequelize
   determinísticas** — ex.: `Product.findAll({ where: { quantity: { [Op.lt]: 0 } } })`
   para estoque negativo e um `DISTINCT product_id` em `InventoryMovement` para
   produtos sem movimentação
   (`server/src/modules/intelligentAuditor/infrastructure/sequelize/SequelizeIntelligentAuditorRepository.ts:14-42`).
   **Zero inferência, zero modelo, zero prompt.** O nome é comercial, não técnico.
2. `Grep` por `openai|anthropic|langchain|OPENAI_API|ANTHROPIC_API|embeddings|`
   `completions|chat.completion|vectorStore|pgvector` em **todo** `server/`
   (exceto `node_modules`): **nenhuma ocorrência**.
3. `Grep` por `openai|anthropic|langchain|@google/generative|ai-sdk|huggingface|`
   `transformers` em **todos** os `package.json` do repositório: **nenhuma
   ocorrência**. Nenhum dos 4 projetos Node declara SDK de IA.
4. Não há banco vetorial, coleção de embeddings ou pipeline RAG no schema
   declarado (207 tabelas).

**`vericore-agent-permission-auditor` — também dispensado**, por motivo distinto e
declarado: seu objeto seria `.claude/` (agentes, hooks, skills, settings),
**excluído pela E6→E3** do escopo (`AUDIT_SCOPE.md` §6, exclusão E3: "auditá-lo é
mandato do `vericore-agent-permission-auditor` em run própria, se convocada").
Auditá-lo aqui seria ampliação de escopo sem registro formal.

**Cláusula de reabertura (não é dispensa incondicional):** se **qualquer** trilha
encontrar, no `AUDIT_COMMIT`, chamada a modelo de linguagem, embedding, agente
autônomo ou decisão automatizada não determinística, a trilha **interrompe** e
escala ao director, que reabre as trilhas condicionais por adição ao plano — nunca
por decisão silenciosa do auditor que achou.

---

## 10. Esforço, paralelismo e sequência

| Onda | Trilhas | Esforço (S = sessão de agente auditor) | Paralelismo | Dependência dura |
|---|---|---|---|---|
| W0 | T-00 | 3 S | serial | — |
| W1 | T-01…T-05 | 4+3+4+5+4 = **20 S** | 5 em paralelo | W0 completa |
| W2 | T-06…T-15 | 4+4+2+5+4+4+5+5+6+5 = **44 S** | até 10 em paralelo | W0; **T-04 obrigatoriamente concluída** (mapa authZ) |
| W3 | T-16…T-24 | 5+4+4+4+4+4+3+4+3 = **35 S** | até 9 em paralelo | W0; T-16/T-17 consomem T-04; T-23 consome T-14/T-15 |
| W4 | T-25, T-26 | 4+3 = **7 S** | serial | todas as anteriores |
| **Total** | **27** | **109 S** | — | — |

Notas de sequenciamento:
- **T-04 é o gargalo de W2.** Se atrasar, W2 inicia com authZ não mapeada e
  reproduz exatamente a lacuna que o inventário alertou. Prioridade máxima em W1.
- **T-14 (164 BRs, 6 S) é a trilha mais cara.** Deve iniciar no primeiro instante
  de W2, não no fim.
- **T-15 fecha depois de T-14**, por dependência de conteúdo.
- Escalonamento de CRITICAL é **imediato** e não espera fim de onda (Regra 21).

---

## 11. Critério objetivo de conclusão

### 11.1 Por trilha
Cada trilha declarada em §4 tem seu "**Pronto quando**" próprio. Regra geral,
vinculante para todas: uma trilha só está pronta com (i) todas as células da sua
faixa da `AUDIT_COVERAGE_MATRIX` preenchidas com **COBERTO / AMOSTRAL(declarado) /
RASO(declarado) / NÃO COBERTO(motivo)** — nenhuma célula em branco; (ii) todo
finding com arquivo+linha e requisito/regra citados
(`coretriad/templates/FINDING_TEMPLATE.md`), severidade separada de confiança;
(iii) evidência persistida pelo `vericore-audit-evidence-controller`; (iv)
declaração explícita do que a trilha **não** conseguiu cobrir e por quê.

### 11.2 Da auditoria (autoridade exclusiva do director — Regra 4)
`AUDIT_PASSED` / `FINDINGS_CONFIRMED` só podem ser declarados com:
1. **as 27 trilhas reportadas** — inclusive as que reportarem "nada encontrado";
2. **CRITICAL e HIGH validados** pelo `vericore-finding-validator` (Regra 22);
3. **cobertura demonstrada pela `AUDIT_COVERAGE_MATRIX` executada** — "auditamos
   tudo" sem matriz é declaração inválida por norma;
4. **divergência planejado × executado registrada**, nunca reconciliada por edição
   retroativa deste plano;
5. veredito registrado em `audit/runs/ERP-LEGACY-001-AUD-001/`.

**Este plano não promete `AUDIT_PASSED`.** Um sistema com 0 cadeias de
rastreabilidade completas, 2 CRITICAL abertos e 100% da authZ concentrada em 6
arquivos ainda não auditados tem probabilidade material de terminar em
`FINDINGS_CONFIRMED`. Prometer aprovação antes do fieldwork seria o mesmo erro do
SIM-002, na direção oposta.

---

## 12. GATE HUMANO — o fieldwork NÃO está autorizado

`APR-2026-020` Decisão A termina **exatamente aqui**. `/audit-fieldwork` só roda
após aprovação humana explícita registrada em `coretriad/governance/APPROVALS.md`
(Regra 18: human gate não se aprova por memória nem por inferência).

**Itens que exigem decisão humana explícita — lista objetiva:**

| # | Item | Por que precisa de humano |
|---|---|---|
| **G1** | Aprovar este `AUDIT_PLAN.md` como base do fieldwork | Regra 18; gate previsto na própria APR-2026-020 |
| **G2** | Aprovar a `AUDIT_COVERAGE_MATRIX.md` **planejada**, incluindo as declarações de NÃO COBERTO (§ matriz) | Aceitar cobertura parcial é decisão de risco do dono, não do auditor |
| **G3** | Aprovar as **amostragens declaradas**: 174/261 profundos + 43 rasos no tier 3; ≈40/167 páginas do `client/`; nível B parcial em `rh`/`sst`/`juridico`; `mobile`/`tv` só estrutural | Amostragem é redução de garantia; quem assume o risco residual é o dono |
| **G4** | Autorizar a fila **DYN-01…DYN-08** contra `erp_evok_audio_test` (nenhum pedido toca `erp_evok_audio`) | APR-2026-016; o regime é do dono |
| **G5** | Homologar a **dispensa das trilhas de IA** e do `agent-permission-auditor`, com a cláusula de reabertura do §9 | Dispensa de trilha condicional é decisão de escopo |
| **G6** | Autorizar a **emenda formal ao `AUDIT_SCOPE.md` §2.3** (RA-09), cuja afirmação sobre a baseline é hoje sabidamente incorreta | Alteração de escopo registrado; execução é do `vericore-audit-scope-agent`, autorização é humana |
| **G7** | Confirmar que as **remediações SanaCore em curso** (APR-2026-020 Decisão B) **não entram** nesta auditoria e exigirão **delta audit** (Regra 14) | Convivência de duas frentes sobre o mesmo código; decisão de processo |
| **G8** | Confirmar a **ordem das ondas** e o dimensionamento (109 S), ou determinar redução de escopo — caso em que a redução entra na matriz como NÃO COBERTO, não como silêncio | Trade-off prazo × garantia é do dono |
| **G9** | Reafirmar que **OWNER por área continua sendo atribuição do dono** (APR-2026-019 parte 2) e que T-14 **reporta** lacunas de OWNER sem preenchê-las | Vedação expressa a agente decidir OWNER |

Enquanto G1 não for registrado em `APPROVALS.md`, qualquer início de fieldwork é
**violação de gate**.

---

## 13. Limites de autoridade deste documento

Este plano **não** emite finding de conteúdo, **não** altera o objeto auditado
(Regra 2), **não** altera o escopo (autoridade do `vericore-audit-scope-agent`),
**não** altera tier (decisão humana APR-2026-020), **não** declara `AUDIT_PASSED`,
`FINDINGS_CONFIRMED`, `RETEST_PASSED` ou `FINDING CLOSED` (§11.2 fixa as
condições, nada é declarado aqui), **não** declara `REMEDIATION COMPLETE`
(autoridade SanaCore), **não** autoriza fieldwork (§12) e **não** altera evidência
de auditoria anterior (Regra 15).
