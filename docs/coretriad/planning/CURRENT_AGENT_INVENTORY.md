# CURRENT_AGENT_INVENTORY.md — Etapa 1

**Status:** Inventário completo dos 91 agentes reais (`.claude/agents/`), lido arquivo por
arquivo (não por descrição de frontmatter isolada). Nenhum agente foi movido, renomeado,
mesclado ou excluído para produzir este documento.

**Método:** 3 agentes de leitura (`Explore`) dedicados — um para os 22 de OpusCore, dois
para os 69 de VeriCore em lotes — leram cada `.md` integralmente. `TARGET_COMPANY` e a
coluna `DISPOSITION` (KEEP/MODIFY/MERGE/DEPRECATE) foram atribuídos por mim depois, com
base no que os 3 agentes reportaram — nenhum deles decide disposição sozinho.

**Escopo de MCP, hooks, hardware:** não há MCP configurado neste repositório, não há
`hooks` em `.claude/settings.local.json`, não há worktree ativo além do principal (ver
`git worktree list` → só `C:/Sistema EvokAudio/ERP-Evok--Audio-LTDA [main]`). Há uma
branch pré-existente `remediation/production-readiness` (local e remota) que antecede o
CoreTriad — ver observação em `WORKTREE_MODEL.md`.

**Codex (`.codex/agents/*.toml`, 21 arquivos):** espelham o roster ANTIGO (pré-CoreTriad,
2026-08-05: AdmDBA, AnalistaNegocios, ArquitetoSoftwareAPI, Programador, PromadorFonteEnd,
webdesiner, especialistas de RH/SST/TI/Jurídico/Facilities/Marketing, etc.) — não foram
atualizados para os 91 agentes atuais. Ver `GAP_ANALYSIS.md` §6.

---

## Parte A — OpusCore (22 agentes, `.claude/agents/Centro Autônomo de Engenharia de Software/`)

DISPOSITION de todos os 22: **KEEP** — nenhuma redundância encontrada dentro de OpusCore.

