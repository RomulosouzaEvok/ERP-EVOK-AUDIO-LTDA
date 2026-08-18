# BLOCO 1 — Módulo SST (Segurança e Saúde do Trabalho) — Contrato de API

**Departamento:** 15 — Segurança do Trabalho (SST).
**Insumos:** `docs/business/briefs/BRIEF_SST_2026-08-06.md` (domínio) e
`docs/business/BLOCO_1_SST_REQUISITOS.md` (55 RF-SST, UC-44 a UC-48).
**Autor:** `ArquitetoSoftwareAPI`.
**Data:** 2026-08-06.
**Status:** 🟡 Contrato pronto para implementação (`programador`). **Nenhum
código foi criado neste passo** — apenas a especificação. Segue estritamente
o padrão de módulo maduro Clean Architecture (`server/src/modules/maintenance/`,
`server/src/modules/nonConformities/`) e o formato de
`docs/arquitetura/API.md`, ao qual esta seção deve ser anexada
verbatim quando o módulo for implementado (ver `Handoff` no final).

Base URL: `/api/sst/*` (novo módulo `server/src/modules/sst/`), exceto onde
indicado (ex.: reaproveitamento de `/api/inventory/movements`).

**Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas
(`authenticate`). Identidade de quem executa a ação **sempre** vem de
`req.user.id` (nunca do body) — aplica-se a `entregue_por`, `registrado_por`,
`emitente`, `autorizante`, etc. Referência a pessoa em qualquer payload usa
exclusivamente `employee_id` (nunca duplica nome/CPF — quem quiser exibir,
resolve via `GET /api/employees/:id`).

**RBAC — novo módulo `sst`:** requer adicionar a chave `sst` ao catálogo
`ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`, hoje 30
chaves), seguindo exatamente o padrão de `manutencao`/`qualidade`:

```ts
{ key: 'sst', label: 'Segurança e Saúde do Trabalho (SST)' }
```

Adicionar também `'sst'` à union `AccessModuleKey`. **Isso é uma tarefa do
`programador`** (é código, não contrato) — documentado aqui apenas para que
o handoff não deixe a chave subentendida.

**Regra de nível de acesso do módulo `sst` (mais restritiva que a maioria dos
módulos do projeto, decisão §5.3 do documento de requisitos):** para as
entidades que carregam dado clínico/sensível (`ASO`, `ExameComplementar`,
`Acidente`, `CAT`), a leitura do **detalhe completo** exige
`authorizeModule('sst')` — autenticação simples não basta, diferente do
padrão hoje usado por `GET /api/employees`. Escritas comuns exigem nível
`operate`; confirmação de EntregaEPI, emissão/reabertura de CAT, aprovação
de requisição de compra automática de EPI, fechamento de Acidente com
gravidade grave, e reenvio de evento eSocial exigem nível `approve`.

**Duas rotas de leitura enxuta são exceção deliberada** ao bloqueio total do
módulo `sst` (mesma lógica do módulo `rh`, que expõe `GET /api/employees`
básico sem exigir a chave `rh` — ver comentário em `accessModules.ts`):

1. `GET /api/sst/aso/status/:employeeId` (RF-SST-021) — consumida pelo RH no
   gate de admissão/retorno.
2. `GET /api/sst/cipa/stability/:employeeId` (RF-SST-031) — consumida pelo RH
   no gate de desligamento.

Ambas são acessíveis a qualquer usuário autenticado com módulo `sst` **ou**
`rh` (checagem inline no controller, `req.user.permissions.sst ||
req.user.permissions.rh || req.user.role === 'admin'`, mesmo padrão de
checagem redundante rota+controller já documentado na seção 15 de
`docs/arquitetura/API.md` para Requisição de Compra). Ambas nunca retornam
dado clínico/texto livre — apenas status derivado. Todo acesso a essas duas
rotas gera log de leitura (RNF-SST-05).

**Padrão de erro:** idêntico ao restante do projeto — `AppError` e
subclasses (`ValidationError` 400/422, `NotFoundError` 404,
`UnauthorizedError` 401, `ForbiddenError` 403, `ConflictError` 409,
`BusinessRuleError` 422) tratadas pelo `errorHandler` central, nunca stack
trace ao cliente. Ver `docs/arquitetura/API.md` seção "Respostas Padrão".

---

## Estrutura de módulo (Clean Architecture)

```
server/src/modules/sst/
├── domain/
│   ├── entities/            # TipoEPI, EntregaEPI, ASO, Acidente, CAT, MandatoCIPA, ...
│   └── repositories/        # Interfaces (EpiRepository, AsoRepository, AccidentRepository,
│                             #  CipaRepository, EsocialEventRepository, RiskRepository,
│                             #  TrainingRepository, InspectionRepository, ...)
├── application/
│   └── use-cases/           # Um UseCase por ação de negócio (ver lista completa por
│                             #  recurso abaixo — nunca importa Sequelize direto)
├── infrastructure/
│   └── sequelize/           # SequelizeXxxRepository implementando as interfaces de domain/
└── presentation/
    ├── controllers/         # epiController, asoController, accidentController,
    │                         #  cipaController, esocialController, pgrController,
    │                         #  trainingController, safetyRoutineController
    └── routes/               # sst.ts (monta tudo em /api/sst, um único router agregador,
                              #  mesmo padrão de server/src/routes/*.ts)
```

**Tipos extraídos para `*Types.ts`** (evitar a armadilha de export ESM+CJS no
mesmo arquivo, ver `CLAUDE.md`/system prompt): `EpiTypes.ts`, `AsoTypes.ts`,
`AccidentTypes.ts`, `CipaTypes.ts`, `EsocialEventTypes.ts` — cada um contendo
somente `export interface`/`export type` dos DTOs de entrada/saída daquele
recurso, importados pelos controllers e use-cases. Nenhuma classe com
`export =` deve dividir arquivo com um `export interface`.

**Regra transversal de baixo acoplamento:** todo UseCase deste módulo que
precisa mexer em estoque (`ConfirmEpiDeliveryUseCase`) recebe uma interface
`InventoryMovementService` (injetada, implementada por um adapter que chama
o use-case real de `server/src/modules/inventory/`) — nunca importa
Sequelize/Model do módulo `inventory` diretamente. Mesma regra para o
adapter de fila eSocial (`EsocialTransmissionGateway`), que hoje só enfileira
(nenhuma chamada de transmissão física neste bloco).

---

## 1. EPI — Catálogo, Matriz e Entrega (NR-6) — UC-44

Base: `/api/sst/epi-types`, `/api/sst/epi-matrix`, `/api/sst/epi-deliveries`.
`authorizeModule('sst', ...)`: leituras `operate`, escritas comuns
`operate`, confirmação de entrega `approve`.

