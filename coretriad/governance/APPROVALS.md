# CORETRIAD — REGISTRO DE APROVAÇÕES HUMANAS

Registro exigido pela Regra 18 do CLAUDE.md: human gates não podem ser
aprovados por memória ou inferência — somente por decisão humana explícita
registrada. Cada entrada abaixo corresponde a uma resposta explícita do
responsável humano na sessão indicada.

| ID | Data | Aprovador | Decisão | Escopo |
|---|---|---|---|---|
| APR-2026-001 | 2026-08-13 | Gilwagno (IMPLANTACAO@evokaudio.com) | **AGENT_ALLOCATION_MATRIX.md aprovada como está** | Libera `/coretriad-materialize`: 22 OpusCore + 69 VeriCore conforme `docs/coretriad/planning/AGENT_ALLOCATION_MATRIX.md`; SanaCore nasce com núcleo MVP (`remediation-triage`, `remediation-engineer`, `remediation-evidence`) conforme Master Spec Parte V §27. |
| APR-2026-002 | 2026-08-13 | Gilwagno (IMPLANTACAO@evokaudio.com) | **Estratégia de implementação limpa: materializar do zero** | Agentes criados fresh em `.claude/agents/` com prefixos obrigatórios (`coretriad-`/`opuscore-`/`vericore-`/`sanacore-`), versionados no git. Roster antigo de 16 agentes é deprecado de forma rastreável — não copiado do outro PC. |
| APR-2026-003 | 2026-08-13 | Gilwagno (IMPLANTACAO@evokaudio.com) | **Emenda constitucional: substituição da "Constituição CoreTriad" pela "Especificação Mestre v1.0"** | `docs/coretriad/CORETRIAD_MASTER_SPEC.md` (9 partes) passa a ser o documento canônico; `CLAUDE.md` de 23 regras passa a ser o operating rules vigente. A Constituição antiga (14 seções) permanece recuperável no histórico git (commit `c9359be`). Referências dos planning docs a "§8.4"/"seção 14" apontam para a versão histórica. |
| APR-2026-004 | 2026-08-13 | Gilwagno (IMPLANTACAO@evokaudio.com) | **Versionamento do runtime CoreTriad** | `.gitignore` passa a versionar `.claude/agents/`, `.claude/hooks/`, `.claude/skills/` e `.claude/settings.json` (estado local `settings.local.json` permanece ignorado). Resolve o finding F1 de `docs/coretriad/planning/BOOTSTRAP_REVALIDATION_2026-08-13.md`. |
| APR-2026-005 | 2026-08-13 | Gilwagno | **OBS-SIM-001-A — `RISK_ACCEPTED` restrito ao SIM-001 + diretriz permanente para projetos reais** | Ver detalhamento abaixo. |
| APR-2026-006 | 2026-08-13 | Gilwagno | **FIND-SIM-001-004/005/006 — mantidos `PROPOSED`, não bloqueantes** | Ver detalhamento abaixo. |
| APR-2026-007 | 2026-08-13 | Gilwagno | **FIND-SIM-002-004 — semântica de `cancelPayment` definida** | Ver detalhamento abaixo. |
| APR-2026-008 | 2026-08-13 | Gilwagno | **FIND-SIM-002-008-A + OBS-002 — matriz de papéis de pagamento definida** | Ver detalhamento abaixo. |
| APR-2026-009 | 2026-08-13 | Gilwagno | **FIND-SIM-002-009 — estado `failed` criado para recusa do gateway** | Ver detalhamento abaixo. |
| APR-2026-010 | 2026-08-13 | Gilwagno | **FIND-SIM-002-010/012/013 — mantidos `PROPOSED`, não bloqueantes** | Ver detalhamento abaixo. |
| APR-2026-011 | 2026-08-13 | Gilwagno | **FIND-SIM-002-014 — APR-008 estendida à aprovação de fornecedor** | Ver detalhamento abaixo. |
| APR-2026-012 | 2026-08-13 | Gilwagno | **OBS-007 — cancelamento de pagamento restrito a `manager`** | Ver detalhamento abaixo. |
| APR-2026-013 | 2026-08-13 | Gilwagno | **OBS-008-c — limite de 3 retentativas para pagamento `failed`** | Ver detalhamento abaixo. |
| **APR-2026-014** | 2026-08-13 | Gilwagno | **`CORETRIAD OPERATIONALLY VALIDATED` — DECLARADO** | Ver detalhamento abaixo. |

---

## APR-2026-005 — OBS-SIM-001-A (`userRole` autodeclarado)

**Contexto:** `userRole` autodeclarado pelo chamador, sem fonte de identidade
confiável, achado durante o reteste do SIM-001
(`audit/runs/SIM-001-AUD-001/31-new-findings/NEW_OBSERVATIONS.md`). O
`vericore-software-audit-director` recusou-se a fixar severidade e escalou a
decisão por depender da fronteira de confiança do produto — Regras 6 e 18.

**Decisão:** `RISK_ACCEPTED` **restrito ao escopo do simulado SIM-001**
(ambiente fictício de validação do CoreTriad, sem dados reais e sem exposição).

**Justificativa:** SIM-001 não é produto real; não há superfície de ataque, dado
sensível ou usuário final. O risco aceito não sai do ambiente do simulado.

**Ação permanente (vale para TODO projeto real, incluindo `ERP-LEGACY-001`):**
"papel/role declarado pelo cliente sem verificação server-side" é finding
**CRITICAL bloqueante para release** — nunca `RISK_ACCEPTED` em produção.
Registrada como norma em dois pontos, para que nenhum auditor futuro dependa
deste arquivo para lembrar do padrão:
- `CLAUDE.md` — **Regra 24** (documento sempre carregado em contexto).
- `docs/coretriad/CORETRIAD_MASTER_SPEC.md` — Parte IV §20, trilha de
  Segurança/Autorização (padrão de finding obrigatório).

**Escopo do risco aceito:** SIM-001 apenas. Esta aprovação **não** se estende a
nenhum outro projeto, presente ou futuro.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-007 — FIND-SIM-002-004 (`cancelPayment`)

**Contexto:** o `finding-validator` e o `software-audit-director` bloquearam o
FIND-SIM-002-004 em human gate porque nenhum artefato versionado definia o
comportamento correto de cancelar um pagamento — a SanaCore não podia corrigir
sem inventar regra de negócio (Regra 6).