| CURRENT_NAME | CURRENT_PATH (relativo a `.claude/agents/Centro Autônomo de Engenharia de Software/`) | CURRENT_ROLE | MISSION | CAPABILITIES | TOOLS | PERMISSIONS (resumo) | DEPENDENCIES | TARGET_COMPANY | TARGET_ROLE | MISSING_CAPABILITIES |
|---|---|---|---|---|---|---|---|---|---|---|
| product-manager | produto/product-manager.md | Produto | Transformar problema de negócio em definição de produto clara, testável e priorizável | Product Vision, Business Case, PRD; personas/jornada/KPIs; roadmap inicial; AC em nível de produto | Read, Grep, Glob, Write | Pode pedir info, propor escopo; não pode definir arquitetura, aprovar PRD sozinho, comprometer prazo/orçamento | humano (aprovação PRD), BA/UX (insumos) | OpusCore | Produto | Priorização de portfólio entre produtos concorrentes não coberta por nenhum agente |
| business-analyst | produto/business-analyst.md | Produto | Investigar e documentar processo de negócio, regras e exceções em profundidade | Mapeamento AS-IS; regras/exceções não ditas; RF/UC/AC; data dictionary | Read, Grep, Glob, Write | Pode questionar premissas; não pode inventar regra não confirmada nem mudar prioridade do PM | Product Manager (prioridade), especialista de domínio | OpusCore | Produto | Não valida regra contra implementação real de sistema legado |
| ux-researcher | produto/ux-researcher.md | Produto | Gerar evidência sobre necessidade/comportamento/dificuldade real do usuário | Análise de jornada/fricção; hipóteses testáveis; síntese de pesquisa | Read, Grep, Glob, Write | Pode propor hipótese; não pode produzir interface final nem validar hipótese sem evidência | BA (process maps), destino: PM/Designer | OpusCore | Produto | Sem acesso a ferramenta real de analytics/gravação de sessão |
| product-designer | produto/product-designer.md | Produto | Traduzir requisitos/jornada em fluxo de interface claro, consistente, acessível | IA e user flow; wireframes/protótipos; design system/acessibilidade | Read, Write, Grep, Glob | Pode propor variação de fluxo; não pode definir modelo de dados/API/autorização | BA (regras), UX (insights), Eng. (contrato de API) | OpusCore | Produto | Sem loop de validação de usabilidade pós-entrega com usuário real |
| software-architect | arquitetura/software-architect.md | Arquitetura | Definir e proteger a arquitetura técnica da solução | Componentes/boundaries/integração/modelo de dados; ADRs; revisão de decisões existentes | Read, Grep, Glob, Write, Bash | Pode rejeitar solução inadequada; não pode mudar requisito de negócio nem deploy em produção | PM/BA (requisitos), Security Architect | OpusCore | Arquitetura | Sem rastreamento formal de ADRs obsoletos/débito arquitetural acumulado |
| security-architect | arquitetura/security-architect.md | Arquitetura | Garantir riscos de segurança identificados/mitigados no desenho, antes do código | Threat model/trust boundaries; requisitos authN/authZ/criptografia; classificação de dados | Read, Grep, Glob, Write | Pode bloquear design com risco crítico; não pode aprovar exceção sozinho nem acessar segredos | Software Architect, humano (gate crítico) | OpusCore | Arquitetura | Não cobre revisão de código já escrito (isso é do AppSec) nem monitoramento de risco aceito ao longo do tempo |
| tech-lead | engenharia/tech-lead.md | Engenharia | Transformar arquitetura aprovada em plano de execução técnica confiável | Quebra de epics/stories; distribuição de tarefas; critério de aceite técnico; revisão pré-QA | Read, Write, Edit, Bash, Grep, Glob | Pode reordenar tarefas; não pode mudar arquitetura transversal nem aprovar release sozinho | Software Architect, PM, humano | OpusCore | Engenharia | Sem gestão de capacidade entre múltiplas squads simultâneas |
| backend-engineer | engenharia/backend-engineer.md | Engenharia | Implementar corretamente uma tarefa técnica de backend dentro da arquitetura aprovada | APIs/regras de negócio/transações/integrações; migrations; testes automatizados | Read, Write, Edit, Bash, Grep, Glob | Pode ajuste local; não pode implementar fora do escopo nem mergear o próprio PR | Tech Lead, Architect, Code Reviewer/QA | OpusCore | Engenharia | Performance tuning avançado/versionamento de API não explícitos |
| frontend-engineer | engenharia/frontend-engineer.md | Engenharia | Implementar interface funcional, acessível e consistente com design e contrato de API | Componentes/formulários/validação/integração; acessibilidade/responsividade; testes de componente | Read, Write, Edit, Bash, Grep, Glob | Pode ajuste sem alterar UX aprovado; não pode alterar regra de negócio/contrato de API sozinho | Product Designer, Backend Engineer | OpusCore | Engenharia | Performance de frontend em escala não é métrica de conclusão explícita |
| data-engineer | engenharia/data-engineer.md | Engenharia | Garantir dados confiáveis, rastreáveis e disponíveis para produto/analytics/IA | ETL/ELT; modelos analíticos/catálogo/linhagem; checks de qualidade de dados | Read, Write, Edit, Bash, Grep, Glob | Pode propor modelo analítico; não pode alterar esquema transacional sozinho nem expor dado sensível sem Security Architect | Backend/Architect (esquema), Security Architect | OpusCore | Engenharia | Governança de retenção/expurgo de dados (LGPD) não tratada |
| ai-llm-engineer | engenharia/ai-llm-engineer.md | Engenharia | Implementar e avaliar responsavelmente a camada de IA do produto | RAG/agentes/embeddings; evals de qualidade/segurança/regressão; custo/latência/alucinação; guardrails | Read, Write, Edit, Bash, Grep, Glob | Pode recomendar não lançar; não pode lançar sem eval de segurança/aprovação humana | Security Architect, PM, humano | OpusCore | Engenharia | Monitoramento contínuo de drift pós-lançamento não explícito |
| code-reviewer | qualidade/code-reviewer.md | Qualidade | Garantir qualidade/consistência de código antes do merge, independente do autor | Arquitetura local/qualidade/complexidade/duplicação; cobertura de teste; dívida técnica | Read, Grep, Glob | Somente leitura; não pode aprovar PR próprio ou de tarefa em que atuou | Tech Lead (dívida sistêmica), QA/Security | OpusCore | Qualidade | Não cobre revisão de segurança (AppSec) nem profiling de performance real |
| qa-engineer | qualidade/qa-engineer.md | Qualidade | Validar de forma independente se a implementação atende ao pedido, tentando quebrá-la | Test strategy/casos de teste/regressão/edge cases; E2E de fluxos críticos; testes negativos | Read, Write, Edit, Bash, Grep, Glob | Pode reprovar mesmo com CI verde; não pode corrigir código nem aprovar própria implementação | Backend/Frontend Engineer, Security Architect/AppSec | OpusCore | Qualidade | Testes de carga/acessibilidade automatizados não cobertos explicitamente |
| sdet-test-automation | qualidade/sdet-test-automation.md | Qualidade | Construir/manter a infraestrutura de automação de teste usada por toda a engenharia | Frameworks unit/integration/E2E; testes de performance na pipeline; redução de flakiness | Read, Write, Edit, Bash, Grep, Glob | Pode padronizar ferramentas; não pode decidir critério de aceite funcional nem desabilitar teste sem aprovação | QA Engineer, Tech Lead/Platform Engineer | OpusCore | Qualidade | Ownership de SAST/DAST na pipeline não claramente definido (pode faltar/sobrepor com AppSec) |
| appsec-engineer | seguranca/appsec-engineer.md | Segurança | Identificar/reportar vulnerabilidades no código e nas dependências | Dependências/segredos expostos/injeção/XSS-CSRF/broken access control; SAST/secret scan/dependency scan | Read, Grep, Glob, Bash, Write | Pode bloquear merge com CRITICAL; não pode aprovar exceção crítica sozinho nem manipular segredos | Security Architect, Dependency Agent, humano | OpusCore | Segurança | Único agente de segurança de código — sem segunda linha para pentest ofensivo/red team |
| platform-engineer | plataforma/platform-engineer.md | Plataforma | Reduzir carga cognitiva das squads com capacidades de plataforma padronizadas self-service | Templates de serviço/CI padrão/service catalog; padronização de observabilidade/secrets/IaC | Read, Write, Edit, Bash, Grep, Glob | Pode evoluir golden paths; não pode alterar config de produção fora do fluxo de release | Tech Lead (revisão), humano (mudança de amplo impacto) | OpusCore | Plataforma | Sem métrica de adoção/DX dos golden paths |
| devops-engineer | plataforma/devops-engineer.md | Plataforma | Manter o caminho do commit à produção confiável, automatizado e reversível | CI/CD/build/ambientes; IaC/rollback; integração segura de secrets | Read, Write, Edit, Bash, Grep, Glob | Autonomia alta em DEV/controlada em STAGING; não pode fazer deploy em produção sem aprovação humana | Release Agent, SRE, humano | OpusCore | Plataforma | Custo de infra (delegado a FinOps) e disaster recovery cross-region não cobertos |
| sre-engineer | operacao/sre-engineer.md | Operação | Manter confiabilidade em produção e diagnosticar incidentes com evidência | SLIs/SLOs/error budget; investigação de incidente; runbooks/postmortems | Read, Grep, Glob, Bash, Write | Pode executar runbook aprovado; não pode ação destrutiva sem aprovação humana | DevOps Engineer, humano | OpusCore | Operação | Capacity planning proativo e chaos engineering não cobertos |
| documentation-agent | transversais/documentation-agent.md | Transversal | Manter documentação técnica como fonte de verdade confiável e atualizada | README/changelog/API docs/runbooks; reflexo de ADRs; sinalização de doc órfã | Read, Write, Edit, Grep, Glob | Pode reescrever para clareza; não pode inventar comportamento nem alterar ADR sem sinalizar | PRs, ADRs, Release Notes | OpusCore | Transversal | Não cobre manual do usuário final, só documentação técnica |
| release-agent | transversais/release-agent.md | Transversal | Garantir que cada release tenha evidência de qualidade, plano de reversão e comunicação clara | Release notes a partir de PRs; checklist de release readiness; coordenação de timing | Read, Write, Grep, Glob, Bash | Pode bloquear avanço por checklist incompleto; não pode aprovar release em produção (gate humano sempre) | DevOps/SRE (timing), QA/Security (status), humano | OpusCore | Transversal | Sem papel de comunicação pós-release a usuários finais/suporte |
| dependency-agent | transversais/dependency-agent.md | Transversal | Garantir que dependências sejam seguras, licenciadas corretamente e mantidas | Origem/licença/vulnerabilidade de nova dependência; monitoramento contínuo | Read, Grep, Glob, Bash, Write | Pode bloquear dependência com CRITICAL; não pode aprovar licença incompatível sozinho | AppSec (vulnerabilidades), jurídico/humano (licenças) | OpusCore | Transversal | Sem gestão de SBOM formal |
| finops-agent | transversais/finops-agent.md | Transversal | Tornar custo de cloud e IA visível e atribuível para apoiar decisões técnicas/produto | Estimativa de custo infra/IA; custo real vs. estimado; identificação de desperdício | Read, Grep, Glob, Write, Bash | Pode recomendar não seguir arquitetura cara; não pode vetar arquitetura tecnicamente | Software Architect, PM/humano (orçamento) | OpusCore | Transversal | Sem mandato para negociar contrato/desconto com provedor de cloud |

