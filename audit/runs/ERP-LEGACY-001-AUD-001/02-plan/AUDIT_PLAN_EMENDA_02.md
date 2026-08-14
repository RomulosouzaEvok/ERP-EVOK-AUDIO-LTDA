# EMENDA-02 ao AUDIT_PLAN — ERP-LEGACY-001-AUD-001

## Adequação da cobertura às condições vinculantes do gate G3 (APR-2026-021)

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (inalterado — Regras 12-14)
EMENDA:        EMENDA-02
DATA:          2026-08-14
EMITIDA POR:   vericore-software-audit-director
AUTORIDADE:    APR-2026-021 Parte A (G3 `APPROVED_WITH_CONDITIONS`, G8 `APPROVED`,
               G10 `CONDITIONAL_APPROVAL`) +
               coretriad/governance/HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md §2 e §3
EMENDA:        AUDIT_COVERAGE_MATRIX.md §4, §5, §6, §7.1, §7.3, §8, §10
               + AUDIT_PLAN.md §4.3, §4.4, §8, §10, §12
NATUREZA:      **ADIÇÃO RASTREÁVEL.** Nenhuma linha do AUDIT_PLAN.md, da
               AUDIT_COVERAGE_MATRIX.md ou da EMENDA-01 foi reescrita, apagada ou
               renumerada. Toda mudança de célula está declarada aqui na forma
               "DE → PARA", com motivo e custo.
ESTADO:        **FIELDWORK PARCIALMENTE LIBERADO** — ver §9. W2 e W3 dependem de
               nova decisão humana (G11, §7).
