```
CLUSTER: pessoas-governanca (ERP-LEGACY-001, passo 28 — casos de uso recuperados)
MÓDULOS: rh, sst, directorate, juridico, ti, facilities, marketing, reports, dashboard,
         intelligentAuditor, spreadsheetImport, webhooks  (server/src/modules/<módulo>/)
MÉTODO: READ→ANALYZE→VERIFY(código como evidência)→CROSS-CHECK(doc como objeto de auditoria).
        Read/Grep/Glob apenas. Nenhum comando, teste ou conexão de banco executado.
AUDIT_COMMIT de referência declarado pelo orquestrador: f05e865 (não segui HEAD automaticamente).
RESSALVA: tudo abaixo é DISCOVERED_USE_CASE — recuperado do código, NÃO validado por humano.
PROFUNDIDADE: alta em rh(admissão/rescisão), juridico(contrato/alçada), sst(CAT), directorate;
        rasa e declarada como tal nos módulos de suporte (§ suporte).
FINDINGS EXISTENTES (referenciados, NÃO reauditados): FIND-ERP-005 (JUR alçada), FIND-ERP-006
        (LGPD), FIND-ERP-007 (RH rescisão), FIND-ERP-008 (SST).
BR-IDs citados = candidatos do passo 26 (BUSINESS_RULE_CANDIDATES_pessoas-governanca.md).
```

# USE_CASES_RECOVERED_pessoas-governanca

## Nota metodológica sobre a numeração de UC no catálogo (achado transversal)

O catálogo oficial (`docs/projeto/04-USE_CASES.md`) **reusa IDs de UC**, o que quebra a Regra 17 (IDs padronizados e rastreáveis):

- **UC-52** = Facilities (SUBSTITUÍDO, :2216) **e** UC-52-JUR = Contratos jurídicos (:2387) **e** UC-52 do Bloco 3 interno. O próprio doc admite a colisão em :2372-2380 e cria o sufixo `-JUR` como paliativo.
- **UC-53** = Marketing (:2313) **e** UC-53-JUR = Contencioso (:2406).
- **UC-71** = "Cadastrar e Liberar Roteiro de Produção" no doc (:2612) **e** `UC-71 = Afastamentos` no código (`rh.ts:121`). **Colisão código × doc**, dois casos de uso distintos com o mesmo ID.
- Os UC-IDs recuperados neste artefato usam o prefixo próprio `UC-PESGOV-NN` para não herdar essa colisão; a coluna "classificação vs. doc" aponta o UC-ID do catálogo quando existe.

---

## 1. RH — profundidade alta (admissão/rescisão)

### UC-PESGOV-01 — Abrir processo de admissão
- **Objetivo:** registrar candidato/admissão em `documentos_pendentes` com checklist de documentos exigidos zerado.
- **Atores:** `rh:operate` (+ `admin` curto-circuito) — `rh.ts:75`.
- **Gatilho:** `POST /api/rh/admission-processes` — `rh.ts:75` → `admissionController.create`.
- **Fluxo principal:** `CreateAdmissionProcessUseCase.ts:44-68` — valida `candidate_name`/`department_id`/`planned_start_date` (400 se ausentes), monta flags de checklist em `false`, grava `status='documentos_pendentes'`.
- **Exceções:** `ValidationError` 400 (campos obrigatórios) — `:45-47`.
- **Pós-condição / invariante:** nenhum item nasce "recebido" (`:50-54`); recebimento só via `POST .../checklist`.
- **BRs:** — (sem BR-ID; regra de campos obrigatórios). **Vs. doc:** `CONFIRMED` (UC-69, :2558-2566).

### UC-PESGOV-02 — Confirmar resultado do ASO admissional
- **Objetivo:** gravar `aso_result`/`aso_confirmed_at`/`aso_valid_until` que satisfazem o gate de conclusão.
- **Atores:** `rh:operate` — `rh.ts:77`.
- **Gatilho:** `PATCH /api/rh/admission-processes/:id/aso-confirmation` — `rh.ts:77`.
- **Fluxo principal:** `ConfirmAdmissionAsoResultUseCase.ts:50-64` — valida enum `apto|inapto|apto_com_restricao`, grava snapshot no próprio `AdmissionProcess`.
- **Alternativos:** `POST .../request-aso` (`rh.ts:76`) muda status para `aso_pendente`; `POST .../checklist` (`rh.ts:78`); `PATCH .../esocial-confirmation` (`rh.ts:80`); `POST .../cancel` (`rh.ts:81`).
- **Exceções:** 400 enum inválido; 404 processo; 422 já `concluida`/`cancelada` (`:51-58`).
- **Vs. doc:** **CONFLITANTE** — o próprio use case declara (`:5-16`) que este endpoint **não existe no contrato** `BLOCO_6_RH_API.md §4`; sem ele o gate de UC-69 nunca poderia ser satisfeito. Endpoint real que a doc de API não previu (documentation drift confirmado no código).

### UC-PESGOV-03 — Concluir admissão (transacional) — PROFUNDO
- **Objetivo:** materializar o funcionário: `employees` + contrato inicial + histórico de cargo + 1º período aquisitivo de férias, em transação única.
- **Atores:** `rh:operate` — `rh.ts:79`.
- **Gatilho:** `POST /api/rh/admission-processes/:id/conclude` — `rh.ts:79`.
- **Fluxo principal:** `ConcludeAdmissionProcessUseCase.ts:93-195` — 404 se não existe; valida `employee.*` e CPF (`Validators.isValidCPF`, `:103`); **gate de ASO** `apto`/`apto_com_restricao` e validade (`:119-127`, RF-RH-008/030); teto de 90 dias se experiência (`:129-135`, BR-RH-D04); transação (`:137-194`) cria employee via `EmployeeDirectoryService`, contrato `ativo`, job history `admissao`, `status='concluida'`, e abre férias (`:184-191`, RF-RH-031, Art. 130 CLT).
- **Exceções:** 400 campos/enum; 404 processo; 409 CPF duplicado (`:151-153`); 422 ASO pendente/vencido, já concluída, experiência > 90d.
- **Invariantes:** funcionário, contrato e férias nascem atômicos; `work_regime='experiencia'` nunca gravado (nota `:15-23`, divergência de schema com o contrato de API).
- **BRs:** BR-RH-D04. **Vs. doc:** `CONFIRMED` (UC-69, :2558-2566) com ressalva de que a divergência `work_regime` é registrada só no HANDOFF, não no UC.

