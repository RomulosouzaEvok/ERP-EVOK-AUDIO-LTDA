# T-15 — REQUISITOS, CASOS DE USO E RASTREABILIDADE · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-traceability-auditor` (T-15 requisitos, UC e rastreabilidade) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:        ERP-LEGACY-001-AUD-001
TRILHA:          T-15 — Requisitos, Casos de Uso e Rastreabilidade (onda W2)
TITULAR:         vericore-traceability-auditor
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f
REGIME:          APR-2026-016 — read-only reforçado. Zero conexão de banco, zero execução,
                 zero escrita em disco (nem em audit/). Este texto é o entregável.
ESTADO:          PARTIAL — fechado em tudo que não depende de T-14; elo BR↔REQ marcado
                 RES-T15-01 (ponto de junção), não antecipado.
MÉTODO:          Read + Grep + Glob sobre a working tree. Ver LIM-01 (sem Bash/git).
```

### COBERTURA EFETIVA (honesta)

| Dimensão | Cobertura | Natureza |
|---|---|---|
| Universo de RF versionado (`DOCUMENTO_DE_REQUISITOS.md`) | **90/90 — 100%** | censo, linha a linha |
| Elos AC e TC de todo o corpus | **100%** | prova negativa exaustiva por grep repo-wide |
| Elos OBJETIVO e PROCESSO | **100%** | prova negativa exaustiva (nenhum `OBJ-`/`PROC-` existe) |
| Elo UC dos 90 RFs | **100%** | citação × existência da seção no SSOT |
| Catálogo UC (`04-USE_CASES.md`) | **100% dos cabeçalhos** | censo de seções |
| Re-medição das "7 cadeias completas" de identidade-acesso | **7/7** | reexame nominal |
| Corpus BR pré-existente `docs/business` | **amostral dirigido** (BR-JUR-003, BR-TI-014 em profundidade; contagem agregada nos 17 arquivos) | não é censo das 88 fichas |
| RFs dos blocos JUR/TI/SST/RH/MKT/FAC (≈254 endpoints) | **não recontados** — só o elo estrutural | fora do universo dos 90 |
| Status individual das BRs | **0% — é T-14** | RES-T15-01 |
| Frontend, banco em execução | **0%** | fora de regime |

---

## 1. Correções de premissa que precedem qualquer número

**C-1 — O `REQUIREMENTS_BASELINE.md` não foi produzido contra o `AUDIT_COMMIT`.** Seu cabeçalho (`:5`) declara `AUDIT_COMMIT: c9359be399c45191fe90e8e9707803125a5ba91d` — a tag `legacy-baseline-001`, **não** `c1311a6f`. O escopo da run registra a diferença (`AUDIT_SCOPE.md:10-11,78-85`) e transfere a verificação de equivalência de código ao inventário, declarando-a feita "por amostragem, não exaustiva". Consequência para esta trilha: **todo veredito do baseline é insumo datado de um commit anterior**, e foi por isso reverificado por mim contra a árvore lida, nunca transcrito.

**C-2 — "89 requisitos" não é um conjunto enumerável.** O placar do baseline (`:18-24`) soma 21+24+38+6 = 89, mas o documento não lista 89 IDs. Pior: o próprio documento se contradiz — §0 declara `INFERRED = 38`, §4 declara *"58 comportamentos em produção que ninguém especificou, todos INFERRED"* (`:202`) e fecha com *"lista completa de 58 no arquivo de trabalho do agente"* (`:230`), arquivo **não versionado**. O critério de pronto "para cada um dos 89 requisitos" é, portanto, **inexecutável como redigido**: a população não é reconstruível a partir de artefato versionado. → `T15-F01`.

**Substituição declarada de universo (não silenciosa):** adotei como universo mensurável o **conjunto versionado de 90 RFs** de `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`, contado por mim (AUT 9 + VEN 9 + COM 12 + EST 8 + PRD 10 + QUA 11 + FIN 9 + PAT 7 + RH 5 + REL 8 + INT 2 = **90**). É o único universo de requisitos do ERP com ID, versionado e íntegro no `AUDIT_COMMIT`.

**C-3 — `USE_CASES_RECOVERED.md` não existe.** O plano (`AUDIT_PLAN.md` §4.3) e meu briefing citam `discovery/USE_CASES_RECOVERED.md`. O glob do diretório retorna **6 arquivos per-cluster** (`USE_CASES_RECOVERED_<cluster>.md`) e **nenhum consolidado**. O item de escopo aponta para artefato inexistente. → `T15-F02` (LOW).

**C-4 — 164 × 165 regras.** Meu briefing diz "165 regras"; o plano diz "164"; o `BR_CATALOG.md` **na working tree** totaliza **165** (§2.1) porque inclui `BR-FIN-003`, criada pela `APR-2026-021` — commit `2a591cf`, **posterior** ao `AUDIT_COMMIT` (`.git/logs/refs/heads/main:137`). A mensagem do commit que criou o catálogo (`4de066c`) diz literalmente "164 regras". **No `AUDIT_COMMIT` o catálogo tem 164 linhas; `BR-FIN-003` está fora do objeto auditado (Regra 14).** → `RES-T15-02`.

---

## 2. Medição dos elos universais — prova antes de contagem

Estes quatro resultados são **provas negativas exaustivas** e sustentam sozinhos o placar de cadeias completas.

| Elo da cadeia `AUDIT_PROCESS.md §1` | Medição | Método (reproduzível) |
|---|---|---|
| **OBJETIVO DE NEGÓCIO** | **INEXISTENTE — 90/90** | Grep `\bOBJ-[A-Z0-9]` em `docs/` → **0**. Não há esquema de ID de objetivo; `CLAUDE.md` Regra 17 sequer o prevê |
| **PROCESSO** | **INEXISTENTE — 90/90** | Grep `\bPROC-[A-Z0-9]` em `docs/` → **0**, apesar de `PROC` ser ID obrigatório pela Regra 17 e usado no `TRACEABILITY_MATRIX_TEMPLATE.md:8` |
| **CRITÉRIO DE ACEITE (AC)** | **INEXISTENTE — 90/90** | Grep `\bAC-[0-9]\|\bAC-[A-Z]{2,}` **repo-wide** → todas as ocorrências são de `product/SIM-001`, `product/SIM-002`, `audit/standards/ID_STANDARDS.md:13` e templates. **Zero AC no ERP.** Confirmação cruzada: grep `Critério de aceite` em `04-USE_CASES.md` → **0** |
| **TESTE como TC-ID** | **INEXISTENTE — 90/90** | Grep `\bTC-[0-9]{2,}` **repo-wide** → **0 ocorrências**. Os únicos `TC-` do repositório são `TC-SIM-*` em `product/SIM-001/tests/booking.test.js` |
| **ARQUITETURA (ADR)** | **INEXISTENTE — 90/90** | Grep `\bADR-[0-9]` em `docs/` → 2 ocorrências, ambas em `docs/control-plane/tasks/EXEMPLO-0001.md` (arquivo de exemplo) |
| **PERMISSÃO (PERM)** | **INEXISTENTE — 90/90** | Grep `\bPERM-[A-Z]` em `docs/` → **0** |

**Consequência lógica, não opinião:** a cadeia do `AUDIT_PROCESS.md` §1 tem 15 elos. Seis deles têm **zero instâncias** no ERP inteiro. Nenhuma cadeia pode ser completa. **O resultado 0 não é uma contagem — é um teorema sobre o corpus.**

---

## 3. PRODUTO CENTRAL (b) — número medido de cadeias completas + método de contagem

### 3.1 Definição estrita (a do `AUDIT_PROCESS.md` §1 — 15 elos)

> **CADEIAS COMPLETAS = 0 de 90. PROVADO.**

**Método de contagem, explícito para ser refutável:** uma cadeia é completa sse **todo** elo da sequência do §1 é instanciado por um artefato versionado identificável por ID. Basta um elo com **zero instâncias no corpus** para que o produto lógico seja 0 para todas as linhas. Foram medidos **seis** elos nessas condições (§2). Logo `completas = 90 × 0 = 0`. A prova é por quantificador universal e dispensa a inspeção linha a linha — **e é falseável por um único contraexemplo**: exibir um requisito do ERP com AC-ID e TC-ID versionados refuta o resultado. Nenhum existe.

### 3.2 Definição frouxa (a do discovery — `BR → REQ → UC → CÓDIGO → TC-como-arquivo`)

O discovery consolidado (`LEGACY_TRACEABILITY_MATRIX.md:39-43`) preservou uma divergência: identidade-acesso contou **7 de 39**, os outros 5 clusters contaram **0**. **Reexaminei nominalmente as 7**, contra a árvore lida:

| BR-ID | REQ do elo (matriz `:68-85`) | Veredito T-15 | Fundamento |
|---|---|---|---|
| BR-IAM-018 | RF-AUT-05 / UC-33 | **SOBREVIVE (com ressalva)** | RF-AUT-05 é `[IMPLEMENTADO]` universal; baseline §2.1 o dá CONFIRMED "para o mecanismo" |
| BR-IAM-023 | RF-AUT-05 / UC-32 | **SOBREVIVE (com ressalva)** | idem |
| BR-IAM-024 | RF-AUT-05 / UC-30-31 | **SOBREVIVE (com ressalva)** | idem |
| BR-IAM-035 | RF-AUT-06 / UC-34 | **DEGRADADO** | o UC de destino é `## UC-34 (parcial)` no próprio SSOT (`04-USE_CASES.md:1618`) — elo UC PARCIAL, não PRESENTE |
| BR-IAM-019 | **RF-AUT-05/07** | **ELO FALSO** | RF-AUT-07 é medido CONFLICTING HIGH/CONFIRMED (`REQUIREMENTS_BASELINE.md:73-77`): `module-authorization-map.test.ts:120-133` exclui 12 módulos. Cadeia que termina em requisito divergente não é cadeia completa |
| BR-IAM-020 | **RF-AUT-05/07** | **ELO FALSO** | idem |
| BR-IAM-025 | **RF-AUT-09** | **ELO FALSO** | RF-AUT-09 é `[PARCIAL]` no próprio documento (`:45`) e CONFLICTING no baseline; **a própria matriz-fonte admite** que `audit-coverage-guard:16-18` "afirma um fato falso hoje" (`:75`). O elo TC é uma guarda que mede no lugar errado |

