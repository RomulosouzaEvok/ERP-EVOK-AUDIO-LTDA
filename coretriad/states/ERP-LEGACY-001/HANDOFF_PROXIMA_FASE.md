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

## 9. Estado da remediação — CASE-013 a CASE-015 (2026-08-18, sessão atual)

### Casos completados e validados (pipeline inteiro: segunda opinião + reteste dinâmico)

**`CASE-001` a `CASE-012`** — 12 casos, todos com `REMEDIATION_COMPLETE` e reteste
independente da VeriCore executado. Histórico completo em
`coretriad/states/ERP-LEGACY-001/QUEUE_STATUS.md` (atualizado 2026-08-18).

- **CASE-001 a CASE-003**: FIND-ERP-001, AUD-PROC-CUSTODIA-01, FIND-ERP-004 (processamento sem registro).
- **CASE-004**: AUD-ALOG-01 itens A (employees) e B (items/inactivate).
- **CASE-005**: AUD-AUTHN-01 (JWT rotation).
- **CASE-006 a CASE-009**: FIND-ERP-002 (imutabilidade audit_logs), AUD-INTEG-03, AUD-RH-CPFSEARCH-01.
- **CASE-010 a CASE-012**: FIND-ERP-006 (LGPD), FIND-ERP-008 (MRP costing), FIND-ERP-007 (RH termination reason).

### Casos em despacho/triagem (ainda não rodaram no Codex)

| CASE | Finding | Status | Base |
|---|---|---|---|
| **CASE-013** | FIND-ERP-009 (segregação "quem pede não aprova", 24+11 pontos) | `CODEX_REMEDIATION_DISPATCH.md` pronto; despacho autorizado por `APR-2026-058`; pré-requisito (CASE-002 com `REMEDIATION_COMMIT`) **satisfeito**. | `sana/ERP-LEGACY-001/CASE-013` |
| **CASE-014** | AUD-ALOG-01 itens C, F, G (desativação lógica em categories/departments/itemSuppliers) | Triagem completa; `CODEX_REMEDIATION_DISPATCH.md` pronto; nenhuma decisão pendente; coordenação registrada com CASE-004 (mesmo arquivo `itemController.ts`). | `remediation/cases/ERP-LEGACY-001-CASE-014/` |
| **CASE-015** | AUD-DB-01 (credencial de runtime superusuário vs. role `evok_app` de privilégio mínimo) | **Triagem INTERROMPIDA** — agente `sanacore-remediation-triage` foi cancelado antes de terminar. Nenhum artefato gerado ainda. Retomar nesta sessão. Risco: `APR-2026-049` reservou "rotação de credencial de produção" para decisão do dono — triagem precisa avaliar se ativar `evok_app` cai dentro da reserva e bloqueia se necessário. | (não iniciado) |

### Fila oficial restante (T-39, estrato 2 a 4)

**Estrato 2 (HIGH, produção real, 6 findings):**
`AUD-DB-03`, `AUD-T01-01`, `AUD-T01-02`, `AUD-AUTHN-02`, `T33-A-F04` — após CASE-015.

**Estrato 3 (CRITICAL, dev/homologação, 4 findings):**
`T08-F01`, `T24-F01`, `AUD-COM-DESCONTO-01`, `AUD-RH-VTHORISTA-01`.

**Estrato 4 (HIGH, dev/homologação, 79 findings):**
Nenhum triado ainda.

### Pipeline fixo confirmado (2026-08-18)

1. Sessão principal (Claude Code) prepara prompt/despacho (`CODEX_REMEDIATION_DISPATCH.md`).
2. Dono roda prompt no Codex (fora desta sessão) — implementação real acontece lá.
3. Sessão principal dá segunda opinião (adversarial, arquivo:linha, não confiar em MD).
4. Se aprovado, despacha para `vericore-audit-verification-runner` (reteste dinâmico).
5. Só depois VeriCore declara `RETEST_PASSED`/`FINDING CLOSED`.

**Nota:** nunca general-purpose para segunda opinião — usar `vericore-database-auditor`,
`vericore-authentication-auditor`, etc., conforme o domínio. Ver memória
`usar-agentes-especificos-vericore.md`.

### Próximo passo

Retomar a triagem de **CASE-015** (AUD-DB-01). Confira bloqueio por `APR-2026-049`
antes de gerar despacho.