---

## Parte B — VeriCore (69 agentes, `.claude/agents/Centro Autônomo de Engenharia de Software auditoria/`)

Padrão comum a TODOS os 69 (não repetido linha a linha): regra de trabalho fixa
`READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT` (nunca modifica o objeto
auditado); finding no formato `AUD-<DOMINIO>-<NUMERO>` via `FINDING_TEMPLATE.md`;
severidade (CRITICAL/HIGH/MEDIUM/LOW/INFO) separada de confiança
(CONFIRMED/HIGH/MEDIUM/LOW); escalonamento imediato ao `software-audit-director` +
humano para CRITICAL/fraude/vazamento/comprometimento. **62 dos 69 agentes têm só
`Read, Grep, Glob`** (sem execução/rede) — os 7 com `Write` adicional são os únicos que
persistem artefato de auditoria: `software-audit-director`, `audit-scope-agent`,
`audit-planning-agent`, `audit-reporting-agent`, `audit-consolidator`,
`audit-evidence-controller`, `finding-validator`, `documentation-audit-lead` e
`traceability-auditor` (9, não 7 — corrigido na contagem final abaixo).

**Lacuna transversal encontrada nos dois lotes de leitura, independentemente:** vários
agentes têm mandato de "provar"/"testar" comportamento dinâmico (autorização testando
manipulação de IDs, condição de corrida, reenvio de webhook) mas o toolset é
exclusivamente estático (`Read, Grep, Glob`) — sem ferramenta de execução/rede. Isso é
o mesmo achado já vivido na prática na auditoria real de hoje (`AUD-2026-08-ERP-EVOK-FULL`):
o orquestrador precisou coletar evidência de execução manualmente. Ver `GAP_ANALYSIS.md` §1
(`audit-verification-runner`).