> **Contagem frouxa re-medida por T-15: 3 sobreviventes (não 7), 1 degradado, 3 elos falsos.** Em todos os 3 sobreviventes o elo BR permanece **pendente de T-14** e o elo AC/TC continua inexistente — são cadeias de 5 elos num modelo de 15.

Isto é escalonamento, não conciliação (Regra 20): **T-15 diverge da trilha `identidade-acesso` do passo 29 e da própria reconciliação do §1 do passo 29**, que preservou "7" como nota frouxa sem testar se os requisitos-âncora eram íntegros. `ESC-T15-01`.

---

## 4. PRODUTO CENTRAL (c) — veredito sobre a causa-raiz nº 1 após a `APR-2026-019`

**Hipótese a testar (do briefing):** parte do elo BR↔REQ quebrado seria artefato de numeração inconsistente, e não ausência real de rastreabilidade.

**Veredito: a hipótese se confirma parcialmente, e o resultado é pior do que ela previa.** Três achados encadeados:

### 4.1 A afirmação de causa-raiz nº 1 está factualmente REFUTADA na sua forma forte

O passo 29 afirma (`LEGACY_TRACEABILITY_MATRIX.md:35`): *"Elo BR-ID canônico: QUEBRADO em ~167/167. **Nenhuma** regra de negócio do ERP tem BR-ID versionado (...) o que existe são rótulos de gap/decisão (`G1..G18`, `D-C/D-G/...`) gravados em `details.rule`"*.

Medição própria no `AUDIT_COMMIT`:

