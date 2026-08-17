# REEXAME DO BLOCO `AUD-DB-04…-09` — exame estruturado para decisão do dono

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Data | 2026-08-16 |
| Autor | CoreTriad Control Plane — `coretriad-director` |
| Natureza | **Exame habilitador de decisão.** NÃO altera severidade (Regra 18), NÃO edita `audit/` (Regras 15/16), NÃO fecha finding, NÃO declara `RETEST_PASSED` (Regra 4). |
| Mandato | `T-26_CONSOLIDACAO_RODADA4.md` §6.2 **T-16** (titular: director) + recomendação formal do retificador em `AUD-DB-09_RETIFICACAO_01.md` §4. Autorização do dono relatada em despacho (*"Reexame AUD-DB-04…-09: prossiga com o director, como já encaminhado"*) — **registro formal em `APPROVALS.md` pendente** (Regra 18: relato em despacho não substitui registro; o mandato de T-16, esse sim versionado, sustenta este exame por si). |
| Fontes lidas na íntegra | `AUD-DB-09_RETIFICACAO_01.md`; `T-03_RETIFICACAO_01.md`; `T-03_AUDIT_LOG_REPORT.md:60-105` (texto original dos 6 findings); `T-26_CONSOLIDACAO.md:502-519` (célula original G-06); `T-26_CONSOLIDACAO_RODADA4.md` §§3-6; `T-34_VALIDACAO_5_FINDINGS_FORMAIS.md:280-308` (régua) |

---

## 1. A régua aplicada — declarada antes do exame, para não ser acusada de calibragem ad hoc

Régua interna do run, formulada em `T-34:292-308` a partir de `AUD-DB-T31-01` (MEDIUM):

> Classe **"o dado não carrega a regra; o código carrega"** — domínio/invariante na prosa e na
> aplicação, não no mecanismo de banco — é **MEDIUM** enquanto o controle de aplicação
> efetivamente impõe a invariante e a materialização exige **escritor/ator futuro que não existe**.

Teste decisivo de `T-34:298-308` (o que separa HIGH de MEDIUM nesta família):

1. O caminho de exploração/ocorrência **existe hoje, pelo caminho normal do sistema**?
2. Precisa de ator/artefato **futuro**?
3. Controle de aplicação **impede**?

Segundo critério em jogo, distinto de severidade: o **critério de fila do dono**
(`T-26_CONSOLIDACAO_RODADA4.md` §5.1, registrado por escrito em 2026-08-16) — *"dependência de
item PRODUÇÃO REAL herda a prioridade do dependente, no recorte necessário"*. **Prioridade de
fila e severidade são eixos independentes neste exame; confundi-los é exatamente o erro que
este documento existe para evitar.**

---

## 2. Exame finding a finding

A pergunta central, imposta pelo despacho e correta: **a retificação de `-09` contamina os
outros cinco?** Verifiquei um a um, por leitura integral das duas retificações e varredura de
menções (`AUD-DB-04`…`-08` nos dois arquivos de retificação). Resultado antecipado: **-05, -07
e -08 não são mencionados em ponto algum; -06 aparece uma única vez, como fator de composição
de impacto de `AUD-ALOG-01`; -04 recebe uma conformidade marginal e um vínculo de dependência;
somente -09 muda de natureza.**

### 2.1 `AUD-DB-04` — `audit_logs.entity_id integer` × PK UUID

**Era (MEDIUM na origem, `T-03:62-71`):** *"`audit_logs.entity_id integer` (…) não representa
PK `UUID`: `Item.ts:49-51` (tier 1), `ItemCategoria.ts:21-23` (tier 1), `ItemEstrutura.ts:47-50`,
`MrpOrdemPlanejada.ts:35-38`. Contorno confirmado nos call sites (…) O índice
`audit_logs_entity_type_entity_id` (…) e o filtro `entity_id` da API (…) ficam estruturalmente
incapazes de recuperar esses eventos."* Premissa da época: defeito de **recuperabilidade** da
trilha (evento gravado sem chave consultável), com contorno deliberado nos call sites.

