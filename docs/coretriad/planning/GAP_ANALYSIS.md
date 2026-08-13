# GAP_ANALYSIS.md — CoreTriad Bootstrap, Etapa 2

**Status:** Análise, nenhuma ação executada. Não reorganiza, exclui ou renomeia nada.
**Insumo:** `CURRENT_AGENT_INVENTORY.md` (mesma pasta), estado real do repositório em
2026-08-12 (commit `8dd87c0`).

---

## 1. Agentes faltantes

| Gap | Descrição | Severidade |
|---|---|---|
| **SanaCore não tem nenhum agente próprio** | `remediation/` existe só como pasta placeholder (README "Reservado"). Todo trabalho de remediação hoje é feito por agentes de OpusCore agindo no papel de SanaCore (já registrado como limitação explícita em `CORETRIAD_MASTER_SPEC.md` §8.4). | **CRÍTICO** — é o maior buraco estrutural do CoreTriad hoje; sem isso, a regra "SanaCore corrige, mas nunca fecha" não tem um agente dedicado para testar de verdade (ver Teste B do plano de implantação). |
| **`audit-verification-runner` não existe** | O próprio README do VeriCore já previa essa lacuna: nenhum dos 69 agentes de auditoria tem Bash/execução. Toda evidência que exige rodar comando (contagem real de banco, `npm audit`, rodar suíte) precisa ser coletada manualmente pelo orquestrador humano/sessão a cada auditoria — já aconteceu 3 vezes na primeira auditoria real (`AUD-2026-08-ERP-EVOK-FULL`). | **ALTO** — gargalo recorrente, não pontual. |
| **Nenhum agente de "onboarding de sistema existente"** | O plano de implantação prevê `/coretriad-onboard` (passo 25) para registrar o ERP já existente como primeiro produto operado — esse comando/skill ainda não foi criado. | MÉDIO — necessário antes de operar o ERP real via CoreTriad. |
| **Nenhum agente/skill `/coretriad-idea`** | Citado no plano de implantação (passo 20) para abrir o ciclo completo num produto novo (ex.: SIM-001) — ainda não existe. | MÉDIO — bloqueia a simulação de dry-run antes do ERP real. |

## 2. Agentes redundantes / sobreposição de mandato

| Sobreposição | Agentes envolvidos | Observação |
|---|---|---|
| **3 auditores de arquitetura com granularidade diferente** | `architecture-auditor` (geral), `domain-architecture-auditor` (fronteiras DDD), `mvc-architecture-auditor` (camadas presentation) | Não é redundância pura — cada um tem escopo diferente — mas o `AGENT_ASSIGNMENT.md` da primeira auditoria real já precisou explicar a diferença manualmente. Vale documentar a distinção uma vez em `AUTHORITY_MATRIX.md`/knowledge base do VeriCore, para não reexplicar a cada auditoria. |
| **Dois pares leitura/execução em Qualidade** | `test-coverage-auditor` e `test-architecture-auditor` — ambos citam a mesma limitação (precisam rodar a suíte) e ambos investigaram, na auditoria real, a mesma divergência de contagem de teste. | Risco de finding duplicado entre os dois se não coordenados — o próprio `AGENT_ASSIGNMENT.md` já registrou essa dependência de coordenação. |
| **`documentation-audit-lead` coordena 8 auditores de documentação** | Nenhuma redundância de mandato, mas é o agente com MAIOR número de subordinados diretos (8) — se a auditoria crescer, esse pode virar gargalo de coordenação. | Observação para `AUTHORITY_MATRIX.md`. |

## 3. Sobreposição de autoridade

| Item | Descrição |
|---|---|
| **`admin` (role legado do ERP) vs. papéis do CoreTriad** | O ERP tem um role `admin` que historicamente tinha bypass de RBAC. A regra D-K (segregação de função de compras) já precisou tratar isso explicitamente ("sem exceção para admin"). O CoreTriad precisa da mesma disciplina: nenhum papel de organização (OpusCore/VeriCore/SanaCore) deve ganhar bypass geral só por rodar como sessão "admin" do Claude Code. |
| **Orquestrador (sessão principal) acumula papel de fato** | Hoje a sessão principal decide quando delegar, corrige achados fabricados (ver `SCOPE.md` da primeira auditoria), e também executa comandos que os agentes de auditoria não podem (Bash). Isso concentra autoridade de fato na sessão principal, que não é formalmente nenhuma das 3 organizações — é preciso deixar isso explícito na `AUTHORITY_MATRIX.md` como um papel próprio ("Orquestrador/Control Plane operator"), não fingir que é neutro. |

## 4. Responsabilidades sem owner claro

| Responsabilidade | Situação atual |
|---|---|
| **Correção do achado de calibração (contexto injetado × disco)** | Identificado 3 vezes na mesma auditoria (Scope, Inventory, Plan). Ninguém "dono" desse problema — é uma característica da plataforma (harness injeta snapshot de CLAUDE.md), não um bug de um agente específico. Fica sem responsável claro até que o Control Plane defina quem monitora isso (candidato: `documentation-consistency-auditor`, mas ele é VeriCore, então só DETECTA, não corrige o mecanismo). |
| **Decisão sobre migrations planejadas obsoletas do MRP** | Já registrado no ERP_SSOT como "decisão de processo, não de código" pendente do dono do produto — não é gap do CoreTriad, mas fica sem dono formal dentro da nova estrutura (nem OpusCore nem VeriCore decidem isso sozinhos; é Classe C, decisão humana). |
| **Manutenção do `.codex/agents/*.toml`** | 21 arquivos Codex espelhando o roster ANTIGO (pré-CoreTriad) de agentes. Ninguém está atualizando-os para refletir os 91 agentes atuais — ver §6. |

