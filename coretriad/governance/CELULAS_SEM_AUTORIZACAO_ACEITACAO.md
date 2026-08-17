# CÉLULAS SEM AUTORIZAÇÃO DE ACEITAÇÃO — lista nominal para decisão do dono

```
PROGRAMA:      ERP-LEGACY-001
RUN:           ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
PRODUZIDO POR: coretriad-director (CoreTriad Control Plane)
DATA:          2026-08-17
ORIGEM:        DIR-DIV-06 e gate b5 de RECONCILIACAO_FINAL_AUD-001.md; pedido do dono
               ("trago a lista nominal do que está sem autorização de aceitação,
               com o custo de cada bloco, e você decide item a item").
NATUREZA:      documento de decisão humana. LISTA e RECOMENDA; não decide (Regras 5 e 18).
REGIME:        read-only sobre audit/ e remediation/. Zero comando, zero execução,
               zero conexão de banco (APR-2026-016 íntegra).
ESCRITA:       exclusivamente coretriad/governance/. Este arquivo é a única escrita.
NÃO DECLARA:   AUDIT_PASSED, FINDING CLOSED, RETEST_PASSED. Não altera severidade.
```

> **Como ler.** Todo número aqui foi lido do artefato citado nesta sessão. Onde o
> artefato traz "≈", o "≈" é dele e permanece. Onde um bloco **já tem** autorização,
> está dito — inflar a lista custa tanto quanto encurtá-la. Onde um bloco está
> **parcialmente** coberto, está o número, não o rótulo.

---

## 1. O QUE `APR-2026-024` DECISÃO A RECUSOU — verbatim

`coretriad/governance/APPROVALS.md:830-832`:

> **"Escolhida a Opção A: estender a auditoria agora.** A **Opção B** — aceitar
> cobertura parcial com exclusão registrada no relatório final — foi
> **explicitamente recusada pelo dono**."

E o efeito normativo, `APPROVALS.md:865-870`:

> **"Efeito normativo desta ressalva:** fechar os ≈150 endpoints cumpre
> `DEF-01`/`DEF-02`/`DEF-03` e **nada além disso**. **Não autoriza declarar o G3
> integralmente cumprido**, não revoga `N-05`, `N-06`, `N-07` nem `N-08`, e não
> supre as células C-63…C-137. **Essa segunda leva permanece decisão ABERTA do
> dono** — e, como todo gate, só pode ser resolvida por decisão humana explícita
> registrada (Regra 18), nunca por inferência a partir desta aprovação."

**Duas consequências, para a decisão ser tomada com o quadro certo:**

1. Enquanto essa recusa estiver de pé, **nenhum agente pode registrar "aceito com
   exclusão declarada"** para os blocos abaixo. Ou se executa, ou o dono emenda a
   própria decisão — item a item, se preferir.
2. **A recusa não é o único obstáculo.** O gate **G3** foi aprovado como
   `APPROVED_WITH_CONDITIONS` (`APPROVALS.md:584`): amostragem permitida *"desde que
   baseada em risco e com risco residual registrado"*, mas **vedada** em, entre
   outras, *"autorização, segregação de funções, operações financeiras, movimentação
   de estoque, integridade de dados, contratos/jurídico, segurança e regras de
   negócio críticas"*. **Blocos B1, B2, B3 e B4 caem dentro dessas categorias
   vedadas** — aceitá-los é também relaxar a condição do próprio G3. O mecanismo
   para isso já existe e é do dono: `G8` (`APPROVALS.md:585`) diz que *"redução
   futura = nova decisão humana registrada como exclusão explícita"*.

---

## 2. A LISTA NOMINAL — 9 blocos

### B1 — `C-136`: contrato de API, matriz por dimensão

- **O que é.** Cada uma das 683 rotas da API deveria ter uma linha dizendo, por
  dimensão, o que ela exige e o que ela devolve: quem pode chamar, o que valida, o
  que registra em log, se repete sem duplicar. Hoje existe a **lista** das rotas;
  não existe essa **matriz**.