DISPOSITION: **KEEP** para todos, exceto os marcados **MODIFY** na última coluna —
nenhum é candidato a MERGE ou DEPRECATE (nenhuma redundância é 100% sobreposta; todas
as sobreposições encontradas são de fronteira de escopo, não de mandato duplicado).

### B.1 — Trilha Produto e Negócio

| CURRENT_NAME | CURRENT_ROLE | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | TARGET_COMPANY | DISPOSITION |
|---|---|---|---|---|---|---|---|
| product-auditor | Produto/Negócio | Garantir fonte de verdade sobre o que o produto deveria ser | Vision/Brief com owner; KPIs mensuráveis; stakeholders identificados | Read, Grep, Glob | requirements-auditor (consome saída) | VeriCore | KEEP |
| requirements-auditor | Produto/Negócio | Provar cadeia Processo→Regra→Requisito→UC→Código→Teste | REQ-ID de origem; clareza/testabilidade; evidência de validação de NFR; detecção de requisito "fantasma" | Read, Grep, Glob | traceability-auditor, business-rule-auditor, use-case-auditor | VeriCore | KEEP |
| business-rule-auditor | Produto/Negócio | Provar que "o que a empresa decidiu" e "o que o código faz" são a mesma coisa | Valor/limite documentado vs. implementado; BR-ID rastreável; teste por regra crítica; exceções à regra | Read, Grep, Glob | requirements-auditor/traceability-auditor | VeriCore | KEEP |
| use-case-auditor | Produto/Negócio | Provar que sistema trata fluxo principal, alternativos, exceções e permissões | Campos mínimos do UC; fluxos alternativos implementados; permissão do UC no backend (não só UI) | Read, Grep, Glob | authorization-auditor (sobreposição de permissão) | VeriCore | **MODIFY** — delimitar com authorization-auditor quem audita permissão de UC |
| acceptance-criteria-auditor | Produto/Negócio | Impedir que critério de aceite vago passe como verificável | AC objetivo/testável; vínculo a REQ/UC; teste automatizado; cenário de erro coberto | Read, Grep, Glob | finding-validator | VeriCore | KEEP |
| business-process-auditor | Produto/Negócio | Detectar processo que existe só no papel ou implementado diferente do desenhado | BPMN vs. estados reais; transições permitidas vs. implementadas; quem executa cada transição | Read, Grep, Glob | business-rule-auditor, domain-logic-auditor (sobreposição) | VeriCore | **MODIFY** — sobreposição de máquina de estados com domain-logic-auditor |
| domain-logic-auditor | Produto/Negócio + Engenharia (dupla alocação) | Perguntar se sequência de estados/permissões de entidades críticas faz sentido para o negócio | Validade de transições vs. processo; via alternativa de contornar regra; pré/pós-condições | Read, Grep, Glob | business-process-auditor (mesmo tema, ângulo diferente) | VeriCore | **MODIFY** — mesma sobreposição acima, ver AGENT_ASSIGNMENT.md real que já resolveu isso alocando ambos juntos numa auditoria |
| traceability-auditor | Produto/Negócio (governança de dados) | Ser guardião da cadeia de rastreabilidade fim a fim | Rastreabilidade bidirecional BR/REQ/UC↔implementação; teste em cada elo; detecção de implementação divergente | Read, Grep, Glob, **Write** | Recebe insumo de todos os outros auditores | VeriCore | KEEP — mas sem mecanismo de detectar agente que não reportou (ver MISSING_CAPABILITIES) |

