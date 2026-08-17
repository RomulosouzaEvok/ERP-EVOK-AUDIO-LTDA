# HUMAN_GATE_RECORD — ERP-LEGACY-001-AUD-001 (gate do plano de auditoria)

```
GATE_RECORD_ID:  HGR-ERP-LEGACY-001-AUD-001-01
PROJECT_ID:      ERP-LEGACY-001
AUDIT_ID:        ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f
APROVAÇÃO:       APR-2026-021 (coretriad/governance/APPROVALS.md)
DATA:            2026-08-14
DECISOR:         Gilwagno — dono do CoreTriad
OBJETO:          AUDIT_PLAN.md §12 (gates G1..G10) + AUDIT_PLAN_EMENDA_01.md
NATUREZA:        Registro de decisão humana pelo coretriad-director. O Director
                 NÃO supre gate por inferência (Regra 18) e NÃO emite juízo de
                 auditoria (Regra 5).
```

## 1. Quadro dos gates

| Gate | Objeto | Veredito | Fundamento |
|---|---|---|---|
| **G1** | Aprovar o `AUDIT_PLAN.md` como base do fieldwork | **SATISFEITO** | Texto literal do dono: "o fieldwork está autorizado a prosseguir dentro do escopo aprovado". Aprova o plano como base. |
| **G2** | Aprovar a coverage matrix planejada, incluindo `N-01…N-16` | **SATISFEITO, com efeito modificado por G3** | Mesma frase de G1. **Mas** as condições de G3 alteram células da matriz — ver §3. |
| **G3** | Amostragens | **APPROVED_WITH_CONDITIONS** | Condições materiais — ver §2. |
| **G4** | Fila `DYN-01…DYN-08` contra `erp_evok_audio_test` | **ABERTO** | Não respondido. A §5 da mensagem do dono trata da **vedação ao banco real** e da lacuna L-T1; **não autoriza** a fila contra o banco efêmero. Autorizar por analogia seria inferência. |
| **G5** | Homologar dispensa das trilhas de IA e do `agent-permission-auditor` | **ABERTO** | Não mencionado. |
| **G6** | Autorizar emenda formal ao `AUDIT_SCOPE.md` §2.3 (RA-09) | **ABERTO** | Não mencionado. |
| **G7** | Confirmar que remediações SanaCore não entram nesta run e exigem delta audit | **ABERTO** | O dono autorizou a SanaCore a executar (Parte C da APR-2026-021), mas **não** confirmou o ponto de processo do delta audit. Autorizar a execução ≠ decidir como a auditoria trata o código resultante. |
| **G8** | Dimensionamento (110 sessões) | **APPROVED** (`AUDIT_SESSIONS = 110`) | Manter; não reduzir escopo agora. |
| **G9** | Reafirmar que OWNER de BR é do dono; T-14 apenas reporta | **SATISFEITO** | Seção 6 da mensagem do dono, literal. |
| **G10** | `CAND-AUTHZ-01` (Compras/COMEX) | **CONDITIONAL_APPROVAL** | Entra como candidato/provisório — ver §4. |

## 2. G3 — condições vinculantes

Amostragem autorizada **apenas** se: (a) baseada em risco; (b) risco residual
**explicitamente registrado no relatório final**.

**Vedada amostragem reduzida** quando o item for crítico ou de alto impacto e
envolver, entre outros: autenticação; autorização; segregação de funções;
operações financeiras; movimentação de estoque; integridade de dados;
contratos/jurídico; permissões administrativas; operações destrutivas;
segurança; multi-tenancy; regras de negócio críticas. Nesses casos:
**cobertura ampliada ou 100% quando tecnicamente aplicável**.

## 3. Efeito material de G3 sobre a matriz aprovada em G2 (registrado, não silenciado)

