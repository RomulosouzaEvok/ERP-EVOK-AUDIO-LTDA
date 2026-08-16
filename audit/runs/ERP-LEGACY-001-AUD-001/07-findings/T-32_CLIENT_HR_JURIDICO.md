# T-32 — Auditoria de `client/` — Trilha 1/6: Pessoas e Jurídico

Run `ERP-LEGACY-001-AUD-001` · célula `C-133` · AUDIT_COMMIT
`c1311a6f76b512fef893f7e60d934179cae3409f`
Status de todos os achados: **PROPOSED**. Nenhum veredito de autorização emitido (Regra 4 /
mandato do `authorization-auditor`).

> **Nota de persistência.** O agente titular não emite arquivo de relatório. Conteúdo persistido
> pelo orquestrador **sem alteração**.

## 1. Inventário próprio

Enumeração via glob: **21 arquivos**, conforme o escopo. Sem divergência de contagem.

`client/src/pages/hr/` (11): `HrPage.tsx`, `EmployeesTab.tsx`, `DepartmentsTab.tsx`,
`AdmissionTab.tsx`, `EmployeeContractsTab.tsx`, `TerminationTab.tsx`, `VacationTab.tsx`,
`AbsencesTab.tsx`, `BenefitsTab.tsx`, `TrainingsTab.tsx`, `AttendanceTab.tsx`
`client/src/pages/juridico/` (10): `JuridicoPage.tsx`, `ContractsTab.tsx`, `LegalCasesTab.tsx`,
`DeadlinesTab.tsx`, `ProxiesTab.tsx`, `CorporateActsTab.tsx`, `IpAssetsTab.tsx`, `LgpdTab.tsx`,
`AlertsReportsTab.tsx`, `juridicoShared.tsx`

**Ressalva de reconfirmação (Regra 12):** o agente não reconfirmou `git diff --stat` contra o
AUDIT_COMMIT — não executa comandos. Todas as âncoras abaixo são do worktree lido. Lacuna
declarada.

## 2. Matriz de autorização do backend (base da comparação)

| Lado | Regra real |
|---|---|
| `server/.../rh/presentation/routes/rh.ts:73-157` | leitura `rh` (qualquer nível); escrita `rh:operate`; `rh:approve` em exatamente 2 ações — `:99` concluir demissão e `:87` decidir contrato quando `decision==='rescindir'` |
| `server/.../juridico/presentation/routes/juridico.ts:83` | **router inteiro** atrás de `authorizeModule('juridico','operate')` — inclusive GETs |
| idem `:115,:132,:166,:172,:173` | `juridico:approve` em: encerrar processo, revogar procuração, recusar solicitação de titular, decidir e encerrar incidente |
| `legalCaseController.ts:133` | + `hasApprove` inline para avaliação de risco `probable` |
| `juridico.ts:64,71,77` | 3 exceções montadas antes do gate geral |

## 3. Tabela página × achado (âncora dos dois lados)

| Página | Achado | Âncora cliente | Âncora servidor |
|---|---|---|---|
| `DeadlinesTab.tsx` | **F01** beco sem saída em prazo vencido | `:290`, `:329-335`, `:339` | `FulfillDeadlineUseCase.ts:40-48`; `SequelizeDeadlineRepository.ts:73` |
| `LgpdTab.tsx` | **F02** regressão de incidente barrada só no cliente | `:790` | `DecideIncidentUseCase.ts:37-63` (sem checagem de estado) |
| `LgpdTab.tsx` | **F03** verificação de identidade é carimbo | `:304`, `:341-345` | `VerifyIdentityUseCase.ts:33-45` |
| `LgpdTab`/`ProxiesTab`/`LegalCasesTab`/`JuridicoPage` | **F04** nível `approve`/`operate` não refletido na UI | `LgpdTab:373-381,807-814,819`; `ProxiesTab:251-259`; `LegalCasesTab:463-469`; `JuridicoPage:31` | `juridico.ts:83,115,132,166,172,173`; `legalCaseController.ts:133` |
| 9 abas de `hr/` | **F05** `canWrite` inclui nível `view` | `VacationTab:110,247`; `TerminationTab:67`; `AdmissionTab:101`; `AbsencesTab:64`; `BenefitsTab:95,314`; `TrainingsTab:77,377`; `AttendanceTab:58`; `EmployeeContractsTab:63` | `rh.ts:75-157` |
| `AlertsReportsTab.tsx` | **F06** relatório financeiro sem checagem de nível | `JuridicoPage:32`; `AlertsReportsTab:98` | `reportController.ts:24` vs doc `:3-5` e `juridico.ts:59-63` |
| `IpAssetsTab.tsx` | **F07** `trade_secret` gravável e depois ilegível | `:163-169`, `:146` | `CreateIpAssetUseCase.ts:41-52`; `GetIpAssetByIdUseCase.ts:34` |
| `AbsencesTab.tsx` | **F08** CID: escrita sem interseção, leitura com | `:388-389` | `rhSensitiveFields.ts:73-75`; `absenceController.ts:55` |
| — | **F09** doc normativa obsoleta | — | `rhSensitiveFields.ts:31-35` vs `absenceController.ts:16,55,65,84,101,116` |
| `ContractsTab.tsx` | **F10** regra de negócio duplicada no cliente | `client/src/api/juridico.ts:237-254` | `juridico/domain/constants.ts:23-47` |