```

> **Leitura vinculante — cláusula de conjunto.**
> O `AUDIT_PLAN.md`, a `AUDIT_COVERAGE_MATRIX.md`, a `AUDIT_PLAN_EMENDA_01.md` e
> esta `AUDIT_PLAN_EMENDA_02.md` **só são válidos lidos em conjunto**. Nenhum
> deles, isoladamente, descreve a cobertura vigente desta run. Onde houver
> divergência aparente entre eles, prevalece a emenda de numeração mais alta,
> e a divergência é registro obrigatório — nunca conciliação silenciosa.
> O item de gate **G1** passa a ler-se: "aprovar o `AUDIT_PLAN.md`, a
> `EMENDA-01` **e a `EMENDA-02`**".

---

## 0. O que esta emenda é, e o que ela não é

**É:** a adequação da cobertura planejada às condições que o dono impôs ao
aprovar G3, feita **antes** do fieldwork, célula a célula, com o custo real
calculado e apresentado, não absorvido.

**Não é:** fieldwork. Nenhuma trilha executou. Nenhum finding é emitido.
Nenhuma âncora foi adjudicada. Nenhuma linha do objeto auditado foi lida com
propósito de veredito. Nenhum gate é suprido por inferência (Regra 18).

**Não é** redução de escopo para caber no orçamento. A instrução do dono em G8
foi expressa — "não reduzir escopo agora" — e a instrução em G3 é ampliar
cobertura nas categorias vedadas. Quando as duas se encontraram, esta emenda
**não escolheu por conta própria**: cumpriu G3 integralmente, calculou o
excedente e o devolveu ao dono como decisão pendente (§7).

---

## 1. A norma aplicada, transcrita da fonte

`APR-2026-021` Parte A / `HUMAN_GATE_RECORD` §2:

1. **Condição (a)** — amostragem só é autorizada se **baseada em risco**.
2. **Condição (b)** — o **risco residual** deve estar **explicitamente registrado
   no relatório final**.
3. **Vedação** — é **vedada amostragem reduzida** quando o item for crítico ou de
   alto impacto e envolver, **entre outros**: autenticação; autorização;
   segregação de funções; operações financeiras; movimentação de estoque;
   integridade de dados; contratos/jurídico; permissões administrativas;
   operações destrutivas; segurança; multi-tenancy; regras de negócio críticas.
   Nesses casos: **cobertura ampliada ou 100% quando tecnicamente aplicável**.

### 1.1 Interpretação registrada (para que ninguém a reconstrua depois)

| # | Ponto de interpretação | Decisão desta emenda |
|---|---|---|
| I-1 | "entre outros" | A lista é **exemplificativa, não taxativa**. Item não listado que produza o mesmo tipo de dano entra na vedação. Aplicado a: **dado pessoal sensível / LGPD** e **obrigação legal com prazo** (`rh`, `sst`), tratados como categoria vedada por equivalência de dano regulatório |
| I-2 | "crítico ou de alto impacto" | **Todo o tier 1 e todo o tier 2** são, por definição da própria classificação do escopo, "alto impacto". No tier 3, a qualificação é **por endpoint**, não por módulo — daí a regra REG-G3 (§2) |
| I-3 | "cobertura ampliada **ou** 100%" | Onde a superfície é enumerável e a leitura é estática, a saída é **100% (E)**. "Ampliada" é reservada a superfícies onde o 100% depende de recurso indisponível (execução dinâmica, ambiente) — e nesses casos a limitação é declarada, não disfarçada |
| I-4 | "quando tecnicamente aplicável" | Saída legítima, **mas só com justificativa escrita e verificável por terceiro**. **Esforço não é inaplicabilidade técnica.** Nenhuma célula desta emenda invoca I-4 por custo; as 11 invocações estão em §5 e todas têm causa externa (proibição humana superior, exclusão formal de escopo, ausência de ambiente, ou vedação normativa do `CLAUDE.md`) |
| I-5 | Nível **R** (raso) em dimensão vedada | **R é amostragem reduzida por definição** — o próprio §1 da matriz diz que R "nunca pode ser reportado como auditado". Logo, **R em D1 (authN/authZ), D2 (validação de entrada) ou D6 (audit log) é incompatível com G3**. Os 43 endpoints rasos foram elevados por esta razão, e não por discricionariedade |
| I-6 | Dúvida de enquadramento | **In dubio pro cobertura.** Endpoint cuja classificação for disputada entra como **IN-categoria** e recebe cobertura E. A dúvida nunca resolve a favor da amostra |

---

## 2. REG-G3 — a regra de elevação, declarada antes de aplicada

Onde o módulo inteiro está em categoria vedada, a elevação é direta (todo o
módulo → E). Onde o módulo é heterogêneo (tier 3 profundo, front-ends), aplica-se
a **REG-G3**, em quatro passos:

1. **Triagem 100% exaustiva** de todos os endpoints/páginas da superfície,
   classificando cada um como **IN-categoria** ou **OUT-categoria** contra as 12
   categorias do §1 + I-1. A triagem **não é amostral em hipótese alguma** — é a
   parte que torna a amostragem restante legítima. Insumo objetivo: censo de atos
   aprovatórios de T-04 (EMENDA-01 §D.3), mapa authZ dos 681 endpoints, inventário
   de rotas de T-17, `BR_CATALOG.md`.
2. **Todo endpoint IN-categoria recebe E** em D1, D2, D3, D4, D6 — e a semântica
   de suas tabelas entra em D5 exaustivo.
3. **Endpoints OUT-categoria** mantêm a amostragem já declarada, agora
   legitimamente "baseada em risco" (condição a), com **risco residual registrado**
   (condição b, §6).
4. **A lista nominal das duas classes é fixada e anexada ao relatório ANTES da
   análise** — nunca ajustada depois para caber no achado. Regra já vigente na
   matriz §5.1, aqui estendida a toda superfície sob REG-G3.

**Consequência de método:** REG-G3 transfere o esforço da "escolha do que auditar"
para uma triagem verificável. Um terceiro pode refutar a classificação de qualquer
endpoint individualmente — que é exatamente o que uma amostra sem regra não
permite.

---

## 3. Varredura célula a célula — **CÉLULAS ELEVADAS**

Total: **137 células elevadas**. Nenhuma célula foi rebaixada.

### 3.1 `AUDIT_COVERAGE_MATRIX.md` §4 — TIER 2 (20 módulos, 381 endpoints)

#### 3.1.1 D3 e D4 — regra de negócio e integridade transacional

| # | Célula | DE | PARA | Categoria vedada acionada |
|---|---|---|---|---|
| C-01 | `juridico` D3 (75 end.) | **A** (24/75, 32%) | **E — 75/75** | contratos/jurídico; autorização; segregação de funções; alçada |
| C-02 | `juridico` D4 (75 end.) | **A** | **E — 75/75** | integridade de dados em documento com efeito legal |
| C-03 | `rh` D3 (57 end.) | **A** (20/57, 35%) | **E — 57/57** | operações financeiras (folha/rescisão); dado pessoal sensível (I-1); obrigação legal com prazo |
| C-04 | `rh` D4 (57 end.) | **A** | **E — 57/57** | integridade de dados |
| C-05 | `sst` D3 (75 end.) | **A** (24/75, 32%) | **E — 75/75** | regra de negócio crítica (CAT/eSocial S-2210); obrigação legal com prazo (I-1) |
| C-06 | `sst` D4 (75 end.) | **A** | **E — 75/75** | integridade de dados |
| C-07 | `treasury` D3 (11) | **A** | **E** | operações financeiras |
| C-08 | `accounting` D3 (11) | **A** | **E** | operações financeiras; integridade de dados |
| C-09 | `budget` D3 (6) | **A** | **E** | operações financeiras |
| C-10 | `rfq` D3 (7) | **A** | **E** | operações financeiras (compromisso de compra); segregação de funções |
| C-11 | `rfq` D4 (7) | **A** | **E** | integridade de dados |
| C-12 | `suppliers` D3 (6) | **A** | **E** | segregação de funções (aprovação de fornecedor); operações financeiras |
| C-13 | `suppliers` D4 (6) | **A** | **E** | integridade de dados |
| C-14 | `masterProduction` D3 (7) | **A** (E só em firm/release pela EMENDA-01 §F) | **E — 7/7** | ato aprovatório (firm/release com `'operate'` explícito); movimentação de estoque projetada |
| C-15 | `masterProduction` D4 (7) | **A** | **E — 7/7** | integridade de dados |

**Efeito direto:** os **207 endpoints** de `juridico`/`rh`/`sst` passam de
**68 analisados (33%)** para **207 (100%)** em D3 e D4. A "declaração negativa
obrigatória do tier 2" da matriz §4 e a amostragem §5.1 ficam **absorvidas** — ver
§4 (revogação de N-04).

#### 3.1.2 D9 — segurança de aplicação por módulo

"Segurança" é categoria vedada de forma nominal em G3. A matriz tinha **D9 = A**
em 19 dos 20 módulos de tier 2 (todos exceto `accessProfiles`).

| # | Células | DE | PARA |
|---|---|---|---|
| C-16 … C-34 | D9 de `inventory`, `mobileInventory`, `traceability`, `financial`, `treasury`, `accounting`, `budget`, `fiscal`, `juridico`, `purchases`, `purchaseRequisitions`, `rfq`, `suppliers`, `sales`, `mrp`, `production`, `masterProduction`, `rh`, `sst` (**19 células**) | **A** | **E**, por **varredura transversal exaustiva de T-18** sobre 100% dos controllers e rotas dos 20 módulos |

**Mudança de método registrada:** D9 deixa de ser célula amostral por módulo e
passa a ser **superfície transversal com dono único (T-18)**, no mesmo padrão que o
plano §5 já aplicou a authZ (T-04), audit log (T-03) e models (T-13). O motivo é o
mesmo: dimensão fatiada entre 20 trilhas de módulo não tem dono, e é assim que
segurança some de auditoria. Custo correspondente acrescido em §7 — não absorvido.

**Células de tier 2 mantidas amostrais, com risco residual (fora das categorias
vedadas):** D7 (testes), D8 (documentação × código) e D10 (arquitetura). Testes,
documentação e camadas **não são o item de negócio** protegido por G3; são
dimensões de *assurance sobre* o item. Registrado como RES-06/RES-07/RES-08 (§6).

### 3.2 `AUDIT_COVERAGE_MATRIX.md` §7.1 — TIER 3 PROFUNDO (7 módulos, 174 endpoints)

Aplicação de **REG-G3**. Triagem 100% dos 174 endpoints; elevação da fração
IN-categoria.

| # | Células | DE | PARA |
|---|---|---|---|
| C-35 … C-62 | D3, D4, D5, D9 de `facilities` (64), `ti` (47), `marketing` (30), `engineering` (11), `comex` (8), `reports` (8), `workCenters` (6) — **28 células** | **A** | **Triagem 100% (E) + E na totalidade dos endpoints IN-categoria; A no complemento OUT-categoria** |

Enquadramentos já determináveis no plano, registrados agora para que a trilha não
os "descubra":

- **`ti`** — contém **concessão de acesso**, que é um dos 21 pontos de aprovação do
  FIND-ERP-009 e é simultaneamente *autorização* e *permissão administrativa*.
  Toda rota de concessão/revogação de acesso é **IN-categoria por definição**.
- **`comex`** — processos de importação têm efeito **financeiro e fiscal**; a rota
  `POST /api/comex/import-processes/:id/approve` já foi elevada a E pela EMENDA-01
  §F e é **âncora do CAND-AUTHZ-01**. Esta emenda estende: os **8 endpoints** de
  `comex` são integralmente IN-categoria (D3/D4 → **E**, 8/8).
- **`facilities`** — contratos de facilities e ordens com valor são
  contratos/financeiro; triagem obrigatória, sem presunção de que o módulo inteiro
  esteja fora.
- **`reports`** — a verificação de que **não escreve** (nota ¹ da matriz §7.1) é
  agora item **IN-categoria de integridade de dados**: se escrever, é finding, e a
  verificação de não-escrita passa a ser **exaustiva sobre os 8 endpoints**, não
  amostral.
- **`marketing`, `engineering`, `workCenters`** — triagem 100%; elevação da fração
  IN-categoria; complemento permanece A com risco residual RES-03.

### 3.3 `AUDIT_COVERAGE_MATRIX.md` §7.3 — VARREDURA RASA (10 módulos, 43 endpoints)

**Fundamento: I-5.** Nível **R** é, pela definição da própria matriz, cobertura que
"nunca pode ser reportada como auditada". Manter **R em D1 (autenticação e
autorização)**, **R em D2 (validação de entrada → integridade de dados)** e **R em
D6 (audit log → rastreabilidade e integridade)** é exatamente a "amostragem
reduzida" que G3 veda. A superfície é de **43 endpoints** — pequena, enumerável e
integralmente estática. **Tecnicamente aplicável: sim, sem ressalva.**

| # | Células | DE | PARA |
|---|---|---|---|
| C-63 … C-92 | **D1, D2, D6** dos 10 módulos (`clients`, `employees`, `maintenance`, `serviceOrders`, `nonConformities`, `spreadsheetImport`, `intelligentAuditor`, `quality`, `laboratory`, `dashboard`) — **30 células** | **R** | **E — 43/43 endpoints** |
| C-93 … C-122 | **D3, D4, D5** dos mesmos 10 módulos — **30 células** | **N** (N-06 / N-05) | **E — 43/43 endpoints** |
| C-123 … C-132 | **D9** dos mesmos 10 módulos — **10 células** | **N** | **E** — absorvido pela varredura transversal de T-18 (§3.1.2) |

Motivos por módulo, para que a elevação não pareça uniforme por conveniência:

- `spreadsheetImport` — **importação em massa**: operação destrutiva potencial e
  integridade de dados em lote. É a rota de maior risco de dano irreversível de
  todo o tier 3.
- `nonConformities`, `quality`, `laboratory` — decidem **bloqueio/quarentena**, que
  é **movimentação e disponibilidade de estoque** (`quarantineBalanceService.ts`,
  interface com T-06).
- `employees`, `clients` — dado pessoal (I-1) e chave de negócio de RH/vendas.
- `maintenance`, `serviceOrders` — apropriação de custo e consumo de material.
- `intelligentAuditor` — leitura, mas a confirmação de ausência de IA (plano §9,
  gate G5) passa a ser feita sobre cobertura profunda, o que **fortalece** a
  evidência da dispensa em vez de apoiá-la numa varredura rasa.
- `dashboard` — agregação de leitura; elevado por I-6 (in dubio pro cobertura),
  porque agregações expõem, por vazamento de agregado, dado que o usuário não
  poderia ler individualmente (**autorização**).

**Consequência:** a categoria "varredura rasa" **deixa de existir nesta run**. O
tier 3 passa a ser **261/261 (100%) em profundidade de D1/D2/D3/D4/D5/D6**, com
amostragem remanescente apenas em D7/D8/D10.

### 3.4 `AUDIT_COVERAGE_MATRIX.md` §8 — superfícies não-modulares

| # | Célula | DE | PARA | Fundamento |
|---|---|---|---|---|
| C-133 | `client/` — 167 páginas (N-07: 127 não cobertas) | **A ≈40/167 (24%)** | **Triagem estática 100% das 167 páginas** (grep verificável por: consumo de endpoint IN-categoria; condicional de `role`/`permission`/`isAdmin`; ação de exclusão/estorno/cancelamento; formulário de valor) **+ E em 100% das páginas classificadas IN-categoria**; A no complemento | G3: autorização, operações financeiras, operações destrutivas. Condição literal do dono na tarefa: "na medida em que exponham decisão de authZ ou operação financeira/destrutiva" |
| C-134 | `mobile/` (N-08 — só estrutural) | **R** | **E** nos fluxos de **movimentação de estoque** (scan, batch, fila offline, reconciliação), no authN/armazenamento de credencial e na origem do papel no cliente (Regra 24); **R** no restante | G3: movimentação de estoque. O mobile **executa** movimento de estoque via `mobileInventory` |
| C-135 | `tv/` (N-08) | **R** | **Triagem estática 100%** (rotas consumidas, presença de escrita, presença de credencial) **+ E se a triagem encontrar qualquer operação IN-categoria**; se a triagem confirmar superfície somente-leitura sem credencial, permanece **R com justificativa verificável registrada** | G3 + I-4: a inaplicabilidade só pode ser afirmada **depois** da triagem, nunca antes |
| C-136 | Contrato de API (T-17) — semântica profunda | **A** (tiers 1-2 + 174 do tier 3) | **E** — 681/681, por absorção: a semântica profunda passa a cobrir também os 43 antes rasos e a fração IN-categoria do tier 3 | integridade de contrato sobre endpoints IN-categoria |
| C-137 | Models/schema (T-13) — **semântica** de coluna | **A** (só tabelas de tier 1/2) | **E** para todas as tabelas tocadas por endpoint IN-categoria, **incluindo as exclusivas do antigo tier 3 raso** | integridade de dados; absorve N-05 |

**Superfícies §8 mantidas como estão, por já serem E:** `middlewares/` (T-04),
`app.ts` (T-04), `auditLogService.ts` (T-03, estratificação com enumeração
completa), os 16 serviços (T-05), `itemProductMirrorService.ts` /
`fixedAssetReceiptService.ts` (T-05/RA-08, 100% das linhas), censo de atos
aprovatórios (T-04, EMENDA-01 §D.3), CI e infra declarada (T-22), manifestos de
dependência (T-18), re-ancoragem dos 7 findings (T-00, 7/7 E).

**Superfície §8 mantida amostral:** documentação (T-23, ≈90/172) — **fora** das
categorias vedadas; documento não é o item protegido, e a divergência doc×código
que **toca** item vedado já é capturada pela cobertura E do próprio item.
Risco residual RES-07.

### 3.5 Contagem

| Faixa | Células elevadas |
|---|---|
| §4 tier 2 — D3/D4 | 15 |
| §4 tier 2 — D9 | 19 |
| §7.1 tier 3 profundo | 28 |
| §7.3 tier 3 raso | 70 |
| §8 superfícies não-modulares | 5 |
| **TOTAL** | **137** |

---

## 4. Efeito sobre as declarações negativas N-01 … N-16

| ID | Estado após EMENDA-02 |
|---|---|
| **N-04** (139 de 207 endpoints sem D3) | **REVOGADA.** Absorvida por C-01…C-06. Os 207 passam a ter D3 e D4 exaustivos |
| **N-05** (semântica de coluna de tabelas do tier 3 raso) | **REVOGADA.** Absorvida por C-137 |
| **N-06** (regra de negócio nos 43 endpoints rasos) | **REVOGADA.** Absorvida por C-93…C-122 |
| **N-07** (127 de 167 páginas do `client/`) | **REDUZIDA e recondicionada.** Deixa de ser um número fixo e passa a ser o **complemento OUT-categoria** da triagem de C-133. O número final é **medido no fieldwork**, não prometido aqui. Toda página IN-categoria sai de N-07 |
| **N-08** (`mobile`/`tv` só estrutural) | **REDUZIDA.** `mobile`: fluxos de estoque, authN e origem de papel saem de N-08 (C-134). `tv`: permanece condicionada à triagem (C-135) |
| **N-01, N-02, N-03, N-09, N-10, N-11, N-12, N-13, N-14, N-15, N-16** | **MANTIDAS** — justificadas em §5 |

**Revogar N-04, N-05 e N-06 é aumento de promessa.** É exatamente o movimento que a
lição do SIM-002 manda vigiar. A justificativa de sustentabilidade é a mesma da
EMENDA-01 §F e vale aqui de forma ainda mais estrita: **o esforço correspondente
foi calculado e acrescido (§7), não absorvido**. Promessa maior sem esforço maior
seria a promessa vazia que custou o `AUDIT_PASSED` do SIM-002.

---

## 5. Células **NÃO** elevadas — justificativa de inaplicabilidade técnica (I-4)

Onze declarações negativas recaem, no todo ou em parte, em categorias vedadas por
G3 e **não** foram elevadas. Cada uma tem causa **externa e verificável**. Nenhuma
invoca esforço.

| ID | Categoria G3 tocada | Por que é **tecnicamente inaplicável** — causa externa e verificável |
|---|---|---|
| **N-01** — execução/inspeção contra `erp_evok_audio` | integridade de dados; segurança | **Proibição humana de hierarquia superior**, não limitação do auditor: `APR-2026-016` + `APR-2026-021` Parte D institui regime read-only reforçado permanente, e `AUDIT_SCOPE.md` §5.4 exige aprovação caso a caso, **nunca por extensão**. G3 não revoga `APR-2026-016`; aprovação posterior não amplia aprovação anterior. Elevar esta célula seria violar decisão humana vigente |
| **N-02** — exclusões E1-E10 | várias | **Exclusão formal de escopo** registrada em `AUDIT_SCOPE.md` §6. Escopo é autoridade do `vericore-audit-scope-agent` + decisão humana; **um plano não amplia o próprio escopo** (`AUDIT_PLAN.md` §13). Auditar aqui seria ampliação sem registro |
| **N-03** — conteúdo dos 3 arquivos `.local.txt` de credencial | **segurança** (nominal em G3) | Abrir o conteúdo é **violação de escopo E6** e, materialmente, seria a própria VeriCore lendo credencial viva. **A cobertura possível já é exaustiva**: a **existência** dos três arquivos está 100% coberta e é suficiente para fundamentar finding de gestão de segredos. Não há garantia adicional obtenível pela leitura do conteúdo — só risco adicional |
| **N-09** — pentest, DAST, fuzzing | **segurança** (nominal em G3) | **Fora do mandato** da `APR-2026-020` (que autorizou o passo 31 pelo fluxo VeriCore estático/dirigido) e **sem ambiente**: exigiria alvo executando, e o único banco disponível é o efêmero, cuja própria fila dinâmica está bloqueada por **G4 aberto**. Não é limitação de esforço: é ausência de ambiente autorizado. **Escalado como risco residual de primeira ordem — RES-01** |
| **N-10** — carga, performance, capacidade | — (fora das categorias) | Exigiria dado real ou massa equivalente; **N-01 impede**. Não toca categoria vedada |
| **N-11** — licenças transitivas em `node_modules` | segurança (parcial) | `node_modules` está **excluído (E5)** e não é versionado — não é objeto auditável no `AUDIT_COMMIT`. A superfície **versionada** (manifestos + lockfiles) está em **E**. A dimensão de **vulnerabilidade** transitiva depende de DYN-08, hoje bloqueada por **G4** — registrada em RES-02, não silenciada |
| **N-12** — comportamento em operação real | — | **Não existe ambiente de produção separado** (`PRODUCTION_STATUS_MAP.md`, checklist de Go-Live "NO-GO"). Infra é auditada **como declarada**. Impossibilidade de fato, verificável |
| **N-13** — alterações posteriores ao `AUDIT_COMMIT` (remediações SanaCore) | todas, potencialmente | **Vedação normativa direta**: Regras 12-14 do `CLAUDE.md`. Auditar código posterior ao `AUDIT_COMMIT` **dentro** desta run destruiria a imutabilidade que fundamenta o próprio veredito. Exige **delta audit** — que é matéria de **G7, aberto** (§8.4) |
| **N-14** — trilhas de IA e `agent-permission-auditor` | segurança (potencial) | Dispensa **com evidência técnica** (plano §9: zero SDK de IA em 4 `package.json`, zero ocorrência de grep em todo `server/`, zero banco vetorial em 207 tabelas) + **cláusula de reabertura**. O objeto do `agent-permission-auditor` é `.claude/`, **excluído por E3**. Homologação é **G5, aberto** (§8.3) — a dispensa permanece **provisória**, não confirmada |
| **N-15** — correção de defeito | — | **Regra 2 do `CLAUDE.md`.** VeriCore nunca corrige o objeto auditado. Inaplicabilidade normativa absoluta |
| **N-16** — OWNER por área das BRs | — | **Vedação expressa** de `APR-2026-019` parte 2, reafirmada por `APR-2026-020` e por **G9 SATISFEITO** em `APR-2026-021` Parte E: vedado a agente decidir ou inferir OWNER. T-14 **reporta** a lacuna |

**Contagem: 11 células/declarações justificadas como tecnicamente inaplicáveis**,
das quais **6 tocam categorias vedadas por G3** (N-01, N-03, N-09, N-11, N-13,
N-14) e por isso receberam justificativa individual acima **e** entrada obrigatória
no registro de risco residual (§6).

---

## 6. Registro de risco residual — cumprimento da condição (b) de G3

A condição (b) exige que o risco residual esteja **explicitamente registrado no
relatório final**. Isto **não** é satisfeito por esta emenda: é satisfeito no
relatório. Esta emenda **cria a obrigação e a lista mínima**, e a torna critério de
conclusão da run.

**Vinculante — adição ao `AUDIT_PLAN.md` §11.2:** o `AUDIT_PASSED` /
`FINDINGS_CONFIRMED` passa a exigir, como **6º requisito**, a presença no relatório
final de uma seção **`RISCO RESIDUAL (condição G3-b)`** contendo, no mínimo, os
itens abaixo, cada um com: o que não foi coberto, por quê, qual dano é possível se
houver defeito ali, e quem assume o risco (o dono, por G3).

| ID | Risco residual de registro obrigatório |
|---|---|
| **RES-01** | **Nenhuma verificação dinâmica de segurança** (pentest/DAST/fuzzing) — N-09. Defeito explorável só detectável dinamicamente **não seria encontrado por esta auditoria** |
| **RES-02** | **Vulnerabilidade de dependência transitiva não medida** se DYN-08 não for autorizada (G4) — N-11 |
| **RES-03** | **Fração OUT-categoria do tier 3 profundo** (§3.2) em D3/D4/D5 — número nominal medido no fieldwork, nunca estimado no relatório |
| **RES-04** | **Fração OUT-categoria das 167 páginas do `client/`** (§3.4, C-133) — sucessora recondicionada de N-07 |
| **RES-05** | **`tv/` e a fração OUT-categoria de `mobile/`** (C-134/C-135) — sucessora recondicionada de N-08 |
| **RES-06** | **D7 (testes) amostral em tier 2/3** — a *efetividade* das asserções não é medida em 100% |
| **RES-07** | **D8 (documentação × código) amostral** — ≈90/172 documentos |
| **RES-08** | **D10 (arquitetura) amostral** em parte do tier 2/3 |
| **RES-09** | **Conteúdo dos arquivos de credencial não lido** (N-03) — credencial fraca ou reutilizada **não seria detectada** |
| **RES-10** | **Estado do banco real não observado** (N-01) — divergência entre schema declarado e banco `erp_evok_audio` **não é observável nesta run**; a auditoria fala do código e do schema declarado, não do dado |
| **RES-11** | **Toda a evidência dinâmica** (DYN-01…DYN-08), **se G4 permanecer aberto** — ver §8.1, com a colisão G3 × G4 registrada |
| **RES-12** | **Código posterior ao `AUDIT_COMMIT`** (remediações SanaCore em curso) — N-13/G7. O veredito desta run **não diz nada** sobre o estado remediado |
| **RES-13** | **Dispensa das trilhas de IA não homologada** (N-14/G5) — provisória |

---

## 7. **G11 — NOVO ITEM DE GATE: o esforço estourou o teto de G8**

### 7.1 O cálculo, trilha a trilha

G8 aprovou `AUDIT_SESSIONS = 110` **e** determinou "não reduzir escopo". A
adequação a G3 exige **34 sessões adicionais**. Elas **não foram absorvidas** e
**não foi cortada uma célula sequer** para caber.

| Trilha | Base (pós-EMENDA-01) | Delta | Novo | Causa do delta |
|---|---|---|---|---|
| T-00 | 3 | — | 3 | — |
| T-01 | 4 | — | 4 | já 100% E |
| T-02 | 3 | — | 3 | já 100% E |
| T-03 | 4 | — | 4 | já 100% E / estratificação |
| T-04 | 6 | — | 6 | já elevada pela EMENDA-01 (censo) |
| T-05 | 4 | — | 4 | já 100% E |
| T-06 | 4 | — | 4 | já E nas dimensões vedadas |
| **T-07** | 4 | **+2** | **6** | C-07/C-08/C-09 — D3 exaustivo em `treasury`/`accounting`/`budget` (28 end.) |
| T-08 | 2 | — | 2 | já exaustivo |
| **T-09** | 5 | **+4** | **9** | C-01/C-02 — `juridico` D3+D4 de 24 para **75 endpoints** |
| **T-10** | 4 | **+1** | **5** | C-10…C-13 — `rfq` + `suppliers` D3/D4 exaustivos |
| **T-11** | 4 | **+1** | **5** | C-14/C-15 — `masterProduction` D3/D4 exaustivos |
| **T-12** | 5 | **+6** | **11** | C-03…C-06 — `rh` (57) + `sst` (75) D3+D4 de 44 para **132 endpoints** |
| **T-13** | 5 | **+2** | **7** | C-137 — semântica de coluna estendida às tabelas do antigo tier 3 raso |
| T-14 | 6 | — | 6 | 164 BRs já exaustivo |
| T-15 | 5 | — | 5 | — |
| **T-16** | 5 | **+6** | **11** | REG-G3: triagem 100% dos 174 + elevação IN-categoria (§3.2) **e** os 43 antes rasos elevados a profundos (§3.3) |
| **T-17** | 4 | **+1** | **5** | C-136 — semântica profunda estendida a 681/681 |
| **T-18** | 4 | **+3** | **7** | C-16…C-34 + C-123…C-132 — D9 vira varredura transversal exaustiva sobre 30 módulos |
| T-19 | 4 | — | 4 | D10 permanece amostral (RES-08) |
| T-20 | 4 | — | 4 | D7 permanece amostral (RES-06) |
| **T-21** | 4 | **+6** | **10** | C-133/C-134/C-135 — triagem 100% de 167 páginas + profundidade IN-categoria + fluxos de estoque do `mobile` |
| T-22 | 3 | — | 3 | — |
| T-23 | 4 | — | 4 | D8 permanece amostral (RES-07) |
| T-24 | 3 | — | 3 | — |
| **T-25** | 4 | **+1** | **5** | volume de findings esperado cresce com a cobertura |
| **T-26** | 3 | **+1** | **4** | matriz executada muito maior; triagens nominais a conciliar |
| **TOTAL** | **110** | **+34** | **144** | |

Por onda: **W0 = 3 S** (inalterada) · **W1 = 21 S** (inalterada) · **W2 = 44 → 60 S**
· **W3 = 35 → 51 S** · **W4 = 7 → 9 S**.

### 7.2 O item de gate

| # | Item | Natureza |
|---|---|---|
| **G11** | **Decidir o dimensionamento revisado: `AUDIT_SESSIONS` 110 → 144.** Três saídas, todas legítimas e nenhuma tomável por este director: **(a)** **aprovar 144 S** e manter integralmente a conformidade com G3 (recomendação técnica registrada abaixo); **(b)** **manter 110 S** e determinar **quais** células voltam a ser amostrais — hipótese em que o dono estará **relaxando a própria condição de G3**, o que só ele pode fazer, e a redução entra na matriz como **exclusão explícita com risco residual nominal**, jamais como silêncio; **(c)** **aprovar por etapas** — liberar W0+W1 (24 S, **integralmente dentro das 110 já aprovadas e não afetadas pela elevação**) e decidir W2/W3 depois, com a triagem de REG-G3 já em mãos e o número real medido em vez de estimado | **Decisão humana pura.** É trade-off prazo × garantia (fundamento original de G8) **e** grau de exigência da própria condição de G3. O director **não** absorve o delta em silêncio (seria prometer cobertura sem lastro — erro do SIM-002 na direção 1) e **não** corta cobertura para caber (seria entregar menos do que o gate exigiu — erro do SIM-002 na direção 2) |

**Recomendação técnica do director (não é decisão — Regra 6):** opção **(c)**.
Ela permite iniciar imediatamente as 24 sessões de W0+W1 — que cobrem **tier 1,
PRODUÇÃO REAL, prioridade nº 1 fixada pelo dono em `APR-2026-020` Decisão A** e
**estão inalteradas por esta emenda** — e devolve a decisão de W2/W3 já instruída
pela triagem REG-G3, com contagem nominal em vez de estimativa. A estimativa de 34 S
é honesta, mas é estimativa; a opção (c) substitui estimativa por medida antes de
comprometer o dono com um número.

---

## 8. Efeito registrado dos gates que permanecem ABERTOS

### 8.1 **G4 aberto** — a fila dinâmica DYN-01…DYN-08

| Pedido | Trilhas dependentes | O que a evidência dinâmica prova | Substituição estática é possível? |
|---|---|---|---|
| **DYN-01** (reexecutar E1/E2/E3, só `.git`) | T-00 | independência da cadeia de custódia | **SIM, com perda declarada.** A evidência já existe (`AUDIT_PLAN.md` §2.1), com autoria e reprodutibilidade declaradas. Perde-se apenas a custódia VeriCore, não o fato. **Não colide com G3** — `.git` não é dado do produto |
| **DYN-02** (duplicidade concorrente em `POST /api/inventory/movements`) | **T-06** | idempotência sob concorrência | **NÃO.** Leitura estática mostra ausência de lock/UNIQUE; **não prova** que a duplicidade ocorre. **Categoria: movimentação de estoque + integridade de dados** |
| **DYN-03** (pagamento parcial duplicado) | **T-07** | idem, em saldo financeiro | **NÃO.** **Categoria: operações financeiras** |
| **DYN-04** (sondagem de authZ/alçada, nível insuficiente, `role` declarado — Regra 24; ampliado pela EMENDA-01 §E.5 para `purchases` e `comex`) | **T-04, T-09, T-10** | **contornabilidade** do controle de autorização | **NÃO.** Contornabilidade se prova executando. **Categoria: autenticação, autorização, segregação de funções, permissões administrativas** — quatro categorias vedadas simultaneamente |
| **DYN-05** (schema efetivo × declarado) | **T-13** | drift model × coluna | **PARCIALMENTE.** O schema **declarado** é auditável 100% estaticamente; o **efetivo** não. **Categoria: integridade de dados** |
| **DYN-06/07** (9 suítes de caracterização; 2 testes falhando) | **T-20** | efetividade real dos testes; OBS-INV-03 (66 casos gerados em laço) e OBS-INV-06 | **NÃO** para os casos gerados em laço — o próprio inventário registra que **não são auditáveis estaticamente**. **Fora** das categorias vedadas (testes são assurance sobre o item) → colisão com G3 **não** ocorre; vira RES-06 |
| **DYN-08** (`npm ci` + `audit`) | **T-18** | vulnerabilidade conhecida de dependência | **NÃO.** **Categoria: segurança** → RES-02 |

#### A colisão registrada: **CONFLITO-G3×G4**

> **G3 veda amostragem reduzida em movimentação de estoque, operações
> financeiras, autorização, segregação e integridade de dados. G4 aberto retira
> justamente a evidência que essas categorias exigem.** Substituir DYN-02, DYN-03,
> DYN-04 e a metade dinâmica de DYN-05 por leitura estática **é**, pela definição da
> própria matriz, uma **declaração de cobertura reduzida** — e cobertura reduzida
> nessas categorias é exatamente o que G3 proíbe.

**Não há saída que o director possa tomar sozinho.** As duas condições vêm da mesma
autoridade e se contradizem no caso concreto (Regra 21: contradição entre fontes
interrompe a decisão e exige determinação da fonte autoritativa). Efeito prático,
registrado:

1. **T-06, T-07, T-09, T-04, T-10, T-13 podem INICIAR** — a parte estática é
   substancial e independente.
2. **Não podem FECHAR.** O "Pronto quando" de T-06 exige classificação de
   idempotência **provada**; o de T-09 exige contornabilidade **verificada**. Sem
   DYN, essas trilhas terminam em estado **`READY_TO_CLOSE_BLOCKED_BY_G4`**, que
   esta emenda cria como estado explícito — **não** em "concluída com ressalva".
3. **Nenhuma trilha declara conformidade com G3 por leitura estática nessas
   dimensões.** Declarar seria a promessa vazia do SIM-002.
4. Se G4 for **negado** (e não apenas não respondido), a consequência é
   **RES-11 elevado a limitação de primeira ordem do veredito**, com registro de
   que **as condições de G3 não puderam ser integralmente cumpridas por decisão
   humana superveniente** — e isso, por si, pode ser motivo para o veredito final
   não ser `AUDIT_PASSED`.

### 8.2 **G6 aberto** — `AUDIT_SCOPE.md` §2.3 permanece com afirmação sabidamente incorreta

**O fato:** o `AUDIT_SCOPE.md` §2.3 afirma que a tag `legacy-baseline-001`
(`c9359be`) representa o código auditado. O `AUDIT_PLAN.md` §2.1/§3.1 **provou** que
é falso: `3dee99f` alterou 8 arquivos de `server/src` **depois** da tag e **antes**
do discovery (E2/E3). RA-09 corrigiria o escopo por adição rastreável; **G6 aberto
impede**, porque `AUDIT_SCOPE.md` é do `vericore-audit-scope-agent` e a alteração de
escopo registrado exige autorização humana.

**Risco prático, em três níveis:**

1. **Risco de leitura errada — baixo, e mitigado aqui.** Uma trilha que tomasse
   §2.3 como referência leria um sistema que **não é o auditado**. Mitigação
   vinculante, dentro do namespace que este director de fato possui:

   > **Instrução de leitura vinculante para todas as 27 trilhas:** a **única**
   > referência de leitura desta run é o `AUDIT_COMMIT`
   > `c1311a6f76b512fef893f7e60d934179cae3409f`. A tag `legacy-baseline-001` /
   > `c9359be` **não é referência de leitura** e não pode ser citada como tal em
   > nenhuma evidência. Toda citação arquivo+linha é conferida no `AUDIT_COMMIT`.
   > Trilha que citar `c9359be` como estado do código auditado tem a evidência
   > **rejeitada** por T-26.

2. **Risco de contradição documental — real e não mitigável sem G6.** A run passa a
   ter um **artefato versionado oficialmente incorreto** (`AUDIT_SCOPE.md` §2.3)
   convivendo com artefatos que o contradizem. Pela **Regra 7**, artefato versionado
   é a fonte oficial de verdade; pela **Regra 21**, contradição entre documento e
   evidência interrompe a decisão. Um leitor externo — auditor de delta, terceiro,
   ou o próprio dono no futuro — que ler **apenas** o `AUDIT_SCOPE.md` será
   induzido a erro. **Isso é um defeito na cadeia de evidência da própria
   auditoria**, e vai para o relatório final como tal, não como nota de rodapé.

3. **Trilha comprometida: nenhuma; trilha onerada: T-00.** Nenhuma trilha fica
   **impedida** de executar, porque a correção material (re-ancoragem dos 7
   findings, RA-01…RA-07) é **interna a T-00** e não depende de G6. O que G6 bloqueia
   é a **correção do documento de escopo**, não a auditoria. T-00 passa a ter de
   registrar, em cada um dos 7 vereditos de re-ancoragem, a nota de que o escopo
   vigente contradiz o resultado — trabalho adicional que a emenda formal
   eliminaria. **Não há aumento de sessão por isso** (cabe nas 3 S de T-00).

**Registro final:** `RA-09` permanece **PENDENTE — BLOQUEADA POR G6**. Esta emenda
**não** corrige o `AUDIT_SCOPE.md` (não é seu namespace nem sua autoridade) e
**não** supre G6 por inferência.

### 8.3 **G5 aberto** — dispensa das trilhas de IA e do `agent-permission-auditor`

**Efeito: nenhuma trilha bloqueada; a dispensa fica PROVISÓRIA.**

1. As 4 trilhas de IA e o `agent-permission-auditor` **permanecem não ativadas**,
   com a evidência técnica do plano §9 intacta e **reforçada** por esta emenda:
   `intelligentAuditor` sai de varredura rasa para cobertura profunda (§3.3), o que
   converte a confirmação "não usa IA" de asserção rasa em **verificação exaustiva
   de 4 endpoints**. A dispensa fica **mais** defensável do que estava.
2. **A cláusula de reabertura do §9 permanece integralmente em vigor** e não depende
   de G5: qualquer trilha que encontre chamada a modelo de linguagem, embedding,
   agente autônomo ou decisão não determinística **interrompe e escala ao director**.
3. **Risco residual RES-13:** se o dono **negar** a homologação depois do fieldwork,
   a run terá de ser **estendida por adição** (novas trilhas) ou terminará com
   limitação de escopo declarada. Custo hoje **não orçado** — a ativação das 4
   trilhas de IA + `agent-permission-auditor` seria estimativa nova, e o
   `agent-permission-auditor` esbarra adicionalmente na exclusão E3 (`.claude/`),
   que é matéria de escopo, não de plano.
4. **N-14 permanece MANTIDA** (§5), com o rótulo explícito **"dispensa com evidência,
   sem ratificação humana"**.

### 8.4 **G7 aberto** — tratamento do código remediado pela SanaCore

**Este é o gate aberto de maior risco de contaminação da run.**

O contexto é concreto, não hipotético: a `APR-2026-021` Parte C **autorizou a
SanaCore a executar** a remediação de `FIND-ERP-001` e `FIND-ERP-005` (CASE-001 e
CASE-002) **agora**, em paralelo ao fieldwork. Logo, **haverá commits novos sobre o
mesmo código, durante a auditoria**. O que G7 decidiria — que essas mudanças não
entram nesta run e exigem delta audit — é justamente o que **não** está decidido.

**Efeito prático, registrado:**

1. **Risco de falso negativo por leitura de HEAD.** Uma trilha que lesse `HEAD` em
   vez do `AUDIT_COMMIT` poderia não encontrar um defeito **porque ele já foi
   corrigido**, e reportar ausência de defeito onde havia defeito no objeto
   auditado. Mitigação: a mesma instrução de leitura vinculante de §8.2 — **o
   `AUDIT_COMMIT` é a única referência**. Esta é agora a **segunda** razão
   independente para essa instrução, e ela vale mesmo que G6 e G7 sejam ambos
   respondidos.
2. **A premissa de §2.1 do plano degrada com o tempo.** O comando E1
   (`git diff --stat AUDIT_COMMIT..HEAD` vazio) foi verdadeiro em 14/08. Com a
   SanaCore executando, **deixará de ser**. Isso **não** invalida a auditoria — o
   `AUDIT_COMMIT` é imutável (Regras 12-13) — mas invalida qualquer atalho futuro
   do tipo "ler o working tree equivale a ler o commit". **Adição vinculante:**
   a equivalência declarada em `AUDIT_PLAN.md` §2.2 (fechamento de **L2**) vale
   **exclusivamente enquanto E1 permanecer vazio**. A partir do primeiro commit
   SanaCore, **L2 reabre** e toda leitura passa a exigir `git show
   c1311a6f:<arquivo>` ou worktree do `AUDIT_COMMIT`, nunca o working tree.
   **T-00 deve reexecutar E1 no início do fieldwork e registrar o resultado.**
3. **Efeito sobre o veredito, não sobre a execução.** N-13 permanece mantida (§5).
   A consequência é que esta run **não poderá dizer nada** sobre o estado remediado:
   nenhum `RETEST_PASSED` e nenhum `FINDING CLOSED` de `FIND-ERP-001` ou
   `FIND-ERP-005` pode sair desta run, porque o reteste teria de ocorrer sobre um
   commit **posterior** ao `AUDIT_COMMIT` — o que é, por definição, **delta audit**
   (Regras 4 e 14). Isso é consequência normativa direta, **não** decisão deste
   director, e vale independentemente de G7 ser respondido; o que G7 daria é o
   **registro humano** de que essa é a leitura correta, evitando que a questão
   ressurja no fim da run — que foi exatamente o que aconteceu no SIM-002, cujo
   `AUDIT_PASSED` caiu por delta audit não resolvido.
4. **Nenhuma trilha fica bloqueada por G7.** RES-12 registra o risco.

---

## 9. `CAND-AUTHZ-01` sob G10 — conformidade da EMENDA-01 e o ajuste faltante

**Decisão do dono (G10, `CONDITIONAL_APPROVAL`):** o candidato entra no fieldwork
como **candidato/provisório**, para investigação e coleta de evidência; **não**
implica confirmação da regra, promoção a requisito confirmado, aprovação do
comportamento, alteração de owner nem aceitação de divergência.

### 9.1 Conferência item a item da EMENDA-01

| Item da decisão do dono | EMENDA-01 | Conforme? |
|---|---|---|
| Entra como candidato/provisório | §C: `STATUS: CANDIDATO — NÃO PROMOVIDO` | **SIM** |
| Sem confirmação automática | §C.1 "sem promoção por analogia" | **SIM** |
| Sem promoção automática | §C.2 — duas vias, ambas exigindo ato próprio (decisão humana registrada **ou** emissão pela auditoria com validação da Regra 22) | **SIM** |
| Sem severidade/confiança pré-julgadas | §C: ambas "não atribuída" | **SIM** |
| Sem aprovação do comportamento | §C.3 — refutação é resultado válido e registrável | **SIM** |
| Sem alteração de owner | EMENDA-01 não toca owner | **SIM** |
| Sem aceitação de divergência | §A (Regra 20 preventiva: prevalece evidência VeriCore) e §B.4 (conclusão SanaCore sobre a Regra 24 **não** adotada) | **SIM** |
| Entra no fieldwork para investigação | §D.1, §E.1, §E.2, §E.3 — âncoras distribuídas a T-04, T-09, T-10, T-11 com instrução de **confirmar ou refutar** | **SIM** |

**A EMENDA-01 está em conformidade com G10 em todos os oito pontos.** Não há
reescrita a fazer.

### 9.2 Três ajustes por adição (o que faltava)

**AJ-1 — status formal atualizado.** A EMENDA-01 §C registrou o candidato quando
G10 ainda **não** tinha resposta. Agora tem. Registro aditivo:

```
CANDIDATO:   CAND-AUTHZ-01
STATUS:      **CANDIDATO PROVISÓRIO — ENTRADA NO FIELDWORK AUTORIZADA**
             por APR-2026-021 Parte A (G10, CONDITIONAL_APPROVAL)
