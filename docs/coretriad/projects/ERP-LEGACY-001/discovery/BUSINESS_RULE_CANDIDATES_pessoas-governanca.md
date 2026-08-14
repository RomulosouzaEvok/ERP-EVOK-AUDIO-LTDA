# BUSINESS_RULE_CANDIDATES_pessoas-governanca.md — ERP-LEGACY-001, Passo 26

```
PROJECT_ID: ERP-LEGACY-001
DOMÍNIOS: D9 "Pessoas" (rh, sst) + D10 "Governança & Suporte" (directorate, juridico, ti,
facilities, marketing, reports, dashboard, intelligentAuditor, spreadsheetImport, webhooks)
MÉTODO: Read/Grep/Glob apenas — nenhum comando executado, nenhuma conexão de banco, nenhum
teste rodado. Toda regra tem arquivo:linha dos DOIS lados da comparação.
NADA AQUI É REGRA OFICIAL — todas são DISCOVERED_BUSINESS_BEHAVIOR até confirmação do dono.
PROFUNDIDADE: alta em rh/juridico/sst/ti; rasa e declarada como tal nos demais (§6).
```

## 0. Convenção de identificador

- Quando o **código já cita um BR-ID** (`BR-JUR-001`, `BR-TI-014`, `D-K-*`...), a regra usa
  esse mesmo ID — é o único elo de rastreabilidade existente hoje.
- Regras sem BR-ID no código recebem ID candidato `BR-<DOM>-D<nn>` (`D` = descoberta). Esses
  IDs **não existem no repositório** — são propostos aqui.
- Achado transversal (não repetido em cada ficha): **nenhuma regra de autorização deste
  escopo é reverificada fora da borda HTTP** (`CURRENT_ARCHITECTURE.md` §4), com uma única
  exceção positiva (BR-TI-D17).

---

## 1. RH — Contrato de experiência e alçada pelo corpo da requisição

### BR-RH-D01 — Alçada de rescisão decidida pelo corpo da requisição
```
NAME: Rescisão exige `rh:approve`; prorrogar/efetivar exigem apenas `rh:operate`
DESCRIPTION: No endpoint único `PATCH /api/rh/employee-contracts/:id/decision`, o nível
  exigido é escolhido EM TEMPO DE REQUISIÇÃO pelo valor de `req.body.decision`:
    requiredLevel = (req.body?.decision === 'rescindir') ? 'approve' : 'operate'
  "Quem pode rescindir" é, literalmente: (a) `role === 'admin'` (curto-circuito TOTAL,
  auth.ts:226-229); OU (b) perfil ATIVO com `permissions['rh'] === 'approve'` (:258-282).
  NÃO existe papel "diretor"/"gestor de RH": o poder de rescindir é o nível `approve` do
  módulo `rh`, nada mais. `rh:operate` recebe 403 `APPROVAL_LEVEL_REQUIRED`, auditado.
ORIGIN: BLOCO_6_RH_API.md §0 (:87-96) e §5.2 (:496,540) — "decisão normativa do dono do
  produto (2026-08-09)", achado 10 da auditoria cruzada; reforçada em rhSensitiveFields.ts:13-15
OWNER: dono do produto (decisão citada no código); sem owner nominal (LACUNA-1)
VALIDITY: desde 2026-08-09  |  PRIORITY: ALTA
CONDITIONS: comparação `===` estrita e sensível a caixa. `'Rescindir'`, `['rescindir']` ou
  `decision` ausente caem em `'operate'` — e são rejeitados depois pelo Zod `z.enum` com 400.
  **VERIFICADO: isso NÃO é escalada de privilégio** (o caminho degradado termina em 400,
  nunca numa rescisão executada com `operate`).
  VERIFICADO que o corpo já está parseado quando o middleware roda: `express.json` e
  `express.urlencoded` são globais e montados antes das rotas (app.ts:129-136) — nem JSON nem
  form-encoded burlam a checagem.
EXCEPTIONS: `role === 'admin'` ignora a regra inteira. A segunda ação `approve` do módulo é
  `POST /termination-processes/:id/conclude` (rh.ts:99) — mesma alçada, rota fixa.
IMPLEMENTATION: rh/presentation/routes/rh.ts:60-70 (`authorizeContractDecision`), aplicada
  em :87; middlewares/auth.ts:213-286
RELATED_USE_CASES: UC-68, UC-70  |  RELATED_REQUIREMENTS: RF-RH-016, RF-RH-022
RELATED_TESTS: ❌ AUSENTE — nenhum teste exercita `authorizeContractDecision` (grep: zero).
  `rh-contract-use-cases.test.ts:82-138` testa o USE CASE (que explicitamente não checa
  autorização), nunca o middleware. **A regra de alçada mais peculiar do repositório é a
  única sem cobertura automatizada.**
STATUS: CONFIRMED  |  CONFIANÇA: CONFIRMED
OBSERVAÇÃO DE RISCO: a alçada depende de um dado do corpo que o middleware lê ANTES de
  qualquer validação de schema. Hoje é seguro, mas a garantia é acidental (vem do Zod no
  controller, 3 arquivos adiante), não estrutural — **qualquer novo `decision` destrutivo
  adicionado ao enum sem tocar em rh.ts:68 nasce em `operate`.**
```

