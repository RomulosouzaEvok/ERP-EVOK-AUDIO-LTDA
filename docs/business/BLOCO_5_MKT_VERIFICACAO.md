# BLOCO 5 — MARKETING (MKT): VERIFICAÇÃO DE CONFORMIDADE COM O BRIEF DE DOMÍNIO

**Autor:** Agente especialista de domínio — Marketing (papel de verificação, somente leitura)
**Data:** 2026-08-07
**Objeto verificado:** commit `2ad27fd` ("feat: implementa modulos Facilities, Marketing e Juridico (departamentos 17, 14, 16)")
**Referência:** `docs/business/briefs/BRIEF_MKT_2026-08-06.md` (14 regras `BR-MKT-001` a `BR-MKT-014`)
**Método:** leitura de migration, models, use cases, validators, rotas, controllers, tela web, `docs/comercial/02-MARKETING.md`, `docs/governance/HANDOFF_CODEX.md` e `docs/governance/TODO.md` (entradas do commit `2ad27fd`). Nenhum arquivo de código foi alterado nesta verificação.

**Achado estrutural prévio, antes da tabela regra a regra:** a implementação foi construída a partir do **esboço SQL antigo** de `docs/comercial/02-MARKETING.md` (3 tabelas em sintaxe MySQL, nunca aplicadas), como o próprio `docs/governance/HANDOFF_CODEX.md` declara ("departamento 14 não tinha nenhum código antes... baseado nas 3 tabelas em sintaxe MySQL em `docs/comercial/02-MARKETING.md`"). **Não há nenhuma referência ao `BRIEF_MKT_2026-08-06.md`** em nenhum dos arquivos entregues (migration, HANDOFF_CODEX, TODO.md, docs/comercial/02-MARKETING.md revisado). Ou seja: o pipeline formal de requisitos foi contornado por completo — a frente que implementou não leu (ou não seguiu) o brief que orienta este relatório. Isso explica a maior parte dos gaps abaixo: são regras que simplesmente não existiam na fonte usada pela implementação.

---

## 1. Tabela regra a regra

