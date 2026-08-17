# VEREDITO FORMAL DE AUDITORIA — `ERP-LEGACY-001-AUD-001`

```
RUN:            ERP-LEGACY-001-AUD-001
PROGRAMA:       ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION)
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regra 12)
BRANCH:         audit/ERP-LEGACY-001-AUD-001/2026-08-16
EMISSOR:        vericore-software-audit-director (VeriCore)
DATA:           2026-08-17
GATE HUMANO:    APR-2026-046 (coretriad/governance/APPROVALS.md) — autoriza a EMISSÃO
REGISTRO:       coretriad/governance/HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md, HGR-…-02
NATUREZA:       ato de veredito da VeriCore sobre evidência (Regra 4). Read-only sobre o
                objeto auditado. Zero comando, zero execução, zero conexão de banco.
ESCRITA:        exclusivamente este arquivo e o HUMAN_GATE_RECORD.
```

---

## 1. VEREDITO

> ## `AUDIT_PASSED`
>
> **Veredito de RUN, com limites declarados. Emitido em 2026-08-17 pelo
> `vericore-software-audit-director`, sobre a evidência do `AUDIT_COMMIT`
> `c1311a6f76b512fef893f7e60d934179cae3409f`.**

**O gate humano `APR-2026-046` autorizou a emissão; ele não determinou o conteúdo.** Este
veredito é ato próprio da VeriCore sobre a evidência (Regra 4). Examinei as condições de
conclusão do run uma a uma (§3) e **nenhuma delas está insatisfeita**. Se alguma estivesse, a
recusa fundamentada seria o resultado — e o despacho de `APR-2026-046` a previa expressamente.

---

## 2. O QUE `AUDIT_PASSED` SIGNIFICA AQUI — E O QUE NÃO SIGNIFICA

### 2.1 Significa

**Que o escopo declarado foi cumprido dentro dos limites declarados, com método verificável e
rastreável até o commit auditado.** Especificamente: as trilhas planejadas executaram e
reportaram; a cobertura entregue está medida e o que ficou fora está **nominado**; os findings
CRITICAL e HIGH passaram por refutação adversarial independente (Regra 22); os números do run
fecham nos dois sentidos contra os artefatos de origem; e os erros do próprio processo estão
publicados.

### 2.2 NÃO significa — em texto explícito, porque esta frase precisa estar no documento

**`AUDIT_PASSED` NÃO significa que o sistema está correto.**

**`AUDIT_PASSED` NÃO significa que o sistema está pronto para produção.**

Não significa, ainda:

- que os defeitos encontrados foram corrigidos — **nenhum finding deste run foi fechado**;
- que o que não foi auditado está íntegro — significa apenas que **está nomeado**;
- que a cobertura foi integral — **não foi**, e o déficit está medido (§4);
- que os MEDIUM, LOW e INFO do corpus foram validados — **não foram**
  (`RES-T46-02`; `RELATORIO_EXECUTIVO.md` §15 item 7);
- que o gate `G3` foi cumprido — ele está **`REDUCED_BY_DECISION`** (`APR-2026-043` D1),
  reduzido por decisão humana registrada pela via do `G8`, **não** cumprido e **não** contornado;
- que qualquer remediação foi aceita — **`REMEDIATION COMPLETE` é autoridade da SanaCore e este
  veredito não a declara, não a ratifica e não a supre.**

**A frase que resume o veredito:** *o que foi examinado foi examinado com método; o que não foi
examinado está nomeado.* Nada além disso é declarado aqui, e nada além disso pode ser inferido
deste documento.

---

## 3. CONDIÇÕES DE CONCLUSÃO — VERIFICADAS UMA A UMA CONTRA ARTEFATO

