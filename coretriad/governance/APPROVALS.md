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
