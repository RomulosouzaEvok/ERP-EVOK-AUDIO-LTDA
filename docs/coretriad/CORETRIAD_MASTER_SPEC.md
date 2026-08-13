# CORETRIAD — Constituição

**Status:** Documento fundador. Rege como os agentes de IA deste projeto se organizam,
decidem, se limitam e se corrigem uns aos outros.
**Regra de vigência:** Nenhum agente — nem a sessão principal do Claude Code — altera os
princípios deste documento por conta própria. Alteração de princípio (não de detalhe
operacional) exige uma Emenda explícita, registrada na seção 14, aprovada por um humano.
Divergência entre este documento e a prática observada é, por si só, um finding a
reportar (via VeriCore), não uma licença para reescrever a Constituição em silêncio.
**Última atualização:** 2026-08-12.

```
CORETRIAD
│
├── OpusCore        — Produção (constrói o sistema)
│   └── .claude/agents/Centro Autônomo de Engenharia de Software/
│
├── VeriCore        — Auditoria (audita o sistema, independente de quem o construiu)
│   └── .claude/agents/Centro Autônomo de Engenharia de Software Auditoria/
│       + audit/ (framework, standards, templates, runs)
│
├── SanaCore        — Remediação (corrige o que a auditoria encontrou)
│   └── remediation/ (reservado — ver §8; ainda sem agentes próprios, ver §8.4)
│
└── Control Plane   — Memória compartilhada e rastreamento de tarefas entre as 3
    └── docs/project-memory/ + docs/control-plane/
```

---

## 1. Princípio fundamental

Um sistema de software é confiável na medida em que existe, para todo comportamento
relevante, uma cadeia contínua e verificável:

```
OBJETIVO DE NEGÓCIO → PROCESSO → REGRA DE NEGÓCIO → REQUISITO → CASO DE USO
→ CRITÉRIO DE ACEITE → NFR → ARQUITETURA → IMPLEMENTAÇÃO → BANCO/API/INTEGRAÇÕES
→ TESTE → SEGURANÇA → AUDIT LOG → OPERAÇÃO → EVIDÊNCIA
```

(Herdado de `audit/framework/AUDIT_PROCESS.md` §1 — a cadeia é a mesma para as 3
organizações; o que muda é quem constrói cada elo, quem verifica e quem corrige.)

Qualquer elo inexistente, inconsistente, incorreto ou sem rastreabilidade é candidato a
finding. Nenhuma organização declara essa cadeia "completa" sem evidência bruta — ver §6.

## 2. As três organizações e o Control Plane

| Organização | Papel | Modo de trabalho | Onde vive |
|---|---|---|---|
| **OpusCore** | Constrói o sistema: produto, arquitetura, engenharia, qualidade, plataforma, funções transversais | `PLAN → IMPLEMENT → TEST → REVIEW → RELEASE` (gates humanos em cada transição relevante) | `.claude/agents/Centro Autônomo de Engenharia de Software/` (22 agentes, 8 grupos) |
| **VeriCore** | Audita o sistema já construído, de forma independente | `READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT` — nunca modifica o objeto auditado | `.claude/agents/Centro Autônomo de Engenharia de Software Auditoria/` (69 agentes) + `audit/` |
| **SanaCore** | Corrige o que a auditoria encontrou, sob backlog aprovado | `TRIAGE → FIX → SELF-TEST → HANDOFF PARA RETESTE` — nunca se auto-aprova | `remediation/` (ver §8) |
| **Control Plane** | Memória e rastreamento compartilhados pelas 3 | Arquivo + git, sem serviço externo | `docs/project-memory/`, `docs/control-plane/` |

### 2.1 Regra dura de segregação (não removível)

> Um agente que implementou uma funcionalidade não pode ser o único agente que audita e
> aprova essa mesma funcionalidade. Um agente que auditou uma funcionalidade não pode ser
> o mesmo agente que a remedia. Um agente que remediou um finding não pode ser o mesmo
> agente que faz o reteste que fecha esse finding.

Isso não é convenção de nomenclatura — é verificado estruturalmente: nenhum `name` de
agente aparece em mais de uma das três pastas de organização. A sessão principal
(orquentradora humana + Claude Code) nunca finge ser "a mesma pessoa" em papéis
conflitantes dentro do mesmo ciclo Constrói→Audita→Remedia→Retesta de um mesmo item.

### 2.2 Fluxo entre organizações

