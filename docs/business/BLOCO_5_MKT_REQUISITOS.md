# BLOCO 5 (CORREÇÃO) — Módulo Marketing (MKT) — Requisitos Formais

**Departamento:** 14 — Marketing, conforme `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.
**Natureza deste documento:** **correção e complementação**, não greenfield.
O módulo já existe em produção parcial (commit `2ad27fd`) e foi auditado com
veredito **GAPS CRÍTICOS** — ver `docs/business/BLOCO_5_MKT_VERIFICACAO.md`
(1 de 14 regras atendida, 4 parciais, 7 não atendidas, 2 divergentes,
processo de Eventos/Feiras ausente, nenhum dos 8 KPIs implementado). Este
documento não repete a auditoria; parte dela como fato consumado e formaliza
o que precisa mudar.

**Insumos:** `docs/business/briefs/BRIEF_MKT_2026-08-06.md` (14 regras
BR-MKT-001…014, processos P1…P5), `docs/business/BLOCO_5_MKT_VERIFICACAO.md`
(auditoria regra a regra), código real em
`server/src/modules/marketing/`, `server/src/models/Marketing*.ts`
(inferido pelos repositórios Sequelize), migration
`server/migrations/20260807-000210-create-marketing-module.cjs`, módulo
`server/src/modules/clients/` (criação/consulta de `clients`), `docs/comercial/02-MARKETING.md` (rascunho SQL antigo, tratado como histórico).
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-07.
**Status:** 🟡 Especificação de requisitos de correção pronta para
modelagem de banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código
foi alterado neste passo.**

**Prefixo de módulo:** `MKT` — já em uso desde a primeira entrega
(`docs/comercial/02-MARKETING.md`, brief, verificação); mantido sem
alteração.

**Numeração de Casos de Uso:** o maior UC formal já atribuído em qualquer
documento do projeto é `UC-62` (Bloco 4 FAC, correção, 2026-08-07 — ver
`docs/projeto/04-USE_CASES.md` linha 1725). `UC-52-JUR`/`UC-53-JUR`/
`UC-54-JUR` usam sufixo próprio e não colidem com a sequência numérica
principal. Seguindo o mesmo precedente do Bloco 4 (primeiro número livre de
fato, sem reabrir a colisão de `UC-52`/`UC-53` já registrada), os casos de
uso deste bloco de correção começam em **UC-63**. O `UC-53` original
(Marketing, primeira entrega) deve ser marcado `SUBSTITUÍDO` quando este
bloco for consolidado em `docs/projeto/04-USE_CASES.md`, no mesmo padrão
usado para `UC-52` (Facilities) na correção anterior.

**Catálogo RBAC verificado:** `server/src/shared/domain/accessModules.ts`
já tem a chave `marketing`, hoje com **2 níveis** (leitura implícita/
`operate`), **sem `approve`** — ver §5.1 sobre se a correção exige elevar.

---

## 0. Sumário da correção (o que muda e por quê)

| Área | Situação atual (commit `2ad27fd`) | Correção exigida |
|---|---|---|
| Conversão lead→cliente | `converted_to_customer_id` opcional; `converted` sem cliente é estado alcançável hoje | Tornar obrigatório e atômico na transição (P0) — ver §1.1 |
| Métricas de campanha | `leads_generated`/`conversions`/`roi` são colunas editáveis via `PUT` | Somente leitura via API; derivadas de vínculo real (P0) — ver §1.2 |
| Handoff Marketing→Vendas | Inexistente (`responsavel_vendas` não existe em nenhuma camada) | Criar `responsible_sales_user_id` + SLA + alerta (P1) — ver §1.3 |
| Captação de lead | `name` sozinho basta; sem exigência de contato nem origem | Validação cruzada `email` OU `phone`; `lead_source` obrigatório (P1) — ver §1.4 |
| Deduplicação de lead | Inexistente | Checar contra leads abertos e contra `clients` antes de criar (P1) — ver §1.4 |
| Evento/Feira | Inexistente — `lead_source='event'` é rótulo solto | Entidade `MarketingEvent` própria, com orçamento/checklist/leads (P1) — ver §1.5 |
| KPIs de funil | Nenhum implementado | 8 KPIs do brief, endpoint(s) de relatório (P1) — ver §1.6 |
| Orçamento de campanha | `budget` único (sem distinguir solicitado × aprovado) | Separar `budget_requested`/`budget_approved` + status de aprovação; bloquear `active` sem aprovação (P2) — ver §1.7 |
| Alerta de estouro de orçamento | Inexistente | Threshold 90%/100% exposto em listagem/relatório (P2) — ver §1.7 |
| Imutabilidade pós-conclusão | `PUT` aceita qualquer campo em qualquer status | Bloquear edição de campanha `completed`/`canceled` exceto notas (P2) — ver §1.7 |
| LGPD do lead | Nenhum campo de consentimento | Flag + data + canal de consentimento (P2) — ver §1.8 |
| Material físico × Almoxarifado | `product_id` (produto), sem vínculo a item de estoque | `item_estoque_id` opcional + regra de não duplicar movimentação (P3) — ver §1.9 |
| Aprovação de material | `approved` aceito já `true` no `POST` | `POST` sempre nasce `approved=false`; endpoint de aprovação dedicado (P3) — ver §1.9 |
| Autenticação de serviço (WhatsApp/n8n) | Rota de criação de lead só aceita JWT de usuário | Fora deste bloco — registrado como pendência P3, não bloqueia | — ver §1.10 |
| Dado órfão existente | Leads `converted` sem `converted_to_customer_id` podem já existir em produção | Migration de saneamento obrigatória antes/junto da constraint (P0) — ver §2 |

---

## 1. Requisitos Funcionais (RF-MKT)

Cada RF referencia o processo do brief (P1…P5), a regra de negócio
`BR-MKT-NNN` aplicável e, quando pertinente, o achado da verificação
(`BLOCO_5_MKT_VERIFICACAO.md`) que o motiva.

### 1.1 Conversão Lead → Cliente Atômica (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-001 | A transição de status `qualified`/`in_sales_attendance` → `converted` **exige** um cliente vinculado: ou (a) `client_id` de um `clients.id` já existente (busca prévia, nunca digitação livre de ID numérico — ver RF-MKT-003), ou (b) instrução explícita para criar cliente novo, com os campos mínimos fiscais exigidos por `CreateClientUseCase` (`name`, `cpf_cnpj` válido — `clients.cpf_cnpj` é `NOT NULL`/único). Sem um dos dois, a API rejeita com `ValidationError` (422/400) — nunca aceita `converted` sem vínculo | P0 | BR-MKT-008 |
| RF-MKT-002 | Quando a opção é "criar cliente novo" (RF-MKT-001b), a criação do `Client` e a atualização do `Lead` (`status='converted'`, `converted_client_id`) ocorrem na **mesma transação de banco** — se a criação do cliente falhar (ex.: CPF/CNPJ duplicado, `ConflictError`), a transição de status do lead **não** é persistida; o lead permanece no status anterior e a API retorna o erro original ao cliente, para o operador decidir entre vincular ao cliente existente (RF-MKT-001a) ou corrigir o documento | P0 | BR-MKT-008, integridade referencial (CLAUDE.md §7) |
| RF-MKT-003 | Quando a opção é "vincular cliente existente" (RF-MKT-001a), o endpoint de conversão aceita `client_id` **e** valida sua existência (`ClientsRepository.findById` ou equivalente) antes de gravar — `client_id` de cliente inexistente é rejeitado com `NotFoundError`, nunca gravado como FK solta. A tela correspondente deve oferecer busca por nome/CPF-CNPJ (não campo numérico livre "Id do cliente") — requisito de UX obrigatório para não repetir o padrão atual (`ConvertLeadDialog`, `client/src/pages/marketing/LeadsTab.tsx`), fora do escopo de banco/API mas registrado aqui para o handoff de frontend | P0 | BR-MKT-008, achado 2.1 da verificação |
| RF-MKT-004 | `converted` permanece terminal (nenhuma transição de saída), conforme já implementado em `ChangeLeadStatusUseCase.VALID_TRANSITIONS` — mantido sem alteração | P0 | BR-MKT-008 |
| RF-MKT-005 | O estado intermediário `em_atendimento_vendas` do brief (entre `qualified` e `converted`) é formalmente **adotado** nesta correção como `in_sales_attendance` — marca o momento em que o vendedor aceitou o handoff (RF-MKT-013) e está trabalhando o lead, distinto de "qualificado, aguardando handoff". Funil corrigido: `new → contacted → qualified → in_sales_attendance → converted`, com `lost` alcançável de qualquer etapa aberta (mantido) | P1 | Brief P2.4/P2.5, achado da verificação (funil simplificado não documentado como divergência) |

### 1.2 Métricas de Campanha Somente Derivadas (P0)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-006 | `leads_generated`, `conversions` e `roi` deixam de ser aceitos em `PUT /api/marketing/campaigns/:id` — remover de `updateCampaignSchema` (e de `createCampaignSchema`, onde também são aceitos hoje). Qualquer tentativa de enviá-los no corpo da requisição é ignorada silenciosamente ou rejeitada — **decisão de projeto: rejeitar** (`.strict()` do Zod já rejeita chaves desconhecidas; manter esse comportamento em vez de apenas "ignorar", para não mascarar erro de integração) | P0 | BR-MKT-004 |
| RF-MKT-007 | **Decisão de arquitetura (a decidir formalmente pelo `AdmDBA`, esta é a recomendação do requisito):** manter `leads_generated`/`conversions`/`roi` como colunas de **cache recalculado** (não removê-las do schema), porque relatórios/listagem de campanha precisam de leitura rápida sem `JOIN`/agregação pesada a cada `GET /api/marketing/campaigns`. Justificativa: reescrever para sempre calcular on-the-fly em toda listagem é custo aceitável em baixo volume (marketing é módulo de baixo volume transacional), mas cache com invalidação automática é mais seguro contra drift do que trocar tudo por view materializada nesta rodada — reavaliar para view/materialized view se o volume crescer. As colunas de cache são recalculadas (nunca setadas por input do usuário) em 3 gatilhos: (a) criação de lead vinculado à campanha, (b) transição de lead para `converted` vinculado à campanha, (c) job/rotina de reconciliação (RF-MKT-009) | P0 | BR-MKT-004 |
| RF-MKT-008 | `roi` de campanha passa a ser **sempre calculado**: `(receita_atribuída − custo_realizado) ÷ custo_realizado`, onde receita_atribuída é a soma de `sales.total_amount` de vendas com status faturado/embarcado (`invoiced`/`shipped`, nunca `canceled`) de clientes vinculados via `Lead.converted_client_id` a leads da campanha, dentro da janela de atribuição (RF-MKT-010). `roi` nunca é aceito como input em `POST`/`PUT` | P0 | BR-MKT-004 |
| RF-MKT-009 | Job/rotina de reconciliação (pode ser síncrono sob demanda via endpoint `POST /api/marketing/campaigns/:id/recalculate`, sem exigir infraestrutura de job assíncrono nesta rodada) recalcula `leads_generated`/`conversions`/`roi` a partir dos vínculos reais, para corrigir drift entre o cache e a fonte de verdade (leads/vendas) — usado também na migration de saneamento (§2) | P0 | BR-MKT-004 |
| RF-MKT-010 | Janela de atribuição de receita (dias após a conversão do lead em que uma venda ainda conta como atribuída à campanha) é um parâmetro configurável, com valor de partida de **90 dias** — `[DEFINIR COM COORDENADOR]` (brief, pendência 2) | P1 | BR-MKT-004, brief d.1 |

### 1.3 Handoff Marketing → Vendas com SLA (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-011 | Adicionar `responsible_sales_user_id` (FK `users.id`, nullable até a qualificação) ao Lead | P1 | BR-MKT-007 |
| RF-MKT-012 | A partir do status `qualified`, o lead **exige** `responsible_sales_user_id` preenchido para poder avançar a `in_sales_attendance` (RF-MKT-005) — atribuição pode ocorrer no mesmo `POST /status` que qualifica ou em ação separada (`PATCH` de atribuição), mas o funil não avança sem responsável definido | P1 | BR-MKT-007 |
| RF-MKT-013 | Registrar `qualified_at` (timestamp da transição para `qualified`) e `sales_handoff_at` (timestamp de atribuição do `responsible_sales_user_id`) para permitir o cálculo do SLA de handoff (RF-MKT-018) | P1 | BR-MKT-007 |
| RF-MKT-014 | SLA de handoff configurável em dias úteis, valor de partida **2 dias úteis** (brief, sugestão de partida) — `[DEFINIR COM COORDENADOR]`. Lead `qualified` sem `responsible_sales_user_id` além do SLA aparece em listagem de alerta (`GET /api/marketing/leads?sla_breached=true` ou equivalente) para o Coordenador MKT e o Gerente Comercial — sem bloqueio automático de fluxo, só sinalização (mesmo espírito não-bloqueante de BR-MKT-003) | P1 | BR-MKT-007 |
| RF-MKT-015 | `responsible_sales_user_id` é visível e editável tanto pelo módulo `marketing` (nível `operate`) quanto pelo módulo `sales` (nível a definir pelo `ArquitetoSoftwareAPI`/`AdmDBA` — provável reuso do RBAC de `sales` já existente) — o vendedor precisa poder aceitar/recusar o handoff sem depender de Marketing operar por ele | P1 | BR-MKT-007, BR-MKT-014 |

### 1.4 Captação e Deduplicação de Lead (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-016 | `createLeadSchema`/`updateLeadSchema` passam a exigir, via `.refine()` cruzado, pelo menos um de `email`/`phone` preenchido — payload só com `name` é rejeitado com `ValidationError` | P1 | BR-MKT-005 |
| RF-MKT-017 | `lead_source` passa de `.optional()` para obrigatório em `createLeadSchema` | P1 | BR-MKT-005 |
| RF-MKT-018 | Antes de criar um lead, o sistema consulta (a) leads existentes com status aberto (não `converted`/`lost`) por `email`/`phone` normalizado e (b) `clients` por `cpf_cnpj`/telefone/e-mail (reuso de busca já exposta por `/api/clients`, sem duplicar lógica de normalização). Em caso de match: (a) lead duplicado → retorna erro `ConflictError` apontando o lead existente (não cria um segundo); (b) match com cliente ativo → **não cria lead**, retorna o cliente encontrado para o operador registrar a interação como comercial direta, fora do funil de captação | P1 | BR-MKT-006 |
| RF-MKT-019 | Suporte a criação de lead **em lote** (array de leads no corpo de `POST /api/marketing/leads/bulk` ou equivalente), aplicando as mesmas validações (RF-MKT-016/017/018) item a item, com resposta discriminando sucesso/erro por item — atende à prática de captação pós-feira (brief P3.3) | P1 | Brief P3.3 |

### 1.5 Evento/Feira (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-020 | Criar entidade `MarketingEvent` (nome, local, `start_date`, `end_date`, `event_type`: `feira`/`lancamento`/`workshop`/`regional`, `campaign_id` FK opcional, `budget`, `actual_cost`, `status`: `planned`/`in_progress`/`completed`/`canceled`) | P1 | BR-MKT-009, Brief P3 |
| RF-MKT-021 | Checklist do evento: itens livres (`description`, `status`: `pending`/`done`, `responsible_user_id` opcional) — estrutura simples e configurável, sem enum fechado de categorias (o brief é explícito: "não engessar em código") | P1 | Brief P3.1 |
| RF-MKT-022 | Lead com `event_id` preenchido nasce automaticamente com `lead_source='event'` (ou o valor de domínio equivalente) — validação cruzada garante consistência entre os dois campos | P1 | BR-MKT-009 |
| RF-MKT-023 | Contagem de "leads captados" do evento é **sempre derivada** de `COUNT(marketing_leads WHERE event_id = :id)` — nunca campo editável, mesmo princípio da BR-MKT-004 aplicado a evento | P1 | BR-MKT-009, BR-MKT-004 (por extensão) |
| RF-MKT-024 | Custo por lead de evento (`actual_cost ÷ leads_count`) exposto no endpoint de detalhe do evento e no relatório de KPIs (RF-MKT-028) | P1 | Brief (e), KPI "Custo por lead de evento" |
| RF-MKT-025 | Fechamento do evento (`status='completed'`) exige `actual_cost` preenchido — mesma disciplina de "custo realizado consolidado" do encerramento de campanha (P1, brief) | P1 | Brief P3.4 |

### 1.6 KPIs de Funil (P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-026 | Endpoint `GET /api/marketing/reports/funnel` (ou caminho equivalente definido pelo `ArquitetoSoftwareAPI`) retorna, com filtro opcional por campanha/origem/período: **Custo por Lead (CPL)**, **taxa de qualificação**, **conversão lead→cliente**, **receita atribuída/ROI**, **SLA de handoff (%)**, **tempo de ciclo do lead (mediana)**, **orçado × realizado** — 7 dos 8 KPIs do brief (e) | P1 | Brief (e) |
| RF-MKT-027 | KPI **custo por lead de evento** exposto separadamente, no detalhe/relatório de evento (RF-MKT-024) — 8º KPI do brief | P1 | Brief (e) |
| RF-MKT-028 | Todos os KPIs seguem a exclusão deliberada do brief: nenhuma métrica de vaidade (seguidores, alcance, impressões, engajamento) entra como KPI oficial do sistema | P1 | Brief (e), nota de exclusão |
| RF-MKT-029 | KPIs de conversão/receita usam a mesma base de cálculo do RF-MKT-008 (vendas `invoiced`/`shipped`, nunca `canceled`, dentro da janela de atribuição RF-MKT-010) — sem duplicar lógica entre o cache de campanha e o endpoint de relatório | P1 | BR-MKT-004, Brief (e) |

### 1.7 Orçamento, Alerta e Imutabilidade de Campanha (P2)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-030 | Separar o atual campo único `budget` em `budget_requested` (solicitado, no planejamento) e `budget_approved` (aprovado, nullable até a aprovação) + `budget_approval_status` (`pending`/`approved`/`rejected`) + `budget_approved_by`/`budget_approved_at`. Aprovação é registrada **dentro do módulo MKT** nesta rodada (recomendação do brief d.2: "começar registrada no MKT com campo 'aprovado por/em', evoluindo depois" — sem entidade formal de orçamento por centro de custo no Financeiro ainda) | P2 | BR-MKT-001, Brief d.2 |
| RF-MKT-031 | Campanha só transita para `status='active'` com `budget_approval_status='approved'` — tentativa de ativar sem aprovação retorna `BusinessRuleError` (422) | P2 | BR-MKT-001 |
| RF-MKT-032 | Alerta de orçamento: quando `actual_cost ÷ budget_approved ≥ 0.9` (90%) e quando `≥ 1.0` (100%), a campanha aparece marcada em listagem/relatório (`budget_alert_level`: `none`/`warning_90`/`over_100`) — cálculo em tempo de leitura, sem bloqueio de novos lançamentos de custo (custo pode ultrapassar livremente, conforme BR-MKT-003) | P2 | BR-MKT-003 |
| RF-MKT-033 | Threshold de 90% é `[DEFINIR COM COORDENADOR]` (brief, pendência 2) — implementar como constante configurável, não hard-code espalhado | P2 | BR-MKT-003 |
| RF-MKT-034 | `PUT /api/marketing/campaigns/:id` bloqueia alteração de qualquer campo quando `status` atual é `completed`/`canceled`, **exceto** um campo de notas/observações livre (`notes`, a criar) — tentativa de editar outro campo retorna `BusinessRuleError` (422) | P2 | BR-MKT-002 |

### 1.8 LGPD do Lead (P2)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-035 | Adicionar ao Lead: `consent_given` (bool, default `false`), `consent_date`, `consent_channel` (texto livre ou domínio simples: `formulario_site`/`whatsapp`/`telefone`/`feira`/`indicacao`/`outro`) | P2 | BR-MKT-012 |
| RF-MKT-036 | `POST /api/marketing/leads` aceita os 3 campos de consentimento como opcionais nesta rodada (não bloquear captação por ausência de consentimento explícito — decisão de negócio real fica com Compliance), mas o campo estrutural precisa existir para não repetir o problema apontado na verificação ("hoje seria necessária uma nova migration para adicionar") | P2 | BR-MKT-012 |
| RF-MKT-037 | Rotina de anonimização/expurgo de leads `perdido`/`descartado` após X meses **não entra nesta correção** — fica registrada como pendência P3 explícita, dependente de `[DEFINIR COM COORDENADOR]` junto ao Compliance (mesma decisão do brief) | P3 | BR-MKT-012 |

### 1.9 Material Promocional (P3)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-MKT-038 | Adicionar `stock_item_id` (FK opcional a `items.id`, categoria "Material Promocional") a `MarketingMaterial`, para material físico. Nenhuma movimentação de estoque é criada pelo módulo MKT — a FK só referencia o item cujo Almoxarifado já controla entrada/saída (BR-MKT-011 mantida: sem estoque paralelo) | P3 | BR-MKT-011, Brief P4.2 |
| RF-MKT-039 | `createMaterialSchema` deixa de aceitar `approved` no `POST` — todo material nasce `approved=false`. Criar endpoint dedicado `PATCH /api/marketing/materials/:id/approve` (nível `operate`, avaliar se deveria ser `approve` — ver §5.1) que grava `approved=true`, `approved_by`, `approved_at` | P3 | BR-MKT-010 |
| RF-MKT-040 | Nova versão de material existente (upload de novo arquivo sobre um material já aprovado) volta `approved` para `false` — precisa de nova aprovação | P3 | BR-MKT-010, Brief P4.1 |

### 1.10 Fora deste bloco (registrado, não implementado agora)

| Item | Motivo de não entrar nesta correção |
|---|---|
| Autenticação de serviço (API key) na rota de criação de lead para integração WhatsApp/n8n (d.5 do brief) | Depende do projeto omnichannel (`mobile-omnichannel-engineer`), fora de escopo deste agente; registrar como P3 pendente |
| Lead scoring automático | Brief já recomenda esperar histórico suficiente; `lead_score` manual (0–100) já existe e é mantido |
| Custo realizado tageado a `accounts_payable` (integração formal com Financeiro) | Brief aceita fallback de lançamento manual como P1 "com a dívida técnica registrada" — mantido como dívida técnica explícita, não modelado nesta rodada |

---

## 2. Migration de Saneamento de Dados (obrigatória, P0)

Antes de (ou na mesma migration que) tornar `converted_client_id`
efetivamente obrigatório em `converted` (RF-MKT-001), é preciso tratar leads
que já existam em `converted` sem cliente vinculado em qualquer banco onde o
módulo já rodou (dev/homologação — **verificar se produção já tem dado real
antes do Go-Live**, ver CLAUDE.md §5):

- `[VERIFICAR COM MARKETING]` decisão de negócio necessária: os leads
  `converted` órfãos encontrados devem (a) voltar para `qualified`/
  `in_sales_attendance` (reabrindo o funil, exigindo handoff manual de novo)
  ou (b) permanecer `converted` mas migrados para um estado de exceção
  auditável (ex.: `status='converted'` + `data_issue_flag=true`) até
  alguém vincular o cliente retroativamente. Recomendação técnica: opção
  (a) é mais consistente com "não é um estado válido", mas pode reabrir
  trabalho comercial já fechado há tempo — decisão de negócio, não técnica.
- A migration deve gerar um relatório/log de quantos registros foram
  afetados (auditoria mínima do saneamento).
- Depois do saneamento, aplicar a constraint (`CHECK` ou trigger, decisão do
  `AdmDBA`) que impede `status='converted'` sem `converted_client_id`
  preenchido no banco — não confiar apenas na validação de aplicação
  (RF-MKT-001), pelo mesmo motivo de integridade referencial do CLAUDE.md §7.

---

## 3. Requisitos Não Funcionais específicos do módulo

Catálogo geral em `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — aqui só
o que é específico de Marketing e não está lá:

| RNF-MKT | Descrição |
|---|---|
| RNF-MKT-001 | O recálculo de métricas de campanha (RF-MKT-009) deve ser idempotente — rodar duas vezes seguidas produz o mesmo resultado, sem incremento duplicado (diferente do padrão atual de `+1` incremental, que é sujeito a drift) |
| RNF-MKT-002 | A deduplicação de lead (RF-MKT-018) não pode degradar o tempo de resposta de `POST /api/marketing/leads` de forma perceptível em uso normal (captação manual ou em lote pós-feira) — usar índice em `email`/`phone` normalizado tanto em `marketing_leads` quanto em `clients` (já existente, confirmar) |
| RNF-MKT-003 | Dado pessoal de lead (nome, e-mail, telefone) segue a mesma diretriz de tratamento sensível já aplicada a outros módulos com dado pessoal no projeto (ex. Facilities/Visitante, RNF-FAC-04) — sem mascaramento obrigatório em listagem interna do módulo MKT (não é o mesmo nível de sensibilidade de dado de segurança do trabalho/RH), mas sujeito às mesmas regras de RBAC e à rotina de consentimento (RF-MKT-035/036) |

---

## 4. Casos de Uso (UC-63 em diante)

### UC-63 — Converter Lead em Cliente (Atômico)

