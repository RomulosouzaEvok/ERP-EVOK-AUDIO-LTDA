AUDIT_ID: AUD-2026-08-ERP-EVOK-FULL
REPOSITORY: c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA (GitHub: gilwagno/ERP-Evok--Audio-LTDA)
BRANCH: main
COMMIT_HASH: dc52081 (dc5208154a51346e835cf54a4a4195780ea683a4 — verificado em `.git/logs/HEAD` como HEAD atual, alcançado por `pull origin main --ff-only` a partir de `65bd66d`)
VERSION: pré-Go-Live G6 (ver CLAUDE.md, "Single Source of Truth")
DATE: 2026-08-12
ENVIRONMENT: desenvolvimento local (Docker Compose — PostgreSQL 16 + API Node/Express, porta padrão de dev; sem servidor de produção ainda adquirido — ver EXCLUSIONS)
AUDITORS: software-audit-director (coordenação), audit-planning-agent (distribuição de domínios/plano), demais agentes especialistas conforme distribuídos em `AUDIT_PLAN.md` (fieldwork), finding-validator (validação de CRITICAL/HIGH), audit-consolidator (consolidação), audit-reporting-agent (relatório final)

## SCOPE

Sistema completo ERP Evok Áudio LTDA, nas seguintes camadas:

- **Backend:** Node.js + TypeScript + Express + Sequelize, `server/src/modules/` (Clean Architecture — domain/application/infrastructure/presentation por módulo). Inventário exato de módulos é produto da fase 2 (Inventory/SYSTEM_INVENTORY.md); nesta verificação de escopo confirmou-se a existência de dezenas de módulos de domínio (auth, users, clients, items, categories, departments, employees, production, mrp, bom, engineering, quality, laboratory, traceability, maintenance, serviceOrders, assets, purchases/procurement, purchaseRequisitions, suppliers, comex, inventory/warehouse, sales, financial, accounting, treasury, budget, sst, ti, juridico, facilities, marketing, rh, directorate, accessProfiles, auditLogs, dashboard, reports/intelligentAuditor, mobileInventory, webhooks, fiscal, workCenters, masterProduction, spreadsheetImport, entre outros) — a ordem de grandeza de "49 módulos" citada no pedido inicial é compatível com o que foi observado (52 arquivos de rotas conforme medição canônica de 2026-08-12 do próprio CLAUDE.md), mas o número exato e a lista fechada só serão firmados no artefato de Inventory, não neste documento de escopo.
- **Frontend web:** React 19 + Vite, `client/`.
- **Banco de dados:** PostgreSQL 16. Confirmado por leitura direta de `docs/database/00-INDICE.md` E de `CLAUDE.md` §1 (medição canônica reconferida em 2026-08-12, contada no PostgreSQL, não estimativa): **169 migrations aplicadas, 207 tabelas, 478 foreign keys**, em ambos os documentos, sem divergência. (Correção editorial, orquestrador humano/sessão, 2026-08-12: uma versão anterior deste SCOPE.md registrava aqui uma suposta divergência — CLAUDE.md com 166/202/467 — que não se sustenta: uma nova checagem direta com `grep` não encontrou essas strings em `CLAUDE.md` nem em nenhum outro arquivo do repositório. A alegação foi retirada; ver nota na seção "Achado de escopo".)
- **App mobile:** Expo/React Native, `mobile/` (existência confirmada — `mobile/package.json`).
- **App Android TV:** react-native-tvos, `tv/` (existência confirmada — `tv/package.json`).
- **Módulos de negócio cobertos:** RH, Vendas, Compras/Suprimentos, Estoque, Produção/PCP, Qualidade, Financeiro, Contabilidade, Tesouraria, Controladoria, Patrimônio/Manutenção, Facilities, Jurídico, SST, TI, Diretoria, Relatórios/Dashboard.

## EXCLUSIONS

- **Componentes de IA/LLM/RAG em produção:** não identificado nenhum componente desse tipo em operação no sistema auditado. Os auditores condicionais de IA do framework VeriCore (`ai-system-auditor`, `ai-evaluation-auditor`, `llm-security-auditor`, `rag-auditor`, e demais dependentes de presença de IA) **não se aplicam** a este ciclo de auditoria. Nota: o próprio CLAUDE.md registra uma frente de "n8n + IA + integração Meta" em planejamento/execução paralela — **fora de escopo** por não estar em produção; se essa frente avançar, deve ser objeto de auditoria à parte quando existir código/fluxo a auditar.
- **Infraestrutura de produção real:** não existe servidor de produção adquirido (confirmado por texto do próprio CLAUDE.md — "servidor de produção (VPS/on-premise) ainda não adquirido"). `docker-compose.prod.yml` existe no repositório (confirmado por leitura direta) mas como esqueleto não exercitado contra ambiente real — auditado apenas como artefato de código/configuração estático, não como operação viva.
- **Apps mobile (`mobile/`) e Android TV (`tv/`):** auditados apenas por código-fonte, configuração e testes automatizados (typecheck/bundle). Sem teste em hardware físico real — essa limitação de evidência é herdada do próprio estado do projeto (o CLAUDE.md declara ambos "validados só por typecheck/bundle, sem teste em dispositivo/hardware real ainda") e será refletida como limitação de evidência nos findings dessa trilha, não como exclusão de verificação de código.
- **Comparação de números canônicos do schema (166/202/467 vs 169/207/478):** a reconciliação definitiva entre `CLAUDE.md` §1 e `docs/database/00-INDICE.md` fica para a fase de Inventory/fieldwork (trilha de dados/documentação); não é resolvida nesta etapa de escopo, que apenas registra a divergência encontrada.

