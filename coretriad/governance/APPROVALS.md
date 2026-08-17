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

---

## APR-2026-024 — Opção A no déficit de cobertura do G3, promoção do achado `js-yaml` a finding formal, e recriação do banco de teste antes de qualquer trilha dinâmica

**Contexto:** encerramento do fieldwork da run `ERP-LEGACY-001-AUD-001` (27/27
trilhas), três rodadas de validação adversarial `T-25` e a consolidação `T-26`
com a medição de cobertura executada
(`audit/runs/ERP-LEGACY-001-AUD-001/24-coverage/AUDIT_COVERAGE_EXECUTED.md`).
O Control Plane apresentou ao dono o déficit medido entre a matriz de cobertura
prometida (pós-`EMENDA-02`, elevada justamente para cumprir a condição (a) do
gate **G3** de `APR-2026-021`) e a cobertura de fato entregue pelas trilhas. O
dono respondeu com três decisões, registradas abaixo. **Nenhuma foi inferida
por agente** (Regra 18).

### Decisão A — fechar o déficit de cobertura do G3 ANTES de qualquer veredito final (Opção A)

**Escolhida a Opção A: estender a auditoria agora.** A **Opção B** — aceitar
cobertura parcial com exclusão registrada no relatório final — foi
**explicitamente recusada pelo dono**.

Escopo imediato autorizado: os **≈150 endpoints** dos três déficits materiais
de W2, declarados pelas próprias trilhas e medidos em
`AUDIT_COVERAGE_EXECUTED.md` §3.1:

| Déficit | Célula | Prometido | Executado | Déficit nominal | Declarado por |
|---|---|---|---|---|---|
| `DEF-01` | C-01/C-02 — `juridico` D3+D4 | E 75/75 | A(38/75) | **37 endpoints** | `T-09` §6 |
| `DEF-02` | C-03…C-06 — `rh`+`sst` D3+D4 | E 132/132 | A(~24/132) | **108 endpoints** | `T-12` §5 (`RES-T12-01`) |
| `DEF-03` | C-10/C-11 — `rfq` D3+D4 | E 7/7 | A (parcial) | **≈5 endpoints + tabelas de preço** | `T-10` §4 (`RES-T10-01`) |

Os três recaem em categorias que a condição de G3 **veda amostrar**
(contratos/jurídico, dado pessoal sensível e obrigação legal com prazo,
operações financeiras/segregação).

Trilhas complementares despachadas em consequência desta decisão:
`T-27_DEF-01_JURIDICO_D3D4`, `T-27_DEF-02A_RH_D3D4`, `T-27_DEF-02B_SST_D3D4`,
`T-27_DEF-03_RFQ_PRECOS_D3D4`.

**RESSALVA VINCULANTE, apresentada pelo orquestrador ao dono antes da decisão e
registrada aqui para que não se perca — o déficit medido é MAIOR que esses
≈150 endpoints.** Também consta de `AUDIT_COVERAGE_EXECUTED.md`, medido e
nominal:

| Item | Medição registrada | Fonte |
|---|---|---|
| **70 células não executadas** nos 43 endpoints rasos do tier 3 (D1, D2, D3, D4, D5, D6, D9 elevados a `E` pela EMENDA-02, entregues como `R`) | 70 de 70 não entregues — "a maior divergência planejado × executado desta run"; `N-05` e `N-06` permanecem materialmente em vigor | §4 (C-63…C-132), §7.1, §7.2 |
| **126 páginas do `client/` não amostradas** | `N-07` "EM VIGOR com número medido"; executado A(41/167) contra triagem 100% prometida (C-133) | §4, §7.2 |
| **`mobile/` e `tv/` não explorados — nem estruturalmente** | `N-08` "EM VIGOR E AGRAVADA"; C-134 e C-135 não cumpridas | §4, §7.2 |
| **185 de 207 tabelas sem semântica de coluna** | C-137 entregue como A(22/207) em nulabilidade/semântica | §5, §7.1 |
| Agregado das células elevadas | das **137** células elevadas pela EMENDA-02, **≈81 não entregues como `E`**; "a cobertura executada corresponde, em larga medida, à matriz PRÉ-EMENDA-02" | §7.1 |

**Efeito normativo desta ressalva:** fechar os ≈150 endpoints cumpre
`DEF-01`/`DEF-02`/`DEF-03` e **nada além disso**. **Não autoriza declarar o G3
integralmente cumprido**, não revoga `N-05`, `N-06`, `N-07` nem `N-08`, e não
supre as células C-63…C-137. **Essa segunda leva permanece decisão ABERTA do
dono** — e, como todo gate, só pode ser resolvida por decisão humana explícita
registrada (Regra 18), nunca por inferência a partir desta aprovação.

### Decisão B — promoção do achado `js-yaml` HIGH a finding formal

Autorizada a promoção a finding formal do achado registrado como `OBS-T26-01`
em `T-26_CONSOLIDACAO.md` §7: **`js-yaml`, `CVE-2026-59870`, HIGH, ativo hoje
em `server`**; acompanham 21 vulnerabilidades (14 HIGH) em `mobile` e 19
(12 HIGH) em `tv`. É **achado novo, produzido por execução** (`npm audit`,
bateria de verificação dinâmica 01 —
`07-findings/DYN_VERIFICACAO_BATERIA_01.md`) e **não catalogado por nenhuma
das 27 trilhas de fieldwork**: nenhuma leitura estática de `package.json`
poderia produzi-lo.

**Prioridade determinada pelo dono:** a SanaCore deve avaliar a atualização da
dependência **independentemente da decisão sobre o G3** — este item não fica na
fila atrás do fechamento de cobertura.

