# BLOCO 3 — Módulo Jurídico (JUR) — Auditoria Cruzada Requisito ↔ Banco ↔ API

**Departamento:** 16 — Jurídico.
**Auditor:** `AuditorIntegrador`.
**Data:** 2026-08-07.
**Escopo:** auditoria cruzada DOCUMENTO↔DOCUMENTO dos três artefatos do
Bloco 3 antes de qualquer implementação — `docs/business/BLOCO_3_JUR_REQUISITOS.md`
(46 RF-JUR, 5 RNF-JUR, UC-52 a UC-56), `docs/business/BLOCO_3_JUR_MODELO_DADOS.md`
+ 12 migrations `server/migrations/20260807-000260-*.cjs` a `20260807-000271-*.cjs`
(renumeradas, ver §2 abaixo), `docs/business/BLOCO_3_JUR_API.md` (71
endpoints, 7 grupos), e (NOVO nesta rodada) o inventário de conflito com o
módulo Jurídico enxuto já mesclado ao `main` (`2ad27fd`) enquanto esta
auditoria estava em andamento.

**Status:** 🟡 Auditoria concluída para os três artefatos do Bloco 3
completo. **Não** cobre validação funcional em runtime (nenhum código do
Bloco 3 foi implementado ainda — é responsabilidade do `programador`, passo
seguinte do pipeline) nem a qualidade do módulo enxuto já mesclado em si
(fora do par de comparação deste agente — se necessário, `auditor` deve
revisar `server/src/modules/legal/` contra `docs/juridico/`).

---

## Veredito

**[APROVADO COM RESSALVAS]**

Os três artefatos do Bloco 3 (Requisitos, Modelo de Dados, API) estão
consistentes entre si após as correções aplicadas nesta auditoria (ver §3).
A ressalva não é sobre a qualidade do desenho do Bloco 3 em si — é sobre um
fato novo, externo ao trio de documentos, que apareceu no meio da
auditoria: **um módulo Jurídico enxuto e independente já foi implementado
e mesclado ao `main`** (`2ad27fd`, migration
`20260807-000220-create-legal-module.cjs`, tabelas
`legal_contracts`/`legal_contract_addendums`/`legal_contract_reminders`/
`legal_intellectual_property`, models, use-cases, rotas em `/api/legal`,
tela `client/src/pages/legal/`, já usando a mesma chave RBAC `juridico`).
Isso **não invalida** o desenho do Bloco 3 (46 RF, 5 UC completos) — pelo
contrário, o módulo enxuto cobre uma fração pequena do escopo (contrato +
aditivo + lembrete + PI, sem contencioso, sem prazos fatais com dupla
confirmação, sem LGPD) — mas introduz uma dívida de substituição que
precisa de um plano formal antes do `programador` começar a implementar o
Bloco 3 completo, para não deixar dois módulos Jurídicos coexistindo
silenciosamente no schema. Esse plano está em §6 deste relatório.

Nenhuma inconsistência remanescente do trio de documentos original bloqueia
a modelagem — todas as encontradas foram corrigidas nesta própria auditoria
(migrations não estavam aplicadas, correção é segura).

---

## 1. Rastreabilidade RF-JUR → Tabela(s) → Endpoint(s) — verificação completa (não amostral)

Todas as 46 linhas de RF-JUR foram cruzadas contra a tabela de
rastreabilidade §13 do Modelo de Dados e §10 do contrato de API (não apenas
os RFs P0). Resultado: **100% de cobertura ou justificativa explícita de
"fora de escopo deste bloco"** — nenhum RF ficou sem menção em nenhuma das
duas rastreabilidades.