- **88 fichas** `| **BR-<ÁREA>-<NNN>** |` definidas em documentos versionados de `docs/business` (grep `^\| \*\*BR-[A-Z]{2,4}-[0-9]{3}\*\*`: BRIEF_JUR 25, BRIEF_TI 18, BRIEF_FAC 17, BRIEF_MKT 14, BLOCO_5_MKT_VERIFICACAO 14).
- **456 referências** a `BR-(JUR|SST|RH|TI)-[0-9]{3}` em **17 arquivos** versionados de `docs/business`.
- **18 ocorrências** de `rule: 'BR-...'` em **15 use cases** de `server/src` — ou seja, BR-ID canônico **executável**, não rótulo de gap.
- BR-ID citado em **migration** (`20260807-000261...cjs:4` — "UC-52, RF-JUR-002/004/008, BR-JUR-003/004"), em **comentário de coluna do baseline SQL** (`00_baseline_frozen.sql:7442`, `:12843`) e em **teste** (`juridico-contract-use-cases.test.ts:316`).
- **87 referências** a `BR-[A-Z]{2,3}-[0-9]` em **22 arquivos** de `server/tests`.

Existe, portanto, no `AUDIT_COMMIT`, um corpus de regras **com ID versionado, ancorado em requisito (RF-), em caso de uso (UC-), em migration, em código e em teste** — exatamente o elo que o passo 29 declarou inexistente em 167/167 linhas. → `T15-F03` (HIGH): **a causa-raiz nº 1 foi declarada sobre uma varredura que não leu `docs/business`.**

### 4.2 A `APR-2026-019` não reparou o elo — criou um namespace paralelo sobre um namespace ocupado

A APR-2026-019 adotou o formato `BR-<ÁREA>-<NNN>` como canônico "sem renumeração". Esse é **o mesmo formato** do corpus de §4.1, que já ocupava os prefixos JUR, TI, SST, RH, MKT, FAC. O catálogo canônico indexa 164 regras (no AUDIT_COMMIT) e, desses prefixos, registra apenas 22 linhas da série `D<nn>` mais dois numéricos isolados. **As 88 fichas de `docs/business` não entraram no catálogo canônico.**

### 4.3 COLISÃO SEMÂNTICA PROVADA — `BR-JUR-003`, dois lados com arquivo:linha

| Lado | Significado atribuído | Evidência |
|---|---|---|
| **Catálogo canônico (APR-2026-019)** | "Alçada de contrato hard-coded × tabela prometida", status CONFLICTING, âncora `constants.ts:38` (juridico) | `BR_CATALOG.md:292`; ficha de origem em `BUSINESS_RULE_CANDIDATES_pessoas-governanca.md:152` |
| **Corpus versionado pré-existente** | "Aditivo assinado com `new_end_date`/`new_value` atualiza os campos vigentes do contrato; valores anteriores imutáveis" | `docs/business/briefs/BRIEF_JUR_2026-08-06.md:178`; `BLOCO_3_JUR_REQUISITOS.md:55` (vincula RF-JUR-008 → BR-JUR-003); `migrations/20260807-000261...cjs:4` |
| **Código executável** | o significado do **corpus**, não o do catálogo | `CreateContractAddendumUseCase.ts:37` e `:40` — `throw new BusinessRuleError(..., { rule: 'BR-JUR-003' })` para `change_type=value exige new_value` / `change_type=term exige new_end_date` |
| **Teste** | idem corpus | `juridico-contract-use-cases.test.ts:316` — `it('rejeita change_type=value sem new_value (BR-JUR-003)')` |

**Como a colisão nasceu:** o passo 26 leu `server/src/modules/juridico/domain/constants.ts:2`, cujo cabeçalho diz *"**RF**-JUR-003 — alçada de aprovação de contrato por valor"*, e adotou o número como **BR**-JUR-003. **Converteu um ID de requisito em ID de regra**, colidindo com um BR-JUR-003 que já existia, com outro significado, em documento versionado, em migration, em código e em teste.

**Agravante de governança:** o `BR_CATALOG.md:400-405` declara textualmente *"**Nenhuma colisão encontrada**"* — mas define o espaço de busca como *"nenhum BR-ID é definido em mais de um arquivo **BRC**"*, isto é, apenas os 6 arquivos do passo 26. A busca nunca cruzou `docs/business` nem `server/src`. Na mesma linha, `BR_CATALOG.md:430-434` registra como "lacuna de numeração" que os JUR "002, 005–040 não foram localizados" e os TI "001–010, 012–013 não localizados" — **eles estão localizados**, em `BLOCO_3_JUR_REQUISITOS.md` (50 refs), `BLOCO_2_TI_REQUISITOS.md` (57 refs) e nos briefs. → `T15-F04` (HIGH): a declaração "nenhuma colisão" é verdadeira apenas no escopo em que foi medida, e falsa no corpus real; e as "lacunas reservadas" são, na verdade, **IDs já em uso** que o esquema canônico pode atribuir a outra regra a qualquer momento.

**Risco material:** pela regra §2.2 item 2 do próprio catálogo ("novos IDs usam o próximo número livre do prefixo"), um agente futuro pode emitir `BR-JUR-005` para uma regra nova enquanto `BR-JUR-005` já significa outra coisa em `BLOCO_3_JUR_REQUISITOS.md`. **O esquema canônico, como está, produz colisão por construção.**

**Veredito consolidado da causa-raiz nº 1:** não é "ausência de BR-ID" — é **coexistência de dois esquemas de BR-ID no mesmo formato, um deles canonizado sem inventariar o outro**, com pelo menos uma colisão semântica provada e ~88 fichas fora do índice. A `APR-2026-019` **não fechou o elo BR↔REQ; deslocou o defeito de "ausência" para "ambiguidade"**, que é a classe mais perigosa das duas porque é indetectável por contagem.

---

## 5. PRODUTO CENTRAL (a) — os requisitos com o elo quebrado NOMEADO

