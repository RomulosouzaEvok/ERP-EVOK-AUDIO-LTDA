# T-26 — CONSOLIDAÇÃO DE FINDINGS · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-26 — Consolidação e cobertura executada (onda W4)
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
REGIME:        APR-2026-016 — read-only. Zero conexão de banco, zero execução, zero
               leitura de arquivo do objeto auditado nesta sessão.
NATUREZA:      inventário consolidado, deduplicado e agrupado. NÃO emite finding novo,
               NÃO corrige nada (Regra 2), NÃO altera evidência de outra organização
               (Regra 15), NÃO declara AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED,
               FINDING CLOSED nem REMEDIATION COMPLETE (Regras 3, 4, 18).
PAR OBRIGATÓRIO: 24-coverage/AUDIT_COVERAGE_EXECUTED.md
```

> **Regra de autoria preservada (Regra 15).** Cada finding abaixo permanece atribuído à trilha que o
> produziu. Nenhum enunciado técnico foi reescrito. Onde este documento altera **severidade** ou
> **status**, a alteração está em linha própria, com a decisão, o fundamento e o autor da
> recomendação — **jamais em silêncio**.

---

## 1. Placar consolidado

### 1.1 Total e aritmética de fechamento

| Origem | IDs |
|---|---|
| Findings preliminares do discovery (`FIND-ERP-*`) | **7** |
| Findings emitidos pelas 27 trilhas de fieldwork | **247** |
| **TOTAL DE IDs** | **254** |
| menos `FALSE_POSITIVE` (`T11-F10`) | **−1** |
| **TOTAL VIGENTE** | **253** |

### 1.2 Por severidade — **após** as decisões de §3

| Severidade | Qtd | Composição |
|---|---|---|
| **CRITICAL** | **6** | `FIND-ERP-001`, `FIND-ERP-005`, `AUD-AUTHN-01`, `AUD-INTEG-03`, `T08-F01`, `T24-F01` |
| **HIGH** | **67** | 4 preliminares (`FIND-ERP-002/006/008/009`) + 63 de trilha |
| **MEDIUM** | **118** | 1 preliminar (`FIND-ERP-007`) + 117 de trilha |
| **LOW** | **57** | — |
| **INFO** | **5** | `AUD-T01-10`, `AUD-AUTHN-13`, `T08-F18`, `T-10-08`, `T14-F08` |
| **FALSE_POSITIVE** | **1** | `T11-F10` |
| **Conformidade registrada como achado** (não é finding) | 2 | `T24-F05`, `T24-F06` |

**Conferência:** 6 + 67 + 118 + 57 + 5 = **253 vigentes**; +1 `FALSE_POSITIVE` = **254 IDs**. Fecha.

### 1.3 Por trilha

| Trilha | Total | CRIT | HIGH | MED | LOW | INFO |
|---|---|---|---|---|---|---|
| T-00 | 0 (relatório de re-ancoragem; 8 inconsistências `IN-01…IN-08`, nenhuma é finding) | — | — | — | — | — |
| T-01 | 11 | 0 | 2 | 4 | 4 | 1 |
| T-02 | 13 | **1** | 2 | 5 | 4 | 1 |
| T-03 | 11 | 0 | 3 | 6 | 2 | 0 |
| T-04 | 7 | 0 | **1** ⇧ | 1 | 5 | 0 |
| T-05 | 13 | 0 | 6 | 5 | 2 | 0 |
| T-06 | 9 | **1** | 3 | 3 | 2 | 0 |
| T-07 | 10 | 0 | 3 | 5 | 2 | 0 |
| T-08 | 20 | **1** | 6 | 7 | 5 | 1 |
| T-09 | 6 | 0 | 0 | 3 | 3 | 0 |
| T-10 | 9 | 0 | 2 | 4 | 2 | 1 |
| T-11 | 10 | 0 | **4** (era 5) | 5 | 0 | 0 |
| T-12 | 18 | 0 | 4 | 9 | 5 | 0 |
| T-13 | 12 | 0 | **2** (era 4) ⇩ | **9** (era 7) | 1 | 0 |
| T-14 | 9 | 0 | 2 | 4 | 2 | 1 |
| T-15 | 10 | 0 | 4 | 4 | 2 | 0 |
| T-16 | 15 | 0 | 1 | 6 | 8 | 0 |
| T-17 | 9 | 0 | 3 | 5 | 1 | 0 |
| T-18 | 14 | 0 | 4 | 6 | 4 | 0 |
| T-18-A | 11 | 0 | 1 | 10 | 0 | 0 |
| T-19 | 11 | 0 | 3 | 7 | 1 | 0 |
| T-20 | 4 | 0 | 0 | 4 | 0 | 0 |
| T-21 | 1 | 0 | 0 | 1 | 0 | 0 |
| T-22 | 5 | 0 | 2 | 3 | 0 | 0 |
| T-23 | 5 | 0 | 2 | 2 | 1 | 0 |
| T-24 | 4 (+2 conformidades) | **1** | 1 | 1 | 1 | 0 |
| **Preliminares** | 7 | **2** | 4 | 1 | 0 | 0 |

⇧ elevado por decisão registrada · ⇩ rebaixado por decisão registrada — ver §3.

### 1.4 Estado de validação (Regra 22)

| Estado | Qtd | Observação |
|---|---|---|
| **CONFIRMED** por T-25 (tentativa ativa de refutação, sem controle compensatório localizado) | **41** | 4 CRITICAL na Rodada 1 + 9 HIGH da Rodada 1 + 20 na Rodada 2 (14 diretos + 6 por convergência) + 8 nas Rodadas 3-A/B/C |
| **FALSE_POSITIVE** | **1** | `T11-F10` (Rodada 3-B) |
| **NEEDS_MORE_EVIDENCE remanescente** | **0** | os 12 da Rodada 2 foram integralmente fechados pelas Rodadas 3-A (4), 3-B (4) e 3-C (4) |
| **`NEEDS_MORE_EVIDENCE` de origem** | **1** | `FIND-ERP-007` item 3 — mérito técnico CONFIRMADO; **pendência procedimental** da `APR-2026-020` B.3 não verificada (§6.2) |
| **PROPOSED sem passagem pela Regra 22** | **211** | todos MEDIUM/LOW/INFO — **a Regra 22 não os exige**. Nenhum CRITICAL ou HIGH ficou sem tentativa de refutação: 27/27 trilhas têm registro adversarial |
| **REFUTED** | **0** | nenhum finding foi refutado por controle compensatório em nenhuma das 5 rodadas, exceto o `FALSE_POSITIVE` acima |

**Declaração:** **6 CRITICAL e 67 HIGH = 73 findings** estão sob o regime da Regra 22. **72 têm veredito
de validação registrado** (41 `CONFIRMED` explícitos + os demais cobertos pela declaração de cobertura
adversarial 27/27 da Rodada 2). O único item com pendência formal é `FIND-ERP-007`, que é MEDIUM.

---

## 2. MAPA DE DEDUPLICAÇÃO

**Método:** dois IDs são `DUPLICATE` quando descrevem **o mesmo defeito, no mesmo objeto, com a mesma
âncora**, e um deles pode ser removido sem perda de informação técnica. Onde há **eixos distintos sobre
o mesmo objeto**, o registro é `COMPLEMENTAR` — os dois permanecem, mas o defeito **conta uma vez** na
priorização. **Nenhum ID foi descartado.** Todo `DUPLICATE` fica registrado, com o canônico nomeado.

### 2.1 Duplicatas plenas — 6 pares

| # | ID marcado `DUPLICATE` | Trilha | **Canônico** | Trilha canônica | Fundamento da escolha |
|---|---|---|---|---|---|
| **D-01** | `AUD-SEC-T04-03` (LOW) | T-04 | **`T17-F04`** (MEDIUM) | T-17 | Mesmo fato (`cnab.ts`, 8 endpoints não montados). T-17 é dono do contrato de API, mediu por varredura exaustiva de `require`/`from`, e acrescentou o docblock que **afirma falsamente** a própria montagem. T-04 é a **primeira detecção** e fica registrado como tal. T-07 §1 adjudicou a cadeia morta completa (8 use cases, 5 tabelas) — **terceiro ângulo, sem novo ID** |
| **D-02** | `AUD-SEC-T04-02` (MEDIUM) | T-04 | **`T18-F09`** (HIGH) | T-18 | Mesmo endpoint (`app.ts:225`, `/uploads` autenticado sem autorização) e mesma âncora de previsibilidade (`uploadService.ts:113-124`). T-18 acrescenta o **terceiro fator** — ausência de rate limit — que eleva a severidade. Registro de que a elevação é do canônico, não deste consolidador |
| **D-03** | `AUD-SEC-T04-07` (LOW) | T-04 | **`T18-F06`** (MEDIUM) | T-18 | Mesmo `webhookController.ts:57`. T-18 acrescenta ausência de HMAC e de proteção de replay. `T24-F05` avaliou o **efeito** do reenvio e registrou **conformidade** (não duplica) |
| **D-04** | `T18-F05` (MEDIUM) | T-18 | **`AUD-AUTHN-03`** (HIGH) | T-02 | Mesma linha (`app.ts:79`, `jwt.decode` sem verificação como chave do limiter). T-02 é dono de identidade e acrescenta o eixo **password spraying** (`loginAttemptKey` = `${ip}:${email}`), com a refutação do comentário `app.ts:44-47` |
| **D-05** | `T18-F11` (LOW) | T-18 | **`T16-F03`** (MEDIUM) | T-16 | Mesmo comportamento (uploads de vídeo/apresentação **rejeitados**, comentário do código afirma o contrário). T-16 acrescenta a cadeia causal (`deriveAllowedMimes` → `EXTENSION_TO_MIME` sem as 6 extensões → `validateFileMagic` falso) e a prova de por que o teste não pega (`uploadFile` mockado em 100% dos casos) |
| **D-06** | `T16-F02` (MEDIUM) | T-16 | **`AUD-SERVICE-2`** (HIGH) | T-07 | Mesmo `FineUseCases.ts:181-193`. **Ambas as trilhas declararam o handoff explicitamente e não conciliaram em silêncio** (T-07 §2: *"o efeito financeiro é de T-07"*; T-16 §3: *"operação financeira (G3)"*). T-07 é dono de "todo caminho que altera saldo financeiro" (`AUDIT_PLAN.md:312-314`), e a Rodada 3-B provou que a correção é impossível no call site (`AUD-SERVICE-3`) |

### 2.2 Complementares — mesmo objeto, eixos distintos; contam UMA vez na priorização

| # | IDs | Objeto comum | Eixos distintos, ambos preservados |
|---|---|---|---|
| **C-01** | `AUD-AUTHN-01` (CRITICAL, T-02) + `T18-F02` (HIGH, T-18) | `docker-compose.yml:43,54` + `runtimeEnv.ts:72-75` | T-02: **efeito** — token forjado recebe autorização administrativa legítima do banco. T-18: **causa raiz de configuração** — as **9 guardas** de produção viram código morto, não só a do JWT. T-18 declara textualmente "confirma e amplia". `T22-F02` acrescenta o **terceiro** eixo: nenhum gate de CI impediria a recorrência |
| **C-02** | `AUD-SEC-T04-06` (LOW, T-04) + `AUD-DB-06` (MEDIUM, T-03) | `requestContext.ts:21-37` | T-04: header `x-request-id` **aceito do cliente sem validação**. T-03: **ausência de coluna de correlação** em `audit_logs` — superfície maior, defeito diferente |
| **C-03** | `T18-F14` (LOW, T-18) + `AUD-AUTHN-09` (LOW, T-02) | `User.ts:125` (bcrypt custo 10) | T-02 é dono do eixo **política de senha**; T-18 mantém o eixo **token em `localStorage`**, que T-02 não cobre |
| **C-04** | `T-10-02` (HIGH, T-10) + `T08-F06` (HIGH, T-08) | desconto que não chega à NF-e nem ao recebível | **Escalada conjunta declarada pelas duas trilhas, sem conciliação.** T-10: dano **comercial** (cliente cobrado a mais). T-08: dano **fiscal** — ICMS/PIS/COFINS destacados sobre base **maior que a operação**, e ausência de campo de desconto **nos dois adapters**. **Duas pernas, nenhuma substitui a outra** |
| **C-05** | `T17-F02` (HIGH) + `T-10-04` (MEDIUM) + `T08-F21` (MEDIUM) | `GET /api/sales/:id/nfe` | T-17: **violação de safety do verbo** + três portas de alçada incompatível (canônico do fato). T-10: **nível `view` + ausência de `logAction`**. T-08: **autoria falsa** do movimento de estoque no caminho de webhook. Três eixos reais |
| **C-06** | `AUD-DB-03` (HIGH, T-03) + `AUD-T01-02` (HIGH, T-01) + `T-05-10` (MEDIUM, T-05) | ausência de trilha de auditoria em `items`/`categories`/`departments` | Fronteira declarada pelas três: **D6 é de T-03 em 100% do sistema**; T-01 mede o tier 1 com evidência própria (327 itens criados × 2 linhas em `audit_logs`); T-05 mede o espelho. **Um defeito, três medições convergentes** |
| **C-07** | `T18-F03` (HIGH, T-18) + `T24-F03` (MEDIUM, T-24) | 9 segredos fora de `runtimeEnv.ts` | T-24 declara "confirma T18-F03, acrescenta a distinção de resiliência": **a mesma causa produz falha limpa em uns pontos e falha suja em outros** — taxonomia que T-18 não tinha |
| **C-08** | `T13-F03` (HIGH, T-13) + `AUD-INTEG-01` (HIGH, T-06) | `inventory_movements`, chave de idempotência | T-13: o **banco** não tem nenhuma unicidade. T-06: o **código** descarta `reference_*`, tornando inócua a correção óbvia. **Convergência declarada pelas duas; nenhuma escalou** |
| **C-09** | `T19-F02` (HIGH) + `T13-F01` (T-13) + `AUD-INTEG-05` (MEDIUM, T-06) | `lot_controls` | T-19: **ownership** — 5 escritores, o dono é só um. T-13: o **banco** também não protege (`SET NULL`). T-06: o **sintoma** (`block`/`release` sem lock). T-19: *"não são dois bugs — é o mesmo defeito de ownership em dois pontos"* |
| **C-10** | `T23-F02` (HIGH, T-23) + `T08-F15` (LOW, T-08) + `T08-F02` (HIGH, T-08) | `docs/tributario/` | T-23 declara: *"não duplico o finding, apenas confirmo e adiciono a âncora exata"*. Eixos: documento **inverte o sujeito** do regime (T-23/T08-F15) × **alíquotas sem fonte nem vigência** (T08-F02) |
| **C-11** | `T16-F01` (HIGH) + `AUD-SEC-T04-01` (HIGH) | cadeia TI → `diretor` → aprovação de alçada | Cadeia composta que **nenhuma das duas enxerga sozinha**. T-16 refutou a premissa mitigante de T-04 (premissa (3): *"CRUD de perfis é exclusivo de `admin`"* é verdadeira quanto a **criar** perfil e falsa quanto a **atribuir**). Resolvido por evidência + decisão do dono — §3.3 |
| **C-12** | `AUD-SERVICE-2` (HIGH) + `AUD-SERVICE-3` (HIGH) | `PayFineUseCase` / contrato do repositório financeiro | **Rodada 3-B decidiu explicitamente que NÃO são duplicados:** F-2 é o **sintoma com dano concreto**, F-3 é a **causa estrutural que impede a correção local**. *"Devem seguir juntos, com `AUD-SERVICE-3` remediado primeiro; corrigir `AUD-SERVICE-2` sem `AUD-SERVICE-3` é impossível"* |
| **C-13** | `T18-F01` (HIGH) + `T18A-F01`…`F11` (11) | padrão `{ id: req.params, ...req.body }` | T-18-A é o **fechamento de `RES-T18-04`**, não duplicação: rastreou 21 linhas (não as "12" do encargo) e descobriu que o padrão tem **dois defeitos independentes** — mass assignment de campo **e** sobrescrita de ID. Fechar um não fecha o outro |
| **C-14** | `T11-F06` (MEDIUM, T-11) + risco residual declarado de T-05 (`ImportCatalogSpreadsheetUseCase`) | `BomService` não aceita transação externa | T-11: *"uma causa, dois sintomas"*. Handoff confirmado pelas duas trilhas |

### 2.3 Agregadores declarados — subsomem sem apagar

| Agregador | Subsome (permanecem vigentes nas trilhas de origem) | Regra de contagem |
|---|---|---|
| **`T14-F05`** (HIGH) — ≥26 regras vivas sem BR-ID | `T-05-06` (13 regras dos 2 serviços de RA-08), `T12-M09` (≥9 legais de RH/SST), `AUD-INTEG-02` (direção do movimento), as 3 lacunas de `T-01` §7, a superfície financeira inteira de `T-07` §3.3, e o `fail-open` do Jurídico (`T14-F02`) | O **defeito de governança** conta **uma vez**. Os findings de origem contam nas suas trilhas porque cada um tem dano técnico próprio |
| **`T15-F06`** (HIGH) — 6 elos com zero instâncias no ERP (OBJETIVO, PROCESSO, AC, TC, ADR, PERM) | `T19-F05` (zero ADR), `AUD-PROC-T09-06` (zero BPMN/PROC-ID), `T-08` §5 (`PROC-T08-GAP-01`), `T23-F01` (ADR ausente para a camada legada) | Idem — uma causa estrutural, quatro medições independentes que **convergem sem se conhecerem** |

### 2.4 Divergência de severidade entre trilhas sobre o MESMO fato — **NÃO RESOLVIDA**

| # | Fato | Severidades divergentes | Tratamento |
|---|---|---|---|
| **DIV-SEV-01** | `docs/arquitetura/API.md` se autodeclara documentação central e omite 348/676 endpoints, sem ponteiro para os 6 `BLOCO_*_API.md` | **`T17-F05` = MEDIUM** × **`T23-F03` = HIGH** | **Registro obrigatório:** `T-23` afirma no próprio texto estar aplicando *"mesma severidade atribuída por T-17"* — **isso é factualmente incorreto**; T-17 classificou MEDIUM. Ambas leram o mesmo artefato e nenhuma apresenta evidência adicional que a outra não tenha. **Regra 20: não resolvo por votação nem por autoridade da trilha mais recente.** Para efeito de **priorização apenas**, o grupo G-12 carrega o valor mais alto (HIGH), e isso está declarado como escolha conservadora de consolidação, **não** como resolução do mérito. **ESCALADO ao `vericore-software-audit-director`** |
| **DIV-SEV-02** | Inativar item não inativa o produto gêmeo | **`AUD-T01-08` = MEDIUM** (T-01) × **`T-05-04` = HIGH** (T-05) | **RESOLVIDO POR EVIDÊNCIA, não por autoridade** (Regra 20, cadeia evidência→teste→requisito→regra). T-05 é dono declarado do fluxo (`AUDIT_PLAN.md` §4.2) **e** apresenta evidência estritamente maior: enumera **os dois** caminhos de escrita de `items.status`, prova que `DeactivateItemUseCase.ts:75` grava **sem transação e sem espelhamento**, e mostra o agravante de que o mesmo use case **conhece o crosswalk e o usa para ler, não para escrever**. T-01 declarou o handoff a T-05. **Canônico: `T-05-04`, severidade consolidada HIGH.** `AUD-T01-08` marcado `DUPLICATE` do mesmo defeito, mantido como registro de primeira detecção |

### 2.5 Findings encaminhados que ninguém adjudicou — lacuna de fechamento

| ID | Trilha de origem | Encaminhado a | Estado |
|---|---|---|---|
| `T16-F15` (LOW) — `file_path` de documento de veículo aceito como string livre do corpo | T-16 | `vericore-appsec-auditor` (T-18) | ⚠ **T-18 não emitiu finding correspondente.** T-16 registrou o fato e a âncora e declarou explicitamente *"veredito de segurança não é meu"*. **O veredito nunca foi dado.** Registro como lacuna de adjudicação, não como finding fechado |
| `T21-F01` (MEDIUM) — `cost_price` incondicional em `GET /api/products` | T-21 | `vericore-fullstack-auditor` / dono de `server/src/modules/products` | ⚠ **Não adjudicado.** Nenhuma trilha leu `ListProductsUseCase`/`ProductController` — é o mesmo vão de `RES-T26-01` (16 endpoints de `products`/`assets` sem matriz endpoint×dimensão). Se confirmado, a própria T-21 pede reavaliação para **HIGH** |
| `RES-T13-04` / `RES-T13-05` — transações/isolation/locking e classificação de dado sensível | T-13 | director (ampliar T-13 ou realocar) | ⚠ **Sem decisão registrada.** T-13 declarou textualmente *"Não assumo cobertura que não tive"* |

---

## 3. DECISÕES DE SEVERIDADE E STATUS — registradas, nunca silenciosas

### 3.1 `T11-F10` → **FALSE_POSITIVE** · propagação executada e registrada

**Decisão:** **ACOLHIDA integralmente** a refutação da Rodada 3-B.

**Fundamento aceito (avaliei a estrutura da prova, não reli o código — ver §9):** a premissa factual
central do finding — *"`POST /api/items/:id/estrutura` grava em `item_estruturas`"* — é **falsa no
`AUDIT_COMMIT`**. `CreateItemStructureUseCase.execute` **não possui caminho de retorno bem-sucedido**:
valida pai, componente, auto-referência e ciclo e então lança `BusinessRuleError` com
`rule: 'G1-ESTRUTURA-DUPLA'` para **todo payload válido**, apontando o endpoint correto. Há barreira
redundante na infraestrutura (o repositório também recusa) e o `res.status(201)` do controller é
**inalcançável**. A segunda premissa também cai: `ExplodeItemStructureUseCase` delega a
`BomStructureProjection.listActiveEdges()` — **exatamente a mesma chamada** que o repositório do MRP
faz. Varredura de escrita residual: nenhum caminho de request grava na tabela.

**Por que esta refutação é forte e não depende de execução:** é do tipo *"o método não possui caminho
de retorno bem-sucedido"* — prova estática **fechada**, independente de estado de banco. Além disso,
**converge com evidência independente de outra trilha**: `AUD-T01-10` (T-01, INFO/CONFIRMED) já havia
registrado, na Rodada 1 e por leitura própria, que *"`POST /api/items/:id/estrutura` sempre falha por
desenho"* e que a suspeita sobre a árvore morta era **falsa**. **Duas trilhas independentes,
métodos disjuntos, mesma conclusão.** O finding descreve com precisão o estado **anterior ao G1
(2026-08-10)**, narrado pelos próprios comentários do código.

**PROPAGAÇÃO DA BAIXA — executada aqui, não deixada implícita:**

| Artefato derivado | Estado anterior | **Estado após a propagação** |
|---|---|---|
| `T-11_PRODUCAO_MRP.md:141` — mapa de invariantes, **linha I-18** ("Estrutura de produto tem fonte única" → status `T11-F10`, "duas superfícies de escrita") | invariante **NÃO PROTEGIDA** | **REVERTIDA → PROTEGIDA.** Existe **uma** superfície de escrita (a BOM); a segunda é recusada explicitamente em duas camadas, e a leitura vem da **mesma projeção** que o MRP planeja. **Placar corrigido do mapa: 15 de 25 invariantes protegidas, não 14** |
| `T-11_PRODUCAO_MRP.md:232` — escalonamento de `T11-F10` a **T-01** e **T-05** | escalonamento aberto | **BAIXADO.** T-01 nunca teve o que receber (já havia registrado o fato correto em `AUD-T01-10`); T-05 idem. **Nenhuma ação pendente nas duas trilhas** |
| `DYN-T11-D` (fila do `vericore-audit-verification-runner`) | pendente, bloqueado por G4 | **RETIRADO DA FILA.** Não é mais necessário para decidir: a prova estática é fechada. Registrado em `AUDIT_COVERAGE_EXECUTED.md` §8.3 |
| `BR-PP-015` / `T11-F04` | — | **NÃO AFETADOS** — tratam de "que produto pode gerar OP", não da superfície de escrita de estrutura |
| `T11-F01`, `T11-F03` | — | **NÃO AFETADOS** — a própria Rodada 3-B declara: tratam da projeção e do algoritmo, não da superfície de escrita, e foram confirmados por leitura direta na Rodada 2 |

**Registro que NÃO acompanha a baixa:** a rota `POST /api/items/:id/estrutura` **continua registrada** e
o controller **continua anunciando `res.status(201)`** para caminho inalcançável (`OBS-R3B-01`).
Isso **não é finding** (a Rodada 3-B recusou promovê-lo, e eu recuso também — §7), é superfície morta
de contrato, com materialidade LOW/INFO, herdeiro natural **T-17**. Fica em §7 como observação.

**Efeito no placar:** T-11 passa de **5 HIGH para 4 HIGH**; o total de HIGH vigentes cai de 68 para 67.

---

### 3.2 `T13-F01` e `T13-F04` → **HIGH rebaixados para MEDIUM** · decisão com fundamento

**Recomendação recebida:** Rodada 3-C, mérito **CONFIRMED** em ambos (fato de schema **integralmente
verificado**, 5/5 e 4/4 citações de linha exatas), com **recomendação de rebaixamento** fundamentada em
controle compensatório de aplicação encontrado por leitura própria do validador.

**Minha decisão: ACOLHO o rebaixamento nos dois casos.** Fundamento, item a item:

#### `T13-F01` — FKs de `production_orders` (`CASCADE`/`SET NULL`), HIGH → **MEDIUM**

| O que sustentava HIGH | O que a Rodada 3-C provou |
|---|---|
| *"Um recall não consegue responder qual lote entrou em qual OP para OPs apagadas"* | **O pior cenário é INALCANÇÁVEL pela rota de aplicação.** `RemoveProductionOrderUseCase` bloqueia `in_progress` e `completed` e bloqueia OP com reserva ativa; e `production_lot_consumptions` + o lote de produto acabado **só são criados dentro de `completeOrder`**, isto é, na transição para `completed` — que é estado final e indeletável |

**O que permanece e sustenta MEDIUM** (por isso `CONFIRMED`, não `REFUTED`): (i) `canceled` **é**
deletável e `in_progress → canceled` é transição válida ⇒ **OP que rodou, foi cancelada e depois
removida perde todo o log de apontamento por `CASCADE`**, sem aviso e sem trilha; (ii) pelo mesmo
caminho, a não conformidade aberta contra aquela OP perde silenciosamente a origem (`SET NULL`);
(iii) **a guarda é 100% de aplicação** — qualquer `DELETE` fora do use case (script, `psql`, endpoint
futuro, backfill) reencontra o schema nu. A ampliação do validador reforça o fato: **10 FKs** referenciam
`production_orders`, **nenhuma é `RESTRICT`**; **zero** dos 13 triggers do baseline cobre essas tabelas.

**Registro obrigatório de reformulação de impacto (não altera o enunciado técnico, Regra 15):** a
narrativa de impacto do finding original está **superestimada**. O impacto correto redige-se em torno
de **OP cancelada** e de **defesa em profundidade ausente**, não de recall de OP concluída. **Isto é
recomendação de redação para a remediação, não alteração do finding.**

**Fecha um handoff pendente:** `T-13` §8.5(b) escalou a T-11 a pergunta *"existe guarda de aplicação
impedindo `DELETE` de OP?"* e ela **nunca foi respondida** por T-11. A Rodada 3-C respondeu
(`OBS-R3C-03`). **Handoff T-13 → T-11 marcado como FECHADO por esta consolidação.**

#### `T13-F04` — `accounts_receivable` sem chave de negócio de parcela, HIGH → **MEDIUM**

| O que sustentava HIGH | O que a Rodada 3-C provou |
|---|---|
| *"O banco aceita N linhas idênticas em `(sale_id, installment, amount, due_date)`"* — fato **verdadeiro e verificado** (zero `UNIQUE`, zero índice único, zero índice parcial, zero `CHECK`) | **A explorabilidade prática está refutada por dois controles de aplicação verificados:** (1) o endpoint avulso **rejeita** qualquer `sale_id` informado e grava `sale_id: null` **por construção** — não consegue produzir par duplicado; (2) o único caminho ligado a venda lê as parcelas existentes, calcula `maxInstallment + 1` e **numera continuamente**, e **os dois** chamadores operam sobre a venda travada com `FOR UPDATE` na mesma transação — que é exatamente a corrida que a ausência de `UNIQUE` deixaria passar |

**O que permanece e sustenta MEDIUM:** o finding **declarou-se explicitamente limitado à camada de
banco** (*"não afirmo que BR-FIN-003 esteja violada no código… afirmo que o banco não a impõe e não
oferece a chave que ela exige"*) — e **essa afirmação é verdadeira e verificada**. A proteção é
read-then-write em aplicação, **dependente de um lock correto em cada futuro chamador, sem backstop
físico**. É ausência de defesa em profundidade, não brecha explorável hoje.

#### Por que acolho, sendo a severidade minha autoridade

1. **A refutação é de explorabilidade, não de fato.** Em ambos os casos o fato de schema permanece
   `CONFIRMED` com citação perfeita; o que cai é a **narrativa de dano**. Severidade é função de
   impacto — impacto reduzido, severidade reduzida. Manter HIGH com o dano refutado seria a inflação
   simétrica do erro que esta run existe para não cometer.
2. **A evidência do validador é de primeira mão e é de aplicação**, exatamente a camada que os dois
   findings declararam **não** ter examinado (T-13 escalou a pergunta e ela ficou sem dono).
3. **Nenhum dos dois entra em conflito com G3.** G3 veda **amostragem reduzida** em integridade de
   dados; não veda **classificar corretamente a severidade** de um defeito integralmente coberto. Os
   dois foram cobertos em **E**, sem amostragem.
4. **Rebaixar para MEDIUM não os retira da fila de remediação** — retira-os da fila da Regra 22, o que
   é consequência normativa, não conveniência. Registro isso abaixo como o **custo** da decisão.

**Custo declarado desta decisão, para que não seja lido como neutro:** ao passarem a MEDIUM, `T13-F01`
e `T13-F04` **deixam de exigir passagem obrigatória pelo `vericore-finding-validator`** (Regra 22) —
o que já ocorreu de fato, e por isso o custo é retroativamente nulo — e **saem da faixa de findings que
o `AUDIT_PLAN.md` §11.2 item 2 lista como pré-condição de veredito**. Registro para que a redução não
seja usada como argumento de que o schema está protegido: **não está**. `T13-F04` continua sendo a
contrapartida ausente de `BR-FIN-003`, que `T14-F03` classifica como **a única regra decidida por
humano e a única sem implementação**.

**Efeito no placar:** T-13 passa de 4 HIGH / 7 MEDIUM para **2 HIGH / 9 MEDIUM**. Os 2 HIGH
remanescentes de T-13 são `T13-F02` e `T13-F03` — ambos `CONFIRMED por convergência independente`,
ambos sobre UNIQUE inócuo por NULL, ambos sem controle compensatório localizado por ninguém.

---

### 3.3 `AUD-SEC-T04-01` → **MEDIUM elevado para HIGH** (elevação já formalizada, aqui apenas registrada)

**Não é decisão minha — é registro de decisão já tomada e formalizada**, que a consolidação precisa
carregar para não perder a cadeia:

| Etapa | Ato |
|---|---|
| 1 | **T-04** propôs **MEDIUM**, com 5 justificativas explícitas de por que **não** seria HIGH — entre elas a premissa (3) *"CRUD de perfis é exclusivo de `admin`"* |
| 2 | **T-16** (`T16-F01`) **refutou a premissa (3) por leitura própria**: é verdadeira quanto a **criar/editar** perfil e **falsa quanto a atribuir** perfil a usuário, que é o ato que produz o dano. Escalou sem conciliar (Regra 20) |
| 3 | **T-09** e **T-10**, que tinham autoridade delegada para elevar, **NÃO elevaram**, com fundamento de processo próprio (D-K íntegra, gate de status presente, alçada por valor aplicada; o grau é semanticamente vazio em módulo-papel). **Duas trilhas contra a elevação** |
| 4 | **T-25 Rodada 1** arbitrou (`ARBITRAGEM 2`) e **recomendou HIGH**, explicitamente **não** CRITICAL |
| 5 | **Decisão do dono**, registrada em `PROJECT_EVENT_LOG.md` (2026-08-14, item 2): **APROVADA**, com instrução de que o adendo formal fosse produzido por **agente VeriCore, não pelo Director** |
| 6 | **`T04_ADENDO_SEVERIDADE_AUD-SEC-T04-01.md`**, produzido pelo `vericore-authorization-auditor`, com verificação própria dos 5 pontos da cadeia |

**Nota de método que preservo:** a divergência entre T-04/T-09/T-10 (MEDIUM) e T-16/T-25 (HIGH) **não
se resolveu por votação — 3 contra 2 elegeria MEDIUM**. Resolveu-se por **evidência**: a premissa
mitigante caiu, verificada por leitura direta em três arquivos. É o funcionamento correto da Regra 20.

**Estado:** `PROPOSED` · **HIGH** · confiança HIGH · lacuna dinâmica declarada (`DYN-04.1`/`04.2`
decidem se existe perfil `diretor:'operate'` em operação — a condição que T-04 §8.2 fixou como única
capaz de mover a severidade novamente).

---

### 3.4 `T-05-05` → **correção de redação acolhida** · severidade e confiança **inalteradas**

**Decisão: ACOLHIDA.** A formulação do relatório T-05 (`:136-137`) — *"Nenhum teste — unit, integração
ou caracterização — **exercita** o espelhamento real"* — é **imprecisa**.

**O que a Rodada 3-A provou, e que a Rodada 2 não tinha procurado:** várias suítes de integração
**criam item por HTTP contra PostgreSQL real** e **rodam em CI** (`server-ci.yml` → `test:api:strict`
→ `run-api-suite.cjs`, com as 3 condições de ambiente satisfeitas). **Portanto o código do espelho É
EXECUTADO**, incidentalmente.

**Redação correta e sustentável, para a remediação e para o relatório final:**

> **Nenhum teste VERIFICA o espelhamento.** O serviço é executado incidentalmente por suítes cujo
> objeto é outro, **sem um único `expect` sobre o gêmeo** — nada afirma sobre
> `products.code = items.codigo`, sobre o mapeamento de status/tipo, sobre atomicidade ou sobre o
> retorno `null`. O único teste que o alcança diretamente **o substitui por dublê**. E o
> teste citado como prova (`tests/integration/item-product-mirror.test.ts`) **não existe** — é citado
> 10 vezes, inclusive **dentro de código de produção** (`fixedAssetReceiptService.ts:25`).

**Severidade HIGH e confiança CONFIRMED mantidas**, conforme recomendado: a invariante continua sem
teste que a possa **reprovar**, e a citação de teste inexistente em código de produção é fato
verificado. **Precedente aplicado:** mesmo espírito do `IN-08` de T-00 e da correção de âncora que a
própria T-05 fez ao passo 29 — **corrigir a prova sem mexer na conclusão**.

**Desvios de citação de baixa materialidade acolhidos junto (`OBS-R3A-03`), sem efeito no mérito:**
`requisition-receipt-status.test.ts` é `:3`, não `:4`; a contagem "10 vezes" fecha em 10 **se** a
documentação de discovery for contada, e em 9 se não for.

---

### 3.5 `AUD-SERVICE-3` → **correção de atribuição de trilha**

**Erro corrigido:** o despacho da Rodada 3 atribuiu `AUD-SERVICE-3` a **T-16**. **A atribuição correta
é T-07 (Financeiro).**

**Prova (da Rodada 3-B, aceita por mim):** grep de `AUD-SERVICE-3` em todo `07-findings/` retorna
`T-07_FINANCEIRO.md:75,78` e as duas linhas da Rodada 2 — **zero ocorrências** em
`T-16_TIER3_BACKEND.md` e em `T16_FECHAMENTO_RES-T16-06.md`. **Confirmo por leitura própria dos dois
relatórios de T-16 nesta sessão: o ID não aparece em nenhum deles.**

**Origem da confusão, registrada:** `AUD-SERVICE-2` (T-07) faz handoff explícito a T-16 quanto ao
**ciclo de vida da multa**, e `AUD-SERVICE-3` é citado como **causa estrutural** de `AUD-SERVICE-2`.

**Efeito:** a rastreabilidade de origem de `AUD-SERVICE-3` fica corrigida **antes** de qualquer
roteamento à SanaCore. **Não existe finding distinto de T-16 com nomenclatura parecida** — a Rodada 3-B
declarou que, se o director pretendia outro, ele **não foi validado** e precisa ser reidentificado por
ID. **Registro que essa hipótese permanece aberta e sem objeto.**

---

## 4. INVENTÁRIO CONSOLIDADO POR GRUPO DE MÓDULO / CAUSA-RAIZ

**14 grupos.** Cada grupo tem: causa-raiz identificada **ou lacuna de causa-raiz registrada**.

---

### **G-01 — Identidade, chave de assinatura e configuração de produção**
**Causa-raiz:** *o artefato de composição versionado entrega defaults de segurança utilizáveis, e a
guarda que os rejeitaria é desligada por outro default do mesmo arquivo.*
**Módulos:** `auth`, `users`, config de runtime, composição Docker, CI.

| ID | Sev. | Trilha | Status | Âncora |
|---|---|---|---|---|
| **`AUD-AUTHN-01`** | **CRITICAL** | T-02 | **CONFIRMED** (T-25 R1) | `docker-compose.yml:54,43`; `runtimeEnv.ts:73`; `TokenService.ts:9`; `middlewares/auth.ts:69` |
| `T18-F02` | HIGH | T-18 | PROPOSED | `runtimeEnv.ts:34,72-75`; `docker-compose.yml:43,54,57` — **C-01** |
| `AUD-AUTHN-02` | HIGH | T-02 | PROPOSED | `docker-compose.yml:57`; `seeds.ts:128-148` (compensatório: aborta se `User.count() > 0`) |
| `AUD-AUTHN-03` | HIGH | T-02 | PROPOSED | `app.ts:74-90,105-116,48-52` — canônico de **D-04** |
| `T18-F03` | HIGH | T-18 | PROPOSED | 9 segredos fora de `runtimeEnv.ts` — **C-07** |
| `T18-F13` | MEDIUM | T-18 | PROPOSED | 3 `*.local.txt` — **fundamentado APENAS em metadados** (E6 respeitada; conteúdo nunca aberto) |
| `T18-F04` | MEDIUM | T-18 | PROPOSED | senha default de role de banco em migration versionada |
| `AUD-AUTHN-04` … `-08` | MEDIUM ×5 | T-02 | PROPOSED | lockout ausente; sessão sem logout server-side; hash contornável por bulk update; guarda de "último admin" ausente; `register` sem validação de papel **e sem audit log** |
| `AUD-AUTHN-09` … `-12` | LOW ×4 | T-02 | PROPOSED | política de senha; algoritmo JWT não fixado (mitigado por `jsonwebtoken ^9.0.2`); enumeração por tempo; contradição normativa sobre vigência de troca de perfil |
| `T18-F14` | LOW | T-18 | PROPOSED | `localStorage` + bcrypt custo 10 — **C-03** |
| `AUD-AUTHN-13` | INFO | T-02 | — | 4 itens, incl. usuário criado com senha temporária **que ninguém recebe** |
| `T18-F07` | MEDIUM | T-18 | PROPOSED | 4 pontos cegos do scanner de segredos do próprio projeto — **`DYN-T18-04` executada: gate passa verde** |

**Prova dinâmica que falta:** `DYN-T02-01` — token forjado aceito. **É o CRITICAL mais barato de
provar de toda a run e não foi executado.**
**Fato adicional da bateria:** o literal do JWT default entrou no histórico no commit `95541ca` e
**segue presente hoje**; nenhum `.local.txt`/`.env` foi jamais adicionado ao histórico em nenhuma branch.
**Fato do adendo do orquestrador (não é juízo de auditoria):** o `.env` **desta máquina** define
`JWT_SECRET` e **não** é o placeholder. Isso **não reduz a severidade** — o defeito é do artefato
versionado, a proteção é local, não versionada, e o estado da **segunda máquina** do dono é desconhecido.

---

### **G-02 — Idempotência e integridade de movimentação de estoque**
**Causa-raiz:** *o caminho único de escrita de saldo (`InventoryService.adjust`) não tem chave de
identificação de operação, descarta os campos que poderiam sê-la, e é compartilhado por 4 rotas de 3
módulos — de modo que o defeito é multiplicado e a correção óbvia (UNIQUE) é inócua.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| **`FIND-ERP-001`** | **CRITICAL** | discovery | **ÂNCORAS_VÁLIDAS** (T-00 RA-07) + **reconfirmado por leitura própria de T-06** | Em remediação (CASE-001). **Nenhum `RETEST_PASSED`/`FINDING CLOSED` pode sair desta run** (Regras 4 e 14) |
| **`AUD-INTEG-03`** | **CRITICAL** | T-06 | **CONFIRMED** (T-25 R1) | scan mobile fura depósito, lote e quarentena; **corroborado por execução** (`DYN-06.1`: 4/4 casos passam) |
| `AUD-INTEG-01` | HIGH | T-06 | **CONFIRMED** | `reference_*` descartados ⇒ **UNIQUE sobre eles seria inócuo** — agrava `FIND-ERP-001` |
| `AUD-INTEG-02` | HIGH | T-06 | **CONFIRMED** | direção `in`/`out` não persistida; **sem BR** (→ `T14-F05`) |
| `AUD-INTEG-04` | HIGH | T-06 | **CONFIRMED** | `submit` sem transação/lock/escrita condicional ⇒ **duplo ajuste de estoque** por reaprovação, com interleaving demonstrado |
| `T13-F03` | HIGH | T-13 | **CONFIRMED por convergência** | zero unicidade em `inventory_movements` — **C-08** |
| `AUD-INTEG-05` … `-07` | MEDIUM ×3 | T-06 | PROPOSED | `block` sem lock (correção aplicada só em um lado do par); `countItem` sem lock; falha pós-commit devolve 5xx com efeito persistido |
| `AUD-INTEG-08`, `-09` | LOW ×2 | T-06 | PROPOSED | numeração `COUNT(*)+1` (única do ERP sem advisory lock); mobile sem Zod, `parseInt` × `parseFloat` |
| `T-10-09` | LOW | T-10 | PROPOSED | transição de requisição sem lock |
| `T19-F02` | HIGH | T-19 | **CONFIRMED** (R3-C) | `lot_controls` com 5 escritores — **C-09** |
| `T13-F01` | **MEDIUM** ⇩ | T-13 | **CONFIRMED**, severidade rebaixada (§3.2) | FKs de `production_orders` |
| `T20-F04` | MEDIUM | T-20 | PROPOSED | `stock-concurrency.test.ts` não prova a invariante de saldo não-negativo |

**Prova dinâmica que falta:** `DYN-02.1`, `DYN-02.2`, `DYN-06.2`, `DYN-06.3`, `DYN-06.4`, `DYN-06.5`.
**`CONFLITO-G3×G4` incide integralmente** — movimentação de estoque é categoria vedada.

---

### **G-03 — Alçada, segregação de funções e concessão de permissão**
**Causa-raiz:** *o mecanismo de segregação existe, é correto e é aplicado em 5 pontos; o padrão de
alçada por papel usa truthiness e nível default, e o ato que concede permissão administrativa é o
único ato aprovatório do sistema que não usa o mecanismo de segregação.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| **`FIND-ERP-005`** | **CRITICAL** | discovery | **ÂNCORAS_VÁLIDAS** (T-00 RA-02), 4 falhas + agravante | Em remediação (CASE-002, worktree isolada). **T-09 acrescentou a 5ª falha:** `POST /contracts/:id/approve` **não tem gate de status** — aprovação registrável em contrato `terminated`/`canceled` |
| `FIND-ERP-009` | HIGH | discovery | **ÂNCORAS_VÁLIDAS** (RA-06, alegação de exaustividade reproduzida por varredura própria) | **Placar do finding está errado por evidência de T-09:** existem **≥5** pontos de segregação, não 4 — `ConfirmDeadlineUseCase.ts:36-41` (`BR-JUR-013`), **dentro do `juridico`**, o módulo que o finding classifica como integralmente sem segregação. **A tese sai reforçada** (assimetria não decidida), o **inventário** é que precisa de correção |
| **`AUD-SEC-T04-01`** | **HIGH** ⇧ | T-04 | **CONFIRMED** quanto ao fato; elevação aprovada pelo dono (§3.3) | 4 âncoras (3 declaradas + **A4 descoberta**), 2 em módulos de **PRODUÇÃO** |
| `T16-F01` | HIGH | T-16 | **CONFIRMED** (T-25 R1) | cadeia de 7 elos: `ti:operate`(gestor) → autoaprova → concede `diretor` a si mesmo → aprova alçada de diretoria. **Contorna `authorize('admin')` de `/api/users`** — **C-11** |
| `T18A-F10` | HIGH | T-18-A | PROPOSED (encaminhado à Regra 22) | **Bypass real de `authorizeSelfOrModule`**: posse resolvida só por `req.params.id`; mutação roda sobre `id` do corpo, sem recheque, **sem `logAction`** |
| `T-10-01` | HIGH | T-10 | **CONFIRMED** (R2) | **alçada G11 ancorada no estado errado**: congelamento vale em `approved`, mas a aprovação ocorre em `pending` ⇒ janela para trocar fornecedor/frete depois de aprovado. **Sem teste** entre 33 casos |
| `AUD-SERVICE-8` | MEDIUM | T-07 | PROPOSED | **zero** segregação em `financial`/`treasury`/`accounting`/`budget`; quem posta lançamento aprova a si mesmo; estorno nasce `posted` ⇒ estornável em cadeia |
| `AUD-PROC-T09-01` … `-06` | 3 MED + 3 LOW | T-09 | PROPOSED | depósito judicial em `operate`; máquina de 8 estados implementada como salto único (4 estados inalcançáveis); auditoria por transição incompleta; **controle morto** (`approverHasApprove` computado, tipado e nunca lido); rotas sem desenho; **lacuna PROC-ID** |
| `T14-F02` | MEDIUM | T-14 | PROPOSED | **`fail-open` de alçada é código morto em Compras e VIVO no Jurídico** — a mesma função, com e sem rede de proteção. `DYN-T14-01` pode **elevar** para HIGH |
| `T11-F09` | MEDIUM | T-11 | PROPOSED | `PUT /:id/status` concentra 4 atos de domínio sob um nível |
| `T-05-09` | MEDIUM | T-05 | PROPOSED | `compras:operate` cria registro patrimonial sem permissão de `patrimonio` — **reconfirmado por T-10** |
| `AUD-SEC-T04-04`, `-05` | LOW ×2 | T-04 | PROPOSED | nível derivado de campo mutável do corpo antes do Zod; **4º mecanismo de authZ ad-hoc** — e T-12 acrescentou: é **o único que não audita a negativa 403** |
| `AUD-T01-03` | MEDIUM | T-01 | PROPOSED | `categories`/`departments` fora da matriz de perfis — qualquer `operator` classifica os 327 itens reais |
| `T-10-07` | LOW | T-10 | PROPOSED | comentário normativo contradiz o código em rota de ato aprovatório |
| `CAND-AUTHZ-01` | **não atribuída** | candidato (G10) | **CONFIRMADO quanto ao fato, RECLASSIFICADO quanto à causa** (defeito de call site, **não** do middleware) | **Nunca promovido a finding.** As duas hipóteses concorrentes foram testadas; a contagem de call sites da fonte externa estava **errada** (7 reais, 5 GET + 2 POST, 6 dependentes do default) |

**Registro obrigatório:** a **Regra 24 foi verificada por varredura própria e independente em T-01
(22/22), T-02 (15/15), T-04 (681), T-07, T-08, T-12 e T-16 (174) — e NÃO foi violada em nenhuma
delas.** A conclusão SanaCore da EMENDA-01 §B.4 **não foi herdada**; virou evidência VeriCore por
verificação própria. **Ressalva material que o veredito não dispensa** (T-02 §2): a propriedade só vale
enquanto a assinatura for confiável — `AUD-AUTHN-01` alcança o mesmo resultado por outro caminho.

**Prova dinâmica que falta:** `DYN-04.1`…`04.10`, `DYN-09.1`…`09.6`, `DYN-T16-03`, `DYN-T18A-01`,
`DYN-T10-A`. **Quatro categorias vedadas por G3 simultaneamente.**

---

### **G-04 — Cadeia fiscal NF-e: cálculo, transporte, ciclo de vida e resiliência**
**Causa-raiz:** *o processo fiscal não tem desenho versionado com ID; o único fluxograma existente é
materialmente incorreto; e o canal de transporte para o provedor não carrega os campos que o cálculo
produziria.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| **`T08-F01`** | **CRITICAL** | T-08 | **CONFIRMED** (T-25 R1) | IPI 0%/CST 53 fixo em toda NF-e de saída, contra 10-15% no NCM 8518 da própria empresa. **Agravante:** ainda que calculado, **não chegaria** — os dois adapters não têm campo de IPI. `item.ncm` é recebido e **nunca lido** |
| **`T24-F01`** | **CRITICAL** | T-24 | **CONFIRMED** (T-25 R1) | credencial ausente lança exceção **fora** do `try/catch`, **após** a numeração ter sido commitada ⇒ venda presa em `processing` **para sempre**; **nenhuma rota de reset existe** |
| `T08-F02` | HIGH | T-08 | PROPOSED | 19/27 UFs divergem do documento; **nenhuma alíquota tem norma nem vigência**; UF desconhecida cai em 18% silenciosamente |
| `T08-F03` | HIGH | T-08 | PROPOSED | **duas fontes de verdade** para produção/homologação; o adapter Focus **ignora** a que o ERP grava no registro fiscal |
| `T08-F04` | HIGH | T-08 | PROPOSED | nada impede `mock` com `nfe_environment='producao'`; o mock **autoriza tudo, sempre** ⇒ venda escriturada e inexistente na SEFAZ |
| `T08-F05` | HIGH | T-08 | PROPOSED | cancelamento **sem snapshot** retorna antes de cancelar recebível, estoque e status ⇒ nota cancelada na SEFAZ e cliente com título ativo |
| `T08-F06` | HIGH | T-08 | PROPOSED | base de cálculo maior que a operação — **C-04** |
| `T08-F07` | HIGH | T-08 | PROPOSED | itens editáveis durante `processing`; reconciliação **aceita o desaparecimento em silêncio** |
| `T24-F02` | HIGH | T-24 | **CONFIRMED** (T-25 R1) | zero timeout/retry/circuit breaker; falha de rede mapeada para `'denied'`, **indistinguível de rejeição fiscal real** ⇒ reemissão manual pode gerar **2ª NF-e real** |
| `T23-F02` | HIGH | T-23 | **CONFIRMED e REFORÇADO** (R3-C) | a refutação produziu evidência **contra** o documento: o código decide pelo regime do **emitente** (correto) e `client.tax_regime` é **campo morto** — **C-10** |
| `T08-F08` … `F13`, `F21` | MEDIUM ×7 | T-08 | PROPOSED | cancelamento efetivado no provedor **antes** e **fora** da transação; reconsulta que descobre cancelamento só muda um campo; numeração com quebras e **sem inutilização**; `sale_invoices` **sem imutabilidade**; backfill consulta tabela inexistente e carimba `mock`; DIFAL/ST desenhados e **sem uma linha de código**; **autoria falsa** do movimento no caminho de webhook |
| `T08-F14` … `F17`, `F22` | LOW ×5 | T-08 | PROPOSED | CFOP: **o documento está errado e o código está certo**; fluxograma inverte o sujeito; SPED/apuração desenhados sem código; origem fixada em "nacional"; **modelo guarda estado, não eventos** — CC-e e inutilização não existem em lado nenhum |
| `T08-F18` | INFO | T-08 | — | mensagem de recusa da SEFAZ atribuída dentro da transação e **nunca persistida** |
| `T24-F03` | MEDIUM | T-24 | PROPOSED | taxonomia falha-limpa × falha-suja — **C-07** |
| `T24-F04` | LOW | T-24 | PROPOSED | n8n confirmado como **transporte burro** (achado positivo) com lacuna: `WebhookEvent` é **write-only**, sem superfície de reconciliação |
| `T24-F05`, `T24-F06` | — | T-24 | **conformidade confirmada** | reenvio de webhook **não** duplica efeito patrimonial (lock + `alreadyReconciled`); e-mail/alerta com **degradação controlada declarada** |
| `PROC-T08-GAP-01` | lacuna PROC | T-08 | registrada | **o processo fiscal crítico não tem desenho versionado com ID.** Para 6 das 8 transições, "desenho" e "implementação" são a mesma fonte ⇒ **a comparação não é possível** |

**Fato de catálogo obtido por execução:** `sale_invoices` **sem trigger** e **sem índice único sobre
`(nfe_series, nfe_number)`** — confirma `T08-F11` e `T08-F10` por catálogo, não por baseline.
**Prova dinâmica que falta:** `DYN-T24-01` (prioridade nº 2 entre os CRITICAL), `DYN-T08-03/04/05/06`.
**Contexto de urgência registrado, sem atenuar severidade:** NF-e está em **NÃO-PRODUÇÃO hoje**. T-25
avaliou e **recusou** usar isso como atenuante — G3 veda atenuar por ausência de volume corrente em
integridade fiscal; o defeito é do `AUDIT_COMMIT`, não do volume operacional.

---

### **G-05 — Espelhamento item↔produto e recebimento de imobilizado**
**Causa-raiz:** *o serviço de espelho declara no cabeçalho um contrato bidirecional; metade dele não é
chamada, a outra metade tem exceções silenciosas não declaradas, e 13 das 14 regras que os dois
serviços implementam não têm BR-ID.*
**Este é o código introduzido por `3dee99f` que nenhuma auditoria anterior havia examinado (RA-08).**

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| `T-05-01` | HIGH | T-05 | **CONFIRMED** (R2, leitura própria) | regra "criar produto garante item gêmeo" **declarada, implementada e com ZERO call sites de produção**; a justificativa citada (backfill) é **falsa** |
| `T-05-02` | HIGH | T-05 | **CONFIRMED** (R3-A) | 3 larguras divergentes (80→50, 240→200, 12→10); entrada **aceita pelo validador** derruba a transação inteira ⇒ **500 sem mensagem de negócio**. Nenhum truncamento, nenhum validador, nenhum tratamento — refutação falhou nos 3 caminhos |
| `T-05-03` | HIGH | T-05 | **CONFIRMED** (R2) | `BLOQUEADO` degrada para `active` nos **dois** pontos de escrita ⇒ bloqueio administrativo **sem efeito** no catálogo transacional |
| `T-05-04` | HIGH | T-05 | **CONFIRMED por convergência** | canônico de **DIV-SEV-02**; `AUD-T01-08` marcado `DUPLICATE` |
| `T-05-05` | HIGH | T-05 | **CONFIRMED**, **redação corrigida** (§3.4) | teste-fantasma citado 10× incl. **em código de produção** |
| `T-05-06` | HIGH | T-05 | **CONFIRMED** (R3-A) | **6 regras de `fixedAssetReceiptService.ts`, zero BRs** entre 165 catalogadas — incl. criação de bem patrimonial **com valor contábil**, sem âncora normativa e sem OWNER |
| `AUD-T01-01` | HIGH | T-01 | **CONFIRMED** (R2) | `POST /api/items` grava **saldo de estoque sem movimento, sem log, em `operate`**, e o valor vai ao produto gêmeo — que é o saldo que o MRP lê. **A invariante existe: o caminho de update foi deliberadamente fechado** |
| `T-05-07` … `-11` | MEDIUM ×5 | T-05 | PROPOSED | crosswalk em **4 implementações independentes** com divergências já materializadas; plaqueta por contagem sob UNIQUE; `patrimonio` sem permissão; espelho sem audit log; **divergência produto→item ilimitada, silenciosa e sem detector** |
| `T-05-12`, `-13` | LOW ×2 | T-05 | PROPOSED | capacidade transacional morta em `SequelizeProductRepository`; check-then-act fora da transação ⇒ 500 em vez de 409 |
| `AUD-T01-04` … `-07`, `-09`, `-11` | 2 MED + 4 LOW | T-01 | PROPOSED | validação de borda ausente em `categories`/`departments` (estouro ⇒ **HTTP 500**); params não validados em 7/12; dupla sanitização de busca; 409×422; `directorate_id`/`cost_center_id` não expostos; unicidade **sensível a caixa** |
| `AUD-T01-10` | INFO | T-01 | **CONFIRMED** | `POST /api/items/:id/estrutura` **sempre falha por desenho** — **converge com o `FALSE_POSITIVE` de `T11-F10`** |

---

### **G-06 — Trilha de auditoria: existência, imutabilidade e fidedignidade**
**Causa-raiz:** *a escrita do audit log mora fora de qualquer módulo, sem repositório, sem use case e
sem camada de domínio — de modo que a regra "audit log não se atualiza nem se apaga" não tem onde
morar no código.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| **`FIND-ERP-002`** | HIGH | discovery | **ÂNCORAS_VÁLIDAS** (RA-01, com varredura própria); **segunda voz de T-03 CONFIRMA o mérito e RETIFICA a premissa** | O finding afirma que `evok_app` é a credencial de runtime — **incorreto**: é `evok_admin`, **superusuário**. **A retificação AGRAVA:** trigger nas 3 tabelas é necessário e **insuficiente** enquanto a runtime for superusuário. **CONFIRMADO POR CATÁLOGO** (`DYN-T03-03`: `rolsuper = true`; `DYN-T03-04`: zero triggers) |
| `AUD-DB-01` | HIGH | T-03 | **CONFIRMED** (R2) + **catálogo** | a role de privilégio mínimo **existe, está correta e está desligada**. **Agravante novo:** `ALTER DEFAULT PRIVILEGES` ⇒ **toda tabela futura nasce alterável/apagável** |
| `AUD-DB-02` | HIGH | T-03 | **CONFIRMED por convergência** | trilha **best-effort e estruturalmente não-transacional**: 362/362 call sites não aguardam; fallback em `logs/`, que **não é volume** ⇒ morre no recreate; webhook de alerta **vazio por padrão** |
| `AUD-DB-03` | HIGH | T-03 | **CONFIRMED** | 13 módulos com escrita e zero `logAction`, incl. tier 1 — **C-06**. 327 criações reais ⇒ `audit_logs` com **2 linhas** |
| `AUD-T01-02` | HIGH | T-01 | **CONFIRMED** (R2) | **C-06**; dedup declarada pela própria trilha: **não é `FIND-ERP-002`** (aquele é UPDATE/DELETE; este é INSERT que nunca nasce) |
| `T18A-F01`…`F09`, `F11` | MEDIUM ×10 | T-18-A | PROPOSED | **sobrescrita de ID falsifica o log** em contratos, LGPD (incl. decisão de comunicação à ANPD), contencioso, PI e produção; `supplier_id` de advogado externo **sem whitelist e sem log algum**; **`created_by` de ato societário falsificável** |
| `AUD-DB-04` … `-09` | MEDIUM ×6 | T-03 | PROPOSED | `entity_id integer` **não representa PK UUID** (4 entidades tier 1); paginação sem teto ⇒ `?limit=999999` extrai a trilha inteira; **correlation ausente**; `authorize(role)` nega 403 **sem log** (e são as 2 rotas da própria trilha); **dado pessoal verbatim** em 39 ocorrências/30 arquivos; soft delete **confirmadamente ausente** |
| `T12-H04` | HIGH | T-12 | PROPOSED | LGPD: escrita verbatim de CPF **e** as 6 leituras **não auditadas**. Contraste no mesmo repositório: `absenceController.ts:81` monta campo a campo e **omite o `cid`** |
| `T13-F09` | MEDIUM | T-13 | PROPOSED | `ON DELETE SET NULL` em `audit_logs.user_id` ⇒ apagar usuário **anonimiza retroativamente** suas ações. Mitigante **incidental**: `inventory_movements` é `RESTRICT` |
| `AUD-DB-10`, `-11` | LOW ×2 | T-03 | PROPOSED | contradição documental (`DATABASE.md` diz 15 e 24 valores na mesma seção — **`DYN-T03-01` resolveu: são 24**); FK `SET NULL` com desnormalização compensatória |
| `T19-F09` | MEDIUM | T-19 | PROPOSED | concern de auditoria em duas camadas; a minoritária quebra o isolamento de framework |

---

### **G-07 — Mass assignment, sobrescrita de ID e ordem de spread**
**Causa-raiz:** *o padrão `{ id: req.params, ...req.body }` tem DOIS defeitos independentes — mass
assignment de campo e sobrescrita do próprio alvo — e a defesa existente (whitelist de valores no use
case), presente na maioria dos 21 pontos, fecha apenas o primeiro. Em nenhum dos 21 pontos o
repositório aplica whitelist própria.*

| ID | Sev. | Trilha | Status |
|---|---|---|---|
| `T18-F01` | HIGH | T-18 | **CONFIRMED** (T-25 R1, fechado ponta a ponta por T-18-A) — contorna a alçada de aprovação de contratos **e** falsifica o log |
| `T18A-F10` | HIGH | T-18-A | PROPOSED — **bypass de autorização por posse** (ver G-03) |
| `T18A-F01`…`F09`, `F11` | MEDIUM ×10 | T-18-A | PROPOSED (ver G-06) |
| `T16-F04` | MEDIUM | T-16 | PROPOSED — **duas explorações concretas**: atribuição de chamado forjável por **ordem de spread invertida**, e chamado forjado como "gerado pelo sistema" em rota aberta a **qualquer autenticado**. O mesmo arquivo faz certo 37 linhas antes |
| `T12-M08` | MEDIUM | T-12 | PROPOSED — `sst` (75 endpoints) **sem uma única camada de validação de esquema**; `rh`, do mesmo tier e mesma onda, tem 5 validadores Zod `.strict()` |

**Conformidade registrada com o mesmo peso:** mass assignment **AUSENTE** nos 12 endpoints de escrita
do tier 1 (T-01 §4), e `registerImportTrackingSchema` de `comex` é `.strict()` com **dupla proteção**
(ordem correta do spread **e** rejeição no `safeParse`).

---

### **G-08 — Integridade de dados no schema declarado**
**Causa-raiz:** *as invariantes de quantidade e de unicidade foram escritas para as tabelas do schema
legado PT (hoje `DEPRECATED`) e não foram migradas para as tabelas vivas; e a fonte de schema fixada
pelo plano está defasada em relação às migrations do próprio `AUDIT_COMMIT`.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| `T13-F02` | HIGH | T-13 | **CONFIRMED por convergência** | `uq_mrp_sem_duplicidade` **inócuo por NULL** — a constraint cujo nome é "sem duplicidade" não impede duplicidade na linha sem documento de origem. **O padrão correto já existe no repositório** em duas formas |
| `T13-F03` | HIGH | T-13 | **CONFIRMED por convergência** | **C-08** |
| `T13-F01` | **MEDIUM** ⇩ | T-13 | **CONFIRMED**, rebaixado (§3.2) | **10 FKs para `production_orders`, nenhuma `RESTRICT`** |
| `T13-F04` | **MEDIUM** ⇩ | T-13 | **CONFIRMED**, rebaixado (§3.2) | `BR-FIN-003` **sem contrapartida no banco** |
| `T13-F05` | MEDIUM | T-13 | PROPOSED | **7 tabelas vivas sem model e sem nenhuma referência em `server/src`** — incl. uma com sanitizador LGPD implementado (`RF-RH-072`) para tabela que **nenhuma camada acessa** |
| `T13-F06` | MEDIUM | T-13 | PROPOSED | guarda de drift **unidirecional** (não testa "model exige × banco permite", que é a direção que interessa) e **pulável em silêncio** sem banco. **`OBS-R3C-01` a REFORÇA** com um terceiro eixo: **baseline × migrations** — ver §5 |
| `T13-F07` | MEDIUM | T-13 | PROPOSED | **as invariantes de quantidade protegem `ordens_producao` e `movimentos_estoque` (DEPRECATED) e não `production_orders` e `inventory_movements` (vivas)**. ⚠ confiança sobre a afirmação de ausência: **MÉDIA-ALTA** (§5) |
| `T13-F08` … `F11` | MEDIUM ×4 | T-13 | PROPOSED | BOM sem unicidade `(product_id, revision)` — **`production_routes` tem os dois índices, BOM tem um**; `audit_logs` FK; `sst_matriz_epi` **única exceção CASCADE** entre todas as FKs para `departments`, e é a matriz de EPI (NR-6); schema declarado ≠ efetivo |
| `T13-F12` | LOW | T-13 | PROPOSED | 6 FKs redundantes, ≥7 índices idênticos, 5 unicidades duplicadas, 1 índice com nome enganoso |
| `T11-F05` | MEDIUM | T-11 | PROPOSED | rótulo de revisão único **declarado no schema e guardado fora da transação** |
| `T12-H03` | HIGH | T-12 | PROPOSED | CAT sem `UNIQUE(acidente_id, tipo)` **e imutável por trigger** ⇒ o erro é **irreversível** |

**FKs sem índice: 190 de 459 (41,4%), enumeradas nominalmente.** ~120 são colunas de autoria/aprovação
⇒ todo `DELETE`/`UPDATE` de PK em `users`/`employees` varre integralmente ~120 tabelas segurando lock.
**Isso é evento de indisponibilidade, não lentidão.**

---

### **G-09 — Motor de MRP × motor de BOM: a regra que atravessa dois módulos**
**Causa-raiz — parcialmente LACUNA, registrada como tal:** o padrão é *"a regra que atravessa dois
módulos fica sem dono de código (T-11/T-19) e sem BR-ID (T-14)"*. **O que NÃO se sabe** é se a
divergência entre os dois motores é defeito ou decisão: **não existe documento, comentário ou teste que
declare que o planejamento deva ignorar a regra de parada que a produção aplica.** T-11 classificou
como defeito **por ausência de declaração em contrário** — e registro que essa é uma inferência
legítima, não uma prova de intenção. **Lacuna de causa-raiz: aberta, decisão humana.**

| ID | Sev. | Trilha | Status |
|---|---|---|---|
| `T11-F01` | HIGH | T-11 | **CONFIRMED** (R2, leitura própria) — MRP explode bruto **sem netagem por nível**; recompra componente de subconjunto já em estoque. **Achado novo, fora do `BR_CATALOG.md`** |
| `T11-F02` | HIGH | T-11 | **CONFIRMED** (R3-B) — lote mínimo e estoque de segurança lêem **a mesma coluna**, com efeito **duplo e cumulativo**. Existe **teste de caracterização que congela o defeito** — torna-o reproduzível sem banco |
| `T11-F03` | HIGH | T-11 | **CONFIRMED** (R2) — `is_phantom` **não é sequer projetado**; o MRP não enxerga o campo que decide a profundidade. **T-13 confirma que a coluna EXISTE no schema ⇒ defeito de código, não de banco** |
| `T11-F04` | HIGH | T-11 | **CONFIRMED** (R3-B) — 4 implementações, 2 respostas, **método da entidade morto** (1 definição, 0 chamadas). Nenhuma `CHECK` no banco unifica |
| ~~`T11-F10`~~ | ~~HIGH~~ | T-11 | **FALSE_POSITIVE** (§3.1) |
| `T11-F06`, `F07`, `F08` | MEDIUM ×3 | T-11 | `BomService` não aceita transação externa (**C-14**); **OP não registra contra qual revisão de BOM rodou** — a identificação que a regra `G1-BOM-REV-DUP` promete **não é persistida em lugar nenhum**; explosão sem teto de profundidade **num motor e com teto no outro** |
| `T19-F03` | HIGH | T-19 | **CONFIRMED** (R2) — **ciclo `items ⇄ mrp`**, com o insumo de discovery afirmando que não existe. `items` é tier 1/PRODUÇÃO e `mrp` é não-produção |
| `T11-OBS-01` / `T14-F08` | INFO | T-11 / T-14 | **a premissa herdada do passo 30 está REFUTADA**: os dois motores leem a **mesma** tabela. `BR-PP-016b` **muda de fundamento e sobe de confiança**. Os 47 testes de caracterização continuam válidos como congelamento — **cai a explicação, não a medição** |

**Prova dinâmica que falta: `DYN-T11-A` é a prova que fecha o "pronto quando" de T-11** — diff das duas
explosões sobre o mesmo fixture. Hoje é **tecnicamente possível**, ao contrário do que o passo 30 concluiu.

---

### **G-10 — Financeiro: baixa de título, atomicidade cross-módulo e projeção de caixa**
**Causa-raiz:** *a regra de baixa está reescrita em 7 lugares sem serviço de domínio, e o contrato do
repositório financeiro não prevê transação — de modo que a atomicidade cross-módulo é estruturalmente
impossível e não é corrigível no call site.*

| ID | Sev. | Trilha | Status | Nota |
|---|---|---|---|---|
| `AUD-SERVICE-1` | HIGH | T-07 | **CONFIRMED** (R2) | **título parcialmente pago SOME da projeção de caixa** — o dado que o próprio código chama de "decisão do CFO". O comentário do autor raciocina sobre `'paid'` e **não menciona `'partial'`**, embora esteja no mesmo enum |
| `AUD-SERVICE-2` | HIGH | T-07 | **CONFIRMED** (R2) | canônico de **D-06**; **C-12** |
| `AUD-SERVICE-3` | HIGH | **T-07** (atribuição corrigida, §3.5) | **CONFIRMED** (R3-B) | contrato de **domínio** também não prevê transação ⇒ é **fronteira de arquitetura**. Os adapters cross-módulo **nem aceitam** o parâmetro, e a via alternativa é **proibida por desenho**. *"O consumidor está encurralado"* |
| `AUD-SERVICE-4` … `-8` | MEDIUM ×5 | T-07 | PROPOSED | baixa reimplementada **5×** e saldo devedor **7×**, com **divergências já materializadas**; 4 caminhos de escrita em `accounts_payable` com validação de entidade em **1**; **audit log registra `paid` e valor de face em pagamento parcial** — e é o **único registro** de que a baixa individual existiu; dedup CNAB **fora** da transação; **zero segregação** |
| `AUD-SERVICE-9`, `-10` | LOW ×2 | T-07 | PROPOSED | numeração `LC-{COUNT+1}` (limitação **declarada** pelo autor); read-then-write sem lock em centro de custo |
| `T14-F03` | HIGH | T-14 | PROPOSED | **a única regra do catálogo decidida por humano é a única sem implementação.** Restrição de projeto sobre a remediação do CASE-001: **remediar rejeitando nova baixa sobre `partial` VIOLARIA `BR-FIN-003`** |
| `T13-F04` | MEDIUM ⇩ | T-13 | ver G-08 | o banco não oferece a chave que a regra exige |
| `T20-F03` | MEDIUM | T-20 | **CONFIRMADO POR EXECUÇÃO** | bug de fuso horário em `GetCashFlowProjectionUseCase` — **`expect(...).toBe(1000)` recebeu `0`**. Passa de "confiança ALTA por leitura estática" para confirmado |
| `T17-F04` | MEDIUM | T-17 | PROPOSED | canônico de **D-01** — 8 endpoints inalcançáveis; **5 tabelas existem no schema e nenhum caminho alcançável as escreve**; **zero cobertura de teste** em toda a cadeia; `treasury.ts:11-13` declara a conciliação CNAB "real e funcional" |

**Refinamento de mérito devolvido pela T-07, com peso de resultado de auditoria (registro obrigatório):**
*"A guarda de status não é o defeito — a ausência de chave de negócio é. Aceitar segunda baixa parcial
sobre título `partial` é o comportamento **legítimo** que `BR-FIN-003` protege."* Varredura de
`idempot*` em `server/src`: **34 arquivos, nenhum** em `financial`/`treasury`/`accounting`/`budget`.
**O padrão exigido já existe no repositório** (dedup por `(purchase_id, invoice_number)` dentro da
transação) — fato observado, **não desenho de solução** (Regra 6).

---

### **G-11 — Governança de rastreabilidade: BR, REQ, UC, AC, TC, ADR, PROC, OWNER**
**Causa-raiz — parcialmente LACUNA:** medida e nomeada por **duas trilhas com métodos disjuntos**
(T-14 do código para cima; T-15 do requisito para baixo): **a fronteira entre módulos é onde a
documentação de todos os níveis desaparece simultaneamente.** O que **não** se sabe, e é **decisão
humana**, é o esquema canônico de ID e o OWNER por área — **165 de 165 regras e 90 de 90 requisitos
sem OWNER, nenhum preenchido, sugerido ou inferido** (G9).

| ID | Sev. | Trilha | Nota |
|---|---|---|---|
| `T15-F06` | HIGH | T-15 | **6 elos com ZERO instâncias no ERP** ⇒ **0 cadeias completas, estruturalmente impossíveis**, independente da qualidade do código. Viola a Regra 17 para 5 dos 11 tipos de ID |
| `T15-F03` | HIGH | T-15 | **a causa-raiz nº 1 do passo 29 está factualmente refutada na forma forte** — 88 fichas, 456 refs, 18 `rule:'BR-…'` em produção. A varredura que fundou a causa-raiz **não leu `docs/business`** |
| `T15-F04` | HIGH | T-15 | **colisão semântica no namespace canônico** — o único código que emite `BR-JUR-003` implementa a regra do **aditivo**, enquanto o catálogo canonizou o ID para a **alçada**, que o código identifica como `RF-JUR-003`. **O esquema produz colisão por construção** |
| `T15-F08` | HIGH | T-15 | **domínios inteiros sem elo REQUISITO** — `accounting`/`budget`/`treasury` (58 endpoints) e `items`/`categories` (PRODUÇÃO REAL, 327 registros) |
| `T14-F05` | HIGH | T-14 | **≥26 regras vivas sem BR-ID** — agregador declarado (§2.3) |
| `T14-F03` | HIGH | T-14 | ver G-10 |
| `T15-F01`, `F05`, `F07`, `F09` | MEDIUM ×4 | T-15 | população dos "89 requisitos" **não enumerável nem internamente consistente**; SSOT de UC com lacunas e reuso; **44 de 90 RFs sem elo UC**; **elos falsos** na única contagem positiva do discovery ⇒ **3, não 7** |
| `T14-F01`, `F02`, `F06`, `F07` | MEDIUM ×4 | T-14 | 3 BR-IDs com **âncora não rastreável** (uma delas impediu decidir status); `fail-open`; **2 BRs incompletas em direção perigosa** — descrever como guardada uma transição desguardada **induz o remediador a não olhar ali**; `BR-CAD-009` com exceção silenciosa **e** par declarado que nunca executa |
| `T15-F02`, `F10`; `T14-F04`, `F09` | LOW ×4 | T-15/T-14 | plano aponta para artefato inexistente; baseline de requisitos ancorada em commit diverso; 5 âncoras na linha vizinha; **norma inline falsa gravada no próprio audit log** |
| `T19-F05` | MEDIUM | T-19 | **zero ADR, `architecture/` inexistente**; as 8 "decisões implícitas" do discovery **não podem ser confrontadas com nada** |
| `T23-F01`, `F04`, `F05` | 2 MED + 1 LOW | T-23 | ADR ausente para a camada legada; SSOT de UC com lacunas **e colisão auto-declarada** (o que **reduz, não elimina**, a severidade); fence Markdown não fechado |
| `AUD-PROC-T09-06` | LOW | T-09 | **zero arquivos BPMN no repositório inteiro**; a matriz desenho×implementação teve de **eleger** o contrato de API como desenho autoritativo — **eleição do auditor, não decisão registrada** |

**Convergência de duas trilhas independentes, registrada como evidência (Regra 20), não coincidência:**
T-14 (código→cima) e T-15 (requisito→baixo) chegaram ao mesmo veredito: **o elo rompido é `BR ↔ REQ`,
e rompe do lado do requisito** — **0 de 90 RFs citam um BR-ID**.
**Divergência aberta `ESC-T15-05`:** T-14 e T-15 mediram **espaços de busca diferentes** (o catálogo ×
o corpus versionado externo). **Os dois resultados são fatos verdadeiros; as conclusões é que são
incompatíveis.** T-15 registrou o não-conflito com precisão lógica: uma busca confinada ao arquivo
**não pode** sustentar conclusão sobre o namespace. **Nenhuma das duas cede. Encaminhado ao dono**, por
tocar `APR-2026-019`.
**Divergência de contagem aberta `RES-T15-02` (reaberta e agravada):** T-14 mediu **165**; o
`AUDIT_COMMIT` tem **164** — `BR-FIN-003` entrou por commit **posterior**. Se o universo for 164, a
classe "NÃO IMPLEMENTADA" **desaparece do `AUDIT_COMMIT`** e `T14-F03` muda de estatuto (de achado
sobre o objeto auditado para achado sobre norma posterior a ele). **O mérito quanto ao risco de
remediação do CASE-001 permanece intacto; o que muda é contra qual baseline ele é medido.** **Decisão
de escopo — do director** (Regras 12-14).

---

### **G-12 — Contrato de API**
**Causa-raiz:** *não existe regra de contrato escrita — nem para 409×422, nem para versionamento, nem
para o envelope de erro — e a documentação-título omite metade da superfície sem se declarar parcial.*

| ID | Sev. | Trilha | Nota |
|---|---|---|---|
| `T17-F01` | HIGH | T-17 | **envelope de erro bimodal**: `error` é string em umas respostas e objeto em outras, na mesma semântica HTTP |
| `T17-F02` | HIGH | T-17 | **GET com efeito patrimonial** + 3 portas de alçada incompatível — **C-05** |
| `T17-F03` | HIGH | T-17 | **paginação sem teto em ~108 de 111 listas**; o helper que impõe o teto tem **ZERO chamadores** |
| `T23-F03` | HIGH | T-23 | `API.md` omite 348/676 — **DIV-SEV-01 aberta com `T17-F05` (MEDIUM)** |
| `T17-F05` … `F08` | MEDIUM ×4 | T-17 | documentação fragmentada em 7 arquivos sem índice; **ausência total de versionamento** + duas declarações de versão contraditórias, **com consumidor externo confirmado**; webhook público **vaza mensagem de exceção crua**; `batch` sem limite, sem idempotência e sem identificador de lote |
| `T17-F09` | LOW | T-17 | **não existe regra que discipline 409 × 422** — 73 `ConflictError` × 326 `BusinessRuleError`, sem norma escrita |
| `T12-M01` | MEDIUM | T-12 | item 3 do `FIND-ERP-007`: **requisito ambíguo, não bug de mapeamento** |
| `AUD-T01-07` | LOW | T-01 | **mesma classe em outro módulo** — reincidência que prova que o defeito é de contrato |
| `T16-F03` | MEDIUM | T-16 | canônico de **D-05** |
| `T22-F02` | MEDIUM | T-22 | **nenhum compose é validado pelo CI** ⇒ corrigir o valor não impede a recorrência |

**Divergência de inventário não resolvida:** 673 (T-04) × 676 (T-17) × 683 handlers (T-17). Depende de
uma **definição** de "endpoint" que ninguém fixou. **Escalado, não arbitrado.**

---

### **G-13 — Compliance regulado sem enforcement (LGPD, eSocial/SST, NR-33/35, CLT)**
**Causa-raiz:** *o sistema implementa o **registro** da obrigação e não o **efeito** dela; e não existe
agendador algum no `server/src`, embora o próprio código pressuponha jobs que não existem.*

| ID | Sev. | Trilha | Nota |
|---|---|---|---|
| `FIND-ERP-006` | HIGH | discovery | **ÂNCORAS_VÁLIDAS** (RA-03, dirigida). **Agravado por T-12** com evidência própria em 4 eixos |
| `FIND-ERP-008` | HIGH | discovery | **ÂNCORAS_VÁLIDAS** (RA-05, server **e** client). **Agravado por T-12 com 4 fatos novos** e **confirmado por leitura independente de T-21** |
| `T12-H01` | HIGH | T-12 | **resolver pedido de titular é atestação pura** — nenhum dos 8 tipos produz efeito. Pedido de exclusão (art. 18, VI) encerrado como **atendido** com o dado íntegro. *"O registro de conformidade passa a ser prova documental de um atendimento que não ocorreu — pior do que a ausência do módulo"* |
| `T12-H02` | HIGH | T-12 | **fila eSocial é write-only**: os 3 estados terminais **não têm produtor**; `RF-SST-043` é **inimplementável como escrito**; `POST /esocial-events/:id/resend` exige precondição que o sistema **nunca consegue produzir** |
| `T12-H03` | HIGH | T-12 | CAT tipo × gravidade + **4 fatos novos**: a UI é o único caminho e é o errado; **a suíte congela a combinação proibida como sucesso**; **o erro é irreversível** (trigger); guarda de duplicidade **sem lastro** (sem transação, sem UNIQUE) |
| `T12-H04` | HIGH | T-12 | ver G-06 |
| `T12-M02` … `M07` | MEDIUM ×6 | T-12 | retenção **sem parser, sem consumidor e sem agendador** (**prova negativa exaustiva**: zero agendador em `server/src`); incidente sem prazo, sem notificação e **sem coluna de fato** ⇒ *"comunicar à ANPD é, em todo o sistema, uma string"*; **DPO é o próprio requisitante por default**; prazo de 15 dias generalizado além da fonte legal; **atender é `operate`, negar é `approve`** — alçada invertida; PT **não expira** e encerramento **sem autor** |
| `T12-M09` | MEDIUM | T-12 | 17 BRs para 149 endpoints de escopo regulado; 3 regras legais (CLT 477 §6º, Lei 12.506/2011) **sem BR** |
| `T12-L01` … `L05` | LOW ×5 | T-12 | 2 campos-fantasma; `requireSstOrRh` **não audita a negativa**; **docstring falso** em arquivo de controle de dado de saúde; feriados ignorados no prazo legal da CAT |
| `FIND-ERP-007` | MEDIUM | discovery | **ÂNCORAS_VÁLIDAS** (RA-04). Ver §6.2 |

**Conformidades registradas com o mesmo peso:** segregação de campo de saúde (`cid`) por **interseção
AND** de módulos, aplicada nas 5 rotas, **com omissão de campo em vez de 403** — desenho correto e
efetivamente ligado; `hr_employee_contracts`, `sst_acidentes` e `sst_cats` com travas de imutabilidade
**no banco**; conclusão de admissão/demissão genuinamente transacional com gates de ASO e devolução de
ativos; correção documentada de bug real de subestimação de aviso prévio.

---

### **G-14 — Plataforma, cadeia de custódia de artefato e arquitetura**
**Causa-raiz:** *o CI valida com rigor real e **não custodia** o artefato validado; e o acoplamento do
sistema é vertical em direção a um centro que nenhum módulo possui — centro que é a **arquitetura
intencionada**, sancionada pelo diagrama versionado, não drift.*

| ID | Sev. | Trilha | Nota |
|---|---|---|---|
| `T22-F01` | HIGH | T-22 | **CONFIRMED** (R2) — **a imagem que o CI aprova nunca é a imagem que sobe**. Zero cadeia de custódia commit→produção |
| `T22-F05` | HIGH | T-22 | **CONFIRMED** (R2) — **zero pipeline para `client`/`mobile`/`tv`**; a suíte vitest do `client` **existe e é sistematicamente ignorada**. *"Mais grave que ausência de teste"* |
| `T19-F01` | HIGH | T-19 | **CONFIRMED quanto ao padrão** (R2) — 148 arquivos dependem de `services/`, 140 de `models/`, contra ~40 arestas entre módulos. **É onde as 5 trilhas independentes ancoraram** |
| `T19-F02`, `F03` | HIGH ×2 | T-19 | ver G-02 e G-09 |
| `T19-F04`, `F06`…`F10` | MEDIUM ×6 | T-19 | fronteira pública de módulo **não existe** (7 controllers instanciam infraestrutura concreta de 6 módulos); `domain` faz **I/O de banco** em `ti`, e a regra afetada é **elegibilidade de aprovador**; **170 instanciações em 105 de 106 controllers, zero composition root**; `fiscal` **não possui as rotas nem a chave de autorização das próprias operações**; 20 arquivos de `application/` falam direto com o ORM |
| `T19-F11` | LOW | T-19 | `app.ts` fora de `server/src/`, com ordem de linhas semanticamente carregada |
| `T22-F03`, `F04` | MEDIUM ×2 | T-22 | human gate **apenas documental**, sem controle técnico (sobe para HIGH no dia em que houver servidor de produção); **`app_uploads` sem qualquer automação de backup**, apesar de reconhecido como necessário no próprio compose |
| `T20-F01`, `F02` | MEDIUM ×2 | T-20 | suíte de integração inteira roda **verde-sem-verificar** fora do único caminho com guard; 16/17 rotas RBAC críticas sem E2E real |
| `T18-F08` | MEDIUM | T-18 | `OBS-INV-08` reenquadrado: a divergência de majors é real, **mas o achado é outro — não existe contrato compartilhado** |
| `T18-F10`, `F12` | LOW ×2 | T-18 | tabela de magic bytes fraca em 3 pontos; `.JSON` na whitelist é código morto |
| `T21-F01` | MEDIUM | T-21 | ver §2.5 — **não adjudicado** |
| `T16-F05` … `F15` | 6 MED + 8 LOW | T-16 | atomicidade e concorrência em `facilities` (docstring afirma transação única onde não há); **GETs que escrevem** mutação de status com efeito legal, sem transação e **sem auditoria**; máquinas de estado sem guarda em 4 atos; duplicação verbatim; recurso aninhado com `:assetId` **decorativo**; 2 `catch {}` **sem registro algum**; prazo legal derivado de env **sem validação** ⇒ `RangeError` ⇒ 500 em toda criação de multa; dois padrões estruturais no mesmo módulo |

**Conformidade registrada com o mesmo peso, e é substancial:** `comex` é o módulo mais bem construído
do tier 3 — segregação nomeada, lock antes de decidir, gate de status, unicidade de papel, papel
resolvido **só** por RBAC, transação com rollback em **todas** as 5 escritas, e reuso do serviço
compartilhado em vez de duplicação. `RES-T16-06` foi fechado por leitura integral **sem gerar um único
achado**: gate pré-escrita, lock consistente, **congelamento de valores monetários no evento gateado**,
schema `.strict()` com dupla proteção. `reports` resiste em todas as dimensões — SQL **sempre**
parametrizado, injeção de fórmula em CSV **neutralizada**, escape RFC 4180 correto.

---

## 5. `OBS-R3C-01` — determinação de impacto (item 4 do mandato)

**Tratado integralmente em `24-coverage/AUDIT_COVERAGE_EXECUTED.md` §6, com a tabela finding a finding.
Síntese para este documento:**

- **O fato:** `00_baseline_frozen.sql` — fonte de schema fixada pelo `AUDIT_PLAN.md:612` — foi congelado
  entre `…-000032` e `…-000039`; **9 migrations do próprio `AUDIT_COMMIT` estão fora dele**.
- **Reconciliação própria:** o conjunto que a Rodada 3-C descreve é **exatamente** o que T-13 §2 já
  havia enumerado nominalmente. **Não há divergência entre as duas** — há uma consequência
  metodológica que nenhuma tinha extraído por inteiro.
- **Determinação de impacto:** **10 dos 12 findings de T-13 NÃO herdam a fragilidade** (o objeto não é
  tocado pelas 9 migrations, ou a varredura complementar foi de fato executada, ou a âncora não é o
  baseline). **2 herdam**: `T13-F07` (confiança sobre a afirmação de ausência rebaixada de **ALTA para
  MÉDIA-ALTA**; custo de fechar: **1 grep**) e, em grau menor, `T13-F09`.
- **`T13-F06` não herda — é REFORÇADO.** Sua âncora é o arquivo de teste, não o baseline. `OBS-R3C-01`
  acrescenta um **terceiro eixo de drift** que a guarda também não cobre: **baseline × migrations
  versionadas**. A guarda compara *model × banco*; **ninguém compara baseline × migrations**.
- **Fora de T-13:** `T-05-02` (fechado por dupla fonte: baseline **e** models), `T11-F05` (migration
  lida integralmente), `T08-F10` (**fechado por catálogo** via `DYN-T08-02`) e `T12-H03` (`sst` não é
  tocado) **não herdam**.
- **A conclusão correta, sem exagero em nenhuma direção:** a âncora prova **o que o baseline contém**;
  não prova **o que o schema versionado completo contém**. Onde a varredura complementar foi feita, o
  finding está fechado. Onde não foi, o custo de fechar é de um grep. **Nenhum finding de T-13 está
  errado por causa disso.**

---

## 6. ITENS QUE EXIGEM DECISÃO HUMANA OU DE OUTRA AUTORIDADE

### 6.1 `OBS-R3A-01` — tratado como **HIPÓTESE A VERIFICAR**, nunca como evidência fechada

**A contradição aparente, registrada pelo validador:** `bom-tipo-nao-produtivo.test.ts` cria um item
mestre por `POST /api/items` (tipos `ATIVO_IMOBILIZADO`, `USO_E_CONSUMO`, `MATERIA_PRIMA`) e **em
seguida** cria por `POST /api/products` um produto com **exatamente o mesmo `code`**, exigindo **HTTP
201**. Pelo código lido: `POST /api/items` chama `ensureProductMirrorForItem`, os três tipos estão
mapeados, logo o produto gêmeo **já deveria existir**; `CreateProductUseCase` recusa código repetido
com `ConflictError` e `products.code` é `UNIQUE` no schema.

> **As duas leituras não podem ser simultaneamente verdadeiras em execução: ou essa suíte de CI está
> vermelha, ou o espelho não está criando o gêmeo nesse caminho.**

**O cruzamento que o orquestrador forneceu, e o tratamento que lhe dou:** o registro do CASE-002 da
SanaCore lista `bom-tipo-nao-produtivo` entre as falhas de integração remanescentes, o que **sugere**
que a suíte está vermelha. **Trato isso estritamente como HIPÓTESE, pelas seguintes razões, cada uma
suficiente sozinha:**

1. **Foi observado em outra branch** (worktree SanaCore, `sana/ERP-LEGACY-001/FIND-ERP-005`, commit
   `67b49fb`, **não ancestral** do `AUDIT_COMMIT`) e **não foi reexecutado aqui**.
2. **Origem SanaCore não carrega autoridade de auditoria** (Regra 3; EMENDA-01 §A). Vale como **origem
   de hipótese**, jamais como prova.
3. **O ambiente de prova está contaminado** — o banco de teste carrega uma migration da própria branch
   SanaCore não mesclada (`AUDIT_COVERAGE_EXECUTED.md` §8.6). Uma falha de integração observada nesse
   ambiente **pode ter causa no ambiente**, não no código do `AUDIT_COMMIT`.
4. **O próprio validador declarou não poder arbitrar sem execução**, e o regime read-only me proíbe de
   executar.

**Se a hipótese se confirmar pelo segundo ramo** (o espelho **não** cria o gêmeo nesse caminho), o
impacto recai sobre `T-05-05` e sobre `BR-CAD-009` — e, acrescento por leitura própria do corpus,
**convergiria com `T14-F07`**, que já registrou que `BR-CAD-009` **tem exceção silenciosa não
declarada** (retorno `null` para item sem código ou de tipo não mapeado). **Não promovo. Não altero
nenhum finding. Registro como o pedido dinâmico mais barato e mais decisivo que resta:** um único
`POST /api/items` seguido de um `SELECT` em `products` decide.

### 6.2 `FIND-ERP-007` — mérito fechado, **procedimento não verificado**

| Eixo | Estado |
|---|---|
| **Mérito técnico** | **CONFIRMADO — requisito ambíguo, não defeito de mapeamento.** Duas determinações independentes (T-12 e T-17), por métodos disjuntos, **consistentes e bem ancoradas**. T-17 acrescentou a causa de contrato (não existe regra que discipline 409 × 422) e a reincidência independente (`AUD-T01-07`) |
| **Procedimento (`APR-2026-020` Decisão B item 3)** | **NÃO VERIFICADO.** A decisão exigia que o **retorno ao autor de origem** corresse **em paralelo** à determinação independente — não que fosse substituído por ela. T-25 buscou em todo `07-findings/` e nos artefatos de plano e **não encontrou** evidência de que esse retorno ocorreu. **Eu repeti a busca no corpus consolidado e também não encontrei** |
| **Status** | **PERMANECE `NEEDS_MORE_EVIDENCE`.** Não o movo — T-25 declarou explicitamente que não o move, e a pendência procedimental deve ser resolvida **antes** dessa decisão |
| **Escalonamento** | **Ao director:** confirmar se o retorno ocorreu por canal não documentado em `07-findings/`. Se não ocorreu, a Decisão B item 3 permanece **parcialmente pendente**, independentemente do mérito técnico já estabelecido |

### 6.3 Divergências abertas encaminhadas (Regra 20 — nenhuma resolvida por votação)

| ID | Divergência | Encaminhada a |
|---|---|---|
| `DIV-SEV-01` | `T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato (§2.4) | **director** |
| `ESC-T15-03` / `ESC-T15-05` | `BR_CATALOG.md:400` ("nenhuma colisão") × `T15-F04`; espaços de busca disjuntos de T-14 e T-15 | **dono** (toca `APR-2026-019`) |
| `RES-T15-02` | 164 × 165 BRs; efeito sobre o estatuto de `T14-F03` | **director** (escopo, Regras 12-14) |
| `DIV-T09-01` | `FIND-ERP-009` afirma **um único** mecanismo de segregação e **4** call sites; T-09 provou o **5º**, com regra nomeada, **dentro do `juridico`** | **director** → confronto com o autor de origem |
| INV-01 × INV-02 | 673 × 676 × 683 endpoints — depende de uma **definição** que ninguém fixou | **director** |
| `T-05` §5 | dupla alocação de `uploadService.ts` no plano | **desambiguada** por esta consolidação (`AUDIT_COVERAGE_EXECUTED.md` §2); efeito nulo |
| `IN-01` … `IN-08` (T-00) | inconsistências de integridade — nenhuma é finding, nenhuma invalida qualquer dos 7 | registro; **`IN-02`/G6 é defeito na cadeia de evidência da própria auditoria** e vai ao relatório final como tal |
| `PROJECT_STATE.md` §OBS-INV-01 desatualizado (diz 1/7 re-ancorados; o executado é **7/7**) | fora do meu namespace (Regra 16) | **director** — correção por adição rastreável |