## 5. Falhas de segregação

| Falha | Descrição | Severidade |
|---|---|---|
| **Isolamento de escrita por organização não é reforçado por ferramenta** | `tools:` no frontmatter restringe por NOME de ferramenta (ex.: VeriCore não tem Write/Edit) — isso é real e funciona. Mas não há restrição por CAMINHO: um agente de OpusCore com Write pode, tecnicamente, escrever dentro de `audit/runs/**` ou `remediation/**` sem nenhum bloqueio automático. Isso só é impedido hoje por "Não pode" escrito no arquivo do agente — documentação de intenção, não controle técnico. | **CRÍTICO** — é exatamente o que os Testes B/C do plano de implantação (passo 17) vão expor. Requer `PERMISSION_MODEL.md` + hooks (ver §10). |
| **`.claude/settings.local.json` é sessão inteira, não por organização** | Já provado na prática hoje: uma regra de `deny` pensada só para VeriCore bloqueou também OpusCore. Esse mecanismo não pode ser usado para isolar organizações sem cuidado extra. | **ALTO**, já mitigado uma vez manualmente, mas o risco estrutural continua. |
| **SanaCore rodando "dentro" de OpusCore (§8.4 do Master Spec)** | Enquanto SanaCore não tiver agentes próprios, a segregação remediação↔implementação original é feita pelo MESMO conjunto de agentes (OpusCore), só que em papéis diferentes — reduz a força real da segregação até que agentes de SanaCore existam. | ALTO, já documentado como limitação conhecida. |

## 6. Ausência de documentação

| Item | Situação |
|---|---|
| `.codex/agents/*.toml` (21 arquivos) | Descrevem o roster ANTIGO (AdmDBA, ArquitetoSoftwareAPI, ProgramadorFonteEnd, etc.), sem qualquer nota de que foram substituídos pelo CoreTriad em 2026-08-12. Um usuário do Codex CLI veria um roster desatualizado sem aviso. |
| Nenhum guia de "como um humano decide entre chamar OpusCore vs. VeriCore vs. SanaCore diretamente" | O `CORETRIAD_MASTER_SPEC.md` documenta o fluxo entre organizações, mas não há um guia rápido de "quando usar `/coretriad-idea` vs. chamar um agente específico direto". |

## 7. Ausência de workflows

| Item | Situação |
|---|---|
| `/coretriad-idea` | Citado no plano de implantação, não implementado. |
| `/coretriad-onboard` | Citado no plano de implantação, não implementado. |
| `/veri-retest` | Citado no plano de implantação (passo 24) como forma de acionar reteste independente — ainda não existe como comando formal (hoje se faz descrevendo a instrução por extenso). |
| Workflow de "delta audit" (Regra 13 do CLAUDE.md) | O princípio ("alterações posteriores ao AUDIT_COMMIT exigem delta audit ou nova auditoria") existe como regra, mas não há um comando/skill que formalize ESSE fluxo especificamente — hoje dependeria de nova instrução manual ao `software-audit-director`. |

## 8. Ausência de gates

Os gates humanos já existem e são respeitados no processo de auditoria (aprovação de escopo, aprovação de findings críticos, aprovação de relatório, `RISK_ACCEPTED`). O que falta:

- **Gate de aprovação para materializar novos agentes de SanaCore** — quando forem criados, quem aprova o mandato deles? Não definido ainda.
- **Gate de aprovação para mudar a Constituição (`CORETRIAD_MASTER_SPEC.md`)** — já existe (seção 14, Emendas), mas nunca foi exercitado; vale testar o processo com uma emenda real de baixo risco antes de precisar dele sob pressão.

## 9. Ausência de permissões (ver também `PERMISSION_MODEL.md`)

- Nenhum hook configurado (`.claude/settings.local.json` não tem seção `hooks`) — todo controle hoje é `allow`/`deny` global de sessão + `tools:` por agente. Não há enforcement automático de "SanaCore só escreve em `remediation/`+worktree" ou "OpusCore não escreve em `audit/`".
- Ver `AUTHORITY_MATRIX.md` e `PERMISSION_MODEL.md` para o desenho recomendado (ainda não implementado — implementação é fase posterior do plano).

---

## Resumo executivo

O maior risco estrutural agora é **SanaCore sem agentes próprios** combinado com **isolamento de escrita não reforçado por hook** — juntos, esses dois gaps significam que a segregação Construir↔Auditar↔Remediar↔Retestar hoje depende mais de disciplina documental do que de controle técnico. Isso não invalida o trabalho já feito (a auditoria real de hoje seguiu a disciplina corretamente), mas é o que precisa ser resolvido antes de confiar o CoreTriad a um fluxo sem supervisão humana próxima.