- **Quantos.** **1 célula** do plano; **683 endpoints**. `T-17` alcançou o
  inventário exaustivo (`683/683`) e 4 colunas, mais 5 dimensões provadas por
  origem; **faltam por endpoint**: authn, authz, input, validação, output, erros,
  regra, idempotência, rate-limit, logging e teste — **11 colunas × 683 ≈ 7.500
  células** (`T-17` §5, `:279`). **Zero movimento em 4 rodadas** (`RES-16`).
- **Precisão.** `AUDIT_PLAN_EMENDA_02.md:231` fala em "681/681"; `T-17` §1.3 mediu
  683 e registra que *"o número 681 está errado nas duas pontas"*. Uso **683**.
- **O que se perde.** É a única superfície onde authz e idempotência são vistas
  **por rota** e não por módulo. Sem ela, a afirmação "as rotas críticas estão
  autorizadas" continua vindo de trilhas de módulo — que já erraram por omissão de
  fronteira nesta run (`AUD-SEC-T04-01`, `AUD-ALOG-01`). Perde-se também a base
  para a Regra 24 (papel declarado pelo cliente) em varredura por rota.
- **Custo de cobrir.** Leitura literal: **≈50 lotes**, ao ritmo medido de `T-33`
  (43 endpoints × 7 dimensões = 70 células em 2 lotes ⇒ ~150 células/lote).
  **Registro a divergência:** `AUDIT_PLAN_EMENDA_02.md:363` orçou **1 sessão** para
  esta célula — a régua medida da run desmente o orçamento em **uma ordem de
  grandeza**. Variante reduzida: aplicar a matriz **só aos endpoints IN-categoria**,
  que é o critério que o próprio plano fixa (`:231`) — **mas isso depende de `F-5`**,
  a lista IN/OUT, que não existe (ver B3-bis).
- **Recomendação: DIVIDIR.** Cobrir a matriz apenas nos endpoints IN-categoria
  (depois de `F-5`) e registrar **exclusão nominal por dimensão** no complemento —
  isto é, dizer no relatório *quais 11 colunas* não foram preenchidas e *em quais
  rotas*. Cobrir os 683 em 11 dimensões é o único item da lista que muda o prazo de
  dias para meses.

### B2 — D9 de tier 2: segurança de aplicação, `C-16`…`C-34`

- **O que é.** A varredura de segurança dos 19 módulos de tier 2. Ela foi feita em
  **6 das 10 categorias**; faltam **4**: criptografia, segredos, dependências e a
  árvore de desenvolvimento sem gate automatizado.
- **Quantos.** **19 células**, todas **parciais — nenhuma ausente**
  (`AUDIT_COVERAGE_EXECUTED_RODADA4.md:222` e `_RODADA2.md:120`). Módulos nominais
  em `AUDIT_PLAN_EMENDA_02.md:146`: `inventory`, `mobileInventory`, `traceability`,
  `financial`, `treasury`, `accounting`, `budget`, `fiscal`, `juridico`,
  `purchases`, `purchaseRequisitions`, `rfq`, `suppliers`, `sales`, `mrp`,
  `production`, `masterProduction`, `rh`, `sst`.
- **O que se perde.** A categoria "dependências" **já provou ter ponto cego
  estrutural**: `AUD-CICD-DEPGATE-01` mediu **640 de 854 entradas do lock de
  `server` (75 %) fora de qualquer controle automatizado**, e `AUD-DEP-JSYAML-01`
  é o caso concreto que passou invisível. Aceitar aqui é aceitar que a próxima
  `js-yaml` também passe. Cripto e segredos seguem em `A`/`M` — não há prova de
  ausência de segredo em código nesses 19 módulos.
- **Custo de cobrir.** **Não escala com as 19 células**: pela EMENDA-02 §3.1.2, D9
  deixou de ser célula por módulo e virou **superfície transversal com dono único
  (`T-18`)**. Base de comparação: `T-18-A` fechou mass assignment em **21/21 numa
  passagem**. Estimativa: **1 a 2 varreduras transversais** para as 4 categorias.
