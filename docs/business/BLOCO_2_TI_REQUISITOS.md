# BLOCO 2 — Módulo TI (Tecnologia da Informação) — Requisitos Formais

**Departamento:** 13 — TI, conforme `docs/00-ESTRUTURA_ORGANIZACIONAL.md`
(linha 42: "13 | TI | TI | Analista de TI").
**Insumo:** `docs/business/briefs/BRIEF_TI_2026-08-06.md` (seções (a)-(f):
5 processos P1-P5, 8 entidades novas, 18 regras BR-TI-001 a 018,
6 integrações internas, 11 KPIs, priorização P0/P1/P2, 9 itens
`[VERIFICAR COM ANALISTA DE TI DA EMPRESA]`).
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-07.
**Status:** 🟡 Especificação de requisitos pronta para modelagem de
banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código foi criado
neste passo** — TI não existe hoje em `server/src/` (model, rota ou
use-case dedicado), exceto pela reutilização já verificada de `Asset`
(`asset_type: 'it' | 'license'`, `license_expires_at`) e `MaintenanceOrder`.

**Prefixo de módulo:** `TI` — não colide com os prefixos existentes em
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` (AUT, VEN, COM, EST, PRD, QUA,
FIN, PAT, RH, REL, INT) nem com `SST` (Bloco 1, 2026-08-06). É um prefixo
novo e legítimo: TI é um domínio próprio (departamento 13), sem sobreposição
funcional com nenhum dos módulos já catalogados — a única sobreposição de
dados é deliberada e documentada (visão de `Asset`/`MaintenanceOrder`, nunca
tabela paralela, BR-TI-008). Quando este bloco for consolidado pelo
`documentador`, uma nova seção "14. Tecnologia da Informação (RF-TI)" deve
ser adicionada ao índice executivo.

**Numeração de Casos de Uso:** o último UC formal registrado é UC-48 (Bloco
1 SST, `docs/business/BLOCO_1_SST_REQUISITOS.md`). Os casos de uso deste
bloco continuam a partir de **UC-49**, sem reaproveitar nem colidir com
números existentes. Quando implementados, o programador deve migrá-los para
`docs/projeto/04-USE_CASES.md`.

**Catálogo RBAC verificado:** `server/src/shared/domain/accessModules.ts`
tem hoje **31 chaves** (contadas na leitura real do arquivo em 2026-08-07:
`dashboard`, `produtos`, `contagens`, `vendas`, `clientes`, `compras`,
`requisicoes`, `fornecedores`, `comex`, `producao`, `bom`, `mrp`,
`chao_de_fabrica`, `centros_de_trabalho`, `qualidade`, `laboratorio`,
`engenharia`, `estoque`, `recebimento`, `expedicao`, `patrimonio`,
`manutencao`, `garantia`, `rh`, `sst`, `rastreabilidade`, `financeiro`,
`relatorios.producao`, `relatorios.compras`, `relatorios.custos`,
`relatorios.financeiro`) — **`ti` ainda não existe**. O brief menciona "32
chaves após rh e sst"; a contagem exata neste bloco é 31 no commit atual —
divergência de 1 unidade sinalizada para não propagar um número
desatualizado; o que importa (chave `ti` ausente) é confirmado.

---

## 1. Requisitos Funcionais (RF-TI)

Cada RF referencia o(s) processo(s) do brief (P1-P5) e a(s) regra(s) de
negócio `BR-TI-NNN` aplicável(is). Prioridade conforme seção (f) do brief.

### 1.1 Helpdesk — Chamados de TI (Processo P1)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-001 | Cadastro de **ItTicketCategory** (catálogo leve, editável sem deploy): nome, descrição, prioridade padrão, ativo/inativo. Seed inicial: hardware, software, rede, e-mail, sistema ERP, telefonia, acesso, outros | P0 | processo P1.1 |
| RF-TI-002 | Abertura de **ItTicket** por qualquer usuário autenticado: assunto, descrição, categoria, ativo relacionado (opcional, busca por tag/QR do patrimônio), urgência percebida; `requester_id` sempre do JWT, nunca do payload | P0 | BR-TI-001, BR-TI-002 |
| RF-TI-003 | Abertura em nome de terceiro (`opened_on_behalf_of` → employees) restrita a usuário com módulo `ti` nível `operate` (atendimento por telefone/presencial) | P0 | BR-TI-002 |
| RF-TI-004 | Triagem implícita: ao assumir o chamado (`assigned_to`) e mudar para `in_progress`, o analista confirma/ajusta categoria e prioridade (`impact` × `urgency` → matriz 3×3 simplificada), sem exigir passo separado obrigatório | P0 | processo P1.2 |
| RF-TI-005 | Reclassificação de prioridade pelo analista com histórico da mudança preservado (quem, quando, de/para) | P0 | BR-TI-007 |
| RF-TI-006 | Transições de status controladas: `open→in_progress\|canceled`; `in_progress→waiting\|resolved`; `waiting→in_progress`; `resolved→closed\|in_progress` (reabertura); `closed→in_progress` somente até N dias após `closed_at` (parametrizável, sugestão 7) | P0 | BR-TI-003 |
| RF-TI-007 | Vínculo opcional do chamado a **MaintenanceOrder** quando o problema exige intervenção física; chamado entra em `waiting` até a conclusão da manutenção, sem duplicar o fluxo de manutenção | P0 | BR-TI-009 |
| RF-TI-008 | Campo `solution` obrigatório para transição a `resolved`; `closed` exige passagem por `resolved` (exceto `canceled`) | P0 | BR-TI-004 |
| RF-TI-009 | Cálculo de SLA na abertura (`sla_response_due_at`, `sla_resolution_due_at`) a partir de tabela de prioridade parametrizável (não hard-code); status `waiting` pausa o cronômetro de resolução, acumulando `waiting_minutes` | P0 | BR-TI-005 |
| RF-TI-010 | Estouro de SLA apenas sinaliza (flag/relatório), nunca bloqueia a operação do chamado | P0 | BR-TI-005 |
| RF-TI-011 | Auto-close: chamado `resolved` sem confirmação do solicitante fecha automaticamente após N dias úteis (parametrizável, sugestão 3) | P1 | BR-TI-006 |
| RF-TI-012 | Confirmação do solicitante com avaliação de satisfação (1-5) opcional ao fechar o chamado | P1 | processo P1.5 |
| RF-TI-013 | Reabertura do próprio chamado pelo solicitante dentro do prazo de reabertura (RF-TI-006), reativando o mesmo registro em vez de criar novo | P1 | BR-TI-003 |
| RF-TI-014 | **ItTicketComment**: qualquer envolvido no chamado (solicitante nos próprios chamados; `ti:operate` nos demais) pode comentar; nota interna (`is_internal`) visível apenas para quem tem módulo `ti` | P0 | processo P1, entidade (b).3 |
| RF-TI-015 | Qualquer usuário autenticado acompanha/comenta **apenas os próprios** chamados sem precisar do módulo `ti`; gestão da fila completa (triar, atribuir, resolver, fechar, relatórios, chamados de terceiros) exige módulo `ti` nível `operate` | P0 | BR-TI-001 |
| RF-TI-016 | Nenhum `ItTicket` é apagado (hard delete); cancelamento usa `status='canceled'`, coerente com o padrão do projeto de não ter soft delete genérico | P0 | CLAUDE.md §7 |

### 1.2 Termo de Responsabilidade de Equipamento (Processo P2)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-017 | Registro de **ItResponsibilityTerm** (entrega): seleção de `asset` (`asset_type='it'`), funcionário destinatário, snapshot de condição/acessórios, tipo de aceite (`physical_signature`\|`digital_ack`), upload do termo assinado (reutiliza infraestrutura Multer existente) | P0 | processo P2.1 |
| RF-TI-018 | Ao confirmar a entrega, atualização automática de `Asset.responsible_id` e `Asset.location` — sem edição manual paralela do asset fora do termo | P0 | BR-TI-010 |
| RF-TI-019 | Invariante: no máximo 1 `ItResponsibilityTerm` com `status='active'` por asset; nova entrega ao mesmo asset exige encerrar o termo vigente antes | P0 | BR-TI-010 |
| RF-TI-020 | Registro de devolução: condição de retorno (`ok`\|`damaged`\|`incomplete`), observações; encerra o termo (`status='returned'`) e reatribui `Asset.responsible_id` a TI ou ao próximo responsável | P0 | processo P2.3 |
| RF-TI-021 | Devolução com condição `damaged` dispara (ou referencia) abertura de `ItTicket`/`MaintenanceOrder` para o asset | P1 | processo P2.3 |
| RF-TI-022 | Ficha "equipamentos por funcionário" (termos `active` agrupados por funcionário/departamento), consultável a qualquer momento | P1 | KPI seção (e) |
| RF-TI-023 | Bloqueio de desligamento de funcionário com termo `active` sem tratamento (devolução registrada ou termo marcado `lost` com justificativa); listagem de termos pendentes exposta ao processo de offboarding (P4) | P0 | BR-TI-011 |

### 1.3 Licenças de Software (Processo P3)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-024 | Extensão **ItSoftwareLicenseDetail** 1:1 de `Asset` (`asset_type='license'`, FK única): fornecedor, tipo (`perpetual`\|`subscription`\|`free`), nº de assentos, custo, ciclo de cobrança, `license_key` (acesso restrito), `renewal_date` (distinta de `assets.license_expires_at`, que permanece a data canônica de vencimento) | P1 | BR-TI-008 |
| RF-TI-025 | Alocação de assentos (**ItLicenseSeat**, n:n leve funcionário × licença) com `assigned_at`/`revoked_at`; relatório "quem usa o quê" e ociosidade de assentos | P1 | processo P3.2 |
| RF-TI-026 | Bloqueio de alocação de novo assento quando `ItLicenseSeat` ativos já atingiu `seats` contratado; alerta ao atingir 100% de ocupação | P1 | BR-TI-015 |
| RF-TI-027 | `license_key` mascarada em qualquer listagem/consulta padrão; exibição em claro restrita a módulo `ti` (qualquer nível) ou `role='admin'`, com toda visualização auditada (log de leitura) | P0 | BR-TI-014 |
| RF-TI-028 | Alerta de renovação em janelas parametrizáveis antes de `license_expires_at` (sugestão 30/15/7 dias), notificando TI | P1 | BR-TI-016 |
| RF-TI-029 | Visão derivada "expirada" para licença com `license_expires_at` vencida sem renovação registrada (sem alterar o dado-fonte do asset) | P1 | BR-TI-016 |
| RF-TI-030 | Renovação de licença com custo, ou reposição de equipamento, gera **Requisição de Compra** no módulo existente (`/api/purchase-requisitions`) — TI nunca compra fora do fluxo de suprimentos | P1 | BR-TI-015, integração (d) — Compras |

### 1.4 Solicitações de Acesso — Onboarding/Offboarding (Processo P4)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-031 | Registro de **ItAccessRequest** tipo `grant` (admissão): funcionário, departamento, perfil de acesso sugerido, e-mail corporativo, equipamentos necessários; `requested_by` sempre do JWT | P1 | processo P4.1 |
| RF-TI-032 | Registro de **ItAccessRequest** tipo `change` (mudança de função/transferência de departamento): novo perfil de acesso solicitado | P1 | processo P4.2 |
| RF-TI-033 | Registro de **ItAccessRequest** tipo `revoke` (desligamento) com `checklist` estruturado (JSONB): usuário desativado, e-mail revogado, equipamentos recolhidos, arquivos transferidos | P0 | BR-TI-012 |
| RF-TI-034 | `grant`/`change` exigem aprovação (módulo `ti` nível `approve`, ou gestor do departamento — desenho de UX final a decidir com arquitetos, ver §5.2) antes da execução; `revoke` por desligamento dispensa aprovação prévia | P0 | BR-TI-012 |
| RF-TI-035 | Execução de `revoke` por desligamento com meta de mesmo dia; painel de TI exibe idade da solicitação pendente para priorização | P0 | BR-TI-012, KPI "offboarding no prazo" |
| RF-TI-036 | Execução da solicitação apenas referencia (FK/registro de evidência) as operações reais já auditadas (`PUT /api/users/:id/access-profile`, desativação de usuário, `logAction`) — a solicitação não recria nem duplica o `AuditLog` | P0 | BR-TI-013 |
| RF-TI-037 | Bloqueio de execução de `revoke` enquanto houver `ItResponsibilityTerm` ativo do funcionário sem tratamento (reaproveita RF-TI-023) | P0 | BR-TI-011, BR-TI-012 |
| RF-TI-038 | Status da solicitação: `pending → approved → done` (+ `rejected`, `canceled`); nenhuma solicitação é apagada | P1 | processo P4, entidade (b).7 |

### 1.5 Backup e Continuidade (Processo P5)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-039 | Registro de **ItBackupLog** por execução de backup (manual ou automatizado via script pós-cron): data/hora, tipo (`daily`\|`weekly`\|`monthly`\|`restore_test`), alvo (banco/uploads), destino, tamanho, sucesso/falha, mensagem de erro | P1 | processo P5.1 |
| RF-TI-040 | `ItBackupLog` com `success=false` gera automaticamente `ItTicket` `urgent` na categoria "sistema ERP" | P1 | BR-TI-017 |
| RF-TI-041 | Ausência de registro de backup diário nas últimas 26h gera alerta (mesmo mecanismo do RF-TI-040 ou painel de TI) | P1 | BR-TI-017 |
| RF-TI-042 | Registro de teste de restore (`backup_type='restore_test'`) com verificação mínima mensal; painel de TI exibe dias desde o último teste | P1 | BR-TI-018 |

### 1.6 Transversal — RBAC, KPIs e Parametrização

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-TI-043 | Nova chave `ti` no catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`), com níveis `operate` (atender fila, executar termos/licenças/acessos) e `approve` (aprovar `grant`/`change`, cancelar/excluir) | P0 | integração (d) — RBAC, §5.1 |
| RF-TI-044 | Exceção de auto-serviço: abertura e acompanhamento do próprio chamado (RF-TI-002, RF-TI-014) funcionam para **qualquer usuário autenticado**, independentemente de possuir o módulo `ti` — desenho de rota a decidir com arquitetos (§5.1) | P0 | BR-TI-001 |
| RF-TI-045 | Painel/KPIs de TI: chamados abertos×resolvidos, tempo médio de 1ª resposta/resolução por prioridade, % reabertos, satisfação média, ranking de categorias, equipamentos por funcionário, licenças a vencer em 30 dias, ocupação de assentos, offboarding no prazo, backup em dia — todos derivados das entidades da seção 2, sem tabela adicional, no padrão de dashboard já existente | P2 | seção (e) do brief |
| RF-TI-046 | Todos os prazos/janelas hoje sugeridos no brief (SLA por prioridade, dias de auto-close, dias de reabertura, janelas de alerta de licença, frequência de teste de restore, retenção de backup) são **parametrizáveis em configuração**, nunca hard-coded — ver lista consolidada em §6 | P0 | BR-TI-005, 006, 016, 018; itens `[VERIFICAR COM ANALISTA DE TI DA EMPRESA]` |