---

Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED` é feita
por este documento. Ele é mapa de estado, não veredito.

---

## 8. ATUALIZAÇÃO 2026-08-18 (fim de dia) — leia isto antes de tudo acima

Este arquivo (seções 1-7) ficou **desatualizado no mesmo dia em que foi
escrito** — mesmo a atualização de tarde (versão anterior desta seção 8)
ficou obsoleta poucas horas depois. A lição, reforçada explicitamente pelo
dono neste mesmo dia: **`QUEUE_STATUS.md` é a fonte de verdade da fila, não
este handoff — sempre reconferir lá antes de responder sobre qualquer CASE.**

A "PARADA DETERMINADA PELO DONO" da §6-BIS ("termine CASE-005 e PARE, não
inicie caso novo") foi superada por `APR-2026-051`. A divisão de papéis da
§6-BIS (Claude Code = triagem/segunda opinião, Codex = implementação,
VeriCore = reteste/fechamento) **continua valendo** e foi reconfirmada pelo
dono nesta sessão como o **pipeline fixo de remediação** — ver memória
auxiliar `fluxo-remediacao-codex-vericore` — em 5 passos:

1. Sessão principal prepara o prompt/despacho.
2. Dono roda no Codex.
3. Sessão principal dá segunda opinião (revisão adversarial de código real,
   sempre lendo arquivo:linha, nunca confiando só no pacote de evidência).
4. Se aprovado, despacha para `vericore-audit-verification-runner` (reteste
   dinâmico real, com autoridade/ferramentas para executar comando).
5. Só então `coretriad-director`/dono declara `RETEST_PASSED`/`FINDING CLOSED`.

### Estado real ao final de 18/08 (ver `QUEUE_STATUS.md` para o detalhe completo)

**10 casos com código implementado, TODOS com segunda opinião completa
(código lido linha a linha) E reteste dinâmico real executado:**

| Caso | Veredito |
|---|---|
| CASE-001, CASE-002, CASE-011, CASE-012 | `RETEST_PASSED` |
| CASE-004, CASE-005, CASE-006, CASE-007, CASE-008, CASE-009 | `RETEST_PASSED_COM_RESSALVA` (ressalvas não-bloqueantes, nenhum bypass) |

Todos aguardam apenas o **veredito formal do coretriad-director** para
`FINDING CLOSED` — nenhum foi declarado fechado por nenhum agente.

**Ainda sem código, decisão do dono já registrada, despacho já entregue:**
- `CASE-013` (`APR-2026-058`) — despacho pronto, aguardando o dono rodar no
  Codex.

**Achados colaterais descobertos durante os retestes (não bloqueiam nenhum
caso, mas merecem triagem própria):**
1. Migration do CASE-012 sem backfill quebrava o banco de teste compartilhado
   — **já corrigida** (commit `59df948`).
2. `tests/unit/docs-path-reference-guard.test.ts` falha em todo o repositório
   (2 caminhos de documentação/dependência quebrados) — pré-existente, sem
   relação com nenhum CASE remediado hoje.
3. `npm run test:integration` completo falha massivamente (86-119/247) por
   exaustão do `authenticatedUserLimiter` (CASE-007) — a suíte reusa um único
   token em centenas de chamadas em segundos. Confirmado por diff que não é
   regressão de nenhum caso remediado hoje; é comportamento pré-existente,
   mas é um problema operacional real de CI.
4. `cross-database-drift-guard`/`docs-reality-drift-guard`/`bom-tipo-nao-produtivo`
   aparecem falhando repetidamente nos retestes de integração completos —
   drift entre `erp_evok_audio`(dev) e `erp_evok_audio_test`, e contagem de
   migrations desatualizada em doc canônica. Recorrente o suficiente para
   merecer finding próprio de infraestrutura de teste.

**Lição de método fixada nesta sessão:** o banco `erp_evok_audio_test` é
compartilhado entre todas as worktrees `sana/...`. Reverter/reaplicar uma
migration de um caso pode expor problemas em migrations de outros casos já
aplicadas no mesmo banco (foi o que aconteceu com CASE-012 durante o reteste
do CASE-001). Ao rodar `db:migrate:undo`/`db:migrate`, sempre: (a) fazer
undo **cirúrgico por nome**, nunca undo genérico do último aplicado; (b)
comparar `migration:status` antes/depois; (c) restaurar ao estado original
ao final.

Nenhuma declaração de `FINDING CLOSED` é feita neste documento — essa
autoridade é exclusiva do coretriad-director/dono, a partir dos vereditos de
reteste dinâmico já emitidos e registrados em `QUEUE_STATUS.md`.