### 1.1 TipoEPI (catálogo)

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/epi-types` | operate | Lista TipoEPI (filtros: `active`, `ca_valido`, `item_id`) |
| `GET` | `/api/sst/epi-types/:id` | operate | Detalhe |
| `POST` | `/api/sst/epi-types` | operate | Cria/homologa um TipoEPI |
| `PUT` | `/api/sst/epi-types/:id` | operate | Atualiza (inclusive `active: false` — não há `DELETE`, é catálogo histórico referenciado por EntregaEPI) |

**POST /api/sst/epi-types — Request:**
```json
{
  "nome": "Protetor Auricular Plug",
  "ca_numero": "12345",
  "ca_validade": "2027-03-01",
  "fabricante": "3M",
  "vida_util_dias": 90,
  "tamanhos": ["único"],
  "foto_url": null,
  "item_id": "9f2b1a20-...-uuid",
  "active": true
}
```
`item_id`: UUID de `items.id` (FK opcional, nullable — decisão §5.2 do
documento de requisitos). `ca_numero`/`ca_validade` obrigatórios em runtime
mesmo que o schema Zod não force (BR-SST-001) — `ValidationError` 400 se
ausentes.

**Erros:**
| Código | Quando |
|---|---|
| 400 | `nome`, `ca_numero` ou `ca_validade` ausentes |
| 404 | `item_id` informado não existe em `items` |
| 409 | `ca_numero` já cadastrado em outro TipoEPI ativo (unicidade lógica) |

### 1.2 MatrizEPI (função/setor × EPI)

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/epi-matrix` | operate | Lista (filtros: `position`, `department_id`, `epi_type_id`) |
| `POST` | `/api/sst/epi-matrix` | operate | Cria vínculo função/setor × TipoEPI + quantidade padrão |
| `PUT` | `/api/sst/epi-matrix/:id` | operate | Atualiza quantidade/observação |
| `DELETE` | `/api/sst/epi-matrix/:id` | approve | Remove vínculo (não há histórico legal aqui — é regra viva, diferente de EntregaEPI) |

**POST — Request:**
```json
{ "position": "Operador de Injetora", "department_id": 4, "epi_type_id": 12, "quantidade_padrao": 2, "observacao": null }
```
`position` **ou** `department_id` obrigatório (ao menos um) — `400` se
ambos ausentes.

### 1.3 EntregaEPI (Ficha de EPI) — imutável após confirmação

Modelada como **transição de estado**, não CRUD livre:
`rascunho → confirmada` (única transição possível; `rascunho` pode receber
`PATCH` de evidência; `confirmada` não aceita `PUT`/`DELETE` — RF-SST-007,
RNF-SST-01). Devolução (dano/perda) é um sub-recurso separado que **não**
altera os campos originais da entrega.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/epi-deliveries` | operate | Lista (filtros: `employee_id`, `epi_type_id`, `status`, `motivo`, `vencendo_em_dias`) |
| `GET` | `/api/sst/epi-deliveries/:id` | operate | Detalhe |
| `POST` | `/api/sst/epi-deliveries` | operate | Cria entrega em `rascunho` |
| `PATCH` | `/api/sst/epi-deliveries/:id/evidence` | operate | Anexa evidência de recebimento (assinatura digitalizada/aceite eletrônico/biometria) — só em `rascunho` |
| `POST` | `/api/sst/epi-deliveries/:id/confirm` | **approve** | Confirma a entrega: torna imutável + dispara movimentação de estoque |
| `POST` | `/api/sst/epi-deliveries/:id/return` | operate | Registra devolução (data + condição) de um EPI reutilizável já confirmado — não reabre a entrega original |
| `GET` | `/api/sst/epi-deliveries/ficha/:employeeId` | operate | Ficha de EPI consolidada (imprimível/exportável), inclusive de desligados |
| `GET` | `/api/sst/epi-deliveries/pending-report` | operate | Relatório de pendência crítica (RF-SST-008): ativos em função da MatrizEPI sem entrega vigente |

**POST /api/sst/epi-deliveries — Request:**
```json
{
  "employee_id": 501,
  "epi_type_id": 12,
  "quantidade": 1,
  "motivo": "primeira_entrega",
  "data_entrega": "2026-08-06"
}
```
`motivo` (enum): `primeira_entrega` / `troca_periodica` / `dano` / `perda` /
`mudanca_funcao`. `entregue_por` **nunca** vem do body — sempre
`req.user.id`. Resposta (`201`) inclui `data_prevista_troca` calculada
(`data_entrega + TipoEPI.vida_util_dias`, RF-SST-006) e `status: "rascunho"`.

**Erro (422/`BUSINESS_RULE_VIOLATION`)** — `ca_validade` do TipoEPI já
vencida na `data_entrega` (BR-SST-001): a entrega **não é criada**.

**PATCH /:id/evidence — Request:**
```json
{ "tipo_evidencia": "aceite_eletronico", "arquivo_url": "https://.../assinatura-501.png" }
```
`tipo_evidencia` (enum): `assinatura_digitalizada` / `aceite_eletronico` /
`biometria` (exemplo corrigido na auditoria cruzada — o valor original,
`"assinatura_eletronica"`, não é um dos 3 valores do ENUM
`sst_entregas_epi.evidencia_tipo`, `server/migrations/20260806-000131-create-sst-entrega-epi.cjs`;
falharia com violação de tipo ENUM se implementado literalmente).

**POST /:id/confirm** (sem body). Efeitos, todos na mesma transação
(padrão de transação atômica de `docs/arquitetura/API.md` seção 8.1
transferências):
1. Valida CA do TipoEPI ainda não vencido na data corrente (revalidação —
   E1/BR-SST-001).
2. Valida evidência de recebimento presente (E2/BR-SST-002).
3. Chama `InventoryMovementService.registerOutbound({ item_id, quantity,
   reason: 'entrega_epi', reference_type: 'EntregaEPI', reference_id })` —
   reaproveita o use-case real de `/api/inventory/movements`, sem controle
   de saldo paralelo.
4. Marca `status: "confirmada"`, `confirmado_em`, `confirmado_por`
   (`req.user.id`). Registro passa a ser imutável.

**Erros de `POST /:id/confirm`:**
| Código | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Entrega já está `confirmada` (idempotência negativa — não re-confirma) |
| 404 | `NOT_FOUND` | Entrega não encontrada |
| 422 | `BUSINESS_RULE_VIOLATION` | CA vencido na data da confirmação (E1) |
| 422 | `BUSINESS_RULE_VIOLATION` | Evidência de recebimento ausente (E2) |
| 409 | `CONFLICT` | Estoque insuficiente do `Item` vinculado (E3) — nada é confirmado, nem entrega nem estoque (transação revertida) |
| 403 | `FORBIDDEN` | Nível `operate` tentando confirmar (exige `approve`) |

**POST /:id/return — Request:**
```json
{ "data_devolucao": "2026-09-01", "condicao": "danificado" }
```
Só aplicável a `EntregaEPI.status = "confirmada"` e a EPI reutilizável
(`TipoEPI` marcado como tal); não reabre nem edita os campos originais e
**não grava coluna na própria `sst_entregas_epi`** — cria uma linha em
`sst_devolucoes_epi` (tabela própria, insert-only, decisão final do
`AdmDBA`, `BLOCO_1_SST_MODELO_DADOS.md` §1.3/§14 item 3), referenciando
`entrega_epi_id`. **Correção aplicada na auditoria cruzada
(`AuditorIntegrador`, 2026-08-06):** a redação anterior desta seção
("grava em coluna própria devolucao_data/devolucao_condicao") descrevia um
desenho de coluna-na-própria-tabela que o `AdmDBA` descartou em favor da
tabela dedicada — o texto estava desalinhado com o schema real. O
repositório de `GET /ficha/:employeeId` faz o `JOIN`
`sst_entregas_epi` × `sst_devolucoes_epi` (campo de resposta `devolucao`,
`null` se não houver linha correspondente), preservando histórico íntegro
(BR-SST-006/RNF-SST-01).

**GET /ficha/:employeeId — Response (200):**
```json
{
  "success": true,
  "data": {
    "employee_id": 501,
    "entregas": [
      { "id": 900, "epi_type": { "id": 12, "nome": "Protetor Auricular Plug", "ca_numero": "12345" },
        "quantidade": 1, "motivo": "primeira_entrega", "data_entrega": "2026-08-06",
        "data_prevista_troca": "2026-11-04", "status": "confirmada",
        "evidencia": { "tipo": "aceite_eletronico", "arquivo_url": "..." },
        "devolucao": null }
    ],
    "gerado_em": "2026-08-06T12:00:00Z"
  }
}
```

---

## 2. ASO / PCMSO (NR-7) — UC-45

Base: `/api/sst/aso`, `/api/sst/exam-plans`. `authorizeModule('sst')` para
detalhe completo (dado clínico); a rota de status (§0) é a exceção
documentada acima.

### 2.1 PlanoExames

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/exam-plans` | operate | Lista (filtros: `position`, `ges_id`) |
| `POST` | `/api/sst/exam-plans` | operate | Cria item de plano (função/GES × tipo de exame × periodicidade) |
| `PUT` | `/api/sst/exam-plans/:id` | operate | Atualiza periodicidade/risco exigido |

