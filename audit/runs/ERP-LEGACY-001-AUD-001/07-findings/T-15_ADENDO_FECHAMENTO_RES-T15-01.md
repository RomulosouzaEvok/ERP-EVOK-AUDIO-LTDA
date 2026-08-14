# T-15 · ADENDO DE FECHAMENTO — `RES-T15-01` (a), (b), (c)

> **Nota de persistência.** Produzido pelo `vericore-traceability-auditor` (T-15 adendo de fechamento de RES-T15-01) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:     ERP-LEGACY-001-AUD-001
TRILHA:       T-15 — Requisitos, Casos de Uso e Rastreabilidade
INSUMO NOVO:  audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-14_REGRAS_DE_NEGOCIO.md (lido integral)
ESCOPO DESTE ADENDO: exclusivamente RES-T15-01 (a)(b)(c) + os três registros solicitados.
                     Nenhum outro resíduo tocado. RES-T15-02..06 permanecem como estão.
REGIME:       read-only, sem banco, sem execução, nada escrito em disco. Findings PROPOSED.
ESTADO T-15:  CONCLUÍDA COM LACUNAS DECLARADAS (RES-T15-03/04/05/06 abertos).
```

---

### (a) Elo BR↔REQ para os 90 RFs — FECHADO

**Medição:** **0 de 90 RFs citam um BR-ID.** Verificado por leitura integral de `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — a coluna "Referência" dos 90 requisitos cita UC, rota, tela, `CLAUDE.md`, `API.md` e commits, **nunca uma regra de negócio identificada**.

T-14 fecha o outro lado: 145/165 com âncora `BR → código` decidida (124 base P/N + 21 base C). **As duas medições são complementares e concordantes**, e produzem o veredito conjunto:

> **Elo `BR → IMPLEMENTAÇÃO`: PROVADO em 145.** **Elo `REQ → BR`: INEXISTENTE em 90/90.** A cadeia não quebra por falta de regra nem por falta de código — quebra **exatamente na junta entre eles**, e quebra do lado do requisito.

T-14 §9 (`:425`) chega ao mesmo ponto por caminho independente: *"O elo que continua rompido é `BR ↔ REQ`, não `BR ↔ código`"*. **Convergência de duas trilhas com métodos disjuntos** (ela mediu do código para cima; eu medi do requisito para baixo) — não é votação, é evidência convergente.

**Atribuições BR→RF que existem, e o que elas valem.** Dez dos 90 RFs têm ao menos um BR-ID a eles atribuído — **nenhum deles no artefato de requisito, todos apenas no `REQUIREMENTS_BASELINE.md`**, que é produto de trabalho de auditoria:

| RF | BR atribuído pelo discovery | Status T-14 | Base | Efeito na cadeia |
|---|---|---|---|---|
| RF-AUT-03 | BR-IAM-009 | CONFIRMADA (conflito real) | P | elo BR fechado; **REQ divergente** (401 × 422) |
| RF-AUT-04 | BR-IAM-014, BR-IAM-015 | CONFIRMADAS (conflito/assimetria reais) | P / P+C | elo BR fechado; REQ divergente |
| RF-AUT-08 | BR-IAM-021, BR-COM-005 | CONFIRMADAS (conflitos reais) | P | elo BR fechado; REQ divergente (2 eixos) |
| RF-AUT-09 | BR-IAM-025 | CONFIRMADA | P | elo BR fechado; **REQ divergente** (métrica errada) |
| RF-VEN-05 | BR-COM-005 | CONFIRMADA (2ª trava inexistente) | P | elo BR fechado; REQ divergente |
| RF-COM-05 | BR-SUP-004 (+BR-SUP-005) | CONFIRMADAS | P | elo BR fechado; REQ divergente na vigência |
| RF-EST-07 | BR-QE-011 | **DIVERGENTE** | P+C | **ELO FALSO** — ver (b) |
| RF-PRD-01 | BR-PP-025 | CONFIRMADA (ausência de CRP) | N | elo BR fechado por prova negativa; IMPL inexistente |
| RF-PRD-04 | BR-PP-013 | CONFIRMADA (conflito real) | P | elo BR fechado; REQ divergente |
| RF-FIN-06 | BR-FIN-002 | CONFIRMADA | C | elo BR fechado (**marca de origem: T-07, não relido por T-14**) |

