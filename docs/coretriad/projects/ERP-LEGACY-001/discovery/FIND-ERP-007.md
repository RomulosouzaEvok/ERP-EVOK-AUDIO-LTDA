# FINDING

FINDING_ID: FIND-ERP-007
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passo 26), fora da sequência normal do passo 31, por autorização humana explícita do dono do CoreTriad (APR-2026-018)
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: c9359be399c45191fe90e8e9707803125a5ba91d (tag `legacy-baseline-001`)
TITLE: Rescisão de contrato de experiência — `termination_reason` aceito, validado e descartado (sem coluna de destino), aviso prévio presumido `trabalhado` por decisão de código, e status HTTP divergente do contrato de API
DOMAIN: business-rules / RH (contrato de experiência e demissão)
SUBDOMAIN: conformidade documentado × implementado × testado (Master Spec §19)
SEVERITY: MEDIUM  (rebaixado de HIGH → MEDIUM pelo vericore-finding-validator — ver seção "Validação" ao final)
CONFIDENCE: CONFIRMED (itens 1 e 2); item 3 → NEEDS_MORE_EVIDENCE (duas alegações de evidência refutadas — ver Validação)
STATUS: OPEN
AMBIENTE: DEV/HOMOLOGAÇÃO — NÃO-PRODUÇÃO
DETECTED_BY: vericore-business-rule-auditor (discovery passo 26, BR-RH-D02 e BR-RH-D03)

## CORREÇÕES AO INSUMO DE DISCOVERY (relidas contra o código, não copiadas)

Duas afirmações do documento de discovery estavam **imprecisas** e foram corrigidas neste
finding — ambas na direção de **agravar**, não atenuar:

1. **BR-RH-D03 afirma que o teste "NÃO cobre `notice_modality`"** — falso.
   `server/tests/unit/rh-contract-use-cases.test.ts:107-109` asserta explicitamente
   `notice_modality: 'trabalhado'`. Isso agrava o achado: a presunção trabalhista não
   documentada está **congelada por teste**, dando aparência de regra rastreável a uma
   decisão sem origem documental.
2. **BR-RH-D02 sugere um "descarte" de escrita** — a causa é mais estrutural:
   `hr_termination_processes` **não possui coluna alguma** para motivo de rescisão
   (`server/src/models/HrTerminationProcess.ts:16-47`; migration `20260808-000016`:40-92 — só
   existe `cancel_reason`, que é do cancelamento do processo). O contrato de API promete uma
   **capacidade que não existe no schema**. Remediação exige migration, não só passar o campo.

## AMBIENTE E CALIBRAGEM DA SEVERIDADE

O módulo `rh` está classificado **NÃO-PRODUÇÃO** em
`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md:162` ("Depende de `employees` (0)"),
e `employees` tem **0 registros medidos** (:95, :135). Não existe, hoje, nenhuma rescisão real
processada por este código.

A severidade **HIGH** NÃO decorre de exposição atual — decorre do **efeito trabalhista no
momento em que o módulo entrar em produção**: as três divergências afetam prova documental de
demissão e base de cálculo de verbas rescisórias, e nenhuma é detectável pela suíte atual.
Enquanto `employees = 0`, o impacto operacional é **nulo**; a partir da primeira admissão real,
é imediato e retroativo (a decisão errada fica gravada no processo).

## ITEM 1 — `termination_reason` é aceito, validado e nunca lido (sem coluna de destino)

DESCRIPTION:
O contrato de API documenta e exemplifica o envio de `termination_reason` junto de
`decision='rescindir'` (`docs/business/BLOCO_6_RH_API.md:526`:
`{ "decision": "rescindir", "termination_reason": "termino_experiencia" }`).
O schema Zod aceita e valida — `z.string().trim().max(1000).optional()`
(`employeeContractValidators.ts:27`), dentro de um schema `.strict()` (:28), ou seja, o campo
foi **deliberadamente adicionado à allow-list**. O controller repassa o payload inteiro via
spread `...parsed` (`employeeContractController.ts:94`), de modo que o valor **chega** a
`execute()`. O use case declara o campo na interface (`DecideEmployeeContractUseCase.ts:24-30`,
:28: `termination_reason?: string;`).