### BR-RH-D02 — ⚠ `termination_reason` é aceito, validado e SILENCIOSAMENTE DESCARTADO
```
DESCRIPTION: O contrato de API documenta e exemplifica o envio de `termination_reason` junto
  de `decision='rescindir'`. O schema Zod aceita e valida (string, trim, max 1000). O use
  case declara o campo na interface de entrada. Mas `DecideEmployeeContractUseCase.execute()`
  NUNCA lê `input.termination_reason`: o ramo de rescisão (:100-107) monta o
  `CreateTerminationProcessUseCase` com objeto fixo que não inclui o motivo. O texto só
  sobrevive em `audit_logs` (via `newValues: parsed`) — não no processo de demissão.
ORIGIN: BLOCO_6_RH_API.md:526 (exemplo de request com `termination_reason`)
OWNER: ❌  |  PRIORITY: MÉDIA (perda de dado de defesa trabalhista)
IMPLEMENTATION: DecideEmployeeContractUseCase.ts:24-30 (declarado) × :100-107 (não usado);
  employeeContractValidators.ts:27 (aceito)
RELATED_TESTS: ❌ AUSENTE — o teste exercita `rescindir` sem `termination_reason`, então o
  descarte não é detectável.
STATUS: CONFLICTING  |  CONFIANÇA: CONFIRMED
```

### BR-RH-D03 — Rescisão abre processo de demissão com parâmetros fixos
```
DESCRIPTION: `rescindir` NÃO encerra o contrato (permanece `ativo`/`prorrogado` até a
  conclusão do processo, RF-RH-022) e cria um `HrTerminationProcess` com valores hard-coded:
    termination_type = 'termino_experiencia'
    notice_date      = hoje
    notice_modality  = 'trabalhado'   ← decisão de negócio NÃO documentada
    termination_date = null
  `notice_modality='trabalhado'` é presunção trabalhista relevante (aviso trabalhado ×
  indenizado tem efeito em verbas) tomada pelo código, sem documento de origem.
EXCEPTIONS: `ConflictError` (409) se já houver processo aberto (:62-65) — mas o contrato de
  API documenta esse mesmo caso como **422 BUSINESS_RULE_VIOLATION** (BLOCO_6_RH_API.md:542).
IMPLEMENTATION: DecideEmployeeContractUseCase.ts:100-107;
  rh/application/use-cases/termination/CreateTerminationProcessUseCase.ts:51-75
RELATED_TESTS: rh-contract-use-cases.test.ts:99-113 (NÃO cobre `notice_modality` nem 409×422)
STATUS: CONFLICTING (status HTTP) + DISCOVERED (`notice_modality` fixo)  |  CONFIANÇA: CONFIRMED
```

### BR-RH-D04 — Teto de 90 dias do contrato de experiência (Art. 445 § único, CLT)
```
DESCRIPTION: `MAX_EXPERIENCE_CONTRACT_DAYS = 90`; validação por diferença de datas em dias
  corridos (UTC), rejeitando `> 90` e intervalo ≤ 0.
ORIGIN: Art. 445, parágrafo único, CLT. ⚠️ O próprio arquivo declara que a redação legal foi
  conferida "por conhecimento treinado", sem WebSearch/WebFetch — **a fonte normativa NÃO foi
  verificada contra publicação oficial dentro do projeto.**
IMPLEMENTATION: rh/domain/services/experienceContractRules.ts:12,22-34
RELATED_TESTS: ✅ rh-contract-use-cases.test.ts:38-56
STATUS: CONFIRMED  |  CONFIANÇA: HIGH (implementação e teste batem; a FONTE legal é
  auto-declarada não verificada)
```

### BR-RH-D05 — Uma única prorrogação; segunda é rejeitada em vez de converter (Art. 451)
```
DESCRIPTION: A lei determina que a segunda prorrogação CONVERTE o contrato em prazo
  indeterminado. O ERP, por decisão documentada no próprio código, REJEITA a gravação
  (`SECOND_EXTENSION_REJECTED`) e obriga o RH a usar a decisão explícita `efetivar`. O código
  argumenta que o efeito jurídico final é o mesmo, mudando só a experiência de uso.
  Regra irmã: o vencimento SEM decisão é convertido automaticamente para
  `indeterminado_automatico` na LEITURA (verificação ativa em list/getById, sem cron).
IMPLEMENTATION: experienceContractRules.ts:36-61; experienceContractAutoExpire.ts;
  employeeContractController.ts:38-64
RELATED_TESTS: ✅ rh-contract-use-cases.test.ts:57-65 e 140-179
STATUS: CONFIRMED (com desvio de interpretação DOCUMENTADO no código — exige ciência do dono,
  não é divergência oculta)  |  CONFIANÇA: CONFIRMED
```