| RF-JUR | Tabela(s) | Endpoint(s) | Status |
|---|---|---|---|
| 001, 005, 006, 007, 009, 011 | `jur_contracts` | `POST /contracts`, `POST .../activate`, `POST .../terminate`, `GET /contracts`, `GET .../:id` | OK |
| 002 | `jur_contract_documents` | `POST/GET /contracts/:id/documents` | OK |
| 003 | fora de escopo (tabela de alçada não modelada, decisão pendente) | `POST .../activate` (checagem), CRUD de `jur_approval_thresholds` fora da contagem | OK — pendência documentada consistentemente nos 3 artefatos |
| 004 | `jur_contract_signatories` | `POST/GET /contracts/:id/signatories`, `POST .../activate` | OK |
| 008 | `jur_contract_addendums` | `POST/GET /contracts/:id/addendums` | OK |
| 010 | `jur_contracts.clause_checklist` | `POST /contracts/:id/checklist`, `POST .../activate` (bloqueio) | OK |
| 012, 013 | `jur_legal_cases`, `jur_external_lawyers` | `POST /legal-cases`, `POST/GET/PUT /external-lawyers` | OK |
| 014 | `jur_legal_case_events` | `POST/GET /legal-cases/:id/events` | OK |
| 015, 016 | `jur_legal_case_provisions` | `POST/GET /legal-cases/:id/provisions`, `.../current` | OK |
| 017 | `jur_legal_cases.next_risk_reassessment_due_at` + `jur_legal_case_events` | efeito colateral de `POST .../events` (`event_type=decision`), sem rota própria | OK — mesma decisão nos 2 artefatos |
| 018 | `accounts_payable.legal_case_id`/`legal_expense_type` | `POST /legal-cases/:id/costs` | OK (nome de coluna corrigido nesta auditoria, ver §3.1) |
| 019, 020 | `jur_legal_cases`, `jur_legal_case_provisions` | `POST /legal-cases/:id/close`, `GET /reports/provisions` | OK |
| 021 a 025 | `jur_legal_case_deadlines` | `POST /legal-cases/:caseId/deadlines`, `.../acknowledge`, `.../fulfill`, `.../confirm` | OK — auditado em detalhe no §4 |
| 026 a 029 | `jur_proxies` | `POST /proxies`, `.../revoke`, `GET /proxies` (filtro status) | OK |
| 030 | fora de escopo (sem tabela dedicada, decisão consciente) | `GET/POST /corporate-acts` — **ver §3.2, endpoint sem tabela correspondente** | Pendência registrada |
| 031, 032, 033 | `jur_intellectual_property` | `GET/POST/PUT /ip-assets`, `.../contracts` | OK |
| 034 | `jur_ip_contract_links` | `POST/GET /ip-assets/:id/contracts` | OK |
| 035, 036 | `jur_lgpd_processing_activities` | `GET/POST/PUT /lgpd/processing-activities`, `.../review` | OK |
| 037, 038, 039 | `jur_lgpd_data_subject_requests` | `POST /lgpd/data-subject-requests`, `.../verify-identity`, `GET .../pending-critical` | OK |
| 040 | `jur_lgpd_incidents` | `POST/GET /lgpd/incidents`, `.../decision`, `.../close` | OK |
| 041 | `jur_lgpd_data_subject_requests.dpo_user_id` / `jur_lgpd_incidents.dpo_user_id` | sem endpoint de cadastro de "papel DPO" — atribuição implícita | OK — mesma lacuna documentada nos 2 artefatos |
| 042 | RBAC `accessModules.ts` chave `juridico` (já mesclada ao `main` antes desta auditoria, confirmado por leitura direta do arquivo) | `GET /reports/financeiro` (exceção de campo) | OK |
| 043 | `AuditLog` (reutilizada) | transversal, toda escrita | OK |
| 044 | ausência de `DELETE`/rotina de expurgo (§11 do Modelo de Dados) | ausência de rota `DELETE` em todo o contrato (confirmado por grep, nenhuma ocorrência) | OK |
| 045 | leitura de `jur_contracts.supplier_id`/`client_id`/`employee_id` | `GET /contracts/by-supplier/:id`, `.../by-client/:id`, `.../by-employee/:id` | OK |
| 046 | sem tabela — fronteira SST preservada | sem endpoint — fronteira SST preservada (§8.4 da API) | OK |

**Conclusão da rastreabilidade:** cobertura completa, sem RF órfão em
nenhuma das duas camadas.

---

## 2. Divergência de nomenclatura de tabela — resolvida

**Achado original:** o Modelo de Dados (`AdmDBA`) nomeou as 16 tabelas
novas **sem** prefixo (`contracts`, `legal_cases`, `legal_case_deadlines`,
`legal_alerts`, `proxies`, `intellectual_property`, `lgpd_*`...), enquanto
o contrato de API (`ArquitetoSoftwareAPI`) já assumia, desde a primeira
versão, a convenção `jur_*` — e sinalizava a divergência explicitamente
para o `AdmDBA` resolver.

**Decisão desta auditoria: prefixo `jur_` adotado**, pelos motivos já
levantados no enunciado do pipeline:
1. Precedente forte e consistente do projeto: **todo** módulo novo desde o
   Bloco 1 usa prefixo de domínio (`sst_*`, `it_*`/`ti_*`, e também os dois
   módulos mesclados no meio desta auditoria, `facility_*` e
   `marketing_*` — `contracts`/`legal_cases` teriam sido a única exceção).
2. `contracts`/`legal_cases` são nomes genéricos de altíssimo risco de
   colisão futura — um módulo de Vendas ou Cobrança que precise de
   "contrato"/"caso" teria um conflito de nome real, não hipotético (e o
   módulo Jurídico enxuto mesclado durante esta auditoria, ver §6, já usa
   `legal_*` como prefixo próprio, reforçando que mesmo dentro do próprio
   domínio Jurídico o nome sem prefixo é ambíguo).
3. O contrato de API já estava certo — corrigir o lado divergente (Modelo
   de Dados) é a intervenção mínima.

**Correção aplicada (nesta auditoria, nos 3 artefatos):**

- **12 migrations** (`server/migrations/20260807-000260-*.cjs` a
  `20260807-000271-*.cjs`, renumeradas — ver justificativa de numeração
  abaixo) tiveram **todas** as 16 tabelas, todos os `references: { model:
  ... }`, todos os nomes de índice (`idx_*`), constraints de unicidade
  (`uq_*`), nomes de tipo ENUM gerados pelo Sequelize (`enum_*`) e
  comentários de cabeçalho renomeados para o prefixo `jur_`. Constraints
  `CHECK` (`ck_jur_*`) e triggers (`trg_jur_lock_*`/`jur_lock_*`) já
  usavam `jur_` desde a primeira versão — não precisaram de correção.
  Verificado com `node -c` em todas as 12 migrations finais: **sem erro de
  sintaxe** (resultado ao final desta seção).
