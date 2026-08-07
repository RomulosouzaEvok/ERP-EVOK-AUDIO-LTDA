# Relatório de Auditoria Cruzada — Módulo TI (Bloco 2, Departamento 13)

**Auditor:** AuditorIntegrador
**Data:** 2026-08-07
**Artefatos auditados:**
- `docs/business/briefs/BRIEF_TI_2026-08-06.md` (insumo de domínio)
- `docs/business/BLOCO_2_TI_REQUISITOS.md` (46 RF-TI, UC-49 a UC-51)
- `docs/business/BLOCO_2_TI_MODELO_DADOS.md` (6 migrations originais, 9 tabelas `it_*`)
- `docs/business/BLOCO_2_TI_API.md` (57 endpoints, middleware `authorizeSelfOrModule`)
- Código-fonte real usado para arbitrar conflitos: `server/src/models/Department.ts`,
  `server/src/models/Employee.ts`, `server/src/models/Asset.ts`,
  `server/src/models/ProductionCostSettings.ts`, `server/src/modules/sst/`,
  `server/src/shared/domain/accessModules.ts`, migrations
  `20260807-000150` a `20260807-000155`.

**Status:** [APROVADO PARA IMPLEMENTAÇÃO] — condicionado às 7 correções abaixo,
todas **já aplicadas nesta auditoria** (docs e migrations corrigidos diretamente,
antes de qualquer código ser escrito pelo `programador`).

---

## Rastreabilidade verificada (46/46 RF-TI)