### B.2 — Trilha Documentação

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| documentation-audit-lead | Coordenar a trilha documental completa e consolidar veredito de saúde documental | Cobertura dos 14 grupos; owner/versão/data por doc; doc como fonte de verdade ou obsoleta | Read, Grep, Glob, **Write** | Agrega os 7 abaixo | KEEP — "lead" sem mecanismo formal de orquestração além de agregar |
| documentation-consistency-auditor | Encontrar contradição entre fontes de verdade, não avaliar cada uma isolada | Doc×Doc, Doc×código, Doc×banco, Doc×teste | Read, Grep, Glob | Todos os documentos/código/schema/testes | KEEP — escopo muito amplo, sem priorização de pares (achado real: foi este tipo de agente que já resolveu o achado de calibração hoje) |
| architecture-documentation-auditor | Garantir decisão/estrutura arquitetural registrada e rastreável | Diagramas C4/deployment proporcionais; ADR completo; sequence diagrams; diagrama vs. real | Read, Grep, Glob | architecture-auditor | KEEP |
| data-documentation-auditor | Garantir que ninguém precise ler código para entender o banco | ERD atualizado; dicionário de dados; campos sensíveis classificados | Read, Grep, Glob | database-auditor | KEEP |
| security-documentation-auditor | Garantir que decisão de segurança esteja documentada, não implícita | Threat model de módulos críticos; matriz de permissão documentada vs. real; classificação de dados | Read, Grep, Glob | authorization-auditor, appsec-auditor | KEEP |
| api-documentation-auditor | Garantir que doc de API seja contrato confiável | Doc de auth/authz por endpoint; exemplos batendo com real; idempotência/rate limit documentados | Read, Grep, Glob | api-auditor | KEEP |
| operations-documentation-auditor | Garantir runbook usável numa emergência real | Runbook por modo de falha; rollback testado; backup/restore documentado | Read, Grep, Glob | backup-recovery-auditor | KEEP |
| test-documentation-auditor | Garantir estratégia de qualidade explícita, não só o que os testes cobriram | Test Strategy documentada; TC-ID vinculado a UC/BR/REQ; escopo de regressão definido | Read, Grep, Glob | regression-auditor, traceability-auditor | KEEP |

### B.3 — Trilha Arquitetura

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| architecture-auditor | Avaliar arquitetura como um todo, além do MVC | Boundaries entre módulos; dependência circular; ownership de dados; consistência de erro/observabilidade | Read, Grep, Glob | dependency-architecture-auditor (sobreposição) | **MODIFY** |
| domain-architecture-auditor | Garantir invariante de domínio protegida na camada certa, não espalhada | Invariante garantida pelo objeto de domínio ou por disciplina externa; duplicação de lógica de domínio | Read, Grep, Glob | domain-logic-auditor (sobreposição) | **MODIFY** |
| mvc-architecture-auditor | Provar com arquivo/linha quando responsabilidade está na camada errada | Regra de negócio em Controller/Repository; acesso direto a banco fora do repository; ordem de middleware | Read, Grep, Glob | controller-auditor, repository-layer-auditor, service-layer-auditor (sobreposição tríplice) | **MODIFY** |
| dependency-architecture-auditor | Tornar visível o grafo real de dependências internas | Dependência circular entre módulos; violação de camada (UI→infra direto) | Read, Grep, Glob | architecture-auditor (escopo quase idêntico) | **MODIFY** |
| integration-architecture-auditor | Avaliar se desenho de integração (síncrono/fila/batch) é adequado ao caso de uso | Escolha sync/async documentada em ADR e adequada à criticidade; ponto único de falha | Read, Grep, Glob | integration-auditor (complementar, runtime vs. desenho) | KEEP — complementaridade já explícita no próprio agente |