**Atores:** Analista de Marketing, Vendedor (perfil `sales`), Coordenador MKT.
**Pré-condições:** lead existe, status é `qualified` ou `in_sales_attendance`.

**Fluxo Principal (vincular cliente existente):**
1. Usuário busca cliente existente por nome/CPF-CNPJ.
2. Usuário confirma o vínculo e envia `POST /api/marketing/leads/:id/status` com `status='converted'` e `client_id` do cliente encontrado.
3. Sistema valida a transição (RF-MKT-001/003), grava `status='converted'` e `converted_client_id` em transação única.
4. Sistema recalcula métricas de campanha (RF-MKT-009) se o lead tiver `campaign_id`.
5. Sistema retorna o lead atualizado.

**Fluxo Alternativo A1 (criar cliente novo na conversão):**
1a. Usuário não encontra cliente existente; escolhe "criar cliente novo".
2a. Sistema apresenta formulário mínimo de cliente (nome pré-preenchido do lead, CPF/CNPJ obrigatório a digitar).
3a. Usuário envia `POST .../status` com `status='converted'` e dados de novo cliente.
4a. Sistema cria o `Client` e atualiza o `Lead` na mesma transação (RF-MKT-002); segue do passo 4 do fluxo principal.

**Fluxo de Exceção E1 — CPF/CNPJ duplicado:**
1e. Na criação de cliente novo (A1), `CreateClientUseCase` detecta CPF/CNPJ já cadastrado.
2e. Sistema reverte a transação inteira — lead permanece no status anterior, nenhum cliente é criado.
3e. API retorna `409 Conflict` com a mensagem original ("CPF/CNPJ já cadastrado") e sugestão de usar o fluxo A1→principal (buscar/vincular o cliente existente).

