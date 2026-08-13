# RISK_CLASSIFICATION.md — AUD-2026-08-ERP-EVOK-FULL

**Etapa:** Plan (`AUDIT_PROCESS.md` §4, item 3)
**Autor:** audit-planning-agent
**Base:** `01-inventory/SYSTEM_INVENTORY.md` e `SYSTEM_MAP.md` (leitura direta desta sessão, evidenciada por Glob/Grep reais), `00-scope/SCOPE.md`.

## Nota de calibração (herdada do Scope/Inventory, releitura obrigatória)

Tanto `SCOPE.md` quanto `SYSTEM_INVENTORY.md` registram o mesmo achado de processo,
independentemente: o `CLAUDE.md` **injetado no contexto desta sessão** traz números
desatualizados (166 migrations/202 tabelas/467 FKs; "175 modelos"), enquanto o
`CLAUDE.md` **no disco**, relido por essas duas etapas, traz 169/207/478 e a contagem
real por `Glob` desta etapa de Plan encontra 186 arquivos em `server/src/models/`.
Este documento de classificação de risco **não repete nenhum número do CLAUDE.md
injetado como fato** — usa apenas o que `SYSTEM_INVENTORY.md`/`SYSTEM_MAP.md` já
verificaram por comando real nesta mesma auditoria. Todo agente de fieldwork deve
repetir essa releitura de disco no momento da sua própria verificação, e não herdar
números deste documento sem nova conferência quando o achado for CRITICAL/HIGH.

## Exclusão explícita — trilha de IA

Confirmado em `SCOPE.md`: não há componente de IA/LLM/RAG em produção neste sistema
(a frente "n8n + IA + integração Meta" citada no CLAUDE.md está em planejamento, fora
de escopo). Por isso, **não são alocados** nesta auditoria:

- `ai-system-auditor`
- `ai-evaluation-auditor`
- `llm-security-auditor`
- `rag-auditor`
- `agent-permission-auditor`

Se a frente n8n/IA/Meta avançar para produção, deve ser objeto de um ciclo de
auditoria separado, com esses 5 agentes reativados.

## Critérios de classificação usados

- **CRITICAL**: falha aqui gera perda financeira/fiscal direta e imediata, viola
  segregação de função/controle anti-fraude, compromete autenticação/autorização de
  todo o sistema, ou expõe dado pessoal em massa (LGPD) — e o módulo teve gap
  crítico corrigido nas últimas 48h (alto risco de regressão silenciosa).
- **HIGH**: impacto financeiro/fiscal/regulatório real mas não sistêmico, ou módulo
  novo/alterado recentemente (2026-08-06 a 2026-08-12) sem histórico longo de
  operação, ou controle de rastreabilidade regulatória (SPED Bloco K, ISO 9001,
  eSocial, LGPD setorial).
- **MEDIUM**: regra de negócio operacional relevante, mas sem gap crítico recente
  aberto, com cobertura de teste aparente razoável.
- **LOW**: cadastro/apoio/relatório, sem integração financeira direta, baixo volume
  ou baixo blast radius de um defeito.

## Classificação por domínio/módulo

### CRITICAL