**Elos quebrados em 90/90, provados em §2, não repetidos nas linhas:** `OBJETIVO` (INEXISTENTE), `PROCESSO` (INEXISTENTE), `CRITÉRIO DE ACEITE` (INEXISTENTE), `TESTE-como-TC-ID` (INEXISTENTE), `ARQUITETURA/ADR` (INEXISTENTE), `SEGURANÇA/PERM` (INEXISTENTE). **Elo `BR` em 90/90: PENDENTE T-14** (`RES-T15-01`) — nenhum dos 90 RFs cita um BR-ID, verificado por leitura integral do documento.

A tabela nomeia o que **varia** por requisito: o elo **UC** e o elo **IMPLEMENTAÇÃO**.

Legenda: `UC-OK` = cita UC existente no SSOT · `UC-INEX` = não cita UC algum · `UC-PARC` = UC existe mas o SSOT o marca "(parcial)" · `IMPL-DIV` = implementação divergente do requisito (fonte citada) · `IMPL-INEX` = requisito sem implementação · `ENUN` = enunciado não verificável.

### 5.1 RF-AUT (9)

| RF | Elo UC | Elo IMPLEMENTAÇÃO | Onde |
|---|---|---|---|
| RF-AUT-01 | UC-OK (UC-01) | íntegro quanto ao enunciado | — |
| RF-AUT-02 | **UC-INEX** | íntegro | referência é `API.md`, não UC |
| RF-AUT-03 | **UC-INEX** | **IMPL-DIV** (contrato de erro) | `API.md:274-275` publica 422 × `ResetPasswordUseCase.ts:51` lança 401 |
| RF-AUT-04 | UC-OK (UC-10) | **IMPL-DIV** | auto-inativação contornável via `UpdateUserUseCase.ts:39-49`; `role` não validado no PUT |
| RF-AUT-05 | UC-OK (UC-30..33,36) | **IMPL-DIV parcial** | `module-authorization-map.test.ts:120-133` exclui 12 módulos |
| RF-AUT-06 | **UC-PARC** (UC-34) | íntegro | `04-USE_CASES.md:1618` — "UC-34 (parcial)" |
| RF-AUT-07 | UC-OK (UC-35, UC-35-Exceção) | **IMPL-DIV (HIGH)** | "403 consistente" universal × 12 módulos fora; 23 endpoints em 3ª via `authorize('admin')` (T-04 `:214`) |
| RF-AUT-08 | UC-OK (UC-37) | **IMPL-DIV** | 4 níveis de negócio × 2 no código; somente-leitura inexprimível |
| RF-AUT-09 | **UC-INEX** | **IMPL-DIV + ENUN** | métrica embutida errada (14×13 módulos, `maintenance` ausente da guarda `audit-coverage-guard.test.ts:49-63`) |

### 5.2 RF-VEN (9)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-VEN-01 | UC-OK (UC-02) | íntegro |
| RF-VEN-02 | UC-OK (UC-04) | **IMPL-DIV** — nenhum RF cobre desconto; `CreateSaleUseCase.ts:143-146` aceita 100% |
| RF-VEN-03 | UC-OK (UC-04, UC-41) | íntegro |
| RF-VEN-04 | **UC-INEX** | íntegro (referência é `CLAUDE.md`) |
| RF-VEN-05 | UC-OK (UC-41) | **IMPL-DIV** — 2ª trava de gestor só em comentário |
| RF-VEN-06 | **UC-INEX** | íntegro |
| RF-VEN-07 | **UC-INEX** | **IMPL-DIV** — tabela de preço não vinculante (`CreateSaleUseCase.ts:113-141`) |
| RF-VEN-08 | UC-OK (UC-27) | íntegro |
| RF-VEN-09 | **UC-PARC** (UC-40) | íntegro |

### 5.3 RF-COM (12)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-COM-01 | UC-OK (UC-23) | íntegro |
| RF-COM-02 | UC-OK (UC-23) | **IMPL-DIV (Regra 20)** — código × `PLANO_ACAO:136-142` e `TODO.md:5271-5274` |
| RF-COM-03 | UC-OK (UC-25) | **IMPL-DIV** — pedido sem RFQ = zero cotações |
| **RF-COM-04** | **UC-INEX** | **IMPL-DIV** — "mín. 3 cotações" × `.min(1)`; **RFQ inteiro sem UC** |
| RF-COM-05 | UC-OK (UC-15) | **IMPL-DIV (vigência)** — doc "desde 2026-08-12" × código 2026-08-11 |
| RF-COM-06 | UC-OK (UC-16) | íntegro |
| RF-COM-07 | UC-OK (UC-17B) | íntegro |
| RF-COM-08 | **UC-INEX** | íntegro |
| RF-COM-09 | UC-OK (UC-22) | parcial |
| RF-COM-10 | **UC-INEX** | íntegro |
| RF-COM-11 | UC-OK (UC-28) | íntegro |
| RF-COM-12 | UC-OK (UC-19) | íntegro com limitações declaradas |

### 5.4 RF-EST (8)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-EST-01 | UC-OK (UC-08, UC-14) | **IMPL-DIV (T-06 CONFIRMED)** — `AUD-INTEG-01` (`reference_type/id` descartados) e `AUD-INTEG-02` (direção `in`/`out` não persistida) |
| RF-EST-02 | **UC-INEX** | íntegro |
| RF-EST-03 | UC-OK (UC-42) | íntegro |
| RF-EST-04 | **UC-INEX** | **IMPL-DIV (T-06)** — rastreabilidade vazia por `AUD-INTEG-01` (`SequelizeTraceabilityRepository.ts:107-108`) |
| RF-EST-05 | UC-OK (UC-17B, UC-37) | **IMPL-DIV (T-06)** — `AUD-INTEG-05`, `BlockLotUseCase` check-then-act sem transação |
| RF-EST-06 | **UC-INEX** | **IMPL-DIV (T-06)** — `AUD-INTEG-04`, `submit` reaprovável = duplo ajuste |
| **RF-EST-07** | **UC-INEX** | **IMPL-DIV CRÍTICO (T-06 `AUD-INTEG-03`)** — scan mobile fura depósito/quarentena/lote; **e o mesmo defeito em `POST /api/products/movements`** (`RegisterProductMovementUseCase.ts:60-67`), que a BR-QE-011 não cobre |
| RF-EST-08 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |

### 5.5 RF-PRD (10)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-PRD-01 | UC-OK (UC-12) | parcial — CRP documentado sem implementação |
| RF-PRD-02 | UC-OK (UC-13) | íntegro |
| RF-PRD-03 | UC-OK (UC-20) | íntegro |
| RF-PRD-04 | UC-OK (UC-24, UC-24b) | **IMPL-DIV** — `estoque_seguranca` e `lote_minimo` na mesma coluna (BR-PP-013) |
| RF-PRD-05 | **UC-INEX** | íntegro |
| RF-PRD-06 | **UC-INEX** | íntegro |
| RF-PRD-07 | **UC-INEX** | íntegro |
| RF-PRD-08 | UC-OK (UC-21) | íntegro |
| RF-PRD-09 | UC-OK (UC-26) | íntegro |
| RF-PRD-10 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |

*(Nota: `UC-71` é citado por `04-USE_CASES.md:2612` como Roteiro de Produção e por `rh.ts:121` como Afastamentos — colisão registrada no passo 29 §4; nenhum dos 90 RFs o cita, logo não contamina esta tabela.)*

### 5.6 RF-QUA (11)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-QUA-01 | UC-OK (UC-17) | íntegro |
| RF-QUA-02 | UC-OK (UC-17) | **IMPL-DIV (HIGH)** — `UpdateNonConformityUseCase.ts:26-36` aceita qualquer status; `effectiveness_result` sem caminho de escrita |
| RF-QUA-03 | UC-OK (UC-17B) | **IMPL-DIV (T-06 `AUD-INTEG-05`)** |
| RF-QUA-04 | UC-OK (UC-LAB-01) | íntegro |
| RF-QUA-05 | UC-OK (UC-LAB-02) | íntegro |
| RF-QUA-06 | **UC-INEX** | não verificado |
| RF-QUA-07 | UC-OK (UC-ENG-01) | íntegro |
| RF-QUA-08 | UC-OK (UC-ENG-02) | íntegro |
| RF-QUA-09 | UC-OK (UC-ENG-03) | íntegro |
| RF-QUA-10 | **UC-PARC** (UC-39) | backend apenas |
| RF-QUA-11 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |

### 5.7 RF-FIN (9)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-FIN-01 | UC-OK (UC-06) | íntegro (G13 provado em teste de integração) |
| RF-FIN-02 | UC-OK (UC-05) | íntegro |
| RF-FIN-03 | **UC-INEX** | íntegro |
| RF-FIN-04 | UC-OK (UC-29) | íntegro |
| RF-FIN-05 | **UC-INEX** | íntegro |
| RF-FIN-06 | **UC-INEX** | íntegro — melhor exemplo do repo (BR-FIN-002) |
| RF-FIN-07 | **UC-INEX** | **IMPL-INEX/DEAD** — `cnab.ts:22-31` tem 8 endpoints; `finance.ts:59` nunca os monta |
| RF-FIN-08 | **UC-INEX** | íntegro |
| RF-FIN-09 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |

**Ausência estrutural nomeada:** `accounting`, `budget` e `treasury` — **nenhum dos 90 RFs os cobre**. Elo REQUISITO **INEXISTENTE** para os três domínios inteiros (baseline §3.4; 58 endpoints, 9 RFs, todos AP/AR/caixa).

### 5.8 RF-PAT (7)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-PAT-01 | **UC-INEX** | íntegro |
| RF-PAT-02 | **UC-INEX** | íntegro |
| RF-PAT-03 | UC-OK (UC-18) | íntegro |
| RF-PAT-04 | **UC-INEX** | íntegro |
| RF-PAT-05 | **UC-INEX** | íntegro |
| RF-PAT-06 | **UC-INEX** | **IMPL-DIV** — OS sem máquina de estados nem faturamento (`UpdateServiceOrderUseCase.ts:11-24`) |
| RF-PAT-07 | **UC-INEX** | íntegro |

### 5.9 RF-RH (5)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-RH-01 | UC-OK (UC-11) | íntegro |
| RF-RH-02 | **UC-INEX** | **IMPL-DIV** — `directorate_id` só por `seeds.ts:175`; `manager_id` não validado, sendo âncora de autorização de BR-TI-D17 |
| RF-RH-03 | **UC-INEX** | íntegro |
| RF-RH-04 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |
| RF-RH-05 | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |

### 5.10 RF-REL (8) e RF-INT (2)

| RF | Elo UC | Elo IMPLEMENTAÇÃO |
|---|---|---|
| RF-REL-01 | UC-OK (UC-07) | íntegro |
| RF-REL-02 | UC-OK (UC-40, parcial) | íntegro |
| RF-REL-03 | **UC-INEX** | não verificado (módulo `reports` sem cobertura no baseline) |
| RF-REL-04 | **UC-INEX** | íntegro após correção de 12/08 |
| RF-REL-04b | **UC-INEX** | **IMPL-INEX** — `[PENDENTE]` |
| RF-REL-05 | **UC-INEX** | **IMPL-DIV (T-06)** — herda `AUD-INTEG-01` |
| RF-REL-06 | **UC-INEX** | validado só por typecheck/bundle |
| RF-REL-07 | **UC-INEX** | íntegro para leitura; imutabilidade só por ausência de rota (FIND-ERP-002) |
| RF-INT-01 | **UC-INEX** | mecanismo apenas |
| RF-INT-02 | **UC-INEX** | mecanismo apenas; "não verificado em uso real" pelo próprio documento |

### 5.11 Placar do elo UC — medido

| Medida | Valor | Método |
|---|---|---|
| RFs que citam ao menos um UC existente | **46 / 90 (51%)** | contagem célula a célula da coluna "Referência" |
| RFs com **elo UC INEXISTENTE** | **44 / 90 (49%)** | complemento |
| RFs cujo UC é declarado "(parcial)" pelo próprio SSOT | **3** | RF-AUT-06 (UC-34), RF-VEN-09/RF-REL-02 (UC-40), RF-QUA-10 (UC-39) |
| RFs com IMPL-DIV ou IMPL-INEX nomeada | **26** | linhas marcadas acima |