**Fluxo de Exceção E2 — transição inválida:**
1e. Lead está em status diferente de `qualified`/`in_sales_attendance` (ex.: já `converted`, ou `new`).
2e. Sistema rejeita com `BusinessRuleError` (422), sem alterar nenhum dado.

**Fluxo de Exceção E3 — nem `client_id` nem dados de cliente novo informados:**
1e. Requisição de conversão chega sem nenhuma das duas opções.
2e. Sistema rejeita com `ValidationError` (400) antes de qualquer escrita.

**Pós-condições:** lead `converted` sempre tem `converted_client_id` válido; nunca existe estado intermediário observável de "convertido sem cliente".

---

### UC-64 — Handoff de Lead Qualificado para Vendedor (SLA)

**Atores:** Analista/Coordenador de Marketing, Vendedor, Gerente Comercial (alerta).
**Pré-condições:** lead qualificado (`status='qualified'`), `qualified_at` registrado.

**Fluxo Principal:**
1. Coordenador MKT atribui `responsible_sales_user_id` ao lead (endpoint dedicado ou junto da transição para `qualified`).
2. Sistema grava `sales_handoff_at = now()`.
3. Vendedor aceita o lead, avançando `status` para `in_sales_attendance` (RF-MKT-005).

**Fluxo Alternativo A1 — atribuição simultânea à qualificação:**
1a. `POST .../status` com `status='qualified'` já inclui `responsible_sales_user_id` no mesmo payload — sistema grava `qualified_at` e `sales_handoff_at` juntos.