**Classificação obrigatória desta ligação (Regra 6/7):** estas 10 atribuições são **INFERÊNCIA DE AUDITORIA, não elo de rastreabilidade**. Um vínculo que existe apenas em relatório de auditoria e não no artefato versionado do objeto **não é rastreabilidade** — é reconstrução. Registro-as com a marca `ATRIBUÍDO-POR-AUDITORIA`; **não as promovo a elo PROVADO** e não as inscrevo como link. Fazê-lo seria "completar a matriz para parecer coberta", que é o antipadrão que esta trilha existe para não cometer.

**Os 80 RFs restantes:** elo `REQ → BR` **INEXISTENTE**, sem sequer atribuição de auditoria.

**Classe NÃO LOCALIZÁVEL — instrução de T-14 acolhida integralmente.** As 15 BRs de `RES-T14-01` (BR-PP-011/014/020/023/024, BR-QE-010/013, BR-RH-D03, BR-JUR-D07/D08/D09/D10, BR-SST-D16, BR-TI-014, BR-FAC-D20) entram na matriz com marca própria **`INDETERMINADO — RES-T14-01`** e **não são contadas em direção alguma**, nem como elo fechado nem como rompido. Nenhuma delas é atribuída a qualquer um dos 90 RFs, logo **não alteram nenhum número desta trilha**. Registro material: 4 das 15 (BR-JUR-D07/D08/D09/D10) são exatamente as regras de alçada de contrato jurídico — a mesma superfície de `T15-F04` e do `CASE-002`/`FIND-ERP-005`.

---

### (b) Reclassificação das 3 cadeias frouxas sobreviventes — FECHADO

| BR-ID | Elo BR→CÓDIGO (T-14) | Elo REQ↔BR | Elo AC / TC-ID | Veredito final T-15 |
|---|---|---|---|---|
| **BR-IAM-018** | **PROVADO** — `AssignAccessProfileUseCase.ts:69` + `:61-65`, base **P** | **INEXISTENTE** (RF-AUT-05 não cita BR) | INEXISTENTES | **Cadeia frouxa íntegra; cadeia estrita INCOMPLETA** |
| **BR-IAM-023** | **PROVADO** — `DeactivateAccessProfileUseCase.ts:51-57` + `AssignAccessProfileUseCase.ts:61-65`, base **P** | **INEXISTENTE** | INEXISTENTES | **idem** |
| **BR-IAM-024** | **PROVADO com âncora corrigida** — imposição em `CreateAccessProfileUseCase.ts:55-58`; a linha `:48` publicada é o `trim` (T14-F04) | **INEXISTENTE** | INEXISTENTES | **idem — com registro de que a âncora que o passo 29 usou para declarar a cadeia completa apontava para a linha errada** |

**Contagem frouxa final: 3.** Inalterada. As três sobrevivem, e agora o elo BR delas está **verificado por leitura própria VeriCore no `AUDIT_COMMIT`**, não presumido. **Contagem estrita final: 0 de 90.** Inalterada e reforçada — T-14 não produz nenhum AC-ID nem TC-ID, que são os elos que tornam a completude estrita estruturalmente impossível (`T15-F06`).

**Não-conflito que o consolidador precisa ler antes de cruzar as duas trilhas.** T-14 classificou **BR-IAM-019, BR-IAM-020 e BR-IAM-025 como CONFIRMADAS** (base P). Eu classifiquei as três cadeias que passam por elas como **ELO FALSO**. **Isto não é divergência** — são proposições sobre elos diferentes:

- T-14 mediu `BR → código`: a regra existe no código como o catálogo a declara. **Verdadeiro.**
- T-15 mediu `REQ → implementação`: os requisitos-âncora dessas cadeias (**RF-AUT-07** e **RF-AUT-09**) divergem do que o código faz — RF-AUT-07 declara "403 consistente" universal enquanto `module-authorization-map.test.ts:120-133` exclui 12 módulos; RF-AUT-09 embute métrica já errada. **Também verdadeiro.**

A cadeia é falsa **não porque a BR esteja errada, mas porque o requisito que ela deveria realizar afirma outra coisa**. Coerente com o próprio catálogo, que registra BR-IAM-019/020/025 sob status `CONFLICTING`/conflito real: **confirmar uma regra cuja declaração é um defeito não torna a cadeia verde** — T-14 diz o mesmo em `:55`. `ESC-T15-02` permanece dirigido à trilha `identidade-acesso` do passo 29, **não** a T-14.