E então **`execute()` nunca lê `input.termination_reason`**. O ramo de rescisão (:100-107) monta
a chamada com objeto fixo:

```
return this.createTerminationProcessUseCase.execute({
  employee_id: contract.employee_id,
  termination_type: 'termino_experiencia',
  notice_date: new Date().toISOString().slice(0, 10),
  notice_modality: 'trabalhado',
  termination_date: null,
  createdBy: input.createdBy,
});
```

Grep exaustivo por `termination_reason` em `server/src/modules/rh/**` retorna **exatamente 2
ocorrências**: o validador (:27) e a declaração da interface (:28). Nenhuma leitura, nenhuma
escrita.

**AGRAVANTE ESTRUTURAL** (verificado, não estava no insumo): não existe coluna de destino.
`hr_termination_processes` não possui campo algum para motivo de rescisão —
`HrTerminationProcess.ts:16-47` e a migration
`20260808-000016-create-hr-termination-processes.cjs:40-92` listam `cancel_reason` (TEXT), que é
o motivo de **cancelamento do processo**, semanticamente distinto. Portanto o contrato de API
não promete um campo que o código esqueceu de gravar: promete uma **capacidade que o schema não
suporta**. A remediação exige migration + model + repositório + use case.

**MITIGAÇÃO PARCIAL** (verificada, não elimina o achado): o texto sobrevive em `audit_logs` via
`logAction(..., newValues: parsed, ...)` (`employeeContractController.ts:95-98`). É trilha de
auditoria técnica, não campo do processo de demissão: não aparece em
`GET /termination-processes/:id`, não compõe o TRCT, não é consultável pelo RH no fluxo de
defesa trabalhista, e é registro fire-and-forget cuja falha não bloqueia a operação.

**DIVERGÊNCIA SECUNDÁRIA DE TIPO:** o exemplo do contrato usa o valor `"termino_experiencia"` —
que é um **valor de enum de `termination_type`**, não texto livre — enquanto o Zod aceita
qualquer string de até 1000 caracteres. Documento e implementação divergem também quanto à
natureza do campo (código de motivo × narrativa livre). Não há requisito que defina a intenção:
`BLOCO_6_RH_REQUISITOS.md` não menciona `termination_reason` em RF-RH-016 (:137) nem em
RF-RH-017 (:143).

EXPECTED_BEHAVIOR: O motivo da rescisão enviado conforme `BLOCO_6_RH_API.md:526` é persistido de
forma recuperável no processo de demissão criado.
ACTUAL_BEHAVIOR: O motivo é validado, trafega até o use case e é descartado; sobrevive apenas
como metadado de `audit_logs`. Nenhum erro, nenhum aviso — a API responde `200` como se tivesse
registrado.

EVIDENCE (dois lados da comparação):

| Lado | Arquivo | Linhas |
|---|---|---|
| Documentado | `docs/business/BLOCO_6_RH_API.md` | 526 (exemplo de request) |
| Aceito (Zod) | `rh/presentation/validators/employeeContractValidators.ts` | 24-32 (campo em :27, `.strict()` em :28) |
| Repassado | `rh/presentation/controllers/employeeContractController.ts` | 88-98 (`...parsed` em :94; `newValues: parsed` em :97) |
| Declarado | `rh/application/use-cases/contract/DecideEmployeeContractUseCase.ts` | 24-30 (:28) |
| Não usado | mesmo arquivo | 60-108 (corpo integral); ramo de rescisão em 100-107 |
| Sem destino (model) | `server/src/models/HrTerminationProcess.ts` | 16-47 (`cancel_reason` em :39) |
| Sem destino (banco) | `server/migrations/20260808-000016-create-hr-termination-processes.cjs` | 40-92 (`cancel_reason` em :74) |