## 4. Findings

### `T32-HRJUR-F01` — Prazo fatal vencido não tem caminho de cumprimento na UI

**Severidade HIGH · Confiança HIGH**

O cliente calcula `const isMissed = deadline?.status === 'missed'` (`DeadlinesTab.tsx:290`). O
servidor calcula outra coisa:

```ts
// FulfillDeadlineUseCase.ts:40-41
const dueDatePassed = new Date(deadline.due_date) < new Date();
const isMissed = deadline.status === 'missed' || dueDatePassed;
```

Verificado quem escreve `status='missed'`: **ninguém**. A única ocorrência fora do enum e do use
case é leitura (`SequelizeDeadlineRepository.ts:73`), e não existe scheduler/cron em `server/src` —
o próprio repositório documenta que "o job de escalada automática em D-3 (BR-JUR-011) ainda não
existe" (`:60-63`).

Consequência, para **todo** prazo vencido (não é caso de borda — é o comportamento garantido): o
cliente não renderiza o campo `retroactive_justification` (`:329-335`, condicionado a `isMissed`),
habilita "Registrar cumprimento" só com a evidência (`:339`), e o servidor responde 422
`BR-JUR-014`. Não há outro caminho na UI para informar a justificativa. O fluxo mais crítico do
módulo (UC-54) fica sem saída exatamente quando importa.

Agravante de coerência interna: `UrgencyBadge` no mesmo arquivo (`juridicoShared.tsx:162`) já
rotula o prazo como "Vencido" pela data, enquanto `isMissed` diz que não.

### `T32-HRJUR-F02` — A regressão `closed → investigating` de incidente LGPD é barrada apenas pelo cliente

**Severidade MEDIUM · Confiança HIGH** · corrobora `T27-JUR-F01` com a âncora de cliente pedida

`DecideIncidentUseCase.ts:37-63` não lê o estado anterior e grava `status: 'investigating'`
incondicionalmente, sobrescrevendo `communication_decision`/`communication_justification` já
registrados. O único obstáculo é a renderização condicional
`{incident.status !== 'closed' && (...)}` em `LgpdTab.tsx:790`.

Resposta direta à pergunta do briefing ("a UI oferece o botão que produz a regressão?"): **não
oferece — e é só isso que impede**. Um usuário `juridico:approve` chamando a API diretamente
reabre um incidente encerrado e reescreve a decisão de comunicação à ANPD. Contraste com
`CloseIncidentUseCase.ts:30-35`, que faz a checagem de pré-condição corretamente.

### `T32-HRJUR-F03` — Verificação de identidade do titular (LGPD art. 18) é um carimbo na UI

**Severidade MEDIUM · Confiança HIGH**

`LgpdTab.tsx:304` fixa o valor:

```ts
() => jurApi.verifyDataSubjectRequestIdentity(requestId!, true, verificationNotes || undefined)
```

O backend trata `identity_verified` como entrada real e rejeita qualquer valor diferente de `true`
(`VerifyIdentityUseCase.ts:33-38`, BR-JUR-041). Como o cliente só sabe enviar `true`, o único valor
possível é o que passa: o caminho negativo do gate é inalcançável pela UI, e não há botão de
"identidade não confirmada". As notas são opcionais em ambos os lados (`|| undefined` no cliente;
nenhuma validação no use case), então uma solicitação de titular avança `verifying → in_progress`
com um clique e zero evidência registrada. O `CHECK` de banco citado no JSDoc protege o estado, não
a qualidade da prova.

### `T32-HRJUR-F04` — Nível de permissão do jurídico não é refletido na UI (6 ações + a página inteira)