- **Recomendação: COBRIR.** É a melhor relação custo/risco da lista, e "segurança"
  é categoria **nominalmente vedada** à amostragem em G3.

### B3 — D4-D8 dos 174 endpoints do tier 3 profundo, `C-35`…`C-62`

- **O que é.** Os 7 módulos de tier 3 profundo (`facilities` 64, `ti` 47,
  `marketing` 30, `engineering` 11, `comex` 8, `reports` 8, `workCenters` 6) foram
  triados 100 % em D1/D2/D3-de-borda, mas **as dimensões de profundidade — dados,
  regra, testes, documentação, segurança — só alcançaram metade dos endpoints**.
- **Quantos.** **28 células**, todas **parciais**. Cobertura medida:
  **`A(≈91/174, 52 %)`** ⇒ **≈83 endpoints** sem profundidade em **5 dimensões**
  ≈ **415 células de trabalho** (`AUDIT_COVERAGE_EXECUTED_RODADA4.md:142`, `:259`).
- **O que se perde.** `facilities` e `ti` foram os módulos onde `T-41` achou dinheiro
  onde o rótulo dizia "apoio" (`it_software_license_details.cost` com três unidades
  temporais na mesma coluna). Aceitar sem cobrir mantém 83 endpoints que **tocam
  custo e ativo** sem exame de integridade de dados e de regra.
- **Custo de cobrir.** ≈415 células ⇒ **≈3 lotes** ao ritmo de `T-33`.
- **Recomendação: DIVIDIR.** Fazer `F-5` primeiro (abaixo) e cobrir apenas os
  IN-categoria; o complemento OUT-categoria vira exclusão nominal — que é
  exatamente o que G3 autoriza quando a amostra é baseada em risco **publicado**.

### B3-bis — `F-5`: a lista nominal IN × OUT dos 174

- **O que é.** O passo 4 do próprio regulamento de amostragem (REG-G3): dizer, por
  nome, quais dos 174 endpoints entram na banda de risco e quais não.
- **Quantos.** **174 endpoints** a classificar. **Aberta há 4 rodadas.**
- **O que se perde.** Sem ela, **a amostra dos 174 não satisfaz a condição (a) de
  G3** — é amostra com critério em prosa, não baseada em risco. O par a chama de
  *"a lacuna mais barata da run"* (`_RODADA4.md:258`).
- **Custo.** **1 varredura.** Já despachada como item técnico `c7` da
  `RECONCILIACAO_FINAL_AUD-001.md` — **não depende desta decisão**, e é
  pré-requisito da variante barata de B1 e de B3.
- **Recomendação: COBRIR** (já em despacho; listada aqui só porque a sua ausência
  contamina o que o relatório pode afirmar sobre B1 e B3).

### B4 — Resíduo de `rh` em D3/D4, `C-03`/`C-04`

- **O que é.** Endpoints de RH cujo caso de uso e cuja integridade de dados ninguém
  examinou — estão dentro dos clusters que `T-12` citou mas não reivindicou, e fora
  do que `T-27 DEF-02A` cobriu.
- **Quantos.** **≈13 endpoints** de 57. Cobertura medida: **`A(≈44/57)`**
  (`_RODADA2.md:89`, `_RODADA4.md:221`; `DIV-T27-RH-02`, escalada e aberta).
- **O que se perde.** RH é **dado pessoal + obrigação legal com prazo** — duas das
  categorias vedadas. E é o módulo que já produziu `AUD-RH-VTHORISTA-01` (CRITICAL),
  `AUD-RH-CPFSEARCH-01` e `AUD-RH-COMISSAO-01` nos endpoints que **foram** olhados.
  A densidade de achado nesse módulo não é hipótese: é medida.