**POST — Request:**
```json
{ "position": "Operador de Injetora", "ges_id": 3, "tipo_exame": "audiometria", "periodicidade_meses": 12, "risco_exigido": "ruido_85db" }
```
`position` **ou** `ges_id` obrigatório.

### 2.2 ASO

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/aso` | operate (+`sst`) | Lista ASOs (filtros: `employee_id`, `tipo`, `resultado`, `vencendo_em_dias`) — retorna shape resumido (sem restrições/texto clínico na lista) |
| `GET` | `/api/sst/aso/:id` | operate (+`sst`) | Detalhe completo (inclui restrições, médico, arquivo) — log de leitura (RNF-SST-05) |
| `POST` | `/api/sst/aso` | operate | Registra um ASO realizado |
| `POST` | `/api/sst/aso/:id/complementary-exams` | operate | Registra ExameComplementar vinculado |
| `GET` | `/api/sst/aso/status/:employeeId` | **exceção `sst`\|`rh`** | Status enxuto de aptidão (RF-SST-021) |
| `GET` | `/api/sst/aso/upcoming` | operate | ASOs a vencer em 30/60 dias, por tipo/setor (dashboard) |

**POST /api/sst/aso — Request:**
```json
{
  "employee_id": 501,
  "tipo": "periodico",
  "data_realizacao": "2026-08-06",
  "resultado": "apto",
  "restricoes": null,
  "medico_examinador": "Dr. João Silva - CRM 12345",
  "medico_coordenador_pcmso": "Dra. Ana Souza - CRM 54321",
  "arquivo_url": "https://.../aso-501-2026.pdf"
}
```
`tipo` (enum): `admissional` / `periodico` / `retorno_trabalho` /
`mudanca_riscos` / `demissional`. `resultado` (enum): `apto` / `inapto` /
`apto_com_restricoes`. Resposta (`201`) inclui `data_vencimento` calculada
a partir do `PlanoExames` da função/GES do funcionário (RF-SST-016) e
dispara automaticamente:
1. `EventoESocialSST` tipo `S-2220` em `pendente` (RF-SST-041).
2. Se `resultado` = `inapto` ou `apto_com_restricoes` incompatível:
   notificação a SST/RH/liderança + bloqueio de apontamento do funcionário
   na função de origem até novo ASO apto (RF-SST-018) — implementado como
   flag consultada pelo módulo de Apontamento (RNF-SST-06), não como
   `DELETE`/alteração de cadastro do funcionário.

**Erro (422/`BUSINESS_RULE_VIOLATION`)** — `PlanoExames` inexistente para a
função/GES do funcionário na criação de ASO periódico (sem base para
calcular vencimento) — bloqueia com mensagem orientando cadastro do plano.

**POST /:id/complementary-exams — Request:**
```json
{ "tipo": "audiometria", "data": "2026-08-06", "resultado_url": "https://.../audiometria-501.pdf", "alterado": false }
```

**GET /api/sst/aso/status/:employeeId — Response (200):**
```json
{
  "success": true,
  "data": {
    "employee_id": 501,
    "status": "apto",
    "tipo_ultimo_aso": "periodico",
    "data_ultimo_aso": "2026-08-06",
    "vencimento": "2027-08-06"
  }
}
```
`status` (enum de saída): `apto` / `inapto` / `apto_com_restricoes` /
`pendente` (sem ASO admissional registrado ainda). **Nunca** inclui
`restricoes` (texto livre), `medico_examinador` nem `arquivo_url` — apenas
o suficiente para o gate de admissão/retorno do RH (decisão §5.1 do
documento de requisitos).

**Erro (403)** — usuário sem módulo `sst` nem `rh` tentando ler
`GET /api/sst/aso/:id` (detalhe completo) ou `GET /api/sst/aso/status/:id`
sem nenhum dos dois módulos — `ForbiddenError`, log de tentativa
(RF-SST-054/BR-SST-036).

---

## 3. Acidente e CAT (Lei 8.213/91) — UC-46

Base: `/api/sst/accidents`. `authorizeModule('sst')` para detalhe;
`operate` para registrar; `approve` para emitir/reabrir CAT e para encerrar
acidente grave.

Acidente é **imutável nos campos originais** após criado (RF-SST-023);
"dias perdidos" e demais complementos são lançamentos adicionais, não
`UPDATE` do registro original (RNF-SST-01).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/accidents` | operate (+`sst`) | Lista (filtros: `employee_id`, `tipo`, `gravidade`, `status`, `com_cat`, `start_date`, `end_date`) |
| `GET` | `/api/sst/accidents/:id` | operate (+`sst`) | Detalhe (inclui CATs, investigação, complementos) |
| `POST` | `/api/sst/accidents` | operate | Registra o acidente (imutável a partir daqui) |
| `POST` | `/api/sst/accidents/:id/complements` | operate | Lança complemento (ex.: dias perdidos atualizados) — trilha de auditoria, não sobrescreve |
| `POST` | `/api/sst/accidents/:id/close` | approve | Encerra o acidente (bloqueado se gravidade ≥ "com afastamento" sem investigação + ao menos 1 ação corretiva) |
| `POST` | `/api/sst/accidents/:id/cat` | approve | Emite CAT vinculada (tipo `inicial`); calcula prazo-limite legal |
| `GET` | `/api/sst/accidents/:id/cat` | operate (+`sst`) | Lista CATs do acidente (inicial + reaberturas) |
| `POST` | `/api/sst/cat/:catId/reopen` | approve | Emite CAT tipo `reabertura` vinculada ao mesmo acidente |
| `POST` | `/api/sst/accidents/:id/investigation` | operate | Abre InvestigacaoAcidente (participantes, causas, evidências) |
| `GET` | `/api/sst/accidents/:id/investigation` | operate (+`sst`) | Detalhe da investigação |