### BR-RH-D06 — Dado sensível de RH por INTERSEÇÃO de módulos (AND)
```
DESCRIPTION: Decisão normativa (Opção C, 2026-08-09): `rh:approve` NÃO é reaproveitado como
  nível de leitura de dado sensível. Campo de saúde (`cid`) e valores individuais de folha
  são protegidos por interseção de módulos (AND, qualquer nível), com `admin` liberando tudo,
  e a falta de interseção OMITE o campo do retorno — nunca devolve 403 na rota.
ORIGIN: BLOCO_6_RH_API.md §0/§21-4 + BLOCO_6_RH_AUDITORIA.md achado 10
PRIORITY: ALTA (LGPD art. 5º II — dado de saúde)
IMPLEMENTATION: rh/domain/services/rhSensitiveFields.ts:61-139; APLICADO em
  absenceController.ts:16,55,65,84,101,116
  ⚠️ `sanitizePayrollImportItem` tem ZERO chamadores em `server/src` (grep exaustivo) — a
  metade "folha" da regra existe como **código morto**, porque o Grupo 13 não foi implementado.
  ⚠️ **DOC DRIFT DENTRO DO PRÓPRIO CÓDIGO**: o cabeçalho de `rhSensitiveFields.ts:28-36`
  afirma "não há, ainda, nenhum use case que chame estas funções" — afirmação FALSA desde a
  implementação do Grupo 7, que chama `sanitizeAbsence` em 5 pontos.
RELATED_TESTS: rh-sensitive-fields.test.ts (funções puras). ❌ AUSENTE: teste de que o
  CONTROLLER aplica a sanitização (o elo que de fato protege o dado).
STATUS: CONFIRMED para `cid`; OBSOLETE_CANDIDATE / NÃO-IMPLEMENTADO para folha
CONFIANÇA: CONFIRMED
```

---

## 2. Jurídico — alçada de contrato (RF-JUR-003)

### BR-JUR-003 — ⚠⚠ Alçada por valor: hard-coded × tabela configurável documentada
```
VALOR IMPLEMENTADO:
  value <= 50.000            → nenhuma aprovação extra (ativa com juridico:operate)
  50.000 < value <= 300.000  → exige 1 aprovação registrada do papel `diretor`
  value > 300.000            → exige 2 aprovações distintas: `diretor` E `financeiro`
  `value` nulo/NaN → tratado como 0. Comparações usam `<=` (50.000 exato NÃO exige alçada).
  A checagem ocorre na ATIVAÇÃO, consultando `jur_contract_approvals`; a rota de ativação
  continua exigindo apenas `juridico:operate`.
ORIGIN DOCUMENTADA: BLOCO_3_JUR_API.md §2.7 (:370) e §2 (:212-215, 232) — e o próprio
  contrato marca a regra como `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`, isto é, **NÃO
  validada por autoridade jurídica**.
OWNER: "decisão do dono do produto em 2026-08-08" (constants.ts:2-7, juridico.ts:12-16). Sem
  registro de aprovação humana formal (Regra 17).
CONDITIONS: `jur_contracts.value`, valor bruto, **SEM considerar `currency`** (o campo existe
  em ContractTypes.ts:33 e é ignorado — um contrato de USD 100.000 é comparado contra
  thresholds em R$).
EXCEPTIONS:
  - `ActivateContractUseCase.ts:63` — a checagem só roda `if (... && this.approvalRepository)`.
    O repositório é OPCIONAL no construtor; **se alguém instanciar o use case sem ele (como
    faz metade da suíte de teste), a alçada inteira é PULADA silenciosamente.** Em produção o
    controller injeta (contractController.ts:143), mas a invariante depende do chamador.
  - Contrato pode ser ativado a partir de `draft`, `in_approval` OU `approved` (:57) —
    `approved` não está no fluxo documentado §2.
IMPLEMENTATION: juridico/domain/constants.ts:23,26,38-47
  (`JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000`, `..._FINANCE = 300000`);
  ActivateContractUseCase.ts:61-73 (gate); ApproveContractUseCase.ts:77-88 (registro)
RELATED_TESTS: ✅ juridico-contract-use-cases.test.ts:174-227 (as 3 faixas, incluindo o
  limite exato). ❌ AUSENTE: teste de `ApproveContractUseCase` (o lado que REGISTRA).
STATUS: CONFLICTING — não no VALOR (o código é internamente coerente e testado), mas no
  MECANISMO.
```
O documento de origem afirma textualmente *"Nenhum valor de alçada é hard-coded ... a rota
sempre consulta a configuração vigente"* e especifica uma tabela `jur_approval_thresholds`
(`{contract_type, min_value, max_value, required_level}`) mais os endpoints
`GET/PUT /api/jur/settings/approval-thresholds`, declarados como algo que *"precisam existir
antes de POST .../activate poder checar a regra"* (BLOCO_3_JUR_API.md:372-383). **O código
implementa exatamente o oposto:** dois números hard-coded, sem tabela, sem endpoint de
configuração, e **sem a dimensão `contract_type`** (a alçada é só por valor). Consequências:
(i) mudar a alçada exige deploy; (ii) não há registro versionado de qual alçada vigia em qual
data; (iii) a diferenciação por tipo de contrato prometida ao jurídico não existe.

