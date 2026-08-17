# ERP-LEGACY-001 — HANDOFF PARA A PRÓXIMA FASE

```
PROGRAMA:      ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION)
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f  (imutável — Regra 12)
BRANCH:        audit/ERP-LEGACY-001-AUD-001/2026-08-16   (publicada no GitHub)
DATA:          2026-08-17
ESTADO:        RUN ENCERRADO — `AUDIT_PASSED` emitido em 2026-08-17
VEREDITO:      audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md
GATE HUMANO:   APR-2026-046 + HUMAN_GATE_RECORD-…-AUD-001.md (HGR-…-02)
```

> **Leia este arquivo primeiro.** Ele existe para que a próxima sessão não precise
> reconstruir contexto a partir de 50 artefatos. Tudo o que ele afirma é
> verificável nos artefatos citados; onde houver divergência, **o artefato vence**
> (Regra 7).

---

## 1. Onde a auditoria está, em uma frase

**O run está encerrado: `AUDIT_PASSED` emitido em 2026-08-17 pela VeriCore
(Regra 4), sob o gate humano `APR-2026-046` (Regra 18).**

O veredito é de **run, com limites declarados**. Nas palavras do próprio
documento: *o que foi examinado foi examinado com método; o que não foi examinado
está nomeado.* Ele **não** declara que o sistema está correto, **não** declara que
está pronto para produção, e **não fecha nenhum finding** — os 484 seguem abertos.
O que ficou aberto está nominal na §4 e no veredito §4.

---

## 2. O produto

| Artefato | Onde |
|---|---|
| **Relatório Executivo** | `audit/runs/ERP-LEGACY-001-AUD-001/40-report/RELATORIO_EXECUTIVO.md` |
| **Relatório Técnico** | `…/40-report/RELATORIO_TECNICO.md` |
| **Remediation Backlog** | `…/40-report/REMEDIATION_BACKLOG.md` |
| Consolidação vigente | `…/07-findings/T-26_CONSOLIDACAO_RODADA5.md` |
| Fila de remediação | `…/07-findings/T-39_FILA_REMEDIACAO_EXPOSICAO.md` |
| Par de cobertura | `…/24-coverage/AUDIT_COVERAGE_EXECUTED_RODADA4.md` |
| Lista IN × OUT (`G3`) | `…/07-findings/F-5_LISTA_IN_OUT_CATEGORIA.md` |
| **Veredito do run** | `…/50-verdict/AUDIT_VERDICT.md` |
| Governança / decisões | `coretriad/governance/APPROVALS.md` — `APR-2026-024` e `APR-2026-031` a **`-046`** |
| Registro do gate humano | `coretriad/governance/HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md` |

**Placar vigente: 484** — 9 CRITICAL · **92 HIGH** · 248 MEDIUM · 124 LOW · 11 INFO.

> **Nota de reconciliação (`DIV-VER-01`).** Este arquivo dizia antes *"483 + `AUD-RH-VALIDADENULA-01`
> sem severidade fixada"*. A severidade **foi fixada em HIGH** por `APR-2026-045` D1 e sustentada
> pelo validador em `T-50` — logo 484 e 92 HIGH. Os três relatórios REV. 2 publicam 483/91:
> estavam corretos na data e **não foram alterados** (Regra 15). A reconciliação vive no veredito.

**Regra 22: 101/101, fechada por `T-50`.** Todos os CRITICAL/HIGH têm veredito de
validador. Os MEDIUM, LOW e INFO **não** foram validados (`RES-T46-02`).

---

## 3. O que NÃO é pendência (para não ser refeito)

- **Categoria especial da LGPD (art. 5º II): censo FECHADO entre as 207 tabelas** —
  18 tabelas (11 saúde + 7 biometria). Ver `T-43`, `T-45`, `T-47`.
- **As 22 tabelas sem model estão nomeadas.** Denominador oficial **207/22**.
- **Par de cobertura reconciliado** até `T-40`.
- **Reconciliação ±2 resolvida** — a série HIGH correta é 65/72/85/86/87; o total
  de 446 nunca mudou. Ver `RECONCILIACAO_FINAL_AUD-001.md`.