**Decisão (regra de negócio nova, para o SIM-002):** `cancelPayment` é operação
válida **apenas** para pagamentos em estado `created` — isto é, antes do envio
ao gateway. **Não existe cancelamento após `sent`.** Reverter um pagamento já
enviado seria **estorno**, operação distinta, fora do escopo deste simulado.

**Ação de remediação:** remover a transição `sent → created` de `cancelPayment`;
tentativa de cancelar pagamento já enviado deve ser recusada.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-008 — FIND-SIM-002-008-A e OBS-002 (papéis de pagamento)

**Contexto:** `docs/API.md` exigia `manager` para criar pagamento enquanto o
código aceitava `analyst`+`manager`, e nenhuma BR arbitrava. As leituras
(`getSupplier`, `listPaymentsBySupplier`) declaravam papel exigido e não o
verificavam. O diretor pediu decisão em ato único para os dois itens.

**Decisão (regra de negócio nova, para o SIM-002):**
- **Escrita** (criar e enviar pagamento): restrita ao papel **`manager`**.
- **Leitura** (consultar pagamentos e fornecedores): permitida a **`analyst` e
  `manager`**.
- Em ambos os casos, **o papel deve ser verificado no servidor contra uma fonte
  confiável de identidade — nunca autodeclarado pelo cliente**, incluindo nas
  leituras que hoje não verificam papel algum.

**Vínculo normativo:** é a aplicação direta da **Regra 24 do `CLAUDE.md`**
(origem APR-2026-005/OBS-SIM-001-A). O SIM-002 é ambiente de validação, mas a
decisão manda implementar o padrão correto, não aceitar o risco.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-014 — CORETRIAD OPERATIONALLY VALIDATED

**Declaração:** o modelo organizacional CoreTriad é declarado
**`CORETRIAD OPERATIONALLY VALIDATED`** em 2026-08-13, conforme a Parte VII §10
do `docs/coretriad/CORETRIAD_MASTER_SPEC.md`.

**Autoridade:** decisão humana (Regra 18). Nenhum agente declarou nem poderia
declarar isto.

### Evidência — SIM-001 "Sala Livre"

`docs/coretriad/planning/SIM-001_VALIDATION_REPORT.md` — **14/14 itens PASS**.
Ciclo completo IDEA → BUILD → AUDIT → FINDINGS → REMEDIATION → **RETEST_FAILED**
→ REMEDIATION v2 → RETEST_PASSED → CLOSED. 3/3 defeitos plantados detectados. A
prova central: a remediação v1 tinha **suíte 100% verde** e mesmo assim foi
reprovada, porque o reteste independente executou o `RETEST_SPECIFICATION` do
finding em vez de confiar nos testes de quem corrigiu. Autoridade provada por
enforcement: a SanaCore foi **tecnicamente impedida** de gravar o fechamento de
um finding em `audit/`.

### Evidência — SIM-002 "PagaFácil"

`docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md` — **8/8 classes de defeito
detectadas** sobre produto realista com banco real, sem acesso ao gabarito e sem
saber quantas eram. Zero falsos negativos, zero falsos positivos, mais 6 achados
legítimos não plantados. O gabarito
(`coretriad/locks/SIM-002-answer-key.md`) foi selado por **enforcement**, não por
honra, e o selo resistiu a Read, Grep, Glob, Bash e `ls` — provado em
TEST-SEAL-001/002. **11 findings fechados**, incluindo as 8 classes plantadas.

### Os quatro critérios da skill `/coretriad-sim002`

| Critério | Resultado |
|---|---|
| 8/8 classes detectadas | ATENDIDO |
| Findings validados | ATENDIDO — validator adversarial, 0 falsos positivos, severidades contestadas e re-elevadas antes do fechamento |
| Remediações retestadas | ATENDIDO — 6 retestes independentes, com o código original extraído do `AUDIT_COMMIT` e rodado no mesmo harness |
| Fechadas pela VeriCore | ATENDIDO — as 8 classes plantadas CLOSED |

### O que esta declaração NÃO significa

1. **Não é `AUDIT_PASSED` do SIM-002.** O `vericore-software-audit-director`
   manteve `AUDIT_PASSED = NÃO` para o run `SIM-002-AUD-001`, com **delta audit
   como obstáculo único substantivo**: as correções vivem em commits posteriores
   ao `AUDIT_COMMIT`, e aprovar `f2fcf1c` seria aprovar o estado com os 13
   findings, enquanto aprovar `ac3e277` seria aprovar commit nunca auditado
   (Regras 12–14). A recomendação registrada é congelar `ac3e277` e abrir
   `SIM-002-AUD-002` como delta.
   **Um produto simulado reprovado por um sistema que o auditou corretamente é
   evidência a favor da máquina, não contra ela.**
2. **Não arquiva SIM-001 nem SIM-002.** APR-2026-006 e APR-2026-010 exigem o
   `finding-validator` nos findings `PROPOSED` antes do arquivamento definitivo,
   ou descarte junto com o ambiente dos simulados.
3. **Não dispensa os human gates abertos:** OBS-SIM-002-009 (quais papéis podem
   aprovar fornecedor) e OBS-SIM-002-006(b) (tornar o texto do limite de
   retentativa inequívoco em números).
4. **Não revoga nenhuma norma permanente** — em especial a **Regra 24** do
   `CLAUDE.md`, que vale integralmente para o `ERP-LEGACY-001`.

### Efeito

Libera a abertura do programa **`ERP-LEGACY-001`** (Parte VIII do master spec).
O comando de abertura está preparado e **não executado** em
`docs/coretriad/planning/ERP-LEGACY-001_OPENING_COMMAND.md`, aguardando gate
humano próprio — a validação operacional do CoreTriad não é autorização para
abrir o programa.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-011 — FIND-SIM-002-014 (alçada de `approveSupplier`)

**Contexto:** a própria SanaCore declarou, ao final da WAVE-D, que
`approvalService.approveSupplier` continuava decidindo alçada por
`approver.role` **autodeclarado no payload** — a APR-2026-008 cobrira
criar/enviar/ler pagamento, mas não a aprovação. O `software-audit-director`
formalizou como FIND-SIM-002-014 (HIGH) e registrou que o defeito condiciona a
eficácia prática dos fechamentos de FIND-001 (alçada) e FIND-008 (papéis).