SEVERITY DO ITEM: MEDIUM (perda de dado de defesa trabalhista; parcialmente compensada por
`audit_logs`, e hoje sem dado real em risco)

## ITEM 2 — `notice_modality = 'trabalhado'` fixado por decisão de código, sem origem documental

DESCRIPTION:
`DecideEmployeeContractUseCase.ts:104` grava `notice_modality: 'trabalhado'` hard-coded em todo
processo de demissão aberto por `decision='rescindir'`. O campo é um enum de dois valores
(`'trabalhado' | 'indenizado'` — `CreateTerminationProcessUseCase.ts:22`;
`HrTerminationProcess.ts:24`; migration :54) e é `allowNull: false`.

Aviso prévio **trabalhado × indenizado** tem efeito direto e material sobre verbas rescisórias
(projeção do aviso sobre o contrato, 13º e férias proporcionais, data de baixa na CTPS, e a
própria contagem do prazo do Art. 477 §6º da CLT, que o sistema materializa como coluna gerada
`payment_deadline = termination_date + 10`, migration :94-100). Fixá-lo em código é uma
**presunção trabalhista tomada pelo software**, não uma decisão de negócio registrada.

**BUSCA POR FONTE AUTORITATIVA (executada, resultado negativo):**
- `BLOCO_6_RH_API.md` — a única ocorrência de `notice_modality` é `:577`, e traz o valor
  **`"indenizado"`**, no exemplo do `POST /termination-processes` (§6). Ou seja: **o único
  exemplo documentado do campo usa o valor oposto ao que o código fixa na rescisão de
  experiência.**
- `BLOCO_6_RH_REQUISITOS.md:143` (RF-RH-017) lista `notice_modality` como campo do processo com
  os dois valores possíveis — **não define padrão nem regra de escolha**.
- `BLOCO_6_RH_MODELO_DADOS.md:356` declara apenas `DATEONLY/ENUM | NOT NULL`.
- Grep por `notice_modality` em `docs/` retorna 3 ocorrências (as acima) + o documento de
  discovery. **Nenhum artefato versionado determina que término de experiência implique aviso
  trabalhado.**
- Nenhum comentário no código cita requisito, BR-ID ou decisão do dono para essa linha — ao
  contrário das linhas vizinhas, densamente justificadas (`:95-99` cita RF-RH-022; `:76-80` cita
  RNF-RH-04).

Enquadra-se em **Regra 6 do CLAUDE.md** (nenhum agente pode inventar regra de negócio) e no
padrão "regra que existe só em memória/conversa, não em artefato versionado".

**AGRAVANTE — a presunção está congelada por teste, criando falsa rastreabilidade:**
`server/tests/unit/rh-contract-use-cases.test.ts:107-109` asserta explicitamente
`notice_modality: 'trabalhado'` dentro de `expect.objectContaining`. O valor sem origem
documental é, portanto, **protegido contra mudança** pela suíte: um desenvolvedor que corrigisse
o comportamento veria o teste falhar e concluiria que "trabalhado" é a regra correta.

EXPECTED_BEHAVIOR: A modalidade de aviso prévio decorre de decisão de negócio registrada em
artefato versionado (requisito/BR com owner), ou é informada por quem decide a rescisão.
ACTUAL_BEHAVIOR: Constante literal em `:104`, sem parâmetro de entrada, sem origem documental,
sem owner, contrariando o único exemplo documentado do campo (`BLOCO_6_RH_API.md:577`).

EVIDENCE:

| Lado | Arquivo | Linhas |
|---|---|---|
| Implementado (fixo) | `rh/application/use-cases/contract/DecideEmployeeContractUseCase.ts` | 104 (bloco 100-107) |
| Enum aceito | `rh/application/use-cases/termination/CreateTerminationProcessUseCase.ts` | 22, 58-60 |
| Enum no banco | `models/HrTerminationProcess.ts:24` · migration `20260808-000016...cjs:54` | — |
| Documentado (valor OPOSTO, outro endpoint) | `docs/business/BLOCO_6_RH_API.md` | 577 (`"notice_modality": "indenizado"`) |
| Requisito silente | `docs/business/BLOCO_6_RH_REQUISITOS.md` | 143 (RF-RH-017) |
| Teste que congela a presunção | `server/tests/unit/rh-contract-use-cases.test.ts` | 107-109 |

SEVERITY DO ITEM: HIGH (efeito direto em verbas rescisórias; regra de negócio sem fonte
autoritativa, congelada por teste)

## ITEM 3 — Divergência de status HTTP: código 409 × contrato de API 422

DESCRIPTION (confirmado):
`CreateTerminationProcessUseCase.ts:62-65` lança `ConflictError` quando já existe processo de
demissão aberto para o funcionário. `ConflictError` mapeia para **HTTP 409 / `code: 'CONFLICT'`**
(`server/src/errors/index.ts:53-57`). `BLOCO_6_RH_API.md:542` documenta, para exatamente o mesmo
caso, **422 `BUSINESS_RULE_VIOLATION`** — que no repositório corresponde a `BusinessRuleError`
(`errors/index.ts:63-67`).

O próprio `DecideEmployeeContractUseCase` usa `BusinessRuleError` (→422) na outra pré-condição
da mesma rota (`:66-68`, contrato fora de `ativo`/`prorrogado`), que o documento lista **na mesma
linha :542**. Ou seja: das duas condições documentadas como 422, uma retorna 422 e a outra
retorna 409 — divergência de contrato observável por qualquer cliente da API.

NOTA DE ESCOPO: qual dos dois é o correto **não é decisão desta auditoria** (Regra 20-21) —
reporta-se a divergência; a fonte autoritativa é do responsável humano.

EVIDENCE:

| Lado | Arquivo | Linhas |
|---|---|---|
| Implementado | `rh/application/use-cases/termination/CreateTerminationProcessUseCase.ts` | 62-65 |
| Mapeamento 409 | `server/src/errors/index.ts` | 53-57 |
| Documentado 422 | `docs/business/BLOCO_6_RH_API.md` | 542 |
| Mapeamento 422 | `server/src/errors/index.ts` | 63-67 |
| Comportamento coerente na condição vizinha | `DecideEmployeeContractUseCase.ts` | 66-68 |

SEVERITY DO ITEM: LOW (divergência de contrato de interface; sem efeito material sobre dado
trabalhista; sem consumidor de produção hoje)

## LACUNA DE TESTE (regra crítica sem teste)

- **Item 1 — indetectável pela suíte.** O único teste do ramo de rescisão
  (`rh-contract-use-cases.test.ts:99-111`) chama
  `useCase.execute({ id: 42, decision: 'rescindir', createdBy: 9 })` (:105) — **sem
  `termination_reason`**. Duplo motivo de indetectabilidade: (a) o campo não é enviado; (b) a
  asserção usa `expect.objectContaining` (:107), que por construção **ignora campos ausentes** —
  mesmo que o teste passasse o motivo, a asserção não falharia por ele ter sido descartado.
  Nenhum teste em `server/tests/**` exercita `rescindir` com `termination_reason` (grep: zero).
- **Item 2 — testado com o valor errado pelo motivo errado.** :107-109 asserta
  `notice_modality: 'trabalhado'`, fixando por teste uma regra sem fonte autoritativa.