**Total: 46 RF-TI catalogados** (24 P0, 18 P1, 4 P2).

---

## 2. Entidades — Referência Rápida (do brief, seção b)

Não há redesenho de entidade neste bloco — a modelagem de campos é
responsabilidade do `AdmDBA`. Lista de âncora para rastreabilidade:

| Entidade | Tipo | Observação |
|---|---|---|
| `ItTicket` | nova | núcleo do helpdesk (RF-TI-002 a 016, 040-041) |
| `ItTicketCategory` | nova | cadastro leve (RF-TI-001) |
| `ItTicketComment` | nova | andamento/histórico (RF-TI-014) |
| `ItResponsibilityTerm` | nova | termo de responsabilidade (RF-TI-017 a 023) |
| `ItSoftwareLicenseDetail` | nova | extensão 1:1 de `Asset` (RF-TI-024, 027) |
| `ItLicenseSeat` | nova | alocação n:n licença×funcionário (RF-TI-025, 026) |
| `ItAccessRequest` | nova | processo grant/change/revoke (RF-TI-031 a 038) |
| `ItBackupLog` | nova | evidência de backup (RF-TI-039 a 042) |
| `Asset` (`server/src/models/Asset.ts`) | reutilizada | inventário TI/licença — **não duplicar** (BR-TI-008) |
| `MaintenanceOrder` | reutilizada | manutenção física de equipamento TI (RF-TI-007) |
| `User`, `AccessProfile`, `AccessProfilePermission` | reutilizada | tecnologia RBAC (RF-TI-034, 036, 043, 044) |
| `PurchaseRequisition` | reutilizada | renovação/reposição via compras (RF-TI-030) |
| `AuditLog` | reutilizada | trilha de execução de acesso (RF-TI-036) |