**Decisão:** **estender a APR-2026-008 à operação de aprovação.** O papel que
autoriza `approveSupplier` deve ser verificado no servidor contra a **mesma
fonte de identidade** (tabela `users` / `identity.js`), nunca autodeclarado no
payload. A mesma alçada já decidida (`manager`) aplica-se à aprovação.

**Efeito normativo:** encerra a fragmentação apontada pelo diretor — o produto
passa a ter uma única fonte de papel para todas as operações.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-012 — OBS-007 (papel para cancelar pagamento)

**Contexto:** a APR-2026-007 definiu *quando* um pagamento pode ser cancelado
(apenas em `created`), mas não *quem* pode cancelá-lo; a operação permanecia
aberta a `analyst` e `manager` sem arbitragem.

**Decisão:** **apenas o papel `manager`** pode cancelar pagamento em estado
`created`, verificado no servidor contra a fonte confiável de identidade.
**Não estender a `analyst`.**

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-013 — OBS-008-c (retentativa de pagamento `failed`)

**Contexto:** a APR-2026-009 criou o estado `failed` para recusa do gateway, mas
não definiu política de retentativa — a SanaCore registrou a ausência como risco
residual.

**Decisão:** **limite de 3 tentativas** de reenvio ao gateway para um pagamento
em `failed`. Esgotado o limite, o pagamento permanece **`failed` definitivo** e
exige **ação manual** — sem retentativa automática ilimitada.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-010 — FIND-SIM-002-010/012/013 (pendências não bloqueantes)

**Contexto:** três findings do SIM-002 permaneceram `PROPOSED` sem relação com
os human gates das aprovações 007/008/009: FIND-010 (*lost update* em
`approveSupplier` por check-then-act sem CAS), FIND-012 (schema sem `CHECK` de
domínio, sem `updated_at`, `payments.company_id` sem FK composta) e FIND-013
(lacunas de fronteira e testes negativos, mensagens de erro divergentes, status
`rejected` órfão, índices ausentes).

**Decisão:** mesmo tratamento dado aos FIND-SIM-001-004/005/006 no APR-2026-006
— **não bloqueiam o fechamento do ciclo**, mas permanecem **explicitamente
rastreados como pendentes, não descartados**.

**Ação pendente:** rodar o `vericore-finding-validator` neles antes do
arquivamento definitivo do SIM-002, ou descartá-los junto com o ambiente do
simulado caso se conclua que não têm valor de aprendizado. Enquanto isso não
ocorrer, SIM-002 pode ser fechado como ciclo, porém **não arquivado**.

**Nota de rastreabilidade:** esta entrada formaliza em `APPROVALS.md` a decisão
que já constava em `coretriad/states/SIM-002/PROJECT_STATE.md`. A ausência foi
apontada pelo `vericore-software-audit-director` no veredito final, que se
recusou a tratar como decisão humana algo que não conseguia ler neste arquivo
(Regras 8 e 18) — comportamento correto, e o registro é a correção.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-009 — FIND-SIM-002-009 (recusa do gateway)

**Contexto:** `sendPayment` marcava `status='sent'` mesmo quando o gateway
recusava, e o dicionário de dados não previa nenhum estado para essa situação —
lacuna normativa que impedia a remediação.

**Decisão (regra de negócio nova, para o SIM-002):** adicionar o estado
**`failed`** ao domínio de `payments.status` (hoje `created`/`sent`/`cancelled`).
Recusa do gateway é **causa diferente** de cancelamento e deve ser rastreável
separadamente.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-006 — FIND-SIM-001-004/005/006

**Status dos findings:** mantidos `PROPOSED` — fora do escopo de fechamento do
SIM-001 (`listBookings` sem política de acesso documentada; comportamentos sem
requisito; lacunas de boundary).

**Decisão:** não bloqueiam o `SIM-001_VALIDATION_REPORT.md` nem o início do
SIM-002.

**Ação pendente (não vence prazo, mas não pode ser esquecida):** rodar o
`vericore-finding-validator` nesses 3 findings antes de considerar o SIM-001
**arquivado definitivamente**; alternativamente, descartá-los junto com o
ambiente do SIM-001 caso se conclua que não têm valor de aprendizado para o
processo. Enquanto essa ação não ocorrer, SIM-001 está **fechado como ciclo de
validação**, porém **não arquivado**.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-015 — Abertura do ERP-LEGACY-001 (passos 21-24)

**Decisão:** aprovada a abertura do programa `ERP-LEGACY-001`
(`LEGACY_RECOVERY_AND_MODERNIZATION`, Parte VIII do master spec), limitada
**apenas aos passos 21-24**. Os passos 25-40 exigem novo gate humano
específico, não coberto por esta aprovação.

**Autoridade:** decisão humana (Regra 18). Esta aprovação é o gate humano
próprio referenciado em APR-2026-014 §Efeito — a validação operacional do
CoreTriad, por si só, não autorizava a abertura.

**Skill criada nesta aprovação:** `.claude/skills/coretriad-onboard/SKILL.md`,
formalizando os passos 21-24 com PARE incondicional ao final do passo 24.

**Condições adicionais impostas pelo dono, permanentes para todo o programa
`ERP-LEGACY-001` (não apenas para esta abertura):**

1. O `PROJECT_STATE.md` do onboarding (passo 21) deve registrar
   explicitamente que o ERP-LEGACY-001 está **parcialmente em produção**:
   parte dos módulos processa dado real da empresa hoje, parte está em
   desenvolvimento/homologação.
2. **Antes do passo 23**, a VeriCore deve identificar e listar
   **separadamente** quais módulos/diretórios estão em produção real e quais
   não estão (`PRODUCTION_STATUS_MAP.md`) — formalizado como pré-passo 23 na
   skill.
3. **Regra permanente de segurança de dado real**: módulos classificados
   como produção recebem tratamento read-only, porém **sem nenhuma execução
   de teste, script de diagnóstico ou comando que toque o banco de dados** —
   apenas leitura de código-fonte, schema declarado e configuração. Inspecionar
   dado real (uma linha, uma query) exige aprovação humana explícita, caso a
   caso — nunca por extensão de aprovação anterior.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-016 — Resolução da divergência de status de produção do ERP-LEGACY-001