- **Item 3 — CORRIGIDO pela validação.** ~~Não existe nenhum teste de
  `CreateTerminationProcessUseCase`~~ — **FALSO**: `rh-admission-termination-use-cases.test.ts:184-237`
  tem o bloco `describe('CreateTerminationProcessUseCase')` com 4 testes, e **`:219-227` exercita
  o ramo 409** (`rejects.toMatchObject({ statusCode: 409 })`). A alegação verdadeira e mais fraca
  que sobrevive: não há teste de **nível de rota** aferindo o status HTTP efetivo do endpoint.

RELATED_BUSINESS_RULE: BR-RH-D02, BR-RH-D03 (IDs **candidatos**, propostos em
`BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` §1 — **não existem no repositório**)
RELATED_REQUIREMENT: RF-RH-016 (:137), RF-RH-017 (:143), RF-RH-022 (:148)
RELATED_USE_CASE: UC-68 (A1), UC-70 (A1)
RELATED_TEST: `rh-contract-use-cases.test.ts:99-111` (cobre parcialmente o item 2 com o valor
não documentado; não cobre os itens 1 e 3)

BUSINESS_IMPACT: Quando `rh` entrar em produção, toda rescisão de contrato de experiência nasce
(a) sem o motivo registrado no processo formal de demissão — dado de defesa em reclamatória
trabalhista, disponível apenas por perícia em `audit_logs`; e (b) com aviso prévio presumido
como trabalhado, presunção que altera verbas rescisórias e não foi decidida por ninguém
identificável.
TECHNICAL_IMPACT: Contrato de API promete campo que o schema do banco não comporta; regra de
negócio materializada como constante literal sem BR-ID nem owner; suíte verde congela a
presunção e mascara o descarte.
SECURITY_IMPACT: Nenhum (não há vetor de autorização/exposição neste finding).
COMPLIANCE_IMPACT: CLT Art. 477 §6º e regime de aviso prévio (Lei 12.506/2011) — o sistema toma
posição sobre a modalidade do aviso sem instrumento normativo interno que a fundamente.

REPRODUCTION (leitura estática determinística — nenhum comando executado, nenhum banco acessado):
1. `PATCH /api/rh/employee-contracts/42/decision` com
   `{ "decision": "rescindir", "termination_reason": "desempenho abaixo do esperado" }`.
2. Zod aceita (`employeeContractValidators.ts:27`); controller repassa `...parsed` (:94).
3. `DecideEmployeeContractUseCase.execute` cai em `:100-107` e monta o input **sem**
   `termination_reason`; grava `notice_modality: 'trabalhado'` (:104).
4. `hr_termination_processes` recebe a linha sem qualquer campo de motivo (não existe coluna),
   com `notice_modality = 'trabalhado'`.
5. Resposta `200 OK`. O motivo existe apenas em `audit_logs.new_values`.
6. Repetindo com processo já aberto: `:62-65` → `ConflictError` → **409**, enquanto
   `BLOCO_6_RH_API.md:542` documenta **422**.

ROOT_CAUSE_HYPOTHESIS: O contrato de API (§5.2) foi escrito antes do modelo de dados de demissão
(§6) e nunca reconciliado: `termination_reason` entrou no exemplo e no schema de validação, mas
`hr_termination_processes` nasceu sem coluna correspondente — mesmo padrão de lacuna que a
própria migration `20260808-000016` documenta ter sofrido 5 vezes (:23-36, campos
`trct_paid_at`, `concluded_by`, `concluded_at` ausentes apesar de exigidos pelo contrato). Os
demais parâmetros do processo foram então preenchidos com valores plausíveis escolhidos pelo
implementador para satisfazer as colunas `NOT NULL`, sem decisão de negócio a consultar.

REFERENCE: `BLOCO_6_RH_API.md` §5.2 (:519-542) e §6 (:555-577); `BLOCO_6_RH_REQUISITOS.md`
RF-RH-016/017/022; `PRODUCTION_STATUS_MAP.md` :95, :135, :162; CLAUDE.md Regras 6, 7, 16, 17,
20-21; CORETRIAD_MASTER_SPEC Parte IV §19.

