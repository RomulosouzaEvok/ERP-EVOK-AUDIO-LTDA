# BLOCO 7 — Assistente WhatsApp / Omnichannel (WPP) — Modelo de Dados

**Insumos:** `BLOCO_7_WPP_REQUISITOS.md` (RF/BR/UC-75..80), tabelas reais
`employees`, `users`, `departments` (conferidas contra `information_schema`
em 2026-08-10).
**Autor:** Modelagem de dados (sessão de 2026-08-10).
**Status:** 🟡 Pronto para revisão do dono; migration só após aval.
**Convenções do projeto respeitadas:** FKs obrigatórias com `ON DELETE
RESTRICT` salvo justificativa; sem soft-delete genérico (status enum);
timestamps `created_at`/`updated_at`; migration única por bloco aplicada nos
dois bancos (guarda `cross-database-drift-guard`); nomes de coluna conferidos
contra o banco antes de qualquer use-case (regra da classe de defeito
2026-08-10).

---

## 1. Visão geral (DER)

```mermaid
erDiagram
    employees ||--o{ whatsapp_contacts : "possui numero"
    departments ||--o{ whatsapp_contacts : "escopo"
    whatsapp_contacts ||--o{ whatsapp_messages : "conversa"
    users ||--o{ whatsapp_messages : "registrado por (robo)"
    departments ||--o{ whatsapp_action_policies : "politica"
    departments ||--|| whatsapp_handoff_configs : "handoff"
    whatsapp_handoff_configs ||--o{ whatsapp_handoff_shifts : "escala"
    users ||--o{ whatsapp_handoff_shifts : "plantonista"

    whatsapp_contacts {
        int id PK
        varchar phone_e164 UK "+5562..."
        int employee_id FK
        int department_id FK
        enum status "ATIVO|BLOQUEADO"
        text blocked_reason
        timestamptz created_at
        timestamptz updated_at
    }
    whatsapp_messages {
        bigint id PK
        int contact_id FK
        varchar wamid UK "dedupe Meta"
        enum direction "IN|OUT"
        enum kind "TEXT|AUDIO|IMAGE|DOCUMENT|SYSTEM"
        text content "conteudo/transcricao"
        varchar routed_department
        jsonb action "acao executada (N1/N2)"
        jsonb data_sources "endpoints consultados"
        enum handoff_status "NONE|REQUESTED|ASSUMED|CLOSED"
        int handoff_user_id FK "users, nullable"
        int recorded_by FK "users (robo)"
        timestamptz occurred_at
        timestamptz created_at
    }
    whatsapp_action_policies {
        int id PK
        int department_id FK
        varchar action_key "ex: abrir_requisicao"
        enum level "N0|N1|N2"
        int updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    whatsapp_handoff_configs {
        int id PK
        int department_id FK UK
        enum mode "FIXED|SCHEDULE"
        int fixed_user_id FK "nullable"
        int fallback_user_id FK "nullable"
        boolean active
        timestamptz created_at
        timestamptz updated_at
    }
    whatsapp_handoff_shifts {
        int id PK
        int config_id FK
        smallint weekday "0=dom..6=sab"
        time starts_at
        time ends_at
        int user_id FK
        timestamptz created_at
        timestamptz updated_at
    }
```

## 2. Decisões de modelagem (e por quê)