---

## 3. Requisitos Não Funcionais Específicos de TI (RNF-TI)

Este documento **não duplica** `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`.
Abaixo, apenas o que é específico do domínio TI e não está coberto pelo
catálogo geral.

| RNF | Descrição | Referência geral relacionada |
|---|---|---|
| RNF-TI-01 | `license_key` nunca trafega em claro em listagens/relatórios padrão; qualquer endpoint que a exponha em claro exige módulo `ti` ou `role='admin'` e gera registro de log de **leitura** (não apenas escrita) — chave com valor financeiro/contratual | Estende RNF geral §2 (RBAC + AuditLog, hoje focado em ações de escrita) |
| RNF-TI-02 | O gate de auto-serviço do helpdesk (qualquer usuário abre/acompanha o próprio chamado) deve continuar funcionando mesmo que o usuário não possua nenhum módulo RBAC atribuído — é o único fluxo do sistema com essa característica além do próprio login; a autorização é por **posse do recurso** (o registro pertence ao usuário), não por módulo | Novo — não coberto no RNF geral, que assume `authorizeModule` como regra (RNF geral §2) |
| RNF-TI-03 | SLA de resposta/resolução do helpdesk é sinalização, não trava operacional: o sistema nunca deve impedir a transição de status de um chamado por estouro de SLA — apenas registrar/relatar (evita paralisar o único atendente em bloqueio autoimposto) | Distinto de RNF geral §1 (desempenho de API) — este é requisito de comportamento, não de latência |
| RNF-TI-04 | Ausência de registro de `ItBackupLog` diário nas últimas 26h deve ser detectável mesmo sem execução manual (verificação agendada ou verificação-ao-acessar o painel de TI, mesmo padrão de "re-checagem ao reabrir a tela" adotado em outros módulos) | RNF geral §3 (disponibilidade/confiabilidade) — aqui aplicado à evidência de backup, não à infraestrutura em si |
| RNF-TI-05 | Todos os parâmetros de tempo listados em RF-TI-046 (§6) devem ser configuráveis sem deploy de código (tabela de configuração ou variável de ambiente validada no boot) — nenhum deles pode ser uma constante fixa no código-fonte | RNF geral §2 ("Segredos obrigatórios sem default fraco" é o padrão análogo já aplicado a credenciais; aqui estendido a parâmetros de negócio) |