RECOMMENDATION (não vinculante — a decisão de qual versão prevalece é do responsável humano,
Regra 20-21; a remediação é da SanaCore, Regra 2):
1. Determinar a fonte autoritativa de cada divergência **antes** de qualquer código:
   (a) `termination_reason` deve existir? é enum ou texto livre? (b) qual é a regra de
   `notice_modality` no término de experiência? (c) 409 ou 422?
2. Registrar as decisões como BR-IDs com owner nominal em artefato versionado (Regras 16-17).
3. Só então implementar — item 1 exige migration + model + repositório + use case; item 2 exige
   tornar a modalidade decidida, com o teste :107-109 atualizado para citar o BR-ID de origem.
SUGGESTED_REMEDIATION_OWNER: SanaCore

## RETEST_SPECIFICATION

**Pré-condição comum:** a remediação só é retestável após existir, em artefato versionado, a
decisão do responsável humano sobre cada item (Regra 20-21). Sem isso, qualquer implementação
reproduz o problema de origem — regra sem fonte autoritativa.

**RT-007-A (item 1 — persistência do motivo)**
- (a) Existe migration versionada criando a coluna de motivo em `hr_termination_processes` (ou
  decisão versionada registrando que o campo NÃO deve ser persistido — caso em que RT-007-B se
  aplica no lugar).
- (b) `PATCH /employee-contracts/:id/decision` com
  `{ decision: 'rescindir', termination_reason: '<texto>' }` cria o processo e o valor é
  recuperável em `GET /termination-processes/:id`.
- (c) Teste unitário exercita `execute` **com** `termination_reason` e asserta que o valor chega
  ao `CreateTerminationProcessUseCase`, usando asserção que **falharia se o campo fosse omitido**
  (`toHaveBeenCalledWith` exato ou `objectContaining` contendo a chave — nunca `objectContaining`
  sem a chave, que é o defeito atual da suíte em :107).
- (d) Teste de que a rescisão **sem** `termination_reason` continua funcionando — sem regressão.

**RT-007-B (item 1 — alternativa "não persistir", se for a decisão registrada)**
- (a) O campo é removido do schema Zod (:27) e da interface (:28), OU a API passa a rejeitar
  explicitamente o envio; o contrato `BLOCO_6_RH_API.md:526` é corrigido pelo owner do documento.
- (b) Teste que prova que o envio do campo não é silenciosamente aceito.

**RT-007-C (item 2 — modalidade do aviso prévio)**
- (a) Existe artefato versionado (BR-ID com owner) definindo a modalidade no término de contrato
  de experiência.
- (b) O código em `:104` referencia esse BR-ID em comentário ou constante nomeada — não uma
  literal anônima.
- (c) Se "parametrizável": teste com `indenizado` gera processo com `notice_modality='indenizado'`;
  teste com valor ausente aplica o padrão documentado.
- (d) Se "sempre trabalhado": o teste :107-109 permanece, **acrescido** da citação do BR-ID.
- (e) `BLOCO_6_RH_API.md` §5.2 documenta o comportamento resultante (hoje é omisso).

**RT-007-D (item 3 — status HTTP)**
- (a) Teste que prova o status HTTP efetivo da rota para "processo já aberto" (409 **ou** 422),
  batendo com o valor registrado como autoritativo.
- (b) `BLOCO_6_RH_API.md:542` e `errors/index.ts` concordam entre si após a decisão.
- (c) Teste unitário do ramo `:62-65` de `CreateTerminationProcessUseCase` (hoje inexistente).

**RT-007-E (regressão geral)**
- Suíte completa verde no REMEDIATION_COMMIT, com o módulo `rh` reexecutado.
- Nenhuma alteração em `payment_deadline` (coluna gerada) nem no fluxo de conclusão (RF-RH-022).