### UC-PESGOV-04 — Prorrogar contrato de experiência
- **Objetivo:** estender uma única vez o `period_2_end_date`.
- **Atores:** `rh:operate` — `rh.ts:86` (rota `.../extend`) e `rh.ts:87` (`decision='prorrogar'`, cai em `operate` por `authorizeContractDecision`).
- **Gatilho:** `PATCH .../employee-contracts/:id/extend` **e** `PATCH .../decision {decision:'prorrogar'}`.
- **Fluxo principal:** `DecideEmployeeContractUseCase.ts:70-73` → `ExtendEmployeeContractUseCase`; teto 90d e rejeição da 2ª prorrogação em `experienceContractRules.ts:36-61`.
- **BRs:** BR-RH-D04, BR-RH-D05 (2ª prorrogação = `SECOND_EXTENSION_REJECTED`, desvio DOCUMENTADO do Art. 451). **Vs. doc:** `CONFIRMED` (UC-68, :2546-2556).

### UC-PESGOV-05 — Decidir contrato de experiência (efetivar/rescindir) — PROFUNDO + alçada
- **Objetivo:** efetivar (novo contrato indeterminado) ou rescindir (abre demissão) o contrato de experiência.
- **Atores:** **alçada decidida pelo corpo da requisição** — `authorizeContractDecision` (`rh.ts:67-70`): `decision==='rescindir'` exige `rh:approve`; `efetivar`/`prorrogar` exigem `rh:operate`.
- **Gatilho:** `PATCH /api/rh/employee-contracts/:id/decision` — `rh.ts:87`.
- **Fluxo principal:** `DecideEmployeeContractUseCase.ts:60-108` — valida enum `prorrogar|efetivar|rescindir`; exige contrato `ativo`/`prorrogado` (`:66-68`); `efetivar` (`:75-93`) transação: fecha `efetivado` + cria novo `indeterminado`; `rescindir` (`:100-107`) abre `HrTerminationProcess` com parâmetros fixos.
- **Exceções:** 400 enum; 404 contrato; 422 status inválido; 409 se já houver processo de demissão aberto (herdado de UC-PESGOV-06).
- **Invariantes / conflitos verificados:**
  - `termination_reason` é aceito e validado mas **silenciosamente descartado** — `DecideEmployeeContractUseCase.ts:24-30` (declarado) × `:100-107` (não usado) — **BR-RH-D02**.
  - `notice_modality='trabalhado'` hard-coded (`:104`) — presunção trabalhista não documentada — **BR-RH-D03**.
  - a alçada depende de `req.body.decision` lido pelo middleware **antes** do Zod; garantia de que não escala é acidental (BR-RH-D01, LACUNA-3 de segregação).
- **BRs:** BR-RH-D01, BR-RH-D02, BR-RH-D03. **Referencia FIND-ERP-007** (RH rescisão) — não reauditado.
- **Vs. doc:** **CONFLITANTE** — UC-68 (:2553-2556) descreve `rescindir` sem mencionar descarte de `termination_reason` nem `notice_modality` fixo; `BLOCO_6_RH_API.md:542` documenta conflito 409×422.

### UC-PESGOV-06 — Abrir processo de demissão
- **Atores:** `rh:operate` — `rh.ts:93`.
- **Gatilho:** `POST /api/rh/termination-processes` — `rh.ts:93`.
- **Fluxo principal:** `CreateTerminationProcessUseCase.ts:51-92` — valida obrigatórios e enums `termination_type`/`notice_modality`; **409** se já houver processo aberto (`findOpenByEmployeeId`, `:62-65`); calcula sugestões (aviso prévio Lei 12.506/2011, `:77-88`) sem gravar `payment_deadline` (coluna gerada, `:5-8`).
- **Vs. doc:** `CONFIRMED` (UC-70, :2568-2579). Ressalva: doc de API classifica o duplicado como 422; código usa 409 (BR-RH-D03).

### UC-PESGOV-07 — Concluir demissão (transacional, approve) — PROFUNDO
- **Objetivo:** desligar funcionário e desativar login no mesmo ato.
- **Atores:** `rh:approve` — `rh.ts:99` (única ação `approve` fixa do módulo além da rescisão).
- **Gatilho:** `POST /api/rh/termination-processes/:id/conclude` — `rh.ts:99`.
- **Fluxo principal:** `ConcludeTerminationProcessUseCase.ts:56-100` — 404; gate de **checklist de ativos** (`assetService.listByResponsible`, 422 se algum não devolvido, `:63-69`, RF-RH-023); gate de **ASO demissional** (`hasValidAso`, `:71-74`, RF-RH-020); transação: `employees.status='fired'` + `dismissal_date` (`:82-86`), `userAccountService.deactivate` se `user_id` (`:88-90`), `status='concluido'`.
- **Exceções:** 404; 422 checklist pendente / ASO pendente / já concluído.
- **Invariante:** desativação de login pula sem erro se `user_id` null (`:88`).
- **Vs. doc:** `CONFIRMED` (UC-70, :2568-2586, inclui bloqueio de `DELETE /api/employees/:id` — reconciliação achado 13; não verificado neste passo, é da rota antiga).

### UC-PESGOV-08 — Instruir demissão (ASO/TRCT/eSocial/checklist de ativos)
- **Atores:** `rh:operate` (leituras em `rh`) — `rh.ts:90-97`.
- **Gatilhos/fluxos:** `POST .../request-aso` (`:94`), `PATCH .../aso-confirmation` (`:95`), `POST .../trct` upload (`:96`, `AttachTrctUseCase`), `PATCH .../esocial-confirmation` (`:97`), `GET .../asset-checklist` (`:92`, `GetAssetChecklistUseCase`).
- **Vs. doc:** `CONFIRMED` (UC-70, ações auxiliares).