**POST /api/sst/accidents — Request:**
```json
{
  "employee_id": 501,
  "data_hora": "2026-08-06T14:30:00Z",
  "tipo": "tipico",
  "local_setor": "Injeção",
  "descricao": "Queimadura leve na mão ao manusear molde",
  "parte_corpo": "mao_direita",
  "agente_causador": "superficie_quente",
  "gravidade": "com_afastamento",
  "dias_perdidos": 0,
  "testemunhas": [502, 503]
}
```
`tipo` (enum): `tipico` / `trajeto` / `doenca_ocupacional`. `gravidade`
(enum): `sem_afastamento` / `com_afastamento` / `incapacidade_permanente` /
`obito`. `testemunhas`: array de `employee_id`. Resposta (`201`) inclui
`prazo_limite_cat` já calculado (ver `POST .../cat`).

**Erro (400)** — campos obrigatórios ausentes (`employee_id`, `data_hora`,
`tipo`, `gravidade`).

**POST /api/sst/accidents/:id/complements — Request:**
```json
{ "campo": "dias_perdidos", "valor": 12, "motivo": "atestado médico atualizado" }
```
Grava como linha de histórico (`AccidentComplement`), nunca `UPDATE` direto
na coluna do acidente original (RNF-SST-01). `GET /:id` retorna o acidente
com `dias_perdidos` já somado/consolidado + a lista de complementos
(auditoria).

**POST /api/sst/accidents/:id/cat — Request:**
```json
{}
```
O cliente não escolhe o tipo: o backend deriva `obito` exclusivamente quando
`accident.gravidade = "obito"` e `inicial` nos demais casos. Um `tipo` legado
explicitamente incoerente recebe 422. A autoria é exclusivamente o usuário
autenticado, persistido em `emitente_id`; não há texto livre de emitente. Efeitos:
1. Calcula `prazo_limite`: 1º dia útil seguinte a `accident.data_hora`
   considerando apenas sábado/domingo como não úteis, sem calendário de
   feriados nacionais nesta versão (simplificação de RNF-SST-04); imediato
   (`prazo_limite = data_hora`) se `gravidade = "obito"`.
2. Cria `EventoESocialSST` tipo `S-2210`, `status: "pendente"`
   (RF-SST-042).
3. Não bloqueia a criação se `prazo_limite` já estiver no passado (E1) — o
   evento nasce como pendência crítica visível na fila (§4), nunca
   descartado.

**Erro (422/`BUSINESS_RULE_VIOLATION`)** — tentativa de emitir 2ª CAT
`inicial` para o mesmo acidente (deve usar `POST /cat/:catId/reopen` para
reabertura).

**POST /api/sst/accidents/:id/close — Erro (422/`BUSINESS_RULE_VIOLATION`)**
— `gravidade` ∈ {`com_afastamento`, `incapacidade_permanente`, `obito`} e
não existe `InvestigacaoAcidente` com pelo menos 1 `AcaoCorretiva`
(RF-SST-026/BR-SST-018) — E2 do UC-46. Mensagem no padrão "O QUE / POR QUE /
O QUE FAZER".

**POST /api/sst/accidents/:id/investigation — Request:**
```json
{
  "participantes": [10, 15, 501],
  "causas": ["Piso escorregadio próximo à injetora 3", "Ausência de sinalização"],
  "evidencias": ["https://.../foto1.jpg"],
  "acoes_corretivas": [
    { "descricao": "Instalar sinalização de piso molhado", "responsavel_id": 20, "prazo": "2026-08-20" }
  ]
}
```
`acoes_corretivas` (opcional no payload, mas **recomendado** — se vazio, a
API cria a investigação e o Técnico SST deve chamar
`POST /api/sst/corrective-actions` separadamente antes de conseguir fechar o
acidente, ver regra de `close` acima). Cada item de `acoes_corretivas` gera
um registro em `AcaoCorretiva` com `origem: "investigacao_acidente"`.

---

## 4. Fila de Eventos eSocial SST (S-2210/S-2220/S-2240) — UC-47

Base: `/api/sst/esocial-events`. `authorizeModule('sst')`; reenvio exige
`approve`. **Fila, não envio síncrono** — nenhuma rota deste bloco chama o
webservice do governo diretamente; a transmissão física é infraestrutura
compartilhada com o RH, fora de escopo (decisão do brief, seção (d)).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/esocial-events` | operate | Lista fila (filtros: `tipo` `S-2210`/`S-2220`/`S-2240`, `status`, `vencido`) |
| `GET` | `/api/sst/esocial-events/:id` | operate | Detalhe (inclui payload de referência e histórico de tentativas) |
| `POST` | `/api/sst/esocial-events/:id/resend` | **approve** | Reenvio manual de evento `rejeitado` |

Eventos **não são criados diretamente por esta API** — nascem como efeito
colateral de `POST /api/sst/aso` (S-2220), `POST /api/sst/accidents/:id/cat`
(S-2210) e `POST /api/sst/ges/:id/members` (S-2240, seção 6). Não há
`POST /api/sst/esocial-events` genérico nem `DELETE` em nenhuma rota — a
fila nunca perde nem descarta um evento (RNF-SST-03/BR-SST-030).

**GET /api/sst/esocial-events — Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3001, "tipo": "S-2210", "entidade_origem": { "tipo": "CAT", "id": 77 },
      "prazo_legal": "2026-08-07T23:59:59Z", "status": "pendente", "recibo": null,
      "data_envio": null, "tentativas": 0
    }
  ]
}
```

**POST /:id/resend — Erros:**
| Código | Quando |
|---|---|
| 400 | Evento não está em `rejeitado` (só reenvia rejeitado — `pendente` aguarda o job normal; `aceito` é terminal) |
| 403 | Nível `operate` tentando reenviar (exige `approve`) |

**Idempotência (E2 do UC-47):** o reenvio usa o identificador de origem
(`CAT.id`/`ASO.id`/vínculo GES) como chave de idempotência — reprocessar a
fila nunca duplica envio para o mesmo evento.

---

## 5. CIPA (NR-5, CF/88) — UC-48