**As 4 DIVERGENTES — instrução de T-14 acolhida, com uma consequência que só esta trilha pode extrair.** BR-SUP-016, BR-CAD-009, BR-QE-008, BR-QE-011 **não contam como cadeia completa** em nenhuma definição. Delas, **uma toca diretamente os 90 RFs**: **BR-QE-011 ↔ RF-EST-07** (scan mobile). Resultado:

> **RF-EST-07 é o caso onde os três eixos falham simultaneamente e de forma independente:** o requisito diz `[IMPLEMENTADO]`; a BR que o sustenta é **DIVERGENTE por omissão de escopo** (T-14: restringe ao mobile um defeito que `RegisterProductMovementUseCase.ts:60-67` também tem); a implementação é **CRITICAL confirmada** por T-06 (`AUD-INTEG-03`); o UC é **INEXISTENTE**; AC e TC-ID **inexistem**; e o teste que existe é **cego** (`mobileInventory-use-cases.test.ts`, só validação de entrada). **Elo falso em cinco pontos da mesma linha.** É o exemplar mais completo de cadeia falsamente verde do ERP e deve ir ao consolidador como tal.

**BR-FIN-003 (NÃO IMPLEMENTADA):** **nenhum dos 90 RFs aponta para ela** — verificado. Logo a hipótese de T-14 §9 (`:422`, "se T-15 encontrar REQ apontando para ela, a cadeia quebra na implementação") **não se materializa**: não há REQ apontando. A regra de origem humana está **sem requisito a montante e sem implementação a jusante** — órfã nas duas direções. Ver a ressalva de escopo em (c).

---

### (c) T-14 mediu 164 ou 165? E o corpus `docs/business` entrou? — FECHADO

**c.1 — 165, não 164. Discrepância registrada, não resolvida.** T-14 declara `165` no cabeçalho (`:13,:21`), reconcilia `39+33+26+13+29+24+1 = 165` (`:265`) e classifica **BR-FIN-003** como NÃO IMPLEMENTADA dentro do escopo (§3.7, `T14-F03` HIGH). A correção de contagem para **164** — `BR-FIN-003` entrou por `APR-2026-021`, commit `2a591cf`, **posterior** ao `AUDIT_COMMIT` (`.git/logs/refs/heads/main:137`) — **não foi aplicada**.

**Por que isto é materialmente relevante e não aritmética.** T-14 constrói sobre BR-FIN-003 uma afirmação de alto valor (`T14-F03`, HIGH): *"a única regra do catálogo decidida por humano é a única sem implementação"*, com escalonamento ao `finding-validator` e ao `CASE-001`/SanaCore. Se a regra está **fora do commit auditado**, essa afirmação muda de estatuto: passa de *achado sobre o objeto auditado* para *achado sobre uma norma posterior ao objeto*, e o "descumprimento" torna-se anacrônico por construção — o código do `AUDIT_COMMIT` não poderia cumprir uma regra que ainda não existia. O mérito de `T14-F03` quanto ao risco de remediação do `CASE-001` **permanece intacto e é real**; o que muda é **contra qual baseline ele é medido**. **Não resolvo** — é decisão do director sobre escopo (Regra 12-14) e toca a `APR-2026-021`. Registrado como **`RES-T15-02` (reaberto e agravado)**.

Consequência aritmética a preservar sem decidir: se o universo for 164, o placar de T-14 lê **145 CONFIRMADA · 4 DIVERGENTE · 15 NÃO LOCALIZÁVEL · 0 NÃO IMPLEMENTADA**, e a classe "NÃO IMPLEMENTADA" desaparece do `AUDIT_COMMIT`.

**c.2 — O corpus `docs/business` NÃO entrou no espaço de busca de T-14. Confirmado por prova negativa.** Grep no relatório de T-14 por `docs/business|BLOCO_|BRIEF_|briefs` → **0 ocorrências**. O ponto cego documentado em `T15-F03`/`T15-F04` **não foi endereçado**; `ESC-T15-04` não é referenciado no relatório entregue.

---

### REGISTRO DE DIVERGÊNCIA ABERTA — `ESC-T15-05` (não conciliada, não resolvida por autoridade)

**(i) As duas trilhas mediram espaços de busca diferentes.** Ambos os resultados são fatos verdadeiros; são as **conclusões** que são incompatíveis, porque cada uma quantifica sobre um universo distinto.