### B.4 — Trilha Engenharia

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| backend-auditor | Avaliar qualidade geral do código backend além das violações estruturais já cobertas | Complexidade/duplicação/tratamento de erro; aderência a padrões do repo | Read, Grep, Glob | controller/service/repository-layer-auditor (evita sobrepor) | KEEP |
| frontend-auditor | Provar que decisão de segurança visível só na UI também é aplicada no backend | Regra de negócio só no frontend; proteção server-side de tela escondida; dado sensível na resposta de API | Read, Grep, Glob | authorization-auditor (cruzamento explícito) | KEEP |
| fullstack-auditor | Verificar fluxo consistente do clique até a persistência | Dado exibido = persistido; estado inconsistente após falha intermediária | Read, Grep, Glob | frontend/backend/database-auditor | KEEP |
| controller-auditor | Auditar camada de entrada, onde a maioria dos controles deveria estar | Auth/authz por action; mass assignment; erro sem vazar detalhe; delega regra de negócio | Read, Grep, Glob | authorization-auditor, service-layer-auditor, api-auditor (sobreposição) | **MODIFY** |
| service-layer-auditor | Garantir que camada de serviço concentre corretamente a regra de negócio | Lógica centralizada na service layer; atomicidade de transação | Read, Grep, Glob | mvc/repository-layer-auditor (sobreposição) | **MODIFY** |
| repository-layer-auditor | Garantir que persistência não esconda regra de negócio nem risco de segurança/performance | Regra de negócio dentro de repository; injection/N+1 em query | Read, Grep, Glob | mvc-architecture-auditor, performance-auditor, appsec-auditor | **MODIFY** |
| domain-logic-auditor | (ver B.1) | | | | **MODIFY** |
| idempotency-auditor | Responder "essa operação crítica pode rodar duas vezes por acidente?" | Chave de idempotência em operação financeira/crítica; reenvio não duplica efeito | Read, Grep, Glob | integration-auditor, data-integrity-auditor | KEEP |
| api-auditor | Produzir matriz objetiva do estado de cada endpoint, sem amostragem | Auth/authz por endpoint; validação de entrada/saída; rate limit; teste por endpoint | Read, Grep, Glob | authorization-auditor, controller-auditor (sobreposição) | **MODIFY** |
| external-api-auditor | Verificar resiliência a mudança no lado do fornecedor externo | Tratamento de erro/mudança de contrato; versionamento explícito | Read, Grep, Glob | integration-auditor (sobreposição parcial) | KEEP |
| webhook-auditor | Tratar webhook como entrada não confiável até prova em contrário | Validação de assinatura; proteção contra replay; dead-letter | Read, Grep, Glob | idempotency-auditor, external-api-auditor, integration-auditor | KEEP |
| integration-auditor | Perguntar "se enviar duas vezes, o que acontece? Se a resposta se perder, o sistema sabe o estado real?" | Idempotência ao reenvio; distinção não-processado vs. processado-resposta-perdida; validação de schema | Read, Grep, Glob | idempotency-auditor, external-api-auditor, integration-architecture-auditor (sobreposição tríplice) | **MODIFY** |

### B.5 — Trilha Dados / Banco

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| database-auditor | Verificar se regra "garantida pelo código" está protegida no banco | PK/FK/UNIQUE/NOT NULL/CHECK correspondente; índice em query crítica; migration reversível; campo de auditoria | Read, Grep, Glob | data-integrity-auditor, migration-auditor | KEEP — provou valor real na auditoria de hoje (achou P1-07 de novo, de forma independente) |
| migration-auditor | Garantir que evoluir schema não seja risco não controlado | Rollback de migration; plano de mitigação para migration destrutiva | Read, Grep, Glob | database-auditor | KEEP |
| data-integrity-auditor | Provar cenário de concorrência que "if not exists then create" não protege sozinho | Condição de corrida entre requisições simultâneas; atomicidade real (transação/lock) | Read, Grep, Glob | database-auditor, idempotency-auditor | KEEP — mandato pede "prova" dinâmica mas toolset é só estático (ver lacuna transversal) |
| tenant-isolation-auditor | Provar que tenant A não acessa dado do tenant B via manipulação de request | tenant_id vem da sessão, não do cliente; filtro de tenant em query crítica | Read, Grep, Glob | authorization-auditor, database-auditor | KEEP — N/A para este ERP hoje (single-tenant), mantido para reuso futuro |