---

## 7. OBSERVAÇÕES — **explicitamente NÃO PROMOVIDAS a finding**

**Nenhuma delas recebe ID de finding, severidade ou confiança. Criar finding não é atribuição deste
papel (Regra 6 e mandato).**

| ID | Observação | Herdeiro natural |
|---|---|---|
| **`OBS-T26-01`** | **`js-yaml` HIGH (`CVE-2026-59870`) ativo hoje em `server`**; 21 vulnerabilidades (14 HIGH) em `mobile`; 19 (12 HIGH) em `tv`. Achado **NOVO**, produzido por execução (`npm audit`), **não catalogado em nenhuma trilha** — nenhuma leitura estática de `package.json` poderia produzi-lo (o advisory é de 2026, possivelmente posterior à leitura de T-18) | **T-18** (`vericore-dependency-security-auditor`) |
| **`OBS-T26-02`** | **O banco `erp_evok_audio_test` está contaminado** por migration de branch SanaCore não mesclada e incompleta ⇒ é **compartilhado entre organizações**, não efêmero por execução. Resultados de **catálogo** não são afetados; resultados de **contagem** são | **director** — recriação a partir do `AUDIT_COMMIT` puro antes de qualquer bateria 02 |
| **`OBS-T26-03`** | **O catálogo de pedidos DYN da própria bateria está incompleto**: declara ~103, e a recontagem por trilha chega a ≈137. **As 4 trilhas omitidas (T-04, T-09, T-12, T-14) são exatamente as de autorização, segregação, alçada, LGPD/SST e regra de negócio** | **director** / `vericore-audit-verification-runner` |
| **`OBS-T26-04`** | **`T-08` declara "1 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW, 2 INFO" = 20**, mas a enumeração dos IDs dá **5 LOW e 1 INFO**. O total (20) fecha; a distribuição por severidade **não**. Registro a discrepância aritmética interna; adotei a **enumeração por ID**, não o resumo | **T-08** |
| **`OBS-T26-05`** | **`T-08` tem gap de numeração: `T08-F19` e `T08-F20` não existem.** Não afeta mérito; afeta rastreabilidade de ID (Regra 17) | **T-08** |
| **`OBS-R3B-01`** (acolhida) | `POST /api/items/:id/estrutura` **continua registrada** e o controller **anuncia `res.status(201)`** para caminho inalcançável — superfície morta que documenta um contrato que o código recusa 100% das vezes. Materialidade **baixa** (o comportamento é **seguro por construção**: recusa explícita, com mensagem que aponta a rota correta) | **T-17** |
| **`OBS-R3B-02`** (acolhida) | A frase de lacuna de teste de `T11-F02` deve citar que **existe** teste de caracterização dedicado ao defeito — o que **FORTALECE** o finding (torna-o reproduzível sem banco) e só corrige a afirmação sobre cobertura | **T-11** — correção de redação, sem alterar severidade |
| **`OBS-R3C-02`** (acolhida) | `client.tax_regime` é **parâmetro morto** no cálculo fiscal — declarado na interface e **nunca lido**. Convive com `T23-F02` e **explica a origem provável** do defeito documental | **T-08 / T-14** |
| **`OBS-R3A-03`** (acolhida) | Desvios de citação de baixa materialidade em T-05, todos verificados como inofensivos | registro |
| **`OBS-T26-06`** | **`T16-F15` e `T21-F01` foram encaminhados e nunca adjudicados** (§2.5); `RES-T13-04`/`RES-T13-05` foram escalados ao director e **não têm decisão registrada** | **director** |
| **`OBS-T26-07`** | **A cláusula de reabertura das trilhas de IA (`AUDIT_PLAN.md` §9) NÃO foi acionada por nenhuma das 27 trilhas.** Nenhuma encontrou chamada a modelo de linguagem, embedding, agente autônomo ou decisão não determinística. `intelligentAuditor` recebeu leitura (ainda que rasa) e confirmou-se determinístico. **A dispensa fica mais defensável do que estava — e permanece PROVISÓRIA** (N-14 / G5 aberto) | **dono** (G5) |