**(ii) Qual é exatamente o espaço de cada uma:**

| | T-14 (§4, `:265`) | T-15 (`T15-F04`) |
|---|---|---|
| **Espaço de busca** | As **165 fichas do próprio `BR_CATALOG.md`**, travessia linha a linha, mais os 20 prefixos da §2.1 | O **corpus versionado externo ao catálogo**: `docs/business` (88 fichas `BR-<ÁREA>-<NNN>`, 456 refs em 17 arquivos), `server/src` (18 `rule:'BR-...'`), migrations, `00_baseline_frozen.sql`, `server/tests` (87 refs em 22 arquivos) |
| **Pergunta respondida** | "Algum BR-ID aparece duas vezes **dentro do catálogo** com conteúdos distintos?" | "Algum BR-ID do catálogo **já significava outra coisa** em artefato versionado fora dele?" |
| **Resposta** | **Não** — conferência própria, correta no seu escopo | **Sim** — `BR-JUR-003`, com os dois lados em arquivo:linha |

**(iii) Por que são compatíveis como fatos e incompatíveis como conclusão.** A conferência de T-14 é **internamente válida e eu a acolho**: dentro do catálogo não há ID repetido. Mas a proposição que o `BR_CATALOG.md:400` enuncia — *"nenhuma colisão encontrada"* — é uma afirmação sobre **o namespace `BR-<ÁREA>-<NNN>`**, não sobre o arquivo. Uma busca confinada ao arquivo **não pode**, por construção lógica, sustentar uma conclusão sobre o namespace. T-14 confirmou a auto-consistência do catálogo e a reportou como confirmação da ausência de colisão; são coisas diferentes.

**Reforço de evidência a `T15-F04` (mesmo finding, evidência nova — nenhum ID novo criado), que fecha o argumento sem contradizer o veredito de T-14:**

T-14 confirmou `BR-JUR-003` contra `juridico/domain/constants.ts:23,26,38-47`. Li esse arquivo integralmente: **ele não contém a string `BR-JUR-003` em lugar algum** — seu cabeçalho (`:2`) e sua função (`:33`) dizem **`RF-JUR-003`**. E o módulo emite, em runtime, os dois identificadores para regras **diferentes**:

```
ApproveContractUseCase.ts:62,68,81,87   → BusinessRuleError(..., { rule: 'RF-JUR-003' })   ← alçada por valor
CreateContractAddendumUseCase.ts:37,40  → BusinessRuleError(..., { rule: 'BR-JUR-003' })   ← aditivo exige new_value/new_end_date
```

Ou seja: **o único código do ERP que literalmente emite `BR-JUR-003` implementa a regra do aditivo**, enquanto o catálogo canonizou `BR-JUR-003` como a regra de alçada — que o próprio código identifica como `RF-JUR-003`. **T-14 confirmou a regra certa contra o código certo sob o ID errado**, porque validou o par (ID, âncora) tal como o catálogo os publica, sem varrer quem mais usa aquele ID. Os dois vereditos coexistem sem que nenhum precise ceder.

Isto também dá base empírica ao que o passo 29 negou: `details.rule` **não** carrega apenas rótulos de gap (`G1..G18`, `D-C/D-G`) — carrega BR-IDs e RF-IDs canônicos, emitidos em produção. Reforça `T15-F03`.

**Encaminhamento:** resolução de mérito é de **T-25 com o `vericore-finding-validator`**; a parte que toca a `APR-2026-019` (esquema canônico que produz colisão por construção) é **decisão do dono**. **Não altero `T15-F04`. Não peço alteração a T-14. Nenhuma das duas trilhas cede por deferência.**

---

### AVALIAÇÃO DE `T14-F05` CONTRA O §4 DE T-15 — **REFINA, não contradiz**

T-14 afirma que a `APR-2026-019` resolveu o problema de numeração e que a causa remanescente é `BR ↔ REQ` mais **≥ 26 regras vivas sem BR-ID nenhum**, com o padrão adjudicado: *"a regra que atravessa dois módulos é a que fica sem BR-ID"*.

**Confirma (integralmente):** a parte "`BR ↔ REQ` é o elo rompido" — medida por mim de forma independente em (a): 0/90. Convergência de trilhas com métodos disjuntos.