### UC-PESGOV-09 — Gerir férias (período aquisitivo + agendamento) — média
- **Atores:** leitura `rh`, escrita `rh:operate` — `rh.ts:110-119`.
- **Gatilhos:** `GET .../vacation-accrual-periods*`, `POST .../:id/recalculate`, `GET .../vacation-schedules(/calendar)`, `POST .../vacation-schedules`, `.../revise`, `.../confirm-taken`.
- **Fluxo principal:** regras puras em `domain/services/vacationRules.ts` (Art. 130/133/134/135/137/143 CLT); período aquisitivo **nunca nasce por POST** (`rh.ts:108-109`), só na conclusão da admissão; `revise` grava novo registro encadeado (`superseded_by_id`).
- **Vs. doc:** `CONFIRMED` (UC-67, :2512-2544).

### UC-PESGOV-10 — Gerir afastamentos (com dado de saúde `cid`)
- **Atores:** leitura `rh`, escrita `rh:operate` — `rh.ts:125-129`.
- **Gatilhos:** `GET/POST /absences`, `PATCH .../return`, `PATCH .../esocial-confirmation`.
- **Invariante LGPD:** `cid` sanitizado por interseção `rh`+`sst`/admin no controller (`absenceController` via `rhSensitiveFields.sanitizeAbsence`) — **BR-RH-D06** (omite campo, nunca 403).
- **Vs. doc:** **CONFLITANTE / FANTASMA** — no código o comentário marca `UC-71` (`rh.ts:121`), mas o catálogo atribui **UC-71 a "Roteiro de Produção"** (:2612) e lista Afastamentos como grupo P1 **adiado para "passada 2"** (:2507). O comportamento está implementado apesar de a doc dizer que não. **Colisão de UC-ID + comportamento implementado sem UC próprio.** Referencia **FIND-ERP-006** (LGPD, dado de saúde) — não reauditado.

### UC-PESGOV-11 — Documentos do funcionário
- **Atores:** leitura `rh`, escrita `rh:operate` — `rh.ts:102-105`.
- **Gatilhos:** `GET/POST/PUT /employee-documents` (upload via `rhFileUpload`).
- **Vs. doc:** `CONFIRMED` (é o gate de ASO citado em RF-RH-027 a 030, UC-69/70).

### UC-PESGOV-12 — Benefícios / Treinamentos RH / Frequência-Ponto (grupos P1/P2)
- **Atores:** leitura `rh`, escrita `rh:operate` — `rh.ts:132-157`.
- **Gatilhos:** `benefit-types`/`employee-benefits` (`:132-139`), `training-courses`/`employee-trainings`/`cannot-operate-report` (`:142-148`), `attendance/monthly-summary`/`time-imports`/`:id/confirm` (`:153-157`).
- **Vs. doc:** **FANTASMA** — o catálogo (:2506-2510) declara explicitamente que Benefícios, Treinamentos e Ponto **"ficam para a passada 2"**; o código já os expõe e liga no router. Comportamento implementado sem UC no catálogo (candidato a finding de rastreabilidade).

---

## 2. Jurídico — profundidade alta (contratos/alçada)

### UC-PESGOV-13 — Gerir contrato ponta a ponta
- **Atores:** `juridico:operate` (gate único da rota, `juridico.ts:83`).
- **Gatilhos:** `POST/PUT /contracts`, `.../documents`, `.../signatories`, `.../checklist` (`juridico.ts:86-94`).
- **Fluxo principal:** `CreateContractUseCase` (contraparte polimórfica XOR), minuta e signatários precedem ativação.
- **Vs. doc:** `CONFIRMED` (UC-52-JUR, :2387-2404).

### UC-PESGOV-14 — Ativar contrato com gate de alçada por valor — PROFUNDO
- **Atores:** rota exige apenas `juridico:operate` (`juridico.ts:95`); a alçada por valor é checada **dentro** do use case.
- **Gatilho:** `POST /api/jur/contracts/:id/activate`.
- **Fluxo principal:** `ActivateContractUseCase.ts:53-148` — permite ativar de `draft`/`in_approval`/`approved` (`:57`); **gate de alçada** `requiredApproverRoles(contract.value)` consultando `jur_contract_approvals` (`:61-73`); pré-condições `responsible_user_id` (BR-JUR-001, `:75-81`), ≥2 signatários + doc assinado (BR-JUR-004, `:83-90`), checklist para `employment/supplier/nda` (RF-JUR-010, `:92-101`); gera alertas de vencimento/denúncia/reajuste (`:109-145`).
- **Conflitos verificados:**
  - Alçada **hard-coded** R$ 50k/300k (`constants.ts`) × contrato de API promete tabela `jur_approval_thresholds` configurável e por `contract_type` — **BR-JUR-003 / FIND-ERP-005**.
  - Gate só roda `if (... && this.approvalRepository)` (`:63`); repositório **opcional** no construtor → se instanciado sem ele, alçada é pulada (invariante depende do chamador).
  - checklist usa truthiness `!checklist[item]` (`:94`): `'no'`/`'not_applicable'` **passam** — BR-JUR-D10.
  - `currency` ignorada; constante mágica `-15` na janela de denúncia (`:123`) — BR-JUR-D10.
- **Vs. doc:** **CONFLITANTE** (UC-52-JUR :2402-2404 e :2451-2474 descrevem a versão configurável; código implementa hard-coded). Referencia **FIND-ERP-005**.