---

## 8. PRIORIZAÇÃO PROPOSTA — recomendação técnica, **não decisão** (Regra 6)

**Critério declarado:** (i) severidade consolidada; (ii) ambiente — **PRODUÇÃO REAL** antes de
NÃO-PRODUÇÃO; (iii) **bloqueio de remediação** — o que impede corrigir outra coisa vem primeiro;
(iv) **custo de prova** — o que fecha com 1 comando antes do que exige ambiente completo.

| # | Item | Fundamento |
|---|---|---|
| 1 | **`AUD-AUTHN-01`** (CRITICAL) | Único vetor que **anula todos os demais controles de authZ do sistema**. Ambiente: PRODUÇÃO REAL. Prova: `DYN-T02-01`, a mais barata da fila |
| 2 | **`FIND-ERP-001` + `AUD-INTEG-01`** | Já em remediação (CASE-001). `AUD-INTEG-01` é **pré-requisito técnico**: sem ele, a correção óbvia por UNIQUE é **inócua**. E `T14-F03`/`BR-FIN-003` é **restrição de projeto** sobre essa remediação |
| 3 | **`AUD-INTEG-03`** (CRITICAL) | **Corrupção de dado persistente, não transitória**, em PRODUÇÃO REAL. Já **corroborado por execução**. 3 superfícies irmãs vivas se a correção for restrita à rota do finding |
| 4 | **`AUD-SERVICE-3` → `AUD-SERVICE-2`** | Nesta ordem, obrigatoriamente: *"corrigir `AUD-SERVICE-2` sem `AUD-SERVICE-3` é impossível"* |
| 5 | **`FIND-ERP-005` + `AUD-SEC-T04-01` + `T16-F01` + `T18A-F10`** | Cadeia composta de authZ. **Instrução expressa registrada:** não tocar o middleware compartilhado — mudar o default quebraria 5 rotas de leitura em 4 módulos. A correção é de **call site** |
| 6 | **`T08-F01` + `T24-F01` + `T24-F02`** | CRITICAL fiscais. Contexto: NF-e em NÃO-PRODUÇÃO **hoje** — urgência menor, severidade **inalterada** |
| 7 | **`AUD-DB-01` + `FIND-ERP-002`** | Confirmado **por catálogo**. Trigger é necessário e **insuficiente** enquanto a runtime for superusuário |
| 8 | **`T-05-01` a `T-05-06`** | 6 HIGH em código que **nenhuma auditoria anterior examinou**, sobre módulo tier 1 com 327 registros reais |
| 9 | **`T12-H01`/`H02`/`H03`** | Obrigação legal com prazo, **sem mecanismo algum** — e o erro da CAT é **irreversível** |
| 10 | **`T22-F01` + `T22-F05`** | Sem cadeia de custódia de artefato, **nenhuma correção acima tem garantia de chegar em produção como foi testada** |