| # | Condição (mandato do director / `CLAUDE.md`) | Estado | Artefato que sustenta |
|---|---|---|---|
| 1 | `AUDIT_COMMIT` congelado, imutável e identificado (Regras 12-14) | **SATISFEITA** | `00-scope/AUDIT_SCOPE.md`, `00-scope/AUDIT_COMMIT_BINDING_VERIFICATION.md`; commit `c1311a6f…` citado por todas as trilhas |
| 2 | Escopo reproduzível com exclusões declaradas | **SATISFEITA** | `00-scope/AUDIT_SCOPE.md`; exclusões nominais em `T-41` §3.2, `T-42` §2.4/§2.5, `T-43` §9, `T-45` §9, `T-47` §1.5 |
| 3 | Plano aprovado com gates humanos decididos | **SATISFEITA** | `02-plan/AUDIT_PLAN.md` §12 + `EMENDA_01`/`EMENDA_02`; `APR-2026-021` (G1,G2,G3,G8,G9,G10), `APR-2026-023` Parte B (G4,G5,G6,G7,G11), `APR-2026-043` D1 (G3 → `REDUCED_BY_DECISION`). **Nenhum gate do plano permanece indecidido** |
| 4 | Toda trilha planejada reportou | **SATISFEITA** | 27/27 trilhas de fieldwork (`APR-2026-024` contexto) + 23 trilhas complementares `T-27`…`T-50` e `F-5` + 6 rodadas adversariais; existência verificada por listagem própria em `24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` §1 |
| 5 | Findings CRITICAL e HIGH validados (Regra 22) | **SATISFEITA — 101/101** | `T-26_CONSOLIDACAO_RODADA5.md` (100/100 após `T-48`) + `T-50_VALIDACAO_VALIDADENULA.md` §9 (o 101º, `CONFIRMED`, HIGH sustentada) |
| 6 | Cobertura **demonstrada**, nunca alegada | **SATISFEITA, com déficit nominal declarado** | `02-plan/AUDIT_COVERAGE_MATRIX.md`; `24-coverage/AUDIT_COVERAGE_EXECUTED.md`, `_RODADA2`, `_RODADA4`; déficits em §4 deste veredito. **Limitação declarada `LIM-VER-01` em §7** |
| 7 | Veredito registrado em `audit/runs/<AUDIT_ID>/` | **SATISFEITA por este documento** | `audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md` |
| 8 | Gate humano registrado, não inferido (Regra 18) | **SATISFEITA** | `APR-2026-046`, texto verbatim do dono; `HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md` HGR-…-02 |

**Nenhuma condição insatisfeita. Por isso, e somente por isso, o veredito é `AUDIT_PASSED`.**

---

## 4. PLACAR VIGENTE — CONFIRMADO CONTRA ARTEFATO (Regra 7)

| Severidade | Quantidade |
|---|---|
| **CRITICAL** | **9** |
| **HIGH** | **92** |
| **MEDIUM** | **248** |
| **LOW** | **124** |
| **INFO** | **11** |
| **TOTAL VIGENTE** | **484** |

**Aritmética:** 9 + 92 + 248 + 124 + 11 = **484**. 484 + 1 `FALSE_POSITIVE` (`T11-F10`) + 17
absorvidos/`DUPLICATE` = **502 IDs emitidos**. Fecha nos dois sentidos.

**Como se chega a 484 / 92 HIGH, e por que os relatórios dizem 483 / 91:**
`T-26_CONSOLIDACAO_RODADA5.md` §1.5 fixou o placar em **483 (9C · 91H · 248M · 124L · 11I)**, e
`RELATORIO_EXECUTIVO.md` §2.1 o reproduz somando `AUD-RH-VALIDADENULA-01` numa linha própria
**"sem severidade fixada"** (`DIV-REP-04`). **`APR-2026-045` D1 fixou essa severidade em HIGH**, e
`T-50` §4 confirmou que a evidência sustenta HIGH. Logo, na data deste veredito, o finding
integra a banda HIGH: **91 → 92** e **483 → 484**. `DIV-REP-04` fica **resolvida por este ato**.

**Os relatórios não são alterados** (Regra 15): eles foram emitidos antes da fixação e estavam
corretos na data. Esta reconciliação é do director e vive aqui.

**Complemento verificado:**

