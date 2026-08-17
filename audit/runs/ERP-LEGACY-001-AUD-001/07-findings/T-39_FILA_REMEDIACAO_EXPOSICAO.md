# T-39 — FILA DE REMEDIAÇÃO POR EXPOSIÇÃO REAL (emissão) · ERP-LEGACY-001-AUD-001

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-39 — Fila de remediação ordenada por exposição real (emissão declarada
               emitível por T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md §6, condicionada às
               respostas do dono — agora registradas em APR-2026-031)
PRODUZIDO POR: vericore-audit-consolidator
DATA:          2026-08-16
MANDATO:       aplicar as 4 decisões de APR-2026-031/D-13 (APPROVALS.md:1550-1566) e a
               fixação D-11 (APPROVALS.md:1539-1548) sobre a classificação de T-38,
               emitindo a fila para a SanaCore via director.
REGIME:        read-only. Zero conexão de banco (APR-2026-016), zero execução, zero
               comando, zero requisição HTTP. Nenhuma escrita fora de audit/.
NATUREZA:      ordenação e reclassificação de ambiente por decisão humana registrada.
               NÃO altera enunciado técnico, severidade fixada, âncora ou autoria de
               nenhum finding (Regras 15/18). NÃO emite finding novo (Regra 6). NÃO
               declara AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED
               nem REMEDIATION COMPLETE (Regras 3/4). T-38 e as rodadas de T-26
               permanecem íntegros — este documento é o veículo dos deltas.
BASE:          corpus vigente de 446 IDs (T-26_CONSOLIDACAO_RODADA4.md §2.5) com o
               atributo de ambiente de T-38 §4.