---

## 9. LIMITES DESTE AGENTE — declaração explícita

**Exigência do mandato. Declaro sem atenuação.**

### 9.1 Por leitura própria nesta sessão

`CLAUDE.md`; `AUDIT_PLAN.md`; `AUDIT_PLAN_EMENDA_01.md`; `AUDIT_PLAN_EMENDA_02.md`; estrutura da
`AUDIT_COVERAGE_MATRIX.md`; `PROJECT_STATE.md` §OBS-INV-01 (dirigido); **os 27 relatórios de trilha,
os 4 adendos, as 5 rodadas de validação adversarial e a bateria dinâmica**, em `07-findings/`.
**Toda a aritmética** deste documento (247 + 7 = 254; 253 vigentes; conferência por severidade;
placar por trilha; recontagem de ≈137 pedidos DYN) **foi refeita por mim e fecha**.
**Toda a análise de deduplicação de §2** é minha, por comparação de âncoras e enunciados entre
relatórios — **8 famílias marcadas, 6 duplicatas plenas, 14 complementares, 2 agregadores, 2
divergências de severidade**.

### 9.2 Aceito de relato de outra trilha, **sem reverificar**

1. **Toda âncora `arquivo:linha` dos 254 IDs.** **Não abri um único arquivo de `server/src`,
   `client/src`, `server/database`, `server/migrations`, `server/tests`, `docs/` ou `product/` nesta
   sessão. Zero.** Se uma âncora está errada, **este documento repete o erro**.