### BR-JUR-D07 — ⚠ Quem aprova: `diretor:operate` (não `approve`) destrava R$ 500.000
```
DESCRIPTION: `POST /api/jur/contracts/:id/approve` é uma das 3 exceções do módulo ao gate
  `authorizeModule('juridico','operate')`: é montada ANTES do gate, protegida por
  `authorizeAnyModule([{diretor},{financeiro}])` — porque aprovadores de alçada tipicamente
  NÃO têm o módulo `juridico`. O controller resolve os papéis EFETIVOS:
    role === 'admin'             → ['diretor','financeiro']  (os DOIS papéis)
    permissions.diretor  truthy  → +'diretor'
    permissions.financeiro truthy→ +'financeiro'
  `role` no body só DESAMBIGUA quando o usuário tem os dois papéis; nunca concede papel que o
  usuário não tenha (ApproveContractUseCase.ts:66-75).
  **REGRA DE NÍVEL — VERIFICADA E CONTRAINTUITIVA:** a checagem é de TRUTHINESS do módulo,
  não de nível. `authorizeAnyModule` usa `requiredLevel` padrão `'operate'`
  (authorizeAnyModule.ts:52,82) e `resolveAvailableApproverRoles` faz
  `if (user?.permissions?.diretor)` (contractController.ts:52-53). **Logo: um usuário com
  `diretor:operate` (não `approve`) pode registrar a aprovação de diretoria de um contrato de
  R$ 500.000.**
POR QUE A DECISÃO ESTÁ NA APRESENTAÇÃO: o use case foi desenhado para receber
  `availableRoles` já resolvido (:36-39), e a única fonte de `req.user.permissions` é o
  middleware HTTP — como não há composition root nem serviço de identidade de domínio
  (CURRENT_ARCHITECTURE.md V1/§4), o controller é o único lugar onde essa tradução pode
  acontecer sem acoplar o use case ao Express. É **consequência estrutural**, não descuido
  isolado — o mesmo padrão se repete em `legalCaseController.ts:37,133`,
  `facilities/tripController.ts:76-83` e `purchaseRequisitionController.ts:159-160`.
EXCEPTIONS / LACUNAS VERIFICADAS:
  1. **Sem segregação de função**: `findByContractAndRole` impede o mesmo PAPEL aprovar duas
     vezes, não a mesma PESSOA. **Um `admin` (que recebe os dois papéis) pode registrar
     sozinho `diretor` E `financeiro` e destravar qualquer valor.**
     `shared/domain/segregationOfDuties.ts` existe e é explicitamente restrito à cadeia de
     compras — não é chamado pelo jurídico.
  2. **Sem checagem de status**: aprova contrato em qualquer status, inclusive
     `terminated`/`expired`/`canceled`.
  3. **Sem vínculo com o valor no momento da ativação**: aprovações são gravadas por papel,
     não por valor aprovado (ver BR-JUR-D09).
IMPLEMENTATION: contractController.ts:37-40, 42-55, 160-171; juridico.ts:66-81;
  ApproveContractUseCase.ts:57-96; middlewares/authorizeAnyModule.ts:55-110
RELATED_TESTS: ❌ AUSENTE (nenhum teste de `ApproveContractUseCase` nem de
  `resolveAvailableApproverRoles`)
STATUS: DISCOVERED + CONFLICTING quanto ao nível exigido  |  CONFIANÇA: CONFIRMED
```

### BR-JUR-D08 — `hasApprove()` é calculado, passado adiante e IGNORADO
```
DESCRIPTION: `contractController.activate` calcula `hasApprove(req)` e injeta como
  `approverHasApprove`. `ActivateContractUseCase.execute()` NUNCA lê esse campo — a alçada
  passou a ser 100% baseada em `jur_contract_approvals`. O parâmetro permanece no tipo
  (ContractTypes.ts:72), no controller (:146) e em 11 chamadas de teste.
  HANDOFF_CODEX.md:12329 confirma que a manutenção foi deliberada ("por compatibilidade").
  **Efeito prático: quem lê o controller conclui que "só quem tem juridico:approve ativa
  contrato". É falso** — qualquer `juridico:operate` ativa, desde que as aprovações existam.
IMPLEMENTATION: contractController.ts:141-151 × ActivateContractUseCase.ts:53-101
RELATED_TESTS: os testes PASSAM `approverHasApprove: false` em 11 pontos sem nunca verificar
  efeito — **cobertura que dá falsa sensação de que a regra é testada**.
STATUS: OBSOLETE_CANDIDATE  |  CONFIANÇA: CONFIRMED
NOTA: o contrato de API ainda documenta o comportamento antigo (403 por nível). Documento e
  código descrevem DUAS regras diferentes para a mesma ação.
```

### BR-JUR-D09 — ⚠ Aditivo que altera valor não reabre a alçada
```
DESCRIPTION: `POST /contracts/:id/addendums` está atrás apenas de
  `authorizeModule('juridico','operate')`. O use case grava o aditivo e, se `new_value` vier,
  ATUALIZA `contract.value` direto (CreateContractAddendumUseCase.ts:59-64) — sem consultar
  `requiredApproverRoles`, sem invalidar aprovações anteriores, sem exigir reativação.
  **Um contrato ativado legitimamente por R$ 40.000 (faixa sem alçada) pode ser elevado a
  R$ 5.000.000 por um `juridico:operate`.**
ORIGIN: BLOCO_3_JUR_API.md:214 — "assinatura de aditivo que altera valor `approve`
  (RF-JUR-003)". A tabela de endpoints do MESMO documento (:233) lista o mesmo endpoint como
  `operate`. **O documento contradiz a si mesmo**, e o código segue a versão mais permissiva.
PRIORITY: ALTA (contorna a alçada financeira por caminho lateral)
RELATED_TESTS: ❌ AUSENTE
STATUS: CONFLICTING  |  CONFIANÇA: CONFIRMED
```