SEVERIDADE:  não atribuída        CONFIANÇA: não atribuída
PROMOÇÃO:    **NÃO AUTOMÁTICA.** Depende de evidência VeriCore própria no
             AUDIT_COMMIT + validação do vericore-finding-validator (Regra 22),
             ou de nova decisão humana registrada em APPROVALS.md
REGISTRO:    audit/runs/ERP-LEGACY-001-AUD-001/02-plan/AUDIT_PLAN_EMENDA_01.md §C
             (definição) + esta EMENDA-02 §9 (status sob G10)
```

**AJ-2 — a opção (c) da EMENDA-01 §G NÃO foi escolhida.** A EMENDA-01 apresentou
três opções e recomendou tecnicamente a **(c)** (promover condicionado, **com a
SanaCore instruída a desenhar a correção do FIND-ERP-005 de forma copiável desde
já**). A decisão do dono é **candidato/provisório sem promoção** — materialmente a
opção **(b)**. Registro expresso, para que a recomendação não seja confundida com
autorização: **a instrução à SanaCore de desenhar correção copiável NÃO foi
autorizada e NÃO é emitida.** Ela também não seria emitível por este director —
desenho de correção é autoridade SanaCore (Regra 3) e instruir remediação não é
matéria de plano de auditoria.

**AJ-3 — colisão com G4, registrada.** A EMENDA-01 §E.5 ampliou **DYN-04** para
sondar `POST /api/purchases/:id/approve` e
`POST /api/comex/import-processes/:id/approve` com perfil `diretor: 'operate'`.
**DYN-04 está bloqueada por G4.** Consequência: a verificação de `CAND-AUTHZ-01`
será **estática-apenas** enquanto G4 estiver aberto — as 3 âncoras A1/A2/A3 podem
receber veredito **CONFIRMADA / REFUTADA / PREJUDICADA** por leitura de código, mas
a **contornabilidade efetiva** em módulo de **PRODUÇÃO** não. Isso recai
integralmente no **CONFLITO-G3×G4** (§8.1) — autorização e permissão administrativa
são categorias vedadas. **RES-11 cobre.**

---

## 10. Estado do fieldwork após esta emenda

```
[X] 00-scope     — SCOPE_REGISTERED (com defeito conhecido em §2.3 — RA-09 bloqueada por G6)
[X] 01-inventory — L1/L2 fechadas; L2 REABRE ao primeiro commit SanaCore (§8.4.2)
[X] 02-plan      — AUDIT_PLAN.md + MATRIX + EMENDA-01 + **EMENDA-02** (leitura conjunta obrigatória)
[X] GATE HUMANO  — G1 G2 G9 SATISFEITOS · G3 APPROVED_WITH_CONDITIONS (atendido por esta emenda)
                   G8 APPROVED (110) · G10 CONDITIONAL_APPROVAL