- **Gate `G3`: `REDUCED_BY_DECISION`** (`APR-2026-043` D1) — reduzido pela via do
  `G8`, não contornado.
- **`BUSINESS_RULES` §12:** prevalece o item 3 (`depósito ATIVO`). O item 2 é
  redação a corrigir, não regra concorrente (`APR-2026-043` D3).

---

## 4. O que ficou aberto — nominal, sem prazo inventado

### 4.1 Decisões do dono

**São quatro** — as reservas de `APR-2026-045` D2. Nenhuma tem prazo; o dono não deu
nenhum, e inventar prazo violaria a Regra 6.

| # | Item | Onde |
|---|---|---|
| 1 | **`C-136`** — redimensionar com **628 rotas IN**, não com "uma fração" | `F-5` §5.2 |
| 2 | **`B9`** — prova dinâmica em bloco (~190 pedidos), reservada a sessão própria | `APR-2026-043` D5 |
| 3 | **Janela para `DYN-T41-03` e `DYN-T49-03`** — leitura contra produção, escopada às duas consultas nomeadas, fora do lote de `B9`, com dia e horário confirmados | `APR-2026-044` D3 |
| 4 | **Qualificação por rota em tier 1/2** (420 endpoints) — única alavanca real de redução; contraria I-2 como está escrito | `F-5` L-02 |

**Decididas, aqui só para não serem refeitas:** severidade de
`AUD-RH-VALIDADENULA-01` → **HIGH** (`APR-2026-045` D1, validada em `T-50`); as
**seis tabelas de RH** → *"estrutura de banco presente, sem uso de aplicação —
decisão de produto pendente"*, sem prazo (`APR-2026-042` D3).

### 4.1.1 Escaladas pelo emissor do veredito — decisão do dono, não decidida aqui

| Item | O que é |
|---|---|
| **Retificação de `APR-2026-042` D2** | a entrada diz *"6 contáveis, 1 não"* em biometria; a medição de `T-45`/`T-47` mostra **5 e 2**. Os totais (7 biometria, 18 na categoria especial) **não mudam**. Corrigir a entrada é ato do dono — nenhum agente altera decisão registrada (Regra 18) |
| **`OBS-T50-04` e `OBS-T50-07`** | abrir ou não como findings. São **posteriores ao encerramento do run** — abrir exigiria **delta audit** (Regra 14), não cabe neste run |

### 4.2 Trabalho técnico

| # | Item | Titular |
|---|---|---|
| 1 | **Reteste independente de `CASE-004`** (itens A e B remediados) | VeriCore |
| 2 | **`PEND-2026-005`** — cabeçalho de `apply-pending-migrations.cjs` cita `APR-2026-026`; deve citar `APR-2026-028`. **Bloqueia a branch `CASE-003` de sair de worktree** | SanaCore |
| 3 | **`CE-06`** — ativação cluster-wide de `log_connections` executada; **replicação para fora do host segue pendente**, e por isso o critério não está satisfeito | dono + infra |
| 4 | Correção da redação de `BUSINESS_RULES.md:345-349` | OpusCore |
| 5 | Blocos `B2`-`B8` sob o critério em cascata de `APR-2026-043` D5 | VeriCore |

---

## 5. Estado do repositório

**Branch principal do run:** `audit/ERP-LEGACY-001-AUD-001/2026-08-16`, publicada.
Tudo o que esta sessão produziu está commitado e no GitHub.

**Três branches de remediação NÃO mescladas** — e isso é deliberado:

| Branch | HEAD | Estado |
|---|---|---|
| `sana/ERP-LEGACY-001/CASE-003` | `95aeff4` | bloqueada por `PEND-2026-005` |
| `sana/ERP-LEGACY-001/CASE-004` | `2c10a80` | `REMEDIATION_COMPLETE` (A e B), aguarda reteste |
| `sana/ERP-LEGACY-001/FIND-ERP-005` | `e564199` | anterior a esta sessão |

**Consequência que o relatório registra:** quem lê apenas a árvore principal
**não vê** a evidência de remediação do `CASE-004`. Isso não é defeito — é a
segregação funcionando —, mas exige que o reteste seja feito a partir da branch.