| Item | Valor | Fonte |
|---|---|---|
| Regra 22 — universo com veredito de validador | **101 / 101** | `T-26` R5 + `T-50` |
| Conformidades verificadas (últimos 7 lotes) | **42** (38 + 4 de `F-5` §6.2) | `RELATORIO_EXECUTIVO.md` §9 |
| Falsos positivos evitados | **17** (14 + 3 de `F-5` §6.2) | `RELATORIO_EXECUTIVO.md` §9 |
| Erros da própria auditoria publicados | **6** | `RELATORIO_EXECUTIVO.md` §8 |
| `C-137` | **`A(79/207)`** — déficit **128 = 106 com model + 22 sem model**, **integralmente nominal** | `T-26` R5 §4; `RELATORIO_EXECUTIVO.md` §5.1 |
| Denominador oficial | **207 tabelas · 22 sem model** | `APR-2026-042` D1; `T-47` §1.2 |
| Categoria especial LGPD art. 5º II | **18 tabelas** (11 saúde + 7 biometria), **censo fechado entre as 207** | `T-43`, `T-45`, `T-47`; `APR-2026-040` |
| `C-136` / `F-5` | **683 rotas — 628 IN (91,9 %) / 55 OUT (8,1 %)**, zero não classificadas | `F-5_LISTA_IN_OUT_CATEGORIA.md` §4-§5 |

**Todos os números que me foram apresentados no despacho conferem com o artefato.** As
divergências que encontrei são de **registro**, não de medição, e estão em §8.

---

## 5. O QUE FICA ABERTO — NOMINALMENTE

Nada aqui recebe prazo. **O dono não fixou nenhum**, e atribuir prazo seria invenção (Regra 6).

### 5.1 Findings

**484 findings vigentes. NENHUM foi remediado e NENHUM foi fechado por este run.**

Exceção única, e ela **não é fechamento**: os **dois itens do `CASE-004`** —
`AUD-ALOG-01/A` (`DELETE /api/employees/:id`, CRITICAL, produção real, posição 1 da fila) e
`AUD-ALOG-01/B` (`PATCH /api/items/:id/inactivate` + `DELETE /api/items/:id`, HIGH, produção
real) — estão declarados `REMEDIATION_COMPLETE` na branch `sana/ERP-LEGACY-001/CASE-004`
(HEAD `2c10a80`, não mesclada) e **aguardam reteste independente da VeriCore**.

> **Os dois permanecem ABERTOS.** Não há `RETEST_PASSED` e não há `FINDING CLOSED` — autoridade
> exclusiva da VeriCore (Regra 4), e a SanaCore não fecha o próprio finding (Regra 3).
> O contorno de `entityId` do item B (`APR-2026-034` D1, Rota 2) é **contorno declarado, não
> correção de causa-raiz**; `AUD-DB-04` permanece MEDIUM e aberto.

**Não liberados à SanaCore:** `T41-EST-F01` e `T41-RH-F02` seguem `CONFIRMED`, HIGH e **retidos**
até o reteste adotar o critério reescrito em `T-49` (4 vetores · 12 itens e 4 tabelas · 9 itens,
com 13 armadilhas de fechamento falso nomeadas). `AUD-RH-VALIDADENULA-01`, agora HIGH e
`CONFIRMED` por `T-50`, segue no lote compartilhado de `T41-RH-F02`, **com as travas
`CR-T50-01`, `CR-T50-02` e `CR-T50-03`**.

### 5.2 Cobertura

| Item | Estado |
|---|---|
| **`C-137`** | **NÃO fechada.** `A(79/207)`; **déficit de 128 tabelas, todas nominadas** tabela a tabela (106 com model + 22 sem model). Não há mais nenhuma tabela do schema sem nome numa lista de auditoria |
| **`C-136`** | **Sem cobertura — nenhuma trilha a tocou em 5 rodadas.** Exclusão declarada sobre **628 rotas IN** de um universo de 683; as **55 OUT** estão nominadas uma a uma em `F-5` §3. Método decidido (`APR-2026-043` D2: dividir); **o dimensionamento tem de ser feito com 628, nunca com "uma fração"** — a divisão reduz o alvo em **8,1 %**, não em uma ordem de grandeza |
| **Gate `G3`** | **`REDUCED_BY_DECISION`** (`APR-2026-043` D1), reduzido pela via do `G8`, tendo a exclusão nominal como instrumento. **Reduzido por decisão, NÃO contornado — e NÃO cumprido.** A redução não ampliou cobertura nenhuma e não converteu exclusão em conformidade. A **ressalva material da banda dinheiro** (25 tabelas de 1ª ordem fora da cobertura) permanece integralmente vinculante: *"é razoável supor que haja mais ocorrências entre estas 25, e elas não serão encontradas por esta auditoria"* |
| **Prova dinâmica** | **Aberta por decisão do dono, não por trabalho pendente.** A auditoria é predominantemente **estática** por força de `APR-2026-016`: ≈232 pedidos catalogados, ~21 executados. O gate `G4` do plano foi **APROVADO** por `APR-2026-023` Parte B, restrito a `erp_evok_audio_test`; o que permanece aberto é a **execução** — `B9` (~190 pedidos) reservado a sessão própria (`APR-2026-043` D5) e `DYN-T41-03`/`DYN-T49-03` **não autorizados** (`APR-2026-044` D3). Ver divergência `DIV-VER-02` em §8 |
| **`RES-T47-02`** | Condicionalidade dos 6 contêineres genéricos **rebaixada** de *"não decidível estaticamente"* para *"não decidível sem acesso a produção"* — **não fechada**. Coleta executada em banco de teste virgem produziu **falso zero** |