- **Custo de cobrir.** **Menos de 1 lote.** Base: `T-27 DEF-02A` cobriu
  **30 endpoints de `rh` em D3+D4 numa trilha**.
- **Recomendação: COBRIR.** É o item mais barato com risco concreto da lista.

### B5 — Resíduo de `sst` em D3/D4, `C-05`/`C-06`

- **O que é.** A trilha de SST **declarou 75/75**; o par de cobertura **não
  confirma**, porque ≈6 endpoints dos clusters-âncora de `T-12` não têm atribuição
  de profundidade. Pode ser que já estejam cobertos e ninguém cruzou as listas.
- **Quantos.** **≈6 endpoints**, em 2 células (`OBS-T26-11`/`RES-T26-07`, 3ª rodada
  consecutiva). **Não são 6 endpoints sabidamente descobertos — são 6 sem prova de
  cobertura.**
- **O que se perde.** Se estiverem descobertos, são dado **de saúde** de
  trabalhador. Se estiverem cobertos, perde-se apenas a prova — mas o control plane
  já determinou (§2.3 da reconciliação) que o relatório final registrará
  `E 75/75 DECLARADA, NÃO CONFIRMADA PELO PAR`.
- **Custo.** **≈0 de fieldwork: 1 cruzamento de listas** (os 75 de `T-27 DEF-02B`
  contra os clusters-âncora de `T-12`). Já despachado como `c8`.
- **Recomendação: COBRIR pelo cruzamento.** Não é decisão de aceitação; é
  conferência barata. Só vira decisão do dono se o cruzamento revelar descobertos.

### B6 — Resíduo de `juridico`, `C-01`/`C-02`

- **O que é.** **1 endpoint** — `GET /juridico/reports/financeiro`
  (`juridico.ts:64`) — contado por `T-09` dentro de "contratos" e classificado pelo
  router como transversal. Se prevalecer o router, `DEF-01` fecha em **74/75**.
- **Quantos.** **1 endpoint**, 2 células afetadas (`DIV-T27-JUR-03`).
- **O que se perde.** Nada material: é um relatório de leitura. O que se perde é a
  possibilidade de dizer "75/75" sem asterisco.
- **Custo.** **Zero de fieldwork.** É decisão de definição, atribuída pelo par ao
  director de auditoria.
- **Recomendação: não é matéria do dono.** Listado por exaustividade. Encaminhado ao
  `vericore-software-audit-director` para definição.

### B7 — `C-133`: o que resta do `client/`

- **O que é.** Das 167 unidades de tela do `client/`, 157 foram declaradas lidas —
  mas parte por leitura dirigida (busca por padrão), não linha a linha, e um punhado
  não tem atribuição nominal a nenhum bloco.
- **Quantos.** **≈10 unidades sem atribuição nominal** + **31 lidas dirigidamente**
  (23 transversais + 8 de comercial/financeiro), de 167
  (`_RODADA4.md:205-215`). Célula em **PARCIAL ALTA**, `A(157/167)`.
- **O que se perde.** As 8 de comercial/financeiro têm declaração da própria trilha
  de que a leitura dirigida é **insuficiente para afirmar ausência de achado na
  renderização** — ou seja, é lacuna reconhecida pelo executor, não suposta pelo
  auditor da cobertura.
- **Custo de cobrir.** **1 a 2 lotes.** Base: `T-32` cobriu 157 unidades em 6 blocos
  (~26 por bloco); faltam ≈41.
- **Precisão.** `D-07` (denominador: 167 arquivos × ≈121 páginas roteadas) é **outra
  decisão** e não muda o estado da célula — ela é PARCIAL ALTA nos três
  denominadores.
- **Recomendação: DIVIDIR.** Cobrir as ≈10 sem atribuição (barato, fecha a
  aritmética) e aceitar as 31 dirigidas com **exclusão nominal por arquivo**.

### B8 — As 21 tabelas sem model, dentro de `C-137`