**Severidade MEDIUM · Confiança HIGH**

Duas manifestações da mesma causa:

(a) `JuridicoPage.tsx:31` libera as 7 abas com `hasModuleAccess('juridico')`, que é verdadeiro para
**qualquer** nível (`AuthContext.tsx:131-138`). O router inteiro exige `operate`
(`juridico.ts:83`). Um usuário `juridico:view` recebe a página completa com todas as consultas
retornando 403 — página integralmente quebrada, sem mensagem explicativa.

(b) Seis ações exigem `approve` no servidor e nenhuma é desabilitada no cliente: recusar
solicitação (`LgpdTab.tsx:373-381` × `juridico.ts:166`), decidir incidente (`:807-814` × `:172`),
encerrar incidente (`:819` × `:173`), revogar procuração (`ProxiesTab.tsx:251-259` × `:132`),
encerrar processo (`LegalCasesTab.tsx` seção de encerramento × `:115`), avaliar risco `probable`
(`LegalCasesTab.tsx:463-469` × `legalCaseController.ts:133`). Duas telas rotulam "(nível approve)"
no texto (`LgpdTab.tsx:366,792`) mas mantêm o botão ativo.

O peso deste achado vem da **inconsistência interna**: o mesmo repositório resolve isso
corretamente no RH — `TerminationTab.tsx:68` e `EmployeeContractsTab.tsx:64` computam
`permissions?.rh === 'approve'` e desabilitam com tooltip (`:227-228`, `:383-384`). O padrão certo
existe e não foi aplicado no jurídico.

Sem impacto de segurança (o backend barra em todos os casos verificados) — é ação às cegas,
categoria 2.

### `T32-HRJUR-F05` — `canWrite` de RH concede botões de escrita a quem tem nível `view`

**Severidade LOW · Confiança HIGH**

Nove abas derivam a permissão de escrita de `hasModuleAccess('rh')`, que ignora o nível. As
escritas exigem `rh:operate` (`rh.ts:75-157`). Um usuário `rh:view` vê "Nova demissão", "Programar
férias", "Recalcular", "Importar AEJ", "Registrar conclusão" etc., e cada clique retorna 403. O
JSDoc de `hasModuleAccess` (`AuthContext.tsx:33-37`) já declara que a função é UX e não guard — a
lacuna é a ausência de um equivalente por nível, não uma falha de guarda.

### `T32-HRJUR-F06` — `GET /jur/reports/financeiro` aceita qualquer nível, contrariando a própria documentação

**Severidade MEDIUM · Confiança HIGH** · **cruzamento explícito com o `authorization-auditor` —
veredito não é desta trilha**

Três documentos internos afirmam que a exceção é de nível `operate`: `juridico.ts:59-63`,
`reportController.ts:3-5` e o JSDoc de rota em `JuridicoPage.tsx:25-27`. A checagem real é por
verdade simples:

```ts
// reportController.ts:24
const authorized = user?.role === 'admin' || user?.permissions?.financeiro || user?.permissions?.juridico;
```

`permissions.financeiro === 'view'` é truthy. O lado cliente é o que materializa a exposição:
`JuridicoPage.tsx:32` leva o usuário sem `juridico` direto para a aba de relatórios, e
`AlertsReportsTab.tsx:98` dispara a consulta sem condição — renderizando provisão por processo,
classe de risco, valores de depósito judicial e custos (`:134-181`).

### `T32-HRJUR-F07` — `trade_secret` é gravável por não-admin e imediatamente ilegível para ele

**Severidade LOW · Confiança HIGH**

O `select` de tipo oferece "Segredo industrial" a qualquer `juridico:operate`
(`IpAssetsTab.tsx:163-169`, via `IP_TYPE_LABELS`). `CreateIpAssetUseCase.ts:41-52` valida o tipo e
o veto a `attachment_url`, mas **não** exige `role==='admin'`. A leitura exige
(`GetIpAssetByIdUseCase.ts:34` responde 403; `ListIpAssetsUseCase` exclui). O cliente ainda abre o
detalhe do recém-criado (`:146 onCreated(asset.id)`), que retorna 403 na cara do usuário. O JSDoc
da aba (`:19-21`) afirma que "a API já filtra/rejeita" — verdadeiro só para leitura.

### `T32-HRJUR-F08` — CID pode ser escrito por quem não pode lê-lo

**Severidade LOW · Confiança HIGH**