### 5.3 As 4 decisões reservadas pelo dono (`APR-2026-045` D2) — sem prazo, por juízo próprio

| # | Item | Motivo declarado |
|---|---|---|
| 2 | **`C-136`** — redimensionamento com **628 rotas IN** | *"É escopo futuro, não bloqueia nada agora, e depende da decisão #5, que também estou adiando."* |
| 3 | **`B9`** — prova dinâmica em bloco (~190 pedidos) | *"Sessão própria, não hoje, não em bloco."* |
| 4 | **Janela para `DYN-T41-03` e `DYN-T49-03`** | *"Não decido a data agora. Fica pendente, com as quatro condições já fixadas."* |
| 5 | **Qualificação por rota em tier 1/2** (420 endpoints) | *"Custo de 3-4 sessões inteiras para ganho não garantido não é decisão para tomar cansado, de madrugada."* |

**Registro obrigatório:** as quatro são **reserva deliberada**, não esquecimento. Nenhuma sessão
futura pode lê-las como "pendências que evaporaram", e **nenhuma delas bloqueia este veredito** —
o dono declarou isso expressamente, e a evidência o confirma: nenhuma é condição de método do run.

`DYN-T41-03` é a **única** coleta capaz de mover `T41-RH-F02` de HIGH para CRITICAL;
`DYN-T49-03` é a **única** que separa risco latente de dano consumado em `T41-EST-F01`. Enquanto
não houver janela, essas duas perguntas permanecem sem resposta — e este veredito não as
responde por inferência.

### 5.4 Itens técnicos abertos, com titular

| Item | Estado | Titular |
|---|---|---|
| **Reteste independente de `CASE-004`** (itens A e B) | pendente; **tem de partir da branch** `sana/ERP-LEGACY-001/CASE-004` | VeriCore |
| **`CE-06`** — replicação do log de conexões para fora do host | **executada a ativação cluster-wide; a replicação segue pendente e por isso o critério NÃO está satisfeito** | dono + infra |
| **`PEND-2026-005`** — cabeçalho de `apply-pending-migrations.cjs` cita `APR-2026-026`, deve citar `APR-2026-028`; **bloqueia a branch `CASE-003` de sair de worktree** | aberto | SanaCore |
| **Redação de `BUSINESS_RULES.md:345-349`** (§12 item 2, incompatível com o item 3 que prevalece por `APR-2026-043` D3) | aberto — **correção de redação, não regra concorrente** | OpusCore |
| **Blocos `B2`-`B8`** sob o critério em cascata de `APR-2026-043` D5; **`B6`** permanece com a VeriCore | execução, não decisão | VeriCore |
| **`D-02`…`D-07`, `D-09`, `D-10`, `D-12`, `D-13`** e `DIV-SEV-01` (`T17-F05` MEDIUM × `T23-F03` HIGH, 5ª rodada) | abertos | dono / VeriCore |

---

## 6. CONSEQUÊNCIA DE RASTRO — REGISTRADA, PORQUE O RELATÓRIO JÁ A REGISTRA

**Quem ler apenas a árvore principal NÃO vê a evidência de remediação do `CASE-004`.** O único
artefato do caso presente na árvore auditável é o `TRIAGE_REPORT.md`, que encerra autorizando o
início do Estágio 1; o pacote de evidência vive na branch `sana/ERP-LEGACY-001/CASE-004`, não
mesclada (`DIV-REP-02` do Relatório Técnico §11.1).