**Fluxo de Exceção E1 — SLA vencido sem atribuição:**
1e. Lead permanece `qualified` sem `responsible_sales_user_id` além do prazo configurado (RF-MKT-014).
2e. Sistema passa a incluir o lead na listagem de alerta consultada pelo Coordenador MKT e pelo Gerente Comercial — sem bloqueio de nenhuma ação sobre o lead.

**Fluxo de Exceção E2 — usuário de vendas inexistente/inativo:**
1e. `responsible_sales_user_id` informado não corresponde a um usuário ativo do sistema.
2e. Sistema rejeita com `NotFoundError`/`ValidationError`, sem gravar o handoff.

**Pós-condições:** todo lead `qualified` ou além tem rastreabilidade de quando foi qualificado e quando (se) recebeu responsável de Vendas, habilitando o KPI de SLA (RF-MKT-026).

---

### UC-65 — Planejar e Encerrar Evento/Feira com Leads Vinculados

**Atores:** Coordenador de Marketing, Analista de Marketing (captação em campo).
**Pré-condições:** nenhuma (evento é criável independentemente de campanha, embora normalmente vinculado a uma).

**Fluxo Principal:**
1. Coordenador cria o evento (nome, datas, tipo, orçamento, campanha opcional).
2. Coordenador monta o checklist (itens livres).
3. Durante o evento, Analista captura leads em lote (RF-MKT-019) com `event_id` preenchido.
4. Ao fim, Coordenador registra `actual_cost` e encerra o evento (`status='completed'`).
5. Sistema calcula custo por lead do evento e disponibiliza no relatório (RF-MKT-024/027).