## Achado de escopo — RETRATADO (não confirmado sob reverificação)

A versão original deste documento (produzida por `audit-scope-agent`) registrava aqui uma suposta divergência entre
`CLAUDE.md` §1 (alegado 166 migrations / 202 tabelas / 467 FKs) e `docs/database/00-INDICE.md` (169/207/478).

**Esta alegação não se sustentou sob reverificação direta em disco** (orquestrador da sessão, 2026-08-12):
`grep -n "166\|202 tabelas\|467" CLAUDE.md` não retorna nenhuma ocorrência no arquivo real. `CLAUDE.md` §1 e
`docs/database/00-INDICE.md`, lidos diretamente do disco, concordam em 169/207/478.

**Causa raiz identificada (confirmada de forma independente pelo agente da etapa de Inventory, mesma auditoria):**
não foi fabricação — o agente de escopo recebeu, injetado automaticamente em seu contexto de sessão pelo harness
(bloco de referência de projeto, não uma leitura de arquivo que ele próprio executou), um SNAPSHOT do `CLAUDE.md`
capturado no início da sessão de trabalho, ANTES das correções de banco/migrations aplicadas mais cedo no mesmo dia
(166/202/467 eram os números corretos algumas horas antes). O agente citou esse snapshot como se fosse leitura atual
do arquivo, sem confirmar com uma leitura própria do disco no momento da verificação.

Isto é registrado explicitamente, e não apenas silenciosamente corrigido, porque é um achado sobre o **processo de
auditoria em si**, útil para todas as fases seguintes: contexto de projeto injetado automaticamente (snapshots de
`CLAUDE.md`, memória, etc.) pode estar desatualizado em relação ao disco no exato momento da verificação — a regra
de ouro do framework (`AUDIT_PROCESS.md` §2, READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT) exige que a etapa
VERIFY/PROVE sempre releia a fonte primária (arquivo em disco, banco real, código real) no momento da checagem, e
nunca cite conteúdo injetado em contexto como se fosse essa releitura. Recomendação para as fases seguintes: todo
achado que cite um número/trecho específico deve vir acompanhado da evidência bruta (comando executado + saída),
com timestamp da checagem — e o `finding-validator` deve aplicar esse crivo mesmo a achados que pareçam
triviais/de documentação, não só a CRITICAL/HIGH de segurança.

## Verificação de conflito de interesse (segregação organizacional)

Confirmado por leitura direta do sistema de arquivos que a Audit & Assurance Organization está fisicamente segregada da Development Organization que implementou o sistema:

- **Development Organization:** `.claude/agents/Centro Autônomo de Engenharia de Software/` (subpastas `engenharia/`, `arquitetura/`, `produto/`, `qualidade/`, `plataforma/`, `seguranca/`, `operacao/`, `transversais/` — agentes como `backend-engineer`, `frontend-engineer`, `software-architect`, `security-architect`, `qa-engineer`, etc.)
- **Audit & Assurance Organization:** `.claude/agents/Centro Autônomo de Engenharia de Software auditoria/` (diretório distinto e paralelo — sem hierarquia comum além do nome de prefixo — contendo `software-audit-director`, `audit-planning-agent`, `audit-scope-agent`, `finding-validator`, `audit-consolidator`, `audit-reporting-agent`, `business-rule-auditor`, `mvc-architecture-auditor`, `database-auditor`, `appsec-auditor`, e os demais ~80 agentes especialistas de auditoria)

Não há sobreposição de identidade de agente entre as duas organizações: nenhum agente listado em `.claude/agents/Centro Autônomo de Engenharia de Software/` aparece também em `.claude/agents/Centro Autônomo de Engenharia de Software auditoria/`. A regra dura do framework ("um agente que implementou uma funcionalidade não pode ser o único agente que audita e aprova essa mesma funcionalidade" — `AUDIT_PROCESS.md` §3) está, portanto, **satisfeita na estrutura de agentes disponível**.

Ressalva que não é conflito de interesse de agente, mas de processo humano, e que este agente não tem autoridade para resolver: o repositório é de propriedade única (não há indicação de terceirização/fornecedor externo independente que tenha implementado o sistema), então a independência aqui é entre *papéis de IA*, não entre *organizações humanas distintas*. Isso é adequado ao framework tal como descrito (§3 é sobre segregação de papéis de agente), mas fica registrado para que o responsável humano pela auditoria tenha ciência do limite: esta auditoria não substitui uma auditoria externa independente por terceiro humano, caso esta seja exigida por norma/contrato/regulador.

## Gate

Nenhum trabalho técnico de fieldwork começa a partir deste ponto sem aprovação humana explícita deste escopo (`AUDIT_PROCESS.md` §4, item 1, e §3, item 3 — decisão sobre eventual conflito de interesse é exclusiva do responsável humano).