As condições de G3 **incidem sobre células que o plano declarava amostrais ou
rasas**, entre elas: os 207 endpoints de `juridico`/`rh`/`sst` com D3 amostral
(amostra de 68) — `juridico` é contrato/jurídico e `rh`/`sst` tocam dado
pessoal; os 43 endpoints tier 3 em varredura rasa nominal; as 127 de 167
páginas do client não cobertas (N-07), na medida em que exponham decisão de
authZ ou operação financeira/destrutiva; e as declarações N que recaiam nas
categorias listadas.

**Consequência de processo:** a `AUDIT_COVERAGE_MATRIX.md` deve ser **revista
para conformidade com G3 antes do início do fieldwork**. A revisão pode elevar
o esforço acima das **110 sessões** fixadas em G8 — hipótese em que o aumento é
**nova decisão humana**, jamais absorção silenciosa (a lição do SIM-002 vale
nos dois sentidos: não prometer cobertura que não se entrega, e não entregar
menos cobertura do que o gate exigiu).

## 4. G10 — o que a aprovação condicional NÃO significa

`CAND-AUTHZ-01` entra no fieldwork como **candidato/provisório**, para
investigação e coleta de evidência. A decisão **não** implica: confirmação
automática da regra; promoção a requisito confirmado; aprovação do
comportamento; alteração de owner; aceitação de divergência. Mudança de status
depende de evidência suficiente e da validação correspondente — autoridade
VeriCore.

## 5. Estado do fieldwork