### UC-PESGOV-15 — Registrar aprovação de alçada de contrato — PROFUNDO
- **Atores:** exceção ao gate do módulo — `authorizeAnyModule([{diretor},{financeiro}])` (`juridico.ts:71`), montada ANTES de `authorizeModule('juridico')`.
- **Gatilho:** `POST /api/jur/contracts/:id/approve`.
- **Fluxo principal:** `ApproveContractUseCase.ts:57-96` — resolve papel efetivo de `availableRoles` (resolvido no controller a partir de `req.user.permissions`, nunca do body); valida que o valor exige o papel; unique `contract_id`+`approver_role` (`:85-88`).
- **Conflitos verificados (BR-JUR-D07):**
  - `authorizeAnyModule` usa nível padrão `operate` → **`diretor:operate` (não `approve`) destrava R$ 500.000**.
  - **Sem segregação de função:** `findByContractAndRole` bloqueia o mesmo PAPEL, não a mesma PESSOA — um `admin` (recebe os dois papéis) registra sozinho `diretor` E `financeiro`.
  - aprova contrato em qualquer status (sem checagem de estado).
- **Invariante quebrada (BR-JUR-D08):** `approverHasApprove`/`hasApprove()` calculado e injetado mas **ignorado** — `OBSOLETE_CANDIDATE` (ver seção final).
- **Vs. doc:** **CONFLITANTE** quanto ao nível exigido. Referencia **FIND-ERP-005**.

### UC-PESGOV-16 — Criar aditivo de contrato
- **Atores:** `juridico:operate` (`juridico.ts:96`).
- **Gatilho:** `POST /api/jur/contracts/:id/addendums`.
- **Fluxo principal:** `CreateContractAddendumUseCase.ts:28-67` — grava aditivo com snapshot `previous_*`, e **atualiza `contract.value` direto** se `new_value` (`:59-64`) sem reabrir alçada.
- **Conflito (BR-JUR-D09):** contrato de R$ 40k (faixa sem alçada) pode ser elevado a R$ 5M por `juridico:operate` — sem reativação, sem invalidar aprovações. Doc de API contradiz a si mesmo (`BLOCO_3_JUR_API.md:214` `approve` × `:233` `operate`).
- **Vs. doc:** **CONFLITANTE**. Referencia **FIND-ERP-005** (contorno lateral de alçada).

### UC-PESGOV-17 — Rescindir/terminar contrato
- **Atores:** `juridico:operate` (`juridico.ts:98`).
- **Gatilho:** `POST /api/jur/contracts/:id/terminate`. `TerminateContractUseCase` bloqueia reversão `expired/terminated → active`.
- **Vs. doc:** `CONFIRMED` (UC-52-JUR :2400-2401).

### UC-PESGOV-18 — Gerir contencioso (processo/andamento/provisão/advogado/custo)
- **Atores:** `juridico:operate`; **`juridico:approve`** para `POST /legal-cases/:id/close` (`juridico.ts:115`) e para provisão `risk_class=probable` (checado no use case).
- **Gatilhos:** `juridico.ts:101-116` (external-lawyers, legal-cases, events, provisions, costs, close, reports/provisions).
- **Fluxo principal:** andamentos insert-only; provisão CPC 25 append-only; custos/acordos lançam em `AccountPayable` via adapter; relatório de provisões marca `risco_nao_avaliado`.
- **Vs. doc:** `CONFIRMED` (UC-53-JUR, :2406-2419).

### UC-PESGOV-19 — Baixar prazo processual fatal com dupla confirmação
- **Atores:** `juridico:operate` (`juridico.ts:120-126`).
- **Gatilhos:** `GET .../legal-case-deadlines*`, `POST .../deadlines`, `.../acknowledge`, `.../fulfill`, `.../confirm`.
- **Fluxo principal / invariante central (BR-JUR-013):** `POST .../confirm` (2ª confirmação) **rejeita `confirmedBy === fulfilled_by`** — o mesmo usuário não confirma a própria baixa; nenhuma rota desativa alerta de prazo fatal (RNF-JUR-04, ausência estrutural de coluna).
- **Vs. doc:** `CONFIRMED` (UC-54-JUR, :2421-2433) — "fluxo mais crítico do módulo".

### UC-PESGOV-20 — Procurações + Atos Societários
- **Atores:** `juridico:operate`; **`juridico:approve`** para `POST /proxies/:id/revoke` (`juridico.ts:132`).
- **Gatilhos:** `proxies` (`:129-132`), `corporate-acts` (`:134-137`).
- **Fluxo:** ato societário criado `draft`; `PUT` bloqueado após `registered` (imutabilidade); transição `draft→registered` quando `registration_protocol`+`registered_at` juntos.
- **Vs. doc:** `CONFIRMED` (UC-55-JUR / RF-JUR-030, :2476-2486).

### UC-PESGOV-21 — Propriedade intelectual (com trade_secret restrito a admin)
- **Atores:** `juridico:operate`; **`role==='admin'`** para revelar `trade_secret` — verificado no use case, não na rota (`juridico.ts:139-143`).
- **Gatilhos:** `ip-assets*`, `.../contracts` (`:144-149`).
- **Vs. doc:** `CONFIRMED` (RF-JUR-031 a 034; regra de papel documentada em :139-143).

### UC-PESGOV-22 — LGPD: RoPA (registro de atividades de tratamento)
- **Atores:** `juridico:operate` (`juridico.ts:153-157`).
- **Gatilhos:** `GET/POST/PUT /lgpd/processing-activities`, `.../review`.
- **Fluxo:** `ReviewProcessingActivityUseCase` grava `next_review_due_at = hoje+1 ano`.
- **Invariante ausente (BR-JUR-D12):** `retention_period` é `STRING(150)` texto livre com **zero enforcement** — não há job de expurgo/anonimização. Política de retenção `UNKNOWN`.
- **Vs. doc:** `CONFIRMED` para RoPA (UC-56-JUR interno); retenção = candidato a finding. Referencia **FIND-ERP-006**.

### UC-PESGOV-23 — LGPD: Solicitação de titular
- **Atores:** `juridico:operate`; **`juridico:approve`** apenas para `POST .../reject` (`juridico.ts:166`).
- **Gatilhos:** `data-subject-requests` (create/verify-identity/resolve/reject/pending-critical, `:160-166`).
- **Fluxo principal:** `CreateDataSubjectRequestUseCase.ts:39-53` — `due_date = received_at + 15 dias` corridos uniforme para os 8 tipos (BR-JUR-D11); `resolve` exige `identity_verified`; `reject` exige `rejection_justification` (BR-JUR-041).
- **Regra de autorização (BR-JUR-D13):** **atender o titular é `operate`; negar é `approve`.**
- **Vs. doc:** **CONFLITANTE parcial** — o catálogo não distingue os 8 tipos de prazo (a lei tem regimes distintos, art. 18/19); prazo uniforme é simplificação não documentada como UC. Referencia **FIND-ERP-006**.