Base: `/api/sst/cipa/*`. `authorizeModule('sst')`; abertura de processo
eleitoral e criação de mandato exigem `approve`.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/cipa/dimensioning` | operate | Calcula/recalcula dimensionamento atual (titulares/suplentes) a partir do headcount ativo + CNAE parametrizado (RF-SST-028) |
| `GET` | `/api/sst/cipa/mandates` | operate | Lista mandatos |
| `GET` | `/api/sst/cipa/mandates/:id` | operate | Detalhe do mandato com membros |
| `POST` | `/api/sst/cipa/mandates` | **approve** | Cria mandato (a partir de um ProcessoEleitoralCIPA encerrado ou de designação direta) |
| `POST` | `/api/sst/cipa/mandates/:id/members` | **approve** | Adiciona MembroCIPA (eleito/designado) ao mandato |
| `POST` | `/api/sst/cipa/members/:id/take-office` | **approve** | Registra posse — bloqueado sem TreinamentoSST de CIPA válido (E2/BR-SST-024) |
| `POST` | `/api/sst/cipa/electoral-processes` | **approve** | Abre processo eleitoral para o próximo mandato (edital) |
| `POST` | `/api/sst/cipa/electoral-processes/:id/candidates` | operate | Inscreve candidato — bloqueado se já cumpriu 2 mandatos consecutivos eleitos (BR-SST-021) |
| `POST` | `/api/sst/cipa/electoral-processes/:id/close` | **approve** | Registra apuração (votos, eleitos, suplentes, atas) |
| `GET` | `/api/sst/cipa/meetings` | operate | Lista reuniões (filtros: `mandate_id`, `tipo`, `mes`) |
| `POST` | `/api/sst/cipa/meetings` | operate | Registra reunião (ordinária/extraordinária) com ata obrigatória |
| `GET` | `/api/sst/cipa/stability/:employeeId` | **exceção `sst`\|`rh`** | Consulta de estabilidade (RF-SST-031) |

**POST /api/sst/cipa/mandates/:id/members — Request:**
```json
{ "employee_id": 501, "origem": "eleito", "papel": "titular", "votos_recebidos": 87, "inicio_candidatura": "2026-06-01" }
```
`origem` (enum): `eleito` / `designado`. `papel` (enum): `presidente` /
`vice_presidente` / `secretario` / `titular` / `suplente` (corrigido na
auditoria cruzada — o texto original usava `vice`, que não corresponde ao
valor real do ENUM em `sst_membros_cipa.papel`,
`server/migrations/20260806-000138-create-sst-cipa.cjs`: `vice_presidente`;
se implementado como escrito, todo `POST` com `papel: "vice"` falharia com
erro de violação de tipo ENUM do Postgres). Se `origem = "eleito"`,
`fim_estabilidade` é calculado automaticamente = `mandate.data_fim + 1 ano`
(RF-SST-031); persistido no membro, nunca recalculado por leitura.

**Erro (422/`BUSINESS_RULE_VIOLATION`)** — `employee_id` já cumpriu 2
mandatos consecutivos como eleito (BR-SST-021).

**POST /:id/take-office — Erro (422/`BUSINESS_RULE_VIOLATION`)** — sem
`TreinamentoSST` tipo `cipa` válido registrado para o `employee_id`
(BR-SST-024).

**GET /api/sst/cipa/stability/:employeeId — Response (200):**
```json
{
  "success": true,
  "data": {
    "employee_id": 501,
    "estavel": true,
    "fim_estabilidade": "2028-01-15",
    "papel": "titular",
    "mandato_id": 4
  }
}
```
`estavel: false` (com `fim_estabilidade: null`) se o funcionário não é/foi
membro CIPA em período de estabilidade vigente. Consumida pelo fluxo de
desligamento do RH — **este endpoint não bloqueia** o desligamento (a
decisão é jurídica/RH); apenas informa (E1 do UC-48).

**POST /api/sst/cipa/meetings — Erro (400)** — reunião `ordinaria` sem
`ata_texto` nem `ata_arquivo_url` (ambos ausentes) — ata é obrigatória por
BR-SST-023.

---

## 6. PGR/GRO e Exposição (NR-1) — RF-SST-035 a 043

Base: `/api/sst/risks`, `/api/sst/ges`. Sem UC formal detalhado (§7 do
documento de requisitos) — contrato mais simples, CRUD com regra de
vencimento.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/risks` | operate | Lista RiscoOcupacional (filtros: `department_id`, `categoria_agente`, `revisao_vencida`) |
| `POST` | `/api/sst/risks` | operate | Cria item do inventário |
| `PUT` | `/api/sst/risks/:id` | operate | Atualiza (nova medição, medidas de controle, `data_revisao`) |
| `GET` | `/api/sst/ges` | operate | Lista GES |
| `POST` | `/api/sst/ges` | operate | Cria GES |
| `POST` | `/api/sst/ges/:id/members` | operate | Vincula `employee_id` ao GES — **gera automaticamente** `EventoESocialSST` tipo `S-2240` pendente (RF-SST-040) |

**POST /api/sst/risks — Request:**
```json
{
  "department_id": 4, "categoria_agente": "fisico", "agente": "ruido",
  "fonte_geradora": "Injetora 3", "intensidade": "92 dB(A)", "data_medicao": "2026-06-01",
  "medido_por": "Empresa XYZ Higiene Ocupacional", "severidade": 4, "probabilidade": 3,
  "medidas_controle": ["Protetor auricular tipo plug", "Enclausuramento parcial"],
  "epi_types_ids": [12], "data_revisao_prevista": "2028-06-01"
}
```
**Correção aplicada na auditoria cruzada (`AuditorIntegrador`, 2026-08-06):**
o exemplo original enviava `"setor": "Injeção"` (texto livre), mas
`sst_riscos_ocupacionais.department_id` é uma FK `INTEGER NOT NULL` para
`departments.id` (`server/migrations/20260806-000139-create-sst-pgr-ges.cjs`)
— não é apenas diferença de nome de campo (caso do mapper DTO, §0 do
modelo de dados), é diferença de **tipo**: texto livre vs. FK obrigatória.
Resolver por *lookup* de nome de setor a cada request seria frágil (exige
correspondência exata, sem tratamento de duplicidade/renomeação); o
contrato correto é o cliente enviar `department_id` diretamente (o mesmo
seletor de departamento já usado em outras telas do sistema, ex.:
Manutenção/Patrimônio), nunca uma string livre.

**Caso "ausência de risco identificado" (RF-SST-036/BR-SST-026):**
`POST /api/sst/risks` com `{ "department_id": 7, "ausencia_risco_identificado": true }`
(sem `categoria_agente`/`agente`/demais campos de avaliação) registra a
declaração explícita de que o setor não tem risco identificado —
`categoria_agente` e `agente` passaram a `NULL`-áveis especificamente para
esse caso, com `CHECK ck_sst_riscos_ocupacionais_ausencia_coerente`
impedindo o meio-termo (ver correção de schema na auditoria cruzada,
`BLOCO_1_SST_MODELO_DADOS.md` §7). Este payload não estava documentado na
primeira versão desta seção, mesmo sendo um requisito P0 (RF-SST-036).

**POST /api/sst/ges/:id/members — Request:**
```json
{ "employee_id": 501 }
```
Resposta (`201`) inclui o `EventoESocialSST` criado (`tipo: "S-2240"`,
`status: "pendente"`).

---

## 7. Treinamentos de Segurança (NRs) — RF-SST-044 a 047