**Isto não é defeito — é a segregação de organizações funcionando** (Regras 3, 11, 15). Mas tem
consequência operacional vinculante:

> **O reteste independente do `CASE-004` TEM de partir da branch, não da árvore principal.**
> E o estado da remediação, hoje, é **declarado — não confirmado por artefato acessível na árvore
> auditada**. Isso **reforça**, e não enfraquece, a exigência de reteste independente.

Mesma observação vale para `sana/ERP-LEGACY-001/CASE-003` (`95aeff4`, bloqueada por
`PEND-2026-005`) e `sana/ERP-LEGACY-001/FIND-ERP-005` (`e564199`).

**Regra 14 reafirmada:** as remediações **não entram neste run** e exigem **delta audit ou nova
auditoria** (`APR-2026-023` Parte B, gate `G7`). Nenhum `RETEST_PASSED` sai daqui.

---

## 7. OS 6 ERROS DA PRÓPRIA AUDITORIA — PERMANECEM PUBLICADOS NO VEREDITO

Um veredito que esconde os erros do próprio processo não vale nada. Os seis abaixo foram
encontrados **dentro** do run, e são reproduzidos aqui sem atenuação, com o mesmo peso dos
achados contra o objeto auditado.

| # | Erro do próprio processo | Efeito |
|---|---|---|
| **1** | **Série de HIGH propagada errada por 4 rodadas** — a Rodada 1 não refletiu o rebaixamento de `T13-F01`/`T13-F04` (HIGH → MEDIUM) decidido nela mesma, e o desvio foi herdado por citação direta até `T-39` | Série correta **65 / 72 / 85 / 86 / 87**, não 67/74/87/88/89. **O total de 446 nunca mudou** — mudou quem estava em qual coluna, que é exatamente o que a fila de remediação e a Regra 22 consomem. Corrigidos por consequência: estrato 4 (79 → 77) e universo da Regra 22 (98 → 96) |
| **2** | **Contagem 21 × 22 tabelas sem model** | Denominador oficial fixado em **207 / 22**; `T35-META-F01` retificado sem alterar o artefato original |
| **3** | **Categoria de dado de saúde subestimada em 3,7×** (3 declaradas × 11 reais) e biometria em 2,5× — o auditor registrou que o erro era dele, por triar por nome de módulo em vez de aplicar o critério de coluna | **Quatro tabelas com dado de saúde de trabalhador saíram da exclusão e entraram na cobertura.** A condição vinculante do dono foi o controle mais produtivo do run |
| **4** | **Dois HIGH ficaram sem validador da Regra 22 por falha de despacho do orquestrador** (`T41-EST-F01`, `T41-RH-F02`) — detectados pela 5ª rodada de consolidação, **não** pelo orquestrador que falhou | Ficaram reservados e **não liberados** à SanaCore até haver veredito; **`T-48` fechou as duas** |
| **5** | **O elo "Admissão" de `T41-RH-F02` estava ERRADO** — a admissão não usa o gate comum, decide por `process.aso_result` (`ConcludeAdmissionProcessUseCase.ts:119`), uma terceira cópia sem vínculo com a SST | **O erro AMPLIA o finding:** a aptidão vive em 4 tabelas, não 2. `T-41` não foi alterado (Regra 15); a correção vive em `T-49` e é vinculante para o reteste |
| **6** | **O item 3 de `T41-EST-F01` era FACTUALMENTE ERRADO** — o saldo em depósito desativado **não** fica preso; `addToWarehouse`/`removeFromWarehouse` não filtram `active` | **Reduz a consequência** e não toca o defeito central. **Registrado numa direção que desfavorece a auditoria**, com o mesmo peso do erro que a favorece |

**Nota de método, vinculante para o programa:** o erro nº 1 sobreviveu a quatro rodadas porque
**cada rodada conferiu o delta — todos corretos — e nenhuma reconferiu a base**. Precedente
fixado: **toda consolidação reenumera a base**, não apenas soma o delta.