### BR-JUR-D10 — Pré-condições não financeiras de ativação (BR-JUR-001/004, RF-JUR-010)
```
- `responsible_user_id` obrigatório — BR-JUR-001.
- `countPartySignatories(id) >= 2` E `hasSignedDocument(id) === true` — BR-JUR-004.
- Checklist obrigatório apenas para `contract_type ∈ {employment, supplier, nda}`, com os 3
  itens `{pi, confidentiality, non_compete}` preenchidos — RF-JUR-010.
  ⚠️ A checagem é `!checklist[item]` (truthiness): **o valor `'no'` ou `'not_applicable'`
  PASSA no gate** — o checklist prova que alguém RESPONDEU, não que a cláusula existe.
  `UpdateContractChecklistInput` tipa `'yes'|'no'|'not_applicable'` (ContractTypes.ts:64-67),
  então "não tem cláusula de não concorrência" é aceito como checklist cumprido.
- Alertas na ativação: vencimento (`end_date - alert_advance_days`), denúncia
  (`end_date - notice_days - 15`, só se `renewal_auto`), reajuste. **O "-15" é constante
  mágica sem origem documental.**
IMPLEMENTATION: ActivateContractUseCase.ts:75-145 (checklist: 92-101; janela de 15 dias: 123)
RELATED_TESTS: ✅ :115-171 (gestor, signatários, checklist, 404). ❌ AUSENTE: teste de que
  `'no'` passa no checklist; ❌ AUSENTE: teste da constante 15.
STATUS: CONFIRMED para as pré-condições; DISCOVERED para a truthiness e para o `-15`
```

---

## 3. LGPD — retenção, prazo ao titular, quem decide

### BR-JUR-D11 — Prazo de resposta ao titular: 15 dias corridos, uniforme para os 8 tipos
```
DESCRIPTION: `due_date = received_at + 15 dias` (dias CORRIDOS, sem calendário de dias
  úteis/feriados), DATEONLY, status inicial `received`. A mesma janela é aplicada a TODOS os
  8 tipos (`confirmation, access, correction, anonymization, deletion, portability,
  consent_revocation, info_sharing`) — o código cita LGPD art. 19, II (prazo de 15 dias para
  a declaração clara e completa); **os demais direitos do art. 18 têm regimes de prazo
  distintos na lei ("imediato"/"prazo e modo facilitado"), e essa distinção NÃO existe no
  código.** O prazo nunca some do painel: `pending-critical` devolve vencidos com
  `dias_restantes` negativo e `vencido: true`.
OWNER: `dpo_user_id` — mas ver BR-JUR-D13 (não há cadastro de DPO)
IMPLEMENTATION: lgpd/CreateDataSubjectRequestUseCase.ts:39-53;
  PendingCriticalDataSubjectRequestsUseCase.ts:20-29
RELATED_TESTS: ✅ juridico-lgpd-alert-use-cases.test.ts:97-104. ❌ AUSENTE: qualquer teste
  distinguindo tipo de solicitação.
STATUS: DISCOVERED  |  CONFIANÇA: HIGH
```

### BR-JUR-D12 — ⚠ Retenção de dados pessoais: texto livre, ZERO enforcement
```
DESCRIPTION: A única materialização de "retenção" em todo o backend é a coluna
  `jur_lgpd_processing_activities.retention_period` — `STRING(150)`, `allowNull: true`,
  gravada e atualizada como texto livre. Grep exaustivo por `retention|retenc` em
  `server/src` devolve 5 ocorrências, TODAS de leitura/escrita desse campo. **Não existe:
  job de expurgo, política de descarte, cálculo de data-limite de guarda, anonimização
  programada, nem qualquer consumidor do valor.** A empresa DECLARA o prazo de retenção e o
  sistema não faz absolutamente nada com ele.
  Regra irmã implementada: revisão ANUAL do RoPA — `next_review_due_at` = hoje +1 ano.
PRIORITY: ALTA (obrigação legal de eliminação — LGPD art. 15/16)
IMPLEMENTATION (o que existe): CreateProcessingActivityUseCase.ts:57;
  UpdateProcessingActivityUseCase.ts:39; models/JurLgpdProcessingActivity.ts:27,48;
  ReviewProcessingActivityUseCase.ts:27-34 (revisão anual)
RELATED_TESTS: ✅ revisão anual. ❌ AUSENTE por inexistência: retenção não é testável.
STATUS: UNKNOWN — não é possível determinar, a partir de artefato versionado, qual é a
  política de retenção da empresa nem quem a decide. **Candidata a "regra que existe só na
  conversa".**  |  CONFIANÇA: CONFIRMED quanto à ausência de implementação
```

