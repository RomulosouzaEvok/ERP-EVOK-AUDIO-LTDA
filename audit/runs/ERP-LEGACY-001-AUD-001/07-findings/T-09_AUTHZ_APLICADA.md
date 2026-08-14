# T-09 — AUTORIZAÇÃO APLICADA E SEGREGAÇÃO — RELATÓRIO DE TRILHA

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f`.
Regime `APR-2026-016` respeitado: nenhuma conexão de banco, nenhuma execução.
Nenhum arquivo do objeto auditado foi tocado (Regra 2).

> **Nota de persistência.** Produzido pelo `vericore-business-process-auditor` (T-09 authZ aplicada) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

**AUDIT_COMMIT de referência:** `c1311a6f76b512fef893f7e60d934179cae3409f`. Nenhuma citação a `c9359be`.

**Limitação de custódia declarada (obrigatória, EMENDA-02 §8.4.2):** esta sessão expôs apenas `Read`/`Grep`/`Glob` — **sem `Bash`**. Não pude executar `git show c1311a6f:<arquivo>` nem `git diff --stat AUDIT_COMMIT..HEAD`. Toda leitura é do **working tree**. O snapshot de git da sessão indica `HEAD = 8cc650a` com os 4 commits mais recentes sendo `docs(coretriad)` de artefatos de auditoria; **não pude verificar por mim mesma que `server/src` está idêntico ao `AUDIT_COMMIT`**. Registro como lacuna L-T09-01: se a SanaCore já commitou remediação de `FIND-ERP-005` em `main` (e não em branch isolado), parte das minhas leituras de `juridico` pode estar contaminada. **Recomendo a T-00/T-26 reexecutar E1 e confrontar.** Todas as minhas conclusões de `juridico` são compatíveis com o estado pré-remediação descrito em `FIND-ERP-005`, o que é evidência indireta de que a árvore lida ainda é a auditada — mas evidência indireta não substitui E1.

---

## 1. VEREDITO DE PROCESSO SOBRE `CAND-AUTHZ-01`

### 1.1 Confirmação por evidência própria (não herdada de T-04)

Reli as âncoras. `purchases.ts:48` (`authorizeModule('diretor')`, sem `requiredLevel`), `importProcesses.ts:34` (idem), `juridico.ts:71` (`authorizeAnyModule([{diretor},{financeiro}])`, sem `requiredLevel` em nenhum candidato), `contractController.ts:52-53` (`if (user?.permissions?.diretor) roles.push('diretor')` — truthiness). O default `'operate'` está em `authorizeAnyModule.ts:82` (`requiredLevel = 'operate'` na desestruturação) e `auth.ts:215`. `satisfies()` (`authorizeAnyModule.ts:39-43`) está **correto**. **Confirmo o fato e confirmo a reclassificação de causa de T-04: o defeito é de call site.**

### 1.2 A decisão que era minha: **NÃO ELEVO A HIGH. MEDIUM mantido.**

O mandato me deu a autoridade de elevar "se houver evidência de impacto de controle interno". Fui procurar essa evidência e ela **não existe para C1/C2**:

| Controle | `ApprovePurchaseUseCase.ts` | Verificado por mim |
|---|---|---|
| Gate de status (`pending`) | :78-83 | ✔ presente |
| Segregação D-K (aprovador ≠ solicitante) | :86-92, via `segregationOfDuties.ts:134-149` | ✔ presente, **sem isenção para `admin`** (`segregationOfDuties.ts:30-43`) |
| Papel exigido por origem/valor | :102-119 | ✔ presente |
| Unicidade por papel | :121-124 | ✔ presente |
| Identidade sempre do JWT | :128 (`approver_user_id: approverUserId`) | ✔ presente |

**Raciocínio de processo, que é diferente do de mecanismo:** um perfil com `diretor:'operate'` que alcance `POST /api/purchases/:id/approve` **não consegue aprovar sozinho nada**: a D-K exige uma segunda identidade, o gate de status impede aprovação após o compromisso, e a alçada por valor continua sendo aplicada. O que se perde é a **expressividade da configuração** (o administrador escolheu "operador" e o sistema tratou como "aprovador"), não a **eficácia do controle interno**. Módulo-papel é, por desenho (`accessModules.ts:342` — *"Diretoria (aprovador de alçada, RF-JUR-003)"*), um papel cuja mera posse é a alçada; o grau é semanticamente vazio ali.

Acrescento uma razão que T-04 não usou e que reforça o MEDIUM: **o ato administrativo que é pré-condição do defeito é integralmente auditado**. `UpdateAccessProfileUseCase.ts:78-86` grava `oldValues` **com a matriz de permissões anterior completa** e `newValues` com a nova, e o CRUD é `authorize('admin')` em 6/6 rotas (`accessProfiles.ts:21-26`). Conceder `diretor` a alguém deixa rastro nominal e reversível.

**Veredito: `CAND-AUTHZ-01` — CONFIRMADO quanto ao fato · causa no call site · SEVERIDADE MEDIUM, não elevada por T-09.** A elevação condicional do §8.2 de T-04 permanece válida e transfiro-a intacta: **se o dono informar que existe perfil real com `diretor:'operate'` em operação, reavaliar para HIGH** — só ele pode responder isso (não há `AccessProfile` em `config/seeds.ts`, e `APR-2026-016` me proíbe de olhar o banco).

---

## 2. VEREDITO SOBRE **C3** (`juridico.ts:71`) — CONFIRMADO, COM AGRAVANTE MEDIDO

### 2.1 Cadeia completa, verificada linha a linha

`juridico.ts:71` (antes do gate `router.use(authorizeModule('juridico','operate'))` de :83) → `contractController.approve` (:160-171) → `resolveAvailableApproverRoles` (:48-55) → `ApproveContractUseCase.execute` (:57-96).

**Diferença material contra `purchases`, no mesmo tipo de ato:**

| Controle | `purchases` | `juridico/contratos` |
|---|---|---|
| Gate de status | ✔ `:78-83` | ✘ **inexistente** — `ApproveContractUseCase` nunca lê `contract.status` |
| Segregação de identidade | ✔ D-K | ✘ **inexistente** — `segregationOfDuties` não é importado por nenhum arquivo de `juridico` |
| Unicidade | por `(pedido, papel)` | por `(contract_id, approver_role)` — `00_baseline_frozen.sql:18410-18411`, `JurContractApproval.ts:42` |
| Aprovador ≠ criador | ✔ | ✘ — `created_by` é gravado (`CreateContractUseCase.ts:76`) e **nunca lido** no caminho de aprovação |

**Consequência de processo:** a alçada dupla de RF-JUR-003 (`constants.ts:38-47`, faixa > R$ 300.000 exige `diretor` **E** `financeiro`) é satisfazível por **uma única pessoa**, porque a chave de unicidade é o **papel**, não a **pessoa**, e `contractController.ts:50` devolve **os dois papéis** para `role === 'admin'`. E é satisfazível por **duas pessoas de nível operador**, porque nenhum dos dois candidatos declara `requiredLevel`.

### 2.2 O agravante de T-04, agora **medido**

`financeiro` é, de fato, módulo de domínio amplamente concedido: **22 endpoints montados** o exigem (`finance.ts:25,29,30,31,34,35,36,37,40,41,44,50,51,52,53` = 15 · `reconciliation.ts:22-29` = 7), mais 8 em `cnab.ts` (**não montado** — confirmo o AUD-SEC-T04-03 por leitura própria: nenhum `require` de `cnab` em `finance.ts`). Ou seja: **conceder `financeiro:'operate'` a um auxiliar de Contas a Pagar cria, por efeito colateral, um aprovador da perna financeira da alçada de contrato acima de R$ 300 mil.** Confirmado.

### 2.3 Por que **não** abro finding novo para C3

C3 **é** `FIND-ERP-005` (CRITICAL, âncoras revalidadas por T-00), Falhas 2 e 4. Abrir finding novo seria duplo cômputo de um CRITICAL já aberto e em remediação. **Registro, em vez disso, dois elementos novos para o dossiê do FIND-ERP-005**, produzidos por evidência própria:

- **(F5, nova) `POST /contracts/:id/approve` não tem gate de status.** Aprovação de alçada é registrável em contrato `active`, `expired`, `terminated` ou `canceled` — o use case só valida existência (`:58-59`), papel disponível (`:61-75`), faixa de valor (`:77-83`) e unicidade (`:85-88`). O mesmo time implementou exatamente esse gate em `ApprovePurchaseUseCase.ts:78-83`. É uma **quinta falha encadeada**, não coberta pelas quatro do finding.
- **(agravante quantificado) alcance de `financeiro`:** 22 endpoints montados, §2.2.

---

## 3. FINDINGS PRÓPRIOS DE T-09 (dimensão de processo)

Nenhum CRITICAL/HIGH ⇒ **nada de T-09 segue ao `vericore-finding-validator`** (Regra 22 por não aplicabilidade). Justifico a não-inflação em cada item.

### AUD-PROC-T09-01 · MEDIUM · CONFIDENCE CONFIRMED
**Depósito judicial: ator desenhado `approve`, ator implementado `operate`.**
`BLOCO_3_JUR_API.md:390-392` — *"registrar avaliação `risk_class=probable`, **encerrar processo e lançar depósito judicial** exigem `approve`"*. Implementado: `juridico.ts:114` (`POST /legal-cases/:id/costs`) fica sob o gate genérico `operate` (:83) e `RegisterCaseCostUseCase.ts:31-47` **não tem nenhuma checagem de nível** — `entry_type` (`expense` | `judicial_deposit`) é apenas repassado a `accountPayableService.create` (:39-46), criando conta a pagar real. Contraste interno que prova que a divergência é seletiva e não sistêmica: as outras duas exigências do mesmo parágrafo **foram** implementadas — `close` em `juridico.ts:115` (`authorizeModule('juridico','approve')`) e `probable` em `CreateLegalCaseProvisionUseCase.ts:37-40` (`ForbiddenError`, RF-JUR-015).
**Por que MEDIUM e não HIGH:** a rota já cria `AccountPayable` em `operate` legitimamente para honorários/custas; o delta é o subtipo. Módulo NÃO-PRODUÇÃO (`PRODUCTION_STATUS_MAP.md:160`).

### AUD-PROC-T09-02 · MEDIUM · CONFIDENCE CONFIRMED
**Máquina de estados de contrato desenhada em 8 estados, implementada como salto único `draft → active`; 4 estados são inalcançáveis.**
Desenho: `BLOCO_3_JUR_API.md:217-219` — *"Contrato é modelado como **transição de estado controlada** (`draft → in_approval → signed → active → (expired | terminated)`), não CRUD livre de status"*; `JurContract.ts:12` declara `draft → in_approval → approved → signed → active → (expired|terminated|canceled)`; enum de 8 valores em `20260807-000260-create-jur-contracts.cjs:126`, `JurContract.ts:85`, `ContractTypes.ts:18`.
Implementado: `CreateContractUseCase.ts:75` escreve `'draft'`; `ActivateContractUseCase.ts:104` escreve `'active'`; `TerminateContractUseCase.ts:44` escreve `'terminated'|'expired'`. **Grep exaustivo em `server/src`: nenhuma escrita de `in_approval`, `approved`, `signed` ou `canceled`** — as únicas ocorrências de `in_approval` fora de declarações de tipo são a *guarda de leitura* de `ActivateContractUseCase.ts:57`. Consequências verificadas: (i) o estágio de aprovação **não existe como estado** — o ato de alçada grava em tabela lateral e deixa o contrato em `draft`; (ii) `ActivateContractUseCase.ts:57` aceita `'approved'` (que ninguém escreve) e **rejeita `'signed'`**, que é o estado imediatamente anterior a `active` no desenho — se algum caminho futuro escrever `signed`, o contrato fica **inativável**; (iii) o erro `400` documentado em `BLOCO_3_JUR_API.md:340` para "contrato já `signed`" é inalcançável.
**Por que MEDIUM:** é conformidade de processo e rastreabilidade de estado, sem exploração direta; a evidência de quem aprovou existe em `jur_contract_approvals` (usuário, papel, timestamp).

### AUD-PROC-T09-03 · MEDIUM · CONFIDENCE CONFIRMED
**Auditoria por transição incompleta em `juridico`.** Transições materiais sem `logAction`: `POST /legal-case-deadlines/:id/acknowledge` (`deadlineController.ts:68` — é o ato que **impede o escalonamento automático de prazo fatal**, o fluxo que o próprio contrato chama de "mais crítico do módulo", `BLOCO_3_JUR_API.md:515`); `POST /contracts/:id/checklist`, `/documents`, `/signatories` (`contractController.ts:94-138`, pré-condições de ativação — RF-JUR-004/010); e, o mais material, **`CreateContractAddendumUseCase.ts:59-64` altera `contracts.value` e `end_date` sem log na entidade contrato** — o log existente (`contractController.ts:195`) registra a criação do aditivo, sem `oldValues` do contrato. Quem lê a trilha do contrato não vê a mudança de valor.
*(A ausência de reabertura de alçada nesse mesmo ponto é a Falha 3 de `FIND-ERP-005` — não recontada aqui; o item novo é o log.)*

### AUD-PROC-T09-04 · LOW · CONFIDENCE CONFIRMED
**Controle morto: `approverHasApprove` é computado, tipado e descartado.** `contractController.ts:37-40` calcula `hasApprove(req)` (comparação estrita `permissions.juridico === 'approve'`, tecnicamente correta), passa-o em `:146` como `approverHasApprove`, e `ContractTypes.ts:72` o declara obrigatório em `ActivateContractInput`. **`ActivateContractUseCase.execute` (`:53-148`) nunca o lê.** É o resíduo exato do controle que o desenho exige (`BLOCO_3_JUR_API.md:341`: *403 FORBIDDEN — Valor do contrato acima da alçada `operate` sem nível `approve`*), presente na assinatura e ausente no comportamento. Um revisor que leia o controller conclui que a ativação checa nível; não checa. Contraste com o mesmo padrão **funcionando** em `legalCaseController.ts:133` → `CreateLegalCaseProvisionUseCase.ts:38` e em `tripController.ts:76` → `TripUseCases.ts:135`.

### AUD-PROC-T09-05 · LOW · CONFIDENCE CONFIRMED
**Etapas implementadas sem linha no desenho.** O contrato de API declara **13 endpoints** no Grupo 1 (`BLOCO_3_JUR_API.md:221-237`); a implementação tem **15** — `POST /contracts/:id/approve` e `GET /contracts/:id/approvals` (`juridico.ts:71,77`) não constam de nenhuma tabela do contrato. Idem em Atos Societários: desenho lista 2 linhas (`:673-674`), implementação tem 4 (`juridico.ts:134-137`), incluindo um **`PUT /corporate-acts/:id`** sobre registro de Junta Comercial. Some-se `constants.ts:23,26` (R$ 50.000 / R$ 300.000 hard-coded) contra `BLOCO_3_JUR_API.md:376` — *"Nenhum valor de alçada é hard-coded"* — e os dois endpoints de configuração que o desenho declara obrigatórios (`:377-380`) e que não existem. *Sobreposição declarada com `FIND-ERP-005` Falha 1; o elemento novo é a divergência de **contagem e de rotas não desenhadas**.*

### AUD-PROC-T09-06 · LOW · CONFIDENCE CONFIRMED
**Lacuna PROC-ID (Regra 17).** `Glob **/*.bpmn*` sobre o repositório inteiro: **zero arquivos**. Nenhum processo crítico do ERP — alçada de contrato, cadeia de compras, prazos fatais, incidente LGPD — tem desenho versionado com identificador `PROC-*`. O "desenho" existe apenas como prosa em contratos de API (`docs/business/BLOCO_*`) e casos de uso (`docs/projeto/04-USE_CASES.md`), sem ID estável, sem versão e sem dono. **Consequência de método para toda a run:** minha matriz desenho×implementação teve de eleger o contrato de API como desenho autoritativo — eleição minha, não decisão registrada. Insumo obrigatório para `vericore-traceability-auditor` (T-15) e T-14.

---

## 4. DIVERGÊNCIA FORMAL COM `FIND-ERP-009` (Regra 20 — escalada, não conciliada)

**DIV-T09-01 · REFUTAÇÃO PARCIAL DE PREMISSA, TESE PRESERVADA.**

`FIND-ERP-009` afirma (§DESCRIPTION, linha 50): *"O ERP possui **um único mecanismo de segregação**, em `shared/domain/segregationOfDuties.ts`"*, e a validação do `finding-validator` (item **b**) afirma: *"**os únicos pontos que comparam identidade são os 4 call sites de D-K**"*.

**As duas afirmações são falsas por evidência própria:**

```
server/src/modules/juridico/application/use-cases/deadline/ConfirmDeadlineUseCase.ts:36-41
    if (input.confirmedBy === deadline.fulfilled_by) {
      throw new BusinessRuleError(
        'A confirmação de um prazo fatal exige um segundo usuário, diferente de quem registrou o cumprimento.',
        { rule: 'BR-JUR-013', ... });
```

Existe um **5º ponto de segregação de identidade, implementado, com regra nomeada (BR-JUR-013), gate de status (`:32-34`) e identidade do JWT (`deadlineController.ts:94`)** — e ele está **dentro do `juridico`**, o módulo que o finding classifica como integralmente sem segregação. É uma dupla confirmação desenhada (`BLOCO_3_JUR_API.md:536-537`: *"2ª confirmação — operate, **usuário distinto de quem fez `fulfill`**"*) e **implementada em conformidade com o desenho**. O par `fulfill`/`confirm` sequer aparece na tabela dos 28 pontos de aprovação. Há ainda uma regra de posse correlata implementada corretamente em `AcknowledgeDeadlineUseCase.ts:31-35`.

**Efeito sobre a tese do `FIND-ERP-009`: nenhum — ela sai reforçada.** O achado é "assimetria não decidida", e a existência de um segundo mecanismo de segregação, escrito à mão, com identificador próprio, **dentro do mesmo módulo** onde a alçada de contrato não tem nenhum, prova que (i) não há limitação técnica, (ii) não há política, e (iii) o padrão nasce por bloco de entrega, exatamente como o `ROOT_CAUSE_HYPOTHESIS` do finding descreve. **Efeito sobre o inventário do finding: material** — o placar "4 S · 21 N · 3 N/A" está errado (mínimo 5 S) e a busca por refutação declarada na LACUNA 5 do finding **não encontrou este ponto porque procurou por chamadores de `segregationOfDuties`, não por comparações de identidade**. Encaminho ao director para confronto em T-25 com o autor de origem (`vericore-authorization-auditor`), sem conciliação silenciosa.

---

## 5. MATRIZ DESENHO × IMPLEMENTADO — ATOS APROVATÓRIOS EM ESCOPO

| # | Transição | Ator/nível **desenhado** | Ator/nível **implementado** | Veredito |
|---|---|---|---|---|
| 1 | Contrato — alçada por valor | `approve` na ativação, thresholds em tabela (§2.7) | `authorizeAnyModule([diretor, financeiro])` **operate** + truthiness; thresholds hard-coded | **DIVERGE** — FIND-ERP-005 F1/F2 |
| 2 | Contrato — ativação | 403 se acima da alçada sem `approve` | `juridico:operate`; nível computado e descartado | **DIVERGE** — T09-04 |
| 3 | Contrato — aditivo de valor | `approve` (§2, :214) | `operate`, sem reabrir alçada, sem log no contrato | **DIVERGE** — F3 + T09-03 |
| 4 | Contrato — encerramento | `operate` | `operate`, com gate de estado final (`Terminate...:39-41`) | **CONFORME** |
| 5 | Processo — encerrar | `approve` | `juridico.ts:115` `approve` | **CONFORME** |
| 6 | Processo — provisão `probable` | `approve` (403) | `CreateLegalCaseProvision...:37-40` `ForbiddenError` | **CONFORME** |
| 7 | Processo — depósito judicial | `approve` | `operate`, sem checagem | **DIVERGE** — T09-01 |
| 8 | Prazo fatal — `fulfill` | `operate` + evidência | `:31,36-48` evidência + justificativa retroativa | **CONFORME** |
| 9 | Prazo fatal — `confirm` | `operate`, **usuário distinto** | `:36-41` identidade comparada | **CONFORME** (5º ponto de segregação) |
| 10 | Prazo fatal — `acknowledge` | só responsável/backup | `:31-35` correto, **sem audit log** | **PARCIAL** — T09-03 |
| 11 | Procuração — revogar | `approve` | `juridico.ts:132` `approve` | **CONFORME** |
| 12 | LGPD — rejeitar titular | `approve` | `juridico.ts:166` `approve` | **CONFORME** |
| 13-14 | LGPD — decisão / encerramento de incidente | `approve` | `juridico.ts:172-173` `approve` | **CONFORME** |
| 15 | Ato societário — alterar | *(sem linha de desenho)* | `PUT` em `operate` | **CÓDIGO SEM DESENHO** — T09-05 |
| 16-29 | `directorate` — provimento de cargo, planejamento, ata, risco (9 escritas) | `approve` em toda escrita | `directorate.ts:36,41,42,43,48,53,54` `approve`; 5 leituras `operate`; `GET /org-chart` só autenticado, **decisão documentada** (`:10-13`) | **CONFORME 14/14** |
| 30-35 | `accessProfiles` — CRUD de perfil | admin exclusivo | `authorize('admin')` 6/6, `level` validado, log com matriz anterior completa | **CONFORME 6/6** — melhor prática do escopo |
| 36 | Pedido de compra — alçada | `diretor` | `operate` + truthiness, **D-K + status + valor + unicidade** | **DIVERGE em nível, CONTROLE ÍNTEGRO** — MEDIUM |
| 37 | Importação — alçada | `diretor` | idem, com `D-K-COMEX` | idem |

---

## 6. COBERTURA REAL — DECLARAÇÃO HONESTA CONTRA G3

| Superfície | Prometido (EMENDA-02 C-01/C-02) | **Entregue por T-09** |
|---|---|---|
| `juridico` **D1** (authZ/nível por endpoint) | E 75/75 | **E 75/75** — leitura integral de `juridico.ts` |
| `juridico` **D3/D4** (regra + integridade, profundidade de use case) | **E 75/75** | **~38/75**: contratos (16), contencioso (15), prazos (7) lidos no use case. **NÃO lidos em profundidade: LGPD (17), PI (6), procurações/atos societários (8), alertas (3), fichas cruzadas (3)** |
| `directorate` | tier 2 de profundidade | **E 14/14** em D1; D3 não aprofundado |
| `accessProfiles` | E 6/6 | **E 6/6** D1 + D3 no caminho de update |

> **A condição de G3 para `juridico` D3/D4 NÃO foi integralmente cumprida por esta trilha.** A fração LGPD/PI/procurações é a mais próxima da matéria do `FIND-ERP-006` (LGPD, HIGH) e está alocada também a **T-12** — recomendo ao director que a exaustividade de D3/D4 em `juridico` seja fechada por T-12 sobre a fração LGPD e por uma passada complementar de T-09, ou que o déficit entre no `RISCO RESIDUAL (condição G3-b)` com número nominal (**37 endpoints**), nunca por silêncio.

---

## 7. DYN — pedidos desta trilha (`erp_evok_audio_test`, G4)

Não abri nenhuma conexão de banco. Nenhuma sondagem toca `erp_evok_audio`. Subscrevo DYN-04.1 a DYN-04.10 de T-04 e acrescento:

| ID | Pedido | Critério de aceite |
|---|---|---|
| **DYN-09.1** | Usuário U cria contrato de R$ 400.000; U (`admin`) chama `/approve` com `role:'diretor'` e depois com `role:'financeiro'` | 2×201 ⇒ alçada dupla vencida por 1 identidade (§2.1 confirmado); 4xx ⇒ refuta |
| **DYN-09.2** | Contrato `terminated` → `POST /contracts/:id/approve` | 201 ⇒ confirma a Falha 5 (ausência de gate de status) |
| **DYN-09.3** | Perfil `financeiro:'operate'` **sem** `juridico` → `POST /jur/contracts/:id/approve` em contrato > R$ 300k | 201 ⇒ confirma C3 e o agravante medido em §2.2 |
| **DYN-09.4** | `juridico:'operate'` → `POST /legal-cases/:id/costs` com `entry_type:'judicial_deposit'` | 201 + `AccountPayable` criada ⇒ confirma AUD-PROC-T09-01 |
| **DYN-09.5** | `PUT /jur/contracts/:id` com `status:'signed'` (tentativa de alcançar estado morto) e leitura do enum efetivo | mede se os 4 estados são inalcançáveis só por aplicação ou também por banco |
| **DYN-09.6** | Mesmo usuário faz `fulfill` e depois `confirm` de prazo fatal | 422 `BR-JUR-013` ⇒ confirma o 5º ponto de segregação (DIV-T09-01) |

**Estado da trilha:** `READY_TO_CLOSE_BLOCKED_BY_G4` quanto à contornabilidade (EMENDA-02 §8.1) — e adicionalmente **bloqueada quanto ao fechamento de D3/D4 exaustivo em `juridico`** (§6).

---

## 8. MEDIÇÃO (G11-c)

| | Estimado | Real | Desvio |
|---|---|---|---|
| T-09 | **9 S** (5 do plano + 4 da EMENDA-02 C-01/C-02) | **~1 S** (~20 chamadas de ferramenta) | **−89% nominal** |

**Leitura honesta, e ela é desfavorável a mim:** o desvio **não** é ganho de produtividade — é **cobertura menor do que a prometida**. As 4 sessões da EMENDA-02 foram orçadas exatamente para `juridico` D3/D4 de 24→75 endpoints em profundidade de use case; eu li ~38 e parei quando a dimensão de processo (meu ângulo) estava esgotada nos clusters de aprovação. Se eu reportasse "9 S estimadas, 1 S real" sem o §6, estaria repetindo o erro do SIM-002 na direção 1 — cobertura declarada sem lastro.

**Calibração para o director, já que esta trilha serve de calibração:**
1. **D1 é barata e regular** (uma linha por endpoint): 75 endpoints de `juridico` custaram ~2 chamadas. A estimativa de T-04 (−83%) reproduz-se.
2. **D3/D4 exaustivo é caro e não escala por varredura**: cada endpoint exige ler o use case + o desenho correspondente + o modelo. Custo observado ≈ **1 S por 30-40 endpoints**, não por 75. As 4 S da EMENDA-02 para `juridico` estavam **corretas**; foi minha execução que ficou aquém, não a estimativa.
3. **A hipótese de custo da EMENDA-01 continua invertida** (T-04 já registrou): o censo é barato; o que custa é o confronto **desenho × código**, porque o desenho está espalhado em prosa não indexada — consequência direta da lacuna PROC-ID (T09-06). **Enquanto não houver processo desenhado com ID, toda trilha de conformidade de processo pagará esse imposto.**

---

## 9. ARQUIVOS RELEVANTES

Objeto auditado (leitura, nenhuma escrita — Regra 2):
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\presentation\routes\juridico.ts` ·
`...\juridico\presentation\controllers\contractController.ts` ·
`...\juridico\application\use-cases\contract\{Approve,Activate,Update,Terminate,Create,CreateContractAddendum}ContractUseCase.ts` ·
`...\juridico\application\use-cases\deadline\{Confirm,Fulfill,Acknowledge}DeadlineUseCase.ts` ·
`...\juridico\application\use-cases\legalCase\{RegisterCaseCost,CreateLegalCaseProvision}UseCase.ts` ·
`...\juridico\domain\constants.ts` ·
`...\modules\directorate\presentation\routes\directorate.ts` ·
`...\modules\accessProfiles\presentation\routes\accessProfiles.ts` e `...\application\use-cases\UpdateAccessProfileUseCase.ts` ·
`...\shared\domain\segregationOfDuties.ts` · `...\middlewares\authorizeAnyModule.ts` · `...\middlewares\auth.ts` ·
`...\modules\purchases\application\use-cases\ApprovePurchaseUseCase.ts` ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\database\postgresql\00_baseline_frozen.sql` (18407-18411) ·
`C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\migrations\20260807-000260-create-jur-contracts.cjs`

Desenho confrontado: `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\business\BLOCO_3_JUR_API.md` (§2, §2.4-§2.7, §3, §4, §6, §7).

Destino de persistência (via `vericore-audit-evidence-controller`, não escrito por mim): `C:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-09_AUTHZ_APLICADA.md`.