2. **Todo veredito de mérito do `vericore-finding-validator`** — inclusive o `FALSE_POSITIVE` de
   `T11-F10` e as duas recomendações de rebaixamento. Avaliei a **estrutura da prova** (é interna? é
   fechada? tem contraprova? converge com outra trilha?) e a **consistência com o corpus**; **não reli
   `CreateItemStructureUseCase.ts`, `RemoveProductionOrderUseCase.ts`, `CreateReceivableUseCase.ts`,
   `saleReceivableService.ts` nem `00_baseline_frozen.sql`**.
3. **Toda declaração de cobertura, contagem de superfície e severidade original de cada trilha.**
4. **Toda a evidência de git** (`E1`, `E2`, `E3`, `R-01…R-04`, `A2-01…A2-05`, e o `git diff` desta
   sessão) — coletada pelo **orquestrador**, não por agente VeriCore, com custódia declarada. **Não a
   reexecutei.** Não uso Bash; a regra derivada `IN-08` de T-00 vale para mim: **não faço nenhuma
   afirmação própria de proveniência de commit**.
5. **Todo o conteúdo da bateria dinâmica.** Nenhuma conexão de banco, nenhum teste, nenhum comando.

### 9.3 O que a consolidação **não** pode oferecer

A dedup que apliquei é **sintática** (mesmo objeto, mesma âncora, mesmo enunciado) — **não semântica**.
Dois findings que descrevam o mesmo defeito com âncoras diferentes e vocabulário diferente **podem ter
escapado**. Um erro de contagem, de severidade ou de âncora cometido por uma trilha e não detectado
pelas 5 rodadas de validação **propaga-se integralmente** para este documento. Isso está registrado
como `RES-T26-03` e `RES-T26-04` em `AUDIT_COVERAGE_EXECUTED.md` §9.3.

