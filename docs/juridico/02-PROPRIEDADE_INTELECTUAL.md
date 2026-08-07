# Propriedade Intelectual - Módulo Jurídico

**Status**: ✅ Implementado (2026-08-07) — backend completo em
`server/src/modules/legal/`, endpoints reais em `/api/legal/*`, tela web
`/legal` (aba Propriedade Intelectual). Ver
`docs/governance/HANDOFF_CODEX.md` seção "Módulo Jurídico" para o handoff
completo da implementação.

## Ativos de Propriedade Intelectual da EVOK ÁUDIO

As tabelas abaixo são **documentação de referência dos ativos reais da
empresa** (não são seed do banco — o banco nasce vazio e os registros são
cadastrados manualmente pela tela `/legal`).

### Marcas

| Marca | Classe | Situação | Órgão | Nº Registro | Validade |
|-------|--------|----------|-------|-------------|----------|
| EVOK ÁUDIO | 9 (som/imagem) | ✅ Registrada | INPI | 900.000.001 | 2033 |
| EVOK PRO | 9 | ✅ Registrada | INPI | 900.000.002 | 2033 |
| EVOK SOUND | 9 | ✅ Registrada | INPI | 900.000.003 | 2033 |
| Logotipo EVOK | 9 | ✅ Registrada | INPI | 900.000.004 | 2033 |

### Patentes

| Patente | Descrição | Situação | Prazo |
|---------|-----------|----------|-------|
| Sistema de Centralização Magnética (MU-9000000-1) | Sistema de alinhamento de gap | ✅ Concedida | 2032 |
| Método de Bobinagem Multicamadas (PI-9000000-2) | Processo de bobinagem | 🔧 Em análise | - |
| Dispositivo de Vedação Acústica (MU-9000000-3) | Anel de vedação | ✅ Concedida | 2032 |

### Desenhos Industriais

| Desenho | Produto | Situação | Prazo |
|---------|---------|----------|-------|
| Design Cone 12" EVOK | DI-900000-1 | ✅ Registrado | 2034 |
| Design Basket EVOK | DI-900000-2 | ✅ Registrado | 2034 |
| Design Grade Proteção | DI-900000-3 | 🔧 Em registro | - |

### Segredo Industrial

| Segredo | Descrição | Acesso Restrito |
|---------|-----------|----------------|
| Fórmula da Cola | Composição do adesivo proprietário | Engenharia + Diretoria |
| Tratamento Térmico | Processo de cura do cone | Produção (liderança) |
| Setup de Injeção | Parâmetros de processo | Supervisores |
| Composição de Fios | Liga especial para bobina | Engenharia |

## Modelo de dados real (PostgreSQL)

Implementado em `server/migrations/20260807-000220-create-legal-module.cjs`
e no model `server/src/models/LegalIntellectualProperty.ts`. **Este é o
modelo que efetivamente roda em produção — a tabela abaixo NÃO é MySQL, é o
schema real do PostgreSQL do projeto.**

### `legal_intellectual_property`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `ip_type` | `ENUM` | `trademark \| patent \| industrial_design \| copyright \| trade_secret` |
| `title` | `VARCHAR(200)` | obrigatório |
| `description` | `TEXT` | |
| `registration_number` | `VARCHAR(50)` | ex.: número INPI |
| `filing_date` | `DATE` | data de depósito |
| `grant_date` | `DATE` | data de concessão |
| `expiration_date` | `DATE` | data de expiração/validade |
| `owner` | `VARCHAR(200)` | default `'EVOK ÁUDIO LTDA'` |
| `status` | `ENUM` | `filed \| examined \| granted \| expired \| abandoned` |
| `jurisdiction` | `VARCHAR(50)` | default `'BR'` |
| `created_at` / `updated_at` | `TIMESTAMP` | |

Mapeamento de "Situação" (documentação narrativa acima) → `status` real:
`✅ Registrada`/`✅ Concedida`/`✅ Registrado` → `granted`; `🔧 Em
análise`/`🔧 Em registro` → `examined`/`filed`, respectivamente. Segredos
industriais (não registráveis em órgão público) não têm registro
correspondente em `legal_intellectual_property` nesta rodada — são geridos
apenas pela lista de acesso restrito documentada acima, sem cadastro no
banco.

## Endpoints reais (`/api/legal/*`)

RBAC: `authorizeModule('juridico')` (leitura) / `authorizeModule('juridico', 'operate')` (escrita).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/legal/intellectual-property` | Lista paginada, filtros `ip_type`/`status` |
| GET | `/api/legal/intellectual-property/expiring?days=30` | Ativos vencendo em até `days` dias (ou já vencidos, ainda não `expired`/`abandoned`) |
| GET | `/api/legal/intellectual-property/:id` | Busca por id |
| POST | `/api/legal/intellectual-property` | Cria ativo de PI |
| PUT | `/api/legal/intellectual-property/:id` | Atualiza ativo de PI |

## Fora de escopo desta entrega

- Integração com Siscomex/INPI para consulta automática de status.
- Alerta automático (email/push) de vencimento — a tela web exibe um
  banner visual ao carregar a aba, mas não há notificação assíncrona.
- Cadastro de segredo industrial como ativo de PI (hoje é só a lista
  narrativa acima, sem linha em `legal_intellectual_property` — segredos
  não são registráveis em órgão público, então o campo `registration_number`
  não se aplicaria de forma natural).
- Upload de arquivo (certificado/carta-patente) — diferente de Contratos,
  esta entidade não tem campo `file_path`/endpoint de upload nesta rodada.