**Mudou?** **O mérito, nada. O contexto, em dois pontos, ambos verificados:**

1. `T-03_RETIFICACAO_01.md` §5.2 acrescenta **conformidade marginal**: os 3 emissores de
   `soft_delete` (`Product`/`BOM`/`User`, PK INTEGER) **não caem** no modo de falha `22P02` —
   registrado pelo próprio autor "porque supor contaminação seria fácil e errado". Isso
   **delimita** o finding, não o agrava nem o abranda.
2. `AUD-DB-04` tornou-se **dependência de remediação herdada** de `AUD-ALOG-01/B`
   (HIGH · PRODUÇÃO REAL, posição 2 da fila) no **recorte `Item`/UUID**: emitir `logAction`
   em `PATCH /api/items/:id/inactivate` sem resolver a representação reproduz `22P02`
   (`T-37` §7.2; `T-26_CONSOLIDACAO_RODADA4.md` §5.2 e **OR-21**). Ver §3 abaixo.

**Recomendação: MANTER MEDIUM.** Critério: nenhuma premissa do finding foi alterada; o defeito
continua sendo de recuperabilidade da trilha, mesma família dos demais MEDIUMs de G-06. A
urgência nova é **de fila, não de severidade**, e o critério escrito do dono já a resolve sem
reclassificação (§3). Elevar severidade para expressar prioridade seria usar o instrumento
errado — o run tem instrumento próprio e o dono já o fixou.

### 2.2 `AUD-DB-05` — paginação da trilha sem teto

**Era (MEDIUM na origem, `T-03:72-77`):** *"`ListAuditLogsUseCase.ts:42-50`: `parseInt` cru,
sem teto, sem piso, sem guarda de NaN. O projeto tem o controle e não o aplica aqui (…)
`?limit=999999` extrai a trilha inteira (com o dado pessoal de AUD-DB-08) numa requisição."*

**Mudou?** **Nada.** Nenhuma das duas retificações menciona `AUD-DB-05` (varredura declarada
em §2, cabeça). A interação com `-08` (extração em massa de dado pessoal) **já constava do
texto original** — não é agravante novo.

**Recomendação: MANTER MEDIUM.** Critério: manter aqui **não** é herdar premissa extinta — é
manter premissa **verificada como intacta**. É exatamente a distinção que o retificador exigiu
para `-09` e que, aplicada a `-05`, dá o resultado oposto.

### 2.3 `AUD-DB-06` — CORRELATION_ID ausente e forjável

**Era (MEDIUM na origem, `T-03:78-83`):** *"`requestContext.ts:21-25` gera/propaga
`x-request-id` (…) mas `audit_logs` não tem coluna de correlação e `AuditLog.register` não lê
`req.requestId`. Além disso aceita o header do cliente sem validação (correlação forjável)."*

**Mudou?** **O fato e o mecanismo, nada. Uma interação nova de impacto:** `AUD-ALOG-01`
(CRITICAL/A + HIGH/B, produção real) cita `-06` na sua cadeia de dano —
`T-03_RETIFICACAO_01.md:106`: *"Com `AUD-DB-06` (sem CORRELATION_ID) e `FIND-ERP-002` (trilha
não imutável), não há reconstituição possível."* Consequência prática que registro para a fila:
**remediar `AUD-ALOG-01` (emitir os `logAction` faltantes) não devolve reconstituição plena
enquanto `-06` estiver aberto** — o evento passa a existir, mas segue não correlacionável.
Diferença para `-04`: **nenhum `OR-*` declara `-06` como dependência formal**; é composição de
impacto, não bloqueio técnico.

**Recomendação: MANTER MEDIUM**, com **nota de fila**: candidato natural a ser puxado para
perto do lote `AUD-ALOG-01` por afinidade de remediação (mesma tabela, mesmo caminho de
escrita `AuditLog.register`), a critério da SanaCore no plano de remediação — sem herança
formal de prioridade, porque nenhum artefato a declara e eu não a invento (Regra 6).