| # | Decisão | Racional |
|---|---------|----------|
| M-1 | Vínculo do contato é com **`employees`**, não `users` | Nem todo funcionário tem login no ERP; o RH é dono do cadastro de pessoas. `employees.user_id` já liga aos logins quando existir. `department_id` é **desnormalizado de propósito** no contato (o funcionário pode trocar de depto; o número herda o novo escopo só quando a gestão atualizar — mudança de escopo é ato consciente, não efeito colateral) |
| M-2 | `whatsapp_messages` é **append-only** (BR-WPP-003) | Sem UPDATE/DELETE; a exceção é o par de colunas de handoff (`handoff_status`, `handoff_user_id`), atualizado quando o humano assume — alternativa (tabela própria de handoff) rejeitada por ora: um handoff por mensagem-gatilho basta na fase 1 e evita JOIN no monitor |
| M-3 | `wamid` **UNIQUE parcial** (`WHERE wamid IS NOT NULL`) | É a idempotência do RF-WPP-006. Parcial porque mensagens `OUT`/`SYSTEM` geradas por nós podem não ter wamid no momento do registro |
| M-4 | `content` como TEXT, sem limite curto | Transcrições de áudio e análises de documento são longas. LGPD: fica atrás de RBAC, fora dos logs (RNF-WPP-04) |
| M-5 | `action` e `data_sources` como JSONB | Shape varia por ação; o que precisa de consulta estruturada (depto, período, contato) está em colunas. Auditoria fina da ação em si já vai para `audit_logs` com autoria (RF-WPP-012) |
| M-6 | Política por `action_key` string + catálogo em código | O catálogo de ações possíveis (com seus níveis máximos permitidos) vive em código (`server/src/shared/domain/whatsappActions.ts` — a criar na implementação); a tabela guarda só a escolha da gestão. **N3 não existe no enum do banco** — é assim que RF-WPP-010 vira imutável: não há como persistir liberação do que o código não oferece |
| M-7 | Escala de handoff simples (dia-da-semana × faixa) | Cobre "escala ou fixo, configurável" (D-6) sem inventar um motor de turnos; feriados/exceções ficam para quando a operação pedir |
| M-8 | IDs inteiros (`SERIAL`/`BIGSERIAL`), não UUID | Padrão das tabelas de movimento do projeto (`sales`, `purchases`); `BIGSERIAL` em messages pelo volume |

## 3. Dicionário de dados

### 3.1 `whatsapp_contacts`

| Coluna | Tipo | Null | Default | Descrição |
|---|---|---|---|---|
| id | SERIAL PK | não | | |
| phone_e164 | VARCHAR(20) UNIQUE | não | | Formato E.164 (`+5562...`); validação na aplicação |
| employee_id | INT FK→employees RESTRICT | não | | Dono do número |
| department_id | INT FK→departments RESTRICT | não | | Escopo de atendimento (ver M-1) |
| status | ENUM(`ATIVO`,`BLOQUEADO`) | não | `ATIVO` | |
| blocked_reason | TEXT | sim | | Preenchido no bloqueio |
| created_at / updated_at | TIMESTAMPTZ | não | now() | |

Índices: UNIQUE(phone_e164); (department_id); (employee_id).

### 3.2 `whatsapp_messages`

| Coluna | Tipo | Null | Default | Descrição |
|---|---|---|---|---|
| id | BIGSERIAL PK | não | | |
| contact_id | INT FK→whatsapp_contacts RESTRICT | não | | |
| wamid | VARCHAR(120) | sim | | ID Meta; UNIQUE parcial (M-3) |
| direction | ENUM(`IN`,`OUT`) | não | | |
| kind | ENUM(`TEXT`,`AUDIO`,`IMAGE`,`DOCUMENT`,`SYSTEM`) | não | | `SYSTEM` = eventos (handoff, bloqueio) |
| content | TEXT | não | | Conteúdo/transcrição/descrição (D-2) |
| routed_department | VARCHAR(80) | sim | | Departamento que o orquestrador roteou |
| action | JSONB | sim | | `{action_key, level, confirmed_at, result, erp_ref}` quando N1/N2 |
| data_sources | JSONB | sim | | Endpoints/entidades consultados para responder |
| handoff_status | ENUM(`NONE`,`REQUESTED`,`ASSUMED`,`CLOSED`) | não | `NONE` | |
| handoff_user_id | INT FK→users SET NULL | sim | | Quem assumiu |
| recorded_by | INT FK→users RESTRICT | não | | O usuário-robô que registrou |
| occurred_at | TIMESTAMPTZ | não | | Hora da mensagem no WhatsApp |
| created_at | TIMESTAMPTZ | não | now() | Hora do registro |