Base: `/api/sst/training-matrix`, `/api/sst/trainings`.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/training-matrix` | operate | Lista matriz (função × norma × periodicidade) |
| `POST` | `/api/sst/training-matrix` | operate | Cria item da matriz |
| `PUT` | `/api/sst/training-matrix/:id` | operate | Atualiza periodicidade |
| `GET` | `/api/sst/trainings` | operate | Lista TreinamentoSST (filtros: `employee_id`, `norma`, `vencido`) |
| `POST` | `/api/sst/trainings` | operate | Registra treinamento realizado |
| `GET` | `/api/sst/trainings/blocklist` | operate | Lista de bloqueio operacional (RF-SST-046) — consumida pelo módulo de Apontamento de Produção (RNF-SST-06) |

**POST /api/sst/trainings — Request:**
```json
{
  "employee_id": 501, "norma": "NR-11", "data": "2026-08-06", "carga_horaria": 8,
  "instrutor_entidade": "SENAI", "certificado_url": "https://.../cert-501-nr11.pdf",
  "identificacao_operador": "OP-EMP-014"
}
```
`identificacao_operador` (opcional, exigido na prática apenas quando
`norma = "NR-11"`, RF-SST-047): crachá/identificação do operador de
empilhadeira — mapeia direto para `sst_treinamentos.identificacao_operador`.
Campo adicionado ao exemplo na auditoria cruzada (existia no dicionário de
dados do `AdmDBA` mas não aparecia em nenhum payload de request deste
contrato).
`norma` (enum): `NR-6` / `NR-10` / `NR-11` / `NR-12` / `NR-17` / `NR-20` /
`NR-23_brigada` / `primeiros_socorros` / `CIPA` / `DDS_tema` / `outro`
(corrigido na auditoria cruzada — o texto original usava `brigada`/`cipa`,
que não correspondem aos valores reais do ENUM
`sst_treinamentos.norma`, `server/migrations/20260806-000140-create-sst-treinamento.cjs`:
`NR-23_brigada`/`CIPA` — `DDS_tema` também existe nesse ENUM mas não em
`sst_matriz_treinamento.norma`, que não tem `DDS_tema`). `validade` calculada no
backend a partir de tabela de periodicidade parametrizável por norma
(NR-10 = 24 meses hard-coded como default confirmado; demais
`[VERIFICAR COM TÉCNICO SST DA EMPRESA]`, configuráveis, nunca hard-code —
RF-SST-045/RNF geral de parametrização).

**GET /api/sst/trainings/blocklist — Response (200):**
```json
{
  "success": true,
  "data": [
    { "employee_id": 501, "position": "Operador de Empilhadeira", "norma": "NR-11", "validade_vencida_em": "2026-07-15" }
  ]
}
```
Consumo esperado: módulo de Apontamento de Produção chama esta rota (ou
recebe via serviço compartilhado) antes de iniciar uma etapa — sem exigir
tempo real, mas sem defasagem maior que a última leitura de tela
(RNF-SST-06). **Pendência declarada para o próximo bloco:** o fluxo de
exceção do lado de Produção (o que a tela de Apontamento faz ao encontrar o
funcionário na blocklist) não está especificado aqui — ver §7 do documento
de requisitos, recomenda-se UC dedicado antes da implementação dessa
integração específica.

---

## 8. Rotina Preventiva — Inspeções, PT, Brigada, DDS — RF-SST-048 a 053

Base: `/api/sst/inspections`, `/api/sst/work-permits`, `/api/sst/brigade`,
`/api/sst/dds`. CRUD simples com regra de vencimento/NC→ação, mesmo padrão
já resolvido em Manutenção/Patrimônio.

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/inspections` | operate | Lista InspecaoSeguranca (filtros: `department_id`, `data`, `tem_nc`) |
| `POST` | `/api/sst/inspections` | operate | Registra inspeção com checklist; item não-conforme **exige** `AcaoCorretiva` (RF-SST-048) — ver §9 |
| `GET` | `/api/sst/work-permits` | operate | Lista PermissaoTrabalho |
| `POST` | `/api/sst/work-permits` | operate | Emite PT com janela de validade |
| `POST` | `/api/sst/work-permits/:id/close` | operate | Encerra manualmente (a expiração automática pelo `fim_validade` é um job, não uma rota) |
| `GET` | `/api/sst/brigade` | operate | Lista Brigadista (com `efetivo_ativo` calculado vs. mínimo configurado) |
| `POST` | `/api/sst/brigade` | operate | Cadastra brigadista |
| `PUT` | `/api/sst/brigade/:id` | operate | Atualiza validade de reciclagem / `active` |
| `GET` | `/api/sst/dds` | operate | Lista RegistroDDS |
| `POST` | `/api/sst/dds` | operate | Registra DDS (tema, condutor, lista de presença) |

**POST /api/sst/inspections — Request:**
```json
{
  "department_id": 18, "checklist_modelo": "armazenagem_nr11", "inspetor_id": 20,
  "itens": [
    { "item": "Empilhamento máx. respeitado", "conforme": true },
    { "item": "Sinalização de corredor visível", "conforme": false, "risco_grave_iminente": false }
  ]
}
```
`department_id` (corrigido na auditoria cruzada — mesma razão de
`/api/sst/risks` acima: `sst_inspecoes_seguranca.department_id` é FK
`INTEGER NOT NULL`, não texto livre de setor).

Se algum item `conforme: false`, a API cria automaticamente uma
`AcaoCorretiva` com `origem: "inspecao_seguranca"` vinculada (resposta
inclui o(s) `id`(s) criado(s)); `risco_grave_iminente: true` marca a NC como
tratativa imediata (RF-SST-049), aparecendo destacada no dashboard.

---

## 9. Ações Corretivas (recurso reutilizável, multi-origem)

Base: `/api/sst/corrective-actions`. `authorizeModule('sst', ...)`: leituras
e criação `operate`, atualização de status/evidência `operate` (adicionado
na auditoria cruzada — a versão original desta seção não declarava o nível
de RBAC explicitamente, diferente de todas as outras 8 seções deste
documento; comportamento assumido é o mesmo do resto do módulo `sst`, sem
exceção de leitura enxuta aqui). Reutiliza o mesmo padrão de conceito de
"não-conformidade → ação" já existente no módulo Qualidade
(`server/src/modules/nonConformities/`), com dados **separados** (decisão
do brief, integração (d) — Qualidade): não há tabela compartilhada com
`nonConformities`, apenas o mesmo desenho conceitual (`origem` polimórfica).

| Método | Rota | Nível | Descrição |
|---|---|---|---|
| `GET` | `/api/sst/corrective-actions` | operate | Lista (filtros: `origem` `investigacao_acidente`/`inspecao_seguranca`/`reuniao_cipa`/`pgr`, `status`, `responsavel_id`, `atrasada`) |
| `POST` | `/api/sst/corrective-actions` | operate | Cria (usado quando a origem não gera automaticamente, ex.: deliberação de `ReuniaoCIPA`) |
| `PUT` | `/api/sst/corrective-actions/:id` | operate | Atualiza status/evidência de conclusão |

**POST — Request:**
```json
{ "origem": "reuniao_cipa", "origem_id": 12, "descricao": "Revisar sinalização do corredor B", "responsavel_id": 20, "prazo": "2026-09-01" }
```
`status` (enum, default `aberta`): `aberta` / `em_andamento` / `concluida` /
`atrasada` (`atrasada` é derivado — recalculado por leitura comparando
`prazo` com a data corrente, nunca setado manualmente).

---

## Rastreabilidade RF → Endpoint