### BR-JUR-D13 — Quem decide em LGPD: atender é `operate`, negar é `approve`
```
DESCRIPTION: Exigem `authorizeModule('juridico','approve')` — 3 ações, todas de
  recusa/encerramento:
    POST /lgpd/data-subject-requests/:id/reject  (juridico.ts:166)
    POST /lgpd/incidents/:id/decision            (:172)
    POST /lgpd/incidents/:id/close               (:173)
  Todo o resto do bloco LGPD (criar RoPA, revisar, criar solicitação, verificar identidade,
  RESOLVER solicitação, abrir incidente) é `juridico:operate`. **Ou seja: atender o titular é
  operate; negar é approve.**
  Regras materiais associadas:
    - BR-JUR-041: não se resolve solicitação sem `identity_verified`; recusa exige
      `rejection_justification`.
    - BR-JUR-042: a decisão de comunicação de incidente exige AS DUAS justificativas (ANPD e
      titulares) mesmo quando ambos os booleanos são `false` — "não comunicar" também precisa
      ser fundamentado. ⚠️ **Nenhum PRAZO de comunicação à ANPD é calculado ou cobrado**
      (LGPD art. 48 exige "prazo razoável"): não há `due_date` de incidente, ao contrário da
      solicitação de titular.
  ⚠️ **IDENTIDADE DO DPO — lacuna assumida no próprio código:** não existe cadastro de "quem
  é o Encarregado". `dpo_user_id` é NOT NULL no banco e, quando não informado, recebe o id de
  QUEM REGISTROU (`req.user.id`). **O campo que deveria nomear o Encarregado nomeia, na
  prática, um operador qualquer do jurídico.**
IMPLEMENTATION: juridico.ts:151-173; lgpd/{ResolveDataSubjectRequest:31-36,
  DecideIncident:37-63, CreateDataSubjectRequest:52, CreateIncident:51}
RELATED_TESTS: ✅ :113-225. ❌ AUSENTE: teste de nível de rota (approve × operate).
STATUS: CONFIRMED para BR-JUR-041/042; UNKNOWN para a identidade do DPO; DISCOVERED para o
  critério "negar exige approve, atender não"  |  CONFIANÇA: CONFIRMED
```

---

## 4. SST — CAT de acidente do trabalho

### BR-SST-D14 — Prazo legal da CAT (Lei 8.213/91 art. 22 §2º)
```
DESCRIPTION: gravidade === 'obito' → prazo_limite = data do acidente (imediato); demais →
  data do acidente + 1 dia, avançando enquanto cair em sábado/domingo.
  **SIMPLIFICAÇÃO DECLARADA no código: só fim de semana conta como não útil — NÃO há tabela
  de feriados.** O arquivo marca isso como `[VERIFICAR COM TÉCNICO SST/RH DA EMPRESA]`. Um
  acidente na véspera de feriado produz prazo legalmente incorreto (antecipado).
  O prazo é gravado em `sst_cats.prazo_limite` E propagado ao evento eSocial `S-2210` como
  `prazo_legal`, na MESMA transação.
OWNER: ❌ (o código pede explicitamente um técnico de SST/RH que não está nomeado)
EXCEPTIONS: prazo já vencido NÃO bloqueia a emissão (E1) — a CAT é criada e o evento nasce
  como pendência crítica visível, nunca descartado.
IMPLEMENTATION: sst/domain/services/legalDeadlineService.ts:30-41;
  accident/EmitCatUseCase.ts:61,72-78
RELATED_TESTS: ✅ sst-accident.test.ts:195-213 (óbito no mesmo dia; prazo vencido não
  bloqueia). ❌ AUSENTE: teste de acidente em sexta/sábado (**o pulo de fim de semana, que é
  o núcleo da regra**) e de feriado.
STATUS: CONFIRMED (com simplificação DOCUMENTADA e pendência de validação por técnico)
CONFIANÇA: CONFIRMED
```

### BR-SST-D15 — ⚠ Quem emite a CAT, e a divergência tipo × gravidade
```
DESCRIPTION: `POST /accidents/:id/cat` e `POST /cat/:catId/reopen` exigem
  `authorizeModule('sst','approve')` — mesmo patamar de `close` de acidente. Registrar o
  acidente é `operate`; emitir a CAT é `approve`. **Não há papel "médico do trabalho"/
  "técnico de segurança" no modelo de permissão**: é o nível `approve` do módulo `sst`.
  "Assinatura": `emitente_id = req.user.id` (JWT) — não existe assinatura eletrônica/
  certificado, apenas autoria registrada.
  Efeitos atômicos (1 transação): cria a CAT `inicial`, enfileira `EventoESocialSST` S-2210
  `pendente`, e marca `sst_acidentes.houve_cat = true` gravando ANTES o complemento de
  auditoria (`valor_anterior`/`valor_novo`/`motivo`).
  ⚠️ **DIVERGÊNCIA INTERNA:** o TIPO da CAT vem do corpo (`body.tipo === 'obito' ? 'obito' :
  'inicial'`), enquanto o PRAZO vem da gravidade do acidente registrado. **É possível emitir
  `tipo='obito'` para acidente cuja `gravidade` não é óbito e, pior, emitir `tipo='inicial'`
  para acidente com `gravidade='obito'`** — sem nenhuma checagem cruzada. Note ainda que "já
  existe CAT inicial" só bloqueia `tipo='inicial'`: uma CAT `obito` não impede outra
  `inicial` depois.
IMPLEMENTATION: routes/sst.ts:74-77; accidentController.ts:69-74,84-90;
  accident/EmitCatUseCase.ts:48-98 (tipo: :60)
RELATED_TESTS: ✅ sst-accident.test.ts:172-213. ❌ AUSENTE: coerência `tipo` × `gravidade`;
  teste de nível de rota.
STATUS: DISCOVERED + CONFLICTING interno  |  CONFIANÇA: CONFIRMED
```