## DECLARAÇÃO DE ESCOPO E AUTORIDADE

- **Nenhuma remediação foi aplicada.** Nenhum arquivo de `server/`, `docs/business/` ou
  `coretriad/` foi alterado por esta análise (Regra 2).
- Método: READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Modo read-only reforçado —
  **nenhum comando executado, nenhuma conexão de banco, nenhum teste rodado**.
- Este finding **não declara** `REMEDIATION COMPLETE` (SanaCore) nem `RETEST_PASSED`/`CLOSED`
  (vericore-software-audit-director, Regra 4).
- Severidade **HIGH** confirmada, com discordância parcial registrada: por item, item 1 = MEDIUM,
  item 2 = HIGH, item 3 = LOW. HIGH agregado sustenta-se pelo item 2 (presunção trabalhista sem
  fonte autoritativa, congelada por teste) somado ao item 1, e **explicitamente não** pela
  exposição atual, que é nula em DEV/HOMOLOGAÇÃO.
- Por ser HIGH, requer passagem pelo **vericore-finding-validator** antes de consolidação.
- LACUNAS PARA DECISÃO HUMANA (Regra 21): as três perguntas do RECOMMENDATION item 1 não são
  resolvíveis por leitura de artefato — não existe fonte autoritativa determinável no
  repositório para nenhuma delas.

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem edição.*

---

## Validação (finding-validator)

**VEREDITO: CONFIRMED (itens 1 e 2) com REBAIXAMENTO DE SEVERIDADE — HIGH → MEDIUM. Item 3 →
NEEDS_MORE_EVIDENCE.**

BUSCA POR CONTROLE COMPENSATÓRIO (Zod, controller, use case, model, migration, rotas de
correção, cliente):
- **Coluna de destino** para `termination_reason` — CONFIRMADO AUSENTE (`HrTerminationProcess.ts:16-47`).
  As únicas colunas `termination_reason` do repo estão em **`jur_contracts`** (outro módulo).
- **Rota de correção posterior** — AUSENTE (`rh.ts:90-99`); `notice_modality` não é corrigível
  após a criação. **Reforça o item 2.**
- **AGRAVANTE NOVO:** `EmployeeContractsTab.tsx:290,309` — **a tela oficial coleta o motivo
  digitado pelo RH e o descarta**, respondendo sucesso. Campo de formulário em produção.

ITEM 2 — ausência de fonte documental CONFIRMADA, **impacto REBAIXADO**: verificados todos os
consumidores de `notice_modality` — **nenhum cálculo o consome**. `payment_deadline` é coluna
gerada de `termination_date + 10`; o TRCT é anexado por upload; não há transmissão de eSocial no
RH. O efeito sobre verbas é **externo ao sistema**, não conta errada produzida pelo ERP.

ITEM 3 — **REFUTADO EM PARTE:** (1) `BLOCO_6_RH_API.md:594` documenta **409** para a mesma regra
— não é "código diverge do contrato", é o documento contradizendo a si mesmo (`:542` diz 422,
`:594` diz 409), com código e suíte alinhados a `:594`; (2) a afirmação "não existe teste de
`CreateTerminationProcessUseCase`" é FALSA (`rh-admission-termination-use-cases.test.ts:184-237`,
4 testes, `:219-227` exercita o 409). Ambas já corrigidas no corpo.

JUSTIFICATIVA DO REBAIXAMENTO: o item que carregava o HIGH (item 2) não se materializa dentro do
sistema; o item 3 teve duas alegações de evidência refutadas. MEDIUM é o que a evidência
sustenta. Exposição atual nula (`employees`=0).

ENCAMINHAMENTO (Regra 22): **NÃO segue à SanaCore** antes das correções. Item 3 volta ao autor
como NEEDS_MORE_EVIDENCE. Não é DUPLICATE.

*Validação produzida pelo `vericore-finding-validator`; seção anexada pelo orquestrador.*