---

## 6. As regras de trabalho que esta sessão fixou como precedente

Vale mais que o placar. Cada uma custou um erro real para ser aprendida.

1. **Nunca inventar decisão do dono.** Quando ele afirmou que duas decisões já
   existiam, elas não existiam — a recusa de aplicá-las está registrada em
   `APR-2026-043`.
2. **Fechamento falso custa mais depois que corrigir agora.** Critério de reteste
   subdimensionado fecha o finding sem fechar o defeito, e reabrir exige delta
   audit (Regra 14).
3. **"Zero" do banco errado não é evidência.** Coletar contra base vazia produz
   falso zero — pior que não coletar, porque é lido como "não existe caso real".
4. **Reportar erro em qualquer direção**, inclusive contra o próprio auditor e
   contra a premissa de quem despachou.
5. **Registrar conformidade e falso positivo evitado** com o mesmo rigor do
   defeito — sem isso o relatório lê como se o produto fosse só defeito.
6. **Confirmar literal por leitura de arquivo, nunca por saída de grep** — o
   renderizador deformou literais em três trilhas distintas deste run.
7. **Declarar cobertura, nunca alegá-la.** Contagem honesta com o número exato do
   que ficou de fora vale mais que um número maior sem lastro.

---

## 6-BIS. PARADA DETERMINADA PELO DONO — leia antes de despachar qualquer coisa

**Decisão de 2026-08-17 (`APR-2026-051`, e reforço explícito do dono):**

> *"Termine o `CASE-005` até o fechamento (reteste da VeriCore, veredito final) e
> **PARE**. Não inicie nenhum caso novo."*

**`CASE-006` (`AUD-INTEG-03`) NÃO está autorizado a começar.** Ele é o próximo da
fila (`T-39` §2.1, estrato 1 posição 3, cluster `C-31` com `T32-SUP-F03`), mas
abrir caso exige **novo aval do dono**. Fila não é autorização.

### Divisão de papéis a partir do `CASE-006` — permanente

| Papel | Motor |
|---|---|
| Triagem / causa-raiz | **Claude Code** |
| **Implementação** | **Codex** — `.codex/agents/sanacore-remediation-engineer.toml` |
| Segunda opinião / revisão | **Claude Code** |
| Reteste e fechamento | **VeriCore** — autoridade inalterada (Regra 4) |

**Claude Code não implementa mais nada a partir do `CASE-006`.** Estrutura pronta
e testada: credencial `codex_dev`, agente `.toml`, worktree
`sana/ERP-LEGACY-001/<CASE-ID>`, git hook (`sh scripts/install-git-hooks.sh` em
máquina nova). Ver `coretriad/infra/CODEX_ENGINE_SETUP.md`.

Precedente que motivou a regra: **`RC-PROC-02`** — o orquestrador implementou
remediação (commit `2a10049`) e o artefato saiu com poder discriminante quase
nulo. A faixa errada produziu o pior artefato do caso.

---

## 7. Como retomar

1. Leia este arquivo, o **`AUDIT_VERDICT.md`** e o **Relatório Executivo** — nessa ordem.
2. **Encerrar a auditoria já não é uma frente**: está feito. Restam duas:
   - **Avançar a remediação** → reteste independente do `CASE-004` (a partir da
     **branch**, não da árvore principal), depois o topo da fila de `T-39`
     (estrato 1: CRITICAL de produção real).
   - **Ampliar cobertura** → exige **delta audit ou novo run** (Regras 12-14). O run
     `AUD-001` está fechado sobre o seu `AUDIT_COMMIT` e **não segue HEAD**.
     `C-136` com 628 e os blocos `B2`-`B8` entram num `AUD-002`, não neste.
3. As quatro decisões da §4.1 não bloqueiam nenhuma das duas frentes.

**A auditoria foi encerrada com 484 findings abertos, e isso é o desenho — não uma
falha.** O Remediation Backlog é exatamente esse produto.

---

Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED` é feita
por este documento. Ele é mapa de estado, não veredito.