- **O que é.** Tabelas que existem no banco congelado e **não têm model no código**.
  Por isso `T-35` e `T-41` não conseguiram sequer **nomeá-las**, e o que não se nomeia
  não entra na exclusão nominal.
- **Quantos.** **21 tabelas** (`T35-META-F01` / `RES-T41-07`).
- **Precisão que importa.** `APR-2026-036` diz expressamente que **não** as cobre e
  que elas **não estão na exclusão declarada** (`APPROVALS.md:1850-1852`): *"excluir
  nominalmente exige nomear"*. Portanto o resto de `C-137` **tem** autorização; estas
  21 **não têm**, nem de cobertura nem de aceitação.
- **O que se perde.** Tabela sem model é tabela que nenhuma trilha desta run olhou
  por nenhum ângulo. Não se sabe se carrega dinheiro, estoque ou dado pessoal —
  literalmente não se sabe.
- **Custo.** **Nomear: 1 varredura estática** por diferença de conjuntos sobre
  `00_baseline_frozen.sql` + migrations pós-freeze (já despachado como `c4`).
  **Cobrir, se a triagem as puser na banda integral: ~2-3 lotes** ao ritmo de `T-41`
  (9 tabelas com verificação externa por lote).
- **Recomendação: COBRIR A NOMEAÇÃO AGORA e decidir a cobertura depois**, com a
  lista na mão. Decidir aceitar 21 tabelas anônimas é aceitar sem saber o quê.

### B9 — (adjacente) Toda a prova dinâmica, `RES-11` / G4

- **O que é.** Nada nesta run foi executado contra um sistema em pé. Todos os
  achados são estáticos.
- **Quantos.** **≈190 pedidos DYN** de ordem de grandeza, contra **~103 catalogados**
  e **~21 executados** (`_RODADA4.md:264`, `RECONCILIACAO_FINAL` c12).
- **O que se perde.** Confiança de comportamento **MÉDIA** em achados que dependem
  de alcançabilidade; e há pelo menos um pedido cujo resultado, segundo a própria
  trilha, mudaria a gravidade de um achado de RH (`DYN-T41-03`, `T-41:467`) — o que
  quem decide a gravidade é a VeriCore, não este documento.
- **Custo.** Não é lote de leitura: é **janela de execução autorizada**, com o banco
  de teste recriado do zero conforme `APR-2026-024` Decisão C. Sob `APR-2026-016`,
  **nada roda sem decisão humana de janela**.
- **Precisão.** **Este bloco não é da mesma natureza dos outros oito.** O gate dele é
  de **execução**, não de **aceitação**, e ele já está listado como `c12`. Está aqui
  porque o relatório final precisará dizer algo sobre ele de qualquer forma.
- **Recomendação: DECIDIR SEPARADAMENTE** — janela escopada aos pedidos de maior
  valor, não à fila inteira.

---

## 3. O QUE **NÃO** ESTÁ NESTA LISTA — porque já tem autorização ou já foi entregue

Registro para não inflar o trabalho:

| Item | Estado | Autorização |
|---|---|---|
| `C-137` — banda de cobertura integral | **57 tabelas de 1ª ordem a cobrir; 9 já feitas por `T-41`** ⇒ faltam **48**, ~5-6 lotes | **TEM** — `APR-2026-034` D2 + `APR-2026-036` |
| `C-137` — 23 tabelas de 2ª ordem | Exclusão nominal, lista de `T-41` §3.1 marcada `*` | **TEM** — `APR-2026-036` (aceitação autorizada) |
| `C-63`…`C-132` — 70 células dos 43 rasos | **Entregues** (`T-33` A+B), com 3 ressalvas declaradas (D5 e D9 estáticos; teste por regra crítica ausente) | não é matéria de aceitação |
| `C-134`/`C-135` — `mobile`/`tv` | **`E`** (`T-29`), triagem 100 % | não é matéria de aceitação |
| D7 (testes), D8 (documentação), D10 (arquitetura) de tier 2 | Amostrais **por desenho do plano**, com risco residual nominal `RES-06`/`RES-07`/`RES-08` — fora das categorias vedadas de G3 | **TEM** — `AUDIT_PLAN_EMENDA_02.md:154-157` |
| Severidades `D-01`, `D-R1`, `D-R2`, `D-R3` | **Fechadas** | `APR-2026-035` |
| `DIV-COV4-06` (SST/jurídico × "dado pessoal") | **Resolvida** | `APR-2026-036` — o dado de saúde **permanece coberto** |
| `D-09` — 26 HIGH de `npm audit` em `mobile`/`tv` | Aberto, **gate próprio** (b8) | não é cobertura; não entra nesta lista |