### UC-PESGOV-24 — LGPD: Incidente
- **Atores:** `juridico:operate`; **`juridico:approve`** para `POST .../decision` e `.../close` (`juridico.ts:172-173`).
- **Fluxo (BR-JUR-042):** decisão de comunicação exige as duas justificativas (ANPD e titulares) mesmo quando ambos os booleanos são `false`.
- **Lacuna (BR-JUR-D13, LACUNA-5):** sem cadastro de DPO — `dpo_user_id` recebe `req.user.id` do operador; **nenhum prazo de comunicação à ANPD** é calculado (art. 48).
- **Vs. doc:** **CONFLITANTE** — ausência de prazo de incidente vs. `due_date` que existe para titular; DPO `UNKNOWN`. Referencia **FIND-ERP-006**.

### UC-PESGOV-25 — Transversal jurídico: alertas + relatório financeiro + fichas cruzadas
- **Atores:** `juridico:operate`; `GET /reports/financeiro` também aberto a `financeiro:operate` (checagem OR inline, montada antes do gate — `juridico.ts:64`).
- **Gatilhos:** `alerts` (`:177-179`), `reports/financeiro` (`:64`), `contracts/by-supplier|client|employee` (`:184-186`, RF-JUR-045).
- **Vs. doc:** `CONFIRMED` (Grupo 7, passada 2).

---

## 3. SST — profundidade alta (CAT)

### UC-PESGOV-26 — Ficha de EPI (NR-6)
- **Atores:** leitura `sst`; escrita `sst:operate`; **`sst:approve`** para `confirm`/`delete matrix` (`sst.ts:38-55`).
- **Gatilhos:** `epi-types`, `epi-matrix`, `epi-deliveries` (+`/confirm`, `/return`, `/evidence`).
- **Fluxo:** entrega `rascunho` → `evidence` → `confirm` (revalida CA, dispara saída de estoque, imutabiliza) — BR-SST-001/002.
- **Vs. doc:** `CONFIRMED` (UC-44, :2028-2043).

### UC-PESGOV-27 — ASO/PCMSO (NR-7)
- **Atores:** `sst` / `sst:operate`; **exceção `sst|rh`** em `GET /aso/status/:employeeId` (`requireSstOrRh`, `sst.ts:62,145-153`).
- **Gatilhos:** `exam-plans`, `aso`, `aso/status`, `aso/upcoming`, `.../complementary-exams`.
- **Fluxo:** `POST /aso` calcula `data_vencimento` e enfileira `S-2220`; status enxuto para gate de RH.
- **Vs. doc:** `CONFIRMED` (UC-45, :2045-2059).

### UC-PESGOV-28 — Registrar acidente
- **Atores:** `sst:operate` — `sst.ts:72`.
- **Gatilho:** `POST /api/sst/accidents`; `CreateAccidentUseCase` grava imutável (trigger), `confirmado=true` desde a criação.
- **Alternativos:** `POST .../complements` (`:73`) grava trilha de auditoria + coluna consolidada.
- **Vs. doc:** `CONFIRMED` (UC-46, :2061-2074).

### UC-PESGOV-29 — Emitir CAT (Lei 8.213/91) — PROFUNDO
- **Atores:** **`sst:approve`** — `sst.ts:75` (mesmo patamar de `close`). Sem papel "médico do trabalho"; "assinatura" = `emitente_id = req.user.id` (JWT).
- **Gatilho:** `POST /api/sst/accidents/:id/cat`.
- **Fluxo principal:** `EmitCatUseCase.ts:48-98` — transação: 404 acidente; bloqueia 2ª CAT `inicial` (`:54-58`); `tipo` vem do corpo (`body.tipo==='obito'?'obito':'inicial'`, `:60`); `prazo_limite` de `calcularPrazoLimiteCat(data_hora, gravidade)` (`:61`, BR-SST-D14); cria CAT + enfileira `S-2210` `pendente` + marca `houve_cat=true` com complemento de auditoria (`:63-90`).
- **Conflito interno verificado (BR-SST-D15):** o **TIPO** vem do corpo, o **PRAZO** da gravidade do acidente → é possível emitir `tipo='obito'` para acidente não-óbito e `tipo='inicial'` para acidente `gravidade='obito'`, sem checagem cruzada; "já existe CAT inicial" não bloqueia `tipo='obito'`.
- **Exceções:** E1 — prazo já vencido **não bloqueia** (nasce como pendência crítica, `:13-14`).
- **BRs:** BR-SST-D14 (prazo, simplificação sem feriados — `[VERIFICAR COM TÉCNICO SST/RH]`), BR-SST-D15. **Referencia FIND-ERP-008.**
- **Vs. doc:** **CONFLITANTE interno** — UC-46 (:2064-2065) descreve só "1º dia útil seguinte; imediato em óbito", não menciona a divergência tipo×gravidade nem a ausência de calendário de feriados.

### UC-PESGOV-30 — Encerrar acidente (gate investigação + ação corretiva)
- **Atores:** **`sst:approve`** — `sst.ts:74`.
- **Gatilho:** `POST /api/sst/accidents/:id/close`.
- **Fluxo principal:** `CloseAccidentUseCase.ts:39-58` — para gravidade ∈ {`com_afastamento`,`incapacidade_permanente`,`obito`} exige investigação + ≥1 ação corretiva (422 `INVESTIGATION_REQUIRED`, `:43-53`).
- **Gap de schema (declarado no código, `:8-15`):** não persiste transição de estado nova — funciona como PORTÃO DE VALIDAÇÃO; falta coluna `encerrado_em` auditável.
- **BRs:** BR-SST-D16. **Vs. doc:** `CONFIRMED` (UC-46, :2066-2078; gap de schema documentado).