```

---

## 0. Fontes autoritativas desta emissão

| # | Artefato | Papel |
|---|---|---|
| 1 | `coretriad/governance/APPROVALS.md:1532-1589` (`APR-2026-031`, lida integral) | as 4 decisões D-13 + fixação D-11 + regularização D-R4; e o que a entrada declara NÃO cobrir |
| 2 | `T-38_CLASSIFICACAO_AMBIENTE_CORPUS.md` (autor: este agente) | classificação-base 37/66/315/26/2; os 9 CRITICAL um a um (§4.3); os 9 HIGH nominais de produção real; recortes MISTO nomeados (§4.4); itens abertos (§5) |
| 3 | `T-26_CONSOLIDACAO_RODADA4.md` §5 (critério do dono, `OR-20`…`OR-25`), §2.5 (placar), §3.2-§3.3 (vínculos), §6 (pendências) | fila da primeira aplicação + dependências |
| 4 | `AUD-ALOG-01.md` §5 (`:111-122`) | o critério de exposição real, por escrito |
| 5 | `AUD-RH-COMISSAO-01.md` (cabeçalho e §7) | HIGH fixada (D-11), cláusula de reavaliação, exigência da Regra 22 |
| 6 | Severidades citadas por leitura dirigida dos relatórios de origem nesta sessão: `T32-SUP-F03` HIGH (`T-32_CLIENT_SUPRIMENTOS.md:65`); `T18-F02`/`T18-F03` HIGH (`T-18_…md:290`); `T-05-04` HIGH (seção HIGH de `T-05_…md:32-148`); `T19-F03` HIGH (`T-19_ARQUITETURA.md:246`); `T17-F03` HIGH (`T-17_…md:310`); `AUD-SEC-T04-01` HIGH (`T04_ADENDO_SEVERIDADE_AUD-SEC-T04-01.md:20-27`); `T13-F09` MEDIUM (`T-13_…md:355`); `T22-F02`/`T22-F04` MEDIUM (`T-22_PLATAFORMA.md:44,64`); 14 HIGH da Rodada 3 nominais (`T-26_CONSOLIDACAO_RODADA3.md:157-159`); 7 HIGH de T-27 (`T-26_CONSOLIDACAO_RODADA2.md:62-85`) |

Nenhuma memória usada como fonte normativa (Regras 8/10).

---

## 1. RECLASSIFICAÇÕES DECORRENTES DE APR-2026-031 — delta explícito sobre T-38 §4.2

### 1.1 Movimentos por ID (DE → PARA)

| ID | Sev. (intocada) | DE (T-38) | PARA | Fundamento |
|---|---|---|---|---|
| `AUD-INTEG-03` | CRITICAL | AMBIGUO | **PRODUCAO_REAL** | D-13 item 1 (`APPROVALS.md:1552-1555`) — módulo dev que **escreve** sobre os 327 itens reais. Resolve `DIV-T38-03` |
| `FIND-ERP-001` | CRITICAL | DEV_HOMOLOGACAO | **PRODUCAO_REAL** | D-13 item 1. Já em remediação (CASE-001) — caso em curso não é reordenado por mim; a ordem de caso é do director |
| `T32-SUP-F03` | HIGH | DEV_HOMOLOGACAO | **PRODUCAO_REAL** | D-13 item 1. Cluster `C-31` com `AUD-INTEG-03` (`T-26_CONSOLIDACAO_RODADA3.md:274` — mesmo defeito, conta uma vez; ver §3) |
| `AUD-ALOG-01` itens **/C**, **/F**, **/G** | HIGH (itens) | DEV/HOMOLOGAÇÃO (rótulo da trilha) | **PRODUÇÃO REAL** (metadado do finding) | D-13 item 2 (`APPROVALS.md:1556-1559`) — `APR-2026-016` vence o rótulo da trilha. Resolve `DIV-T38-01`. **Sem efeito de contagem**: `AUD-ALOG-01` já conta uma vez em PRODUCAO_REAL (convenção R4 §2.4) |
| `AUD-RH-CPFSEARCH-01` | HIGH | AMBIGUO | **DEV_HOMOLOGACAO** | D-13 item 4 (`APPROVALS.md:1564-1566`) — uso real de `employees` confirmado SÓ para o fluxo de desligamento; o restante do módulo segue dev. "Mantém o estrato atual" = estrato HIGH dev |

O enunciado, a severidade e a autoria de cada finding permanecem como estão nos artefatos de
origem (Regra 15) — este documento só anexa o ambiente decidido.

### 1.2 Contagem final por ambiente (DE → PARA sobre T-38 §4.2)

| Ambiente | T-38 | Delta | **T-39 (produto)** |
|---|---|---|---|
| **PRODUCAO_REAL** | 37 | +3 (`AUD-INTEG-03`, `FIND-ERP-001`, `T32-SUP-F03`) | **40** |
| **MISTO** (recortes §4.4 de T-38) | 66 | 0 | **66** |
| **DEV_HOMOLOGACAO** | 315 | −2 (`FIND-ERP-001`, `T32-SUP-F03`) +1 (`AUD-RH-CPFSEARCH-01`) | **314** |
| **GOVERNANCA_DOC** | 26 | 0 | **26** |
| **AMBIGUO** | 2 | −2 | **0** |
| **TOTAL** | 446 | 0 | **446** — fecha com o placar da Rodada 4 §2.5 |

Estratificação do balde PRODUCAO_REAL (era 2C·9H·14M·10L·2I = 37):
**4 CRITICAL · 10 HIGH · 14 MEDIUM · 10 LOW · 2 INFO = 40.** Fecha.

### 1.3 Efeito de D-11 no placar por severidade (DE → PARA sobre R4 §2.5)

| Severidade | R4 | **T-39** | Delta |
|---|---|---|---|
| CRITICAL | 9 | **9** | — |
| HIGH | 88 | **89** | +1 `AUD-RH-COMISSAO-01` (HIGH fixada pelo dono, D-11 — `APPROVALS.md:1539-1548`) |
| MEDIUM / LOW / INFO | 227 / 110 / 11 | **227 / 110 / 11** | — |
| Sem severidade fixada | 1 | **0** | D-11 fecha a coluna |
| **TOTAL** | 446 | **446** | fecha |

**Regra 22 — estado atualizado:** 9 + 89 = **98 sob o regime; 97 com veredito adversarial
registrado; 1 exceção**: `AUD-RH-COMISSAO-01`, cuja validação tornou-se exigível com a fixação
(R4 §7.2: "a validação só é exigível depois da fixação") e **ainda não ocorreu** — ver §4.1.
A cláusula de reavaliação para CRITICAL (payroll em produção) acompanha o finding como metadado
obrigatório da fila (3º critério, R4 §5.1).

---

## 2. A FILA — critério do dono aplicado exatamente como delimitado

Regra de ordenação (composição de `AUD-ALOG-01.md` §5 + D-13 item 3, `APPROVALS.md:1560-1563`):
**estrato 1** CRITICAL·produção real → **estrato 2** HIGH·produção real → **estrato 3**
CRITICAL·dev → **estrato 4** HIGH·dev → MEDIUM/LOW/INFO depois, **produção real à frente dentro
de cada estrato de severidade**. Exposição real reordena **apenas** CRITICAL e HIGH. Dependências
`OR-*` reordenam dentro do estrato; dependência de item produção real herda a prioridade do
dependente, no recorte necessário. Posição intra-estrato além de severidade e `OR-*` é
recomendação técnica — a ordenação final de execução é do director (Regra 5); casos já abertos
(CASE-001, CASE-002) seguem a ordem do director, não a minha.

### 2.1 ESTRATO 1 — CRITICAL · PRODUÇÃO REAL (4 findings)

| Pos. | ID | Notas de execução (insumo registrado, não ordem minha) |
|---|---|---|
| **1** | **`AUD-ALOG-01/A`** — `DELETE /api/employees/:id` sem trilha | Posição 1 mantida (R4 §5.2). Reteste `DYN-T03-07` espera **14 linhas** (R4 §3.2); log sem ator não fecha. `Employee` é PK INTEGER — sem colisão com `AUD-DB-04`. Instala o padrão `logAction` em `employees` (**OR-20**) |
| **2** | **`AUD-AUTHN-01`** — autenticação (auth + `docker-compose.yml`) | Recomendação registrada em T-38 §6.1 (à frente ou em paralelo à pos. 1 — decisão do director): anula os demais controles de authZ; prova dinâmica mais barata da run (`DYN-T02-01`). **Causa-raiz no recorte `T18-F02`** (compose/runtimeEnv) — remediar sem tocar a causa-raiz reabre o achado; ver §3 |
| **3** | **`AUD-INTEG-03`** — escrita de inventário móvel/inventário sobre os 327 itens reais | **Novo no estrato** (D-13 item 1). Cluster **`C-31`** com `T32-SUP-F03` (estrato 2): saldo fantasma alimenta a netagem do MRP — **um item de remediação, conta uma vez** (`T-26_CONSOLIDACAO_RODADA3.md:274`) |
| — | **`FIND-ERP-001`** — idempotência de inventário | **PRODUÇÃO REAL por D-13 item 1**, já em remediação (**CASE-001**): caso em curso, não reordenado por mim |

### 2.2 ESTRATO 2 — HIGH · PRODUÇÃO REAL (10 findings contados + 4 itens-metadado + recortes MISTO)

**Cabeça do estrato** (nota DE→PARA: `AUD-ALOG-01/B` ocupava a posição 2 absoluta em R4 §5.2,
quando só havia 2 itens de produção real na fila; a aplicação literal do critério — severidade
dentro do estrato — o coloca à frente de todos os HIGH, **após** os CRITICAL do estrato 1. Não é
rebaixamento: é o critério do dono operando sobre o corpus agora classificado):

1. **`AUD-ALOG-01/B`** — `PATCH /api/items/:id/inactivate` (e `DELETE /api/items/:id`, mesmo
   handler mudo, `items.ts:20-21`) sobre o universo dos 327 reais. **Dependência herdada:
   `AUD-DB-04` no recorte `Item`/UUID (`OR-21`)** — ver §3.
2. **`AUD-ALOG-01/C`** (`itemController.ts:205`), **`/F`** (`categoryController.ts:66`),
   **`/G`** (`departmentController.ts:65`) — **sobem a PRODUÇÃO REAL por D-13 item 2**
   (`APR-2026-016` vence o rótulo da trilha). Itens-metadado do mesmo finding: remediação e
   reteste no lote de `AUD-ALOG-01`.
3. Os **9 HIGH nominais** de T-38 §4.3, por ID:
   `AUD-T01-01` · `AUD-T01-02` · `AUD-AUTHN-02` · `AUD-AUTHN-03` · `AUD-DB-01` · `AUD-DB-02` ·
   `AUD-DB-03` (no recorte tier 1 + trilha `auditLogs`; a amplitude segue a partição de lotes da
   R4 §3.2 — a classe "desativação lógica" é de `AUD-ALOG-01`, sem dupla contagem) ·
   `FIND-ERP-002` · `T33-A-F04` (rota legada de desligamento — mesma superfície de
   `AUD-ALOG-01/A`; remediar junto).
4. **`T32-SUP-F03`** — "estoque inicial" cria saldo sem movimento nem depósito. **Novo no
   estrato** (D-13 item 1). Cluster `C-31` com `AUD-INTEG-03` — um item de remediação.

**Recortes MISTO que herdam o estrato (no recorte necessário — T-38 §4.4; extração âncora a
âncora segue como pendência T-19 do director):** `AUD-SEC-T04-01` (2 âncoras em módulos de
produção), `T-05-04` (lado `items` da escrita de status), `T17-F03` (recorte rotas tier 1 +
`auth`), `T18-F02` (causa-raiz de `AUD-AUTHN-01`), `T18-F03` (segredos, incl. JWT), `T19-F03`
(ciclo `items ⇄ mrp`). Todos HIGH (fontes em §0 item 6). O restante de cada trilha MISTO segue a
fila dev normal.

### 2.3 ESTRATO 3 — CRITICAL · DEV/HOMOLOGAÇÃO (5 findings)

| ID | Notas |
|---|---|
| **`FIND-ERP-005`** | em remediação (**CASE-002**, READY_FOR_RETEST com 2 pendências humanas) — caso em curso, não reordenado |
| **`T08-F01`** | fiscal — NF-e em não-produção hoje (`T-26_CONSOLIDACAO.md:474-476`), sem atenuação de severidade |
| **`T24-F01`** | fiscal — idem |
| **`AUD-COM-DESCONTO-01`** | sales/fiscal — severidade fixada pelo dono (R3) |
| **`AUD-RH-VTHORISTA-01`** | caso `'horista'` **livre para seguir já**; caso `'comissionado'` **bloqueado por `AUD-RH-COMISSAO-01`** (**OR-24** — ver §3). Cláusula de reavaliação automática: BLOQUEANTE na entrada do módulo em produção |

### 2.4 ESTRATO 4 — HIGH · DEV/HOMOLOGAÇÃO (79 IDs, sujeito à ressalva de §6.1)

Contagem: 89 HIGH totais − 10 HIGH de produção real = **79** (inclui os HIGH das trilhas MISTO
na sua parte não-produção; eventuais HIGH do balde GOVERNANCA_DOC saem por §4.3 — a contagem
severidade × ambiente desses baldes segue travada por `OBS-T38-02`, ver §6.1).

**(a) Nominais rastreados nas Rodadas 2-4, por ID (22):**

- Rodada 2 (T-27, 7): `T27-JUR-F01`, `T27-JUR-F07`, `T27-RH-H01`, `T27-RH-H02`, `T27-RH-H03`,
  `T27-SST-F01`, `T27-RFQ-01`.
- Rodada 3 (13 — dos 14 nominais de `T-26_CONSOLIDACAO_RODADA3.md:157-159`, menos `T32-SUP-F03`
  que subiu ao estrato 2): `T32-PROD-F02`, `T32-HRJUR-F01`, `T32-FST-F01`, `T32-FST-F04`
  (veredito de autorização pendente — R3 §6.2/T-01), `T32-SUP-F01`, `T32-SUP-F02`, `T33-A-F01`,
  `T33-A-F02`, `T33-B-F02`, `AUD-RH-CPFSEARCH-01` (dev por D-13 item 4; `OR-20` reduz o
  pré-requisito de `OR-14`), `AUD-TES-SALDOMANUAL-01`, `AUD-CTB-DEBCRED-01` (**HIGH preservada
  enquanto D-01 aberta** — posição provisória, ver §4.2).
- Rodada 4 (1): `AUD-EST-TRUNCCADEIA-01` (**OR-22**: precisão antes/junto da correção de unidade
  da carga — nunca unidade primeiro).
- Nova (1): **`AUD-RH-COMISSAO-01`** — HIGH fixada (D-11), **posição reservada, NÃO LIBERADA à
  SanaCore**: sem veredito da Regra 22 (§4.1). Cláusula de reavaliação para CRITICAL se payroll
  entrar em produção.

**(b) Demais HIGH dev (57, por ponteiro):** os HIGH da Rodada 1 em módulos dev e a parte
não-produção das trilhas MISTO — enumerados nas trilhas de origem e em
`T-26_CONSOLIDACAO.md` §1.3. A enumeração um a um deste bloco **não é publicada aqui** porque as
colunas da Rodada 1 §1.3 não fecham por ±2 (`OBS-T38-02`/`OBS-T26-04`) — publicar lista
"completa" herdando defeito conhecido seria pior que declarar o limite. Ver §6.1. A SanaCore
recebe estes IDs pelos **lotes por grupo (G-01…G-24)** já particionados nas consolidações, que
não dependem da reconciliação ±2.

### 2.5 MEDIUM / LOW / INFO — depois dos estratos 1-4, produção real à frente dentro do estrato

Por contagem + ponteiro (conforme o mandato admite):

| Bloco | Contagem | À frente dentro do bloco | Ponteiro |
|---|---|---|---|
| MEDIUM | 227 | **14 de produção real** (T-01/T-02/T-03 — estratificação de T-38 §4.2) + recortes MISTO MEDIUM nomeados: `T13-F09`, `T22-F02`, `T22-F04` (no recorte) | trilhas de origem; T-38 §4.2/§4.4 |
| LOW | 110 | **10 de produção real** | idem |
| INFO | 11 | **2 de produção real** | idem |

Nota: por D-13 item 3, estes blocos **não** saltam sobre nenhum CRITICAL/HIGH — a precedência de
produção real aqui opera só **dentro** do bloco de mesma severidade. O bloco `AUD-DB-04…-09`
(MEDIUM ×6) permanece neste segmento **com posição provisória** — sujeito a D-R1/D-R2/D-R3
(§4.2); o recorte `Item`/UUID de `AUD-DB-04` herda prioridade de estrato 2 por `OR-21` (§3).

**Conferência de cobertura da fila:** 4 (E1) + 10 (E2) + 5 (E3) + 79 (E4) = 98 = 9 CRITICAL +
89 HIGH. 98 + 227 + 110 + 11 = 446. Fecha com §1.2 e com a Rodada 4 §2.5. Os 26 documentais
estão contidos nos blocos MEDIUM/LOW/INFO/HIGH acima e **saem da fila de exposição** (§4.3) —
a subtração exata por severidade depende da estratificação do balde GOV, não publicada
(`OBS-T38-02`; §6.1).

---

## 3. DEPENDÊNCIAS DE REMEDIAÇÃO HERDADAS — para a SanaCore não descobrir na hora

`OR-01`…`OR-19` (Rodadas 1-3) permanecem vinculantes e inalteradas — ponteiro:
`T-26_CONSOLIDACAO_RODADA4.md` §5.3 e rodadas anteriores. As desta fila, com efeito de estrato:

| # | Dependência | Efeito na fila |
|---|---|---|
| **OR-20** | `AUD-ALOG-01/A` **instala o padrão `logAction` em `employees`** | executar antes/junto do recorte `employees` do lote `AUD-DB-03` reduz o pré-requisito de `OR-14` (item 4 da §6 de `AUD-RH-CPFSEARCH-01`) |
| **OR-21** | **`AUD-ALOG-01/B` ← `AUD-DB-04` no recorte `Item`/UUID** (PK UUID × `entity_id integer`): emitir `logAction` sem resolver a representação reproduz o modo de falha `22P02` (`T-37` §7.2) | `AUD-DB-04` é MEDIUM dev, mas o **recorte herda a prioridade do dependente** (2º critério do dono) — tratar como dependência do estrato 2 ou adotar o contorno documentado **declaradamente** |
| **OR-22** | `AUD-EST-TRUNCCADEIA-01` **antes (ou junto) da correção de unidade da carga** (`docs/carga-inicial/insumos-materia-prima.csv:82,178,197`, `revisar=SIM`) | precisão primeiro, nunca unidade primeiro — corrigir unidade com `(10,2)` na cadeia converte risco latente em perda ativa |
| **OR-23** | remediação de `AUD-ALOG-01/D` e `/E` corrige também os READMEs que declaram a ausência de log como intencional (`suppliers/README.md:146-148`, `clients/README.md:165-167`) | senão a guarda docs-drift acusa, ou o texto volta a legitimar a omissão |
| **OR-24** | **caso `'comissionado'` de `AUD-RH-VTHORISTA-01` ← `AUD-RH-COMISSAO-01`** (sem a parte fixa separada, a fórmula correta não tem insumo); caso `'horista'` segue imediatamente | bloqueio parcial dentro do estrato 3; a decisão "VT sobre a parte fixa" **já está registrada** — não é pendência |
| **OR-25** | `AUD-PAT-DEPRECIACAO-01` não inicia antes do **gate humano D-12** (implementar depreciação × remover coluna) | MEDIUM dev — segmento de §2.5; bloqueado até D-12 |
| **C-31** | `AUD-INTEG-03` (estrato 1) + `T32-SUP-F03` (estrato 2) — mesmo defeito de saldo fantasma que alimenta a netagem do MRP (`T-26_CONSOLIDACAO_RODADA3.md:274`) | **um item de remediação, conta uma vez** — planejar juntos |
| — | `AUD-AUTHN-01` ← **`T18-F02`** (causa-raiz: `NODE_ENV` default `development` — compose/runtimeEnv) | corrigir o sintoma sem a causa-raiz reabre o achado; o recorte `T18-F02` está no estrato 2 |
| — | Recomendação registrada por T-22 (decisão do director): `T22-F02` (validação automatizada dos composes) como **pré-requisito do fechamento definitivo** de `T18-F02`/`T18-F03` (`T-22_PLATAFORMA.md:84`) | sem gate automatizado, a correção de valor não impede recorrência |
| — | `T33-A-F04` — mesma superfície do item A de `AUD-ALOG-01` (`AUD-ALOG-01.md:59-63`) | remediar no mesmo lote do estrato 1/pos. 1 |
| — | Cláusulas de reavaliação automática (metadado obrigatório — R4 §5.1, 3º critério): `AUD-RH-VTHORISTA-01`, `AUD-EST-TRUNCCADEIA-01`, `AUD-PAT-DEPRECIACAO-01` (dispara também no primeiro leitor de `current_value`), `AUD-RH-COMISSAO-01` (payroll em produção → CRITICAL) | sobem a BLOQUEANTE sem novo despacho |

Registro de forma (`OBS-T39-02`): `T-26_CONSOLIDACAO_RODADA4.md` §3.3 cita "(OR-25, §5.3)" para a
dependência comissionado↔comissão, mas a tabela §5.3 a numera **OR-24** (OR-25 é o gate de
`AUD-PAT-DEPRECIACAO-01`). Adoto a tabela §5.3, que é a lista normativa; divergência interna de
remissão registrada, não resolvida por mim (Regra 20).

---

## 4. O QUE SEGUE FORA DA FILA (ou nela com trava) — e por quê

### 4.1 Sem veredito da Regra 22 — NÃO LIBERADO para remediação

- **`AUD-RH-COMISSAO-01`** (HIGH, D-11): a fixação tornou a validação adversarial **exigível e
  ainda não realizada** (`AUD-RH-COMISSAO-01.md:142-143`; R4 §7.2). Posição reservada no
  estrato 4 (§2.4a); **não segue à SanaCore antes do veredito do `vericore-finding-validator`**
  (Regra 22 — validação de CRITICAL/HIGH é autoridade dele, não minha). Única exceção vigente da
  Regra 22 no corpus (97/98 com veredito).

### 4.2 Pendências abertas do dono — posições provisórias, decisões NÃO tomadas aqui

`APR-2026-031` declara expressamente **não** cobrir estas quatro (`APPROVALS.md:1583-1589`):

| Pendência | Efeito na fila enquanto aberta |
|---|---|
| **D-01** — rebaixamento de `AUD-CTB-DEBCRED-01` (HIGH→MEDIUM recomendado pelo validador) | permanece **HIGH no estrato 4** ("HIGH preservada enquanto não houver decisão", R4 §6.1) — posição provisória; se rebaixado, desce ao bloco MEDIUM. O item "rejeitar em vez de ignorar valores `<= 0`" tem prioridade independente nos dois desfechos |
| **D-R1** — severidade de `AUD-DB-09` (reexame) | bloco `AUD-DB-04…-09` permanece MEDIUM ×6 no segmento de §2.5, com a ressalva do G-06 anotada (R4 §4.6) |
| **D-R2** — ratificação dos 5 MEDIUM do bloco | idem — posição provisória |
| **D-R3** — condicional de fronteira do reexame | idem |

O recorte `Item`/UUID de `AUD-DB-04` já tem tratamento independente dessas decisões via `OR-21`.

### 4.3 Os 26 findings documentais (GOVERNANCA_DOC)

`T-14` (9) · `T-15` (10) · `T-23` (5) · `FIND-ERP-007` · `AUD-PROC-DOCDRIFT-01` — **fora da fila
de exposição real**: não têm ambiente de execução (convenção de T-38 §1.2, item 4 da §5 —
**segue aberto**, ver §5). Permanecem devidos por severidade no ciclo normal de remediação
documental; nenhum é descartado.

### 4.4 Fora da fila de produto por natureza

- **`AUD-PROC-CUSTODIA-01`** — categoria "processo da auditoria", separada do placar de produto
  desde a Rodada 3 §5; não é item de remediação da SanaCore no objeto auditado.
- **`AUD-PAT-DEPRECIACAO-01`** — na fila (segmento MEDIUM), mas **sem início** antes do gate
  humano D-12 (`OR-25`).
- Casos em curso **CASE-001** (`FIND-ERP-001`) e **CASE-002** (`FIND-ERP-005`): dentro da fila
  para efeito de placar, **fora da minha reordenação** — sequenciamento de caso aberto é do
  director.

---

## 5. ITENS 4 E 6 DA §5 DO T-38 — abertos, e NÃO bloqueiam esta emissão

1. **Item 4** (convenção "ambiente não aplicável" para os 26 documentais): **não submetido ao
   dono nesta rodada** (`APPROVALS.md:1568-1570`). Não bloqueia: os 26 estão fora da fila de
   exposição por convenção declarada e reversível; se o director reverter para "classificar pelo
   módulo referido", o efeito é determinístico (T-38 §1.2) e será aplicado por adenda a esta
   fila, sem reescrevê-la.
2. **Item 6** (atualização do `PRODUCTION_STATUS_MAP.md`, defasado em `employees` —
   `DIV-T38-02`): **autoridade do director, encaminhada** (`APPROVALS.md:1570-1571`). Não
   bloqueia: esta fila usa a decisão humana posterior registrada (`AUD-ALOG-01.md:20,42-57` +
   D-13 item 4), que prevalece sobre o mapa desatualizado; o mapa está fora do meu namespace
   (Regra 16).

---

## 6. DIVERGÊNCIAS, LIMITES E PENDÊNCIAS DESTA EMISSÃO — sem atenuação

### 6.1 Divergência mandato × artefato — registrada (Regra 7: artefato vence)

O mandato desta emissão pede os **estratos 1-4 enumerados por ID, completos**. Os estratos 1, 2
e 3 estão completos por ID. O **estrato 4 está completo por contagem (79) e parcial por
enumeração (22 nominais + 57 por ponteiro)**: a enumeração um a um dos HIGH da Rodada 1 herda o
defeito aritmético **registrado** `OBS-T38-02`/`OBS-T26-04` (colunas HIGH/MEDIUM da Rodada 1
§1.3 não fecham por ±2), e o balde GOVERNANCA_DOC não tem estratificação por severidade
publicada. Publicar lista declarada "completa" sobre base que não fecha seria fabricar
completude — o artefato vence o mandato. **Desbloqueio:** reconciliação do ±2 pelo director
(pendência já escalada em T-38 §3/`OBS-T38-02`); feita ela, a enumeração integral do estrato 4
sai por adenda determinística.

### 6.2 Alcance da decisão de classe (D-13 item 1) — aplicação nominal

Apliquei o movimento aos **3 IDs nomeados** na decisão (`AUD-INTEG-03`, `FIND-ERP-001`,
`T32-SUP-F03` — `APPROVALS.md:1554-1555`). A **classe** decidida ("módulo dev que escreve sobre
os 327 itens reais") pode alcançar outros IDs (ex.: demais achados de T-06 cujas âncoras sejam
caminhos de escrita sobre `items`) — a verificação âncora a âncora é da mesma natureza da
extração dos recortes MISTO e fica registrada como **P-T39-01** (mesmo titular da pendência
T-19: director). Não estendi por analogia sem verificação (Regra 6).

### 6.3 Demais limites

1. Severidades e ambientes citados de relatórios de origem foram conferidos por leitura dirigida
   nesta sessão (§0 item 6); **nenhum arquivo do objeto auditado foi aberto**.
2. As posições intra-estrato além de severidade fixada + `OR-*` são recomendação; a ordenação
   executiva é do director (Regra 5).
3. A extração âncora a âncora dos recortes MISTO segue pendente (T-19, director) — os recortes
   listados em §2.2 são os **nomeados** em T-38 §4.4, não a extração completa.
4. O par de cobertura segue dois corpora atrás (`OBS-T26-33`) — esta emissão não o substitui, e
   nenhum veredito final de auditoria decorre desta fila (R4 §7.4).

---

## 7. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2). Única escrita:
  este documento, em `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`.
- `T-38` e as rodadas de `T-26` **não foram editados** (Regra 15) — todos os deltas estão aqui,
  em DE → PARA, com a decisão humana que os funda citada por linha de `APPROVALS.md`.
- **Nenhuma severidade foi alterada por mim** (Regra 18): D-11 é fixação do dono, registrada; a
  única mudança de placar (coluna "sem severidade" → HIGH) é a execução dessa fixação.
- Nenhum finding novo, nenhum descartado, nenhum `DUPLICATE` novo. Nenhum `FINDING CLOSED`,
  `RETEST_PASSED`, `AUDIT_PASSED`, `FINDINGS_CONFIRMED` ou `REMEDIATION COMPLETE`.
- **Critério de conclusão:** 446/446 posicionados (98 nos estratos 1-4; 348 nos blocos de §2.5,
  dos quais 26 documentais fora da fila de exposição); 0 AMBIGUO remanescente; aritmética fecha
  nos dois sentidos contra T-38 §4.2 e Rodada 4 §2.5; toda trava de liberação (Regra 22, D-01,
  D-R1…R3, D-12, C-31, `OR-20`…`OR-25`) está declarada na posição a que se aplica.

**Entrega:** ao `vericore-software-audit-director` (ordenação executiva; `P-T39-01`; T-19;
reconciliação `OBS-T38-02`; despacho de `AUD-RH-COMISSAO-01` ao `vericore-finding-validator`) e
ao `vericore-audit-reporting-agent` (esta fila acompanha o corpus consolidado; vinculado ao
bloqueio normativo da R4 §4.3). A SanaCore recebe a fila **via director**, com as dependências
de §3 e as travas de §4 como parte integrante de cada lote.