Trilha despachada: `vericore-dependency-security-auditor`, produzindo
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-DEP-JSYAML-01.md`.

**CONDIÇÃO DA REGRA 22, registrada expressamente:** sendo **HIGH**, o finding
precisa passar pelo `vericore-finding-validator` **antes** de seguir para
remediação. **A promoção autorizada pelo dono NÃO dispensa essa validação, e
ela ainda NÃO ocorreu.** Enquanto não ocorrer, trata-se de finding **promovido
e não validado**: nenhum agente pode tratá-lo como `CONFIRMED`, e esta
aprovação, isoladamente, não constitui encaminhamento formal à SanaCore.

### Decisão C — recriação do banco de teste `erp_evok_audio_test` do zero

Determinada a **recriação do banco de teste `erp_evok_audio_test` do zero**,
**isolado de qualquer branch SanaCore não mesclada**, com **confirmação de
integridade**, **antes de qualquer trilha que dependa de teste dinâmico (G4)**.

**Motivo de fato:** a bateria dinâmica 01 provou que `erp_evok_audio_test`
carregava a migration
`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`,
proveniente de `origin/sana/ERP-LEGACY-001/FIND-ERP-005` (commit `67b49fb`,
marcado como remediação PARCIAL e NÃO retestável), que **não é ancestral do
`AUDIT_COMMIT` nem de `main`** — ou seja, o banco de teste vinha sendo
**compartilhado** entre sessões VeriCore e SanaCore, não recriado a cada
execução. Efeito medido: 480 FKs / 208 tabelas no banco efêmero contra
478 / 207 no versionado.

Trilha despachada: agente `docker`, produzindo `G4_PRECONDICAO_BANCO_TESTE.md`.

**Esta decisão RESOLVE a pendência (b)** das três que a bateria de verificação
dinâmica 01 deixou explicitamente para o dono. **As outras duas permanecem
ABERTAS:**

- **(a) prova literal de escrita em `audit_logs`** por exceção nomeada e
  controlada ao veto de escrita em banco — o `vericore-audit-verification-runner`
  recusou `DYN-T03-02`/`DYN-T03-05` por desenho, porque sua carta de
  responsabilidades proíbe qualquer escrita em banco, mesmo em teste efêmero, e
  a autorização recebida não nomeava essa exceção. **PERMANECE ABERTA.**
- **(c) bateria dinâmica 02 com o servidor de fato no ar** — ~70 verificações
  que exigem `server` rodando contra `erp_evok_audio_test` e emitindo JWT
  reais, incluindo as que sustentariam diretamente os dois CRITICAL de maior
  prioridade (`AUD-AUTHN-01`, `T24-F01`). **PERMANECE ABERTA.**

### O que esta aprovação NÃO cobre

1. **Não declara o G3 cumprido.** Ver a ressalva da Decisão A — o déficit
   remanescente (70 células do tier 3 raso, 126 páginas do `client/`,
   `mobile/`, `tv/`, 185 de 207 tabelas) segue sem decisão do dono.
2. **Não estende autorização por analogia a nenhum outro achado.** A promoção a
   finding vale **exclusivamente** para o achado `js-yaml`/`CVE-2026-59870`. As
   demais observações não promovidas de `T-26_CONSOLIDACAO.md` §7 e as lacunas
   de adjudicação de §2.5 (`T16-F15`, `T21-F01`, `RES-T13-04`, `RES-T13-05`)
   **não** são promovidas por esta aprovação. Precedente de `APR-2026-018`
   reafirmado: promoção fora de sequência é exceção caso a caso, nunca regra
   nova, nunca por analogia.
3. **Não estende autorização a nenhuma outra escrita em banco.** A Decisão C
   autoriza **recriar o banco de teste**, e só isso. Não autoriza a prova
   literal de escrita em `audit_logs` (pendência (a)); não autoriza a bateria
   02 (pendência (c)); não autoriza DDL nem DML em `erp_evok_audio` — banco
   **PRODUÇÃO REAL** por `APR-2026-016`, reafirmado intocável em
   `APR-2026-021` Parte D — e não resolve a pendência humana nº 1 do `CASE-002`
   (a migration `jur_approval_thresholds` aplicada somente ao banco de teste,
   cuja aplicação em produção é ato do dono, não de agente).
4. **Não declara `AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem
   `FINDING CLOSED`** — autoridade exclusiva da VeriCore (Regras 4 e 5).
   Nenhum finding é fechado, aberto para remediação ou reclassificado por esta
   aprovação.
5. **Não resolve as divergências escaladas ao `vericore-software-audit-director`**
   pela consolidação e pela cobertura executada — em especial `DIV-SEV-01`
   (`T17-F05` MEDIUM × `T23-F03` HIGH), a irreconciliação `INV-01` × `INV-02`
   (673 × 676 endpoints alcançáveis) e a divergência aritmética do placar de
   validação registrada no `PROJECT_EVENT_LOG.md` desta data.
6. **Não altera `APR-2026-023` Parte A:** o gate humano obrigatório entre as
   etapas 2 e 3 da chave de idempotência continua integralmente em vigor.

**Aprovado por:** Gilwagno (dono do CoreTriad), em sessão — 16/08/2026.

**Registrado por:** `coretriad-director` — registro de decisão humana já
tomada. Nenhum juízo técnico, nenhuma severidade decidida, nenhum finding
validado ou fechado (Regras 5 e 6).

Aprovações futuras: adicionar linha com próximo ID sequencial. Nunca editar
entradas existentes — correções entram como nova linha referenciando a antiga.

---

## APR-2026-025 — Guarda de sufixo `_test`/`_ci` em `DB_NAME` nos dois scripts destrutivos, fail-closed, encaminhada à SanaCore

**Data:** 2026-08-16
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto nesta sessão
**Registrado por:** `coretriad-director`
**Artefato de despacho:** `coretriad/handoffs/ERP-LEGACY-001/REMEDIATION_CASE-ERP-LEGACY-001-CASE-003.md`