[ ] GATE HUMANO  — G4 G5 G6 G7 **ABERTOS** · **G11 NOVO** (110 → 144 S)
[~] fieldwork    — **PARCIALMENTE LIBERADO**
       W0 (T-00) ................ **LIBERADO**
       W1 (T-01…T-05) ........... **LIBERADO**, com T-04 sem fechamento pleno (G4)
       W2 (T-06…T-15) ........... **RETIDO** — aguarda G11; e não fecha sem G4
       W3 (T-16…T-24) ........... **RETIDO** — aguarda G11
       W4 (T-25, T-26) .......... depende das anteriores
```

### 10.1 Por que W0 e W1 podem começar

1. **G1 está SATISFEITO** — condição dura do `AUDIT_PLAN.md` §12.
2. **Nenhuma célula de W0/W1 foi alterada por esta emenda.** Tier 1 já era
   **100% E em 10/10 dimensões**, sem uma única célula amostral — logo, **W1 já
   nascia em conformidade com G3** e a adequação não a tocou. Isto é verificável:
   nenhuma das 137 células elevadas pertence a T-00…T-05.
3. **Custo de W0+W1 = 24 S**, integralmente dentro das **110 S já aprovadas em G8**.
   Iniciar não consome orçamento não autorizado.
4. **É a prioridade nº 1 fixada pelo dono** em `APR-2026-020` Decisão A:
   **PRODUÇÃO REAL primeiro** — `items`, `categories`, `departments`, `users`,
   `auth`, `auditLogs`.
5. **T-04 é o gargalo declarado de W2** (`AUDIT_PLAN.md` §10). Atrasá-la atrasa tudo,
   e seu núcleo — mapa authZ dos 681 endpoints + censo dos ~55 atos aprovatórios —
   é **integralmente estático**.

### 10.2 Restrições vinculantes para W0/W1

1. **Referência de leitura única:** `AUDIT_COMMIT c1311a6f...`. Citação de
   `c9359be` como estado do código auditado é evidência rejeitada (§8.2).
2. **T-00 reexecuta E1** e registra se `HEAD` já divergiu (§8.4.2).
3. **DYN-01 não é executada** — G4 aberto. T-00 usa a evidência de §2.1 do plano com
   a custódia declarada, e **registra** a substituição.
4. **T-04 encerra em `READY_TO_CLOSE_BLOCKED_BY_G4`** quanto à contornabilidade e à
   sondagem da Regra 24; a parte estática fecha normalmente.
5. **Regime `APR-2026-016` inviolável:** nenhuma conexão a `erp_evok_audio`, nenhuma
   execução, nenhuma inspeção de dado real. W1 é **tier 1 = PRODUÇÃO REAL**; é
   precisamente onde o regime é mais estrito.
6. **Escalonamento imediato de CRITICAL** (Regra 21), no momento em que surge.

---

## 11. O que esta emenda **não** faz

1. **Não autoriza W2 nem W3** — dependem de G11 (§7.2).
2. **Não supre G4, G5, G6 nem G7 por inferência** (Regra 18).
3. **Não corrige o `AUDIT_SCOPE.md`** — RA-09 é do `vericore-audit-scope-agent`,
   autorizada por G6, que está aberto.
4. **Não promove `CAND-AUTHZ-01`** nem atribui severidade ou confiança.
5. **Não adjudica** nenhuma âncora, nenhum finding, nenhuma BR.
6. **Não altera** o `AUDIT_COMMIT`, o tier de nenhum módulo, as exclusões E1-E10,
   nem a titularidade fixada em §7 do plano (conflito de interesse).
7. **Não emite finding**, não declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`,
   `RETEST_PASSED` nem `FINDING CLOSED`.
8. **Não reescreve** uma linha do `AUDIT_PLAN.md`, da `AUDIT_COVERAGE_MATRIX.md` ou
   da `EMENDA-01`.
9. **Não reduz cobertura para caber em orçamento** e **não absorve o excedente em
   silêncio** — as duas direções do erro do SIM-002.