---

## 6. O catálogo de UC que se autodeclara SSOT — validado, e a autodeclaração é FALSA

`DOCUMENTO_DE_REQUISITOS.md:227` declara: *"`docs/projeto/04-USE_CASES.md` — **UC-01 a UC-73** — **SSOT** dos casos de uso"*. Censo dos cabeçalhos do arquivo:

- **UC-56 não existe em `04-USE_CASES.md`.** Ele é definido em `docs/business/BLOCO_3_JUR_REQUISITOS.md:470` ("Manter Inventário de Tratamento (RoPA) e Atender Solicitação de Titular — LGPD") e referenciado em `BLOCO_3_JUR_API.md:791` e `BLOCO_3_JUR_MODELO_DADOS.md:362`.
- **UC-54 e UC-55** aparecem em `04-USE_CASES.md` **apenas** na forma desambiguada `UC-54-JUR` / `UC-55-JUR` (`:2421`, `:2451`), enquanto migrations, API e modelo de dados os citam como `UC-54` / `UC-55` puros (`BLOCO_3_JUR_MODELO_DADOS.md:180`, `:302`; `20260806-000136-create-sst-cat.cjs:4` cita `UC-46`).
- **UC-57, UC-63, UC-64, UC-65, UC-66** são citados (`BLOCO_4_FAC_REQUISITOS.md:27,660,679`; `BLOCO_4_FAC_MODELO_DADOS.md:518`) e **não têm seção** no SSOT.
- Colisões `UC-52` / `UC-53` / `UC-71` confirmadas como o passo 29 registrou (`:2216` × `:2387`; `:2313` × `:2406`; `:2612` × `rh.ts:121`), com o próprio catálogo admitindo a dívida em `:2372-2380`.
- **Zero critérios de aceite** no SSOT (grep `Critério de aceite` → 0).

→ `T15-F05` (MEDIUM): **um documento que se declara SSOT e não contém 6+ dos UCs que o restante do corpus versionado referencia não é SSOT** — é um dos dois catálogos de UC do repositório, e o outro (`docs/business/BLOCO_*`) é o que a migration, a API e o teste efetivamente citam. Regra 7 violada: não há fonte única.

**Elo falso de maior consequência, nomeado ponta a ponta (Regra 20 — insumo T-12):**

```
OBJETIVO: INEXISTENTE  →  PROCESSO: INEXISTENTE  →  BR: BR-JUR-D11/D13 (catálogo) — colide com
BR-JUR-041/042 (BLOCO_3_JUR_MODELO_DADOS.md:377,386), reservados e não indexados
→  REQ: RF-JUR-037 (BLOCO_3_JUR_REQUISITOS.md — FORA do índice de 90)
→  UC: UC-56 — AUSENTE do SSOT autodeclarado
→  AC: INEXISTENTE  →  ARQUITETURA: INEXISTENTE
→  IMPLEMENTAÇÃO: EXISTE e é DIVERGENTE — `ResolveDataSubjectRequestUseCase.ts:38-42` fecha
   pedido de exclusão LGPD como `answered` sem ramificar por `request_type` (T-12 `T12-H01`,
   CONFIRMED)
→  TESTE: TC INEXISTENTE  →  AUDIT LOG: DIVERGENTE (T-12 `T12-H04`: CPF verbatim em `newValues`,
   6 GETs sem `logAction`)  →  EVIDÊNCIA: o registro de conformidade prova um atendimento que
   não ocorreu
```

Este é o padrão que esta trilha classifica como **ELO FALSO**: a cadeia declarada "implementada" com implementação provada divergente por outra trilha. **Elo falso não é elo completo.**

---

## 7. Findings propostos

Todos `PROPOSED` (Regra 22). Severidade separada de confiança. CRITICAL/HIGH seguem ao `vericore-finding-validator`.

