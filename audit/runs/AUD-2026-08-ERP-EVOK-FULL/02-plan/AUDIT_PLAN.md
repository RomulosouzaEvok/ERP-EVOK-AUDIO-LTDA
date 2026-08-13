# AUDIT_PLAN.md — AUD-2026-08-ERP-EVOK-FULL

**Etapa:** Plan (`AUDIT_PROCESS.md` §4, item 3) — consolidação final antes do gate humano
**Autor:** software-audit-director
**Insumos (lidos diretamente nesta sessão):** `00-scope/SCOPE.md`, `01-inventory/SYSTEM_INVENTORY.md`, `01-inventory/SYSTEM_MAP.md`, `02-plan/RISK_CLASSIFICATION.md`, `02-plan/AGENT_ASSIGNMENT.md`, `audit/templates/AUDIT_COVERAGE_MATRIX_TEMPLATE.md`, `audit/framework/AUDIT_PROCESS.md` §4.
**Status:** PLANEJADO — nenhum fieldwork foi executado. Este documento consolida decisões já tomadas nas etapas Scope/Inventory/Plan; não introduz módulo, agente ou achado novo além do que essas etapas já produziram.

---

## 0. Advertência de processo herdada (repetida deliberadamente)

As três etapas anteriores desta mesma auditoria (Scope, Inventory, Plan) já registraram, de forma independente, o
mesmo tipo de erro: **conteúdo de projeto injetado automaticamente no contexto de sessão (bloco `claudeMd`, memória)
divergiu do conteúdo real em disco no momento da verificação** — exemplos concretos: números de migrations/tabelas/FKs
(166/202/467 no contexto injetado vs. 169/207/478 no disco) e contagem de modelos ("175" no texto do CLAUDE.md vs. 186
arquivos reais por `Glob`). Este `AUDIT_PLAN.md` **não introduz nenhum número novo do CLAUDE.md como fato** — usa
apenas o que já foi verificado por comando real (`Glob`/`Grep`/`Read`) nas etapas Scope/Inventory/Plan desta mesma
auditoria. Regra vinculante para todo agente de fieldwork, repetida aqui pela quarta vez porque é a lição mais
importante do processo até agora:

> Todo achado que cite um número, trecho de código ou caminho de arquivo deve vir com evidência bruta (comando
> executado + saída, ou citação de linha lida diretamente) e timestamp da checagem. Contexto injetado (CLAUDE.md,
> MEMORY.md, resumos de sessão anterior) nunca substitui releitura da fonte primária no momento da verificação —
> mesmo que pareça trivial, mesmo que já tenha sido "confirmado" numa etapa anterior no mesmo dia.

---

## 1. O que será auditado

Escopo herdado de `SCOPE.md`, sem alteração: o ERP Evok Áudio LTDA completo — backend (`server/`, Node/Express/
Sequelize, 48 módulos-pasta / 53 arquivos de rota / 681 ocorrências de handler, medidos por Glob/Grep real no
Inventory), frontend web (`client/`, React 19/Vite), banco PostgreSQL 16 (169 migrations por contagem de arquivo;
tabelas/FKs em disco documentadas mas **não confirmadas ao vivo** nesta rodada — ver §4), apps `mobile/` e `tv/`
(código/config/teste automatizado apenas), documentação (`docs/**`, 14 grupos), CI/CD (`.github/workflows/
server-ci.yml`), e as integrações reais em produção (fiscal/NF-e, CNAB/OFX, webhook n8n).

Commit-base: `dc52081` (branch `main`), confirmado em `.git/logs/HEAD` por duas etapas independentes (Scope e
Inventory).

### 1.1 Domínios/módulos cobertos e profundidade planejada

Fonte: `RISK_CLASSIFICATION.md` (classificação) + `AGENT_ASSIGNMENT.md` (distribuição). Resumo executivo — a lista
completa de módulos por agente está em `AGENT_ASSIGNMENT.md` e não é duplicada linha a linha aqui para evitar drift
entre dois documentos que diriam a mesma coisa; ver a matriz de cobertura (`AUDIT_COVERAGE_MATRIX.md`) para o
cruzamento módulo × agente × profundidade.