| Código | Regra (resumo) | Status | Evidência |
|---|---|---|---|
| **BR-MKT-001** | Campanha só vai para `ativa` com orçamento **aprovado** registrado | **NÃO ATENDIDA** | Não existe campo de aprovação de orçamento (`orçamento_aprovado`, `status_aprovação_orçamento`, `aprovado_por/em`) em `server/migrations/20260807-000210-create-marketing-module.cjs` nem em `server/src/models/MarketingCampaign.ts`. `UpdateCampaignUseCase.ts` (linhas 26-39) não bloqueia transição para `status: 'active'` por ausência de orçamento — qualquer campanha pode ir para `active` só com `budget` (solicitado) preenchido ou até vazio (`budget` é opcional). |
| **BR-MKT-002** | `data_fim ≥ data_início`; campanha `concluída/cancelada` imutável (exceto notas) | **PARCIAL** | Validação de datas existe: `CreateCampaignUseCase.ts:26-28` e `UpdateCampaignUseCase.ts:32-36`. Imutabilidade pós-conclusão **não existe**: `UpdateCampaignUseCase.execute` (linha 38, `return this.campaignRepository.updateCampaign(id, rest)`) aceita qualquer campo em qualquer status, inclusive `completed`/`canceled` — nenhuma checagem de `current.status`. |
| **BR-MKT-003** | Alerta ao Coordenador quando custo realizado ≥ 90%/100% do orçamento aprovado | **NÃO ATENDIDA** | Nenhum use case, controller ou job calcula `actual_cost / budget`; não há endpoint de alerta nem campo de threshold. Grep em `server/src/modules/marketing/` não retorna nenhuma ocorrência de lógica de percentual de orçamento. |
| **BR-MKT-004** | `leads_gerados`, `conversões`, `receita_atribuída`, ROI **sempre calculados** a partir dos vínculos — nunca campos editáveis | **DIVERGENTE** | O rascunho antigo que o brief pedia para abandonar (`leads_generated INT DEFAULT 0` editável) foi **recriado**: `marketing_campaigns.leads_generated`/`conversions`/`roi` são colunas armazenadas (`20260807-000210-create-marketing-module.cjs:79-81`) e **editáveis via `PUT /api/marketing/campaigns/:id`** — `campaignValidators.ts:38-40` aceita `leads_generated`, `conversions`, `roi` no `updateCampaignSchema`, sem nenhuma trava. `CreateLeadUseCase.ts:40-43` e `ChangeLeadStatusUseCase.ts:80-87` até incrementam os contadores automaticamente em alguns eventos, mas isso não impede o usuário de sobrescrever os mesmos campos manualmente pelo `PUT`, o oposto do que a regra exige ("nunca campos editáveis"). Não existe `receita_atribuída` em lugar nenhum (nem calculada nem armazenada). |
| **BR-MKT-005** | Lead exige nome + (telefone OU e-mail) + origem obrigatória | **NÃO ATENDIDA** | `leadValidators.ts:14-23` (`createLeadSchema`): só `name` é obrigatório; `email`, `phone` e `lead_source` são todos `.optional()`, sem `.refine()` cruzado exigindo pelo menos um contato. Um lead pode ser criado só com nome, sem telefone, sem e-mail e sem origem — viola a regra em dois pontos (contato e origem). |
| **BR-MKT-006** | Deduplicar por telefone/e-mail contra leads existentes **e contra `clients`** antes de criar | **NÃO ATENDIDA** | `CreateLeadUseCase.ts` (completo, linhas 33-48) só valida a existência de `campaign_id`; não há nenhuma consulta a leads existentes nem a `clients` por telefone/e-mail. Nenhum import de `ClientRepository` ou equivalente no módulo marketing. |
| **BR-MKT-007** | Lead `qualificado` deve ter `responsável_vendas` atribuído em N dias úteis (SLA), com alerta se vencido | **NÃO ATENDIDA** | Não existe o campo `responsavel_vendas`/`responsible_sales_user_id` em nenhuma camada (migration, model, validators). O handoff formal para Vendas simplesmente não existe — a única ação prevista para o vendedor é aparecer depois, indiretamente, via `converted_to_customer_id`. Sem esse campo não há como medir SLA nem apontar responsável. |
| **BR-MKT-008** | Conversão exige `converted_client_id` **válido** (não pode ser `convertido` sem cliente); transições `qualificado/em_atendimento_vendas → convertido`; `convertido` terminal | **DIVERGENTE** | Parte da regra é atendida: `ChangeLeadStatusUseCase.ts` (`VALID_TRANSITIONS`, linhas 23-29) trata `converted`/`lost` como terminais e só permite `qualified → converted`. Mas a exigência central é violada: `changeLeadStatusSchema` (`leadValidators.ts:36-39`) define `converted_to_customer_id` como **opcional** e `ChangeLeadStatusUseCase.execute` (linhas 73-76) só grava o vínculo `if (status === 'converted' && converted_to_customer_id)` — ou seja, **um lead pode virar `converted` sem nenhum `converted_to_customer_id`**, exatamente o "estado inválido" que a regra proíbe explicitamente. Confirmado também na tela (`ConvertLeadDialog`, `client/src/pages/marketing/LeadsTab.tsx:301-357`): o campo "Id do cliente" é rotulado "(opcional)" e o texto de ajuda diz "Pode ser deixado em branco e vinculado depois." O estado intermediário `em_atendimento_vendas` do brief não existe (funil simplificado para `new/contacted/qualified/converted/lost`) — decisão de simplificação não documentada como divergência do brief. |
| **BR-MKT-009** | Lead de evento nasce com `evento_id` + origem `feira_evento`; contagem de leads do evento é derivada do vínculo | **NÃO ATENDIDA** | Não existe entidade `Evento` em nenhuma camada (migration/model/use case/rota) — busca por `Evento|evento_id|MarketingEvent|marketing_events` em `server/src/modules/marketing` e `server/src/models` não retorna nada do domínio Marketing. `lead_source` tem o valor `event`, mas é só um rótulo de origem, sem vínculo a um registro de evento/feira nem contagem derivada. Todo o Processo P3 do brief (evento/feira: planejamento, checklist, orçamento, pós-evento) está ausente. |
| **BR-MKT-010** | Material só é distribuível/consumível com `aprovado = true`; nova versão nasce não aprovada | **PARCIAL** | O campo `approved` existe com `defaultValue: false` (`MarketingMaterial.ts:50`), mas: (1) `createMaterialSchema` (`materialValidators.ts:15-21`) aceita `approved: z.boolean().optional()` no `POST`, ou seja, **um material pode nascer já aprovado**, contrariando "nova versão nasce não aprovada"; (2) não existe o conceito de "distribuível/consumível" no sistema — nenhum endpoint de "baixa"/"uso" do material verifica `approved` antes de liberar, porque o módulo não modela consumo de material algum (isso é delegado inteiramente ao Almoxarifado, que por sua vez não tem o vínculo — ver BR-MKT-011). |
| **BR-MKT-011** | Material físico movimenta estoque exclusivamente pelo Almoxarifado — MKT não cria movimentação própria | **PARCIAL** | Tecnicamente não violada — o módulo MKT de fato não implementa nenhuma movimentação de estoque própria. Mas a contrapartida positiva da regra (P4.2 do brief: FK `item_estoque_id` para o item do Almoxarifado, categoria "Material Promocional") também **não existe**: `MarketingMaterial` só tem `product_id` (FK para `items.id`, material de produto), sem nenhum campo equivalente para o item físico de estoque do material promocional em si. Logo, a integração com Almoxarifado citada no brief (d.3) não foi implementada em nenhuma direção — nem para o bem nem para o mal. |
| **BR-MKT-012** | Lead armazena consentimento LGPD (flag + data + canal); rotina de expurgo de leads perdidos após X meses | **NÃO ATENDIDA** | Nenhum campo de consentimento em `marketing_leads` (migration/model/validators). Nenhuma rotina/job de anonimização ou expurgo. Como o brief classifica lead como dado pessoal captado ativamente, esta é uma lacuna de compliance, não só funcional. |
| **BR-MKT-013** | Preço promocional de campanha usa `customer_price_lists` (mecanismo de Vendas), não é entidade do MKT | **ATENDIDA** | O módulo MKT corretamente não criou nenhuma entidade de preço/promoção própria — nenhuma tabela/campo de preço em `marketing_campaigns`/`marketing_leads`/`marketing_materials`. Consistente com a regra por omissão correta. Nenhuma referência textual/anexo à promoção existe na campanha (campo livre não modelado), mas isso é um detalhe menor, não uma violação. |
| **BR-MKT-014** | RBAC: escrita restrita a permissão de Marketing; atribuição de `responsável_vendas` também operável por Vendas; identidade sempre do JWT | **PARCIAL** | RBAC básico está correto: `router.use(authenticate)` + `authorizeModule('marketing')` para leitura e `authorizeModule('marketing', 'operate')` para escrita em todas as rotas (`server/src/modules/marketing/presentation/routes/marketing.ts:29-49`), seguindo o padrão do projeto (identidade e permissão vêm do middleware/JWT, não do payload). Porém a parte da regra sobre `responsável_vendas` "visível/operável também por Vendas" é **inaplicável na prática** porque o campo não existe (ver BR-MKT-007) — não há nada para o módulo de Vendas operar. |