---

## 4. Casos de Uso — Processos P0

Atores conforme perfis reais do projeto: perfil de acesso configurável por
módulo (`operate`/`approve`), papel funcional "Analista de TI" / "Suporte
terceirizado" (ambos mapeados ao módulo `ti`), e "Solicitante" (qualquer
usuário autenticado, sem exigência de módulo — BR-TI-001). O módulo de
acesso `ti` **ainda não existe** no catálogo `ACCESS_MODULES`
(`server/src/shared/domain/accessModules.ts`, hoje com 31 chaves) — ver §5.1,
pendência para arquitetos.

### UC-49: Abrir, Atender e Encerrar Chamado de TI (Helpdesk)

**Ator principal:** Solicitante (qualquer usuário autenticado) na abertura;
Analista de TI / Suporte terceirizado (perfil `ti`, nível `operate`) no
atendimento.
**Atores secundários:** nenhum obrigatório (fila única, sem escalonamento).

**Pré-condições:**
- Usuário autenticado (qualquer perfil) para abrir chamado.
- Usuário com módulo `ti` nível `operate` para triar/atender/fechar
  chamados de terceiros.
- `ItTicketCategory` cadastrada (seed inicial disponível).

**Fluxo Principal:**
1. Solicitante abre `ItTicket` informando assunto, descrição, categoria e,
   opcionalmente, ativo relacionado e urgência percebida (RF-TI-002);
   `requester_id` vem do JWT.