### UC-PESGOV-31 — Fila eSocial SST / CIPA / PGR-GES / Treinamentos / Rotina / Ações corretivas (suporte SST)
- **Atores:** `sst` / `sst:operate`; **`sst:approve`** em vários pontos CIPA (`sst.ts:90-95`) e `esocial resend` (`:84`); **exceção `sst|rh`** em `cipa/stability` (`:98`) e `training-matrix` GET (`:115`, RF-INT-RH-SST-01).
- **Gatilhos:** `esocial-events` (`:82-84`), `cipa/*` (`:87-98`), `risks`/`ges` (`:101-106`), `training-matrix`/`trainings` (`:115-120`), `inspections`/`work-permits`/`brigade`/`dds` (`:123-132`), `corrective-actions` (`:135-137`).
- **Vs. doc:** `CONFIRMED` (UC-47/UC-48 + CRUDs enxutos, :2081-2139).

---

## 4. Diretoria — profundidade alta

> **Achado de rastreabilidade:** nenhuma seção do catálogo `04-USE_CASES.md` descreve o módulo `directorate`. Os UCs abaixo são recuperados 100% do código sem contraparte documentada → **FANTASMA**.

### UC-PESGOV-32 — Consultar organograma executivo
- **Atores:** qualquer autenticado (única rota do módulo só com `authenticate`) — `directorate.ts:35`.
- **Gatilho:** `GET /api/directorate/org-chart` → `orgChartController.getOrgChart` (`:22-28`) → `GetExecutiveOrgChartUseCase` (árvore CEO→diretorias→departamentos).
- **Vs. doc:** **FANTASMA** (implementado, sem UC).

### UC-PESGOV-33 — Prover/vagar cargo de diretor
- **Atores:** **`diretoria:approve`** — `directorate.ts:36`.
- **Gatilho:** `PATCH /api/directorate/directorates/:id/manager`.
- **Fluxo principal:** `orgChartController.assignManager:34-57` → `AssignDirectorateManagerUseCase`; `manager_id=null` vaga o cargo; grava `logAction` (`:45-54`).
- **Vs. doc:** **FANTASMA**.

### UC-PESGOV-34 — Planejamento estratégico
- **Atores:** leitura `diretoria`; **escrita `diretoria:approve`** — `directorate.ts:39-43`.
- **Gatilhos:** `strategic-plannings` (create/update/`:id/actual`).
- **Vs. doc:** **FANTASMA**.

### UC-PESGOV-35 — Atas de reunião (imutável)
- **Atores:** leitura `diretoria`; **`diretoria:approve`** para criar — `directorate.ts:46-48`.
- **Gatilhos:** `GET .../meeting-minutes`, `POST .../meeting-minutes` (sem update/delete — imutável após criação).
- **Vs. doc:** **FANTASMA**.

### UC-PESGOV-36 — Riscos corporativos
- **Atores:** leitura `diretoria`; **`diretoria:approve`** para criar/editar — `directorate.ts:51-54`.
- **Fluxo/invariante (BR-DIR-D18):** `risk_score = peso(probability)×peso(impact)` (pesos 1..4, escala 1..16) calculado no domínio — `directorate/domain/services/riskScore.ts:18-34`; **score nunca aceito do payload** (cliente não decide a própria severidade).
- **Vs. doc:** **FANTASMA**.

---

## 5. Módulos de suporte — cobertura rasa declarada (main flows, sem exaustão)

### UC-PESGOV-37 — TI: Helpdesk (chamado)
- **Atores:** `authenticate` puro para abrir/`mine` (`ti.ts:39-40`); `authorizeSelfOrModule('ti','operate', ownership)` para detalhe/comentários/confirm/reopen do próprio (`:42,49-53`); `ti:operate` para a fila; `ti:approve` para `.../lost` de termo relacionado.
- **Vs. doc:** `CONFIRMED` (UC-49, :2153-2169).

### UC-PESGOV-38 — TI: Termo de responsabilidade
- **Atores:** `ti:operate`; **`ti:approve`** para `.../lost` (`ti.ts:62`).
- **Vs. doc:** `CONFIRMED` (UC-50, :2171-2179).

### UC-PESGOV-39 — TI: Solicitação de acesso (onboarding/change/offboarding)
- **Atores:** `ti:operate`; `authorizeSelfOrModule('ti','approve', approverEligibilityCheck)` para approve/reject (`ti.ts:82-83`).
- **Fluxo/invariante (BR-TI-D17):** elegível = `ti:approve` OU **gestor** (`departments.manager_id → employees.user_id`), reverificado no use case (`ApproveAccessRequestUseCase.ts:35`) — **único ponto do cluster com autorização reverificada fora da borda HTTP**; `revoke` bloqueado por termo de responsabilidade ativo (BR-TI-011). **Sem segregação:** gestor pode aprovar solicitação que ele mesmo criou.
- **Vs. doc:** `CONFIRMED` (UC-51, :2181-2196).

### UC-PESGOV-40 — TI: Licenças de software (com revelação de chave)
- **Atores:** `ti:operate`; **`ti:approve`** para `request-renewal` (`ti.ts:74`).
- **Conflito (BR-TI-014):** `POST /licenses/:assetId/reveal-key` — rota exige `ti:operate` (`ti.ts:70`), mas o use case (`RevealLicenseKeyUseCase.ts:32-34`) aceita **qualquer nível** de `ti`; log `read_sensitive` é fire-and-forget após devolver a chave.
- **Vs. doc:** **CONFLITANTE** (BR-TI-014; doc :2199-2203 diz "revelada apenas a `ti:operate`/admin", o domínio é mais frouxo que a rota).

### UC-PESGOV-41 — TI: Backup/continuidade
- **Atores:** `ti:operate` — `ti.ts:89-91`.
- **Vs. doc:** `CONFIRMED` (CRUD enxuto P5, :2198-2203).