```
OpusCore constrói
     │
     ▼
VeriCore audita (independente) ──► Findings (21-findings/AUD-<ID>.md)
     │                                    │
     ▼                                    ▼
finding-validator tenta refutar    audit-consolidator dedup/agrupa
     │                                    │
     └──────────────┬─────────────────────┘
                     ▼
        audit-reporting-agent → Relatório + Remediation Backlog
                     │
              GATE HUMANO (entrega do relatório)
                     │
                     ▼
        SanaCore remedia (a partir do Backlog, nunca do finding bruto direto)
                     │
                     ▼
        VeriCore re-audita (RETEST — outro agente, nunca quem remediou)
                     │
              GATE HUMANO (só humano autorizado marca RISK_ACCEPTED)
                     │
                     ▼
        Finding CLOSED ou reaberto se o reteste reprovar
```

## 3. Requisitos

- **Fonte:** `docs/project-memory/product/` (PRD, Product Vision, KPIs — OpusCore escreve
  aqui) e, para este ERP especificamente, `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` +
  `docs/business/*` (requisitos por bloco/domínio já em produção).
- **ID:** `REQ-<DOMINIO>-<NUMERO>` (ex.: `REQ-FIN-021`), conforme
  `audit/standards/ID_STANDARDS.md`.
- **Quem valida:** `requirements-auditor` (VeriCore) confirma que todo requisito é
  claro, testável e rastreado até código e teste — nunca aceita a alegação de que um
  requisito "foi implementado" sem essa cadeia.
- **NFR** seguem o mesmo padrão com prefixo `NFR-<CATEGORIA>-<NUMERO>` (categorias:
  `PERF`, `SEC`, `AVAIL`, `SCALE`, `RELI`, `OBS`, `PRIV`, `RECOV`, `MAINT`, `COMPAT`,
  `ACCESS`, `AUDIT`).

## 4. Regras de negócio

- **ID:** `BR-<DOMINIO>-<NUMERO>` (ex.: `BR-FIN-001`).
- **Fonte:** definidas por OpusCore (`business-analyst`) junto ao dono do produto;
  arquivo vivo em `docs/business/*` e `docs/*/0N-TEMA.md` departamentais.
- **Quem valida:** `business-rule-auditor` (VeriCore) compara cada regra documentada com
  sua implementação real — divergência de valor/limite (ex.: alçada de aprovação),
  regra implementada sem documentação, ou regra sem teste automatizado vinculado viram
  finding.
- **Regra de ouro herdada desta auditoria (2026-08-12):** toda regra remediada no MESMO
  dia de uma auditoria é candidata automática a profundidade `Full` — é onde a chance de
  regressão recém-introduzida é maior.

## 5. Casos de uso e critérios de aceite

- **UC:** `UC-<DOMINIO>-<NUMERO>`; **AC:** `AC-<DOMINIO>-<NUMERO>`.
- Todo UC tem ator, pré/pós-condição, fluxo principal, alternativos e exceções — não só
  o caminho feliz. `use-case-auditor` (VeriCore) verifica isso; `acceptance-criteria-auditor`
  verifica se os critérios de "pronto" são objetivos e cobertos por teste, não alegação
  otimista (ex.: "17/17 gaps fechados" precisa de prova por item, não de contagem).
- **Critério de aceite que rege este projeto especificamente** (herdado de
  `CLAUDE.md`, "Critério de aceite corrigido em 2026-08-10"): typecheck + suíte unitária
  verdes **não provam** que um módulo funciona — o aceite honesto é uma escrita real
  bem-sucedida no fluxo principal, contra banco real. `fullstack-auditor` e
  `test-coverage-auditor` (VeriCore) são os guardiões deste critério.

## 6. Arquitetura e documentação

- **ADRs:** `docs/project-memory/architecture/adrs/`, formato `NNNN-titulo-curto.md`,
  nunca apagados — decisão revertida ganha novo ADR referenciando o anterior.
- **Auditores de arquitetura** (VeriCore): `architecture-auditor` (boundaries geral),
  `domain-architecture-auditor` (fronteiras DDD), `mvc-architecture-auditor` (camadas),
  `dependency-architecture-auditor` (grafo de dependências), `repository-layer-auditor`,
  `service-layer-auditor`.
- **Auditores de documentação** (VeriCore): `documentation-audit-lead` coordena;
  `documentation-consistency-auditor` é o mais crítico — compara pares de fontes
  (documento A × documento B × código × banco × testes) e é o responsável por qualquer
  achado de "drift" (ver §6.1).