2. Sistema calcula `sla_response_due_at`/`sla_resolution_due_at` a partir da
   prioridade padrão da categoria (RF-TI-009).
3. Analista de TI assume o chamado (`assigned_to`), confirma/ajusta
   categoria e prioridade (`impact` × `urgency`) e move para `in_progress`
   — triagem implícita ao atendimento (RF-TI-004).
4. Analista atende; se depende de terceiro/peça/usuário, move para
   `waiting`, pausando o cronômetro de resolução (RF-TI-009).
5. Analista registra `solution` (obrigatória) e move para `resolved`
   (RF-TI-008).
6. Solicitante confirma a resolução, opcionalmente avalia satisfação
   (1-5) (RF-TI-012) → chamado `closed`.

**Fluxos Alternativos:**
- **A1 (Vira ordem de manutenção):** problema exige intervenção física no
  equipamento → analista gera `MaintenanceOrder` vinculada ao `asset_id`
  do chamado; chamado permanece `waiting` até a conclusão da manutenção,
  que devolve o chamado a `in_progress` (RF-TI-007/BR-TI-009).
- **A2 (Auto-close):** chamado `resolved` sem confirmação do solicitante
  em N dias úteis (parametrizável) fecha automaticamente (RF-TI-011).
- **A3 (Reabertura):** solicitante reabre o próprio chamado `resolved`/
  `closed` dentro do prazo de reabertura; sistema reativa o mesmo registro
  em `in_progress` em vez de criar um novo (RF-TI-013/BR-TI-003).
- **A4 (Abertura por telefone/presencial):** analista com módulo `ti`
  registra o chamado em nome do solicitante (`opened_on_behalf_of`)
  (RF-TI-003).

**Fluxo de Exceção:**
- **E1 (Tentativa de fechar sem passar por `resolved`):** sistema rejeita
  a transição direta `in_progress`/`waiting → closed` com "O QUE" (não é
  possível fechar diretamente), "POR QUE" (falta registrar a solução e
  passar por `resolved`), "O QUE FAZER" (registrar `solution` e mover para
  `resolved` primeiro) — BR-TI-004.
- **E2 (Usuário sem módulo `ti` tenta atender/fechar chamado de terceiro):**
  sistema retorna 403; usuário só enxerga e comenta os próprios chamados
  (BR-TI-001, RNF-TI-02).
- **E3 (Tentativa de reabertura fora do prazo):** sistema bloqueia a
  reabertura de chamado `closed` há mais de N dias e orienta a abrir um
  novo chamado referenciando o anterior (BR-TI-003).
- **E4 (Estouro de SLA):** sistema **não bloqueia** nenhuma transição;
  apenas sinaliza o chamado como fora do SLA no painel/relatório
  (RNF-TI-03/BR-TI-005).

**Pós-condições:**
- Chamado com histórico completo de status, comentários e SLA calculado.
- Se aplicável, `MaintenanceOrder` vinculada e rastreável a partir do
  chamado.
- KPIs de helpdesk (seção (e) do brief) recalculados.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Fechamento direto sem solução é bloqueado
  Dado um chamado "ItTicket" em status "in_progress"
  Quando o Analista de TI tenta mover o chamado direto para "closed"
  Então o sistema rejeita a transição
  E exige o preenchimento do campo "solution" e a transição por "resolved"

Cenário: Usuário comum não gerencia chamado de terceiro
  Dado um chamado aberto por outro usuário
  E o usuário autenticado não possui o módulo "ti"
  Quando ele tenta assumir ou fechar esse chamado
  Então o sistema retorna 403
  E o usuário continua podendo ver/comentar apenas os próprios chamados
