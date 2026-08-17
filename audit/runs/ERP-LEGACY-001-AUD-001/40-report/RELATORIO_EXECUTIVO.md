# RELATÓRIO EXECUTIVO DE AUDITORIA — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION)
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
PRODUZIDO POR: vericore-audit-reporting-agent (VeriCore)
DATA:          2026-08-17 — REVISÃO 2 (emissão original 2026-08-17)
AUTORIZAÇÃO:   APR-2026-042 D4 — "Prossiga para consolidação rodada 5 → relatórios finais"
               APR-2026-043 (5 pendências de encerramento) e APR-2026-044 (3 devoluções do T-49):
               revisão dos três relatórios para refletir as decisões (APR-2026-043, item 4 do
               estado de encerramento).
FONTE DO PLACAR: 07-findings/T-26_CONSOLIDACAO_RODADA5.md §1.5, mais o finding aberto por
               APR-2026-044 D1 (ver §2.1 e a divergência aritmética declarada).
FONTES NOVAS DESTA REVISÃO: 07-findings/F-5_LISTA_IN_OUT_CATEGORIA.md ·
               07-findings/T-49_CRITERIOS_RETESTE_T41.md ·
               07-findings/AUD-RH-VALIDADENULA-01.md · 07-findings/T-48_VALIDACAO_T41.md
DESTINATÁRIO:  dono do CoreTriad (Gilwagno) e vericore-software-audit-director
REGIME:        read-only. Zero comando, zero execução, zero conexão de banco (APR-2026-016 íntegra).
               Única escrita: audit/runs/ERP-LEGACY-001-AUD-001/40-report/.
NÃO DECLARA:   AUDIT_PASSED · FINDINGS_CONFIRMED · RETEST_PASSED · FINDING CLOSED ·
               REMEDIATION COMPLETE · G3 cumprido · C-136/C-137/C-133 fechadas.
               O veredito final é gate humano (Regras 4 e 5). Este documento RELATA o estado; não o decide.