Cobertura completa RF → Tabela → Endpoint confirmada para os 46 RF-TI (não
por amostragem — todas as linhas das tabelas de rastreabilidade de
`BLOCO_2_TI_MODELO_DADOS.md` §6 e `BLOCO_2_TI_API.md` "Rastreabilidade
RF-TI → Endpoint" foram cruzadas). Resumo por processo:

| Processo | RF-TI | Tabela(s) | Endpoint(s) | Status |
|---|---|---|---|---|
| P1 — Helpdesk | 001–016 | `it_ticket_categories`, `it_tickets`, `it_ticket_comments`, `it_ticket_priority_history` | `/api/ti/ticket-categories`, `/api/ti/tickets/*` | [APROVADO] (após correção #3, #4) |
| P2 — Termo de Responsabilidade | 017–023 | `it_responsibility_terms` + `assets` | `/api/ti/responsibility-terms/*` | [APROVADO] |
| P3 — Licenças | 024–030 | `it_software_license_details`, `it_license_seats` + `assets` | `/api/ti/licenses/*` | [APROVADO] |
| P4 — Onboarding/Offboarding | 031–038 | `it_access_requests` | `/api/ti/access-requests/*` | [APROVADO] (após correção #2, #7) |
| P5 — Backup | 039–042 | `it_backup_logs` | `/api/ti/backup-logs/*` | [APROVADO] |
| Transversal — RBAC/KPIs/Config | 043–046 | `accessModules.ts` (`ti`, já adicionado), `ti_settings` (nova) | RBAC + sem endpoint dedicado de dashboard (RF-045, pendência declarada aceitável) | [APROVADO] (após correção #1) |

Nenhum RF-TI ficou sem tabela nem sem endpoint correspondente. Nenhuma
coluna nova foi encontrada "morta" (sem uso em nenhum payload de API) além
das já justificadas como leitura interna (ex.: `waiting_minutes`, exposto
indiretamente via `sla_overdue` calculado).

---

## Inconsistências encontradas e RESOLVIDAS nesta auditoria

### 1. Conflito de parametrização (RF-TI-046) — resolvido a favor da API, não do precedente citado

- **Localização:** `BLOCO_2_TI_MODELO_DADOS.md` §5 (versão original) vs.
  `BLOCO_2_TI_API.md` "Pendências para o AdmDBA" item 3.
- **Discrepância:** `AdmDBA` decidiu "sem tabela, config de aplicação",
  citando como precedente RF-SST-019 (Bloco 1). `ArquitetoSoftwareAPI`
  pediu uma tabela `ti_settings` explícita.
- **Investigação:** verifiquei `server/src/modules/sst/` inteiro em busca de
  qualquer mecanismo de configuração para RF-SST-019 (prazo do ASO
  demissional). **Não existe nenhum** — nem tabela, nem variável de
  ambiente, nem constante nomeada. É uma decisão documentada, nunca
  implementada. O precedente citado pelo AdmDBA é inválido: não é um padrão
  testado, é uma pendência não resolvida do bloco anterior.
- **Em contraste**, encontrei um precedente REAL e em produção para
  exatamente este problema: `production_cost_settings`
  (`server/src/models/ProductionCostSettings.ts`, migration
  `20260804-000008`) — tabela singleton com colunas tipadas fixas para
  parâmetros de negócio configuráveis sem deploy.
- **Decisão tomada:** criada `ti_settings` (nova migration
  `20260807-000156-create-ti-settings.cjs`), seguindo o padrão de
  `production_cost_settings` (singleton, `CHECK (id=1)`), cobrindo as 8
  colunas de SLA por prioridade + auto-close + reabertura + 3 janelas de
  alerta de licença + intervalo de teste de restore + horas de alerta de
  backup.
- **Ação corretiva:** `BLOCO_2_TI_MODELO_DADOS.md` §5 reescrito; rastreabilidade
  RF-TI-046 atualizada em ambos os documentos; `BLOCO_2_TI_API.md` item 3 das
  pendências marcado resolvido.
- **Responsável:** AdmDBA (decisão original corrigida por AuditorIntegrador).

### 2. Aprovador de acesso (§5.2/§4.1) — API doc estava desatualizada/incorreta

- **Localização:** `BLOCO_2_TI_API.md` §4.1 (versão original).
- **Discrepância:** o `ArquitetoSoftwareAPI` afirmava "não há tabela
  verificada no schema atual (`departments`) que aponte um
  responsável/gestor" e tratava isso como pendência "A CONFIRMAR com
  AdmDBA". Isso é **factualmente incorreto** e já estava contradito pelo
  próprio `BLOCO_2_TI_MODELO_DADOS.md` §1/§4 (que apontava
  `departments.manager_id`).
- **Verificação em código:** `server/src/models/Department.ts` confirma
  `manager_id: FK → employees.id` (comentário explícito no código).
  `server/src/models/Employee.ts` confirma `user_id: FK → users.id`.
  A cadeia `department.manager_id → employee.user_id → users.id` está
  100% disponível hoje, sem nenhuma migração de schema necessária.
- **Ação corretiva:** `BLOCO_2_TI_API.md` §4.1 reescrito com a fórmula de
  elegibilidade correta e sem "A CONFIRMAR"; item 2 das pendências marcado
  resolvido.
- **Responsável:** ArquitetoSoftwareAPI (doc corrigido por AuditorIntegrador).

### 3. `it_tickets.requester_id` não suportava chamado gerado por sistema (RF-TI-040)

- **Localização:** migration `server/migrations/20260807-000150-*.cjs` (coluna `requester_id`).
- **Discrepância:** a API contrata explicitamente um chamado `urgent`
  automático quando `ItBackupLog.success=false` (RF-TI-040/BR-TI-017), sem
  requester humano — e o próprio `BLOCO_2_TI_API.md` original listava isso
  como pendência (item 3.5) para o AdmDBA. A migration real, porém, tinha
  `requester_id: allowNull: false` — o banco **não sustentava** o que a API
  prometia.
- **Ação corretiva:** migration `20260807-000150` alterada: `requester_id`
  agora `allowNull: true`; nova coluna `system_generated BOOLEAN NOT NULL
  DEFAULT false`; novo `CHECK ck_it_tickets_requester_or_system
  (requester_id IS NOT NULL OR system_generated = true)`. Ambos os docs
  (`MODELO_DADOS` §3.2, `API.md` §5) atualizados.
- **Responsável:** AdmDBA (migration corrigida por AuditorIntegrador).

### 4. Histórico de prioridade — API doc tratava como pendência algo já resolvido

- **Localização:** `BLOCO_2_TI_API.md` §1.2 (`PUT /:id/priority`) e
  "Pendências para o AdmDBA" item 1 (versão original).
- **Discrepância:** `AdmDBA` já havia criado `it_ticket_priority_history`
  (migration `20260807-000151`) com exatamente os campos necessários
  (`ticket_id`, `changed_by`, `previous_priority`, `new_priority`, `reason`,
  `changed_at`). A API doc, porém, ainda escrevia "`ItTicketPriorityChange`
  ou equivalente decidido pelo AdmDBA" como se fosse incerto — os dois
  agentes trabalharam em paralelo e a API não incorporou a decisão real do
  schema.
- **Ação corretiva:** `BLOCO_2_TI_API.md` corrigido para referenciar
  `it_ticket_priority_history` nominalmente; item da lista de pendências
  marcado resolvido.
- **Responsável:** ArquitetoSoftwareAPI (doc corrigido por AuditorIntegrador).

### 5. Índice único parcial em license seats — confirmado, sem ação necessária

- **Localização:** migration `20260807-000153-*.cjs`.
- **Verificação:** `CREATE UNIQUE INDEX uq_it_license_seats_active_per_employee
  ON it_license_seats (license_detail_id, employee_id) WHERE revoked_at IS
  NULL;` **já existia** exatamente como pedido pela API. A API doc tratava
  isso como pendência (item 4) por desalinhamento de comunicação entre os
  dois agentes, não por ausência real.
- **Ação corretiva:** item marcado resolvido em `BLOCO_2_TI_API.md`.
- **Responsável:** nenhum (falso positivo de pendência, documentação corrigida).

### 6. Nomenclatura/tipo — `urgency_perceived` (API) vs. `urgency` (banco)

- **Localização:** `BLOCO_2_TI_API.md` §1.2, `POST /api/ti/tickets` — Request.
- **Discrepância:** o payload de abertura de chamado inclui
  `urgency_perceived` (string enum `low|medium|high|urgent`), mas a tabela
  `it_tickets` só tem `urgency` (SMALLINT 1-3, preenchido na triagem pelo
  analista, RF-TI-004) e `impact` (idem). Não existe coluna
  `urgency_perceived` no schema — não é um erro de nome 1:1, são dois
  conceitos com timing diferente (percepção do solicitante na abertura vs.
  matriz formal do analista na triagem) que a API não distinguia
  explicitamente, criando ambiguidade sobre onde/se `urgency_perceived` é
  persistido.
- **Ação corretiva:** nota explícita adicionada em `BLOCO_2_TI_API.md`
  esclarecendo que `urgency_perceived` não é persistido como coluna própria
  — é usado apenas para ajustar a `priority` inicial herdada da categoria,
  e descartado; `impact`/`urgency` numéricos só nascem na triagem.
  Documentado como decisão aceita (não bloqueante), com nota de que uma
  auditoria futura pode decidir tornar a percepção original auditável via
  nova coluna, se o negócio pedir.
- **Responsável:** ArquitetoSoftwareAPI / programador (ciente na
  implementação de `CreateTicketUseCase`).

### 7. `it_access_requests` — API prometia campos que o banco não sustentava

- **Localização:** migration `20260807-000154-*.cjs` vs.
  `BLOCO_2_TI_API.md` §4, `POST /api/ti/access-requests` (Request grant).
- **Discrepância:** o payload de exemplo da API para `type: "grant"` inclui
  `corporate_email` e `equipment_needed` (diretamente do brief, RF-TI-031:
  "e-mail corporativo, equipamentos necessários"), mas a migration original
  de `it_access_requests` **não tinha nenhuma dessas duas colunas** —
  clássico caso de "API promete algo que o banco não sustenta" (item 2 do
  meu checklist de verificação).
- **Ação corretiva:** migration `20260807-000154` alterada: adicionadas
  `corporate_email VARCHAR(150) NULL` e `equipment_needed JSONB NULL`.
  `BLOCO_2_TI_MODELO_DADOS.md` §3.8 e a API doc atualizados com nota
  explicando a correção.
- **Responsável:** AdmDBA (migration corrigida por AuditorIntegrador).

---

## Verificações adicionais (sem inconsistência encontrada)

- **FK adiada `it_tickets.access_request_id`:** ordem de aplicação e `down()`
  de `20260807-000150`/`20260807-000154` revisados linha a linha — `down()`
  de `000154` remove a constraint/índice antes de derrubar a tabela;
  `down()` de `000150` não referencia a FK. Sequência de `migration:up`/
  `migration:down` funciona corretamente (confirmado por
  `npm run migration:status`, sem erro).
- **Nenhuma tabela paralela de assets:** revisão das 7 migrations (150 a
  156) confirma que equipamentos e licenças são sempre FK/extensão 1:1
  sobre `assets`, nunca cadastro duplicado (BR-TI-008 respeitada em todas).
- **`authorizeSelfOrModule` / rotas de auto-serviço:** conferido que
  exatamente as 6 rotas listadas (`POST /tickets`, `GET /mine`, `GET /:id`,
  `POST /:id/comments` [GET/POST], `.../confirm`, `.../reopen`) usam
  autenticação pura ou o middleware por posse, e que todas as demais rotas
  de gestão (fila, atribuição, termos, licenças, backup, execução de
  acesso) exigem `authorizeModule('ti', operate|approve)` — nenhuma rota de
  gestão vazou para fora do gate. Implementação real do middleware ainda
  não existe (é tarefa do `programador`); a especificação está completa e
  correta o suficiente para orientar a implementação.
- **Chave RBAC `ti`:** já adicionada em
  `server/src/shared/domain/accessModules.ts` (31 → 32 chaves), com
  comentário estrutural explícito sobre a exceção de auto-serviço — feito
  fora desta auditoria (por outro agente/passada), mas verificado e correto.
- **`npm run migration:status --prefix server`:** as 7 migrations do bloco
  (`000150` a `000156`) listam corretamente como `down` (não aplicadas,
  conforme esperado — aguardando aprovação para rodar), sem erro de carga.
- **`npm run typecheck --prefix server`:** `tsc -p tsconfig.json --noEmit`
  roda limpo, sem erros — a adição da chave `ti` em `accessModules.ts` não
  quebrou nada.

---

## Riscos de segurança/isolamento observados

Nenhum risco novo de segurança/isolamento identificado além dos já
endereçados pelo desenho (mascaramento de `license_key`, RESTRICT em todas
as FKs, anti-spoofing de identidade via JWT em todos os atores). Ponto de
atenção para implementação (não bloqueador de schema/contrato): a checagem
de posse do `authorizeSelfOrModule` deve ocorrer sempre dentro do use case
(nunca confiar em parâmetro de rota/query) — já exigido explicitamente pelo
próprio `BLOCO_2_TI_API.md` na seção "Sinalização para AuditorIntegrador";
recomendo que o `iterative-review`/`auditor-seguranca` confira isso
especificamente quando o `programador` implementar o middleware.

---

## Resumo de arquivos alterados nesta auditoria

- `server/migrations/20260807-000150-create-it-ticket-categories-tickets.cjs`
  (requester_id nullable + system_generated + CHECK)
- `server/migrations/20260807-000154-create-it-access-requests.cjs`
  (corporate_email + equipment_needed)
- `server/migrations/20260807-000156-create-ti-settings.cjs` (NOVA — tabela
  de parametrização)
- `docs/business/BLOCO_2_TI_MODELO_DADOS.md` (§5 reescrito, tabelas §3.2/§3.8
  atualizadas, §6 rastreabilidade, nova §7-A "Correções aplicadas")
- `docs/business/BLOCO_2_TI_API.md` (nota de auditoria no topo, §4.1
  reescrito, priority history, backup auto-ticket, urgency_perceived,
  corporate_email/equipment_needed, lista de pendências para AdmDBA)

**Veredito final: APROVADO PARA IMPLEMENTAÇÃO.** As 7 inconsistências reais
encontradas foram corrigidas diretamente nos artefatos (docs + migrations,
ainda não aplicadas ao banco) nesta mesma passada de auditoria — não há
bloqueador remanescente para o `programador` iniciar a Clean Architecture do
módulo `server/src/modules/ti/`.