### UC-PESGOV-42 — Facilities: Frota (veículo + documento com liberação)
- **Atores:** `facilities`/`facilities:operate`; **`facilities:approve`** para `documents/:docId/release` (`facilities.ts:52`).
- **Vs. doc:** `CONFIRMED` (UC-58, :2247-2258).

### UC-PESGOV-43 — Facilities: Condutor
- **Atores:** `facilities:operate`; **`facilities:approve`** para `suspend` (`facilities.ts:60`).
- **Vs. doc:** `CONFIRMED` (Bloco 4 FAC).

### UC-PESGOV-44 — Facilities: Diário de uso (trip) + abastecimento
- **Atores:** `facilities:operate` (`facilities.ts:63-73`).
- **Fluxo/invariante (BR-FAC-D20):** saída (`.../depart`) com divergência de KM só passa com `divergence_justification` **E** `hasApproveLevel` (checado no controller/use case, `tripController.ts:76-83`) — **4º mecanismo de "quem aprova"** do cluster.
- **Vs. doc:** `CONFIRMED` estrutural; a regra de divergência de KM é DISCOVERED (não detalhada em UC).

### UC-PESGOV-45 — Facilities: Multa (prazo legal de indicação)
- **Atores:** `facilities:operate`; **`facilities:approve`** para `indicate`/`pay` (`facilities.ts:80,82`).
- **Vs. doc:** `CONFIRMED` (UC-59, :2259-2261).

### UC-PESGOV-46 — Facilities: Manutenção predial (chamado auto-serviço)
- **Atores:** abertura só `authenticate` (`facilities.ts:89`, RF-FAC-040); leitura `authorizeAnyModule([manutencao,facilities])` (`:86-87`); triagem/execução/close `facilities:operate`.
- **Vs. doc:** `CONFIRMED` (D-1, :2085 do router).

### UC-PESGOV-47 — Facilities: Visitantes / correspondência / limpeza / reservas
- **Atores:** `facilities`/`facilities:operate`; **`facilities:approve`** para plano de limpeza create/update (`facilities.ts:113-114`).
- **Vs. doc:** `CONFIRMED` (UC-58 a UC-62).

### UC-PESGOV-48 — Marketing: Campanhas (com aprovação de orçamento)
- **Atores:** `marketing`/`marketing:operate`; **`marketing:approve`** para `budget-decision` (`marketing.ts:44`).
- **Vs. doc:** **CONFLITANTE** — catálogo UC-53 (:2351-2356) afirma **"Sem nível `approve`"**; o código tem duas ações `approve` (budget-decision e material approve). Doc desatualizada.

### UC-PESGOV-49 — Marketing: Leads (funil + handoff)
- **Atores:** `marketing:operate`; `handoff` via `authorizeAnyModule([marketing,vendas])` (`marketing.ts:54-58`, RF-MKT-015).
- **Fluxo/BR-MKT-D19:** janela de atribuição de receita 90d; SLA handoff 2 dias **corridos** (requisito pede úteis — simplificação); funil `new→contacted→qualified→converted/lost`.
- **Vs. doc:** **CONFLITANTE** — SLA corridos × doc pede dias úteis (BR-MKT-D19); UC-53 (:2332-2342) descreve o funil mas não o handoff OR nem o SLA.

### UC-PESGOV-50 — Marketing: Eventos/feiras e Materiais (com aprovação)
- **Atores:** `marketing:operate`; **`marketing:approve`** para `materials/:id/approve` (`marketing.ts:81`).
- **Gatilhos:** `events*` (`:62-69`), `materials*` (`:76-81`).
- **Vs. doc:** `CONFIRMED` para materiais (UC-53 :2343-2349); **eventos = FANTASMA** (não descritos no UC-53, que lista só 3 entidades: campanhas/leads/materiais).

### UC-PESGOV-51 — Reports: relatórios departamentais
- **Atores:** `authorizeModule('relatorios.<sub>')` por relatório (`reports.ts:24-31`): `financeiro`/`producao`/`compras`/`custos`.
- **Gatilhos:** `GET /sales|inventory|customers|cash-flow|production|oee|purchasing|cost-variance` (+`?format=csv|pdf`).
- **Vs. doc:** **FANTASMA** — sem UC no catálogo (grep confirmou ausência); comportamento implementado sem UC. Regra de sub-permissão vem de `BUSINESS_RULES.md §6.2` (não verificado neste passo).

### UC-PESGOV-52 — Dashboard: painel + semáforo de handoff + demandas por depto
- **Atores:** `authorizeModule('dashboard')` (`dashboard.ts:27-29`).
- **Gatilhos:** `GET /` (index), `GET /handoffs`, `GET /department-demands`.
- **Vs. doc:** **PARCIAL/CONFLITANTE** — `GET /handoffs` corresponde a **UC-40 (parcial — backend)** (:1833-1862); `index` e `department-demands` = **FANTASMA** (sem UC). UC-40 no catálogo é explicitamente "só backend, componente visual pendente".

### UC-PESGOV-53 — Auditor inteligente (consistência stock/sales/purchases/financial)
- **Atores:** **`authorize('admin')`** (não `authorizeModule`) — `intelligentAuditor.ts:12-15`.
- **Gatilhos/fluxo:** `GET /api/auditor/{stock,sales,purchases,financial}` → `intelligentAuditorController:18-59` → 4 use cases de agregação read-only.
- **Vs. doc:** **FANTASMA** — sem UC no catálogo (grep confirmou). Comportamento (e restrição a `admin` global) implementado sem UC.

### UC-PESGOV-54 — Importação de catálogo por planilha
- **Atores:** ler modelo `produtos`; **simular/importar exigem interseção `produtos:operate` E `bom:operate`** (dois `authorizeModule` encadeados = AND) — `catalogImport.ts:31-47`.
- **Gatilhos:** `GET /modelos*`, `POST /simulacao`, `POST /` (upload).
- **BRs:** BR-IMP-D21 (padrão AND raro). **Vs. doc:** **FANTASMA** — sem UC no catálogo.

