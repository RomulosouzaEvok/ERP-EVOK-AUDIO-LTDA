# Contratos - Módulo Jurídico

**Status**: ✅ Implementado (2026-08-07) — backend completo em
`server/src/modules/legal/`, endpoints reais em `/api/legal/*`, tela web
`/legal` (aba Contratos). Ver `docs/governance/HANDOFF_CODEX.md` seção
"Módulo Jurídico" para o handoff completo da implementação.

## Tipos de Contratos na EVOK ÁUDIO

### Contratos Trabalhistas

| Tipo | Descrição | Prazo | Valor em `contract_type` |
|------|-----------|-------|---------------------------|
| CLT (Prazo Indeterminado) | Contrato padrão de trabalho | Indeterminado | `clt_indeterminado` |
| CLT (Prazo Determinado) | Contrato temporário/sazonal | Até 2 anos | `clt_determinado` |
| Contrato de Experiência | 45 ou 90 dias | Renovável 1x | `experiencia` |
| Estágio | Estudantes | Até 2 anos | `estagio` |
| Aprendiz (Jovem Aprendiz) | 14-24 anos | Até 2 anos | `aprendiz` |

### Contratos Comerciais

| Tipo | Descrição | Valor em `contract_type` |
|------|-----------|---------------------------|
| Contrato de Distribuição | Revendedores autorizados | `distribuicao` |
| Contrato de Representação Comercial | Representantes autônomos | `representacao_comercial` |
| Contrato de Fornecimento | Fornecedores de matéria-prima | `fornecimento` |
| Contrato de Prestação de Serviços | Manutenção, consultoria | `prestacao_servicos` |
| Contrato de Confidencialidade (NDA) | Segredo industrial | `confidencialidade` |
| Contrato de Licenciamento de Marca | Uso da marca EVOK | `licenciamento_marca` |
| Outro | Qualquer tipo não coberto acima | `outro` |

### Cláusulas de Propriedade Intelectual

Nos contratos trabalhistas e com fornecedores, devem conter:
- Cessão de direitos de propriedade intelectual
- Confidencialidade de processos e fórmulas
- Não concorrência (pós-contrato)
- Propriedade de desenhos técnicos e projetos

Estas cláusulas são hoje texto livre dentro do arquivo do instrumento
(`legal_contracts.file_path`) e do campo `subject` — não há checklist
estruturado de cláusulas no banco nesta rodada.

## Modelo de dados real (PostgreSQL)

Implementado em `server/migrations/20260807-000220-create-legal-module.cjs`
e nos models `server/src/models/{LegalContract,LegalContractAddendum,
LegalContractReminder}.ts`. **Este é o modelo que efetivamente roda em
produção — as tabelas abaixo NÃO são MySQL, são o schema real do PostgreSQL
do projeto.**

### `legal_contracts`

Cadastro central de contrato — NÃO existia como tabela antes de 2026-08-07
(o esboço original do spec só tinha aditivo/lembrete, ambos dependendo de
um `contract_id` sem cadastro próprio).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `contract_number` | `VARCHAR(50)` | único, obrigatório |
| `contract_type` | `ENUM` | ver tabela de tipos acima |
| `title` | `VARCHAR(200)` | obrigatório |
| `party_a` / `party_b` | `VARCHAR(200)` | texto livre, **não FK** — cobre trabalhista/terceiros sem cadastro formal (ver decisão de design no handoff) |
| `subject` | `TEXT` | objeto/assunto do contrato |
| `value` | `DECIMAL(15,2)` | nullable |
| `start_date` | `DATE` | obrigatório |
| `end_date` | `DATE` | nullable (contrato por prazo indeterminado) |
| `auto_renewal` | `BOOLEAN` | default `false` |
| `notice_period_days` | `INTEGER` | nullable |
| `file_path` | `VARCHAR(255)` | instrumento assinado/digitalizado, via upload |
| `status` | `ENUM` | `draft \| signed \| active \| expired \| terminated` |
| `created_at` / `updated_at` | `TIMESTAMP` | |

### `legal_contract_addendums`

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `contract_id` | `INTEGER FK → legal_contracts.id` | `ON DELETE CASCADE` |
| `addendum_number` | `INTEGER` | obrigatório |
| `description` | `TEXT` | |
| `change_type` | `ENUM` | `term \| value \| clause \| party \| other` |
| `new_end_date` | `DATE` | nullable |
| `new_value` | `DECIMAL(15,2)` | nullable |
| `file_path` | `VARCHAR(255)` | |
| `signed_date` | `DATE` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

### `legal_contract_reminders`

Caso de uso central deste documento — gestão de prazos contratuais.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | `SERIAL PK` | |
| `contract_id` | `INTEGER FK → legal_contracts.id` | `ON DELETE CASCADE` |
| `reminder_type` | `ENUM` | `renewal \| expiration \| notice \| payment` |
| `reminder_date` | `DATE` | obrigatório |
| `days_before` | `INTEGER` | default `30` |
| `notified` | `BOOLEAN` | default `false`, marcado manualmente pelo usuário |
| `created_at` / `updated_at` | `TIMESTAMP` | |

## Endpoints reais (`/api/legal/*`)

RBAC: `authorizeModule('juridico')` (leitura) / `authorizeModule('juridico', 'operate')` (escrita).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/legal/contracts` | Lista paginada, filtros `status`/`contract_type` |
| GET | `/api/legal/contracts/expiring?days=30` | Contratos vencendo em até `days` dias (ou já vencidos, ainda não `terminated`) |
| GET | `/api/legal/contracts/:id` | Busca por id |
| POST | `/api/legal/contracts` | Cria contrato (409 se `contract_number` duplicado) |
| PUT | `/api/legal/contracts/:id` | Atualiza contrato |
| POST | `/api/legal/contracts/:id/file` | Upload/substituição do instrumento (PDF/DOC/DOCX, até 20MB) |
| GET | `/api/legal/contract-addendums` | Lista paginada, filtro `contract_id` |
| GET | `/api/legal/contract-addendums/:id` | Busca por id |
| POST | `/api/legal/contract-addendums` | Cria aditivo (404 se `contract_id` inexistente) |
| PUT | `/api/legal/contract-addendums/:id` | Atualiza aditivo |
| POST | `/api/legal/contract-addendums/:id/file` | Upload/substituição do arquivo do aditivo |
| GET | `/api/legal/contract-reminders` | Lista paginada, filtro `contract_id` |
| GET | `/api/legal/contract-reminders/:id` | Busca por id |
| POST | `/api/legal/contract-reminders` | Cria lembrete (404 se `contract_id` inexistente) |
| PUT | `/api/legal/contract-reminders/:id` | Atualiza lembrete (tipicamente marcar `notified`) |

## Fora de escopo desta entrega

- Notificação automática (email/push/cron) quando um lembrete vence —
  `notified` é hoje marcado manualmente.
- Geração de contrato a partir de template/modelo.
- Checklist estruturado de cláusulas de PI (cessão, confidencialidade,
  não concorrência) — hoje é texto livre em `subject`/no arquivo do
  instrumento.
- Vínculo formal de `party_a`/`party_b` com `suppliers`/`clients`/
  `employees` (texto livre por decisão de design).