| Domínio/Módulo | Justificativa |
|---|---|
| **auth** (login/JWT/refresh/reset) | Porta de entrada de todo o sistema; falha aqui compromete todos os demais controles. Nenhum gap documentado recentemente, mas é fundação — CRITICAL por blast radius, não por histórico de bug. |
| **accessProfiles / RBAC (autorização)** | Base de todo o controle de autorização; CLAUDE.md alega "100% das rotas" cobertas por RBAC, alegação **não verificada** nesta auditoria — exige prova, não aceitação. |
| **users (gestão de identidade)** | Sem controle correto de identidade, RBAC e segregação de função (D-K) colapsam. |
| **directorate (governança/alçada D-K)** | Ponto único de aprovação/segregação de função "quem solicita não aprova" nos 4 pontos de aprovação (compras, requisições, COMEX, etc.). Falha aqui é fraude/conflito de interesse institucionalizado. Nota adicional do CLAUDE.md: hoje **usuários de teste** (domínio `@teste.evokaudio`) são os únicos aprovadores distintos do `admin` — ainda não há aprovador real `@evokaudio.com.br`, risco operacional explícito para produção. |
| **purchases (aprovação por alçada/origem, G11)** | Remediação de brecha de gate em 2026-08-12 (mesmo dia da auditoria) — altíssimo risco de regressão não testada; controle anti-fraude direto (alçada por valor/origem). |
| **comex (gate de diretoria na saída de draft)** | Controle anti-fraude de importação; CLAUDE.md admite que o teste de integração real do fluxo completo é pendente — ausência de prova é achado por si só. |
| **financial (AP/AR, G13)** | "Conta a pagar nasce no recebimento, conta a receber na NF-e" é remediação de 2026-08-12; dinheiro real, CPC 00/CPC 47; qualquer regressão gera passivo/ativo fantasma. |
| **mrp** | 2 defeitos críticos corrigidos em 2026-08-12 no mesmo dia da auditoria (netting entre demandas concorrentes, idempotência de rerun contra requisição duplicada) — histórico de bug real recentíssimo, sem tempo de operação estável. |
| **quality (liberação de lote, quarentena, gate de saída D-L)** | G7/D-L: quarentena "deixou de ser decorativa" em 2026-08-10 e o gate de faturamento contra lote bloqueado é remediação de 2026-08-12. Falha aqui permite embarque de produto não conforme — risco regulatório (ISO 9001) e de segurança do consumidor. |
| **bom (fonte única de engenharia)** | G1 unificou duas BOMs paralelas em 2026-08-09; risco de regressão para "dupla escrita" voltar a existir silenciosamente — é o alicerce do MRP. |
| **production (partida de OP, G4/G5/G6)** | G6 (partida de OP exige roteiro + centro de trabalho ativo) é o último gap fechado da cadeia do produto (2026-08-10); apontamento obrigatório sustenta obrigação legal do SPED Bloco K. |
| **fiscal (cálculo de tributos, emissão NF-e)** | Erro de cálculo tributário ou de chave de acesso tem consequência legal/fiscal direta e imediata, sem possibilidade de "correção silenciosa" depois de emitido. |
| **auditLogs** | É o próprio mecanismo do qual esta auditoria depende para confiar em evidência de todos os outros módulos — uma falha aqui contamina a confiabilidade de qualquer conclusão desta auditoria. |

### HIGH

| Domínio/Módulo | Justificativa |
|---|---|
| **sales (faturamento, baixa de estoque, NF-e)** | G9 (baixa move da confirmação para a NF-e) é remediação recente; interage diretamente com o gate CRITICAL de qualidade e com fiscal/financeiro. |
| **rh (módulo estendido, RF-RH e Bloco 6)** | Módulo com histórico de remediação de vazamento LGPD (BR-RH-020, citado em `SYSTEM_MAP.md` via git log) — dado pessoal sensível de funcionário; extensão de Bloco 6 é recente. |
| **sst (EPI/ASO/CIPA/PGR/eSocial)** | Módulo grande (75 endpoints) e regulatório (eSocial é obrigação legal trabalhista); boa cobertura de teste aparente reduz, mas não elimina, o risco regulatório. |
| **juridico (contratos, LGPD, prazos, atos societários)** | LGPD é regulatório direto (dados pessoais); módulo grande (75 endpoints); prazos/aditivos com efeito legal se perdidos. |
| **ti (chamados, licenças, backup, acesso)** | Gestão de acesso e backup tem efeito de segurança transversal a todo o sistema (ex.: se controle de acesso de TI for falho, contorna RBAC de aplicação). |
| **traceability (rastreio por lote/série)** | Sustenta rastreabilidade fiscal e de qualidade (recall), mas é módulo de leitura/consulta — não CRITICAL por si, HIGH por criticidade regulatória do dado que expõe. |
| **masterProduction / MPS (G17)** | Entregue em 2026-08-10, ainda recente; limitação conhecida e documentada (sem baldes de tempo) — risco de decisão de PCP equivocada por informação incompleta, não de bug silencioso. |
| **accounting / treasury / budget** | Módulos novos (2026-08-07), impacto financeiro/contábil direto (partida dobrada, balancete), mas sem histórico de gap crítico registrado como o de financial/sales/mrp — HIGH, não CRITICAL. |
| **suppliers (cadastro/avaliação)** | Cadastro alimenta diretamente o gate G11 de origem (nacional/import); cadastro errado faz o gate CRITICAL falhar silenciosamente — risco herdado, não próprio. |
| **spreadsheetImport (importação de catálogo)** | Ponto de entrada de dados em massa, usado na carga inicial real de 327 insumos (2026-08-10) — 59 itens ainda marcados "revisar", incluindo 5 bobinas críticas; erro de importação contamina custo/estoque/BOM a jusante. |
| **webhooks (n8n)** | Única superfície de entrada backend-to-backend externa hoje em produção — autenticação/autorização do endpoint é ponto de entrada de risco mesmo sem IA associada. |

### MEDIUM