### Contagem
- **ATENDIDA:** 1 (BR-MKT-013)
- **PARCIAL:** 4 (BR-MKT-002, BR-MKT-010, BR-MKT-011, BR-MKT-014)
- **NÃO ATENDIDA:** 7 (BR-MKT-001, BR-MKT-003, BR-MKT-005, BR-MKT-006, BR-MKT-007, BR-MKT-009, BR-MKT-012)
- **DIVERGENTE:** 2 (BR-MKT-004, BR-MKT-008)

---

## 2. Gaps funcionais

### 2.1 Integração leads → Vendas/clientes: o funil é uma ilha com uma porta entreaberta
A pergunta central do escopo desta verificação: **o funil desemboca no módulo de Vendas existente ou é uma ilha?** Resposta: **é essencialmente uma ilha**, com um único ponto de contato frágil.

- O único vínculo com o mundo real de Vendas é `marketing_leads.converted_to_customer_id → clients.id`, e mesmo esse vínculo é **opcional** no momento da conversão (`changeLeadStatusSchema`), então um lead pode ficar marcado `converted` sem NUNCA ter um cliente associado — quebra a premissa de que "é esse vínculo que permite calcular conversão e receita por campanha sem digitação manual" (brief, P2.5).
- Não existe `responsável_vendas` (usuário do sistema) em lugar nenhum — o handoff descrito no brief como "a fronteira exata do departamento" (P2.4, BR-MKT-007) simplesmente não foi modelado. Hoje, um lead qualificado não é atribuído a ninguém de Vendas; ele só aparece na coluna "Qualificado" do Kanban (`LeadsTab.tsx`) esperando alguém de Marketing empurrá-lo manualmente para `converted`.
- Não existe criação/atualização automática de `clients` a partir da conversão — o campo `converted_to_customer_id` espera que o usuário **já saiba o id numérico** do cliente e digite manualmente (`ConvertLeadDialog`, input `type="number"` de "Id do cliente"). Não há busca, autocomplete, nem chamada a `POST /api/clients`. Isso é pior que o brief previa: o brief aceita "vendedor OU o próprio fluxo de criação de cliente" (P2.5) fazer a conversão — aqui é 100% manual, sem nenhuma ajuda de UI ou automação.
- Não há nenhum uso de `sales.user_id`/`sales.customer_id` para calcular receita atribuída, CPL, conversão real ou qualquer um dos 8 KPIs da seção (e) do brief. **Nenhum KPI da seção (e) do brief foi implementado** — nem os de funil (P1 do brief), que era a prioridade #1 declarada.