```

---

## 0. A primeira coisa que a direção precisa saber

**A auditoria NÃO está encerrada.** A `APR-2026-042` D4 liberou a **produção** dos três
relatórios; **não** liberou o encerramento da auditoria. Estes documentos são o **produto do
trabalho de campo**, não o seu fechamento.

**O que mudou nesta revisão:** a contradição de governança da §1 — que era, até
`APR-2026-038` D3, **condição de fechamento** — foi **resolvida por decisão humana registrada**
(`APR-2026-043` D1). Ela **não sai do relatório**: passa a ser narrada como contradição que houve
e que foi reconciliada, com o mecanismo declarado. Um relatório que apagasse o episódio seria pior
que um que o deixasse aberto.

O encerramento continua dependendo de gates humanos abertos, nominados na §12 — outros, e menos.

Nenhum finding foi fechado. Nenhuma remediação foi aceita. Nenhum `AUDIT_PASSED` foi emitido, e
nenhuma linha deste relatório pode ser lida como tal.

---

## 1. CONTRADIÇÃO ENTRE DOIS ARTEFATOS DE GOVERNANÇA APROVADOS: `G3` × `EMENDA-01` — **HOUVE, E FOI RECONCILIADA POR DECISÃO REGISTRADA**

> **Estado do gate a partir de `APR-2026-043` D1: `G3` = `REDUCED_BY_DECISION`.**
> **`APR-2026-038` D3 está RESOLVIDA** — deixa de ser condição de fechamento e passa a fato
> registrado.

Esta seção permanece no Relatório Executivo, com destaque, por dois motivos cumulativos: porque a
determinação original do dono (`APR-2026-038` D3) exigia destaque e **veda redação minimizadora**;
e porque a determinação que a resolve (`APR-2026-043` D1) exige que o registro fique **honesto** —
*"reduzido por decisão, não contornado"*. **Registrar a reconciliação sem registrar a contradição
seria suavização.** As duas coisas ficam.

### 1.1 A contradição, enunciada sem suavização (registro histórico, inalterado)

| Artefato aprovado | Citação | O que determina |
|---|---|---|
| **Gate `G3`** — `APPROVED_WITH_CONDITIONS` | `coretriad/governance/APPROVALS.md:584` | **VEDA amostragem reduzida** em autenticação, autorização, segregação de funções, operações financeiras, movimentação de estoque, **integridade de dados**, contratos/jurídico, permissões administrativas, operações destrutivas, segurança, multi-tenancy e regras de negócio críticas — nesses casos exige **cobertura ampliada ou 100 % quando tecnicamente aplicável**. Inclui **dado pessoal**. |
| **`APR-2026-037` (EMENDA-01 a `APR-2026-024`)** | `coretriad/governance/APPROVALS.md:1860-1990`, critério na `:1882-1883` | **ACEITA cobertura parcial**, com exclusão nominal por escrito, em bandas que **incluem dado pessoal e integridade de dados**: *"Cobertura total onde o risco é maior — dinheiro, estoque, fiscal e dado de saúde. Cobertura parcial documentada, com lista nominal, no restante."* |

**Os dois estavam aprovados. Os dois estavam em vigor. Eles se contradiziam.** A `APR-2026-024`
Decisão A havia **recusado explicitamente** a Opção B — aceitar cobertura parcial com exclusão
registrada no relatório final (`APPROVALS.md:830-832`) — e a `APR-2026-037` **emendou a própria
recusa**, instituindo o critério de cobertura parcial documentada **sem declarar que relaxava o
gate**. A caracterização feita pelo dono na ocasião, reproduzida por dever de registro: *"é um gate
que a própria auditoria criou e depois contornou"*.

### 1.2 Como foi reconciliada — pelo mecanismo que o próprio gate previa

O `G8` (`APPROVALS.md:585`) já estabelecia o caminho legítimo: *"Redução futura = nova decisão
humana registrada como **exclusão explícita**"*.

`APR-2026-043` **D1** aplicou-o, em termos literais:

> *"Aprovo a redução formal via `G8`. É um caminho legítimo, não atalho: o próprio gate já previa
> esse mecanismo de exclusão explícita registrada. Reconcilia sem refazer trabalho, e o registro
> fica honesto ('reduzido por decisão', não 'contornado')."*
>
> *"Reduzir `G3` formalmente pela via do `G8`: a exclusão nominal da EMENDA-01 é a exclusão
> explícita que o `G8` prevê. **Registrar como reconciliação, não como contorno.**"*

**O instrumento é a exclusão nominal**, que já existia e já estava entregue: 25 tabelas de
dinheiro, 8 de dado pessoal não sensível, 22 de 2ª ordem, 53 da banda excluída e 22 sem model —
**todas nomeadas tabela a tabela** em `T-43` §9, `T-45` §9, `T-42` §2.4/§2.5, `T-41` §3.2 e
`T-47` §1.5, reproduzidas no Relatório Técnico §7.4. **A exclusão nominal é o que torna a redução
auditável**; sem ela, a decisão seria uma frase genérica de escopo, que este programa veda.

### 1.3 O que a reconciliação faz — e o que expressamente NÃO faz

**Faz:** encerra a pendência de governança. `APR-2026-038` D3 sai da lista de condições de
fechamento (§12).

**NÃO faz — e isto é o que impede que a reconciliação seja lida como aval de cobertura:**

1. **Não amplia cobertura nenhuma.** As bandas excluídas continuam **exatamente** as mesmas. A
   banda **dinheiro** — 25 tabelas de 1ª ordem — segue fora, e recai em "operações financeiras" e
   "integridade de dados", ambas categorias que o `G3` vedava. As **8 tabelas de dado pessoal não
   sensível** seguem fora (`RES-T45-10`, `RES-T47-09`).
2. **Não converte exclusão em conformidade.** O que o `G3` agora diz, no estado
   `REDUCED_BY_DECISION`, é que a redução é **legítima e registrada** — não que o risco excluído
   tenha sido examinado. A ressalva material da banda dinheiro (§5) permanece integralmente
   vinculante e não é minimizada por esta seção.
3. **Não fecha `C-137`, `C-136` nem `C-133`**, e não autoriza afirmar `G3` "integralmente
   cumprido" (§15 item 2).

### 1.4 O que reduziu a tensão antes da decisão, e continua valendo

O fechamento do censo da **categoria especial do art. 5º II** (§6) tirou da exclusão as 18 tabelas
de dado de saúde e biometria — elas **entraram na cobertura**. Isso não resolvia a contradição
formal, mas reduziu materialmente o que a exclusão alcançava, e é parte do fundamento de por que a
redução pela via do `G8` é defensável hoje.

---

## 2. Placar de risco — o corpus da auditoria

### 2.1 O placar

**483 findings vigentes com severidade**, medidos e conferidos em `T-26_CONSOLIDACAO_RODADA5.md`
§1.5, **mais 1 finding aberto após a consolidação e ainda sem severidade fixada**:

| Severidade | Quantidade |
|---|---|
| **CRITICAL** | **9** |
| **HIGH** | **91** |
| **MEDIUM** | **248** |
| **LOW** | **124** |
| **INFO** | **11** |
| **Subtotal com severidade fixada** | **483** |
| **Sem severidade fixada** (`AUD-RH-VALIDADENULA-01`, `PROPOSED`, HIGH recomendada) | **1** |
| **TOTAL VIGENTE** | **484** |

Complemento do quadro, para que o número não seja lido isolado:

| Item | Valor |
|---|---|
| IDs emitidos no run | **502** (501 da rodada 5 + `AUD-RH-VALIDADENULA-01`) |
| `FALSE_POSITIVE` | **1** (`T11-F10`) |
| Absorvidos / `DUPLICATE` | **17** |
| Achado de **processo da auditoria** (categoria separada, não é defeito do produto) | **1** (`AUD-PROC-CUSTODIA-01`) |

Conferência publicada e refeita nos dois sentidos: 9 + 91 + 248 + 124 + 11 = **483**; 483 + 1 sem
severidade = **484**; 484 + 1 + 17 = **502**; 501 + 1 = **502**.

> **Divergência aritmética registrada (Regra 7), `DIV-REP-04`.** O placar oficial da rodada 5 é
> **483 / 501** e **não** contém `AUD-RH-VALIDADENULA-01`, porque o finding foi aberto **depois**
> da consolidação, por `APR-2026-044` D1. Este relatório **não força** o finding para dentro de
> nenhuma banda de severidade — ele **não tem severidade fixada**, e fixá-la seria violar as
> Regras 6 e 18. **O placar por severidade permanece o da rodada 5, inalterado**; o total vigente
> passa a 484 com a linha "sem severidade fixada" explícita. **A reconciliação formal do placar é
> ato do `vericore-audit-consolidator` / director**, não deste agente. Precedente já usado neste
> run: `AUD-RH-COMISSAO-01` também entrou sem severidade fixada e só depois foi fixado (`D-11`).

**`OBS-T48-05` NÃO entra no placar.** Por `APR-2026-044` D2, é **confirmação independente** de
`T43-SST-F01` — dois auditores, trilhas distintas, caminhos independentes, o mesmo defeito.
Contá-la como item novo inflaria o placar sobre o mesmo risco, prática que este run rejeita
expressamente. Ver §2.2.

**A série histórica correta de HIGH é 65 / 72 / 85 / 86 / 87** nas rodadas 1 / 2 / 3 / 4 / fila —
ver §8, erro da própria auditoria.

### 2.2 O finding novo e a confirmação convergente — as duas decisões de `APR-2026-044`

| Item | Decisão | Efeito no placar |
|---|---|---|
| **`AUD-RH-VALIDADENULA-01`** (candidato `T49-RH-C01`) — validade nula de ASO tratada como validade infinita, nos **dois** consumidores que decidem: retorno de afastamento (`SequelizeEmployeeDocumentRepository.ts:50`) e admissão (`ConcludeAdmissionProcessUseCase.ts:125`) | **ABERTO** como finding próprio (`APR-2026-044` D1). **Severidade PROPOSED, HIGH recomendada, NÃO fixada** — a fixação é do dono (Regra 18). **Se fixada em HIGH, aciona a Regra 22** | **+1**, na linha "sem severidade fixada" |
| **`OBS-T48-05`** — `CreateAsoUseCase.ts:74` grava o ASO **fora** da transação porque `SequelizeAsoRepository.ts:70-72` descarta o parâmetro | **Anexado como confirmação independente de `T43-SST-F01`** (`APR-2026-044` D2), **não** como item novo | **0** — reforça o finding existente |

**Por que a separação de `AUD-RH-VALIDADENULA-01` não infla o placar:** ele **compartilha o lote de
remediação** com `T41-RH-F02`. Nas palavras do dono: *"é o mesmo trabalho, só organizado com
clareza"*. **O que se separou foi a contabilidade, não o trabalho** — e a separação existe porque a
independência foi provada nos dois sentidos: executar **todo** o critério de `T41-RH-F02` deixa
este vetor inteiramente aberto, e corrigir a validade não reconcilia nada entre SST e RH.

---

## 3. Os 9 CRITICAL, e a distinção que muda a leitura de risco

Quatro dos nove CRITICAL estão em **produção real** — dado real da fábrica é tocado hoje
(`APR-2026-016`). Os outros cinco estão em dev/homologação, com o risco reconhecido para a
promoção a produção.

### 3.1 CRITICAL em PRODUÇÃO REAL — 4

| ID | Objeto | Por que é CRITICAL hoje |
|---|---|---|
| **`AUD-ALOG-01/A`** | `DELETE /api/employees/:id` — desligamento de funcionário sem trilha de auditoria | Ato de efeito trabalhista, previdenciário e financeiro, **em uso real**, que responde 200 e **não registra quem fez, quando, nem de onde**. Sem reconstituição possível; o ator pode encobrir o próprio rastro. |
| **`AUD-AUTHN-01`** | Chave de assinatura JWT com **default versionado** no ambiente que hospeda o dado real | Token forjado recebe autorização administrativa legítima em todos os endpoints, sem senha e sem rastro distinguível. **Anula os demais controles de autorização.** |
| **`AUD-INTEG-03`** | Scan móvel move estoque fora de depósito, de lote e da quarentena | Corrompe a invariante de saldo declarada no próprio código, **de forma persistente**, sobre os 327 insumos reais. Material não liberado pela Qualidade é baixado sem erro. |
| **`FIND-ERP-001`** | Idempotência de movimentação de estoque e pagamento parcial | Já em remediação (`CASE-001`); classificado produção real por `APR-2026-031` D-13 item 1. |

### 3.2 CRITICAL em DEV/HOMOLOGAÇÃO — 5

`FIND-ERP-005` (alçada de contrato jurídico, em remediação — `CASE-002`) · `T08-F01` e `T24-F01`
(fiscal/NF-e) · `AUD-COM-DESCONTO-01` (desconto perdido no faturamento) ·
`AUD-RH-VTHORISTA-01` (vale-transporte de horista/comissionado, com cláusula de reavaliação
automática a BLOQUEANTE se o payroll entrar em produção).

### 3.3 O critério de fila, e a consequência que o dono aceitou

A fila de remediação é ordenada por **exposição real**, não por severidade pura
(`APR-2026-031` D-13; `T-39`):

**estrato 1** CRITICAL · produção real (4) → **estrato 2** HIGH · produção real (10) →
**estrato 3** CRITICAL · dev/homologação (5) → **estrato 4** HIGH · dev/homologação (81) →
MEDIUM (248) → LOW (124) → INFO (11).

> **Consequência explicitamente apresentada ao dono e por ele aceita: um HIGH de produção real
> passa à frente de um CRITICAL de dev/homologação.** Não é inversão acidental de severidade; é o
> critério funcionando. A exposição real reordena **apenas** os estratos CRITICAL e HIGH — MEDIUM
> e LOW de produção real **não** saltam sobre CRITICAL/HIGH de dev (`D-13` item 3), justamente
> para evitar inversões extremas.

Conferência da fila: 4 + 10 + 5 + 81 = **100** = 9 CRITICAL + 91 HIGH; 100 + 248 + 124 + 11 = **483**.
`AUD-RH-VALIDADENULA-01` **não** está na fila — sem severidade fixada, não é estratificável (§2.1).

---

## 4. Regra 22 — 100 sob o regime, 100 com veredito adversarial

Todos os **100** findings CRITICAL e HIGH do corpus passaram pelo `vericore-finding-validator`
antes de qualquer encaminhamento a remediação, como a Regra 22 exige.

A consolidação da rodada 5 apurou **2 exceções vivas** — `T41-EST-F01` e `T41-RH-F02`, os dois
HIGH do lote 3 de `C-137`, que **ficaram sem validação por falha de despacho do orquestrador** e
só foram detectados na quinta rodada de consolidação. **`T-48` fechou as duas**, com veredito
`CONFIRMED (parcial)` e `CONFIRMED`, ambos com HIGH mantida.

**Estado final: Regra 22 — 100 / 100, zero exceções.** Ver §8: a falha de despacho é registrada
como erro da própria auditoria, não silenciada.

> **Efeito futuro declarado:** se o dono fixar `AUD-RH-VALIDADENULA-01` em **HIGH**, o universo da
> Regra 22 passa a **101** e o finding **tem de** receber veredito do `vericore-finding-validator`
> antes de qualquer remediação. Enquanto a severidade não for fixada, ele **não está** sob o
> regime — e **não está** no Remediation Backlog (que só admite `CONFIRMED`).

---

## 5. Cobertura — o que foi auditado, e o que declaradamente não foi

Auditoria de cobertura declarada, não alegada. As limitações abaixo são **afirmação**, não
omissão.

| Frente | Estado medido |
|---|---|
| Trilhas de fieldwork | **27/27 executadas**, mais 23 trilhas complementares (`T-27`…`T-49`, com `F-5`) e 6 rodadas de validação adversarial |
| Matriz de células elevadas pela `EMENDA-02` (137 células) | **85 integrais · 50 parciais · 2 não entregues** |
| **`C-137`** — semântica de coluna nas tabelas do schema | **`A(79/207)`** — 38,2 %. **NÃO fechada.** Déficit **128**, hoje **integralmente nominal** |
| **`C-136`** — contrato de API por dimensão (683 endpoints × 11 dimensões ≈ 7.500 células) | **Nenhuma trilha tocou, em 5 rodadas.** Método decidido por `APR-2026-043` D2 (dividir); **alvo redimensionado por `F-5`** — ver §5.2 |
| **`F-5`** — lista nominal IN × OUT por categoria vedada pelo `G3` | **PUBLICADA** (2026-08-17). Era a lacuna mais barata do run, aberta em 5 rodadas. 683/683 classificados, **zero não classificados** |
| `C-133` — `client/` | `A(157/167)` — parcial alta |
| `mobile/` e `tv/` | Triagem 100 % (`E`) |
| Evidência **dinâmica** (execução contra banco/servidor) | **≈232 pedidos catalogados, ~21 executados.** A auditoria é predominantemente **estática**, por força de `APR-2026-016`. **Duas coletas de alto valor seguem não autorizadas** — §5.3 |

**O que o relatório PODE afirmar sobre `C-137`:** cobertura **total** nas bandas **estoque**
(5/5), **fiscal** (3/3) e na **categoria especial do art. 5º II**; cobertura **parcial
documentada, com lista nominal**, nas demais.

**O que NÃO pode afirmar, e não afirma:** `C-137` fechada; cobertura integral da banda
**dinheiro**; `G3` integralmente cumprido; `C-136` tocada; `C-133` fechada.

> **Ressalva material da banda DINHEIRO, reproduzida sem minimizar** (`APR-2026-037` §5.1,
> palavras do dono): *"dinheiro é banda de risco alto, e esta exclusão é a mais custosa da
> decisão. […] **É razoável supor que haja mais ocorrências entre estas 25, e elas não serão
> encontradas por esta auditoria.**"* O fundamento é medido: o padrão *"coluna monetária cuja
> unidade é função de outra coluna que não a declara"* tem **três ocorrências independentes em
> três módulos** — é sistêmico, não incidental. **A redução formal do `G3` (§1) não altera esta
> ressalva em nada.**

### 5.1 `C-137` — o déficit está integralmente nomeado

| Item | Valor |
|---|---|
| Denominador oficial (`APR-2026-042` D1) | **207 tabelas · 22 sem model** |
| Cobertas | **79** |
| **Déficit** | **128** = **106 com model** + **22 sem model** |

**Todas as 128 estão nomeadas**, tabela a tabela, no Relatório Técnico §7 — fonte `T-43` §9 +
`T-45` §9, `T-42` §2.4/§2.5, `T-41` §3.2 e `T-47` §1.5. **Não há mais nenhuma tabela do schema
sem nome numa lista de auditoria.** A condição vinculante fixada três vezes pelo dono —
*"a exclusão consta nominalmente, tabela a tabela; frase genérica de escopo não vale"* — está
cumprida, e é o instrumento pelo qual `APR-2026-043` D1 reduziu o `G3` (§1.2).

Histórico da lista de exclusão de dado pessoal, para que o número certo seja usado:
**14** (`APR-2026-037` §5.2) → **11 nominais / 9 efetivas** (`APR-2026-039` §2) → **8**
(`APR-2026-040` D2). **A lista vigente é a de 8**, e a fonte nominal é `T-43` §9 + `T-45` §9 —
**não** `APR-2026-037` §5.2.

### 5.2 `F-5` publicada — e o resultado que contraria a expectativa de `APR-2026-043` D2

`APR-2026-043` **D2** decidiu **dividir** `C-136`: matriz de 11 dimensões integral nas rotas de
categoria vedada pelo `G3`, exclusão nominal com dimensão declarada no resto. `F-5` era o
pré-requisito. **`F-5` foi emitida e o resultado é desconfortável:**

| Faixa | Total | **IN-categoria** | **OUT** |
|---|---|---|---|
| Tier 3 profundo — nominal **por rota** | 174 | 119 | **55** |
| Tier 1 · Tier 2 · Tier 3 elevado · Tier 3 raso · `health` — por módulo | 509 | 509 | 0 |
| **TOTAL** | **683** | **628 (91,9 %)** | **55 (8,1 %)** |

**A divisão reduz o alvo da matriz em 8,1 %, não em uma ordem de grandeza.** As 55 rotas OUT estão
**nominadas uma a uma** em `F-5` §3, com arquivo, linha, verbo e path, e **todas as 55 estão dentro
do tier 3 profundo**.

> **Nas palavras do próprio auditor, reproduzidas porque a direção precisa do número antes de
> planejar:** *"quem dimensionar `C-136` contando com uma redução material **vai errar o prazo**, e
> essa é uma informação que o diretor precisa ter **antes** de planejar, não depois"*.

**Isto NÃO invalida D2.** A divisão continua legítima, a exclusão nominal continua sendo o
instrumento certo, e as 55 rotas são nominalmente excluíveis a partir de hoje. O que muda é **o
dimensionamento**: `C-136` deve ser planejada com **628 rotas IN**, e não com "uma fração".

**A única alavanca real de redução está identificada e NÃO está autorizada:** refinamento
**por rota** dentro de tier 1 e tier 2 (**420 endpoints**). Ele **contraria `I-2`**
(`AUDIT_PLAN_EMENDA_02.md:72`), que fixa a unidade em **módulo** fora do tier 3, e exigiria
**nova decisão humana** (Regra 18) — não inferência de agente. Custo estimado pelo auditor: 3 a 4
sessões sobre 26 arquivos de rota, com ganho **não garantido** (`financial`, `inventory`, `sales`,
`rh`, `sst` e `juridico`, 287 endpoints, muito provavelmente permanecem IN quase integralmente).
Registrado em `F-5` L-02 como decisão do diretor/dono.

### 5.3 Duas coletas dinâmicas de alto valor — **não autorizadas**, com fundamento que vira precedente

`APR-2026-044` **D3** **não autorizou** `DYN-T41-03` nem `DYN-T49-03` nesta sessão.

| ID | Pergunta | Por que é a coleta de maior valor |
|---|---|---|
| **`DYN-T41-03`** | Existe funcionário com `sst_asos.resultado='inapto'` vigente **e** documento `aso_*` de RH válido com aptidão? | **Único** capaz de mover `T41-RH-F02` de **HIGH para CRITICAL** |
| **`DYN-T49-03`** | Há `inventory_movements` cujo `warehouse_id` esteja hoje inativo? | **Único** que separa **risco latente de dano consumado** em `T41-EST-F01` |

**O fundamento, literal, e que este relatório registra como precedente:** rodar contra o banco de
teste (vazio) produziria um **falso zero** — *"pior que não coletar nada, porque poderia ser lido
como 'não existe caso real' quando na verdade é só 'banco sem dado nenhum'"*. É exatamente a lição
que `DYN-T47` demonstrou empiricamente (§7) e que `APR-2026-041` já havia registrado **antes**
daquela coleta.

**Quatro condições fixadas para a janela futura**, por decisão do dono: (1) escopada
**especificamente** a estas duas consultas nominadas, não por extensão e não em bloco; (2)
**somente leitura**, contra produção; (3) **fora** do lote de ~190 pedidos de `B9`, que segue
reservado a decisão separada (`APR-2026-043` D5); (4) confirmação humana explícita de dia e
horário, como toda operação contra produção neste programa (`APR-2026-016`).

---

## 6. Dado pessoal sensível — o número mais eloquente do run

**Categoria especial do art. 5º II da LGPD: 18 tabelas** — **11 de saúde** + **7 de biometria**.
**Censo fechado entre as 207 tabelas do schema**, com uma condicionalidade declarada (§7).

Duas medições que a direção precisa ver juntas:

| Medição | Valor |
|---|---|
| Colunas de categoria especial identificadas | **23** |
| Classificadas por mecanismo executável | **1** (4,3 %) |
| Protegidas por sanitizador | **2** (8,7 %) — **nenhuma delas biométrica** |

O padrão por trás do número: **o sanitizador protege o identificador fraco e deixa passar o
forte.** CID protegido campo a campo enquanto o laudo do ASO passa inteiro; CPF mascarado
enquanto a imagem facial segue íntegra na mesma instrução.

**A condição vinculante imposta pelo dono foi o controle mais produtivo do run, e evitou dano
material.** Ao exigir que, *se a categoria fosse maior que o estimado, o excedente entrasse na
cobertura e não na exclusão*, ela pegou **duas subestimativas do próprio auditor**: saúde de
**3 → 11 tabelas** (3,7×) e biometria de **2 → 5** (2,5×). **Sem ela, quatro tabelas com dado de
saúde de trabalhador — incluindo os processos de admissão e de demissão — teriam entrado na lista
de exclusão.**

---

## 7. `RES-T47-02` — os 6 contêineres genéricos: a coleta foi executada e NÃO fechou

A `APR-2026-041` autorizou a coleta dinâmica (`DYN-T47-01`/`-02`) sobre os 6 contêineres de texto
livre e `jsonb` que restaram como única condicionalidade do fechamento das categorias especiais,
**restrita ao banco de teste**.

**A coleta foi executada** (`07-findings/DYN-T47_COLETA_CONTEINERES.md`, `erp_evok_audio_test`
provado pelo próprio servidor, transação `READ ONLY`, encerrada com `ROLLBACK`, nenhuma conexão
com produção). **Resultado: zero linhas em todas as 7 colunas, 133 contagens de léxico, todas 0.**

**E mesmo assim NÃO fecha.** Nas palavras do executor: *"o zero obtido é o zero do banco errado
para a pergunta"*. O banco de teste é literalmente virgem quanto a essas tabelas
(`n_tup_ins = 0`); "zero linhas no teste" não é "zero linhas em produção".

**Consequência formal, exatamente nos termos previstos ANTES da coleta pela própria
`APR-2026-041`:** a condicionalidade é **rebaixada** de *"não decidível estaticamente"* para
**"não decidível sem acesso a produção"**. São coisas diferentes; a segunda depende de inspeção
de dado real que **não está autorizada** e que exigiria aprovação humana caso a caso.

**Este é o precedente que `APR-2026-044` D3 aplicou** às duas coletas da §5.3: coleta contra base
vazia produz falso zero, e falso zero é pior que ausência de coleta.

> **Divergência registrada (Regra 7).** `T-26_CONSOLIDACAO_RODADA5.md` §5.1 `BLQ-3` afirma
> *"coleta NÃO EXECUTADA"*. A afirmação está **defasada**: o artefato de execução existe e é
> posterior. **O artefato vence.** Registrado como `DIV-REP-01` (Relatório Técnico §11).

---

## 8. Os erros da própria auditoria — detectados, corrigidos e publicados

Uma auditoria que esconde os próprios erros não tem autoridade para apontar os alheios. Os seis
abaixo foram encontrados **dentro** do run e são publicados sem atenuação.

| # | Erro | Como foi detectado | Efeito |
|---|---|---|---|
| **1** | **Série de HIGH propagada errada por 4 rodadas.** A §1.2 da Rodada 1 não refletiu o rebaixamento de `T13-F01` e `T13-F04` (HIGH → MEDIUM) decidido na própria Rodada 1; o desvio foi herdado por citação direta em R2 → R3 → R4 → `T-39` | Reconciliação por **enumeração** do director (`RECONCILIACAO_FINAL_AUD-001.md` Bloco 1) | Série correta: **65 / 72 / 85 / 86 / 87**, e **não** 67/74/87/88/89. **O total de 446 nunca mudou** em nenhum ponto da cadeia — mudou a distribuição entre duas colunas, que é exatamente o que a fila de remediação e a Regra 22 consomem. Corrigidos por consequência: estrato 4 (79 → 77) e universo da Regra 22 (98 → 96) |
| **2** | **Contagem 21 × 22 tabelas sem model** | `T-47` §1.2, aritmética completa; ratificado por `APR-2026-042` D1 | Denominador oficial fixado em **207 / 22**. `T35-META-F01` retificado de 21 para 22, sem alteração do artefato original |
| **3** | **Categoria de dado de saúde subestimada em 3,7×** (3 tabelas declaradas × 11 reais); biometria subestimada em 2,5× | Condição vinculante do dono (`APR-2026-037` §4), executada em `T-43` §1. **O próprio auditor registrou que o erro era dele** e que decorreu de triar por nome de módulo em vez de aplicar o critério de coluna — o mesmo viés que ele havia denunciado em `T-41` §4 | Quatro tabelas com dado de saúde de trabalhador saíram da exclusão e entraram na cobertura |
| **4** | **Dois HIGH ficaram sem validador da Regra 22 por falha de despacho do orquestrador** — `T41-EST-F01` e `T41-RH-F02`. `T-41` §12 declarou expressamente o encaminhamento; o lote 3 gerou no mesmo dia uma decisão de escopo (`APR-2026-036`) que consumiu o ciclo, **e o despacho de validação não acompanhou** | **Detectado pela rodada 5 de consolidação**, por busca no corpus inteiro — não pelo orquestrador que falhou | As duas ficaram **reservadas e não liberadas** à SanaCore até haver veredito. **`T-48` fechou as duas** e a Regra 22 voltou a 100/100 |
| **5** | **O elo "Admissão" de `T41-RH-F02` estava ERRADO.** `T-41:174` afirmava que o gate comum de ASO *"decide Admissão/Demissão e o retorno"*. **A Admissão não usa o gate** — `ConcludeAdmissionProcessUseCase.ts:119` decide por `process.aso_result`, uma **terceira** cópia sem vínculo com a SST | `T-48` §3.1 H2, **confirmado por leitura própria do autor de origem** em `T-49` §4.3 | **O erro AMPLIA o finding**, não o reduz: a aptidão vive em **4** tabelas, não 2, e a que decide a admissão sequer era mencionada. `T-41` **não foi alterado** (Regra 15); a correção vive em `T-49` e é vinculante para o reteste |
| **6** | **O item 3 de `T41-EST-F01` era FACTUALMENTE ERRADO.** O texto afirmava que o saldo em depósito desativado *"não pode ser transferido para fora"* e que não há *"caminho de reversão"*. **O saldo NÃO fica preso** — as primitivas `addToWarehouse`/`removeFromWarehouse` recebem id numérico e não filtram `active` | `T-48` §2.1 H2 (refutação parcial bem-sucedida), **confirmado por leitura própria do autor de origem** em `T-49` §3.4 | **Reduz a consequência** ("saldo preso para sempre" → "saldo fora da invariante, recuperável por caminho não óbvio e não exposto na UI") e **não toca o defeito central**, que é a ausência de guarda na transição `true → false`. Severidade **inalterada** (HIGH). Registrado numa direção que **desfavorece** a auditoria |

**Nota de método, registrada porque vale para o programa inteiro:** o erro nº 1 sobreviveu a
quatro rodadas de conferência aritmética porque **cada rodada conferiu o delta — todos corretos —
e nenhuma reconferiu a base**. Precedente fixado: toda consolidação deve **reenumerar a base**,
não apenas somar o delta.

**Nota sobre os erros 5 e 6:** ambos foram publicados **pelo próprio auditor de origem**, contra o
próprio trabalho, no documento em que ele reescrevia os critérios (`T-49`). Um deles amplia o
finding; o outro o reduz. **Os dois foram publicados com o mesmo peso** — é isso que torna a
contagem não seletiva.

---

## 9. O que a auditoria também provou — e não é defeito

Um relatório que só publica defeito é um relatório enviesado. O run acumulou, medido e publicado:

- **42 conformidades verificadas** nos últimos sete lotes (38 até `T-47` + **4 em `F-5` §6.2**), e
  dezenas nas trilhas anteriores. Entre as que **a remediação não pode destruir**: o `CHECK` de
  exatamente-um-dono de `production_order_reservations`; os triggers `sst_lock_cat` e
  `sst_lock_acidente` (imutabilidade legal da CAT, 12 colunas comparadas uma a uma);
  `hr_termination_processes.payment_deadline` como coluna **GENERATED ALWAYS** citando o CLT
  art. 477 §6º; a guarda de CI que cerca as 12 tabelas órfãs em duas camadas;
  `CreateEpiDeliveryUseCase` com lista branca explícita de 8 campos (zero mass assignment); o
  `errorHandler` mapeando violação de FK para **400, não 500**.
- **17 falsos positivos evitados** (14 até `T-47` + **3 em `F-5` §6.2**), incluindo achados
  espetaculares que **morreram na verificação**: em duas ocasiões o renderizador de `Grep`
  deformou literais de rota e teria produzido um CRITICAL espetacular **e falso**; o
  "schema-fantasma solto" tinha guarda em duas camadas; as tabelas `migracao_*` supostamente
  órfãs estão **vivas** — o achado era o oposto do que parecia. **Os três novos, de `F-5`:** os 12
  endpoints de `/api/engineering/bom` **não** foram somados a `engineering` (somá-los inflaria o
  módulo para 23 e quebraria o 174); `POST /api/facilities/maintenance-tickets` **não** é shadow
  endpoint (a ausência de `authorizeModule` é intencional e documentada, RF-FAC-040); e a categoria
  "autorização" **não** foi aplicada a toda rota com middleware de authZ — a leitura ampla poria
  683/683 em IN e esvaziaria a própria triagem.
- **Os auditores reportaram 7 erros contra si próprios** (5 até `T-47` + **2 em `T-49`**, §8 itens
  5 e 6) e 1 contra a premissa de uma decisão do dono. A contagem publicada não é seletiva.
- **`T-47` recusou nominalmente uma inflação de +22 tabelas** na própria métrica de cobertura
  (`A(79/207)` → `A(101/207)`), no lote em que ela mais renderia, e publicou o número da tentação
  para que a recusa fosse auditável.
- **`F-5` publicou o efeito da própria regra de desempate**: com `I-6` ligado (norma vigente) são
  628 IN / 55 OUT; com `I-6` desligado seriam 614 / 69. As **14 rotas** que mudam de lado estão
  marcadas uma a uma. *"O efeito de uma regra de desempate não pode ficar dentro da cabeça do
  auditor."*
- **`F-5` reportou duas divergências contra a própria conveniência** (`DIV-F5-02`, `DIV-F5-03`:
  docblocks de `ti.ts` e `facilities.ts` divergem da contagem real em 10 e em 4), nenhuma das quais
  muda o total de 174 — poderia tê-las calado sem efeito algum sobre a lista.

**Isto muda a leitura do estado do produto.** O ERP não é um sistema sem controles: é um sistema
com controles bons, aplicados de forma **assimétrica**. É o que a §10 chama de causa raiz de
segunda ordem.

---

## 10. O diagnóstico, não a lista: a técnica está dominada e aplicada ao objeto de menor valor

A conclusão de causa raiz de 2ª ordem do run, sustentada por três instâncias independentes com
âncora:

1. O projeto **sabe** escrever trava seletiva por coluna — escreveu duas vezes (`sst_lock_cat()`,
   `sst_lock_acidente()`) — e aplicou **trava total** na tabela de entrega de EPI, onde o efeito
   é tornar o erro irreparável.
2. A empresa **exige documento assinado para entregar um notebook** e **não exige artefato
   biométrico para entregar um EPI**.
3. O banco **impõe a devolução do crachá** para concluir a demissão e **não impõe o exame
   demissional**.

**Isto não é limitação técnica. É escolha de onde aplicar o rigor.** É o achado que transforma
uma lista de 484 findings em diagnóstico gerenciável: a correção estrutural é de **critério de
aplicação de controle**, não de capacidade de engenharia.

---

## 11. Itens já remediados — e o que isso significa (e não significa)

**`ERP-LEGACY-001-CASE-004`** foi aberto por `APR-2026-033` para `AUD-ALOG-01`, itens **A**
(`DELETE /api/employees/:id`, CRITICAL, produção real, posição 1 da fila) e **B**
(`PATCH /api/items/:id/inactivate` + `DELETE /api/items/:id`, HIGH, produção real), este último
com a rota do `OR-21` decidida por `APR-2026-034` D1 (contorno documentado declaradamente).

**Estado: `RETEST_REQUIRED`.** Remediação declarada; **reteste independente da VeriCore
pendente**. Enquanto ele não ocorrer:

- **os dois itens permanecem ABERTOS** e permanecem no backlog;
- **não há `RETEST_PASSED` nem `FINDING CLOSED`** — autoridade exclusiva da VeriCore (Regra 4),
  e a SanaCore não fecha o próprio finding (Regra 3);
- o contorno de `entityId` adotado no item B é **contorno declarado, não correção de causa-raiz**;
  `AUD-DB-04` permanece MEDIUM e aberto.

> **Divergência registrada (Regra 7), `DIV-REP-02`.** O único artefato de `CASE-004` presente na
> árvore auditável é o `TRIAGE_REPORT.md`, que encerra autorizando o início do Estágio 1. O pacote
> de evidência da remediação vive na branch `sana/ERP-LEGACY-001/CASE-004`, **não mesclada** e
> não legível por este agente. Registro o estado como **declarado, não confirmado por artefato
> acessível** — o que reforça, e não enfraquece, a exigência de reteste independente.

---

## 12. Pendências humanas que bloqueiam o encerramento — nominais

Nenhuma delas pode ser suprida por agente (Regras 6 e 18). Todas exigem decisão humana explícita
registrada.

| # | Pendência | Natureza |
|---|---|---|
| **1** | **Severidade de `AUD-RH-VALIDADENULA-01`** — `PROPOSED`, **HIGH recomendada, não fixada** | Fixação é do dono (Regra 18). **Se HIGH, aciona a Regra 22** e o finding tem de passar pelo `vericore-finding-validator` antes de remediação. Enquanto não fixada, o finding **não entra no Remediation Backlog** e fica fora da fila por exposição |
| **2** | **`C-136`** — método decidido (`APR-2026-043` D2: dividir), **dimensionamento a refazer com 628 rotas IN** (§5.2). É a única superfície onde autorização e idempotência são vistas **por rota**, e não por módulo; base da varredura da **Regra 24** (papel declarado pelo cliente sem verificação server-side), que o `CLAUDE.md` classifica como CRITICAL bloqueante para release | Falta **decisão de execução** com o custo real, e a decisão sobre a **única alavanca** (refinamento por rota em tier 1/2, 420 endpoints, contrário a `I-2` — `F-5` L-02). Agravante medido: **esta auditoria já errou duas vezes por omissão de fronteira em trilha por módulo** — `AUD-SEC-T04-01` e, decisivamente, `AUD-ALOG-01`, cujos 8 endpoints mudos apareceram **por acaso** |
| **3** | **`RES-T47-02`** — os 6 contêineres (§7) | Condicionalidade **rebaixada** a *"não decidível sem acesso a produção"*, **não fechada**. A decisão sobre inspeção de dado real é do dono |
| **4** | **Janela futura para `DYN-T41-03` e `DYN-T49-03`** (§5.3) | **Não autorizadas** por `APR-2026-044` D3, com **4 condições fixadas**. São as duas coletas de maior valor do run: uma é a única capaz de mover um HIGH para CRITICAL; a outra é a única que separa risco latente de dano consumado |
| **5** | **`B9` — prova dinâmica em bloco (~190 pedidos)** | **Reservada a sessão própria** por `APR-2026-043` D5. Precedente do dono: *"prova dinâmica é execução, não documentação — decido separada, não hoje, para não autorizar às cegas 190 pedidos."* **Não se resolve por cascata** |
| **6** | **9 blocos de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`** | `B1` decidido por D2; `B2`,`B3`,`B3-bis`,`B4`,`B5`,`B7`,`B8` receberam o **critério de D1 em cascata** (cobrir onde o `G3` veda, exclusão nominal no resto) por `APR-2026-043` D5; **`B6` permanece com a VeriCore** (definição própria, sem decisão do dono); **`B9` fora**. O que resta é **execução**, não decisão — exceto onde a nota do bloco disser o contrário |
| **7** | **Reteste independente de `CASE-004`** (§11) | Autoridade exclusiva da VeriCore (Regra 4). Itens A e B permanecem abertos |