- **13 domínios classificados CRITICAL** (auth, accessProfiles/RBAC, users, directorate, purchases, comex, financial,
  mrp, quality, bom, production, fiscal, auditLogs) — profundidade **Full**, cobertos por múltiplas trilhas
  simultaneamente (Produto/Negócio, Arquitetura, Engenharia, Segurança, Dados, Qualidade), deliberadamente redundante
  porque são justamente as regras remediadas em 2026-08-09/12 (véspera/mesmo dia da auditoria).
- **11 domínios classificados HIGH** (sales, rh, sst, juridico, ti, traceability, masterProduction, accounting/
  treasury/budget, suppliers, spreadsheetImport, webhooks) — profundidade **Standard-Alta**, amostragem
  representativa mais aprofundamento nos pontos de interseção com módulos CRITICAL.
- **12 domínios classificados MEDIUM** (purchaseRequisitions, items/products, inventory, engineering, workCenters,
  assets/maintenance/serviceOrders, nonConformities, rfq, dashboard/reports/intelligentAuditor, facilities,
  mobileInventory) — profundidade **amostragem proporcional**, não dispensa de verificação.
- **5 domínios classificados LOW** (clients, categories/departments, employees núcleo, laboratory, marketing) —
  profundidade **amostragem**, foco em confirmar ausência de gap óbvio, não auditoria exaustiva.
- **8 trilhas transversais** obrigatórias independente de módulo: Segurança, Dados/Banco, Qualidade/Testes,
  Arquitetura, Documentação, Plataforma/Operação, Integrações, e uma trilha explicitamente **excluída** (IA/LLM/RAG).

### 1.2 Ordem e dependências entre trilhas

Herdado de `AGENT_ASSIGNMENT.md` §"Dependências entre trilhas (sequenciamento)", sem alteração — repetido aqui por
ser informação de aprovação humana relevante:

1. **Dados/Banco precede ou corre em paralelo estrito com Qualidade/Testes.** Sem confirmar ao vivo o estado real do
   Postgres (tabelas/FKs/migrations aplicadas), o `test-coverage-auditor` não pode provar que a suíte de integração
   roda contra o banco certo.
2. **Segurança (`appsec-auditor`, `authorization-auditor`) precede o fechamento de Produto/Negócio** em
   `directorate`/`purchases`/`comex` — a segregação de função D-K é simultaneamente controle de segurança e regra de
   negócio; um achado de um lado invalida a conclusão do outro se não sincronizado.
3. **Documentação (`documentation-consistency-auditor`) compartilha o achado de calibração (drift contexto×disco)
   com todas as demais trilhas antes destas citarem qualquer número do CLAUDE.md** — para não haver 8 redescobertas
   duplicadas do mesmo drift.
4. **Arquitetura (`domain-architecture-auditor` em `bom`) precede Engenharia (`repository-layer-auditor` em
   `bom`/`mrp`)** — entender a fronteira de domínio pretendida (G1, BOM única) é pré-requisito para julgar se a
   implementação a viola.
5. **Nenhuma trilha de módulo CRITICAL pode ser considerada concluída antes de a Consolidation tentar fechar
   qualquer veredito de "Go-Live pronto"** — essa conclusão é reservada a `software-audit-director` +
   `audit-consolidator` + aprovação humana; nenhum agente individual tem mandato para emiti-la.

### 1.3 Critério de conclusão por trilha

Herdado de `AGENT_ASSIGNMENT.md` (seção homônima) — objetivo, não checklist de tarefas. Resumo:

| Trilha | Concluída quando... |
|---|---|
| Produto/Negócio | toda regra remediada em 2026-08-09/12 tiver BR-ID, teste automatizado vinculado, e valor/limite (ex. R$ 500 mil de alçada) confirmado contra o implementado |
| Documentação | todo número "canônico" citado em qualquer doc tiver sido reconferido por leitura direta nesta auditoria (não herdado de contexto), com causa raiz registrada para toda divergência |
| Arquitetura | módulos CRITICAL tiverem confirmação de ausência de segunda via de escrita/leitura equivalente à corrigida em G1 (BOM dupla) |
| Engenharia | os 3 fluxos ponta a ponta do CLAUDE.md (venda→estoque→NF-e; requisição→compra→recebimento; OP→apontamento→OEE) tiverem sido verificados com evidência de escrita real, não apenas typecheck/unit dublê |
| Dados | contagem real do Postgres (tabelas/FKs/migrations) tiver sido obtida por comando de execução nesta auditoria e comparada, com veredito explícito, às fontes documentais divergentes já identificadas |
| Segurança | "RBAC 100% das rotas" tiver sido confirmada ou refutada por amostragem estatisticamente defensável, e D-K tiver sido testado com usuário real (não só de teste) |
| Qualidade/Testes | a suíte de integração tiver sido executada de fato (não apenas lida por nome de arquivo) e a divergência 53/59 e 172/177 arquivos tiver causa raiz registrada |
| Plataforma/Operação | a lacuna de CI (só backend) tiver severidade atribuída, e o backup real (não só o cron declarado) tiver sido confirmado ou refutado |
| Integrações | os 3 providers de NF-e e o webhook n8n tiverem sido verificados quanto a autenticação/autorização e tratamento de falha externa |

---

## 2. O que fica excluído e por quê

| Exclusão | Motivo | Fonte |
|---|---|---|
| Componentes de IA/LLM/RAG (`ai-system-auditor`, `ai-evaluation-auditor`, `llm-security-auditor`, `rag-auditor`, `agent-permission-auditor`) | Nenhum componente desse tipo em operação; a frente "n8n + IA + integração Meta" citada no CLAUDE.md está em planejamento, não em produção | `SCOPE.md` §EXCLUSIONS, `RISK_CLASSIFICATION.md` |
| Infraestrutura de produção real (servidor físico) | Não adquirida ainda; `docker-compose.prod.yml` existe como esqueleto de código, não como operação viva | `SCOPE.md`, confirmado por texto do CLAUDE.md ("servidor de produção ainda não adquirido") |
| Apps `mobile/`/`tv/` em hardware físico real | Sem dispositivo real disponível para teste; auditados por código-fonte, config e typecheck/bundle apenas — limitação de evidência, refletida nos findings dessa trilha, não exclusão de verificação de código | `SCOPE.md` |
| Comparação definitiva dos números canônicos de schema entre `CLAUDE.md` e `docs/database/00-INDICE.md` | Não fechada na etapa de Scope; delegada à trilha Dados/Banco (`database-auditor`, `data-documentation-auditor`) no fieldwork, com exigência de reconfirmação ao vivo no Postgres | `SCOPE.md`, `RISK_CLASSIFICATION.md` |
| Tenant isolation | Sistema é single-tenant (uma única empresa) — avaliado explicitamente como **N/A**, não descartado em silêncio | `AGENT_ASSIGNMENT.md` §6 |
| `npm audit` completo, execução de shell (typecheck/test/psql ao vivo) nas etapas já concluídas | Ferramentas de Scope/Inventory/Plan desta sessão não incluíam execução de shell — resultado: contagens de banco (tabelas/FKs aplicadas) e execução real da suíte **ainda não confirmadas**, delegado explicitamente ao fieldwork com agente que tenha ferramenta de execução | `SYSTEM_INVENTORY.md` |

Nenhuma exclusão acima é permanente: IA/Meta e infraestrutura de produção real devem ser objeto de ciclo de auditoria
separado quando existir código/operação real a auditar (registrado em `SCOPE.md`).

---

## 3. Achados de processo já carregados das etapas anteriores

Estes não são findings de produto (nenhum é `AUD-<DOMINIO>-<NUMERO>` ainda — cabe ao fieldwork formalizá-los se
persistirem sob prova), mas achados sobre a **qualidade da própria auditoria** que o `finding-validator` e o
`audit-consolidator` devem tratar com prioridade, porque contaminam a confiabilidade de qualquer número citado antes
de reverificação:

1. **Drift contexto-injetado × disco (calibração).** O `CLAUDE.md` injetado automaticamente no contexto de sessão
   trouxe "166 migrations / 202 tabelas / 467 FKs" e "175 modelos Sequelize"; a releitura direta do arquivo em disco,
   feita de forma independente por Scope e Inventory, encontrou "169/207/478" e 186 arquivos de modelo reais por
   `Glob`. Causa raiz identificada pela etapa de Inventory: snapshot de contexto capturado antes de uma correção
   aplicada mais cedo no mesmo dia. Lição vinculante para todo fieldwork: nunca aceitar número de contexto injetado
   sem releitura própria no momento da verificação.