---

## 10. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado, corrigido ou refatorado (Regra 2). Nenhuma
  escrita em `server/src`, `client/src`, `tests/`, `product/`, `requirements/`, `architecture/`,
  `server/database`, `docs/` ou `coretriad/`.
- Nenhuma evidência histórica pertencente a outra organização foi alterada (Regra 15). Onde alterei
  severidade ou status, a alteração está em §3, com decisão, fundamento e autor da recomendação.
- Nenhum finding novo foi criado (Regra 6). Os achados materiais desta passada estão em §7 como
  **observações explicitamente não promovidas**.
- Nenhuma regra de negócio, requisito ou aprovação foi inventada. Nenhum OWNER foi decidido, sugerido
  ou inferido (G9, `APR-2026-019` parte 2).
- Nenhum finding foi descartado. **1 `FALSE_POSITIVE` e 6 `DUPLICATE` estão marcados com rastreio e
  finding canônico nomeado.**
- **Este documento NÃO declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`
  nem `REMEDIATION COMPLETE`.** Fechamento é autoridade de reteste independente e de gate humano
  (Regras 3, 4, 18). **Nenhum `RETEST_PASSED` e nenhum `FINDING CLOSED` de `FIND-ERP-001` ou
  `FIND-ERP-005` pode sair desta run** — o reteste incidiria sobre commit posterior ao `AUDIT_COMMIT`,
  o que é **delta audit** por definição (Regras 4 e 14).

**Entrega:** ao `vericore-audit-reporting-agent`, com o par obrigatório
`24-coverage/AUDIT_COVERAGE_EXECUTED.md`. **Escalonamentos abertos ao
`vericore-software-audit-director`:** §6.2 (pendência procedimental da `APR-2026-020` B.3), §6.3 (7
divergências não resolvidas) e §7 (`OBS-T26-01` a `OBS-T26-07`).