### 2.4 `AUD-DB-07` — negativa de authZ e leitura da trilha sem evento

**Era (MEDIUM na origem, `T-03:84-90`):** *"`authorize(role)` responde 403 sem nenhum log —
e as duas rotas da própria trilha usam exatamente esse mecanismo (…) ler a trilha não gera
evento."*

**Mudou?** **Nada.** Zero menções nas retificações. Nenhum finding novo o cita.

**Recomendação: MANTER MEDIUM.** Mesmo critério de `-05`: premissa verificada intacta.

### 2.5 `AUD-DB-08` — dado pessoal verbatim em `old/new_values`

**Era (MEDIUM na origem, `T-03:91-97`):** *"39 ocorrências / 30 arquivos; entidade inteira em
`lgpdController.ts:63,120,191` (inclusive pedido de titular de dados) (…) sem retenção, sem
imutabilidade (FIND-ERP-002), legíveis em massa por AUD-DB-05. Conformidade registrada:
nenhuma credencial é logada."*

**Mudou?** **Nada.** Zero menções nas retificações.

**Recomendação: MANTER MEDIUM.** Premissa verificada intacta.

### 2.6 `AUD-DB-09` — soft delete: de "conformidade por ausência" a lacuna de controle

**Era (MEDIUM na origem, `T-03:98-105`):** *"soft delete CONFIRMADAMENTE ausente (…) O ENUM
tem o valor `soft_delete` para uma capacidade que não existe. A 'consistência do filtro de
soft delete' é satisfeita por ausência da funcionalidade, e isso é registrado para não ser
lido como conformidade"* — mais a parte, então e agora válida, da linha destruída não
reconstituível (`productionOrderController.ts:176-183`). Na consolidação
(`T-26_CONSOLIDACAO.md:515`), entrou na célula do bloco como *"soft delete confirmadamente
ausente"* — o retificador o chama, com razão, de **observação inócua**: em substância era meia
conformidade registrada, não um risco.

**Mudou?** **SIM — redação, escopo e natureza, pelos dois autores de origem, com verificação
cruzada independente** (`T-03_RETIFICACAO_01.md` §3; `AUD-DB-09_RETIFICACAO_01.md` §§1-4;
absorvido em `T-26_CONSOLIDACAO_RODADA4.md` §§4.1-4.4):

| Dimensão | DE | PARA |
|---|---|---|
| Capacidade | "não existe" | existe: **34 tabelas** (16,4 % de 207), 13-14 casos de uso, 3 emissores de `action: 'soft_delete'`, convenção nomeada no próprio código |
| Natureza | conformidade por ausência | **lacuna de controle**: filtro de excluído lógico **100 % de aplicação, zero lastro em banco** (sem `paranoid`/view/RLS/trigger) |
| Falhas concretas | nenhuma | **3 nomeadas no caminho de escrita**: `cost_centers` (lançamento contábil), `clients` (venda), `suppliers` (compra) |
| Regime | "exclusão é DELETE físico" | **dois regimes coexistem sem critério versionado** (`RET01-A1`; remissão órfã a "CLAUDE.md §7"); causa-raiz nova **G-24** |
| Parte da linha destruída | válida | **válida, não retificada** |

A premissa que sustentou o MEDIUM original **não existe mais** — nisso o retificador está
correto e o reexame era devido.

**Recomendação: MANTER MEDIUM, RE-FUNDAMENTADO — com a alternativa de elevação apresentada
por inteiro ao dono (§2.6.1).** O critério, aplicado às claras:

- O que **resta titular** em `-09` depois das atribuições anti-dupla-contagem que o próprio
  run já fez: (a) ausência de imposição em banco (defesa em profundidade); (b) regime de
  exclusão não versionado (`RET01-A1`/G-24); (c) linha destruída não reconstituível. Pela
  régua de `T-34`/`AUD-DB-T31-01`, isso é a família *"o dado não carrega a regra; o código
  carrega"* — **MEDIUM**.