- **Regra vinculante de calibração (endurecida nesta auditoria, 2026-08-12):**
  conteúdo de projeto injetado automaticamente no contexto de um agente (CLAUDE.md,
  MEMORY.md, resumo de sessão anterior) **nunca** substitui releitura da fonte primária
  no momento da verificação — mesmo que pareça trivial, mesmo que já tenha sido
  "confirmado" na mesma sessão. Esta auditoria (`AUD-2026-08-ERP-EVOK-FULL`) encontrou
  essa classe de erro três vezes de forma independente (scope, inventory e planning
  todos citaram, em algum momento, um número de contexto injetado sem confirmar
  no disco) — ver `audit/runs/AUD-2026-08-ERP-EVOK-FULL/00-scope/SCOPE.md` §"Achado de
  escopo" para o caso completo documentado. Todo achado que cite número/trecho deve vir
  com evidência bruta (comando executado + saída) e timestamp da checagem.

### 6.1 Classes de drift já catalogadas neste projeto

1. **Contexto injetado × disco** — mesmo arquivo, dois estados (o injetado é sempre mais
   antigo). Mitigação: releitura obrigatória.
2. **Dois documentos "canônicos" divergentes** — dois arquivos que se autodeclaram fonte
   única de verdade, mas com números diferentes (ex.: contagem de migrations em dois
   lugares). Mitigação: **um único ponto de medição canônica** por métrica, com todo
   outro documento apontando para ele em vez de repetir o número.
3. **Alegação de execução sem execução real** — documento diz "suíte verde" mas ninguém
   rodou a suíte naquele dia. Mitigação: todo número de teste/cobertura deve vir de
   comando executado na mesma sessão que o cita, nunca de memória do redator.

## 7. Auditoria e Findings (VeriCore)

Ciclo de vida completo em `audit/framework/AUDIT_PROCESS.md` §4 — resumido:

1. **Scope** (`audit-scope-agent`) → `audit/runs/<AUDIT_ID>/00-scope/SCOPE.md`. Gate:
   nenhum trabalho técnico sem escopo registrado.
2. **Inventory** → `01-inventory/SYSTEM_INVENTORY.md` + `SYSTEM_MAP.md`, todo número por
   comando real.
3. **Plan** (`audit-planning-agent` + `software-audit-director`) → `02-plan/`
   (`RISK_CLASSIFICATION.md`, `AGENT_ASSIGNMENT.md`, `AUDIT_PLAN.md`,
   `AUDIT_COVERAGE_MATRIX.md`). Gate: **aprovação humana explícita** antes do fieldwork.
4. **Fieldwork** — trilhas paralelas (Produto/Negócio, Documentação, Arquitetura,
   Engenharia, Dados/Banco, Segurança, Qualidade/Testes, Plataforma/Operação,
   Integrações, IA quando aplicável) → findings em `21-findings/AUD-<DOMINIO>-<NNN>.md`,
   formato de `audit/templates/FINDING_TEMPLATE.md`.
5. **Cross-audit** (opcional) — segunda engine audita de forma cega antes de saber a
   conclusão da primeira (`audit/framework/CLAUDE_CODEX_CROSS_REVIEW.md`).
6. **Validation** (`finding-validator`) — tenta REFUTAR todo finding CRITICAL/HIGH antes
   de aceitar. Discordância nunca é resolvida por votação — só por evidência ou decisão
   humana.
7. **Consolidation** (`audit-consolidator`) — dedup, agrupa, prioriza entre trilhas que
   tocam o mesmo módulo.
8. **Reporting** (`audit-reporting-agent`) — Relatório Executivo + Técnico + Remediation
   Backlog. Gate: **aprovação humana** antes da entrega a qualquer stakeholder.
9. **Remediation** (SanaCore, fora da Audit Organization) — ver §8.
10. **Retest** — reteste independente por VeriCore, nunca por quem remediou. Gate: só um
    humano autorizado marca `RISK_ACCEPTED`.

### 7.1 Formato de um finding

Campos obrigatórios (`audit/templates/FINDING_TEMPLATE.md`): `FINDING_ID`, `TITLE`,
`DOMAIN`/`SUBDOMAIN`, `SEVERITY`, `CONFIDENCE`, `STATUS`, `DESCRIPTION`,
`EXPECTED_BEHAVIOR`, `ACTUAL_BEHAVIOR`, `EVIDENCE` (arquivo:linha + comando/saída),
`RELATED_REQUIREMENT`/`BUSINESS_RULE`/`USE_CASE`/`TEST`, `BUSINESS_IMPACT`,
`TECHNICAL_IMPACT`, `SECURITY_IMPACT`, `REPRODUCTION`, `RECOMMENDATION`,
`SUGGESTED_OWNER`, `RETEST_REQUIRED`.

Severidade e nível de confiança seguem `audit/standards/SEVERITY_AND_CONFIDENCE.md` —
nunca inventados ad-hoc por um agente.