**Conclusão desta seção:** o módulo entregue é um CRUD de campanha/lead/material com um Kanban de status, sem nenhuma ponte funcional real para o módulo de Vendas que já existe no ERP. O "furo do funil pré-venda" que o brief identificava como o problema de negócio a resolver (seção f) continua existindo — agora só migrou de planilha para uma tela isolada dentro do ERP, sem fechar o ciclo.

### 2.2 Processo P3 (Evento/Feira) inteiramente ausente
Nenhuma entidade `Evento` foi criada. Um dos dois canais mais citados no contexto do departamento (feiras, ~2x/ano) não tem representação no sistema — nem para orçamento, nem para checklist, nem para contagem de leads por evento. `lead_source = 'event'` é só um rótulo textual desconectado de qualquer registro real.

### 2.3 Processo P4 (Material promocional) parcialmente feito, sem ponte com o Almoxarifado
O catálogo digital (título, tipo, versão, aprovado, arquivo) existe e cobre razoavelmente a parte "material digital" do brief. A parte de material físico (P4.2/P4.3 do brief, BR-MKT-011) — item de estoque no Almoxarifado, categoria "Material Promocional", consumo rastreado por campanha/evento — **não foi implementada em nenhuma ponta**: nem o campo de vínculo existe, nem a movimentação. O brief havia deliberadamente pedido para NÃO criar estoque paralelo; a implementação seguiu essa orientação por omissão total, não por desenho deliberado (não há nenhuma menção a essa decisão em `docs/comercial/02-MARKETING.md` revisado nem no `HANDOFF_CODEX.md`).

### 2.4 LGPD (BR-MKT-012)
Lead é dado pessoal captado ativamente (nome, e-mail, telefone) sem nenhum campo de consentimento, base legal ou canal de captação para fins de auditoria LGPD. Isso é uma lacuna de compliance que o brief já sinalizava como pendência de definição com Compliance — a implementação não colocou nem o campo estrutural (flag/data/canal) que permitiria endereçar isso depois; hoje seria necessária uma nova migration para adicionar.

### 2.5 Integração WhatsApp/n8n (d.5 do brief)
O brief pedia que o módulo "nascesse com endpoint de criação de lead apto a receber essa integração (autenticação de serviço)". `POST /api/marketing/leads` existe, mas usa o mesmo middleware `authenticate` (JWT de usuário) das demais rotas — não há autenticação de serviço/API key para uso por integração backend-to-backend (n8n), nem menção a isso em nenhum lugar da entrega. Não é bloqueante hoje (a integração n8n em si está fora de escopo), mas a "porta pronta" que o brief pedia como entregável do P1 não existe.

---

## 3. Problemas de regra de negócio

1. **Transições de status do funil de lead**: a máquina de estados implementada (`new → contacted → qualified → converted/lost`) é coerente e imutável nos terminais, **mas permite o estado inválido central que o brief queria evitar**: `converted` sem `converted_client_id`. Esse é o problema de regra de negócio mais grave da entrega, porque invalida a base de cálculo de qualquer KPI de conversão/receita futuro.
2. **Campanha × orçamento**: não há noção de orçamento *aprovado* separado de orçamento *solicitado* (só existe `budget`, um único campo), então BR-MKT-001 (não iniciar sem aprovação) é estruturalmente impossível de implementar sem alterar o schema — não é um bug de use case, é uma lacuna de modelagem.
3. **ROI/leads_generated/conversions editáveis por `PUT`**: viola diretamente o "nunca campos editáveis" da BR-MKT-004 e reabre exatamente o padrão de dado não confiável que o brief pedia para eliminar explicitamente ("Elimina o padrão do rascunho SQL antigo"). Qualquer relatório futuro de CPL/ROI construído sobre `marketing_campaigns.leads_generated` estará sujeito a divergência manual sem trilha de auditoria de por que o número mudou (fora do log de auditoria genérico `logAction`, que registra o `PUT` mas não distingue incremento automático de edição manual).
4. **Ausência de threshold de alerta de orçamento (BR-MKT-003)**: sem isso, a campanha pode estourar 300% do orçamento sem que ninguém no sistema seja avisado — o brief era explícito que isso deveria gerar alerta (não bloqueio, mas alerta).
5. **Falta de validação cruzada em Lead**: `name` sozinho basta para criar um lead — isso é abaixo até do "básico de funil" que o próprio brief descreve como prática de mercado mínima (BR-MKT-005).