**Contexto:** o pré-passo 23 do onboarding produziu
`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`, que identificou
divergência direta (Regra 20 do `CLAUDE.md`) entre a declaração do
`PROJECT_STATE.md` ("PARCIALMENTE em produção real") e a SSOT do produto +
checklist de Go-Live do próprio ERP (Decision Point 1 = "NO-GO", servidor de
produção não adquirido, `docker-compose.prod.yml` "não exercitado ainda"). O
agente VeriCore não decidiu sozinho — classificou o sistema como `UNKNOWN` e
escalou.

**Decisão:** **há dado real de negócio em produção, mesmo sem Go-Live
formal.** Os 327 insumos reais da fábrica (carregados em 2026-08-10 no banco
`erp_evok_audio`) — e qualquer outro dado real que venha a ser identificado
nos módulos hoje classificados `UNKNOWN` — contam como produção real para
fins deste programa, **independentemente do rótulo formal de Go-Live**. O
regime read-only reforçado (sem execução de teste, script de diagnóstico ou
comando que toque banco; inspeção de dado real só com aprovação caso a caso)
se aplica a esses módulos **de forma permanente**, não condicionada a uma
futura declaração formal de Go-Live.

**Módulos/diretórios afetados por esta decisão** (de `UNKNOWN` para tratamento
como produção real, para fins de regime read-only): `items`, `categories`,
`departments`, `users` (parcialmente — a conta admin, não as 20 contas de
teste `@teste.evokaudio`), `auth`, `auditLogs`, e o banco por trás de
`docker-compose.yml` (o ambiente de desenvolvimento que hoje hospeda o dado
real de catálogo, já que não existe banco de produção separado).

**Autoridade:** decisão humana (Regra 18/20 do `CLAUDE.md`). Resolve a
divergência escalada pelo VeriCore no pré-passo 23; `PROJECT_STATE.md` e
`PRODUCTION_STATUS_MAP.md` devem ser atualizados para refletir esta decisão
como fonte autoritativa corrente.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-017 — Promoção de 2 achados a finding formal + autorização dos passos 25-30 (ERP-LEGACY-001)

**Contexto:** ao fim do passo 24 (`coretriad-onboard` encerrada com PARE
incondicional), o Control Plane apresentou três caminhos possíveis. O dono
escolheu uma combinação: promover dois achados **e** prosseguir.

### Decisão A — promoção de 2 achados de discovery a finding formal preliminar

Autorizada a formalização, **fora da sequência normal do passo 31**, de dois
achados de discovery, por serem risco financeiro/de integridade de dados e
não apenas dívida arquitetural:

| Finding | Severidade | Confiança | Status | Arquivo |
|---|---|---|---|---|
| `FIND-ERP-001` | CRITICAL | CONFIRMED | OPEN | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md` |
| `FIND-ERP-002` | HIGH | CONFIRMED | OPEN | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md` |

Ambos passaram pelo `vericore-finding-validator` adversarial e voltaram
**CONFIRMED**, sem controle compensatório encontrado.

**Nota sobre a severidade sugerida de FIND-ERP-001:** o dono sugeriu
CRITICAL para os 8 endpoints de escrita crítica. O `vericore-idempotency-auditor`
**não aceitou a sugestão sem verificar** (comportamento correto, Regra 19 —
evidência tem precedência): releu as 8 rotas e comprovou que 6 já têm
proteção real (lock pessimista + guarda de estado terminal), incluindo
emissão de NF-e e conversão de MRP. O CRITICAL foi mantido, mas restrito ao
subconjunto genuinamente vulnerável: `POST /api/inventory/movements` (sem
nenhuma proteção) e pagamento parcial repetido em `PayPayableUseCase`/
`ReceivePaymentUseCase` (guarda só rejeita `paid`, não cobre `partial`). O
validador atestou independentemente que essa diferenciação é honesta.

**Esta promoção é exceção autorizada caso a caso, não regra nova.** Nenhum
outro achado de discovery pode ser promovido a finding por analogia — os
demais (violações de Clean Architecture, CNAB órfão, ownership quebrado do
`auditLogs`, regra de qualidade aplicada dentro do agregado de estoque)
seguem o fluxo normal até o passo 31.

**Nenhuma remediação foi aplicada nem encaminhada.** O envio de
FIND-ERP-001/002 à SanaCore depende de decisão humana futura, ainda não
tomada.

### Decisão B — autorização dos passos 25-30

Autorizados os passos 25-30 da Parte VIII do master spec (domínios, regras
de negócio descobertas, requisitos recuperados, casos de uso recuperados,
matriz de rastreabilidade do legado, testes de caracterização), regidos pela
skill `.claude/skills/coretriad-legacy-discovery/SKILL.md`, criada nesta
mesma sessão com **PARE incondicional ao final do passo 30**. O passo 31
(auditoria 360°) permanece BLOQUEADO e exige novo gate humano.

Todas as regras permanentes herdadas do onboarding continuam valendo, em
especial a **regra de segurança de dado real** (`APR-2026-016`): módulos de
produção real seguem em regime read-only reforçado; o passo 30 (testes de
caracterização) é a única execução autorizada, e apenas contra banco de
teste efêmero — **nunca** contra o banco de desenvolvimento real que hospeda
os 327 itens.

### Decisão C — SIM-002 em espera

O delta audit do SIM-002 e as pendências `OBS-SIM-002-009`/`OBS-SIM-002-010`
ficam **em espera**, explicitamente **não bloqueiam** o ERP-LEGACY-001.

**Aprovado por:** Gilwagno — 13/08/2026.

*Nota de registro: esta entrada foi criada retroativamente na mesma sessão,
após o `coretriad-director` sinalizar corretamente que a autorização existia
apenas no Control Plane e não no artefato oficial de aprovações (Regra 17).
A decisão humana é a mesma; apenas o registro formal estava faltando.*

---

## APR-2026-018 — Promoção de 5 achados do passo 26 a findings formais preliminares

**Decisão:** autorizada a formalização, **fora da sequência normal do passo
31**, de cinco achados do passo 26 (regras de negócio descobertas), por serem
risco de autorização, compliance regulatório ou registro legal:

| Finding | Tema | Severidade | Ambiente |
|---|---|---|---|
| `FIND-ERP-005` | Alçada de contrato jurídico — 4 falhas encadeadas | CRITICAL | DEV/HOMOLOGAÇÃO |
| `FIND-ERP-006` | LGPD — sem cadastro de DPO; retenção sem enforcement | HIGH | DEV/HOMOLOGAÇÃO |
| `FIND-ERP-007` | RH — motivo de rescisão descartado; aviso prévio fixo | HIGH | DEV/HOMOLOGAÇÃO |
| `FIND-ERP-008` | SST — tipo do CAT × gravidade sem checagem cruzada | HIGH | DEV/HOMOLOGAÇÃO |
| `FIND-ERP-009` | Segregação de função só existe em Compras (sistêmico) | HIGH | DEV/HOMOLOGAÇÃO |

**Ambiente — condição uniforme desta aprovação:** todos os cinco estão em
módulos classificados **NÃO-PRODUÇÃO** em
`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`. A severidade
atribuída se justifica pelo **padrão que será promovido a produção** (e, nos
casos de LGPD e SST, pelo risco regulatório/previdenciário na promoção), não
por exposição atual de dado real. Isso deve constar em cada finding.

**Nenhuma remediação autorizada.** A SanaCore **não** foi acionada para
nenhum dos cinco. `FIND-ERP-001`, `FIND-ERP-002` e estes cinco permanecem
`OPEN`, aguardando decisão humana separada sobre o envio à remediação.

### Lacuna de numeração — `FIND-ERP-003` e `FIND-ERP-004` nunca existiram

Registrado deliberadamente, a pedido do dono, para que nenhuma auditoria
futura conclua que dois findings foram suprimidos: a numeração salta de
`FIND-ERP-002` para `FIND-ERP-005` porque os IDs `003` e `004` **nunca foram
atribuídos a nenhum achado**. Não houve finding descartado, rebaixado,
mesclado nem retirado. A lacuna é um salto de numeração na mensagem de
autorização do dono, não uma supressão.

**Precedente estabelecido:** ID de finding não é reciclado nem renumerado
para "fechar buraco". Se um finding for descartado no futuro, o ID
permanece registrado com o motivo do descarte — nunca desaparece da
sequência.

### Enquadramento específico de `FIND-ERP-009`

Classificado pelo dono como **achado estrutural, não pontual**. O ponto não é
que a segregação esteja errada onde existe (está correta e é o melhor
controle do sistema — decisão D-K, 2026-08-10, sem exceção nem para `admin`).
O achado é a **assimetria não decidida**: existe decisão registrada mandando
aplicar em Compras; **não existe nenhuma decisão registrada dizendo que os
demais pontos de aprovação — contrato jurídico, concessão de acesso, contagem
de inventário, lançamento contábil, estrutura de produto — não devem ter**.
É lacuna de política, não bug isolado.

**Escopo desta aprovação:** promoção a finding formal e validação
adversarial. **Não** autoriza remediação, **não** autoriza o passo 31
(auditoria 360°), e **não** estende a exceção "promover fora de sequência" a
nenhum outro achado por analogia — os demais candidatos levantados no passo
26 (scan mobile furando quarentena, ICMS/IPI divergentes, desconto perdido no
faturamento, `effectiveness_result` inescrevível, entre outros) seguem o
fluxo normal até o passo 31.

**Aprovado por:** Gilwagno — 13/08/2026.

---

## APR-2026-019 — Adoção do esquema de BR-ID canônico (sem atribuição de OWNER em lote)

**Contexto:** pendência (b) registrada ao fim do passo 30 do `ERP-LEGACY-001`
— a ausência de BR-ID canônico é a causa-raiz nº 1 da quebra da matriz de
rastreabilidade do passo 29 (0 cadeias completas em ~167 regras).

**Decisão (duas partes, nesta ordem):**

1. **Adotar AGORA o esquema de BR-ID canônico como convenção técnica de
   nomenclatura.** Os IDs provisórios do passo 26 (`BR-<ÁREA>-NNN`, ex.:
   `BR-QE-011`, `BR-PP-013`, `BR-COM-010`) são **promovidos a canônicos sem
   renumeração** — preserva todas as referências cruzadas já gravadas nos
   artefatos dos passos 26-30, inclusive nos cabeçalhos dos testes de
   caracterização. Materialização em
   `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` (registro/índice;
   os arquivos `BUSINESS_RULE_CANDIDATES_*.md` permanecem a fonte descritiva
   — o catálogo não duplica o texto das regras).
2. **NENHUM OWNER é atribuído em lote.** A atribuição de responsável por
   domínio fica como **item pendente explicitamente registrado**, a ser
   resolvido aos poucos pelo dono com os responsáveis reais de cada área da
   empresa. **É vedado a qualquer agente decidir ou inferir OWNER** — a
   coluna OWNER nasce `PENDENTE — decisão humana` em 100% das linhas.

**O que esta aprovação NÃO faz:** não valida nenhuma regra. BR-ID canônico
fixa a *âncora* de rastreabilidade, não a *aprovação* da regra — todo status
do passo 26 (`CONFIRMED`/`DISCOVERED`/`CONFLICTING`/`UNKNOWN`/
`OBSOLETE_CANDIDATE`) permanece inalterado até validação humana caso a caso
(Regra 6 do `CLAUDE.md`; regra 3 do programa). Também não reabre o discovery
nem antecipa o passo 31 — o PARE do passo 30 segue em vigor.

**Precedente estendido (de `APR-2026-018`, findings → regras):** BR-ID não é
reciclado nem renumerado. Colisão de ID herdada do passo 26, se existir, é
registrada explicitamente no catálogo com desambiguação aditiva — nunca por
renumeração silenciosa. Se uma regra for descartada no futuro, o ID permanece
na sequência com o motivo.

**Aprovado por:** Gilwagno (dono do CoreTriad), em sessão — 14/08/2026.

---

## APR-2026-020 — Gate do passo 31 (auditoria 360°) + encaminhamento dos 7 findings à SanaCore

**Contexto:** fim do discovery (passos 21-30) do `ERP-LEGACY-001` com PARE
incondicional; pendências (a) e (c) do fechamento do passo 30.

### Decisão A — gate do passo 31 APROVADO

Autorizado o **passo 31 (auditoria 360°)** da Parte VIII do master spec,
executado pelo fluxo VeriCore padrão (`/audit-new`: escopo → inventário →
plano), **terminando no gate humano do plano de auditoria antes de qualquer
fieldwork**. Ordem de prioridade fixada pelo dono:

1. **PRODUÇÃO REAL primeiro** — `items`, `categories`, `departments`, `users`
   (conta admin), `auth`, `auditLogs` (classificação de `APR-2026-016`).
2. **Alto risco em seguida** — módulos com impacto financeiro, fiscal, de
   estoque e de autorização (inclui os módulos dos 7 findings abertos).
3. **O restante depois.**

### Decisão B — encaminhamento dos 7 findings à SanaCore AUTORIZADO

Sequência mandatória:

1. **2 CRITICAL primeiro:** `FIND-ERP-001` (idempotência — estoque +
   pagamento parcial) e `FIND-ERP-005` (alçada de contrato jurídico).
2. **Depois os 4 HIGH:** `FIND-ERP-002`, `FIND-ERP-006`, `FIND-ERP-008`,
   `FIND-ERP-009`.
3. **`FIND-ERP-007` (MEDIUM) NÃO segue** até o item 3 (409×422,
   `NEEDS_MORE_EVIDENCE`) voltar ao autor de origem.

Regras que esta autorização NÃO altera: SanaCore corrige em worktree
`sana/ERP-LEGACY-001/<FINDING>` e **nunca fecha o próprio finding**; só a
VeriCore declara `RETEST_PASSED`/`FINDING CLOSED` (Regras 3 e 4 do
`CLAUDE.md`); mudanças posteriores ao `AUDIT_COMMIT` do passo 31 exigem
delta audit (Regra 14).

### Reafirmação — OWNER por área

Permanece como registrado em `APR-2026-019` parte 2: atribuição incremental
pelo dono na tabela §6 do `BR_CATALOG.md`; **vedado a agente decidir ou
inferir OWNER**.

**Aprovado por:** Gilwagno (dono do CoreTriad), em sessão — 14/08/2026.

---

## APR-2026-021 — Gates G3/G8/G10 da AUD-001 + 5 decisões de negócio de remediação

**Contexto:** resposta do dono ao gate humano do `AUDIT_PLAN.md` §12 (run
`ERP-LEGACY-001-AUD-001`) e às perguntas formuladas pelas triagens SanaCore dos
casos `CASE-001` e `CASE-002`. Registro detalhado dos gates:
`coretriad/governance/HUMAN_GATE_RECORD-ERP-LEGACY-001-AUD-001.md`.

### Parte A — Gates da auditoria

| Gate | Veredito | Síntese |
|---|---|---|
| **G3** — amostragem | `APPROVED_WITH_CONDITIONS` | Amostragem autorizada **desde que baseada em risco e com risco residual registrado no relatório final**. **Vedada amostragem reduzida** em: autenticação, autorização, segregação de funções, operações financeiras, movimentação de estoque, integridade de dados, contratos/jurídico, permissões administrativas, operações destrutivas, segurança, multi-tenancy e regras de negócio críticas — nesses casos, **cobertura ampliada ou 100% quando tecnicamente aplicável**. |
| **G8** — dimensionamento | `APPROVED` — `AUDIT_SESSIONS = 110` | Manter as 110 sessões; **não reduzir escopo agora**. Objetivo declarado: maximizar cobertura desta primeira auditoria integral e criar baseline confiável. Redução futura = nova decisão humana registrada como exclusão explícita. |
| **G10** — `CAND-AUTHZ-01` (Compras/COMEX) | `CONDITIONAL_APPROVAL` | O candidato entra no fieldwork como **candidato/provisório**, para investigação e coleta de evidência. **NÃO** significa confirmação da regra, promoção a requisito confirmado, aprovação de comportamento, alteração de owner nem aceitação de divergência. Mudança de status só após evidência suficiente e validação correspondente. |

**Gates NÃO respondidos nesta aprovação — permanecem ABERTOS:** `G4` (fila
`DYN-01…DYN-08` contra o banco efêmero), `G5` (homologação da dispensa das
trilhas de IA e do `agent-permission-auditor`), `G6` (emenda formal ao
`AUDIT_SCOPE.md` §2.3 / RA-09), `G7` (confirmação de que as remediações SanaCore
não entram nesta run e exigirão delta audit). O dono condicionou a liberação do
fieldwork a que "os demais G1-G10 cumpram os critérios objetivos previstos no
`AUDIT_PLAN.md`" — **G4-G7 não são critérios objetivos verificáveis, são
decisões discricionárias humanas**, e o `coretriad-director` **não as supre por
inferência** (Regra 18). Ver o `HUMAN_GATE_RECORD` para o efeito prático de cada
uma sobre o fieldwork.

**G1, G2 e G9 considerados SATISFEITOS**, com fundamento textual explícito e não
por inferência: G1/G2 pela frase "o fieldwork está autorizado a prosseguir
dentro do escopo aprovado" (aprova o plano e a matriz como base do fieldwork,
já modificada pelas condições de G3); G9 pela seção 6 da mensagem do dono, que
reafirma literalmente a vedação a atribuição automática de OWNER.

**Consequência material de G3 registrada:** as condições de G3 **alteram a
coverage matrix aprovada em G2** — várias células hoje declaradas amostrais ou
rasas recaem nas categorias de cobertura obrigatória (authZ, segregação,
financeiro, estoque, integridade, contratos, permissões administrativas,
segurança, regras críticas). A matriz **deve ser revista para conformidade com
G3 antes do fieldwork**, e a revisão pode exigir esforço acima das 110 sessões
de `G8` — o que seria **nova decisão humana**, não absorção silenciosa.

### Parte B — Decisões de negócio (remediação)

1. **Parcelas de mesmo valor no mesmo título são LEGÍTIMAS.** Portanto
   `valor da parcela + título` **não pode** ser usado isoladamente como
   identificador único ou mecanismo de idempotência. A identificação deve usar
   chave de negócio inequívoca (ID da parcela, sequência/número da parcela,
   identificador imutável equivalente, ou outra chave formalmente definida).
   **Registrar como regra de negócio** (candidata a BR-ID no `BR_CATALOG.md`,
   com OWNER `PENDENTE` como todas as demais).