| ID | Severidade | Confiança | Objeto |
|---|---|---|---|
| **T15-F01** | MEDIUM | CONFIRMED | **A população de "89 requisitos" do `REQUIREMENTS_BASELINE.md` não é enumerável nem internamente consistente**: §0 (`:22`) declara 38 INFERRED, §4 (`:202`) declara 58, e a lista completa remete a "arquivo de trabalho do agente" não versionado (`:230`). Baseline cuja população não é reconstruível não pode fundamentar contagem de cobertura (Regra 7) |
| **T15-F02** | LOW | CONFIRMED | `AUDIT_PLAN.md` §4.3 e o escopo de T-15 citam `discovery/USE_CASES_RECOVERED.md`, **inexistente**; existem 6 arquivos per-cluster. Item de plano apontando para artefato inexistente |
| **T15-F03** | HIGH | CONFIRMED | **A causa-raiz nº 1 do passo 29 está factualmente refutada na forma forte.** `LEGACY_TRACEABILITY_MATRIX.md:35` afirma que nenhuma regra tem BR-ID versionado; medição: 88 fichas `BR-<ÁREA>-<NNN>` em `docs/business`, 456 refs em 17 arquivos, 18 `rule:'BR-...'` em 15 use cases, refs em migrations, no baseline SQL e em 22 arquivos de teste. A varredura que fundou a causa-raiz não leu `docs/business` |
| **T15-F04** | HIGH | CONFIRMED | **Colisão semântica no namespace canônico de BR-ID + declaração "nenhuma colisão" com escopo insuficiente.** `BR-JUR-003` = "alçada por valor" no `BR_CATALOG.md:292` × "aditivo atualiza campos vigentes" em `BRIEF_JUR:178`, `BLOCO_3_JUR_REQUISITOS.md:55`, `migrations/20260807-000261:4`, `CreateContractAddendumUseCase.ts:37,40` e `juridico-contract-use-cases.test.ts:316`. Origem: conversão de **RF**-JUR-003 (`constants.ts:2`) em **BR**-JUR-003. `BR_CATALOG.md:400` declara "nenhuma colisão" tendo buscado só nos 6 BRC; `:430-434` trata como "lacuna reservada" IDs que estão em uso. O esquema, como está, **produz colisão por construção** |
| **T15-F05** | MEDIUM | CONFIRMED | **`04-USE_CASES.md` se autodeclara SSOT (`DOCUMENTO_DE_REQUISITOS.md:227`) sem conter UC-56, UC-57, UC-63..UC-66**, todos referenciados por documentos versionados de `docs/business`; e reusa UC-52/53/71. Não há fonte única de casos de uso (Regra 7) |
| **T15-F06** | HIGH | CONFIRMED | **Seis elos da cadeia obrigatória do `AUDIT_PROCESS.md` §1 têm ZERO instâncias no ERP**: OBJETIVO, PROCESSO, AC, TC, ADR, PERM. `AC-*` e `TC-*` só existem em `product/SIM-001`, `product/SIM-002` e templates. Consequência: **0 cadeias completas, estruturalmente impossíveis**, independente da qualidade do código. Viola a Regra 17 do `CLAUDE.md` para 5 dos 11 tipos de ID obrigatórios |
| **T15-F07** | MEDIUM | CONFIRMED | **Elo UC inexistente em 44 dos 90 RFs (49%)**, incluindo comportamento de alto risco: RFQ (RF-COM-04), scan mobile (RF-EST-07), inventário cíclico (RF-EST-06), conciliação (RF-FIN-06), auditoria de ações sensíveis (RF-AUT-09) |
| **T15-F08** | HIGH | CONFIRMED | **Domínios inteiros sem elo REQUISITO**: `accounting`, `budget`, `treasury` (58 endpoints) e `items`/`categories` (PRODUÇÃO REAL, 327 registros) não têm um único RF entre os 90. Comportamento com efeito patrimonial sem requisito a montante |
| **T15-F09** | MEDIUM | HIGH | **Elos falsos na única contagem positiva de cadeias do discovery**: 3 das 7 "cadeias completas" de identidade-acesso passam por requisitos medidos DIVERGENTES (RF-AUT-07 em 2, RF-AUT-09 em 1) e 1 por UC declarado parcial. Contagem frouxa corrigida: **3, não 7** (§3.2). Confiança HIGH e não CONFIRMED porque o elo BR depende de T-14 |
| **T15-F10** | LOW | CONFIRMED | `REQUIREMENTS_BASELINE.md:5` declara `AUDIT_COMMIT = c9359be…` (tag baseline), **não** `c1311a6f`. Insumo estruturalmente ancorado em commit diverso do objeto auditado; a equivalência de código nunca foi provada exaustivamente (`AUDIT_SCOPE.md:83-85`) |

**Nenhum finding acima é declarado confirmado nem fechado. Nenhum `AUDIT_PASSED`, nenhum `RETEST_PASSED`.**

---

## 8. Resíduos — `RES-T15-nn`

| ID | Resíduo | O que exatamente falta |
|---|---|---|
| **RES-T15-01** | **PONTO DE JUNÇÃO COM T-14 — elo BR↔REQ** | Preciso, de T-14, o **status individual por BR-ID** (CONFIRMADA / DIVERGENTE / NÃO IMPLEMENTADA / NÃO LOCALIZÁVEL) com arquivo:linha. Com ele fecho três coisas e **nada além delas**: (a) para cada um dos 90 RFs, se existe BR que o sustente e se essa BR está confirmada — hoje **0/90 RFs citam BR-ID**, o que faz o elo BR↔REQ **INEXISTENTE por construção do lado REQ**, mas T-14 pode ter encontrado a âncora pelo lado BR; (b) reclassificar as 3 cadeias frouxas sobreviventes (BR-IAM-018/023/024) para PROVADO ou ELO FALSO; (c) verificar se T-14 mediu **164** BRs (AUDIT_COMMIT) e não 165, e se o corpus `docs/business` de §4.1 entrou na varredura dela — **se T-14 auditou apenas o `BR_CATALOG.md`, ela tem o mesmo ponto cego que `T15-F03` documenta**, e isso é escalonamento, não fechamento |
| **RES-T15-02** | 164 × 165 regras | `BR-FIN-003` entrou por `APR-2026-021` (commit `2a591cf`), **posterior** ao `AUDIT_COMMIT`. Fora do objeto (Regra 14). O briefing de T-15 e o de T-14 dizem "165" |
| **RES-T15-03** | 88 fichas BR de `docs/business` não inventariadas | Censo linha a linha das 88 fichas × 164 do catálogo, para dimensionar quantas colisões existem além de `BR-JUR-003`. Fiz amostra dirigida (JUR-003 colide; TI-014 **não** colide — significado idêntico dos dois lados) |
| **RES-T15-04** | RFs dos blocos JUR/TI/SST/RH/MKT/FAC | ≈254 endpoints com RF-IDs próprios (`RF-JUR-*`, `RF-TI-*`, `RF-SST-*`, `RF-RH-0NN`) fora do índice de 90. Não recontados por T-15 — só o elo estrutural foi medido |
| **RES-T15-05** | Junção com trilhas não lidas | Li em substância T-06 e T-12, e parcialmente T-04. **Não li** T-00, T-01, T-02, T-03, T-05, T-07, T-09, T-10, T-11. Requisito marcado "íntegro" nas tabelas §5 pode ser **elo falso** à luz dessas trilhas. O consolidador deve cruzar antes de publicar |
| **RES-T15-06** | OWNER | **Vedado a mim (G9 / APR-2026-019 parte 2).** 100% das 164 linhas do catálogo e 100% dos 90 RFs sem OWNER. **Lacuna reportada, não preenchida, não sugerida** |

---

## 9. Pedidos de evidência dinâmica