### BR-SST-D16 — Encerramento de acidente grave exige investigação + ação corretiva
```
DESCRIPTION: `POST /accidents/:id/close` (`sst:approve`) bloqueia encerramento de acidente
  grave sem investigação, e também quando há investigação sem nenhuma ação corretiva.
  Acidente `sem_afastamento` não exige investigação. Investigação é única por acidente.
IMPLEMENTATION: accident/CloseAccidentUseCase.ts; CreateAccidentInvestigationUseCase.ts
RELATED_TESTS: ✅ sst-accident.test.ts:131-171,215-245 (4 cenários)
STATUS: CONFIRMED  |  CONFIANÇA: HIGH
```

---

## 5. TI — aprovação de acesso e revelação de chave de licença

### BR-TI-D17 — Elegibilidade para aprovar solicitação de acesso
```
DESCRIPTION (regra exata, em três camadas):
  Camada 1 — rota: `authorizeSelfOrModule('ti','approve', approverEligibilityCheck)`
    (a) role === 'admin' → libera; (b) permissions.ti === 'approve' → libera;
    (c) ownershipCheck assíncrono → libera.
  Camada 2 — `approverEligibilityCheck` carrega a solicitação e chama `isEligibleApprover`
    com `approverHasTiApprove: false` (deliberado), restando a regra de gestor:
      departments.manager_id → employees.id → employees.user_id === req.user.id
    **"Gestor" NÃO é um papel de perfil de acesso: é o vínculo de dado
    `departments.manager_id`.** Departamento sem `manager_id`, ou gestor sem `user_id`, torna
    a solicitação aprovável APENAS por `ti:approve`/admin.
  Camada 3 — o use case REVERIFICA a mesma regra (ApproveAccessRequestUseCase.ts:35), desta
    vez com `approverHasTiApprove` real. **É o único ponto deste domínio inteiro onde a
    autorização é checada fora da borda HTTP** — exceção positiva ao padrão de §4.
  Regras de estado: só aprova `status === 'pending'`; `type='revoke'` não passa por aprovação;
  execução exige aprovação prévia para `grant`/`change`; `revoke` é bloqueado por termo de
  responsabilidade ativo (BR-TI-011, 422 com `details.pending_terms`).
  ⚠️ **SEM SEGREGAÇÃO:** nada impede que o gestor do departamento aprove uma solicitação que
  ele mesmo criou (`requested_by = req.user.id`), nem que o aprovador seja o executor.
ORIGIN: BLOCO_2_TI_API.md §4.1, RF-TI-034, UC-51
IMPLEMENTATION: routes/ti.ts:82-83; accessRequestController.ts:31-47,77-104;
  domain/services/approverEligibilityService.ts:26-37;
  accessRequest/ApproveAccessRequestUseCase.ts:29-42; middlewares/authorizeSelfOrModule.ts:40-99
RELATED_TESTS: ✅ ti-access-request-use-cases.test.ts. ❌ AUSENTE: teste de auto-aprovação —
  cenário não coberto porque a regra não existe.
STATUS: CONFIRMED  |  CONFIANÇA: CONFIRMED
LACUNA PARA DECISÃO HUMANA: a segregação D-K vale para compras por decisão registrada. Vale
  ou não para concessão de acesso e para aprovação de contrato? Não há artefato que responda.
```

### BR-TI-014 — ⚠ Revelação de chave de licença: duas alçadas diferentes
```
DESCRIPTION (as DUAS regras que coexistem, com valores diferentes):
  Rota (ti.ts:70):  authorizeModule('ti','operate')
     → exige nível `operate` OU `approve`, ou `role='admin'`.
  Use case (RevealLicenseKeyUseCase.ts:32-34): `requesterHasTiModule || requesterIsAdmin`,
     onde `requesterHasTiModule = Boolean(user.permissions.ti)`
     → **aceita QUALQUER nível**, inclusive um futuro nível somente-leitura.
  A rota é hoje o gate efetivo (mais restritiva); a regra de domínio é mais frouxa que a
  rota. **Se a rota mudar, a proteção afrouxa silenciosamente.**
  Auditoria: `logAction(action:'read_sensitive', ...)` com o e-mail de quem revelou — mas é
  fire-and-forget DEPOIS da execução: **a chave é devolvida mesmo que o registro de auditoria
  falhe.** Não há: justificativa obrigatória, limite de frequência, aprovação de segundo
  usuário, nem expiração da exibição.
IMPLEMENTATION: routes/ti.ts:70; licenseController.ts:80-97;
  license/RevealLicenseKeyUseCase.ts:31-40
RELATED_TESTS: ✅ ti-license-use-cases.test.ts:71-89 (3 casos). ❌ AUSENTE: teste de que o
  log `read_sensitive` é emitido — **a garantia de rastreabilidade da operação sensível não
  tem cobertura.**
STATUS: CONFLICTING  |  CONFIANÇA: CONFIRMED
```

---

## 6. Cobertura RASA declarada — demais módulos

Registrada como rasa de propósito. Nenhuma foi confrontada com documento de origem.

