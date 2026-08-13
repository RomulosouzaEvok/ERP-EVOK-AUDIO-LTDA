# AGENT_ASSIGNMENT.md — AUD-2026-08-ERP-EVOK-FULL

**Etapa:** Plan (`AUDIT_PROCESS.md` §4, item 3)
**Autor:** audit-planning-agent
**Depende de:** `RISK_CLASSIFICATION.md` (mesma pasta)
**Gate:** nenhum fieldwork começa sem aprovação humana deste plano e do escopo (`AUDIT_PROCESS.md` §4, item 3).

## Regra para todo agente alocado (repetida deliberadamente aqui)

Todo agente listado abaixo deve, no momento da sua própria verificação, **reler a
fonte primária no disco/banco/código real** — nunca citar um número ou trecho vindo
de contexto de projeto injetado (CLAUDE.md, MEMORY.md ou qualquer resumo) como se
fosse leitura atual. O `SCOPE.md` e o `SYSTEM_INVENTORY.md` desta mesma auditoria já
provaram, com dois exemplos concretos e independentes, que o contexto injetado pode
estar desatualizado em relação ao disco no exato momento da checagem (166/202/467
vs. 169/207/478; "175 modelos" vs. 186 arquivos reais). Todo finding que citar um
número ou trecho específico deve vir com evidência bruta (comando + saída) e
timestamp da checagem — sem exceção para achados que pareçam triviais.

## Exclusão confirmada

`ai-system-auditor`, `ai-evaluation-auditor`, `llm-security-auditor`, `rag-auditor`,
`agent-permission-auditor` — **não alocados**. Motivo: `SCOPE.md` confirma ausência
de componente IA/LLM/RAG em produção; a frente n8n+IA está em planejamento, fora de
escopo deste ciclo (ver `RISK_CLASSIFICATION.md`, seção "Exclusão explícita").

---

## 1. Trilha Produto e Negócio