| ID | O que verificar | Comando | Por que estático não basta |
|---|---|---|---|
| **DYN-T15-01** | Se `juridico-contract-use-cases.test.ts:316` realmente exercita o `BusinessRuleError` com `rule:'BR-JUR-003'` (prova executável da colisão de §4.3) | `npx vitest run server/tests/unit/juridico-contract-use-cases.test.ts -t "BR-JUR-003"` — **unit puro, sem banco** | O grep prova a citação do ID; só a execução prova que o rótulo `BR-JUR-003` chega ao erro em runtime, fechando a colisão como CONFIRMED-por-execução |
| **DYN-T15-02** | Enumeração completa e ordenada dos BR-IDs distintos em `docs/business` × `BR_CATALOG.md` (fecha RES-T15-03) | `rg -o "BR-[A-Z]{2,4}-[0-9]{3}" docs/business server/src server/tests \| sort -u` — **leitura pura, sem banco** | Grep sem dedupe não produz o conjunto distinto; a contagem de colisões exige diferença de conjuntos |
| **DYN-T15-03** | Que `server/`, `client/`, `mobile/`, `tv/` não mudaram entre `c1311a6f` e a working tree lida (fecha LIM-01) | `git diff --stat c1311a6f76b512fef893f7e60d934179cae3409f -- server client mobile tv` | Só o git prova; a evidência que tenho é indireta (mensagens de commit `docs(coretriad)` em `.git/logs/refs/heads/main:134-146`) |

Banco alvo, quando aplicável: **`erp_evok_audio_test`**. **Nenhuma sondagem toca `erp_evok_audio`.** Nenhuma conexão foi aberta por este agente.

---

## 10. Escalonamentos (Regra 20 — divergência não se concilia em silêncio)

- **`ESC-T15-01`** — T-15 **diverge do passo 29** (`LEGACY_TRACEABILITY_MATRIX.md:35`) sobre a existência de BR-ID versionado no ERP. Evidência de T-15 em §4.1. Resolve-se por evidência, não por autoridade do documento mais recente.
- **`ESC-T15-02`** — T-15 **diverge da trilha `identidade-acesso` do passo 29** (`:125`) e da reconciliação do §1: a contagem frouxa correta é **3**, não 7 (§3.2).
- **`ESC-T15-03`** — T-15 **contradiz o `BR_CATALOG.md:400`** ("nenhuma colisão encontrada"). O catálogo é artefato aprovado por `APR-2026-019`; a contradição toca decisão humana registrada e **exige o dono**, não um agente. Encaminho ao director.
- **`ESC-T15-04`** — Se T-14 auditar as 164 BRs **apenas** contra o `BR_CATALOG.md`, herdará o ponto cego de `T15-F03`. Alerta emitido **antes** do fechamento dela.

---

## 11. Limitações declaradas

- **`LIM-01` (IN-08 não cumprível por este agente):** não disponho de Bash. Não executei `git log` nem `git show`. Li a working tree e os internos de `.git` por `Read`. A ponta real do reflog (`.git/logs/refs/heads/main:146`) é `8711a216…`, **13 commits à frente** do `AUDIT_COMMIT`; as 13 mensagens são todas `docs(coretriad)`. **Nenhuma atribuição de origem de código a commit é feita neste relatório.** Onde cito código, cito arquivo:linha da árvore lida, com esta ressalva. → `DYN-T15-03`.
- **`LIM-02`:** o `BR_CATALOG.md` que li é a versão da working tree (165 regras); no `AUDIT_COMMIT` tem 164. Nenhum número desta trilha depende dessa diferença, exceto o registrado em `RES-T15-02`.
- **`LIM-03`:** não reabri nem reafirmei `FIND-ERP-001/002/005-009`.
- **`LIM-04`:** não detecto auditor que não reportou — cobertura de reporte é do director.

---

## 12. Arquivos lidos (caminhos absolutos)

**Normativos e de governança**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\framework\AUDIT_PROCESS.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\00-scope\AUDIT_SCOPE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\02-plan\AUDIT_PLAN.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\templates\TRACEABILITY_MATRIX_TEMPLATE.md`, `audit\standards\ID_STANDARDS.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\.git\logs\refs\heads\main`

**Objeto auditado / insumo de discovery**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\arquitetura\DOCUMENTO_DE_REQUISITOS.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\projeto\04-USE_CASES.md` (censo de cabeçalhos + seções JUR/FAC)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\REQUIREMENTS_BASELINE.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\LEGACY_TRACEABILITY_MATRIX.md` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\LEGACY_TRACEABILITY_MATRIX_identidade-acesso.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\BUSINESS_RULE_CANDIDATES_pessoas-governanca.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\BR_CATALOG.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\business\` — `BLOCO_3_JUR_REQUISITOS.md`, `BLOCO_3_JUR_API.md`, `BLOCO_3_JUR_MODELO_DADOS.md`, `BLOCO_2_TI_*`, `BLOCO_4_FAC_REQUISITOS.md`, `briefs\BRIEF_JUR_2026-08-06.md`, `briefs\BRIEF_TI_2026-08-06.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\domain\constants.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\application\use-cases\contract\CreateContractAddendumUseCase.ts` (via grep, `:37`, `:40`)

**Insumo de trilhas irmãs**
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-06_ESTOQUE_IDEMPOTENCIA.md` (§§6-8 integrais)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-12_PESSOAS_COMPLIANCE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-04_TRANSVERSAL_AUTHZ.md` (parcial)

---

## 13. Estado de conclusão

**T-15 fecha 100% do que não depende de T-14.** Os dois produtos quantitativos estão medidos com prova: **0 cadeias completas de 90 sob a definição do `AUDIT_PROCESS.md` §1** (por seis elos com zero instâncias no corpus, §2), e **3 — não 7 — sob a definição frouxa do discovery** (§3.2). O elo quebrado está nomeado para os 90 requisitos (§5). O veredito sobre a causa-raiz nº 1 pós-`APR-2026-019` está fechado e **contraria o discovery em dois pontos verificáveis** (§4).

**Não fechado, por dependência declarada e não antecipada:** `RES-T15-01` — o elo BR↔REQ, que só se resolve com o status individual das BRs de T-14. Envie o relatório de T-14 e eu fecho os três itens (a), (b) e (c) de `RES-T15-01`, sem tocar em nada além deles.

Nenhum arquivo foi criado ou alterado por este agente.