**Pendências ENCERRADAS nesta revisão, registradas para que a mudança seja auditável:**

| Pendência | Como foi encerrada |
|---|---|
| **Contradição `G3` × `EMENDA-01`** (`APR-2026-038` D3) | **RESOLVIDA** por `APR-2026-043` D1 — `G3` = `REDUCED_BY_DECISION`, pela via do `G8`, com a exclusão nominal como instrumento (§1) |
| **`OBS-T48-02`** — `BUSINESS_RULES.md` §12 se contradizia (itens 2 e 3, definições incompatíveis de "saldo total") | **RESOLVIDA** por `APR-2026-043` D3: prevalece o **item 3** — `saldo_total(produto) = Σ saldo(produto, depósito) para todo depósito ATIVO`. O item 2 vira **correção de redação** (item de backlog, OpusCore), **não** regra concorrente. Deixa de bloquear a remediação de `T41-EST-F01`; a SanaCore não precisa inventar a regra (Regra 6) |
| **Critério de reteste subdimensionado de `T41-EST-F01` e `T41-RH-F02`** | **REESCRITO** em `T-49`, por `APR-2026-043` D4. **Os dois seguem HIGH, `CONFIRMED`, e NÃO liberados à SanaCore** até o reteste usar o critério novo (§12-A) |