**Texto verbatim:** *"Aprovo a recomendação: estenda `limpar-dados-transacionais.cjs`
e `seed-usuarios-departamentos.cjs` com a mesma checagem de sufixo `_test`/`_ci`
em `DB_NAME` que já existe e funciona em `run-api-suite.cjs:530-536`, recusando
rodar (fail-closed) se o banco não tiver esse sufixo — antes de qualquer DELETE.
Encaminhe para a SanaCore como remediação prioritária de `RC-PROC-01`, com
reteste independente da VeriCore depois."*

**Divergência resolvida (Regra 20):** instrução anterior do dono previa "guarda
com escape explícito"; a posterior determina fail-closed **sem** escape.
Prevalece a posterior. Consequência aceita e registrada: limpar o banco real
antes do Go-Live exigirá alteração de código naquele momento.

**Escopo:** exatamente os dois scripts nomeados + notas de cabeçalho. **Não**
autoriza ampliação por analogia a outros scripts, **não** autoriza mexer em
`.env.example`/`docker-compose.yml`, **não** fecha `AUD-PROC-CUSTODIA-01`, **não**
declara `CE-01`…`CE-09` cumpridos e **não** aceita risco algum.

**Fluxo:** SanaCore implementa em worktree `sana/ERP-LEGACY-001/CASE-003`;
VeriCore reatesta de forma independente. `RETEST_PASSED`/`FINDING CLOSED` seguem
exclusivos da VeriCore (Regras 3 e 4).

---

## APR-2026-026 — CE-02 aceito como resíduo + destino dos 3 achados da validação independente dos verificadores

**Data:** 2026-08-16
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto nesta sessão
**Registrado por:** `coretriad-director` / orquestrador
**Classe de risco:** `RC-PROC-01`
(`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`)

### DECISÃO — `CE-02` (evasão da guarda de banco)

**Contexto:** demonstrado que a guarda contra comandos Bash referenciando o
banco de produção pode ser contornada por ofuscação de shell (ex.: nome do
banco montado em variáveis concatenadas), pois o hook não avalia o comando
após expansão do shell — **limitação estrutural, não bug pontual**.

**Decisão:** aceito que a guarda cobre **acidente de configuração, não evasão
deliberada**. Histórico de incidentes (5 casos) mostra padrão consistente de
erro não intencional com autorreporte, nunca tentativa de ocultar violação.
Reforçar contra evasão intencional fica registrado como **melhoria futura, sem
prioridade atual**.

**Aprovado por:** Gilwagno — 2026-08-16.

**Nota de evidência (não altera a decisão):** a evasão foi demonstrada por
execução nesta sessão pelo orquestrador (`A="erp_evok"; B="_audio"` →
comando aprovado), e a limitação já constava, declarada, do relatório de
entrega do `opuscore-devops-engineer` que implementou a guarda. `CE-02`
permanece **não satisfeito no eixo de evasão**, por aceitação explícita — não
por ausência de conhecimento.

### Item 1 — Conjugação verbal: CORRIGIR AGORA (executado)

**Achado** (`vericore-sdet-auditor`, validação independente): o
`COMMIT_CONTEXT` de `server/scripts/verify-git-references.cjs` usava
`\bcommits?\b`, que exige fronteira de palavra logo após "commit" e por isso
**não casava nenhuma conjugação em português** (commitado/commitada/commitou/
commitando/commitar). Falso negativo **real e já presente no corpus**:
`PROJECT_EVENT_LOG.md` contém *"foi commitado antes (`de4dac1`)"* — hash
citado e nunca verificado.

**Decisão:** *"corrija agora — é ajuste de uma linha de regex que fecha falso
negativo real já existente no repositório."*

**Executado em 2026-08-16.** Padrão passou a
`\bcommit(s|ad[oa]s?|ou|aram|ando|ar)?\b`. Verificação: 16/16 casos
(8 conjugações + 5 não-regressão + 3 controles negativos, extraindo o regex
do arquivo real, não reimplementado). Execução no repositório: candidatos
subiram de 515→**517** citações e 57→**58** commits distintos, **sem
introduzir falso positivo** (verificador segue `EXIT=0`).

### Item 2 — Ambiguidade `SYSTEM_MAP.md`: RESÍDUO ACEITO

**Achado:** existem três arquivos `SYSTEM_MAP.md` no repositório (70, 74 e 165
linhas) e `verify-control-plane.cjs` considera válida uma citação
`SYSTEM_MAP.md:N` se **qualquer** candidato homônimo tiver N linhas — podendo
confirmar por coincidência uma citação que aponta para o arquivo errado.

**Decisão:** *"aceito como resíduo — efeito é citação incorretamente atribuída,
não passagem de dado ruim."*

**Registro:** o verificador continua trocando "path existe" por "path existe em
algum lugar com esse nome". Nenhuma ação corretiva autorizada.

### Item 3 — Downgrade em CI: RESÍDUO ACEITO **COM CONDIÇÃO VINCULANTE**

**Achado:** quando um artefato citado só existe em branch de remediação
(`sana/*`), `verify-control-plane.cjs` rebaixa `FALHA` para `AVISO` consultando
`git log --all` — o que funciona **localmente**, onde essas branches existem
como refs. O job de CI usa `actions/checkout@v4` com `fetch-depth: 0` e
`fetch-tags: true`, que garantem histórico completo **do ref sob checkout**,
mas **não** trazem as demais branches remotas. Num runner limpo, esses
artefatos apareceriam como `CAMINHO_INEXISTENTE` (falha), não aviso.

**Decisão:** *"aceito como resíduo, COM CONDIÇÃO EXPLÍCITA registrada."*