**Refina (e é o ganho real deste cruzamento):** `T14-F05` mede regras **sem ID**; `T15-F03/F04` mede regras **com ID fora do índice** e **ID com dois significados**. São **duas populações disjuntas de um mesmo defeito de governança de identidade**, e nenhuma das duas trilhas via a outra:

| Classe | Qtde medida | Trilha | Elo |
|---|---|---|---|
| Regra viva **sem BR-ID** | **≥ 26** | T-14 (`T14-F05`) | elo a **criar** — ato humano |
| Regra viva **com BR-ID versionado fora do catálogo** | **88 fichas** / 456 refs / 18 `rule:` em código | T-15 (`T15-F03`) | elo **existe e não está indexado** |
| BR-ID **com dois significados vivos** | **≥ 1 provado** (`BR-JUR-003`) | T-15 (`T15-F04`) | elo **ambíguo** — pior que ausente |

**Contradiz (num ponto delimitado):** a frase de T-14 `:425` — *"a `APR-2026-019` já o resolveu"* — só é sustentável dentro do espaço de busca dela (o catálogo). Fora dele, a canonização **não resolveu**: deslocou o defeito de *ausência* para *ambiguidade*, conforme §4.2/§4.3 do relatório principal. Registro a delimitação; não a converto em finding novo.

**Convergência de padrão, medida por dois caminhos independentes — vale registro ao consolidador.** T-14 adjudica: *"o catálogo é forte onde o módulo é fechado e cego onde o processo atravessa"*. Minha medição do elo UC, feita sem conhecer a dela, produz o mesmo desenho: os **44 RFs sem UC** concentram-se em processos que atravessam módulos (RFQ, scan mobile, conciliação, contagem cíclica, patrimônio↔manutenção, rastreabilidade), e os **3 domínios sem RF algum** (`accounting`, `budget`, `treasury`) são os de maior travessia. **A fronteira entre módulos é onde a documentação de todos os níveis desaparece simultaneamente** — BR, REQ e UC. Duas trilhas, dois métodos, mesmo padrão: isso é evidência convergente (Regra 20), não coincidência.

---

### NÚMEROS FINAIS DE T-15 (após o fechamento)

| Medida | Valor | Alteração pelo insumo de T-14 |
|---|---|---|
| **Cadeias completas — definição estrita `AUDIT_PROCESS.md §1`** | **0 de 90** | **inalterada e reforçada** (T-14 não produz AC nem TC-ID) |
| **Cadeias completas — definição frouxa do discovery** | **3** (não 7) | **inalterada**; elo BR das 3 agora **verificado**, não presumido |
| **RFs com elo `REQ → BR` versionado** | **0 de 90** | **fechado** — era o objeto de RES-T15-01 |
| RFs com BR **atribuído por auditoria** (não é elo) | 10 de 90 | novo, marcado `ATRIBUÍDO-POR-AUDITORIA` |
| RFs com elo UC INEXISTENTE | 44 de 90 | inalterada |
| Elos com zero instâncias no ERP | 6 (OBJETIVO, PROCESSO, AC, TC, ADR, PERM) | inalterada |
| BRs em estado **INDETERMINADO** na matriz | 15 (`RES-T14-01`) | novo, não contadas em direção alguma |

**Findings de T-15: nenhum criado, nenhum alterado neste adendo.** `T15-F01` a `T15-F10` permanecem `PROPOSED`; `T15-F03` e `T15-F04` ganham evidência nova sem mudar enunciado nem severidade. **Nenhum OWNER decidido, sugerido ou inferido** (G9). Nenhuma declaração de `AUDIT_PASSED`/`RETEST_PASSED`/`FINDING CLOSED`/`REMEDIATION COMPLETE`.

**`RES-T15-01` — FECHADO** nos itens (a), (b) e (c). Permanecem abertos, sem alteração: `RES-T15-02` (reaberto e agravado por c.1), `RES-T15-03`, `RES-T15-04`, `RES-T15-05`, `RES-T15-06`. Escalonamentos ativos: `ESC-T15-01`, `ESC-T15-02`, `ESC-T15-03`, `ESC-T15-04` (registrado como **não endereçado** por T-14) e **`ESC-T15-05`** (novo, acima).

**Arquivos lidos neste adendo (absolutos):**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-14_REGRAS_DE_NEGOCIO.md` (integral, 465 linhas)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\**` (grep dirigido `BR-JUR-003|RF-JUR-003`)

Nenhum arquivo foi criado ou alterado por este agente.