2. **Contagem de testes com duas unidades de medida distintas.** O CLAUDE.md fala em "1848 testes / 172 suítes"
   (unit) e "211 testes / 53 suítes" (integration); o Inventory desta sessão, por `Glob` de arquivos, encontrou 177
   arquivos `*.test.ts` em `tests/unit` e 59 em `tests/integration` — divergindo por 5 e 6 arquivos respectivamente
   das contagens de "suítes" do CLAUDE.md. Não investigado nesta etapa (falta ferramenta de execução); delegado à
   trilha Qualidade/Testes (`test-coverage-auditor`, `test-architecture-auditor`) e à trilha Documentação
   (`test-documentation-auditor`) — coordenar para não duplicar o mesmo finding.
3. **Tabelas/FKs aplicadas no PostgreSQL real: não verificado nesta sessão.** Nenhuma das etapas Scope/Inventory/Plan
   teve acesso a ferramenta de execução (`psql`/`docker exec`). A fonte citada (`docs/database/00-INDICE.md`,
   169/207/478) é documental, não uma consulta ao vivo. Esta é a lacuna de maior prioridade a resolver logo no
   início do fieldwork (trilha Dados/Banco, item 1 de sequenciamento em §1.2).
4. **CI cobre só o backend.** `.github/workflows/server-ci.yml` é o único pipeline; `client/`, `mobile/`, `tv/` não
   têm CI automatizado — typecheck/lint/teste de frontend e apps, se rodam, rodam manualmente. Registrado como achado
   a qualificar (severidade) na trilha Plataforma/Operação, não como fato já classificado.
5. **RBAC "100% das rotas" é alegação, não prova.** O CLAUDE.md declara cobertura total de RBAC; nenhuma etapa até
   aqui amostrou rotas para confirmar presença de middleware de autorização. Prioridade 1 da trilha Segurança
   (`appsec-auditor`).
6. **Segregação de função D-K ainda depende de usuários de teste.** O próprio CLAUDE.md registra que os únicos
   aprovadores hoje distintos do `admin` autor dos documentos são usuários de domínio `@teste.evokaudio` — criados
   por script que recusa rodar em `NODE_ENV=production`. Não há, até a data da auditoria, aprovador real
   `@evokaudio.com.br`. Isto é uma lacuna operacional explícita para produção, não um bug de código; deve ser
   verificado como está (identidade, não privilégio) e reportado como risco de processo humano, distinto de falha
   técnica.
7. **FKs conhecidas ausentes em `purchase_receipts` e `product_cost_ledgers` (P1-07).** Documentado pelo próprio time
   de desenvolvimento no CLAUDE.md como violação da regra "FK obrigatória" — tabelas hoje vazias, mas o recebimento
   de compra é justamente o evento que dispara entrada de estoque e nascimento de conta a pagar (G13). A trilha
   Dados/Banco deve confirmar independentemente, não apenas repetir a alegação do desenvolvimento.
8. **Divergência de versão de compilador/lib entre client e server.** TypeScript `^7.0.2` (server) vs `~6.0.2`
   (client); Zod `^4.4.3` (server) vs `^3.25.76` (client) — candidatos a finding de manutenibilidade, não de
   segurança, a confirmar/qualificar na trilha Arquitetura/Engenharia.
9. **Limitação de independência da auditoria em si.** `SCOPE.md` confirma segregação de papéis de agente entre
   Development Organization e Audit & Assurance Organization (nenhum agente aparece nas duas listas), mas registra
   que isto não equivale a uma auditoria externa por terceiro humano independente — relevante se houver exigência
   normativa/contratual/regulatória de auditoria externa, decisão exclusiva do responsável humano.

---

## 4. Papéis de governança do processo (não fieldwork de módulo)

Herdado de `AGENT_ASSIGNMENT.md` §9, sem alteração:

| Papel | Função nesta auditoria |
|---|---|
| `software-audit-director` | Coordenação geral; recebe escalonamento imediato de qualquer CRITICAL, fraude, vazamento de dado ou comprometimento de segurança |
| `audit-scope-agent` | Já executado — produziu `SCOPE.md` |
| `audit-planning-agent` | Produziu `RISK_CLASSIFICATION.md` e `AGENT_ASSIGNMENT.md`, consolidados aqui |
| `finding-validator` | Etapa 6 — tenta refutar todo finding CRITICAL/HIGH antes de aceitá-lo, aplicando o crivo de evidência bruta + timestamp |
| `audit-evidence-controller` | Custódia de evidência bruta de todos os agentes, com ênfase em `database-auditor`/`migration-auditor` |
| `audit-consolidator` | Etapa 7 — deduplica findings entre trilhas que compartilham módulo (ex.: `quality` aparece em Produto/Negócio, Engenharia, Segurança e QA) |
| `audit-reporting-agent` | Etapa 8 — Relatório Executivo, Técnico e Remediation Backlog, sob aprovação humana |

---

## 5. Saídas geradas por esta etapa

- `AUDIT_PLAN.md` (este documento)
- `AUDIT_COVERAGE_MATRIX.md` (mesma pasta) — cobertura **planejada**, status "PLANEJADO, não executado" em toda
  linha, nenhuma célula marcada como auditada
- Distribuição de tarefas por domínio/agente — já detalhada em `02-plan/AGENT_ASSIGNMENT.md` (não duplicada aqui)

Próximo artefato esperado após aprovação: fieldwork em `03-fieldwork/` (ou pasta equivalente definida pelo
`software-audit-director` no momento do início), um subdiretório por trilha, cada finding no padrão
`AUD-<DOMINIO>-<NUMERO>` conforme `audit/templates/FINDING_TEMPLATE.md`.

---

## GATE — APROVAÇÃO HUMANA NECESSÁRIA

Nenhum trabalho de fieldwork (`/audit-fieldwork`) começa sem aprovação humana explícita deste plano, do escopo em
`SCOPE.md` e da matriz de cobertura planejada em `AUDIT_COVERAGE_MATRIX.md` (`AUDIT_PROCESS.md` §4, itens 1 e 3). O
responsável humano precisa decidir/confirmar, especificamente:

1. **Escopo e exclusões** — concorda que IA/LLM/RAG (não em produção), infraestrutura de produção real (não
   adquirida) e teste em hardware físico de `mobile/`/`tv/` (indisponível) ficam fora deste ciclo, sem prejuízo de
   ciclo futuro dedicado quando essas frentes avançarem?
2. **Alocação de agentes e profundidade** — concorda com a priorização Full nos 13 domínios CRITICAL (todos ligados
   às remediações de 2026-08-09/12, véspera/mesmo dia da auditoria) e amostragem proporcional em MEDIUM/LOW, conforme
   `AGENT_ASSIGNMENT.md`?
3. **Limitação de ferramentas já conhecida** — as etapas Scope/Inventory/Plan não tiveram acesso a shell/execução;
   por isso a contagem real de tabelas/FKs no PostgreSQL, a execução de fato da suíte de testes e o `npm audit`
   completo **ainda não foram feitos** e são o primeiro trabalho obrigatório da trilha Dados/Banco e
   Segurança/Qualidade no fieldwork. O responsável humano deve estar ciente de que, até lá, vários números "canônicos"
   citados em documentação (CLAUDE.md, `docs/database/00-INDICE.md`) permanecem não confirmados ao vivo nesta
   auditoria, apesar de consistentes entre si na leitura estática.
4. **Risco operacional já conhecido, não é achado de auditoria** — segregação de função D-K hoje só é exercida por
   usuários de teste (`@teste.evokaudio`); não há aprovador real de produção ainda. Isto será verificado como está
   pela trilha de Autorização, mas a decisão de quando/como resolver é do responsável humano/negócio, não desta
   auditoria.
5. **Limite de independência** — esta auditoria segrega papéis de agente de IA (Development vs. Audit & Assurance),
   mas não substitui auditoria externa por terceiro humano independente, caso exigida por norma, contrato ou
   regulador — decisão do responsável humano se isso é necessário em paralelo ou em sequência a este ciclo.

Aprovar este documento em conjunto com `SCOPE.md` e `AUDIT_COVERAGE_MATRIX.md` libera o início do fieldwork.