> ### ⚠️ CONDIÇÃO VINCULANTE — CD-CI-01
>
> **Antes de qualquer decisão futura de promover o job
> `governance-detective-controls` de INFORMATIVO para BLOQUEANTE (isto é, de
> remover `continue-on-error: true` de `.github/workflows/server-ci.yml`), o
> problema das branches de remediação não baixadas pelo `actions/checkout`
> PRECISA ser resolvido primeiro.**
>
> Promover o job sem resolver isso faria o CI reprovar por artefatos que
> existem — divergência entre máquina local e runner —, e o resultado previsível
> é o gate ser desligado por ruído, que é exatamente o antipadrão que
> `AUD-CICD-DEPGATE-01` documenta.
>
> **Esta condição está replicada em três lugares para não se perder:** aqui
> (`APR-2026-026`), no comentário do próprio job em
> `.github/workflows/server-ci.yml`, e no `RC-PROC-01` (`CE-07`).
> **Nenhum agente pode dispensá-la; só decisão humana explícita registrada.**

### O que esta aprovação NÃO cobre

- **Não** fecha `CE-02` como satisfeito — fecha como **resíduo aceito**, que é
  categoria distinta e deve constar assim em qualquer relatório de encerramento.
- **Não** fecha `CE-07`, que permanece parcial pelos itens 2 e 3.
- **Não** fecha `AUD-PROC-CUSTODIA-01`, `CE-06`, `CE-08` nem `CE-09`.
- **Não** decide sobre o `Bash` dos 15 agentes em `.claude/agents/_deprecated/`
  — segue pendente.
- **Não** autoriza ampliação por analogia a nenhum outro controle ou script.

---

## APR-2026-027 — `CE-06` implementado (não aceito por autorreporte) + destino dos três scripts remanescentes

**Data:** 2026-08-16
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto nesta sessão
**Registrado por:** `coretriad-director` — registro de decisão humana já tomada
**Classe de risco:** `RC-PROC-01`
(`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`)
**Rastreio de execução:** `coretriad/governance/PENDING_SCHEDULED_ACTIONS.md`

> **LEITURA OBRIGATÓRIA JUNTO COM `APR-2026-028`.** Esta entrada foi redigida
> **antes** de existir a prova de escopo exigida pela sua própria D1.1. A prova
> passou a existir na mesma data e **refutou a premissa de D1** de que o banco de
> teste poderia ser ativado isoladamente. `APR-2026-028` registra o resultado e
> as decisões que dele decorreram. Esta entrada é preservada sem alteração como
> registro histórico (Regra 15) — **não a cite isoladamente**.

### D1 — `CE-06`: IMPLEMENTAR, não aceitar por autorreporte

**Texto verbatim:** *"Decisão CE-06: implementar `log_connections` no PostgreSQL,
não apenas aceitar por autorreporte. No banco de teste, ative imediatamente. No
banco de produção, prepare o comando/procedimento e registre como pendência
agendada para uma janela de manutenção — não execute contra produção sem minha
confirmação explícita do dia/horário. Registre a decisão em `APPROVALS.md`."*

**O que esta decisão muda, e por que é significativa.** `CE-06` era, na redação
da §6, o único critério que oferecia **duas saídas**: retenção de evidência
independente **ou** *"aceitação registrada de que o cumprimento é verificável
apenas por declaração do agente"*. **O dono recusou a segunda saída e escolheu o
mecanismo.** No contexto desta classe isso não é detalhe: `RC-PROC-01` existe
justamente porque *contenção por disciplina não é controle*, e aceitar `CE-06`
por autorreporte seria fechar o critério de auditabilidade com a mesma substância
que a classe declara insuficiente. A escolha é coerente com §5 — *"só é controle
o que é versionado, reauditável e imposto por quem não é o restringido"*.

**Precedente fixado:** um critério de encerramento cuja alternativa é "aceitar
que só existe a palavra do agente" deve ser tratado como **último recurso**, não
como saída equivalente.

### D1.1 — CONDIÇÃO TÉCNICA VINCULANTE (registrada como condição, NÃO como resultado)

O container `evok-postgres` hospeda o banco de **teste** e o de **produção** na
**mesma instância**. `log_connections` é **parâmetro de servidor**: se o escopo
efetivo for de cluster, ativá-lo "só no teste" **atinge produção**, contrariando
a própria instrução do dono.

Levantado pelo orquestrador **antes** do despacho. O agente de infraestrutura foi
instruído a:

1. **Provar o escopo antes de aplicar** — evidência de que a ativação é ou não
   isolável por banco;
2. **Não aplicar nada** se a separação for tecnicamente impossível, tratando a
   ativação **inteira** (teste + produção) como item da janela de manutenção.

**O resultado dessa prova NÃO existe nesta data.** Esta aprovação **não** afirma
que `log_connections` foi ativado em banco algum. Qualquer registro futuro que
cite esta entrada como "ativado no teste" estará afirmando o que ela não diz.

### D1.2 — PENDÊNCIA AGENDADA DE PRODUÇÃO — `PEND-2026-001`

> **ESTADO: `AGUARDANDO JANELA — data/horário a definir pelo dono`.**
>
> Preparar o comando/procedimento está autorizado. **Executá-lo contra o banco
> de produção real NÃO está**, até confirmação humana explícita de dia e horário,
> registrada em `APPROVALS.md`. **Nenhum agente pode dispensar esta restrição**
> (Regra 18), e ela não decai por decurso de prazo.
>
> Rastreada em `coretriad/governance/PENDING_SCHEDULED_ACTIONS.md`
> (`PEND-2026-001`), com condição de saída explícita, porque pendência sem
> gatilho é exatamente o modo de falha que o incidente 4 da classe documenta.

**`CE-06` NÃO é declarado satisfeito por esta aprovação.** Passa de `ABERTO` a
**`EM IMPLEMENTAÇÃO`**. Só fecha com **retenção efetiva nos dois bancos**,
verificada pela VeriCore, **ou** com aceitação escrita do resíduo pelo dono.

### D2 — `criar-aprovador.cjs`: guarda de confirmação explícita (extensão de `CASE-003`)

**Texto verbatim:** *"aplique a mesma guarda de confirmação explícita já usada em
`apply-pending-migrations.cjs` (script legítimo em produção por desenho, mas
precisa de confirmação obrigatória contra o alvo, já que `NODE_ENV` sozinho não
cobre o vetor real)."*