### B.6 — Trilha Segurança

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| appsec-auditor | Cobrir superfície geral de vulnerabilidade de aplicação (OWASP ASVS) | SQLi/XSS/CSRF/SSRF/IDOR-BOLA; upload/path traversal; criptografia; headers/CORS | Read, Grep, Glob | finding-validator | KEEP — provou valor real hoje (achou /uploads público e magic-bytes no-op) |
| authentication-auditor | Garantir que "provar quem é o usuário" seja robusto em todo ponto de entrada | Validação de token/JWT; rotação/revogação de refresh; proteção contra brute force | Read, Grep, Glob | — | KEEP |
| authorization-auditor | Provar, testando manipulação de IDs/escopos, que a permissão real bate com a declarada | Matriz Usuário→Role→Permission→Resource→Action→Scope; teste de acesso horizontal/cross-tenant | Read, Grep, Glob | frontend-auditor, tenant-isolation-auditor | KEEP — mandato pede teste dinâmico (manipular ID) mas toolset é estático; mesma lacuna transversal |
| session-security-auditor | Garantir janela de exploração mínima de sessão comprometida | Expiração/invalidação no logout; session fixation; cookies seguros | Read, Grep, Glob | authentication-auditor | KEEP |
| secrets-auditor | Encontrar credencial visível indevidamente a quem acessa repo/logs | Secret scanning em código/config/histórico de commit; exposição em log | Read, Grep, Glob | — | KEEP — regra extra: não pode reproduzir/copiar o valor do segredo no relatório |
| security-configuration-auditor | Encontrar má configuração que anula controle de segurança do código | Debug/verbose em produção; headers de segurança; CORS restrito | Read, Grep, Glob | secrets-auditor | KEEP |
| dependency-security-auditor | Garantir que cadeia de suprimentos não seja o elo mais fraco | Vulnerabilidade conhecida; dependência abandonada/licença; dependency confusion/typosquatting | Read, Grep, Glob | Feed de vulnerabilidade externo (não coberto pelo toolset) | KEEP — provou valor real hoje (rodou npm audit via evidência do orquestrador) |
| audit-log-security-auditor | Garantir que "quem mudou o quê" seja registrado e não adulterável | Log de ação crítica com usuário/timestamp/valor antigo-novo; proteção contra alteração pelo próprio autor | Read, Grep, Glob | — | KEEP |

### B.7 — Trilha Qualidade / Testes

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| qa-auditor | Questionar suficiência da suíte, não só pass/fail | Regra sem teste; teste só de caminho feliz; teste de idempotência | Read, Grep, Glob | test-coverage-auditor, sdet-auditor (sobreposição) | **MODIFY** |
| test-coverage-auditor | Provar que cobertura de linha alta não significa regra de negócio verificada | Cruza cobertura com criticidade de negócio | Read, Grep, Glob | traceability-auditor, qa-auditor (sobreposição parcial) | **MODIFY** |
| test-architecture-auditor | Avaliar se infraestrutura de teste é confiável e sustentável | Uso excessivo de mock; flakiness/isolamento; pirâmide de teste | Read, Grep, Glob | sdet-auditor (forte sobreposição) | **MODIFY** — provou valor real hoje (achou a causa raiz do timeout em cascata) |
| sdet-auditor | Auditar quem constrói a automação de teste, não só o que testar | Taxa de flaky test; teste de contrato; integração real com CI | Read, Grep, Glob | test-architecture-auditor (forte sobreposição), cicd-auditor | **MODIFY** |
| regression-auditor | Garantir que corrigir um problema não introduza outro sem detecção | Escopo de regressão mantido; bug corrigido gerou teste | Read, Grep, Glob | test-documentation-auditor | KEEP |

### B.8 — Trilha Plataforma / Operação

| CURRENT_NAME | MISSION | CAPABILITIES | TOOLS | DEPENDENCIES | DISPOSITION |
|---|---|---|---|---|---|
| devops-auditor | Verificar se caminho para produção é confiável, reversível, nunca automatizável sem aprovação | Branch protection/review obrigatório; evidência de aprovação humana para deploy; IaC versionado | Read, Grep, Glob | cicd-auditor (sobreposição) | **MODIFY** |
| cicd-auditor | Garantir que a pipeline em si não seja vetor de risco | Segredo em texto plano na pipeline; gate de segurança bypassável; artefato rastreável até commit | Read, Grep, Glob | devops-auditor (sobreposição), secrets-auditor | **MODIFY** — provou valor real hoje (achou lacuna de CI só-backend) |
| infrastructure-auditor | Verificar se IaC declarado é a infra real em execução | Drift IaC vs. real; least privilege de credencial de infra; segmentação de rede | Read, Grep, Glob | devops-auditor, cicd-auditor | KEEP — sem acesso a ambiente real (só arquivo local), ver MISSING_CAPABILITIES |
| observability-auditor | Garantir que falha em produção seja diagnosticável pela telemetria existente | Log/métrica/trace correlacionável; qualidade/fadiga de alerta; health check real | Read, Grep, Glob | sre-auditor (sobreposição) | **MODIFY** |
| performance-auditor | Apontar causa técnica raiz de performance e NFR não evidenciado | N+1/índice ausente; paginação/cache; evidência real de teste de carga | Read, Grep, Glob | requirements-auditor (NFR), repository-layer-auditor | KEEP — provou valor real hoje (achou o fan-out de JOIN em traceability) |
| resilience-auditor | Provar o que acontece quando dependência externa falha ou demora | Timeout em chamada externa; retry/circuit breaker; degradação controlada | Read, Grep, Glob | external-api-auditor, integration-auditor | KEEP |
| backup-recovery-auditor | Provar que "temos backup" significa restore testado, não job agendado | Frequência vs. RPO exigido; teste de restore e RTO conhecido | Read, Grep, Glob | operations-documentation-auditor | KEEP |
| sre-auditor | Avaliar se há confiabilidade operacional gerenciada, não só monitoramento passivo | SLO definido e monitorado; procedimento de incidente exercitado; capacidade para pico conhecido | Read, Grep, Glob | observability-auditor, operations-documentation-auditor (sobreposição) | **MODIFY** |