| RF-SST | Endpoint(s) |
|---|---|
| 001, 003 | `POST/PUT /api/sst/epi-types` |
| 002 | `POST /api/sst/epi-matrix` |
| 004, 006 | `POST /api/sst/epi-deliveries` |
| 005 | `PATCH /api/sst/epi-deliveries/:id/evidence`, `POST .../confirm` |
| 007 | `POST /api/sst/epi-deliveries/:id/confirm`, `GET /api/sst/epi-deliveries/ficha/:employeeId` |
| 008 | `GET /api/sst/epi-deliveries/pending-report` |
| 009 | Consumido via evento de desligamento do RH → checklist (endpoint interno de orquestração, fora do escopo REST público deste bloco — recomenda-se webhook interno `POST /api/sst/epi-deliveries/return-checklist` no próximo passo, **pendência aberta**, ver Resumo) |
| 010 | `POST /api/sst/epi-types` (`item_id`), integração com `/api/inventory/movements` via `POST .../confirm` |
| 011, 016 | `POST/PUT /api/sst/exam-plans` |
| 012 | `POST /api/sst/aso` |
| 013 | `POST /api/sst/aso/:id/complementary-exams` |
| 014, 015 | `GET /api/sst/aso/status/:employeeId` (consumo pelo RH) |
| 017 | Efeito colateral de `POST /api/sst/aso` (agendamento não é rota própria — job) |
| 018 | Efeito colateral de `POST /api/sst/aso` (`resultado: inapto`) |
| 019 | Parametrização — sem endpoint próprio (config de sistema, ver `[VERIFICAR...]`) |
| 020 | Fora de escopo deste bloco de endpoints (relatório consolidado — recomenda-se `GET /api/sst/reports/pcmso-annual` em bloco futuro) |
| 021 | `GET /api/sst/aso/status/:employeeId` |
| 022, 023 | `POST /api/sst/accidents`, `POST .../complements` |
| 024, 025 | `POST /api/sst/accidents/:id/cat` |
| 026 | `POST /api/sst/accidents/:id/investigation`, `POST /api/sst/accidents/:id/close` |
| 027 | `POST /api/sst/accidents/:id/complements` (leitura cruzada com RH é externa a este contrato) |
| 028 | `GET /api/sst/cipa/dimensioning` |
| 029 | `POST /api/sst/cipa/electoral-processes`, `.../candidates`, `.../close` |
| 030, 031 | `POST /api/sst/cipa/mandates`, `.../members` |
| 032 | `POST /api/sst/cipa/meetings` |
| 033 | `POST /api/sst/cipa/members/:id/take-office` |
| 034 | Efeito colateral de `POST /api/sst/cipa/meetings` (`acoes_corretivas` opcional) ou `POST /api/sst/corrective-actions` direto |
| 035, 036 | `GET/POST/PUT /api/sst/risks` |
| 037, 038 | `PUT /api/sst/risks/:id` (`data_revisao`), `POST /api/sst/corrective-actions` (`origem: pgr`) |
| 039, 040 | `POST /api/sst/ges`, `.../members` |
| 041 | Efeito colateral de `POST /api/sst/aso` |
| 042 | Efeito colateral de `POST /api/sst/accidents/:id/cat` |
| 043 | `GET /api/sst/esocial-events`, `POST .../resend` |
| 044, 045 | `POST /api/sst/training-matrix`, `POST /api/sst/trainings` |
| 046 | `GET /api/sst/trainings/blocklist` |
| 047 | Filtro `norma=NR-11` em `GET /api/sst/trainings/blocklist` |
| 048, 049 | `POST /api/sst/inspections` |
| 050 | Integração de leitura com Patrimônio/Manutenção — sem endpoint próprio neste bloco (consumo do status de `/api/maintenance`, a construir na integração) |
| 051 | `POST/PUT /api/sst/work-permits`, `.../close` |
| 052 | `GET/POST/PUT /api/sst/brigade` |
| 053 | `GET/POST /api/sst/dds` |
| 054, 055 | Transversal — `authorizeModule('sst')` em todas as rotas de dado sensível + log de leitura (RNF-SST-05); leitura Jurídico via mesmas rotas de detalhe, com `authorizeModule` estendido a um perfil `juridico` `[pendência — módulo `juridico` também não existe em `accessModules.ts`; fora do escopo deste bloco, sinalizar para próximo bloco de RBAC]` |

---

## Diagrama de Sequência — Acidente + CAT no Prazo Legal (fluxo mais crítico)

```mermaid
sequenceDiagram
    actor TecSST as Técnico SST
    participant Ctrl as AccidentController
    participant UCReg as RegisterAccidentUseCase
    participant RepoAcc as AccidentRepository
    participant UCCat as EmitCatUseCase
    participant Calc as LegalDeadlineService
    participant RepoCat as CatRepository
    participant RepoEve as EsocialEventRepository
    participant UCClose as CloseAccidentUseCase
    participant Job as DeadlineEscalationJob

    TecSST->>Ctrl: POST /api/sst/accidents {employee_id, gravidade: "com_afastamento", ...}
    Ctrl->>UCReg: execute(dto, registradoPor=req.user.id)
    UCReg->>RepoAcc: create(accident)
    RepoAcc-->>UCReg: Accident{id, status:"aberto"}
    UCReg-->>Ctrl: Accident
    Ctrl-->>TecSST: 201 {accident, prazo_limite_cat estimado}

    TecSST->>Ctrl: POST /api/sst/accidents/:id/cat {tipo:"inicial"}
    Ctrl->>UCCat: execute(accidentId, dto, emitidoPor=req.user.id)
    UCCat->>RepoAcc: findById(accidentId)
    RepoAcc-->>UCCat: Accident
    UCCat->>Calc: calcularPrazoLimite(accident.data_hora, accident.gravidade)
    Calc-->>UCCat: prazoLimite (1º dia útil seguinte; imediato se óbito)
    UCCat->>RepoCat: create(cat, prazoLimite)
    RepoCat-->>UCCat: Cat{id, status:"pendente_transmissao"}
    UCCat->>RepoEve: enqueue(tipo:"S-2210", origem:{Cat.id}, prazoLimite)
    RepoEve-->>UCCat: EsocialEvent{status:"pendente"}
    UCCat-->>Ctrl: {cat, esocialEvent}
    Ctrl-->>TecSST: 201 {cat, prazo_limite, esocial_event_id}

    loop A cada execução do job (fora do ciclo HTTP)
        Job->>RepoEve: listarPendentesProximosDoPrazo()
        RepoEve-->>Job: [EsocialEvent...]
        Job->>Job: escalona alerta (SST → gestor SST) conforme proximidade
    end

    alt Prazo ultrapassado sem envio (E1)
        Job->>RepoEve: marcar como "pendência crítica" (não remove, não oculta)
        Note over Job,RepoEve: BR-SST-030 — evento nunca é descartado silenciosamente
    end

    TecSST->>Ctrl: POST /api/sst/accidents/:id/close
    Ctrl->>UCClose: execute(accidentId)
    UCClose->>RepoAcc: findByIdWithInvestigation(accidentId)
    RepoAcc-->>UCClose: Accident{gravidade:"com_afastamento", investigacao: null}
    alt Sem InvestigacaoAcidente + AcaoCorretiva (E2)
        UCClose-->>Ctrl: throw BusinessRuleError("INVESTIGATION_REQUIRED")
        Ctrl-->>TecSST: 422 {code:"BUSINESS_RULE_VIOLATION", message:"Acidente com afastamento exige investigação e ao menos uma ação corretiva antes do encerramento"}
    else Investigação presente com ação corretiva
        UCClose->>RepoAcc: updateStatus(accidentId, "encerrado")
        RepoAcc-->>UCClose: ok
        UCClose-->>Ctrl: Accident{status:"encerrado"}
        Ctrl-->>TecSST: 200 {accident}
    end
```