```

---

### UC-50: Entregar e Devolver Equipamento com Termo de Responsabilidade

**Ator principal:** Analista de TI (perfil `ti`, nível `operate`).
**Atores secundários:** Funcionário destinatário (assinatura/aceite),
RH (consulta na ficha do funcionário e no offboarding).

**Pré-condições:**
- Usuário autenticado com módulo `ti` nível `operate`.
- Asset (`asset_type='it'`) existe e não tem termo `active` vigente.
- Funcionário existe em `employees` e está `active`.

**Fluxo Principal:**
1. Analista de TI seleciona o asset e o funcionário destinatário, registra
   condição/acessórios na entrega (RF-TI-017).
2. Sistema valida que não há `ItResponsibilityTerm` `active` para esse
   asset (RF-TI-019/BR-TI-010); se houver, bloqueia (ver E1).
3. Analista escolhe tipo de aceite (`physical_signature`\|`digital_ack`) e
   anexa o termo assinado (upload).
4. Ao confirmar, sistema cria o termo `active` e atualiza
   `Asset.responsible_id`/`Asset.location` automaticamente (RF-TI-018).
5. Termo passa a aparecer na ficha do funcionário e do asset (RF-TI-022).
6. Em devolução: analista registra condição de retorno (`ok`\|`damaged`\|
   `incomplete`), sistema encerra o termo (`status='returned'`) e reatribui
   `Asset.responsible_id` (RF-TI-020).

**Fluxos Alternativos:**
- **A1 (Devolução com avaria):** condição `damaged` dispara/associa um
  `ItTicket` ou `MaintenanceOrder` para o asset (RF-TI-021).
- **A2 (Extravio):** termo é marcado `lost` com justificativa obrigatória,
  em vez de `returned` — usado quando não há devolução física possível
  (ex.: perda, roubo).

**Fluxo de Exceção:**
- **E1 (Tentativa de segunda entrega ativa do mesmo asset):** sistema
  bloqueia a criação de novo termo com "O QUE" (não é possível entregar
  este equipamento), "POR QUE" (já existe termo ativo para o funcionário
  X desde DD/MM/AAAA), "O QUE FAZER" (registrar a devolução do termo
  vigente antes de uma nova entrega) — BR-TI-010.
- **E2 (Desligamento com termo ativo sem tratamento):** RH tenta processar
  desligamento; sistema/integração bloqueia com referência ao(s) termo(s)
  `active` pendente(s) do funcionário, exigindo devolução ou marcação
  `lost` com justificativa antes de prosseguir (RF-TI-023/BR-TI-011).
- **E3 (Upload de termo assinado falha ou está ausente):** sistema permite
  salvar a entrega em rascunho, mas não confirma como `active` sem o
  documento anexado quando `acceptance_type='physical_signature'`
  `[VERIFICAR COM ANALISTA DE TI DA EMPRESA]` se aceite digital dispensa
  upload de PDF.

**Pós-condições:**
- Termo `active` ou `returned`/`lost` com trilha completa.
- `Asset.responsible_id`/`location` sempre consistente com o termo vigente.
- Offboarding (UC-51) capaz de listar pendências a partir daqui.

---

### UC-51: Processar Solicitação de Acesso (Onboarding/Change/Offboarding)

**Ator principal:** RH (abre a solicitação) / Gestor do departamento ou
Analista de TI (aprova, conforme desenho a definir — §5.2) / Analista de TI
(executa).
**Atores secundários:** Funcionário (objeto da solicitação).

**Pré-condições:**
- Usuário autenticado; abertura de `grant`/`change` requer evento de RH
  (admissão/transferência) — manual ou automático, a confirmar (§5.2, item
  de integração (d) do brief).
- `revoke` requer evento de desligamento no RH.

**Fluxo Principal:**
1. RH (ou o próprio fluxo de admissão) abre `ItAccessRequest` tipo `grant`:
   funcionário, departamento, perfil de acesso sugerido, e-mail
   corporativo, equipamentos necessários (RF-TI-031).
2. Aprovador (módulo `ti` nível `approve`, ou gestor do departamento — a
   decidir) aprova a solicitação, ficando `approved_by`/`approved_at`
   registrados a partir do JWT (RF-TI-034).
3. Analista de TI executa: cria usuário, vincula `access_profile`
   (`PUT /api/users/:id/access-profile`), entrega equipamento via UC-50
   quando aplicável; marca `executed_by`/`executed_at`/`execution_notes`
   (RF-TI-036).
4. Solicitação passa a `done`.

**Fluxos Alternativos:**
- **A1 (`change` — mudança de função):** transferência de departamento gera
  solicitação `change` com novo perfil sugerido; mesmo ciclo de aprovação e
  execução (RF-TI-032).
- **A2 (`revoke` — offboarding):** desligamento gera solicitação `revoke`
  com `checklist` (usuário desativado, e-mail revogado, equipamentos
  recolhidos, arquivos transferidos); **dispensa aprovação prévia** e tem
  meta de execução no mesmo dia do desligamento (RF-TI-033/RF-TI-035/
  BR-TI-012).
- **A3 (Rejeição):** aprovador rejeita `grant`/`change` com motivo; status
  `rejected`, sem execução.

**Fluxo de Exceção:**
- **E1 (Execução de `revoke` bloqueada por termo ativo):** sistema impede
  marcar o item "equipamentos recolhidos" do checklist como concluído
  enquanto houver `ItResponsibilityTerm` `active` do funcionário sem
  tratamento; exibe "O QUE"/"POR QUE"/"O QUE FAZER" apontando o(s) termo(s)
  pendente(s) (RF-TI-037/BR-TI-011).
- **E2 (Tentativa de aprovar a própria solicitação — spoofing):**
  `approved_by`/`executed_by` sempre do JWT; sistema rejeita qualquer valor
  vindo do payload da requisição para esses campos (BR-TI-002 aplicado por
  analogia ao padrão anti-spoofing geral do sistema).
- **E3 (Offboarding não executado no mesmo dia):** sistema não bloqueia
  (não há trava técnica capaz de impedir o desligamento em si), mas o
  painel de TI evidencia a solicitação `revoke` pendente com o tempo
  decorrido, alimentando o KPI "offboarding no prazo" com dado real de
  atraso, não silenciado (RF-TI-035).

**Pós-condições:**
- `ItAccessRequest` `done`/`rejected`/`canceled`, nunca apagada.
- Execução referenciando as operações reais já auditadas por `logAction` —
  nenhum registro de autorização duplicado fora do RBAC existente
  (RF-TI-036/BR-TI-013).

---

## 5. Decisões e Pendências para Arquitetos

### 5.1 Auto-serviço de chamados × `authorizeModule('ti')`

**Problema:** o padrão do sistema é `authorizeModule(<módulo>)` bloqueando
a rota inteira para quem não tem o módulo. BR-TI-001 exige o oposto para
uma fatia específica: qualquer usuário autenticado precisa abrir e
acompanhar os **próprios** chamados, sem ter (nem precisar ter) o módulo
`ti`.

**Proposta deste bloco (a validar/desenhar pelo arquiteto):**
- Rotas de auto-serviço fora do gate `authorizeModule('ti')`, protegidas
  apenas por `authenticate`, com escopo de dados restrito ao próprio
  usuário no nível do use case/repositório (ex.:
  `POST /api/it-tickets` — abertura livre; `GET /api/it-tickets/mine`,
  `GET /api/it-tickets/:id` com checagem `ticket.requester_id ===
  req.user.id` OU módulo `ti`; `POST /api/it-tickets/:id/comments` com a
  mesma checagem).
- Rotas de gestão de fila (`GET /api/it-tickets` sem filtro de dono,
  atribuição, mudança de prioridade/status por terceiros, relatórios)
  permanecem atrás de `authorizeModule('ti', 'operate')`.
- Este é o mesmo tipo de exceção que `rh` já resolve de outra forma (campo
  sensível filtrado dentro do use case, não bloqueio de rota inteira) — mas
  aqui a direção é invertida: em vez de restringir campos para quem TEM
  menos acesso, é preciso **liberar a rota** para quem não tem módulo
  nenhum, restringindo por posse do registro. Recomenda-se ao arquiteto
  decidir se isso vira um novo padrão de middleware (`authorizeSelfOrModule`)
  reutilizável para casos futuros semelhantes.

### 5.2 Aprovador de `ItAccessRequest` grant/change

O brief deixa aberto se o aprovador é o módulo `ti` nível `approve` ou o
gestor do departamento do funcionário (BR-TI-012 registra a incerteza
explicitamente). Este bloco não decide por conta própria porque afeta
desenho de schema (FK de aprovador fixa vs. resolução dinâmica por
departamento) e de tela (quem vê a fila de aprovação). Recomendação: manter
`approved_by` como FK genérica para `users` (qualquer um dos dois papéis
possíveis grava o mesmo campo), e resolver a **elegibilidade** de quem pode
aprovar na camada de autorização (`ti:approve` OR "é gestor do
`department_id` do funcionário-alvo") — desenho de UX final para
`ArquitetoSoftwareAPI` junto com `AdmDBA` (não há tabela "gestor de
departamento" verificada neste bloco; confirmar se já existe antes de
propor nova FK).

### 5.3 Novo módulo de RBAC (`ti`)

O catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`,
31 chaves na leitura de 2026-08-07) não tem a chave `ti`. Recomenda-se
seguir o mesmo padrão de comentário estrutural já usado para `rh`/`sst`/
`comex` no próprio arquivo (justificativa de por que existe, e por que o
auto-serviço de chamados é uma exceção ao gate padrão — ver §5.1). Diferente
de `rh`/`sst` (dados sensíveis com leitura restrita mesmo para quem já está
autenticado), `ti` é o inverso: a maior parte do módulo é gerida por 1-2
pessoas (`operate`/`approve`), mas uma fatia (chamados próprios) é aberta a
todos — deixar isso explícito no comentário do catálogo evita que um futuro
retrofit de RBAC generalize `authorizeModule('ti')` para as rotas de
auto-serviço "para ser consistente com os outros módulos", quebrando
BR-TI-001.