| BR_ID | Regra (valor implementado) | Arquivo:linha | Status |
|---|---|---|---|
| BR-DIR-D18 | `risk_score = peso(probability) × peso(impact)`, pesos `low=1, medium=2, high=3, critical=4`, escala 1–16. O score **nunca** é aceito do payload — o cliente não decide a própria severidade | `directorate/domain/services/riskScore.ts:18-34` | DISCOVERED |
| BR-MKT-D19 | Janela de atribuição de receita = **90 dias**; SLA de handoff Marketing→Vendas = **2 dias corridos** (o requisito pede dias ÚTEIS — simplificação declarada); alerta de orçamento em **90%** e **100%**; receita atribuída só em vendas `invoiced`/`shipped` | `marketing/domain/constants.ts:15-25` | CONFLICTING (SLA: doc pede dias úteis, código usa corridos) |
| BR-FAC-D20 | Saída de viagem com divergência de KM só passa com `divergence_justification` **E** `hasApproveLevel`, com `approvedBy` = JWT | `facilities/.../TripUseCases.ts:87,135`; `tripController.ts:76-83` | DISCOVERED (**4º mecanismo de "quem aprova"**, além dos 3 do §4) |
| BR-IMP-D21 | Importação de catálogo exige **interseção** `produtos:operate` **E** `bom:operate` (dois `authorizeModule` encadeados — AND por composição de middleware) | `spreadsheetImport/.../catalogImport.ts:27-44` | DISCOVERED (padrão de AND raro) |
| BR-WHK-D22 | `/api/webhooks/*` **sem `authenticate`**: `n8n` protegido por HMAC-SHA256 do corpo BRUTO, `timingSafeEqual`, e **falha fechada** se o segredo não estiver configurado; `focus-nfe` usa comparação simples de header (**não** timing-safe, sem HMAC) — **dois níveis de proteção diferentes para dois webhooks do mesmo módulo** | `webhooks/routes/webhooks.ts:6-13`; `ProcessN8nWebhookUseCase.ts:47-64`; `webhookController.ts:52-57` | DISCOVERED + CONFLICTING interno |
| — | `reports`, `dashboard`, `intelligentAuditor` | não amostrados | UNKNOWN (cobertura declarada como não realizada) |

---

## 7. Lacunas que exigem decisão humana (Regra 20-21)

| # | Lacuna | Por que não é resolvível aqui |
|---|---|---|
| LACUNA-1 | **Nenhuma das 22 regras tem OWNER nominal em artefato versionado.** As fontes mais fortes são comentários citando "decisão do dono do produto em 2026-08-08/09/10" — sem registro explícito de aprovação (Regra 17) | Atribuir dono é decisão organizacional |
| LACUNA-2 | Alçada jurídica: **R$ 50k/300k hard-coded** × tabela configurável prometida pelo contrato de API | Regra 20 — fonte autoritativa é do responsável humano |
| LACUNA-3 | A **segregação D-K** foi decidida para compras. Vale para aprovação de contrato (BR-JUR-D07), concessão de acesso (BR-TI-D17) e rescisão (BR-RH-D01)? Hoje não vale — mas não há decisão registrada dizendo que não deve valer | Escopo de política de controle interno |
| LACUNA-4 | **Política de retenção de dado pessoal (LGPD)**: existe como texto livre, sem prazo, sem expurgo, sem dono | Nem o prazo nem o responsável são determináveis por código |
| LACUNA-5 | **Quem é o Encarregado (DPO)?** O código presume `req.user.id` porque não existe cadastro. É uma pessoa nomeada por lei | Exige designação formal |
| LACUNA-6 | **Quem assina a CAT?** Registra `emitente_id` do JWT e exige `sst:approve`, sem papel de técnico de segurança/médico do trabalho. O código pede `[VERIFICAR COM TÉCNICO SST/RH]` e ninguém verificou | Decisão organizacional + validação legal |
| LACUNA-7 | Verificação legal das regras CLT (90 dias, Art. 451) e previdenciária (prazo CAT) foi feita "por conhecimento treinado", sem fonte oficial consultável — declarado nos próprios arquivos | Requer assessor jurídico/contábil |

## 8. Placar do domínio (insumo para o passo 29)

- Regras candidatas: **22** (16 aprofundadas + 6 rasas).
- `CONFIRMED`: 8 · `DISCOVERED`: 8 · `CONFLICTING`: 6 (BR-RH-D02, BR-RH-D03, BR-JUR-003,
  BR-JUR-D09, BR-TI-014, BR-MKT-D19; +2 conflitos internos em BR-SST-D15 e BR-WHK-D22) ·
  `UNKNOWN`: 3 · `OBSOLETE_CANDIDATE`: 2.
- **Regras críticas de autorização SEM teste automatizado: 5** — `authorizeContractDecision`
  (RH), `ApproveContractUseCase` (JUR), aditivo × alçada (JUR), nível de rota LGPD/SST,
  emissão do log `read_sensitive` (TI).
- Documentos que **divergem do código**: `BLOCO_3_JUR_API.md` (§2.7 alçada configurável; §2
  :214 × :233 contradiz a si mesmo), `BLOCO_6_RH_API.md` (:542, 409×422), e um caso de
  **documentação mentirosa dentro do próprio código** (`rhSensitiveFields.ts:28-36`).

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado. Nenhum
finding formal com severidade/confiança é declarado aqui — é insumo de discovery com
evidência arquivo:linha dos dois lados de cada comparação. Conteúdo persistido pelo
orquestrador, sem edição.*