**Nota sobre os erros 5 e 6:** ambos foram publicados **pelo próprio auditor de origem, contra o
próprio trabalho**. Um amplia o finding; o outro o reduz. **Os dois com o mesmo peso** — é isso
que torna a contagem não seletiva. Somados aos anteriores, os auditores reportaram **7 erros
contra si próprios** e 1 contra a premissa de uma decisão do dono.

### 7.1 Limitações de instrumento declaradas por este veredito

| ID | Limitação | Efeito |
|---|---|---|
| **`LIM-VER-01`** | **O par de cobertura executada está reconciliado até `T-40`** (`AUDIT_COVERAGE_EXECUTED_RODADA4.md`). **Não existe `_RODADA5`**: a cobertura das trilhas `T-41`…`T-50` e `F-5` está medida na consolidação `T-26_CONSOLIDACAO_RODADA5.md` §4 e em `F-5`, não numa matriz de cobertura própria | **Declarada, não silenciada.** O déficit resultante é **nominal** (`C-137`: 128 tabelas nomeadas; `C-136`: 628 IN / 55 OUT nomeadas), e por isso a cobertura permanece **demonstrada**, não alegada. **Quem retomar o run deve produzir o par `_RODADA5` antes de qualquer nova declaração de cobertura** |
| **`LIM-VER-02`** | **O renderizador de `Grep` deformou literais em três trilhas consecutivas** e teria produzido, em dois casos, um CRITICAL espetacular e falso. Propriedade conhecida do instrumento, não incidente | Regra derivada, vinculante: **literal load-bearing se confirma por leitura de arquivo, nunca por saída de grep** |
| **`LIM-VER-03`** | `00_baseline_frozen.sql` está **9 migrations atrasado**; `git diff c1311a6..HEAD` foi verificado pelo orquestrador e **nunca reconfirmado** por duas trilhas (Bash indisponível); nenhuma das 502 âncoras `arquivo:linha` foi reverificada pelo consolidador | Herdado e declarado. Não invalida achado nenhum; **impede** afirmar verificação de custódia de segunda ordem |
| **`LIM-VER-04`** | **`AUD-PROC-CUSTODIA-01`** é achado de **processo da própria auditoria**, contado em categoria separada — não é defeito do produto e não entra no placar de 484 | Registro para que nenhuma leitura futura o some ao corpus |

---

## 8. DIVERGÊNCIAS REGISTRADAS POR ESTE VEREDITO (Regra 7 — o artefato vence)

| ID | Divergência | Adjudicação |
|---|---|---|
| **`DIV-VER-01`** | **`HANDOFF_PROXIMA_FASE.md` §2 está defasado:** afirma *"483 vigentes … mais `AUD-RH-VALIDADENULA-01` sem severidade fixada"*, e §4.1 item 1 lista a severidade como decisão pendente do dono. **`APR-2026-045` D1 fixou HIGH** e **`T-50` confirmou** | **O artefato de governança vence.** Vigente: **484 / 92 HIGH**, Regra 22 **101/101**. **Não edito o `HANDOFF`** — é do control plane (§9). Correção recomendada em §10 |
| **`DIV-VER-02`** | O despacho descreve o **gate `G4`** como *"aberto por decisão do dono"*. **O gate `G4` do plano foi APROVADO** por `APR-2026-023` Parte B (fila `DYN-01…DYN-08` contra `erp_evok_audio_test`; banco real permanece proibido). `HGR-…-01` §1 ainda o exibe como `ABERTO`, e está **superado** | **O artefato vence.** O que está aberto por decisão do dono **não é o gate**, e sim a **execução** da prova dinâmica: `B9` reservado (`APR-2026-043` D5) e `DYN-T41-03`/`DYN-T49-03` não autorizados (`APR-2026-044` D3). A substância do despacho está correta — *aberto por decisão, não por trabalho pendente*; a **etiqueta** `G4` estava imprecisa. Corrigido em §5.2 e no `HGR-…-02` |
| **`DIV-VER-03`** | Os três relatórios finais (REV. 2) publicam **483 / 91 HIGH** e afirmam, em `RELATORIO_EXECUTIVO.md` §15 item 11, que *"`AUD-RH-VALIDADENULA-01` não é HIGH — a severidade não está fixada"* | **Corretos na data de emissão; superados por `APR-2026-045` D1.** **Não os altero** (Regra 15). A reconciliação é este documento (§4). Recomenda-se que qualquer REV. 3 futura cite este veredito como fonte do placar |
| **`DIV-VER-04`** | **`DIV-R5-01`, escalada a mim por `T-26` R5 §7:** `APR-2026-042` D2 afirma *"6 contáveis, 1 não"* na categoria biometria; a medição de `T-45` §2.1 + `T-47` §1.5 item 20 mostra **5 e 2** (`sst_estornos_entrega_epi` também não tem model). **O total de 7 tabelas de biometria e o de 18 da categoria especial NÃO mudam** | **A medição vence quanto ao fato.** **Não altero a entrada do dono** (Regras 6 e 18) — a retificação formal de `APR-2026-042` D2 é ato dele. **Escalada nominalmente ao dono** e registrada aqui e no `HGR-…-02`. **Não afeta este veredito**: nenhuma conclusão do run depende da partição 6/1 × 5/2 |
| **`DIV-VER-05`** | `DIV-F5-01` (**681 × 683 rotas**) permanece **aberta**; `DIV-F5-02` e `DIV-F5-03` (docblocks de `ti.ts` e `facilities.ts` divergem da contagem real em 10 e em 4) permanecem **não adjudicadas** | Registradas, **não fechadas**. Nenhuma altera o total de 174 do tier 3 profundo nem a partição 628/55 |

