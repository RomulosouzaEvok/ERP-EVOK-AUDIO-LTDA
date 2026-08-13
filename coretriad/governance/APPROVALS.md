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

Aprovações futuras: adicionar linha com próximo ID sequencial. Nunca editar
entradas existentes — correções entram como nova linha referenciando a antiga.
