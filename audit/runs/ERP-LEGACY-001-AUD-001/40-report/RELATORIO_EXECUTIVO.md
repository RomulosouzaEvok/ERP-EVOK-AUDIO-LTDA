# RELATÓRIO EXECUTIVO DE AUDITORIA — `ERP-LEGACY-001-AUD-001`

```
PROGRAMA:      ERP-LEGACY-001 (LEGACY_RECOVERY_AND_MODERNIZATION)
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
PRODUZIDO POR: vericore-audit-reporting-agent (VeriCore)
DATA:          2026-08-17
AUTORIZAÇÃO:   APR-2026-042 D4 — "Prossiga para consolidação rodada 5 → relatórios finais"
FONTE DO PLACAR: 07-findings/T-26_CONSOLIDACAO_RODADA5.md §1.5
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
trabalho de campo**, não o seu fechamento. O encerramento depende de gates humanos abertos,
nominados na §9 — sendo o primeiro deles a contradição de governança da §1, que é **condição de
fechamento** por determinação expressa do dono.

Nenhum finding foi fechado. Nenhuma remediação foi aceita. Nenhum `AUDIT_PASSED` foi emitido, e
nenhuma linha deste relatório pode ser lida como tal.

---

## 1. [BLOQUEANTE] CONTRADIÇÃO ENTRE DOIS ARTEFATOS DE GOVERNANÇA APROVADOS: `G3` × `EMENDA-01`

> Esta seção está no Relatório Executivo por determinação vinculante e literal do dono
> (`APR-2026-038` D3): *"Não deixe isso como nota de rodapé no relatório. Registre explicitamente
> como uma contradição real entre dois artefatos de governança aprovados, que precisa de
> reconciliação formal antes da declaração final de fechamento da auditoria — **não é 'questão em
> aberto' trivial, é um gate que a própria auditoria criou e depois contornou**. Isso deve
> aparecer com destaque no Relatório Executivo, não enterrado no Técnico."*
>
> A mesma entrada **veda expressamente a redação minimizadora**. Este relatório não chama o item
> de "questão em aberto", "ponto de atenção" nem "observação".

### 1.1 A contradição, enunciada sem suavização

| Artefato aprovado | Citação | O que determina |
|---|---|---|
| **Gate `G3`** — `APPROVED_WITH_CONDITIONS` | `coretriad/governance/APPROVALS.md:584` | **VEDA amostragem reduzida** em autenticação, autorização, segregação de funções, operações financeiras, movimentação de estoque, **integridade de dados**, contratos/jurídico, permissões administrativas, operações destrutivas, segurança, multi-tenancy e regras de negócio críticas — nesses casos exige **cobertura ampliada ou 100 % quando tecnicamente aplicável**. Inclui **dado pessoal**. |
| **`APR-2026-037` (EMENDA-01 a `APR-2026-024`)** | `coretriad/governance/APPROVALS.md:1860-1990`, critério na `:1882-1883` | **ACEITA cobertura parcial**, com exclusão nominal por escrito, em bandas que **incluem dado pessoal e integridade de dados**: *"Cobertura total onde o risco é maior — dinheiro, estoque, fiscal e dado de saúde. Cobertura parcial documentada, com lista nominal, no restante."* |

**Os dois estão aprovados. Os dois estão em vigor. Eles se contradizem.**

### 1.2 Por que isto não é um detalhe de redação

A `APR-2026-024` Decisão A havia **recusado explicitamente** a Opção B — aceitar cobertura parcial
com exclusão registrada no relatório final (`APPROVALS.md:830-832`). A `APR-2026-037` **emenda a
própria recusa** e institui o critério de cobertura parcial documentada. O caminho legítimo para
reduzir o `G3` existe e está escrito no `G8` (`APPROVALS.md:585`): *"redução futura = nova decisão
humana registrada como exclusão explícita"*. **O `G3` não foi formalmente reduzido por essa via.**
A emenda foi redigida como critério de cobertura, **sem declarar que relaxa o gate**.

A caracterização é do próprio dono e é reproduzida por dever de registro: **é um gate que a
própria auditoria criou e depois contornou.**

### 1.3 O que reduz a tensão — e o que não a elimina

O fechamento do censo da **categoria especial do art. 5º II** (§6) **reduz** a contradição: as
18 tabelas de dado de saúde e biometria **entraram na cobertura**, não na exclusão. Mas **não a
elimina**: o `G3` fala em *"dado pessoal"*, e **8 tabelas de dado pessoal não sensível permanecem
na exclusão declarada** (`RES-T45-10`, `RES-T47-09`; lista nominal no Relatório Técnico §7.4).
A banda **dinheiro** — 25 tabelas de 1ª ordem — também permanece excluída, e ela recai em
"operações financeiras" e "integridade de dados", ambas categorias vedadas pelo `G3`.

### 1.4 Consequência formal

1. **É condição de fechamento, não observação.** **Nenhuma declaração final de encerramento da
   auditoria pode ser emitida enquanto a contradição não for formalmente reconciliada** — seja
   pela redução explícita do `G3` pela via do `G8`, seja pela restrição da `EMENDA-01` às bandas
   que o `G3` não veda.
2. A reconciliação é **ato humano** (Regra 18). Nenhum agente pode supri-la, e este relatório não
   a supre.
3. Enquanto não ocorrer, toda afirmação de cobertura deste run deve ser lida com a ressalva de
   que a cobertura parcial aceita **não foi conciliada com o gate que a veda**.

---

## 2. Placar de risco — o corpus da auditoria

**483 findings vigentes**, medidos e conferidos em `T-26_CONSOLIDACAO_RODADA5.md` §1.5:

| Severidade | Quantidade |
|---|---|
| **CRITICAL** | **9** |
| **HIGH** | **91** |
| **MEDIUM** | **248** |
| **LOW** | **124** |
| **INFO** | **11** |
| **TOTAL VIGENTE** | **483** |

Complemento do quadro, para que o número não seja lido isolado:

| Item | Valor |
|---|---|
| IDs emitidos no run | **501** |
| `FALSE_POSITIVE` | **1** (`T11-F10`) |
| Absorvidos / `DUPLICATE` | **17** |
| Achado de **processo da auditoria** (categoria separada, não é defeito do produto) | **1** (`AUD-PROC-CUSTODIA-01`) |

Conferência publicada e refeita nos dois sentidos: 9 + 91 + 248 + 124 + 11 = **483**;
483 + 1 + 17 = **501**; 464 + 37 = **501**.

**Este é o único placar válido deste run.** A série histórica correta de HIGH é
**65 / 72 / 85 / 86 / 87** nas rodadas 1 / 2 / 3 / 4 / fila — ver §8, erro da própria auditoria.

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

---

## 5. Cobertura — o que foi auditado, e o que declaradamente não foi

Auditoria de cobertura declarada, não alegada. As limitações abaixo são **afirmação**, não
omissão.

| Frente | Estado medido |
|---|---|
| Trilhas de fieldwork | **27/27 executadas**, mais 21 trilhas complementares (`T-27`…`T-48`) e 6 rodadas de validação adversarial |
| Matriz de células elevadas pela `EMENDA-02` (137 células) | **85 integrais · 50 parciais · 2 não entregues** |
| **`C-137`** — semântica de coluna nas tabelas do schema | **`A(79/207)`** — 38,2 %. **NÃO fechada.** Déficit **128**, hoje **integralmente nominal** |
| **`C-136`** — contrato de API por dimensão (683 endpoints × 11 dimensões ≈ 7.500 células) | **Nenhuma trilha tocou, em 5 rodadas.** Sem decisão do dono |
| `C-133` — `client/` | `A(157/167)` — parcial alta |
| `mobile/` e `tv/` | Triagem 100 % (`E`) |
| Evidência **dinâmica** (execução contra banco/servidor) | **≈232 pedidos catalogados, ~21 executados.** A auditoria é predominantemente **estática**, por força de `APR-2026-016` |

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
> três módulos** — é sistêmico, não incidental.

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
cumprida.

Histórico da lista de exclusão de dado pessoal, para que o número certo seja usado:
**14** (`APR-2026-037` §5.2) → **11 nominais / 9 efetivas** (`APR-2026-039` §2) → **8**
(`APR-2026-040` D2). **A lista vigente é a de 8**, e a fonte nominal é `T-43` §9 + `T-45` §9 —
**não** `APR-2026-037` §5.2.

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

> **Divergência registrada (Regra 7).** `T-26_CONSOLIDACAO_RODADA5.md` §5.1 `BLQ-3` afirma
> *"coleta NÃO EXECUTADA"*. A afirmação está **defasada**: o artefato de execução existe e é
> posterior. **O artefato vence.** Registrado como `DIV-REP-01` (Relatório Técnico §11).

---

## 8. Os erros da própria auditoria — detectados, corrigidos e publicados

Uma auditoria que esconde os próprios erros não tem autoridade para apontar os alheios. Os quatro
abaixo foram encontrados **dentro** do run e são publicados sem atenuação.

| # | Erro | Como foi detectado | Efeito |
|---|---|---|---|
| **1** | **Série de HIGH propagada errada por 4 rodadas.** A §1.2 da Rodada 1 não refletiu o rebaixamento de `T13-F01` e `T13-F04` (HIGH → MEDIUM) decidido na própria Rodada 1; o desvio foi herdado por citação direta em R2 → R3 → R4 → `T-39` | Reconciliação por **enumeração** do director (`RECONCILIACAO_FINAL_AUD-001.md` Bloco 1) | Série correta: **65 / 72 / 85 / 86 / 87**, e **não** 67/74/87/88/89. **O total de 446 nunca mudou** em nenhum ponto da cadeia — mudou a distribuição entre duas colunas, que é exatamente o que a fila de remediação e a Regra 22 consomem. Corrigidos por consequência: estrato 4 (79 → 77) e universo da Regra 22 (98 → 96) |
| **2** | **Contagem 21 × 22 tabelas sem model** | `T-47` §1.2, aritmética completa; ratificado por `APR-2026-042` D1 | Denominador oficial fixado em **207 / 22**. `T35-META-F01` retificado de 21 para 22, sem alteração do artefato original |
| **3** | **Categoria de dado de saúde subestimada em 3,7×** (3 tabelas declaradas × 11 reais); biometria subestimada em 2,5× | Condição vinculante do dono (`APR-2026-037` §4), executada em `T-43` §1. **O próprio auditor registrou que o erro era dele** e que decorreu de triar por nome de módulo em vez de aplicar o critério de coluna — o mesmo viés que ele havia denunciado em `T-41` §4 | Quatro tabelas com dado de saúde de trabalhador saíram da exclusão e entraram na cobertura |
| **4** | **Dois HIGH ficaram sem validador da Regra 22 por falha de despacho do orquestrador** — `T41-EST-F01` e `T41-RH-F02`. `T-41` §12 declarou expressamente o encaminhamento; o lote 3 gerou no mesmo dia uma decisão de escopo (`APR-2026-036`) que consumiu o ciclo, **e o despacho de validação não acompanhou** | **Detectado pela rodada 5 de consolidação**, por busca no corpus inteiro — não pelo orquestrador que falhou | As duas ficaram **reservadas e não liberadas** à SanaCore até haver veredito. **`T-48` fechou as duas** e a Regra 22 voltou a 100/100 |

**Nota de método, registrada porque vale para o programa inteiro:** o erro nº 1 sobreviveu a
quatro rodadas de conferência aritmética porque **cada rodada conferiu o delta — todos corretos —
e nenhuma reconferiu a base**. Precedente fixado: toda consolidação deve **reenumerar a base**,
não apenas somar o delta.

---

## 9. O que a auditoria também provou — e não é defeito

Um relatório que só publica defeito é um relatório enviesado. O run acumulou, medido e publicado:

- **38 conformidades verificadas** nos últimos seis lotes, e dezenas nas trilhas anteriores.
  Entre as que **a remediação não pode destruir**: o `CHECK` de exatamente-um-dono de
  `production_order_reservations`; os triggers `sst_lock_cat` e `sst_lock_acidente`
  (imutabilidade legal da CAT, 12 colunas comparadas uma a uma); `hr_termination_processes.payment_deadline`
  como coluna **GENERATED ALWAYS** citando o CLT art. 477 §6º; a guarda de CI que cerca as
  12 tabelas órfãs em duas camadas; `CreateEpiDeliveryUseCase` com lista branca explícita de 8
  campos (zero mass assignment); o `errorHandler` mapeando violação de FK para **400, não 500**.
- **14 falsos positivos evitados**, incluindo achados espetaculares que **morreram na
  verificação**: em duas ocasiões o renderizador de `Grep` deformou literais de rota e teria
  produzido um CRITICAL espetacular **e falso**; o "schema-fantasma solto" tinha guarda em duas
  camadas; as tabelas `migracao_*` supostamente órfãs estão **vivas** — o achado era o oposto do
  que parecia.
- **Os auditores reportaram 5 erros contra si próprios** e 1 contra a premissa de uma decisão do
  dono. A contagem publicada não é seletiva.
- **`T-47` recusou nominalmente uma inflação de +22 tabelas** na própria métrica de cobertura
  (`A(79/207)` → `A(101/207)`), no lote em que ela mais renderia, e publicou o número da tentação
  para que a recusa fosse auditável.

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
uma lista de 483 findings em diagnóstico gerenciável: a correção estrutural é de **critério de
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
| **1** | **Contradição `G3` × `EMENDA-01`** (§1) | **Condição de fechamento.** Exige reconciliação formal — redução do `G3` pela via do `G8`, ou restrição da `EMENDA-01` |
| **2** | **`C-136`** — a única superfície onde autorização e idempotência são vistas **por rota**, e não por módulo. Base da varredura da **Regra 24** (papel declarado pelo cliente sem verificação server-side), que o `CLAUDE.md` classifica como CRITICAL bloqueante para release. **Zero movimento em 5 rodadas** | Sem decisão de cobertura e sem decisão de aceitação (`APR-2026-038` D2). Agravante medido: **esta auditoria já errou duas vezes por omissão de fronteira em trilha por módulo** — `AUD-SEC-T04-01` e, decisivamente, `AUD-ALOG-01`, cujos 8 endpoints mudos apareceram **por acaso**, numa retificação sobre outro assunto |
| **3** | **`RES-T47-02`** — os 6 contêineres (§7) | Condicionalidade **rebaixada**, não fechada. A decisão sobre inspeção de dado real é do dono |
| **4** | **`OBS-T48-02`** — `docs/business/BUSINESS_RULES.md` §12 **se contradiz**: o item 2 (`:345-349`) define saldo total como soma de **todos** os depósitos; o item 3 (`:351-354`), como soma dos depósitos **ativos**. Itens consecutivos, definições incompatíveis | **BLOQUEIA a remediação de `T41-EST-F01`.** Sem fonte autoritativa fixada, a SanaCore escolheria sozinha qual regra de negócio implementar — o que a Regra 6 proíbe |
| **5** | **Critério de reteste subdimensionado de `T41-EST-F01` e `T41-RH-F02`** | `T-48` provou que o critério original de `T-41` é insuficiente: no primeiro deixa **três** buracos abertos além do endpoint corrigido; no segundo cobre 2 tabelas quando a aptidão do ASO vive em **4**. Remediar pelo critério original produziria falso fechamento |
| **6** | **9 blocos de `CELULAS_SEM_AUTORIZACAO_ACEITACAO.md`** | Custo medido, aguardando decisão **item a item**. Enquanto a recusa da Opção B de `APR-2026-024` estiver de pé para eles, **nenhum agente pode registrar "aceito com exclusão declarada"** |

Pendências de decisão do dono ainda abertas, herdadas: `D-02`…`D-07`, `D-09` (26 HIGH de
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

---

## 15. O que este relatório NÃO declara — lista fechada

1. **`AUDIT_PASSED`**, `FINDINGS_CONFIRMED`, `RETEST_PASSED`, `FINDING CLOSED`,
   `REMEDIATION COMPLETE` — nenhum é declarado e nenhum pode ser inferido daqui (Regras 3, 4, 5).
2. **`G3` integralmente cumprido** — `F-5` não existe, a amostra dos 174 endpoints profundos não
   satisfaz a condição (a), e 4 de 10 categorias de segurança não foram varridas em 19 módulos.
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

---

## 16. Encerramento

- Nenhum arquivo do objeto auditado foi criado, alterado ou corrigido (Regra 2).
- Nenhuma evidência histórica de outra organização foi alterada (Regra 15).
- Nenhum finding foi criado, fechado, reclassificado ou teve severidade alterada
  (Regras 4, 6, 18).
- Zero comando, zero execução, zero conexão de banco (`APR-2026-016` íntegra).
- Todo número deste relatório é rastreável ao Relatório Técnico
  (`40-report/RELATORIO_TECNICO.md`), e deste às trilhas de origem.

**Estado declarado:** `RELATÓRIOS FINAIS EMITIDOS · AUDITORIA NÃO ENCERRADA · 483 FINDINGS
VIGENTES (9C · 91H · 248M · 124L · 11I) · REGRA 22 100/100 · 4 BLOQUEANTES DE ENCERRAMENTO
NOMINAIS · CONTRADIÇÃO G3 × EMENDA-01 PENDENTE DE RECONCILIAÇÃO FORMAL · NENHUM AUDIT_PASSED.`