**Fluxo Alternativo A1 — captação lead a lead (sem lote):**
1a. Analista cria leads um a um durante o evento, cada um já com `event_id`/`lead_source='event'` — mesmas validações de RF-MKT-016 a 018 aplicadas individualmente.

**Fluxo de Exceção E1 — encerramento sem custo realizado:**
1e. Coordenador tenta `status='completed'` sem `actual_cost` preenchido.
2e. Sistema rejeita com `ValidationError` (RF-MKT-025).

**Fluxo de Exceção E2 — lote com itens inválidos:**
1e. Captação em lote (RF-MKT-019) contém itens que falham em validação (contato ausente, duplicado etc.).
2e. Sistema processa os itens válidos e retorna, por item, sucesso ou motivo da rejeição — não é tudo-ou-nada.

**Pós-condições:** todo lead de evento é rastreável ao evento; contagem de leads e custo por lead do evento nunca são digitados manualmente.

---

### UC-66 — Consultar KPIs de Funil de Marketing

**Atores:** Coordenador de Marketing, Gerente Comercial, Financeiro (leitura).
**Pré-condições:** usuário autenticado com permissão de leitura do módulo `marketing` (ou módulo com acesso cruzado, a definir).

**Fluxo Principal:**
1. Usuário acessa o relatório de funil, opcionalmente filtrando por campanha/origem/período.
2. Sistema calcula e retorna CPL, taxa de qualificação, conversão, receita atribuída/ROI, SLA de handoff, tempo de ciclo, orçado × realizado (RF-MKT-026) e custo por lead de evento (RF-MKT-027) quando aplicável ao filtro.