**Decisão registrada:** `criar-aprovador.cjs` passa a exigir **confirmação
explícita contra o alvo** antes de operar, como extensão do padrão de `CASE-003`.
O script é **legítimo em produção por desenho** — existe para criar conta
operacional real —, então a guarda correta é confirmação obrigatória do alvo,
**não** recusa por sufixo, que o inutilizaria.

**DIVERGÊNCIA REGISTRADA (Regra 7 — o artefato vence), verificada por leitura
direta do `coretriad-director` nesta data:**

1. **A guarda de referência não existe.** `server/scripts/apply-pending-migrations.cjs:17-25`
   declara no próprio cabeçalho *"⚠️ Sem guarda de ambiente … NÃO checa `NODE_ENV`
   nem sufixo de `DB_NAME`"*, e `:35` usa `process.env.DB_NAME` com default no
   banco real. O reteste da VeriCore
   (`audit/runs/ERP-LEGACY-001-AUD-001/30-retest/RETEST_AUD-PROC-CUSTODIA-01.md`
   §4, resíduo R2) registra o mesmo, agravado por o script **aplicar DDL**.
   **Logo: o padrão precisa ser CRIADO, não replicado.**
2. **`criar-aprovador.cjs` não tem sequer guarda de `NODE_ENV`.** `Grep` devolve
   **uma** ocorrência (`:18`), em comentário, **descrevendo outro script**
   (`seed-usuarios-departamentos.cjs`). As recusas implementadas são e-mail
   (`:247-250`), domínio de teste (`:251-257`) e chave de perfil (`:258-262`);
   nenhuma avalia o alvo do banco, e `connect()` (`:173-188`) faz default no
   banco real. O reteste o descreve como *"só guarda `NODE_ENV`"* —
   imprecisão registrada aqui e **não corrigida**: artefato de auditoria não é
   alterado por este documento (Regras 2 e 15).

**Efeito da divergência: reforça D2, não a enfraquece** — a proteção existente é
**menor** do que qualquer das duas fontes supunha. A intenção do dono é clara e
permanece válida.

**Ficam abertos, sem decisão (`PEND-2026-003`):** (a) o texto/UX exato da
confirmação, por não haver referência a copiar; (b) se `apply-pending-migrations.cjs`
— hoje o script **sem guarda alguma que aplica DDL** — também recebe a guarda.
O `coretriad-director` **não amplia escopo por analogia** (precedente `APR-2026-018`).

*(Ambos resolvidos por `APR-2026-028` §4, na mesma data.)*

### D3 — `comparar-bancos.cjs`: NENHUMA AÇÃO — decisão de não agir, com fundamento

**Texto verbatim:** *"nenhuma ação necessária — já confirmado como somente
leitura, fora da classe de risco."*

**Registrado explicitamente como DECISÃO DE NÃO AGIR, não como omissão.** A
distinção é o que a torna auditável: existe data, autoridade, fundamento e
evidência, e uma varredura futura que reencontre o script saberá que ele foi
**examinado e dispensado**, não esquecido.

Fundamento verificado por leitura nesta data: `Grep` por
`DELETE|UPDATE|INSERT|TRUNCATE|DROP|ALTER|createTable` em
`server/scripts/comparar-bancos.cjs` retorna **zero ocorrências**; o reteste da
VeriCore registra `permission denied for schema public` *"confirmando
leitura-apenas"*. O script permanece citado em `R2` do reteste apenas por
**alcançar** o banco, não por escrever nele.

### O que esta aprovação NÃO cobre

- **Não** declara `CE-06` satisfeito — passa a **`EM IMPLEMENTAÇÃO`**.
- **Não** afirma que `log_connections` foi ativado em qualquer banco; a prova de
  escopo (D1.1) ainda não existe.
- **Não** autoriza executar nada contra produção. A janela é `PEND-2026-001`.
- **Não** decide o destino de `apply-pending-migrations.cjs` (`PEND-2026-003`).
- **Não** fecha `CE-01`…`CE-05`, `CE-07`, `CE-08` nem `CE-09`, e **não** fecha
  a classe `RC-PROC-01`.
- **Não** reabre, altera ou reavalia `AUD-PROC-CUSTODIA-01`, cujo `RETEST_PASSED`
  e `FINDING CLOSED` são autoridade exclusiva da VeriCore (Regras 4 e 5).
- **Não** corrige o texto do reteste da VeriCore quanto às imprecisões de D2 —
  apenas as registra (Regras 2 e 15).
- **Não** autoriza ampliação por analogia a nenhum outro controle ou script.

---

## APR-2026-028 — resultado da prova de escopo de `CE-06` e quatro decisões decorrentes

**Data:** 2026-08-16 (posterior a `APR-2026-027` na mesma data)
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto nesta sessão
**Registrado por:** orquestrador da sessão — registro de decisão humana já tomada
**Relação:** **emenda e supera parcialmente `APR-2026-027` D1**, que permanece
íntegra como registro histórico (Regra 15)

### 1. O resultado que `APR-2026-027` D1.1 exigia — a separação é IMPOSSÍVEL