- **`docs/business/BLOCO_3_JUR_MODELO_DADOS.md`**: §0 reescrita
  documentando a correção; todas as ocorrências de nome de tabela (títulos
  de seção, tabelas markdown, referências de FK em texto corrido, §13
  rastreabilidade, §14 pendências) atualizadas para `jur_*`; números de
  migration atualizados para `20260807-000260..271`.
- **`docs/business/BLOCO_3_JUR_API.md`**: nota de convenção de nomes
  (topo do documento) reescrita para refletir que a divergência foi
  **resolvida**, não apenas sinalizada — o texto original ("fica
  sinalizada explicitamente para o AdmDBA reconciliar") ficaria
  desatualizado assim que a correção fosse aplicada.

**Numeração das migrations — corrigida por necessidade de ordenação, não
só de nomenclatura:** as migrations originais deste bloco foram criadas
como `20260807-000160` a `20260807-000171`. Durante a auditoria, um `git
pull` trouxe migrations de outros dois commits (`2ad27fd`, `aaf6ec5`) que
ocupam a faixa `20260807-000200` a `20260807-000250` — incluindo
`20260807-000220-create-legal-module.cjs`, que cria as tabelas do módulo
Jurídico enxuto (`legal_contracts` etc., ver §6). Como `000160..171` <
`000220` lexicograficamente, as migrations do Bloco 3 rodariam **antes**
do módulo enxuto ser criado — irrelevante para a integridade das tabelas
em si (não há FK cruzada entre os dois conjuntos), mas quebraria a
narrativa de "o Bloco 3 substitui o enxuto" num banco novo, onde o enxuto
apareceria depois e daria a falsa impressão de ser a versão vigente.
Renumeradas para `20260807-000260` a `20260807-000271` (primeira faixa
livre acima de `000250`, a mais alta ocupada no momento desta auditoria),
garantindo que o Bloco 3 completo rode **depois** de todas as migrations
que chegaram pelo `git pull`, inclusive a `000220` do módulo enxuto —
pré-requisito direto para a migration de substituição desenhada em §6.

```
20260807-000260-create-jur-contracts.cjs
20260807-000261-create-jur-contract-documents-signatories-addendums.cjs
20260807-000262-create-jur-external-lawyers.cjs
20260807-000263-create-jur-legal-cases.cjs
20260807-000264-create-jur-legal-case-events.cjs
20260807-000265-create-jur-legal-case-deadlines.cjs
20260807-000266-create-jur-legal-case-provisions.cjs
20260807-000267-create-jur-legal-alerts.cjs
20260807-000268-add-legal-case-id-to-accounts-payable.cjs
20260807-000269-create-jur-proxies.cjs
20260807-000270-create-jur-intellectual-property.cjs
20260807-000271-create-jur-lgpd.cjs
```

`node -c` (verificação de sintaxe) rodado nas 12 migrations finais —
**todas OK**, nenhuma falha.

---

## 3. Outras inconsistências encontradas e corrigidas

### 3.1 Nome de coluna divergente em `accounts_payable` (`legal_entry_type` vs. `legal_expense_type`)

**Localização:** `docs/business/BLOCO_3_JUR_API.md`, §3.4 (`POST
/api/jur/legal-cases/:id/costs`) e seção "Resumo — Handoff" (itens 5 das
"Decisões de contrato" e 4 das "Pendências explícitas").

**Descrição objetiva:** o contrato de API descrevia o efeito colateral do
lançamento de custo como `AccountPayableService.create({..., legal_case_id:
id, legal_entry_type: entry_type })` e sugeria a coluna nova como
`legal_entry_type`. A migration real do `AdmDBA`
(`20260807-000268-add-legal-case-id-to-accounts-payable.cjs`, e o Modelo
de Dados §6) criam a coluna como **`legal_expense_type`**. Este é
exatamente o tipo de discrepância de nome de campo entre camadas que este
agente deve caçar sistematicamente — se não corrigida, o `programador`
implementaria o `AccountPayableService.create()` gravando em um campo que
não existe no schema real.

**Ação corretiva aplicada:** todas as 4 ocorrências de `legal_entry_type`
em `BLOCO_3_JUR_API.md` substituídas por `legal_expense_type`; texto
também atualizado para declarar que as colunas **já foram criadas** pela
migration `20260807-000268` (não mais "decisão final do AdmDBA" como
pendência em aberto — a migration já resolveu).

**Responsável original do erro:** `ArquitetoSoftwareAPI` (a migration do
`AdmDBA` sempre esteve correta).

### 3.2 Atos societários (RF-JUR-030) — endpoint sem tabela correspondente

**Localização:** `docs/business/BLOCO_3_JUR_API.md` §5 (`GET/POST
/api/jur/corporate-acts`, 2 dos "6 endpoints" do Grupo 4) vs.
`docs/business/BLOCO_3_JUR_MODELO_DADOS.md` §13 (RF-JUR-030: "fora de
escopo deste bloco — repositório documental de atos societários... não tem
tabela dedicada").

**Descrição objetiva:** o contrato de API expõe 2 endpoints
(`/api/jur/corporate-acts`) que, por desenho, não têm nenhuma tabela
correspondente no Modelo de Dados — nem mesmo uma tabela genérica
reaproveitada. É exatamente o padrão #2 do mandato desta auditoria
("parâmetros na API que não têm coluna correspondente no banco — a API
promete algo que o banco não sustenta"). Diferente da divergência de nome
(§3.1, um erro real), este é um **gap de sequenciamento entre os dois
artefatos já reconhecido e sinalizado por ambos os autores** — o Modelo de
Dados §14 item 2 já registra: *"Atos societários (RF-JUR-030): repositório
documental simples — se o ArquitetoSoftwareAPI decidir que precisa de
tabela dedicada... sinalizar de volta ao AdmDBA antes de implementar"*, e
o próprio contrato de API optou por expor o endpoint mesmo sem tabela
confirmada.

**Ação corretiva:** **não corrigida como erro** — é uma pendência real de
projeto (RF-JUR-030 é P1, não P0, e o próprio brief descreve como "gestão
simples de documentos... sem workflow próprio"), mas fica **registrada
como pendência explícita** nesta auditoria porque, se implementada sem
tabela, o `programador` teria uma rota funcional zero (sem persistência).
**Ação corretiva necessária:** `AdmDBA` precisa modelar uma tabela mínima
(`jur_corporate_acts`, sugestão desta auditoria pelo mesmo padrão de
prefixo, campos: `act_type`, `act_date`, `registry_number`, `document_url`,
`created_by`) antes do `programador` implementar `/api/jur/corporate-acts`
— **não é responsabilidade deste agente resolver o desenho da tabela**,
apenas apontar o gap.
**Responsável sugerido:** `AdmDBA`.

### 3.3 Cabeçalhos de migration desatualizados (nome de tabela em comentário)

**Localização:** todas as 12 migrations, comentários de cabeçalho e
inline que citavam nomes de tabela sem prefixo em texto (não em código
executável).

**Descrição objetiva:** consequência direta da correção de nomenclatura
(§2) — os comentários explicativos das migrations citavam `contracts`,
`legal_cases` etc. em texto solto (fora de string SQL), o que não afeta a
execução, mas ficaria factualmente incorreto após a correção do
`CREATE TABLE`.

**Ação corretiva aplicada:** todas as ocorrências entre crases nos
comentários JSDoc de cabeçalho foram atualizadas para o nome com prefixo
(`` `jur_contracts` ``, `` `jur_legal_cases` `` etc.), incluindo a
reescrita completa do parágrafo de justificativa de nomenclatura em
`20260807-000260-create-jur-contracts.cjs` (que originalmente defendia a
ausência de prefixo — agora documenta a correção e referencia este
relatório).

---

## 4. Foco obrigatório — Prazo Fatal (UC-54): dupla confirmação em todas as camadas

**Verificação exaustiva, célula por célula do enunciado do mandato:**

1. **CHECK no banco (`fulfilled_by != confirmed_by`):** confirmado em
   `20260807-000265-create-jur-legal-case-deadlines.cjs`,
   `ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct`:
   `fulfilled_by IS NULL OR confirmed_by IS NULL OR fulfilled_by <>
   confirmed_by`. **Presente e correto.**
2. **Rotas separadas fulfill/confirm no contrato:** confirmado —
   `POST /api/jur/legal-case-deadlines/:id/fulfill` (1ª confirmação) e
   `POST /api/jur/legal-case-deadlines/:id/confirm` (2ª confirmação) são
   endpoints distintos, nunca um `PUT` genérico de status (API §4,
   confirmado também no diagrama de sequência §9). **Presente e correto.**
3. **Segundo confirmador vem do JWT, nunca do body:** confirmado — API
   §4.4 declara `confirmed_by = req.user.id, sempre do JWT`, e a regra
   central documentada é `SE req.user.id === deadline.fulfilled_by → 422`.
   Nenhum campo `confirmed_by` é aceito no request body de `.../confirm`
   (o exemplo de request é "Sem body"). **Presente e correto.**
4. **Nenhum caminho de escrita capaz de desativar alerta fatal:**
   verificado por dupla ausência — (a) `docs/business/BLOCO_3_JUR_MODELO_DADOS.md`
   §3 e a migration `20260807-000267-create-jur-legal-alerts.cjs`
   confirmam que `jur_legal_alerts` **não tem nenhuma coluna**
   `disabled`/`muted`/`active` (a única forma de "mexer" no estado é via
   `status` transitando para `acknowledged`/`resolved`, que não é
   "desativar", é reconhecer/encerrar); (b) o contrato de API §4.5 declara
   explicitamente que nenhuma rota (inclusive `PUT/PATCH
   /api/jur/alerts/:id`, que **não existe** no contrato — confirmado por
   grep, `/api/jur/alerts` só tem `GET`/`GET :id`/`POST .../acknowledge`)
   é capaz de setar um campo de desativação. **Presente e correto, em
   ambas as camadas.**
5. **Nenhuma coluna de mute/disable nas migrations:** confirmado por
   leitura direta de `20260807-000265` (`jur_legal_case_deadlines`) e
   `20260807-000267` (`jur_legal_alerts`) — nenhuma das duas tabelas tem
   coluna desse tipo. **Presente e correto.**

**Conclusão do foco #1:** o fluxo mais crítico do módulo está corretamente
implementado em todas as três camadas, sem nenhum caminho de bypass
identificado. Nenhuma correção necessária.

---

## 5. Demais focos obrigatórios do mandato

### 5.1 Imutabilidade (RNF-JUR-02) — triggers × endpoints de escrita

Cruzamento completo das 4 triggers (Modelo de Dados §10) contra o
contrato de API:

| Tabela | Trigger | Endpoints de escrita expostos | Consistente? |
|---|---|---|---|
| `jur_contract_addendums` | bloqueia UPDATE/DELETE sempre | só `POST`/`GET` (sem `PUT`/`DELETE`) | Sim |
| `jur_legal_case_events` | bloqueia UPDATE/DELETE sempre | só `POST`/`GET` | Sim |
| `jur_legal_case_provisions` | bloqueia UPDATE/DELETE sempre | só `POST`/`GET`/`GET .../current` | Sim |
| `jur_legal_case_deadlines` | bloqueia DELETE sempre; UPDATE só quando `status IN (confirmed, confirmed_late)` | `POST` (cria), `.../acknowledge`, `.../fulfill`, `.../confirm` — nenhum `PUT` genérico, e as transições anteriores a `confirmed` não são bloqueadas pela trigger, batendo com o ciclo de vida do contrato | Sim |

Nenhum endpoint do contrato promete um `UPDATE`/`DELETE` que a trigger
bloquearia, e nenhuma tabela marcada como append-only no Modelo de Dados
tem endpoint de escrita fora do padrão insert-only. **Sem inconsistência.**

### 5.2 Exceção de campo do perfil financeiro (`GET /api/jur/reports/financeiro`)

Shape do §8.2 do contrato de API verificado campo a campo contra a lista
de "nunca inclui" do próprio parágrafo: `provisions[]` só expõe
`legal_case_reference` (não `case_number_cnj`), `case_type`, `risk_class`,
`provisioned_amount`, `cost_center_id`; `costs[]` só expõe
`legal_case_reference`, `entry_type`, `amount`, `due_date`, `status`;
`totals` é agregado puro. Nenhum campo da lista de confidenciais do §0.4
(`parte_contraria`, `object`/descrição, `rationale`, `employee_id`,
andamentos, dado de LGPD/procuração/PI) aparece no shape de exemplo.
**Sem vazamento identificado — consistente com a matriz de campos
sensíveis do próprio documento.**

### 5.3 Contraparte polimórfica (Contrato)

CHECK da migration (`ck_jur_contracts_counterparty_exclusive`,
`20260807-000260`) exige, por `counterparty_type`, exatamente um grupo
preenchido dos 4 (`supplier_id` XOR `client_id` XOR `employee_id` XOR
`counterparty_name`+`counterparty_doc`). A validação de aplicação
documentada no contrato de API (§2.1) usa a **mesma tabela de verdade**,
campo a campo idêntica (`counterparty_type = 'supplier' → supplier_id
preenchido; demais nulos`, etc.) — **semanticamente idênticas**, nenhuma
divergência de regra entre banco e aplicação. A única diferença é de
grau de enforcement (banco garante via `CHECK`, API documenta como
"aplicação obrigatória independentemente do que o AdmDBA decidir sobre
`CHECK`") — o `AdmDBA` decidiu impor `CHECK` também, então as duas camadas
estão duplamente protegidas, sem conflito. **Sem inconsistência.**

### 5.4 Integração com `accounts_payable`

Migration `20260807-000268` cria `legal_case_id` (FK RESTRICT →
`jur_legal_cases.id`) e `legal_expense_type` (ENUM `expense`/
`judicial_deposit`, nullable) mais o CHECK
`ck_jur_accounts_payable_legal_expense_type_requires_case`. O contrato de
API (após a correção de nome do §3.1) assume exatamente essas duas
colunas com o mesmo nome. **Consistente após correção.** Pendência
residual (não é inconsistência entre artefatos, é decisão de negócio em
aberto, já documentada nos 3 artefatos de forma idêntica): tratamento
contábil fino do depósito judicial como ativo restrito depende do
contador — nenhum dos 3 artefatos finge que essa decisão já foi tomada.

### 5.5 RBAC — chave `juridico`

A chave `juridico` já existe em `server/src/shared/domain/accessModules.ts`
(confirmado por leitura direta — 32ª chave, união de tipo `AccessModuleKey`
e array `ACCESS_MODULES`, comentário estrutural presente, rótulo
`'Jurídico (contratos, contencioso, procurações, PI, LGPD — dados
sensíveis)'`). Isso bate com o que o Modelo de Dados §12 item 1 e a API
§0.1 declaravam como necessário — a chave chegou pelo commit `2ad27fd`
(módulo enxuto, ver §6), não precisou ser recriada por este bloco.
Verificação por endpoint: todas as rotas do contrato exigem, no mínimo,
`authorizeModule('juridico', 'operate')`; níveis `approve` aplicados
consistentemente aos atos de maior risco (ativação de contrato acima da
alçada, avaliação `probable`, encerramento de processo, revogação de
procuração, decisão de comunicação de incidente, rejeição de solicitação
LGPD) — mesmo padrão em todo o documento, sem rota "esquecida" em nível
`operate` quando deveria ser `approve` (cruzado contra UC-52 a UC-56,
seção "Ator principal"/"Fluxo de Exceção" de cada caso de uso).
**Exceção `role==='admin'` do `trade_secret`:** confirmada como desenho
deliberado e isolado (API §6.3) — é o único recurso do contrato que usa
checagem de `role` global em vez de `authorizeModule`, e o próprio
documento já sinaliza isso como "caso de teste isolado" para este agente,
o que foi feito: a regra é coerente com RF-JUR-033 (leitura restrita a
`role=admin` + módulo `juridico`) e não há rota alternativa (`GET
/ip-assets` sem filtro, `GET /ip-assets/:id` sem checagem de tipo) que a
contorne. **Sem inconsistência.**

---

## 6. Plano de Substituicao do Modulo Enxuto

### 6.1 Contexto (fato novo, nao existia no inicio desta auditoria)

O commit 2ad27fd (mesclado ao main durante esta auditoria, junto de
aaf6ec5) implementou um modulo Juridico enxuto e funcional, cobrindo uma
fracao pequena do Bloco 3:

| Tabela do enxuto | Tabela equivalente do Bloco 3 completo | Cobertura |
|---|---|---|
| legal_contracts | jur_contracts | Parcial - enxuto nao tem counterparty_type polimorfico completo (usa party_a/party_b texto livre), nao tem clause_checklist, adjustment_index, alcada de aprovacao, nem maquina de estados com draft-in_approval-approved-signed-active |
| legal_contract_addendums | jur_contract_addendums | Parcial - sem previous_end_date/previous_value (snapshot), sem trigger de imutabilidade (ON DELETE CASCADE, nao RESTRICT+trigger) |
| legal_contract_reminders | jur_legal_alerts (parcial - so a fatia de contrato) | Parcial - enxuto nao cobre prazo fatal, procuracao, PI nem LGPD |
| legal_intellectual_property | jur_intellectual_property | Parcial - enxuto nao distingue trade_secret com RBAC de role=admin, nao tem jur_ip_contract_links, nao tem holding_area/next_annuity_date |
| (nenhuma) | jur_contract_documents, jur_contract_signatories, jur_external_lawyers, jur_legal_cases, jur_legal_case_events, jur_legal_case_deadlines, jur_legal_case_provisions, jur_proxies, jur_lgpd_* (3 tabelas) | Ausente no enxuto - contencioso, prazos fatais com dupla confirmacao (o risco legal numero 1 do modulo), procuracoes, LGPD completo nao existem hoje |

Decisao do dono do produto (explicita, registrada nesta auditoria): o
desenho completo do Bloco 3 (46 RF) substitui o enxuto. O modulo enxuto
sera removido/absorvido pela implementacao completa. Este relatorio nao
executa a substituicao - apenas entrega o plano para o programador (passo
4 do pipeline).

---

### 6.2 Migracao de dados

Risco concreto: o modulo enxuto ja esta mesclado ao main ha tempo
suficiente para ter linhas reais em bancos de desenvolvimento de outros
PCs/ambientes. Uma migration de substituicao nao pode simplesmente
DROP TABLE as 4 tabelas do enxuto sem antes preservar os dados que possam
existir.

Estrategia recomendada (migration nova, a criar pelo programador DEPOIS
de 20260807-000271, ex.: 20260807-000280-migrate-legal-lean-to-jur.cjs):

1. Copiar, nao mover, com verificacao de existencia de tabela (mesmo
   padrao idempotente ja usado em 20260807-000268, que usa
   queryInterface.describeTable/showIndex antes de agir): a migration
   nova deve checar queryInterface.showAllTables() e so executar o bloco
   de copia se legal_contracts (e as demais) existirem no banco de
   destino - em um banco criado do zero apos a substituicao, as tabelas
   do enxuto nunca existirao, e o bloco de copia deve ser pulado
   silenciosamente.
2. Mapeamento campo a campo, com perdas assumidas e documentadas (nao e
   um mapeamento 1:1 perfeito, porque os dois desenhos divergem):
   - legal_contracts (id, contract_number, title-object, start_date,
     end_date, status, created_at, updated_at) para jur_contracts (mesmos
     campos ou equivalentes diretos).
   - legal_contracts.contract_type (enum PT-BR: clt_indeterminado,
     distribuicao, etc.) para jur_contracts.contract_type (enum ingles:
     employment, distribution, etc.) - precisa de tabela de traducao
     explicita (clt_indeterminado/clt_determinado/experiencia/estagio/
     aprendiz para employment; distribuicao para distribution;
     representacao_comercial para commercial_representation;
     fornecimento para supplier; prestacao_servicos para service;
     confidencialidade para nda; licenciamento_marca para
     trademark_license; outro para other) - a migration deve fazer isso
     via CASE WHEN em SQL puro, nao deixar para o programador resolver em
     runtime.
   - legal_contracts.party_a/party_b (texto livre) nao tem equivalente
     direto em jur_contracts (que usa FK polimorfica
     supplier_id/client_id/employee_id OU counterparty_name+
     counterparty_doc) - a migracao de dados deve gravar
     counterparty_type=other, counterparty_name = party_b (a contraparte,
     assumindo party_a = EVOK na maioria dos casos - premissa a validar
     manualmente linha a linha, nao automatizavel com seguranca),
     counterparty_doc = MIGRADO-SEM-DOC como placeholder explicito (o
     CHECK de exclusividade mutua exige counterparty_doc preenchido
     quando counterparty_type=other - sem placeholder, a migracao de
     dados falharia a constraint).
   - legal_contracts.value (DECIMAL 15,2) para jur_contracts.value
     (DECIMAL 18,6) - cast seguro, sem perda (precisao maior no destino).
   - legal_contract_addendums para jur_contract_addendums: mapeamento
     direto de addendum_number/change_type/new_end_date/new_value/
     signed_date; previous_end_date/previous_value (que o enxuto nao
     tinha) ficam NULL para linhas migradas - perda de dado historico
     aceita e documentada, nao ha como reconstruir retroativamente.
   - legal_contract_reminders nao migra para jur_legal_alerts
     diretamente - sao conceitos diferentes (jur_legal_alerts e
     polimorfica com origin_type/origin_id; o enxuto e 1:1 com contrato).
     Migracao recomendada: para cada legal_contract_reminders orfa
     (contrato migrado, lembrete ainda nao disparado, notified=false),
     criar uma linha em jur_legal_alerts com origin_type=contract,
     origin_id (novo id em jur_contracts), alert_subtype derivado de
     reminder_type. Lembretes ja notified=true nao precisam ser recriados
     (nao tem mais funcao).
   - legal_intellectual_property para jur_intellectual_property:
     mapeamento direto na maioria dos campos (ip_type, title,
     registration_number, filing_date, grant_date, expiration_date,
     status); owner/jurisdiction (que o enxuto tinha e
     jur_intellectual_property nao tem) sao descartados - confirmado que
     nao fazem falta funcional (owner e sempre EVOK AUDIO LTDA,
     jurisdiction sempre BR no dataset real, conforme
     docs/juridico/02-PROPRIEDADE_INTELECTUAL.md); responsible_user_id
     (NOT NULL em jur_intellectual_property, inexistente no enxuto)
     precisa de um valor default explicito na migracao (ex.: usuario
     admin/seed, com aviso de que precisa reatribuicao manual
     pos-migracao).
3. So entao dropar as 4 tabelas antigas, dentro da mesma transacao da
   copia (nao em uma migration separada - se a copia falhar por qualquer
   motivo, o DROP nao deve executar).
4. NAO deletar a migration 20260807-000220-create-legal-module.cjs - ela
   pode estar registrada em SequelizeMeta de outros ambientes (outros
   PCs/CI) que ja rodaram migration:up antes da mesclagem desta
   auditoria; deletar o arquivo quebraria migration:status/rollback
   nesses ambientes. A migration de substituicao deve conviver com a
   000220 (que continua existindo e sendo idempotente - ja usa
   showAllTables() antes de criar), apenas remove o resultado dela em
   runtime na migration nova subsequente.
5. down() da migration de substituicao: deliberadamente nao tenta
   reverter a copia de dados (recriar as 4 tabelas do enxuto com os dados
   originais seria reconstruir um estado com perda de informacao
   conhecida, ver item 2) - o down() deve apenas recriar as 4 tabelas
   vazias (mesmo shape da 000220) e emitir um aviso de que os dados
   migrados para jur_* nao retornam automaticamente, mesmo padrao de
   down() melhor-esforco-nao-perfeito ja aceito em outras migrations de
   dado do projeto.

---

### 6.3 Inventario de codigo a remover/substituir

| Camada | Arquivo(s) | Acao |
|---|---|---|
| Migration | server/migrations/20260807-000220-create-legal-module.cjs | Manter (nao deletar, ver 6.2 item 4) - apenas superada em efeito pela migration de substituicao |
| Models | server/src/models/LegalContract.ts, LegalContractAddendum.ts, LegalContractReminder.ts, LegalIntellectualProperty.ts | Remover, substituir por models novos JurContract, JurContractAddendum, etc. (Clean Architecture, server/src/modules/juridico/domain/entities/) |
| Registro de associacoes | server/src/models/index.ts (imports LegalContract*, hasMany/belongsTo, export) | Remover as linhas do enxuto quando os models forem removidos |
| Use-cases | server/src/modules/legal/application/use-cases/** (contract/addendum/reminder/intellectualProperty, ~19 arquivos) | Remover - Bloco 3 tem use-cases proprios e mais completos (maquina de estados, dupla confirmacao, etc.) |
| Repositorios | server/src/modules/legal/domain/repositories/**, server/src/modules/legal/infrastructure/sequelize/** | Remover |
| Controllers/rotas | server/src/modules/legal/presentation/controllers/**, .../routes/legal.ts | Remover; server/app.ts (linha do app.use para /api/legal) precisa ser trocado por um app.use para /api/jur apontando para o router novo do modulo juridico - decisao de produto (nao desta auditoria): manter /api/legal como alias temporario redirecionando para /api/jur por 1 release, ou quebrar direto |
| Validators | server/src/modules/legal/presentation/validators/** | Remover |
| Upload middleware | server/src/modules/legal/presentation/middlewares/contractFileUpload.ts | Avaliar reaproveitamento - o Bloco 3 tambem precisa de upload de minuta; se a logica for generica (Multer padrao do projeto), pode ser promovida para um helper compartilhado em vez de duplicada |
| Testes | server/tests/unit/legal-addendum-reminder-use-cases.test.ts, legal-contract-use-cases.test.ts, legal-intellectual-property-use-cases.test.ts | Remover, substituir por testes novos do Bloco 3 |
| API client | client/src/api/legal.ts | Remover, substituir por client/src/api/juridico.ts (ou equivalente) cobrindo os 71 endpoints /api/jur/* |
| Telas | client/src/pages/legal/LegalPage.tsx, ContractsTab.tsx, IntellectualPropertyTab.tsx | Ver 6.4 - reaproveitamento parcial, nao remocao total |
| Rota do React Router | client/src/App.tsx (path=/legal, dentro do Route com ModuleRoute module=juridico) | Manter a rota /legal (ou renomear para /juridico, decisao de UX) - o ModuleRoute module=juridico ja esta correto e nao muda |
| Docs departamentais | docs/juridico/01-CONTRATOS.md, 02-PROPRIEDADE_INTELECTUAL.md | Foram atualizados pelo commit 2ad27fd para descrever o enxuto - precisam de nova atualizacao quando o Bloco 3 for implementado, para nao ficarem descrevendo um modulo que nao existe mais (fora do escopo desta auditoria - sinalizar para documentador) |

---

### 6.4 Reaproveitamento de tela (client/src/pages/legal/)

- LegalPage.tsx (78 linhas, shell de tabs): estrutura de page-com-tabs no
  mesmo padrao de outros modulos do projeto (SST, TI) - reaproveitavel
  como esqueleto, so troca a lista de tabs (hoje: Contratos, PI; Bloco 3
  precisa de: Contratos, Contencioso, Prazos Fatais, Procuracoes, PI,
  LGPD - 6 abas em vez de 2).
- ContractsTab.tsx (692 linhas): a tela de listagem/formulario de
  contrato provavelmente cobre boa parte do CRUD basico de jur_contracts
  (listagem, filtros, criar, editar) - reaproveitavel como ponto de
  partida, mas precisa de extensao significativa: contraparte
  polimorfica (hoje e texto livre party_a/party_b), workflow de ativacao
  com validacao de signatarios/documentos, aditivos com snapshot de
  valores anteriores, checklist de clausulas. Nao e reescrever do zero,
  mas tambem nao e usar como esta. Estimativa qualitativa: 40-50%
  aproveitavel.
- IntellectualPropertyTab.tsx (330 linhas): CRUD de PI mais simples -
  reaproveitavel em maior proporcao que a de contratos, mas precisa
  adicionar a regra de RBAC de campo/recurso do trade_secret (role=admin,
  hoje provavelmente ausente no enxuto) e o vinculo N:N com contrato
  (jur_ip_contract_links, que o enxuto nao tem). Estimativa qualitativa:
  50-60% aproveitavel.
- Sem equivalente no enxuto (construir do zero): telas de Contencioso
  (processo/andamento/provisao), Prazos Fatais (fila com dupla
  confirmacao - a tela mais critica, precisa de UX que force a
  identidade do segundo confirmante via sessao, nao via campo de
  formulario), Procuracoes, e as 3 telas de LGPD (RoPA, Solicitacao de
  Titular, Incidente).

Nota final desta secao: esta auditoria nao executa nenhuma parte deste
plano - e entrega para o programador (passo 4 do pipeline), incluindo a
decisao de produto pendente sobre /api/legal vs /api/jur (alias
temporario ou corte direto).

---

## Checklist de autoavaliacao (fechamento)

- [x] Rastreabilidade total verificada: Requisitos - Modelo de Dados -
      Endpoints, todos os 46 RF-JUR, nao amostral (secao 1).
- [x] Nenhuma regra de negocio descrita no Requisito foi omitida na API ou
      no Banco - verificado via BR-JUR-* referenciadas em cada RF,
      cruzadas contra CHECKs/triggers (Banco) e validacoes/erros
      documentados (API).
- [x] Nomes de campos e entidades comparados de forma sistematica
      (leitura completa dos 3 documentos + grep em todas as 12
      migrations), nao por memoria - achado real encontrado e corrigido
      (secao 3.1).
- [x] Cada inconsistencia tem localizacao exata (arquivo + secao) - ver
      secao 3.
- [x] Relatorio apresentado por completo na resposta ao
      usuario/orquestrador.
- [x] Pendencias reais adicionadas a docs/governance/TODO.md (acao
      complementar apos salvar este arquivo).
- [ ] Nao coberto por este agente (fora de escopo, sinalizado para os
      agentes corretos): qualidade de implementacao do modulo enxuto ja
      mesclado (auditor); execucao real da migracao de dados da secao 6.2
      (programador); teste funcional/integracao de qualquer parte do
      Bloco 3 (nenhum codigo foi escrito ainda).

---

## Referencias

- docs/business/BLOCO_3_JUR_REQUISITOS.md
- docs/business/BLOCO_3_JUR_MODELO_DADOS.md (corrigido nesta auditoria)
- docs/business/BLOCO_3_JUR_API.md (corrigido nesta auditoria)
- docs/business/briefs/BRIEF_JUR_2026-08-06.md
- server/migrations/20260807-000260-*.cjs a 20260807-000271-*.cjs
  (renomeadas/corrigidas nesta auditoria)
- server/migrations/20260807-000220-create-legal-module.cjs (modulo
  enxuto, commit 2ad27fd, a ser substituido conforme secao 6)
- server/src/shared/domain/accessModules.ts (chave juridico, ja presente
  antes desta auditoria)
- server/app.ts (mount de /api/legal, a ser revisado no passo de
  substituicao)

**Fim da auditoria cruzada - BLOCO 3 (Juridico).**