**Fluxo de Exceção E1 — período/filtro sem dados:**
1e. Filtro não retorna nenhum lead/campanha no critério.
2e. Sistema retorna KPIs zerados/nulos com indicação explícita de "sem dados no período", não erro nem divisão por zero.

**Pós-condições:** nenhum KPI exposto depende de campo editável manualmente (todos derivados de vínculos reais, RF-MKT-029).

---

## 5. Pontos em aberto

### 5.1 RBAC — módulo `marketing` precisa de nível `approve`?

Avaliação desta correção: **sim, para 2 ações específicas**, não para o
módulo inteiro:
- Aprovação de orçamento de campanha (RF-MKT-031) — decisão financeira
  registrada dentro do MKT.
- Aprovação de material promocional (RF-MKT-039) — governança de marca.

Recomendação: seguir o precedente de `contabilidade`/`facilities` (que já
usam `approve` para ações pontuais, não para o CRUD geral) — manter leitura/
escrita geral em `operate`, introduzir `authorizeModule('marketing',
'approve')` só nesses dois endpoints. `[VERIFICAR COM MARKETING]` se o
Coordenador de Marketing deve ter o nível `approve` por padrão ou se essa
aprovação é de outro perfil (ex.: Diretor Comercial/Financeiro operando
dentro do módulo MKT).