### 12-A. O critério de reteste que agora vale — `T-49`, não `T-41` §5

`APR-2026-043` D4, verbatim: *"Aprovo devolver os dois à trilha de origem para reescrever antes de
remediação. **Fechamento falso custa mais depois do que corrigir agora.**"*

| Finding | Critério antigo (`T-41` §5) | **Critério vigente (`T-49`)** |
|---|---|---|
| `T41-EST-F01` | **1** vetor | **4 vetores · 12 itens** (`CR-T49-EST-01`…`-12`) |
| `T41-RH-F02` | **2** tabelas | **4 tabelas · 9 itens** (`CR-T49-RH-01`…`-09`) |

**`T-49` nomeou 13 armadilhas de fechamento falso** (`A1`-`A5`, `B1`-`B5`, mais as embutidas em
`CR-T49-EST-06`, `-09` e `-12`) — casos em que a remediação **passaria** pelo critério antigo
**sem** fechar o defeito. Exemplos: um `comment` acrescentado a uma migration já congelada, que
**nenhum banco recebe**; e o teste vigente `warehouse-crud.test.ts:136-154`, que **afirma** o
comportamento defeituoso com mock sem saldo e **continuaria verde** depois da guarda.

**O fundamento vira precedente do programa:** um reteste que passa com critério subdimensionado
**fecha o finding sem fechar o defeito** — e, fechado, a VeriCore não poderia reabri-lo sem delta
audit (Regra 14). O custo do erro é assimétrico e recai inteiro no futuro.