---

## Resumo — Handoff

**Total de endpoints especificados neste contrato: 75** (recontado na
auditoria cruzada, `AuditorIntegrador`, 2026-08-06 — a contagem original de
"65" estava desatualizada/incorreta; 75 é a contagem real de linhas
`GET`/`POST`/`PUT`/`PATCH`/`DELETE` nas tabelas de rota acima), distribuídos em 9
grupos de recurso (EPI, ASO/PCMSO, Acidente/CAT, Fila eSocial, CIPA,
PGR/GES, Treinamentos, Rotina Preventiva, Ações Corretivas), cobrindo os 5
UCs P0 (UC-44 a UC-48) com fluxo completo de exceção e os RFs P1/P2
restantes com contrato CRUD enxuto, conforme escopo definido no requisito
de origem.

**Decisões de design da API:**
1. **Fila eSocial modelada como recurso passivo, não endpoint de escrita
   direta:** `EventoESocialSST` só nasce como efeito colateral transacional
   de `POST /api/sst/aso`, `POST /api/sst/accidents/:id/cat` e
   `POST /api/sst/ges/:id/members`. A única escrita direta na fila é
   `POST /:id/resend`, restrita a evento `rejeitado` e a nível `approve`,
   com idempotência pela chave de origem (CAT/ASO/vínculo GES) — nunca
   duplica envio.
2. **Imutabilidade modelada como transição de estado, nunca CRUD livre:**
   `EntregaEPI` (`rascunho → confirmada`, devolução como sub-recurso
   separado) e `Acidente`/`CAT` (criação já é o estado final para os campos
   originais; complementos/reaberturas são novos registros, nunca
   `PUT`/`DELETE`). Isso elimina a necessidade de "soft delete" nesses
   recursos e é auditável por natureza (nenhuma coluna sobrescrita).
3. **Duas rotas de leitura cross-módulo deliberadamente mais permissivas
   que o resto de `sst`** (`GET .../aso/status/:employeeId` e
   `GET .../cipa/stability/:employeeId`), autorizadas por `sst` **ou** `rh`
   — replicando o padrão de checagem redundante já documentado para
   Requisição de Compra em `docs/arquitetura/API.md` seção 15, em vez de
   inventar um novo mecanismo de RBAC "multi-módulo" que não existe hoje no
   projeto.
4. **EPI reaproveita `/api/inventory` sem duplicar saldo:** `POST
   /api/sst/epi-deliveries/:id/confirm` chama uma interface
   `InventoryMovementService` (não Sequelize direto) que delega ao use-case
   real de movimentação de estoque — mantém o módulo SST desacoplado do
   módulo `inventory` (Clean Architecture, sem import cruzado de
   infrastructure).
5. **`AcaoCorretiva` é recurso único e polimórfico** (`origem` +
   `origem_id`) reaproveitado por Investigação de Acidente, Inspeção de
   Segurança, Reunião CIPA e PGR — mesmo padrão conceitual da
   Não-Conformidade de Qualidade, mas com tabela própria do domínio SST
   (dados separados, conforme integração (d) do brief).

**Pendências/perguntas para o `AdmDBA` (schema em paralelo) — RESOLVIDAS na
auditoria cruzada (`AuditorIntegrador`, 2026-08-06):**
1. ~~Confirmar se `EntregaEPI` guarda devolução em coluna própria ou tabela
   dedicada~~ — **Resolvido:** o `AdmDBA` modelou como tabela própria
   (`sst_devolucoes_epi`, insert-only). `POST /:id/return` **cria um
   sub-registro** em `sst_devolucoes_epi`, não atualiza `sst_entregas_epi`
   (a redação da seção 1.3 acima foi corrigida para refletir isso — texto
   anterior estava desatualizado/contraditório com o schema real). `entrega`
   e `confirmada` continuam imutáveis por trigger; devolução nunca é um
   `UPDATE` na entrega.
2. ~~`AccidentComplement` precisa de tabela própria~~ — **Resolvido:** não
   existia na primeira versão da migration (só `UPDATE` direto de
   `dias_perdidos`/`houve_cat`, sem trilha de quem/quando). Adicionada
   `sst_acidente_complementos` (insert-only:
   `acidente_id`/`campo`/`valor_anterior`/`valor_novo`/`motivo`/`registrado_por`)
   na auditoria cruzada — `POST /:id/complements` grava nessa tabela E
   atualiza a coluna consolidada em `sst_acidentes` na mesma transação.
3. ~~`EventoESocialSST.entidade_origem` polimórfico vs. 3 FKs~~ —
   **Resolvido:** o `AdmDBA` modelou como par genérico `(origem_tipo,
   origem_id)`, sem FK de banco (mesmo padrão já usado no projeto em
   `inventory_movements.reference_type`/`reference_id`) — consistente com
   `sst_acoes_corretivas`. O contrato JSON de resposta
   (`entidade_origem: { tipo, id }`) não muda; a query de idempotência do
   reenvio usa `(origem_tipo, origem_id)` contra o índice único parcial
   `uq_sst_eventos_esocial_origem_ativo`.
4. ~~`MembroCIPA.fim_estabilidade` persistido vs. recalculado~~ —
   **Resolvido:** persistido na criação do membro (`mandato.data_fim + 1
   ano`), nunca uma view/trigger — confirmado em
   `BLOCO_1_SST_MODELO_DADOS.md` §6 e na migration `20260806-000138`. Sem
   impacto no contrato de leitura já publicado.
5. RF-SST-009 (checklist de devolução de EPI disparado por desligamento do
   RH) **não tem endpoint REST público detalhado neste bloco** — é um
   gatilho entre módulos (RH → SST). Recomenda-se que o próximo bloco do
   pipeline SST (ou uma revisão deste) especifique se isso é um endpoint
   interno (`POST /api/sst/epi-deliveries/return-checklist`, chamado pelo
   use-case de desligamento do RH) ou um evento assíncrono (fila interna),
   já que o projeto não tem hoje um barramento de eventos formal entre
   módulos — todos os gatilhos entre RH/SST hoje seriam chamada direta de
   use-case a use-case (acoplamento a definir com o `AuditorIntegrador`).
6. RF-SST-020 (relatório anual PCMSO) e RF-SST-050 (consumo de status de
   extintores/proteções do Patrimônio/Manutenção) ficaram fora do escopo de
   endpoint detalhado deste bloco — citados na tabela de rastreabilidade
   como pendência explícita para um próximo incremento, não omissão.

**Chave RBAC pendente de implementação:** `sst` deve ser adicionada a
`server/src/shared/domain/accessModules.ts` (união de tipo + array
`ACCESS_MODULES`) antes que qualquer rota deste contrato possa usar
`authorizeModule('sst', ...)` — tarefa do `programador`, não deste bloco.