### 5.4 Origem do gatilho de onboarding/offboarding (RH ainda sem tela)

O brief marca como `[VERIFICAR COM ANALISTA DE TI DA EMPRESA]` se o
gatilho de `ItAccessRequest` (grant/change/revoke) será automático (evento
disparado pelo módulo RH ao admitir/transferir/desligar) ou manual (RH abre
a solicitação manualmente na tela de TI). Como o módulo RH ainda não tem
telas (`CLAUDE.md` §9, confirmado em 2026-08-07), este bloco recomenda que
a **primeira versão** do módulo TI trate a abertura como manual (RH ou o
próprio TI cria a `ItAccessRequest` a partir de um evento já conhecido),
deixando o gatilho automático como melhoria de integração para quando o
módulo RH tiver camada de eventos/telas. Isso não é uma decisão de domínio
nova — é uma sequência de implementação para não bloquear o Bloco 2 do TI
esperando o RH.

### 5.5 Itens `[VERIFICAR COM ANALISTA DE TI DA EMPRESA]` — parametrização obrigatória

Repassados do brief como **configuração**, nunca hard-code. Nenhum deles
bloqueia a modelagem — todos exigem apenas um campo de configuração (tabela
de parâmetros do módulo `ti` ou variável de ambiente validada no boot,
mesmo padrão de segredos obrigatórios do RNF geral §2):

1. SLA por prioridade (1ª resposta/resolução em minutos/horas) — tabela do
   brief (P1) é valor sugerido, não fixo (RF-TI-009/RNF-TI-05).