Índices: UNIQUE(wamid) WHERE wamid IS NOT NULL; (contact_id, occurred_at DESC);
(handoff_status) WHERE handoff_status <> 'NONE'; GIN(content gin_trgm_ops) —
**condicional**: só se a extensão `pg_trgm` já estiver no baseline; senão busca
ILIKE simples na fase 1 e índice fica anotado como melhoria.

### 3.3 `whatsapp_action_policies`

| Coluna | Tipo | Null | Default | Descrição |
|---|---|---|---|---|
| id | SERIAL PK | não | | |
| department_id | INT FK→departments RESTRICT | não | | |
| action_key | VARCHAR(60) | não | | Do catálogo em código (M-6) |
| level | ENUM(`N0`,`N1`,`N2`) | não | `N0` | N3 não existe aqui — de propósito |
| updated_by | INT FK→users RESTRICT | não | | Auditoria rápida; trilha completa em `audit_logs` |
| created_at / updated_at | TIMESTAMPTZ | não | now() | |

Índices: UNIQUE(department_id, action_key).

### 3.4 `whatsapp_handoff_configs`

| Coluna | Tipo | Null | Default | Descrição |
|---|---|---|---|---|
| id | SERIAL PK | não | | |
| department_id | INT FK→departments RESTRICT UNIQUE | não | | 1 config por depto |
| mode | ENUM(`FIXED`,`SCHEDULE`) | não | `FIXED` | |
| fixed_user_id | INT FK→users RESTRICT | sim | | Obrigatório se FIXED (validação de aplicação) |
| fallback_user_id | INT FK→users RESTRICT | sim | | Usado quando escala não cobre |
| active | BOOLEAN | não | true | |
| created_at / updated_at | TIMESTAMPTZ | não | now() | |

### 3.5 `whatsapp_handoff_shifts`

| Coluna | Tipo | Null | Default | Descrição |
|---|---|---|---|---|
| id | SERIAL PK | não | | |
| config_id | INT FK→whatsapp_handoff_configs CASCADE | não | | CASCADE: escala morre com a config |
| weekday | SMALLINT (0..6) | não | | CHECK (weekday BETWEEN 0 AND 6) |
| starts_at / ends_at | TIME | não | | CHECK (starts_at < ends_at); turno virando meia-noite = duas linhas |
| user_id | INT FK→users RESTRICT | não | | Plantonista |
| created_at / updated_at | TIMESTAMPTZ | não | now() | |

Índices: (config_id, weekday).

## 4. Migration

- **Uma migration**: `20260810-000042-create-whatsapp-omnichannel.cjs`
  (próximo número livre após `000041`), criando os 5 objetos + enums + índices,
  com `down` completo.
- Aplicar em `erp_evok_audio` **e** `erp_evok_audio_test` na mesma rodada;
  rodar `scripts/comparar-bancos.cjs` antes de declarar pronto (lição G18).
- Nenhuma alteração em tabela existente — bloco é aditivo puro.

## 5. O que este modelo NÃO cobre (deliberado)

- **Fila/estado de conversa em tempo real** — continua no n8n/MySQL Hostinger
  (memória de janela do agente). O ERP guarda o registro auditável, não o
  buffer de contexto do LLM.
- **Cliente externo** (fase 5): exigirá `whatsapp_external_contacts` próprio —
  não poluir o cadastro de funcionários.
- **Feriados/exceções de escala** (M-7).
- **Retenção/expurgo LGPD**: política de retenção do conteúdo é decisão do
  dono a registrar antes do rollout (aviso + prazo); o modelo suporta expurgo
  por `occurred_at` quando definido.