**PARCIALMENTE LIBERADO.** G1 está satisfeito, que é a condição dura declarada
no `AUDIT_PLAN.md` §12 ("enquanto G1 não for registrado, qualquer início de
fieldwork é violação de gate"). Porém:

1. **Pré-condição de conformidade:** a revisão da coverage matrix para atender
   G3 (§3) precede o fieldwork — auditar sob uma matriz que o próprio gate
   modificou produziria cobertura fora de conformidade desde o primeiro dia.
2. **Trilhas que dependem de `DYN-01…DYN-08` ficam bloqueadas por G4** —
   evidência dinâmica não pode ser coletada sem autorização da fila, nem
   substituída por leitura estática sem que a substituição seja declarada.
3. **RA-09 (correção da premissa de baseline no `AUDIT_SCOPE.md`) fica
   bloqueada por G6** — o escopo segue com uma afirmação sabidamente incorreta
   até a emenda ser autorizada.
4. **A dispensa das trilhas de IA segue não homologada (G5)** — dispensa com
   evidência técnica registrada, mas sem ratificação humana.
5. **O tratamento do código remediado pela SanaCore segue indefinido (G7).**

## 6. O que este registro NÃO faz

Não aprova gate por inferência; não altera severidade, confiança ou status de
finding; não convoca fieldwork; não atribui OWNER; não emite juízo de
auditoria. Severidade/confiança/status permanecem autoridade VeriCore
(Regras 2, 4, 5 e 18 do `CLAUDE.md`).

---
---

# HGR-ERP-LEGACY-001-AUD-001-02 — GATE HUMANO DE EMISSÃO DO VEREDITO

```
GATE_RECORD_ID:  HGR-ERP-LEGACY-001-AUD-001-02
PROJECT_ID:      ERP-LEGACY-001
AUDIT_ID:        ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f   (imutável — Regra 12)
BRANCH:          audit/ERP-LEGACY-001-AUD-001/2026-08-16
APROVAÇÃO:       APR-2026-046 (coretriad/governance/APPROVALS.md)
DATA:            2026-08-17
DECISOR HUMANO:  Gilwagno — dono do CoreTriad
EMISSOR DO VEREDITO: vericore-software-audit-director (VeriCore)
OBJETO:          emissão do veredito formal do run ERP-LEGACY-001-AUD-001
NATUREZA:        registro de DOIS atos distintos — o gate humano que autorizou, e o
                 veredito da VeriCore sobre a evidência. Nenhum substitui o outro.
```

> **Este registro é apêndice ao `HGR-…-01`. Nada acima foi alterado** (Regra 15).
> A §7 deste apêndice registra o que, do quadro de gates do `HGR-…-01`, foi
> superado por aprovações posteriores — **sem editar o quadro original**.

## 1. O gate humano — texto verbatim do decisor

`APR-2026-046`, 2026-08-17, dono do CoreTriad:

> *"Aprovo. Despache o `vericore-software-audit-director` para emitir o veredito
> formal `AUDIT_PASSED` com o `HUMAN_GATE_RECORD` correspondente."*

**Natureza do ato do dono:** autoriza a **emissão**. **Não determina o conteúdo.**
A própria `APR-2026-046` fixa a distinção e instrui expressamente que, *"se concluir
que alguma condição não está satisfeita, [o emissor] deve recusar a emissão e dizer
qual — recusa fundamentada é resultado legítimo deste despacho, e não desobediência
ao dono"*.

## 2. O veredito — ato da VeriCore sobre a evidência (Regra 4)

| Campo | Valor |
|---|---|
| **Veredito** | **`AUDIT_PASSED`** — veredito de **run**, com limites declarados |
| **Emissor** | `vericore-software-audit-director` |
| **Data** | 2026-08-17 |
| **Documento do veredito** | `audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md` |
| **Fundamento** | evidência do run, verificada contra artefato (§3), **não** a autorização do dono |
| **Recusa considerada?** | **Sim.** As 8 condições de conclusão foram examinadas uma a uma; nenhuma está insatisfeita. Houvesse uma, o resultado registrado aqui seria recusa fundamentada |

**O veredito não foi emitido por obediência. Foi emitido porque a evidência o sustenta.**

## 3. Condições verificadas antes da emissão (resumo; detalhe em `AUDIT_VERDICT.md` §3)

| # | Condição | Estado |
|---|---|---|
| 1 | `AUDIT_COMMIT` congelado e identificado (Regras 12-14) | SATISFEITA |
| 2 | Escopo reproduzível, com exclusões nominais | SATISFEITA |
| 3 | Plano aprovado, **todos os gates G1-G11 decididos** | SATISFEITA |
| 4 | Toda trilha planejada reportou (27/27 + 23 complementares + 6 rodadas adversariais) | SATISFEITA |
| 5 | Regra 22 — CRITICAL/HIGH com veredito de validador: **101/101** | SATISFEITA |
| 6 | Cobertura **demonstrada** por matriz, com déficit **nominal** | SATISFEITA, com `LIM-VER-01` declarada |
| 7 | Veredito registrado em `audit/runs/<AUDIT_ID>/` | SATISFEITA |
| 8 | Gate humano registrado, não inferido (Regra 18) | SATISFEITA — esta entrada |

## 4. O que o gate humano NÃO aprovou

- **Não aprovou o sistema.** `AUDIT_PASSED` **não significa que o ERP está correto nem
  que está pronto para produção** — está escrito no próprio veredito, §2.2.
- **Não fechou finding algum.** **484 findings permanecem abertos**, nenhum remediado,
  exceto os dois itens do `CASE-004` (`REMEDIATION_COMPLETE` na branch
  `sana/ERP-LEGACY-001/CASE-004`), que **aguardam reteste independente** e **não estão
  fechados** (Regras 3 e 4).
- **Não declarou `RETEST_PASSED`, `FINDING CLOSED` nem `REMEDIATION COMPLETE`.**
- **Não fixou prazo para nada.** Nenhum item aberto recebeu prazo — o dono não deu
  nenhum, e atribuí-lo seria invenção (Regra 6).
- **Não revogou nenhuma das quatro reservas** de `APR-2026-045` D2, que seguem exigindo
  decisão própria e futura.

## 5. Estado que o gate consignou, reconciliado com o artefato (Regra 7)

| Item | `APR-2026-046` | Verificado |
|---|---|---|
| Findings vigentes | 484 — 9C · 92H · 248M · 124L · 11I | **CONFERE** (`T-26` R5 §1.5 + `APR-2026-045` D1 + `T-50`) |
| Regra 22 | 101/101, fechada por `T-50` | **CONFERE** |
| `C-137` | `A(79/207)`, déficit 128 nominal (106 + 22) | **CONFERE** |
| Categoria especial art. 5º II | 18 tabelas, censo fechado entre as 207 | **CONFERE** |
| `G3` | `REDUCED_BY_DECISION` | **CONFERE** |
| Conformidades / FP evitados / erros próprios | 42 / 17 / 6 | **CONFERE** |
| Par de cobertura | reconciliado até `T-40` | **CONFERE**, com `LIM-VER-01` (não existe par `_RODADA5`) |

## 6. Divergências escaladas ao decisor humano por este registro

| ID | Divergência | Ação que cabe ao humano |
|---|---|---|
| `DIV-VER-01` | `HANDOFF_PROXIMA_FASE.md` §2/§4.1 ainda diz **483** e trata a severidade de `AUD-RH-VALIDADENULA-01` como pendente | Correção pelo control plane — recomendações em `AUDIT_VERDICT.md` §10. **Não editei o arquivo** |
| `DIV-VER-02` | O gate `G4` foi **APROVADO** por `APR-2026-023` Parte B; o `HGR-…-01` §1 ainda o exibe como `ABERTO`. O que segue aberto **por decisão** é a **execução** da prova dinâmica, não o gate | Nenhuma ação obrigatória; registrado para evitar leitura errada. Ver §7 |
| `DIV-VER-04` | `APR-2026-042` D2 diz *"6 contáveis, 1 não"* em biometria; a medição mostra **5 e 2**. Totais (7 biometria, 18 categoria especial) **não mudam** | **Retificação formal da entrada é ato do dono** (Regras 6 e 18). Não alterei aprovação alguma |
| — | `OBS-T50-04` e `OBS-T50-07` (devolvidas por `T-50`) não foram convertidas em finding | Abrir ou não é decisão do dono; exigiria **delta audit** (Regra 14), pois o run está encerrado |

## 7. Superações do quadro do `HGR-…-01`, registradas sem editá-lo (Regra 15)

| Gate | Como consta no `HGR-…-01` | Estado real na data deste registro |
|---|---|---|
| **G3** | `APPROVED_WITH_CONDITIONS` | **`REDUCED_BY_DECISION`** por `APR-2026-043` D1, pela via do `G8` — reduzido por decisão, **não** contornado e **não** cumprido |
| **G4** | `ABERTO` | **APROVADO** por `APR-2026-023` Parte B — fila `DYN-01…DYN-08` contra `erp_evok_audio_test`; **banco real permanece proibido** (`APR-2026-016`) |
| **G5** | `ABERTO` | **APROVADO** por `APR-2026-023` Parte B, com cláusula de reabertura |
| **G6** | `ABERTO` | **APROVADO** por `APR-2026-023` Parte B — `RA-09` liberada |
| **G7** | `ABERTO` | **APROVADO** por `APR-2026-023` Parte B — remediações **não** entram nesta run e exigem **delta audit** (Regra 14) |
| **G11** | não constava | **OPÇÃO (c)** por `APR-2026-023` Parte B |

## 8. O que este registro NÃO faz

Não emite juízo de auditoria em nome do dono nem decisão do dono em nome da VeriCore;
não fecha finding; não altera severidade, confiança ou status; não altera evidência
histórica de nenhuma organização; não declara `REMEDIATION COMPLETE`; não atribui prazo;
não edita o `HANDOFF_PROXIMA_FASE.md` (control plane) nem qualquer entrada de
`APPROVALS.md`.

**Registrado por:** `vericore-software-audit-director` — VeriCore.
**Sob o gate humano:** `APR-2026-046` — Gilwagno, dono do CoreTriad, 2026-08-17.