### UC-PESGOV-55 — Webhooks de sistema externo (n8n / focus-nfe)
- **Atores:** **sem `authenticate`** — `webhooks.ts:12-13` (webhook de sistema).
- **Gatilhos/fluxo:**
  - `POST /api/webhooks/n8n` → `webhookController.n8n:17-42` → `ProcessN8nWebhookUseCase` (HMAC-SHA256 do corpo bruto, `X-Evok-Signature`, **falha fechada** 503 se segredo não configurado, idempotência por `event_id`).
  - `POST /api/webhooks/focus-nfe` → `focusNfeStatusChange:51-70` — comparação simples de header `X-Webhook-Secret` (**não HMAC, não timing-safe**), status real sempre reconsultado na API (nunca aplicado do payload).
- **BRs:** BR-WHK-D22 (dois níveis de proteção diferentes no mesmo módulo — conflito interno). **Vs. doc:** **FANTASMA** + **CONFLITANTE interno** — sem UC no catálogo.

---

## OBSOLETE_CANDIDATE

| Item | Evidência | Motivo |
|---|---|---|
| **UC-52 (Facilities original)** | doc `04-USE_CASES.md:2216-2236` marcado "SUBSTITUÍDO", texto tachado | UC de catálogo obsoleto; substituído por UC-58..62; ainda ocupa o ID UC-52, colidindo com UC-52-JUR e UC-53 |
| **`approverHasApprove`/`hasApprove()` (BR-JUR-D08)** | `contractController.ts:141-151` calcula e injeta × `ActivateContractUseCase.ts:53-101` nunca lê | Parâmetro morto mantido "por compatibilidade"; leva quem lê o controller a concluir regra falsa ("só `juridico:approve` ativa") |
| **`sanitizePayrollImportItem` (metade "folha" de BR-RH-D06)** | `rhSensitiveFields.ts:61-139`, zero chamadores em `server/src` | Código morto — Grupo 13 (folha) não implementado |
| **Cabeçalho falso em `rhSensitiveFields.ts:28-36`** | afirma "não há use case que chame estas funções" | Doc-drift DENTRO do código — falso desde o Grupo 7 (`sanitizeAbsence` em 5 pontos de `absenceController`) |
| **UC-71 do catálogo × UC-71 do código** | doc `:2612` (Roteiro de Produção) × `rh.ts:121` (Afastamentos) | ID reusado para dois UCs distintos; um dos dois precisa ser renumerado |

---

## Placar e candidatos a finding (insumo p/ passo 29–31 — NÃO promovidos aqui)

**Contagem por classificação (55 UCs recuperados):**
- `CONFIRMED`: 27 (UC-PESGOV-01, 03, 04, 06, 07, 08, 09, 11, 13, 17, 18, 19, 20, 21, 22, 26, 27, 28, 30, 31, 37, 38, 41, 42, 43, 45, 46, 47) — batem com o catálogo.
- `CONFLITANTE`: 11 (UC-PESGOV-02, 05, 14, 15, 16, 23, 24, 29, 40, 48, 49) — código diverge do catálogo/contrato de API.
- `FANTASMA` (implementado sem UC no catálogo): 12 (UC-PESGOV-12; diretoria 32-36; reports 51; dashboard index/demands em 52; auditor 53; importação 54; webhooks 55; eventos de marketing em 50).
- `PARCIAL` (UC de catálogo cobre só parte): 1 (UC-PESGOV-52 — UC-40 só handoff).

**Candidatos a finding (seguem para validação humana, passos 30-31 — não promovidos):**

1. **Colisão de UC-ID no catálogo** (UC-52, UC-53, UC-71) — quebra Regra 17; o próprio doc admite a dívida (:2372-2380). Rastreabilidade UC→código comprometida.
2. **Módulos inteiros sem UC no catálogo:** `directorate` (5 UCs), `reports`, `dashboard` (index/demands), `intelligentAuditor`, `spreadsheetImport`, `webhooks`, eventos de marketing — comportamento implementado e roteado sem caso de uso documentado.
3. **Grupos RH P1/P2 (benefícios/treinamentos/ponto/afastamentos)** documentados como "passada 2 / não implementado" (:2506-2510) porém **presentes e ligados no router** (`rh.ts:125-157`) — divergência doc-diz-que-não × código-diz-que-sim.
4. **Alçada por corpo da requisição (BR-RH-D01)** e **descarte silencioso de `termination_reason` (BR-RH-D02)** — UC-68/70 não descrevem; toca **FIND-ERP-007**.
5. **Alçada jurídica hard-coded × configurável (BR-JUR-003/D09) e `diretor:operate` destrava R$500k sem segregação (BR-JUR-D07)** — UC-52-JUR conflita; toca **FIND-ERP-005**.
6. **LGPD (BR-JUR-D11/D12/D13):** prazo uniforme de 15d p/ 8 tipos, retenção sem enforcement, sem prazo de incidente ANPD, DPO = operador — toca **FIND-ERP-006**.
7. **CAT tipo×gravidade divergentes (BR-SST-D15)** e prazo sem feriados (BR-SST-D14) — UC-46 não descreve; toca **FIND-ERP-008**.
8. **reveal-key: rota `operate` × domínio "qualquer nível" (BR-TI-014)** e **webhooks com dois níveis de proteção (BR-WHK-D22)** — CONFLITANTE.
9. **UC críticos de autorização sem teste automatizado** (herdado do passo 26): `authorizeContractDecision` (RH), `ApproveContractUseCase` (JUR), aditivo×alçada (JUR), nível de rota LGPD/SST, log `read_sensitive` (TI) — cada um é um fluxo de UC sem prova.

---

*Produzido por trilha VeriCore read-only (vericore-use-case-auditor) no passo 28 de ERP-LEGACY-001. Nenhum finding formal com severidade/confiança é declarado aqui; nenhuma correção proposta. Cada UC cita arquivo:linha do código como evidência e a seção do catálogo como objeto de auditoria. Persistência de evidência é responsabilidade do vericore-audit-evidence-controller; este texto é devolvido ao orquestrador para gravação em `docs/coretriad/projects/ERP-LEGACY-001/discovery/USE_CASES_RECOVERED_pessoas-governanca.md`.*
