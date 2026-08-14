# T-12 — PESSOAS E COMPLIANCE · RELATÓRIO DE TRILHA

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`.
Regime `APR-2026-016` respeitado: nenhuma conexão de banco, nenhuma execução.
Nenhum arquivo do objeto auditado foi tocado (Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-requirements-auditor` (T-12 pessoas e compliance) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-12 — rh (57) + sst (75) + LGPD (17)
TITULAR:       vericore-requirements-auditor
AUTORIDADE:    APR-2026-023 Parte C · EMENDA-02 C-03…C-06 (D3/D4 → E)
REGIME:        APR-2026-016 — read-only, zero conexão de banco, zero dado pessoal real inspecionado
ESTADO:        **PARTIAL — E alcançado em D1/D2-borda; D3/D4 NÃO alcançaram E em 132 endpoints** (§7)
```

---

## 1. Correção de escopo que precede tudo: **a EMENDA-02 dá 11 S a T-12, não 6**

`AUDIT_PLAN_EMENDA_02.md:358` — linha T-12: `Base 5 | Delta **+6** | Novo **11**`.

A tarefa me instruiu a medir contra "6 S após a EMENDA-02". **6 é o delta, não o total.** Como a minha medição é declaradamente o insumo de calibração das ondas seguintes, registro a divergência antes de reportar número (Regra 21): comparar meu esforço real contra 6 produziria um desvio artificialmente favorável de quase o dobro. Meço contra **11 S** em §8.

---

## 2. Findings — por severidade

Todos `PROPOSED`. Nenhum confirmado, nenhum fechado (Regra 22 — mérito é de T-25).

### HIGH

#### `T12-H01` — Resolver pedido de titular LGPD é atestação pura: nenhum dos 8 tipos produz efeito
`ResolveDataSubjectRequestUseCase.ts:38-42` grava `status:'answered' + resolution_notes + answered_at` **sem qualquer ramificação por `request_type`**. Os 8 tipos aceitos (`CreateDataSubjectRequestUseCase.ts:21-23`) incluem `deletion`, `anonymization`, `correction`, `portability`, `consent_revocation` — nenhum executa apagamento, anonimização, correção ou exportação. Não há chamada a repositório de dado pessoal, a serviço de anonimização, nem a export.

Efeito: um pedido de exclusão (LGPD art. 18, VI) é encerrado como **atendido** com o dado íntegro no banco. O registro de conformidade passa a ser prova documental de um atendimento que não ocorreu — pior do que a ausência do módulo.
**Agrava `FIND-ERP-006`** com evidência própria. **Confiança: CONFIRMED** (estático, sem ambiguidade).
Requisito de origem: `RF-JUR-037` — `REQUISITO IMPLEMENTADO COMO REGISTRO, NÃO COMO EFEITO`.

#### `T12-H02` — Fila eSocial SST é **write-only**: S-2210/S-2220 nunca saem de `pendente` (NOVO)
Varredura de `server/src` inteiro por escrita de `'enviado'|'aceito'|'rejeitado'`: **zero ocorrências fora das declarações de ENUM** (`SstEventoEsocial.ts:19,43`; `SstCat.ts:17,42`; `SstAso.ts:19,50`). Nenhum transmissor, nenhum endpoint de confirmação manual em `sst.ts` (contraste: `rh` tem 3 rotas `esocial-confirmation`).

Três consequências encadeadas:
1. `RF-SST-042` (P0) — "geração automática de pendência S-2210" é cumprido; `RF-SST-043` (P0) — "fila com status pendente/enviado/aceito/rejeitado **com recibo**" (`BLOCO_1_SST_REQUISITOS.md:115`) é **impossível de cumprir**: os 3 estados terminais não têm produtor.
2. `POST /esocial-events/:id/resend` (`sst.ts:84`) exige `evento.status === 'rejeitado'` (`ResendEsocialEventUseCase.ts:32-34`) — precondição que o sistema **nunca consegue produzir**. Endpoint inalcançável na prática.
3. `sst_cats.recibo_esocial`, `.numero_cat`, `.data_envio_esocial` e `prazo_legal`/`prazo_limite` são colunas mortas. `idx_sst_cats_prazo_limite` indexa um prazo que ninguém consulta.

Combinado com a ausência total de agendador (§3), a obrigação legal de comunicação de acidente **não tem mecanismo algum** — apenas contabilidade interna de que ela existe.
**Confiança: CONFIRMED.**

#### `T12-H03` — CAT: tipo × gravidade sem checagem, gravado em linha **imutável**, sem UNIQUE, e a suíte aprova (reexame de `FIND-ERP-008`)
Reconfirmo a âncora e acrescento **quatro fatos materiais novos**:

- **A âncora:** `EmitCatUseCase.ts:60` — `const tipo = body.tipo === 'obito' ? 'obito' : 'inicial';` — `acidente.gravidade` é lido na linha seguinte (`:61`) só para o prazo. Nenhuma checagem cruzada nas duas direções.
- **Novo 1 — a UI é o único caminho e ele é o errado:** `client/src/api/sst.ts:391` envia `{ tipo: 'inicial', emitente }` literal. Um acidente com `gravidade:'obito'` emitido pela interface gera CAT `tipo='inicial'` com `prazo_limite` do mesmo dia — registro internamente contraditório: o prazo diz óbito, o tipo diz inicial.
- **Novo 2 — a suíte congela a combinação proibida como sucesso:** `tests/unit/sst-accident.test.ts:195-202` — acidente `gravidade:'obito'`, corpo `{tipo:'inicial'}`, e a asserção é sobre `prazo_limite`, não sobre rejeição. O teste **prova** que a combinação passa.
- **Novo 3 — o erro é irreversível:** `00_baseline_frozen.sql:22233` instala `trg_sst_lock_cat`, e a função (`:2947,:2962`) proíbe `DELETE` e proíbe `UPDATE` de qualquer coluna que não seja status eSocial. **A CAT com tipo errado não pode ser corrigida nem apagada** — só se emite outra, e a errada permanece.
- **Novo 4 — a guarda de duplicidade não tem lastro:** `EmitCatUseCase.ts:54` chama `findCatsByAccidentId(acidente.id)` **sem passar a transação `t`** (contraste com `:51`, que passa). Não há `UNIQUE(acidente_id, tipo)` em `sst_cats` (`:18071-18075` só PK; `:21222-21239` três índices não-únicos). Duas emissões concorrentes produzem duas CATs `inicial` imutáveis. Contraste interno que prova que a equipe sabia fazer: `uq_sst_eventos_esocial_origem_ativo` existe para os eventos.

**Confiança: CONFIRMED.** Severidade mantida HIGH; a imutabilidade é argumento novo para não rebaixar.

#### `T12-H04` — Dado pessoal de titular LGPD gravado verbatim no audit log, e leitura em massa não auditada
Duas metades:
- **Escrita** (reconfirmo `AUD-DB-08`/T-03 pelo lado LGPD): `lgpdController.ts:63,120,191` passam a **entidade inteira** como `newValues` — em `:120` a entidade é o próprio `JurLgpdDataSubjectRequest`, que carrega `requester_name`, `requester_document` (CPF) e `requester_email` (`CreateDataSubjectRequestUseCase.ts:45-47`). O pedido de exercício de direito vira dado pessoal replicado, sem mascaramento e sem retenção.
  Contraste que descaracteriza "estilo da casa": `absenceController.ts:81` monta `newValues` **campo a campo e omite o `cid`** deliberadamente. O padrão correto existe no mesmo repositório; o controller LGPD é o desvio.
- **Leitura:** nenhum dos 6 `GET` de LGPD (`lgpdController.ts:43,52,89,98,106,167,176`) chama `logAction`. `GET /lgpd/data-subject-requests` devolve lista paginada com CPF de titulares e **não deixa rastro de quem leu**. Contraste no mesmo escopo: `accidentController.ts:39` registra `read` de acidente por ser dado sensível (RNF-SST-05).

**Confiança: CONFIRMED.**

---

### MEDIUM

#### `T12-M01` — 409 × 422: **item 3 do `FIND-ERP-007` resolvido** (ver §4, tratamento próprio)

#### `T12-M02` — Retenção LGPD: campo declarativo sem parser, sem consumidor e sem agendador
`retention_period` é `VARCHAR(150)` livre (`00_baseline_frozen.sql:9039`; `JurLgpdProcessingActivity.ts:48`). Varredura de todo `server/` por `retention_period|retentionPeriod`: **7 ocorrências, todas de definição, gravação ou eco** (`CreateProcessingActivityUseCase.ts:57`, `UpdateProcessingActivityUseCase.ts:39`). **Zero leitores com efeito.**

Somado a: varredura de `server/src` por `node-cron|setInterval|cron.schedule|agenda|bull|node-schedule` → **nenhum agendador existe** (as 5 ocorrências são a palavra "agenda"/"agendado" em prosa e em `facilities/trips`). O próprio código admite: `OpenVacationAccrualPeriodUseCase.ts:8` — *"mecanismo de agendamento NÃO implementado"*; `CloseWorkPermitUseCase.ts:2-3` — *"a expiração automática pelo `fim_validade` é um job"*, **job que não existe**.

Confirma o eixo "retenção sem enforcement" de `FIND-ERP-006` com prova negativa exaustiva sobre a superfície.

#### `T12-M03` — Incidente LGPD: decisão de comunicar à ANPD não gera prazo, nem notificação, nem coluna de fato
`CreateIncidentUseCase.ts:43-53` não calcula prazo algum — contraste direto com `EmitCatUseCase.ts:61`, que calcula prazo legal para a CAT no mesmo repositório. `jur_lgpd_incidents` (`00_baseline_frozen.sql:8965-8983`) **não tem** coluna de prazo ANPD, `anpd_notified_at` nem `subjects_notified_at`. `DecideIncidentUseCase.ts:59-63` grava `communication_decision` + justificativa concatenada e devolve o incidente a `status:'investigating'`. O CHECK `ck_jur_lgpd_incidents_closed_requires_decision` só exige que **a decisão exista** para fechar — nunca que a comunicação tenha ocorrido.

Resultado: "comunicar à ANPD" é, em todo o sistema, uma string. Confirma o eixo "incidente sem prazo ANPD" de `FIND-ERP-006`.

#### `T12-M04` — DPO é o próprio requisitante por default, sem cadastro e sem validação
`lgpdController.ts:118` — `dpoUserId: req.body?.dpo_user_id ?? req.user.id`; `:189` idem para incidente; `CreateIncidentUseCase.ts:51` — `input.dpoUserId ?? input.createdBy`. A coluna `dpo_user_id` é `NOT NULL` (`:8977`) e o código a satisfaz preenchendo com quem abriu o registro. Não há papel, módulo, flag ou tabela de Encarregado; **qualquer `juridico:operate` pode nomear qualquer `user_id` como DPO via body**, sem verificação de existência ou elegibilidade.

O próprio código documenta a lacuna (`CreateDataSubjectRequestUseCase.ts:6-11`: *"o contrato de API não expõe cadastro formal de quem é o DPO — pendência explícita"*). É **requisito ausente com contorno gravado como dado**, não defeito de implementação. Confirma o eixo "DPO sem cadastro" de `FIND-ERP-006`.

#### `T12-M05` — Prazo de 15 dias aplicado uniformemente aos 8 tipos de pedido
`CreateDataSubjectRequestUseCase.ts:39-41` — `due_date = received_at + 15` para todos. O art. 19, I da LGPD prevê resposta **em formato simplificado, imediatamente** para confirmação de existência; o inciso II é que traz os 15 dias para a declaração completa. Aplicar 15 dias a `confirmation` afrouxa o prazo legal; aplicá-lo a `deletion` inventa um prazo que a lei não fixa naquele termo.
`BR-JUR-D11` está no `BR_CATALOG.md:297` como **DISCOVERED**, sem adjudicação. Aqui vira **requisito com base legal parcialmente citada e generalizada além da fonte** — defeito de qualidade de requisito, não só de código.

#### `T12-M06` — LGPD: atender é `operate`, negar é `approve` (assimetria de alçada invertida)
`juridico.ts:83` instala `router.use(authorizeModule('juridico','operate'))`. A partir dali: `:163` criar pedido, `:164` verificar identidade e **`:165` resolver** correm em `operate`; **`:166` rejeitar** e `:172/:173` decidir/fechar incidente exigem `approve`.

Consequência de processo: o ato de maior efeito jurídico — declarar atendido um pedido de exclusão, que em T12-H01 **não apaga nada** — é o de menor alçada. Recusar exige gestor; "atender" sem atender, não. Corrobora `BR-JUR-D13` (`BR_CATALOG.md:299`) e o adjudico como **defeito de desenho de alçada**, não de rotulagem.

#### `T12-M07` — Permissão de Trabalho (NR-33/NR-35): não expira, e o encerramento não tem autor
- **Não expira:** `ListWorkPermitsUseCase.ts:19-25` é paginação pura, sem verificação ativa de `fim_validade` — e não há job (§T12-M02). Contraste no mesmo repositório: contrato de experiência **tem** verificação ativa na leitura (`employeeContractController.ts:41-44`, `applyAutoExpireIfNeeded`). A PT vencida permanece `emitida` indefinidamente; a lista de PTs válidas é falsa por construção.
- **Sem autor:** `CloseWorkPermitUseCase.ts:29-35` grava só `status='encerrada'` — sem `closed_by`, `closed_at` ou motivo. `sst.ts:127` monta a rota em **`operate`** (é o C7 do censo de T-04). Encerramento de PT de espaço confinado/altura é ato aprovatório sem nível e **sem atribuição de responsável**.

#### `T12-M08` — Módulo `sst` (75 endpoints) não tem uma única camada de validação de esquema
Glob de `sst/presentation/**`: 9 controllers + 1 router. **Nenhum arquivo de validador; nenhum `zod` no módulo.** Os controllers repassam `req.body` cru (`accidentController.ts:47,55,71,95`) e a validação vive artesanalmente dentro de use cases, com enums duplicados localmente (`CreateAccidentUseCase.ts:21-22`).

Comparação estrutural no mesmo escopo: `rh` tem 5 arquivos de validador Zod `.strict()` com enums centralizados (`rhEnums.ts`). O contraste demonstra que a ausência em `sst` é lacuna, não escolha arquitetural: os dois módulos são do mesmo tier, da mesma onda e do mesmo dono.
Efeito direto sobre D2 e sobre a EMENDA-02: `sst` é o módulo com maior superfície de escrita sem `.strict()` — mass assignment via `fromAccidentInput(body)` (`CreateAccidentUseCase.ts:49`) não é barrada por allow-list na borda.

#### `T12-M09` — `BR_CATALOG.md` cataloga 17 regras para 149 endpoints de escopo regulado
`BR_CATALOG.md:71-73` — RH **6**, JUR **8**, SST **3**. Validei contra o código (não copiei): as 17 existem e as âncoras conferem, mas **nenhuma das seguintes regras implementadas tem BR-ID**:
`terminationRules.ts:33,55,87` (CLT 477 §6º e Lei 12.506/2011 — 3 regras legais, zero BR); `asoGate.ts`/gate de ASO admissional e demissional (`ConcludeAdmissionProcessUseCase.ts:119-127`, `ConcludeTerminationProcessUseCase.ts:71-74`); checklist de ativos (`:63-69`); `vacationRules.ts`; estabilidade CIPA; matriz de EPI/NR-6; `requireSstOrRh`; prazo de 15 dias LGPD com efeito (só existe como DISCOVERED).
`BR-SST-D16` sequer tem linha de origem (`BR_CATALOG.md:301`: *"sem linha na fonte"*), o que viola o padrão de citação da própria matriz.

---

### LOW

| ID | Achado | Arquivo:linha |
|---|---|---|
| `T12-L01` | `termination_reason` validado (`max 1000`) e **descartado**: nunca repassado a `CreateTerminationProcessUseCase`, e `hr_termination_processes` **não tem coluna de destino** (só `cancel_reason`, que é de cancelamento) | `employeeContractValidators.ts:27` × `DecideEmployeeContractUseCase.ts:100-107` × `00_baseline_frozen.sql:6296-6318` |
| `T12-L02` | `emitente` (nome do técnico) aceito no corpo da CAT e **nunca usado** — segundo campo-fantasma do escopo; a UI o envia (`sst.ts:391`) | `EmitCatUseCase.ts:31` (declarado no input, ausente de `:63-70`) |
| `T12-L03` | `requireSstOrRh` **não audita a negativa 403** — `authorizeModule` audita toda negação (`auth.ts:232-241`); as 3 rotas de exceção (`sst.ts:62,98,115`) negam em silêncio. O teste que cobre o middleware verifica o 403 mas não a auditoria | `sst.ts:145-153` × `tests/unit/sst-rbac.test.ts:57-66` |
| `T12-L04` | Docstring de `rhSensitiveFields.ts` afirma "não há, ainda, nenhum use case que chame estas funções" — **falso no `AUDIT_COMMIT`**: `absenceController.ts:55,65,84,101,116` chama `sanitizeAbsence` nas 5 rotas. Drift doc×código num arquivo de controle de dado de saúde | `rhSensitiveFields.ts:30-36` |
| `T12-L05` | `legalDeadlineService.ts` ignora feriados nacionais no prazo legal da CAT (só fins de semana) — simplificação **declarada** no cabeçalho, mas o prazo resultante pode ser anterior ao legal | `legalDeadlineService.ts:6-12,37-39` |

---

### Conformidades registradas (para que não se leia o relatório como uniformemente negativo)

- Os **57 endpoints de `rh`** estão integralmente atrás de `router.use(authenticate)` (`rh.ts:58`) + `authorizeModule('rh',…)` — zero rota sem autorização de módulo. Idem os **75 de `sst`** (`sst.ts:35`), salvo as 3 exceções declaradas.
- Segregação de campo de saúde (`cid`) por **interseção AND** de módulos, aplicada nas 5 rotas de afastamento, com omissão de campo em vez de 403 de rota — desenho correto e efetivamente ligado.
- `logAction` de afastamento monta `newValues` campo a campo, **excluindo `cid`** (`absenceController.ts:81`).
- `ConcludeAdmissionProcessUseCase` e `ConcludeTerminationProcessUseCase` são genuinamente transacionais, com gates de ASO e de devolução de ativos antes da escrita, e `concluded_by`/`concluded_at` gravados.
- `hr_employee_contracts`, `sst_acidentes` e `sst_cats` têm travas de imutabilidade **no banco** (triggers), não só na aplicação.
- `calculateCompletedYearsOfService` corrige um bug real de subestimação de aviso prévio, documentado com o cálculo (`terminationRules.ts:65-81`).

---

## 3. O que a minha leitura acrescenta ao **item 3 do `FIND-ERP-007` (409 × 422)**

**Determinação independente: o item 3 está RESOLVIDO por evidência estática. Há divergência real entre código e contrato, e ela é demonstrável sem execução.**

A cadeia, em quatro elos verificáveis:

1. **O contrato exige 422.** `docs/business/BLOCO_6_RH_API.md:542`, tabela de erros de `PATCH /employee-contracts/:id/decision`:
   > `| 422 | BUSINESS_RULE_VIOLATION | Contrato não está em ativo/prorrogado; decision='rescindir' mas já existe TerminationProcess aberto para o funcionário |`
2. **O código produz 409.** `DecideEmployeeContractUseCase.ts:100-107` delega a `CreateTerminationProcessUseCase`, que em `:62-65` lança `ConflictError`, mapeado para **409 `CONFLICT`** em `errors/index.ts:53-55`.
3. **Não é erro de digitação do documento.** O **mesmo** documento declara **409** para a **mesma condição** no endpoint irmão `POST /termination-processes` (`BLOCO_6_RH_API.md:594`). Ou seja: o contrato atribui **dois códigos diferentes à mesma regra de negócio**, conforme a porta de entrada — e o código implementa só um caminho, o de 409.
4. **Nenhum teste arbitra.** `tests/unit/rh-contract-use-cases.test.ts:101` **mocka** `CreateTerminationProcessUseCase`, de modo que o ramo de conflito nunca é exercitado pela via da decisão. Não localizei asserção de 409 nem de 422 para este endpoint em `server/tests/` (varredura completa da árvore, não da pasta do módulo). O comportamento **não está congelado** — ao contrário do `notice_modality`, que está (§ abaixo).

**Adjudicação de requisito (minha competência):** a natureza do defeito **não é o status code**. É que a mesma regra de negócio — "um funcionário não pode ter dois processos de demissão abertos" — **não tem BR-ID, não tem enunciado único e está declarada duas vezes com semânticas HTTP incompatíveis**. Corrigir só o código para 422 satisfaria a linha 542 e criaria divergência com a 594; corrigir só o documento validaria a assimetria. O item 3 é, na origem, **um requisito ambíguo, não um bug de mapeamento** — e por isso é finding de qualidade de requisito, `MEDIUM` (`T12-M01`), com o defeito de implementação (§542 violada) como sintoma.

**Registro procedimental:** esta é a determinação independente exigida pela `APR-2026-020` Decisão B item 3. **Não substitui** o retorno ao autor de origem, que corre em paralelo. As duas conclusões vão a T-25 para confronto (Regra 20). Eu **não** movo o `FIND-ERP-007` de `NEEDS_MORE_EVIDENCE` — isso é ato de T-25.

**Nota lateral sobre o item 2 (aviso prévio congelado):** confirmo com linha própria. `tests/unit/rh-contract-use-cases.test.ts:107-109` assere `notice_modality: 'trabalhado'` como esperado, congelando o hard-code de `DecideEmployeeContractUseCase.ts:104`. O item 2 **está** congelado por teste; o item 3 **não está** — assimetria relevante para quem for remediar.

---

## 4. Adjudicação dos insumos dirigidos de T-04

| Insumo | Veredito de T-12 (ótica de requisito/processo) |
|---|---|
| `rh.ts:67-69` — nível derivado de `req.body.decision` antes do Zod (`AUD-SEC-T04-04`, LOW) | **Concordo com LOW quanto a exploração; discordo do enquadramento.** Não é fragilidade de segurança residual: é **acoplamento invertido de processo**. O nível de alçada de um ato passou a depender de um campo que o próprio ator escolhe. Hoje `z.enum` fecha (`employeeContractValidators.ts:25`) — mas o fechamento é **acidental**: está num arquivo de validador de apresentação, não no middleware, e a checagem de nível roda **antes** dele. Basta uma quarta decisão futura ou um relaxamento do enum para reabrir. Adiciono ao registro que **o comentário do código admite o desenho** (`rh.ts:60-66`) — é intencional e documentado, o que o torna matéria de **decisão de requisito a rever**, não de defeito a corrigir em silêncio. Mantenho LOW, **CONFIRMED**, com nota de fragilidade estrutural. |
| `sst.ts:145-153` — 4º mecanismo authZ não declarado (`AUD-SEC-T04-05`, LOW) | **Confirmo, e acrescento consequência material que T-04 não nomeou:** o mecanismo **não audita a negativa 403** (`T12-L03`). O `CURRENT_ARCHITECTURE.md` declara 3 mecanismos; existem 4, e o quarto é o único que perde rastro de negação. |
| `sst.ts:127` — `work-permits/:id/close` em `operate` (C7 do censo) | **Confirmo e elevo o enquadramento para MEDIUM** (`T12-M07`), por dois fatos que o censo de authZ não podia ver: o encerramento **não registra autor** e as PTs **nunca expiram** por ausência do job que o próprio código pressupõe. O problema de nível de alçada é o menor dos três. |
| `rhSensitiveFields.ts:63-64` fora da borda HTTP (T-02) | **Confirmo, e refuto a leitura de que seja defeito.** É desenho deliberado e correto (omissão de campo em vez de 403 de rota, `UC-71 E2`), efetivamente ligado nas 5 rotas. O defeito real ali é o **docstring falso** (`T12-L04`). |
| Dado pessoal verbatim em `new_values` (T-03/AUD-DB-08) | **Reconfirmo pelo lado LGPD** (`T12-H04`) e acrescento a metade que faltava: **as leituras de LGPD não são auditadas de forma alguma**, enquanto acidente de trabalho é. |
| `rh.ts:79` classificado em C9 como "desembolso/baixa sem nível gestor" | **Divergência de rotulagem registrada** (Regra 20, não conciliada em silêncio): `rh.ts:79` é `POST /admission-processes/:id/conclude` — não é desembolso. É, contudo, ato de alto impacto em `operate`: cria `employees`, contrato, histórico e período aquisitivo numa transação. O enquadramento em C9 está errado; a inclusão na Classe C está certa, por outro motivo. |

---

## 5. Cobertura efetiva — declarada por dimensão, sem arredondar para cima

| Superfície | D1 authN/authZ | D2 validação | D3 regra de negócio | D4 integridade | D5 dados |
|---|---|---|---|---|---|
| `rh` — 57 end. | **E 57/57** (router lido integralmente, nível por rota) | **E na borda** (5 validadores Zod localizados; 1 lido linha a linha) | **A ~14/57** — clusters âncora: contrato, demissão, admissão, afastamento | **A** — transações de admissão/demissão lidas integralmente | **A** — `hr_termination_processes` lida no baseline |
| `sst` — 75 end. | **E 75/75** + adjudicação do 4º mecanismo | **E por negativa exaustiva** (zero validadores no módulo — fato, não amostra) | **A ~10/75** — CAT/acidente, PT, eSocial | **A** — `EmitCat` linha a linha | **A** — `sst_cats` lida no baseline (PK, índices, triggers, FKs) |
| LGPD — 17 end. | **E 17/17** (`juridico.ts:153-173` + gate `:83`) | **E** (controller lido integralmente) | **E ~5/17 + A no resto** — os 5 use cases decisivos lidos integralmente | **A** | **E** para `jur_lgpd_incidents`, `retention_period` |

**Declaração honesta contra a EMENDA-02:** as células **C-03 a C-06 exigem `E` em D3 e D4 sobre 132 endpoints** de `rh`+`sst`. **Eu não atingi isso.** Atingi `E` em D1 sobre 149 endpoints, `E` por negativa exaustiva em D2 de `sst`, e profundidade `E` nos clusters-âncora. O complemento — ~108 endpoints de `rh`/`sst` sem leitura de use case linha a linha — é **cobertura ampliada, não exaustiva**, e entra como **risco residual nominal**, na forma que a condição (b) de G3 exige:

> **RES-T12-01** — 108 dos 132 endpoints de `rh`/`sst` tiveram D3/D4 por leitura de rota, contrato de API e testes, **não** por leitura integral do use case. Dano possível: regra de negócio trabalhista ou de SST divergente da lei, ou escrita não transacional, **não seria detectada** nesses 108. Assume o risco: o dono, por G3. Custo para fechar: **3 a 4 sessões** (§8).

**T-12 encerra em `PARTIAL — COVERAGE GAP DECLARED`**, não em "concluída com ressalva". Declarar E aqui seria exatamente a promessa vazia que derrubou o `AUDIT_PASSED` do SIM-002.

**Método aplicado conforme instrução:** varri `server/tests/` **inteiro** (250 arquivos), não a pasta do módulo — foi assim que localizei as 10 suítes `sst-*`, a suíte que aprova a combinação CAT proibida, e a ausência de qualquer suíte de use case LGPD (existe apenas `juridico-lgpd-alert-use-cases.test.ts`, de alerta, não dos 17 endpoints). `BR_CATALOG.md` foi **validado contra o código**, não copiado — as 17 regras conferem; o achado é o que falta (`T12-M09`).

---

## 6. DYN — declaração

**DYN executada: NENHUMA. Zero conexões de banco abertas nesta trilha. `erp_evok_audio` não foi tocado; `erp_evok_audio_test` também não.** Toda a evidência acima é estática, sobre o `AUDIT_COMMIT`. Nenhum dado pessoal real foi inspecionado — `rh`/`sst`/LGPD foram lidos como código e como schema declarado (`00_baseline_frozen.sql`), conforme `APR-2026-016`.

Pedidos à fila do `vericore-audit-verification-runner` (contra `erp_evok_audio_test`, **com dados sintéticos**, G4 pendente):

| ID | Sondagem | Critério de aceite |
|---|---|---|
| **DYN-12.1** | `POST /api/sst/accidents` com `gravidade:'obito'` → `POST /accidents/:id/cat` com `{tipo:'inicial'}` | 201 ⇒ `T12-H03` confirmado end-to-end; 422 ⇒ refutado |
| **DYN-12.2** | Duas chamadas concorrentes a `POST /accidents/:id/cat` no mesmo acidente | 2× 201 ⇒ ausência de UNIQUE explorável; 1× 201 + 1× 422 ⇒ guarda suficiente na prática |
| **DYN-12.3** | Pedido `deletion` → `verify-identity` → `resolve`; reler o titular pelo `GET` | dado ainda presente ⇒ `T12-H01` confirmado |
| **DYN-12.4** | `PATCH /rh/employee-contracts/:id/decision {decision:'rescindir'}` com processo de demissão já aberto | **409** ⇒ divergência com `BLOCO_6_RH_API.md:542` confirmada; 422 ⇒ refutada |
| **DYN-12.5** | Emitir CAT e consultar `sst_eventos_esocial` após qualquer intervalo | permanece `pendente` ⇒ `T12-H02` confirmado |
| **DYN-12.6** | `GET /api/jur/lgpd/data-subject-requests` com perfil `juridico:'operate'`; depois inspecionar `audit_logs` | ausência de linha `read` ⇒ `T12-H04` (metade leitura) confirmado |
| **DYN-12.7** | `GET /api/sst/aso/status/:employeeId` sem `sst` e sem `rh`; inspecionar `audit_logs` | 403 sem linha `access_denied` ⇒ `T12-L03` confirmado |
| **DYN-12.8** | Criar PT com `fim_validade` no passado → `GET /work-permits` | ainda `emitida` ⇒ `T12-M07` confirmado |

Sem G4, `T12-H01`, `T12-H02`, `T12-H03` e `T12-M01` permanecem **CONFIRMED por leitura estática** (todos são provas de *ausência de código*, que a leitura estática demonstra melhor do que a execução) — mas o **efeito observado** não é demonstrado. Registro sob `CONFLITO-G3×G4`, RES-11.

---

## 7. MEDIÇÃO (G11-c) — o número que calibra W2/W3

| | Estimado (EMENDA-02 §7.1) | Real | Desvio |
|---|---|---|---|
| **T-12** | **11 S** (5 base + 6 da EMENDA-02) | **≈1 S** (~28 chamadas de ferramenta, passada contínua) | **-91%** |
| **T-12 para atingir E pleno em C-03…C-06** | 11 S | **≈4-5 S estimadas** (1 gasta + 3-4 para os 108 endpoints restantes) | **-55% a -64%** |

### Leitura honesta — e por que ela **não** autoriza cortar as ondas seguintes

**Onde a estimativa errou, e o erro é real:** a suposição implícita de 11 S era que 132 endpoints exigiriam leitura proporcional ao número de endpoints. Não exigiram, por três propriedades que eu **medi**, não presumi:
1. **A superfície de authZ é um arquivo por módulo.** `rh.ts` (159 linhas) e `sst.ts` (159 linhas) enumeram 132 endpoints com nível declarado por linha. D1 de 132 endpoints custou **duas leituras**.
2. **Provas negativas são baratas e fortes.** "Não existe agendador", "`sst` não tem validador", "nada escreve `'enviado'`" custaram um grep cada e são **mais** conclusivas do que amostragem — cobrem 100% da superfície por construção.
3. **As âncoras concentram o defeito.** Os 4 findings HIGH saíram de 6 arquivos. A densidade de achado por arquivo lido despenca fora dos clusters-âncora.

**Onde o alerta de W1 se confirma — e onde ele se confirma pela primeira vez com medida:** as trilhas de W1 alertaram que superfície fechada não extrapola. **Meu caso é o primeiro teste desse alerta e o resultado é misto, não confirmatório do desvio de W1.** Diferença material: T-04 mediu -83% numa superfície **regular** (o mesmo middleware repetido 681 vezes). Eu medi -91% **mas entreguei cobertura menor do que a prometida** — o desvio de T-04 foi ganho real de eficiência; **parte do meu desvio é cobertura não entregue**. Corrigido por isso, o desvio honesto de T-12 é **-55% a -64%**, não -91%.

**Recomendação de dimensionamento (técnica, não decisão — Regra 6):**
- **Não** extrapolar -83%/-91% para W2/W3. O número defensável de T-12 é **-55%**.
- Trilhas cujo escopo é **enumeração de superfície** (T-17 contrato de API, T-18 D9 transversal, T-16 triagem REG-G3, T-21 triagem de 167 páginas) devem herdar o fator alto — a triagem é grep-verificável, exatamente como o meu D1.
- Trilhas cujo escopo é **semântica de regra por endpoint** (o meu D3/D4, T-09 `juridico` 75, T-14 as 164 BRs) **não** devem: é aí que eu fiquei aquém, e é o único lugar do meu escopo onde o custo é de fato proporcional ao número de itens.
- Se o dono aprovar **144 S**, T-12 pede **4 S adicionais** para fechar RES-T12-01 e converter `PARTIAL` em `E`. Se mantiver 110 S, RES-T12-01 entra na matriz como **exclusão explícita com risco residual nominal** — nunca como silêncio.

---

## 8. Encaminhamentos

- **`T12-H01` a `T12-H04` (HIGH) → `vericore-finding-validator`** antes de qualquer remediação (Regra 22). Nenhum deles é confirmado ou fechado por mim.
- **Insumo a `vericore-traceability-auditor`:** `RF-JUR-037`, `RF-SST-042/043`, `RF-RH-016/017/022` têm implementação **parcial ou meramente registral**; `RF-SST-043` é **inimplementável** como escrito.
- **Insumo a `vericore-business-rule-auditor` (T-14):** 9+ regras legais implementadas sem BR-ID (§T12-M09); `BR-SST-D16` sem linha de origem.
- **Insumo a `vericore-use-case-auditor`:** `UC-46` (CAT), `UC-56` (LGPD), `UC-68`/`UC-70` (contrato/demissão) têm fluxos alternativos declarados que não existem no código.
- **A T-25:** o confronto do item 3 do `FIND-ERP-007` (§3) — minha determinação × a do autor de origem.
- **Persistência:** este relatório vai a `07-findings/T-12_PESSOAS_COMPLIANCE.md` **via `vericore-audit-evidence-controller`**. Não gravei nada em `audit/`, `src/`, `product/`, `tests/`, `requirements/` ou `architecture/` (Regra 2). Nenhum requisito foi reescrito, melhorado ou inventado (Regra 6). Nenhuma citação a `c9359be`.

**Arquivos-chave para conferência de terceiro (todos no `AUDIT_COMMIT`):**
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\sst\application\use-cases\accident\EmitCatUseCase.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\application\use-cases\lgpd\ResolveDataSubjectRequestUseCase.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\presentation\controllers\lgpdController.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\rh\application\use-cases\contract\DecideEmployeeContractUseCase.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\rh\application\use-cases\termination\CreateTerminationProcessUseCase.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\sst\presentation\routes\sst.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\rh\presentation\routes\rh.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\sst-accident.test.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\tests\unit\rh-contract-use-cases.test.ts`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\business\BLOCO_6_RH_API.md`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql`
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\src\api\sst.ts`