---

## 4. O QUE MUDA: ACEITAR TUDO × COBRIR TUDO

**Base de tempo usada:** a do próprio dono. `APR-2026-034` D2 equipara **2-3 lotes a
2-3 dias adicionais** antes dos relatórios finais. Uso **1 lote ≈ 1 dia** de
fieldwork, e digo onde a conta não vale.

| Cenário | Prazo adicional de fieldwork | O que o relatório final poderá afirmar |
|---|---|---|
| **Aceitar tudo** (B1…B8 com exclusão nominal) | **≈0 dias.** O relatório sai assim que saírem os itens técnicos já despachados (errata do placar, enumeração do estrato 4, `F-5`, lista das 21, cruzamento de `sst`, adjudicações pendentes, `DIV-SEV-01`) | Não pode afirmar G3 cumprido. Terá de registrar, **por escrito e nominalmente**: 683 rotas sem matriz de contrato; 4 de 10 categorias de segurança não varridas em 19 módulos; 83 endpoints sem profundidade; 13 endpoints de RH sem exame; 41 unidades de tela; 21 tabelas anônimas. **Quatro desses seis caem em categorias que G3 veda amostrar** — a aceitação é, portanto, uma **emenda ao G3**, e precisa dizer isso na ata |
| **Cobrir tudo menos `C-136` integral** (B2, B3 IN-categoria, B3-bis, B4, B5, B6, B7, B8) | **≈8 a 10 dias** de fieldwork, mais a validação adversarial dos achados novos (Regra 22) | Pode afirmar G3 cumprido **com exclusão nominal restrita ao complemento OUT-categoria de B1 e B3** — que é exatamente a forma que G3 autoriza. Nenhuma categoria vedada ficaria sem cobertura |
| **Cobrir tudo, inclusive `C-136` literal** | **≈50 dias** de fieldwork — dominados por B1 (683 × 11 dimensões). A régua de 1 lote/dia deixa de valer nessa escala; o número real é uma nova estimativa de dimensionamento, não uma extrapolação | Pode afirmar cobertura integral. **Não recomendo:** o ganho marginal sobre o cenário anterior está concentrado em rotas OUT-categoria |

**Dois efeitos que valem em qualquer cenário e não dependem desta decisão:**
`C-137` segue com ~5-6 lotes já autorizados; e o relatório final não sai sem os
itens técnicos de `RECONCILIACAO_FINAL_AUD-001.md` §3(c).

---

## 5. TABELA DE DECISÃO — uma linha por bloco

Responda na coluna da direita. Qualquer das três palavras serve: **COBRIR**,
**ACEITAR** (com exclusão nominal), **DIVIDIR** (e diga onde corta).