2. Se aceite digital (`digital_ack`) tem validade jurídica equivalente à
   assinatura física para a empresa, ou se sempre exige upload do termo
   assinado (RF-TI-017, UC-50 E3).
3. Prazo de auto-close do chamado resolvido (sugestão 3 dias úteis)
   (RF-TI-011/BR-TI-006).
4. Prazo de reabertura do chamado fechado (sugestão 7 dias)
   (RF-TI-006/BR-TI-003).
5. Aprovador exato de `grant`/`change` (módulo `ti:approve` vs. gestor de
   departamento) — ver também §5.2 (BR-TI-012).
6. Inventário real de licenças/chaves/vencimentos em uso hoje (Office,
   AutoCad/Fusion 360, LEAP/FINE, antivírus) — carga inicial de dados, não
   estrutura de schema (processo P3.4).
7. Janelas de alerta de vencimento de licença (sugestão 30/15/7 dias)
   (RF-TI-028/BR-TI-016).
8. Política de retenção de backup (sugestão 7 diários / 4 semanais / 12
   mensais / cópia off-site) (processo P5.4).
9. Frequência mínima de teste de restore (sugestão mensal)
   (RF-TI-042/BR-TI-018).

### 5.6 Fora de escopo deste bloco (herdado do brief, reforçado)

CMDB/gestão de configuração completa, catálogo de serviços formal, gestão
de problemas separada de incidentes, CAB/gestão de mudanças formal,
monitoramento de rede/servidores dentro do ERP, telefonia VoIP, CFTV,
site/e-commerce como processo transacional, manutenção física de
equipamento (já coberta por `MaintenanceOrder`). Nenhum RF acima cobre
esses itens — se aparecerem pedidos nesse sentido, é mudança de escopo que
exige um novo brief.

---

## 6. Matriz de Rastreabilidade — Brief → RF → Caso de Uso

| Processo do brief | BR-TI | RF-TI | UC |
|---|---|---|---|
| P1 — Chamado de TI (helpdesk) | 001–007, 009 | 001–016 | UC-49 |
| P2 — Termo de Responsabilidade | 010, 011 | 017–023 | UC-50 |
| P3 — Licenças de software | 008, 014, 015, 016 | 024–030 | sem UC formal dedicado neste bloco (P1, CRUD + regra de assento/vencimento — ver §7) |
| P4 — Onboarding/Offboarding de acessos | 012, 013 | 031–038 | UC-51 |
| P5 — Backup e continuidade | 017, 018 | 039–042 | sem UC formal dedicado neste bloco (P1, ver §7) |
| Transversal — RBAC/KPIs/Parametrização | — | 043–046 | tratado nas seções 5 e 6 deste bloco, não UC isolado |

---

## 7. Pendência declarada — Casos de Uso P1 não detalhados neste bloco

Este BLOCO 2 detalha (com fluxo principal/alternativo/exceção completos) os
3 processos com workflow de aprovação/ciclo de vida mais complexo: chamado
de TI (UC-49), termo de responsabilidade (UC-50) e solicitação de acesso
(UC-51). Os RFs de Licenças (024-030) e Backup (039-042) estão catalogados
com prioridade e regra de negócio, mas **sem Caso de Uso formal detalhado
neste passo** — são CRUDs com regra de vencimento/alocação mais simples
(mesmo padrão já resolvido em outros módulos, ex.: RF-PAT de Manutenção,
alertas de validade de CA em RF-SST-006). Recomenda-se que a próxima
passada do `AnalistaNegocios` no pipeline TI escreva os UCs formais (UC-52
em diante) antes da modelagem definitiva dessas tabelas, em particular para
a regra de bloqueio de assento excedente (RF-TI-026) e o fluxo de chamado
automático por falha de backup (RF-TI-040), que têm efeito colateral em
outro fluxo (respectivamente compras e helpdesk) e merecem fluxo de exceção
próprio documentado, não implícito.

---

## Referências

- `docs/business/briefs/BRIEF_TI_2026-08-06.md` — brief de domínio (insumo
  primário deste documento).
- `docs/business/BLOCO_1_SST_REQUISITOS.md` — mesmo padrão de entregável
  (formato de referência para este bloco).
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de RF por
  módulo (a atualizar com a seção TI quando este bloco for consolidado).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNF gerais do projeto.
- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — UC-01 a
  UC-43; `docs/business/BLOCO_1_SST_REQUISITOS.md` — UC-44 a UC-48
  (numeração continuada a partir de UC-49 neste bloco).
- `server/src/models/Asset.ts` — reutilização obrigatória para inventário
  de TI e licenças (BR-TI-008).
- `server/src/models/MaintenanceOrder.ts` — reutilização para manutenção
  física de equipamento de TI (BR-TI-009).
- `server/src/shared/domain/accessModules.ts` — catálogo de módulos RBAC
  (pendência: criar chave `ti`, ver §5.3).
- `docs/administrativo/04-PERFIS_ACESSO.md` — tecnologia de Perfis de
  Acesso já existente, orquestrada (não duplicada) por `ItAccessRequest`.
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamento 13 (TI).

**Fim do BLOCO 2.**
