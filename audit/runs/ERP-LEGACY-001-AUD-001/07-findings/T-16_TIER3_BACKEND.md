# T-16 — TIER 3 BACKEND · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-backend-auditor` (T-16 tier 3 backend) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

**AUDIT_ID:** `ERP-LEGACY-001-AUD-001` · **TRILHA:** T-16 (onda W3)
**TITULAR:** `vericore-backend-auditor` · **CO-TITULAR authZ:** `vericore-authorization-auditor`
**AUDIT_COMMIT declarado:** `c1311a6f76b512fef893f7e60d934179cae3409f`
**Regime:** APR-2026-016 (read-only, zero conexão de banco, zero execução) · Regra 2 observada: nenhum arquivo criado ou alterado, em `src/` ou fora dele. Este texto é o entregável.

---

### 0. Declarações obrigatórias antes de qualquer achado

**IN-08 — proveniência temporal: NÃO AFIRMADA.** Esta sessão não expôs `Bash`/`git`. Não verifiquei que o `AUDIT_COMMIT` declarado é o HEAD, nem em que commit cada linha citada nasceu. **Nenhuma afirmação de proveniência, autoria ou datação de código é feita neste relatório.** Toda evidência é leitura de disco em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/` no estado da árvore de trabalho no momento da leitura. Se o diretor precisar de amarração ao commit, isso é um `DYN`/tarefa de outro agente com shell — registrado como `RES-T16-07`.

**Comentários de código como "achado de auditoria anterior" não foram tratados como prova.** Onde eles aparecem (ex.: `uploadService.ts:29-33`), são tratados como *afirmação do objeto auditado sobre si mesmo* e foram verificados contra o código — em um caso a afirmação está **factualmente errada hoje** (T16-F03).

---

### 1. Aritmética de fechamento — reprodução e conferência própria

| Faixa | Plano §4.4 | Minha contagem (linha a linha nos arquivos de rota) | Fecha? |
|---|---|---|---|
| `facilities` | 64 | 64 (`facilities.ts:45-52`=8, `:55-60`=6, `:63-68`=6, `:70-73`=4, `:76-83`=8, `:86-93`=7, `:96-97`=2, `:99-103`=5, `:105-107`=3, `:110-114`=5, `:116-117`=2, `:120-123`=4, `:126-129`=4) | **Sim** |
| `ti` | 47 | 47 (`ti.ts:33-36`=4, `:39-53`=15, `:56-62`=7, `:65-74`=10, `:77-86`=8, `:89-91`=3) | **Sim** |
| `marketing` | 30 | 30 (`marketing.ts:40-45`=6, `:48-59`=8, `:62-69`=8, `:72-73`=2, `:76-81`=6) | **Sim** |
| `engineering` | 11 | 11 (`engineering.ts:34-37`=4, `:40-44`=5, `:47-48`=2) | **Sim** |
| `comex` | 8 | 8 (`importProcesses.ts:30-38`) | **Sim** |
| `reports` | 8 | 8 (`reports.ts:24-31`) | **Sim** |
| `workCenters` | 6 | 6 (`workCenters.ts:20-25`) | **Sim** |
| **Profundidade** | **174** | **174** | **Sim** |
| Outras trilhas | 44 | não recontado (fora do meu mandato; T-05/T-09/T-11/T-24 respondem) | n/a |
| Varredura rasa | 43 | 43 (5+5+5+5+5+5+4+3+3+3, conferido nos 10 arquivos de rota) | **Sim** |
| **Total tier 3** | **261** | **174 + 44 + 43 = 261** | **Sim** |

**174 + 44 + 43 = 261. A conta fecha na minha contagem própria.** Cobertura *de superfície* do tier 3: profunda 83,5%, rasa 16,5%, não coberta 0. **Mas ver §2: cobertura de superfície ≠ cobertura por dimensão. A cobertura efetiva por dimensão é menor e está declarada nominalmente.**

**Corroboração ao inventário de T-04:** os 8 endpoints de `financial/routes/cnab.ts` que T-04 declarou inalcançáveis (`AUD-SEC-T04-03`) **não pertencem ao meu escopo** e não foram recontados. Nenhuma divergência de inventário com T-04 dentro do meu escopo — a âncora A4 de T-04 (`comex/.../importProcessController.ts:56`) foi reencontrada por leitura própria, **literalmente idêntica**: `return user?.permissions?.diretor ? ['diretor'] : [];`.

---

### 2. COBERTURA EFETIVA — declaração honesta

Dimensões auditadas: **D1** autenticação · **D2** autorização · **D3** validação de entrada na borda · **D4** regra de negócio / máquina de estados · **D5** transação, atomicidade, concorrência · **D6** tratamento de erro · **D7** trilha de auditoria · **D8** aderência ao padrão do repositório.

| Módulo | Endpoints | D1/D2/D3 (borda) | D4-D8 (código lido) | Não lido em profundidade |
|---|---|---|---|---|
| `facilities` | 64 | **64/64** | **~31/64** (vehicle, vehicleDocument, driver, trip, fine + controllers) | visitor, visit, correspondence, cleaning×2, reservation, area, fuelRecord, maintenanceTicket (use-cases) |
| `ti` | 47 | **47/47** | **~27/47** (ticket, accessRequest completo, license controller) | term, backup, e 8 use-cases de ticket |
| `marketing` | 30 | **30/30** | **~12/30** (campaign, lead/convert, material/upload) | event, lead restante, material restante |
| `engineering` | 11 | **11/11** | **~5/11** (drawings) | projects, technical-spec |
| `comex` | 8 | **8/8** | **8/8** (controller + Approve + Receive + rotas) | — |
| `reports` | 8 | **8/8** | **8/8** (controller, exporters, período, SQL) | — |
| `workCenters` | 6 | **6/6** | **0/6** (somente rotas) | todos |
| **Total** | **174** | **174/174 (100%)** | **~91/174 (≈52%)** | ver `RES-T16-01..06` |

> **Declaração explícita, no espírito do critério de pronto:** a matriz **D1/D2/D3 está preenchida para os 174**. A matriz **D4-D8 está preenchida para ≈91 dos 174**. **Não apresento os 174 como auditados em profundidade em todas as dimensões.** O restante é resíduo nominal, abaixo. O orçamento de 5 S foi consumido priorizando, dentro do tier 3, tudo que a **condição G3** eleva a exaustivo — permissões administrativas, segregação de funções, operações financeiras, movimentação de estoque e integridade de dados —, e esses itens **foram lidos até o use-case e o serviço compartilhado**, não amostrados.

**Resíduos (`RES-T16-nn`) — lacunas de cobertura, não conformidades:**

- **`RES-T16-01`** `workCenters` (6 endpoints): lido só o arquivo de rota. D4-D8 **não auditados**. Inclui `PUT /:id/shifts` (`workCenters.ts:25`), que reescreve turnos e alimenta o cálculo de capacidade/OEE — candidato a integridade de dados.
- **`RES-T16-02`** `engineering`: `CreateProjectUseCase`, `UpdateProjectUseCase`, `UpsertTechnicalSpecUseCase`, `GetTechnicalSpecUseCase` não lidos (6 de 11 endpoints em D4-D8).
- **`RES-T16-03`** `facilities`: 33 de 64 endpoints sem leitura de use-case (visitante/visita — dado pessoal de terceiro, LGPD; correspondência; limpeza; reserva; abastecimento; chamado predial).
- **`RES-T16-04`** `ti`: `term/*` (7 endpoints, inclui `markLost` de ativo) e `backup/*` (3) sem leitura de use-case.
- **`RES-T16-05`** `marketing`: `event/*` (8) e a maior parte de `lead/*` e `material/*` sem leitura de use-case.
- **`RES-T16-06`** `comex`: `RegisterImportTrackingUseCase` (o gate de embarque que consome a alçada G11-COMEX) **não lido** — li o `Approve` e o `Receive`, que o referenciam. É a única lacuna dentro de um módulo classificado como G3-crítico e **deve ser fechada** antes de qualquer veredito sobre a alçada de importação.
- **`RES-T16-07`** Sem shell: nenhuma afirmação de proveniência/commit (IN-08).
- **`RES-T16-08`** Sem execução: tudo abaixo é estático. Os `DYN-T16-nn` do §6 são as verificações que o estático não fecha.
- **`RES-T16-09`** Não li migrations/DDL. Onde um achado depende de nulabilidade de coluna (T16-F04b) ou de constraint (T16-F02), isso está dito e vira DYN. Cruzamento com T-13 recomendado.

---

### 3. Findings propostos (`PROPOSED` — Regra 22)

| ID | Título | Sev. | Conf. |
|---|---|---|---|
| **T16-F01** | Concessão de perfil de acesso RBAC alcançável por `ti:operate`/`ti:approve`, sem segregação de funções e com o aprovador escolhido pelo próprio solicitante — contorna `authorize('admin')` de `/api/users` | **HIGH** | **HIGH** |
| **T16-F02** | `POST /facilities/fines/:id/pay` gera título em Contas a Pagar sem guarda de status, sem idempotência e sem transação | **MEDIUM** | **HIGH** |
| **T16-F03** | `POST /marketing/materials/:id/file` rejeita exatamente os formatos que o endpoint existe para aceitar; o comentário que documenta o comportamento é factualmente falso e instrui auditorias futuras a não corrigi-lo | **MEDIUM** | **MEDIUM-HIGH** |
| **T16-F04** | 13 endpoints de escrita de `ti` sem esquema de validação; duas explorações concretas provadas (atribuição forjável, chamado forjado como "gerado pelo sistema") | **MEDIUM** | **HIGH** |
| **T16-F05** | `DepartTripUseCase`: docstring afirma transação única; não há transação nem lock — TOCTOU no gate de uso exclusivo de veículo/condutor | **MEDIUM** | **HIGH** |
| **T16-F06** | `ReturnTripUseCase` lê o resultado **fora** da transação que acabou de escrever — resposta potencialmente obsoleta | **MEDIUM** | **MEDIUM** |
| **T16-F07** | `RenewVehicleDocumentUseCase`: duas escritas sem transação — falha parcial deixa o veículo sem documento vigente | **MEDIUM** | **HIGH** |
| **T16-F08** | `GET /facilities/fines` e `/fines/:id` **escrevem** no banco (mutação de status legal) sem transação e sem auditoria | **LOW** | **HIGH** |
| **T16-F09** | Máquinas de estado sem guarda em 4 atos de `facilities` (recurso, cobrança ao condutor, autorização e suspensão de condutor) | **LOW** | **HIGH** |
| **T16-F10** | Duplicação verbatim da regra de sugestão de condutor em dois use-cases | **LOW** | **HIGH** |
| **T16-F11** | Recurso aninhado sem verificação de pertinência: `:assetId` é decorativo em renovar/liberar documento de veículo | **LOW** | **HIGH** |
| **T16-F12** | Dois `catch {}` silenciosos, sem qualquer registro, em efeitos colaterais de `marketing` | **LOW** | **HIGH** |
| **T16-F13** | Prazo legal de indicação de condutor (CTB art. 257 §7º) derivado de env sem validação e ausente quando o campo-gatilho não é informado | **LOW** | **MEDIUM** |
| **T16-F14** | Dois padrões estruturais conflitantes dentro do mesmo módulo, e cobertura de validador Zod desigual entre módulos do mesmo tier | **LOW** | **HIGH** |
| **T16-F15** | `file_path` de documento de veículo aceito como string livre do cliente — encaminhado ao `appsec-auditor` | **LOW** | **MEDIUM** |

Somente **T16-F01** é HIGH ⇒ **é o único que segue ao `vericore-finding-validator`** por esta trilha (Regra 22).

---

#### T16-F01 — HIGH · confiança HIGH · **cadeia completa lida, nada inferido**

**Impacto:** um usuário que possua **`ti:approve`**, ou **`ti:operate` sendo gestor de qualquer um dos departamentos**, atribui **qualquer perfil de acesso a qualquer funcionário — inclusive a si mesmo — sem passar por `admin` e sem segunda pessoa**.

Cadeia, com âncoras:

1. `POST /api/ti/access-requests` exige apenas `ti:operate` — `ti.ts:79`. O corpo aceita `requested_profile_id` (qualquer perfil existente) e `department_id` **livre** — `accessRequestValidators.ts:21-22`.
2. `CreateAccessRequestUseCase.ts:39` — `const departmentId = input.department_id ?? employee.department_id;`. **O `department_id` enviado pelo cliente sobrepõe o departamento real do funcionário, e não há nenhuma checagem de que o `employee_id` pertence a esse departamento** (`:36-46` valida apenas existência de funcionário, departamento e perfil).
3. `approverEligibilityService.ts:26-37` resolve o aprovador elegível **a partir de `request.department_id`** — ou seja, a partir do valor que o solicitante acabou de escolher no passo 2.
4. `ApproveAccessRequestUseCase.ts:29-41` — **não existe comparação entre `request.requested_by` e `approverUserId`**. Não há segregação de funções. Autoaprovação é permitida.
5. `POST /:id/execute` exige apenas `ti:operate` — `ti.ts:84` → `accessRequestController.ts:107-117` → `ExecuteAccessRequestUseCase.ts:76-81` → `AccessProfileExecutionServiceAdapter.ts:54-56`: `await new AssignAccessProfileUseCase(this.usersRepository).execute({ id: userId, accessProfileId: profileId, req });`
6. **É o mesmo use-case que a rota administrativa protege:** `users.ts:20` — `router.put('/:id/access-profile', authenticate, authorize('admin'), userController.assignAccessProfile);`. `AssignAccessProfileUseCase.ts:50-81` **não faz nenhuma verificação de autorização própria** — confia inteiramente na borda, e a borda de TI é `ti:operate`.
7. Colateral do mesmo caminho: se o funcionário não tiver usuário, `AccessProfileExecutionServiceAdapter.ts:42-51` **cria um usuário ativo** via `CreateUserUseCase` (também `authorize('admin')` em `users.ts:16`), com senha temporária gerada em `:42` e **nunca retornada nem comunicada** — conta viva com credencial que ninguém conhece.

**Prova de que o repositório sabe fazer certo e não fez aqui** (é isto que sustenta o HIGH, não a analogia): existe `shared/domain/segregationOfDuties` e ele é aplicado em `ApproveImportProcessUseCase.ts:82-88` (`assertApproverIsNotRequester`, regra `D-K-COMEX`) e, segundo T-04 §1.3.4, em `ApprovePurchaseUseCase.ts:86-92`. **O ato que concede permissão administrativa é o único dos três atos aprovatórios que não usa o mecanismo.**

**Não é violação da Regra 24.** Nenhum `role`/`isAdmin`/`permissions` é lido do cliente neste caminho — `accessRequestController.ts:83-85,100` derivam de `req.user` e usam **comparação estrita** (`user.permissions?.ti === 'approve'`), que é o padrão correto. O defeito é de **desenho de autorização e de segregação**, não de spoofing.

**Escalonamento obrigatório (Regra 20) — divergência material com T-04, registrada, não conciliada:**
T-04 fixou `AUD-SEC-T04-01` em MEDIUM apoiado, entre outros, em: *"(1) a pré-condição é ato administrativo: conceder o módulo `diretor`"* e *"(3) CRUD de perfis é exclusivo de `admin`"* (T-04 §1.3). **A premissa (3) é verdadeira quanto a criar/editar perfis, mas a *atribuição* de perfil a usuário — que é o que efetivamente concede `diretor` a alguém — não é exclusiva de `admin`:** é alcançável por `ti` pelo caminho acima. Isso **reduz o custo da pré-condição (1) de "ato do administrador" para "ato de um gestor de departamento com `ti:operate`"**. Não altero a severidade de T-04 — não é minha —, mas **a premissa mitigante precisa ser reavaliada pelo diretor**, com T-04 e T-09 na mesa. Combinado com T-04, a cadeia é: `ti` → concede módulo `diretor` a si mesmo → `purchases.ts:48` aprova alçada de diretoria.

---

#### T16-F02 — MEDIUM · HIGH · operação financeira (G3)

`PayFineUseCase` — `facilities/application/use-cases/fine/FineUseCases.ts:181-193`:

- **Nenhuma guarda de status.** Não há `if (fine.status === 'paid')`. Duas chamadas de `POST /fines/:id/pay` (retry, duplo clique, reprocessamento) criam **dois títulos em `accounts_payable`** para a mesma multa, via `AccountPayableServiceAdapter.ts:25-32` → `financialRepository.createPayable`, que grava `status: 'pending'` — passivo real duplicado.
- **Sem transação.** `accountPayableService.create` (`:185`) e `fineRepository.update` (`:193`) são escritas independentes. Falha entre elas deixa um título órfão em Contas a Pagar sem vínculo com a multa.
- **`accounts_payable_id` é sobrescrito** (`:193`), então o primeiro título fica invisível pela multa — o órfão não é detectável pelo próprio registro.
- **Contraste no mesmo commit:** `importProcessController.ts:111,123,136` abre transação, faz commit e tem `rollbackIfPending`; `ReturnTripUseCase.ts:171` usa `sequelize.transaction` + `findByIdForUpdate`. O padrão existe no repositório e não foi aplicado ao único ponto de `facilities` que gera passivo financeiro.

*Lacuna declarada:* não li a DDL de `accounts_payable`/`facility_fines`; se houver UNIQUE que impeça o segundo título, a severidade cai. → `DYN-T16-01`.

---

#### T16-F03 — MEDIUM · MEDIUM-HIGH · endpoint funcionalmente quebrado + documentação enganosa

`UploadMaterialFileUseCase.ts:51-54` chama `uploadFile(file, { allowedExtensions: MATERIAL_ALLOWED_EXTENSIONS })` **sem `allowedMimes`**, com extensões que incluem `.mp4 .mov .ppt .pptx .doc .docx` (`:27-32`).

`uploadService.ts:168-169`: quando `allowedMimes` vem vazio, ele **deriva** dos `allowedExtensions` via `deriveAllowedMimes` (`:52-60`), cujo mapa `EXTENSION_TO_MIME` (`:35-45`) **não contém nenhuma dessas seis extensões**. Resultado: `effectiveAllowedMimes = ['image/jpeg','image/png','image/gif','image/webp','application/pdf']` — **não vazio**. Um `.mp4`/`.docx`/`.pptx` real não casa com nenhuma assinatura de `Validators.FILE_MAGIC_BYTES` (`validators.ts:187-198`), então `validateFileMagic` cai em `validators.ts:221` — `return { valid: allowedMimes.length === 0, ... }` = **`false`** — e `uploadService.ts:173-178` lança **400 "Tipo de arquivo não permitido"**.

**O comentário do próprio arquivo afirma o contrário e pede que não seja mexido:** `UploadMaterialFileUseCase.ts:11-19` — *"`allowedMimes` é deixado vazio propositalmente... Passar `allowedMimes` vazio faz a validação de magic bytes não bloquear esses tipos... decisão consciente, documentada aqui para não ser 'corrigida' por engano em uma auditoria futura."* Essa afirmação **deixou de ser verdadeira** quando `deriveAllowedMimes` entrou em `uploadService.ts` (o próprio arquivo, em `:29-33`, se descreve como correção de achado de segurança). **Um comentário que instrui auditores futuros a não tocar em um comportamento que já mudou é dívida técnica ativa, não documentação.**

**Por que os testes não pegam:** `server/tests/unit/marketing-material-use-cases.test.ts:93` faz `(uploadFile as jest.Mock).mockReset()` — `uploadFile` é **mockado em 100% dos casos** (`:97-127`), e o único caminho feliz testado usa `catalogo.pdf` (`:121`). O caminho de magic bytes **nunca é exercitado**. Confiança MEDIUM-HIGH em vez de HIGH exatamente porque o desfecho é comportamental → `DYN-T16-02`.

---

#### T16-F04 — MEDIUM · HIGH · validação de entrada e mass assignment em `ti`

**(a) Atribuição de chamado forjável — ordem de spread invertida.** `ticketController.ts:137-141`:
```
execute({ id: Number(req.params.id), assignedTo: (req as any).user.id, ...req.body })
```
O spread do corpo vem **depois** do valor derivado do servidor, logo `req.body.assignedTo` **sobrescreve** `req.user.id`. `AssignTicketUseCase.ts:25,33` grava `assigned_to: assignedTo` sem qualquer validação. Qualquer `ti:operate` atribui um chamado a qualquer id de usuário.
**O mesmo arquivo faz certo 37 linhas antes:** `ticketController.ts:99-103` coloca `requesterId` e `requesterHasTiOperate` **depois** do spread — imune. É a mesma construção com a ordem trocada.

**(b) Chamado forjado como "gerado pelo sistema".** `ticketController.ts:100` espalha `req.body` e **não neutraliza `systemGenerated`**. `CreateTicketUseCase.ts:70-71`: `requester_id: input.systemGenerated ? null : input.requesterId` e `system_generated: Boolean(input.systemGenerated)`. Um `POST /api/ti/tickets` com `{"systemGenerated":true}` — rota aberta a **qualquer usuário autenticado**, sem módulo (`ti.ts:39`) — grava um chamado **sem solicitante** e marcado como originado do sistema. Consequências: repúdio (o registro deixa de apontar para quem o abriu) e quebra do próprio autosserviço, já que `ticketController.ts:52-54` (`ticket.requester_id === req.user.id`) passa a devolver `false` para todos.

**(c) Superfície.** 13 endpoints de escrita de `ti` sem esquema: `tickets` create/assign/wait/resume/link-maintenance-order/resolve/confirm/reopen/cancel/comments (`ticketController.ts:100,140,164,172,183,192,200,208,216,235`), `access-requests` reject/checklist (`accessRequestController.ts:97,122`), `licenses` seats/request-renewal (`licenseController.ts:110,128-129`). Contra 9 endpoints com Zod estrito no mesmo módulo. `licenseController.ts:128` recebe `estimated_cost` cru e gera requisição de compra.

*Mitigante verificado:* `UpdateAccessRequestChecklistUseCase.ts:26-33` reconstrói o checklist campo a campo — o `...req.body` de `accessRequestController.ts:122` **não** vira update arbitrário. `ConfirmTicketUseCase.ts:27` desestrutura só `satisfaction_*`. Os dois vetores exploráveis são (a) e (b).

---

#### T16-F05 · T16-F06 · T16-F07 — atomicidade e concorrência em `facilities`

**T16-F05 (MEDIUM/HIGH).** `TripUseCases.ts:68-71` documenta: *"validando elegibilidade completa (E1-E4 do UC-58) **numa única transação**"*. **Não há transação nem lock em `DepartTripUseCase` (`:87-155`).** Os gates E3 — "nenhum outro uso em aberto para o veículo" (`:120-123`) e "para o condutor" (`:124-127`) — leem sem lock e escrevem em `:149`. Duas saídas simultâneas do mesmo veículo passam ambas. A docstring afirma uma garantia que o código não dá.

**T16-F06 (MEDIUM/MEDIUM).** `TripUseCases.ts:171-195`: dentro de `sequelize.transaction`, `:172` usa `findByIdForUpdate(..., transaction)`, `:180` e `:192` passam `transaction` — e `:194` faz `return this.tripRepository.findById(trip.id);` **sem a transação**. Em READ COMMITTED, essa leitura corre por outra conexão e devolve o estado **anterior** ao update ainda não commitado: a resposta de `POST /trips/:id/return` pode sair com `status:'out'` e sem `return_km`. **Contraste exato no mesmo repositório:** `ReceiveImportProcessUseCase.ts:200` — `return this.comexRepository.findImportProcessById(input.id, input.transaction);` — passa a transação. Confiança MEDIUM: o desfecho depende do nível de isolamento efetivo → `DYN-T16-04`.

**T16-F07 (MEDIUM/HIGH).** `VehicleDocumentUseCases.ts:73-84`: `update(document.id, { status: 'renovado' })` e depois `create({... status:'vigente' })`, **sem transação**. Se o `create` falhar, o documento anterior fica `renovado` e não há nenhum `vigente` — e é exatamente `findLatestByAssetAndType` que alimenta os gates E1/E2 de saída de veículo (`TripUseCases.ts:99,105`). Falha parcial afrouxa ou trava o controle de CRLV/seguro conforme o caso.

---

#### T16-F08 · T16-F09 · T16-F10 · T16-F11 — `facilities`, qualidade de regra

**T16-F08 (LOW/HIGH).** `FineUseCases.ts:23-28` (`syncExpiredIndication`) executa `fineRepository.update(fine.id, { indication_status: 'expired_nic' })` — mutação de um status com efeito legal (CTB art. 257 §7º) — **a partir de endpoints GET**: `ListFinesUseCase.execute` (`:38`, num `Promise.all` sobre a página inteira — N escritas por leitura) e `GetFineByIdUseCase.execute` (`:52`). Sem transação, sem `logAction` (o controller só audita nas rotas de escrita — `fineController.ts:56,85,101,121,140`). GET deixa de ser seguro e a transição de estado mais sensível do módulo **não tem trilha de auditoria**.

**T16-F09 (LOW/HIGH).** Atos sem qualquer guarda de estado: `AppealFineUseCase` (`FineUseCases.ts:168-172` — recorre de multa já `paid`, ou recorre duas vezes); `ChargeDriverFineUseCase` (`:203-207`); `AuthorizeDriverUseCase` (`DriverUseCases.ts:93-98` — reautoriza condutor suspenso sem examinar validade de CNH, que só é checada na saída); `SuspendDriverUseCase` (`:108-118` — sobrescreve `notes`, perdendo o histórico). Contraste: `CancelTripUseCase.ts:211-213` e `DepartTripUseCase:90` **têm** a guarda.

**T16-F10 (LOW/HIGH).** A regra de sugestão de condutor está duplicada **verbatim**: `FineUseCases.ts:101-111` (`CreateFineUseCase.suggestDriver`) e `:124-133` (`SuggestFineDriverUseCase.execute`) — mesmas 50 linhas de janela, mesmo `limit: 50`, mesma comparação de intervalo. Divergirão na primeira correção.

**T16-F11 (LOW/HIGH).** `vehicleController.ts:140` e `:160` passam apenas `docId: Number(req.params.docId)`; `RenewVehicleDocumentUseCase` (`VehicleDocumentUseCases.ts:69`) e `ReleaseVehicleDocumentUseCase` (`:101`) buscam só por id. **Nunca é verificado que o documento pertence ao `:assetId` da URL** — o segmento é decorativo. Não cruza fronteira de privilégio (o módulo é o mesmo), mas quebra o contrato de recurso aninhado e polui a auditoria (`:126` registra "para o veículo #${req.params.assetId}" a partir de valor não verificado). O caminho de criação **está correto** (`:118` força `asset_id` do parâmetro).

---

#### T16-F12 · T16-F13 · T16-F14 · T16-F15

**T16-F12 (LOW/HIGH).** `ConvertLeadUseCase.ts:113-119` e `UploadMaterialFileUseCase.ts:69-75`: `catch { }` com comentário e **nenhum registro** — sem `logger`, sem `logAction`, sem contador. O recálculo de métricas de campanha e a remoção de arquivo órfão falham de forma **invisível**. A decisão de não propagar é defensável; a de não registrar não é: métrica de campanha divergente e arquivo órfão em disco ficam sem rastro de causa. (`RequestTerminationAsoUseCase.ts:41-43`, fora do meu escopo, tem o mesmo padrão — encaminhado a T-12.)

**T16-F13 (LOW/MEDIUM).** `FineUseCases.ts:16` — `Number(process.env.FACILITIES_FINE_INDICATION_DEADLINE_DAYS ?? 30)`, avaliado no carregamento do módulo, **sem validação**. Valor não numérico ⇒ `NaN` ⇒ `deadline.setDate(NaN)` (`:78`) ⇒ Data inválida ⇒ `.toISOString()` (`:79`) lança `RangeError` ⇒ **500 em toda criação de multa**. Segundo ponto, de regra: `indication_deadline` só é calculado **se `notice_received_at` for informado** (`:76-80`), e o campo é opcional (`fineValidators.ts:19`) — sem ele a multa nasce sem prazo e `syncExpiredIndication` nunca dispara. O prazo legal fica silenciosamente ausente. Confiança MEDIUM na segunda parte: pode ser decisão de negócio → cruzar com T-14.

**T16-F14 (LOW/HIGH).** Dois padrões estruturais convivem **dentro do mesmo módulo**: um use-case por arquivo (`facilities/application/use-cases/vehicle/CreateVehicleUseCase.ts`, `area/*`, `fuelRecord/*`, `cleaningSchedule/*`) **e** agrupamento por agregado (`fine/FineUseCases.ts`, `trip/TripUseCases.ts`, `driver/DriverUseCases.ts`, `visit/VisitUseCases.ts`, `reservation/ReservationUseCases.ts`, e mais 5). O agrupado exporta classes nomeadas (`export class`); o unitário usa `export =`. Efeito prático: a busca por "onde está o use-case de X" tem duas respostas possíveis, e o arquivo agrupado concentra 8 casos de uso de multa em 209 linhas — inclusive o financeiro (T16-F02). No eixo de validação, `facilities` e `marketing` têm validador Zod estrito por recurso (`fineValidators.ts`, `vehicleValidators.ts`, `campaignValidators.ts`), `comex` também, e **`ti` e `reports` não** (T16-F04c e §4).

**T16-F15 (LOW/MEDIUM) — encaminhado ao `appsec-auditor` (T-18), não julgado aqui.** `vehicleValidators.ts:63` e `:70` aceitam `file_path: z.string().trim().max(500)` **do corpo da requisição**, sem passar por `uploadService`, e o valor é persistido direto (`VehicleDocumentUseCases.ts:55,82`). Caminho arbitrário controlado pelo cliente gravado em campo de arquivo. Veredito de segurança **não é meu** (§ mandato); registro o fato e a âncora.

---

### 4. Conformidades provadas — mesmo peso das não conformidades

Registradas com âncora, porque o valor do relatório está tanto no que resiste quanto no que quebra.

- **`comex` é o módulo mais bem construído do tier 3 auditado, e não por pouco.** Segregação de funções real e nomeada (`ApproveImportProcessUseCase.ts:82-88`, regra `D-K-COMEX`), leitura com lock antes de decidir (`:66`), guarda de status que impede aprovação retroativa (`:74-79`), unicidade de papel aprovador (`:100-106`), papel resolvido **só** por RBAC (`importProcessController.ts:53-57`), transação com `rollbackIfPending` em **todas** as 5 escritas (`:111,136,158,185,208,233,240,262,269,293`), e a entrada em estoque **reusando** o serviço compartilhado em vez de duplicar (`ReceiveImportProcessUseCase.ts:166-192`, `receiveMaterialIntoQuarantine`) — com quarentena, lote e rastro de origem correto. É o padrão de referência contra o qual T16-F01, F02 e F05 se medem.
- **`reports` (8/8) resiste em todas as dimensões que auditei.** SQL bruto **sempre parametrizado** com `replacements` (`SequelizeReportsRepository.ts:96,121,145,173,191,210,278,316,375,416`); a única interpolação de string, `${workCenterFilter}` (`:373,414`), é um **literal constante** escolhido por booleano (`:357`), não entrada do usuário. Período validado com erro de domínio (`reportPeriod.ts:25-33,54-60`), divisão protegida (`:69-72`). **Injeção de fórmula em CSV neutralizada** (`csvExporter.ts:20-32`) e escape RFC 4180 correto. AuthZ granular por sub-permissão real do SSOT — `relatorios.financeiro|producao|compras|custos` existem em `accessModules.ts:242-245,357-360`, não são chaves inventadas.
- **Autenticação: 174/174.** Todo endpoint em profundidade está autenticado, seja por gate de router (`facilities.ts:42`, `ti.ts:30`, `marketing.ts:37`) seja inline (`engineering`, `comex`, `reports`, `workCenters`). **Nenhuma rota é declarada antes do `router.use(authenticate)` nos três routers com gate** — a Falha 2 de `FIND-ERP-005` **não se repete** em nenhum módulo do meu escopo. Confirma e corrobora T-04 §5 por leitura independente.
- **Regra 24 — não violada em nenhum dos 174.** Varredura dirigida por `req.body|query|headers|params` × `role|userRole|isAdmin|perfil|permission`: **nenhuma ocorrência em `facilities`, `ti`, `marketing`, `engineering`, `comex`, `reports`, `workCenters`**. Toda decisão lê `req.user`. Comparações estritas onde importa: `accessRequestController.ts:85,100` (`=== 'approve'`), `ticketController.ts:54` (`===` de posse), `importProcessController.ts:55` (`role === 'admin'`). Corrobora o veredito de T-04 §4 em uma superfície diferente.
- **Anti-spoofing explícito e correto** em `BudgetDecisionUseCase.ts:57` (`budget_approved_by` de `req.user.id`), `materialController.ts:126`, `engineeringController.ts:196`, `fineController.ts:83,160`.
- **`TripUseCases` — apesar de F05/F06, o miolo é bom:** guardas de estado em todas as transições (`:90,174,211`), `findByIdForUpdate` no retorno (`:172`), regra de hodômetro exigindo **justificativa + nível `approve`** para retroatividade (`:132-146`) e gravando quem aprovou (`:141-145`).
- **Trilha de auditoria consistente em `facilities`, `marketing`, `engineering` e `comex`:** `logAction` em todas as escritas dos controllers lidos, com `oldValues`/`newValues` onde aplicável. Exceção: os GETs que escrevem (T16-F08).
- **Tratamento de erro homogêneo e sem vazamento:** o padrão é `catch → next(error)` com tradução de erro Zod para `ValidationError` (`fineController.ts:34-37`, `vehicleController.ts:43-46`, `campaignController.ts:57-60`, `importProcessController.ts:73-78,91-95`). **Nenhum ponto do escopo devolve stack, mensagem de driver ou SQL ao cliente.** Nenhum `catch` genérico que engula erro e responda 200. Os dois `catch {}` de F12 são efeitos colaterais deliberados, não engolimento de erro de fluxo principal.
- **`authorizeSelfOrModule` é sólido:** posse sempre resolvida por callback do chamador, nunca por parâmetro de rota (`authorizeSelfOrModule.ts:67-74`), negativa **auditada** (`:81-89`), e `requiredLevel='approve'` não é satisfeito por `operate` (`:61`).
- **`ti` acerta a granularidade de autosserviço:** `ti.ts:42,49,50,52,53` usam posse; `:82,83` usam elegibilidade de aprovador; a fila completa (`:41`) exige módulo. O desenho está certo — o defeito de T16-F01 é de **regra**, não de roteamento.

---

### 5. Varredura rasa — **43 endpoints, DECLARADOS NÃO-PROFUNDOS**

> **Estes 43 NÃO foram auditados em profundidade.** Só duas colunas: presença de autenticação/autorização e presença de validação de entrada. **Nenhuma regra de negócio destes módulos foi examinada. Nenhuma conclusão sobre correção funcional deles pode ser extraída deste relatório.**

| Módulo | Qtd | AuthN + AuthZ (arquivo:linha) | Validação de entrada |
|---|---|---|---|
| `clients` | 5 | `authenticate` + `authorizeModule('clientes')`; delete em `approve` — `clients.ts:19-23` | **Zod na borda** (`clientValidators.ts`) |
| `employees` | 5 | GET só `authenticate` (`employees.ts:19-20`); POST/PUT/DELETE `authorize('admin')` (`:21-23`). Filtro de campo sensível fora da borda, nos use-cases (`:9-16`) — coincide com T-04 §6 | Imperativa nos use-cases (`Create/UpdateEmployeeUseCase`) |
| `maintenance` | 5 | `authorizeModule('manutencao')`, delete `approve` — `maintenance.ts:19-23` | Imperativa (`CreateMaintenanceOrderUseCase`) |
| `serviceOrders` | 5 | `authorizeModule('garantia')`, delete `approve` — `serviceOrders.ts:19-23` | Imperativa (`CreateServiceOrderUseCase`) |
| `nonConformities` | 5 | `authorizeModule('qualidade')`, delete `approve` — `nonConformities.ts:17-21` | Imperativa (`CreateNonConformityUseCase`) |
| `spreadsheetImport` | 5 | `authenticate` + **dois** `authorizeModule` em série (`produtos` **e** `bom`, ambos `operate`) nas rotas de escrita — `catalogImport.ts:31-47` | Imperativa (`ImportCatalogSpreadsheetUseCase`) + `spreadsheetUpload` |
| `intelligentAuditor` | 4 | `authenticate` + `authorize('admin')`, 4/4 — `intelligentAuditor.ts:12-15` | n/a (4 GET sem corpo) |
| `quality` | 3 | `authorizeModule('qualidade')`; escrita em `operate` — `qualityInspections.ts:23-25` | Imperativa (`CreateQualityInspectionUseCase`) |
| `laboratory` | 3 | `authorizeModule('laboratorio')` **+** `authorize('admin','operator')` na escrita — `laboratory.ts:24-26` | **Zod na borda** (`laboratoryValidators.ts`) |
| `dashboard` | 3 | `authorizeModule('dashboard')`, 3/3 — `dashboard.ts:27-29` | n/a (3 GET sem corpo) |

**Resultado da varredura rasa:** 43/43 autenticados; 43/43 com algum mecanismo de autorização; 0 endpoints sem autorização por descuido. Validação de entrada presente em 100% dos endpoints de escrita, porém **esquema declarativo na borda só em `clients` e `laboratory`** — os demais validam imperativamente no use-case, o que sustenta T16-F14 e é **observação de presença, não juízo de suficiência**. `catalogImport.ts:31-47` merece nota positiva: é o único ponto do tier 3 que exige **dois módulos simultâneos** para uma escrita que atravessa dois domínios.

---

### 6. Pedidos de evidência dinâmica — `vericore-audit-verification-runner`, banco `erp_evok_audio_test`

Nenhuma conexão foi aberta por esta trilha. **Nenhuma sondagem pode tocar `erp_evok_audio`.**

| ID | O que verificar | Comando/ação exata | Por que o estático não basta |
|---|---|---|---|
| **DYN-T16-01** | Duplo pagamento de multa | `POST /api/facilities/fines/:id/pay` **duas vezes** com perfil `facilities:'approve'`; contar linhas em `accounts_payable` com `description LIKE 'Multa %'` e comparar `accounts_payable_id` da multa | Só a DDL/execução prova se existe UNIQUE que impeça o 2º título (T16-F02) |
| **DYN-T16-02** | Upload de material nos formatos documentados | `POST /api/marketing/materials/:id/file` com `.mp4`, `.docx` e `.pptx` reais (bytes verdadeiros), perfil `marketing:'operate'` | 400 ⇒ T16-F03 confirmado; 201 ⇒ minha leitura de `deriveAllowedMimes` está errada e o finding cai |
| **DYN-T16-03** | Escalada RBAC via TI | Usuário **sem** `admin`, com `ti:'operate'`, cujo `users.id` = `employees.user_id` do `departments.manager_id` de um departamento D: `POST /api/ti/access-requests {type:'grant', employee_id:<o próprio>, department_id:D, requested_profile_id:<perfil com diretor/financeiro>}` → `POST /:id/approve` → `POST /:id/execute`; depois reautenticar e ler `GET /api/auth/me` | 200/200/200 + perfil efetivamente trocado ⇒ **T16-F01 confirmado**. É o pedido de maior prioridade da trilha |
| **DYN-T16-03b** | Mesma cadeia com `ti:'approve'` e **sem** ser gestor | idem, sem passo de gestor | Mede se `ti:approve` sozinho já é administrador de RBAC de fato |
| **DYN-T16-03c** | Segregação de funções | Na cadeia acima, solicitante = aprovador | Espera-se 4xx se houvesse SoD; **200 confirma a ausência** (contraste com `D-K-COMEX`) |
| **DYN-T16-04** | Leitura fora da transação | `POST /api/facilities/trips/:id/return` e comparar o corpo da resposta com `GET /trips/:id` imediatamente depois | Se a resposta trouxer `status:'out'` e `return_km` nulo e o GET trouxer `returned` ⇒ T16-F06 confirmado |
| **DYN-T16-05** | TOCTOU de saída de veículo | Duas requisições **concorrentes** `POST /trips/:idA/depart` e `/trips/:idB/depart` para o **mesmo** `asset_id` | Duas saídas `out` simultâneas ⇒ T16-F05 confirmado |
| **DYN-T16-06** | Renovação parcial de documento | `POST /vehicles/:assetId/documents/:docId/renew` forçando falha no `create` (ex.: `valid_until` inválido para a coluna) e conferir o status do documento anterior | Documento anterior em `renovado` sem `vigente` ⇒ T16-F07 |
| **DYN-T16-07** | Forja de atribuição de chamado | `POST /api/ti/tickets/:id/assign` com `{"assignedTo": <id de outro usuário>}`, perfil `ti:'operate'` | `assigned_to` ≠ solicitante ⇒ T16-F04a |
| **DYN-T16-08** | Chamado "gerado pelo sistema" | `POST /api/ti/tickets` com `{"subject":"x","description":"y","category_id":<válido>,"systemGenerated":true}`, usuário **sem nenhum módulo** | `requester_id NULL` e `system_generated=true` ⇒ T16-F04b (e depende de a coluna ser nullable) |
| **DYN-T16-09** | Escrita em GET | `GET /api/facilities/fines/:id` de multa com `indication_deadline` no passado e `indication_status='pending'`; conferir mutação e ausência de `audit_logs` | Confirma T16-F08 nas duas pernas |
| **DYN-T16-10** | Recurso aninhado decorativo | `POST /vehicles/<assetId de A>/documents/<docId de B>/release` | 200 ⇒ T16-F11 |
| **DYN-T16-11** | Prazo legal por env | Subir com `FACILITIES_FINE_INDICATION_DEADLINE_DAYS=abc` e `POST /fines` com `notice_received_at` | 500 ⇒ T16-F13 |
| **DYN-T16-12** | Regra 24, negativa | `role`/`isAdmin`/`permissions` em body, query e header em `POST /facilities/fines/:id/pay`, `POST /marketing/campaigns/:id/budget-decision` e `POST /comex/import-processes/:id/approve` | Nenhum efeito ⇒ confirma a conformidade que declaro em §4 |

---

### 7. Escalonamentos (Regra 20 — evidência, nunca conciliação silenciosa)

1. **Ao `vericore-software-audit-director`, com T-04 e T-09 presentes — premissa mitigante de `AUD-SEC-T04-01`.** T-04 §1.3 justifica MEDIUM em parte porque "conceder o módulo `diretor` é ato administrativo" e "CRUD de perfis é exclusivo de `admin`". **T16-F01 demonstra que a *atribuição* de perfil não é exclusiva de `admin`.** Não altero severidade alheia. Peço arbitragem sobre se a premissa se sustenta e se `AUD-SEC-T04-01` deve ser reavaliado à luz da cadeia `ti → diretor → aprovação de compra`. Pedido dinâmico correspondente: `DYN-T16-03` + `DYN-04.1` de T-04, executados na sequência, no mesmo ambiente.
2. **Ao `vericore-appsec-auditor` (T-18):** T16-F15 (`file_path` livre do cliente em `vehicleValidators.ts:63,70`) e o comportamento de `deriveAllowedMimes`/`validateFileMagic` (`uploadService.ts:168-179`, `validators.ts:207-222`) — a lógica de `:221` **libera qualquer conteúdo quando a lista derivada fica vazia**, o que ainda vale para chamadores cujas extensões não estejam no mapa. Veredito de segurança não é meu.
3. **Ao `vericore-authorization-auditor` (co-titular desta trilha):** T16-F01 é tanto backend quanto authZ. Proponho co-autoria formal e que o co-titular assine o eixo de autorização antes de ir ao validador.
4. **A T-14 (regras de negócio):** T16-F13 segunda perna (prazo legal ausente quando `notice_received_at` não é informado) e T16-F09 (transições sem guarda) podem ser decisão de negócio registrada, e não defeito. Não invento a regra (Regra 6).
5. **A T-13 (dados/schema):** nulabilidade de `it_tickets.requester_id` (T16-F04b) e constraints de `accounts_payable` (T16-F02).
6. **Ao diretor, sobre `RES-T16-06`:** `RegisterImportTrackingUseCase` é o gate que consome a alçada G11-COMEX e é o **único item G3-crítico do meu escopo que ficou sem leitura**. Recomendo alocá-lo explicitamente — a T-16 numa continuação, ou a T-10.

---

### 8. Esforço e arquivos lidos

**Estimado 5 S · Real ≈1,5 S** (~30 chamadas de leitura). O desvio **não** significa que o escopo era barato: significa que D1/D2/D3 são enumeráveis por varredura de arquivos de rota (barato) e que **D4-D8 custa leitura de use-case por endpoint** (caro) — foi aí que o orçamento acabou, com ≈52% de cobertura em D4-D8. **A lição do SIM-002 aplicada honestamente: o ganho veio da dimensão fácil; a dimensão cara ficou parcialmente aberta e está declarada como tal, não maquiada.**

**Arquivos lidos (caminhos absolutos):**

*Plano e interface:* `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\02-plan\AUDIT_PLAN.md` (§4.4) · `...\07-findings\T-04_TRANSVERSAL_AUTHZ.md` (integral)

*Rotas (profundidade):* `server\src\modules\facilities\presentation\routes\facilities.ts` · `...\ti\...\ti.ts` · `...\marketing\...\marketing.ts` · `...\engineering\...\engineering.ts` · `...\comex\...\importProcesses.ts` · `...\reports\...\reports.ts` · `...\workCenters\...\workCenters.ts`

*Rotas (rasa):* `clients.ts` · `employees.ts` · `maintenance.ts` · `serviceOrders.ts` · `nonConformities.ts` · `catalogImport.ts` · `intelligentAuditor.ts` · `qualityInspections.ts` · `laboratory.ts` · `dashboard.ts`

*Controllers:* `facilities\...\fineController.ts` · `vehicleController.ts` · `ti\...\accessRequestController.ts` · `licenseController.ts` · `ticketController.ts` · `marketing\...\campaignController.ts` · `comex\...\importProcessController.ts` · `reports\...\reportController.ts` · `engineering\...\engineeringController.ts` (parcial)

*Use-cases e serviços:* `facilities\application\use-cases\fine\FineUseCases.ts` · `trip\TripUseCases.ts` · `driver\DriverUseCases.ts` · `vehicleDocument\VehicleDocumentUseCases.ts` · `facilities\infrastructure\adapters\AccountPayableServiceAdapter.ts` · `ti\application\use-cases\accessRequest\{Create,Approve,Execute,UpdateChecklist}*.ts` · `ti\application\use-cases\ticket\{CreateTicket,AssignTicket,ConfirmTicket}UseCase.ts` · `ti\domain\services\approverEligibilityService.ts` · `ti\infrastructure\adapters\AccessProfileExecutionServiceAdapter.ts` · `users\application\use-cases\AssignAccessProfileUseCase.ts` · `users\presentation\routes\users.ts` · `marketing\application\use-cases\lead\ConvertLeadUseCase.ts` · `material\UploadMaterialFileUseCase.ts` · `campaign\BudgetDecisionUseCase.ts` · `comex\application\use-cases\{ApproveImportProcess,ReceiveImportProcess}UseCase.ts` · `reports\application\use-cases\reportPeriod.ts` · `reports\infrastructure\export\csvExporter.ts` · `reports\infrastructure\sequelize\SequelizeReportsRepository.ts` (parcial)

*Validadores e transversais:* `facilities\presentation\validators\{fine,vehicle}Validators.ts` · `ti\presentation\validators\accessRequestValidators.ts` · `marketing\presentation\middlewares\materialFileUpload.ts` · `server\src\services\uploadService.ts` · `server\src\utils\validators.ts` · `server\src\middlewares\authorizeSelfOrModule.ts` · `server\src\middlewares\auth.ts` (parcial) · `server\src\shared\domain\accessModules.ts` (parcial)

*Testes:* `server\tests\unit\marketing-material-use-cases.test.ts`

**Nada foi escrito em disco. Nenhum banco foi contatado. Nenhum código foi executado. Nenhum finding é declarado confirmado, aprovado ou fechado — todos saem `PROPOSED`.**