- As **3 falhas concretas no caminho normal de escrita** — que são o que passaria no teste
  decisivo de `T-34` para HIGH — **já têm titular**: `T35-DIN-F06` (ampliado de 2 para 3
  entidades pelo próprio autor, **MEDIUM mantida por ele**, `AUD-DB-09_RETIFICACAO_01.md` §5;
  `T-26_CONSOLIDACAO_RODADA4.md` §4.5). A dimensão de **trilha** já tem titular:
  `AUD-ALOG-01` (CRITICAL/HIGH, cabeça da fila). Elevar `-09` **pelo mesmo conteúdo** contaria
  o mesmo risco duas vezes — prática que o run rejeita expressamente
  (`T-03_RETIFICACAO_01.md` §6, "declaro a sobreposição em vez de contar um HIGH novo";
  `T-26_CONSOLIDACAO_RODADA4.md` §3.5).
- **Condição da recomendação:** o MEDIUM que sobreviver a este reexame **não é o MEDIUM
  herdado** — é MEDIUM re-fundamentado na redação retificada (§2.2 da retificação, adotada
  verbatim pela Rodada 4 §4.2). A objeção do retificador (*"herdá-la de premissa que já não
  existe"*) é atendida pelo reexame em si, não exige elevação.

#### 2.6.1 Alternativa que o dono pode legitimamente preferir — elevação a HIGH

Se o dono entender que o teste decisivo de `T-34` deve ser aplicado ao **conjunto** de `-09`
(o defeito ocorre hoje, pelo caminho normal: lançamento contábil aceita centro de custo
inativo, venda aceita cliente inativo, compra aceita fornecedor bloqueado — sem ator futuro,
sem sair do sistema), então `-09` sai da família `T31-01` e a elevação é defensável. Nesse
caso, **duas consequências obrigatórias, antes da fila**:

1. **Fixar a fronteira com `T35-DIN-F06`** (consolidar as 3 falhas de escrita lá ou cá) —
   sem isso há dupla contagem de um risco no placar;
2. **Regra 22**: `-09` elevado a HIGH passa pelo `vericore-finding-validator` — e registro
   que `T35-DIN-F06` e sua ampliação **não foram validados** por `T-36` (fora do mandato —
   `T-26_CONSOLIDACAO_RODADA4.md` §7.2, nuance iii), o que torna a validação duplamente
   devida se o conteúdo migrar.

---

## 3. `AUD-DB-04` × `AUD-ALOG-01/B` — dependência registrada, prioridade herdada sem tocar severidade

Registro formal, como o despacho pede — e com uma precisão que os artefatos impõem ao texto
do despacho (Regra 7):

- `AUD-ALOG-01/B` (`PATCH /api/items/:id/inactivate` + `DELETE /api/items/:id`, mesmo handler
  mudo) é **HIGH · PRODUÇÃO REAL**, posição 2 da fila (`T-26_CONSOLIDACAO_RODADA4.md` §5.2).
- **`OR-21`** (idem §5.3, fundado em `T-37` §7.2): a remediação de `/B` **trata `AUD-DB-04`
  como dependência** no recorte `Item`/UUID — **ou adota contorno documentado
  declaradamente**. A dependência, portanto, é **condicional à escolha de execução**, não
  incondicional; o despacho que me acionou a descreve sem essa alternativa, e o artefato vence.
- Pelo critério escrito do dono (§5.1 da Rodada 4): *"dependência de item PRODUÇÃO REAL herda
  a prioridade do dependente, no recorte necessário"*. **Aplicação mecânica, sem ato novo de
  ninguém:** se a SanaCore seguir a via "dependência", `AUD-DB-04` — **apenas no recorte
  `Item`/UUID** — executa junto da posição 2 da fila, permanecendo MEDIUM. Se seguir a via
  "contorno documentado", `AUD-DB-04` permanece na fila normal por severidade consolidada.
- A escolha entre as duas vias de `OR-21` é **despacho de execução** (SanaCore propõe no
  plano de remediação; director registra) — **não é gate do dono** e não reabre severidade.
  Relacionada, mas distinta, da pendência T-17 da Rodada 4 (critérios de reteste).

O resto de `AUD-DB-04` (recortes `ItemCategoria`, `ItemEstrutura`, `MrpOrdemPlanejada`) **não
herda** a prioridade — a herança é "no recorte necessário", por letra do critério do dono. A
posição desses recortes frente ao corpus segue indeterminada até **D-13** (classificação de
ambiente do corpus pré-existente — pendência do dono já aberta na Rodada 4 §6.1, aqui apenas
referenciada, não duplicada).

---

## 4. Autoria de `AUD-DB-09` para efeito de remediação e reteste — `RES-RET01-04` RESOLVIDA

**Determinação: o autor de origem e custodiante de `AUD-DB-09` é o titular de `T-03` —
`vericore-audit-log-security-auditor`.**

Critério aplicado — evidência de artefato, na ordem da Regra 20:

1. **Regra 7 (artefato vence mandato):** o finding está redigido em
   `T-03_AUDIT_LOG_REPORT.md:98-105`, artefato de `T-03`. O mandato verbal que designava o
   `vericore-database-auditor` como autor foi **contestado pelo próprio designado** no ato
   (`AUD-DB-09_RETIFICACAO_01.md` §0: *"O artefato versionado diz outra coisa"*).
2. **Encaminhamento do validador:** `T-36:452` dirigiu a retificação *"ao autor de `T-03`"*.
3. **Reivindicação expressa e exercida:** `T-03_RETIFICACAO_01.md` §7 — *"`AUD-DB-09` é
   finding **meu** e foi retificado aqui no que estava errado"* — e o titular de `T-03`
   efetivamente retificou a frase nuclear (`T-03:103`), que o auditor de DB deliberadamente
   **não tocou** (§0 da retificação dele).
4. **Prefixo taxonômico não é custódia:** `AUD-DB-*` é rotulagem de domínio na numeração de
   `T-03` (que emitiu de `AUD-DB-01` a `-11`, incluindo itens de credencial e de LGPD). Pelo
   princípio da Regra 16 (acesso/rótulo ≠ ownership), a taxonomia não desloca a autoria do
   artefato onde o finding vive.

**Consequências operacionais desta determinação:**

- **Instrução de remediação e especificação de reteste** de `AUD-DB-09` saem do titular de
  `T-03`, **incorporando por referência** (sem reescrever — Regra 15) o inventário §3 e a
  redação §2.2 de `AUD-DB-09_RETIFICACAO_01.md`, que permanecem evidência do
  `vericore-database-auditor`.
- O reteste independente, quando houver remediação, é da VeriCore (Regra 4) — esta
  determinação define **de quem sai a especificação**, não quem declara `RETEST_PASSED`.
- `RES-RET01-02` (verificação de escrita nas 16/34 tabelas restantes) **permanece** com o
  destinatário já designado no artefato (delta audit / `vericore-repository-layer-auditor`) —
  não movo o que o artefato já resolveu.

**Divergência registrada, não escondida (Regra 21):** `AUD-DB-09_RETIFICACAO_01.md` §7 designa
como "quem fecha" `RES-RET01-04` o `vericore-software-audit-director`;
`T-26_CONSOLIDACAO_RODADA4.md` §6.2 (T-13) designa o **director** do Control Plane. Resolvo no
plano que é inequivocamente meu — **roteamento de handoff de remediação/reteste**
(ownership de orquestração, `CLAUDE.md` tabela de diretórios) — com fundamento integral em
artefatos. Fica **aberta à ratificação ou contestação** do `vericore-software-audit-director`
enquanto autoridade interna da VeriCore; contestação fundada em evidência reabre o item, sem
bloquear a fila até lá.

---

## 5. Recomendação estrutural ao consolidador (VeriCore) — encaminhada, não executada

A célula-bloco *"`AUD-DB-04` … `-09` | MEDIUM ×6"* (`T-26_CONSOLIDACAO.md:515`) **deixou de
descrever um conjunto homogêneo**: `-09` mudou de natureza (e migrou de causa-raiz para o novo
G-24), `-04` carrega dependência condicional de item de produção real, e `-05`…`-08`
permanecem o que eram. Recomendo que a próxima rodada de consolidação **carregue os seis
individualmente** (o próprio §506+ de G-06 já o faz para os demais). Não edito `T-26` — a
Rodada 4 já estabeleceu o veículo correto para substituições (§4.2 dela).

---

## 6. Fecho — o que este exame resolveu por evidência × o que fica para o dono

### 6.1 Resolvido por evidência (nenhuma decisão humana pendente)

| # | Item | Resolução |
|---|---|---|
| R-1 | Contaminação da retificação de `-09` sobre `-04`…`-08` | **Não há.** `-05`/`-07`/`-08`: zero menções, premissas intactas. `-06`: interação de impacto apenas. `-04`: mérito intacto; contexto de fila alterado |
| R-2 | `RES-RET01-04` — autoria de `AUD-DB-09` | **Titular de `T-03` (`vericore-audit-log-security-auditor`)**, §4, com divergência de designação registrada e via de ratificação aberta |
| R-3 | Prioridade de `AUD-DB-04` | Herança condicional via `OR-21` + critério do dono §5.1 R4 — **aplicação mecânica, recorte `Item`/UUID apenas**; sem mudança de severidade (§3) |
| R-4 | Pendência **T-16** da Rodada 4 | **Exame entregue.** O fechamento formal de T-16 ocorre com a decisão do dono (D-R1/D-R2 abaixo) |

### 6.2 Decisões que ficam para o dono (Regra 18 — nenhuma pode ser inferida)

| # | Decisão | Recomendação do director (habilitadora, não vinculante) |
|---|---|---|
| **D-R1** | **Severidade de `AUD-DB-09` retificado:** manter MEDIUM re-fundamentado × elevar a HIGH | **Manter MEDIUM re-fundamentado** (§2.6). Se elevar: fixar fronteira com `T35-DIN-F06` **e** acionar Regra 22 (§2.6.1) — as duas consequências são obrigatórias, não opcionais |
| **D-R2** | **Ratificar a manutenção MEDIUM de `AUD-DB-04`, `-05`, `-06`, `-07`, `-08`** (premissas verificadas intactas, §§2.1-2.5) | Ratificar em lote. A ratificação, registrada em `APPROVALS.md`, fecha T-16 |
| **D-R3** | *(condicional a D-R1 = elevar)* Titularidade das 3 falhas de escrita: `AUD-DB-09` × `T35-DIN-F06` | Sem preferência do director — é fronteira de mérito entre findings, matéria de VeriCore + dono |
| **D-R4** | Registro formal em `APPROVALS.md` da autorização deste reexame e das decisões D-R1/D-R2 | Ato de registro do gate — o texto do dono citado no despacho ainda não consta de `APPROVALS.md` (verificado por busca) |

Permanecem **inalteradas e apenas referenciadas** (não as duplico, não as resolvo): **D-13**
(ambiente do corpus pré-existente), **T-17** (critérios de reteste de `T35-DIN-F06` e
`AUD-ALOG-01`), **T-12/T-15/T-18** da Rodada 4.

---

## 7. Declaração de integridade

Nenhum arquivo fora de `coretriad/governance/` foi alterado. Nenhuma severidade foi alterada.
Nenhum finding foi fechado. Nenhum comando executado, nenhuma conexão de banco
(`APR-2026-016` íntegra). Divergências entre despacho e artefato foram resolvidas a favor do
artefato e registradas (§3, §4). Este documento é insumo de decisão; a decisão é do dono.