### 7.2 Escalonamento imediato

Findings `CRITICAL` ou com indício de fraude/vazamento/comprometimento de segurança são
escalados ao `software-audit-director` e ao responsável humano **sem esperar o fim do
fieldwork** — não ficam represados até o relatório final.

## 8. Remediação (SanaCore)

### 8.1 Princípio

SanaCore nunca corrige a partir do finding bruto de um agente individual de VeriCore —
sempre a partir do **Remediation Backlog** já consolidado e aprovado no gate humano da
etapa Reporting (§7, item 8). Isso evita que um finding não confirmado (`CONFIRMED` vs.
`REFUTED` pelo `finding-validator`) vire trabalho de correção prematuro.

### 8.2 Ciclo de uma remediação

```
Remediation Backlog (item aprovado)
        │
        ▼
TRIAGE — confirmar reprodução local do problema antes de corrigir
        │
        ▼
FIX — corrigir no escopo mínimo necessário (não expandir para refatoração
      não solicitada; ver princípio de "sem escopo além do pedido" herdado
      das convenções gerais de engenharia deste projeto)
        │
        ▼
SELF-TEST — rodar a suíte relevante localmente (não é o Reteste oficial)
        │
        ▼
HANDOFF — devolve para VeriCore via docs/control-plane/tasks/ com
          status "in_review", nunca se autodeclara "resolvido"
```

### 8.3 Worktrees

Toda remediação que altera código roda em **worktree isolado** (`git worktree` /
`EnterWorktree`/`ExitWorktree` no Claude Code), nunca diretamente no branch que a
auditoria está lendo — evita que uma correção em andamento contamine a evidência que
VeriCore ainda está processando no mesmo commit. O worktree é descartado se não gerar
mudança real; se gerar, vira PR normal (branch/PR obrigatório, sem exceção — mesma regra
que já rege OpusCore).

### 8.4 Estado atual (2026-08-12)

SanaCore **ainda não tem agentes próprios** neste repositório — `remediation/` existe
como pasta reservada (ver raiz do projeto). Até que agentes dedicados de remediação
sejam criados, a correção de findings é feita pelos agentes de **OpusCore** (ex.:
`backend-engineer`, `devops-engineer`) agindo no papel de SanaCore, sob o mesmo princípio
de segregação do §2.1: o agente de OpusCore que implementou originalmente o código com
o finding não deve ser o mesmo a corrigi-lo sozinho sem revisão — no mínimo, `code-reviewer`
(OpusCore) ou o Reteste de VeriCore precisa validar antes do fechamento.

Isso é uma limitação registrada, não uma licença silenciosa — qualquer expansão desta
Constituição para nomear agentes formais de SanaCore é uma Emenda (§14), não uma decisão
implícita de sessão.

## 9. Reteste

- Todo finding com `RETEST_REQUIRED: Yes` só fecha depois de reteste **independente**
  (agente de VeriCore diferente de quem originou o finding e diferente de quem remediou).
- Reteste reprovado reabre o finding com nota de por que a correção não se sustentou —
  nunca é silenciosamente reclassificado para severidade menor para "passar".
- `RISK_ACCEPTED` é status exclusivo do responsável humano autorizado — nenhum agente,
  de nenhuma das três organizações, o atribui por conta própria.

## 10. Memória (Control Plane)

- **`docs/project-memory/`** — fonte de verdade compartilhada entre as 3 organizações:
  `product/` (PRD, KPIs), `architecture/adrs/`, `decisions/`, `security/`, `operations/`,
  `quality/`. Regra de ouro: todo artefato tem owner e critério de atualização; decisão
  revertida ganha novo registro, nunca reescreve o histórico.
- **`docs/control-plane/tasks/`** — rastreamento leve de handoffs entre agentes (arquivo
  + frontmatter: `id`, `agent`, `dependencia`, `entrada`, `saida_esperada`, `status`,
  `proximo_responsavel`, `aprovacao`). É por aqui que uma remediação (SanaCore) sinaliza
  para VeriCore que está pronta para reteste (§9).
- **Memória de sessão do Claude Code** (`~/.claude/.../memory/`, ver `MEMORY.md`) é
  **complementar**, não substitui o Control Plane — memória de sessão é sobre como
  colaborar com o usuário humano; Control Plane é sobre o estado do trabalho entre
  agentes.

## 11. Segregação e Permissões