| Bloco | O que é | Itens | Custo de cobrir | Recomendação do director | **Decisão do dono** |
|---|---|---|---|---|---|
| **B1** | `C-136` — matriz de contrato por dimensão | 683 endpoints × 11 dimensões ≈ 7.500 células | ≈50 lotes (integral) · ≈? lotes (só IN-categoria, depende de B3-bis) | **DIVIDIR** — cobrir IN-categoria, exclusão nominal por dimensão no resto | |
| **B2** | D9 de tier 2 — segurança em 19 módulos | 19 células parciais; 4 de 10 categorias ASVS | 1-2 varreduras transversais | **COBRIR** | |
| **B3** | D4-D8 dos 174 do tier 3 profundo | 28 células; ≈83 endpoints × 5 dimensões | ≈3 lotes | **DIVIDIR** — cobrir IN-categoria após B3-bis | |
| **B3-bis** | `F-5` — lista nominal IN × OUT dos 174 | 174 endpoints a classificar | 1 varredura (já despachada) | **COBRIR** — condição textual de G3 | |
| **B4** | Resíduo de `rh` em D3/D4 | ≈13 endpoints de 57 | < 1 lote | **COBRIR** | |
| **B5** | Resíduo de `sst` em D3/D4 | ≈6 endpoints sem prova de cobertura | 1 cruzamento de listas (já despachado) | **COBRIR pelo cruzamento** | |
| **B6** | Resíduo de `juridico` | 1 endpoint ambíguo | zero | **Não é do dono** — definição da VeriCore | |
| **B7** | `C-133` — resto do `client/` | ≈10 sem atribuição + 31 dirigidas, de 167 | 1-2 lotes | **DIVIDIR** — cobrir as ≈10, exclusão nominal nas 31 | |
| **B8** | 21 tabelas sem model (`C-137`) | 21 tabelas | 1 varredura para nomear; 2-3 lotes para cobrir | **NOMEAR AGORA, decidir cobertura depois** | |
| **B9** | Prova dinâmica (G4/`RES-11`) | ≈190 pedidos; ~21 executados | janela de execução, não lote de leitura | **DECIDIR SEPARADAMENTE** — janela escopada | |

---

## 6. LIMITES DESTE DOCUMENTO — declarados

1. **Nenhum arquivo do objeto auditado foi aberto.** Zero conteúdo de produto, zero
   comando, zero conexão de banco (`APR-2026-016` íntegra).
2. **Lido por conta própria nesta sessão:** `APPROVALS.md` (`APR-2026-024` A/B/C,
   `APR-2026-034`, `-035`, `-036`, gates G3/G8 da Parte A);
   `AUDIT_COVERAGE_EXECUTED_RODADA4.md` (§3, §4, §5, §11, §12, §13);
   `AUDIT_COVERAGE_EXECUTED_RODADA2.md` (§2, §4); `AUDIT_PLAN_EMENDA_02.md`
   (§3.1.2, §3.2, §8 C-136, §7.1, §7.2); `T-41` (§1-§4, §6); `T-17` (§1, §5);
   `RECONCILIACAO_FINAL_AUD-001.md` (integral).
3. **Aceito sem reverificar:** toda declaração de cobertura de trilha, todo veredito
   de mérito de VeriCore, toda âncora `arquivo:linha`. Onde uma trilha declarou
   cobertura e cobriu menos, **este documento repete o erro dela**.
4. **Os custos são estimativas com base declarada** — o ritmo medido de `T-33`,
   `T-32`, `T-41` e `T-27`. Não são compromissos de entrega da VeriCore, e o
   dimensionamento formal, se o dono mandar cobrir, é do
   `vericore-software-audit-director`.
5. **Nada aqui decide.** Nenhum gate resolvido, nenhuma severidade alterada, nenhum
   finding fechado, nenhum artefato de VeriCore ou SanaCore editado (Regras 5, 15,
   16, 18).
6. **Fica devido**, quando o dono responder: o registro da decisão em
   `APPROVALS.md`, o evento correspondente no `PROJECT_EVENT_LOG` e a atualização do
   gate **b5** de `RECONCILIACAO_FINAL_AUD-001.md` §3(b).

---

**Estado:** `9 BLOCOS SEM AUTORIZAÇÃO DE ACEITAÇÃO, NOMINAIS E COM CUSTO ·
1 DELES (B9) DE NATUREZA DISTINTA · 7 ITENS COM AUTORIZAÇÃO CONFIRMADA, FORA DA
LISTA · AGUARDANDO DECISÃO ITEM A ITEM DO DONO (Regra 18).`