**Divergências herdadas que permanecem abertas e não são fechadas por este veredito:**
`DIV-REP-01` (defasagem de `T-26` R5 §5.1 `BLQ-3` sobre a coleta `DYN-T47`, com o artefato de
execução vencendo), `DIV-REP-02` (evidência de `CASE-004` fora da árvore) e `DIV-SEV-01`
(`T17-F05` × `T23-F03`, 5ª rodada sem resolução — o grupo `G-12` carrega HIGH **apenas para
priorização**, declaradamente **não** como mérito resolvido).

**`DIV-REP-04` está RESOLVIDA** por este veredito (§4).

---

## 9. LIMITES DESTE ATO — O QUE ELE EXPRESSAMENTE NÃO FAZ

1. **Não fecha nenhum finding.** `AUDIT_PASSED` é veredito de **run**, não de finding (Regras 3 e 4).
   Os 484 permanecem abertos.
2. **Não declara `RETEST_PASSED`** para nenhum item, inclusive os dois do `CASE-004`.
3. **Não declara `REMEDIATION COMPLETE`** — autoridade da SanaCore, e este veredito não a ratifica.
4. **Não declara `FINDINGS_CONFIRMED`** como ato novo: a confirmação de cada CRITICAL/HIGH já foi
   feita pelo `vericore-finding-validator`, trilha a trilha, e é apenas **referida** aqui.
5. **Não altera nenhuma severidade** fixada pelo dono (Regra 18) nem nenhuma fixada por validador.
6. **Não altera nenhuma evidência histórica** de nenhuma trilha, relatório, consolidação ou
   aprovação (Regra 15). Nenhum artefato preexistente foi editado por este ato.
7. **Não corrige, refatora nem toca o objeto auditado** (Regra 2). Nada foi escrito em `src/`,
   `server/`, `client/`, `product/`, `requirements/`, `tests/`, `architecture/` ou `remediation/`.
8. **Não inventa regra, requisito, prazo ou aprovação** (Regra 6). **Nenhum item aberto recebeu
   prazo** — o dono não deu nenhum.
9. **Não declara `G3` cumprido**, `C-136` tocada, `C-137` fechada, `C-133` fechada, cobertura
   integral da banda dinheiro, nem categoria especial fechada sem a ressalva de `RES-T47-02`.
10. **Não edita o `HANDOFF_PROXIMA_FASE.md`** — arquivo do CoreTriad Control Plane. As correções
    necessárias estão **recomendadas** em §10, para ato do director do control plane.
11. **Não abre finding novo.** As observações `OBS-T50-04` e `OBS-T50-07`, devolvidas a mim por
    `T-50`, ficam **registradas como pendentes de decisão de abertura** (§10 item 5) — abri-las
    exigiria trabalho de campo posterior ao `AUDIT_COMMIT` ou delta audit, e o run está encerrado.