Profundidade **Alta** nos domínios CRITICAL/HIGH da cadeia do produto; amostragem no resto.

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `business-rule-auditor` | mrp, bom, quality (gate D-L), purchases (G11 alçada/origem), financial (G13), sales (G9), production (G6) | **Full** — todas as regras de negócio remediadas em 2026-08-09/12 | Prioridade 1: são as regras remediadas no mesmo dia da auditoria; confirmar valor/limite documentado bate com o implementado (ex.: R$ 500 mil de alçada nacional) |
| `business-process-auditor` | Order-to-Cash (sales→fiscal→financial), Purchase-to-Pay (purchaseRequisitions→rfq→purchases→comex→financial), fluxo Qualidade (quality→traceability→sales) | **Full** — os 3 BPMN citados em `docs/arquitetura/DIAGRAMA_CASOS_DE_USO_BPMN.md` | Confirmar que o processo documentado bate com a sequência real de chamadas/estados, não só com o desenho |
| `product-auditor` | Visão/escopo geral do produto (CLAUDE.md como Product Brief de fato) | **Amostragem** | Já há achado de calibração conhecido (números desatualizados no contexto injetado) — não repetir, apenas confirmar existência de owner/versão/data |
| `requirements-auditor` | RF por módulo em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`, RF-PAT-05, RF-COM-12, RF-RH | **Standard**, foco em módulos CRITICAL/HIGH (directorate, quality, financial, mrp, production, rh) | Verificar rastreabilidade RF→UC→rota real |
| `acceptance-criteria-auditor` | Critérios de "pronto" citados no CLAUDE.md §4/§5 (ex. "17/17 gaps fechados", "critério de aceite = escrita real") | **Full** | Este é o ponto mais sensível a alegação otimista sem prova — CLAUDE.md admite que typecheck+unit não provam nada; confirmar se os critérios de aceite realmente aplicados batem com o que está declarado como fechado |
| `use-case-auditor` | UC-19 (COMEX), UC-30+ em `docs/business/`, casos de uso de quality/production/mrp | **Standard** | Casos de uso em draft ainda não consolidados em `04-USE_CASES.md` — checar se ficaram esquecidos ou se a implementação já avançou sem o UC formal |
| `domain-logic-auditor` *(alocado também em Engenharia, ver §3)* | Máquinas de estado: Sale (quote→confirmed→partially_invoiced→invoiced), OP (planned→released→in_progress→completed), lote (liberado→quarentena→bloqueado), pedido de compra (draft→approved→sent→partial→received) | **Full** | Foco explícito: existe forma alternativa (endpoint administrativo, rota antiga, apontamento manual) de pular uma transição protegida? O próprio CLAUDE.md cita "brecha de partida de OP por apontamento manual" fechada em 2026-08-12 — confirmar que não sobrou variante equivalente |
| `traceability-auditor` | Cadeia OBJETIVO→PROCESSO→REGRA→REQUISITO→UC→CRITÉRIO→NFR→ARQUITETURA→IMPLEMENTAÇÃO→BANCO/API→TESTE→SEGURANÇA→AUDIT LOG→OPERAÇÃO→EVIDÊNCIA (`AUDIT_PROCESS.md` §1), aplicada aos módulos CRITICAL | **Full**, com `Write` para consolidar a matriz de rastreabilidade | Único agente desta lista com permissão de `Write` fora do padrão — produz a matriz de rastreabilidade cruzada, insumo direto do `audit-consolidator` |

## 2. Trilha Documentação

Coordenada por `documentation-audit-lead` (tem `Write` para consolidar veredito).

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `documentation-audit-lead` | Coordenação dos 14 grupos documentais | **Full** (coordenação) | Consolida os achados dos agentes abaixo antes de repassar ao `audit-consolidator` |
| `documentation-consistency-auditor` | CLAUDE.md vs. disco vs. contexto injetado; `docs/database/00-INDICE.md` vs. `docs/database/DATABASE.md`; `TODO.md` vs. `RESIDUAIS_ABERTOS_2026-08-10.md` | **Full** — prioridade máxima | Este é o agente que deve reproduzir e ampliar o achado de calibração já registrado em `SCOPE.md`/`SYSTEM_INVENTORY.md`. Verificar também se as 3 guardas citadas (`docs-reality-drift-guard`, `docs-path-reference-guard`, `audit-coverage-guard`) de fato existem e passam — não aceitar a alegação do CLAUDE.md sem rodar/ler o teste |
| `architecture-documentation-auditor` | `docs/arquitetura/*` (diagramas de sequência, classes, BPMN, infraestrutura) | **Standard** | Confirmar se os diagramas batem com os 48 módulos/53 rotas medidos no Inventory, não com uma contagem antiga |
| `data-documentation-auditor` | `docs/database/00-INDICE.md`, dicionário de dados, MER/DER | **Full** | Ponto de maior risco de drift documental conhecido (166/202/467 vs 169/207/478 vs 186 modelos) — reconciliar com o `database-auditor` (trilha Dados) |
| `security-documentation-auditor` | `docs/administrativo/04-PERFIS_ACESSO.md`, políticas de acesso, LGPD (rh/juridico) | **Standard-Alta** | RBAC "100% das rotas" é alegação a confrontar com o `appsec-auditor` |
| `api-documentation-auditor` | `docs/arquitetura/API.md` vs. 53 arquivos de rota / 681 ocorrências de handler | **Standard** | Amostrar endpoints de comex/purchases/financial/quality (CRITICAL) primeiro |
| `operations-documentation-auditor` | `docs/infra/DEPLOY_UBUNTU.md`, `GO_LIVE_G6_CHECKLIST.md`, runbook do CLAUDE.md §6 | **Amostragem** | Sem servidor de produção adquirido — menor urgência, mas confirmar que o checklist reflete o estado real do gate G6 |
| `test-documentation-auditor` | Contagens de teste citadas no CLAUDE.md (1848/172, 211/53) vs. contagem real de arquivos do Inventory (177 arquivos unit, 59 arquivos integration) | **Full** | Divergência já sinalizada em `SYSTEM_INVENTORY.md` como "não investigada" — este agente investiga a causa raiz |

## 3. Trilha Arquitetura

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `architecture-auditor` | Clean Architecture geral (domain/application/infrastructure/presentation) nos 48 módulos | **Standard**, aprofundar em bom/mrp/quality/financial/directorate (CRITICAL) | Confirmar ausência de acoplamento direto Sequelize em domain/application nesses módulos |
| `domain-architecture-auditor` | Fronteiras de domínio: `items` núcleo intocado vs. extensões comerciais/técnicas; `bom` como fonte única pós-G1 | **Full** | G1 é justamente sobre fronteira de domínio (duas BOMs paralelas) — maior risco de regressão arquitetural da auditoria |
| `mvc-architecture-auditor` | Camada `presentation/controllers` e `routes` (106 controllers, 53 arquivos de rota) | **Standard** | Confirmar que controllers não contêm regra de negócio (deveria estar em use-case) — checar sst/ti/juridico/facilities, módulos grandes (47-75 endpoints) mais propensos a essa fuga |
| `integration-architecture-auditor` | fiscal (providers NF-e), CNAB/OFX, webhooks n8n, comex | **Alta** | Todos CRITICAL/HIGH na classificação de risco |
| `dependency-architecture-auditor` | Grafo de dependências entre módulos (`SYSTEM_MAP.md` coluna "Dependências") | **Standard** | Confirmar que dependências declaradas (ex. `directorate` depende de `purchases`/`comex`) não escondem dependência circular não documentada |
| `repository-layer-auditor` | `domain/repositories` (170 arquivos) e `infrastructure/sequelize` (151 arquivos) | **Standard**, aprofundar em mrp/bom/quality | Ponto onde bugs de dupla fonte de verdade (como o de G1) tendem a se esconder |
| `service-layer-auditor` | `application/use-cases` (666 arquivos) | **Amostragem estatística** dado o volume — 100% em CRITICAL, amostra em MEDIUM/LOW | Volume alto exige amostragem consciente; documentar critério de amostragem no relatório |

## 4. Trilha Engenharia (código)

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `backend-auditor` | server/src/modules — geral | **Full** nos módulos CRITICAL (auth, accessProfiles, users, directorate, purchases, comex, financial, mrp, quality, bom, production, fiscal, auditLogs) | Trilha central desta auditoria — maior volume de horas |
| `frontend-auditor` | `client/src` — telas correspondentes aos módulos CRITICAL/HIGH (COMEX, MPS, qualidade/quarentena, financeiro) | **Standard** | Confirmar que a UI não permite contornar um gate que o backend aplica (ex.: campo que deveria estar bloqueado após NF-e) |
| `fullstack-auditor` | Fluxos ponta a ponta: venda→estoque→NF-e; requisição→RFQ→compra→recebimento; OP→apontamento→OEE (os 3 diagramas de sequência do CLAUDE.md) | **Full** | É o agente que verifica se o "critério de aceite corrigido" (escrita real, não só typecheck) foi de fato satisfeito — crítico dado o histórico de "4 rodadas de defeito silencioso" citado no CLAUDE.md |
| `controller-auditor` | Presentation/controllers dos módulos CRITICAL | **Standard** | Verificar validação de entrada e propagação correta de erro (422 nos gates G11/D-L/G6) |
| `domain-logic-auditor` | Ver §1 acima (alocação primária) | — | — |
| `idempotency-auditor` | mrp (rerun idempotency, G-fix 2026-08-12), purchase-receipt-duplicate-invoice, sale-cancel-concurrency | **Full** | Diretamente relacionado ao defeito crítico corrigido no mesmo dia da auditoria — maior risco de regressão não coberta |
| `api-auditor` | Contrato de API dos 53 arquivos de rota, en especial financial/sales/purchases/comex/quality | **Standard-Alta** | Confirmar consistência de payload/erro documentado em `docs/arquitetura/API.md` vs. real |
| `external-api-auditor` | Providers de NF-e (Focus/eNotas/Mock), integração CNAB/OFX | **Alta** | Falha de contrato externo tem efeito fiscal direto |
| `webhook-auditor` | `POST /api/webhooks/n8n` (2 endpoints) | **Full** apesar do volume baixo | Única superfície de entrada externa hoje; autenticação/autorização deste endpoint é desproporcionalmente crítica ao seu tamanho |
| `integration-auditor` | Integração entre módulos internos: quality↔sales (gate D-L), production↔mrp, bom↔engineering | **Alta** | Ponto onde gaps da "cadeia do produto" historicamente apareceram (17 gaps documentados) |

## 5. Trilha Dados / Banco

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `database-auditor` | Schema real do PostgreSQL — **requer execução** (`psql`/`docker exec`), não apenas leitura de arquivo | **Full**, prioridade 1 | `SYSTEM_INVENTORY.md` já registra que "tabelas/FKs aplicadas: NÃO VERIFICADO NESTA SESSÃO" — este agente deve ser o primeiro a resolver isso com ferramenta de execução real (`audit-verification-runner`, se disponível, ou escalar a necessidade ao `software-audit-director`) |
| `migration-auditor` | 169 arquivos `.cjs` em `server/migrations/`, baseline congelado (`00_baseline_frozen.sql`) | **Full** | Confirmar que banco novo nasce idêntico ao atual, como alegado — não aceitar sem reprodução |
| `data-integrity-auditor` | FK ausente conhecida em `purchase_receipts`/`product_cost_ledgers` (P1-07, CLAUDE.md), `ON DELETE SET NULL` sobre coluna `NOT NULL` (guarda `schema-model-drift-guard`) | **Full** | Risco explícito e documentado pelo próprio time de desenvolvimento — auditoria deve confirmar independentemente, não apenas repetir a alegação |

## 6. Trilha Segurança

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `appsec-auditor` | Cobertura de RBAC "100% das rotas" (alegação do CLAUDE.md, não verificada) | **Full**, amostragem representativa de todos os 53 arquivos de rota, 100% dos CRITICAL | Prioridade 1 de segurança desta auditoria |
| `authentication-auditor` | `auth` module: login, refresh, reset de senha, rate-limit | **Full** | Porta de entrada — CRITICAL |
| `authorization-auditor` | `accessProfiles`, `directorate` (segregação D-K), gates G11/G6/D-L | **Full** | Núcleo do que a auditoria mais precisa provar: segregação de função real, não só por identidade nominal |
| `session-security-auditor` | Refresh deslizante, revogação de sessão (`password-recovery-and-session-revocation`) | **Standard** | Feature relativamente recente (2026-08-06) |
| `secrets-auditor` | `.env`, `JWT_SECRET`, `ADMIN_SEED_PASSWORD`, `CREDENCIAIS_TESTE.local.txt` citado no CLAUDE.md | **Full** | Um arquivo de credenciais de teste em texto claro já é citado no próprio CLAUDE.md — confirmar que não vaza para o disco de produção nem para o Git |
| `security-configuration-auditor` | Helmet, CORS, rate-limit, headers | **Standard** | — |
| `dependency-security-auditor` | `npm audit` (não executado nesta sessão por instrução explícita), divergência TypeScript 6 vs 7 client/server, Zod 3 vs 4 | **Full** — deve efetivamente rodar `npm audit` | Este é o agente que deve, de fato, rodar o audit que o Inventory explicitamente pulou |
| `audit-log-security-auditor` | Módulo `auditLogs` — é o próprio mecanismo de evidência da auditoria | **Full** | Ver justificativa CRITICAL em `RISK_CLASSIFICATION.md` |
| `tenant-isolation-auditor` | N/A — sistema single-tenant (ERP de uma única empresa) | **Não aplicável, registrar explicitamente como N/A** | Não excluir silenciosamente: registrar que foi avaliado e não se aplica, distinto de exclusão por falta de escopo (como IA) |

## 7. Trilha Qualidade / Testes

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `qa-auditor` | Estratégia geral de teste, distinção unit (dublê)/integration (Postgres real) já documentada no CLAUDE.md | **Full** | Ponto de partida: confirmar que o "critério de aceite corrigido" é seguido de fato pelos times, não só declarado |
| `test-coverage-auditor` | Cobertura real vs. presença de arquivo (ressalva explícita do `SYSTEM_MAP.md`) para mrp/quality/purchases/financial/production/bom (CRITICAL) | **Full** — requer rodar a suíte (não apenas Glob) | Precisa de agente com ferramenta de execução (mesma limitação registrada no Inventory) |
| `test-architecture-auditor` | Runner `run-api-suite.cjs`, diferença entre 172/177 (unit) e 53/59 (integration) já sinalizada | **Full** | Investiga a causa raiz da divergência de contagem que `test-documentation-auditor` (trilha Documentação) também tange — coordenar para não duplicar finding |
| `sdet-auditor` | Testes de concorrência (`stock-concurrency`, `production-order-status-concurrency`, `inventory-count-claim-concurrency`, `sale-cancel-concurrency`) | **Alta** | Concorrência é risco conhecido e já parcialmente coberto — confirmar que os testes de fato exercitam concorrência real (2 conexões simultâneas), não apenas o nome sugere isso |
| `regression-auditor` | Todos os gaps fechados 2026-08-09/12 (G1, G4-G7, G9, G11, G13, G17, D-K, D-L) | **Full** | Maior prioridade de regressão de toda a auditoria — remediação do mesmo dia |

## 8. Trilha Plataforma / Operação

| Agente | Módulos/domínios cobertos | Profundidade | Observação |
|---|---|---|---|
| `devops-auditor` | Scripts npm, `run-api-suite.cjs`, ambiente Docker Compose dev | **Standard** | — |
| `cicd-auditor` | `.github/workflows/server-ci.yml` (único pipeline; sem CI para client/mobile/tv) | **Full** | Achado já sinalizado no Inventory como lacuna — confirmar severidade real (risco de regressão de frontend/mobile não pega em PR) |
| `infrastructure-auditor` | `docker-compose.yml`/`docker-compose.prod.yml` (não exercitado ao vivo, sem servidor de produção) | **Amostragem** (estático apenas, conforme exclusão do escopo) | Concordar com `SCOPE.md`: infraestrutura de produção real está fora de escopo por não existir ainda |
| `observability-auditor` | Winston, `/health/live`, `/health/ready` | **Standard** | Confirmar ausência de rotação de log (já citada como lacuna no CLAUDE.md) |
| `performance-auditor` | Hot path do MRP, queries N+1 potenciais em módulos comerciais com JOIN (trade-off documentado no CLAUDE.md §7) | **Amostragem** | Sem ambiente de carga real disponível nesta auditoria — registrar como limitação |
| `resilience-auditor` | Comportamento sob falha parcial (ex. provider de NF-e fora do ar, gate de aprovação indisponível) | **Amostragem** | — |
| `backup-recovery-auditor` | "Backup: PostgreSQL dump diário via cron" (CLAUDE.md) — **não verificado como exercitado de fato** | **Standard** | Confirmar existência real do cron/job, não apenas a menção documental |
| `sre-auditor` | Runbook operacional (CLAUDE.md §6), monitoramento pós-Go-Live | **Amostragem** | Ambiente ainda é dev local — profundidade menor, mas não dispensada |

## 9. Governança (papéis do próprio processo, não de fieldwork de módulo)

| Agente | Papel nesta auditoria |
|---|---|
| `software-audit-director` | Coordenação geral, recebe escalonamentos de CRITICAL/fraude/vazamento de qualquer trilha acima |
| `audit-scope-agent` | Já executado — produziu `SCOPE.md` (com o achado de calibração retratado) |
| `audit-planning-agent` | Este documento e `RISK_CLASSIFICATION.md` |
| `finding-validator` | Etapa 6 (Validation) — tenta refutar cada finding CRITICAL/HIGH antes de aceitar, aplicando o mesmo crivo de "evidência bruta com timestamp" reforçado pelo achado de calibração |
| `audit-evidence-controller` | Custódia de evidência bruta (comando + saída) de todos os agentes acima, principalmente `database-auditor`/`migration-auditor` (única forma de provar contagens reais de banco) |
| `audit-consolidator` | Etapa 7 — deduplica findings entre trilhas que compartilham módulo (ex.: `quality` aparece em Produto/Negócio, Engenharia, Segurança e QA — consolidar sem repetir) |
| `audit-reporting-agent` | Etapa 8 — relatório final, sob aprovação humana |

## Dependências entre trilhas (sequenciamento)

1. **Dados/Banco (`database-auditor`, `migration-auditor`) deve rodar antes ou em paralelo estrito com Qualidade/Testes** — sem confirmar o estado real do Postgres, `test-coverage-auditor` não consegue provar que a suíte de integração roda contra o banco certo.
2. **Segurança (`appsec-auditor`, `authorization-auditor`) deve preceder o fechamento de Produto/Negócio em `directorate`/`purchases`/`comex`** — a segregação de função D-K é ao mesmo tempo um controle de segurança e uma regra de negócio; um achado de um lado invalida a conclusão do outro se não sincronizado.
3. **Documentação (`documentation-consistency-auditor`) deve compartilhar achado de calibração com todas as demais trilhas antes destas citarem qualquer número do CLAUDE.md** — para evitar que 8 trilhas diferentes redescubram o mesmo drift de forma duplicada.
4. **Arquitetura (`domain-architecture-auditor` em `bom`) precede Engenharia (`repository-layer-auditor` em `bom`/`mrp`)** — entender a fronteira de domínio pretendida (G1) é pré-requisito para julgar se a implementação a viola.
5. Todas as trilhas de módulo CRITICAL devem concluir fieldwork antes da etapa de Consolidation tentar fechar qualquer veredito de "Go-Live pronto" — nenhum agente individual tem mandato para essa conclusão (reservada a `software-audit-director` + `audit-consolidator` + aprovação humana).

## Critério de conclusão por trilha (objetivo, não lista de tarefas)

- **Produto/Negócio:** concluída quando toda regra de negócio remediada em 2026-08-09/12 tiver BR-ID mapeado, teste automatizado vinculado e nenhuma divergência de valor/limite não explicada.
- **Documentação:** concluída quando todo número citado como "canônico" em qualquer doc tiver sido reconferido por leitura direta nesta auditoria (não herdado de contexto) e toda divergência registrada com causa raiz, não só "encontrada".
- **Arquitetura:** concluída quando os módulos CRITICAL tiverem confirmação de que não existe segunda via de escrita/leitura equivalente à corrigida em G1 (BOM dupla).
- **Engenharia:** concluída quando os 3 fluxos ponta a ponta do CLAUDE.md (venda→estoque→NF-e; requisição→compra→recebimento; OP→apontamento→OEE) tiverem sido verificados com evidência de escrita real, não apenas typecheck/unit dublê.
- **Dados:** concluída quando a contagem real do Postgres (tabelas/FKs/migrations) tiver sido obtida por comando de execução nesta auditoria e comparada, com veredito explícito, às 3 fontes documentais divergentes já identificadas.
- **Segurança:** concluída quando a alegação "RBAC 100% das rotas" tiver sido confirmada ou refutada por amostragem estatisticamente defensável dos 53 arquivos de rota, e quando D-K (segregação de função) tiver sido testado com usuário real, não só de teste.
- **Qualidade/Testes:** concluída quando a suíte de integração tiver sido executada de fato nesta auditoria (não apenas lida por nome de arquivo) e a divergência 53/59 arquivos e 172/177 arquivos tiver causa raiz registrada.
- **Plataforma/Operação:** concluída quando a lacuna de CI (só backend) tiver severidade atribuída e quando o backup real (não só o cron declarado) tiver sido confirmado ou refutado.
- **Integrações:** concluída quando os 3 providers de NF-e e o endpoint de webhook n8n tiverem sido verificados quanto a autenticação/autorização e tratamento de falha do provedor externo.

---

**Próximo passo:** aprovação humana deste plano (`AUDIT_PROCESS.md` §4, item 3, gate). Após aprovação, fieldwork inicia em `audit/runs/AUD-2026-08-ERP-EVOK-FULL/03-fieldwork/` (ou pasta equivalente definida pelo `software-audit-director`).
