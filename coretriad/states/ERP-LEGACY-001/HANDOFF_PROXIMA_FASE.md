# ERP-LEGACY-001 — HANDOFF PARA A PRÓXIMA FASE

```
PROGRAMA:      ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION)
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f  (imutável — Regra 12)
BRANCH:        audit/ERP-LEGACY-001-AUD-001/2026-08-16   (publicada no GitHub)
DATA:          2026-08-17
ESTADO:        auditoria COMPLETA COMO PRODUTO — NÃO ENCERRADA
```

> **Leia este arquivo primeiro.** Ele existe para que a próxima sessão não precise
> reconstruir contexto a partir de 50 artefatos. Tudo o que ele afirma é
> verificável nos artefatos citados; onde houver divergência, **o artefato vence**
> (Regra 7).

---

## 1. Onde a auditoria está, em uma frase

**Os três relatórios finais estão emitidos e revisados. Nenhum `AUDIT_PASSED` foi
declarado.** O encerramento é gate humano e depende de itens nominais listados
na §4 — nenhum deles é trabalho de campo pendente.

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
| Governança / decisões | `coretriad/governance/APPROVALS.md` — `APR-2026-024` e `APR-2026-031` a `-044` |

**Placar da rodada 5:** 483 vigentes (9 CRITICAL · 91 HIGH · 248 MEDIUM · 124 LOW
· 11 INFO), mais `AUD-RH-VALIDADENULA-01` sem severidade fixada.

**Regra 22: fechada.** Todos os CRITICAL/HIGH têm veredito de validador.

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

| # | Item | Onde |
|---|---|---|
| 1 | **Severidade de `AUD-RH-VALIDADENULA-01`** — HIGH recomendada; se fixada, aciona Regra 22 | `AUD-RH-VALIDADENULA-01.md` §5 |
| 2 | **`C-136`** — redimensionar com **628 rotas IN**, não com "uma fração" | `F-5` §5.2 |
| 3 | **`B9`** — prova dinâmica em bloco (~190 pedidos), reservada a sessão própria | `APR-2026-043` D5 |
| 4 | **Janela para `DYN-T41-03` e `DYN-T49-03`** — leitura contra produção, escopada às duas consultas nomeadas, fora do lote de `B9`, com dia e horário confirmados | `APR-2026-044` D3 |
| 5 | **Qualificação por rota em tier 1/2** (420 endpoints) — única alavanca real de redução; contraria I-2 como está escrito | `F-5` L-02 |
| 6 | **Seis tabelas de RH** — *"estrutura de banco presente, sem uso de aplicação — decisão de produto pendente"*, **sem prazo** | `APR-2026-042` D3 |

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

## 7. Como retomar

1. Leia este arquivo e o **Relatório Executivo**.
2. Decida o que estiver na §4.1 — nada abaixo depende de trabalho de campo novo.
3. Escolha a frente:
   - **Encerrar a auditoria** → resolver §4.1, então gate humano de `AUDIT_PASSED`
     (autoridade da VeriCore sobre evidência, Regra 4).
   - **Avançar a remediação** → reteste do `CASE-004`, depois o topo da fila de
     `T-39` (estrato 1: CRITICAL de produção real).
   - **Ampliar cobertura** → `C-136` com 628, ou os blocos `B2`-`B8`.

**As três frentes são independentes.** A auditoria pode ser encerrada com
findings abertos — o Remediation Backlog é exatamente esse produto.

---

Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED` é feita
por este documento. Ele é mapa de estado, não veredito.