---

## 10. ENCAMINHAMENTOS

**Ao CoreTriad Director (control plane) — correções recomendadas no `HANDOFF_PROXIMA_FASE.md`:**

1. **§2** — trocar *"483 vigentes (9C · 91H · 248M · 124L · 11I), mais `AUD-RH-VALIDADENULA-01`
   sem severidade fixada"* por **"484 vigentes — 9 CRITICAL · 92 HIGH · 248 MEDIUM · 124 LOW ·
   11 INFO"**, citando `APR-2026-045` D1 + `T-50` + este veredito como fonte.
2. **§2** — trocar *"Regra 22: fechada. Todos os CRITICAL/HIGH têm veredito de validador"* por
   **"Regra 22: 101/101, fechada por `T-50`"**.
3. **§2** — a linha de governança cita *"`APR-2026-024` e `APR-2026-031` a `-044`"*; deve ler
   **`-046`**.
4. **§4.1** — **remover o item 1** (severidade de `AUD-RH-VALIDADENULA-01`): está decidida.
   As decisões abertas do dono passam a ser **quatro** (`APR-2026-045` D2 itens 2-5), mais o item
   6 já decidido sem prazo.
5. **§7** — acrescentar que o run tem **veredito emitido** e apontar
   `audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md`.

**Ao dono (Gilwagno) — decisões que continuam sendo dele, sem prazo atribuído por mim:**

6. **Retificação formal de `APR-2026-042` D2** quanto a *"6 contáveis, 1 não"* → **5 e 2**
   (`DIV-VER-04`). Não altero entrada de aprovação.
7. **Abertura, ou não, de `OBS-T50-04`** (o gate de retorno não amarra o ASO ao afastamento —
   defeito autônomo que **sobrevive** à correção de `AUD-RH-VALIDADENULA-01`) e de **`OBS-T50-07`**
   (`fitness_result: 'apto'` literal no diálogo de retorno). Ambas exigiriam **delta audit**
   (Regra 14), já que o run está encerrado.
8. As **quatro decisões reservadas** de `APR-2026-045` D2 (§5.3).

**À VeriCore:** reteste independente do `CASE-004` **a partir da branch**; `B2`-`B8` sob o
critério em cascata; `B6`.
**À SanaCore:** `PEND-2026-005`; e a fila de `T-39` **somente** com as travas de `T-49`/`T-50`.
**À OpusCore:** redação de `BUSINESS_RULES.md:345-349`.

---

## 11. DECLARAÇÃO FINAL

**`AUDIT_PASSED` — `ERP-LEGACY-001-AUD-001`, sobre o `AUDIT_COMMIT`
`c1311a6f76b512fef893f7e60d934179cae3409f`, emitido em 2026-08-17 pelo
`vericore-software-audit-director` sob o gate humano `APR-2026-046`.**

**O run está ENCERRADO. O sistema não está aprovado.** São afirmações diferentes, e este
documento existe para que nunca sejam confundidas.

```
ESTADO: RUN ENCERRADO COM VEREDITO AUDIT_PASSED (limites declarados) ·
484 FINDINGS VIGENTES (9C · 92H · 248M · 124L · 11I) · ZERO REMEDIADOS ·
ZERO FECHADOS · CASE-004 (A e B) REMEDIATION_COMPLETE EM BRANCH, AGUARDANDO RETESTE ·
REGRA 22 101/101 · G3 REDUCED_BY_DECISION (VIA G8) · C-137 A(79/207), DÉFICIT 128 NOMINAL ·
C-136 SEM COBERTURA, 628 IN / 55 OUT NOMINADAS · PROVA DINÂMICA ABERTA POR DECISÃO ·
4 DECISÕES RESERVADAS PELO DONO, SEM PRAZO · CE-06 CRITÉRIO NÃO SATISFEITO ·
PEND-2026-005 BLOQUEIA CASE-003 · 42 CONFORMIDADES · 17 FALSOS POSITIVOS EVITADOS ·
6 ERROS DA PRÓPRIA AUDITORIA PUBLICADOS · NENHUM PRAZO ATRIBUÍDO ·
NENHUM RETEST_PASSED · NENHUM FINDING CLOSED · NENHUM REMEDIATION COMPLETE.
```