**Pendências de decisão do dono ainda abertas, herdadas:** `D-02`…`D-07`, `D-09` (26 HIGH de
`npm audit` em `mobile` e `tv`, 5ª rodada sem decisão), `D-10`, `D-12`, `D-13` (convenção de
ambiente dos 26 findings documentais, **nunca submetida**). Divergência técnica não resolvida:
`DIV-SEV-01` (`T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato, 5ª rodada).

---

## 13. Gap documentado sem prazo — seis tabelas de RH

Registro obrigatório por `APR-2026-042` D3, na **redação literal determinada pelo dono**:

> ### Estrutura de banco presente, sem uso de aplicação — decisão de produto pendente.

Aplica-se a: `hr_job_vacancies`, `hr_candidates`, `hr_performance_reviews`,
`hr_time_sheet_summaries`, `hr_payroll_import_batches`, `hr_payroll_import_items`.

**Sem prazo, por determinação expressa.** Este relatório está **proibido de atribuir prazo,
urgência ou recomendação de construir ou deprecar** a este item — **e igualmente proibido de
omiti-lo**, porque gap documentado só cumpre função se aparecer. `T47-RH-F01` e `T47-RH-F02`
permanecem LOW e permanecem abertos: adiar decisão de produto não fecha finding (Regra 4). O que
a decisão faz é registrar que **a ausência de decisão é deliberada**, não esquecimento.

---

## 14. Divergência resolvida por autoridade, não por consenso

`AUD-CTB-DEBCRED-01` permanece **HIGH** por decisão do dono (`APR-2026-035` `D-01`), **contra**
recomendação técnica registrada. O validador havia recomendado rebaixamento para MEDIUM,
apoiado em quatro camadas de contenção verificadas e em **nenhum caminho de alcance demonstrado**.
O fundamento da decisão é de risco, não de mecanismo: lançamento contábil sem trava no banco é
risco alto **independentemente** das camadas de aplicação.

**Isto é apresentado como decisão de autoridade humana, e não como consenso técnico.** O
argumento do validador permanece íntegro no corpus e não foi apagado (Regra 20). Precedente
fixado: contenção em aplicação, por mais camadas que tenha, **não rebaixa por si só** um finding
de integridade contábil neste programa.

**Registro de método análogo, desta vez em sentido inverso** (`APR-2026-043` D3): ao decidir qual
item do `BUSINESS_RULES` §12 prevalece, o dono **trocou a própria ideia anterior pela recomendação
do auditor**, declarando o motivo — *"mais simples e mais bem fundamentada que minha ideia
anterior"*. Fica registrado como **mudança de posição por argumento**, não como correção de erro.

---

## 15. O que este relatório NÃO declara — lista fechada

1. **`AUDIT_PASSED`**, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`,
   `REMEDIATION COMPLETE` — nenhum é declarado e nenhum pode ser inferido daqui (Regras 3, 4, 5).
2. **`G3` integralmente cumprido.** O `G3` está **`REDUCED_BY_DECISION`** (§1) — reduzido por
   decisão humana registrada, **não** cumprido. `F-5` **passou a existir** e satisfaz o passo 4 do
   `REG-G3`, mas a amostra dos 174 endpoints profundos **continua** não satisfazendo a condição (a)
   — ≈83 endpoints seguem sem D4-D8 — e **4 de 10 categorias de segurança seguem não varridas** em
   19 módulos.
3. **`C-137` fechada** · **`C-136` tocada** · **`C-133` fechada** · **cobertura integral da banda
   dinheiro**.
4. **Regra 22 sem histórico de exceção** — houve 2, por falha de despacho, fechadas por `T-48`.
5. **Categoria especial "fechada"** sem a ressalva de `RES-T47-02`.
6. Que a decisão de `AUD-CTB-DEBCRED-01` tenha sido consenso técnico.
7. Que os MEDIUM e LOW deste corpus tenham sido validados — **não foram**, e `RES-T46-02` diz
   isso por escrito.
8. Qualquer afirmação de conformidade genérica sobre soft delete. A forma admissível é
   *"soft delete por `deleted_at`/`paranoid` não existe"*, sempre com escopo explícito, e com a
   contraparte *"soft delete semântico por `active`/`status` existe em 34 tabelas, com filtro
   100 % de aplicação e zero lastro em banco"*.
9. Que `T41-EST-F01` e `T41-RH-F02` estejam **liberados** à SanaCore — **não estão**, até o
   reteste adotar o critério de `T-49` (§12-A).
10. Que a divisão de `C-136` produza redução material do alvo — **produz 8,1 %** (§5.2).
11. Que `AUD-RH-VALIDADENULA-01` seja HIGH — a severidade **não está fixada** (§2.1).

---

## 16. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2).
- Nenhuma evidência histórica de outra organização foi alterada (Regra 15).
- Nenhum finding foi criado, fechado, reclassificado ou teve severidade alterada
  (Regras 4, 6, 18). O finding novo desta revisão foi aberto por **decisão do dono**
  (`APR-2026-044` D1) e é aqui **relatado**, não criado.
- Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).
- Todo número deste relatório é rastreável ao Relatório Técnico
  (`40-report/RELATORIO_TECNICO.md`), e deste às trilhas de origem.

**Estado declarado:** `RELATÓRIOS FINAIS REVISADOS (REV. 2) · AUDITORIA NÃO ENCERRADA ·
484 FINDINGS VIGENTES (9C · 91H · 248M · 124L · 11I + 1 SEM SEVERIDADE FIXADA) ·
502 IDs EMITIDOS · REGRA 22 100/100 · G3 REDUZIDO POR DECISÃO (REDUCED_BY_DECISION, VIA G8) ·
CONTRADIÇÃO G3 × EMENDA-01 RECONCILIADA E REGISTRADA · F-5 PUBLICADA (628 IN / 55 OUT) ·
CRITÉRIOS DE RETESTE DE T41-EST-F01 E T41-RH-F02 REESCRITOS EM T-49 E NÃO LIBERADOS ·
7 PENDÊNCIAS HUMANAS DE ENCERRAMENTO NOMINAIS · NENHUM AUDIT_PASSED.`