| Domínio/Módulo | Justificativa |
|---|---|
| purchaseRequisitions | Origem da cadeia de suprimentos, rastreabilidade relevante, mas sem gap crítico aberto no momento. |
| items / products | Núcleo estável (hot path do MRP), mudanças raras — risco herdado de quem o consome (bom/mrp), não próprio. |
| inventory (estoque, contagens, múltiplos depósitos) | Concorrência é risco conhecido, mas já coberto por múltiplos testes de concorrência dedicados. |
| engineering | Alimenta BOM (CRITICAL), mas é módulo de definição/desenho, não de execução transacional. |
| workCenters | G6 depende de centro de trabalho ativo — risco herdado de production. |
| assets / maintenance / serviceOrders | Sincronização Asset.status↔manutenção (RF-PAT-05) é recente, mas de impacto operacional, não financeiro direto. |
| nonConformities | Compliance de qualidade, mas módulo satélite de quality. |
| rfq | Gera pedido de compra automaticamente — superfície de risco financeiro real, mas sem gap documentado e a jusante do gate de alçada (purchases, CRITICAL). |
| dashboard / reports / intelligentAuditor | Agrega dados de outros módulos; erro aqui pode mascarar problema real alhures — risco de "espelho quebrado", não de dado primário incorreto. |
| accounting/treasury/budget — já em HIGH acima (mantido para não duplicar). |
| facilities | Módulo grande (64 endpoints), mas sem integração financeira crítica destacada além de multas/manutenção. |
| mobileInventory | Sem teste em hardware real (limitação conhecida e já documentada como tal, não como gap oculto). |

### LOW

| Domínio/Módulo | Justificativa |
|---|---|
| clients | Cadastro simples, consumido por sales. |
| categories / departments | Cadastro organizacional, já com guarda de regressão (`departments.seeds.test.ts`). |
| employees (núcleo, distinto de rh/) | Cadastro; dado sensível vive majoritariamente em rh (já classificado HIGH). |
| laboratory (testes acústicos Thiele-Small) | Domínio técnico específico, baixo volume, sem integração financeira. |
| marketing | Sem integração financeira direta crítica; funil/lead é o de menor blast radius do sistema. |

## Trilhas transversais (não são módulo de negócio, mas cobertura obrigatória)

| Trilha | Profundidade | Motivo |
|---|---|---|
| Segurança (auth/authz/appsec/secrets/session/tenant-isolation — N/A single-tenant) | Alta | Cobre auth, accessProfiles, users, directorate (CRITICAL acima) — profundidade máxima |
| Dados/Banco (schema, migrations, integridade referencial) | Alta | Divergência de calibração já achada (166 vs 169 vs 186 modelos); FK ausente conhecida em `purchase_receipts`/`product_cost_ledgers` (P1-07, CLAUDE.md) — exige reconfirmação ao vivo no Postgres, não aceitação documental |
| Qualidade/Testes (cobertura real vs. nome de arquivo) | Alta | `SYSTEM_MAP.md` já avisa: coluna "Testes" é presença de arquivo por nome, não prova de execução — mrp/production/quality/purchases exigem confirmação de execução real (`test:integration` rodando de fato) |
| Arquitetura (Clean Architecture, MVC, camadas) | Média | Estrutura consistente observada por amostragem; risco principal é módulo com dupla fonte de verdade (padrão do próprio G1/BOM) |
| Documentação (14 grupos documentais) | Média-Alta | Achado de calibração do próprio SCOPE.md/INVENTORY.md já prova drift entre contexto injetado e disco — merece trilha própria dedicada a esse tipo de erro, não só a "documento existe/não existe" |
| Plataforma/Operação (CI/CD, infra, observabilidade) | Média | CI cobre só backend (`server-ci.yml`); client/mobile/tv sem pipeline — achado a registrar, não crítico pois não há deploy de produção ainda |
| Integrações (fiscal providers, CNAB/OFX, webhooks) | Média-Alta | fiscal é CRITICAL; CNAB/OFX e webhooks HIGH/MEDIUM conforme já classificado acima |
| IA/LLM/RAG | **Excluída** | Sem componente em produção — ver seção de exclusão acima |

## Ressalva de rastreabilidade

Toda classificação acima é uma estimativa de risco **a priori**, baseada em
documentação e inventário estático (Glob/Grep/Read), não em execução. Nenhum
domínio classificado como MEDIUM/LOW deve ser tratado como "dispensa de
verificação" — apenas como "amostragem proporcional", conforme `AUDIT_PROCESS.md`
§4 item 3. Qualquer agente de fieldwork que encontre evidência de que a
classificação a priori subestimou um domínio deve escalar a reclassificação ao
`software-audit-director`, não simplesmente ajustar o próprio escopo em silêncio.