2. **Consumidores externos das rotas de movimentação de estoque:
   `EXTERNAL_CONSUMER_STATUS = UNKNOWN`.** Vedado inferir. Exigido inventário
   estático no repositório (n8n, bots, webhooks, integrações, scripts, clients
   HTTP, automações, documentação de API, chamadas externas). Enquanto não
   houver evidência suficiente: **sem breaking change**, sem tornar a chave
   obrigatória de forma incompatível, e estratégia **backward-compatible**
   obrigatória. **`UNKNOWN` não pode ser interpretado como `NÃO`.** Se o
   inventário não confirmar ausência de consumidores, a questão volta ao dono.
3. **Alçada = TABELA CONFIGURÁVEL** (libera a Falha 1 do `FIND-ERP-005`).
   Requisitos mínimos: configuração persistida; identificação da faixa/alçada;
   perfil/papel autorizado; vigência quando aplicável; histórico/auditoria das
   alterações; validação server-side; **nenhuma autorização baseada apenas no
   frontend**. O código pode conter apenas as estruturas técnicas de
   interpretação da política; os valores de negócio ficam configuráveis.
4. **Aditivo que eleva valor EXIGE `approve`** (libera a Falha 3). `operate`
   sozinho é insuficiente: elevação de valor é alteração material. Preparação
   do aditivo pode ser feita por `operate`; **a efetivação do aumento de valor
   exige `approve`**, respeitando alçada e segregação aplicáveis.
5. **A segregação D-K VALE para aprovação de contrato jurídico** (completa a
   Falha 4). O mesmo ator não pode ser o único responsável por preparar/executar
   e aprovar a própria operação. **Exceção futura exige decisão humana explícita
   e registro formal de exceção.**

### Parte C — Autorização de execução SanaCore

Autorizada a remediação dos findings **totalmente definidos** pelas decisões
acima, com o ciclo obrigatório: criar/confirmar `REMEDIATION_CASE` → worktree
SanaCore própria → reprodução estática quando possível → `ROOT_CAUSE` →
`BLAST_RADIUS` → `CORRECTION_STRATEGY` → implementação → testes disponíveis →
testes de regressão criados → documentação afetada atualizada →
`REMEDIATION_EVIDENCE_PACKAGE` → devolução à VeriCore.

**SanaCore NÃO está autorizada a:** fechar finding; marcar `RETEST_PASSED`;
alterar evidência original da VeriCore; usar banco real; contornar
`APR-2026-016`; **transformar ausência de Docker/psql em evidência de sucesso**.

**Vedada implementação parcial apresentada como finding resolvido:**
`REMEDIATION_COMPLETE` só pode ser declarado quando **todos** os elementos do
respectivo `REMEDIATION_CASE` estiverem implementados e documentados.

### Parte D — Reprodução dinâmica e banco

`L-T1` permanece **lacuna declarada**. A indisponibilidade de `psql`/Docker
**não aprova, não reprova, não comprova correção e não autoriza conexão com
banco real**. Nenhuma conexão com banco real está autorizada; `APR-2026-016`
permanece inalterado. A validação dinâmica correspondente será executada ou
exigida pela VeriCore quando existir ambiente seguro e autorizado.

### Parte E — OWNER de business rules

As **164 linhas** do `BR_CATALOG.md` permanecem `PENDENTE`. **Vedado** atribuir
owner automaticamente ou inferir por módulo, autor de código, departamento ou
memória. Definição posterior, por decisão humana. Reafirma `APR-2026-019`
parte 2 e satisfaz o gate G9.

**Aprovado por:** Gilwagno (dono do CoreTriad), em sessão — 14/08/2026.

---

## APR-2026-022 — Reafirmação das 5 decisões de negócio + MUDANÇA na decisão 2 (chave obrigatória)

**Referência:** reafirma e, em um ponto, **altera** a `APR-2026-021` Parte B.
Registrada como entrada nova, nunca por edição da anterior.

### Nota de correspondência (correção de registro, não de mérito)

A mensagem do dono intitula as cinco como "perguntas de negócio do
`FIND-ERP-005`". Para a rastreabilidade ficar correta: **as perguntas 1 e 2
pertencem ao `CASE-001` / `FIND-ERP-001`** (idempotência — parcelas e
movimentação de estoque); **as perguntas 3, 4 e 5 pertencem ao `CASE-002` /
`FIND-ERP-005`** (alçada de contrato jurídico). O mérito das decisões não muda;
apenas o vínculo de cada uma ao seu caso.

### Decisões 1, 3, 4 e 5 — REAFIRMADAS, sem alteração de conteúdo

Idênticas ao já registrado na `APR-2026-021` Parte B, itens 1, 3, 4 e 5:

1. **Parcelas de mesmo valor no mesmo título são caso legítimo** — conforme o
   desenho recomendado, não bloqueante. Registrada como `BR-FIN-003` no
   `BR_CATALOG.md`.
3. **Alçada de contrato vem de TABELA CONFIGURÁVEL**, não de constante no
   código — alinhada ao que o contrato de API já promete.
4. **Aditivo que eleva valor exige `approve`**; `operate` nunca basta.
5. **A segregação D-K vale para aprovação de contrato jurídico: SIM.**

### Decisão 2 — ALTERADA em relação à `APR-2026-021`

| | `APR-2026-021` (anterior) | `APR-2026-022` (vigente) |
|---|---|---|
| Status do consumidor externo | `UNKNOWN` — vedado inferir | **CONFIRMADO — existe consumidor externo (automação)** |
| Chave de idempotência | Opcional; **vedado** breaking change | **OBRIGATÓRIA** |
| Estratégia | Backward-compatible obrigatória | Definida por esta decisão |

**Fundamento da mudança:** conhecimento do dono sobre a operação real da
empresa, que o inventário estático não podia alcançar. O
`EXTERNAL_CONSUMER_INVENTORY.md` havia concluído — corretamente — que prova de
ausência é inalcançável por varredura de repositório, e devolvido a questão ao
dono. **A questão foi respondida com informação de fora do repositório: o
consumidor externo existe.** O inventário permanece válido como evidência do
que o código mostra; esta decisão o complementa, não o contradiz.

**`EXTERNAL_CONSUMER_STATUS = CONFIRMED` (automação).**

### Risco material registrado pelo Control Plane (Regra 20 — divergência não silenciada)