### 5.2 Pendências herdadas do brief (não resolvidas por este documento)

Estas seguem `[DEFINIR COM COORDENADOR]`/`[VERIFICAR COM MARKETING]` e
bloqueiam apenas a calibração de parâmetros, não a implementação estrutural
(os RFs acima já preveem os campos/constantes configuráveis):

1. SLA de handoff em dias úteis (RF-MKT-014) — valor de partida sugerido: 2.
2. Threshold de alerta de orçamento (RF-MKT-033) — valor de partida sugerido: 90%.
3. Janela de atribuição de receita (RF-MKT-010) — valor de partida sugerido: 90 dias.
4. Meta de CPL e taxa de conversão de referência (KPIs, RF-MKT-026) — sem valor de partida sugerido por este documento (é meta de negócio, não parâmetro técnico).
5. Prazo de retenção/expurgo LGPD de leads perdidos (RF-MKT-037) — não implementado nesta correção; decisão conjunta com Compliance.
6. `[VERIFICAR COM MARKETING]` decisão de saneamento de leads `converted` órfãos existentes (§2) — reabrir funil vs. flag de exceção.
7. `[VERIFICAR COM MARKETING]` se orçamentos por canal/custo por feira de `docs/comercial/02-MARKETING.md` ainda valem como referência de grandeza (não bloqueia schema, é dado de contexto).

---

## 6. Rastreabilidade

| Regra do brief | Endereçada por |
|---|---|
| BR-MKT-001 | RF-MKT-030, RF-MKT-031 |
| BR-MKT-002 | RF-MKT-034 |
| BR-MKT-003 | RF-MKT-032, RF-MKT-033 |
| BR-MKT-004 | RF-MKT-006 a RF-MKT-010, RF-MKT-023, RF-MKT-029 |
| BR-MKT-005 | RF-MKT-016, RF-MKT-017 |
| BR-MKT-006 | RF-MKT-018 |
| BR-MKT-007 | RF-MKT-011 a RF-MKT-015 |
| BR-MKT-008 | RF-MKT-001 a RF-MKT-005, migration de saneamento §2 |
| BR-MKT-009 | RF-MKT-020 a RF-MKT-025 |
| BR-MKT-010 | RF-MKT-039, RF-MKT-040 |
| BR-MKT-011 | RF-MKT-038 |
| BR-MKT-012 | RF-MKT-035 a RF-MKT-037 |
| BR-MKT-013 | Sem ação — já atendida (verificação) |
| BR-MKT-014 | §5.1 (avaliação de `approve`), sem mudança estrutural além disso |

---

*Documento produzido sob o mesmo protocolo de rigor dos blocos anteriores:
toda afirmação sobre o código atual cita arquivo; nenhuma tabela/API foi
desenhada aqui (escopo de `AdmDBA`/`ArquitetoSoftwareAPI`); pendências de
negócio marcadas explicitamente em vez de assumidas.*