### B.9 — IA (condicional — nenhum alocado na primeira auditoria real, ver `SCOPE.md`)

| CURRENT_NAME | MISSION | TOOLS | DISPOSITION |
|---|---|---|---|
| ai-system-auditor | Avaliar se uso de IA tem governança proporcional ao impacto de suas decisões | Read, Grep, Glob | KEEP — condicional, sem critério objetivo documentado de quando ativar (ver MISSING_CAPABILITIES comum aos 5) |
| ai-evaluation-auditor | Garantir que qualidade de componente de IA seja medida ao longo do tempo | Read, Grep, Glob | KEEP — condicional |
| llm-security-auditor | Tratar entrada/saída do LLM como superfície de ataque não confiável | Read, Grep, Glob | KEEP — condicional |
| rag-auditor | Garantir que camada de recuperação de contexto não vaze dado indevido | Read, Grep, Glob | KEEP — condicional |
| agent-permission-auditor | Aplicar least privilege a agentes de IA como qualquer identidade com permissão | Read, Grep, Glob | KEEP — condicional; nota: este agente é o candidato natural para auditar o PRÓPRIO CoreTriad (agentes com ferramentas demais) quando ativado |

### B.10 — Governança (coordenam o processo de auditoria em si)

| CURRENT_NAME | MISSION | TOOLS | DISPOSITION |
|---|---|---|---|
| software-audit-director | Ponto de entrada de qualquer auditoria; distribui, controla cobertura, consolida | Read, Grep, Glob, **Write** | KEEP — já rodou 3 vezes hoje (Inventory, Plan) com sucesso |
| audit-scope-agent | Garantir que toda auditoria seja reproduzível (AUDIT_ID/commit/exclusões/conflito de interesse) | Read, Grep, Glob, **Write** | KEEP — cometeu o único erro real do dia (citou número de contexto injetado sem reler disco), corrigido pelo orquestrador; ver GAP_ANALYSIS |
| audit-planning-agent | Traduzir escopo em plano executável com critério de conclusão objetivo | Read, Grep, Glob, **Write** | KEEP |
| finding-validator | Advogado do diabo técnico antes de aceitar CRITICAL/HIGH | Read, Grep, Glob, **Write** | KEEP — ainda não exercitado na prática (nenhum finding chegou a essa etapa hoje) |
| audit-evidence-controller | Garantir que evidência citada exista e esteja vinculada ao FINDING_ID certo | Read, Grep, Glob, **Write** | KEEP — ainda não exercitado na prática |
| audit-consolidator | Deduplica/agrupa findings entre trilhas que tocam o mesmo módulo | Read, Grep, Glob, **Write** | KEEP — ainda não exercitado na prática |
| audit-reporting-agent | Produzir Relatório Executivo/Técnico/Remediation Backlog | Read, Grep, Glob, **Write** | KEEP — ainda não exercitado na prática |
| documentation-audit-lead | Coordenar a trilha documental completa | Read, Grep, Glob, **Write** | KEEP |
| traceability-auditor | Guardião da matriz de rastreabilidade | Read, Grep, Glob, **Write** | KEEP |

---

## Contagem final (conferida)

- OpusCore: **22** agentes, todos KEEP.
- VeriCore: **69** agentes — **9** com `Write` (governança + traceability-auditor),
  **60** só `Read, Grep, Glob`. **18** marcados **MODIFY** (delimitação de fronteira de
  escopo entre pares/trios correlatos — nenhum é MERGE nem DEPRECATE). **51** KEEP sem
  ressalva.
- SanaCore: **0** agentes (ver `GAP_ANALYSIS.md` §1 — maior gap do CoreTriad hoje).
- Total de agentes reais no CoreTriad hoje: **91**.