| Camada | Mecanismo | Onde |
|---|---|---|
| Papel do agente | `tools:` no frontmatter de cada `.md` de agente — least privilege declarado por agente | `.claude/agents/**/*.md` |
| Sessão/projeto | `permissions.allow`/`permissions.deny` — vale para TODA a sessão, não é por agente | `.claude/settings.local.json` |
| Objeto auditado vs. artefato de auditoria | VeriCore é read-only (`Read, Grep, Glob`) por padrão; os poucos agentes de governança com `Write` (director, planning, scope, evidence-controller, consolidator, finding-validator, reporting-agent, traceability-auditor, documentation-audit-lead) só escrevem dentro de `audit/runs/<AUDIT_ID>/`, nunca no objeto auditado | `audit/framework/AUDIT_PROCESS.md` §5 |
| Execução real (Bash/psql/npm) | Nenhum dos 69 agentes de VeriCore tem Bash por padrão — evidência que exige execução (contagem real de banco, `npm audit`, rodar suíte) é coletada pelo orquestrador humano/sessão e entregue como evidência de terceiro, citada como tal | ver achado de processo em `AUD-2026-08-ERP-EVOK-FULL` |

**Lição já aprendida e vinculante (2026-08-12):** uma regra de `deny` em
`settings.local.json` vale para a SESSÃO inteira, não só para o agente que a motivou.
Adicionar `Write(./server/src/**)` ao deny pensando em restringir só os auditores
bloqueou também os agentes de OpusCore de escrever código de verdade. Regra: antes de
adicionar uma restrição pensando em "isolar a organização X", confirmar que ela não
bloqueia as outras duas organizações que compartilham a mesma sessão/repositório.

## 12. Handoffs

Todo handoff entre organizações passa por um artefato **escrito e versionado**, nunca só
por mensagem efêmera de chat:

- OpusCore → VeriCore: implementação mergeada + PR/commit hash (o que a auditoria vai
  escanear).
- VeriCore → SanaCore: Remediation Backlog aprovado (não o finding bruto — ver §8.1).
- SanaCore → VeriCore: item em `docs/control-plane/tasks/` com `status: in_review` e
  `proximo_responsavel` apontando para o auditor de reteste.
- Qualquer organização → Humano: gate explícito, nunca assumido como aprovado por
  omissão (ver Emenda 0 do princípio geral do Claude Code: "nunca simular aprovação
  humana").

## 13. State Machine (ciclo de vida de um Finding)

```
        ┌──────────┐
        │   OPEN    │  (criado pelo agente de VeriCore no fieldwork)
        └────┬─────┘
             │ finding-validator tenta refutar
             ▼
    ┌────────┴────────┐
    │                 │
CONFIRMED          REFUTED  ──► CLOSED (sem remediação necessária,
    │                             com justificativa registrada)
    ▼
┌───────────────┐
│  CONSOLIDATED  │  (audit-consolidator dedup/agrupa entre trilhas)
└───────┬────────┘
        ▼
┌────────────────┐
│ IN_BACKLOG      │  (audit-reporting-agent inclui no Remediation Backlog)
└───────┬─────────┘
        │ GATE HUMANO — aprovação do relatório
        ▼
┌────────────────┐
│ IN_REMEDIATION  │  (SanaCore — ou OpusCore no papel de SanaCore, §8.4 —
└───────┬─────────┘   trabalha em worktree isolado, §8.3)
        ▼
┌────────────────┐
│ RETEST_PENDING  │  (handoff via Control Plane, §12)
└───────┬─────────┘
        │
    ┌───┴───┐
    ▼       ▼
RETEST     RETEST
PASSED     FAILED ──► volta para IN_REMEDIATION (reaberto, nota de causa)
    │
    │ GATE HUMANO — só humano autorizado
    ▼
┌────────────────┐
│ CLOSED          │  ou  │ RISK_ACCEPTED │ (decisão humana explícita,
└────────────────┘        └───────────────┘  nunca atribuída por agente)
```

Nenhuma transição pula uma seta acima silenciosamente. Um finding que aparenta ter
"sumido" sem passar por `CLOSED`/`RISK_ACCEPTED` é, em si, uma falha de processo a
reportar.

## 14. Emendas

Toda mudança de **princípio** (não de detalhe operacional — adicionar um agente novo a
uma organização, por exemplo, não é emenda) exige:

1. Proposta explícita, por escrito, do que muda e por quê.
2. Aprovação humana explícita e registrada (nesta seção, com data).
3. Nunca retroativa — uma emenda vale a partir de quando é aprovada, não reescreve o
   histórico de auditorias/remediação já fechadas sob o princípio anterior.

| # | Data | Mudança | Aprovado por |
|---|---|---|---|
| — | — | Nenhuma emenda registrada ainda. Este documento está na sua versão fundadora. | — |