`AbsencesTab.tsx:388-389` oferece o campo CID a qualquer `rh:operate`; a leitura exige interseção
`rh`+`sst` (`rhSensitiveFields.ts:73-75`). Dado de saúde é gravado às cegas, sem possibilidade de
conferência posterior pelo mesmo usuário. Mitigadores reais: não existe endpoint de atualização de
afastamento (só `return`/`esocial-confirmation`, `rh.ts:128-129`), então é escrita única, sem
sobrescrita; e `absenceController.ts:81` deliberadamente **não** inclui `cid` no `logAction` — o
dado de saúde não vaza para a trilha de auditoria.

### `T32-HRJUR-F09` — Documento de decisão normativa contradiz o código (Regra 21)

**Severidade LOW (informacional) · Confiança HIGH**

`rhSensitiveFields.ts:31-35` afirma: *"não há, ainda, nenhum use case que chame estas funções"*.
Falso desde a implementação do Grupo 7 — `absenceController.ts` chama `sanitizeAbsence` em todas as
5 respostas (`:55,65,84,101,116`). O bloco carrega tom normativo ("a decisão de RBAC acima é
normativa e não deve ser re-decidida"), o que o torna material sob a Regra 21. Registrado como
fonte a reconciliar, não como defeito funcional.

### `T32-HRJUR-F10` — Constante de alçada duplicada no cliente

**Severidade LOW (informacional) · Confiança HIGH**

`client/src/api/juridico.ts:237-254` reimplementa `requiredApproverRoles` e os dois thresholds.
Comparação linha a linha com `server/.../juridico/domain/constants.ts:23-47`: **idênticos hoje**
(50000 / 300000, mesma lógica de faixas). Ambos os lados estão documentados corretamente (cliente
"NUNCA usado para decidir autorização"; servidor autoritativo, aplicado em
`ActivateContractUseCase`). Sem divergência atual; registrado apenas o risco de drift por
duplicação.

## 5. Conformidades — registradas com o mesmo peso

1. **Regra 24 — modelo positivo, sem violação em 21 páginas.** É o único ponto do escopo em que o
   cliente envia algo parecido com papel ao servidor: `ContractsTab.tsx:393` chama
   `approveContract(contractId, role)`. O servidor **não confia**: `contractController.ts:164-166`
   toma `approverUserId` do JWT, resolve `availableRoles` por RBAC
   (`resolveAvailableApproverRoles`), e usa `req.body.role` apenas como desempate entre papéis que
   o usuário comprovadamente tem. O comentário `:43-45` diz literalmente "RBAC real (RF-JUR-003),
   nunca aceito do body". Este é o padrão que a Regra 24 exige.
2. **Dupla confirmação de prazo fatal (BR-JUR-013)** — cliente desabilita
   (`DeadlinesTab.tsx:291,361`) **e** servidor rejeita (`ConfirmDeadlineUseCase.ts:36-41`), que
   ainda valida o estado anterior (`:32-34`).
3. **Imutabilidade de ato societário registrado** — o JSDoc afirma "a tela desabilita a edição,
   **não só o backend rejeita**" (`CorporateActsTab.tsx:24-25`). Verificado: verdadeiro. Cliente
   `:250,310-323,326,340`; servidor `UpdateCorporateActUseCase.ts:37-42`.
4. **Segregação do CID na leitura** — `omitSensitiveFields` remove a chave
   (`rhSensitiveFields.ts:109`, `delete`), e o cliente trata exatamente a chave ausente:
   `absence.cid === undefined ? 'Restrito'` (`AbsencesTab.tsx:196`).
5. **Benefícios — limite VT 6% e dependentes** — a UI anuncia as duas regras
   (`BenefitsTab.tsx:532`, `:43/487/600`) e ambas existem no servidor
   (`CreateEmployeeBenefitUseCase.ts:58` dependentes, `:68-74` VT). O salário é lido do repositório
   e nunca aceito no payload, explicitamente "evita spoofing do limite de 6%" (`:2-5`).
6. **`rh:approve` espelhado com precisão** — `permissions?.rh === 'approve'` em
   `TerminationTab.tsx:68` e `EmployeeContractsTab.tsx:64`, batendo exatamente com as 2 ações de
   `rh.ts:87,99`. Falha fechada quando o mapa de permissões não carrega.
7. **Mascaramento de CPF** — `EmployeesTab.tsx:72-74` renderiza "•••" quando o backend omite o
   campo (BR-RH-020), sem quebrar a formatação.
8. **Minimização em `listCritical`** — `SequelizeDeadlineRepository.ts:77` exclui
   `evidence_file_path` da lista de prazos críticos.
9. **Defesa em profundidade na aba de relatórios** — `AlertsReportsTab.tsx:24` esconde alertas de
   quem não tem `juridico`, e `juridico.ts:83,177` bloquearia de qualquer forma.

## 6. Confronto com os achados já estabelecidos (não reauditados)

**`T27-RH-H01`** — *A UI oferece a edição do resultado de aptidão do ASO? Para quem?* **Não oferece
para ninguém.** Grep em `client/src` por `employee-documents` retorna apenas `GET`
(`api/hr.ts:405`) e `POST` (`:428`). Não existe `updateEmployeeDocument` no cliente;
`PUT /rh/employee-documents/:id` (`rh.ts:105`) **não tem nenhum consumidor de frontend**.
Contribuição do cliente ao achado: nenhum fluxo legítimo de UI precisa desse endpoint — ele só é
alcançável por chamada direta à API, o que enfraquece qualquer justificativa de necessidade.

**`T27-RH-H03`** — *Qual tela é essa, e ela é aberta na rotina normal?* É
`/hr → Férias → Períodos aquisitivos` (`VacationTab.tsx:87,108`), uma sub-seção de uma aba entre
dez. **O cliente agrava o achado**: `applyDobraIfNeeded` roda por linha retornada
(`ListVacationAccrualPeriodsUseCase.ts:21`), e o cliente sempre pagina com `limit: 20`
(`VacationTab.tsx:122`) e ainda permite filtrar por funcionário e por status (`:114-115`). A dobra
do Art. 137 CLT é aplicada, portanto, **apenas aos ≤20 registros da página que o operador abriu, já
restringidos pelo filtro ativo** — um período na página 3, ou fora do filtro, nunca vence.
Confirmado que não há scheduler em `server/src`. O botão "Recalcular" (`:216-223`) é por linha, um
a um. Não há ação em lote na UI.

**`T27-JUR-F01`** — coberto por `T32-HRJUR-F02` acima, com a âncora de cliente pedida.

**`FIND-ERP-006` (LGPD)** — frente de UI em `LgpdTab.tsx`; contribuições novas: `F03`
(verificação-carimbo) e `F02` (regressão de incidente).
**`FIND-ERP-007` (rescisão)** — frente de UI em `TerminationTab.tsx`; o lado cliente está
**conforme** (conformidade 6). Nenhuma contradição encontrada.

## 7. Cobertura declarada

**21/21 arquivos (100%)** lidos diretamente. Contrapartes de backend lidas por grep dirigido:
`rh.ts`, `juridico.ts`, `rhSensitiveFields.ts`, `absenceController.ts`, `contractController.ts`,
`legalCaseController.ts`, `reportController.ts`, `ListVacationAccrualPeriodsUseCase`,
`VerifyIdentityUseCase`, `DecideIncidentUseCase`, `CloseIncidentUseCase`, `ConfirmDeadlineUseCase`,
`FulfillDeadlineUseCase`, `UpdateCorporateActUseCase`, `CreateIpAssetUseCase`,
`CreateEmployeeBenefitUseCase`, `SequelizeDeadlineRepository`, `juridico/domain/constants.ts`,
`AuthContext.tsx`.

**Ficou de fora, e por quê:**

- `LegalCasesTab.tsx` — lido integralmente até a linha 140 e depois por grep dirigido
  (`risk_class|probable|close|status ===|disabled=`) no restante. Os fluxos de encerramento e
  provisão foram ancorados; um trecho intermediário (formulários de andamento e advogados externos)
  não foi lido linha a linha. **Cobertura parcial declarada.**
- Reconfirmação do `AUDIT_COMMIT` por `git diff --stat` — o agente não executa comandos.
- Comportamento dinâmico: estado real de `localStorage`, conteúdo efetivo de respostas de API em
  runtime, e confirmação de que os 403 previstos de fato ocorrem. **Lacuna registrada para o
  `vericore-audit-verification-runner`** — especificamente `F01` (422 em prazo vencido), `F02`
  (regressão via API direta) e `F06` (relatório com `financeiro:view`).
- Auditoria de token/localStorage: `httpClient` está fora das 21 páginas do escopo.

**Encaminhamentos:** `F01` (HIGH) requer passagem pelo `vericore-finding-validator`. `F06` requer
cruzamento formal com o `authorization-auditor`. Nenhum finding CRITICAL identificado; **nenhuma
violação da Regra 24 nas 21 páginas** — ao contrário, o único ponto candidato é uma conformidade
exemplar.
