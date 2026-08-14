```
LEGACY_TRACEABILITY_MATRIX_pessoas-governanca.md — ERP-LEGACY-001, Passo 29 (DISCOVERY)
TRILHA: VeriCore read-only · não é auditoria 360° · não é remediação · nenhum finding promovido
```

# Matriz de rastreabilidade do legado — cluster `pessoas-governanca`

## 1. Cabeçalho

- **Cluster:** pessoas-governanca (D9 "Pessoas" + D10 "Governança & Suporte").
- **Módulos:** `rh`, `sst`, `directorate`, `juridico`, `ti`, `facilities`, `marketing`, `reports`, `dashboard`, `intelligentAuditor`, `spreadsheetImport`, `webhooks`.
- **Cadeia auditada:** `BR → REQ → UC → CÓDIGO(arquivo:linha) → TC(teste)`. Cada elo é `PRESENTE`, `QUEBRADO` ou `AMBÍGUO`. Nenhum elo inventado.
- **Método:** READ → ANALYZE → VERIFY(código+teste como evidência) → CLASSIFY. Read/Grep/Glob apenas. **Nada executado** (nenhum teste, script, banco). TC "cobre" só quando o `describe/it` exercita o comportamento com asserção (arquivo:linha); nome sem asserção do comportamento = `QUEBRADO (teste nominal)`.
- **Fontes lidas em disco:**
  - BRs: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` (passo 26, 22 regras).
  - UCs: `.../USE_CASES_RECOVERED_pessoas-governanca.md` (passo 28, UC-PESGOV-01..55; AUDIT_COMMIT declarado f05e865).
  - REQs: `.../REQUIREMENTS_BASELINE.md` (passo 27, AUDIT_COMMIT c9359be399c45191fe90e8e9707803125a5ba91d / tag legacy-baseline-001).
  - Testes: `server/tests/unit/**` e `server/tests/integration/**` (lidos no working tree / HEAD 65bd66d — **os módulos NÃO têm testes co-localizados; toda a suíte vive em `server/tests/`**).
  - Findings referenciados (NÃO reauditados): FIND-ERP-005 (JUR alçada), FIND-ERP-006 (LGPD), FIND-ERP-007 (RH rescisão), FIND-ERP-008 (SST CAT).

### Ressalva estrutural — "a matriz nasce quebrada" (confirmado e detalhado)

1. **Elo-origem BR-ID QUEBRADO em 22/22.** Nenhuma regra tem BR-ID canônico versionado. Existem apenas rótulos provisórios do passo 26 (`BR-RH-D0n`, `BR-JUR-D0n`, `BR-SST-D1n`, `BR-TI-D17`/`BR-TI-014`, `BR-DIR-D18`, `BR-MKT-D19`, `BR-FAC-D20`, `BR-IMP-D21`, `BR-WHK-D22`) que o próprio arquivo declara **inexistentes no repositório** (§0: "Esses IDs não existem no repositório — são propostos aqui"). Logo o **primeiro elo de toda linha é QUEBRADO por construção**; ele é contado à parte no placar para não zerar a discriminação dos elos a jusante.
2. **Colisões de UC-ID confirmadas no catálogo `docs/projeto/04-USE_CASES.md`** (quebram a Regra 17):
   - **UC-52** = Facilities (SUBSTITUÍDO, :2216) × **UC-52-JUR** = Contratos jurídicos (:2387). Afeta as linhas JUR de contrato.
   - **UC-53** = Marketing (:2313) × **UC-53-JUR** = Contencioso (:2406). Afeta a linha MKT.
   - **UC-71** = Roteiro de Produção no doc (:2612) × **UC-71 = Afastamentos** no código (`rh.ts:121`). Colisão código×doc. Afeta a linha RH de afastamento/`cid`.
   - **Toda linha cujo UC-ID colide é marcada `AMBÍGUO` no elo UC** (7 linhas — ver §4).
3. **Módulos inteiros sem UC no catálogo (FANTASMA):** `directorate`, `reports`, `intelligentAuditor`, `spreadsheetImport`, `webhooks`, além de partes de `dashboard` e dos `events` de marketing. Nesses, o elo UC é `QUEBRADO (INEXISTENTE)`.
4. **Deriva de insumo detectada (HEAD × passo 26):** vários testes que o passo 26 marcou "❌ AUSENTE" **existem em disco no HEAD** (`ApproveContractUseCase`, `notice_modality='trabalhado'`, `read_sensitive`). Onde isso ocorre, a coluna TC reflete o **disco atual** e a Observação registra a divergência. Regra 12-14: como isto é DISCOVERY (não auditoria de commit imutável), a leitura foi feita no working tree; a promoção a finding exige fixar `AUDIT_COMMIT`.

---

## 2. Tabela principal (uma linha por BR; status por elo)

Legenda de elo: `P`=PRESENTE · `Q`=QUEBRADO · `A`=AMBÍGUO · `INEX`=INEXISTENTE. Elo-origem BR-ID = `Q` em todas as linhas (omitido da tabela, ver ressalva).

| BR-ID provisório | gap (passo 26) | REQ (elo) | UC-PESGOV → catálogo (elo) | CÓDIGO arquivo:linha (elo) | TC arquivo:linha (elo) | Elo mais fraco | Observação |
|---|---|---|---|---|---|---|---|
| **BR-RH-D01** alçada de rescisão pelo corpo | CONFIRMED | RF-RH-016/022 `[Q CONFLICTING]` | UC-PESGOV-05 → UC-68 `[P]` | `rh/presentation/routes/rh.ts:60-70,87`; `middlewares/auth.ts:213-286` `[P]` | `rh-contract-use-cases.test.ts:82-138` testa o **use case**, nunca o middleware `authorizeContractDecision` `[Q]` | **Q** | Grep confirma zero teste de `authorizeContractDecision`. A regra de alçada mais peculiar do repo é a única sem prova. Toca **FIND-ERP-007**. |
| **BR-RH-D02** `termination_reason` descartado | CONFLICTING | RF-RH-016 `[Q]` | UC-PESGOV-05 → UC-68 `[P]` | `DecideEmployeeContractUseCase.ts:24-30 × :100-107`; `employeeContractValidators.ts:27` `[P]` | `rh-contract-use-cases.test.ts:99-113` roda `rescindir` **sem** o campo → descarte indetectável `[Q]` | **Q** | Perda de dado de defesa trabalhista não observável pelo teste. FIND-ERP-007. |
| **BR-RH-D03** `notice_modality='trabalhado'` fixo; 409×422 | CONFLICTING+DISCOVERED | RF-RH-022 `[Q]` | UC-PESGOV-05/06 → UC-68/70 `[P]` | `DecideEmployeeContractUseCase.ts:100-107`; `CreateTerminationProcessUseCase.ts:51-75` `[P]` | `rh-contract-use-cases.test.ts:107-109` **asserta** `notice_modality:'trabalhado'` `[P nominal]`; 409×422 não coberto | **P (nominal)** | **Deriva de insumo:** passo 26 disse "NÃO cobre notice_modality"; em disco o teste **consagra** o valor hard-coded (não o sinaliza como divergência). FIND-ERP-007. |
| **BR-RH-D04** teto 90 dias (Art. 445 CLT) | CONFIRMED | RF-RH-008/030 (não catalogados) `[A]` | UC-PESGOV-03/04 → UC-69/68 `[P]` | `experienceContractRules.ts:12,22-34` `[P]` | `rh-contract-use-cases.test.ts:38-56` (90 exato aceita, 91 rejeita) `[P]` | **A** | Melhor cadeia RH. Fonte legal auto-declarada não verificada (LACUNA-7). |
| **BR-RH-D05** 1 prorrogação; 2ª rejeitada (Art. 451) | CONFIRMED | RF-RH (não catalogado) `[A]` | UC-PESGOV-04 → UC-68 `[P]` | `experienceContractRules.ts:36-61`; `experienceContractAutoExpire.ts` `[P]` | `rh-contract-use-cases.test.ts:57-64,140-181` `[P]` | **A** | Desvio de interpretação DOCUMENTADO no código. |
| **BR-RH-D06** `cid` por interseção rh∩sst | CONFIRMED (cid)/OBSOLETE (folha) | RF-RH-072/073, RNF-RH-01 (só BLOCO) `[Q]` | **UC-PESGOV-10 → UC-71 (COLISÃO Afastamentos×Roteiro)** `[A]` | `rhSensitiveFields.ts:61-139`; aplicado em `absenceController.ts:16,55,...` `[P]` | `rh-sensitive-fields.test.ts:20-87` testa **funções puras** (incl. `sanitizePayrollImportItem`, código morto); **controller-apply não testado** `[A]` | **A** | Grep: `absenceController` não aparece em teste. `sanitizePayrollImportItem` tem 0 chamador em `src` mas É testado. Colisão UC-71. FIND-ERP-006. |
| **BR-JUR-003** alçada por valor hard-coded × configurável | CONFLICTING | RF-JUR-003 `[Q CONFLICTING]` | **UC-PESGOV-14 → UC-52-JUR (COLISÃO UC-52)** `[A]` | `constants.ts:23,26,38-47`; `ActivateContractUseCase.ts:61-73` `[P]` | `juridico-contract-use-cases.test.ts:174-229` (3 faixas + limite exato 50k) `[P]` | **A** | Valor testado e coerente; MECANISMO diverge do contrato de API (tabela `jur_approval_thresholds` prometida × 2 números fixos). `approvalRepository` opcional: testes :115-169 instanciam sem ele e **pulam a alçada**. FIND-ERP-005. |
| **BR-JUR-D07** `diretor:operate` destrava R$500k; sem segregação | DISCOVERED+CONFLICTING | RF-JUR-003 `[Q]` | **UC-PESGOV-15 → UC-52-JUR (COLISÃO)** `[A]` | `contractController.ts:37-55,160-171`; `ApproveContractUseCase.ts:57-96`; `authorizeAnyModule.ts:55-110` `[P]` | `juridico-contract-use-cases.test.ts:231-289` testa resolução de papel/anti-spoofing/duplicidade de PAPEL — **não** o nível `operate` da rota nem `admin` dupla-alçada `[Q]` | **Q** | **Deriva de insumo:** passo 26 disse "AUSENTE"; em disco EXISTE `describe('ApproveContractUseCase')`, mas **não cobre a divergência** D07. Segregação D-K não vale aqui (LACUNA-3). FIND-ERP-005. |
| **BR-JUR-D08** `hasApprove()`/`approverHasApprove` ignorado | OBSOLETE_CANDIDATE | RF-JUR-003 (doc antiga 403) `[Q]` | **UC-PESGOV-15 → UC-52-JUR (COLISÃO)** `[A]` | `contractController.ts:141-151 × ActivateContractUseCase.ts:53-101` `[P]` | Testes passam `approverHasApprove:false` em 11 pontos (`:115,126,138,150,161,169,180,193,202,213,226`) sem jamais asseverar efeito `[Q]` | **Q** | Cobertura que dá **falsa sensação** de regra testada. Doc e código descrevem 2 regras p/ a mesma ação. |
| **BR-JUR-D09** aditivo altera valor sem reabrir alçada | CONFLICTING | RF-JUR-003 `[Q]` | **UC-PESGOV-16 → UC-52-JUR (COLISÃO)** `[A]` | `CreateContractAddendumUseCase.ts:28-67` (`:59-64` atualiza `contract.value`) `[P]` | `juridico-contract-use-cases.test.ts:315-333` testa aditivo **term** e "value sem new_value"; **não** testa `value` COM `new_value` elevando 40k→5M `[Q]` | **Q** | Contorno lateral da alçada financeira sem prova. Doc contradiz a si mesmo (`BLOCO_3_JUR_API.md:214 × :233`). FIND-ERP-005. |
| **BR-JUR-D10** pré-condições ativação; checklist truthiness; `-15` | CONFIRMED/DISCOVERED | RF-JUR-001/004/010 `[A]` | **UC-PESGOV-14 → UC-52-JUR (COLISÃO)** `[A]` | `ActivateContractUseCase.ts:75-145` (checklist :92-101; janela :123) `[P]` | `juridico-contract-use-cases.test.ts:121-171` (responsável, 2 signatários, checklist null, 404) `[P]`; **`'no'` passa** e `-15` **não testados** `[A]` | **A** | Checklist prova que alguém respondeu, não que a cláusula existe. Constante mágica `-15` sem origem documental. |
| **BR-JUR-D11** prazo titular 15 dias, uniforme p/ 8 tipos | DISCOVERED | RF-JUR-037 `[Q CONFLICTING]` | UC-PESGOV-23 → UC-56-JUR (interno, não no catálogo) `[Q]` | `CreateDataSubjectRequestUseCase.ts:39-53`; `PendingCriticalDataSubjectRequestsUseCase.ts:20-29` `[P]` | `juridico-lgpd-alert-use-cases.test.ts:96-103` testa 15d p/ **type='access' apenas**; distinção dos 8 tipos não testada `[A]` | **A** | Direitos do art. 18 têm regimes de prazo distintos ignorados. FIND-ERP-006. |
| **BR-JUR-D12** retenção: texto livre, zero enforcement | UNKNOWN | RF-JUR-035/036 `[Q]` | UC-PESGOV-22 → UC-56-JUR (interno) `[Q]` | `JurLgpdProcessingActivity.ts:27,48`; `CreateProcessingActivityUseCase.ts:57` `[P]` | `juridico-lgpd-alert-use-cases.test.ts:87-93` testa **só revisão anual**; retenção **não testável (inexiste enforcement)** `[INEX]` | **INEX** | "Regra que existe só na conversa": sem job de expurgo/anonimização. LACUNA-4. FIND-ERP-006. |
| **BR-JUR-D13** atender=operate/negar=approve; DPO=operador | CONFIRMED/DISCOVERED/UNKNOWN | RF-JUR-040/041 `[Q CONFLICTING]` | UC-PESGOV-23/24 → UC-56-JUR (interno) `[Q]` | `juridico.ts:151-173`; `ResolveDataSubjectRequest:31-36`; `DecideIncident:37-63` `[P]` | `juridico-lgpd-alert-use-cases.test.ts:113-224` cobre 041/042 (identity, reject, dupla justificativa, close); **nível de rota approve×operate e fallback `dpo_user_id=req.user.id` não testados** `[A]` | **A** | Sem cadastro de Encarregado (LACUNA-5). Sem prazo ANPD (art. 48). FIND-ERP-006. |
| **BR-SST-D14** prazo CAT sem feriados | CONFIRMED | RF-SST-024/042 `[Q CONFLICTING]` | UC-PESGOV-29 → UC-46 `[P]` | `legalDeadlineService.ts:30-41`; `EmitCatUseCase.ts:61,72-78` `[P]` | `sst-accident.test.ts:195-212` (óbito no dia; vencido não bloqueia); **pulo de fim de semana — núcleo da regra — não testado** `[A]` | **A** | Simplificação `[VERIFICAR COM TÉCNICO SST/RH]` (LACUNA-6). FIND-ERP-008. |
| **BR-SST-D15** CAT tipo (corpo) × gravidade (acidente) | DISCOVERED+CONFLICTING interno | RF-SST-024 `[Q]` | UC-PESGOV-29 → UC-46 `[P]` | `sst.ts:74-77`; `EmitCatUseCase.ts:48-98` (tipo :60) `[P]` | `sst-accident.test.ts:172-213` (inicial, 2ª inicial bloqueada, óbito prazo); **coerência tipo×gravidade não testada** `[Q]` | **Q** | Emite `tipo='obito'` p/ acidente não-óbito e vice-versa sem checagem. FIND-ERP-008. |
| **BR-SST-D16** encerramento grave exige investigação+ação | CONFIRMED | RF-SST (investigação) `[A]` | UC-PESGOV-30 → UC-46 `[P]` | `CloseAccidentUseCase.ts:39-58`; `CreateAccidentInvestigationUseCase.ts` `[P]` | `sst-accident.test.ts:131-170` (4 cenários) `[P]` | **A** | Elo TC forte; gap de schema (`encerrado_em`) declarado no código. |
| **BR-TI-D17** elegibilidade de aprovador de acesso | CONFIRMED | **RF-TI-034 `[P CONFIRMED — único REQ CONFIRMED do cluster]`** | UC-PESGOV-39 → UC-51 (sem colisão) `[P]` | `ti.ts:82-83`; `approverEligibilityService.ts:26-37`; `ApproveAccessRequestUseCase.ts:29-42` `[P]` | `ti-access-request-use-cases.test.ts:112-137` testa a máquina de estados, mas **`isEligibleApprover` está MOCKADO** (:19-22) — resolução gestor `departments.manager_id→employees.user_id` não exercitada `[A]` | **A** | **Linha mais próxima de completa do cluster**, mesmo assim TC AMBÍGUO + BR-ID origem quebrado. Único ponto com autorização reverificada fora da borda HTTP. Sem teste de auto-aprovação (regra inexiste). |
| **BR-TI-014** reveal-key: rota `operate` × domínio "qualquer nível" | CONFLICTING | RF-TI-014 `[Q CONFLICTING]` | UC-PESGOV-40 → UC (licenças, :2199-2203) `[A]` | `ti.ts:70`; `RevealLicenseKeyUseCase.ts:31-40`; `licenseController.ts:80-97` `[P]` | `ti-license-use-cases.test.ts:71-88` testa a lógica do use case (qualquer nível ti/admin); **emissão de `read_sensitive` pelo fluxo de reveal + divergência rota×domínio não testadas** `[A]` | **A** | `audit-log-action-downgrade.test.ts:140-148` testa `read_sensitive` p/ license **no downgrade de auditoria**, não a partir do reveal. Log é fire-and-forget após devolver a chave. |
| **BR-DIR-D18** `risk_score` server-side | DISCOVERED | **Nenhum RF — directorate sem RF `[INEX]`** | **UC-PESGOV-36 → FANTASMA (sem UC)** `[INEX]` | `directorate/domain/services/riskScore.ts:18-34` `[P]` | `directorate-use-cases.test.ts:45-108` (it.each 5 casos + ignora payload) `[P]` | **INEX** | CÓDIGO e TC PRESENTES e fortes, mas **UC e REQ INEXISTENTES**: comportamento bem-testado sem rastro documental a montante. |
| **BR-MKT-D19** SLA handoff 2 dias corridos × úteis; janela 90d; 90/100% | CONFLICTING | RF-MKT-015 (só BLOCO) `[Q]` | **UC-PESGOV-49 → UC-53 (COLISÃO Marketing×Contencioso)** `[A]` | `marketing/domain/constants.ts:15-25` `[P]` | `marketing-lead-use-cases.test.ts:167-290` testa o funil e `handoff_at`; **SLA 2-dias, janela 90d e alertas 90/100% não testados** `[Q]` | **Q** | Funil PRESENTE; as **constantes divergentes** (o cerne do CONFLICTING) sem prova. Catálogo UC-53 diz "sem approve" — falso. |
| **BR-FAC-D20** divergência de KM exige justificativa+approve | DISCOVERED | RF-FAC-017/018 (só BLOCO) `[Q]` | UC-PESGOV-44 → UC-58 (facilities renumerado pós-colisão UC-52) `[A]` | `facilities/.../TripUseCases.ts` (DepartTrip); `tripController.ts:76-83` `[P]` | `facilities-trip-use-cases.test.ts:150-173` testa **diretamente**: sem `hasApproveLevel`→rejeita; com justificativa+approve→aceita `[P]` | **A** | **4º mecanismo distinto de "quem aprova"**. Melhor TC do bloco de suporte. Colisão UC-52 é histórica (Facilities substituído). |
| **BR-IMP-D21** importação exige interseção `produtos`∩`bom` | DISCOVERED | **Nenhum RF — spreadsheetImport sem RF `[INEX]`** | **UC-PESGOV-54 → FANTASMA (sem UC)** `[INEX]` | `spreadsheetImport/.../catalogImport.ts:27-47` `[P]` | `catalog-spreadsheet-import.test.ts:347-374` (caso 6, Postgres real): usuário com `produtos` sem `bom` → 403 `MODULE_ACCESS_DENIED` `[P]` | **INEX** | CÓDIGO+TC PRESENTES (integração DB-gated, `describe.skip` sem banco), mas **UC e REQ INEXISTENTES**. |
| **BR-WHK-D22** dois níveis de proteção (n8n HMAC × focus-nfe header) | DISCOVERED+CONFLICTING interno | **Nenhum RF — webhooks sem RF `[INEX]`** | **UC-PESGOV-55 → FANTASMA (sem UC)** `[INEX]` | `webhooks/routes/webhooks.ts:6-13`; `ProcessN8nWebhookUseCase.ts:47-64`; `webhookController.ts:52-57` `[P]` | `webhooks-use-cases.test.ts:12-76` cobre n8n (assinatura, **falha-fechada**, HMAC, event_id) + `n8n-webhook.test.ts` integração; **lado focus-nfe não testado** (grep confirma) `[A]` | **INEX** | Metade forte (n8n) provada; metade fraca (focus-nfe, comparação simples não timing-safe) sem teste — o conflito interno fica meio-coberto. |

---

## 3. Elos reversos (o que a matriz encontrou "de trás para frente")

### 3.1 Módulos inteiros FANTASMA (código roteado sem UC no catálogo)

| Módulo | Código roteado | Tem teste? | UC | REQ | BR |
|---|---|---|---|---|---|
| `directorate` | org-chart, strategic-planning, meeting-minutes, business-risk (`directorate.ts:35-54`) | **Sim**, forte — `directorate-use-cases.test.ts` (org-chart, KPI, atas, risco) | INEXISTENTE (UC-PESGOV-32..36) | INEXISTENTE | só BR-DIR-D18 |
| `reports` | 8 relatórios (`reports.ts:24-31`) | Sim (`reports-export.test.ts` unit+integração, `cost-variance-report`, `oee-report`, `manufacturing-reports`, `reports-cross-module-permission`) | INEXISTENTE (UC-PESGOV-51) | INEXISTENTE | **NENHUM BR** (§6 passo 26 = UNKNOWN) |
| `intelligentAuditor` | 4 rotas admin (`intelligentAuditor.ts:12-15`) | Parcial — `intelligentAuditor-use-cases.test.ts` cobre só **2 de 4** use cases (stock, financial), **delegação-only**; `authorize('admin')` global não testado | INEXISTENTE (UC-PESGOV-53) | INEXISTENTE | NENHUM BR |
| `spreadsheetImport` | `catalogImport.ts` | Sim, forte — `catalog-spreadsheet-import.test.ts` (integração DB, 7 casos) | INEXISTENTE (UC-PESGOV-54) | INEXISTENTE | só BR-IMP-D21 |
| `webhooks` | n8n + focus-nfe | Parcial — n8n testado; focus-nfe não | INEXISTENTE (UC-PESGOV-55) | INEXISTENTE | só BR-WHK-D22 |
| `dashboard` (parte) | `index`, `department-demands` | Sim (`dashboard-department-demands-use-case.test.ts` delegação; `dashboard-use-cases`, `handoff-signal`) | PARCIAL: só `/handoffs`↔UC-40; `index`/`demands` FANTASMA | INEXISTENTE p/ index/demands | NENHUM BR |
| `marketing` (parte) | `events*` (`marketing.ts:62-69`) | Sim (`marketing-event-use-cases.test.ts`) | FANTASMA (UC-53 lista só campanhas/leads/materiais) | — | — |

### 3.2 UCs recuperados sem prova de comportamento próprio
- **UC-PESGOV-12** (RH benefícios/treinamentos/ponto): catálogo diz "passada 2 / não implementado" (:2506-2510) mas está roteado (`rh.ts:132-157`). `rh-block6-extension-use-cases.test.ts` existe mas não cobre a divergência "doc-diz-que-não × código-diz-que-sim".
- **Nível de rota (approve×operate)** em LGPD/SST/RH: nenhum teste de rota exercita a diferença de nível (BR-JUR-D13, BR-SST-D15, BR-RH-D01) — os testes são de use case, não de middleware.

### 3.3 REQs fantasma (elo REQ INEXISTENTE ou só em BLOCO)
- `directorate`, `reports`, `webhooks`, `spreadsheetImport`, `intelligentAuditor`: **zero RF** em qualquer artefato de requisito.
- `juridico` (75) + `ti` (47) + `sst` (75) + `rh` (57) = **254 endpoints** sem RF em `DOCUMENTO_DE_REQUISITOS.md`; vivem em `BLOCO_*_API.md` (não-baseline). Baseline §5-6: **nenhum dos 90 RFs tem OWNER/AC/TC** — a cadeia `BR→REQ→UC→AC→TC` do §19/§20 do Master Spec **não existe**.
- Único REQ CONFIRMED do cluster: **RF-TI-034** (BR-TI-D17).

### 3.4 Código sem BR
- Todo `reports`, `dashboard`, `intelligentAuditor`, e a maior parte de `directorate` (org-chart, strategic-planning, meeting-minutes) têm código + teste **sem BR-ID** — comportamento provado tecnicamente, sem regra de negócio rastreável a montante.

---

## 4. Placar

**Cadeias BR→REQ→UC→CÓDIGO→TC completas (5 elos PRESENTES): 0 de 22.** Nenhuma regra do cluster tem cadeia íntegra — o elo-origem BR-ID está quebrado em 22/22 e o elo REQ é CONFLICTING/INEXISTENTE em 21/22 (exceção RF-TI-034). A linha mais próxima (BR-TI-D17) para em TC AMBÍGUO.

**Elo-origem (BR-ID canônico):** QUEBRADO 22/22.

**Elo REQ:** PRESENTE 1 (RF-TI-034) · AMBÍGUO 4 (D04, D05, D10, D16) · QUEBRADO/CONFLICTING 12 · INEXISTENTE 5 (DIR-D18, IMP-D21, WHK-D22 e, por módulo, reports/dashboard/auditor).

**Elo UC:** PRESENTE 8 · AMBÍGUO por colisão de UC-ID **7** (BR-JUR-003, D07, D08, D09, D10 → UC-52; BR-MKT-D19 → UC-53; BR-RH-D06 → UC-71) · INEXISTENTE/FANTASMA 3 (DIR-D18, IMP-D21, WHK-D22) + 2 fracamente documentados (D11/D12/D13 → UC-56-JUR "interno" não catalogado).

**Elo CÓDIGO:** PRESENTE 22/22 (é o único elo íntegro em todo o cluster — todo comportamento tem arquivo:linha).

**Elo TC (cobertura de teste real):** PRESENTE 6 (D03 nominal, D04, D05, D16, D18, FAC-D20, IMP-D21 → na prática 7) · AMBÍGUO 8 (D06, JUR-003, D10, D11, D13, TI-D17, TI-014, WHK-D22, SST-D14) · QUEBRADO 6 (RH-D01, RH-D02, JUR-D07, JUR-D08, JUR-D09, SST-D15, MKT-D19) · INEXISTENTE 1 (JUR-D12).

**Cobertura de teste real por UC (amostra do cluster):** dos comportamentos críticos de autorização, **5 seguem sem prova** (herdado e reconfirmado): `authorizeContractDecision` (RH-D01), divergência de nível em `ApproveContractUseCase` (JUR-D07), aditivo×alçada (JUR-D09), nível de rota LGPD/SST (D13/D15), emissão de `read_sensitive` pelo reveal (TI-014).

**Linhas AMBÍGUO por colisão de UC-ID: 7** (detalhadas acima). Colisões que as causam: 3 (UC-52, UC-53, UC-71).

---

## 5. Causas-raiz (por que a matriz nasce quebrada)

1. **Ausência de BR-ID canônico versionado.** O primeiro elo da cadeia não existe no repositório — só rótulos provisórios de discovery. Enquanto isso persistir, nenhuma linha pode ser marcada PROVADA de ponta a ponta. (Regra 17.)
2. **Reuso de UC-ID no catálogo** (`04-USE_CASES.md`): UC-52/UC-53/UC-71 apontam para dois casos de uso distintos cada, um deles às vezes só no código. Rastreabilidade UC→código fica ambígua por construção — 7 linhas contaminadas.
3. **Módulos sem UC** (`directorate`, `reports`, `intelligentAuditor`, `spreadsheetImport`, `webhooks`, partes de `dashboard`/`marketing`): comportamento roteado e (em vários casos) bem-testado, sem caso de uso nem requisito documentado — o elo UC nasce INEXISTENTE.
4. **REQs fora do índice / sem AC/TC:** 254 endpoints do cluster vivem em `BLOCO_*_API.md` (não-baseline); nenhum RF do repo tem OWNER, critério de aceite ou aponta um TC. A cadeia exigida pelo Master Spec não foi instanciada.
5. **Testes provam use case, não a borda de autorização:** o padrão do cluster é testar o caso de uso (com serviços de elegibilidade/repos mockados ou opcionais) e deixar o middleware/rota — onde mora a alçada — sem cobertura. Daí a concentração de TC `QUEBRADO`/`AMBÍGUO` justamente nas regras de "quem pode".
6. **Deriva entre discovery e HEAD:** parte das lacunas do passo 26 foi fechada por testes adicionados depois (ex.: `ApproveContractUseCase`), mas os testes novos cobrem o fluxo feliz, não a divergência apontada — a lacuna material permanece sob aparência de cobertura.

---

## 6. Candidatos a finding (NÃO promovidos — insumo para o validador)

*Nenhum finding formal, severidade ou confiança é declarado aqui. Onde uma BR toca um finding existente, o FIND-ID é citado; esses não são reauditados.*

1. **Elo-origem inexistente em todo o cluster** — 22 regras de negócio sem BR-ID canônico versionado; cadeia `BR→REQ→UC→AC→TC` ausente. (Rastreabilidade / Regra 17.)
2. **Colisão de UC-ID no catálogo** (UC-52, UC-53, UC-71) contaminando 7 linhas — o próprio doc admite a dívida (:2372-2380). (Regra 17.)
3. **Cinco regras críticas de autorização sem prova**: `authorizeContractDecision` (BR-RH-D01), nível `operate`×`admin` em `ApproveContractUseCase` (BR-JUR-D07), aditivo×alçada (BR-JUR-D09), nível de rota LGPD/SST (BR-JUR-D13/BR-SST-D15), emissão de `read_sensitive` no reveal (BR-TI-014). Toca FIND-ERP-005/006/007/008.
4. **Cobertura que induz falsa confiança**: `approverHasApprove`/`hasApprove()` (BR-JUR-D08) — 11 testes passam o parâmetro e nunca asseveram efeito.
5. **Comportamento sem enforcement testável**: retenção LGPD (BR-JUR-D12) — elo TC INEXISTENTE por inexistência de implementação. FIND-ERP-006.
6. **Módulos FANTASMA bem-testados porém sem UC/REQ** (directorate, spreadsheetImport, reports, webhooks, intelligentAuditor) — código provado sem regra de negócio a montante; risco de comportamento não governado.
7. **Divergência interna não coberta por teste**: CAT `tipo` (corpo) × `gravidade` (acidente) — BR-SST-D15; e dois níveis de proteção de webhook — BR-WHK-D22 (lado focus-nfe sem teste).

---

## Notas de conformidade desta trilha
- Read-only: nenhum arquivo do objeto auditado foi alterado; nada foi executado (Regra 2, hook org-isolation).
- Findings existentes (FIND-ERP-005/006/007/008) apenas referenciados, não reabertos nem reafirmados.
- Toda linha da tabela tem os elos marcados como PRESENTE, QUEBRADO, AMBÍGUO ou INEXISTENTE — **nunca em branco** (critério de conclusão do passo 29).
- Saída devolvida como TEXTO para o orquestrador persistir em `docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_TRACEABILITY_MATRIX_pessoas-governanca.md` (escrita VeriCore fora de `audit/` é bloqueada por hook).