Evidência de execução:
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_CE06_LOG_CONNECTIONS.md`
(executada pelo orquestrador; o agente `docker` foi despachado, está em
`_deprecated/` sem `Bash` desde `CE-04`, e **corretamente se recusou a fabricar
saída de comando**).

- `log_connections` e `log_disconnections`: `context = superuser-backend`,
  `source = default`, valor `off`. PostgreSQL 16.14, imagem `postgres:16-alpine`.
- `ALTER DATABASE <banco de teste> SET log_connections = on;` →
  `ERROR: parameter "log_connections" cannot be set after connection start`.
- `pg_db_role_setting` **vazio**; estado pós-tentativa **inalterado**.
- `PGOPTIONS="-c log_connections=on"` **funciona**, mas é **opt-in do cliente** —
  rejeitado como controle: tem exatamente o defeito do autorreporte que `CE-06`
  existe para eliminar.
- `pgaudit` **indisponível** na imagem em uso.

**Conclusão vinculante:** o parâmetro só admite escopo de **cluster**. Ativá-lo
no banco de teste **ativa em produção junto**. A premissa de `APR-2026-027` D1
("ative imediatamente no teste, não toque em produção") **não é executável**.

**Pela regra fixada em `APR-2026-027` D1.1 item 2, NADA FOI APLICADO** — nem no
teste, nem em produção.

### 2. DECISÃO — ativação cluster-wide, com a janela escolhida antes da execução

**Texto verbatim:** *"Confirmo: ativação cluster-wide de `log_connections`. Teste
imediato, produção agendada — proponha 2-3 opções de data/horário de baixo
movimento (fim de semana ou madrugada) para eu escolher, antes de executar contra
produção."*

**Interpretação registrada, para não gerar citação futura equivocada:** o dono
confirmou o **modo** (cluster-wide) e manteve a **exigência de escolher a janela
antes de qualquer execução contra produção**. Como teste e produção são o mesmo
ato nesta topologia (§1), **"teste imediato" permanece tecnicamente inexecutável
em isolamento** e a ativação inteira vai para a janela.

> **NENHUMA ATIVAÇÃO FOI EXECUTADA.** `PEND-2026-001` permanece
> **`AGUARDANDO JANELA`**, agora com escopo **cluster-wide** e sub-estado
> *"opções propostas, aguardando escolha do dono"*. A proibição de
> `APR-2026-027` D1.2 segue integralmente em vigor.

Procedimento preparado e não executado (`ALTER SYSTEM` + `pg_reload_conf()`,
reload sem restart, sem downtime, com plano de reversão simétrico), incluindo
`log_line_prefix` — sem ele o log registra que houve conexão mas **não permite
atribuí-la**, que é justamente o que `CE-06` exige. Detalhe integral na §4 de
`G4_CE06_LOG_CONNECTIONS.md`.

### 3. DECISÃO — retenção APROVADA

**Texto verbatim:** *"Aprovo a retenção proposta: cópia diária para arquivo
append-only fora do container, 90 dias, replicado para fora do host."*

Deixa de ser proposta e passa a ser **requisito da janela**: o rotation do Docker
(50 MB / 5 arquivos) serve para disponibilidade operacional, **não como evidência
de auditoria** — roda por sobrescrita, sem cópia externa, e o container pode ser
recriado. `CE-06` não fecha só com o parâmetro ligado; fecha com **retenção
efetiva verificada pela VeriCore**.

### 4. DECISÃO — escopo de `PEND-2026-003`, resolvido

A pergunta aberta de `APR-2026-027` D2 ("`apply-pending-migrations.cjs` também
recebe a guarda?") **foi respondida pelo dono na mesma sessão, antes daquele
registro**: sim, com **confirmação explícita obrigatória**, tratado como extensão
de `CASE-003`. O director não tinha essa informação quando registrou.

Estado verificado por artefato:

| Script | Desenho | Commit | Evidência |
|---|---|---|---|
| `apply-pending-migrations.cjs` | confirmação com escape (`--confirmar-banco-real`) | `8050506` | `remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_REPORT_EXTENSAO.md` — **`RETEST_PASSED`** pela VeriCore |
| `criar-aprovador.cjs` | idêntico, mesmas funções | `95aeff4` | `PROVA_GUARDA_CRIAR_APROVADOR.cjs`, 22/22 — **`RETEST_REQUIRED`**, reteste independente pendente |

Ambos na branch `sana/ERP-LEGACY-001/CASE-003`.

**Esta entrada é a autorização nominal** para os dois scripts acima, que
`APR-2026-025` (*"exatamente os dois scripts nomeados"*) e `APR-2026-026`
(*"não autoriza ampliação por analogia"*) **não cobriam**. A ausência dessa
autorização foi levantada pela VeriCore como pendência bloqueante
(`PEND-EXT-05`), corretamente: **mensagem de agente não é registro** (Regra 18) e
não substitui artefato versionado (Regra 7).

**Ação decorrente, da SanaCore:** o cabeçalho de
`server/scripts/apply-pending-migrations.cjs:22-23` cita `APR-2026-026`, que diz
o oposto do que o script fez. Deve passar a citar **`APR-2026-028`**. Correção
só depois deste registro existir, nunca antes.

### 5. DECISÃO — instância PostgreSQL separada: recomendação estrutural, NÃO autorizada

**Texto verbatim:** *"Instância PostgreSQL separada fica registrada como
recomendação estrutural futura, fora do escopo autorizado agora. Não avançar
nisso nesta fase do programa."*

É a correção de causa raiz de toda esta classe de problema — teste e produção
compartilham instância, e `.env.example` aponta o ambiente de desenvolvimento
para o banco real. **Registrada como recomendação, explicitamente não autorizada
nesta fase.** Nenhum agente pode iniciá-la.

### 6. DECISÃO — lacuna de papel de infraestrutura: item de arquitetura, sem prioridade

**Texto verbatim:** *"Registre a lacuna de papel (infraestrutura sem agente
CoreTriad dedicado após o desarmamento do docker) como item de arquitetura
pendente, sem prioridade imediata. Continue com OpusCore/orquestrador cobrindo
trabalho de infra por enquanto."*

Consequência nomeada de `CE-04`: desarmar os 15 agentes de `_deprecated/` fechou
o vetor do incidente original e deixou o programa **sem agente de infraestrutura
na taxonomia**. **Não é defeito da decisão** — é lacuna de papel. Contorno
autorizado: OpusCore ou orquestrador. Rastreada como `PEND-2026-006`.

### O que esta aprovação NÃO cobre

- **Não** declara `CE-06` satisfeito — segue **`EM IMPLEMENTAÇÃO`**.
- **Não** autoriza executar a ativação: a janela ainda não foi escolhida.
- **Não** afirma que qualquer banco foi alterado. **Nada foi aplicado.**
- **Não** fecha `CASE-003` nem declara `RETEST_PASSED` de `criar-aprovador.cjs`
  — autoridade exclusiva da VeriCore (Regra 4).
- **Não** corrige, por si, a citação órfã no cabeçalho do script — isso é ato da
  SanaCore, posterior a este registro.
- **Não** autoriza a instância separada (§5) nem cria agente novo (§6).
- **Não** fecha `RC-PROC-01`.

---

## APR-2026-029 — REGISTRO DE EXECUÇÃO da janela de `CE-06` (não é aprovação nova)

**Data:** 2026-08-16
**Natureza:** registro factual de execução autorizada por `APR-2026-028` §2.
Não concede autorização nova, não altera escopo, não fecha critério.
**Evidência integral:** `coretriad/evidence/ce06-janela-2026-08-16/EXECUCAO_JANELA.md`
e `BASELINE_PRE_JANELA.md`

### Horário

| Item | Valor |
|---|---|
| Janela confirmada pelo dono | 2026-08-16, **22h00-23h00** |
| Antecipação | pelo dono, texto direto: *"não precisa esperar, já pode disparar"* |
| Prova de reversão (no-op) | **20h53** |
| **Aplicação efetiva** | **2026-08-16, 20h54m53s** (horário local, UTC-3) |
| Verificação em conexão nova | 20h56m27s |
| Primeira execução da retenção | 20h58m56s |

A execução ocorreu **fora do horário originalmente confirmado, por antecipação
explícita do dono**. Registrado assim, e não como "executado na janela", porque
a diferença é exatamente o tipo de detalhe que uma auditoria futura precisa
poder verificar (Regra 18).

### Resultado

**Aplicado com sucesso, sem downtime, sem restart.**

- `log_connections = on`, `log_disconnections = on`,
  `log_line_prefix = '%m [%p] user=%u db=%d host=%h '`, os três com
  `source = configuration file`.
- Banco responde normalmente (`pg_isready`: accepting connections).
- **Conexão logada e atribuível nos dois bancos** — usuário, banco, host, porta,
  método de autenticação e tempo de sessão. Escopo de cluster confirmado na
  prática, como a §1 de `APR-2026-028` previa.
- **Nenhuma conexão foi aberta pelo executor contra o banco de produção**: a
  prova do lado de produção veio do tráfego que já existe (healthcheck do
  container e pool do `evok-api`). `APR-2026-016` respeitada sem enfraquecer a
  prova.
- Retenção: 14 arquivos diários append-only, ~1,3 MB, **85 linhas de conexão
  reais** capturadas. Tarefa agendada `\EvokAudio\CE-06 Retencao Log PostgreSQL`,
  diária às 03h00, estado `Ready`.

### Correção de estimativa anterior, registrada

O procedimento preparado em `G4_CE06_LOG_CONNECTIONS.md` §4 afirmava que *"com
pool persistente do Sequelize, o regime estável é baixo"*. **Medição real:
~55.400 linhas e ~8,7 MB por dia** — o healthcheck do container e o pool do
`evok-api` abrem conexão a cada 10s. Com os 50 MB de rotation do Docker, a
margem antes de perder log é de **~5-6 dias**, não indefinida. A execução diária
segue adequada; a folga é menor do que eu havia afirmado.

### O que este registro NÃO faz

- **Não declara `CE-06` satisfeito.** Continua **`EM IMPLEMENTAÇÃO`**: o
  mecanismo, a captura append-only, a poda e o agendamento estão feitos, mas a
  **replicação para fora do host permanece pendente** por decisão do dono
  (cópia manual por ora). Evidência que vive só na máquina auditada não
  sobrevive ao incidente que deveria documentar.
- **Não fecha `PEND-2026-001`** — o item fecha com retenção efetiva verificada
  pela VeriCore, não com a ativação.
- **Não declara `RETEST_PASSED` nem `FINDING CLOSED`** — autoridade exclusiva da
  VeriCore (Regra 4).
- **Não fecha `RC-PROC-01`**, que permanece ABERTA.
- Não alterou `logging_collector`, `log_statement` nem qualquer outro parâmetro
  além dos três nomeados. `log_statement` permanece `none`: a janela registra
  conexões, não comandos.

---

## APR-2026-030 — janela de `CE-06` confirmada concluída + alerta de falha do job

**Data:** 2026-08-16
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto

### D1 — Confirmação humana de conclusão da janela

**Texto verbatim:** *"Confirmo a etapa como concluída sem problema. Pode
registrar isso oficialmente e seguir."*

Confirmação humana explícita (Regra 18) de que a execução registrada em
`APR-2026-029` terminou sem incidente. Encerra o gate operacional da janela.

**Não é fechamento de `CE-06`**, e o dono foi explícito quanto a isso:

> *"Sobre `CE-06` continuar aberto — está correto e é a mesma disciplina de
> sempre: mecanismo real implementado, mas replicação fora do host ainda
> pendente, então não fecha. Não force o fechamento."*

Registrado como **precedente**: mecanismo implementado e provado **não** satisfaz
critério cujo requisito de saída ainda tem parte pendente. `CE-06` segue
**`EM IMPLEMENTAÇÃO`**; `PEND-2026-001` segue aberta; `RC-PROC-01` segue ABERTA.

### D2 — Alerta de falha do job de retenção

**Texto verbatim:** *"Configure um alerta simples para falha do job diário de
retenção — mesmo que seja só um e-mail ou notificação local quando o exit code
não for 0, ou quando o job não rodar no horário esperado. Não precisa ser
sofisticado; precisa existir, dado que a margem real do buffer é de 5-6 dias,
não 'indefinida' como se estimou antes."*

**Implementado:** `ops/postgres-log-retention/Watch-RetentionJob.ps1`, tarefa
`\EvokAudio\CE-06 Alerta Retencao`, diária às 04h00 (1h após o job). Alerta em
três condições — código diferente de 0, job parado além de 26h, e ausência de
arquivo do dia (o caso "sucesso vazio"). Registro em `ALERTAS.log` como fonte de
verdade, mais notificação local. Bateria de prova: **17/17**.

**Decisão de desenho registrada:** o **código 2** (replicação pendente) alerta
de propósito. Não é ruído — é o lembrete diário de que `CE-06` não está
satisfeito. Silenciá-lo seria voltar a fingir que está.

### Dois defeitos reais encontrados pelo próprio alerta, no primeiro uso

1. **O job quebrava sob o Agendador.** `$PSScriptRoot` está vazio quando o
   PowerShell avalia os defaults do `param()` sob `powershell.exe -File`. O job
   funcionava quando chamado de dentro de outra sessão e **falharia todo dia às
   03h00** — perda silenciosa de evidência, exatamente o modo de falha que o
   alerta existe para cobrir. Corrigido nos dois scripts.
2. **O alerta mentia sobre tarefa nunca executada.** O Agendador do Windows usa
   `LastRunTime = 30/11/1999` e `LastTaskResult = 267011`, não
   `DateTime.MinValue`. A primeira versão reportou *"não roda há 234.165h"* e
   *"o job FALHOU"* para uma tarefa recém-criada. Corrigido; casos `W-16`,
   `W-17` e `W-18` acrescentados com os sentinelas reais.

**Observação de método, registrada porque vale para o programa inteiro:** os
dois defeitos passaram por baterias que estavam verdes. Caso sintético só prova
alguma coisa se o valor sintético for o que a realidade usa, e prova de script
agendado só vale se executada **pelo agendador**, não pela sessão do autor.

**Prova fim a fim:** disparo pelo Agendador → job devolve código 2 → vigilante
detecta → entrada gravada em `ALERTAS.log`. Verificado em 21h26.

### Limite declarado

**Não há watchdog do watchdog.** Se a tarefa de vigilância for desabilitada ou a
máquina ficar desligada, ninguém alerta. Escolha consciente de proporção: o
alerta cobre o modo de falha comum (job quebrou, job parou), não sabotagem nem
máquina desligada por semanas. Registrado em vez de silenciado.

---

## APR-2026-031 — decisões D-11 e D-13 do dono + regularizações de registro

**Data:** 2026-08-16
**Autoridade:** dono do CoreTriad (Gilwagno), texto direto e respostas a
questionário estruturado nesta sessão
**Registrado por:** orquestrador — registro de decisões humanas já tomadas

### D-11 — severidade de `AUD-RH-COMISSAO-01`: HIGH

**Justificativa verbatim:** *"bloqueia cálculo correto de VT para funcionário
comissionado e exige mudança de modelo de dados (armazenar separadamente valor
fixo e percentual de comissão, que hoje não tem estrutura no cadastro), mas não
está causando dano ativo hoje porque payroll não está em produção."*

Cláusula fixada: **reavaliar para CRITICAL se o módulo de payroll entrar em
produção antes desta lacuna ser resolvida.** Aplicado no finding; como HIGH,
segue à Regra 22.

### D-13 — quatro decisões de classificação de ambiente (fecham os itens 2, 3, 5 e 1 da §5 de `T-38`)

1. **Módulos dev que ESCREVEM sobre os 327 itens reais → PRODUÇÃO REAL.**
   O dado tocado é real; defeito neles corrompe os 327 itens hoje. Resolve de
   uma vez `AUD-INTEG-03` (CRITICAL, deixa de ser ambíguo e entra no estrato de
   produção), `FIND-ERP-001` e `T32-SUP-F03`.
2. **Itens C, F e G de `AUD-ALOG-01`** (fornecedor de item, categorias,
   departamentos): **a `APR-2026-016` vence o rótulo da trilha** — cadastros-base
   carregados com dado real; desativação sem trilha neles é exposição real hoje.
   Os três sobem ao estrato de produção. Resolve `DIV-T38-01`.
3. **Alcance do critério de fila: exposição real reordena APENAS os estratos
   CRITICAL e HIGH.** MEDIUM/LOW de produção real entram depois dos
   CRITICAL/HIGH de dev — evita inversões extremas de severidade. A decisão
   A/B de `AUD-ALOG-01` permanece como está (ambos são CRITICAL/HIGH).
4. **Módulo `employees`: uso real confirmado SÓ para o fluxo de desligamento.**
   O restante do módulo segue dev/homologação; `AUD-RH-CPFSEARCH-01` mantém o
   estrato atual.

Itens 4 e 6 da §5 de `T-38` **permanecem abertos**: a convenção "ambiente não
aplicável" para os 26 findings documentais não foi submetida ao dono nesta
rodada; a atualização do `PRODUCTION_STATUS_MAP.md` (defasado em `employees`,
`DIV-T38-02`) é autoridade do director e está encaminhada.

### Regularização de registro (fecha `D-R4` do reexame)

O reexame do bloco `AUD-DB-04…-09` foi autorizado pelo dono em texto direto
(*"Reexame AUD-DB-04…-09: prossiga com o director, como já encaminhado"*) —
autorização que até este ponto não constava deste arquivo, defeito apontado pelo
próprio director (`coretriad/governance/REEXAME_AUD-DB-04-09.md`, divergência 3).
**Fica registrada aqui.** O resultado do exame está no artefato citado; as
decisões `D-R1` (severidade de `AUD-DB-09`), `D-R2` (ratificação dos 5 MEDIUM) e
`D-R3` (condicional de fronteira) **seguem abertas com o dono**.

### O que esta entrada NÃO cobre

- **Não** decide `D-01` (rebaixamento de `AUD-CTB-DEBCRED-01`) — a explicação
  pedida foi dada; a palavra final é do dono e ainda não veio.
- **Não** decide `D-R1`/`D-R2`/`D-R3`.
- **Não** altera severidade de nenhum outro finding, não fecha finding, não
  declara `RETEST_PASSED`.