A `APR-2026-021` vedava breaking change **porque** um consumidor externo
poderia existir. Confirmado que **existe**, tornar a chave obrigatória é
exatamente o breaking change que a vedação anterior pretendia evitar: **a
automação passa a receber erro em toda chamada que não enviar a chave, a partir
do deploy**. O efeito é interrupção de integração em produção, não degradação
suave.

Isto **não invalida a decisão** — obrigatoriedade é a única forma de a proteção
de idempotência ser efetiva contra um cliente que faz retry, e essa é
prerrogativa do dono. Mas a **sequência de implantação** deixa de ser detalhe
técnico e passa a ser parte da decisão. Registrado para que a SanaCore não
implante obrigatoriedade sem que a automação tenha sido migrada antes, e para
que nenhuma auditoria futura leia esta aprovação como autorização de indisponibilidade.

**Condição de implantação que o Control Plane registra como pendente de
confirmação do dono:** a obrigatoriedade só entra em vigor **depois** de a
automação externa passar a enviar a chave, com a rota aceitando ambas as formas
durante a janela de migração. Se o dono determinar corte direto, isso deve ser
decisão explícita e registrada, ciente da interrupção.

### Efeito sobre as Falhas 1 e 3 do `FIND-ERP-005`

O dono determina a liberação das Falhas 1 e 3 à SanaCore. **Registro de estado:
elas já haviam sido liberadas pela `APR-2026-021` Parte B (itens 3 e 4) e já
foram IMPLEMENTADAS** — commits `cd6f45b`, `afde1d0`, `8a2c5e3`, `33b8633` e
`54572b7` na branch `sana/ERP-LEGACY-001/FIND-ERP-005`, com typecheck limpo e
95 testes unit verdes verificados de forma independente pelo orquestrador. Esta
aprovação **confirma** a liberação; não abre trabalho novo nas Falhas 1 e 3.
Pendente para fechar o caso: `REMEDIATION.md` e `REMEDIATION_EVIDENCE_PACKAGE`.

**Aprovado por:** Gilwagno (dono do CoreTriad) — 14/08/2026.

---

## APR-2026-023 — G4/G5/G6/G7 aprovados, G11 opção (c), e implantação da chave em 3 etapas com gate humano

### Parte A — Implantação da chave de idempotência obrigatória (FIND-ERP-001)

Confirmada a obrigatoriedade da `APR-2026-022` decisão 2, **sem corte direto**,
em **três etapas obrigatórias e nesta ordem**:

| Etapa | Conteúdo | Estado |
|---|---|---|
| **1** | A automação externa passa a **enviar** a chave | Trabalho **fora deste repositório** (instância de automação); depende do dono |
| **2** | A rota aceita chamadas **com e sem** chave durante a janela de migração | Implementável no ERP agora |
| **3** | A exigência entra em vigor (chamada sem chave é rejeitada) | **BLOQUEADA** — ver gate abaixo |

**GATE HUMANO OBRIGATÓRIO ENTRE AS ETAPAS 2 E 3.** Determinação expressa do
dono: *"Documente cada etapa e confirme comigo antes de avançar da etapa 2 para
a 3."* Nenhum agente — OpusCore, SanaCore ou VeriCore — pode promover a etapa 3
sem nova aprovação humana registrada. Avançar sem ela é violação de gate
(Regra 18) e produz interrupção da integração em produção.

**Cada etapa deve ser documentada** ao ser concluída, com evidência do que
mudou e de como se verificou.

### Parte B — Gates da auditoria `ERP-LEGACY-001-AUD-001`

| Gate | Veredito | Efeito prático |
|---|---|---|
| **G4** | **APROVADO** | A fila `DYN-01…DYN-08` fica autorizada **contra `erp_evok_audio_test`**. Desfaz o `CONFLITO-G3×G4`: as trilhas antes em `READY_TO_CLOSE_BLOCKED_BY_G4` passam a poder fechar. **O banco real permanece proibido** — `APR-2026-016` intacto e o guard que recusa banco sem sufixo de teste segue ativo. |
| **G5** | **APROVADO** | Homologada a dispensa das trilhas de IA e do `agent-permission-auditor`, **com a cláusula de reabertura**: qualquer trilha que encontre modelo, embedding ou agente interrompe e escala ao director; reabertura por adição ao plano, nunca por decisão do auditor que achou. |
| **G6** | **APROVADO** | `RA-09` liberada: o `vericore-audit-scope-agent` pode emendar formalmente o `AUDIT_SCOPE.md` §2.3, cuja afirmação sobre a baseline é sabidamente incorreta. |
| **G7** | **APROVADO** | Confirmado que as remediações SanaCore **não entram** nesta run e exigirão **delta audit** (Regra 14). Nenhum `RETEST_PASSED`/`FINDING CLOSED` de `FIND-ERP-001` ou `FIND-ERP-005` sai desta auditoria. |
| **G11** | **OPÇÃO (c)** | Liberada a **primeira etapa dentro das 110 sessões já aprovadas**; o restante (W2/W3) fica retido até o dono receber o **número real medido**, não estimado. |

### Parte C — Escopo liberado para fieldwork por G11(c)

**W0 — CONCLUÍDA** (`T-00`, re-ancoragem: `ÂNCORAS_VÁLIDAS` 7/7).

**W1 — LIBERADA, 20 sessões, dentro das 110:** `T-01` (tier 1 cadastro:
`items`/`categories`/`departments`, 22 endpoints), `T-02` (tier 1 identidade:
`auth`/`users`, 15 endpoints), `T-03` (tier 1 audit log: `auditLogs` +
`auditLogService.ts`), `T-04` (transversal authZ: `middlewares/` + montagem em
`app.ts` — gargalo de W2), `T-05` (fluxo item↔produto↔recebimento, cross-tier,
inclui RA-08: cobertura integral dos 2 serviços sem auditoria anterior).

**W2, W3 e W4 permanecem RETIDOS.** A liberação depende de o dono receber a
medição real de esforço produzida pela execução de W1 e decidir sobre o
delta 110 → 144.

**Obrigação de medição:** a execução de W1 deve produzir esforço **medido** por
trilha, para substituir a estimativa. É o objeto da opção (c) — trocar
estimativa por medida antes de comprometer número.

**Aprovado por:** Gilwagno (dono do CoreTriad) — 14/08/2026.

Aprovações futuras: adicionar linha com próximo ID sequencial. Nunca editar
entradas existentes — correções entram como nova linha referenciando a antiga.