---

## 4. Veredito

## **GAPS CRÍTICOS**

A implementação entrega um CRUD funcional e tecnicamente limpo (Clean Architecture, RBAC, testes unitários, upload de arquivo) para as 3 entidades do rascunho antigo, mas **não foi construída a partir do brief de domínio combinado** — foi construída a partir de um documento anterior e mais simples que o brief substituía. Como resultado:

- A fronteira mais crítica do módulo, definida pelo próprio brief como "a fronteira exata do departamento" (handoff lead → Vendas com responsável e SLA), **não existe**.
- A regra que fecha o funil de forma confiável (conversão exige cliente vinculado) **existe no código mas não é obrigatória**, permitindo o próprio estado inválido que o brief nomeava explicitamente.
- Um processo inteiro do brief (Evento/Feira, P3) está ausente, apesar de feiras serem um dos dois canais de maior custo unitário do departamento (~R$ 30.000/evento).
- As métricas de campanha (leads/conversões/ROI) voltaram a ser campos editáveis manualmente — o oposto do que o brief pedia para corrigir em relação ao rascunho antigo.
- Nenhum dos 8 KPIs da seção (e) do brief foi implementado, incluindo os que o brief priorizava como P1 (CPL, taxa de qualificação, conversão, SLA de handoff).

Nada disso é P0 fiscal/legal (o próprio brief já avisava que Marketing não teria P0 legal), mas o valor comercial que justificava a prioridade P1 do brief — "fechar o furo do funil pré-venda" — não foi entregue: o funil ainda não fecha, porque o vínculo lead→cliente é opcional e não há responsável de Vendas.

### Lista priorizada do que precisa ser complementado

**P1 — sem isso o módulo não cumpre a promessa central do brief:**
1. Tornar `converted_to_customer_id` obrigatório na transição para `converted` (fecha BR-MKT-008/BR-MKT-004 na prática).
2. Adicionar `responsavel_vendas` (FK `users.id`) ao lead + regra de exigência a partir de `qualified` + campo de data de qualificação para medir SLA (BR-MKT-007).
3. Adicionar validação cruzada em `createLeadSchema`: exigir pelo menos `email` OU `phone`, e tornar `lead_source` obrigatório (BR-MKT-005).
4. Implementar deduplicação contra `marketing_leads` abertos e contra `clients` na criação (BR-MKT-006).
5. Implementar os KPIs de funil (CPL, taxa de qualificação, conversão, SLA de handoff) — nenhum existe hoje.

**P2 — completa o ciclo descrito no brief:**
6. Modelar `Evento`/feira (BR-MKT-009) — mínimo viável: nome, datas, campanha vinculada, `evento_id` em `marketing_leads`, orçamento e custo realizado.
7. Separar `budget` (solicitado) de um campo de aprovação explícito (`orçamento_aprovado` + `status_aprovação` + `aprovado_por/em`) e bloquear transição para `active` sem essa aprovação (BR-MKT-001).
8. Alerta de 90%/100% de orçamento realizado (BR-MKT-003) — pode ser um campo calculado exposto na listagem, não precisa de job assíncrono.
9. Tornar `leads_generated`/`conversions`/`roi` somente-leitura via API (remover de `updateCampaignSchema`) e calculá-los a partir dos vínculos reais (join lead→campanha, lead→cliente→vendas) em vez de contadores incrementais soltos (BR-MKT-004).
10. Bloquear edição de campanha `completed`/`canceled` exceto campo de notas (BR-MKT-002).

**P3 — conveniência/compliance, pode esperar mais um ciclo:**
11. Campos de consentimento LGPD no lead (flag/data/canal) — ao menos o campo estrutural, mesmo sem rotina de expurgo ainda (BR-MKT-012).
12. Vínculo `item_estoque_id` em `MarketingMaterial` para material físico no Almoxarifado (BR-MKT-011/P4.2).
13. Restringir `approved: true` no `POST /api/marketing/materials` (nova versão sempre nasce não aprovada — só endpoint de aprovação dedicado deveria poder marcar `true`) (BR-MKT-010).
14. Autenticação de serviço na rota de criação de lead para viabilizar a futura integração WhatsApp/n8n (d.5).

---

*Verificação produzida em modo somente leitura — nenhum arquivo de código, migration, model, rota ou tela foi alterado. Toda afirmação cita arquivo e, quando aplicável, linha.*
